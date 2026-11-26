// Point Value tables for ground units (BattleMechs and IndustrialMechs), from Alpha Strike Companion (ASC, 2014) "Point Value
// Calculations" pp. 138-141, with the errata v1.6 (6 December 2022) applied where it changes a figure: the errata rows say so in
// `errata`. Figures and identifiers only, each read against the page image; the rules that use them are in rules/as-pv.ts.
//
// What the errata changed for a 'Mech (read from the errata's own pages 17-19): the attack damage of a 0* counts as 0.5; the Offensive
// Value is no longer rounded; the Movement Factor is the best Move over 8; Artillery is x6; the Narc, iNarc and TSEMP rows; the
// blanket multipliers lose the C3 row and the DRO footnote; the Defensive rows (CR, the "per 3 Armor points" rows, no PNT); the Defense
// Factor is worked out in a new way; stealth armor is +1; the mimetic rows; JMPS, SUBS and Thrust rows; Step 3 is replaced (Agile, C3
// and Brawler) and the DIR is rounded to the nearest half point.
import type { AscCite } from "./as-convert";

const pv = (page: number, errata = false): AscCite => (errata ? { book: "Alpha Strike Companion", page, errata: "v1.6", checked: "page" } : { book: "Alpha Strike Companion", page, checked: "page" });

export const PV_PAGES = {
  offense: pv(138, true),
  offenseTable: pv(139, true),
  blanket: pv(139, true),
  defense: pv(139, true),
  defenseTable: pv(140, true),
  armorTable: pv(140),
  structureTable: pv(140),
  forceBonus: pv(140, true),
  dir: pv(141, true),
  subtotal: pv(141, true),
  forceBonuses: pv(141, true),
} as const;

/** The Attack Damage Factor counts the Medium damage twice (p. 138); a minimal damage value (0*) counts as this much (errata v1.6). */
export const PV_DAMAGE = { mediumTwice: true, minimal: 0.5 };

/** The Unit Size Factor: half the Size value of a 'Mech (p. 138). */
export const PV_SIZE_FACTOR = 0.5;

/** The Overheat Factor (p. 139): none for OV 0; 1 for OV 1; above that 1 plus this much for each point over 1. A unit that can only deliver
 * damage at Short range divides it by 2. */
export const PV_OVERHEAT = { first: 1, perExtraPoint: 0.5, shortOnlyDivisor: 2 };

/** An offensive special ability's factor (p. 139, errata v1.6 for the rows it changes). `rating` multiplies the ability's number. */
export type PvFactor =
  | { kind: "flat"; value: number }
  | { kind: "rating"; per: number; max?: number }
  /** HT#/#/#: the highest of its three numbers, and half a point more when the Medium number is above 0. */
  | { kind: "heat" }
  | { kind: "if" }
  /** BT: the unit's Size times half its highest Move. */
  | { kind: "booby" }
  /** Overheat Long: the Overheat Value times this. */
  | { kind: "ov"; per: number }
  /** Radical Heat Sink System: the highest of the three cases. */
  | { kind: "rhs" }
  /** IATM: the Long-range damage value. */
  | { kind: "long" };

export const PV_OFFENSE_SPECIALS: Record<string, { factor: PvFactor; errata?: boolean }> = {
  BT: { factor: { kind: "booby" } },
  BTAS: { factor: { kind: "rating", per: 0.25 } },
  CNARC: { factor: { kind: "rating", per: 0.5 }, errata: true },
  ECS: { factor: { kind: "flat", value: 0.25 } },
  HT: { factor: { kind: "heat" } },
  IF: { factor: { kind: "if" }, errata: true },
  INARC: { factor: { kind: "rating", per: 1 }, errata: true },
  IATM: { factor: { kind: "long" }, errata: true },
  LTAG: { factor: { kind: "flat", value: 0.25 } },
  MDS: { factor: { kind: "rating", per: 1 } },
  MEL: { factor: { kind: "flat", value: 0.5 } },
  MTAS: { factor: { kind: "rating", per: 1 } },
  OVL: { factor: { kind: "ov", per: 0.25 } },
  RHS: { factor: { kind: "rhs" } },
  SNARC: { factor: { kind: "rating", per: 1 }, errata: true },
  TAG: { factor: { kind: "flat", value: 0.5 } },
  TSEMP: { factor: { kind: "rating", per: 5 }, errata: true },
  "TSEMP-O": { factor: { kind: "rating", per: 1, max: 5 }, errata: true },
  TSM: { factor: { kind: "flat", value: 1 } },
};

/** The Radical Heat Sink System's three cases (p. 139). */
export const PV_RHS = { noOv: 0.25, withOv: 0.5, withOvl: 1 };

/** An artillery weapon's factor is its damage times this (errata v1.6, p. 139); the second damage value and the blast radius add more. */
export const PV_ARTILLERY = { perInner: 6, perOuter: 3, perTwoInchesOver: 3, freeRadius: 2 };

/** The blanket multipliers (p. 139, errata v1.6): the base is 1; the variable-range targeting special adds this much; each special that
 * gives the unit a +1 to be hit by its own attacks takes this much away (BFC, SHLD); an IndustrialMech without AFC or BFC takes this. */
export const PV_BLANKET = {
  base: 1,
  vrt: 0.1,
  vrtCode: "VRT",
  toHitPenalty: { codes: ["BFC", "SHLD"], each: -0.1 },
  noFireControl: { value: -0.2, codes: ["AFC", "BFC"] },
};

// ---- Defense (pp. 139-141) ----------------------------------------------------------------------------------------------------

/** The Movement Factor is the best single Move divided by this (errata v1.6), plus half a point for a jump-capable unit (p. 139). */
export const PV_MOVEMENT = { divisor: 8, jumpBonus: 0.5 };

export type DefenseFactor =
  | { kind: "flat"; value: number }
  /** A factor for each full three points of Armor (the errata's wording: x (Armor / 3, rounded down)). */
  | { kind: "perThreeArmor"; each: number }
  /** CR: the factor only counts when the unit has at least this many Structure points (errata v1.6). */
  | { kind: "structureAtLeast"; value: number; min: number }
  /** ARM: 0.5, but nothing for a unit with a single Structure point. */
  | { kind: "armored"; value: number };

/** Defensive special abilities that a ground unit's Defensive Value counts (p. 140; PNT is deleted for ground units by the errata). A BAR
 * unit divides the "per three Armor" rows by 2 (the table's footnote). */
export const PV_DEFENSE_SPECIALS: Record<string, { factor: DefenseFactor; halvedByBar?: boolean }> = {
  ABA: { factor: { kind: "flat", value: 0.5 } },
  AMS: { factor: { kind: "flat", value: 1 } },
  ARM: { factor: { kind: "armored", value: 0.5 } },
  BHJ2: { factor: { kind: "perThreeArmor", each: 1 }, halvedByBar: true },
  BHJ3: { factor: { kind: "perThreeArmor", each: 1.5 }, halvedByBar: true },
  BRA: { factor: { kind: "perThreeArmor", each: 0.75 }, halvedByBar: true },
  CR: { factor: { kind: "structureAtLeast", value: 0.25, min: 3 } },
  FR: { factor: { kind: "flat", value: 0.5 } },
  IRA: { factor: { kind: "perThreeArmor", each: 0.5 }, halvedByBar: true },
  RAMS: { factor: { kind: "flat", value: 1.25 } },
  RCA: { factor: { kind: "perThreeArmor", each: 1 }, halvedByBar: true },
  SHLD: { factor: { kind: "perThreeArmor", each: 1 }, halvedByBar: true },
};

/** The Movement Modifier by best Move rate in inches (p. 140). */
export const PV_MOVEMENT_MODIFIER: { from: number; to: number | null; modifier: number }[] = [
  { from: 0, to: 4, modifier: 0 },
  { from: 5, to: 8, modifier: 1 },
  { from: 9, to: 12, modifier: 2 },
  { from: 13, to: 18, modifier: 3 },
  { from: 19, to: 34, modifier: 4 },
  { from: 35, to: null, modifier: 5 },
];

/** The Type and Feature Modifiers a 'Mech can have (p. 140, errata v1.6): LG, VLG and SLG are -1; stealth armor is +1; mimetic armor
 * replaces the movement modifier when it is higher (MAS +3, LMAS +2); a jump-capable unit gets +1 only if it meets the footnote's tests;
 * JMPS#, SUBS# half their number; thrust +2. */
export const PV_TYPE_MODIFIERS = {
  large: { codes: ["LG", "VLG", "SLG"], value: -1 },
  stealth: { code: "STL", value: 1 },
  mimetic: { MAS: 3, LMAS: 2 },
  jumpCapable: 1,
  perHalf: ["JMPS", "SUBS"],
  thrust: 2,
};

/** Defense Factor from the total target modifier (errata v1.6, p. 141): below 0, 1 minus a tenth of its size; 1 or 2 a tenth more than
 * 1; above 2 a quarter more than 1. */
export const PV_DEFENSE_FACTOR = { negativeEach: 0.1, lowEach: 0.1, lowUpTo: 2, highEach: 0.25 };

/** The Armor and Structure Factor multipliers (p. 140): the Armor Factor is the Armor value times 2.0 for a unit that is not a vehicle,
 * halved by the BAR special; the Structure Factor is the Structure value times 0.5 for an IndustrialMech or a BAR unit (not twice). */
export const PV_ARMOR_MULTIPLIER = { nonVehicle: 2, barHalves: 0.5 };
export const PV_STRUCTURE_MULTIPLIER = { industrialOrBar: 0.5, other: 1 };

/** The Defensive Interaction Rating is rounded to the nearest half point (errata v1.6, p. 141). */
export const PV_ROUND_HALF = 0.5;

// ---- The subtotal modifiers (errata v1.6, p. 141) and the force bonuses (p. 140) -------------------------------------------------

export const PV_SUBTOTAL = {
  c3: { rate: 0.05, nova: "NOVA", exceptCode: "C3RS" },
  agile: { jumpHalf: ["JMPS", "SUBS"], medium: 1, shortOnly: 2, shortOnlyMinTmm: 3 },
  brawler: {
    minMove: 2,
    /** Specials that keep a unit from being a Brawler. */
    excluded: ["BT", "NOVA"],
    excludedPrefixes: ["ART", "C3"],
    /** ECM of any type other than the light kind. */
    excludedEcm: ["ECM", "AECM"],
    cases: [
      { name: "6 to 10 inches of Move, damage at Short only", minMove: 6, maxMove: 10, ranges: "short", rate: -0.25 },
      { name: "2 to 5 inches of Move, damage at Short only", minMove: 2, maxMove: 5, ranges: "short", rate: -0.5 },
      { name: "2 to 5 inches of Move, damage at Short and Medium only", minMove: 2, maxMove: 5, ranges: "short-medium", rate: -0.25 },
    ] as { name: string; minMove: number; maxMove: number; ranges: "short" | "short-medium"; rate: number }[],
  },
};

/** The Ground Unit Force Bonuses Table (p. 140; the MHQ row from the errata): added to the subtotal before the last rounding. */
export const PV_FORCE_BONUS: Record<string, number> = { AECM: 3, BH: 2, C3RS: 2, ECM: 2, LECM: 0.5, PRB: 1, LPRB: 1, RCN: 2, TRN: 2 };
/** MHQ#: its rating for ratings 1 to 4; for 5 and over 4 plus a fifth of the rating, rounded up (errata v1.6, p. 140). */
export const PV_MHQ = { direct: 4, base: 4, divisor: 5 };
