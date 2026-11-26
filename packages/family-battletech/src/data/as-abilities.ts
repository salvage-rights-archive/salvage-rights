// Alpha Strike special pilot abilities (SPAs, ASCE pp. 92-101) and special command abilities (SCAs, pp. 102-109) as the force builder uses
// them: the name the book gives, the point cost, the unit types the book limits it to, and the page. Names, figures and page numbers only,
// each read against the page image; the book's descriptions are not here. The costs are the tables of pp. 94-95. Nothing here runs.

export const AS_ABILITY_CITE = { book: "Alpha Strike: Commander's Edition", spaPages: [92, 101], scaPages: [102, 109], stepPages: [112, 112], checked: "page" } as const;

/**
 * The unit kinds an SPA may be given to, as type codes (p. 28) or one of: `vtol` (a vehicle with the v movement mode), `airborne` (the
 * aerospace types and VTOLs), `ground` (anything that is not airborne).
 */
export type AsAbilityKind = string;

export interface AsSpa {
  id: string;
  name: string;
  /** The cost in points; a range where the player buys points of effect (Float Like a Butterfly, Lucky). */
  cost: number | [min: number, max: number];
  /** Where the entry that names its unit types is. */
  page: number;
  /** Absent means any unit type. */
  kinds?: AsAbilityKind[];
  /** A further limit the book states that the card does not show (four legs, foot or beast-mounted); the player judges it. */
  cond?: string;
}

const MECHS = ["BM", "IM"];
const MECHS_PROTO = ["BM", "IM", "PM"];
const FLYERS = ["vtol", "AF", "CF", "SC", "DS", "DA"];
const spa = (id: string, name: string, cost: AsSpa["cost"], page: number, extra: Pick<AsSpa, "kinds" | "cond"> = {}): AsSpa => ({ id, name, cost, page, ...extra });

/** Every SPA of the tables on pp. 94-95, in the book's order. */
export const AS_SPAS: AsSpa[] = [
  spa("animal-mimicry", "Animal Mimicry", 3, 92, { kinds: MECHS_PROTO, cond: "four legs" }),
  spa("antagonizer", "Antagonizer", 3, 92),
  spa("blood-stalker", "Blood Stalker", 2, 93),
  spa("cluster-hitter", "Cluster Hitter", 2, 93),
  spa("combat-intuition", "Combat Intuition", 3, 93),
  spa("cross-country", "Cross-Country", 2, 93, { kinds: ["CV", "SV"] }),
  spa("demoralizer", "Demoralizer", 3, 93),
  spa("dodge", "Dodge", 2, 95, { kinds: MECHS_PROTO }),
  spa("dust-off", "Dust-Off", 2, 95, { kinds: FLYERS }),
  spa("eagles-eyes", "Eagle's Eyes", 2, 95),
  spa("environmental-specialist", "Environmental Specialist", 2, 95),
  spa("fist-fire", "Fist Fire", 2, 96, { kinds: MECHS_PROTO }),
  spa("float-like-a-butterfly", "Float Like a Butterfly", [1, 4], 96),
  spa("forward-observer", "Forward Observer", 1, 96),
  spa("golden-goose", "Golden Goose", 3, 96, { kinds: ["vtol", "AF", "CF", "SC"] }),
  spa("ground-hugger", "Ground-Hugger", 2, 96, { kinds: ["vtol", "AF", "CF", "SC"] }),
  spa("headhunter", "Headhunter", 2, 96),
  spa("heavy-lifter", "Heavy Lifter", 1, 97, { kinds: MECHS }),
  spa("hopper", "Hopper", 1, 97, { kinds: MECHS }),
  spa("hot-dog", "Hot Dog", 2, 97, { kinds: ["BM", "IM", "AF"] }),
  spa("human-tro", "Human TRO", 1, 97),
  spa("iron-will", "Iron Will", 1, 97),
  spa("jumping-jack", "Jumping Jack", 2, 97, { kinds: MECHS_PROTO }),
  spa("lucky", "Lucky", [1, 4], 97),
  spa("maneuvering-ace", "Maneuvering Ace", 2, 97),
  spa("marksman", "Marksman", 2, 97),
  spa("melee-master", "Melee Master", 2, 98, { kinds: MECHS_PROTO }),
  spa("melee-specialist", "Melee Specialist", 1, 98, { kinds: MECHS_PROTO }),
  spa("multi-tasker", "Multi-Tasker", 2, 98),
  spa("natural-grace", "Natural Grace", 3, 98, { kinds: MECHS_PROTO }),
  spa("oblique-artilleryman", "Oblique Artilleryman", 1, 98),
  spa("oblique-attacker", "Oblique Attacker", 1, 98),
  spa("range-master", "Range Master", 2, 98),
  spa("ride-the-wash", "Ride the Wash", 4, 98, { kinds: ["airborne"] }),
  spa("sandblaster", "Sandblaster", 2, 99),
  spa("shaky-stick", "Shaky Stick", 2, 99, { kinds: ["airborne"] }),
  spa("sharpshooter", "Sharpshooter", 4, 99),
  spa("slugger", "Slugger", 1, 99, { kinds: MECHS }),
  spa("sniper", "Sniper", 3, 99),
  spa("speed-demon", "Speed Demon", 2, 99),
  spa("stand-aside", "Stand-Aside", 1, 99),
  spa("street-fighter", "Street Fighter", 2, 99, { kinds: MECHS_PROTO }),
  spa("sure-footed", "Sure-Footed", 2, 100, { kinds: MECHS_PROTO }),
  spa("swordsman", "Swordsman", 2, 100, { kinds: MECHS_PROTO }),
  spa("tactical-genius", "Tactical Genius", 3, 100),
  spa("terrain-master-drag-racer", "Terrain Master (Drag Racer)", 1, 100, { kinds: ["CV"], cond: "tracked or wheeled" }),
  spa("terrain-master-forest-ranger", "Terrain Master (Forest Ranger)", 3, 100, { kinds: ["ground"] }),
  spa("terrain-master-frogman", "Terrain Master (Frogman)", 3, 100, { kinds: MECHS_PROTO }),
  spa("terrain-master-mountaineer", "Terrain Master (Mountaineer)", 3, 100, { kinds: ["ground"] }),
  spa("terrain-master-nightwalker", "Terrain Master (Nightwalker)", 3, 100, { kinds: ["ground"] }),
  spa("terrain-master-sea-monster", "Terrain Master (Sea Monster)", 3, 101, { kinds: ["ground"] }),
  spa("terrain-master-swamp-beast", "Terrain Master (Swamp Beast)", 3, 101, { kinds: ["ground"] }),
  spa("weapon-specialist", "Weapon Specialist", 3, 101),
  spa("wind-walker", "Wind Walker", 2, 101, { kinds: ["airborne"] }),
  spa("zweihander", "Zweihander", 2, 101, { kinds: MECHS }),
  spa("light-horseman", "Light Horseman", 2, 101, { kinds: ["CI"], cond: "beast-mounted" }),
  spa("heavy-horse", "Heavy Horse", 2, 101, { kinds: ["CI"], cond: "beast-mounted" }),
  spa("foot-cavalry", "Foot Cavalry", 1, 101, { kinds: ["CI"], cond: "foot" }),
  spa("urban-guerrilla", "Urban Guerrilla", 1, 101, { kinds: ["CI", "BA"] }),
];

/** SPAs a unit may have, by Skill (Special Pilot Abilities by Skill Level, p. 92): how many, and their total cost. Green (5) and lower have none. */
export const AS_SPA_BY_SKILL: { count: number; points: number }[] = [
  { count: 3, points: 6 }, // 0 Legendary
  { count: 3, points: 6 }, // 1 Heroic
  { count: 2, points: 4 }, // 2 Elite
  { count: 2, points: 4 }, // 3 Veteran
  { count: 1, points: 2 }, // 4 Regular
  { count: 0, points: 0 }, // 5 Green and lower
];

/** Step 6 (p. 112): up to one unit per company (12 units) is given SPAs of its own. */
export const AS_SPA_UNITS_PER = 12;

// ---- Special command abilities -------------------------------------------------------------------------------------------

export interface AsSca {
  id: string;
  name: string;
  page: number;
  /** Needs another SCA in the force (False Flag needs Off-Map Movement, p. 105). */
  needs?: string;
  /** Only forces whose average Skill is at least this good (a lower number), as the entry states (Strategic Planning, p. 107). */
  maxAverageSkill?: number;
  /** Only forces made of these unit kinds (Ground Attack Specialists, p. 105). */
  kinds?: AsAbilityKind[];
  /** One of the general specializations a Green or lower force may take in place of none (p. 102). */
  general?: true;
}

const sca = (id: string, name: string, page: number, extra: Omit<AsSca, "id" | "name" | "page"> = {}): AsSca => ({ id, name, page, ...extra });

/** The SCAs of pp. 102-109 in the book's order, the grouped entries (Tactical Experts) one row each. */
export const AS_SCAS: AsSca[] = [
  sca("adjusting-fire", "Adjusting Fire", 102),
  sca("anti-aircraft", "Anti-Aircraft Specialists", 102),
  sca("anti-mech", "Anti-'Mech Training", 102),
  sca("banking-initiative", "Banking Initiative", 102),
  sca("berserkers", "Berserkers", 103),
  sca("brawlers", "Brawlers", 103),
  sca("camouflage", "Camouflage", 103),
  sca("combat-drop", "Combat Drop Specialists", 103),
  sca("comms-disruption", "Communications Disruption", 103),
  sca("counterparts", "Counterparts", 103),
  sca("direct-fire-artillery", "Direct Fire Artillery Specialists", 103),
  sca("enemy-specialization", "Enemy Specialization", 103, { general: true }),
  sca("environmental-specialization", "Environmental Specialization", 104, { general: true }),
  sca("esprit-de-corps", "Esprit de Corps", 104),
  sca("false-flag", "False Flag", 105, { needs: "off-map-movement" }),
  sca("fast-withdrawal", "Fast Withdrawal", 105),
  sca("flankers", "Flankers", 105),
  sca("focus", "Focus (an SPA)", 105),
  sca("forcing-the-initiative", "Forcing the Initiative", 105),
  sca("ground-attack", "Ground Attack Specialists", 105, { kinds: ["airborne"] }),
  sca("highlander-burial", "Highlander Burial", 105),
  sca("hit-and-run", "Hit and Run", 106),
  sca("infantry-defensive-experts", "Infantry Defensive Experts", 106),
  sca("infantry-dragoons", "Infantry Dragoons", 106),
  sca("infiltrators", "Infiltrators", 106),
  sca("in-the-moment", "In the Moment", 106),
  sca("intelligence-specialists", "Intelligence Specialists", 106),
  sca("loppers", "Loppers", 106),
  sca("off-map-movement", "Off-Map Movement", 106),
  sca("overrun-combat", "Overrun Combat", 107),
  sca("rapid-strike", "Rapid Strike", 107),
  sca("regional-specialization", "Regional Specialization", 107),
  sca("savages", "Savages", 107),
  sca("sharp-shooters", "Sharp Shooters", 107),
  sca("shielding", "Shielding", 107),
  sca("speed-fire", "Speed Fire", 107),
  sca("strategic-command", "Strategic Command", 107),
  sca("strategic-planning", "Strategic Planning", 107, { maxAverageSkill: 3 }),
  sca("tactical-adjustments", "Tactical Adjustments", 108),
  sca("tactical-experts-combined-fire", "Tactical Experts (Combined Fire)", 108),
  sca("tactical-experts-dogfighting", "Tactical Experts (Dogfighting)", 108),
  sca("tactical-experts-engineers", "Tactical Experts (Engineers)", 108),
  sca("tactical-experts-hidden-units", "Tactical Experts (Hidden Units)", 108),
  sca("tactical-experts-physical", "Tactical Experts (Physical)", 108),
  sca("tactical-experts-siege", "Tactical Experts (Siege)", 108),
  sca("tactical-specialization", "Tactical Specialization", 108, { general: true }),
  sca("tactical-specialization-combined-arms", "Tactical Specialization (Combined Arms)", 108),
  sca("tactical-specialization-small-unit", "Tactical Specialization (Small Unit Actions)", 108),
  sca("warrior-code", "Warrior Code", 109),
  sca("zone-of-control", "Zone of Control", 109),
];

/** SCAs a force may take by its average Skill (p. 102): Regular one, Veteran or Elite two, Heroic or Legendary three; Green and lower none, or one general specialization. */
export const AS_SCA_BY_AVERAGE_SKILL: number[] = [3, 3, 2, 2, 1, 1, 1, 1];

/** Step 7 (p. 102): one key officer for every 6 units of the force, or part of 6; one of them is the overall commander. */
export const AS_OFFICERS_PER = 6;
