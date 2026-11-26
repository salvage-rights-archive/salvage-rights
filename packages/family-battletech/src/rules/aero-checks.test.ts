import { describe, expect, it } from "vitest";
import { newAeroRecord, withDefaults } from "./aero";
import type { AeroRecord } from "./aero";
import { aeroLevelItems, aeroLowestLevel, aeroOfficialState, checkAero, checkUnder, markAeroOfficial } from "./aero-checks";
import { loadCatalog } from "./catalog";

const catalog = await loadCatalog();

type Mounts = [arc: string, id: string, amount?: number][];
function fighter(editionId: string, build: Partial<AeroRecord> = {}, mounts: Mounts = [], tons = 50): AeroRecord {
  const record = newAeroRecord({ id: "f", unitType: "aerospace-fighter", tons, safeThrust: 5, year: 3070 }, editionId);
  return { ...record, ...build, mounts: mounts.map(([arc, equipmentId, amount], i) => ({ id: `m${i}`, equipmentId, name: equipmentId, arc, ...(amount === undefined ? {} : { amount }) })) };
}
const kinds = (findings: ReturnType<typeof checkAero>) => findings.map((f) => `${f.check}:${f.level}`);
const sound = { engine: { type: "standard" }, fuelTons: 2, armor: { type: "standard", tons: 5, points: { NO: 30, LW: 20, RW: 20, AF: 10 } }, heatSinks: { type: "single", count: 0 } };

describe("aerospace rules check", () => {
  it.each([
    ["type: weight over the edition's range", "tw-tm-so", { tons: 120 }, [], "type:error"],
    ["weight: parts over the unit's tons", "tw-tm-so", { fuelTons: 40 }, [], "weight:error"],
    ["engine: rating above the table", "tw-tm-so", { thrust: { safe: 12 } }, [], "engine:error"],
    ["engine: a type the edition lacks", "aerotech-1986", { engine: { type: "xl" } }, [], "engine:warning"],
    ["lots: fuel not in whole lots", "aerotech2", { fuelTons: 2.5 }, [], "lots:warning"],
    ["armor: more points set than bought", "tw-tm-so", { armor: { type: "standard", tons: 1, points: { NO: 60 } } }, [], "armor:error"],
    ["armor: over the edition's limit", "tw-tm-so", { armor: { type: "standard", tons: 50, points: { NO: 700 } } }, [], "armor:error"],
    ["arcs: more items than an arc holds", "tw-tm-so", {}, Array.from({ length: 6 }, () => ["NO", "medium-laser-is"]), "arcs:error"],
    ["arcs: unlike wings", "tw-tm-so", {}, [["LW", "large-laser-is"], ["RW", "medium-laser-is"]], "arcs:error"],
    ["equipment: Clan item on an Inner Sphere unit", "tw-tm-so", {}, [["NO", "er-ppc-clan"]], "equipment:warning"],
    ["dates: item before its year", "tw-tm-so", { year: 2400 }, [["NO", "er-ppc-clan"]], "dates:warning"],
    ["level: item above the unit's level", "tw-tm-so", { rulesLevel: "introductory" }, [["NO", "large-pulse-laser-is"]], "level:warning"],
  ] as [string, string, Partial<AeroRecord>, Mounts, string][])("%s", (_label, editionId, build, mounts, expected) => {
    expect(kinds(checkAero(fighter(editionId, { ...sound, ...build }, mounts), catalog))).toContain(expected);
  });

  it("the year rule: needed above Introductory in the current rules, never in the older books; no Clan unit before the Clan sub-eras in any edition; a saved unit that fails it keeps its record and the check reports it", () => {
    const wants = (editionId: string, build: Partial<AeroRecord>) => checkAero(fighter(editionId, { ...sound, ...build }), catalog).filter((f) => f.check === "year");
    expect(wants("tw-tm-so", { year: null, rulesLevel: "standard" })).toEqual([expect.objectContaining({ level: "error", where: { field: "year" } })]);
    expect(wants("tw-tm-so", { year: null, rulesLevel: "introductory" })).toEqual([]);
    expect(wants("aerotech2", { year: null })).toEqual([]);
    for (const editionId of ["tw-tm-so", "aerotech2"]) expect(wants(editionId, { year: 2750, techBase: "clan", rulesLevel: "advanced" }), editionId).toEqual([expect.objectContaining({ level: "error", where: { field: "techBase" } })]);
    expect(wants("tw-tm-so", { year: 3000, era: "succession-wars-era", techBase: "clan", rulesLevel: "advanced" })).toEqual([expect.objectContaining({ where: { field: "techBase" } })]);
  });

  it("a conventional fighter must carry sinks for its energy weapons (not its cannon) in the three later editions", () => {
    for (const edition of ["aerotech2", "aerotech2-revised", "tw-tm-so"]) {
      const lasers = fighter(edition, { ...sound, unitType: "conventional-fighter" }, [["NO", "large-laser-is"], ["NO", "large-laser-is"], ["NO", "ac-5-is"]]);
      expect(checkAero(lasers, catalog).filter((f) => f.check === "heat" && f.level === "error"), edition).toHaveLength(1);
      expect(checkAero({ ...lasers, heatSinks: { type: "single", count: 6 } }, catalog).filter((f) => f.check === "heat"), edition).toEqual([]);
    }
  });

  it("a fighter built under AeroTech and checked under AeroTech 2 lists the arc and armor findings", () => {
    const at1 = fighter("aerotech-1986", { ...sound, armor: { type: "standard", tons: 5, points: { CP: 10, EN: 10, FU: 20, NO: 20, LW: 10, RW: 10 } } }, [
      ["LW", "large-laser-is"], ["RW", "medium-laser-is"], ...Array.from({ length: 6 }, (): [string, string] => ["NO", "medium-laser-is"]),
    ]);
    expect(kinds(checkAero(at1, catalog)).filter((k) => k.startsWith("arcs"))).toEqual([]);
    const under = checkUnder(at1, "aerotech2", catalog);
    expect(under.filter((f) => f.check === "arcs" && f.level === "error")).toHaveLength(2);
    expect(under.filter((f) => f.check === "armor" && f.where?.field === "armor.points.CP")).toHaveLength(1);
    expect(at1.editionId).toBe("aerotech-1986");
  });

  it("a DropShip of AeroTech 2 Revised lists nothing new under the current rules when its figures agree", () => {
    const ship = { ...newAeroRecord({ id: "d", unitType: "dropship", tons: 3000, year: 3070 }, "aerotech2-revised") };
    const shape = (list: ReturnType<typeof checkAero>) => list.map((f) => `${f.check}:${f.level}`);
    expect(shape(checkUnder(ship, "tw-tm-so", catalog))).toEqual(shape(checkAero(ship, catalog)));
  });

  it("the docking hardpoint comes with the K-F boom: an error before 2458, Experimental in 2458-2469, Advanced from 2470 (IO:AE pp. 36, 113)", () => {
    const ship = (year: number) => ({ ...newAeroRecord({ id: "h", unitType: "warship", tons: 500000, year }, "tw-tm-so"), systems: { "docking-hardpoint": 2 } });
    const hardpoint = (year: number) => aeroLevelItems(ship(year), catalog).find((i) => i.name === "Docking hardpoint")?.level;
    expect([hardpoint(2457), hardpoint(2458), hardpoint(2469), hardpoint(2470)]).toEqual(["advanced", "experimental", "experimental", "advanced"]);
    expect([2457, 2458].map((y) => kinds(checkAero(ship(y), catalog)).includes("systems:error"))).toEqual([true, false]);
  });

  it("the level of a WarShip in the current rules is Advanced, and an older edition shows no level", () => {
    const ship = newAeroRecord({ id: "w", unitType: "warship", tons: 500000, year: 3070 }, "tw-tm-so");
    expect([aeroLowestLevel(ship, catalog), aeroLowestLevel({ ...ship, editionId: "aerotech2" }, catalog)]).toEqual(["advanced", undefined]);
    expect(kinds(checkAero({ ...ship, rulesLevel: "standard" }, catalog))).toContain("level:warning");
    expect(kinds(checkUnder({ ...ship, rulesLevel: "standard" }, "aerotech2", catalog))).not.toContain("level:warning");
  });

  it("an item the edition does not list is reported and kept", () => {
    const record = fighter("aerotech-1986", sound, [["NO", "er-ppc-is"]]);
    const findings = checkAero(record, catalog);
    expect(findings.find((f) => f.check === "equipment")?.where?.mountId).toBe("m0");
    expect(record.mounts).toHaveLength(1);
  });

  it("an OFFICIAL mark holds only while the design is the marked one", () => {
    const record = fighter("tw-tm-so", sound);
    markAeroOfficial(record, "TechManual", 12);
    expect(aeroOfficialState(record)).toEqual({ official: true, book: "TechManual", page: 12 });
    expect(aeroOfficialState({ ...record, name: { chassis: "Renamed", model: "" }, id: "g" }).official).toBe(true);
    expect(checkAero({ ...record, tons: 55 }, catalog).map((f) => f.check)).toContain("official");
  });

  it("an empty record, an unknown unit type and an unknown edition give findings and no throw", () => {
    const empty = withDefaults({}) as AeroRecord;
    expect(checkAero(empty, catalog).length).toBeGreaterThan(0);
    expect(() => checkAero({ ...empty, unitType: "zeppelin", editionId: "nowhere" }, catalog)).not.toThrow();
    expect(checkAero({ ...empty, unitType: "zeppelin" }, catalog).map((f) => f.check)).toContain("type");
  });
});
