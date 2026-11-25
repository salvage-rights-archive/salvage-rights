import { describe, expect, it } from "vitest";
import { CASE_ROWS, EQUIPMENT_BV, LAM_BV, UNLISTED_IS_ZERO, WEAPON_BV } from "../data/bv";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { battleValue, skillMultiplier, speedFactor } from "./bv";
import { createCatalog, expand } from "./catalog";
import { bipedRecord, mount } from "./fixtures";
import type { LocationCode, MechRecord, Mount } from "./mech";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));

let n = 0;
/** A mount of a catalog row; the placement does not matter to Battle Value, only the location does. */
const m = (equipmentId: string, location: LocationCode | null = "CT", extra: Partial<Mount> = {}): Mount => ({
  ...mount(`m${(n += 1)}`, equipmentId, location, null),
  name: equipmentId,
  techBase: equipmentId.endsWith("-clan") ? "clan" : "inner-sphere",
  ...extra,
});
const many = (count: number, id: string, location: LocationCode | null = "CT") => Array.from({ length: count }, () => m(id, location));
const spread = (...points: number[]): MechRecord["armor"] => {
  const locations: LocationCode[] = ["HD", "CT", "LT", "RT", "LA", "RA", "LL", "RL"];
  return Object.fromEntries(locations.map((l, i) => [l, { front: points[i] ?? 0 }]));
};
/** The fixture biped, 50 tons walking 4, with its equipment replaced. */
const biped = (mounts: Mount[], patch: Partial<MechRecord> = {}) => bipedRecord({ mounts, ...patch });

describe("worked examples from the book (TechManual Battle Value v4.1, pp. 304-305)", () => {
  // MON-66 Mongoose: 25 tons, 89 points of ferro-fibrous armor, 43 points of endo steel, 10 single heat sinks, walks 8.
  const mongoose = bipedRecord({
    tons: 25,
    chassis: { engine: { type: "standard", rating: 200 }, gyro: "standard", cockpit: "standard", structure: "endo-steel", armorType: "ferro-fibrous", myomer: "standard", heatSinks: { type: "single", count: 10 } },
    armor: spread(9, 20, 14, 14, 8, 8, 8, 8),
    mounts: [...many(3, "medium-laser-is", "RA"), m("small-laser-is", "LA"), m("beagle-active-probe-is", "HD")],
  });

  it("the Mongoose is 758: defensive 433.3, weapon rating 172, speed factor 1.89", () => {
    const bv = battleValue(mongoose, catalog);
    expect(bv.defensive.subtotal).toBe(309.5);
    expect(bv.defensive.rating).toBe(433.3);
    expect(bv.offensive.heatEfficiency).toBe(14);
    expect(bv.offensive.weaponRating).toBe(172);
    expect(bv.offensive.speedFactor).toBe(1.89);
    expect(bv.baseBv).toBe(758);
    expect(bv.complete).toBe(true);
  });

  // TDR-10SE Thunderbolt: 65 tons walking 4, MASC, jump 4, 12 double heat sinks, targeting computer, endo steel, 200 armor.
  const thunderbolt = bipedRecord({
    tons: 65,
    chassis: { engine: { type: "standard", rating: 260 }, gyro: "standard", cockpit: "standard", structure: "endo-steel", armorType: "standard", myomer: "standard", heatSinks: { type: "double", count: 12 } },
    armor: spread(9, 40, 30, 30, 20, 20, 25, 26),
    mounts: [
      m("er-ppc-is", "RA"), ...many(3, "er-medium-laser-is", "LA"), m("lrm-10-is", "LT"), m("ammo-lrm-10-is", "LT"),
      m("guardian-ecm-suite-is", "HD"), m("masc-is", "RT"), m("targeting-computer-is", "RT"), ...many(4, "jump-jet-is", "LL"),
    ],
  });

  it("the Thunderbolt's defensive rating is 954.85 and its weapons are halved after the heat runs out", () => {
    const bv = battleValue(thunderbolt, catalog);
    expect(bv.defensive.explosiveAmmo).toBe(15);
    expect(bv.defensive.subtotal).toBe(734.5);
    expect(bv.defensive.targetModifier).toBe(3);
    expect(bv.defensive.rating).toBe(954.85);
    expect(bv.offensive.heatEfficiency).toBe(26);
    expect(bv.offensive.totalWeaponHeat).toBe(34);
    expect(bv.offensive.speedFactor).toBe(1.63);
    const halved = bv.offensive.weapons.filter((w) => w.counted === "half");
    expect(halved.map((w) => w.modifiedBv)).toEqual([77.5]);
  });

  it("the Thunderbolt's weapon rating is the printed 646 plus the computer's own 103.75, which the printed example leaves out", () => {
    // Table note E gives a targeting computer a BV of 25 percent of its linked weapons (229 + 3 x 62 = 415); the example's 646 omits it.
    const bv = battleValue(thunderbolt, catalog);
    expect(bv.offensive.equipment).toBe(103.75);
    expect(bv.offensive.weaponRating - bv.offensive.equipment).toBe(646);
  });
});

describe("Land-Air 'Mech and tripod (Interstellar Operations: Alternate Eras pp. 186, 188)", () => {
  // The Phoenix Hawk LAM's defensive side: 128 armor, 83 structure, 50 tons, jump 5 (AirMech flank 23), one fuel slot.
  const lam = bipedRecord({
    configuration: "lam",
    tons: 50,
    chassis: { engine: { type: "standard", rating: 250 }, gyro: "standard", cockpit: "standard", structure: "standard", armorType: "standard", myomer: "standard", heatSinks: { type: "single", count: 12 } },
    armor: spread(9, 30, 20, 20, 14, 14, 10, 11),
    mounts: [...many(5, "jump-jet-is", "LL"), m("lam-fuel-is", "CT")],
  });

  it("a standard LAM uses AirMech flank for its target modifier, counts fuel as explosive and adds 9 to Heat Efficiency", () => {
    const bv = battleValue(lam, catalog);
    expect(bv.defensive.explosiveAmmo).toBe(15);
    // The printed example gives the gyro as 55 x 0.5 = 27.5 for this 50-ton 'Mech; 50 x 0.5 = 25 here, so 454.5 where the book has 457 (and 727.2 where it has 731.2).
    expect(bv.defensive.subtotal).toBe(454.5);
    expect(bv.defensive.targetModifier).toBe(6);
    expect(bv.defensive.rating).toBe(727.2);
    expect(bv.offensive.heatEfficiency).toBe(13); // 9 + 12 - 8 (flank 23 / 3)
    expect(bv.offensive.speedMP).toBe(20); // run 8 + half of flank 23, rounded normally
    expect(bv.offensive.speedFactor).toBe(3);
  });

  it("a bimodal LAM is treated as a normal 'Mech for movement", () => {
    const bv = battleValue({ ...lam, configuration: "bimodal-lam" }, catalog);
    expect(bv.defensive.targetModifier).toBe(3); // jump 5: +2, plus 1 for jumping; running 8: +3
    expect(bv.offensive.speedMP).toBe(11); // run 8 + half of jump 5 rounded up
  });

  it("a tripod is a biped with the third leg's structure counted", () => {
    const base = battleValue(biped([]), catalog).defensive.structure;
    const tripod = battleValue(biped([], { configuration: "tripod" }), catalog).defensive.structure;
    expect(tripod - base).toBe(12 * 1.5);
  });
});

describe("the method's rules", () => {
  it("explosive ammunition costs 15 a slot where the book says it is exposed", () => {
    const cases: [string, Partial<MechRecord>, LocationCode, string[], number][] = [
      ["center torso, standard engine", {}, "CT", [], 15],
      ["side torso without CASE", {}, "LT", [], 15],
      ["side torso with CASE", {}, "LT", ["LT"], 0],
      ["arm with CASE in the arm only", {}, "LA", ["LA"], 15],
      ["arm with CASE in the arm and the torso", {}, "LA", ["LA", "LT"], 0],
      ["leg, even with CASE", {}, "LL", ["LL"], 15],
      ["Inner Sphere XL engine, CASE does not help", { chassis: { ...bipedRecord().chassis, engine: { type: "xl", rating: 200 } } }, "LT", ["LT"], 15],
      ["Clan 'Mech, side torso", { techBase: "clan" }, "LT", [], 0],
      ["Clan 'Mech, center torso", { techBase: "clan" }, "CT", [], 15],
    ];
    for (const [label, patch, loc, protectedBy, expected] of cases) {
      const mounts = [m("ammo-ac-5-is", loc), ...protectedBy.map((l) => m("case-is", l as LocationCode))];
      expect(battleValue(biped(mounts, patch), catalog).defensive.explosiveAmmo, label).toBe(expected);
    }
  });

  it("prototype CASE leaves 8 points on a protected ammunition slot", () => {
    expect(battleValue(biped([m("ammo-ac-5-is", "LT"), m("prototype-case-is", "LT")]), catalog).defensive.explosiveAmmo).toBe(8);
  });

  it("Gauss weapons cost one point a slot, but the Gauss ammunition is not explosive", () => {
    const bv = battleValue(biped([m("gauss-rifle-is", "RT"), m("ammo-gauss-rifle-is", "RT")]), catalog);
    expect(bv.defensive.explosiveAmmo).toBe(7);
  });

  it("ammunition counts up to the BV of its weapons and no more", () => {
    const bv = battleValue(biped([m("ac-2-is", "RA"), ...many(10, "ammo-ac-2-is", "RT")]), catalog);
    expect(bv.offensive.ammunition).toBe(37);
  });

  it("rear-firing weapons count half, or the forward ones do when they are worth less", () => {
    const rear = battleValue(biped([m("medium-laser-is", "LT"), m("medium-laser-is", "CT", { rear: true })]), catalog);
    expect(rear.offensive.weapons.map((w) => w.modifiedBv).sort()).toEqual([23, 46]);
    const flipped = battleValue(biped([m("small-laser-is", "LT"), m("medium-laser-is", "CT", { rear: true })]), catalog);
    expect(flipped.offensive.weapons.find((w) => w.name === "small-laser-is")?.modifiedBv).toBe(4.5);
  });

  it("Artemis IV adds 20 percent to its launcher and not to the ammunition", () => {
    const launcher = m("lrm-10-is", "LT");
    const bv = battleValue(biped([launcher, m("artemis-iv-is", "LT", { linkedTo: launcher.id }), m("ammo-lrm-10-is", "LT")]), catalog);
    expect(bv.offensive.weapons[0]?.modifiedBv).toBe(108);
    expect(bv.offensive.ammunition).toBe(11);
  });

  it("stealth armor adds 10 to movement heat and 2 to the target modifier", () => {
    const plain = battleValue(biped([]), catalog);
    const stealth = battleValue(biped([], { chassis: { ...bipedRecord().chassis, armorType: "stealth" } }), catalog);
    expect(stealth.offensive.movementHeat - plain.offensive.movementHeat).toBe(10);
    expect(stealth.defensive.targetModifier - plain.defensive.targetModifier).toBe(2);
  });

  it("triple-strength myomer multiplies tonnage by 1.5 and adds 2 to the walking speed", () => {
    const bv = battleValue(biped([m("tsm-is", "LT")]), catalog);
    expect(bv.offensive.tonnage).toBe(75);
    expect(bv.offensive.runMP).toBe(9); // walk 4 + 2, times 1.5
  });

  it("a small cockpit takes 5 percent off the total", () => {
    const plain = battleValue(biped([m("medium-laser-is", "RA")]), catalog).baseBv;
    const small = battleValue(biped([m("medium-laser-is", "RA")], { chassis: { ...bipedRecord().chassis, cockpit: "small" } }), catalog).baseBv;
    expect(small).toBe(Math.floor(plain * 0.95 + 0.5));
  });

  it("the speed factor follows the table and then the formula", () => {
    const rows: [number, number][] = [[0, 0.44], [12, 1.89], [25, 3.74], [26, 3.89]];
    for (const [mp, expected] of rows) expect(speedFactor(mp), `${mp} MP`).toBe(expected);
  });

  it("the pilot's skills multiply the rounded Battle Value", () => {
    const rows: [number, number, number][] = [[4, 5, 1], [4, 4, 1.1], [3, 4, 1.32], [5, 6, 0.86], [0, 0, 2.42]];
    for (const [gunnery, piloting, expected] of rows) expect(skillMultiplier({ gunnery, piloting })).toBe(expected);
    const base = battleValue(biped([m("medium-laser-is", "RA")]), catalog);
    expect(battleValue(biped([m("medium-laser-is", "RA")]), catalog, { gunnery: 3, piloting: 4 }).total).toBe(Math.floor(base.baseBv * 1.32 + 0.5));
  });
});

describe("what the book does not print", () => {
  it("is reported and left out, never thrown over or guessed", () => {
    const bv = battleValue(biped([m("medium-laser-is", "RA"), m("vehicular-mine-dispenser-is", "LT"), { ...m("x", null), equipmentId: null, name: "Frobnicator" }, m("ammo-inferno-is", "LT")], { chassis: { ...bipedRecord().chassis, gyro: "mystery" } }), catalog);
    expect(bv.complete).toBe(false);
    expect(bv.unvalued.map((u) => u.name).sort()).toEqual(["Frobnicator", "gyro type \"mystery\"", "vehicular-mine-dispenser-is"]);
    expect(bv.zeroByRule.map((u) => u.name)).toEqual(["ammo-inferno-is"]);
    expect(bv.offensive.weapons).toHaveLength(1);
  });
});

describe("the tables", () => {
  it("name only catalog rows (weapons, equipment and their ammunition)", () => {
    const ids = new Set(catalog.all().map((r) => r.id));
    const named = [...WEAPON_BV, ...EQUIPMENT_BV].flatMap((g) => g.rows.flatMap(([id, , , o]) => [id, ...(o?.ammo ?? [])]));
    expect(named.filter((id) => !ids.has(id))).toEqual([]);
  });
});
describe("Tactical Operations equipment", () => {
  it("a PPC with a capacitor is worth the table's pair BV and runs 5 hotter", () => {
    const ppc = m("er-ppc-is", "RA");
    const bv = battleValue(biped([ppc, m("ppc-capacitor-is", "RA", { linkedTo: ppc.id })]), catalog);
    expect(bv.offensive.weapons[0]).toMatchObject({ unmodifiedBv: 343, heat: 20 });
  });

  it("a laser insulator takes 1 off its laser's heat, and coolant pods add heat capacity but cost defensive points", () => {
    const laser = m("er-large-laser-is", "RA");
    expect(battleValue(biped([laser, m("laser-insulator-is", "RA", { linkedTo: laser.id })]), catalog).offensive.weapons[0]?.heat).toBe(11);
    const plain = battleValue(biped([]), catalog);
    const pods = battleValue(biped(many(5, "coolant-pod-is", "LT")), catalog);
    expect(pods.offensive.heatEfficiency - plain.offensive.heatEfficiency).toBe(10); // 10 sinks x 5 pods / 5
    expect(pods.defensive.explosiveAmmo).toBe(5);
  });

  it("the chain whip is its fixed damage times 1.725, whatever the 'Mech weighs", () => {
    expect(battleValue(biped([m("chain-whip-is", "RA")]), catalog).offensive.equipment).toBe(5.175);
  });

  it("every catalog row is valued, counted 0 by the book's rule, or one the books leave open", () => {
    const known = new Set<string>();
    for (const g of [...WEAPON_BV, ...EQUIPMENT_BV]) for (const [id, , a, o] of g.rows) { known.add(id); if (a !== undefined) for (const x of o?.ammo ?? [`ammo-${id}`]) known.add(x); }
    const open = catalog.all().filter((r) => !known.has(r.id) && !UNLISTED_IS_ZERO.books.includes(r.cite.book) && !["heat-sink", "jump-jet"].includes(r.kind) && !LAM_BV.fuelSlotIds.includes(r.id) && !(r.id in CASE_ROWS));
    expect(open.map((r) => r.id)).toEqual([]);
  });
});
