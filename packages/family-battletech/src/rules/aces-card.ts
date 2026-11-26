// The player's own Aces cards as plain records: behaviour cards, command cards, special orders and Battlefield Support cards,
// built from our vocabulary (data/aces-vocab.ts). The app ships no card's content; a record holds what the player entered or
// scanned from a card they own. Shape checks never throw and say nothing about the rules: a card with a token we do not know is
// still a card, and `findings` names what the vocabulary cannot read. Book: the Aces rulebook, pp. 7-9, 11-14, 16-21.
import { ACES_DECK_SIZE, ACES_LETTERS, ACES_VALUES, ACES_ZONE_KEYWORDS, tokenById } from "../data/aces-vocab";
import type { CardSide, Colour, ColumnId, CommandLetter, MoveMode, OrderPhase, ParamKind, Slot, SpecialOrderKind, VocabToken } from "../data/aces-vocab";
import type { DeckCard } from "./aces-deck";

export type ParamValue = number | string | boolean | string[];

/** One token placed on a card, with its numbers and choices. The `other` token carries the player's own words in `note`. */
export interface TokenUse {
  token: string;
  params?: Record<string, ParamValue>;
  note?: string;
}

export type Clause = TokenUse;
/** Clauses that must all hold, or any one of them (p. 11). */
export interface Condition {
  join: "all" | "any";
  clauses: Clause[];
}
/** A movement filter (p. 14); `when` limits it, as in "if sprinting". */
export interface Filter extends TokenUse {
  when?: Condition;
}
/** A tie-break key for choosing among targets, top to bottom (pp. 12, 18). */
export type Key = TokenUse;

/** Zone rings in inches, or a keyword in their place (p. 12); null when the card names only a pick. */
export type Zone = { rings: number[] } | { keyword: (typeof ACES_ZONE_KEYWORDS)[number]["id"] } | null;

export interface TargetRule {
  zone: Zone;
  /** Target flag token ids: moved only, attackable after moving, in sight, out of sight (pp. 9, 12). */
  flags: string[];
  /** The colour list that breaks ties, or the nearest enemy (p. 12). */
  pick?: Colour | "nearest";
}

/** The movement mode, with a second mode used if needed or when its condition holds (p. 14). */
export interface MoveSpec {
  mode: MoveMode;
  alt?: { mode: MoveMode; when?: Condition };
}

/** One behaviour column; the Cautious column has no `when` (p. 11). */
export interface Column {
  when?: Condition;
  target: TargetRule;
  move: MoveSpec;
  filters: Filter[];
}

/** One overheat row (p. 19): a target number test, joined to a second test, and what to do. */
export interface OvRow {
  tn?: { test: "at-most" | "at-least"; value: number };
  join?: "and" | "or";
  also?: TokenUse;
  action: TokenUse;
}

export interface Source {
  kind: "entered" | "scan";
  at: string;
  /** The scan layout used, when scanned. */
  style?: string;
}

/** A behaviour card (pp. 7, 11-19). Both sides pair by deck and position, never by priority. Store key `aces-card:<id>`. */
export interface AcesCard {
  schema: 1;
  kind: "aces-card";
  id: string;
  /** Role from the Alpha Strike ground roles; subtype a short label such as Hover, Infantry or JMPS. */
  deck: { role: string; subtype?: string };
  /** The card's "n/6". */
  position: number;
  of: number;
  /** The player's own label when they own several copies of a deck. */
  copy?: string;
  /** The player's word that this deck's combat side has no overheat band; when absent the subtype decides (`hasOvBand`). */
  noOv?: boolean;
  movement: { priority: number | null; columns?: Record<ColumnId, Column> };
  combat: { priority: number | null; target?: TargetRule & { keys: Key[] }; overheat?: OvRow[] };
  /** The player's own words; kept on the device and in their own library file. */
  note?: string;
  source: Source;
}

/** A command card order (p. 8), for one phase; tokens are given by `keys`, filters added before the card's own (p. 14). */
export interface Order extends TokenUse {
  phase: OrderPhase;
  when?: Condition;
  keys?: Key[];
  filters?: Filter[];
}

/** A command card (pp. 8, 10, 20-21). Store key `aces-command:<id>`. */
export interface CommandCard {
  schema: 1;
  kind: "aces-command";
  id: string;
  commander: string;
  faction: string;
  letter: CommandLetter;
  position: number;
  of: number;
  orders: Order[];
  colours: Record<Colour, Key[]>;
  support: { spend: TokenUse; emplacements: { rings: number[]; keys: Key[] }; artillery: Key[]; bsp: Key[] };
  /** In printed order; the first that holds names the next card, `letter: null` keeps the current one (p. 21). */
  strategy: { letter: CommandLetter | null; when: Condition }[];
  note?: string;
  source: Source;
}

/** One of the five special orders, identified by kind (pp. 8, 16-17, 20). Store key `aces-order:<id>`. */
export interface SpecialOrderCard {
  schema: 1;
  kind: "aces-order";
  id: string;
  order: SpecialOrderKind;
  column?: Column;
  /** Filters numbered 0a-0c, put before the card's own (p. 17). */
  preFilters?: Filter[];
  /** How the indirect attack spotter is chosen (p. 20). */
  spotter?: Key[];
  note?: string;
  source: Source;
}

/** A Battlefield Support card the player owns (pp. 20-21). Store key `aces-support:<id>`. */
export interface SupportCard {
  schema: 1;
  kind: "aces-support";
  id: string;
  name: string;
  cost: number;
  tn: number;
  damage: number;
  /** Area-effect damage. */
  area: boolean;
  note?: string;
  source: Source;
}

export type AcesRecord = AcesCard | CommandCard | SpecialOrderCard | SupportCard;
export type AcesKind = AcesRecord["kind"];
export const ACES_KINDS: readonly AcesKind[] = ["aces-card", "aces-command", "aces-order", "aces-support"];

// ---- Shape checks: types only, never the rules, never throwing ---------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const optional = (v: unknown, check: (x: unknown) => boolean): boolean => v === undefined || check(v);
const listOf = (check: (x: unknown) => boolean) => (v: unknown): boolean => Array.isArray(v) && v.every(check);
const isParamValue = (v: unknown): boolean => isNumber(v) || isString(v) || typeof v === "boolean" || listOf(isString)(v);

export function isTokenUse(v: unknown): v is TokenUse {
  return isObject(v) && isString(v.token) && optional(v.params, (ps) => isObject(ps) && Object.values(ps).every(isParamValue)) && optional(v.note, isString);
}

const isCondition = (v: unknown): v is Condition => isObject(v) && (v.join === "all" || v.join === "any") && listOf(isTokenUse)(v.clauses);
const isFilter = (v: unknown): boolean => isTokenUse(v) && optional((v as Filter).when, isCondition);
const isZone = (v: unknown): boolean => v === null || (isObject(v) && (listOf(isNumber)(v.rings) || isString(v.keyword)));
const isTarget = (v: unknown): boolean => isObject(v) && isZone(v.zone) && listOf(isString)(v.flags) && optional(v.pick, isString);
const isMove = (v: unknown): boolean => isObject(v) && isString(v.mode) && optional(v.alt, (a) => isObject(a) && isString(a.mode) && optional(a.when, isCondition));
const isColumn = (v: unknown): boolean => isObject(v) && optional(v.when, isCondition) && isTarget(v.target) && isMove(v.move) && listOf(isFilter)(v.filters);
const isOvRow = (v: unknown): boolean =>
  isObject(v) &&
  optional(v.tn, (x) => isObject(x) && (x.test === "at-most" || x.test === "at-least") && isNumber(x.value)) &&
  optional(v.join, (j) => j === "and" || j === "or") &&
  optional(v.also, isTokenUse) &&
  isTokenUse(v.action);
const isSource = (v: unknown): boolean => isObject(v) && (v.kind === "entered" || v.kind === "scan") && isString(v.at) && optional(v.style, isString);
const isPriority = (v: unknown): boolean => v === null || isNumber(v);
const head = (v: Record<string, unknown>, kind: AcesKind): boolean => v.schema === 1 && v.kind === kind && isString(v.id) && optional(v.note, isString) && isSource(v.source);

export function isAcesCard(v: unknown): v is AcesCard {
  if (!isObject(v) || !head(v, "aces-card")) return false;
  const { deck, movement, combat } = v;
  return (
    isObject(deck) &&
    isString(deck.role) &&
    optional(deck.subtype, isString) &&
    isNumber(v.position) &&
    isNumber(v.of) &&
    optional(v.copy, isString) &&
    optional(v.noOv, (x) => typeof x === "boolean") &&
    isObject(movement) &&
    isPriority(movement.priority) &&
    optional(movement.columns, (c) => isObject(c) && isColumn(c.aggressive) && isColumn(c.balanced) && isColumn(c.cautious)) &&
    isObject(combat) &&
    isPriority(combat.priority) &&
    optional(combat.target, (tg) => isTarget(tg) && listOf(isTokenUse)((tg as Record<string, unknown>).keys)) &&
    optional(combat.overheat, listOf(isOvRow))
  );
}

const isOrder = (v: unknown): boolean =>
  isTokenUse(v) &&
  isString((v as Order).phase) &&
  optional((v as Order).when, isCondition) &&
  optional((v as Order).keys, listOf(isTokenUse)) &&
  optional((v as Order).filters, listOf(isFilter));

export function isCommandCard(v: unknown): v is CommandCard {
  if (!isObject(v) || !head(v, "aces-command")) return false;
  const { colours, support } = v;
  return (
    isString(v.commander) &&
    isString(v.faction) &&
    isString(v.letter) &&
    isNumber(v.position) &&
    isNumber(v.of) &&
    listOf(isOrder)(v.orders) &&
    isObject(colours) &&
    ["red", "yellow", "blue"].every((c) => listOf(isTokenUse)(colours[c])) &&
    isObject(support) &&
    isTokenUse(support.spend) &&
    isObject(support.emplacements) &&
    listOf(isNumber)(support.emplacements.rings) &&
    listOf(isTokenUse)(support.emplacements.keys) &&
    listOf(isTokenUse)(support.artillery) &&
    listOf(isTokenUse)(support.bsp) &&
    listOf((row) => isObject(row) && (row.letter === null || isString(row.letter)) && isCondition(row.when))(v.strategy)
  );
}

export function isSpecialOrderCard(v: unknown): v is SpecialOrderCard {
  if (!isObject(v) || !head(v, "aces-order")) return false;
  return isString(v.order) && optional(v.column, isColumn) && optional(v.preFilters, listOf(isFilter)) && optional(v.spotter, listOf(isTokenUse));
}

export function isSupportCard(v: unknown): v is SupportCard {
  if (!isObject(v) || !head(v, "aces-support")) return false;
  return isString(v.name) && isNumber(v.cost) && isNumber(v.tn) && isNumber(v.damage) && typeof v.area === "boolean";
}

const CHECKS: Record<AcesKind, (v: unknown) => boolean> = {
  "aces-card": isAcesCard,
  "aces-command": isCommandCard,
  "aces-order": isSpecialOrderCard,
  "aces-support": isSupportCard,
};

/** A record of one of our four kinds whose shape we can read. */
export function isAcesRecord(v: unknown): v is AcesRecord {
  return isObject(v) && (ACES_KINDS as readonly unknown[]).includes(v.kind) && CHECKS[v.kind as AcesKind](v);
}

// ---- Vocabulary findings: what our tokens cannot read ------------------------------------------------------------------------

const valuesOf = (kind: ParamKind): readonly { id: string; label: string }[] | undefined => (ACES_VALUES as Partial<Record<ParamKind, readonly { id: string; label: string }[]>>)[kind];

function badValue(kind: ParamKind, value: ParamValue, allowed?: readonly string[]): boolean {
  const known = valuesOf(kind)?.map((x) => x.id);
  const inList = (x: unknown) => isString(x) && (!known || known.includes(x)) && (!allowed || allowed.includes(x));
  switch (kind) {
    case "inches":
      return !isNumber(value) || value <= 0;
    case "count":
    case "tn":
    case "ov":
      return !isNumber(value) || !Number.isInteger(value) || value < 0;
    case "signed":
      return !isNumber(value) || !Number.isInteger(value);
    case "flag":
      return value !== true;
    case "quals":
      return !Array.isArray(value) || value.length === 0 || !value.every(inList);
    default:
      return !inList(value);
  }
}

/** What is wrong with one placed token for the slot and card side it sits in; an empty list when it reads. */
export function checkUse(use: TokenUse, slot: Slot, side: CardSide): string[] {
  const tok = tokenById.get(use.token);
  if (!tok) return [`unknown token "${use.token}"`];
  const out: string[] = [];
  const fits = tok.slots.includes(slot) || (slot === "strategy" && tok.slots.includes("condition"));
  if (!fits) out.push(`"${use.token}" does not go in ${slot}`);
  if (!tok.sides.includes(side)) out.push(`"${use.token}" does not go on the ${side} side`);
  if (use.token === "other" && !use.note?.trim()) out.push(`"other" needs the player's note`);
  const params = use.params ?? {};
  for (const spec of tok.params) {
    const value = params[spec.name];
    if (value === undefined) {
      if (!spec.optional) out.push(`"${use.token}" needs ${spec.name}`);
    } else if (badValue(spec.kind, value, spec.values)) out.push(`"${use.token}" cannot take ${spec.name} ${JSON.stringify(value)}`);
  }
  for (const name of Object.keys(params)) if (!tok.params.some((s) => s.name === name)) out.push(`"${use.token}" has no ${name}`);
  return out;
}

export interface Finding {
  /** Where in the record, such as "movement.balanced.filters.2". */
  at: string;
  problem: string;
}

/** Every token in the record that our vocabulary cannot read, with where it is. */
export function findings(record: AcesRecord): Finding[] {
  const out: Finding[] = [];
  const place = (u: TokenUse, slot: Slot, side: CardSide, at: string) => {
    for (const problem of checkUse(u, slot, side)) out.push({ at, problem });
  };
  const cond = (c: Condition | undefined, side: CardSide, at: string, slot: Slot = "condition") => {
    c?.clauses.forEach((cl, i) => {
      place(cl, slot, side, `${at}.${String(i)}`);
    });
  };
  const filters = (fs: Filter[] | undefined, side: CardSide, at: string) => {
    fs?.forEach((f, i) => {
      place(f, "filter", side, `${at}.${String(i)}`);
      cond(f.when, side, `${at}.${String(i)}.when`);
    });
  };
  const keys = (ks: Key[] | undefined, side: CardSide, at: string, slot: Slot = "key") => {
    ks?.forEach((k, i) => {
      place(k, slot, side, `${at}.${String(i)}`);
    });
  };
  const target = (tg: TargetRule, side: CardSide, at: string) => {
    tg.flags.forEach((f, i) => {
      place({ token: f }, "target-flag", side, `${at}.flags.${String(i)}`);
    });
  };
  const column = (c: Column, side: CardSide, at: string) => {
    cond(c.when, side, `${at}.when`);
    target(c.target, side, `${at}.target`);
    cond(c.move.alt?.when, side, `${at}.move.alt.when`);
    filters(c.filters, side, `${at}.filters`);
  };
  switch (record.kind) {
    case "aces-card": {
      const cols = record.movement.columns;
      if (cols) for (const id of ["aggressive", "balanced", "cautious"] as const) column(cols[id], "movement", `movement.${id}`);
      const tg = record.combat.target;
      if (tg) {
        target(tg, "combat", "combat.target");
        keys(tg.keys, "combat", "combat.target.keys");
      }
      record.combat.overheat?.forEach((row, i) => {
        if (row.also) place(row.also, "ov-also", "combat", `combat.overheat.${String(i)}.also`);
        place(row.action, "ov-action", "combat", `combat.overheat.${String(i)}.action`);
      });
      break;
    }
    case "aces-command":
      record.orders.forEach((o, i) => {
        place(o, "order", "command", `orders.${String(i)}`);
        cond(o.when, "command", `orders.${String(i)}.when`);
        keys(o.keys, "command", `orders.${String(i)}.keys`);
        filters(o.filters, "movement", `orders.${String(i)}.filters`);
      });
      for (const c of ["red", "yellow", "blue"] as const) keys(record.colours[c], "command", `colours.${c}`);
      place(record.support.spend, "support", "command", "support.spend");
      keys(record.support.emplacements.keys, "command", "support.emplacements");
      keys(record.support.artillery, "command", "support.artillery");
      keys(record.support.bsp, "command", "support.bsp");
      record.strategy.forEach((row, i) => {
        cond(row.when, "command", `strategy.${String(i)}`, "strategy");
      });
      break;
    case "aces-order":
      if (record.column) column(record.column, "special", "column");
      filters(record.preFilters, "special", "preFilters");
      keys(record.spotter, "special", "spotter", "spotter");
      break;
    case "aces-support":
      break;
  }
  return out;
}

// ---- Identity: decks, pairing, completeness -----------------------------------------------------------------------------------

/** The deck a card belongs to, as its title reads: role, then the subtype in brackets ("Striker (Hover)"). */
export function deckKey(card: Pick<AcesCard, "deck">): string {
  const role = card.deck.role.trim();
  const sub = card.deck.subtype?.trim();
  return sub ? `${role} (${sub})` : role;
}

/** Subtypes whose combat side prints no overheat band (design 0.4: vehicles and infantry); the player can say otherwise. */
const NO_OV_SUBTYPES = ["hover", "infantry"];

/** Whether the card's combat side has overheat rows: the player's own word first, else the subtype. */
export function hasOvBand(card: Pick<AcesCard, "deck" | "noOv">): boolean {
  return card.noOv === undefined ? !NO_OV_SUBTYPES.includes((card.deck.subtype ?? "").trim().toLowerCase()) : !card.noOv;
}

/** The five fields the deck engine needs (rules/aces-deck.ts). */
export function toDeckCard(card: AcesCard): DeckCard {
  return { id: card.id, deckKey: deckKey(card), position: card.position, movePriority: card.movement.priority, combatPriority: card.combat.priority };
}

/** One side of a card as a scan or the player reads it. */
export interface SideRead {
  deck: string;
  position: number;
  side: "movement" | "combat";
  priority: number | null;
  /** The caller's own handle for the side (a photo id, a form row). */
  ref?: string;
}

export interface SidePair {
  deck: string;
  position: number;
  movement?: SideRead;
  combat?: SideRead;
}

/**
 * Puts the two sides of each card together by deck and position. The priority numbers are never used: some decks print a
 * different number on each side (p. 18 note). With several copies of a deck, sides pair in the order they were read; a side
 * left over stays alone.
 */
export function pairSides(sides: readonly SideRead[]): SidePair[] {
  const groups = new Map<string, { deck: string; position: number; movement: SideRead[]; combat: SideRead[] }>();
  for (const s of sides) {
    const name = s.deck.trim().replace(/\s+/g, " ");
    const at = `${name.toLowerCase()}|${String(s.position)}`;
    const g = groups.get(at) ?? { deck: name, position: s.position, movement: [], combat: [] };
    g[s.side].push(s);
    groups.set(at, g);
  }
  const pairs: SidePair[] = [];
  for (const g of groups.values()) {
    for (let i = 0; i < Math.max(g.movement.length, g.combat.length); i++) {
      const movement = g.movement[i];
      const combat = g.combat[i];
      pairs.push({ deck: g.deck, position: g.position, ...(movement ? { movement } : {}), ...(combat ? { combat } : {}) });
    }
  }
  return pairs.sort((a, b) => a.deck.localeCompare(b.deck) || a.position - b.position);
}

/** How much of a card is recorded: both sides' content, one side's, or only its identity (deck, position, priorities). */
export type CardLevel = "full" | "movement" | "combat" | "identity";

export function cardLevel(card: AcesCard): CardLevel {
  const m = card.movement.columns !== undefined;
  const c = card.combat.target !== undefined;
  return m && c ? "full" : m ? "movement" : c ? "combat" : "identity";
}

export interface DeckCompleteness {
  key: string;
  of: number;
  /** Positions the player has at least one card for, in order. */
  have: number[];
  missing: number[];
  /** Whole sets of the deck (every position present that many times). */
  copies: number;
  levels: Record<CardLevel, number>;
}

/** One row per deck the player has entered any card of; decks with no cards do not appear. */
export function completeness(cards: readonly AcesCard[]): DeckCompleteness[] {
  const byKey = new Map<string, AcesCard[]>();
  for (const c of cards) byKey.set(deckKey(c), [...(byKey.get(deckKey(c)) ?? []), c]);
  return [...byKey.entries()]
    .map(([key, list]) => {
      const of = Math.max(ACES_DECK_SIZE, ...list.map((c) => c.of));
      const count = (n: number) => list.filter((c) => c.position === n).length;
      const all = Array.from({ length: of }, (_, i) => i + 1);
      const levels: Record<CardLevel, number> = { full: 0, movement: 0, combat: 0, identity: 0 };
      for (const c of list) levels[cardLevel(c)]++;
      return { key, of, have: all.filter((n) => count(n) > 0), missing: all.filter((n) => count(n) === 0), copies: Math.min(...all.map(count)), levels };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

export interface CommandCompleteness {
  key: string;
  have: CommandLetter[];
  missing: CommandLetter[];
}

/** One row per commander and faction: which of the letters A-E the player has (pp. 8, 10). */
export function commandCompleteness(cards: readonly CommandCard[]): CommandCompleteness[] {
  const byKey = new Map<string, Set<string>>();
  for (const c of cards) {
    const key = `${c.commander.trim()} (${c.faction.trim()})`;
    byKey.set(key, (byKey.get(key) ?? new Set()).add(c.letter));
  }
  return [...byKey.entries()]
    .map(([key, letters]) => ({ key, have: ACES_LETTERS.filter((l) => letters.has(l)), missing: ACES_LETTERS.filter((l) => !letters.has(l)) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// ---- Our words for a column, for the preview and the game ----------------------------------------------------------------------

function labelOf(kind: ParamKind, id: string): string {
  return valuesOf(kind)?.find((x) => x.id === id)?.label ?? id;
}

function formatParam(kind: ParamKind, value: ParamValue): string | undefined {
  switch (kind) {
    case "inches":
      return `${String(value)}"`;
    case "signed":
      return isNumber(value) && value >= 0 ? `+${String(value)}` : String(value);
    case "flag":
      return value === true ? "" : undefined;
    case "quals":
      return (Array.isArray(value) ? value : [String(value)]).map((q) => labelOf("quals", q)).join(" ");
    case "count":
    case "tn":
    case "ov":
      return String(value);
    default:
      return labelOf(kind, String(value));
  }
}

function fill(tok: VocabToken, use: TokenUse): string {
  const words: Record<string, string | undefined> = { note: use.note?.trim() || undefined };
  for (const spec of tok.params) {
    const value = use.params?.[spec.name];
    words[spec.name] = value === undefined ? undefined : formatParam(spec.kind, value);
  }
  const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
  return tok.label
    .replace(/\[([^\]]*)\]/g, (_, part: string) => (names(part).every((n) => words[n] !== undefined) ? part : ""))
    .replace(/\{(\w+)\}/g, (_, n: string) => words[n] ?? "?");
}

/** One token in our words. A token we do not know is named, never dropped. */
export function renderUse(use: TokenUse): string {
  const tok = tokenById.get(use.token);
  return tok ? fill(tok, use) : `a step we do not know (${use.token})`;
}

export function renderCondition(c: Condition): string {
  return c.clauses.map(renderUse).join(c.join === "all" ? " and " : " or ");
}

function renderFilter(f: Filter): string {
  return f.when ? `if ${renderCondition(f.when)}: ${renderUse(f)}` : renderUse(f);
}

export function renderTarget(rule: TargetRule & { keys?: Key[] }): string {
  const zone = rule.zone === null ? undefined : "rings" in rule.zone ? `zones ${rule.zone.rings.map((r) => `${String(r)}"`).join(" / ")}` : `${rule.zone.keyword} enemy`;
  const pick = rule.pick === undefined ? undefined : rule.pick === "nearest" ? "the nearest" : `the ${labelOf("colour", rule.pick)} list`;
  const flags = rule.flags.map((f) => renderUse({ token: f }));
  return [zone, ...flags, pick, ...(rule.keys ?? []).map(renderUse)].filter((x) => x !== undefined).join("; ");
}

export function renderMove(m: MoveSpec): string {
  const mode = (id: string) => labelOf("mode", id);
  if (!m.alt) return mode(m.mode);
  return `${mode(m.mode)} (${mode(m.alt.mode)} ${m.alt.when ? `if ${renderCondition(m.alt.when)}` : "if needed"})`;
}

export interface RenderedColumn {
  when: string | null;
  target: string;
  move: string;
  filters: string[];
}

/** A behaviour column in our words, as the card editor's preview and the game show it. */
export function render(column: Column): RenderedColumn {
  return {
    when: column.when ? renderCondition(column.when) : null,
    target: renderTarget(column.target),
    move: renderMove(column.move),
    filters: column.filters.map(renderFilter),
  };
}

/** An overheat row in our words (p. 19). */
export function renderOv(row: OvRow): string {
  const tn = row.tn ? `TN ${String(row.tn.value)} or ${row.tn.test === "at-most" ? "less" : "more"}` : undefined;
  const test = [tn, row.also ? renderUse(row.also) : undefined].filter((x) => x !== undefined).join(row.join === "or" ? " or " : " and ");
  return test ? `if ${test}: ${renderUse(row.action)}` : renderUse(row.action);
}

/** A new behaviour card with only its identity, which still runs as a priority card once the player names its deck. */
export function newAcesCard(id: string, at: string): AcesCard {
  return { schema: 1, kind: "aces-card", id, deck: { role: "" }, position: 1, of: ACES_DECK_SIZE, movement: { priority: null }, combat: { priority: null }, source: { kind: "entered", at } };
}
