// What the Aces pages keep on the device: the player's own cards in the family store, one prefix per kind, and the card library
// file. A saved card that cannot be read is listed with its raw value, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { ACES_KINDS, isAcesRecord } from "../../rules/aces-card";
import type { AcesCard, AcesKind, AcesRecord, CommandCard, SpecialOrderCard, SupportCard } from "../../rules/aces-card";
import { downloadJson, isPicture } from "../storage";

/** Store prefixes by record kind. A backup of everything picks Aces records up by these. */
export const ACES_PREFIXES: Record<AcesKind, string> = {
  "aces-card": "aces-card:",
  "aces-command": "aces-command:",
  "aces-order": "aces-order:",
  "aces-support": "aces-support:",
};
/** Reserved for a card photo the player chose to keep with a card; never exported unless they tick the box. */
export const ACES_PHOTO_PREFIX = "aces-photo:";

export interface AcesEntry {
  id: string;
  kind: AcesKind;
  record?: AcesRecord;
  unreadable?: string;
  savedAt?: string;
}

export interface AcesStorage {
  persistent: boolean;
  /** Every saved record of the kinds asked for (all kinds by default), readable or not, newest first. */
  list(kinds?: readonly AcesKind[]): Promise<AcesEntry[]>;
  get(kind: AcesKind, id: string): Promise<AcesEntry | undefined>;
  save(record: AcesRecord): Promise<void>;
  /** What is stored under the id, exactly as it is. */
  raw(kind: AcesKind, id: string): Promise<unknown>;
  remove(kind: AcesKind, id: string): Promise<void>;
}

export interface AcesLibrary {
  cards: AcesCard[];
  commands: CommandCard[];
  orders: SpecialOrderCard[];
  supports: SupportCard[];
}

export interface AcesPhoto {
  cardId: string;
  dataUrl: string;
}

/** The player's own card library as a file (`*.aces-library.json`). */
export interface AcesLibraryFile extends AcesLibrary {
  app: "salvage-rights";
  kind: "aces-library";
  version: 1;
  photos?: AcesPhoto[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export const emptyLibrary = (): AcesLibrary => ({ cards: [], commands: [], orders: [], supports: [] });

/** The readable records among some entries, sorted into the library's four lists. */
export function libraryOf(records: readonly AcesRecord[]): AcesLibrary {
  const lib = emptyLibrary();
  for (const r of records) {
    if (r.kind === "aces-card") lib.cards.push(r);
    else if (r.kind === "aces-command") lib.commands.push(r);
    else if (r.kind === "aces-order") lib.orders.push(r);
    else lib.supports.push(r);
  }
  return lib;
}

const recordsOf = (lib: AcesLibrary): AcesRecord[] => [...lib.cards, ...lib.commands, ...lib.orders, ...lib.supports];

/** The library as a file; photos only when the player asked for them. */
export function toLibraryFile(lib: AcesLibrary, photos?: readonly AcesPhoto[]): AcesLibraryFile {
  return { app: "salvage-rights", kind: "aces-library", version: 1, ...structuredClone(lib), ...(photos?.length ? { photos: structuredClone([...photos]) } : {}) };
}

export function fromLibraryFile(file: unknown): { ok: true; library: AcesLibrary; photos: AcesPhoto[] } | { ok: false; message: string } {
  if (!isObject(file)) return { ok: false, message: "This is not a Salvage Rights file." };
  if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights." };
  if (file.kind !== "aces-library") return { ok: false, message: "This file does not hold an Aces card library." };
  if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
  const lists = [
    [file.cards, "aces-card"],
    [file.commands, "aces-command"],
    [file.orders, "aces-order"],
    [file.supports, "aces-support"],
  ] as const;
  for (const [list, kind] of lists) {
    if (!Array.isArray(list) || !list.every((r) => isAcesRecord(r) && r.kind === kind)) return { ok: false, message: "A card in this file is incomplete or damaged." };
  }
  const photos = file.photos ?? [];
  if (!Array.isArray(photos) || !photos.every((ph) => isObject(ph) && typeof ph.cardId === "string" && ph.dataUrl !== undefined && isPicture(ph))) {
    return { ok: false, message: "A picture in this file is damaged." };
  }
  return { ok: true, library: libraryOf(lists.flatMap(([list]) => list as AcesRecord[])), photos: photos as AcesPhoto[] };
}

/** Hands the library to the browser as a file. */
export function downloadLibrary(lib: AcesLibrary, photos?: readonly AcesPhoto[]): void {
  downloadJson("my-cards.aces-library.json", toLibraryFile(lib, photos));
}

/** The same value whatever the order its keys were written in. */
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_key, value: unknown) => (isObject(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value));

/**
 * What importing a library would do: records with a new id (of their kind) are added, the same record already there is left,
 * and a record there under the same id but different is a conflict the player decides on.
 */
export function planLibraryImport(incoming: AcesLibrary, have: AcesLibrary): { add: AcesRecord[]; conflicts: AcesRecord[] } {
  const mine = new Map(recordsOf(have).map((r) => [`${r.kind}:${r.id}`, r]));
  const add: AcesRecord[] = [];
  const conflicts: AcesRecord[] = [];
  for (const r of recordsOf(incoming)) {
    const old = mine.get(`${r.kind}:${r.id}`);
    if (!old) add.push(r);
    else if (canonical(old) !== canonical(r)) conflicts.push(r);
  }
  return { add, conflicts };
}

function entryOf(kind: AcesKind, id: string, stored: unknown): AcesEntry {
  if (!isObject(stored)) return { id, kind, unreadable: "This saved card is not in a form the app understands." };
  const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
  const record = stored.record;
  if (!isAcesRecord(record) || record.kind !== kind) return { id, kind, savedAt, unreadable: "This saved card is incomplete or from a different version." };
  return { id, kind, record, savedAt };
}

function wrap(store: Store): AcesStorage {
  return {
    persistent: store.persistent,
    list: async (kinds = ACES_KINDS) => {
      const keys = await store.keys();
      const wanted = kinds.flatMap((kind) => keys.filter((k) => k.startsWith(ACES_PREFIXES[kind])).map((k) => ({ kind, k })));
      const entries = await Promise.all(wanted.map(async ({ kind, k }) => entryOf(kind, k.slice(ACES_PREFIXES[kind].length), await store.get<unknown>(k))));
      return entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
    },
    get: async (kind, id) => {
      const stored = await store.get<unknown>(ACES_PREFIXES[kind] + id);
      return stored === undefined ? undefined : entryOf(kind, id, stored);
    },
    save: (record) => {
      if (!isAcesRecord(record)) return Promise.reject(new Error("This card is incomplete and cannot be saved."));
      return store.set(ACES_PREFIXES[record.kind] + record.id, { record, savedAt: new Date().toISOString() });
    },
    raw: (kind, id) => store.get<unknown>(ACES_PREFIXES[kind] + id),
    remove: (kind, id) => store.delete(ACES_PREFIXES[kind] + id),
  };
}

export async function openAcesStorage(): Promise<AcesStorage> {
  return wrap(await openStore("battletech"));
}
