// Rules levels: the order they come in, which level an item belongs to, and the lowest level that accepts everything a
// 'Mech uses. Pure functions over the tables in data/chassis.ts and the catalog; nothing here throws on what it does not
// know (an unknown part or an unmatched mount simply asks nothing of the level).
import { INTRODUCTORY_PARTS, ARMOR, COCKPITS, ENGINE_TYPES, GYROS, HEAT_SINKS, RULES_LEVELS, STRUCTURE_TYPES } from "../data/chassis";
import type { RulesLevel, RulesLevelRow } from "../data/chassis";
import type { Catalog, EquipmentRow } from "./catalog";
import { configurationOf } from "./mech";
import type { LocationCode, MechRecord } from "./mech";

export const LEVEL_ORDER: RulesLevel[] = RULES_LEVELS.map((row) => row.id);
export const DEFAULT_LEVEL: RulesLevel = "standard";
/** The year whose technology is Introductory: the Succession Wars as the 3025 Technical Readout and Total Warfare (p.275) call it. */
export const INTRODUCTORY_YEAR = 3025;

const rank = (level: RulesLevel) => LEVEL_ORDER.indexOf(level);

/** True when `a` includes everything `b` does: a unit at `a` may use an item at `b`. */
export function levelAtLeast(a: RulesLevel, b: RulesLevel): boolean {
  return rank(a) >= rank(b);
}

/** The level's row (label, description, cite). */
export function levelRow(level: RulesLevel): RulesLevelRow {
  return RULES_LEVELS[rank(level)] ?? RULES_LEVELS[rank(DEFAULT_LEVEL)] as RulesLevelRow;
}

/** The level a table row states for itself; a row that says nothing is Standard. */
export function levelOf(row: { rulesLevel?: RulesLevel }): RulesLevel {
  return row.rulesLevel ?? DEFAULT_LEVEL;
}

/**
 * The level an equipment row belongs to. A row that states a level has it. A row that does not is Standard, or Introductory
 * when it is Inner Sphere equipment on sale in 3025: one of its availability spans covers that year. That covers every
 * TechManual weapon, heat sink, jump jet and the like the book dates to or before 3025 and still sold then; it misses items
 * the book dates only for a later reintroduction (they are Standard, correctly) and cannot see an item a 3025 force
 * fielded that the book gives no date for (its `availability` is the book's, so none is guessed). The 3025 cut-off is Total Warfare p.275; applying it to the TechManual dates is our inference (see INTRODUCTORY_PARTS in data/chassis.ts).
 */
export function equipmentLevel(row: EquipmentRow): RulesLevel {
  const stated = levelOf(row);
  if (stated !== DEFAULT_LEVEL) return stated;
  const inSale = row.techBase === "inner-sphere" && row.availability.some((s) => s.from <= INTRODUCTORY_YEAR && (s.to === undefined || s.to >= INTRODUCTORY_YEAR));
  return inSale ? "introductory" : DEFAULT_LEVEL;
}

/** One thing a 'Mech uses that asks something of the rules level. */
export interface LevelItem {
  what: "equipment" | "configuration" | "structure" | "armor" | "engine" | "gyro" | "cockpit" | "heat sink" | "tech base";
  name: string;
  level: RulesLevel;
  cite?: { book: string; page: number };
  where: { field?: string; mountId?: string; location?: LocationCode };
}

const own = (table: object, key: string) => Object.hasOwn(table, key);
/** A part's level: the level its row states when above Standard (hardened armor is Advanced, say), else Introductory for the
 * 3025 parts, else Standard. */
const partLevel = (table: keyof typeof INTRODUCTORY_PARTS, key: string, row?: { rulesLevel?: RulesLevel }): RulesLevel => {
  const stated = row ? levelOf(row) : DEFAULT_LEVEL;
  if (stated !== DEFAULT_LEVEL) return stated;
  return INTRODUCTORY_PARTS[table].includes(key) ? "introductory" : DEFAULT_LEVEL;
};

/** A chassis part table's rows as select options at the record's level: a type above that level says what it needs, `Hardened (needs Advanced)`. */
export function partOptions(table: { types: Record<string, { name: string; rulesLevel?: RulesLevel }> }, level: RulesLevel): [string, string][] {
  return Object.entries(table.types).map(([key, row]) => {
    const needs = levelOf(row);
    return [key, needs !== DEFAULT_LEVEL && !levelAtLeast(level, needs) ? `${row.name} (needs ${levelRow(needs).label})` : row.name];
  });
}

/** Everything the record uses that has a level, one entry per part and one per distinct equipment row. */
export function levelItems(record: MechRecord, catalog: Catalog): LevelItem[] {
  const items: LevelItem[] = [];
  const chassis = record.chassis;
  const config = configurationOf(record.configuration);
  if (config) {
    const level = config.rulesLevel === DEFAULT_LEVEL ? partLevel("configuration", record.configuration) : config.rulesLevel;
    items.push({ what: "configuration", name: config.name, level, cite: config.levelCite, where: { field: "configuration" } });
  }
  if (record.techBase !== "inner-sphere") {
    items.push({ what: "tech base", name: record.techBase === "clan" ? "Clan technology" : "Mixed technology", level: DEFAULT_LEVEL, where: { field: "techBase" } });
  }
  const part = (what: LevelItem["what"], table: { cite: { book: string; page: number }; types: Record<string, { name: string; rulesLevel?: RulesLevel }> }, key: string, field: string, kind: keyof typeof INTRODUCTORY_PARTS) => {
    if (own(table.types, key)) items.push({ what, name: table.types[key]?.name ?? key, level: partLevel(kind, key, table.types[key]), cite: table.cite, where: { field } });
  };
  part("engine", ENGINE_TYPES, chassis.engine.type, "chassis.engine", "engine");
  part("gyro", GYROS, chassis.gyro, "chassis.gyro", "gyro");
  part("structure", STRUCTURE_TYPES, chassis.structure, "chassis.structure", "structure");
  part("armor", ARMOR, chassis.armorType, "chassis.armorType", "armor");
  part("heat sink", HEAT_SINKS, chassis.heatSinks.type, "chassis.heatSinks", "heatSink");
  const cockpit = own(COCKPITS.types, chassis.cockpit) ? COCKPITS.types[chassis.cockpit] : undefined;
  if (cockpit) {
    // A cockpit that belongs to a body type takes that body type's level (the tripod's is Advanced with the tripod).
    const owner = cockpit.only === undefined ? undefined : configurationOf(cockpit.only);
    items.push({
      what: "cockpit",
      name: cockpit.name,
      level: owner && owner.rulesLevel !== DEFAULT_LEVEL ? owner.rulesLevel : partLevel("cockpit", chassis.cockpit, cockpit),
      cite: cockpit.cite ?? COCKPITS.cite,
      where: { field: "chassis.cockpit" },
    });
  }
  const seen = new Set<string>();
  for (const mount of record.mounts) {
    if (mount.part || mount.equipmentId === null || seen.has(mount.equipmentId)) continue;
    const row = catalog.rowFor(mount.equipmentId, record.editionId);
    if (!row) continue;
    seen.add(row.id);
    items.push({ what: "equipment", name: row.name, level: equipmentLevel(row), cite: row.cite, where: { mountId: mount.id } });
  }
  return items;
}

/** The lowest level that accepts everything the record uses. A bare standard 'Mech is Introductory. */
export function lowestLevelFor(record: MechRecord, catalog: Catalog): RulesLevel {
  let lowest: RulesLevel = LEVEL_ORDER[0] ?? DEFAULT_LEVEL;
  for (const item of levelItems(record, catalog)) if (!levelAtLeast(lowest, item.level)) lowest = item.level;
  return lowest;
}

/** The record's own level, or for a record saved before levels existed the lowest that accepts what it uses. */
export function levelOfRecord(record: MechRecord, catalog: Catalog): RulesLevel {
  return record.rulesLevel !== undefined && LEVEL_ORDER.includes(record.rulesLevel) ? record.rulesLevel : lowestLevelFor(record, catalog);
}

/** The record with its level set, for a record read from storage, a file or an import that has none. Nothing else changes. */
export function withLevel(record: MechRecord, catalog: Catalog): MechRecord {
  return record.rulesLevel !== undefined && LEVEL_ORDER.includes(record.rulesLevel) ? record : { ...record, rulesLevel: lowestLevelFor(record, catalog) };
}

/** A configuration's name for a list at the record's level: above that level it says what it needs, `Tripod (needs Advanced)`. */
export function configurationOption(key: string, level: RulesLevel): string {
  const row = configurationOf(key);
  if (!row) return key;
  const needs = row.rulesLevel === DEFAULT_LEVEL ? undefined : row.rulesLevel;
  return needs !== undefined && !levelAtLeast(level, needs) ? `${row.name} (needs ${levelRow(needs).label})` : row.name;
}
