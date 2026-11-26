// Alpha Strike organisation names and formation types, as requirement data. Figures, names, unit roles, special codes and page numbers
// only, each read against the page image of Alpha Strike: Commander's Edition (ASCE) printed pages 113 and 115-124. The checks that run
// the requirements are in rules/as-force.ts; the short notes on the bonuses are in data/as-glosses.ts. Nothing here runs, and nothing here
// is the book's wording: a requirement is a structure, and its sentence is written from the structure when it is shown.

export const AS_FORMATION_CITE = { book: "Alpha Strike: Commander's Edition", checked: "page", errata: "v7.02" } as const;

/** Page of the Standard Force Organization Schemes Table. */
export const AS_ORGANISATION_PAGE = 113;

export type AsOrgFamily = "is" | "clan" | "comstar";

export interface AsOrganisation {
  id: string;
  family: AsOrgFamily;
  /** The name the table gives. */
  name: string;
  /** What the table gives as the definition (troopers, units, or the smaller groups it is built of). */
  definition: string;
  rank: string;
  /** The number of units in the group, where one group is a count of units rather than of smaller groups (p. 113 and p. 115). */
  units?: [min: number, max: number];
  /** A group built of lances, Stars or Level IIs (company and up, binary and up, Level III and up), the levels a formation's requirements scale to. */
  higher?: true;
}

const org = (id: string, family: AsOrgFamily, name: string, definition: string, rank: string, units?: [number, number]): AsOrganisation => ({
  id,
  family,
  name,
  definition,
  rank,
  ...(units ? { units } : {}),
});
const up = (o: AsOrganisation): AsOrganisation => ({ ...o, higher: true });

/** The table of p. 113, in its own order. A unit count is given only for the groups made directly of units. */
export const AS_ORGANISATIONS: AsOrganisation[] = [
  org("is-squad-ba", "is", "Squad (Battle Armor)", "4 troopers", "Sergeant*"),
  org("is-squad", "is", "Squad (Conventional)", "2-8 troopers", "Corporal"),
  org("is-platoon", "is", "Platoon (Conventional)", "3-4 squads", "Sergeant"),
  org("is-company-inf", "is", "Company (Conventional)", "3-4 platoons", "Captain*"),
  org("is-flight", "is", "Flight", "2 fighters", "Lieutenant", [2, 2]),
  org("is-squadron", "is", "Squadron", "3 flights", "Captain", [6, 6]),
  up(org("is-wing", "is", "Wing", "3-4 squadrons", "Major")),
  org("is-lance", "is", "Lance", "4 ground units", "Lieutenant", [4, 4]),
  up(org("is-company", "is", "Company", "3-4 lances", "Captain")),
  up(org("is-battalion", "is", "Battalion", "3-4 companies", "Major")),
  up(org("is-regiment", "is", "Regiment", "3-4 battalions", "Colonel")),
  up(org("is-brigade", "is", "Brigade", "3-6 regiments", "General")),
  org("clan-point-ba", "clan", "Point (Battle Armor)", "5 troopers", "Point Commander*"),
  org("clan-point-conv", "clan", "Point (Conventional)", "20-25 troopers", "Point Commander"),
  org("clan-point-proto", "clan", "Point (ProtoMech)", "5 ProtoMechs", "Point Commander*"),
  org("clan-star", "clan", "Star", "5 'Mechs (10 vehicles, p. 115)", "Star Commander", [5, 10]),
  org("clan-nova", "clan", "Nova", "5 'Mechs, 5 infantry Points", "Star Commander or Nova Commander"),
  up(org("clan-binary", "clan", "Binary", "2 Stars", "Star Captain or Nova Commander")),
  up(org("clan-supernova-binary", "clan", "Supernova Binary", "2 Novas", "Star Captain or Nova Captain")),
  up(org("clan-trinary", "clan", "Trinary", "3 Stars", "Star Captain")),
  up(org("clan-supernova-trinary", "clan", "Supernova Trinary", "3 Novas", "Star Captain or Nova Captain")),
  up(org("clan-cluster", "clan", "Cluster", "3-5 Binaries or Trinaries", "Star Colonel")),
  up(org("clan-galaxy", "clan", "Galaxy", "3-5 Clusters", "Galaxy Commander")),
  org("clan-point", "clan", "Point (vehicles and fighters)", "2 units", "Point Commander", [2, 2]),
  org("clan-star-vf", "clan", "Star (vehicles and fighters)", "5 Points", "Star Commander", [10, 10]),
  org("cs-level-1-ba", "comstar", "Level I (Battle Armor)", "6 troopers", "Acolyte*"),
  org("cs-level-1-conv", "comstar", "Level I (Conventional)", "30-36 troopers", "Acolyte*"),
  org("cs-level-1", "comstar", "Level I", "1 unit", "Acolyte", [1, 1]),
  org("cs-level-2", "comstar", "Level II (Demi-Company)", "6 Level Is", "Adept", [6, 6]),
  up(org("cs-level-3", "comstar", "Level III (Battalion)", "6 Level IIs", "Adept (Demi-Precentor)")),
  up(org("cs-level-4", "comstar", "Level IV (Division)", "6 Level IIIs", "Precentor")),
  up(org("cs-level-5", "comstar", "Level V (Army)", "6 Level IVs", "Precentor")),
];

/**
 * How many units make one lance, Star or Level II, the base a higher group's requirements scale from (pp. 113 and 115): a lance is 4 ground
 * units, a Clan Star 5 'Mechs or 10 vehicles, a Level II 6; a fighter squadron is 6 (Inner Sphere), a Clan fighter Star 10, a Level II 6.
 */
export const AS_BASE_UNITS = {
  ground: { is: 4, clan: 5, comstar: 6 },
  aerospace: { is: 6, clan: 10, comstar: 6 },
} as const satisfies Record<"ground" | "aerospace", Record<AsOrgFamily, number>>;
/** A Clan Star of vehicles is 10 units (p. 115). */
export const AS_CLAN_VEHICLE_STAR = 10;

export const AS_FAMILY_NAMES: Record<AsOrgFamily, string> = { is: "Inner Sphere and Periphery", clan: "Clan", comstar: "ComStar and Word of Blake" };

// ---- Requirements -------------------------------------------------------------------------------------------------------

/**
 * What one unit must be, every field that is set at once. A damage figure is the value on the card, with 0* counted as a half point (so
 * "higher than 0" is 0.5 or more). Move is read from the card: `move` is the best of any mode with or without jumping, `ground` the best
 * non-jump mode, `jump` the best jump mode. `or` is a list of tests of which one is enough (as well as the fields beside it).
 */
export interface AsUnitTest {
  size?: { min?: number; max?: number };
  /** Any one of these unit roles (pp. 112-114). */
  role?: string[];
  move?: number;
  ground?: number;
  jump?: number;
  armor?: number;
  dmg?: { s?: number; m?: number; l?: number };
  /** Any one of these special codes; `ARTX` stands for the whole artillery family. */
  special?: string[];
  /** Any one of these unit type codes (p. 28). */
  type?: string[];
  /** The member is named as the force commander or a key officer (p. 102). */
  officer?: true;
  or?: AsUnitTest[];
}

/**
 * One requirement of a formation. Percentages round up to whole units (p. 116) unless `round` says "normal". `over` means more than that
 * share. Only shares scale with the size of the group (p. 116); a fixed count stays as written. `vehicles` limits a requirement to a group
 * made only of combat or support vehicles. A matched pair is two units with the same chassis and model (the book does not define it).
 * `same` is that many units of one chassis and model. `carry` is that every infantry unit has a transport among the group's other units
 * (p. 121). On a group above lance level a count and a pair count are multiplied by the number of lances, Stars or Level
 * IIs the group holds (the owner's rule for scaling up; the book gives none, only the sizes of p. 113 and the tables of p. 124).
 */
export type AsReq =
  | { k: "all"; test: AsUnitTest }
  | { k: "share"; pct: number; test: AsUnitTest; over?: true; round?: "normal" }
  | { k: "count"; n: number; test: AsUnitTest; /** Also no more than this many (a pair of fighters is exactly two). */ max?: number }
  | { k: "same"; n: number; test: AsUnitTest }
  | { k: "carry" }
  | { k: "none"; test: AsUnitTest }
  | { k: "pairs"; n: number; test: AsUnitTest; vehicles: true }
  | { k: "any"; of: AsReq[] };

export interface AsBonus {
  /** The page that says what the bonus is. */
  page: number;
  /** Special pilot or command abilities the bonus names (by the name the book gives them), possibly to choose from. */
  names: string[];
  /** The player picks one of `names` for the whole formation; the pick is recorded on the group. */
  choose?: true;
}

export type AsFormationLine = "ground" | "aerospace";

export interface AsFormationType {
  id: string;
  name: string;
  line: AsFormationLine;
  /** The page of its requirements. */
  page: number;
  /** A unit role that satisfies every requirement when every unit has it (p. 116); only the basic types have one. */
  ideal?: string;
  /** Another type whose requirements also apply (a variation written "in addition to" it). */
  adds?: string;
  requires: AsReq[];
  bonus: AsBonus;
  /** Unit type codes the formation is built of; absent means any. */
  types?: string[];
}

const t = (test: AsUnitTest): AsUnitTest => test;
const SPA_CHOICE_RECON = ["Eagle's Eyes", "Forward Observer", "Maneuvering Ace"];
const SPA_COMMAND = ["Antagonizer", "Blood Stalker", "Combat Intuition", "Eagle's Eyes", "Marksman", "Multi-Tasker"];
const BATTLE_BONUS: AsBonus = { page: 117, names: ["Lucky"] };
const STRIKER_BONUS: AsBonus = { page: 118, names: ["Speed Demon"] };
const ASSAULT_BONUS: AsBonus = { page: 118, names: ["Demoralizer", "Multi-Tasker"], choose: true };
const RECON_BONUS: AsBonus = { page: 119, names: SPA_CHOICE_RECON, choose: true };
const PURSUIT_BONUS: AsBonus = { page: 120, names: ["Blood Stalker"] };
const GROUND = ["BM", "IM", "PM", "CV", "SV", "BA", "CI"];
const FIGHTERS = ["AF", "CF"];
const R = { sniper: "Sniper", brawler: "Brawler", skirmisher: "Skirmisher", missile: "Missile Boat", scout: "Scout", striker: "Striker", jugg: "Juggernaut" };

/** The ground formation types of pp. 117-121 and the aerospace types of pp. 122-123, in the book's order. */
export const AS_FORMATIONS: AsFormationType[] = [
  {
    id: "battle", name: "Battle Lance", line: "ground", page: 117, ideal: R.brawler, bonus: BATTLE_BONUS,
    requires: [
      { k: "share", pct: 50, test: t({ size: { min: 3 } }) },
      { k: "count", n: 3, test: t({ role: [R.brawler, R.sniper, R.skirmisher] }) },
    ],
  },
  {
    id: "battle-light", name: "Light Battle Lance", line: "ground", page: 118, bonus: BATTLE_BONUS,
    requires: [
      { k: "share", pct: 75, test: t({ size: { min: 1, max: 1 } }) },
      { k: "none", test: t({ size: { min: 4 } }) },
      { k: "pairs", n: 2, test: t({ size: { min: 1, max: 1 } }), vehicles: true },
      { k: "count", n: 1, test: t({ role: [R.scout] }) },
    ],
  },
  {
    id: "battle-medium", name: "Medium Battle Lance", line: "ground", page: 118, bonus: BATTLE_BONUS,
    requires: [
      { k: "share", pct: 50, test: t({ size: { min: 2, max: 2 } }) },
      { k: "none", test: t({ size: { min: 4 } }) },
      { k: "pairs", n: 2, test: t({ size: { min: 2, max: 2 } }), vehicles: true },
    ],
  },
  {
    id: "battle-heavy", name: "Heavy Battle Lance", line: "ground", page: 118, bonus: BATTLE_BONUS,
    requires: [
      { k: "share", pct: 50, test: t({ size: { min: 3 } }) },
      { k: "none", test: t({ size: { max: 1 } }) },
      { k: "pairs", n: 2, test: t({ size: { min: 3 } }), vehicles: true },
    ],
  },
  {
    id: "assault", name: "Assault Lance", line: "ground", page: 118, ideal: R.jugg, bonus: ASSAULT_BONUS,
    requires: [
      { k: "count", n: 3, test: t({ size: { min: 3 } }) },
      { k: "none", test: t({ size: { max: 1 } }) },
      { k: "all", test: t({ armor: 5 }) },
      { k: "share", pct: 75, test: t({ dmg: { m: 3 } }) },
      { k: "any", of: [{ k: "count", n: 1, test: t({ role: [R.jugg] }) }, { k: "count", n: 2, test: t({ role: [R.sniper] }) }] },
    ],
  },
  {
    id: "assault-fast", name: "Fast Assault Lance", line: "ground", page: 118, adds: "assault", bonus: { ...ASSAULT_BONUS, names: ["Demoralizer", "Multi-Tasker", "Stand-Aside"] },
    requires: [{ k: "all", test: t({ or: [{ ground: 10 }, { jump: 1 }] }) }],
  },
  {
    id: "striker", name: "Striker/Cavalry Lance", line: "ground", page: 118, ideal: R.striker, bonus: STRIKER_BONUS,
    requires: [
      { k: "all", test: t({ or: [{ ground: 10 }, { jump: 8 }] }) },
      { k: "none", test: t({ size: { min: 4 } }) },
      { k: "share", pct: 50, test: t({ role: [R.striker, R.skirmisher] }) },
    ],
  },
  {
    id: "striker-light", name: "Light Striker/Cavalry Lance", line: "ground", page: 118, bonus: STRIKER_BONUS,
    requires: [
      { k: "all", test: t({ move: 10 }) },
      { k: "none", test: t({ size: { min: 3 } }) },
      { k: "count", n: 2, test: t({ dmg: { l: 0.5 } }) },
      { k: "count", n: 2, test: t({ role: [R.striker, R.skirmisher] }) },
    ],
  },
  {
    id: "striker-heavy", name: "Heavy Striker/Cavalry Lance", line: "ground", page: 119, bonus: STRIKER_BONUS,
    requires: [
      { k: "all", test: t({ move: 8 }) },
      { k: "count", n: 3, test: t({ size: { min: 3 } }) },
      { k: "none", test: t({ size: { max: 1 } }) },
      { k: "count", n: 1, test: t({ dmg: { l: 2 } }) },
      { k: "count", n: 2, test: t({ role: [R.striker, R.skirmisher] }) },
    ],
  },
  {
    id: "fire", name: "Fire Lance", line: "ground", page: 119, ideal: R.missile, bonus: { page: 119, names: ["Sniper"] },
    requires: [{ k: "share", pct: 75, test: t({ role: [R.missile, R.sniper] }) }],
  },
  {
    id: "fire-support", name: "Fire Support Lance", line: "ground", page: 119, bonus: { page: 119, names: ["Oblique Attacker"] },
    requires: [{ k: "count", n: 3, test: t({ special: ["IF"] }) }],
  },
  {
    id: "fire-artillery", name: "Artillery Fire Lance", line: "ground", page: 119, bonus: { page: 119, names: ["Oblique Artilleryman"] },
    requires: [{ k: "count", n: 2, test: t({ special: ["ARTX"] }) }],
  },
  {
    id: "fire-direct", name: "Direct Fire Lance", line: "ground", page: 119, bonus: { page: 119, names: ["Weapon Specialist"] },
    requires: [
      { k: "count", n: 2, test: t({ size: { min: 3 } }) },
      { k: "all", test: t({ dmg: { l: 2 } }) },
    ],
  },
  {
    id: "fire-antiair", name: "Anti-Air Lance", line: "ground", page: 119, adds: "fire", bonus: { page: 119, names: ["Anti-Aircraft Specialists"] },
    requires: [{ k: "count", n: 2, test: t({ special: ["FLK", "AC", "ARTX"] }) }],
  },
  {
    id: "recon", name: "Recon Lance", line: "ground", page: 119, ideal: R.scout, bonus: RECON_BONUS,
    requires: [
      { k: "all", test: t({ move: 10 }) },
      { k: "count", n: 2, test: t({ role: [R.scout, R.striker] }) },
    ],
  },
  {
    id: "recon-light", name: "Light Recon Lance", line: "ground", page: 119, bonus: { page: 119, names: SPA_CHOICE_RECON },
    requires: [
      { k: "all", test: t({ size: { min: 1, max: 1 }, move: 12 }) },
      { k: "all", test: t({ role: [R.scout] }) },
    ],
  },
  {
    id: "recon-heavy", name: "Heavy Recon Lance", line: "ground", page: 120, bonus: RECON_BONUS,
    requires: [
      { k: "all", test: t({ move: 8 }) },
      { k: "count", n: 2, test: t({ move: 10 }) },
      { k: "count", n: 1, test: t({ size: { min: 3 } }) },
      { k: "count", n: 2, test: t({ role: [R.scout] }) },
    ],
  },
  {
    id: "pursuit", name: "Pursuit Lance", line: "ground", page: 120, ideal: R.striker, bonus: PURSUIT_BONUS,
    requires: [
      { k: "all", test: t({ size: { max: 2 } }) },
      { k: "share", pct: 75, round: "normal", test: t({ move: 12 }) },
      { k: "count", n: 1, test: t({ dmg: { m: 2 } }) },
    ],
  },
  {
    id: "pursuit-probe", name: "Probe Lance", line: "ground", page: 120, bonus: PURSUIT_BONUS,
    requires: [
      { k: "all", test: t({ size: { max: 3 } }) },
      { k: "share", pct: 75, test: t({ move: 10 }) },
      { k: "all", test: t({ dmg: { m: 2 } }) },
    ],
  },
  {
    id: "pursuit-sweep", name: "Sweep Lance", line: "ground", page: 120, bonus: PURSUIT_BONUS,
    requires: [
      { k: "all", test: t({ size: { max: 2 }, move: 10 }) },
      { k: "all", test: t({ dmg: { s: 2 } }) },
    ],
  },
  {
    id: "command", name: "Command Lance", line: "ground", page: 120, bonus: { page: 120, names: [...SPA_COMMAND, "Tactical Genius"] },
    requires: [
      { k: "count", n: 1, test: t({ officer: true }) },
      { k: "share", pct: 50, test: t({ role: [R.sniper, R.missile, R.skirmisher, R.jugg] }) },
      { k: "count", n: 1, test: t({ role: [R.brawler, R.striker, R.scout] }) },
    ],
  },
  {
    id: "command-vehicle", name: "Vehicle Command Lance", line: "ground", page: 120, bonus: { page: 120, names: [...SPA_COMMAND, "Tactical Genius"] },
    requires: [
      { k: "count", n: 1, test: t({ officer: true }) },
      { k: "count", n: 2, test: t({ role: [R.sniper, R.missile, R.skirmisher, R.jugg] }) },
    ],
  },
  { id: "support", name: "Support Lance", line: "ground", page: 121, bonus: { page: 121, names: [] }, requires: [] },
  {
    id: "interceptor", name: "Interceptor Squadron", line: "aerospace", page: 122, types: FIGHTERS, bonus: { page: 122, names: ["Speed Demon", "Range Master (Long)"] },
    requires: [{ k: "share", pct: 50, over: true, test: t({ role: ["Interceptor"] }) }],
  },
  {
    id: "superiority", name: "Aerospace Superiority Squadron", line: "aerospace", page: 122, types: FIGHTERS, bonus: { page: 122, names: ["Blood Stalker", "Ride the Wash", "Hot Dog"] },
    requires: [{ k: "share", pct: 50, over: true, test: t({ role: ["Interceptor", "Fast Dogfighter"] }) }],
  },
  {
    id: "fire-support-squadron", name: "Fire Support Squadron", line: "aerospace", page: 122, types: FIGHTERS, bonus: { page: 122, names: ["Golden Goose", "Ground-Hugger", "Hot Dog", "Shaky Stick"] },
    requires: [
      { k: "share", pct: 50, test: t({ role: ["Fire Support"] }) },
      { k: "all", test: t({ role: ["Fire Support", "Dogfighter"] }) },
    ],
  },
  {
    id: "strike", name: "Strike Squadron", line: "aerospace", page: 122, types: FIGHTERS, bonus: { page: 122, names: ["Speed Demon", "Golden Goose"] },
    requires: [{ k: "share", pct: 50, over: true, test: t({ role: ["Attack Fighter", "Dogfighter"] }) }],
  },
  {
    id: "ew", name: "Electronic Warfare Squadron", line: "aerospace", page: 122, types: FIGHTERS, bonus: { page: 122, names: ["Communications Disruption"] },
    requires: [{ k: "share", pct: 50, over: true, test: t({ special: ["PRB", "AECM", "BH", "ECM", "LPRB", "LECM", "LTAG", "TAG", "WAT"] }) }],
  },
  {
    id: "transport", name: "Transport Squadron", line: "aerospace", page: 123, bonus: { page: 123, names: ["Dust-Off", "Ride the Wash", "Wind Walker"], choose: true },
    requires: [{ k: "share", pct: 50, test: t({ role: ["Transport"] }) }],
  },
];

/**
 * The three formations that sit on top of another one (p. 121): a group meets one of these and its base formation at once. `excludes` are the
 * unit types left out when the base formation is checked, so the base formation is met by the other units alone. The Mechanized and Nova
 * share their requirement and differ in what they give; the Air Lance gives nothing, and its fighters take no part in the base formation.
 */
export interface AsOverlay {
  id: string;
  name: string;
  page: number;
  excludes: string[];
  requires: AsReq[];
  bonus: AsBonus;
}

const INFANTRY = ["BA", "CI"];
const COMBINED: AsReq[] = [{ k: "count", n: 1, test: t({ type: INFANTRY }) }, { k: "carry" }];

export const AS_OVERLAYS: AsOverlay[] = [
  { id: "mechanized", name: "Mechanized", page: 121, excludes: INFANTRY, requires: COMBINED, bonus: { page: 121, names: [] } },
  { id: "nova", name: "Nova", page: 121, excludes: INFANTRY, requires: COMBINED, bonus: { page: 121, names: [] } },
  {
    id: "air-lance", name: "Air Lance", page: 121, excludes: FIGHTERS, bonus: { page: 121, names: [] },
    requires: [
      { k: "none", test: t({ type: INFANTRY }) },
      { k: "count", n: 2, max: 2, test: t({ type: FIGHTERS }) },
      { k: "same", n: 2, test: t({ type: FIGHTERS }) },
    ],
  },
];

/** The "ground" unit types a lance or Star is built of (pp. 115-117). */
export const AS_GROUND_TYPES = GROUND;
