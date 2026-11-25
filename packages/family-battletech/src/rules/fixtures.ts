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

// ---------------------------------------------------------------------------------------------------------------
// Made-up units in the shape of Mordel's detail response (see rules/mordel.ts). Not real designs.
// ---------------------------------------------------------------------------------------------------------------
type Json = Record<string, unknown>;

const IS = "Inner Sphere";
const item = (id: number | null, name: string, location: string | null, slots: number | null, extra: Json = {}): Json => ({
  id,
  name,
  location,
  technology: IS,
  slots,
  associated_id: null,
  ...extra,
});
const armorFor = (rows: [string, number, number | null][]): Json[] =>
  rows.map(([code, armor, rear]) => ({ code, armor, rear_armor: rear, structure: 1 }));

function mordelUnit(patch: Json): Json {
  return {
    status: "OK",
    unit: {
      unit_type_short: "bm",
      id: 900001,
      name_parts: { name: "Test Walker", alternate_name: null, model: "TW-1" },
      designer: "Nobody In Particular",
      tech_base: IS,
      mixed_tech: false,
      era: "Succession Wars",
      year: 3025,
      rules_level: "Introductory",
      tons: 50,
      battle_value: 1000,
      cost: 2000000,
      configuration: "Biped",
      image_url: null,
      movement: { walk: 4, run: 6, jump: 3 },
      engine: { type: "Fusion", technology: IS, rating: 200, tons: 8.5 },
      heat_sinks: { count: 10, type: "Single" },
      structure: { type: "Standard", technology: IS },
      armor: { type: "Standard", technology: IS, points: 77, tons: 5 },
      gyro: { type: "Standard" },
      cockpit: { type: "Standard" },
      myomer: { type: "Standard" },
      locations: armorFor([["H", 9, null], ["CT", 14, 4], ["LT", 10, 3], ["RT", 10, 3], ["LA", 8, null], ["RA", 8, null], ["LL", 6, null], ["RL", 5, null]]),
      equipment: [],
      fluff: { overview: "A made-up walker.", capabilities: null, deployment: null, variants: null, notables: null },
      ...patch,
    },
  };
}

/** A 50-ton Inner Sphere biped: an AC/10 with ammunition, two medium lasers, three jump jets and two heat sinks. */
export function mordelBiped(): Json {
  return mordelUnit({
    equipment: [
      item(1, "AC/10", "RT", 7),
      item(2, "AC/10 Ammo", "LT", 1),
      item(3, "Medium Laser", "LA", 1),
      item(4, "Medium Laser", "RA", 1),
      item(5, "Jump Jet", "CT", 1),
      item(6, "Jump Jet", "LL", 1),
      item(7, "Jump Jet", "RL", 1),
      item(8, "Heat Sink", "LL", 1),
      item(9, "Heat Sink", "RL", 1),
    ],
  });
}

/** A 60-ton Inner Sphere quad, with Mordel's quad location codes. */
export function mordelQuad(): Json {
  return mordelUnit({
    name_parts: { name: "Test Crawler", alternate_name: null, model: "TC-2" },
    tons: 60,
    configuration: "Quad",
    engine: { type: "Fusion", technology: IS, rating: 240, tons: 11.5 },
    locations: armorFor([["H", 9, null], ["CT", 20, 8], ["LT", 14, 4], ["RT", 14, 4], ["LFL", 20, null], ["RFL", 20, null], ["LRL", 16, null], ["RRL", 16, null]]),
    equipment: [item(1, "Medium Laser", "LT", 1), item(2, "AC/10", "RT", 7), item(3, "Heat Sink", "RRL", 1)],
  });
}

/** Everything awkward at once: an unknown configuration, a null field, an item not in our table, an item that takes no
 * slot, and an Artemis IV associated with its launcher. */
export function mordelOdd(): Json {
  return mordelUnit({
    name_parts: { name: "Test Oddity", alternate_name: null, model: "TO-X" },
    configuration: "Tripod",
    year: null,
    myomer: null,
    equipment: [
      item(10, "LRM 10", "LT", 2),
      item(11, "Artemis IV", "LT", 1, { associated_id: 10 }),
      item(12, "Frobnicator 9000", "CT", 2),
      item(13, "LRM 10 (Ammo 12)", "LT", 1),
      item(null, "Mystery Box", null, null),
    ],
  });
}

/** The response with some of the unit's fields replaced. */
export function mordelWith(response: Json, patch: Json): Json {
  const unit = response["unit"] as Json;
  return { ...response, unit: { ...unit, ...patch } };
}
