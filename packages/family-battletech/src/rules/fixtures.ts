// Small, made-up 'Mechs and an equipment stub for the rules tests. Nothing here is a real design.
import type { FactsOf, MechRecord, Mount } from "./mech";

/** Tons and slots for the equipment ids the fixtures use. Task 2's catalog replaces this in real use. */
const FACTS: Record<string, { tons: number; slots: number }> = {
  "medium-laser": { tons: 1, slots: 1 },
  "ac-10": { tons: 12, slots: 7 },
  "ac-10-ammo": { tons: 1, slots: 1 },
  "jump-jet": { tons: 0.5, slots: 1 },
  "big-gun": { tons: 20, slots: 14 },
  "heat-sink-is": { tons: 0, slots: 1 },
};

export const factsOf: FactsOf = (mount) => (mount.equipmentId === null ? undefined : FACTS[mount.equipmentId]);

export function mount(id: string, equipmentId: string | null, location: Mount["location"], slot: number | null): Mount {
  return { id, equipmentId, name: id, techBase: "inner-sphere", location, slot };
}

/** A 50-ton biped, Inner Sphere, standard everything: walks 4 with a 200 engine. Weighs 40 tons as listed. Legal under every
 * check: its engine holds 8 of the 10 heat sinks and the other 2 are placed in the legs. */
export function bipedRecord(overrides: Partial<MechRecord> = {}): MechRecord {
  return {
    schema: 1,
    id: "fixture-biped",
    editionId: "classic",
    name: { chassis: "Test Walker", model: "TW-1" },
    techBase: "inner-sphere",
    year: 3025,
    tons: 50,
    configuration: "biped",
    chassis: {
      engine: { type: "standard", rating: 200 },
      gyro: "standard",
      cockpit: "standard",
      structure: "standard",
      armorType: "standard",
      myomer: "standard",
      heatSinks: { type: "single", count: 10 },
    },
    armor: {
      HD: { front: 9 },
      CT: { front: 14, rear: 4 },
      LT: { front: 10, rear: 3 },
      RT: { front: 10, rear: 3 },
      LA: { front: 8 },
      RA: { front: 8 },
      LL: { front: 6 },
      RL: { front: 5 },
    },
    mounts: [
      mount("ac", "ac-10", "RT", 0),
      mount("ammo", "ac-10-ammo", "LT", 0),
      mount("laser-l", "medium-laser", "LA", 4),
      mount("laser-r", "medium-laser", "RA", 4),
      mount("jj-1", "jump-jet", "CT", 10),
      mount("jj-2", "jump-jet", "LL", 4),
      mount("jj-3", "jump-jet", "RL", 4),
      mount("hs-1", "heat-sink-is", "LL", 5),
      mount("hs-2", "heat-sink-is", "RL", 5),
    ],
    notes: {},
    ...overrides,
  };
}

/** A 60-ton quad with a 240 engine (walks 4). Legal under every check. */
export function quadRecord(overrides: Partial<MechRecord> = {}): MechRecord {
  return {
    ...bipedRecord(),
    id: "fixture-quad",
    name: { chassis: "Test Crawler", model: "TC-2" },
    tons: 60,
    configuration: "quad",
    chassis: {
      engine: { type: "standard", rating: 240 },
      gyro: "standard",
      cockpit: "standard",
      structure: "standard",
      armorType: "standard",
      myomer: "standard",
      heatSinks: { type: "single", count: 10 },
    },
    armor: {
      HD: { front: 9 },
      CT: { front: 20, rear: 8 },
      LT: { front: 14, rear: 4 },
      RT: { front: 14, rear: 4 },
      FLL: { front: 20 },
      FRL: { front: 20 },
      RLL: { front: 16 },
      RRL: { front: 16 },
    },
    // The 240 engine holds 9 of the 10 heat sinks; the tenth is placed.
    mounts: [mount("laser", "medium-laser", "LT", 1), mount("ac", "ac-10", "RT", 0), mount("hs-1", "heat-sink-is", "RRL", 5)],
    ...overrides,
  };
}
