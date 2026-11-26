// Conventional infantry: the construction tables, from TechManual (corrected sixth printing, errata v8.0) pp. 144-155 and 282, the
// Infantry Tables replacement pages (v4.1, 6 June 2021, which the catalog's weapon rows already match), Tactical Operations: Advanced
// Units and Equipment (corrected seventh printing) pp. 129-130, 136, 152-153 and 225, and the Battle Value v4.1 pages. Plain data; the
// weapons themselves are rows of the one equipment catalog (`units: ["infantry"]`, data/equipment/other.ts). Figures only.
import type { RulesLevel } from "./chassis";

export interface Cited {
  cite: { book: string; page: number };
  checked: "page" | "text";
}
const TM = "TechManual";
const TO = "Tactical Operations: Advanced Units and Equipment";

export type MotiveId = "foot" | "motorized" | "jump" | "hover" | "tracked" | "wheeled" | "microlite" | "microcopter";
export interface Motive extends Cited {
  id: MotiveId;
  label: string;
  mechanized: boolean;
  maxSquad: number;
  maxPlatoon: number;
  mp: number;
  mpType: string;
  prohibited: string;
  /** Tons per trooper before the anti-'Mech kit (errata v8.0 reduced the printed Foot, Motorized and Jump figures by 0.015 t). */
  weight: number;
  /** The smallest group the platoon is split into for transport, in troopers. */
  breakdown: number;
  costFactor: number;
  rating: string;
  level: RulesLevel;
}
/** Conventional Infantry Motive Types Table (TM p. 145), Weight Table (p. 155), Base Costs (p. 282); VTOL types TO:AUE p. 136. */
export const MOTIVES: Motive[] = [
  { id: "foot", label: "Foot", mechanized: false, maxSquad: 10, maxPlatoon: 30, mp: 1, mpType: "Ground", prohibited: "Water (any)", weight: 0.085, breakdown: 1, costFactor: 1, rating: "A", level: "standard", cite: { book: TM, page: 145 }, checked: "page" },
  { id: "motorized", label: "Motorized", mechanized: false, maxSquad: 10, maxPlatoon: 30, mp: 3, mpType: "Ground", prohibited: "Water (any)", weight: 0.195, breakdown: 1, costFactor: 1.6, rating: "B", level: "standard", cite: { book: TM, page: 145 }, checked: "page" },
  { id: "jump", label: "Jump", mechanized: false, maxSquad: 10, maxPlatoon: 30, mp: 3, mpType: "Jump", prohibited: "Water (any)", weight: 0.165, breakdown: 1, costFactor: 2.6, rating: "D", level: "standard", cite: { book: TM, page: 145 }, checked: "page" },
  { id: "hover", label: "Mechanized, hover", mechanized: true, maxSquad: 5, maxPlatoon: 20, mp: 5, mpType: "Hover", prohibited: "Woods (any)", weight: 1, breakdown: 5, costFactor: 3.2, rating: "C", level: "standard", cite: { book: TM, page: 145 }, checked: "page" },
  { id: "tracked", label: "Mechanized, tracked", mechanized: true, maxSquad: 7, maxPlatoon: 28, mp: 3, mpType: "Tracked", prohibited: "Heavy woods, water (depth 1+)", weight: 1, breakdown: 5, costFactor: 3.2, rating: "B", level: "standard", cite: { book: TM, page: 145 }, checked: "page" },
  { id: "wheeled", label: "Mechanized, wheeled", mechanized: true, maxSquad: 6, maxPlatoon: 24, mp: 4, mpType: "Wheeled", prohibited: "Rough, rubble, woods (any), water (depth 1+)", weight: 1, breakdown: 5, costFactor: 3.2, rating: "A", level: "standard", cite: { book: TM, page: 145 }, checked: "page" },
  // TO:AUE p. 136: Microlite 6 VTOL MP, 2 troopers a squad, no support weapons; Micro-copter 5 VTOL MP, 4 a squad, 0 or 1 support weapon (-1 MP with one); at most 4 squads; weights p. 152 (1.5 and 2); cost x4 and x4.5 of the total (p. 225).
  { id: "microlite", label: "Mechanized, microlite VTOL", mechanized: true, maxSquad: 2, maxPlatoon: 8, mp: 6, mpType: "VTOL", prohibited: "", weight: 1.5, breakdown: 2, costFactor: 4, rating: "C", level: "advanced", cite: { book: TO, page: 136 }, checked: "page" },
  { id: "microcopter", label: "Mechanized, micro-copter VTOL", mechanized: true, maxSquad: 4, maxPlatoon: 16, mp: 5, mpType: "VTOL", prohibited: "", weight: 2, breakdown: 4, costFactor: 4.5, rating: "C", level: "advanced", cite: { book: TO, page: 136 }, checked: "page" },
];
export const motiveOf = (id: string): Motive | undefined => MOTIVES.find((m) => m.id === id);
/** The anti-'Mech kit adds 15 kg a trooper (TM p. 155) and multiplies the cost by 5 (p. 282). Mechanized platoons cannot make anti-'Mech attacks. */
export const ANTI_MECH = { kitTons: 0.015, costFactor: 5, defaultSkill: 8, cite: { book: TM, page: 155 }, checked: "page" } as const;

export interface Formation {
  id: string;
  label: string;
  /** Troopers per squad / squads per platoon, by motive. */
  sizes: Record<"foot" | "motorized" | "jump" | "hover" | "wheeled" | "tracked", [number, number]>;
  clan?: true;
}
/** Conventional Infantry Formations Table (TM p. 147). */
export const FORMATIONS: Formation[] = [
  { id: "generic", label: "Generic, mercenary, House or major Periphery", sizes: { foot: [7, 4], motorized: [7, 4], jump: [7, 3], hover: [5, 4], wheeled: [6, 4], tracked: [7, 4] } },
  { id: "clan", label: "Clan (all)", clan: true, sizes: { foot: [5, 5], motorized: [5, 5], jump: [5, 4], hover: [5, 4], wheeled: [5, 4], tracked: [5, 4] } },
  { id: "comstar", label: "ComStar or Word of Blake", sizes: { foot: [6, 6], motorized: [6, 6], jump: [6, 5], hover: [5, 4], wheeled: [6, 4], tracked: [6, 4] } },
  { id: "marian", label: "Marian Hegemony", sizes: { foot: [10, 10], motorized: [10, 10], jump: [10, 5], hover: [5, 4], wheeled: [5, 4], tracked: [5, 4] } },
  { id: "taurian", label: "Taurian Concordat or Calderon Protectorate", sizes: { foot: [10, 3], motorized: [10, 3], jump: [10, 3], hover: [5, 4], wheeled: [5, 4], tracked: [5, 4] } },
];
export const FORMATIONS_CITE: Cited = { cite: { book: TM, page: 147 }, checked: "page" };

/** Conventional Infantry Range Modifiers Table (TM p. 149): by Base Range 0 to 7, the to-hit modifier at 0, 1, 2 ... hexes; the table ends at 3 x the Base Range. */
export const RANGE_MODIFIERS: number[][] = [
  [0],
  [-2, 0, 2, 4],
  [-2, 0, 0, 2, 2, 4, 4],
  [-2, 0, 0, 0, 2, 2, 2, 4, 4, 4],
  [-2, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
  [-1, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4],
  [-1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 4, 4, 4, 5, 5, 5],
  [-1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 6, 6, 6, 6],
];
export const RANGE_CITE: Cited = { cite: { book: TM, page: 149 }, checked: "page" };

/** Rules for the weapons (TM pp. 148-153 with errata v8.0). */
export const WEAPON_RULES = {
  primaryDamageCap: 0.6,
  maxSecondaryPerSquad: 2,
  cite: { book: TM, page: 150 },
  checked: "page",
} as const;

export interface ArmorKit extends Cited {
  id: string;
  name: string;
  divisor: number;
  encumbering?: true;
  vacuum?: true;
  stealth?: true;
  techBase: "both" | "inner-sphere" | "clan";
  rating: string;
  availability: string;
  /** The year introduced; "PS" (pre-spaceflight) is 1950 and "ES" (early spaceflight) 2200, as everywhere. */
  year: number;
  cost: number;
  /** The stealth bonus to the Defensive Factor (TO:AUE p. 191): DEST +0.2. A sneak suit's is the sum of its chosen systems' (STEALTH_MODIFIERS). */
  bvStealth?: number;
  /** A sneak suit: how many different sneak systems it carries (p. 130: each different Sneak armor type counts as one "system"). */
  systems?: number;
  /** The systems a sneak suit has until the player picks: the owner's ruling (2026-11-27); the book prints no default. */
  defaultSystems?: string[];
}
const PS = 1950;
const ES = 2200;
const C1 = { book: TO, page: 129 };
const C2 = { book: TO, page: 130 };
/** Conventional Infantry Armor Table (TO:AUE pp. 129-130; Advanced). Cost is per trooper, as the table prints ("each"). */
export const ARMOR_KITS: ArmorKit[] = [
  { id: "ablative-standard", name: "Ablative, standard", divisor: 1, encumbering: true, techBase: "both", rating: "D", availability: "A-B-A", year: 2300, cost: 1000, cite: C1, checked: "page" },
  { id: "ablative-concealed", name: "Ablative, concealed", divisor: 1, techBase: "inner-sphere", rating: "E", availability: "E-D-B", year: 2400, cost: 1500, cite: C1, checked: "page" },
  { id: "ablative-flak-standard", name: "Ablative/flak, standard", divisor: 1, techBase: "both", rating: "D", availability: "B-C-B", year: 2305, cost: 800, cite: C1, checked: "page" },
  { id: "ablative-flak-concealed", name: "Ablative/flak, concealed", divisor: 1, techBase: "inner-sphere", rating: "E", availability: "F-D-C", year: 2400, cost: 1400, cite: C1, checked: "page" },
  { id: "ballistic-plate-standard", name: "Ballistic plate, standard", divisor: 2, encumbering: true, techBase: "both", rating: "D", availability: "C-C-C", year: 2310, cost: 1600, cite: C1, checked: "page" },
  { id: "ballistic-plate-concealed", name: "Ballistic plate, concealed", divisor: 1, techBase: "inner-sphere", rating: "E", availability: "X-F-D", year: 2820, cost: 2880, cite: C1, checked: "page" },
  { id: "clothing-fatigues", name: "Clothing, fatigues, civilian or non-armored", divisor: 1, techBase: "both", rating: "A", availability: "A-A-A", year: PS, cost: 25, cite: C1, checked: "page" },
  { id: "clothing-leather", name: "Clothing, leather or synthetic hide", divisor: 1, techBase: "both", rating: "A", availability: "A-A-A", year: PS, cost: 100, cite: C1, checked: "page" },
  { id: "clothing-light", name: "Clothing, light (summer wear or none)", divisor: 0.5, techBase: "both", rating: "A", availability: "A-A-A", year: PS, cost: 15, cite: C1, checked: "page" },
  { id: "engineering-suit", name: "Engineering suit", divisor: 1, encumbering: true, vacuum: true, techBase: "both", rating: "D", availability: "D-D-D", year: 2350, cost: 7500, cite: C1, checked: "page" },
  { id: "environment-light", name: "Environment suit, light", divisor: 1, encumbering: true, techBase: "both", rating: "C", availability: "B-B-B", year: 2200, cost: 200, cite: C1, checked: "page" },
  { id: "environment-hostile", name: "Environment suit, hostile", divisor: 2, encumbering: true, vacuum: true, techBase: "both", rating: "D", availability: "C-C-C", year: 2300, cost: 10000, cite: C1, checked: "page" },
  { id: "environment-marine", name: "Environment suit, marine", divisor: 2, vacuum: true, techBase: "both", rating: "D", availability: "E-E-D", year: 2325, cost: 15000, cite: C1, checked: "page" },
  { id: "flak-standard", name: "Flak, standard", divisor: 1, techBase: "both", rating: "C", availability: "A-A-A", year: 2200, cost: 150, cite: C1, checked: "page" },
  { id: "flak-concealed", name: "Flak, concealed", divisor: 1, techBase: "inner-sphere", rating: "D", availability: "D-C-B", year: 2230, cost: 225, cite: C1, checked: "page" },
  { id: "heatsuit", name: "Heatsuit", divisor: 1, techBase: "both", rating: "D", availability: "C-C-C", year: 2355, cost: 100, cite: C1, checked: "page" },
  { id: "mechwarrior-combat-suit", name: "MechWarrior combat suit", divisor: 1, techBase: "both", rating: "E", availability: "D-F-E", year: 2790, cost: 20000, cite: C1, checked: "page" },
  { id: "mechwarrior-cooling-suit", name: "MechWarrior cooling suit", divisor: 1, techBase: "both", rating: "E", availability: "D-F-E", year: 2500, cost: 5000, cite: C1, checked: "page" },
  { id: "mechwarrior-cooling-vest", name: "MechWarrior cooling vest (only)", divisor: 0.5, techBase: "both", rating: "D", availability: "C-C-C", year: 2460, cost: 200, cite: C1, checked: "page" },
  { id: "myomer-suit", name: "Myomer, suit", divisor: 2, encumbering: true, techBase: "inner-sphere", rating: "E", availability: "X-X-E", year: 3047, cost: 5800, cite: C1, checked: "page" },
  { id: "myomer-vest", name: "Myomer, vest", divisor: 2, techBase: "inner-sphere", rating: "E", availability: "X-X-E", year: 3045, cost: 1800, cite: C2, checked: "page" },
  { id: "parka", name: "Parka", divisor: 1, techBase: "both", rating: "C", availability: "A-A-A", year: PS, cost: 50, cite: C2, checked: "page" },
  { id: "neo-chainmail", name: "Neo-chainmail", divisor: 1, techBase: "inner-sphere", rating: "D", availability: "X-X-C", year: 3065, cost: 920, cite: C2, checked: "page" },
  { id: "snowsuit", name: "Snowsuit", divisor: 1, encumbering: true, techBase: "both", rating: "C", availability: "A-A-A", year: PS, cost: 70, cite: C2, checked: "page" },
  { id: "spacesuit", name: "Spacesuit", divisor: 1, encumbering: true, vacuum: true, techBase: "both", rating: "C", availability: "B-B-B", year: ES, cost: 5000, cite: C2, checked: "page" },
  { id: "spacesuit-combat", name: "Spacesuit, combat", divisor: 1, encumbering: true, vacuum: true, techBase: "both", rating: "C", availability: "D-D-D", year: 2200, cost: 7000, cite: C2, checked: "page" },
  { id: "kit-capellan", name: "Capellan Confederation kit", divisor: 1, techBase: "inner-sphere", rating: "C", availability: "X-X-C", year: 3050, cost: 450, cite: C2, checked: "page" },
  { id: "kit-clan", name: "Clan (all) kit", divisor: 2, techBase: "clan", rating: "E", availability: "X-E-E", year: 2900, cost: 5560, cite: C2, checked: "page" },
  { id: "kit-comstar", name: "ComStar kit", divisor: 2, techBase: "inner-sphere", rating: "F", availability: "X-F-D", year: 2830, cost: 4280, cite: C2, checked: "page" },
  { id: "kit-draconis", name: "Draconis Combine kit", divisor: 1, techBase: "inner-sphere", rating: "C", availability: "B-B-B", year: 2625, cost: 360, cite: C2, checked: "page" },
  { id: "kit-federated-suns", name: "Federated Suns kit", divisor: 1, techBase: "inner-sphere", rating: "C", availability: "B-B-B", year: 2330, cost: 750, cite: C2, checked: "page" },
  { id: "kit-federated-commonwealth", name: "Federated Suns or Commonwealth (3030+) kit", divisor: 2, techBase: "inner-sphere", rating: "C", availability: "X-D-B", year: 3030, cost: 1040, cite: C2, checked: "page" },
  { id: "kit-federated-suns-3067", name: "Federated Suns (3067+) kit", divisor: 2, encumbering: true, techBase: "inner-sphere", rating: "D", availability: "X-X-D", year: 3067, cost: 2080, cite: C2, checked: "page" },
  { id: "kit-rasalhague", name: "Free Rasalhague Republic kit", divisor: 1, techBase: "inner-sphere", rating: "C", availability: "X-X-B", year: 3040, cost: 360, cite: C2, checked: "page" },
  { id: "kit-free-worlds", name: "Free Worlds League kit", divisor: 1, techBase: "inner-sphere", rating: "C", availability: "B-B-B", year: 2290, cost: 950, cite: C2, checked: "page" },
  { id: "kit-free-worlds-3035", name: "Free Worlds League (3035+) kit", divisor: 2, encumbering: true, techBase: "inner-sphere", rating: "C", availability: "X-E-B", year: 3035, cost: 1830, cite: C2, checked: "page" },
  { id: "kit-lyran-commonwealth", name: "Lyran Alliance or Commonwealth kit", divisor: 1, techBase: "inner-sphere", rating: "C", availability: "B-B-B", year: 2425, cost: 650, cite: C2, checked: "page" },
  { id: "kit-lyran-3060", name: "Lyran Alliance (3060+) kit", divisor: 2, techBase: "inner-sphere", rating: "C", availability: "X-X-B", year: 3060, cost: 730, cite: C2, checked: "page" },
  { id: "kit-canopus", name: "Magistracy of Canopus kit", divisor: 1, techBase: "inner-sphere", rating: "C", availability: "B-B-B", year: 2610, cost: 400, cite: C2, checked: "page" },
  { id: "kit-marian", name: "Marian Hegemony kit", divisor: 2, techBase: "inner-sphere", rating: "C", availability: "X-F-B", year: 3049, cost: 1580, cite: C2, checked: "page" },
  { id: "kit-taurian", name: "Taurian Concordat or Calderon kit", divisor: 1, techBase: "inner-sphere", rating: "C", availability: "X-X-B", year: 3047, cost: 370, cite: C2, checked: "page" },
  { id: "kit-word-of-blake", name: "Word of Blake kit", divisor: 2, techBase: "inner-sphere", rating: "F", availability: "X-X-D", year: 3055, cost: 4300, cite: C2, checked: "page" },
  { id: "kit-generic", name: "Other Periphery or generic kit", divisor: 1, techBase: "both", rating: "C", availability: "B-B-B", year: ES, cost: 330, cite: C2, checked: "page" },
  { id: "sneak-dest", name: "DEST infiltration suit", divisor: 1, stealth: true, bvStealth: 0.2, techBase: "inner-sphere", rating: "D", availability: "X-E-E", year: 2840, cost: 50000, cite: C2, checked: "page" },
  { id: "sneak-1", name: "Sneak suit (one system)", divisor: 1, stealth: true, systems: 1, defaultSystems: ["ir"], techBase: "both", rating: "D", availability: "C-C-C", year: 2450, cost: 7000, cite: C2, checked: "page" },
  { id: "sneak-2", name: "Sneak suit (two systems)", divisor: 1, stealth: true, systems: 2, defaultSystems: ["ir", "ecm"], techBase: "both", rating: "D", availability: "D-D-D", year: 2460, cost: 21000, cite: C2, checked: "page" },
  { id: "sneak-3", name: "Sneak suit (three systems)", divisor: 1, stealth: true, systems: 3, defaultSystems: ["camo", "ir", "ecm"], techBase: "both", rating: "D", availability: "D-E-E", year: 2475, cost: 28000, cite: C2, checked: "page" },
];
export const armorKitOf = (id: string): ArmorKit | undefined => ARMOR_KITS.find((k) => k.id === id);
/** Infantry Stealth Modifiers Table (TO:AUE p. 130): camo by hexes moved 0/1/2/3/4+, IR by short/medium/long range. */
export const STEALTH_MODIFIERS: { id: string; name: string; camo: number[]; ir: number[]; ecm: string; bv: number }[] = [
  { id: "dest", name: "DEST infiltration suit", camo: [1, 0, 0, 0, 0], ir: [1, 1, 2], ecm: "none", bv: 0.2 },
  { id: "camo", name: "Sneak, camo", camo: [3, 2, 1, 0, 0], ir: [0, 0, 0], ecm: "none", bv: 0.2 },
  { id: "ir", name: "Sneak, IR", camo: [0, 0, 0, 0, 0], ir: [1, 1, 2], ecm: "none", bv: 0.2 },
  { id: "ecm", name: "Sneak, ECM", camo: [0, 0, 0, 0, 0], ir: [0, 0, 0], ecm: "invisible to standard and light active probes", bv: 0.1 },
];
/** The three sneak systems a suit may carry, in the table's order. Each adds its `bv` to the Defensive Factor, cumulatively (Defensive Factors Modifier Table, TO:AUE p. 191). */
export const SNEAK_SYSTEMS = ["camo", "ir", "ecm"] as const;

export interface Specialization extends Cited {
  id: string;
  name: string;
  maxSquad: number | null; // null: as the platoon type chosen
  maxPlatoon: [troopers: number, squads: number] | null;
  maxSecondary: number | null;
  mp: number | null;
  mpType?: string;
  addedTons: number;
  costFactor: number;
  /** The Battle Value modifier the Unit Type Modifiers Table (TO:AUE p. 193) adds for the specialty. */
  bvModifier: number;
  /** Motive types the specialty requires; absent means any. */
  motives?: MotiveId[];
  prohibited?: string;
}
const S = { book: TO, page: 153 };
/** Specialized Infantry Types Table (TO:AUE p. 153) with the cost factors of the Conventional Infantry Construction Data table (p. 225). Advanced; Veteran or better. */
export const SPECIALIZATIONS: Specialization[] = [
  { id: "combat-engineers", name: "Combat engineers", maxSquad: 10, maxPlatoon: [20, 2], maxSecondary: 0, mp: null, addedTons: 0.1, costFactor: 5, bvModifier: 0.1, cite: S, checked: "page" },
  { id: "marines", name: "Marines", maxSquad: 10, maxPlatoon: [30, 4], maxSecondary: null, mp: null, addedTons: 0, costFactor: 3, bvModifier: 0.3, cite: S, checked: "page" },
  { id: "mountain", name: "Mountain troops", maxSquad: 10, maxPlatoon: [20, 2], maxSecondary: 1, mp: 1, mpType: "Ground", addedTons: 0, costFactor: 2, motives: ["foot"], prohibited: "Water (any)", bvModifier: 0.2, cite: S, checked: "page" },
  { id: "paratroops", name: "Paratroops", maxSquad: 10, maxPlatoon: [30, 3], maxSecondary: 1, mp: 1, mpType: "Ground", addedTons: 0.05, costFactor: 3, motives: ["foot"], prohibited: "Water (any)", bvModifier: 0.1, cite: S, checked: "page" },
  { id: "scuba-standard", name: "SCUBA (standard)", maxSquad: 10, maxPlatoon: [30, 4], maxSecondary: 0, mp: 1, mpType: "Sub", addedTons: 0.05, costFactor: 2, motives: ["foot"], prohibited: "Water (depth 3+)", bvModifier: 0.1, cite: S, checked: "page" },
  { id: "scuba-motorized", name: "SCUBA (motorized)", maxSquad: 6, maxPlatoon: [12, 2], maxSecondary: 1, mp: 2, mpType: "Sub", addedTons: 0.1, costFactor: 2.5, motives: ["motorized"], prohibited: "Water (depth 3+)", bvModifier: 0.1, cite: S, checked: "page" },
];
export const specializationOf = (id: string): Specialization | undefined => SPECIALIZATIONS.find((s) => s.id === id);
/** Weight of a specialized trooper before the added tons: Combat engineers and Marines use the motive's own figure (with the anti-'Mech kit included), the others 0.1 (TO:AUE p. 152). */
export const SPECIALIST_BASE_TONS: Record<MotiveId, number> = { foot: 0.1, motorized: 0.21, jump: 0.18, hover: 1, tracked: 1, wheeled: 1, microlite: 1.5, microcopter: 2 };

/** Battle Value (TM Battle Value v4.1 p. 309 and the Conventional Infantry Weapons BV Table pp. 5-8 of the replacement pages): troopers x 1.5 x defensive factor, plus weapon BV x speed factor. */
export const INFANTRY_BV = { perTrooper: 1.5, cite: { book: "TechManual Battle Value v4.1", page: 309 }, checked: "page" } as const;
/** Battle Value with the Advanced infantry rules (TO:AUE pp. 191 and 193): the defense line is the damage divisor x 1.5 a trooper, the Defensive Factor gains the stealth bonus, and the total is multiplied by 1 plus the specialties' modifiers. */
export const ADVANCED_INFANTRY_BV = { cite: { book: TO, page: 191 }, modifiersCite: { book: TO, page: 193 }, checked: "page" } as const;

/** Beast-mounted infantry, field guns and field artillery (TO:AUE pp. 106-108, 122-123) are later pieces: see .superpowers/infantry-design.md. */
