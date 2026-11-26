import { describe, expect, it } from "vitest";
import { COCKPITS } from "../data/chassis";
import { COCKPIT_COST } from "../data/cost";
import { loadCatalog } from "./catalog";

// Items added in round 3 (IO:AE and TO:AUE tables): id, tech base, tons, slots, availability, prototype year.
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
