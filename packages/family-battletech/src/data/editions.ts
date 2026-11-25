// The editions the tool knows. An edition names the books it follows: which one the play rules come from and which one the
// construction rules and equipment tables come from. Plain data; nothing here runs.
import { MECH_TYPES } from "./chassis";

export interface Edition {
  id: string;
  name: string;
  books: { role: "play" | "construction"; title: string; printing: string; errata?: string }[];
  unitTypes: { id: string; name: string; ready: boolean }[];
}

// The 'Mech types (BattleMech, IndustrialMech, OmniMech) come from MECH_TYPES in data/chassis.ts, which also holds their rules; the
// other unit families wait here until their rules are built.
const UNIT_TYPES: Edition["unitTypes"] = [
  ...MECH_TYPES.map(({ id, label, ready }) => ({ id, name: label, ready })),
  { id: "vehicle", name: "Vehicle", ready: false },
  { id: "protomech", name: "ProtoMech", ready: false },
  { id: "infantry", name: "Infantry", ready: false },
];

// What a unit can be built under: the book its play rules come from, plus its construction book. Both editions build from
// TechManual (the Core Rulebook has no construction rules), so they differ only in play: the weapon Type column, and the
// pages the play figures are cited from (PLAY_RULES below). Total Warfare / TechManual stays the default: it is the pair the
// tool was built on and the one every saved record and earlier citation names, and no figure the tool keeps differs between
// the two play books except the Type column, so the choice costs nothing. The Core Rulebook is the newer book (see BOOKS).
const TECHMANUAL = { role: "construction", title: "TechManual", printing: "corrected sixth printing", errata: "v8.0 (22 August 2024)" } as const;
export const EDITIONS: Edition[] = [
  {
    id: "total-warfare",
    name: "Total Warfare / TechManual",
    books: [{ role: "play", title: "Total Warfare", printing: "corrected eleventh printing" }, TECHMANUAL],
    unitTypes: UNIT_TYPES,
  },
  {
    id: "bcr-tm",
    name: "Core Rulebook (BCR) / TechManual",
    books: [{ role: "play", title: "BattleTech Core Rulebook", printing: "2026, first printing", errata: "v0.1 (10 August 2026)" }, TECHMANUAL],
    unitTypes: UNIT_TYPES,
  },
];

export const DEFAULT_EDITION = "total-warfare";

// Edition ids that earlier versions saved, and the edition they are read as now: the 2026 Core Rulebook, once a play-only
// note, is the play book of bcr-tm.
const RENAMED_EDITIONS: Record<string, string> = { "core-2026": "bcr-tm" };

/** The edition a saved id means today: an id from an earlier version is mapped, any other is kept as it is. */
export function currentEditionId(id: string): string {
  return Object.hasOwn(RENAMED_EDITIONS, id) ? (RENAMED_EDITIONS[id] ?? id) : id;
}

/** An edition's name as screens and the record sheet show it; an id the tool does not know shows as it is. */
export function editionName(id: string): string {
  return EDITIONS.find((e) => e.id === currentEditionId(id))?.name ?? id;
}

/** The play rules the tool encodes and the printed page of each in each edition's play book (Total Warfare, corrected eleventh
 * printing; Core Rulebook, first printing), read against the page images. `differs` says how the books differ where it bears on
 * what the tool keeps; the values are the same in both unless a row's own `editions` override says otherwise. */
export const PLAY_RULES: { id: string; what: string; pages: Record<string, string>; differs?: string }[] = [
  { id: "weapons", what: "weapon figures", pages: { "total-warfare": "303-304", "bcr-tm": "248-252" }, differs: "heat, damage, range and ammunition per ton are equal; the Type column differs on 29 rows (their bcr-tm overrides)" },
  { id: "movement-heat", what: "movement heat", pages: { "total-warfare": "159", "bcr-tm": "102" }, differs: "no heat for attempting to stand in the Core Rulebook (+1 per attempt in Total Warfare); the tool does not model it" },
  { id: "heat-effects", what: "heat effects", pages: { "total-warfare": "159-160", "bcr-tm": "103" } },
  { id: "target-movement", what: "target movement modifier", pages: { "total-warfare": "117", "bcr-tm": "68" }, differs: "bands equal; the Core Rulebook also puts a combat-dropped unit in the 7-9 hex band" },
  { id: "masc", what: "MASC", pages: { "total-warfare": "137", "bcr-tm": "204" }, differs: "speed equal (twice Walking MP); failure follows Escalating Failure (Core Rulebook p. 180), not Total Warfare's leg criticals" },
  { id: "tsm", what: "triple-strength myomer", pages: { "total-warfare": "143", "bcr-tm": "205" } },
  { id: "stealth-armor", what: "stealth armor", pages: { "total-warfare": "142", "bcr-tm": "202" } },
  { id: "physical-weapons", what: "physical weapons", pages: { "total-warfare": "146", "bcr-tm": "81" } },
  { id: "damage-transfer", what: "damage transfer", pages: { "total-warfare": "123", "bcr-tm": "89" } },
];

/** A citation line for the edition's play book: its title and each play rule's page, as `Core Rulebook: movement heat p. 102; ...`. */
export function playCites(id: string): string {
  const edition = EDITIONS.find((e) => e.id === currentEditionId(id));
  const play = edition?.books.find((b) => b.role === "play");
  if (!edition || !play) return "";
  const parts = PLAY_RULES.flatMap((rule) => (rule.pages[edition.id] === undefined ? [] : [`${rule.what} p. ${rule.pages[edition.id] ?? ""}`]));
  return `${bookName(play.title)}: ${parts.join("; ")}.`;
}

/** Every book and printing the tool cites, with when each was published and when its errata is dated; ISO dates, a month where only
 * the month is known. `approx` marks a printing dated from the library copy's creation date, because the book prints only a year.
 * A conflict between two books goes to the one whose latest of the two dates is later (`newer`); a book cited at an older printing
 * than the library holds is listed at the newer one, the tool's page numbers being equal in both. */
export interface BookDates {
  printing: string;
  printed: string;
  approx?: true;
  errata?: string;
  errataDated?: string;
}
export const BOOKS: Record<string, BookDates> = {
  "Total Warfare": { printing: "corrected eleventh printing", printed: "2024-11", approx: true, errata: "v11.01", errataDated: "2023-09-17" },
  TechManual: { printing: "corrected sixth printing", printed: "2022-02", errata: "v8.0", errataDated: "2024-08-22" },
  "TechManual Battle Value v4.1": { printing: "v4.1 replacement pages", printed: "2021-06-06", errata: "v8.0 (the TechManual's)", errataDated: "2024-08-22" },
  "Tactical Operations: Advanced Units and Equipment": { printing: "corrected seventh printing", printed: "2024-06", approx: true, errata: "v7.0", errataDated: "2023-09-23" },
  "Interstellar Operations: Alternate Eras": { printing: "third corrected printing", printed: "2023-01", approx: true, errata: "v3.01", errataDated: "2023-01-17" },
  "BattleTech Core Rulebook": { printing: "first printing", printed: "2026-05", approx: true, errata: "v0.1", errataDated: "2026-08-10" },
  "Quick-Strike: Introductory 'Mech Cards": { printing: "2012 cards", printed: "2012-01", approx: true },
  "BattleTech Quick-Start Rules": { printing: "2021 rules", printed: "2021-01", approx: true },
};

/** The later of a book's printing and errata dates; undefined for a book not in BOOKS. */
export function latestDate(book: string): string | undefined {
  const dates = Object.hasOwn(BOOKS, book) ? BOOKS[book] : undefined;
  return dates && [dates.printed, dates.errataDated ?? ""].reduce((a, b) => (b > a ? b : a));
}

/** Of two books that disagree, the one whose latest printing or errata is later (the owner's rule: the last published, or the one
 * whose errata is newer wins); undefined on a tie, for the same book twice, or for a book the table does not know. */
export function newer(a: string, b: string): string | undefined {
  const da = latestDate(a);
  const db = latestDate(b);
  if (da === undefined || db === undefined || da === db) return undefined;
  return da > db ? a : b;
}
// Who published each book we cite. These games have had several publishers, so a citation names the one whose
// printing we read. A new book gets a row here. Tactical Operations: Advanced Units and Equipment is cited from its
// corrected seventh printing (2024); every page the app cites has the same printed number as in the sixth printing.
const PUBLISHERS: Record<string, string> = {
  "Total Warfare": "Catalyst Game Labs",
  "BattleTech Core Rulebook": "Catalyst Game Labs",
  TechManual: "Catalyst Game Labs",
  "Interstellar Operations: Alternate Eras": "Catalyst Game Labs",
  "Tactical Operations: Advanced Units and Equipment": "Catalyst Game Labs",
  "Quick-Strike: Introductory 'Mech Cards": "Catalyst Game Labs",
  "BattleTech Quick-Start Rules": "Catalyst Game Labs",
};

/** A book's title with its publisher, as citations show it: `TechManual (Catalyst Game Labs)`. */
export function bookName(title: string): string {
  const publisher = PUBLISHERS[title];
  return publisher === undefined ? title : `${title} (${publisher})`;
}

/** The Master Unit List's eras, names and years only; the list starts the Age of War in 2005. A year belongs to the era whose span holds
 * it; the last era is open-ended. Not included yet: the Clan-only eras of Interstellar Operations: Alternate Eras (Founding Years
 * 2800-2840, Golden Years 2841-3049, Post-Reaving 3086-3150), which overlap these and need a place as sub-eras. */
export interface EraRow {
  id: string;
  name: string;
  startYear: number;
  endYear?: number;
}
export const ERAS: EraRow[] = [
  { id: "age-of-war", name: "Age of War", startYear: 2005, endYear: 2570 },
  { id: "star-league", name: "Star League", startYear: 2571, endYear: 2780 },
  { id: "early-succession-war", name: "Early Succession War", startYear: 2781, endYear: 2900 },
  { id: "late-succession-war-lostech", name: "Late Succession War - LosTech", startYear: 2901, endYear: 3019 },
  { id: "late-succession-war-renaissance", name: "Late Succession War - Renaissance", startYear: 3020, endYear: 3049 },
  { id: "clan-invasion", name: "Clan Invasion", startYear: 3050, endYear: 3061 },
  { id: "civil-war", name: "Civil War", startYear: 3062, endYear: 3067 },
  { id: "jihad", name: "Jihad", startYear: 3068, endYear: 3085 },
  { id: "early-republic", name: "Early Republic", startYear: 3086, endYear: 3100 },
  { id: "late-republic", name: "Late Republic", startYear: 3101, endYear: 3130 },
  { id: "dark-ages", name: "Dark Ages", startYear: 3131, endYear: 3150 },
  { id: "ilclan", name: "ilClan", startYear: 3151 },
];
