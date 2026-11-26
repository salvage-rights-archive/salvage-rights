// What the AeroTech fighter record sheets print that is not a figure of the unit itself: the heat scale, the critical damage rows, the velocity
// record's columns, the stores boxes and the arrangement each edition's sheet follows. Plain data; nothing here runs. Figures and our own short
// labels only. Three of the four sheets follow a blank the publisher marks for personal reproduction, so their block labels and printed tables
// (heat scale, critical damage, ground movement) are carried as printed; AeroTech (1986) has no flagged sheet, so its layout is ours from the
// blocks its p. 3 names and its heat scale is our own wording of the figures on p. 26. Each profile names the page it follows and, where one
// is flagged, the page carrying the notice (the notice is cited, never copied).
import { FIGHTER_EDITIONS } from "./aero";

export type SheetKind = "aerospace" | "conventional";
/** How a sheet arranges its blocks: the AeroTech (1986) fighter sheet, the AeroTech 2 pair, or the current blank. */
export type SheetLayout = "at1" | "at2" | "current";

export interface HeatRow {
  level: number;
  /** The effect as the flagged sheets label it (an AeroTech (1986) row is our own short wording). */
  effect: string;
}

/** The flagged sheets' Heat Scale (AeroTech 2 p. 104, AeroTech 2 Revised index 157-158 and the current blank, CAT35001RS index 12-13 print the same rows); levels not named have no effect. */
export const FLAGGED_HEAT: { cite: string; checked: "page"; rows: HeatRow[] } = {
  cite: "AeroTech 2, p. 104; AeroTech 2: Revised Edition, PDF index 157-158; Blank Record Sheets (Catalyst CAT35001RS), PDF index 12-13",
  checked: "page",
  rows: [
    { level: 30, effect: "Shutdown" },
    { level: 28, effect: "Ammo Explosion, avoid on 8+" },
    { level: 27, effect: "Pilot Damage, avoid on 9+" },
    { level: 26, effect: "Shutdown, avoid on 10+" },
    { level: 25, effect: "Random Movement, avoid on 10+" },
    { level: 24, effect: "+4 Modifier to Fire" },
    { level: 23, effect: "Ammo Explosion, avoid on 6+" },
    { level: 22, effect: "Shutdown, avoid on 8+" },
    { level: 21, effect: "Pilot Damage, avoid on 6+" },
    { level: 20, effect: "Random Movement, avoid on 8+" },
    { level: 19, effect: "Ammo Explosion, avoid on 4+" },
    { level: 18, effect: "Shutdown, avoid on 6+" },
    { level: 17, effect: "+3 Modifier to Fire" },
    { level: 15, effect: "Random Movement, avoid on 7+" },
    { level: 14, effect: "Shutdown, avoid on 4+" },
    { level: 13, effect: "+2 Modifier to Fire" },
    { level: 10, effect: "Random Movement, avoid on 6+" },
    { level: 8, effect: "+1 Modifier to Fire" },
    { level: 5, effect: "Random Movement, avoid on 5+" },
  ],
};

/** AeroTech (1986): the Heat Scale table printed p. 26 (the scale itself is on a box-set sheet we do not have; p. 3 and p. 25 describe it). Our own short words for each row; the levels
 * and avoid numbers are the book's figures. This edition differs from the later three at 15, 20 and 25 (random movement with no thrust, and other avoid numbers at 15 and 20). */
export const AT1_HEAT: { cite: string; checked: "page"; rows: HeatRow[] } = {
  cite: "AeroTech, pp. 25-26",
  checked: "page",
  rows: [
    { level: 30, effect: "Auto shutdown" },
    { level: 28, effect: "Ammo explodes, avoid 8+" },
    { level: 27, effect: "Pilot hurt, avoid 9+" },
    { level: 26, effect: "Shutdown, avoid 10+" },
    { level: 25, effect: "Random move, no thrust, avoid 10+" },
    { level: 24, effect: "+4 to hit" },
    { level: 23, effect: "Ammo explodes, avoid 6+" },
    { level: 22, effect: "Shutdown, avoid 8+" },
    { level: 21, effect: "Pilot hurt, avoid 6+" },
    { level: 20, effect: "Random move, no thrust, avoid 8+" },
    { level: 19, effect: "Ammo explodes, avoid 4+" },
    { level: 18, effect: "Shutdown, avoid 6+" },
    { level: 17, effect: "+3 to hit" },
    { level: 15, effect: "Random move, no thrust, avoid 6+" },
    { level: 14, effect: "Shutdown, avoid 4+" },
    { level: 13, effect: "+2 to hit" },
    { level: 10, effect: "Random move, avoid 6+" },
    { level: 8, effect: "+1 to hit" },
    { level: 5, effect: "Random move, avoid 5+" },
  ],
};

/** The heat scale runs from 0 to this level, with an Overflow box above it (every edition's sheet). */
export const AERO_HEAT_TOP = 30;

export interface CriticalRow {
  label: string;
  /** The boxes of the row, as printed: a modifier, a number of hits, or "D" for destroyed. */
  boxes: string[];
}

/** Critical Damage on the AeroTech 2 and AeroTech 2 Revised sheets (AeroTech 2 p. 104; Revised index 157-158). */
const AT2_CRITICAL: CriticalRow[] = [
  { label: "Avionics", boxes: ["+1", "+2", "+5"] },
  { label: "Cargo", boxes: [""] },
  { label: "Engine", boxes: ["2", "4", "D"] },
  { label: "FCS", boxes: ["+2", "+4", "D"] },
  { label: "Gear", boxes: ["+5"] },
  { label: "Life Support", boxes: ["+2"] },
  { label: "Sensors", boxes: ["+1", "+2", "+5"] },
  { label: "Thrusters: Left", boxes: ["+1", "+2", "+3", "D"] },
  { label: "Thrusters: Right", boxes: ["+1", "+2", "+3", "D"] },
];

/** The current blank's Critical Damage (Blank Record Sheets CAT35001RS, index 12-13): no Cargo or Thrusters rows. */
const CURRENT_CRITICAL: CriticalRow[] = [
  { label: "Avionics", boxes: ["+1", "+2", "+5"] },
  { label: "Engine", boxes: ["2", "4", "D"] },
  { label: "FCS", boxes: ["+2", "+4", "D"] },
  { label: "Gear", boxes: ["+5"] },
  { label: "Sensors", boxes: ["+1", "+2", "+5"] },
  { label: "Life Support", boxes: ["+2"] },
];

/** The Hits Taken track of the Pilot Data block on the flagged sheets: the Consciousness number needed after each hit, and the modifier. */
export const PILOT_TRACK = { hits: ["1", "2", "3", "4", "5", "6"], consciousness: ["3", "5", "7", "10", "11", "Dead"], modifier: ["+1", "+2", "+3", "+4", "+5", "Dead"] };

export type Stores = { kind: "line" } | { kind: "labelled"; groups: string[][] } | { kind: "grid"; boxes: number; key: string[] };

export interface SheetProfile {
  id: string;
  editionId: string;
  kind: SheetKind;
  layout: SheetLayout;
  /** True where the sheet follows a blank the publisher flags for personal reproduction. */
  flagged: boolean;
  title: string;
  /** The armor areas the diagram draws, in the edition's order. */
  armor: string[];
  /** The Damage Threshold of each armor area is printed (a tenth of the armor, rounded up). */
  thresholds: boolean;
  critical: CriticalRow[];
  /** Where the sheet's velocity record puts its turns: down the page, or across it (one strip of 20, or two of 10). */
  velocity: "down" | "across" | "two-strips";
  velocityColumns: string[];
  stores: Stores;
  /** The pages the sheet follows, and the page carrying the permission notice where it is flagged. */
  follows: string;
  notice?: string;
  /** Conventional fighters of the current blank carry the straight-movement and return tables. */
  groundTables?: boolean;
  /** The page of the rule that sets the threshold. */
  thresholdCite?: string;
}

const AT2_STORES: Stores = { kind: "labelled", groups: [["Arrow IV", "Fuel", "Rockets", "TAG"], ["HE", "INF", "FRAG", "LG", "MINE"]] };
const CURRENT_STORES: Stores = { kind: "grid", boxes: 20, key: ["HE", "LG", "C", "RL"] };

const AT2_NOTICE = "AeroTech 2, p. 104 (its foot line gives permission to photocopy for personal use)";
const AT2R_NOTICE = "AeroTech 2: Revised Edition, PDF index 158 (its foot line gives permission to photocopy for personal use)";
const CURRENT_NOTICE = "Blank Record Sheets (Catalyst CAT35001RS), PDF index 12-13 (their foot lines give permission to photocopy for personal use)";
const THRESHOLD_CITE = "AeroTech 2, p. 19; Total Warfare, p. 239";
// AeroTech 2 Revised prints the rule itself, rounding included, on p. 28 (read on the page image).
const AT2R_THRESHOLD_CITE = "AeroTech 2: Revised Edition, p. 28";

export const SHEET_PROFILES: SheetProfile[] = [
  {
    id: "at1-fighter",
    editionId: FIGHTER_EDITIONS.at1,
    kind: "aerospace",
    layout: "at1",
    flagged: false,
    title: "Aerospace fighter record sheet",
    armor: ["CP", "NO", "LW", "RW", "FU", "EN"],
    thresholds: false,
    critical: [],
    velocity: "down",
    velocityColumns: ["Turn", "Start", "Thrust", "End", "Fuel"],
    stores: { kind: "line" },
    follows: "AeroTech, p. 3 (our own layout of the blocks it names: armor diagram, fighter data, pilot data, velocity record, heat scale and four equipment areas)",
  },
  {
    id: "at2-fighter",
    editionId: FIGHTER_EDITIONS.at2,
    kind: "aerospace",
    layout: "at2",
    flagged: true,
    title: "Fighter record sheet",
    armor: ["NO", "LW", "RW", "AF"],
    thresholds: true,
    thresholdCite: THRESHOLD_CITE,
    critical: AT2_CRITICAL,
    velocity: "down",
    velocityColumns: ["Turn", "Thrust", "Velocity", "Effective Velocity", "Fuel"],
    stores: { kind: "line" },
    follows: "the Fighter Record Sheet, AeroTech 2, p. 104",
    notice: AT2_NOTICE,
  },
  {
    id: "at2r-aerospace",
    editionId: FIGHTER_EDITIONS.at2r,
    kind: "aerospace",
    layout: "at2",
    flagged: true,
    title: "Aerospace fighter record sheet",
    armor: ["NO", "LW", "RW", "AF"],
    thresholds: true,
    thresholdCite: AT2R_THRESHOLD_CITE,
    critical: AT2_CRITICAL,
    velocity: "across",
    velocityColumns: ["Thrust", "Velocity", "Effective Velocity", "Altitude Level", "Fuel"],
    stores: AT2_STORES,
    follows: "the Aerospace Fighter Record Sheet, AeroTech 2: Revised Edition, PDF index 158",
    notice: AT2R_NOTICE,
  },
  {
    id: "at2r-conventional",
    editionId: FIGHTER_EDITIONS.at2r,
    kind: "conventional",
    layout: "at2",
    flagged: true,
    title: "Conventional aircraft record sheet",
    armor: ["NO", "LW", "RW", "AF"],
    thresholds: true,
    thresholdCite: AT2R_THRESHOLD_CITE,
    critical: AT2_CRITICAL,
    velocity: "across",
    velocityColumns: ["Thrust", "Velocity", "Effective Velocity", "Altitude Level", "Fuel"],
    stores: AT2_STORES,
    follows: "the Conventional Aircraft Record Sheet, AeroTech 2: Revised Edition, PDF index 157",
    notice: AT2R_NOTICE,
  },
  {
    id: "current-aerospace",
    editionId: FIGHTER_EDITIONS.current,
    kind: "aerospace",
    layout: "current",
    flagged: true,
    title: "Aerospace fighter record sheet",
    armor: ["NO", "LW", "RW", "AF"],
    thresholds: true,
    thresholdCite: THRESHOLD_CITE,
    critical: CURRENT_CRITICAL,
    velocity: "two-strips",
    velocityColumns: ["Thrust", "Velocity", "Effective Velocity", "Altitude"],
    stores: CURRENT_STORES,
    follows: "the Aerospace Fighter Record Sheet, Blank Record Sheets (CAT35001RS), PDF index 13",
    notice: CURRENT_NOTICE,
  },
  {
    id: "current-conventional",
    editionId: FIGHTER_EDITIONS.current,
    kind: "conventional",
    layout: "current",
    flagged: true,
    title: "Conventional fighter record sheet",
    armor: ["NO", "LW", "RW", "AF"],
    thresholds: true,
    thresholdCite: THRESHOLD_CITE,
    critical: CURRENT_CRITICAL,
    velocity: "two-strips",
    velocityColumns: ["Thrust", "Velocity", "Effective Velocity", "Altitude"],
    stores: CURRENT_STORES,
    follows: "the Conventional Fighter Record Sheet, Blank Record Sheets (CAT35001RS), PDF index 12",
    notice: CURRENT_NOTICE,
    groundTables: true,
  },
];

/** The sheet a unit prints on, or undefined where none is built yet (an edition or unit type without a fighter sheet). AeroTech 2 prints one fighter sheet for both kinds. */
export function sheetProfileFor(editionId: string, unitType: string): SheetProfile | undefined {
  const kind: SheetKind | undefined = unitType === "aerospace-fighter" ? "aerospace" : unitType === "conventional-fighter" ? "conventional" : undefined;
  if (kind === undefined) return undefined;
  const here = SHEET_PROFILES.filter((p) => p.editionId === editionId);
  return here.find((p) => p.kind === kind) ?? (editionId === FIGHTER_EDITIONS.at2 ? here[0] : undefined);
}

/** The ground-map straight movement table of the current conventional fighter sheet (CAT35001RS index 12): minimum hexes by velocity, for a fighter and for small craft and fixed-wing support vehicles; and the Fighter Return table: turns before return by Safe Thrust. */
export const GROUND_MOVEMENT: { velocity: number; fighter: number; other: number }[] = [
  [1, 8, 8],
  [2, 12, 14],
  [3, 16, 20],
  [4, 20, 26],
  [5, 24, 32],
  [6, 28, 38],
  [7, 32, 44],
  [8, 36, 50],
  [9, 40, 56],
  [10, 44, 62],
  [11, 48, 68],
  [12, 52, 74],
].map(([velocity, fighter, other]) => ({ velocity: velocity ?? 0, fighter: fighter ?? 0, other: other ?? 0 }));
export const FIGHTER_RETURN: { thrust: string; turns: number }[] = [
  { thrust: "1-4", turns: 3 },
  { thrust: "5-8", turns: 2 },
  { thrust: "9-12", turns: 1 },
  { thrust: "13+", turns: 0 },
];

/** The pieces of the footer every sheet carries. */
export const SHEET_FOOT = "Not an official record sheet. Made with Salvage Rights, an unofficial fan project.";
