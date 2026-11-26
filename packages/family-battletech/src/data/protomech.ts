// ProtoMechs (Classic BattleTech): the figures of the standard biped ProtoMech, 2 to 9 tons, from TechManual's ProtoMech chapter (printed
// pp. 80-89, read against the page images), its costs table (p. 279), the Battle Value chapter (the TechManual Battle Value v4.1 pages and
// the tables on p. 318) and the Universal Technology Advancement Table of Interstellar Operations: Alternate Eras (printed pp. 29 and 44).
// Plain data: nothing here runs. Every group names the printed page it came from and whether it was read against the page image
// ("page") or only the text ("text"). The tables are our own; the books' wording is not copied. Weights are kilograms: ProtoMechs use a
// kilogram standard (TechManual p. 80), so the catalog's tons are multiplied by 1,000 where a catalog item is mounted.
//
// Errata (TechManual errata v8.0, 22 August 2024, "ProtoMech Construction" and the costs table): the arms of the 3, 4 and 5 ton rows hold
// 2 armor points each (the printing agrees), the Anti-Personnel Gauss shot weighs 25 kg, the ammunition table gains the Plasma Cannon,
// Ultra AC/10, LB 10-X AC, Gauss Rifle, HAG/20 and the vehicle Flamer, plasma weapons may be mounted, and the Myomer Booster has its own
// cost line. Where the printed page and its extract disagreed (the internal structure cost, 400 a ton, p. 279) the page image decided.
//
// Left for later pieces (not built here): quad, glider and ultraheavy ProtoMechs (Interstellar Operations: Alternate Eras printed pp. 92-99, Advanced
// rules: prototype 3075, production about 3083 to 3084) and the ultraheavy cockpit. The part options (the Inner Sphere interface cockpit, Electric Discharge
// armor, the extended jump jet system, UMUs and the partial wing) are below, after the dates. Not built yet, so not handled here: glider ProtoMechs (they may have no jump jets, XJJ, wing, UMUs or booster:
// IO:AE pp. 59, 95) and ultraheavy ones (jets and UMUs 150 kg per MP, the interface cockpit 750 kg over 9 tons: IO:AE pp. 95-96); the editor builds standard bipeds of 2 to 9 tons.
import type { RulesLevel } from "./chassis";

export interface ProtoCite {
  book: string;
  page: number;
}
export type ProtoChecked = "page" | "text";
interface Sourced {
  cite: ProtoCite;
  checked: ProtoChecked;
}

const TM = "TechManual";
const TM_BV = "TechManual Battle Value v4.1";
const IO = "Interstellar Operations: Alternate Eras";
const TO = "Tactical Operations: Advanced Units and Equipment";

// ---------------------------------------------------------------------------------------------------------------
// Locations. The codes are the doll brief's (brief-classic-dolls.md): hd head, t torso, la and ra arms, lg legs (both legs are one location),
// mg the optional main gun. ProtoMechs have no front and rear sides (p. 86).
// ---------------------------------------------------------------------------------------------------------------
export const PROTO_LOCATIONS = [
  { code: "hd", name: "Head" },
  { code: "t", name: "Torso" },
  { code: "la", name: "Left Arm" },
  { code: "ra", name: "Right Arm" },
  { code: "lg", name: "Legs" },
  { code: "mg", name: "Main Gun" },
] as const;
export type ProtoLocation = (typeof PROTO_LOCATIONS)[number]["code"];
export const PROTO_CODES: ProtoLocation[] = PROTO_LOCATIONS.map((l) => l.code);
export const PROTO_LOCATION_NAMES: Record<string, string> = Object.fromEntries(PROTO_LOCATIONS.map((l) => [l.code, l.name]));

/** Where weapons and equipment may go, with what each location holds at most (the Location Restrictions Table, p. 87). Kilograms; ammunition does not count. */
export const PROTO_LIMITS: Sourced & { rows: Record<string, { items: number; kg: number | null }> } = {
  cite: { book: TM, page: 87 },
  checked: "page",
  rows: {
    hd: { items: 0, kg: 0 },
    t: { items: 2, kg: 2000 },
    la: { items: 1, kg: 500 },
    ra: { items: 1, kg: 500 },
    lg: { items: 0, kg: 0 },
    mg: { items: 1, kg: null },
  },
};
/** Only a torso weapon may face the rear (p. 80, p. 86). */
export const PROTO_REAR_LOCATIONS: string[] = ["t"];

// ---------------------------------------------------------------------------------------------------------------
// Weight and the Structure and Armor Table (p. 82, with errata v8.0).
// ---------------------------------------------------------------------------------------------------------------
export const PROTO_WEIGHT: Sourced & { min: number; max: number; step: number } = { cite: { book: TM, page: 80 }, checked: "page", min: 2, max: 9, step: 1 };

export interface ProtoStructureRow {
  /** Internal structure points by location; the main gun's holds only when a main gun is carried. */
  structure: Record<ProtoLocation, number>;
  /** The most armor points each location may hold. */
  armor: Record<ProtoLocation, number>;
}
const row = (tons: number, head: [number, number], arm: [number, number], legs: [number, number]): ProtoStructureRow => ({
  structure: { hd: head[0], t: tons, la: arm[0], ra: arm[0], lg: legs[0], mg: 1 },
  armor: { hd: head[1], t: tons * 2, la: arm[1], ra: arm[1], lg: legs[1], mg: 3 },
});
export const PROTO_STRUCTURE: Sourced & { rows: Record<number, ProtoStructureRow> } = {
  cite: { book: TM, page: 82 },
  checked: "page",
  rows: {
    2: row(2, [1, 3], [1, 2], [2, 4]),
    3: row(3, [1, 3], [1, 2], [2, 4]),
    4: row(4, [1, 4], [1, 2], [3, 6]),
    5: row(5, [1, 4], [1, 2], [3, 6]),
    6: row(6, [2, 5], [2, 4], [4, 8]),
    7: row(7, [2, 5], [2, 4], [4, 8]),
    8: row(8, [2, 6], [2, 4], [5, 10]),
    9: row(9, [2, 6], [2, 4], [5, 10]),
  },
};
/** The page's "Maximum Armor Factor" column, without and with a main gun: kept for the test that the rows above add up to it. */
export const PROTO_MAX_ARMOR_FACTOR: Record<number, [number, number]> = { 2: [15, 18], 3: [17, 20], 4: [22, 25], 5: [24, 27], 6: [33, 36], 7: [35, 38], 8: [40, 43], 9: [42, 45] };

// ---------------------------------------------------------------------------------------------------------------
// Parts and their weights (pp. 82-86). Kilograms.
// ---------------------------------------------------------------------------------------------------------------
export const PROTO_PARTS: Sourced & {
  structureKgPerTon: number;
  heatSinkKg: number;
  boosterKgPerTon: number;
  engineMaxRating: number;
  /** Below this rating the engine weighs `smallEngineKgPerRating` for each point of rating; from it, the Master Engine Table (p. 49) at the rating rounded up to a multiple of 5. */
  smallEngineBelow: number;
  smallEngineKgPerRating: number;
  jumpJetKg: { upTo: number; kg: number }[];
} = {
  cite: { book: TM, page: 84 },
  checked: "page",
  structureKgPerTon: 100,
  heatSinkKg: 250,
  boosterKgPerTon: 25,
  engineMaxRating: 400,
  smallEngineBelow: 40,
  smallEngineKgPerRating: 25,
  jumpJetKg: [
    { upTo: 5, kg: 50 },
    { upTo: 9, kg: 100 },
  ],
};
/** Pages for each part: engine and jump jets p. 84, cockpit and Myomer Booster p. 85, heat sinks and armor p. 86. */
export const PROTO_PART_PAGES = { structure: 82, engine: 83, jumpJets: 84, booster: 85, cockpit: 85, heatSinks: 86, armor: 86 } as const;
/** The Running MP a Myomer Booster gives: twice the Walking MP (p. 85). Without it, Running MP is Walking MP x 1.5 rounded up (p. 83). */
export const PROTO_MOVE: Sourced & { runFactor: number; boostedRunFactor: number } = { cite: { book: TM, page: 83 }, checked: "page", runFactor: 1.5, boostedRunFactor: 2 };

// ---------------------------------------------------------------------------------------------------------------
// Missile launchers by the tube (pp. 88-89) and ammunition by the shot (p. 88, with errata v8.0). A launcher of any number of tubes up to the
// most its kind has is one item. `row` is the catalog row whose damage, ranges and dates the launcher has; `kgPerMissile` is an ammunition weight
// per missile, and a shot is one volley (the tubes). Battle Value and ammunition Battle Value are indexed by tube count minus one (p. 318).
// ---------------------------------------------------------------------------------------------------------------
export interface ProtoLauncher {
  label: string;
  row: string;
  maxTubes: number;
  kgPerTube: number;
  kgPerMissile: number;
  tubeCost: number;
  bv: number[];
  ammoBv: number[];
}
export const PROTO_LAUNCHERS: Sourced & { rows: Record<string, ProtoLauncher> } = {
  cite: { book: TM, page: 88 },
  checked: "page",
  rows: {
    lrm: {
      label: "LRM",
      row: "lrm-5-clan",
      maxTubes: 20,
      kgPerTube: 200,
      kgPerMissile: 8.33,
      tubeCost: 10_000,
      bv: [17, 24, 34, 46, 55, 69, 76, 88, 94, 109, 126, 141, 145, 159, 164, 180, 185, 199, 203, 220],
      ammoBv: [2, 3, 4, 6, 7, 9, 10, 11, 12, 14, 16, 18, 19, 20, 21, 23, 24, 25, 26, 27],
    },
    srm: { label: "SRM", row: "srm-2-clan", maxTubes: 6, kgPerTube: 250, kgPerMissile: 10, tubeCost: 10_000, bv: [15, 21, 30, 39, 47, 59], ammoBv: [2, 3, 4, 5, 6, 7] },
    streak: { label: "Streak SRM", row: "streak-srm-2-clan", maxTubes: 6, kgPerTube: 500, kgPerMissile: 10, tubeCost: 15_000, bv: [20, 40, 59, 79, 99, 118], ammoBv: [3, 5, 7, 10, 13, 15] },
  },
};
/** The catalog rows a launcher is sold in whole sizes as: a size the book prices as that launcher uses its cost, not the per tube one (p. 293 note). */
export const PROTO_LAUNCHER_SIZES: Record<string, number[]> = { lrm: [5, 10, 15, 20], srm: [2, 4, 6], streak: [2, 4, 6] };

/** Ammunition weight for one shot, by catalog row id (the ProtoMech Ammunition Weight Table, p. 88, with errata v8.0). */
export const PROTO_AMMO_KG: Sourced & { rows: Record<string, number> } = {
  cite: { book: TM, page: 88 },
  checked: "page",
  rows: {
    "ams-clan": 40,
    "ap-gauss-rifle-clan": 25,
    "heavy-machine-gun-clan": 10,
    "light-machine-gun-clan": 5,
    "machine-gun-clan": 5,
    "narc-missile-beacon-clan": 150,
    "ultra-ac-2-clan": 20,
    "ultra-ac-5-clan": 50,
    "ultra-ac-10-clan": 100,
    "lb-2-x-ac-clan": 20,
    "lb-5-x-ac-clan": 50,
    "lb-10-x-ac-clan": 100,
    "gauss-rifle-clan": 125,
    "hyper-assault-gauss-20-clan": 166.66,
    "vehicle-flamer-clan": 50,
    "plasma-cannon-clan": 100,
    // The three ProtoMech autocannons are not on the p. 88 table: 1,000 kg / shots per ton (TO:AUE pp. 96 and 216).
    "protomech-ac-2-clan": 25,
    "protomech-ac-4-clan": 50,
    "protomech-ac-8-clan": 100,
  },
};
/** Catalog ids a ProtoMech may not mount although the catalog lists others of their kind: ATMs, MMLs, MRMs, rockets and one-shot launchers (TechManual p. 231 as amended by errata v8.0),
 * and the quad melee system, which only a quadruped's torso takes (IO:AE p. 61) while the editor builds bipeds.
 * The catalog's own `units` list decides everything else. */
export const PROTO_EXCLUDED = /^(atm|mml|mrm|rocket|protomech-quad)/;

/** Items whose weight steps with the ProtoMech's tonnage: the Magnetic Clamp System weighs 250 kg under 6 tons, 500 kg from 6 to 9 and 1,000 kg from 10 (IO:AE p. 60). */
export const PROTO_BANDED_KG: Sourced & { rows: Record<string, { fromTons: number; kg: number }[]> } = {
  cite: { book: IO, page: 60 },
  checked: "page",
  rows: { "magnetic-clamp-system-clan": [{ fromTons: 0, kg: 250 }, { fromTons: 6, kg: 500 }, { fromTons: 10, kg: 1000 }] },
};

/** Where an item may go, where the book names the place (the clamp takes a weapon slot in the torso, IO:AE p. 60; the melee weapon one on an arm, TO:AUE p. 148), and the items of which a ProtoMech may carry one. */
export const PROTO_PLACEMENT: Sourced & { only: Record<string, string[]>; one: string[]; cites: Record<string, ProtoCite> } = {
  cite: { book: TO, page: 148 },
  checked: "page",
  only: { "magnetic-clamp-system-clan": ["t"], "protomech-melee-weapon-clan": ["la", "ra"] },
  /** Items whose placement rule is in another book than the melee weapon's. */
  cites: { "magnetic-clamp-system-clan": { book: IO, page: 60 } },
  one: ["protomech-melee-weapon-clan"],
};

/** The melee weapon adds 1 damage per 5 tons of ProtoMech (rounded up) to a frenzy attack (TO:AUE p. 149) and its Battle Value is that damage x 1.25 (TO:AUE BV table addendum). */
export const PROTO_MELEE: Sourced & { row: string; tonsPerDamage: number; bvFactor: number } = {
  cite: { book: TO, page: 149 },
  checked: "page",
  row: "protomech-melee-weapon-clan",
  tonsPerDamage: 5,
  bvFactor: 1.25,
};

// ---------------------------------------------------------------------------------------------------------------
// When ProtoMechs exist (Universal Technology Advancement Table, IO:AE printed p. 44: Clan, prototype about 3055, production 3059, common 3060)
// and the parts with dates of their own (printed p. 29: jump jets and armor prototype about 3055, production 3060; Myomer Booster prototype about 3066,
// production 3068). A year between a prototype year and the production year is Experimental level (IO:AE printed p. 27).
// ---------------------------------------------------------------------------------------------------------------
export interface ProtoDates {
  prototype: number;
  /** Absent for a part that was only ever a prototype: it is then on offer from `prototype` to `extinct`, at the part's own rules level. */
  production?: number;
  /** The last year the part is on offer (the table's "Ext" year less one). */
  extinct?: number;
  cite: ProtoCite;
  checked: ProtoChecked;
}
export const PROTO_DATES: Record<"unit" | "jumpJets" | "armor" | "booster" | "interface" | "edp" | "xjj" | "umu" | "wing", ProtoDates> = {
  unit: { prototype: 3055, production: 3059, cite: { book: IO, page: 44 }, checked: "page" },
  jumpJets: { prototype: 3055, production: 3060, cite: { book: IO, page: 29 }, checked: "page" },
  armor: { prototype: 3055, production: 3060, cite: { book: IO, page: 30 }, checked: "page" },
  booster: { prototype: 3066, production: 3068, cite: { book: IO, page: 29 }, checked: "page" },
  // IO:AE third printing, printed pp. 29-30 and 33 (the Universal Technology Advancement Table). The Inner Sphere interface and the Electric Discharge armor have no
  // production year (prototype only, about 3071, extinct 3085); the extended jump jet is prototype about 3071, production 3075 and common 3085. The ProtoMech UMU's
  // prototype year is TO:AUE's (seventh printing, 2024, p. 217: 3061, the later printing) where IO:AE's table says about 3065; its production year, about 3075, is IO:AE's alone.
  // "Ext: 3085" is read as gone in 3085, so the last year on offer is 3084 (book panel, interface ruling).
  interface: { prototype: 3071, extinct: 3084, cite: { book: IO, page: 33 }, checked: "page" },
  edp: { prototype: 3071, extinct: 3084, cite: { book: IO, page: 30 }, checked: "page" },
  xjj: { prototype: 3071, production: 3075, cite: { book: IO, page: 29 }, checked: "page" },
  umu: { prototype: 3061, production: 3075, cite: { book: TO, page: 217 }, checked: "page" },
  wing: { prototype: 3070, production: 3085, cite: { book: IO, page: 29 }, checked: "page" },
};
/** The rules level of the ProtoMech rules in play: Total Warfare's standard rules (TechManual p. 80). */
export const PROTO_LEVEL = "standard" as const;

// ---------------------------------------------------------------------------------------------------------------
// Cost (p. 279, structural costs; p. 285, final cost) and Battle Value (TechManual Battle Value v4.1, ProtoMech method; the Delphyne-2 example).
// ---------------------------------------------------------------------------------------------------------------
export const PROTO_COST: Sourced & {
  lifeSupport: number;
  sensorsPerTon: number;
  musculaturePerTon: number;
  structurePerTon: number;
  armActuatorPerTon: number;
  legActuatorPerTon: number;
  engineDivisor: number;
  engineFactor: number;
  boosterPerRatingTon: number;
  heatSink: number;
  tonsDivisor: number;
} = {
  cite: { book: TM, page: 279 },
  checked: "page",
  lifeSupport: 75_000,
  sensorsPerTon: 2_000,
  musculaturePerTon: 2_000,
  structurePerTon: 400,
  armActuatorPerTon: 180,
  legActuatorPerTon: 540,
  engineDivisor: 75,
  engineFactor: 5_000,
  boosterPerRatingTon: 1_000,
  heatSink: 2_000,
  tonsDivisor: 100,
};

export const PROTO_BV: Sourced & { armorFactor: number; structureFactor: number; defensiveBonus: number; jumpTargetBonus: number } = {
  cite: { book: TM_BV, page: 306 },
  checked: "page",
  armorFactor: 2.5,
  structureFactor: 1.5,
  defensiveBonus: 0.1,
  jumpTargetBonus: 1,
};
/** Where the BV tables print the launcher figures above (the Clan Weapons and Equipment BV Table). */
export const PROTO_BV_TABLE_CITE: ProtoCite = { book: TM, page: 318 };

// ---------------------------------------------------------------------------------------------------------------
// Part options. A record names its option by id (absent or "standard" is the TechManual part); an id this version does not know is kept and reported.
// `level` is the option's rules level from its rules box (the play table agrees on every row here); in its prototype years any option needs Experimental.
// Figures: IO:AE third printing, rules pp. 59 (Electric Discharge armor, extended jump jets) and 96 (Inner Sphere interface), construction and cost table p. 213,
// Battle Value table p. 190 and its notes p. 191; TO:AUE seventh printing (2024), rules pp. 104-105 and 107, construction data p. 217, cost footnote p. 223,
// Battle Value p. 192. All read against the page images.
// ---------------------------------------------------------------------------------------------------------------
export interface ProtoCockpit extends Sourced {
  label: string;
  kg: number;
  /** C-bills; for the interface it replaces the standard cockpit's cost (IO:AE p. 180). */
  cost: number;
  level: RulesLevel;
  dates?: ProtoDates;
  /** The interface makes the unit a Mixed Technology unit (IO:AE p. 96). */
  mixed?: true;
}
export const PROTO_COCKPITS: Record<string, ProtoCockpit> = {
  standard: { label: "Standard ProtoMech cockpit", kg: 500, cost: 500_000, level: "standard", cite: { book: TM, page: 85 }, checked: "page" },
  // Inner Sphere technology (IO:AE pp. 96, 213) offered in this Clan-only editor: held for the book panel, which rules whether the interface makes the unit Mixed Technology.
  // Weighs as much as a standard cockpit, takes no space on the record sheet, costs 1,000,000, and does not change the Battle Value.
  interface: { label: "Inner Sphere ProtoMech interface cockpit", kg: 500, cost: 1_000_000, level: "experimental", dates: PROTO_DATES.interface, mixed: true, cite: { book: IO, page: 96 }, checked: "page" },
};

export interface ProtoArmorType extends Sourced {
  label: string;
  kgPerPoint: number;
  costPerPoint: number;
  level: RulesLevel;
  dates?: ProtoDates;
  /** Torso items the armor takes away (IO:AE p. 59). */
  torsoItems: number;
  /** Battle Value added as a weapon, with the armor points counted as standard armor (IO:AE p. 191, note to the table). */
  bvAsWeapon: number;
}
export const PROTO_ARMOR_TYPES: Record<string, ProtoArmorType> = {
  standard: { label: "Standard ProtoMech armor", kgPerPoint: 50, costPerPoint: 625, level: "standard", dates: PROTO_DATES.armor, torsoItems: 0, bvAsWeapon: 0, cite: { book: TM, page: 86 }, checked: "page" },
  edp: { label: "Electric Discharge ProtoMech (EDP) armor", kgPerPoint: 75, costPerPoint: 1_250, level: "experimental", dates: PROTO_DATES.edp, torsoItems: 1, bvAsWeapon: 32, cite: { book: IO, page: 59 }, checked: "page" },
};

/** The ways a ProtoMech jumps or moves under water. `kgFactor` multiplies the jump jet weight table; `costPerTonSquared` is C-bills per ton of unit per square of the count (TO:AUE p. 223 footnote; IO:AE p. 213); `reach` is what the count may not pass. */
export interface ProtoJumpSystem extends Sourced {
  label: string;
  /** What the count is called on the sheet. */
  unit: string;
  kgFactor: number;
  costPerTonSquared: number;
  reach: "walk" | "run";
  level: RulesLevel;
  dates?: ProtoDates;
  /** The count is underwater movement, not jumping. */
  underwater?: true;
}
export const PROTO_JUMP_SYSTEMS: Record<string, ProtoJumpSystem> = {
  standard: { label: "ProtoMech jump jets", unit: "Jumping MP", kgFactor: 1, costPerTonSquared: 200, reach: "walk", level: "standard", dates: PROTO_DATES.jumpJets, cite: { book: TM, page: 85 }, checked: "page" },
  xjj: { label: "Extended jump jets (XJJ)", unit: "Jumping MP", kgFactor: 2, costPerTonSquared: 500, reach: "run", level: "standard", dates: PROTO_DATES.xjj, cite: { book: IO, page: 59 }, checked: "page" },
  umu: { label: "Underwater maneuvering units (UMU)", unit: "UMU MP", kgFactor: 1, costPerTonSquared: 200, reach: "walk", level: "experimental", dates: PROTO_DATES.umu, underwater: true, cite: { book: TO, page: 104 }, checked: "page" },
};

/** The partial wing (TO:AUE pp. 104-105, 107, 217): 20 percent of the ProtoMech's weight, one of the torso's items, 50,000 C-bills for each ton it weighs, and a Jumping MP bonus by atmosphere. */
export const PROTO_WING: Sourced & { label: string; kgPerTon: number; costPerTon: number; level: RulesLevel; dates: ProtoDates; torsoItems: number; bonus: Record<string, number>; bonusAtStandard: number } = {
  label: "Partial wing",
  kgPerTon: 200,
  costPerTon: 50_000,
  level: "experimental",
  dates: PROTO_DATES.wing,
  torsoItems: 1,
  bonus: { vacuum: 0, trace: 1, thin: 2, standard: 2, high: 3, "very-high": 3 },
  bonusAtStandard: 2,
  cite: { book: TO, page: 105 },
  checked: "page",
};

export const PROTO_NAME = "ProtoMech";
