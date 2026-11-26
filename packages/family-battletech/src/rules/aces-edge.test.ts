import { describe, expect, it } from "vitest";
import { ACES_EDGE } from "../data/aces-edge";
import { newAcesGame } from "./aces-game";
import type { AcesGame, GameUnit, SetupUnit } from "./aces-game";
import { allUnits } from "./aces-turn";
import { canonicalEdgeName, edgeAbilitiesFor, edgeBlocked, edgeCostOf, findEdgeAbility, joinPilotAbilities, spendEdgeAbility, splitPilotAbilities } from "./aces-edge";
import { newAsUnit } from "./as-unit";
import type { AsCard } from "./as-unit";

// Every unit here is invented for the tests.
const AT = "2026-01-01T00:00:00Z";
const card = (patch: Partial<AsCard> = {}): AsCard => ({ ...newAsUnit("x").card, type: "BM", tmm: 2, size: 2, armor: 4, structure: 4, damage: { s: { value: 3 }, m: { value: 2 }, l: { value: 1 } }, move: [{ inches: 6, mode: "" }], ...patch });
const setup = (name: string, patch: Partial<SetupUnit> = {}, c: Partial<AsCard> = {}): SetupUnit => ({ unitId: name, name, card: card(c), skill: 4, pv: 20, ...patch });

const gameOf = (phase: AcesGame["phase"], player: SetupUnit[] = [setup("Pilot", { edge: 3 }), setup("Small", {}, { size: 1 })]): AcesGame => ({
  ...newAcesGame({ id: "g", name: "t", seed: 1, at: AT, player: { units: player }, automated: { units: [setup("Foe")] }, cards: [] }),
  phase,
});
const unitNamed = (g: AcesGame, name: string): GameUnit => allUnits(g).find((u) => u.name === name) as GameUnit;
const row = (id: string) => ACES_EDGE.find((a) => a.id === id) as (typeof ACES_EDGE)[number];

describe("Aces Edge abilities", () => {
  it("holds cards 1 to 12 once each, with unique ids", () => {
    expect(ACES_EDGE.map((a) => a.card)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(new Set(ACES_EDGE.map((a) => a.id)).size).toBe(ACES_EDGE.length);
  });

  it("offers the abilities for the unit type and phase, and every phase on request", () => {
    expect(edgeAbilitiesFor("BM", "movement").map((a) => a.id)).toEqual(["nimble", "speed-demon"]);
    expect(edgeAbilitiesFor("BM", "end").map((a) => a.id)).toEqual(["coolant-flush"]);
    expect(edgeAbilitiesFor("CV", "combat").map((a) => a.id)).toContain("bulwark");
    expect(edgeAbilitiesFor("CV", "end")).toEqual([]);
    expect(edgeAbilitiesFor("BA", "combat").map((a) => a.id)).not.toContain("cautious");
    expect(edgeAbilitiesFor("BM", "combat", true)).toHaveLength(ACES_EDGE.length);
  });

  it("works the cost out: Nimble is dearer at a printed TMM of 3, Coolant Flush is up to 2", () => {
    expect(edgeCostOf(row("nimble"), { tmm: 2 })).toBe(1);
    expect(edgeCostOf(row("nimble"), { tmm: 3 })).toBe(2);
    expect(edgeCostOf(row("nimble"), { tmm: null })).toBe(1);
    expect([1, 2, 5].map((n) => edgeCostOf(row("coolant-flush"), { tmm: 1 }, n))).toEqual([1, 2, 2]);
  });

  it("Coolant Flush takes heat off for the Edge spent, and Nimble adds 1 TMM to the recorded move", () => {
    const hot = gameOf("end");
    const heated = { ...hot, sides: { ...hot.sides, player: { ...hot.sides.player, units: hot.sides.player.units.map((u) => (u.name === "Pilot" ? { ...u, play: { ...u.play, heat: 3 } } : u)) } } };
    const pilot = unitNamed(heated, "Pilot");
    const cooled = spendEdgeAbility(heated, pilot.id, "coolant-flush", { amount: 2 });
    expect(unitNamed(cooled, "Pilot")).toMatchObject({ edge: 1, play: { heat: 1 } });
    expect(cooled.log.at(-1)?.cite).toBe("Aces Edge card 8/12");
    const moved = gameOf("movement");
    const m = { ...moved, sides: { ...moved.sides, player: { ...moved.sides.player, units: moved.sides.player.units.map((u) => (u.name === "Pilot" ? { ...u, play: { ...u.play, moved: { mode: "ground" as const, tmm: 2 } } } : u)) } } };
    expect(unitNamed(spendEdgeAbility(m, unitNamed(m, "Pilot").id, "nimble"), "Pilot")).toMatchObject({ edge: 2, play: { moved: { tmm: 3 } } });
  });

  it("Bulwark and Protector take 1 off the newest staged damage; Protector only shields a smaller friendly unit", () => {
    const g = gameOf("combat");
    const staged = { ...g, sides: { ...g.sides, player: { ...g.sides.player, units: g.sides.player.units.map((u) => ({ ...u, play: { ...u.play, staged: [{ damage: 2 }, { damage: 3 }] } })) } } };
    const pilot = unitNamed(staged, "Pilot");
    const small = unitNamed(staged, "Small");
    const bulwark = unitNamed(spendEdgeAbility(staged, pilot.id, "bulwark"), "Pilot");
    expect(bulwark.play.staged.map((h) => h.damage)).toEqual([2, 2]);
    const shield = spendEdgeAbility(staged, pilot.id, "protector", { targetId: small.id });
    expect(unitNamed(shield, "Small").play.staged.map((h) => h.damage)).toEqual([2, 2]);
    expect(unitNamed(shield, "Pilot").edge).toBe(2);
    expect(spendEdgeAbility(staged, pilot.id, "protector", { targetId: unitNamed(staged, "Foe").id })).toBe(staged);
  });

  it("refuses only what the tracker can see: no heat to flush, too little Edge", () => {
    const g = gameOf("end", [setup("Pilot", { edge: 1 })]);
    const pilot = unitNamed(g, "Pilot");
    expect(edgeBlocked(g, pilot, row("coolant-flush"))).toBe("No heat to take off.");
    expect(edgeBlocked(g, pilot, row("nimble"))).toBeUndefined();
    expect(edgeBlocked(g, { ...pilot, edge: 0 }, row("assassin"))).toMatch(/Needs 1 Edge/);
  });

  it("finds an ability by name in any case, and splits and joins a pilot's names keeping typed ones", () => {
    expect(findEdgeAbility("  MARKSMAN ")?.id).toBe("marksman");
    expect(canonicalEdgeName("coolant flush")).toBe("Coolant Flush");
    expect(canonicalEdgeName("Sixth Sense")).toBe("Sixth Sense");
    const split = splitPilotAbilities(["patient", "Sixth Sense", "Patient", "ASSASSIN"]);
    expect(split).toEqual({ ids: ["patient", "assassin"], others: ["Sixth Sense"] });
    expect(joinPilotAbilities(split.ids, split.others)).toEqual(["Assassin", "Patient", "Sixth Sense"]);
  });
});
