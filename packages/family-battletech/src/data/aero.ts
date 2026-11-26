// BattleTech: AeroTech. The five editions of the one aerospace game and, for each, the unit types it builds: weight range and
// step, the level (current edition only), the record sheet kind, and the armor locations and firing arcs. Figures and identifiers
// only, every row with the printed page it was read from (against the page image) and whether it was settled there. Page numbers
// are printed pages. Plain data; nothing runs here but the lookups at the end. The fighter construction figures follow the type rows.
import { ARMOR } from "./chassis";
import type { RulesLevel } from "./chassis";

export type AeroType = "conventional-fighter" | "aerospace-fighter" | "small-craft" | "dropship" | "jumpship" | "warship" | "space-station";
export type AeroShape = "aerodyne" | "spheroid";

/** Tons. A limit the book does not print is left out. */
export interface WeightBand {
  min?: number;
  max?: number;
  step?: number;
}

/** What one unit type (or one shape of it) is built with. Location codes: CP cockpit, NO nose, LW and RW left and right wing, LS and
 * RS left and right side, FU fuselage, EN engine, FO fore (BattleSpace's name for the nose), FL and FR fore-left and fore-right,
 * AL and AR aft-left and aft-right, AF aft, LB and RB left and right broadside. One code is one name in every edition. */
export interface AeroFigures {
  weight: WeightBand;
  /** The kind of record sheet the edition's books print for it. */
  sheet: string;
  /** Armor locations (facings). */
  armor: string[];
  /** Firing arcs (the equipment areas on AeroTech's sheet). */
  arcs: string[];
  /** Wing arcs may hold weapons that fire aft. */
  wingsFireAft?: true;
}

export interface AeroTypeRow extends AeroFigures {
  type: AeroType;
  label: string;
  /** Rules level; the current edition only (older editions predate the levels). */
  level?: RulesLevel;
  /** Figures that differ by hull shape; the row's own figures hold for a shape not listed. */
  shapes?: Partial<Record<AeroShape, AeroFigures>>;
  note?: string;
  cite: string;
  checked: "page" | "text";
}

export interface AeroBook {
  role: "play" | "construction" | "record-sheets";
  /** A title from BOOKS in data/editions.ts. */
  title: string;
  printing: string;
  errata?: string;
}

export interface AeroEdition {
  id: string;
  name: string;
  books: AeroBook[];
  types: AeroTypeRow[];
}

/** The edition a record without one is read under: the current rules, the AeroTech default. */
export const DEFAULT_AERO_EDITION = "tw-tm-so";

export const AERO_LOCATION_NAMES: Record<string, string> = {
  CP: "Cockpit",
  NO: "Nose",
  FO: "Fore",
  LW: "Left Wing",
  RW: "Right Wing",
  FU: "Fuselage",
  EN: "Engine",
  LS: "Left Side",
  RS: "Right Side",
  FL: "Fore-Left",
  FR: "Fore-Right",
  AL: "Aft-Left",
  AR: "Aft-Right",
  LB: "Left Broadside",
  RB: "Right Broadside",
  AF: "Aft",
};

const AT1 = "AeroTech";
const BS = "BattleSpace";
const AT2 = "AeroTech 2";
const AT2R = "AeroTech 2: Revised Edition";
const TM = "TechManual";
const SOAA = "Strategic Operations: Advanced Aerospace Rules";
const cite = (book: string, pages: string): string => `${book}, ${/[-,]/.test(pages) ? "pp." : "p."} ${pages}`;

// Location sets. AeroTech's fighter has six armor areas and four equipment areas; later fighters and aerodyne craft have four
// facings and arcs; a spheroid craft has side facings and six arcs; large craft have six facings and the arcs below.
const AT1_ARMOR = ["CP", "NO", "LW", "RW", "FU", "EN"];
const WING_ARMOR = ["NO", "LW", "RW", "AF"];
const SIDE_ARMOR = ["NO", "LS", "RS", "AF"];
const WING_ARCS = ["NO", "LW", "RW", "AF"];
const SIX_ARCS = ["NO", "FL", "FR", "AL", "AR", "AF"];
const BROADSIDE_ARCS = ["NO", "FL", "FR", "LB", "RB", "AL", "AR", "AF"];
const LARGE_ARMOR = ["NO", "FL", "FR", "AL", "AR", "AF"];
// BattleSpace names the front "Fore" where the other books say "Nose" (BattleSpace p. 6 and the p. 78 weapon location table).
const BS_SIDE_ARMOR = ["FO", "LS", "RS", "AF"];
const BS_SIX_ARCS = ["FO", "FL", "FR", "AL", "AR", "AF"];
const BS_LARGE_ARMOR = BS_SIX_ARCS;
const BS_BROADSIDE_ARCS = ["FO", "FL", "FR", "LB", "RB", "AL", "AR", "AF"];
const AFT = { wingsFireAft: true } as const;

const band = (min: number | undefined, max: number | undefined, step: number | undefined): WeightBand => ({
  ...(min === undefined ? {} : { min }),
  ...(max === undefined ? {} : { max }),
  ...(step === undefined ? {} : { step }),
});

// The three AeroTech 2 books (AeroTech 2, Revised, and BattleSpace's conversion onto them) share the arc and facing tables on
// AeroTech 2 p. 50 and AeroTech 2 Revised p. 71; their sheets are AeroTech 2 pp. 102-104.
const AT2_TYPES: AeroTypeRow[] = [
  { type: "conventional-fighter", label: "Conventional fighter", weight: band(10, 50, 5), sheet: "fighter", armor: WING_ARMOR, arcs: WING_ARCS, cite: cite(AT2, "42, 50, 104"), checked: "page" },
  { type: "aerospace-fighter", label: "Aerospace fighter", weight: band(10, 100, 5), sheet: "fighter", armor: WING_ARMOR, arcs: WING_ARCS, cite: cite(AT2, "42, 50, 104"), checked: "page" },
  {
    type: "small-craft",
    label: "Small craft",
    weight: band(100, 200, 5),
    sheet: "dropship",
    armor: SIDE_ARMOR,
    arcs: WING_ARCS,
    ...AFT,
    shapes: {
      aerodyne: { weight: band(100, 200, 5), sheet: "dropship", armor: WING_ARMOR, arcs: WING_ARCS, ...AFT },
      spheroid: { weight: band(100, 200, 5), sheet: "dropship", armor: SIDE_ARMOR, arcs: WING_ARCS, ...AFT },
    },
    note: "built as a civilian DropShip; the DropShip sheet serves it; wing arcs for both shapes (p. 16), the sheets book names the spheroid's armor sides and the aerodyne's wings",
    cite: `${cite(AT2, "16, 42, 50, 103")}; AeroTech 2: Record Sheets, PDF index 188, 196`,
    checked: "page",
  },
  {
    type: "dropship",
    label: "DropShip",
    weight: band(200, 100000, 100),
    sheet: "dropship",
    armor: SIDE_ARMOR,
    arcs: SIX_ARCS,
    shapes: {
      aerodyne: { weight: band(200, 35000, 100), sheet: "dropship", armor: WING_ARMOR, arcs: WING_ARCS, ...AFT },
      spheroid: { weight: band(200, 100000, 100), sheet: "dropship", armor: SIDE_ARMOR, arcs: SIX_ARCS },
    },
    note: "armor facings follow the later Record Sheets book (wings); the core rulebook sheet shows sides",
    cite: `${cite(AT2, "16, 42, 50, 103")}; AeroTech 2: Record Sheets, PDF index 199`,
    checked: "page",
  },
  { type: "jumpship", label: "JumpShip", weight: band(50000, 500000, 1000), sheet: "large-craft", armor: LARGE_ARMOR, arcs: SIX_ARCS, cite: cite(AT2, "42, 50, 102"), checked: "page" },
  { type: "warship", label: "WarShip", weight: band(100000, 2500000, 10000), sheet: "large-craft", armor: LARGE_ARMOR, arcs: BROADSIDE_ARCS, cite: cite(AT2, "42, 50, 102"), checked: "page" },
  {
    type: "space-station",
    label: "Space station",
    weight: band(2000, 2500000, 500),
    sheet: "large-craft",
    armor: LARGE_ARMOR,
    arcs: SIX_ARCS,
    note: "no broadside arcs, as for the JumpShip (the later Strategic Operations errata)",
    cite: cite(AT2, "42, 50, 102"),
    checked: "page",
  },
];

/** The sheet kind of a type in the editions that print one sheet per kind and shape (Revised index 157-166; the current blank sheets). */
const sheetOf = (type: AeroType, shape?: AeroShape): string => (shape === undefined ? type : `${shape}-${type === "small-craft" ? "small-craft" : "dropship"}`);

/** Revised prints the same classes, weights and tables (pp. 60, 71) and its own sheets, one per kind. Its sheets give both small craft
 * shapes and the aerodyne DropShip wings for armor (pp. 159-161) and the spheroid DropShip sides (p. 162); arcs as AeroTech 2 (p. 23). */
const AT2R_WINGS: Partial<Record<AeroType, Partial<Record<AeroShape, Pick<AeroFigures, "armor">>>>> = {
  "small-craft": { aerodyne: { armor: WING_ARMOR }, spheroid: { armor: WING_ARMOR } },
  dropship: { aerodyne: { armor: WING_ARMOR } },
};
const AT2R_TYPES: AeroTypeRow[] = AT2_TYPES.map((row) => {
  const shapes = Object.fromEntries(Object.entries(row.shapes ?? {}).map(([shape, figures]) => [shape, { ...figures, ...AT2R_WINGS[row.type]?.[shape as AeroShape], sheet: sheetOf(row.type, shape as AeroShape) }]));
  const { note, ...rest } = row;
  return {
    ...rest,
    ...(note !== undefined && row.shapes === undefined ? { note } : {}),
    ...(row.type === "small-craft" ? { armor: WING_ARMOR } : {}),
    cite: cite(AT2R, row.shapes === undefined ? "23, 60, 71" : "23, 60, 71, 159-162"),
    sheet: sheetOf(row.type, row.shapes === undefined ? undefined : "spheroid"),
    ...(row.shapes === undefined ? {} : { shapes }),
  };
});

export const AERO_EDITIONS: AeroEdition[] = [
  {
    id: "aerotech-1986",
    name: "AeroTech (1986)",
    books: [
      { role: "play", title: AT1, printing: "FASA 1609" },
      { role: "construction", title: AT1, printing: "FASA 1609" },
    ],
    types: [
      { type: "aerospace-fighter", label: "Aerospace fighter", weight: band(10, 100, 5), sheet: "fighter", armor: AT1_ARMOR, arcs: WING_ARCS, cite: cite(AT1, "32-33"), checked: "page" },
    ],
  },
  {
    id: "battlespace",
    name: "BattleSpace (1993)",
    books: [
      { role: "play", title: BS, printing: "FASA 1680" },
      { role: "construction", title: BS, printing: "FASA 1680" },
    ],
    types: [
      {
        type: "dropship",
        label: "DropShip",
        weight: band(100, 100000, undefined),
        sheet: "battlespace",
        armor: BS_SIDE_ARMOR,
        arcs: BS_SIX_ARCS,
        shapes: { aerodyne: { weight: band(100, 35000, undefined), sheet: "battlespace", armor: BS_SIDE_ARMOR, arcs: BS_SIX_ARCS }, spheroid: { weight: band(100, 100000, undefined), sheet: "battlespace", armor: BS_SIDE_ARMOR, arcs: BS_SIX_ARCS } },
        note: "four armor facings and six arcs for both shapes; the front is Fore, not Nose",
        cite: cite(BS, "6, 64, 78"),
        checked: "page",
      },
      {
        type: "jumpship",
        label: "JumpShip",
        weight: band(undefined, 500000, undefined),
        sheet: "battlespace",
        armor: BS_LARGE_ARMOR,
        arcs: BS_SIX_ARCS,
        note: "no minimum mass is printed; the drive may not be under 2,500 t",
        cite: cite(BS, "6, 14, 72"),
        checked: "page",
      },
      { type: "warship", label: "WarShip", weight: band(undefined, 2500000, undefined), sheet: "battlespace", armor: BS_LARGE_ARMOR, arcs: BS_BROADSIDE_ARCS, cite: cite(BS, "6, 14, 72"), checked: "page" },
      {
        type: "space-station",
        label: "Space station",
        weight: band(undefined, undefined, undefined),
        sheet: "battlespace",
        armor: BS_LARGE_ARMOR,
        arcs: BS_SIX_ARCS,
        note: "built by the JumpShip and WarShip steps; no weight range is printed",
        cite: cite(BS, "6, 14, 76"),
        checked: "page",
      },
    ],
  },
  {
    id: "aerotech2",
    name: "AeroTech 2",
    books: [
      { role: "play", title: AT2, printing: "FASA 1718, 2000 printing", errata: "v1.2 (11 January 2003)" },
      { role: "construction", title: AT2, printing: "FASA 1718, 2000 printing", errata: "v1.2 (11 January 2003)" },
      { role: "record-sheets", title: "AeroTech 2: Record Sheets", printing: "FanPro 10973, 2002" },
    ],
    types: AT2_TYPES,
  },
  {
    id: "aerotech2-revised",
    name: "AeroTech 2 Revised (2004)",
    books: [
      { role: "play", title: AT2R, printing: "FanPro 35011, 2004" },
      { role: "construction", title: AT2R, printing: "FanPro 35011, 2004" },
    ],
    types: AT2R_TYPES,
  },
  {
    id: "tw-tm-so",
    name: "Total Warfare / TechManual / Strategic Operations",
    books: [
      { role: "play", title: "Total Warfare", printing: "corrected eleventh printing" },
      { role: "construction", title: TM, printing: "corrected sixth printing", errata: "v8.0 (22 August 2024)" },
      { role: "construction", title: SOAA, printing: "third printing, 2021", errata: "v5.0 (15 November 2024)" },
    ],
    types: [
      { type: "conventional-fighter", label: "Conventional fighter", weight: band(5, 50, 5), level: "standard", sheet: "conventional-fighter", armor: WING_ARMOR, arcs: WING_ARCS, ...AFT, cite: cite(TM, "182, 184, 191"), checked: "page" },
      { type: "aerospace-fighter", label: "Aerospace fighter", weight: band(5, 100, 5), level: "standard", sheet: "aerospace-fighter", armor: WING_ARMOR, arcs: WING_ARCS, ...AFT, cite: cite(TM, "182, 184, 191"), checked: "page" },
      {
        type: "small-craft",
        label: "Small craft",
        weight: band(100, 200, 5),
        level: "standard",
        sheet: "spheroid-small-craft",
        armor: SIDE_ARMOR,
        arcs: SIX_ARCS,
        shapes: { aerodyne: { weight: band(100, 200, 5), sheet: "aerodyne-small-craft", armor: WING_ARMOR, arcs: WING_ARCS, ...AFT } },
        cite: cite(TM, "182, 184, 191"),
        checked: "page",
      },
      {
        type: "dropship",
        label: "DropShip",
        weight: band(200, 100000, 100),
        level: "standard",
        sheet: "spheroid-dropship",
        armor: SIDE_ARMOR,
        arcs: SIX_ARCS,
        shapes: { aerodyne: { weight: band(200, 35000, 100), sheet: "aerodyne-dropship", armor: WING_ARMOR, arcs: WING_ARCS, ...AFT }, spheroid: { weight: band(200, 100000, 100), sheet: "spheroid-dropship", armor: SIDE_ARMOR, arcs: SIX_ARCS } },
        cite: cite(TM, "182, 184, 191"),
        checked: "page",
      },
      { type: "jumpship", label: "JumpShip", weight: band(50000, 500000, 1000), level: "advanced", sheet: "jumpship", armor: LARGE_ARMOR, arcs: SIX_ARCS, cite: cite(SOAA, "133, 140"), checked: "page" },
      { type: "warship", label: "WarShip", weight: band(100000, 2500000, 10000), level: "advanced", sheet: "warship", armor: LARGE_ARMOR, arcs: BROADSIDE_ARCS, cite: cite(SOAA, "133, 140"), checked: "page" },
      { type: "space-station", label: "Space station", weight: band(2000, 2500000, 500), level: "advanced", sheet: "space-station", armor: LARGE_ARMOR, arcs: SIX_ARCS, cite: cite(SOAA, "133, 140"), checked: "page" },
    ],
  },
];

/** An edition's name as screens show it; an id the tool does not know shows as it is. */
export function aeroEditionName(id: string): string {
  return AERO_EDITIONS.find((e) => e.id === id)?.name ?? id;
}

/** The unit types an edition builds, in the order the books list them; an unknown edition id gives an empty list. */
export function aeroTypesFor(editionId: string): AeroTypeRow[] {
  return AERO_EDITIONS.find((e) => e.id === editionId)?.types ?? [];
}

/** The figures of a type row for a hull shape: the shape's own where the row has them, else the row's. */
export function aeroFigures(row: AeroTypeRow, shape?: AeroShape): AeroFigures {
  return (shape === undefined ? undefined : row.shapes?.[shape]) ?? row;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Fighter construction figures (conventional and aerospace fighters). One table, never repeated: a figure that several editions print
// the same is one row naming each of them, with the page each prints it on; an edition holds a figure of its own only where its book
// prints a different one. A group names every edition at most once (a test fails otherwise), and an edition a group does not name
// prints nothing for it (AeroTech, 1986, has no conventional fighters and no double heat sinks, so those groups leave it out).
// Each edition keeps its own book and that book's errata: the newer wins only inside one edition's sources (AeroTech 2 with its
// errata v1.2). Where a figure comes from the errata the cite says so. The engine weights are the shared Master Engine Table
// (ENGINE_WEIGHTS and ENGINE_TYPES in data/chassis.ts); AeroTech's own table equals its standard fusion column and AeroTech 2's turbine
// engine weighs the table's internal combustion column (a test proves both), so neither is written again here. Page numbers are printed.
// ---------------------------------------------------------------------------------------------------------------------------------

export type FighterKind = "aerospace" | "conventional";

/** The edition ids of the editions that build fighters (BattleSpace builds none). */
export const FIGHTER_EDITIONS = { at1: "aerotech-1986", at2: "aerotech2", at2r: "aerotech2-revised", current: "tw-tm-so" } as const;
const E = FIGHTER_EDITIONS;

/** One value shared by the editions that print it, and the page each one prints it on. */
export interface SharedFigure<T> {
  editions: string[];
  value: T;
  /** The cite of each edition, keyed by edition id. */
  cite: Record<string, string>;
  checked: "page" | "text";
  note?: string;
}
export type FigureGroup<T> = SharedFigure<T>[];
/** A group read separately for aerospace and conventional fighters. */
export type KindGroup<T> = Record<FighterKind, FigureGroup<T>>;

/** The value an edition prints in a group; undefined when the edition's book prints none. */
export function figureOf<T>(group: FigureGroup<T>, editionId: string): T | undefined {
  return group.find((row) => row.editions.includes(editionId))?.value;
}
/** The value an edition prints for one kind of fighter. */
export function kindFigureOf<T>(group: KindGroup<T>, kind: FighterKind, editionId: string): T | undefined {
  return figureOf(group[kind], editionId);
}

const BOOK_OF: Record<string, string> = { [E.at1]: AT1, [E.at2]: AT2, [E.at2r]: AT2R, [E.current]: TM };
/** Cites for the editions named in `pages` (edition id to printed pages). */
const pagesOf = (pages: Partial<Record<string, string>>): Record<string, string> =>
  Object.fromEntries(Object.entries(pages).map(([edition, p]) => [edition, cite(BOOK_OF[edition] ?? edition, p ?? "")]));
const share = <T>(pages: Partial<Record<string, string>>, value: T, note?: string): SharedFigure<T> => ({
  editions: Object.keys(pages),
  value,
  cite: pagesOf(pages),
  checked: "page",
  ...(note === undefined ? {} : { note }),
});
const ALL = (at1: string, at2: string, at2r: string, tm: string) => ({ [E.at1]: at1, [E.at2]: at2, [E.at2r]: at2r, [E.current]: tm });
const LATER = (at2: string, at2r: string, tm: string) => ({ [E.at2]: at2, [E.at2r]: at2r, [E.current]: tm });

export interface ArmsFigure {
  /** Items an arc may hold (weapons, and in AeroTech, ammunition too). */
  items: number;
  /** AeroTech counts ammunition storage as an item; the later books keep ammunition in the fuselage. */
  countsAmmo?: true;
  /** Most tons of weapons the aft arc may hold. */
  aftTons?: number;
}
export interface ArmorLimitFigure {
  /** Armor points a ton of the fighter may carry. */
  pointsPerTon: number;
  /** "tons": the limit is a weight of armor, rounded down to a half ton (AeroTech 2 and Revised); "points": the limit is the points (TechManual). */
  unit: "tons" | "points";
}

export interface FighterFigures {
  ratingOffset: KindGroup<number>;
  ratingLimits: FigureGroup<{ min: number; max: number }>;
  maxThrustFactor: FigureGroup<number>;
  siTonsDivisor: FigureGroup<number>;
  engineTypes: KindGroup<string[]>;
  conventionalFusionFactor: FigureGroup<number>;
  fuelPoints: KindGroup<number>;
  fuelLot: FigureGroup<number>;
  controls: KindGroup<number>;
  cockpitArmor: FigureGroup<number>;
  armorBasePoints: FigureGroup<number>;
  armorLot: FigureGroup<number>;
  armorRounding: FigureGroup<"nearest" | "down">;
  armorLimit: KindGroup<ArmorLimitFigure>;
  freeHeatSinks: FigureGroup<{ fusion: number; ice: number }>;
  /** A conventional fighter must carry sinks for the heat of all its energy weapons (its non-energy weapons make none). */
  energyHeatSinks: FigureGroup<true>;
  heatSinkTypes: KindGroup<string[]>;
  arms: FigureGroup<ArmsFigure>;
  wingsMatch: FigureGroup<boolean>;
  hardpointTons: FigureGroup<number>;
  powerAmplifier: FigureGroup<number>;
}

export const FIGHTER_FIGURES: FighterFigures = {
  /** Engine Rating = tons x (Safe Thrust - offset). */
  ratingOffset: {
    aerospace: [share(ALL("32", "42", "61", "185"), 2)],
    conventional: [share(LATER("42", "61", "185"), 0)],
  },
  /** The smallest and largest Engine Rating of a fighter. */
  ratingLimits: [share(ALL("33", "42", "61", "185"), { min: 10, max: 400 })],
  /** Max Thrust (AeroTech: overthrust) is Safe Thrust times this, rounded up. */
  maxThrustFactor: [share(ALL("7", "42", "61", "185"), 1.5)],
  /** Structural Integrity is the higher of Safe Thrust and the tonnage over this, rounded down; fighters spend no mass on it. AeroTech states it on p. 7 and its examples follow it (its p. 32 wording is only permissive). */
  siTonsDivisor: [share(ALL("7", "44", "62", "187"), 10)],
  /** Engine type ids (ENGINE_TYPES) each kind may use. AeroTech 2 and Revised call the conventional "turbine" engine what TechManual calls internal combustion ("ice"); Light came to AeroTech 2 by its errata. */
  engineTypes: {
    aerospace: [
      share({ [E.at1]: "33" }, ["standard"], "AeroTech prints one engine table, the standard fusion weights"),
      share({ [E.at2]: "42; errata v1.2", [E.at2r]: "61" }, ["standard", "xl", "xl-clan", "light"]),
      share({ [E.current]: "184-185" }, ["standard", "light", "xl", "xl-clan", "compact"]),
    ],
    conventional: [share(LATER("44", "61", "185"), ["standard", "ice"], "errata v8.0 reads the TechManual row as ICE or fusion by tech base; no XL, Light or Compact for a conventional fighter")],
  },
  /** A conventional fighter's fusion engine weighs this many times the table's weight, rounded up to a half ton. */
  conventionalFusionFactor: [share(LATER("42, 44", "61", "185"), 1.5)],
  /** Fuel points a ton of fuel gives. */
  fuelPoints: {
    aerospace: [share({ [E.at1]: "32" }, 15), share(LATER("45", "63", "186"), 80)],
    conventional: [share(LATER("45", "63", "186"), 160)],
  },
  /** Fuel is carried in lots of this many tons (AeroTech prints none). */
  fuelLot: [share({ [E.at2]: "45", [E.at2r]: "62" }, 1), share({ [E.current]: "186" }, 0.5)],
  /** A cockpit and controls weigh this many tons (aerospace) or this share of the tonnage, rounded up to a half ton (conventional). */
  controls: {
    aerospace: [share(ALL("32", "44", "62", "189"), 3)],
    // Conflict 46 in the archive ledger.
    conventional: [share(LATER("44", "62", "189"), 0.1, "AeroTech 2 Revised prints 10 tons in a percent column; read as 10 percent like the other two")],
  },
  /** Armor points the cockpit gives free, on the cockpit location (AeroTech only; its six armor areas include the cockpit). */
  cockpitArmor: [share({ [E.at1]: "32" }, 10)],
  /** Armor points a ton of standard armor gives a fighter. */
  armorBasePoints: [share(ALL("32", "45", "63", "192"), 16)],
  /** Armor is bought in lots of this many tons. */
  armorLot: [share(ALL("32", "42", "60", "190"), 0.5)],
  /** How a ton of armor is turned into whole points: AeroTech 2 and Revised round to the nearest, TechManual rounds down. */
  armorRounding: [share({ [E.at2]: "45-46", [E.at2r]: "63" }, "nearest" as const), share({ [E.current]: "191" }, "down" as const)],
  /** The most armor a fighter may carry; absent for aerospace fighters in the books that print none. */
  armorLimit: {
    aerospace: [share({ [E.current]: "191" }, { pointsPerTon: 8, unit: "points" })],
    conventional: [share({ [E.at2]: "46", [E.at2r]: "63" }, { pointsPerTon: 1, unit: "tons" }), share({ [E.current]: "191" }, { pointsPerTon: 1, unit: "points" })],
  },
  /** Heat sinks that come free with the engine: with any fusion engine, none with an internal combustion (turbine) one. */
  freeHeatSinks: [share(ALL("33", "48", "67", "193"), { fusion: 10, ice: 0 })],
  /** A conventional fighter must carry enough sinks (the free ones count) for the heat of all its energy weapons. AeroTech 2 p. 46 by its errata v1.2 (the book printed that such a fighter may not mount energy weapons), Revised p. 64 (which points to p. 20), TechManual p. 193. */
  energyHeatSinks: [share(LATER("46; errata v1.2", "64, 20", "193"), true)],
  /** Heat sink types each kind may use, where the book restricts them (a conventional fighter: single sinks only). */
  heatSinkTypes: {
    aerospace: [share({ [E.at1]: "33" }, ["single"]), share(LATER("48", "67", "193"), ["single", "double"])],
    conventional: [share({ [E.current]: "193" }, ["single"])],
  },
  /** Weapons an arc may hold; construction can never raise it for a fighter. */
  arms: [share({ [E.at1]: "33" }, { items: 6, countsAmmo: true, aftTons: 2 }), share(LATER("47", "66", "196"), { items: 5 })],
  /** The left and right wing arcs must hold the same weapons (AeroTech lets them differ). */
  wingsMatch: [share(LATER("46", "66", "195"), true)],
  /** A fighter has one external stores hardpoint for each this many tons, rounded down. */
  hardpointTons: [share({ [E.current]: "196" }, 5)],
  /** A turbine (internal combustion) conventional fighter with energy weapons carries power amplifiers of this share of their tons, rounded up to a half ton. */
  powerAmplifier: [share({ [E.at2]: "46; errata v1.2", [E.at2r]: "64", [E.current]: "195" }, 0.1)],
};

export interface AeroArmorType {
  id: string;
  name: string;
  techBase: "inner-sphere" | "clan" | "both";
  /** The 'Mech armor row (ARMOR in data/chassis.ts) with the same points-a-ton multiplier: the aerospace table prints the same factors (TechManual p. 192: 16.96, 17.92, 19.2, 19.84 on the base 16), so the multiplier is read from there, not written again. */
  like: string;
  /** Arcs that lose one weapon slot to the armor (a fighter only). */
  lostSlots: string[];
  /** The editions that offer it, with their pages. */
  editions: string[];
  cite: Record<string, string>;
  checked: "page" | "text";
}

/** Fighter armor types. Ferro-aluminum takes a slot in each wing in AeroTech 2 and Revised (four weapons a wing) and in TechManual, whose table also prices the Light and Heavy kinds. */
export const FIGHTER_ARMOR_TYPES: AeroArmorType[] = [
  { id: "standard", name: "Standard", techBase: "both", like: "standard", lostSlots: [], ...typeOffer(ALL("32", "45", "63", "192")) },
  { id: "ferro-aluminum", name: "Ferro-Aluminum (I.S.)", techBase: "inner-sphere", like: "ferro-fibrous", lostSlots: ["LW", "RW"], ...typeOffer({ [E.at2]: "46-47", [E.at2r]: "64, 66", [E.current]: "192" }) },
  { id: "ferro-aluminum-clan", name: "Ferro-Aluminum (Clan)", techBase: "clan", like: "ferro-fibrous-clan", lostSlots: ["LW", "RW"], ...typeOffer({ [E.at2]: "46-47", [E.at2r]: "64, 66", [E.current]: "192" }) },
  { id: "light-ferro-aluminum", name: "Light Ferro-Aluminum", techBase: "inner-sphere", like: "light-ferro-fibrous", lostSlots: ["AF"], ...typeOffer({ [E.current]: "192" }) },
  { id: "heavy-ferro-aluminum", name: "Heavy Ferro-Aluminum", techBase: "inner-sphere", like: "heavy-ferro-fibrous", lostSlots: ["NO", "LW", "RW", "AF"], ...typeOffer({ [E.current]: "192" }) },
];
function typeOffer(pages: Partial<Record<string, string>>): Pick<AeroArmorType, "editions" | "cite" | "checked"> {
  return { editions: Object.keys(pages), cite: pagesOf(pages), checked: "page" };
}

/** The armor types an edition offers fighters; an unknown edition offers none. */
export function fighterArmorTypes(editionId: string): AeroArmorType[] {
  return FIGHTER_ARMOR_TYPES.filter((t) => t.editions.includes(editionId));
}

/** Armor points a ton of the type gives a fighter in an edition (the base times the type's multiplier), or undefined when the type or the edition's base is unknown. */
export function fighterArmorPointsPerTon(typeId: string, editionId: string): number | undefined {
  const type = FIGHTER_ARMOR_TYPES.find((t) => t.id === typeId);
  const base = figureOf(FIGHTER_FIGURES.armorBasePoints, editionId);
  const multiplier = type && Object.hasOwn(ARMOR.types, type.like) ? ARMOR.types[type.like]?.multiplier : undefined;
  return base === undefined || multiplier === undefined ? undefined : Math.round(base * multiplier * 1e6) / 1e6;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Small craft and DropShip construction figures (AeroTech 2, AeroTech 2 Revised and the current rules). Same shape as the fighter figures
// above: one row per value, each edition named once with the page it prints it on, an edition holding a figure of its own only where its
// book prints a different one. AeroTech (1986) and BattleSpace build none of these (BattleSpace has its own DropShip step, a later piece).
// Each edition keeps its own book and that book's errata (AeroTech 2 with its errata v1.2; where a figure comes from the errata the cite
// says so). The three books agree on nearly every figure; where they differ is the rounding of masses (TechManual rounds, neither
// AeroTech 2 book prints a rounding), the small craft crew, the matched arcs, bay sizes, door limits and infantry bay capacities.
// Page numbers are printed pages. The armor multipliers are read from the 'Mech armor table, as for fighters.
// ---------------------------------------------------------------------------------------------------------------------------------

export type CraftKind = "small-craft" | "dropship";
export type CraftUse = "civilian" | "military";

/** How a mass is rounded: not at all (the book prints no rounding), up to a half ton, up to a whole ton, or down to a half ton. */
export type CraftRound = "exact" | "up-half" | "up-whole" | "down-half";
export interface CraftRounding {
  engine: CraftRound;
  si: CraftRound;
  /** Controls, by kind: TechManual rounds a small craft's up to a half ton and a DropShip's up to a whole ton. */
  controlsSmallCraft: CraftRound;
  controlsDropship: CraftRound;
  pumps: CraftRound;
  /** Expanded fire control (the extra mass for an arc over its weapon limit). */
  fireControl: CraftRound;
  /** The most armor tons the structural integrity allows. */
  armorLimit: CraftRound;
}
/** Free heat sinks: the engine's tons over `divide`, or the square root of the engine's tons times `root`; rounded down. */
export interface SinkRule {
  divide?: number;
  root?: number;
}
/** Minimum crew: a base number plus one more for each `perTons` of the unit (rounded up). */
export interface CrewRule {
  base: number;
  perTons?: number;
}
/** How many bay doors a craft may have. `fixed` is the most doors of the launch-capable bays; otherwise `base` plus one for each `perTons` (rounded up), and `smallCraft` gives a small craft's own limit by shape. */
export interface DoorRule {
  fixed?: number;
  base?: number;
  perTons?: number;
  smallCraft?: Record<AeroShape, number>;
  /** The doors counted against the limit are those of bays for units that launch (the fixed limit's wording). */
  launchCapableOnly?: true;
  /** Every bay but an infantry bay has at least this many doors. */
  minPerBay?: number;
}
/** Armor points a ton by mass: the lowest mass of the band, then the Clan and the Inner Sphere standard armor points. */
export type ArmorBand = [from: number, clan: number, innerSphere: number];
/** A transport bay: the tons one cubicle weighs and the units (troopers) it carries. A cargo bay's capacity is its tons. */
export interface BayFigure {
  tons: number;
  carries: number;
}
export interface CraftBayRow {
  kind: string;
  label: string;
  figures: FigureGroup<BayFigure>;
}

export interface CraftFigures {
  /** Engine mass as a share of (tons x Safe Thrust): AeroTech 2 prints it as a percentage per Thrust Point, TechManual as the factor on the Base Movement Factor. */
  engineShare: FigureGroup<{ "inner-sphere": number; clan: number }>;
  /** The Structural Integrity range as multiples of Max Thrust. */
  siRange: FigureGroup<{ min: number; max: number }>;
  /** Structural mass is SI x tons over this, by hull shape. */
  siMassDivisor: FigureGroup<Record<AeroShape, number>>;
  /** Controls weigh this share of the tons. */
  controlShare: FigureGroup<number>;
  /** Fuel points a ton by the unit's tons: [lowest tons of the band, points]. */
  fuelBands: FigureGroup<[number, number][]>;
  /** Fuel pumps and tanks weigh this share of the fuel's tons. */
  pumpShare: FigureGroup<number>;
  armorBands: FigureGroup<Record<AeroShape, ArmorBand[]>>;
  /** The most armor tons a ton of structural integrity allows, by hull shape. */
  armorLimit: FigureGroup<Record<AeroShape, number>>;
  /** Free armor on each facing, as a multiple of the unit's SI. */
  freeArmor: FigureGroup<number>;
  freeSinks: FigureGroup<Record<AeroShape, Record<CraftUse, SinkRule>>>;
  /** Weapons an arc may hold before it needs more fire control. */
  arcLimit: FigureGroup<number>;
  /** Each whole multiple of the arc limit adds this share of the arc's weapon tons (not counting ammunition). */
  fireControlShare: FigureGroup<number>;
  /** The most attack value of a weapon bay, in standard-scale points (the capital scale is a tenth). */
  bayLimit: FigureGroup<number>;
  /** Whether one bay may hold weapons of different sizes of one class. */
  mixedSizes: FigureGroup<boolean>;
  /** A vessel built to tow other vessels adds this share to its structural mass (AeroTech 2 only; its equipment table's footnote asks for a tenth of the whole mass instead, a disagreement we report). */
  towingSiShare: FigureGroup<number>;
  /** The least shots of ammunition for each weapon that uses it; Ultra and rotary autocannon need more. */
  minShots: FigureGroup<{ shots: number; ultra: number; rotary: number }>;
  /** A DropShip's crew by use. */
  crew: FigureGroup<Record<CraftUse, CrewRule>>;
  smallCraftCrew: FigureGroup<CrewRule>;
  /** One gunner for each this many standard weapons (rounded up), and for each capital weapon. */
  gunners: FigureGroup<{ standardPer: number; capitalPer: number }>;
  /** Arc pairs that must hold the same weapons. */
  matchedArcs: FigureGroup<string[][]>;
  rounding: FigureGroup<CraftRounding>;
  doors: FigureGroup<DoorRule>;
  /** Units launched or landed each turn through one door, and the bay kinds that count. */
  launch: FigureGroup<{ perDoor: number; kinds: string[] }>;
}

const THREE = LATER;
const AT2_AT2R = (at2: string, at2r: string) => ({ [E.at2]: at2, [E.at2r]: at2r });

export const CRAFT_FIGURES: CraftFigures = {
  engineShare: [share(THREE("44; errata v1.2", "61", "185"), { "inner-sphere": 0.065, clan: 0.061 })],
  siRange: [share(THREE("44", "62", "187"), { min: 1, max: 30 })],
  siMassDivisor: [share(THREE("44", "62", "187"), { aerodyne: 200, spheroid: 500 })],
  controlShare: [share(THREE("44", "62", "189"), 0.0075)],
  // Conflict 63 in the archive ledger (the 19,990 misprint).
  fuelBands: [
    share(
      THREE("45", "63", "186"),
      [[0, 80], [400, 70], [800, 60], [1200, 50], [1900, 40], [3000, 30], [20000, 20], [40000, 10]],
      "the two AeroTech 2 books print the 3,000 band as ending at 19,990, a misprint for 19,999; TechManual prints 19,999",
    ),
  ],
  pumpShare: [share(THREE("45", "62", "186"), 0.02)],
  armorBands: [
    share(THREE("46", "64", "192"), {
      spheroid: [[0, 20, 16], [12500, 17, 14], [20000, 14, 12], [35000, 12, 10], [50000, 10, 8], [65000, 7, 6]],
      aerodyne: [[0, 20, 16], [6000, 17, 14], [9500, 14, 12], [12500, 12, 10], [17500, 10, 8], [25000, 7, 6]],
    }),
  ],
  armorLimit: [share(THREE("46", "63", "191"), { aerodyne: 4.5, spheroid: 3.6 })],
  freeArmor: [share(THREE("46", "63-64", "191"), 1)],
  freeSinks: [
    share(
      THREE("48", "67", "193"),
      { aerodyne: { civilian: { divide: 60 }, military: { divide: 20 } }, spheroid: { civilian: { root: 1.6 }, military: { root: 6.8 } } },
      "a small craft reads the civilian rows in all three books (they have no military row)",
    ),
  ],
  arcLimit: [share(THREE("47", "66", "196"), 12)],
  fireControlShare: [share(THREE("47", "66", "196"), 0.1)],
  // Conflict 40 in the archive ledger: 70 printed, 70 capital (700 standard) by the errata.
  bayLimit: [share(THREE("46-47; errata v1.2", "66", "195"), 700)],
  // Conflict 42 in the archive ledger.
  mixedSizes: [share({ [E.at2]: "46-47; errata v1.2" }, false), share({ [E.at2r]: "66", [E.current]: "195" }, true)],
  towingSiShare: [share({ [E.at2]: "44" }, 0.1)],
  minShots: [share(THREE("46; errata v1.2", "66", "194"), { shots: 10, ultra: 20, rotary: 60 })],
  crew: [share(THREE("48", "68", "189"), { civilian: { base: 3, perTons: 5000 }, military: { base: 4, perTons: 5000 } })],
  // Conflict 62 in the archive ledger: the AeroTech 2 books put a small craft with the civilian DropShip row, TechManual gives it a flat 3.
  smallCraftCrew: [share(AT2_AT2R("48; errata v1.2", "68"), { base: 3, perTons: 5000 }), share({ [E.current]: "189" }, { base: 3 })],
  gunners: [share(THREE("48", "68", "189"), { standardPer: 6, capitalPer: 1 })],
  // The two AeroTech 2 books name the fore-sides, aft-sides and broadsides, and the wings of fighters only; TechManual names the sides and the wings of every craft.
  matchedArcs: [share(AT2_AT2R("46", "66"), [["FL", "FR"], ["AL", "AR"]]), share({ [E.current]: "195" }, [["FL", "FR"], ["AL", "AR"], ["LW", "RW"]])],
  rounding: [
    share(AT2_AT2R("44-48", "61-68"), { engine: "exact", si: "exact", controlsSmallCraft: "exact", controlsDropship: "exact", pumps: "exact", fireControl: "exact", armorLimit: "exact" }, "neither AeroTech 2 book prints a rounding for these masses"),
    share({ [E.current]: "185-196" }, { engine: "up-half", si: "up-half", controlsSmallCraft: "up-half", controlsDropship: "up-whole", pumps: "up-half", fireControl: "up-half", armorLimit: "down-half" }),
  ],
  doors: [share({ [E.at2r]: "69" }, { fixed: 8, launchCapableOnly: true }, "AeroTech 2 prints no limit"), share({ [E.current]: "196" }, { base: 7, perTons: 50000, smallCraft: { aerodyne: 2, spheroid: 4 }, minPerBay: 1 })],
  launch: [
    share(AT2_AT2R("39", "55"), { perDoor: 2, kinds: ["mech", "fighter", "small-craft"] }),
    share({ [E.current]: "196" }, { perDoor: 2, kinds: ["mech", "fighter", "small-craft", "protomech"] }),
  ],
};

const BAY = (kind: string, label: string, figures: FigureGroup<BayFigure>): CraftBayRow => ({ kind, label, figures });
/** Transport bays (AeroTech 2 p. 47, AeroTech 2 Revised p. 65, TechManual p. 239). A bay's `capacity` in a record is its cubicles (a cargo bay's, its tons). TechManual's table prints the
 * battle armor row for 6 troopers under the label "(IS)" a second time; we call it `battle-armor-6`. */
// Conflict 64 in the archive ledger: the infantry bay capacities differ between the AeroTech 2 books and TechManual.
export const CRAFT_BAYS: CraftBayRow[] = [
  BAY("cargo", "Cargo bay", [share(THREE("47", "65", "239"), { tons: 1, carries: 1 })]),
  BAY("mech", "'Mech cubicle", [share(THREE("47", "65", "239"), { tons: 150, carries: 1 })]),
  BAY("fighter", "Fighter cubicle", [share(THREE("47", "65", "239"), { tons: 150, carries: 1 })]),
  BAY("small-craft", "Small craft cubicle", [share(THREE("47", "65", "239"), { tons: 200, carries: 1 })]),
  BAY("protomech", "ProtoMech cubicle", [share(THREE("47", "65", "239"), { tons: 50, carries: 5 })]),
  BAY("vehicle-light", "Light vehicle cubicle", [share(THREE("47", "65", "239"), { tons: 50, carries: 1 })]),
  BAY("vehicle-heavy", "Heavy vehicle cubicle", [share(THREE("47", "65", "239"), { tons: 100, carries: 1 })]),
  BAY("vehicle-superheavy", "Super-heavy vehicle cubicle", [share({ [E.current]: "239" }, { tons: 200, carries: 1 })]),
  BAY("infantry-foot", "Infantry bay, foot", [share(AT2_AT2R("47", "65"), { tons: 5, carries: 28 }), share({ [E.current]: "239" }, { tons: 5, carries: 30 })]),
  BAY("infantry-jump", "Infantry bay, jump", [share(AT2_AT2R("47", "65"), { tons: 6, carries: 21 }), share({ [E.current]: "239" }, { tons: 6, carries: 30 })]),
  BAY("infantry-motorized", "Infantry bay, motorized", [share(AT2_AT2R("47", "65"), { tons: 7, carries: 28 }), share({ [E.current]: "239" }, { tons: 7, carries: 30 })]),
  BAY("infantry-mechanized", "Infantry bay, mechanized", [share({ [E.at2r]: "65", [E.current]: "239" }, { tons: 8, carries: 7 })]),
  BAY("battle-armor", "Battle armor bay", [share(AT2_AT2R("47", "65"), { tons: 10, carries: 5 })]),
  BAY("battle-armor-is", "Battle armor bay (Inner Sphere)", [share({ [E.current]: "239" }, { tons: 8, carries: 4 })]),
  BAY("battle-armor-clan", "Battle armor bay (Clan)", [share({ [E.current]: "239" }, { tons: 10, carries: 5 })]),
  BAY("battle-armor-6", "Battle armor bay (6 troopers)", [share({ [E.current]: "239" }, { tons: 12, carries: 6 })]),
];

/** The bay kinds an edition prints. */
export function craftBaysFor(editionId: string): CraftBayRow[] {
  return CRAFT_BAYS.filter((row) => figureOf(row.figures, editionId) !== undefined);
}
/** What one cubicle of a bay kind weighs and carries in an edition; undefined for a kind the edition does not print. */
export function craftBayFigure(kind: string, editionId: string): BayFigure | undefined {
  const row = CRAFT_BAYS.find((r) => r.kind === kind);
  return row && figureOf(row.figures, editionId);
}

/** Armor points a ton of the type gives a small craft or DropShip: the standard points of the mass band (Clan or Inner Sphere column) times the type's multiplier, as the aerospace armor
 * table prints it (TechManual p. 192: 14 x 1.12 = 15.68). A mixed unit reads the column of the armor's own tech base (standard reads Inner Sphere). Undefined for an unknown type, shape or edition. */
export function craftArmorPointsPerTon(typeId: string, editionId: string, shape: AeroShape, tons: number, techBase: "inner-sphere" | "clan" | "mixed"): number | undefined {
  const type = FIGHTER_ARMOR_TYPES.find((t) => t.id === typeId);
  const bands = figureOf(CRAFT_FIGURES.armorBands, editionId)?.[shape];
  const multiplier = type && Object.hasOwn(ARMOR.types, type.like) ? ARMOR.types[type.like]?.multiplier : undefined;
  const band = bands?.filter(([from]) => tons >= from).at(-1);
  if (!type || !band || multiplier === undefined) return undefined;
  const clan = techBase === "clan" || (techBase === "mixed" && type.techBase === "clan");
  return Math.round(band[clan ? 1 : 2] * multiplier * 1e6) / 1e6;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// JumpShip, WarShip and space station construction figures (AeroTech 2, AeroTech 2 Revised, and the current rules, whose capital ships
// are built by Strategic Operations: Advanced Aerospace Rules and whose ship systems weigh what the Tactical Operations: Advanced Units and
// Equipment construction table prints). Same shape as the groups above: one row per value, each edition named once with the page it
// prints it on. Where an AeroTech 2 book prints one rule for DropShips and capital ships alike (the bay limit, fire control, gunners and
// the like), the capital ship reads the small craft and DropShip row for that book and nothing is written twice here: a capital group holds
// only the current rules' row then, because Strategic Operations prints it on its own page for capital ships (`capitalFigureOf` reads the
// capital row first, then the fallback). Each edition keeps its own book and errata (AeroTech 2 with errata v1.2, Strategic Operations:
// Advanced Aerospace Rules with errata v5.0). Page numbers are printed pages. BattleSpace builds these ships by steps of its own (a later piece).
// ---------------------------------------------------------------------------------------------------------------------------------

export type CapitalKind = "jumpship" | "warship" | "space-station";
export const CAPITAL_KINDS: readonly CapitalKind[] = ["jumpship", "warship", "space-station"];
type ByKind<T> = Partial<Record<CapitalKind, T>>;

const TOAUE = "Tactical Operations: Advanced Units and Equipment";
const CAPITAL_BOOK: Record<string, string> = { [E.at2]: AT2, [E.at2r]: AT2R, [E.current]: SOAA };
/** Cites for capital ship figures: a page string is in the edition's capital ship book (Strategic Operations: Advanced Aerospace Rules for the current rules); a
 * [book, pages] pair names another book. */
type CapitalPages = Partial<Record<string, string | [book: string, pages: string]>>;
const capitalPagesOf = (pages: CapitalPages): Record<string, string> =>
  Object.fromEntries(Object.entries(pages).map(([edition, p]) => [edition, Array.isArray(p) ? cite(p[0], p[1]) : cite(CAPITAL_BOOK[edition] ?? edition, p ?? "")]));
const capShare = <T>(pages: CapitalPages, value: T, note?: string): SharedFigure<T> => ({
  editions: Object.keys(pages),
  value,
  cite: capitalPagesOf(pages),
  checked: "page",
  ...(note === undefined ? {} : { note }),
});
const CAP3 = (at2: string, at2r: string, so: string): CapitalPages => ({ [E.at2]: at2, [E.at2r]: at2r, [E.current]: so });
const SO_ONLY = (so: string): CapitalPages => ({ [E.current]: so });

/** How a capital ship figure is rounded: as the small craft masses, or to the nearest whole number (up on .5), or, for the fuel pumps, the fuel and pumps together up to a whole ton. */
export type CapitalRound = CraftRound | "nearest" | "total-up-whole";
export interface CapitalRounding {
  engine: CapitalRound;
  si: CapitalRound;
  controls: CapitalRound;
  /** The K-F drive's and the jump sail's mass. */
  drive: CapitalRound;
  /** The K-F drive's and the jump sail's integrity. */
  integrity: CapitalRound;
  pumps: CapitalRound;
  armorLimit: CapitalRound;
  fireControl: CapitalRound;
}
/** A K-F drive: its share of the unit's tons; integrity = `integrityBase` + drive tons / `integrityPer`; its sail weighs `sailBase` + unit tons / `sailPer`. */
export interface KfDriveFigure {
  share: number;
  integrityBase: number;
  integrityPer: number;
  sailBase: number;
  sailPer: number;
}
/** Sail integrity = `base` + sail tons / `per`. */
export interface SailIntegrityFigure {
  base: number;
  per: number;
}
/** The most armor tons: the structural mass over `divide`, plus `add`. */
export interface CapitalArmorLimit {
  divide: number;
  add?: number;
}
/** A unit's bay doors: `base` plus one for each `perTons` of the unit, rounded up. */
export interface CapitalDoorRule {
  base: number;
  perTons: number;
}

export interface CapitalFigures {
  /** Engine mass as a share of the tons: a station-keeping drive's fixed share (JumpShips and stations), and a WarShip's maneuvering drive's share per point of Safe Thrust. */
  engine: FigureGroup<{ stationKeeping: number; perThrust: number }>;
  /** A WarShip may mount a station-keeping drive in place of a maneuvering drive (for less than 1 Safe Thrust). */
  warshipStationKeeping: FigureGroup<boolean>;
  /** The Safe Thrust a station-keeping drive gives a WarShip that uses one. The book prints no SI range for such a ship; we read the WarShip's own range off the Max Thrust this gives. */
  stationKeepingThrust: FigureGroup<number>;
  /** Max Thrust is Safe Thrust times this, rounded up (WarShips; a station-keeping drive has no Max Thrust). Fallback: the fighter row. */
  maxThrustFactor: FigureGroup<number>;
  kfDrive: FigureGroup<Record<"jumpship" | "warship", KfDriveFigure>>;
  sailIntegrity: FigureGroup<SailIntegrityFigure>;
  /** When a space station carries a jump (energy collection) sail: whenever it has energy storage batteries, or at the designer's choice. */
  stationSail: FigureGroup<"with-batteries" | "optional">;
  /** The Structural Integrity of a JumpShip or station, which may not be changed. */
  fixedSi: FigureGroup<number>;
  /** Structural mass: a JumpShip's and a station's tons over the divisor; a WarShip's SI times its tons over the divisor. */
  siMass: FigureGroup<Record<CapitalKind, number>>;
  /** A WarShip's SI range as multiples of Max Thrust. Fallback: the small craft and DropShip row. */
  siRange: FigureGroup<{ min: number; max: number }>;
  controlShare: FigureGroup<ByKind<number>>;
  /** Fuel points a ton by the unit's tons: [lowest tons of the band, points]; a type the book gives no rows has none. */
  fuelBands: FigureGroup<ByKind<[number, number][]>>;
  /** Fuel is bought in lots of this many tons. Fallback: the fighter row (the same sentence covers every unit). */
  fuelLot: FigureGroup<number>;
  /** Fuel pumps weigh this share of the fuel. Fallback: the small craft and DropShip row. */
  pumpShare: FigureGroup<number>;
  /** Capital-scale armor points a ton of standard armor by the unit's tons: [lowest tons, Clan, Inner Sphere]. */
  armorBands: FigureGroup<ArmorBand[]>;
  armorLimit: FigureGroup<ByKind<CapitalArmorLimit>>;
  /** Free armor on each facing: the SI over this, rounded to the nearest whole number (up on .5). */
  freeArmorDivisor: FigureGroup<number>;
  /** How a weight of armor is turned into whole points. Fallback: the fighter row (the same sentence covers every unit). */
  armorRounding: FigureGroup<"nearest" | "down">;
  /** Free heat sinks: `base` + the square root of the engine's tons times `root`, rounded down. */
  freeSinks: FigureGroup<{ base: number; root: number }>;
  arcLimit: FigureGroup<ByKind<number>>;
  /** Fallbacks: the small craft and DropShip rows. */
  fireControlShare: FigureGroup<number>;
  bayLimit: FigureGroup<number>;
  mixedSizes: FigureGroup<boolean>;
  matchedArcs: FigureGroup<string[][]>;
  crew: FigureGroup<ByKind<CrewRule>>;
  gunners: FigureGroup<{ standardPer: number; capitalPer: number }>;
  /** The most bay doors by type, and the least a unit with a transport bay must have. Fallback: the small craft and DropShip row (AeroTech 2 Revised's 8 launch doors). */
  doors: FigureGroup<{ byKind: ByKind<CapitalDoorRule>; unitMinimum: number }>;
  launch: FigureGroup<{ perDoor: number; kinds: string[] }>;
  rounding: FigureGroup<CapitalRounding>;
}

const KF: Record<"jumpship" | "warship", KfDriveFigure> = {
  jumpship: { share: 0.95, integrityBase: 1.2, integrityPer: 60000, sailBase: 30, sailPer: 7500 },
  warship: { share: 0.4525, integrityBase: 2, integrityPer: 25000, sailBase: 30, sailPer: 20000 },
};
const CAPITAL_FUEL: [number, number][] = [[0, 10], [110000, 5], [250000, 2.5]];

export const CAPITAL_FIGURES: CapitalFigures = {
  engine: [capShare(CAP3("44", "61", "135"), { stationKeeping: 0.012, perThrust: 0.06 })],
  warshipStationKeeping: [capShare(SO_ONLY("135"), true)],
  stationKeepingThrust: [capShare(SO_ONLY("135"), 0.2)],
  maxThrustFactor: [capShare(SO_ONLY("135"), 1.5)],
  kfDrive: [capShare(CAP3("44", "61", "137"), KF)],
  sailIntegrity: [capShare(CAP3("44", "61", "137"), { base: 1, per: 20 })],
  stationSail: [capShare({ [E.at2]: "44; errata v1.2", [E.at2r]: "61" }, "with-batteries"), capShare(SO_ONLY("136"), "optional")],
  fixedSi: [capShare(CAP3("44", "62", "134"), 1)],
  siMass: [capShare(CAP3("44", "62", "134, 136"), { jumpship: 150, "space-station": 100, warship: 1000 })],
  siRange: [capShare(SO_ONLY("136"), { min: 1, max: 30 })],
  controlShare: [capShare(CAP3("44", "62", "137"), { jumpship: 0.0025, warship: 0.0025, "space-station": 0.001 })],
  // Conflicts 66 and 72 in the archive ledger: the AeroTech 2 books print WarShip rows only; Strategic Operations' 200,000 band ends at a misprinted 249,000.
  fuelBands: [
    capShare({ [E.at2]: "45", [E.at2r]: "63" }, { warship: CAPITAL_FUEL }, "the two AeroTech 2 books print fuel points for WarShips only, none for JumpShips or stations; their top band reads over 250,000"),
    capShare(SO_ONLY("135"), { jumpship: CAPITAL_FUEL, warship: CAPITAL_FUEL, "space-station": CAPITAL_FUEL }, "the 200,000 band is printed as ending at 249,000; the next band starts over 249,999"),
  ],
  fuelLot: [capShare(SO_ONLY("134"), 0.5)],
  pumpShare: [capShare(SO_ONLY("134-135"), 0.02)],
  // Conflict 43 in the archive ledger: the AeroTech 2 table's lowest band, 50,000 printed, 2,000 by the errata.
  armorBands: [capShare(CAP3("46; errata v1.2", "64", "140"), [[2000, 1, 0.8], [150000, 0.7, 0.6], [250000, 0.5, 0.4]])],
  // Conflict 71 in the archive ledger: the AeroTech 2 books print no station limit.
  armorLimit: [
    capShare({ [E.at2]: "46", [E.at2r]: "63" }, { jumpship: { divide: 12 }, warship: { divide: 50 } }, "no limit is printed for a space station"),
    capShare(SO_ONLY("140"), { jumpship: { divide: 12 }, "space-station": { divide: 3, add: 60 }, warship: { divide: 50 } }),
  ],
  freeArmorDivisor: [capShare(CAP3("46", "64", "140"), 10)],
  armorRounding: [capShare(SO_ONLY("140"), "down" as const)],
  freeSinks: [capShare(CAP3("48", "67", "139"), { base: 45, root: 2 })],
  arcLimit: [capShare(CAP3("47", "66", "133, 143"), { jumpship: 12, warship: 20, "space-station": 20 })],
  fireControlShare: [capShare(SO_ONLY("143"), 0.1)],
  bayLimit: [capShare(SO_ONLY("142"), 700)],
  mixedSizes: [capShare(SO_ONLY("142, 144"), true, "the Odyssey example mixes pulse laser sizes in one bay")],
  matchedArcs: [capShare(CAP3("46", "66", "142, 145"), [["FL", "FR"], ["LB", "RB"], ["AL", "AR"]])],
  crew: [
    capShare(
      { [E.at2]: "48; errata v1.2", [E.at2r]: "68", [E.current]: "138" },
      { jumpship: { base: 6, perTons: 20000 }, warship: { base: 45, perTons: 5000 }, "space-station": { base: 45, perTons: 5000 } },
      "AeroTech 2 names the space station by its errata",
    ),
  ],
  gunners: [capShare(SO_ONLY("138"), { standardPer: 6, capitalPer: 1 })],
  doors: [capShare(SO_ONLY("143"), { byKind: { jumpship: { base: 7, perTons: 50000 }, "space-station": { base: 8, perTons: 75000 }, warship: { base: 8, perTons: 100000 } }, unitMinimum: 1 })],
  launch: [capShare(SO_ONLY("143"), { perDoor: 2, kinds: ["mech", "fighter", "small-craft", "protomech"] })],
  // Conflict 70 in the archive ledger: the rounding differs by book.
  rounding: [
    capShare({ [E.at2]: "44-48" }, { engine: "exact", si: "exact", controls: "exact", drive: "exact", integrity: "exact", pumps: "exact", armorLimit: "exact", fireControl: "exact" }, "AeroTech 2 prints no rounding for these"),
    capShare(
      { [E.at2r]: "61-66" },
      { engine: "exact", si: "exact", controls: "exact", drive: "nearest", integrity: "nearest", pumps: "up-whole", armorLimit: "exact", fireControl: "exact" },
      "the K-F drive, sail and their integrity round to the nearest whole number (p. 61); the pumps round up in the WarShip example (p. 63)",
    ),
    capShare(SO_ONLY("134-143"), { engine: "up-half", si: "up-half", controls: "up-whole", drive: "up-whole", integrity: "up-whole", pumps: "total-up-whole", armorLimit: "down-half", fireControl: "up-half" }),
  ],
};

/** A capital figure: the capital group's row for the edition, else the fallback group's (the AeroTech 2 books print one rule for DropShips and capital ships). */
export function capitalFigureOf<T>(group: FigureGroup<T>, editionId: string, fallback?: FigureGroup<T>): T | undefined {
  return figureOf(group, editionId) ?? (fallback === undefined ? undefined : figureOf(fallback, editionId));
}

export interface CapitalArmorType {
  id: string;
  name: string;
  /** Capital-scale points a ton added to the standard armor's (the AeroTech 2 books print the bonus; Strategic Operations prints each type's own column, which is the standard column plus the same bonus). */
  bonus: number;
  editions: string[];
  cite: Record<string, string>;
  checked: "page" | "text";
}
const capitalArmor = (id: string, name: string, bonus: number): CapitalArmorType => ({ id, name, bonus, editions: [E.at2, E.at2r, E.current], cite: capitalPagesOf(CAP3("46", "64", "140")), checked: "page" });
/** Capital ship armor types. A unit uses its own tech base's column (Inner Sphere or Clan); the types are not split by tech base. */
export const CAPITAL_ARMOR_TYPES: CapitalArmorType[] = [
  capitalArmor("standard", "Standard", 0),
  capitalArmor("improved-ferro-aluminum", "Improved Ferro-Aluminum", 0.2),
  capitalArmor("ferro-carbide", "Ferro-Carbide", 0.4),
  capitalArmor("lamellor-ferro-carbide", "Lamellor Ferro-Carbide", 0.6),
];

/** Capital-scale armor points a ton of the type at the unit's tons: the standard points of the band (Clan or Inner Sphere column; a mixed unit reads the Inner Sphere one) plus the type's bonus. Undefined for an unknown type or edition, or tons under every band. */
export function capitalArmorPointsPerTon(typeId: string, editionId: string, tons: number, techBase: "inner-sphere" | "clan" | "mixed"): number | undefined {
  const type = CAPITAL_ARMOR_TYPES.find((t) => t.id === typeId && t.editions.includes(editionId));
  const band = figureOf(CAPITAL_FIGURES.armorBands, editionId)?.filter(([from]) => tons >= from).at(-1);
  if (!type || !band) return undefined;
  return Math.round((band[techBase === "clan" ? 1 : 2] + type.bonus) * 1e6) / 1e6;
}

/** One ship system and what it weighs: `tons` each, or a `share` of the unit's tons. `types` may carry it; `max` caps the count, or one for each `perTons` of the unit (rounded as `round`, nothing under `minTons`). */
export interface CapitalSystemFigure {
  tons?: number;
  share?: number;
  types: CapitalKind[];
  max?: number;
  perTons?: number;
  round?: "down" | "up";
  minTons?: number;
}
export interface CapitalSystemRow {
  kind: string;
  label: string;
  figures: FigureGroup<CapitalSystemFigure>;
}
const SYSTEM = (kind: string, label: string, figures: FigureGroup<CapitalSystemFigure>): CapitalSystemRow => ({ kind, label, figures });
const ALL_CAPITAL: CapitalKind[] = ["jumpship", "warship", "space-station"];
/** Ship systems (AeroTech 2 p. 47, AeroTech 2 Revised p. 65, and for the current rules the Tactical Operations: Advanced Units and Equipment construction table, pp. 219 and 221, whose
 * JumpShip, WarShip and station columns say which may carry each). A record keeps their counts in `systems`, keyed by `kind`. The K-F drive and its sail are part of every JumpShip and
 * WarShip (the errata to Strategic Operations: Advanced Aerospace Rules, p. 136), so they are not systems; a station's energy collection sail is (`jump-sail`). */
// Conflicts 65 and 67 in the archive ledger: the docking hardpoint limit's rounding, and the lithium-fusion battery on stations.
export const CAPITAL_SYSTEMS: CapitalSystemRow[] = [
  SYSTEM("docking-hardpoint", "Docking hardpoint", [
    capShare({ [E.at2]: "47", [E.at2r]: "65" }, { tons: 1000, types: ALL_CAPITAL, perTons: 50000, round: "down" }, "the books print one per 50,000 tons with no rounding: whole hardpoints within the limit"),
    capShare({ [E.current]: [`${TOAUE}, p. 219; ${SOAA}`, "142; errata v5.0"] }, { tons: 1000, types: ALL_CAPITAL, perTons: 50000, round: "up", minTons: 50000 }),
  ]),
  SYSTEM("grav-deck-small", "Grav deck (under 100 m)", [capShare({ [E.at2]: "47", [E.at2r]: "65", [E.current]: [TOAUE, "219"] }, { tons: 50, types: ALL_CAPITAL })]),
  SYSTEM("grav-deck-medium", "Grav deck (100 to 250 m)", [capShare({ [E.at2]: "47", [E.at2r]: "65", [E.current]: [TOAUE, "219"] }, { tons: 100, types: ALL_CAPITAL })]),
  SYSTEM("grav-deck-large", "Grav deck (over 250 m)", [capShare({ [E.at2]: "47", [E.at2r]: "65", [E.current]: [TOAUE, "219"] }, { tons: 500, types: ["space-station"] })]),
  SYSTEM("lithium-fusion-battery", "Lithium-fusion battery", [
    capShare({ [E.at2]: "47" }, { share: 0.01, types: ALL_CAPITAL, max: 1 }),
    capShare({ [E.at2r]: "65" }, { share: 0.01, types: ["jumpship", "warship"], max: 1 }),
    capShare({ [E.current]: [TOAUE, "221"] }, { share: 0.01, types: ["jumpship", "warship"] }),
  ]),
  SYSTEM("energy-storage-battery", "Energy storage battery", [capShare({ [E.at2]: "47", [E.at2r]: "65", [E.current]: [TOAUE, "219"] }, { tons: 100000, types: ["space-station"] })]),
  SYSTEM("towing-adapter", "Towing adapter", [capShare({ [E.at2]: "47" }, { tons: 100, types: ALL_CAPITAL }, "a vessel built to tow weighs 10 percent of its mass in structural reinforcement besides (the footnote on p. 47)")]),
  SYSTEM("hpg", "HPG", [capShare({ [E.at2]: "47", [E.at2r]: "65" }, { tons: 50, types: ALL_CAPITAL }, "ComStar and Clan vessels only")]),
  SYSTEM("jump-sail", "Energy collection sail", [capShare({ [E.at2]: "44; errata v1.2", [E.at2r]: "61", [E.current]: "136" }, { types: ["space-station"], max: 1 }, "weighs what a JumpShip's sail of the same tons does")]),
];

/** What one ship system weighs and who may carry it in an edition; undefined for a kind the edition does not print. */
export function capitalSystemFigure(kind: string, editionId: string): CapitalSystemFigure | undefined {
  const row = CAPITAL_SYSTEMS.find((r) => r.kind === kind);
  return row && figureOf(row.figures, editionId);
}
