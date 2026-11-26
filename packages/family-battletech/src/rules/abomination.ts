// The Abomination unit record (BattleTech: Gothic) and the pure functions over it: its resolved statistics, its rules check, and the
// small play calculations the sheet and the tracker share. A record is plain data; there is no class. Nothing here throws on a record
// it does not understand: a type id this version does not know is kept as it is (and reported by the check), and keys this version does
// not know are kept too, so a record written by a later version survives a round trip through this one.
import { ABOM_CLASSES, ABOM_TYPES, ABOMINATION_ONLY_INITIATIVE, DEFAULT_SKILLS, FRAYED, HANDLER, MOB_HOBBLE_MODIFIERS, RANDOM_CREATURE, STUMBLE_DAMAGE } from "../data/gothic";
import type { AbomClass, AbomClassId, AbomStats, AbomType, AbomWeapon } from "../data/gothic";
import { RULES_LEVELS } from "../data/chassis";
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
  /** The rules level the unit was made at, as a 'Mech record keeps its own; absent reads as Standard. */
  rulesLevel?: RulesLevel;
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

// ---- The tracker's state (the play page, gothic-design s.7.5) ----------------------------------------------------------------------

/** What the table keeps for one unit: pips marked per creature, launcher shots left, and the mount. Plain data, kept on the device. */
export interface TrackerState {
  schema: 1;
  /** Pips marked on each creature, in creature order. */
  marked: number[];
  /** What each creature had marked when the phase began; the difference is this phase's damage. */
  phaseStart: number[];
  /** Shots left for each launcher the unit carries, in the order of `launcherSlots`. */
  shotsLeft: number[];
  mounted: "none" | "mob" | "hobble";
  /** Damage suffered this phase past a creature's last pip: it marks nothing but still counts toward the phase's damage (pp. 72-73). */
  overflow?: number;
  /** A note of our own: what the unit is mounted on. */
  mountedOn: string;
}

/** One launcher carried by the unit (a weapon line of count 2 is two launchers), with the shots the sheet prints for it. */
export interface LauncherSlot {
  weaponId: string;
  /** 1-based number among launchers of the same weapon. */
  number: number;
  shots: number;
}

export function launcherSlots(stats: Pick<AbomStats, "weapons">): LauncherSlot[] {
  return stats.weapons.flatMap((w) =>
    w.shots === undefined ? [] : Array.from({ length: w.count }, (_, i) => ({ weaponId: w.id, number: i + 1, shots: w.shots as number })),
  );
}

export function newTracker(stats: Pick<AbomStats, "creatures" | "weapons">): TrackerState {
  const zeros = Array.from({ length: stats.creatures }, () => 0);
  return { schema: 1, marked: zeros, phaseStart: [...zeros], shotsLeft: launcherSlots(stats).map((l) => l.shots), mounted: "none", mountedOn: "" };
}

/** Reads stored tracker state against the unit's stats: wrong shapes fall back to a fresh one, and figures are held inside their limits. */
export function trackerWithDefaults(value: unknown, stats: Pick<AbomStats, "creatures" | "weapons"> & { pipsEach: number }): TrackerState {
  const fresh = newTracker(stats);
  if (!isObject(value) || value.schema !== 1) return fresh;
  const list = (v: unknown, fallback: number[], max: (i: number) => number) =>
    fallback.map((d, i) => (Array.isArray(v) && isNumber(v[i]) ? Math.min(max(i), Math.max(0, Math.round(v[i]))) : d));
  const slots = launcherSlots(stats);
  const marked = list(value.marked, fresh.marked, () => stats.pipsEach);
  return {
    schema: 1,
    marked,
    phaseStart: list(value.phaseStart, fresh.phaseStart, (i) => marked[i] ?? 0),
    shotsLeft: list(value.shotsLeft, fresh.shotsLeft, (i) => slots[i]?.shots ?? 0),
    ...(isNumber(value.overflow) && value.overflow > 0 ? { overflow: Math.round(value.overflow) } : {}),
    mounted: value.mounted === "mob" || value.mounted === "hobble" ? value.mounted : "none",
    mountedOn: isString(value.mountedOn) ? value.mountedOn : "",
  };
}

/** Marks a creature's pips up to `count` (held between 0 and `pipsEach`); damage past the last pip is lost, as the book says (p. 72). */
export function markCreature(state: TrackerState, creature: number, count: number, pipsEach: number): TrackerState {
  const marked = state.marked.map((m, i) => (i === creature - 1 ? Math.min(pipsEach, Math.max(0, count)) : m));
  return { ...state, marked };
}

/** Creature numbers (1-based) with every pip marked. */
export const eliminatedCreatures = (state: TrackerState, pipsEach: number): number[] =>
  state.marked.flatMap((m, i) => (m >= pipsEach ? [i + 1] : []));

export const activeCreatures = (state: TrackerState, pipsEach: number): number => state.marked.length - eliminatedCreatures(state, pipsEach).length;

/** Pips marked since the phase began, over all creatures. */
export const damageThisPhase = (state: TrackerState): number => state.marked.reduce((sum, m, i) => sum + Math.max(0, m - (state.phaseStart[i] ?? 0)), state.overflow ?? 0);

/** Adds (or takes back, with a negative `by`) damage past a creature's last pip this phase. */
export function addOverflow(state: TrackerState, by: number): TrackerState {
  const { overflow: _old, ...rest } = state;
  void _old;
  const next = Math.max(0, (state.overflow ?? 0) + by);
  return next > 0 ? { ...rest, overflow: next } : rest;
}

/** End Phase: this phase's damage starts again from nothing. */
export const endPhase = (state: TrackerState): TrackerState => {
  const { overflow: _old, ...rest } = state;
  void _old;
  return { ...rest, phaseStart: [...state.marked] };
};

/** Spends one shot of a launcher (or gives one back with a negative `by`), held between none and what the sheet prints. */
export function spendShot(state: TrackerState, slot: number, by: number, capacity: number): TrackerState {
  return { ...state, shotsLeft: state.shotsLeft.map((s, i) => (i === slot ? Math.min(capacity, Math.max(0, s - by)) : s)) };
}

/** Packs units into pages of five, in order (the sheet has five unit blocks); the last page holds what is left. */
export function paginate<T>(units: readonly T[], perPage = 5): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < units.length; i += perPage) pages.push(units.slice(i, i + perPage));
  return pages;
}

// ---- Forces (rulebook pp. 66, 78, 80) ---------------------------------------------------------------------------------------------

/** A 'Mech in a force: a saved Gothic 'Mech and the pilot who drives it. Skills are as written on the pilot's card (Frayed already applied). */
export interface ForceMech {
  /** This entry's own id, so one saved 'Mech can stand in a force twice. */
  id: string;
  recordId: string;
  pilot: string;
  gunnery: number;
  piloting: number;
  frayed: boolean;
  /** An Abomination Handler rides in this 'Mech. */
  handler: boolean;
}

/** An Abomination unit in a force: a saved unit, the 'Mech entry that carries its Handler, and the Handler bonus box. */
export interface ForceUnit {
  id: string;
  unitId: string;
  /** The id of a `ForceMech` entry. */
  handlerOf?: string;
  handlerBonus: boolean;
}

export interface GothicForce {
  schema: 1;
  id: string;
  name: string;
  mechs: ForceMech[];
  units: ForceUnit[];
}

export const newForce = (id: string = crypto.randomUUID()): GothicForce => ({ schema: 1, id, name: "", mechs: [], units: [] });

/**
 * A copy of the force under a new id: every entry has a new id too (so the copy's tracker state starts clean), a Handler link follows
 * the copied 'Mech entry, and the copy points at the same saved 'Mechs and units as the original.
 */
export function duplicateForce(force: GothicForce, id: string = crypto.randomUUID()): GothicForce {
  const entryIds = new Map<string, string>();
  const mechs = force.mechs.map((m) => {
    const next = crypto.randomUUID();
    entryIds.set(m.id, next);
    return { ...structuredClone(m), id: next };
  });
  const units = force.units.map((u) => ({ ...structuredClone(u), id: crypto.randomUUID(), ...(u.handlerOf === undefined ? {} : { handlerOf: entryIds.get(u.handlerOf) ?? u.handlerOf }) }));
  return { ...structuredClone(force), id, name: `${force.name.trim() || "Unnamed force"} (copy)`, mechs, units };
}

export const newForceMech = (recordId: string, id: string = crypto.randomUUID()): ForceMech => ({
  id,
  recordId,
  pilot: "",
  gunnery: DEFAULT_SKILLS.mechwarriorGunnery,
  piloting: DEFAULT_SKILLS.mechwarriorPiloting,
  frayed: false,
  handler: false,
});

export const newForceUnit = (unitId: string, id: string = crypto.randomUUID()): ForceUnit => ({ id, unitId, handlerBonus: false });

export interface InitiativeModifier {
  value: number;
  why: string;
}

/**
 * The Initiative modifiers a force carries. -4 when it holds Abomination units and no 'Mech (p. 66: any human-controlled unit lifts it, and
 * a 'Mech is one). -2 when the first 'Mech listed is Frayed-piloted, or when every 'Mech in the force is (p. 78).
 */
export function initiativeModifiers(force: Pick<GothicForce, "mechs" | "units">): InitiativeModifier[] {
  const found: InitiativeModifier[] = [];
  if (force.mechs.length === 0 && force.units.length > 0) found.push({ value: ABOMINATION_ONLY_INITIATIVE, why: `Only Abomination units (p. 66)` });
  const lead = force.mechs[0];
  if (lead && (lead.frayed || force.mechs.every((m) => m.frayed))) {
    found.push({ value: FRAYED.initiative, why: `${lead.frayed ? "Led by a Frayed MechWarrior" : "Every 'Mech has a Frayed MechWarrior"} (p. ${String(FRAYED.cite.page)})` });
  }
  return found;
}

export interface ForceFinding {
  check: "handler-weight" | "handler-count" | "handler-bonus";
  level: "error";
  message: string;
}

/**
 * The force's own checks: a Handler under the minimum tonnage, more units on one Handler than the book allows, and a Handler bonus
 * with no Handler to give it. `lookup` names what the force points at; a 'Mech or unit it cannot find is left to the page to report.
 */
export function checkForce(
  force: Pick<GothicForce, "mechs" | "units">,
  lookup: { mech: (recordId: string) => { name: string; tons: number } | undefined; unit: (unitId: string) => string | undefined },
): ForceFinding[] {
  const findings: ForceFinding[] = [];
  const nameOf = (m: ForceMech) => {
    const mech = lookup.mech(m.recordId)?.name ?? "A 'Mech";
    return m.pilot.trim() ? `${mech} (${m.pilot.trim()})` : mech;
  };
  for (const m of force.mechs) {
    const tons = lookup.mech(m.recordId)?.tons;
    if (m.handler && tons !== undefined && tons < HANDLER.minMechTons) {
      findings.push({ check: "handler-weight", level: "error", message: `${nameOf(m)} is ${String(tons)} tons; a Handler rides only in a 'Mech of ${String(HANDLER.minMechTons)} tons or more (p. ${String(HANDLER.cite.page)}).` });
    }
    const carried = force.units.filter((u) => u.handlerOf === m.id);
    if (carried.length > HANDLER.maxUnits) {
      findings.push({ check: "handler-count", level: "error", message: `${nameOf(m)} has ${String(carried.length)} units on its Handler; one Handler serves up to ${String(HANDLER.maxUnits)} (p. ${String(HANDLER.cite.page)}).` });
    }
  }
  for (const u of force.units) {
    const handlerMech = force.mechs.find((m) => m.id === u.handlerOf);
    if (!handlerMech?.handler && (u.handlerBonus || u.handlerOf !== undefined)) {
      const unit = lookup.unit(u.unitId) ?? "A unit";
      findings.push({
        check: "handler-bonus",
        level: "error",
        message: u.handlerBonus ? `${unit} has the Handler bonus, but no 'Mech with a Handler aboard is linked to it.` : `${unit} is linked to a 'Mech with no Handler aboard.`,
      });
    }
  }
  return findings;
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

const RECORD_KEYS = ["schema", "id", "typeId", "custom", "label", "gunnery", "animelee", "handlerOf", "handlerBonus", "rulesLevel"] as const;

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
  const level = RULES_LEVELS.find((row) => row.id === value.rulesLevel);
  if (level) unit.rulesLevel = level.id;
  return unit;
}

const forceMechOf = (v: unknown): ForceMech | undefined => {
  if (!isObject(v) || !isString(v.id) || !isString(v.recordId)) return undefined;
  return {
    ...unknownKeys(v, ["id", "recordId", "pilot", "gunnery", "piloting", "frayed", "handler"]),
    id: v.id,
    recordId: v.recordId,
    pilot: isString(v.pilot) ? v.pilot : "",
    gunnery: isNumber(v.gunnery) ? v.gunnery : DEFAULT_SKILLS.mechwarriorGunnery,
    piloting: isNumber(v.piloting) ? v.piloting : DEFAULT_SKILLS.mechwarriorPiloting,
    frayed: v.frayed === true,
    handler: v.handler === true,
  };
};

const forceUnitOf = (v: unknown): ForceUnit | undefined => {
  if (!isObject(v) || !isString(v.id) || !isString(v.unitId)) return undefined;
  const unit: ForceUnit = { ...unknownKeys(v, ["id", "unitId", "handlerOf", "handlerBonus"]), id: v.id, unitId: v.unitId, handlerBonus: v.handlerBonus === true };
  if (isString(v.handlerOf)) unit.handlerOf = v.handlerOf;
  return unit;
};

/** Reads a force from storage: missing fields take their defaults, an entry that is not an entry is dropped, unknown keys are kept. Undefined for what is not a force of schema 1. */
export function forceWithDefaults(value: unknown, fallbackId = ""): GothicForce | undefined {
  if (!isObject(value) || (value.schema !== undefined && value.schema !== 1)) return undefined;
  const list = <T,>(v: unknown, read: (item: unknown) => T | undefined): T[] => (Array.isArray(v) ? v.flatMap((item) => { const got = read(item); return got ? [got] : []; }) : []);
  return {
    ...unknownKeys(value, ["schema", "id", "name", "mechs", "units"]),
    schema: 1,
    id: isString(value.id) ? value.id : fallbackId,
    name: isString(value.name) ? value.name : "",
    mechs: list(value.mechs, forceMechOf),
    units: list(value.units, forceUnitOf),
  };
}