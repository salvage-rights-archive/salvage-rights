import { describe, expect, it } from "vitest";
import {
  adjustedPvLimit,
  allocationFindings,
  columnValue,
  eligiblePilots,
  existingForcePercent,
  existingForceSetup,
  forceFindings,
  hirePilot,
  newCampaign,
  newPilot,
  nextUnlock,
  omniCost,
  pilotCountFindings,
  pilotStats,
  purchaseUnit,
  sellUnit,
  startingWarchest,
  warchest,
  type ForceUnit,
} from "./aces-campaign";

// Invented pilots and units; the figures are the rulebook's, and the worked examples are used by value.
const campaign = (over = {}) => ({ ...newCampaign({ id: "c1", name: "Test run", book: "own", difficulty: "standard", startWarchest: 400 }), ...over });
const unit = (name: string, type: string, chassis: string, variant: string, pv: number): ForceUnit => ({ name, type, chassis, variant, pv });

describe("Named pilot thresholds (p. 27)", () => {
  it("shows each stat at the edges of its SP column, and what the next unlock needs", () => {
    const rows: [Parameters<typeof columnValue>[0], number, number][] = [
      ["skill", 399, 4], ["skill", 400, 3], ["skill", 3399, 1], ["skill", 3400, 0],
      ["edge", 0, 1], ["edge", 59, 1], ["edge", 60, 2], ["edge", 1100, 10], ["edge", 5000, 10],
      ["abilities", 59, 0], ["abilities", 100, 1], ["abilities", 180, 2], ["abilities", 900, 5],
    ];
    for (const [col, sp, stat] of rows) expect(columnValue(col, sp), `${col} ${sp}`).toBe(stat);
    // p. 35 and p. 29 examples: 100 in abilities gives 1 and 80 more gives 2; a Skill 4 pilot with 150 in Skill needs 250 more.
    expect(nextUnlock("abilities", 100)).toEqual({ value: 2, at: 180, more: 80 });
    expect(nextUnlock("skill", 150)).toEqual({ value: 3, at: 400, more: 250 });
    expect(nextUnlock("edge", 1100)).toBeNull();
  });

  it("makes the player allocate every SP, and the abilities list fit the count", () => {
    const pilot = { ...newPilot("p1", "Ember", "BM"), alloc: { skill: 0, edge: 120, abilities: 30 } };
    expect(allocationFindings(pilot)).toEqual([]);
    expect(pilotStats(pilot)).toEqual({ skill: 4, edge: 3, abilities: 0 });
    expect(allocationFindings({ ...pilot, alloc: { skill: 0, edge: 100, abilities: 30 } })[0]?.id).toBe("alloc-left");
    expect(allocationFindings({ ...pilot, alloc: { skill: 0, edge: 130, abilities: 30 } })[0]?.id).toBe("alloc-over");
    expect(allocationFindings({ ...pilot, abilities: ["One"] })[0]?.id).toBe("abilities-over");
  });

  it("keeps two to six living pilots, charges 150 for a replacement, and hides wounded or wrong-type pilots", () => {
    let c = campaign();
    c = hirePilot(c, newPilot("a", "A", "BM"));
    expect(pilotCountFindings(c)[0]?.id).toBe("pilots-few");
    c = hirePilot(c, { ...newPilot("b", "B", "CV"), wounded: true });
    c = hirePilot(c, { ...newPilot("k", "K", "BM"), killed: true });
    expect(pilotCountFindings(c)).toEqual([]);
    expect(eligiblePilots(c, "BM").map((p) => p.id)).toEqual(["a"]);
    expect(eligiblePilots(c, "CV")).toEqual([]);
    c = hirePilot(c, newPilot("r", "R", "BM"), { replacement: true });
    expect(warchest(c)).toBe(250);
  });
});

describe("Difficulty and existing forces (pp. 28-29)", () => {
  it("puts 12,000 SP in the -30% band and 12,001 in -40%", () => {
    const rows: [number, number][] = [[3000, 0], [3001, -10], [6000, -10], [6001, -20], [9001, -30], [12000, -30], [12001, -40]];
    for (const [sp, pct] of rows) expect(existingForcePercent(sp), String(sp)).toBe(pct);
  });

  it("adds the rookie +20% and the existing-force -10% before multiplying: 250 PV becomes 275", () => {
    const pilots = [{ ...newPilot("a", "A", "BM"), totalSp: 1750 }, { ...newPilot("b", "B", "BM"), totalSp: 1750 }];
    const c = campaign({ difficulty: "rookie", existingForce: true, pilots });
    expect(adjustedPvLimit(250, c)).toBe(275);
    expect(adjustedPvLimit(250, { ...c, existingForce: false })).toBe(300);
    expect(adjustedPvLimit(250, campaign({ difficulty: "legendary", customPvPercent: -50 }))).toBe(125);
  });

  it("tops an existing warchest up to 400 and turns unspent PV into SP (395 PV and 230 SP gives 600)", () => {
    expect(existingForceSetup({ warchest: 230, totalPv: 395 })).toEqual({ warchest: 600, unspentPv: 5, spFromPv: 200 });
    expect(existingForceSetup({ warchest: 950, totalPv: 400 }).warchest).toBe(950);
    expect(startingWarchest(399)).toBe(440);
  });
});

describe("Force creation (p. 26)", () => {
  it("checks unit count and PV, and the advanced chassis limits", () => {
    const seven = [unit("a", "BM", "Warhammer", "6R", 32), unit("b", "BM", "Warhammer", "6R", 32), unit("c", "BM", "Warhammer", "6D", 30), unit("d", "CV", "Maxim", "H", 29), unit("e", "CV", "Maxim", "H", 29), unit("f", "CV", "Maxim", "H", 29), unit("g", "AF", "Swift", "S", 20)];
    expect(forceFindings(seven).map((f) => f.id)).toEqual(["units-few"]);
    expect(forceFindings(seven, { advanced: true }).map((f) => f.id).sort()).toEqual(["mech-chassis", "mech-variant", "other-variant", "type-not-allowed", "units-few"]);
    const over = Array.from({ length: 8 }, (_, i) => unit(`u${i}`, "BM", `Chassis${i}`, "A", 51));
    expect(forceFindings(over).map((f) => f.id)).toEqual(["pv-over"]);
  });
});

describe("Buying, selling and OMNI changes (pp. 31, 36)", () => {
  it("buys at PV x 40, sells for half, and reports a short warchest without refusing", () => {
    const c = campaign({ startWarchest: 1000 });
    const bought = purchaseUnit(c, { unitId: "u1", name: "Lancer", type: "BM", pv: 28 }, "l1");
    expect(bought.campaign.roster[0]?.boughtFor).toBe(1120);
    expect(warchest(bought.campaign)).toBe(-120);
    expect(bought.findings[0]?.id).toBe("warchest-short");
    const sold = sellUnit(bought.campaign, "u1", "l2");
    expect(warchest(sold)).toBe(440);
    expect(sold.roster[0]).toMatchObject({ status: "sold", soldFor: 560 });
  });

  it("charges Size x 5 to a variant of equal or lower PV, and the PV difference x 40 to a dearer one", () => {
    expect(omniCost({ size: 3, oldPv: 40, newPv: 40 })).toBe(15);
    expect(omniCost({ size: 3, oldPv: 40, newPv: 35 })).toBe(15);
    expect(omniCost({ size: 3, oldPv: 40, newPv: 43 })).toBe(120);
  });
});
