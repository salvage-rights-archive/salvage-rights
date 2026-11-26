// The Aces game record and its setup: two sides of Alpha Strike units whose card values are copied in, a deck for each automated
// unit, the command deck and its start card, objectives, waypoints, support cards, the rules switches and the undo snapshots. Pure;
// nothing here throws on a record it does not understand. Book: the Aces rulebook (printed page = index) pp. 10, 31, 38-39 and the
// Scouring Sands campaign book p. 20 (printed page = PDF index + 1), all read against the page images 2026-11-25 (checked: "page").
import { ACES_LETTERS } from "../data/aces-vocab";
import type { CommandLetter } from "../data/aces-vocab";
import { clampSkill, skillAdjustedPv } from "./as-force";
import type { AsForce } from "./as-force";
import { newPlayState } from "./as-play";
import type { PlayState } from "./as-play";
import type { AsCard, AsUnit } from "./as-unit";
import { unitTitle } from "./as-unit";
import type { AcesCard, CommandCard } from "./aces-card";
import { deckKey, toDeckCard } from "./aces-card";
import { buildDecks } from "./aces-deck";
import type { DeckState } from "./aces-deck";
import { emptySheet } from "./aces-resolve";
import type { SightSheet } from "./aces-resolve";

export const ACES_GAME_CITE = {
  setup: { cite: "Aces pp. 10, 31", checked: "page" },
  decks: { cite: "Aces p. 39; Scouring Sands p. 20", checked: "page" },
  difficulty: { cite: "Aces p. 38", checked: "page" },
  emplacement: { cite: "Aces pp. 6, 31", checked: "page" },
  allies: { cite: "Aces p. 38", checked: "page" },
} as const;

export interface AcesRules {
  /** The Aces way of moving unequal numbers of units (p. 6); on by default. */
  frontLoaded: boolean;
  /** Alpha Strike's optional Multiple Attack Rolls (Quick-Start p. 21); off by default. */
  multipleAttackRolls: boolean;
  /** Forced withdrawal is a special rule a sortie turns on (p. 16): off, for automated units only, or for both sides. */
  forcedWithdrawal: "none" | "automated" | "both";
  /** -2 Initiative for last turn's winner. Always applies in a campaign sortie; a switch in a single game (p. 32). */
  lastWinnerPenalty: boolean;
  /** The 48" table option for ideal colours (p. 12). */
  bigTable48: boolean;
  /** An Aces game uses the Aces vehicle critical and motive tables (p. 4). */
  acesVehicleTables: true;
}

export const DEFAULT_RULES: AcesRules = { frontLoaded: true, multipleAttackRolls: false, forcedWithdrawal: "none", lastWinnerPenalty: true, bigTable48: false, acesVehicleTables: true };

/** One unit in the game. `card` is a snapshot of the Alpha Strike card at setup, so a roster edit never touches a running game. */
export interface GameUnit {
  /** Unique within the game (a roster unit can be fielded twice). */
  id: string;
  /** The roster unit it was copied from. */
  unitId: string;
  name: string;
  card: AsCard;
  skill: number;
  /** Fixed at setup. A Skill change made as a difficulty aid does not recalculate it (p. 38). */
  pv: number;
  pilot?: string;
  pilotId?: string;
  edge?: number;
  /** The key of the deck it plays by; absent for a unit without one (an emplacement, a unit on the player's side, a deck not chosen yet). */
  deck?: string;
  play: PlayState;
  flags: { withdrawing?: true; fleeing?: true; automated?: true };
}

export interface GameSide {
  forceId?: string;
  units: GameUnit[];
  commanderUnitId?: string;
}

export interface Waypoint {
  letter: string;
  turn?: number;
  unitId?: string;
  done: boolean;
}

export interface GameLogLine {
  turn: number;
  text: string;
  cite?: string;
}

export const UNDO_LIMIT = 20;

export interface AcesGame {
  schema: 1;
  kind: "aces-game";
  id: string;
  name: string;
  seed: number;
  createdAt: string;
  rules: AcesRules;
  sides: { player: GameSide; automated: GameSide };
  /** The commander's cards sorted A-E and the one on top. Empty when no command deck was chosen. */
  command: { commander?: string; cardIds: string[]; current?: string };
  decks: DeckState;
  supports: { cardId: string; used: boolean }[];
  /** Our own short labels for what the sortie asks of the automated force. */
  objectives: { movement?: string; destroy?: string[] };
  waypoints: Waypoint[];
  turn: number;
  phase: "setup" | "initiative" | "movement" | "combat" | "end" | "over";
  initiative?: { player: number; automated: number; winner: "player" | "automated" };
  tokens: { moveFirst?: string; moveLast?: string };
  sight: SightSheet;
  log: GameLogLine[];
  /** Compact snapshots of the game before each change, newest last. */
  undo: string[];
  campaign?: { campaignId: string; sortie: string };
}

// ---- Which deck a unit plays by ---------------------------------------------------------------------------------------------------

export interface DeckChoice {
  /** The key of the deck, null when the unit has none or the players must choose. */
  key: string | null;
  /** `chosen`: the deck the rules point to is recorded; `fallback`: its subtype deck is not, so the role deck stands in; `ask`: nothing recorded fits; `none`: an emplacement. */
  status: "chosen" | "fallback" | "ask" | "none";
  /** The deck the rules point to, recorded or not. */
  wanted: string;
  cite: string;
}

/** An armed building: a BD card or one marked IMMOBILE (Aces p. 6). */
export const isEmplacement = (card: AsCard): boolean => card.type === "BD" || card.specials.some((s) => s.code === "IMMOBILE");

const HOVER_MODES = ["h", "w"];
const HOVER_TYPES = ["CV", "SV", "CI"];
const INFANTRY_TYPES = ["CI", "BA"];

/** The subtype the rules point to for a card, with its page (Aces p. 39; Scouring Sands p. 20). */
function subtypeOf(card: AsCard): { subtype: string; cite: string } | undefined {
  if (HOVER_TYPES.includes(card.type) && card.move.some((m) => HOVER_MODES.includes(m.mode))) return { subtype: "Hover", cite: "Scouring Sands p. 20" };
  if (INFANTRY_TYPES.includes(card.type)) return { subtype: "Infantry", cite: "Aces p. 39" };
  if (card.specials.some((s) => s.code === "JMPS")) return { subtype: "JMPS", cite: "Scouring Sands p. 20" };
  return undefined;
}

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The default deck for a unit: its role plus the subtype its movement points to (hover or wheeled, infantry, strong jump jets);
 * the role deck when the subtype deck is not recorded; otherwise the players choose. Only decks the player has recorded count
 * (`recorded` holds their keys). An emplacement has no deck (p. 31).
 */
export function defaultDeck(card: AsCard, recorded: readonly string[]): DeckChoice {
  const have = (key: string): string | undefined => recorded.find((r) => same(r, key));
  if (isEmplacement(card)) return { key: null, status: "none", wanted: "", cite: ACES_GAME_CITE.emplacement.cite };
  const role = card.role?.trim() ?? "";
  if (role === "") return { key: null, status: "ask", wanted: "", cite: ACES_GAME_CITE.decks.cite };
  const sub = subtypeOf(card);
  const wanted = sub ? `${role} (${sub.subtype})` : role;
  const cite = sub ? sub.cite : "Aces p. 39";
  const exact = have(wanted);
  if (exact) return { key: exact, status: "chosen", wanted, cite };
  const plain = have(role);
  if (plain) return { key: plain, status: sub ? "fallback" : "chosen", wanted, cite };
  return { key: null, status: "ask", wanted, cite };
}

/** The keys of the decks a player has recorded, one each, in order. */
export const recordedDecks = (cards: readonly AcesCard[]): string[] => [...new Set(cards.map(deckKey))].sort((a, b) => a.localeCompare(b));

// ---- Setup -------------------------------------------------------------------------------------------------------------------------

export interface SetupUnit {
  unitId: string;
  name: string;
  card: AsCard;
  skill: number;
  /** A campaign pilot's Skill does not change PV (p. 31): give the printed PV here. */
  pv?: number;
  pilot?: string;
  pilotId?: string;
  edge?: number;
  /** An automated ally on the player's side gets a deck too (p. 38). */
  automated?: boolean;
  /** A deck key the players chose, or null for none. Left out, the default decides. */
  deck?: string | null;
}

export interface SetupSide {
  forceId?: string;
  units: SetupUnit[];
  /** Position in `units` of the force commander. */
  commander?: number;
}

export interface GameSetup {
  id: string;
  name: string;
  seed: number;
  at: string;
  player: SetupSide;
  automated: SetupSide;
  /** The player's recorded behaviour cards. */
  cards: readonly AcesCard[];
  /** Command cards of the one commander chosen; any order. */
  commandCards?: readonly CommandCard[];
  /** The card to start on; A unless the sortie says otherwise (pp. 10, 39). */
  startLetter?: CommandLetter;
  supportIds?: readonly string[];
  objectives?: AcesGame["objectives"];
  waypoints?: readonly { letter: string; turn?: number }[];
  rules?: Partial<AcesRules>;
  campaign?: AcesGame["campaign"];
}

/** A force's members as setup units, taking each from the roster (a member whose unit is gone is left out). */
export function unitsFromForce(force: AsForce, roster: ReadonlyMap<string, AsUnit>): SetupUnit[] {
  return force.members.flatMap((m) => {
    const unit = roster.get(m.unitId);
    return unit ? [{ unitId: unit.id, name: unitTitle(unit), card: unit.card, skill: m.skill, ...(m.pilot ? { pilot: m.pilot } : {}) }] : [];
  });
}

/** A roster unit picked on the spot. */
export const unitFromRoster = (unit: AsUnit, skill: number = unit.skill): SetupUnit => ({ unitId: unit.id, name: unitTitle(unit), card: unit.card, skill });

/** The card values as a plain copy. The Alpha Strike card holds only the printed figures, so no source mark (such as OFFICIAL) comes with it. */
const copyCard = (card: AsCard): AsCard => structuredClone(card);

function gameUnit(side: "player" | "automated", index: number, s: SetupUnit): GameUnit {
  const card = copyCard(s.card);
  const skill = clampSkill(s.skill);
  return {
    id: `${side === "player" ? "p" : "a"}${String(index + 1)}`,
    unitId: s.unitId,
    name: s.name,
    card,
    skill,
    pv: s.pv ?? skillAdjustedPv(card.pv, skill),
    ...(s.pilot ? { pilot: s.pilot } : {}),
    ...(s.pilotId ? { pilotId: s.pilotId } : {}),
    ...(s.edge === undefined ? {} : { edge: s.edge }),
    play: newPlayState(card),
    flags: s.automated ? { automated: true } : {},
  };
}

const byLetter = (a: CommandCard, b: CommandCard): number => ACES_LETTERS.indexOf(a.letter) - ACES_LETTERS.indexOf(b.letter);

/** Builds the game record: card values copied, a deck for each automated unit (emplacements none), the command deck sorted A-E. */
export function newAcesGame(setup: GameSetup): AcesGame {
  const recorded = recordedDecks(setup.cards);
  const sides = {
    player: sideOf("player", setup.player),
    automated: sideOf("automated", setup.automated),
  };
  const decked: GameUnit[] = [];
  for (const [which, side] of [["player", setup.player], ["automated", setup.automated]] as const) {
    side.units.forEach((s, i) => {
      const unit = sides[which].units[i]!;
      if (which === "player" && !unit.flags.automated) return;
      const key = s.deck === undefined ? defaultDeck(unit.card, recorded).key : s.deck;
      if (key === null || isEmplacement(unit.card)) return;
      unit.deck = key;
      decked.push(unit);
    });
  }
  const decks = buildDecks(
    decked.map((u) => ({ unitId: u.id, deckKey: u.deck!, pv: u.pv })),
    setup.cards.map(toDeckCard),
    setup.seed,
  );
  const cmd = [...(setup.commandCards ?? [])].sort(byLetter);
  const start = cmd.find((c) => c.letter === (setup.startLetter ?? "A")) ?? cmd[0];
  const commander = cmd[0]?.commander;
  return {
    schema: 1,
    kind: "aces-game",
    id: setup.id,
    name: setup.name,
    seed: setup.seed,
    createdAt: setup.at,
    rules: { ...DEFAULT_RULES, ...setup.rules, acesVehicleTables: true },
    sides,
    command: { ...(commander ? { commander } : {}), cardIds: cmd.map((c) => c.id), ...(start ? { current: start.id } : {}) },
    decks,
    supports: (setup.supportIds ?? []).map((cardId) => ({ cardId, used: false })),
    objectives: structuredClone(setup.objectives ?? {}),
    waypoints: (setup.waypoints ?? []).map((w) => ({ letter: w.letter, ...(w.turn === undefined ? {} : { turn: w.turn }), done: false })),
    turn: 1,
    phase: "setup",
    tokens: {},
    sight: emptySheet(),
    log: [{ turn: 0, text: "Game set up.", cite: ACES_GAME_CITE.setup.cite }],
    undo: [],
    ...(setup.campaign ? { campaign: { ...setup.campaign } } : {}),
  };
}

function sideOf(which: "player" | "automated", s: SetupSide): GameSide {
  const units = s.units.map((u, i) => gameUnit(which, i, u));
  const commander = s.commander === undefined ? undefined : units[s.commander];
  return { ...(s.forceId ? { forceId: s.forceId } : {}), units, ...(commander ? { commanderUnitId: commander.id } : {}) };
}

// ---- Difficulty aids (Aces p. 38) -------------------------------------------------------------------------------------------------

export interface DifficultyAids {
  /** The automated force's PV as a share of the player's, in per cent; null with no player PV. */
  ratio: number | null;
  /** A force worth about 80% of the player's (a less challenging game). */
  easierPv: number;
  /** A force worth about 120% of the player's (a more challenging game). */
  harderPv: number;
}

/** The suggestions of p. 38: they are shown, never applied. */
export function difficultyAids(playerPv: number, automatedPv: number): DifficultyAids {
  return { ratio: playerPv > 0 ? Math.round((automatedPv / playerPv) * 100) : null, easierPv: Math.round(playerPv * 0.8), harderPv: Math.round(playerPv * 1.2) };
}

/** Easier: Skill rating number up by 1 (Skill 4 becomes 5). Harder: down by 1. PV is not recalculated (p. 38). */
export function shiftSkill<T extends { skill: number }>(units: readonly T[], change: "easier" | "harder"): T[] {
  return units.map((u) => ({ ...u, skill: clampSkill(u.skill + (change === "easier" ? 1 : -1)) }));
}

// ---- Undo --------------------------------------------------------------------------------------------------------------------------

/** Keeps the game as it is now, for Undo, before a change is made. Only the last 20 are kept. */
export const withSnapshot = (game: AcesGame): AcesGame => ({ ...game, undo: [...game.undo, JSON.stringify({ ...game, undo: [] })].slice(-UNDO_LIMIT) });

/** Goes back one change; undefined when there is nothing to undo or the snapshot cannot be read. */
export function undoLast(game: AcesGame): AcesGame | undefined {
  const last = game.undo.at(-1);
  if (last === undefined) return undefined;
  try {
    const before = JSON.parse(last) as Omit<AcesGame, "undo">;
    return { ...before, undo: game.undo.slice(0, -1) };
  } catch {
    return undefined;
  }
}

// ---- Shape check -------------------------------------------------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Enough shape to open the game without throwing; the rest is read defensively where it is used. */
export function isAcesGame(v: unknown): v is AcesGame {
  if (!isObject(v) || v.kind !== "aces-game" || v.schema !== 1) return false;
  const sides = v.sides;
  const sideOk = (s: unknown): boolean => isObject(s) && Array.isArray(s.units) && s.units.every((u) => isObject(u) && typeof u.id === "string" && isObject(u.card) && isObject(u.play));
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.turn === "number" &&
    typeof v.phase === "string" &&
    isObject(sides) &&
    sideOk(sides.player) &&
    sideOk(sides.automated) &&
    isObject(v.decks) &&
    Array.isArray(v.decks.decks) &&
    isObject(v.rules) &&
    isObject(v.command) &&
    Array.isArray(v.log) &&
    Array.isArray(v.undo)
  );
}
