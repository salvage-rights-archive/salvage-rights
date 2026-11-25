// Battle Value tables for a BattleMech, from TechManual (corrected sixth printing, errata v8.0) and the Battle Value
// replacement pages for its pp. 302-314 (v4.1, which errata v8.0 names as the current text), plus Interstellar
// Operations: Alternate Eras for the items and unit types that book adds. Plain data: nothing here runs. Every table says
// where it was printed and whether the figures were read against the page image ("page") or only the text ("text").
// The tables are our own; the book's wording is not copied.
//
// The equipment figures are keyed by catalog row id (rules/catalog.ts) and grouped, so a weapon and its ammunition are one
// line. A catalog row with no line here has no printed BV: the rules module reports it as unvalued and does not guess.

export interface BvCite {
  book: string;
  page: number;
}
export type Checked = "page" | "text";
interface Sourced {
  cite: BvCite;
  checked: Checked;
}

const TM = "TechManual";
/** The replacement text for TechManual pp. 302-314; its own pages carry the old numbers (the 'Mech method begins p. 302, the worked examples p. 304). */
const TM_BV = "TechManual Battle Value v4.1";
const TW = "Total Warfare";
const IO = "Interstellar Operations: Alternate Eras";

// ---------------------------------------------------------------------------------------------------------------
// The method's fixed numbers (TechManual Battle Value v4.1, "Calculating 'Mech BV").
// ---------------------------------------------------------------------------------------------------------------
export const BV_METHOD: Sourced & {
  armorFactor: number;
  structureFactor: number;
  explosiveAmmoPerSlot: number;
  gaussPerSlot: number;
  minimumDefensive: number;
  artemis: number;
  targetingComputer: number;
  targetingComputerBv: number;
  machineGunArray: number;
  baseHeatEfficiency: number;
  lamHeatEfficiency: number;
  runningHeat: number;
  jumpHeatMinimum: number;
  stealthHeat: number;
  stealthTargetModifier: number;
  tsmTonnage: number;
  smallCockpit: number;
  halved: number;
} = {
  cite: { book: TM_BV, page: 302 },
  checked: "page",
  armorFactor: 2.5,
  structureFactor: 1.5,
  explosiveAmmoPerSlot: 15,
  gaussPerSlot: 1,
  minimumDefensive: 1,
  artemis: 1.2,
  targetingComputer: 1.25,
  targetingComputerBv: 0.25, // the computer's own BV: 25 percent of the BV of the weapons it links (table note E, TechManual p. 317)
  machineGunArray: 0.67, // table note F, TechManual p. 317
  baseHeatEfficiency: 6,
  lamHeatEfficiency: 9, // Interstellar Operations: Alternate Eras p. 186
  runningHeat: 2, // Total Warfare p. 53
  jumpHeatMinimum: 3, // Total Warfare p. 53
  stealthHeat: 10,
  stealthTargetModifier: 2, // the long-range modifier (Total Warfare p. 142: +1 medium, +2 long); the book's "maximum effect"
  tsmTonnage: 1.5,
  smallCockpit: 0.95,
  halved: 0.5,
};

/** Multipliers on the heat a weapon adds to Total Weapon Heat (v4.1, "Determine Total Weapon Heat"). */
export const HEAT_MULTIPLIER = { ultra: 2, rotary: 6, streak: 0.5, oneShot: 0.25 } as const;

// ---------------------------------------------------------------------------------------------------------------
// Modifier tables, printed p. 315. Keys are the chassis table's keys (data/chassis.ts); a key the book prints that the
// chassis tables do not know yet (industrial, commercial) is kept for when they do.
// ---------------------------------------------------------------------------------------------------------------
export const ARMOR_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  values: {
    standard: 1.0,
    "ferro-fibrous": 1.0,
    "ferro-fibrous-clan": 1.0,
    "light-ferro-fibrous": 1.0,
    "heavy-ferro-fibrous": 1.0,
    stealth: 1.0,
    industrial: 1.0,
    "heavy-industrial": 1.0,
    commercial: 0.5,
  },
};
export const STRUCTURE_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  values: { standard: 1.0, "endo-steel": 1.0, "endo-steel-clan": 1.0, industrial: 0.5 },
};
export const ENGINE_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  values: { standard: 1.0, light: 0.75, compact: 1.0, xl: 0.5, "xl-clan": 0.75 },
};
export const GYRO_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  values: { standard: 0.5, compact: 0.5, xl: 0.5, "heavy-duty": 1.0 },
};

/** Target Movement Modifier by hexes moved (Attack Modifiers Table, Total Warfare p. 117): [most hexes in the band, modifier]. Jumping adds 1. */
export const TARGET_MODIFIER: Sourced & { bands: [number, number][]; jumpBonus: number } = {
  cite: { book: TW, page: 117 },
  checked: "page",
  bands: [
    [2, 0],
    [4, 1],
    [6, 2],
    [9, 3],
    [17, 4],
    [24, 5],
    [Infinity, 6],
  ],
  jumpBonus: 1,
};

/** Speed Factor by Running MP plus half Jumping MP rounded up (printed p. 316), entries 0 to 25; beyond that the book gives the formula. */
export const SPEED_FACTOR: Sourced & { table: number[]; exponent: number } = {
  cite: { book: TM, page: 316 },
  checked: "page",
  table: [0.44, 0.54, 0.65, 0.77, 0.88, 1.0, 1.12, 1.24, 1.37, 1.5, 1.63, 1.76, 1.89, 2.02, 2.16, 2.3, 2.44, 2.58, 2.72, 2.86, 3.0, 3.15, 3.29, 3.44, 3.59, 3.74],
  exponent: 1.2,
};

/** Skill multiplier (printed p. 315): rows are Gunnery 0 to 8, columns Piloting 0 to 8. */
export const SKILL_MULTIPLIER: Sourced & { rows: number[][] } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  rows: [
    [2.42, 2.31, 2.21, 2.1, 1.93, 1.75, 1.68, 1.59, 1.5],
    [2.21, 2.11, 2.02, 1.92, 1.76, 1.6, 1.54, 1.46, 1.38],
    [1.93, 1.85, 1.76, 1.68, 1.54, 1.4, 1.35, 1.28, 1.21],
    [1.66, 1.58, 1.51, 1.44, 1.32, 1.2, 1.16, 1.1, 1.04],
    [1.38, 1.32, 1.26, 1.2, 1.1, 1.0, 0.95, 0.9, 0.85],
    [1.31, 1.19, 1.13, 1.08, 0.99, 0.9, 0.86, 0.81, 0.77],
    [1.24, 1.12, 1.07, 1.02, 0.94, 0.85, 0.81, 0.77, 0.72],
    [1.17, 1.06, 1.01, 0.96, 0.88, 0.8, 0.76, 0.72, 0.68],
    [1.1, 0.99, 0.95, 0.9, 0.83, 0.75, 0.71, 0.68, 0.64],
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Land-Air 'Mechs (Interstellar Operations: Alternate Eras p. 186; AirMech movement p. 102).
// ---------------------------------------------------------------------------------------------------------------
export const LAM_BV: Sourced & { cruisePerJumpMP: number; flankFactor: number; airborneModifier: number; fuelSlotIds: string[] } = {
  cite: { book: IO, page: 186 },
  checked: "page",
  cruisePerJumpMP: 3,
  flankFactor: 1.5,
  airborneModifier: 1,
  // Each slot of these is counted as a slot of explosive ammunition. "LAM Fuel" (extra fuel tons) is fuel, which the rule names.
  fuelSlotIds: ["lam-fuel-is", "lam-fuel-tanks-is", "lam-bomb-bay-is"],
};

// ---------------------------------------------------------------------------------------------------------------
// Rows that change how a mount is treated rather than what it is worth.
// ---------------------------------------------------------------------------------------------------------------
/** CASE rows and what each leaves of the 15-point penalty on an ammunition slot in its location (prototype CASE: 8, IO:AE p. 183). */
export const CASE_ROWS: Record<string, number> = { "case-is": 0, "case-clan": 0, "prototype-case-is": 8 };
/** The targeting computers, and the multiplier a prototype Artemis puts on its launcher in place of 1.2. */
export const TARGETING_COMPUTER_IDS = ["targeting-computer-is", "targeting-computer-clan"];
export const ARTEMIS_IDS: Record<string, number> = { "artemis-iv-is": 1.2, "artemis-iv-clan": 1.2, "prototype-artemis-iv-is": 1.1 };
export const MACHINE_GUN_ARRAY_IDS = ["machine-gun-array-is", "machine-gun-array-clan"];
export const TSM_IDS = ["tsm-is", "prototype-triple-strength-myomer-is"];
export const MASC_IDS = ["masc-is", "masc-clan"];
export const IMPROVED_JUMP_JET_IDS = ["improved-jump-jet-is", "improved-jump-jet-clan"];
/** Rows that add to Heat Efficiency (RISC emergency coolant system: +4, IO:AE p. 190). */
export const HEAT_EFFICIENCY_BONUS: Record<string, number> = { "risc-emergency-coolant-system-is": 4 };
/** Physical weapons: BV is the weapon's damage times the factor (the table's footnote ** says damage after TSM). Damage by 'Mech tonnage: Total Warfare p. 146, TechManual pp. 220, 236, 237. */
export const PHYSICAL_BV: Sourced & { rows: Record<string, { factor: number; damage: "hatchet" | "sword" | "blade" }> } = {
  cite: { book: TM, page: 317 },
  checked: "page",
  rows: {
    "hatchet-is": { factor: 1.5, damage: "hatchet" },
    "sword-is": { factor: 1.725, damage: "sword" },
    "retractable-blade-is": { factor: 1.725, damage: "blade" },
    "retractable-blade-clan": { factor: 1.725, damage: "blade" },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Equipment BV. A weapon row: [catalog id, item BV, ammunition BV per ton (omit for none), options]. Its ammunition rows
// default to `ammo-<id>`; `ammo` lists them where the name differs. `heat` is a multiplier family or a heat figure that
// replaces the catalog's; `inert` is the table's section mark: the ammunition is not counted as explosive; `gauss` counts
// the item as a Gauss weapon for the Defensive Battle Rating; `defensive` is the table's dagger.
// ---------------------------------------------------------------------------------------------------------------
export interface BvOptions {
  ammo?: string[];
  heat?: keyof typeof HEAT_MULTIPLIER | number;
  inert?: true;
  gauss?: true;
  defensive?: true;
  /** The ammunition's BV is defensive too (the anti-missile system's), counted up to the BV of the systems themselves. */
  defensiveAmmo?: true;
  /** The item has no BV of its own but works on others (CASE, MASC, TAG, ...); listed so it is not reported as unvalued. */
  none?: true;
}
export type BvRow = [id: string, bv: number, ammoBv?: number, options?: BvOptions];
export interface BvGroup extends Sourced {
  rows: BvRow[];
}

const G = { gauss: true, inert: true } as const;

export const WEAPON_BV: BvGroup[] = [
  {
    cite: { book: TM, page: 317 },
    checked: "page",
    rows: [
      // Inner Sphere energy
      ["er-large-laser-is", 163], ["er-medium-laser-is", 62], ["er-small-laser-is", 17], ["flamer-is", 6], ["large-laser-is", 123],
      ["medium-laser-is", 46], ["small-laser-is", 9], ["heavy-ppc-is", 317], ["ppc-is", 176], ["light-ppc-is", 88],
      ["snub-nose-ppc-is", 165], ["er-ppc-is", 229], ["plasma-rifle-is", 210, 26, { inert: true }],
      ["large-pulse-laser-is", 119], ["medium-pulse-laser-is", 48], ["small-pulse-laser-is", 12],
      // Inner Sphere ballistic
      ["ac-2-is", 37, 5], ["ac-5-is", 70, 9], ["ac-10-is", 123, 15], ["ac-20-is", 178, 22],
      ["vehicle-flamer-is", 5, 1],
      ["heavy-gauss-rifle-is", 346, 43, G], ["gauss-rifle-is", 320, 40, G], ["light-gauss-rifle-is", 159, 20, G], ["magshot-is", 15, 0, { gauss: true }],
      ["lb-2-x-ac-is", 42, 5, { ammo: ["ammo-lb-2-x-is", "ammo-lb-2-x-cluster-is"] }],
      ["lb-5-x-ac-is", 83, 10, { ammo: ["ammo-lb-5-x-is", "ammo-lb-5-x-cluster-is"] }],
      ["lb-10-x-ac-is", 148, 19, { ammo: ["ammo-lb-10-x-is", "ammo-lb-10-x-cluster-is"] }],
      ["lb-20-x-ac-is", 237, 30, { ammo: ["ammo-lb-20-x-is", "ammo-lb-20-x-cluster-is"] }],
      ["light-ac-2-is", 30, 4], ["light-ac-5-is", 62, 8],
      ["heavy-machine-gun-is", 6, 1, { ammo: ["ammo-heavy-machine-gun-is", "ammo-heavy-machine-gun-half-is"] }],
      ["machine-gun-is", 5, 1, { ammo: ["ammo-machine-gun-is", "ammo-machine-gun-half-is"] }],
      ["light-machine-gun-is", 5, 1, { ammo: ["ammo-light-machine-gun-is", "ammo-light-machine-gun-half-is"] }],
      ["nail-rivet-gun-is", 1, 0, { inert: true, ammo: ["ammo-nail-rivet-gun-is", "ammo-nail-rivet-gun-half-is"] }],
      ["rotary-ac-2-is", 118, 15, { heat: "rotary" }], ["rotary-ac-5-is", 247, 31, { heat: "rotary" }],
      ["ultra-ac-2-is", 56, 7, { heat: "ultra" }], ["ultra-ac-5-is", 112, 14, { heat: "ultra" }],
      ["ultra-ac-10-is", 210, 26, { heat: "ultra" }], ["ultra-ac-20-is", 281, 35, { heat: "ultra" }],
      // Inner Sphere missiles (the item BV before the slash; the single-shot figure after it is not needed)
      ["lrm-5-is", 45, 6], ["lrm-10-is", 90, 11], ["lrm-15-is", 136, 17], ["lrm-20-is", 181, 23],
      ["mml-3-is", 29, 4, { ammo: ["ammo-mml-3-lrm-is", "ammo-mml-3-srm-is"] }], ["mml-5-is", 45, 6, { ammo: ["ammo-mml-5-lrm-is", "ammo-mml-5-srm-is"] }],
      ["mml-7-is", 67, 8, { ammo: ["ammo-mml-7-lrm-is", "ammo-mml-7-srm-is"] }], ["mml-9-is", 86, 11, { ammo: ["ammo-mml-9-lrm-is", "ammo-mml-9-srm-is"] }],
      ["mrm-10-is", 56, 7], ["mrm-20-is", 112, 14], ["mrm-30-is", 168, 21], ["mrm-40-is", 224, 28],
      ["rocket-launcher-10-is", 18], ["rocket-launcher-15-is", 23], ["rocket-launcher-20-is", 24],
      ["srm-2-is", 21, 3], ["srm-4-is", 39, 5], ["srm-6-is", 59, 7],
      ["streak-srm-2-is", 30, 4, { heat: "streak" }], ["streak-srm-4-is", 59, 7, { heat: "streak" }], ["streak-srm-6-is", 89, 11, { heat: "streak" }],
      // Clan energy
      ["er-large-laser-clan", 248], ["er-medium-laser-clan", 108], ["er-small-laser-clan", 31], ["er-micro-laser-clan", 7], ["flamer-clan", 6],
      ["heavy-large-laser-clan", 244], ["heavy-medium-laser-clan", 76], ["heavy-small-laser-clan", 15], ["er-ppc-clan", 412],
      ["plasma-cannon-clan", 170, 21, { inert: true }], ["large-pulse-laser-clan", 265], ["medium-pulse-laser-clan", 111],
      ["small-pulse-laser-clan", 24], ["micro-pulse-laser-clan", 12],
      // Clan ballistic
      ["vehicle-flamer-clan", 5, 1], ["ap-gauss-rifle-clan", 21, 3, G], ["gauss-rifle-clan", 320, 40, G],
      ["hyper-assault-gauss-20-clan", 267, 33, G], ["hyper-assault-gauss-30-clan", 401, 50, G], ["hyper-assault-gauss-40-clan", 535, 67, G],
      ["lb-2-x-ac-clan", 47, 6, { ammo: ["ammo-lb-2-x-clan", "ammo-lb-2-x-cluster-clan"] }],
      ["lb-5-x-ac-clan", 93, 12, { ammo: ["ammo-lb-5-x-clan", "ammo-lb-5-x-cluster-clan"] }],
      ["lb-10-x-ac-clan", 148, 19, { ammo: ["ammo-lb-10-x-clan", "ammo-lb-10-x-cluster-clan"] }],
      ["lb-20-x-ac-clan", 237, 30, { ammo: ["ammo-lb-20-x-clan", "ammo-lb-20-x-cluster-clan"] }],
      ["heavy-machine-gun-clan", 6, 1, { ammo: ["ammo-heavy-machine-gun-clan", "ammo-heavy-machine-gun-half-clan"] }],
      ["machine-gun-clan", 5, 1, { ammo: ["ammo-machine-gun-clan", "ammo-machine-gun-half-clan"] }],
      ["light-machine-gun-clan", 5, 1, { ammo: ["ammo-light-machine-gun-clan", "ammo-light-machine-gun-half-clan"] }],
      ["nail-rivet-gun-clan", 1, 0, { inert: true, ammo: ["ammo-nail-rivet-gun-clan", "ammo-nail-rivet-gun-half-clan"] }],
      ["ultra-ac-2-clan", 62, 8, { heat: "ultra" }], ["ultra-ac-5-clan", 122, 15, { heat: "ultra" }],
      ["ultra-ac-10-clan", 210, 26, { heat: "ultra" }], ["ultra-ac-20-clan", 335, 42, { heat: "ultra" }],
      // Clan missiles
      ["atm-3-clan", 53, 14], ["atm-6-clan", 105, 26], ["atm-9-clan", 147, 36], ["atm-12-clan", 212, 52],
      ["lrm-5-clan", 55, 7], ["lrm-10-clan", 109, 14], ["lrm-15-clan", 164, 21], ["lrm-20-clan", 220, 27],
      ["srm-2-clan", 21, 3], ["srm-4-clan", 39, 5], ["srm-6-clan", 59, 7],
      ["streak-srm-2-clan", 40, 5, { heat: "streak" }], ["streak-srm-4-clan", 79, 10, { heat: "streak" }], ["streak-srm-6-clan", 118, 15, { heat: "streak" }],
    ],
  },
  {
    // Interstellar Operations: Alternate Eras, Alternate Era Weapons and Equipment Battle Value Table, printed pp. 189-191.
    cite: { book: IO, page: 189 },
    checked: "page",
    rows: [
      ["primitive-prototype-ac-2-is", 37, 4], ["primitive-prototype-ac-5-is", 70, 7], ["primitive-prototype-ac-10-is", 123, 12], ["primitive-prototype-ac-20-is", 178, 17],
      ["primitive-prototype-small-laser-is", 9], ["primitive-prototype-medium-laser-is", 46], ["primitive-prototype-large-laser-is", 123],
      ["primitive-prototype-lrm-5-is", 38, 4], ["primitive-prototype-lrm-10-is", 78, 8], ["primitive-prototype-lrm-15-is", 132, 13], ["primitive-prototype-lrm-20-is", 168, 16],
      ["primitive-prototype-srm-2-is", 10, 1], ["primitive-prototype-srm-4-is", 21, 3], ["primitive-prototype-srm-6-is", 41, 4],
      ["primitive-prototype-ppc-is", 176], ["prototype-arrow-iv-is", 240, 30],
      ["prototype-gauss-rifle-is", 320, 40, G], ["prototype-gauss-rifle-lsw-is", 320, 40, { ...G, ammo: [] }],
      ["prototype-lb-10-x-ac-is", 148, 15], ["prototype-lb-10-x-ac-lsw-is", 148, 15, { ammo: [] }],
      ["prototype-narc-missile-beacon-is", 15, 0],
      ["prototype-small-pulse-laser-is", 11, undefined, { heat: 4 }], ["prototype-medium-pulse-laser-is", 43, undefined, { heat: 7 }],
      ["prototype-large-pulse-laser-is", 108, undefined, { heat: 13 }],
      ["prototype-rocket-launcher-10-is", 15], ["prototype-rocket-launcher-15-is", 18], ["prototype-rocket-launcher-20-is", 19],
      ["prototype-rocket-launcher-10-clan", 15], ["prototype-rocket-launcher-15-clan", 18], ["prototype-rocket-launcher-20-clan", 19],
      ["centurion-weapon-system-is", 190],
      ["improved-ac-2-clan", 37, 5], ["improved-ac-5-clan", 70, 9], ["improved-ac-10-clan", 123, 15], ["improved-ac-20-clan", 178, 22],
      ["improved-gauss-rifle-clan", 320, 40, { inert: true, gauss: true }],
      ["improved-large-laser-clan", 123], ["improved-large-pulse-laser-clan", 119], ["improved-ppc-clan", 176], ["enhanced-ppc-clan", 329],
      ["improved-lrm-5-clan", 45, 6], ["improved-lrm-10-clan", 90, 11], ["improved-lrm-15-clan", 136, 17], ["improved-lrm-20-clan", 181, 23],
      ["improved-srm-2-clan", 28, 4], ["improved-srm-4-clan", 52, 7], ["improved-srm-6-clan", 79, 10],
      ["prototype-er-small-laser-clan", 17], ["prototype-er-medium-laser-clan", 62],
      ["prototype-lb-2-x-ac-clan", 42, 5], ["prototype-lb-5-x-ac-clan", 83, 10], ["prototype-lb-20-x-ac-clan", 237, 30],
      ["prototype-streak-srm-4-clan", 59, 7, { heat: "streak" }], ["prototype-streak-srm-6-clan", 89, 11, { heat: "streak" }],
      ["prototype-ultra-ac-2-clan", 56, 7, { heat: "ultra" }], ["prototype-ultra-ac-10-clan", 210, 26, { heat: "ultra" }], ["prototype-ultra-ac-20-clan", 281, 35, { heat: "ultra" }],
      ["prototype-ultra-ac-5-is", 112, 14, { heat: "ultra" }],
      ["prototype-er-large-laser-is", 136, undefined, { heat: 13 }],
      ["improved-atm-3-clan", 83, 21], ["improved-atm-6-clan", 164, 39], ["improved-atm-9-clan", 231, 54], ["improved-atm-12-clan", 333, 78],
      ["small-re-engineered-laser-is", 14], ["medium-re-engineered-laser-is", 65], ["large-re-engineered-laser-is", 161],
      ["tsemp-cannon-is", 488, undefined, { gauss: true }], ["tsemp-one-shot-is", 98, undefined, { gauss: true, heat: "oneShot" }],
      ["risc-hyper-laser-is", 596, undefined, { gauss: true }], ["risc-repeating-tsemp-cannon-is", 600, undefined, { gauss: true }],
    ],
  },
];

/** "Other Equipment" and the physical and industrial items: BV added in full, never sorted by heat. */
export const EQUIPMENT_BV: BvGroup[] = [
  {
    cite: { book: TM, page: 317 },
    checked: "page",
    rows: [
      ["ams-is", 32, 11, { defensive: true, defensiveAmmo: true }], ["ams-clan", 32, 22, { defensive: true, defensiveAmmo: true }],
      ["a-pods-is", 1, undefined, { defensive: true }], ["a-pods-clan", 1, undefined, { defensive: true }],
      ["b-pods-is", 2, undefined, { defensive: true, gauss: true }], ["b-pods-clan", 2, undefined, { defensive: true, gauss: true }],
      ["beagle-active-probe-is", 10, undefined, { defensive: true }], ["guardian-ecm-suite-is", 61, undefined, { defensive: true }],
      ["active-probe-clan", 12, undefined, { defensive: true }], ["light-active-probe-clan", 7, undefined, { defensive: true }],
      ["ecm-suite-clan", 61, undefined, { defensive: true }],
      ["bridgelayer-light-is", 5, undefined, { defensive: true }], ["bridgelayer-medium-is", 10, undefined, { defensive: true }], ["bridgelayer-heavy-is", 20, undefined, { defensive: true }],
      ["bridgelayer-light-clan", 5, undefined, { defensive: true }], ["bridgelayer-medium-clan", 10, undefined, { defensive: true }], ["bridgelayer-heavy-clan", 20, undefined, { defensive: true }],
      ["narc-missile-beacon-is", 30, 0], ["narc-missile-beacon-clan", 30, 0], ["improved-narc-launcher-is", 75, 0],
      ["backhoe-is", 8], ["chainsaw-is", 7], ["combine-is", 5], ["dual-saw-is", 9], ["heavy-duty-pile-driver-is", 5], ["mining-drill-is", 6],
      ["rock-cutter-is", 6], ["spot-welder-is", 5], ["wrecking-ball-is", 8],
      ["backhoe-clan", 8], ["chainsaw-clan", 7], ["combine-clan", 5], ["dual-saw-clan", 9], ["heavy-duty-pile-driver-clan", 5], ["mining-drill-clan", 6],
      ["rock-cutter-clan", 6], ["spot-welder-clan", 5], ["wrecking-ball-clan", 8],
      // The table prints no BV for these: they change the BV of other things (notes A to C, E, F) or the unit's ratings.
      ["case-is", 0, undefined, { none: true }], ["case-clan", 0, undefined, { none: true }], ["masc-is", 0, undefined, { none: true }], ["masc-clan", 0, undefined, { none: true }],
      ["tsm-is", 0, undefined, { none: true }], ["c3-computer-master-is", 0, undefined, { none: true }], ["c3-computer-slave-is", 0, undefined, { none: true }],
      ["improved-c3-computer-is", 0, undefined, { none: true }], ["tag-is", 0, undefined, { none: true }], ["tag-clan", 0, undefined, { none: true }],
      ["light-tag-clan", 0, undefined, { none: true }], ["artemis-iv-is", 0, undefined, { none: true }], ["artemis-iv-clan", 0, undefined, { none: true }],
      ["targeting-computer-is", 0, undefined, { none: true }], ["targeting-computer-clan", 0, undefined, { none: true }],
      ["machine-gun-array-is", 0, undefined, { none: true }], ["machine-gun-array-clan", 0, undefined, { none: true }],
    ],
  },
  {
    cite: { book: IO, page: 189 },
    checked: "page",
    rows: [
      ["prototype-beagle-active-probe-is", 10, undefined, { defensive: true }], ["prototype-guardian-ecm-suite-is", 61, undefined, { defensive: true }],
      ["prototype-remote-sensors-is", 0, 0], ["prototype-tag-is", 0],
      ["prototype-case-is", 0, undefined, { none: true }], ["prototype-artemis-iv-is", 0, undefined, { none: true }],
      ["prototype-triple-strength-myomer-is", 0, undefined, { none: true }],
      ["nova-cews-clan", 68, undefined, { defensive: true }],
      ["risc-advanced-pds-is", 64, 22, { defensive: true, defensiveAmmo: true }],
      ["risc-viral-jammer-decoy-is", 284, undefined, { defensive: true }], ["risc-viral-jammer-homing-is", 284, undefined, { defensive: true }],
      ["risc-emergency-coolant-system-is", 0, undefined, { none: true }],
    ],
  },
];
