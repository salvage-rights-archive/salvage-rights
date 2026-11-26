import { describe, expect, it } from "vitest";
import type { CommandCard, SupportCard } from "./aces-card";
import { combatOf, recordAttack } from "./aces-combat";
import { newAcesGame } from "./aces-game";
import type { AcesGame, SetupUnit } from "./aces-game";
import { closeSupport, emplacementAttackers, playSupport, supportPending, supportStep } from "./aces-support";
import type { TurnRecords } from "./aces-turn";
import { newAsUnit } from "./as-unit";
import type { AsCard } from "./as-unit";

// Every unit and card here is invented for the tests.
const AT = "2026-01-01T00:00:00Z";
const cardOf = (type: string, armor = 4): AsCard => ({ ...newAsUnit("x").card, type, pv: 10, tmm: 2, armor, structure: 4, move: [{ inches: 6, mode: "" }] });
const unit = (name: string, type: string): SetupUnit => ({ unitId: name, name, card: cardOf(type), skill: 4, pv: 10 });
const support = (id: string, tn: number, damage: number): SupportCard => ({ schema: 1, kind: "aces-support", id, name: id, cost: 1, tn, damage, area: false, source: { kind: "entered", at: AT } });
const command: CommandCard = {
  schema: 1,
  kind: "aces-command",
  id: "cmd",
  commander: "Test Commander",
  faction: "Test Faction",
  letter: "A",
  position: 1,
  of: 5,
  orders: [],
  colours: { red: [], yellow: [], blue: [] },
  support: { spend: { token: "spend-always" }, emplacements: { rings: [], keys: [] }, artillery: [], bsp: [] },
  strategy: [],
  source: { kind: "entered", at: AT },
};
const records: TurnRecords = { cards: [], commands: [command], orders: [], supports: [support("Strike", 8, 3)] };

const game = (): AcesGame => ({
  ...newAcesGame({
    id: "g",
    name: "Support test",
    seed: 1,
    at: AT,
    player: { units: [unit("Mine", "BM")] },
    automated: { units: [unit("Gun", "BD"), unit("Raider", "BM")] },
    cards: [],
    commandCards: [command],
    supportIds: ["Strike"],
  }),
  phase: "combat",
});

describe("The support step (Aces pp. 20-21)", () => {
  it("emplacements attack before it opens, a played card hits on its Target Number and is spent, and closing the step ends it", () => {
    let g = game();
    const gun = g.sides.automated.units[0];
    expect(emplacementAttackers(g).map((u) => u.name)).toEqual(["Gun"]);
    expect(supportPending(g)).toBe(true);
    g = recordAttack(g, { attackerId: gun?.id ?? "", kind: "none" });
    expect(emplacementAttackers(g)).toEqual([]);

    const result = supportStep(g, records);
    expect("decide" in result && result.decide.next).toEqual({ card: "Strike", target: g.sides.player.units[0]?.id });
    const target = g.sides.player.units[0]?.id ?? "";
    expect(playSupport(g, records, "Strike", target, 7).sides.player.units[0]?.play.staged).toEqual([]);
    const hit = playSupport(g, records, "Strike", target, 9);
    expect(hit.sides.player.units[0]?.play.staged).toEqual([{ damage: 3 }]);
    expect(hit.supports[0]?.used).toBe(true);
    expect(combatOf(hit).support?.resolved).toEqual([{ card: "Strike", target, hit: true }]);
    expect(playSupport(hit, records, "Strike", target, 9)).toBe(hit);
    expect(supportPending(hit)).toBe(false);
    expect(supportPending(closeSupport(g))).toBe(false);
  });
});
