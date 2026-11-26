import { describe, expect, it } from "vitest";
import { newAcesCard } from "./aces-card";
import type { AcesCard, CommandCard } from "./aces-card";
import { defaultDeck, difficultyAids, isAcesGame, newAcesGame, shiftSkill, undoLast, withSnapshot } from "./aces-game";
import type { GameSetup, SetupUnit } from "./aces-game";
import { newAsUnit } from "./as-unit";
import type { AsCard, AsUnit } from "./as-unit";

// Every unit and card here is invented for the tests; no printed card.
const AT = "2026-01-01T00:00:00Z";

const cardOf = (patch: Partial<AsCard>): AsCard => ({ ...newAsUnit("x").card, type: "BM", role: "Brawler", pv: 30, armor: 4, structure: 4, move: [{ inches: 6, mode: "" }], ...patch });
const unitOf = (name: string, patch: Partial<AsCard>, skill = 4): SetupUnit => ({ unitId: name, name, card: cardOf(patch), skill });

/** A full set of six cards for a deck, as the player would have recorded them. */
const deckCards = (role: string, subtype?: string): AcesCard[] =>
  Array.from({ length: 6 }, (_, i) => ({
    ...newAcesCard(`${role}-${subtype ?? ""}-${String(i + 1)}`, AT),
    deck: { role, ...(subtype ? { subtype } : {}) },
    position: i + 1,
    movement: { priority: 100 + i },
    combat: { priority: 900 - i },
  }));

const command = (letter: CommandCard["letter"]): CommandCard =>
  ({
    schema: 1,
    kind: "aces-command",
    id: `cmd-${letter}`,
    commander: "Test Commander",
    faction: "Test Faction",
    letter,
    position: 1,
    of: 5,
    orders: [],
    colours: { red: [], yellow: [], blue: [] },
    support: { spend: { token: "other" }, emplacements: { rings: [], keys: [] }, artillery: [], bsp: [] },
    strategy: [],
    source: { kind: "entered", at: AT },
  }) as CommandCard;

const setup = (patch: Partial<GameSetup> = {}): GameSetup => ({
  id: "g1",
  name: "Test game",
  seed: 5,
  at: AT,
  player: { units: [unitOf("Mine", {})] },
  automated: { units: [unitOf("Theirs", {})] },
  cards: [...deckCards("Brawler")],
  ...patch,
});

describe("Aces game setup", () => {
  it.each([
    ["a Mech takes its role deck", { type: "BM" }, ["Brawler", "Brawler (Hover)"], "Brawler", "chosen"],
    ["a hover vehicle takes the Hover deck", { type: "CV", move: [{ inches: 12, mode: "h" }] }, ["Brawler", "Brawler (Hover)"], "Brawler (Hover)", "chosen"],
    ["a wheeled vehicle takes the Hover deck", { type: "CV", move: [{ inches: 10, mode: "w" }] }, ["Brawler (Hover)"], "Brawler (Hover)", "chosen"],
    ["battle armor takes the Infantry deck", { type: "BA", role: "Ambusher" }, ["Ambusher", "Ambusher (Infantry)"], "Ambusher (Infantry)", "chosen"],
    ["a JMPS unit takes the JMPS deck", { specials: [{ code: "JMPS", values: [], raw: "JMPS" }], role: "Skirmisher" }, ["Skirmisher", "Skirmisher (JMPS)"], "Skirmisher (JMPS)", "chosen"],
    ["a hover vehicle falls back to the role deck when the Hover deck is not recorded", { type: "CV", move: [{ inches: 12, mode: "h" }] }, ["Brawler"], "Brawler", "fallback"],
    ["nothing recorded for the role means ask", { role: "Sniper" }, ["Brawler"], null, "ask"],
    ["no role means ask", { role: null }, ["Brawler"], null, "ask"],
    ["an emplacement has no deck", { type: "BD" }, ["Brawler"], null, "none"],
  ] as const)("default deck: %s", (_name, patch, recorded, key, status) => {
    const choice = defaultDeck(cardOf(patch as Partial<AsCard>), recorded);
    expect([choice.key, choice.status]).toEqual([key, status]);
  });

  it("splits a shared deck between two hover tanks and gives the emplacement none", () => {
    const hover: Partial<AsCard> = { type: "CV", role: "Striker", move: [{ inches: 12, mode: "h" }] };
    const game = newAcesGame(
      setup({
        automated: { units: [unitOf("Tank one", hover), unitOf("Tank two", hover), unitOf("Gun post", { type: "BD", role: null, move: [] })] },
        cards: deckCards("Striker", "Hover"),
      }),
    );
    expect(game.decks.decks.map((d) => [d.unitId, d.cards.length])).toEqual([["a1", 3], ["a2", 3]]);
    const [one, two] = game.decks.decks.map((d) => d.cards.map((c) => c.id));
    expect(one!.some((id) => two!.includes(id))).toBe(false);
    expect(game.sides.automated.units.find((u) => u.name === "Gun post")?.deck).toBeUndefined();
    expect(game.sides.player.units[0]?.deck).toBeUndefined();
  });

  it("copies the card values so a roster edit does not touch the game, and the copy carries no OFFICIAL mark", () => {
    const roster: AsUnit = { ...newAsUnit("r1"), card: cardOf({ armor: 6 }), source: { kind: "mul-export", official: { book: "Master Unit List" } } };
    const unit: SetupUnit = { unitId: roster.id, name: "Rostered", card: roster.card, skill: 4 };
    const game = newAcesGame(setup({ automated: { units: [unit] } }));
    roster.card.armor = 99;
    roster.card.specials.push({ code: "ENE", values: [], raw: "ENE" });
    const copied = game.sides.automated.units[0]!;
    expect(copied.card.armor).toBe(6);
    expect(copied.card.specials).toEqual([]);
    expect(copied.play.armor).toBe(6);
    expect(JSON.stringify(game)).not.toMatch(/official/i);
  });

  it("starts on the chosen command card, sorted A-E, and the difficulty aids leave PV alone", () => {
    const game = newAcesGame(setup({ commandCards: [command("C"), command("A"), command("B")], startLetter: "B" }));
    expect(game.command).toEqual({ commander: "Test Commander", cardIds: ["cmd-A", "cmd-B", "cmd-C"], current: "cmd-B" });
    expect(difficultyAids(100, 90)).toEqual({ ratio: 90, easierPv: 80, harderPv: 120 });
    const harder = shiftSkill(game.sides.automated.units, "harder")[0]!;
    expect([harder.skill, harder.pv]).toEqual([3, game.sides.automated.units[0]!.pv]);
  });

  it("undo restores the game as it was before the change, one step at a time, keeping the last 20", () => {
    const game = newAcesGame(setup());
    const first = { ...withSnapshot(game), turn: 2 };
    const second = { ...withSnapshot(first), turn: 3 };
    const back = undoLast(second)!;
    expect(back.turn).toBe(2);
    expect(undoLast(back)?.turn).toBe(1);
    expect(undoLast(undoLast(back)!)).toBeUndefined();
    expect(isAcesGame(JSON.parse(JSON.stringify(game)))).toBe(true);
    expect(Array.from({ length: 25 }).reduce<typeof game>((g) => withSnapshot(g), game).undo).toHaveLength(20);
  });
});
