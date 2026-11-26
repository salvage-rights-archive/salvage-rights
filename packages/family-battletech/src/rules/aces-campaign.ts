// The Aces campaign record and its core arithmetic: Named Pilots with Skill, Edge and ability count derived from SP, allocation, hiring,
// roster, buying and selling, difficulty percentages, existing-force set-up and the warchest as a sum of a ledger. Pure; nothing here
// throws on a record it does not fully understand. Findings are advice, never refusals. Words are ours; figures are in data/aces.ts.
import {
  ADVANCED_CREATION,
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
} from "../data/aces";

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
    ? [...c.ledger, { id: opts.ledgerId ?? `hire-${pilot.id}`, label: `Hired ${pilot.callsign}`, amount: -CAMPAIGN_FIGURES.replacementPilotCost }]
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
export function purchaseUnit(c: AcesCampaign, unit: Omit<RosterUnit, "status" | "boughtFor">, ledgerId: string): { campaign: AcesCampaign; findings: Finding[] } {
  const price = buyPrice(unit.pv);
  const campaign: AcesCampaign = {
    ...c,
    roster: [...c.roster, { ...unit, status: "active", boughtFor: price }],
    ledger: [...c.ledger, { id: ledgerId, label: `Bought ${unit.name}`, amount: -price }],
  };
  const findings = warchest(campaign) < 0 ? [finding("warchest-short", `The warchest is ${warchest(campaign)} SP after buying ${unit.name}.`, PRICES.cite)] : [];
  return { campaign, findings };
}

/** Selling returns half the purchase price (PV x 20). */
export function sellUnit(c: AcesCampaign, unitId: string, ledgerId: string): AcesCampaign {
  const unit = c.roster.find((u) => u.unitId === unitId && u.status === "active");
  if (!unit) return c;
  const price = sellPrice(unit.pv);
  return {
    ...c,
    roster: c.roster.map((u) => (u.unitId === unitId ? { ...u, status: "sold", soldFor: price } : u)),
    ledger: [...c.ledger, { id: ledgerId, label: `Sold ${unit.name}`, amount: price }],
  };
}

/** Changing an OMNI unit's configuration before a sortie (p. 31). */
export function omniCost(input: { size: number; oldPv: number; newPv: number }): number {
  return input.newPv <= input.oldPv ? input.size * OMNI_COST.perSizeDown : (input.newPv - input.oldPv) * OMNI_COST.perPvUp;
}
