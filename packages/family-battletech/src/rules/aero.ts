// The aerospace record (AeroTech, every edition) and the pure functions over it. One record serves every aerospace unit in every
// edition: a unit is built under one edition (`editionId`) and the edition decides which unit types, locations and parts it
// offers. A record is plain data; there is no class. Nothing here throws on a record it does not understand: a unit type, arc or
// armor location the edition does not know is kept as it is, and keys this version does not know are kept too, so a record
// written by a later version survives a round trip through this one.
import { ENGINE_TYPES, RULES_LEVELS } from "../data/chassis";
import type { RulesLevel } from "../data/chassis";
import { AERO_LOCATION_NAMES, DEFAULT_AERO_EDITION, FIGHTER_ARMOR_TYPES, FIGHTER_FIGURES, aeroFigures, aeroTypesFor, fighterArmorPointsPerTon, fighterArmorTypes, figureOf, kindFigureOf } from "../data/aero";
import type { AeroShape, AeroType, FighterKind } from "../data/aero";
import { aeroCatalogFigures, aeroWeaponFigures } from "../data/aero-weapons";
import { groupOf } from "./catalog";
import type { Catalog } from "./catalog";
import { engineTons } from "./mech";
import type { OfficialMark, TechBase } from "./mech";
import { own, roundHalfUp, tidy } from "./walk";

export type { AeroShape, AeroType, FighterKind };
export type AeroUse = "civilian" | "military";

/** One weapon or item on the unit. `arc` is a code from the edition's arc set (`locationsOf`); one the edition lacks is kept. */
export interface AeroMount {
  id: string;
  /** The catalog row; null when the item is not in our table. */
  equipmentId: string | null;
  name: string;
  arc: string;
  /** The weapon bay the item is grouped in, for craft that use bays (small craft and larger). */
  bay?: string;
  /** Fires to the rear from a wing arc, where the edition allows it (`locationsOf(...).wingsFireAft`). */
  aft?: true;
  /** The size the player chose for an item sold by size, as on a 'Mech mount. */
  amount?: number;
}

export interface AeroBay {
  /** What the bay carries ("fighter", "small-craft", "cargo", ...): the construction pieces name the kinds. */
  kind: string;
  capacity: number;
  doors: number;
}

export interface AeroRecord {
  schema: 1;
  id: string;
  /** The edition the unit is built under: aerotech-1986, battlespace, aerotech2, aerotech2-revised or tw-tm-so. */
  editionId: string;
  name: { chassis: string; model: string };
  /** An AeroType; any other string is kept as it is and offers no locations. */
  unitType: AeroType | (string & {});
  /** Small craft and DropShips only; absent reads as aerodyne. */
  shape?: AeroShape;
  use?: AeroUse;
  techBase: TechBase | "mixed";
  year: number | null;
  era?: string;
  /** Only in the current edition (tw-tm-so); the older editions have no rules levels. */
  rulesLevel?: RulesLevel;
  tons: number;
  /** Safe Thrust (AeroTech 1986 calls it thrust); Max Thrust is derived per edition. */
  thrust: { safe: number };
  /** The engine type id (ENGINE_TYPES in data/chassis.ts and the edition's own); rating and weight are derived. */
  engine: { type: string };
  /** The Structural Integrity chosen for a large craft; absent on fighters, which derive it. */
  si?: number;
  fuelTons: number;
  /** `points` is keyed by the edition's armor locations (`locationsOf`); a key the edition lacks is kept. */
  armor: { type: string; tons: number; points: Record<string, number> };
  /** `count` is the heat sinks added beyond those the engine gives free; the free ones are derived per edition. */
  heatSinks: { type: string; count: number };
  mounts: AeroMount[];
  bays?: AeroBay[];
  quarters?: Record<string, number>;
  crew?: number;
  /** A fighter unit (BattleSpace) or squadron (Strategic Operations): the ids of the saved fighters in it. */
  fighterUnit?: { fighters: string[] };
  omni?: unknown;
  official?: OfficialMark;
  notes: Record<string, string>;
  picture?: { dataUrl: string };
}

// ---- Locations ----------------------------------------------------------------------------------------------------------------
// The armor locations, arcs and names live in data/aero.ts (one table for every edition, each row with its page); this reads them.

/** A location's or arc's display name; a code we do not know prints as itself in quotes, never as "undefined". */
export function aeroLocationName(code: string): string {
  return Object.hasOwn(AERO_LOCATION_NAMES, code) ? (AERO_LOCATION_NAMES[code] ?? code) : `"${code}"`;
}

export interface AeroLocations {
  armor: string[];
  arcs: string[];
  /** Wing arcs may hold weapons that fire aft (the mount's `aft`). */
  wingsFireAft: boolean;
}

/** The armor locations and weapon arcs the record's edition gives its unit type (and shape); empty where the edition builds no such unit. */
export function locationsOf(record: Pick<AeroRecord, "editionId" | "unitType" | "shape">): AeroLocations {
  const row = aeroTypesFor(record.editionId).find((r) => r.type === record.unitType);
  if (!row) return { armor: [], arcs: [], wingsFireAft: false };
  const figures = aeroFigures(row, record.shape ?? "aerodyne");
  return { armor: [...figures.armor], arcs: [...figures.arcs], wingsFireAft: figures.wingsFireAft === true };
}

// ---- New record ---------------------------------------------------------------------------------------------------------------

export interface NewAeroFields {
  /** A fresh id when absent. */
  id?: string;
  chassis?: string;
  model?: string;
  unitType: AeroType;
  shape?: AeroShape;
  use?: AeroUse;
  techBase?: TechBase | "mixed";
  year?: number | null;
  era?: string;
  /** Kept only in the current edition. */
  rulesLevel?: RulesLevel;
  tons: number;
  safeThrust?: number;
}

const HAS_SHAPE: readonly string[] = ["small-craft", "dropship"];

/**
 * A bare unit to build on, under one edition: standard fusion engine, standard armor at zero points on each of the edition's armor
 * locations, no added heat sinks, no fuel and no equipment. The construction pieces and the rules check say what it lacks.
 */
export function newAeroRecord(fields: NewAeroFields, editionId: string): AeroRecord {
  const record: AeroRecord = {
    schema: 1,
    id: fields.id ?? crypto.randomUUID(),
    editionId,
    name: { chassis: fields.chassis ?? "", model: fields.model ?? "" },
    unitType: fields.unitType,
    techBase: fields.techBase ?? "inner-sphere",
    year: fields.year ?? null,
    tons: fields.tons,
    thrust: { safe: fields.safeThrust ?? 0 },
    engine: { type: "standard" },
    fuelTons: 0,
    armor: { type: "standard", tons: 0, points: {} },
    heatSinks: { type: "single", count: 0 },
    mounts: [],
    notes: {},
  };
  if (HAS_SHAPE.includes(fields.unitType)) record.shape = fields.shape ?? "aerodyne";
  if (fields.use !== undefined) record.use = fields.use;
  if (fields.era !== undefined) record.era = fields.era;
  if (fields.rulesLevel !== undefined && editionId === DEFAULT_AERO_EDITION) record.rulesLevel = fields.rulesLevel;
  for (const loc of locationsOf(record).armor) record.armor.points[loc] = 0;
  return record;
}

// ---- Reading a record from storage, a file or an import -----------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const str = (v: unknown, fallback: string) => (isString(v) ? v : fallback);
const num = (v: unknown, fallback: number) => (isNumber(v) ? v : fallback);

/** The keys of `v` that `known` does not name, as they are: what a later version wrote stays in the record. */
function unknownKeys(v: Record<string, unknown>, known: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(v).filter(([k]) => !known.includes(k)));
}

/** A nested object with its known fields filled and its unknown keys kept. */
function part<T>(v: unknown, known: readonly (keyof T & string)[], fill: (o: Record<string, unknown>) => T): T {
  const o = isObject(v) ? v : {};
  return { ...unknownKeys(o, known), ...fill(o) };
}

function numbers(v: unknown): Record<string, number> {
  return isObject(v) ? (Object.fromEntries(Object.entries(v).filter(([, n]) => isNumber(n))) as Record<string, number>) : {};
}

const MOUNT_KEYS = ["id", "equipmentId", "name", "arc", "bay", "aft", "amount"] as const;
function mountOf(v: Record<string, unknown>, index: number): AeroMount {
  const mount: AeroMount = {
    ...unknownKeys(v, MOUNT_KEYS),
    id: str(v.id, `mount-${index + 1}`),
    equipmentId: isString(v.equipmentId) ? v.equipmentId : null,
    name: str(v.name, ""),
    arc: str(v.arc, ""),
  };
  if (isString(v.bay)) mount.bay = v.bay;
  if (v.aft === true) mount.aft = true;
  if (isNumber(v.amount)) mount.amount = v.amount;
  return mount;
}

const BAY_KEYS = ["kind", "capacity", "doors"] as const;
const bayOf = (v: Record<string, unknown>): AeroBay => ({ ...unknownKeys(v, BAY_KEYS), kind: str(v.kind, ""), capacity: num(v.capacity, 0), doors: num(v.doors, 0) });

function officialOf(v: unknown): OfficialMark | undefined {
  if (!isObject(v) || (v.status !== "official" && v.status !== "not-official")) return undefined;
  const mark: OfficialMark = { status: v.status };
  if (isString(v.book)) mark.book = v.book;
  if (isNumber(v.page)) mark.page = v.page;
  if (isString(v.design)) mark.design = v.design;
  return mark;
}

const RECORD_KEYS = [
  "schema", "id", "editionId", "name", "unitType", "shape", "use", "techBase", "year", "era", "rulesLevel", "tons", "thrust", "engine", "si", "fuelTons",
  "armor", "heatSinks", "mounts", "bays", "quarters", "crew", "fighterUnit", "omni", "official", "notes", "picture",
] as const;

/**
 * Reads a record from storage, a file or an import. Every field this version knows is filled with its default where it is missing
 * or not of its kind; unit types, arcs and armor locations are kept whatever they are; keys this version does not know are kept as
 * they are. Undefined only for what is not a record at all: not an object, or a schema other than 1 (a later version's record,
 * which this version must not rewrite). `fallbackId` is the id of a record that has none (its storage key, or a fresh one).
 */
export function withDefaults(value: unknown, fallbackId = ""): AeroRecord | undefined {
  if (!isObject(value) || (value.schema !== undefined && value.schema !== 1)) return undefined;
  const v = value;
  const record: AeroRecord = {
    ...unknownKeys(v, RECORD_KEYS),
    schema: 1,
    id: str(v.id, fallbackId),
    editionId: str(v.editionId, DEFAULT_AERO_EDITION),
    name: part<AeroRecord["name"]>(v.name, ["chassis", "model"], (o) => ({ chassis: str(o.chassis, ""), model: str(o.model, "") })),
    unitType: str(v.unitType, "aerospace-fighter"),
    techBase: v.techBase === "clan" || v.techBase === "mixed" ? v.techBase : "inner-sphere",
    year: isNumber(v.year) ? v.year : null,
    tons: num(v.tons, 0),
    thrust: part<AeroRecord["thrust"]>(v.thrust, ["safe"], (o) => ({ safe: num(o.safe, 0) })),
    engine: part<AeroRecord["engine"]>(v.engine, ["type"], (o) => ({ type: str(o.type, "standard") })),
    fuelTons: num(v.fuelTons, 0),
    armor: part<AeroRecord["armor"]>(v.armor, ["type", "tons", "points"], (o) => ({ type: str(o.type, "standard"), tons: num(o.tons, 0), points: numbers(o.points) })),
    heatSinks: part<AeroRecord["heatSinks"]>(v.heatSinks, ["type", "count"], (o) => ({ type: str(o.type, "single"), count: num(o.count, 0) })),
    mounts: Array.isArray(v.mounts) ? v.mounts.filter(isObject).map(mountOf) : [],
    notes: isObject(v.notes) ? (Object.fromEntries(Object.entries(v.notes).filter(([, n]) => isString(n))) as Record<string, string>) : {},
  };
  if (v.shape === "aerodyne" || v.shape === "spheroid") record.shape = v.shape;
  if (v.use === "civilian" || v.use === "military") record.use = v.use;
  if (isString(v.era)) record.era = v.era;
  if (RULES_LEVELS.some((l) => l.id === v.rulesLevel)) record.rulesLevel = v.rulesLevel as RulesLevel;
  if (isNumber(v.si)) record.si = v.si;
  if (Array.isArray(v.bays)) record.bays = v.bays.filter(isObject).map(bayOf);
  if (isObject(v.quarters)) record.quarters = numbers(v.quarters);
  if (isNumber(v.crew)) record.crew = v.crew;
  if (isObject(v.fighterUnit)) {
    const fighters = Array.isArray(v.fighterUnit.fighters) ? v.fighterUnit.fighters.filter(isString) : [];
    record.fighterUnit = { ...unknownKeys(v.fighterUnit, ["fighters"]), fighters };
  }
  if (v.omni !== undefined) record.omni = v.omni;
  const official = officialOf(v.official);
  if (official) record.official = official;
  if (isObject(v.picture) && isString(v.picture.dataUrl)) record.picture = { dataUrl: v.picture.dataUrl };
  return record;
}

// ---- Fighter construction ------------------------------------------------------------------------------------------------------
// Conventional and aerospace fighters in the four editions that build them. Every figure is read from data/aero.ts (FIGHTER_FIGURES,
// one row per value, each edition named once); this file only does the arithmetic. A figure an edition's book does not print, a
// unit that is not a fighter and an edition we do not know give null or undefined, never a throw, and nothing is removed from a
// record: a part the edition does not offer is still weighed and listed by `fighterPartsNotOffered` for the rules check.

/** The fighter kind of a record, or undefined for any other unit type. */
export function fighterKind(record: Pick<AeroRecord, "unitType">): FighterKind | undefined {
  return record.unitType === "aerospace-fighter" ? "aerospace" : record.unitType === "conventional-fighter" ? "conventional" : undefined;
}

const ceilHalf = (x: number): number => Math.ceil(tidy(x * 2)) / 2;
const floorHalf = (x: number): number => Math.floor(tidy(x * 2)) / 2;
/** A fusion engine, as against the internal combustion (turbine) kinds that the Master Engine Table prints weights of their own for. */
const isFusion = (type: string): boolean => own(ENGINE_TYPES.types, type)?.weightTable === undefined;

/** Engine Rating: tons times Safe Thrust less 2 (aerospace) or times Safe Thrust (conventional). Not limited here (`FIGHTER_FIGURES.ratingLimits` gives the range). */
export function engineRating(record: AeroRecord): number | null {
  const kind = fighterKind(record);
  const offset = kind && kindFigureOf(FIGHTER_FIGURES.ratingOffset, kind, record.editionId);
  return offset === undefined ? null : record.tons * (record.thrust.safe - offset);
}

/** Engine weight in tons: the shared Master Engine Table by rating and type; a conventional fighter's fusion engine weighs 1.5 times that, rounded up to a half ton. null for a rating or type the table lacks. */
export function fighterEngineTons(record: AeroRecord): number | null {
  const rating = engineRating(record);
  const table = rating === null ? null : engineTons(record.engine.type, rating);
  if (table === null) return null;
  const factor = fighterKind(record) === "conventional" && isFusion(record.engine.type) ? figureOf(FIGHTER_FIGURES.conventionalFusionFactor, record.editionId) : undefined;
  return factor === undefined ? table : ceilHalf(table * factor);
}

/** Max Thrust (AeroTech's overthrust): Safe Thrust times 1.5, rounded up. */
export function maxThrust(record: AeroRecord): number | null {
  const factor = figureOf(FIGHTER_FIGURES.maxThrustFactor, record.editionId);
  return factor === undefined || fighterKind(record) === undefined ? null : Math.ceil(tidy(record.thrust.safe * factor));
}

/** Structural Integrity: the higher of Safe Thrust and a tenth of the tons rounded down. A fighter spends no mass on it and cannot choose another (the record's `si` is not read). */
export function fighterSI(record: AeroRecord): number | null {
  const divisor = figureOf(FIGHTER_FIGURES.siTonsDivisor, record.editionId);
  return divisor === undefined || fighterKind(record) === undefined ? null : Math.max(record.thrust.safe, Math.floor(tidy(record.tons / divisor)));
}

/** Fuel points: the fuel tons times the points a ton gives. */
export function fuelPoints(record: AeroRecord): number | null {
  const kind = fighterKind(record);
  const perTon = kind && kindFigureOf(FIGHTER_FIGURES.fuelPoints, kind, record.editionId);
  return perTon === undefined ? null : tidy(record.fuelTons * perTon);
}

/** Cockpit and controls in tons: 3 for an aerospace fighter, a tenth of the tons (rounded up to a half ton) for a conventional one. */
export function controlTons(record: AeroRecord): number | null {
  const kind = fighterKind(record);
  const figure = kind && kindFigureOf(FIGHTER_FIGURES.controls, kind, record.editionId);
  return figure === undefined ? null : kind === "aerospace" ? figure : ceilHalf(record.tons * figure);
}

/** Whole armor points a weight of armor gives the fighter, by the edition's rounding. null for an armor type or edition the tables lack. */
export function fighterArmorPoints(armorType: string, tons: number, editionId: string): number | null {
  const perTon = fighterArmorPointsPerTon(armorType, editionId);
  if (perTon === undefined) return null;
  const points = tidy(tons * perTon);
  return figureOf(FIGHTER_FIGURES.armorRounding, editionId) === "nearest" ? roundHalfUp(points) : Math.floor(points);
}

/** The most armor the edition lets the fighter carry, in points and in tons; undefined where its book prints no limit (AeroTech, and aerospace fighters in AeroTech 2 and Revised). */
export function fighterArmorLimit(record: AeroRecord): { points: number; tons: number } | undefined {
  const kind = fighterKind(record);
  const limit = kind && kindFigureOf(FIGHTER_FIGURES.armorLimit, kind, record.editionId);
  const perTon = fighterArmorPointsPerTon(record.armor.type, record.editionId);
  if (!limit || perTon === undefined) return undefined;
  const points = limit.pointsPerTon * record.tons;
  if (limit.unit === "points") return { points, tons: ceilHalf(points / perTon) };
  const tons = floorHalf(points / perTon);
  return { points: Math.floor(tidy(tons * perTon)), tons };
}

export interface FighterArmor {
  /** Points the armor tons give. */
  bought: number | null;
  /** Points the unit gives free (AeroTech's cockpit). */
  free: number;
  available: number | null;
  /** The sum of the points set on the armor locations. */
  allocated: number;
  /** Points set beyond those available; zero or less when they fit. */
  over: number | null;
}
export function fighterArmor(record: AeroRecord): FighterArmor {
  const bought = fighterArmorPoints(record.armor.type, record.armor.tons, record.editionId);
  const free = figureOf(FIGHTER_FIGURES.cockpitArmor, record.editionId) ?? 0;
  const allocated = Object.values(record.armor.points).reduce((sum, n) => sum + n, 0);
  const available = bought === null ? null : bought + free;
  return { bought, free, available, allocated, over: available === null ? null : allocated - available };
}

export interface FighterHeat {
  /** Sinks the engine gives free; none with an internal combustion engine. */
  free: number;
  /** `heatSinks.count`: the sinks added, a ton each. */
  added: number;
  total: number;
  /** Heat the sinks dissipate: a double sink takes away two. */
  capacity: number;
}
export function fighterHeat(record: AeroRecord): FighterHeat {
  const figure = figureOf(FIGHTER_FIGURES.freeHeatSinks, record.editionId);
  const free = figure === undefined ? 0 : isFusion(record.engine.type) ? figure.fusion : figure.ice;
  const total = free + record.heatSinks.count;
  return { free, added: record.heatSinks.count, total, capacity: total * (record.heatSinks.type === "double" ? 2 : 1) };
}

/** External stores hardpoints: a fifth of the tons, rounded down (TechManual only). */
export function hardpoints(record: AeroRecord): number | undefined {
  const divisor = figureOf(FIGHTER_FIGURES.hardpointTons, record.editionId);
  return divisor === undefined || fighterKind(record) === undefined ? undefined : Math.floor(tidy(record.tons / divisor));
}

const isAmmoMount = (mount: AeroMount, catalog?: Catalog): boolean => (mount.equipmentId !== null && catalog?.byId(mount.equipmentId)?.kind === "ammunition") || (mount.equipmentId ?? "").startsWith("ammo-");

export interface FighterArc {
  arc: string;
  /** Items in the arc that count against the limit (weapons; in AeroTech, ammunition too). */
  items: number;
  /** The most items the arc may hold: the edition's, less a slot where the armor takes one. */
  limit: number;
  weaponTons: number;
  /** AeroTech's aft arc: the most tons of weapons. */
  tonsLimit?: number;
}

/** Each arc's items against its limit, and the weapon tons in it. Weapons of unknown weight count as items and add no tons. Empty where the edition prints no limit. */
export function fighterArcs(record: AeroRecord, catalog?: Catalog): FighterArc[] {
  const arms = figureOf(FIGHTER_FIGURES.arms, record.editionId);
  const lost = FIGHTER_ARMOR_TYPES.find((t) => t.id === record.armor.type)?.lostSlots ?? [];
  if (!arms || fighterKind(record) === undefined) return [];
  return locationsOf(record).arcs.map((arc) => {
    const inArc = record.mounts.filter((m) => m.arc === arc);
    const counted = inArc.filter((m) => arms.countsAmmo === true || !isAmmoMount(m, catalog));
    const weaponTons = tidy(inArc.filter((m) => !isAmmoMount(m, catalog)).reduce((sum, m) => sum + (mountFacts(m, record.editionId, catalog)?.tons ?? 0), 0));
    return { arc, items: counted.length, limit: arms.items - (lost.includes(arc) ? 1 : 0), weaponTons, ...(arc === "AF" && arms.aftTons !== undefined ? { tonsLimit: arms.aftTons } : {}) };
  });
}

/** Whether the wings carry the same weapons where the edition requires it (AeroTech 2, Revised and TechManual); true where it does not. Ammunition is in the fuselage and not compared. */
export function wingsMatch(record: AeroRecord, catalog?: Catalog): boolean {
  if (figureOf(FIGHTER_FIGURES.wingsMatch, record.editionId) !== true) return true;
  const side = (arc: string) =>
    record.mounts
      .filter((m) => m.arc === arc && !isAmmoMount(m, catalog))
      .map((m) => `${m.equipmentId ?? m.name}|${m.amount ?? ""}|${m.aft === true ? "aft" : ""}`)
      .sort();
  return side("LW").join(",") === side("RW").join(",");
}

interface MountFacts {
  tons: number;
  ammunition: boolean;
  energy: boolean;
}
/** The weight of one mount: an ammunition mount is `amount` tons (a ton when unset), anything else its figure in the edition, else the catalog's. undefined when the item is not in the catalog or has no weight. */
function mountFacts(mount: AeroMount, editionId: string, catalog?: Catalog): MountFacts | undefined {
  const row = mount.equipmentId === null ? undefined : catalog?.byId(mount.equipmentId);
  if (!catalog || !row || mount.equipmentId === null) return undefined;
  if (row.kind === "ammunition") return { tons: mount.amount ?? 1, ammunition: true, energy: false };
  const tons = (aeroWeaponFigures(catalog, mount.equipmentId, editionId) ?? aeroCatalogFigures(catalog, mount.equipmentId))?.tons;
  return tons === undefined ? undefined : { tons, ammunition: false, energy: row.heavyEnergy === true || (row.kind === "weapon" && groupOf(row).id === "energy") };
}

export interface FighterTally {
  lines: { label: string; tons: number }[];
  total: number;
  /** The unit's tons less the total; negative when overweight. */
  remaining: number;
  /** What could not be weighed: "engine", or the id of a mount the catalog does not know. */
  unknown: string[];
}

/** The weight of the fighter by part. A fighter spends no mass on structure. Power amplifiers (a turbine conventional fighter's energy weapons) are added where the edition prints them. */
export function fighterTally(record: AeroRecord, catalog?: Catalog): FighterTally {
  const unknown: string[] = [];
  const engine = fighterEngineTons(record);
  if (engine === null) unknown.push("engine");
  let weapons = 0;
  let ammunition = 0;
  let energy = 0;
  for (const m of record.mounts) {
    const facts = mountFacts(m, record.editionId, catalog);
    if (!facts) {
      unknown.push(m.id);
      continue;
    }
    if (facts.ammunition) ammunition += facts.tons;
    else weapons += facts.tons;
    if (facts.energy) energy += facts.tons;
  }
  const share = fighterKind(record) === "conventional" && !isFusion(record.engine.type) ? figureOf(FIGHTER_FIGURES.powerAmplifier, record.editionId) : undefined;
  const lines = [
    { label: "Engine", tons: engine ?? 0 },
    { label: "Fuel", tons: record.fuelTons },
    { label: "Cockpit and controls", tons: controlTons(record) ?? 0 },
    { label: "Armor", tons: record.armor.tons },
    { label: "Heat sinks", tons: record.heatSinks.count },
    { label: "Weapons and equipment", tons: weapons },
    { label: "Ammunition", tons: ammunition },
    { label: "Power amplifiers", tons: share === undefined || energy === 0 ? 0 : ceilHalf(energy * share) },
  ].map((line) => ({ ...line, tons: tidy(line.tons) }));
  const total = tidy(lines.reduce((sum, line) => sum + line.tons, 0));
  return { lines, total, remaining: tidy(record.tons - total), unknown };
}

/** The parts of the record the record's edition does not offer a fighter, kept in the record: "engine", "armor" or "heat-sinks". Empty for a unit that is not a fighter. */
export function fighterPartsNotOffered(record: AeroRecord): ("engine" | "armor" | "heat-sinks")[] {
  const kind = fighterKind(record);
  if (!kind) return [];
  const out: ("engine" | "armor" | "heat-sinks")[] = [];
  if (!kindFigureOf(FIGHTER_FIGURES.engineTypes, kind, record.editionId)?.includes(record.engine.type)) out.push("engine");
  if (!fighterArmorTypes(record.editionId).some((t) => t.id === record.armor.type)) out.push("armor");
  const sinks = kindFigureOf(FIGHTER_FIGURES.heatSinkTypes, kind, record.editionId);
  if (sinks !== undefined && !sinks.includes(record.heatSinks.type)) out.push("heat-sinks");
  return out;
}
