// Battle armor construction tables, read from TechManual (corrected sixth printing, errata v8.0) printed pp. 156-173, the
// Battle Armor Structural Costs and Availability table (printed p. 281) and the dates of Interstellar Operations: Alternate Eras
// (printed pp. 30, 44-46), every page read against its page image. Plain data: nothing here runs. The tables are our own; the
// books' wording is not copied. Weights are kilograms, as the book prints them (equipment in the catalog is in tons).
//
// Dates: a row has the Inner Sphere dates in `availability` and `prototypeYear`, and the Clan ones in `clanAvailability` and
// `clanPrototypeYear` where they differ (the shape of `DatedRow` in rules/time.ts). A row for one tech base only says which. The
// Universal Technology Advancement Table prints one production year and notes the other base's introduction ("IS Intro", "Clan
// Intro"): the note gives that base's first year. "ES" (early spaceflight) is written 2200, as in the catalog. `yearsInferred` marks a
// row whose year for a base is read from a neighbouring column, not printed for that base.
import type { RulesLevel, Span } from "./chassis";
import type { DatedRow } from "../rules/time";

export interface Cite {
  book: string;
  page: number;
}
const TM = "TechManual";
const IO = "Interstellar Operations: Alternate Eras";
const TO = "Tactical Operations: Advanced Units and Equipment";
const WEIGHT_CITE: Cite = { book: TM, page: 163 };

export type WeightClassId = "pal" | "light" | "medium" | "heavy" | "assault";
export type Body = "humanoid" | "quad";
export type MotiveKind = "jump" | "vtol" | "umu";
export type BaLocation = "ra" | "la" | "body";

export interface Dated extends DatedRow {
  /** Set when only one tech base has the item. */
  techBase?: "inner-sphere" | "clan";
  rulesLevel?: RulesLevel;
  yearsInferred?: true;
  datesCite: Cite;
}

export interface NonGround {
  maxMp: number;
  kgPerMp: number;
}
export interface WeightClassRow extends Dated {
  id: WeightClassId;
  label: string;
  cite: Cite;
  /** The suit's total weight range in kilograms (printed p. 163). */
  minKg: number;
  maxKg: number;
  /** The chassis weight by tech base. Clan PA(L) is 130; a Clan industrial exoskeleton may use 80 (exoskeletons are a later piece). */
  chassisKg: { "inner-sphere": number; clan: number };
  /** Weapon slots: in each humanoid arm, in the humanoid body, and in the quad body (none for PA(L), "NA"). */
  slots: { arm: number; body: number; quadBody?: number };
  /** Armor points a trooper may carry, not counting the trooper point (printed p. 169). */
  maxArmor: number;
  /** Ground MP free with the chassis and the most it may reach (humanoid; quad where the class has a quad), and the weight of each added MP. */
  ground: { free: { humanoid: number; quad?: number }; max: { humanoid: number; quad?: number }; kgPerMp: number };
  jump: NonGround;
  vtol?: NonGround;
  umu: NonGround;
  /** Costs (printed p. 281): the chassis, and each MP of jump, VTOL and UMU; ground MP is 25,000 each (`GROUND_MP_COST`). */
  cost: { chassis: number; jump: number; vtol?: number; umu: number };
}

/** The weight classes, PA(L) to assault: structure (p. 163), ground MP (p. 164), non-ground motive systems (p. 165), armor limits (p. 169), costs (p. 281). */
export const WEIGHT_CLASSES: WeightClassRow[] = [
  {
    id: "pal", label: "PA(L)", minKg: 80, maxKg: 400, chassisKg: { "inner-sphere": 80, clan: 130 }, slots: { arm: 2, body: 2 }, maxArmor: 2,
    ground: { free: { humanoid: 1 }, max: { humanoid: 3 }, kgPerMp: 25 }, jump: { maxMp: 3, kgPerMp: 25 }, vtol: { maxMp: 7, kgPerMp: 30 }, umu: { maxMp: 5, kgPerMp: 45 },
    cost: { chassis: 50_000, jump: 50_000, vtol: 50_000, umu: 50_000 },
    // Prototype 2710, extinct 2766, returned 2905; the table prints no production year (IO:AE printed p. 44).
    availability: [{ from: 2710, to: 2766 }, { from: 2905 }], datesCite: { book: IO, page: 44 }, yearsInferred: true,
  },
  {
    id: "light", label: "Light", minKg: 401, maxKg: 750, chassisKg: { "inner-sphere": 100, clan: 150 }, slots: { arm: 2, body: 4, quadBody: 5 }, maxArmor: 6,
    ground: { free: { humanoid: 1, quad: 2 }, max: { humanoid: 3, quad: 5 }, kgPerMp: 30 }, jump: { maxMp: 3, kgPerMp: 25 }, vtol: { maxMp: 6, kgPerMp: 40 }, umu: { maxMp: 5, kgPerMp: 45 },
    cost: { chassis: 50_000, jump: 50_000, vtol: 50_000, umu: 50_000 },
    availability: [{ from: 3050 }], clanAvailability: [{ from: 2870 }], clanPrototypeYear: 2865, datesCite: { book: IO, page: 44 },
  },
  {
    id: "medium", label: "Medium", minKg: 751, maxKg: 1000, chassisKg: { "inner-sphere": 175, clan: 250 }, slots: { arm: 3, body: 4, quadBody: 7 }, maxArmor: 10,
    ground: { free: { humanoid: 1, quad: 2 }, max: { humanoid: 3, quad: 5 }, kgPerMp: 40 }, jump: { maxMp: 3, kgPerMp: 50 }, vtol: { maxMp: 5, kgPerMp: 60 }, umu: { maxMp: 4, kgPerMp: 85 },
    cost: { chassis: 100_000, jump: 75_000, vtol: 100_000, umu: 75_000 },
    availability: [{ from: 3052 }], clanAvailability: [{ from: 2868 }], clanPrototypeYear: 2840, datesCite: { book: IO, page: 44 },
  },
  {
    id: "heavy", label: "Heavy", minKg: 1001, maxKg: 1500, chassisKg: { "inner-sphere": 300, clan: 400 }, slots: { arm: 3, body: 6, quadBody: 9 }, maxArmor: 14,
    ground: { free: { humanoid: 1, quad: 2 }, max: { humanoid: 2, quad: 4 }, kgPerMp: 80 }, jump: { maxMp: 2, kgPerMp: 125 }, umu: { maxMp: 3, kgPerMp: 160 },
    cost: { chassis: 200_000, jump: 150_000, umu: 100_000 },
    availability: [{ from: 3050 }], clanAvailability: [{ from: 2875 }], clanPrototypeYear: 2867, datesCite: { book: IO, page: 44 },
  },
  {
    id: "assault", label: "Assault", minKg: 1501, maxKg: 2000, chassisKg: { "inner-sphere": 550, clan: 700 }, slots: { arm: 4, body: 6, quadBody: 11 }, maxArmor: 18,
    ground: { free: { humanoid: 1, quad: 2 }, max: { humanoid: 2, quad: 4 }, kgPerMp: 160 }, jump: { maxMp: 2, kgPerMp: 250 }, umu: { maxMp: 2, kgPerMp: 250 },
    cost: { chassis: 400_000, jump: 300_000, umu: 150_000 },
    availability: [{ from: 3058 }], clanAvailability: [{ from: 2877 }], clanPrototypeYear: 2870, datesCite: { book: IO, page: 44 },
  },
].map((row) => ({ ...row, cite: WEIGHT_CITE })) as WeightClassRow[];

/** A ground MP added above the free ones costs this much (printed p. 281). */
export const GROUND_MP_COST = 25_000;

/** The non-ground motive kinds: who may build them and the dates (jump jets IO:AE printed p. 46; VTOL and UMU Clan only, printed p. 46). */
export const MOTIVE: Record<MotiveKind, Dated & { label: string; cite: Cite }> = {
  jump: { label: "Jump jets", availability: [{ from: 2200 }], datesCite: { book: IO, page: 46 }, cite: { book: TM, page: 165 } },
  vtol: { label: "VTOL", techBase: "clan", availability: [{ from: 3060 }], prototypeYear: 3052, datesCite: { book: IO, page: 46 }, cite: { book: TM, page: 165 } },
  umu: { label: "UMU", techBase: "clan", availability: [{ from: 3059 }], prototypeYear: 2840, datesCite: { book: IO, page: 46 }, cite: { book: TM, page: 165 } },
};

export type ManipulatorGroup = "none" | "glove" | "basic" | "claw" | "tool";
export interface ManipulatorRow extends Dated {
  id: string;
  label: string;
  kg: number;
  /** The kind of manipulator the Capabilities table counts it as: a basic manipulator or a battle claw satisfies the requirement its name gives. */
  group: ManipulatorGroup;
  /** Must be mounted in a pair (both arms). */
  pairs: boolean;
  /** Cost per arm in C-bills. */
  cost: number;
  cite: Cite;
}
const MANIP_DATES = (page: number) => ({ datesCite: { book: IO, page } });
const CLAW = { ...MANIP_DATES(45), availability: [{ from: 3050 }], clanAvailability: [{ from: 2868 }], clanPrototypeYear: 2865 };

/** The manipulators (printed p. 166) with their costs (p. 281). The modular equipment adaptor and the cargo lifter (weighed and priced per half ton of capacity, pp. 166 and 281) are later pieces. */
export const MANIPULATORS: ManipulatorRow[] = [
  { id: "none", label: "None", kg: 0, group: "none", pairs: false, cost: 0, availability: [{ from: 1950 }], datesCite: { book: TM, page: 166 }, cite: { book: TM, page: 166 } },
  { id: "armored-glove", label: "Armored glove", kg: 0, group: "glove", pairs: false, cost: 2_500, availability: [{ from: 2200 }], ...MANIP_DATES(45), cite: { book: TM, page: 166 } },
  { id: "basic", label: "Basic manipulator", kg: 0, group: "basic", pairs: false, cost: 5_000, availability: [{ from: 2110 }], ...MANIP_DATES(45), cite: { book: TM, page: 166 } },
  {
    id: "basic-mine", label: "Basic manipulator (mine clearance)", kg: 15, group: "basic", pairs: true, cost: 7_500, availability: [{ from: 3057 }], prototypeYear: 3055,
    clanAvailability: [{ from: 3063 }], ...MANIP_DATES(45), cite: { book: TM, page: 166 },
  },
  { id: "battle-claw", label: "Battle claw", kg: 15, group: "claw", pairs: false, cost: 10_000, ...CLAW, cite: { book: TM, page: 166 } },
  {
    id: "battle-claw-magnets", label: "Battle claw (magnets)", kg: 35, group: "claw", pairs: true, cost: 12_500, availability: [{ from: 3055 }], prototypeYear: 3053,
    clanAvailability: [{ from: 3058 }], ...MANIP_DATES(45), cite: { book: TM, page: 166 },
  },
  {
    id: "battle-claw-vibro", label: "Battle claw (vibro-claws)", kg: 50, group: "claw", pairs: false, cost: 15_000, availability: [{ from: 3054 }], prototypeYear: 3053,
    clanAvailability: [{ from: 3062 }], ...MANIP_DATES(45), cite: { book: TM, page: 166 },
  },
  { id: "heavy-claw", label: "Heavy battle claw", kg: 20, group: "claw", pairs: false, cost: 25_000, ...CLAW, cite: { book: TM, page: 166 } },
  {
    id: "heavy-claw-magnets", label: "Heavy battle claw (magnets)", kg: 40, group: "claw", pairs: true, cost: 31_250, availability: [{ from: 3055 }], prototypeYear: 3053,
    clanAvailability: [{ from: 3058 }], ...MANIP_DATES(45), cite: { book: TM, page: 166 },
  },
  {
    id: "heavy-claw-vibro", label: "Heavy battle claw (vibro-claws)", kg: 60, group: "claw", pairs: false, cost: 30_000, availability: [{ from: 3054 }], prototypeYear: 3053,
    clanAvailability: [{ from: 3062 }], ...MANIP_DATES(45), cite: { book: TM, page: 166 },
  },
  { id: "industrial-drill", label: "Industrial drill", kg: 30, group: "tool", pairs: false, cost: 2_500, availability: [{ from: 2200 }], ...MANIP_DATES(45), cite: { book: TM, page: 166 } },
  { id: "salvage-arm", label: "Salvage arm", kg: 30, group: "tool", pairs: false, cost: 50_000, availability: [{ from: 2415 }], prototypeYear: 2410, ...MANIP_DATES(45), cite: { book: TM, page: 166 } },
];

export interface ArmorRow extends Dated {
  id: string;
  label: string;
  /** Kilograms per armor point by tech base; a missing base means the type is not built there (the table's dash). */
  kg: { "inner-sphere"?: number; clan?: number };
  slots: number;
  /** To-hit modifiers against the suit at short, medium and long range (stealth), and against it by hexes moved, 0, 1, 2 and 3 or more (mimetic). */
  rangeMods?: [number, number, number];
  moveMods?: [number, number, number, number];
  invisibleToProbes?: true;
  ignoresHeat?: true;
  /** Added to the suit's defensive factor in Battle Value (TechManual BV v4.1, Defensive Factor Modifier Table). */
  bvFactor: number;
  /** Battle Value of one armor point: 3.5 for fire resistant armor, 2.5 for the rest. */
  bvPerPoint: number;
  costPerPoint: number;
  cite: Cite;
}
const ARMOR_CITE: Cite = { book: TM, page: 169 };
const ARMOR_DATES: Cite = { book: IO, page: 30 };

/** The armor types (printed p. 169; costs p. 281; dates IO:AE printed p. 30). Weights are TechManual p. 169's for both tech bases, the later source (errata v8.0, 2024) over IO:AE p. 30, which lists basic stealth as Inner Sphere only; the dates are IO:AE's, the Clan ones for basic and standard stealth read as the Inner Sphere ones without the extinction (inferred). */
export const ARMOR_TYPES: ArmorRow[] = [
  {
    id: "standard", label: "Standard", kg: { "inner-sphere": 50, clan: 25 }, slots: 0, bvFactor: 0, bvPerPoint: 2.5, costPerPoint: 10_000, cite: ARMOR_CITE,
    // Inner Sphere prototype 3050, in use from 3054 (the table's Common column: the production year printed is the Clan's, 2868).
    availability: [{ from: 3054 }], prototypeYear: 3050, clanAvailability: [{ from: 2868 }], yearsInferred: true, datesCite: ARMOR_DATES,
  },
  {
    id: "standard-advanced", label: "Standard (advanced)", kg: { "inner-sphere": 40 }, slots: 5, techBase: "inner-sphere", bvFactor: 0, bvPerPoint: 2.5, costPerPoint: 12_500, cite: ARMOR_CITE,
    availability: [{ from: 3057 }], datesCite: ARMOR_DATES,
  },
  {
    id: "standard-prototype", label: "Standard (prototype)", kg: { "inner-sphere": 100 }, slots: 4, techBase: "inner-sphere", rulesLevel: "experimental", bvFactor: 0, bvPerPoint: 2.5, costPerPoint: 10_000, cite: ARMOR_CITE,
    availability: [{ from: 3050 }], yearsInferred: true, datesCite: ARMOR_DATES,
  },
  {
    id: "stealth-basic", label: "Stealth (basic)", kg: { "inner-sphere": 55, clan: 30 }, slots: 3, rangeMods: [0, 1, 2], invisibleToProbes: true, bvFactor: 0.2, bvPerPoint: 2.5, costPerPoint: 12_000, cite: ARMOR_CITE,
    availability: [{ from: 2710, to: 2770 }, { from: 3052 }], prototypeYear: 2700, clanAvailability: [{ from: 2710 }], yearsInferred: true, datesCite: ARMOR_DATES,
  },
  {
    id: "stealth-standard", label: "Stealth (standard)", kg: { "inner-sphere": 60, clan: 35 }, slots: 4, rangeMods: [1, 1, 2], invisibleToProbes: true, bvFactor: 0.2, bvPerPoint: 2.5, costPerPoint: 15_000, cite: ARMOR_CITE,
    availability: [{ from: 2720, to: 2770 }, { from: 3053 }], prototypeYear: 2710, clanAvailability: [{ from: 2720 }], yearsInferred: true, datesCite: ARMOR_DATES,
  },
  {
    id: "stealth-improved", label: "Stealth (improved)", kg: { "inner-sphere": 60, clan: 35 }, slots: 5, rangeMods: [1, 2, 3], invisibleToProbes: true, bvFactor: 0.3, bvPerPoint: 2.5, costPerPoint: 20_000, cite: ARMOR_CITE,
    availability: [{ from: 3057 }], prototypeYear: 3055, clanAvailability: [{ from: 3058 }], datesCite: ARMOR_DATES,
  },
  {
    id: "stealth-prototype", label: "Stealth (prototype)", kg: { "inner-sphere": 100 }, slots: 4, techBase: "inner-sphere", rangeMods: [0, 1, 2], invisibleToProbes: true, rulesLevel: "experimental",
    bvFactor: 0.2, bvPerPoint: 2.5, costPerPoint: 50_000, cite: ARMOR_CITE, availability: [{ from: 3052, to: 3055 }], prototypeYear: 3050, datesCite: ARMOR_DATES,
  },
  {
    id: "fire-resistant", label: "Fire resistant", kg: { clan: 30 }, slots: 5, techBase: "clan", ignoresHeat: true, bvFactor: 0, bvPerPoint: 3.5, costPerPoint: 10_000, cite: ARMOR_CITE,
    availability: [{ from: 3058 }], prototypeYear: 3052, datesCite: ARMOR_DATES,
  },
  {
    id: "mimetic", label: "Mimetic", kg: { "inner-sphere": 50 }, slots: 7, techBase: "inner-sphere", moveMods: [3, 2, 1, 0], bvFactor: 0.3, bvPerPoint: 2.5, costPerPoint: 15_000, cite: ARMOR_CITE,
    availability: [{ from: 3061 }], prototypeYear: 3058, datesCite: ARMOR_DATES,
  },
  // Laser-reflective and reactive armor for battle armor (TO:AUE printed p. 92, Advanced Armor Table: 7 slots, 55 / 30 kg and 60 / 35 kg a point, Inner
  // Sphere / Clan; price p. 225, 37,000 for each, taken as a price per point like the other rows; Experimental, rules pp. 93-94; read against the page
  // images). TO:AUE prints only a prototype year (3074P, 3075P), so the production year is IO:AE printed p. 30's (circa 3089 and 3093, Inner Sphere and
  // Clan alike). Battle Value is that of fire resistant armor (TO:AUE p. 192: 3.5 a point, no defensive factor).
  {
    id: "laser-reflective", label: "Laser-reflective", kg: { "inner-sphere": 55, clan: 30 }, slots: 7, rulesLevel: "experimental", bvFactor: 0, bvPerPoint: 3.5, costPerPoint: 37_000, cite: { book: TO, page: 92 },
    availability: [{ from: 3089 }], prototypeYear: 3074, datesCite: ARMOR_DATES,
  },
  {
    id: "reactive", label: "Reactive", kg: { "inner-sphere": 60, clan: 35 }, slots: 7, rulesLevel: "experimental", bvFactor: 0, bvPerPoint: 3.5, costPerPoint: 37_000, cite: { book: TO, page: 92 },
    availability: [{ from: 3093 }], prototypeYear: 3075, datesCite: ARMOR_DATES,
  },
];

/** The Clan Technology Multiplier on chassis, motive, manipulator and armor costs (printed p. 281), and the training cost of each trooper (printed p. 285). */
export const COST_FIGURES = { clanMultiplier: 1.1, trainingCost: { "inner-sphere": 150_000, clan: 200_000 }, cite: { book: TM, page: 285 } as Cite };

/** Weapon limits per location (Battle Armor Weapon Limits Table, printed p. 170, errata v8.0): anti-'Mech weapons. An arm has one, the humanoid body two, the quad body four. */
export const WEAPON_LIMITS = { arm: 1, body: 2, quadBody: 4, cite: { book: TM, page: 170 } as Cite };

/** Missile ammunition takes one slot for each four shots, rounded up, in the launcher's location (printed p. 171). */
export const SHOTS_PER_SLOT = 4;

/** Squad (Inner Sphere) and Point (Clan) sizes the book recommends (printed p. 172) and the most a unit holds (the record sheet's six rows). */
export const SQUAD = { max: 6, recommended: { "inner-sphere": 4, clan: 5 }, cite: { book: TM, page: 172 } as Cite };

/** Battle armor units are named by tech base: a Clan Point, an Inner Sphere squad. */
export const unitWord = (techBase: string): string => (techBase === "clan" ? "Point" : "Squad");

/** Narrows a record motive kind (any string is kept in a record) to one the tables know. */
export const isMotive = (kind: string): kind is MotiveKind => Object.hasOwn(MOTIVE, kind);
export const weightClassOf = (id: string): WeightClassRow | undefined => WEIGHT_CLASSES.find((row) => row.id === id);
export const armorTypeOf = (id: string): ArmorRow | undefined => ARMOR_TYPES.find((row) => row.id === id);
export const manipulatorOf = (id: string): ManipulatorRow | undefined => MANIPULATORS.find((row) => row.id === id);

/** The weight class a total suit weight falls in (printed p. 163), or undefined above 2,000 kg or below 80. */
export const classForKg = (kg: number): WeightClassRow | undefined => WEIGHT_CLASSES.find((row) => kg >= row.minKg && kg <= row.maxKg);

export type { Span };
