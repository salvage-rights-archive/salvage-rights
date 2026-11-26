// The Aces deck engine: who holds which cards, which unit acts next, and how the cards turn over. Pure and seeded; the same seed
// gives the same decks. Nothing here throws on odd input. Cards are the player's own records (ACES-1); this file needs only the
// five fields of DeckCard, so it does not wait for them.
//
// Constants stay here with their cites until data/aces.ts exists (ACES-11 creates it). Book: the Aces rulebook ("Aces", printed
// page = index), checked against the page images 2026-11-25 (checked: "page").

export const ACES_CITE = {
  deckSize: { cite: "Aces pp. 10, 38", checked: "page" },
  tokens: { cite: "Aces p. 8", checked: "page" },
  withdrawal: { cite: "Aces pp. 8, 16", checked: "page" },
  tieBreak: { cite: "Aces p. 11", checked: "page" },
  frontLoaded: { cite: "Aces p. 6", checked: "page" },
  flip: { cite: "Aces p. 14", checked: "page" },
  cycle: { cite: "Aces p. 19", checked: "page" },
  split: { cite: "Aces p. 38", checked: "page" },
} as const;

/** Cards in one unit's deck (pp. 10, 38). */
export const DECK_SIZE = 6;
/** Move First counts as 000 and Move Last as 1000 (p. 8). */
export const TOKEN_PRIORITY = { first: 0, last: 1000 } as const;
/** Forced withdrawal and fleeing add this to the card's priority number (pp. 8, 16); the result may be negative. */
export const WITHDRAWAL_MODIFIER = -500;

/** The least we need to know about one printed card. */
export interface DeckCard {
  id: string;
  /** Role and movement type, the card's title: cards with the same key are interchangeable decks. */
  deckKey: string;
  /** The "n/6" on the card. */
  position: number;
  movePriority: number | null;
  combatPriority: number | null;
}

/** One card in a unit's deck; `flipped` means its combat side shows (it was used this cycle). The top card is first. */
export interface DeckSlot {
  id: string;
  flipped: boolean;
}

export interface UnitDeck {
  unitId: string;
  deckKey: string;
  cards: DeckSlot[];
}

export interface DeckState {
  /** The generator's state, so a saved game goes on from where it was. */
  rng: number;
  decks: UnitDeck[];
  /** Cards a split could not share out evenly, kept aside until the next shuffle (p. 38), by deck key. */
  aside: Record<string, string[]>;
}

export interface DeckUnit {
  unitId: string;
  deckKey: string;
  /** Point value, the tie-break for equal priorities (p. 11). */
  pv: number;
}

/** A small seeded generator (mulberry32). `state()` gives the value to seed the next run from. */
export function mulberry32(seed: number): (() => number) & { state: () => number } {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(next, { state: () => a });
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Share a pool of cards among `count` units: shuffle, then equal piles of at most six; what does not divide evenly is set aside
 * when the pool is smaller than six per unit (split decks, p. 38). A pool larger than six per unit is merged copies: each unit
 * draws six at random (p. 38) and the rest go back to the box.
 */
function deal(pool: string[], count: number, rng: () => number): { piles: string[][]; aside: string[] } {
  const mixed = shuffled(pool, rng);
  const each = count > 0 ? Math.floor(mixed.length / count) : 0;
  const size = Math.min(DECK_SIZE, each);
  const piles = Array.from({ length: count }, (_, i) => mixed.slice(i * size, (i + 1) * size));
  const aside = each > DECK_SIZE ? [] : mixed.slice(count * size);
  return { piles, aside };
}

const slots = (ids: string[]): DeckSlot[] => ids.map((id) => ({ id, flipped: false }));

/**
 * One deck per automated unit. Units that share a deck key split that key's cards evenly (extras aside); owning more than six
 * cards of a key means merged copies, and each unit draws six at random. `fixedOrders` gives a unit's cards in a set order (the
 * tutorial); those cards are not dealt to anyone else.
 */
export function buildDecks(
  units: readonly DeckUnit[],
  library: readonly DeckCard[],
  seed: number,
  fixedOrders: Record<string, string[]> = {},
): DeckState {
  const rng = mulberry32(seed);
  const decks: UnitDeck[] = [];
  const aside: Record<string, string[]> = {};
  const keys = [...new Set(units.map((u) => u.deckKey))];
  for (const key of keys) {
    const mine = units.filter((u) => u.deckKey === key);
    const fixed = mine.filter((u) => fixedOrders[u.unitId]);
    const taken = new Set(fixed.flatMap((u) => fixedOrders[u.unitId]!));
    const dealt = mine.filter((u) => !fixedOrders[u.unitId]);
    const pool = library
      .filter((c) => c.deckKey === key && !taken.has(c.id))
      .sort((a, b) => a.position - b.position)
      .map((c) => c.id);
    const { piles, aside: extras } = deal(pool, dealt.length, rng);
    if (extras.length) aside[key] = extras;
    for (const unit of mine) {
      const at = dealt.indexOf(unit);
      const ids = at < 0 ? fixedOrders[unit.unitId]! : piles[at]!;
      decks.push({ unitId: unit.unitId, deckKey: key, cards: slots(ids) });
    }
  }
  return { rng: rng.state(), decks, aside };
}

const deckOf = (state: DeckState, unitId: string): UnitDeck | undefined => state.decks.find((d) => d.unitId === unitId);

export interface Revealed {
  card: DeckCard;
  /** True when the combat side shows. */
  flipped: boolean;
  movePriority: number | null;
  combatPriority: number | null;
}

/** The unit's top card, whose priority numbers are read before Initiative (pp. 10-11). */
export function reveal(state: DeckState, library: readonly DeckCard[], unitId: string): Revealed | undefined {
  const top = deckOf(state, unitId)?.cards[0];
  const card = top && library.find((c) => c.id === top.id);
  if (!top || !card) return undefined;
  return { card, flipped: top.flipped, movePriority: card.movePriority, combatPriority: card.combatPriority };
}

/** After the unit has moved the top card turns to its combat side (p. 14). */
export function flipTop(state: DeckState, unitId: string): DeckState {
  return {
    ...state,
    decks: state.decks.map((d) =>
      d.unitId === unitId && d.cards[0] ? { ...d, cards: [{ ...d.cards[0], flipped: true }, ...d.cards.slice(1)] } : d,
    ),
  };
}

/**
 * After the unit has attacked the top card goes underneath; if the new top shows its combat side the whole deck has been used,
 * so every card is turned back and shuffled (p. 19). Units sharing a split deck are re-dealt together from all their cards and
 * the set-aside ones (p. 38).
 */
export function cycle(state: DeckState, unitId: string): { state: DeckState; reshuffled: boolean } {
  const deck = deckOf(state, unitId);
  if (!deck || deck.cards.length === 0) return { state, reshuffled: false };
  const [top, ...rest] = deck.cards;
  const cards = [...rest, top!];
  const moved: DeckState = { ...state, decks: state.decks.map((d) => (d === deck ? { ...d, cards } : d)) };
  if (!cards[0]!.flipped) return { state: moved, reshuffled: false };
  return { state: reshuffle(moved, deck.deckKey), reshuffled: true };
}

function reshuffle(state: DeckState, key: string): DeckState {
  const rng = mulberry32(state.rng);
  const sharing = state.decks.filter((d) => d.deckKey === key);
  const pool = [...sharing.flatMap((d) => d.cards.map((c) => c.id)), ...(state.aside[key] ?? [])];
  const { piles, aside: extras } = sharing.length === 1 ? { piles: [shuffled(pool, rng)], aside: [] } : deal(pool, sharing.length, rng);
  const nextAside = { ...state.aside };
  if (extras.length) nextAside[key] = extras;
  else delete nextAside[key];
  let i = 0;
  const decks = state.decks.map((d) => (d.deckKey === key ? { ...d, cards: slots(piles[i++]!) } : d));
  return { rng: rng.state(), decks, aside: nextAside };
}

export type SpecialToken = "first" | "last";
export type MovementOrder = "withdrawal" | "fleeing";

export interface Activatable {
  unitId: string;
  pv: number;
  /** The top card's movement priority; null when it was not recorded. */
  priority: number | null;
  token?: SpecialToken;
  /** A unit under forced withdrawal or fleeing gets -500 and cannot hold a token (pp. 8, 16). */
  order?: MovementOrder;
}

export type Pick = { kind: "unit"; unitId: string } | { kind: "ask"; unitIds: string[]; reason: "tied" | "unknown-priority" } | { kind: "none" };

/** The number a unit acts on: the card's priority, a token's 000 or 1000, or the card's less 500 under withdrawal or fleeing. */
export function effectivePriority(u: Activatable): number | null {
  if (u.priority === null) return null;
  if (u.order) return u.priority + WITHDRAWAL_MODIFIER;
  return u.token ? TOKEN_PRIORITY[u.token] : u.priority;
}

function lowest(candidates: readonly Activatable[], priorityOf: (u: Activatable) => number | null): Pick {
  if (candidates.length === 0) return { kind: "none" };
  const unknown = candidates.filter((u) => priorityOf(u) === null);
  if (unknown.length) return { kind: "ask", unitIds: candidates.map((u) => u.unitId), reason: "unknown-priority" };
  const best = Math.min(...candidates.map((u) => priorityOf(u)!));
  const tied = candidates.filter((u) => priorityOf(u) === best);
  const cheapest = Math.min(...tied.map((u) => u.pv));
  const left = tied.filter((u) => u.pv === cheapest);
  return left.length === 1 ? { kind: "unit", unitId: left[0]!.unitId } : { kind: "ask", unitIds: left.map((u) => u.unitId), reason: "tied" };
}

/** Who moves next: the lowest effective priority among units that can still move; a tie goes to the lower PV, then to the players (p. 11). */
export function nextAutomated(candidates: readonly Activatable[]): Pick {
  return lowest(candidates, effectivePriority);
}

/** Who attacks next: the lowest combat priority, withdrawal and tokens having no effect in the Combat Phase (pp. 18-19). Ties as in movement. */
export function nextCombat(candidates: readonly Activatable[]): Pick {
  return lowest(candidates, (u) => u.priority);
}

export interface Mover {
  immobile?: boolean;
  shutDown?: boolean;
  emplacement?: boolean;
  transported?: boolean;
}

/** Units that cannot move this turn are not counted for the unequal-numbers rule (p. 6). */
export const canMove = (u: Mover): boolean => !u.immobile && !u.shutDown && !u.emplacement && !u.transported;

export interface ScheduleStep {
  side: "loser" | "winner";
  count: number;
}

/**
 * The "front loaded" movement order (p. 6): before each pair of moves the side with more units left moves ceil(more / fewer) of
 * them and the other side moves one; the side that lost Initiative goes first in each pair. A side with none left leaves the
 * other to move everything remaining. Counts are of units that can move.
 */
export function schedule(loser: number, winner: number): ScheduleStep[] {
  const steps: ScheduleStep[] = [];
  let l = Math.max(0, Math.floor(loser));
  let w = Math.max(0, Math.floor(winner));
  while (l > 0 || w > 0) {
    const fewer = Math.min(l, w);
    const lc = fewer === 0 ? l : l > w ? Math.ceil(l / fewer) : 1;
    const wc = fewer === 0 ? w : w > l ? Math.ceil(w / fewer) : 1;
    if (lc > 0) steps.push({ side: "loser", count: lc });
    if (wc > 0) steps.push({ side: "winner", count: wc });
    l -= lc;
    w -= wc;
  }
  return steps;
}
