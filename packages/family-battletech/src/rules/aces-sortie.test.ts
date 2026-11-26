import { describe, expect, it } from "vitest";
import { ssSortie } from "../data/aces-scouring-sands";
import { newAcesCard } from "./aces-card";
import type { AcesCard, CommandCard } from "./aces-card";
import {
  buildSortieGame,
  checkFielding,
  newCampaign,
  newPilot,
  matchOpposingUnit,
  nextSortieOffers,
  omniLines,
  pilotsForUnit,
  reconPaid,
  settleSortie,
  startSortie,
  warchest,
  opposingRows,
} from "./aces-campaign";
import type { AcesCampaign } from "./aces-campaign";
import { newAsUnit } from "./as-unit";
import type { AsUnit } from "./as-unit";

// Every unit, pilot and card here is invented for the tests.
const AT = "2026-01-01T00:00:00Z";

const asUnit = (id: string, chassis: string, model: string, patch: Partial<AsUnit["card"]> = {}): AsUnit => {
  const u = newAsUnit(id);
  return { ...u, name: { chassis, model }, card: { ...u.card, type: "BM", role: "Brawler", pv: 30, armor: 4, structure: 4, move: [{ inches: 6, mode: "" }], ...patch } };
};

const campaign = (over: Partial<AcesCampaign> = {}): AcesCampaign => ({
  ...newCampaign({ id: "c1", name: "Test run", book: "scouring-sands", difficulty: "standard", startWarchest: 400 }),
  roster: [
    { unitId: "u1", name: "Anvil AV-1", type: "BM", pv: 30, size: 3, status: "active" },
    { unitId: "u2", name: "Bolt BT-2", type: "BM", pv: 20, size: 1, status: "active" },
    { unitId: "u3", name: "Lost LS-3", type: "BM", pv: 20, size: 1, status: "destroyed" },
  ],
  pilots: [newPilot("p1", "Ash", "BM"), { ...newPilot("p2", "Birch", "BM"), wounded: true }, newPilot("p3", "Cedar", "BA")],
  ...over,
});

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
    commander: "MechWarrior",
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

describe("Starting a sortie", () => {
  it("offers sortie 1 at the start, the book's next numbers after a win, the typed number after that, and the same sortie after a failure", () => {
    const done = (over: object) => campaign({ sorties: [{ number: 1, date: "d", result: "win", recon: [], fielded: [], income: 0, waypointSp: 0, rearm: 0, personnel: 0, repairs: 0, earnings: 0, shares: 0, keywords: [], ...over }] });
    expect(nextSortieOffers(campaign())).toEqual([{ n: 1 }]);
    expect(nextSortieOffers(done({}))).toEqual([{ n: 4 }, { n: 5 }]);
    expect(nextSortieOffers(done({ next: 5 }))).toEqual([{ n: 5 }]);
    expect(nextSortieOffers(done({ result: "failed" }))).toEqual([{ n: 1 }]);
  });

  it("checks the force against the PV limit adjusted for the difficulty and the unit limits as advice, and hides pilots who cannot go", () => {
    const rookie = campaign({ difficulty: "rookie" });
    const both = [{ unitId: "u1" }, { unitId: "u2" }];
    // Sortie 1: 180 PV, +20% for a rookie campaign is 216; Anvil and Bolt are 50.
    expect(checkFielding(rookie, both, ssSortie(1)).adjusted).toBe(216);
    expect(checkFielding(rookie, both, ssSortie(1)).findings).toEqual([]);
    // Sortie 21 asks for exactly five units; sortie 13 allows six at most and 200 PV.
    expect(checkFielding(campaign(), both, ssSortie(21)).findings.map((f) => f.id)).toEqual(["exact-count"]);
    expect(checkFielding(campaign(), both, { pages: "x", player: { pv: 40 } }).findings.map((f) => f.id)).toEqual(["over-limit"]);
    // A wounded pilot, a pilot of the wrong type and one already fielded are not offered.
    expect(pilotsForUnit(rookie, "BM", []).map((p) => p.callsign)).toEqual(["Ash"]);
    expect(pilotsForUnit(rookie, "BM", ["p1"])).toEqual([]);
  });

  it("prices OMNI reconfiguration and puts the fee on the ledger, then the reconnaissance paid is read back for the expenses of the recorded sortie", () => {
    const c = campaign();
    const fees = omniLines(c, [{ unitId: "u1", omniPv: 28 }, { unitId: "u2", omniPv: 25 }]);
    expect(fees.map((f) => f.sp)).toEqual([15, 200]);
    const started = startSortie(c, { number: 2, gameId: "g1", recon: [{ label: "Reconnaissance 02-Y", sp: 60 }], omni: fees });
    expect(warchest(started)).toBe(400 - 215);
    // Starting again replaces the fees instead of charging twice.
    expect(warchest(startSortie(started, { number: 2, gameId: "g2", recon: [], omni: fees }))).toBe(400 - 215);
    const settled = settleSortie(started, { number: 2, date: "2026-01-02", units: [], primarySp: 600, otherSp: 0, recon: reconPaid(started, 2), waypointSp: 0, hired: [], shareCap: 0, keywords: [] });
    expect(settled.record.recon).toEqual([{ label: "Reconnaissance 02-Y", sp: 60 }]);
    expect(reconPaid(started, 3)).toEqual([]);
  });

  it("makes the game with the sortie's decks, its command start card, its waypoints and the link to the campaign", () => {
    const sortie = ssSortie(1)!;
    const c = campaign({ pilots: [newPilot("p1", "Ash", "BM")] });
    const names = [["Rifleman", "C 2"], ["Locust", "IIC 4"], ["Howler", "6"], ["Fulcrum", "Heavy Hovertank"]] as const;
    const theirs = names.map(([chassis, model], i) => asUnit(`t${String(i)}`, chassis, model, { role: ["Skirmisher", "Scout", "Striker", "Striker"][i] ?? null }));
    // Names match ignoring case and punctuation, and by prefix when only one unit fits; a missing or ambiguous name matches nothing.
    expect(matchOpposingUnit("RIFLEMAN  c-2", theirs)?.id).toBe("t0");
    expect(matchOpposingUnit("Howler", theirs)?.id).toBe("t2");
    expect(matchOpposingUnit("Howler", [...theirs, asUnit("x", "Howler", "7")])).toBeUndefined();
    expect(matchOpposingUnit("Bane 3", theirs)).toBeUndefined();
    const rows = opposingRows(sortie);
    const opposing = rows.map((row) => ({ row: { ...row, name: row.name }, unit: matchOpposingUnit(row.name, theirs) ?? theirs[3]! }));
    const game = buildSortieGame({
      id: "g1",
      seed: 3,
      at: AT,
      campaign: c,
      number: 1,
      sortie,
      fielded: [
        { unitId: "u1", pilotId: "p1", commander: true, unit: asUnit("m1", "Anvil", "AV-1") },
        { unitId: "u2", unit: asUnit("m2", "Bolt", "BT-2") },
      ],
      opposing,
      cards: [...deckCards("Skirmisher", "JMPS"), ...deckCards("Scout"), ...deckCards("Striker"), ...deckCards("Striker", "Hover")],
      commandCards: ["A", "B", "C", "D", "E"].map((l) => command(l as CommandCard["letter"])),
      startLetter: sortie.command.start,
      rules: { multipleAttackRolls: true, frontLoaded: true, forcedWithdrawal: sortie.withdrawal },
      waypoints: [{ letter: "F", turn: 4 }],
    });
    expect(game.campaign).toEqual({ campaignId: "c1", sortie: "1" });
    expect(game.name).toBe("Sortie 1: Meeting the Locals");
    expect(game.sides.automated.units.map((u) => [u.name, u.deck])).toEqual([
      ["Rifleman C 2", "Skirmisher (JMPS)"],
      ["Locust IIC 4", "Scout"],
      ["Howler 6", "Striker"],
      ["Fulcrum Heavy Hovertank", "Striker (Hover)"],
      ["Fulcrum Heavy Hovertank", "Striker (Hover)"],
    ]);
    expect(game.sides.automated.commanderUnitId).toBe("a1");
    expect(game.sides.player.units[0]).toMatchObject({ pilot: "Ash", skill: 4, pv: 30 });
    expect(game.command.current).toBe("cmd-A");
    expect(game.rules).toMatchObject({ forcedWithdrawal: "automated", multipleAttackRolls: true });
    expect(game.waypoints.find((w) => w.letter === "F")?.turn).toBe(4);
    expect(sortie.turns).not.toBeNull();
    expect(game.turnLimit).toBe(sortie.turns);
  });
});
