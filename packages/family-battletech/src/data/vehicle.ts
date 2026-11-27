// Combat vehicle tables (Classic BattleTech): the figures TechManual (corrected sixth printing, errata v8.0) prints for Combat Vehicle construction
// (printed pp. 96-109), their costs (p. 279 and the final formulas, p. 285) and Battle Value (the v4.1 replacement pages, tables p. 316), each
// read against the page image. Plain data: nothing here runs. Equipment is the one catalog (data/equipment): a row's `units` names "vehicle", and
// `by.vehicle` carries what differs for a vehicle. The tables are our own; the book's wording is not copied.
import type { RulesLevel } from "./chassis";

export interface BookPage {
  book: string;
  page: number;
}
const TM = "TechManual";
const BV = "TechManual Battle Value v4.1";
const TO = "Tactical Operations: Advanced Units and Equipment";
const IO = "Interstellar Operations: Alternate Eras";

export type MotiveId = "tracked" | "wheeled" | "hover" | "wige" | "vtol" | "naval" | "hydrofoil" | "submarine";
export type VehicleSheet = "ground" | "naval" | "vtol";
/** What the motive system adds to the weight: lift equipment (hover, hydrofoil, WiGE), dive equipment (submarine) or rotors (VTOL). */
export type LiftKind = "lift" | "dive" | "rotor";

export interface MotiveRow {
  id: MotiveId;
  label: string;
  /** TM p. 96, Motive Types Table. */
  maxTons: number;
  sheet: VehicleSheet;
  /** TM p. 100, suspension factors: the factor for tonnages up to each limit, in order. */
  suspension: [upTo: number, factor: number][];
  lift?: LiftKind;
  /** WiGE: the least cruising MP (TM p. 101). */
  minCruise?: number;
  /** TM p. 285, Final Unit Cost Formulas Table: the unit's tons are divided by this. */
  costDivisor: number;
  /** TM p. 316, Unit Type Modifiers Table. */
  bvModifier: number;
  /** The least rules level that offers the motive type: Standard for all. The BattleTech Master Rules, Revised Edition p. 6 puts Level One at BattleMechs only, with vehicles added at Level Two, and Total Warfare p. 9 says the old levels are gone and names A Game of Armored Combat (no vehicles) as the introductory game. */
  level: RulesLevel;
  /** True for the motive types whose hit locations and Record Sheet belong to the book's Naval sheet. */
  naval?: true;
}

const bands = (factors: number[], step: number): [number, number][] => factors.map((factor, i) => [(i + 1) * step, factor]);

export const MOTIVES: MotiveRow[] = [
  { id: "tracked", label: "Tracked", maxTons: 100, sheet: "ground", suspension: [[100, 0]], costDivisor: 100, bvModifier: 0.9, level: "standard" },
  { id: "wheeled", label: "Wheeled", maxTons: 80, sheet: "ground", suspension: [[80, 20]], costDivisor: 200, bvModifier: 0.8, level: "standard" },
  { id: "hover", label: "Hover", maxTons: 50, sheet: "ground", suspension: bands([40, 85, 130, 175, 235], 10), lift: "lift", costDivisor: 50, bvModifier: 0.7, level: "standard" },
  { id: "wige", label: "Wing-in-Ground Effect (WiGE)", maxTons: 80, sheet: "ground", suspension: [[15, 45], [30, 80], [45, 115], [80, 140]], lift: "lift", minCruise: 5, costDivisor: 25, bvModifier: 0.7, level: "standard" },
  { id: "vtol", label: "VTOL", maxTons: 30, sheet: "vtol", suspension: bands([50, 95, 140], 10), lift: "rotor", costDivisor: 30, bvModifier: 0.7, level: "standard" },
  { id: "naval", label: "Naval (displacement hull)", maxTons: 300, sheet: "naval", suspension: [[300, 30]], costDivisor: 200, bvModifier: 0.6, level: "standard", naval: true },
  { id: "hydrofoil", label: "Naval (hydrofoil)", maxTons: 100, sheet: "naval", suspension: bands([60, 105, 150, 195, 255, 300, 345, 390, 435, 480], 10), lift: "lift", costDivisor: 75, bvModifier: 0.6, level: "standard", naval: true },
  { id: "submarine", label: "Naval (submarine)", maxTons: 300, sheet: "naval", suspension: [[300, 30]], lift: "dive", costDivisor: 50, bvModifier: 0.6, level: "standard", naval: true },
];
export const MOTIVE_CITE: BookPage = { book: TM, page: 96 };
export const SUSPENSION_CITE: BookPage = { book: TM, page: 100 };
export const COST_FORMULA_CITE: BookPage = { book: TM, page: 285 };
export const BV_MODIFIER_CITE: BookPage = { book: TM, page: 316 };

export const motiveOf = (id: string): MotiveRow | undefined => MOTIVES.find((row) => row.id === id);

/** The book's fixed numbers for Combat Vehicle construction, each with the printed page. */
export const VEHICLE_RULES = {
  /** Structure weighs a tenth of the tons, up to the half ton (p. 98); every location has a tenth of the tons, up to the whole point. */
  structure: { share: 0.1, cite: { book: TM, page: 98 } },
  /** Item slots: 5 plus 1 for every 5 tons, down (p. 98). */
  slots: { base: 5, perTons: 5, cite: { book: TM, page: 98 } },
  /** Engine Rating limits and rounding (p. 100); flank is cruising x 1.5 up (p. 100). */
  engine: { min: 10, max: 400, step: 5, flank: 1.5, cite: { book: TM, page: 100 } },
  /** A fusion engine weighs 1.5 times the table's weight, up to the half ton; a hover engine weighs at least a fifth of the tons (p. 101). */
  fusionShield: { factor: 1.5, hoverMinShare: 0.2, cite: { book: TM, page: 101 } },
  /** Lift or dive equipment and rotors weigh a tenth of the tons (p. 102); controls a twentieth (p. 103); both up to the half ton. */
  lift: { share: 0.1, cite: { book: TM, page: 102 } },
  controls: { share: 0.05, cite: { book: TM, page: 103 } },
  /** One crewman for every 15 tons or part of 15 (p. 103). */
  crew: { perTons: 15, cite: { book: TM, page: 103 } },
  /** Heat sinks: a fusion engine gives 10 free, an ICE none; each other sink is one ton and no slot (p. 104). */
  heat: { freeWithFusion: 10, cite: { book: TM, page: 104 } },
  /** Armor: 16 points a ton (half-ton lots); the most is 3.5 x tons + 40, down (p. 105); a rotor holds 2 points at most (p. 105). */
  armor: { perTon: 16, maxFactor: { perTon: 3.5, add: 40 }, rotorMax: 2, lot: 0.5, cite: { book: TM, page: 105 } },
  /** A turret weighs a tenth of what is in it, ammunition excluded, up to the half ton (p. 107). */
  turret: { share: 0.1, cite: { book: TM, page: 107 } },
  /** An ICE engine's power amplifiers weigh a tenth of the energy weapons' weight, up to the half ton, and take no slot (p. 107). */
  amplifiers: { share: 0.1, cite: { book: TM, page: 107 } },
  /** Ammunition: a bin is at least a ton, a half ton for machine guns, nail and rivet guns (p. 107). */
  ammo: { minTons: 1, smallMinTons: 0.5, cite: { book: TM, page: 107 } },
} as const;

/** The engines a Combat Vehicle may use (p. 101): ICE and fusion. A key is an `ENGINE_TYPES` id (data/chassis.ts). `slots` is the slots lost (a negative number is slots gained). */
export const VEHICLE_ENGINES: { id: string; slots: number; shielded: boolean; techBase: "inner-sphere" | "clan" | "both" }[] = [
  { id: "ice", slots: 0, shielded: false, techBase: "both" },
  { id: "standard", slots: 0, shielded: true, techBase: "both" },
  { id: "xl", slots: 2, shielded: true, techBase: "inner-sphere" },
  { id: "xl-clan", slots: 1, shielded: true, techBase: "clan" },
  { id: "light", slots: 1, shielded: true, techBase: "inner-sphere" },
  { id: "compact", slots: -1, shielded: true, techBase: "inner-sphere" },
];
export const ENGINE_SLOTS_CITE: BookPage = { book: TM, page: 101 };

/** The armor a Combat Vehicle may wear: the slots lost (the multiplier on 16 points a ton is the armor row's). Keys are `ARMOR.types` ids (data/chassis.ts).
 * The first five are TM p. 105; the others are the Combat Vehicle (CV) column of the Advanced Armor Tables, TO:AUE printed p. 92 and IO:AE printed p. 82
 * (read against the page images), which name the same armor rows the 'Mech uses. Heat-dissipating and impact-resistant armor print N/A for vehicles, so
 * they are not here; modular armor is an item (MODULAR_ARMOR in data/chassis.ts) and vehicular stealth armor is the last row (TO:AUE p. 92: 2 slots). */
export const VEHICLE_ARMOR: { id: string; slots: number; cite?: BookPage }[] = [
  { id: "standard", slots: 0 },
  { id: "light-ferro-fibrous", slots: 1 },
  { id: "ferro-fibrous", slots: 2 },
  { id: "ferro-fibrous-clan", slots: 1 },
  { id: "heavy-ferro-fibrous", slots: 3 },
  { id: "ferro-lamellor", slots: 1, cite: { book: TO, page: 92 } },
  { id: "hardened", slots: 1, cite: { book: TO, page: 92 } },
  { id: "laser-reflective", slots: 1, cite: { book: TO, page: 92 } },
  { id: "laser-reflective-clan", slots: 1, cite: { book: TO, page: 92 } },
  { id: "reactive", slots: 2, cite: { book: TO, page: 92 } },
  { id: "reactive-clan", slots: 1, cite: { book: TO, page: 92 } },
  { id: "vehicular-stealth", slots: 2, cite: { book: TO, page: 92 } },
  { id: "anti-penetrative-ablation", slots: 1, cite: { book: IO, page: 82 } },
  { id: "ballistic-reinforced", slots: 1, cite: { book: IO, page: 82 } },
];
export const ARMOR_CITE: BookPage = { book: TM, page: 105 };

/** Cost, TM p. 279 (Combat Vehicle Costs and Availability): C-bills. Engines are x rating x tons / 75. */
export const VEHICLE_COST = {
  cite: { book: TM, page: 279 },
  structurePerTon: 10_000,
  controlsPerTon: 10_000,
  liftPerTon: 20_000,
  rotorPerTon: 40_000,
  engineDivisor: 75,
  engine: { standard: 5_000, light: 15_000, xl: 20_000, "xl-clan": 20_000, compact: 10_000, ice: 1_250 } as Record<string, number>,
  heatSinkEach: 2_000,
  armorPerTon: { standard: 10_000, "ferro-fibrous": 20_000, "ferro-fibrous-clan": 20_000, "light-ferro-fibrous": 15_000, "heavy-ferro-fibrous": 25_000 } as Record<string, number>,
  turretPerTon: 5_000,
  amplifierPerTon: 20_000,
  omniFactor: 1.25,
};

/** BV (v4.1 replacement pages, "Calculating Vehicle BV"). */
export const VEHICLE_BV = {
  cite: { book: BV, page: 302 },
  armorFactor: 2.5,
  structureFactor: 1.5,
  rearFactor: 0.5,
  tonsDivisor: 2,
  artemis: 1.2,
  targetingComputer: 1.25,
};

/** Combat vehicles as a class, all motive types (Interstellar Operations: Alternate Eras, Universal Technology Advancement Table, printed p. 44, read against the
 * page image: "Standard Combat Vehicles (All Motive Types)"): production 2470, common 2490. The prototype year is the one the structure, controls, lift and
 * rotor rows print (about 2460). Between the two a vehicle is Experimental; before the prototype year it does not exist. */
export const VEHICLE_CLASS_DATES = { prototype: 2460, production: 2470, common: 2490, cite: { book: "Interstellar Operations: Alternate Eras", page: 44 } };

/** Target Movement Modifier added for a vehicle that is airborne (Total Warfare p. 55: WiGE, like jumping and VTOL movement, is harder to hit; p. 117, Attack Modifiers Table:
 * "Jumped/Airborne (non-aerospace units) +1 additional"). The Defensive Factors Table note (TechManual p. 316) counts "any VTOL movement modifier". Our reading for WiGE: the owner may overrule it. */
export const AIRBORNE_MOTIVES: MotiveId[] = ["vtol", "wige"];
