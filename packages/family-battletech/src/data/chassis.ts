// Chassis tables for a standard BattleMech, read from TechManual (corrected sixth printing). Plain data: nothing here
// runs. Every table names the printed page it came from and whether that was settled against the page image
// ("page") or only the text extract ("text"). The tables are our own; the book's wording is not copied.
//
// Keys are lower-case and hyphenated. Where the Inner Sphere and Clan versions of a part differ in slots or weight
// they have separate keys, with a "-clan" suffix on the Clan one (xl and xl-clan, endo-steel and endo-steel-clan,
// double and double-clan, ferro-fibrous and ferro-fibrous-clan). A key that is not in a table is unknown to us;
// the functions in rules/mech.ts must cope with that.

import type { LocationCode } from "../rules/mech";

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
  name: string; // as shown to the player
  weightFactor: number;
  slots: number;
}
export const STRUCTURE_TYPES: Sourced & { types: Record<string, StructureType> } = {
  cite: { book: "TechManual", page: 47 },
  checked: "page",
  types: {
    standard: { name: "Standard", weightFactor: 1, slots: 0 },
    "endo-steel": { name: "Endo Steel", weightFactor: 0.5, slots: 14 },
    "endo-steel-clan": { name: "Endo Steel (Clan)", weightFactor: 0.5, slots: 7 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Standard fusion engine weight in tons by rating (Master Engine Table, printed p.49), ratings 10 to 400 in steps of 5.
// The other fusion types the book states as factors on this weight (see ENGINE_TYPES); the table's XL, Light and Compact
// columns agree with those factors for every rating, so they are not repeated here. A BattleMech may use only fusion
// engines, so the non-fusion columns are left out.
// ---------------------------------------------------------------------------------------------------------------
export const ENGINE_WEIGHTS: Sourced & { rows: Record<number, number> } = {
  cite: { book: "TechManual", page: 49 },
  checked: "page",
  rows: {
    10: 0.5,
    15: 0.5,
    20: 0.5,
    25: 0.5,
    30: 1.0,
    35: 1.0,
    40: 1.0,
    45: 1.0,
    50: 1.5,
    55: 1.5,
    60: 1.5,
    65: 2.0,
    70: 2.0,
    75: 2.0,
    80: 2.5,
    85: 2.5,
    90: 3.0,
    95: 3.0,
    100: 3.0,
    105: 3.5,
    110: 3.5,
    115: 4.0,
    120: 4.0,
    125: 4.0,
    130: 4.5,
    135: 4.5,
    140: 5.0,
    145: 5.0,
    150: 5.5,
    155: 5.5,
    160: 6.0,
    165: 6.0,
    170: 6.0,
    175: 7.0,
    180: 7.0,
    185: 7.5,
    190: 7.5,
    195: 8.0,
    200: 8.5,
    205: 8.5,
    210: 9.0,
    215: 9.5,
    220: 10.0,
    225: 10.0,
    230: 10.5,
    235: 11.0,
    240: 11.5,
    245: 12.0,
    250: 12.5,
    255: 13.0,
    260: 13.5,
    265: 14.0,
    270: 14.5,
    275: 15.5,
    280: 16.0,
    285: 16.5,
    290: 17.5,
    295: 18.0,
    300: 19.0,
    305: 19.5,
    310: 20.5,
    315: 21.5,
    320: 22.5,
    325: 23.5,
    330: 24.5,
    335: 25.5,
    340: 27.0,
    345: 28.5,
    350: 29.5,
    355: 31.5,
    360: 33.0,
    365: 34.5,
    370: 36.5,
    375: 38.5,
    380: 41.0,
    385: 43.5,
    390: 46.0,
    395: 49.0,
    400: 52.5,
  },
};

// Engine types and the slots each takes (Engine Critical Space Table, printed p.50). ct is the center torso total
// (the standard sheet has 6); side is the count in each side torso; label is what the record sheets print in each cell.
// An engine weighs the standard weight for its rating times weightFactor, rounded up to a half ton. The factors are
// stated in words: Compact weighs 50 percent more (printed p.48 and p.214), Light about 25 percent less and XL roughly
// half (both p.214, equipment descriptions; read from the text extract). The half-ton rounding is the book's rounding
// everywhere else, and with it each factor reproduces the printed p.49 column for every rating.
export interface EngineType {
  name: string; // as shown to the player; label is what the record sheets print
  label: string;
  weightFactor: number;
  factorCite?: Cite;
  factorChecked?: Checked;
  ct: number;
  side: number;
}
const P214: Cite = { book: "TechManual", page: 214 };
export const ENGINE_TYPES: Sourced & { types: Record<string, EngineType> } = {
  cite: { book: "TechManual", page: 50 },
  checked: "page",
  types: {
    standard: { name: "Standard Fusion", label: "Fusion Engine", weightFactor: 1, ct: 6, side: 0 },
    xl: { name: "XL Fusion", label: "XL Fusion Engine", weightFactor: 0.5, factorCite: P214, factorChecked: "text", ct: 6, side: 3 },
    "xl-clan": { name: "XL Fusion (Clan)", label: "XL Fusion Engine", weightFactor: 0.5, factorCite: P214, factorChecked: "text", ct: 6, side: 2 },
    light: { name: "Light Fusion", label: "Light Fusion Engine", weightFactor: 0.75, factorCite: P214, factorChecked: "text", ct: 6, side: 2 },
    compact: {
      name: "Compact Fusion",
      label: "Compact Fusion Engine",
      weightFactor: 1.5,
      factorCite: { book: "TechManual", page: 48 },
      factorChecked: "text",
      ct: 3,
      side: 0,
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Gyro (printed p.50). Weight is the engine rating over 100, rounded up to a whole ton, times the multiplier, rounded
// up to a half ton. All gyro slots are in the center torso. Clan BattleMechs have only the standard gyro.
// ---------------------------------------------------------------------------------------------------------------
export interface GyroType {
  name: string; // as shown to the player; label is what the record sheets print
  label: string; // as the record sheets print it
  multiplier: number;
  slots: number;
}
export const GYROS: Sourced & { types: Record<string, GyroType> } = {
  cite: { book: "TechManual", page: 50 },
  checked: "page",
  types: {
    standard: { name: "Standard", label: "Gyro", multiplier: 1.0, slots: 4 },
    compact: { name: "Compact", label: "Compact Gyro", multiplier: 1.5, slots: 2 },
    "heavy-duty": { name: "Heavy-Duty", label: "Heavy Duty Gyro", multiplier: 2.0, slots: 4 },
    xl: { name: "XL", label: "XL Gyro", multiplier: 0.5, slots: 6 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Cockpit (BattleMech Cockpit Table, printed p.52). Default head slots are the book's own numbering, counted from 1.
// ---------------------------------------------------------------------------------------------------------------
export interface CockpitType {
  name: string;
  tons: number;
  cockpit: number[];
  sensors: number[];
  lifeSupport: number[];
}
export const COCKPITS: Sourced & { types: Record<string, CockpitType> } = {
  cite: { book: "TechManual", page: 52 },
  checked: "page",
  types: {
    standard: { name: "Standard", tons: 3, cockpit: [3], sensors: [2, 5], lifeSupport: [1, 6] },
    small: { name: "Small", tons: 2, cockpit: [3], sensors: [2, 4], lifeSupport: [1] },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Heat sinks. The slots each type takes are the Heat Sinks Table (printed p.54). The weight and "held by the engine"
// numbers are stated rules from the prose on p.53, read from the text extract only: the engine gives `freeWithEngine`
// sinks that cost no tonnage; every sink beyond them costs `tonsEach`, whatever its type. An engine also holds one
// sink per `ratingPerHeldSink` of rating (rounded down) without critical slots.
// ---------------------------------------------------------------------------------------------------------------
export interface HeatSinkType {
  name: string;
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
    single: { name: "Single", slots: 1 },
    double: { name: "Double", slots: 3 },
    "double-clan": { name: "Double (Clan)", slots: 2 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Armor (BattleMech Armor Table, printed p.56). Points per ton is the base times the multiplier, the points a given
// number of tons carries rounded down; tons for a given number of points rounded up to a half ton. Slots are
// critical slots, placed anywhere except where `slotsIn` says (stealth armor takes 2 slots in each arm, leg and side torso,
// none in the head or center torso, printed p.56 footnote; for a quad the four legs stand in for arms and legs: our reading). Stealth armor also wants a Guardian
// ECM Suite; that part is not modelled here.
// ---------------------------------------------------------------------------------------------------------------
type Spread = Partial<Record<LocationCode, number>>;
export interface ArmorType {
  name: string;
  multiplier: number;
  slots: number;
  slotsIn?: { biped: Spread; quad: Spread }; // slots per location, where the type has to go in particular places
}
export const ARMOR: Sourced & { basePointsPerTon: number; types: Record<string, ArmorType> } = {
  cite: { book: "TechManual", page: 56 },
  checked: "page",
  basePointsPerTon: 16,
  types: {
    standard: { name: "Standard", multiplier: 1.0, slots: 0 },
    stealth: {
      name: "Stealth",
      multiplier: 1.0,
      slots: 12,
      slotsIn: {
        biped: { LA: 2, RA: 2, LL: 2, RL: 2, LT: 2, RT: 2 },
        quad: { FLL: 2, FRL: 2, RLL: 2, RRL: 2, LT: 2, RT: 2 },
      },
    },
    "light-ferro-fibrous": { name: "Light Ferro-Fibrous", multiplier: 1.06, slots: 7 },
    "ferro-fibrous": { name: "Ferro-Fibrous", multiplier: 1.12, slots: 14 },
    "ferro-fibrous-clan": { name: "Ferro-Fibrous (Clan)", multiplier: 1.2, slots: 7 },
    "heavy-ferro-fibrous": { name: "Heavy Ferro-Fibrous", multiplier: 1.24, slots: 21 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Myomer enhancements (BattleMech MASC and TSM Table, printed p.52). MASC weighs a percentage of the 'Mech's tonnage
// and takes the same number of slots (rounded normally); Triple-Strength Myomer weighs nothing and takes 6 slots,
// Inner Sphere only. "standard" is plain myomer. The two enhancements may not be combined.
// ---------------------------------------------------------------------------------------------------------------
export interface MyomerType {
  name: string;
  catalogId?: string; // the equipment row whose mounts stand for this myomer (a perMech item), read by the checks
  percentOfTons: number;
  slots: number | "percent";
}
// Read by the checks (Task 3), not by layout or weights.
export const MYOMER: Sourced & { types: Record<string, MyomerType> } = {
  cite: { book: "TechManual", page: 52 },
  checked: "page",
  types: {
    standard: { name: "Standard", percentOfTons: 0, slots: 0 },
    masc: { name: "MASC", percentOfTons: 5, slots: "percent" },
    "masc-clan": { name: "MASC (Clan)", percentOfTons: 4, slots: "percent" },
    tsm: { name: "Triple-Strength Myomer", catalogId: "tsm-is", percentOfTons: 0, slots: 6 },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Fixed slot layout (Standard 'Mech Critical Space Table, printed p.45; actuator and head labels from the record
// sheet, printed p.24). Slots are counted from 0 here. `size` is the slots in a location; `fixed` lists the labels
// that fill a location from slot 0 upward. The head, the center torso and the side torsos also take cells from the
// cockpit, gyro and engine tables above (see rules/mech.ts). The cell order for engines and gyros follows the
// published record sheets (Catalyst Game Labs, "Record Sheets: Jihad", 2022): the center torso carries `engineAbove`
// engine cells, then the gyro, then the rest of the engine, whatever the gyro's size; side-torso engine cells are the
// first slots of the side torso. Combinations no sheet shows follow the same pattern.
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
