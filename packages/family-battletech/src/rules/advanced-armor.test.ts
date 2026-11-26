// The advanced armor of TO:AUE pp. 92-94 and 192 on fighters, and the aerospace figures of Total Warfare pp. 303-304 and IO:AE p. 190 that the armor work added.
import { describe, expect, it } from "vitest";
import { FIGHTER_ARMOR_TYPES, fighterArmorPointsPerTon } from "../data/aero";
import { fighterArcs, newAeroRecord } from "./aero";
import type { AeroRecord } from "./aero";
import { aeroBattleValue } from "./aero-bv";
import { checkAero, fighterArmorOffered } from "./aero-checks";
import { loadCatalog } from "./catalog";

const catalog = await loadCatalog();
const CURRENT = "tw-tm-so";

type Mount = [arc: string, id: string, amount?: number];
const mountsOf = (list: Mount[]) => list.map(([arc, equipmentId, amount], i) => ({ id: `m${String(i)}`, equipmentId, name: equipmentId, arc, ...(amount === undefined ? {} : { amount }) }));
function fighter(armorType: string, mounts: Mount[] = [], extra: Partial<AeroRecord> = {}): AeroRecord {
  const r = newAeroRecord({ id: "f", unitType: "aerospace-fighter", tons: 50, safeThrust: 6, year: 3100 }, CURRENT);
  return { ...r, rulesLevel: "experimental", armor: { type: armorType, tons: 5, points: { NO: 20, LW: 15, RW: 15, AF: 10 } }, heatSinks: { type: "single", count: 10 }, mounts: mountsOf(mounts), ...extra };
}
const checks = (record: AeroRecord) => checkAero(record, catalog).map((f) => `${f.check}:${f.level}`);

describe("advanced armor on a fighter (TO:AUE p. 92)", () => {
  it("takes the table's points a ton and its fighter slots in the arcs it names; hardened armor is not for fighters", () => {
    expect(["ferro-lamellor", "laser-reflective", "reactive", "vehicular-stealth"].map((id) => fighterArmorPointsPerTon(id, CURRENT))).toEqual([14, 16, 16, 16]);
    const base = Object.fromEntries(fighterArcs(fighter("standard"), catalog).map((a) => [a.arc, a.limit]));
    const limits = (type: string) => Object.fromEntries(fighterArcs(fighter(type), catalog).map((a) => [a.arc, (base[a.arc] ?? 0) - a.limit]));
    expect(limits("standard")).toEqual({ NO: 0, LW: 0, RW: 0, AF: 0 });
    expect(limits("reactive")).toMatchObject({ NO: 0, LW: 1, RW: 1, AF: 1 });
    expect(limits("laser-reflective-clan")).toMatchObject({ LW: 0, RW: 0, AF: 1 });
    expect(FIGHTER_ARMOR_TYPES.some((t) => t.id === "hardened")).toBe(false);
  });
  it("is offered where the level, tech base and year reach it, and to a fighter alone", () => {
    const type = (id: string) => FIGHTER_ARMOR_TYPES.find((t) => t.id === id);
    const offered = (id: string, extra: Partial<AeroRecord>) => fighterArmorOffered({ ...fighter("standard"), ...extra }, type(id) ?? FIGHTER_ARMOR_TYPES[0]!);
    expect([offered("vehicular-stealth", {}), offered("vehicular-stealth", { year: 3060 }), offered("vehicular-stealth", { rulesLevel: "standard" })]).toEqual([true, false, false]);
    expect(offered("vehicular-stealth", { rulesLevel: "standard", armor: { type: "vehicular-stealth", tons: 0, points: {} } })).toBe(true);
    expect(offered("vehicular-stealth", { unitType: "small-craft" })).toBe(false);
  });
  it("vehicular stealth needs an ECM suite and makes 10 heat; modular armor adds 10 points a ton to the Battle Value and is one to an arc", () => {
    const stealth = fighter("vehicular-stealth", [["NO", "medium-laser-is"]]);
    expect(checks(stealth)).toContain("armor:error");
    expect(checks({ ...stealth, mounts: mountsOf([["NO", "guardian-ecm-suite-is"]]) })).not.toContain("armor:error");
    expect(checkAero(stealth, catalog).some((f) => f.check === "heat")).toBe(false); // 10 sinks take the 10 heat
    expect(checkAero({ ...stealth, heatSinks: { type: "single", count: 0 }, mounts: mountsOf([["NO", "guardian-ecm-suite-is"], ["NO", "medium-laser-is"]]) }, catalog).some((f) => f.check === "heat")).toBe(true);
    const plain = fighter("standard");
    const modular = fighter("standard", [["NO", "modular-armor-is"]]);
    expect((aeroBattleValue(modular, catalog)?.total ?? 0) - (aeroBattleValue(plain, catalog)?.total ?? 0)).toBeGreaterThan(0);
    expect(checks(fighter("standard", [["NO", "modular-armor-is"], ["NO", "modular-armor-is"]]))).toContain("armor:error");
  });
  it("counts the armor type modifier and, for vehicular stealth, 0.3 more on the unit type modifier", () => {
    const bv = (type: string) => aeroBattleValue(fighter(type), catalog)?.defensive;
    expect(bv("laser-reflective")?.lines[0]?.value).toBeCloseTo((bv("standard")?.lines[0]?.value ?? 0) * 1.5);
    expect((bv("vehicular-stealth")?.modifier ?? 0) - (bv("standard")?.modifier ?? 0)).toBeCloseTo(0.3);
  });
});
