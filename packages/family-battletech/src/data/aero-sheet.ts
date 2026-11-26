// What the AeroTech fighter record sheets print that is not a figure of the unit itself: the heat scale, the critical damage rows, the velocity
// record's columns, the stores boxes and the arrangement each edition's sheet follows. Plain data; nothing here runs. Figures and our own short
// labels only. Three of the four sheets follow a blank the publisher marks for personal reproduction, so their block labels and printed tables
// (heat scale, critical damage, ground movement) are carried as printed; AeroTech (1986) has no flagged sheet, so its layout is ours from the
// blocks its p. 3 names and its heat scale is our own wording of the figures on p. 26. Each profile names the page it follows and, where one
// is flagged, the page carrying the notice (the notice is cited, never copied).
import { FIGHTER_EDITIONS } from "./aero";

export type SheetKind = "aerospace" | "conventional" | "small-craft" | "dropship" | "jumpship" | "warship" | "space-station";
/** How a sheet arranges its blocks: the AeroTech (1986) fighter sheet, the AeroTech 2 pair, or the current blank. */
export type SheetLayout = "at1" | "at2" | "current" | "vessel";

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
  /** The boxes of the row, as printed: a modifier, a number of hits, or "D" for destroyed; a blank box is "". */
  boxes: string[];
  /** The row is one open field to write in (no boxes). */
  open?: boolean;
  /** The boxes are the small ones of a long row (ten across, as the Revised sheets print Docking Collars and Grav Decks). */
  small?: boolean;
}

/** Critical Damage on the AeroTech 2 and AeroTech 2 Revised sheets (AeroTech 2 p. 104; Revised index 157-158). */
const AT2_CRITICAL: CriticalRow[] = [
  { label: "Avionics", boxes: ["+1", "+2", "+5"] },
  { label: "Cargo", boxes: [], open: true },
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
  velocity: "down" | "across" | "two-strips" | "notes";
  velocityColumns: string[];
  stores: Stores;
  /** The pages the sheet follows, and the page carrying the permission notice where it is flagged. */
  follows: string;
  notice?: string;
  /** Conventional fighters of the current blank carry the straight-movement and return tables. */
  groundTables?: boolean;
  /** The page of the rule that sets the threshold. */
  thresholdCite?: string;
  /** A small craft sheet carries the heat scale; a DropShip or capital ship has none (the zero-heat rule) and lists the heat of each arc instead. */
  heatScale?: boolean;
  /** A vessel's Crew Data block: the pilot's own track (small craft) or the crew's Hits Taken and Modifier (large craft), with the word the form ends the Modifier row on. */
  crew?: { track: "pilot" | "crew"; incap: string };
  /** The range brackets the form prints for its weapon columns, in hexes: standard scale and, on a large craft, capital scale. */
  brackets?: { standard: string; capital?: string };
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

// ---- Small craft, DropShips and capital ships ----------------------------------------------------------------------------------------
// One arrangement serves them all (our own layout of the blocks the flagged blanks name: vessel data with the weapon bays by arc, the armor diagram
// with a threshold for each facing, crew data, critical damage, heat data and the velocity record). What differs by type and edition is the list
// of critical boxes, the velocity record's rows and whether the heat scale is printed. Armor areas come from the unit's own facings, not the profile.

const box = (label: string, ...boxes: string[]): CriticalRow => ({ label, boxes });
const OPEN = (label: string): CriticalRow => ({ label, boxes: [], open: true });
const AVIONICS = box("Avionics", "+1", "+2", "+5");
const SENSORS = box("Sensors", "+1", "+2", "+5");
const FCS = box("FCS", "+2", "+4", "D");
const ENGINE = box("Engine", "-1", "-2", "-3", "-4", "-5", "D");
const THRUSTERS = [box("Thrusters: Left", "+1", "+2", "+3", "D"), box("Thrusters: Right", "+1", "+2", "+3", "D")];
const CIC = box("CIC", "+2", "+4", "D");
/** AeroTech 2: the DropShip sheet, which also serves a small craft (AeroTech 2 p. 103 as printed): Cargo and Doors are open fields to write in. */
const AT2_DROPSHIP_CRITICAL: CriticalRow[] = [AVIONICS, OPEN("Cargo"), box("Docking Collar", "D"), OPEN("Doors"), ENGINE, FCS, box("Gear", "+5"), box("K-F Boom", "D"), box("Life Support", "+2"), SENSORS, ...THRUSTERS];
/** AeroTech 2: the large craft sheet (p. 102 as printed): Cargo an open field; Docking Collars, Doors and Grav Decks six blank boxes each. */
const SIX_BLANK = ["", "", "", "", "", ""];
const AT2_LARGE_CRITICAL: CriticalRow[] = [AVIONICS, OPEN("Cargo"), CIC, box("Docking Collars", ...SIX_BLANK), box("Doors", ...SIX_BLANK), ENGINE, box("Grav Decks", ...SIX_BLANK), box("Life Support", "+2"), SENSORS, ...THRUSTERS];
/** AeroTech 2 Revised: the small craft and DropShip sheets (index 159-162): Cargo 1 to 3, Doors three blank boxes. */
const AT2R_DROPSHIP_CRITICAL: CriticalRow[] = [AVIONICS, box("Cargo", "1", "2", "3"), box("Docking Collar", "D"), box("Doors", "", "", ""), ENGINE, FCS, box("Gear", "+5"), box("K-F Boom", "D"), box("Life Support", "+2"), SENSORS, ...THRUSTERS];
/** AeroTech 2 Revised: the large craft sheets (index 163-165): Docking Collars and Grav Decks a row of ten small boxes. */
const TEN_BLANK = ["", "", "", "", "", "", "", "", "", ""];
const TEN = (label: string): CriticalRow => ({ label, boxes: TEN_BLANK, small: true });
const AT2R_LARGE_ROWS = (...tail: CriticalRow[]): CriticalRow[] => [AVIONICS, box("Cargo", "1", "2", "3"), CIC, box("Doors", "", "", ""), ENGINE, box("Life Support", "+2"), SENSORS, TEN("Docking Collars"), TEN("Grav Decks"), ...THRUSTERS, ...tail];
/** The JumpShip's form also has Sail and K-F Drive Integrity boxes (index 163); the station's has a Sail but no K-F drive and no Engine row (index 165). */
const AT2R_LARGE_CRITICAL: Record<"jumpship" | "warship" | "space-station", CriticalRow[]> = {
  jumpship: AT2R_LARGE_ROWS(TEN("Sail Integrity"), TEN("K-F Drive Integrity")),
  warship: AT2R_LARGE_ROWS(TEN("Sail Integrity"), TEN("K-F Drive Integrity")),
  "space-station": AT2R_LARGE_ROWS(TEN("Sail Integrity")).filter((row) => row.label !== "Engine"),
};
/** The current blanks (CAT35001RS index 14-17; Strategic Operations: Advanced Aerospace Rules index 173-175). A space station's has no Engine row. */
const CURRENT_SMALL_CRAFT_CRITICAL: CriticalRow[] = [AVIONICS, box("Engine", "2", "4", "D"), FCS, box("Gear", "+5"), SENSORS, box("Life Support", "+2")];
const CURRENT_DROPSHIP_CRITICAL: CriticalRow[] = [AVIONICS, FCS, SENSORS, ...THRUSTERS, ENGINE, box("Gear", "+5"), box("Life Support", "+2"), box("K-F Boom", "D"), box("Docking Collar", "D")];
const CURRENT_LARGE_CRITICAL: CriticalRow[] = [AVIONICS, CIC, SENSORS, ...THRUSTERS, box("Life Support", "+2"), ENGINE];
const CURRENT_STATION_CRITICAL: CriticalRow[] = CURRENT_LARGE_CRITICAL.filter((row) => row.label !== "Engine");

/** The name of each vessel type as a sheet or its text copy says it. */
export const VESSEL_LABELS: Record<string, string> = { "small-craft": "Small craft", dropship: "DropShip", jumpship: "JumpShip", warship: "WarShip", "space-station": "Space station" };
const LABELS = VESSEL_LABELS;
const LARGE_AT2 = "AeroTech 2, p. 102";

function vessel(editionId: string, kind: SheetKind, parts: { critical: CriticalRow[]; velocity: SheetProfile["velocity"]; columns: string[]; follows: string; notice: string; thresholdCite: string; heatScale?: boolean; title?: string; crew: SheetProfile["crew"]; brackets: SheetProfile["brackets"] }): SheetProfile {
  return {
    id: `${editionId}-${kind}`,
    editionId,
    kind,
    layout: "vessel",
    flagged: true,
    title: parts.title ?? `${LABELS[kind] ?? kind} record sheet`,
    armor: [],
    thresholds: true,
    thresholdCite: parts.thresholdCite,
    critical: parts.critical,
    velocity: parts.velocity,
    velocityColumns: parts.columns,
    stores: { kind: "line" },
    follows: parts.follows,
    notice: parts.notice,
    ...(parts.heatScale === true ? { heatScale: true } : {}),
    crew: parts.crew,
    brackets: parts.brackets,
  };
}

const AT2_VELOCITY = ["Thrust", "Velocity", "Effective Velocity", "Fuel"];
const CURRENT_VELOCITY = ["Thrust", "Velocity", "Effective Velocity", "Altitude"];
/** The current JumpShip, WarShip and space station sheets' velocity record has no Altitude row (index 173-175). */
const CURRENT_LARGE_VELOCITY = ["Thrust", "Velocity", "Effective Velocity"];
const AT2R_VELOCITY = ["Thrust", "Velocity", "Effective Velocity", "Altitude Level", "Fuel"];
const AT2_THRESHOLD = "AeroTech 2, p. 19; AeroTech 2 Revised, p. 28; Total Warfare, p. 239";
const AT2R_LARGE_NOTICE = "AeroTech 2: Revised Edition, PDF index 163-165 (their foot lines give permission to photocopy for personal use)";
const SO_NOTICE = "Strategic Operations: Advanced Aerospace Rules, PDF index 173-175 (their foot lines give permission to photocopy for personal use)";
const CREW_AT2 = { track: "crew", incap: "Incap." } as const;
/** AeroTech 2 Revised prints the last Modifier box as "Incp." (index 161, 163), AeroTech 2 as "Incap." (p. 102-103). */
const CREW_AT2R = { track: "crew", incap: "Incp." } as const;
const PILOT_CURRENT = { track: "pilot", incap: "Dead" } as const;
const CREW_CURRENT = { track: "crew", incap: "Incp." } as const;
// Range brackets follow the rules table (Total Warfare p. 235; AeroTech 2 Revised p. 22). The current blanks print "6-12" and "1-6"/"1-12" in places: misprints against that table.
const STANDARD = "0-6, 7-12, 13-20, 21-25";
const CAPITAL = "0-12, 13-24, 25-40, 41-50";
const SMALL_BRACKETS = { standard: STANDARD };
const LARGE_BRACKETS = { standard: STANDARD, capital: CAPITAL };

export const VESSEL_SHEET_PROFILES: SheetProfile[] = [
  vessel(FIGHTER_EDITIONS.at2, "dropship", { critical: AT2_DROPSHIP_CRITICAL, velocity: "down", columns: AT2_VELOCITY, follows: "the DropShip Record Sheet, AeroTech 2, p. 103", notice: AT2_NOTICE.replace("p. 104", "p. 103"), thresholdCite: THRESHOLD_CITE, crew: CREW_AT2, brackets: LARGE_BRACKETS }),
  vessel(FIGHTER_EDITIONS.at2, "warship", { critical: AT2_LARGE_CRITICAL, velocity: "down", columns: AT2_VELOCITY, follows: `the Large Craft Record Sheet, ${LARGE_AT2}`, notice: AT2_NOTICE.replace("p. 104", "p. 102"), thresholdCite: THRESHOLD_CITE, title: "Large craft record sheet", crew: CREW_AT2, brackets: LARGE_BRACKETS }),
  ...(["small-craft", "dropship"] as const).map((kind) =>
    vessel(FIGHTER_EDITIONS.at2r, kind, { critical: AT2R_DROPSHIP_CRITICAL, velocity: "across", columns: AT2R_VELOCITY, follows: `the ${LABELS[kind] ?? kind} Record Sheets, AeroTech 2: Revised Edition, PDF index 159-162`, notice: AT2R_NOTICE.replace("index 158", "index 159-162"), thresholdCite: AT2_THRESHOLD, heatScale: kind === "small-craft", crew: kind === "small-craft" ? { track: "pilot", incap: "Dead" } : CREW_AT2R, brackets: kind === "small-craft" ? SMALL_BRACKETS : LARGE_BRACKETS }),
  ),
  ...(["jumpship", "warship", "space-station"] as const).map((kind) =>
    vessel(FIGHTER_EDITIONS.at2r, kind, { critical: AT2R_LARGE_CRITICAL[kind], velocity: "across", columns: AT2R_VELOCITY, follows: `the ${LABELS[kind] ?? kind} Record Sheet, AeroTech 2: Revised Edition, PDF index 163-165`, notice: AT2R_LARGE_NOTICE, thresholdCite: AT2_THRESHOLD, crew: CREW_AT2R, brackets: LARGE_BRACKETS }),
  ),
  vessel(FIGHTER_EDITIONS.current, "small-craft", { critical: CURRENT_SMALL_CRAFT_CRITICAL, velocity: "two-strips", columns: CURRENT_VELOCITY, follows: "the Small Craft Record Sheets, Blank Record Sheets (CAT35001RS), PDF index 14-15", notice: CURRENT_NOTICE.replace("12-13", "14-15"), thresholdCite: THRESHOLD_CITE, heatScale: true, crew: PILOT_CURRENT, brackets: SMALL_BRACKETS }),
  vessel(FIGHTER_EDITIONS.current, "dropship", { critical: CURRENT_DROPSHIP_CRITICAL, velocity: "two-strips", columns: CURRENT_VELOCITY, follows: "the DropShip Record Sheets, Blank Record Sheets (CAT35001RS), PDF index 16-17", notice: CURRENT_NOTICE.replace("12-13", "16-17"), thresholdCite: THRESHOLD_CITE, crew: CREW_CURRENT, brackets: LARGE_BRACKETS }),
  ...(["jumpship", "warship", "space-station"] as const).map((kind) =>
    vessel(FIGHTER_EDITIONS.current, kind, {
      // The station's sheet has no Engine row and a Notes box where the others have the Velocity Record (SO:AA index 175).
      critical: kind === "space-station" ? CURRENT_STATION_CRITICAL : CURRENT_LARGE_CRITICAL,
      velocity: kind === "space-station" ? "notes" : "two-strips",
      columns: CURRENT_LARGE_VELOCITY,
      follows: `the ${LABELS[kind] ?? kind} Record Sheet, Strategic Operations: Advanced Aerospace Rules, PDF index 173-175`,
      notice: SO_NOTICE,
      thresholdCite: THRESHOLD_CITE,
      crew: CREW_CURRENT,
      brackets: LARGE_BRACKETS,
    }),
  ),
];

const FIGHTER_KINDS: Record<string, SheetKind> = { "aerospace-fighter": "aerospace", "conventional-fighter": "conventional" };
/** The sheet a unit prints on, or undefined where none is built yet (an edition or unit type without one). AeroTech 2 prints one fighter sheet for both kinds, one DropShip sheet that also serves a small craft, and one large craft sheet for the JumpShip, WarShip and station. */
export function sheetProfileFor(editionId: string, unitType: string): SheetProfile | undefined {
  const fighter = Object.hasOwn(FIGHTER_KINDS, unitType) ? FIGHTER_KINDS[unitType] : undefined;
  const kind: SheetKind | undefined = fighter ?? (Object.hasOwn(LABELS, unitType) ? (unitType as SheetKind) : undefined);
  if (kind === undefined) return undefined;
  const here = [...SHEET_PROFILES, ...VESSEL_SHEET_PROFILES].filter((p) => p.editionId === editionId);
  const exact = here.find((p) => p.kind === kind);
  if (exact || editionId !== FIGHTER_EDITIONS.at2) return exact;
  const stand = fighter !== undefined ? "aerospace" : kind === "small-craft" ? "dropship" : "warship";
  const found = here.find((p) => p.kind === stand);
  // A small craft tracks heat on the Heat Scale (AeroTech 2 p. 12) though the DropShip sheet it prints on has none: the stand-in carries the scale.
  return found !== undefined && kind === "small-craft" ? { ...found, heatScale: true } : found;
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
