import { describe, expect, it } from "vitest";
import { bipedRecord, factsOf, mount, quadRecord } from "./fixtures";
import {
  editRecord,
  layout,
  maxArmor,
  structurePoints,
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

  it("does not throw for an unknown configuration or unknown chassis keys", () => {
    const l = layout(bipedRecord({ configuration: "tripod" }), factsOf);
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

  it("works out walking MP as rating over tonnage, null when it is not a whole number", () => {
    expect(walkMP(bipedRecord())).toBe(4);
    expect(walkMP(chassis({ engine: { type: "standard", rating: 200 } }, { tons: 60 }))).toBeNull();
    expect(walkMP(bipedRecord({ tons: 0 }))).toBeNull();
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

describe("a mount the catalog does not know", () => {
  it("takes the slots the source gave it, and one slot when it gave none", () => {
    const record = bipedRecord({ mounts: [{ ...mount("odd", null, "LA", 4), slots: 3 }, mount("odd-2", null, "RA", 4)] });
    const cells = layout(record, factsOf).slots;
    expect(cells.LA?.slice(4, 8).map((c) => c.mountId)).toEqual(["odd", "odd", "odd", undefined]);
    expect(cells.RA?.slice(4, 6).map((c) => c.mountId)).toEqual(["odd-2", undefined]);
  });
});
