import { describe, expect, it } from "vitest";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { battleValue } from "./bv";
import { createCatalog, expand } from "./catalog";
import { runChecks } from "./checks";
import { unitCost } from "./cost";
import { editRecord, layout, maxArmor, newRecord, structurePoints, weights } from "./mech";
import type { MechRecord, Mount } from "./mech";
import { levelItems } from "./levels";
import { partAvailable } from "./availability";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));

// The worked example of IO:AE printed pp.155-157: a 150-ton superheavy BattleMech with an XL engine rated 300 (walks 2), endo steel structure,
// the superheavy gyro and cockpit, and 27 tons of standard armor.
const omega = (patch: Partial<MechRecord> = {}): MechRecord => {
  const record = newRecord({ chassis: "Omega", model: "SHP-4X", tons: 150, walk: 2, techBase: "inner-sphere", configuration: "biped", year: 3080, rulesLevel: "advanced" }, "classic", "omega");
  record.chassis.engine = { type: "xl", rating: 300 };
  record.chassis.structure = "endo-steel";
  record.armor = { HD: { front: 12 }, CT: { front: 60, rear: 20 }, LT: { front: 45, rear: 19 }, RT: { front: 45, rear: 19 }, LA: { front: 44 }, RA: { front: 44 }, LL: { front: 62 }, RL: { front: 62 } };
  return { ...record, ...patch };
};
const lines = (record: MechRecord) => Object.fromEntries(weights(record, catalog.factsOf).lines.map((l) => [l.label, l.tons]));
const mountAt = (id: string, equipmentId: string, location: Mount["location"], slot: number): Mount => ({ id, equipmentId, name: id, techBase: "inner-sphere", location, slot });

describe("a superheavy 'Mech", () => {
  it("weighs its parts as the book's example does: structure 15, engine 9.5, gyro 6, cockpit 4, armor 27", () => {
    expect(lines(omega())).toMatchObject({ Structure: 15, Engine: 9.5, Gyro: 6, Cockpit: 4, Armor: 27 });
  });

  it("has the example's structure points, a head of 4, and a head that carries 12 armor", () => {
    const points = structurePoints(omega());
    expect(points).toMatchObject({ HD: 4, CT: 45, LT: 32, RT: 32, LA: 25, RA: 25, LL: 32, RL: 32 });
    expect(maxArmor(omega()).HD).toBe(12);
  });

  it("takes half the cells for its structure, engine and equipment, as the example lays them out", () => {
    const record = omega();
    record.mounts = [mountAt("lb", "lb-10-x-ac-is", "LA", 4)];
    const laid = layout(record, catalog.factsOf);
    expect(laid.partSlots.find((p) => p.part === "structure")?.needed).toBe(7);
    expect(laid.slots.LT?.filter((c) => c.label === "XL Fusion Engine")).toHaveLength(2);
    expect(laid.slots.CT?.filter((c) => c.label === "XL Fusion Engine")).toHaveLength(3);
    expect(laid.slots.CT?.filter((c) => c.label === "Superheavy Gyro")).toHaveLength(2);
    expect(laid.slots.LA?.filter((c) => c.kind === "mount")).toHaveLength(3); // 6 slots on a standard 'Mech; the book example gives it 3
  });

  it("holds two single heat sinks in a cell, and a third in the same cell is a clash", () => {
    const sink = (n: number) => mountAt(`hs-${n}`, "heat-sink-is", "LT", 5);
    const two = editRecord(omega(), (d) => void (d.mounts = [sink(1), sink(2)]));
    expect(layout(two, catalog.factsOf).conflicts).toEqual([]);
    const three = editRecord(omega(), (d) => void (d.mounts = [sink(1), sink(2), sink(3)]));
    expect(layout(three, catalog.factsOf).conflicts).toHaveLength(1);
  });

  it("is checked: Inner Sphere only, weights of 105 to 200, no jump jets, the superheavy gyro and cockpit", () => {
    const messages = (record: MechRecord) => runChecks(record, catalog).filter((f) => f.level === "error").map((f) => f.message);
    expect(messages(omega()).filter((m) => /superheavy|weighs/i.test(m))).toEqual([]);
    expect(messages(editRecord(omega(), (d) => void (d.tons = 102))).some((m) => m.includes("105 to 200 tons as a superheavy"))).toBe(true);
    expect(messages(editRecord(omega(), (d) => void (d.techBase = "clan"))).some((m) => m.includes("Inner Sphere technology only"))).toBe(true);
    expect(messages(editRecord(omega(), (d) => void d.mounts.push(mountAt("jj", "jump-jet-is", "LL", 0)))).some((m) => m.includes("cannot be mounted on a superheavy"))).toBe(true);
    expect(messages(editRecord(omega(), (d) => void (d.chassis.gyro = "standard"))).some((m) => m.includes("Gyro") || m.includes("gyro"))).toBe(true);
    expect(messages(editRecord(omega(), (d) => void (d.chassis.cockpit = "standard"))).some((m) => m.includes("must mount the Superheavy cockpit"))).toBe(true);
  });

  it("needs Advanced rules, and its years (a BattleMech from 3078, prototype 3077)", () => {
    expect(levelItems(omega(), catalog).find((i) => i.name === "Superheavy 'Mech")?.level).toBe("advanced");
    const early = runChecks(editRecord(omega(), (d) => void (d.year = 3070)), catalog);
    expect(early.some((f) => f.check === "superheavy" && f.message.includes("not available in 3070"))).toBe(true);
  });

  it("offers only the parts its rules name: the superheavy gyro, not a standard one or an XL one", () => {
    const subject = { ...omega(), tons: 150 };
    expect(partAvailable("gyro", "superheavy", subject)).toBe(true);
    expect(partAvailable("gyro", "standard", subject)).toBe(false);
    expect(partAvailable("cockpit", "superheavy", subject)).toBe(true);
    expect(partAvailable("cockpit", "standard", subject)).toBe(false);
    expect(partAvailable("structure", "endo-steel", subject)).toBe(true);
    expect(partAvailable("structure", "reinforced", subject)).toBe(false);
    expect(partAvailable("gyro", "superheavy", { ...subject, tons: 100 })).toBe(false);
  });

  it("costs its structure, musculature and actuators by the superheavy formulas (printed p.183: 16,000 x 145 for endo steel)", () => {
    const record = editRecord(omega(), (d) => {
      d.tons = 145;
      d.chassis.engine = { type: "xl", rating: 290 };
    });
    const cost = unitCost(record, catalog);
    expect(cost.lines.find((l) => l.label === "Internal structure (endo-steel)")?.cost).toBe(2_320_000);
    expect(cost.lines.find((l) => l.label === "Musculature")?.cost).toBe(12_000 * 145);
    // the upper arm actuator alone is 200 x 145 = 29,000 on a superheavy 'Mech; the whole set for two arms and two legs is twice the standard
    expect(cost.lines.find((l) => l.label === "Actuators")?.cost).toBe(2 * 145 * (2 * (100 + 50 + 80) + 2 * (150 + 80 + 120)));
  });

  it("counts a superheavy engine by its own table and the gyro as a standard one", () => {
    const bv = battleValue(omega(), catalog);
    // 150 tons x 0.5 for the gyro; the 227 structure points x 1.5 x the superheavy XL modifier 0.75 (an Inner Sphere XL on a standard 'Mech is 0.5)
    expect(bv.defensive.gyro).toBe(75);
    expect(bv.defensive.structure).toBeCloseTo(227 * 1.5 * 0.75, 3);
  });
});

describe("a superheavy IndustrialMech and Mordel's prototype names", () => {
  it("takes the superheavy gyro and cockpit without a unit-type error, which an IndustrialMech's own parts list would refuse", () => {
    const record = newRecord({ chassis: "Digger", model: "SD-1", tons: 200, walk: 1, techBase: "inner-sphere", configuration: "biped", year: 3080, rulesLevel: "advanced", unitType: "industrialmech" }, "classic", "im");
    expect(record.chassis).toMatchObject({ gyro: "superheavy", cockpit: "superheavy-industrial", structure: "industrial" });
    expect(runChecks(record, catalog).filter((f) => f.check === "unit-type" && f.level === "error").map((f) => f.message)).toEqual([]);
  });

  it("matches Mordel's 'PPC (Prototype)' to the primitive prototype PPC", () => {
    expect(catalog.match("PPC (Prototype)", "inner-sphere")?.id).toBe("primitive-prototype-ppc-is");
  });
});
