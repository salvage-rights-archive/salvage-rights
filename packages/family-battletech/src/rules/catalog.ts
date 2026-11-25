// The equipment catalog: lookup, availability by year and edition, and the weight and slots of a mounted item. The table
// itself is plain data in data/equipment/*, written in groups whose `defaults` carry what the items share; `expand`
// turns the groups into rows and `createCatalog` indexes them. Nothing here is specific to a book except the formula
// table, which holds the few items the book scales with the 'Mech.
import type { RulesLevel, Span } from "../data/chassis";
import { AMMO_GROUPS, AMMO_OTHER_GROUP, EQUIPMENT_GROUPS, GROUP_ORDER, OTHER_GROUP } from "../data/equipment/groups";
import type { UnitId } from "../data/units";
import { DEFAULT_UNITS } from "../data/units";
import { SHEET_ALIASES, sheetNameVariants } from "../data/equipment/names";
import { FORMULAS, resolveFormula } from "./formulas";
import type { FactsOf, LocationCode, MechRecord, Mount, MountFacts, TechBase } from "./mech";

export type EquipmentKind = "weapon" | "ammunition" | "heat-sink" | "jump-jet" | "other";
export type { Span };
/** A conventional infantry weapon's figures as TechManual's infantry weapons table prints them. Infantry damage is per trooper and
 * range is a Base Range (the platoon's to-hit modifiers come from it), so none of it fits `heat`, `damage` or `range`. */
export interface InfantryStats {
  rating: string; // the table's Tech (Rating) letter
  size: "Small" | "Medium";
  mode: "Melee" | "Standard" | "Support";
  damageType: "B" | "E" | "M" | "P";
  flags?: string; // A anti-air, B burst-fire, F flame-based, N non-penetrating
  baseRange: number;
  damage: number; // each trooper
  inferno?: number; // damage each with Inferno ammunition, where the table prints a second line
  ammoKg?: number; // one clip
  shots: string; // as printed: "6", "15/5" (shots and bursts), "1-D" (single-use), "NA"
  crew: string; // the Crew Value as printed: "1", "2", "1E"
  clip?: number | "cells" | "single-use"; // the table's second cost: C-bills per clip, or its asterisks
}
export interface EquipmentRow {
  id: string;
  name: string;
  aliases: string[];
  kind: EquipmentKind;
  techBase: TechBase;
  tons: number | string; // a string names a formula
  slots: number | string;
  availability: Span[];
  locations?: LocationCode[]; // where the book says the item may be placed (the biped rule); absent means anywhere
  locationsQuad?: LocationCode[]; // the quad rule, where the book's rule differs from the biped one; [] means not allowed
  splittable?: boolean; // true only where the book lets the item span adjacent locations
  needs?: string; // what the item must be paired with, in the same location: "launcher", "machine-gun"
  /** True when `availability` is not a year the book prints for this tech base (a dash in the book's table, or one date
   * printed for both tech bases). The availability check reports such rows as notes, not errors. */
  yearsInferred?: true;
  /** The 'Mech carries exactly this many of the item, each one a separate mount of `slots` slots, placed anywhere or, where
   * `locations` names exactly that many, one in each. `perMechQuad` is the count on a quad where it differs (talons: a slot pair on each of four legs). */
  perMech?: number;
  perMechQuad?: number;
  /** The fixed-count mounts are parts of one item: its weight (a number or a formula) is the whole item's, shared equally between the
   * mounts, and it is priced once. Absent: each mount is a whole item (an actuator enhancement on each leg). */
  splitWeight?: true;
  /** The unit types that may mount the item (data/units.ts); absent means a BattleMech and an IndustrialMech. */
  units?: UnitId[];
  /** What differs for another unit type where the book prints a separate column (weight, slots, heat, damage, range). */
  by?: Partial<Record<UnitId, Partial<Pick<EquipmentRow, "tons" | "slots" | "heat" | "damage" | "range">> & { note?: string }>>;
  /** Items sold by the size the player chooses (a jump pack's tons, a booster's Jumping MP): the unit, range and step; the choice is `Mount.amount`. */
  amount?: { unit: string; min: number; max?: number; step: number };
  /** Years from which the item is Advanced and from which Standard, where the table prints era-dependent dates. Not filtered on yet. */
  advancedFrom?: number;
  standardFrom?: number;
  /** Ammunition only, for the families that come in two bin sizes: the shots one bin carries (what Mordel prints). */
  shots?: number;
  /** Play statistics, as the book prints them for one weapon. `heat` is per firing (per shot for the rotary and ultra
   * autocannons); `damage` is the text the record sheet shows ("5", "1/Msl", "25/20/10", "Special"); `type` is the
   * weapons table's Type column; `range` is minimum, short, medium and long in hexes (minimum 0 where the table prints a
   * dash). */
  heat?: number;
  damage?: string;
  type?: string;
  range?: [min: number, short: number, medium: number, long: number];
  /** Ammunition only: the shots one ton carries (the Ammo per Ton column of the weapons table). */
  shotsPerTon?: number;
  /** The page the play figures came from, when it is not `cite`. */
  playCite?: { book: string; page: number };
  /** Conventional infantry weapons only: the per-trooper figures (see InfantryStats). */
  infantry?: InfantryStats;
  /** A non-missile direct-fire or pulse weapon: its weight counts toward a targeting computer (TechManual p. 238). */
  directFire?: true;
  editions?: Record<string, Partial<Pick<EquipmentRow, "tons" | "slots" | "availability" | "locations" | "locationsQuad">>>;
  /** The rules level of the book's table the item comes from; absent means standard (or Introductory, see rules/levels.ts). */
  rulesLevel?: RulesLevel;
  /** Fan-made rows only: who made the item and under what licence, for the credit the screens must show. */
  credit?: string;
  cite: { book: string; page: number };
  checked: "page" | "text";
}
/** How many separate mounts the book requires of the row on a configuration, or undefined when it is not a fixed-count item. */
export function mountsRequired(row: EquipmentRow, configuration: string): number | undefined {
  return configuration === "quad" ? (row.perMechQuad ?? row.perMech) : row.perMech;
}
/** True when a row may be mounted on the unit type; a row with no `units` is for a BattleMech or IndustrialMech. */
export const mountableOn = (row: EquipmentRow, unit: UnitId): boolean => (row.units ?? DEFAULT_UNITS).includes(unit);

/** Where the book lets a row go on a configuration; undefined means anywhere. A quad has its own rule where it differs. A tripod
 * mounts equipment as a 'Mech of equal weight does (IO:AE printed p.159), so its center leg is allowed wherever the side legs both are. */
export function locationsFor(row: EquipmentRow, configuration: string): LocationCode[] | undefined {
  if (configuration === "quad") return row.locationsQuad ?? row.locations;
  const listed = row.locations;
  return configuration === "tripod" && listed?.includes("LL") && listed.includes("RL") ? [...listed, "CL"] : listed;
}

export interface EquipmentGroup {
  defaults: Partial<EquipmentRow>;
  items: (Partial<EquipmentRow> & { id: string; name: string })[];
}

const REQUIRED = ["id", "name", "kind", "techBase", "tons", "slots", "availability", "cite", "checked"] as const;
const KINDS: string[] = ["weapon", "ammunition", "heat-sink", "jump-jet", "other"];
const TECH_BASES: string[] = ["inner-sphere", "clan"];

/** Rows from groups: each item takes its group's defaults and may override them. Throws, naming the id, on a missing
 * required field, a repeated id, an unknown kind or tech base, a `tons` or `slots` string that is not a formula, or an
 * empty or backwards availability, or on play figures that are not numbers in range. `aliases` is optional and defaults to none. */
export function expand(groups: EquipmentGroup[]): EquipmentRow[] {
  const rows: EquipmentRow[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const item of group.items) {
      const merged: Partial<EquipmentRow> = { aliases: [], ...group.defaults, ...item };
      if (seen.has(item.id)) throw new Error(`equipment id ${item.id} is used twice`);
      seen.add(item.id);
      for (const field of REQUIRED) {
        if (merged[field] === undefined) throw new Error(`equipment ${item.id} has no ${field}`);
      }
      const row = merged as EquipmentRow;
      const bad = (why: string): never => {
        throw new Error(`equipment ${item.id}: ${why}`);
      };
      if (!KINDS.includes(row.kind)) bad(`unknown kind ${row.kind}`);
      if (!TECH_BASES.includes(row.techBase)) bad(`unknown tech base ${row.techBase}`);
      for (const field of ["tons", "slots"] as const) {
        const value = row[field];
        if (typeof value === "string" && !Object.hasOwn(FORMULAS, value)) bad(`${field} names the unknown formula ${value}`);
      }
      if (!Array.isArray(row.availability) || row.availability.length === 0) bad("availability is empty");
      if (row.availability.some((s) => s.to !== undefined && s.to < s.from)) bad("a span ends before it starts");
      if (row.heat !== undefined && !(Number.isFinite(row.heat) && row.heat >= 0)) bad("heat is not a number of zero or more");
      if (row.range !== undefined) {
        const r = row.range;
        const numbers = Array.isArray(r) && r.length === 4 && r.every((n) => Number.isFinite(n) && n >= 0);
        if (!numbers) bad("range is not four numbers of zero or more");
        else {
          // A 0 is a band the book prints as a dash; the bands that are printed must not decrease.
          const printed = r.slice(1).filter((n) => n > 0);
          if (printed.some((n, i) => i > 0 && n < (printed[i - 1] ?? 0))) bad("range is not short <= medium <= long");
        }
      }
      if (row.shotsPerTon !== undefined && !(Number.isInteger(row.shotsPerTon) && row.shotsPerTon > 0)) bad("shotsPerTon is not a whole number above zero");
      rows.push(row);
    }
  }
  return rows;
}

export interface Catalog {
  all(): EquipmentRow[];
  byId(id: string): EquipmentRow | undefined;
  /** The row as the edition sees it: its own values with that edition's overrides applied. */
  rowFor(id: string, editionId: string): EquipmentRow | undefined;
  /** Exact name, then alias, within the tech base; case, spacing, hyphens, slashes and periods are ignored. */
  match(name: string, techBase: TechBase): EquipmentRow | undefined;
  offered(editionId: string, want: { techBase: TechBase | "mixed"; year: number | null }): EquipmentRow[];
  available(row: EquipmentRow, editionId: string, year: number | null): boolean;
  /** True when the item can be had at some time from `from` to `to`, inclusive: one of its spans overlaps the window. A year is the window [year, year]. */
  availableBetween(row: EquipmentRow, editionId: string, from: number, to: number): boolean;
  /** Weight and slots of a mounted item, with formulas and the record's edition applied. */
  factsOf: FactsOf;
}

/** The row as one edition sees it: its own values with that edition's overrides on top. */
function inEdition(row: EquipmentRow, editionId: string): EquipmentRow {
  const override = row.editions && Object.hasOwn(row.editions, editionId) ? row.editions[editionId] : undefined;
  return override ? { ...row, ...override } : row;
}

const normalize = (name: string) => name.toLowerCase().replace(/[\s\-/.]/g, "");

export function createCatalog(rows: EquipmentRow[]): Catalog {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const names = new Map<string, EquipmentRow>();
  const aliases = new Map<string, EquipmentRow>();
  for (const r of rows) {
    const key = `${r.techBase}|${normalize(r.name)}`;
    const claimed = names.get(key);
    if (claimed) throw new Error(`equipment ${claimed.id} and ${r.id} have the same name within a tech base`);
    names.set(key, r);
  }
  for (const r of rows) {
    for (const a of [...r.aliases, ...(Object.hasOwn(SHEET_ALIASES, r.id) ? (SHEET_ALIASES[r.id] ?? []) : [])]) {
      const key = `${r.techBase}|${normalize(a)}`;
      const claimed = names.get(key) ?? aliases.get(key);
      if (claimed && claimed.id !== r.id) throw new Error(`equipment ${claimed.id} and ${r.id} have the same name within a tech base`);
      aliases.set(key, r);
    }
  }

  const availableBetween: Catalog["availableBetween"] = (row, editionId, from, to) =>
    inEdition(row, editionId).availability.some((s) => s.from <= to && (s.to === undefined || s.to >= from));
  const available: Catalog["available"] = (row, editionId, year) => year === null || availableBetween(row, editionId, year, year);

  const resolve = (value: number | string, row: EquipmentRow, record: MechRecord, mount: Mount): number | undefined => {
    if (typeof value === "number") return value;
    return resolveFormula(value, row, record, catalog, mount);
  };

  const factsOf: FactsOf = (mount, record) => {
    const base = mount.equipmentId === null ? undefined : byId.get(mount.equipmentId);
    if (!base) return undefined;
    const row = inEdition(base, record.editionId);
    const whole = resolve(row.tons, row, record, mount);
    const count = mountsRequired(row, record.configuration);
    const tons = whole !== undefined && row.splitWeight && count !== undefined && count > 1 ? whole / count : whole;
    const slots = resolve(row.slots, row, record, mount);
    return tons === undefined || slots === undefined ? undefined : ({ tons, slots } satisfies MountFacts);
  };

  const catalog: Catalog = {
    all: () => rows,
    byId: (id) => byId.get(id),
    rowFor: (id, editionId) => {
      const row = byId.get(id);
      return row && inEdition(row, editionId);
    },
    match: (name, techBase) => {
      for (const spelling of [name, ...sheetNameVariants(name)]) {
        const key = `${techBase}|${normalize(spelling)}`;
        const found = names.get(key) ?? aliases.get(key);
        if (found) return found;
      }
      return undefined;
    },
    offered: (editionId, { techBase, year }) =>
      rows
        .filter((r) => mountableOn(r, "mech") && (techBase === "mixed" || r.techBase === techBase) && available(r, editionId, year))
        .map((r) => inEdition(r, editionId)),
    available,
    availableBetween,
    factsOf,
  };
  return catalog;
}

let loading: Promise<Catalog> | undefined;

/** The real table, loaded on first use so it is not part of a page's first load; expanded once and cached. */
export function loadCatalog(): Promise<Catalog> {
  loading ??= (async () => {
    const [weapons, ammunition, other] = await Promise.all([
      import("../data/equipment/weapons"),
      import("../data/equipment/ammunition"),
      import("../data/equipment/other"),
    ]);
    return createCatalog(expand([...weapons.WEAPONS, ...ammunition.AMMUNITION, ...other.OTHER]));
  })().catch((error: unknown) => {
    loading = undefined; // let a later call try again
    throw error;
  });
  return loading;
}

// ---------------------------------------------------------------------------------------------------------------
// The record sheet's inventory: what each weapon prints, and the ammunition on board.
// ---------------------------------------------------------------------------------------------------------------
export interface InventoryLine {
  qty: number;
  name: string;
  location: string;
  heat: string;
  damage: string;
  min: string;
  short: string;
  medium: string;
  long: string;
}

const DASH = "—";
const BIPED_ORDER: LocationCode[] = ["HD", "CT", "LT", "RT", "LA", "RA", "LL", "RL"];
const QUAD_ORDER: LocationCode[] = ["HD", "CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"];

/** Position of a location in record-sheet order for the record's configuration; codes outside it sort after the rest. */
function locationRank(record: MechRecord, location: LocationCode | null): number {
  const order = record.configuration === "quad" ? QUAD_ORDER : BIPED_ORDER;
  if (location === null) return order.length + 1;
  const at = order.indexOf(location);
  return at === -1 ? order.length : at;
}

/** One line per distinct weapon per location (`qty` the number mounted there), by location in record-sheet order and then
 * by name; unplaced mounts come last with location "—". Mounts of other kinds appear only when their row has a range
 * or a damage. A figure the row lacks, and every figure of an unmatched mount, prints as an em dash; a range band of 0
 * (the book's dash) also prints as one. */
export function inventoryLines(record: MechRecord, catalog: Catalog): InventoryLine[] {
  const groups = new Map<string, { qty: number; name: string; location: LocationCode | null; row: EquipmentRow | undefined }>();
  for (const mount of record.mounts) {
    if (mount.part) continue;
    const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
    if (mount.equipmentId !== null && !row) continue;
    if (row && row.kind !== "weapon" && row.range === undefined && row.damage === undefined) continue;
    const key = `${mount.location ?? "-"}|${mount.equipmentId ?? `?${mount.name}`}`;
    const group = groups.get(key);
    if (group) group.qty += 1;
    else groups.set(key, { qty: 1, name: row?.name ?? mount.name, location: mount.location, row });
  }
  return [...groups.values()]
    .sort((a, b) => locationRank(record, a.location) - locationRank(record, b.location) || a.name.localeCompare(b.name))
    .map(({ qty, name, location, row }) => {
      const range = row?.range;
      return {
        qty,
        name,
        location: location ?? DASH,
        heat: row?.heat === undefined ? DASH : String(row.heat),
        damage: row?.damage ?? DASH,
        min: range === undefined || range[0] === 0 ? DASH : String(range[0]),
        short: range === undefined || range[1] === 0 ? DASH : String(range[1]),
        medium: range === undefined || range[2] === 0 ? DASH : String(range[2]),
        long: range === undefined || range[3] === 0 ? DASH : String(range[3]),
      };
    });
}

/** One entry per distinct ammunition item, shots summed over its bins: a row's `shotsPerTon` times the bin's tons, or its
 * own `shots` where that is what the row carries (a half-ton bin row holds its own count). `null` when the row has no
 * figure. Items come in the order of their first bin. */
export function ammoLines(record: MechRecord, catalog: Catalog): { name: string; shots: number | null }[] {
  const totals = new Map<string, { name: string; shots: number | null }>();
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
    if (row?.kind !== "ammunition") continue;
    const tons = typeof row.tons === "number" ? row.tons : 1;
    const perBin = row.shots ?? (row.shotsPerTon === undefined ? undefined : row.shotsPerTon * tons);
    const entry = totals.get(row.id) ?? { name: row.name, shots: null };
    if (perBin !== undefined) entry.shots = (entry.shots ?? 0) + perBin;
    totals.set(row.id, entry);
  }
  return [...totals.values()];
}

// ---------------------------------------------------------------------------------------------------------------
// Groups for the equipment picker: derived from each row's id by the patterns in data/equipment/groups.ts
// ---------------------------------------------------------------------------------------------------------------
export interface GroupKey {
  id: string;
  label: string;
}
/** The group a row belongs to: ammunition by the weapon family it feeds, everything else by the first pattern its id stem matches. */
export function groupOf(row: Pick<EquipmentRow, "id" | "kind">): GroupKey {
  const bare = row.id.replace(/-(is|clan)$/, "");
  if (row.kind === "ammunition") return AMMO_GROUPS.find((g) => g.match.test(bare.replace(/^ammo-/, ""))) ?? AMMO_OTHER_GROUP;
  return EQUIPMENT_GROUPS.find((g) => g.match.test(bare)) ?? OTHER_GROUP;
}
/** Where a group sits in the list; a group not named in the order goes last. */
export const groupRank = (id: string): number => {
  const at = GROUP_ORDER.indexOf(id);
  return at === -1 ? GROUP_ORDER.length : at;
};
