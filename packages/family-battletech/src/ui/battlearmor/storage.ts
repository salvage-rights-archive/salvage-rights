// What the battle armor pages keep on the device: saved suits under `battlearmor-unit:` in the family store, and the unit file. A saved suit is read
// with `withDefaults`, so one from an earlier or later version keeps what this version does not know; one that is not a record at all is reported,
// never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { withDefaults } from "../../rules/battlearmor/record";
import type { BaRecord } from "../../rules/battlearmor/record";
import { downloadJson, isPicture } from "../storage";

export interface BaEntry {
  id: string;
  record?: BaRecord;
  unreadable?: string;
  savedAt?: string;
}

export interface BaStorage {
  persistent: boolean;
  list(): Promise<BaEntry[]>;
  get(id: string): Promise<BaEntry | undefined>;
  save(record: BaRecord): Promise<void>;
  /** What is stored under the id, exactly as it is, readable or not. */
  raw(id: string): Promise<unknown>;
  remove(id: string): Promise<void>;
}

export interface BaFile {
  app: "salvage-rights";
  kind: "battlearmor-unit";
  version: 1;
  record: BaRecord;
}

const PREFIX = "battlearmor-unit:";
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function read(value: unknown, fallbackId: string): BaRecord | undefined {
  const record = withDefaults(value, fallbackId);
  if (record && !isPicture(record.picture)) delete record.picture;
  return record;
}

export const toBaFile = (record: BaRecord): BaFile => ({ app: "salvage-rights", kind: "battlearmor-unit", version: 1, record: structuredClone(record) });

/** Reads a unit file. A record without an id gets a fresh one. */
export function fromBaFile(file: unknown, newId: () => string = () => crypto.randomUUID()): { ok: true; record: BaRecord } | { ok: false; message: string } {
  if (!isObject(file)) return { ok: false, message: "This is not a Salvage Rights file." };
  if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights." };
  if (file.kind !== "battlearmor-unit") return { ok: false, message: "This file does not hold a battle armor unit." };
  if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
  const record = read(file.record, newId());
  return record ? { ok: true, record } : { ok: false, message: "The battle armor unit in this file is damaged or from a later version." };
}

/** Hands the unit to the browser as a file. */
export function downloadBa(record: BaRecord): void {
  const base = `${record.name.chassis}-${record.name.model}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  downloadJson(`${base || "battle-armor"}.battlearmor.json`, toBaFile(record));
}

function entryOf(id: string, stored: unknown): BaEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved unit is not in a form the app understands." };
  const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
  const record = read(stored.record, id);
  return record ? { id, record, savedAt } : { id, savedAt, unreadable: "This saved unit is damaged or from a later version." };
}

function wrap(store: Store): BaStorage {
  return {
    persistent: store.persistent,
    list: async () => {
      const keys = (await store.keys()).filter((k) => k.startsWith(PREFIX));
      const entries = await Promise.all(keys.map(async (k) => entryOf(k.slice(PREFIX.length), await store.get<unknown>(k))));
      return entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
    },
    get: async (id) => {
      const stored = await store.get<unknown>(PREFIX + id);
      return stored === undefined ? undefined : entryOf(id, stored);
    },
    save: (record) => {
      const clean = read(record, "");
      if (!clean?.id) return Promise.reject(new Error("This unit is incomplete and cannot be saved."));
      return store.set(PREFIX + clean.id, { record: clean, savedAt: new Date().toISOString() });
    },
    raw: (id) => store.get<unknown>(PREFIX + id),
    remove: (id) => store.delete(PREFIX + id),
  };
}

export async function openBaStorage(): Promise<BaStorage> {
  return wrap(await openStore("battletech"));
}
