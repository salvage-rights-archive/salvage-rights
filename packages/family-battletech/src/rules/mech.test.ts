import { describe, expect, it } from "vitest";
import { STRUCTURE_TYPES } from "../data/chassis";
import { bipedRecord, factsOf, lamRecord, mount, quadRecord, tripodRecord } from "./fixtures";
import {
  allocateArmor,
  armorPointsForTons,
  armsOf,
  editRecord,
  newRecord,
  partMountBase,
  setConfiguration,
  layout,
  maxArmor,
  structurePoints,
  structureTons,
  walkMP,
  weights,
  type FactsOf,
  type LocationCode,
  type MechRecord,
  type Mount,
} from "./mech";

const labels = (l: ReturnType<typeof layout>, loc: LocationCode) => (l.slots[loc] ?? []).map((c) => c.label);
const chassis = (patch: Partial<MechRecord["chassis"]>, rest: Partial<MechRecord> = {}) => {
  const base = bipedRecord();
  return bipedRecord({ mounts: [], chassis: { ...base.chassis, ...patch }, ...rest });
};
const line = (record: MechRecord, label: string) => weights(record, factsOf).lines.find((l) => l.label === label)?.tons;

describe("layout", () => {
  it("sizes a biped, labels the fixed cells and puts each mount in the cell its slot says", () => {
    const l = layout(bipedRecord(), factsOf);
    expect(l.supported).toBe(true);
    expect(l.locations).toEqual(["HD", "CT", "LT", "RT", "LA", "RA", "LL", "RL"]);
    // The book counts six slots in the head and legs and twelve elsewhere.
    expect(Object.fromEntries(l.locations.map((loc) => [loc, l.slots[loc]?.length]))).toEqual({
      HD: 6, CT: 12, LT: 12, RT: 12, LA: 12, RA: 12, LL: 6, RL: 6,
    });
    expect(labels(l, "HD")).toEqual(["Life Support", "Sensors", "Cockpit", "", "Sensors", "Life Support"]);
    expect(labels(l, "CT").slice(0, 10)).toEqual([...Array(3).fill("Fusion Engine"), ...Array(4).fill("Gyro"), ...Array(3).fill("Fusion Engine")]);
    expect(labels(l, "LA").slice(0, 4)).toEqual(["Shoulder", "Upper Arm Actuator", "Lower Arm Actuator", "Hand Actuator"]);
    expect(l.slots.RT?.slice(0, 8).map((c) => c.mountId)).toEqual(["ac", "ac", "ac", "ac", "ac", "ac", "ac", undefined]);
    expect(l.slots.LA?.[4]).toMatchObject({ kind: "mount", mountId: "laser-l" });
    expect(l.slots.LA?.[5]?.kind).toBe("empty");
    expect([l.unplaced, l.conflicts, l.overflow]).toEqual([[], [], []]);
    expect(layout(quadRecord(), factsOf).locations).toEqual(["HD", "CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"]);
  });

  // The positions Catalyst's record sheets print. Center torso: E engine, G gyro, . free (slots 1-12); the side torsos
  // start with the given number of engine cells.
  it.each<[string, string, string, string, string, number]>([
    ["standard", "standard", "Fusion Engine", "Gyro", "EEEGGGGEEE..", 0],
    ["xl", "standard", "XL Fusion Engine", "Gyro", "EEEGGGGEEE..", 3],
    ["xl-clan", "standard", "XL Fusion Engine", "Gyro", "EEEGGGGEEE..", 2],
    ["light", "heavy-duty", "Light Fusion Engine", "Heavy Duty Gyro", "EEEGGGGEEE..", 2],
    ["compact", "standard", "Compact Fusion Engine", "Gyro", "EEEGGGG.....", 0],
    ["standard", "compact", "Fusion Engine", "Compact Gyro", "EEEGGEEE....", 0],
    ["light", "xl", "Light Fusion Engine", "XL Gyro", "EEEGGGGGGEEE", 2],
  ])("places a %s engine and a %s gyro as the sheets do", (engine, gyro, engineLabel, gyroLabel, ct, side) => {
    const l = layout(chassis({ engine: { type: engine, rating: 200 }, gyro }), factsOf);
    const spell = (c: string) => (c === "E" ? engineLabel : c === "G" ? gyroLabel : "");
    expect(labels(l, "CT")).toEqual([...ct].map(spell));
    const sideTorso = [...Array<string>(side).fill(engineLabel), ...Array<string>(12 - side).fill("")];
    expect([labels(l, "LT"), labels(l, "RT")]).toEqual([sideTorso, sideTorso]);
  });

  it("reports clashing mounts as conflicts and a mount running past the last slot as overflow, keeping them all", () => {
    const record = bipedRecord({
      mounts: [
        mount("a", "medium-laser", "LA", 5),
        mount("b", "medium-laser", "LA", 5),
        mount("c", "medium-laser", "LA", 0), // on a fixed cell
        mount("big", "big-gun", "RA", 6),
        mount("edge", "ac-10", "LL", 4),
        mount("fits", "ac-10", "RT", 5),
      ],
    });
    const l = layout(record, factsOf);
    expect(l.conflicts).toEqual([
      { location: "LA", slot: 0, mountIds: ["c"] },
      { location: "LA", slot: 5, mountIds: ["a", "b"] },
    ]);
    expect(l.overflow).toEqual([
      { location: "RA", mountId: "big" },
      { location: "LL", mountId: "edge" },
    ]);
    expect(record.mounts).toHaveLength(6);
  });

  // Hostile mounts: none may throw; a bad place means unplaced, and a slot far past the end means overflow.
  it.each<[string, Mount["location"], number, "unplaced" | "overflow"]>([
    ["a negative slot", "LA", -1, "unplaced"],
    ["a fractional slot", "LA", 2.5, "unplaced"],
    ["a huge slot", "LA", 1e9, "overflow"],
    ["a location the configuration lacks", "FLL", 4, "unplaced"],
    ["a location named like an object property", "constructor" as Mount["location"], 4, "unplaced"],
  ])("copes with %s", (_name, location, slot, where) => {
    const l = layout(bipedRecord({ mounts: [mount("odd", "medium-laser", location, slot)] }), factsOf);
    expect(l.unplaced.map((m) => m.id)).toEqual(where === "unplaced" ? ["odd"] : []);
    expect(l.overflow.map((o) => o.mountId)).toEqual(where === "overflow" ? ["odd"] : []);
    expect(l.slots.LA).toHaveLength(12);
  });

  it("lists mounts that take slots but have no slot as unplaced, and not zero-slot items", () => {
    const facts: FactsOf = (m, r) => (m.id === "zero" ? { tons: 0, slots: 0 } : factsOf(m, r));
    const record = bipedRecord({
      mounts: [mount("loose", "ac-10", null, null), mount("zero", "ac-10", null, null), mount("unknown", null, null, null)],
    });
    expect(layout(record, facts).unplaced.map((m) => m.id)).toEqual(["loose", "unknown"]);
  });

  it("counts the slots a structure type needs and the part mounts present", () => {
    const part = (id: string, slot: number) => ({ ...mount(id, null, "LT", slot), part: "structure" as const });
    const record = chassis({ structure: "endo-steel" }, { mounts: [part("e1", 3), part("e2", 4), part("e3", 5)] });
    const l = layout(record, factsOf);
    expect(l.partSlots).toContainEqual({ part: "structure", needed: 14, present: 3 });
    expect(l.partSlots).toContainEqual({ part: "armor", needed: 0, present: 0 });
    expect(l.slots.LT?.[3]).toMatchObject({ kind: "mount", mountId: "e1" });
  });

  it("frees the hand slot, or the lower arm and hand slots, of an arm that lacks them, and nothing else", () => {
    const arm = (arms: MechRecord["arms"]) => labels(layout(bipedRecord({ mounts: [], arms }), factsOf), "LA").slice(0, 5);
    expect(arm(undefined)).toEqual(["Shoulder", "Upper Arm Actuator", "Lower Arm Actuator", "Hand Actuator", ""]);
    expect(arm({ LA: { lowerArm: true, hand: false } })).toEqual(["Shoulder", "Upper Arm Actuator", "Lower Arm Actuator", "", ""]);
    // No lower arm takes the hand with it, whatever `hand` says; the other arm is untouched.
    const bare = layout(bipedRecord({ mounts: [], arms: { LA: { lowerArm: false, hand: true } } }), factsOf);
    expect(labels(bare, "LA").slice(0, 4)).toEqual(["Shoulder", "Upper Arm Actuator", "", ""]);
    expect(labels(bare, "RA")[3]).toBe("Hand Actuator");
    expect(weights(bipedRecord({ arms: { LA: { lowerArm: false, hand: false } } }), factsOf).total).toBe(40);
  });

  it("lays a tripod out as a biped with a center leg of six slots and the leg's four actuators, the head as on any 'Mech", () => {
    const l = layout(tripodRecord(), factsOf);
    expect(l.locations).toEqual(["HD", "CT", "LT", "RT", "LA", "RA", "LL", "RL", "CL"]);
    expect(l.slots.CL).toHaveLength(6);
    expect(labels(l, "CL").slice(0, 5)).toEqual(["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator", "jj-4"]);
    expect(labels(l, "HD")).toEqual(labels(layout(bipedRecord(), factsOf), "HD"));
    expect(l.conflicts).toEqual([]);
  });

  it("does not throw for an unknown configuration or unknown chassis keys", () => {
    const l = layout(bipedRecord({ configuration: "hexapod" }), factsOf);
    expect(l).toMatchObject({ supported: false, locations: [], slots: {} });
    const odd = chassis({ engine: { type: "quantum", rating: 7 }, gyro: "?", cockpit: "?", structure: "?", armorType: "?" }, { tons: 77 });
    expect(() => [layout(odd, factsOf), weights(odd, factsOf), structurePoints(odd), maxArmor(odd), walkMP(odd)]).not.toThrow();
    const w = weights(odd, factsOf);
    expect(w.lines.slice(0, 6).map((x) => x.tons)).toEqual([null, null, null, null, 0, null]);
    expect(w.total).toBeNull();
    expect(structurePoints(odd)).toEqual({});
    expect(maxArmor(odd)).toEqual({});
  });
});

describe("weights", () => {
  it("lists structure to armor, then each mount, sums the lines, and nulls the total for an unknown mount", () => {
    const w = weights(bipedRecord(), factsOf);
    expect(w.lines.slice(0, 6).map((x) => [x.label, x.tons])).toEqual([
      ["Structure", 5], ["Engine", 8.5], ["Gyro", 2], ["Cockpit", 3], ["Heat sinks", 0], ["Armor", 5],
    ]);
    expect(w.lines).toHaveLength(6 + 7);
    expect(w.total).toBe(40);
    expect(w.lines.reduce((sum, x) => sum + (x.tons ?? 0), 0)).toBe(w.total);

    const unmatched = weights(bipedRecord({ mounts: [mount("ac", "ac-10", "RT", 0), mount("mystery", null, "LT", 0)] }), factsOf);
    expect(unmatched.lines.at(-1)).toEqual({ label: "mystery", tons: null });
    expect(unmatched.lines.at(-2)).toEqual({ label: "ac", tons: 12 });
    expect(unmatched.total).toBeNull();
  });

  // One row per rule worked in the book's own examples: endo-steel's half-ton rounding, the Compact engine factor,
  // the gyro's two roundings, ferro-fibrous armor's points per ton.
  it.each<[string, Partial<MechRecord["chassis"]>, Partial<MechRecord>, string, number]>([
    ["endo-steel at 25 tons", { structure: "endo-steel" }, { tons: 25 }, "Structure", 1.5],
    ["a 380 XL engine", { engine: { type: "xl", rating: 380 } }, {}, "Engine", 20.5],
    ["a 350 light engine", { engine: { type: "light", rating: 350 } }, {}, "Engine", 22.5],
    ["a 220 compact engine",{ engine: { type: "compact", rating: 220 } }, {}, "Engine", 15],
    ["a compact gyro on a 160 engine", { gyro: "compact", engine: { type: "standard", rating: 160 } }, {}, "Gyro", 3],
    ["89 points of Inner Sphere ferro-fibrous", { armorType: "ferro-fibrous" }, { armor: { CT: { front: 89 } } }, "Armor", 5],
  ])("matches the book for %s", (_name, patch, rest, label, tons) => {
    expect(line(chassis(patch, rest), label)).toBe(tons);
  });
});

describe("structure points, armor limits and speed", () => {
  // The totals are the book's Maximum Armor Factor column.
  it.each<[number, string, number]>([[20, "biped", 69], [55, "biped", 185], [100, "biped", 307], [70, "quad", 233]])(
    "gives %i tons (%s) 3 head structure points, a head of 9, twice the structure elsewhere, %i in all",
    (tons, configuration, total) => {
      const record = bipedRecord({ tons, configuration });
      const max = maxArmor(record);
      const structure = structurePoints(record);
      expect(structure.HD).toBe(3);
      expect(Object.keys(structure)).toEqual(Object.keys(max));
      expect(configuration === "quad" ? structure.FLL : structure.LL).toBe(structure.RRL ?? structure.RL);
      expect(max.HD).toBe(9);
      expect(max.CT).toBe(2 * (structure.CT ?? 0));
      expect(Object.values(max).reduce((a, b) => a + b, 0)).toBe(total);
    },
  );

  // The center leg has the structure of the side legs (IO:AE printed p.159, leg column of TechManual p.47) and may carry twice it.
  it.each<[number, number, number]>([[20, 4, 8], [55, 13, 26], [100, 21, 42]])(
    "gives a %i-ton tripod a center leg of %i structure points and at most %i armor, as its side legs",
    (tons, structure, armor) => {
      const record = bipedRecord({ tons, configuration: "tripod" });
      expect([structurePoints(record).CL, structurePoints(record).LL, maxArmor(record).CL, maxArmor(record).RL]).toEqual([structure, structure, armor, armor]);
    },
  );

  // A tripod's internal structure of any type weighs 10 percent more, rounded up to a half ton (IO:AE printed p.159); the
  // 45-ton endo steel row shows the increase is made on the weight rounded to a half ton: 2.5 becomes 2.75, and so 3.
  it.each<[string, number, string, number]>([
    ["standard", 55, "biped", 5.5],
    ["standard", 55, "tripod", 6.5],
    ["standard", 100, "tripod", 11],
    ["endo-steel", 45, "biped", 2.5],
    ["endo-steel", 45, "tripod", 3],
  ])("weighs %s structure on %i tons (%s) at %f tons", (type, tons, configuration, expected) => {
    expect(structureTons(type, tons, configuration)).toBe(expected);
  });

  it("works out walking MP as rating over tonnage, null when it is not a whole number", () => {
    expect(walkMP(bipedRecord())).toBe(4);
    expect(walkMP(chassis({ engine: { type: "standard", rating: 200 } }, { tons: 60 }))).toBeNull();
    expect(walkMP(bipedRecord({ tons: 0 }))).toBeNull();
  });

  it("starts a new design bare: engine sized for the walk, ten heat sinks, zero armor in each location of its configuration", () => {
    const options = { chassis: "Digger", model: "", tons: 55, walk: 5, techBase: "clan", year: null } as const;
    const biped = newRecord({ ...options, configuration: "biped" }, "total-warfare", "new-1");
    expect(biped.chassis.engine).toEqual({ type: "standard", rating: 275 });
    expect(walkMP(biped)).toBe(5);
    expect(biped.chassis.heatSinks).toEqual({ type: "single", count: 10 });
    expect(biped.armor).toEqual({
      HD: { front: 0 }, CT: { front: 0, rear: 0 }, LT: { front: 0, rear: 0 }, RT: { front: 0, rear: 0 },
      LA: { front: 0 }, RA: { front: 0 }, LL: { front: 0 }, RL: { front: 0 },
    });
    expect([biped.source, biped.techBase, biped.editionId]).toEqual([undefined, "clan", "total-warfare"]);
    // A 275 engine holds eleven sinks, so none wait; a 200 holds eight, so two wait unplaced.
    expect(biped.mounts).toEqual([]);
    const slow = newRecord({ ...options, tons: 50, walk: 4, techBase: "inner-sphere", configuration: "biped" }, "total-warfare", "new-3");
    expect(slow.mounts.map((m) => [m.equipmentId, m.location, m.slot])).toEqual([
      ["heat-sink-is", null, null],
      ["heat-sink-is", null, null],
    ]);
    expect(Object.keys(newRecord({ ...options, configuration: "quad" }, "total-warfare", "new-2").armor)).toEqual(
      ["HD", "CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"],
    );
    // A tripod starts with its own cockpit and a center leg.
    const tripod = newRecord({ ...options, configuration: "tripod" }, "total-warfare", "new-4");
    expect(Object.keys(tripod.armor)).toEqual(["HD", "CT", "LT", "RT", "LA", "RA", "LL", "RL", "CL"]);
    expect(tripod.chassis.cockpit).toBe("tripod");
  });

  it("edits a copy and leaves the original and its nested parts alone", () => {
    const original = bipedRecord();
    const snapshot = structuredClone(original);
    const next = editRecord(original, (draft) => {
      draft.chassis.engine.rating = 250;
      draft.mounts.push(mount("new", "medium-laser", "HD", 3));
      draft.armor.HD = { front: 1 };
    });
    expect(next).not.toBe(original);
    expect(next.chassis.engine.rating).toBe(250);
    expect(next.mounts).toHaveLength(original.mounts.length + 1);
    expect(original).toEqual(snapshot);
  });
});

describe("Land-Air 'Mech construction", () => {
  it("shares the biped's body, puts landing gear and avionics in the first free cells and weighs conversion equipment as a rounded-up share of the tonnage", () => {
    const l = layout(lamRecord(), factsOf);
    expect(l.locations).toEqual(layout(bipedRecord(), factsOf).locations);
    expect([labels(l, "HD")[3], labels(l, "CT")[10], labels(l, "LT").slice(0, 2), labels(l, "RT").slice(0, 2)]).toEqual([
      "Avionics", "Landing Gear", ["Landing Gear", "Avionics"], ["Landing Gear", "Avionics"],
    ]);
    expect([l.unplaced, l.conflicts, l.overflow]).toEqual([[], [], []]);
    expect(structurePoints(lamRecord())).toEqual(structurePoints(bipedRecord()));
    // 10 percent of 50 tons is 5; 15 percent for a bimodal is 7.5, which rounds up to 8; a biped has none.
    expect([lamRecord(), lamRecord({ configuration: "bimodal-lam" }), bipedRecord()].map((r) => line(r, "Conversion equipment"))).toEqual([5, 8, undefined]);
  });
});

describe("a chassis part on a mixed record", () => {
  it("carries the part's own tech base, so Clan endo steel keeps its Clan row and 7 slots, and a Clan record keeps its own", () => {
    expect([partMountBase(STRUCTURE_TYPES.types["endo-steel-clan"] ?? {}, "mixed"), partMountBase(STRUCTURE_TYPES.types["endo-steel"] ?? {}, "mixed"), partMountBase({}, "clan")]).toEqual(["clan", "inner-sphere", "clan"]);
    expect(STRUCTURE_TYPES.types["endo-steel-clan"]?.slots).toBe(7);
  });
});

describe("a mount the catalog does not know", () => {
  it("takes the slots the source gave it, and one slot when it gave none", () => {
    const record = bipedRecord({ mounts: [{ ...mount("odd", null, "LA", 4), slots: 3 }, mount("odd-2", null, "RA", 4)] });
    const cells = layout(record, factsOf).slots;
    expect(cells.LA?.slice(4, 8).map((c) => c.mountId)).toEqual(["odd", "odd", "odd", undefined]);
    expect(cells.RA?.slice(4, 6).map((c) => c.mountId)).toEqual(["odd-2", undefined]);
  });
});

describe("arm actuator settings", () => {
  const arms = { LA: { lowerArm: false, hand: false } };

  it("are dropped when the configuration changes to a body without arms, and kept for a body with them", () => {
    const to = (configuration: string) =>
      editRecord(bipedRecord({ arms }), (d) => {
        setConfiguration(d, configuration);
      });
    expect(to("quad").configuration).toBe("quad");
    expect(to("quad").arms).toBeUndefined();
    expect(to("tripod").arms).toEqual(arms);
  });

  it("are ignored when a record already saved with them has no arms", () => {
    expect(armsOf(quadRecord({ arms }))).toBeUndefined();
    expect(armsOf(lamRecord({ arms }))).toEqual(arms);
    expect(armsOf(bipedRecord({ configuration: "hexapod", arms }))).toEqual(arms); // a body we do not know: nothing is dropped
  });
});

describe("armor allocation (our own helper, after TechManual pp.54-55)", () => {
  const total = (armor: MechRecord["armor"]) => Object.values(armor).reduce((sum, a) => sum + (a ? a.front + (a.rear ?? 0) : 0), 0);
  const at = (armor: MechRecord["armor"], loc: LocationCode) => (armor[loc]?.front ?? 0) + (armor[loc]?.rear ?? 0);

  it("never passes a location's maximum and gives the points asked for, or every maximum when they are too many", () => {
    const record = bipedRecord();
    const max = maxArmor(record);
    for (const points of [0, 1, 50, 100, 169, 500]) {
      const armor = allocateArmor(record, points);
      expect(total(armor)).toBe(Math.min(points, 169));
      for (const [loc, cap] of Object.entries(max) as [LocationCode, number][]) expect(at(armor, loc)).toBeLessThanOrEqual(cap);
    }
  });

  it("puts the head at 9, splits torsos 3 to 1 and gives the leftover to the center torso, then the side torsos", () => {
    // 91 points for the rest, in proportion to 32, 24, 24, 16, 16, 24, 24: 18, 13, 13, 9, 9, 13, 13 and 3 over.
    const armor = allocateArmor(bipedRecord(), 100);
    expect(armor.HD).toEqual({ front: 9 });
    expect(armor.CT).toEqual({ front: 14, rear: 5 });
    expect(armor.LT).toEqual({ front: 11, rear: 3 });
    expect(armor.RT).toEqual({ front: 11, rear: 3 });
    expect([armor.LA, armor.RA, armor.LL, armor.RL]).toEqual([{ front: 9 }, { front: 9 }, { front: 13 }, { front: 13 }]);
  });

  it("fills every location to its maximum for the maximum total, a quad's legs to their own", () => {
    for (const record of [bipedRecord(), quadRecord()]) {
      const armor = allocateArmor(record, Number.MAX_SAFE_INTEGER);
      for (const [loc, cap] of Object.entries(maxArmor(record)) as [LocationCode, number][]) expect(at(armor, loc)).toBe(cap);
    }
    expect(at(allocateArmor(quadRecord(), 9999), "FLL")).toBe(28);
  });

  it("turns tons into points by the armor type's points per ton", () => {
    expect(armorPointsForTons(bipedRecord(), 14)).toBe(224);
    // The TechManual example: 13.5 tons of Clan ferro-fibrous armor is 259 points.
    expect(armorPointsForTons(chassis({ armorType: "ferro-fibrous-clan" }), 13.5)).toBe(259);
  });
});
