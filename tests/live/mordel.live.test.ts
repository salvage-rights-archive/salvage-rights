// Fetches six real units, and one IndustrialMech, from mordel.net and imports each with the real catalog. Run by hand: `npm run mordel:smoke`.
// Not part of `npm test`. The key comes from the git-ignored .env.mordel and goes only in the X-API-Key header; this file
// never prints it, the request headers or a response body, and never writes a response to disk.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "@salvage-rights/family-battletech/src/rules/catalog";
import { battleValue } from "@salvage-rights/family-battletech/src/rules/bv";
import { runChecks } from "@salvage-rights/family-battletech/src/rules/checks";
import { layout } from "@salvage-rights/family-battletech/src/rules/mech";
import { fromMordelAs } from "@salvage-rights/family-battletech/src/rules/as-mordel";
import { unitFindings } from "@salvage-rights/family-battletech/src/rules/as-unit";
import { fromMordel } from "@salvage-rights/family-battletech/src/rules/mordel";

const ALLOWED = [474, 123, 2303, 5280, 75003, 98087];
// MORDEL_IDS=474,123 narrows a run to some of the six; no other unit is ever fetched.
const asked = (process.env["MORDEL_IDS"] ?? "").split(",").map(Number);
const IDS = asked.some((n) => ALLOWED.includes(n)) ? ALLOWED.filter((n) => asked.includes(n)) : ALLOWED;
const GAP_MS = 700;
const keyFile = resolve(process.cwd(), ".env.mordel");

function readKey(): string | undefined {
  if (!existsSync(keyFile)) return undefined;
  const line = readFileSync(keyFile, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("MORDEL_API_KEY="));
  return line?.slice("MORDEL_API_KEY=".length).trim() || undefined;
}

const key = readKey();
if (!key) console.log("mordel:smoke skipped: no MORDEL_API_KEY found in .env.mordel at the repository root.");

describe.skipIf(!key)("mordel.net live import", () => {
  it("imports six real units without throwing", async () => {
    const catalog = await loadCatalog();
    let refused: number | undefined;
    for (const [i, id] of IDS.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS));
      // Any failure is rethrown as a fixed message, so nothing from the request (header, key, body) can reach the output.
      const reply = await fetch(`https://mordel.net/api/v1/units/bm/${id}`, { headers: { "X-API-Key": key ?? "" }, redirect: "error" }).catch(() => {
        throw new Error("The request to mordel.net failed.");
      });
      if (!reply.ok) {
        console.log(`bm ${id}: mordel.net answered ${reply.status}; stopping.`);
        refused = reply.status;
        break;
      }
      const body: unknown = await reply.json().catch(() => {
        throw new Error("The reply from mordel.net could not be read as JSON.");
      });
      const result = fromMordel(body, catalog, "core-2026", new Date().toISOString(), () => `live-${id}`);
      if (!result.ok) {
        console.log(`bm ${id}: not imported: ${result.message}`);
        expect(result.ok).toBe(true);
        continue;
      }
      const { record, notes } = result;
      const unmatched = record.mounts.filter((m) => !m.part && m.equipmentId === null).map((m) => m.name);
      const unplaced = layout(record, catalog.factsOf).unplaced.length;
      const errors = new Map<string, number>();
      for (const f of runChecks(record, catalog)) if (f.level === "error") errors.set(f.check, (errors.get(f.check) ?? 0) + 1);
      const errorText = errors.size ? [...errors].map(([check, n]) => `${check} ${n}`).join(", ") : "none";
      console.log(
        `bm ${id} ${record.name.chassis} ${record.name.model}: ${record.mounts.length} mounts; ` +
          `${unmatched.length} unmatched${unmatched.length ? ` (${[...new Set(unmatched)].join("; ")})` : ""}; ` +
          `${unplaced} unplaced; errors: ${errorText}; ${notes.length} import notes`,
      );
      const partCount = record.mounts.filter((m) => m.part).length;
      console.log(`    ${partCount} structure/armor slot mounts; structure ${record.chassis.structure}, armor ${record.chassis.armorType}`);
      const partIds = new Set(record.mounts.filter((m) => m.part).map((m) => m.id));
      const other = runChecks(record, catalog).filter((f) => f.level === "error" && !(f.where?.mountId && partIds.has(f.where.mountId)));
      for (const f of other.slice(0, 6)) console.log(`    error (${f.check}): ${f.message}`);
      for (const n of notes.slice(0, 8)) console.log(`    note: ${n}`);
    }
    expect(refused).toBeUndefined();
  });

  it("imports one IndustrialMech (the TechManual WI-DM DemolitionMech, im 136) and finds its battle value", async () => {
    const reply = await fetch("https://mordel.net/api/v1/units/im/136", { headers: { "X-API-Key": key ?? "" }, redirect: "error" }).catch(() => {
      throw new Error("The request to mordel.net failed.");
    });
    if (!reply.ok) {
      console.log(`im 136: mordel.net answered ${reply.status}; stopping.`);
      expect(reply.ok).toBe(true);
      return;
    }
    const body: unknown = await reply.json().catch(() => {
      throw new Error("The reply from mordel.net could not be read as JSON.");
    });
    const catalog = await loadCatalog();
    const result = fromMordel(body, catalog, "core-2026", new Date().toISOString(), () => "live-im-136", "im");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { record } = result;
    const unmatched = record.mounts.filter((m) => !m.part && m.equipmentId === null).map((m) => m.name);
    const errors = runChecks(record, catalog).filter((f) => f.level === "error");
    const bv = battleValue(record, catalog).total;
    console.log(`im 136 ${record.name.chassis} ${record.name.model}: ${record.unitType}; ${unmatched.length} unmatched; ${errors.length} rule errors; battle value ${bv} (mordel.net says ${String(record.source?.values.battleValue)})`);
    expect(record.unitType).toBe("industrialmech");
    expect(unmatched).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("reads the Alpha Strike block of one BattleMech (bm 2303) into an Alpha Strike unit", async () => {
    const reply = await fetch("https://mordel.net/api/v1/units/bm/2303", { headers: { "X-API-Key": key ?? "" }, redirect: "error" }).catch(() => {
      throw new Error("The request to mordel.net failed.");
    });
    if (!reply.ok) {
      console.log(`bm 2303: mordel.net answered ${reply.status}; stopping.`);
      expect(reply.ok).toBe(true);
      return;
    }
    const body: unknown = await reply.json().catch(() => {
      throw new Error("The reply from mordel.net could not be read as JSON.");
    });
    const result = fromMordelAs(body, new Date().toISOString(), () => "live-as-2303", "bm");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { card } = result.unit;
    console.log(`bm 2303 as Alpha Strike: ${card.type} size ${card.size}, PV ${card.pv}, ${card.specials.length} specials, ${unitFindings(result.unit).length} findings`);
    expect(card.pv).toBeGreaterThan(0);
  });
});
