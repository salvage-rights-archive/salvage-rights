// Support Vehicle tables (Classic BattleTech): the figures TechManual (corrected sixth printing, errata v8.0) prints for Support Vehicle construction
// (printed pp. 116-139), their costs (p. 280 and the final formulas, p. 285) and Battle Value (the v4.1 replacement pages), each read against the
// page image. Plain data: nothing here runs. Where the 8th-printing errata changes a printed figure the erratum is the figure here. The tables
// are our own; the book's wording is not copied. Equipment is the one catalog (data/equipment): a row's `units` names "vehicle", and the Support Vehicle
// slot column is read from the row's note (rules/support-vehicle/sv.ts).
import type { BookPage } from "./vehicle";

const TM = "TechManual";
const BV = "TechManual Battle Value v4.1";

export type SvMotiveId = "airship" | "fixed-wing" | "hover" | "naval" | "tracked" | "vtol" | "wheeled" | "wige";
export type SvSize = "small" | "medium" | "large";
export type TechRating = "A" | "B" | "C" | "D" | "E" | "F";
export const TECH_RATINGS: TechRating[] = ["A", "B", "C", "D", "E", "F"];
/** Which blank record sheet the book says to use (p. 119, Support Vehicle Record Sheet Table). */
export type SvSheet = "ground" | "large-ground" | "naval" | "vtol" | "airship" | "fighter";

export const SV_PAGES = {
  motives: { book: TM, page: 119 },
  weights: { book: TM, page: 120 },
  structure: { book: TM, page: 122 },
  modifications: { book: TM, page: 122 },
  engine: { book: TM, page: 127 },
  fuel: { book: TM, page: 126 },
  crew: { book: TM, page: 131 },
  space: { book: TM, page: 132 },
  armor: { book: TM, page: 134 },
  cost: { book: TM, page: 280 },
  finalCost: { book: TM, page: 285 },
  bv: { book: BV, page: 302 },
  unitTypeModifiers: { book: TM, page: 316 },
} as const satisfies Record<string, BookPage>;

export interface SvMotive {
  id: SvMotiveId;
  label: string;
  /** The greatest weight, in tons (the Motive Types Table; naval with the hydrofoil modification stops at 100). */
  maxTons: number;
  sheet: SvSheet;
  /** True for the two types that use Aerospace Fighter movement and combat rules (Safe and Maximum Thrust, structural integrity). */
  air: boolean;
  /** TM p. 285: the unit's tons are divided by this in the final cost formula. */
  costDivisor: number;
  /** TM p. 316, Unit Type Modifiers Table. */
  bvModifier: number;
  restricted: string;
  /** The tonnage above which the ground record sheet changes to the Large one (Hover, Tracked, Wheeled, WiGE). */
  hasLargeSheet: boolean;
  level: "standard";
}

export const SV_MOTIVES: SvMotive[] = [
  { id: "airship", label: "Airship", maxTons: 300, sheet: "airship", air: true, costDivisor: 10_000, bvModifier: 0.7, restricted: "Woods, hills and structures at the unit's altitude", hasLargeSheet: false, level: "standard" },
  { id: "fixed-wing", label: "Fixed-wing", maxTons: 200, sheet: "fighter", air: true, costDivisor: 50, bvModifier: 1.0, restricted: "Woods, hills and structures at the unit's altitude", hasLargeSheet: false, level: "standard" },
  { id: "hover", label: "Hover", maxTons: 100, sheet: "ground", air: false, costDivisor: 50, bvModifier: 0.7, restricted: "Light and heavy woods", hasLargeSheet: true, level: "standard" },
  { id: "naval", label: "Naval", maxTons: 300, sheet: "naval", air: false, costDivisor: 100_000, bvModifier: 0.6, restricted: "All but water of depth 1 or more", hasLargeSheet: false, level: "standard" },
  { id: "tracked", label: "Tracked", maxTons: 200, sheet: "ground", air: false, costDivisor: 100, bvModifier: 0.9, restricted: "Heavy woods, water of depth 1 or more", hasLargeSheet: true, level: "standard" },
  { id: "vtol", label: "VTOL", maxTons: 60, sheet: "vtol", air: false, costDivisor: 30, bvModifier: 0.7, restricted: "Woods, hills and structures at the unit's altitude", hasLargeSheet: false, level: "standard" },
  { id: "wheeled", label: "Wheeled", maxTons: 160, sheet: "ground", air: false, costDivisor: 200, bvModifier: 0.8, restricted: "Rough, rubble, woods, water of depth 1 or more", hasLargeSheet: true, level: "standard" },
  { id: "wige", label: "Wing-in-Ground-Effect (WiGE)", maxTons: 240, sheet: "ground", air: false, costDivisor: 25, bvModifier: 0.7, restricted: "Woods, hills and structures at the unit's altitude", hasLargeSheet: true, level: "standard" },
];
export const svMotiveOf = (id: string): SvMotive | undefined => SV_MOTIVES.find((m) => m.id === id);

export interface SvWeightRow {
  motive: SvMotiveId;
  size: SvSize;
  /** Tons, inclusive (a Small unit is 0.100 to 4.999). */
  min: number;
  max: number;
  /** The least structural Tech Rating, and the Availability Rating the row prints. */
  minRating: TechRating;
  availability: string;
  /** Base Chassis Value and Base Engine Value. */
  chassis: number;
  engine: number;
}

/** TM p. 120, Master Support Vehicle Weight Table (the errata of p. 20 puts the WiGE Large range at 80.5 to 240 tons, as the table prints it). */
export const SV_WEIGHTS: SvWeightRow[] = [
  { motive: "airship", size: "small", min: 0.1, max: 4.999, minRating: "A", availability: "C-D-C", chassis: 0.2, engine: 0.004 },
  { motive: "airship", size: "medium", min: 5, max: 300, minRating: "B", availability: "D-E-D", chassis: 0.25, engine: 0.008 },
  { motive: "fixed-wing", size: "small", min: 0.1, max: 4.999, minRating: "B", availability: "C-D-C", chassis: 0.08, engine: 0.005 },
  { motive: "fixed-wing", size: "medium", min: 5, max: 100, minRating: "B", availability: "C-D-C", chassis: 0.1, engine: 0.01 },
  { motive: "fixed-wing", size: "large", min: 100.5, max: 200, minRating: "B", availability: "D-E-D", chassis: 0.15, engine: 0.015 },
  { motive: "hover", size: "small", min: 0.1, max: 4.999, minRating: "C", availability: "A-B-A", chassis: 0.2, engine: 0.0025 },
  { motive: "hover", size: "medium", min: 5, max: 50, minRating: "C", availability: "A-B-A", chassis: 0.25, engine: 0.004 },
  { motive: "hover", size: "large", min: 50.5, max: 100, minRating: "C", availability: "B-C-B", chassis: 0.3, engine: 0.008 },
  { motive: "naval", size: "small", min: 0.1, max: 4.999, minRating: "A", availability: "C-D-C", chassis: 0.12, engine: 0.004 },
  { motive: "naval", size: "medium", min: 5, max: 300, minRating: "A", availability: "C-D-C", chassis: 0.15, engine: 0.007 },
  { motive: "tracked", size: "small", min: 0.1, max: 4.999, minRating: "B", availability: "B-C-B", chassis: 0.13, engine: 0.006 },
  { motive: "tracked", size: "medium", min: 5, max: 100, minRating: "B", availability: "B-C-B", chassis: 0.15, engine: 0.013 },
  { motive: "tracked", size: "large", min: 100.5, max: 200, minRating: "B", availability: "C-D-C", chassis: 0.25, engine: 0.025 },
  { motive: "vtol", size: "small", min: 0.1, max: 4.999, minRating: "C", availability: "C-D-C", chassis: 0.2, engine: 0.002 },
  { motive: "vtol", size: "medium", min: 5, max: 30, minRating: "C", availability: "C-D-C", chassis: 0.25, engine: 0.0025 },
  { motive: "vtol", size: "large", min: 30.5, max: 60, minRating: "C", availability: "D-E-D", chassis: 0.3, engine: 0.004 },
  { motive: "wheeled", size: "small", min: 0.1, max: 4.999, minRating: "A", availability: "A-A-A", chassis: 0.12, engine: 0.0025 },
  { motive: "wheeled", size: "medium", min: 5, max: 80, minRating: "A", availability: "A-B-A", chassis: 0.15, engine: 0.0075 },
  { motive: "wheeled", size: "large", min: 80.5, max: 160, minRating: "A", availability: "B-C-B", chassis: 0.18, engine: 0.015 },
  { motive: "wige", size: "small", min: 0.1, max: 4.999, minRating: "C", availability: "B-C-B", chassis: 0.12, engine: 0.003 },
  { motive: "wige", size: "medium", min: 5, max: 80, minRating: "C", availability: "B-C-B", chassis: 0.15, engine: 0.005 },
  { motive: "wige", size: "large", min: 80.5, max: 240, minRating: "C", availability: "C-D-C", chassis: 0.17, engine: 0.006 },
];

/** The least weight, and half-ton step (a Small unit is weighed to the kilogram): TM p. 117. */
export const SV_WEIGHT_RULES = { smallBelow: 5, smallStep: 0.001, step: 0.5, min: 0.1, cite: SV_PAGES.weights };

/** TM p. 122, Tech Rating Multipliers (structure). */
export const TECH_MULTIPLIER: Record<TechRating, number> = { A: 1.6, B: 1.3, C: 1.15, D: 1.0, E: 0.85, F: 0.66 };
export const TECH_LEVEL_TEXT: Record<TechRating, string> = {
  A: "Primitive (19th to early 20th century)",
  B: "Low-tech (late 20th century)",
  C: "Common (21st and 22nd centuries)",
  D: "High-tech (Age of War and Succession Wars)",
  E: "Advanced (Star League, Inner Sphere after 3050)",
  F: "Hyper-advanced (Clan, Inner Sphere after 3065)",
};

export type SvModId =
  | "amphibious" | "armored" | "bicycle" | "convertible" | "dune-buggy" | "environmental-sealing" | "hydrofoil" | "monocycle" | "off-road" | "omni" | "prop"
  | "snowmobile" | "stol" | "submersible" | "tractor" | "trailer" | "ultra-light" | "vstol";

export interface SvMod {
  id: SvModId;
  label: string;
  /** Least structural Tech Rating, and the weight multiplier (TM p. 122). */
  minRating: TechRating;
  multiplier: number;
  /** The cost multiplier (TM p. 280), its Tech Rating and Availability Rating. */
  costMultiplier: number;
  costRating: TechRating;
  costAvailability: string;
  /** What it does, in our words. */
  effect: string;
  /** Restriction text, in our words. */
  only: string;
  /** Motive types it fits; absent for no restriction. */
  motives?: SvMotiveId[];
  /** Small units only. */
  small?: true;
  /** Mods it may not be combined with. */
  excludes?: SvModId[];
}

export const SV_MODS: SvMod[] = [
  { id: "amphibious", label: "Amphibious", minRating: "C", multiplier: 1.75, costMultiplier: 1.25, costRating: "C", costAvailability: "C-D-C", effect: "May cross or land on water of any depth, afloat on its surface.", only: "Not for hover or naval units.", motives: ["airship", "fixed-wing", "tracked", "vtol", "wheeled", "wige"] },
  { id: "armored", label: "Armored", minRating: "A", multiplier: 1.5, costMultiplier: 2.0, costRating: "A", costAvailability: "C-E-D", effect: "May mount the heavier armor marked with an asterisk in the armor table.", only: "Not for airships.", motives: ["fixed-wing", "hover", "naval", "tracked", "vtol", "wheeled", "wige"], excludes: ["ultra-light"] },
  { id: "bicycle", label: "Bicycle", minRating: "A", multiplier: 0.75, costMultiplier: 0.75, costRating: "A", costAvailability: "A-A-A", effect: "May enter light woods where it could not.", only: "Small wheeled and small hover units only.", motives: ["wheeled", "hover"], small: true, excludes: ["monocycle"] },
  { id: "convertible", label: "Convertible", minRating: "A", multiplier: 1.1, costMultiplier: 1.1, costRating: "A", costAvailability: "A-A-A", effect: "No turret; a hit to the turret location with the top open kills the crew.", only: "Wheeled, tracked and hover units only.", motives: ["wheeled", "tracked", "hover"] },
  { id: "dune-buggy", label: "Dune buggy", minRating: "B", multiplier: 1.5, costMultiplier: 1.25, costRating: "B", costAvailability: "C-D-C", effect: "Moves normally only on sand; elsewhere 1 less Cruising MP and no flank speed (not tracked in standard play).", only: "Wheeled units only.", motives: ["wheeled"], excludes: ["snowmobile", "amphibious", "off-road"] },
  { id: "environmental-sealing", label: "Environmental sealing", minRating: "B", multiplier: 2.0, costMultiplier: 1.75, costRating: "C", costAvailability: "B-D-C", effect: "A fission, fusion or electric unit may work in vacuum or under water unless breached.", only: "No restriction." },
  { id: "hydrofoil", label: "Hydrofoil", minRating: "B", multiplier: 1.7, costMultiplier: 1.1, costRating: "B", costAvailability: "C-D-C", effect: "Operates as a hydrofoil: Cruising MP x 1.25.", only: "Naval units up to 100 tons only.", motives: ["naval"] },
  { id: "monocycle", label: "Monocycle", minRating: "B", multiplier: 0.5, costMultiplier: 1.3, costRating: "B", costAvailability: "D-D-D", effect: "May enter light woods where it could not.", only: "Small wheeled and small hover units only.", motives: ["wheeled", "hover"], small: true, excludes: ["bicycle"] },
  { id: "off-road", label: "Off-road", minRating: "B", multiplier: 1.5, costMultiplier: 1.2, costRating: "B", costAvailability: "B-C-B", effect: "Moves normally on and off paved ground; still immobile in forbidden terrain.", only: "Wheeled units only.", motives: ["wheeled"] },
  { id: "omni", label: "Omni", minRating: "E", multiplier: 1.0, costMultiplier: 1.0, costRating: "E", costAvailability: "X-X-E", effect: "May be built as an OmniVehicle (no mechanized infantry rules).", only: "No restriction." },
  { id: "prop", label: "Propeller-driven", minRating: "B", multiplier: 1.2, costMultiplier: 0.75, costRating: "B", costAvailability: "B-C-B", effect: "Cannot fly above atmospheric row 1; 1 hex a turn on the high-altitude map; out of control at velocity 8 or more.", only: "Fixed-wing units only.", motives: ["fixed-wing"] },
  { id: "snowmobile", label: "Snowmobile", minRating: "B", multiplier: 1.75, costMultiplier: 1.3, costRating: "B", costAvailability: "D-E-D", effect: "Moves normally only on snow and ice; elsewhere 1 less Cruising MP and no flank speed (not tracked in standard play).", only: "Wheeled and tracked units only.", motives: ["wheeled", "tracked"], excludes: ["dune-buggy", "amphibious", "off-road"] },
  { id: "stol", label: "STOL", minRating: "C", multiplier: 1.5, costMultiplier: 1.5, costRating: "C", costAvailability: "B-C-B", effect: "Lands and takes off in 10 hexes (300 meters) of runway.", only: "Fixed-wing units only.", motives: ["fixed-wing"] },
  { id: "submersible", label: "Submersible", minRating: "B", multiplier: 1.8, costMultiplier: 3.5, costRating: "B", costAvailability: "C-D-C", effect: "May operate as a submarine.", only: "Naval units only.", motives: ["naval"] },
  { id: "tractor", label: "Tractor", minRating: "A", multiplier: 1.2, costMultiplier: 1.1, costRating: "A", costAvailability: "A-A-A", effect: "Tows other units of its kind: ground units up to its own mass, naval units up to five times it.", only: "Wheeled, tracked and naval units only.", motives: ["wheeled", "tracked", "naval"] },
  { id: "trailer", label: "Trailer", minRating: "A", multiplier: 0.8, costMultiplier: 0.75, costRating: "A", costAvailability: "A-A-A", effect: "Needs no engine or controls; a tractor draws it.", only: "Wheeled and tracked units only.", motives: ["wheeled", "tracked"] },
  { id: "ultra-light", label: "Ultra-light", minRating: "D", multiplier: 0.5, costMultiplier: 1.5, costRating: "D", costAvailability: "C-E-D", effect: "Armor no better than BAR 5.", only: "Small units only.", small: true, excludes: ["armored"] },
  { id: "vstol", label: "VSTOL", minRating: "C", multiplier: 2.0, costMultiplier: 2.0, costRating: "C", costAvailability: "C-D-C", effect: "Works as an STOL or takes off and lands straight up and down.", only: "Fixed-wing units only.", motives: ["fixed-wing"] },
];
export const svModOf = (id: string): SvMod | undefined => SV_MODS.find((m) => m.id === id);

// ---- Engines ------------------------------------------------------------------------------------------------------------------------

export type SvEngineId = "steam" | "ice" | "battery" | "fuel-cell" | "solar" | "fission" | "fusion";
export interface SvEngine {
  id: SvEngineId;
  label: string;
  /** Engine Weight Multiplier by Tech Rating A to F; null is NA (TM p. 127, with errata: Steam E 2.6, ICE B 3.0). */
  multiplier: (number | null)[];
  /** Fuel, as a share of the engine's weight, for each 100 km of range; null for a type that needs none. */
  fuelPercent: number | null;
  /** True for the three electric types. */
  electric: boolean;
  /** Cost multiplier on 5,000 per engine ton (p. 280), Tech Rating and Availability. */
  costMultiplier: number;
  costRating: TechRating;
  costAvailability: string;
}
export const SV_ENGINES: SvEngine[] = [
  { id: "steam", label: "Steam", multiplier: [4.0, 3.5, 3.0, 2.8, 2.6, 2.5], fuelPercent: 3, electric: false, costMultiplier: 0.8, costRating: "A", costAvailability: "A-A-A" },
  { id: "ice", label: "Internal combustion", multiplier: [null, 3.0, 2.0, 1.5, 1.3, 1.0], fuelPercent: 1, electric: false, costMultiplier: 1.0, costRating: "B", costAvailability: "A-A-A" },
  { id: "battery", label: "Electric (battery)", multiplier: [null, null, 1.5, 1.2, 1.0, 0.8], fuelPercent: 5, electric: true, costMultiplier: 1.2, costRating: "C", costAvailability: "A-B-A" },
  { id: "fuel-cell", label: "Electric (fuel cell)", multiplier: [null, null, 1.2, 1.0, 0.9, 0.7], fuelPercent: 1.5, electric: true, costMultiplier: 1.4, costRating: "C", costAvailability: "B-C-C" },
  { id: "solar", label: "Electric (solar)", multiplier: [null, null, 5.0, 4.5, 4.0, 3.5], fuelPercent: null, electric: true, costMultiplier: 1.6, costRating: "C", costAvailability: "C-D-C" },
  { id: "fission", label: "Fission", multiplier: [null, null, 1.75, 1.5, 1.4, 1.3], fuelPercent: null, electric: false, costMultiplier: 3.0, costRating: "C", costAvailability: "E-E-D" },
  { id: "fusion", label: "Fusion", multiplier: [null, null, 1.5, 1.0, 0.75, 0.5], fuelPercent: null, electric: false, costMultiplier: 2.0, costRating: "C", costAvailability: "C-E-D" },
];
export const svEngineOf = (id: string): SvEngine | undefined => SV_ENGINES.find((e) => e.id === id);
/** ICE running on alcohol or natural gas uses 1.25 percent per 100 km (errata v8.0 to p. 127). */
export const ALTERNATE_FUEL_PERCENT = 1.25;

/** Engine types a motive type cannot take (p. 127): steam only on ground wheeled, tracked, airship and naval; solar not on hover or VTOL; electric on a fixed-wing only with the prop modification. */
export const ENGINE_BARRED: Record<SvMotiveId, SvEngineId[]> = {
  wheeled: [], tracked: [], airship: [], naval: [],
  hover: ["steam", "solar"], vtol: ["steam", "solar"], "fixed-wing": ["steam"], wige: ["steam"],
};

/** Minimum engine weights, in tons (p. 127 and the errata): fission any rating and fusion at C, 5; fusion D and above, 0.25; hover at least a fifth of the tons. */
export const ENGINE_MINIMUMS = { fissionTons: 5, fusionCTons: 5, fusionTons: 0.25, hoverShare: 0.2 };

/** Airship and fixed-wing fuel, kilograms per Thrust Point by Tech Rating A to F (p. 126); an airship and a prop-driven fixed-wing unit take 0.75 of it, up to the kilogram. */
export const AIR_FUEL_KG: Record<SvSize, number[]> = {
  small: [50, 30, 23, 15, 13, 10],
  medium: [63, 38, 25, 20, 18, 15],
  large: [83, 50, 35, 28, 23, 20],
};
export const AIR_FUEL_PROP_FACTOR = 0.75;

// ---- Structure, armor, crew, slots -------------------------------------------------------------------------------------------------

/** Structure points: a tenth of the tons, up, in each location (turret and rotor too) (p. 123). */
export const SV_STRUCTURE = { share: 0.1, cite: SV_PAGES.structure };
/** Item slots: 5 plus 1 for every 10 tons, down (p. 120). */
export const SV_SLOTS = { base: 5, perTons: 10, cite: SV_PAGES.weights };
/** Airship structural integrity: Safe Thrust or 2 percent of the tons (down), whichever is more, at least 1 (p. 130, errata). */
export const SV_AIRSHIP_SI = { share: 0.02, min: 1 };
/** Flank is cruising x 1.5, up; maximum thrust is safe thrust x 1.5, up (an airship's to a multiple of a quarter) (p. 127). */
export const SV_SPEED = { flank: 1.5, airshipStep: 0.25, airshipMaxSafe: 2 };

/** Maximum armor factor, by motive type: a base of 4 and a share per ton, down (p. 134, errata for WiGE). */
export const SV_ARMOR_MAX: Record<SvMotiveId, number> = { airship: 0.334, naval: 0.334, wige: 0.5, "fixed-wing": 1, hover: 1, vtol: 1, tracked: 2, wheeled: 2 };
export const SV_ARMOR_BASE = 4;
export const SV_ROTOR_MAX = 2;
export const BARS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
/** Kilograms per armor point by BAR then Tech Rating A to F; null is NA; `armoredOnly` marks the asterisk (p. 134, errata). */
export const SV_ARMOR_KG: Record<number, ({ kg: number; armoredOnly?: true } | null)[]> = {
  2: [{ kg: 40 }, { kg: 25 }, { kg: 16 }, { kg: 13 }, { kg: 12 }, { kg: 11 }],
  3: [{ kg: 60, armoredOnly: true }, { kg: 38 }, { kg: 24 }, { kg: 19 }, { kg: 17 }, { kg: 16 }],
  4: [null, { kg: 50 }, { kg: 32 }, { kg: 26 }, { kg: 23 }, { kg: 21 }],
  5: [null, { kg: 63, armoredOnly: true }, { kg: 40 }, { kg: 32 }, { kg: 28 }, { kg: 26 }],
  6: [null, null, { kg: 48 }, { kg: 38 }, { kg: 34 }, { kg: 32 }],
  7: [null, null, { kg: 56, armoredOnly: true }, { kg: 45 }, { kg: 40 }, { kg: 37 }],
  8: [null, null, null, { kg: 51, armoredOnly: true }, { kg: 45 }, { kg: 42 }],
  9: [null, null, null, { kg: 57, armoredOnly: true }, { kg: 51, armoredOnly: true }, { kg: 47 }],
  10: [null, null, null, { kg: 63, armoredOnly: true }, { kg: 56, armoredOnly: true }, { kg: 52, armoredOnly: true }],
};
/** At Tech Rating E and F, BAR 10 armor takes the slots of Inner Sphere and Clan ferro-fibrous armor (2 and 1) (errata v8.0 to p. 134). */
export const SV_BAR10_SLOTS: Partial<Record<TechRating, number>> = { E: 2, F: 1 };
/** Ultra-light chassis: no better than BAR 5 (p. 123). */
export const ULTRA_LIGHT_BAR = 5;
/** Armor dates, IO:AE printed p. 29, Universal Technology Advancement Table ("Support Vehicle Armor"): the production year by BAR, and the prototype year; 1950 is "PS" and 2200 "ES". */
export const SV_ARMOR_DATES: Record<number, { prototype?: number; production: number }> = {
  2: { production: 1950 }, 3: { production: 1950 }, 4: { production: 1950 }, 5: { production: 2200 }, 6: { production: 2200 },
  7: { prototype: 2250, production: 2300 }, 8: { prototype: 2425, production: 2435 }, 9: { prototype: 2440, production: 2450 }, 10: { prototype: 2460, production: 2470 },
};

export const SV_COST = {
  cite: SV_PAGES.cost,
  chassisPerTon: 2_500,
  enginePerTon: 5_000,
  armorPerPoint: { 2: 50, 3: 100, 4: 150, 5: 200, 6: 250, 7: 300, 8: 400, 9: 500, 10: 625 } as Record<number, number>,
  structuralMultiplier: { A: 0.5, B: 0.75, C: 1.0, D: 1.25, E: 1.5, F: 2.0 } as Record<TechRating, number>,
  heatSinkEach: 2_000,
  turretPerTon: 5_000,
  pintlePerTon: 1_000,
  amplifierPerTon: 20_000,
  omniFactor: 1.25,
  /** Basic and advanced fire control cost 5 and 10 percent of the heavy and medium weapons' cost (p. 293). */
  fireControl: { basic: 0.05, advanced: 0.1 },
};

/** Fire control weighs 5 and 10 percent of the heavy and medium weapons' weight, ammunition left out, up to the kilogram or half ton (TM p. 217). */
export const SV_FIRE_CONTROL = {
  weight: { basic: 0.05, advanced: 0.1 },
  /** Gunners (p. 131): a Small unit, per weapon with none, per facing otherwise; a Medium or Large one, the weapon tons over this (round up). */
  gunnerDivisor: { none: 2, basic: 3, advanced: 4 },
  /** With advanced fire control a Tech E chassis divides by 5 and a Tech F chassis by 6. */
  advancedByChassis: { E: 5, F: 6 } as Partial<Record<TechRating, number>>,
  toHit: { none: 2, basic: 1, advanced: 0 },
  cite: SV_PAGES.crew,
};

/** The Support Vehicle Minimum Crew Table (p. 131, errata v8.0): the base crew, and the extras. */
export const SV_CREW = {
  base: { small: 1, medium: 2, mediumAirNaval: 4, large: 3, trailer: 0 },
  perTonCommunications: 1,
  perFieldKitchen: 3,
  perMash: 5,
  /** From 4 non-officer crew, one officer for every 6 (up). */
  officerFrom: 4,
  officerEvery: 6,
  cite: SV_PAGES.crew,
};

/** BV v4.1: the Offensive BV Adjustment Table (fire control) and the armor rule (BAR over 10 in place of the armor factor's 2.5). */
export const SV_BV = {
  cite: SV_PAGES.bv,
  armorFactor: 1,
  structureFactor: 1.5,
  siFactor: 2.0,
  tonsDivisor: 2,
  fireControl: { none: 0.8, basic: 0.9, advanced: 1.0 },
  rearFactor: 0.5,
  artemis: 1.2,
  targetingComputer: 1.25,
};
