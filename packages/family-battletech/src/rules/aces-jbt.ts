// Reading the Aces campaigns in a BattleTech Tools backup file (the old app's whole-device backup, a JSON object with optional keys)
// and turning each into our own campaign record. We learned the shape of the file from its field names only. Pure; nothing here
// throws on a file it does not understand: a campaign that cannot be read is skipped and said so. Each campaign comes back with a
// plain-words list of what did not carry over, so the player knows before they save it.
import { AFTER_SORTIE, CAMPAIGN_FIGURES, DIFFICULTY, PILOT_TYPES } from "../data/aces";
import type { DifficultyId, PilotType } from "../data/aces";
import { canonicalEdgeName } from "./aces-edge";
import type { AcesCampaign, LedgerEntry, NamedPilot, RosterUnit, SortieRecord } from "./aces-campaign";
import type { AsSpecial, AsUnit } from "./as-unit";
import { newAsUnit } from "./as-unit";

/** What the player sees as the file's source. */
export const JBT_NAME = "a BattleTech Tools backup";

/** Caps, so a hostile or damaged file cannot make the page do endless work. */
export const JBT_CAPS = { campaigns: 100, roster: 400, pilots: 60, sorties: 400, keywords: 60, text: 200 } as const;

export interface ConvertedCampaign {
  campaign: AcesCampaign;
  /** Alpha Strike units the roster needs that are not saved yet (stand-ins with a name, type, Size and PV only). */
  units: AsUnit[];
  /** What the backup holds that our record has no place for, in plain words. */
  left: string[];
}

export interface JbtResult {
  campaigns: ConvertedCampaign[];
  /** Entries skipped, each with the reason, in plain words. */
  skipped: string[];
  /** True when the backup holds a card library; it is not converted (see `JBT_LIBRARY_NOTE`). */
  hasCardLibrary: boolean;
}

export const JBT_LIBRARY_NOTE =
  "This backup also holds a card library. We did not convert it: its cards are free text and ours are chosen from our own lists, so a conversion would be a guess. Record your cards in My cards.";

export type Obj = Record<string, unknown>;
export const isObject = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
export const text = (v: unknown, fallback = ""): string => (typeof v === "string" ? v.slice(0, JBT_CAPS.text) : fallback);
export const whole = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : 0;
  return Number.isFinite(n) ? Math.round(n) : 0;
};
export const list = (v: unknown, cap: number): unknown[] => (Array.isArray(v) ? v.slice(0, cap) : []);
// An id that names a property every object has must never become one of ours.
export const safeId =(v: unknown): string => {
  const s = text(v).trim();
  return s !== "" && !(s in {}) ? s : "";
};

/** Is this JSON a BattleTech Tools backup that holds Aces data? Found by its keys. */
export function looksLikeJbtBackup(file: unknown): boolean {
  return isObject(file) && (Array.isArray(file.acesCampaigns) || isObject(file.acesCardLibrary) || "acesGame" in file) && file.kind === undefined;
}

const DIFFICULTY_IDS = DIFFICULTY.map((d) => d.id as string);

function special(code: string): AsSpecial {
  return { code, values: [], raw: code };
}

/** The unit a roster line stands for: one already saved from the Master Unit List with the same id, else a stand-in. */
function unitFor(row: Obj, campaignId: string, index: number, have: readonly AsUnit[]): { unit: AsUnit; made: boolean } {
  const mul = whole(row.mulID);
  const chassis = text(row.chassis).trim();
  const variant = text(row.variant).trim();
  // A unit saved from the Master Unit List, or read from the same export's own forces (those hold the whole card), matches by list id or by name.
  const sameName = (u: AsUnit): boolean => u.source.credit === JBT_NAME && `${u.name.chassis} ${u.name.model}`.trim().toLowerCase() === `${chassis} ${variant}`.trim().toLowerCase();
  const known = have.find((u) => (mul > 0 && (u.source.kind === "mul-export" || u.source.credit === JBT_NAME) && u.source.ref === String(mul)) || (chassis !== "" && sameName(u)));
  if (known) return { unit: known, made: false };
  const name = text(row.name).trim();
  const unit = newAsUnit(`jbt-${campaignId}-${safeId(row.id) || String(index)}`);
  unit.name = { chassis: chassis || name || "Unnamed unit", model: variant };
  unit.card.type = text(row.type, "BM").trim().toUpperCase() || "BM";
  unit.card.size = Math.max(0, whole(row.size));
  unit.card.pv = Math.max(0, whole(row.pv));
  if (row.omni === true) unit.card.specials.push(special("OMNI"));
  if (row.enhancedNoAmmo === true) unit.card.specials.push(special("ENE"));
  const notes = text(row.notes).trim();
  if (notes) unit.notes = notes;
  unit.source = { kind: "file", credit: JBT_NAME, ...(mul > 0 ? { ref: String(mul) } : {}) };
  return { unit, made: true };
}

function convertPilot(row: Obj, index: number, taken: Set<string>, left: Set<string>): NamedPilot {
  let id = safeId(row.id);
  if (id === "" || taken.has(id)) id = `jbt-pilot-${String(index)}`;
  taken.add(id);
  const asked = text(row.type).trim().toUpperCase();
  const type: PilotType = PILOT_TYPES.some((t) => t.id === asked) ? (asked as PilotType) : "BM";
  if (asked !== type) left.add(`A pilot type we do not use ("${asked || "none"}") was read as BM (BattleMech).`);
  if (text(row.notes).trim() !== "") left.add("The notes written on Named Pilots (our pilots have no notes).");
  const alloc = { skill: Math.max(0, whole(row.skillSP)), edge: Math.max(0, whole(row.edgeTokenSP)), abilities: Math.max(0, whole(row.edgeAbilitySP)) };
  // The backup keeps SP earned but not yet allocated apart; ours is the total less what is allocated.
  const totalSp = alloc.skill + alloc.edge + alloc.abilities + Math.max(0, whole(row.unallocatedSP));
  return {
    id,
    callsign: text(row.callsign).trim() || `Pilot ${String(index + 1)}`,
    type,
    totalSp,
    alloc,
    abilities: list(row.edgeAbilities, JBT_CAPS.keywords).filter((a): a is string => typeof a === "string").map((a) => canonicalEdgeName(a.slice(0, JBT_CAPS.text))),
    wounded: row.wounded === true,
    killed: row.killed === true,
    mvp: Math.max(0, whole(row.mvpCount)),
    sorties: Math.max(0, whole(row.sortiesPlayed)),
  };
}

const sizeSp = (v: unknown, perSize: number): number => Math.max(0, whole(v)) * perSize;

function convertSortie(row: Obj, index: number, pilotIds: ReadonlyMap<string, string>, left: Set<string>): { record: SortieRecord; balance: number; purchases: number; sales: number } {
  const win = row.win === true;
  const raw = text(row.number).trim();
  const plain = /^\d{1,4}$/.test(raw);
  const number = plain ? Number(raw) : (/^(\d{1,4})/.exec(raw)?.[1] ? Number(/^(\d{1,4})/.exec(raw)?.[1]) : index + 1);
  if (!plain) left.add(`Sortie numbers that are not plain numbers (for example "${raw || "blank"}") were read as the leading number, or the order the sorties were played in.`);
  if (text(row.notes).trim() !== "") left.add("The notes written on sorties (our sortie record has no notes).");
  const dated = text(row.datePlayed).slice(0, 40);
  const date = /^\d{4}-\d{2}-\d{2}/.test(dated) ? dated.slice(0, 10) : dated;
  const name = text(row.name).trim();
  const base = {
    number,
    date,
    ...(name ? { name } : {}),
    result: win ? ("win" as const) : ("failed" as const),
    fielded: [],
    keywords: win ? list(row.keywords, JBT_CAPS.keywords).filter((k): k is string => typeof k === "string").map((k) => k.slice(0, JBT_CAPS.text)) : [],
  };
  const input = isObject(row.ledgerInput) ? row.ledgerInput : undefined;
  const a = AFTER_SORTIE;
  const reconSp = Math.max(0, whole(input?.reconnaissanceSP));
  const mvp = pilotIds.get(text(row.mvpPilotId));
  const record: SortieRecord = win
    ? {
        ...base,
        recon: reconSp > 0 ? [{ label: "Reconnaissance", sp: reconSp }] : [],
        income: Math.round(((whole(input?.primaryObjectiveSP) + whole(input?.otherObjectivesSP)) * (input ? (whole(input.spPercent) || 100) : 100)) / 100),
        waypointSp: whole(input?.waypointSP),
        rearm: Math.max(0, whole(input?.unitsToRearm)) * a.rearmPerUnit,
        personnel: Math.max(0, whole(input?.woundedOrKilledCrews)) * a.personnelPerWounded + Math.max(0, whole(input?.newNamedPilots)) * CAMPAIGN_FIGURES.replacementPilotCost,
        repairs:
          sizeSp(input?.destroyedSize, a.repairPerSize.destroyed) +
          sizeSp(input?.crippledSize, a.repairPerSize.crippled) +
          sizeSp(input?.structureOrCriticalSize, a.repairPerSize.structure) +
          sizeSp(input?.armorOnlySize, a.repairPerSize.armor),
        earnings: whole(row.earnings),
        shares: Math.max(0, whole(row.namedPilotSP)),
        ...(mvp ? { mvp } : {}),
      }
    : { ...base, recon: [], income: 0, waypointSp: 0, rearm: 0, personnel: 0, repairs: 0, earnings: 0, shares: 0 };
  return { record, balance: whole(row.warchestBalance), purchases: Math.max(0, whole(row.purchases)), sales: Math.max(0, whole(row.sales)) };
}

/** One campaign of the backup as ours. Returns undefined when it has no id (the backup's own rule for an unreadable one). */
export function convertJbtCampaign(row: unknown, have: readonly AsUnit[]): ConvertedCampaign | undefined {
  if (!isObject(row)) return undefined;
  const id = safeId(row.id);
  if (id === "") return undefined;
  const left = new Set<string>();
  const unitsMade: AsUnit[] = [];

  const rosterRows = list(row.roster, JBT_CAPS.roster).filter(isObject);
  const roster: RosterUnit[] = rosterRows.map((r, i) => {
    const { unit, made } = unitFor(r, id, i, have);
    if (made) unitsMade.push(unit);
    const status = r.status === "truly-destroyed" ? "destroyed" : r.status === "sold" ? "sold" : "active";
    const chassis = text(r.chassis).trim();
    const variant = text(r.variant).trim();
    return {
      unitId: unit.id,
      name: text(r.name).trim() || `${chassis} ${variant}`.trim() || "Unnamed unit",
      type: text(r.type).trim().toUpperCase() || unit.card.type,
      ...(chassis ? { chassis } : {}),
      ...(variant ? { variant } : {}),
      pv: Math.max(0, whole(r.pv)),
      size: Math.max(0, whole(r.size)),
      status,
    };
  });
  if (unitsMade.length > 0) {
    left.add(
      `${String(unitsMade.length)} unit${unitsMade.length === 1 ? " was" : "s were"} added with only a name, type, Size and PV. The backup holds no card values (movement, damage, armor, structure, abilities), so fill them in or import the unit from the Master Unit List before you field it.`,
    );
  }
  if (rosterRows.length > 0 && rosterRows.some((r) => text(r.notes).trim() !== "") && unitsMade.length < rosterRows.length) left.add("Notes on roster units that matched a unit you already have.");

  const taken = new Set<string>();
  const pilotRows = list(row.pilots, JBT_CAPS.pilots).filter(isObject);
  const pilots = pilotRows.map((p, i) => convertPilot(p, i, taken, left));
  const pilotIds = new Map<string, string>();
  pilotRows.forEach((p, i) => {
    const mine = pilots[i];
    if (mine && safeId(p.id) !== "") pilotIds.set(safeId(p.id), mine.id);
  });

  const sortieRows = list(row.sorties, JBT_CAPS.sorties).filter(isObject);
  const startWarchest = whole(row.startingWarchest);
  const sorties: SortieRecord[] = [];
  const ledger: LedgerEntry[] = [];
  let running = startWarchest;
  let last: number | undefined;
  sortieRows.forEach((s, i) => {
    const { record, balance, purchases, sales } = convertSortie(s, i, pilotIds, left);
    sorties.push(record);
    if (record.result !== "win") return;
    const tag = `sortie-${String(record.number)}`;
    const label = `Sortie ${String(record.number)}`;
    const put = (kind: NonNullable<LedgerEntry["kind"]>, text: string, amount: number) => {
      if (amount === 0) return;
      ledger.push({ id: `jbt-${String(i)}-${kind}`, label: `${label} ${text}`, amount, sortie: tag, kind });
      running += amount;
    };
    put("earnings", "earnings", record.earnings);
    put("shares", "Named Pilot shares", -record.shares);
    put("buy", "purchases", -purchases);
    put("sell", "sales", sales);
    last = balance;
  });
  if (sortieRows.some((s) => s.win === true)) left.add("The list of units each sortie fielded (the backup does not record it), so the sorties show none.");
  // Our warchest is the start plus the ledger; if the backup's last balance differs (it can be edited by hand), one entry makes up the gap.
  if (last !== undefined && last !== running) {
    ledger.push({ id: "jbt-balance", label: "Adjustment to match the backup's last balance", amount: last - running });
    left.add(`The backup's last warchest balance (${String(last)} SP) did not match its own sorties, so one adjustment line of ${String(last - running)} SP was added.`);
  }

  const memorial = list(row.memorial, JBT_CAPS.pilots).filter((m): m is string => typeof m === "string");
  const lost = new Set(pilots.filter((p) => p.killed).map((p) => p.callsign));
  if (memorial.some((m) => !lost.has(m.slice(0, JBT_CAPS.text)))) left.add("Memorial names that match no killed Named Pilot (our memorial lists killed pilots only).");
  if (row.advancedForceCreation === true) left.add("The advanced force creation setting (we check the limits when you make a force, and do not keep the setting).");
  if (row.customUnits === true) left.add("The custom homebrew units setting.");

  const askedBook = text(row.campaignBook).trim();
  const book: AcesCampaign["book"] = /scouring\s*sands/i.test(askedBook) ? "scouring-sands" : "own";
  if (book === "own" && askedBook !== "") left.add(`The campaign book's name ("${askedBook}"); the campaign is kept as your own.`);
  const askedDifficulty = text(row.difficulty).trim();
  const difficulty: DifficultyId = DIFFICULTY_IDS.includes(askedDifficulty) ? (askedDifficulty as DifficultyId) : "standard";
  if (difficulty !== askedDifficulty) left.add(`The difficulty "${askedDifficulty || "none"}" is not one we know; Standard was used.`);
  const named = text(row.name).trim();

  const campaign: AcesCampaign = {
    schema: 1,
    kind: "aces-campaign",
    id,
    name: named || "Imported campaign",
    book,
    difficulty,
    existingForce: row.existingForce === true,
    startWarchest,
    roster,
    pilots,
    ledger,
    sorties,
  };
  if (Array.isArray(row.roster) && row.roster.length > JBT_CAPS.roster) left.add(`Only the first ${String(JBT_CAPS.roster)} roster units were read.`);
  if (Array.isArray(row.sorties) && row.sorties.length > JBT_CAPS.sorties) left.add(`Only the first ${String(JBT_CAPS.sorties)} sorties were read.`);
  return { campaign, units: unitsMade, left: [...left] };
}

/**
 * Reads a whole backup: every Aces campaign in it as ours. `have` is the player's saved Alpha Strike units, so a roster line that names
 * a unit they already have from the Master Unit List uses it. Ignores the Aces game in progress and every key that is not Aces.
 */
export function convertJbtBackup(file: unknown, have: readonly AsUnit[]): JbtResult {
  const out: JbtResult = { campaigns: [], skipped: [], hasCardLibrary: false };
  if (!isObject(file)) return out;
  out.hasCardLibrary = isObject(file.acesCardLibrary);
  const rows = Array.isArray(file.acesCampaigns) ? file.acesCampaigns : [];
  if (rows.length > JBT_CAPS.campaigns) out.skipped.push(`Only the first ${String(JBT_CAPS.campaigns)} of ${String(rows.length)} campaigns were read.`);
  const seen = new Set<string>();
  rows.slice(0, JBT_CAPS.campaigns).forEach((row, i) => {
    const made = convertJbtCampaign(row, have);
    if (!made || seen.has(made.campaign.id)) out.skipped.push(`Campaign ${String(i + 1)} in the backup could not be read and was skipped.`);
    else {
      seen.add(made.campaign.id);
      out.campaigns.push(made);
    }
  });
  return out;
}
