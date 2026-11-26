import { describe, expect, it } from "vitest";
import { newAcesCard } from "./aces-card";
import type { AcesCard, Column, CommandCard, Key, Order, OvRow, SpecialOrderCard, SupportCard } from "./aces-card";
import { answer, emptySheet, logText, questionText, step } from "./aces-resolve";
import type { CombatContext, DecisionOf, InitiativeContext, MoveContext, MoveDecision, Question, Reply, ResolveContext, StrategyContext, SupportContext, TableUnit } from "./aces-resolve";
import { newPlayState } from "./as-play";
import type { AsCard } from "./as-unit";

// Every card and unit here is invented for the tests. The rulebook's worked examples (pp. 11, 13, 16) are rebuilt by their shape
// and figures only: who has moved, how far away, which stats tie.

const AT = "2026-01-01T00:00:00Z";

const asCard = (o: Partial<AsCard> = {}): AsCard => ({
  type: "BM",
  size: 2,
  tmm: 2,
  move: [{ inches: 10, mode: "" }],
  role: null,
  pv: 30,
  damage: { s: { value: 3 }, m: { value: 3 }, l: { value: 1 } },
  ov: 1,
  armor: 5,
  structure: 4,
  specials: [],
  ...o,
});

/** A unit named after its id; `moved` is the TMM its recorded move gave (0 = it stood still). */
interface UnitOptions {
  moved?: number;
  mv?: number;
  armor?: number;
  structure?: number;
  pv?: number;
  jump?: boolean;
  type?: string;
  ov?: number;
  damage?: AsCard["damage"];
  specials?: AsCard["specials"];
  heat?: number;
  staged?: number;
}

function unit(id: string, o: UnitOptions = {}): TableUnit {
  const mv = o.mv ?? 10;
  const card = asCard({
    armor: o.armor ?? 5,
    structure: o.structure ?? 4,
    pv: o.pv ?? 30,
    move: [{ inches: mv, mode: "" }, ...(o.jump ? [{ inches: mv, mode: "j" }] : [])],
    ...(o.type ? { type: o.type } : {}),
    ...(o.ov !== undefined ? { ov: o.ov } : {}),
    ...(o.damage ? { damage: o.damage } : {}),
    ...(o.specials ? { specials: o.specials } : {}),
  });
  const play = newPlayState(card);
  if (o.moved !== undefined) play.moved = { mode: o.moved === 0 ? "standstill" : "ground", tmm: o.moved };
  if (o.heat) play.heat = o.heat;
  if (o.staged) play.staged = [{ damage: o.staged }];
  return { id, name: id.charAt(0).toUpperCase() + id.slice(1), card, play };
}

const col = (target: Column["target"], extra: Partial<Column> = {}): Column => ({ target, move: { mode: "ground" }, filters: [], ...extra });
const all = (...clauses: Column["filters"]) => ({ join: "all" as const, clauses });
const always = all({ token: "always" });

function behaviour(columns: Record<"aggressive" | "balanced" | "cautious", Column>): AcesCard {
  return { ...newAcesCard("card", AT), deck: { role: "Test Role" }, movement: { priority: 100, columns } };
}

function command(colours: Partial<CommandCard["colours"]>, orders: Order[] = []): CommandCard {
  return {
    schema: 1,
    kind: "aces-command",
    id: "cmd",
    commander: "Test Major",
    faction: "Our Militia",
    letter: "A",
    position: 1,
    of: 10,
    orders,
    colours: { red: [], yellow: [], blue: [], ...colours },
    support: { spend: { token: "spend-never" }, emplacements: { rings: [], keys: [] }, artillery: [], bsp: [] },
    strategy: [],
    source: { kind: "entered", at: AT },
  };
}

const special = (order: SpecialOrderCard["order"], extra: Partial<SpecialOrderCard>): SpecialOrderCard => ({ schema: 1, kind: "aces-order", id: order, order, source: { kind: "entered", at: AT }, ...extra });

const context = (card: AcesCard | undefined, enemies: TableUnit[], extra: Partial<MoveContext> = {}): MoveContext => ({
  phase: "movement",
  unit: unit("hound", { jump: true }),
  ...(card ? { behaviour: card } : {}),
  allies: [],
  enemies,
  ...extra,
});

interface Script {
  inches?: Record<string, number>;
  picks?: Record<string, string[]>;
  yes?: Record<string, boolean>;
  chosen?: string;
  /** Who is in sight; everyone when left out. */
  seen?: string[];
}

function reply(q: Question, s: Script): Reply {
  switch (q.kind) {
    case "distances":
      return { kind: "distances", inches: s.inches ?? {} };
    case "sight":
      return { kind: "sight", seen: s.seen ?? q.unitIds };
    case "pick-units":
      return { kind: "pick-units", picked: s.picks?.[q.key] ?? [] };
    case "yes-no":
      return { kind: "yes-no", yes: s.yes?.[q.key] ?? false };
    case "pick-one":
      return { kind: "pick-one", chosen: s.chosen ?? q.unitIds[0]! };
  }
}

/** Answers every question from the script until the resolver decides. */
function play<C extends ResolveContext>(ctx: C, script: Script = {}): { asked: Question[]; decision: DecisionOf<C> } {
  let sheet = emptySheet();
  const asked: Question[] = [];
  for (let i = 0; i < 20; i++) {
    const r = step(ctx, sheet);
    if ("decide" in r) return { asked, decision: r.decide };
    asked.push(r.ask);
    sheet = answer(sheet, r.ask, reply(r.ask, script));
  }
  throw new Error("no decision after 20 questions");
}

/** A behaviour card with only a combat side: its target rule, keys and overheat rows. */
function combatCard(rule: Column["target"], keys: CommandCard["colours"]["red"] = [], overheat: OvRow[] = []): AcesCard {
  return { ...newAcesCard("card", AT), deck: { role: "Test Role" }, combat: { priority: 100, target: { ...rule, keys }, overheat } };
}

const strike = (id: string, o: Partial<SupportCard> = {}): SupportCard => ({ schema: 1, kind: "aces-support", id, name: id, cost: 1, tn: 7, damage: 1, area: false, source: { kind: "entered", at: AT }, ...o });

const asks = (asked: Question[]) => asked.map((q) => [q.kind, "unitIds" in q ? q.unitIds : q.key]);
const texts = (d: { log: MoveDecision["log"] }) => d.log.map(logText);
const rings = (...r: number[]) => ({ rings: r });

describe("Aces movement resolver", () => {
  it("takes Balanced when the ideal BLUE has moved but cannot be got behind, then the one moved enemy in Zone 1 it can attack (pp. 11, 13)", () => {
    const card = behaviour({
      aggressive: col({ zone: rings(16, 22, 30), flags: ["moved"], pick: "blue" }, {
        when: all({ token: "ideal-moved", params: { colour: "blue" } }, { token: "ideal-reach-behind", params: { colour: "blue" } }),
      }),
      balanced: col({ zone: rings(16, 22, 30), flags: ["attackable", "moved"], pick: "blue" }, {
        when: all({ token: "ideal-moved", params: { colour: "blue" } }),
        move: { mode: "ground", alt: { mode: "jump" } },
        filters: [{ token: "sight-only", params: { ref: "target" } }, { token: "stand-in", params: { terrain: "woods" } }, { token: "cover", params: { amount: "most", ref: "enemies" } }],
      }),
      cautious: col({ zone: { keyword: "nearest" }, flags: [] }),
    });
    const blue = [{ token: "stat", params: { amount: "most", stat: "mv" } }, { token: "stat", params: { amount: "fewest", stat: "armor" } }];
    const enemies = [unit("lancer", { moved: 2, mv: 12, armor: 6 }), unit("kestrel", { moved: 2, mv: 12, armor: 3 }), unit("vole", { moved: 1, mv: 8 }), unit("brute", { mv: 6 })];
    const { asked, decision } = play(context(card, enemies, { command: command({ blue }) }), {
      inches: { lancer: 14, kestrel: 18, vole: 9, brute: 25 },
      picks: { attackable: ["lancer"] },
    });
    expect(asks(asked)).toEqual([
      ["yes-no", "yes:it can get behind the ideal BLUE:kestrel"],
      ["distances", ["lancer", "kestrel", "vole", "brute"]],
      ["pick-units", ["lancer", "vole"]],
    ]);
    expect(questionText(asked[0]!)).toBe("For Hound, is this so: it can get behind the ideal BLUE (Kestrel)?");
    expect(decision).toMatchObject({ column: "balanced", target: "lancer", ideals: { blue: "kestrel" }, mode: "ground", alt: "jump", hold: false, reminders: ["no-standstill", "facing", "flip"] });
    expect(decision.filters.map((f) => [f.number, f.text])).toEqual([
      ["1", "sight on the target and no other enemy"],
      ["2", "stand in woods"],
      ["3", "cover from most enemies"],
    ]);
    expect(texts(decision)).toEqual([
      "most MV: Lancer, Kestrel.",
      "fewest Armor: Kestrel.",
      "The ideal BLUE is Kestrel.",
      "Aggressive: the condition does not hold.",
      "Balanced: the condition holds.",
      "Left out: Brute (moved only).",
      "Left out: Vole (attackable after moving).",
      "Zone 1: Lancer.",
      "Target: Lancer.",
      "It moves by Ground.",
      "It may use Jump if that reaches a better place.",
    ]);
  });

  it("passes over an unmoved enemy in Zone 1 and breaks the Zone 2 tie by the YELLOW list, skipping an objective not in play (p. 13)", () => {
    const card = behaviour({
      aggressive: col({ zone: rings(12, 18, 24), flags: ["moved", "attackable"], pick: "yellow" }, {
        when: all({ token: "ideal-moved", params: { colour: "yellow" } }, { token: "ideal-within", params: { colour: "yellow", inches: 30 } }),
      }),
      balanced: col({ zone: { keyword: "nearest" }, flags: [] }, { when: always }),
      cautious: col({ zone: { keyword: "nearest" }, flags: [] }),
    });
    const yellow = [
      { token: "destroy-objective" },
      { token: "stat", params: { amount: "fewest", stat: "tmm" } },
      { token: "stat", params: { amount: "fewest", stat: "mv" } },
      { token: "stat", params: { amount: "most", stat: "starting-armor" } },
    ];
    const enemies = [unit("ember"), unit("crag", { moved: 1, mv: 8, armor: 6 }), unit("briar", { moved: 1, mv: 8, armor: 5 }), unit("anvil", { moved: 0, mv: 6 }), unit("dusk")];
    const { asked, decision } = play(context(card, enemies, { command: command({ yellow }) }), {
      inches: { ember: 8, crag: 15, briar: 16, anvil: 26, dusk: 20 },
      picks: { attackable: ["crag", "briar"] },
    });
    expect(asks(asked)).toEqual([
      ["distances", ["ember", "crag", "briar", "anvil", "dusk"]],
      ["pick-units", ["crag", "briar"]],
    ]);
    expect(decision).toMatchObject({ column: "aggressive", target: "crag", ideals: { yellow: "anvil" } });
    expect(texts(decision)).toEqual(
      expect.arrayContaining([
        "the destroy objective: no enemy fits, so it is passed over.",
        "fewest TMM: Ember, Anvil, Dusk.",
        "Left out: Ember, Dusk (moved only).",
        "Zone 2: Crag, Briar.",
        "most starting Armor: Crag.",
      ]),
    );
  });

  it("skips a column that takes only moved enemies when nobody has moved, before asking anything (p. 12)", () => {
    const card = behaviour({
      aggressive: col({ zone: rings(10), flags: ["moved"] }, { when: always }),
      balanced: col({ zone: { keyword: "nearest" }, flags: [] }, { when: all({ token: "self-has-armor" }) }),
      cautious: col({ zone: { keyword: "nearest" }, flags: [] }),
    });
    const first = step(context(card, [unit("ash"), unit("birch")]));
    expect("ask" in first && first.ask.kind).toBe("distances");
    expect("ask" in first && first.log.map(logText)).toEqual([
      "Aggressive: the condition holds.",
      "Left out: Ash, Birch (moved only).",
      "Aggressive: no enemy fits its target flags, so on to the next column.",
      "Balanced: the condition holds.",
    ]);
    expect(play(context(card, [unit("ash"), unit("birch")]), { inches: { ash: 9, birch: 5 } }).decision).toMatchObject({ column: "balanced", target: "birch" });
  });

  it("drops enemies it cannot attack after moving, zone by zone, asks about each enemy once, and holds as Ground when no column is left", () => {
    const unreachable = (zone: Column["target"]["zone"]) => col({ zone, flags: ["attackable"] }, { when: always });
    const card = behaviour({ aggressive: unreachable(rings(12)), balanced: unreachable({ keyword: "any" }), cautious: unreachable({ keyword: "nearest" }) });
    const { asked, decision } = play(context(card, [unit("ash", { moved: 1 }), unit("birch", { moved: 1 })]), { inches: { ash: 5, birch: 20 } });
    expect(asks(asked)).toEqual([
      ["distances", ["ash", "birch"]],
      ["pick-units", ["ash"]],
      ["pick-units", ["birch"]],
    ]);
    expect(decision).toMatchObject({ column: null, hold: true, target: null, mode: "ground", filters: [] });
    expect(texts(decision).at(-1)).toBe("No column finds a target: it holds position and counts as moving by Ground.");
  });

  it("asks the players when the colour list leaves a tie, and logs their choice (pp. 10-11)", () => {
    const card = behaviour({
      aggressive: col({ zone: rings(20), flags: [], pick: "blue" }, { when: always }),
      balanced: col({ zone: null, flags: [] }),
      cautious: col({ zone: null, flags: [] }),
    });
    const ctx = context(card, [unit("ash", { moved: 1 }), unit("birch", { moved: 1 })], { command: command({ blue: [{ token: "stat", params: { amount: "most", stat: "mv" } }] }) });
    const { asked, decision } = play(ctx, { inches: { ash: 7, birch: 11 }, chosen: "birch" });
    expect(asked.at(-1)).toMatchObject({ kind: "pick-one", unitIds: ["ash", "birch"] });
    expect(questionText(asked.at(-1)!)).toBe("The card does not settle it (the target). Which one serves the automated force best?");
    expect(decision.target).toBe("birch");
    expect(texts(decision)).toContain("The players chose Birch (the target).");
  });

  it("asks distances once, prefilled from last time, and reuses them for the 48-inch ideal and the zones (p. 9)", () => {
    const card = behaviour({
      aggressive: col({ zone: rings(12, 24), flags: [], pick: "red" }, { when: all({ token: "ideal-moved", params: { colour: "red" } }) }),
      balanced: col({ zone: null, flags: [] }),
      cautious: col({ zone: null, flags: [] }),
    });
    const enemies = [unit("near", { moved: 1, pv: 30 }), unit("far", { moved: 1, pv: 50 })];
    const ctx = context(card, enemies, { bigTable48: true, lastDistances: { near: 11, far: 70 }, command: command({ red: [{ token: "stat", params: { amount: "most", stat: "pv" } }] }) });
    const { asked, decision } = play(ctx, { inches: { near: 10, far: 60 } });
    expect(asked).toEqual([expect.objectContaining({ kind: "distances", unitIds: ["near", "far"], prefill: { near: 11, far: 70 } })]);
    expect(decision).toMatchObject({ column: "aggressive", target: "near", ideals: { red: "near" } });
  });

  it("uses the forced withdrawal column instead of the card's, by Ground when it cannot jump, and reads an order card not recorded (p. 16)", () => {
    const card = behaviour({
      aggressive: col({ zone: null, flags: [] }, { when: all({ token: "other", note: "never asked" }) }),
      balanced: col({ zone: null, flags: [] }),
      cautious: col({ zone: null, flags: [] }),
    });
    const hurt = unit("hound");
    hurt.play = { ...hurt.play, armor: 0, structure: 1 };
    const withdrawal = special("forced-withdrawal", {
      column: col({ zone: { keyword: "nearest" }, flags: [] }, {
        when: all({ token: "self-crippled" }),
        move: { mode: "jump" },
        filters: [{ token: "escape", params: { mode: "sprint" } }, { token: "closer", params: { ref: "escape-edge" } }],
      }),
    });
    const enemies = [unit("ash", { moved: 1 }), unit("birch")];
    const { asked, decision } = play(context(card, enemies, { unit: hurt, withdrawing: true, specialOrders: [withdrawal] }), { inches: { ash: 12, birch: 7 } });
    expect(asked.map((q) => q.kind)).toEqual(["distances"]);
    expect(decision).toMatchObject({ column: "forced-withdrawal", target: "birch", mode: "ground", readCard: false });
    expect(decision.filters.map((f) => f.text)).toEqual(["leave the table by an edge (Sprint if needed)", "close on the escape edge"]);
    expect(texts(decision)).toContain("It cannot jump, so it moves by Ground.");
    expect(play(context(card, enemies, { fleeing: true })).decision).toMatchObject({ column: "fleeing", readCard: true, target: null });
  });

  it("follows the command card's column, ruled-out mode and filters, after the movement objective's, which standing still drops (pp. 11, 14, 17)", () => {
    const orders: Order[] = [
      { token: "force-column", params: { column: "cautious" }, phase: "movement" },
      { token: "forbid-mode", params: { mode: "jump" }, phase: "any" },
      { token: "add-filters", phase: "movement", filters: [{ token: "ally-within", params: { inches: 6 } }] },
    ];
    const objective = special("movement-objective", {
      preFilters: [{ token: "overlap", params: { ref: "move-objective" } }, { token: "other", note: "toward the gate" }, { token: "closer", params: { ref: "move-objective" } }],
    });
    const rows: [string, Column["move"], string[], string[]][] = [
      ["moving", { mode: "ground", alt: { mode: "jump" } }, ["0a special", "0b special", "0c special", "0d command", "1 card"], ["no-standstill", "facing", "flip"]],
      ["standing still", { mode: "standstill" }, ["0 command", "1 card"], ["facing", "flip"]],
    ];
    for (const [name, move, filters, reminders] of rows) {
      const card = behaviour({
        aggressive: col({ zone: null, flags: [] }, { when: all({ token: "other", note: "never asked" }) }),
        balanced: col({ zone: null, flags: [] }, { when: always }),
        cautious: col({ zone: { keyword: "nearest" }, flags: [] }, { move, filters: [{ token: "stand-in", params: { terrain: "woods" } }] }),
      });
      const ctx = context(card, [unit("ash")], { command: command({}, orders), moveObjective: true, specialOrders: [objective] });
      const { asked, decision } = play(ctx, { inches: { ash: 9 } });
      expect(asked.map((q) => q.kind), name).toEqual(["distances"]);
      expect(decision.column, name).toBe("cautious");
      expect(decision.alt, name).toBeUndefined();
      expect(decision.filters.map((f) => `${f.number} ${f.from}`), name).toEqual(filters);
      expect(decision.reminders, name).toEqual(reminders);
    }
  });

  it("turns tokens it does not know into questions, and an unrecorded side into 'read your card', never throwing", () => {
    const card = behaviour({
      aggressive: col({ zone: null, flags: ["glows"], pick: "blue" }, { when: all({ token: "moon-phase" }) }),
      balanced: col({ zone: null, flags: [] }),
      cautious: col({ zone: null, flags: [] }),
    });
    const ctx = context(card, [unit("ash"), unit("birch")], { command: command({ blue: [{ token: "shiny" }] }) });
    const { asked, decision } = play(ctx, {
      yes: { "yes:a step we do not know (moon-phase)": true },
      picks: { "flag:a step we do not know (glows)": ["ash", "birch"], "key:a step we do not know (shiny)": ["birch"] },
    });
    expect(asks(asked)).toEqual([
      ["yes-no", "yes:a step we do not know (moon-phase)"],
      ["pick-units", ["ash", "birch"]],
      ["pick-units", ["ash", "birch"]],
    ]);
    expect(decision).toMatchObject({ column: "aggressive", target: "birch" });
    const identity = { ...newAcesCard("id-only", AT), deck: { role: "Test Role" }, movement: { priority: 120 } };
    const read = play(context(identity, [unit("ash")])).decision;
    expect(read).toMatchObject({ readCard: true, column: null, target: null });
    expect(texts(read)).toEqual(["Hound: this side of its card is not recorded, so read the printed card."]);
  });
});

// ---- Combat and command (pp. 10, 18-21) -----------------------------------------------------------------------------------------
// Ranges: Short to 6", Medium to 24", Long to 42". The attacker (Hound) has Skill 4 and damage 3/3/1, so a target at Medium that
// stood still needs 6 and each point of its TMM adds 1.

const fight = (card: AcesCard | undefined, enemies: TableUnit[], extra: Partial<CombatContext> = {}): CombatContext => ({
  phase: "combat",
  unit: unit("hound"),
  ...(card ? { behaviour: card } : {}),
  allies: [],
  enemies,
  ...extra,
});
const anyZone = { zone: { keyword: "any" as const }, flags: [] };
const stat = (amount: "most" | "fewest", id: string) => ({ token: "stat", params: { amount, stat: id } });
const iff = [{ code: "IF", values: ["2"], raw: "IF2" }];

describe("Aces combat and command resolver", () => {
  it("ignores a target that needs 13 or more and one staged damage already destroys, takes the closest of a tie, and repeats the choice (p. 18)", () => {
    const card = combatCard({ zone: rings(10, 24), flags: [] });
    const enemies = [unit("ghost", { moved: 7 }), unit("husk", { staged: 9 }), unit("pawn", { moved: 1 })];
    const { decision } = play(fight(card, enemies), { inches: { ghost: 8, husk: 5, pawn: 9 } });
    expect(decision).toMatchObject({ attack: "weapon", target: "pawn", ov: 0, tn: { total: 7 } });
    expect(texts(decision)).toEqual(
      expect.arrayContaining([
        "Left out: Husk (already enough damage to be destroyed).",
        "Still tied after the keys: the closest is taken (Ghost).",
        "Ghost: Target Number 13, 13 or more, so that target is ignored and the choice repeats.",
        "Target: Pawn, Target Number 7.",
      ]),
    );
  });

  it("narrows by the can-destroy, ally-attacked and no-armor keys, then by the closest (pp. 18, 21)", () => {
    const attacked = { ...unit("tagged"), attackedByAlly: true as const };
    const rows: [string, Key[], TableUnit[], Record<string, number>, string][] = [
      ["no armor", [{ token: "no-armor" }], [unit("full"), unit("bare", { armor: 0 })], { full: 10, bare: 12 }, "bare"],
      ["ally attacked", [{ token: "ally-attacked" }], [unit("clean"), attacked], { clean: 10, tagged: 12 }, "tagged"],
      ["can destroy", [{ token: "can-destroy" }], [unit("tough"), unit("frail", { armor: 1, structure: 1 })], { tough: 10, frail: 12 }, "frail"],
      ["no key", [], [unit("far"), unit("near")], { far: 14, near: 10 }, "near"],
    ];
    for (const [name, keys, enemies, inches, target] of rows) {
      expect(play(fight(combatCard(anyZone, keys), enemies), { inches }).decision.target, name).toBe(target);
    }
  });

  it("takes the first overheat row that applies: full, up to N, or hold, and all the OV once it is destroyed this phase (p. 19)", () => {
    const rowsOf: OvRow[] = [
      { tn: { test: "at-most", value: 6 }, action: { token: "ov-max" } },
      { tn: { test: "at-most", value: 8 }, join: "and", also: { token: "could-reach-structure" }, action: { token: "ov-up-to", params: { ov: 1 } } },
      { action: { token: "hold-fire" } },
    ];
    const rows: [string, UnitOptions, UnitOptions, Record<string, unknown>][] = [
      ["TN 6 takes full OV", {}, { moved: 0 }, { attack: "weapon", ov: 2 }],
      ["TN 8 and the OV could reach Structure", {}, { moved: 2, armor: 4 }, { attack: "weapon", ov: 1 }],
      ["TN 8 but Armor 5 still holds", {}, { moved: 2 }, { attack: "none", reason: "hold-fire" }],
      ["TN 10 holds fire", {}, { moved: 4 }, { attack: "none", reason: "hold-fire" }],
      ["destroyed this phase ignores the rows", { staged: 9 }, { moved: 4 }, { attack: "weapon", ov: 2 }],
    ];
    for (const [name, attacker, target, expected] of rows) {
      const ctx = fight(combatCard(anyZone, [], rowsOf), [unit("mark", target)], { unit: unit("hound", { ov: 2, ...attacker }) });
      expect(play(ctx, { inches: { mark: 10 } }).decision, name).toMatchObject(expected);
    }
  });

  it("never uses OV that would shut it down, makes no weapon attack at Move 0 from heat or when shut down, and ignores the rows for units without heat (p. 19)", () => {
    const rows: [string, UnitOptions, Record<string, unknown>][] = [
      ["heat 2 leaves room for 1", { ov: 3, heat: 2 }, { attack: "weapon", ov: 1 }],
      ["Move 0 from heat", { mv: 4, heat: 2 }, { attack: "none", reason: "heat" }],
    ];
    const card = combatCard(anyZone, [], [{ action: { token: "ov-max" } }]);
    for (const [name, attacker, expected] of rows) {
      expect(play(fight(card, [unit("mark")], { unit: unit("hound", attacker) }), { inches: { mark: 10 } }).decision, name).toMatchObject(expected);
    }
    const down = unit("hound");
    down.play.shutdown = true;
    expect(play(fight(card, [unit("mark")], { unit: down })).decision).toMatchObject({ attack: "none", reason: "shutdown" });
    const hold = combatCard(anyZone, [], [{ action: { token: "hold-fire" } }]);
    expect(play(fight(hold, [unit("mark")], { unit: unit("hound", { type: "CV" }) }), { inches: { mark: 10 } }).decision).toMatchObject({ attack: "weapon", ov: 0 });
  });

  it("attacks physically only from base contact, when weapons cannot reach, physical damage is higher, or it has a Fire Control hit or heat (p. 20)", () => {
    const sized = (size: number): TableUnit => {
      const u = unit("hound");
      return { ...u, card: { ...u.card, size } };
    };
    const noGuns = unit("hound", { damage: { s: { value: 0 }, m: { value: 0 }, l: { value: 0 } } });
    const jammed = unit("hound");
    jammed.play.crits.fireControl = 1;
    const rows: [string, TableUnit, number, Record<string, unknown>][] = [
      ["weapons cannot reach", noGuns, 0, { attack: "physical", physical: "standard" }],
      ["physical damage is higher", sized(4), 0, { attack: "physical" }],
      ["Fire Control hit", jammed, 0, { attack: "physical" }],
      ["heat", unit("hound", { heat: 1 }), 0, { attack: "physical" }],
      ["nothing in favour", unit("hound"), 0, { attack: "weapon" }],
      ["not in base contact", unit("hound", { heat: 1 }), 1, { attack: "weapon" }],
    ];
    for (const [name, attacker, distance, expected] of rows) {
      expect(play(fight(combatCard(anyZone), [unit("mark")], { unit: attacker }), { inches: { mark: distance } }).decision, name).toMatchObject(expected);
    }
  });

  it("falls back to the indirect target and spotter when no enemy is in its attack range, adding no OV, and not when something is in range (pp. 18, 20)", () => {
    const blank = { s: { value: 0 }, m: { value: 0 }, l: { value: 0 } };
    const card = combatCard({ zone: null, flags: ["indirect-if-none"] }, [], [{ action: { token: "ov-max" } }]);
    const eye = unit("eye", { moved: 0 });
    const lobber = (o: UnitOptions = {}) => unit("lobber", { damage: blank, specials: iff, ov: 2, ...o });
    const ctx = (extra: Partial<CombatContext>, enemy = unit("far", { moved: 1 })) => fight(card, [enemy], { unit: lobber(), allies: [eye], ...extra });
    const prepared = { indirect: { target: "far", spotter: "eye" } };
    const inRange = { s: { value: 1 }, m: { value: 1 }, l: { value: 1 } };
    const rows: [string, CombatContext, Record<string, unknown>][] = [
      ["prepared target", ctx(prepared), { attack: "indirect", target: "far", ov: 0, damage: 2, tn: { total: 9 } }],
      ["target already destroyed", ctx(prepared, unit("far", { moved: 1, staged: 9 })), { attack: "none", reason: "indirect-destroyed" }],
      ["nothing prepared", ctx({}), { attack: "none", reason: "indirect-unprepared" }],
      ["no IF special", ctx({ ...prepared, unit: lobber({ specials: [] }) }), { attack: "none", reason: "no-target" }],
      ["an enemy in range comes first", ctx({ ...prepared, unit: lobber({ damage: inRange }) }), { attack: "weapon", target: "far" }],
    ];
    for (const [name, c, expected] of rows) expect(play(c, { inches: { far: 30 } }).decision, name).toMatchObject(expected);
  });

  it("makes an emplacement use the command card zone and keys, with its -1 to hit counted once (pp. 6, 20)", () => {
    const gun = unit("gun", { type: "BD", specials: [{ code: "IMMOBILE", values: [], raw: "IMMOBILE" }] });
    const cmd = { ...command({}), support: { ...command({}).support, emplacements: { rings: [8], keys: [stat("fewest", "armor")] } } };
    const enemies = [unit("knight", { armor: 1, moved: 1 }), unit("pike", { moved: 1 }), unit("rook", { armor: 3, moved: 1 })];
    const { decision } = play(fight(undefined, enemies, { unit: gun, command: cmd }), { inches: { knight: 20, pike: 7, rook: 5 } });
    expect(decision).toMatchObject({ attack: "weapon", target: "rook", ov: 0, tn: { total: 4 } });
    expect(decision.tn?.parts.filter((p) => p.value < 0)).toEqual([expect.objectContaining({ label: "Emplacement attacking", value: -1 })]);
  });

  it("gives the Initiative modifier and the Move Last and Move First tokens by their keys among units that may hold them (pp. 8, 10)", () => {
    const dmg = (m: number) => ({ s: { value: 3 }, m: { value: m }, l: { value: 1 } });
    const orders: Order[] = [
      { token: "initiative", params: { n: -1 }, phase: "initiative" },
      { token: "give-token", params: { token: "last" }, phase: "initiative", keys: [stat("most", "damage-m"), stat("most", "pv")] },
      { token: "give-token", params: { token: "first" }, phase: "initiative", keys: [stat("fewest", "armor")] },
    ];
    const allies = [unit("a", { armor: 3, damage: dmg(3) }), unit("b", { damage: dmg(5) }), { ...unit("c", { damage: dmg(9) }), withdrawing: true as const }, unit("d", { damage: dmg(5), pv: 40 })];
    const ctx: InitiativeContext = { phase: "initiative", command: command({}, orders), allies, enemies: [] };
    const { asked, decision } = play(ctx);
    expect(asked).toEqual([]);
    expect(decision).toMatchObject({ modifier: -1, tokens: { last: "d", first: "a" }, withdraw: false });
    expect(texts(decision)).toEqual([
      "The command card changes the Initiative roll by -1.",
      "most M damage: B, D.",
      "most PV: D.",
      "Move Last goes to D.",
      "fewest Armor: A.",
      "Move First goes to A.",
    ]);
  });

  it("plays support cards from the lowest Target Number, only while they reach Structure, counting the cards already hit (p. 21 example)", () => {
    const wounded = (id: string, start: number, left: number) => {
      const u = unit(id, { armor: start });
      u.play.armor = left;
      return u;
    };
    const enemies = [wounded("atlas", 7, 6), wounded("pouncer", 4, 4), wounded("locust", 4, 1), wounded("hawk", 5, 3)];
    const cmd = { ...command({}), support: { ...command({}).support, spend: { token: "spend-if-structure" }, bsp: [stat("most", "armor-lost"), { token: "template-count", params: { amount: "most" } }, stat("fewest", "structure")] } };
    const supports = [strike("rattler", { tn: 7, damage: 1, area: true }), strike("hammer", { tn: 6, damage: 2 })];
    const ctx = (resolved: SupportContext["resolved"]): SupportContext => ({ phase: "support", command: cmd, allies: [], enemies, supports, ...(resolved ? { resolved } : {}) });
    const rows: [string, SupportContext["resolved"], Record<string, unknown>][] = [
      ["first the Target Number 6 card, on the unit with the most Armor lost", undefined, { next: { card: "hammer", target: "locust" } }],
      ["after it hits, 1 damage also reaches Structure", [{ card: "hammer", target: "locust", hit: true }], { next: { card: "rattler", target: "locust" } }],
      ["after it misses, the second is kept", [{ card: "hammer", target: "locust", hit: false }], { next: null, saved: [{ card: "rattler", why: "it would not reach the target's Structure" }] }],
      ["both played", [{ card: "hammer", target: "locust", hit: true }, { card: "rattler", target: "locust", hit: true }], { next: null, saved: [] }],
    ];
    for (const [name, resolved, expected] of rows) expect(play(ctx(resolved)).decision, name).toMatchObject(expected);
  });

  it("reads the strategy rows top to bottom and takes the first that holds, or keeps the card when none does (p. 21)", () => {
    const row = (letter: "B" | "C" | "D" | "E", token: string, params?: Record<string, string>) => ({ letter, when: all(params ? { token, params } : { token }) });
    const cmd = { ...command({}), strategy: [row("E", "objective-complete"), row("D", "enemy-in-our-rear"), row("B", "enemy-without-armor"), row("C", "lost-pv", { amount: "most" })] };
    const ctx = (enemies: TableUnit[]): StrategyContext => ({ phase: "strategy", command: cmd, allies: [], enemies });
    const stripped = play(ctx([unit("ash"), unit("birch", { armor: 0 })]));
    expect(stripped.decision).toMatchObject({ letter: "B", row: 2 });
    expect(stripped.asked.map((q) => q.key)).toEqual(["yes:our objective is complete", "yes:an enemy is in the rear of one of our units"]);
    const none = play(ctx([unit("ash")]));
    expect(none.decision).toMatchObject({ letter: null, row: null });
    expect(none.asked).toHaveLength(3);
    expect(texts(none.decision)).toContain("No strategy row holds: the card stays for another turn.");
  });
});
