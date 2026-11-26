import { describe, expect, it } from "vitest";
import { buildDecks, canMove, cycle, flipTop, nextAutomated, nextCombat, reveal, schedule } from "./aces-deck";
import type { DeckCard, DeckState } from "./aces-deck";

// Invented cards: a role "Test Role" and its priorities are ours, not from any printed card.
const sets = (key: string, copies: number): DeckCard[] =>
  Array.from({ length: copies * 6 }, (_, i) => ({
    id: `${key}-${i}`,
    deckKey: key,
    position: (i % 6) + 1,
    movePriority: 100 + i * 10,
    combatPriority: 900 - i * 10,
  }));

const units = (n: number, key = "A") => Array.from({ length: n }, (_, i) => ({ unitId: `u${i}`, deckKey: key, pv: 20 }));
const ids = (state: DeckState, unitId: string) => state.decks.find((d) => d.unitId === unitId)!.cards.map((c) => c.id);

describe("Aces deck engine", () => {
  it("deals the same decks for the same seed and different ones for another", () => {
    const lib = sets("A", 1);
    expect(buildDecks(units(1), lib, 7)).toEqual(buildDecks(units(1), lib, 7));
    expect(ids(buildDecks(units(1), lib, 7), "u0")).not.toEqual(ids(buildDecks(units(1), lib, 8), "u0"));
  });

  it("splits a shared deck evenly with extras aside, and merged copies each draw six", () => {
    const split = buildDecks(units(4), sets("A", 1), 3);
    expect(split.decks.map((d) => d.cards.length)).toEqual([1, 1, 1, 1]);
    expect(split.aside.A).toHaveLength(2);
    const merged = buildDecks(units(2), sets("A", 3), 3);
    expect(merged.decks.map((d) => d.cards.length)).toEqual([6, 6]);
    expect(new Set(merged.decks.flatMap((d) => ids(merged, d.unitId))).size).toBe(12);
  });

  it("keeps a set order for the tutorial", () => {
    const lib = sets("A", 1);
    const order = ["A-5", "A-4", "A-3", "A-2", "A-1", "A-0"];
    expect(ids(buildDecks(units(1), lib, 1, { u0: order }), "u0")).toEqual(order);
  });

  it("reshuffles after six used cycles, and never for a unit that did not move", () => {
    const lib = sets("A", 1);
    let state = buildDecks(units(1), lib, 5);
    for (let turn = 1; turn <= 5; turn++) {
      const r = cycle(flipTop(state, "u0"), "u0");
      expect(r.reshuffled).toBe(false);
      state = r.state;
    }
    const last = cycle(flipTop(state, "u0"), "u0");
    expect(last.reshuffled).toBe(true);
    expect(last.state.decks[0]!.cards.every((c) => !c.flipped)).toBe(true);
    let still = buildDecks(units(1), lib, 5);
    for (let turn = 0; turn < 12; turn++) {
      const r = cycle(still, "u0");
      expect(r.reshuffled).toBe(false);
      still = r.state;
    }
  });

  it("re-deals a split deck together when one share is due", () => {
    let state = buildDecks(units(2), sets("A", 1), 9);
    const before = [...ids(state, "u0"), ...ids(state, "u1")].sort();
    for (let i = 0; i < 2; i++) state = cycle(flipTop(state, "u0"), "u0").state;
    const r = cycle(flipTop(state, "u0"), "u0");
    expect(r.reshuffled).toBe(true);
    expect([...ids(r.state, "u0"), ...ids(r.state, "u1")].sort()).toEqual(before);
    expect(r.state.decks.flatMap((d) => d.cards).every((c) => !c.flipped)).toBe(true);
  });

  it("picks by priority, with tokens as 000 and 1000 and withdrawal as minus 500 without tokens", () => {
    const pick = (list: Parameters<typeof nextAutomated>[0]) => nextAutomated(list);
    const base = [
      { unitId: "a", pv: 30, priority: 300 },
      { unitId: "b", pv: 30, priority: 100 },
      { unitId: "c", pv: 30, priority: 700 },
    ];
    expect(pick(base)).toEqual({ kind: "unit", unitId: "b" });
    expect(pick([{ ...base[0]!, token: "first" }, base[1]!, base[2]!])).toEqual({ kind: "unit", unitId: "a" });
    expect(pick([base[0]!, base[1]!, { ...base[2]!, token: "last" }, { unitId: "d", pv: 30, priority: 900 }])).toEqual({ kind: "unit", unitId: "b" });
    expect(pick([base[0]!, { ...base[2]!, order: "withdrawal", token: "last" }])).toEqual({ kind: "unit", unitId: "c" });
    expect(nextCombat([{ ...base[2]!, order: "withdrawal" }, base[0]!])).toEqual({ kind: "unit", unitId: "a" });
  });

  it("breaks a priority tie by lower PV, then asks the players", () => {
    const a = { unitId: "a", pv: 40, priority: 200 };
    const b = { unitId: "b", pv: 25, priority: 200 };
    expect(nextAutomated([a, b])).toEqual({ kind: "unit", unitId: "b" });
    expect(nextAutomated([a, { ...b, pv: 40 }])).toEqual({ kind: "ask", unitIds: ["a", "b"], reason: "tied" });
    expect(nextAutomated([])).toEqual({ kind: "none" });
  });

  it("front-loads unequal numbers as the printed table does, loser first", () => {
    const counts = (l: number, w: number) => schedule(l, w).map((s) => `${s.side[0]}${s.count}`).join(" ");
    expect(counts(5, 7)).toBe("l1 w2 l1 w2 l1 w1 l1 w1 l1 w1");
    expect(counts(3, 8)).toBe("l1 w3 l1 w3 l1 w2");
    expect(counts(7, 5)).toBe("l2 w1 l2 w1 l1 w1 l1 w1 l1 w1");
    expect(canMove({ transported: true })).toBe(false);
    expect(canMove({})).toBe(true);
    expect(reveal(buildDecks(units(1), sets("A", 1), 1), sets("A", 1), "u0")?.flipped).toBe(false);
  });
});
