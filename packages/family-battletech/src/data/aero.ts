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
