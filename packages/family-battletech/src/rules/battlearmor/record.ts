// The battle armor record (Classic BattleTech) and the pure functions that make and read it. One record is one suit design and the squad or
// Point it fields: the chassis, motive system, manipulators, armor and the items in its locations. A record is plain data; there is no class.
// Nothing here throws on a record it does not understand: a weight class, armor type or manipulator this version does not know is kept as it
// is, and keys it does not know are kept too, so a record written by a later version survives a round trip through this one.
import { RULES_LEVELS } from "../../data/chassis";
import type { RulesLevel } from "../../data/chassis";
import { SQUAD } from "../../data/battlearmor";
import type { BaLocation, Body, MotiveKind, WeightClassId } from "../../data/battlearmor";
import { DEFAULT_EDITION } from "../../data/editions";
import type { OfficialMark } from "../mech";

export type BaTechBase = "inner-sphere" | "clan";

/** One item in a location of the suit. `equipmentId` is the catalog row, null when the item is not in our table. */
export interface BaMount {
  id: string;
  equipmentId: string | null;
  name: string;
  location: BaLocation | (string & {});
  /** Missile launchers and Narc: the shots of ammunition carried (one slot for each four, in the same location). */
  shots?: number;
  /** The munition chosen for a mine dispenser: a catalog row id (rules/munitions.ts). Absent reads as the standard mine. */
  munition?: string;
}

export interface BaRecord {
  schema: 1;
  id: string;
  /** The edition the unit is built under: the play book is the same for every suit, construction is TechManual. */
  editionId: string;
  name: { chassis: string; model: string };
  unitType: "battlearmor";
  techBase: BaTechBase;
  year: number | null;
  era?: string;
  rulesLevel?: RulesLevel;
  /** A WeightClassId; any other string is kept and offers nothing. */
  weightClass: WeightClassId | (string & {});
  body: Body;
  /** Troopers in the squad (Inner Sphere) or Point (Clan): one to six. */
  troopers: number;
  /** Ground MP in all, free ones included. */
  ground: number;
  /** The non-ground motive system and its MP (jump boosters add to jump MP through their mounts). */
  motive: { kind: "none" | MotiveKind | (string & {}); mp: number };
  /** The manipulator in each arm (a MANIPULATORS id); a quad has none. */
  manipulators: { la: string; ra: string };
  /** Armor points per trooper, not counting the trooper's own point. `slots` says where the armor's weapon slots are taken, by location; absent means all in the body. */
  armor: { type: string; points: number; slots?: Partial<Record<BaLocation, number>> };
  mounts: BaMount[];
  /** The squad's skills as the record sheet prints them. */
  skills: { gunnery: number; antiMech: number };
  official?: OfficialMark;
  notes: Record<string, string>;
  picture?: { dataUrl: string };
}

export interface NewBaFields {
  id?: string;
  chassis?: string;
  model?: string;
  techBase?: BaTechBase;
  year?: number | null;
  era?: string;
  rulesLevel?: RulesLevel;
  weightClass: WeightClassId;
  body?: Body;
  troopers?: number;
}

/** A bare suit to build on: the free ground MP, no non-ground motive, no manipulators, standard armor at no points and no equipment. The rules check says what it lacks. */
export function newBaRecord(fields: NewBaFields, editionId: string = DEFAULT_EDITION): BaRecord {
  const techBase = fields.techBase ?? "inner-sphere";
  const body = fields.body ?? "humanoid";
  return {
    schema: 1,
    id: fields.id ?? crypto.randomUUID(),
    editionId,
    name: { chassis: fields.chassis ?? "", model: fields.model ?? "" },
    unitType: "battlearmor",
    techBase,
    year: fields.year ?? null,
    ...(fields.era === undefined ? {} : { era: fields.era }),
    ...(fields.rulesLevel === undefined ? {} : { rulesLevel: fields.rulesLevel }),
    weightClass: fields.weightClass,
    body,
    troopers: fields.troopers ?? SQUAD.recommended[techBase],
    ground: body === "quad" ? 2 : 1,
    motive: { kind: "none", mp: 0 },
    manipulators: { la: "none", ra: "none" },
    armor: { type: "standard", points: 0 },
    mounts: [],
    skills: { gunnery: 4, antiMech: 5 },
    notes: {},
  };
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

function part<T>(v: unknown, known: readonly (keyof T & string)[], fill: (o: Record<string, unknown>) => T): T {
  const o = isObject(v) ? v : {};
  return { ...unknownKeys(o, known), ...fill(o) };
}

const MOUNT_KEYS = ["id", "equipmentId", "name", "location", "shots", "munition"] as const;
function mountOf(v: Record<string, unknown>, index: number): BaMount {
  const mount: BaMount = {
    ...unknownKeys(v, MOUNT_KEYS),
    id: str(v.id, `mount-${String(index + 1)}`),
    equipmentId: isString(v.equipmentId) ? v.equipmentId : null,
    name: str(v.name, ""),
    location: str(v.location, "body"),
  };
  if (isNumber(v.shots)) mount.shots = v.shots;
  if (isString(v.munition)) mount.munition = v.munition;
  return mount;
}

function officialOf(v: unknown): OfficialMark | undefined {
  if (!isObject(v) || (v.status !== "official" && v.status !== "not-official")) return undefined;
  const mark: OfficialMark = { status: v.status };
  if (isString(v.book)) mark.book = v.book;
  if (isNumber(v.page)) mark.page = v.page;
  if (isString(v.design)) mark.design = v.design;
  return mark;
}

const RECORD_KEYS = ["schema", "id", "editionId", "name", "unitType", "techBase", "year", "era", "rulesLevel", "weightClass", "body", "troopers", "ground", "motive", "manipulators", "armor", "mounts", "skills", "official", "notes", "picture"] as const;

/**
 * Reads a record from storage, a file or an import. Every field this version knows is filled with its default where it is missing or not of
 * its kind; unknown classes, types and locations are kept; keys this version does not know are kept as they are. Undefined only for what is not
 * a record at all: not an object, or a schema other than 1 (a later version's record, which this version must not rewrite). `fallbackId` is the
 * id of a record that has none (its storage key, or a fresh one).
 */
export function withDefaults(value: unknown, fallbackId = ""): BaRecord | undefined {
  if (!isObject(value) || (value.schema !== undefined && value.schema !== 1)) return undefined;
  const v = value;
  const slots = isObject(v.armor) && isObject(v.armor.slots) ? (Object.fromEntries(Object.entries(v.armor.slots).filter(([, n]) => isNumber(n))) as Partial<Record<BaLocation, number>>) : undefined;
  const record: BaRecord = {
    ...unknownKeys(v, RECORD_KEYS),
    schema: 1,
    id: str(v.id, fallbackId),
    editionId: str(v.editionId, DEFAULT_EDITION),
    name: part<BaRecord["name"]>(v.name, ["chassis", "model"], (o) => ({ chassis: str(o.chassis, ""), model: str(o.model, "") })),
    unitType: "battlearmor",
    techBase: v.techBase === "clan" ? "clan" : "inner-sphere",
    year: isNumber(v.year) ? v.year : null,
    weightClass: str(v.weightClass, "light"),
    body: v.body === "quad" ? "quad" : "humanoid",
    troopers: num(v.troopers, 4),
    ground: num(v.ground, 1),
    motive: part<BaRecord["motive"]>(v.motive, ["kind", "mp"], (o) => ({ kind: str(o.kind, "none"), mp: num(o.mp, 0) })),
    manipulators: part<BaRecord["manipulators"]>(v.manipulators, ["la", "ra"], (o) => ({ la: str(o.la, "none"), ra: str(o.ra, "none") })),
    armor: part<BaRecord["armor"]>(v.armor, ["type", "points", "slots"], (o) => ({ type: str(o.type, "standard"), points: num(o.points, 0), ...(slots ? { slots } : {}) })),
    mounts: Array.isArray(v.mounts) ? v.mounts.filter(isObject).map(mountOf) : [],
    skills: part<BaRecord["skills"]>(v.skills, ["gunnery", "antiMech"], (o) => ({ gunnery: num(o.gunnery, 4), antiMech: num(o.antiMech, 5) })),
    notes: isObject(v.notes) ? (Object.fromEntries(Object.entries(v.notes).filter(([, n]) => isString(n))) as Record<string, string>) : {},
  };
  if (isString(v.era)) record.era = v.era;
  if (RULES_LEVELS.some((l) => l.id === v.rulesLevel)) record.rulesLevel = v.rulesLevel as RulesLevel;
  const official = officialOf(v.official);
  if (official) record.official = official;
  if (isObject(v.picture) && isString(v.picture.dataUrl)) record.picture = { dataUrl: v.picture.dataUrl };
  return record;
}
