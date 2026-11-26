// What the ProtoMech pages keep on the device: saved ProtoMechs under `protomech-unit:` in the family store, and the unit file. A saved unit is
// read with `withDefaults`, so one from an earlier or later version keeps what this version does not know; one that is not a record at all is
// reported, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { withDefaults } from "../../rules/protomech/record";
import type { ProtoRecord } from "../../rules/protomech/record";
import { downloadJson, isPicture } from "../storage";

export interface ProtoEntry {
  id: string;
  record?: ProtoRecord;
  unreadable?: string;
  savedAt?: string;
}

export interface ProtoStorage {
  persistent: boolean;
  list(): Promise<ProtoEntry[]>;
  get(id: string): Promise<ProtoEntry | undefined>;
  save(record: ProtoRecord): Promise<void>;
  /** What is stored under the id, exactly as it is, readable or not. */
  raw(id: string): Promise<unknown>;
  remove(id: string): Promise<void>;
}

export interface ProtoFile {
  app: "salvage-rights";
  kind: "protomech-unit";
  version: 1;
  record: ProtoRecord;
}

const PREFIX = "protomech-unit:";
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function read(value: unknown, fallbackId: string): ProtoRecord | undefined {
  const record = withDefaults(value, fallbackId);
  if (record && !isPicture(record.picture)) delete record.picture;
  return record;
}

export const toProtoFile = (record: ProtoRecord): ProtoFile => ({ app: "salvage-rights", kind: "protomech-unit", version: 1, record: structuredClone(record) });

/** Reads a unit file. A record without an id gets a fresh one. */
export function fromProtoFile(file: unknown, newId: () => string = () => crypto.randomUUID()): { ok: true; record: ProtoRecord } | { ok: false; message: string } {
  if (!isObject(file)) return { ok: false, message: "This is not a Salvage Rights file." };
  if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights." };
  if (file.kind !== "protomech-unit") return { ok: false, message: "This file does not hold a ProtoMech." };
  if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
  const record = read(file.record, newId());
  return record ? { ok: true, record } : { ok: false, message: "The ProtoMech in this file is damaged or from a later version." };
}

export function downloadProto(record: ProtoRecord): void {
  const base = `${record.name.chassis}-${record.name.model}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  downloadJson(`${base || "protomech"}.protomech.json`, toProtoFile(record));
}

function entryOf(id: string, stored: unknown): ProtoEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved unit is not in a form the app understands." };
  const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
  const record = read(stored.record, id);
  return record ? { id, record, savedAt } : { id, savedAt, unreadable: "This saved unit is damaged or from a later version." };
}

function wrap(store: Store): ProtoStorage {
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

export async function openProtoStorage(): Promise<ProtoStorage> {
  return wrap(await openStore("battletech"));
}
