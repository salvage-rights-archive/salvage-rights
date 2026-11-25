import { describe, expect, it } from "vitest";
import { battleValue } from "./bv";
import { loadCatalog } from "./catalog";
import { runChecks } from "./checks";
import { unitCost } from "./cost";
import { bipedRecord, mordelBiped, mordelWith, mount } from "./fixtures";
import { heatSinkMixAllowed, heatSinkMixPossible } from "./levels";
import { fromMordel } from "./mordel";
import { weights, type MechRecord } from "./mech";
import { heatSinkCapacity } from "./walk";

const catalog = await loadCatalog();
const ROW: Record<string, string> = { single: "heat-sink-is", double: "double-heat-sink-is", "double-clan": "double-heat-sink-clan", compact: "compact-heat-sink-is", laser: "laser-heat-sink-clan" };
const PER_MOUNT: Record<string, number> = { compact: 2 };

/** A 50-ton biped (a 200 engine holds 8 sinks) with the heat sink groups given, every sink beyond the engine's placed as its own mount. */
function withSinks(main: [string, number], extra: [string, number][], patch: Partial<MechRecord> = {}): MechRecord {
  const base = bipedRecord();
  const mounts = base.mounts.filter((m) => m.equipmentId !== "heat-sink-is");
  const groups: [string, number, number][] = [[main[0], main[1], 8], ...extra.map(([type, count]): [string, number, number] => [type, count, 0])];
  for (const [type, count, held] of groups) {
    for (let n = 0; n < (count - held) / (PER_MOUNT[type] ?? 1); n += 1) mounts.push({ ...mount(`${type}-${n}`, ROW[type] ?? type, null, null), techBase: type === "double-clan" || type === "laser" ? "clan" : "inner-sphere" });
  }
  const chassis = { ...base.chassis, heatSinks: { type: main[0], count: main[1], ...(extra.length > 0 ? { extra: extra.map(([type, count]) => ({ type, count })) } : {}) } };
  return { ...base, techBase: "mixed", year: 3085, rulesLevel: "advanced", chassis, mounts, ...patch };
}

describe("an Inner Sphere and a Clan double heat sink together", () => {
  it("weighs every extra sink, takes each kind's own slots and dissipates 2 a sink", () => {
    const record = withSinks(["double", 10], [["double-clan", 4]]);
    const slots = record.mounts.filter((m) => m.id.startsWith("double")).reduce((n, m) => n + (catalog.factsOf(m, record)?.slots ?? 0), 0);
    expect(slots).toBe(2 * 3 + 4 * 2); // two Inner Sphere doubles of 3 slots, four Clan doubles of 2
    expect(weights(record, catalog.factsOf).lines.find((l) => l.label === "Heat sinks")?.tons).toBe(4); // the engine's ten are free; the four extra weigh 1 each
    expect(heatSinkCapacity(record)).toBe(28);
  });

  // The rule in one place (heatSinkMixAllowed), and what the rules check says of it.
  it.each<[string, [string, number], [string, number][], Partial<MechRecord>, RegExp | null, number?]>([
    ["a mixed record at Advanced", ["double", 10], [["double-clan", 4]], {}, null],
    ["an Inner Sphere record", ["double", 10], [["double-clan", 4]], { techBase: "inner-sphere" }, /mixed only on a mixed technology/, 53],
    ["single with double at Advanced", ["single", 10], [["double-clan", 4]], {}, /FrankenMech or at Fan-made/, 53],
    ["single with double at Fan-made", ["single", 10], [["double-clan", 4]], { rulesLevel: "fan-made" }, null],
    ["compact with laser at Advanced", ["compact", 10], [["laser", 4]], {}, /FrankenMech or at Fan-made/, 217],
    ["three types at Fan-made", ["double", 10], [["double-clan", 2], ["single", 2]], { rulesLevel: "fan-made" }, null],
  ])("%s", (_name, main, extra, patch, message, page) => {
    const record = withSinks(main, extra, patch);
    const found = runChecks(record, catalog).filter((f) => f.check === "heat-sinks" && f.level === "error");
    if (message === null) expect(found).toEqual([]);
    else expect(found).toEqual([expect.objectContaining({ message: expect.stringMatching(message) as string, cite: expect.objectContaining({ page }) as object })]);
    expect(heatSinkMixAllowed(record, main[0], extra[0]?.[0] ?? "")).toBe(message === null || /^three/.test(_name));
    expect(heatSinkMixPossible(record)).toBe(record.techBase === "mixed" || record.rulesLevel === "fan-made");
  });

  it("counts both kinds in Battle Value and prices each at its own figure", () => {
    const hot = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => mount(`ppc-${n}`, "ppc-is", null, null));
    const both = withSinks(["double", 10], [["double-clan", 4]]);
    const merged = withSinks(["double", 14], []);
    const bv = (r: MechRecord) => battleValue({ ...r, mounts: [...r.mounts, ...hot] }, catalog).total;
    expect(bv(both)).toBe(bv(merged));
    expect(bv(both)).toBeGreaterThan(bv(withSinks(["double", 10], [])));
    const lines = unitCost(both, catalog).lines.filter((l) => l.label.startsWith("Heat sinks")).map((l) => l.label);
    expect(lines).toEqual(["Heat sinks (double, 10 paid for)", "Heat sinks (double-clan, 4 paid for)"]);
  });
});

describe("importing a mixed Mordel unit that lists both kinds of double heat sink", () => {
  const sink = (id: number, tech: string) => ({ id, name: "Double Heat Sink", location: "LL", technology: tech, slots: tech === "Clan" ? 2 : 3, associated_id: null });
  const equipment = [sink(1, "Inner Sphere"), sink(2, "Inner Sphere"), sink(3, "Clan"), sink(4, "Clan"), sink(5, "Clan"), sink(6, "Clan")];
  it.each<[string, number]>([
    ["the count is the total of both", 14],
    ["the count is the main kind alone", 10],
  ])("reads %s into two groups", (_name, count) => {
    const unit = mordelWith(mordelBiped(), { mixed_tech: true, heat_sinks: { count, type: "Double", technology: "Inner Sphere" }, equipment });
    const result = fromMordel(unit, catalog, "total-warfare", "2026-11-25T00:00:00.000Z", () => "id");
    if (!result.ok) throw new Error(result.message);
    expect(result.record.chassis.heatSinks).toEqual({ type: "double", count: 10, extra: [{ type: "double-clan", count: 4 }] });
  });
});
