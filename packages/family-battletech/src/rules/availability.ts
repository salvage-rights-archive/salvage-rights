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
import { ARMOR, COCKPITS, ENGINE_TYPES, GYROS, HEAT_SINKS, isStarLeagueTech, MECH_TYPES, MYOMER, SHEET, STRUCTURE_TYPES } from "../data/chassis";
import type { ConfigurationRow, MechType, MechTypeRow, PartFacts, PartUnit, RulesLevel, Span } from "../data/chassis";
import { CLAN_SUB_ERAS } from "../data/editions";
import type { EraRow } from "../data/editions";
import { inGame, listsOpen, rulesetOf } from "../data/rulesets";
import { CLAN_CASE_IDS, clanCaseAllowed } from "./case";
import { mountableOn } from "./catalog";
import type { Catalog, EquipmentRow } from "./catalog";
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast, levelIn, partLevel } from "./levels";
import { SUPERHEAVY } from "../data/chassis";
import { industrialRulesOf, mechTypeOf, primitiveRulesOf, requiredCockpit, superheavyOf } from "./mech";
import type { MechRecord } from "./mech";
import { datesText, eraOfRecord, eraOfYear, erasOfYear, partPrototype, partSpans, phaseIn, rowPhase, windowOf } from "./time";
import { marked } from "./time";
import type { Outside, Phase, When, Window } from "./time";

export { eraNeedsPick, eraOfRecord, eraOfYear, erasOfYear, marked, partSpans, spansFit, windowOf } from "./time";
export type { Outside, Phase, When, Window } from "./time";

// ---------------------------------------------------------------------------------------------------------------
// Eras and years: kept consistent, in the era table of the draft's game (its edition's; none: Classic)
// ---------------------------------------------------------------------------------------------------------------


/** The eras a tech base can use out of `eras` (hide, do not mark): an era whose tech bases leave the base out is not offered, and a Mixed unit takes only an
 * era that allows Mixed. If that leaves nothing the list stays whole, since a year some era holds must offer something. */
export function erasForTechBase(eras: EraRow[], techBase: string | undefined, level?: RulesLevel): EraRow[] {
  if (techBase === undefined || level === "unlimited") return eras; // at Unlimited nothing is hidden
  const fits = eras.filter((era) => eraFitsBase(era, techBase));
  return fits.length > 0 ? fits : eras;
}

/** Whether the era is one the tech base can use (an era whose tech bases leave the base out is not; a Mixed unit takes only an era that allows Mixed). */
const eraFitsBase = (era: EraRow, techBase: string): boolean => (techBase === "mixed" ? era.noMixed !== true : era.techBases === undefined || (era.techBases as string[]).includes(techBase));

/** Why an era offered at Unlimited would normally be hidden for the tech base: its tech bases leave the base out. */
export function eraOutside(era: EraRow, techBase: string | undefined, level: RulesLevel | undefined): Outside | undefined {
  return level === "unlimited" && techBase !== undefined && !eraFitsBase(era, techBase) ? "other tech base" : undefined;
}

/** The one era a year in several eras belongs to for a tech base, or undefined when that is still ambiguous. An Inner Sphere unit takes the Master Unit List era
 * (the main table); a Clan unit the Clan sub-era the year is in (the book umbrella eras are never picked for it, and with no Clan sub-era it takes the main
 * era); a Mixed unit the one of those two that the era rows allow Mixed in, if only one does. */
function eraFor(eras: EraRow[], techBase: string | undefined, main: EraRow | undefined): EraRow | undefined {
  if (eras.length <= 1) return eras[0];
  const clan = erasForTechBase(eras.filter((era) => CLAN_SUB_ERAS.some((row) => row.id === era.id)), "clan");
  if (techBase === "clan") return clan.length === 1 ? clan[0] : clan.length === 0 ? main : undefined;
  if (techBase === "mixed") {
    const open = [...(main ? [main] : []), ...clan].filter((era) => era.noMixed !== true);
    return open.length === 1 ? open[0] : undefined;
  }
  return main;
}

/** Re-resolve the era of a draft by its tech base (a changed tech base calls this): a year in one era names it; a year in two takes the era the tech base
 * decides, or leaves the era unset for the player to pick when it is still ambiguous. A draft with no year is left alone. */
export function resolveEra(draft: When & { techBase?: string }): void {
  if (draft.year === null) return;
  const ruleset = rulesetOf(draft.editionId);
  const era = eraFor(erasOfYear(draft.year, ruleset), draft.techBase, eraOfYear(draft.year, ruleset));
  if (era) draft.era = era.id;
  else delete draft.era;
}

/** Set the year on a draft; the era follows it. The era the draft already names stays if it holds the year; otherwise the era is resolved by the tech base
 * (resolveEra). A cleared year leaves the era as it was. */
export function setYear(draft: When & { techBase?: string }, year: number | null): void {
  draft.year = year;
  if (year === null) return;
  if (draft.era !== undefined && erasOfYear(year, rulesetOf(draft.editionId)).some((era) => era.id === draft.era)) return;
  resolveEra(draft);
}

/** Set the era on a draft (an empty or unknown id clears only the era). The year follows it: one the era holds stays, and any other (or none) becomes the
 * mean of the era years, an open-ended era (ilClan) taking its first year. This is the one place for that rule. */
export function setEra(draft: When, id: string): void {
  const ruleset = rulesetOf(draft.editionId);
  const era = [...ruleset.eras, ...(ruleset.subEras ?? [])].find((row) => row.id === id);
  if (!era) {
    delete draft.era;
    return;
  }
  draft.era = era.id;
  if (draft.year === null || !erasOfYear(draft.year, ruleset).some((row) => row.id === era.id)) draft.year = era.endYear === undefined ? era.startYear : Math.round((era.startYear + era.endYear) / 2);
}

// ---------------------------------------------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------------------------------------------

// `editionId` names the game whose lists, levels and dates apply (data/rulesets.ts); a subject without one is Classic.
type Subject = Pick<MechRecord, "techBase" | "year" | "era" | "rulesLevel" | "unitType" | "frankenmech"> & { tons?: number; configuration?: string; chassis?: Pick<MechRecord["chassis"], "structure">; editionId?: string };
// `everything`, where a function takes it, lifts the tech base and time limits (the picker's "Show everything") and never the rules level.
const recordLevel = (record: Pick<Subject, "rulesLevel">): RulesLevel => record.rulesLevel ?? DEFAULT_LEVEL;

/** What decides an item by tech base and time, gathered once so that "is it available" and "why would it be hidden" read the same facts. */
export interface Fit {
  base: boolean;
  capped: boolean;
  phase: Phase | null;
  /** The item's dates, to tell "not yet introduced" from "outside era". */
  spans: Span[] | undefined;
  window: Window | null;
}

/** Unlimited lifts the tech base and time limits for everything (the level itself is no limit there), as the picker's "Show everything" does. */
const lifted = (record: Subject, everything: boolean): boolean => everything || recordLevel(record) === "unlimited";

/** Whether a fit passes the tech base and time limits at the record's level (a prototype needs the level its phase asks for). */
function fitsTime(fit: Fit, record: Subject, level: RulesLevel, prototypeLevel?: RulesLevel): boolean {
  if (!fit.base || fit.capped) return false;
  return fit.phase === "production" || (fit.phase === "prototype" && levelAtLeast(recordLevel(record), levelIn(level, fit.phase, prototypeLevel)));
}

/** The one place that says why a fit would be hidden at the lowest level that otherwise allows the item. Only a record at Unlimited has anything
 * offered because of the level (below Unlimited the item is simply hidden), and a prototype is normal there (it is offered from Experimental). */
export function outsideOf(fit: Fit, record: Pick<Subject, "rulesLevel">): Outside | undefined {
  if (recordLevel(record) !== "unlimited") return undefined;
  if (!fit.base) return "other tech base";
  if (fit.capped) return "not yet introduced";
  if (fit.phase !== null) return undefined;
  const first = fit.spans === undefined || fit.spans.length === 0 ? undefined : Math.min(...fit.spans.map((s) => s.from));
  return first !== undefined && fit.window !== null && fit.window.to < first ? "not yet introduced" : "outside era";
}

/** True when a part or row printed for `base` can be used by a record of `techBase`; no base printed, or "both", fits any. */
export function baseFits(base: "inner-sphere" | "clan" | "both" | undefined, techBase: MechRecord["techBase"], spans?: Span[]): boolean {
  return base === undefined || base === "both" || techBase === "mixed" || base === techBase || (techBase === "clan" && isStarLeagueTech(base, spans)); // Star League technology is a Clan record's own too (STAR_LEAGUE_TECH)
}

/** The spans a record reads an item's dates by. A Clan record takes Star League technology as its own, so the Inner Sphere extinctions of the Succession
 * Wars do not hide it (the owner's ruling: that is why it was LosTech): from its first year it stays available. Anything else keeps its own spans. */
export function ownSpans(record: Pick<MechRecord, "techBase">, base: "inner-sphere" | "clan" | "both" | undefined, spans: Span[] | undefined): Span[] | undefined {
  return record.techBase === "clan" && spans !== undefined && isStarLeagueTech(base, spans) ? [{ from: Math.min(...spans.map((s) => s.from)) }] : spans;
}

/** Whether the era the record names limits its tech base to items introduced by a date (Clan Post-Reaving: 3085 for Clan, 3049 for Inner Sphere) and this item
 * was introduced later (IO:AE p.24). */
export function pastEraCap(record: When & Pick<MechRecord, "techBase">, spans: Span[] | undefined): boolean {
  const cap = eraOfRecord(record)?.introCaps?.[record.techBase];
  return cap !== undefined && spans !== undefined && spans.length > 0 && Math.min(...spans.map((s) => s.from)) > cap;
}

/** An equipment row's phase for a record: production, prototype or neither (read through the record's edition). */
export function equipmentPhase(row: EquipmentRow, record: Subject & Pick<MechRecord, "editionId">, catalog: Catalog): Phase | null {
  const adjusted = catalog.rowFor(row.id, record.editionId) ?? row;
  return phaseIn(ownSpans(record, row.techBase, adjusted.availability), row.prototypeYear, windowOf(record));
}

/** An equipment row: on the record's game's list, at or below the level, the record's tech base, and in the record's time (read through
 * the record's edition, so a game's own level for the row counts). */
/** Whether the unit's own construction rules shut an item out: a superheavy 'Mech's jump and speed equipment (IO:AE printed p.156), a Primitive 'Mech's improved
 * jets, boosters and enhancements and anything introduced after 2500 (p.118), and a QuadVee's wheels for any other unit (p.128). Hidden, even with Show everything. */
export function equipmentBarredFor(row: EquipmentRow, record: Subject): boolean {
  const stem = row.id.replace(/-(is|clan)$/, "");
  if (stem === "wheels" && record.configuration !== "quadvee") return true;
  if (record.tons !== undefined && superheavyOf({ tons: record.tons }) && SUPERHEAVY.barred.some((b) => b.stems.includes(stem))) return true;
  const primitive = primitiveRulesOf(record);
  if (!primitive) return false;
  const first = row.availability.length === 0 ? undefined : Math.min(...row.availability.map((s) => s.from));
  return primitive.barredStems.includes(stem) || (first !== undefined && first > primitive.equipmentUntil);
}

function equipmentFit(row: EquipmentRow, record: Subject & Pick<MechRecord, "editionId">, catalog: Catalog): Fit {
  const spans = (catalog.rowFor(row.id, record.editionId) ?? row).availability;
  return { base: baseFits(row.techBase, record.techBase, spans), capped: pastEraCap(record, spans), phase: equipmentPhase(row, record, catalog), spans: ownSpans(record, row.techBase, spans), window: windowOf(record) };
}

/** The row's level when everything but tech base and time offers it to the record (the unit, game and level), else undefined. */
function equipmentOffered(row: EquipmentRow, record: Subject & Pick<MechRecord, "editionId">, catalog: Catalog): RulesLevel | undefined {
  if (!mountableOn(row, mechTypeOf(record).unit)) return undefined;
  if (equipmentBarredFor(row, record)) return undefined; // the unit's own rules bar it: hidden, never marked (the Picker keeps the item a mount already is) // a row whose `units` leaves out the unit's type is never offered to it, not even with Show everything
  if (CLAN_CASE_IDS.includes(row.id) && !clanCaseAllowed(record)) return undefined; // Clan CASE is for a Clan structure (TM p.210); hidden, never marked, even with Show everything
  if (!inGame(row.games, rulesetOf(record.editionId), record.rulesLevel)) return undefined; // another game's row: hidden, never marked, even with Show everything
  const level = equipmentLevel(catalog.rowFor(row.id, record.editionId) ?? row);
  return levelAtLeast(recordLevel(record), level) ? level : undefined;
}

export function equipmentAvailable(row: EquipmentRow, record: Subject & Pick<MechRecord, "editionId">, catalog: Catalog, everything = false): boolean {
  const level = equipmentOffered(row, record, catalog);
  if (level === undefined) return false;
  return lifted(record, everything) || fitsTime(equipmentFit(row, record, catalog), record, level, row.prototypeLevel);
}

/** Why an equipment row offered to a record at Unlimited would normally be hidden; none for anything normally available or not offered. */
export function equipmentOutside(row: EquipmentRow, record: Subject & Pick<MechRecord, "editionId">, catalog: Catalog): Outside | undefined {
  return equipmentOffered(row, record, catalog) === undefined ? undefined : outsideOf(equipmentFit(row, record, catalog), record);
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
  return phaseIn(ownSpans(record, part.techBase, partSpans(part, record.techBase)), partPrototype(part, record.techBase), windowOf(record));
}

function partFit(part: PartRow, record: Subject): Fit {
  return { base: baseFits(part.techBase, record.techBase, partSpans(part, "inner-sphere")), capped: pastEraCap(record, partSpans(part, record.techBase)), phase: partPhase(part, record), spans: partSpans(part, record.techBase), window: windowOf(record) };
}

/** A chassis part by table and key. A key the table does not have is available (we know nothing against it). `everything` and Unlimited lift the tech base and time limits. */
export function partAvailable(kind: PartKind, key: string, record: Subject, everything = false, unit: PartUnit = "mech"): boolean {
  const part = partRow(kind, key);
  if (!part) return true;
  const level = partOffered(kind, key, record, unit);
  return level !== undefined && (lifted(record, everything) || fitsTime(partFit(part, record), record, level, part.prototypeLevel));
}

/** Why a chassis part offered to a record at Unlimited would normally be hidden; none for anything normally available or not offered. */
export function partOutside(kind: PartKind, key: string, record: Subject, unit: PartUnit = "mech"): Outside | undefined {
  const part = partRow(kind, key);
  return part && partOffered(kind, key, record, unit) !== undefined ? outsideOf(partFit(part, record), record) : undefined;
}

/** The part's level when everything but tech base and time offers it to the record, else undefined. */
function partOffered(kind: PartKind, key: string, record: Subject, unit: PartUnit): RulesLevel | undefined {
  const part = partRow(kind, key);
  if (!part) return undefined;
  if (part.units !== undefined && !part.units.includes(unit)) return undefined; // a part printed for other units only, never offered here even with Show everything
  // The type decides first: an IndustrialMech takes the parts its rules name, and any other 'Mech none printed for IndustrialMechs.
  const industrial = industrialRulesOf(record);
  // A superheavy 'Mech (more than 100 tons) takes the parts its own rules name: its gyro and cockpit, and a shorter list of structure, engine and
  // myomer (IO:AE printed pp.156-157). A part printed for a tonnage range is for 'Mechs in it only. A record with no tonnage yet is read as a standard one.
  const heavy = record.tons === undefined ? undefined : superheavyOf({ tons: record.tons });
  if (part.tonnage && record.tons !== undefined && (record.tons < part.tonnage.min || record.tons > part.tonnage.max)) return undefined;
  // A Primitive 'Mech takes the parts its own rules list (IO:AE printed pp.116-118), which include the engines printed for IndustrialMechs; a part printed
  // for the Primitive 'Mechs belongs to them alone.
  const primitive = primitiveRulesOf(record);
  if (primitive) {
    if (!primitive.parts[kind].includes(key)) return undefined;
  } else if (part.primitive) return undefined;
  else if (!heavy || (kind !== "cockpit" && kind !== "gyro")) {
    if (industrial ? !industrial.parts[kind].includes(key) : part.industrial) return undefined;
  }
  if (heavy) {
    const allowed = (heavy.parts[industrial ? "industrialmech" : "mech"] as Partial<Record<PartKind, string[]>>)[kind];
    if (allowed && !allowed.includes(key)) return undefined;
    if (kind === "cockpit" && key !== requiredCockpit({ tons: record.tons ?? 0, configuration: record.configuration ?? "biped", unitType: record.unitType })) return undefined;
  }
  if (!inGame(part.games, rulesetOf(record.editionId), record.rulesLevel)) return undefined; // another game's part: hidden, even with Show everything
  const level = partLevel(kind, key, part);
  if (!levelAtLeast(recordLevel(record), level)) return undefined;
  if (part.only !== undefined && part.only !== record.configuration) return undefined;
  return level;
}

const configurationRow = (key: string): ConfigurationRow | undefined => (Object.hasOwn(SHEET.configurations, key) ? (SHEET.configurations as Record<string, ConfigurationRow>)[key] : undefined);

/** A body configuration's phase for a record: production, prototype or neither. A key we do not know is in production. */
export function configurationPhase(key: string, record: Pick<Subject, "techBase" | "year" | "era" | "editionId" | "unitType">): Phase | null {
  const row = configurationRow(key);
  if (!row) return "production";
  // The biped and quad of a Primitive 'Mech are the type's own and have its years (IO:AE printed p.44, "Primitive BattleMechs (Biped and Quad)"), not the standard body's.
  if (primitiveRulesOf(record)?.configurations.includes(key)) return "production";
  return baseFits(row.techBase, record.techBase, row.availability) ? rowPhase({ ...row, availability: ownSpans(record, row.techBase, row.availability) ?? row.availability }, record.techBase, windowOf(record)) : null;
}

/** A body configuration's tech base and years against the record (not its level, which the level check reports); its prototype years count. */
export function configurationInTime(key: string, record: Pick<Subject, "techBase" | "year" | "era" | "editionId" | "unitType">): boolean {
  return configurationPhase(key, record) !== null;
}

function configurationFit(row: ConfigurationRow, key: string, record: Subject): Fit {
  const primitive = primitiveRulesOf(record)?.configurations.includes(key) === true; // a Primitive 'Mech's own bodies carry its years, not the standard body's
  return { base: primitive || baseFits(row.techBase, record.techBase, row.availability), capped: false, phase: configurationPhase(key, record), spans: ownSpans(record, row.techBase, row.availability), window: windowOf(record) };
}

/** The body type's level when everything but tech base and time offers it to the record, else undefined. */
function configurationOffered(key: string, record: Subject): RulesLevel | undefined {
  const row = configurationRow(key);
  if (!row) return undefined;
  const industrial = industrialRulesOf(record);
  if (industrial && !industrial.configurations.includes(key)) return undefined;
  // An OmniMech takes the bodies the books allow: not a Land-Air 'Mech (IO:AE p.108); the tripod's tech base is its own row's.
  const omni = mechTypeOf(record).omni;
  if (omni && !omni.bodies.includes(key)) return undefined;
  if (!inGame(row.games, rulesetOf(record.editionId), record.rulesLevel)) return undefined; // another game's body type: hidden, even with Show everything
  const level = partLevel("configuration", key, row);
  return levelAtLeast(recordLevel(record), level) ? level : undefined;
}

/** A body configuration (biped, quad, tripod, LAM...). `everything` lifts the tech base and years, never the level; Unlimited lifts them too. */
export function configurationAvailable(key: string, record: Subject, everything = false): boolean {
  const row = configurationRow(key);
  if (!row) return true;
  const level = configurationOffered(key, record);
  return level !== undefined && (lifted(record, everything) || fitsTime(configurationFit(row, key, record), record, level));
}

/** Why a body configuration offered to a record at Unlimited would normally be hidden; none for anything normally available or not offered. */
export function configurationOutside(key: string, record: Subject): Outside | undefined {
  const row = configurationRow(key);
  return row && configurationOffered(key, record) !== undefined ? outsideOf(configurationFit(row, key, record), record) : undefined;
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
    if (partAvailable(kind, key, record)) out.push([key, marked(label, partOutside(kind, key, record))]);
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
  return lifted(record, everything) || fitsTime(typeFit(row, record), record, row.rulesLevel);
}

function typeFit(row: MechTypeRow, record: Subject): Fit {
  const clan = record.techBase === "clan";
  return { base: true, capped: false, phase: typePhase(row.id, record), spans: clan ? (row.clanAvailability ?? row.availability) : row.availability, window: windowOf(record) };
}

/** Why a 'Mech type offered to a record at Unlimited would normally be hidden; none for anything normally available or not offered. */
export function typeOutside(id: MechType, record: Subject): Outside | undefined {
  const row = MECH_TYPES.find((r) => r.id === id);
  return row && typeAvailable(id, record) ? outsideOf(typeFit(row, record), record) : undefined;
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
    const shown = marked(label, typeOutside(row.id, record));
    if (typeAvailable(row.id, record)) out.push(row.ready ? { id: row.id, label: shown } : { id: row.id, label: `${shown} (not built yet)`, disabled: row.notReady ?? "Its rules are not built yet." });
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
    if (configurationAvailable(key, record)) out.push([key, marked(label, configurationOutside(key, record))]);
    else if (key === current) out.push([key, label + NOT_HERE]);
  }
  return out;
}
