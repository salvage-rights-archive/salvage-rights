// The ProtoMech record (Classic BattleTech) and its reading from storage. A record is plain data; there is no class. Nothing here throws on a
// record it does not understand: a location or item we do not know is kept as it is, and keys this version does not know are kept too, so a
// record written by a later version survives a round trip through this one. A saved unit is one ProtoMech design; a Point (up to five on one
// sheet, Total Warfare) is a list of saved designs, made on the sheet page.
import { RULES_LEVELS } from "../../data/chassis";
import type { RulesLevel } from "../../data/chassis";
import { DEFAULT_EDITION } from "../../data/editions";
import { PROTO_CODES, PROTO_WEIGHT } from "../../data/protomech";
import type { OfficialMark } from "../mech";

/** One weapon or item on the unit. `location` is a ProtoMech location code; a code we do not know is kept (the rules check reports it). */
export interface ProtoMount {
  id: string;
  /** The catalog row (a launcher's is its family's row); null when the item is not in our table. */
  equipmentId: string | null;
  name: string;
  location: string;
  /** Fires to the rear: only a torso weapon may. */
  rear?: true;
  /** A missile launcher: the tubes it has (ProtoMechs build launchers of any size up to their kind's most). */
  tubes?: number;
  /** Ammunition carried for it, in shots (a launcher's shot is one volley). */
  shots?: number;
}

export interface ProtoRecord {
  schema: 1;
  id: string;
  /** The edition whose play book the unit is read under (Total Warfare or the Core Rulebook); construction is TechManual in both. */
  editionId: string;
  name: { chassis: string; model: string };
  unitType: "protomech";
  /** ProtoMechs are built with Clan technology only (TechManual p. 80); any other value is kept and reported. */
  techBase: string;
  year: number | null;
  era?: string;
  rulesLevel?: RulesLevel;
  tons: number;
  walk: number;
  jump: number;
  /** The ProtoMech Myomer Booster (a Running MP of twice the Walking MP). */
  booster: boolean;
  /** The optional main gun mount: it gives structure and armor locations of its own. */
  mainGun: boolean;
  heatSinks: number;
  /** Armor points by location code. */
  armor: Record<string, number>;
  mounts: ProtoMount[];
  official?: OfficialMark;
  notes: Record<string, string>;
  picture?: { dataUrl: string };
}

export interface NewProtoFields {
  id?: string;
  chassis?: string;
  model?: string;
  tons?: number;
  walk?: number;
  year?: number | null;
  era?: string;
  rulesLevel?: RulesLevel;
  editionId?: string;
}

/** A bare ProtoMech to build on: nothing but the chassis, an engine for the walking speed, no jump, no heat sinks, no armor and no equipment. */
export function newProtoRecord(fields: NewProtoFields = {}): ProtoRecord {
  const record: ProtoRecord = {
    schema: 1,
    id: fields.id ?? crypto.randomUUID(),
    editionId: fields.editionId ?? DEFAULT_EDITION,
    name: { chassis: fields.chassis ?? "", model: fields.model ?? "" },
    unitType: "protomech",
    techBase: "clan",
    year: fields.year ?? null,
    tons: fields.tons ?? PROTO_WEIGHT.min,
    walk: fields.walk ?? 1,
    jump: 0,
    booster: false,
    mainGun: false,
    heatSinks: 0,
    armor: Object.fromEntries(PROTO_CODES.map((code) => [code, 0])),
    mounts: [],
    notes: {},
  };
  if (fields.era !== undefined) record.era = fields.era;
  if (fields.rulesLevel !== undefined) record.rulesLevel = fields.rulesLevel;
  return record;
}

// ---- Reading a record ---------------------------------------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const str = (v: unknown, fallback: string) => (isString(v) ? v : fallback);
const num = (v: unknown, fallback: number) => (isNumber(v) ? v : fallback);
const unknownKeys = (v: Record<string, unknown>, known: readonly string[]): Record<string, unknown> => Object.fromEntries(Object.entries(v).filter(([k]) => !known.includes(k)));

const MOUNT_KEYS = ["id", "equipmentId", "name", "location", "rear", "tubes", "shots"] as const;
function mountOf(v: Record<string, unknown>, index: number): ProtoMount {
  const mount: ProtoMount = {
    ...unknownKeys(v, MOUNT_KEYS),
    id: str(v.id, `mount-${String(index + 1)}`),
    equipmentId: isString(v.equipmentId) ? v.equipmentId : null,
    name: str(v.name, ""),
    location: str(v.location, ""),
  };
  if (v.rear === true) mount.rear = true;
  if (isNumber(v.tubes)) mount.tubes = v.tubes;
  if (isNumber(v.shots)) mount.shots = v.shots;
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

const RECORD_KEYS = ["schema", "id", "editionId", "name", "unitType", "techBase", "year", "era", "rulesLevel", "tons", "walk", "jump", "booster", "mainGun", "heatSinks", "armor", "mounts", "official", "notes", "picture"] as const;

/**
 * Reads a record from storage, a file or an import. Every field this version knows is filled with its default where it is missing or not
 * of its kind; keys this version does not know are kept as they are. Undefined only for what is not a record at all: not an object, or a
 * schema other than 1 (a later version's record, which this version must not rewrite). `fallbackId` is the id of a record that has none.
 */
export function withDefaults(value: unknown, fallbackId = ""): ProtoRecord | undefined {
  if (!isObject(value) || (value.schema !== undefined && value.schema !== 1)) return undefined;
  const v = value;
  const name = isObject(v.name) ? v.name : {};
  const record: ProtoRecord = {
    ...unknownKeys(v, RECORD_KEYS),
    schema: 1,
    id: str(v.id, fallbackId),
    editionId: str(v.editionId, DEFAULT_EDITION),
    name: { ...unknownKeys(name, ["chassis", "model"]), chassis: str(name.chassis, ""), model: str(name.model, "") },
    unitType: "protomech",
    techBase: str(v.techBase, "clan"),
    year: isNumber(v.year) ? v.year : null,
    tons: num(v.tons, PROTO_WEIGHT.min),
    walk: num(v.walk, 1),
    jump: num(v.jump, 0),
    booster: v.booster === true,
    mainGun: v.mainGun === true,
    heatSinks: num(v.heatSinks, 0),
    armor: isObject(v.armor) ? (Object.fromEntries(Object.entries(v.armor).filter(([, n]) => isNumber(n))) as Record<string, number>) : {},
    mounts: Array.isArray(v.mounts) ? v.mounts.filter(isObject).map(mountOf) : [],
    notes: isObject(v.notes) ? (Object.fromEntries(Object.entries(v.notes).filter(([, n]) => isString(n))) as Record<string, string>) : {},
  };
  for (const code of PROTO_CODES) record.armor[code] ??= 0;
  if (isString(v.era)) record.era = v.era;
  if (RULES_LEVELS.some((l) => l.id === v.rulesLevel)) record.rulesLevel = v.rulesLevel as RulesLevel;
  const official = officialOf(v.official);
  if (official) record.official = official;
  if (isObject(v.picture) && isString(v.picture.dataUrl)) record.picture = { dataUrl: v.picture.dataUrl };
  return record;
}

/** The name as the sheet and lists show it. */
export const protoTitle = (record: Pick<ProtoRecord, "name">): string => `${record.name.chassis} ${record.name.model}`.trim();
