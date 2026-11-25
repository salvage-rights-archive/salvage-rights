// What the Alpha Strike pages keep on the device: saved units under `as-unit:` in the family store, and the unit file. A saved unit
// that cannot be read is reported, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { currentEditionId } from "../../data/editions";
import { AS_SOURCE_KINDS } from "../../rules/as-unit";
import type { AsDamage, AsSpecial, AsUnit } from "../../rules/as-unit";
import { downloadJson, isPicture } from "../storage";

export interface AsEntry {
  id: string;
  unit?: AsUnit;
  unreadable?: string;
  savedAt?: string;
}

export interface AsStorage {
  persistent: boolean;
  list(): Promise<AsEntry[]>;
  get(id: string): Promise<AsEntry | undefined>;
  save(unit: AsUnit): Promise<void>;
  /** What is stored under the id, exactly as it is, readable or not. */
  raw(id: string): Promise<unknown>;
  remove(id: string): Promise<void>;
}

export interface AsUnitFile {
  app: "salvage-rights";
  kind: "as-unit";
  version: 1;
  unit: AsUnit;
}

const PREFIX = "as-unit:";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const optional = (v: unknown, check: (x: unknown) => boolean) => v === undefined || check(v);

const isDamage = (v: unknown): v is AsDamage => v === null || (isObject(v) && isNumber(v.value) && (v.minimal === undefined || v.minimal === true));

function isSpecial(v: unknown): v is AsSpecial {
  return isObject(v) && isString(v.code) && Array.isArray(v.values) && v.values.every(isString) && isString(v.raw) && optional(v.inner, (i) => Array.isArray(i) && i.every(isSpecial));
}

function isCard(v: unknown): boolean {
  if (!isObject(v)) return false;
  const { damage } = v;
  return (
    isString(v.type) &&
    isNumber(v.size) &&
    (v.tmm === null || isNumber(v.tmm)) &&
    Array.isArray(v.move) &&
    v.move.every((m) => isObject(m) && isNumber(m.inches) && isString(m.mode)) &&
    optional(v.thrust, isNumber) &&
    (v.role === null || isString(v.role)) &&
    isNumber(v.pv) &&
    isObject(damage) &&
    isDamage(damage.s) &&
    isDamage(damage.m) &&
    isDamage(damage.l) &&
    optional(damage.e, isDamage) &&
    isNumber(v.ov) &&
    isNumber(v.armor) &&
    isNumber(v.structure) &&
    optional(v.threshold, isNumber) &&
    Array.isArray(v.specials) &&
    v.specials.every(isSpecial)
  );
}

function isSource(v: unknown): boolean {
  return (
    isObject(v) &&
    (AS_SOURCE_KINDS as readonly unknown[]).includes(v.kind) &&
    optional(v.credit, isString) &&
    optional(v.ref, isString) &&
    optional(v.at, isString) &&
    optional(v.style, isString) &&
    optional(v.values, isCard) &&
    optional(v.official, (o) => isObject(o) && isString(o.book))
  );
}

/** Checks the shape of a unit, not whether it follows the book: a unit with an unknown code is still a unit. */
export function isAsUnit(value: unknown): value is AsUnit {
  if (!isObject(value)) return false;
  const { name } = value;
  return (
    value.schema === 1 &&
    value.kind === "as-unit" &&
    isString(value.id) &&
    isString(value.editionId) &&
    isObject(name) &&
    isString(name.chassis) &&
    isString(name.model) &&
    isCard(value.card) &&
    isNumber(value.skill) &&
    optional(value.rulesLevel, isString) &&
    optional(value.techBase, (t) => t === "inner-sphere" || t === "clan" || t === "mixed") &&
    optional(value.year, (y) => y === null || isNumber(y)) &&
    optional(value.era, isString) &&
    optional(value.notes, isString) &&
    isPicture(value.picture) &&
    optional(value.source, isSource)
  );
}

/** An old edition id reads as the edition it means now, and a unit without a source reads as manual. */
const migrated = (unit: AsUnit): AsUnit => {
  const editionId = currentEditionId(unit.editionId);
  const source = (unit.source as AsUnit["source"] | undefined) ?? { kind: "manual" };
  return editionId === unit.editionId && unit.source === source ? unit : { ...unit, editionId, source };
};

export function toUnitFile(unit: AsUnit): AsUnitFile {
  return { app: "salvage-rights", kind: "as-unit", version: 1, unit: structuredClone(unit) };
}

export function fromUnitFile(file: unknown): { ok: true; unit: AsUnit } | { ok: false; message: string } {
  if (!isObject(file)) return { ok: false, message: "This is not a Salvage Rights file." };
  if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights." };
  if (file.kind !== "as-unit") return { ok: false, message: "This file does not hold an Alpha Strike unit." };
  if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
  if (!isAsUnit(file.unit)) return { ok: false, message: "The unit in this file is incomplete or damaged." };
  return { ok: true, unit: migrated(file.unit) };
}

/** Hands the unit to the browser as a file. */
export function downloadUnit(unit: AsUnit): void {
  const base = `${unit.name.chassis}-${unit.name.model}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  downloadJson(`${base || "unit"}.as-unit.json`, toUnitFile(unit));
}

function entryOf(id: string, stored: unknown): AsEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved unit is not in a form the app understands." };
  const savedAt = isString(stored.savedAt) ? stored.savedAt : undefined;
  if (!isAsUnit(stored.unit)) return { id, savedAt, unreadable: "This saved unit is incomplete or from a different version." };
  return { id, unit: migrated(stored.unit), savedAt };
}

function wrap(store: Store): AsStorage {
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
    save: (unit) => {
      if (!isAsUnit(unit)) return Promise.reject(new Error("This unit is incomplete and cannot be saved."));
      return store.set(PREFIX + unit.id, { unit, savedAt: new Date().toISOString() });
    },
    raw: (id) => store.get<unknown>(PREFIX + id),
    remove: (id) => store.delete(PREFIX + id),
  };
}

export async function openAsStorage(): Promise<AsStorage> {
  return wrap(await openStore("battletech"));
}
