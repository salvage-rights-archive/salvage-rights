import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAcesRecord } from "../../rules/aces-card";
import { isAcesGame } from "../../rules/aces-game";
import { newCampaign, newPilot } from "../../rules/aces-campaign";
import type { AcesCampaign } from "../../rules/aces-campaign";
import { newAsUnit } from "../../rules/as-unit";
import { isAsUnit } from "../as/storage";
import { isReadableCampaign, keepBoth, planCampaignImport, planExtras, readImport, toCampaignFile } from "./campaign-file";

// Invented campaign and units; no printed card.
const unit = (id: string) => ({ ...newAsUnit(id), name: { chassis: "Anvil", model: id } });
const campaign = (): AcesCampaign => ({
  ...newCampaign({ id: "c1", name: "Test run", book: "own", difficulty: "veteran", startWarchest: 600 }),
  roster: [{ unitId: "u1", name: "Anvil u1", type: "BM", pv: 40, size: 3, status: "active" }],
  pilots: [newPilot("p1", "Ash", "BM")],
  sorties: [{ number: 1, date: "2026-01-01", result: "win", recon: [], fielded: [{ unitId: "u1" }], gameId: "g1", income: 100, waypointSp: 0, rearm: 20, personnel: 0, repairs: 0, earnings: 80, shares: 0, keywords: ["PROGRESS-1"] }],
  started: { number: 2, gameId: "g2", recon: [] },
});
const through = (v: unknown) => readImport(JSON.parse(JSON.stringify(v)) as unknown, []);

describe("campaign file", () => {
  it("round trips a campaign with the units its roster uses, and plans what an import would do", () => {
    const file = toCampaignFile([campaign()], [unit("u1"), unit("other")]);
    expect(file.units.map((u) => u.id)).toEqual(["u1"]);
    const result = through(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // A game link names a game that is not on the other device, so it is left out and said so.
    expect(result.read.campaigns[0]).toMatchObject({ id: "c1", name: "Test run", ledger: [] });
    expect(result.read.campaigns[0]?.started).toBeUndefined();
    expect(result.read.campaigns[0]?.sorties[0]?.gameId).toBeUndefined();
    expect(result.read.notes).toHaveLength(1);
    const incoming = { campaigns: result.read.campaigns, units: result.read.units };
    const none = planCampaignImport(incoming, { campaigns: [], units: [] });
    expect([none.add.length, none.conflicts.length, none.addUnits.length, none.missingUnits]).toEqual([1, 0, 1, 0]);
    const changed = { ...incoming.campaigns[0], name: "Mine now" } as AcesCampaign;
    expect(planCampaignImport(incoming, { campaigns: [changed], units: incoming.units })).toMatchObject({ add: [], same: 0, addUnits: [], conflicts: [{ id: "c1" }] });
    expect(planCampaignImport(incoming, { campaigns: incoming.campaigns, units: incoming.units }).same).toBe(1);
    expect(keepBoth(incoming.campaigns[0] as AcesCampaign, "new-id")).toMatchObject({ id: "new-id", name: "Test run (imported copy)" });
  });

  it("answers a bad or hostile file with what was wrong, never a throw", () => {
    const good = JSON.parse(JSON.stringify(toCampaignFile([campaign()], [unit("u1")]))) as Record<string, unknown>;
    const wrong = (v: unknown): string => {
      const r = readImport(v, []);
      return r.ok ? "" : r.message;
    };
    expect(wrong("text")).toMatch(/not a campaign file/);
    expect(wrong({ ...good, kind: "as-unit" })).toMatch(/does not hold Aces campaigns/);
    expect(wrong({ ...good, version: 2 })).toMatch(/version/);
    expect(wrong({ ...good, campaigns: [{ ...campaign(), pilots: [{ id: "p" }] }] })).toMatch(/Campaign 1 .* damaged/);
    expect(wrong({ ...good, units: [{ id: "u1" }] })).toMatch(/Unit 1 .* damaged/);
    expect(wrong({ ...good, campaigns: Array.from({ length: 201 }, campaign) })).toMatch(/at most 200 campaigns/);
    expect(wrong({ ...good, campaigns: [{ ...campaign(), name: "x".repeat(5000) }] })).toMatch(/too large/);
    let deep: unknown = "x";
    for (let i = 0; i < 40; i += 1) deep = [deep];
    expect(wrong({ ...good, extra: deep })).toMatch(/too large/);
    expect(isReadableCampaign({ ...campaign(), difficulty: "impossible" })).toBe(false);
  });

  it("reads a BattleTech Tools backup through the same door, with units and campaign the pages can use", () => {
    const backup = {
      acesCardLibrary: { version: 1 },
      acesCampaigns: [{ id: "j1", name: "Old run", campaignBook: "", difficulty: "standard", startingWarchest: 400, roster: [{ id: "a", chassis: "Bolt", variant: "BT-2", name: "Bolt BT-2", type: "BM", size: 1, pv: 25, status: "active", mulID: 0 }], pilots: [{ id: "p", callsign: "Ash", type: "BM", unallocatedSP: 150 }], sorties: [], memorial: [] }],
    };
    const result = through(backup);
    expect(result.ok && result.read.source).toBe("jbt");
    if (!result.ok) return;
    expect(result.read.campaigns.every(isReadableCampaign)).toBe(true);
    expect(result.read.units.every(isAsUnit)).toBe(true);
    expect(result.read.notes.join(" ")).toMatch(/card library/);
    expect(through({ acesCampaigns: [] }).ok).toBe(false);
  });

  it("reads an Aces export through the same door, with cards and the game, and plans them against what is here", () => {
    const result = readImport(JSON.parse(readFileSync("packages/family-battletech/src/rules/testdata/AcesExport.json", "utf8")) as unknown, []);
    expect(result.ok && result.read.source).toBe("jbt-export");
    if (!result.ok) return;
    expect(result.read.campaigns.every(isReadableCampaign) && result.read.units.every(isAsUnit) && result.read.cards.every(isAcesRecord) && result.read.games.every(isAcesGame)).toBe(true);
    expect(result.read.notes.join(" ")).toMatch(/other entries/);
    const later = readImport(JSON.parse(readFileSync("packages/family-battletech/src/rules/testdata/AcesExport.json", "utf8")) as unknown, [], "2027-01-01T00:00:00.000Z");
    const again = later.ok ? planExtras(result.read, { cards: later.read.cards, games: later.read.games }) : planExtras({ cards: [], games: [] }, { cards: [], games: [] });
    expect([again.addCards.length, again.sameCards, again.sameGames, again.conflictCards.length]).toEqual([0, result.read.cards.length, 1, 0]);
    const changed = planExtras(result.read, { cards: [{ ...result.read.cards[0]!, note: "changed here" }], games: [] });
    expect([changed.conflictCards.length, changed.addCards.length, changed.addGames.length]).toEqual([1, result.read.cards.length - 1, 1]);
  });
});
