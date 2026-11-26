import { describe, expect, it } from "vitest";
import { AERO_BV_OVERLAYS } from "../data/aero-bv";
import { bvEntryOf } from "./bv";
import { craftHeat, newAeroRecord } from "./aero";
import type { AeroRecord } from "./aero";
import { aeroBattleValue, aeroCost } from "./aero-bv";
import { loadCatalog } from "./catalog";

const catalog = await loadCatalog();

type Mount = [arc: string, id: string, amount?: number, aft?: true];
const mountsOf = (list: Mount[]) => list.map(([arc, equipmentId, amount, aft], i) => ({ id: `m${String(i)}`, equipmentId, name: equipmentId, arc, ...(amount === undefined ? {} : { amount }), ...(aft ? { aft } : {}) }));
const times = (n: number, m: Mount): Mount[] => Array.from({ length: n }, () => m);

/** The TRB-D36 Thunderbird of the Battle Value v4.1 worked example (TechManual pp. 312-313): 224 armor, SI 10, 25 single sinks, Max Thrust 8. */
function thunderbird(): AeroRecord {
  const r = newAeroRecord({ id: "t", unitType: "aerospace-fighter", tons: 100, safeThrust: 5, year: 3025 }, "tw-tm-so");
  return {
    ...r,
    armor: { type: "standard", tons: 14, points: { NO: 70, LW: 56, RW: 56, AF: 42 } },
    heatSinks: { type: "single", count: 15 },
    fuelTons: 5,
    mounts: mountsOf([["NO", "large-laser-is"], ["LW", "large-laser-is"], ["RW", "large-laser-is"], ["LW", "lrm-20-is"], ["RW", "lrm-20-is"], ["NO", "medium-laser-is"], ["LW", "medium-laser-is"], ["RW", "medium-laser-is"], ...times(2, ["AF", "medium-laser-is"]), ["NO", "ammo-lrm-20-is", 4]]),
  };
}

/** The EST-R3 Eisensturm of AeroTech 2: Revised Edition (pp. 61-67, 79, 83): 95 t, XL 380, Max Thrust 9, 349 ferro-aluminum armor, 11 double sinks, 5 t fuel. */
function eisensturm(editionId: string): AeroRecord {
  const r = newAeroRecord({ id: "e", unitType: "aerospace-fighter", tons: 95, safeThrust: 6, year: 3025 }, editionId);
  return {
    ...r,
    engine: { type: "xl" },
    armor: { type: "ferro-aluminum", tons: 19.5, points: { NO: 109, LW: 90, RW: 90, AF: 60 } },
    heatSinks: { type: "double", count: 1 },
    fuelTons: 5,
    mounts: mountsOf([["NO", "gauss-rifle-is"], ["NO", "gauss-rifle-is"], ["LW", "large-laser-is"], ["RW", "large-laser-is"], ["LW", "medium-laser-is"], ["RW", "medium-laser-is"], ["NO", "ammo-gauss-rifle-is", 4]]),
  };
}

describe("aerospace Battle Value", () => {
  it("current rules: the Thunderbird of the v4.1 example comes to 1,932 (defensive 678, weapon rating 915)", () => {
    const bv = aeroBattleValue(thunderbird(), catalog);
    expect(bv?.defensive.rating).toBe(678);
    expect(bv?.offensive.weaponRating).toBe(915);
    expect(bv?.total).toBe(1932);
  });

  it("current rules: the Dragau II DropShip of the v4.1 example comes to 14,243, arc by arc", () => {
    const r = newAeroRecord({ id: "d", unitType: "dropship", shape: "aerodyne", use: "military", tons: 2000, safeThrust: 9, year: 3070 }, "tw-tm-so");
    const record: AeroRecord = {
      ...r,
      si: 15,
      armor: { type: "standard", tons: 100, points: { NO: 400, LW: 336, RW: 336, AF: 300 } },
      mounts: mountsOf([
        ...times(2, ["NO", "heavy-gauss-rifle-is"]), ...times(6, ["NO", "heavy-ppc-is"]), ["NO", "ammo-heavy-gauss-rifle-is", 8],
        ...(["LW", "RW"] as const).flatMap((w): Mount[] => [...times(2, [w, "lrm-15-is"]), ...times(2, [w, "artemis-iv-is"]), ...times(2, [w, "er-ppc-is"]), ...times(2, [w, "variable-speed-laser-large-is"]), [w, "ammo-lrm-15-is", 6], ...times(2, [w, "variable-speed-laser-large-is", undefined, true])]),
        ...times(2, ["AF", "variable-speed-laser-large-is"]), ...times(2, ["AF", "er-medium-laser-is"]),
        ...times(6, ["NO", "ams-is"]), ["NO", "ammo-ams-is", 10],
      ]),
    };
    // Heat sink capacity 244, as the example has it.
    record.heatSinks = { type: "single", count: 244 - (craftHeat(record)?.free ?? 0) };
    const bv = aeroBattleValue(record, catalog);
    expect(bv?.defensive.rating).toBe(3762);
    expect(bv?.offensive.weaponRating).toBeCloseTo(4852.1, 6);
    expect(bv?.total).toBe(14243);
  });

  it("AeroTech 2 Revised: the Eisensturm EST-R3 comes to 2,519, as its p. 83 example and its p. 124 table print", () => {
    const bv = aeroBattleValue(eisensturm("aerotech2-revised"), catalog);
    expect(bv?.defensive.rating).toBeCloseTo(751.8, 6);
    expect(bv?.offensive.rating).toBeCloseTo(1766.875, 3);
    expect(bv?.total).toBe(2519);
  });

  it("a capital ship: the Mjolnir's defensive rating in AeroTech 2 Revised (p. 83), and a WarShip's capital factors in the current rules", () => {
    const base = { unitType: "warship" as const, tons: 1350000, safeThrust: 4, year: 3067 };
    const at2r = { ...newAeroRecord({ id: "w", ...base }, "aerotech2-revised"), si: 140, fuelTons: 2376, armor: { type: "ferro-carbide", tons: 3500, points: { NO: 500, FL: 480, FR: 480, AL: 480, AR: 480, AF: 464 } } };
    expect(aeroBattleValue(at2r, catalog)?.defensive.rating).toBe(62156);
    const current = { ...newAeroRecord({ id: "w", ...base }, "tw-tm-so"), si: 140, armor: at2r.armor };
    expect(aeroBattleValue(current, catalog)?.defensive.rating).toBe((2884 * 25 + 140 * 20) * 0.8);
  });

  it("AeroTech (1986) and BattleSpace print no Battle Value or cost: none is shown", () => {
    const at1 = newAeroRecord({ id: "a", unitType: "aerospace-fighter", tons: 50, safeThrust: 5 }, "aerotech-1986");
    expect(aeroBattleValue(at1, catalog)).toBeNull();
    expect(aeroCost(at1, catalog)).toBeNull();
  });

  it("no BattleTech Master Rules overlay row repeats the figure beneath it", () => {
    for (const group of AERO_BV_OVERLAYS) {
      for (const [id, [bv, ammo]] of Object.entries(group.rows)) {
        const entry = bvEntryOf(id);
        expect(bv === undefined || bv !== entry?.bv, id).toBe(true);
        expect(ammo === undefined || ammo !== entry?.ammoBv, id).toBe(true);
      }
    }
  });
});

describe("aerospace cost", () => {
  it("per edition: the Eisensturm costs 17,640,435 in AeroTech 2 Revised (p. 79, ammunition bought) and 17,522,435 by TechManual pp. 283, 285 (none bought)", () => {
    expect(aeroCost(eisensturm("aerotech2-revised"), catalog)?.total).toBe(17640435);
    expect(aeroCost(eisensturm("tw-tm-so"), catalog)?.total).toBe(17522435);
  });
});
