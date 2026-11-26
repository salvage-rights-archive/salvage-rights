import { describe, expect, it } from "vitest";
import { newAcesCard } from "./aces-card";
import type { AcesCard, CommandCard } from "./aces-card";
import { newAcesGame } from "./aces-game";
import type { AcesGame, SetupUnit } from "./aces-game";
import { step } from "./aces-resolve";
import { initiativeSummary, setRoll, startMovement, unitCanMove } from "./aces-turn";
import type { TurnRecords } from "./aces-turn";
import {
  addPip,
  applyEnd,
  applyStrategy,
  attackTn,
  beginAttack,
  combatContext,
  combatForce,
  combatOf,
  damageByHand,
  endCheck,
  enemiesOf,
  leaveTable,
  minimalDelivers,
  finishGame,
  nextTurn,
  previewEnd,
  recordAttack,
  setEndRoll,
  setObjectivesComplete,
  strategyContext,
  summarize,
  waypointsOn,
  weaponDamage,
  whoAttacksNext,
} from "./aces-combat";
import { newAsUnit } from "./as-unit";
import type { AsCard } from "./as-unit";

// Every unit and card here is invented for the tests.
const AT = "2026-01-01T00:00:00Z";

const cardOf = (role: string, pv: number, patch: Partial<AsCard> = {}): AsCard => ({
  ...newAsUnit("x").card,
  type: "BM",
  role,
  pv,
  tmm: 2,
  armor: 4,
  structure: 4,
  damage: { s: { value: 3 }, m: { value: 2 }, l: { value: 1 } },
  move: [{ inches: 6, mode: "" }],
  ...patch,
});
const unit = (name: string, role: string, pv: number, patch: Partial<SetupUnit> = {}, card: Partial<AsCard> = {}): SetupUnit => ({ unitId: name, name, card: cardOf(role, pv, card), skill: 4, pv, ...patch });

const deck = (role: string, combat: number): AcesCard[] =>
  Array.from({ length: 6 }, (_, i) => ({ ...newAcesCard(`${role}-${String(i + 1)}`, AT), deck: { role }, position: i + 1, movement: { priority: 100 }, combat: { priority: combat } }));

const strategyRow = (letter: "B" | "C", token: string) => ({ letter, when: { join: "all" as const, clauses: [{ token }] } });
const command = (letter: "A" | "B", strategy: CommandCard["strategy"] = []): CommandCard => ({
  schema: 1,
  kind: "aces-command",
  id: `cmd-${letter}`,
  commander: "Test Commander",
  faction: "Test Faction",
  letter,
  position: letter === "A" ? 1 : 2,
  of: 5,
  orders: [],
  colours: { red: [], yellow: [], blue: [] },
  support: { spend: { token: "spend-never" }, emplacements: { rings: [], keys: [] }, artillery: [], bsp: [] },
  strategy,
  source: { kind: "entered", at: AT },
});

// Role A fires on 300, role B on 120.
const cards = [...deck("RoleA", 300), ...deck("RoleB", 120)];
const commands = [command("A", [strategyRow("B", "enemy-without-armor")]), command("B")];
const records: TurnRecords = { cards, commands, orders: [] };

const newGame = (patch: Partial<AcesGame> = {}, player: SetupUnit[] = [unit("M1", "Brawler", 20, { edge: 2 })]): AcesGame => {
  const game = newAcesGame({
    id: "g",
    name: "Table test",
    seed: 5,
    at: AT,
    player: { units: player },
    automated: { units: [unit("A", "RoleA", 20), unit("B", "RoleB", 25)] },
    cards,
    commandCards: commands,
    rules: { forcedWithdrawal: "automated" },
    waypoints: [{ letter: "G", turn: 2 }],
  });
  // The automated force won Initiative, so the players attack first; both forces have moved.
  const decided = startMovement({ ...game, phase: "initiative" }, initiativeSummary(setRoll(setRoll(game, "player", 5), "automated", 9)));
  return { ...decided, phase: "combat", ...patch };
};

describe("Aces Combat and End Phases", () => {
  it("the side that lost Initiative attacks first, and the automated units attack in ascending combat priority", () => {
    const game = newGame();
    expect(combatForce(game)).toBe("player");
    const afterPlayer = recordAttack(game, { attackerId: "p1", kind: "none", reason: "nothing in range" });
    expect(combatForce(afterPlayer)).toBe("automated");
    const next = whoAttacksNext(afterPlayer, "automated", records);
    expect(next).toEqual({ kind: "unit", unitId: "a2" });
    const done = recordAttack(afterPlayer, { attackerId: "a2", kind: "none", reason: "x" });
    expect(whoAttacksNext(done, "automated", records)).toEqual({ kind: "unit", unitId: "a1" });
    // A unit that attacked has had its top card cycled under the deck.
    expect(done.decks.decks.find((d) => d.unitId === "a2")?.cards.at(-1)?.id).toBe(game.decks.decks.find((d) => d.unitId === "a2")?.cards[0]?.id);
  });

  it("damage is staged in the Combat Phase and applied, armor first, only in the End Phase", () => {
    let game = newGame();
    game = setEndRoll(recordAttack(game, { attackerId: "p1", targetId: "a1", kind: "weapon", tn: 6, roll: 9, hit: true, damage: 5 }), "a1", 0, 5);
    const target = () => game.sides.automated.units.find((u) => u.id === "a1")!.play;
    expect([target().armor, target().structure, target().staged]).toEqual([4, 4, [{ damage: 5 }]]);
    game = applyEnd(game);
    expect([target().armor, target().structure, target().staged]).toEqual([0, 3, []]);
    expect(game.turnState?.end?.step).toBe(3);
  });

  it("a crippled unit gets forced withdrawal when the game uses it, and a Combat Phase of heat from OV is applied with the damage", () => {
    let game = newGame();
    game = setEndRoll(recordAttack(game, { attackerId: "p1", targetId: "a1", kind: "weapon", tn: 6, roll: 10, hit: true, damage: 6, ov: 1 }), "a1", 0, 5);
    game = recordAttack(game, { attackerId: "a2", kind: "none", reason: "no target" });
    const report = previewEnd(game).find((r) => r.id === "a1");
    expect(report).toMatchObject({ newlyCrippled: true, withdraws: true });
    game = applyEnd(game);
    expect(game.sides.automated.units.find((u) => u.id === "a1")?.flags.withdrawing).toBe(true);
    expect(game.sides.player.units[0]?.flags.withdrawing).toBeUndefined();
    // M1 fired with 1 Overheat, so it ends the turn at heat 1; B made no attack and has none.
    expect(game.turnState?.end?.heat?.find((h) => h.id === "p1")).toMatchObject({ from: 0, to: 1 });
    expect(game.turnState?.end?.heat?.find((h) => h.id === "a2")).toMatchObject({ to: 0 });
  });

  it("the strategy rows change the command card, and a row that holds for a card we have not recorded says so", () => {
    let game = newGame();
    game = { ...game, sides: { ...game.sides, player: { ...game.sides.player, units: game.sides.player.units.map((u) => ({ ...u, play: { ...u.play, armor: 0 } })) } } };
    const result = step(strategyContext(game, records), game.sight);
    expect("decide" in result).toBe(true);
    if (!("decide" in result)) return;
    expect(result.decide).toMatchObject({ letter: "B", row: 0 });
    const taken = applyStrategy(game, records, result.decide);
    expect(taken.game.command.current).toBe("cmd-B");
    expect(taken.found).toBe(true);
    const missing = applyStrategy(game, { ...records, commands: [commands[0]!] }, result.decide);
    expect([missing.found, missing.game.command.current]).toEqual([false, "cmd-A"]);
  });

  it("the sortie ends at the turn limit, when a side is gone, or when the players say the objectives are done", () => {
    const base = newGame({ turnLimit: 2 });
    expect(endCheck(base).ended).toBe(false);
    expect(endCheck({ ...base, turn: 2 }).reasons.map((r) => r.id)).toEqual(["turn-limit"]);
    expect(endCheck(setObjectivesComplete(base, true)).reasons.map((r) => r.id)).toEqual(["objectives"]);
    const wiped = { ...base, sides: { ...base.sides, automated: { ...base.sides.automated, units: base.sides.automated.units.map((u) => ({ ...u, play: { ...u.play, destroyed: true } })) } } };
    expect(endCheck(wiped).reasons.map((r) => r.id)).toEqual(["empty-side"]);
    const over = finishGame(wiped, "empty-side");
    expect(over.phase).toBe("over");
    expect(summarize(over)).toMatchObject({ turns: 1, automated: { destroyed: 2, pvLost: 45, inPlay: 0 }, player: { inPlay: 1 } });
  });

  it("an Edge pip is one a Combat Phase for each pilot; the next turn calls out its waypoints, starts with nobody moved and keeps the winner for the -2", () => {
    const once = addPip(newGame(), "p1");
    expect([once.sides.player.units[0]?.edge, combatOf(once).pips]).toEqual([1, ["p1"]]);
    expect(addPip(once, "p1").sides.player.units[0]?.edge).toBe(1);
    expect(combatOf(nextTurn(once)).pips).toEqual([]);
    let game = newGame();
    game = { ...game, sides: { ...game.sides, player: { ...game.sides.player, units: game.sides.player.units.map((u) => ({ ...u, play: { ...u.play, moved: { mode: "ground" as const, tmm: 2 } } })) } } };
    expect(waypointsOn(game, 1)).toEqual([]);
    expect(waypointsOn(game, 2).map((w) => w.letter)).toEqual(["G"]);
    const next = nextTurn(game);
    expect([next.turn, next.phase, next.sides.player.units[0]?.play.moved]).toEqual([2, "initiative", null]);
    expect(initiativeSummary(setRoll(setRoll(next, "player", 7), "automated", 7)).automated.parts.map((p) => p.value)).toEqual([-2]);
  });

  it("damage entered by hand is staged for the End Phase, and a unit that left the table is out of play, not a target and counts toward a side being gone (Aces pp. 16, 20, 32)", () => {
    let game = damageByHand(newGame(), "a1", 3, true);
    expect(game.sides.automated.units[0]?.play.staged).toEqual([{ damage: 3, critCheck: true }]);
    game = leaveTable(leaveTable(game, "a1"), "a2");
    const gone = game.sides.automated.units;
    expect(gone.map((u) => [u.play.escaped, u.play.staged])).toEqual([[true, []], [true, []]]);
    expect(enemiesOf(game, game.sides.player.units[0]!)).toEqual([]);
    expect(unitCanMove(gone[0]!)).toBe(false);
    expect(endCheck(game).reasons.map((r) => r.id)).toEqual(["empty-side"]);
  });

  it("a 0* hit that rolls under 4 delivers nothing and stages no critical check, and the Edge pip is spent with the attack, not before (ASCE p. 48; Aces p. 24)", () => {
    const zero = newGame({}, [unit("M1", "Brawler", 20, { edge: 2 }, { damage: { s: { value: 0, minimal: true }, m: { value: 0 }, l: { value: 0 } } })]);
    expect(weaponDamage(zero.sides.player.units[0]!, 3, 0)).toMatchObject({ rollsMinimal: true, total: 1 });
    expect(weaponDamage(zero.sides.player.units[0]!, 3, 2)).toMatchObject({ rollsMinimal: true, ovAdds: 2, total: 3 });
    expect([minimalDelivers(3), minimalDelivers(4)]).toEqual([false, true]);
    const swing = { attackerId: "p1", targetId: "a1", kind: "weapon" as const, tn: 6, roll: 12, hit: true, natural12: true, minimalRoll: 3, damage: 0 };
    const missed = recordAttack(zero, swing);
    expect(missed.sides.automated.units[0]?.play.staged).toEqual([]);
    expect(missed.sides.player.units[0]?.edge).toBe(2);
    const pipped = recordAttack(zero, { ...swing, damage: 1, minimalRoll: 4, pip: true });
    expect(pipped.sides.automated.units[0]?.play.staged).toEqual([{ damage: 1, critCheck: true }]);
    expect(pipped.sides.player.units[0]?.edge).toBe(1);
  });

  it("the resolver is told which enemies an ally has already attacked this turn (Aces p. 18)", () => {
    const game = recordAttack(newGame(), { attackerId: "a1", targetId: "p1", kind: "weapon", tn: 6, roll: 3, hit: false });
    const seen = (id: string) => combatContext(game, game.sides.automated.units.find((u) => u.id === id)!, records).enemies[0]?.attackedByAlly;
    expect([seen("a2"), seen("a1")]).toEqual([true, undefined]);
  });

  it("an attack by hand reads the Target Number from how both units moved, and the resolver reads the terrain the players set", () => {
    let game = newGame();
    const [me, them] = [game.sides.player.units[0]!, game.sides.automated.units[0]!];
    // Skill 4, attacker moved (+0), target stood still (TMM 0), Medium range (+2).
    expect(attackTn(me, them, "weapon", 12, []).total).toBe(6);
    expect(attackTn(me, them, "weapon", 12, ["woods"]).total).toBe(7);
    expect(weaponDamage(me, 12, 1)).toMatchObject({ bracket: "M", total: 3 });
    expect(weaponDamage(me, 30, 1)).toMatchObject({ bracket: "L", ovAdds: 0, total: 1 });
    // The terrain set for one enemy reaches the resolver's table.
    game = beginAttack(game, "a1");
    const withTerrain = { ...game, turnState: { ...game.turnState!, combat: { ...combatOf(game), active: { unitId: "a1", terrain: { p1: ["woods"] } } } } };
    expect(combatContext(withTerrain, withTerrain.sides.automated.units[0]!, records).enemies[0]?.attackFlags).toEqual(["woods"]);
  });
});
