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
const TO = "Tactical Operations: Advanced Units and Equipment";

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
  machineGunArray: number;
  baseHeatEfficiency: number;
  lamHeatEfficiency: number;
  runningHeat: number;
  jumpHeatMinimum: number;
  stealthHeat: number;
  stealthTargetModifier: number;
  tsmWalkBonus: number;
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
  // Each linked weapon x1.25. Table note E (TechManual p. 317) gives the computer "25 percent of the BV of the weapons it links":
  // the same 25 percent, not a second one. The v4.1 Thunderbolt example (p. 304) counts it once and comes to 2,008.
  targetingComputer: 1.25,
  // Table note F, TechManual p. 317; errata v8.0 copies the Inner Sphere entry and its note to the Clan table.
  machineGunArray: 0.67,
  baseHeatEfficiency: 6,
  lamHeatEfficiency: 9, // Interstellar Operations: Alternate Eras p. 186
  runningHeat: 2, // Total Warfare p. 53
  jumpHeatMinimum: 3, // Total Warfare p. 53
  stealthHeat: 10,
  stealthTargetModifier: 2, // the long-range modifier (Total Warfare p. 142: +1 medium, +2 long); the book's "maximum effect"
  // "The maximum MP it can legally generate": TSM's +2 Walking MP comes at 9 heat (Total Warfare p. 143), where the heat scale
  // takes 1 (p. 159), so +1.
  tsmWalkBonus: 1,
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
  // The table's Standard row "includes ICE, Fuel Cell, and Fission" (a footnote on the same page), so they take 1.0.
  values: { standard: 1.0, light: 0.75, compact: 1.0, xl: 0.5, "xl-clan": 0.75, ice: 1.0, "fuel-cell": 1.0, fission: 1.0 },
};
export const GYRO_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  values: { standard: 0.5, compact: 0.5, xl: 0.5, "heavy-duty": 1.0 },
};

/**
 * The newer armor, internal structure and engine types' modifiers: Tactical Operations: Advanced Units and Equipment, Armor Type
 * Modifier Table (printed p.192), 'Mech Internal Structure Modifier Table [Addendum] (p.194) and 'Mech Engine Type Modifier Table
 * [Addendum] (p.193), and Interstellar Operations: Alternate Eras, Dark Age Armor Modifiers Table (p.185); all read against the page
 * image. Keys are the chassis table's keys. A row with `likeThe` has no figure of its own in any table: the book says the part
 * works as the named one (or, for the primitive armor, the primitive unit's BV is worked "normally" with a Barrier Armor Rating
 * of 10), so it takes that part's figure; that is our reading, not a printed value.
 */
export interface ModifierRow {
  value: number;
  cite: BvCite;
  checked: Checked;
  likeThe?: string;
}
const TO_ARMOR_MODIFIERS: BvCite = { book: TO, page: 192 };
const IO_ARMOR_MODIFIERS: BvCite = { book: IO, page: 185 };
const TO_STRUCTURE_MODIFIERS: BvCite = { book: TO, page: 194 };
const TO_ENGINE_MODIFIERS: BvCite = { book: TO, page: 193 };
const row = (value: number, cite: BvCite, likeThe?: string): ModifierRow => ({ value, cite, checked: likeThe === undefined ? "page" : "text", ...(likeThe === undefined ? {} : { likeThe }) });
export const ADVANCED_BV_MODIFIERS: { armor: Record<string, ModifierRow>; structure: Record<string, ModifierRow>; engine: Record<string, ModifierRow> } = {
  armor: {
    hardened: row(2.0, TO_ARMOR_MODIFIERS),
    "ferro-lamellor": row(1.2, TO_ARMOR_MODIFIERS),
    "laser-reflective": row(1.5, TO_ARMOR_MODIFIERS),
    "laser-reflective-clan": row(1.5, TO_ARMOR_MODIFIERS),
    reactive: row(1.5, TO_ARMOR_MODIFIERS),
    "reactive-clan": row(1.5, TO_ARMOR_MODIFIERS),
    "anti-penetrative-ablation": row(1.2, IO_ARMOR_MODIFIERS),
    "heat-dissipating": row(1.05, IO_ARMOR_MODIFIERS),
    "impact-resistant": row(1.0, IO_ARMOR_MODIFIERS),
    "ballistic-reinforced": row(1.2, IO_ARMOR_MODIFIERS),
    "prototype-ferro-fibrous": row(1.0, TO_ARMOR_MODIFIERS, "ferro-fibrous (all)"),
    primitive: row(1.0, { book: IO, page: 187 }, "standard armor (Barrier Armor Rating 10)"),
  },
  structure: {
    composite: row(0.5, TO_STRUCTURE_MODIFIERS),
    "endo-composite": row(1.0, TO_STRUCTURE_MODIFIERS),
    "endo-composite-clan": row(1.0, TO_STRUCTURE_MODIFIERS),
    reinforced: row(2.0, TO_STRUCTURE_MODIFIERS),
    "prototype-endo-steel": row(1.0, TO_STRUCTURE_MODIFIERS, "endo steel"),
  },
  engine: {
    xxl: row(0.25, TO_ENGINE_MODIFIERS),
    "xxl-clan": row(0.5, TO_ENGINE_MODIFIERS),
    "prototype-xl": row(0.5, { book: TM, page: 315 }, "Inner Sphere XL"),
  },
};

/** A torso-mounted cockpit doubles the center torso armor (front and rear together) before the armor modifier, and the finished BV takes 0.95 (TO:AUE printed p.193). */
export const TORSO_COCKPIT_BV: Sourced & { cockpit: string; armorFactor: number; finalFactor: number } = {
  cite: { book: TO, page: 193 },
  checked: "page",
  cockpit: "torso-mounted",
  armorFactor: 2,
  finalFactor: 0.95,
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
// Artemis V (+30 percent) and Apollo (+15 percent, MRM launchers): TO:AUE pp. 195, 197.
export const ARTEMIS_IDS: Record<string, number> = { "artemis-iv-is": 1.2, "artemis-iv-clan": 1.2, "prototype-artemis-iv-is": 1.1, "artemis-v-clan": 1.3, "mrm-apollo-fcs-is": 1.15 };
/** PPC capacitors (TO:AUE pp. 194, 222): the BV of the PPC and its capacitor together replaces the PPC's, and the capacitor adds
 * 5 to its heat. The pair rows carry the double dagger (treat as a Gauss weapon for the Defensive Battle Rating), so every slot
 * of the pair costs 1 point where it is exposed. */
export const CAPACITOR: Sourced & { ids: string[]; heat: number; bv: Record<string, number> } = {
  cite: { book: TO, page: 194 },
  checked: "page",
  ids: ["ppc-capacitor-is"],
  heat: 5,
  bv: { "heavy-ppc-is": 370, "ppc-is": 264, "light-ppc-is": 132, "snub-nose-ppc-is": 252, "er-ppc-is": 343 },
};
/** Items the TO:AUE addendum gives no BV, whose rules do something else (p. 194): a laser insulator takes 1 off its laser's heat; coolant pods add to heat sink capacity and cost 1 defensive point a slot. */
export const LASER_INSULATOR_IDS = ["laser-insulator-is", "laser-insulator-clan"];
export const COOLANT_POD_IDS = ["coolant-pod-is", "coolant-pod-clan"];
/** Rows whose BV the books make depend on something the row does not say. */
export const UNFIXED: Record<string, string> = {
  // Interstellar Operations: Alternate Eras items whose BV-table entries (p.189-190) have not been read for them yet
  "radical-heat-sink-is": "its entry in the IO:AE BV table (p.190) was not read for this item yet",
  "super-cooled-myomer-is": "its entry in the IO:AE BV table (p.190) was not read for this item yet",
  "risc-heat-sink-override-kit-is": "its entry in the IO:AE BV table (p.190) was not read for this item yet",
  "risc-laser-pulse-module-is": "its entry in the IO:AE BV table (p.190) was not read for this item yet",
  "remote-drone-command-console-is": "its entry in the IO:AE BV table (p.190) was not read for this item yet",
  // Items whose BV is a modifier or a figure that depends on the unit, which the BV rules here do not compute (TO:AUE pp.192-197).
  "aes-arm-is": "it multiplies the BV of the weapons linked to it by 1.25 (TO:AUE p.195, note G)",
  "aes-arm-clan": "it multiplies the BV of the weapons linked to it by 1.25 (TO:AUE p.195, note G)",
  "aes-leg-is": "it multiplies the BV of the weapons linked to it by 1.25 (TO:AUE p.195, note G)",
  "aes-leg-clan": "it multiplies the BV of the weapons linked to it by 1.25 (TO:AUE p.195, note G)",
  "blue-shield-is": "it adds 0.2 to the armor type modifier and counts as a Gauss weapon for the defensive rating (TO:AUE pp.192, 194)",
  "claws-is": "its BV is its damage, which depends on the 'Mech and its myomer, times 1.275 (TO:AUE p.195)",
  "lance-is": "its BV is its damage, which depends on the 'Mech, times 1 (TO:AUE p.195)",
  "mace-is": "its BV is its damage, which depends on the 'Mech, times 1 (TO:AUE p.195)",
  "talons-clan": "its BV is the kick damage, which depends on the 'Mech and its myomer, times 1 (TO:AUE p.197)",
  "chameleon-lps-is": "it adds the long-range to-hit modifier to the defensive factor (TO:AUE p.193)",
  "null-signature-system-is": "it adds the long-range to-hit modifier to the defensive factor (TO:AUE p.194)",
  "void-signature-system-is": "it sets the defensive target modifier to at least +3 (TO:AUE p.194)",
  "partial-wing-is": "it adds Jumping MP by atmosphere and weight class, which the speed factor does not take yet (TO:AUE p.192)",
  "partial-wing-clan": "it adds Jumping MP by atmosphere and weight class, which the speed factor does not take yet (TO:AUE p.192)",
  "umu-is": "UMU movement is counted as Cruising MP when submerged, not computed here (TO:AUE p.192)",
  "umu-clan": "UMU movement is counted as Cruising MP when submerged, not computed here (TO:AUE p.192)",
  "mechanical-jump-booster-is": "it adds Jumping MP chosen by the designer, which the record does not hold (TO:AUE p.192)",
  "jump-pack-is": "it adds Jumping MP from the pack weight and the unit weight, not computed here (TO:AUE p.192)",
  "jump-pack-clan": "it adds Jumping MP from the pack weight and the unit weight, not computed here (TO:AUE p.192)",
  "vehicular-mine-dispenser-is": "its BV is that of a 10-point minefield of the mine it carries, which the row does not fix (TO:AUE p. 195)",
  "vehicular-mine-dispenser-clan": "its BV is that of a 10-point minefield of the mine it carries, which the row does not fix (TO:AUE p. 195)",
};
/** Special munitions: one catalog row per munition and launcher family (the `-is`/`-clan` stem here), not per launcher size.
 * Their BV is the base ammunition BV of the launcher that fires them, with the Alternative Munitions Table's modifier for some
 * (TO:AUE printed p. 198), so they are not "equipment in none of the tables" (0); the row does not say which launcher, so they
 * are reported as unvalued. */
export const SPECIAL_MUNITIONS: Sourced & { stems: string[]; why: string } = {
  cite: { book: TO, page: 198 },
  checked: "page",
  stems: [
    "ammo-armor-piercing", "ammo-flechette", "ammo-precision", "ammo-artemis-capable", "ammo-narc-capable", "ammo-fragmentation",
    "ammo-harpoon", "ammo-inferno", "ammo-tear-gas", "ammo-semi-guided", "ammo-swarm", "ammo-swarm-i", "ammo-thunder",
    "ammo-thunder-augmented", "ammo-thunder-inferno", "ammo-thunder-vibrabomb", "ammo-thunder-active", "ammo-narc-explosive",
    "ammo-improved-narc-ecm", "ammo-improved-narc-explosive", "ammo-improved-narc-haywire", "ammo-improved-narc-nemesis",
    "ammo-er-atm", "ammo-he-atm",
  ],
  why: "a special munition: its BV is its launcher's ammunition BV (TO:AUE p. 198), and the row does not say which launcher",
};
/** Equipment introduced in TechManual or in Tactical Operations: Advanced Units and Equipment that is in none of their BV tables counts as 0 (TO:AUE printed p. 192). */
export const UNLISTED_IS_ZERO: Sourced & { books: string[] } = { cite: { book: TO, page: 192 }, checked: "page", books: [TM, TO] };
export const MACHINE_GUN_ARRAY_IDS = ["machine-gun-array-is", "machine-gun-array-clan"];
export const IMPROVED_JUMP_JET_IDS = ["improved-jump-jet-is", "improved-jump-jet-clan"];
/** Rows that add to Heat Efficiency (RISC emergency coolant system: +4, IO:AE p. 190). */
export const HEAT_EFFICIENCY_BONUS: Record<string, number> = { "risc-emergency-coolant-system-is": 4 };
/** Physical weapons: BV is the weapon's damage times the factor (the table's footnote ** says damage after TSM). Damage by 'Mech tonnage: Total Warfare p. 146, TechManual pp. 220, 236, 237. */
export const PHYSICAL_BV: Sourced & { rows: Record<string, { factor: number; damage: "hatchet" | "sword" | "blade" | number; fixed?: true }> } = {
  cite: { book: TM, page: 317 },
  checked: "page",
  rows: {
    "hatchet-is": { factor: 1.5, damage: "hatchet" },
    "sword-is": { factor: 1.725, damage: "sword" },
    "retractable-blade-is": { factor: 1.725, damage: "blade" },
    "retractable-blade-clan": { factor: 1.725, damage: "blade" },
    // The chain whip's damage (3) is not changed by TSM or the wielder's weight (TO:AUE p. 101); BV factor TO:AUE p. 195.
    "chain-whip-is": { factor: 1.725, damage: 3, fixed: true },
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
  /** Counts as a Gauss weapon of this many critical slots, not its own (the hyper-velocity ACs, table note Q). */
  gaussSlots?: number;
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
      ["heavy-gauss-rifle-is", 346, 43, G], ["gauss-rifle-is", 320, 40, G], ["light-gauss-rifle-is", 159, 20, G], 
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
      ["prototype-small-pulse-laser-is", 11, undefined, { heat: 4 }], ["prototype-medium-pulse-laser-is", 43, undefined, { heat: 7 }], ["prototype-medium-pulse-laser-lsw-is", 43, undefined, { heat: 7 }],
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
  {
    // Tactical Operations: Advanced Units and Equipment, Inner Sphere Weapons and Equipment BV Table [Addendum], printed pp. 194-195.
    // A cannon is the Artillery Cannon row; the artillery piece is the Artillery Weapons row. HV AC (table note Q) counts as a Gauss
    // weapon of one slot. The Light, Medium and Large rifles are the catalog's light, medium and heavy rifles. The table gives the
    // Bombast laser's BV only; its heat is the largest damage it can be dialled to (12, p. 132).
    cite: { book: TO, page: 194 },
    checked: "page",
    rows: [
      ["er-flamer-is", 16], ["binary-laser-is", 222], ["bombast-laser-is", 137, undefined, { heat: 12 }],
      ["variable-speed-laser-large-is", 123], ["variable-speed-laser-medium-is", 56], ["variable-speed-laser-small-is", 22],
      ["x-pulse-laser-small-is", 21], ["x-pulse-laser-medium-is", 71], ["x-pulse-laser-large-is", 178],
      ["hyper-velocity-ac-2-is", 53, 7, { gaussSlots: 1 }], ["hyper-velocity-ac-5-is", 109, 14, { gaussSlots: 1 }], ["hyper-velocity-ac-10-is", 158, 20, { gaussSlots: 1 }],
      ["fluid-gun-is", 6, 1], ["heavy-flamer-is", 15, 2], ["improved-heavy-gauss-is", 385, 48, { gauss: true }], ["magshot-is", 15, 2, { gauss: true }],
      ["silver-bullet-gauss-is", 198, 25, { gauss: true }],
      ["mech-mortar-1-is", 10, 1], ["mech-mortar-2-is", 14, 2], ["mech-mortar-4-is", 26, 3], ["mech-mortar-8-is", 50, 6],
      ["light-rifle-is", 21, 3], ["medium-rifle-is", 51, 6], ["heavy-rifle-is", 91, 11],
      ["vehicular-grenade-launcher-is", 15], ["taser-is", 40, 5, { gauss: true }],
      ["long-tom-cannon-is", 329, 41], ["sniper-cannon-is", 77, 10], ["thumper-cannon-is", 41, 5],
      ["enhanced-lrm-5-is", 52, 7], ["enhanced-lrm-10-is", 104, 13], ["enhanced-lrm-15-is", 157, 20], ["enhanced-lrm-20-is", 210, 26],
      ["extended-lrm-5-is", 67, 8], ["extended-lrm-10-is", 133, 17], ["extended-lrm-15-is", 200, 25], ["extended-lrm-20-is", 268, 34],
      ["thunderbolt-5-is", 64, 8], ["thunderbolt-10-is", 127, 16], ["thunderbolt-15-is", 229, 29], ["thunderbolt-20-is", 305, 38],
      ["arrow-iv-is", 240, 30], ["sniper-artillery-is", 85, 11], ["thumper-artillery-is", 43, 5],
    ],
  },
  {
    // Clan Weapons and Equipment BV Table [Addendum], printed pp. 196-197. The improved heavy lasers carry the table's double dagger (Gauss weapon).
    cite: { book: TO, page: 196 },
    checked: "page",
    rows: [
      ["er-flamer-clan", 16], ["chemical-laser-small-clan", 7, 1], ["chemical-laser-medium-clan", 37, 5], ["chemical-laser-large-clan", 99, 12],
      ["er-pulse-laser-small-clan", 36], ["er-pulse-laser-medium-clan", 117], ["er-pulse-laser-large-clan", 272],
      ["improved-heavy-laser-small-clan", 19, undefined, { gauss: true }], ["improved-heavy-laser-medium-clan", 93, undefined, { gauss: true }],
      ["improved-heavy-laser-large-clan", 296, undefined, { gauss: true }],
      ["protomech-ac-2-clan", 34, 4], ["protomech-ac-4-clan", 49, 6], ["protomech-ac-8-clan", 66, 8],
      ["rotary-ac-2-clan", 161, 20, { heat: "rotary" }], ["rotary-ac-5-clan", 345, 43, { heat: "rotary" }],
      ["fluid-gun-clan", 6, 1], ["heavy-flamer-clan", 15, 2],
      ["mech-mortar-1-clan", 10, 1], ["mech-mortar-2-clan", 14, 2], ["mech-mortar-4-clan", 26, 3], ["mech-mortar-8-clan", 50, 6],
      ["vehicular-grenade-launcher-clan", 15],
      ["long-tom-cannon-clan", 329, 41], ["sniper-cannon-clan", 77, 10], ["thumper-cannon-clan", 41, 5],
      ["streak-lrm-5-clan", 86, 11, { heat: "streak" }], ["streak-lrm-10-clan", 173, 22, { heat: "streak" }],
      ["streak-lrm-15-clan", 259, 32, { heat: "streak" }], ["streak-lrm-20-clan", 345, 43, { heat: "streak" }],
      ["arrow-iv-clan", 240, 30], ["sniper-artillery-clan", 96, 11], ["thumper-artillery-clan", 48, 5],
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
      // The table's double section mark: treat as a Gauss weapon critical space for the Defensive Battle Rating (p. 191).
      ["risc-emergency-coolant-system-is", 0, undefined, { none: true, gauss: true }],
    ],
  },
  {
    // Tactical Operations: Advanced Units and Equipment, Other Equipment and Melee Weapons rows of the addenda, printed pp. 195-197.
    // Vibroblades and the flail are melee items with a fixed BV, so they are equipment here, not weapons sorted by heat.
    cite: { book: TO, page: 195 },
    checked: "page",
    rows: [
      ["flail-is", 11], ["vibroblade-small-is", 12], ["vibroblade-medium-is", 17], ["vibroblade-large-is", 24],
      ["shield-small-is", 50, undefined, { defensive: true }], ["shield-medium-is", 135, undefined, { defensive: true }], ["shield-large-is", 263, undefined, { defensive: true }],
      ["spikes-is", 4, undefined, { defensive: true }],
      ["angel-ecm-is", 100, undefined, { defensive: true }], ["angel-ecm-clan", 100, undefined, { defensive: true }],
      ["bloodhound-active-probe-is", 25, undefined, { defensive: true }],
      ["c3-remote-sensor-launcher-is", 30, 6],
      ["chaff-pod-is", 19, undefined, { defensive: true, gauss: true }], ["m-pod-is", 5, undefined, { defensive: true, gauss: true }],
      ["electronic-warfare-equipment-is", 39, undefined, { defensive: true }],
      ["laser-anti-missile-system-is", 45, undefined, { defensive: true }], ["laser-anti-missile-system-clan", 45, undefined, { defensive: true }],
      ["watchdog-cews-clan", 68, undefined, { defensive: true }],
      // No BV of their own: CASE II is used in the Defensive Battle Rating (note H), the C3 variants count only in a network (note D),
      // Artemis V and Apollo change their launcher (notes J, L), and the capacitor, insulator and coolant pod act through the rules above.
      ["case-ii-is", 0, undefined, { none: true }], ["case-ii-clan", 0, undefined, { none: true }],
      ["c3-boosted-master-is", 0, undefined, { none: true }], ["c3-boosted-slave-is", 0, undefined, { none: true }], ["c3-emergency-master-is", 0, undefined, { none: true }],
      ["artemis-v-clan", 0, undefined, { none: true }], ["mrm-apollo-fcs-is", 0, undefined, { none: true }],
      ["ppc-capacitor-is", 0, undefined, { none: true }], ["laser-insulator-is", 0, undefined, { none: true }], ["laser-insulator-clan", 0, undefined, { none: true }],
      ["coolant-pod-is", 0, undefined, { none: true }], ["coolant-pod-clan", 0, undefined, { none: true }],
      // Supercharger: used in the unit ratings but with no BV of its own (note C, TO:AUE p.195)
      ["supercharger-is", 0, undefined, { none: true }], ["supercharger-clan", 0, undefined, { none: true }],
    ],
  },
];
