import { describe, expect, it } from "vitest";
import { ENGINE_WEIGHTS } from "../data/chassis";
import { aeroLocationName, controlTons, engineRating, fighterArcs, fighterArmor, fighterArmorLimit, fighterEngineTons, fighterHeat, fighterPartsNotOffered, fighterSI, fighterTally, fuelPoints, hardpoints, locationsOf, maxThrust, newAeroRecord, withDefaults, wingsMatch } from "./aero";
import type { AeroRecord, AeroShape, AeroUse } from "./aero";
import { craftAmmoShortfalls, craftArcs, craftArcsUnmatched, craftArmor, craftBayTons, craftControlTons, craftCrew, craftDoors, craftEngineTons, craftFuelPoints, craftHeat, craftMaxThrust, craftPartsNotOffered, craftPumpTons, craftSI, craftSiRange, craftSiTons, craftTally, craftWeaponBays, expandedFireControlTons } from "./aero";
import { capitalArcs, capitalArcsUnmatched, capitalArmor, capitalControlTons, capitalCrew, capitalDoors, capitalEngineTons, capitalFuelPoints, capitalHeat, capitalMaxThrust, capitalPumpTons, capitalSI, capitalSiRange, capitalSiTons, capitalSystemLimit, capitalSystems, capitalTally, capitalWeaponBays, jumpSail, kfDrive } from "./aero";
import { capitalArmorPointsPerTon } from "../data/aero";
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

// ---- Small craft and DropShip construction ------------------------------------------------------------------------------------

type CraftMounts = [arc: string, id: string, bay?: string, amount?: number][];
interface CraftFields {
  unitType: "small-craft" | "dropship";
  shape: AeroShape;
  use: AeroUse;
  techBase?: "inner-sphere" | "clan";
  tons: number;
  safe: number;
  si?: number;
}
function craft(editionId: string, f: CraftFields, build: Partial<AeroRecord> = {}, mounts: CraftMounts = []): AeroRecord {
  const record = newAeroRecord({ id: "c", unitType: f.unitType, shape: f.shape, use: f.use, techBase: f.techBase ?? "inner-sphere", tons: f.tons, safeThrust: f.safe }, editionId);
  const mount = ([arc, equipmentId, bay, amount]: CraftMounts[number], i: number) => ({ id: `m${i}`, equipmentId, name: equipmentId, arc, ...(bay === undefined ? {} : { bay }), ...(amount === undefined ? {} : { amount }) });
  return { ...record, ...(f.si === undefined ? {} : { si: f.si }), ...build, mounts: mounts.map(mount) };
}
const times = <T>(n: number, item: T): T[] => Array.from({ length: n }, () => item);

describe("small craft and DropShip construction", () => {
  it("TechManual: the Astrolux (200-t civilian aerodyne small craft) of pp. 185-197 by value, from engine to cargo", () => {
    const astrolux = craft("tw-tm-so", { unitType: "small-craft", shape: "aerodyne", use: "civilian", tons: 200, safe: 5 }, { fuelTons: 20, armor: { type: "standard", tons: 5, points: { NO: 33, LW: 28, RW: 28, AF: 23 } }, quarters: { "second-class": 3, "first-class": 7 } });
    expect([craftMaxThrust(astrolux), craftEngineTons(astrolux), craftSiRange(astrolux), craftSI(astrolux), craftSiTons(astrolux), craftControlTons(astrolux)]).toEqual([8, 65, { min: 8, max: 240 }, 8, 8, 1.5]);
    expect([craftFuelPoints(astrolux), craftPumpTons(astrolux), craftHeat(astrolux)?.free, craftCrew(astrolux, catalog)?.minimum]).toEqual([1600, 0.5, 1, 3]);
    expect(craftArmor(astrolux)).toMatchObject({ perTon: 16, bought: 80, free: 32, available: 112, allocated: 112, over: 0, limitTons: 36, tonsOver: -31 });
    expect(craftTally(astrolux, catalog)).toMatchObject({ total: 191, remaining: 9, unknown: [] }); // the 9 tons left are the book's cargo
    // A small craft reads the civilian heat sink row even when marked military (65 / 60; the military row gives 3); a non-craft or unknown edition gives null, never a throw.
    const military = { ...astrolux, use: "military" as const };
    expect([craftHeat(military)?.free, craftHeat({ ...astrolux, unitType: "aerospace-fighter" }), craftEngineTons({ ...astrolux, editionId: "aerotech-1986" }), craftEngineTons({ ...astrolux, editionId: "no-such" })]).toEqual([1, null, null, null]);
  });

  it("TechManual: the Nekohono'o (16,000-t military spheroid DropShip) by value, with its fighter, small craft and battle armor bays, doors, launch rate (battle armor bays do not launch) and escape pods", () => {
    const bays = [{ kind: "fighter", capacity: 6, doors: 2 }, { kind: "small-craft", capacity: 9, doors: 2 }, { kind: "battle-armor-clan", capacity: 27, doors: 2 }];
    const nekohonoo = craft("tw-tm-so", { unitType: "dropship", shape: "spheroid", use: "military", tons: 16000, safe: 5, si: 16 }, {
      fuelTons: 400,
      armor: { type: "ferro-aluminum", tons: 57, points: { NO: 310, LS: 236, RS: 236, AF: 175 } },
      heatSinks: { type: "double", count: 107 },
      bays,
    }, times(6, ["", "escape-pod-aerospace-is"] as CraftMounts[number]));
    expect([craftEngineTons(nekohonoo), craftSiTons(nekohonoo), craftControlTons(nekohonoo), craftPumpTons(nekohonoo), craftFuelPoints(nekohonoo)]).toEqual([5200, 512, 120, 8, 12000]);
    expect(craftArmor(nekohonoo)).toMatchObject({ perTon: 15.68, bought: 893, free: 64, available: 957, over: 0, limitTons: 57.5 });
    expect(craftHeat(nekohonoo)).toEqual({ free: 188, added: 107, total: 295, capacity: 590 });
    expect(craftCrew(nekohonoo, catalog)?.minimum).toBe(8);
    expect(craftBayTons(nekohonoo)).toEqual({ tons: 2970, unknown: [] });
    expect(craftDoors(nekohonoo)).toEqual({ doors: 6, counted: 6, limit: 8, launchRate: 8, withoutDoor: [] });
    // 9,596 tons after the heat sinks in the book, less 2,970 of bays and 42 of escape pods.
    expect(craftTally(nekohonoo, catalog)).toMatchObject({ remaining: 6584, unknown: [] });
  });

  it("TechManual: the Arcadia (3,000-t Clan military aerodyne DropShip) by value, with Clan engine and armor columns", () => {
    const arcadia = craft("tw-tm-so", { unitType: "dropship", shape: "aerodyne", use: "military", techBase: "clan", tons: 3000, safe: 6, si: 11 }, { fuelTons: 200, armor: { type: "standard", tons: 49.5, points: { NO: 351, LW: 211, RW: 211, AF: 261 } }, heatSinks: { type: "double", count: 160 } });
    expect([craftEngineTons(arcadia), craftSiTons(arcadia), craftControlTons(arcadia), craftPumpTons(arcadia), craftFuelPoints(arcadia)]).toEqual([1098, 165, 23, 4, 6000]);
    expect(craftArmor(arcadia)).toMatchObject({ perTon: 20, bought: 990, free: 44, available: 1034, over: 0, limitTons: 49.5 });
    expect([craftHeat(arcadia)?.free, craftHeat(arcadia)?.total, craftCrew(arcadia)?.minimum]).toEqual([54, 214, 5]);
    expect(craftTally(arcadia, catalog).remaining).toBe(1300.5);
  });

  it.each([
    ["aerotech2", { engine: 204.75, si: 12.6, controls: 7.875, pumps: 0.2, limit: 21.6, bought: 260, offered: ["engine", "armor"] }],
    ["aerotech2-revised", { engine: 204.75, si: 12.6, controls: 7.875, pumps: 0.2, limit: 21.6, bought: 260, offered: ["engine", "armor"] }],
    ["tw-tm-so", { engine: 205, si: 13, controls: 8, pumps: 0.5, limit: 21.5, bought: 259, offered: ["engine"] }],
  ])("%s rounds a 1,050-t spheroid DropShip's masses and armor as its own book does (the AeroTech 2 books print no rounding), and reports parts it does not offer", (editionId, want) => {
    const dropship = craft(editionId, { unitType: "dropship", shape: "spheroid", use: "civilian", tons: 1050, safe: 3, si: 6 }, { fuelTons: 10, armor: { type: "ferro-aluminum", tons: 14.5, points: {} } });
    expect([craftEngineTons(dropship), craftSiTons(dropship), craftControlTons(dropship), craftPumpTons(dropship), craftArmor(dropship)?.limitTons, craftArmor(dropship)?.bought]).toEqual([want.engine, want.si, want.controls, want.pumps, want.limit, want.bought]);
    // A small craft's engine mass uses the DropShip rule in all three (AeroTech 2 errata v1.2, Revised p. 61).
    expect(craftEngineTons(craft(editionId, { unitType: "small-craft", shape: "aerodyne", use: "civilian", tons: 200, safe: 5 }))).toBe(65);
    expect(craftPartsNotOffered({ ...dropship, engine: { type: "xl" }, armor: { ...dropship.armor, type: editionId === "tw-tm-so" ? "standard" : "light-ferro-aluminum" } })).toEqual(want.offered);
    expect(craftPartsNotOffered({ ...dropship, unitType: "aerospace-fighter" })).toEqual([]);
  });

  it.each([
    ["aerodyne", "civilian", "dropship", 19],
    ["aerodyne", "military", "dropship", 58],
    ["spheroid", "civilian", "dropship", 43],
    ["spheroid", "military", "dropship", 89],
  ] as const)("free heat sinks of a 3,000-t %s %s DropShip with a 1,170-ton engine, the same in all three editions", (shape, use, unitType, free) => {
    for (const editionId of ["aerotech2", "aerotech2-revised", "tw-tm-so"]) expect(craftHeat(craft(editionId, { unitType, shape, use, tons: 3000, safe: 6 }))?.free).toBe(free);
  });

  it.each([
    [13, 133, "tw-tm-so", 13.5],
    [36, 276, "tw-tm-so", 83],
    [12, 100, "tw-tm-so", 0],
    [15, 100, "aerotech2-revised", 10],
    [13, 133, "aerotech2", 13.3],
  ])("fire control for %d weapons weighing %d tons in one arc under %s is %f tons (a tenth for each whole multiple of 12, over 12 only)", (weapons, tons, editionId, expected) => {
    expect(expandedFireControlTons(weapons, tons, editionId)).toBe(expected);
    const arcs = craftArcs(craft(editionId, { unitType: "dropship", shape: "aerodyne", use: "military", tons: 3000, safe: 5 }, {}, times(13, ["NO", "medium-laser-is"] as CraftMounts[number])), catalog);
    expect(arcs.find((a) => a.arc === "NO")).toMatchObject({ weapons: 13, limit: 12, weaponTons: 13, fireControlTons: editionId === "tw-tm-so" ? 1.5 : 1.3 });
  });

  it.each([
    ["aerotech2", false, []],
    ["aerotech2-revised", true, ["LW|RW"]],
    ["tw-tm-so", true, ["LW|RW"]],
  ])("%s: a weapon bay's attack value against 700 (capital counted tenfold), sizes in one bay (mixing allowed: %s), the wing pair, the sides, and the minimum ammunition", (editionId, mixedAllowed) => {
    const at = (mounts: CraftMounts) => craft(editionId, { unitType: "dropship", shape: "aerodyne", use: "military", tons: 3000, safe: 5 }, {}, mounts);
    expect(craftWeaponBays(at(times(7, ["NO", "nac-10-is", "b1"] as CraftMounts[number])), catalog)).toMatchObject([{ bay: "b1", attack: 700, limit: 700, over: false, classes: ["Capital AC"] }]);
    expect(craftWeaponBays(at(times(8, ["NO", "nac-10-is", "b1"] as CraftMounts[number])), catalog)[0]).toMatchObject({ attack: 800, over: true });
    const mixed = craftWeaponBays(at([["NO", "medium-laser-is", "b1"], ["NO", "large-laser-is", "b1"]]), catalog)[0];
    expect([mixed?.sizes, mixed?.classes, mixed?.mixedSizesAllowed]).toEqual([["medium", "large"], ["Laser"], mixedAllowed]);
    // Wings must match in TechManual only (the AeroTech 2 books name the wings of fighters); spheroid sides in all three.
    expect(craftArcsUnmatched(at([["LW", "large-laser-is"], ["RW", "medium-laser-is"]]), catalog)).toEqual(editionId === "aerotech2" || editionId === "aerotech2-revised" ? [] : ["LW|RW"]);
    const spheroid = craft(editionId, { unitType: "dropship", shape: "spheroid", use: "military", tons: 3000, safe: 5 }, {}, [["FL", "large-laser-is"], ["FR", "medium-laser-is"]]);
    expect(craftArcsUnmatched(spheroid, catalog)).toEqual(["FL|FR"]);
    // Two AC/10 want 20 shots; one ton of ammunition gives 10. An Ultra autocannon wants 20 shots for itself.
    const guns = at([["NO", "ac-10-is", "b1"], ["NO", "ac-10-is", "b1"], ["NO", "ammo-ac-10-is", "b1"], ["AF", "ultra-ac-10-is", "b2"], ["AF", "ammo-ultra-ac-10-is", "b2", 2]]);
    expect(craftAmmoShortfalls(guns, catalog)).toEqual([{ bay: "b1", weaponId: "ac-10-is", required: 20, have: 10 }]);
  });

  it("crew is the base plus gunners (a gunner for each six standard weapons rounded up, one for each capital weapon; an anti-missile system needs none), and a small craft's base differs by book", () => {
    const weapons = [...times(60, ["NO", "medium-laser-is"] as CraftMounts[number]), ...times(5, ["AF", "nac-10-is"] as CraftMounts[number]), ...times(2, ["AF", "ams-is"] as CraftMounts[number])];
    const nekohonoo = craft("tw-tm-so", { unitType: "dropship", shape: "spheroid", use: "military", tons: 16000, safe: 5 }, {}, weapons);
    expect(craftCrew(nekohonoo, catalog)).toEqual({ base: 8, standardWeapons: 60, capitalWeapons: 5, gunners: 15, minimum: 23 });
    for (const [editionId, base] of [["aerotech2", 4], ["aerotech2-revised", 4], ["tw-tm-so", 3]] as const) expect(craftCrew(craft(editionId, { unitType: "small-craft", shape: "aerodyne", use: "civilian", tons: 200, safe: 5 }))?.base).toBe(base);
    expect(craftCrew(craft("tw-tm-so", { unitType: "dropship", shape: "aerodyne", use: "civilian", tons: 1000, safe: 5 }))?.base).toBe(4);
  });
});

// ---- JumpShip, WarShip and space station construction --------------------------------------------------------------------------

type CapitalType = "jumpship" | "warship" | "space-station";
function ship(editionId: string, f: { unitType: CapitalType; tons: number; safe?: number; si?: number; techBase?: "inner-sphere" | "clan" }, build: Partial<AeroRecord> = {}, mounts: CraftMounts = []): AeroRecord {
  return craft(editionId, { unitType: "dropship", shape: "aerodyne", use: "military", tons: f.tons, safe: f.safe ?? 0, ...(f.si === undefined ? {} : { si: f.si }), ...(f.techBase === undefined ? {} : { techBase: f.techBase }) }, { unitType: f.unitType, shape: undefined, use: undefined, ...build }, mounts);
}
const SIX = ["NO", "FL", "FR", "AL", "AR", "AF"];
const each = (arcs: string[], items: CraftMounts): CraftMounts => arcs.flatMap((arc) => items.map(([, id, bay, amount]) => [arc, id, bay, amount] as CraftMounts[number]));

describe("JumpShip, WarShip and space station construction", () => {
  it("AeroTech 2 Revised: Kit's 1,350,000-ton WarShip of pp. 61-70 by value (the book prints 360 as the top of its SI range; 30 x Max Thrust is 180)", () => {
    const standard: CraftMounts = [...times(4, ["", "er-large-laser-is"] as CraftMounts[number]), ["", "lrm-20-is"], ["", "lrm-20-is"], ["", "srm-6-is"], ["", "srm-6-is"]];
    const pair = (id: string): CraftMounts => times(2, ["", id] as CraftMounts[number]);
    const mounts = [
      ...each(["NO", "FL", "FR", "LB", "RB", "AL", "AR", "AF"], standard),
      ...each(["NO"], [...pair("nac-30-is"), ...pair("nac-40-is"), ...pair("heavy-n-ppc-is"), ...pair("heavy-n-gauss-is"), ...pair("ar-10-launcher-is")]),
      ...each(["FL", "FR", "AL", "AR"], [...pair("nac-35-is"), ...pair("medium-n-ppc-is"), ...pair("ar-10-launcher-is")]),
      ...each(["LB", "RB"], [...pair("nac-30-is"), ...times(3, ["", "nac-40-is"] as CraftMounts[number]), ...pair("heavy-n-ppc-is")]),
      ...each(["AF"], [...pair("nac-30-is"), ...pair("heavy-n-ppc-is"), ...pair("heavy-n-gauss-is"), ...pair("ar-10-launcher-is")]),
    ];
    const mjolnir = ship("aerotech2-revised", { unitType: "warship", tons: 1350000, safe: 4, si: 140 }, {
      fuelTons: 2376,
      armor: { type: "ferro-carbide", tons: 3500, points: { NO: 504, FL: 479, FR: 479, AL: 474, AR: 474, AF: 474 } },
      heatSinks: { type: "double", count: 470 },
      systems: { "docking-hardpoint": 4, "grav-deck-medium": 1 },
    }, mounts);
    expect([capitalMaxThrust(mjolnir), capitalEngineTons(mjolnir), capitalSiRange(mjolnir), capitalSI(mjolnir), capitalSiTons(mjolnir), capitalControlTons(mjolnir)]).toEqual([6, 324000, { min: 6, max: 180 }, 140, 189000, 3375]);
    expect([kfDrive(mjolnir), jumpSail(mjolnir)]).toEqual([{ tons: 610875, integrity: 26 }, { tons: 98, integrity: 6 }]);
    expect([capitalFuelPoints(mjolnir), capitalPumpTons(mjolnir)]).toEqual([5940, 48]);
    expect(capitalArmor(mjolnir)).toEqual({ perTon: 0.8, bought: 2800, freePerFacing: 14, free: 84, available: 2884, allocated: 2884, over: 0, limitTons: 3780, tonsOver: -280 });
    expect(capitalHeat(mjolnir)).toEqual({ free: 849, added: 470, total: 1319, capacity: 2638 });
    expect(capitalCrew(mjolnir, catalog)).toEqual({ base: 315, standardWeapons: 64, capitalWeapons: 56, gunners: 67, minimum: 382 });
    expect(capitalSystems(mjolnir)).toMatchObject({ tons: 4100, unknown: [], lines: [{ kind: "docking-hardpoint", count: 4, tons: 4000, limit: 27, allowed: true }, { kind: "grav-deck-medium", tons: 100, allowed: true }] });
    expect(capitalArcs(mjolnir, catalog).map((a) => [a.arc, a.weapons, a.limit, a.fireControlTons])).toEqual([["NO", 18, 20, 0], ["FL", 14, 20, 0], ["FR", 14, 20, 0], ["LB", 15, 20, 0], ["RB", 15, 20, 0], ["AL", 14, 20, 0], ["AR", 14, 20, 0], ["AF", 16, 20, 0]]);
    expect(capitalArcsUnmatched(mjolnir, catalog)).toEqual([]);
  });

  it.each([
    ["aerotech2", 237500, 5.158333, 63.333333, 4.166667],
    ["aerotech2-revised", 237500, 5, 63, 4],
    ["tw-tm-so", 237500, 6, 64, 5],
  ])("%s: a 250,000-ton JumpShip's standard K-F drive and sail, rounded as the book rounds (AeroTech 2 prints none, Revised to the nearest, Strategic Operations up)", (editionId, kf, kfIntegrity, sail, sailIntegrity) => {
    const jumpship = ship(editionId, { unitType: "jumpship", tons: 250000 });
    expect(kfDrive(jumpship)?.tons).toBe(kf);
    expect(kfDrive(jumpship)?.integrity).toBeCloseTo(kfIntegrity, 5);
    expect(jumpSail(jumpship)?.tons).toBeCloseTo(sail, 5);
    expect(jumpSail(jumpship)?.integrity).toBeCloseTo(sailIntegrity, 5);
    // A station-keeping drive: 1.2 percent of the tons, no Max Thrust and no SI to choose; the drive and sail belong to JumpShips and WarShips.
    expect([capitalEngineTons(jumpship), capitalMaxThrust(jumpship), capitalSiRange(jumpship), capitalSI(jumpship)]).toEqual([3000, null, null, 1]);
    expect([kfDrive({ ...jumpship, unitType: "space-station" }), kfDrive({ ...jumpship, unitType: "dropship" }), kfDrive({ ...jumpship, editionId: "battlespace" })]).toEqual([null, null, null]);
  });

  it("a space station's SI is fixed at 1 whatever the record holds: Strategic Operations' Alliance (pp. 134-143) by value, and the AeroTech 2 books' limits it lacks", () => {
    const alliance = ship("tw-tm-so", { unitType: "space-station", tons: 100000, si: 50 }, { fuelTons: 10000, armor: { type: "standard", tons: 52.5, points: Object.fromEntries(SIX.map((loc) => [loc, 7])) }, bays: [{ kind: "small-craft", capacity: 8, doors: 1 }] });
    expect([capitalSI(alliance), capitalSiTons(alliance), capitalEngineTons(alliance), capitalControlTons(alliance), capitalFuelPoints(alliance), capitalPumpTons(alliance)]).toEqual([1, 1000, 1200, 100, 100000, 200]);
    expect(capitalArmor(alliance)).toMatchObject({ perTon: 0.8, bought: 42, freePerFacing: 0, free: 0, allocated: 42, over: 0, limitTons: 393 });
    expect([capitalHeat(alliance)?.free, capitalCrew(alliance)?.base, capitalDoors(alliance)?.limit, capitalSystemLimit("docking-hardpoint", alliance), jumpSail(alliance)]).toEqual([93, 65, 10, 2, null]);
    // The AeroTech 2 books print no station armor limit and no station fuel points; a station with energy storage batteries must carry a sail there.
    const revised = { ...alliance, editionId: "aerotech2-revised", systems: { "energy-storage-battery": 1 } };
    expect([capitalSI(revised), capitalArmor(revised)?.limitTons, capitalFuelPoints(revised), jumpSail(revised)]).toEqual([1, null, null, { tons: 43, integrity: 3 }]);
    expect(capitalDoors({ ...alliance, bays: [{ kind: "cargo", capacity: 10, doors: 0 }] })?.withoutDoor).toEqual(["cargo"]);
  });

  it.each([
    ["tw-tm-so", 149999, "inner-sphere", "standard", 0.8],
    ["tw-tm-so", 150000, "inner-sphere", "standard", 0.6],
    ["tw-tm-so", 249999, "clan", "standard", 0.7],
    ["tw-tm-so", 250000, "clan", "standard", 0.5],
    ["tw-tm-so", 2000, "inner-sphere", "lamellor-ferro-carbide", 1.4],
    ["tw-tm-so", 150000, "clan", "lamellor-ferro-carbide", 1.3],
    ["aerotech2-revised", 1350000, "inner-sphere", "ferro-carbide", 0.8],
    ["aerotech2", 2000, "clan", "improved-ferro-aluminum", 1.2],
    ["aerotech2", 1999, "inner-sphere", "standard", undefined],
    ["tw-tm-so", 100000, "inner-sphere", "ferro-aluminum", undefined],
  ] as const)("%s: %d tons, %s %s armor gives %s capital points a ton (Strategic Operations' columns are the standard column plus the AeroTech 2 bonus)", (editionId, tons, techBase, type, perTon) => {
    expect(capitalArmorPointsPerTon(type, editionId, tons, techBase)).toBe(perTon);
  });

  it.each([
    ["aerotech2-revised", 345000, 6],
    ["tw-tm-so", 345000, 7],
    ["aerotech2", 1930000, 38],
    ["tw-tm-so", 1930000, 39],
    ["aerotech2", 45000, 0],
    ["tw-tm-so", 45000, 0],
  ])("%s: a %d-ton unit may mount %d docking hardpoints (one per 50,000 tons; whole ones in the AeroTech 2 books, rounded up from 50,000 tons by the Strategic Operations errata)", (editionId, tons, limit) => {
    expect(capitalSystemLimit("docking-hardpoint", { editionId, tons })).toBe(limit);
    // A lithium-fusion battery: one at most, on a station only in AeroTech 2; an HPG has a mass only in the AeroTech 2 books.
    const station = ship(editionId, { unitType: "space-station", tons }, { systems: { "lithium-fusion-battery": 1, hpg: 1 } });
    expect(capitalSystems(station)).toMatchObject(editionId === "tw-tm-so" ? { lines: [{ kind: "lithium-fusion-battery", allowed: false }], unknown: ["hpg"] } : { lines: [{ allowed: editionId === "aerotech2" }, { kind: "hpg", tons: 50 }], unknown: [] });
  });

  it("a WarShip has the broadside arcs and 20 weapons an arc, a JumpShip six arcs and 12; fire control past the limit; matched sides and broadsides; bays count only naval damage tenfold", () => {
    const warship = ship("tw-tm-so", { unitType: "warship", tons: 500000, safe: 2 }, {}, [...times(25, ["NO", "er-large-laser-is"] as CraftMounts[number]), ["LB", "nac-40-is", "b1"], ["LB", "nac-40-is", "b1"], ["RB", "nac-40-is", "b2"], ["AF", "killer-whale-is", "b3"], ["AF", "killer-whale-is", "b3"]]);
    expect(capitalArcs(warship, catalog).map((a) => [a.arc, a.limit])).toEqual(["NO", "FL", "FR", "LB", "RB", "AL", "AR", "AF"].map((arc) => [arc, 20]));
    expect(capitalArcs(warship, catalog).find((a) => a.arc === "NO")).toMatchObject({ weapons: 25, weaponTons: 125, fireControlTons: 12.5 });
    expect(capitalArcsUnmatched(warship, catalog)).toEqual(["LB|RB"]);
    // Two NAC/40s (40 capital each) are 800 standard points, over the 700 a bay holds; two Killer Whales (4 capital each) are 80.
    expect(capitalWeaponBays(warship, catalog).map((b) => [b.bay, b.attack, b.over, b.heat])).toEqual([["arc:NO", 200, false, 300], ["b1", 800, true, 270], ["b2", 400, false, 135], ["b3", 80, false, 40]]);
    const jumpship = ship("aerotech2", { unitType: "jumpship", tons: 200000 }, {}, [...times(13, ["NO", "er-large-laser-is"] as CraftMounts[number]), ["LB", "er-large-laser-is"]]);
    expect(capitalArcs(jumpship, catalog).map((a) => [a.arc, a.limit, a.fireControlTons])).toEqual([["NO", 12, 6.5], ...SIX.slice(1).map((arc) => [arc, 12, 0])]);
  });

  it("Strategic Operations: Kate's Odyssey-class JumpShip (pp. 133-146) to its last ton, and Lynn's McKenna-class WarShip's figures (gunners by the rule: the example counts 26 weapons where it lists 22 that need one)", () => {
    const odyssey = ship("tw-tm-so", { unitType: "jumpship", tons: 345000, techBase: "clan" }, {
      fuelTons: 1000,
      armor: { type: "standard", tons: 168, points: { NO: 15, FL: 14, FR: 14, AL: 14, AR: 14, AF: 13 } },
      heatSinks: { type: "single", count: 1 },
      quarters: { "second-class": 30, "first-class": 6 },
      bays: [{ kind: "small-craft", capacity: 1, doors: 1 }, { kind: "battle-armor-clan", capacity: 2, doors: 2 }, { kind: "cargo", capacity: 418, doors: 1 }],
      systems: { "docking-hardpoint": 4, "grav-deck-medium": 2, "lithium-fusion-battery": 1 },
    }, [
      ["NO", "gauss-rifle-clan"], ["NO", "gauss-rifle-clan"], ["NO", "ammo-gauss-rifle-clan", undefined, 3], ["NO", "er-large-laser-clan"], ["NO", "large-pulse-laser-clan"], ["NO", "medium-pulse-laser-clan"], ["NO", "medium-pulse-laser-clan"],
      ...each(["FL", "FR"], [["", "er-large-laser-clan"], ["", "medium-pulse-laser-clan"], ["", "medium-pulse-laser-clan"], ["", "ams-clan"], ["", "ams-clan"], ["", "ammo-ams-clan", undefined, 2]]),
      ...each(["AL", "AR"], [["", "large-pulse-laser-clan"], ["", "medium-pulse-laser-clan"], ["", "medium-pulse-laser-clan"], ["", "ams-clan"], ["", "ams-clan"], ["", "ammo-ams-clan", undefined, 2]]),
      ["AF", "er-large-laser-clan"], ["AF", "large-pulse-laser-clan"], ["AF", "medium-pulse-laser-clan"], ["AF", "medium-pulse-laser-clan"],
      ...times(3, ["", "lifeboat-aerospace-clan"] as CraftMounts[number]),
    ]);
    expect([kfDrive(odyssey), jumpSail(odyssey), capitalControlTons(odyssey), capitalFuelPoints(odyssey), capitalPumpTons(odyssey)]).toEqual([{ tons: 327750, integrity: 7 }, { tons: 76, integrity: 5 }, 863, 2500, 20]);
    expect(capitalArmor(odyssey)).toMatchObject({ perTon: 0.5, bought: 84, free: 0, allocated: 84, over: 0, limitTons: 191.5 });
    expect([capitalHeat(odyssey)?.total, capitalCrew(odyssey, catalog)?.base, capitalCrew(odyssey, catalog)?.gunners, capitalArcsUnmatched(odyssey, catalog)]).toEqual([136, 24, 4, []]);
    expect(capitalDoors(odyssey)).toEqual({ doors: 4, counted: 4, limit: 14, launchRate: 2, withoutDoor: [] });
    expect(capitalTally(odyssey, catalog)).toMatchObject({ total: 345000, remaining: 0, unknown: [] });

    const mckenna = ship("tw-tm-so", { unitType: "warship", tons: 1930000, safe: 3, si: 95 }, { fuelTons: 1600, armor: { type: "ferro-carbide", tons: 1603.5, points: { NO: 200, FL: 250, FR: 250, AL: 250, AR: 250, AF: 142 } }, heatSinks: { type: "double", count: 5447 } });
    expect([capitalEngineTons(mckenna), capitalMaxThrust(mckenna), capitalSiRange(mckenna), capitalSiTons(mckenna), capitalPumpTons(mckenna), capitalControlTons(mckenna)]).toEqual([347400, 5, { min: 5, max: 150 }, 183350, 32, 4825]);
    expect([kfDrive(mckenna), jumpSail(mckenna), capitalCrew(mckenna)?.base]).toEqual([{ tons: 873325, integrity: 37 }, { tons: 127, integrity: 8 }, 431]);
    expect(capitalArmor(mckenna)).toMatchObject({ perTon: 0.8, bought: 1282, freePerFacing: 10, available: 1342, allocated: 1342, limitTons: 3667 });
    expect(capitalHeat(mckenna)).toEqual({ free: 878, added: 5447, total: 6325, capacity: 12650 });
  });
});
