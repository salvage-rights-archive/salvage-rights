// BattleTech: Gothic figures that are not equipment: the Abomination size classes, the ten types of the box, and the play tables. Plain
// data; nothing here runs. Every row carries `cite` and `checked`. Figures, identifiers and short names only: no rules wording.
//
// Weapons are not repeated here. An Abomination weapon is a row of the one catalog (data/equipment/), which lists "abomination" in its
// `units`; a type names its weapons by catalog id (the Light Blazer, `light-blazer-gothic`, comes from the Gothic ruleset piece). What a
// type adds is how many of the weapon each creature carries and, for a launcher, the shots the sheet prints for the unit.
//
// Read against the page images 2026-11-25 (G-3): rulebook pp. 64, 69, 73, 76, 79, 80 and 92; the Deluxe Record Sheets, whose pages are
// cited by PDF index (the sheets print no page numbers): index 33 holds the Gnat, Werebeast, Devil, Cricket and Rampager sheets and the
// four play tables, index 34 the Tyrant, Colossus, Troll King, Stone Giant and Ravager (indices 39-40 repeat them). Pips per row were
// counted from the PDF's Wingdings glyphs, which the text extract lacks; each count agrees with the sheet image. "Permission to
// photocopy for personal use" is printed in the foot of every one of those sheets.
import type { Checked } from "./chassis";

export const GOTHIC_BOOK = "BattleTech: Gothic";
export const GOTHIC_SHEETS = "BattleTech: Gothic Deluxe Record Sheets";
export interface GothicCite { book: string; page: number }

export type AbomClassId = "swarmer" | "hulk" | "giant" | "titan";

export interface AbomClass {
  id: AbomClassId;
  label: string;
  /** Most creatures in one unit. */
  maxCreatures: number;
  /** Damage rows each creature has on the sheet. */
  rows: number;
  /** Standing height in levels, for line of sight and the terrain it may enter. */
  height: number;
  /** Added to the target movement modifier. */
  bonusTmm: number;
  /** Units of this class one hex holds on its own. */
  stackLimit: number;
  /** What the class counts as when stacking with other classes (Swarmer 1, Hulk 2, Giant 3, Titan 4; a hex holds 6). */
  stackWeight: number;
  /** True when the unit must declare a facing and cannot fire to the rear; false for the 360-degree classes. */
  facing: boolean;
  cite: GothicCite;
  checked: Checked;
}

/** The most stack weight one hex holds (rulebook p. 69). A BattleMech in the hex (conflict 36) is not built. */
export const HEX_STACK_WEIGHT = 6;

const P64 = { book: GOTHIC_BOOK, page: 64 };
export const ABOM_CLASSES: readonly AbomClass[] = [
  { id: "swarmer", label: "Swarmer", maxCreatures: 6, rows: 1, height: 1, bonusTmm: 1, stackLimit: 6, stackWeight: 1, facing: false, cite: P64, checked: "page" },
  { id: "hulk", label: "Hulk", maxCreatures: 3, rows: 2, height: 1, bonusTmm: 1, stackLimit: 3, stackWeight: 2, facing: false, cite: P64, checked: "page" },
  { id: "giant", label: "Giant", maxCreatures: 2, rows: 3, height: 2, bonusTmm: 0, stackLimit: 2, stackWeight: 3, facing: true, cite: P64, checked: "page" },
  { id: "titan", label: "Titan", maxCreatures: 1, rows: 5, height: 2, bonusTmm: 0, stackLimit: 1, stackWeight: 4, facing: true, cite: P64, checked: "page" },
];

/** One weapon line of a type: the catalog row, how many each creature carries, and the shots per unit for a launcher (1 = one shot). */
export interface AbomWeapon {
  /** A catalog id whose `units` include "abomination". */
  id: string;
  count: number;
  shots?: number;
}

/** The stat block of an Abomination type, which a custom unit also fills in. Physical damage: null where the sheet prints a dash. */
export interface AbomStats {
  classId: AbomClassId;
  creatures: number;
  /** Pips in each damage row; a creature has the class's `rows` rows of them. */
  pipsPerRow: number;
  ground: number;
  jump?: number;
  vtol?: number;
  weapons: AbomWeapon[];
  mob: number | null;
  hobble: number | null;
  melee: number | null;
}

export interface AbomType extends AbomStats {
  id: string;
  /** The type's name as the sheet prints it. */
  name: string;
  cite: GothicCite;
  checked: Checked;
}

const S33 = { book: GOTHIC_SHEETS, page: 33 };
const S34 = { book: GOTHIC_SHEETS, page: 34 };
export const ABOM_TYPES: readonly AbomType[] = [
  { id: "gnat", name: "Gnat", classId: "swarmer", creatures: 6, pipsPerRow: 3, ground: 1, vtol: 6, weapons: [{ id: "light-machine-gun-is", count: 1 }], mob: 1, hobble: 1, melee: 1, cite: S33, checked: "page" },
  { id: "werebeast", name: "Werebeast", classId: "swarmer", creatures: 5, pipsPerRow: 6, ground: 3, jump: 2, weapons: [{ id: "machine-gun-is", count: 2 }, { id: "srm-4-is", count: 1, shots: 1 }], mob: 4, hobble: 4, melee: 2, cite: S33, checked: "page" },
  { id: "devil", name: "Devil", classId: "swarmer", creatures: 4, pipsPerRow: 8, ground: 1, jump: 4, weapons: [{ id: "machine-gun-is", count: 1 }, { id: "flamer-is", count: 1 }], mob: 4, hobble: 4, melee: 2, cite: S33, checked: "page" },
  { id: "cricket", name: "Cricket", classId: "swarmer", creatures: 5, pipsPerRow: 12, ground: 1, jump: 3, weapons: [{ id: "medium-antimech-rifle-gothic", count: 2 }], mob: null, hobble: null, melee: 2, cite: S33, checked: "page" },
  { id: "rampager", name: "Rampager", classId: "hulk", creatures: 3, pipsPerRow: 15, ground: 4, weapons: [{ id: "medium-laser-is", count: 1 }, { id: "machine-gun-is", count: 1 }], mob: null, hobble: null, melee: 6, cite: S33, checked: "page" },
  { id: "tyrant", name: "Tyrant", classId: "hulk", creatures: 3, pipsPerRow: 13, ground: 2, weapons: [{ id: "small-laser-is", count: 2 }, { id: "srm-5-gothic", count: 2, shots: 1 }], mob: null, hobble: null, melee: 4, cite: S34, checked: "page" },
  { id: "colossus", name: "Colossus", classId: "giant", creatures: 2, pipsPerRow: 16, ground: 2, weapons: [{ id: "flamer-is", count: 2 }, { id: "medium-antimech-rifle-gothic", count: 2 }], mob: null, hobble: null, melee: 5, cite: S34, checked: "page" },
  { id: "troll-king", name: "Troll King", classId: "giant", creatures: 2, pipsPerRow: 16, ground: 2, weapons: [{ id: "heavy-antimech-rifle-gothic", count: 2 }, { id: "rocket-launcher-5-gothic", count: 1, shots: 1 }], mob: null, hobble: null, melee: 5, cite: S34, checked: "page" },
  { id: "stone-giant", name: "Stone Giant", classId: "titan", creatures: 1, pipsPerRow: 16, ground: 2, weapons: [{ id: "light-blazer-gothic", count: 1 }, { id: "lrm-5-is", count: 2, shots: 2 }], mob: null, hobble: null, melee: 6, cite: S34, checked: "page" },
  { id: "ravager", name: "Ravager", classId: "titan", creatures: 1, pipsPerRow: 18, ground: 3, weapons: [{ id: "medium-laser-is", count: 2 }, { id: "srm-6-is", count: 2, shots: 2 }], mob: null, hobble: null, melee: 7, cite: S34, checked: "page" },
];

// ---- Play tables (sheet index 33 and rulebook pp. 73 and 76) ----------------------------------------------------------------

/** Random Creature Number Table: `RANDOM_CREATURE[roll - 1][creatures - 1]` is the creature hit, or "reroll" (p. 73; sheet index 33). */
export const RANDOM_CREATURE: readonly (readonly (number | "reroll")[])[] = [
  [1, 1, 1, 1, 1, 1],
  [1, 1, 1, 2, 2, 2],
  [1, 1, 2, 3, 3, 3],
  [1, 2, 2, 4, 4, 4],
  [1, 2, 3, "reroll", 5, 5],
  [1, 2, 3, "reroll", "reroll", 6],
];
export const RANDOM_CREATURE_CITE: GothicCite = { book: GOTHIC_BOOK, page: 73 };

/** Mob and Hobble base to-hit modifiers by active creatures; the 4-6 row is the entry at 4, 5 and 6 (p. 76). */
export const MOB_HOBBLE_MODIFIERS: { creatures: number; mob: number; hobble: number }[] = [
  { creatures: 1, mob: 3, hobble: 5 },
  { creatures: 2, mob: 3, hobble: 3 },
  { creatures: 3, mob: 2, hobble: 1 },
  { creatures: 4, mob: 1, hobble: 0 },
];
export const MOB_HOBBLE_CITE: GothicCite = { book: GOTHIC_BOOK, page: 76 };

/** 'Mech hit locations as short codes: -F front, -R rear; RA/LA arms; RL/LL legs; RFL, RRL, LFL, LRL the four legs of a quad. */
export type HitLocation = "HD" | "CT-F" | "CT-R" | "RT-F" | "RT-R" | "LT-F" | "LT-R" | "RA" | "LA" | "RL" | "LL" | "RFL" | "RRL" | "LFL" | "LRL";
/** `[bipedal, four-legged]`, in the order of the roll: 2 to 12 for Mob, 1 to 6 for Hobble. */
export const MOB_LOCATIONS: readonly (readonly [HitLocation, HitLocation])[] = [
  ["HD", "HD"], ["CT-R", "RT-F"], ["RT-R", "CT-R"], ["RT-F", "RT-R"], ["RA", "RT-F"], ["CT-F", "CT-F"],
  ["LA", "LT-F"], ["LT-F", "LT-R"], ["LT-R", "CT-R"], ["CT-R", "LT-F"], ["HD", "HD"],
];
export const HOBBLE_LOCATIONS: readonly (readonly [HitLocation, HitLocation])[] = [
  ["RL", "RFL"], ["RL", "RFL"], ["RL", "RRL"], ["LL", "LRL"], ["LL", "LFL"], ["LL", "LFL"],
];

// ---- Identification, skills, Frayed and Handlers --------------------------------------------------------------------------

/** Abomination Identification Table (p. 79): the ID roll is 2D6 against the spotter's Piloting or AniMelee plus these. Range 20 hexes and line of sight. */
export const ID_RANGE = 20;
export const ID_DISTANCE_BANDS: { from: number; to: number | null; modifier: number }[] = [
  { from: 0, to: 1, modifier: -2 },
  { from: 2, to: 5, modifier: -1 },
  { from: 6, to: 9, modifier: 0 },
  { from: 10, to: 14, modifier: 2 },
  { from: 15, to: null, modifier: 4 },
];
export const ID_FLAGS = { targetAttackedSpotter: -2, spotterHasHandler: -4, spotterIsAbomination: -1 } as const;
export const ID_CITE: GothicCite = { book: GOTHIC_BOOK, page: 79 };

/** Default Abomination skills (p. 66) and MechWarrior skills (p. 7). */
export const DEFAULT_SKILLS = { gunnery: 4, animelee: 4, mechwarriorGunnery: 4, mechwarriorPiloting: 5, cite: { book: GOTHIC_BOOK, page: 66 } } as const;

/** Frayed MechWarriors (p. 78): skills lowered by 1 (already applied on the box's cards); Initiative -2 for the force. */
export const FRAYED = { gunnery: -1, piloting: -1, initiative: -2, cite: { book: GOTHIC_BOOK, page: 78 } } as const;
/** A force of Abominations only has no human-controlled ally: Initiative -4 (p. 66). */
export const ABOMINATION_ONLY_INITIATIVE = -4;

/** Handlers (p. 80): skills lowered by 1 for up to three allied units; carried by a 'Mech of at least 40 tons (medium, heavy, assault). */
export const HANDLER = { skillBonus: -1, maxUnits: 3, minMechTons: 40, cite: { book: GOTHIC_BOOK, page: 80 } } as const;

/** More than this much damage to a unit in one phase can make it stumble (p. 73): the AniMelee roll to avoid it takes +1 above this and +1 per creature killed. */
export const STUMBLE_DAMAGE = 20;
