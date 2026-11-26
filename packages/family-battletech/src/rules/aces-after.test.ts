import { describe, expect, it } from "vitest";
import { newPlayState } from "./as-play";
import { newAsUnit } from "./as-unit";
import {
  crewOutcome,
  failSortie,
  keywordTotals,
  newCampaign,
  newPilot,
  pilotShares,
  repairCategory,
  salvageOutcome,
  settleSortie,
  warchest,
  type AcesCampaign,
  type AfterSortieInput,
  type NamedPilot,
  type SortieUnit,
} from "./aces-campaign";

// Invented units and pilots; the figures are the rulebook's worked examples (pp. 35-37), used by value.

const unit = (unitId: string, type: string, size: number, patch: Partial<SortieUnit> = {}): SortieUnit => ({ unitId, name: unitId, type, size, destroyed: false, repair: "none", ...patch });
const pilot = (id: string, totalSp: number): NamedPilot => ({ ...newPilot(id, id, "BM"), totalSp });
const base = (): AcesCampaign => ({ ...newCampaign({ id: "c", name: "Test run", book: "own", difficulty: "standard", startWarchest: 400 }), pilots: [pilot("gus", 250), pilot("ann", 230), pilot("bo", 230), pilot("cy", 190)] });
const input = (units: SortieUnit[], patch: Partial<AfterSortieInput> = {}): AfterSortieInput => ({
  number: 1,
  date: "2026-01-01",
  units,
  primarySp: 1200,
  otherSp: 600,
  recon: [{ label: "Scouting", sp: 100 }],
  waypointSp: 0,
  hired: [],
  shareCap: 80,
  keywords: [],
  ...patch,
});

/** The worked sortie of pp. 36-37: seven fielded, one truly destroyed, one with ENE, two wounded crews, the MVP chosen from the pilots who fought. */
const example = (): SortieUnit[] => [
  unit("heavy", "BM", 3, { destroyed: true, salvageRoll: 3, crewRoll: 8 }),
  unit("light", "BM", 1, { destroyed: true, salvageRoll: 7, crewRoll: 5, pilotId: "gus" }),
  unit("hover", "CV", 2, { destroyed: true, salvageRoll: 6, crewRoll: 6 }),
  unit("cripple", "BM", 3, { repair: "crippled", pilotId: "ann" }),
  unit("ene", "BM", 2, { repair: "structure", ene: true, pilotId: "bo" }),
  unit("assault", "BM", 4, { repair: "armor" }),
  unit("clean", "BM", 2),
];

describe("After-sortie steps", () => {
  it("works the p. 36-37 example by figures: income 1,800, expenses 940, earnings 860, shares 280, warchest 980", () => {
    const s = settleSortie(base(), input(example(), { mvpPilotId: "gus" }));
    expect(s.income.total).toBe(1800);
    // Income rounds to whole SP, half up (owner ruling): 105 SP at 90% is 94.5, at a custom 65% is 68.25.
    const rounded: [Partial<ReturnType<typeof base>>, number][] = [[{ difficulty: "veteran" }, 95], [{ difficulty: "legendary", customSpPercent: 65 }, 68]];
    for (const [patch, want] of rounded) expect(settleSortie({ ...base(), ...patch }, input([unit("a", "BM", 2)], { primarySp: 105, otherSp: 0 })).income.total).toBe(want);
    expect(s.expenses).toMatchObject({ recon: 100, rearm: { units: 5, sp: 100 }, personnel: { wounded: 2, sp: 200 }, repairs: 540, total: 940 });
    expect(s.earnings).toBe(860);
    expect(s.shareTotal).toBe(280);
    expect(s.warchestAfter).toBe(980);
    expect(warchest(s.campaign)).toBe(980);
    const gus = s.campaign.pilots.find((p) => p.id === "gus");
    expect(gus).toMatchObject({ totalSp: 250 + 80 + 20, wounded: true, mvp: 1, sorties: 1 });
    expect(s.campaign.roster).toEqual([]);
    expect(s.pending).toEqual([]);
  });

  it("shares: the p. 35 example (410 earned, 70 cap, 3 and 1 sat out, 165 kept) and a short earning split", () => {
    const roles = (n: number, sat: number) => [...Array.from({ length: n }, (_, i) => ({ pilotId: `p${String(i)}`, role: "participant" as const })), ...Array.from({ length: sat }, (_, i) => ({ pilotId: `s${String(i)}`, role: "sat-out" as const }))];
    const full = pilotShares(410, 70, roles(3, 1));
    expect(full.map((s) => s.sp)).toEqual([70, 70, 70, 35]);
    expect(410 - full.reduce((a, s) => a + s.sp, 0)).toBe(165);
    expect(pilotShares(100, 70, roles(2, 1)).map((s) => s.sp)).toEqual([40, 40, 20]);
    expect(pilotShares(500, 70, [...roles(1, 0), { pilotId: "dead", role: "killed" }]).map((s) => s.sp)).toEqual([70, 0]);
  });

  it("debt skips the pilots' step: a loss comes out of the warchest, and so does an empty warchest", () => {
    const loss = settleSortie(base(), input([unit("a", "BM", 4, { destroyed: true, salvageRoll: 9, crewRoll: 9, pilotId: "gus" })], { primarySp: 100, otherSp: 0 }));
    expect(loss.earnings).toBe(100 - 100 - 20 - 400);
    expect(loss.skipImproving).toBe(true);
    expect(loss.shareTotal).toBe(0);
    expect(warchest(loss.campaign)).toBe(400 - 420);
    expect(loss.campaign.pilots.map((p) => p.totalSp)).toEqual([250, 230, 230, 190]);
    const empty = settleSortie({ ...base(), startWarchest: -2000 }, input([unit("a", "BM", 2)], { mvpPilotId: "gus" }));
    expect(empty.earnings).toBeGreaterThan(0);
    expect(empty.skipImproving).toBe(true);
    expect(empty.mvpBonus).toBe(0);
  });

  it("decides what is truly destroyed and what happens to the crew", () => {
    const salvage: [string, number, boolean][] = [["BM", 3, true], ["BM", 4, false], ["CV", 5, true], ["CV", 6, false], ["BA", 7, true], ["BA", 8, false], ["CI", 9, true], ["CI", 10, false]];
    for (const [type, roll, truly] of salvage) expect(salvageOutcome(unit("u", type, 1, { destroyed: true, salvageRoll: roll })).truly, `${type} ${String(roll)}`).toBe(truly);
    expect(salvageOutcome(unit("u", "BM", 1, { destroyed: true, salvageRoll: 12, ammoNoCase: true })).truly).toBe(true);
    expect(salvageOutcome(unit("u", "BM", 1, { destroyed: true, salvageRoll: 12, emplacement: true })).truly).toBe(true);
    expect(salvageOutcome(unit("u", "BM", 1, { destroyed: true })).truly).toBeNull();
    expect(salvageOutcome(unit("u", "BM", 1)).truly).toBe(false);
    const crew: [Partial<SortieUnit>, ReturnType<typeof crewOutcome>][] = [
      [{ crewRoll: 3 }, "killed"],
      [{ crewRoll: 4 }, "wounded"],
      [{ crewRoll: 6 }, "wounded"],
      [{ crewRoll: 7 }, "unscathed"],
      [{ crewStunnedHit: true, crewRoll: 12 }, "wounded"],
      [{ crewKilledHit: true, crewStunnedHit: true, crewRoll: 12 }, "killed"],
      [{}, null],
    ];
    for (const [patch, want] of crew) expect(crewOutcome(unit("u", "BM", 1, { destroyed: true, ...patch }))).toBe(want);
  });

  it("counts a vehicle at half Size in the repair bill, and a killed Named Pilot costs nothing until a replacement is hired", () => {
    const tank = settleSortie(base(), input([unit("t", "CV", 3, { repair: "crippled" })]));
    expect(tank.expenses.repairs).toBe(90);
    const dead = settleSortie(base(), input([unit("a", "BM", 2, { destroyed: true, salvageRoll: 9, crewKilledHit: true, pilotId: "gus" })], { hired: [pilot("new", 150)] }));
    expect(dead.expenses.personnel).toMatchObject({ wounded: 0, replacements: 1, sp: 150 });
    expect(dead.campaign.pilots.find((p) => p.id === "gus")?.killed).toBe(true);
    expect(dead.shares.find((s) => s.pilotId === "gus")?.sp).toBe(0);
    expect(dead.shares.find((s) => s.pilotId === "new")?.role).toBe("sat-out");
  });

  it("does not rearm a unit with ENE or one that is truly destroyed", () => {
    const s = settleSortie(base(), input([unit("a", "BM", 1, { ene: true }), unit("b", "BM", 1, { destroyed: true, salvageRoll: 2, crewRoll: 9 }), unit("c", "BM", 1)]));
    expect(s.expenses.rearm).toEqual({ units: 1, sp: 20 });
  });

  it("records nothing for a failed sortie but the loss on the log, and a replay is a new row", () => {
    const c = base();
    const failed = failSortie(c, { number: 2, date: "2026-01-02" });
    expect(failed.sorties).toEqual([expect.objectContaining({ number: 2, result: "failed", earnings: 0, keywords: [] })]);
    expect({ ...failed, sorties: [] }).toEqual(c);
  });

  it("sums keywords that carry numbers across sorties", () => {
    const c = base();
    const withWords = (words: string[][]) => ({ sorties: words.map((keywords, i) => ({ ...failSortie(c, { number: i + 1, date: "d" }).sorties[0]!, keywords })) });
    expect(keywordTotals(withWords([["progress-1", "EXAMPLE"], ["PROGRESS-1"], ["PROGRESS-1", "EXAMPLE"]]))).toEqual({ PROGRESS: 3, EXAMPLE: 2 });
  });

  it("reads the repair category from the table state", () => {
    const card = { ...newAsUnit("x").card, type: "BM", size: 2, armor: 4, structure: 4, move: [{ inches: 6, mode: "" }] };
    const play = newPlayState(card);
    expect(repairCategory(play, card)).toBe("none");
    expect(repairCategory({ ...play, armor: 1 }, card)).toBe("armor");
    expect(repairCategory({ ...play, structure: 3 }, card)).toBe("structure");
    expect(repairCategory({ ...play, crits: { ...play.crits, weapon: 1 } }, card)).toBe("structure");
    expect(repairCategory({ ...play, armor: 0, structure: 2 }, card)).toBe("crippled");
    expect(repairCategory({ ...play, destroyed: true }, card)).toBe("destroyed");
  });
});
