// The equipment catalog: lookup, availability by year and edition, and the weight and slots of a mounted item. The table
// itself is plain data in data/equipment/*, written in groups whose `defaults` carry what the items share; `expand`
// turns the groups into rows and `createCatalog` indexes them. Nothing here is specific to a book except the formula
// table, which holds the few items the book scales with the 'Mech.
import { isStarLeagueTech } from "../data/chassis";
import type { RulesLevel, Span } from "../data/chassis";
import { AMMO_GROUPS, AMMO_OTHER_GROUP, EQUIPMENT_GROUPS, GROUP_ORDER, OTHER_GROUP } from "../data/equipment/groups";
import { inGame, rulesetOf } from "../data/rulesets";
import type { GameId } from "../data/rulesets";
import type { UnitId } from "../data/units";
import { DEFAULT_UNITS } from "../data/units";
import { SHEET_ALIASES, sheetNameVariants } from "../data/equipment/names";
import { PHYSICAL_BV } from "../data/bv";
import { FORMULAS, physicalDamage, resolveFormula } from "./formulas";
import type { FactsOf, LocationCode, MechRecord, Mount, MountFacts, TechBase } from "./mech";
import { SUPERHEAVY } from "../data/chassis";
import { bodyOf, superheavyOf, splitOf } from "./mech";

/** The longest range band an aerospace unit's attack reaches, as the weapons table prints it in place of hex ranges. */
export type AeroRange = "Short" | "Medium" | "Long" | "Extreme";
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
  /** The year the item's prototype appears, before its production year (`availability[0].from`): the Universal Technology Advancement Table's
   * Prototype column (IO:AE printed pp.29-44), or the P-marked date of the table the row cites. Between the two the item needs Experimental
   * rules (IO:AE printed p.27), or `prototypeLevel` where the books print it at a lower level. Absent: only one date is printed. */
  prototypeYear?: number;
  prototypeLevel?: RulesLevel;
  locations?: LocationCode[]; // where the book says the item may be placed (the biped rule); absent means anywhere
  locationsQuad?: LocationCode[]; // the quad rule, where the book's rule differs from the biped one; [] means not allowed
  splittable?: boolean; // true only where the book lets the item span adjacent locations
  needs?: string; // what the item must be paired with, in the same location: "launcher", "machine-gun"
  /** What a humanoid arm that carries the item gives up (TechManual printed pp.241-248): the hand actuator, or the lower arm and hand actuators. */
  armRemoves?: "hand" | "lower-arm";
  /** True for an item the books count as a heavy energy weapon though it is not in the Energy group: the spot welder, for the power amplifiers of an internal combustion or fuel cell engine (TechManual printed pp.247-248). */
  heavyEnergy?: true;
  /** True when `availability` is not a year the book prints for this tech base (a dash in the book's table, or one date
   * printed for both tech bases). The availability check reports such rows as notes, not errors. `false` on a row whose group says
   * `true` where another book does print its year (the Universal Technology Advancement Table prints the Clan TAG's). */
  yearsInferred?: boolean;
  /** True when `tons` is not printed in any book and was worked out from the published designs that carry the item (the Light Blazer). */
  tonsInferred?: true;
  /** True when the item's Battle Value (data/bv.ts) is not printed in any book and was worked out from the published designs that carry it. */
  bvInferred?: true;
  /** The games that offer the item (data/rulesets.ts); absent means Classic only. */
  games?: GameId[];
  /** The page that gives the item's rules level, where it is not `cite` (a game's overlay sets it), and whether that level is our
   * inference rather than printed. */
  levelCite?: { book: string; page: number };
  levelInferred?: true;
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
  by?: Partial<Record<UnitId, Partial<Pick<EquipmentRow, "tons" | "slots" | "heat" | "damage" | "range">> & { note?: string; rangeClass?: AeroRange }>>;
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
  /** Battle armor missile launchers and Narc only: the kilograms one shot of ammunition weighs (TechManual printed pp.347-348, Weight Per Shot). A suit carries the shots it is given, one slot for each four. */
  ammoKgPerShot?: number;
  /** Ammunition only: the shots one ton carries (the Ammo per Ton column of the weapons table). */
  shotsPerTon?: number;
  /** Special munitions only: the launcher families the munition fits. A ton of it carries the shots a ton of that launcher's standard
   * ammunition does (Total Warfare p. 140: all of the slot's shots go to the special munition, except the half-count ones, which are
   * autocannon rounds), so it has no `shotsPerTon` of its own; see `ammoLines`. */
  feeds?: ("lrm" | "srm" | "mml" | "atm")[];
  /** Special munitions only: the share of the launcher's standard shots a ton carries, where the alternative munitions tables of TO:AUE (pp. 226-229) print an Ammo (per Ton) multiplier of x0.5. Absent: x1. */
  shotsFactor?: number;
  /** A multi-mode launcher (MML) only: what each mode fires, as its own line under the weapon on the record sheet. `range` is as above. */
  modes?: { name: string; damage: string; range: [min: number, short: number, medium: number, long: number] }[];
  /** The weapon bay class an aerospace unit groups the item under, where the books name one (TechManual's Aerospace Weapon Classes, printed p.352; capital laser, PPC, autocannon and Gauss as AeroTech 2 p.101 and AeroTech 2 Revised p.75 print them). Absent: no book read names a class. An older edition that prints a different class holds it in data/aero-weapons.ts. */
  bayClass?: string;
  /** A capital weapon only: the tons of ammunition one shot uses (AeroTech 2 p.101, AeroTech 2 Revised p.75: the Tons Per Shot column, equal in both). */
  tonsPerShot?: number;
  /** The page the play figures came from, when it is not `cite`. */
  playCite?: { book: string; page: number };
  /** Conventional infantry weapons only: the per-trooper figures (see InfantryStats). */
  infantry?: InfantryStats;
  /** A non-missile direct-fire or pulse weapon: its weight counts toward a targeting computer (TechManual p. 238). */
  directFire?: true;
  /** A munition the player chooses for an item rather than mounts: the stems (ids without `-is` or `-clan`) of the items it may be chosen for, a mine
   * type for a mine dispenser, a grenade type for a vehicular grenade launcher (TO:AUE pp. 137, 175-179). The row is never offered as equipment; see rules/munitions.ts. */
  choiceFor?: string[];
  /** What differs under another edition: construction values, or play figures where the edition's play book prints them differently (the Core Rulebook's Type column). Shared values stay in the row. */
  editions?: Record<string, Partial<Pick<EquipmentRow, "tons" | "slots" | "availability" | "locations" | "locationsQuad" | "type" | "heat" | "damage" | "range" | "shotsPerTon">>>;
  /** False for an item an OmniMech cannot carry in a pod: it may only be fixed equipment of the base (or, for MASC and the like, part of the
   * base chassis). Absent means it may be pod-mounted. `podCite` is the page that says so. */
  pod?: false;
  podCite?: { book: string; page: number };
  /** The rules level of the book's table the item comes from; absent means standard (or Introductory, see rules/levels.ts). */
  rulesLevel?: RulesLevel;
  /** Fan-made rows only: who made the item and under what licence, for the credit the screens must show. */
  credit?: string;
  cite: { book: string; page: number };
  checked: "page" | "text";
}
/** How many separate mounts the book requires of the row on a configuration, or undefined when it is not a fixed-count item. */
export function mountsRequired(row: EquipmentRow, configuration: string): number | undefined {
  return configuration === "quad" || configuration === "quadvee" ? (row.perMechQuad ?? row.perMech) : row.perMech;
}
/** True when a row may be mounted on the unit type; a row with no `units` is for a BattleMech or IndustrialMech. */
export const mountableOn = (row: EquipmentRow, unit: UnitId): boolean => row.choiceFor === undefined && (row.units ?? DEFAULT_UNITS).includes(unit);
/** True unless the books say the item cannot be pod-mounted on an OmniMech (see `pod` on EquipmentRow). */
export const podMountable = (row: Pick<EquipmentRow, "pod">): boolean => row.pod !== false;

/** Where the book lets a row go on a configuration; undefined means anywhere. A quad has its own rule where it differs. A tripod
 * mounts equipment as a 'Mech of equal weight does (IO:AE printed p.159), so its center leg is allowed wherever the side legs both are. */
export function locationsFor(row: EquipmentRow, configuration: string): LocationCode[] | undefined {
  if (configuration === "quad" || configuration === "quadvee") return row.locationsQuad ?? row.locations;
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
      if (row.pod === false && row.podCite === undefined) bad("pod is false but no page says so");
      if (!Array.isArray(row.availability) || row.availability.length === 0) bad("availability is empty");
      if (row.availability.some((s) => s.to !== undefined && s.to < s.from)) bad("a span ends before it starts");
      if (row.prototypeYear !== undefined && !(row.prototypeYear < Math.min(...row.availability.map((s) => s.from)))) bad("the prototype year is not before the production year");
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
      if (row.feeds !== undefined && row.shotsPerTon !== undefined) bad("a special munition takes its launcher's shots, so it has no shotsPerTon");
      rows.push(row);
    }
  }
  return rows;
}

export interface Catalog {
  all(): EquipmentRow[];
  byId(id: string): EquipmentRow | undefined;
  /** The row as the edition sees it: its own values with that edition's overrides applied, then its game's overlay. */
  rowFor(id: string, editionId: string): EquipmentRow | undefined;
  /** Exact name, then alias, within the tech base; case, spacing, hyphens, slashes and periods are ignored. */
  match(name: string, techBase: TechBase): EquipmentRow | undefined;
  /** The rows an edition offers a unit of the type (a BattleMech when no `unit` is given) in a tech base and year: those on its game's
   * list, or every row where `level` reaches the level at which the game lifts its list. */
  offered(editionId: string, want: { techBase: TechBase | "mixed"; year: number | null; unit?: UnitId; level?: RulesLevel }): EquipmentRow[];
  /** In a game without dates (data/rulesets.ts `dated`) every row is available whatever the year. */
  available(row: EquipmentRow, editionId: string, year: number | null): boolean;
  /** True when the item can be had at some time from `from` to `to`, inclusive: one of its spans overlaps the window. A year is the window [year, year]. */
  availableBetween(row: EquipmentRow, editionId: string, from: number, to: number): boolean;
  /** Weight and slots of a mounted item, with formulas and the record's edition applied. */
  factsOf: FactsOf;
}

/** A game's values that differ from the catalog: for each catalog id, only the fields whose value in that game is not the row's as
 * Classic reads it (data/equipment/gothic.ts). A test fails on any field that repeats the row. */
export type GameOverlay = Record<string, Partial<Omit<EquipmentRow, "id" | "games">>>;
export type Overlays = Partial<Record<GameId, GameOverlay>>;

/** The row as one edition sees it: its own values, that edition's overrides on top, then its game's overlay. */
function seenIn(row: EquipmentRow, editionId: string, overlays: Overlays): EquipmentRow {
  const override = row.editions && Object.hasOwn(row.editions, editionId) ? row.editions[editionId] : undefined;
  const overlay = overlays[rulesetOf(editionId).game];
  const ours = overlay && Object.hasOwn(overlay, row.id) ? overlay[row.id] : undefined;
  return override || ours ? { ...row, ...override, ...ours } : row;
}

/** The weapon a round of ammunition is for, whatever its type: the row id without the munition words, so that a superheavy 'Mech's cell may hold two kinds of one weapon's
 * ammunition (IO:AE printed p.157). A heuristic over the catalog's ids; an id with none of the words is its own family. */
const MUNITION_WORDS = /-(cluster|precision|armor-piercing|ap|caseless|tracer|flak|flechette|incendiary|inferno|semi-guided|narc-capable|artemis-capable|swarm-i|swarm|thunder|standard)(?=-(is|clan)$|$)/g;
export const ammoFamily = (id: string): string => id.replace(MUNITION_WORDS, "");

/** The heat sink type key a heat sink row stands for (the chassis' `heatSinks.type`). */
export function heatSinkTypeOf(row: Pick<EquipmentRow, "id" | "techBase">): string {
  if (row.id.startsWith("compact")) return "compact";
  if (row.id.startsWith("laser")) return "laser";
  return row.id.startsWith("double") ? (row.techBase === "clan" ? "double-clan" : "double") : "single";
}

const normalize = (name: string) => name.toLowerCase().replace(/[\s\-/.]/g, "");

export function createCatalog(rows: EquipmentRow[], overlays: Overlays = {}): Catalog {
  const inEdition = (row: EquipmentRow, editionId: string) => seenIn(row, editionId, overlays);
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
    !rulesetOf(editionId).dated || inEdition(row, editionId).availability.some((s) => s.from <= to && (s.to === undefined || s.to >= from));
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
    if (tons === undefined || slots === undefined) return undefined;
    // A superheavy 'Mech's cell holds two heat sinks (four compact, one Clan double) or two rounds of one kind of ammunition (IO:AE printed p.157).
    const capacity = !superheavyOf(record) ? undefined : row.kind === "heat-sink" ? (SUPERHEAVY.heatSinksPerCell[heatSinkTypeOf(row)] ?? 1) : row.kind === "ammunition" ? SUPERHEAVY.ammoPerCell : undefined;
    const pack = capacity !== undefined && capacity > 1 ? { pack: { key: row.kind === "ammunition" ? ammoFamily(row.id) : row.id, capacity } } : {};
    // An energy weapon is what an IndustrialMech's power amplifiers are a share of (the picker's Energy weapons group).
    return row.heavyEnergy || (row.kind === "weapon" && groupOf(row).id === "energy") ? ({ tons, slots, energy: true, ...pack } satisfies MountFacts) : ({ tons, slots, ...pack } satisfies MountFacts);
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
    offered: (editionId, { techBase, year, unit = "mech", level }) => {
      const ruleset = rulesetOf(editionId);
      return rows
        .filter((r) => inGame(r.games, ruleset, level) && mountableOn(r, unit) && (techBase === "mixed" || r.techBase === techBase || (techBase === "clan" && isStarLeagueTech(r.techBase, r.availability))) && available(r, editionId, year))
        .map((r) => inEdition(r, editionId));
    },
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
    const [weapons, ammunition, other, gothic] = await Promise.all([
      import("../data/equipment/weapons"),
      import("../data/equipment/ammunition"),
      import("../data/equipment/other"),
      import("../data/equipment/gothic"),
    ]);
    return createCatalog(expand([...weapons.WEAPONS, ...ammunition.AMMUNITION, ...other.OTHER, ...gothic.GOTHIC_EQUIPMENT]), { gothic: gothic.GOTHIC_OVERLAY });
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
  /** True for a line under the weapon above it: one mode of a multi-mode launcher, which has only a name, damage and ranges. */
  sub?: true;
}

const DASH = "—";
const BIPED_ORDER: LocationCode[] = ["HD", "CT", "LT", "RT", "LA", "RA", "LL", "RL", "CL"];
const QUAD_ORDER: LocationCode[] = ["HD", "CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"];

/** Position of a location in record-sheet order for the record's configuration; codes outside it sort after the rest. */
function locationRank(record: MechRecord, location: LocationCode | null): number {
  const order = bodyOf(record.configuration) === "quad" ? QUAD_ORDER : BIPED_ORDER;
  if (location === null) return order.length + 1;
  const at = order.indexOf(location);
  return at === -1 ? order.length : at;
}

/** One line per distinct weapon per location (`qty` the number mounted there), by location in record-sheet order and then
 * by name; unplaced mounts come last with location "—". Mounts of other kinds appear only when their row has a range
 * or a damage. A figure the row lacks, and every figure of an unmatched mount, prints as an em dash; a range band of 0
 * (the book's dash) also prints as one. */
export function inventoryLines(record: MechRecord, catalog: Catalog): InventoryLine[] {
  const groups = new Map<string, { qty: number; name: string; location: LocationCode | null; second?: LocationCode; rear: boolean; row: EquipmentRow | undefined }>();
  for (const mount of record.mounts) {
    if (mount.part) continue;
    const row = mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);
    if (mount.equipmentId !== null && !row) continue;
    if (row && row.kind !== "weapon" && row.range === undefined && row.damage === undefined) continue;
    // A rear-firing weapon is its own line, in its location written "LT(R)". A split weapon is written with both locations, the one
    // nearer the center torso first ("CT/LT", "LT/LA"), as the published sheets print it.
    const rear = mount.rear === true;
    const split = splitOf(mount)?.location;
    const pair = split === undefined || split === mount.location ? undefined : [mount.location, split].sort((a, b) => locationRank(record, a) - locationRank(record, b));
    const [location, second] = pair ? [pair[0] ?? null, pair[1] ?? undefined] : [mount.location, undefined];
    const key = `${location ?? "-"}${second ? `/${second}` : ""}${rear ? "(R)" : ""}|${mount.equipmentId ?? `?${mount.name}`}`;
    const group = groups.get(key);
    if (group) group.qty += 1;
    else groups.set(key, { qty: 1, name: row?.name ?? mount.name, location, ...(second ? { second } : {}), rear, row });
  }
  return [...groups.values()]
    .sort((a, b) => locationRank(record, a.location) - locationRank(record, b.location) || Number(a.rear) - Number(b.rear) || a.name.localeCompare(b.name))
    .flatMap(({ qty, name, location: inner, second, rear, row }): InventoryLine[] => {
      const where = inner !== null && second ? `${inner}/${second}` : inner;
      const location = where !== null && rear ? `${where}(R)` : where;
      const bands = (range: EquipmentRow["range"]) => ({
        min: range === undefined || range[0] === 0 ? DASH : String(range[0]),
        short: range === undefined || range[1] === 0 ? DASH : String(range[1]),
        medium: range === undefined || range[2] === 0 ? DASH : String(range[2]),
        long: range === undefined || range[3] === 0 ? DASH : String(range[3]),
      });
      const damageOf = (r: EquipmentRow | undefined) => {
        const physical = r && Object.hasOwn(PHYSICAL_BV.rows, r.id) ? PHYSICAL_BV.rows[r.id]?.damage : undefined;
        return physical === undefined ? (r?.damage ?? DASH) : String(typeof physical === "number" ? physical : physicalDamage(physical, record.tons));
      };
      const modes = row?.modes;
      // A physical weapon that makes no heat (a hatchet, a sword) prints a dash, as the published sheets do; a gun's 0 stays 0.
      const physical = row !== undefined && Object.hasOwn(PHYSICAL_BV.rows, row.id);
      const heat = row?.heat === undefined || (physical && row.heat === 0) ? DASH : String(row.heat);
      // A multi-mode launcher prints its name and heat, then one line per mode with that mode's damage and ranges.
      const first: InventoryLine = modes
        ? { qty, name, location: location ?? DASH, heat, damage: "", min: "", short: "", medium: "", long: "" }
        : { qty, name, location: location ?? DASH, heat, damage: damageOf(row), ...bands(row?.range) };
      return [first, ...(modes ?? []).map((m): InventoryLine => ({ qty: 0, name: m.name, location: "", heat: "", damage: m.damage, ...bands(m.range), sub: true }))];
    });
}

export interface AmmoLine {
  name: string;
  shots: number | null;
  /** A special munition that more than one launcher on the unit could fire, with the shots the bin carries for each; `shots` is null then. */
  choices?: { launcher: string; shots: number }[];
  /** A special munition's short name for the sheet: "Artemis-capable", "ER", "Inferno". */
  short?: string;
}

/** A special munition's name in the sheet's short form: without "Ammo" and the launcher family word. */
const shortMunition = (name: string) => name.replace(/ Ammo$/, "").replace(/ (Missile|LRM|SRM|ATM)$/, "").replace("-Capable", "-capable");

/** One entry per distinct ammunition item, shots summed over its bins: a row's `shotsPerTon` times the bin's tons, or its
 * own `shots` where that is what the row carries (a half-ton bin row holds its own count). A special munition carries the shots
 * of the standard ammunition of the launcher it feeds (Total Warfare p. 140), found among the unit's launchers: one figure when
 * every launcher it fits gives the same, `choices` when they differ, and `null` when the unit has no launcher it fits. `null`
 * too when the row has no figure. Items come in the order of their first bin. */
export function ammoLines(record: MechRecord, catalog: Catalog): AmmoLine[] {
  const totals = new Map<string, AmmoLine & { tons: number }>();
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
    if (row?.kind !== "ammunition") continue;
    const tons = typeof row.tons === "number" ? row.tons : 1;
    const perBin = row.shots ?? (row.shotsPerTon === undefined ? undefined : row.shotsPerTon * tons);
    const entry = totals.get(row.id) ?? { name: row.name, shots: null, tons: 0 };
    entry.tons += tons;
    if (perBin !== undefined) entry.shots = (entry.shots ?? 0) + perBin;
    totals.set(row.id, entry);
  }
  return [...totals.entries()].map(([id, { tons, ...line }]): AmmoLine => {
    const feeds = catalog.byId(id)?.feeds;
    if (!feeds) return line;
    const choices = launcherShots(record, catalog, feeds).map((c) => ({ launcher: c.launcher, shots: c.perTon * tons * (catalog.byId(id)?.shotsFactor ?? 1) }));
    const distinct = new Set(choices.map((c) => c.shots));
    if (distinct.size === 0) return line;
    return { ...line, shots: distinct.size === 1 ? (choices[0]?.shots ?? null) : null, choices, short: shortMunition(line.name) };
  });
}

/** The standard ammunition of each launcher on the unit that a special munition of these families fits: the launcher's name and its
 * shots per ton. A multi-mode launcher gives one entry for each mode. */
function launcherShots(record: MechRecord, catalog: Catalog, feeds: NonNullable<EquipmentRow["feeds"]>): { launcher: string; perTon: number }[] {
  const found = new Map<string, { launcher: string; perTon: number }>();
  for (const mount of record.mounts) {
    const match = /^(lrm|srm|mml|atm)-(\d+)-(is|clan)$/.exec(mount.equipmentId ?? "");
    const family = match?.[1] as "lrm" | "srm" | "mml" | "atm" | undefined;
    if (!match || !family || !feeds.includes(family)) continue;
    const size = match[2] ?? "";
    const side = match[3] ?? "";
    for (const mode of family === "mml" ? ["lrm", "srm"] : [family]) {
      const ammoId = family === "mml" ? `ammo-mml-${size}-${mode}-${side}` : `ammo-${family}-${size}-${side}`;
      const perTon = catalog.byId(ammoId)?.shotsPerTon;
      if (perTon !== undefined) found.set(ammoId, { launcher: family === "mml" ? `MML ${size} ${mode.toUpperCase()}` : `${family.toUpperCase()} ${size}`, perTon });
    }
  }
  return [...found.values()];
}

/** What each ammunition slot of the critical table prints, by mount id: `Ammo (LRM 10) 12`, the shots of one slot (a bin's shots over
 * the slots it takes), as the published sheets have it. A special munition names the launcher it feeds, `Ammo (LRM 15 Artemis-capable) 8`,
 * when the unit has just one that fits; with none or several it prints its own name and no shots. */
export function ammoSlotLabels(record: MechRecord, catalog: Catalog): Map<string, string> {
  const labels = new Map<string, string>();
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
    if (row?.kind !== "ammunition") continue;
    const slots = Math.max(1, catalog.factsOf(mount, record)?.slots ?? mount.slots ?? 1);
    const tons = typeof row.tons === "number" ? row.tons : 1;
    const launchers = row.feeds ? launcherShots(record, catalog, row.feeds) : [];
    const only = launchers.length === 1 ? launchers[0] : undefined;
    const shots = only ? only.perTon * tons * (row.shotsFactor ?? 1) : (row.shots ?? (row.shotsPerTon === undefined ? undefined : row.shotsPerTon * tons));
    const inner = only ? `${only.launcher} ${shortMunition(row.name)}` : row.name.replace(/ Ammo\b/, "");
    const known = shots !== undefined && (!row.feeds || only !== undefined);
    labels.set(mount.id, known ? `Ammo (${inner}) ${String(Math.round((shots / slots) * 100) / 100)}` : `Ammo (${inner})`);
  }
  return labels;
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
