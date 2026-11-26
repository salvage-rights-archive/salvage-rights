// Battle Value and C-bill cost figures for aerospace units, edition by edition. Plain data: rules/aero-bv.ts does the arithmetic. Every figure
// was read against the page image. Figures and page cites only; the books' wording is not copied.
//
// Editions and their books:
// - AeroTech 2 (FASA 1718, 2000 printing): Battle Values pp. 53-54, Costs pp. 51-52 (scan index = printed - 1). Its item BVs for standard weapons
//   come from the BattleTech Master Rules it names (pp. 139-145, FASA 1707, 1998).
// - AeroTech 2: Revised Edition (FanPro 35011, 2004): Battle Values p. 81, its table p. 82, Costs pp. 77-78 (index = printed). Its item BVs for
//   standard weapons come from the BattleTech Master Rules, Revised Edition (FanPro 35000) pp. 156-158, its Speed Factor Table p. 153.
// - The current rules: TechManual's aerospace method in the Battle Value v4.1 replacement pages (printed pp. 312-313), the Unit Type Modifiers
//   and Speed Factor tables (printed p. 316), the item BVs pp. 317-318 and Tactical Operations: Advanced Units and Equipment p. 196 (all in
//   data/bv.ts); Strategic Operations: Advanced Aerospace Rules pp. 148-149 for JumpShips, WarShips and stations. Costs: TechManual p. 283
//   (Aerospace Unit Structural Costs) and p. 285 (Final Unit Cost Formulas); SO:AA pp. 146-148 for the capital ships.
// - AeroTech (1986) and BattleSpace print no Battle Value and no costs: no row names them, so nothing is shown.
import type { AeroType } from "./aero";
import type { FigureGroup } from "./aero";
import type { BvOptions } from "./bv";

const AT2 = "aerotech2";
const AT2R = "aerotech2-revised";
const CURRENT = "tw-tm-so";

/** The two ways the books work an aerospace unit's Battle Value. */
export type AeroBvStyle = "at2" | "techmanual";

export interface AeroBvMethod {
  style: AeroBvStyle;
  /** Defensive rating: points per armor point and per point of SI; capital-scale armor and SI of JumpShips, WarShips and stations. */
  armor: number;
  si: number;
  capitalArmor: number;
  capitalSi: number;
  /** Defensive rating: points per ton of fuel (AeroTech 2). */
  fuelPerTon?: number;
  /** Unit type modifiers on the Defensive Battle Rating. */
  typeModifier: Partial<Record<AeroType, number>>;
}

/** The method each edition prints. AeroTech 2 and Revised print the same steps and figures. */
export const AERO_BV_METHOD: FigureGroup<AeroBvMethod> = [
  {
    editions: [AT2, AT2R],
    value: {
      style: "at2",
      armor: 2,
      si: 1.5,
      capitalArmor: 20,
      capitalSi: 15,
      fuelPerTon: 1,
      typeModifier: { "aerospace-fighter": 1.2, "conventional-fighter": 1.1, warship: 1, dropship: 1, "small-craft": 1, jumpship: 0.8, "space-station": 0.8 },
    },
    cite: { [AT2]: "AeroTech 2 p. 53", [AT2R]: "AeroTech 2: Revised Edition p. 81" },
    checked: "page",
  },
  {
    editions: [CURRENT],
    value: {
      style: "techmanual",
      armor: 2.5,
      si: 2,
      // Strategic Operations: Advanced Aerospace Rules p. 149: capital-scale armor x 25 and SI x 20, and the JumpShip, WarShip and station modifiers.
      capitalArmor: 25,
      capitalSi: 20,
      typeModifier: { "aerospace-fighter": 1.2, "conventional-fighter": 1.1, "small-craft": 1, dropship: 1, jumpship: 0.75, warship: 0.8, "space-station": 0.7 },
    },
    cite: { [CURRENT]: "TechManual Battle Value v4.1 p. 312, TechManual p. 316, Strategic Operations: Advanced Aerospace Rules p. 149" },
    checked: "page",
  },
];

/** AeroTech 2 and Revised (p. 53, p. 81): what fighters subtract, how heat cuts the weapon rating, the bombing rating and the large-vessel divisor. */
export const AT2_BV_RULES = {
  editions: [AT2, AT2R],
  cite: { [AT2]: "AeroTech 2 pp. 53-54", [AT2R]: "AeroTech 2: Revised Edition pp. 81-82 with the item values of the BattleTech Master Rules, Revised Edition pp. 156-158" },
  checked: "page",
  /** Per ton of explosive ammunition, without and with CASE (fighters only). Clan fighters carry CASE at no mass (AeroTech 2: Revised Edition p. 65). */
  ammoPerTon: { open: 20, case: 10 },
  /** Per point of maximum heat over the heat sink capacity (fighters only). */
  heatOverPerPoint: 5,
  /** Y = (base - X) / divisor. */
  heatDivisor: { fighter: 2, other: 10 },
  /** The AR-10 launcher counts this much heat. */
  ar10Heat: 20,
  /** Larger vessels divide the subtotal by 1 + subtotal / this. */
  largeVesselDivisor: 1_000_000,
  /** Artemis IV: the launcher's BV x this (the Master Rules note, BattleTech Master Rules, Revised Edition p. 157). */
  artemis: 1.2,
} as const;

/** The current method's own figures (TechManual Battle Value v4.1 pp. 312-313; SO:AA pp. 148-149). */
export const TM_AERO_BV_RULES = {
  cite: { book: "TechManual Battle Value v4.1", page: 312 },
  checked: "page",
  /** An Inner Sphere fighter or small craft without CASE: per type of explosive ammunition, and per Gauss weapon. Clan units are taken to have CASE. */
  ammoPerType: 15,
  gaussEach: 1,
  /** Fighters and small craft add this to their heat sink capacity. */
  heatEfficiencyBonus: 6,
  rearFactor: 0.5,
  artemis: 1.2,
  /** DropShip and capital arcs: the side next to the front at 1 or 0.5, the other side at 0.5 or 0.25, the rest at 0.25. */
  arcs: { side: [1, 0.5], otherSide: [0.5, 0.25], rear: 0.25 },
  /** SO:AA p. 149: a JumpShip's Speed Factor reads Max Thrust 1, a station's 0. */
  capitalThrust: { jumpship: 1, "space-station": 0 },
} as const;

/**
 * Item BVs the AeroTech 2 books take from a BattleTech Master Rules where those differ from data/bv.ts (TechManual and Tactical Operations), keyed
 * by catalog id: [item BV, ammunition BV per ton]; `undefined` keeps the figure beneath. A weapon an edition lists (data/aero-weapons.ts) with no
 * row here was compared and is the same. A test fails if a row repeats the figure beneath it.
 */
export interface BvOverlayGroup {
  editions: string[];
  cite: Record<string, string>;
  checked: "page" | "text";
  rows: Record<string, [bv: number | undefined, ammoBv?: number, options?: BvOptions]>;
}
export const AERO_BV_OVERLAYS: BvOverlayGroup[] = [
  {
    // BattleTech Master Rules, Revised Edition, Inner Sphere and Clan Weapons and Equipment BV tables, printed pp. 156-158.
    editions: [AT2R],
    cite: { [AT2R]: "BattleTech Master Rules, Revised Edition pp. 156-158" },
    checked: "page",
    rows: {
      "large-laser-is": [124], "ac-10-is": [124], "ac-20-is": [undefined, 20], "gauss-rifle-is": [321, 37], "lb-20-x-ac-is": [undefined, 27],
      "ultra-ac-5-is": [113], "ultra-ac-10-is": [253, 29], "ultra-ac-20-is": [282, 32],
      "arrow-iv-is": [171, 11], "sniper-artillery-is": [86, 5], "thumper-artillery-is": [40, 3],
      "er-large-laser-clan": [249], "heavy-large-laser-clan": [243], "gauss-rifle-clan": [321, 33], "lb-20-x-ac-clan": [undefined, 33],
      "ultra-ac-5-clan": [123], "ultra-ac-10-clan": [211], "ultra-ac-20-clan": [337, 35], "streak-srm-6-clan": [119],
      "arrow-iv-clan": [171, 11], "sniper-artillery-clan": [86, 5], "thumper-artillery-clan": [40, 3], "ams-clan": [63, 21],
    },
  },
  {
    // The capital weapons and bombs: AeroTech 2 p. 54 and AeroTech 2: Revised Edition p. 82 print the same figures. The capital missiles and the
    // other bombs equal TechManual p. 318.
    editions: [AT2, AT2R],
    cite: { [AT2]: "AeroTech 2 p. 54", [AT2R]: "AeroTech 2: Revised Edition p. 82" },
    checked: "page",
    rows: {
      ...Object.fromEntries(
        (["is", "clan"] as const).flatMap((t) => [
          [`nl-35-${t}`, [832]], [`nl-45-${t}`, [1081]], [`nl-55-${t}`, [1322]],
          [`light-n-ppc-${t}`, [1663]], [`medium-n-ppc-${t}`, [2163]], [`heavy-n-ppc-${t}`, [3605]],
          [`nac-10-${t}`, [1901, 238]], [`nac-20-${t}`, [3802, 475]], [`nac-25-${t}`, [4752, 594]], [`nac-30-${t}`, [5702, 713]], [`nac-35-${t}`, [4959]], [`nac-40-${t}`, [5668]],
          [`light-n-gauss-${t}`, [2884, 360]], [`medium-n-gauss-${t}`, [4806, 601]], [`heavy-n-gauss-${t}`, [5767, 721]],
          [`bomb-mines-${t}`, [17]],
        ]),
      ) as Record<string, [number]>,
    },
  },
];

// ---------------------------------------------------------------------------------------------------------------------------------
// Costs. One table of the aerospace structural costs; the AeroTech 2 books print the same figures as TechManual p. 283 for every row both
// print, so a row names each edition that prints it. Engines per rating reuse ENGINE_COST (data/cost.ts), which TechManual p. 283 prints again.
// ---------------------------------------------------------------------------------------------------------------------------------

export interface AeroCostFigures {
  cockpit: number;
  lifeSupport: number;
  sensorsPerTon: number;
  avionicsPerControlTon: number;
  vstolPerTon?: number;
  siPerPoint: { "aerospace-fighter": number; "conventional-fighter": number; craft: number };
  attitudeThruster: number;
  landingGearPerTon: number;
  dockingCollar: number;
  bridge: { base: number; perTon: number };
  computer: number;
  lifeSupportPerPerson: number;
  craftSensors: number;
  fireControl: number;
  gunneryPerArc: number;
  driveUnit: { perThrustTon: number; tonsDivisor: number };
  craftEnginePerTon: number;
  /** AeroTech 2 books: engine control equipment of a large craft. */
  engineControl?: number;
  fuelPerTon: number;
  armorPerTon: Record<string, number>;
  heatSinkEach: Record<string, number>;
  amplifierPerTon?: number;
  /** AeroTech 2 books: CASE in a fighter, per class of ammunition. */
  casePerAmmoClass?: number;
  /** AeroTech 2 books: ammunition is bought; the current rules do not buy it (TechManual p. 282). */
  buysAmmunition: boolean;
  /** Final multipliers: fighters and small craft x (1 + tons / divisor); DropShips by shape; Omni fighters x 1.25. */
  final: { fighterDivisor: number; smallCraftDivisor: number; spheroid: number; aerodyne: number; omni: number };
  /** Costs of vessels other than fighters and small craft rounded to the nearest million (the AeroTech 2 books). */
  roundLargeToMillion: boolean;
}

const SHARED: Omit<AeroCostFigures, "armorPerTon" | "engineControl" | "casePerAmmoClass" | "buysAmmunition" | "roundLargeToMillion" | "vstolPerTon" | "amplifierPerTon"> = {
  cockpit: 200_000,
  lifeSupport: 50_000,
  sensorsPerTon: 2_000,
  avionicsPerControlTon: 4_000,
  siPerPoint: { "aerospace-fighter": 50_000, "conventional-fighter": 4_000, craft: 100_000 },
  attitudeThruster: 25_000,
  landingGearPerTon: 10,
  dockingCollar: 10_000,
  bridge: { base: 200_000, perTon: 10 },
  computer: 200_000,
  // AeroTech 2 prints 50,000 x (passengers + crew) / 10, the same sum.
  lifeSupportPerPerson: 5_000,
  craftSensors: 80_000,
  fireControl: 100_000,
  gunneryPerArc: 10_000,
  driveUnit: { perThrustTon: 500, tonsDivisor: 100 },
  craftEnginePerTon: 1_000,
  fuelPerTon: 200,
  heatSinkEach: { single: 2_000, double: 6_000 },
  final: { fighterDivisor: 200, smallCraftDivisor: 50, spheroid: 28, aerodyne: 36, omni: 1.25 },
};

export const AERO_COST: FigureGroup<AeroCostFigures> = [
  {
    editions: [AT2, AT2R],
    value: {
      ...SHARED,
      armorPerTon: { standard: 10_000, "ferro-aluminum": 20_000, "ferro-aluminum-clan": 20_000 },
      engineControl: 1_000,
      casePerAmmoClass: 50_000,
      buysAmmunition: true,
      roundLargeToMillion: true,
    },
    cite: { [AT2]: "AeroTech 2 pp. 51-52", [AT2R]: "AeroTech 2: Revised Edition pp. 77-78" },
    checked: "page",
  },
  {
    editions: [CURRENT],
    value: {
      ...SHARED,
      vstolPerTon: 5_000,
      amplifierPerTon: 20_000,
      armorPerTon: { standard: 10_000, "ferro-aluminum": 20_000, "ferro-aluminum-clan": 20_000, "light-ferro-aluminum": 15_000, "heavy-ferro-aluminum": 25_000 },
      buysAmmunition: false,
      roundLargeToMillion: false,
    },
    cite: { [CURRENT]: "TechManual pp. 283, 285" },
    checked: "page",
  },
];

/**
 * Standard weapon and ammunition prices the AeroTech 2 books take from a BattleTech Master Rules. Weapons: only where the price differs from
 * data/cost.ts (keyed as EQUIPMENT_COST is, by the id without its tech base ending); every other weapon price on the page equals it. Ammunition:
 * per ton, keyed by the catalog ammunition id without its tech base ending (the current rules buy none, so there is nothing beneath to repeat).
 */
export interface PriceOverlayGroup {
  editions: string[];
  cite: Record<string, string>;
  checked: "page" | "text";
  weapons: Record<string, number>;
  ammoPerTon: Record<string, number>;
}
export const AERO_PRICE_OVERLAYS: PriceOverlayGroup[] = [
  {
    // BattleTech Master Rules, Revised Edition, Weapon and Equipment Prices, printed p. 151.
    editions: [AT2R],
    cite: { [AT2R]: "BattleTech Master Rules, Revised Edition p. 151" },
    checked: "page",
    weapons: { "light-active-probe": 150_000 },
    ammoPerTon: {
      "ammo-ac-2": 1_000, "ammo-ac-5": 4_500, "ammo-ac-10": 6_000, "ammo-ac-20": 10_000, "ammo-vehicle-flamer": 1_000,
      "ammo-heavy-gauss-rifle": 20_000, "ammo-gauss-rifle": 20_000, "ammo-light-gauss-rifle": 20_000,
      "ammo-lb-2-x": 2_000, "ammo-lb-2-x-cluster": 3_300, "ammo-lb-5-x": 9_000, "ammo-lb-5-x-cluster": 15_000,
      "ammo-lb-10-x": 12_000, "ammo-lb-10-x-cluster": 20_000, "ammo-lb-20-x": 20_000, "ammo-lb-20-x-cluster": 34_000,
      "ammo-heavy-machine-gun": 1_000, "ammo-machine-gun": 1_000, "ammo-light-machine-gun": 500,
      "ammo-rotary-ac-2": 3_000, "ammo-rotary-ac-5": 12_000, "ammo-ultra-ac-2": 1_000, "ammo-ultra-ac-5": 9_000, "ammo-ultra-ac-10": 12_000, "ammo-ultra-ac-20": 20_000,
      "ammo-atm-3": 75_000, "ammo-atm-6": 75_000, "ammo-atm-9": 75_000, "ammo-atm-12": 75_000,
      "ammo-lrm-5": 30_000, "ammo-lrm-10": 30_000, "ammo-lrm-15": 30_000, "ammo-lrm-20": 30_000,
      "ammo-mrm-10": 5_000, "ammo-mrm-20": 5_000, "ammo-mrm-30": 5_000, "ammo-mrm-40": 5_000,
      "ammo-srm-2": 27_000, "ammo-srm-4": 27_000, "ammo-srm-6": 27_000, "ammo-streak-srm-2": 54_000, "ammo-streak-srm-4": 54_000, "ammo-streak-srm-6": 54_000,
      "ammo-arrow-iv": 10_000, "ammo-sniper-artillery": 6_000, "ammo-thumper-artillery": 4_500,
      "ammo-ams": 2_000, "ammo-improved-narc-launcher": 7_500, "ammo-narc-missile-beacon": 6_000,
    },
  },
];
