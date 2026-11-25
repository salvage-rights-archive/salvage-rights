// What the family keeps on the device: the Mordel key, the chosen edition and the saved 'Mechs. One store, three kinds
// of key. Nothing here logs, and a stored 'Mech that cannot be read is reported, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { DEFAULT_EDITION, EDITIONS } from "../data/editions";
import type { MechRecord } from "../rules/mech";

export interface SavedEntry {
  id: string;
  record?: MechRecord;
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
  remove(id: string): Promise<void>;
}

export interface MechFile {
  app: "salvage-rights";
  kind: "mech";
  version: 1;
  record: MechRecord;
}

const KEY = "mordel-key";
const EDITION = "edition";
const MECH_PREFIX = "mech:";

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
    (v.linkedTo === undefined || isString(v.linkedTo))
  );
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
    isNumber(heatSinks.count)
  );
}

/** Checks the shape of a 'Mech record, not whether it is legal: an illegal 'Mech is still a record. */
export function isMechRecord(value: unknown): value is MechRecord {
  if (!isObject(value)) return false;
  const { name, armor, mounts, notes } = value;
  return (
    value.schema === 1 &&
    isString(value.id) &&
    isString(value.editionId) &&
    isObject(name) &&
    isString(name.chassis) &&
    isString(name.model) &&
    (value.techBase === "mixed" || isTechBase(value.techBase)) &&
    (value.year === null || isNumber(value.year)) &&
    isNumber(value.tons) &&
    isString(value.configuration) &&
    isChassis(value.chassis) &&
    isObject(armor) &&
    Object.values(armor).every((a) => isObject(a) && isNumber(a.front) && (a.rear === undefined || isNumber(a.rear))) &&
    Array.isArray(mounts) &&
    mounts.every(isMount) &&
    isObject(notes)
  );
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
  return { ok: true, record: file.record };
}

function entryOf(id: string, stored: unknown): SavedEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved 'Mech is not in a form the app understands." };
  const savedAt = isString(stored.savedAt) ? stored.savedAt : undefined;
  if (!isMechRecord(stored.record)) {
    return { id, savedAt, unreadable: "This saved 'Mech is incomplete or from a different version." };
  }
  return { id, record: stored.record, savedAt };
}

function wrap(store: Store): FamilyStorage {
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
      const id = await store.get<unknown>(EDITION);
      return isString(id) && EDITIONS.some((e) => e.id === id) ? id : DEFAULT_EDITION;
    },
    setEdition: (id) => store.set(EDITION, id),
    list: async () => {
      const ids = (await store.keys()).filter((k) => k.startsWith(MECH_PREFIX)).map((k) => k.slice(MECH_PREFIX.length));
      const entries = await Promise.all(ids.map(async (id) => entryOf(id, await store.get<unknown>(MECH_PREFIX + id))));
      return entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
    },
    get: async (id) => {
      const stored = await store.get<unknown>(MECH_PREFIX + id);
      return stored === undefined ? undefined : entryOf(id, stored);
    },
    save: (record) => store.set(MECH_PREFIX + record.id, { record, savedAt: new Date().toISOString() }),
    remove: (id) => store.delete(MECH_PREFIX + id),
  };
}

export async function openFamilyStorage(): Promise<FamilyStorage> {
  return wrap(await openStore("battletech"));
}
