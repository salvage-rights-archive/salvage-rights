// The Aces campaign record and its core arithmetic: Named Pilots with Skill, Edge and ability count derived from SP, allocation, hiring,
// roster, buying and selling, difficulty percentages, existing-force set-up and the warchest as a sum of a ledger. Pure; nothing here
// throws on a record it does not fully understand. Findings are advice, never refusals. Words are ours; figures are in data/aces.ts.
import {
  ADVANCED_CREATION,
  AFTER_SORTIE,
  CAMPAIGN_FIGURES,
  DIFFICULTY,
  EXISTING_FORCE_BANDS,
  OMNI_COST,
  PILOT_COLUMNS,
  PILOT_TYPES,
  PRICES,
  type DifficultyId,
  type DifficultyRow,
  type PilotColumn,
  type PilotType,
  type RepairCategory,
} from "../data/aces";
import { crippled } from "./as-play";
import type { PlayState } from "./as-play";
import type { AsCard } from "./as-unit";
import { isEmplacement } from "./aces-game";
import type { GameUnit } from "./aces-game";

export interface Finding {
  id: string;
  text: string;
  cite: string;
}

export interface NamedPilot {
  id: string;
  callsign: string;
  type: PilotType;
  /** Every SP this pilot has earned, the 150 start included. */
  totalSp: number;
  alloc: Record<PilotColumn, number>;
  /** Edge ability names the player types from their own cards; the app never lists them. */
  abilities: string[];
  wounded: boolean;
  killed: boolean;
  mvp: number;
  sorties: number;
}

export type RosterStatus = "active" | "destroyed" | "sold";

export interface RosterUnit {
  unitId: string;
  name: string;
  /** Card type code: BM, CV, BA, CI. */
  type: string;
  chassis?: string;
  variant?: string;
  /** The printed Skill 4 PV and the Size, copied when the unit joins. */
  pv: number;
  size?: number;
  status: RosterStatus;
  boughtFor?: number;
  soldFor?: number;
}

export interface LedgerEntry {
  id: string;
  label: string;
  /** SP in or out of the warchest. */
  amount: number;
  sortie?: string;
  /** What the entry was, so a sortie's purchases and sales can be read back. */
  kind?: "earnings" | "shares" | "buy" | "sell" | "hire";
}

/** One sortie on the campaign log (design 4). Purchases and sales are read from the ledger by `sortieTrades`, not stored twice. */
export interface SortieRecord {
  number: number;
  date: string;
  name?: string;
  result: "win" | "failed";
  /** SP spent on Reconnaissance before the sortie, by option, with the player's own labels. */
  recon: { label: string; sp: number }[];
  fielded: { unitId: string; pilotId?: string; commander?: boolean }[];
  gameId?: string;
  income: number;
  /** SP lost (positive) or gained (negative) from Waypoints, as an expense. */
  waypointSp: number;
  rearm: number;
  personnel: number;
  repairs: number;
  earnings: number;
  /** SP the Named Pilots took from the earnings (the MVP bonus is not in it). */
  shares: number;
  /** The Most Valuable Pilot id. */
  mvp?: string;
  keywords: string[];
  next?: number;
}

export interface AcesCampaign {
  schema: 1;
  kind: "aces-campaign";
  id: string;
  name: string;
  book: "scouring-sands" | "own";
  difficulty: DifficultyId;
  /** Legendary lets the player pick a harder number ("or less"). */
  customPvPercent?: number;
  customSpPercent?: number;
  existingForce: boolean;
  startWarchest: number;
  roster: RosterUnit[];
  pilots: NamedPilot[];
  ledger: LedgerEntry[];
  sorties: SortieRecord[];
}

const finding = (id: string, text: string, cite: string): Finding => ({ id, text, cite });
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

// ---- Named pilots ----

export function columnTable(column: PilotColumn) {
  return PILOT_COLUMNS.find((c) => c.id === column) ?? { id: column, base: 0, steps: [] };
}

/** The stat a column shows for the SP put into it: the last threshold reached, else the base value. */
export function columnValue(column: PilotColumn, sp: number): number {
  const table = columnTable(column);
  let value = table.base;
  for (const [stat, at] of table.steps) if (sp >= at) value = stat;
  return value;
}

/** The next stat in a column, the SP it needs in total and how much more that is; null at the top. */
export function nextUnlock(column: PilotColumn, sp: number): { value: number; at: number; more: number } | null {
  const step = columnTable(column).steps.find(([, at]) => sp < at);
  return step ? { value: step[0], at: step[1], more: step[1] - sp } : null;
}

export function pilotStats(pilot: Pick<NamedPilot, "alloc">): { skill: number; edge: number; abilities: number } {
  return {
    skill: columnValue("skill", pilot.alloc.skill),
    edge: columnValue("edge", pilot.alloc.edge),
    abilities: columnValue("abilities", pilot.alloc.abilities),
  };
}

export function newPilot(id: string, callsign: string, type: PilotType): NamedPilot {
  return {
    id,
    callsign,
    type,
    totalSp: CAMPAIGN_FIGURES.pilotStartSp,
    alloc: { skill: 0, edge: 0, abilities: 0 },
    abilities: [],
    wounded: false,
    killed: false,
    mvp: 0,
    sorties: 0,
  };
}

export const unallocated = (pilot: NamedPilot): number => pilot.totalSp - sum(Object.values(pilot.alloc));

/** Allocation must use all the SP; the next unlock in each column is shown beside the finding by the page. */
export function allocationFindings(pilot: NamedPilot): Finding[] {
  const left = unallocated(pilot);
  const cite = CAMPAIGN_FIGURES.cites.pilots;
  if (left > 0) return [finding("alloc-left", `${pilot.callsign} has ${left} SP still to allocate.`, cite)];
  if (left < 0) return [finding("alloc-over", `${pilot.callsign} has allocated ${-left} SP more than earned.`, cite)];
  const stats = pilotStats(pilot);
  return pilot.abilities.length > stats.abilities
    ? [finding("abilities-over", `${pilot.callsign} lists ${pilot.abilities.length} abilities and the SP allow ${stats.abilities}.`, cite)]
    : [];
}

/** SP earned after a sortie: added to the total; the player then allocates it. */
export const earnSp = (pilot: NamedPilot, sp: number): NamedPilot => ({ ...pilot, totalSp: pilot.totalSp + Math.max(0, sp) });

// ---- Pilots in the campaign ----

export const livingPilots = (c: AcesCampaign): NamedPilot[] => c.pilots.filter((p) => !p.killed);

export function pilotCountFindings(c: AcesCampaign): Finding[] {
  const n = livingPilots(c).length;
  const cite = CAMPAIGN_FIGURES.cites.pilots;
  if (n < CAMPAIGN_FIGURES.minPilots) return [finding("pilots-few", `The force has ${n} Named Pilots; it needs at least ${CAMPAIGN_FIGURES.minPilots}.`, cite)];
  if (n > CAMPAIGN_FIGURES.maxPilots) return [finding("pilots-many", `The force has ${n} Named Pilots; the most is ${CAMPAIGN_FIGURES.maxPilots}.`, cite)];
  return [];
}

/** Hiring adds the pilot; a replacement for a killed pilot also costs SP from the warchest. */
export function hirePilot(c: AcesCampaign, pilot: NamedPilot, opts: { replacement?: boolean; ledgerId?: string } = {}): AcesCampaign {
  const ledger = opts.replacement
    ? [...c.ledger, { id: opts.ledgerId ?? `hire-${pilot.id}`, label: `Hired ${pilot.callsign}`, amount: -CAMPAIGN_FIGURES.replacementPilotCost, kind: "hire" as const }]
    : c.ledger;
  return { ...c, pilots: [...c.pilots, pilot], ledger };
}

/** Pilots who can crew a unit of this type: the right type, alive, not wounded (hide, do not mark). */
export function eligiblePilots(c: AcesCampaign, unitType: string): NamedPilot[] {
  return c.pilots.filter((p) => !p.killed && !p.wounded && PILOT_TYPES.find((t) => t.id === p.type)?.units.includes(unitType));
}

// ---- Difficulty ----

export function difficultyRow(id: DifficultyId): Pick<DifficultyRow, "id" | "label" | "pvPercent" | "spPercent" | "orLess"> {
  return DIFFICULTY.find((d) => d.id === id) ?? { id, label: id, pvPercent: 0, spPercent: 100 };
}

/** The existing-force modifier for all the Named Pilots' SP earned; 12,000 is still the -30% band. */
export function existingForcePercent(totalPilotSp: number): number {
  return EXISTING_FORCE_BANDS.find((b) => b.upTo === null || totalPilotSp <= b.upTo)?.pvPercent ?? 0;
}

/** Both percentages added before multiplying (p. 28). Only a force carried over from another campaign takes the second one. */
export function pvPercent(c: AcesCampaign): number {
  const row: Pick<DifficultyRow, "pvPercent" | "orLess"> = difficultyRow(c.difficulty);
  const own = row.orLess && c.customPvPercent !== undefined ? c.customPvPercent : row.pvPercent;
  return own + (c.existingForce ? existingForcePercent(sum(c.pilots.map((p) => p.totalSp))) : 0);
}

export function spPercent(c: AcesCampaign): number {
  const row = difficultyRow(c.difficulty);
  return row.orLess && c.customSpPercent !== undefined ? c.customSpPercent : row.spPercent;
}

/** The PV the player force may field: the sortie's limit with the net percentage, rounded down (the book's example has no rounding case). */
export const adjustedPvLimit = (limit: number, c: AcesCampaign): number => Math.floor((limit * (100 + pvPercent(c))) / 100);

// ---- Setting up ----

/** Unspent PV of a new or carried-over force turns into SP at 40 per PV. */
export function unspentPvSp(totalPv: number): number {
  return Math.max(0, CAMPAIGN_FIGURES.forcePv - totalPv) * CAMPAIGN_FIGURES.spPerUnspentPv;
}

/** A new force's starting warchest: the 400 SP start plus its unspent PV (campaign book p. 21). */
export const startingWarchest = (totalPv: number): number => CAMPAIGN_FIGURES.startWarchest + unspentPvSp(totalPv);

/** An existing force: the warchest is topped up to 400, then the PV still below 400 becomes SP and is added (p. 29 steps 1 and 2). */
export function existingForceSetup(input: { warchest: number; totalPv: number }): { warchest: number; unspentPv: number; spFromPv: number } {
  const topped = Math.max(input.warchest, CAMPAIGN_FIGURES.startWarchest);
  const spFromPv = unspentPvSp(input.totalPv);
  return { warchest: topped + spFromPv, unspentPv: Math.max(0, CAMPAIGN_FIGURES.forcePv - input.totalPv), spFromPv };
}

export interface ForceUnit {
  name: string;
  type: string;
  chassis?: string;
  variant?: string;
  pv: number;
}

/** Checks on a force being built; advice, never a refusal. `advanced` adds the Master Unit List limits of p. 26. */
export function forceFindings(units: ForceUnit[], opts: { advanced?: boolean } = {}): Finding[] {
  const out: Finding[] = [];
  const cite = CAMPAIGN_FIGURES.cites.force;
  const total = sum(units.map((u) => u.pv));
  if (units.length < CAMPAIGN_FIGURES.minUnits) out.push(finding("units-few", `The force has ${units.length} units; it needs at least ${CAMPAIGN_FIGURES.minUnits}.`, cite));
  if (total > CAMPAIGN_FIGURES.forcePv) out.push(finding("pv-over", `The force totals ${total} PV; the limit is ${CAMPAIGN_FIGURES.forcePv}.`, cite));
  if (!opts.advanced) return out;
  const adv = ADVANCED_CREATION;
  for (const u of units) {
    if (!(adv.types as readonly string[]).includes(u.type)) out.push(finding("type-not-allowed", `${u.name} is type ${u.type}, which advanced creation does not allow.`, adv.cite));
  }
  const group = (key: (u: ForceUnit) => string, pick: (u: ForceUnit) => boolean) => {
    const counts = new Map<string, number>();
    for (const u of units.filter(pick)) counts.set(key(u), (counts.get(key(u)) ?? 0) + 1);
    return counts;
  };
  const mechs = (u: ForceUnit) => u.type === "BM" && !!u.chassis;
  for (const [chassis, n] of group((u) => u.chassis ?? "", mechs)) {
    if (n > adv.mechSameChassis) out.push(finding("mech-chassis", `${n} BattleMechs share the chassis ${chassis}; the most is ${adv.mechSameChassis}.`, adv.cite));
  }
  for (const [key, n] of group((u) => `${u.chassis} ${u.variant ?? ""}`, mechs)) {
    if (n > 1) out.push(finding("mech-variant", `${key.trim()} appears ${n} times; a BattleMech variant may be used once.`, adv.cite));
  }
  for (const [key, n] of group((u) => `${u.chassis} ${u.variant ?? ""}`, (u) => u.type !== "BM" && !!u.chassis)) {
    if (n > adv.otherSameVariant) out.push(finding("other-variant", `${n} units are ${key.trim()}; the most is ${adv.otherSameVariant}.`, adv.cite));
  }
  return out;
}

export function newCampaign(input: { id: string; name: string; book: AcesCampaign["book"]; difficulty: DifficultyId; startWarchest: number; existingForce?: boolean }): AcesCampaign {
  return {
    schema: 1,
    kind: "aces-campaign",
    id: input.id,
    name: input.name,
    book: input.book,
    difficulty: input.difficulty,
    existingForce: input.existingForce ?? false,
    startWarchest: input.startWarchest,
    roster: [],
    pilots: [],
    ledger: [],
    sorties: [],
  };
}

// ---- Roster, buying and selling ----

export const warchest = (c: AcesCampaign): number => c.startWarchest + sum(c.ledger.map((l) => l.amount));
export const buyPrice = (pv: number): number => pv * PRICES.buyPerPv;
export const sellPrice = (pv: number): number => pv * PRICES.sellPerPv;
export const activeUnits = (c: AcesCampaign): RosterUnit[] => c.roster.filter((u) => u.status === "active");
export const rosterPv = (c: AcesCampaign): number => sum(activeUnits(c).map((u) => u.pv));

export function setUnitStatus(c: AcesCampaign, unitId: string, status: RosterStatus): AcesCampaign {
  return { ...c, roster: c.roster.map((u) => (u.unitId === unitId ? { ...u, status } : u)) };
}

/** Buying adds the unit and takes PV x 40 from the warchest; a short warchest is reported, not refused. */
export function purchaseUnit(c: AcesCampaign, unit: Omit<RosterUnit, "status" | "boughtFor">, ledgerId: string, sortie?: string): { campaign: AcesCampaign; findings: Finding[] } {
  const price = buyPrice(unit.pv);
  const campaign: AcesCampaign = {
    ...c,
    roster: [...c.roster, { ...unit, status: "active", boughtFor: price }],
    ledger: [...c.ledger, { id: ledgerId, label: `Bought ${unit.name}`, amount: -price, kind: "buy" as const, ...(sortie ? { sortie } : {}) }],
  };
  const findings = warchest(campaign) < 0 ? [finding("warchest-short", `The warchest is ${warchest(campaign)} SP after buying ${unit.name}.`, PRICES.cite)] : [];
  return { campaign, findings };
}

/** Selling returns half the purchase price (PV x 20). */
export function sellUnit(c: AcesCampaign, unitId: string, ledgerId: string, sortie?: string): AcesCampaign {
  const unit = c.roster.find((u) => u.unitId === unitId && u.status === "active");
  if (!unit) return c;
  const price = sellPrice(unit.pv);
  return {
    ...c,
    roster: c.roster.map((u) => (u.unitId === unitId ? { ...u, status: "sold", soldFor: price } : u)),
    ledger: [...c.ledger, { id: ledgerId, label: `Sold ${unit.name}`, amount: price, kind: "sell" as const, ...(sortie ? { sortie } : {}) }],
  };
}

/** Changing an OMNI unit's configuration before a sortie (p. 31). */
export function omniCost(input: { size: number; oldPv: number; newPv: number }): number {
  return input.newPv <= input.oldPv ? input.size * OMNI_COST.perSizeDown : (input.newPv - input.oldPv) * OMNI_COST.perPvUp;
}

// ---- After the sortie (pp. 32-37) ----

/** One fielded unit as the after-sortie steps see it. Rolls and hits the table state cannot know are typed in by the player. */
export interface SortieUnit {
  unitId: string;
  name: string;
  /** Card type code: BM, IM, CV, BA, CI and so on. */
  type: string;
  size: number;
  /** The Named Pilot who crewed it, if one did. */
  pilotId?: string;
  commander?: boolean;
  /** The ENE keyword: no rearming (p. 34). */
  ene?: boolean;
  /** Destroyed during the game. */
  destroyed: boolean;
  /** An Ammo or Fuel critical hit on a unit without CASE or CASEII (p. 33). */
  ammoNoCase?: boolean;
  /** Airborne and destroyed by crashing. */
  crashed?: boolean;
  emplacement?: boolean;
  /** The 2D6 of the Salvage Check, once rolled. */
  salvageRoll?: number;
  /** For a unit type that has no printed Salvage Check number, the player decides. */
  trulyDestroyed?: boolean;
  /** A Crew Killed or Unit Destroyed critical hit; it wins over a stunned crew. */
  crewKilledHit?: boolean;
  /** A Crew Stunned critical hit. */
  crewStunnedHit?: boolean;
  /** The 2D6 for the crew, once rolled. No Edge may change it (p. 33). */
  crewRoll?: number;
  /** How the unit ended the game, for the repair bill; a destroyed unit always counts as destroyed. */
  repair: RepairCategory;
}

export type Salvage = { truly: boolean | null; reason: "not-destroyed" | "ammo" | "crash" | "emplacement" | "salvage-failed" | "salvaged" | "roll-needed" | "no-number" };
export type CrewResult = "none" | "killed" | "wounded" | "unscathed" | null;

/** Is a destroyed unit truly destroyed (p. 33)? `null` while a roll is still missing. */
export function salvageOutcome(u: SortieUnit): Salvage {
  if (!u.destroyed) return { truly: false, reason: "not-destroyed" };
  if (u.ammoNoCase) return { truly: true, reason: "ammo" };
  if (u.crashed) return { truly: true, reason: "crash" };
  if (u.emplacement) return { truly: true, reason: "emplacement" };
  const need = AFTER_SORTIE.salvage[u.type];
  if (need === undefined) return u.trulyDestroyed === undefined ? { truly: null, reason: "no-number" } : { truly: u.trulyDestroyed, reason: u.trulyDestroyed ? "salvage-failed" : "salvaged" };
  if (u.salvageRoll === undefined) return { truly: null, reason: "roll-needed" };
  return u.salvageRoll >= need ? { truly: false, reason: "salvaged" } : { truly: true, reason: "salvage-failed" };
}

/** The crew of a destroyed unit, whether or not the unit is truly destroyed (p. 33). `none`: the unit was not destroyed; `null`: a roll is missing. */
export function crewOutcome(u: SortieUnit): CrewResult {
  if (!u.destroyed) return "none";
  if (u.crewKilledHit) return "killed";
  if (u.crewStunnedHit) return "wounded";
  if (u.crewRoll === undefined) return null;
  if (u.crewRoll <= AFTER_SORTIE.crewKilledMax) return "killed";
  return u.crewRoll <= AFTER_SORTIE.crewWoundedMax ? "wounded" : "unscathed";
}

const MECH_TYPES = ["BM", "IM"];
/** BattleMechs count their full Size for repairs, every other type half (p. 34). An IndustrialMech is read as a BattleMech: the sortie log says non-'Mechs count half. */
export const repairSize = (u: Pick<SortieUnit, "type" | "size">): number => (MECH_TYPES.includes(u.type) ? u.size : u.size / 2);

/** The repair category and the flags the table state can tell us; ammo, fuel and crew hits are not kept there and are entered. */
export function sortieUnitFromGame(g: GameUnit): Pick<SortieUnit, "unitId" | "name" | "type" | "size" | "pilotId" | "ene" | "destroyed" | "emplacement" | "repair"> {
  return {
    unitId: g.unitId,
    name: g.name,
    type: g.card.type,
    size: g.card.size,
    ...(g.pilotId ? { pilotId: g.pilotId } : {}),
    ene: g.card.specials.some((s) => s.code === "ENE"),
    destroyed: g.play.destroyed,
    emplacement: isEmplacement(g.card),
    repair: repairCategory(g.play, g.card),
  };
}

/** How badly a unit is damaged, from the table state (p. 34): destroyed, crippled, any structure damage or critical hit, armor only, or none. */
export function repairCategory(play: PlayState, card: AsCard): RepairCategory {
  if (play.destroyed) return "destroyed";
  if (crippled(play, card, "aces")) return "crippled";
  const crits = play.crits.engine + play.crits.fireControl + play.crits.weapon + play.moveHits.length;
  if (play.structure < card.structure || crits > 0 || play.stunned) return "structure";
  return play.armor < card.armor ? "armor" : "none";
}

export type ShareRole = "participant" | "sat-out" | "killed";

/**
 * What each Named Pilot takes from the earnings (p. 35, as read in design 1.1). One share is the sortie's maximum or less when the
 * earnings fall short: floor(earnings / (participants + half the others)). A pilot who sat out takes half a share, rounded down;
 * a pilot killed takes nothing.
 */
export function pilotShares(earnings: number, cap: number, roles: { pilotId: string; role: ShareRole }[]): { pilotId: string; role: ShareRole; sp: number }[] {
  const participants = roles.filter((r) => r.role === "participant").length;
  const sitting = roles.filter((r) => r.role === "sat-out").length;
  const weight = participants + sitting / 2;
  const share = earnings > 0 && weight > 0 ? Math.min(Math.max(0, cap), Math.floor(earnings / weight)) : 0;
  return roles.map((r) => ({ ...r, sp: r.role === "participant" ? share : r.role === "sat-out" ? Math.floor(share / 2) : 0 }));
}

/** Keywords with numbers are summed: PROGRESS-1 earned three times is PROGRESS 3 (p. 25). A keyword without a number counts once each time. */
export function keywordTotals(c: Pick<AcesCampaign, "sorties">): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const word of c.sorties.flatMap((s) => s.keywords)) {
    const match = /^(.*\S)\s*-\s*(\d+)$/.exec(word.trim());
    const name = (match?.[1] ?? word).trim().toUpperCase();
    if (name === "") continue;
    totals[name] = (totals[name] ?? 0) + (match?.[2] ? Number(match[2]) : 1);
  }
  return totals;
}

/** What a sortie bought and sold, read back from the ledger. */
export function sortieTrades(c: Pick<AcesCampaign, "ledger">, sortie: string): { purchases: number; sales: number } {
  const of = (kind: LedgerEntry["kind"]) => sum(c.ledger.filter((l) => l.sortie === sortie && l.kind === kind).map((l) => Math.abs(l.amount)));
  return { purchases: of("buy"), sales: of("sell") };
}

export interface AfterSortieInput {
  number: number;
  date: string;
  name?: string;
  units: SortieUnit[];
  gameId?: string;
  /** The objectives' SP, before the difficulty percentage. */
  primarySp: number;
  otherSp: number;
  recon: { label: string; sp: number }[];
  /** SP lost (positive) or gained (negative) from Waypoints. */
  waypointSp: number;
  /** Named Pilots hired to replace killed ones, before the shares are worked out. */
  hired: NamedPilot[];
  /** The most each pilot may take, from the sortie outcome. */
  shareCap: number;
  mvpPilotId?: string;
  keywords: string[];
  next?: number;
}

export interface UnitSettlement {
  unitId: string;
  name: string;
  salvage: Salvage;
  crew: CrewResult;
  category: RepairCategory;
  /** The Size the repair bill counts (half for a unit that is not a BattleMech). */
  size: number;
  repairSp: number;
  rearmed: boolean;
}

export interface Settlement {
  units: UnitSettlement[];
  /** Units whose rolls are still missing. */
  pending: string[];
  income: { base: number; percent: number; total: number };
  expenses: {
    recon: number;
    waypoints: number;
    rearm: { units: number; sp: number };
    personnel: { wounded: number; replacements: number; sp: number };
    repairs: number;
    total: number;
  };
  earnings: number;
  warchestBefore: number;
  warchestAfterEarnings: number;
  /** With no earnings, or a warchest at zero or below once they are in, the pilots are not improved (p. 34). */
  skipImproving: boolean;
  shares: { pilotId: string; role: ShareRole; sp: number }[];
  shareTotal: number;
  mvpBonus: number;
  warchestAfter: number;
  findings: Finding[];
  record: SortieRecord;
  campaign: AcesCampaign;
}

/**
 * Steps 3 to 5 of the after-sortie steps: casualties, income and expenses, earnings, and the Named Pilots' shares and MVP. Pure; the
 * result carries the updated campaign. A missing roll is listed in `pending` and counts as nothing happening until it is entered.
 */
export function settleSortie(c: AcesCampaign, input: AfterSortieInput): Settlement {
  const a = AFTER_SORTIE;
  const findings: Finding[] = [];
  const named = new Map(c.pilots.map((p) => [p.id, p]));
  const units: UnitSettlement[] = input.units.map((u) => {
    const salvage = salvageOutcome(u);
    const category: RepairCategory = u.destroyed ? "destroyed" : u.repair;
    const size = repairSize(u);
    const gone = salvage.truly === true;
    return { unitId: u.unitId, name: u.name, salvage, crew: crewOutcome(u), category, size, repairSp: gone ? 0 : size * a.repairPerSize[category], rearmed: !gone && !u.ene };
  });
  const pending = input.units.filter((u, i) => units[i]?.salvage.truly === null || units[i]?.crew === null).map((u) => u.unitId);
  if (pending.length > 0) findings.push(finding("rolls-missing", `${pending.length} unit${pending.length === 1 ? " has" : "s have"} a roll still to enter.`, a.cites.crew));
  if (input.units.some((u) => u.type === "IM")) findings.push(finding("im-as-mech", "An IndustrialMech is counted as a BattleMech for repairs and its Salvage Check, because the sortie log counts only non-'Mechs at half Size.", a.cites.expenses));

  // Crew: a Named Pilot wounded costs treatment, a killed one costs nothing; a generic crew wounded or killed costs a new crew.
  const hurt: { pilotId: string; result: "wounded" | "killed" }[] = [];
  let genericHurt = 0;
  input.units.forEach((u, i) => {
    const crew = units[i]?.crew;
    if (crew !== "killed" && crew !== "wounded") return;
    if (u.pilotId && named.has(u.pilotId)) hurt.push({ pilotId: u.pilotId, result: crew });
    else genericHurt += 1;
  });
  const woundedNamed = hurt.filter((h) => h.result === "wounded").length;
  const woundedCount = genericHurt + woundedNamed;
  const recon = sum(input.recon.map((r) => r.sp));
  const rearmUnits = units.filter((u) => u.rearmed).length;
  const personnelSp = woundedCount * a.personnelPerWounded + input.hired.length * CAMPAIGN_FIGURES.replacementPilotCost;
  const repairs = sum(units.map((u) => u.repairSp));
  const expenses = {
    recon,
    waypoints: input.waypointSp,
    rearm: { units: rearmUnits, sp: rearmUnits * a.rearmPerUnit },
    personnel: { wounded: woundedCount, replacements: input.hired.length, sp: personnelSp },
    repairs,
    total: recon + input.waypointSp + rearmUnits * a.rearmPerUnit + personnelSp + repairs,
  };
  const percent = spPercent(c);
  const base = input.primarySp + input.otherSp;
  const income = { base, percent, total: (base * percent) / 100 };
  const earnings = income.total - expenses.total;
  const warchestBefore = warchest(c);
  const warchestAfterEarnings = warchestBefore + earnings;
  const skipImproving = earnings <= 0 || warchestAfterEarnings <= 0;
  if (earnings < 0) findings.push(finding("debt", `The sortie lost ${-earnings} SP; it comes out of the warchest and the Named Pilots earn nothing from it.`, a.cites.expenses));
  if (warchestAfterEarnings <= 0) findings.push(finding("warchest-empty", "The warchest is at zero or below, so the Named Pilots are not improved this time.", a.cites.expenses));

  // Pilots: who took part, who sat out, who died.
  const killedNow = new Set(hurt.filter((h) => h.result === "killed").map((h) => h.pilotId));
  const woundedNow = new Set(hurt.filter((h) => h.result === "wounded").map((h) => h.pilotId));
  const fieldedIds = new Set(input.units.flatMap((u) => (u.pilotId ? [u.pilotId] : [])));
  const everyone = [...c.pilots, ...input.hired];
  const roles = everyone
    .filter((p) => !p.killed)
    .map((p) => ({ pilotId: p.id, role: (killedNow.has(p.id) ? "killed" : fieldedIds.has(p.id) ? "participant" : "sat-out") as ShareRole }));
  const shares = skipImproving ? roles.map((r) => ({ ...r, sp: 0 })) : pilotShares(earnings, input.shareCap, roles);
  const shareTotal = sum(shares.map((s) => s.sp));
  const mvpOk = input.mvpPilotId !== undefined && shares.some((s) => s.pilotId === input.mvpPilotId && s.role === "participant");
  if (input.mvpPilotId !== undefined && !mvpOk && !skipImproving) findings.push(finding("mvp-not-eligible", "The Most Valuable Pilot must have taken part in the sortie and survived.", a.cites.shares));
  const mvpBonus = mvpOk && !skipImproving ? a.mvpBonus : 0;

  const id = `sortie-${String(input.number)}`;
  const ledger: LedgerEntry[] = [...c.ledger];
  if (earnings !== 0) ledger.push({ id: `${id}-earnings`, label: `Sortie ${String(input.number)} earnings`, amount: earnings, sortie: id, kind: "earnings" });
  if (shareTotal > 0) ledger.push({ id: `${id}-shares`, label: `Sortie ${String(input.number)} Named Pilot shares`, amount: -shareTotal, sortie: id, kind: "shares" });

  const pilots = everyone.map((p) => {
    const sp = (shares.find((s) => s.pilotId === p.id)?.sp ?? 0) + (mvpOk && input.mvpPilotId === p.id ? mvpBonus : 0);
    const killed = p.killed || killedNow.has(p.id);
    return {
      ...p,
      totalSp: p.totalSp + sp,
      // A pilot wounded earlier is recovered now; one wounded in this sortie is marked (p. 33).
      wounded: !killed && woundedNow.has(p.id),
      killed,
      mvp: p.mvp + (mvpBonus > 0 && input.mvpPilotId === p.id ? 1 : 0),
      sorties: p.sorties + (fieldedIds.has(p.id) ? 1 : 0),
    };
  });
  const lost = new Set(units.filter((u) => u.salvage.truly === true).map((u) => u.unitId));
  const record: SortieRecord = {
    number: input.number,
    date: input.date,
    ...(input.name ? { name: input.name } : {}),
    result: "win",
    recon: input.recon,
    fielded: input.units.map((u) => ({ unitId: u.unitId, ...(u.pilotId ? { pilotId: u.pilotId } : {}), ...(u.commander ? { commander: true } : {}) })),
    ...(input.gameId ? { gameId: input.gameId } : {}),
    income: income.total,
    waypointSp: input.waypointSp,
    rearm: expenses.rearm.sp,
    personnel: personnelSp,
    repairs,
    earnings,
    shares: shareTotal,
    ...(mvpOk ? { mvp: input.mvpPilotId } : {}),
    keywords: input.keywords,
    ...(input.next === undefined ? {} : { next: input.next }),
  };
  const campaign: AcesCampaign = {
    ...c,
    roster: c.roster.map((r) => (lost.has(r.unitId) && r.status === "active" ? { ...r, status: "destroyed" as const } : r)),
    pilots,
    ledger,
    sorties: [...c.sorties, record],
  };
  const out: Settlement = { units, pending, income, expenses, earnings, warchestBefore, warchestAfterEarnings, skipImproving, shares, shareTotal, mvpBonus, warchestAfter: warchestAfterEarnings - shareTotal, findings, record, campaign };
  findings.push(...pilotCountFindings(campaign));
  return out;
}

/**
 * A failed sortie (p. 32): the loss may go on the campaign log, but no keywords, income, expenses, casualties or pilot changes are
 * recorded, the damage is treated as never having happened, and the sortie is played again.
 */
export function failSortie(c: AcesCampaign, input: { number: number; date: string; name?: string }): AcesCampaign {
  const record: SortieRecord = {
    number: input.number,
    date: input.date,
    ...(input.name ? { name: input.name } : {}),
    result: "failed",
    recon: [],
    fielded: [],
    income: 0,
    waypointSp: 0,
    rearm: 0,
    personnel: 0,
    repairs: 0,
    earnings: 0,
    shares: 0,
    keywords: [],
  };
  return { ...c, sorties: [...c.sorties, record] };
}

/** Sets the keywords gained and the sortie to play next on a recorded sortie (steps 2 and 7). */
export function annotateSortie(c: AcesCampaign, number: number, notes: { keywords: string[]; next?: number }): AcesCampaign {
  const at = c.sorties.findLastIndex((s) => s.number === number && s.result === "win");
  if (at < 0) return c;
  return { ...c, sorties: c.sorties.map((s, i) => (i === at ? { ...s, keywords: notes.keywords, ...(notes.next === undefined ? {} : { next: notes.next }) } : s)) };
}

/** Is a saved value a campaign this version can read? Anything else is listed untouched. */
export function isAcesCampaign(v: unknown): v is AcesCampaign {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Partial<AcesCampaign>;
  return c.kind === "aces-campaign" && c.schema === 1 && typeof c.id === "string" && Array.isArray(c.roster) && Array.isArray(c.pilots) && Array.isArray(c.ledger) && Array.isArray(c.sorties);
}
