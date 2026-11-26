// An Alpha Strike force: units from the roster with a Skill each, and the totals. Pure; nothing here throws on odd input.
import { AS_EDITION, AS_EDITIONS, AS_PV_STEPS, AS_UNIT_TYPES, ARTX_FAMILY, DEFAULT_SKILL } from "../data/alpha-strike";
import { AS_OFFICERS_PER, AS_SCAS, AS_SCA_BY_AVERAGE_SKILL, AS_SPAS, AS_SPA_BY_SKILL, AS_SPA_UNITS_PER } from "../data/as-abilities";
import type { AsSca, AsSpa } from "../data/as-abilities";
import { AS_FORMATIONS, AS_GROUND_TYPES, AS_ORGANISATIONS, AS_ORGANISATION_PAGE } from "../data/as-formations";
import type { AsFormationType, AsOrganisation, AsReq, AsUnitTest } from "../data/as-formations";
import { RULES_LEVELS } from "../data/chassis";
import type { RulesLevel } from "../data/chassis";
import { DEFAULT_LEVEL, LEVEL_ORDER, levelAtLeast } from "./levels";
import type { AsDamage, AsFinding, AsMove, AsUnit } from "./as-unit";

export interface AsMember {
  /** A roster unit. */
  unitId: string;
  /** 0-7 (Skill Rating Table, ASCE p. 29). */
  skill: number;
  /** The player's name for the pilot. */
  pilot?: string;
  /** A group label typed before groups existed (lance, Star); kept and shown, no longer set. */
  formation?: string;
  /** The id of the group (in `force.groups`) this unit belongs to; none means it is not in a group. */
  group?: string;
  /** Named as the force commander or a key officer (ASCE p. 102); a Command Lance needs one in it. */
  officer?: "commander" | "key";
  /** Special pilot abilities (pp. 92-101) given in force building, step 6. */
  spas?: AsSpaPick[];
}

/** One pilot ability picked: its id in `AS_SPAS`, and the points put into it where the book lets the player buy 1 to 4. */
export interface AsSpaPick {
  id: string;
  points?: number;
}

/** A group inside a force: a lance, Star or Level II and the rest of the p. 113 table, with the formation type the player designates (p. 116). */
export interface AsGroup {
  id: string;
  name: string;
  /** An organisation id from `AS_ORGANISATIONS`. */
  org?: string;
  /** A formation type id from `AS_FORMATIONS`. */
  formation?: string;
  /** The bonus ability picked, where the formation's bonus is one pick from a list. */
  bonus?: string;
}

export interface AsForce {
  schema: 1;
  kind: "as-force";
  id: string;
  editionId: string;
  name: string;
  pvLimit?: number;
  members: AsMember[];
  groups?: AsGroup[];
  /** Special command abilities chosen for the force (pp. 102-109), by id in `AS_SCAS`. */
  commands?: string[];
  notes?: string;
}

export function newAsForce(id: string, name = "New force"): AsForce {
  return { schema: 1, kind: "as-force", id, editionId: AS_EDITION.id, name, members: [] };
}

/** A copy under a new id with the same units, skills and pilots, named so the two can be told apart. */
export function duplicateForce(force: AsForce, id: string): AsForce {
  return { ...structuredClone(force), id, name: `${force.name} copy`.trim() };
}

/** How many points one Skill step costs or gains at this base PV (ASCE p. 29), counting the footnote past the last row. */
export function pvStep(base: number, table: "decrease" | "increase"): number {
  const { rows, beyond } = AS_PV_STEPS[table];
  const row = rows.findIndex((top) => base <= top);
  if (row >= 0) return row + 1;
  const last = rows[rows.length - 1] ?? 0;
  return rows.length + Math.ceil((base - last) / beyond);
}

/** A Skill kept to a whole number from 0 to 7. */
export const clampSkill = (skill: number): number => Math.min(7, Math.max(0, Math.round(Number.isFinite(skill) ? skill : DEFAULT_SKILL)));

/** A unit's PV for a pilot of this Skill (ASCE p. 29): the steps away from Skill 4 times the table's step, never below 1. */
export function skillAdjustedPv(base: number, skill: number): number {
  const steps = DEFAULT_SKILL - clampSkill(skill);
  const change = steps === 0 ? 0 : steps * pvStep(base, steps > 0 ? "increase" : "decrease");
  return Math.max(1, base + change);
}

export interface ForceLine {
  member: AsMember;
  /** Absent when the roster no longer holds the unit. */
  unit?: AsUnit;
  base: number;
  adjusted: number;
}

export interface ForceTotals {
  lines: ForceLine[];
  /** Members whose unit is in the roster; the others count nothing. */
  count: number;
  missing: number;
  total: number;
  /** Positive while under the limit, negative over it; absent when the force has no limit. */
  room?: number;
}

export function forceTotals(force: AsForce, roster: ReadonlyMap<string, AsUnit>): ForceTotals {
  const lines = force.members.map((member): ForceLine => {
    const unit = roster.get(member.unitId);
    const base = unit?.card.pv ?? 0;
    return { member, unit, base, adjusted: unit ? skillAdjustedPv(base, member.skill) : 0 };
  });
  const total = lines.reduce((sum, line) => sum + line.adjusted, 0);
  const count = lines.filter((line) => line.unit).length;
  return { lines, count, missing: lines.length - count, total, room: force.pvLimit === undefined ? undefined : force.pvLimit - total };
}

/**
 * What the player has set for the game being played, the one setting every Alpha Strike screen reads: the rules level (Standard until
 * chosen), the edition, the year (later units are out of it) and the tech base to pick from.
 */
export interface PlayFilter {
  rulesLevel?: RulesLevel;
  editionId?: string;
  year?: number;
  techBase?: "inner-sphere" | "clan";
}

/** The rules level the player plays at: the one set, else Standard. */
export const playLevel = (filter: PlayFilter): RulesLevel => filter.rulesLevel ?? DEFAULT_LEVEL;

/** The level a unit asks for: the one it states, else Standard (a unit typed by hand states none). */
export const unitLevel = (unit: Pick<AsUnit, "rulesLevel">): RulesLevel => (unit.rulesLevel !== undefined && LEVEL_ORDER.includes(unit.rulesLevel) ? unit.rulesLevel : DEFAULT_LEVEL);

/**
 * Whether a unit may be picked under the filter: its level is within the one played, and it is not dated after the game year. A unit with
 * no year, or a mixed or unstated tech base, is never ruled out by that part.
 */
export function inPlay(unit: AsUnit, filter: PlayFilter): boolean {
  if (!levelAtLeast(playLevel(filter), unitLevel(unit))) return false;
  if (filter.year !== undefined && typeof unit.year === "number" && unit.year > filter.year) return false;
  if (filter.techBase !== undefined && (unit.techBase === "inner-sphere" || unit.techBase === "clan") && unit.techBase !== filter.techBase) return false;
  return true;
}

/** A filter read back from storage: anything that is not a known level or edition, a year or a known tech base is dropped. */
export function readFilter(v: unknown): PlayFilter {
  const o = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  return {
    ...(LEVEL_ORDER.includes(o.rulesLevel as RulesLevel) ? { rulesLevel: o.rulesLevel as RulesLevel } : {}),
    ...(typeof o.editionId === "string" && AS_EDITIONS.some((e) => e.id === o.editionId) ? { editionId: o.editionId } : {}),
    ...(typeof o.year === "number" && Number.isInteger(o.year) ? { year: o.year } : {}),
    ...(o.techBase === "inner-sphere" || o.techBase === "clan" ? { techBase: o.techBase } : {}),
  };
}

/** What the play setting says about a unit already chosen: advice, never a refusal (hide, do not mark: a unit in use stays visible and is reported). */
export function playFindings(unit: AsUnit, filter: PlayFilter): AsFinding[] {
  const out: AsFinding[] = [];
  const at = playLevel(filter);
  const needs = unitLevel(unit);
  if (!levelAtLeast(at, needs)) out.push({ id: "play-level", text: `This unit asks for the ${RULES_LEVELS.find((l) => l.id === needs)?.label ?? needs} level and the game is set to ${RULES_LEVELS.find((l) => l.id === at)?.label ?? at}.`, cite: "Set on the Alpha Strike page" });
  if (filter.year !== undefined && typeof unit.year === "number" && unit.year > filter.year) out.push({ id: "play-year", text: `This unit is dated ${String(unit.year)}, after the game year ${String(filter.year)}.`, cite: "Set on the Alpha Strike page" });
  return out;
}

// ---- Groups and formations (ASCE pp. 113 and 115-124) ----------------------------------------------------------------------

/** The groups of a force; entries that are not groups are ignored and a missing name reads as empty, so a damaged record never throws. */
export const groupsOf = (force: Pick<AsForce, "groups">): AsGroup[] =>
  (Array.isArray(force.groups) ? (force.groups as unknown[]) : [])
    .filter((g): g is AsGroup => typeof g === "object" && g !== null && typeof (g as AsGroup).id === "string")
    .map((g) => (typeof g.name === "string" ? g : { ...g, name: "" })); // a group saved with no usable name reads as unnamed

export const newGroup = (id: string, name = "New group"): AsGroup => ({ id, name });

export const findOrganisation = (id: string | undefined): AsOrganisation | undefined => AS_ORGANISATIONS.find((o) => o.id === id);
export const findFormation = (id: string | undefined): AsFormationType | undefined => AS_FORMATIONS.find((f) => f.id === id);

export interface GroupTotals {
  group: AsGroup;
  lines: ForceLine[];
  /** Units in the group that are still in the roster. */
  count: number;
  total: number;
}

/** Totals for each group, and for the units in no group (a unit naming a group that is gone counts as in none). */
export function groupTotals(force: AsForce, totals: ForceTotals): { groups: GroupTotals[]; ungrouped: GroupTotals } {
  const groups = groupsOf(force);
  const ids = new Set(groups.map((g) => g.id));
  const make = (group: AsGroup, lines: ForceLine[]): GroupTotals => ({ group, lines, count: lines.filter((l) => l.unit).length, total: lines.reduce((sum, l) => sum + l.adjusted, 0) });
  return {
    groups: groups.map((g) => make(g, totals.lines.filter((l) => l.member.group === g.id))),
    ungrouped: make({ id: "", name: "Not in a group" }, totals.lines.filter((l) => l.member.group === undefined || !ids.has(l.member.group))),
  };
}

/** A damage figure for a comparison: none is 0 and minimal damage (0*) is a half point, as the damage aids count it. */
const damageValue = (d: AsDamage | undefined): number => (d === null || d === undefined ? 0 : d.minimal ? 0.5 : d.value);

const best = (move: AsMove[], pick: (m: AsMove) => boolean): number => move.filter(pick).reduce((top, m) => Math.max(top, m.inches), 0);

/** Whether one unit passes a test (every field set must hold; `or` needs one of its tests). */
export function unitPasses(unit: AsUnit, member: AsMember, test: AsUnitTest): boolean {
  const c = unit.card;
  if (test.size?.min !== undefined && c.size < test.size.min) return false;
  if (test.size?.max !== undefined && c.size > test.size.max) return false;
  if (test.role && !test.role.some((r) => r.toLowerCase() === (c.role ?? "").toLowerCase())) return false;
  if (test.move !== undefined && best(c.move, () => true) < test.move) return false;
  if (test.ground !== undefined && best(c.move, (m) => m.mode !== "j") < test.ground) return false;
  if (test.jump !== undefined && best(c.move, (m) => m.mode === "j") < test.jump) return false;
  if (test.armor !== undefined && c.armor < test.armor) return false;
  for (const range of ["s", "m", "l"] as const) {
    const need = test.dmg?.[range];
    if (need !== undefined && damageValue(c.damage[range]) < need) return false;
  }
  if (test.special && !c.specials.some((s) => test.special?.some((code) => (code === "ARTX" ? ARTX_FAMILY.test(s.code.toUpperCase()) : s.code.toUpperCase() === code)))) return false;
  if (test.type && !test.type.includes(c.type)) return false;
  if (test.officer && member.officer === undefined) return false;
  if (test.or && !test.or.some((t) => unitPasses(unit, member, t))) return false;
  return true;
}

const roundUp = (x: number): number => Math.ceil(x - 1e-9);

/** Units a share of the group asks for: rounded up (p. 116), or normally where the formation says so; "over" means more than the share. */
const shareNeed = (n: number, pct: number, over?: boolean, round?: "normal"): number =>
  over ? Math.floor((n * pct) / 100 + 1e-9) + 1 : round === "normal" ? Math.round((n * pct) / 100) : roundUp((n * pct) / 100);

const joinOr = (items: string[]): string => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1] ?? ""}`);

/** One test as a phrase, in our words and from the structure. */
export function describeTest(test: AsUnitTest): string {
  const parts: string[] = [];
  const { size, dmg } = test;
  if (size) parts.push(size.min !== undefined && size.max !== undefined ? (size.min === size.max ? `Size ${String(size.min)}` : `Size ${String(size.min)} to ${String(size.max)}`) : size.min !== undefined ? `Size ${String(size.min)} or more` : `Size ${String(size.max)} or less`);
  if (test.role) parts.push(`role ${joinOr(test.role)}`);
  if (test.move !== undefined) parts.push(`Move ${String(test.move)}" or more, jumping or not`);
  if (test.ground !== undefined) parts.push(`ground Move ${String(test.ground)}" or more`);
  if (test.jump !== undefined) parts.push(test.jump <= 1 ? "can jump" : `jump Move ${String(test.jump)}" or more`);
  if (test.armor !== undefined) parts.push(`Armor ${String(test.armor)} or more`);
  for (const [key, name] of [["s", "Short"], ["m", "Medium"], ["l", "Long"]] as const) {
    const v = dmg?.[key];
    if (v !== undefined) parts.push(`${name} damage ${v === 0.5 ? "above 0" : `${String(v)} or more`}`);
  }
  if (test.special) parts.push(`has ${joinOr(test.special.map((c) => (c === "ARTX" ? "an artillery (ART) special" : c)))}`);
  if (test.type) parts.push(`unit type ${joinOr(test.type)}`);
  if (test.officer) parts.push("named as an officer");
  if (test.or) parts.push(test.or.map((t) => `(${describeTest(t)})`).join(" or "));
  return parts.join(", ");
}

/** One requirement as a sentence, from its structure. */
export function describeReq(req: AsReq): string {
  switch (req.k) {
    case "all": return `Every unit: ${describeTest(req.test)}`;
    case "share": return `${req.over ? "More than" : "At least"} ${String(req.pct)}% of the units: ${describeTest(req.test)}`;
    case "count": return `At least ${String(req.n)} ${req.n === 1 ? "unit" : "units"}: ${describeTest(req.test)}`;
    case "none": return `No unit: ${describeTest(req.test)}`;
    case "pairs": return `In an all-vehicle group, at least ${String(req.n)} matched pairs (same chassis and model): ${describeTest(req.test)}`;
    case "any": return req.of.map(describeReq).join(", or ");
  }
}

interface Entry {
  unit: AsUnit;
  member: AsMember;
}

interface ReqResult {
  ok: boolean;
  /** What is missing, with the group's own figure; empty when the requirement is met. */
  text: string;
}

function checkReq(req: AsReq, entries: Entry[]): ReqResult {
  const n = entries.length;
  const pass = (test: AsUnitTest): number => entries.filter((e) => unitPasses(e.unit, e.member, test)).length;
  const gap = (have: number, need: number): ReqResult => ({ ok: have >= need, text: have >= need ? "" : `${describeReq(req)} (the group has ${String(have)}, needs ${String(need)})` });
  switch (req.k) {
    case "all": return gap(pass(req.test), n);
    case "share": return gap(pass(req.test), shareNeed(n, req.pct, req.over, req.round));
    case "count": return gap(pass(req.test), req.n);
    case "none": {
      const have = pass(req.test);
      return { ok: have === 0, text: have === 0 ? "" : `${describeReq(req)} (the group has ${String(have)})` };
    }
    case "pairs": {
      if (!entries.every((e) => e.unit.card.type === "CV" || e.unit.card.type === "SV")) return { ok: true, text: "" };
      const counts = new Map<string, number>();
      for (const e of entries.filter((e) => unitPasses(e.unit, e.member, req.test))) {
        const key = `${e.unit.name.chassis}|${e.unit.name.model}`.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return gap([...counts.values()].reduce((sum, c) => sum + Math.floor(c / 2), 0), req.n);
    }
    case "any": {
      const results = req.of.map((r) => checkReq(r, entries));
      return results.some((r) => r.ok) ? { ok: true, text: "" } : { ok: false, text: `Either ${results.map((r) => r.text).join(", or ")}` };
    }
  }
}

/** The requirements of a type, with those of the type it adds to first, and the unit types it is built of. */
export function requirementsOf(type: AsFormationType): AsReq[] {
  const base = type.adds ? findFormation(type.adds) : undefined;
  const types = type.types ?? (type.line === "ground" ? AS_GROUND_TYPES : undefined);
  return [...(types ? [{ k: "all", test: { type: types } } satisfies AsReq] : []), ...(base ? requirementsOf(base) : []), ...type.requires];
}

export interface FormationCheck {
  type: AsFormationType;
  met: boolean;
  /** The unit role of the formation that, held by every unit, stands in for the requirements (p. 116). */
  waivedBy?: string;
  missing: string[];
}

/** Whether the members meet a formation type. A group with no unit in the roster meets nothing. */
export function checkFormation(type: AsFormationType, lines: readonly ForceLine[]): FormationCheck {
  const entries = lines.flatMap((l) => (l.unit ? [{ unit: l.unit, member: l.member }] : []));
  if (entries.length === 0) return { type, met: false, missing: ["The group has no units."] };
  if (type.ideal && entries.every((e) => (e.unit.card.role ?? "").toLowerCase() === type.ideal?.toLowerCase())) return { type, met: true, waivedBy: type.ideal, missing: [] };
  const missing = requirementsOf(type).map((r) => checkReq(r, entries)).filter((r) => !r.ok).map((r) => r.text);
  return { type, met: missing.length === 0, missing };
}

/** Every formation type the group meets, in the book's order. */
export const formationsMet = (lines: readonly ForceLine[]): AsFormationType[] => AS_FORMATIONS.filter((f) => checkFormation(f, lines).met);

/** What the bonus of a formation gives, as a figure the group's size decides: the Battle Lance's Lucky ability is its unit count plus two points (p. 117). */
export function bonusFigure(type: AsFormationType, unitCount: number): string | undefined {
  return type.bonus.names.includes("Lucky") ? `Lucky, ${String(unitCount + 2)} points` : undefined;
}

/** Advice on a group that does not match its organisation's unit count (p. 113); never a refusal. */
export function groupFindings(group: AsGroup, count: number): string[] {
  const org = findOrganisation(group.org);
  if (!org?.units || count === 0) return [];
  const [min, max] = org.units;
  if (count >= min && count <= max) return [];
  return [`A ${org.name} is ${org.definition} (ASCE p. ${String(AS_ORGANISATION_PAGE)}); this group has ${String(count)}.`];
}

// ---- Pilot and command abilities (ASCE pp. 92-94, 102-109, steps 6 and 7 on p. 112) --------------------------------------------

/** Whether a unit is of an ability's kind: a type code, or `vtol`, `airborne` (the aerospace types and VTOLs) or `ground` (not airborne). */
export function unitIsKind(unit: AsUnit, kind: string): boolean {
  const { type, move } = unit.card;
  const vtol = (type === "CV" || type === "SV") && move.some((m) => m.mode === "v");
  const airborne = vtol || AS_UNIT_TYPES.some((t) => t.code === type && t.aerospace);
  if (kind === "vtol") return vtol;
  if (kind === "airborne") return airborne;
  if (kind === "ground") return !airborne;
  return kind === type;
}

export const unitAllowsSpa = (unit: AsUnit, spa: AsSpa): boolean => spa.kinds === undefined || spa.kinds.some((k) => unitIsKind(unit, k));

export const findSpa = (id: string): AsSpa | undefined => AS_SPAS.find((s) => s.id === id);
export const findSca = (id: string): AsSca | undefined => AS_SCAS.find((s) => s.id === id);

/** What one pick costs: the fixed cost, or for a ranged one the points the player put in, held to the range (one point where none is given). */
export function spaCost(spa: AsSpa, pick: AsSpaPick): number {
  if (typeof spa.cost === "number") return spa.cost;
  const [min, max] = spa.cost;
  return Math.min(max, Math.max(min, Math.round(Number.isFinite(pick.points) ? (pick.points as number) : min)));
}

/** The limits a Skill puts on one unit's SPAs (p. 92); a Skill below Green is held to Green's none. */
export const spaLimits = (skill: number): { count: number; points: number } => AS_SPA_BY_SKILL[Math.min(5, clampSkill(skill))] ?? { count: 0, points: 0 };

const picksOf = (member: AsMember): AsSpaPick[] => (Array.isArray(member.spas) ? member.spas.filter((p): p is AsSpaPick => typeof p === "object" && p !== null && typeof p.id === "string") : []);

export interface MemberSpas {
  picks: AsSpaPick[];
  count: number;
  points: number;
  limit: { count: number; points: number };
  /** Advice, in our words, on anything over a limit or not allowed for the unit's type. */
  problems: string[];
}

/** The SPAs of one member against the Skill table and the unit's type. The book's limits are advice here, never a refusal. */
export function memberSpas(member: AsMember, unit: AsUnit | undefined): MemberSpas {
  const picks = picksOf(member);
  const limit = spaLimits(member.skill);
  const known = picks.flatMap((p) => { const spa = findSpa(p.id); return spa ? [{ p, spa }] : []; });
  const points = known.reduce((sum, { p, spa }) => sum + spaCost(spa, p), 0);
  const problems: string[] = [];
  if (known.length > limit.count) problems.push(`Skill ${String(clampSkill(member.skill))} allows ${String(limit.count)} ${limit.count === 1 ? "ability" : "abilities"}; this unit has ${String(known.length)} (ASCE p. 92).`);
  if (points > limit.points) problems.push(`Skill ${String(clampSkill(member.skill))} allows ${String(limit.points)} points of abilities; this unit has ${String(points)} (p. 92).`);
  if (unit) for (const { spa } of known) if (!unitAllowsSpa(unit, spa)) problems.push(`${spa.name} is not for this unit type (p. ${String(spa.page)}).`);
  return { picks, count: known.length, points, limit, problems };
}

export interface ForceSpas {
  /** Members holding at least one SPA. */
  holders: number;
  /** Units of the force that may hold SPAs: one per 12 (step 6, p. 112), at least one. */
  allowed: number;
  problems: string[];
}

export function forceSpas(force: AsForce, totals: ForceTotals): ForceSpas {
  const holders = force.members.filter((m) => picksOf(m).length > 0).length;
  // Step 6 and p. 92 say not more than one unit for every 12: a whole 12 earns one, and a force under 12 still has its one.
  const allowed = Math.max(1, Math.floor(totals.count / AS_SPA_UNITS_PER));
  return { holders, allowed, problems: holders > allowed ? [`Step 6 allows SPAs on ${String(allowed)} ${allowed === 1 ? "unit" : "units"} in a force of ${String(totals.count)} (p. 112); ${String(holders)} have them.`] : [] };
}

/** The average Skill of the units in the force, rounded normally (p. 102); none for a force with no unit. */
export function averageSkill(force: AsForce, totals: ForceTotals): number | undefined {
  const skills = totals.lines.filter((l) => l.unit).map((l) => clampSkill(l.member.skill));
  return skills.length === 0 ? undefined : Math.round(skills.reduce((a, b) => a + b, 0) / skills.length);
}

export interface ForceScas {
  average?: number;
  /** How many the average Skill allows; for Green and lower, the one general specialization instead of none. */
  allowed: number;
  chosen: AsSca[];
  officers: number;
  officersAllowed: number;
  problems: string[];
}

/** The command abilities chosen against the average Skill, their own conditions, and the one-officer-per-six rule (p. 102). */
export function forceScas(force: AsForce, totals: ForceTotals): ForceScas {
  const ids = Array.isArray(force.commands) ? force.commands : [];
  const chosen = ids.flatMap((id) => { const s = findSca(id); return s ? [s] : []; });
  const average = averageSkill(force, totals);
  const allowed = AS_SCA_BY_AVERAGE_SKILL[Math.min(7, average ?? 4)] ?? 0;
  const officers = force.members.filter((m) => m.officer !== undefined).length;
  const officersAllowed = Math.max(1, Math.ceil(totals.count / AS_OFFICERS_PER));
  const problems: string[] = [];
  if (chosen.length > allowed) problems.push(`An average Skill of ${String(average ?? "?")} allows ${String(allowed)} command ${allowed === 1 ? "ability" : "abilities"}; ${String(chosen.length)} are chosen (p. 102).`);
  if (average !== undefined && average >= 5) for (const s of chosen) if (!s.general) problems.push(`${s.name} is not one of the general specializations a Green or lower force may take (p. 102).`);
  for (const s of chosen) {
    if (s.needs && !chosen.some((c) => c.id === s.needs)) problems.push(`${s.name} also needs ${findSca(s.needs)?.name ?? s.needs} (p. ${String(s.page)}).`);
    if (s.maxAverageSkill !== undefined && average !== undefined && average > s.maxAverageSkill) problems.push(`${s.name} is for forces averaging Veteran or better (p. ${String(s.page)}).`);
    if (s.kinds && totals.lines.some((l) => l.unit && !s.kinds?.some((k) => l.unit && unitIsKind(l.unit, k)))) problems.push(`${s.name} is for airborne units only (p. ${String(s.page)}).`);
  }
  if (officers > officersAllowed) problems.push(`One key officer for every 6 units allows ${String(officersAllowed)} officers in a force of ${String(totals.count)}; ${String(officers)} are named (p. 102).`);
  const commanders = force.members.filter((m) => m.officer === "commander").length;
  if (chosen.length > 0 && commanders !== 1) problems.push(commanders === 0 ? "Command abilities need one officer named as the force commander (p. 102)." : "Only one officer is the force commander (p. 102).");
  return { average, allowed, chosen, officers, officersAllowed, problems };
}
