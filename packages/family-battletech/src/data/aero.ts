// BattleTech: AeroTech. The five editions of the one aerospace game and, for each, the unit types it builds: weight range and
// step, the level (current edition only), the record sheet kind, and the armor locations and firing arcs. Figures and identifiers
// only, every row with the printed page it was read from (against the page image) and whether it was settled there. Page numbers
// are printed pages. Plain data; nothing runs here. Later pieces extend this file with each edition's construction figures.
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
 * RS left and right side, FU fuselage, EN engine, FL and FR fore-left and fore-right, AL and AR aft-left and aft-right, AF aft,
 * LB and RB left and right broadside. */
export interface AeroFigures {
  weight: WeightBand;
  /** The kind of record sheet the edition's books print for it. */
  sheet: string;
  /** Armor locations (facings). */
  armor: string[];
  /** Firing arcs (the equipment areas on AeroTech's sheet). */
  arcs: string[];
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
    arcs: SIX_ARCS,
    shapes: { aerodyne: { weight: band(100, 200, 5), sheet: "dropship", armor: WING_ARMOR, arcs: SIX_ARCS }, spheroid: { weight: band(100, 200, 5), sheet: "dropship", armor: SIDE_ARMOR, arcs: SIX_ARCS } },
    note: "built as a civilian DropShip; the DropShip sheet serves it",
    cite: cite(AT2, "42, 50, 103"),
    checked: "page",
  },
  {
    type: "dropship",
    label: "DropShip",
    weight: band(200, 100000, 100),
    sheet: "dropship",
    armor: SIDE_ARMOR,
    arcs: SIX_ARCS,
    shapes: { aerodyne: { weight: band(200, 35000, 100), sheet: "dropship", armor: WING_ARMOR, arcs: SIX_ARCS }, spheroid: { weight: band(200, 100000, 100), sheet: "dropship", armor: SIDE_ARMOR, arcs: SIX_ARCS } },
    cite: cite(AT2, "42, 50, 103"),
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
    note: "no broadside arcs, as for the JumpShip (conflict 49)",
    cite: cite(AT2, "42, 50, 102"),
    checked: "page",
  },
];

/** The sheet kind of a type in the editions that print one sheet per kind and shape (Revised index 157-166; the current blank sheets). */
const sheetOf = (type: AeroType, shape?: AeroShape): string => (shape === undefined ? type : `${shape}-${type === "small-craft" ? "small-craft" : "dropship"}`);

/** Revised prints the same classes, weights and tables (pp. 60, 71) and its own sheets, one per kind. */
const AT2R_TYPES: AeroTypeRow[] = AT2_TYPES.map((row) => {
  const shapes = Object.fromEntries(Object.entries(row.shapes ?? {}).map(([shape, figures]) => [shape, { ...figures, sheet: sheetOf(row.type, shape as AeroShape) }]));
  return { ...row, cite: cite(AT2R, "60, 71"), sheet: sheetOf(row.type, row.shapes === undefined ? undefined : "spheroid"), ...(row.shapes === undefined ? {} : { shapes }) };
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
        armor: SIDE_ARMOR,
        arcs: SIX_ARCS,
        shapes: { aerodyne: { weight: band(100, 35000, undefined), sheet: "battlespace", armor: WING_ARMOR, arcs: SIX_ARCS }, spheroid: { weight: band(100, 100000, undefined), sheet: "battlespace", armor: SIDE_ARMOR, arcs: SIX_ARCS } },
        note: "arcs and facings as AeroTech 2 prints them for BattleSpace craft",
        cite: `${cite(BS, "64")}; ${cite(AT2, "50")}`,
        checked: "page",
      },
      {
        type: "jumpship",
        label: "JumpShip",
        weight: band(undefined, 500000, undefined),
        sheet: "battlespace",
        armor: LARGE_ARMOR,
        arcs: SIX_ARCS,
        note: "no minimum mass is printed; the drive may not be under 2,500 t",
        cite: `${cite(BS, "72")}; ${cite(AT2, "50")}`,
        checked: "page",
      },
      { type: "warship", label: "WarShip", weight: band(undefined, 2500000, undefined), sheet: "battlespace", armor: LARGE_ARMOR, arcs: BROADSIDE_ARCS, cite: `${cite(BS, "72")}; ${cite(AT2, "50")}`, checked: "page" },
      {
        type: "space-station",
        label: "Space station",
        weight: band(undefined, undefined, undefined),
        sheet: "battlespace",
        armor: LARGE_ARMOR,
        arcs: SIX_ARCS,
        note: "built by the JumpShip and WarShip steps; no weight range is printed",
        cite: cite(BS, "76"),
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
      { type: "conventional-fighter", label: "Conventional fighter", weight: band(5, 50, 5), level: "standard", sheet: "conventional-fighter", armor: WING_ARMOR, arcs: WING_ARCS, cite: cite(TM, "182, 184, 191"), checked: "page" },
      { type: "aerospace-fighter", label: "Aerospace fighter", weight: band(5, 100, 5), level: "standard", sheet: "aerospace-fighter", armor: WING_ARMOR, arcs: WING_ARCS, cite: cite(TM, "182, 184, 191"), checked: "page" },
      {
        type: "small-craft",
        label: "Small craft",
        weight: band(100, 200, 5),
        level: "standard",
        sheet: "spheroid-small-craft",
        armor: SIDE_ARMOR,
        arcs: SIX_ARCS,
        shapes: { aerodyne: { weight: band(100, 200, 5), sheet: "aerodyne-small-craft", armor: WING_ARMOR, arcs: WING_ARCS } },
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
        shapes: { aerodyne: { weight: band(200, 35000, 100), sheet: "aerodyne-dropship", armor: WING_ARMOR, arcs: WING_ARCS }, spheroid: { weight: band(200, 100000, 100), sheet: "spheroid-dropship", armor: SIDE_ARMOR, arcs: SIX_ARCS } },
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
