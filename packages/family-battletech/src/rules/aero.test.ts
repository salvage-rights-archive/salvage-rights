import { describe, expect, it } from "vitest";
import { ENGINE_WEIGHTS } from "../data/chassis";
import { aeroLocationName, controlTons, engineRating, fighterArcs, fighterArmor, fighterArmorLimit, fighterEngineTons, fighterHeat, fighterPartsNotOffered, fighterSI, fighterTally, fuelPoints, hardpoints, locationsOf, maxThrust, newAeroRecord, withDefaults, wingsMatch } from "./aero";
import type { AeroRecord } from "./aero";
import { loadCatalog } from "./catalog";
import { engineTons } from "./mech";

const catalog = await loadCatalog();

const WINGS = ["NO", "LW", "RW", "AF"];
const QUARTERS = ["NO", "FL", "FR", "AL", "AR", "AF"];

describe("aerospace locations", () => {
  it.each([
    ["aerotech-1986", ["CP", "NO", "LW", "RW", "FU", "EN"], WINGS, false],
    ["battlespace", [], [], false],
    ["aerotech2", WINGS, WINGS, false],
    ["aerotech2-revised", WINGS, WINGS, false],
    ["tw-tm-so", WINGS, WINGS, true],
  ])("a new aerospace fighter under %s has that edition's armor locations and arcs", (editionId, armor, arcs, wingsFireAft) => {
    const record = newAeroRecord({ id: "f", unitType: "aerospace-fighter", tons: 50, safeThrust: 5 }, editionId);
    expect(record.armor.points).toEqual(Object.fromEntries(armor.map((loc) => [loc, 0])));
    expect(locationsOf(record)).toEqual({ armor, arcs, wingsFireAft });
  });

  it.each(["aerotech2", "aerotech2-revised", "tw-tm-so"])("a spheroid DropShip under %s has side facings and six quarter arcs", (editionId) => {
    const spheroid = newAeroRecord({ id: "d", unitType: "dropship", shape: "spheroid", tons: 3000 }, editionId);
    expect(locationsOf(spheroid)).toEqual({ armor: ["NO", "LS", "RS", "AF"], arcs: QUARTERS, wingsFireAft: false });
    // Without a shape a DropShip is aerodyne, with wing arcs that may fire aft.
    expect(locationsOf({ ...spheroid, shape: undefined })).toMatchObject({ arcs: WINGS, wingsFireAft: true });
  });

  it.each([
    ["aerotech2", "small-craft", "spheroid", ["NO", "LS", "RS", "AF"]],
    ["aerotech2-revised", "small-craft", "spheroid", WINGS],
    ["aerotech2", "dropship", "aerodyne", WINGS],
    ["aerotech2-revised", "dropship", "aerodyne", WINGS],
    ["battlespace", "dropship", "aerodyne", ["FO", "LS", "RS", "AF"]],
  ] as const)("under %s a %s of the %s shape is armored on the locations its own sheets name", (editionId, unitType, shape, armor) => {
    expect(locationsOf({ editionId, unitType, shape }).armor).toEqual(armor);
  });

  it("keeps a mount on an arc and armor on a location the edition lacks", () => {
    const at1 = newAeroRecord({ id: "v", unitType: "aerospace-fighter", tons: 80 }, "aerotech-1986");
    const stored = JSON.parse(JSON.stringify({ ...at1, armor: { ...at1.armor, points: { ...at1.armor.points, LBS: 12 } }, mounts: [{ id: "m1", equipmentId: "medium-laser", name: "Medium Laser", arc: "FL" }] })) as unknown;
    const read = withDefaults(stored);
    expect(read?.mounts).toEqual([{ id: "m1", equipmentId: "medium-laser", name: "Medium Laser", arc: "FL" }]);
    expect(read?.armor.points.LBS).toBe(12);
    expect(locationsOf(at1).arcs).not.toContain("FL");
    expect([aeroLocationName("FL"), aeroLocationName("ZZ")]).toEqual(["Fore-Left", '"ZZ"']);
  });
});

// ---- Fighter construction -------------------------------------------------------------------------------------------------------

type Mounts = [arc: string, id: string, amount?: number][];
const FIGHTER = "aerospace-fighter" as const;
function fighter(editionId: string, fields: { tons: number; safe: number; unitType?: "aerospace-fighter" | "conventional-fighter" }, build: Partial<Pick<AeroRecord, "engine" | "fuelTons" | "armor" | "heatSinks">>, mounts: Mounts = []): AeroRecord {
  const record = newAeroRecord({ id: "f", unitType: fields.unitType ?? FIGHTER, tons: fields.tons, safeThrust: fields.safe }, editionId);
  return { ...record, ...build, mounts: mounts.map(([arc, equipmentId, amount], i) => ({ id: `m${i}`, equipmentId, name: equipmentId, arc, ...(amount === undefined ? {} : { amount }) })) };
}

// AeroTech (1986) p. 33, Engine Table: the tonnage of each rating from 10 to 400 by 5.
const AT1_ENGINE_TABLE = [
  0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1.5, 1.5, 1.5, 2, 2, 2, 2.5, 2.5, 3, 3, 3, 3.5, 3.5, 4, 4, 4, 4.5, 4.5, 5, 5, 5.5, 5.5, 6, 6, 6, 7, 7, 7.5, 7.5, 8, 8.5, 8.5, 9, 9.5, 10, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15.5, 16,
  16.5, 17.5, 18, 19, 19.5, 20.5, 21.5, 22.5, 23.5, 24.5, 25.5, 27, 28.5, 29.5, 31.5, 33, 34.5, 36.5, 38.5, 41, 43.5, 46, 49, 52.5,
];

describe("fighter construction", () => {
  it("AeroTech (1986): the Vulcan of p. 33 by value, and its engine table is the shared fusion column", () => {
    const vulcan = fighter("aerotech-1986", { tons: 80, safe: 5 }, { fuelTons: 5, armor: { type: "standard", tons: 13.5, points: { CP: 15, EN: 23, LW: 36, RW: 36, NO: 55, FU: 63 } }, heatSinks: { type: "single", count: 10 } }, [
      ["NO", "medium-laser-is"], ["NO", "large-laser-is"], ["NO", "srm-6-is"], ["NO", "ammo-srm-6-is"], ["LW", "ac-10-is"], ["LW", "ammo-ac-10-is"], ["RW", "ac-10-is"], ["RW", "ammo-ac-10-is"], ["AF", "medium-laser-is"],
    ]);
    expect([engineRating(vulcan), fighterEngineTons(vulcan), maxThrust(vulcan), fighterSI(vulcan), fuelPoints(vulcan), controlTons(vulcan)]).toEqual([240, 11.5, 8, 8, 75, 3]);
    expect(fighterHeat(vulcan)).toEqual({ free: 10, added: 10, total: 20, capacity: 20 });
    const tally = fighterTally(vulcan, catalog);
    expect([tally.total, tally.remaining, tally.unknown]).toEqual([80, 0, []]);
    // 13.5 tons make 216 points and the cockpit gives 10 free; the book's own allocation adds up to 228, two over (logged in the archive's conflicts).
    expect(fighterArmor(vulcan)).toMatchObject({ bought: 216, free: 10, available: 226, allocated: 228, over: 2 });
    for (const [i, tons] of AT1_ENGINE_TABLE.entries()) expect(engineTons("standard", 10 + i * 5)).toBe(tons);
    expect(AT1_ENGINE_TABLE).toHaveLength(79);
    // AeroTech counts ammunition as an item, and its aft arc holds 2 tons of weapons at most; the later books keep ammunition in the fuselage.
    const aft = fighter("aerotech-1986", { tons: 50, safe: 5 }, {}, [["AF", "medium-laser-is"], ["AF", "large-laser-is"], ["AF", "ammo-ac-10-is"], ["NO", "ammo-ac-10-is"]]);
    expect(fighterArcs(aft, catalog).filter((a) => ["NO", "AF"].includes(a.arc))).toEqual([
      { arc: "NO", items: 1, limit: 6, weaponTons: 0 },
      { arc: "AF", items: 3, limit: 6, weaponTons: 6, tonsLimit: 2 },
    ]);
    expect(fighterArcs({ ...aft, editionId: "aerotech2" }, catalog).find((a) => a.arc === "AF")?.items).toBe(2);
    // AeroTech 2's turbine engine weighs twice the table, which is the internal combustion column (TechManual): one table serves both.
    for (const rating of Object.keys(ENGINE_WEIGHTS.rows).map(Number)) expect(engineTons("ice", rating)).toBe(2 * (engineTons("standard", rating) ?? NaN));
  });

  it("AeroTech 2: Doug's 95-ton fighter of pp. 42-47 by value (380 XL engine, ferro-aluminum, double sinks)", () => {
    const doug = fighter("aerotech2", { tons: 95, safe: 6 }, { engine: { type: "xl" }, fuelTons: 5, armor: { type: "ferro-aluminum", tons: 19.5, points: { NO: 110, LW: 85, RW: 85, AF: 69 } }, heatSinks: { type: "double", count: 1 } }, [
      ["LW", "large-laser-is"], ["RW", "large-laser-is"], ["NO", "medium-laser-is"], ["NO", "medium-laser-is"], ["NO", "gauss-rifle-is"], ["NO", "gauss-rifle-is"], ["NO", "ammo-gauss-rifle-is", 4],
    ]);
    expect([engineRating(doug), fighterEngineTons(doug), maxThrust(doug), fighterSI(doug), fuelPoints(doug), controlTons(doug)]).toEqual([380, 20.5, 9, 9, 400, 3]);
    expect(fighterArmor(doug)).toMatchObject({ bought: 349, available: 349, allocated: 349, over: 0 });
    expect(fighterHeat(doug)).toEqual({ free: 10, added: 1, total: 11, capacity: 22 });
    expect(fighterTally(doug, catalog)).toMatchObject({ total: 95, remaining: 0, unknown: [] });
    expect(fighterArcs(doug, catalog).map((a) => [a.arc, a.items, a.limit])).toEqual([["NO", 4, 5], ["LW", 1, 4], ["RW", 1, 4], ["AF", 0, 5]]);
  });

  it("TechManual: the Sabutai (Clan, ferro-aluminum) and the 'Mechbuster (turbine, power amplifiers) of pp. 185-196 by value", () => {
    const sabutai = fighter("tw-tm-so", { tons: 75, safe: 6 }, { engine: { type: "xl-clan" }, fuelTons: 3, armor: { type: "ferro-aluminum-clan", tons: 10, points: { NO: 62, LW: 45, RW: 45, AF: 40 } }, heatSinks: { type: "double", count: 11 } }, [
      ["NO", "gauss-rifle-clan"], ["NO", "er-small-laser-clan"], ["AF", "er-small-laser-clan"], ["AF", "er-small-laser-clan"], ["LW", "er-ppc-clan"], ["LW", "large-pulse-laser-clan"], ["RW", "er-ppc-clan"], ["RW", "large-pulse-laser-clan"], ["NO", "ammo-gauss-rifle-clan"],
    ]);
    expect([engineRating(sabutai), fighterEngineTons(sabutai), maxThrust(sabutai), fighterSI(sabutai), fuelPoints(sabutai), hardpoints(sabutai)]).toEqual([300, 9.5, 9, 7, 240, 15]);
    expect(fighterArmor(sabutai)).toMatchObject({ bought: 192, allocated: 192, over: 0 });
    expect(fighterArmorLimit(sabutai)).toEqual({ points: 600, tons: 31.5 });
    expect(fighterHeat(sabutai).total).toBe(21);
    expect(fighterTally(sabutai, catalog)).toMatchObject({ total: 75, remaining: 0 });
    expect(fighterArcs(sabutai, catalog).find((a) => a.arc === "LW")).toMatchObject({ items: 2, limit: 4 });

    const buster = fighter("tw-tm-so", { tons: 50, safe: 5, unitType: "conventional-fighter" }, { engine: { type: "ice" }, fuelTons: 4, armor: { type: "standard", tons: 3.5, points: { NO: 18, LW: 11, RW: 11, AF: 10 } }, heatSinks: { type: "single", count: 9 } }, [
      ["NO", "medium-laser-is"], ["NO", "medium-laser-is"], ["NO", "medium-laser-is"],
    ]);
    expect([engineRating(buster), fighterEngineTons(buster), maxThrust(buster), fighterSI(buster), fuelPoints(buster), controlTons(buster), hardpoints(buster)]).toEqual([250, 25, 8, 5, 640, 5, 10]);
    expect(fighterArmorLimit(buster)).toEqual({ points: 50, tons: 3.5 });
    expect(fighterHeat(buster).free).toBe(0);
    const tally = fighterTally(buster, catalog);
    expect([tally.lines.find((l) => l.label === "Power amplifiers")?.tons, tally.total, tally.remaining]).toEqual([0.5, 50, 0]);
  });

  it.each([
    ["aerotech-1986", "aerospace-fighter", 80, 5, 8],
    ["aerotech2", "aerospace-fighter", 95, 6, 9],
    ["aerotech2-revised", "conventional-fighter", 50, 7, 7],
    ["tw-tm-so", "aerospace-fighter", 75, 6, 7],
    ["tw-tm-so", "conventional-fighter", 50, 5, 5],
  ] as const)("%s: a %s of %s tons at Safe Thrust %s has Structural Integrity %s, the record's own si ignored", (editionId, unitType, tons, safe, si) => {
    expect(fighterSI({ ...fighter(editionId, { tons, safe, unitType }, {}), si: 99 })).toBe(si);
    expect(fighterSI(fighter("no-such-edition", { tons, safe, unitType }, {}))).toBeNull();
  });

  it.each([
    ["aerotech-1986", "aerospace-fighter", 80, "standard", undefined],
    ["aerotech2", "aerospace-fighter", 95, "ferro-aluminum", undefined],
    ["aerotech2", "conventional-fighter", 50, "standard", { points: 48, tons: 3 }],
    ["aerotech2-revised", "conventional-fighter", 50, "standard", { points: 48, tons: 3 }],
    ["tw-tm-so", "conventional-fighter", 50, "standard", { points: 50, tons: 3.5 }],
    ["tw-tm-so", "aerospace-fighter", 75, "standard", { points: 600, tons: 37.5 }],
    ["tw-tm-so", "aerospace-fighter", 75, "ferro-aluminum-clan", { points: 600, tons: 31.5 }],
  ] as const)("%s: the armor limit of a %s of %s tons in %s armor", (editionId, unitType, tons, type, limit) => {
    const record = fighter(editionId, { tons, safe: 5, unitType }, { armor: { type, tons: 1, points: {} } });
    expect(fighterArmorLimit(record)).toEqual(limit);
  });

  it.each([
    ["aerotech2", "ferro-aluminum", [["NO", 5], ["LW", 4], ["RW", 4], ["AF", 5]], false],
    ["aerotech2-revised", "standard", [["NO", 5], ["LW", 5], ["RW", 5], ["AF", 5]], false],
    ["tw-tm-so", "light-ferro-aluminum", [["NO", 5], ["LW", 5], ["RW", 5], ["AF", 4]], false],
    ["tw-tm-so", "heavy-ferro-aluminum", [["NO", 4], ["LW", 4], ["RW", 4], ["AF", 4]], false],
    ["aerotech-1986", "standard", [["NO", 6], ["LW", 6], ["RW", 6], ["AF", 6]], true],
  ] as const)("%s, %s armor: weapons an arc, and whether unlike wings are allowed", (editionId, type, limits, unlikeWingsAllowed) => {
    // A large laser on one wing and a medium laser on the other.
    const record = fighter(editionId, { tons: 50, safe: 5 }, { armor: { type, tons: 1, points: {} } }, [["LW", "large-laser-is"], ["RW", "medium-laser-is"]]);
    expect(fighterArcs(record, catalog).map((a) => [a.arc, a.limit])).toEqual(limits);
    expect(wingsMatch(record, catalog)).toBe(unlikeWingsAllowed);
    expect(wingsMatch({ ...record, mounts: record.mounts.map((m) => ({ ...m, equipmentId: "large-laser-is" })) }, catalog)).toBe(true);
  });

  it("an engine, armor or heat sink type the edition does not offer is reported, not removed or refused", () => {
    const record = fighter("aerotech-1986", { tons: 50, safe: 5 }, { engine: { type: "xl" }, armor: { type: "ferro-aluminum", tons: 5, points: {} }, heatSinks: { type: "double", count: 2 } });
    expect(fighterPartsNotOffered(record)).toEqual(["engine", "armor", "heat-sinks"]);
    expect(fighterEngineTons(record)).toBe(3); // the 150 rating's 5.5 tons, halved and rounded up to a half ton
    expect(fighterPartsNotOffered({ ...record, editionId: "tw-tm-so" })).toEqual([]);
    expect(fighterPartsNotOffered({ ...record, unitType: "dropship" })).toEqual([]);
  });
});
