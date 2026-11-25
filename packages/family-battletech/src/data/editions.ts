// The editions the tool knows. An edition names the books it follows: which one the play rules come from and which one the
// construction rules and equipment tables come from. Plain data; nothing here runs.
import { MECH_TYPES } from "./chassis";

export interface Edition {
  id: string;
  name: string;
  books: { role: "play" | "construction"; title: string; printing: string; errata?: string }[];
  unitTypes: { id: string; name: string; ready: boolean }[];
}

// The 'Mech types (BattleMech, IndustrialMech, OmniMech) come from MECH_TYPES in data/chassis.ts, which also holds their rules; the
// other unit families wait here until their rules are built.
const UNIT_TYPES: Edition["unitTypes"] = [
  ...MECH_TYPES.map(({ id, label, ready }) => ({ id, name: label, ready })),
  { id: "vehicle", name: "Vehicle", ready: false },
  { id: "protomech", name: "ProtoMech", ready: false },
  { id: "infantry", name: "Infantry", ready: false },
];

// What a unit can be built under: its construction book, plus the book its play rules come from. Total Warfare and
// TechManual are the pair we build from.
export const EDITIONS: Edition[] = [
  {
    id: "total-warfare",
    name: "Total Warfare / TechManual",
    books: [
      { role: "play", title: "Total Warfare", printing: "corrected eleventh printing" },
      { role: "construction", title: "TechManual", printing: "corrected sixth printing", errata: "v8.0 (22 August 2024)" },
    ],
    unitTypes: UNIT_TYPES,
  },
];

export const DEFAULT_EDITION = "total-warfare";

/** The 2026 Core Rulebook is a play book only: it has no construction rules yet, so no unit can be built under it. */
export const PLAY_ONLY_BOOK = { title: "BattleTech Core Rulebook", printing: "2026, first printing" };

// Edition ids that earlier versions saved, and the edition they are read as now.
const RENAMED_EDITIONS: Record<string, string> = { "core-2026": "total-warfare" };

/** The edition a saved id means today: an id from an earlier version is mapped, any other is kept as it is. */
export function currentEditionId(id: string): string {
  return Object.hasOwn(RENAMED_EDITIONS, id) ? (RENAMED_EDITIONS[id] ?? id) : id;
}

/** How a sheet names the edition a unit was built under: the construction book and its printing. */
export function editionLine(id: string): string {
  const edition = EDITIONS.find((e) => e.id === currentEditionId(id));
  const built = edition?.books.find((b) => b.role === "construction");
  if (!edition || !built) return id;
  return `${built.title}, ${built.printing}`;
}
// Who published each book we cite. These games have had several publishers, so a citation names the one whose
// printing we read. A new book gets a row here. Tactical Operations: Advanced Units and Equipment is cited from its
// corrected seventh printing (2024); every page the app cites has the same printed number as in the sixth printing.
const PUBLISHERS: Record<string, string> = {
  "Total Warfare": "Catalyst Game Labs",
  "BattleTech Core Rulebook": "Catalyst Game Labs",
  TechManual: "Catalyst Game Labs",
  "Interstellar Operations: Alternate Eras": "Catalyst Game Labs",
  "Tactical Operations: Advanced Units and Equipment": "Catalyst Game Labs",
  "Quick-Strike: Introductory 'Mech Cards": "Catalyst Game Labs",
  "BattleTech Quick-Start Rules": "Catalyst Game Labs",
};

/** A book's title with its publisher, as citations show it: `TechManual (Catalyst Game Labs)`. */
export function bookName(title: string): string {
  const publisher = PUBLISHERS[title];
  return publisher === undefined ? title : `${title} (${publisher})`;
}

/** The Master Unit List's eras, names and years only; the list starts the Age of War in 2005. A year belongs to the era whose span holds
 * it; the last era is open-ended. Not included yet: the Clan-only eras of Interstellar Operations: Alternate Eras (Founding Years
 * 2800-2840, Golden Years 2841-3049, Post-Reaving 3086-3150), which overlap these and need a place as sub-eras. */
export interface EraRow {
  id: string;
  name: string;
  startYear: number;
  endYear?: number;
}
export const ERAS: EraRow[] = [
  { id: "age-of-war", name: "Age of War", startYear: 2005, endYear: 2570 },
  { id: "star-league", name: "Star League", startYear: 2571, endYear: 2780 },
  { id: "early-succession-war", name: "Early Succession War", startYear: 2781, endYear: 2900 },
  { id: "late-succession-war-lostech", name: "Late Succession War - LosTech", startYear: 2901, endYear: 3019 },
  { id: "late-succession-war-renaissance", name: "Late Succession War - Renaissance", startYear: 3020, endYear: 3049 },
  { id: "clan-invasion", name: "Clan Invasion", startYear: 3050, endYear: 3061 },
  { id: "civil-war", name: "Civil War", startYear: 3062, endYear: 3067 },
  { id: "jihad", name: "Jihad", startYear: 3068, endYear: 3085 },
  { id: "early-republic", name: "Early Republic", startYear: 3086, endYear: 3100 },
  { id: "late-republic", name: "Late Republic", startYear: 3101, endYear: 3130 },
  { id: "dark-ages", name: "Dark Ages", startYear: 3131, endYear: 3150 },
  { id: "ilclan", name: "ilClan", startYear: 3151 },
];
