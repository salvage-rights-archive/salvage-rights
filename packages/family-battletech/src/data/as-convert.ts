// BattleTech-to-Alpha Strike conversion tables, part one: unit type, size, movement, armor and structure. Figures and identifiers
// only, each row with the page it was read from (against the page image) and `checked: "page"`. The rules that use them are in
// rules/as-convert.ts; nothing here runs.
//
// Book: Alpha Strike Companion (ASC, 2014), "BattleTech Conversions" pp. 91-99, with its errata v1.6 (6 December 2022), which
// the book's own errata calls current for these chapters. Where the errata changes a figure the row says so in `errata`.
// The 2025 Converting Heat errata v1.3 does not touch these steps (it replaces heat only); CONV-4 reads it.

export interface AscCite {
  book: "Alpha Strike Companion";
  /** Printed page. */
  page: number;
  /** The errata entry that adds to or replaces the printed page (ASC errata v1.6). */
  errata?: "v1.6";
  checked: "page";
}
const asc = (page: number, errata?: "v1.6"): AscCite => (errata ? { book: "Alpha Strike Companion", page, errata, checked: "page" } : { book: "Alpha Strike Companion", page, checked: "page" });

/** The pages the steps read. */
export const ASC_PAGES = {
  types: asc(91),
  size: asc(92, "v1.6"),
  move: asc(92),
  moveRound: asc(93, "v1.6"),
  jump: asc(93),
  mascSupercharger: asc(94),
  penalties: asc(94),
  tmm: asc(95, "v1.6"),
  armor: asc(95),
  armorSpecial: asc(96),
  armorSpecialMore: asc(97),
  structure: asc(97),
  structureTable: asc(98),
  structureSpecial: asc(99),
} as const;

// ---- Unit type (p. 91) ---------------------------------------------------------------------------------------------------

/** Which Alpha Strike type a 'Mech record converts to, by our unit type: an OmniMech configuration is a BattleMech. */
export const TYPE_OF_MECH: { unitType: string; type: "BM" | "IM"; cite: AscCite; checked: "page" }[] = [
  { unitType: "mech", type: "BM", cite: ASC_PAGES.types, checked: "page" },
  { unitType: "omnimech", type: "BM", cite: ASC_PAGES.types, checked: "page" },
  { unitType: "industrialmech", type: "IM", cite: ASC_PAGES.types, checked: "page" },
];

// ---- Size class (p. 92, the 'Mechs, ProtoMechs and Combat Vehicles section) ----------------------------------------------------

/** A weight class: `under` is the first tonnage that no longer belongs to it (`null` for the last, open-ended one). The errata removes the
 * asterisk (the automatic LG ability) from the Superheavy row. */
export const MECH_SIZE_CLASSES: { name: string; under: number | null; size: number; cite: AscCite; checked: "page" }[] = [
  { name: "Light", under: 40, size: 1, cite: ASC_PAGES.size, checked: "page" },
  { name: "Medium", under: 60, size: 2, cite: ASC_PAGES.size, checked: "page" },
  { name: "Heavy", under: 80, size: 3, cite: ASC_PAGES.size, checked: "page" },
  // 80-100 tons inclusive: `under` 100.5 because 'Mech tonnages are whole numbers.
  { name: "Assault", under: 100.5, size: 4, cite: ASC_PAGES.size, checked: "page" },
  { name: "Superheavy", under: null, size: 4, cite: ASC_PAGES.size, checked: "page" },
];

// ---- Movement (pp. 92-95) ------------------------------------------------------------------------------------------------------

export const MOVE = {
  /** Inches of Move for each Walking MP (p. 92). */
  inchesPerMP: { value: 2, cite: ASC_PAGES.move, checked: "page" as const },
  /** After all rounding, Move that comes from Movement Points rounds up to the next multiple of this many inches (errata v1.6, p. 93). */
  roundUpTo: { value: 2, cite: ASC_PAGES.moveRound, checked: "page" as const },
  /** MASC or a supercharger multiplies the ground Move; both together multiply by `both`; the result rounds normally (p. 94). */
  boost: { one: 1.25, both: 1.5, cite: ASC_PAGES.mascSupercharger, checked: "page" as const },
  /** Movement letters of a 'Mech's modes (p. 93): none for ground, `j` for jumping, `s` for underwater maneuvering units. */
  modes: { ground: "", jump: "j", umu: "s", cite: ASC_PAGES.jump, checked: "page" as const },
  /** Walking MP taken away before converting (p. 94): hardened armor, and a medium or large BattleMech shield. */
  hardenedArmorMP: { value: 1, cite: ASC_PAGES.penalties, checked: "page" as const },
};

/** Equipment (catalog id stems, no tech base ending) that the movement step reads or cannot convert. */
export const MOVE_EQUIPMENT = {
  supercharger: ["supercharger"],
  umu: ["umu"],
  /** Jump options that page 93 gives no value for: the jump jets are all it counts. */
  unconverted: ["mechanical-jump-booster", "partial-wing"],
};

/** Target Movement Modifier by ground Move in inches (errata v1.6 inserts this table before "Converting Armor", p. 95). */
export const TMM_ROWS: { from: number; to: number | null; tmm: number; cite: AscCite; checked: "page" }[] = [
  { from: 0, to: 4, tmm: 0, cite: ASC_PAGES.tmm, checked: "page" },
  { from: 5, to: 8, tmm: 1, cite: ASC_PAGES.tmm, checked: "page" },
  { from: 9, to: 12, tmm: 2, cite: ASC_PAGES.tmm, checked: "page" },
  { from: 13, to: 18, tmm: 3, cite: ASC_PAGES.tmm, checked: "page" },
  { from: 19, to: 34, tmm: 4, cite: ASC_PAGES.tmm, checked: "page" },
  { from: 35, to: null, tmm: 5, cite: ASC_PAGES.tmm, checked: "page" },
];

// ---- Armor (pp. 95-97) -----------------------------------------------------------------------------------------------------------

/** The Alpha Strike armor value is the BattleTech armor factor (every point, front and rear) over this, rounded normally (p. 95). */
export const ARMOR_DIVISOR = { value: 30, cite: ASC_PAGES.armor, checked: "page" as const };

export interface ArmorRule {
  /** Our armor type id (`ARMOR.types` in data/chassis.ts). */
  armorType: string;
  /** The armor factor is multiplied by this before the division by 30 (1 when the book changes nothing). */
  multiplier: number;
  /** How the multiplied factor rounds before the division: not at all, up, or normally. */
  round: "none" | "up" | "normal";
  cite: AscCite;
  checked: "page";
}
const same = (armorType: string, cite: AscCite = ASC_PAGES.armorSpecial): ArmorRule => ({ armorType, multiplier: 1, round: "none", cite, checked: "page" });
/**
 * Armor types of 'Mechs. Types the book leaves unmodified (the ones that only add a special ability, or that are ordinary) multiply by 1.
 * Industrial and Primitive armor have a Barrier Armor Rating of 10 (TechManual p. 72, IO:AE p. 118), so the book's rule for a rating
 * below 10 does not apply; Commercial armor has 5 and the book gives it its own rule.
 */
export const ARMOR_RULES: ArmorRule[] = [
  same("standard", ASC_PAGES.armor),
  same("stealth"),
  same("light-ferro-fibrous", ASC_PAGES.armor),
  same("ferro-fibrous", ASC_PAGES.armor),
  same("ferro-fibrous-clan", ASC_PAGES.armor),
  same("heavy-ferro-fibrous", ASC_PAGES.armor),
  same("prototype-ferro-fibrous", ASC_PAGES.armor),
  same("anti-penetrative-ablation"),
  same("ballistic-reinforced"),
  same("heat-dissipating"),
  same("impact-resistant"),
  same("industrial", ASC_PAGES.armorSpecial),
  same("primitive", ASC_PAGES.armorSpecial),
  { armorType: "hardened", multiplier: 2, round: "none", cite: ASC_PAGES.armorSpecial, checked: "page" },
  { armorType: "ferro-lamellor", multiplier: 1.2, round: "up", cite: ASC_PAGES.armorSpecial, checked: "page" },
  { armorType: "laser-reflective", multiplier: 0.75, round: "up", cite: ASC_PAGES.armorSpecialMore, checked: "page" },
  { armorType: "laser-reflective-clan", multiplier: 0.75, round: "up", cite: ASC_PAGES.armorSpecialMore, checked: "page" },
  { armorType: "reactive", multiplier: 0.75, round: "up", cite: ASC_PAGES.armorSpecialMore, checked: "page" },
  { armorType: "reactive-clan", multiplier: 0.75, round: "up", cite: ASC_PAGES.armorSpecialMore, checked: "page" },
  { armorType: "commercial", multiplier: 0.5, round: "normal", cite: ASC_PAGES.armorSpecial, checked: "page" },
];

// ---- Structure (pp. 97-99) -------------------------------------------------------------------------------------------------------

export interface StructureEngineRow {
  /** `is` or `clan`, and the engine kind the table row names. */
  tech: "inner-sphere" | "clan";
  kind: "compact" | "standard" | "large" | "light" | "xl" | "large-xl" | "xxl" | "large-xxl";
  /** Structure by weight: 10 to 100 tons in steps of 5 (19 columns). */
  standard: number[];
  /** Structure by weight for Superheavy 'Mechs: 105 to 200 tons in steps of 5 (20 columns). */
  superheavy: number[];
  /** What else the row stands for, as the table's footnotes say (engine kinds in our own words). */
  includes?: string[];
  cite: AscCite;
  checked: "page";
}
const T = ASC_PAGES.structureTable;
const eng = (tech: StructureEngineRow["tech"], kind: StructureEngineRow["kind"], standard: number[], superheavy: number[], includes?: string[]): StructureEngineRow => ({
  tech,
  kind,
  standard,
  superheavy,
  ...(includes ? { includes } : {}),
  cite: T,
  checked: "page",
});

/** The 'Mech Structure Conversion Table (p. 98). Standard 10-100 tons, Superheavy 105-200 tons. */
export const STRUCTURE_TABLE = {
  standardTons: { from: 10, to: 100, step: 5 },
  superheavyTons: { from: 105, to: 200, step: 5 },
  rows: [
    eng("inner-sphere", "compact", [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 7, 7, 8, 8, 9, 10, 10, 10], [11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20]),
    eng("inner-sphere", "standard", [1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 8], [8, 8, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 14, 15, 15], ["ice", "combat-vehicle-fission", "combat-vehicle-fuel-cell"]),
    eng("inner-sphere", "large", [1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 6], [6, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 11, 12, 12], ["large-ice"]),
    eng("inner-sphere", "light", [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5], [5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10]),
    // The Superheavy column of this row also stands for a Large Light fusion engine (the dagger footnote); the standard columns have no such note.
    eng("inner-sphere", "xl", [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4], [5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 8, 9], ["large-light (superheavy columns only)"]),
    eng("inner-sphere", "large-xl", [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4], [4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 8]),
    eng("inner-sphere", "xxl", [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3], [3, 3, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6]),
    eng("inner-sphere", "large-xxl", [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3], [3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5]),
    eng("clan", "standard", [1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 8], [8, 8, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 14, 15, 15], ["ice", "combat-vehicle-fission", "combat-vehicle-fuel-cell"]),
    eng("clan", "xl", [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5], [5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10]),
    eng("clan", "large-xl", [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4], [5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 8, 9]),
    eng("clan", "xxl", [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4], [4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 8]),
    eng("clan", "large-xxl", [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3], [4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7]),
  ] satisfies StructureEngineRow[],
};

/** Over this engine rating a standard, XL or XXL engine is a Large one (TechManual p. 49: Large engines start above 400). */
export const LARGE_ENGINE_OVER = 400;

export interface EngineMapping {
  /** Our engine type id (`ENGINE_TYPES.types`). */
  engineType: string;
  /** Which table's technology base to read; `any` where the two bases print the same row. */
  tech: "inner-sphere" | "clan" | "any";
  kind: "compact" | "standard" | "light" | "xl" | "xxl";
  /** Set where the table's footnote names a different engine than ours, or our engine is a variant the table does not name. */
  note?: string;
  cite: AscCite;
  checked: "page";
}
/** From our engine types to the table's rows. Fuel cell and fission engines are read as the footnote's combat vehicle ones; the prototype XL
 * plays as an Inner Sphere XL (IO:AE p. 66); both are our reading, and the working says so. */
export const ENGINE_MAPPING: EngineMapping[] = [
  { engineType: "standard", tech: "any", kind: "standard", cite: T, checked: "page" },
  { engineType: "ice", tech: "any", kind: "standard", cite: T, checked: "page" },
  { engineType: "fuel-cell", tech: "any", kind: "standard", note: "read as the table's combat vehicle fuel cell footnote", cite: T, checked: "page" },
  { engineType: "fission", tech: "any", kind: "standard", note: "read as the table's combat vehicle fission footnote", cite: T, checked: "page" },
  { engineType: "compact", tech: "inner-sphere", kind: "compact", cite: T, checked: "page" },
  { engineType: "light", tech: "inner-sphere", kind: "light", cite: T, checked: "page" },
  { engineType: "xl", tech: "inner-sphere", kind: "xl", cite: T, checked: "page" },
  { engineType: "xl-clan", tech: "clan", kind: "xl", cite: T, checked: "page" },
  { engineType: "prototype-xl", tech: "inner-sphere", kind: "xl", note: "played as an Inner Sphere XL engine", cite: T, checked: "page" },
  { engineType: "xxl", tech: "inner-sphere", kind: "xxl", cite: T, checked: "page" },
  { engineType: "xxl-clan", tech: "clan", kind: "xxl", cite: T, checked: "page" },
];

/** Special structure types: the table value is multiplied, then rounded up (p. 99). Every other structure type leaves it as it is. */
export const STRUCTURE_RULES: { structure: string; multiplier: number; cite: AscCite; checked: "page" }[] = [
  { structure: "composite", multiplier: 0.5, cite: ASC_PAGES.structureSpecial, checked: "page" },
  { structure: "reinforced", multiplier: 2, cite: ASC_PAGES.structureSpecial, checked: "page" },
];

// ==== Part two: weapon damage by range ===========================================================================================
//
// "Converting Weapons" (ASC pp. 99-103) and the Alpha Strike Weapon Conversion Tables (pp. 104-110), with errata v1.6 (6 December 2022)
// and the 2025 Converting Heat errata v1.3 where it touches the damage subtotal. The table rows below were read from the page images
// (the text layer of these pages has its columns run together), and the errata's replacement values are applied in place: a row the
// errata changed carries `errata: "v1.6"` and the value after the change. Heat is kept as the table prints it for the heat step that
// follows; nothing in this part uses it. The slash values of the missile launchers are, left to right, the damage without a fire-control
// system, with Artemis IV (or Apollo for the MRMs) and, for Clan launchers, with Artemis V.

export const WEAPON_PAGES = {
  general: asc(99, "v1.6"),
  arcs: asc(100, "v1.6"),
  mixedTech: asc(101),
  tablesIntro: asc(101, "v1.6"),
  ammunition: asc(101, "v1.6"),
  targeting: asc(101, "v1.6"),
  missiles: asc(101),
  physical: asc(101),
  artillery: asc(101),
  other: asc(101),
  mel: asc(127),
} as const;

/** A damage figure at one range bracket: a number, the slash values of a missile launcher, or `null` where the table prints a dash. */
export type DamageValue = number | readonly number[] | null;

export interface AsWeaponRow {
  /** The technology base of the table the row is in. */
  tech: "is" | "clan";
  /** The table section the row is in: direct-fire ballistic, direct-fire energy or missile weapons. */
  section: "ballistic" | "energy" | "missile";
  /** The weapon's name as the table prints it (without the one-shot asterisk). */
  name: string;
  heat: number;
  short: DamageValue;
  medium: DamageValue;
  long: DamageValue;
  extreme: DamageValue;
  /** The TC column: the weapon is compatible with a targeting computer. */
  tc: boolean;
  /** The Notes column. */
  notes: string[];
  /** The table's printed page, with `errata` where the errata v1.6 changed or added the row. */
  cite: AscCite;
  checked: "page";
}

const row = (
  tech: AsWeaponRow["tech"],
  section: AsWeaponRow["section"],
  name: string,
  heat: number,
  short: DamageValue,
  medium: DamageValue,
  long: DamageValue,
  extreme: DamageValue,
  tc: boolean,
  notes: string[],
  page: number,
  errata = false,
): AsWeaponRow => ({ tech, section, name, heat, short, medium, long, extreme, tc, notes, cite: asc(page, errata ? "v1.6" : undefined), checked: "page" });

/** Every row of the Inner Sphere and Clan standard weapon tables (pp. 104-110), in the book's order, with the errata applied. Rows that
 * are in the book only for other kinds of unit (battle armor, capital and artillery tables) are not here. */
export const AS_WEAPON_TABLE: AsWeaponRow[] = [
  row("is", "ballistic", "Thumper Artillery Cannon", 5, 0.375, 0.5, null, null, false, ["ART-TC"], 104),
  row("is", "ballistic", "Sniper Artillery Cannon", 10, 0.83, 1, null, null, false, ["ART-SC"], 104),
  row("is", "ballistic", "Long Tom Artillery Cannon", 20, 1.32, 3, 3, null, false, ["ART-LTC"], 104),
  row("is", "ballistic", "Autocannon/2", 1, 0.132, 0.2, 0.2, 0.2, true, ["AC"], 104),
  row("is", "ballistic", "Autocannon/5", 1, 0.375, 0.5, 0.5, null, true, ["AC"], 104),
  row("is", "ballistic", "Autocannon/10", 3, 1, 1, null, null, true, ["AC"], 104),
  row("is", "ballistic", "Autocannon/20", 7, 2, 2, null, null, true, ["AC"], 104),
  row("is", "ballistic", "Fluid Gun (w/ Corrosive Ammo only)", 0, 0.4, null, null, null, false, [], 104),
  row("is", "ballistic", "Light Gauss Rifle", 1, 0.6, 0.8, 0.8, 0.8, true, [], 104),
  row("is", "ballistic", "Gauss Rifle", 1, 1.245, 1.5, 1.5, null, true, [], 104),
  row("is", "ballistic", "Heavy Gauss Rifle", 2, 1.65, 2, 1, null, true, [], 104),
  row("is", "ballistic", "Improved Heavy Gauss Rifle", 2, 1.65, 2.2, 2.2, null, true, [], 104),
  row("is", "ballistic", "MagShot Gauss Rifle", 1, 0.2, 0.2, null, null, true, [], 104),
  row("is", "ballistic", "Silver Bullet Gauss Rifle", 1, 0.784, 0.945, 0.945, null, true, ["Flak"], 104),
  row("is", "ballistic", "Hyper-Velocity AC/2", 1, 0.15, 0.2, 0.2, 0.2, true, [], 104),
  row("is", "ballistic", "Hyper-Velocity AC/5", 3, 0.5, 0.5, 0.5, 0.5, true, [], 104),
  row("is", "ballistic", "Hyper-Velocity AC/10", 7, 1, 1, 1, 0, true, [], 104, true),
  row("is", "ballistic", "LB 2-X Autocannon", 1, 0.069, 0.105, 0.105, 0.105, true, ["Flak"], 104),
  row("is", "ballistic", "LB 5-X Autocannon", 1, 0.236, 0.315, 0.315, null, true, ["Flak"], 104),
  row("is", "ballistic", "LB 10-X Autocannon", 2, 0.63, 0.63, 0.63, null, true, ["Flak"], 104),
  row("is", "ballistic", "LB 20-X Autocannon", 6, 1.26, 1.26, null, null, true, ["Flak"], 104),
  row("is", "ballistic", "Light Autocannon/2", 1, 0.2, 0.2, 0.2, null, true, ["AC"], 104),
  row("is", "ballistic", "Light Autocannon/5", 1, 0.5, 0.5, null, null, true, ["AC"], 104),
  row("is", "ballistic", "Light Machine Gun", 0, 0.1, 0.1, null, null, false, ["Point Defense"], 104),
  row("is", "ballistic", "Machine Gun", 0, 0.2, null, null, null, false, ["Point Defense"], 104),
  row("is", "ballistic", "Heavy Machine Gun", 0, 0.3, null, null, null, false, ["Point Defense"], 104),
  row("is", "ballistic", "Nail Gun/Rivet Gun", 0, 0.05, null, null, null, false, [], 104),
  row("is", "ballistic", "Light Rifle", 1, 0.3, 0.3, null, null, true, [], 104),
  row("is", "ballistic", "Medium Rifle", 2, 0.552, 0.6, null, null, true, [], 104),
  row("is", "ballistic", "Heavy Rifle", 4, 0.747, 0.9, 0.9, null, true, [], 104),
  row("is", "ballistic", "Rotary Autocannon/2", 6, 0.8, 0.8, 0.8, null, true, [], 104),
  row("is", "ballistic", "Rotary Autocannon/5", 6, 2, 2, null, null, true, [], 104),
  row("is", "ballistic", "Ultra Autocannon/2", 2, 0.225, 0.3, 0.3, 0.3, true, [], 104),
  row("is", "ballistic", "Ultra Autocannon/5", 2, 0.623, 0.75, 0.75, null, true, [], 104),
  row("is", "ballistic", "Ultra Autocannon/10", 8, 1.5, 1.5, 1.5, null, true, [], 104),
  row("is", "ballistic", "Ultra Autocannon/20", 16, 3, 3, null, null, true, [], 104),
  row("is", "ballistic", "Primitive Prototype AC/2", 1, 0.132, 0.2, 0.2, 0.2, false, ["AC"], 104),
  row("is", "ballistic", "Primitive Prototype AC/5", 1, 0.375, 0.5, 0.5, null, false, ["AC"], 104),
  row("is", "ballistic", "Primitive Prototype AC/10", 3, 1, 1, null, null, false, ["AC"], 104),
  row("is", "ballistic", "Primitive Prototype AC/20", 7, 2, 2, null, null, false, ["AC"], 104),
  row("is", "ballistic", "Prototype LB 10-X Autocannon", 2, 0.63, 0.63, 0.63, null, false, ["Flak"], 105),
  row("is", "ballistic", "Prototype LB 10-X Autocannon (3030)", 2, 0.63, 0.63, 0.63, null, true, ["Flak"], 105),
  row("is", "ballistic", "Prototype Gauss Rifle", 1, 1.245, 1.5, 1.5, null, false, [], 105),
  row("is", "ballistic", "Prototype Gauss Rifle (3038)", 1, 1.245, 1.5, 1.5, null, true, [], 105),
  row("is", "ballistic", "Prototype Ultra Autocannon/5", 2, 0.623, 0.75, 0.75, null, true, [], 105),
  row("is", "energy", "ER Large Laser", 12, 0.8, 0.8, 0.8, null, true, [], 105),
  row("is", "energy", "ER Medium Laser", 5, 0.5, 0.5, null, null, true, [], 105),
  row("is", "energy", "ER Small Laser", 2, 0.3, 0.3, null, null, true, ["Point Defense"], 105),
  row("is", "energy", "Binary Laser Cannon", 16, 1.2, 1.2, null, null, true, [], 105),
  row("is", "energy", "Bombast Laser", 12, 1.02, 1.02, null, null, true, [], 105),
  row("is", "energy", "Flamer", 3, 0.2, null, null, null, false, ["Heat","Point Defense"], 105),
  row("is", "energy", "Flamer (Vehicle)", 3, 0.2, null, null, null, false, ["Heat","Point Defense"], 105),
  row("is", "energy", "Heavy Flamer", 5, 0.4, 0.4, null, null, false, ["Heat"], 105),
  row("is", "energy", "ER Flamer", 4, 0.2, 0.2, null, null, false, ["Heat","Point Defense"], 105, true),
  row("is", "energy", "Large Laser", 8, 0.8, 0.8, null, null, true, [], 105),
  row("is", "energy", "Medium Laser", 3, 0.5, 0.5, null, null, true, [], 105),
  row("is", "energy", "Small Laser", 1, 0.3, null, null, null, true, ["Point Defense"], 105),
  row("is", "energy", "Plasma Rifle", 10, 1, 1, null, null, true, ["Heat"], 105),
  row("is", "energy", "Light PPC", 5, 0.375, 0.5, 0.5, null, true, [], 105),
  row("is", "energy", "PPC", 10, 0.75, 1, 1, null, true, [], 105),
  row("is", "energy", "Heavy PPC", 15, 1.125, 1.5, 1.5, null, true, [], 105),
  row("is", "energy", "ER PPC", 15, 1, 1, 1, null, true, [], 105),
  row("is", "energy", "Snub-Nose PPC", 10, 1, 0.65, null, null, true, [], 105),
  row("is", "energy", "Light PPC w/ Capacitor", 5, 0.375, 0.5, 0.5, null, true, [], 105),
  row("is", "energy", "PPC w/ Capacitor", 10, 0.563, 0.75, 0.75, null, true, [], 105),
  row("is", "energy", "Heavy PPC w/ Capacitor", 15, 0.75, 1, 1, null, true, [], 105),
  row("is", "energy", "ER PPC w/ Capacitor", 15, 0.75, 0.75, 0.75, null, true, [], 105),
  row("is", "energy", "Snub-Nose PPC w/ Capacitor", 10, 0.75, 0.5, null, null, true, [], 105),
  row("is", "energy", "Large Pulse Laser", 10, 0.99, 0.99, null, null, true, [], 105),
  row("is", "energy", "Medium Pulse Laser", 4, 0.66, 0.66, null, null, true, [], 105),
  row("is", "energy", "Small Pulse Laser", 2, 0.33, null, null, null, true, ["Point Defense"], 105, true),
  row("is", "energy", "Large Variable-Speed Pulse Laser", 14, 1.265, 0.863, null, null, true, [], 105),
  row("is", "energy", "Med. Variable Speed-Pulse Laser", 6, 1.035, 0.648, null, null, true, [], 105),
  row("is", "energy", "Small Variable-Speed Pulse Laser", 3, 0.575, 0.378, null, null, true, [], 105),
  row("is", "energy", "Large X-Pulse Laser", 14, 0.99, 0.99, null, null, true, [], 105),
  row("is", "energy", "Medium X-Pulse Laser", 6, 0.66, 0.66, null, null, true, [], 105),
  row("is", "energy", "Small X-Pulse Laser", 3, 0.33, 0.33, null, null, true, ["Point Defense"], 105),
  row("is", "energy", "Primitive Prototype Large Laser", 12, 0.8, 0.8, null, null, false, [], 106),
  row("is", "energy", "Primitive Prototype Medium Laser", 5, 0.5, 0.5, null, null, false, [], 106),
  row("is", "energy", "Primitive Prototype Small Laser", 2, 0.3, null, null, null, false, ["Point Defense"], 106),
  row("is", "energy", "Primitive Prototype PPC", 15, 0.75, 1, 1, null, false, [], 106),
  row("is", "energy", "Prototype Large Pulse Laser", 13, 0.945, 0.945, null, null, false, [], 106),
  row("is", "energy", "Prototype Medium Pulse Laser", 7, 0.63, 0.63, null, null, false, [], 106),
  row("is", "energy", "Prototype Small Pulse Laser", 4, 0.315, null, null, null, false, [], 106),
  row("is", "energy", "Prototype ER Large Laser", 18, 0.76, 0.76, 0.76, null, true, [], 106),
  row("is", "energy", "Prototype Med. Pulse Laser (3031)", 7, 0.66, 0.66, null, null, true, [], 106),
  row("is", "energy", "Large Re-Engineered Laser", 9, 0.945, 0.945, null, null, true, ["REL"], 106, true),
  row("is", "energy", "Medium Re-Engineered Laser", 6, 0.63, 0.63, null, null, true, ["REL"], 106, true),
  row("is", "energy", "Small Re-Engineered Laser", 4, 0.42, null, null, null, true, ["REL","Point Defense"], 106, true),
  row("is", "energy", "ER Large Laser w/ Laser Pulse Module", 14, 0.84, 0.84, 0.84, null, true, [], 106),
  row("is", "energy", "ER Medium Laser w/ Laser Pulse Module", 7, 0.525, 0.525, null, null, true, [], 106),
  row("is", "energy", "ER Small Laser w/ Laser Pulse Module", 4, 0.315, 0.315, null, null, true, ["Point Defense"], 106),
  row("is", "energy", "Large Laser w/ Laser Pulse Module", 10, 0.84, 0.84, null, null, true, [], 106),
  row("is", "energy", "Medium Laser w/ Laser Pulse Module", 5, 0.525, 0.525, null, null, true, [], 106),
  row("is", "energy", "Small Laser w/ Laser Pulse Module", 3, 0.315, null, null, null, true, ["Point Defense"], 106),
  row("is", "energy", "RISC Hyper Laser", 24, 2, 2, 2, 2, true, [], 106),
  row("is", "missile", "LRM 5", 2, [0.15, 0.2], [0.3, 0.4], [0.3, 0.4], null, false, ["LRM","Indirect Fire"], 106),
  row("is", "missile", "LRM 10", 4, [0.3, 0.4], [0.6, 0.8], [0.6, 0.8], null, false, ["LRM","Indirect Fire"], 106),
  row("is", "missile", "LRM 15", 5, [0.45, 0.6], [0.9, 1.2], [0.9, 1.2], null, false, ["LRM","Indirect Fire"], 106),
  row("is", "missile", "LRM 20", 6, [0.6, 0.8], [1.2, 1.6], [1.2, 1.6], null, false, ["LRM","Indirect Fire"], 106),
  row("is", "missile", "Enhanced LRM 5", 2, [0.225, 0.3], [0.3, 0.4], [0.3, 0.4], null, false, ["LRM","Indirect Fire"], 106),
  row("is", "missile", "Enhanced LRM 10", 4, [0.45, 0.6], [0.6, 0.8], [0.6, 0.8], null, false, ["LRM","Indirect Fire"], 106),
  row("is", "missile", "Enhanced LRM 15", 5, [0.675, 0.9], [0.9, 1.2], [0.9, 1.2], null, false, ["LRM","Indirect Fire"], 106),
  row("is", "missile", "Enhanced LRM 20", 6, [0.9, 1.2], [1.2, 1.6], [1.2, 1.6], null, false, ["LRM","Indirect Fire"], 106),
  row("is", "missile", "Extended LRM 5", 3, 0.1, 0.3, 0.3, 0.3, false, ["Indirect Fire"], 106),
  row("is", "missile", "Extended LRM 10", 6, 0.15, 0.6, 0.6, 0.6, false, ["Indirect Fire"], 106),
  row("is", "missile", "Extended LRM 15", 8, 0.25, 0.9, 0.9, 0.9, false, ["Indirect Fire"], 106),
  row("is", "missile", "Extended LRM 20", 12, 0.3, 1.2, 1.2, 1.2, false, ["Indirect Fire"], 106),
  row("is", "missile", "'Mech Mortar-1", 1, 0.085, 0.17, 0.17, null, false, ["Indirect Fire"], 106),
  row("is", "missile", "'Mech Mortar-2", 2, 0.085, 0.17, 0.17, null, false, ["Indirect Fire"], 106),
  row("is", "missile", "'Mech Mortar-4", 5, 0.255, 0.51, 0.51, null, false, ["Indirect Fire"], 106),
  row("is", "missile", "'Mech Mortar-8", 10, 0.425, 0.85, 0.85, null, false, ["Indirect Fire"], 107),
  row("is", "missile", "MML 3", 2, [0.4, 0.4], [0.3, 0.3], [0.2, 0.2], null, false, ["LRM","SRM","Indirect Fire"], 107),
  row("is", "missile", "MML 5", 3, [0.6, 0.8], [0.45, 0.6], [0.3, 0.4], null, false, ["LRM","SRM","Indirect Fire"], 107),
  row("is", "missile", "MML 7", 4, [0.8, 1.2], [0.6, 0.9], [0.4, 0.6], null, false, ["LRM","SRM","Indirect Fire"], 107),
  row("is", "missile", "MML 9", 5, [1, 1.4], [0.75, 1.05], [0.5, 0.7], null, false, ["LRM","SRM","Indirect Fire"], 107),
  row("is", "missile", "MRM 10", 5, [0.57, 0.6], [0.57, 0.6], null, null, false, [], 107),
  row("is", "missile", "MRM 20", 6, [1.14, 1.2], [1.14, 1.2], null, null, false, [], 107),
  row("is", "missile", "MRM 30", 10, [1.71, 1.8], [1.71, 1.8], null, null, false, [], 107),
  row("is", "missile", "MRM 40", 12, [2.28, 2.4], [2.28, 2.4], null, null, false, [], 107, true),
  row("is", "missile", "Rocket Launcher 10", 3, 0.06, 0.06, 0.06, null, false, [], 107),
  row("is", "missile", "Rocket Launcher 15", 4, 0.09, 0.09, null, null, false, [], 107),
  row("is", "missile", "Rocket Launcher 20", 5, 0.12, 0.12, null, null, false, [], 107),
  row("is", "missile", "SRM 2", 2, [0.2, 0.4], [0.2, 0.4], null, null, false, ["SRM"], 107),
  row("is", "missile", "SRM 4", 3, [0.6, 0.6], [0.6, 0.6], null, null, false, ["SRM"], 107),
  row("is", "missile", "SRM 6", 4, [0.8, 1], [0.8, 1], null, null, false, ["SRM"], 107),
  row("is", "missile", "Streak SRM 2", 2, 0.4, 0.4, null, null, false, [], 107),
  row("is", "missile", "Streak SRM 4", 3, 0.8, 0.8, null, null, false, [], 107),
  row("is", "missile", "Streak SRM 6", 4, 1.2, 1.2, null, null, false, [], 107),
  row("is", "missile", "Thunderbolt 5", 3, 0.29, 0.5, 0.5, null, false, ["Indirect Fire"], 107),
  row("is", "missile", "Thunderbolt 10", 5, 0.58, 1, 1, null, false, ["Indirect Fire"], 107),
  row("is", "missile", "Thunderbolt 15", 7, 0.87, 1.5, 1.5, null, false, ["Indirect Fire"], 107),
  row("is", "missile", "Thunderbolt 20", 8, 1.16, 2, 2, null, false, ["Indirect Fire"], 107),
  row("is", "missile", "Primitive Prototype LRM 5", 2, 0.15, 0.3, 0.3, null, false, ["LRM","Indirect Fire"], 107),
  row("is", "missile", "Primitive Prototype LRM 10", 4, 0.3, 0.6, 0.6, null, false, ["LRM","Indirect Fire"], 107),
  row("is", "missile", "Primitive Prototype LRM 15", 5, 0.45, 0.9, 0.9, null, false, ["LRM","Indirect Fire"], 107),
  row("is", "missile", "Primitive Prototype LRM 20", 6, 0.6, 1.2, 1.2, null, false, ["LRM","Indirect Fire"], 107),
  row("is", "missile", "Primitive Prototype SRM 2", 2, 0.2, 0.2, null, null, false, ["SRM"], 107),
  row("is", "missile", "Primitive Prototype SRM 4", 3, 0.4, 0.4, null, null, false, ["SRM"], 107),
  row("is", "missile", "Primitive Prototype SRM 6", 4, 0.6, 0.6, null, null, false, ["SRM"], 107),
  row("is", "missile", "Prototype Rocket Launcher 10", 3, 0.06, 0.06, 0.06, null, false, [], 107),
  row("is", "missile", "Prototype Rocket Launcher 15", 4, 0.09, 0.09, null, null, false, [], 107),
  row("is", "missile", "Prototype Rocket Launcher 20", 5, 0.12, 0.12, null, null, false, [], 107),
  row("clan", "ballistic", "LB 2-X Autocannon", 1, 0.069, 0.105, 0.105, 0.105, true, ["Flak"], 108),
  row("clan", "ballistic", "LB 5-X Autocannon", 1, 0.236, 0.315, 0.315, null, true, ["Flak"], 108),
  row("clan", "ballistic", "LB 10-X Autocannon", 2, 0.63, 0.63, 0.63, null, true, ["Flak"], 108),
  row("clan", "ballistic", "LB 20-X Autocannon", 6, 1.26, 1.26, null, null, true, ["Flak"], 108),
  row("clan", "ballistic", "Fluid Gun (w/ Corrosive Ammo only)", 0, 0.4, null, null, null, false, [], 108),
  row("clan", "ballistic", "AP Gauss Rifle", 1, 0.3, 0.3, null, null, true, [], 108),
  row("clan", "ballistic", "Gauss Rifle", 1, 1.245, 1.5, 1.5, null, true, [], 108),
  row("clan", "ballistic", "Hyper-Assault Gauss (HAG) 20", 4, 1.328, 1.2, 1.2, null, true, ["Flak"], 108),
  row("clan", "ballistic", "Hyper-Assault Gauss (HAG) 30", 6, 1.992, 1.8, 1.8, null, true, ["Flak"], 108),
  row("clan", "ballistic", "Hyper-Assault Gauss (HAG) 40", 8, 2.656, 2.4, 2.4, null, true, ["Flak"], 108),
  row("clan", "ballistic", "Light Machine Gun", 0, 0.1, 0.1, null, null, false, ["Point Defense"], 108),
  row("clan", "ballistic", "Machine Gun", 0, 0.2, null, null, null, false, ["Point Defense"], 108),
  row("clan", "ballistic", "Heavy Machine Gun", 0, 0.3, null, null, null, false, ["Point Defense"], 108),
  row("clan", "ballistic", "Nail Gun/Rivet Gun", 0, 0.05, null, null, null, false, [], 108),
  row("clan", "ballistic", "ProtoMech Autocannon/2", 1, 0.2, 0.2, 0.2, null, true, ["AC"], 108),
  row("clan", "ballistic", "ProtoMech Autocannon/4", 1, 0.4, 0.4, null, null, true, ["AC"], 108),
  row("clan", "ballistic", "ProtoMech Autocannon/8", 2, 0.8, 0.8, null, null, true, ["AC"], 108),
  row("clan", "ballistic", "Rotary Autocannon/2", 6, 0.8, 0.8, 0.8, 0.8, true, [], 108),
  row("clan", "ballistic", "Rotary Autocannon/5", 6, 2, 2, 2, null, true, [], 108),
  row("clan", "ballistic", "Ultra Autocannon/2", 2, 0.249, 0.3, 0.3, 0.3, true, [], 108),
  row("clan", "ballistic", "Ultra Autocannon/5", 2, 0.75, 0.75, 0.75, null, true, [], 108),
  row("clan", "ballistic", "Ultra Autocannon/10", 6, 1.5, 1.5, 1.5, null, true, [], 108),
  row("clan", "ballistic", "Ultra Autocannon/20", 14, 3, 3, null, null, true, [], 108),
  row("clan", "ballistic", "Improved Autocannon/2", 1, 0.132, 0.2, 0.2, 0.2, true, ["AC"], 108),
  row("clan", "ballistic", "Improved Autocannon/5", 1, 0.375, 0.5, 0.5, null, true, ["AC"], 108),
  row("clan", "ballistic", "Improved Autocannon/10", 3, 1, 1, null, null, true, ["AC"], 108),
  row("clan", "ballistic", "Improved Autocannon/20", 7, 2, 2, null, null, true, ["AC"], 108),
  row("clan", "ballistic", "Improved Gauss Rifle", 1, 1.245, 1.5, 1.5, null, true, [], 108),
  row("clan", "ballistic", "Prototype LB 2-X Autocannon", 1, 0.069, 0.105, 0.105, 0.105, true, ["Flak"], 108),
  row("clan", "ballistic", "Prototype LB 5-X Autocannon", 1, 0.236, 0.3, 0.3, null, true, ["Flak"], 108),
  row("clan", "ballistic", "Prototype LB 20-X Autocannon", 6, 1.26, 1.26, null, null, true, ["Flak"], 108),
  row("clan", "ballistic", "Prototype Ultra Autocannon/2", 2, 0.225, 0.3, 0.3, 0.3, true, [], 108),
  row("clan", "ballistic", "Prototype Ultra Autocannon/10", 8, 1.5, 1.5, 1.5, null, true, [], 108),
  row("clan", "ballistic", "Prototype Ultra Autocannon/20", 16, 3, 3, null, null, true, [], 108),
  row("clan", "energy", "Large Chemical Laser", 6, 0.8, 0.8, null, null, true, [], 109),
  row("clan", "energy", "Medium Chemical Laser", 2, 0.5, 0.5, null, null, true, [], 109),
  row("clan", "energy", "Small Chemical Laser", 1, 0.3, null, null, null, true, ["Point Defense"], 109),
  row("clan", "energy", "ER Large Laser", 12, 1, 1, 1, 1, true, [], 109),
  row("clan", "energy", "ER Medium Laser", 5, 0.7, 0.7, null, null, true, [], 109),
  row("clan", "energy", "ER Small Laser", 2, 0.5, 0.5, null, null, true, ["Point Defense"], 109),
  row("clan", "energy", "ER Micro Laser", 1, 0.2, null, null, null, true, ["Point Defense"], 109),
  row("clan", "energy", "Large ER Pulse Laser", 13, 1.05, 1.05, 1.05, null, true, [], 109),
  row("clan", "energy", "Medium ER Pulse Laser", 6, 0.735, 0.735, null, null, true, [], 109),
  row("clan", "energy", "Small ER Pulse Laser", 3, 0.525, 0.525, null, null, true, [], 109),
  row("clan", "energy", "Flamer", 3, 0.2, null, null, null, false, ["Heat","Point Defense"], 109),
  row("clan", "energy", "Flamer (Vehicle)", 3, 0.2, null, null, null, false, ["Heat","Point Defense"], 109),
  row("clan", "energy", "Heavy Large Laser", 18, 1.52, 1.52, null, null, true, [], 109),
  row("clan", "energy", "Heavy Medium Laser", 7, 0.95, 0.95, null, null, true, [], 109),
  row("clan", "energy", "Heavy Small Laser", 3, 0.57, null, null, null, true, ["Point Defense"], 109),
  row("clan", "energy", "Improved Heavy Large Laser", 18, 1.6, 1.6, null, null, true, [], 109),
  row("clan", "energy", "Improved Heavy Medium Laser", 7, 1, 1, null, null, true, [], 109),
  row("clan", "energy", "Improved Heavy Small Laser", 3, 0.6, null, null, null, true, [], 109),
  row("clan", "energy", "Plasma Cannon", 7, 0, 0, 0, null, true, ["Heat"], 109),
  row("clan", "energy", "ER PPC", 15, 1.5, 1.5, 1.5, null, true, [], 109),
  row("clan", "energy", "Large Pulse Laser", 10, 1.1, 1.1, 1.1, null, true, [], 109),
  row("clan", "energy", "Medium Pulse Laser", 4, 0.77, 0.77, null, null, true, [], 109),
  row("clan", "energy", "Small Pulse Laser", 2, 0.33, 0.33, null, null, true, [], 109),
  row("clan", "energy", "Micro Pulse Laser", 1, 0.33, null, null, null, true, ["Point Defense"], 109),
  row("clan", "energy", "Prototype ER Medium Laser", 5, 0.5, 0.5, null, null, true, [], 109),
  row("clan", "energy", "Prototype ER Small Laser", 2, 0.3, 0.3, null, null, true, ["Point Defense"], 109),
  row("clan", "energy", "Improved Large Laser", 8, 0.8, 0.8, null, null, true, [], 109),
  row("clan", "energy", "Improved Large Pulse Laser", 10, 0.99, 0.99, null, null, true, [], 109),
  row("clan", "energy", "Improved PPC", 10, 0.75, 1, 1, null, true, [], 109),
  row("clan", "energy", "Enhanced PPC", 15, 1.2, 1.2, 1.2, null, true, [], 109),
  row("clan", "energy", "ER PPC w/ Capacitor", 15, 1, 1, 1, null, true, [], 109),
  row("clan", "missile", "ATM 3", 2, 0.6, 0.4, 0.2, 0.2, false, [], 109),
  row("clan", "missile", "ATM 6", 4, 1.5, 1, 0.5, 0.5, false, [], 109),
  row("clan", "missile", "ATM 9", 6, 2.1, 1.4, 0.7, 0.7, false, [], 109),
  row("clan", "missile", "ATM 12", 8, 3, 2, 1, 1, false, [], 109),
  row("clan", "missile", "LRM 5", 2, [0.3, 0.4, 0.42], [0.3, 0.4, 0.42], [0.3, 0.4, 0.42], null, false, ["LRM","Indirect Fire"], 109),
  row("clan", "missile", "LRM 10", 4, [0.6, 0.8, 0.84], [0.6, 0.8, 0.84], [0.6, 0.8, 0.84], null, false, ["LRM","Indirect Fire"], 109),
  row("clan", "missile", "LRM 15", 5, [0.9, 1.2, 1.26], [0.9, 1.2, 1.26], [0.9, 1.2, 1.26], null, false, ["LRM","Indirect Fire"], 109),
  row("clan", "missile", "LRM 20", 6, [1.2, 1.6, 1.68], [1.2, 1.6, 1.68], [1.2, 1.6, 1.68], null, false, ["LRM","Indirect Fire"], 109),
  row("clan", "missile", "'Mech Mortar-1", 1, 0.085, 0.17, 0.17, null, false, ["Indirect Fire"], 110),
  row("clan", "missile", "'Mech Mortar-2", 2, 0.085, 0.17, 0.17, null, false, ["Indirect Fire"], 110),
  row("clan", "missile", "'Mech Mortar-4", 5, 0.255, 0.51, 0.51, null, false, ["Indirect Fire"], 110),
  row("clan", "missile", "'Mech Mortar-8", 10, 0.425, 0.85, 0.85, null, false, ["Indirect Fire"], 110),
  row("clan", "missile", "SRM 2", 2, [0.2, 0.4, 0.42], [0.2, 0.4, 0.42], null, null, false, ["SRM"], 110),
  row("clan", "missile", "SRM 4", 3, [0.6, 0.6, 0.63], [0.6, 0.6, 0.63], null, null, false, ["SRM"], 110, true),
  row("clan", "missile", "SRM 6", 4, [0.8, 1, 1.05], [0.8, 1, 1.05], null, null, false, ["SRM"], 110),
  row("clan", "missile", "Streak LRM 5", 2, 0.5, 0.5, 0.5, null, false, [], 110, true),
  row("clan", "missile", "Streak LRM 10", 4, 1, 1, 1, null, false, [], 110),
  row("clan", "missile", "Streak LRM 15", 5, 1.5, 1.5, 1.5, null, false, [], 110),
  row("clan", "missile", "Streak LRM 20", 6, 2, 2, 2, null, false, [], 110),
  row("clan", "missile", "Streak LRM (ProtoMech, per tube)", 1, 0.1, 0.1, 0.1, null, false, [], 110),
  row("clan", "missile", "Streak SRM 2", 2, 0.4, 0.4, null, null, false, [], 110),
  row("clan", "missile", "Streak SRM 4", 3, 0.8, 0.8, null, null, false, [], 110),
  row("clan", "missile", "Streak SRM 6", 4, 1.2, 1.2, null, null, false, [], 110),
  row("clan", "missile", "Fusillade Launcher", 0, 0.45, 0.3, null, null, false, ["IATM"], 110),
  row("clan", "missile", "Improved LRM 5", 2, [0.15, 0.2], [0.3, 0.4], [0.3, 0.4], null, false, ["Indirect Fire"], 110),
  row("clan", "missile", "Improved LRM 10", 4, [0.3, 0.4], [0.6, 0.8], [0.6, 0.8], null, false, ["Indirect Fire"], 110),
  row("clan", "missile", "Improved LRM 15", 5, [0.45, 0.6], [0.9, 1.2], [0.9, 1.2], null, false, ["Indirect Fire"], 110),
  row("clan", "missile", "Improved LRM 20", 6, [0.6, 0.8], [1.2, 1.6], [1.2, 1.6], null, false, ["Indirect Fire"], 110),
  row("clan", "missile", "Improved SRM 2", 2, [0.2, 0.4], [0.2, 0.4], null, null, false, [], 110),
  row("clan", "missile", "Improved SRM 4", 3, [0.6, 0.6], [0.6, 0.6], null, null, false, [], 110),
  row("clan", "missile", "Improved SRM 6", 4, [0.8, 1], [0.8, 1], null, null, false, [], 110),
  row("clan", "missile", "Prototype Streak SRM 4", 3, 0.84, 0.84, null, null, false, [], 110),
  row("clan", "missile", "Prototype Streak SRM 6", 4, 1.26, 1.26, null, null, false, [], 110),
  row("clan", "missile", "Improved ATM 3", 2, 0.9, 0.6, 0.3, 0.3, false, ["IATM"], 110),
  row("clan", "missile", "Improved ATM 6", 4, 1.8, 1.2, 0.6, 0.6, false, ["IATM"], 110, true),
  row("clan", "missile", "Improved ATM 9", 6, 2.7, 1.8, 0.9, 0.9, false, ["IATM"], 110),
  row("clan", "missile", "Improved ATM 12", 8, 3.6, 2.4, 1.2, 1.2, false, ["IATM"], 110),
  row("is", "ballistic", "'Mech Taser", 6, 0.1, null, null, null, false, ["Taser"], 104, true),
  row("clan", "energy", "Heavy Flamer", 5, 0.4, 0.4, null, null, false, ["Heat"], 109, true),
  row("clan", "energy", "ER Flamer", 4, 0.2, 0.2, null, null, false, ["Heat","Point Defense"], 109, true),];

// ---- From our catalog to the table (names and kinds) ------------------------------------------------------------------------------

const ISN = (map: Record<string, string>) => Object.entries(map).map(([id, name]) => ({ id, tech: "is" as const, name }));
const CLN = (map: Record<string, string>) => Object.entries(map).map(([id, name]) => ({ id, tech: "clan" as const, name }));
const SIZES = ["small", "medium", "large"] as const;
const sizeNames = (id: (s: string) => string, name: (s: string) => string): Record<string, string> => Object.fromEntries(SIZES.map((s) => [id(s), name(s[0]!.toUpperCase() + s.slice(1))]));
const counts = (ids: (n: number) => string, name: (n: number) => string, ns: number[]): Record<string, string> => Object.fromEntries(ns.map((n) => [ids(n), name(n)]));

/** Our catalog's weapon ids, each to the name of its row in the table of the id's own technology base. */
export const WEAPON_ROW_OF: { id: string; tech: "is" | "clan"; name: string }[] = [
  ...ISN({
    ...counts((n) => `ac-${n}-is`, (n) => `Autocannon/${n}`, [2, 5, 10, 20]),
    ...counts((n) => `lb-${n}-x-ac-is`, (n) => `LB ${n}-X Autocannon`, [2, 5, 10, 20]),
    ...counts((n) => `light-ac-${n}-is`, (n) => `Light Autocannon/${n}`, [2, 5]),
    ...counts((n) => `rotary-ac-${n}-is`, (n) => `Rotary Autocannon/${n}`, [2, 5]),
    ...counts((n) => `ultra-ac-${n}-is`, (n) => `Ultra Autocannon/${n}`, [2, 5, 10, 20]),
    ...counts((n) => `hyper-velocity-ac-${n}-is`, (n) => `Hyper-Velocity AC/${n}`, [2, 5, 10]),
    ...counts((n) => `primitive-prototype-ac-${n}-is`, (n) => `Primitive Prototype AC/${n}`, [2, 5, 10, 20]),
    ...counts((n) => `lrm-${n}-is`, (n) => `LRM ${n}`, [5, 10, 15, 20]),
    ...counts((n) => `enhanced-lrm-${n}-is`, (n) => `Enhanced LRM ${n}`, [5, 10, 15, 20]),
    ...counts((n) => `extended-lrm-${n}-is`, (n) => `Extended LRM ${n}`, [5, 10, 15, 20]),
    ...counts((n) => `primitive-prototype-lrm-${n}-is`, (n) => `Primitive Prototype LRM ${n}`, [5, 10, 15, 20]),
    ...counts((n) => `mml-${n}-is`, (n) => `MML ${n}`, [3, 5, 7, 9]),
    ...counts((n) => `mrm-${n}-is`, (n) => `MRM ${n}`, [10, 20, 30, 40]),
    ...counts((n) => `srm-${n}-is`, (n) => `SRM ${n}`, [2, 4, 6]),
    ...counts((n) => `streak-srm-${n}-is`, (n) => `Streak SRM ${n}`, [2, 4, 6]),
    ...counts((n) => `primitive-prototype-srm-${n}-is`, (n) => `Primitive Prototype SRM ${n}`, [2, 4, 6]),
    ...counts((n) => `rocket-launcher-${n}-is`, (n) => `Rocket Launcher ${n}`, [10, 15, 20]),
    ...counts((n) => `prototype-rocket-launcher-${n}-is`, (n) => `Prototype Rocket Launcher ${n}`, [10, 15, 20]),
    ...counts((n) => `thunderbolt-${n}-is`, (n) => `Thunderbolt ${n}`, [5, 10, 15, 20]),
    ...counts((n) => `mech-mortar-${n}-is`, (n) => `'Mech Mortar-${n}`, [1, 2, 4, 8]),
    "light-gauss-rifle-is": "Light Gauss Rifle",
    "gauss-rifle-is": "Gauss Rifle",
    "heavy-gauss-rifle-is": "Heavy Gauss Rifle",
    "improved-heavy-gauss-is": "Improved Heavy Gauss Rifle",
    "magshot-is": "MagShot Gauss Rifle",
    "silver-bullet-gauss-is": "Silver Bullet Gauss Rifle",
    "fluid-gun-is": "Fluid Gun (w/ Corrosive Ammo only)",
    "light-machine-gun-is": "Light Machine Gun",
    "machine-gun-is": "Machine Gun",
    "heavy-machine-gun-is": "Heavy Machine Gun",
    "nail-rivet-gun-is": "Nail Gun/Rivet Gun",
    "light-rifle-is": "Light Rifle",
    "medium-rifle-is": "Medium Rifle",
    "heavy-rifle-is": "Heavy Rifle",
    "taser-is": "'Mech Taser",
    "er-small-laser-is": "ER Small Laser",
    "er-medium-laser-is": "ER Medium Laser",
    "er-large-laser-is": "ER Large Laser",
    "small-laser-is": "Small Laser",
    "medium-laser-is": "Medium Laser",
    "large-laser-is": "Large Laser",
    ...sizeNames((s) => `${s}-pulse-laser-is`, (s) => `${s} Pulse Laser`),
    ...sizeNames((s) => `prototype-${s}-pulse-laser-is`, (s) => `Prototype ${s} Pulse Laser`),
    ...sizeNames((s) => `${s}-re-engineered-laser-is`, (s) => `${s} Re-Engineered Laser`),
    ...sizeNames((s) => `x-pulse-laser-${s}-is`, (s) => `${s} X-Pulse Laser`),
    "variable-speed-laser-small-is": "Small Variable-Speed Pulse Laser",
    "variable-speed-laser-medium-is": "Med. Variable Speed-Pulse Laser",
    "variable-speed-laser-large-is": "Large Variable-Speed Pulse Laser",
    "primitive-prototype-small-laser-is": "Primitive Prototype Small Laser",
    "primitive-prototype-medium-laser-is": "Primitive Prototype Medium Laser",
    "primitive-prototype-large-laser-is": "Primitive Prototype Large Laser",
    "primitive-prototype-ppc-is": "Primitive Prototype PPC",
    "prototype-er-large-laser-is": "Prototype ER Large Laser",
    "binary-laser-is": "Binary Laser Cannon",
    "bombast-laser-is": "Bombast Laser",
    "risc-hyper-laser-is": "RISC Hyper Laser",
    "plasma-rifle-is": "Plasma Rifle",
    "light-ppc-is": "Light PPC",
    "ppc-is": "PPC",
    "heavy-ppc-is": "Heavy PPC",
    "er-ppc-is": "ER PPC",
    "snub-nose-ppc-is": "Snub-Nose PPC",
    "flamer-is": "Flamer",
    "vehicle-flamer-is": "Flamer (Vehicle)",
    "heavy-flamer-is": "Heavy Flamer",
    "er-flamer-is": "ER Flamer",
    // The "(Late Succession Wars)" rows are the book's dated reissues of these prototypes (3030, 3031 and 3038), which differ from the
    // earlier ones only in the TC column; that reading is ours, the catalog does not print the year.
    "prototype-lb-10-x-ac-is": "Prototype LB 10-X Autocannon",
    "prototype-lb-10-x-ac-lsw-is": "Prototype LB 10-X Autocannon (3030)",
    "prototype-gauss-rifle-is": "Prototype Gauss Rifle",
    "prototype-gauss-rifle-lsw-is": "Prototype Gauss Rifle (3038)",
    "prototype-medium-pulse-laser-lsw-is": "Prototype Med. Pulse Laser (3031)",
    "prototype-ultra-ac-5-is": "Prototype Ultra Autocannon/5",
  }),
  ...CLN({
    ...counts((n) => `lb-${n}-x-ac-clan`, (n) => `LB ${n}-X Autocannon`, [2, 5, 10, 20]),
    ...counts((n) => `ultra-ac-${n}-clan`, (n) => `Ultra Autocannon/${n}`, [2, 5, 10, 20]),
    ...counts((n) => `rotary-ac-${n}-clan`, (n) => `Rotary Autocannon/${n}`, [2, 5]),
    ...counts((n) => `improved-ac-${n}-clan`, (n) => `Improved Autocannon/${n}`, [2, 5, 10, 20]),
    ...counts((n) => `protomech-ac-${n}-clan`, (n) => `ProtoMech Autocannon/${n}`, [2, 4, 8]),
    ...counts((n) => `hyper-assault-gauss-${n}-clan`, (n) => `Hyper-Assault Gauss (HAG) ${n}`, [20, 30, 40]),
    ...counts((n) => `atm-${n}-clan`, (n) => `ATM ${n}`, [3, 6, 9, 12]),
    ...counts((n) => `improved-atm-${n}-clan`, (n) => `Improved ATM ${n}`, [3, 6, 9, 12]),
    ...counts((n) => `lrm-${n}-clan`, (n) => `LRM ${n}`, [5, 10, 15, 20]),
    ...counts((n) => `improved-lrm-${n}-clan`, (n) => `Improved LRM ${n}`, [5, 10, 15, 20]),
    ...counts((n) => `streak-lrm-${n}-clan`, (n) => `Streak LRM ${n}`, [5, 10, 15, 20]),
    ...counts((n) => `srm-${n}-clan`, (n) => `SRM ${n}`, [2, 4, 6]),
    ...counts((n) => `improved-srm-${n}-clan`, (n) => `Improved SRM ${n}`, [2, 4, 6]),
    ...counts((n) => `streak-srm-${n}-clan`, (n) => `Streak SRM ${n}`, [2, 4, 6]),
    ...counts((n) => `mech-mortar-${n}-clan`, (n) => `'Mech Mortar-${n}`, [1, 2, 4, 8]),
    "prototype-lb-2-x-ac-clan": "Prototype LB 2-X Autocannon",
    "prototype-lb-5-x-ac-clan": "Prototype LB 5-X Autocannon",
    "prototype-lb-20-x-ac-clan": "Prototype LB 20-X Autocannon",
    "prototype-ultra-ac-2-clan": "Prototype Ultra Autocannon/2",
    "prototype-ultra-ac-10-clan": "Prototype Ultra Autocannon/10",
    "prototype-ultra-ac-20-clan": "Prototype Ultra Autocannon/20",
    "prototype-streak-srm-4-clan": "Prototype Streak SRM 4",
    "prototype-streak-srm-6-clan": "Prototype Streak SRM 6",
    "ap-gauss-rifle-clan": "AP Gauss Rifle",
    "gauss-rifle-clan": "Gauss Rifle",
    "improved-gauss-rifle-clan": "Improved Gauss Rifle",
    "fluid-gun-clan": "Fluid Gun (w/ Corrosive Ammo only)",
    "light-machine-gun-clan": "Light Machine Gun",
    "machine-gun-clan": "Machine Gun",
    "heavy-machine-gun-clan": "Heavy Machine Gun",
    "nail-rivet-gun-clan": "Nail Gun/Rivet Gun",
    "er-micro-laser-clan": "ER Micro Laser",
    "er-small-laser-clan": "ER Small Laser",
    "er-medium-laser-clan": "ER Medium Laser",
    "er-large-laser-clan": "ER Large Laser",
    "micro-pulse-laser-clan": "Micro Pulse Laser",
    "small-pulse-laser-clan": "Small Pulse Laser",
    "medium-pulse-laser-clan": "Medium Pulse Laser",
    "large-pulse-laser-clan": "Large Pulse Laser",
    "er-pulse-laser-small-clan": "Small ER Pulse Laser",
    "er-pulse-laser-medium-clan": "Medium ER Pulse Laser",
    "er-pulse-laser-large-clan": "Large ER Pulse Laser",
    "chemical-laser-small-clan": "Small Chemical Laser",
    "chemical-laser-medium-clan": "Medium Chemical Laser",
    "chemical-laser-large-clan": "Large Chemical Laser",
    "heavy-small-laser-clan": "Heavy Small Laser",
    "heavy-medium-laser-clan": "Heavy Medium Laser",
    "heavy-large-laser-clan": "Heavy Large Laser",
    "improved-heavy-laser-small-clan": "Improved Heavy Small Laser",
    "improved-heavy-laser-medium-clan": "Improved Heavy Medium Laser",
    "improved-heavy-laser-large-clan": "Improved Heavy Large Laser",
    "prototype-er-small-laser-clan": "Prototype ER Small Laser",
    "prototype-er-medium-laser-clan": "Prototype ER Medium Laser",
    "improved-large-laser-clan": "Improved Large Laser",
    "improved-large-pulse-laser-clan": "Improved Large Pulse Laser",
    "plasma-cannon-clan": "Plasma Cannon",
    "er-ppc-clan": "ER PPC",
    "improved-ppc-clan": "Improved PPC",
    "enhanced-ppc-clan": "Enhanced PPC",
    "flamer-clan": "Flamer",
    "vehicle-flamer-clan": "Flamer (Vehicle)",
    "heavy-flamer-clan": "Heavy Flamer",
    "er-flamer-clan": "ER Flamer",
  }),
];

/** Weapons the book does not add to the attack values: artillery is a special unit ability (p. 101); the melee items are part of the
 * Melee ability, whose list is on p. 127; the rest are abilities of their own (Narc, TSEMP, anti-missile systems, p. 117 and following). */
export const WEAPONS_NOT_ADDED: { ids: string[]; why: "artillery" | "melee" | "ability"; ability: string; cite: AscCite }[] = [
  {
    ids: ["arrow-iv-is", "arrow-iv-clan", "prototype-arrow-iv-is", "thumper-artillery-is", "thumper-artillery-clan", "sniper-artillery-is", "sniper-artillery-clan", "thumper-cannon-is", "thumper-cannon-clan", "sniper-cannon-is", "sniper-cannon-clan", "long-tom-cannon-is", "long-tom-cannon-clan"],
    why: "artillery",
    ability: "the artillery abilities (ART)",
    cite: WEAPON_PAGES.artillery,
  },
  {
    ids: [
      ...["backhoe", "chainsaw", "combine", "dual-saw", "heavy-duty-pile-driver", "mining-drill", "rock-cutter", "spot-welder", "wrecking-ball"].flatMap((s) => [`${s}-is`, `${s}-clan`]),
      "hatchet-is", "sword-is", "chain-whip-is", "flail-is", "spikes-is", "retractable-blade-is", "retractable-blade-clan",
      "shield-small-is", "shield-medium-is", "shield-large-is", "vibroblade-small-is", "vibroblade-medium-is", "vibroblade-large-is",
    ],
    why: "melee",
    ability: "Melee (MEL)",
    cite: WEAPON_PAGES.mel,
  },
  {
    ids: ["ams-is", "ams-clan", "laser-anti-missile-system-is", "laser-anti-missile-system-clan", "narc-missile-beacon-is", "narc-missile-beacon-clan", "prototype-narc-missile-beacon-is", "improved-narc-launcher-is", "tsemp-cannon-is", "tsemp-one-shot-is", "risc-repeating-tsemp-cannon-is"],
    why: "ability",
    ability: "its own special unit ability",
    cite: WEAPON_PAGES.other,
  },
];

/** Weapons the tables do not list and no other page gives damage for: the book's rule is that they have no effect (p. 101). */
export const WEAPONS_IGNORED = ["a-pods-is", "a-pods-clan", "b-pods-is", "b-pods-clan", "m-pod-is"];

/** Items that sit beside a weapon and change which row of the table it uses: the PPC capacitor and the RISC laser pulse module. The row is
 * the host's own name followed by this text, in the host's own table. */
export const WEAPON_ATTACHMENTS: { itemIds: string[]; suffix: string; hosts: string[] }[] = [
  { itemIds: ["ppc-capacitor-is"], suffix: " w/ Capacitor", hosts: ["Light PPC", "PPC", "Heavy PPC", "ER PPC", "Snub-Nose PPC"] },
  { itemIds: ["risc-laser-pulse-module-is"], suffix: " w/ Laser Pulse Module", hosts: ["ER Large Laser", "ER Medium Laser", "ER Small Laser", "Large Laser", "Medium Laser", "Small Laser"] },
];

/** Fire-control systems: which value of a launcher's slash list each gives (0 = none), and the launchers it fits. */
export const FIRE_CONTROL: Record<string, { index: number; fits: "lrm-srm-mml" | "mrm" }> = {
  "artemis-iv-is": { index: 1, fits: "lrm-srm-mml" },
  "artemis-iv-clan": { index: 1, fits: "lrm-srm-mml" },
  "prototype-artemis-iv-is": { index: 1, fits: "lrm-srm-mml" },
  "artemis-v-clan": { index: 2, fits: "lrm-srm-mml" },
  "mrm-apollo-fcs-is": { index: 1, fits: "mrm" },
};

/** Actuator Enhancement Systems: weapons in the arm that has one are multiplied (errata v1.6, p. 101). */
export const AES_ARM_IDS = ["aes-arm-is", "aes-arm-clan"];
export const TARGETING_COMPUTER_IDS = ["targeting-computer-is", "targeting-computer-clan"];

export const WEAPON_RULES = {
  /** Ballistic and missile weapons with fewer shots per weapon than this are multiplied by `multiplier` (errata v1.6 rewrites the test as
   * shots carried divided by weapons of that kind). Ultra autocannons need 20, rotary autocannons 60; rocket launchers are never reduced. */
  ammunition: { multiplier: 0.75, shots: 10, ultraShots: 20, rotaryShots: 60, cite: WEAPON_PAGES.ammunition, checked: "page" as const },
  /** A targeting computer multiplies every weapon whose TC column is Y (p. 101). */
  targetingComputer: { multiplier: 1.1, cite: WEAPON_PAGES.targeting, checked: "page" as const },
  /** Every weapon in an arm with an Actuator Enhancement System (errata v1.6, p. 101). */
  aes: { multiplier: 1.05, cite: WEAPON_PAGES.targeting, checked: "page" as const },
  /** The damage subtotal is not rounded; the heat-modified damage is the subtotal rounded up to the next tenth where no heat reduction
   * applies (errata v1.6 p. 99-101 and Converting Heat errata v1.3). */
  roundUpTo: { value: 0.1, cite: WEAPON_PAGES.tablesIntro, checked: "page" as const },
};
