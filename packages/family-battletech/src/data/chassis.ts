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
// Internal structure points by tonnage (printed p.47). Quads use the legs column for all four legs. The weight of the
// structure is a rule the book states in words, not a table of ours: see STRUCTURE_WEIGHT below. The tonnages in this
// table are the legal BattleMech tonnages.
// ---------------------------------------------------------------------------------------------------------------
export interface StructureRow {
  ct: number; // center torso points
  side: number; // each side torso
  arm: number; // each arm (biped only)
  leg: number; // each leg
}
export const HEAD_STRUCTURE: Sourced & { points: number } = {
  cite: { book: "TechManual", page: 47 },
  checked: "page",
  points: 3,
};
export const HEAD_MAX_ARMOR: Sourced & { points: number } = {
  cite: { book: "TechManual", page: 54 },
  checked: "page",
  points: 9,
};
export const INTERNAL_STRUCTURE: Sourced & { rows: Record<number, StructureRow> } = {
  cite: { book: "TechManual", page: 47 },
  checked: "page",
  rows: {
    20: { ct: 6, side: 5, arm: 3, leg: 4 },
    25: { ct: 8, side: 6, arm: 4, leg: 6 },
    30: { ct: 10, side: 7, arm: 5, leg: 7 },
    35: { ct: 11, side: 8, arm: 6, leg: 8 },
    40: { ct: 12, side: 10, arm: 6, leg: 10 },
    45: { ct: 14, side: 11, arm: 7, leg: 11 },
    50: { ct: 16, side: 12, arm: 8, leg: 12 },
    55: { ct: 18, side: 13, arm: 9, leg: 13 },
    60: { ct: 20, side: 14, arm: 10, leg: 14 },
    65: { ct: 21, side: 15, arm: 10, leg: 15 },
    70: { ct: 22, side: 15, arm: 11, leg: 15 },
    75: { ct: 23, side: 16, arm: 12, leg: 16 },
    80: { ct: 25, side: 17, arm: 13, leg: 17 },
    85: { ct: 27, side: 18, arm: 14, leg: 18 },
    90: { ct: 29, side: 19, arm: 15, leg: 19 },
    95: { ct: 30, side: 20, arm: 16, leg: 20 },
    100: { ct: 31, side: 21, arm: 17, leg: 21 },
  },
};

// Structure weight, a stated rule (printed p.46): standard structure weighs a tenth of the 'Mech's tonnage; endo-steel
// weighs half as much, rounded up to a half ton. Each type's weightFactor multiplies the standard weight.
export const STRUCTURE_WEIGHT: Sourced & { fractionOfTons: number } = {
  cite: { book: "TechManual", page: 46 },
  checked: "text",
  fractionOfTons: 0.1,
};

// Structure types. Slots are the critical slots the type takes, placed anywhere (printed p.47).
export interface StructureType {
  weightFactor: number;
  slots: number;
}
export const STRUCTURE_TYPES: Sourced & { types: Record<string, StructureType> } = {
  cite: { book: "TechManual", page: 47 },
  checked: "page",
  types: {
    standard: { weightFactor: 1, slots: 0 },
    "endo-steel": { weightFactor: 0.5, slots: 14 },
    "endo-steel-clan": { weightFactor: 0.5, slots: 7 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Engine weight in tons by rating (Master Engine Table, printed p.49). Only the fusion columns a BattleMech may use,
// and only the ones the book does not state as a rule: standard, plus the printed XL and Light columns (the book gives
// no factor for those in words). Compact is not here: the book states it as a rule (see ENGINE_TYPES). Clan XL weighs
// what Inner Sphere XL does; they differ in slots only. Ratings run 10 to 400 in steps of 5.
// ---------------------------------------------------------------------------------------------------------------
export type EngineWeightColumn = "standard" | "xl" | "light";
export type EngineWeights = Record<EngineWeightColumn, number>;
export const ENGINE_WEIGHTS: Sourced & { rows: Record<number, EngineWeights> } = {
  cite: { book: "TechManual", page: 49 },
  checked: "page",
  rows: {
    10: { standard: 0.5, xl: 0.5, light: 0.5 },
    15: { standard: 0.5, xl: 0.5, light: 0.5 },
    20: { standard: 0.5, xl: 0.5, light: 0.5 },
    25: { standard: 0.5, xl: 0.5, light: 0.5 },
    30: { standard: 1.0, xl: 0.5, light: 1.0 },
    35: { standard: 1.0, xl: 0.5, light: 1.0 },
    40: { standard: 1.0, xl: 0.5, light: 1.0 },
    45: { standard: 1.0, xl: 0.5, light: 1.0 },
    50: { standard: 1.5, xl: 1.0, light: 1.5 },
    55: { standard: 1.5, xl: 1.0, light: 1.5 },
    60: { standard: 1.5, xl: 1.0, light: 1.5 },
    65: { standard: 2.0, xl: 1.0, light: 1.5 },
    70: { standard: 2.0, xl: 1.0, light: 1.5 },
    75: { standard: 2.0, xl: 1.0, light: 1.5 },
    80: { standard: 2.5, xl: 1.5, light: 2.0 },
    85: { standard: 2.5, xl: 1.5, light: 2.0 },
    90: { standard: 3.0, xl: 1.5, light: 2.5 },
    95: { standard: 3.0, xl: 1.5, light: 2.5 },
    100: { standard: 3.0, xl: 1.5, light: 2.5 },
    105: { standard: 3.5, xl: 2.0, light: 3.0 },
    110: { standard: 3.5, xl: 2.0, light: 3.0 },
    115: { standard: 4.0, xl: 2.0, light: 3.0 },
    120: { standard: 4.0, xl: 2.0, light: 3.0 },
    125: { standard: 4.0, xl: 2.0, light: 3.0 },
    130: { standard: 4.5, xl: 2.5, light: 3.5 },
    135: { standard: 4.5, xl: 2.5, light: 3.5 },
    140: { standard: 5.0, xl: 2.5, light: 4.0 },
    145: { standard: 5.0, xl: 2.5, light: 4.0 },
    150: { standard: 5.5, xl: 3.0, light: 4.5 },
    155: { standard: 5.5, xl: 3.0, light: 4.5 },
    160: { standard: 6.0, xl: 3.0, light: 4.5 },
    165: { standard: 6.0, xl: 3.0, light: 4.5 },
    170: { standard: 6.0, xl: 3.0, light: 4.5 },
    175: { standard: 7.0, xl: 3.5, light: 5.5 },
    180: { standard: 7.0, xl: 3.5, light: 5.5 },
    185: { standard: 7.5, xl: 4.0, light: 6.0 },
    190: { standard: 7.5, xl: 4.0, light: 6.0 },
    195: { standard: 8.0, xl: 4.0, light: 6.0 },
    200: { standard: 8.5, xl: 4.5, light: 6.5 },
    205: { standard: 8.5, xl: 4.5, light: 6.5 },
    210: { standard: 9.0, xl: 4.5, light: 7.0 },
    215: { standard: 9.5, xl: 5.0, light: 7.5 },
    220: { standard: 10.0, xl: 5.0, light: 7.5 },
    225: { standard: 10.0, xl: 5.0, light: 7.5 },
    230: { standard: 10.5, xl: 5.5, light: 8.0 },
    235: { standard: 11.0, xl: 5.5, light: 8.5 },
    240: { standard: 11.5, xl: 6.0, light: 9.0 },
    245: { standard: 12.0, xl: 6.0, light: 9.0 },
    250: { standard: 12.5, xl: 6.5, light: 9.5 },
    255: { standard: 13.0, xl: 6.5, light: 10.0 },
    260: { standard: 13.5, xl: 7.0, light: 10.5 },
    265: { standard: 14.0, xl: 7.0, light: 10.5 },
    270: { standard: 14.5, xl: 7.5, light: 11.0 },
    275: { standard: 15.5, xl: 8.0, light: 12.0 },
    280: { standard: 16.0, xl: 8.0, light: 12.0 },
    285: { standard: 16.5, xl: 8.5, light: 12.5 },
    290: { standard: 17.5, xl: 9.0, light: 13.5 },
    295: { standard: 18.0, xl: 9.0, light: 13.5 },
    300: { standard: 19.0, xl: 9.5, light: 14.5 },
    305: { standard: 19.5, xl: 10.0, light: 15.0 },
    310: { standard: 20.5, xl: 10.5, light: 15.5 },
    315: { standard: 21.5, xl: 11.0, light: 16.5 },
    320: { standard: 22.5, xl: 11.5, light: 17.0 },
    325: { standard: 23.5, xl: 12.0, light: 18.0 },
    330: { standard: 24.5, xl: 12.5, light: 18.5 },
    335: { standard: 25.5, xl: 13.0, light: 19.5 },
    340: { standard: 27.0, xl: 13.5, light: 20.5 },
    345: { standard: 28.5, xl: 14.5, light: 21.5 },
    350: { standard: 29.5, xl: 15.0, light: 22.5 },
    355: { standard: 31.5, xl: 16.0, light: 24.0 },
    360: { standard: 33.0, xl: 16.5, light: 25.0 },
    365: { standard: 34.5, xl: 17.5, light: 26.0 },
    370: { standard: 36.5, xl: 18.5, light: 27.5 },
    375: { standard: 38.5, xl: 19.5, light: 29.0 },
    380: { standard: 41.0, xl: 20.5, light: 31.0 },
    385: { standard: 43.5, xl: 22.0, light: 33.0 },
    390: { standard: 46.0, xl: 23.0, light: 34.5 },
    395: { standard: 49.0, xl: 24.5, light: 37.0 },
    400: { standard: 52.5, xl: 26.5, light: 39.5 },
  },
};

// Engine types and the slots each takes (Engine Critical Space Table, printed p.50). ct is the center torso total
// (the standard sheet has 6); side is the count in each side torso. An engine weighs its column's printed weight times
// weightFactor, rounded up to a half ton. The factor is 1 except where the book states one in words: a Compact fusion
// engine weighs 50 percent more than a standard one of the same rating (printed p.48, factorCite). The half-ton
// rounding is not stated there; it is the book's rounding everywhere else and reproduces every printed compact weight.
export interface EngineType {
  weightColumn: EngineWeightColumn;
  weightFactor: number;
  factorCite?: Cite;
  ct: number;
  side: number;
}
export const ENGINE_TYPES: Sourced & { types: Record<string, EngineType> } = {
  cite: { book: "TechManual", page: 50 },
  checked: "page",
  types: {
    standard: { weightColumn: "standard", weightFactor: 1, ct: 6, side: 0 },
    xl: { weightColumn: "xl", weightFactor: 1, ct: 6, side: 3 },
    "xl-clan": { weightColumn: "xl", weightFactor: 1, ct: 6, side: 2 },
    light: { weightColumn: "light", weightFactor: 1, ct: 6, side: 2 },
    compact: { weightColumn: "standard", weightFactor: 1.5, factorCite: { book: "TechManual", page: 48 }, ct: 3, side: 0 },
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
// Heat sinks. The slots each type takes are the Heat Sinks Table (printed p.54). The weight and "held by the engine"
// numbers are stated rules from the prose on p.53, read from the text extract only: the engine gives `freeWithEngine`
// sinks that cost no tonnage; every sink beyond them costs `tonsEach`, whatever its type. An engine also holds one
// sink per `ratingPerHeldSink` of rating (rounded down) without critical slots.
// ---------------------------------------------------------------------------------------------------------------
export interface HeatSinkType {
  slots: number;
}
export const HEAT_SINK_RULES: Sourced & {
  freeWithEngine: number;
  tonsEach: number;
  ratingPerHeldSink: number; // read by the checks (Task 3), not by layout or weights
} = {
  cite: { book: "TechManual", page: 53 },
  checked: "text",
  freeWithEngine: 10,
  tonsEach: 1,
  ratingPerHeldSink: 25,
};
export const HEAT_SINKS: Sourced & { types: Record<string, HeatSinkType> } = {
  cite: { book: "TechManual", page: 54 },
  checked: "page",
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
// Read by the checks (Task 3), not by layout or weights.
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
  // Labels and their order rest on the record sheet (p.24); the slot counts on the Critical Space Table (p.45).
  cites: { labels: { book: "TechManual", page: 24 }, counts: { book: "TechManual", page: 45 } } satisfies Record<string, Cite>,
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
