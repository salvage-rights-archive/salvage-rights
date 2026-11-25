// The 'Mech record and the pure functions over it: slot layout, weights, structure, armor limits, walking MP.
// A 'Mech is plain data; there is no class. None of these functions throws on a record they do not understand: a key
// that is not in a chassis table, a configuration with no fixed layout or a mount the catalog does not know gives
// the best answer available, with null (or supported: false) where it cannot know.
import {
  ARMOR,
  COCKPITS,
  ENGINE_TYPES,
  ENGINE_WEIGHTS,
  GYROS,
  HEAD_MAX_ARMOR,
  HEAD_STRUCTURE,
  HEAT_SINK_RULES,
  INTERNAL_STRUCTURE,
  SHEET,
  STRUCTURE_TYPES,
  STRUCTURE_WEIGHT,
} from "../data/chassis";
import type { ArmorType, ConfigurationRow } from "../data/chassis";

export type LocationCode = "HD" | "CT" | "LT" | "RT" | "LA" | "RA" | "LL" | "RL" | "CL" | "FLL" | "FRL" | "RLL" | "RRL";
export const LOCATION_NAMES: Record<LocationCode, string> = {
  HD: "Head",
  CT: "Center Torso",
  LT: "Left Torso",
  RT: "Right Torso",
  LA: "Left Arm",
  RA: "Right Arm",
  LL: "Left Leg",
  RL: "Right Leg",
  CL: "Center Leg",
  FLL: "Front Left Leg",
  FRL: "Front Right Leg",
  RLL: "Rear Left Leg",
  RRL: "Rear Right Leg",
};

/** A location's display name; a code we do not know prints as itself in quotes, never as "undefined". */
export function locationName(code: string): string {
  return Object.hasOwn(LOCATION_NAMES, code) ? LOCATION_NAMES[code as LocationCode] : `"${code}"`;
}

export type TechBase = "inner-sphere" | "clan";

export interface Mount {
  id: string;
  equipmentId: string | null; // null: not in our table
  part?: "structure" | "armor"; // a slot taken by the structure or armor type, not by an equipment item
  name: string;
  techBase: TechBase;
  location: LocationCode | null;
  slot: number | null; // zero-based first slot; null when not placed
  /** Slots the item takes when the catalog has no row for it: what the source said. Layout reads it only then. */
  slots?: number;
  linkedTo?: string;
}

export interface MechRecord {
  schema: 1;
  id: string;
  editionId: string;
  name: { chassis: string; model: string };
  techBase: TechBase | "mixed";
  year: number | null;
  tons: number;
  configuration: string; // "biped" | "quad" | "tripod" | the source's own word
  chassis: {
    engine: { type: string; rating: number };
    gyro: string;
    cockpit: string;
    structure: string;
    armorType: string;
    myomer: string;
    heatSinks: { type: string; count: number };
  };
  armor: Partial<Record<LocationCode, { front: number; rear?: number }>>;
  /** Which arm actuators a biped's arm has. Absent (or an arm absent from it) means the lower arm and the hand are both there. */
  arms?: Partial<Record<"LA" | "RA", { lowerArm: boolean; hand: boolean }>>;
  mounts: Mount[];
  notes: { overview?: string; capabilities?: string; deployment?: string; variants?: string; notables?: string };
  /** Mordel's picture of the unit, as imported. */
  imageUrl?: string;
  /** The player's own picture of the unit, scaled and encoded by `readPicture`; shown in place of Mordel's. */
  picture?: { dataUrl: string };
  source?: {
    kind: "mordel";
    unitType: string;
    id: number;
    designer: string;
    fetchedAt: string;
    original: unknown;
    values: { battleValue?: number; cost?: number; rulesLevel?: string; era?: string };
    /** What the importer produced, kept so that "changed since import" compares with it and not with a newer importer. */
    baseline?: Pick<MechRecord, "name" | "notes" | "tons" | "year" | "techBase" | "configuration" | "chassis" | "armor" | "arms" | "mounts">;
  };
}

/** What one equipment item needs from the catalog for layout and weight. Task 2's catalog supplies it. */
export interface MountFacts {
  tons: number;
  slots: number;
}
export type FactsOf = (mount: Mount, record: MechRecord) => MountFacts | undefined;

export interface SlotCell {
  kind: "fixed" | "mount" | "empty";
  label: string;
  mountId?: string;
}
export interface Layout {
  supported: boolean; // false when the configuration has no fixed layout
  locations: LocationCode[];
  slots: Partial<Record<LocationCode, SlotCell[]>>;
  unplaced: Mount[]; // mounts that take slots and have no (usable) place
  conflicts: { location: LocationCode; slot: number; mountIds: string[] }[];
  overflow: { location: LocationCode; mountId: string }[];
  partSlots: { part: "structure" | "armor"; needed: number; present: number }[];
}

export interface WeightLine {
  label: string;
  tons: number | null; // null: could not be worked out
}

// ---------------------------------------------------------------------------------------------------------------
// Lookups that only see a table's own keys, so a key like "constructor" is unknown rather than a surprise.
// ---------------------------------------------------------------------------------------------------------------
function own<T>(table: Record<string | number, T>, key: string | number): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

/** The configuration's row in the chassis tables, or undefined for a body type we have no layout for. */
export function configurationOf(name: string): ConfigurationRow | undefined {
  return Object.hasOwn(SHEET.configurations, name) ? (SHEET.configurations as Record<string, ConfigurationRow>)[name] : undefined;
}

/** A configuration's name as the build form and editor show it, with its rules level when that is not the standard one:
 * `Tripod (advanced rules)`. A key we do not know prints as itself. */
export function configurationLabel(name: string): string {
  const row = configurationOf(name);
  return row ? (row.rulesLevel === "standard" ? row.name : `${row.name} (${row.rulesLevel} rules)`) : name;
}

/** Where an armor type's slots must go on this configuration, if it has to go in particular places; a body type the type has
 * no spread of its own for takes the biped's. */
export function armorSpread(armor: ArmorType | undefined, configuration: string): Partial<Record<LocationCode, number>> | undefined {
  return armor?.slotsIn && (own(armor.slotsIn, configuration) ?? armor.slotsIn.biped);
}

/** Rounds up to the next half ton, ignoring float noise. */
function ceilHalf(x: number): number {
  return Math.ceil(Math.round(x * 2 * 1e6) / 1e6) / 2;
}
const tidy = (x: number) => Math.round(x * 1000) / 1000;

/** Engine weight: the printed column for the type times its stated factor, rounded up to a half ton. null if unknown. */
export function engineTons(type: string, rating: number): number | null {
  const engine = own(ENGINE_TYPES.types, type);
  const standard = own(ENGINE_WEIGHTS.rows, rating);
  return engine && standard !== undefined ? ceilHalf(standard * engine.weightFactor) : null;
}

/** Structure weight: a tenth of the tonnage, times the type's factor, rounded up to a half ton; a tripod's is then 10 percent
 * heavier, rounded up to a half ton again (IO:AE printed p.159). null if unknown. */
export function structureTons(type: string, tons: number, configuration = "biped"): number | null {
  const structure = own(STRUCTURE_TYPES.types, type);
  if (!structure || !own(INTERNAL_STRUCTURE.rows, tons)) return null;
  const base = ceilHalf(tons * STRUCTURE_WEIGHT.fractionOfTons * structure.weightFactor);
  const extra = configurationOf(configuration)?.structureExtra;
  return extra === undefined ? base : ceilHalf(base * (1 + extra));
}

// ---------------------------------------------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------------------------------------------

export const ARM_FULL = { lowerArm: true, hand: true };
const ARM_LABELS = { lowerArm: "Lower Arm Actuator", hand: "Hand Actuator" } as const;

/** One label per slot ("" for none) for every location, from the fixed parts of the chassis. */
function fixedLabels(record: MechRecord, config: NonNullable<ReturnType<typeof configurationOf>>) {
  const labels: Partial<Record<LocationCode, string[]>> = {};
  const set = (loc: LocationCode, slot: number, label: string) => {
    const cells = labels[loc];
    if (cells && slot >= 0 && slot < cells.length) cells[slot] = label;
  };
  const size: Partial<Record<LocationCode, number>> = config.size;
  const fixed: Partial<Record<LocationCode, readonly string[]>> = config.fixed;
  for (const loc of Object.keys(size) as LocationCode[]) labels[loc] = Array<string>(size[loc] ?? 0).fill("");
  for (const loc of Object.keys(fixed) as LocationCode[]) fixed[loc]?.forEach((label, i) => set(loc, i, label));

  const cockpit = own(COCKPITS.types, record.chassis.cockpit);
  if (cockpit) {
    for (const n of cockpit.cockpit) set("HD", n - 1, "Cockpit");
    for (const n of cockpit.sensors) set("HD", n - 1, "Sensors");
    for (const n of cockpit.lifeSupport) set("HD", n - 1, "Life Support");
  }

  // Center torso: the first engine cells, then the gyro, then the rest of the engine, as the published record sheets
  // print it (see SHEET in data/chassis.ts).
  const engine = own(ENGINE_TYPES.types, record.chassis.engine.type);
  const gyro = own(GYROS.types, record.chassis.gyro);
  const above = Math.min(SHEET.engineAbove, engine?.ct ?? SHEET.engineAbove);
  const gyroSlots = gyro?.slots ?? own(GYROS.types, "standard")?.slots ?? 4;
  if (engine) {
    for (let i = 0; i < above; i++) set("CT", i, engine.label);
    for (let i = 0; i < engine.ct - above; i++) set("CT", above + gyroSlots + i, engine.label);
    for (let i = 0; i < engine.side; i++) {
      set("LT", i, engine.label);
      set("RT", i, engine.label);
    }
  }
  if (gyro) for (let i = 0; i < gyro.slots; i++) set("CT", above + i, gyro.label);

  // An arm without its lower arm actuator has no hand either; the freed cells are ordinary empty slots.
  for (const arm of ["LA", "RA"] as const) {
    const has = record.arms?.[arm];
    if (!has) continue;
    const lacking = [has.lowerArm ? "" : ARM_LABELS.lowerArm, has.lowerArm && has.hand ? "" : ARM_LABELS.hand];
    labels[arm]?.forEach((label, i) => {
      if (lacking.includes(label)) set(arm, i, "");
    });
  }
  return labels;
}

/** How many slots a mount takes: one for a structure or armor slot, else the catalog's count, else what the source said, else one. */
export function slotsTaken(mount: Mount, record: MechRecord, factsOf: FactsOf): number {
  return mount.part ? 1 : (factsOf(mount, record)?.slots ?? mount.slots ?? 1);
}

export function layout(record: MechRecord, factsOf: FactsOf): Layout {
  const partSlots: Layout["partSlots"] = [];
  const structure = own(STRUCTURE_TYPES.types, record.chassis.structure);
  if (structure) {
    partSlots.push({ part: "structure", needed: structure.slots, present: record.mounts.filter((m) => m.part === "structure").length });
  }
  const armor = own(ARMOR.types, record.chassis.armorType);
  if (armor) {
    // A type with a place for each slot takes as many as the configuration's places add up to (a tripod's third leg takes some).
    const spread = armorSpread(armor, record.configuration);
    const needed = spread ? Object.values(spread).reduce((sum, n) => sum + n, 0) : armor.slots;
    partSlots.push({ part: "armor", needed, present: record.mounts.filter((m) => m.part === "armor").length });
  }

  const config = configurationOf(record.configuration);
  if (!config) return { supported: false, locations: [], slots: {}, unplaced: [], conflicts: [], overflow: [], partSlots };

  const locations = Object.keys(config.size) as LocationCode[];
  const labels = fixedLabels(record, config);
  const slots: Partial<Record<LocationCode, SlotCell[]>> = {};
  for (const loc of locations) {
    slots[loc] = (labels[loc] ?? []).map((label): SlotCell => (label ? { kind: "fixed", label } : { kind: "empty", label: "" }));
  }

  const unplaced: Mount[] = [];
  const overflow: Layout["overflow"] = [];
  const clashes = new Map<string, { location: LocationCode; slot: number; mountIds: string[] }>();
  for (const mount of record.mounts) {
    const taken = slotsTaken(mount, record, factsOf);
    if (taken <= 0) continue;
    const cells = mount.location ? own(slots as Record<string, SlotCell[]>, mount.location) : undefined;
    const first = mount.slot;
    if (!mount.location || !cells || first === null || !Number.isInteger(first) || first < 0) {
      unplaced.push(mount);
      continue;
    }
    for (let i = 0; i < taken; i++) {
      const index = first + i;
      const cell = cells[index];
      if (!cell) {
        overflow.push({ location: mount.location, mountId: mount.id });
        break;
      }
      if (cell.kind !== "empty") {
        const key = `${mount.location}:${index}`;
        const clash = clashes.get(key) ?? { location: mount.location, slot: index, mountIds: [] };
        if (cell.mountId && !clash.mountIds.includes(cell.mountId)) clash.mountIds.push(cell.mountId);
        clash.mountIds.push(mount.id);
        clashes.set(key, clash);
        continue;
      }
      cells[index] = { kind: "mount", label: mount.name, mountId: mount.id };
    }
  }
  const conflicts = [...clashes.values()].sort(
    (a, b) => locations.indexOf(a.location) - locations.indexOf(b.location) || a.slot - b.slot,
  );
  return { supported: true, locations, slots, unplaced, conflicts, overflow, partSlots };
}

// ---------------------------------------------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------------------------------------------

export function weights(record: MechRecord, factsOf: FactsOf): { lines: WeightLine[]; total: number | null } {
  const { chassis } = record;
  const lines: WeightLine[] = [];

  lines.push({ label: "Structure", tons: structureTons(chassis.structure, record.tons, record.configuration) });
  lines.push({ label: "Engine", tons: engineTons(chassis.engine.type, chassis.engine.rating) });

  const gyro = own(GYROS.types, chassis.gyro);
  const rating = chassis.engine.rating;
  lines.push({
    label: "Gyro",
    tons: gyro && Number.isFinite(rating) && rating > 0 ? ceilHalf(Math.ceil(rating / 100) * gyro.multiplier) : null,
  });

  lines.push({ label: "Cockpit", tons: own(COCKPITS.types, chassis.cockpit)?.tons ?? null });

  const extraSinks = Math.max(0, chassis.heatSinks.count - HEAT_SINK_RULES.freeWithEngine);
  lines.push({ label: "Heat sinks", tons: Number.isFinite(extraSinks) ? extraSinks * HEAT_SINK_RULES.tonsEach : null });

  const armorType = own(ARMOR.types, chassis.armorType);
  const points = Object.values(record.armor).reduce((sum, a) => sum + (a ? a.front + (a.rear ?? 0) : 0), 0);
  lines.push({
    label: "Armor",
    tons: armorType && Number.isFinite(points) ? ceilHalf(points / (ARMOR.basePointsPerTon * armorType.multiplier)) : null,
  });

  for (const mount of record.mounts) {
    if (mount.part) continue; // its weight is in the structure or armor line
    const facts = factsOf(mount, record);
    if (!facts) lines.push({ label: mount.name, tons: null });
    else if (facts.tons > 0) lines.push({ label: mount.name, tons: facts.tons });
  }

  const total = lines.some((l) => l.tons === null) ? null : tidy(lines.reduce((sum, l) => sum + (l.tons ?? 0), 0));
  return { lines, total };
}

// ---------------------------------------------------------------------------------------------------------------
// Structure, armor limits, speed
// ---------------------------------------------------------------------------------------------------------------

export function structurePoints(record: MechRecord): Partial<Record<LocationCode, number>> {
  const row = own(INTERNAL_STRUCTURE.rows, record.tons);
  if (!row) return {};
  const points: Partial<Record<LocationCode, number>> = { HD: HEAD_STRUCTURE.points, CT: row.ct, LT: row.side, RT: row.side };
  // Every limb of a configuration we lay out: the arms take the arm column, every leg the leg column. A tripod's third leg has
  // the same points as its other two (IO:AE printed p.159).
  for (const loc of Object.keys(configurationOf(record.configuration)?.size ?? {}) as LocationCode[]) {
    if (!(loc in points)) points[loc] = loc === "LA" || loc === "RA" ? row.arm : row.leg;
  }
  return points;
}

/** The most armor each location may carry: 9 on the head, twice the structure points elsewhere (front plus rear). */
export function maxArmor(record: MechRecord): Partial<Record<LocationCode, number>> {
  const max: Partial<Record<LocationCode, number>> = {};
  for (const [loc, points] of Object.entries(structurePoints(record)) as [LocationCode, number][]) {
    max[loc] = loc === "HD" ? HEAD_MAX_ARMOR.points : points * 2;
  }
  return max;
}

export function walkMP(record: MechRecord): number | null {
  const { rating } = record.chassis.engine;
  if (!(record.tons > 0) || !Number.isFinite(rating)) return null;
  const mp = rating / record.tons;
  return Number.isInteger(mp) && mp > 0 ? mp : null;
}

export interface NewMechOptions {
  chassis: string;
  model: string;
  tons: number;
  /** Walking MP; the engine rating is tons times this. */
  walk: number;
  techBase: TechBase;
  configuration: "biped" | "quad" | "tripod";
  year: number | null;
}

/**
 * A bare design to build on: standard parts throughout, a fusion engine sized for the walking speed, the ten heat
 * sinks every 'Mech starts with, every location at zero armor and no equipment. The rules check says what it lacks.
 */
export function newRecord(options: NewMechOptions, editionId: string, id: string): MechRecord {
  const record: MechRecord = {
    schema: 1,
    id,
    editionId,
    name: { chassis: options.chassis, model: options.model },
    techBase: options.techBase,
    year: options.year,
    tons: options.tons,
    configuration: options.configuration,
    chassis: {
      engine: { type: "standard", rating: options.tons * options.walk },
      gyro: "standard",
      cockpit: configurationOf(options.configuration)?.cockpit ?? "standard",
      structure: "standard",
      armorType: "standard",
      myomer: "standard",
      heatSinks: { type: "single", count: HEAT_SINK_RULES.freeWithEngine },
    },
    armor: {},
    mounts: [],
    notes: {},
  };
  for (const loc of Object.keys(structurePoints(record)) as LocationCode[]) {
    record.armor[loc] = ["CT", "LT", "RT"].includes(loc) ? { front: 0, rear: 0 } : { front: 0 };
  }
  // The heat sinks the engine cannot hold wait unplaced, for the builder to give each a slot.
  const held = Math.floor(record.chassis.engine.rating / HEAT_SINK_RULES.ratingPerHeldSink);
  for (let n = 1; n <= HEAT_SINK_RULES.freeWithEngine - held; n += 1) {
    record.mounts.push({
      id: `heat-sink-${n}`,
      equipmentId: options.techBase === "clan" ? "heat-sink-clan" : "heat-sink-is",
      name: "Heat Sink",
      techBase: options.techBase,
      location: null,
      slot: null,
    });
  }
  return record;
}

/** A new record with the change applied to a copy; the original and its nested parts are untouched. */
export function editRecord(record: MechRecord, change: (draft: MechRecord) => void): MechRecord {
  const draft = structuredClone(record);
  change(draft);
  return draft;
}
