// The Aces resolver: what an automated unit does, worked out from the player's own cards and the table. Pure and question-driven:
// `step(context, sheet)` either asks one question (data: its kind, the units it is about, and a prompt id whose words are ours in
// data/aces-vocab.ts) or gives the decision with its log. The caller merges each reply into the sheet with `answer` and calls
// `step` again; the same context and sheet always give the same result. A card we cannot read is never an error: an unknown
// token becomes a question to the players, an unrecorded side becomes "read your card".
//
// This file holds the Movement Phase (Aces rulebook pp. 9-17, read against the page images 2026-11-25). The combat and command
// half (pp. 18-21, piece ACES-6) joins `ResolveContext` and `step` beside it and reuses the sheet, the keys, the ideals and the
// conditions below.
//
// Readings we chose (design 1.1 and the pages named):
// - Zones are rings: each is the band out to its number, the last everything beyond (p. 12; conflict 47).
// - A colour list is a run of tie-breaks, top to bottom, stopping once one unit is left (pp. 11-12; conflict 52). A key that no
//   candidate fits is passed over (p. 9, objectives not in play). The ideal is found the same way over every enemy in play.
// - An enemy that has not moved this turn reads TMM 0, an immobile one -4 (p. 17 example); BA and stealth terms are added (p. 9).
// - The "attack range" of a condition is the same question as the target flag: could it attack the unit after moving (pp. 9, 12).
// - No column finds a target: the unit holds position and counts as Ground (p. 16, extended by the golden rule, p. 10).
// - Ties the cards do not settle are the players' choice (p. 10).
// - Filters numbered 0: the special order's 0a-0c first, then the command card's (p. 14 gives no order between them).
import { ACES_LOG, ACES_PROMPTS, ACES_SPECIAL_ORDERS, ACES_VALUES } from "../data/aces-vocab";
import type { Colour, ColumnId, LogId, MoveMode, PromptId, ReminderId, SpecialOrderKind } from "../data/aces-vocab";
import { AS_STEALTH, AS_TARGET_TYPE_ROWS } from "../data/alpha-strike";
import { renderFilter, renderUse } from "./aces-card";
import type { AcesCard, Column, CommandCard, Condition, Filter, Key, SpecialOrderCard, TargetRule, TokenUse } from "./aces-card";
import { rangeBracket } from "./as-attack";
import { crippled, currentDamage, currentMove, isImmobile } from "./as-play";
import type { PlayState } from "./as-play";
import type { AsCard, AsDamage } from "./as-unit";

export type StatId = (typeof ACES_VALUES.stat)[number]["id"];

/** One unit on the table as the resolver reads it: its card values and play state, both the game's own copies. */
export interface TableUnit {
  id: string;
  name: string;
  card: AsCard;
  play: PlayState;
  /** Set to say whether it counts as moved; otherwise it has moved when its move is recorded or it cannot move (p. 9). */
  moved?: boolean;
  /** Figures the card does not give, such as the destroy objective's default stats (p. 17). */
  stats?: Partial<Record<StatId, number>>;
  /** This enemy is the destroy objective (p. 17). */
  destroyObjective?: true;
  /** An ally has already attacked it this turn (p. 18). */
  attackedByAlly?: true;
}

/** Everything one automated unit's movement activation reads. */
export interface MoveContext {
  phase: "movement";
  unit: TableUnit;
  /** The unit's top behaviour card; missing or identity-only means the player reads the printed card. */
  behaviour?: AcesCard;
  /** The current command card. */
  command?: CommandCard;
  /** The special order cards the player has recorded. */
  specialOrders?: SpecialOrderCard[];
  withdrawing?: boolean;
  fleeing?: boolean;
  /** The sortie's movement objective names this unit (p. 17). */
  moveObjective?: boolean;
  /** The other units of its force, and the enemies in play (destroyed and escaped ones are skipped here). */
  allies: TableUnit[];
  enemies: TableUnit[];
  /** Only enemies within 48" count toward the ideal, for big tables (p. 9 note). */
  bigTable48?: boolean;
  /** Last activation's distances, to prefill the steppers. */
  lastDistances?: Record<string, number>;
}

/** ACES-6 adds the combat and command contexts to this union. */
export type ResolveContext = MoveContext;

/** What the players have told us this activation: per enemy distance and sight, picks per question, yes/no, tie choices. */
export interface SightSheet {
  inches: Record<string, number>;
  sight: Record<string, boolean>;
  /** Question key, then unit id: true when picked. Every unit offered gets an entry. */
  marks: Record<string, Record<string, boolean>>;
  yes: Record<string, boolean>;
  chosen: Record<string, string>;
}

export const emptySheet = (): SightSheet => ({ inches: {}, sight: {}, marks: {}, yes: {}, chosen: {} });

interface QuestionBase {
  /** Stable within an activation: the same question is never asked twice. */
  key: string;
  prompt: PromptId;
  /** Fills the prompt's `{name}`s. */
  words: Record<string, string>;
  cite: string;
}

export type Question =
  | (QuestionBase & { kind: "distances"; unitIds: string[]; prefill: Record<string, number> })
  | (QuestionBase & { kind: "sight"; unitIds: string[] })
  | (QuestionBase & { kind: "pick-units"; unitIds: string[] })
  | (QuestionBase & { kind: "yes-no" })
  | (QuestionBase & { kind: "pick-one"; unitIds: string[] });

export type Reply =
  | { kind: "distances"; inches: Record<string, number> }
  | { kind: "sight"; seen: string[] }
  | { kind: "pick-units"; picked: string[] }
  | { kind: "yes-no"; yes: boolean }
  | { kind: "pick-one"; chosen: string };

export interface LogLine {
  id: LogId;
  words: Record<string, string>;
  cite: string;
}

export interface PlacedFilter {
  /** "0a" to "0c" and "0" for the orders' filters, then "1", "2"... for the card's. */
  number: string;
  from: "special" | "command" | "card";
  filter: Filter;
  text: string;
}

export interface MoveDecision {
  phase: "movement";
  /** The column used; null when it holds position or the card must be read. */
  column: ColumnId | "forced-withdrawal" | "fleeing" | null;
  /** It holds position and counts as having moved by Ground (p. 16). */
  hold: boolean;
  /** The side is not recorded: the players read the printed card for what is missing. */
  readCard: boolean;
  target: string | null;
  /** The ideal enemy of each colour worked out on the way, null when none counts. */
  ideals: Partial<Record<Colour, string | null>>;
  mode: MoveMode;
  /** A second mode, used if it reaches a better place (p. 14). */
  alt?: MoveMode;
  filters: PlacedFilter[];
  reminders: ReminderId[];
  log: LogLine[];
}

export type StepResult = { ask: Question; log: LogLine[] } | { decide: MoveDecision };

// ---- Our words for a question and a log line -------------------------------------------------------------------------------

const fillWords = (text: string, words: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (_, n: string) => words[n] ?? "?");

export const questionText = (q: Question): string => fillWords(ACES_PROMPTS[q.prompt].text, q.words);
export const logText = (line: LogLine): string => fillWords(ACES_LOG[line.id].text, line.words);

// ---- Replies -------------------------------------------------------------------------------------------------------------------

/** Merges the players' reply to a question into the sheet. A reply of another kind, or about units not asked, changes nothing. */
export function answer(sheet: SightSheet, q: Question, reply: Reply): SightSheet {
  if (reply.kind !== q.kind) return sheet;
  switch (reply.kind) {
    case "distances": {
      if (q.kind !== "distances") return sheet;
      const inches = { ...sheet.inches };
      for (const id of q.unitIds) {
        const v = reply.inches[id];
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) inches[id] = v;
      }
      return { ...sheet, inches };
    }
    case "sight": {
      if (q.kind !== "sight") return sheet;
      const sight = { ...sheet.sight };
      for (const id of q.unitIds) sight[id] = reply.seen.includes(id);
      return { ...sheet, sight };
    }
    case "pick-units": {
      if (q.kind !== "pick-units") return sheet;
      const marks = { ...(sheet.marks[q.key] ?? {}) };
      for (const id of q.unitIds) marks[id] = reply.picked.includes(id);
      return { ...sheet, marks: { ...sheet.marks, [q.key]: marks } };
    }
    case "yes-no":
      return { ...sheet, yes: { ...sheet.yes, [q.key]: reply.yes } };
    case "pick-one":
      return q.kind === "pick-one" && q.unitIds.includes(reply.chosen) ? { ...sheet, chosen: { ...sheet.chosen, [q.key]: reply.chosen } } : sheet;
  }
}

// ---- The run: one pass over the context with what is known so far ---------------------------------------------------------------

/** Thrown inside a run when it needs an answer; `step` turns it into the question. Never leaves this file. */
class Asked {
  constructor(readonly question: Question) {}
}

interface Run {
  ctx: MoveContext;
  sheet: SightSheet;
  log: LogLine[];
  ideals: Map<Colour, TableUnit | null>;
}

const note = (run: Run, id: LogId, words: Record<string, string> = {}): void => {
  run.log.push({ id, words, cite: ACES_LOG[id].cite });
};

function ask(run: Run, q: Omit<QuestionBase, "cite"> & Record<string, unknown>): never {
  throw new Asked({ ...q, cite: ACES_PROMPTS[q.prompt].cite } as Question);
}

const living = (units: readonly TableUnit[]): TableUnit[] => units.filter((u) => !u.play.destroyed && !u.play.escaped);
const names = (units: readonly TableUnit[]): string => units.map((u) => u.name).join(", ");
const labelOf = (list: readonly { id: string; label: string }[], id: string): string => list.find((x) => x.id === id)?.label ?? id;
const columnLabel = (id: string): string => labelOf(ACES_VALUES.column, id);
const isColour = (v: unknown): v is Colour => v === "red" || v === "yellow" || v === "blue";
const has = (card: AsCard, code: string): boolean => card.specials.some((s) => s.code === code);

/** Moved, or cannot move (p. 9). */
const hasMoved = (u: TableUnit): boolean => u.moved ?? (u.play.moved !== null || isImmobile(u.play, u.card, "aces"));

/** Inches from the acting unit to an enemy; asks for every enemy still without one, prefilled from last time. */
function inches(run: Run, u: TableUnit): number {
  const known = run.sheet.inches[u.id];
  if (known !== undefined) return known;
  const missing = living(run.ctx.enemies).filter((e) => run.sheet.inches[e.id] === undefined);
  if (!missing.some((e) => e.id === u.id)) missing.push(u);
  const prefill: Record<string, number> = {};
  for (const e of missing) {
    const last = run.ctx.lastDistances?.[e.id];
    if (last !== undefined) prefill[e.id] = last;
  }
  return ask(run, { kind: "distances", key: "distances", prompt: "distances", words: { unit: run.ctx.unit.name }, unitIds: missing.map((e) => e.id), prefill });
}

/** Those of `units` whose sight matches `seen`; asks about the ones not yet answered. */
function bySight(run: Run, units: TableUnit[], seen: boolean): TableUnit[] {
  const open = units.filter((u) => run.sheet.sight[u.id] === undefined);
  if (open.length) ask(run, { kind: "sight", key: "sight", prompt: "sight", words: { unit: run.ctx.unit.name }, unitIds: open.map((u) => u.id) });
  return units.filter((u) => run.sheet.sight[u.id] === seen);
}

/** Those of `units` the players pick for one question; asks about the ones not yet answered under that key. */
function picked(run: Run, key: string, prompt: PromptId, words: Record<string, string>, units: TableUnit[]): TableUnit[] {
  const marks = run.sheet.marks[key] ?? {};
  const open = units.filter((u) => marks[u.id] === undefined);
  if (open.length) ask(run, { kind: "pick-units", key, prompt, words: { unit: run.ctx.unit.name, ...words }, unitIds: open.map((u) => u.id) });
  return units.filter((u) => marks[u.id] === true);
}

const attackable = (run: Run, units: TableUnit[]): TableUnit[] => picked(run, "attackable", "attackable", {}, units);

function yesNo(run: Run, key: string, text: string): boolean {
  const known = run.sheet.yes[key];
  if (known !== undefined) return known;
  return ask(run, { kind: "yes-no", key, prompt: "condition", words: { unit: run.ctx.unit.name, text } });
}

/** One unit from a tie the card does not settle: the players choose (p. 10). */
function choose(run: Run, units: TableUnit[], text: string): TableUnit {
  if (units.length === 1) return units[0]!;
  const ids = units.map((u) => u.id);
  const key = `tie:${text}:${[...ids].sort().join(",")}`;
  const chosen = units.find((u) => u.id === run.sheet.chosen[key]);
  if (!chosen) return ask(run, { kind: "pick-one", key, prompt: "tie", words: { unit: run.ctx.unit.name, text }, unitIds: ids });
  note(run, "tie-chosen", { target: chosen.name, text });
  return chosen;
}

// ---- Figures read off a unit ---------------------------------------------------------------------------------------------------

/** Minimal damage (0*) ranks between 0 and 1. */
const damageValue = (d: AsDamage): number => (d === null ? 0 : d.minimal ? 0.5 : d.value);

/** A unit's damage at the range bracket of a distance; 0 beyond Long. */
function damageAt(u: TableUnit, distance: number): number {
  const bracket = rangeBracket(distance);
  if (bracket === null || bracket === "E") return 0;
  const d = currentDamage(u.play, u.card);
  return damageValue(bracket === "S" ? d.s : bracket === "M" ? d.m : d.l);
}

/** A stat key's figure for an enemy (p. 9: current values, TMM with its battle armor, stealth and heat terms). Null when it has none. */
function stat(run: Run, u: TableUnit, id: StatId): number | null {
  const given = u.stats?.[id];
  if (given !== undefined) return given;
  const { card, play } = u;
  switch (id) {
    case "armor":
      return play.armor;
    case "armor-lost":
      return card.armor - play.armor;
    case "starting-armor":
      return card.armor;
    case "structure":
      return play.structure;
    case "structure-lost":
      return card.structure - play.structure;
    case "pv":
      return card.pv;
    case "size":
      return card.size;
    case "mv":
      return currentMove(play, card, "aces")[0]?.inches ?? 0;
    case "damage-s":
    case "damage-m":
    case "damage-l": {
      const d = currentDamage(play, card);
      return damageValue(id === "damage-s" ? d.s : id === "damage-m" ? d.m : d.l);
    }
    case "damage":
      return damageAt(u, inches(run, u));
    case "tmm": {
      const base = play.moved ? play.moved.tmm : isImmobile(play, card, "aces") ? -4 : card.tmm === null ? null : 0;
      if (base === null) return null;
      let tmm = base + (AS_TARGET_TYPE_ROWS[card.type]?.value ?? 0);
      if (has(card, "STL")) {
        const bracket = rangeBracket(inches(run, u));
        const row = card.type === "BA" ? AS_STEALTH.ba : AS_STEALTH.standard;
        if (bracket === "S" || bracket === "M" || bracket === "L") tmm += row[bracket];
      }
      return tmm;
    }
  }
}

const isStat = (v: unknown): v is StatId => ACES_VALUES.stat.some((s) => s.id === v);

// ---- Keys: tie-breaks, top to bottom (p. 12) ---------------------------------------------------------------------------------

function applyKeys(run: Run, units: TableUnit[], keys: readonly Key[], nested: boolean): TableUnit[] {
  let left = units;
  for (const key of keys) {
    if (left.length <= 1) break;
    left = applyKey(run, left, key, nested);
  }
  return left;
}

function applyKey(run: Run, units: TableUnit[], key: Key, nested: boolean): TableUnit[] {
  const text = renderUse(key);
  let keep: TableUnit[];
  switch (key.token) {
    case "stat": {
      const id = key.params?.stat;
      const amount = key.params?.amount;
      if (!isStat(id) || (amount !== "most" && amount !== "fewest")) return byPlayers();
      const rows = units.map((u) => ({ u, v: stat(run, u, id) })).filter((r): r is { u: TableUnit; v: number } => r.v !== null);
      const best = rows.length ? (amount === "most" ? Math.max(...rows.map((r) => r.v)) : Math.min(...rows.map((r) => r.v))) : 0;
      keep = rows.filter((r) => r.v === best).map((r) => r.u);
      break;
    }
    case "destroy-objective":
      keep = units.filter((u) => u.destroyObjective);
      break;
    case "no-armor":
      keep = units.filter((u) => stat(run, u, "armor") === 0);
      break;
    case "ally-attacked":
      keep = units.filter((u) => u.attackedByAlly);
      break;
    case "can-destroy":
      keep = units.filter((u) => damageAt(run.ctx.unit, inches(run, u)) >= (stat(run, u, "armor") ?? 0) + (stat(run, u, "structure") ?? 0));
      break;
    case "colour-list": {
      const colour = key.params?.colour;
      if (nested || !isColour(colour)) {
        note(run, "nested-list");
        return units;
      }
      return applyKeys(run, units, coloursOf(run, colour), true);
    }
    default:
      return byPlayers();
  }
  if (keep.length === 0) {
    note(run, "key-ignored", { key: text });
    return units;
  }
  if (keep.length < units.length) note(run, "key-narrowed", { key: text, units: names(keep) });
  return keep;

  /** A key settled on the table (rear, cover, a template, the player's own words, a token we do not know). */
  function byPlayers(): TableUnit[] {
    const fit = picked(run, `key:${text}`, "key", { text }, units);
    if (fit.length === 0) {
      note(run, "key-ignored", { key: text });
      return units;
    }
    if (fit.length < units.length) note(run, "key-narrowed", { key: text, units: names(fit) });
    return fit;
  }
}

function coloursOf(run: Run, colour: Colour): readonly Key[] {
  const list = run.ctx.command?.colours[colour];
  if (!list) note(run, "no-colours", { colour: labelOf(ACES_VALUES.colour, colour) });
  return list ?? [];
}

/** The one enemy in play that best fits a colour's list (p. 9), each key a tie-break (pp. 11-12); the players settle a tie. */
function ideal(run: Run, colour: Colour): TableUnit | null {
  if (run.ideals.has(colour)) return run.ideals.get(colour)!;
  const label = labelOf(ACES_VALUES.colour, colour);
  let pool = living(run.ctx.enemies);
  if (run.ctx.bigTable48) {
    pool = pool.filter((u) => inches(run, u) <= 48);
    note(run, "big-table");
  }
  let found: TableUnit | null = null;
  if (pool.length) {
    found = choose(run, applyKeys(run, pool, coloursOf(run, colour), false), `the ideal ${label}`);
    note(run, "ideal", { colour: label, target: found.name });
  } else note(run, "ideal-none", { colour: label });
  run.ideals.set(colour, found);
  return found;
}

// ---- Conditions (p. 11): clauses left to right, stopping at the first that settles -------------------------------------------

function holds(run: Run, cond: Condition | undefined): boolean {
  if (!cond || cond.clauses.length === 0) return true;
  for (const c of cond.clauses) {
    const v = clause(run, c);
    if (cond.join === "any" && v) return true;
    if (cond.join !== "any" && !v) return false;
  }
  return cond.join !== "any";
}

const num = (use: TokenUse, name: string): number | undefined => {
  const v = use.params?.[name];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
};

/** Enemies in play fitting the qualifiers, optionally within a distance; auto tests first, then distance, sight and the question. */
function enemiesWith(run: Run, quals: readonly string[], within: number | undefined): TableUnit[] {
  let pool = living(run.ctx.enemies);
  if (quals.includes("moved")) pool = pool.filter(hasMoved);
  if (quals.includes("unmoved")) pool = pool.filter((u) => !hasMoved(u));
  if (within !== undefined) pool = pool.filter((u) => inches(run, u) <= within);
  if (quals.includes("in-sight")) pool = bySight(run, pool, true);
  if (quals.includes("out-of-sight")) pool = bySight(run, pool, false);
  if (quals.includes("in-range")) pool = attackable(run, pool);
  return pool;
}

function clause(run: Run, c: TokenUse): boolean {
  const self = run.ctx.unit;
  const text = renderUse(c);
  const colour = c.params?.colour;
  const quals = Array.isArray(c.params?.quals) ? (c.params.quals as string[]) : [];
  const within = num(c, "inches");
  switch (c.token) {
    case "always":
      return true;
    case "ideal-moved":
    case "ideal-within":
    case "ideal-reach-behind":
    case "ideal-reach-within":
    case "ideal-attack-unthreatened": {
      if (!isColour(colour)) break;
      const u = ideal(run, colour);
      if (!u) return false;
      if (c.token === "ideal-moved") return hasMoved(u);
      if (c.token === "ideal-within") return within !== undefined && inches(run, u) <= within;
      return yesNo(run, `yes:${text}:${u.id}`, `${text} (${u.name})`);
    }
    case "enemies-within":
      return enemiesWith(run, quals, within).length >= (num(c, "atLeast") ?? 1);
    case "no-enemies-within":
      return enemiesWith(run, quals, within).length === 0;
    case "armor-over-damage": {
      const scope = enemiesWith(run, [], within);
      return scope.every((e) => self.play.armor > damageAt(e, inches(run, e)));
    }
    case "damage-over-armor":
      return enemiesWith(run, [], within).some((e) => damageAt(self, inches(run, e)) > (stat(run, e, "armor") ?? 0));
    case "self-has-armor":
      return self.play.armor > 0;
    case "self-crippled":
      return crippled(self.play, self.card, "aces");
    case "self-withdrawing":
      return run.ctx.withdrawing === true;
    case "no-ally-indirect":
      return !living(run.ctx.allies).some((a) => has(a.card, "IF"));
  }
  return yesNo(run, `yes:${text}`, text);
}

// ---- The target (pp. 12-13) ----------------------------------------------------------------------------------------------------

/** The candidates in zone order: rings by band (conflict 47), "nearest" by distance, "any" or no zone all at once. */
function zones(run: Run, rule: TargetRule, pool: TableUnit[]): { label: string; units: TableUnit[] }[] {
  const zone = rule.zone;
  if (zone && "rings" in zone && zone.rings.length) {
    const rings = [...zone.rings].sort((a, b) => a - b);
    const at = (u: TableUnit) => {
      const d = inches(run, u);
      const i = rings.findIndex((r) => d <= r);
      return i < 0 ? rings.length : i;
    };
    const by = pool.map((u) => ({ u, i: at(u) }));
    return [...new Set(by.map((x) => x.i))].sort((a, b) => a - b).map((i) => ({ label: `Zone ${String(i + 1)}`, units: by.filter((x) => x.i === i).map((x) => x.u) }));
  }
  if (zone && "keyword" in zone && zone.keyword === "nearest") {
    const ds = [...new Set(pool.map((u) => inches(run, u)))].sort((a, b) => a - b);
    return ds.map((d) => ({ label: `Nearest at ${String(d)}"`, units: pool.filter((u) => inches(run, u) === d) }));
  }
  return [{ label: "Any enemy", units: pool }];
}

/** Applies one target flag to the units of a zone. */
function flagged(run: Run, flag: string, units: TableUnit[]): TableUnit[] {
  switch (flag) {
    case "moved":
      return units.filter(hasMoved);
    case "in-sight":
      return bySight(run, units, true);
    case "out-of-sight":
      return bySight(run, units, false);
    case "attackable":
      return attackable(run, units);
    default: {
      const text = renderUse({ token: flag });
      return picked(run, `flag:${text}`, "flag", { text }, units);
    }
  }
}

/** The target of a column, or null when its flags leave no enemy (p. 12: then the column is not used). */
function findTarget(run: Run, rule: TargetRule): TableUnit | null {
  let pool = living(run.ctx.enemies);
  if (rule.flags.includes("moved")) {
    const out = pool.filter((u) => !hasMoved(u));
    pool = pool.filter(hasMoved);
    if (out.length) note(run, "dropped", { units: names(out), flag: renderUse({ token: "moved" }) });
    if (pool.length === 0) return null;
  }
  for (const zone of zones(run, rule, pool)) {
    let left = zone.units;
    for (const flag of rule.flags) {
      if (flag === "moved" || left.length === 0) continue;
      const kept = flagged(run, flag, left);
      const out = left.filter((u) => !kept.includes(u));
      if (out.length) note(run, "dropped", { units: names(out), flag: renderUse({ token: flag }) });
      left = kept;
    }
    if (left.length === 0) continue;
    note(run, "zone", { zone: zone.label, units: names(left) });
    return pickTarget(run, rule, left);
  }
  return null;
}

function pickTarget(run: Run, rule: TargetRule, units: TableUnit[]): TableUnit {
  if (units.length === 1) return units[0]!;
  if (rule.pick === "nearest") {
    const d = Math.min(...units.map((u) => inches(run, u)));
    return choose(run, units.filter((u) => inches(run, u) === d), "the target");
  }
  const left = rule.pick && isColour(rule.pick) ? applyKeys(run, units, coloursOf(run, rule.pick), false) : units;
  return choose(run, left, "the target");
}

// ---- The activation (pp. 11-17) ------------------------------------------------------------------------------------------------

interface OrderEffects {
  column?: ColumnId;
  forbid: Set<string>;
  filters: Filter[];
}

/** The current command card's orders for the Movement Phase that hold for this unit (p. 11: they come before the card). */
function movementOrders(run: Run): OrderEffects {
  const out: OrderEffects = { forbid: new Set(), filters: [] };
  for (const order of run.ctx.command?.orders ?? []) {
    if (order.phase !== "movement" && order.phase !== "any") continue;
    if (!holds(run, order.when)) continue;
    const value = order.params?.column ?? order.params?.mode;
    switch (order.token) {
      case "force-column":
        if (value === "aggressive" || value === "balanced" || value === "cautious") {
          out.column = value;
          note(run, "order-column", { column: columnLabel(value) });
        }
        break;
      case "forbid-mode":
        if (typeof value === "string") {
          out.forbid.add(value);
          note(run, "order-mode", { mode: labelOf(ACES_VALUES.mode, value) });
        }
        break;
      case "add-filters":
        out.filters.push(...(order.filters ?? []));
        note(run, "order-filters", { count: String(order.filters?.length ?? 0) });
        break;
      case "other":
        note(run, "order-other", { text: renderUse(order) });
        break;
    }
  }
  return out;
}

const specialCard = (run: Run, kind: SpecialOrderKind): SpecialOrderCard | undefined => run.ctx.specialOrders?.find((o) => o.order === kind);
const orderLabel = (kind: SpecialOrderKind): string => labelOf(ACES_SPECIAL_ORDERS, kind);

function decision(run: Run, rest: Partial<MoveDecision>): MoveDecision {
  const ideals: Partial<Record<Colour, string | null>> = {};
  for (const [c, u] of run.ideals) ideals[c] = u?.id ?? null;
  return { phase: "movement", column: null, hold: false, readCard: false, target: null, ideals, mode: "ground", filters: [], reminders: ["flip"], log: run.log, ...rest };
}

/** The mode with its second choice (p. 14): a condition settles it, a unit without jump moves by Ground, orders rule modes out. */
function modeOf(run: Run, column: Column, forbid: Set<string>): { mode: MoveMode; alt?: MoveMode } {
  let mode = column.move.mode;
  let alt: MoveMode | undefined = column.move.alt?.mode;
  const when = column.move.alt?.when;
  if (alt && when) {
    if (holds(run, when)) {
      note(run, "mode-alt-when", { mode: labelOf(ACES_VALUES.mode, alt) });
      mode = alt;
    }
    alt = undefined;
  }
  const canJump = run.ctx.unit.card.move.some((m) => m.mode === "j");
  if (mode === "jump" && !canJump) {
    note(run, "no-jump");
    mode = "ground";
  }
  if (alt === "jump" && !canJump) alt = undefined;
  if (forbid.has(mode)) mode = ([alt, "ground"] as (MoveMode | undefined)[]).find((m): m is MoveMode => m !== undefined && !forbid.has(m)) ?? mode;
  if (alt && (forbid.has(alt) || alt === mode)) alt = undefined;
  note(run, "mode", { mode: labelOf(ACES_VALUES.mode, mode) });
  if (alt) note(run, "mode-alt", { mode: labelOf(ACES_VALUES.mode, alt) });
  return alt ? { mode, alt } : { mode };
}

/** Filters in the order they are tried: zero-numbered ones first (the special order's, then the command card's), then the card's. */
function placeFilters(run: Run, column: Column | undefined, mode: MoveMode, orders: OrderEffects): PlacedFilter[] {
  const zero: Omit<PlacedFilter, "number">[] = [];
  if (run.ctx.moveObjective) {
    const card = specialCard(run, "movement-objective");
    if (mode === "standstill") note(run, "objective-standstill");
    else if (!card?.preFilters) note(run, "special-missing", { order: orderLabel("movement-objective") });
    else {
      note(run, "objective-filters");
      zero.push(...card.preFilters.map((filter) => ({ from: "special" as const, filter, text: renderFilter(filter) })));
    }
  }
  zero.push(...orders.filters.map((filter) => ({ from: "command" as const, filter, text: renderFilter(filter) })));
  const letters = "abcdefghij";
  const placed: PlacedFilter[] = zero.map((f, i) => ({ ...f, number: zero.length === 1 ? "0" : `0${letters[i] ?? String(i)}` }));
  column?.filters.forEach((filter, i) => placed.push({ number: String(i + 1), from: "card", filter, text: renderFilter(filter) }));
  return placed;
}

function reminders(run: Run, mode: MoveMode): ReminderId[] {
  const infantry = run.ctx.unit.card.type === "CI" || run.ctx.unit.card.type === "BA";
  return [...(mode === "standstill" ? [] : (["no-standstill"] as const)), ...(infantry ? [] : (["facing"] as const)), "flip"];
}

function decideMove(run: Run): MoveDecision {
  const { ctx } = run;
  const orders = movementOrders(run);

  if (living(ctx.enemies).length === 0) {
    note(run, "no-enemies");
    return decision(run, { hold: !ctx.moveObjective, filters: placeFilters(run, undefined, "ground", orders), reminders: ["face-deployment", "flip"] });
  }

  // Forced withdrawal and fleeing replace the three columns with the order card's (p. 16).
  const special: SpecialOrderKind | undefined = ctx.withdrawing ? "forced-withdrawal" : ctx.fleeing ? "fleeing" : undefined;
  let chosen: { id: MoveDecision["column"]; column: Column; target: TableUnit | null } | undefined;
  if (special) {
    const card = specialCard(run, special);
    if (!card?.column) {
      note(run, "special-missing", { order: orderLabel(special) });
      return decision(run, { column: special, readCard: true });
    }
    note(run, "special-column", { order: orderLabel(special) });
    const label = orderLabel(special);
    if (!holds(run, card.column.when)) note(run, "condition-false", { column: label });
    else chosen = { id: special, column: card.column, target: findTarget(run, card.column.target) };
  }

  if (!chosen) {
    const columns = ctx.behaviour?.movement.columns;
    if (!columns) {
      note(run, "read-card", { unit: ctx.unit.name });
      return decision(run, { readCard: true });
    }
    const order: ColumnId[] = ["aggressive", "balanced", "cautious"];
    const from = orders.column ? order.indexOf(orders.column) : 0;
    for (const id of order.slice(from)) {
      const column = columns[id];
      const label = columnLabel(id);
      if (!column) continue;
      if (id === orders.column) note(run, "column-forced", { column: label });
      else if (id === "cautious") note(run, "column-default", { column: label });
      else if (!holds(run, column.when)) {
        note(run, "condition-false", { column: label });
        continue;
      } else note(run, "condition-true", { column: label });
      const target = findTarget(run, column.target);
      if (target) {
        chosen = { id, column, target };
        break;
      }
      note(run, "column-no-target", { column: label });
    }
  }

  if (!chosen?.target) {
    if (special && chosen) note(run, "column-no-target", { column: orderLabel(special) });
    note(run, "hold");
    return decision(run, { hold: true, reminders: ["flip"] });
  }

  note(run, "target", { target: chosen.target.name });
  const move = modeOf(run, chosen.column, orders.forbid);
  return decision(run, {
    column: chosen.id,
    target: chosen.target.id,
    ...move,
    filters: placeFilters(run, chosen.column, move.mode, orders),
    reminders: reminders(run, move.mode),
  });
}

/**
 * One step of an automated unit's activation: the next question, or the decision. Call again with the sheet after each reply
 * (`answer`); nothing already answered is asked again, and nothing here throws on a card it does not know.
 */
export function step(ctx: ResolveContext, sheet: SightSheet = emptySheet()): StepResult {
  const run: Run = { ctx, sheet, log: [], ideals: new Map() };
  try {
    return { decide: decideMove(run) };
  } catch (e) {
    if (e instanceof Asked) return { ask: e.question, log: run.log };
    throw e;
  }
}
