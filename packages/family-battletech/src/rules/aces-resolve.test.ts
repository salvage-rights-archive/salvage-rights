import { describe, expect, it } from "vitest";
import { newAcesCard } from "./aces-card";
import type { AcesCard, Column, CommandCard, Order, SpecialOrderCard } from "./aces-card";
import { answer, emptySheet, logText, questionText, step } from "./aces-resolve";
import type { MoveContext, MoveDecision, Question, Reply, TableUnit } from "./aces-resolve";
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
function unit(id: string, o: { moved?: number; mv?: number; armor?: number; pv?: number; jump?: boolean } = {}): TableUnit {
  const mv = o.mv ?? 10;
  const card = asCard({ armor: o.armor ?? 5, pv: o.pv ?? 30, move: [{ inches: mv, mode: "" }, ...(o.jump ? [{ inches: mv, mode: "j" }] : [])] });
  const play = newPlayState(card);
  if (o.moved !== undefined) play.moved = { mode: o.moved === 0 ? "standstill" : "ground", tmm: o.moved };
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
}

function reply(q: Question, s: Script): Reply {
  switch (q.kind) {
    case "distances":
      return { kind: "distances", inches: s.inches ?? {} };
    case "sight":
      return { kind: "sight", seen: [] };
    case "pick-units":
      return { kind: "pick-units", picked: s.picks?.[q.key] ?? [] };
    case "yes-no":
      return { kind: "yes-no", yes: s.yes?.[q.key] ?? false };
    case "pick-one":
      return { kind: "pick-one", chosen: s.chosen ?? q.unitIds[0]! };
  }
}

/** Answers every question from the script until the resolver decides. */
function play(ctx: MoveContext, script: Script = {}): { asked: Question[]; decision: MoveDecision } {
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

const asks = (asked: Question[]) => asked.map((q) => [q.kind, "unitIds" in q ? q.unitIds : q.key]);
const texts = (d: MoveDecision) => d.log.map(logText);
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
