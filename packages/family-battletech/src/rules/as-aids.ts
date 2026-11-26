// The arithmetic behind the Alpha Strike play aids: the odds and expected damage at each range, the heat scale, and which optional
// parts a rules level offers. Pure; figures come from data/alpha-strike.ts (ASCE 2024 printing, errata v7.02).
import { AS_HEAT, AS_OPTIONAL_LEVEL, AS_RANGE_ROWS } from "../data/alpha-strike";
import type { RulesLevel } from "../data/chassis";
import { odds2d6, targetNumber } from "./as-attack";
import type { AttackInput, RangeId } from "./as-attack";
import type { AsDamage } from "./as-unit";
import { levelAtLeast } from "./levels";

/** What a hit at 0* is worth on average: it rolls 1D6 and deals 1 on a 4 or more (ASCE p. 43; errata v7.02, p. 50). */
export const MINIMAL_DAMAGE_EXPECTED = 0.5;

/** Whether a rules level offers the optional rules (Extreme range, a second target) the aids show. Below it they are left out, not marked. */
export const offersOptional = (level: RulesLevel): boolean => levelAtLeast(level, AS_OPTIONAL_LEVEL);

/** Damage at Extreme range: the Long value less 1, least 0 (ASCE p. 163). */
export const extremeDamage = (long: number): number => Math.max(0, long - 1);

export interface RangeOdds {
  id: RangeId;
  label: string;
  /** Target Number at this range with every other answer as given. */
  tn: number;
  /** 0 to 1. */
  chance: number;
  /** Damage the card gives at this range, when the player has entered it. */
  damage?: number;
  /** The damage is 0*, minimal damage. */
  minimal?: boolean;
  /** The card shows a dash: no weapon attack at this range. */
  none?: boolean;
  /** The chance to hit times the damage. */
  expected?: number;
}

/**
 * The Target Number, the chance to hit and the expected damage at each range for one attacker and target. The distance in `input` is
 * ignored: each range is measured at its far edge (halved when the attacker is underwater, as the range rule does). Extreme is listed
 * only when asked for, and takes its damage from Long. An attack that is not allowed (a sprinter) gives no rows.
 */
export function oddsByRange(input: Omit<AttackInput, "distance">, damage: Partial<Record<"S" | "M" | "L", AsDamage>>, extreme: boolean): RangeOdds[] {
  const rows: RangeOdds[] = [];
  const underwater = (input.flags ?? []).includes("underwater");
  for (const row of AS_RANGE_ROWS) {
    if (row.id === "H" || (row.id === "E" && !extreme)) continue;
    const distance = (row.to ?? 0) / (underwater ? 2 : 1);
    const result = targetNumber({ ...input, distance, extreme: row.id === "E" });
    if (result.blocked) return [];
    const chance = odds2d6(result.total);
    const long = damage.L;
    // Extreme takes Long less 1, so a dash at Long is a dash here.
    const given: AsDamage | undefined = row.id === "E" ? (long === undefined || long === null ? long : { value: extremeDamage(long.value) }) : damage[row.id as "S" | "M" | "L"];
    const odds: RangeOdds = { id: row.id as RangeId, label: row.label, tn: result.total, chance };
    if (given === null) odds.none = true;
    else if (given !== undefined) {
      odds.damage = given.value;
      if (given.minimal && given.value === 0) odds.minimal = true;
      odds.expected = chance * (odds.minimal ? MINIMAL_DAMAGE_EXPECTED : given.value);
    }
    rows.push(odds);
  }
  return rows;
}

export interface HeatEffect {
  level: number;
  /** Added to the Target Number of weapon attacks. */
  attack: number;
  /** Inches taken off ground Move. */
  moveLoss: number;
  /** Taken off TMM. */
  tmmLoss: number;
  shutdown: boolean;
}

/** What a level on the heat scale does (ASCE p. 52); a jumping unit loses neither Move nor TMM. */
export const heatEffect = (level: number): HeatEffect => ({
  level,
  attack: level,
  moveLoss: AS_HEAT.inchesPerLevel * level,
  tmmLoss: level >= AS_HEAT.tmmFromLevel ? 1 : 0,
  shutdown: level >= AS_HEAT.max,
});
