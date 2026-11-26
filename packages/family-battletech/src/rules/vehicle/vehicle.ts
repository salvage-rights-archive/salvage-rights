// The Combat Vehicle record (Classic BattleTech) and the pure functions over it: TechManual's six construction steps (printed pp. 96-109) as
// arithmetic on the figures in data/vehicle.ts. One record serves every motive type. A record is plain data; nothing here throws on a record it
// does not understand: a motive type, engine, armor type or location it does not know is kept as it is, and keys this version does not know are
// kept too, so a record written by a later version survives a round trip through this one.
import { ARMOR, RULES_LEVELS } from "../../data/chassis";
import type { RulesLevel } from "../../data/chassis";
import { DEFAULT_EDITION } from "../../data/editions";
import { VEHICLE_ARMOR, VEHICLE_ENGINES, VEHICLE_RULES, motiveOf } from "../../data/vehicle";
import type { MotiveId, MotiveRow } from "../../data/vehicle";
import { groupOf } from "../catalog";
import type { Catalog, EquipmentRow } from "../catalog";
import type { MechRecord, Mount, OfficialMark, TechBase } from "../mech";
import { engineTons } from "../mech";
import { own, tidy } from "../walk";

export type { MotiveId, MotiveRow };

/** One weapon, ammunition bin or other item on the vehicle. `location` is one of `mountLocations`; one the vehicle lacks is kept. */
export interface VehicleMount {
  id: string;
  /** The catalog row; null when the item is not in our table. */
  equipmentId: string | null;
  name: string;
  /** `f` front, `l` left side, `r` right side, `b` rear, `t` turret or `body` (an item with no arc). */
  location: string;
  /** The tons of an ammunition bin, or the size the player chose for an item sold by size. */
  amount?: number;
}

export interface VehicleRecord {
  schema: 1;
  id: string;
  /** The edition the unit is built under (Total Warfare or Core Rulebook, both with TechManual). */
  editionId: string;
  name: { chassis: string; model: string };
  /** A MotiveId; any other string is kept as it is and offers no locations. */
  motive: MotiveId | (string & {});
  techBase: TechBase | "mixed";
  year: number | null;
  era?: string;
  rulesLevel?: RulesLevel;
  tons: number;
  /** Cruising MP; the engine rating, the flank MP and the weight follow from it. */
  cruise: number;
  /** The engine type id (ENGINE_TYPES in data/chassis.ts); the rating and weight are derived. */
  engine: { type: string };
  turret: boolean;
  /** `points` is keyed by the armor locations (`armorLocations`); a key the vehicle lacks is kept. */
  armor: { type: string; tons: number; points: Record<string, number> };
  /** The heat sinks on the unit, all of them: those the engine gives free are the first ten of a fusion engine. */
  heatSinks: { count: number };
  mounts: VehicleMount[];
  official?: OfficialMark;
  omni?: unknown;
  notes: Record<string, string>;
  picture?: { dataUrl: string };
}

// ---- Locations ----------------------------------------------------------------------------------------------------------------
// TechManual p. 98 (internal structure locations: front, left, right, rear, and the optional turret; rotor on a VTOL) and p. 107 (the body).

export const VEHICLE_LOCATION_NAMES: Record<string, string> = { f: "Front", l: "Left Side", r: "Right Side", b: "Rear", t: "Turret", rot: "Rotor", body: "Body" };

/** A location's display name; a code we do not know prints as itself in quotes, never as "undefined". */
export function vehicleLocationName(code: string): string {
  return own(VEHICLE_LOCATION_NAMES, code) ? (VEHICLE_LOCATION_NAMES[code] ?? code) : `"${code}"`;
}

/** The locations that hold armor and structure, in the order the sheet draws them. */
export function armorLocations(record: Pick<VehicleRecord, "motive" | "turret">): string[] {
  return ["f", "l", "r", "b", ...(record.turret && record.motive !== "vtol" ? ["t"] : []), ...(record.motive === "vtol" ? ["rot"] : [])];
}

/** The locations an item may sit in: the four sides, the turret where there is one, and the body. Never the rotor (TechManual p. 107). */
export function mountLocations(record: Pick<VehicleRecord, "motive" | "turret">): string[] {
  return ["f", "l", "r", "b", ...(record.turret && record.motive !== "vtol" ? ["t"] : []), "body"];
}

// ---- New record -----------------------------------------------------------------------------------------------------------------

export interface NewVehicleFields {
  id?: string;
  chassis?: string;
  model?: string;
  motive: MotiveId;
  techBase?: TechBase | "mixed";
  year?: number | null;
  era?: string;
  rulesLevel?: RulesLevel;
  tons: number;
  cruise?: number;
  editionId?: string;
}

/** A bare vehicle: a standard fusion engine, no turret, no armor, no heat sinks beyond the free ones and no equipment. The rules check says what it lacks. */
export function newVehicleRecord(fields: NewVehicleFields): VehicleRecord {
  const record: VehicleRecord = {
    schema: 1,
    id: fields.id ?? crypto.randomUUID(),
    editionId: fields.editionId ?? DEFAULT_EDITION,
    name: { chassis: fields.chassis ?? "", model: fields.model ?? "" },
    motive: fields.motive,
    techBase: fields.techBase ?? "inner-sphere",
    year: fields.year ?? null,
    tons: fields.tons,
    cruise: fields.cruise ?? (motiveOf(fields.motive)?.minCruise ?? 3),
    engine: { type: "standard" },
    turret: false,
    armor: { type: "standard", tons: 0, points: {} },
    heatSinks: { count: VEHICLE_RULES.heat.freeWithFusion },
    mounts: [],
    notes: {},
  };
  if (fields.era !== undefined) record.era = fields.era;
  if (fields.rulesLevel !== undefined) record.rulesLevel = fields.rulesLevel;
  for (const loc of armorLocations(record)) record.armor.points[loc] = 0;
  return record;
}

// ---- Reading a record from storage, a file or an import -------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const str = (v: unknown, fallback: string) => (isString(v) ? v : fallback);
const num = (v: unknown, fallback: number) => (isNumber(v) ? v : fallback);
const unknownKeys = (v: Record<string, unknown>, known: readonly string[]): Record<string, unknown> => Object.fromEntries(Object.entries(v).filter(([k]) => !known.includes(k)));

function part<T>(v: unknown, known: readonly (keyof T & string)[], fill: (o: Record<string, unknown>) => T): T {
  const o = isObject(v) ? v : {};
  return { ...unknownKeys(o, known), ...fill(o) };
}

const MOUNT_KEYS = ["id", "equipmentId", "name", "location", "amount"] as const;
function mountOf(v: Record<string, unknown>, index: number): VehicleMount {
  const mount: VehicleMount = { ...unknownKeys(v, MOUNT_KEYS), id: str(v.id, `mount-${String(index + 1)}`), equipmentId: isString(v.equipmentId) ? v.equipmentId : null, name: str(v.name, ""), location: str(v.location, "body") };
  if (isNumber(v.amount)) mount.amount = v.amount;
  return mount;
}

const RECORD_KEYS = ["schema", "id", "editionId", "name", "motive", "techBase", "year", "era", "rulesLevel", "tons", "cruise", "engine", "turret", "armor", "heatSinks", "mounts", "official", "omni", "notes", "picture"] as const;

function officialOf(v: unknown): OfficialMark | undefined {
  if (!isObject(v) || (v.status !== "official" && v.status !== "not-official")) return undefined;
  const mark: OfficialMark = { status: v.status };
  if (isString(v.book)) mark.book = v.book;
  if (isNumber(v.page)) mark.page = v.page;
  if (isString(v.design)) mark.design = v.design;
  return mark;
}

/**
 * Reads a record from storage, a file or an import. Every field this version knows is filled with its default where it is missing or not of
 * its kind; motive types, locations and armor types are kept whatever they are; keys this version does not know are kept as they are.
 * Undefined only for what is not a record at all: not an object, or a schema other than 1 (a later version's record, which this version must
 * not rewrite). `fallbackId` is the id of a record that has none (its storage key, or a fresh one).
 */
export function withDefaults(value: unknown, fallbackId = ""): VehicleRecord | undefined {
  if (!isObject(value) || (value.schema !== undefined && value.schema !== 1)) return undefined;
  const v = value;
  const record: VehicleRecord = {
    ...unknownKeys(v, RECORD_KEYS),
    schema: 1,
    id: str(v.id, fallbackId),
    editionId: str(v.editionId, DEFAULT_EDITION),
    name: part<VehicleRecord["name"]>(v.name, ["chassis", "model"], (o) => ({ chassis: str(o.chassis, ""), model: str(o.model, "") })),
    motive: str(v.motive, "tracked"),
    techBase: v.techBase === "clan" || v.techBase === "mixed" ? v.techBase : "inner-sphere",
    year: isNumber(v.year) ? v.year : null,
    tons: num(v.tons, 0),
    cruise: num(v.cruise, 0),
    engine: part<VehicleRecord["engine"]>(v.engine, ["type"], (o) => ({ type: str(o.type, "standard") })),
    turret: v.turret === true,
    armor: part<VehicleRecord["armor"]>(v.armor, ["type", "tons", "points"], (o) => ({
      type: str(o.type, "standard"),
      tons: num(o.tons, 0),
      points: isObject(o.points) ? (Object.fromEntries(Object.entries(o.points).filter(([, n]) => isNumber(n))) as Record<string, number>) : {},
    })),
    heatSinks: part<VehicleRecord["heatSinks"]>(v.heatSinks, ["count"], (o) => ({ count: num(o.count, 0) })),
    mounts: Array.isArray(v.mounts) ? v.mounts.filter(isObject).map(mountOf) : [],
    notes: isObject(v.notes) ? (Object.fromEntries(Object.entries(v.notes).filter(([, n]) => isString(n))) as Record<string, string>) : {},
  };
  if (isString(v.era)) record.era = v.era;
  if (RULES_LEVELS.some((l) => l.id === v.rulesLevel)) record.rulesLevel = v.rulesLevel as RulesLevel;
  if (v.omni !== undefined) record.omni = v.omni;
  const official = officialOf(v.official);
  if (official) record.official = official;
  if (isObject(v.picture) && isString(v.picture.dataUrl)) record.picture = { dataUrl: v.picture.dataUrl };
  return record;
}

// ---- Chassis, engine, controls --------------------------------------------------------------------------------------------------

const ceilHalf = (x: number): number => Math.ceil(tidy(x * 2)) / 2;

/** The motive type's row; undefined for one this version does not know. */
export const motiveRowOf = (record: Pick<VehicleRecord, "motive">): MotiveRow | undefined => motiveOf(record.motive);

/** Internal structure weight: a tenth of the tons, up to the half ton (TechManual p. 98). */
export const structureTons = (record: Pick<VehicleRecord, "tons">): number => ceilHalf(record.tons * VEHICLE_RULES.structure.share);

/** Structure points in each location, the turret and rotor included: a tenth of the tons, up to the whole point (p. 98). */
export const structurePoints = (record: Pick<VehicleRecord, "tons">): number => Math.ceil(tidy(record.tons * VEHICLE_RULES.structure.share));

/** Item slots before the engine and armor take theirs: 5 plus 1 for every 5 tons, down (p. 98). */
export const baseSlots = (record: Pick<VehicleRecord, "tons">): number => VEHICLE_RULES.slots.base + Math.floor(tidy(record.tons / VEHICLE_RULES.slots.perTons));

/** The suspension factor for the unit's motive type and weight (p. 100); null where the book prints none (a weight over the motive type's greatest). */
export function suspensionFactor(record: Pick<VehicleRecord, "motive" | "tons">): number | null {
  const row = motiveRowOf(record);
  const band = row?.suspension.find(([upTo]) => record.tons <= upTo);
  return band === undefined ? null : band[1];
}

/** Engine Rating: tons x cruising MP less the suspension factor, up to a multiple of 5, held to 10..400 (p. 100). null where the suspension factor is not printed. */
export function engineRating(record: Pick<VehicleRecord, "motive" | "tons" | "cruise">): number | null {
  const suspension = suspensionFactor(record);
  if (suspension === null) return null;
  const { min, max, step } = VEHICLE_RULES.engine;
  const rounded = Math.ceil(tidy((record.tons * record.cruise - suspension) / step)) * step;
  return Math.min(max, Math.max(min, rounded));
}

/** The unrounded rating the formula gives, to say when the book's limits had to be applied. */
export const baseRating = (record: Pick<VehicleRecord, "motive" | "tons" | "cruise">): number | null => {
  const suspension = suspensionFactor(record);
  return suspension === null ? null : record.tons * record.cruise - suspension;
};

/** Flank MP: cruising x 1.5, up (p. 100). */
export const flankMP = (record: Pick<VehicleRecord, "cruise">): number => Math.ceil(tidy(record.cruise * VEHICLE_RULES.engine.flank));

export const isFusion = (engineType: string): boolean => engineType !== "ice";

/** Engine weight: the Master Engine Table's, times 1.5 for a fusion engine (up to the half ton), and for a hover vehicle no less than a fifth of the tons (pp. 101-102). null for a rating or type the table lacks. */
export function engineWeight(record: Pick<VehicleRecord, "motive" | "tons" | "cruise" | "engine">): number | null {
  const rating = engineRating(record);
  const table = rating === null ? null : engineTons(record.engine.type, rating);
  if (table === null) return null;
  const shielded = isFusion(record.engine.type) ? ceilHalf(table * VEHICLE_RULES.fusionShield.factor) : table;
  return record.motive === "hover" ? Math.max(shielded, ceilHalf(record.tons * VEHICLE_RULES.fusionShield.hoverMinShare)) : shielded;
}

/** The slots the engine type costs (a negative number is a slot gained), p. 101. 0 for a type the table does not list. */
export const engineSlots = (record: Pick<VehicleRecord, "engine">): number => VEHICLE_ENGINES.find((e) => e.id === record.engine.type)?.slots ?? 0;

/** Lift, dive or rotor weight: a tenth of the tons, up to the half ton; none for the other motive types (p. 102). */
export function liftTons(record: Pick<VehicleRecord, "motive" | "tons">): number {
  return motiveRowOf(record)?.lift === undefined ? 0 : ceilHalf(record.tons * VEHICLE_RULES.lift.share);
}
export const LIFT_LABELS = { lift: "Lift equipment", dive: "Dive equipment", rotor: "Rotors" } as const;

/** Control systems: a twentieth of the tons, up to the half ton (p. 103). */
export const controlTons = (record: Pick<VehicleRecord, "tons">): number => ceilHalf(record.tons * VEHICLE_RULES.controls.share);

/** One crewman for every 15 tons or part of 15 (p. 103). */
export const crewOf = (record: Pick<VehicleRecord, "tons">): number => Math.ceil(tidy(record.tons / VEHICLE_RULES.crew.perTons));

// ---- Armor ----------------------------------------------------------------------------------------------------------------------

/** Armor points the tons give: 16 a ton times the type's multiplier, down. null for a type the table lacks. */
export function armorPointsFor(type: string, tons: number): number | null {
  const row = own(ARMOR.types, type) ? ARMOR.types[type] : undefined;
  return row === undefined ? null : Math.floor(tidy(tons * VEHICLE_RULES.armor.perTon * row.multiplier));
}

/** The most armor points a vehicle may mount: 3.5 x tons + 40, down (p. 105). */
export const maxArmorPoints = (record: Pick<VehicleRecord, "tons">): number => Math.floor(tidy(record.tons * VEHICLE_RULES.armor.maxFactor.perTon + VEHICLE_RULES.armor.maxFactor.add));

/** Slots the armor type costs; 0 for a type the table does not list. */
export const armorSlots = (record: Pick<VehicleRecord, "armor">): number => VEHICLE_ARMOR.find((a) => a.id === record.armor.type)?.slots ?? 0;

/** The points assigned to the locations the vehicle has. */
export const assignedArmor = (record: Pick<VehicleRecord, "motive" | "turret" | "armor">): number => armorLocations(record).reduce((sum, loc) => sum + (record.armor.points[loc] ?? 0), 0);

/** The weight that gives `points` of the armor type, in half-ton lots (p. 105); null for a type the table lacks. */
export function armorTonsFor(type: string, points: number): number | null {
  const row = own(ARMOR.types, type) ? ARMOR.types[type] : undefined;
  return row === undefined ? null : Math.ceil(tidy(points / (VEHICLE_RULES.armor.perTon * row.multiplier)) * 2) / 2;
}

// ---- Equipment ------------------------------------------------------------------------------------------------------------------

/** Words that make a machine gun or nail and rivet gun bin a half ton at least (p. 107). */
export const SMALL_BIN = /(^|-)(machine-gun|nail-rivet|nail|rivet)(-|$)/;

export interface ItemFacts {
  row: EquipmentRow | undefined;
  /** Weight in tons; null where we cannot weigh the item (not in our table, or a weight that depends on more than we know here). */
  tons: number | null;
  /** Slots the item takes: one unless the catalog row says otherwise for a vehicle (`by.vehicle`). */
  slots: number;
  heat: number;
  /** An energy weapon: the weight an ICE engine's power amplifiers are a share of. */
  energy: boolean;
  ammo: boolean;
  weapon: boolean;
}

/** The catalog row as a vehicle of this edition sees it. */
export const rowOf = (mount: Pick<VehicleMount, "equipmentId">, record: Pick<VehicleRecord, "editionId">, catalog: Catalog): EquipmentRow | undefined =>
  mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);

function pseudoMount(mount: VehicleMount, row: EquipmentRow): Mount {
  return { id: mount.id, equipmentId: row.id, name: mount.name, techBase: row.techBase, location: null, slot: null, ...(mount.amount === undefined ? {} : { amount: mount.amount }) };
}

/** What the unit's own figures stand in for a `MechRecord` when a catalog formula (a share of the tons, the targeting computer) is worked out. */
function pseudoRecord(record: VehicleRecord, row: EquipmentRow, catalog: Catalog): MechRecord {
  const mounts = record.mounts.flatMap((m) => {
    const r = rowOf(m, record, catalog);
    return r === undefined ? [] : [pseudoMount(m, r)];
  });
  return { editionId: record.editionId, tons: record.tons, configuration: "biped", mounts, chassis: { engine: { type: record.engine.type, rating: engineRating(record) ?? 0 } }, id: row.id } as unknown as MechRecord;
}

/** Weight, slots and heat of one mount, for a vehicle. A bin of ammunition weighs what the player chose (a ton to start). */
export function itemFacts(mount: VehicleMount, record: VehicleRecord, catalog: Catalog): ItemFacts {
  const row = rowOf(mount, record, catalog);
  if (row === undefined) return { row, tons: null, slots: 1, heat: 0, energy: false, ammo: false, weapon: false };
  const by = row.by?.vehicle;
  const ammo = row.kind === "ammunition";
  let tons: number | null = null;
  if (ammo) tons = mount.amount ?? VEHICLE_RULES.ammo.minTons;
  else if (typeof by?.tons === "number") tons = by.tons;
  else if (typeof row.tons === "number") tons = row.tons;
  else tons = catalog.factsOf(pseudoMount(mount, row), pseudoRecord(record, row, catalog))?.tons ?? null;
  const slots = typeof by?.slots === "number" ? by.slots : typeof row.slots === "number" ? row.slots : 1;
  const weapon = row.kind === "weapon";
  return { row, tons, slots, heat: by?.heat ?? row.heat ?? 0, energy: row.heavyEnergy === true || (weapon && groupOf(row).id === "energy"), ammo, weapon };
}

/** The rows of a weapon's ammunition in the catalog: `ammo-` and the weapon's id. */
export const ammoIdOf = (weaponId: string): string => `ammo-${weaponId}`;

/** Heat of every energy weapon fired together: the number of heat sinks the unit needs (p. 104). */
export function energyHeat(record: VehicleRecord, catalog: Catalog): number {
  return record.mounts.reduce((sum, m) => {
    const facts = itemFacts(m, record, catalog);
    return facts.energy ? sum + facts.heat : sum;
  }, 0);
}

/** Heat sinks that cost no weight: ten with a fusion engine, none with an ICE (p. 104). */
export const freeHeatSinks = (record: Pick<VehicleRecord, "engine">): number => (isFusion(record.engine.type) ? VEHICLE_RULES.heat.freeWithFusion : 0);

/** The weight of the turret: a tenth of what is mounted in it, ammunition left out, up to the half ton; nothing without a turret (p. 107). */
export function turretTons(record: VehicleRecord, catalog: Catalog): number {
  if (!record.turret || record.motive === "vtol") return 0;
  const held = record.mounts.reduce((sum, m) => {
    if (m.location !== "t") return sum;
    const facts = itemFacts(m, record, catalog);
    return facts.ammo ? sum : sum + (facts.tons ?? 0);
  }, 0);
  return ceilHalf(held * VEHICLE_RULES.turret.share);
}

/** Power amplifiers: an ICE engine's weight share of the energy weapons, up to the half ton (p. 107). */
export function amplifierTons(record: VehicleRecord, catalog: Catalog): number {
  if (isFusion(record.engine.type)) return 0;
  const energy = record.mounts.reduce((sum, m) => {
    const facts = itemFacts(m, record, catalog);
    return facts.energy ? sum + (facts.tons ?? 0) : sum;
  }, 0);
  return energy === 0 ? 0 : ceilHalf(energy * VEHICLE_RULES.amplifiers.share);
}

// ---- Weight and slots -----------------------------------------------------------------------------------------------------------

export interface TallyLine {
  label: string;
  tons: number;
}
export interface VehicleTally {
  lines: TallyLine[];
  total: number;
  /** Names of items the tally could not weigh: they are left out of `total`. */
  unknown: string[];
}

export function vehicleTally(record: VehicleRecord, catalog: Catalog): VehicleTally {
  const unknown: string[] = [];
  let equipment = 0;
  let ammunition = 0;
  for (const m of record.mounts) {
    const facts = itemFacts(m, record, catalog);
    if (facts.tons === null) {
      unknown.push(m.name || "an unnamed item");
      continue;
    }
    if (facts.ammo) ammunition += facts.tons;
    else equipment += facts.tons;
  }
  const row = motiveRowOf(record);
  const engine = engineWeight(record);
  if (engine === null) unknown.push("the engine");
  const lift = liftTons(record);
  const sinks = Math.max(0, record.heatSinks.count - freeHeatSinks(record));
  const lines: TallyLine[] = [
    { label: "Internal structure", tons: structureTons(record) },
    { label: "Engine", tons: engine ?? 0 },
    ...(lift > 0 && row?.lift !== undefined ? [{ label: LIFT_LABELS[row.lift], tons: lift }] : []),
    { label: "Control systems", tons: controlTons(record) },
    { label: "Heat sinks", tons: sinks },
    { label: "Armor", tons: record.armor.tons },
    { label: "Turret", tons: turretTons(record, catalog) },
    { label: "Power amplifiers", tons: amplifierTons(record, catalog) },
    { label: "Weapons and equipment", tons: equipment },
    { label: "Ammunition", tons: ammunition },
  ].filter((line) => line.tons !== 0 || line.label === "Armor");
  return { lines, total: tidy(lines.reduce((sum, l) => sum + l.tons, 0)), unknown };
}

export interface SlotTally {
  available: number;
  used: number;
  /** What took slots before the equipment did: the engine and the armor. */
  lost: { label: string; slots: number }[];
}

/** Item slots: 5 plus 1 for every 5 tons, less what the engine and the armor cost (more with a compact engine), against the items mounted (pp. 98, 101, 105, 107). */
export function slotTally(record: VehicleRecord, catalog: Catalog): SlotTally {
  const lost = [
    { label: "engine", slots: engineSlots(record) },
    { label: "armor", slots: armorSlots(record) },
  ].filter((l) => l.slots !== 0);
  const available = baseSlots(record) - lost.reduce((sum, l) => sum + l.slots, 0);
  const used = record.mounts.reduce((sum, m) => sum + itemFacts(m, record, catalog).slots, 0);
  return { available, used, lost };
}
