// Battle Value tables for a BattleMech, from TechManual (corrected sixth printing, errata v8.0) and the Battle Value
// replacement pages for its pp. 302-314 (v4.1, which errata v8.0 names as the current text), plus Interstellar
// Operations: Alternate Eras for the items and unit types that book adds. Plain data: nothing here runs. Every table says
// where it was printed and whether the figures were read against the page image ("page") or only the text ("text").
// The tables are our own; the book's wording is not copied.
//
// The equipment figures are keyed by catalog row id (rules/catalog.ts) and grouped, so a weapon and its ammunition are one
// line. A catalog row with no line here has no printed BV: the rules module reports it as unvalued and does not guess.

export interface BvCite {
  book: string;
  page: number;
}
export type Checked = "page" | "text";
interface Sourced {
  cite: BvCite;
  checked: Checked;
}

const TM = "TechManual";
/** The replacement text for TechManual pp. 302-314; its own pages carry the old numbers (the 'Mech method begins p. 302, the worked examples p. 304). */
const TM_BV = "TechManual Battle Value v4.1";
const TW = "Total Warfare";
const IO = "Interstellar Operations: Alternate Eras";
const TO = "Tactical Operations: Advanced Units and Equipment";

// ---------------------------------------------------------------------------------------------------------------
// The method's fixed numbers (TechManual Battle Value v4.1, "Calculating 'Mech BV").
// ---------------------------------------------------------------------------------------------------------------
export const BV_METHOD: Sourced & {
  armorFactor: number;
  structureFactor: number;
  explosiveAmmoPerSlot: number;
  gaussPerSlot: number;
  minimumDefensive: number;
  artemis: number;
  targetingComputer: number;
  machineGunArray: number;
  baseHeatEfficiency: number;
  lamHeatEfficiency: number;
  runningHeat: number;
  jumpHeatMinimum: number;
  stealthHeat: number;
  stealthTargetModifier: number;
  tsmWalkBonus: number;
  tsmTonnage: number;
  smallCockpit: number;
  halved: number;
} = {
  cite: { book: TM_BV, page: 302 },
  checked: "page",
  armorFactor: 2.5,
  structureFactor: 1.5,
  explosiveAmmoPerSlot: 15,
  gaussPerSlot: 1,
  minimumDefensive: 1,
  artemis: 1.2,
  // Each linked weapon x1.25. Table note E (TechManual p. 317) gives the computer "25 percent of the BV of the weapons it links":
  // the same 25 percent, not a second one. The v4.1 Thunderbolt example (p. 304) counts it once and comes to 2,008.
  targetingComputer: 1.25,
  // Table note F, TechManual p. 317; errata v8.0 copies the Inner Sphere entry and its note to the Clan table. Conflict: Tactical
  // Operations: Advanced Units and Equipment p. 198 note L says x0.1. Later source: TechManual, errata v8.0 p. 36 (22 August 2024,
  // after the seventh printing); see CONFLICTS.md in the archive.
  machineGunArray: 0.67,
  baseHeatEfficiency: 6,
  lamHeatEfficiency: 9, // Interstellar Operations: Alternate Eras p. 186
  runningHeat: 2, // Total Warfare p. 53
  jumpHeatMinimum: 3, // Total Warfare p. 53
  stealthHeat: 10,
  stealthTargetModifier: 2, // the long-range modifier (Total Warfare p. 142: +1 medium, +2 long); the book's "maximum effect"
  // "The maximum MP it can legally generate": TSM's +2 Walking MP comes at 9 heat (Total Warfare p. 143), where the heat scale
  // takes 1 (p. 159), so +1.
  tsmWalkBonus: 1,
  tsmTonnage: 1.5,
  smallCockpit: 0.95,
  halved: 0.5,
};

/**
 * Where an IndustrialMech's Battle Value differs from a BattleMech's (v4.1 "Calculating 'Mech BV", read against the page image): a
 * unit with an internal combustion engine has Movement Heat Value 0; Industrial TSM multiplies the tonnage added to the Weapon Battle
 * Rating by 1.15 (and is no extra movement for the Speed Factor); and the Offensive Battle Rating is multiplied by 0.9 unless the
 * cockpit has Advanced Fire Control. Its armor and structure modifiers (Commercial 0.5, Industrial structure 0.5) are the tables below.
 */
export const INDUSTRIAL_BV: Sourced & { offensiveFactor: number; tsmTonnage: number; noMovementHeatEngines: string[]; fireControlCockpit: string } = {
  cite: { book: TM_BV, page: 302 },
  checked: "page",
  offensiveFactor: 0.9,
  tsmTonnage: 1.15,
  noMovementHeatEngines: ["ice"],
  fireControlCockpit: "industrial-afc",
};

/** Multipliers on the heat a weapon adds to Total Weapon Heat (v4.1, "Determine Total Weapon Heat"). */
export const HEAT_MULTIPLIER = { ultra: 2, rotary: 6, streak: 0.5, oneShot: 0.25 } as const;

// ---------------------------------------------------------------------------------------------------------------
// Modifier tables, printed p. 315. Keys are the chassis table's keys (data/chassis.ts); a key the book prints that the
// chassis tables do not know yet (industrial, commercial) is kept for when they do.
// ---------------------------------------------------------------------------------------------------------------
export const ARMOR_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  values: {
    standard: 1.0,
    "ferro-fibrous": 1.0,
    "ferro-fibrous-clan": 1.0,
    "light-ferro-fibrous": 1.0,
    "heavy-ferro-fibrous": 1.0,
    stealth: 1.0,
    industrial: 1.0,
    "heavy-industrial": 1.0,
    commercial: 0.5,
  },
};
export const STRUCTURE_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  values: { standard: 1.0, "endo-steel": 1.0, "endo-steel-clan": 1.0, industrial: 0.5 },
};
export const ENGINE_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  // The table's Standard row "includes ICE, Fuel Cell, and Fission" (a footnote on the same page), so they take 1.0.
  values: { standard: 1.0, light: 0.75, compact: 1.0, xl: 0.5, "xl-clan": 0.75, ice: 1.0, "fuel-cell": 1.0, fission: 1.0 },
};
export const GYRO_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  // The superheavy gyro counts as a standard one: IO:AE printed p.187 says "standard Gyro"; the summary table on p.190 says Heavy Duty. The
  // rules text wins over a table's one-line summary of it (the ledger holds the conflict), so 0.5.
  values: { standard: 0.5, compact: 0.5, xl: 0.5, "heavy-duty": 1.0, superheavy: 0.5 },
};
/** A superheavy 'Mech's engine modifiers, in place of the standard table (Superheavy Engine Type BV Modifier Table, IO:AE printed p.188, read against the
 * page image). Keys are the chassis table's; the Large engines are not in the engine table yet. */
export const SUPERHEAVY_ENGINE_BV_MODIFIER: Sourced & { values: Record<string, number> } = {
  cite: { book: IO, page: 188 },
  checked: "page",
  values: { standard: 1.0, light: 0.825, compact: 1.0, xl: 0.75, "xl-clan": 0.825, xxl: 0.5, "xxl-clan": 0.75 },
};

/**
 * The newer armor, internal structure and engine types' modifiers: Tactical Operations: Advanced Units and Equipment, Armor Type
 * Modifier Table (printed p.192), 'Mech Internal Structure Modifier Table [Addendum] (p.194) and 'Mech Engine Type Modifier Table
 * [Addendum] (p.193), and Interstellar Operations: Alternate Eras, Dark Age Armor Modifiers Table (p.185); all read against the page
 * image. Keys are the chassis table's keys. A row with `likeThe` has no figure of its own in any table: the book says the part
 * works as the named one (or, for the primitive armor, the primitive unit's BV is worked "normally" with a Barrier Armor Rating
 * of 10), so it takes that part's figure; that is our reading, not a printed value.
 */
export interface ModifierRow {
  value: number;
  cite: BvCite;
  checked: Checked;
  likeThe?: string;
}
const TO_ARMOR_MODIFIERS: BvCite = { book: TO, page: 192 };
const IO_ARMOR_MODIFIERS: BvCite = { book: IO, page: 185 };
const TO_STRUCTURE_MODIFIERS: BvCite = { book: TO, page: 194 };
const TO_ENGINE_MODIFIERS: BvCite = { book: TO, page: 193 };
const row = (value: number, cite: BvCite, likeThe?: string): ModifierRow => ({ value, cite, checked: likeThe === undefined ? "page" : "text", ...(likeThe === undefined ? {} : { likeThe }) });
export const ADVANCED_BV_MODIFIERS: { armor: Record<string, ModifierRow>; structure: Record<string, ModifierRow>; engine: Record<string, ModifierRow> } = {
  armor: {
    hardened: row(2.0, TO_ARMOR_MODIFIERS),
    "ferro-lamellor": row(1.2, TO_ARMOR_MODIFIERS),
    "vehicular-stealth": row(1.0, TO_ARMOR_MODIFIERS, "stealth"),
    "laser-reflective": row(1.5, TO_ARMOR_MODIFIERS),
    "laser-reflective-clan": row(1.5, TO_ARMOR_MODIFIERS),
    reactive: row(1.5, TO_ARMOR_MODIFIERS),
    "reactive-clan": row(1.5, TO_ARMOR_MODIFIERS),
    "anti-penetrative-ablation": row(1.2, IO_ARMOR_MODIFIERS),
    // Heat-dissipating 1.05 and ballistic-reinforced 1.2 are this table's (p. 185); the book's equipment table on p. 190 prints 1.1 and 1.5.
    // Same book and printing (second and third are equal), so no later source: undated, the modifiers table kept; see CONFLICTS.md.
    "heat-dissipating": row(1.05, IO_ARMOR_MODIFIERS),
    "impact-resistant": row(1.0, IO_ARMOR_MODIFIERS),
    "ballistic-reinforced": row(1.2, IO_ARMOR_MODIFIERS),
    "prototype-ferro-fibrous": row(1.0, TO_ARMOR_MODIFIERS, "ferro-fibrous (all)"),
    primitive: row(1.0, { book: IO, page: 187 }, "standard armor (Barrier Armor Rating 10)"),
  },
  structure: {
    composite: row(0.5, TO_STRUCTURE_MODIFIERS),
    "endo-composite": row(1.0, TO_STRUCTURE_MODIFIERS),
    "endo-composite-clan": row(1.0, TO_STRUCTURE_MODIFIERS),
    reinforced: row(2.0, TO_STRUCTURE_MODIFIERS),
    "prototype-endo-steel": row(1.0, TO_STRUCTURE_MODIFIERS, "endo steel"),
  },
  engine: {
    xxl: row(0.25, TO_ENGINE_MODIFIERS),
    "xxl-clan": row(0.5, TO_ENGINE_MODIFIERS),
    "prototype-xl": row(0.5, { book: TM, page: 315 }, "Inner Sphere XL"),
  },
};

/** A torso-mounted cockpit doubles the center torso armor (front and rear together) before the armor modifier, and the finished BV takes 0.95 (TO:AUE printed p.193). */
export const TORSO_COCKPIT_BV: Sourced & { cockpit: string; armorFactor: number; finalFactor: number } = {
  cite: { book: TO, page: 193 },
  checked: "page",
  cockpit: "torso-mounted",
  armorFactor: 2,
  finalFactor: 0.95,
};

/** Target Movement Modifier by hexes moved (Attack Modifiers Table, Total Warfare p. 117): [most hexes in the band, modifier]. Jumping adds 1. */
export const TARGET_MODIFIER: Sourced & { bands: [number, number][]; jumpBonus: number } = {
  cite: { book: TW, page: 117 },
  checked: "page",
  bands: [
    [2, 0],
    [4, 1],
    [6, 2],
    [9, 3],
    [17, 4],
    [24, 5],
    [Infinity, 6],
  ],
  jumpBonus: 1,
};

/** Speed Factor by Running MP plus half Jumping MP rounded up (printed p. 316), entries 0 to 25; beyond that the book gives the formula. */
export const SPEED_FACTOR: Sourced & { table: number[]; exponent: number } = {
  cite: { book: TM, page: 316 },
  checked: "page",
  table: [0.44, 0.54, 0.65, 0.77, 0.88, 1.0, 1.12, 1.24, 1.37, 1.5, 1.63, 1.76, 1.89, 2.02, 2.16, 2.3, 2.44, 2.58, 2.72, 2.86, 3.0, 3.15, 3.29, 3.44, 3.59, 3.74],
  exponent: 1.2,
};

/** Skill multiplier (printed p. 315): rows are Gunnery 0 to 8, columns Piloting 0 to 8. */
export const SKILL_MULTIPLIER: Sourced & { rows: number[][] } = {
  cite: { book: TM, page: 315 },
  checked: "page",
  rows: [
    [2.42, 2.31, 2.21, 2.1, 1.93, 1.75, 1.68, 1.59, 1.5],
    [2.21, 2.11, 2.02, 1.92, 1.76, 1.6, 1.54, 1.46, 1.38],
    [1.93, 1.85, 1.76, 1.68, 1.54, 1.4, 1.35, 1.28, 1.21],
    [1.66, 1.58, 1.51, 1.44, 1.32, 1.2, 1.16, 1.1, 1.04],
    [1.38, 1.32, 1.26, 1.2, 1.1, 1.0, 0.95, 0.9, 0.85],
    [1.31, 1.19, 1.13, 1.08, 0.99, 0.9, 0.86, 0.81, 0.77],
    [1.24, 1.12, 1.07, 1.02, 0.94, 0.85, 0.81, 0.77, 0.72],
    [1.17, 1.06, 1.01, 0.96, 0.88, 0.8, 0.76, 0.72, 0.68],
    [1.1, 0.99, 0.95, 0.9, 0.83, 0.75, 0.71, 0.68, 0.64],
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Land-Air 'Mechs (Interstellar Operations: Alternate Eras p. 186; AirMech movement p. 102).
// ---------------------------------------------------------------------------------------------------------------
export const LAM_BV: Sourced & { cruisePerJumpMP: number; flankFactor: number; airborneModifier: number; fuelSlotIds: string[] } = {
  cite: { book: IO, page: 186 },
  checked: "page",
  cruisePerJumpMP: 3,
  flankFactor: 1.5,
  airborneModifier: 1,
  // Each slot of these is counted as a slot of explosive ammunition. "LAM Fuel" (extra fuel tons) is fuel, which the rule names.
  fuelSlotIds: ["lam-fuel-is", "lam-fuel-tanks-is", "lam-bomb-bay-is"],
};

// ---------------------------------------------------------------------------------------------------------------
// Rows that change how a mount is treated rather than what it is worth.
// ---------------------------------------------------------------------------------------------------------------
/** CASE rows and what each leaves of the 15-point penalty on an ammunition slot in its location (prototype CASE: 8, IO:AE p. 183). */
export const CASE_ROWS: Record<string, number> = { "case-is": 0, "case-clan": 0, "prototype-case-is": 8 };
/** The targeting computers, and the multiplier a prototype Artemis puts on its launcher in place of 1.2. */
export const TARGETING_COMPUTER_IDS = ["targeting-computer-is", "targeting-computer-clan"];
// Artemis V (+30 percent) and Apollo (+15 percent, MRM launchers): TO:AUE pp. 195, 197.
export const ARTEMIS_IDS: Record<string, number> = { "artemis-iv-is": 1.2, "artemis-iv-clan": 1.2, "prototype-artemis-iv-is": 1.1, "artemis-v-clan": 1.3, "mrm-apollo-fcs-is": 1.15 };
/** PPC capacitors (TO:AUE pp. 194, 222): the BV of the PPC and its capacitor together replaces the PPC's, and the capacitor adds
 * 5 to its heat. The pair rows carry the double dagger (treat as a Gauss weapon for the Defensive Battle Rating), so every slot
 * of the pair costs 1 point where it is exposed. */
export const CAPACITOR: Sourced & { ids: string[]; heat: number; bv: Record<string, number> } = {
  cite: { book: TO, page: 194 },
  checked: "page",
  ids: ["ppc-capacitor-is"],
  heat: 5,
  bv: { "heavy-ppc-is": 370, "ppc-is": 264, "light-ppc-is": 132, "snub-nose-ppc-is": 252, "er-ppc-is": 343 },
};
/** Items the TO:AUE addendum gives no BV, whose rules do something else (p. 194): a laser insulator takes 1 off its laser's heat; coolant pods add to heat sink capacity and cost 1 defensive point a slot. */
export const LASER_INSULATOR_IDS = ["laser-insulator-is", "laser-insulator-clan"];
export const COOLANT_POD_IDS = ["coolant-pod-is", "coolant-pod-clan"];
/** Rows whose BV the books make depend on something the row does not say, or whose rule is not implemented; each says why. */
const TORPEDO_IDS = ["is", "clan"].flatMap((side) => [...[2, 4, 6].map((n) => `srt-${n}-${side}`), ...[5, 10, 15, 20].map((n) => `lrt-${n}-${side}`)]);
/** Torpedo launchers and their ammunition (TechManual printed p. 230): neither Battle Value document prints a torpedo line, and the launcher is a standard LRM or SRM, so the figure is left open. */
const TORPEDO_UNFIXED: Record<string, string> = Object.fromEntries(
  TORPEDO_IDS.flatMap((id) => [id, `ammo-${id}`]).map((id) => [id, "a torpedo launcher or its ammunition: the Battle Value tables print no torpedo line, and its value as an LRM or SRM fired underwater is not stated (TechManual p. 230)"]),
);
export const UNFIXED: Record<string, string> = {
  ...TORPEDO_UNFIXED,
  ...Object.fromEntries(["is", "clan"].map((side) => [`bomb-arrow-iv-homing-${side}`, "the Aerospace BV Addendum (TO:AUE p. 197) prints a figure for the non-homing air-launched Arrow IV missile but none for the homing one"])),
  ...Object.fromEntries(["is", "clan"].map((side) => [`bomb-thunder-fascam-${side}`, "its BV is seven 20-point minefields of the mine type named before play (TO:AUE p. 197), which the row does not fix"])),
  ...Object.fromEntries(["light-scc", "medium-scc", "heavy-scc", "scl-1", "scl-2", "scl-3"].map((n) => [`${n}-clan`, "the Clan capital Battle Value table prints no sub-capital cannon or laser line (TO:AUE p. 196)"])),
  ...Object.fromEntries(["light-plasma-rifle-is", "ammo-light-plasma-rifle-is"].map((id) => [id, "only the Core Rulebook lists it (printed p. 248), with no Battle Value, and no unit we can read carries it to work the figure from"])),
  "dropshuttle-bay-is": "a large-craft item: neither Alternate Eras Battle Value table (IO:AE pp. 189-191) prints a line for it",
  "docking-collar-pre-boom-is": "a large-craft item: neither Alternate Eras Battle Value table (IO:AE pp. 189-191) prints a line for it",
  "docking-collar-post-boom-is": "a large-craft item: neither Alternate Eras Battle Value table (IO:AE pp. 189-191) prints a line for it",
  "radical-heat-sink-is": "the book prints two rules that disagree: its table adds the unit's heat sink count x 0.4 to Heat Efficiency, its text multiplies the capacity by 1.4, and the worked example gives both 42 and 36 (IO:AE pp.185, 190)",
  // Items whose BV is a modifier or a figure that depends on the unit, which the BV rules here do not compute (TO:AUE pp.192-197).
  "blue-shield-is": "it adds 0.2 to the armor type modifier and counts as a Gauss weapon for the defensive rating (TO:AUE pp.192, 194)",
  "lance-is": "its BV is its damage (the unit's tonnage divided by 5, rounded up) times 1 (TO:AUE pp.101, 195), but the book does not say what Triple-Strength Myomer does to a Lance's damage",
  "talons-clan": "its BV is the kick damage after Triple-Strength Myomer times 1 (TO:AUE p.197), and the pair of Talons with their 1.5 on kicks (p.102) leaves the figure unclear",
  "mechanical-jump-booster-is": "it adds Jumping MP chosen by the designer, which the record does not hold (TO:AUE p.192)",
  "jump-pack-is": "it adds Jumping MP from the pack weight and the unit weight, not computed here (TO:AUE p.192)",
  "jump-pack-clan": "it adds Jumping MP from the pack weight and the unit weight, not computed here (TO:AUE p.192)",
  "protomech-quad-melee-weapon-system-clan": "its BV is its damage (2 per 5 tons of a quadruped ProtoMech) times 1.25 (IO:AE p. 190); the ProtoMech editor works it out for a quad, and no other unit carries it",
  "vehicular-mine-dispenser-is": "its BV is that of a 10-point minefield of the mine it carries, which the row does not fix (TO:AUE p. 195)",
  "vehicular-mine-dispenser-clan": "its BV is that of a 10-point minefield of the mine it carries, which the row does not fix (TO:AUE p. 195)",
};
/** Special munitions: one catalog row per munition and launcher family (the `-is`/`-clan` stem here), not per launcher size.
 * Their BV is the base ammunition BV of the launcher that fires them, with the Alternative Munitions Table's modifier for some
 * (TO:AUE printed p. 198), so they are not "equipment in none of the tables" (0); the row does not say which launcher, so they
 * are reported as unvalued. The Alternative Munitions Table prints a modifier for two of the catalog's munition types, Swarm-I (0.2) and
 * Thunder (mine points per ton, by the minefield table), and says only that it is "applied to each ton of ammunition to find the
 * additional base BV": whether that replaces the ammunition's BV or adds to it is not stated. The other munition rows are in neither table. */
export const SPECIAL_MUNITIONS: Sourced & { stems: string[]; why: string } = {
  cite: { book: TO, page: 198 },
  checked: "page",
  stems: [
    "ammo-armor-piercing", "ammo-flechette", "ammo-precision", "ammo-narc-capable", "ammo-fragmentation",
    "ammo-harpoon", "ammo-inferno", "ammo-tear-gas", "ammo-semi-guided", "ammo-swarm", "ammo-swarm-i", "ammo-thunder",
    "ammo-thunder-augmented", "ammo-thunder-inferno", "ammo-thunder-vibrabomb", "ammo-thunder-active", "ammo-narc-explosive",
    "ammo-improved-narc-ecm", "ammo-improved-narc-explosive", "ammo-improved-narc-haywire", "ammo-improved-narc-nemesis",
    // TO:AUE pp. 226-229 and IO:AE p. 213. Retro-Streak and the improved ATM munitions are valued by rule
    // (DEFENSIVE_MUNITIONS, FACTORED_MUNITIONS below), Dead-Fire by its own table (DEAD_FIRE_AMMO_BV below).
    "ammo-acid-srm", "ammo-anti-radiation-srm", "ammo-anti-radiation-lrm", "ammo-bola-narc-pods", "ammo-follow-the-leader-lrm",
    "ammo-heat-seeking-srm", "ammo-heat-seeking-lrm", "ammo-incendiary-lrm", "ammo-magnetic-pulse-srm", "ammo-magnetic-pulse-lrm",
    "ammo-mine-clearance-srm", "ammo-mine-clearance-lrm", "ammo-smoke-srm", "ammo-smoke-lrm", "ammo-tandem-charge-srm",
    "ammo-anti-tsm-lrm", "ammo-anti-tsm-srm", "ammo-listen-kill-lrm", "ammo-listen-kill-srm",
    "ammo-retro-streak-srm", "ammo-shoot-and-sit-narc", "ammo-improved-magnetic-pulse-atm", "ammo-improved-inferno-atm",
    // TO:AUE pp. 164-175 and 225-227: autocannon, artillery and flamer/fluid gun munitions. The Alternative Munitions Table (p. 198) prints a modifier for caseless (1.0),
    // tracer (0.25), corrosive (2.0), inferno fuel (2.0) and Thunder/FASCAM (mine points per ton); the rest print none. Same reason as the missile munitions.
    "ammo-caseless-ac", "ammo-flak-ac", "ammo-tracer-ac", "ammo-air-defense-arrow", "ammo-arrow-iv-cluster", "ammo-cluster-long-tom", "ammo-cluster-sniper",
    "ammo-cluster-thumper", "ammo-flechette-artillery", "ammo-arrow-iv-illumination", "ammo-illumination-artillery", "ammo-arrow-iv-laser-inhibiting",
    "ammo-inferno-iv", "ammo-arrow-iv-smoke", "ammo-smoke-artillery", "ammo-thunder-fascam-artillery", "ammo-thunder-active-iv", "ammo-thunder-vibrabomb-iv",
    "ammo-flamer-coolant", "ammo-flamer-corrosive", "ammo-flamer-flame-retardant-foam", "ammo-flamer-inferno-fuel", "ammo-flamer-oil-slick",
    "ammo-flamer-paint-obscurant", "ammo-flamer-water",
  ],
  why: "a special munition: its BV comes from its launcher's ammunition BV (TO:AUE p. 198), the row does not say which launcher, and the book does not say how its modifier is applied",
};
/** Dead-Fire ammunition: BV a ton by the size of the launcher that fires it (IO:AE printed p. 190, the Alternate Era Weapons and Equipment Battle Value Table, which errata
 * v3.01 repeats). The row is one per launcher family, so the size comes from the launcher on the unit that the bin feeds. An MML has a figure for each of its two ammunition
 * modes, the table's SRM line and LRM line. The errata prints unlabelled pairs ("8/9"); they are read SRM then LRM, the order of the printed table's lines, which
 * also keeps each MML figure in step with the SRM and LRM sizes near it. `family` maps a catalog stem to the key of the launcher family it fires from. */
export const DEAD_FIRE_AMMO_BV: Sourced & { family: Record<string, "lrm" | "srm">; perTon: Record<string, Record<number, number>> } = {
  cite: { book: IO, page: 190 },
  checked: "page",
  family: { "ammo-dead-fire-lrm": "lrm", "ammo-dead-fire-srm": "srm" },
  perTon: {
    lrm: { 5: 9, 10: 17, 15: 26, 20: 35 },
    srm: { 2: 4, 4: 7, 6: 10 },
    "mml-lrm": { 3: 6, 5: 9, 7: 12, 9: 17 },
    "mml-srm": { 3: 6, 5: 8, 7: 11, 9: 15 },
  },
};
/** Special munitions whose ammunition BV is the standard ammunition BV of the weapon that fires them times a factor (the Ammo BV column of IO:AE printed pp. 190-191, where
 * it prints a multiplier). `launcher` is a pattern for the ids of the weapons that fire it; the row is for whichever of them is on the unit (the same figure whichever is meant).
 * The improved ATM munitions are the Wars of Reaving lines "Imp. IMP iATMs" (x2.0) and "Imp. IIW iATMs" (x1.3), and the fuel-air shells the Thermobaric Weapons lines (x1.0
 * for the Arrow IV missile, x1.4 for a Thumper, Sniper or Long Tom shell, artillery piece or cannon). A fuel-air bomb is a flat figure a bomb, a bomb row in the aero tables. */
export const FACTORED_MUNITIONS: Sourced & { rows: Record<string, { launcher: string; factor: number }> } = {
  cite: { book: IO, page: 190 },
  checked: "page",
  rows: {
    "ammo-improved-magnetic-pulse-atm": { launcher: "^improved-atm-\\d+-clan$", factor: 2 },
    "ammo-improved-inferno-atm": { launcher: "^improved-atm-\\d+-clan$", factor: 1.3 },
    "ammo-fuel-air-arrow-iv": { launcher: "^arrow-iv-(is|clan)$", factor: 1 },
    "ammo-fuel-air-thumper": { launcher: "^thumper-artillery-(is|clan)$", factor: 1.4 },
    "ammo-fuel-air-sniper": { launcher: "^sniper-artillery-(is|clan)$", factor: 1.4 },
    "ammo-fuel-air-long-tom": { launcher: "^long-tom-artillery-(is|clan)$", factor: 1.4 },
    "ammo-fuel-air-thumper-cannon": { launcher: "^thumper-cannon-(is|clan)$", factor: 1.4 },
    "ammo-fuel-air-sniper-cannon": { launcher: "^sniper-cannon-(is|clan)$", factor: 1.4 },
    "ammo-fuel-air-long-tom-cannon": { launcher: "^long-tom-cannon-(is|clan)$", factor: 1.4 },
  },
};
/** Retro-Streak ammunition adds its Ammo BV to the unit's Defensive Battle Value "regardless of the Streak SRM launcher used" (IO:AE printed pp. 187 and 190; the table's double
 * star is "Defensive BV"). The figure is the table's Ammo BV, which the column gives for a ton, so a bin counts its tons; the text says only that the ammunition adds 15. */
export const DEFENSIVE_MUNITIONS: Sourced & { rows: Record<string, number> } = { cite: { book: IO, page: 190 }, checked: "page", rows: { "ammo-retro-streak-srm": 15 } };
/** Mines and grenade munitions chosen for a dispenser or launcher. A mine dispenser carries two shots of one mine type (TO:AUE printed p. 137); its Battle Value is that of a
 * 10-point minefield of the type (p. 195, note P), read from the Minefield BV Table (p. 197): a value for each 5 points, and for an EMP mine a value for the hex. A grenade
 * munition's modifier is applied to the launcher itself, not to ammunition, since a vehicular grenade launcher is a one-shot weapon (the Alternative Munitions Table, p. 198; the
 * only grenade it prints is incendiary, 0.5, and that table adds the result to the unit's base BV). The keys are the id stems of the catalog rows (`mine-...`, `grenade-...`). */
export const MINEFIELD_BV: Sourced & { dispenser: { shots: number; pointsPerShot: number }; perFivePoints: Record<string, number>; perHex: Record<string, number>; grenadeModifier: Record<string, number> } = {
  cite: { book: TO, page: 197 },
  checked: "page",
  dispenser: { shots: 2, pointsPerShot: 10 },
  perFivePoints: { "mine-active": 6, "mine-command-detonated": 6, "mine-inferno": 5, "mine-space": 5, "mine-standard": 4, "mine-vibrabomb": 5 },
  perHex: { "mine-emp-command-detonated": 45, "mine-emp-vibrabomb": 45 },
  grenadeModifier: { "grenade-incendiary": 0.5 },
};
/** Munitions the Battle Value rules give no figure of their own: a bin of one counts as a bin of the standard ammunition of the launcher it feeds.
 * Artemis-capable ammunition is standard ammunition: the Artemis IV increase of 20 percent is on the launcher and "does not apply to the launcher's
 * ammunition" (v4.1 printed p. 303; note B of the BV table, p. 317). The Technical Manual's ammunition table prints ER and HE ATM ammunition at
 * the standard ammunition's weight and shots (x 1, printed p. 345) and its BV table has no line for either, so the ATM's own ammunition figure is used. */
export const LAUNCHER_MUNITIONS: Sourced & { stems: string[] } = {
  cite: { book: TM, page: 303 },
  checked: "page",
  stems: ["ammo-artemis-capable", "ammo-er-atm", "ammo-he-atm"],
};
/** Equipment introduced in TechManual or in Tactical Operations: Advanced Units and Equipment that is in none of their BV tables counts as 0 (TO:AUE printed p. 192). */
export const UNLISTED_IS_ZERO: Sourced & { books: string[] } = { cite: { book: TO, page: 192 }, checked: "page", books: [TM, TO] };
export const MACHINE_GUN_ARRAY_IDS = ["machine-gun-array-is", "machine-gun-array-clan"];
export const IMPROVED_JUMP_JET_IDS = ["improved-jump-jet-is", "improved-jump-jet-clan"];
/**
 * Rows whose Battle Value is a rule, not a number (TO:AUE pp. 192-194 and IO:AE pp. 185, 190):
 * - signature systems: the Chameleon LPS and the Null-Signature System add the long-range to-hit modifier to the defensive target
 *   modifier; the Void-Signature System uses +3 or the unit's own modifier, whichever is higher, and +1 on top of it on a tie;
 * - the RISC laser pulse module multiplies the BV of the laser it is fitted to; the heat sink override kit multiplies the unit's final BV;
 * - RISC super-cooled myomer counts movement heat as 0 for a unit with no jump jets or UMU (an engine-type "super-cooled" myomer counts too);
 * - HarJel II and III multiply the armor BV of their own location (stacking with the armor type) and take 1 defensive point a slot;
 * - the Actuator Enhancement System multiplies the BV of the weapons in its arm by 1.25 and adds 10 percent of the unit's tonnage, for each limb that has one.
 */
export const BV_RULE_ITEMS: {
  signature: Sourced & { longRangeIds: string[]; longRangeModifier: number; voidIds: string[]; voidModifier: number };
  laserPulseModule: Sourced & { ids: string[]; multiplier: number };
  finalMultiplier: Sourced & { multipliers: Record<string, number> };
  superCooledMyomer: Sourced & { ids: string[]; myomer: string; umuIds: string[] };
  harjel: Sourced & { multipliers: Record<string, number>; perSlot: number };
  aes: Sourced & { armIds: string[]; legIds: string[]; weaponFactor: number; tonnageFactor: number };
  /** A unit with a drone operating system multiplies the BV of all its weapons (not ammunition) by 0.8, and its final BV by 0.95. */
  drone: Sourced & { ids: string[]; weaponFactor: number; finalFactor: number };
} = {
  signature: {
    cite: { book: TO, page: 193 },
    checked: "page",
    longRangeIds: ["chameleon-lps-is", "null-signature-system-is"], // Chameleon p.193, Null-Signature p.194
    longRangeModifier: 2, // the long-range to-hit modifier (Total Warfare p. 142)
    voidIds: ["void-signature-system-is"], // p.194
    voidModifier: 3,
  },
  laserPulseModule: { cite: { book: IO, page: 190 }, checked: "page", ids: ["risc-laser-pulse-module-is"], multiplier: 1.15 },
  finalMultiplier: { cite: { book: IO, page: 190 }, checked: "page", multipliers: { "risc-heat-sink-override-kit-is": 1.01 } },
  superCooledMyomer: { cite: { book: IO, page: 185 }, checked: "page", ids: ["super-cooled-myomer-is"], myomer: "super-cooled", umuIds: ["umu-is", "umu-clan"] },
  harjel: { cite: { book: IO, page: 185 }, checked: "page", multipliers: { "harjel-ii-clan": 1.1, "harjel-iii-clan": 1.2 }, perSlot: 1 },
  aes: { cite: { book: TO, page: 192 }, checked: "page", armIds: ["aes-arm-is", "aes-arm-clan"], legIds: ["aes-leg-is", "aes-leg-clan"], weaponFactor: 1.25, tonnageFactor: 0.1 },
  drone: { cite: { book: TO, page: 193 }, checked: "page", ids: ["drone-operating-system-is", "drone-operating-system-clan"], weaponFactor: 0.8, finalFactor: 0.95 },
};
/** Rows that add to Heat Efficiency (RISC emergency coolant system: +4, IO:AE p. 190). */
export const HEAT_EFFICIENCY_BONUS: Record<string, number> = { "risc-emergency-coolant-system-is": 4 };
/** Physical weapons: BV is the weapon's damage times the factor (the table's footnote ** says damage after TSM). Damage by 'Mech tonnage: Total Warfare p. 146, TechManual pp. 220, 236, 237. */
export const PHYSICAL_BV: Sourced & { rows: Record<string, { factor: number; damage: "hatchet" | "sword" | "blade" | "claws" | "mace" | number; fixed?: true }> } = {
  cite: { book: TM, page: 317 },
  checked: "page",
  rows: {
    "hatchet-is": { factor: 1.5, damage: "hatchet" },
    "sword-is": { factor: 1.725, damage: "sword" },
    "retractable-blade-is": { factor: 1.725, damage: "blade" },
    "retractable-blade-clan": { factor: 1.725, damage: "blade" },
    // The chain whip's damage (3) is not changed by TSM or the wielder's weight (TO:AUE p. 101); BV factor TO:AUE p. 195.
    "chain-whip-is": { factor: 1.725, damage: 3, fixed: true },
    // Claws: 1 damage per 7 tons, rounded up, doubled by Triple-Strength Myomer (TO:AUE p.100); BV factor 1.275 (p.195).
    "claws-is": { factor: 1.275, damage: "claws" },
    // Mace: 1 damage per 4 tons, rounded up (TO:AUE p.216, read on the page image); BV is that damage times 1 (TO:AUE p.195). It makes the
    // Gothic MAD-3H's printed Battle Value reproduce exactly (G-2).
    "mace-is": { factor: 1, damage: "mace" },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Equipment BV. A weapon row: [catalog id, item BV, ammunition BV per ton (omit for none), options]. Its ammunition rows
// default to `ammo-<id>`; `ammo` lists them where the name differs. `heat` is a multiplier family or a heat figure that
// replaces the catalog's; `inert` is the table's section mark: the ammunition is not counted as explosive; `gauss` counts
// the item as a Gauss weapon for the Defensive Battle Rating; `defensive` is the table's dagger.
// ---------------------------------------------------------------------------------------------------------------
export interface BvOptions {
  ammo?: string[];
  heat?: keyof typeof HEAT_MULTIPLIER | number;
  inert?: true;
  gauss?: true;
  /** Counts as a Gauss weapon of this many critical slots, not its own (the hyper-velocity ACs, table note Q). */
  gaussSlots?: number;
  defensive?: true;
  /** The ammunition's BV is defensive too (the anti-missile system's), counted up to the BV of the systems themselves. */
  defensiveAmmo?: true;
  /** The item has no BV of its own but works on others (CASE, MASC, TAG, ...); listed so it is not reported as unvalued. */
  none?: true;
}
export type BvRow = [id: string, bv: number, ammoBv?: number, options?: BvOptions];
export interface BvGroup extends Sourced {
  rows: BvRow[];
}

const G = { gauss: true, inert: true } as const;

export const WEAPON_BV: BvGroup[] = [
  {
    cite: { book: TM, page: 317 },
    checked: "page",
    rows: [
      // Inner Sphere energy
      ["er-large-laser-is", 163], ["er-medium-laser-is", 62], ["er-small-laser-is", 17], ["flamer-is", 6], ["large-laser-is", 123],
      ["medium-laser-is", 46], ["small-laser-is", 9], ["heavy-ppc-is", 317], ["ppc-is", 176], ["light-ppc-is", 88],
      ["snub-nose-ppc-is", 165], ["er-ppc-is", 229], ["plasma-rifle-is", 210, 26, { inert: true }],
      ["large-pulse-laser-is", 119], ["medium-pulse-laser-is", 48], ["small-pulse-laser-is", 12],
      // Inner Sphere ballistic
      ["ac-2-is", 37, 5], ["ac-5-is", 70, 9], ["ac-10-is", 123, 15], ["ac-20-is", 178, 22],
      ["vehicle-flamer-is", 5, 1],
      ["heavy-gauss-rifle-is", 346, 43, G], ["gauss-rifle-is", 320, 40, G], ["light-gauss-rifle-is", 159, 20, G], 
      ["lb-2-x-ac-is", 42, 5, { ammo: ["ammo-lb-2-x-is", "ammo-lb-2-x-cluster-is"] }],
      ["lb-5-x-ac-is", 83, 10, { ammo: ["ammo-lb-5-x-is", "ammo-lb-5-x-cluster-is"] }],
      ["lb-10-x-ac-is", 148, 19, { ammo: ["ammo-lb-10-x-is", "ammo-lb-10-x-cluster-is"] }],
      ["lb-20-x-ac-is", 237, 30, { ammo: ["ammo-lb-20-x-is", "ammo-lb-20-x-cluster-is"] }],
      ["light-ac-2-is", 30, 4], ["light-ac-5-is", 62, 8],
      ["heavy-machine-gun-is", 6, 1, { ammo: ["ammo-heavy-machine-gun-is", "ammo-heavy-machine-gun-half-is"] }],
      ["machine-gun-is", 5, 1, { ammo: ["ammo-machine-gun-is", "ammo-machine-gun-half-is"] }],
      ["light-machine-gun-is", 5, 1, { ammo: ["ammo-light-machine-gun-is", "ammo-light-machine-gun-half-is"] }],
      ["nail-rivet-gun-is", 1, 0, { inert: true, ammo: ["ammo-nail-rivet-gun-is", "ammo-nail-rivet-gun-half-is"] }],
      ["rotary-ac-2-is", 118, 15, { heat: "rotary" }], ["rotary-ac-5-is", 247, 31, { heat: "rotary" }],
      ["ultra-ac-2-is", 56, 7, { heat: "ultra" }], ["ultra-ac-5-is", 112, 14, { heat: "ultra" }],
      ["ultra-ac-10-is", 210, 26, { heat: "ultra" }], ["ultra-ac-20-is", 281, 35, { heat: "ultra" }],
      // Inner Sphere missiles (the item BV before the slash; the single-shot figure after it is not needed)
      ["lrm-5-is", 45, 6], ["lrm-10-is", 90, 11], ["lrm-15-is", 136, 17], ["lrm-20-is", 181, 23],
      ["mml-3-is", 29, 4, { ammo: ["ammo-mml-3-lrm-is", "ammo-mml-3-srm-is"] }], ["mml-5-is", 45, 6, { ammo: ["ammo-mml-5-lrm-is", "ammo-mml-5-srm-is"] }],
      ["mml-7-is", 67, 8, { ammo: ["ammo-mml-7-lrm-is", "ammo-mml-7-srm-is"] }], ["mml-9-is", 86, 11, { ammo: ["ammo-mml-9-lrm-is", "ammo-mml-9-srm-is"] }],
      ["mrm-10-is", 56, 7], ["mrm-20-is", 112, 14], ["mrm-30-is", 168, 21], ["mrm-40-is", 224, 28],
      ["rocket-launcher-10-is", 18, undefined, { heat: "oneShot" }], ["rocket-launcher-15-is", 23, undefined, { heat: "oneShot" }], ["rocket-launcher-20-is", 24, undefined, { heat: "oneShot" }],
      ["srm-2-is", 21, 3], ["srm-4-is", 39, 5], ["srm-6-is", 59, 7],
      ["streak-srm-2-is", 30, 4, { heat: "streak" }], ["streak-srm-4-is", 59, 7, { heat: "streak" }], ["streak-srm-6-is", 89, 11, { heat: "streak" }],
      // Clan energy
      ["er-large-laser-clan", 248], ["er-medium-laser-clan", 108], ["er-small-laser-clan", 31], ["er-micro-laser-clan", 7], ["flamer-clan", 6],
      ["heavy-large-laser-clan", 244], ["heavy-medium-laser-clan", 76], ["heavy-small-laser-clan", 15], ["er-ppc-clan", 412],
      ["plasma-cannon-clan", 170, 21, { inert: true }], ["large-pulse-laser-clan", 265], ["medium-pulse-laser-clan", 111],
      ["small-pulse-laser-clan", 24], ["micro-pulse-laser-clan", 12],
      // Clan ballistic
      ["vehicle-flamer-clan", 5, 1], ["ap-gauss-rifle-clan", 21, 3, G], ["gauss-rifle-clan", 320, 40, G],
      ["hyper-assault-gauss-20-clan", 267, 33, G], ["hyper-assault-gauss-30-clan", 401, 50, G], ["hyper-assault-gauss-40-clan", 535, 67, G],
      ["lb-2-x-ac-clan", 47, 6, { ammo: ["ammo-lb-2-x-clan", "ammo-lb-2-x-cluster-clan"] }],
      ["lb-5-x-ac-clan", 93, 12, { ammo: ["ammo-lb-5-x-clan", "ammo-lb-5-x-cluster-clan"] }],
      ["lb-10-x-ac-clan", 148, 19, { ammo: ["ammo-lb-10-x-clan", "ammo-lb-10-x-cluster-clan"] }],
      ["lb-20-x-ac-clan", 237, 30, { ammo: ["ammo-lb-20-x-clan", "ammo-lb-20-x-cluster-clan"] }],
      ["heavy-machine-gun-clan", 6, 1, { ammo: ["ammo-heavy-machine-gun-clan", "ammo-heavy-machine-gun-half-clan"] }],
      ["machine-gun-clan", 5, 1, { ammo: ["ammo-machine-gun-clan", "ammo-machine-gun-half-clan"] }],
      ["light-machine-gun-clan", 5, 1, { ammo: ["ammo-light-machine-gun-clan", "ammo-light-machine-gun-half-clan"] }],
      ["nail-rivet-gun-clan", 1, 0, { inert: true, ammo: ["ammo-nail-rivet-gun-clan", "ammo-nail-rivet-gun-half-clan"] }],
      ["ultra-ac-2-clan", 62, 8, { heat: "ultra" }], ["ultra-ac-5-clan", 122, 15, { heat: "ultra" }],
      ["ultra-ac-10-clan", 210, 26, { heat: "ultra" }], ["ultra-ac-20-clan", 335, 42, { heat: "ultra" }],
      // Clan missiles
      ["atm-3-clan", 53, 14], ["atm-6-clan", 105, 26], ["atm-9-clan", 147, 36], ["atm-12-clan", 212, 52],
      ["lrm-5-clan", 55, 7], ["lrm-10-clan", 109, 14], ["lrm-15-clan", 164, 21], ["lrm-20-clan", 220, 27],
      ["srm-2-clan", 21, 3], ["srm-4-clan", 39, 5], ["srm-6-clan", 59, 7],
      ["streak-srm-2-clan", 40, 5, { heat: "streak" }], ["streak-srm-4-clan", 79, 10, { heat: "streak" }], ["streak-srm-6-clan", 118, 15, { heat: "streak" }],
    ],
  },
  {
    // Interstellar Operations: Alternate Eras, Alternate Era Weapons and Equipment Battle Value Table, printed pp. 189-191.
    cite: { book: IO, page: 189 },
    checked: "page",
    rows: [
      ["primitive-prototype-ac-2-is", 37, 4], ["primitive-prototype-ac-5-is", 70, 7], ["primitive-prototype-ac-10-is", 123, 12], ["primitive-prototype-ac-20-is", 178, 17],
      ["primitive-prototype-small-laser-is", 9], ["primitive-prototype-medium-laser-is", 46], ["primitive-prototype-large-laser-is", 123],
      ["primitive-prototype-lrm-5-is", 38, 4], ["primitive-prototype-lrm-10-is", 78, 8], ["primitive-prototype-lrm-15-is", 132, 13], ["primitive-prototype-lrm-20-is", 168, 16],
      ["primitive-prototype-srm-2-is", 10, 1], ["primitive-prototype-srm-4-is", 21, 3], ["primitive-prototype-srm-6-is", 41, 4],
      ["primitive-prototype-ppc-is", 176], ["prototype-arrow-iv-is", 240, 30],
      ["prototype-gauss-rifle-is", 320, 40, G], ["prototype-gauss-rifle-lsw-is", 320, 40, { ...G, ammo: [] }],
      ["prototype-lb-10-x-ac-is", 148, 15], ["prototype-lb-10-x-ac-lsw-is", 148, 15, { ammo: [] }],
      ["prototype-narc-missile-beacon-is", 15, 0],
      ["prototype-small-pulse-laser-is", 11, undefined, { heat: 4 }], ["prototype-medium-pulse-laser-is", 43, undefined, { heat: 7 }], ["prototype-medium-pulse-laser-lsw-is", 43, undefined, { heat: 7 }],
      ["prototype-large-pulse-laser-is", 108, undefined, { heat: 13 }],
      ["prototype-rocket-launcher-10-is", 15, undefined, { heat: "oneShot" }], ["prototype-rocket-launcher-15-is", 18, undefined, { heat: "oneShot" }], ["prototype-rocket-launcher-20-is", 19, undefined, { heat: "oneShot" }],
      ["prototype-rocket-launcher-10-clan", 15, undefined, { heat: "oneShot" }], ["prototype-rocket-launcher-15-clan", 18, undefined, { heat: "oneShot" }], ["prototype-rocket-launcher-20-clan", 19, undefined, { heat: "oneShot" }],
      ["centurion-weapon-system-is", 190],
      ["improved-ac-2-clan", 37, 5], ["improved-ac-5-clan", 70, 9], ["improved-ac-10-clan", 123, 15], ["improved-ac-20-clan", 178, 22],
      ["improved-gauss-rifle-clan", 320, 40, { inert: true, gauss: true }],
      ["improved-large-laser-clan", 123], ["improved-large-pulse-laser-clan", 119], ["improved-ppc-clan", 176], ["enhanced-ppc-clan", 329],
      ["improved-lrm-5-clan", 45, 6], ["improved-lrm-10-clan", 90, 11], ["improved-lrm-15-clan", 136, 17], ["improved-lrm-20-clan", 181, 23],
      ["improved-srm-2-clan", 28, 4], ["improved-srm-4-clan", 52, 7], ["improved-srm-6-clan", 79, 10],
      ["prototype-er-small-laser-clan", 17], ["prototype-er-medium-laser-clan", 62],
      ["prototype-lb-2-x-ac-clan", 42, 5], ["prototype-lb-5-x-ac-clan", 83, 10], ["prototype-lb-20-x-ac-clan", 237, 30],
      ["prototype-streak-srm-4-clan", 59, 7, { heat: "streak" }], ["prototype-streak-srm-6-clan", 89, 11, { heat: "streak" }],
      ["prototype-ultra-ac-2-clan", 56, 7, { heat: "ultra" }], ["prototype-ultra-ac-10-clan", 210, 26, { heat: "ultra" }], ["prototype-ultra-ac-20-clan", 281, 35, { heat: "ultra" }],
      ["prototype-ultra-ac-5-is", 112, 14, { heat: "ultra" }],
      ["prototype-er-large-laser-is", 136, undefined, { heat: 13 }],
      ["improved-atm-3-clan", 83, 21], ["improved-atm-6-clan", 164, 39], ["improved-atm-9-clan", 231, 54], ["improved-atm-12-clan", 333, 78],
      ["small-re-engineered-laser-is", 14], ["medium-re-engineered-laser-is", 65], ["large-re-engineered-laser-is", 161],
      ["tsemp-cannon-is", 488, undefined, { gauss: true }], ["tsemp-one-shot-is", 98, undefined, { gauss: true, heat: "oneShot" }],
      ["risc-hyper-laser-is", 596, undefined, { gauss: true }], ["risc-repeating-tsemp-cannon-is", 600, undefined, { gauss: true }],
    ],
  },
  {
    // Tactical Operations: Advanced Units and Equipment, Inner Sphere Weapons and Equipment BV Table [Addendum], printed pp. 194-195.
    // A cannon is the Artillery Cannon row; the artillery piece is the Artillery Weapons row. HV AC (table note Q) counts as a Gauss
    // weapon of one slot. The Light, Medium and Large rifles are the catalog's light, medium and heavy rifles. The table gives the
    // Bombast laser's BV only; its heat is the largest damage it can be dialled to (12, p. 132).
    cite: { book: TO, page: 194 },
    checked: "page",
    rows: [
      ["er-flamer-is", 16], ["binary-laser-is", 222], ["bombast-laser-is", 137, undefined, { heat: 12 }],
      ["variable-speed-laser-large-is", 123], ["variable-speed-laser-medium-is", 56], ["variable-speed-laser-small-is", 22],
      ["x-pulse-laser-small-is", 21], ["x-pulse-laser-medium-is", 71], ["x-pulse-laser-large-is", 178],
      ["hyper-velocity-ac-2-is", 53, 7, { gaussSlots: 1 }], ["hyper-velocity-ac-5-is", 109, 14, { gaussSlots: 1 }], ["hyper-velocity-ac-10-is", 158, 20, { gaussSlots: 1 }],
      // The fluid gun carries Water ammunition unless the design says otherwise, and water does not explode (TO:AUE, Fluid Gun and Flamer/Fluid Gun/Sprayer Ammunition), so its bins are inert.
      ["fluid-gun-is", 6, 1, { inert: true }], ["heavy-flamer-is", 15, 2], ["improved-heavy-gauss-is", 385, 48, { gauss: true }], /* Ammunition BV 0, not Tactical Operations' 2 (p. 194): later source: TechManual, errata v8.0 p. 35. */ ["magshot-is", 15, 0, { gauss: true }],
      ["silver-bullet-gauss-is", 198, 25, { gauss: true }],
      ["mech-mortar-1-is", 10, 1], ["mech-mortar-2-is", 14, 2], ["mech-mortar-4-is", 26, 3], ["mech-mortar-8-is", 50, 6],
      ["light-rifle-is", 21, 3], ["medium-rifle-is", 51, 6], ["heavy-rifle-is", 91, 11],
      ["vehicular-grenade-launcher-is", 15], ["taser-is", 40, 5, { gauss: true }],
      ["long-tom-cannon-is", 329, 41], ["sniper-cannon-is", 77, 10], ["thumper-cannon-is", 41, 5],
      ["enhanced-lrm-5-is", 52, 7], ["enhanced-lrm-10-is", 104, 13], ["enhanced-lrm-15-is", 157, 20], ["enhanced-lrm-20-is", 210, 26],
      ["extended-lrm-5-is", 67, 8], ["extended-lrm-10-is", 133, 17], ["extended-lrm-15-is", 200, 25], ["extended-lrm-20-is", 268, 34],
      ["thunderbolt-5-is", 64, 8], ["thunderbolt-10-is", 127, 16], ["thunderbolt-15-is", 229, 29], ["thunderbolt-20-is", 305, 38],
      ["arrow-iv-is", 240, 30], ["sniper-artillery-is", 85, 11], ["thumper-artillery-is", 43, 5],
    ],
  },
  {
    // Clan Weapons and Equipment BV Table [Addendum], printed pp. 196-197. The improved heavy lasers carry the table's double dagger (Gauss weapon).
    cite: { book: TO, page: 196 },
    checked: "page",
    rows: [
      ["er-flamer-clan", 16], ["chemical-laser-small-clan", 7, 1], ["chemical-laser-medium-clan", 37, 5], ["chemical-laser-large-clan", 99, 12],
      ["er-pulse-laser-small-clan", 36], ["er-pulse-laser-medium-clan", 117], ["er-pulse-laser-large-clan", 272],
      ["improved-heavy-laser-small-clan", 19, undefined, { gauss: true }], ["improved-heavy-laser-medium-clan", 93, undefined, { gauss: true }],
      ["improved-heavy-laser-large-clan", 296, undefined, { gauss: true }],
      ["protomech-ac-2-clan", 34, 4], ["protomech-ac-4-clan", 49, 6], ["protomech-ac-8-clan", 66, 8],
      ["rotary-ac-2-clan", 161, 20, { heat: "rotary" }], ["rotary-ac-5-clan", 345, 43, { heat: "rotary" }],
      ["fluid-gun-clan", 6, 1, { inert: true }], ["heavy-flamer-clan", 15, 2],
      ["mech-mortar-1-clan", 10, 1], ["mech-mortar-2-clan", 14, 2], ["mech-mortar-4-clan", 26, 3], ["mech-mortar-8-clan", 50, 6],
      ["vehicular-grenade-launcher-clan", 15],
      ["long-tom-cannon-clan", 329, 41], ["sniper-cannon-clan", 77, 10], ["thumper-cannon-clan", 41, 5],
      ["streak-lrm-5-clan", 86, 11, { heat: "streak" }], ["streak-lrm-10-clan", 173, 22, { heat: "streak" }],
      ["streak-lrm-15-clan", 259, 32, { heat: "streak" }], ["streak-lrm-20-clan", 345, 43, { heat: "streak" }],
      ["arrow-iv-clan", 240, 30], ["sniper-artillery-clan", 96, 11], ["thumper-artillery-clan", 48, 5],
    ],
  },
  {
    // TechManual, Aerospace Weapons and Equipment BV Table, printed p. 318 (read against the page image). The ammunition figures of the capital missiles
    // are per missile, not per ton; the catalog has no capital missile ammunition rows yet, so they are kept for when it does. The bombs print an
    // ammunition figure only ("—" for the item): a bomb is one item, so its figure is the item's here. The screen launcher is defensive (the dagger).
    cite: { book: TM, page: 318 },
    checked: "page",
    rows: [
      ["killer-whale-is", 769, 96], ["white-shark-is", 577, 72], ["barracuda-is", 522, 65], ["ar-10-launcher-is", 961],
      ["killer-whale-clan", 769, 96], ["white-shark-clan", 577, 72], ["barracuda-clan", 522, 65], ["ar-10-launcher-clan", 961],
      ["kraken-t-is", 2306, 288], ["killer-whale-t-is", 923, 115], ["white-shark-t-is", 692, 86], ["barracuda-t-is", 461, 58],
      ["screen-launcher-is", 160, 20, { defensive: true, defensiveAmmo: true }],
      ["bomb-high-explosive-is", 12], ["bomb-cluster-is", 13], ["bomb-laser-guided-is", 20], ["bomb-inferno-is", 16],
      ["bomb-high-explosive-clan", 12], ["bomb-cluster-clan", 13], ["bomb-laser-guided-clan", 20], ["bomb-inferno-clan", 16],
    ],
  },
  {
    // TO:AUE, Aerospace Weapons and Equipment BV Table [Addendum], External Stores, printed p. 197 (read against the page image): the figures are per
    // missile or bomb ("each"), and the item BV prints a dash, so a bomb's figure is the item's here, as above. The Thunder Active and Thunder Vibrabomb
    // bombs print a dash; the note under the table makes a Thunder bomb seven 20-point minefields of its mine type, and the Minefield BV Table (same page)
    // gives 6 (active) and 5 (vibrabomb) per 5 points, so 7 x 4 x 6 = 168 and 7 x 4 x 5 = 140. The FASCAM bomb lays whichever mine is named before play (UNFIXED).
    cite: { book: TO, page: 197 },
    checked: "page",
    rows: [
      ["bomb-air-to-air-arrow-is", 57], ["bomb-anti-ship-missile-is", 114], ["bomb-anti-ship-ew-missile-is", 75], ["bomb-arrow-iv-non-homing-is", 34],
      ["bomb-light-air-to-air-is", 17], ["bomb-torpedo-is", 10], ["bomb-thunder-active-is", 168], ["bomb-thunder-vibrabomb-is", 140],
      ["bomb-air-to-air-arrow-clan", 57], ["bomb-anti-ship-missile-clan", 114], ["bomb-arrow-iv-non-homing-clan", 34], ["bomb-light-air-to-air-clan", 17], ["bomb-torpedo-clan", 10],
    ],
  },
  {
    // IO:AE, Alternate Era Weapons and Equipment Battle Value Table (cont.), Thermobaric Weapons, printed p. 190 (read against the page image): a fuel-air bomb is a flat figure each,
    // 37 for the small and 63 for the large, given in the Ammo BV column; like the other bombs here the figure is the row's own. The other fuel-air munitions are FACTORED_MUNITIONS.
    cite: { book: IO, page: 190 },
    checked: "page",
    rows: [["bomb-fuel-air-small-is", 37], ["bomb-fuel-air-large-is", 63], ["bomb-fuel-air-small-clan", 37], ["bomb-fuel-air-large-clan", 63]],
  },
  {
    // Tactical Operations: Advanced Units and Equipment, Inner Sphere and Clan Capital Scale Weapons and Equipment BV Tables [Addendum], printed p. 196
    // (read against the page image of the corrected seventh printing). Both tables print the same figures for the weapons both have; the mass drivers
    // are Inner Sphere only. The catalog has no naval ammunition rows yet, so the ammunition figures wait for them.
    cite: { book: TO, page: 196 },
    checked: "page",
    rows: [
      ...(["is", "clan"] as const).flatMap((tech): BvRow[] => [
        [`nac-10-${tech}`, 1896, 237], [`nac-20-${tech}`, 3792, 474], [`nac-25-${tech}`, 4740, 593], [`nac-30-${tech}`, 5688, 711], [`nac-35-${tech}`, 4956, 620], [`nac-40-${tech}`, 5664, 708],
        [`light-n-gauss-${tech}`, 3024, 378], [`medium-n-gauss-${tech}`, 5040, 630], [`heavy-n-gauss-${tech}`, 6048, 756],
        [`nl-35-${tech}`, 830], [`nl-45-${tech}`, 1134], [`nl-55-${tech}`, 1386],
        [`light-n-ppc-${tech}`, 1659], [`medium-n-ppc-${tech}`, 2268], [`heavy-n-ppc-${tech}`, 3780],
      ]),
      // The sub-capital weapons (printed p. 196; the missiles ammunition figure is per shot); the cruise missiles and minesweeper are on p. 195
      ["light-scc-is", 379, 47], ["medium-scc-is", 708, 89], ["heavy-scc-is", 991, 124],
      ["scl-1-is", 237], ["scl-2-is", 354], ["scl-3-is", 531],
      ...(["is", "clan"] as const).flatMap((tech): BvRow[] => [[`piranha-${tech}`, 589, 71], [`stingray-${tech}`, 496, 62], [`swordfish-${tech}`, 317, 40], [`manta-ray-${tech}`, 396, 50], [`minesweeper-${tech}`, 30, undefined, { defensive: true }]]),
      ["cruise-missile-50-is", 601, 75], ["cruise-missile-70-is", 1031, 129], ["cruise-missile-90-is", 1530, 191], ["cruise-missile-120-is", 2281, 285],
      ["light-mass-driver-is", 7056, 882], ["medium-mass-driver-is", 11760, 1470], ["heavy-mass-driver-is", 16464, 2058],
    ],
  },
  {
    // The Gothic Light Blazer (catalog row `light-blazer-gothic`, flagged `bvInferred`): no book prints its Battle Value. 148 is the one
    // figure that, run through this table's method, reproduces the three printed Battle Values that carry it: the FS9-HB (1,067), the
    // KGC-0KP (1,986) and the MAD-3H (1,735, with its Mace at 19). Searched over 0 to 600 with the engine; the FS9-HB and the KGC-0KP
    // alone fix it at 148, and the MAD-3H then lands exactly (G-2; owner answer 5). Sheets index 4, 12 and 16 print those figures.
    cite: { book: "BattleTech: Gothic Deluxe Record Sheets", page: 4 },
    checked: "text",
    rows: [["light-blazer-gothic", 148]],
  },
  {
    // The heavy plasma rifle (catalog row flagged `bvInferred`): no book we hold prints its Battle Value. 296 with ammunition at 36 is the pair that,
    // run through this table's method, reproduces Mordel's figure for the Atlas AS7-Ln (unit 99519, 2,386); of the pairs that land there it is the one
    // in the 8-to-1 weapon-to-ammunition ratio the plasma rifle (210, 26) and the other weapons keep. The light plasma rifle has no unit to work from.
    cite: { book: "BattleTech Core Rulebook", page: 248 },
    checked: "text",
    rows: [["heavy-plasma-rifle-is", 296, 36, { inert: true }]],
  },
];
/** "Other Equipment" and the physical and industrial items: BV added in full, never sorted by heat. */
export const EQUIPMENT_BV: BvGroup[] = [
  // A QuadVee's wheels add nothing: the unit is valued as a standard quad BattleMech with no further modifiers (IO:AE printed p.187).
  { cite: { book: IO, page: 187 }, checked: "page", rows: [["wheels-clan", 0]] },
  {
    cite: { book: TM, page: 317 },
    checked: "page",
    rows: [
      ["ams-is", 32, 11, { defensive: true, defensiveAmmo: true }], ["ams-clan", 32, 22, { defensive: true, defensiveAmmo: true }],
      ["a-pods-is", 1, undefined, { defensive: true }], ["a-pods-clan", 1, undefined, { defensive: true }],
      ["b-pods-is", 2, undefined, { defensive: true, gauss: true }], ["b-pods-clan", 2, undefined, { defensive: true, gauss: true }],
      ["beagle-active-probe-is", 10, undefined, { defensive: true }], ["guardian-ecm-suite-is", 61, undefined, { defensive: true }],
      ["active-probe-clan", 12, undefined, { defensive: true }], ["light-active-probe-clan", 7, undefined, { defensive: true }],
      ["ecm-suite-clan", 61, undefined, { defensive: true }],
      ["bridgelayer-light-is", 5, undefined, { defensive: true }], ["bridgelayer-medium-is", 10, undefined, { defensive: true }], ["bridgelayer-heavy-is", 20, undefined, { defensive: true }],
      ["bridgelayer-light-clan", 5, undefined, { defensive: true }], ["bridgelayer-medium-clan", 10, undefined, { defensive: true }], ["bridgelayer-heavy-clan", 20, undefined, { defensive: true }],
      ["narc-missile-beacon-is", 30, 0], ["narc-missile-beacon-clan", 30, 0], ["improved-narc-launcher-is", 75, 0],
      ["bulldozer-is", 10, undefined, { defensive: true }], ["bulldozer-clan", 10, undefined, { defensive: true }], // Clan table printed p. 318
      ["backhoe-is", 8], ["chainsaw-is", 7], ["combine-is", 5], ["dual-saw-is", 9], ["heavy-duty-pile-driver-is", 5], ["mining-drill-is", 6],
      ["rock-cutter-is", 6], ["spot-welder-is", 5], ["wrecking-ball-is", 8],
      ["backhoe-clan", 8], ["chainsaw-clan", 7], ["combine-clan", 5], ["dual-saw-clan", 9], ["heavy-duty-pile-driver-clan", 5], ["mining-drill-clan", 6],
      ["rock-cutter-clan", 6], ["spot-welder-clan", 5], ["wrecking-ball-clan", 8],
      // The table prints no BV for these: they change the BV of other things (notes A to C, E, F) or the unit's ratings.
      ["case-is", 0, undefined, { none: true }], ["case-clan", 0, undefined, { none: true }], ["masc-is", 0, undefined, { none: true }], ["masc-clan", 0, undefined, { none: true }],
      ["tsm-is", 0, undefined, { none: true }], ["industrial-tsm-is", 0, undefined, { none: true }], ["c3-computer-master-is", 0, undefined, { none: true }], ["c3-computer-slave-is", 0, undefined, { none: true }],
      ["improved-c3-computer-is", 0, undefined, { none: true }], ["tag-is", 0, undefined, { none: true }], ["tag-clan", 0, undefined, { none: true }],
      ["light-tag-clan", 0, undefined, { none: true }], ["artemis-iv-is", 0, undefined, { none: true }], ["artemis-iv-clan", 0, undefined, { none: true }],
      ["targeting-computer-is", 0, undefined, { none: true }], ["targeting-computer-clan", 0, undefined, { none: true }],
      ["machine-gun-array-is", 0, undefined, { none: true }], ["machine-gun-array-clan", 0, undefined, { none: true }],
    ],
  },
  {
    cite: { book: IO, page: 189 },
    checked: "page",
    rows: [
      ["prototype-beagle-active-probe-is", 10, undefined, { defensive: true }], ["prototype-guardian-ecm-suite-is", 61, undefined, { defensive: true }],
      ["prototype-remote-sensors-is", 0, 0], ["prototype-tag-is", 0],
      ["prototype-case-is", 0, undefined, { none: true }], ["prototype-artemis-iv-is", 0, undefined, { none: true }],
      ["prototype-triple-strength-myomer-is", 0, undefined, { none: true }],
      ["risc-advanced-pds-is", 64, 22, { defensive: true, defensiveAmmo: true }],
      ["risc-viral-jammer-decoy-is", 284, undefined, { defensive: true }], ["risc-viral-jammer-homing-is", 284, undefined, { defensive: true }],
      // The table's double section mark: treat as a Gauss weapon critical space for the Defensive Battle Rating (p. 191).
      ["risc-emergency-coolant-system-is", 0, undefined, { none: true, gauss: true }],
      // Dark Age Equipment, printed p. 190: no BV of their own, they work through the rules in BV_RULE_ITEMS (the laser pulse module's
      // double section mark makes it a Gauss critical space); the remote drone command console prints 0.
      ["risc-laser-pulse-module-is", 0, undefined, { none: true, gauss: true }], ["risc-heat-sink-override-kit-is", 0, undefined, { none: true }],
      ["super-cooled-myomer-is", 0, undefined, { none: true }], ["harjel-ii-clan", 0, undefined, { none: true }], ["harjel-iii-clan", 0, undefined, { none: true }],
      ["remote-drone-command-console-is", 0],
    ],
  },
  {
    // The same table continued, printed p. 190: the Clan Wars of Reaving items and the Nova CEWS.
    cite: { book: IO, page: 190 },
    checked: "page",
    rows: [
      ["nova-cews-clan", 68, undefined, { defensive: true }],
      ["fusillade-launcher-clan", 11], ["magnetic-clamp-system-clan", 1],
      // Printed p. 190: no BV of their own; they enable BV skill modifiers the editor does not apply (the neurohelmet: -1 Piloting, p. 189)
      ["damage-interrupt-circuit-is", 0], ["direct-neural-interface-modification-is", 0], ["enhanced-imaging-interface-clan", 0],
      ["battlemech-neural-interface-unit-is", 0], ["battlemech-neural-interface-unit-clan", 0],
      ["sldf-sds-jammer-system-is", 0], ["wob-super-jump-drive-is", 0], ["dragons-breath-launch-system-is", 1076],
      ["sldf-advanced-neurohelmet-mech-is", 0, undefined, { none: true }], ["sldf-advanced-neurohelmet-fighter-is", 0, undefined, { none: true }],
    ],
  },
  {
    // Tactical Operations: Advanced Units and Equipment, Other Equipment and Melee Weapons rows of the addenda, printed pp. 195-197.
    // Vibroblades and the flail are melee items with a fixed BV, so they are equipment here, not weapons sorted by heat.
    cite: { book: TO, page: 195 },
    checked: "page",
    rows: [
      ["flail-is", 11], ["vibroblade-small-is", 12], ["vibroblade-medium-is", 17], ["vibroblade-large-is", 24],
      ["shield-small-is", 50, undefined, { defensive: true }], ["shield-medium-is", 135, undefined, { defensive: true }], ["shield-large-is", 263, undefined, { defensive: true }],
      ["spikes-is", 4, undefined, { defensive: true }],
      ["angel-ecm-is", 100, undefined, { defensive: true }], ["angel-ecm-clan", 100, undefined, { defensive: true }],
      ["bloodhound-active-probe-is", 25, undefined, { defensive: true }],
      ["c3-remote-sensor-launcher-is", 30, 6],
      ["chaff-pod-is", 19, undefined, { defensive: true, gauss: true }], ["m-pod-is", 5, undefined, { defensive: true, gauss: true }],
      ["electronic-warfare-equipment-is", 39, undefined, { defensive: true }],
      ["laser-anti-missile-system-is", 45, undefined, { defensive: true }], ["laser-anti-missile-system-clan", 45, undefined, { defensive: true }],
      ["aquatic-survival-system-is", 9, undefined, { defensive: true }], ["aquatic-survival-system-clan", 9, undefined, { defensive: true }], // the table's MASS; Clan table printed p. 197
      ["watchdog-cews-clan", 68, undefined, { defensive: true }],
      // No BV of their own: CASE II is used in the Defensive Battle Rating (note H), the C3 variants count only in a network (note D),
      // Artemis V and Apollo change their launcher (notes J, L), and the capacitor, insulator and coolant pod act through the rules above.
      ["case-ii-is", 0, undefined, { none: true }], ["case-ii-clan", 0, undefined, { none: true }],
      ["c3-boosted-master-is", 0, undefined, { none: true }], ["c3-boosted-slave-is", 0, undefined, { none: true }], ["c3-emergency-master-is", 0, undefined, { none: true }],
      ["artemis-v-clan", 0, undefined, { none: true }], ["mrm-apollo-fcs-is", 0, undefined, { none: true }],
      ["ppc-capacitor-is", 0, undefined, { none: true }], ["laser-insulator-is", 0, undefined, { none: true }], ["laser-insulator-clan", 0, undefined, { none: true }],
      ["coolant-pod-is", 0, undefined, { none: true }], ["coolant-pod-clan", 0, undefined, { none: true }],
      // The Actuator Enhancement System, the Chameleon LPS and the signature systems have a letter or no figure in the tables (note G, pp. 193-194).
      ["aes-arm-is", 0, undefined, { none: true }], ["aes-arm-clan", 0, undefined, { none: true }], ["aes-leg-is", 0, undefined, { none: true }], ["aes-leg-clan", 0, undefined, { none: true }],
      ["chameleon-lps-is", 0, undefined, { none: true }], ["null-signature-system-is", 0, undefined, { none: true }], ["void-signature-system-is", 0, undefined, { none: true }],
      // Supercharger: used in the unit ratings but with no BV of its own (note C, TO:AUE p.195)
      ["supercharger-is", 0, undefined, { none: true }], ["supercharger-clan", 0, undefined, { none: true }],
      // The Partial Wing: no BV of its own; its Jumping MP bonus counts in the speed and defensive factors (TO:AUE p.194).
      ["partial-wing-is", 0, undefined, { none: true }], ["partial-wing-clan", 0, undefined, { none: true }],
    ],
  },
];

/**
 * Battle armor equipment: the BV of one item and, after it, the BV of a full ton of its ammunition (a suit carries kilograms, so the
 * method takes it in proportion). Data only: the calculator does not work out a battle armor unit's BV yet (that is a different
 * method, per trooper, TechManual v4.1 p. 310), so rules/bv.ts does not read this table. The items the BA sections of the tables do not list by
 * name (lasers, pulse lasers, machine guns, the Heavy lasers) take the line of the same name in the 'Mech weapon list on the same
 * page; the v4.1 worked examples do the same (a Small Laser at 9, an ER Small Laser at 17, an SRM 4 at 39 with 5 for its ammunition).
 * The Clan Bomb Rack takes the only Bomb Rack line (11), which the Clan table prints under Other Equipment, not under Battle Armor.
 * Rows with the `defensive` mark are the improved sensors, active probes and ECM: 1 point each in the suit's defensive rating.
 */
export const BATTLE_ARMOR_BV: BvGroup[] = [
  {
    // TO:AUE Inner Sphere and Clan Weapons and Equipment BV Tables [Addendum], printed pp. 195-196 (read against the page images): the BA tube artillery is 27 with 4 for its ammunition,
    // the BA LB-X autocannon 20. The mine dispenser is a minefield of its mine type (rules/munitions.ts); the boosters and drop chutes print no line.
    cite: { book: TO, page: 195 },
    checked: "page",
    rows: [["ba-tube-artillery-is", 27, 4], ["ba-lb-x-ac-clan", 20]],
  },
  {
    cite: { book: TM, page: 317 },
    checked: "page",
    rows: [
      ["ba-flamer-is", 5], ["ba-grand-mauler-gauss-rifle-is", 6, 0], ["ba-tsunami-gauss-rifle-is", 6, 0],
      ["ba-heavy-grenade-launcher-is", 2, 0], ["ba-micro-grenade-launcher-is", 1, 0],
      ["ba-light-recoilless-rifle-is", 12, 0], ["ba-medium-recoilless-rifle-is", 19, 0], ["ba-heavy-recoilless-rifle-is", 22, 0],
      ["ba-david-light-gauss-rifle-is", 7, 0], ["ba-king-david-light-gauss-rifle-is", 7, 0], ["ba-magshot-gauss-rifle-is", 15, 0],
      ["ba-firedrake-support-needler-is", 2, 0], ["ba-light-mortar-is", 9, 0], ["ba-heavy-mortar-is", 17, 0],
      ["ba-light-machine-gun-is", 5, 1], ["ba-machine-gun-is", 5, 1], ["ba-heavy-machine-gun-is", 6, 1],
      ["ba-small-laser-is", 9], ["ba-medium-laser-is", 46], ["ba-er-small-laser-is", 17], ["ba-er-medium-laser-is", 62],
      ["ba-small-pulse-laser-is", 12], ["ba-medium-pulse-laser-is", 48],
      ["ba-support-ppc-is", 14], ["ba-man-portable-plasma-rifle-is", 12, 0],
      ["ba-compact-narc-is", 16, 0], ["ba-pop-up-mine-is", 6], ["ba-magnetic-clamps-is", 1],
      ["ba-lrm-1-is", 14, 2], ["ba-lrm-2-is", 20, 3], ["ba-lrm-3-is", 29, 4], ["ba-lrm-4-is", 38, 5], ["ba-lrm-5-is", 45, 6],
      ["ba-srm-1-is", 15, 2], ["ba-srm-2-is", 21, 3], ["ba-srm-3-is", 30, 4], ["ba-srm-4-is", 39, 5], ["ba-srm-5-is", 47, 6], ["ba-srm-6-is", 59, 7],
      ["ba-mrm-1-is", 9, 1], ["ba-mrm-2-is", 13, 2], ["ba-mrm-3-is", 18, 2], ["ba-mrm-4-is", 23, 3], ["ba-mrm-5-is", 28, 4],
      ["ba-rocket-launcher-1-is", 2], ["ba-rocket-launcher-2-is", 3], ["ba-rocket-launcher-3-is", 4], ["ba-rocket-launcher-4-is", 5], ["ba-rocket-launcher-5-is", 6],
    ],
  },
  {
    // Clan Weapons and Equipment BV Table, printed p. 318.
    cite: { book: TM, page: 318 },
    checked: "page",
    rows: [
      ["ba-flamer-clan", 5], ["ba-small-laser-clan", 9], ["ba-support-ppc-clan", 14], ["ba-bearhunter-superheavy-ac-clan", 4, 0],
      ["ba-heavy-grenade-launcher-clan", 2, 0],
      ["ba-light-recoilless-rifle-clan", 12, 0], ["ba-medium-recoilless-rifle-clan", 19, 0], ["ba-heavy-recoilless-rifle-clan", 22, 0],
      ["ba-advanced-srm-1-clan", 15, 2], ["ba-advanced-srm-2-clan", 30, 4], ["ba-advanced-srm-3-clan", 45, 6],
      ["ba-advanced-srm-4-clan", 60, 8], ["ba-advanced-srm-5-clan", 75, 10], ["ba-advanced-srm-6-clan", 90, 12],
      ["ba-compact-narc-clan", 16, 0],
      ["ba-er-micro-laser-clan", 7], ["ba-er-small-laser-clan", 31], ["ba-er-medium-laser-clan", 108],
      ["ba-micro-pulse-laser-clan", 12], ["ba-small-pulse-laser-clan", 24], ["ba-medium-pulse-laser-clan", 111],
      ["ba-heavy-small-laser-clan", 15], ["ba-heavy-medium-laser-clan", 76],
      ["ba-light-machine-gun-clan", 5, 1], ["ba-machine-gun-clan", 5, 1], ["ba-heavy-machine-gun-clan", 6, 1],
      ["ba-ap-gauss-rifle-clan", 21, 3, { inert: true }], ["ba-bomb-rack-clan", 11],
      ["ba-lrm-1-clan", 17, 2], ["ba-lrm-2-clan", 24, 3], ["ba-lrm-3-clan", 34, 4], ["ba-lrm-4-clan", 46, 6], ["ba-lrm-5-clan", 55, 7],
      ["ba-srm-1-clan", 15, 2], ["ba-srm-2-clan", 21, 3], ["ba-srm-3-clan", 30, 4], ["ba-srm-4-clan", 39, 5], ["ba-srm-5-clan", 47, 6], ["ba-srm-6-clan", 59, 7],
    ],
  },
  {
    // The battle armor versions of the Tactical Operations: AUE weapons take the 'Mech weapon's line of the same name (printed pp. 194-196): the heavy flamer, ER pulse
    // lasers, variable speed pulse lasers, and the Battle Armor Taser (p. 195). The BC3 systems have no Battle Value of their own (note D, TechManual p. 317).
    cite: { book: TO, page: 195 },
    checked: "page",
    rows: [
      ["ba-heavy-flamer-is", 15], ["ba-heavy-flamer-clan", 15],
      ["ba-er-pulse-laser-small-clan", 36], ["ba-er-pulse-laser-medium-clan", 117],
      ["ba-variable-speed-laser-small-is", 22], ["ba-variable-speed-laser-medium-is", 56],
      ["ba-taser-is", 15],
    ],
  },
  {
    // Battle armor Defensive Battle Rating, step 1 (replacement text for TechManual p. 310, v4.1): 1 for each of these systems.
    cite: { book: TM_BV, page: 310 },
    checked: "page",
    rows: [
      ["ba-improved-sensors-is", 1, undefined, { defensive: true }], ["ba-active-probe-is", 1, undefined, { defensive: true }], ["ba-ecm-suite-is", 1, undefined, { defensive: true }],
      ["ba-improved-sensors-clan", 1, undefined, { defensive: true }], ["ba-active-probe-clan", 1, undefined, { defensive: true }], ["ba-ecm-suite-clan", 1, undefined, { defensive: true }],
      // The Angel ECM is factored in like an ECM suite but adds 2 (TO:AUE p. 192)
      ["ba-angel-ecm-is", 2, undefined, { defensive: true }], ["ba-angel-ecm-clan", 2, undefined, { defensive: true }],
    ],
  },
];

/** Pilot interfaces that improve the crew's skills for the BV Skill Multiplier lookup (IO:AE printed pp. 183, 189 and 190; the Technical Manual's multiplier table, p. 315
 * for the lookup). Each is a number of steps taken off the Gunnery and Piloting skills before the lookup, never below 0. An item counts once per unit however many crew
 * the cockpit seats; the pod's -2 Piloting and -1 Gunnery are the table's form of the text's flat 1.4 (conflict ruled by the book panel). */
export const SKILL_MODIFIERS: Sourced & { items: Record<string, { gunnery: number; piloting: number }>; cockpits: Record<string, { gunnery: number; piloting: number }> } = {
  cite: { book: IO, page: 190 },
  checked: "page",
  items: { "sldf-advanced-neurohelmet-mech-is": { gunnery: 0, piloting: 1 } },
  cockpits: { vrpp: { gunnery: 1, piloting: 2 } },
};
