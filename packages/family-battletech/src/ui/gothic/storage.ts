// What the Gothic pages keep on the device: the player's Abomination units in the family store (`gothic-abom:<id>`), and the unit file.
// A saved unit that cannot be read is listed with a note, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { forceWithDefaults, withDefaults } from "../../rules/abomination";
import type { AbominationUnit, GothicForce } from "../../rules/abomination";
import type { MechRecord } from "../../rules/mech";
import { downloadJson, isMechRecord, migrated } from "../storage";

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

// ---- The force file (`*.force.json`) -------------------------------------------------------------------------------------------

/** A force with what it points at: the saved units and 'Mechs it uses, so the file stands on its own on another device. */
export interface ForceBundle {
  force: GothicForce;
  units: AbominationUnit[];
  mechs: MechRecord[];
}

export interface ForceFile {
  app: "salvage-rights";
  kind: "gothic-force";
  version: 1;
  bundles: ForceBundle[];
}

/** The most a force file may hold, so a damaged or hostile file cannot fill the device: forces, then units and 'Mechs over the whole file, and entries in one force. */
export const FORCE_FILE_LIMITS = { forces: 100, units: 1000, mechs: 1000, entries: 200 } as const;

/** The force with the saved units and 'Mechs it uses; `missing` counts the entries whose unit or 'Mech is not saved (they are left out of the file). */
export function bundleForce(force: GothicForce, saved: { units: readonly AbominationUnit[]; mechs: readonly MechRecord[] }): { bundle: ForceBundle; missing: number } {
  const unitIds = [...new Set(force.units.map((u) => u.unitId))];
  const mechIds = [...new Set(force.mechs.map((m) => m.recordId))];
  const units = unitIds.flatMap((id) => saved.units.filter((u) => u.id === id).slice(0, 1));
  const mechs = mechIds.flatMap((id) => saved.mechs.filter((m) => m.id === id).slice(0, 1));
  return { bundle: { force: structuredClone(force), units: structuredClone(units), mechs: structuredClone(mechs) }, missing: unitIds.length - units.length + mechIds.length - mechs.length };
}

export const toForceFile = (bundles: readonly ForceBundle[]): ForceFile => ({ app: "salvage-rights", kind: "gothic-force", version: 1, bundles: structuredClone([...bundles]) });

const DAMAGED = "A force in this file is incomplete or damaged.";

/** Reads a force file. One damaged force refuses the whole file, so nothing is half imported; a file over the limits is refused too. */
export function fromForceFile(file: unknown): { ok: true; bundles: ForceBundle[] } | { ok: false; message: string } {
  if (!isObject(file)) return { ok: false, message: "This is not a Salvage Rights file." };
  if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights." };
  if (file.kind !== "gothic-force") return { ok: false, message: "This file does not hold forces." };
  if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
  if (!Array.isArray(file.bundles)) return { ok: false, message: DAMAGED };
  if (file.bundles.length > FORCE_FILE_LIMITS.forces) return { ok: false, message: "This file holds more forces than we take at once." };
  const bundles: ForceBundle[] = [];
  let units = 0;
  let mechs = 0;
  for (const raw of file.bundles) {
    if (!isObject(raw) || !Array.isArray(raw.units) || !Array.isArray(raw.mechs)) return { ok: false, message: DAMAGED };
    units += raw.units.length;
    mechs += raw.mechs.length;
    if (units > FORCE_FILE_LIMITS.units || mechs > FORCE_FILE_LIMITS.mechs) return { ok: false, message: "This file holds more units or 'Mechs than we take at once." };
    const force = forceWithDefaults(raw.force, crypto.randomUUID());
    const readUnits = raw.units.map((u) => withDefaults(u, crypto.randomUUID()));
    if (!force || force.mechs.length + force.units.length > FORCE_FILE_LIMITS.entries || readUnits.some((u) => u === undefined) || !raw.mechs.every(isMechRecord)) return { ok: false, message: DAMAGED };
    bundles.push({ force, units: readUnits as AbominationUnit[], mechs: raw.mechs.map(migrated) });
  }
  return { ok: true, bundles };
}

export function downloadForces(bundles: readonly ForceBundle[]): void {
  const only = bundles.length === 1 ? bundles[0] : undefined;
  const base = (only?.force.name ?? "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  downloadJson(only ? `${base || "force"}.force.json` : "salvage-rights-forces.force.json", toForceFile(bundles));
}

/** The ids already saved on the device, by kind. */
export interface TakenIds {
  forces: ReadonlySet<string>;
  units: ReadonlySet<string>;
  mechs: ReadonlySet<string>;
}

/** What the file would overwrite: how many of its distinct forces, units and 'Mechs have an id that is already saved. */
export function importConflicts(bundles: readonly ForceBundle[], taken: TakenIds): { forces: number; units: number; mechs: number } {
  const count = (ids: Iterable<string>, have: ReadonlySet<string>) => [...new Set(ids)].filter((id) => have.has(id)).length;
  return {
    forces: count(bundles.map((b) => b.force.id), taken.forces),
    units: count(bundles.flatMap((b) => b.units.map((u) => u.id)), taken.units),
    mechs: count(bundles.flatMap((b) => b.mechs.map((m) => m.id)), taken.mechs),
  };
}

/**
 * What to write for an import. "replace" keeps the file's ids, so a saved force, unit or 'Mech with the same id is overwritten; "both"
 * gives every one whose id is already saved a new id (and points the force at it), so nothing saved is touched. An id repeated inside
 * the file always gets a new id after its first use.
 */
export function planForceImport(bundles: readonly ForceBundle[], taken: TakenIds, mode: "replace" | "both"): { forces: GothicForce[]; units: AbominationUnit[]; mechs: MechRecord[] } {
  const claim = (id: string, have: ReadonlySet<string>, used: Set<string>): string => {
    const keep = id !== "" && !used.has(id) && (mode === "replace" || !have.has(id));
    const next = keep ? id : crypto.randomUUID();
    used.add(next);
    return next;
  };
  const unitUsed = new Set<string>();
  const mechUsed = new Set<string>();
  const forceUsed = new Set<string>();
  const unitIds = new Map<string, string>();
  const mechIds = new Map<string, string>();
  const units: AbominationUnit[] = [];
  const mechs: MechRecord[] = [];
  for (const b of bundles) {
    for (const u of b.units) {
      if (unitIds.has(u.id)) continue;
      const id = claim(u.id, taken.units, unitUsed);
      unitIds.set(u.id, id);
      units.push({ ...u, id });
    }
    for (const m of b.mechs) {
      if (mechIds.has(m.id)) continue;
      const id = claim(m.id, taken.mechs, mechUsed);
      mechIds.set(m.id, id);
      mechs.push({ ...m, id });
    }
  }
  const forces = bundles.map(({ force }) => ({
    ...force,
    id: claim(force.id, taken.forces, forceUsed),
    mechs: force.mechs.map((m) => ({ ...m, recordId: mechIds.get(m.recordId) ?? m.recordId })),
    units: force.units.map((u) => ({ ...u, unitId: unitIds.get(u.unitId) ?? u.unitId })),
  }));
  return { forces, units, mechs };
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
