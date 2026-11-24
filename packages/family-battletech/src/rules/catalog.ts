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
  editions?: Record<string, Partial<Pick<EquipmentRow, "tons" | "slots" | "availability" | "locations">>>;
  cite: { book: string; page: number };
  checked: "page" | "text";
}
export interface EquipmentGroup {
  defaults: Partial<EquipmentRow>;
  items: (Partial<EquipmentRow> & { id: string; name: string })[];
}

const REQUIRED = ["id", "name", "kind", "techBase", "tons", "slots", "availability", "cite", "checked"] as const;

/** Rows from groups: each item takes its group's defaults and may override them. Throws, naming the id, on a missing
 * required field or a repeated id. `aliases` is optional and defaults to none. */
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
      rows.push(merged as EquipmentRow);
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------------------------
// Formulas: the items whose weight or slots the book scales with the 'Mech. A formula takes the row and the record and
// returns a number. Add one only when a row needs it.
// ---------------------------------------------------------------------------------------------------------------
type Formula = (row: EquipmentRow, record: MechRecord) => number;
const ceilHalf = (x: number) => Math.ceil(x * 2) / 2;
const FORMULAS: Record<string, Formula> = {
  // Jump Jets table (TechManual p. 51): per jet, by 'Mech tonnage band 10-55, 60-85, 90-100.
  "jump-jet": (_row, record) => (record.tons <= 55 ? 0.5 : record.tons <= 85 ? 1 : 2),
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
    const key = (text: string) => `${r.techBase}|${normalize(text)}`;
    if (!names.has(key(r.name))) names.set(key(r.name), r);
    for (const a of r.aliases) if (!aliases.has(key(a))) aliases.set(key(a), r);
  }

  const available: Catalog["available"] = (row, editionId, year) => {
    if (year === null) return true;
    return inEdition(row, editionId).availability.some((s) => year >= s.from && (s.to === undefined || year <= s.to));
  };

  const resolve = (value: number | string, row: EquipmentRow, record: MechRecord): number | undefined => {
    if (typeof value === "number") return value;
    const formula = Object.hasOwn(FORMULAS, value) ? FORMULAS[value] : undefined;
    return formula ? formula(row, record) : undefined;
  };

  const factsOf: FactsOf = (mount, record) => {
    const base = mount.equipmentId === null ? undefined : byId.get(mount.equipmentId);
    if (!base) return undefined;
    const row = inEdition(base, record.editionId);
    const tons = resolve(row.tons, row, record);
    const slots = resolve(row.slots, row, record);
    return tons === undefined || slots === undefined ? undefined : ({ tons, slots } satisfies MountFacts);
  };

  return {
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
