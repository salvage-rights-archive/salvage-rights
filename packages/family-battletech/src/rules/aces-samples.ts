// Our own sample Aces cards, for a player who has none yet: two behaviour decks, one command deck, the five special orders and two
// Battlefield Support cards, enough to play one short sortie. Every name, number and choice here is our invention; no card, photo or
// scan was used. Each record carries `sample: true`, is shown as "Sample", can be removed, and is never put in a library file as the
// player's own. Figures stay inside the ranges the rulebook shows: six cards to a behaviour deck (pp. 10, 38), three-digit priority
// numbers between Move First 000 and Move Last 1000 (p. 8), target zones of 6 to 30 inches (p. 12), command letters A to E (p. 10),
// and support cards of cost 2 to 3, target number 6 to 7 and damage 1 to 2 (pp. 20-21).
import { ACES_LETTERS } from "../data/aces-vocab";
import type { ColumnId, CommandLetter } from "../data/aces-vocab";
import { deckKey } from "./aces-card";
import type { AcesCard, AcesRecord, Column, CommandCard, Condition, Filter, Key, OvRow, SpecialOrderCard, SupportCard, TokenUse } from "./aces-card";

export const ACES_SAMPLES_CITE = { cite: "Aces pp. 8, 10, 12, 20-21, 38", checked: "page" } as const;

/** The commander on the sample command deck. */
export const SAMPLE_COMMANDER = "Sample Captain";

const all = (...clauses: TokenUse[]): Condition => ({ join: "all", clauses });
const tok = (token: string, params?: TokenUse["params"]): TokenUse => ({ token, ...(params ? { params } : {}) });
const head = (id: string, at: string) => ({ schema: 1 as const, id: `sample-${id}`, sample: true as const, source: { kind: "entered" as const, at } });

interface DeckPlan {
  role: string;
  /** Movement and combat priority of cards 1 to 6. */
  move: number[];
  combat: number[];
  /** Zone rings in inches, nearest first, for the movement side and the combat side. */
  moveRings: number[];
  combatRings: number[];
  /** How close it likes to stand: the distance a cautious card keeps. */
  keep: number;
}

const PLANS: DeckPlan[] = [
  { role: "Brawler", move: [118, 237, 351, 466, 584, 702], combat: [142, 259, 373, 488, 606, 724], moveRings: [8, 16, 24], combatRings: [8, 20], keep: 6 },
  { role: "Sniper", move: [163, 281, 395, 512, 629, 747], combat: [187, 305, 419, 536, 653, 771], moveRings: [12, 20, 30], combatRings: [12, 30], keep: 14 },
];

const COLOURS = ["red", "yellow", "blue"] as const;

function column(plan: DeckPlan, which: ColumnId, n: number): Column {
  const colour = COLOURS[n % 3]!;
  const inches = plan.keep + n;
  const brawler = plan.role === "Brawler";
  if (which === "aggressive") {
    return {
      when: all(tok("ideal-within", { colour, inches: plan.moveRings[1]! })),
      target: { zone: { rings: plan.moveRings }, flags: ["attackable"], pick: colour },
      move: { mode: "ground", alt: { mode: "jump" } },
      filters: [tok("closer", { ref: "target" }), brawler ? tok("sight", { ref: "target" }) : tok("cover", { ref: "target" })] as Filter[],
    };
  }
  if (which === "balanced") {
    return {
      when: all(tok("enemies-within", { inches: plan.moveRings[2]!, atLeast: 1 + (n % 2) })),
      target: { zone: { rings: plan.moveRings }, flags: [], pick: "nearest" },
      move: { mode: "ground" },
      filters: [tok("reach", { ref: "target" }), tok("keep-distance", { inches, ref: "enemies" })] as Filter[],
    };
  }
  return {
    target: { zone: { keyword: "nearest" }, flags: ["in-sight"] },
    move: { mode: "ground" },
    filters: [tok("stand-in", { terrain: "woods" }), tok("no-sight", { ref: "unmoved-enemies" })] as Filter[],
  };
}

function overheat(n: number): OvRow[] {
  return [
    { tn: { test: "at-most", value: 4 + (n % 2) }, action: tok("ov-max") },
    { tn: { test: "at-most", value: 7 }, join: "and", also: tok("has-heat"), action: tok("ov-up-to", { ov: 1 }) },
    { tn: { test: "at-least", value: 10 }, action: tok("hold-fire") },
  ];
}

function behaviourDeck(plan: DeckPlan, at: string): AcesCard[] {
  return Array.from({ length: 6 }, (_, i) => {
    const n = i + 1;
    const colour = COLOURS[i % 3]!;
    const keys: Key[] = [tok("colour-list", { colour }), tok("stat", { amount: "fewest", stat: "armor" })];
    return {
      ...head(`${plan.role.toLowerCase()}-${String(n)}`, at),
      kind: "aces-card" as const,
      deck: { role: plan.role },
      position: n,
      of: 6,
      movement: { priority: plan.move[i]!, columns: { aggressive: column(plan, "aggressive", i), balanced: column(plan, "balanced", i), cautious: column(plan, "cautious", i) } },
      combat: { priority: plan.combat[i]!, target: { zone: { rings: plan.combatRings }, flags: [], keys }, overheat: overheat(i) },
    };
  });
}

function commandDeck(at: string): CommandCard[] {
  const next = (l: CommandLetter): CommandLetter => ACES_LETTERS[(ACES_LETTERS.indexOf(l) + 1) % ACES_LETTERS.length]!;
  const orders: Record<CommandLetter, CommandCard["orders"]> = {
    A: [{ ...tok("no-order"), phase: "any" }],
    B: [{ ...tok("initiative", { n: 1 }), phase: "initiative" }],
    C: [{ ...tok("force-column", { column: "cautious" }), phase: "movement" }],
    D: [{ ...tok("give-token", { token: "first" }), phase: "movement", keys: [tok("stat", { amount: "most", stat: "pv" })] }],
    E: [{ ...tok("forbid-mode", { mode: "sprint" }), phase: "movement" }],
  };
  return ACES_LETTERS.map((letter, i) => ({
    ...head(`command-${letter.toLowerCase()}`, at),
    kind: "aces-command" as const,
    commander: SAMPLE_COMMANDER,
    faction: "",
    letter,
    position: i + 1,
    of: 5,
    orders: orders[letter],
    colours: {
      red: [tok("stat", { amount: "most", stat: "pv" })],
      yellow: [tok("stat", { amount: "fewest", stat: "armor" })],
      blue: [tok("stat", { amount: "most", stat: "tmm" })],
    },
    support: {
      spend: i % 2 === 0 ? tok("spend-if-structure") : tok("spend-up-to", { count: 1 }),
      emplacements: { rings: [10, 20], keys: [tok("stat", { amount: "fewest", stat: "armor" })] },
      artillery: [tok("stat", { amount: "most", stat: "pv" })],
      bsp: [tok("stat", { amount: "fewest", stat: "structure" })],
    },
    strategy: [
      { letter: next(letter), when: all(tok("enemy-without-armor")) },
      { letter: null, when: all(tok("always")) },
    ],
  }));
}

function specialOrders(at: string): SpecialOrderCard[] {
  const column: Column = { target: { zone: null, flags: [] }, move: { mode: "sprint" }, filters: [tok("escape", { mode: "sprint" })] as Filter[] };
  return [
    { ...head("order-forced-withdrawal", at), kind: "aces-order", order: "forced-withdrawal", column },
    { ...head("order-fleeing", at), kind: "aces-order", order: "fleeing", column: { ...column, filters: [tok("farther", { ref: "nearest-enemy" }), tok("escape")] as Filter[] } },
    {
      ...head("order-movement-objective", at),
      kind: "aces-order",
      order: "movement-objective",
      column: { target: { zone: null, flags: [] }, move: { mode: "ground" }, filters: [tok("closer", { ref: "move-objective" })] as Filter[] },
      preFilters: [tok("overlap", { ref: "move-objective" })] as Filter[],
    },
    { ...head("order-destroy-objective", at), kind: "aces-order", order: "destroy-objective" },
    { ...head("order-indirect-attacks", at), kind: "aces-order", order: "indirect-attacks", spotter: [tok("spotter-sees"), tok("stat", { amount: "most", stat: "armor" })] },
  ];
}

function supportCards(at: string): SupportCard[] {
  return [
    { ...head("support-sweep", at), kind: "aces-support", name: "Sample Sweep", cost: 3, tn: 6, damage: 2, area: false },
    { ...head("support-barrage", at), kind: "aces-support", name: "Sample Barrage", cost: 2, tn: 7, damage: 1, area: true },
  ];
}

/** The whole sample set, ready to save. */
export function acesSamples(at: string): AcesRecord[] {
  return [...PLANS.flatMap((p) => behaviourDeck(p, at)), ...commandDeck(at), ...specialOrders(at), ...supportCards(at)];
}

/** What a record stands in for: a deck, a commander, a special order or a support card by name. */
const slotOf = (r: AcesRecord): string => {
  switch (r.kind) {
    case "aces-card":
      return `card:${deckKey(r).toLowerCase()}`;
    case "aces-command":
      return `command:${r.commander.trim().toLowerCase()}|${r.faction.trim().toLowerCase()}`;
    case "aces-order":
      return `order:${r.order}`;
    case "aces-support":
      return `support:${r.name.trim().toLowerCase()}`;
  }
};

/** The records a game or sortie may use: a sample drops out where the player recorded their own for the same deck, commander, order or name. */
export function withoutShadowedSamples<T extends AcesRecord>(records: readonly T[]): T[] {
  const own = new Set(records.filter((r) => r.sample !== true).map(slotOf));
  return records.filter((r) => r.sample !== true || !own.has(slotOf(r)));
}
