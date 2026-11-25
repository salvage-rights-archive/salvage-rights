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
