// BattleTech: Aces figures that are the book's own: the campaign setup numbers, difficulty, pilot thresholds and prices. Figures and
// identifiers only, each row with the page it was read from (against the page image); no rules wording. Plain data; nothing runs here.

/** The rulebook the figures come from (printed page numbers). */
export const ACES_BOOK = "BattleTech: Aces rulebook (Catalyst Game Labs)";
export const ACES_SS_BOOK = "BattleTech: Aces, Scouring Sands campaign book (Catalyst Game Labs)";
export const acesCite = (page: number | string): string => `${ACES_BOOK}, p. ${String(page)}`;
/** Campaign book pages are the printed numbers (the PDF index is the printed page minus 1; conflict 31). */
export const acesSsCite = (page: number | string): string => `${ACES_SS_BOOK}, p. ${String(page)}`;

export type PilotType = "BM" | "CV" | "BA";
export type DifficultyId = "rookie" | "standard" | "veteran" | "elite" | "legendary";

export interface DifficultyRow {
  id: DifficultyId;
  label: string;
  /** Percent change to the PV the player force may field in every sortie. */
  pvPercent: number;
  /** Percent of the listed SP earned from primary and secondary objectives. */
  spPercent: number;
  /** Legendary: the book says "or less", the player picks a harder number. */
  orLess?: boolean;
  cite: string;
  checked: "page";
}

/** The Campaign Difficulty Adjustments table, p. 28. */
export const DIFFICULTY: DifficultyRow[] = [
  { id: "rookie", label: "Rookie", pvPercent: 20, spPercent: 120, cite: acesCite(28), checked: "page" },
  { id: "standard", label: "Standard", pvPercent: 0, spPercent: 100, cite: acesCite(28), checked: "page" },
  { id: "veteran", label: "Veteran", pvPercent: -10, spPercent: 90, cite: acesCite(28), checked: "page" },
  { id: "elite", label: "Elite", pvPercent: -20, spPercent: 80, cite: acesCite(28), checked: "page" },
  { id: "legendary", label: "Legendary", pvPercent: -30, spPercent: 70, orLess: true, cite: acesCite(28), checked: "page" },
];

export interface ExistingForceBand {
  /** Inclusive upper bound of total SP earned by all Named Pilots; the last band has none. */
  upTo: number | null;
  pvPercent: number;
}

/** Existing Force Difficulty Modifiers, p. 29. The last row prints "12,000+"; we start it at 12,001 (conflict 32: the bands overlap at 12,000). */
export const EXISTING_FORCE_BANDS: ExistingForceBand[] = [
  { upTo: 3000, pvPercent: 0 },
  { upTo: 6000, pvPercent: -10 },
  { upTo: 9000, pvPercent: -20 },
  { upTo: 12000, pvPercent: -30 },
  { upTo: null, pvPercent: -40 },
];
export const EXISTING_FORCE_CITE = { book: ACES_BOOK, page: 29, checked: "page" } as const;

/** Campaign setup figures. */
export const CAMPAIGN_FIGURES = {
  /** PV to build a new force with (p. 26). */
  forcePv: 400,
  minUnits: 8,
  /** Every unit is bought at Skill 4, the printed card PV (p. 26). */
  forceSkill: 4,
  /** SP per unspent PV (p. 26; campaign book p. 21). */
  spPerUnspentPv: 40,
  /** Starting warchest (campaign book p. 21) and the floor for an existing force (p. 29). */
  startWarchest: 400,
  minPilots: 2,
  maxPilots: 6,
  /** SP a new Named Pilot starts with and costs to hire as a replacement (pp. 27, 34). */
  pilotStartSp: 150,
  replacementPilotCost: 150,
  cites: {
    force: acesCite(26),
    warchest: acesSsCite(21),
    existing: acesCite(29),
    pilots: acesCite(27),
    replacement: acesCite(34),
  },
  checked: "page",
} as const;

/** Advanced force creation limits (p. 26). */
export const ADVANCED_CREATION = {
  types: ["BM", "BA", "CV", "CI"],
  /** BattleMechs and OmniMechs: at most this many of one chassis, never the same variant twice. */
  mechSameChassis: 2,
  /** Every other type: at most this many of one chassis and variant. */
  otherSameVariant: 2,
  cite: acesCite(26),
  checked: "page",
} as const;

/** The pilot types and the unit types each may crew (p. 27). */
export const PILOT_TYPES: { id: PilotType; label: string; units: string[] }[] = [
  { id: "BM", label: "BattleMech", units: ["BM"] },
  { id: "CV", label: "Combat vehicle", units: ["CV"] },
  { id: "BA", label: "Battle armor", units: ["BA"] },
];

export type PilotColumn = "skill" | "edge" | "abilities";

export interface PilotColumnTable {
  id: PilotColumn;
  /** The value before any SP is spent in the column. */
  base: number;
  /** [stat value, total SP allocated to the column to reach it], rising. */
  steps: [number, number][];
}

/** SP thresholds printed on the Named Pilot card, read against the page image of p. 27. Skill falls as SP rises. */
export const PILOT_COLUMNS: PilotColumnTable[] = [
  { id: "skill", base: 4, steps: [[3, 400], [2, 900], [1, 1900], [0, 3400]] },
  { id: "edge", base: 1, steps: [[2, 60], [3, 120], [4, 200], [5, 300], [6, 420], [7, 560], [8, 720], [9, 900], [10, 1100]] },
  { id: "abilities", base: 0, steps: [[1, 60], [2, 180], [3, 360], [4, 600], [5, 900]] },
];
export const PILOT_CITE = { book: ACES_BOOK, page: 27, checked: "page" } as const;

/** Prices in SP (p. 36): buy at PV x 40, sell for half that. A regular Skill 4 PV is always used. */
export const PRICES = { buyPerPv: 40, sellPerPv: 20, cite: acesCite(36), checked: "page" } as const;

/** OMNI reconfiguration (p. 31): Size x 5 to a variant of equal or lower PV, otherwise the PV difference x 40. */
export const OMNI_COST = { perSizeDown: 5, perPvUp: 40, cite: acesCite(31), checked: "page" } as const;
