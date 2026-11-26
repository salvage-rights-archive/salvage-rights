// Scouring Sands, the Aces campaign box: the figures of each sortie, read from the page images of the campaign book (printed page =
// PDF index + 1), every row `checked: "page"`. Only game mechanics are here: unit names as printed on their cards, Skill, deck, PV,
// SP figures, limits, waypoint letters and where they go, the command deck and its start card, turn limits, the Named Pilot SP cap
// and the next sortie numbers. No story, briefing, objective or special-rule wording, no waypoint text and no keyword names: the
// player reads those in their own book ("read 02-Y in your book"). Names of options are the book's entry numbers, nothing more.
import { acesSsCite } from "./aces";

/** An opposing unit row: the name on its card, its Skill and the deck it plays by (role and subtype), as in the book's list. */
export interface SsUnit {
  name: string;
  skill: number;
  count?: number;
  /** Absent for emplacements, which have no deck. */
  deck?: { role: string; subtype?: string };
  commander?: true;
  /** Held back at the start (the book's reserve or "enters on its first activation" lists). */
  reserve?: true;
  /** The unit is in the force only for a player who has the keyword the sortie names (true) or lacks it (false); which keyword is in the book. */
  ifKeyword?: boolean;
}

export interface SsRecon {
  /** The waypoint entry to read, "02-Y"; absent when the page gives only a cost. */
  entry?: string;
  /** SP to spend, printed on the sortie page or (marked in `cite`) in the entry. 0 when free. */
  sp: number;
  /** The option is open only to a player with a keyword; which one is in the book. */
  keyword?: true;
  /** A page other than the sortie's own, when the cost is printed in the entry. */
  cite?: string;
}

export interface SsWaypoints {
  /** Letters as the book writes them: "A", "A-E". */
  letters: string;
  at: "map" | "turn" | "unit" | "other";
  /** One turn for a single token. */
  turn?: number;
  /** Several turns for a shuffled group, one token on each. */
  turns?: number[];
  /** The opposing unit's position in its list, or the player's unit for "player". */
  unit?: number;
  /** Tokens returned to the box without looking. */
  returned?: number;
}

export interface SsSortie {
  id: string;
  /** 0 for the two tutorials, 1-21 for the campaign sorties. */
  n: number;
  /** The book's short title. */
  title: string;
  /** Pages of the sortie (printed), and the page of its outcome entry. */
  pages: string;
  outcomePage?: number;
  checked: "page";
  player: {
    pv: number;
    maxUnits?: number;
    /** Exactly this many units. */
    units?: number;
    /** The sortie asks for two separate forces. */
    forces?: number;
    /** Allied Apolakkian vehicles, not counted in the PV (count absent: set by a keyword). */
    allies?: { name: string; count?: number };
    /** A supplied force for the tutorials. */
    supplied?: { name: string; skill: number; edge?: number; commander?: true }[];
  };
  /** `none`: no options; `one`: one of the options; `any`: any or all. */
  recon: { pick: "none" | "one" | "any"; options: SsRecon[] };
  waypoints: SsWaypoints[];
  opposing: { pv: number; units: SsUnit[] };
  command: { commander: string; faction: string; start: "A" | "B" | "C" | "D" | "E" };
  /** Primary and secondary SP as printed; `primaryAlt` is the other way to reach the primary where the book gives two. */
  objectives: { primary?: number; primaryAlt?: number; secondary?: number; third?: number; /** The secondary figure is paid for each item the book names, not once. */ secondaryEach?: true };
  /** Turns to play; null when the sortie has no limit. */
  turns: number | null;
  /** Forced withdrawal: for the opposing units only, or none. */
  withdrawal: "none" | "automated";
  /** Where the book sets the Command Deck back: a waypoint entry, "primary" or "rule", and the card. */
  commandResets: { when: string; to: "A" | "E" }[];
  /** Named Pilot SP cap from the outcome. */
  spCap?: number;
  /** Next sortie numbers; a keyword decides some, and an empty list with `epilogue` ends the campaign. */
  next: { n: number; keyword?: true }[];
  epilogue?: true;
  /** The rules a sortie needs switched on (p. 4): both for every Scouring Sands sortie. */
  rules?: { multipleAttackRolls: true; frontLoaded: true };
}

const JF = "Clan Jade Falcon";
const MW = "MechWarrior";
const SC = "Star Captain";

const unit = (name: string, skill: number, role?: string, subtype?: string, more: Partial<SsUnit> = {}): SsUnit => ({
  name,
  skill,
  ...(role ? { deck: { role, ...(subtype ? { subtype } : {}) } } : {}),
  ...more,
});
const cmdr = { commander: true } as const;
const reserve = { reserve: true } as const;
const FULCRUM = (second = false, more: Partial<SsUnit> = {}): SsUnit => unit(second ? "Fulcrum Heavy Hovertank II" : "Fulcrum Heavy Hovertank", 3, "Striker", "Hover", { count: 2, ...more });
const ELEMENTAL = (count: number, more: Partial<SsUnit> = {}): SsUnit => unit("Elemental [AP Gauss] (Sqd5)", 3, "Ambusher", "Infantry", { count, ...more });
const MED_EMPL = (count: number, more: Partial<SsUnit> = {}): SsUnit => unit("Medium Emplacement [Twin AC/5s]", 4, undefined, undefined, { count, ...more });
const FOOT = (count: number): SsUnit => unit("Clan Foot Point (Advanced) (Rifle, Energy)", 3, "Ambusher", "Infantry", { count, ...reserve });

const base = {
  checked: "page",
  rules: { multipleAttackRolls: true, frontLoaded: true },
} as const;

const NO_RECON: SsSortie["recon"] = { pick: "none", options: [] };

export const SS_SORTIES: SsSortie[] = [
  {
    ...base,
    id: "00-battlerom",
    n: 0,
    title: "BattleROM Review",
    pages: "4-5",
    player: {
      pv: 145,
      maxUnits: 4,
      supplied: [
        { name: "ARC-7C Archer", skill: 4 },
        { name: "WHM-8R Warhammer", skill: 4 },
        { name: "PXH-4M Phoenix Hawk", skill: 4 },
        { name: "LCT-7V Locust", skill: 4 },
      ],
    },
    recon: NO_RECON,
    waypoints: [],
    opposing: { pv: 113, units: [unit("Timber Wolf T", 3, "Brawler"), unit("Pouncer Prime", 3, "Sniper")] },
    command: { commander: MW, faction: JF, start: "C" },
    objectives: {},
    turns: 7,
    withdrawal: "none",
    commandResets: [],
    next: [],
  },
  {
    ...base,
    id: "00-simulator",
    n: 0,
    title: "Training Simulator",
    pages: "12-13",
    outcomePage: 14,
    player: {
      pv: 308,
      maxUnits: 8,
      supplied: [
        { name: "AS7-S4 Atlas", skill: 3, commander: true },
        { name: "ARC-7C Archer", skill: 3 },
        { name: "WHM-8R Warhammer", skill: 4, edge: 2 },
        { name: "BJ-5 Blackjack", skill: 4 },
        { name: "TR5 Wraith", skill: 4 },
        { name: "PXH-4M Phoenix Hawk", skill: 4, edge: 2 },
        { name: "WSP-5A Wasp", skill: 4 },
        { name: "LCT-7V Locust", skill: 4 },
      ],
    },
    recon: NO_RECON,
    waypoints: [
      { letters: "A-F", at: "map" },
      { letters: "G", at: "turn", turn: 3 },
    ],
    opposing: {
      pv: 309,
      units: [
        unit("Warhawk T", 2, "Juggernaut", undefined, cmdr),
        unit("Timber Wolf T", 2, "Brawler"),
        unit("Nova T", 2, "Skirmisher"),
        unit("Pouncer Prime", 2, "Sniper", undefined, reserve),
        unit("Fire Moth G", 2, "Striker", undefined, reserve),
      ],
    },
    command: { commander: SC, faction: JF, start: "A" },
    objectives: {},
    turns: 7,
    withdrawal: "automated",
    commandResets: [],
    next: [],
  },
  {
    ...base,
    id: "01",
    n: 1,
    title: "Meeting the Locals",
    pages: "22-23",
    outcomePage: 64,
    player: { pv: 180 },
    recon: NO_RECON,
    waypoints: [
      { letters: "A-E", at: "unit" },
      { letters: "F", at: "turn", turn: 4 },
    ],
    opposing: {
      pv: 213,
      units: [unit("Rifleman C 2", 3, "Skirmisher", "JMPS", cmdr), unit("Locust IIC 4", 3, "Scout"), unit("Howler 6", 3, "Striker"), FULCRUM()],
    },
    command: { commander: MW, faction: JF, start: "A" },
    objectives: { primary: 900, secondary: 450 },
    turns: 6,
    withdrawal: "automated",
    commandResets: [{ when: "01-F", to: "E" }],
    spCap: 80,
    next: [{ n: 4 }, { n: 5 }],
  },
  {
    ...base,
    id: "02",
    n: 2,
    title: "Putting Down Roots",
    pages: "24-25",
    outcomePage: 65,
    player: { pv: 120 },
    recon: {
      pick: "one",
      options: [
        { entry: "02-Y", sp: 60 },
        { entry: "02-Z", sp: 120 },
      ],
    },
    waypoints: [
      { letters: "F-I", at: "map" },
      { letters: "J", at: "turn", turn: 4 },
    ],
    opposing: { pv: 159, units: [unit("Locust IIC 4", 3, "Striker", undefined, cmdr), unit("Howler 6", 3, "Scout"), FULCRUM()] },
    command: { commander: MW, faction: JF, start: "C" },
    objectives: { primary: 600, secondary: 300 },
    turns: 6,
    withdrawal: "automated",
    commandResets: [{ when: "02-J", to: "E" }],
    spCap: 80,
    next: [{ n: 6 }, { n: 5 }],
  },
  {
    ...base,
    id: "03",
    n: 3,
    title: "Coming in Hot",
    pages: "26-27",
    outcomePage: 66,
    player: { pv: 240 },
    recon: { pick: "any", options: [{ entry: "03-Z", sp: 150 }] },
    waypoints: [
      { letters: "A-C", at: "turn", turns: [2, 3, 4] },
      { letters: "D", at: "turn", turn: 6 },
      { letters: "E-I", at: "map" },
    ],
    opposing: {
      pv: 233,
      units: [
        unit("Heavy Emplacement", 4, undefined, undefined, { count: 2 }),
        unit("Howler 6", 3, "Scout"),
        unit("Bane 5", 3, "Juggernaut"),
        unit("Locust IIC 4", 3, "Striker", undefined, reserve),
        unit("Summoner H", 3, "Skirmisher", undefined, { ...cmdr, ...reserve }),
        FOOT(2),
      ],
    },
    command: { commander: MW, faction: JF, start: "A" },
    objectives: { primary: 1500, secondary: 750 },
    turns: 10,
    withdrawal: "none",
    commandResets: [],
    spCap: 80,
    next: [{ n: 6 }, { n: 5 }],
  },
  {
    ...base,
    id: "04",
    n: 4,
    title: "Tunnel Raid",
    pages: "28-29",
    outcomePage: 67,
    player: { pv: 240 },
    recon: {
      pick: "any",
      options: [
        { entry: "04-Y", sp: 60 },
        { entry: "04-Z", sp: 120 },
      ],
    },
    waypoints: [
      { letters: "A-G", at: "map" },
      { letters: "H", at: "turn", turn: 6 },
    ],
    opposing: { pv: 184, units: [ELEMENTAL(2), unit("Rifleman C 3", 3, "Sniper"), unit("Summoner A", 3, "Sniper", undefined, cmdr), MED_EMPL(4)] },
    command: { commander: MW, faction: JF, start: "A" },
    objectives: { primary: 900, primaryAlt: 300, secondary: 600 },
    turns: 10,
    withdrawal: "none",
    commandResets: [],
    spCap: 80,
    next: [{ n: 7 }, { n: 8 }],
  },
  {
    ...base,
    id: "05",
    n: 5,
    title: "Not One Step More",
    pages: "30-31",
    outcomePage: 68,
    player: { pv: 300 },
    recon: {
      pick: "any",
      options: [
        { entry: "05-Y", sp: 60 },
        { entry: "05-Z", sp: 120 },
      ],
    },
    waypoints: [
      { letters: "A-K", at: "map" },
      { letters: "L", at: "turn", turn: 2 },
    ],
    opposing: {
      pv: 237,
      units: [
        unit("Thunderbolt IIC 2", 3, "Brawler", undefined, cmdr),
        unit("Rifleman C 3", 3, "Sniper"),
        unit("Summoner H", 3, "Skirmisher"),
        unit("Marauder IIC 6", 3, "Skirmisher", "JMPS"),
        unit("Howler 6", 3, "Striker"),
        ELEMENTAL(1),
        FULCRUM(false, { ifKeyword: true }),
      ],
    },
    command: { commander: MW, faction: JF, start: "A" },
    objectives: { primary: 1500, secondary: 750 },
    turns: 10,
    withdrawal: "automated",
    commandResets: [{ when: "05-N", to: "E" }],
    spCap: 80,
    next: [{ n: 9 }, { n: 8 }],
  },
  {
    ...base,
    id: "06",
    n: 6,
    title: "A Falcon in Flight",
    pages: "32-33",
    outcomePage: 69,
    player: { pv: 240 },
    recon: {
      pick: "one",
      options: [
        { entry: "06-J", sp: 200 },
        { entry: "06-Z", sp: 100 },
      ],
    },
    waypoints: [
      { letters: "A-G", at: "map" },
      { letters: "L", at: "unit", unit: 1 },
    ],
    opposing: {
      pv: 225,
      units: [unit("Marauder IIC 10", 2, "Skirmisher", "JMPS", cmdr), unit("Howler 6", 3, "Striker"), ELEMENTAL(2), ELEMENTAL(3, reserve)],
    },
    command: { commander: MW, faction: JF, start: "A" },
    objectives: { primary: 1200, secondary: 600 },
    turns: 7,
    withdrawal: "none",
    commandResets: [],
    spCap: 80,
    next: [{ n: 7 }, { n: 9 }],
  },
  {
    ...base,
    id: "07",
    n: 7,
    title: "Supply Lines",
    pages: "34-35",
    outcomePage: 70,
    player: { pv: 180, maxUnits: 6 },
    recon: { pick: "any", options: [{ entry: "07-Y", sp: 0, keyword: true }] },
    waypoints: [
      { letters: "A-F", at: "other" },
      { letters: "G-K", at: "other", returned: 1 },
    ],
    opposing: {
      pv: 230,
      units: [
        unit("Heavy Hover APC (MG)", 3, "Scout", "Hover", { count: 2 }),
        FULCRUM(),
        unit("Marauder IIC 6", 3, "Skirmisher"),
        unit("Summoner A", 3, "Brawler", undefined, cmdr),
        unit("Howler", 3, "Scout"),
      ],
    },
    command: { commander: SC, faction: JF, start: "A" },
    objectives: { primary: 900, secondary: 450 },
    turns: 7,
    withdrawal: "none",
    commandResets: [],
    spCap: 100,
    next: [{ n: 10 }],
  },
  {
    ...base,
    id: "08",
    n: 8,
    title: "Uncovering Plans",
    pages: "36-37",
    outcomePage: 71,
    player: { pv: 150 },
    recon: { pick: "any", options: [{ entry: "08-Z", sp: 200, cite: acesSsCite(71) }] },
    waypoints: [
      { letters: "A-C", at: "turn", turns: [2, 4, 6] },
      { letters: "D-L", at: "map" },
    ],
    opposing: {
      pv: 213,
      units: [
        MED_EMPL(2),
        unit("Elemental [AP Gauss] (Sqd5)", 3, "Ambusher", "Infantry", { count: 3, commander: true }),
        unit("Summoner A", 3, "Sniper", undefined, reserve),
        unit("Rifleman C 3", 3, "Sniper", undefined, reserve),
        unit("Howler", 3, "Striker", undefined, reserve),
      ],
    },
    command: { commander: MW, faction: JF, start: "A" },
    objectives: { primary: 800, secondary: 100, secondaryEach: true },
    turns: 7,
    withdrawal: "none",
    commandResets: [],
    spCap: 100,
    next: [{ n: 10 }],
  },
  {
    ...base,
    id: "09",
    n: 9,
    title: "Shatterstrike",
    pages: "38-39",
    outcomePage: 72,
    player: { pv: 360 },
    recon: {
      pick: "any",
      options: [
        { entry: "09-Y", sp: 150, keyword: true, cite: acesSsCite(71) },
        { entry: "09-Z", sp: 120 },
      ],
    },
    waypoints: [
      { letters: "A-C", at: "map" },
      { letters: "D-H", at: "turn", turns: [3, 5, 7], returned: 2 },
    ],
    opposing: {
      pv: 321,
      units: [
        unit("Heavy Emplacement [AC/20]", 4, undefined, undefined, { count: 2 }),
        MED_EMPL(2),
        unit("Thunderbolt IIC", 3, "Brawler"),
        unit("Bane 3", 3, "Missile Boat", undefined, cmdr),
        unit("Marauder IIC 6", 3, "Skirmisher"),
        unit("Rifleman C 3", 3, "Sniper"),
        unit("Howler", 3, "Scout"),
      ],
    },
    command: { commander: SC, faction: JF, start: "B" },
    objectives: { primary: 1800, secondary: 900 },
    turns: 10,
    withdrawal: "automated",
    commandResets: [{ when: "primary", to: "E" }],
    spCap: 100,
    next: [{ n: 10 }],
  },
  {
    ...base,
    id: "10",
    n: 10,
    title: "Face of the Enemy",
    pages: "40-41",
    outcomePage: 73,
    player: { pv: 360, allies: { name: "Heavy Hover APC", count: 3 } },
    recon: {
      pick: "one",
      options: [
        { entry: "10-X", sp: 0, keyword: true },
        { entry: "10-Y", sp: 0, keyword: true },
        { entry: "10-Z", sp: 0, keyword: true },
      ],
    },
    waypoints: [
      { letters: "A-I", at: "map", returned: 1 },
      { letters: "J-K", at: "turn", turn: 2 },
    ],
    opposing: {
      pv: 315,
      units: [
        unit("Thunderbolt IIC", 2, "Brawler", undefined, cmdr),
        unit("Bane 3", 3, "Missile Boat"),
        unit("Summoner H", 3, "Skirmisher"),
        unit("Howler 6", 3, "Scout", undefined, reserve),
        unit("Locust IIC", 3, "Striker", undefined, reserve),
      ],
    },
    command: { commander: SC, faction: JF, start: "B" },
    objectives: { primary: 1800, secondary: 200, secondaryEach: true },
    turns: 7,
    withdrawal: "automated",
    commandResets: [],
    spCap: 120,
    next: [{ n: 11 }, { n: 12 }, { n: 13 }],
  },
  {
    ...base,
    id: "11",
    n: 11,
    title: "Operation: Hammer",
    pages: "42-43",
    outcomePage: 74,
    player: { pv: 360 },
    recon: {
      pick: "any",
      options: [
        { entry: "11-X", sp: 0, keyword: true },
        { entry: "11-Y", sp: 0, keyword: true },
        { entry: "11-Z", sp: 120 },
      ],
    },
    waypoints: [
      { letters: "A", at: "other" },
      { letters: "B-F", at: "map" },
    ],
    opposing: {
      pv: 323,
      units: [
        MED_EMPL(4),
        unit("Summoner A", 3, "Brawler", undefined, cmdr),
        unit("Marauder IIC 6", 3, "Skirmisher", "JMPS"),
        unit("Rifleman C 3", 3, "Sniper"),
        unit("Locust IIC", 3, "Striker"),
        unit("Bane 3", 3, "Missile Boat", undefined, { ifKeyword: false }),
      ],
    },
    command: { commander: SC, faction: JF, start: "A" },
    objectives: { primary: 1800, secondary: 500, third: 400 },
    turns: 10,
    withdrawal: "automated",
    commandResets: [{ when: "primary", to: "E" }],
    spCap: 100,
    next: [{ n: 14 }, { n: 15 }],
  },
  {
    ...base,
    id: "12",
    n: 12,
    title: "No Time to Rest",
    pages: "44-45",
    outcomePage: 75,
    player: { pv: 300, allies: { name: "Heavy Hover APC" } },
    recon: { pick: "any", options: [{ entry: "12-Z", sp: 120 }] },
    waypoints: [
      { letters: "A", at: "turn", turn: 3 },
      { letters: "B-E", at: "turn", turns: [2, 4, 5, 6] },
    ],
    opposing: {
      pv: 286,
      units: [
        unit("Thunderbolt IIC", 2, "Brawler", undefined, cmdr),
        unit("Rifleman C 2", 3, "Skirmisher", "JMPS"),
        unit("Summoner A", 3, "Sniper"),
        FULCRUM(true, reserve),
      ],
    },
    command: { commander: SC, faction: JF, start: "A" },
    objectives: { primary: 1400, secondary: 200, secondaryEach: true },
    turns: 10,
    withdrawal: "automated",
    commandResets: [{ when: "primary", to: "E" }],
    spCap: 100,
    next: [{ n: 15 }, { n: 17 }, { n: 16, keyword: true }],
  },
  {
    ...base,
    id: "13",
    n: 13,
    title: "Counterstrike Recovery",
    pages: "46-47",
    outcomePage: 75,
    player: { pv: 200, maxUnits: 6 },
    recon: NO_RECON,
    waypoints: [
      { letters: "L", at: "turn", turn: 3 },
      { letters: "A-K", at: "other" },
    ],
    opposing: {
      pv: 229,
      units: [unit("Rifleman C 2", 3, "Skirmisher", "JMPS", cmdr), unit("Locust IIC 4", 3, "Striker"), unit("Howler 6", 3, "Scout"), FULCRUM(true)],
    },
    command: { commander: SC, faction: JF, start: "A" },
    objectives: { primary: 600, secondary: 1200 },
    turns: 10,
    withdrawal: "automated",
    commandResets: [],
    spCap: 100,
    next: [{ n: 15 }, { n: 17 }, { n: 16, keyword: true }],
  },
  {
    ...base,
    id: "14",
    n: 14,
    title: "Kill the Signal",
    pages: "48-49",
    outcomePage: 76,
    player: { pv: 240 },
    recon: {
      pick: "any",
      options: [
        { entry: "14-Y", sp: 120 },
        { entry: "14-Z", sp: 0 },
      ],
    },
    waypoints: [
      { letters: "A-E", at: "map", returned: 1 },
      { letters: "F", at: "turn", turn: 3 },
      { letters: "L", at: "unit", unit: 1 },
    ],
    opposing: {
      pv: 256,
      units: [
        unit("Thunderbolt IIC", 2, "Brawler", undefined, cmdr),
        unit("Marauder IIC 6", 3, "Skirmisher", "JMPS"),
        unit("Rifleman C 2", 3, "Skirmisher", "JMPS"),
        unit("Howler 6", 3, "Striker"),
        ELEMENTAL(2, reserve),
      ],
    },
    command: { commander: SC, faction: JF, start: "A" },
    objectives: { primary: 1400, secondary: 200, secondaryEach: true },
    turns: 7,
    withdrawal: "automated",
    commandResets: [],
    spCap: 100,
    next: [{ n: 21 }],
  },
  {
    ...base,
    id: "15",
    n: 15,
    title: "Power Rush",
    pages: "50-51",
    outcomePage: 77,
    player: { pv: 300 },
    recon: {
      pick: "any",
      options: [
        { entry: "15-Y", sp: 0, keyword: true },
        { entry: "15-Z", sp: 200 },
      ],
    },
    waypoints: [
      { letters: "A-G", at: "map" },
      { letters: "H-K", at: "turn", turns: [2, 3, 4], returned: 1 },
      { letters: "L", at: "turn", turn: 5 },
    ],
    opposing: {
      pv: 305,
      units: [
        unit("Rifleman C 2", 3, "Skirmisher", "JMPS"),
        unit("Marauder IIC 6", 3, "Skirmisher", "JMPS"),
        unit("Summoner H", 3, "Skirmisher", undefined, cmdr),
        unit("Locust IIC", 3, "Striker"),
        unit("Howler 6", 3, "Scout"),
        FOOT(5),
      ],
    },
    command: { commander: MW, faction: JF, start: "A" },
    objectives: { primary: 1500, secondary: 150, secondaryEach: true },
    turns: 10,
    withdrawal: "none",
    commandResets: [],
    spCap: 100,
    next: [{ n: 18, keyword: true }, { n: 19 }],
  },
  {
    ...base,
    id: "16",
    n: 16,
    title: "Playing Chess",
    pages: "52-53",
    outcomePage: 78,
    player: { pv: 400, forces: 2 },
    recon: {
      pick: "one",
      options: [
        { sp: 150 },
        { sp: 100 },
      ],
    },
    waypoints: [
      { letters: "A-I", at: "other" },
      { letters: "L", at: "unit", unit: 1 },
    ],
    opposing: {
      pv: 243,
      units: [unit("Thunderbolt IIC", 2, "Brawler", undefined, cmdr), unit("Bane 5", 3, "Juggernaut"), FULCRUM(true)],
    },
    command: { commander: SC, faction: JF, start: "A" },
    objectives: { primary: 1300, secondary: 250, secondaryEach: true },
    turns: 7,
    withdrawal: "automated",
    commandResets: [{ when: "rule", to: "A" }],
    spCap: 100,
    next: [{ n: 19 }],
  },
  {
    ...base,
    id: "17",
    n: 17,
    title: "No Matter the Cost",
    pages: "54-55",
    outcomePage: 79,
    player: { pv: 300 },
    recon: {
      pick: "any",
      options: [
        { entry: "17-Y", sp: 0, keyword: true },
        { entry: "17-Z", sp: 120 },
      ],
    },
    waypoints: [
      { letters: "A-F", at: "map" },
      { letters: "L", at: "unit", unit: 5 },
    ],
    opposing: {
      pv: 253,
      units: [
        MED_EMPL(4),
        unit("Thunderbolt IIC", 2, "Brawler", undefined, { ...cmdr, ...reserve }),
        unit("Summoner H", 3, "Skirmisher", undefined, reserve),
        ELEMENTAL(4, reserve),
      ],
    },
    command: { commander: SC, faction: JF, start: "A" },
    objectives: { primary: 1500, secondary: 750 },
    turns: 10,
    withdrawal: "none",
    commandResets: [{ when: "primary", to: "E" }],
    spCap: 100,
    next: [{ n: 20 }],
  },
  {
    ...base,
    id: "18",
    n: 18,
    title: "The Final Charge",
    pages: "56-57",
    outcomePage: 80,
    player: { pv: 400 },
    recon: NO_RECON,
    waypoints: [
      { letters: "A-C", at: "turn", turns: [2, 3, 5] },
      { letters: "D-F", at: "other" },
      { letters: "L", at: "unit", unit: 1 },
    ],
    opposing: {
      pv: 492,
      units: [
        unit("Thunderbolt IIC", 2, "Brawler", undefined, cmdr),
        unit("Marauder IIC 6", 3, "Skirmisher", "JMPS"),
        unit("Bane 3", 3, "Juggernaut"),
        unit("Rifleman C 3", 3, "Sniper"),
        unit("Summoner H", 3, "Skirmisher"),
        unit("Locust IIC", 3, "Striker"),
        unit("Howler 6", 3, "Scout"),
        FULCRUM(true, reserve),
      ],
    },
    command: { commander: SC, faction: JF, start: "B" },
    objectives: { primary: 2400, secondary: 120, secondaryEach: true },
    turns: 10,
    withdrawal: "automated",
    commandResets: [],
    spCap: 120,
    next: [],
    epilogue: true,
  },
  {
    ...base,
    id: "19",
    n: 19,
    title: "Hold the Line",
    pages: "58-59",
    outcomePage: 81,
    player: { pv: 400 },
    recon: {
      pick: "any",
      options: [
        { entry: "19-Y", sp: 0, keyword: true },
        { entry: "19-Z", sp: 200 },
        { sp: 100 },
      ],
    },
    waypoints: [
      { letters: "A-H", at: "other" },
      { letters: "I", at: "turn", turn: 2 },
      { letters: "J-K", at: "turn", turns: [3, 4] },
      { letters: "L", at: "unit", unit: 9 },
    ],
    opposing: {
      pv: 403,
      units: [
        FULCRUM(),
        unit("Summoner H", 3, "Brawler"),
        unit("Rifleman C 3", 3, "Sniper"),
        ELEMENTAL(2, reserve),
        unit("Bane 3", 3, "Juggernaut", undefined, { ...cmdr, ...reserve }),
        unit("Marauder IIC 6", 3, "Skirmisher", "JMPS", reserve),
        unit("Thunderbolt IIC", 2, "Skirmisher", undefined, { ...cmdr, ...reserve, ifKeyword: false }),
      ],
    },
    command: { commander: SC, faction: JF, start: "A" },
    objectives: { primary: 2400, secondary: 1200 },
    turns: 10,
    withdrawal: "none",
    commandResets: [],
    spCap: 120,
    next: [],
    epilogue: true,
  },
  {
    ...base,
    id: "20",
    n: 20,
    title: "Operation: Clean Sweep",
    pages: "60-61",
    outcomePage: 82,
    player: { pv: 360 },
    recon: { pick: "any", options: [{ entry: "20-Z", sp: 200 }] },
    waypoints: [
      { letters: "A-I", at: "map", returned: 1 },
      { letters: "J", at: "turn", turn: 3 },
      { letters: "K", at: "turn", turn: 5 },
    ],
    opposing: {
      pv: 340,
      units: [
        unit("Marauder IIC 6", 3, "Skirmisher", "JMPS", cmdr),
        unit("Bane 5", 3, "Sniper"),
        unit("Summoner H", 3, "Skirmisher"),
        unit("Locust IIC", 3, "Striker"),
        FULCRUM(true),
      ],
    },
    command: { commander: MW, faction: JF, start: "C" },
    objectives: { primary: 1800, secondary: 900 },
    turns: 10,
    withdrawal: "none",
    commandResets: [],
    spCap: 120,
    next: [],
    epilogue: true,
  },
  {
    ...base,
    id: "21",
    n: 21,
    title: "Honorable Combat",
    pages: "62-63",
    outcomePage: 82,
    player: { pv: 300, units: 5 },
    recon: NO_RECON,
    waypoints: [{ letters: "A-E", at: "unit" }],
    opposing: {
      pv: 252,
      units: [
        unit("Bane 5", 3, "Juggernaut", undefined, cmdr),
        unit("Marauder IIC 6", 3, "Brawler"),
        unit("Rifleman C 2", 3, "Skirmisher", "JMPS"),
        unit("Summoner A", 3, "Skirmisher"),
        unit("Howler 6", 3, "Striker"),
      ],
    },
    command: { commander: MW, faction: JF, start: "A" },
    objectives: { primary: 1500, secondary: 150, secondaryEach: true },
    turns: null,
    withdrawal: "none",
    commandResets: [],
    spCap: 120,
    next: [],
    epilogue: true,
  },
];

/** The sorties 1 to 21 by number. */
export const ssSortie = (n: number): SsSortie | undefined => SS_SORTIES.find((s) => s.n === n && s.n > 0);

/** Unit Availability for Apolakkia (printed p. 20): unit and PV; the book's SP column is PV x 40. */
export const SS_AVAILABILITY: { name: string; type: "BM" | "CV"; pv: number }[] = [
  { name: "Howler", type: "BM", pv: 20 },
  { name: "Crimson Hawk", type: "BM", pv: 21 },
  { name: "RFL-3N Rifleman", type: "BM", pv: 26 },
  { name: "Ion Sparrow Prime", type: "BM", pv: 30 },
  { name: "Pouncer Prime", type: "BM", pv: 31 },
  { name: "Griffin IIC", type: "BM", pv: 31 },
  { name: "RFL-5D Rifleman", type: "BM", pv: 32 },
  { name: "Hellcat (Hellhound II)", type: "BM", pv: 36 },
  { name: "Shadow Hawk IIC", type: "BM", pv: 37 },
  { name: "Incubus", type: "BM", pv: 38 },
  { name: "STK-5S Stalker", type: "BM", pv: 38 },
  { name: "BLR-1G BattleMaster", type: "BM", pv: 40 },
  { name: "Phoenix Hawk IIC 5", type: "BM", pv: 44 },
  { name: "Phoenix Hawk IIC 3", type: "BM", pv: 45 },
  { name: "Rifleman IIC 5", type: "BM", pv: 46 },
  { name: "Hierofalcon Prime", type: "BM", pv: 46 },
  { name: "Phoenix Hawk IIC 7", type: "BM", pv: 47 },
  { name: "Night Gyr Prime", type: "BM", pv: 47 },
  { name: "Thresher Mk II", type: "BM", pv: 49 },
  { name: "Tiburon", type: "BM", pv: 50 },
  { name: "Rifleman IIC 8", type: "BM", pv: 50 },
  { name: "Warhammer IIC", type: "BM", pv: 50 },
  { name: "Phoenix Hawk IIC 4", type: "BM", pv: 51 },
  { name: "Jade Phoenix Prime", type: "BM", pv: 53 },
  { name: "Cardinal Transport", type: "CV", pv: 28 },
  { name: "Kite Reconnaissance Vehicle", type: "CV", pv: 30 },
];
export const SS_AVAILABILITY_CITE = { cite: acesSsCite(20), checked: "page" } as const;
