// What the family keeps on the device: the Mordel key, the chosen edition and the saved 'Mechs. One store, three kinds
// of key. Nothing here logs, and a stored 'Mech that cannot be read is reported, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { DEFAULT_EDITION, EDITIONS, currentEditionId } from "../data/editions";
import type { MechRecord } from "../rules/mech";
import type { OmniChassis } from "../rules/omni";

export interface SavedEntry {
  id: string;
  /** "omni" when what is saved is an OmniMech chassis (`chassis`); else a plain 'Mech (`record`). */
  kind: "mech" | "omni";
  record?: MechRecord;
  chassis?: OmniChassis;
  unreadable?: string;
  savedAt?: string;
}

export interface FamilyStorage {
  persistent: boolean;
  getKey(): Promise<string | undefined>;
  setKey(key: string): Promise<void>;
  clearKey(): Promise<void>;
  getEdition(): Promise<string>;
  setEdition(id: string): Promise<void>;
  list(): Promise<SavedEntry[]>;
  get(id: string): Promise<SavedEntry | undefined>;
  save(record: MechRecord): Promise<void>;
  /** Saves an OmniMech chassis (every configuration of it) under `omni:<id>`. */
  saveOmni(chassis: OmniChassis): Promise<void>;
  /** Replaces a saved plain 'Mech with the chassis made from it, under the same id. */
  convertToOmni(chassis: OmniChassis): Promise<void>;
  /** What is stored under the id, exactly as it is, readable or not: for a copy of a record the pages cannot show. */
  raw(id: string): Promise<unknown>;
  /** Deletes whatever is saved under the id, a 'Mech or a chassis. */
  remove(id: string): Promise<void>;
}

export interface MechFile {
  app: "salvage-rights";
  kind: "mech";
  version: 1;
  record: MechRecord;
}

/** The file of a whole OmniMech chassis. A single configuration downloads as a `MechFile` of its resolved record instead. */
export interface OmniFile {
  app: "salvage-rights";
  kind: "omni";
  version: 1;
  chassis: OmniChassis;
}

/** What the pages say when the device store fails, so the wording is one thing. */
export const STORAGE_WRITE_FAILED = "We could not save that on this device.";
export const STORAGE_READ_FAILED = "We could not read what is saved on this device.";

const KEY = "mordel-key";
const EDITION = "edition";
const MECH_PREFIX = "mech:";
const OMNI_PREFIX = "omni:";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isTechBase = (v: unknown) => v === "inner-sphere" || v === "clan";

function isMount(v: unknown): boolean {
  if (!isObject(v)) return false;
  return (
    isString(v.id) &&
    (v.equipmentId === null || isString(v.equipmentId)) &&
    isString(v.name) &&
    isTechBase(v.techBase) &&
    (v.location === null || isString(v.location)) &&
    (v.slot === null || isNumber(v.slot)) &&
    (v.part === undefined || v.part === "structure" || v.part === "armor") &&
    (v.slots === undefined || isNumber(v.slots)) &&
    (v.linkedTo === undefined || isString(v.linkedTo)) &&
    (v.pod === undefined || v.pod === true)
  );
}

const isStrings = (v: unknown) => Array.isArray(v) && v.every(isString);

function isOmniLink(v: unknown): boolean {
  if (v === undefined) return true;
  return isObject(v) && isString(v.chassisId) && isString(v.configurationId) && isString(v.code) && (v.isBase === undefined || v.isBase === true) && isNumber(v.baseHeatSinks) && (v.baseExtraHeatSinks === undefined || (Array.isArray(v.baseExtraHeatSinks) && v.baseExtraHeatSinks.every(isNumber))) && isStrings(v.baseMountIds);
}

function isChassis(v: unknown): boolean {
  if (!isObject(v)) return false;
  const { engine, heatSinks } = v;
  return (
    isObject(engine) &&
    isString(engine.type) &&
    isNumber(engine.rating) &&
    isString(v.gyro) &&
    isString(v.cockpit) &&
    isString(v.structure) &&
    isString(v.armorType) &&
    isString(v.myomer) &&
    isObject(heatSinks) &&
    isString(heatSinks.type) &&
    isNumber(heatSinks.count) &&
    (heatSinks.extra === undefined || (Array.isArray(heatSinks.extra) && heatSinks.extra.every((g) => isObject(g) && isString(g.type) && isNumber(g.count))))
  );
}

function isArms(v: unknown): boolean {
  return v === undefined || (isObject(v) && Object.values(v).every((a) => isObject(a) && typeof a.lowerArm === "boolean" && typeof a.hand === "boolean"));
}

/** The parts of a record the editor reads and the import baseline copies: everything but the identity and the source. */
function isBody(v: Record<string, unknown>): boolean {
  const { name, armor, mounts, notes } = v;
  return (
    isObject(name) &&
    isString(name.chassis) &&
    isString(name.model) &&
    (v.techBase === "mixed" || isTechBase(v.techBase)) &&
    (v.year === null || isNumber(v.year)) &&
    isNumber(v.tons) &&
    isString(v.configuration) &&
    isChassis(v.chassis) &&
    isObject(armor) &&
    Object.values(armor).every((a) => isObject(a) && isNumber(a.front) && (a.rear === undefined || isNumber(a.rear))) &&
    Array.isArray(mounts) &&
    mounts.every(isMount) &&
    isObject(notes) &&
    Object.values(notes).every((n) => n === undefined || isString(n)) &&
    isArms(v.arms)
  );
}

function isSource(v: unknown): boolean {
  if (!isObject(v)) return false;
  const { values, baseline } = v;
  return (
    v.kind === "mordel" &&
    isString(v.unitType) &&
    isNumber(v.id) &&
    isString(v.designer) &&
    isString(v.fetchedAt) &&
    isObject(values) &&
    (values.battleValue === undefined || isNumber(values.battleValue)) &&
    (values.cost === undefined || isNumber(values.cost)) &&
    (values.rulesLevel === undefined || isString(values.rulesLevel)) &&
    (values.era === undefined || isString(values.era)) &&
    (baseline === undefined || (isObject(baseline) && isBody(baseline)))
  );
}

/** The longest picture address a record may carry, in characters (about 1.1 MB of image). */
export const MAX_PICTURE_CHARS = 1_500_000;
const PICTURE_PREFIXES = ["data:image/png;base64,", "data:image/jpeg;base64,"];

export function isPicture(v: unknown): boolean {
  return v === undefined || (isObject(v) && isString(v.dataUrl) && v.dataUrl.length <= MAX_PICTURE_CHARS && PICTURE_PREFIXES.some((p) => (v.dataUrl as string).startsWith(p)));
}

function isFrankenMech(v: unknown): boolean {
  return v === undefined || (isObject(v) && (v.donors === undefined || (isObject(v.donors) && Object.values(v.donors).every(isNumber))));
}

/** Checks the shape of a 'Mech record, not whether it is legal: an illegal 'Mech is still a record. Every part of the
 * record the editor reads is checked, the source's figures and baseline included. */
export function isMechRecord(value: unknown): value is MechRecord {
  if (!isObject(value)) return false;
  return (
    value.schema === 1 &&
    isString(value.id) &&
    isString(value.editionId) &&
    isBody(value) &&
    isOmniLink(value.omni) &&
    isFrankenMech(value.frankenmech) &&
    (value.imageUrl === undefined || isString(value.imageUrl)) &&
    isPicture(value.picture) &&
    (value.source === undefined || isSource(value.source))
  );
}

function isConfiguration(v: unknown): boolean {
  if (!isObject(v)) return false;
  return (
    isString(v.id) &&
    isString(v.code) &&
    (v.name === undefined || isString(v.name)) &&
    (v.year === undefined || v.year === null || isNumber(v.year)) &&
    (v.rulesLevel === undefined || isString(v.rulesLevel)) &&
    isArms(v.arms) &&
    Array.isArray(v.mounts) &&
    v.mounts.every(isMount) &&
    (v.notes === undefined || (isObject(v.notes) && Object.values(v.notes).every((n) => n === undefined || isString(n)))) &&
    (v.imageUrl === undefined || isString(v.imageUrl)) &&
    isPicture(v.picture) &&
    (v.source === undefined || isSource(v.source))
  );
}

/** Checks the shape of an OmniMech chassis: the fixed part, every configuration and a Primary that names one of them. Whether it is legal is for the checks. */
export function isOmniChassis(value: unknown): value is OmniChassis {
  if (!isObject(value)) return false;
  const { name, base, configurations, notes } = value;
  return (
    value.schema === 1 &&
    isString(value.id) &&
    isString(value.editionId) &&
    isObject(name) &&
    isString(name.chassis) &&
    (name.alternate === undefined || isString(name.alternate)) &&
    (value.techBase === "mixed" || isTechBase(value.techBase)) &&
    (value.year === null || isNumber(value.year)) &&
    isNumber(value.tons) &&
    isString(value.body) &&
    isObject(base) &&
    isChassis(base.chassis) &&
    isObject(base.armor) &&
    Object.values(base.armor).every((a) => isObject(a) && isNumber(a.front) && (a.rear === undefined || isNumber(a.rear))) &&
    Array.isArray(base.mounts) &&
    base.mounts.every(isMount) &&
    Array.isArray(configurations) &&
    configurations.length > 0 &&
    configurations.every(isConfiguration) &&
    isString(value.primaryId) &&
    isObject(notes) &&
    Object.values(notes).every((n) => n === undefined || isString(n)) &&
    (value.imageUrl === undefined || isString(value.imageUrl)) &&
    isPicture(value.picture) &&
    (value.source === undefined || isSource(value.source))
  );
}

/** A record saved under an edition id an earlier version used is read as the edition that id means now. */
function migrated<T extends { editionId: string }>(record: T): T {
  const editionId = currentEditionId(record.editionId);
  return editionId === record.editionId ? record : { ...record, editionId };
}

export function toOmniFile(chassis: OmniChassis): OmniFile {
  return { app: "salvage-rights", kind: "omni", version: 1, chassis: structuredClone(chassis) };
}

/** Reads a file of a whole chassis; the same plain messages as `fromMechFile`. */
export function fromOmniFile(file: unknown): { ok: true; chassis: OmniChassis } | { ok: false; message: string } {
  if (!isObject(file)) return { ok: false, message: "This is not a Salvage Rights file." };
  if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights." };
  if (file.kind !== "omni") return { ok: false, message: "This file does not hold an OmniMech." };
  if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
  if (!isOmniChassis(file.chassis)) return { ok: false, message: "The OmniMech in this file is incomplete or damaged." };
  return { ok: true, chassis: migrated(file.chassis) };
}

/** Hands the whole chassis to the browser as a file. */
export function downloadOmni(chassis: OmniChassis): void {
  const base = chassis.name.chassis.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  downloadJson(`${base || "omnimech"}.omni.json`, toOmniFile(chassis));
}

export function toMechFile(record: MechRecord): MechFile {
  return { app: "salvage-rights", kind: "mech", version: 1, record: structuredClone(record) };
}

export function fromMechFile(file: unknown): { ok: true; record: MechRecord } | { ok: false; message: string } {
  if (!isObject(file)) return { ok: false, message: "This is not a Salvage Rights file." };
  if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights." };
  if (file.kind !== "mech") return { ok: false, message: "This file does not hold a 'Mech." };
  if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
  if (!isMechRecord(file.record)) return { ok: false, message: "The 'Mech in this file is incomplete or damaged." };
  return { ok: true, record: migrated(file.record) };
}

/** Hands the 'Mech to the browser as a file. */
export function downloadMech(record: MechRecord): void {
  const base = `${record.name.chassis}-${record.name.model}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  downloadJson(`${base || "mech"}.mech.json`, toMechFile(record));
}

/** Hands any value to the browser as a JSON file. */
export function downloadJson(filename: string, value: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function entryOf(id: string, stored: unknown, kind: SavedEntry["kind"] = "mech"): SavedEntry {
  const what = kind === "omni" ? "OmniMech" : "'Mech";
  if (!isObject(stored)) return { id, kind, unreadable: `This saved ${what} is not in a form the app understands.` };
  const savedAt = isString(stored.savedAt) ? stored.savedAt : undefined;
  if (kind === "omni") {
    if (!isOmniChassis(stored.chassis)) return { id, kind, savedAt, unreadable: "This saved OmniMech is incomplete or from a different version." };
    return { id, kind, chassis: migrated(stored.chassis), savedAt };
  }
  if (!isMechRecord(stored.record)) {
    return { id, kind, savedAt, unreadable: "This saved 'Mech is incomplete or from a different version." };
  }
  return { id, kind, record: migrated(stored.record), savedAt };
}

function wrap(store: Store): FamilyStorage {
  const saveOmni = (chassis: OmniChassis) => {
    if (!isOmniChassis(chassis)) return Promise.reject(new Error("This OmniMech is incomplete and cannot be saved."));
    return store.set(OMNI_PREFIX + chassis.id, { chassis, savedAt: new Date().toISOString() });
  };
  return {
    persistent: store.persistent,
    getKey: () => store.get<string>(KEY),
    setKey: async (key) => {
      const trimmed = key.trim();
      if (!trimmed) throw new Error("The key is empty.");
      await store.set(KEY, trimmed);
    },
    clearKey: () => store.delete(KEY),
    getEdition: async () => {
      const stored = await store.get<unknown>(EDITION);
      const id = isString(stored) ? currentEditionId(stored) : undefined;
      return id !== undefined && EDITIONS.some((e) => e.id === id) ? id : DEFAULT_EDITION;
    },
    setEdition: (id) => store.set(EDITION, id),
    list: async () => {
      const keys = await store.keys();
      const read = (prefix: string, kind: SavedEntry["kind"]) =>
        keys.filter((k) => k.startsWith(prefix)).map(async (k) => entryOf(k.slice(prefix.length), await store.get<unknown>(k), kind));
      const entries = await Promise.all([...read(MECH_PREFIX, "mech"), ...read(OMNI_PREFIX, "omni")]);
      return entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
    },
    get: async (id) => {
      const stored = await store.get<unknown>(MECH_PREFIX + id);
      if (stored !== undefined) return entryOf(id, stored);
      const omni = await store.get<unknown>(OMNI_PREFIX + id);
      return omni === undefined ? undefined : entryOf(id, omni, "omni");
    },
    save: (record) => {
      if (!isMechRecord(record)) return Promise.reject(new Error("This 'Mech is incomplete and cannot be saved."));
      return store.set(MECH_PREFIX + record.id, { record, savedAt: new Date().toISOString() });
    },
    saveOmni,
    convertToOmni: async (chassis) => {
      await saveOmni(chassis);
      await store.delete(MECH_PREFIX + chassis.id);
    },
    raw: async (id) => (await store.get<unknown>(MECH_PREFIX + id)) ?? (await store.get<unknown>(OMNI_PREFIX + id)),
    remove: async (id) => {
      await store.delete(MECH_PREFIX + id);
      await store.delete(OMNI_PREFIX + id);
    },
  };
}

export async function openFamilyStorage(): Promise<FamilyStorage> {
  return wrap(await openStore("battletech"));
}
