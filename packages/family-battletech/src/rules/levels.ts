// Rules levels: the order they come in, which level an item belongs to, and the lowest level that accepts everything a
// 'Mech uses. Pure functions over the tables in data/chassis.ts and the catalog; nothing here throws on what it does not
// know (an unknown part or an unmatched mount simply asks nothing of the level).
import { INTRODUCTORY_PARTS, ARMOR, FRANKENMECH, COCKPITS, ENGINE_TYPES, GYROS, HEAT_SINK_RULES, HEAT_SINKS, MIXED_TECHNOLOGY, RULES_LEVELS, STRUCTURE_TYPES } from "../data/chassis";
import type { PartFacts, RulesLevel, RulesLevelRow, Span } from "../data/chassis";
import type { Catalog, EquipmentRow } from "./catalog";
import { configurationOf, mechTypeOf } from "./mech";
import type { LocationCode, MechRecord } from "./mech";
import { datesText, partPrototype, partSpans, phaseIn, rowPhase, windowOf } from "./time";
import type { Phase } from "./time";

export const LEVEL_ORDER: RulesLevel[] = RULES_LEVELS.map((row) => row.id);
export const DEFAULT_LEVEL: RulesLevel = "standard";
/** The year whose technology is Introductory: the Succession Wars as the 3025 Technical Readout and Total Warfare (p.275) call it. */
export const INTRODUCTORY_YEAR = 3025;

const rank = (level: RulesLevel) => LEVEL_ORDER.indexOf(level);

/** True when `a` includes everything `b` does: a unit at `a` may use an item at `b`. */
export function levelAtLeast(a: RulesLevel, b: RulesLevel): boolean {
  return rank(a) >= rank(b);
}

/** Whether the record is a FrankenMech, the optional rule of Campaign Operations (printed p.213) that lets a 'Mech be pieced together from
 * donor parts: the record says so itself. */
export const isFrankenMech = (record: Pick<MechRecord, "frankenmech">): boolean => record.frankenmech !== undefined;

/** Whether the editor should offer the FrankenMech option: the record's level reaches the option's (Advanced), and it is not an OmniMech (which
 * cannot be one, p.213). A record that already is one keeps the option shown. Hide, do not mark. */
export const frankenMechOffered = (record: Pick<MechRecord, "frankenmech" | "rulesLevel" | "unitType" | "omni">): boolean =>
  isFrankenMech(record) || (record.omni === undefined && record.unitType !== "omnimech" && record.rulesLevel !== undefined && levelAtLeast(record.rulesLevel, FRANKENMECH.rulesLevel));

/** Whether two heat sink types may share a 'Mech. An Inner Sphere double with a Clan double: on a mixed technology record (that is itself an
 * Advanced option, so the level check asks for Advanced). Any other pairing: only on a FrankenMech, or at Fan-made level or higher (owner's
 * rulings of 2026-11-25). The same type twice is no mix. The standard rule is one type per 'Mech (TechManual p.53). */
export function heatSinkMixAllowed(record: Pick<MechRecord, "frankenmech" | "techBase" | "rulesLevel">, mainType: string, extraType: string): boolean {
  if (mainType === extraType) return false;
  const [first, second] = HEAT_SINK_RULES.mixable;
  const anyMix = isFrankenMech(record) || (record.rulesLevel !== undefined && levelAtLeast(record.rulesLevel, "fan-made"));
  if ((mainType === first && extraType === second) || (mainType === second && extraType === first)) return record.techBase === "mixed" || anyMix;
  return anyMix;
}

/** Whether the editor should offer extra heat sink groups at all: some pairing could be allowed (mixed technology, Fan-made or higher, a FrankenMech). */
export const heatSinkMixPossible = (record: Pick<MechRecord, "frankenmech" | "techBase" | "rulesLevel">): boolean =>
  record.techBase === "mixed" || isFrankenMech(record) || (record.rulesLevel !== undefined && levelAtLeast(record.rulesLevel, "fan-made"));

/** Where a record's time falls against the mixed technology option's dates (data/chassis.ts MIXED_TECHNOLOGY): in production, in its
 * prototype years (the Clan prototype year counts, as a mixed record draws on both bases), or before either. No year or era is no limit. */
export const mixedPhase = (when: Pick<MechRecord, "era" | "year">): Phase | null => rowPhase(MIXED_TECHNOLOGY, "mixed", windowOf(when));

/** The tech bases a unit at `level` and in `when` may choose, the ones that do not fit hidden: at Introductory only Inner Sphere (3025
 * technology); Mixed (an Advanced option, Experimental in its prototype years) only from its prototype year and at the level its phase
 * needs. The current choice is kept so a selector never blanks. */
export function techBaseChoices(level: RulesLevel | undefined, current: string, when: Pick<MechRecord, "era" | "year">): [string, string][] {
  const all: [string, string][] = [["inner-sphere", "Inner Sphere"], ["clan", "Clan"], ["mixed", "Mixed"]];
  const at = level ?? DEFAULT_LEVEL;
  const phase = mixedPhase(when);
  const mixedFits = phase !== null && levelAtLeast(at, levelIn(MIXED_TECHNOLOGY.rulesLevel, phase));
  const clanFits = levelAtLeast(at, DEFAULT_LEVEL);
  return all.filter(([value]) => value === current || value === "inner-sphere" || (value === "clan" ? clanFits : mixedFits));
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

/** The level an item needs in a phase. In production it is its own. In its prototype phase it is Experimental (IO:AE printed p.27: prototype
 * items "must be considered Experimental-level items"), unless the books print the item at a lower level for those years (`prototypeLevel`). */
export function levelIn(level: RulesLevel, phase: Phase | null, prototypeLevel?: RulesLevel): RulesLevel {
  return phase === "prototype" ? (prototypeLevel ?? "experimental") : level;
}

/** One thing a 'Mech uses that asks something of the rules level. */
export interface LevelItem {
  what: "equipment" | "configuration" | "structure" | "armor" | "engine" | "gyro" | "cockpit" | "heat sink" | "tech base" | "type" | "option";
  name: string;
  level: RulesLevel;
  /** Set when the record's time falls in the item's prototype phase: its two dates in words ("Prototype 2854, production 2856"). `level` is then the prototype's. */
  prototype?: string;
  cite?: { book: string; page: number };
  where: { field?: string; mountId?: string; location?: LocationCode };
}

const own = (table: object, key: string) => Object.hasOwn(table, key);
const firstFrom = (spans: Span[] | undefined): number | undefined => (spans === undefined || spans.length === 0 ? undefined : Math.min(...spans.map((s) => s.from)));
/** What a phase adds to a level item: the level in that phase and, in the prototype phase, the dates. */
const inPhase = (level: RulesLevel, phase: Phase | null, prototype: number | undefined, spans: Span[] | undefined, prototypeLevel?: RulesLevel) =>
  phase === "prototype" ? { level: levelIn(level, phase, prototypeLevel), prototype: datesText(prototype, firstFrom(spans)) } : { level };
/** A part's level: the level its row states when above Standard (hardened armor is Advanced, say), else Introductory for the
 * 3025 parts, else Standard. */
export const partLevel = (table: keyof typeof INTRODUCTORY_PARTS, key: string, row?: { rulesLevel?: RulesLevel }): RulesLevel => {
  const stated = row ? levelOf(row) : DEFAULT_LEVEL;
  if (stated !== DEFAULT_LEVEL) return stated;
  return INTRODUCTORY_PARTS[table].includes(key) ? "introductory" : DEFAULT_LEVEL;
};

/** Everything the record uses that has a level, one entry per part and one per distinct equipment row. */
export function levelItems(record: MechRecord, catalog: Catalog): LevelItem[] {
  const items: LevelItem[] = [];
  const chassis = record.chassis;
  const type = mechTypeOf(record);
  const window = windowOf(record);
  // The dates come with the phase: a prototype asks for Experimental rules, whatever level its book prints it at (IO:AE printed p.27).
  const typePhase = rowPhase(type, record.techBase, window);
  // A BattleMech is the unit the lowest level is built on, so only the other types ask something of the level, and a BattleMech only as a prototype.
  if (type.id !== "mech" || typePhase === "prototype") {
    const prototype = record.techBase === "clan" ? (type.clanPrototypeYear ?? type.prototypeYear) : type.prototypeYear;
    items.push({ what: "type", name: type.label, ...inPhase(type.rulesLevel, typePhase, prototype, record.techBase === "clan" ? (type.clanAvailability ?? type.availability) : type.availability), cite: type.cite, where: { field: "unitType" } });
  }
  if (isFrankenMech(record)) items.push({ what: "option", name: "FrankenMech", level: FRANKENMECH.rulesLevel, cite: FRANKENMECH.levelCite, where: { field: "frankenmech" } });
  const config = configurationOf(record.configuration);
  if (config) {
    const level = config.rulesLevel === DEFAULT_LEVEL ? partLevel("configuration", record.configuration) : config.rulesLevel;
    const phase = rowPhase(config, record.techBase, window);
    const prototype = record.techBase === "clan" ? (config.clanPrototypeYear ?? config.prototypeYear) : config.prototypeYear;
    items.push({ what: "configuration", name: config.name, ...inPhase(level, phase, prototype, record.techBase === "clan" ? (config.clanAvailability ?? config.availability) : config.availability), cite: config.levelCite, where: { field: "configuration" } });
  }
  if (record.techBase === "clan") items.push({ what: "tech base", name: "Clan technology", level: DEFAULT_LEVEL, where: { field: "techBase" } });
  if (record.techBase === "mixed") {
    // Mixed technology is an Advanced option (TO:AUE p.189), Experimental in its prototype years; the book's dates carry a "~", so they print with one.
    const phase = mixedPhase(record);
    const dates = `Prototype ~${MIXED_TECHNOLOGY.clanPrototypeYear}, production ~${MIXED_TECHNOLOGY.availability[0]?.from ?? ""}`;
    items.push({ what: "tech base", name: "Mixed technology", level: levelIn(MIXED_TECHNOLOGY.rulesLevel, phase), ...(phase === "prototype" ? { prototype: dates } : {}), cite: MIXED_TECHNOLOGY.cite, where: { field: "techBase" } });
  }
  /** A part's level item: its level, raised to the prototype's while the record's time is in the part's prototype phase. */
  const partItem = (what: LevelItem["what"], part: PartFacts & { name: string }, level: RulesLevel, cite: LevelItem["cite"], field: string): LevelItem => {
    const spans = partSpans(part, record.techBase);
    const prototype = partPrototype(part, record.techBase);
    return { what, name: part.name, ...inPhase(level, phaseIn(spans, prototype, window), prototype, spans, part.prototypeLevel), cite, where: { field } };
  };
  const part = (what: LevelItem["what"], table: { cite: { book: string; page: number }; types: Record<string, PartFacts & { name: string }> }, key: string, field: string, kind: keyof typeof INTRODUCTORY_PARTS) => {
    const row = own(table.types, key) ? table.types[key] : undefined;
    if (row) items.push(partItem(what, row, partLevel(kind, key, row), table.cite, field));
  };
  part("engine", ENGINE_TYPES, chassis.engine.type, "chassis.engine", "engine");
  part("gyro", GYROS, chassis.gyro, "chassis.gyro", "gyro");
  part("structure", STRUCTURE_TYPES, chassis.structure, "chassis.structure", "structure");
  part("armor", ARMOR, chassis.armorType, "chassis.armorType", "armor");
  part("heat sink", HEAT_SINKS, chassis.heatSinks.type, "chassis.heatSinks", "heatSink");
  for (const group of chassis.heatSinks.extra ?? []) part("heat sink", HEAT_SINKS, group.type, "chassis.heatSinks", "heatSink");
  const cockpit = own(COCKPITS.types, chassis.cockpit) ? COCKPITS.types[chassis.cockpit] : undefined;
  if (cockpit) {
    // A cockpit that belongs to a body type takes that body type's level (the tripod's is Advanced with the tripod).
    const owner = cockpit.only === undefined ? undefined : configurationOf(cockpit.only);
    const level = owner && owner.rulesLevel !== DEFAULT_LEVEL ? owner.rulesLevel : partLevel("cockpit", chassis.cockpit, cockpit);
    items.push(partItem("cockpit", cockpit, level, cockpit.cite ?? COCKPITS.cite, "chassis.cockpit"));
  }
  const seen = new Set<string>();
  for (const mount of record.mounts) {
    if (mount.part || mount.equipmentId === null || seen.has(mount.equipmentId)) continue;
    const row = catalog.rowFor(mount.equipmentId, record.editionId);
    if (!row) continue;
    seen.add(row.id);
    items.push({ what: "equipment", name: row.name, ...inPhase(equipmentLevel(row), phaseIn(row.availability, row.prototypeYear, window), row.prototypeYear, row.availability, row.prototypeLevel), cite: row.cite, where: { mountId: mount.id } });
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
