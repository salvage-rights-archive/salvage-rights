// What a record may choose from: one rule for "is this available to a unit of this rules level, tech base and era". It answers
// for an equipment row, a chassis part (engine, gyro, cockpit, structure, armor, heat sink, myomer type) and a body
// configuration, and the editor's selectors, the equipment picker and the build form all ask it. The tables it reads are
// plain data (data/chassis.ts, data/editions.ts, the equipment catalog). Nothing here throws on a record it does not understand:
// an unknown era is no era, an unknown part is available.
//
// The rule: the item's rules level is at or below the record's; its tech base is the record's (a mixed record takes either, an
// item printed for both fits both); and it exists in the record's time. That time is the year when the record has one, else
// the whole era (an item introduced by the era's last year and not extinct before its first year), else no limit. An item with a
// prototype year and a production year has three times (rules/time.ts): from production it is available as its book prints it;
// from its prototype year to the year before production it is a prototype, available only at Experimental level and above (or
// the level its `prototypeLevel` names, where the books print it lower); before its prototype year it does not exist.
import { ARMOR, COCKPITS, ENGINE_TYPES, GYROS, HEAT_SINKS, MECH_TYPES, MYOMER, SHEET, STRUCTURE_TYPES } from "../data/chassis";
import type { ConfigurationRow, MechType, MechTypeRow, PartFacts, RulesLevel } from "../data/chassis";
import { inGame, listsOpen, rulesetOf } from "../data/rulesets";
import { CLAN_CASE_IDS, clanCaseAllowed } from "./case";
import { mountableOn } from "./catalog";
import type { Catalog, EquipmentRow } from "./catalog";
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast, levelIn, partLevel } from "./levels";
import { industrialRulesOf, mechTypeOf } from "./mech";
import type { MechRecord } from "./mech";
import { datesText, eraOfYear, partPrototype, partSpans, phaseIn, rowPhase, windowOf } from "./time";
import type { Phase, When } from "./time";

export { eraOfRecord, eraOfYear, partSpans, spansFit, windowOf } from "./time";
export type { Phase, When, Window } from "./time";

// ---------------------------------------------------------------------------------------------------------------
// Eras and years: kept consistent, in the era table of the draft's game (its edition's; none: Classic)
// ---------------------------------------------------------------------------------------------------------------

/** Set the year on a draft; the era follows it. A cleared year leaves the era as it was. */
export function setYear(draft: When, year: number | null): void {
  draft.year = year;
  if (year === null) return;
  const era = eraOfYear(year, rulesetOf(draft.editionId));
  if (era) draft.era = era.id;
  else delete draft.era;
}

/** Set the era on a draft (an empty or unknown id clears it). A year the new era does not hold is cleared, since a year and an era that
 * disagree is the one state this keeps out; the era then limits what is offered by its whole span. */
export function setEra(draft: When, id: string): void {
  const ruleset = rulesetOf(draft.editionId);
  const era = ruleset.eras.find((row) => row.id === id);
  if (!era) {
    delete draft.era;
    return;
  }
  draft.era = era.id;
  if (draft.year !== null && eraOfYear(draft.year, ruleset)?.id !== era.id) draft.year = null;
}

// ---------------------------------------------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------------------------------------------

// `editionId` names the game whose lists, levels and dates apply (data/rulesets.ts); a subject without one is Classic.
type Subject = Pick<MechRecord, "techBase" | "year" | "era" | "rulesLevel" | "unitType" | "frankenmech"> & { configuration?: string; chassis?: Pick<MechRecord["chassis"], "structure">; editionId?: string };
// `everything`, where a function takes it, lifts the tech base and time limits (the picker's "Show everything") and never the rules level.
const recordLevel = (record: Subject): RulesLevel => record.rulesLevel ?? DEFAULT_LEVEL;

/** True when a part or row printed for `base` can be used by a record of `techBase`; no base printed, or "both", fits any. */
function baseFits(base: "inner-sphere" | "clan" | "both" | undefined, techBase: MechRecord["techBase"]): boolean {
  return base === undefined || base === "both" || techBase === "mixed" || base === techBase;
}

/** An equipment row's phase for a record: production, prototype or neither (read through the record's edition). */
export function equipmentPhase(row: EquipmentRow, record: Subject & Pick<MechRecord, "editionId">, catalog: Catalog): Phase | null {
  const adjusted = catalog.rowFor(row.id, record.editionId) ?? row;
  return phaseIn(adjusted.availability, row.prototypeYear, windowOf(record));
}

/** An equipment row: on the record's game's list, at or below the level, the record's tech base, and in the record's time (read through
 * the record's edition, so a game's own level for the row counts). */
export function equipmentAvailable(row: EquipmentRow, record: Subject & Pick<MechRecord, "editionId">, catalog: Catalog, everything = false): boolean {
  if (!mountableOn(row, mechTypeOf(record).unit)) return false; // a row whose `units` leaves out the unit's type is never offered to it, not even with Show everything
  if (CLAN_CASE_IDS.includes(row.id) && !clanCaseAllowed(record)) return false; // Clan CASE is for a Clan structure (TM p.210); hidden, never marked, even with Show everything
  if (!inGame(row.games, rulesetOf(record.editionId), record.rulesLevel)) return false; // another game's row: hidden, never marked, even with Show everything
  const level = equipmentLevel(catalog.rowFor(row.id, record.editionId) ?? row);
  if (!levelAtLeast(recordLevel(record), level)) return false;
  if (everything) return true;
  if (!baseFits(row.techBase, record.techBase)) return false;
  const phase = equipmentPhase(row, record, catalog);
  return phase === "production" || (phase === "prototype" && levelAtLeast(recordLevel(record), levelIn(level, phase, row.prototypeLevel)));
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

const partRow = (kind: PartKind, key: string): PartRow | undefined => (Object.hasOwn(PART_TABLES[kind].types, key) ? PART_TABLES[kind].types[key] : undefined);

/** A chassis part's phase for a record: production, prototype or neither. A part with no dates printed is always in production. */
export function partPhase(part: PartFacts, record: Pick<Subject, "techBase" | "year" | "era" | "editionId">): Phase | null {
  return phaseIn(partSpans(part, record.techBase), partPrototype(part, record.techBase), windowOf(record));
}

/** A chassis part by table and key. A key the table does not have is available (we know nothing against it). */
export function partAvailable(kind: PartKind, key: string, record: Subject, everything = false): boolean {
  const part = partRow(kind, key);
  if (!part) return true;
  // The type decides first: an IndustrialMech takes the parts its rules name, and any other 'Mech none printed for IndustrialMechs.
  const industrial = industrialRulesOf(record);
  if (industrial ? !industrial.parts[kind].includes(key) : part.industrial) return false;
  if (!inGame(part.games, rulesetOf(record.editionId), record.rulesLevel)) return false; // another game's part: hidden, even with Show everything
  const level = partLevel(kind, key, part);
  if (!levelAtLeast(recordLevel(record), level)) return false;
  if (part.only !== undefined && part.only !== record.configuration) return false;
  if (everything) return true;
  if (!baseFits(part.techBase, record.techBase)) return false;
  const phase = partPhase(part, record);
  return phase === "production" || (phase === "prototype" && levelAtLeast(recordLevel(record), levelIn(level, phase, part.prototypeLevel)));
}

const configurationRow = (key: string): ConfigurationRow | undefined => (Object.hasOwn(SHEET.configurations, key) ? (SHEET.configurations as Record<string, ConfigurationRow>)[key] : undefined);

/** A body configuration's phase for a record: production, prototype or neither. A key we do not know is in production. */
export function configurationPhase(key: string, record: Pick<Subject, "techBase" | "year" | "era" | "editionId">): Phase | null {
  const row = configurationRow(key);
  if (!row) return "production";
  return baseFits(row.techBase, record.techBase) ? rowPhase(row, record.techBase, windowOf(record)) : null;
}

/** A body configuration's tech base and years against the record (not its level, which the level check reports); its prototype years count. */
export function configurationInTime(key: string, record: Pick<Subject, "techBase" | "year" | "era" | "editionId">): boolean {
  return configurationPhase(key, record) !== null;
}

/** A body configuration (biped, quad, tripod, LAM...). `everything` lifts the tech base and years, never the level. */
export function configurationAvailable(key: string, record: Subject, everything = false): boolean {
  const row = configurationRow(key);
  if (!row) return true;
  const industrial = industrialRulesOf(record);
  if (industrial && !industrial.configurations.includes(key)) return false;
  // An OmniMech takes the bodies the books allow: not a Land-Air 'Mech (IO:AE p.108); the tripod's tech base is its own row's.
  const omni = mechTypeOf(record).omni;
  if (omni && !omni.bodies.includes(key)) return false;
  if (!inGame(row.games, rulesetOf(record.editionId), record.rulesLevel)) return false; // another game's body type: hidden, even with Show everything
  const level = partLevel("configuration", key, row);
  if (!levelAtLeast(recordLevel(record), level)) return false;
  if (everything) return true;
  const phase = configurationPhase(key, record);
  return phase === "production" || (phase === "prototype" && levelAtLeast(recordLevel(record), levelIn(level, phase)));
}

// ---------------------------------------------------------------------------------------------------------------
// Choices for a selector: what is available, and the one the record already has even if it is not
// ---------------------------------------------------------------------------------------------------------------

const NOT_HERE = " (not available here)";

/** A selector label: the name, and for an item that is a prototype in the record's time its two dates, which also tag it as a prototype:
 * "XL Fusion (prototype 2556, production 2579)". An item in production is its name alone; the picker and the rules check give every item's dates. */
export function datedLabel(name: string, prototype: number | undefined, production: number | undefined, phase: Phase | null): string {
  return phase === "prototype" ? `${name} (${datesText(prototype, production).toLowerCase()})` : name;
}

/** A chassis part table's rows as select options: those available to the record, and the record's current value even if it is not (marked). */
export function partChoices(kind: PartKind, record: Subject, current: string): [string, string][] {
  const out: [string, string][] = [];
  const renamed = kind === "armor" ? industrialRulesOf(record)?.armorNames : undefined;
  for (const [key, row] of Object.entries(PART_TABLES[kind].types)) {
    const name = (renamed && Object.hasOwn(renamed, key) ? renamed[key] : undefined) ?? row.name;
    const label = datedLabel(name, partPrototype(row, record.techBase), partSpans(row, record.techBase)?.[0]?.from, partPhase(row, record));
    if (partAvailable(kind, key, record)) out.push([key, label]);
    else if (key === current) out.push([key, label + NOT_HERE]);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The 'Mech type (BattleMech, IndustrialMech, OmniMech)
// ---------------------------------------------------------------------------------------------------------------

/** A 'Mech type's phase for a record: through the production years of its row, the Clan ones where the row has them; a mixed record takes either. */
export function typePhase(id: MechType, record: Pick<Subject, "techBase" | "year" | "era" | "editionId">): Phase | null {
  const row = MECH_TYPES.find((r) => r.id === id);
  return row ? rowPhase(row, record.techBase, windowOf(record)) : null;
}

/** A type's years against the record: its production years (the Clan ones where the row has them) and its prototype years count; a mixed record takes either. */
export function typeInTime(row: MechTypeRow, record: Pick<Subject, "techBase" | "year" | "era" | "editionId">): boolean {
  return rowPhase(row, record.techBase, windowOf(record)) !== null;
}

/** A 'Mech type for a record: one its game offers (or every type where the game lifts its lists), at or below its rules level (raised to
 * the prototype's in its prototype years), and (unless `everything`) in its tech base and time. A key we do not know fits nothing. */
export function typeAvailable(id: MechType, record: Subject, everything = false): boolean {
  const row = MECH_TYPES.find((r) => r.id === id);
  if (!row) return false;
  const ruleset = rulesetOf(record.editionId);
  if (!ruleset.unitTypes.includes(id) && !listsOpen(ruleset, record.rulesLevel)) return false;
  if (!levelAtLeast(recordLevel(record), row.rulesLevel)) return false;
  if (row.industrial && !row.industrial.techBases.some((base) => base === record.techBase)) return false;
  if (everything) return true;
  const phase = typePhase(id, record);
  return phase === "production" || (phase === "prototype" && levelAtLeast(recordLevel(record), levelIn(row.rulesLevel, phase)));
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
    const clan = record.techBase === "clan";
    const label = datedLabel(row.label, clan ? (row.clanPrototypeYear ?? row.prototypeYear) : row.prototypeYear, (clan ? (row.clanAvailability ?? row.availability) : row.availability)[0]?.from, typePhase(row.id, record));
    if (typeAvailable(row.id, record)) out.push(row.ready ? { id: row.id, label } : { id: row.id, label: `${label} (not built yet)`, disabled: row.notReady ?? "Its rules are not built yet." });
    else if (row.id === current) out.push({ id: row.id, label: label + NOT_HERE });
  }
  return out;
}

/** The body configurations as select options, the same way. */
export function configurationChoices(record: Subject, current: string): [string, string][] {
  const out: [string, string][] = [];
  for (const [key, row] of Object.entries<ConfigurationRow>(SHEET.configurations)) {
    const clan = record.techBase === "clan";
    const label = datedLabel(row.name, clan ? (row.clanPrototypeYear ?? row.prototypeYear) : row.prototypeYear, (clan ? (row.clanAvailability ?? row.availability) : row.availability)[0]?.from, configurationPhase(key, record));
    if (configurationAvailable(key, record)) out.push([key, label]);
    else if (key === current) out.push([key, label + NOT_HERE]);
  }
  return out;
}
