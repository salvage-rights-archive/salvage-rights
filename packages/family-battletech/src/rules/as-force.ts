// An Alpha Strike force: units from the roster with a Skill each, and the totals. Pure; nothing here throws on odd input.
import { AS_EDITION, AS_EDITIONS, AS_PV_STEPS, DEFAULT_SKILL } from "../data/alpha-strike";
import { RULES_LEVELS } from "../data/chassis";
import type { RulesLevel } from "../data/chassis";
import { DEFAULT_LEVEL, LEVEL_ORDER, levelAtLeast } from "./levels";
import type { AsFinding, AsUnit } from "./as-unit";

export interface AsMember {
  /** A roster unit. */
  unitId: string;
  /** 0-7 (Skill Rating Table, ASCE p. 29). */
  skill: number;
  /** The player's name for the pilot. */
  pilot?: string;
  /** The player's group label (lance, Star); formation rules come later. */
  formation?: string;
}

export interface AsForce {
  schema: 1;
  kind: "as-force";
  id: string;
  editionId: string;
  name: string;
  pvLimit?: number;
  members: AsMember[];
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
