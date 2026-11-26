// The aerospace record (AeroTech, every edition) and the pure functions over it. One record serves every aerospace unit in every
// edition: a unit is built under one edition (`editionId`) and the edition decides which unit types, locations and parts it
// offers. A record is plain data; there is no class. Nothing here throws on a record it does not understand: a unit type, arc or
// armor location the edition does not know is kept as it is, and keys this version does not know are kept too, so a record
// written by a later version survives a round trip through this one.
import { RULES_LEVELS } from "../data/chassis";
import type { RulesLevel } from "../data/chassis";
import { AERO_LOCATION_NAMES, DEFAULT_AERO_EDITION, aeroFigures, aeroTypesFor } from "../data/aero";
import type { AeroShape, AeroType } from "../data/aero";
import type { OfficialMark, TechBase } from "./mech";

export type { AeroShape, AeroType };
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
