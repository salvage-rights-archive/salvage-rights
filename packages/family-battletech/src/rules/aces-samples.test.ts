import { describe, expect, it } from "vitest";
import { findings, isAcesRecord, isSample } from "./aces-card";
import type { AcesCard, CommandCard } from "./aces-card";
import { defaultDeck, isAcesGame, newAcesGame, recordedDecks } from "./aces-game";
import { acesSamples, withoutShadowedSamples } from "./aces-samples";
import { newAsUnit } from "./as-unit";
import type { AsCard } from "./as-unit";

const AT = "2026-01-01T00:00:00Z";
const samples = acesSamples(AT);
const cards = samples.filter((r): r is AcesCard => r.kind === "aces-card");
const commands = samples.filter((r): r is CommandCard => r.kind === "aces-command");
const cardOf = (role: string): AsCard => ({ ...newAsUnit("x").card, type: "BM", role, pv: 30, armor: 4, structure: 4, move: [{ inches: 6, mode: "" }] });

describe("Aces sample cards", () => {
  it("are a full set in every kind, each flagged as a sample, readable, with ids of their own and priorities inside the book's range", () => {
    expect(samples.every((r) => isAcesRecord(r) && isSample(r) && findings(r).length === 0)).toBe(true);
    expect(new Set(samples.map((r) => `${r.kind}:${r.id}`)).size).toBe(samples.length);
    expect(recordedDecks(cards)).toEqual(["Brawler", "Sniper"]);
    expect(cards.filter((c) => c.deck.role === "Brawler").map((c) => c.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(commands.map((c) => c.letter)).toEqual(["A", "B", "C", "D", "E"]);
    expect(samples.filter((r) => r.kind === "aces-order").map((r) => r.kind === "aces-order" && r.order)).toEqual(["forced-withdrawal", "fleeing", "movement-objective", "destroy-objective", "indirect-attacks"]);
    expect(samples.filter((r) => r.kind === "aces-support")).toHaveLength(2);
    const priorities = cards.flatMap((c) => [c.movement.priority, c.combat.priority]);
    expect(priorities.every((p) => p !== null && p > 0 && p < 1000)).toBe(true);
  });

  it("start a game with no cards of the player's own", () => {
    const game = newAcesGame({
      id: "g1",
      name: "Sample game",
      seed: 5,
      at: AT,
      player: { units: [{ unitId: "mine", name: "Mine", card: cardOf("Brawler"), skill: 4 }] },
      automated: { units: [{ unitId: "theirs", name: "Theirs", card: cardOf("Sniper"), skill: 4 }] },
      cards,
      commandCards: commands,
      startLetter: "A",
    });
    expect(isAcesGame(game)).toBe(true);
    expect(defaultDeck(cardOf("Sniper"), recordedDecks(cards)).status).toBe("chosen");
  });

  it("give way to a deck, commander, order or support card the player records themselves, and to nothing else", () => {
    const mine: AcesCard = { ...structuredClone(cards[0]!), id: "mine-1" };
    delete mine.sample;
    const kept = withoutShadowedSamples([...samples, mine]);
    expect(kept.filter((r) => r.kind === "aces-card" && r.deck.role === "Brawler").map((r) => r.id)).toEqual(["mine-1"]);
    expect(kept.filter((r) => r.kind === "aces-card" && r.deck.role === "Sniper")).toHaveLength(6);
    expect(kept).toHaveLength(samples.length - 5);
  });
});
