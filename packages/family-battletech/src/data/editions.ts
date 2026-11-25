// The editions the tool knows. An edition names the books it follows: which one the play rules come from and which one the
// construction rules and equipment tables come from. Plain data; nothing here runs.

export interface Edition {
  id: string;
  name: string;
  books: { role: "play" | "construction"; title: string; printing: string; errata?: string }[];
  unitTypes: { id: string; name: string; ready: boolean }[];
}

const UNIT_TYPES: Edition["unitTypes"] = [
  { id: "mech", name: "BattleMech", ready: true },
  { id: "industrialmech", name: "IndustrialMech", ready: false },
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
// printing we read. A new book gets a row here.
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
