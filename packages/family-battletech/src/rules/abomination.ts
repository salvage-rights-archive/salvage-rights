// The Abomination unit record (BattleTech: Gothic) and the pure functions over it: its resolved statistics, its rules check, and the
// small play calculations the sheet and the tracker share. A record is plain data; there is no class. Nothing here throws on a record
// it does not understand: a type id this version does not know is kept as it is (and reported by the check), and keys this version does
// not know are kept too, so a record written by a later version survives a round trip through this one.
import { ABOM_CLASSES, ABOM_TYPES, MOB_HOBBLE_MODIFIERS, RANDOM_CREATURE, STUMBLE_DAMAGE, HANDLER, DEFAULT_SKILLS } from "../data/gothic";
import type { AbomClass, AbomClassId, AbomStats, AbomType, AbomWeapon } from "../data/gothic";
import type { RulesLevel } from "../data/chassis";
import type { Catalog, EquipmentRow } from "./catalog";
import { levelAtLeast } from "./levels";

/** A stat block the player made: the same figures a type has, with the name the player gave it. `pipRows` is what the player drew on the sheet. */
export interface AbomCustom extends AbomStats {
  name: string;
  pipRows?: number;
}

export interface AbominationUnit {
  schema: 1;
  id: string;
  /** A type of the box (ABOM_TYPES); any other string is kept as it is. Absent when the unit has a `custom` block. */
  typeId?: string;
  custom?: AbomCustom;
  label: string;
  /** Skills as written on the sheet, before any Handler bonus. */
  gunnery: number;
  animelee: number;
  /** The force entry id of the 'Mech that carries this unit's Handler. */
  handlerOf?: string;
  /** The Handler bonus bubble is ticked: skills read one lower. */
  handlerBonus: boolean;
}

export function newAbominationUnit(typeId: string, id: string = crypto.randomUUID()): AbominationUnit {
  return { schema: 1, id, typeId, label: "", gunnery: DEFAULT_SKILLS.gunnery, animelee: DEFAULT_SKILLS.animelee, handlerBonus: false };
}

export const abomClassOf = (id: string): AbomClass | undefined => ABOM_CLASSES.find((c) => c.id === id);
export const abomTypeOf = (id: string | undefined): AbomType | undefined => ABOM_TYPES.find((t) => t.id === id);

export interface UnitStats extends AbomStats {
  name: string;
  /** The class row; undefined only for a custom block whose class id is not one we know. */
  size: AbomClass | undefined;
  /** Damage rows per creature and pips in all of a creature's rows. */
  rows: number;
  pipsEach: number;
  /** Skills with the Handler bonus applied. */
  gunneryEffective: number;
  animeleeEffective: number;
  custom: boolean;
}

/** The unit's statistics, resolved from its type or custom block; undefined when it names a type this version does not know. */
export function unitStats(unit: AbominationUnit): UnitStats | undefined {
  const base: (AbomStats & { name: string }) | undefined = unit.custom ?? abomTypeOf(unit.typeId);
  if (!base) return undefined;
  const size = abomClassOf(base.classId);
  const rows = size?.rows ?? 0;
  const bonus = unit.handlerBonus ? HANDLER.skillBonus : 0;
  return { ...base, size, rows, pipsEach: rows * base.pipsPerRow, gunneryEffective: unit.gunnery + bonus, animeleeEffective: unit.animelee + bonus, custom: unit.custom !== undefined };
}

// ---- Rules check ------------------------------------------------------------------------------------------------------------

export interface AbomFinding {
  check: "type" | "creatures" | "rows" | "physical" | "weapons" | "launcher-shots" | "level";
  level: "error" | "warning" | "note";
  message: string;
}

/** Launcher tubes from the catalog row (damage per missile, the tube count at the end of the name); undefined for a direct-fire weapon. */
export function launcherTubes(row: Pick<EquipmentRow, "name" | "damage">): number | undefined {
  if (!row.damage?.endsWith("/Msl")) return undefined;
  const tubes = Number(/(\d+)$/.exec(row.name)?.[1]);
  return Number.isFinite(tubes) ? tubes : undefined;
}

/**
 * The rules check for an Abomination unit at a rules level. `catalog` is needed only for the weapon checks; without it they are skipped.
 * A custom block is a fan-made unit: below Fan-made it is reported.
 */
export function checkAbomination(unit: AbominationUnit, level: RulesLevel, catalog?: Catalog): AbomFinding[] {
  const findings: AbomFinding[] = [];
  const stats = unitStats(unit);
  if (!stats) {
    findings.push({ check: "type", level: "warning", message: `The type "${unit.typeId ?? ""}" is not one this version knows, so its figures cannot be checked.` });
    return findings;
  }
  const size = stats.size;
  if (!size) findings.push({ check: "type", level: "error", message: `The size class "${stats.classId}" is not Swarmer, Hulk, Giant or Titan.` });
  if (size && (stats.creatures < 1 || stats.creatures > size.maxCreatures)) {
    findings.push({ check: "creatures", level: "error", message: `${stats.creatures} creatures; a ${size.label} unit has 1 to ${size.maxCreatures}.` });
  }
  if (size && unit.custom?.pipRows !== undefined && unit.custom.pipRows !== size.rows) {
    findings.push({ check: "rows", level: "error", message: `${unit.custom.pipRows} pip rows per creature; a ${size.label} has ${size.rows}.` });
  }
  if (size && size.height >= 2 && (stats.mob !== null || stats.hobble !== null)) {
    findings.push({ check: "physical", level: "error", message: `A ${size.label} has Mob or Hobble damage, but it cannot share a hex with a 'Mech.` });
  }
  if (stats.custom && !levelAtLeast(level, "fan-made")) {
    findings.push({ check: "level", level: "error", message: "A custom type is a fan-made unit; it needs the Fan-made level or higher." });
  }
  if (catalog) {
    for (const weapon of stats.weapons) {
      const row = catalog.byId(weapon.id);
      if (!row || !(row.units ?? []).includes("abomination")) {
        findings.push({ check: "weapons", level: "error", message: `"${weapon.id}" is not an Abomination weapon.` });
      } else if (launcherTubes(row) !== undefined && !(weapon.shots !== undefined && weapon.shots >= 1)) {
        findings.push({ check: "launcher-shots", level: "error", message: `${row.name} needs the shots the sheet prints for it.` });
      }
    }
  }
  return findings;
}

// ---- Play helpers (rulebook pp. 70-76) --------------------------------------------------------------------------------------------

/** The to-hit modifier the unit's weapon and Melee attacks take: +1 for each creature killed (p. 70). */
export const damageModifier = (killed: number): number => Math.max(0, killed);

/**
 * The Cluster Hits Table column for one weapon (p. 71): the active creatures for a direct-fire weapon (one creature: no roll), tubes
 * times active creatures for a launcher (Tyrant, SRM 5: 15, then 10 with two left).
 */
export const clusterColumn = (tubes: number | undefined, activeCreatures: number): number => (tubes === undefined ? activeCreatures : tubes * activeCreatures);

/** Mob or Hobble to-hit modifier for the active creatures, 4 and more taking the 4-to-6 row (p. 76). */
export function mobHobbleModifier(kind: "mob" | "hobble", activeCreatures: number): number {
  const rows = MOB_HOBBLE_MODIFIERS;
  const row = rows.find((r) => r.creatures === Math.min(4, Math.max(1, activeCreatures)));
  return row ? row[kind] : 0;
}

/** The AniMelee roll target to avoid stumbling: +1 above 20 damage in the phase, +1 for each creature killed (p. 73). */
export const stumbleTarget = (animelee: number, damageThisPhase: number, killed: number): number =>
  animelee + (damageThisPhase > STUMBLE_DAMAGE ? 1 : 0) + killed;

/**
 * The creature a 1D6 roll hits on the Random Creature Number Table (p. 73). "reroll" when the table says so or when that creature is
 * already out (`eliminated` holds creature numbers, 1-based).
 */
export function creatureFor(roll: number, fullStrength: number, eliminated: readonly number[] = []): number | "reroll" {
  const hit = RANDOM_CREATURE[Math.min(6, Math.max(1, Math.round(roll))) - 1]?.[Math.min(6, Math.max(1, Math.round(fullStrength))) - 1];
  return hit === undefined || hit === "reroll" || eliminated.includes(hit) ? "reroll" : hit;
}

/** The one creature left, hit without a roll (p. 72); undefined while more than one is active. */
export function onlyCreatureLeft(fullStrength: number, eliminated: readonly number[]): number | undefined {
  const left = Array.from({ length: fullStrength }, (_, i) => i + 1).filter((n) => !eliminated.includes(n));
  return left.length === 1 ? left[0] : undefined;
}

// ---- Reading a record from storage, a file or an import ---------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const unknownKeys = (v: Record<string, unknown>, known: readonly string[]) => Object.fromEntries(Object.entries(v).filter(([k]) => !known.includes(k)));
const orNull = (v: unknown): number | null => (isNumber(v) ? v : null);

const WEAPON_KEYS = ["id", "count", "shots"] as const;
function weaponOf(v: Record<string, unknown>): AbomWeapon {
  const weapon: AbomWeapon = { ...unknownKeys(v, WEAPON_KEYS), id: isString(v.id) ? v.id : "", count: isNumber(v.count) ? v.count : 1 };
  if (isNumber(v.shots)) weapon.shots = v.shots;
  return weapon;
}

const CUSTOM_KEYS = ["name", "pipRows", "classId", "creatures", "pipsPerRow", "ground", "jump", "vtol", "weapons", "mob", "hobble", "melee"] as const;
function customOf(v: Record<string, unknown>): AbomCustom {
  const custom: AbomCustom = {
    ...unknownKeys(v, CUSTOM_KEYS),
    name: isString(v.name) ? v.name : "",
    classId: (isString(v.classId) ? v.classId : "swarmer") as AbomClassId,
    creatures: isNumber(v.creatures) ? v.creatures : 1,
    pipsPerRow: isNumber(v.pipsPerRow) ? v.pipsPerRow : 0,
    ground: isNumber(v.ground) ? v.ground : 0,
    weapons: Array.isArray(v.weapons) ? v.weapons.filter(isObject).map(weaponOf) : [],
    mob: orNull(v.mob),
    hobble: orNull(v.hobble),
    melee: orNull(v.melee),
  };
  if (isNumber(v.pipRows)) custom.pipRows = v.pipRows;
  if (isNumber(v.jump)) custom.jump = v.jump;
  if (isNumber(v.vtol)) custom.vtol = v.vtol;
  return custom;
}

const RECORD_KEYS = ["schema", "id", "typeId", "custom", "label", "gunnery", "animelee", "handlerOf", "handlerBonus"] as const;

/**
 * Reads a unit from storage, a file or an import. Fields this version knows are filled with their defaults where missing or of the wrong
 * kind; a type id is kept whatever it is; keys this version does not know are kept. Undefined only for what is not a record at all: not
 * an object, or a schema other than 1 (a later version's record, which this version must not rewrite).
 */
export function withDefaults(value: unknown, fallbackId = ""): AbominationUnit | undefined {
  if (!isObject(value) || (value.schema !== undefined && value.schema !== 1)) return undefined;
  const unit: AbominationUnit = {
    ...unknownKeys(value, RECORD_KEYS),
    schema: 1,
    id: isString(value.id) ? value.id : fallbackId,
    label: isString(value.label) ? value.label : "",
    gunnery: isNumber(value.gunnery) ? value.gunnery : DEFAULT_SKILLS.gunnery,
    animelee: isNumber(value.animelee) ? value.animelee : DEFAULT_SKILLS.animelee,
    handlerBonus: value.handlerBonus === true,
  };
  if (isString(value.typeId)) unit.typeId = value.typeId;
  if (isObject(value.custom)) unit.custom = customOf(value.custom);
  if (isString(value.handlerOf)) unit.handlerOf = value.handlerOf;
  return unit;
}
