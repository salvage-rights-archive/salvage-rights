import { describe, expect, it } from "vitest";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { createCatalog, expand } from "./catalog";
import { conversionCost, roundUpCents, unitCost } from "./cost";
import { mount } from "./fixtures";
import type { MechRecord } from "./mech";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));

/** The MON-66 Mongoose of TechManual's cost example (printed pp.275, 282, 285): 25 tons, standard cockpit, endo steel, standard
 * musculature, a 200 standard fusion engine, a 2-ton gyro, 10 single heat sinks, 5 tons of ferro-fibrous armor, a full
 * set of actuators, a Beagle active probe, three medium lasers and a small laser. */
function mongoose(overrides: Partial<MechRecord> = {}): MechRecord {
  return {
    schema: 1,
    id: "mongoose",
    editionId: "classic",
    name: { chassis: "Mongoose", model: "MON-66" },
    techBase: "inner-sphere",
    year: 2660,
    tons: 25,
    configuration: "biped",
    chassis: {
      engine: { type: "standard", rating: 200 },
      gyro: "standard",
      cockpit: "standard",
      structure: "endo-steel",
      armorType: "ferro-fibrous",
      myomer: "standard",
      heatSinks: { type: "single", count: 10 },
    },
    // 89 points: 89 / (16 x 1.12) = 4.97, which is 5 tons
    armor: {
      HD: { front: 9 },
      CT: { front: 12, rear: 4 },
      LT: { front: 9, rear: 3 },
      RT: { front: 9, rear: 3 },
      LA: { front: 8 },
      RA: { front: 8 },
      LL: { front: 12 },
      RL: { front: 12 },
    },
    mounts: [
      mount("probe", "beagle-active-probe-is", "HD", null),
      mount("ml-1", "medium-laser-is", "RA", null),
      mount("ml-2", "medium-laser-is", "RA", null),
      mount("ml-3", "medium-laser-is", "LA", null),
      mount("sl", "small-laser-is", "LA", null),
    ],
    notes: {},
    ...overrides,
  };
}
const withChassis = (change: Partial<MechRecord["chassis"]>, overrides: Partial<MechRecord> = {}) => {
  const base = mongoose();
  return mongoose({ chassis: { ...base.chassis, ...change }, ...overrides });
};
const line = (record: MechRecord, start: string) => unitCost(record, catalog).lines.find((l) => l.label.startsWith(start))?.cost;

describe("unitCost", () => {
  it("prices the book's Mongoose: structure 1,452,333.333, equipment 331,250, final 2,229,479 rounded up to .01 (TM pp.275, 282, 285)", () => {
    const cost = unitCost(mongoose(), catalog);
    expect(cost.structural).toBeCloseTo(1_452_333.333, 3);
    expect(cost.equipment).toBe(331_250);
    expect(cost.multiplier).toBe(1.25);
    expect(cost.total).toBe(2_229_479.17); // the book prints 2,229,479: its example rounds down, errata v8.0 rounds up to .01
    expect(cost.unpriced).toEqual([]);
    const byLabel = Object.fromEntries(cost.lines.map((l) => [l.label.replace(/ \(.*/, ""), l.cost]));
    expect(byLabel).toMatchObject({
      Cockpit: 200_000,
      "Life support": 50_000,
      Sensors: 50_000,
      Musculature: 50_000,
      "Internal structure": 40_000,
      Actuators: 29_000,
      Gyro: 600_000,
      Armor: 100_000,
      "Heat sinks": 0,
    });
    expect(byLabel["Engine"]).toBeCloseTo(333_333.333, 3);
  });

  it("prices every engine, gyro, structure and armor type the chassis tables have, by the printed cost per ton or rating (TM p.278)", () => {
    // [change to the Mongoose, line start, expected C-bills]; the armor tons are the weight rules' for 89 points (6, 6, 5.5, 5, 4.5)
    const cases: [Partial<MechRecord["chassis"]>, string, number][] = [
      [{ engine: { type: "xl", rating: 200 } }, "Engine", (20_000 * 200 * 25) / 75],
      [{ engine: { type: "light", rating: 200 } }, "Engine", (15_000 * 200 * 25) / 75],
      [{ engine: { type: "compact", rating: 200 } }, "Engine", (10_000 * 200 * 25) / 75],
      [{ gyro: "compact" }, "Gyro", 400_000 * 3], // a 200 engine: 2 x 1.5 = 3 tons
      [{ gyro: "heavy-duty" }, "Gyro", 500_000 * 4],
      [{ gyro: "xl" }, "Gyro", 750_000 * 1],
      [{ structure: "standard" }, "Internal structure", 400 * 25],
      [{ armorType: "standard" }, "Armor", 10_000 * 6],
      [{ armorType: "stealth" }, "Armor", 50_000 * 6],
      [{ armorType: "light-ferro-fibrous" }, "Armor", 15_000 * 5.5],
      [{ armorType: "heavy-ferro-fibrous" }, "Armor", 25_000 * 4.5],
    ];
    for (const [change, start, want] of cases) expect(line(withChassis(change), start), JSON.stringify(change)).toBeCloseTo(want, 3);
  });

  it("charges singles only above the engine's free ten and doubles for every sink (TM p.278)", () => {
    expect(line(withChassis({ heatSinks: { type: "single", count: 12 } }), "Heat sinks")).toBe(4_000);
    expect(line(withChassis({ heatSinks: { type: "double", count: 10 } }), "Heat sinks")).toBe(60_000);
  });

  it("squares the number of jump jets, for standard and for improved (TM p.278)", () => {
    const jets = (id: string, n: number) => mongoose({ mounts: Array.from({ length: n }, (_, i) => mount(`j${i}`, id, "CT", null)) });
    expect(line(jets("jump-jet-is", 4), "Jump jets")).toBe(200 * 16 * 25);
    expect(line(jets("improved-jump-jet-is", 3), "Jump jets")).toBe(500 * 9 * 25);
  });

  it("prices a quad's four legs with a full set of leg actuators each and no arms, as the book's 70-ton quad does (TM p.275)", () => {
    // the book: 4 legs x (150 + 80 + 120) x 70 tons = 98,000
    const quad = mongoose({ configuration: "quad", tons: 70, chassis: { ...mongoose().chassis, engine: { type: "standard", rating: 210 } } });
    expect(line(quad, "Actuators")).toBe(98_000);
  });

  it("leaves out the lower arm and hand actuators a biped's arm does not have", () => {
    const handless = mongoose({ arms: { LA: { lowerArm: true, hand: false }, RA: { lowerArm: false, hand: false } } });
    // left arm 150 x 25, right arm 100 x 25, legs 2 x 350 x 25
    expect(line(handless, "Actuators")).toBe((150 + 100 + 700) * 25);
  });

  it("makes a tripod's structure 1.2 times a biped's and its cockpit 400,000 (IO:AE pp.183, 217)", () => {
    const tripod = mongoose({ configuration: "tripod", tons: 50, chassis: { ...mongoose().chassis, structure: "standard", cockpit: "tripod", engine: { type: "standard", rating: 200 } } });
    expect(line(tripod, "Internal structure")).toBe(24_000); // the book's 50-ton example: 400 x 50 x 1.2
    expect(line(tripod, "Cockpit")).toBe(400_000);
    expect(unitCost(tripod, catalog).notes.join(" ")).toContain("center leg");
  });

  it("adds a Land-Air 'Mech's conversion cost before the final multiplier: 0.75 standard, 0.65 bimodal (IO:AE p.181)", () => {
    expect(conversionCost(0.75, 1_850_000)).toBe(1_387_500); // the book's example
    const plain = unitCost(mongoose(), catalog);
    const lam = unitCost(mongoose({ configuration: "lam" }), catalog);
    const bimodal = unitCost(mongoose({ configuration: "bimodal-lam" }), catalog);
    expect(lam.conversion).toBeCloseTo(0.75 * (plain.structural + plain.equipment), 3);
    expect(bimodal.conversion).toBeCloseTo(0.65 * (plain.structural + plain.equipment), 3);
    expect(lam.total).toBeCloseTo((plain.structural + plain.equipment) * 1.75 * 1.25, 1);
  });

  it("prices MASC at 1,000 x engine rating x its tons, and a hatchet at 5,000 a ton (TM p.278, 292)", () => {
    // 25 tons: MASC is 5 percent rounded, 1 ton; the hatchet is 25 / 15 rounded up, 2 tons
    const record = mongoose({ mounts: [mount("masc", "masc-is", "CT", null), mount("hatchet", "hatchet-is", "RA", null)] });
    const lines = unitCost(record, catalog).lines;
    expect(lines.find((l) => l.label === "masc")?.cost).toBe(1_000 * 200 * 1);
    expect(lines.find((l) => l.label === "hatchet")?.cost).toBe(5_000 * 2);
  });

  it("prices a Clan item at the one price the book prints, and gives ammunition and heat sink mounts no cost of their own", () => {
    const record = mongoose({
      mounts: [
        mount("erml", "er-medium-laser-clan", "RA", null),
        mount("ammo", "ammo-lrm-10-is", "CT", null),
        mount("hs", "heat-sink-is", "LL", null),
      ],
    });
    const cost = unitCost(record, catalog);
    expect(cost.equipment).toBe(80_000);
    expect(cost.unpriced).toEqual([]);
  });

  it("reports a part or item it has no price for, and still prices the rest without throwing", () => {
    // MASC named as the myomer without a MASC mount has no weight to price it by
    const record = withChassis({ engine: { type: "warp", rating: 200 }, armorType: "unobtanium", myomer: "masc" }, { mounts: [mount("x", null, "CT", null), mount("y", "no-such-row", "HD", null), mount("ml", "medium-laser-is", "RA", null)] });
    const cost = unitCost(record, catalog);
    expect(cost.unpriced.map((u) => u.name)).toEqual(expect.arrayContaining(['Engine "warp" 200', 'Armor "unobtanium"', 'Myomer "masc"', "x", "y"]));
    expect(cost.equipment).toBe(40_000);
    expect(cost.total).toBeGreaterThan(0);
  });

  it("prices every catalog item that is not ammunition or a counted heat sink, so nothing in the table is left unpriced", () => {
    const rows = catalog.all().filter((r) => r.kind !== "ammunition" && r.kind !== "heat-sink" && r.id !== "tsm-is" && r.id !== "prototype-triple-strength-myomer-is");
    const record = mongoose({ mounts: rows.map((r) => mount(r.id, r.id, "CT", null)) });
    // The items the book prints no price for: the mechanical jump booster's cost column is a dash (TO:AUE p.217); tracks, environmental sealing and combat-crew seating are in no cost table (TM pp.292-293).
    expect(unitCost(record, catalog).unpriced.map((u) => u.id).sort()).toEqual(["environmental-sealing-clan", "environmental-sealing-is", "mechanical-jump-booster-is", "seating-combat-crew-clan", "seating-combat-crew-is", "tracks-clan", "tracks-is"]);
  });

  it("prices items the later books print: an XXL engine, spikes at 50 x tonnage, a retractable blade, an Enhanced LRM (TO:AUE pp.217-221, TM p.293)", () => {
    const record = withChassis({ engine: { type: "xxl", rating: 200 } }, { mounts: [mount("sp", "spikes-is", "LA", null), mount("rb", "retractable-blade-is", "RA", null), mount("lrm", "enhanced-lrm-5-is", "LT", null)] });
    const cost = unitCost(record, catalog);
    expect(line(record, "Engine")).toBeCloseTo((100_000 * 200 * 25) / 75, 3);
    // 25 tons: spikes 50 x 25; blade 25 / 20 is 1.5 tons, 2 whole tons, so 10,000 + 2 x 10,000
    expect(cost.equipment).toBe(1_250 + 30_000 + 37_500);
    expect(cost.unpriced).toEqual([]);
  });
  it("applies the OmniMech factor only when asked, and rounds the final figure up to the next .01 (TM p.274, errata v8.0)", () => {
    const base = unitCost(mongoose(), catalog, { omni: false });
    const omni = unitCost(mongoose(), catalog, { omni: true });
    expect(omni.multiplier).toBe(1.25 * 1.25);
    expect(omni.total).toBeCloseTo(base.total * 1.25, 1);
    expect(roundUpCents(10.001)).toBe(10.01);
    expect(roundUpCents(10.01)).toBe(10.01);
  });

  it("notes a Clan part priced from the Inner Sphere entry instead of presenting it as printed", () => {
    const cost = unitCost(withChassis({ structure: "endo-steel-clan" }), catalog);
    expect(cost.notes.some((n) => n.includes("endo-steel-clan"))).toBe(true);
  });
});
