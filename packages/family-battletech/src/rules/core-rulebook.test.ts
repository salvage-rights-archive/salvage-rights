import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { battleValue } from "./bv";
import { unitCost } from "./cost";
import { mordelBiped, mordelWith } from "./fixtures";
import { fromMordel } from "./mordel";

// Equipment the Core Rulebook (2026, first printing, printed pp. 188-254) brings that the other books do not carry.
const catalog = await loadCatalog();
const entry = (id: number, name: string, location: string, slots: number) => ({ id, name, location, technology: "Inner Sphere", slots, associated_id: null });
const bodyWith = (equipment: unknown[]) => mordelWith(mordelBiped(), { equipment });
function load(equipment: unknown[]) {
  const result = fromMordel(bodyWith(equipment), catalog, "bcr-tm", "2026-11-27T10:00:00.000Z", () => "crb-1");
  if (!result.ok) throw new Error(result.message);
  return result.record;
}

describe("heavy plasma rifle (Core Rulebook printed pp. 189, 248)", () => {
  it("holds the book's figures, and Mordel's names reach the weapon and its ammunition", () => {
    expect(catalog.byId("heavy-plasma-rifle-is")).toMatchObject({ tons: 9, slots: 3, heat: 12, damage: "12", range: [0, 4, 8, 12], type: "AI, DE, H", bvInferred: true });
    expect(catalog.match("Heavy Plasma Rifle", "inner-sphere")?.id).toBe("heavy-plasma-rifle-is");
    expect(catalog.byId("ammo-heavy-plasma-rifle-is")?.shotsPerTon).toBe(8);
  });

  it("adds its Battle Value and price to a unit that carries it, ammunition included", () => {
    const without = load([entry(1, "Medium Laser", "LA", 1)]);
    const withRifle = load([entry(1, "Medium Laser", "LA", 1), entry(2, "Heavy Plasma Rifle", "RA", 3), entry(3, "Heavy Plasma Rifle (Ammo 8)", "LT", 1)]);
    expect(withRifle.mounts.filter((m) => m.equipmentId?.includes("heavy-plasma-rifle")).map((m) => m.equipmentId)).toEqual(["heavy-plasma-rifle-is", "ammo-heavy-plasma-rifle-is"]);
    expect(battleValue(withRifle, catalog).total).toBeGreaterThan(battleValue(without, catalog).total);
    const priced = unitCost(withRifle, catalog);
    expect(priced.unpriced).toEqual([]);
    expect(priced.lines.some((l) => l.cost === 320_000)).toBe(true);
  });
});

describe("where the Core Rulebook differs from an older book", () => {
  it("prints the Beagle probe in one slot, where the TechManual has two", () => {
    expect(catalog.rowFor("beagle-active-probe-is", "bcr-tm")?.slots).toBe(1);
    expect(catalog.rowFor("beagle-active-probe-is", "total-warfare")?.slots).toBe(2);
  });

  it("gives the Inferno-IV munition to the Clans, which Tactical Operations: AUE keeps Inner Sphere", () => {
    expect(catalog.byId("ammo-inferno-iv-clan")).toMatchObject({ techBase: "clan", yearsInferred: true });
  });
});
