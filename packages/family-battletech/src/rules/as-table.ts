// An Alpha Strike game at the table: one play state per force member, the turn count and what the last End Phase did. Pure; the dice
// are given in (`Roll2d6`) so the page can roll for the player or take what was typed. The unit rules are in as-play.ts.
import { AS_CRIT_EFFECTS, AS_CRIT_TABLE_OF, AS_MOTIVE_MODIFIER, AS_MOTIVE_RESULTS } from "../data/alpha-strike";
import type { CritKind } from "../data/alpha-strike";
import { applyEndPhase, critKind, currentDamage, currentMove, fireControlModifier, motiveResult, newPlayState, stage, tracksHeat } from "./as-play";
import type { MotiveResult, PlayEvent, PlayState, Roll2d6, StagedHit } from "./as-play";
import { formatDamage } from "./as-unit";
import type { AsCard } from "./as-unit";

export interface TableUnit {
  play: PlayState;
  /** The unit made a weapon attack this turn (a unit that did not sheds its heat). */
  attacked: boolean;
  /** Points of Overheat it used this turn. */
  overheat: number;
  /** Heat dealt to it by other units' attacks this turn (HT); the End Phase keeps at most 2 (ASCE p. 52). */
  external: number;
  /** It chooses to spike its heat by 1 in this End Phase ('Mechs, ASCE p. 53). */
  deliberate: boolean;
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

const fresh = (card: AsCard): TableUnit => ({ play: newPlayState(card), attacked: false, overheat: 0, external: 0, deliberate: false });

export function newTable(forceId: string, cards: readonly AsCard[]): TableState {
  return { schema: 1, forceId, turn: 1, units: cards.map(fresh), last: [] };
}

/** A saved table kept to the force as it is now: a member added since gets a fresh state, a removed one drops off the end. */
export function fitTable(table: TableState, cards: readonly AsCard[]): TableState {
  return { ...table, units: cards.map((card, i) => ({ ...fresh(card), ...table.units[i] })) };
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

export const setUnit = (table: TableState, index: number, patch: Partial<Omit<TableUnit, "play">>): TableState => withUnit(table, index, (u) => ({ ...u, ...patch }));

export const setPlay = (table: TableState, index: number, play: PlayState): TableState => withUnit(table, index, (u) => ({ ...u, play }));

/** Our words for a critical roll and the table row it landed on (ASCE p. 50), for a unit of this type. */
export function critRow(card: AsCard, roll: number): { roll: number; kind: CritKind; text: string } {
  const kind = critKind(card.type, "asce", roll);
  const table = AS_CRIT_TABLE_OF[card.type];
  const name = table === "mech" ? "'Mech" : table === "proto" ? "ProtoMech" : table === "vehicle" ? "Vehicle" : "";
  const row = name ? `row ${String(roll)} of the ${name} table` : "every critical is a Weapon Hit";
  return { roll, kind, text: `Critical roll ${String(roll)}: ${AS_CRIT_EFFECTS[kind].label} (${row}, p. 50)` };
}

/** Our words for a Motive Systems Damage roll: the movement letter's modifier, the total and the row (ASCE p. 51). */
export function motiveRow(card: AsCard, roll: number): { roll: number; result: MotiveResult; text: string } {
  const mode = card.move[0]?.mode ?? "";
  const modifier = AS_MOTIVE_MODIFIER[mode.toLowerCase()] ?? 0;
  const result = motiveResult(mode, roll);
  const row = AS_MOTIVE_RESULTS[result === "none" ? 0 : result === "minus" ? 1 : result === "half" ? 2 : 3];
  return { roll, result, text: `Motive roll ${String(roll)} + ${String(modifier)} = ${String(roll + modifier)}: ${row.effect} (p. 51)` };
}

/** A Motive Systems Damage result put on the unit, by hand or from a roll the caller made. */
export function applyMotive(play: PlayState, result: MotiveResult): PlayState {
  const hit = result === "minus" ? "motive-2" : result === "half" ? "motive-half" : result === "immobile" ? "immobile" : null;
  return hit ? { ...play, moveHits: [...play.moveHits, hit] } : play;
}

/** What a weapon attack by this unit adds to its Target Number now: 2 for each Fire Control Hit and its heat level (ASCE pp. 50, 52). */
export const attackModifier = (play: PlayState, card: AsCard): number => fireControlModifier(play) + (tracksHeat(card) ? play.heat : 0);

export interface CrippleCheck {
  id: "structure" | "damage" | "move";
  text: string;
  met: boolean;
}

const zeroNow = (d: AsCard["damage"]["m"]): boolean => d === null || (d.value === 0 && d.minimal !== true);

/** The Crippling Damage conditions that apply to this unit, each with the numbers behind it (ASCE p. 127; Forced Withdrawal is p. 126). A condition that cannot apply is left out. */
export function crippleChecks(play: PlayState, card: AsCard): CrippleCheck[] {
  const d = currentDamage(play, card);
  if (card.type === "BD") {
    return [{ id: "damage", met: zeroNow(d.s) && zeroNow(d.m) && zeroNow(d.l), text: `Damage now ${formatDamage(d.s)}/${formatDamage(d.m)}/${formatDamage(d.l)}: crippled when every value is 0` }];
  }
  const limit = Math.ceil(card.structure / 2);
  const started = zeroNow(card.damage.m) && zeroNow(card.damage.l);
  const start = card.move[0]?.inches ?? 0;
  const left = currentMove({ ...play, heat: 0, shutdown: false }, card)[0]?.inches ?? 0;
  const checks: CrippleCheck[] = [
    { id: "structure", met: play.armor === 0 && play.structure <= limit, text: `Armor ${String(play.armor)}, structure ${String(play.structure)}: crippled at no armor and structure ${String(limit)} or less` },
  ];
  if (!started) checks.push({ id: "damage", met: zeroNow(d.m) && zeroNow(d.l), text: `Damage now ${formatDamage(d.m)} at Medium and ${formatDamage(d.l)} at Long: crippled when both are 0` });
  if (start > 0) checks.push({ id: "move", met: left === 0, text: `Move ${String(left)} of ${String(start)} after hits: crippled at 0` });
  return checks;
}

/** The End Phase for every unit, then the next turn: staged damage lands, heat is settled, the per-turn answers are cleared. Every roll made is noted. */
export function endTurn(table: TableState, cards: readonly AsCard[], roll: Roll2d6): TableState {
  const last: TableState["last"] = [];
  const units = table.units.map((u, index): TableUnit => {
    const card = cards[index];
    if (!card) return u;
    const noted: PlayEvent[] = [];
    const logged: Roll2d6 = (kind) => {
      const value = roll(kind);
      noted.push({ id: `${kind ?? "roll"}-roll`, text: kind === "motive" ? motiveRow(card, value).text : critRow(card, value).text, cite: "" });
      return value;
    };
    const staged = u.external > 0 ? [...u.play.staged, { damage: 0, heat: u.external }] : u.play.staged;
    const result = applyEndPhase({ ...u.play, staged }, card, { roll: logged, attacked: u.attacked || u.overheat > 0, overheat: u.overheat, deliberate: u.deliberate });
    for (const event of [...noted, ...result.events]) last.push({ index, event });
    return { play: result.state, attacked: false, overheat: 0, external: 0, deliberate: false };
  });
  return { ...table, turn: table.turn + 1, units, last };
}
