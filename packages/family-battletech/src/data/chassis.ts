// Chassis tables for a standard BattleMech, read from TechManual (corrected sixth printing). Plain data: nothing here
// runs. Every table names the printed page it came from and whether that was settled against the page image
// ("page") or only the text extract ("text"). The tables are our own; the book's wording is not copied.
//
// Keys are lower-case and hyphenated. Where the Inner Sphere and Clan versions of a part differ in slots or weight
// they have separate keys, with a "-clan" suffix on the Clan one (xl and xl-clan, endo-steel and endo-steel-clan,
// double and double-clan, ferro-fibrous and ferro-fibrous-clan). A key that is not in a table is unknown to us;
// the functions in rules/mech.ts must cope with that.

export interface Cite {
  book: "TechManual";
  page: number;
}
export type Checked = "page" | "text";
interface Sourced {
  cite: Cite;
  checked: Checked;
}

// ---------------------------------------------------------------------------------------------------------------
// Internal structure (printed p.47). Weights and circles by tonnage. Quads use the legs column for all four legs.
// The head always has 3 points. Endo-steel weighs what the endo column says, for either tech base.
// ---------------------------------------------------------------------------------------------------------------
export interface StructureRow {
  standard: number; // tons of standard structure
  endo: number; // tons of endo-steel structure
  ct: number; // center torso points
  side: number; // each side torso
  arm: number; // each arm (biped only)
  leg: number; // each leg
}
export const HEAD_STRUCTURE = 3;
export const HEAD_MAX_ARMOR = 9;
export const INTERNAL_STRUCTURE: Sourced & { rows: Record<number, StructureRow> } = {
  cite: { book: "TechManual", page: 47 },
  checked: "page",
  rows: {
    20: { standard: 2.0, endo: 1.0, ct: 6, side: 5, arm: 3, leg: 4 },
    25: { standard: 2.5, endo: 1.5, ct: 8, side: 6, arm: 4, leg: 6 },
    30: { standard: 3.0, endo: 1.5, ct: 10, side: 7, arm: 5, leg: 7 },
    35: { standard: 3.5, endo: 2.0, ct: 11, side: 8, arm: 6, leg: 8 },
    40: { standard: 4.0, endo: 2.0, ct: 12, side: 10, arm: 6, leg: 10 },
    45: { standard: 4.5, endo: 2.5, ct: 14, side: 11, arm: 7, leg: 11 },
    50: { standard: 5.0, endo: 2.5, ct: 16, side: 12, arm: 8, leg: 12 },
    55: { standard: 5.5, endo: 3.0, ct: 18, side: 13, arm: 9, leg: 13 },
    60: { standard: 6.0, endo: 3.0, ct: 20, side: 14, arm: 10, leg: 14 },
    65: { standard: 6.5, endo: 3.5, ct: 21, side: 15, arm: 10, leg: 15 },
    70: { standard: 7.0, endo: 3.5, ct: 22, side: 15, arm: 11, leg: 15 },
    75: { standard: 7.5, endo: 4.0, ct: 23, side: 16, arm: 12, leg: 16 },
    80: { standard: 8.0, endo: 4.0, ct: 25, side: 17, arm: 13, leg: 17 },
    85: { standard: 8.5, endo: 4.5, ct: 27, side: 18, arm: 14, leg: 18 },
    90: { standard: 9.0, endo: 4.5, ct: 29, side: 19, arm: 15, leg: 19 },
    95: { standard: 9.5, endo: 5.0, ct: 30, side: 20, arm: 16, leg: 20 },
    100: { standard: 10.0, endo: 5.0, ct: 31, side: 21, arm: 17, leg: 21 },
  },
};

// Structure types. Slots are the critical slots the type takes, placed anywhere (printed p.47).
export interface StructureType {
  weightColumn: "standard" | "endo";
  slots: number;
}
export const STRUCTURE_TYPES: Sourced & { types: Record<string, StructureType> } = {
  cite: { book: "TechManual", page: 47 },
  checked: "page",
  types: {
    standard: { weightColumn: "standard", slots: 0 },
    "endo-steel": { weightColumn: "endo", slots: 14 },
    "endo-steel-clan": { weightColumn: "endo", slots: 7 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Engine weight in tons by rating (Master Engine Table, printed p.49). Only the fusion columns: a BattleMech may use
// only fusion engines. Clan XL weighs what Inner Sphere XL does; they differ in slots only. Ratings run 10 to 400 in
// steps of 5.
// ---------------------------------------------------------------------------------------------------------------
export type EngineWeightColumn = "standard" | "xl" | "light" | "compact";
export type EngineWeights = Record<EngineWeightColumn, number>;
export const ENGINE_WEIGHTS: Sourced & { rows: Record<number, EngineWeights> } = {
  cite: { book: "TechManual", page: 49 },
  checked: "page",
  rows: {
    10: { standard: 0.5, xl: 0.5, light: 0.5, compact: 1.0 },
    15: { standard: 0.5, xl: 0.5, light: 0.5, compact: 1.0 },
    20: { standard: 0.5, xl: 0.5, light: 0.5, compact: 1.0 },
    25: { standard: 0.5, xl: 0.5, light: 0.5, compact: 1.0 },
    30: { standard: 1.0, xl: 0.5, light: 1.0, compact: 1.5 },
    35: { standard: 1.0, xl: 0.5, light: 1.0, compact: 1.5 },
    40: { standard: 1.0, xl: 0.5, light: 1.0, compact: 1.5 },
    45: { standard: 1.0, xl: 0.5, light: 1.0, compact: 1.5 },
    50: { standard: 1.5, xl: 1.0, light: 1.5, compact: 2.5 },
    55: { standard: 1.5, xl: 1.0, light: 1.5, compact: 2.5 },
    60: { standard: 1.5, xl: 1.0, light: 1.5, compact: 2.5 },
    65: { standard: 2.0, xl: 1.0, light: 1.5, compact: 3.0 },
    70: { standard: 2.0, xl: 1.0, light: 1.5, compact: 3.0 },
    75: { standard: 2.0, xl: 1.0, light: 1.5, compact: 3.0 },
    80: { standard: 2.5, xl: 1.5, light: 2.0, compact: 4.0 },
    85: { standard: 2.5, xl: 1.5, light: 2.0, compact: 4.0 },
    90: { standard: 3.0, xl: 1.5, light: 2.5, compact: 4.5 },
    95: { standard: 3.0, xl: 1.5, light: 2.5, compact: 4.5 },
    100: { standard: 3.0, xl: 1.5, light: 2.5, compact: 4.5 },
    105: { standard: 3.5, xl: 2.0, light: 3.0, compact: 5.5 },
    110: { standard: 3.5, xl: 2.0, light: 3.0, compact: 5.5 },
    115: { standard: 4.0, xl: 2.0, light: 3.0, compact: 6.0 },
    120: { standard: 4.0, xl: 2.0, light: 3.0, compact: 6.0 },
    125: { standard: 4.0, xl: 2.0, light: 3.0, compact: 6.0 },
    130: { standard: 4.5, xl: 2.5, light: 3.5, compact: 7.0 },
    135: { standard: 4.5, xl: 2.5, light: 3.5, compact: 7.0 },
    140: { standard: 5.0, xl: 2.5, light: 4.0, compact: 7.5 },
    145: { standard: 5.0, xl: 2.5, light: 4.0, compact: 7.5 },
    150: { standard: 5.5, xl: 3.0, light: 4.5, compact: 8.5 },
    155: { standard: 5.5, xl: 3.0, light: 4.5, compact: 8.5 },
    160: { standard: 6.0, xl: 3.0, light: 4.5, compact: 9.0 },
    165: { standard: 6.0, xl: 3.0, light: 4.5, compact: 9.0 },
    170: { standard: 6.0, xl: 3.0, light: 4.5, compact: 9.0 },
    175: { standard: 7.0, xl: 3.5, light: 5.5, compact: 10.5 },
    180: { standard: 7.0, xl: 3.5, light: 5.5, compact: 10.5 },
    185: { standard: 7.5, xl: 4.0, light: 6.0, compact: 11.5 },
    190: { standard: 7.5, xl: 4.0, light: 6.0, compact: 11.5 },
    195: { standard: 8.0, xl: 4.0, light: 6.0, compact: 12.0 },
    200: { standard: 8.5, xl: 4.5, light: 6.5, compact: 13.0 },
    205: { standard: 8.5, xl: 4.5, light: 6.5, compact: 13.0 },
    210: { standard: 9.0, xl: 4.5, light: 7.0, compact: 13.5 },
    215: { standard: 9.5, xl: 5.0, light: 7.5, compact: 14.5 },
    220: { standard: 10.0, xl: 5.0, light: 7.5, compact: 15.0 },
    225: { standard: 10.0, xl: 5.0, light: 7.5, compact: 15.0 },
    230: { standard: 10.5, xl: 5.5, light: 8.0, compact: 16.0 },
    235: { standard: 11.0, xl: 5.5, light: 8.5, compact: 16.5 },
    240: { standard: 11.5, xl: 6.0, light: 9.0, compact: 17.5 },
    245: { standard: 12.0, xl: 6.0, light: 9.0, compact: 18.0 },
    250: { standard: 12.5, xl: 6.5, light: 9.5, compact: 19.0 },
    255: { standard: 13.0, xl: 6.5, light: 10.0, compact: 19.5 },
    260: { standard: 13.5, xl: 7.0, light: 10.5, compact: 20.5 },
    265: { standard: 14.0, xl: 7.0, light: 10.5, compact: 21.0 },
    270: { standard: 14.5, xl: 7.5, light: 11.0, compact: 22.0 },
    275: { standard: 15.5, xl: 8.0, light: 12.0, compact: 23.5 },
    280: { standard: 16.0, xl: 8.0, light: 12.0, compact: 24.0 },
    285: { standard: 16.5, xl: 8.5, light: 12.5, compact: 25.0 },
    290: { standard: 17.5, xl: 9.0, light: 13.5, compact: 26.5 },
    295: { standard: 18.0, xl: 9.0, light: 13.5, compact: 27.0 },
    300: { standard: 19.0, xl: 9.5, light: 14.5, compact: 28.5 },
    305: { standard: 19.5, xl: 10.0, light: 15.0, compact: 29.5 },
    310: { standard: 20.5, xl: 10.5, light: 15.5, compact: 31.0 },
    315: { standard: 21.5, xl: 11.0, light: 16.5, compact: 32.5 },
    320: { standard: 22.5, xl: 11.5, light: 17.0, compact: 34.0 },
    325: { standard: 23.5, xl: 12.0, light: 18.0, compact: 35.5 },
    330: { standard: 24.5, xl: 12.5, light: 18.5, compact: 37.0 },
    335: { standard: 25.5, xl: 13.0, light: 19.5, compact: 38.5 },
    340: { standard: 27.0, xl: 13.5, light: 20.5, compact: 40.5 },
    345: { standard: 28.5, xl: 14.5, light: 21.5, compact: 43.0 },
    350: { standard: 29.5, xl: 15.0, light: 22.5, compact: 44.5 },
    355: { standard: 31.5, xl: 16.0, light: 24.0, compact: 47.5 },
    360: { standard: 33.0, xl: 16.5, light: 25.0, compact: 49.5 },
    365: { standard: 34.5, xl: 17.5, light: 26.0, compact: 52.0 },
    370: { standard: 36.5, xl: 18.5, light: 27.5, compact: 55.0 },
    375: { standard: 38.5, xl: 19.5, light: 29.0, compact: 58.0 },
    380: { standard: 41.0, xl: 20.5, light: 31.0, compact: 61.5 },
    385: { standard: 43.5, xl: 22.0, light: 33.0, compact: 65.5 },
    390: { standard: 46.0, xl: 23.0, light: 34.5, compact: 69.0 },
    395: { standard: 49.0, xl: 24.5, light: 37.0, compact: 73.5 },
    400: { standard: 52.5, xl: 26.5, light: 39.5, compact: 79.0 },
  },
};

// Engine types and the slots each takes (Engine Critical Space Table, printed p.50). ct is the center torso total
// (the standard sheet has 6); side is the count in each side torso.
export interface EngineType {
  weightColumn: EngineWeightColumn;
  ct: number;
  side: number;
}
export const ENGINE_TYPES: Sourced & { types: Record<string, EngineType> } = {
  cite: { book: "TechManual", page: 50 },
  checked: "page",
  types: {
    standard: { weightColumn: "standard", ct: 6, side: 0 },
    xl: { weightColumn: "xl", ct: 6, side: 3 },
    "xl-clan": { weightColumn: "xl", ct: 6, side: 2 },
    light: { weightColumn: "light", ct: 6, side: 2 },
    compact: { weightColumn: "compact", ct: 3, side: 0 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Gyro (printed p.50). Weight is the engine rating over 100, rounded up to a whole ton, times the multiplier, rounded
// up to a half ton. All gyro slots are in the center torso. Clan BattleMechs have only the standard gyro.
// ---------------------------------------------------------------------------------------------------------------
export interface GyroType {
  multiplier: number;
  slots: number;
}
export const GYROS: Sourced & { types: Record<string, GyroType> } = {
  cite: { book: "TechManual", page: 50 },
  checked: "page",
  types: {
    standard: { multiplier: 1.0, slots: 4 },
    compact: { multiplier: 1.5, slots: 2 },
    "heavy-duty": { multiplier: 2.0, slots: 4 },
    xl: { multiplier: 0.5, slots: 6 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Cockpit (BattleMech Cockpit Table, printed p.52). Default head slots are the book's own numbering, counted from 1.
// ---------------------------------------------------------------------------------------------------------------
export interface CockpitType {
  tons: number;
  cockpit: number[];
  sensors: number[];
  lifeSupport: number[];
}
export const COCKPITS: Sourced & { types: Record<string, CockpitType> } = {
  cite: { book: "TechManual", page: 52 },
  checked: "page",
  types: {
    standard: { tons: 3, cockpit: [3], sensors: [2, 5], lifeSupport: [1, 6] },
    small: { tons: 2, cockpit: [3], sensors: [2, 4], lifeSupport: [1] },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Heat sinks (Heat Sinks Table, printed p.54; free sinks and critical-free sinks, printed p.53). The engine gives
// `freeWithEngine` sinks that cost no tonnage; every sink beyond them costs `tonsEach`, whatever its type. An engine
// also holds one sink per `ratingPerHeldSink` of rating (rounded down) without critical slots.
// ---------------------------------------------------------------------------------------------------------------
export interface HeatSinkType {
  slots: number;
}
export const HEAT_SINKS: Sourced & {
  freeWithEngine: number;
  tonsEach: number;
  ratingPerHeldSink: number;
  types: Record<string, HeatSinkType>;
} = {
  cite: { book: "TechManual", page: 54 },
  checked: "page",
  freeWithEngine: 10,
  tonsEach: 1,
  ratingPerHeldSink: 25,
  types: {
    single: { slots: 1 },
    double: { slots: 3 },
    "double-clan": { slots: 2 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Armor (BattleMech Armor Table, printed p.56). Points per ton is the base times the multiplier, the points a given
// number of tons carries rounded down; tons for a given number of points rounded up to a half ton. Slots are
// critical slots, placed anywhere. Stealth armor also wants 2 slots in each arm, leg and side torso and a Guardian
// ECM Suite; that placement is not modelled here.
// ---------------------------------------------------------------------------------------------------------------
export interface ArmorType {
  multiplier: number;
  slots: number;
}
export const ARMOR: Sourced & { basePointsPerTon: number; types: Record<string, ArmorType> } = {
  cite: { book: "TechManual", page: 56 },
  checked: "page",
  basePointsPerTon: 16,
  types: {
    standard: { multiplier: 1.0, slots: 0 },
    stealth: { multiplier: 1.0, slots: 12 },
    "light-ferro-fibrous": { multiplier: 1.06, slots: 7 },
    "ferro-fibrous": { multiplier: 1.12, slots: 14 },
    "ferro-fibrous-clan": { multiplier: 1.2, slots: 7 },
    "heavy-ferro-fibrous": { multiplier: 1.24, slots: 21 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Myomer enhancements (BattleMech MASC and TSM Table, printed p.52). MASC weighs a percentage of the 'Mech's tonnage
// and takes the same number of slots (rounded normally); Triple-Strength Myomer weighs nothing and takes 6 slots,
// Inner Sphere only. "standard" is plain myomer. The two enhancements may not be combined.
// ---------------------------------------------------------------------------------------------------------------
export interface MyomerType {
  percentOfTons: number;
  slots: number | "percent";
}
export const MYOMER: Sourced & { types: Record<string, MyomerType> } = {
  cite: { book: "TechManual", page: 52 },
  checked: "page",
  types: {
    standard: { percentOfTons: 0, slots: 0 },
    masc: { percentOfTons: 5, slots: "percent" },
    "masc-clan": { percentOfTons: 4, slots: "percent" },
    tsm: { percentOfTons: 0, slots: 6 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Fixed slot layout (Standard 'Mech Critical Space Table, printed p.45; actuator and head labels from the record
// sheet, printed p.24). Slots are counted from 0 here. `size` is the slots in a location; `fixed` lists the labels
// that fill a location from slot 0 upward. The head, the center torso and the side torsos also take cells from the
// cockpit, gyro and engine tables above (see rules/mech.ts). On the sheet the center torso carries `engineAbove`
// engine cells, then the gyro, then the rest of the engine.
// ---------------------------------------------------------------------------------------------------------------
export const SHEET = {
  cite: { book: "TechManual", page: 45 } satisfies Cite,
  checked: "page" as Checked,
  engineAbove: 3,
  configurations: {
    biped: {
      size: { HD: 6, CT: 12, LT: 12, RT: 12, LA: 12, RA: 12, LL: 6, RL: 6 },
      fixed: {
        LA: ["Shoulder", "Upper Arm Actuator", "Lower Arm Actuator", "Hand Actuator"],
        RA: ["Shoulder", "Upper Arm Actuator", "Lower Arm Actuator", "Hand Actuator"],
        LL: ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"],
        RL: ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"],
      },
    },
    quad: {
      size: { HD: 6, CT: 12, LT: 12, RT: 12, FLL: 6, FRL: 6, RLL: 6, RRL: 6 },
      fixed: {
        FLL: ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"],
        FRL: ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"],
        RLL: ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"],
        RRL: ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"],
      },
    },
  },
} as const;
