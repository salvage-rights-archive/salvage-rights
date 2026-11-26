import { describe, expect, it } from "vitest";
import { capitalMaxThrust, capitalSI, capitalSiRange, newAeroRecord } from "./aero";
import type { AeroRecord } from "./aero";
import { checkAero } from "./aero-checks";
import { loadCatalog } from "./catalog";

const catalog = await loadCatalog();

type Mounts = [arc: string, id: string, bay?: string, amount?: number][];
function unit(editionId: string, f: Partial<AeroRecord> & { unitType: string; tons: number }, mounts: Mounts = []): AeroRecord {
  const base = newAeroRecord({ id: "v", unitType: f.unitType as AeroRecord["unitType"] & string, tons: f.tons, safeThrust: f.thrust?.safe ?? 5, year: 3070, shape: f.shape ?? "aerodyne", use: f.use ?? "military" }, editionId);
  return {
    ...base,
    ...f,
    mounts: mounts.map(([arc, equipmentId, bay, amount], i) => ({ id: `m${i}`, equipmentId, name: equipmentId, arc, ...(bay === undefined ? {} : { bay }), ...(amount === undefined ? {} : { amount }) })),
  };
}
const kinds = (record: AeroRecord) => checkAero(record, catalog).map((f) => `${f.check}:${f.level}`);
const lasers: Mounts = [["NO", "medium-laser-is"], ["NO", "large-laser-is"]];

describe("small craft and DropShip rules check", () => {
  it.each([
    ["structural integrity under the range", "tw-tm-so", { unitType: "dropship", tons: 3000, si: 2 }, [], "si:error"],
    ["structural integrity over the range", "tw-tm-so", { unitType: "dropship", tons: 3000, si: 400 }, [], "si:error"],
    ["armor points over what the armor and free points give", "aerotech2", { unitType: "dropship", tons: 3000, armor: { type: "standard", tons: 1, points: { NO: 900 } } }, [], "vessel-armor:error"],
    ["armor tons over the limit", "tw-tm-so", { unitType: "dropship", tons: 3000, armor: { type: "standard", tons: 900, points: {} } }, [], "vessel-armor:error"],
    ["fore sides that differ", "tw-tm-so", { unitType: "dropship", shape: "spheroid", tons: 3000 }, [["FL", "large-laser-is"], ["FR", "medium-laser-is"]], "vessel-arcs:error"],
    ["more weapons in an arc than it holds", "tw-tm-so", { unitType: "dropship", tons: 3000 }, Array.from({ length: 13 }, () => ["NO", "medium-laser-is"]), "vessel-arcs:note"],
    ["a named bay over the attack limit", "tw-tm-so", { unitType: "dropship", tons: 3000 }, Array.from({ length: 8 }, () => ["NO", "nac-10-is", "b1"]), "bays:error"],
    ["a named bay mixing weapon classes", "tw-tm-so", { unitType: "dropship", tons: 3000 }, [["NO", "medium-laser-is", "b1"], ["NO", "ac-10-is", "b1"]], "bays:error"],
    ["a named bay mixing sizes where the edition asks one", "aerotech2", { unitType: "dropship", tons: 3000 }, [["NO", "medium-laser-is", "b1"], ["NO", "large-laser-is", "b1"]], "bays:error"],
    ["not enough ammunition", "tw-tm-so", { unitType: "dropship", tons: 3000 }, [["NO", "ac-10-is", "b1"], ["NO", "ac-10-is", "b1"], ["NO", "ammo-ac-10-is", "b1"]], "ammo:warning"],
    ["a crew under the least", "tw-tm-so", { unitType: "dropship", tons: 3000, crew: 1 }, [], "crew:error"],
    ["more doors than the edition allows", "aerotech2-revised", { unitType: "dropship", tons: 3000, bays: [{ kind: "fighter", capacity: 6, doors: 9 }] }, [], "doors:error"],
    ["a bay that makes more heat than the sinks take away", "tw-tm-so", { unitType: "dropship", tons: 3000 }, Array.from({ length: 12 }, () => ["NO", "large-laser-is", "b1"]), "zero-heat:error"],
    ["Clan armor on an Inner Sphere unit", "tw-tm-so", { unitType: "dropship", tons: 3000, armor: { type: "ferro-aluminum-clan", tons: 5, points: {} } }, [], "armor-tech:warning"],
    ["a part the edition does not offer", "aerotech2", { unitType: "small-craft", tons: 100, armor: { type: "light-ferro-aluminum", tons: 1, points: {} } }, [], "engine:warning"],
  ] as [string, string, Partial<AeroRecord> & { unitType: string; tons: number }, Mounts, string][])("%s", (_label, editionId, build, mounts, expected) => {
    expect(kinds(unit(editionId, build, mounts))).toContain(expected);
  });

  it("a sound DropShip raises no error or warning, and its leftover weight is cargo", () => {
    const ok = unit("tw-tm-so", { unitType: "dropship", tons: 3000, crew: 10 }, lasers);
    expect(kinds(ok).filter((k) => !k.endsWith(":note"))).toEqual([]);
  });

  it("each edition's check names its own page", () => {
    const record = (editionId: string) => unit(editionId, { unitType: "dropship", tons: 3000, si: 2 });
    const cite = (editionId: string) => checkAero(record(editionId), catalog).find((f) => f.check === "si")?.cite;
    expect([cite("aerotech2"), cite("aerotech2-revised"), cite("tw-tm-so")]).toEqual(["AeroTech 2, p. 44", "AeroTech 2: Revised Edition, p. 62", "TechManual, p. 187"]);
  });

  it("the Inner Sphere weapons of AeroTech 2 are not for a Clan unit, but its capital weapons serve both", () => {
    const clan = (mounts: Mounts) => unit("aerotech2", { unitType: "dropship", tons: 3000, techBase: "clan" }, mounts);
    expect(checkAero(clan([["NO", "medium-laser-is"]]), catalog).map((f) => f.check)).toContain("equipment");
    expect(checkAero(clan([["NO", "nac-10-is"]]), catalog).filter((f) => f.check === "equipment" && f.level === "warning")).toEqual([]);
  });
});

describe("WarShip drive", () => {
  const warship = (editionId: string, engine: string, safe: number) => unit(editionId, { unitType: "warship", tons: 500000, engine: { type: engine }, thrust: { safe } });

  it("under Strategic Operations a station-keeping WarShip has Max Thrust 1 and Structural Integrity 1 to 30, with a note that the book prints no range", () => {
    const ship = warship("tw-tm-so", "station-keeping", 0);
    expect([capitalMaxThrust(ship), capitalSiRange(ship), capitalSI(ship)]).toEqual([1, { min: 1, max: 30 }, 1]);
    expect(checkAero(ship, catalog).find((f) => f.check === "si")).toMatchObject({ level: "note", cite: "Strategic Operations: Advanced Aerospace Rules, p. 135" });
  });

  it.each([
    ["aerotech2", "AeroTech 2, p. 44"],
    ["aerotech2-revised", "AeroTech 2: Revised Edition, p. 61"],
  ])("%s refuses it with the page: choose a Safe Thrust of 1 or more", (editionId, cite) => {
    const found = checkAero(warship(editionId, "station-keeping", 0), catalog).find((f) => f.check === "si");
    expect(found).toMatchObject({ level: "error", cite });
    expect(found?.message).toContain("Safe Thrust of 1 or more");
  });
});
