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
