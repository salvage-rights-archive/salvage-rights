import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import { checkSv, markSvOfficial, svOfficialState } from "./checks";
import { svBv } from "./bv";
import { svCost } from "./cost";
import { barChoices, equipmentOffered, modChoices } from "./availability";
import {
  armorLocations, armorTons, baseSlots, crewTally, engineTons, flankMP, fuelPoints, fuelTonsForRange, itemFacts, maxArmorPoints, newSvRecord, rangeKm, sizeOf, slotTally, structuralIntegrity, structureTons, structurePoints, svTally, withDefaults,
} from "./sv";
import type { SupportVehicleRecord, SvMotiveId } from "./sv";

const catalog = await loadCatalog();
const build = (fields: Partial<SupportVehicleRecord> & { motive: SvMotiveId; tons: number }, mounts: [string, string, number?, number?][] = []): SupportVehicleRecord => {
  const record = { ...newSvRecord({ id: "v", year: 3060, motive: fields.motive, tons: fields.tons }), ...fields };
  return { ...record, mounts: mounts.map(([location, equipmentId, amount, qty], i) => ({ id: `m${i}`, equipmentId, name: equipmentId, location, ...(amount === undefined ? {} : { amount }), ...(qty === undefined ? {} : { qty }) })) };
};
const levels = (record: SupportVehicleRecord) => checkSv(record, catalog).filter((f) => f.level === "error").map((f) => f.check);

// The book's five worked designs (TechManual pp. 117-139).
const simca = () =>
  build(
    { motive: "wheeled", tons: 2.5, cruise: 7, engine: { type: "ice", rating: "D" }, structure: { rating: "D", mods: [] }, fuelTons: 0.042, extraCrew: 2 },
    [["body", "paramedic-equipment-is", undefined, 4], ["body", "seating-standard-is", undefined, 7], ["body", "cargo-standard-is", 0.136], ["body", "bay-door-is"]],
  );
const dixon = () =>
  build(
    { motive: "airship", tons: 300, cruise: 2, engine: { type: "fusion", rating: "D" }, structure: { rating: "D", mods: [] }, armor: { bar: 7, rating: "D", points: { f: 29, l: 25, r: 25, b: 25 } }, heatSinks: { count: 6 }, fireControl: "basic" },
    [
      ["f", "machine-gun-is", undefined, 3], ["b", "machine-gun-is"], ["body", "ammo-machine-gun-is", 5], ["l", "medium-laser-is"], ["r", "medium-laser-is"], ["f", "sprayer-vehicular-is", undefined, 2], ["b", "sprayer-vehicular-is", undefined, 2], ["body", "cargo-liquid-is", 10],
      ["body", "bay-vehicle-light-is", undefined, 3], ["f", "bay-door-is"], ["l", "bay-door-is"], ["r", "bay-door-is"], ["body", "lift-hoist-is"], ["body", "communications-equipment-is", 6], ["f", "searchlight-is"], ["b", "searchlight-is"],
      ["body", "compartment-infantry-is", 3, 2], ["body", "cargo-standard-is", 8.94],
    ],
  );

describe("construction by the book's worked examples", () => {
  it("chassis, engine, structure points and slots: the Simca, the Swiftran VTOL and the Hesiod", () => {
    const swiftran = build({ motive: "vtol", tons: 25, cruise: 11, structure: { rating: "E", mods: ["armored"] }, engine: { type: "ice", rating: "E" } });
    const hesiod = build({ motive: "wheeled", tons: 7, cruise: 4, structure: { rating: "E", mods: ["off-road", "omni"] }, engine: { type: "ice", rating: "E", alternateFuel: true }, fuelTons: 0.5 });
    const s = simca();
    expect([structureTons(s), engineTons(s), structurePoints(s), baseSlots(s), flankMP(s), sizeOf(s), rangeKm(s)]).toEqual([0.3, 0.497, 1, 5, 11, "small", 845]);
    expect([structureTons(swiftran), engineTons(swiftran), structurePoints(swiftran), baseSlots(swiftran), flankMP(swiftran)]).toEqual([8, 10.5, 3, 7, 17]);
    expect([structureTons(hesiod), engineTons(hesiod), rangeKm(hesiod)]).toEqual([1.5, 1.5, 2666]);
    expect(fuelTonsForRange(s, 850)).toBeCloseTo(0.043, 3); // 850 km wanted, the book rounds its own 42 kg down
  });
  it("air units: the Coruna's fuel points, the Dixon's structural integrity and engine", () => {
    const coruna = build({ motive: "fixed-wing", tons: 35, cruise: 4, structure: { rating: "D", mods: ["environmental-sealing"] }, engine: { type: "fusion", rating: "D" }, fuelTons: 8.5 });
    const d = dixon();
    expect([structureTons(coruna), engineTons(coruna), fuelPoints(coruna), structuralIntegrity(coruna), flankMP(coruna), baseSlots(coruna)]).toEqual([7, 7, 425, 4, 6, 8]);
    expect([structureTons(d), engineTons(d), structuralIntegrity(d), baseSlots(d), flankMP(d), armorLocations(d)]).toEqual([75, 19.5, 6, 35, 3, ["f", "l", "r", "b"]]);
  });
  it("armor: the most points by type, and the weight of BAR 7 and BAR 10 armor", () => {
    const d = dixon();
    expect([maxArmorPoints(d), armorTons(d)]).toEqual([104, 5]);
    const swiftran = build({ motive: "vtol", tons: 25, structure: { rating: "E", mods: ["armored"] }, armor: { bar: 10, rating: "D", points: { f: 8, l: 7, r: 7, b: 5, rot: 2 } } });
    expect([maxArmorPoints(swiftran), armorTons(swiftran)]).toEqual([29, 2]);
  });
  it("a hover engine weighs at least a fifth of the unit, a Tech C fusion engine at least 5 tons", () => {
    expect(engineTons(build({ motive: "hover", tons: 4.5, cruise: 3, engine: { type: "ice", rating: "F" } }))).toBe(0.9);
    expect(engineTons(build({ motive: "wheeled", tons: 10, cruise: 2, engine: { type: "fusion", rating: "C" } }))).toBe(5);
  });
});

describe("weight, crew and the rules check", () => {
  it("the Simca adds up to its 2.5 tons; the Dixon needs a crew of 14 by the table", () => {
    const s = simca();
    expect(svTally(s, catalog).total).toBe(2.5);
    expect(slotTally(s, catalog)).toMatchObject({ available: 5, used: 5 });
    expect(levels(s)).toEqual([]);
    const d = dixon();
    expect(crewTally(d, catalog)).toMatchObject({ base: 4, nonGunners: 6, gunners: 2, officers: 2, minimum: 14 });
    expect(svTally(d, catalog).total).toBeCloseTo(300, 2);
  });
  it.each([
    ["a BAR the Armored modification is needed for", build({ motive: "wheeled", tons: 20, armor: { bar: 8, rating: "D", points: { f: 1 } } }), "armor"],
    ["an electric engine on a fixed-wing unit without the propeller", build({ motive: "fixed-wing", tons: 10, engine: { type: "battery", rating: "D" } }), "engine"],
    ["a Heavy weapon on a Small unit", build({ motive: "wheeled", tons: 3 }, [["f", "medium-laser-is"]]), "equipment"],
    ["a weight over a motive type's greatest", build({ motive: "vtol", tons: 80 }), "type"],
    ["a structural rating below the weight's least", build({ motive: "hover", tons: 20, structure: { rating: "A", mods: [] } }), "chassis"],
  ])("reports %s", (_what, record, check) => {
    expect(levels(record)).toContain(check);
  });
  it("hides what the record does not reach: BAR 8 before 2435, chassis modifications that do not fit", () => {
    const early = build({ motive: "wheeled", tons: 20, year: 2400, rulesLevel: "standard" });
    expect(barChoices(early)).not.toContain(8);
    expect(barChoices({ ...early, year: 3050 })).toContain(8);
    const small = build({ motive: "wheeled", tons: 3 });
    expect(modChoices(small).map((m) => m.id)).toContain("bicycle");
    expect(modChoices({ ...small, tons: 30 }).map((m) => m.id)).not.toContain("bicycle");
    expect(equipmentOffered(catalog.byId("medium-laser-is")!, small, catalog)).toBe(false);
  });
});

describe("cost and Battle Value by the book's examples", () => {
  it("the Simca costs 36,190.55 (the book rounds up to 36,191) and the Dixon 809,708.75", () => {
    expect(svCost(simca(), catalog).total).toBe(36190.55);
    expect(svCost(dixon(), catalog)).toMatchObject({ total: 809708.75, unpriced: [] });
  });
  it("the CellCo Ranger APC: 38 points of BAR 7 armor, a turret, a machine gun and half a ton of ammunition, Battle Value 53", () => {
    const ranger = build({ motive: "wheeled", tons: 17, cruise: 3, turret: true, armor: { bar: 7, rating: "D", points: { f: 10, l: 8, r: 8, b: 7, t: 5 } }, fireControl: "none" }, [["t", "machine-gun-is"], ["body", "ammo-machine-gun-is", 0.5]]);
    const bv = svBv(ranger, catalog);
    expect(bv.defensive).toBeCloseTo(39.936, 3);
    expect(bv.total).toBe(53);
  });
  it("itemFacts reads the Support Vehicle slot column: an AC/20 takes 10, a Beagle probe 2", () => {
    const r = build({ motive: "tracked", tons: 50 }, [["f", "ac-20-is"], ["f", "beagle-active-probe-is"]]);
    expect(r.mounts.map((m) => itemFacts(m, r, catalog).slots)).toEqual([10, 2]);
  });
});

describe("storage", () => {
  it("keeps what it does not know and gives a bare record its defaults; the OFFICIAL mark follows the design", () => {
    const read = withDefaults({ schema: 1, motive: "zeppelin", future: 3, structure: { mods: ["warp"] } }, "x");
    expect(read).toMatchObject({ id: "x", motive: "zeppelin", future: 3, structure: { rating: "D", mods: ["warp"] } });
    expect(withDefaults({ schema: 2 })).toBeUndefined();
    const record = simca();
    markSvOfficial(record, "TechManual", 137);
    expect(svOfficialState(record).official).toBe(true);
    expect(svOfficialState({ ...record, cruise: 6 }).official).toBe(false);
  });
});
