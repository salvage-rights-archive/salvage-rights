// The Alpha Strike attack: the Target Number built from its parts, the odds of a 2D6 roll, the optional multiple attack rolls and the
// physical attack damage. Pure; shared by Alpha Strike play and Aces. Every part names its page; labels are our own short words.
import {
  AS_ANTI_MECH_EXTRA,
  AS_ATTACKER_MOVE,
  AS_ATTACK_FLAGS,
  AS_EMPLACEMENT_ATTACKER,
  AS_FIRE_CONTROL,
  AS_HEAT_CITE,
  AS_HIT_LIMITS,
  AS_PARTIAL_COVER_TYPES,
  AS_PHYSICAL_DAMAGE_CITE,
  AS_PHYSICAL_TYPES,
  AS_RANGE_BRACKETS,
  AS_RANGE_CITE,
  AS_STEALTH,
  AS_TARGET_MOVE,
  AS_TARGET_TYPE_ROWS,
  AS_WEAPON_ONLY_FLAGS,
  asceCite,
  type AsAttackFlag,
  type AsPhysicalType,
} from "../data/alpha-strike";

export type AttackerMove = "standstill" | "immobile" | "ground" | "jump" | "sprint";
export type TargetMove = "standstill" | "ground" | "jump" | "immobile";
export type RangeId = "S" | "M" | "L" | "E";

export interface AttackPart {
  id: string;
  label: string;
  value: number;
  cite: string;
}

export interface AttackInput {
  /** The attacker's Skill (the base Target Number). */
  skill: number;
  /** Card type codes: BM, CV, BA, CI, BD (emplacement) and so on. */
  attackerType: string;
  attackerMove: AttackerMove;
  /** Inches from base edge to base edge; ignored for physical attacks. */
  distance: number;
  targetType: string;
  /** The target's current TMM (after damage) and how it moved. Standstill reads as 0, immobile as -4. */
  targetTmm: number;
  targetMove: TargetMove;
  /** Net JMPS# (plus) or JMPW# (minus) of a jumping target. */
  jumpSpecial?: number;
  stealth?: boolean;
  /** The attacker's heat level and Fire Control hits, for weapon attacks. */
  heat?: number;
  fireControlHits?: number;
  /** Terrain and situation terms the player or the game has settled. */
  flags?: AsAttackFlag[];
  /** Indirect fire: how the spotting unit moved, its own movement term counts (Aces p. 3). */
  spotterMove?: AttackerMove;
  spotterType?: string;
  physical?: AsPhysicalType;
  /** An Anti-Mech attack on a unit that carries battle armor. */
  targetCarriesBa?: boolean;
  /** Extreme range is an option and off by default. */
  extreme?: boolean;
}

export interface AttackBlock {
  id: "sprint" | "out-of-range";
  cite: string;
}

export interface AttackResult {
  total: number;
  parts: AttackPart[];
  range: RangeId | null;
  /** Set when the unit may not make this attack at all. */
  blocked?: AttackBlock;
}

const part = (id: string, row: { label: string; cite: string }, value: number): AttackPart => ({ id, label: row.label, value, cite: row.cite });
const isInfantry = (type: string): boolean => type === "CI" || type === "BA";

/** The movement term for one unit that attacks or spots: infantry never use it, an emplacement is immobile. */
function movementPart(id: string, type: string, move: AttackerMove): AttackPart | null {
  if (move === "sprint") return null;
  if (type === "BD") return part(id, AS_EMPLACEMENT_ATTACKER, AS_EMPLACEMENT_ATTACKER.value);
  const row = AS_ATTACKER_MOVE[move];
  if (isInfantry(type) && move !== "ground") return part(id, { label: "Infantry ignore movement", cite: asceCite(42) }, 0);
  return part(id, row, row.value);
}

/** The range bracket of a distance in inches; beyond Long it is Extreme when that option is on, else out of range. */
export function rangeBracket(distance: number, extreme = false): RangeId | null {
  const found = AS_RANGE_BRACKETS.find((b) => distance <= b.upTo);
  if (!found || (found.id === "E" && !extreme)) return null;
  return found.id;
}

export function targetNumber(input: AttackInput): AttackResult {
  if (input.attackerMove === "sprint") return { total: 0, parts: [], range: null, blocked: { id: "sprint", cite: asceCite(38) } };
  const flags = new Set(input.flags ?? []);
  const physical = input.physical;
  const parts: AttackPart[] = [{ id: "skill", label: "Skill", value: input.skill, cite: asceCite(42) }];
  let range: RangeId | null = null;

  const mover = movementPart("attacker-move", input.attackerType, input.attackerMove);
  if (mover) parts.push(mover);
  const spotter = flags.has("indirect") && input.spotterMove !== undefined ? movementPart("spotter-move", input.spotterType ?? "", input.spotterMove) : null;
  if (spotter) parts.push({ ...spotter, label: "Spotter movement" });

  // Target speed: an immobile target (or an emplacement) is -4, a standstill target 0, otherwise its TMM, one more when it jumped.
  const targetMove = input.targetType === "BD" ? "immobile" : input.targetMove;
  if (targetMove === "immobile") parts.push(part("target-move", AS_TARGET_MOVE.immobile, AS_TARGET_MOVE.immobile.value));
  else if (targetMove === "standstill") parts.push(part("target-move", AS_TARGET_MOVE.tmm, 0));
  else {
    parts.push(part("target-move", AS_TARGET_MOVE.tmm, input.targetTmm));
    if (targetMove === "jump") {
      parts.push(part("target-jump", AS_TARGET_MOVE.jumped, AS_TARGET_MOVE.jumped.value));
      if (input.jumpSpecial) parts.push(part("target-jump-jets", AS_TARGET_MOVE.jumpSpecial, input.jumpSpecial));
    }
  }

  if (physical === undefined) {
    range = rangeBracket(flags.has("underwater") ? input.distance * 2 : input.distance, input.extreme);
    if (range === null) return { total: 0, parts: [], range: null, blocked: { id: "out-of-range", cite: AS_RANGE_CITE } };
    const bracket = AS_RANGE_BRACKETS.find((b) => b.id === range);
    parts.push({ id: "range", label: bracket?.label ?? "Range", value: bracket?.value ?? 0, cite: AS_RANGE_CITE });
    if (input.stealth) {
      const table = input.targetType === "BA" ? AS_STEALTH.ba : AS_STEALTH.standard;
      const stealth = table[range === "E" ? "L" : range];
      if (stealth) parts.push({ id: "stealth", label: "Target stealth", value: stealth, cite: AS_STEALTH.cite });
    }
    if (input.heat) parts.push({ id: "heat", label: "Attacker heat", value: input.heat, cite: AS_HEAT_CITE });
    if (input.fireControlHits) parts.push({ id: "fire-control", label: "Fire control hits", value: input.fireControlHits * AS_FIRE_CONTROL.perHit, cite: AS_FIRE_CONTROL.cite });
  } else {
    const kind = AS_PHYSICAL_TYPES[physical];
    parts.push(part("physical", kind, kind.value));
    if (physical === "anti-mech") {
      if (input.attackerType === "CI") parts.push(part("anti-mech-infantry", AS_ANTI_MECH_EXTRA.infantry, AS_ANTI_MECH_EXTRA.infantry.value));
      if (input.targetCarriesBa) parts.push(part("anti-mech-carrier", AS_ANTI_MECH_EXTRA.transporting, AS_ANTI_MECH_EXTRA.transporting.value));
    }
  }

  const targetRow = AS_TARGET_TYPE_ROWS[input.targetType];
  if (targetRow) parts.push(part("target-type", targetRow, targetRow.value));

  for (const flag of flags) {
    if (!(flag in AS_ATTACK_FLAGS)) continue;
    if (physical !== undefined && AS_WEAPON_ONLY_FLAGS.includes(flag)) continue;
    // A hull-down unit cannot also have partial cover (p. 38).
    if (flag === "partial-cover" && (!AS_PARTIAL_COVER_TYPES.includes(input.targetType) || flags.has("target-hull-down"))) continue;
    parts.push(part(flag, AS_ATTACK_FLAGS[flag], AS_ATTACK_FLAGS[flag].value));
  }

  return { total: parts.reduce((sum, p) => sum + p.value, 0), parts, range };
}

// ---- Odds -------------------------------------------------------------------------------------------------------------------

/** The chance that 2D6 meets the Target Number: 2 or less always hits, above 12 never (a natural 12 is no automatic hit). */
export function odds2d6(tn: number): number {
  if (tn <= AS_HIT_LIMITS.autoHit) return 1;
  if (tn > AS_HIT_LIMITS.autoMiss) return 0;
  let ways = 0;
  for (let a = 1; a <= 6; a += 1) for (let b = 1; b <= 6; b += 1) if (a + b >= tn) ways += 1;
  return ways / 36;
}

// ---- Multiple attack rolls (optional rule) ------------------------------------------------------------------------------------

export interface MultipleRollsResult {
  rolls: number;
  successes: number;
  /** After the target's own damage reduction, applied once to the total; a hit always delivers at least 1. */
  damage: number;
  /** Successful rolls that were a natural 12 (two sixes). */
  naturalTwelves: number;
  /** A natural 12 causes at most one critical hit per target, however many came up. */
  criticalFromTwelve: boolean;
}

/**
 * One 2D6 roll per point of damage (the attacker's damage after its own modifiers); the successes are the damage, delivered as one
 * attack. `dice` are the 2D6 totals in order. A reduction on the target (armor ability, AMS) is taken off the total, not off each roll.
 */
export function resolveMultipleRolls(damage: number, tn: number, dice: number[], targetReduction = 0): MultipleRollsResult {
  const used = dice.slice(0, damage);
  const hits = tn > AS_HIT_LIMITS.autoMiss ? [] : used.filter((roll) => roll >= tn);
  const successes = hits.length;
  const delivered = successes === 0 ? 0 : Math.max(1, successes - targetReduction);
  const naturalTwelves = hits.filter((roll) => roll === 12).length;
  return { rolls: damage, successes, damage: delivered, naturalTwelves, criticalFromTwelve: naturalTwelves > 0 && delivered > 0 };
}

export interface SplitResult {
  /** Damage left to assign to a second target at its range bracket after the first target's share, never below 0. */
  secondary: number;
}

/**
 * Splitting one unit's attack between two targets (ASCE p. 174-175): the damage given to the first target comes out of the damage
 * value at the second target's range. The second target's Target Number takes the `secondary` flag.
 */
export function splitDamage(byRange: Record<RangeId, number>, firstShare: number, secondRange: RangeId): SplitResult {
  return { secondary: Math.max(0, (byRange[secondRange] ?? 0) - firstShare) };
}

// ---- Physical attack damage (ASCE p. 46) --------------------------------------------------------------------------------------

export interface PhysicalDamage {
  toTarget: number;
  /** Damage the attacker takes when the attack hits and when it misses. */
  toAttackerOnHit: number;
  toAttackerOnMiss: number;
  cite: string;
}

export interface PhysicalInput {
  type: AsPhysicalType;
  size: number;
  tmm: number;
  targetSize: number;
  /** Strong jump jets (JMPS#, 2 or more) add 1 to DFA damage, weak ones (JMPW#) take 1 off. */
  jumpJets?: "strong" | "weak";
  /** The unit's Short damage, for the Anti-'Mech attack. */
  shortDamage?: number;
}

export function physicalDamage(input: PhysicalInput): PhysicalDamage {
  const half = Math.floor(input.tmm / 2);
  const out = { toTarget: input.size, toAttackerOnHit: 0, toAttackerOnMiss: 0, cite: AS_PHYSICAL_DAMAGE_CITE };
  switch (input.type) {
    case "melee":
      return { ...out, toTarget: input.size + 1 };
    case "charge":
      return { ...out, toTarget: input.size + half, toAttackerOnHit: half + (input.targetSize >= 3 ? 1 : 0) };
    case "dfa": {
      const jets = input.jumpJets === "strong" ? 1 : input.jumpJets === "weak" ? -1 : 0;
      return { ...out, toTarget: input.size + 1 + half + jets, toAttackerOnHit: input.size, toAttackerOnMiss: input.size + 1 };
    }
    case "anti-mech":
      return { ...out, toTarget: input.shortDamage ?? 0 };
    default:
      return out;
  }
}
