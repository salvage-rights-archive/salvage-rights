// The Aces vocabulary: a closed list of tokens the player builds their own behaviour, command and special order cards from.
// Every label is our own short wording, written from the game terms; no card or rulebook sentence is copied. Each token names
// how the app resolves it during play and the rulebook page that defines the idea behind it.
//
// Book: the Aces rulebook ("BattleTech: Aces rulebook", Catalyst Game Labs, 2025; printed page = PDF index), read against the
// page images 2026-11-25 (checked: "page"). Plain data; nothing here runs.

/** How the app settles a token in play. */
export type Resolve =
  /** From the play state (who has moved, Armor, heat, stats). */
  | "auto"
  /** From the distances and line of sight the player enters for this activation. */
  | "measure"
  /** A yes/no or pick-the-units question to the player. */
  | "ask"
  /** Shown in our words; the player applies it on the table (movement filters). */
  | "table";

/** Where on a card a token may be placed. */
export type Slot =
  | "condition" // a column's condition, an "if" on a move, filter or order, or a strategy row
  | "strategy" // only in a command card's strategy rows
  | "target-flag" // a target rule's restriction
  | "filter" // a movement filter
  | "key" // a tie-break key for a target (combat side, colour lists, support columns, token orders)
  | "spotter" // the indirect attack spotter list
  | "ov-also" // the second test of an overheat row
  | "ov-action" // what an overheat row does
  | "order" // a command card order
  | "support"; // a command card's support spending rule

/** Which kind of card a token may appear on. */
export type CardSide = "movement" | "combat" | "command" | "special";

export type ParamKind =
  | "inches"
  | "count"
  | "tn"
  | "ov"
  | "signed"
  | "colour"
  | "quals"
  | "ref"
  | "amount"
  | "stat"
  | "bracket"
  | "mode"
  | "terrain"
  | "column"
  | "token"
  /** A yes/no that adds words when set; its placeholder prints nothing. */
  | "flag";

export interface ParamSpec {
  name: string;
  kind: ParamKind;
  optional?: true;
  /** When only some of the kind's values make sense for this token. */
  values?: readonly string[];
}

export type Group =
  | "ideal"
  | "enemies"
  | "this unit"
  | "force"
  | "target"
  | "distance"
  | "sight"
  | "range"
  | "cover"
  | "terrain"
  | "position"
  | "objective"
  | "stat"
  | "flag"
  | "overheat"
  | "order"
  | "support"
  | "other";

export type IconId =
  | "moved"
  | "unmoved"
  | "most"
  | "fewest"
  | "zone"
  | "attack-range"
  | "sight"
  | "no-sight"
  | "closer"
  | "spacing"
  | "bracket"
  | "ground"
  | "jump"
  | "sprint"
  | "standstill"
  | "destroy-objective"
  | "move-objective";

export interface VocabToken {
  id: string;
  /**
   * Our own words. `{name}` is replaced by the parameter's value in words; a `[...]` part is left out when a parameter inside it
   * has no value.
   */
  label: string;
  group: Group;
  slots: readonly Slot[];
  sides: readonly CardSide[];
  params: readonly ParamSpec[];
  resolve: Resolve;
  icon?: IconId;
  cite: string;
  checked: "page";
}

const BOOK = "BattleTech: Aces rulebook (Catalyst Game Labs)";
const p = (pages: string): string => `${BOOK}, p. ${pages}`;

/** Where the card structure is read: anatomy p. 7, command and special order cards p. 8, icons and keywords p. 9. */
export const ACES_VOCAB_CITES = {
  anatomy: { cite: p("7"), checked: "page" },
  command: { cite: p("8"), checked: "page" },
  icons: { cite: p("9"), checked: "page" },
  behaviour: { cite: p("11"), checked: "page" },
  target: { cite: p("12-13"), checked: "page" },
  movement: { cite: p("14"), checked: "page" },
  specialOrders: { cite: p("16-17"), checked: "page" },
  combat: { cite: p("18-19"), checked: "page" },
  combatExceptions: { cite: p("20"), checked: "page" },
  strategy: { cite: p("21"), checked: "page" },
  /** The tables below that are not tokens: value lists (p. 9), phases and letters (pp. 8, 10), zone keywords (p. 12). */
  values: { cite: p("9"), checked: "page" },
  phases: { cite: p("8, 10"), checked: "page" },
  zoneKeywords: { cite: p("12"), checked: "page" },
  letters: { cite: p("8, 10"), checked: "page" },
  specialOrderKinds: { cite: p("8, 16-17, 20"), checked: "page" },
} as const;

/** The value lists the parameters draw from, each with our label. */
export const ACES_VALUES = {
  colour: [
    { id: "red", label: "RED" },
    { id: "yellow", label: "YELLOW" },
    { id: "blue", label: "BLUE" },
  ],
  /** Qualifiers on a set of enemies; several may be combined. */
  quals: [
    { id: "moved", label: "moved", icon: "moved" },
    { id: "unmoved", label: "unmoved", icon: "unmoved" },
    { id: "in-sight", label: "visible", icon: "sight" },
    { id: "out-of-sight", label: "unseen", icon: "no-sight" },
    { id: "in-range", label: "attackable", icon: "attack-range" },
  ],
  /** Who or what a filter is measured against. */
  ref: [
    { id: "target", label: "the target" },
    { id: "ally", label: "an ally" },
    { id: "allies", label: "allies" },
    { id: "enemies", label: "enemies" },
    { id: "other-enemies", label: "other enemies" },
    { id: "moved-enemies", label: "moved enemies" },
    { id: "unmoved-enemies", label: "unmoved enemies" },
    { id: "nearest-enemy", label: "the nearest enemy" },
    { id: "nearest-moved-enemy", label: "the nearest moved enemy" },
    { id: "escape-edge", label: "the escape edge" },
    { id: "move-objective", label: "the movement objective" },
  ],
  amount: [
    { id: "most", label: "most", icon: "most" },
    { id: "fewest", label: "fewest", icon: "fewest" },
    { id: "none", label: "no" },
    { id: "all", label: "all" },
  ],
  /** Numbers read off a unit (current values, counting heat, stealth and the battle armor bonus to TMM, p. 9). */
  stat: [
    { id: "armor", label: "Armor" },
    { id: "armor-lost", label: "Armor lost" },
    { id: "starting-armor", label: "starting Armor" },
    { id: "structure", label: "Structure" },
    { id: "structure-lost", label: "Structure lost" },
    { id: "tmm", label: "TMM" },
    { id: "mv", label: "MV" },
    { id: "pv", label: "PV" },
    { id: "size", label: "Size" },
    { id: "damage-s", label: "S damage" },
    { id: "damage-m", label: "M damage" },
    { id: "damage-l", label: "L damage" },
    { id: "damage", label: "damage at the range" },
  ],
  bracket: [
    { id: "S", label: "short range" },
    { id: "M", label: "medium range" },
    { id: "L", label: "long range" },
  ],
  mode: [
    { id: "ground", label: "Ground", icon: "ground" },
    { id: "jump", label: "Jump", icon: "jump" },
    { id: "sprint", label: "Sprint", icon: "sprint" },
    { id: "standstill", label: "Standstill", icon: "standstill" },
  ],
  terrain: [
    { id: "woods", label: "woods" },
    { id: "woods-or-water", label: "woods, or water of depth 1" },
  ],
  column: [
    { id: "aggressive", label: "Aggressive" },
    { id: "balanced", label: "Balanced" },
    { id: "cautious", label: "Cautious" },
  ],
  token: [
    { id: "first", label: "Move First" },
    { id: "last", label: "Move Last" },
  ],
} as const satisfies Partial<Record<ParamKind, readonly { id: string; label: string; icon?: IconId }[]>>;

export type Colour = (typeof ACES_VALUES.colour)[number]["id"];
export type MoveMode = (typeof ACES_VALUES.mode)[number]["id"];
export type ColumnId = (typeof ACES_VALUES.column)[number]["id"];

const MOVE: CardSide[] = ["movement", "special"];
const ANY_SIDE: CardSide[] = ["movement", "combat", "command", "special"];
const KEY_SIDES: CardSide[] = ["combat", "command"];

const t = (
  id: string,
  label: string,
  group: Group,
  slots: Slot[],
  sides: CardSide[],
  resolve: Resolve,
  pages: string,
  params: ParamSpec[] = [],
  icon?: IconId,
): VocabToken => ({ id, label, group, slots, sides, params, resolve, ...(icon ? { icon } : {}), cite: p(pages), checked: "page" });

const inches: ParamSpec = { name: "inches", kind: "inches" };
const optInches: ParamSpec = { name: "inches", kind: "inches", optional: true };
const colour: ParamSpec = { name: "colour", kind: "colour" };
const quals: ParamSpec = { name: "quals", kind: "quals", optional: true };
const refOf = (...values: string[]): ParamSpec => ({ name: "ref", kind: "ref", values });
const amountOf = (...values: string[]): ParamSpec => ({ name: "amount", kind: "amount", values });

/**
 * Every token, grouped by where it goes. The `other` token in each slot carries the player's own note and is asked as a yes/no
 * (conditions) or shown as written (everything else).
 */
export const ACES_TOKENS: readonly VocabToken[] = [
  // ---- Conditions: a column's test, an "if" on a move, filter or order, a strategy row -------------------------------------
  t("ideal-moved", "the ideal {colour} has moved", "ideal", ["condition"], ANY_SIDE, "auto", "9, 11", [colour], "moved"),
  t("ideal-within", "the ideal {colour} is within {inches}", "ideal", ["condition"], ANY_SIDE, "measure", "9, 11", [colour, inches]),
  t("ideal-reach-behind", "it can get behind the ideal {colour}", "ideal", ["condition"], ANY_SIDE, "ask", "9, 11", [colour]),
  t("ideal-reach-within", "it can get within {inches} of the ideal {colour}", "ideal", ["condition"], ANY_SIDE, "ask", "9, 11", [colour, inches]),
  t("ideal-attack-unthreatened", "it can attack the ideal {colour} from outside every moved enemy's reach", "ideal", ["condition"], ANY_SIDE, "ask", "9, 11", [colour]),
  t("enemies-within", "[{atLeast} or more ][{quals} ]enemies[ within {inches}]", "enemies", ["condition"], ANY_SIDE, "measure", "9, 11", [
    quals,
    optInches,
    { name: "atLeast", kind: "count", optional: true },
  ]),
  t("no-enemies-within", "no [{quals} ]enemies[ within {inches}]", "enemies", ["condition"], ANY_SIDE, "measure", "9, 11", [quals, optInches]),
  t("allies-outnumber", "more allies than enemies within {inches}", "enemies", ["condition"], ANY_SIDE, "ask", "11", [inches]),
  t("reach-behind-nearest", "it can get behind the nearest [{quals} ]enemy", "enemies", ["condition"], ANY_SIDE, "ask", "9, 11", [quals]),
  t("armor-over-damage", "its Armor is above every enemy's damage[ within {inches}]", "this unit", ["condition"], ANY_SIDE, "measure", "11", [optInches]),
  t("damage-over-armor", "its damage is above the Armor of an enemy[ within {inches}]", "this unit", ["condition"], ANY_SIDE, "measure", "11", [optInches]),
  t("self-has-armor", "it still has Armor", "this unit", ["condition"], ANY_SIDE, "auto", "11"),
  t("self-crippled", "it is crippled", "this unit", ["condition"], ANY_SIDE, "auto", "8, 16"),
  t("self-withdrawing", "it is withdrawing", "this unit", ["condition"], ANY_SIDE, "auto", "8, 16"),
  t("self-in-terrain", "it stands in {terrain}", "this unit", ["condition"], ANY_SIDE, "ask", "9, 17", [{ name: "terrain", kind: "terrain" }]),
  t("self-sprinting", "it is sprinting", "this unit", ["condition"], ANY_SIDE, "auto", "14"),
  t("self-not-sprinting", "it is not sprinting", "this unit", ["condition"], ANY_SIDE, "auto", "14"),
  t("no-ally-indirect", "no ally has indirect fire", "force", ["condition"], ANY_SIDE, "auto", "20"),
  t("enemies-contest-objective", "enemies also head for the movement objective", "objective", ["condition"], ANY_SIDE, "ask", "17"),
  t("always", "always", "other", ["condition"], ANY_SIDE, "auto", "21"),
  t("other", "{note}", "other", ["condition", "filter", "key", "spotter", "order", "support"], ANY_SIDE, "ask", "10"),
  // ---- Strategy rows only (command card back) -------------------------------------------------------------------------------
  t("objective-complete", "our objective is complete", "force", ["strategy"], ["command"], "ask", "21"),
  t("enemy-in-our-rear", "an enemy is in the rear of one of our units", "force", ["strategy"], ["command"], "ask", "21"),
  t("enemy-without-armor", "an enemy has no Armor left", "force", ["strategy"], ["command"], "auto", "21"),
  t("lost-pv", "we lost the {amount} PV in units this turn", "force", ["strategy"], ["command"], "ask", "21", [amountOf("most", "fewest")]),
  t("force-enemy-tmm", "an enemy within {inches} of our units has TMM {tmm} or more", "force", ["strategy"], ["command"], "ask", "21", [
    inches,
    { name: "tmm", kind: "count" },
  ]),
  t("force-no-enemies", "no enemy within {inches} of our units", "force", ["strategy"], ["command"], "ask", "21", [inches]),
  // ---- Target flags ---------------------------------------------------------------------------------------------------------
  t("moved", "moved only", "target", ["target-flag"], ["movement", "special"], "auto", "12", [], "moved"),
  t("attackable", "attackable after moving", "target", ["target-flag"], ["movement", "special"], "ask", "12", [], "attack-range"),
  t("in-sight", "in sight", "target", ["target-flag"], ["movement", "special"], "measure", "9", [], "sight"),
  t("out-of-sight", "out of sight", "target", ["target-flag"], ["movement", "special"], "measure", "9", [], "no-sight"),
  t("indirect-if-none", "indirect attacks when no enemy is in its attack range", "target", ["target-flag"], ["combat"], "measure", "18, 20", [], "attack-range"),
  // ---- Movement filters (shown; the player places the miniature) ------------------------------------------------------------
  t("keep-distance", "keep {inches} from {ref}", "distance", ["filter"], MOVE, "table", "9", [inches, refOf("target", "unmoved-enemies", "enemies")], "spacing"),
  t("closer", "close on {ref}[{behind} (from behind if it can)]", "distance", ["filter"], MOVE, "table", "9", [
    refOf("target", "ally", "escape-edge", "move-objective"),
    { name: "behind", kind: "flag", optional: true },
  ], "closer"),
  t("farther", "move away from {ref}", "distance", ["filter"], MOVE, "table", "16", [refOf("nearest-enemy", "enemies")]),
  t("ally-within", "an ally within {inches}", "distance", ["filter"], MOVE, "table", "9", [inches]),
  t("clear-within", "no {ref} within {inches}", "distance", ["filter"], MOVE, "table", "9", [inches, refOf("enemies", "unmoved-enemies", "other-enemies")]),
  t("clear-bracket", "no {ref} at {bracket}", "distance", ["filter"], MOVE, "table", "9", [
    { name: "bracket", kind: "bracket" },
    refOf("enemies", "unmoved-enemies", "other-enemies"),
  ], "bracket"),
  t("sight", "sight on {ref}[, {amount} of them]", "sight", ["filter"], MOVE, "table", "9", [
    refOf("target", "enemies", "other-enemies"),
    { name: "amount", kind: "amount", optional: true, values: ["most", "fewest"] },
  ], "sight"),
  t("sight-only", "sight on {ref} and no other enemy", "sight", ["filter"], MOVE, "table", "9", [refOf("target")], "sight"),
  t("no-sight", "out of sight of {ref}", "sight", ["filter"], MOVE, "table", "9", [refOf("enemies", "unmoved-enemies", "moved-enemies")], "no-sight"),
  t("reach", "{ref} in its attack range[, {amount} of them][, at least {atLeast}]", "range", ["filter"], MOVE, "table", "9", [
    refOf("target", "enemies", "allies", "moved-enemies", "nearest-enemy", "move-objective"),
    { name: "amount", kind: "amount", optional: true, values: ["most", "fewest"] },
    { name: "atLeast", kind: "count", optional: true },
  ], "attack-range"),
  t("exposure", "inside the attack range of the {amount} {ref}", "range", ["filter"], MOVE, "table", "9", [
    amountOf("fewest", "none"),
    refOf("enemies", "moved-enemies"),
  ], "attack-range"),
  t("arcs", "inside the firing arcs of the {amount} {ref}", "range", ["filter"], MOVE, "table", "8, 16", [amountOf("fewest"), refOf("enemies")]),
  t("cover", "cover from[ {amount}] {ref}[{dry}, keeping out of water]", "cover", ["filter"], MOVE, "table", "9", [
    { name: "amount", kind: "amount", optional: true, values: ["most", "all"] },
    refOf("target", "enemies", "moved-enemies", "unmoved-enemies", "nearest-moved-enemy"),
    { name: "dry", kind: "flag", optional: true },
  ]),
  t("woods-between", "woods between it and the {amount} {ref}", "cover", ["filter"], MOVE, "table", "9", [amountOf("most"), refOf("enemies", "other-enemies")]),
  t("cover-or-woods", "cover or woods between it and the {amount} {ref}", "cover", ["filter"], MOVE, "table", "9", [amountOf("most"), refOf("enemies")]),
  t("stand-in", "stand in {terrain}", "terrain", ["filter"], MOVE, "table", "9", [{ name: "terrain", kind: "terrain" }]),
  t("elevation", "the {amount} ground it can reach[ ({mode} if needed)]", "terrain", ["filter"], MOVE, "table", "14", [
    amountOf("most", "fewest"),
    { name: "mode", kind: "mode", optional: true, values: ["jump"] },
  ]),
  t("behind", "behind {ref}", "position", ["filter"], MOVE, "table", "9", [refOf("target")]),
  t("target-bracket", "the target at {bracket}", "position", ["filter"], MOVE, "table", "9", [{ name: "bracket", kind: "bracket" }], "bracket"),
  t("target-uncovered", "the target without cover", "position", ["filter"], MOVE, "table", "9"),
  t("base-contact", "in base contact with {ref}", "position", ["filter"], MOVE, "table", "9", [refOf("target")]),
  t("escape", "leave the table by an edge[ ({mode} if needed)]", "position", ["filter"], MOVE, "table", "8, 16", [
    { name: "mode", kind: "mode", optional: true, values: ["sprint", "jump"] },
  ]),
  t("overlap", "on top of {ref}", "objective", ["filter"], MOVE, "table", "17", [refOf("move-objective")], "move-objective"),
  // ---- Keys: tie-breaks for a target, in order -------------------------------------------------------------------------------
  t("stat", "{amount} {stat}", "stat", ["key", "spotter"], [...KEY_SIDES, "special"], "auto", "9", [
    amountOf("most", "fewest"),
    { name: "stat", kind: "stat" },
  ]),
  t("template-count", "{amount} enemies under the area template", "stat", ["key"], KEY_SIDES, "ask", "8, 21", [amountOf("most", "fewest")]),
  t("colour-list", "the {colour} list", "flag", ["key"], ["combat"], "auto", "18", [colour]),
  t("destroy-objective", "the destroy objective", "flag", ["key"], KEY_SIDES, "auto", "9, 17", [], "destroy-objective"),
  t("rear", "it can hit the target's rear", "flag", ["key"], KEY_SIDES, "ask", "9, 21"),
  t("ally-attacked", "already attacked by an ally this turn", "flag", ["key"], KEY_SIDES, "auto", "18"),
  t("no-armor", "no Armor left", "flag", ["key"], KEY_SIDES, "auto", "18"),
  t("no-cover", "without cover", "flag", ["key", "spotter"], [...KEY_SIDES, "special"], "ask", "9, 20"),
  t("can-destroy", "it can destroy the target", "flag", ["key"], KEY_SIDES, "auto", "21"),
  t("anti-mech", "an anti-'Mech attack on a unit in base contact", "flag", ["key"], ["combat"], "ask", "18"),
  // ---- The indirect attack spotter list (special order) ----------------------------------------------------------------------
  t("spotter-sees", "it sees the chosen target", "sight", ["spotter"], ["special"], "measure", "20", [], "sight"),
  t("spotter-still", "immobile, or it stood still", "this unit", ["spotter"], ["special"], "auto", "20", [], "standstill"),
  t("spotter-holds", "it holds fire when its damage is below the indirect units' total", "this unit", ["spotter"], ["special"], "auto", "20"),
  // ---- Overheat rows (combat side) ---------------------------------------------------------------------------------------------
  t("destroyed", "it is destroyed this phase", "overheat", ["ov-also"], ["combat"], "auto", "19"),
  t("could-reach-structure", "OV could take the target into Structure", "overheat", ["ov-also"], ["combat"], "auto", "19"),
  t("has-heat", "it has heat", "overheat", ["ov-also"], ["combat"], "auto", "19"),
  t("ov-max", "full OV", "overheat", ["ov-action"], ["combat"], "auto", "19"),
  t("ov-up-to", "OV up to {ov}", "overheat", ["ov-action"], ["combat"], "auto", "19", [{ name: "ov", kind: "ov" }]),
  t("hold-fire", "hold fire", "overheat", ["ov-action"], ["combat"], "auto", "19"),
  // ---- Command card orders -----------------------------------------------------------------------------------------------------
  t("no-order", "no order", "order", ["order"], ["command"], "auto", "8"),
  t("initiative", "Initiative roll {n}", "order", ["order"], ["command"], "auto", "10", [{ name: "n", kind: "signed" }]),
  t("give-token", "{token} to our unit by the keys", "order", ["order"], ["command"], "auto", "8, 10", [{ name: "token", kind: "token" }]),
  t("add-filters", "put these filters first (numbered 0)", "order", ["order"], ["command"], "table", "14"),
  t("forbid-mode", "do not use {mode}", "order", ["order"], ["command"], "auto", "11", [{ name: "mode", kind: "mode" }]),
  t("force-column", "use the {column} column", "order", ["order"], ["command"], "auto", "11", [{ name: "column", kind: "column" }]),
  t("all-withdraw", "all units withdraw until the sortie ends","order", ["order"], ["command"], "auto", "8, 16"),
  t("flee", "the units flee", "order", ["order"], ["command"], "auto", "16"),
  // ---- Support spending (command card back) -------------------------------------------------------------------------------------
  t("spend-if-structure", "spend support cards only when they reach Structure", "support", ["support"], ["command"], "auto", "20-21"),
  t("spend-up-to", "spend at most {count} support cards", "support", ["support"], ["command"], "auto", "20-21", [{ name: "count", kind: "count" }]),
  t("spend-always", "spend support cards whenever able", "support", ["support"], ["command"], "auto", "20-21"),
  t("spend-never", "keep support cards", "support", ["support"], ["command"], "auto", "20-21"),
];

/** Movement modes (p. 9; Ground by default, p. 14) and the order phases a command card names (p. 8, back cover). */
export const ACES_MODES_CITE = { cite: p("9, 14"), checked: "page" } as const;
export const ACES_PHASES = [
  { id: "initiative", label: "Initiative" },
  { id: "movement", label: "Movement" },
  { id: "combat", label: "Combat" },
  { id: "end", label: "End" },
  { id: "any", label: "Any phase" },
] as const;
export type OrderPhase = (typeof ACES_PHASES)[number]["id"];

/** The zone keywords a target rule may use instead of rings (p. 12). */
export const ACES_ZONE_KEYWORDS = [
  { id: "nearest", label: "nearest" },
  { id: "any", label: "any" },
] as const;

/** Command letters and the size of a command deck (pp. 8, 10). */
export const ACES_LETTERS = ["A", "B", "C", "D", "E"] as const;
export type CommandLetter = (typeof ACES_LETTERS)[number];

/** The five special orders (pp. 8, 16-17, 20), as kinds. */
export const ACES_SPECIAL_ORDERS = [
  { id: "forced-withdrawal", label: "Forced withdrawal" },
  { id: "fleeing", label: "Fleeing" },
  { id: "movement-objective", label: "Movement objective" },
  { id: "destroy-objective", label: "Destroy objective" },
  { id: "indirect-attacks", label: "Indirect attacks" },
] as const;
export type SpecialOrderKind = (typeof ACES_SPECIAL_ORDERS)[number]["id"];

/** Cards in a behaviour deck (pp. 10, 38) and in a command deck (letters A-E, p. 10). */
export const ACES_DECK_SIZE = 6;

export const tokenById: ReadonlyMap<string, VocabToken> = new Map(ACES_TOKENS.map((tok) => [tok.id, tok]));

// ---- The resolver's words (rules/aces-resolve.ts) --------------------------------------------------------------------------------
// Questions, decision log lines and reminders are data there; their words are ours, here. `{name}` is filled from the line's own
// words (unit names, our labels); every row names the page whose rule it follows.

export interface ResolverWords {
  text: string;
  cite: string;
  checked: "page";
}

const w = (text: string, pages: string): ResolverWords => ({ text, cite: p(pages), checked: "page" });

/** What the resolver asks the players during an activation. */
export const ACES_PROMPTS = {
  distances: w("How far is each of these enemies from {unit}, in inches?", "12"),
  sight: w("Which of these enemies can {unit} see from where it stands?", "9"),
  attackable: w("Which of these could {unit} attack after moving (in sight, at a range where its damage is above 0)?", "9, 12"),
  condition: w("For {unit}, is this so: {text}?", "11"),
  key: w("Which of these fit: {text}?", "12"),
  flag: w("Which of these fit: {text}?", "12"),
  tie: w("The card does not settle it ({text}). Which one serves the automated force best?", "10, 11"),
} as const satisfies Record<string, ResolverWords>;
export type PromptId = keyof typeof ACES_PROMPTS;

/** One line of the activation's decision log. */
export const ACES_LOG = {
  "read-card": w("{unit}: this side of its card is not recorded, so read the printed card.", "7"),
  "order-column": w("The command card sets the {column} column.", "11"),
  "order-filters": w("The command card puts {count} filters first, numbered 0.", "14"),
  "order-mode": w("The command card rules out {mode}.", "11"),
  "order-other": w("The command card's order: {text}.", "8"),
  "special-column": w("{order}: the order card's column replaces the three columns.", "16"),
  "special-missing": w("{order}: the order card is not recorded, so read it.", "16"),
  "objective-filters": w("Movement objective: its filters come first, numbered 0a to 0c.", "17"),
  "objective-standstill": w("Movement objective: it stands still, so the objective's filters do not apply.", "17"),
  "condition-false": w("{column}: the condition does not hold.", "11"),
  "condition-true": w("{column}: the condition holds.", "11"),
  "column-forced": w("{column}: used without its condition.", "11"),
  "column-no-target": w("{column}: no enemy fits its target flags, so on to the next column.", "12"),
  "column-default": w("{column}: the default column.", "11"),
  ideal: w("The ideal {colour} is {target}.", "9"),
  "ideal-none": w("There is no ideal {colour}: no enemy counts.", "9"),
  "big-table": w('Only enemies within 48" count toward the ideal.', "9"),
  "no-colours": w("No command card is recorded, so the {colour} list is empty.", "12"),
  zone: w("{zone}: {units}.", "12"),
  dropped: w("Left out: {units} ({flag}).", "12"),
  "key-narrowed": w("{key}: {units}.", "12"),
  "key-ignored": w("{key}: no enemy fits, so it is passed over.", "9, 12"),
  "nested-list": w("A colour list inside a colour list is passed over.", "12"),
  "tie-chosen": w("The players chose {target} ({text}).", "10, 11"),
  target: w("Target: {target}.", "12"),
  "no-enemies": w("No enemy is in play: it holds position and counts as moving by Ground.", "16"),
  hold: w("No column finds a target: it holds position and counts as moving by Ground.", "16"),
  mode: w("It moves by {mode}.", "14"),
  "mode-alt": w("It may use {mode} if that reaches a better place.", "14"),
  "mode-alt-when": w("{mode}: its condition holds.", "14"),
  "no-jump": w("It cannot jump, so it moves by Ground.", "14"),
} as const satisfies Record<string, ResolverWords>;
export type LogId = keyof typeof ACES_LOG;

/** Shown with a movement decision. */
export const ACES_REMINDERS = {
  "no-standstill": w('Never stand still unless told: if it already stands within 1" of the best place, move it 1" to an equal place so it keeps its TMM.', "14"),
  facing: w("Face it toward the target with the target in its firing arc; if it can, no enemy in its rear and none outside its arc.", "14"),
  "face-deployment": w("Face it toward where enemies may come on.", "16"),
  flip: w("Mark how it moved and turn its top card to the combat side; a Move First or Move Last token is discarded.", "14"),
} as const satisfies Record<string, ResolverWords>;
export type ReminderId = keyof typeof ACES_REMINDERS;
