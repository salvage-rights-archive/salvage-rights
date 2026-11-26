// An Alpha Strike game at the table: one play state per force member, the turn count and what the last End Phase did. Pure; the dice
// are given in (`Roll2d6`) so the page can roll for the player or take what was typed. The unit rules are in as-play.ts.
import { applyEndPhase, newPlayState, stage } from "./as-play";
import type { PlayEvent, PlayState, Roll2d6, StagedHit } from "./as-play";
import type { AsCard } from "./as-unit";

export interface TableUnit {
  play: PlayState;
  /** The unit made a weapon attack this turn (a unit that did not sheds its heat). */
  attacked: boolean;
  /** Points of Overheat it used this turn. */
  overheat: number;
}

export interface TableState {
  schema: 1;
  forceId: string;
  /** The turn being played, from 1. */
  turn: number;
  /** One per force member, in the force's order. */
  units: TableUnit[];
  /** What the last End Phase did, by member index. */
  last: { index: number; event: PlayEvent }[];
}

const fresh = (card: AsCard): TableUnit => ({ play: newPlayState(card), attacked: false, overheat: 0 });

export function newTable(forceId: string, cards: readonly AsCard[]): TableState {
  return { schema: 1, forceId, turn: 1, units: cards.map(fresh), last: [] };
}

/** A saved table kept to the force as it is now: a member added since gets a fresh state, a removed one drops off the end. */
export function fitTable(table: TableState, cards: readonly AsCard[]): TableState {
  return { ...table, units: cards.map((card, i) => table.units[i] ?? fresh(card)) };
}

/** Whether a stored value is a table state this code can use. */
export function isTable(v: unknown): v is TableState {
  const t = v as Partial<TableState> | null;
  return typeof t === "object" && t !== null && t.schema === 1 && typeof t.forceId === "string" && typeof t.turn === "number" && Array.isArray(t.units) && Array.isArray(t.last);
}

const withUnit = (table: TableState, index: number, change: (u: TableUnit) => TableUnit): TableState => ({
  ...table,
  units: table.units.map((u, i) => (i === index ? change(u) : u)),
});

/** Stages a hit on one unit; it lands at the End Phase. */
export const stageHit = (table: TableState, index: number, hit: StagedHit): TableState => withUnit(table, index, (u) => ({ ...u, play: stage(u.play, hit) }));

/** Takes back the last staged hit of one unit. */
export const unstageHit = (table: TableState, index: number): TableState => withUnit(table, index, (u) => ({ ...u, play: { ...u.play, staged: u.play.staged.slice(0, -1) } }));

export const setUnit = (table: TableState, index: number, patch: Partial<Pick<TableUnit, "attacked" | "overheat">>): TableState => withUnit(table, index, (u) => ({ ...u, ...patch }));

export const setPlay = (table: TableState, index: number, play: PlayState): TableState => withUnit(table, index, (u) => ({ ...u, play }));

/** The End Phase for every unit, then the next turn: staged damage lands, heat is settled, the per-turn answers are cleared. */
export function endTurn(table: TableState, cards: readonly AsCard[], roll: Roll2d6): TableState {
  const last: TableState["last"] = [];
  const units = table.units.map((u, index): TableUnit => {
    const card = cards[index];
    if (!card) return u;
    const result = applyEndPhase(u.play, card, { roll, attacked: u.attacked, overheat: u.overheat });
    for (const event of result.events) last.push({ index, event });
    return { play: result.state, attacked: false, overheat: 0 };
  });
  return { ...table, turn: table.turn + 1, units, last };
}
