// What each game of the BattleTech family offers a 'Mech built under it: its eras, rules levels, tech bases and 'Mech types, whether
// item dates limit it, whether cost is shown. A record's edition decides its game (Edition.game in data/editions.ts), and every
// shared rule reads the game through `rulesetOf(record.editionId)`; an edition the tool does not know reads as Classic, so a
// caller that passes no edition gets Classic's answer. No equipment lives here: which catalog rows, chassis parts and body types
// a game offers is the `games` field on those rows (absent means Classic only), and the few Gothic values that differ from a
// catalog row are the sparse overlay in data/equipment/gothic.ts (gothic-design s.2, s.2.1). Plain data and small lookups.
import { MECH_TYPES, RULES_LEVELS } from "./chassis";
import type { MechType, RulesLevel } from "./chassis";
import { ALL_EDITIONS, ERAS } from "./editions";
import type { EraRow } from "./editions";

export type GameId = "classic" | "gothic";
export type TechBaseChoice = "inner-sphere" | "clan" | "mixed";

export interface Ruleset {
  game: GameId;
  /** The game's name as screens and findings show it. */
  name: string;
  /** Era table for selectors, `setEra`, `setYear`, `eraOfYear`. */
  eras: EraRow[];
  /** Default year for a new record. Classic: none. */
  defaultYear?: number;
  /** Levels offered, in ladder order (ids from RULES_LEVELS); a level not listed is hidden in this game's selectors. */
  levels: RulesLevel[];
  /** Labels that differ from RULES_LEVELS in this game. */
  levelLabels?: Partial<Record<RulesLevel, string>>;
  techBases: TechBaseChoice[];
  unitTypes: MechType[];
  /** Whether item dates limit what is offered. Without dates every offered item is in production. */
  dated: boolean;
  /** Whether C-bill cost is shown. */
  cost: boolean;
  /** The page that lists the game's equipment, cited once for membership. */
  listCite?: { book: string; page: number };
  /** From this level up the game's lists are lifted: every catalog row, part and body type, every tech base and 'Mech type, each still
   * tested for its level. Absent: the lists always hold. */
  openAt?: RulesLevel;
}

/** What a row with no `games` field belongs to. */
export const DEFAULT_GAMES: readonly GameId[] = ["classic"];

export const CLASSIC: Ruleset = {
  game: "classic",
  name: "Classic BattleTech",
  eras: ERAS,
  levels: RULES_LEVELS.map((row) => row.id),
  techBases: ["inner-sphere", "clan", "mixed"],
  unitTypes: MECH_TYPES.map((row) => row.id),
  dated: true,
  cost: true,
};

const PRIMER = "BattleTech: Gothic Primer";
/** Gothic's eras (Primer spreads, printed pages; read against the page images). The Endless War runs to the present, which the
 * Primer (p. 2) and the rulebook's readout (p. 106) put in 3015. */
export const GOTHIC_ERAS: EraRow[] = [
  { id: "gothic-age-of-war", name: "Age of War", startYear: 2100, endYear: 2569, cite: { book: PRIMER, page: 2 }, checked: "page" },
  { id: "gothic-star-league", name: "Star League", startYear: 2570, endYear: 2780, cite: { book: PRIMER, page: 3 }, checked: "page" },
  { id: "gothic-endless-war", name: "Endless War", startYear: 2781, cite: { book: PRIMER, page: 5 }, checked: "page" },
];

/**
 * BattleTech: Gothic (gothic-design s.4). Its sheets print Introductory, Standard and "Unofficial", which is our Licensed non-canon
 * level inside Gothic (owner ruling 2026-11-25); Fan-made and Unlimited are ours. Advanced and Experimental are hidden: nothing in
 * Gothic has them. Inner Sphere BattleMechs only (every sheet is Inner Sphere; the box has no other unit type but Abominations).
 * The book prints no equipment dates and no prices. Unlimited lifts the lists (owner answer 4).
 */
export const GOTHIC: Ruleset = {
  game: "gothic",
  name: "BattleTech: Gothic",
  eras: GOTHIC_ERAS,
  defaultYear: 3015,
  levels: ["introductory", "standard", "licensed-noncanon", "fan-made", "unlimited"],
  levelLabels: { "licensed-noncanon": "Unofficial" },
  techBases: ["inner-sphere"],
  unitTypes: ["mech"],
  dated: false,
  cost: false,
  listCite: { book: "BattleTech: Gothic", page: 93 },
  openAt: "unlimited",
};

export const RULESETS: Record<GameId, Ruleset> = { classic: CLASSIC, gothic: GOTHIC };

/** The ruleset of the game an edition belongs to; an edition id the tool does not know, or none, is Classic. */
export function rulesetOf(editionId: string | undefined): Ruleset {
  const game = ALL_EDITIONS.find((edition) => edition.id === editionId)?.game ?? "classic";
  return RULESETS[game];
}

/** Where Gothic's pages live: the game's own routes, served now that Gothic is ready. */
export const GOTHIC_BASE = "/battletech/gothic";

/** The pages' base address of a game. */
export const baseOf = (game: GameId): string => (game === "gothic" ? GOTHIC_BASE : "/battletech/classic");

/** Where a record's pages live: Classic's or Gothic's. */
export const gameBase = (record: { editionId: string }): string => baseOf(rulesetOf(record.editionId).game);

/** The game a page address belongs to: for pages that cannot read a record (a missing one) and still must link to the right home. */
export const gameOfPath = (pathname: string): GameId => (/\/battletech\/gothic(-preview)?\//.test(pathname) ? "gothic" : "classic");

const rank = (level: RulesLevel) => RULES_LEVELS.findIndex((row) => row.id === level);

/** Whether the game's lists are lifted for a unit at `level` (from `openAt` up). Never in Classic, which has no lists to lift. */
export const listsOpen = (ruleset: Ruleset, level: RulesLevel | undefined): boolean =>
  ruleset.openAt !== undefined && level !== undefined && rank(level) >= rank(ruleset.openAt);

/** Whether a row tagged with `games` (absent: Classic only) is on the game's list. */
export const listed = (games: readonly GameId[] | undefined, ruleset: Ruleset): boolean => (games ?? DEFAULT_GAMES).includes(ruleset.game);

/** Whether a row may be offered in the game to a unit at `level`: it is on the game's list, or the lists are open at that level. */
export const inGame = (games: readonly GameId[] | undefined, ruleset: Ruleset, level: RulesLevel | undefined): boolean => listed(games, ruleset) || listsOpen(ruleset, level);
