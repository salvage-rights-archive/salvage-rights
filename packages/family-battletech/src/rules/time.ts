// A record's time and an item's dates against it: the era a year belongs to, the stretch of years a record may draw technology from,
// and where that stretch falls against an item's printed dates. Interstellar Operations: Alternate Eras (printed p.27) gives an item two
// dates, a prototype's and a production's: in production it is available as its book prints it, from its prototype year to the year
// before its production year it is a prototype (Experimental level unless the books say otherwise), and before that it does not exist.
// Pure functions over plain data; nothing here throws on a record it does not understand.
import { CLAN_TECHNOLOGY, SUPERHEAVY } from "../data/chassis";
import type { PartFacts, Span } from "../data/chassis";
import type { EraRow } from "../data/editions";
import { CLASSIC, rulesetOf } from "../data/rulesets";
import type { Ruleset } from "../data/rulesets";
import { industrialRulesOf, superheavyOf } from "./mech";
import type { MechRecord } from "./mech";

/** A record's time: its era and year, and the edition whose game's era table and dates apply (none: Classic). */
export type When = Pick<MechRecord, "era" | "year"> & { editionId?: string };

/** The era a year belongs to in a game's era table (Classic's by default); none for a missing year or one before the first era. */
export function eraOfYear(year: number | null, ruleset: Ruleset = CLASSIC): EraRow | undefined {
  if (year === null || !Number.isFinite(year)) return undefined;
  return ruleset.eras.find((era) => year >= era.startYear && (era.endYear === undefined || year <= era.endYear));
}

/** Every era a year belongs to: its Master Unit List era, then any overlapping sub-era (a Clan one). Two means the player picks which. */
export function erasOfYear(year: number | null, ruleset: Ruleset = CLASSIC): EraRow[] {
  if (year === null || !Number.isFinite(year)) return [];
  const main = eraOfYear(year, ruleset);
  const subs = (ruleset.subEras ?? []).filter((era) => year >= era.startYear && (era.endYear === undefined || year <= era.endYear));
  return main ? [main, ...subs] : subs;
}

/** The record's era: the one it names when that era exists and holds its year, else the era its year falls in, else none. */
export function eraOfRecord(record: When): EraRow | undefined {
  const ruleset = rulesetOf(record.editionId);
  const named = record.era === undefined ? undefined : [...ruleset.eras, ...(ruleset.subEras ?? [])].find((era) => era.id === record.era);
  if (named && (record.year === null || erasOfYear(record.year, ruleset).some((era) => era.id === named.id))) return named;
  return eraOfYear(record.year, ruleset);
}

/** Whether the year is in two eras and the record names neither: the player has to pick one. A record that names an era that holds its year has picked. */
export function eraNeedsPick(record: When): boolean {
  const ruleset = rulesetOf(record.editionId);
  if (erasOfYear(record.year, ruleset).length < 2) return false;
  return record.era === undefined || !erasOfYear(record.year, ruleset).some((era) => era.id === record.era);
}

/** The stretch of years the record's technology may come from: its year, else its era's span, else none. None too in a game that prints
 * no item dates (Gothic): there every item the game offers is in production whatever the year. */
export interface Window {
  from: number;
  to: number;
}
export function windowOf(record: When): Window | null {
  if (!rulesetOf(record.editionId).dated) return null;
  if (record.year !== null && Number.isFinite(record.year)) return { from: record.year, to: record.year };
  const era = eraOfRecord(record);
  return era ? { from: era.startYear, to: era.endYear ?? Number.POSITIVE_INFINITY } : null;
}

/** Whether the Clan technology base exists anywhere in the record's window (IO:AE printed p.17: from 2800). No year or era is no limit. */
export const clanInTime = (when: When): boolean => {
  const window = windowOf(when);
  return window === null || window.to >= CLAN_TECHNOLOGY.firstYear;
};

/** True when any span overlaps the window; no spans, or no window, means no limit. */
export function spansFit(spans: Span[] | undefined, window: Window | null): boolean {
  return spans === undefined || window === null || spans.some((s) => s.from <= window.to && (s.to === undefined || s.to >= window.from));
}

/** Where a window falls against an item's dates. "production": a span overlaps it (an item with no dates, or a window we do not know,
 * is unlimited, so also production). "prototype": no span does, but the stretch from its prototype year to the year before its first
 * span does. Otherwise none. */
export type Phase = "production" | "prototype";
export function phaseIn(spans: Span[] | undefined, prototypeYear: number | undefined, window: Window | null): Phase | null {
  if (spansFit(spans, window)) return "production";
  const first = spans === undefined ? undefined : Math.min(...spans.map((s) => s.from));
  if (window === null || first === undefined || prototypeYear === undefined || prototypeYear >= first) return null;
  return prototypeYear <= window.to && first - 1 >= window.from ? "prototype" : null;
}

/** The better of two phases, for a mixed record that may draw on either tech base. */
export const betterPhase = (a: Phase | null, b: Phase | null): Phase | null => (a === "production" || b === "production" ? "production" : (a ?? b));

type Based = "inner-sphere" | "clan" | "mixed";
const basesOf = (techBase: Based): ("is" | "clan")[] => (techBase === "inner-sphere" ? ["is"] : techBase === "clan" ? ["clan"] : ["is", "clan"]);
const numbers = (list: (number | undefined)[]): number[] => list.filter((y): y is number => y !== undefined);

/** The spans a part is available over for a record: its own `availability` (it belongs to the one tech base the row is for), else
 * its first printed year for the tech base in play (a mixed record takes the earlier), else none printed. */
export function partSpans(part: PartFacts, techBase: Based): Span[] | undefined {
  if (part.availability) return part.availability;
  const printed = numbers(basesOf(techBase).map((b) => part.introduced?.[b]));
  return printed.length === 0 ? undefined : [{ from: Math.min(...printed) }];
}

/** True when the year `partSpans` takes from `introduced` is a prototype's only (the book prints no production year for that tech base). */
export function partIsPrototypeOnly(part: PartFacts, techBase: Based): boolean {
  if (part.availability || !part.introduced?.prototype) return false;
  const used = basesOf(techBase).filter((b) => part.introduced?.[b] !== undefined);
  return used.length > 0 && used.every((b) => part.introduced?.prototype?.includes(b));
}

/** The part's prototype year for a record's tech base (a mixed record takes the earlier), if the book prints one. */
export function partPrototype(part: PartFacts, techBase: Based): number | undefined {
  const year = part.prototypeYear;
  if (typeof year === "number" || year === undefined) return year;
  const printed = numbers(basesOf(techBase).map((b) => year[b]));
  return printed.length === 0 ? undefined : Math.min(...printed);
}

/** What a row with two tech bases' dates (a body type, a 'Mech type) has: the Inner Sphere dates and the Clan ones where they differ. */
export interface DatedRow {
  availability: Span[];
  clanAvailability?: Span[];
  prototypeYear?: number;
  clanPrototypeYear?: number;
}
/** A row's phase for a record: through the Inner Sphere dates, the Clan ones, or either for a mixed record. */
export function rowPhase(row: DatedRow, techBase: Based, window: Window | null): Phase | null {
  const forIs = phaseIn(row.availability, row.prototypeYear, window);
  const forClan = phaseIn(row.clanAvailability ?? row.availability, row.clanPrototypeYear ?? row.prototypeYear, window);
  return techBase === "inner-sphere" ? forIs : techBase === "clan" ? forClan : betterPhase(forIs, forClan);
}

/** "Prototype 2854, production 2856": both printed dates in words, or just the one there is. */
export function datesText(prototype: number | undefined, production: number | undefined): string {
  if (prototype !== undefined && production !== undefined) return `Prototype ${prototype}, production ${production}`;
  if (prototype !== undefined) return `Prototype ${prototype}`;
  return production === undefined ? "" : `Production ${production}`;
}

/** A superheavy 'Mech's own phase for a record: the years of its type (the BattleMech tripod's are later than the biped's and quad's), as the book panel read them (SUPERHEAVY.dates). Production for a 'Mech of 100 tons or less, which has no dates of this kind. */
export function superheavyPhase(record: When & Pick<MechRecord, "tons" | "unitType" | "configuration">): Phase | null {
  if (!superheavyOf(record)) return "production";
  return rowPhase(superheavyDates(record), "inner-sphere", windowOf(record));
}
/** The production and prototype years of the superheavy 'Mech a record is: by BattleMech or IndustrialMech and by tripod or not (SUPERHEAVY.dates). */
export function superheavyDates(record: Pick<MechRecord, "unitType" | "configuration">): { availability: Span[]; prototypeYear?: number } {
  const industrial = industrialRulesOf(record) !== undefined;
  const tripod = record.configuration === "tripod";
  return SUPERHEAVY.dates[industrial ? (tripod ? "industrialTripod" : "industrialmech") : tripod ? "mechTripod" : "mech"];
}

/** Why an item offered at Unlimited would normally be hidden: its tech base is not the record's, it is introduced after the record's time, or it
 * is outside the record's era (extinct before it, or an era that leaves its tech base out). */
export type Outside = "other tech base" | "not yet introduced" | "outside era";

/** A select label with the Unlimited marker: "Clan XL (other tech base)". */
export const marked = (label: string, outside: Outside | undefined): string => (outside === undefined ? label : `${label} (${outside})`);
