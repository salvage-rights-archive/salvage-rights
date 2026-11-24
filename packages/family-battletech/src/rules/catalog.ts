// The equipment catalog: lookup, availability by year and edition, and the weight and slots of a mounted item. The table
// itself is plain data in data/equipment/*, written in groups whose `defaults` carry what the items share; `expand`
// turns the groups into rows and `createCatalog` indexes them. Nothing here is specific to a book except the formula
// table, which holds the few items the book scales with the 'Mech.
import type { FactsOf, LocationCode, MechRecord, MountFacts, TechBase } from "./mech";

export type EquipmentKind = "weapon" | "ammunition" | "heat-sink" | "jump-jet" | "other";
/** Years, inclusive, as the book prints them; no `to` means the item is still available. */
export interface Span {
  from: number;
  to?: number;
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
  locations?: LocationCode[]; // where the book says the item may be placed; absent means anywhere
  splittable?: boolean; // true only where the book lets the item span adjacent locations
  needs?: string; // what the item must be paired with, in the same location: "launcher", "machine-gun"
  /** True when `availability` is not a year the book prints for this tech base (a dash in the book's table, or one date
   * printed for both tech bases). The availability check reports such rows as notes, not errors. */
  yearsInferred?: true;
  /** The 'Mech carries exactly this many of the item, each one a separate one-slot mount, placed anywhere. */
  perMech?: number;
  /** A non-missile direct-fire or pulse weapon: its weight counts toward a targeting computer (TechManual p. 238). */
  directFire?: true;
  editions?: Record<string, Partial<Pick<EquipmentRow, "tons" | "slots" | "availability" | "locations">>>;
  cite: { book: string; page: number };
  checked: "page" | "text";
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
 * empty or backwards availability. `aliases` is optional and defaults to none. */
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
      rows.push(row);
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------------------------
// Formulas: the items whose weight or slots the book scales with the 'Mech. A formula takes the row and the record and
// returns a number. Add one only when a row needs it.
// ---------------------------------------------------------------------------------------------------------------
type Formula = (row: EquipmentRow, record: MechRecord, catalog: Catalog) => number;
function directFireTons(record: MechRecord, catalog: Catalog): number {
  let total = 0;
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
    if (row?.directFire) total += catalog.factsOf(mount, record)?.tons ?? 0;
  }
  return total;
}
const ceilHalf = (x: number) => Math.ceil(x * 2) / 2;
const FORMULAS: Record<string, Formula> = {
  // Jump Jets table (TechManual p. 51): per jet, by 'Mech tonnage band 10-55, 60-85, 90-100.
  "jump-jet": (_row, record) => (record.tons <= 55 ? 0.5 : record.tons <= 85 ? 1 : 2),
  // Improved jump jets (p. 51): twice the standard weight per jet (two slots, in the data).
  "improved-jump-jet": (row, record, catalog) => 2 * (FORMULAS["jump-jet"]?.(row, record, catalog) ?? 0),
  // Targeting computer (p. 238): the weight of the record's direct-fire weapons over 4 (Inner Sphere) or 5 (Clan),
  // rounded up to a whole ton; one slot per ton.
  "targeting-computer-is": (_row, record, catalog) => Math.ceil(directFireTons(record, catalog) / 4),
  "targeting-computer-clan": (_row, record, catalog) => Math.ceil(directFireTons(record, catalog) / 5),
  // MASC (p. 52): 5 percent of the 'Mech's tonnage (Inner Sphere) or 4 percent (Clan), rounded normally; slots are the same number.
  "masc-is": (_row, record) => Math.round(record.tons / 20),
  "masc-clan": (_row, record) => Math.round((record.tons * 4) / 100),
  // Hatchet (p. 220), and the slots of a sword (p. 237): the 'Mech's tonnage over 15, rounded up.
  "ceil-tons-15": (_row, record) => Math.ceil(record.tons / 15),
  // Sword weight (p. 237): tonnage over 20, rounded up to a half ton.
  "sword-tons": (_row, record) => ceilHalf(record.tons / 20),
  // Retractable blade (p. 237): tonnage over 20 rounded up to a half ton, plus half a ton for the mechanism; slots are
  // tonnage over 20 rounded up, plus one.
  "blade-tons": (_row, record) => ceilHalf(record.tons / 20) + 0.5,
  "blade-slots": (_row, record) => Math.ceil(record.tons / 20) + 1,
};

export interface Catalog {
  all(): EquipmentRow[];
  byId(id: string): EquipmentRow | undefined;
  /** Exact name, then alias, within the tech base; case, spacing, hyphens, slashes and periods are ignored. */
  match(name: string, techBase: TechBase): EquipmentRow | undefined;
  offered(editionId: string, want: { techBase: TechBase | "mixed"; year: number | null }): EquipmentRow[];
  available(row: EquipmentRow, editionId: string, year: number | null): boolean;
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
    for (const a of r.aliases) {
      const key = `${r.techBase}|${normalize(a)}`;
      const claimed = names.get(key) ?? aliases.get(key);
      if (claimed && claimed.id !== r.id) throw new Error(`equipment ${claimed.id} and ${r.id} have the same name within a tech base`);
      aliases.set(key, r);
    }
  }

  const available: Catalog["available"] = (row, editionId, year) => {
    if (year === null) return true;
    return inEdition(row, editionId).availability.some((s) => year >= s.from && (s.to === undefined || year <= s.to));
  };

  const resolve = (value: number | string, row: EquipmentRow, record: MechRecord): number | undefined => {
    if (typeof value === "number") return value;
    const formula = Object.hasOwn(FORMULAS, value) ? FORMULAS[value] : undefined;
    return formula ? formula(row, record, catalog) : undefined;
  };

  const factsOf: FactsOf = (mount, record) => {
    const base = mount.equipmentId === null ? undefined : byId.get(mount.equipmentId);
    if (!base) return undefined;
    const row = inEdition(base, record.editionId);
    const tons = resolve(row.tons, row, record);
    const slots = resolve(row.slots, row, record);
    return tons === undefined || slots === undefined ? undefined : ({ tons, slots } satisfies MountFacts);
  };

  const catalog: Catalog = {
    all: () => rows,
    byId: (id) => byId.get(id),
    match: (name, techBase) => {
      const key = `${techBase}|${normalize(name)}`;
      return names.get(key) ?? aliases.get(key);
    },
    offered: (editionId, { techBase, year }) =>
      rows
        .filter((r) => (techBase === "mixed" || r.techBase === techBase) && available(r, editionId, year))
        .map((r) => inEdition(r, editionId)),
    available,
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
