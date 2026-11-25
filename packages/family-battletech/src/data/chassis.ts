// Chassis tables for a standard BattleMech, read from TechManual (corrected sixth printing). Plain data: nothing here
// runs. Every table names the printed page it came from and whether that was settled against the page image
// ("page") or only the text extract ("text"). The tables are our own; the book's wording is not copied.
//
// Keys are lower-case and hyphenated. Where the Inner Sphere and Clan versions of a part differ in slots or weight
// they have separate keys, with a "-clan" suffix on the Clan one (xl and xl-clan, endo-steel and endo-steel-clan,
// double and double-clan, ferro-fibrous and ferro-fibrous-clan). A key that is not in a table is unknown to us;
// the functions in rules/mech.ts must cope with that.

import type { LocationCode } from "../rules/mech";
import type { UnitId } from "./units";

export interface Cite {
  book: "TechManual" | "Interstellar Operations: Alternate Eras" | "Tactical Operations: Advanced Units and Equipment";
  page: number;
}
export type Checked = "page" | "text";
/** Years, inclusive, as the book prints them; no `to` means still available. A list of spans carries an extinction and a reintroduction. */
export interface Span {
  from: number;
  to?: number;
}
const UTA = (page: number): Cite => ({ book: "Interstellar Operations: Alternate Eras", page });
interface Sourced {
  cite: Cite;
  checked: Checked;
}

/**
 * What a part row says about itself beyond its construction numbers; every field is absent on a row the book treats as plain
 * standard technology. `techBase` is who may build it ("both" when the book prints one row for both); `introduced` is the first
 * year the book prints for each tech base, with `prototype` where the date is the prototype's only (the book's "P"); `rules`
 * is what the part does in play, in our words, shown as a note and never simulated; `industrial` marks a part that is printed
 * for IndustrialMechs and not BattleMechs; `primitive` marks one printed for the Age of War's Primitive 'Mechs.
 * A row whose figures come from another page than its table's keeps that page in `cite` (with `checked`).
 */
export interface PartFacts {
  techBase?: "inner-sphere" | "clan" | "both";
  rulesLevel?: "standard" | "advanced" | "experimental";
  introduced?: { is?: number; clan?: number; prototype?: true };
  /** The years the part can be had (production dates, with an extinction and a reintroduction where the table prints them), for the
   * tech base the row is for. It takes the place of `introduced` in the availability rule; absent means no printed date, so no limit.
   * `availabilityCite` is the page of the Universal Technology Advancement Table (IO:AE printed pp.29-44), read against the page image. */
  availability?: Span[];
  availabilityCite?: Cite;
  rules?: string;
  rulesCite?: Cite;
  industrial?: true;
  primitive?: true;
  cite?: Cite;
  checked?: Checked;
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
    // 10 and 15 tons are the IndustrialMech Ultra-Light Internal Structure Table (printed p.66, read against the page image); a
    // BattleMech starts at 20 tons (p.46), so only an IndustrialMech may use them (see MECH_TYPES).
    10: { ct: 4, side: 3, arm: 1, leg: 2 },
    15: { ct: 5, side: 4, arm: 2, leg: 3 },
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

// Structure types. Slots are the critical slots the type takes, placed anywhere (printed p.47). The weight factors of the
// newer types are stated in words (Tactical Operations: Advanced Units and Equipment printed p.154, read against the page
// image) and agree with the weight column of its cost table (p.223): composite half, endo-composite three-quarters,
// reinforced twice; an IndustrialMech's frame is twice the standard (TechManual printed p.67, "20 percent of the weight").
export interface StructureType extends PartFacts {
  name: string; // as shown to the player
  weightFactor: number;
  slots: number;
}
const TO = "Tactical Operations: Advanced Units and Equipment" as const;
const IO = "Interstellar Operations: Alternate Eras" as const;
const TO_STRUCTURE: Cite = { book: TO, page: 154 };
export const STRUCTURE_TYPES: Sourced & { types: Record<string, StructureType> } = {
  cite: { book: "TechManual", page: 47 },
  checked: "page",
  types: {
    standard: { name: "Standard", weightFactor: 1, slots: 0, availability: [{ from: 2439 }], availabilityCite: UTA(42) },
    "endo-steel": { name: "Endo Steel", weightFactor: 0.5, slots: 14, techBase: "inner-sphere", availability: [{ from: 2487, to: 2850 }, { from: 3035 }], availabilityCite: UTA(42) },
    "endo-steel-clan": { name: "Endo Steel (Clan)", weightFactor: 0.5, slots: 7, techBase: "clan", availability: [{ from: 2827 }], availabilityCite: UTA(42) },
    composite: {
      name: "Composite",
      weightFactor: 0.5,
      slots: 0,
      techBase: "inner-sphere",
      rulesLevel: "experimental",
      introduced: { is: 3061, prototype: true },
      cite: TO_STRUCTURE,
      checked: "page",
      rules: "All damage to this structure is doubled; excess damage that goes on to armored locations follows the armor's rules.",
      rulesCite: TO_STRUCTURE,
    },
    "endo-composite": {
      name: "Endo-Composite",
      weightFactor: 0.75,
      slots: 7,
      techBase: "inner-sphere",
      rulesLevel: "experimental",
      introduced: { is: 3067, prototype: true },
      cite: TO_STRUCTURE,
      checked: "page",
      rules: "Plays as endo steel: a critical hit on one of its slots is rolled again.",
      rulesCite: TO_STRUCTURE,
    },
    "endo-composite-clan": {
      name: "Endo-Composite (Clan)",
      weightFactor: 0.75,
      slots: 4,
      techBase: "clan",
      rulesLevel: "experimental",
      introduced: { clan: 3073, prototype: true },
      cite: TO_STRUCTURE,
      checked: "page",
      rules: "Plays as endo steel: a critical hit on one of its slots is rolled again.",
      rulesCite: TO_STRUCTURE,
    },
    reinforced: {
      name: "Reinforced",
      weightFactor: 2,
      slots: 0,
      techBase: "both",
      rulesLevel: "experimental",
      introduced: { is: 3057, clan: 3065, prototype: true },
      cite: TO_STRUCTURE,
      checked: "page",
      rules: "Each structure point takes two points of damage before it is lost; critical hit rolls against the 'Mech take -1. It does not let more armor be mounted.",
      rulesCite: { book: TO, page: 155 },
    },
    // Age of War: the first endo steel took 2 more slots than the production kind (Interstellar Operations: Alternate Eras printed p.66).
    "prototype-endo-steel": {
      name: "Endo Steel (Prototype)",
      weightFactor: 0.5,
      slots: 16,
      techBase: "inner-sphere",
      introduced: { is: 2471 },
      cite: { book: IO, page: 66 },
      checked: "page",
      rules: "Plays as Inner Sphere endo steel; a critical hit on one of its slots is rolled again.",
    },
    // An IndustrialMech's frame weighs 20 percent of its tonnage and takes no slots (TechManual printed p.67; introduced 2350, p.224).
    industrial: {
      name: "Industrial",
      weightFactor: 2,
      slots: 0,
      techBase: "both",
      industrial: true,
      introduced: { is: 2350 },
      cite: { book: "TechManual", page: 67 },
      checked: "page",
      rules: "Weighs 20 percent of the 'Mech, twice a standard BattleMech's structure, and takes no critical slots; only an IndustrialMech uses it.",
    },
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
/**
 * The non-fusion engines' weights, which the Master Engine Table (printed p.49, read against the page image) prints by rating
 * and which are not a share of the standard column. One value per rating from 10 to 400 in steps of 5.
 */
const NON_FUSION_RATINGS = Array.from({ length: 79 }, (_, i) => 10 + i * 5);
const byRating = (values: number[]): Record<number, number> => Object.fromEntries(NON_FUSION_RATINGS.map((r, i) => [r, values[i] ?? 0]));
const ICE_WEIGHTS = byRating([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 12, 14, 14, 15, 15, 16, 17, 17, 18, 19, 20, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 35, 36, 38, 39, 41, 43, 45, 47, 49, 51, 54, 57, 59, 63, 66, 69, 73, 77, 82, 87, 92, 98, 105]);
const FUEL_CELL_WEIGHTS = byRating([1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2.5, 2.5, 2.5, 3, 3, 4, 4, 4, 4.5, 4.5, 5, 5, 5, 5.5, 5.5, 6, 6, 7, 7, 7.5, 7.5, 7.5, 8.5, 8.5, 9, 9, 10, 10.5, 10.5, 11, 11.5, 12, 12, 13, 13.5, 14, 14.5, 15, 16, 16.5, 17, 17.5, 19, 19.5, 20, 21, 22, 23, 23.5, 25, 26, 27, 28.5, 29.5, 31, 32.5, 34.5, 35.5, 38, 40, 41.5, 44, 46.5, 49.5, 52.5, 55.5, 59, 63]);
const FISSION_WEIGHTS = byRating([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5.5, 5.5, 5.5, 6.5, 6.5, 7, 7, 7, 8, 8, 9, 9, 10, 10, 10.5, 10.5, 10.5, 12.5, 12.5, 13.5, 13.5, 14, 15, 15, 16, 17, 17.5, 17.5, 18.5, 19.5, 20.5, 21, 22, 23, 24, 24.5, 25.5, 27.5, 28, 29, 31, 31.5, 33.5, 34.5, 36, 38, 39.5, 41.5, 43, 45, 47.5, 50, 52, 55.5, 58, 60.5, 64, 67.5, 72, 76.5, 80.5, 86, 92]);

export interface EngineType extends PartFacts {
  name: string; // as shown to the player; label is what the record sheets print
  label: string;
  weightFactor: number;
  /** Weight by rating where the book prints it that way (the non-fusion engines): used in place of the standard column times `weightFactor`. */
  weightTable?: Record<number, number>;
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
    xl: { name: "XL Fusion", label: "XL Fusion Engine", weightFactor: 0.5, factorCite: P214, factorChecked: "text", ct: 6, side: 3, techBase: "inner-sphere", availability: [{ from: 2579, to: 2865 }, { from: 3035 }], availabilityCite: UTA(38) },
    "xl-clan": { name: "XL Fusion (Clan)", label: "XL Fusion Engine", weightFactor: 0.5, factorCite: P214, factorChecked: "text", ct: 6, side: 2, techBase: "clan", availability: [{ from: 2827 }], availabilityCite: UTA(38) },
    light: { name: "Light Fusion", label: "Light Fusion Engine", weightFactor: 0.75, factorCite: P214, factorChecked: "text", ct: 6, side: 2, techBase: "inner-sphere", availability: [{ from: 3062 }], availabilityCite: UTA(38) },
    compact: {
      name: "Compact Fusion",
      label: "Compact Fusion Engine",
      weightFactor: 1.5,
      factorCite: { book: "TechManual", page: 48 },
      factorChecked: "text",
      ct: 3,
      side: 0,
      techBase: "inner-sphere",
      availability: [{ from: 3068 }],
      availabilityCite: UTA(38),
    },
    // XXL fusion (Tactical Operations: Advanced Units and Equipment, Advanced Engine Master Table printed p.120, read against the
    // page image): one third of the standard weight (the table's "x0.333") and twice an XL's slots in each side torso (6 for
    // Inner Sphere, 4 for Clan). The rules box is p.121; the cost table (p.219) prints the dates, IS 3055P and Clan 3030P.
    // (The Inner Sphere row also prints 2954X, in the Clan column; the box dates the first Clan prototype 2954, so we keep
    // the Clan row's own figure.)
    xxl: {
      name: "XXL Fusion",
      label: "XXL Fusion Engine",
      weightFactor: 1 / 3,
      ct: 6,
      side: 6,
      techBase: "inner-sphere",
      rulesLevel: "experimental",
      introduced: { is: 3055, prototype: true },
      cite: { book: TO, page: 120 },
      checked: "page",
      rules: "Runs hotter: 2 heat standing, 4 walking, 6 running, and jumping heat is doubled (at least 6).",
      rulesCite: { book: TO, page: 121 },
    },
    "xxl-clan": {
      name: "XXL Fusion (Clan)",
      label: "XXL Fusion Engine",
      weightFactor: 1 / 3,
      ct: 6,
      side: 4,
      techBase: "clan",
      rulesLevel: "experimental",
      introduced: { clan: 3030, prototype: true },
      cite: { book: TO, page: 120 },
      checked: "page",
      rules: "Runs hotter: 2 heat standing, 4 walking, 6 running, and jumping heat is doubled (at least 6).",
      rulesCite: { book: TO, page: 121 },
    },
    // Age of War extralight engine: mounted as an Inner Sphere XL (Interstellar Operations: Alternate Eras printed p.66).
    "prototype-xl": {
      name: "XL Fusion (Prototype)",
      label: "XL Fusion Engine",
      weightFactor: 0.5,
      factorCite: P214,
      factorChecked: "text",
      ct: 6,
      side: 3,
      techBase: "inner-sphere",
      introduced: { is: 2556 },
      cite: { book: IO, page: 66 },
      checked: "page",
      rules: "Plays as an Inner Sphere XL engine but adds 1 heat a turn, and each critical hit on it makes 5 plus half a die roll heat.",
    },
    // Non-fusion engines (TechManual, Master Engine Table printed p.49; IndustrialMech construction printed p.68): weight by rating,
    // the same six slots in the center torso as a standard engine, either tech base. Printed for IndustrialMechs, not BattleMechs.
    ice: { name: "Internal Combustion", label: "I.C.E. Engine", weightFactor: 1, weightTable: ICE_WEIGHTS, ct: 6, side: 0, techBase: "both", industrial: true, introduced: { is: 1950, clan: 1950 }, cite: { book: "TechManual", page: 49 }, checked: "page", rules: "Burns fuel: an IndustrialMech's ICE has a base range of 600 kilometers (20,000 Walking MP)." },
    "fuel-cell": { name: "Fuel Cell", label: "Fuel Cell Engine", weightFactor: 1, weightTable: FUEL_CELL_WEIGHTS, ct: 6, side: 0, techBase: "both", industrial: true, introduced: { is: 1950, clan: 1950 }, cite: { book: "TechManual", page: 49 }, checked: "page", rules: "An IndustrialMech's fuel cell has a base range of 450 kilometers (15,000 Walking MP)." },
    fission: { name: "Fission", label: "Fission Engine", weightFactor: 1, weightTable: FISSION_WEIGHTS, ct: 6, side: 0, techBase: "both", industrial: true, introduced: { is: 1960, clan: 1960 }, cite: { book: "TechManual", page: 49 }, checked: "page" },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Gyro (printed p.50). Weight is the engine rating over 100, rounded up to a whole ton, times the multiplier, rounded
// up to a half ton. All gyro slots are in the center torso. Clan BattleMechs have only the standard gyro.
// ---------------------------------------------------------------------------------------------------------------
export interface GyroType extends PartFacts {
  name: string; // as shown to the player; label is what the record sheets print
  label: string; // as the record sheets print it
  multiplier: number;
  slots: number;
}
export const GYROS: Sourced & { types: Record<string, GyroType> } = {
  cite: { book: "TechManual", page: 50 },
  checked: "page",
  types: {
    standard: { name: "Standard", label: "Gyro", multiplier: 1.0, slots: 4, availability: [{ from: 2350 }], availabilityCite: UTA(42) },
    compact: { name: "Compact", label: "Compact Gyro", multiplier: 1.5, slots: 2, techBase: "inner-sphere", availability: [{ from: 3068 }], availabilityCite: UTA(42) },
    "heavy-duty": { name: "Heavy-Duty", label: "Heavy Duty Gyro", multiplier: 2.0, slots: 4, techBase: "inner-sphere", availability: [{ from: 3067 }], availabilityCite: UTA(42) },
    xl: { name: "XL", label: "XL Gyro", multiplier: 0.5, slots: 6, techBase: "inner-sphere", availability: [{ from: 3067 }], availabilityCite: UTA(42) },
  },
};

// Interstellar Operations: Alternate Eras, printed p.158 (Tripod 'Mech Game Rules, which state the rules level) and p.159
// (Tripod 'Mech Construction Rules). Both were read against the page image.
const IO_TRIPOD_RULES: Cite = { book: "Interstellar Operations: Alternate Eras", page: 158 };
const IO_TRIPOD_CONSTRUCTION: Cite = { book: "Interstellar Operations: Alternate Eras", page: 159 };

// ---------------------------------------------------------------------------------------------------------------
// Cockpit (BattleMech Cockpit Table, printed p.52). Default head slots are the book's own numbering, counted from 1.
// ---------------------------------------------------------------------------------------------------------------
export interface CockpitType extends PartFacts {
  name: string;
  tons: number;
  /** The one configuration that may mount this cockpit; absent means any configuration that does not require another. */
  only?: string;
  cockpit: number[];
  sensors: number[];
  lifeSupport: number[];
  /** Parts the cockpit puts outside the head, one label per slot, in the first free slots of each location (the book gives no places). */
  elsewhere?: Partial<Record<LocationCode, string[]>>;
}
export const COCKPITS: Sourced & { types: Record<string, CockpitType> } = {
  cite: { book: "TechManual", page: 52 },
  checked: "page",
  types: {
    standard: { name: "Standard", tons: 3, cockpit: [3], sensors: [2, 5], lifeSupport: [1, 6], availability: [{ from: 2470 }], availabilityCite: UTA(33) },
    // The Small Cockpit row prints 3067 (Federated Suns) for the Inner Sphere and "Clan Intro: 3080".
    small: { name: "Small", tons: 2, cockpit: [3], sensors: [2, 4], lifeSupport: [1], techBase: "both", introduced: { is: 3067, clan: 3080 }, availabilityCite: UTA(33) },
    // The tripod's special cockpit weighs 4 tons up to 100 tons and takes the same slots as the standard one (Interstellar
    // Operations: Alternate Eras, Tripod 'Mech Construction Rules, printed p.159). Its 5-ton superheavy version is out of scope.
    tripod: { name: "Tripod", tons: 4, only: "tripod", cite: IO_TRIPOD_CONSTRUCTION, cockpit: [3], sensors: [2, 5], lifeSupport: [1, 6] },
    // Torso-mounted cockpit (Tactical Operations: Advanced Units and Equipment, construction rules printed p.112, rules box p.113,
    // cost table p.219; all read against the page image): 4 tons, 2 slots in the center torso (the cockpit and its added sensors),
    // a Life Support slot moved to each side torso, and the head keeps the two default sensor slots.
    "torso-mounted": {
      name: "Torso-Mounted",
      tons: 4,
      techBase: "both",
      rulesLevel: "experimental",
      introduced: { is: 3053, clan: 3055, prototype: true },
      cite: { book: TO, page: 112 },
      checked: "page",
      cockpit: [],
      sensors: [2, 5],
      lifeSupport: [],
      elsewhere: { CT: ["Cockpit", "Sensors"], LT: ["Life Support"], RT: ["Life Support"] },
      rules:
        "No pilot damage from hits to the center torso; the 'Mech is not destroyed when its head is. Piloting Skill rolls take +1, ejection is impossible, and it survives 2 sensor hits (+2, then +4 to hit).",
      rulesCite: { book: TO, page: 113 },
    },
    // IndustrialMech cockpits (TechManual printed pp.68-69; production 2470 in the Universal table, IO:AE printed p.33, read against the
    // page image: the 2350 cockpit there is the Primitive IndustrialMech's): 3 tons, the default slots of a standard cockpit. Advanced Fire Control
    // only doubles the cost (the cost table, p.277); it takes no tonnage or space. Neither has the ejection a BattleMech's has.
    industrial: { name: "Industrial", tons: 3, cockpit: [3], sensors: [2, 5], lifeSupport: [1, 6], techBase: "both", industrial: true, availability: [{ from: 2470 }], availabilityCite: UTA(33), cite: { book: "TechManual", page: 69 }, checked: "page", rules: "No pilot ejection, and every attack takes +1 to hit; Artemis IV, Beagle Active Probe, C3 and targeting computers may not be mounted without Advanced Fire Control." },
    "industrial-afc": { name: "Industrial (Advanced Fire Control)", tons: 3, cockpit: [3], sensors: [2, 5], lifeSupport: [1, 6], techBase: "both", industrial: true, availability: [{ from: 2470 }], availabilityCite: UTA(33), cite: { book: "TechManual", page: 69 }, checked: "page", rules: "An industrial cockpit with Advanced Fire Control: no +1 to hit, and Artemis IV, Beagle Active Probe, C3 and targeting computers may be mounted. It adds no weight or space." },
    // BattleMech interface cockpit (Interstellar Operations: Alternate Eras, rules printed p.110, table p.213): replaces the standard cockpit,
    // weighs 4 tons and takes one extra cockpit slot (the book does not say which slot; the free fourth is used).
    interface: { name: "Interface", tons: 4, cockpit: [3, 4], sensors: [2, 5], lifeSupport: [1, 6], techBase: "inner-sphere", rulesLevel: "experimental", introduced: { is: 3078, prototype: true }, cite: { book: IO, page: 213 }, checked: "text", rules: "Lets a MechWarrior in an interface suit control the 'Mech through a neural link." },
    "interface-clan": { name: "Interface (Clan)", tons: 4, cockpit: [3, 4], sensors: [2, 5], lifeSupport: [1, 6], techBase: "clan", rulesLevel: "experimental", introduced: { clan: 3083, prototype: true }, cite: { book: IO, page: 213 }, checked: "text", rules: "Lets a MechWarrior in an interface suit control the 'Mech through a neural link." },
    // Primitive BattleMechs mount only the primitive cockpit, 5 tons (Interstellar Operations: Alternate Eras printed p.117).
    primitive: {
      name: "Primitive",
      tons: 5,
      techBase: "inner-sphere",
      primitive: true,
      introduced: { is: 2439 },
      cite: { book: IO, page: 117 },
      checked: "page",
      cockpit: [3],
      sensors: [2, 5],
      lifeSupport: [1, 6],
      rules: "Slots as a standard cockpit. Printed for Primitive BattleMechs, which have their own construction rules.",
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Heat sinks. The slots each type takes are the Heat Sinks Table (printed p.54). The weight and "held by the engine"
// numbers are stated rules from the prose on p.53, read from the text extract only: the engine gives `freeWithEngine`
// sinks that cost no tonnage; every sink beyond them costs `tonsEach`, whatever its type. An engine also holds one
// sink per `ratingPerHeldSink` of rating (rounded down) without critical slots.
// ---------------------------------------------------------------------------------------------------------------
export interface HeatSinkType extends PartFacts {
  name: string;
  slots: number;
  /** Tons of one sink where it is not the usual one ton (HEAT_SINK_RULES). */
  tonsEach?: number;
  /** Sinks one mounted item stands for where it is not one (compact sinks go two to a slot). */
  perMount?: number;
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
    double: { name: "Double", slots: 3, techBase: "inner-sphere", availability: [{ from: 2567, to: 2865 }, { from: 3040 }], availabilityCite: UTA(36) },
    "double-clan": { name: "Double (Clan)", slots: 2, techBase: "clan", availability: [{ from: 2827 }], availabilityCite: UTA(36) },
    // Tactical Operations: Advanced Units and Equipment: compact sinks (rules p.128, table p.217) weigh 1.5 tons and go two to a slot; laser
    // sinks (p.129) are Clan doubles in every way (weight, capacity and space) but may not be mixed with standard doubles.
    compact: { name: "Compact", slots: 1, tonsEach: 1.5, perMount: 2, techBase: "inner-sphere", rulesLevel: "experimental", introduced: { is: 3058, prototype: true }, cite: { book: TO, page: 217 }, checked: "page", rules: "Two sinks fit in each critical slot. May not be mixed with another heat sink type." },
    laser: { name: "Laser (Clan)", slots: 2, techBase: "clan", rulesLevel: "advanced", introduced: { clan: 3051 }, cite: { book: TO, page: 217 }, checked: "page", rules: "Works as a Clan double heat sink. May not be mixed with standard double heat sinks." },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Armor (BattleMech Armor Table, printed p.56). Points per ton is the base times the multiplier, the points a given
// number of tons carries rounded down; tons for a given number of points rounded up to a half ton. Slots are
// critical slots, placed anywhere except where `slotsIn` says (stealth armor takes 2 slots in each arm, leg and side torso,
// none in the head or center torso, printed p.56 footnote and p.55 text; the text says 2 slots in each location but those two, so on a
// quad the four legs and the two side torsos carry them, which makes the same 12; a tripod's center leg carries 2 more, 14,
// per Interstellar Operations: Alternate Eras printed p.159: the rule says the third leg takes the extra slots, not how many). Stealth armor also wants a Guardian
// ECM Suite; that part is not modelled here.
// ---------------------------------------------------------------------------------------------------------------
type Spread = Partial<Record<LocationCode, number>>;
const TO_ARMOR: Cite = { book: TO, page: 92 };
const IO_ARMOR: Cite = { book: IO, page: 82 };
export interface ArmorType extends PartFacts {
  name: string;
  multiplier: number;
  slots: number;
  /** Changes to the 'Mech's movement points while it wears this armor (hardened armor: 1 less Running MP). */
  movement?: { run: number };
  slotsIn?: { biped: Spread; quad: Spread; tripod: Spread }; // slots per location, where the type has to go in particular places
}
export const ARMOR: Sourced & { basePointsPerTon: number; types: Record<string, ArmorType> } = {
  cite: { book: "TechManual", page: 56 },
  checked: "page",
  basePointsPerTon: 16,
  types: {
    standard: { name: "Standard", multiplier: 1.0, slots: 0, availability: [{ from: 2470 }], availabilityCite: UTA(29) },
    stealth: {
      name: "Stealth",
      multiplier: 1.0,
      slots: 12,
      slotsIn: {
        biped: { LA: 2, RA: 2, LL: 2, RL: 2, LT: 2, RT: 2 },
        quad: { FLL: 2, FRL: 2, RLL: 2, RRL: 2, LT: 2, RT: 2 },
        // A tripod's third leg takes its share of distributed equipment such as stealth armor (IO:AE printed p.159).
        tripod: { LA: 2, RA: 2, LL: 2, RL: 2, CL: 2, LT: 2, RT: 2 },
      },
    },
    "light-ferro-fibrous": { name: "Light Ferro-Fibrous", multiplier: 1.06, slots: 7, techBase: "inner-sphere", availability: [{ from: 3067 }], availabilityCite: UTA(29) },
    "ferro-fibrous": { name: "Ferro-Fibrous", multiplier: 1.12, slots: 14, techBase: "inner-sphere", availability: [{ from: 2571, to: 2810 }, { from: 3040 }], availabilityCite: UTA(29) },
    "ferro-fibrous-clan": { name: "Ferro-Fibrous (Clan)", multiplier: 1.2, slots: 7, techBase: "clan", availability: [{ from: 2825 }], availabilityCite: UTA(29) },
    "heavy-ferro-fibrous": { name: "Heavy Ferro-Fibrous", multiplier: 1.24, slots: 21, techBase: "inner-sphere", availability: [{ from: 3069 }], availabilityCite: UTA(29) },
    // The newer types. A row's multiplier is its printed points per ton over the base 16. Tactical Operations: Advanced Units and
    // Equipment, Advanced Armor Table (printed p.92) for the first six, Interstellar Operations: Alternate Eras, Advanced Armor
    // Table (printed p.82) for the next four; each was read against the page image. The dates are the books' (cost table p.217, p.84).
    // The standard armor of the BattleMech table is the IndustrialMech table's "Heavy Industrial" (TechManual p.72), so it has no row of its own.
    hardened: {
      name: "Hardened",
      multiplier: 0.5,
      slots: 0,
      movement: { run: -1 },
      techBase: "both",
      rulesLevel: "experimental",
      introduced: { is: 3047, clan: 3061, prototype: true },
      cite: TO_ARMOR,
      checked: "page",
      rules:
        "Each armor point takes two points of damage before it is lost, but counts as one point for the 20-damage Piloting roll; critical hit rolls against the location take -2; armor-piercing bonuses do nothing. The 'Mech takes +1 on Piloting Skill rolls and loses 1 Running MP (applied here). Not for OmniMechs.",
      rulesCite: { book: TO, page: 93 },
    },
    "ferro-lamellor": {
      name: "Ferro-Lamellor",
      multiplier: 14 / 16,
      slots: 12,
      techBase: "clan",
      rulesLevel: "experimental",
      introduced: { clan: 3070, prototype: true },
      cite: TO_ARMOR,
      checked: "page",
      rules: "Each hit is reduced by 1 for every 5 points (or part) it delivers, to a minimum of 0; armor-piercing bonuses do nothing.",
      rulesCite: TO_ARMOR,
    },
    "laser-reflective": {
      name: "Laser-Reflective",
      multiplier: 1,
      slots: 10,
      techBase: "inner-sphere",
      rulesLevel: "experimental",
      introduced: { is: 3058, prototype: true },
      cite: TO_ARMOR,
      checked: "page",
      rules:
        "Each point takes up to two points from flamers, lasers, PPCs and plasma rifles, and those heat effects are halved; damage from falls, physical attacks, building walls and artillery is doubled.",
      rulesCite: { book: TO, page: 93 },
    },
    "laser-reflective-clan": {
      name: "Laser-Reflective (Clan)",
      multiplier: 1,
      slots: 5,
      techBase: "clan",
      rulesLevel: "experimental",
      introduced: { clan: 3061, prototype: true },
      cite: TO_ARMOR,
      checked: "page",
      rules:
        "Each point takes up to two points from flamers, lasers, PPCs and plasma rifles, and those heat effects are halved; damage from falls, physical attacks, building walls and artillery is doubled.",
      rulesCite: { book: TO, page: 93 },
    },
    reactive: {
      name: "Reactive",
      multiplier: 1,
      slots: 14,
      techBase: "inner-sphere",
      rulesLevel: "experimental",
      introduced: { is: 3063, prototype: true },
      cite: TO_ARMOR,
      checked: "page",
      rules: "Halves damage (rounded down, at least 1) from missiles, mortars and artillery; a critical hit on one of its slots can destroy all the armor in the location.",
      rulesCite: { book: TO, page: 94 },
    },
    "reactive-clan": {
      name: "Reactive (Clan)",
      multiplier: 1,
      slots: 7,
      techBase: "clan",
      rulesLevel: "experimental",
      introduced: { clan: 3065, prototype: true },
      cite: TO_ARMOR,
      checked: "page",
      rules: "Halves damage (rounded down, at least 1) from missiles, mortars and artillery; a critical hit on one of its slots can destroy all the armor in the location.",
      rulesCite: { book: TO, page: 94 },
    },
    "anti-penetrative-ablation": {
      name: "Anti-Penetrative Ablation",
      multiplier: 12 / 16,
      slots: 6,
      techBase: "inner-sphere",
      rulesLevel: "advanced",
      introduced: { is: 3114 },
      cite: IO_ARMOR,
      checked: "page",
      rules: "While the location keeps 1 point of armor, critical hit checks from armor-piercing weapons take -2.",
      rulesCite: { book: IO, page: 80 },
    },
    "ballistic-reinforced": {
      name: "Ballistic-Reinforced",
      multiplier: 12 / 16,
      slots: 10,
      techBase: "inner-sphere",
      rulesLevel: "advanced",
      introduced: { is: 3131 },
      cite: IO_ARMOR,
      checked: "page",
      rules: "Each point takes up to two points from direct-fire ballistic and missile attacks.",
      rulesCite: { book: IO, page: 81 },
    },
    "heat-dissipating": {
      name: "Heat-Dissipating",
      multiplier: 10 / 16,
      slots: 6,
      techBase: "both",
      rulesLevel: "advanced",
      introduced: { is: 3123, clan: 3125 },
      cite: IO_ARMOR,
      checked: "page",
      rules: "While the location keeps 1 point of armor, heat from flamers, plasma weapons, infernos and fire is halved.",
      rulesCite: { book: IO, page: 81 },
    },
    "impact-resistant": {
      name: "Impact-Resistant",
      multiplier: 14 / 16,
      slots: 10,
      techBase: "inner-sphere",
      rulesLevel: "advanced",
      introduced: { is: 3103 },
      cite: IO_ARMOR,
      checked: "page",
      rules: "While the location keeps 1 point of armor, collision, fall and physical attack damage is reduced by 1 for every 3 points (or part); armor-piercing critical rolls take +1.",
      rulesCite: { book: IO, page: 82 },
    },
    // Age of War: the first ferro-fibrous took 2 more slots than the production kind (Interstellar Operations: Alternate Eras printed p.66).
    "prototype-ferro-fibrous": {
      name: "Ferro-Fibrous (Prototype)",
      multiplier: 1.12,
      slots: 16,
      techBase: "inner-sphere",
      introduced: { is: 2557 },
      cite: { book: IO, page: 66 },
      checked: "page",
      rules: "Plays as Inner Sphere ferro-fibrous armor.",
    },
    // Primitive BattleMechs mount only primitive armor, 0.67 of standard (Interstellar Operations: Alternate Eras printed p.118).
    primitive: {
      name: "Primitive",
      multiplier: 0.67,
      slots: 0,
      techBase: "inner-sphere",
      primitive: true,
      introduced: { is: 2439 },
      cite: { book: IO, page: 118 },
      checked: "page",
      rules: "Barrier Armor Rating 10. Printed for Primitive BattleMechs, which have their own construction rules.",
    },
    // IndustrialMech armor (TechManual printed pp.72 and 205): Commercial has Barrier Armor Rating 5, so any hit of 6 points or more
    // may cause a critical hit; Industrial has 10.
    industrial: {
      name: "Industrial",
      multiplier: 0.67,
      slots: 0,
      techBase: "both",
      industrial: true,
      introduced: { is: 2439 },
      cite: { book: "TechManual", page: 72 },
      checked: "page",
      rules: "Barrier Armor Rating 10. Printed for IndustrialMechs.",
    },
    commercial: {
      name: "Commercial",
      multiplier: 1.5,
      slots: 0,
      techBase: "both",
      industrial: true,
      introduced: { is: 2300 },
      cite: { book: "TechManual", page: 72 },
      checked: "page",
      rules: "Barrier Armor Rating 5: a hit of 6 or more points at a time may cause a critical hit. Printed for IndustrialMechs.",
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Myomer enhancements (BattleMech MASC and TSM Table, printed p.52). MASC weighs a percentage of the 'Mech's tonnage
// and takes the same number of slots (rounded normally); Triple-Strength Myomer weighs nothing and takes 6 slots,
// Inner Sphere only. "standard" is plain myomer. The two enhancements may not be combined.
// ---------------------------------------------------------------------------------------------------------------
export interface MyomerType extends PartFacts {
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
    masc: { name: "MASC", percentOfTons: 5, slots: "percent", techBase: "inner-sphere", availability: [{ from: 2740, to: 2795 }, { from: 3035 }], availabilityCite: UTA(29) },
    // RISC super-cooled myomer (Interstellar Operations: Alternate Eras printed p.88): six slots, one in each arm, leg and side torso; BattleMechs only.
    "super-cooled": { name: "Super-Cooled Myomer", catalogId: "super-cooled-myomer-is", percentOfTons: 0, slots: 6, techBase: "inner-sphere", rulesLevel: "experimental", introduced: { is: 3132, prototype: true }, cite: { book: IO, page: 88 }, checked: "page" },
    "masc-clan": { name: "MASC (Clan)", percentOfTons: 4, slots: "percent", techBase: "clan", availability: [{ from: 2827 }], availabilityCite: UTA(29) },
    tsm: { name: "Triple-Strength Myomer", catalogId: "tsm-is", percentOfTons: 0, slots: 6, techBase: "inner-sphere", availability: [{ from: 3050 }], availabilityCite: UTA(42) },
    // IndustrialMech Triple-Strength Myomer (TechManual printed p.70; production 3045, IO:AE printed p.42): weightless, twelve slots anywhere.
    "industrial-tsm": { name: "Industrial Triple-Strength Myomer", catalogId: "industrial-tsm-is", percentOfTons: 0, slots: 12, techBase: "inner-sphere", industrial: true, availability: [{ from: 3045 }], availabilityCite: UTA(42), cite: { book: "TechManual", page: 70 }, checked: "page", rules: "Twice as bulky as battlefield TSM and difficult to use in combat. The Battle Value counts it as tonnage times 1.15, not as extra movement." },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Land-Air 'Mechs (Interstellar Operations: Alternate Eras, LAM Construction, printed pp.108-109; rules level and years
// p.100). Built by the TechManual rules with the changes here. Both kinds are experimental rules (p.100, "Rules Level:
// Experimental"; the worked Phoenix Hawk on p.109 says "Advanced", and the heading wins). Conversion equipment weighs a
// percentage of the 'Mech's tonnage rounded up to a whole ton, 15 for a bimodal LAM and 10 for a standard one; its landing
// gear and avionics take the slots of the Conversion Equipment Table. The book does not say which slot of a location they
// take, so layout() puts each in the first free one. The free ton of fuel is in the engine (no weight, no slot); more fuel
// comes in whole tons of one slot each, 80 points a ton (the "LAM Fuel" row in equipment/other.ts).
// ---------------------------------------------------------------------------------------------------------------
const IO_AE = "Interstellar Operations: Alternate Eras" as const;
export const LAM: Sourced & {
  levelCite: Cite;
  maxTons: number;
  minJumpMP: number;
  conversionPercent: Record<string, number>;
  parts: { label: string; locations: LocationCode[] }[];
  engines: string[];
  gyros: string[];
  /** Catalog ids the Prohibited Technologies list bars: construction equipment that interferes with conversion (backhoe,
   * combine, bridge-laying) and a weapon that needs a Piloting skill roll (the heavy Gauss rifle, the book's example). */
  barred: { ids: string[]; why: string }[];
} = {
  cite: { book: IO_AE, page: 108 },
  checked: "page",
  levelCite: { book: IO_AE, page: 100 },
  maxTons: 55,
  minJumpMP: 3,
  conversionPercent: { lam: 10, "bimodal-lam": 15 },
  parts: [
    { label: "Landing Gear", locations: ["CT", "LT", "RT"] },
    { label: "Avionics", locations: ["HD", "LT", "RT"] },
  ],
  engines: ["standard", "compact"],
  gyros: ["standard", "compact", "heavy-duty"],
  barred: [
    { ids: ["backhoe-is", "combine-is"], why: "it interferes with conversion" },
    { ids: ["heavy-gauss-rifle-is"], why: "it needs a Piloting skill roll to use" },
  ],
};
// ---------------------------------------------------------------------------------------------------------------
// Shields (Tactical Operations: Advanced Units and Equipment: 'Mech Shield Table printed p.103, read against the page image;
// construction rules printed p.100). Keyed by catalog row id. DA (Damage Absorption) and DC (Damage Capacity) are the shield's
// own points; DC is what the record sheet's shield boxes hold. Mobility is the Walking, Running and Jumping MP the shield takes
// away (the table's "-1MP"; a large shield adds "No jump"). Only one shield may be mounted per arm, in an arm and no other
// location, and it has no actuator requirements, but each missing arm or hand actuator in its arm takes 1 from DA and from DC.
// ---------------------------------------------------------------------------------------------------------------
export interface ShieldRow {
  size: "small" | "medium" | "large";
  da: number;
  dc: number;
  bash: number; // the to-hit modifier of a Shield Bash
  mp: number; // Walking, Running and Jumping MP taken away
  noJump?: true;
}
export const SHIELDS: Sourced & {
  rulesCite: Cite;
  perArm: number;
  lostPerMissingActuator: number;
  rows: Record<string, ShieldRow>;
} = {
  cite: { book: TO, page: 103 },
  checked: "page",
  rulesCite: { book: TO, page: 100 },
  perArm: 1,
  lostPerMissingActuator: 1,
  rows: {
    "shield-small-is": { size: "small", da: 3, dc: 11, bash: -2, mp: 0 },
    "shield-medium-is": { size: "medium", da: 5, dc: 18, bash: -3, mp: 1 },
    "shield-large-is": { size: "large", da: 7, dc: 25, bash: -4, mp: 1, noJump: true },
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
//
// Each configuration is one row. `rulesLevel` is the rules level the book prints for the body type; the biped and the quad are
// standard and say nothing more. A tripod is Advanced (Interstellar Operations: Alternate Eras, printed p.158) and follows the
// biped's construction rules with the changes the row names (printed p.159): `structureExtra` is the fraction added to the
// weight of the internal structure of any type, rounded up to a half ton, and `cockpit` is the only cockpit it may mount. The
// book gives no slot table for the third leg; "the same construction rules as a biped" makes it a leg of 6 slots with the other
// legs' four actuators, which is our reading and so `checked` is "text" on that row.
// ---------------------------------------------------------------------------------------------------------------
export type RulesLevel = "introductory" | "standard" | "advanced" | "experimental" | "licensed-noncanon" | "fan-made" | "unlimited";

/** The rules levels in order; each includes every level before it. The four published ones carry the page that names them
 * (Total Warfare printed p.10 and p.257, p.275; Tactical Operations: Advanced Units and Equipment p.87); Apocryphal and
 * Fan-made are the owner's additions and have none. Labels and descriptions are the words the screens show. */
export interface RulesLevelRow {
  id: RulesLevel;
  label: string;
  description: string;
  cite?: { book: string; page: number };
  /** Further pages that bear on the level, shown after the cite. */
  see?: { book: string; page: number }[];
  checked?: Checked;
}
export const RULES_LEVELS: RulesLevelRow[] = [
  { id: "introductory", label: "Introductory", description: "3025 technology only: Inner Sphere 'Mechs like those of the Introductory Box Set, with the Succession Wars era's standard equipment.", cite: { book: "Total Warfare", page: 275 }, see: [{ book: "Quick-Strike: Introductory 'Mech Cards", page: 2 }], checked: "page" },
  { id: "standard", label: "Standard", description: "The tournament-legal rules of Total Warfare and TechManual.", cite: { book: "Total Warfare", page: 10 }, checked: "page" },
  { id: "advanced", label: "Advanced", description: "Mainstream technology beyond the tournament rules, such as Tactical Operations equipment.", cite: { book: "Tactical Operations: Advanced Units and Equipment", page: 87 }, checked: "page" },
  { id: "experimental", label: "Experimental", description: "Technology that has not reached mass production: prototypes, lost technology and rarities.", cite: { book: "Tactical Operations: Advanced Units and Equipment", page: 87 }, checked: "page" },
  { id: "licensed-noncanon", label: "Licensed non-canon", description: "Published under license but not canon, or canon since retconned." },
  { id: "fan-made", label: "Fan-made", description: "Made by fans, not published by the rules publisher. Meant to be balanced." },
  { id: "unlimited", label: "Unlimited", description: "Anything goes: joke equipment, superpowered gear. The check still tells you what breaks the rules." },
];
/**
 * What the books print about the Introductory level, and what we infer. PRINTED: Total Warfare p.275 calls "3025
 * (introductory) technology" the technology of the classic 'Mechs, vehicles and infantry; the Quick-Strike: Introductory
 * 'Mech Cards p.2 (PDF page; the booklet prints no page numbers) say the Introductory Box Set's 24 'Mechs are the
 * Technical Readout: 3039 designs; the Quick-Start Rules (2021) print two such designs, the Griffin GRF-1N and Wolverine
 * WVR-6R (Inner Sphere; LRM 10, PPC, medium laser, SRM 6, AC/5, jump jets; printed p.14) and say the Tech Base has "no
 * significance at this rules level" (p.9). The Quick-Start and Beginner Box rules print no construction rules and no
 * list of allowed parts, and the Salvage Box's record sheets (Clan 'Mechs, ER weapons) are marked as advanced technology
 * beyond the Introductory game (p.1), so they do not widen the level. INFERRED, since no book lists them: the parts below
 * and the 3025 cut-off for equipment (equipmentLevel in rules/levels.ts), read from the TechManual dates.
 * The chassis parts that are 3025 technology, by table: the plain ones the Succession Wars 'Mechs were built from. Every
 * other part of TechManual is Standard (that book is the standard construction rules, Tactical Operations p.87); a part
 * not named here is therefore Standard, not Introductory.
 */
export const INTRODUCTORY_PARTS: Record<"configuration" | "engine" | "gyro" | "cockpit" | "structure" | "armor" | "heatSink" | "myomer", string[]> = {
  configuration: ["biped", "quad"],
  engine: ["standard"],
  gyro: ["standard"],
  cockpit: ["standard"],
  structure: ["standard"],
  armor: ["standard"],
  heatSink: ["single"],
  myomer: ["standard"],
};
export interface ConfigurationRow {
  name: string; // as shown to the player
  body?: string; // the layout whose slots, structure and armor grid this shares (a Land-Air 'Mech has a biped's); its own name if absent
  rulesLevel: RulesLevel;
  /** The years the body type can be had, from the Construction Options table (IO:AE printed p.44, read against the page image):
   * the production date, then any extinction. `clanAvailability` is for a Clan 'Mech where the table prints another extinction. */
  availability: Span[];
  clanAvailability?: Span[];
  /** Set when the table gives the body type to the Inner Sphere only. */
  techBase?: "inner-sphere";
  levelCite?: Cite; // the page that states a rules level other than standard
  construction?: Sourced; // the page that states this body type's construction changes
  structureExtra?: number;
  cockpit?: string;
  size: Spread;
  fixed: Partial<Record<LocationCode, readonly string[]>>;
}
const BIPED_SIZE = { HD: 6, CT: 12, LT: 12, RT: 12, LA: 12, RA: 12, LL: 6, RL: 6 } as const;
const LEG = ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"];
const ARM = ["Shoulder", "Upper Arm Actuator", "Lower Arm Actuator", "Hand Actuator"];
// A Land-Air 'Mech is built on a biped's body; both kinds are experimental rules (IO:AE printed p.100).
const LAM_ROW = {
  body: "biped",
  rulesLevel: "experimental",
  levelCite: LAM.levelCite,
  size: BIPED_SIZE,
  fixed: { LA: ARM, RA: ARM, LL: LEG, RL: LEG },
} as const;
export const SHEET = {
  // Labels and their order rest on the record sheet (p.24); the slot counts on the Critical Space Table (p.45).
  cites: { labels: { book: "TechManual", page: 24 }, counts: { book: "TechManual", page: 45 } } satisfies Record<string, Cite>,
  checked: "page" as Checked,
  engineAbove: 3,
  configurations: {
    biped: {
      name: "Biped",
      rulesLevel: "standard",
      availability: [{ from: 2470 }],
      size: BIPED_SIZE,
      fixed: { LA: ARM, RA: ARM, LL: LEG, RL: LEG },
    },
    quad: {
      name: "Quad",
      rulesLevel: "standard",
      availability: [{ from: 2470 }],
      size: { HD: 6, CT: 12, LT: 12, RT: 12, FLL: 6, FRL: 6, RLL: 6, RRL: 6 },
      fixed: { FLL: LEG, FRL: LEG, RLL: LEG, RRL: LEG },
    },
    tripod: {
      name: "Tripod",
      rulesLevel: "advanced",
      techBase: "inner-sphere",
      availability: [{ from: 2602 }],
      levelCite: IO_TRIPOD_RULES,
      construction: { cite: IO_TRIPOD_CONSTRUCTION, checked: "text" },
      structureExtra: 0.1,
      cockpit: "tripod",
      size: { ...BIPED_SIZE, CL: 6 },
      fixed: { LA: ARM, RA: ARM, LL: LEG, RL: LEG, CL: LEG },
    },
    lam: { ...LAM_ROW, name: "Land-Air 'Mech", availability: [{ from: 2688, to: 3085 }], clanAvailability: [{ from: 2688, to: 2825 }] },
    "bimodal-lam": { ...LAM_ROW, name: "Bimodal Land-Air 'Mech", availability: [{ from: 2684, to: 2781 }], clanAvailability: [{ from: 2684, to: 2801 }] },
  } satisfies Record<string, ConfigurationRow>,
};

// ---------------------------------------------------------------------------------------------------------------
// 'Mech types: what kind of 'Mech a record is. The edition's unit-type list (data/editions.ts) is built from this table for its
// 'Mech entries. A type has its own tonnage limits and construction rules. A BattleMech (the combat 'Mech) takes every part not
// printed for IndustrialMechs; an IndustrialMech takes only the parts its `industrial` rules name.
// `availability` is the Construction Options table of Interstellar Operations: Alternate Eras (printed pp.44-45, read against the
// page image), the production year of the standard 'Mech of the type: Standard BattleMechs and Standard IndustrialMechs 2470 (the
// Primitive kinds, 2443 and 2350, have their own construction rules, IO:AE p.116, which this tool does not build); Omni Technology
// 2856 for the Clans and 3052 for the Inner Sphere (p.45: "IS Intro: 3052").
// ---------------------------------------------------------------------------------------------------------------
export type MechType = "mech" | "industrialmech" | "omnimech";
export interface IndustrialRules {
  /** The page each rule is read from: TechManual's IndustrialMech Construction chapter (printed pp.64-75). */
  cites: Record<"techBase" | "configuration" | "structure" | "engine" | "heatSinks" | "jump" | "cockpit" | "gyro" | "myomer" | "armor" | "powerAmplifier" | "fireControl", Cite>;
  /** Inner Sphere or Clan, not mixed (p.64: "one of two available technology bases"). */
  techBases: ("inner-sphere" | "clan")[];
  /** Only biped and quad bodies: "design type (biped or four-legged)". */
  configurations: string[];
  /** Part keys (the tables above) an IndustrialMech may use, per table. Standard armor is the book's Heavy Industrial. */
  parts: Record<"structure" | "engine" | "gyro" | "cockpit" | "heatSink" | "myomer" | "armor", string[]>;
  /** What an IndustrialMech's book calls a part the BattleMech tables name otherwise: the standard armor is "Heavy Industrial" (p.72). */
  armorNames: Record<string, string>;
  /** Heat sinks that cost no tonnage with each engine type (the IndustrialMech Bonus Heat Sinks Table, p.71). */
  freeHeatSinks: Record<string, number>;
  /** Engines whose IndustrialMech may mount jump jets (fusion and fission). Only standard jump jets, in torso and legs. */
  jumpEngines: string[];
  /** Engines whose energy weapons need power amplifiers: a share of the energy weapons' weight, up to the half ton, no slots. */
  powerAmplifier: { engines: string[]; share: number };
  /** Catalog rows barred unless the cockpit has Advanced Fire Control (Artemis IV, Beagle Active Probe or its Clan equivalent, C3 and C3i units, targeting computers). */
  needsFireControl: string[];
}
export interface MechTypeRow {
  id: MechType;
  label: string;
  /** The words the screens show beside the choice. */
  description: string;
  /** The unit type the equipment table is read as (data/units.ts): an OmniMech mounts what a BattleMech does. */
  unit: UnitId;
  rulesLevel: RulesLevel;
  /** False while the rules for the type are not built: the choice is listed, disabled, with `notReady` beside it. */
  ready: boolean;
  notReady?: string;
  /** The page where the type's construction rules start, and the page that says its years. */
  cite: Cite;
  availabilityCite: Cite;
  checked: Checked;
  availability: Span[];
  clanAvailability?: Span[];
  tonnage: { min: number; max: number; step: number; cite: Cite };
  industrial?: IndustrialRules;
}
const TM_P = (page: number): Cite => ({ book: "TechManual", page });
export const MECH_TYPES: MechTypeRow[] = [
  {
    id: "mech",
    label: "BattleMech",
    description: "The combat 'Mech of Total Warfare play, built by the BattleMech construction rules.",
    unit: "mech",
    rulesLevel: "introductory", // the Introductory game is BattleMechs of 3025 technology (Total Warfare p.275); IndustrialMechs begin at Standard
    ready: true,
    cite: TM_P(44),
    availabilityCite: { book: IO_AE, page: 44 },
    checked: "page",
    availability: [{ from: 2470 }],
    tonnage: { min: 20, max: 100, step: 5, cite: TM_P(46) },
  },
  {
    id: "industrialmech",
    label: "IndustrialMech",
    description: "A civilian work 'Mech with its own construction rules: industrial structure, a simple cockpit, engines that need not be fusion, and armor from commercial to heavy industrial.",
    unit: "industrialmech",
    rulesLevel: "standard",
    ready: true,
    cite: TM_P(64),
    availabilityCite: { book: IO_AE, page: 44 },
    checked: "page",
    availability: [{ from: 2470 }],
    tonnage: { min: 10, max: 100, step: 5, cite: TM_P(64) },
    industrial: {
      cites: {
        techBase: TM_P(64),
        configuration: TM_P(65),
        structure: TM_P(67),
        engine: TM_P(68),
        jump: TM_P(69),
        cockpit: TM_P(69),
        gyro: TM_P(69),
        myomer: TM_P(70),
        heatSinks: TM_P(71),
        armor: TM_P(72),
        powerAmplifier: TM_P(74),
        fireControl: TM_P(69),
      },
      techBases: ["inner-sphere", "clan"],
      configurations: ["biped", "quad"],
      parts: {
        structure: ["industrial"],
        engine: ["standard", "ice", "fuel-cell", "fission"],
        gyro: ["standard"],
        cockpit: ["industrial", "industrial-afc"],
        heatSink: ["single"],
        myomer: ["standard", "industrial-tsm"],
        armor: ["standard", "industrial", "commercial"],
      },
      armorNames: { standard: "Heavy Industrial" },
      freeHeatSinks: { standard: 10, ice: 0, "fuel-cell": 1, fission: 5 },
      jumpEngines: ["standard", "fission"],
      powerAmplifier: { engines: ["ice", "fuel-cell"], share: 0.1 },
      needsFireControl: [
        "artemis-iv-is",
        "artemis-iv-clan",
        "prototype-artemis-iv-is",
        "beagle-active-probe-is",
        "prototype-beagle-active-probe-is",
        "active-probe-clan",
        "c3-computer-master-is",
        "c3-computer-slave-is",
        "improved-c3-computer-is",
        "c3-boosted-master-is",
        "c3-boosted-slave-is",
        "c3-emergency-master-is",
        "targeting-computer-is",
        "targeting-computer-clan",
      ],
    },
  },
  {
    id: "omnimech",
    label: "OmniMech",
    description: "A 'Mech built on a base chassis that keeps its fixed parts and carries interchangeable pods in several configurations, Prime being the mainstay layout.",
    unit: "mech",
    rulesLevel: "standard",
    ready: false,
    notReady: "its rules are not built; an OmniMech chassis needs its pod configurations.",
    cite: TM_P(19),
    availabilityCite: { book: IO_AE, page: 45 },
    checked: "page",
    availability: [{ from: 3052 }],
    clanAvailability: [{ from: 2856 }],
    tonnage: { min: 20, max: 100, step: 5, cite: TM_P(46) },
  },
];
