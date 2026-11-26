// The Initiative and Movement Phases of an Aces game, as plain functions on the game record: what is revealed, the command card's
// orders applied, the Initiative roll with its penalties, the Movement Phase's order, who is next, and a unit marked moved. The page
// calls these; nothing here draws or touches storage, and nothing throws on a record it does not understand.
//
// Book: Aces rulebook pp. 6, 8, 10-11, 14, 16, 32, 39 (printed page = index) and the Alpha Strike Quick-Start Rules, box set, third
// printing (p. 13, Sequence of Play: each force rolls 2D6, ties are rolled again, the lower roll moves first; p. 14, the Unequal
// Number of 'Mechs rule), all read against the page images (checked: "page"); the Quick-Start page numbers are the printed ones.
import { ACES_LOG, ACES_SPECIAL_ORDERS, ACES_VALUES } from "../data/aces-vocab";
import type { MoveMode } from "../data/aces-vocab";
import type { AcesCard, CommandCard, SpecialOrderCard } from "./aces-card";
import { toDeckCard } from "./aces-card";
import { canMove, flipTop, mulberry32, nextAutomated, reveal, schedule } from "./aces-deck";
import type { Activatable, DeckCard, Pick as NextUnit, ScheduleStep } from "./aces-deck";
import { isEmplacement } from "./aces-game";
import type { AcesGame, ForceName, GameLogLine, GameUnit, TurnState } from "./aces-game";
import { objectiveStats } from "./aces-special";
import { logText, step } from "./aces-resolve";
import type { InitiativeContext, InitiativeDecision, LogLine, MoveContext, MoveDecision, Question, TableUnit } from "./aces-resolve";
import { isImmobile, recordMove } from "./as-play";

export const TURN_CITE = {
  reveal: { cite: "Aces p. 10", checked: "page" },
  roll: { cite: "Alpha Strike Quick-Start Rules, p. 13", checked: "page" },
  lastWinner: { cite: "Aces pp. 32, 39", checked: "page" },
  commander: { cite: "Aces pp. 32, 39", checked: "page" },
  loserFirst: { cite: "Aces p. 6; Alpha Strike Quick-Start Rules, p. 13", checked: "page" },
  proportional: { cite: "Alpha Strike Quick-Start Rules, p. 14", checked: "page" },
  allies: { cite: "Aces p. 38", checked: "page" },
  activation: { cite: "Aces p. 11", checked: "page" },
} as const;

/** The records the Initiative and Movement Phases read from the player's library. */
export interface TurnRecords {
  cards: readonly AcesCard[];
  commands: readonly CommandCard[];
  orders: readonly SpecialOrderCard[];
}

export const otherForce = (f: ForceName): ForceName => (f === "player" ? "automated" : "player");
export const forceLabel = (f: ForceName): string => (f === "player" ? "Your force" : "Automated force");

export const allUnits = (game: AcesGame): GameUnit[] => [...game.sides.player.units, ...game.sides.automated.units];
export const unitById = (game: AcesGame, id: string): GameUnit | undefined => allUnits(game).find((u) => u.id === id);
export const forceOf = (game: AcesGame, id: string): ForceName | undefined => (game.sides.player.units.some((u) => u.id === id) ? "player" : game.sides.automated.units.some((u) => u.id === id) ? "automated" : undefined);

const inPlay = (u: GameUnit): boolean => !u.play.destroyed && !u.play.escaped;
/** Can it make a move this turn: not destroyed or gone, not immobile or shut down, not an emplacement (p. 6). */
export const unitCanMove = (u: GameUnit): boolean => inPlay(u) && canMove({ immobile: isImmobile(u.play, u.card, "aces"), shutDown: u.play.shutdown, emplacement: isEmplacement(u.card), transported: u.flags.mountedIn !== undefined });
/** An automated unit on the players' side: it moves when the players choose it (p. 38). */
export const isAlly = (u: GameUnit): boolean => u.flags.automated === true;

// ---- Turn state ------------------------------------------------------------------------------------------------------------------

export const freshTurnState = (turn: number): TurnState => ({ turn, modifier: 0, rolls: {}, rollCount: 0, moved: { player: [], automated: [] }, lastDistances: {} });
export const turnStateOf = (game: AcesGame): TurnState => (game.turnState?.turn === game.turn ? game.turnState : freshTurnState(game.turn));
export const withTurnState = (game: AcesGame, change: (t: TurnState) => TurnState): AcesGame => ({ ...game, turnState: change(turnStateOf(game)) });

export const addLog = (game: AcesGame, ...lines: GameLogLine[]): AcesGame => ({ ...game, log: [...game.log, ...lines] });
export const logLine = (game: AcesGame, text: string, cite?: string): GameLogLine => ({ turn: game.turn, text, ...(cite ? { cite } : {}) });
/** The resolver's log lines as the game's own plain ones. */
export const fromResolver = (game: AcesGame, lines: readonly LogLine[]): GameLogLine[] => lines.map((l) => logLine(game, logText(l), l.cite));

// ---- What the resolver reads -------------------------------------------------------------------------------------------------

export const toTable = (u: GameUnit): TableUnit => ({
  id: u.id,
  name: u.name,
  card: u.card,
  play: u.play,
  skill: u.skill,
  ...(u.flags.withdrawing ? { withdrawing: true as const } : {}),
  ...(u.flags.fleeing ? { fleeing: true as const } : {}),
  ...(u.flags.mountedIn ? { mounted: true as const } : {}),
  ...(u.flags.destroyObjective ? { destroyObjective: true as const } : {}),
  ...(objectiveStats(u) ? { stats: objectiveStats(u) } : {}),
});

const tableOf = (units: readonly GameUnit[]): TableUnit[] => units.map(toTable);

export const currentCommand = (game: AcesGame, records: TurnRecords): CommandCard | undefined => records.commands.find((c) => c.id === game.command.current);

/** The unit's top behaviour card, when its deck and that card are recorded. */
export const topCard = (game: AcesGame, unitId: string, records: TurnRecords): AcesCard | undefined => {
  const id = game.decks.decks.find((d) => d.unitId === unitId)?.cards[0]?.id;
  return id === undefined ? undefined : records.cards.find((c) => c.id === id);
};

export const deckCards = (records: TurnRecords): DeckCard[] => records.cards.map(toDeckCard);

export function moveContext(game: AcesGame, unit: GameUnit, records: TurnRecords): MoveContext {
  const mine = forceOf(game, unit.id) ?? "automated";
  // An automated ally on the players' side faces the automated force; the players' own side is the enemy of the automated one.
  const enemySide = isAlly(unit) ? "automated" : otherForce(mine);
  const behaviour = topCard(game, unit.id, records);
  const command = currentCommand(game, records);
  return {
    phase: "movement",
    unit: toTable(unit),
    ...(behaviour ? { behaviour } : {}),
    ...(command ? { command } : {}),
    specialOrders: [...records.orders],
    ...(unit.flags.withdrawing ? { withdrawing: true } : {}),
    ...(unit.flags.fleeing ? { fleeing: true } : {}),
    ...(unit.flags.moveObjective && !unit.flags.withdrawing && !unit.flags.fleeing ? { moveObjective: true } : {}),
    allies: tableOf(game.sides[mine].units.filter((u) => u.id !== unit.id)),
    enemies: tableOf(game.sides[enemySide].units),
    ...(game.rules.bigTable48 ? { bigTable48: true } : {}),
    lastDistances: turnStateOf(game).lastDistances,
  };
}

export function initiativeContext(game: AcesGame, records: TurnRecords): InitiativeContext {
  const command = currentCommand(game, records);
  return {
    phase: "initiative",
    ...(command ? { command } : {}),
    allies: tableOf(game.sides.automated.units),
    enemies: tableOf(game.sides.player.units),
    ...(game.rules.bigTable48 ? { bigTable48: true } : {}),
  };
}

// ---- Initiative ----------------------------------------------------------------------------------------------------------------

export interface InitiativePart {
  label: string;
  value: number;
  cite: string;
}
export interface InitiativeSide {
  roll?: number;
  parts: InitiativePart[];
  total?: number;
}
export interface InitiativeSummary {
  player: InitiativeSide;
  automated: InitiativeSide;
  outcome: "waiting" | "tied" | "decided";
  winner?: ForceName;
}

/** The force that won last turn's Initiative, as it was recorded when this turn's was decided or at the end of last turn. */
export function previousWinner(game: AcesGame): ForceName | undefined {
  const i = game.initiative;
  if (!i) return undefined;
  return i.turn === game.turn ? i.previous : i.winner;
}

/** A force with a destroyed Force Commander has -2 for the rest of the game (p. 32). */
const commanderLost = (game: AcesGame, side: ForceName): boolean => {
  const id = game.sides[side].commanderUnitId;
  const unit = id === undefined ? undefined : game.sides[side].units.find((u) => u.id === id);
  return unit?.play.destroyed === true;
};

/** Each force's roll, every modifier written out with its page, the totals, and who won (the higher total; a tie is rolled again). */
export function initiativeSummary(game: AcesGame): InitiativeSummary {
  const ts = turnStateOf(game);
  const last = game.rules.lastWinnerPenalty ? previousWinner(game) : undefined;
  const sideOf = (f: ForceName): InitiativeSide => {
    const parts: InitiativePart[] = [];
    if (last === f) parts.push({ label: "Won the last turn", value: -2, cite: TURN_CITE.lastWinner.cite });
    if (commanderLost(game, f)) parts.push({ label: "Force Commander destroyed", value: -2, cite: TURN_CITE.commander.cite });
    if (f === "automated" && ts.modifier !== 0) parts.push({ label: "Command card orders", value: ts.modifier, cite: ACES_LOG["initiative-modifier"].cite });
    const roll = ts.rolls[f];
    return { ...(roll === undefined ? {} : { roll }), parts, ...(roll === undefined ? {} : { total: roll + parts.reduce((s, p) => s + p.value, 0) }) };
  };
  const player = sideOf("player");
  const automated = sideOf("automated");
  if (player.total === undefined || automated.total === undefined) return { player, automated, outcome: "waiting" };
  if (player.total === automated.total) return { player, automated, outcome: "tied" };
  return { player, automated, outcome: "decided", winner: player.total > automated.total ? "player" : "automated" };
}

/** 2D6 for one roll, drawn from the game's seed, the turn and how many rolls have been made: the same game gives the same dice. */
export function twoDice(game: AcesGame, count: number): number {
  const rng = mulberry32((game.seed ^ Math.imul(game.turn + 1, 0x9e3779b1) ^ Math.imul(count + 1, 0x85ebca6b)) >>> 0);
  rng();
  return 1 + Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6);
}

export const validRoll = (v: number): boolean => Number.isInteger(v) && v >= 2 && v <= 12;

/** Records a force's 2D6 (typed or rolled); anything but a whole number from 2 to 12 clears it. */
export const setRoll = (game: AcesGame, side: ForceName, value: number | undefined): AcesGame => withTurnState(game, (t) => ({ ...t, rolls: { ...t.rolls, [side]: value !== undefined && validRoll(value) ? value : undefined } }));

export const rollFor = (game: AcesGame, side: ForceName): AcesGame => {
  const ts = turnStateOf(game);
  return withTurnState(setRoll(game, side, twoDice(game, ts.rollCount)), (t) => ({ ...t, rollCount: t.rollCount + 1 }));
};

/** A tie is rolled again (Quick-Start Step 1): both rolls are cleared. */
export const rerollTie = (game: AcesGame): AcesGame => withTurnState(game, (t) => ({ ...t, rolls: {}, rollCount: t.rollCount + 1 }));

export const ordersHaveEffect = (d: InitiativeDecision): boolean => d.modifier !== 0 || d.tokens.first !== undefined || d.tokens.last !== undefined || d.withdraw || d.flee;

export type OrdersState =
  | { state: "applied" }
  | { state: "asking"; question: Question; log: LogLine[] }
  | { state: "ready"; decision: InitiativeDecision; effect: boolean };

/** Where the command card's Initiative orders stand: applied, waiting on an answer, or worked out (and whether they change anything). */
export function ordersState(game: AcesGame, records: TurnRecords): OrdersState {
  if (turnStateOf(game).ordersApplied) return { state: "applied" };
  const result = step(initiativeContext(game, records), game.sight);
  if ("ask" in result) return { state: "asking", question: result.ask, log: result.log };
  return { state: "ready", decision: result.decide, effect: ordersHaveEffect(result.decide) };
}

/** The orders no longer hold up the roll: carried out, or there is nothing to carry out. */
export const ordersDone = (s: OrdersState): boolean => s.state === "applied" || (s.state === "ready" && !s.effect);

/** Carries out the Initiative orders: the roll's modifier, the Move First and Move Last tokens, withdrawal or fleeing for every automated unit (pp. 8, 10, 16). */
export function applyInitiativeOrders(game: AcesGame, d: InitiativeDecision): AcesGame {
  const tokens = { ...game.tokens, ...(d.tokens.first ? { moveFirst: d.tokens.first } : {}), ...(d.tokens.last ? { moveLast: d.tokens.last } : {}) };
  const flag = (u: GameUnit): GameUnit => (inPlay(u) && !isEmplacement(u.card) ? { ...u, flags: { ...u.flags, ...(d.withdraw ? { withdrawing: true as const } : {}), ...(d.flee ? { fleeing: true as const } : {}) } } : u);
  const next: AcesGame = { ...game, tokens, sides: { ...game.sides, automated: { ...game.sides.automated, units: d.withdraw || d.flee ? game.sides.automated.units.map(flag) : game.sides.automated.units } } };
  return withTurnState(addLog(next, ...fromResolver(game, d.log)), (t) => ({ ...t, modifier: d.modifier, ordersApplied: true }));
}

// ---- The Movement Phase's order ------------------------------------------------------------------------------------------------

/**
 * The Quick-Start way of moving unequal numbers (unlike the Aces front loaded way): before each pair a force with at least twice
 * as many units left moves as many as the whole-number ratio, otherwise each moves one. A force with none left leaves the other to
 * move all it has.
 */
export function proportionalSchedule(loser: number, winner: number): ScheduleStep[] {
  const steps: ScheduleStep[] = [];
  let l = Math.max(0, Math.floor(loser));
  let w = Math.max(0, Math.floor(winner));
  while (l > 0 || w > 0) {
    const fewer = Math.min(l, w);
    const lc = fewer === 0 ? l : l > w ? Math.floor(l / fewer) : 1;
    const wc = fewer === 0 ? w : w > l ? Math.floor(w / fewer) : 1;
    if (lc > 0) steps.push({ side: "loser", count: lc });
    if (wc > 0) steps.push({ side: "winner", count: wc });
    l -= lc;
    w -= wc;
  }
  return steps;
}

/** How many units of a force can move this turn: the players' count includes any automated allies of theirs (p. 38). */
export const moverCount = (game: AcesGame, side: ForceName): number => game.sides[side].units.filter(unitCanMove).length;

/** The schedule with the forces named: the one that lost Initiative moves first (Quick-Start Step 2; Aces p. 6). */
export function movementSchedule(game: AcesGame, winner: ForceName): { side: ForceName; count: number }[] {
  const loser = otherForce(winner);
  const steps = (game.rules.frontLoaded ? schedule : proportionalSchedule)(moverCount(game, loser), moverCount(game, winner));
  return steps.map((s) => ({ side: s.side === "loser" ? loser : winner, count: s.count }));
}

/** Ends the Initiative Phase: the winner is recorded, nobody has moved yet, and the Movement Phase's order is fixed. */
export function startMovement(game: AcesGame, summary: InitiativeSummary): AcesGame {
  const winner = summary.winner;
  if (winner === undefined || summary.player.total === undefined || summary.automated.total === undefined) return game;
  const previous = previousWinner(game);
  const units = (list: GameUnit[]): GameUnit[] => list.map((u) => ({ ...u, play: { ...u.play, moved: null } }));
  const next: AcesGame = {
    ...game,
    phase: "movement",
    initiative: { player: summary.player.total, automated: summary.automated.total, winner, turn: game.turn, ...(previous ? { previous } : {}) },
    sides: { ...game.sides, player: { ...game.sides.player, units: units(game.sides.player.units) }, automated: { ...game.sides.automated, units: units(game.sides.automated.units) } },
    sight: { inches: {}, sight: {}, marks: {}, yes: {}, chosen: {} },
  };
  const named = forceLabel(winner);
  const line = logLine(game, `Initiative: ${named} wins, ${String(summary.player.total)} to ${String(summary.automated.total)} .`, TURN_CITE.roll.cite);
  const order = logLine(game, `${forceLabel(otherForce(winner))} moves first.`, TURN_CITE.loserFirst.cite);
  return addLog(withTurnState(next, (t) => ({ ...t, schedule: movementSchedule(next, winner), moved: { player: [], automated: [] }, active: undefined })), line, order);
}

export interface MoveProgress {
  /** Position in the schedule, from 0. */
  index: number;
  force: ForceName;
  /** Units this force still moves in this step. */
  remaining: number;
  count: number;
}

/** The step of the order now under way: the first whose force has not yet moved as many units as the steps so far call for. Null when every unit has moved. */
export function currentStep(game: AcesGame): MoveProgress | null {
  const ts = turnStateOf(game);
  const done = { player: ts.moved.player.length, automated: ts.moved.automated.length };
  const total = { player: 0, automated: 0 };
  const steps = ts.schedule ?? [];
  for (const [index, s] of steps.entries()) {
    total[s.side] += s.count;
    if (done[s.side] < total[s.side]) return { index, force: s.side, remaining: total[s.side] - done[s.side], count: s.count };
  }
  return null;
}

/** Player units (not automated allies) that can still move this turn. */
export const playerMovers = (game: AcesGame): GameUnit[] => {
  const moved = turnStateOf(game).moved.player;
  return game.sides.player.units.filter((u) => !isAlly(u) && unitCanMove(u) && !moved.includes(u.id));
};

/** The automated units of a force that can still move, as the deck engine reads them: the top card's priority, a token, withdrawal. */
export function activatables(game: AcesGame, force: ForceName, records: TurnRecords): Activatable[] {
  const ts = turnStateOf(game);
  const cards = deckCards(records);
  return game.sides[force].units
    .filter((u) => (force === "automated" || isAlly(u)) && unitCanMove(u) && !ts.moved[force].includes(u.id))
    .map((u) => ({
      unitId: u.id,
      pv: u.pv,
      priority: reveal(game.decks, cards, u.id)?.movePriority ?? null,
      ...(game.tokens.moveFirst === u.id ? { token: "first" as const } : game.tokens.moveLast === u.id ? { token: "last" as const } : {}),
      ...(u.flags.withdrawing ? { order: "withdrawal" as const } : u.flags.fleeing ? { order: "fleeing" as const } : {}),
    }));
}

/** Who moves next among a force's automated units (lowest priority; a tie goes to the lower PV, then the players choose, p. 11). */
export const whoMovesNext = (game: AcesGame, force: ForceName, records: TurnRecords): NextUnit => nextAutomated(activatables(game, force, records));

/** Marks a unit moved by a mode: its TMM is recorded, an automated unit's top card turns to its combat side and its token is discarded (p. 14). */
export function recordMoved(game: AcesGame, unitId: string, mode: MoveMode): AcesGame {
  const force = forceOf(game, unitId);
  if (!force) return game;
  const play = (u: GameUnit): GameUnit => (u.id === unitId ? { ...u, play: recordMove(u.play, u.card, mode, "aces") } : u);
  const tokens = { ...game.tokens };
  if (tokens.moveFirst === unitId) delete tokens.moveFirst;
  if (tokens.moveLast === unitId) delete tokens.moveLast;
  const next: AcesGame = {
    ...game,
    tokens,
    sides: { ...game.sides, [force]: { ...game.sides[force], units: game.sides[force].units.map(play) } },
    decks: game.decks.decks.some((d) => d.unitId === unitId) ? flipTop(game.decks, unitId) : game.decks,
  };
  return withTurnState(next, (t) => ({ ...t, moved: { ...t.moved, [force]: [...t.moved[force], unitId] } }));
}

// ---- Words for a decision ------------------------------------------------------------------------------------------------------

const labelOf = (list: readonly { id: string; label: string }[], id: string): string => list.find((x) => x.id === id)?.label ?? id;
export const modeLabel = (mode: MoveMode): string => labelOf(ACES_VALUES.mode, mode);

/** The phase's name as the table screen and the games list show it. */
export const PHASE_WORDS: Record<AcesGame["phase"], string> = { setup: "Setup", initiative: "Initiative", movement: "Movement", combat: "Combat", end: "End Phase", over: "Game over" };

/** The mode a decision points to when the players tap Done: a unit that holds position counts as Ground (p. 16). */
export const decidedMode = (d: MoveDecision): MoveMode => (d.hold || d.readCard ? "ground" : d.mode);

/** The instruction pinned over the filters, in our words, e.g. "Move Locust 4: Balanced, target Phoenix Hawk, Ground (Jump if needed)". */
export function moveInstruction(d: MoveDecision, unitName: string, targetName: (id: string) => string): string {
  if (d.readCard) return `${unitName}: read its printed Aces card for the part we do not have.`;
  if (d.hold) return `${unitName} holds position and counts as moved by Ground.`;
  const column = d.column === null ? "" : d.column === "forced-withdrawal" || d.column === "fleeing" ? labelOf(ACES_SPECIAL_ORDERS, d.column) : labelOf(ACES_VALUES.column, d.column);
  const target = d.target === null ? "" : `target ${targetName(d.target)}`;
  const how = `${modeLabel(d.mode)}${d.alt ? ` (${modeLabel(d.alt)} if needed)` : ""}`;
  return `Move ${unitName}: ${[column, target, how].filter((s) => s !== "").join(", ")}`;
}
