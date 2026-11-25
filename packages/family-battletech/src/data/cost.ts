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
const TO = "Tactical Operations: Advanced Units and Equipment" as const;
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
    // Industrial cockpits, printed p.277 (without and with advanced fire control)
    industrial: { cost: 100_000 },
    "industrial-afc": { cost: 200_000 },
    // Tactical Operations: Advanced Units and Equipment p.219 (torso-mounted); IO:AE pp.213, 215, 217 (the rest)
    "torso-mounted": { cost: 750_000, cite: { book: TO, page: 219 } },
    interface: { cost: 1_500_000, cite: { book: IO, page: 213 } },
    primitive: { cost: 100_000, cite: { book: IO, page: 215 } },
    "superheavy-tripod": { cost: 500_000, cite: { book: IO, page: 217 } },
    superheavy: { cost: 300_000, cite: { book: IO, page: 215 } },
    quadvee: { cost: 375_000, cite: { book: IO, page: 215 } },
  },
};
export const LIFE_SUPPORT_COST: Sourced & { cost: number } = { cite: { book: TM, page: 277 }, checked: "page", cost: 50_000 };
export const SENSORS_COST: Sourced & { perTon: number } = { cite: { book: TM, page: 277 }, checked: "page", perTon: 2_000 };
export const MUSCULATURE_COST: Sourced & { rows: Record<string, PerTon> } = {
  cite: { book: TM, page: 277 },
  checked: "page",
  rows: {
    standard: { perTon: 2_000 },
    tsm: { perTon: 16_000 },
    "industrial-tsm": { perTon: 12_000 },
    // Interstellar Operations: Alternate Eras, printed p.213 (prototype TSM, 32,000 x tonnage) and p.215 (primitive, 1,000 x tonnage)
    "prototype-tsm": { perTon: 32_000, cite: { book: IO, page: 213 } },
    primitive: { perTon: 1_000, cite: { book: IO, page: 215 } },
  },
};
export const STRUCTURE_COST: Sourced & { rows: Record<string, PerTon> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  rows: {
    standard: { perTon: 400 },
    "endo-steel": { perTon: 1_600 },
    "endo-steel-clan": { perTon: 1_600, assumed: true },
    industrial: { perTon: 300 },
    // Tactical Operations: Advanced Units and Equipment p.223 (composite, endo-composite, reinforced); IO:AE p.211 (prototype endo steel)
    composite: { perTon: 1_600, cite: { book: TO, page: 223 } },
    "endo-composite": { perTon: 3_200, cite: { book: TO, page: 223 } },
    "endo-composite-clan": { perTon: 3_200, cite: { book: TO, page: 223 } },
    reinforced: { perTon: 6_400, cite: { book: TO, page: 223 } },
    "prototype-endo-steel": { perTon: 4_800, cite: { book: IO, page: 211 } },
  },
};
/** Each actuator's cost times the 'Mech's tonnage (printed p.278). */
export const ACTUATOR_COST: Sourced & { perTon: Record<"upperArm" | "lowerArm" | "hand" | "upperLeg" | "lowerLeg" | "foot", number> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  perTon: { upperArm: 100, lowerArm: 50, hand: 80, upperLeg: 150, lowerLeg: 80, foot: 120 },
};
/** Engine cost is perRating x engine rating x unit tonnage / 75 (printed p.278). */
export const ENGINE_COST: Sourced & { divisor: number; rows: Record<string, { perRating: number; assumed?: true; cite?: Cite }> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  divisor: 75,
  rows: {
    standard: { perRating: 5_000 },
    xl: { perRating: 20_000 },
    "xl-clan": { perRating: 20_000, assumed: true },
    light: { perRating: 15_000 },
    compact: { perRating: 10_000 },
    // XXL engines, Tactical Operations: Advanced Units and Equipment p.219 (both tech bases); the prototype extralight (XL)
    // engine of the Age of War, IO:AE p.211
    xxl: { perRating: 100_000, cite: { book: TO, page: 219 } },
    "xxl-clan": { perRating: 100_000, cite: { book: TO, page: 219 } },
    "prototype-xl": { perRating: 100_000, cite: { book: IO, page: 211 } },
    // Non-fusion engines, printed p.278 (a BattleMech may not use them; an IndustrialMech may)
    ice: { perRating: 1_250 },
    "fuel-cell": { perRating: 3_500 },
    fission: { perRating: 7_500 },
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
    commercial: { perTon: 3_000 },
    industrial: { perTon: 5_000 },
    // Tactical Operations: Advanced Units and Equipment p.217 (cost per ton of armor)
    "ferro-lamellor": { perTon: 35_000, cite: { book: TO, page: 217 } },
    hardened: { perTon: 15_000, cite: { book: TO, page: 217 } },
    "laser-reflective": { perTon: 30_000, cite: { book: TO, page: 217 } },
    "laser-reflective-clan": { perTon: 30_000, cite: { book: TO, page: 217 } },
    modular: { perTon: 10_000, cite: { book: TO, page: 217 } },
    reactive: { perTon: 30_000, cite: { book: TO, page: 217 } },
    "reactive-clan": { perTon: 30_000, cite: { book: TO, page: 217 } },
    // Interstellar Operations: Alternate Eras pp.211 and 215 (primitive, prototype ferro-fibrous, and the Dark Age armors)
    primitive: { perTon: 5_000, cite: { book: IO, page: 215 } },
    "prototype-ferro-fibrous": { perTon: 60_000, cite: { book: IO, page: 211 } },
    "anti-penetrative-ablation": { perTon: 15_000, cite: { book: IO, page: 215 } },
    "heat-dissipating": { perTon: 25_000, cite: { book: IO, page: 215 } },
    "impact-resistant": { perTon: 20_000, cite: { book: IO, page: 215 } },
    "ballistic-reinforced": { perTon: 25_000, cite: { book: IO, page: 215 } },
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
/** C-bills each; or per whole ton of the item's weight; or per ton of the 'Mech (the book's "xTT" formulas: spikes are 50 x tonnage). */
export type Price = number | { perTon: number } | { perUnitTon: number };
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
  {
    // IO:AE p.211, Age of War, Star League and Early Clan Equipment (item cost only: the figure after a slash is for ammunition)
    cite: { book: IO, page: 211 },
    checked: "page",
    prices: {
      "primitive-prototype-ac-2": 75_000, "primitive-prototype-ac-5": 125_000, "primitive-prototype-ac-10": 200_000, "primitive-prototype-ac-20": 300_000,
      "primitive-prototype-small-laser": 11_250, "primitive-prototype-medium-laser": 40_000, "primitive-prototype-large-laser": 100_000,
      "primitive-prototype-lrm-5": 30_000, "primitive-prototype-lrm-10": 100_000, "primitive-prototype-lrm-15": 175_000, "primitive-prototype-lrm-20": 250_000,
      "primitive-prototype-srm-2": 10_000, "primitive-prototype-srm-4": 60_000, "primitive-prototype-srm-6": 80_000, "primitive-prototype-ppc": 200_000,
      "prototype-arrow-iv": 1_800_000, "prototype-artemis-iv": 300_000, "prototype-beagle-active-probe": 600_000, "prototype-case": 150_000,
      "prototype-gauss-rifle": 1_200_000, "prototype-guardian-ecm-suite": 1_000_000, "prototype-lb-10-x-ac": 1_600_000, "prototype-narc-missile-beacon": 300_000,
      "prototype-large-pulse-laser": 875_000, "prototype-medium-pulse-laser": 300_000, "prototype-small-pulse-laser": 80_000, "prototype-remote-sensors": 60_000,
      "prototype-rocket-launcher-10": 15_000, "prototype-rocket-launcher-15": 30_000, "prototype-rocket-launcher-20": 45_000, "prototype-tag": 150_000,
      "centurion-weapon-system": 1_000_000,
      "improved-ac-2": 75_000, "improved-ac-5": 125_000, "improved-ac-10": 200_000, "improved-ac-20": 300_000,
      "improved-gauss-rifle": 300_000, "improved-large-laser": 100_000, "improved-large-pulse-laser": 175_000, "improved-ppc": 200_000, "enhanced-ppc": 300_000,
      "improved-lrm-5": 30_000, "improved-lrm-10": 100_000, "improved-lrm-15": 175_000,
    },
  },
  {
    // IO:AE p.213: Early Clan, Late Succession Wars, Clan Invasion and Wars of Reaving Equipment
    cite: { book: IO, page: 213 },
    checked: "page",
    prices: {
      "improved-lrm-20": 250_000, "improved-srm-2": 15_000, "improved-srm-4": 90_000, "improved-srm-6": 120_000,
      "prototype-er-small-laser": 11_250, "prototype-er-medium-laser": 80_000,
      "prototype-lb-2-x-ac": 150_000, "prototype-lb-5-x-ac": 250_000, "prototype-lb-20-x-ac": 600_000,
      "prototype-streak-srm-4": 90_000, "prototype-streak-srm-6": 120_000,
      "prototype-ultra-ac-2": 120_000, "prototype-ultra-ac-10": 320_000, "prototype-ultra-ac-20": 480_000,
      "prototype-er-large-laser": 600_000, "prototype-medium-pulse-laser-lsw": 240_000, "prototype-gauss-rifle-lsw": 1_200_000,
      "prototype-lb-10-x-ac-lsw": 2_000_000, "prototype-ultra-ac-5": 1_000_000,
      "improved-atm-3": 100_000, "improved-atm-6": 250_000, "improved-atm-9": 450_000, "improved-atm-12": 700_000,
      "nova-cews": 1_110_000,
    },
  },
  {
    // IO:AE p.215: Dark Age Equipment
    cite: { book: IO, page: 215 },
    checked: "page",
    prices: {
      "small-re-engineered-laser": 25_000, "medium-re-engineered-laser": 100_000, "large-re-engineered-laser": 250_000,
      "tsemp-cannon": 800_000, "tsemp-one-shot": 500_000, "risc-advanced-pds": 200_000, "risc-hyper-laser": 750_000,
      "risc-repeating-tsemp-cannon": 1_200_000, "risc-emergency-coolant-system": 460_000,
      "risc-viral-jammer-decoy": 990_000, "risc-viral-jammer-homing": 990_000,
    },
  },
  {
    // Tactical Operations: Advanced Units and Equipment p.217, Heavy Weapons and Equipment Construction Data (item cost only)
    cite: { book: TO, page: 217 },
    checked: "page",
    prices: {
      "bloodhound-active-probe": 500_000, "watchdog-cews": 600_000, "angel-ecm": 750_000, "artemis-v": 250_000,
      "arrow-iv": 450_000, "thumper-artillery": 187_500, "sniper-artillery": 300_000,
      "thumper-cannon": 200_000, "sniper-cannon": 475_000, "long-tom-cannon": 650_000,
      "hyper-velocity-ac-2": 100_000, "hyper-velocity-ac-5": 160_000, "hyper-velocity-ac-10": 230_000,
      "protomech-ac-2": 95_000, "protomech-ac-4": 133_000, "protomech-ac-8": 175_000,
      "chain-whip": 120_000, "flail": 110_000, "shield-small": 50_000, "shield-medium": 100_000, "shield-large": 300_000,
      "spikes": { perUnitTon: 50 },
      "vibroblade-small": 150_000, "vibroblade-medium": 400_000, "vibroblade-large": 750_000,
      "c3-boosted-master": 3_000_000, "c3-boosted-slave": 500_000, "c3-emergency-master": 2_800_000, "c3-remote-sensor-launcher": 400_000,
      "case-ii": 175_000,
    },
  },
  {
    // TO:AUE p.219
    cite: { book: TO, page: 219 },
    checked: "page",
    prices: {
      "chaff-pod": 2_000, "coolant-pod": 50_000, "electronic-warfare-equipment": 500_000,
      "er-flamer": 15_000, "heavy-flamer": 11_250, "fluid-gun": 35_000,
      "improved-heavy-gauss": 700_000, "magshot": 8_500, "silver-bullet-gauss": 350_000, "vehicular-grenade-launcher": 10_000,
      "binary-laser": 200_000, "bombast-laser": 200_000,
      "chemical-laser-small": 10_000, "chemical-laser-medium": 30_000, "chemical-laser-large": 75_000,
      "er-pulse-laser-small": 30_000, "er-pulse-laser-medium": 150_000, "er-pulse-laser-large": 400_000,
      "improved-heavy-laser-small": 30_000, "improved-heavy-laser-medium": 150_000, "improved-heavy-laser-large": 350_000,
      "variable-speed-laser-small": 60_000, "variable-speed-laser-medium": 200_000, "variable-speed-laser-large": 465_000,
      "x-pulse-laser-small": 31_000,
    },
  },
  {
    // TO:AUE p.221
    cite: { book: TO, page: 221 },
    checked: "page",
    prices: {
      "x-pulse-laser-medium": 110_000, "x-pulse-laser-large": 275_000, "laser-anti-missile-system": 225_000, "laser-insulator": 3_000,
      "mech-mortar-1": 7_000, "mech-mortar-2": 15_000, "mech-mortar-4": 32_000, "mech-mortar-8": 70_000,
      "vehicular-mine-dispenser": 20_000,
      "enhanced-lrm-5": 37_500, "enhanced-lrm-10": 125_000, "enhanced-lrm-15": 218_750, "enhanced-lrm-20": 312_500,
      "extended-lrm-5": 60_000, "extended-lrm-10": 200_000, "extended-lrm-15": 350_000, "extended-lrm-20": 500_000,
      "streak-lrm-5": 75_000, "streak-lrm-10": 225_000, "streak-lrm-15": 400_000, "streak-lrm-20": 600_000,
      "m-pod": 6_000, "mrm-apollo-fcs": 125_000,
    },
  },
  {
    // TO:AUE p.223
    cite: { book: TO, page: 223 },
    checked: "page",
    prices: {
      "ppc-capacitor": 150_000, "recon-camera": 10_000,
      "light-rifle": 37_750, "medium-rifle": 75_500, "heavy-rifle": 90_000,
      "taser": 200_000, "thunderbolt-5": 50_000, "thunderbolt-10": 175_000, "thunderbolt-15": 325_000, "thunderbolt-20": 450_000,
    },
  },
];

/** Retractable blade (printed p.293, Industrial Equipment): the mechanism, plus the blade at a price per ton of its weight.
 * The blade's weight is the 'Mech's tonnage over 20, rounded up to a half ton (p.237), then up to a whole ton as the table's
 * footnote says; the extra half ton in the item's listed weight is the mechanism. */
export const RETRACTABLE_BLADE_COST: Sourced & { mechanism: number; perTon: number } = {
  cite: { book: TM, page: 293 },
  checked: "page",
  mechanism: 10_000,
  perTon: 10_000,
};
