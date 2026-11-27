// What the Support Vehicle pages keep on the device: saved units under `support-vehicle-unit:` in the family store, and the unit file. A saved unit is read with
// `withDefaults`, so one from an earlier or later version keeps what this version does not know; one that is not a record at all is reported, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { withDefaults } from "../../rules/support-vehicle/sv";
import type { SupportVehicleRecord } from "../../rules/support-vehicle/sv";
import { downloadJson, isPicture } from "../storage";

export interface SvEntry {
  id: string;
  record?: SupportVehicleRecord;
  unreadable?: string;
  savedAt?: string;
}

export interface SvStorage {
  persistent: boolean;
  list(): Promise<SvEntry[]>;
  get(id: string): Promise<SvEntry | undefined>;
  save(record: SupportVehicleRecord): Promise<void>;
  /** What is stored under the id, exactly as it is, readable or not. */
  raw(id: string): Promise<unknown>;
  remove(id: string): Promise<void>;
}

export interface SvFile {
  app: "salvage-rights";
  kind: "support-vehicle-unit";
  version: 1;
  record: SupportVehicleRecord;
}

const PREFIX = "support-vehicle-unit:";
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function read(value: unknown, fallbackId: string): SupportVehicleRecord | undefined {
  const record = withDefaults(value, fallbackId);
  if (record && !isPicture(record.picture)) delete record.picture;
  return record;
}

export function toSvFile(record: SupportVehicleRecord): SvFile {
  return { app: "salvage-rights", kind: "support-vehicle-unit", version: 1, record: structuredClone(record) };
}

export function downloadSv(record: SupportVehicleRecord): void {
  const base = `${record.name.chassis}-${record.name.model}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  downloadJson(`${base || "support-vehicle"}.support-vehicle.json`, toSvFile(record));
}

function entryOf(id: string, stored: unknown): SvEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved unit is not in a form the app understands." };
  const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
  const record = read(stored.record, id);
  return record ? { id, record, savedAt } : { id, savedAt, unreadable: "This saved unit is damaged or from a later version." };
}

function wrap(store: Store): SvStorage {
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

export async function openSvStorage(): Promise<SvStorage> {
  return wrap(await openStore("battletech"));
}
