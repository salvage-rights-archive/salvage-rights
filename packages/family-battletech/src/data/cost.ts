// C-Bill cost tables for a BattleMech, read from TechManual (corrected sixth printing, errata v8.0) and Interstellar
// Operations: Alternate Eras. Plain data: nothing here runs. Each table names the printed page it came from and whether that
// was settled against the page image ("page") or only the text extract ("text"). The figures are our own tables; the
// book's wording is not copied.
//
// Errata v8.0 (22 August 2024) changed nothing in these figures: the sixth printing already carries the corrected jump jet
// exponent, the MASC "Engine Rating" and the Active Probe (Light) row. It replaced the rounding rule (final cost rounded UP
// to the nearest .01 C-bill, printed p.274); see ROUNDING.
//
// Keys match the chassis tables in data/chassis.ts. A `-clan` key has its own row only where the chassis table has one; the
// book prints one cost for a part both tech bases share. Where the book does not say the Clan version costs the same, the
// row says `assumed: true` and the result reports it in its notes instead of presenting it as printed.

import type { Cite, Checked } from "./chassis";

const TM = "TechManual" as const;
const IO = "Interstellar Operations: Alternate Eras" as const;
interface Sourced {
  cite: Cite;
  checked: Checked;
}
/** A cost per ton of the 'Mech (or of the part), with the page when it is not the table's. */
interface PerTon {
  perTon: number;
  assumed?: true;
  cite?: Cite;
}

// ---------------------------------------------------------------------------------------------------------------
// Rounding and the final multiplier (printed pp.274 and 285).
// ---------------------------------------------------------------------------------------------------------------
export const ROUNDING: Sourced & { cents: number } = {
  // Costs are not rounded until the end, after the final multipliers, and then UP to the nearest .01 (errata v8.0 to p.274).
  // The worked examples on p.285 round down to the whole C-bill: they pre-date the errata.
  cite: { book: TM, page: 274 },
  checked: "page",
  cents: 0.01,
};
export const FINAL_COST: Sourced & { tonsDivisor: number; omniFactor: number } = {
  // BattleMechs: (structural + weapon/equipment) x (Omni conversion) x (1 + tons / 100). The Omni factor is 1.25 for an
  // OmniMech and 1 for any other 'Mech. Final Unit Cost Formulas Table, printed p.285.
  cite: { book: TM, page: 285 },
  checked: "page",
  tonsDivisor: 100,
  omniFactor: 1.25,
};

// ---------------------------------------------------------------------------------------------------------------
// BattleMech structural costs (printed pp.277-278). Costs "x Unit Tonnage" are `perTon`.
// ---------------------------------------------------------------------------------------------------------------
export const COCKPIT_COST: Sourced & { rows: Record<string, { cost: number; cite?: Cite }> } = {
  cite: { book: TM, page: 277 },
  checked: "page",
  rows: {
    standard: { cost: 200_000 },
    small: { cost: 175_000 },
    // The tripod cockpit replaces the standard one at this price (IO:AE printed pp.183 and 217).
    tripod: { cost: 400_000, cite: { book: IO, page: 217 } },
  },
};
export const LIFE_SUPPORT_COST: Sourced & { cost: number } = { cite: { book: TM, page: 277 }, checked: "page", cost: 50_000 };
export const SENSORS_COST: Sourced & { perTon: number } = { cite: { book: TM, page: 277 }, checked: "page", perTon: 2_000 };
export const MUSCULATURE_COST: Sourced & { rows: Record<string, PerTon> } = {
  cite: { book: TM, page: 277 },
  checked: "page",
  rows: { standard: { perTon: 2_000 }, tsm: { perTon: 16_000 } },
};
export const STRUCTURE_COST: Sourced & { rows: Record<string, PerTon> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  rows: {
    standard: { perTon: 400 },
    "endo-steel": { perTon: 1_600 },
    "endo-steel-clan": { perTon: 1_600, assumed: true },
  },
};
/** Each actuator's cost times the 'Mech's tonnage (printed p.278). */
export const ACTUATOR_COST: Sourced & { perTon: Record<"upperArm" | "lowerArm" | "hand" | "upperLeg" | "lowerLeg" | "foot", number> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  perTon: { upperArm: 100, lowerArm: 50, hand: 80, upperLeg: 150, lowerLeg: 80, foot: 120 },
};
/** Engine cost is perRating x engine rating x unit tonnage / 75 (printed p.278). */
export const ENGINE_COST: Sourced & { divisor: number; rows: Record<string, { perRating: number; assumed?: true }> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  divisor: 75,
  rows: {
    standard: { perRating: 5_000 },
    xl: { perRating: 20_000 },
    "xl-clan": { perRating: 20_000, assumed: true },
    light: { perRating: 15_000 },
    compact: { perRating: 10_000 },
  },
};
/** Gyro cost is the row's figure times the gyro's tons (printed p.278). */
export const GYRO_COST: Sourced & { rows: Record<string, { perGyroTon: number }> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  rows: { standard: { perGyroTon: 300_000 }, compact: { perGyroTon: 400_000 }, "heavy-duty": { perGyroTon: 500_000 }, xl: { perGyroTon: 750_000 } },
};
/** Jump jets: perJetSquared x (number of jets)^2 x unit tonnage (printed p.278, errata v8.0 only fixes the exponent's typesetting). */
export const JUMP_JET_COST: Sourced & { rows: Record<string, { perJetSquared: number }> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  rows: { standard: { perJetSquared: 200 }, improved: { perJetSquared: 500 } },
};
/** MASC: 1,000 x engine rating x MASC tons (printed p.278; errata v8.0 corrects the printed "Engine Tonnage" to "Engine Rating"). */
export const MASC_COST: Sourced & { perRatingTon: number } = { cite: { book: TM, page: 278 }, checked: "page", perRatingTon: 1_000 };
/** Heat sinks of a fusion-engined 'Mech (printed p.278): singles cost for those over the engine's 10; doubles cost for all of them. */
export const HEAT_SINK_COST: Sourced & { rows: Record<string, { each: number; free: number; assumed?: true }> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  rows: {
    single: { each: 2_000, free: 10 },
    double: { each: 6_000, free: 0 },
    "double-clan": { each: 6_000, free: 0, assumed: true },
  },
};
/** Armor: cost per ton of armor (printed p.278). */
export const ARMOR_COST: Sourced & { rows: Record<string, PerTon> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  rows: {
    standard: { perTon: 10_000 },
    stealth: { perTon: 50_000 },
    "light-ferro-fibrous": { perTon: 15_000 },
    "ferro-fibrous": { perTon: 20_000 },
    // The Hephaestus example prices 5 tons of Clan ferro-fibrous armor at 20,000 a ton (printed p.276).
    "ferro-fibrous-clan": { perTon: 20_000, cite: { book: TM, page: 276 } },
    "heavy-ferro-fibrous": { perTon: 25_000 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Body types with their own cost rules (Interstellar Operations: Alternate Eras).
//   tripod: the internal structure costs 1.2 times a biped's of the same weight and type (printed p.183, table p.217).
//   lam, bimodal-lam: the conversion equipment adds `conversion` times the 'Mech's structural, weapon and equipment cost,
//     before the final multiplier (printed p.181, table p.215). The table's own note defines "WSC" as the cost of the weapons,
//     equipment and internal structure; the text's worked example uses the structural, weapon and equipment total, which
//     we follow (see the report).
// ---------------------------------------------------------------------------------------------------------------
export const CONFIGURATION_COST: Record<string, { structureFactor?: number; conversion?: number; cite: Cite; checked: Checked }> = {
  tripod: { structureFactor: 1.2, cite: { book: IO, page: 183 }, checked: "page" },
  lam: { conversion: 0.75, cite: { book: IO, page: 181 }, checked: "page" },
  "bimodal-lam": { conversion: 0.65, cite: { book: IO, page: 181 }, checked: "page" },
};

// ---------------------------------------------------------------------------------------------------------------
// Weapons and equipment (Heavy Weapons and Equipment and Industrial Equipment tables, printed pp.290-294). One price for
// both tech bases: the key is a catalog row id without its `-is` or `-clan` ending (a row with a price of its own under
// its full id wins). A number is C-bills each; { perTon } is C-bills for each whole ton of the item's weight, rounded up
// (the table's dagger and asterisk notes). Ammunition is not priced: the book says it is not bought for a unit's cost
// (printed p.282). A catalog row with no key here is reported as unpriced, never guessed.
// ---------------------------------------------------------------------------------------------------------------
export type Price = number | { perTon: number };
interface PriceGroup extends Sourced {
  prices: Record<string, Price>;
}
export const EQUIPMENT_COST: PriceGroup[] = [
  {
    // p.290: autocannons, Gauss rifles, machine guns, flamers, the first lasers
    cite: { book: TM, page: 290 },
    checked: "page",
    prices: {
      "ac-2": 75_000, "ac-5": 125_000, "ac-10": 200_000, "ac-20": 300_000,
      "lb-2-x-ac": 150_000, "lb-5-x-ac": 250_000, "lb-10-x-ac": 400_000, "lb-20-x-ac": 600_000,
      "light-ac-2": 100_000, "light-ac-5": 150_000,
      "rotary-ac-2": 175_000, "rotary-ac-5": 275_000,
      "ultra-ac-2": 120_000, "ultra-ac-5": 200_000, "ultra-ac-10": 320_000, "ultra-ac-20": 480_000,
      "ap-gauss-rifle": 10_000, "light-gauss-rifle": 275_000, "gauss-rifle": 300_000, "heavy-gauss-rifle": 500_000,
      "hyper-assault-gauss-20": 400_000, "hyper-assault-gauss-30": 500_000, "hyper-assault-gauss-40": 600_000,
      "light-machine-gun": 5_000, "machine-gun": 5_000, "heavy-machine-gun": 7_500,
      "flamer": 7_500, "vehicle-flamer": 7_500,
      "er-micro-laser": 10_000, "er-small-laser": 11_250,
    },
  },
  {
    // p.291: lasers, plasma weapons, PPCs, missile launchers, probes, anti-missile systems
    cite: { book: TM, page: 291 },
    checked: "page",
    prices: {
      "er-medium-laser": 80_000, "er-large-laser": 200_000,
      "small-laser": 11_250, "medium-laser": 40_000, "large-laser": 100_000,
      "micro-pulse-laser": 12_500, "small-pulse-laser": 16_000, "medium-pulse-laser": 60_000, "large-pulse-laser": 175_000,
      "heavy-small-laser": 20_000, "heavy-medium-laser": 100_000, "heavy-large-laser": 250_000,
      "plasma-cannon": 320_000, "plasma-rifle": 260_000,
      "light-ppc": 150_000, "ppc": 200_000, "heavy-ppc": 250_000, "er-ppc": 300_000, "snub-nose-ppc": 300_000,
      "atm-3": 50_000, "atm-6": 125_000, "atm-9": 225_000, "atm-12": 350_000,
      "lrm-5": 30_000, "lrm-10": 100_000, "lrm-15": 175_000, "lrm-20": 250_000,
      "mml-3": 45_000, "mml-5": 75_000, "mml-7": 105_000, "mml-9": 125_000,
      "srm-2": 10_000, "srm-4": 60_000, "srm-6": 80_000,
      "mrm-10": 50_000, "mrm-20": 125_000, "mrm-30": 225_000, "mrm-40": 350_000,
      "rocket-launcher-10": 15_000, "rocket-launcher-15": 30_000, "rocket-launcher-20": 45_000,
      "streak-srm-2": 15_000, "streak-srm-4": 90_000, "streak-srm-6": 120_000,
      "artemis-iv": 100_000,
      "a-pods": 1_500, "b-pods": 2_500, "ams": 100_000,
      "beagle-active-probe": 200_000, "active-probe": 200_000, "light-active-probe": 50_000,
    },
  },
  {
    // p.292: CASE, C3, ECM, Narc, TAG, targeting computer, physical weapons; the first industrial equipment
    cite: { book: TM, page: 292 },
    checked: "page",
    prices: {
      "case": 50_000,
      "c3-computer-master": 1_500_000, "c3-computer-slave": 250_000, "improved-c3-computer": 750_000,
      "guardian-ecm-suite": 200_000, "ecm-suite": 200_000,
      "machine-gun-array": 1_250,
      "narc-missile-beacon": 100_000, "improved-narc-launcher": 250_000,
      "tag": 50_000, "light-tag": 40_000,
      "targeting-computer": { perTon: 10_000 },
      "hatchet": { perTon: 5_000 }, "sword": { perTon: 10_000 },
      "backhoe": 50_000,
      "bridgelayer-light": 40_000, "bridgelayer-medium": 75_000, "bridgelayer-heavy": 100_000,
      "chainsaw": 100_000, "combine": 75_000, "dual-saw": 100_000,
    },
  },
  {
    // p.293: more industrial equipment
    cite: { book: TM, page: 293 },
    checked: "page",
    prices: {
      "heavy-duty-pile-driver": 100_000, "lift-hoist": 50_000, "mining-drill": 100_000, "nail-rivet-gun": 7_000,
      "remote-sensor-dispenser": 30_000, "rock-cutter": 100_000, "salvage-arm": 50_000, "spot-welder": 75_000,
      "sprayer": 1_000, "light-fluid-suction-system": 1_000,
    },
  },
  {
    // p.294: the last industrial row
    cite: { book: TM, page: 294 },
    checked: "page",
    prices: { "wrecking-ball": 80_000 },
  },
  {
    // Interstellar Operations: Alternate Eras p.215, Land-Air BattleMech Components: a one-ton bomb bay and a one-ton fuel tank
    // (printed p.181: priced as equipment, before the conversion cost is added).
    cite: { book: IO, page: 215 },
    checked: "page",
    prices: { "lam-bomb-bay": 5_000, "lam-fuel-tanks": 200, "lam-fuel": 200 },
  },
];
