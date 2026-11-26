import { describe, expect, it } from "vitest";
import { WEAPON_BV } from "../data/bv";
import { groupOf, loadCatalog } from "./catalog";

// Alternative munitions of TO:AUE pp. 164-175 and 224-227 added in round 4: id, availability, prototype year, rules level.
describe("autocannon, artillery and fluid munitions (TO:AUE pp. 164-175, 225-227)", () => {
  it.each([
    ["ammo-caseless-ac-is", [{ from: 3079 }], 3056, "experimental", "ammo-ballistic"],
    ["ammo-tracer-ac-clan", [{ from: 2310 }], undefined, "advanced", "ammo-ballistic"],
    ["ammo-air-defense-arrow-is", [{ from: 3080 }], 3068, "experimental", "ammo-artillery"],
    ["ammo-arrow-iv-cluster-is", [{ from: 2620, to: 2830 }, { from: 3047 }], 2594, "advanced", "ammo-artillery"],
    ["ammo-arrow-iv-smoke-clan", [{ from: 2620 }], undefined, "advanced", "ammo-artillery"],
    ["ammo-thunder-active-iv-is", [{ from: 3065 }], 3056, "advanced", "ammo-artillery"],
    ["ammo-flamer-inferno-fuel-clan", [{ from: 2400 }], undefined, "advanced", "ammo-other"],
    ["ammo-copperhead-sniper-is", [{ from: 2645, to: 2825 }, { from: 3051 }], 2640, "advanced", "ammo-artillery"],
  ])("%s has its staged years and level, and sits in the right picker group", async (id, availability, prototypeYear, rulesLevel, group) => {
    const catalog = await loadCatalog();
    const row = catalog.byId(id);
    expect(row).toMatchObject({ kind: "ammunition", tons: 1, slots: 1, availability, rulesLevel });
    expect(row?.prototypeYear).toBe(prototypeYear);
    expect(row && groupOf(row).id).toBe(group);
  });
});

describe("the other bombs and air-launched missiles (TO:AUE pp. 169-172, 226-227, 197)", () => {
  it.each([
    ["bomb-air-to-air-arrow-is", 1, [{ from: 3072 }], 57],
    ["bomb-anti-ship-missile-is", 2, [{ from: 3075 }], 114],
    ["bomb-light-air-to-air-clan", 0.5, [{ from: 3074 }], 17],
    ["bomb-arrow-iv-non-homing-is", 1, [{ from: 2623, to: 2859 }, { from: 3046 }], 34],
    ["bomb-thunder-vibrabomb-is", 1, [{ from: 3065 }], 140],
    ["bomb-torpedo-clan", 1, [{ from: 1950 }], 10],
  ])("%s has its weight, years and Battle Value, and is for aerospace units", async (id, tons, availability, bv) => {
    const row = (await loadCatalog()).byId(id);
    expect(row).toMatchObject({ kind: "weapon", tons, availability, units: ["aero"] });
    expect(WEAPON_BV.flatMap((g) => g.rows).find((r) => r[0] === id)?.[1]).toBe(bv);
  });
});
