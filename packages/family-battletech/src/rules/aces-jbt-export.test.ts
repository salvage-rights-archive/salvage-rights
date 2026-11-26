import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findings, isAcesRecord } from "./aces-card";
import type { AcesCard, CommandCard } from "./aces-card";
import { isAcesGame } from "./aces-game";
import { looksLikeJbtBackup } from "./aces-jbt";
import type { Obj } from "./aces-jbt";
import { looksLikeAcesExport, readAcesExportFile } from "./aces-jbt-export";

// The file is invented for these tests: a download of the old project's Export everything button, with made-up names and figures.
const FILE = JSON.parse(readFileSync("packages/family-battletech/src/rules/testdata/AcesExport.json", "utf8")) as Obj;
const AT = "2026-11-26T12:00:00.000Z";
const read = (file: Obj = FILE) => readAcesExportFile(file, [], AT);

describe("Aces export file from the old project", () => {
  it("is told from a plain backup by exportedAt and localStorage, and is still a backup the campaign reader takes", () => {
    expect(looksLikeAcesExport(FILE)).toBe(true);
    expect(looksLikeJbtBackup(FILE)).toBe(true);
    const { exportedAt, localStorage, ...plain } = FILE;
    expect([exportedAt, localStorage].length).toBe(2);
    expect(looksLikeAcesExport(plain)).toBe(false);
  });

  it("brings the units of the forces with their card values and marked boxes, and gives roster lines the full card by list id or by name", () => {
    const { campaigns, rest } = read();
    const anvil = rest.units.find((u) => u.name.chassis === "Anvil");
    expect(anvil).toMatchObject({ id: "jbt-u-anvil", name: { chassis: "Anvil", model: "AV-1" }, source: { ref: "9001" } });
    expect(anvil?.card).toMatchObject({ type: "BM", size: 3, pv: 40, armor: 4, structure: 4, ov: 1, role: "Brawler", move: [{ inches: 8, mode: "" }, { inches: 6, mode: "j" }], damage: { s: { value: 3 }, l: { value: 1 } } });
    expect(anvil?.card.specials.map((s) => s.code)).toEqual(["OMNI", "IF"]);
    // The roster line of a unit found in the file by list id (Anvil) or by name (Cairn, no list id) uses it; Dune is not in the file and stays a stand-in.
    const roster = campaigns.campaigns[0]?.campaign.roster.map((r) => r.unitId);
    expect(roster).toEqual(["jbt-u-anvil", "jbt-u-cairn", "jbt-camp-x-r3"]);
    expect(rest.units.map((u) => u.id)).toEqual(expect.arrayContaining(["jbt-u-anvil", "jbt-u-cairn"]));
    expect(rest.units.find((u) => u.id === "jbt-u-cairn")?.card.damage.m).toEqual({ value: 0, minimal: true });
  });

  it("makes the game in progress from the forces: marked boxes become play state, decks follow the cards the unit holds, the command card is the one on top", () => {
    const { rest } = read();
    const [game] = rest.games;
    expect(game && isAcesGame(game)).toBe(true);
    expect(game).toMatchObject({ id: "jbt-game-x", name: "Invented skirmish", turn: 3, phase: "movement", turnLimit: 6, objectives: { movement: "Reach the ridge", destroy: ["Pillbox"] }, waypoints: [{ letter: "A", turn: 4, done: false }] });
    const player = game?.sides.player.units[0];
    expect(player?.play).toMatchObject({ armor: 2, structure: 4, heat: 1, crits: { engine: 1, fireControl: 0, weapon: 0 }, moveHits: ["mp"], staged: [{ damage: 1 }] });
    const [bolt, pillbox] = game?.sides.automated.units ?? [];
    expect(bolt).toMatchObject({ deck: "Brawler", flags: { automated: true }, play: { armor: 2, moveHits: ["motive-2"] } });
    expect(pillbox?.deck).toBeUndefined();
    expect(game?.sides.automated.commanderUnitId).toBe(bolt?.id);
    expect(game?.decks.decks[0]?.cards).toEqual([{ id: "card-1", flipped: false }, { id: "card-2", flipped: false }, { id: "card-3", flipped: true }]);
    expect(game?.tokens).toEqual({ moveFirst: bolt?.id });
    expect(game?.command).toMatchObject({ commander: "Star Test", cardIds: ["cmd-a", "cmd-b"], current: "cmd-b" });
    expect(game?.rules.forcedWithdrawal).toBe("none");
    expect(rest.units.map((u) => u.id)).toEqual(expect.arrayContaining(["jbt-u-bolt", "jbt-u-pill"]));
  });

  it("turns the card library into our cards, keeping free text as the player's own words, and names what it leaves", () => {
    const { rest } = read();
    expect(rest.cards.every(isAcesRecord)).toBe(true);
    expect(rest.cards.map((r) => r.id)).toEqual(["card-1", "card-2", "card-3", "cmd-a", "cmd-b", "so-1"]);
    const card = rest.cards[0] as AcesCard;
    expect(card).toMatchObject({ deck: { role: "Brawler" }, position: 1, of: 6, note: "my card", movement: { priority: 120 }, combat: { priority: 240 } });
    expect(card.movement.columns?.aggressive).toMatchObject({
      when: { clauses: [{ token: "other", note: "an invented condition" }] },
      target: { zone: { rings: [12, 18] }, flags: ["attackable", "in-sight"], pick: "red" },
      move: { mode: "ground", alt: { mode: "jump" } },
      filters: [{ token: "other", note: "0. cover from highest enemies" }],
    });
    expect(card.combat.target?.keys).toEqual([{ token: "stat", params: { amount: "fewest", stat: "armor" } }, { token: "colour-list", params: { colour: "red" } }, { token: "other", note: "an invented judgement" }]);
    expect(card.combat.overheat).toEqual([{ tn: { test: "at-most", value: 6 }, join: "and", also: { token: "has-heat" }, action: { token: "ov-up-to", params: { ov: 2 } } }]);
    const command = rest.cards[3] as CommandCard;
    expect(command).toMatchObject({ commander: "Star Test", letter: "A", position: 1, of: 5, support: { spend: { token: "spend-if-structure" } }, strategy: [{ letter: "B", when: { clauses: [{ token: "objective-complete" }] } }, { letter: null }] });
    expect(command.orders.map((o) => o.token)).toEqual(["give-token", "force-column"]);
    // Everything converted reads under our vocabulary except where the player's own words stand in; the only findings are on those.
    expect(rest.cards.flatMap((r) => findings(r)).filter((f) => !f.problem.includes("other"))).toEqual([]);
    const left = rest.left.join(" ");
    for (const part of ["sample card", "Edge card", "sortie record", "Battlefield Support", "Who won Initiative", "game and its campaign"]) expect(left).toContain(part);
    expect(rest.left.join(" ")).toContain("could not be read");
  });

  it("reads only the Aces keys: a token-looking entry and every other localStorage entry or stray key never reaches the result", () => {
    const withStray = { ...FILE, someToken: "ghp_TOP_LEVEL_STRAY", appSettings: { uiTheme: "dark" } };
    const out = JSON.stringify(read(withStray));
    for (const secret of ["ghp_INVENTED_TOKEN_LOOKING_VALUE", "ghp_TOP_LEVEL_STRAY", "customMULGithubToken", "uiTheme", "an unrelated entry", "someOtherAppSave"]) expect(out).not.toContain(secret);
  });

  it("does not throw on parts it cannot read", () => {
    const damaged = { exportedAt: "x", localStorage: {}, acesCampaigns: [7, null], currentASForce: 5, acesGame: { automatedForce: { groups: [3] }, unitStates: "x" }, acesCardLibrary: { cards: [1, "a", { id: "x" }], commandCards: [null], specialOrders: 4 } };
    expect(() => read(damaged)).not.toThrow();
    const { rest } = read(damaged);
    expect(rest.cards).toEqual([]);
    expect(rest.left.join(" ")).toContain("could not be read");
  });
});
