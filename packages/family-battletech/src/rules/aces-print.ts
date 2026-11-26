// What the printed campaign sheets hold, worked out from the campaign record (Aces rulebook pp. 28-29, 32-37, the Log Sheets (2025)
// as a form to follow). Pure: the page lays these out. Figures and our own words only; the sheets' labels follow the form, and the
// steps carry our own names with the rulebook page.
import { PILOT_COLUMNS } from "../data/aces";
import type { PilotColumn } from "../data/aces";
import { columnValue, difficultyRow, pilotStats, pvPercent, rosterPv, spPercent, unallocated } from "./aces-campaign";
import type { AcesCampaign, NamedPilot, SortieRecord } from "./aces-campaign";

export const SHEET_FOOT = "Drawn by Salvage Rights after the Aces Log Sheets (2025), for personal use at your table. Aces and BattleTech belong to their owners.";

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

// ---- Player Force Roster -----------------------------------------------------------------------------------------------------

export interface RosterSheet {
  level: string;
  pvPercent: number;
  spPercent: number;
  forceName: string;
  totalPv: number;
  commander: string;
  units: { name: string; pv: number; status: "ready" | "destroyed" }[];
  pilots: { callsign: string; type: string; wounded: boolean; skill: number; edge: number; abilities: number; totalSp: number; abilityNames: string[] }[];
  totalSpEarned: number;
  memorial: { units: string[]; pilots: string[] };
}

/** Our own names for the steps the sheet lists, with the rulebook page each one is on. */
export const SORTIE_SETUP_STEPS = [
  { name: "Log the sortie", cite: "Aces p. 32" },
  { name: "Read the briefing", cite: "campaign book" },
  { name: "Pay for reconnaissance", cite: "Aces p. 32" },
  { name: "Lay out the play area and waypoints", cite: "campaign book" },
  { name: "Choose the player force, change OMNI variants, name the commander", cite: "Aces pp. 28-31" },
  { name: "Deal the opposing force's decks and command card", cite: "Aces pp. 10, 38" },
  { name: "Read the special rules and place tokens", cite: "campaign book" },
] as const;

export const AFTER_SORTIE_STEPS = [
  { name: "Waypoints that end the game, then the outcome", cite: "campaign book" },
  { name: "Casualties: salvage and crew", cite: "Aces p. 33" },
  { name: "Income and expenses on the Sortie Log", cite: "Aces pp. 34-35" },
  { name: "Share the earnings among the Named Pilots; choose the MVP", cite: "Aces p. 35" },
  { name: "Buy units", cite: "Aces p. 36" },
  { name: "Choose the next sortie", cite: "campaign book" },
] as const;

export function rosterSheet(c: AcesCampaign): RosterSheet {
  const last = [...c.sorties].reverse().find((s) => s.result === "win" && s.fielded.some((f) => f.commander));
  const commanderId = last?.fielded.find((f) => f.commander)?.pilotId;
  const row = difficultyRow(c.difficulty);
  const pilots = c.pilots.filter((p) => !p.killed);
  return {
    level: row.label,
    pvPercent: pvPercent(c),
    spPercent: spPercent(c),
    forceName: c.name,
    totalPv: rosterPv(c),
    commander: c.pilots.find((p) => p.id === commanderId)?.callsign ?? "",
    units: c.roster.filter((r) => r.status !== "sold").map((r) => ({ name: r.name, pv: r.pv, status: r.status === "active" ? "ready" : "destroyed" })),
    pilots: pilots.map((p) => ({ callsign: p.callsign, type: p.type, wounded: p.wounded, ...pilotStats(p), totalSp: p.totalSp, abilityNames: p.abilities })),
    totalSpEarned: sum(c.pilots.map((p) => p.totalSp)),
    memorial: { units: c.roster.filter((r) => r.status === "destroyed").map((r) => r.name), pilots: c.pilots.filter((p) => p.killed).map((p) => p.callsign) },
  };
}

// ---- Campaign Log ------------------------------------------------------------------------------------------------------------

export interface CampaignLogRow {
  date: string;
  number: number;
  name: string;
  win: boolean;
  earnings: number;
  shares: number;
  purchases: number;
  warchest: number;
}

/** One row a sortie, with the warchest after the last ledger entry the sortie made (the ledger is in the order things happened). */
export function campaignLog(c: AcesCampaign): { start: number; rows: CampaignLogRow[]; keywords: string[] } {
  let balance = c.startWarchest;
  const rows = c.sorties.map((s) => {
    const key = `sortie-${String(s.number)}`;
    const last = c.ledger.findLastIndex((l) => l.sortie === key);
    if (last >= 0) balance = c.startWarchest + sum(c.ledger.slice(0, last + 1).map((l) => l.amount));
    return {
      date: s.date,
      number: s.number,
      name: s.name ?? "",
      win: s.result === "win",
      earnings: s.result === "win" ? s.earnings : 0,
      shares: s.shares,
      purchases: sum(c.ledger.filter((l) => l.sortie === key && l.kind === "buy").map((l) => Math.abs(l.amount))),
      warchest: balance,
    };
  });
  return { start: c.startWarchest, rows, keywords: [...new Set(c.sorties.flatMap((s) => s.keywords))] };
}

// ---- Sortie Log --------------------------------------------------------------------------------------------------------------

export interface SortieLogColumn {
  number: number;
  name: string;
  income: number;
  recon: number;
  waypoints: number;
  rearm: number;
  personnel: number;
  repairs: number;
  expenses: number;
  earnings: number;
  shares: number;
}

/** The Sortie Log's column for a recorded sortie. A failed sortie records nothing, so it has no column (p. 32). */
export const sortieLogColumns = (c: AcesCampaign): SortieLogColumn[] =>
  c.sorties
    .filter((s): s is SortieRecord & { result: "win" } => s.result === "win")
    .map((s) => ({
      number: s.number,
      name: s.name ?? "",
      income: s.income,
      recon: sum(s.recon.map((r) => r.sp)),
      waypoints: s.waypointSp,
      rearm: s.rearm,
      personnel: s.personnel,
      repairs: s.repairs,
      expenses: s.income - s.earnings,
      earnings: s.earnings,
      shares: s.shares,
    }));

// ---- Named Pilot card --------------------------------------------------------------------------------------------------------

export interface PilotCardColumn {
  id: PilotColumn;
  label: string;
  allocated: number;
  value: number;
  /** Every step of the column: the stat, the total SP it needs, and whether it has been reached. */
  steps: { value: number; at: number; reached: boolean }[];
}

const COLUMN_LABELS: Record<PilotColumn, string> = { skill: "Skill", edge: "Edge tokens", abilities: "Edge abilities" };

export function pilotCard(p: NamedPilot): { callsign: string; type: string; totalSp: number; unallocated: number; columns: PilotCardColumn[]; abilityNames: string[]; sorties: number; mvp: number } {
  return {
    callsign: p.callsign,
    type: p.type,
    totalSp: p.totalSp,
    unallocated: unallocated(p),
    columns: PILOT_COLUMNS.map((col) => ({
      id: col.id,
      label: COLUMN_LABELS[col.id],
      allocated: p.alloc[col.id],
      value: columnValue(col.id, p.alloc[col.id]),
      steps: col.steps.map(([value, at]) => ({ value, at, reached: p.alloc[col.id] >= at })),
    })),
    abilityNames: p.abilities,
    sorties: p.sorties,
    mvp: p.mvp,
  };
}
