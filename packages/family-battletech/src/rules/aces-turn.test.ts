import { describe, expect, it } from "vitest";
import { newAcesCard } from "./aces-card";
import type { AcesCard, Column, CommandCard, Order } from "./aces-card";
import { schedule } from "./aces-deck";
import { newAcesGame } from "./aces-game";
import type { AcesGame, SetupUnit } from "./aces-game";
import { answer, step } from "./aces-resolve";
import {
  applyInitiativeOrders,
  currentStep,
  initiativeSummary,
  moveContext,
  moveInstruction,
  ordersState,
  playerMovers,
  proportionalSchedule,
  recordMoved,
  setRoll,
  startMovement,
  unitById,
  whoMovesNext,
} from "./aces-turn";
import type { TurnRecords } from "./aces-turn";
import { newAsUnit } from "./as-unit";
import type { AsCard } from "./as-unit";

// Every unit and card here is invented for the tests.
const AT = "2026-01-01T00:00:00Z";

const cardOf = (role: string, pv: number): AsCard => ({ ...newAsUnit("x").card, type: "BM", role, pv, tmm: 2, armor: 4, structure: 4, move: [{ inches: 6, mode: "" }] });
const unit = (name: string, role: string, pv: number): SetupUnit => ({ unitId: name, name, card: cardOf(role, pv), skill: 4, pv });

const nearest: Column = { target: { zone: { keyword: "nearest" }, flags: [] }, move: { mode: "ground" }, filters: [{ token: "keep-distance", params: { inches: 6, ref: "target" } }] };

/** Six cards for a role, each with the same movement priority and the three columns all choosing the nearest enemy. */
const deck = (role: string, priority: number): AcesCard[] =>
  Array.from({ length: 6 }, (_, i) => ({
    ...newAcesCard(`${role}-${String(i + 1)}`, AT),
    deck: { role },
    position: i + 1,
    movement: { priority, columns: { aggressive: nearest, balanced: nearest, cautious: nearest } },
    combat: { priority: 500 },
  }));

const keyOf = (amount: "most" | "fewest", stat: string) => ({ token: "stat", params: { amount, stat } });
const orders: Order[] = [
  { token: "initiative", phase: "initiative", params: { n: 1 } },
  { token: "give-token", phase: "initiative", params: { token: "first" }, keys: [keyOf("most", "pv")] },
  { token: "give-token", phase: "initiative", params: { token: "last" }, keys: [keyOf("fewest", "pv")] },
];
const command: CommandCard = {
  schema: 1,
  kind: "aces-command",
  id: "cmd",
  commander: "Test Commander",
  faction: "Test Faction",
  letter: "A",
  position: 1,
  of: 5,
  orders,
  colours: { red: [], yellow: [], blue: [] },
  support: { spend: { token: "spend-never" }, emplacements: { rings: [], keys: [] }, artillery: [], bsp: [] },
  strategy: [],
  source: { kind: "entered", at: AT },
};

// Role A priority 300 (PV 20), role B 100 (PV 25), role C 200 (PV 40).
const cards = [...deck("RoleA", 300), ...deck("RoleB", 100), ...deck("RoleC", 200)];
const records: TurnRecords = { cards, commands: [command], orders: [] };

const newGame = (): AcesGame => {
  const game = newAcesGame({
    id: "g",
    name: "Table test",
    seed: 3,
    at: AT,
    player: { units: [unit("M1", "Brawler", 20), unit("M2", "Brawler", 20)] },
    automated: { units: [unit("A", "RoleA", 20), unit("B", "RoleB", 25), unit("C", "RoleC", 40)], commander: 0 },
    cards,
    commandCards: [command],
  });
  return { ...game, phase: "initiative" };
};

describe("Aces Initiative and Movement", () => {
  it("a scripted turn: orders give the tokens and the modifier, the loser moves first, and the automated units act in priority order", () => {
    let game = newGame();
    const orderState = ordersState(game, records);
    expect(orderState.state).toBe("ready");
    if (orderState.state !== "ready") return;
    game = applyInitiativeOrders(game, orderState.decision);
    expect(game.tokens).toEqual({ moveFirst: "a3", moveLast: "a1" });
    game = setRoll(setRoll(game, "player", 7), "automated", 8);
    const summary = initiativeSummary(game);
    expect([summary.player.total, summary.automated.total, summary.winner]).toEqual([7, 9, "automated"]);
    game = startMovement(game, summary);

    expect(game.phase).toBe("movement");
    // The player's force lost, so it moves first: you 1, automated 2, you 1, automated 1.
    expect(game.turnState?.schedule).toEqual([
      { side: "player", count: 1 },
      { side: "automated", count: 2 },
      { side: "player", count: 1 },
      { side: "automated", count: 1 },
    ]);
    const order: string[] = [];
    for (let progress = currentStep(game); progress; progress = currentStep(game)) {
      const next = progress.force === "player" ? playerMovers(game)[0]?.id : (() => { const p = whoMovesNext(game, "automated", records); return p.kind === "unit" ? p.unitId : undefined; })();
      if (!next) break;
      order.push(next);
      game = recordMoved(game, next, "ground");
    }
    // Move First (000) goes to the highest PV (C), Move Last (1000) to the lowest (A), B moves between on its 100.
    expect(order).toEqual(["p1", "a3", "a2", "p2", "a1"]);
    expect(currentStep(game)).toBeNull();
    expect(game.tokens).toEqual({});
    expect(game.decks.decks.find((d) => d.unitId === "a3")?.cards[0]?.flipped).toBe(true);
    expect(unitById(game, "a3")?.play.moved).toEqual({ mode: "ground", tmm: 2 });
  });

  it.each([
    ["no penalty on the first turn", {}, [0, 0]],
    ["the winner of the last turn has -2", { initiative: { player: 9, automated: 4, winner: "player", turn: 1 } }, [-2, 0]],
    ["a destroyed Force Commander has -2", { destroyCommander: true }, [0, -2]],
  ] as const)("Initiative totals: %s", (_name, patch, [player, automated]) => {
    let game: AcesGame = { ...newGame(), turn: 2 };
    if ("initiative" in patch) game = { ...game, initiative: patch.initiative };
    if ("destroyCommander" in patch) game = { ...game, sides: { ...game.sides, automated: { ...game.sides.automated, units: game.sides.automated.units.map((u) => (u.id === "a1" ? { ...u, play: { ...u.play, destroyed: true } } : u)) } } };
    const s = initiativeSummary(setRoll(setRoll(game, "player", 7), "automated", 7));
    expect([s.player.total, s.automated.total]).toEqual([7 + player, 7 + automated]);
  });

  it("an activation asks for distances first and then gives the decision with its instruction", () => {
    let game = startMovement(newGame(), initiativeSummary(setRoll(setRoll(newGame(), "player", 5), "automated", 9)));
    const b = unitById(game, "a2")!;
    const first = step(moveContext(game, b, records), game.sight);
    expect("ask" in first && first.ask.kind).toBe("distances");
    if (!("ask" in first)) return;
    game = { ...game, sight: answer(game.sight, first.ask, { kind: "distances", inches: { p1: 14, p2: 9 } }) };
    const second = step(moveContext(game, b, records), game.sight);
    expect("decide" in second).toBe(true);
    if (!("decide" in second)) return;
    expect(second.decide.target).toBe("p2");
    expect(moveInstruction(second.decide, b.name, (id) => unitById(game, id)?.name ?? id)).toBe("Move B: Aggressive, target M2, Ground");
    expect(second.decide.filters.map((f) => f.number)).toEqual(["1"]);
  });

  it("front loaded and Quick-Start unequal numbers differ as the books say", () => {
    // Aces p. 6 example: 5 against 7, the loser's counts then the winner's.
    expect(schedule(5, 7).map((s) => s.count)).toEqual([1, 2, 1, 2, 1, 1, 1, 1, 1, 1]);
    // Quick-Start: 5 against 8 moves one each until the larger force has twice as many left.
    expect(proportionalSchedule(5, 8).map((s) => s.count)).toEqual([1, 1, 1, 1, 1, 2, 1, 2, 1, 2]);
  });
});
