import { describe, expect, it } from "vitest";
import { newCampaign, newPilot } from "./aces-campaign";
import type { AcesCampaign, SortieRecord } from "./aces-campaign";
import { campaignLog, pilotCard, rosterSheet, sortieLogColumns } from "./aces-print";

// An invented campaign: two units, two pilots, one won sortie that earned 860 and bought a unit, and one failed sortie.
const sortie = (number: number, over: Partial<SortieRecord> = {}): SortieRecord => ({ number, date: "2026-01-02", result: "win", recon: [{ label: "Scout", sp: 30 }], fielded: [{ unitId: "u1", pilotId: "p1", commander: true }], income: 1800, waypointSp: 0, rearm: 40, personnel: 100, repairs: 800, earnings: 860, shares: 280, keywords: ["Alpha"], ...over });
const campaign = (): AcesCampaign => {
  const base = newCampaign({ id: "c", name: "Invented run", book: "own", difficulty: "veteran", startWarchest: 400 });
  const p1 = { ...newPilot("p1", "Ash", "BM"), alloc: { skill: 400, edge: 60, abilities: 60 }, abilities: ["Named by the player"] };
  return {
    ...base,
    roster: [
      { unitId: "u1", name: "Anvil AV-1", type: "BM", pv: 40, status: "active" },
      { unitId: "u2", name: "Bolt BT-2", type: "BM", pv: 30, status: "destroyed" },
    ],
    pilots: [p1, { ...newPilot("p2", "Birch", "BM"), killed: true }],
    ledger: [
      { id: "e1", label: "earnings", amount: 860, sortie: "sortie-1", kind: "earnings" },
      { id: "s1", label: "shares", amount: -280, sortie: "sortie-1", kind: "shares" },
      { id: "b1", label: "buy", amount: -1200, sortie: "sortie-1", kind: "buy" },
    ],
    sorties: [sortie(1), sortie(2, { result: "failed", earnings: 0, shares: 0, keywords: [] })],
  };
};

describe("The printed campaign sheets", () => {
  it("the roster sheet totals the ready units, names the commander and lists the lost", () => {
    const r = rosterSheet(campaign());
    expect([r.totalPv, r.commander, r.level, r.totalSpEarned]).toEqual([40, "Ash", "Veteran", 300]);
    expect(r.memorial).toEqual({ units: ["Bolt BT-2"], pilots: ["Birch"] });
    expect(r.pilots.map((p) => [p.callsign, p.skill, p.edge, p.abilities])).toEqual([["Ash", 3, 2, 1]]);
  });

  it("the campaign log carries the warchest after each sortie, and the sortie log has a column only for a won sortie", () => {
    const log = campaignLog(campaign());
    expect(log.rows.map((r) => [r.number, r.win, r.warchest, r.purchases])).toEqual([[1, true, 400 + 860 - 280 - 1200, 1200], [2, false, 400 + 860 - 280 - 1200, 0]]);
    expect(log.keywords).toEqual(["Alpha"]);
    expect(sortieLogColumns(campaign()).map((c) => [c.number, c.recon, c.expenses])).toEqual([[1, 30, 940]]);
  });

  it("a pilot card shows the thresholds of each column, which are reached, and the SP still to allocate", () => {
    const card = pilotCard(campaign().pilots[0] as AcesCampaign["pilots"][number]);
    expect(card.unallocated).toBe(-370);
    expect(card.columns.find((c) => c.id === "skill")?.steps[0]).toEqual({ value: 3, at: 400, reached: true });
    expect(card.columns.find((c) => c.id === "edge")?.steps[1]).toEqual({ value: 3, at: 120, reached: false });
  });
});
