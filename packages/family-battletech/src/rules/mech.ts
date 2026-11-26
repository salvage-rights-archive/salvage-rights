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
  FRANKENMECH,
  HEAD_STRUCTURE,
  HEAT_SINK_RULES,
  HEAT_SINKS,
  INTERNAL_STRUCTURE,
  LAM,
  MECH_TYPES,
  MYOMER,
  SHEET,
  STRUCTURE_TYPES,
  STRUCTURE_WEIGHT,
} from "../data/chassis";
import type { ArmorType, ConfigurationRow, IndustrialRules, MechType, MechTypeRow, RulesLevel } from "../data/chassis";
import type { Catalog } from "./catalog";

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

/** Torso, head and leg mounts may be set to fire to the rear; an arm weapon takes the arc of its arm (TechManual p.57). */
export function canFireRear(location: LocationCode | null): boolean {
  return location !== null && location !== "LA" && location !== "RA";
}

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
  /** The size the player chose for an item sold by size (a jump pack's tons, a mechanical jump booster's Jumping MP): see `EquipmentRow.amount`. */
  amount?: number;
  /** The item fires to the rear. Only torso, leg and head mounts may (TechManual p.57; see `canFireRear`); the Battle Value rules, the sheet and both importers read it. */
  rear?: true;
  /** Set only on a resolved OmniMech configuration (rules/omni.ts): the mount is a pod item, not fixed equipment of the base. */
  pod?: true;
}

/** What a resolved OmniMech configuration remembers of its chassis, so cost, Battle Value, the checks and the sheet read it as any 'Mech. */
export interface OmniLink {
  chassisId: string;
  configurationId: string;
  /** The configuration's code ("Prime", "A", "MS1-OA"). */
  code: string;
  /** True for the unloaded base: it is not a legal unit, so it has no Battle Value. */
  isBase?: true;
  /** The heat sinks the base carries; the engine's critical-free ones are the lesser of this and its rating divided by 25 (TechManual p.54). */
  baseHeatSinks: number;
  /** The base's sinks of each further kind on a mixed chassis (parallel to `chassis.heatSinks.extra`); pods may add more of those kinds. */
  baseExtraHeatSinks?: number[];
  /** Which mounts are fixed equipment of the base; every other mount is a pod item. */
  baseMountIds: string[];
}

export interface MechRecord {
  schema: 1;
  id: string;
  editionId: string;
  name: { chassis: string; model: string };
  techBase: TechBase | "mixed";
  year: number | null;
  /** The era the unit belongs to (an id from `ERAS` in data/editions.ts). It and `year` are kept consistent by `setYear` and `setEra`
   * (rules/availability.ts); with a year, the era is the one that holds it. Absent on records saved before eras were offered. */
  era?: string;
  /** The rules level the unit is built under (rules/levels.ts). Absent on records saved before levels existed: they read as the
   * lowest level that accepts everything they use. */
  rulesLevel?: RulesLevel;
  /** What kind of 'Mech this is (MECH_TYPES in data/chassis.ts). Absent on records saved before types were offered, and read as a
   * BattleMech; a value that is not one of the types is read the same way. */
  unitType?: MechType;
  /** Present only on a FrankenMech (Campaign Operations p.213; FRANKENMECH in data/chassis.ts), a 'Mech built from donor parts. `tons` is the
   * center torso donor's tonnage. `donors` gives the tonnage of the donor 'Mech each other location came from; a location not listed came from
   * a 'Mech of the record's own tonnage. */
  frankenmech?: { donors?: Partial<Record<LocationCode, number>> };
  /** Present only on a configuration resolved from an OmniMech chassis (rules/omni.ts); absent on every other record. */
  omni?: OmniLink;
  /** Whether the player marked this design as published by the game's publisher (rules/official.ts). Absent reads as not official. */
  official?: OfficialMark;
  tons: number;
  configuration: string; // "biped" | "quad" | "tripod" | the source's own word
  chassis: {
    engine: { type: string; rating: number };
    gyro: string;
    cockpit: string;
    structure: string;
    armorType: string;
    myomer: string;
    /** `type` and `count` are the main kind and hold the engine's free sinks. `extra` lists further kinds (an Inner Sphere double with a
     * Clan double on a mixed technology record; other mixes only where `heatSinkMixAllowed` says); none of their sinks is engine-integral. */
    heatSinks: { type: string; count: number; extra?: { type: string; count: number }[] };
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
  source?: MordelSource | BookSource;
}

/** What an importer or a book's data produced, kept so that "changed since" compares with it and not with a newer importer. */
export type SourceBaseline = Pick<MechRecord, "name" | "notes" | "tons" | "year" | "techBase" | "configuration" | "chassis" | "armor" | "arms" | "mounts">;

/** A design imported from mordel.net. */
export interface MordelSource {
  kind: "mordel";
  unitType: string;
  id: number;
  designer: string;
  fetchedAt: string;
  original: unknown;
  values: { battleValue?: number; cost?: number; rulesLevel?: string; era?: string };
  baseline?: SourceBaseline;
}

/** A design typed from a book's own sheet (the Gothic box 'Mechs): the page it was read from and the figures the book prints, kept so
 * the editor can show them beside ours. `baseline` is the design as typed. */
export interface BookSource {
  kind: "book";
  cite: { book: string; page: number };
  values: MordelSource["values"];
  baseline?: SourceBaseline;
}

/** What the player states about whether the publisher put this design out (rules/official.ts reads it; the app never sets it on its own,
 * except for a Mordel unit that Mordel itself marks canon). */
export interface OfficialMark {
  status: "official" | "not-official";
  /** The book it was published in (a title from BOOKS in data/editions.ts, or the player's own words). An official mark needs one. */
  book?: string;
  page?: number;
  /** The design as it was when marked (`designKey`); the mark holds only while the design still matches. */
  design?: string;
}

/** What one equipment item needs from the catalog for layout and weight. Task 2's catalog supplies it. */
export interface MountFacts {
  tons: number;
  slots: number;
  /** True for an energy weapon (laser, PPC, flamer...): an IndustrialMech with an internal combustion or fuel cell engine carries power amplifiers for its weight. */
  energy?: true;
}
export type FactsOf = (mount: Mount, record: MechRecord) => MountFacts | undefined;

export interface SlotCell {
  kind: "fixed" | "mount" | "empty";
  label: string;
  mountId?: string;
  /** Names of other mounts that also cover this slot (a clash). They are not drawn in it, but the slot panel names them. */
  alsoLabels?: string[];
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

/** The type's row in MECH_TYPES; an absent or unknown type is the BattleMech's row. */
export function mechTypeOf(record: Pick<MechRecord, "unitType">): MechTypeRow {
  return MECH_TYPES.find((row) => row.id === record.unitType) ?? (MECH_TYPES[0] as MechTypeRow);
}
/** The IndustrialMech construction rules when the record is an IndustrialMech, else undefined. */
export const industrialRulesOf = (record: Pick<MechRecord, "unitType">): IndustrialRules | undefined => mechTypeOf(record).industrial;

/** Heat sinks that cost no tonnage: ten with a fusion engine, and for an IndustrialMech what its engine type gives (TechManual p.71). */
export function freeHeatSinks(record: Pick<MechRecord, "unitType" | "chassis">): number {
  const free = industrialRulesOf(record)?.freeHeatSinks;
  return free === undefined ? HEAT_SINK_RULES.freeWithEngine : (own(free, record.chassis.engine.type) ?? HEAT_SINK_RULES.freeWithEngine);
}

/** Every heat sink on the chassis, both kinds: the number that dissipates heat and counts for Battle Value. */
export const totalHeatSinks = (heatSinks: MechRecord["chassis"]["heatSinks"]): number => heatSinks.count + (heatSinks.extra ?? []).reduce((n, g) => n + g.count, 0);

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

/** The layout a configuration shares (a Land-Air 'Mech is a biped here); an unknown one is its own name. */
export function bodyOf(name: string): string {
  return configurationOf(name)?.body ?? name;
}

/** The arm actuator settings that count: a body without arms (a quad) has none, whatever a saved record still holds. An unknown body
 * keeps what it has. */
export function armsOf(record: Pick<MechRecord, "configuration" | "arms">): MechRecord["arms"] {
  const config = configurationOf(record.configuration);
  return config && !("LA" in config.size) ? undefined : record.arms;
}

/** Changes a record's body, and drops the arm actuator settings the new body has no arms for. */
export function setConfiguration(draft: MechRecord, configuration: string): void {
  draft.configuration = configuration;
  if (armsOf(draft) !== draft.arms) delete draft.arms;
}

/** Conversion equipment of a Land-Air 'Mech, a percentage of its tonnage rounded up to a whole ton (IO:AE p.108); null for any other configuration. */
export function conversionTons(record: MechRecord): number | null {
  const percent = own(LAM.conversionPercent, record.configuration);
  return percent === undefined || !(record.tons > 0) ? null : Math.ceil(Math.round(record.tons * percent * 1e4) / 1e6);
}

/** Rounds up to the next half ton, ignoring float noise. */
function ceilHalf(x: number): number {
  return Math.ceil(Math.round(x * 2 * 1e6) / 1e6) / 2;
}
const tidy = (x: number) => Math.round(x * 1000) / 1000;

/** Engine weight: the printed column for the type times its stated factor, rounded up to a half ton. null if unknown. */
export function engineTons(type: string, rating: number): number | null {
  const engine = own(ENGINE_TYPES.types, type);
  if (engine?.weightTable) return own(engine.weightTable, rating) ?? null;
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

/** The tonnage of the donor 'Mech a location came from: the record's own, unless a FrankenMech names another donor. */
export const donorTons = (record: Pick<MechRecord, "tons" | "frankenmech">, loc: LocationCode): number => (loc === "CT" ? undefined : record.frankenmech?.donors?.[loc]) ?? record.tons;

/** A FrankenMech's hybrid internal structure: each location carries its share of its donor's structure weight (Campaign Operations p.213),
 * the eight added and rounded up to a half ton. null if a donor's tonnage or the structure type is not in the tables. */
function frankenStructureTons(record: MechRecord): number | null {
  const share = FRANKENMECH.structureShare;
  let sum = 0;
  for (const loc of Object.keys(structurePoints(record)) as LocationCode[]) {
    const donor = structureTons(record.chassis.structure, donorTons(record, loc));
    if (donor === null) return null;
    sum += donor * (loc === "HD" || loc === "CT" || loc === "LT" || loc === "RT" ? share[loc] : share.limb);
  }
  return sum > 0 ? ceilHalf(tidy(sum)) : null;
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

  // A Land-Air 'Mech's landing gear and avionics: one cell in each listed location, the first free one (IO:AE p.108).
  if (own(LAM.conversionPercent, record.configuration) !== undefined) {
    for (const part of LAM.parts) {
      for (const loc of part.locations) {
        const free = labels[loc]?.indexOf("") ?? -1;
        if (free >= 0) set(loc, free, part.label);
      }
    }
  }

  // Cockpit parts that live outside the head (a torso-mounted cockpit): the first free slots, after the engine and gyro.
  if (cockpit?.elsewhere) {
    for (const [loc, parts] of Object.entries(cockpit.elsewhere) as [LocationCode, string[]][]) {
      for (const part of parts) {
        const free = labels[loc]?.indexOf("") ?? -1;
        if (free >= 0) set(loc, free, part);
      }
    }
  }

  // An arm without its lower arm actuator has no hand either; the freed cells are ordinary empty slots.
  for (const arm of ["LA", "RA"] as const) {
    const has = armsOf(record)?.[arm];
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
        cells[index] = { ...cell, alsoLabels: [...(cell.alsoLabels ?? []), mount.name] };
        continue;
      }
      cells[index] = { kind: "mount", label: mount.rear ? `${mount.name} (R)` : mount.name, mountId: mount.id };
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

  lines.push({ label: "Structure", tons: record.frankenmech ? frankenStructureTons(record) : structureTons(chassis.structure, record.tons, record.configuration) });
  const conversion = conversionTons(record);
  if (conversion !== null) lines.push({ label: "Conversion equipment", tons: conversion });
  lines.push({ label: "Engine", tons: engineTons(chassis.engine.type, chassis.engine.rating) });

  const gyro = own(GYROS.types, chassis.gyro);
  const rating = chassis.engine.rating;
  lines.push({
    label: "Gyro",
    tons: gyro && Number.isFinite(rating) && rating > 0 ? ceilHalf(Math.ceil(rating / 100) * gyro.multiplier) : null,
  });

  lines.push({ label: "Cockpit", tons: own(COCKPITS.types, chassis.cockpit)?.tons ?? null });

  const extraSinks = Math.max(0, chassis.heatSinks.count - freeHeatSinks(record));
  const tonsEach = (type: string) => own(HEAT_SINKS.types, type)?.tonsEach ?? HEAT_SINK_RULES.tonsEach;
  // The further kinds of a mixed record are never integral to the engine, so every one of their sinks weighs.
  const sinkTons = (chassis.heatSinks.extra ?? []).reduce((sum, g) => sum + g.count * tonsEach(g.type), extraSinks * tonsEach(chassis.heatSinks.type));
  lines.push({ label: "Heat sinks", tons: Number.isFinite(sinkTons) ? sinkTons : null });

  const armorType = own(ARMOR.types, chassis.armorType);
  const points = Object.values(record.armor).reduce((sum, a) => sum + (a ? a.front + (a.rear ?? 0) : 0), 0);
  lines.push({
    label: "Armor",
    tons: armorType && Number.isFinite(points) ? ceilHalf(points / (ARMOR.basePointsPerTon * armorType.multiplier)) : null,
  });

  let energyTons = 0;
  for (const mount of record.mounts) {
    if (mount.part) continue; // its weight is in the structure or armor line
    const facts = factsOf(mount, record);
    if (!facts) lines.push({ label: mount.name, tons: null });
    else if (facts.tons > 0) lines.push({ label: mount.name, tons: facts.tons });
    if (facts?.energy) energyTons += facts.tons;
  }
  // An IndustrialMech with an internal combustion or fuel cell engine carries power amplifiers for its energy weapons (TechManual p.74).
  const amplifier = industrialRulesOf(record)?.powerAmplifier;
  if (amplifier?.engines.includes(chassis.engine.type) && energyTons > 0) {
    lines.push({ label: "Power amplifiers", tons: ceilHalf(energyTons * amplifier.share) });
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
  // A FrankenMech keeps the structure of each location's donor, so its armor limit follows the donor (Campaign Operations p.213).
  if (record.frankenmech?.donors) {
    for (const loc of Object.keys(points) as LocationCode[]) {
      const donor = own(INTERNAL_STRUCTURE.rows, donorTons(record, loc));
      if (donor && loc !== "HD") points[loc] = loc === "CT" ? donor.ct : loc === "LT" || loc === "RT" ? donor.side : loc === "LA" || loc === "RA" ? donor.arm : donor.leg;
    }
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

/** The armor points a number of tons buys: the armor type's points per ton (16 times its multiplier), a part point lost (TechManual pp.54-55). Null for an armor type we have no row for. */
export function armorPointsForTons(record: MechRecord, tons: number): number | null {
  const type = own(ARMOR.types, record.chassis.armorType);
  return type && Number.isFinite(tons) && tons >= 0 ? Math.floor(tons * ARMOR.basePointsPerTon * type.multiplier + 1e-9) : null;
}

/**
 * A starting spread of armor points over the locations. This is our own helper, not a book rule; the player edits every figure afterwards.
 * Each location gets a share in proportion to its maximum (`maxArmor`); the head takes as near 9 as the total allows; a torso's share is
 * split about 3:1 front to rear; points left over go one at a time to the center torso, then the side torsos, then the legs, then the arms
 * and the head. No location passes its maximum, and the total is the points asked for, or every location's maximum if that is less.
 */
export function allocateArmor(record: MechRecord, points: number): MechRecord["armor"] {
  const max = maxArmor(record);
  const codes = Object.keys(max) as LocationCode[];
  const cap = (loc: LocationCode) => max[loc] ?? 0;
  const total = Math.max(0, Math.min(Math.floor(Number.isFinite(points) ? points : 0), codes.reduce((sum, loc) => sum + cap(loc), 0)));
  const share: Partial<Record<LocationCode, number>> = {};
  const head = codes.includes("HD") ? Math.min(cap("HD"), total) : 0;
  if (head > 0) share.HD = head;
  const rest = codes.filter((loc) => loc !== "HD");
  const restMax = rest.reduce((sum, loc) => sum + cap(loc), 0);
  const restPoints = Math.min(total - head, restMax);
  for (const loc of rest) share[loc] = restMax > 0 ? Math.floor((restPoints * cap(loc)) / restMax) : 0;
  let left = total - Object.values(share).reduce((sum, n) => sum + n, 0);
  const isLeg = (loc: LocationCode) => !["HD", "CT", "LT", "RT", "LA", "RA"].includes(loc);
  const order = [...(["CT", "LT", "RT"] as const), ...codes.filter(isLeg), "LA" as const, "RA" as const, "HD" as const].filter((loc) => codes.includes(loc));
  while (left > 0) {
    const open = order.filter((loc) => (share[loc] ?? 0) < cap(loc));
    if (open.length === 0) break;
    for (const loc of open) {
      if (left === 0) break;
      share[loc] = (share[loc] ?? 0) + 1;
      left--;
    }
  }
  const armor: MechRecord["armor"] = { ...record.armor };
  for (const loc of codes) {
    const n = share[loc] ?? 0;
    if (loc === "CT" || loc === "LT" || loc === "RT") {
      const rear = Math.floor((n + 1) / 4);
      armor[loc] = { front: n - rear, rear };
    } else {
      armor[loc] = { front: n };
    }
  }
  return armor;
}

export function walkMP(record: MechRecord): number | null {
  const { rating } = record.chassis.engine;
  if (!(record.tons > 0) || !Number.isFinite(rating)) return null;
  // A FrankenMech divides the rating by its tonnage and rounds down (Campaign Operations p.213); any other 'Mech needs it to divide evenly.
  const mp = record.frankenmech ? Math.floor(rating / record.tons) : rating / record.tons;
  return Number.isInteger(mp) && mp > 0 ? mp : null;
}

export interface NewMechOptions {
  chassis: string;
  model: string;
  tons: number;
  /** Walking MP; the engine rating is tons times this. */
  walk: number;
  techBase: TechBase | "mixed";
  configuration: keyof typeof SHEET.configurations;
  year: number | null;
  /** The rules level to build under; standard when absent. */
  rulesLevel?: RulesLevel;
  /** What kind of 'Mech; a BattleMech when absent. */
  unitType?: MechType;
}

/**
 * A bare design to build on: standard parts throughout, a fusion engine sized for the walking speed, the ten heat
 * sinks every 'Mech starts with, every location at zero armor and no equipment. The rules check says what it lacks.
 */
export function newRecord(options: NewMechOptions, editionId: string, id: string): MechRecord {
  const industrial = industrialRulesOf({ unitType: options.unitType }) !== undefined;
  const record: MechRecord = {
    schema: 1,
    id,
    editionId,
    name: { chassis: options.chassis, model: options.model },
    techBase: options.techBase,
    year: options.year,
    rulesLevel: options.rulesLevel ?? "standard",
    unitType: mechTypeOf({ unitType: options.unitType }).id,
    tons: options.tons,
    configuration: options.configuration,
    chassis: {
      engine: { type: "standard", rating: options.tons * options.walk },
      gyro: "standard",
      // An IndustrialMech's own frame and cockpit (TechManual pp.67 and 69); armor "standard" is its Heavy Industrial.
      cockpit: industrial ? "industrial" : (configurationOf(options.configuration)?.cockpit ?? "standard"),
      structure: industrial ? "industrial" : "standard",
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
      techBase: options.techBase === "clan" ? "clan" : "inner-sphere",
      location: null,
      slot: null,
    });
  }
  // A Land-Air 'Mech needs at least LAM.minJumpMP jump jets (IO:AE p.108); they wait unplaced like the heat sinks.
  if (own(LAM.conversionPercent, record.configuration) !== undefined) {
    for (let n = 1; n <= LAM.minJumpMP; n += 1) {
      record.mounts.push({ id: `jump-jet-${n}`, equipmentId: options.techBase === "clan" ? "jump-jet-clan" : "jump-jet-is", name: "Jump Jet", techBase: options.techBase === "clan" ? "clan" : "inner-sphere", location: null, slot: null });
    }
  }
  return record;
}

/** The tech base the slot mounts of a chassis part carry: the record's, except on a mixed record, where the part's own (Clan endo steel
 * on a mixed record is a Clan part, with the Clan slot count its row holds). */
export const partMountBase = (part: { techBase?: "inner-sphere" | "clan" | "both" }, record: TechBase | "mixed"): TechBase =>
  record === "mixed" ? (part.techBase === "clan" ? "clan" : "inner-sphere") : record;

/** Sets the chassis myomer and brings the mounts that stand for it (MASC: one; Triple-Strength Myomer: six) to the count the book asks: missing ones are
 * added unplaced, so the weight and slots show at once; the previous myomer's unplaced mounts go, placed ones stay for the player to decide. One edit. */
export function setMyomer(draft: MechRecord, type: string, catalog: Pick<Catalog, "byId">): void {
  const rowOf = (key: string) => {
    const id = Object.hasOwn(MYOMER.types, key) ? MYOMER.types[key]?.catalogId : undefined;
    return id === undefined ? undefined : catalog.byId(id);
  };
  const before = rowOf(draft.chassis.myomer);
  const row = rowOf(type);
  draft.chassis.myomer = type;
  if (before && before.id !== row?.id) draft.mounts = draft.mounts.filter((m) => !(m.equipmentId === before.id && m.location === null));
  if (!row || row.perMech === undefined) return;
  let have = draft.mounts.filter((m) => m.equipmentId === row.id).length;
  for (let n = 1; have < row.perMech; n++) {
    const id = `myomer-${n}`;
    if (draft.mounts.some((m) => m.id === id)) continue;
    draft.mounts.push({ id, equipmentId: row.id, name: row.name, techBase: row.techBase, location: null, slot: null });
    have++;
  }
}

/** A new record with the change applied to a copy; the original and its nested parts are untouched. */
export function editRecord(record: MechRecord, change: (draft: MechRecord) => void): MechRecord {
  const draft = structuredClone(record);
  change(draft);
  return draft;
}
