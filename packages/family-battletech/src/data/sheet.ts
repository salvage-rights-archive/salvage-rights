// What the printed record sheet shows that is not a figure of the 'Mech itself: the heat effects, the damage tracks and the
// arrangement of the critical table. Plain data; nothing here runs. The arrangement follows the published record sheets
// (Record Sheets: Jihad, 2022), which players know; the drawing and the words are ours.

import type { LocationCode } from "../rules/mech";

/** The Heat Data table: what each heat level does to a 'Mech. Read from the Core Rulebook's Heat Data table (printed p. 103,
 * "Heat Data Table with color-coded effects overlay") and checked against the Heat Data block of the published record sheet
 * (Record Sheets: Jihad), whose wording this follows. The page number is the one in the text extract's page header: "text",
 * not settled against the page image. */
export const HEAT_EFFECTS: { cite: { book: string; page: number }; checked: "page" | "text"; rows: { level: number; effect: string }[] } = {
  cite: { book: "BattleTech Core Rulebook", page: 103 },
  checked: "text",
  rows: [
    { level: 30, effect: "Shutdown" },
    { level: 28, effect: "Ammo Exp. avoid on 8+" },
    { level: 26, effect: "Shutdown, avoid on 10+" },
    { level: 25, effect: "-5 Movement Points" },
    { level: 24, effect: "+4 Modifier to Fire" },
    { level: 23, effect: "Ammo Exp. avoid on 6+" },
    { level: 22, effect: "Shutdown, avoid on 8+" },
    { level: 20, effect: "-4 Movement Points" },
    { level: 19, effect: "Ammo Exp. avoid on 4+" },
    { level: 18, effect: "Shutdown, avoid on 6+" },
    { level: 17, effect: "+3 Modifier to Fire" },
    { level: 15, effect: "-3 Movement Points" },
    { level: 14, effect: "Shutdown, avoid on 4+" },
    { level: 13, effect: "+2 Modifier to Fire" },
    { level: 10, effect: "-2 Movement Points" },
    { level: 8, effect: "+1 Modifier to Fire" },
    { level: 5, effect: "-1 Movement Points" },
  ],
};

/** The heat scale runs from 0 to this level, with an Overflow box above it. */
export const HEAT_SCALE_TOP = 30;

/** How the sheet names a heat sink type and how much heat one sink takes away. Types not here print as they are named. */
export const SHEET_HEAT_SINKS: Record<string, { label: string; perSink: number }> = {
  single: { label: "Single", perSink: 1 },
  double: { label: "Double", perSink: 2 },
  "double-clan": { label: "Double", perSink: 2 },
};

/** The Hits Taken track: the Consciousness number needed after each hit, the last being death. */
export const CONSCIOUSNESS = ["3", "5", "7", "10", "11", "Dead"];

/** The critical hit boxes under the center torso: what each hit counts. */
export const CRITICAL_BOXES: { label: string; boxes: number }[] = [
  { label: "Engine Hits", boxes: 3 },
  { label: "Gyro Hits", boxes: 2 },
  { label: "Sensor Hits", boxes: 2 },
  { label: "Life Support", boxes: 1 },
];

/** The critical table's columns, left to right and top to bottom, as the published sheet arranges them. A quad's four legs take the
 * arms' and legs' places. */
export const SHEET_COLUMNS: Record<string, LocationCode[][]> = {
  biped: [["LA", "LT", "LL"], ["HD", "CT"], ["RA", "RT", "RL"]],
  quad: [["FLL", "LT", "RLL"], ["HD", "CT"], ["FRL", "RT", "RRL"]],
  // A tripod has too much for three columns of a page, so its three legs stand together in a fourth.
  tripod: [["LA", "LT"], ["HD", "CT"], ["RA", "RT"], ["LL", "CL", "RL"]],
};

/** What an empty critical slot prints. */
export const EMPTY_SLOT = "Roll Again";

export const TECH_BASE_NAMES: Record<string, string> = { "inner-sphere": "Inner Sphere", clan: "Clan", mixed: "Mixed" };

/** The boxes the record sheet prints beside a shield-carrying arm, by equipment id: a shield's Damage Capacity (DC, a circle
 * for each point) and its Damage Absorbance (DA, a diamond for each point). The 'Mech Shield Table, read against the page
 * image. The published sheets (Record Sheets: Dark Age, 2022) print both on a plate outside the arm, DC above DA. */
export const MECH_SHIELD_BOXES: {
  cite: { book: string; page: number };
  checked: "page" | "text";
  rows: Record<string, { capacity: number; absorbance: number }>;
} = {
  cite: { book: "Tactical Operations: Advanced Units and Equipment", page: 103 },
  checked: "page",
  rows: {
    "shield-small-is": { capacity: 11, absorbance: 3 },
    "shield-medium-is": { capacity: 18, absorbance: 5 },
    "shield-large-is": { capacity: 25, absorbance: 7 },
  },
};
