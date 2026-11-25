// What a record may choose from: one rule for "is this available to a unit of this rules level, tech base and era". It answers
// for an equipment row, a chassis part (engine, gyro, cockpit, structure, armor, heat sink, myomer type) and a body
// configuration, and the editor's selectors, the equipment picker and the build form all ask it. The tables it reads are
// plain data (data/chassis.ts, data/editions.ts, the equipment catalog). Nothing here throws on a record it does not understand:
// an unknown era is no era, an unknown part is available.
//
// The rule: the item's rules level is at or below the record's; its tech base is the record's (a mixed record takes either, an
// item printed for both fits both); and it exists in the record's time. That time is the year when the record has one, else
// the whole era (an item introduced by the era's last year and not extinct before its first year), else no limit.
import { ARMOR, COCKPITS, ENGINE_TYPES, GYROS, HEAT_SINKS, MECH_TYPES, MYOMER, SHEET, STRUCTURE_TYPES } from "../data/chassis";
import type { ConfigurationRow, MechType, MechTypeRow, PartFacts, RulesLevel, Span } from "../data/chassis";
import { ERAS } from "../data/editions";
import type { EraRow } from "../data/editions";
import { mountableOn } from "./catalog";
import type { Catalog, EquipmentRow } from "./catalog";
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast, partLevel } from "./levels";
import { industrialRulesOf, mechTypeOf } from "./mech";
import type { MechRecord } from "./mech";

// ---------------------------------------------------------------------------------------------------------------
// Eras and years: kept consistent
// ---------------------------------------------------------------------------------------------------------------

/** The era a year belongs to; none for a missing year or one before the first era. */
export function eraOfYear(year: number | null): EraRow | undefined {
  if (year === null || !Number.isFinite(year)) return undefined;
  return ERAS.find((era) => year >= era.startYear && (era.endYear === undefined || year <= era.endYear));
}

/** The record's era: the one it names when that era exists and holds its year, else the era its year falls in, else none. */
export function eraOfRecord(record: Pick<MechRecord, "era" | "year">): EraRow | undefined {
  const named = record.era === undefined ? undefined : ERAS.find((era) => era.id === record.era);
  if (named && (record.year === null || eraOfYear(record.year)?.id === named.id)) return named;
  return eraOfYear(record.year);
}

/** Set the year on a draft; the era follows it. A cleared year leaves the era as it was. */
export function setYear(draft: Pick<MechRecord, "era" | "year">, year: number | null): void {
  draft.year = year;
  if (year === null) return;
  const era = eraOfYear(year);
  if (era) draft.era = era.id;
  else delete draft.era;
}

/** Set the era on a draft (an empty or unknown id clears it). A year the new era does not hold is cleared, since a year and an era that
 * disagree is the one state this keeps out; the era then limits what is offered by its whole span. */
export function setEra(draft: Pick<MechRecord, "era" | "year">, id: string): void {
  const era = ERAS.find((row) => row.id === id);
  if (!era) {
    delete draft.era;
    return;
  }
  draft.era = era.id;
  if (draft.year !== null && eraOfYear(draft.year)?.id !== era.id) draft.year = null;
}

/** The stretch of years the record's technology may come from: its year, else its era's span, else none. */
export interface Window {
  from: number;
  to: number;
}
export function windowOf(record: Pick<MechRecord, "era" | "year">): Window | null {
  if (record.year !== null && Number.isFinite(record.year)) return { from: record.year, to: record.year };
  const era = eraOfRecord(record);
  return era ? { from: era.startYear, to: era.endYear ?? Number.POSITIVE_INFINITY } : null;
}

// ---------------------------------------------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------------------------------------------

type Subject = Pick<MechRecord, "techBase" | "year" | "era" | "rulesLevel" | "unitType"> & { configuration?: string };
// `everything`, where a function takes it, lifts the tech base and time limits (the picker's "Show everything") and never the rules level.
const recordLevel = (record: Subject): RulesLevel => record.rulesLevel ?? DEFAULT_LEVEL;

/** True when a part or row printed for `base` can be used by a record of `techBase`; no base printed, or "both", fits any. */
function baseFits(base: "inner-sphere" | "clan" | "both" | undefined, techBase: MechRecord["techBase"]): boolean {
  return base === undefined || base === "both" || techBase === "mixed" || base === techBase;
}

/** True when any span overlaps the window; no spans, or no window, means no limit. */
export function spansFit(spans: Span[] | undefined, window: Window | null): boolean {
  return spans === undefined || window === null || spans.some((s) => s.from <= window.to && (s.to === undefined || s.to >= window.from));
}

/** An equipment row: at or below the level, the record's tech base, and in the record's time (read through the record's edition). */
export function equipmentAvailable(row: EquipmentRow, record: Subject & Pick<MechRecord, "editionId">, catalog: Catalog, everything = false): boolean {
  if (!mountableOn(row, mechTypeOf(record).unit)) return false; // a row whose `units` leaves out the unit's type is never offered to it, not even with Show everything
  if (!levelAtLeast(recordLevel(record), equipmentLevel(row))) return false;
  if (everything) return true;
  if (!baseFits(row.techBase, record.techBase)) return false;
  const window = windowOf(record);
  return window === null || catalog.availableBetween(row, record.editionId, window.from, window.to);
}

export type PartKind = "engine" | "gyro" | "cockpit" | "structure" | "armor" | "heatSink" | "myomer";
type PartRow = PartFacts & { name: string; only?: string };
const PART_TABLES: Record<PartKind, { types: Record<string, PartRow> }> = {
  engine: ENGINE_TYPES,
  gyro: GYROS,
  cockpit: COCKPITS,
  structure: STRUCTURE_TYPES,
  armor: ARMOR,
  heatSink: HEAT_SINKS,
  myomer: MYOMER,
};

/** The spans a part is available over for a record: its own `availability` (it belongs to the one tech base the row is for), else
 * its first printed year for the tech base in play (a mixed record takes the earlier), else none printed. */
export function partSpans(part: PartFacts, techBase: MechRecord["techBase"]): Span[] | undefined {
  if (part.availability) return part.availability;
  const years = techBase === "inner-sphere" ? [part.introduced?.is] : techBase === "clan" ? [part.introduced?.clan] : [part.introduced?.is, part.introduced?.clan];
  const printed = years.filter((y): y is number => y !== undefined);
  return printed.length === 0 ? undefined : [{ from: Math.min(...printed) }];
}

/** A chassis part by table and key. A key the table does not have is available (we know nothing against it). */
export function partAvailable(kind: PartKind, key: string, record: Subject, everything = false): boolean {
  const types = PART_TABLES[kind].types;
  const part = Object.hasOwn(types, key) ? types[key] : undefined;
  if (!part) return true;
  // The type decides first: an IndustrialMech takes the parts its rules name, and any other 'Mech none printed for IndustrialMechs.
  const industrial = industrialRulesOf(record);
  if (industrial ? !industrial.parts[kind].includes(key) : part.industrial) return false;
  if (!levelAtLeast(recordLevel(record), partLevel(kind, key, part))) return false;
  if (part.only !== undefined && part.only !== record.configuration) return false;
  if (everything) return true;
  return baseFits(part.techBase, record.techBase) && spansFit(partSpans(part, record.techBase), windowOf(record));
}

const configurationRow = (key: string): ConfigurationRow | undefined => (Object.hasOwn(SHEET.configurations, key) ? (SHEET.configurations as Record<string, ConfigurationRow>)[key] : undefined);

/** A body configuration's tech base and years against the record (not its level, which the level check reports). A key we do not know fits. */
export function configurationInTime(key: string, record: Pick<Subject, "techBase" | "year" | "era">): boolean {
  const row = configurationRow(key);
  if (!row) return true;
  if (!baseFits(row.techBase, record.techBase)) return false;
  const window = windowOf(record);
  const forIs = spansFit(row.availability, window);
  const forClan = spansFit(row.clanAvailability ?? row.availability, window);
  return record.techBase === "inner-sphere" ? forIs : record.techBase === "clan" ? forClan : forIs || forClan;
}

/** A body configuration (biped, quad, tripod, LAM...). `everything` lifts the tech base and years, never the level. */
export function configurationAvailable(key: string, record: Subject, everything = false): boolean {
  const row = configurationRow(key);
  if (!row) return true;
  const industrial = industrialRulesOf(record);
  if (industrial && !industrial.configurations.includes(key)) return false;
  if (!levelAtLeast(recordLevel(record), partLevel("configuration", key, row))) return false;
  return everything || configurationInTime(key, record);
}

// ---------------------------------------------------------------------------------------------------------------
// Choices for a selector: what is available, and the one the record already has even if it is not
// ---------------------------------------------------------------------------------------------------------------

const NOT_HERE = " (not available here)";

/** A chassis part table's rows as select options: those available to the record, and the record's current value even if it is not (marked). */
export function partChoices(kind: PartKind, record: Subject, current: string): [string, string][] {
  const out: [string, string][] = [];
  const renamed = kind === "armor" ? industrialRulesOf(record)?.armorNames : undefined;
  for (const [key, row] of Object.entries(PART_TABLES[kind].types)) {
    const name = (renamed && Object.hasOwn(renamed, key) ? renamed[key] : undefined) ?? row.name;
    if (partAvailable(kind, key, record)) out.push([key, name]);
    else if (key === current) out.push([key, name + NOT_HERE]);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The 'Mech type (BattleMech, IndustrialMech, OmniMech)
// ---------------------------------------------------------------------------------------------------------------

/** A type's years against the record: the production years of its row, the Clan ones where the row has them; a mixed record takes either. */
export function typeInTime(row: MechTypeRow, record: Pick<Subject, "techBase" | "year" | "era">): boolean {
  const window = windowOf(record);
  const forIs = spansFit(row.availability, window);
  const forClan = spansFit(row.clanAvailability ?? row.availability, window);
  return record.techBase === "inner-sphere" ? forIs : record.techBase === "clan" ? forClan : forIs || forClan;
}

/** A 'Mech type for a record: at or below its rules level, and (unless `everything`) in its tech base and time. A key we do not know fits nothing. */
export function typeAvailable(id: MechType, record: Subject, everything = false): boolean {
  const row = MECH_TYPES.find((r) => r.id === id);
  if (!row) return false;
  if (!levelAtLeast(recordLevel(record), row.rulesLevel)) return false;
  if (row.industrial && !row.industrial.techBases.some((base) => base === record.techBase)) return false; // not mixed (TechManual p.64)
  return everything || typeInTime(row, record);
}

export interface TypeChoice {
  id: MechType;
  label: string;
  /** Set for a type listed but not choosable yet: why. */
  disabled?: string;
}
/** The 'Mech types to offer: those available to the record (a type whose rules are not built is listed, disabled, with its reason), and
 * the record's current type even if it is not (marked). */
export function typeChoices(record: Subject): TypeChoice[] {
  const current = mechTypeOf(record).id;
  const out: TypeChoice[] = [];
  for (const row of MECH_TYPES) {
    if (typeAvailable(row.id, record)) out.push(row.ready ? { id: row.id, label: row.label } : { id: row.id, label: `${row.label} (not built yet)`, disabled: row.notReady ?? "Its rules are not built yet." });
    else if (row.id === current) out.push({ id: row.id, label: row.label + NOT_HERE });
  }
  return out;
}

/** The body configurations as select options, the same way. */
export function configurationChoices(record: Subject, current: string): [string, string][] {
  const out: [string, string][] = [];
  for (const [key, row] of Object.entries(SHEET.configurations)) {
    if (configurationAvailable(key, record)) out.push([key, row.name]);
    else if (key === current) out.push([key, row.name + NOT_HERE]);
  }
  return out;
}
