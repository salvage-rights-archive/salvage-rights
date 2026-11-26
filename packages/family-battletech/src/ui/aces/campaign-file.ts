// The player's own Aces campaigns as a file (`*.aces-campaigns.json`): one or all of them, with the Alpha Strike units the rosters use,
// so the file can be imported on another device. Reading never throws: a file that is wrong is answered with what was wrong. Sizes are
// capped, so a hostile file cannot freeze the page. A BattleTech Tools backup is read through the same door (rules/aces-jbt.ts).
import { DIFFICULTY, PILOT_TYPES } from "../../data/aces";
import { isAcesCampaign } from "../../rules/aces-campaign";
import type { AcesCampaign } from "../../rules/aces-campaign";
import { JBT_LIBRARY_NOTE, convertJbtBackup, looksLikeJbtBackup } from "../../rules/aces-jbt";
import type { AsUnit } from "../../rules/as-unit";
import { isAsUnit, migrated } from "../as/storage";
import { downloadJson } from "../storage";

export const CAMPAIGN_FILE_KIND = "aces-campaigns";
export const MAX_IMPORT_BYTES = 16 * 1024 * 1024;
const CAPS = { campaigns: 200, units: 2000, roster: 500, pilots: 100, ledger: 5000, sorties: 1000, list: 200, text: 2000, nodes: 400_000, depth: 24 } as const;

export interface CampaignFile {
  app: "salvage-rights";
  kind: typeof CAMPAIGN_FILE_KIND;
  version: 1;
  campaigns: AcesCampaign[];
  /** The Alpha Strike units the campaigns' rosters name, so the file stands alone. */
  units: AsUnit[];
}

type Obj = Record<string, unknown>;
const isObject = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const opt = (v: unknown, check: (x: unknown) => boolean): boolean => v === undefined || check(v);
const many = (v: unknown, cap: number, check: (x: unknown) => boolean): boolean => Array.isArray(v) && v.length <= cap && v.every(check);
const oneOf = (v: unknown, words: readonly string[]): boolean => isString(v) && words.includes(v);

/** Sizes of the whole parsed value: how many nodes, how deep, how long a text; the picture of a unit has its own limit. */
function capsProblem(v: unknown): string | undefined {
  let nodes = 0;
  const walk = (x: unknown, depth: number, key: string): boolean => {
    nodes += 1;
    if (nodes > CAPS.nodes || depth > CAPS.depth) return false;
    if (isString(x)) return key === "dataUrl" || x.length <= CAPS.text;
    if (Array.isArray(x)) return x.every((item) => walk(item, depth + 1, ""));
    if (isObject(x)) return Object.entries(x).every(([k, item]) => walk(item, depth + 1, k));
    return true;
  };
  return walk(v, 0, "") ? undefined : "This file is too large or too deeply nested to be a campaign file.";
}

const isRoster = (u: unknown): boolean =>
  isObject(u) && isString(u.unitId) && isString(u.name) && isString(u.type) && isNum(u.pv) && oneOf(u.status, ["active", "destroyed", "sold"]) && opt(u.size, isNum) && opt(u.chassis, isString) && opt(u.variant, isString) && opt(u.boughtFor, isNum) && opt(u.soldFor, isNum);
const isPilot = (p: unknown): boolean =>
  isObject(p) &&
  isString(p.id) &&
  isString(p.callsign) &&
  oneOf(p.type, PILOT_TYPES.map((t) => t.id)) &&
  isNum(p.totalSp) &&
  isObject(p.alloc) &&
  isNum(p.alloc.skill) &&
  isNum(p.alloc.edge) &&
  isNum(p.alloc.abilities) &&
  many(p.abilities, CAPS.list, isString) &&
  isBool(p.wounded) &&
  isBool(p.killed) &&
  isNum(p.mvp) &&
  isNum(p.sorties);
const isLedger = (l: unknown): boolean => isObject(l) && isString(l.id) && isString(l.label) && isNum(l.amount) && opt(l.sortie, isString) && opt(l.kind, (k) => oneOf(k, ["earnings", "shares", "buy", "sell", "hire"]));
const isRecon = (r: unknown): boolean => isObject(r) && isString(r.label) && isNum(r.sp);
const isSortie = (s: unknown): boolean =>
  isObject(s) &&
  isNum(s.number) &&
  isString(s.date) &&
  opt(s.name, isString) &&
  oneOf(s.result, ["win", "failed"]) &&
  many(s.recon, CAPS.list, isRecon) &&
  many(s.fielded, CAPS.roster, (f) => isObject(f) && isString(f.unitId) && opt(f.pilotId, isString) && opt(f.commander, isBool)) &&
  opt(s.gameId, isString) &&
  [s.income, s.waypointSp, s.rearm, s.personnel, s.repairs, s.earnings, s.shares].every(isNum) &&
  opt(s.mvp, isString) &&
  many(s.keywords, CAPS.list, isString) &&
  opt(s.next, isNum);

/** Is this a campaign the pages can show without trouble? The shape of every part is checked; whether it follows the book is not. */
export function isReadableCampaign(v: unknown): v is AcesCampaign {
  if (!isAcesCampaign(v)) return false;
  const c = v as unknown as Obj;
  return (
    isString(c.name) &&
    oneOf(c.book, ["scouring-sands", "own"]) &&
    oneOf(c.difficulty, DIFFICULTY.map((d) => d.id)) &&
    isBool(c.existingForce) &&
    isNum(c.startWarchest) &&
    opt(c.customPvPercent, isNum) &&
    opt(c.customSpPercent, isNum) &&
    many(c.roster, CAPS.roster, isRoster) &&
    many(c.pilots, CAPS.pilots, isPilot) &&
    many(c.ledger, CAPS.ledger, isLedger) &&
    many(c.sorties, CAPS.sorties, isSortie)
  );
}

/** The units a set of campaigns names, from the units the player has. */
export function unitsFor(campaigns: readonly AcesCampaign[], have: readonly AsUnit[]): AsUnit[] {
  const named = new Set(campaigns.flatMap((c) => c.roster.map((r) => r.unitId)));
  return have.filter((u) => named.has(u.id));
}

export function toCampaignFile(campaigns: readonly AcesCampaign[], have: readonly AsUnit[]): CampaignFile {
  return { app: "salvage-rights", kind: CAMPAIGN_FILE_KIND, version: 1, campaigns: structuredClone([...campaigns]), units: structuredClone(unitsFor(campaigns, have)) };
}

/** What a read of a file gives: the campaigns and units to offer, and what to tell the player. */
export interface ImportRead {
  source: "salvage-rights" | "jbt";
  campaigns: AcesCampaign[];
  units: AsUnit[];
  /** Per campaign id, what could not be carried over (a BattleTech Tools backup only). */
  left: { name: string; lines: string[] }[];
  /** Sentences for the player: things skipped or left out. */
  notes: string[];
}

/** A started sortie and a sortie's game link name a game that is not on this device, so they are not carried. */
function withoutGames(c: AcesCampaign): { campaign: AcesCampaign; changed: boolean } {
  const linked = c.started !== undefined || c.sorties.some((s) => s.gameId !== undefined);
  if (!linked) return { campaign: c, changed: false };
  const copy: AcesCampaign = { ...c, sorties: c.sorties.map((s) => ({ ...s })) };
  delete copy.started;
  for (const s of copy.sorties) delete s.gameId;
  return { campaign: copy, changed: true };
}

export function readImport(file: unknown, haveUnits: readonly AsUnit[]): { ok: true; read: ImportRead } | { ok: false; message: string } {
  if (!isObject(file)) return { ok: false, message: "This is not a campaign file." };
  const big = capsProblem(file);
  if (big) return { ok: false, message: big };
  if (looksLikeJbtBackup(file)) {
    const result = convertJbtBackup(file, haveUnits);
    if (result.campaigns.length === 0) {
      return { ok: false, message: ["This backup holds no Aces campaigns we could read.", ...result.skipped, ...(result.hasCardLibrary ? [JBT_LIBRARY_NOTE] : [])].join(" ") };
    }
    const dedup = new Map<string, AsUnit>();
    for (const c of result.campaigns) for (const u of c.units) dedup.set(u.id, u);
    return {
      ok: true,
      read: {
        source: "jbt",
        campaigns: result.campaigns.map((c) => c.campaign),
        units: [...dedup.values()],
        left: result.campaigns.map((c) => ({ name: c.campaign.name, lines: c.left })),
        notes: [...result.skipped, ...(result.hasCardLibrary ? [JBT_LIBRARY_NOTE] : [])],
      },
    };
  }
  if (file.app !== "salvage-rights") return { ok: false, message: "This file was not made by Salvage Rights, and it is not a BattleTech Tools backup." };
  if (file.kind !== CAMPAIGN_FILE_KIND) return { ok: false, message: "This file does not hold Aces campaigns." };
  if (file.version !== 1) return { ok: false, message: "This file is from a version this app cannot read." };
  if (!Array.isArray(file.campaigns) || file.campaigns.length > CAPS.campaigns) return { ok: false, message: `A campaign file holds at most ${String(CAPS.campaigns)} campaigns.` };
  if (!Array.isArray(file.units) || file.units.length > CAPS.units) return { ok: false, message: `A campaign file holds at most ${String(CAPS.units)} units.` };
  const badCampaign = file.campaigns.findIndex((c) => !isReadableCampaign(c));
  if (badCampaign >= 0) return { ok: false, message: `Campaign ${String(badCampaign + 1)} in this file is incomplete or damaged.` };
  const badUnit = file.units.findIndex((u) => !isAsUnit(u));
  if (badUnit >= 0) return { ok: false, message: `Unit ${String(badUnit + 1)} in this file is incomplete or damaged.` };
  const cleaned = (file.campaigns as AcesCampaign[]).map(withoutGames);
  return {
    ok: true,
    read: {
      source: "salvage-rights",
      campaigns: cleaned.map((c) => c.campaign),
      units: (file.units as AsUnit[]).map(migrated),
      left: [],
      notes: cleaned.some((c) => c.changed) ? ["A sortie that was started but not recorded is not carried over; start it again from the campaign."] : [],
    },
  };
}

/** The same value whatever the order its keys were written in. */
const canonical = (v: unknown): string => JSON.stringify(v, (_key, value: unknown) => (isObject(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value));

export interface ImportPlan {
  /** Campaigns whose id is new here. */
  add: AcesCampaign[];
  /** Campaigns whose id is here with other contents: the player picks replace or keep both. */
  conflicts: AcesCampaign[];
  /** Campaigns already here, exactly as in the file. */
  same: number;
  /** Units whose id is new here. */
  addUnits: AsUnit[];
  /** Units whose id is here with other contents: ours stay. */
  keptUnits: number;
  /** Roster units of the incoming campaigns that are in neither the file nor this device. */
  missingUnits: number;
}

export function planCampaignImport(incoming: { campaigns: readonly AcesCampaign[]; units: readonly AsUnit[] }, have: { campaigns: readonly AcesCampaign[]; units: readonly AsUnit[] }): ImportPlan {
  const mine = new Map(have.campaigns.map((c) => [c.id, c]));
  const myUnits = new Map(have.units.map((u) => [u.id, u]));
  const plan: ImportPlan = { add: [], conflicts: [], same: 0, addUnits: [], keptUnits: 0, missingUnits: 0 };
  for (const c of incoming.campaigns) {
    const old = mine.get(c.id);
    if (!old) plan.add.push(c);
    else if (canonical(old) === canonical(c)) plan.same += 1;
    else plan.conflicts.push(c);
  }
  for (const u of incoming.units) {
    const old = myUnits.get(u.id);
    if (!old) plan.addUnits.push(u);
    else if (canonical(old) !== canonical(u)) plan.keptUnits += 1;
  }
  const known = new Set([...have.units, ...incoming.units].map((u) => u.id));
  const wanted = new Set([...plan.add, ...plan.conflicts].flatMap((c) => c.roster.map((r) => r.unitId)));
  plan.missingUnits = [...wanted].filter((id) => !known.has(id)).length;
  return plan;
}

/** The incoming campaign saved beside the one that is here: a new id and a name that says so. */
export const keepBoth = (c: AcesCampaign, id: string): AcesCampaign => ({ ...c, id, name: `${c.name} (imported copy)` });

export function downloadCampaigns(campaigns: readonly AcesCampaign[], have: readonly AsUnit[], single: boolean): void {
  const first = campaigns[0];
  const base = single && first ? first.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "";
  downloadJson(`${base || "my-campaigns"}.aces-campaigns.json`, toCampaignFile(campaigns, have));
}
