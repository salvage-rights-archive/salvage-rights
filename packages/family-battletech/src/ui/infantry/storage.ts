// What the infantry pages keep on the device: saved platoons under `infantry-unit:` in the family store, and the unit file. A saved platoon is
// read with `withDefaults`, so one from an earlier or later version keeps what this version does not know; one that is not a record at all is
// reported, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { withDefaults } from "../../rules/infantry/platoon";
import type { InfantryRecord } from "../../rules/infantry/platoon";
import { downloadJson } from "../storage";

export interface InfantryEntry {
  id: string;
  record?: InfantryRecord;
  unreadable?: string;
  savedAt?: string;
}

export interface InfantryStorage {
  persistent: boolean;
  list(): Promise<InfantryEntry[]>;
  get(id: string): Promise<InfantryEntry | undefined>;
  save(record: InfantryRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

const PREFIX = "infantry-unit:";
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function toInfantryFile(record: InfantryRecord) {
  return { app: "salvage-rights", kind: "infantry-unit", version: 1, record: structuredClone(record) };
}

export function downloadInfantry(record: InfantryRecord): void {
  const base = `${record.name.chassis}-${record.name.model}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  downloadJson(`${base || "infantry"}.infantry.json`, toInfantryFile(record));
}

function entryOf(id: string, stored: unknown): InfantryEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved platoon is not in a form the app understands." };
  const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
  const record = withDefaults(stored.record, id);
  return record ? { id, record, savedAt } : { id, savedAt, unreadable: "This saved platoon is damaged or from a later version." };
}

function wrap(store: Store): InfantryStorage {
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
      const clean = withDefaults(record, "");
      if (!clean?.id) return Promise.reject(new Error("This platoon is incomplete and cannot be saved."));
      return store.set(PREFIX + clean.id, { record: clean, savedAt: new Date().toISOString() });
    },
    remove: (id) => store.delete(PREFIX + id),
  };
}

export async function openInfantryStorage(): Promise<InfantryStorage> {
  return wrap(await openStore("battletech"));
}
