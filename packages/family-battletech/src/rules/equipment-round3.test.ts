import { describe, expect, it } from "vitest";
import { COCKPITS } from "../data/chassis";
import { COCKPIT_COST } from "../data/cost";
import { loadCatalog, mountableOn } from "./catalog";
import { isCapitalRow } from "./aero";

// Items added in round 3 (IO:AE and TO:AUE tables): id, tech base, tons, slots, availability, prototype year.
describe("TO:AUE sub-capital weapons, cruise missiles and heavy equipment (pp. 216-223)", () => {
  it.each([
    ["light-scc-is", 200, 3073, { slots: 30 }],
    ["scl-3-is", 250, 3073, { slots: 32 }],
    ["piranha-is", 100, 3072, { slots: 18 }],
    ["manta-ray-clan", 160, 3073, { slots: 38 }],
    ["cruise-missile-90-is", 100, 3065, { slots: 1, note: "Support vehicle: 45 slots" }],
    ["mobile-hpg-is", 50, 2655, { slots: 50 }],
    ["vtol-jet-booster-clan", "vtol-booster-tons", 2839, undefined],
  ])("%s has its printed weight and year, and keeps the support vehicle slot figure in `by`", async (id, tons, from, vehicle) => {
    const row = (await loadCatalog()).byId(id);
    expect(row?.tons).toBe(tons);
    expect(row?.availability[0]?.from).toBe(from);
    expect(row?.by?.vehicle).toMatchObject(vehicle ?? {});
  });
});

describe("IO:AE large-craft items (pp. 210-215)", () => {
  it.each([
    ["dropshuttle-bay-is", 11000, [{ from: 2120, to: 2500 }], "advanced"],
    ["docking-collar-post-boom-is", 1000, [{ from: 2470 }], "advanced"],
    ["sldf-sds-jammer-system-is", 30000, [{ from: 2776, to: 2780 }], "experimental"],
    ["dragons-breath-launch-system-is", 5000, [{ from: 3077, to: 3078 }], "experimental"],
  ])("%s has its printed weight, years and level", async (id, tons, availability, rulesLevel) => {
    expect((await loadCatalog()).byId(id)).toMatchObject({ tons, availability, rulesLevel, slots: 0 });
  });
});

describe("IO:AE cockpit and pilot-interface items (pp. 62-64, 110, 212-213)", () => {
  it.each([
    ["damage-interrupt-circuit-is", "inner-sphere", 0, 0, [{ from: 3055, to: 3060 }], undefined],
    ["direct-neural-interface-modification-is", "inner-sphere", 0, 0, [{ from: 3055 }], 3052],
    ["sldf-advanced-neurohelmet-fighter-is", "inner-sphere", 0, 0, [{ from: 2761, to: 2770 }], 2758],
    ["enhanced-imaging-interface-clan", "clan", 0, 0, [{ from: 3048 }], undefined],
    ["battlemech-neural-interface-unit-clan", "clan", 0.1, 2, [{ from: 3083 }], undefined],
  ])("%s has its printed figures", async (id, techBase, tons, slots, availability, prototypeYear) => {
    const row = (await loadCatalog()).byId(id);
    expect(row).toMatchObject({ techBase, tons, slots, availability, rulesLevel: "experimental" });
    expect(row?.prototypeYear).toBe(prototypeYear);
  });

  it("the virtual reality piloting pod is a 3-ton torso cockpit priced at 1,250,000", () => {
    expect(COCKPITS.types.vrpp).toMatchObject({ tons: 3, availability: [{ from: 3052, to: 3055 }], elsewhere: { CT: ["Cockpit", "Life Support"] } });
    expect(COCKPIT_COST.rows.vrpp?.cost).toBe(1_250_000);
  });
});

describe("units the table does not offer (TO:AUE pp. 216-223)", () => {
  it("items whose combat vehicle column is NA are not offered to combat vehicles, and only sub-capital weapons count as capital", async () => {
    const catalog = await loadCatalog();
    for (const id of ["light-scc-is", "scl-2-is", "piranha-clan", "mobile-hpg-is", "small-ncss-is", "space-mine-dispenser-is"]) expect(mountableOn(catalog.byId(id)!, "vehicle")).toBe(false);
    expect([isCapitalRow(catalog.byId("scl-2-is")), isCapitalRow(catalog.byId("cruise-missile-70-is"))]).toEqual([true, false]);
  });
});
