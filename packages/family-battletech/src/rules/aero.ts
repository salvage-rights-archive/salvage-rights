// The aerospace record (AeroTech, every edition) and the pure functions over it. One record serves every aerospace unit in every
// edition: a unit is built under one edition (`editionId`) and the edition decides which unit types, locations and parts it
// offers. A record is plain data; there is no class. Nothing here throws on a record it does not understand: a unit type, arc or
// armor location the edition does not know is kept as it is, and keys this version does not know are kept too, so a record
// written by a later version survives a round trip through this one.
import { ENGINE_TYPES, RULES_LEVELS } from "../data/chassis";
import type { RulesLevel } from "../data/chassis";
import { AERO_LOCATION_NAMES, DEFAULT_AERO_EDITION, FIGHTER_ARMOR_TYPES, FIGHTER_FIGURES, aeroFigures, aeroTypesFor, fighterArmorPointsPerTon, fighterArmorTypes, fighterPatchworkPointsPerTon, fighterPatchworkTypes, figureOf, kindFigureOf } from "../data/aero";
import type { AeroShape, AeroType, FighterKind } from "../data/aero";
import { CRAFT_FIGURES, craftArmorPointsPerTon, craftBayFigure } from "../data/aero";
import type { CraftKind, CraftRound, CraftUse } from "../data/aero";
import { CAPITAL_ARMOR_TYPES, CAPITAL_FIGURES, CAPITAL_KINDS, CAPITAL_SYSTEMS, capitalArmorPointsPerTon, capitalFigureOf, capitalSystemFigure } from "../data/aero";
import type { CapitalKind, CapitalRound } from "../data/aero";
import { aeroCatalogFigures, aeroWeaponFigures } from "../data/aero-weapons";
import { ammoRowOf } from "../data/aero-weapons";
import type { EquipmentRow } from "./catalog";
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
  /** A vessel built to tow others: the edition that asks for it adds a share to the structure's mass (`towingSiShare`). */
  towing?: boolean;
  fuelTons: number;
  /** `points` is keyed by the edition's armor locations (`locationsOf`); a key the edition lacks is kept. `patchwork` (fighters, current rules) names the armor type of each
   * location that differs from `type`; with it the tons are worked out from the points, location by location (`fighterArmorTons`), and `tons` is not read. */
  armor: { type: string; tons: number; points: Record<string, number>; patchwork?: Record<string, string> };
  /** `count` is the heat sinks added beyond those the engine gives free; the free ones are derived per edition. */
  heatSinks: { type: string; count: number };
  mounts: AeroMount[];
  bays?: AeroBay[];
  quarters?: Record<string, number>;
  /** Capital ship systems by kind (CAPITAL_SYSTEMS in data/aero.ts: docking hardpoints, grav decks, batteries, HPG, a station's sail): how many. A kind the edition lacks is kept. */
  systems?: Record<string, number>;
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

/** The armor type of each location a saved record names, as the field to spread into `armor`; nothing when it names none. */
function patchworkOf(v: unknown): { patchwork?: Record<string, string> } {
  const entries = isObject(v) ? Object.entries(v).filter((entry): entry is [string, string] => isString(entry[1])) : [];
  return entries.length === 0 ? {} : { patchwork: Object.fromEntries(entries) };
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
  "armor", "heatSinks", "mounts", "bays", "quarters", "systems", "crew", "towing", "fighterUnit", "omni", "official", "notes", "picture",
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
    armor: part<AeroRecord["armor"]>(v.armor, ["type", "tons", "points", "patchwork"], (o) => ({ type: str(o.type, "standard"), tons: num(o.tons, 0), points: numbers(o.points), ...patchworkOf(o.patchwork) })),
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
  if (isObject(v.systems)) record.systems = numbers(v.systems);
  if (isNumber(v.crew)) record.crew = v.crew;
  if (v.towing === true) record.towing = true;
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

// ---- Patchwork armor on a fighter (Tactical Operations: AUE p. 189; Interstellar Operations: Alternate Eras p. 82) ----------------------------------------

/** The armor type a fighter's location wears: its patchwork choice, else the record's armor type. */
export function armorTypeAt(record: Pick<AeroRecord, "armor">, location: string): string {
  const choice = record.armor.patchwork && Object.hasOwn(record.armor.patchwork, location) ? record.armor.patchwork[location] : undefined;
  return choice ?? record.armor.type;
}

/** Whether the fighter's armor is patchwork: the edition offers it to a fighter and some location wears a type other than the record's. A record that holds the
 * choices under another edition or unit type keeps them, and is read as one armor type. */
export function fighterPatchworkActive(record: AeroRecord): boolean {
  return fighterKind(record) !== undefined && fighterPatchworkTypes(record.editionId).length > 0 && Object.values(record.armor.patchwork ?? {}).some((t) => t !== record.armor.type);
}

/** The weapon slots a location's armor type takes from its arc when armor is patchwork; 0 for a type the list lacks. */
export function patchworkSlotsAt(record: AeroRecord, location: string): number {
  return fighterPatchworkTypes(record.editionId).find((t) => t.id === armorTypeAt(record, location))?.slots ?? 0;
}

/** The tons of armor on one location when armor is patchwork: its points over the type's points a ton, up to the half ton (TO:AUE p. 189). Null for a type with no figure. */
export function patchworkTonsAt(record: AeroRecord, location: string): number | null {
  const perTon = fighterPatchworkPointsPerTon(armorTypeAt(record, location), record.editionId);
  return perTon === undefined ? null : ceilHalf((record.armor.points[location] ?? 0) / perTon);
}

/** The tons of armor on the fighter: the record's own figure, or with patchwork armor the sum of the locations' (a location of a type with no figure counts nothing). */
export function fighterArmorTons(record: AeroRecord): number {
  return fighterPatchworkActive(record) ? tidy(Object.keys(record.armor.points).reduce((sum, loc) => sum + (patchworkTonsAt(record, loc) ?? 0), 0)) : record.armor.tons;
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
  // Patchwork: the weight follows the points set, so none are bought and left unset, or set beyond what is bought.
  if (fighterPatchworkActive(record)) {
    const set = Object.values(record.armor.points).reduce((sum, n) => sum + n, 0);
    return { bought: set, free: 0, available: set, allocated: set, over: 0 };
  }
  const bought = fighterArmorPoints(record.armor.type, record.armor.tons, record.editionId);
  const free = figureOf(FIGHTER_FIGURES.cockpitArmor, record.editionId) ?? 0;
  const allocated = Object.values(record.armor.points).reduce((sum, n) => sum + n, 0);
  const available = bought === null ? null : bought + free;
  return { bought, free, available, allocated, over: available === null ? null : allocated - available };
}

/** The heat of every energy weapon a fighter carries, read from the edition's own weapon table (an item the table does not list adds none). */
export function energyWeaponHeat(record: AeroRecord, catalog: Catalog): number {
  return tidy(
    record.mounts.reduce((sum, mount) => {
      const facts = mount.equipmentId === null ? undefined : mountFacts(mount, record.editionId, catalog);
      return sum + (facts?.energy && mount.equipmentId !== null ? (aeroWeaponFigures(catalog, mount.equipmentId, record.editionId)?.heat ?? 0) : 0);
    }, 0),
  );
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
  const patchwork = fighterPatchworkActive(record);
  if (!arms || fighterKind(record) === undefined) return [];
  return locationsOf(record).arcs.map((arc) => {
    const inArc = record.mounts.filter((m) => m.arc === arc);
    const counted = inArc.filter((m) => arms.countsAmmo === true || !isAmmoMount(m, catalog));
    const weaponTons = tidy(inArc.filter((m) => !isAmmoMount(m, catalog)).reduce((sum, m) => sum + (mountFacts(m, record.editionId, catalog)?.tons ?? 0), 0));
    return { arc, items: counted.length, limit: arms.items - (patchwork ? patchworkSlotsAt(record, arc) : lost.includes(arc) ? 1 : 0), weaponTons, ...(arc === "AF" && arms.aftTons !== undefined ? { tonsLimit: arms.aftTons } : {}) };
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
    { label: "Armor", tons: fighterArmorTons(record) },
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

// ---- Small craft and DropShip construction ------------------------------------------------------------------------------------
// Small craft and DropShips in the three editions that build them (AeroTech 2, AeroTech 2 Revised, the current rules). Every figure is read
// from data/aero.ts (CRAFT_FIGURES and CRAFT_BAYS, one row per value, each edition named once); this block only does the arithmetic. A figure an
// edition's book does not print, a unit that is not a small craft or DropShip and an edition we do not know give null or undefined, never a
// throw, and nothing is removed from a record: a part the edition does not offer is still weighed and listed by `craftPartsNotOffered`. An
// absent shape reads as aerodyne (as `locationsOf` does) and an absent use as civilian; a mixed tech base reads the Inner Sphere engine.

/** The kind of a record that the edition builds as a small craft or DropShip, or undefined for any other unit or edition. */
export function craftKind(record: Pick<AeroRecord, "unitType" | "editionId">): CraftKind | undefined {
  const kind: CraftKind | undefined = record.unitType === "small-craft" ? "small-craft" : record.unitType === "dropship" ? "dropship" : undefined;
  return kind !== undefined && figureOf(CRAFT_FIGURES.controlShare, record.editionId) !== undefined ? kind : undefined;
}
const craftShape = (record: Pick<AeroRecord, "shape">): AeroShape => (record.shape === "spheroid" ? "spheroid" : "aerodyne");
const craftUse = (record: Pick<AeroRecord, "use">): CraftUse => (record.use === "military" ? "military" : "civilian");

/** A mass rounded the way the edition's book rounds it (or not at all where it prints no rounding). */
function roundMass(x: number, mode: CraftRound | CapitalRound): number {
  switch (mode) {
    case "up-half":
      return ceilHalf(x);
    case "up-whole":
    case "total-up-whole":
      return Math.ceil(tidy(x));
    case "down-half":
      return floorHalf(x);
    case "nearest":
      return roundHalfUp(tidy(x));
    default:
      return tidy(x);
  }
}
const craftRounding = (record: Pick<AeroRecord, "editionId">) => figureOf(CRAFT_FIGURES.rounding, record.editionId);

/** Max Thrust: Safe Thrust times 1.5, rounded up (the figure every aerospace unit shares). */
export function craftMaxThrust(record: AeroRecord): number | null {
  const factor = figureOf(FIGHTER_FIGURES.maxThrustFactor, record.editionId);
  return factor === undefined || craftKind(record) === undefined ? null : Math.ceil(tidy(record.thrust.safe * factor));
}

/** Engine tons: tons times Safe Thrust (TechManual's Base Movement Factor) times 6.5 percent (Inner Sphere) or 6.1 percent (Clan); AeroTech 2 prints the same as a percentage of the vessel per Thrust Point, and its errata gives a small craft the DropShip rule. */
export function craftEngineTons(record: AeroRecord): number | null {
  const share = figureOf(CRAFT_FIGURES.engineShare, record.editionId);
  const rounding = craftRounding(record);
  if (!share || !rounding || craftKind(record) === undefined) return null;
  return roundMass(record.tons * record.thrust.safe * share[record.techBase === "clan" ? "clan" : "inner-sphere"], rounding.engine);
}

/** The Structural Integrity a craft may choose: at least its Max Thrust, at most 30 times it. */
export function craftSiRange(record: AeroRecord): { min: number; max: number } | null {
  const maxThrust = craftMaxThrust(record);
  const range = figureOf(CRAFT_FIGURES.siRange, record.editionId);
  return maxThrust === null || !range ? null : { min: maxThrust * range.min, max: maxThrust * range.max };
}
/** The record's chosen SI; a craft that has none reads as the minimum. */
export function craftSI(record: AeroRecord): number | null {
  const range = craftSiRange(record);
  return range === null ? null : typeof record.si === "number" ? record.si : range.min;
}
/** Structural mass: SI times tons over 200 (aerodyne) or 500 (spheroid). */
export function craftSiTons(record: AeroRecord): number | null {
  const divisors = figureOf(CRAFT_FIGURES.siMassDivisor, record.editionId);
  const si = craftSI(record);
  const rounding = craftRounding(record);
  return !divisors || si === null || !rounding ? null : roundMass(((si * record.tons) / divisors[craftShape(record)]) * (1 + towingShare(record)), rounding.si);
}
/** The share a towing vessel adds to its structure's mass, where the edition prints one (and the record says it tows). */
export const towingShare = (record: Pick<AeroRecord, "towing" | "editionId">): number => (record.towing === true ? (figureOf(CRAFT_FIGURES.towingSiShare, record.editionId) ?? 0) : 0);

/** Control systems: 0.75 percent of the tons (a small craft's up to a half ton in TechManual, a DropShip's up to a whole ton). */
export function craftControlTons(record: AeroRecord): number | null {
  const share = figureOf(CRAFT_FIGURES.controlShare, record.editionId);
  const rounding = craftRounding(record);
  const kind = craftKind(record);
  return share === undefined || !rounding || kind === undefined ? null : roundMass(record.tons * share, kind === "small-craft" ? rounding.controlsSmallCraft : rounding.controlsDropship);
}

/** Fuel points: the fuel tons times the points a ton gives at the craft's tons. */
export function craftFuelPoints(record: AeroRecord): number | null {
  const band = figureOf(CRAFT_FIGURES.fuelBands, record.editionId)?.filter(([from]) => record.tons >= from).at(-1);
  return band === undefined || craftKind(record) === undefined ? null : tidy(record.fuelTons * band[1]);
}
/** Fuel pumps and tanks: 2 percent of the fuel's tons. */
export function craftPumpTons(record: AeroRecord): number | null {
  const share = figureOf(CRAFT_FIGURES.pumpShare, record.editionId);
  const rounding = craftRounding(record);
  return share === undefined || !rounding || craftKind(record) === undefined ? null : roundMass(record.fuelTons * share, rounding.pumps);
}

export interface CraftArmor {
  /** Armor points a ton of the record's armor gives at the craft's tons and shape. */
  perTon: number | null;
  /** Points the armor tons give, by the edition's rounding. */
  bought: number | null;
  /** The free armor: the SI on each facing. */
  free: number;
  available: number | null;
  /** The sum of the points set on the armor locations. */
  allocated: number;
  /** Points set beyond those available; zero or less when they fit. */
  over: number | null;
  /** The most armor tons the SI allows (the free armor is outside it). */
  limitTons: number | null;
  /** Armor tons beyond the limit; zero or less when they fit. */
  tonsOver: number | null;
}
export function craftArmor(record: AeroRecord): CraftArmor | null {
  const si = craftSI(record);
  const rounding = craftRounding(record);
  const limits = figureOf(CRAFT_FIGURES.armorLimit, record.editionId);
  const freeShare = figureOf(CRAFT_FIGURES.freeArmor, record.editionId);
  if (si === null || !rounding || !limits || freeShare === undefined) return null;
  const perTon = craftArmorPointsPerTon(record.armor.type, record.editionId, craftShape(record), record.tons, record.techBase) ?? null;
  const points = perTon === null ? null : tidy(record.armor.tons * perTon);
  const bought = points === null ? null : figureOf(FIGHTER_FIGURES.armorRounding, record.editionId) === "nearest" ? roundHalfUp(points) : Math.floor(points);
  const free = tidy(si * freeShare * locationsOf(record).armor.length);
  const allocated = Object.values(record.armor.points).reduce((sum, n) => sum + n, 0);
  const available = bought === null ? null : bought + free;
  const limitTons = roundMass(si * limits[craftShape(record)], rounding.armorLimit);
  return { perTon, bought, free, available, allocated, over: available === null ? null : allocated - available, limitTons, tonsOver: tidy(record.armor.tons - limitTons) };
}

/** Heat sinks: the free ones come from the engine's tons (rounded down) by shape and use, a small craft reading the civilian row; the added ones weigh a ton each, a double one dissipating two. */
export function craftHeat(record: AeroRecord): FighterHeat | null {
  const rules = figureOf(CRAFT_FIGURES.freeSinks, record.editionId);
  const engine = craftEngineTons(record);
  const kind = craftKind(record);
  if (!rules || engine === null || kind === undefined) return null;
  const rule = rules[craftShape(record)][kind === "small-craft" ? "civilian" : craftUse(record)];
  const free = rule.divide !== undefined ? Math.floor(tidy(engine / rule.divide)) : rule.root !== undefined ? Math.floor(tidy(Math.sqrt(engine * rule.root))) : 0;
  const total = free + record.heatSinks.count;
  return { free, added: record.heatSinks.count, total, capacity: total * (record.heatSinks.type === "double" ? 2 : 1) };
}

/** The extra fire control mass of an arc over its weapon limit: each whole multiple of the limit adds 10 percent of the arc's weapon tons (ammunition not counted). Zero within the limit; null where the edition prints none. */
export function expandedFireControlTons(weapons: number, weaponTons: number, editionId: string): number | null {
  const limit = figureOf(CRAFT_FIGURES.arcLimit, editionId);
  const share = figureOf(CRAFT_FIGURES.fireControlShare, editionId);
  const rounding = figureOf(CRAFT_FIGURES.rounding, editionId);
  if (limit === undefined || share === undefined || !rounding) return null;
  return weapons <= limit ? 0 : roundMass(Math.floor(weapons / limit) * share * weaponTons, rounding.fireControl);
}

/** A capital weapon (a gunner each and its own ammunition rule), as the catalog marks one: a capital bay class, or a sub-capital one, which TO:AUE p. 155 says follows
 * the capital weapon rules. Cruise missiles are artillery at the standard scale (TO:AUE p. 97), so they are standard weapons whatever their shots a ton. */
export const isCapitalRow = (row: EquipmentRow | undefined): boolean => row !== undefined && /^(Sub-)?Capital/.test(row.bayClass ?? "");
/** Whether the catalog prints the weapon's damage at the capital scale (the "-C" mark: naval weapons). Capital missiles print their Aero damage at the standard scale
 * ("40" for a Killer Whale whose capital Attack Value is 4, AeroTech 2 p. 101), so only the marked figures count tenfold in a bay. */
export const capitalScale = (row: EquipmentRow | undefined): boolean => {
  const damage = row?.by?.aero?.damage ?? row?.by?.dropship?.damage ?? row?.by?.ship?.damage ?? row?.damage;
  return typeof damage === "string" && /-C$/.test(damage);
};

interface CraftWeapon {
  mount: AeroMount;
  row: EquipmentRow | undefined;
  capital: boolean;
}
/** The mounts that are weapons (anything not ammunition and not an item the catalog knows to be another kind, such as an escape pod). An item the catalog does not know counts as a standard weapon. */
function craftWeapons(record: AeroRecord, catalog?: Catalog): CraftWeapon[] {
  return record.mounts.flatMap((mount) => {
    const row = mount.equipmentId === null ? undefined : catalog?.byId(mount.equipmentId);
    return isAmmoMount(mount, catalog) || (row !== undefined && row.kind !== "weapon") ? [] : [{ mount, row, capital: isCapitalRow(row) }];
  });
}

export interface CraftArc {
  arc: string;
  weapons: number;
  /** Weapons the arc may hold before it needs more fire control. */
  limit: number;
  weaponTons: number;
  /** The extra fire control mass the arc needs. */
  fireControlTons: number;
}
/** Each of the record's arcs: its weapons against `limit`, its weapon tons, and the fire control `fireControl` gives for them. */
function arcsOf(record: AeroRecord, catalog: Catalog | undefined, limit: number, fireControl: (weapons: number, tons: number) => number): CraftArc[] {
  const weapons = craftWeapons(record, catalog);
  return locationsOf(record).arcs.map((arc) => {
    const inArc = weapons.filter((w) => w.mount.arc === arc);
    const weaponTons = tidy(inArc.reduce((sum, w) => sum + (mountFacts(w.mount, record.editionId, catalog)?.tons ?? 0), 0));
    return { arc, weapons: inArc.length, limit, weaponTons, fireControlTons: fireControl(inArc.length, weaponTons) };
  });
}

/** Each arc's weapons against its limit, its weapon tons and the fire control it needs. Empty for a unit that is not a small craft or DropShip. */
export function craftArcs(record: AeroRecord, catalog?: Catalog): CraftArc[] {
  const limit = figureOf(CRAFT_FIGURES.arcLimit, record.editionId);
  if (limit === undefined || craftKind(record) === undefined) return [];
  return arcsOf(record, catalog, limit, (n, tons) => expandedFireControlTons(n, tons, record.editionId) ?? 0);
}

/** The pairs of `pairs` that the record's arcs both hold and whose weapons differ (each as "FL|FR"). Ammunition is not compared. */
function unmatchedOf(record: AeroRecord, catalog: Catalog | undefined, pairs: string[][]): string[] {
  const locations = locationsOf(record).arcs;
  const side = (arc: string) =>
    craftWeapons(record, catalog)
      .filter((w) => w.mount.arc === arc)
      .map((w) => `${w.mount.equipmentId ?? w.mount.name}|${w.mount.amount ?? ""}|${w.mount.aft === true ? "aft" : ""}`)
      .sort()
      .join(",");
  return pairs.filter(([a, b]) => a !== undefined && b !== undefined && locations.includes(a) && locations.includes(b) && side(a) !== side(b)).map((pair) => pair.join("|"));
}

/** The arc pairs that must hold the same weapons and do not (each as "FL|FR"); empty where they match or the edition names none. Ammunition is not compared. */
export function craftArcsUnmatched(record: AeroRecord, catalog?: Catalog): string[] {
  const pairs = figureOf(CRAFT_FIGURES.matchedArcs, record.editionId);
  return !pairs || craftKind(record) === undefined ? [] : unmatchedOf(record, catalog, pairs);
}

/** The size of a weapon for grouping in a bay: the number in its name (LRM 10, AC/20), else Small, Medium or Large, else Light or Heavy, else the name. */
function weaponSize(name: string): string {
  const number = /\d+/.exec(name)?.[0];
  if (number !== undefined) return number;
  return (/small|medium|large/i.exec(name) ?? /light|heavy/i.exec(name))?.[0].toLowerCase() ?? name.toLowerCase();
}

export interface CraftWeaponBay {
  bay: string;
  arc: string;
  weapons: number;
  /** The bay classes of the weapons in it (one when the bay is built as the books ask). */
  classes: string[];
  /** The sizes of the weapons (by `weaponSize`). */
  sizes: string[];
  /** The sum of the attack values in standard-scale points, a capital-scale figure counted tenfold; weapons whose value is not a plain number are in `unknown`. */
  attack: number;
  /** The heat of firing the whole bay (a capital ship must carry the sinks for its hottest bay in the current rules). */
  heat: number;
  limit: number;
  over: boolean;
  /** Whether the edition lets a bay mix sizes (AeroTech 2 with its errata does not). */
  mixedSizesAllowed: boolean;
  /** The ids of mounts whose attack value could not be read. */
  unknown: string[];
}
/** The record's weapon bays against `limit`: the weapons that share a `bay` id (on a mount without one, the arc). */
function baysOf(record: AeroRecord, catalog: Catalog | undefined, limit: number, mixedAllowed: boolean): CraftWeaponBay[] {
  const groups = new Map<string, CraftWeapon[]>();
  for (const weapon of craftWeapons(record, catalog)) {
    const key = weapon.mount.bay ?? `arc:${weapon.mount.arc}`;
    groups.set(key, [...(groups.get(key) ?? []), weapon]);
  }
  return [...groups.entries()].map(([bay, weapons]) => {
    const unknown: string[] = [];
    let attack = 0;
    let heat = 0;
    const classes = new Set<string>();
    const sizes = new Set<string>();
    for (const { mount, row } of weapons) {
      const figures = mount.equipmentId === null || !catalog ? undefined : (aeroWeaponFigures(catalog, mount.equipmentId, record.editionId) ?? aeroCatalogFigures(catalog, mount.equipmentId));
      const value = figures?.attack;
      if (typeof value === "number") attack += capitalScale(row) ? value * 10 : value;
      else unknown.push(mount.id);
      heat += figures?.heat ?? 0;
      const bayClass = figures?.bayClass ?? row?.bayClass;
      if (bayClass !== undefined) classes.add(bayClass);
      sizes.add(weaponSize(row?.name ?? mount.name));
    }
    attack = roundHalfUp(attack);
    return { bay, arc: weapons[0]?.mount.arc ?? "", weapons: weapons.length, classes: [...classes], sizes: [...sizes], attack, heat: tidy(heat), limit, over: attack > limit, mixedSizesAllowed: mixedAllowed, unknown };
  });
}
/** The heat each arc of the unit's edition makes when all its weapons fire (the figure a large craft's sheet lists for each arc, and the zero-heat rule weighs against the sinks). */
export function heatByArc(record: AeroRecord, catalog?: Catalog): { arc: string; name: string; heat: number }[] {
  return locationsOf(record).arcs.map((arc) => ({
    arc,
    name: aeroLocationName(arc),
    heat: tidy(
      record.mounts
        .filter((m) => m.arc === arc && m.equipmentId !== null)
        .reduce((sum, m) => {
          const id = m.equipmentId ?? "";
          const figures = catalog ? (aeroWeaponFigures(catalog, id, record.editionId) ?? aeroCatalogFigures(catalog, id)) : undefined;
          return sum + (figures?.heat ?? 0);
        }, 0),
    ),
  }));
}
/** The weapon bays: the weapons that share a `bay` id (on a mount without one, the arc), with their classes, sizes, attack and heat against the bay limit. */
export function craftWeaponBays(record: AeroRecord, catalog?: Catalog): CraftWeaponBay[] {
  const limit = figureOf(CRAFT_FIGURES.bayLimit, record.editionId);
  const mixedAllowed = figureOf(CRAFT_FIGURES.mixedSizes, record.editionId);
  return limit === undefined || mixedAllowed === undefined || craftKind(record) === undefined ? [] : baysOf(record, catalog, limit, mixedAllowed);
}

export interface CraftAmmoShortfall {
  /** The bay the weapons are in (the arc where a mount has none). */
  bay: string;
  weaponId: string;
  required: number;
  have: number;
}
/** Weapons that use ammunition and do not have the shots the books ask for (10 for each weapon, 20 for an Ultra autocannon, 60 for a rotary one) in ammunition mounts of the same bay. Capital weapons and ATM special ammunition are not read. */
export function craftAmmoShortfalls(record: AeroRecord, catalog?: Catalog): CraftAmmoShortfall[] {
  const minimum = figureOf(CRAFT_FIGURES.minShots, record.editionId);
  if (!minimum || !catalog || craftKind(record) === undefined) return [];
  const out: CraftAmmoShortfall[] = [];
  const bayOf = (m: AeroMount) => m.bay ?? `arc:${m.arc}`;
  const need = new Map<string, { bay: string; weaponId: string; count: number; each: number; ammo: EquipmentRow }>();
  for (const { mount, row, capital } of craftWeapons(record, catalog)) {
    const ammo = mount.equipmentId === null || capital ? undefined : ammoRowOf(catalog, mount.equipmentId);
    if (!ammo || !row || mount.equipmentId === null) continue;
    const key = `${bayOf(mount)}|${mount.equipmentId}`;
    const each = /rotary/.test(mount.equipmentId) ? minimum.rotary : /ultra/.test(mount.equipmentId) ? minimum.ultra : minimum.shots;
    need.set(key, { bay: bayOf(mount), weaponId: mount.equipmentId, count: (need.get(key)?.count ?? 0) + 1, each, ammo });
  }
  for (const { bay, weaponId, count, each, ammo } of need.values()) {
    const perTon = ammo.shotsPerTon ?? ammo.shots ?? 0;
    const have = tidy(record.mounts.filter((m) => bayOf(m) === bay && m.equipmentId === ammo.id).reduce((sum, m) => sum + (m.amount ?? 1) * perTon, 0));
    if (have < count * each) out.push({ bay, weaponId, required: count * each, have });
  }
  return out;
}

export interface CraftCrew {
  /** The base crew of the craft's kind and use. */
  base: number;
  standardWeapons: number;
  capitalWeapons: number;
  gunners: number;
  /** The base crew plus the gunners. */
  minimum: number;
}
/** The minimum crew: the base (a small craft's own in TechManual, the civilian DropShip row in the AeroTech 2 books) plus a gunner for each six standard weapons (rounded up) and for each capital weapon. An anti-missile system needs no gunner. */
export function craftCrew(record: AeroRecord, catalog?: Catalog): CraftCrew | null {
  const kind = craftKind(record);
  const rule = kind === "small-craft" ? figureOf(CRAFT_FIGURES.smallCraftCrew, record.editionId) : figureOf(CRAFT_FIGURES.crew, record.editionId)?.[craftUse(record)];
  const gunners = figureOf(CRAFT_FIGURES.gunners, record.editionId);
  return !rule || !gunners ? null : crewOf(record, catalog, rule, gunners);
}
/** The base crew by `rule` plus the gunners by `gunners`. */
function crewOf(record: AeroRecord, catalog: Catalog | undefined, rule: { base: number; perTons?: number }, gunners: { standardPer: number; capitalPer: number }): CraftCrew {
  const base = rule.base + (rule.perTons === undefined ? 0 : Math.ceil(tidy(record.tons / rule.perTons)));
  const weapons = craftWeapons(record, catalog).filter((w) => !/^ams-/.test(w.mount.equipmentId ?? ""));
  const capitalWeapons = weapons.filter((w) => w.capital).length;
  const standardWeapons = weapons.length - capitalWeapons;
  const count = Math.ceil(tidy(standardWeapons / gunners.standardPer)) + capitalWeapons * gunners.capitalPer;
  return { base, standardWeapons, capitalWeapons, gunners: count, minimum: base + count };
}

const QUARTERS_ROWS: Record<string, string> = { steerage: "quarters-steerage-is", "second-class": "quarters-second-class-is", "first-class": "quarters-first-class-is" };
/** Quarters mass: each person in `quarters` (keys steerage, second-class, first-class) weighs what the catalog row for that class does (5, 7 and 10 tons, the same in all three editions). A key we do not know is returned in `unknown`. */
export function craftQuarters(record: AeroRecord, catalog?: Catalog): { tons: number; unknown: string[] } {
  const unknown: string[] = [];
  let tons = 0;
  for (const [kind, people] of Object.entries(record.quarters ?? {})) {
    const row = Object.hasOwn(QUARTERS_ROWS, kind) ? catalog?.byId(QUARTERS_ROWS[kind] ?? "") : undefined;
    if (row && typeof row.tons === "number") tons += people * row.tons;
    else unknown.push(kind);
  }
  return { tons: tidy(tons), unknown };
}

/** Transport bay mass: each bay's cubicles (a cargo bay's tons) times what one weighs in the edition. A kind the edition does not print is in `unknown`. */
export function craftBayTons(record: AeroRecord): { tons: number; unknown: string[] } {
  const unknown: string[] = [];
  let tons = 0;
  for (const bay of record.bays ?? []) {
    const figure = craftBayFigure(bay.kind, record.editionId);
    if (figure) tons += bay.capacity * figure.tons;
    else unknown.push(bay.kind);
  }
  return { tons: tidy(tons), unknown };
}

export interface CraftDoors {
  doors: number;
  /** The doors counted against the limit (AeroTech 2 Revised counts only those of bays for launching units). */
  counted: number;
  /** The most doors the edition allows; undefined where its book prints none. */
  limit: number | undefined;
  /** Units launched or landed a turn: two for each door of a bay for 'Mechs, fighters, small craft (and ProtoMechs in TechManual). */
  launchRate: number;
  /** Bay kinds with fewer doors than the edition asks (every bay but an infantry bay needs one in TechManual). */
  withoutDoor: string[];
}
export function craftDoors(record: AeroRecord): CraftDoors | null {
  const kind = craftKind(record);
  const launch = figureOf(CRAFT_FIGURES.launch, record.editionId);
  if (kind === undefined || !launch) return null;
  const rule = figureOf(CRAFT_FIGURES.doors, record.editionId);
  const bays = record.bays ?? [];
  const doors = bays.reduce((sum, b) => sum + b.doors, 0);
  const launching = bays.filter((b) => launch.kinds.includes(b.kind));
  const limit = !rule
    ? undefined
    : rule.fixed !== undefined
      ? rule.fixed
      : kind === "small-craft" && rule.smallCraft
        ? rule.smallCraft[craftShape(record)]
        : (rule.base ?? 0) + (rule.perTons === undefined ? 0 : Math.ceil(tidy(record.tons / rule.perTons)));
  const minimum = rule?.minPerBay;
  return {
    doors,
    counted: rule?.launchCapableOnly === true ? launching.reduce((sum, b) => sum + b.doors, 0) : doors,
    limit,
    launchRate: launch.perDoor * launching.reduce((sum, b) => sum + b.doors, 0),
    withoutDoor: minimum === undefined ? [] : bays.filter((b) => !b.kind.startsWith("infantry") && b.doors < minimum).map((b) => b.kind),
  };
}

export interface CraftTally {
  lines: { label: string; tons: number }[];
  total: number;
  /** The unit's tons less the total: what is left for cargo; negative when overweight. */
  remaining: number;
  /** What could not be weighed: "engine", a bay or quarters kind the edition does not print, or the id of a mount the catalog does not know. */
  unknown: string[];
}
/** The weight of a small craft or DropShip by part: engine, fuel, pumps, structure, controls, armor, heat sinks, weapons and equipment (an escape pod or lifeboat mount weighs what its catalog row does), expanded fire control, ammunition, transport bays and quarters. */
export function craftTally(record: AeroRecord, catalog?: Catalog): CraftTally {
  const unknown: string[] = [];
  const engine = craftEngineTons(record);
  if (engine === null) unknown.push("engine");
  let weapons = 0;
  let ammunition = 0;
  for (const m of record.mounts) {
    const facts = mountFacts(m, record.editionId, catalog);
    if (!facts) unknown.push(m.id);
    else if (facts.ammunition) ammunition += facts.tons;
    else weapons += facts.tons;
  }
  const bays = craftBayTons(record);
  const quarters = craftQuarters(record, catalog);
  unknown.push(...bays.unknown, ...quarters.unknown);
  // A towing adapter (AeroTech 2 p. 47: 100 tons) the record says the vessel carries.
  const adapters = (record.systems?.["towing-adapter"] ?? 0) * (capitalSystemFigure("towing-adapter", record.editionId)?.tons ?? 0);
  const others = capitalSystems(record).lines.filter((l) => l.kind !== "towing-adapter" && l.allowed).reduce((sum, l) => sum + l.tons, 0);
  const c3 = (record.systems?.["naval-c3"] ?? 0) > 0 && capitalSystemFigure("naval-c3", record.editionId) !== undefined;
  const lines = [
    { label: "Engine", tons: engine ?? 0 },
    { label: "Fuel", tons: record.fuelTons },
    { label: "Fuel pumps", tons: craftPumpTons(record) ?? 0 },
    { label: "Structure", tons: craftSiTons(record) ?? 0 },
    { label: "Controls", tons: craftControlTons(record) ?? 0 },
    { label: "Armor", tons: record.armor.tons },
    { label: "Heat sinks", tons: record.heatSinks.count },
    { label: "Weapons and equipment", tons: weapons },
    { label: "Fire control", tons: craftArcs(record, catalog).reduce((sum, a) => sum + a.fireControlTons, 0) * (c3 ? 2 : 1) },
    { label: "Ammunition", tons: ammunition },
    { label: "Transport bays", tons: bays.tons },
    { label: "Quarters", tons: quarters.tons },
    ...(adapters > 0 ? [{ label: "Towing adapter", tons: adapters }] : []),
    ...(others > 0 ? [{ label: "Ship systems", tons: others }] : []),
  ].map((line) => ({ ...line, tons: tidy(line.tons) }));
  const total = tidy(lines.reduce((sum, line) => sum + line.tons, 0));
  return { lines, total, remaining: tidy(record.tons - total), unknown };
}

/** The parts of the record the edition does not offer a small craft or DropShip, kept in the record: "engine" (only the standard engine is built by the Safe Thrust formula), "armor" or "heat-sinks". Empty for a unit that is not one. */
export function craftPartsNotOffered(record: AeroRecord): ("engine" | "armor" | "heat-sinks")[] {
  if (craftKind(record) === undefined) return [];
  const out: ("engine" | "armor" | "heat-sinks")[] = [];
  if (record.engine.type !== "standard") out.push("engine");
  if (!fighterArmorTypes(record.editionId).some((t) => t.id === record.armor.type)) out.push("armor");
  const sinks = kindFigureOf(FIGHTER_FIGURES.heatSinkTypes, "aerospace", record.editionId);
  if (sinks !== undefined && !sinks.includes(record.heatSinks.type)) out.push("heat-sinks");
  return out;
}

// ---- JumpShip, WarShip and space station construction -------------------------------------------------------------------------
// Capital ships in the three editions that build them by these steps (AeroTech 2, AeroTech 2 Revised, the current rules; BattleSpace has its own,
// a later piece). Every figure is read from data/aero.ts (CAPITAL_FIGURES, CAPITAL_ARMOR_TYPES, CAPITAL_SYSTEMS; where an AeroTech 2 book prints
// one rule for DropShips and capital ships, the small craft and DropShip row); this block only does the arithmetic. A figure an edition's book
// does not print, a unit that is not a capital ship and an edition we do not know give null or undefined, never a throw, and nothing is removed
// from a record. Masses are in tons; armor points are capital-scale (one is ten standard points). A JumpShip or station has a station-keeping
// drive and a fixed SI; a WarShip has a maneuvering drive (or, where the edition allows it, a station-keeping one: engine type "station-keeping")
// and chooses its SI. Transport bays and quarters weigh what they do on a DropShip (`craftBayTons`, `craftQuarters`).

export type { CapitalKind };

/** The capital ship kind of a record its edition builds by these steps, or undefined for any other unit or edition. */
export function capitalKind(record: Pick<AeroRecord, "unitType" | "editionId">): CapitalKind | undefined {
  const kind = CAPITAL_KINDS.find((k) => k === record.unitType);
  return kind !== undefined && figureOf(CAPITAL_FIGURES.controlShare, record.editionId)?.[kind] !== undefined ? kind : undefined;
}
const capitalRounding = (record: Pick<AeroRecord, "editionId">) => figureOf(CAPITAL_FIGURES.rounding, record.editionId);

/** Whether the unit moves by a station-keeping drive: every JumpShip and station, and a WarShip whose engine type is "station-keeping" where the edition allows one. */
export function stationKeeping(record: Pick<AeroRecord, "unitType" | "editionId" | "engine">): boolean {
  const kind = capitalKind(record);
  if (kind === undefined) return false;
  return kind !== "warship" || (record.engine.type === "station-keeping" && figureOf(CAPITAL_FIGURES.warshipStationKeeping, record.editionId) === true);
}

/** A WarShip's Max Thrust: Safe Thrust times 1.5, rounded up. A WarShip on a station-keeping drive reads the drive's own Safe Thrust (0.2 x 1.5 = 0.3, up to 1). null for a JumpShip or station (their drive has none) and for any other unit. */
export function capitalMaxThrust(record: AeroRecord): number | null {
  const factor = capitalFigureOf(CAPITAL_FIGURES.maxThrustFactor, record.editionId, FIGHTER_FIGURES.maxThrustFactor);
  const kind = capitalKind(record);
  if (factor === undefined || kind === undefined) return null;
  if (!stationKeeping(record)) return Math.ceil(tidy(record.thrust.safe * factor));
  const drive = figureOf(CAPITAL_FIGURES.stationKeepingThrust, record.editionId);
  return kind === "warship" && drive !== undefined ? Math.ceil(tidy(drive * factor)) : null;
}

/** Engine tons: a station-keeping drive's fixed share of the tons (1.2 percent), or a WarShip's share per point of Safe Thrust (6 percent) times its Safe Thrust. */
export function capitalEngineTons(record: AeroRecord): number | null {
  const engine = figureOf(CAPITAL_FIGURES.engine, record.editionId);
  const rounding = capitalRounding(record);
  if (!engine || !rounding || capitalKind(record) === undefined) return null;
  return roundMass(record.tons * (stationKeeping(record) ? engine.stationKeeping : engine.perThrust * record.thrust.safe), rounding.engine);
}

/** The SI a WarShip may choose: at least its Max Thrust, at most 30 times it. null for a JumpShip or station (their SI is fixed) and a WarShip with no Max Thrust. */
export function capitalSiRange(record: AeroRecord): { min: number; max: number } | null {
  const max = capitalMaxThrust(record);
  const range = capitalFigureOf(CAPITAL_FIGURES.siRange, record.editionId, CRAFT_FIGURES.siRange);
  return capitalKind(record) !== "warship" || max === null || !range ? null : { min: max * range.min, max: max * range.max };
}
/** The SI: a JumpShip's or station's fixed value (a chosen `si` is not read); a WarShip's chosen one, else its minimum. */
export function capitalSI(record: AeroRecord): number | null {
  const kind = capitalKind(record);
  if (kind === undefined) return null;
  if (kind !== "warship") return figureOf(CAPITAL_FIGURES.fixedSi, record.editionId) ?? null;
  return typeof record.si === "number" ? record.si : (capitalSiRange(record)?.min ?? null);
}
/** Structural mass: a JumpShip's tons over 150, a station's over 100, a WarShip's SI times its tons over 1,000. */
export function capitalSiTons(record: AeroRecord): number | null {
  const kind = capitalKind(record);
  const si = capitalSI(record);
  const divisors = figureOf(CAPITAL_FIGURES.siMass, record.editionId);
  const rounding = capitalRounding(record);
  if (kind === undefined || si === null || !divisors || !rounding) return null;
  return roundMass((kind === "warship" ? (si * record.tons) / divisors.warship : record.tons / divisors[kind]) * (1 + towingShare(record)), rounding.si);
}

export interface CapitalDrive {
  tons: number;
  integrity: number;
}
/** Whether a WarShip mounts the sub-compact K-F drive (its record lists one in `systems`, and the edition prints it). */
export function subCompact(record: Pick<AeroRecord, "systems" | "editionId" | "unitType">): boolean {
  return record.unitType === "warship" && (record.systems?.["sub-compact-kf-drive"] ?? 0) > 0 && capitalSystemFigure("sub-compact-kf-drive", record.editionId) !== undefined;
}

/** The K-F drive: a JumpShip's standard drive (95 percent of the tons) or a WarShip's compact one (45.25 percent, or half the tons with the sub-compact drive), and its integrity. null for a station or any other unit. */
export function kfDrive(record: AeroRecord): CapitalDrive | null {
  const kind = capitalKind(record);
  const kf = figureOf(CAPITAL_FIGURES.kfDrive, record.editionId);
  const rounding = capitalRounding(record);
  if (!kf || !rounding || (kind !== "jumpship" && kind !== "warship")) return null;
  const figure = kind === "warship" && subCompact(record) ? { ...kf.warship, share: figureOf(CAPITAL_FIGURES.subCompactShare, record.editionId) ?? kf.warship.share } : kf[kind];
  const tons = roundMass(record.tons * figure.share, rounding.drive);
  return { tons, integrity: roundMass(figure.integrityBase + tons / figure.integrityPer, rounding.integrity) };
}

/** Whether a station carries an energy collection sail: when its systems list one, or (where the edition asks it) when it has energy storage batteries. */
function stationHasSail(record: AeroRecord): boolean {
  const rule = figureOf(CAPITAL_FIGURES.stationSail, record.editionId);
  const systems = record.systems ?? {};
  return (systems["jump-sail"] ?? 0) > 0 || (rule === "with-batteries" && (systems["energy-storage-battery"] ?? 0) > 0);
}
/** The jump sail and its integrity: every JumpShip and WarShip, and a station that carries one (a JumpShip's sail of the same tons). null otherwise. */
export function jumpSail(record: AeroRecord): CapitalDrive | null {
  const kind = capitalKind(record);
  const kf = figureOf(CAPITAL_FIGURES.kfDrive, record.editionId);
  const integrity = figureOf(CAPITAL_FIGURES.sailIntegrity, record.editionId);
  const rounding = capitalRounding(record);
  if (!kf || !integrity || !rounding || kind === undefined) return null;
  const figure = kind === "space-station" ? (stationHasSail(record) ? kf.jumpship : undefined) : kf[kind];
  if (!figure) return null;
  const tons = roundMass(figure.sailBase + record.tons / figure.sailPer, rounding.drive);
  return { tons, integrity: roundMass(integrity.base + tons / integrity.per, rounding.integrity) };
}

/** Control systems: a quarter percent of the tons (JumpShip, WarShip), a tenth of a percent (station). */
export function capitalControlTons(record: AeroRecord): number | null {
  const kind = capitalKind(record);
  const share = kind && figureOf(CAPITAL_FIGURES.controlShare, record.editionId)?.[kind];
  const rounding = capitalRounding(record);
  return share === undefined || !rounding ? null : roundMass(record.tons * share, rounding.controls);
}

/** Fuel points: the fuel tons times the points a ton gives at the unit's tons. null where the edition prints no rows for the unit's type (JumpShips and stations in the AeroTech 2 books). */
export function capitalFuelPoints(record: AeroRecord): number | null {
  const kind = capitalKind(record);
  const band = kind && figureOf(CAPITAL_FIGURES.fuelBands, record.editionId)?.[kind]?.filter(([from]) => record.tons >= from).at(-1);
  return band === undefined ? null : tidy(record.fuelTons * band[1]);
}
/** Fuel pumps: 2 percent of the fuel (in the current rules the fuel and pumps together round up to a whole ton). */
export function capitalPumpTons(record: AeroRecord): number | null {
  const share = capitalFigureOf(CAPITAL_FIGURES.pumpShare, record.editionId, CRAFT_FIGURES.pumpShare);
  const rounding = capitalRounding(record);
  if (share === undefined || !rounding || capitalKind(record) === undefined) return null;
  return rounding.pumps === "total-up-whole" ? tidy(Math.ceil(tidy(record.fuelTons * (1 + share))) - record.fuelTons) : roundMass(record.fuelTons * share, rounding.pumps);
}

export interface CapitalArmor {
  /** Capital-scale points a ton of the record's armor at the unit's tons and tech base. */
  perTon: number | null;
  /** Points the armor tons give, by the edition's rounding. */
  bought: number | null;
  /** The free armor on each facing: the SI over 10, rounded to the nearest whole number. */
  freePerFacing: number;
  free: number;
  available: number | null;
  /** The sum of the points set on the armor locations (the free armor included, as the sheet shows it). */
  allocated: number;
  over: number | null;
  /** The most armor tons the structural mass allows (the free armor is outside it); null where the edition prints no limit for the type (a station in the AeroTech 2 books). */
  limitTons: number | null;
  tonsOver: number | null;
}
export function capitalArmor(record: AeroRecord): CapitalArmor | null {
  const kind = capitalKind(record);
  const si = capitalSI(record);
  const siTons = capitalSiTons(record);
  const rounding = capitalRounding(record);
  const divisor = figureOf(CAPITAL_FIGURES.freeArmorDivisor, record.editionId);
  if (kind === undefined || si === null || siTons === null || !rounding || divisor === undefined) return null;
  const perTon = capitalArmorPointsPerTon(record.armor.type, record.editionId, record.tons, record.techBase) ?? null;
  const points = perTon === null ? null : tidy(record.armor.tons * perTon);
  const rule = capitalFigureOf(CAPITAL_FIGURES.armorRounding, record.editionId, FIGHTER_FIGURES.armorRounding);
  const bought = points === null ? null : rule === "nearest" ? roundHalfUp(points) : Math.floor(points);
  const freePerFacing = Math.max(0, roundHalfUp(tidy(si / divisor)));
  const free = freePerFacing * locationsOf(record).armor.length;
  const allocated = Object.values(record.armor.points).reduce((sum, n) => sum + n, 0);
  const available = bought === null ? null : bought + free;
  const limit = figureOf(CAPITAL_FIGURES.armorLimit, record.editionId)?.[kind];
  const limitTons = limit === undefined ? null : roundMass(siTons / limit.divide + (limit.add ?? 0), rounding.armorLimit);
  return { perTon, bought, freePerFacing, free, available, allocated, over: available === null ? null : allocated - available, limitTons, tonsOver: limitTons === null ? null : tidy(record.armor.tons - limitTons) };
}

/** Heat sinks: 45 plus the square root of twice the engine's tons free (rounded down), and the added ones a ton each, a double one dissipating two. */
export function capitalHeat(record: AeroRecord): FighterHeat | null {
  const rule = figureOf(CAPITAL_FIGURES.freeSinks, record.editionId);
  const engine = capitalEngineTons(record);
  if (!rule || engine === null) return null;
  const free = Math.floor(tidy(rule.base + Math.sqrt(engine * rule.root)));
  const total = free + record.heatSinks.count;
  return { free, added: record.heatSinks.count, total, capacity: total * (record.heatSinks.type === "double" ? 2 : 1) };
}

/** Each arc's weapons against its limit (12 a JumpShip, 20 a WarShip or station) and the fire control it needs past it: a tenth of the arc's weapon tons for each whole multiple of the limit. Empty for any other unit. */
export function capitalArcs(record: AeroRecord, catalog?: Catalog): CraftArc[] {
  const kind = capitalKind(record);
  const limit = kind && figureOf(CAPITAL_FIGURES.arcLimit, record.editionId)?.[kind];
  const share = capitalFigureOf(CAPITAL_FIGURES.fireControlShare, record.editionId, CRAFT_FIGURES.fireControlShare);
  const rounding = capitalRounding(record);
  if (limit === undefined || share === undefined || !rounding) return [];
  return arcsOf(record, catalog, limit, (n, tons) => (n <= limit ? 0 : roundMass(Math.floor(n / limit) * share * tons, rounding.fireControl)));
}
/** The arc pairs that must hold the same weapons and do not: the fore-sides, the broadsides and the aft-sides. */
export function capitalArcsUnmatched(record: AeroRecord, catalog?: Catalog): string[] {
  const pairs = figureOf(CAPITAL_FIGURES.matchedArcs, record.editionId);
  return !pairs || capitalKind(record) === undefined ? [] : unmatchedOf(record, catalog, pairs);
}
/** The weapon bays, as for a DropShip: classes, sizes, attack against 700 standard (70 capital) and heat. */
export function capitalWeaponBays(record: AeroRecord, catalog?: Catalog): CraftWeaponBay[] {
  const limit = capitalFigureOf(CAPITAL_FIGURES.bayLimit, record.editionId, CRAFT_FIGURES.bayLimit);
  const mixed = capitalFigureOf(CAPITAL_FIGURES.mixedSizes, record.editionId, CRAFT_FIGURES.mixedSizes);
  return limit === undefined || mixed === undefined || capitalKind(record) === undefined ? [] : baysOf(record, catalog, limit, mixed);
}

/** The minimum crew: the type's base (JumpShip 6 plus one per 20,000 tons, WarShip and station 45 plus one per 5,000, rounded up) plus the gunners. */
export function capitalCrew(record: AeroRecord, catalog?: Catalog): CraftCrew | null {
  const kind = capitalKind(record);
  const rule = kind && figureOf(CAPITAL_FIGURES.crew, record.editionId)?.[kind];
  const gunners = capitalFigureOf(CAPITAL_FIGURES.gunners, record.editionId, CRAFT_FIGURES.gunners);
  return !rule || !gunners ? null : crewOf(record, catalog, rule, gunners);
}

/** The most of a ship system the unit may carry: the edition's fixed most, or one for each 50,000 tons of the unit (rounded as the edition rounds), else undefined (no limit printed). */
export function capitalSystemLimit(kind: string, record: Pick<AeroRecord, "editionId" | "tons">): number | undefined {
  const figure = capitalSystemFigure(kind, record.editionId);
  if (!figure) return undefined;
  if (figure.max !== undefined) return figure.max;
  if (figure.perTons === undefined) return undefined;
  if (figure.minTons !== undefined && record.tons < figure.minTons) return 0;
  const n = tidy(record.tons / figure.perTons);
  return figure.round === "up" ? Math.ceil(n) : Math.floor(n);
}

export interface CapitalSystemLine {
  kind: string;
  count: number;
  tons: number;
  limit: number | undefined;
  /** Whether the edition lets the unit's type carry it. */
  allowed: boolean;
}
/** The ship systems in `systems`: each one's mass (a share of the unit's tons for a lithium-fusion battery; a station's sail is weighed by `jumpSail`), limit and whether the type may carry it. A kind the edition does not print is in `unknown`. */
export function capitalSystems(record: AeroRecord): { lines: CapitalSystemLine[]; tons: number; unknown: string[] } {
  // A DropShip may carry the few systems the book lists it for (a Naval C3, the AeroTech 2 towing adapter).
  const kind = capitalKind(record) ?? (record.unitType === "dropship" ? "dropship" : undefined);
  const lines: CapitalSystemLine[] = [];
  const unknown: string[] = [];
  for (const [system, count] of Object.entries(record.systems ?? {})) {
    const figure = capitalSystemFigure(system, record.editionId);
    if (!figure || kind === undefined) {
      unknown.push(system);
      continue;
    }
    const each = figure.tons ?? (figure.share === undefined ? 0 : record.tons * figure.share);
    const tons = figure.wholeTons === true ? Math.ceil(tidy(count * each)) : tidy(count * each);
    lines.push({ kind: system, count, tons, limit: capitalSystemLimit(system, record), allowed: figure.types.includes(kind) });
  }
  return { lines, tons: tidy(lines.reduce((sum, l) => sum + l.tons, 0)), unknown };
}

/**
 * The docking collars a unit counts against its most: its hardpoints, two for each naval repair facility it mounts (one of each kind; TO:AUE p. 146) and two for each DropShuttle bay
 * (IO:AE p. 113).
 */
export function collarTotal(record: AeroRecord): number {
  let total = record.systems?.["docking-hardpoint"] ?? 0;
  for (const [system, count] of Object.entries(record.systems ?? {})) {
    const collars = capitalSystemFigure(system, record.editionId)?.collars;
    if (collars !== undefined && count > 0) total += collars;
  }
  return total + 2 * record.mounts.filter((m) => m.equipmentId === "dropshuttle-bay-is").length;
}

/** Bay doors against the edition's most (by type in the current rules; AeroTech 2 Revised's 8 launch doors; AeroTech 2 prints none) and the launch rate. In the current rules a unit with a transport bay needs a door; `withoutDoor` then lists its bays. */
export function capitalDoors(record: AeroRecord): CraftDoors | null {
  const kind = capitalKind(record);
  const launch = capitalFigureOf(CAPITAL_FIGURES.launch, record.editionId, CRAFT_FIGURES.launch);
  if (kind === undefined || !launch) return null;
  const capital = figureOf(CAPITAL_FIGURES.doors, record.editionId);
  const craft = figureOf(CRAFT_FIGURES.doors, record.editionId);
  const bays = record.bays ?? [];
  const doors = bays.reduce((sum, b) => sum + b.doors, 0);
  const launchingDoors = bays.filter((b) => launch.kinds.includes(b.kind)).reduce((sum, b) => sum + b.doors, 0);
  const rule = capital?.byKind[kind];
  const limit = rule ? rule.base + Math.ceil(tidy(record.tons / rule.perTons)) : craft?.fixed;
  return {
    doors,
    counted: !capital && craft?.launchCapableOnly === true ? launchingDoors : doors,
    limit,
    launchRate: launch.perDoor * launchingDoors,
    withoutDoor: capital && bays.length > 0 && doors < capital.unitMinimum ? bays.map((b) => b.kind) : [],
  };
}

/** The weight of a JumpShip, WarShip or station by part: engine, K-F drive, sail, structure, controls, fuel and pumps, armor, heat sinks, weapons and equipment (lifeboats and escape pods weigh their catalog rows), fire control, ammunition, transport bays, quarters and ship systems. */
export function capitalTally(record: AeroRecord, catalog?: Catalog): CraftTally {
  const unknown: string[] = [];
  const engine = capitalEngineTons(record);
  if (engine === null) unknown.push("engine");
  let weapons = 0;
  let ammunition = 0;
  for (const m of record.mounts) {
    const facts = mountFacts(m, record.editionId, catalog);
    if (!facts) unknown.push(m.id);
    else if (facts.ammunition) ammunition += facts.tons;
    else weapons += facts.tons;
  }
  const bays = craftBayTons(record);
  const quarters = craftQuarters(record, catalog);
  const systems = capitalSystems(record);
  unknown.push(...bays.unknown, ...quarters.unknown, ...systems.unknown);
  const lines = [
    { label: "Engine", tons: engine ?? 0 },
    { label: "K-F drive", tons: kfDrive(record)?.tons ?? 0 },
    { label: "Jump sail", tons: jumpSail(record)?.tons ?? 0 },
    { label: "Structure", tons: capitalSiTons(record) ?? 0 },
    { label: "Controls", tons: capitalControlTons(record) ?? 0 },
    { label: "Fuel", tons: record.fuelTons },
    { label: "Fuel pumps", tons: capitalPumpTons(record) ?? 0 },
    { label: "Armor", tons: record.armor.tons },
    { label: "Heat sinks", tons: record.heatSinks.count },
    { label: "Weapons and equipment", tons: weapons },
    // A Naval C3 network doubles the weight of the fire control (TO:AUE p. 144).
    { label: "Fire control", tons: capitalArcs(record, catalog).reduce((sum, a) => sum + a.fireControlTons, 0) * ((record.systems?.["naval-c3"] ?? 0) > 0 && capitalSystemFigure("naval-c3", record.editionId) !== undefined ? 2 : 1) },
    { label: "Ammunition", tons: ammunition },
    { label: "Transport bays", tons: bays.tons },
    { label: "Quarters", tons: quarters.tons },
    { label: "Ship systems", tons: systems.tons },
  ].map((line) => ({ ...line, tons: tidy(line.tons) }));
  const total = tidy(lines.reduce((sum, line) => sum + line.tons, 0));
  return { lines, total, remaining: tidy(record.tons - total), unknown };
}

/** The parts of the record the edition does not offer a capital ship, kept in the record: "engine" (a station-keeping or maneuvering drive only; a WarShip's station-keeping drive where the edition allows it), "armor" (the four capital armor types) or "heat-sinks". Empty for any other unit. */
export function capitalPartsNotOffered(record: AeroRecord): ("engine" | "armor" | "heat-sinks")[] {
  const kind = capitalKind(record);
  if (kind === undefined) return [];
  const out: ("engine" | "armor" | "heat-sinks")[] = [];
  const engines = kind !== "warship" || figureOf(CAPITAL_FIGURES.warshipStationKeeping, record.editionId) === true ? ["standard", "station-keeping"] : ["standard"];
  if (!engines.includes(record.engine.type)) out.push("engine");
  if (!CAPITAL_ARMOR_TYPES.some((t) => t.id === record.armor.type && t.editions.includes(record.editionId))) out.push("armor");
  const sinks = kindFigureOf(FIGHTER_FIGURES.heatSinkTypes, "aerospace", record.editionId);
  if (sinks !== undefined && !sinks.includes(record.heatSinks.type)) out.push("heat-sinks");
  return out;
}

/** The ship system kinds an edition prints (for the editor's list). */
export function capitalSystemsFor(editionId: string): { kind: string; label: string }[] {
  return CAPITAL_SYSTEMS.filter((row) => figureOf(row.figures, editionId) !== undefined).map(({ kind, label }) => ({ kind, label }));
}

// ---- One reading for every vessel ---------------------------------------------------------------------------------------------
// A small craft, DropShip, JumpShip, WarShip or station is built by the same steps with different figures. The editor, the rules check and the
// record sheet read them through these, so each asks one question (what is the tally of this unit?) and never branches on the kind itself.

export type VesselGroup = "craft" | "capital";
/** Which family of figures the record is built by: the small craft and DropShip rows, the capital ship rows, or undefined (a fighter, an unknown type, an edition that builds neither). */
export function vesselGroup(record: Pick<AeroRecord, "unitType" | "editionId">): VesselGroup | undefined {
  return craftKind(record) !== undefined ? "craft" : capitalKind(record) !== undefined ? "capital" : undefined;
}

export interface VesselArmor {
  perTon: number | null;
  bought: number | null;
  free: number;
  available: number | null;
  allocated: number;
  over: number | null;
  limitTons: number | null;
  tonsOver: number | null;
}

/** Every derived figure of a small craft, DropShip or capital ship, read from the right group. */
export interface Vessel {
  group: VesselGroup;
  maxThrust: number | null;
  engineTons: number | null;
  siRange: { min: number; max: number } | null;
  si: number | null;
  siTons: number | null;
  controlTons: number | null;
  fuelPoints: number | null;
  pumpTons: number | null;
  armor: VesselArmor | null;
  heat: FighterHeat | null;
  arcs: CraftArc[];
  unmatched: string[];
  bays: CraftWeaponBay[];
  crew: CraftCrew | null;
  doors: CraftDoors | null;
  tally: CraftTally;
  notOffered: ("engine" | "armor" | "heat-sinks")[];
}
/** The unit read as a vessel, or null for a fighter, an unknown type and an edition that builds neither group. */
export function vessel(record: AeroRecord, catalog?: Catalog): Vessel | null {
  const group = vesselGroup(record);
  if (group === "craft") {
    return {
      group,
      maxThrust: craftMaxThrust(record),
      engineTons: craftEngineTons(record),
      siRange: craftSiRange(record),
      si: craftSI(record),
      siTons: craftSiTons(record),
      controlTons: craftControlTons(record),
      fuelPoints: craftFuelPoints(record),
      pumpTons: craftPumpTons(record),
      armor: craftArmor(record),
      heat: craftHeat(record),
      arcs: craftArcs(record, catalog),
      unmatched: craftArcsUnmatched(record, catalog),
      bays: craftWeaponBays(record, catalog),
      crew: craftCrew(record, catalog),
      doors: craftDoors(record),
      tally: craftTally(record, catalog),
      notOffered: craftPartsNotOffered(record),
    };
  }
  if (group === "capital") {
    return {
      group,
      maxThrust: capitalMaxThrust(record),
      engineTons: capitalEngineTons(record),
      siRange: capitalSiRange(record),
      si: capitalSI(record),
      siTons: capitalSiTons(record),
      controlTons: capitalControlTons(record),
      fuelPoints: capitalFuelPoints(record),
      pumpTons: capitalPumpTons(record),
      armor: capitalArmor(record),
      heat: capitalHeat(record),
      arcs: capitalArcs(record, catalog),
      unmatched: capitalArcsUnmatched(record, catalog),
      bays: capitalWeaponBays(record, catalog),
      crew: capitalCrew(record, catalog),
      doors: capitalDoors(record),
      tally: capitalTally(record, catalog),
      notOffered: capitalPartsNotOffered(record),
    };
  }
  return null;
}
