import { describe, expect, it } from "vitest";
import { newAsUnit } from "./as-unit";
import { warchest } from "./aces-campaign";
import { convertJbtBackup, looksLikeJbtBackup } from "./aces-jbt";

// Everything below is invented for the test: a backup shaped like the old app's, with made-up names and figures.
const BACKUP = {
  battleMechSaves: [{ anything: "ignored" }],
  acesGame: { ignored: true },
  acesCardLibrary: { version: 1, cards: [] },
  acesCampaigns: [
    {
      version: 1,
      id: "camp-1",
      name: "Test run",
      campaignBook: "Scouring Sands",
      difficulty: "veteran",
      existingForce: true,
      advancedForceCreation: true,
      startingWarchest: 400,
      roster: [
        { id: "u1", chassis: "Anvil", variant: "AV-1", name: "Anvil AV-1", type: "bm", size: 3, pv: 40, omni: true, enhancedNoAmmo: false, status: "active", mulID: 0, notes: "my note" },
        { id: "u2", chassis: "Bolt", variant: "BT-2", name: "Bolt BT-2", type: "CV", size: 2, pv: 30, omni: false, enhancedNoAmmo: true, status: "truly-destroyed", mulID: 9001, notes: "" },
        { id: "u3", chassis: "Cairn", variant: "CN-3", name: "Cairn CN-3", type: "BM", size: 1, pv: 20, omni: false, enhancedNoAmmo: false, status: "sold", mulID: 0, notes: "" },
      ],
      pilots: [
        { id: "p1", callsign: "Ash", type: "BM", skillSP: 100, edgeTokenSP: 20, edgeAbilitySP: 0, unallocatedSP: 30, wounded: false, killed: false, mvpCount: 1, edgeAbilities: ["Own ability"], sortiesPlayed: 2, notes: "note" },
        { id: "p2", callsign: "Birch", type: "XX", skillSP: 0, edgeTokenSP: 0, edgeAbilitySP: 0, unallocatedSP: 150, wounded: false, killed: true, mvpCount: 0, edgeAbilities: [], sortiesPlayed: 1, notes: "" },
      ],
      sorties: [
        {
          id: "s1", datePlayed: "2026-02-03T10:00:00Z", number: "01", name: "First", win: true, earnings: 90, namedPilotSP: 80, purchases: 0, sales: 0, warchestBalance: 410, keywords: ["PROGRESS-1"], mvpPilotId: "p1", notes: "n",
          ledgerInput: { primaryObjectiveSP: 300, otherObjectivesSP: 100, spPercent: 100, reconnaissanceSP: 20, waypointSP: 10, unitsToRearm: 3, woundedOrKilledCrews: 1, newNamedPilots: 0, destroyedSize: 0, crippledSize: 2, structureOrCriticalSize: 0, armorOnlySize: 0 },
        },
        { id: "s2", datePlayed: "2026-02-10", number: "02-Y", name: "", win: false, ledgerInput: null, earnings: 0, namedPilotSP: 0, purchases: 0, sales: 0, warchestBalance: 410, keywords: ["IGNORED"], mvpPilotId: "", notes: "" },
      ],
      memorial: ["Birch", "Nobody"],
      lastUpdated: "2026-02-10T00:00:00Z",
    },
    { name: "no id" },
  ],
};

describe("BattleTech Tools backup", () => {
  it("is found by its keys and read into our campaign record, saying what was left behind", () => {
    expect(looksLikeJbtBackup(BACKUP)).toBe(true);
    expect(looksLikeJbtBackup({ app: "salvage-rights", kind: "aces-campaigns" })).toBe(false);
    const have = { ...newAsUnit("mine"), source: { kind: "mul-export" as const, ref: "9001" } };
    const result = convertJbtBackup(BACKUP, [have]);
    expect(result.skipped).toHaveLength(1);
    expect(result.hasCardLibrary).toBe(true);
    const [made] = result.campaigns;
    const c = made?.campaign;
    expect(c).toMatchObject({ id: "camp-1", name: "Test run", book: "scouring-sands", difficulty: "veteran", existingForce: true, startWarchest: 400 });
    // The roster: a unit we already have by its list id is used; the others become stand-ins that carry type, Size, PV and the OMNI mark.
    expect(c?.roster.map((r) => [r.unitId, r.status, r.type, r.pv])).toEqual([["jbt-camp-1-u1", "active", "BM", 40], ["mine", "destroyed", "CV", 30], ["jbt-camp-1-u3", "sold", "BM", 20]]);
    expect(made?.units.map((u) => u.id)).toEqual(["jbt-camp-1-u1", "jbt-camp-1-u3"]);
    expect(made?.units[0]?.card.specials.map((s) => s.code)).toEqual(["OMNI"]);
    expect(made?.units[0]?.notes).toBe("my note");
    // Pilots: SP split into allocation and the total; an unknown type reads as BM.
    expect(c?.pilots[0]).toMatchObject({ id: "p1", totalSp: 150, alloc: { skill: 100, edge: 20, abilities: 0 }, abilities: ["Own ability"], mvp: 1, sorties: 2 });
    expect(c?.pilots[1]).toMatchObject({ type: "BM", killed: true, totalSp: 150 });
    // Sorties: figures rebuilt from the ledger input; a failed sortie records nothing; the warchest equals the backup's balance.
    expect(c?.sorties[0]).toMatchObject({ number: 1, date: "2026-02-03", result: "win", income: 400, recon: [{ label: "Reconnaissance", sp: 20 }], waypointSp: 10, rearm: 60, personnel: 100, repairs: 120, earnings: 90, shares: 80, mvp: "p1", keywords: ["PROGRESS-1"] });
    expect(c?.sorties[1]).toMatchObject({ number: 2, result: "failed", keywords: [], earnings: 0 });
    expect(c && warchest(c)).toBe(410);
    const left = made?.left.join(" ") ?? "";
    for (const word of ["card values", "notes written on Named Pilots", "notes written on sorties", "advanced force creation", "units each sortie fielded", "Memorial names", "not plain numbers", "type we do not use"]) {
      expect(left.toLowerCase()).toContain(word.toLowerCase());
    }
  });
});
