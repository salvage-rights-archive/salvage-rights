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

/**
 * Where an IndustrialMech's cost differs from a BattleMech's (read against the page images). The Final Unit Cost Formulas Table
 * (printed p.285) divides the tonnage by 400, not 100, and has no Omni factor. The BattleMech and IndustrialMech Structural Costs
 * table (printed p.278) lists environmental sealing under internal structure at 225 x unit tonnage ("IndustrialMechs only"), power
 * amplifiers at 20,000 x their tonnage and tracks at 500 x engine rating x unit tonnage over 75, and prices a single heat sink
 * 2,000 for each one of the unit's total when its engine is not a fusion engine (a fusion engine's first ten are free).
 */
export const INDUSTRIAL_COST: Sourced & { tonsDivisor: number; sealingPerTon: number; amplifierPerTon: number; tracksPerRating: number; finalCite: Cite } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  tonsDivisor: 400,
  sealingPerTon: 225,
  amplifierPerTon: 20_000,
  tracksPerRating: 500,
  finalCite: { book: TM, page: 285 },
};
/** Engines that are not fusion engines: a heat sink with one is paid for in full (printed p.278). */
export const NON_FUSION_ENGINES = ["ice", "fuel-cell", "fission"];

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
    "interface-clan": { cost: 1_500_000, cite: { book: IO, page: 213 } },
    vrpp: { cost: 1_250_000, cite: { book: IO, page: 213 } },
    primitive: { cost: 100_000, cite: { book: IO, page: 215 } },
    "primitive-industrial": { cost: 50_000, cite: { book: IO, page: 215 } },
    "superheavy-tripod": { cost: 500_000, cite: { book: IO, page: 217 } },
    superheavy: { cost: 300_000, cite: { book: IO, page: 215 } },
    "superheavy-industrial": { cost: 200_000, cite: { book: IO, page: 215 } },
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
    // IO:AE p.215 (RISC super-cooled myomer, 10,000 x tonnage)
    "super-cooled": { perTon: 10_000, cite: { book: IO, page: 215 } },
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
  rows: { standard: { perGyroTon: 300_000 }, compact: { perGyroTon: 400_000 }, "heavy-duty": { perGyroTon: 500_000 }, xl: { perGyroTon: 750_000 }, superheavy: { perGyroTon: 500_000 } },
};
/** Jump jets: perJetSquared x (number of jets)^2 x unit tonnage (printed p.278, errata v8.0 only fixes the exponent's typesetting). */
export const JUMP_JET_COST: Sourced & { rows: Record<string, { perJetSquared: number }> } = {
  cite: { book: TM, page: 278 },
  checked: "page",
  // UMUs cost as jump jets do, 200 x tonnage x (number of UMUs)^2 (TO:AUE p.223, footnote to the Construction Data table).
  rows: { standard: { perJetSquared: 200 }, improved: { perJetSquared: 500 }, umu: { perJetSquared: 200 } },
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
    // TO:AUE p.217: 3,000 each for compact sinks and 6,000 for laser sinks; the free sinks of the engine are priced as for singles
    compact: { each: 3_000, free: 10 },
    laser: { each: 6_000, free: 0 },
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
    "vehicular-stealth": { perTon: 50_000, cite: { book: TO, page: 217 } },
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
/**
 * Superheavy 'Mech components (IO:AE printed p.183, the Additional Alternate Era Weapons and Equipment cost table p.217, read against the
 * page images): the musculature and the four structure types are priced by the unit's tonnage in place of a standard 'Mech's, and each
 * actuator costs twice a standard one. The cockpits and the gyro are in COCKPIT_COST and GYRO_COST.
 */
export const SUPERHEAVY_COST: Sourced & { musculaturePerTon: number; actuatorFactor: number; structurePerTon: Record<string, number>; textCite: Cite } = {
  cite: { book: IO, page: 217 },
  checked: "page",
  textCite: { book: IO, page: 183 },
  musculaturePerTon: 12_000,
  actuatorFactor: 2,
  structurePerTon: { standard: 4_000, "endo-composite": 6_400, "endo-steel": 16_000, industrial: 3_000 },
};

/** Primitive 'Mech musculature: 1,000 x the unit's tonnage (IO:AE printed p.181 and the cost table p.215, "Primitive 'Mech Musculature"). */
export const PRIMITIVE_COST: Sourced & { musculaturePerTon: number } = { cite: { book: IO, page: 215 }, checked: "page", musculaturePerTon: 1_000 };

export const CONFIGURATION_COST: Record<string, { structureFactor?: number; conversion?: number; cite: Cite; checked: Checked }> = {
  tripod: { structureFactor: 1.2, cite: { book: IO, page: 183 }, checked: "page" },
  // The QuadVee: the conversion equipment costs half the structural, weapon and equipment cost, added before the final multiplier (IO:AE printed p.181, table p.215).
  quadvee: { conversion: 0.5, cite: { book: IO, page: 181 }, checked: "page" },
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
export type Price = number | { perAmount: number } | { perTon: number } | { perUnitTon: number } | { perRating: number } | { perWeight: number; base?: number };
// `perWeight` is C-bills for each ton of the item's own weight, not rounded to whole tons (a turret: 5,000 x the turret's tonnage), plus `base` where the table prints one (the drone operating system).
interface PriceGroup extends Sourced {
  prices: Record<string, Price>;
}
export const EQUIPMENT_COST: PriceGroup[] = [
  {
    // The heavy plasma rifle (catalog row flagged `bvInferred`, which covers the price too): no book we hold prints its cost. 320,000 is the figure that
    // makes Mordel's cost for the Atlas AS7-Ln (unit 99519, 11,286,000) come out exactly; the light plasma rifle has no unit to work from and no price.
    cite: { book: "BattleTech Core Rulebook", page: 248 },
    checked: "text",
    prices: { "heavy-plasma-rifle": 320_000 },
  },
  {
    // p.291: a torpedo launcher costs what its LRM or SRM does (x1, "as launcher"); the figures are the launchers' on the same page
    cite: { book: TM, page: 291 },
    checked: "page",
    prices: { "srt-2": 10_000, "srt-4": 60_000, "srt-6": 80_000, "lrt-5": 30_000, "lrt-10": 100_000, "lrt-15": 175_000, "lrt-20": 250_000 },
  },
  {
    // TO:AUE p.223 and p.217: the turrets cost a rate for each ton of the turret itself (xIT; the sponson pair's is for both sponsons); an armored
    // component 150,000 for each slot it armors (xCS), and the row weighs half a ton a slot, so 300,000 a ton; the armored motive system 100,000 xIT
    cite: { book: TO, page: 223 },
    checked: "page",
    prices: {
      "battlemech-turret-shoulder": { perWeight: 10_000 }, "battlemech-turret-head": { perWeight: 10_000 }, "battlemech-turret-quad": { perWeight: 10_000 },
      "dual-turret": { perWeight: 5_000 }, "sponson-turret": { perWeight: 4_000 }, "vtol-chin-turret": { perWeight: 5_000 },
      "armored-component": { perWeight: 300_000 }, "armored-motive-system": { perWeight: 100_000 }, "modular-armor": 10_000,
      // p.221: sub-capital cannons, lasers and missiles (the ammunition price beside the cannons and missiles is not kept), cruise missiles (p.217), minesweeper,
      // field base, hyperpulse generators, comm-scanner suites, tug adaptor, space mine dispenser, ProtoMech Streak tube; the VTOL jet booster is 10,000 an engine rating point (the sub-capital weapons are on p. 223, the rest p. 221)
      "light-scc": 330_000, "medium-scc": 780_000, "heavy-scc": 1_300_000, "scl-1": 220_000, "scl-2": 335_000, "scl-3": 450_000,
      piranha: 75_000, stingray: 85_000, swordfish: 110_000, "manta-ray": 150_000,
      "cruise-missile-50": 900_000, "cruise-missile-70": 1_250_000, "cruise-missile-90": 2_550_000, "cruise-missile-120": 3_000_000,
      minesweeper: 40_000, "mobile-field-base": 150_000, "mobile-hpg": 1_000_000_000, "ground-mobile-hpg": 4_000_000_000, "small-ncss": 50_000_000, "large-ncss": 250_000_000,
      "naval-tug-adaptor": 100_000, "space-mine-dispenser": 15_000, "streak-lrm-protomech-tube": 15_000, "vtol-jet-booster": { perRating: 10_000 },
      // p.223: the satellite imagers and the VTOL mast mount
      "hi-res-imager": 150_000, "hyperspectral-imager": 550_000, "infrared-imager": 250_000, "vtol-mast-mount": 50_000,
      // p.223: a reusable drop chute costs twice the chute it is made from (1,000, 3,000 and 5,000)
      "reusable-vdc-standard": 2_000, "reusable-vdc-camouflage": 6_000, "reusable-vdc-stealth": 10_000,
    },
  },
  {
    // IO:AE p.215 (Dark Age Equipment)
    cite: { book: IO, page: 215 },
    checked: "page",
    prices: { "harjel-ii": 240_000, "harjel-iii": 360_000, "radical-heat-sink": 250_000, "risc-heat-sink-override-kit": 500, "risc-laser-pulse-module": 200_000, "remote-drone-command-console": 50_000 },
  },
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
      // p.213: cockpit and pilot-interface items (the SLDF neurohelmets 5,000 a pilot)
      "damage-interrupt-circuit": 150, "direct-neural-interface-modification": 500_000, "enhanced-imaging-interface": 400_000,
      // pp.211, 213 and 215: large-craft items
      "dropshuttle-bay": 150_000_000, "docking-collar-post-boom": 100_000, "docking-collar-pre-boom": 500_000, "sldf-sds-jammer-system": 800_000_000, "wob-super-jump-drive": 25_000_000,
      "dragons-breath-launch-system": 15_000_000,
      "sldf-advanced-neurohelmet-mech": 5_000, "sldf-advanced-neurohelmet-fighter": 5_000, "battlemech-neural-interface-unit": 650_000,
      "fusillade-launcher": 100_000, "magnetic-clamp-system": 25_000, "protomech-quad-melee-weapon-system": 70_000,
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
      "ppc-capacitor": 150_000, "recon-camera": 10_000, "protomech-melee-weapon": 50_000,
      "light-rifle": 37_750, "medium-rifle": 75_500, "heavy-rifle": 90_000,
      "taser": 200_000, "thunderbolt-5": 50_000, "thunderbolt-10": 175_000, "thunderbolt-15": 325_000, "thunderbolt-20": 450_000,
    },
  },
  {
    // TO:AUE p.217 (the melee items, motive systems, and the rest of the items whose weight a rule sets). `perUnitTon` is the table's
    // "xTT" (the unit's tonnage); `perWeight` the "xIT" (the item's own weight, exactly, all its mounts together).
    cite: { book: TO, page: 217 },
    checked: "page",
    prices: {
      "aes-arm": { perUnitTon: 500 }, "aes-leg": { perUnitTon: 700 }, "blue-shield": 1_000_000, "booby-trap": 100_000, "harjel": 120_000,
      "claws": { perUnitTon: 200 }, "lance": { perUnitTon: 150 }, "mace": 130_000, "talons": { perUnitTon: 300 },
      "partial-wing": { perWeight: 50_000 }, "jump-pack": { perWeight: 20_000 },
    },
  },
  {
    // TO:AUE pp.219, 221 and 223 (the rest)
    cite: { book: TO, page: 219 },
    checked: "page",
    prices: {
      "cockpit-command-console": 500_000, "collapsible-command-module": 500_000, "full-head-ejection-system": 1_725_000, "chameleon-lps": 600_000,
      "null-signature-system": 1_400_000, "aquatic-survival-system": 4_000, "supercharger": { perRating: 10_000 }, "void-signature-system": 2_000_000,
    },
  },
  {
    // TechManual pp.292-293 (Industrial Equipment): searchlight (mounted), ejection seat (IndustrialMech), extended fuel tanks, communications
    // equipment, and the cargo bays a 'Mech may carry, each per ton of the item's weight where the table says "per ton".
    cite: { book: TM, page: 292 },
    checked: "page",
    prices: {
      "searchlight": 2_000, "ejection-seat": 25_000, "extended-fuel-tank": { perTon: 500 }, "communications-equipment": { perTon: 10_000 },
      "cargo-standard": 0, "cargo-liquid": { perTon: 100 }, "cargo-insulated": { perTon: 250 },
      "ladder": { perAmount: 5 }, "cargo-container": 0, "dumper": 5_000, "paramedic-equipment": 7_500,
    },
  },
  {
    // TechManual pp.292-293: vehicle and unit equipment (Bulldozer, Field Kitchen, MASH, quarters and seating, lifeboats, escape pods)
    cite: { book: TM, page: 292 },
    checked: "page",
    prices: {
      "bulldozer": 50_000, "field-kitchen": 25_000, "mash-core-unit": 35_000, "mash-added-theater": 10_000,
      "quarters-steerage": 5_000, "quarters-second-class": 15_000, "quarters-first-class": 30_000, "seating-standard": 100, "seating-pillion": 10,
      "lifeboat-aerospace": 5_000, "lifeboat-atmospheric": 6_000, "lifeboat-maritime": 5_000, "escape-pod-aerospace": 5_000, "escape-pod-maritime": 5_000,
    },
  },
  {
    // TechManual pp.296-297 (Additional Battle Armor Weapons and Equipment): per item, per tube for the missile launchers
    cite: { book: TM, page: 297 },
    checked: "page",
    prices: { "ba-david-light-gauss-rifle": 22500, "ba-king-david-light-gauss-rifle": 30000, "ba-magshot-gauss-rifle": 10500, "ba-grand-mauler-gauss-rifle": 8000, "ba-tsunami-gauss-rifle": 9500, "ba-micro-grenade-launcher": 1950, "ba-heavy-grenade-launcher": 4500, "ba-light-machine-gun": 5000, "ba-machine-gun": 5000, "ba-heavy-machine-gun": 7500, "ba-light-mortar": 2100, "ba-heavy-mortar": 7500, "ba-light-recoilless-rifle": 1000, "ba-medium-recoilless-rifle": 3000, "ba-heavy-recoilless-rifle": 5000, "ba-flamer": 7500, "ba-er-small-laser": 11250, "ba-er-medium-laser": 80000, "ba-small-laser": 11250, "ba-medium-laser": 40000, "ba-small-pulse-laser": 16000, "ba-medium-pulse-laser": 60000, "ba-support-ppc": 14000, "ba-man-portable-plasma-rifle": 28000, "ba-firedrake-support-needler": 1500, "ba-compact-narc": 50000, "ba-pop-up-mine": 2500, "ba-active-probe": 50000, "ba-camo-system": 200000, "ba-cutting-torch": 1000, "ba-ecm-suite": 50000, "ba-extended-life-support": 10000, "ba-fuel-tank": 500, "ba-heat-sensor": 15000, "ba-improved-sensors": 35000, "ba-jump-booster": 75000, "ba-laser-microphone": 750, "ba-magnetic-clamps": 2500, "ba-lrm-1": 6000, "ba-lrm-2": 12000, "ba-lrm-3": 18000, "ba-lrm-4": 24000, "ba-lrm-5": 30000, "ba-srm-1": 5000, "ba-srm-2": 10000, "ba-srm-3": 15000, "ba-srm-4": 20000, "ba-srm-5": 25000, "ba-srm-6": 30000, "ba-mrm-1": 5000, "ba-mrm-2": 10000, "ba-mrm-3": 15000, "ba-mrm-4": 20000, "ba-mrm-5": 25000, "ba-rocket-launcher-1": 1500, "ba-rocket-launcher-2": 3000, "ba-rocket-launcher-3": 4500, "ba-rocket-launcher-4": 6000, "ba-rocket-launcher-5": 7500 },
  },
  {
    // TechManual pp.296-297 (Clan-only battle armor items; per tube for the Advanced SRM)
    cite: { book: TM, page: 297 },
    checked: "page",
    prices: { "ba-ap-gauss-rifle": 10000, "ba-bearhunter-superheavy-ac": 11250, "ba-er-micro-laser": 10000, "ba-micro-pulse-laser": 12500, "ba-heavy-small-laser": 20000, "ba-heavy-medium-laser": 100000, "ba-bomb-rack": 30000, "ba-advanced-srm-1": 15000, "ba-advanced-srm-2": 30000, "ba-advanced-srm-3": 45000, "ba-advanced-srm-4": 60000, "ba-advanced-srm-5": 75000, "ba-advanced-srm-6": 90000 },
  },
  {
    // TechManual p.298 (Additional Battle Armor Weapons and Equipment, continued): the fixed-weight items; one price for both tech bases
    cite: { book: TM, page: 298 },
    checked: "page",
    prices: { "ba-parafoil": 3_000, "ba-partial-wing": 50_000, "ba-power-pack": 1_000, "ba-remote-sensor-dispenser": 7_500, "ba-searchlight": 500, "ba-shotgun-microphone": 750, "ba-space-operations-adaptation": 50_000, "ba-light-tag": 40_000 },
  },
  {
    // TO:AUE p.225 (Battle Armor Construction Data): the battle armor versions; the ammunition price beside the item price is not kept. Per suit, per trooper for the BC3 systems.
    cite: { book: TO, page: 225 },
    checked: "page",
    prices: { "ba-mine-dispenser": 20_000, "ba-lb-x-ac": 70_000, "ba-tube-artillery": 200_000, "ba-myomer-booster": { perAmount: 75_000 }, "ba-drop-chute-standard": 1_000, "ba-drop-chute-camouflage": 3_000, "ba-drop-chute-stealth": 5_000, "ba-heavy-flamer": 11_250, "ba-er-pulse-laser-small": 30_000, "ba-er-pulse-laser-medium": 150_000, "ba-variable-speed-laser-small": 60_000, "ba-variable-speed-laser-medium": 200_000, "ba-taser": 10_000, "ba-angel-ecm": 750_000, "ba-c3": 62_500, "ba-c3i": 125_000 },
  },
  {
    // TO:AUE p.221 (Heavy Weapons and Equipment Construction Data: the weapon price of the naval weapons and mass drivers; the ammunition price beside it is not kept)
    cite: { book: TO, page: 221 },
    checked: "page",
    prices: { "nac-10": 2000000, "nac-20": 5000000, "nac-25": 7500000, "nac-30": 10500000, "nac-35": 14000000, "nac-40": 18000000, "light-n-gauss": 20300000, "medium-n-gauss": 30350000, "heavy-n-gauss": 50050000, "nl-35": 500000, "nl-45": 850000, "nl-55": 1250000, "light-n-ppc": 2000000, "medium-n-ppc": 3250000, "heavy-n-ppc": 9050000, "light-mass-driver": 150000000, "medium-mass-driver": 280000000, "heavy-mass-driver": 500000000 },
  },
  {
    // TechManual p.292 (Heavy Weapons and Equipment cost table: capital missile launchers and the screen launcher)
    cite: { book: TM, page: 292 },
    checked: "page",
    prices: { "killer-whale": 150_000, "white-shark": 130_000, barracuda: 90_000, "ar-10-launcher": 250_000, "kraken-t": 500_000, "killer-whale-t": 165_000, "white-shark-t": 145_000, "barracuda-t": 100_000, "screen-launcher": 250_000 },
  },
  {
    // TechManual p.279 (Combat Vehicle structural costs: a turret is 5,000 x its own tonnage; p.280 prints the same for a support vehicle)
    cite: { book: TM, page: 279 },
    checked: "page",
    prices: { turret: { perWeight: 5_000 } },
  },
  {
    // Tactical Operations: Advanced Units and Equipment, Construction Data table (printed p. 219): 5,000 + (10,000 x item tonnage).
    cite: { book: TO, page: 219 },
    checked: "page",
    prices: { "drone-operating-system": { base: 5_000, perWeight: 10_000 } },
  },
  {
    // TechManual pp.298-301 (Conventional Infantry Weapons: the weapon's price; the clip's price is in the row's `infantry.clip`)
    cite: { book: TM, page: 298 },
    checked: "page",
    prices: { "inf-bow-compound": 15, "inf-bow-daikyu": 30, "inf-bow-longbow": 20, "inf-bow-shortbow": 10, "inf-bow-hankyu": 15, "inf-club-blackjack-sap": 5, "inf-club-club-improvised": 0, "inf-crossbow-basic": 10, "inf-crossbow-heavy": 20, "inf-blade-axe": 25, "inf-blade-bokken": 15, "inf-blade-dao": 200, "inf-blade-carbon-reinforced-nails": 1000, "inf-blade-hatchet-tomahawk": 10, "inf-blade-katana-scimitar": 250, "inf-blade-knife-dagger-bayonet": 8, "inf-blade-no-dachi": 300, "inf-blade-sword": 30, "inf-blade-wakizashi": 150, "inf-blade-vibro-axe": 150, "inf-blade-vibro-blade": 100, "inf-blade-vibro-katana": 350, "inf-blade-vibro-sword-is": 300, "inf-blade-vibro-sword-clan": 500, "inf-nunchaku": 10, "inf-staff": 5, "inf-staff-pole-arm": 50, "inf-staff-stun-staff-single-end": 300, "inf-staff-stun-staff-double-end": 500, "inf-stunstick": 200, "inf-stunstick-mini": 50, "inf-whip": 18, "inf-whip-monowire": 200, "inf-whip-medusa": 2200, "inf-whip-neural-lash": 750, "inf-whip-neural-whip": 500, "inf-auto-pistol": 50, "inf-auto-pistol-hawk-eagle": 100, "inf-auto-pistol-magnum": 75, "inf-auto-pistol-m-g": 60, "inf-auto-pistol-nambu": 75, "inf-auto-pistol-serrek-7875d": 185, "inf-auto-pistol-sternsnacht-python": 125, "inf-dart-gun": 40, "inf-flare-pistol": 25, "inf-gauss-pistol": 1500, "inf-gauss-pistol-hold-out-mandrake": 750, "inf-gyrojet-pistol": 450, "inf-gyrojet-pistol-coventry-handrocket": 250, "inf-gyrojet-pistol-hold-out": 30, "inf-laser-pistol": 750, "inf-laser-pistol-blazer": 3000, "inf-laser-pistol-er": 1000, "inf-laser-pistol-hold-out": 100, "inf-laser-pistol-hold-out-white-dwarf": 250, "inf-laser-pistol-nakjima": 750, "inf-laser-pistol-sunbeam": 750, "inf-laser-pistol-sunbeam-nova": 1250, "inf-needler-pistol": 50, "inf-needler-pistol-hold-out": 20, "inf-needler-pistol-m-g-flechette": 100, "inf-needler-pistol-sea-eagle": 110, "inf-paint-gun-lgb-46r": 50, "inf-pistol-flamer": 50, "inf-pistol-hold-out": 20, "inf-pistol-makeshift": 15, "inf-pistol-tk-enforcer-semi-automatic": 110, "inf-pistol-spitball-gas-weapon": 6, "inf-pistol-sternsnacht-heavy-claymore": 200, "inf-pulse-laser-pistol-clan": 1500, "inf-pulse-laser-pistol-is": 1000, "inf-revolver": 60, "inf-revolver-magnum": 60, "inf-sonic-stunner": 100, "inf-tranq-gun": 30, "inf-auto-rifle": 80, "inf-elephant-gun": 100, "inf-gauss-rifle-thunderstroke": 2500, "inf-gauss-rifle-thunderstroke-ii": 3500, "inf-gyroslug-carbine": 800, "inf-gyroslug-carbine-star-king": 950, "inf-gyroslug-rifle": 1000, "inf-gyrojet-gun-heavy": 2500, "inf-gyrojet-rifle": 1000, "inf-laser-rifle": 1250, "inf-laser-rifle-blazer": 2190, "inf-laser-rifle-ebony-assault": 8500, "inf-laser-rifle-er": 2000, "inf-laser-rifle-er-starfire": 2500, "inf-laser-rifle-federated-barrett-m61a": 2150, "inf-laser-rifle-intek": 1250, "inf-laser-rifle-magna": 1500, "inf-laser-rifle-marx-xx": 1750, "inf-laser-rifle-mauser-960-assault-sys": 8000, "inf-laser-rifle-mauser-1200-lss": 10000, "inf-laser-rifle-mauser-iic": 18000, "inf-laser-rifle-maxell-pl-10": 2000, "inf-needler-rifle": 75, "inf-needler-rifle-shredder-heavy": 150, "inf-needler-rifle-m-g-flechette": 200, "inf-pulse-laser-rifle-clan": 3000, "inf-pulse-laser-rifle-is": 2000, "inf-rifle-bolt-action": 60, "inf-rifle-federated-barrett-m42b": 1385, "inf-rifle-federated-long": 120, "inf-rifle-imperator-ax-22-assault": 200, "inf-rifle-m-g-g-150": 270, "inf-rifle-makeshift": 20, "inf-rifle-minolta-9000-adv-sniper-sys": 1000, "inf-rifle-radium-sniper": 9500, "inf-rifle-sniper": 350, "inf-rifle-tk-assault": 150, "inf-rifle-zeus-heavy": 200, "inf-auto-shotgun": 200, "inf-ceres-arms-crowdbuster": 150, "inf-gel-gun-buccaneer": 200, "inf-shotgun-avenger-ccw": 345, "inf-shotgun-combat": 175, "inf-shotgun-double-barrel": 30, "inf-shotgun-double-barrel-sawed-off": 30, "inf-shotgun-pump-action": 40, "inf-shotgun-pump-action-sawed-off": 40, "inf-auto-pistol-mydron": 100, "inf-auto-pistol-stetta": 150, "inf-gauss-submachine-gun": 2000, "inf-machine-pistol-martial-eagle": 180, "inf-submachine-gun": 80, "inf-smg-gunther-mp-20": 125, "inf-smg-imperator-2894a1": 100, "inf-smg-ka-23-subgun": 350, "inf-smg-rorynex-rm-3-xxi": 80, "inf-smg-rugan": 100, "inf-grenade": 16, "inf-grenade-micro": 2, "inf-grenade-mini": 8, "inf-grenade-rocket-assisted": 50, "inf-aa-weapon-mk-1-light-aa": 1000, "inf-aa-weapon-mk-2-man-portable-aa": 3500, "inf-autocannon-bearhunter-super-heavy": 3000, "inf-autocannon-semi-portable": 2000, "inf-flamer-heavy": 200, "inf-flamer-man-portable": 100, "inf-gauss-cannon-grand-mauler": 5000, "inf-gauss-rifle-magshot": 8500, "inf-gauss-rifle-tsunami-heavy": 5500, "inf-gauss-rifle-light-david": 6000, "inf-gauss-rifle-light-king-david": 8000, "inf-grenade-launcher": 465, "inf-grenade-launcher-automatic": 975, "inf-grenade-launcher-compact": 290, "inf-grenade-launcher-heavy": 1500, "inf-grenade-launcher-heavy-auto": 4500, "inf-laser-hellbore-assault": 2500, "inf-lrm-launcher-corean-farshot": 2000, "inf-machine-gun-light": 400, "inf-machine-gun-portable": 1000, "inf-machine-gun-semi-portable": 1100, "inf-machine-gun-support": 1750, "inf-mortar-heavy": 5000, "inf-mortar-light": 1400, "inf-mrm-launcher": 2500, "inf-needler-support-firedrake": 500, "inf-particle-cannon-semi-portable": 7000, "inf-particle-cannon-support": 45000, "inf-plasma-rifle-man-portable": 7500, "inf-pulse-laser-dragonsbane-disp": 5000, "inf-recoilless-rifle-heavy": 3000, "inf-recoilless-rifle-light": 300, "inf-recoilless-rifle-medium": 2000, "inf-rocket-launcher-law": 350, "inf-rocket-launcher-v-law": 75, "inf-srm-launcher-standard-two-shot": 1500, "inf-srm-launcher-heavy": 3000, "inf-srm-launcher-light": 1500, "inf-support-laser": 10000, "inf-support-laser-er-is": 11250, "inf-support-laser-er-clan": 11250, "inf-support-laser-er-heavy-is": 80000, "inf-support-laser-er-heavy-clan": 80000, "inf-support-laser-er-semi-portable": 10000, "inf-support-laser-heavy": 40000, "inf-support-laser-heavy-semi-portable": 20000, "inf-support-laser-semi-portable": 5000, "inf-support-laser-ultra-heavy": 100000, "inf-support-pulse-laser": 16000, "inf-support-pulse-laser-heavy": 60000, "inf-support-pulse-laser-semi-portable": 12500 },
  },
  {
    // TechManual p.293 (Industrial Equipment cost table): the bay door and the look-down radar
    cite: { book: TM, page: 293 },
    checked: "page",
    prices: { "bay-door": 1_000, "look-down-radar": 400_000 },
  },
  {
    // TechManual pp.293-294 (Industrial Equipment cost table, Transport Bay): a cubicle's price is per cubicle (the ProtoMech bay's for its five); the infantry and battle armor bays
    // cost 15,000 for each ton of the bay's weight; the compartment costs nothing
    cite: { book: TM, page: 293 },
    checked: "page",
    prices: {
      "sprayer-vehicular": 1_000, "bay-vehicle-light": 10_000, "bay-vehicle-heavy": 10_000, "bay-vehicle-super-heavy": 20_000, "bay-mech": 20_000, "bay-fighter": 20_000, "bay-small-craft": 20_000, "bay-protomech": 10_000,
      "bay-infantry-foot": { perWeight: 15_000 }, "bay-infantry-jump": { perWeight: 15_000 }, "bay-infantry-motorized": { perWeight: 15_000 }, "bay-infantry-mechanized": { perWeight: 15_000 },
      "bay-battle-armor-4": { perWeight: 15_000 }, "bay-battle-armor-6": { perWeight: 15_000 }, "bay-battle-armor-5": { perWeight: 15_000 }, "compartment-infantry": 0,
    },
  },
  {
    // TechManual p.296 (Heavy Weapon Ammunition cost table, Fighter/Airborne Support Vehicle Hardpoint Weapons): a bomb's price is the second figure, the first prints NA
    cite: { book: TM, page: 296 },
    checked: "page",
    prices: { "bomb-high-explosive": 5_000, "bomb-cluster": 8_000, "bomb-laser-guided": 10_000, "bomb-inferno": 6_000, "bomb-mines": 12_000 },
  },
  {
    // TO:AUE p.227 (Heavy Weapons Ammunition Construction Data, Bombs; the book's dagger says the figure is per bomb, not per ton)
    cite: { book: TO, page: 227 },
    checked: "page",
    prices: {
      "bomb-air-to-air-arrow": 9_000, "bomb-anti-ship-missile": 15_000, "bomb-anti-ship-ew-missile": 20_000, "bomb-arrow-iv-homing": 3_000,
      "bomb-arrow-iv-non-homing": 2_000, "bomb-light-air-to-air": 6_000, "bomb-thunder-fascam": 12_000, "bomb-thunder-active": 36_000,
      "bomb-thunder-vibrabomb": 24_000, "bomb-torpedo": 7_000,
    },
  },
  {
    // IO:AE p.217 (Additional Alternate Era Weapons and Equipment, Thermobaric Weapons): a fuel-air bomb is a flat price each, small 18,000 and large 35,000
    cite: { book: IO, page: 217 },
    checked: "page",
    prices: { "bomb-fuel-air-small": 18_000, "bomb-fuel-air-large": 35_000 },
  },
];

/**
 * Alternative munition prices per ton (TO:AUE printed pp. 225 and 227, Heavy Weapons Ammunition Construction Data, read against the page images). The
 * table prints either a price (`perTon`) or a multiplier (`times`) on the price of the standard round of the weapon the munition serves, so a multiplier
 * has no figure of its own here. Keys are the id stems (without `-is` and `-clan`). Arrow IV (Homing), the standard Arrow IV round, is 15,000 a ton and
 * Arrow IV (Non-Homing) 10,000 (the catalog has no row for the latter). The Copperhead rows are x1.5, as the same table prints them.
 */
export const MUNITION_PRICE: Sourced & { rows: Record<string, { perTon: number } | { times: number }> } = {
  cite: { book: TO, page: 227 },
  checked: "page",
  rows: {
    "ammo-flamer-coolant": { perTon: 3_000 }, "ammo-flamer-corrosive": { perTon: 5_000 }, "ammo-flamer-flame-retardant-foam": { perTon: 1_000 },
    "ammo-flamer-inferno-fuel": { perTon: 2_000 }, "ammo-flamer-oil-slick": { perTon: 2_000 }, "ammo-flamer-paint-obscurant": { perTon: 1_000 },
    "ammo-flamer-water": { perTon: 500 }, "ammo-air-defense-arrow": { perTon: 45_000 }, "ammo-arrow-iv": { perTon: 15_000 },
    "ammo-caseless-ac": { times: 1.5 }, "ammo-flak-ac": { times: 1.5 }, "ammo-tracer-ac": { times: 1.5 }, "ammo-arrow-iv-cluster": { times: 1.5 },
    "ammo-cluster-long-tom": { times: 1.5 }, "ammo-cluster-sniper": { times: 1.5 }, "ammo-cluster-thumper": { times: 1.5 }, "ammo-flechette-artillery": { times: 1.5 },
    "ammo-copperhead-long-tom": { times: 1.5 }, "ammo-copperhead-sniper": { times: 1.5 }, "ammo-copperhead-thumper": { times: 1.5 },
    "ammo-thunder-fascam-artillery": { times: 1.5 }, "ammo-arrow-iv-illumination": { times: 0.5 }, "ammo-illumination-artillery": { times: 0.5 },
    "ammo-arrow-iv-smoke": { times: 0.5 }, "ammo-smoke-artillery": { times: 0.5 }, "ammo-arrow-iv-laser-inhibiting": { times: 4 }, "ammo-inferno-iv": { times: 1 },
    "ammo-thunder-active-iv": { times: 3 }, "ammo-thunder-vibrabomb-iv": { times: 2 },
    // Fuel-air shells (IO:AE printed p. 217, Additional Alternate Era Weapons and Equipment, Thermobaric Weapons): three times the standard shell of the weapon.
    "ammo-fuel-air-arrow-iv": { times: 3 }, "ammo-fuel-air-thumper": { times: 3 }, "ammo-fuel-air-sniper": { times: 3 }, "ammo-fuel-air-long-tom": { times: 3 },
    "ammo-fuel-air-thumper-cannon": { times: 3 }, "ammo-fuel-air-sniper-cannon": { times: 3 }, "ammo-fuel-air-long-tom-cannon": { times: 3 },
  },
};

/**
 * Mine types (TO:AUE printed p. 227, Heavy Weapons Ammunition Construction Data, Mines; read against the page image): C-bills for each 5 points of minefield. A mine dispenser
 * holds two shots of 10 points (rules/munitions.ts), so the two shots cost four times the figure; for the standard mine that is 5,000, the ammunition price the battle armor
 * table (p. 225) prints beside the dispenser. Ammunition is not added to a unit's cost (TechManual p. 282), so this is what a reload costs, not part of the unit's cost.
 * Keys are the id stems of the catalog rows. */
export const MINE_PRICE: Sourced & { per5Points: Record<string, number> } = {
  cite: { book: TO, page: 227 },
  checked: "page",
  per5Points: {
    "mine-active": 5_000, "mine-command-detonated": 1_875, "mine-emp-command-detonated": 18_000, "mine-emp-vibrabomb": 25_000, "mine-inferno": 1_250,
    "mine-space": 375, "mine-standard": 1_250, "mine-vibrabomb": 2_500,
  },
};

/** Retractable blade (printed p.293, Industrial Equipment): the mechanism, plus the blade at a price per ton of its weight.
 * The blade's weight is the 'Mech's tonnage over 20, rounded up to a half ton (p.237), then up to a whole ton as the table's
 * footnote says; the extra half ton in the item's listed weight is the mechanism. */
export const RETRACTABLE_BLADE_COST: Sourced & { mechanism: number; perTon: number } = {
  cite: { book: TM, page: 293 },
  checked: "page",
  mechanism: 10_000,
  perTon: 10_000,
};
