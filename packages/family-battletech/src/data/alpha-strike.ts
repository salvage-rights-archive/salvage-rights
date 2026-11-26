// Alpha Strike identifiers: what a unit card's type, role and special-ability fields can hold. Codes and names as identifiers
// only, each with the page it is read from; no rules wording. Plain data; nothing here runs.

/** The play book the roster follows (its row in `BOOKS` comes with the edition piece). */
export const AS_EDITION = { id: "asce", name: "Alpha Strike: Commander's Edition", publisher: "Catalyst Game Labs" } as const;

/** Where each table below was read, against the page image. */
export const AS_CITES = {
  card: { book: "Alpha Strike: Commander's Edition", page: 27, checked: "page" },
  types: { book: "Alpha Strike: Commander's Edition", page: 28, checked: "page" },
  roles: { book: "Alpha Strike: Commander's Edition", pages: [112, 114], checked: "page" },
  specials: { book: "Alpha Strike: Commander's Edition", page: 205, checked: "page" },
} as const;

/** A regular-rated pilot's Skill (p. 27); the card's Skill box is blank until the player fills it. */
export const DEFAULT_SKILL = 4;
export const SKILLS = [0, 1, 2, 3, 4, 5, 6, 7];

export interface AsUnitType {
  code: string;
  name: string;
  /** Only 'Mechs and aerospace fighters track heat (p. 28). */
  heat: boolean;
  /** Ground units have a Move; aerospace units have Thrust (p. 28). */
  aerospace: boolean;
}

/** The two-letter type codes of p. 28. */
export const AS_UNIT_TYPES: AsUnitType[] = [
  { code: "BM", name: "BattleMech", heat: true, aerospace: false },
  { code: "IM", name: "IndustrialMech", heat: true, aerospace: false },
  { code: "PM", name: "ProtoMech", heat: false, aerospace: false },
  { code: "CV", name: "Combat vehicle", heat: false, aerospace: false },
  { code: "SV", name: "Support vehicle", heat: false, aerospace: false },
  { code: "BA", name: "Battle armor", heat: false, aerospace: false },
  { code: "CI", name: "Conventional infantry", heat: false, aerospace: false },
  { code: "MS", name: "Mobile structure", heat: false, aerospace: false },
  { code: "AF", name: "Aerospace fighter", heat: true, aerospace: true },
  { code: "CF", name: "Conventional fighter", heat: false, aerospace: true },
  { code: "SC", name: "Small craft", heat: false, aerospace: true },
  { code: "DS", name: "Spheroid DropShip", heat: false, aerospace: true },
  { code: "DA", name: "Aerodyne DropShip", heat: false, aerospace: true },
  // PLAY-1: an armed building (a gun emplacement) as an opposing unit in Aces: Aces rulebook p. 6; buildings ASCE pp. 72-73.
  { code: "BD", name: "Building (emplacement)", heat: false, aerospace: false },
];

/** Ground unit roles (pp. 112-114) and aerospace unit roles (p. 114). */
export const AS_GROUND_ROLES = ["Ambusher", "Brawler", "Juggernaut", "Missile Boat", "Scout", "Skirmisher", "Sniper", "Striker"];
export const AS_AEROSPACE_ROLES = ["Attack Fighter", "Dogfighter", "Fast Dogfighter", "Fire Support", "Interceptor", "Transport"];

/** Movement mode letters seen after a number of inches on p. 27 (jump) and p. 28 (the vehicle motive types). */
export const AS_MOVE_MODES = ["j", "t", "h", "w", "v", "g", "n", "s"];

/**
 * The special-ability codes of the Appendix list (p. 205), without their value marks: `IF#` is `IF`. The artillery family
 * `ARTX-#` is matched by `ARTX_FAMILY` below. Which are standard and which optional, their names and pages come with the
 * play-aids piece.
 */
export const AS_SPECIAL_CODES = [
  "ABA", "AECM", "AFC", "AM", "AMP", "AMS", "ARM", "ARS", "AT", "ATAC", "BAR", "BFC", "BH", "BHJ", "BHJ2", "BHJ3", "BIM", "BOMB", "BRA",
  "BRID", "BT", "BTAS", "C3BSM", "C3BSS", "C3EM", "C3I", "C3M", "C3RS", "C3S", "CAP", "CAR", "CASE", "CASEII", "CASEP", "CK", "CNARC",
  "CR", "CRW", "D", "DCC", "DJ", "DNI", "DRO", "DUN", "ECM", "ECS", "EE", "ENE", "ENG", "ES", "FC", "FD", "FF", "FLK", "FR", "GLD",
  "HELI", "HJ", "HPG", "HT", "HTC", "IATM", "IF", "IRA", "IT", "I-TSM", "JAM", "JMPS", "JMPW", "LAM", "LECM", "LG", "LMAS", "LPRB",
  "LRM", "LTAG", "MAG", "MAS", "MASH", "MCS", "MDS", "MEC", "MEL", "MFB", "MHQ", "MSL", "MSW", "MT", "MTAS", "MTN", "NC3", "NOVA",
  "OMNI", "ORO", "OVL", "PAR", "PNT", "PRB", "PT", "QV", "RAIL", "RAMS", "RBT", "RCA", "RCN", "REAR", "REL", "RFA", "RHS", "RSD",
  "SAW", "SCAP", "SDCS", "SDS-C", "SDS-CM", "SDS-SC", "SEAL", "SHLD", "SLG", "SNARC", "SOA", "SRCH", "SRM", "ST", "STL", "SUBS",
  "SUBW", "TAG", "TOR", "TRN", "TSEMP", "TSI", "TSM", "TSMX", "TUR", "UCS", "UMU", "VLG", "VR", "VRT", "VSTOL", "VTH", "VTM", "VTS",
  "WAT", "XMEC",
];

/** An artillery special is `ARTX-#` with a type in place of the X (for example a letters-only suffix); it is written with a dash. */
export const ARTX_FAMILY = /^ART[A-Z0-9]*$/;

/** The Skill Rating Table (p. 29): the name the book gives each Skill Rating, 0 to 7. Labels only. */
export const AS_SKILL_NAMES = ["Legendary", "Heroic", "Elite", "Veteran", "Regular", "Green", "Really Green", "Wet Behind the Ears"];

/**
 * The two stepped tables of p. 29, as the top base PV of each row: up to `rows[0]` is one point per Skill step, up to `rows[1]`
 * two points, and so on. Past the last row the footnote adds one point per further `beyond` base PV; where the footnote's first
 * band starts is read by the tables' own pattern (the band after the last row), not printed.
 */
export const AS_PV_STEPS = {
  /** Low-Skill PV Decrease Table: 0-14, 15-24, 25-34 ... 95-104. */
  decrease: { rows: [14, 24, 34, 44, 54, 64, 74, 84, 94, 104], beyond: 10 },
  /** Improved-Skill PV Increase Table: 0-7, 8-12, 13-17 ... 48-52. */
  increase: { rows: [7, 12, 17, 22, 27, 32, 37, 42, 47, 52], beyond: 5 },
} as const;

/** The Skill tables (the minimum PV of 1 is there too; errata v7.02 adds the Piloting and Gunnery average) and the force-building steps. */
export const AS_FORCE_CITES = {
  skill: { book: "Alpha Strike: Commander's Edition", page: 29, checked: "page" },
  steps: { book: "Alpha Strike: Commander's Edition", pages: [110, 112], checked: "page" },
} as const;

// ==== PLAY-1: table state (rules/as-play.ts). Figures and identifiers only, each with the page it was read from. ==============

/** The books the play tables below were read from, against the page images. */
export const AS_PLAY_CITES = {
  critical: { book: "Alpha Strike: Commander's Edition", pages: [49, 51], checked: "page" },
  heat: { book: "Alpha Strike: Commander's Edition", pages: [52, 53], checked: "page" },
  crippled: { book: "Alpha Strike: Commander's Edition", page: 127, checked: "page" },
  acesVehicle: { book: "BattleTech: Aces", page: 4, checked: "page" },
  acesInfantry: { book: "BattleTech: Aces", page: 5, checked: "page" },
  acesEmplacement: { book: "BattleTech: Aces", page: 6, checked: "page" },
  acesCrippled: { book: "BattleTech: Aces", page: 8, checked: "page" },
  quickStart: { book: "Alpha Strike Box Set Quick-Start Rules", pages: [12, 23], checked: "page" },
} as const;

/** Which rules text a game plays by: Alpha Strike: Commander's Edition, or the Aces rulebook where the two differ (conflicts 24 and 26). */
export type PlayVariant = "asce" | "aces";

export type CritKind = "ammo" | "engine" | "fire-control" | "mp" | "weapon" | "none" | "crew-stunned" | "crew-killed" | "destroyed";

/** Each table lists the result for a 2D6 roll of 2 to 12, in order. */
export const AS_CRIT_TABLES: Record<"mech" | "proto" | "vehicle" | "vehicle-aces", CritKind[]> = {
  /** ASCE p. 50. */
  mech: ["ammo", "engine", "fire-control", "none", "weapon", "mp", "weapon", "none", "fire-control", "engine", "destroyed"],
  /** ASCE p. 50. */
  proto: ["weapon", "weapon", "fire-control", "mp", "none", "mp", "none", "mp", "destroyed", "weapon", "weapon"],
  /** ASCE p. 50. */
  vehicle: ["ammo", "crew-stunned", "fire-control", "fire-control", "none", "none", "none", "weapon", "weapon", "crew-killed", "engine"],
  /** Aces rulebook p. 4: its own table, printed as different from ASCE's. */
  "vehicle-aces": ["ammo", "crew-stunned", "fire-control", "fire-control", "weapon", "mp", "weapon", "weapon", "weapon", "crew-killed", "engine"],
};

/** Which critical table a unit type rolls on. Infantry and buildings have no table: every critical hit is a Weapon Hit (Aces pp. 5-6). */
export const AS_CRIT_TABLE_OF: Record<string, "mech" | "proto" | "vehicle" | "weapon-only"> = {
  BM: "mech", IM: "mech", PM: "proto", CV: "vehicle", SV: "vehicle", BA: "weapon-only", CI: "weapon-only", BD: "weapon-only",
};

/** Motive Systems Damage Table (ASCE p. 51; Aces p. 4 for hover and wheeled): 2D6 modifier by movement letter. */
export const AS_MOTIVE_MODIFIER: Record<string, number> = { t: 0, n: 0, s: 0, w: 1, h: 1, v: 2, g: 2 };

/**
 * Motive Systems Damage Table rows by the modified roll: up to 8 no effect, 9-10 minus 2" Move and 1 TMM, 11 half, 12 and over
 * immobilised. ASCE keeps a minimum loss of 2" and 1 TMM on the half; the Aces table prints only "round down" (conflict 26).
 */
export const AS_MOTIVE_ROWS = { none: 8, minus: 10, half: 11 } as const;

/** Heat (ASCE pp. 52-53). */
export const AS_HEAT = {
  /** Level 4 is shutdown. */
  max: 4,
  /** Inches of Move lost per heat level (not when jumping). */
  inchesPerLevel: 2,
  /** TMM drops by 1 from this level (not when jumping). */
  tmmFromLevel: 2,
  /** Most heat a unit takes from outside attacks (HT) in one turn. */
  externalCap: 2,
} as const;

/** Specials that stop an Ammo Hit from destroying the unit: CASE costs 1 damage, these two cost nothing (ASCE p. 50). */
export const AS_AMMO_SAFE = ["CASEII", "ENE"] as const;

/**
 * Specials an emplacement card carries: CF is its construction factor (ASCE p. 72), IMMOBILE marks a unit that never moves (Aces
 * p. 6). The books we hold print the idea on those pages but not the code IMMOBILE itself, so it is kept as our identifier.
 */
export const AS_PLAY_SPECIAL_CODES = ["CF", "IMMOBILE"];
