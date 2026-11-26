import { describe, expect, it } from "vitest";
import { newAcesGame } from "./aces-game";
import type { AcesGame, GameUnit, SetupUnit } from "./aces-game";
import { manualAttackers } from "./aces-combat";
import { objectiveStats, mountUnit, releaseFromDestroyed, setObjective, transportsFor } from "./aces-special";
import { moveContext, toTable, unitCanMove } from "./aces-turn";
import { newAsUnit } from "./as-unit";
import type { AsCard } from "./as-unit";

// Every unit here is invented for the tests.
const AT = "2026-01-01T00:00:00Z";
const special = (code: string) => ({ code, values: [], raw: code });
const cardOf = (type: string, specials: string[] = [], armor = 4): AsCard => ({ ...newAsUnit("x").card, type, pv: 10, tmm: 2, armor, structure: 4, move: [{ inches: 6, mode: "" }], specials: specials.map(special) });
const unit = (name: string, type: string, specials: string[] = [], armor = 4): SetupUnit => ({ unitId: name, name, card: cardOf(type, specials, armor), skill: 4, pv: 10 });

const game = (): AcesGame => ({
  ...newAcesGame({
    id: "g",
    name: "Special test",
    seed: 1,
    at: AT,
    player: { units: [unit("Wall", "BD", [], 30), unit("Squad", "CI"), unit("Truck", "CV", ["IT"])] },
    automated: { units: [unit("Raider", "BM"), unit("Hauler", "CV", ["OMNI"]), unit("Suit", "BA", ["MEC"])] },
    cards: [],
    commandCards: [],
  }),
  phase: "movement",
});
const byName = (g: AcesGame, name: string): GameUnit => [...g.sides.player.units, ...g.sides.automated.units].find((u) => u.name === name) as GameUnit;

describe("Objectives and transports in play (Aces pp. 5, 16-17)", () => {
  it("a building that is the destroy objective gets the default stats from its construction factor, and a unit that pursues the movement objective tells the resolver unless it withdraws", () => {
    let g = setObjective(game(), byName(game(), "Wall").id, "destroyObjective", true);
    const wall = byName(g, "Wall");
    g = { ...g, sides: { ...g.sides, player: { ...g.sides.player, units: g.sides.player.units.map((u) => (u.id === wall.id ? { ...u, play: { ...u.play, armor: 12 } } : u)) } } };
    expect(objectiveStats(byName(g, "Wall"))).toMatchObject({ tmm: -4, mv: 0, damage: 0, armor: 12, structure: 12, size: 30, "armor-lost": 18 });
    expect(toTable(byName(g, "Wall"))).toMatchObject({ destroyObjective: true });
    expect(objectiveStats(byName(g, "Squad"))).toBeUndefined();

    const raider = byName(g, "Raider");
    const pursuing = setObjective(g, raider.id, "moveObjective", true);
    expect(moveContext(pursuing, byName(pursuing, "Raider"), { cards: [], commands: [], orders: [] }).moveObjective).toBe(true);
    const fleeing = { ...pursuing, sides: { ...pursuing.sides, automated: { ...pursuing.sides.automated, units: pursuing.sides.automated.units.map((u) => (u.id === raider.id ? { ...u, flags: { ...u.flags, fleeing: true as const } } : u)) } } };
    expect(moveContext(fleeing, byName(fleeing, "Raider"), { cards: [], commands: [], orders: [] }).moveObjective).toBeUndefined();
  });

  it("a mounted unit does not move, attack or count on the table, and a destroyed transport takes an IT passenger with it but sets down one riding an OMNI unit", () => {
    const g = game();
    const squad = byName(g, "Squad");
    expect(transportsFor(g, squad).map((t) => t.name)).toEqual(["Truck"]);
    let mounted = mountUnit(g, squad.id, byName(g, "Truck").id);
    expect(unitCanMove(byName(mounted, "Squad"))).toBe(false);
    expect(manualAttackers(mounted, "player").map((u) => u.name)).not.toContain("Squad");
    expect(toTable(byName(mounted, "Squad")).mounted).toBe(true);

    const dead = (m: AcesGame, name: string): AcesGame => ({ ...m, sides: { ...m.sides, player: { ...m.sides.player, units: m.sides.player.units.map((u) => (u.name === name ? { ...u, play: { ...u.play, destroyed: true } } : u)) } } });
    mounted = releaseFromDestroyed(dead(mounted, "Truck"));
    expect(byName(mounted, "Squad").play.destroyed).toBe(true);

    const riding = mountUnit(g, byName(g, "Suit").id, byName(g, "Hauler").id);
    const lost = releaseFromDestroyed({ ...riding, sides: { ...riding.sides, automated: { ...riding.sides.automated, units: riding.sides.automated.units.map((u) => (u.name === "Hauler" ? { ...u, play: { ...u.play, destroyed: true } } : u)) } } });
    expect(byName(lost, "Suit").play.destroyed).toBe(false);
    expect(byName(lost, "Suit").flags.mountedIn).toBeUndefined();

    expect(mountUnit(g, squad.id, byName(g, "Raider").id)).toBe(g);
    expect(byName(mountUnit(mountUnit(g, squad.id, byName(g, "Truck").id), squad.id, null), "Squad").flags.mountedIn).toBeUndefined();
  });
});
