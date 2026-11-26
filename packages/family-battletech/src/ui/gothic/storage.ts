// What the Gothic pages keep on the device: the player's Abomination units in the family store (`gothic-abom:<id>`), and the unit file.
// A saved unit that cannot be read is listed with a note, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { forceWithDefaults, withDefaults } from "../../rules/abomination";
import type { AbominationUnit, GothicForce } from "../../rules/abomination";
import { downloadJson } from "../storage";

/** The store prefix of an Abomination unit. A backup of everything picks the units up by it. */
export const ABOM_PREFIX = "gothic-abom:";

/** The store prefix of a force. */
export const FORCE_PREFIX = "gothic-force:";

export interface ForceEntry {
  id: string;
  force?: GothicForce;
  unreadable?: string;
  savedAt?: string;
}
/** The store prefix of a unit's tracker state on the play page (`gothic-play:<unit id>`). */
export const PLAY_PREFIX = "gothic-play:";

export interface AbomEntry {
  id: string;
  unit?: AbominationUnit;
  unreadable?: string;
  savedAt?: string;
}

export interface GothicStorage {
  persistent: boolean;
  /** Every saved unit, readable or not, newest first. */
  list(): Promise<AbomEntry[]>;
  save(unit: AbominationUnit): Promise<void>;
  remove(id: string): Promise<void>;
  /** Every saved force, readable or not, newest first. */
  listForces(): Promise<ForceEntry[]>;
  getForce(id: string): Promise<ForceEntry | undefined>;
  saveForce(force: GothicForce): Promise<void>;
  removeForce(id: string): Promise<void>;
  /** The tracker state kept for each unit on the table, by unit id, as stored (the page reads it against the unit). */
  playStates(): Promise<Record<string, unknown>>;
  savePlay(unitId: string, state: unknown): Promise<void>;
  removePlay(unitId: string): Promise<void>;
}

/** One unit, or all of them, as a file (`*.abom.json`). */
export interface AbomFile {
  app: "salvage-rights";
  kind: "gothic-abom";
  version: 1;
  units: AbominationUnit[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export const toAbomFile = (units: readonly AbominationUnit[]): AbomFile => ({ app: "salvage-rights", kind: "gothic-abom", version: 1, units: structuredClone([...units]) });

export function fromAbomFile(file: unknown): { ok: true; units: AbominationUnit[] } | { ok: false; message: string } {
  if (!isObject(file)) return { ok: false, message: "This is not a Salvage Rights file." };
  if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights." };
  if (file.kind !== "gothic-abom") return { ok: false, message: "This file does not hold Abomination units." };
  if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
  if (!Array.isArray(file.units)) return { ok: false, message: "A unit in this file is incomplete or damaged." };
  const units = file.units.map((u) => withDefaults(u, crypto.randomUUID()));
  if (units.some((u) => u === undefined)) return { ok: false, message: "A unit in this file is incomplete or damaged." };
  return { ok: true, units: units as AbominationUnit[] };
}

export function downloadUnits(units: readonly AbominationUnit[]): void {
  const only = units.length === 1 ? units[0] : undefined;
  const base = (only?.label ?? "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  downloadJson(only ? `${base || "abomination"}.abom.json` : "salvage-rights-abominations.abom.json", toAbomFile(units));
}

function entryOf(id: string, stored: unknown): AbomEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved unit is not in a form the app understands." };
  const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
  const unit = withDefaults(stored.unit, id);
  return unit ? { id, unit, savedAt } : { id, savedAt, unreadable: "This saved unit is incomplete or from a different version." };
}

function forceEntryOf(id: string, stored: unknown): ForceEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved force is not in a form the app understands." };
  const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
  const force = forceWithDefaults(stored.force, id);
  return force ? { id, force, savedAt } : { id, savedAt, unreadable: "This saved force is incomplete or from a different version." };
}

function wrap(store: Store): GothicStorage {
  return {
    persistent: store.persistent,
    list: async () => {
      const keys = (await store.keys()).filter((k) => k.startsWith(ABOM_PREFIX));
      const entries = await Promise.all(keys.map(async (k) => entryOf(k.slice(ABOM_PREFIX.length), await store.get<unknown>(k))));
      return entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
    },
    save: (unit) => store.set(ABOM_PREFIX + unit.id, { unit, savedAt: new Date().toISOString() }),
    remove: (id) => store.delete(ABOM_PREFIX + id),
    listForces: async () => {
      const keys = (await store.keys()).filter((k) => k.startsWith(FORCE_PREFIX));
      const entries = await Promise.all(keys.map(async (k) => forceEntryOf(k.slice(FORCE_PREFIX.length), await store.get<unknown>(k))));
      return entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
    },
    getForce: async (id) => {
      const stored = await store.get<unknown>(FORCE_PREFIX + id);
      return stored === undefined ? undefined : forceEntryOf(id, stored);
    },
    saveForce: (force) => store.set(FORCE_PREFIX + force.id, { force, savedAt: new Date().toISOString() }),
    removeForce: (id) => store.delete(FORCE_PREFIX + id),
    playStates: async () => {
      const keys = (await store.keys()).filter((k) => k.startsWith(PLAY_PREFIX));
      return Object.fromEntries(await Promise.all(keys.map(async (k) => [k.slice(PLAY_PREFIX.length), await store.get<unknown>(k)] as const)));
    },
    savePlay: (unitId, state) => store.set(PLAY_PREFIX + unitId, state),
    removePlay: (unitId) => store.delete(PLAY_PREFIX + unitId),
  };
}

export async function openGothicStorage(): Promise<GothicStorage> {
  return wrap(await openStore("battletech"));
}
