// The editions the tool knows. An edition names the books it follows: which one the play rules come from and which one the
// construction rules and equipment tables come from. Plain data; nothing here runs.
import { MECH_TYPES } from "./chassis";
import type { GameId } from "./rulesets";

export interface Edition {
  id: string;
  /** The game the edition belongs to (data/rulesets.ts): it decides what a record built under it is offered. */
  game: GameId;
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
    game: "classic",
    name: "Total Warfare / TechManual",
    books: [{ role: "play", title: "Total Warfare", printing: "corrected eleventh printing" }, TECHMANUAL],
    unitTypes: UNIT_TYPES,
  },
  {
    id: "bcr-tm",
    game: "classic",
    name: "Core Rulebook (BCR) / TechManual",
    books: [{ role: "play", title: "BattleTech Core Rulebook", printing: "2026, first printing", errata: "v0.1 (10 August 2026)" }, TECHMANUAL],
    unitTypes: UNIT_TYPES,
  },
];

// BattleTech: Gothic is a game of its own (gothic-design s.1): its edition is kept out of EDITIONS, which stays the list the Classic
// pages offer, so nothing of Gothic shows in Classic. Its play book is the box rulebook; construction and Battle Value go to
// TechManual, as the rulebook sends them (p. 6). BattleMechs only.
export const GOTHIC_EDITIONS: Edition[] = [
  {
    id: "gothic",
    game: "gothic",
    name: "BattleTech: Gothic / TechManual",
    books: [{ role: "play", title: "BattleTech: Gothic", printing: "2025 box set rulebook" }, TECHMANUAL],
    unitTypes: UNIT_TYPES.filter((u) => u.id === "mech"),
  },
];
/** Every edition of every game, for lookups by id. */
export const ALL_EDITIONS: Edition[] = [...EDITIONS, ...GOTHIC_EDITIONS];

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
  return ALL_EDITIONS.find((e) => e.id === currentEditionId(id))?.name ?? id;
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
  const edition = ALL_EDITIONS.find((e) => e.id === currentEditionId(id));
  const play = edition?.books.find((b) => b.role === "play");
  if (!edition || !play) return "";
  const parts = PLAY_RULES.flatMap((rule) => (rule.pages[edition.id] === undefined ? [] : [`${rule.what} p. ${rule.pages[edition.id] ?? ""}`]));
  return parts.length === 0 ? `${bookName(play.title)}.` : `${bookName(play.title)}: ${parts.join("; ")}.`;
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
  "Campaign Operations": { printing: "corrected fourth printing", printed: "2023-01", approx: true, errata: "v5.0", errataDated: "2024-08-22" },
  "Quick-Strike: Introductory 'Mech Cards": { printing: "2012 cards", printed: "2012-01", approx: true },
  "BattleTech Quick-Start Rules": { printing: "2021 rules", printed: "2021-01", approx: true },
  "Alpha Strike Companion": { printing: "first and only printing", printed: "2014-01", approx: true, errata: "v1.6", errataDated: "2022-12-06" },
  // The AeroTech line. Each of these prints only a year, so the month is a placeholder (approx).
  AeroTech: { printing: "FASA 1609", printed: "1986-01", approx: true },
  BattleSpace: { printing: "FASA 1680", printed: "1993-01", approx: true },
  "AeroTech 2": { printing: "FASA 1718, 2000 printing", printed: "2000-01", approx: true, errata: "v1.2", errataDated: "2003-01-11" },
  "AeroTech 2: Revised Edition": { printing: "FanPro 35011", printed: "2004-01", approx: true },
  "AeroTech 2: Record Sheets": { printing: "FanPro 10973", printed: "2002-01", approx: true },
  "Strategic Operations: Advanced Aerospace Rules": { printing: "third printing", printed: "2021-01", approx: true, errata: "v5.0", errataDated: "2024-11-15" },
  // BattleTech: Gothic, dated from the library copies' creation dates (rulebook and sheets 2025-11-29, Primer 2025-03-24). Gothic values
  // apply only inside Gothic, so these dates never decide a conflict with a Classic book (conflict 33).
  "BattleTech: Gothic": { printing: "2025 box set rulebook", printed: "2025-11", approx: true },
  "BattleTech: Gothic Deluxe Record Sheets": { printing: "2025", printed: "2025-11", approx: true },
  "BattleTech: Gothic Primer": { printing: "2025 spreads", printed: "2025-03", approx: true },
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
  "Campaign Operations": "Catalyst Game Labs",
  "Quick-Strike: Introductory 'Mech Cards": "Catalyst Game Labs",
  "BattleTech Quick-Start Rules": "Catalyst Game Labs",
  "Alpha Strike Companion": "Catalyst Game Labs",
  AeroTech: "FASA",
  BattleSpace: "FASA",
  "AeroTech 2": "FASA",
  "AeroTech 2: Revised Edition": "FanPro",
  "AeroTech 2: Record Sheets": "FanPro",
  "Strategic Operations: Advanced Aerospace Rules": "Catalyst Game Labs",
  "BattleTech: Gothic": "Catalyst Game Labs",
  // The sheets print no page numbers: a cite to them gives the PDF page index (index 0 is the cover).
  "BattleTech: Gothic Deluxe Record Sheets": "Catalyst Game Labs",
  "BattleTech: Gothic Primer": "Catalyst Game Labs",
};

/** A book's title with its publisher, as citations show it: `TechManual (Catalyst Game Labs)`. */
export function bookName(title: string): string {
  const publisher = PUBLISHERS[title];
  return publisher === undefined ? title : `${title} (${publisher})`;
}

/** The eras a unit can be built in. The first twelve are the Master Unit List's, which other tiles read by name (the list starts the Age of
 * War in 2005); the rest are the sub-eras Interstellar Operations: Alternate Eras (IO:AE) adds for campaigns set in Clan space, which overlap
 * the first twelve. A year belongs to every era whose span holds it, and the player picks which when it is more than one. The rules each era's
 * "Technology Base" and "Alternate Era Units and Equipment" paragraphs give are read against the page images (printed pages in `cite`). */
export interface EraRow {
  id: string;
  name: string;
  startYear: number;
  endYear?: number;
  /** The space the era's rules are for: Inner Sphere (with the Periphery), Clan space, or both. Absent: not stated. */
  space?: "inner-sphere" | "clan" | "both";
  /** The tech bases a unit in this era may be built with, apart from Mixed technology (a construction option with its own dates). In the Succession
   * Wars the two spaces do not cross: Clan technology stays in Clan space and Inner Sphere technology in the Inner Sphere (IO:AE p.9). Absent: not stated. */
  techBases?: ("inner-sphere" | "clan")[];
  /** Mixed technology is not used in this era: in the Succession Wars the Clan and Inner Sphere technology bases do not cross (IO:AE p.9). */
  noMixed?: true;
  /** The latest introduction date a unit or any of its equipment may have in this era, chassis types and armor included, for each tech base, where that is
   * earlier than the era's end (Clan Post-Reaving: Clan and Mixed 3085, Inner Sphere 3049). Absent: the era's own years limit it. */
  introCaps?: Partial<Record<"inner-sphere" | "clan" | "mixed", number>>;
  /** The book's other name for the era, shown with it in a choice (the Clans call the Civil War the Late Invasion Era). */
  alsoCalled?: string;
  /** The page that prints the era's name and years, and its rules where they are not the table's one source (Gothic's eras). */
  cite?: { book: string; page: number };
  checked?: "page" | "text";
}
const IO_AE = "Interstellar Operations: Alternate Eras";
const IS: EraRow["techBases"] = ["inner-sphere"];
const BOTH: EraRow["techBases"] = ["inner-sphere", "clan"];
export const ERAS: EraRow[] = [
  // Age of War: no Clan technology, nothing introduced after 2570 (p.12). The book's years start in 2300; the list's earlier start is kept.
  { id: "age-of-war", name: "Age of War", startYear: 2005, endYear: 2570, space: "inner-sphere", techBases: IS, cite: { book: IO_AE, page: 12 }, checked: "page" },
  // Age of the Star League: no Clan technology, nothing introduced after 2780 (p.13).
  { id: "star-league", name: "Star League", alsoCalled: "Age of the Star League", startYear: 2571, endYear: 2780, space: "inner-sphere", techBases: IS, cite: { book: IO_AE, page: 13 }, checked: "page" },
  // Early Succession Wars: Clan technology only among Clan factions, Inner Sphere technology open to both; Inner Sphere units introduced by 2900 (p.13).
  { id: "early-succession-war", name: "Early Succession War", startYear: 2781, endYear: 2900, space: "inner-sphere", techBases: IS, noMixed: true, cite: { book: IO_AE, page: 13 }, checked: "page" },
  // Late Succession Wars (2901-3049): the same split, introduced by 3049 (p.14). The list divides it in two at 3020.
  { id: "late-succession-war-lostech", name: "Late Succession War - LosTech", startYear: 2901, endYear: 3019, space: "inner-sphere", techBases: IS, noMixed: true, cite: { book: IO_AE, page: 14 }, checked: "page" },
  { id: "late-succession-war-renaissance", name: "Late Succession War - Renaissance", startYear: 3020, endYear: 3049, space: "inner-sphere", techBases: IS, noMixed: true, cite: { book: IO_AE, page: 14 }, checked: "page" },
  // Clan Invasion: both technology bases meet; Inner Sphere forces only the Inner Sphere base, Clan forces the Clan base; introduced by 3061 (p.18).
  { id: "clan-invasion", name: "Clan Invasion", startYear: 3050, endYear: 3061, space: "both", techBases: BOTH, cite: { book: IO_AE, page: 18 }, checked: "page" },
  // Civil War: the same, introduced by 3067 (p.20).
  { id: "civil-war", name: "Civil War", alsoCalled: "Late Invasion Era", startYear: 3062, endYear: 3067, space: "both", techBases: BOTH, cite: { book: IO_AE, page: 20 }, checked: "page" },
  // Jihad (the Clans know it as the Wars of Reaving): the bases stay separate, Mixed units are more common; introduced by 3085 (p.22).
  { id: "jihad", name: "Jihad", alsoCalled: "Wars of Reaving", startYear: 3068, endYear: 3085, space: "both", techBases: BOTH, cite: { book: IO_AE, page: 22 }, checked: "page" },
  // Dark Age, the Republic Age (3086-3130, the list divides it at 3101): Inner Sphere and Inner Sphere-resident Clan units introduced by 3130 (p.23).
  { id: "early-republic", name: "Early Republic", startYear: 3086, endYear: 3100, space: "inner-sphere", techBases: BOTH, cite: { book: IO_AE, page: 23 }, checked: "page" },
  { id: "late-republic", name: "Late Republic", startYear: 3101, endYear: 3130, space: "inner-sphere", techBases: BOTH, cite: { book: IO_AE, page: 23 }, checked: "page" },
  // Late Dark Age (3131-3150): introduced by 3150 (pp.23 and 24).
  { id: "dark-ages", name: "Dark Ages", alsoCalled: "Late Dark Age", startYear: 3131, endYear: 3150, space: "inner-sphere", techBases: BOTH, cite: { book: IO_AE, page: 23 }, checked: "page" },
  // The ilClan Era is outside the book (p.11): no rules.
  { id: "ilclan", name: "ilClan", startYear: 3151, cite: { book: IO_AE, page: 11 }, checked: "page" },
];
/** The sub-eras of campaigns set in Clan space, which overlap the eras above (IO:AE era table printed p.16, text pp.9, 17 and 24). Picking one decides
 * the tech base. They are not in `ERAS` (the Master Unit List's twelve, which other tiles read by name). */
export const CLAN_SUB_ERAS: EraRow[] = [
  // The Star League in Exile: 2786-2801 on the factions list (p.16); it may only use the Inner Sphere technology base (p.17). It is a faction, but it
  // changes what may be built, so it is an era choice here.
  { id: "star-league-in-exile", name: "Star League in Exile (faction, 2786-2801)", startYear: 2786, endYear: 2801, space: "clan", techBases: IS, noMixed: true, cite: { book: IO_AE, page: 17 }, checked: "page" },
  // Founding Years: all Clan factions may use either base, but Inner Sphere items only if built before 2781; introduced by 2840 (p.17).
  { id: "clan-founding-years", name: "Clan Founding Years", startYear: 2800, endYear: 2840, space: "clan", techBases: BOTH, noMixed: true, introCaps: { "inner-sphere": 2780 }, cite: { book: IO_AE, page: 17 }, checked: "page" },
  // Golden Years: the same, introduced by 3049 (p.17).
  { id: "clan-golden-years", name: "Clan Golden Years", startYear: 2841, endYear: 3049, space: "clan", techBases: BOTH, noMixed: true, introCaps: { "inner-sphere": 2780 }, cite: { book: IO_AE, page: 17 }, checked: "page" },
  // Post-Reaving: the Homeworld Clans use the Clan base (introduced by 3085), the Escorpion Imperio Mixed, every other power the Inner Sphere base (introduced by 3049) (p.24).
  { id: "clan-post-reaving", name: "Clan Post-Reaving", startYear: 3086, endYear: 3150, space: "clan", techBases: ["inner-sphere", "clan"], introCaps: { clan: 3085, mixed: 3085, "inner-sphere": 3049 }, cite: { book: IO_AE, page: 24 }, checked: "page" },
];
/** The eras the book names that the Master Unit List does not: its umbrella eras and its own sub-era spans, which overlap the list's rows (a year in 3025
 * is in the list's Late Succession War - Renaissance, the book's Late Succession Wars, the Succession Wars Era and the Clan sub-eras). Each takes the tech base
 * rules of its section; an umbrella era's are those of its sub-eras. Years and pages read against the page images. */
export const BOOK_SUB_ERAS: EraRow[] = [
  { id: "star-league-era", name: "Star League Era", startYear: 2300, endYear: 2780, space: "inner-sphere", techBases: IS, cite: { book: IO_AE, page: 8 }, checked: "page" },
  { id: "succession-wars-era", name: "Succession Wars Era", startYear: 2781, endYear: 3049, space: "inner-sphere", techBases: IS, noMixed: true, cite: { book: IO_AE, page: 9 }, checked: "page" },
  { id: "late-succession-wars", name: "Late Succession Wars", startYear: 2901, endYear: 3049, space: "inner-sphere", techBases: IS, noMixed: true, cite: { book: IO_AE, page: 14 }, checked: "page" },
  { id: "clan-sub-eras", name: "Clan Sub-Eras", startYear: 2800, endYear: 3049, space: "clan", techBases: BOTH, noMixed: true, introCaps: { "inner-sphere": 2780 }, cite: { book: IO_AE, page: 9 }, checked: "page" },
  { id: "dark-age-era", name: "Dark Age Era", startYear: 3086, endYear: 3150, space: "both", techBases: BOTH, cite: { book: IO_AE, page: 10 }, checked: "page" },
  { id: "republic-age", name: "Republic Age", alsoCalled: "Age of the Republic", startYear: 3086, endYear: 3130, space: "inner-sphere", techBases: BOTH, cite: { book: IO_AE, page: 23 }, checked: "page" },
];
/** Every era a game can pick besides its main table: the book's own and the Clan sub-eras. */
export const SUB_ERAS: EraRow[] = [...BOOK_SUB_ERAS, ...CLAN_SUB_ERAS];
/** An era as a choice reads: its name, and the book's other name for it. */
export const eraLabel = (era: Pick<EraRow, "name" | "alsoCalled">): string => (era.alsoCalled === undefined ? era.name : `${era.name} (${era.alsoCalled})`);
