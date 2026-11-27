// What a unit type's pages keep on the device: saved units under `<kind>:` in the family store, and the unit file. A saved unit is
// read with the type's `withDefaults`, so one from an earlier or later version keeps what this version does not know; one that is
// not a record at all is reported, never thrown or dropped. Each unit type's storage.ts names its kind and words and gets the rest here.
import { openStore } from "@salvage-rights/shared";
import { downloadJson, isPicture } from "./storage";

export interface UnitEntry<R> {
  id: string;
  record?: R;
  unreadable?: string;
  savedAt?: string;
}

export interface UnitStorage<R> {
  persistent: boolean;
  list(): Promise<UnitEntry<R>[]>;
  get(id: string): Promise<UnitEntry<R> | undefined>;
  save(record: R): Promise<void>;
  /** What is stored under the id, exactly as it is, readable or not. */
  raw(id: string): Promise<unknown>;
  remove(id: string): Promise<void>;
}

export interface UnitFile<R, K extends string> {
  app: "salvage-rights";
  kind: K;
  version: 1;
  record: R;
}

interface UnitSpec<R, K extends string> {
  /** The file's `kind` and, with a colon, the prefix of the saved keys. */
  kind: K;
  withDefaults: (value: unknown, fallbackId: string) => R | undefined;
  /** The unit with its article, as a file message names it: "a vehicle", "an aerospace unit". */
  aUnit: string;
  /** What a saved one is called in a message: "unit" unless the type has its own word. */
  saved?: string;
  /** The file name when the unit has no name, and the part before `.json`. */
  fileName: string;
  extension: string;
  /** False for a type that holds no picture; otherwise a picture that is not one the app makes (`isPicture`) is left out. */
  pictures?: boolean;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function unitStore<R extends { id: string; name: { chassis: string; model: string }; picture?: unknown }, K extends string>(spec: UnitSpec<R, K>) {
  const prefix = `${spec.kind}:`;
  const saved = spec.saved ?? "unit";
  const theUnit = spec.aUnit.replace(/^an? /, "");

  const read = (value: unknown, fallbackId: string): R | undefined => {
    const record = spec.withDefaults(value, fallbackId);
    if (record && spec.pictures !== false && !isPicture(record.picture)) delete record.picture;
    return record;
  };

  const toFile = (record: R): UnitFile<R, K> => ({ app: "salvage-rights", kind: spec.kind, version: 1, record: structuredClone(record) });

  /** Reads a unit file. A record without an id gets a fresh one. */
  const fromFile = (file: unknown, newId: () => string = () => crypto.randomUUID()): { ok: true; record: R } | { ok: false; message: string } => {
    if (!isObject(file)) return { ok: false, message: "This is not a Salvage Rights file." };
    if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights." };
    if (file.kind !== spec.kind) return { ok: false, message: `This file does not hold ${spec.aUnit}.` };
    if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
    const record = read(file.record, newId());
    return record ? { ok: true, record } : { ok: false, message: `The ${theUnit} in this file is damaged or from a later version.` };
  };

  /** Hands the unit to the browser as a file. */
  const download = (record: R): void => {
    const base = `${record.name.chassis}-${record.name.model}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    downloadJson(`${base || spec.fileName}.${spec.extension}.json`, toFile(record));
  };

  const entryOf = (id: string, stored: unknown): UnitEntry<R> => {
    if (!isObject(stored)) return { id, unreadable: `This saved ${saved} is not in a form the app understands.` };
    const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
    const record = read(stored.record, id);
    return record ? { id, record, savedAt } : { id, savedAt, unreadable: `This saved ${saved} is damaged or from a later version.` };
  };

  const open = async (): Promise<UnitStorage<R>> => {
    const store = await openStore("battletech");
    return {
      persistent: store.persistent,
      list: async () => {
        const keys = (await store.keys()).filter((k) => k.startsWith(prefix));
        const entries = await Promise.all(keys.map(async (k) => entryOf(k.slice(prefix.length), await store.get<unknown>(k))));
        return entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
      },
      get: async (id) => {
        const stored = await store.get<unknown>(prefix + id);
        return stored === undefined ? undefined : entryOf(id, stored);
      },
      save: (record) => {
        const clean = read(record, "");
        if (!clean?.id) return Promise.reject(new Error(`This ${saved} is incomplete and cannot be saved.`));
        return store.set(prefix + clean.id, { record: clean, savedAt: new Date().toISOString() });
      },
      raw: (id) => store.get<unknown>(prefix + id),
      remove: (id) => store.delete(prefix + id),
    };
  };

  return { toFile, fromFile, download, open };
}
