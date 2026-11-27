// The Support Vehicle record (Classic BattleTech) and the pure functions over it: TechManual's six construction steps (printed pp. 116-139) as arithmetic on
// the figures in data/support-vehicle.ts. A record is plain data; nothing here throws on a record it does not understand: a motive type, engine, chassis
// modification, armor rating or location it does not know is kept as it is, and keys this version does not know are kept too, so a record written by a later
// version survives a round trip through this one.
import type { RulesLevel } from "../../data/chassis";
import { DEFAULT_EDITION } from "../../data/editions";
import {
  AIR_FUEL_KG, AIR_FUEL_PROP_FACTOR, ALTERNATE_FUEL_PERCENT, BARS, ENGINE_MINIMUMS, SEAT_TONS, SV_AIRSHIP_SI, SV_ARMOR_BASE, SV_ARMOR_KG, SV_ARMOR_MAX, SV_BAR10_SLOTS, SV_CREW, SV_FIRE_CONTROL,
  SV_ROTOR_MAX, SV_SLOTS, SV_SPEED, SV_STRUCTURE, SV_WEIGHTS, SV_WEIGHT_RULES, TECH_MULTIPLIER, svEngineOf, svModOf, svMotiveOf,
} from "../../data/support-vehicle";
import type { SvMotive, SvMotiveId, SvSize, SvWeightRow, TechRating } from "../../data/support-vehicle";
import { groupOf } from "../catalog";
import type { Catalog, EquipmentRow } from "../catalog";
import type { MechRecord, Mount, OfficialMark, TechBase } from "../mech";
import { own, tidy } from "../walk";

export type { SvMotiveId, SvSize, TechRating };

/** One weapon, ammunition bin or other item on the unit. `location` is one of `mountLocations`; one the unit lacks is kept. */
export interface SvMount {
  id: string;
  /** The catalog row; null when the item is not in our table. */
  equipmentId: string | null;
  name: string;
  /** A location code, or `body` (an item with no arc). */
  location: string;
  /** The tons of an ammunition bin or a bay, or the size the player chose for an item sold by size; for an infantry weapon, the clips carried. */
  amount?: number;
  /** How many of the item (seats, quarters, compartments, a row of identical weapons); absent is one. */
  qty?: number;
  /** The munition chosen for a mine dispenser or a grenade launcher: a catalog row id (rules/munitions.ts). */
  munition?: string;
  /** A weapon on a pintle mount of a Small unit (it is in a side location, and takes the pintle's weight). */
  pintle?: boolean;
}

export interface SupportVehicleRecord {
  schema: 1;
  id: string;
  editionId: string;
  name: { chassis: string; model: string };
  /** An `SvMotiveId`; any other string is kept as it is and offers no locations. */
  motive: SvMotiveId | (string & {});
  techBase: TechBase | "mixed";
  year: number | null;
  era?: string;
  rulesLevel?: RulesLevel;
  /** Tons; a Small unit (under 5 tons) is weighed to the kilogram, a larger one in half tons. */
  tons: number;
  /** The Structural Tech Rating, and the chassis modifications (`SvModId`s). */
  structure: { rating: TechRating | (string & {}); mods: string[] };
  /** Cruising MP, or Safe Thrust for an airship (in quarters) and a fixed-wing unit. */
  cruise: number;
  engine: { type: string; rating: TechRating | (string & {}); /** An ICE on alcohol or natural gas. */ alternateFuel?: boolean };
  /** Tons of fuel: a range for most, Fuel Points for an air unit; derived from this. */
  fuelTons: number;
  turret: boolean;
  /** The armor: its BAR and Tech Rating, and the points in each location. The weight follows from the points. */
  armor: { bar: number; rating: TechRating | (string & {}); points: Record<string, number> };
  fireControl: "none" | "basic" | "advanced";
  /** Crew beyond the minimum the rules ask for. */
  extraCrew: number;
  heatSinks: { count: number };
  mounts: SvMount[];
  official?: OfficialMark;
  notes: Record<string, string>;
  picture?: { dataUrl: string };
}

// ---- Weight, size, rounding --------------------------------------------------------------------------------------------------------

export const isSmall = (record: Pick<SupportVehicleRecord, "tons">): boolean => record.tons < SV_WEIGHT_RULES.smallBelow;
const ceilHalf = (x: number): number => Math.ceil(tidy(x * 2)) / 2;
const ceilKg = (x: number): number => Math.ceil(tidy(x * 1000)) / 1000;
/** Up to the kilogram for a Small unit, up to the half ton for a larger one (p. 122). */
export const ceilLot = (record: Pick<SupportVehicleRecord, "tons">, x: number): number => (isSmall(record) ? ceilKg(x) : ceilHalf(x));

export const svMotiveRowOf = (record: Pick<SupportVehicleRecord, "motive">): SvMotive | undefined => svMotiveOf(record.motive);
export const isAir = (record: Pick<SupportVehicleRecord, "motive">): boolean => svMotiveRowOf(record)?.air === true;

/** The Master Support Vehicle Weight Table row for the motive type and weight; undefined where the motive type is unknown or the weight is over its greatest. A weight in a gap between two bands (100.25 tons) reads as the band above. */
export function weightRowOf(record: Pick<SupportVehicleRecord, "motive" | "tons">): SvWeightRow | undefined {
  const rows = SV_WEIGHTS.filter((r) => r.motive === record.motive);
  return rows.find((r) => record.tons <= r.max + 1e-9);
}
export const sizeOf = (record: Pick<SupportVehicleRecord, "motive" | "tons">): SvSize => (record.tons < SV_WEIGHT_RULES.smallBelow ? "small" : (weightRowOf(record)?.size ?? "large"));

/** The most a unit of this motive type and chassis may weigh: a naval unit with the hydrofoil modification stops at 100 tons (p. 119). */
export function maxTonsOf(record: Pick<SupportVehicleRecord, "motive" | "structure">): number | undefined {
  const row = svMotiveRowOf(record);
  if (row === undefined) return undefined;
  return record.motive === "naval" && record.structure.mods.includes("hydrofoil") ? 100 : row.maxTons;
}

/** The least Structural Tech Rating: the weight row's, raised by the chassis modifications chosen (p. 122). */
export function minRatingOf(record: Pick<SupportVehicleRecord, "motive" | "tons" | "structure">): TechRating | undefined {
  const row = weightRowOf(record);
  if (row === undefined) return undefined;
  const letters = [row.minRating, ...record.structure.mods.flatMap((m) => svModOf(m)?.minRating ?? [])];
  return letters.reduce((a, b) => (a > b ? a : b));
}

const rating = (letter: string): TechRating | undefined => (letter.length === 1 && letter >= "A" && letter <= "F" ? (letter as TechRating) : undefined);

// ---- Locations ---------------------------------------------------------------------------------------------------------------------

export const SV_LOCATION_NAMES: Record<string, string> = { f: "Front", l: "Left Side", r: "Right Side", b: "Rear", fl: "Front Left", fr: "Front Right", bl: "Rear Left", br: "Rear Right", t: "Turret", rot: "Rotor", body: "Body" };
const AIR_NAMES: Record<string, string> = { f: "Nose", l: "Left Wing", r: "Right Wing", b: "Aft" };

/** A location's display name; a code we do not know prints as itself in quotes, never as "undefined". */
export function svLocationName(code: string, record?: Pick<SupportVehicleRecord, "motive">): string {
  if (record !== undefined && isAir(record) && own(AIR_NAMES, code)) return AIR_NAMES[code] ?? code;
  return own(SV_LOCATION_NAMES, code) ? (SV_LOCATION_NAMES[code] ?? code) : `"${code}"`;
}

/** True for a ground unit on the Large Ground Vehicle sheet: a Large hover, tracked, wheeled or WiGE unit (p. 119). */
export const onLargeSheet = (record: Pick<SupportVehicleRecord, "motive" | "tons">): boolean => (svMotiveRowOf(record)?.hasLargeSheet ?? false) && sizeOf(record) === "large";

/** The locations that hold armor (and structure, except for an air unit, whose structure is one number), in the order the sheet draws them. */
export function armorLocations(record: Pick<SupportVehicleRecord, "motive" | "tons" | "turret"> & Partial<Pick<SupportVehicleRecord, "structure">>): string[] {
  const row = svMotiveRowOf(record);
  if (row === undefined) return [];
  if (row.air) return ["f", "l", "r", "b"];
  if (record.motive === "vtol") return ["f", "l", "r", "b", "rot"];
  const sides = onLargeSheet(record) ? ["f", "fl", "fr", "bl", "br", "b"] : ["f", "l", "r", "b"];
  return [...sides, ...(record.turret && canHaveTurret(record) ? ["t"] : [])];
}
/** The locations an item may sit in: the armor locations but the rotor, and the body. */
export const mountLocations = (record: Pick<SupportVehicleRecord, "motive" | "tons" | "turret">): string[] => [...armorLocations(record).filter((l) => l !== "rot"), "body"];

/** A turret goes on any unit but a VTOL, an airship and a fixed-wing unit (p. 124). A convertible chassis has none. */
export const canHaveTurret = (record: Pick<SupportVehicleRecord, "motive"> & Partial<Pick<SupportVehicleRecord, "structure">>): boolean => {
  const row = svMotiveRowOf(record);
  return row !== undefined && !row.air && record.motive !== "vtol" && record.structure?.mods.includes("convertible") !== true;
};

// ---- New record --------------------------------------------------------------------------------------------------------------------

export interface NewSvFields {
  id?: string;
  chassis?: string;
  model?: string;
  motive: SvMotiveId;
  techBase?: TechBase | "mixed";
  year?: number | null;
  era?: string;
  rulesLevel?: RulesLevel;
  tons: number;
  cruise?: number;
  editionId?: string;
}

const MOTIVE_START_TONS: Record<SvMotiveId, number> = { airship: 20, "fixed-wing": 10, hover: 10, naval: 20, tracked: 20, vtol: 10, wheeled: 10, wige: 10 };
export const startTons = (motive: string): number => own(MOTIVE_START_TONS, motive) ?? 10;

/** A bare unit: the least structural rating the weight allows, an internal combustion engine of that rating, no armor and nothing aboard. The rules check says what it lacks. */
export function newSvRecord(fields: NewSvFields): SupportVehicleRecord {
  const base: SupportVehicleRecord = {
    schema: 1,
    id: fields.id ?? crypto.randomUUID(),
    editionId: fields.editionId ?? DEFAULT_EDITION,
    name: { chassis: fields.chassis ?? "", model: fields.model ?? "" },
    motive: fields.motive,
    techBase: fields.techBase ?? "inner-sphere",
    year: fields.year ?? null,
    tons: fields.tons,
    structure: { rating: "D", mods: [] },
    cruise: fields.cruise ?? (svMotiveOf(fields.motive)?.air === true ? (fields.motive === "airship" ? 1 : 3) : 3),
    engine: { type: "ice", rating: "D" },
    fuelTons: 0,
    turret: false,
    armor: { bar: 2, rating: "D", points: {} },
    fireControl: "none",
    extraCrew: 0,
    heatSinks: { count: 0 },
    mounts: [],
    notes: {},
  };
  if (fields.era !== undefined) base.era = fields.era;
  if (fields.rulesLevel !== undefined) base.rulesLevel = fields.rulesLevel;
  const min = minRatingOf(base) ?? "D";
  const start = min > "D" ? min : "D";
  base.structure.rating = start;
  base.engine.rating = start;
  base.armor.rating = start;
  for (const loc of armorLocations(base)) base.armor.points[loc] = 0;
  return base;
}

// ---- Reading a record from storage, a file or an import ----------------------------------------------------------------------------

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

const MOUNT_KEYS = ["id", "equipmentId", "name", "location", "amount", "qty", "munition", "pintle"] as const;
function mountOf(v: Record<string, unknown>, index: number): SvMount {
  const mount: SvMount = { ...unknownKeys(v, MOUNT_KEYS), id: str(v.id, `mount-${String(index + 1)}`), equipmentId: isString(v.equipmentId) ? v.equipmentId : null, name: str(v.name, ""), location: str(v.location, "body") };
  if (isNumber(v.amount)) mount.amount = v.amount;
  if (isNumber(v.qty)) mount.qty = v.qty;
  if (isString(v.munition)) mount.munition = v.munition;
  if (v.pintle === true) mount.pintle = true;
  return mount;
}

const RECORD_KEYS = ["schema", "id", "editionId", "name", "motive", "techBase", "year", "era", "rulesLevel", "tons", "structure", "cruise", "engine", "fuelTons", "turret", "armor", "fireControl", "extraCrew", "heatSinks", "mounts", "official", "notes", "picture"] as const;

function officialOf(v: unknown): OfficialMark | undefined {
  if (!isObject(v) || (v.status !== "official" && v.status !== "not-official")) return undefined;
  const mark: OfficialMark = { status: v.status };
  if (isString(v.book)) mark.book = v.book;
  if (isNumber(v.page)) mark.page = v.page;
  if (isString(v.design)) mark.design = v.design;
  return mark;
}

/**
 * Reads a record from storage, a file or an import. Every field this version knows is filled with its default where it is missing or not of its kind; motive
 * types, locations, engines and chassis modifications are kept whatever they are; keys this version does not know are kept as they are. Undefined only for what is
 * not a record at all: not an object, or a schema other than 1. `fallbackId` is the id of a record that has none (its storage key, or a fresh one).
 */
export function withDefaults(value: unknown, fallbackId = ""): SupportVehicleRecord | undefined {
  if (!isObject(value) || (value.schema !== undefined && value.schema !== 1)) return undefined;
  const v = value;
  const record: SupportVehicleRecord = {
    ...unknownKeys(v, RECORD_KEYS),
    schema: 1,
    id: str(v.id, fallbackId),
    editionId: str(v.editionId, DEFAULT_EDITION),
    name: part<SupportVehicleRecord["name"]>(v.name, ["chassis", "model"], (o) => ({ chassis: str(o.chassis, ""), model: str(o.model, "") })),
    motive: str(v.motive, "wheeled"),
    techBase: isString(v.techBase) ? (v.techBase as SupportVehicleRecord["techBase"]) : "inner-sphere",
    year: isNumber(v.year) ? v.year : null,
    tons: num(v.tons, 0),
    structure: part<SupportVehicleRecord["structure"]>(v.structure, ["rating", "mods"], (o) => ({ rating: str(o.rating, "D"), mods: Array.isArray(o.mods) ? o.mods.filter(isString) : [] })),
    cruise: num(v.cruise, 0),
    engine: part<SupportVehicleRecord["engine"]>(v.engine, ["type", "rating", "alternateFuel"], (o) => ({ type: str(o.type, "ice"), rating: str(o.rating, "D"), ...(o.alternateFuel === true ? { alternateFuel: true } : {}) })),
    fuelTons: num(v.fuelTons, 0),
    turret: v.turret === true,
    armor: part<SupportVehicleRecord["armor"]>(v.armor, ["bar", "rating", "points"], (o) => ({
      bar: num(o.bar, 2),
      rating: str(o.rating, "D"),
      points: isObject(o.points) ? (Object.fromEntries(Object.entries(o.points).filter(([, n]) => isNumber(n))) as Record<string, number>) : {},
    })),
    fireControl: v.fireControl === "basic" || v.fireControl === "advanced" ? v.fireControl : "none",
    extraCrew: num(v.extraCrew, 0),
    heatSinks: part<SupportVehicleRecord["heatSinks"]>(v.heatSinks, ["count"], (o) => ({ count: num(o.count, 0) })),
    mounts: Array.isArray(v.mounts) ? v.mounts.filter(isObject).map(mountOf) : [],
    notes: isObject(v.notes) ? (Object.fromEntries(Object.entries(v.notes).filter(([, n]) => isString(n))) as Record<string, string>) : {},
  };
  if (isString(v.era)) record.era = v.era;
  if (isString(v.rulesLevel)) record.rulesLevel = v.rulesLevel as RulesLevel;
  const official = officialOf(v.official);
  if (official) record.official = official;
  if (isObject(v.picture) && isString(v.picture.dataUrl)) record.picture = { dataUrl: v.picture.dataUrl };
  return record;
}

// ---- Chassis (Step 1) --------------------------------------------------------------------------------------------------------------

/** Item slots: 5 plus 1 for every 10 tons, down (p. 120). */
export const baseSlots = (record: Pick<SupportVehicleRecord, "tons">): number => SV_SLOTS.base + Math.floor(tidy(record.tons / SV_SLOTS.perTons));

/** The chassis weight: Base Chassis Value x the Tech Rating multiplier x every modification's multiplier x the tons, up to the lot (p. 122). null where the weight row or rating is not known. */
export function structureTons(record: SupportVehicleRecord): number | null {
  const row = weightRowOf(record);
  const letter = rating(record.structure.rating);
  if (row === undefined || letter === undefined) return null;
  const mods = record.structure.mods.reduce((product, id) => product * (svModOf(id)?.multiplier ?? 1), 1);
  return ceilLot(record, row.chassis * TECH_MULTIPLIER[letter] * mods * record.tons);
}

/** Structure points in each location, the turret and rotor included: a tenth of the tons, up (p. 123). An air unit has structural integrity instead. */
export const structurePoints = (record: Pick<SupportVehicleRecord, "tons">): number => Math.ceil(tidy(record.tons * SV_STRUCTURE.share));

// ---- Engine and controls (Step 2) --------------------------------------------------------------------------------------------------

/** The Movement Factor: 4 plus the square of the Cruising MP (the Safe Thrust of an air unit) (p. 127). */
export const movementFactor = (record: Pick<SupportVehicleRecord, "cruise">): number => 4 + record.cruise * record.cruise;
/** Flank MP: cruising x 1.5, up. For an air unit Maximum Thrust: safe x 1.5, up (an airship's to a quarter) (p. 127). */
export function flankMP(record: Pick<SupportVehicleRecord, "cruise" | "motive">): number {
  const raw = tidy(record.cruise * SV_SPEED.flank);
  if (record.motive === "airship") return Math.ceil(tidy(raw / SV_SPEED.airshipStep)) * SV_SPEED.airshipStep;
  return Math.ceil(raw);
}
/** Hydrofoil: the Cruising MP is multiplied by 1.25, rounded normally, for the play figure (p. 123). The engine is sized on the base figure. */
export const playCruise = (record: Pick<SupportVehicleRecord, "cruise" | "motive" | "structure">): number => (record.motive === "naval" && record.structure.mods.includes("hydrofoil") ? Math.floor(tidy(record.cruise * 1.25) + 0.5) : record.cruise);

/** True for a Trailer built with no engine (p. 126): record an engine of type `none`. */
export const hasNoEngine = (record: Pick<SupportVehicleRecord, "engine">): boolean => record.engine.type === "none";

/** The engine's multiplier by its type and Tech Rating; null where the table prints NA or the type is not known. */
export function engineMultiplier(record: Pick<SupportVehicleRecord, "engine">): number | null {
  const engine = svEngineOf(record.engine.type);
  const letter = rating(record.engine.rating);
  if (engine === undefined || letter === undefined) return null;
  return engine.multiplier["ABCDEF".indexOf(letter)] ?? null;
}

/** Engine weight (p. 126-127): the weight, then the minimum: fission and Tech Rating C fusion 5 tons, other fusion 0.25 tons, a hover unit a fifth of its tons. null where a figure is not known. */
export function engineTons(record: SupportVehicleRecord): number | null {
  if (hasNoEngine(record)) return 0;
  const row = weightRowOf(record);
  const multiplier = engineMultiplier(record);
  if (row === undefined || multiplier === null) return null;
  let tons = ceilLot(record, row.engine * movementFactor(record) * multiplier * record.tons);
  const letter = rating(record.engine.rating);
  if (record.engine.type === "fission" || (record.engine.type === "fusion" && letter === "C")) tons = Math.max(tons, ENGINE_MINIMUMS.fissionTons);
  else if (record.engine.type === "fusion") tons = Math.max(tons, ENGINE_MINIMUMS.fusionTons);
  if (record.motive === "hover") tons = Math.max(tons, ceilLot(record, record.tons * ENGINE_MINIMUMS.hoverShare));
  return tons;
}
/** The engine rating of the errata: Cruising MP (Safe Thrust) times the tons, to 500 at most (v8.0, p. 126). */
export const engineRating = (record: Pick<SupportVehicleRecord, "cruise" | "tons">): number => Math.min(500, Math.ceil(tidy(record.cruise * record.tons)));

/** A sentence for the engine when the book's minimum weight made it heavier than the formula, else undefined (p. 126 and the errata). */
export function engineMinimumNote(record: SupportVehicleRecord): string | undefined {
  const row = weightRowOf(record);
  const multiplier = engineMultiplier(record);
  const actual = engineTons(record);
  if (row === undefined || multiplier === null || actual === null || hasNoEngine(record)) return undefined;
  const formula = ceilLot(record, row.engine * movementFactor(record) * multiplier * record.tons);
  if (actual <= formula) return undefined;
  const why =
    record.motive === "hover" && actual === ceilLot(record, record.tons * ENGINE_MINIMUMS.hoverShare) ? "a hover unit's engine weighs at least a fifth of the unit"
    : record.engine.type === "fusion" && actual === ENGINE_MINIMUMS.fusionTons ? "a fusion engine weighs at least a quarter ton"
    : "a fission engine, and a Tech Rating C fusion engine, weigh at least 5 tons";
  return `The formula gives ${String(formula)} tons, but ${why}, so the engine weighs ${String(actual)} tons with the same performance.`;
}

export const isFusionLike = (record: Pick<SupportVehicleRecord, "engine">): boolean => record.engine.type === "fusion" || record.engine.type === "fission";

/** The share of the engine weight in fuel for each 100 km; null for an engine that needs none. */
export function fuelPercent(record: Pick<SupportVehicleRecord, "engine">): number | null {
  const engine = svEngineOf(record.engine.type);
  if (engine === undefined || engine.fuelPercent === null) return null;
  return record.engine.type === "ice" && record.engine.alternateFuel === true ? ALTERNATE_FUEL_PERCENT : engine.fuelPercent;
}

/** Kilograms of fuel in one Fuel Point of an air unit (p. 126): by size class and engine Tech Rating, times 0.75 for an airship or a prop-driven unit, up to the kilogram. */
export function fuelPointKg(record: SupportVehicleRecord): number | null {
  const letter = rating(record.engine.rating);
  if (letter === undefined) return null;
  const kg = AIR_FUEL_KG[sizeOf(record)][ "ABCDEF".indexOf(letter)];
  if (kg === undefined) return null;
  return record.motive === "airship" || record.structure.mods.includes("prop") ? Math.ceil(tidy(kg * AIR_FUEL_PROP_FACTOR)) : kg;
}
/** An air unit powered by solar, fission or fusion that is an airship or prop-driven needs no fuel; neither does a unit whose engine burns none. */
export function needsFuel(record: SupportVehicleRecord): boolean {
  if (hasNoEngine(record)) return false;
  const engine = svEngineOf(record.engine.type);
  if (engine === undefined) return false;
  if (isAir(record)) {
    const noFuelEngine = record.engine.type === "solar" || record.engine.type === "fission" || record.engine.type === "fusion";
    return !((record.motive === "airship" || record.structure.mods.includes("prop")) && noFuelEngine);
  }
  return engine.fuelPercent !== null;
}
/** Fuel Points an air unit's fuel gives, or the range in km of a ground unit; null where it needs none or a figure is not known. */
export function fuelPoints(record: SupportVehicleRecord): number | null {
  if (!isAir(record) || !needsFuel(record)) return null;
  const kg = fuelPointKg(record);
  return kg === null ? null : Math.floor(tidy((record.fuelTons * 1000) / kg));
}
export function rangeKm(record: SupportVehicleRecord): number | null {
  if (isAir(record) || !needsFuel(record)) return null;
  const engine = engineTons(record);
  const percent = fuelPercent(record);
  if (engine === null || engine === 0 || percent === null) return null;
  return Math.floor(tidy(((record.fuelTons / engine) * 100) / percent) * 100);
}
/** The fuel weight a desired range needs (p. 128): the range in hundreds of km times the share of the engine weight, up to the lot. */
export function fuelTonsForRange(record: SupportVehicleRecord, km: number): number | null {
  const engine = engineTons(record);
  const percent = fuelPercent(record);
  if (engine === null || percent === null) return null;
  return ceilLot(record, engine * (percent / 100) * (km / 100));
}

/** Structural integrity of an air unit (p. 130): a fixed-wing unit's Safe Thrust; an airship's Safe Thrust or a fiftieth of its tons (down), at least 1. Whole numbers: a part is taken up. null for other motive types. */
export function structuralIntegrity(record: Pick<SupportVehicleRecord, "motive" | "cruise" | "tons">): number | null {
  if (record.motive === "fixed-wing") return Math.max(1, Math.ceil(tidy(record.cruise)));
  if (record.motive === "airship") return Math.max(SV_AIRSHIP_SI.min, Math.ceil(tidy(Math.max(record.cruise, Math.floor(tidy(record.tons * SV_AIRSHIP_SI.share))))));
  return null;
}

// ---- Armor (Step 4) ----------------------------------------------------------------------------------------------------------------

/** The most armor points: 4 plus a share per ton, down (p. 134). null for an unknown motive type. */
export function maxArmorPoints(record: Pick<SupportVehicleRecord, "motive" | "tons">): number | null {
  return own(SV_ARMOR_MAX, record.motive) === undefined ? null : Math.floor(tidy(SV_ARMOR_BASE + (SV_ARMOR_MAX[record.motive as SvMotiveId] ?? 0) * record.tons));
}
/** The armor table's cell for the BAR and Tech Rating: undefined for NA or a pair the table does not hold. */
export function armorCell(bar: number, letter: string): { kg: number; armoredOnly?: true } | undefined {
  const row = own(SV_ARMOR_KG as Record<string, ({ kg: number; armoredOnly?: true } | null)[]>, String(bar));
  const col = "ABCDEF".indexOf(letter);
  return col < 0 ? undefined : (row?.[col] ?? undefined);
}
export const armoredOnlyBar = (record: Pick<SupportVehicleRecord, "armor">): boolean => armorCell(record.armor.bar, record.armor.rating)?.armoredOnly === true;
/** The points assigned to the locations the unit has. */
export const assignedArmor = (record: Pick<SupportVehicleRecord, "motive" | "tons" | "turret" | "armor">): number => armorLocations(record).reduce((sum, loc) => sum + (record.armor.points[loc] ?? 0), 0);
/** Armor weight: points x kilograms per point, up to the lot (p. 134); null where the table has no such armor. */
export function armorTons(record: SupportVehicleRecord): number | null {
  const cell = armorCell(record.armor.bar, record.armor.rating);
  if (cell === undefined) return null;
  return ceilLot(record, (assignedArmor(record) * cell.kg) / 1000);
}
/** The points a weight of this armor gives: 1,000 over the kilograms per point, down, for each ton (p. 134). */
export function pointsPerTon(record: Pick<SupportVehicleRecord, "armor">): number | null {
  const cell = armorCell(record.armor.bar, record.armor.rating);
  return cell === undefined ? null : Math.floor(tidy(1000 / cell.kg));
}
/** BAR 10 armor at Tech Rating E or F takes the slots of ferro-fibrous armor (errata v8.0 to p. 134); no other armor takes any. */
export function armorSlots(record: Pick<SupportVehicleRecord, "armor">): number {
  return record.armor.bar === 10 ? (own(SV_BAR10_SLOTS as Record<string, number>, record.armor.rating) ?? 0) : 0;
}
export const BAR_CHOICES: readonly number[] = BARS;

// ---- Equipment (Step 5) ------------------------------------------------------------------------------------------------------------

/** Words that make a machine gun or nail and rivet gun bin a half ton at least (p. 137). */
export const SMALL_BIN = /(^|-)(machine-gun|nail-rivet|nail|rivet)(-|$)/;
export const AMMO_MIN_TONS = 1;
export const AMMO_SMALL_MIN_TONS = 0.5;

/** The rows that never mount on a Support Vehicle although the combat vehicle tables list them: the turret is a record flag, and the book prints NA in the Support Vehicle column for the rest (pp. 342-345). */
const NOT_ON_SV = /^(turret-|extended-fuel-tank-|seating-combat-crew-)/;

/** The Support Vehicle slot column (pp. 341-345), read from the row's own note; a row with no note has the combat vehicle figure. null for a row Support Vehicles may not carry. */
export function svSlotsOf(row: EquipmentRow): number | null {
  if (NOT_ON_SV.test(row.id)) return null;
  if (/^(bay-door-|seating-)/.test(row.id)) return 0;
  const note = row.by?.vehicle?.note ?? "";
  const m = /support vehicle(?: only)?: (\d+)/i.exec(note);
  if (m?.[1] !== undefined) return Number(m[1]);
  if (/large support vehicle only/i.test(note)) return 1;
  return typeof row.by?.vehicle?.slots === "number" ? row.by.vehicle.slots : 1;
}
/** True for a row a Large unit only may carry (the naval comm-scanner suites and the space mine dispenser: "large support vehicle only"). */
export const largeOnly = (row: EquipmentRow): boolean => /large support vehicle only/i.test(row.by?.vehicle?.note ?? "");

export interface SvItemFacts {
  row: EquipmentRow | undefined;
  /** Weight in tons of one; null where we cannot weigh the item. */
  tons: number | null;
  /** Slots of one. */
  slots: number;
  qty: number;
  heat: number;
  energy: boolean;
  ammo: boolean;
  weapon: boolean;
  /** A conventional infantry weapon (a Light or Medium weapon of a Small unit). */
  infantry: boolean;
}

export const rowOf = (mount: Pick<SvMount, "equipmentId">, record: Pick<SupportVehicleRecord, "editionId">, catalog: Catalog): EquipmentRow | undefined =>
  mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);

function pseudoMount(mount: SvMount, row: EquipmentRow): Mount {
  return { id: mount.id, equipmentId: row.id, name: mount.name, techBase: row.techBase, location: null, slot: null, ...(mount.amount === undefined ? {} : { amount: mount.amount }) };
}
function pseudoRecord(record: SupportVehicleRecord, row: EquipmentRow, catalog: Catalog): MechRecord {
  const mounts = record.mounts.flatMap((m) => {
    const r = rowOf(m, record, catalog);
    return r === undefined ? [] : [pseudoMount(m, r)];
  });
  return { editionId: record.editionId, tons: record.tons, configuration: "biped", mounts, chassis: { engine: { type: "standard", rating: engineTons(record) ?? 0 } }, id: row.id } as unknown as MechRecord;
}

/** Weight, slots and heat of one mount (one item; `qty` multiplies). A bin of ammunition weighs what the player chose (a ton to start). */
export function itemFacts(mount: SvMount, record: SupportVehicleRecord, catalog: Catalog): SvItemFacts {
  const row = rowOf(mount, record, catalog);
  const qty = Math.max(1, Math.floor(mount.qty ?? 1));
  if (row === undefined) return { row, tons: null, slots: 1, qty, heat: 0, energy: false, ammo: false, weapon: false, infantry: false };
  const by = row.by?.vehicle;
  const ammo = row.kind === "ammunition";
  const infantry = row.infantry !== undefined;
  let tons: number | null;
  if (infantry) {
    // A Light or Medium weapon: its own weight, and one clip free; more clips weigh a clip's kilograms each (p. 136).
    const clips = Math.max(1, Math.floor(mount.amount ?? 1));
    tons = (typeof row.tons === "number" ? row.tons : 0) + ((clips - 1) * (row.infantry?.ammoKg ?? 0)) / 1000;
  } else if (ammo) tons = mount.amount ?? AMMO_MIN_TONS;
  else if (row.tons === "vtol-booster-tons") tons = ceilHalf((engineTons(record) ?? 0) / 10);
  else if (typeof by?.tons === "number") tons = by.tons;
  else if (typeof row.tons === "number") tons = row.tons;
  else tons = catalog.factsOf(pseudoMount(mount, row), pseudoRecord(record, row, catalog))?.tons ?? null;
  const slots = svSlotsOf(row) ?? 1;
  const weapon = row.kind === "weapon" || infantry;
  return { row, tons, slots, qty, heat: by?.heat ?? row.heat ?? 0, energy: row.heavyEnergy === true || (row.kind === "weapon" && groupOf(row).id === "energy"), ammo, weapon, infantry };
}
export const ammoIdOf = (weaponId: string): string => `ammo-${weaponId}`;

/** Items that need no gunner: point defense and the like (p. 133: only items that need a Gunnery roll and reach beyond 1 hex). */
const NO_GUNNER = /^(ams-|laser-anti-missile|a-pods|b-pods|m-pod|chaff|sprayer|searchlight|vehicular-mine|vehicular-grenade|taser|remote-sensor)/;
/** A weapon whose crew counts toward the gunners. */
export function needsGunner(facts: SvItemFacts): boolean {
  const row = facts.row;
  if (row === undefined || !facts.weapon || facts.ammo) return false;
  if (NO_GUNNER.test(row.id)) return false;
  if (facts.infantry) return (row.infantry?.baseRange ?? 0) > 0 && row.infantry?.mode !== "Melee";
  const reach = row.range ?? row.modes?.[0]?.range;
  return reach === undefined ? true : reach[3] > 1 || reach[2] > 1;
}

/** The heat of every heavy energy weapon fired together: the heat sinks the unit needs (p. 133). Infantry weapons make none. */
export function energyHeat(record: SupportVehicleRecord, catalog: Catalog): number {
  return record.mounts.reduce((sum, m) => {
    const facts = itemFacts(m, record, catalog);
    return facts.energy && !facts.infantry ? sum + facts.heat * facts.qty : sum;
  }, 0);
}

/** Weight of one mount (weight of one times how many). */
const totalOf = (facts: SvItemFacts): number | null => (facts.tons === null ? null : facts.tons * facts.qty);

/** The weight of the turret: a tenth of what is in it, ammunition left out, up to the lot; nothing without a turret (p. 124, 137). */
export function turretTons(record: SupportVehicleRecord, catalog: Catalog): number {
  if (!record.turret || !canHaveTurret(record)) return 0;
  const held = record.mounts.reduce((sum, m) => {
    if (m.location !== "t") return sum;
    const facts = itemFacts(m, record, catalog);
    return facts.ammo ? sum : sum + (totalOf(facts) ?? 0);
  }, 0);
  return held === 0 ? 0 : ceilLot(record, held * 0.1);
}
/** The pintle weight of a Small unit: 5 percent of what each pintle holds, to the kilogram (p. 137). */
export function pintleTons(record: SupportVehicleRecord, catalog: Catalog): number {
  if (!isSmall(record)) return 0;
  const bySide = new Map<string, number>();
  for (const m of record.mounts) {
    if (m.pintle !== true) continue;
    const facts = itemFacts(m, record, catalog);
    bySide.set(m.location, (bySide.get(m.location) ?? 0) + (totalOf(facts) ?? 0));
  }
  return [...bySide.values()].reduce((sum, held) => sum + ceilKg(held * 0.05), 0);
}
/** Power amplifiers: a tenth of the heavy energy weapons' weight, up to the half ton; none with a fission or fusion engine (p. 137). */
export function amplifierTons(record: SupportVehicleRecord, catalog: Catalog): number {
  if (isFusionLike(record) || isSmall(record)) return 0;
  const energy = record.mounts.reduce((sum, m) => {
    const facts = itemFacts(m, record, catalog);
    return facts.energy && !facts.infantry ? sum + (totalOf(facts) ?? 0) : sum;
  }, 0);
  return energy === 0 ? 0 : ceilHalf(energy * 0.1);
}

/** The weight of the heavy and medium weapons (ammunition left out): what fire control is a share of, and what gunners are counted from. */
export function weaponTons(record: SupportVehicleRecord, catalog: Catalog, onlyGunnery = false): number {
  return record.mounts.reduce((sum, m) => {
    const facts = itemFacts(m, record, catalog);
    if (!facts.weapon || facts.ammo) return sum;
    if (onlyGunnery && !needsGunner(facts)) return sum;
    return sum + (totalOf(facts) ?? 0);
  }, 0);
}
/** Fire control weight: 5 or 10 percent of the weapons' weight, up to the lot (TM p. 217). */
export function fireControlTons(record: SupportVehicleRecord, catalog: Catalog): number {
  if (record.fireControl === "none") return 0;
  const tons = weaponTons(record, catalog);
  return tons === 0 ? 0 : ceilLot(record, tons * SV_FIRE_CONTROL.weight[record.fireControl]);
}

// ---- Crew --------------------------------------------------------------------------------------------------------------------------

export interface CrewTally {
  base: number;
  nonGunners: number;
  gunners: number;
  officers: number;
  minimum: number;
  crew: number;
}

/** Gunners (p. 131): a Small unit, one per weapon with no fire control and one per facing with basic or advanced (turret and pintle count as facings of their own); a larger one, the tons of weapons that need a gunner over 2, 3 or 4 (5 or 6 with advanced fire control on a Tech E or F chassis), up. */
export function gunners(record: SupportVehicleRecord, catalog: Catalog): number {
  if (isSmall(record)) {
    if (record.fireControl === "none") return record.mounts.reduce((sum, m) => (needsGunner(itemFacts(m, record, catalog)) ? sum + Math.max(1, Math.floor(m.qty ?? 1)) : sum), 0);
    const facings = new Set<string>();
    for (const m of record.mounts) if (needsGunner(itemFacts(m, record, catalog))) facings.add(m.pintle === true ? `pintle-${m.location}` : m.location);
    return facings.size;
  }
  const tons = weaponTons(record, catalog, true);
  if (tons === 0) return 0;
  const chassis = rating(record.structure.rating);
  const divisor = (record.fireControl === "advanced" && chassis !== undefined ? SV_FIRE_CONTROL.advancedByChassis[chassis] : undefined) ?? SV_FIRE_CONTROL.gunnerDivisor[record.fireControl];
  return Math.ceil(tidy(tons / divisor));
}

/** The crew the rules ask for and the crew the unit carries: base, non-gunners (communications gear per ton, field kitchens, MASH theaters), gunners and officers (p. 131). */
export function crewTally(record: SupportVehicleRecord, catalog: Catalog): CrewTally {
  const air = record.motive === "airship" || record.motive === "naval";
  const size = sizeOf(record);
  const base = record.structure.mods.includes("trailer") && hasNoEngine(record) ? SV_CREW.base.trailer : size === "small" ? SV_CREW.base.small : size === "large" ? SV_CREW.base.large : air ? SV_CREW.base.mediumAirNaval : SV_CREW.base.medium;
  let nonGunners = 0;
  for (const m of record.mounts) {
    const facts = itemFacts(m, record, catalog);
    const id = facts.row?.id ?? "";
    if (/^communications-equipment-/.test(id)) nonGunners += SV_CREW.perTonCommunications * Math.ceil((m.amount ?? facts.tons ?? 0) * facts.qty);
    else if (/^field-kitchen-/.test(id)) nonGunners += SV_CREW.perFieldKitchen * facts.qty;
    else if (/^mash-/.test(id)) nonGunners += SV_CREW.perMash * facts.qty;
  }
  const g = gunners(record, catalog);
  const nonOfficer = base + nonGunners + g;
  const officers = nonOfficer >= SV_CREW.officerFrom ? Math.ceil(tidy(nonOfficer / SV_CREW.officerEvery)) : 0;
  const minimum = nonOfficer + officers;
  return { base, nonGunners, gunners: g, officers, minimum, crew: minimum + Math.max(0, Math.floor(record.extraCrew)) };
}
/** The seats a Small unit must weigh: one for every crew member and passenger (p. 133); counted from the seating items and the infantry compartments (30 troops each, errata v8.0). */
export function seatsAboard(record: SupportVehicleRecord, catalog: Catalog): number {
  return record.mounts.reduce((sum, m) => {
    const id = rowOf(m, record, catalog)?.id ?? "";
    return /^seating-(standard|pillion)-/.test(id) || /^ejection-seat-/.test(id) ? sum + Math.max(1, Math.floor(m.qty ?? 1)) : sum;
  }, 0);
}
export { SEAT_TONS, SV_ROTOR_MAX };

// ---- Weight and slots --------------------------------------------------------------------------------------------------------------

export interface TallyLine {
  label: string;
  tons: number;
}
export interface SvTally {
  lines: TallyLine[];
  total: number;
  unknown: string[];
}

export function svTally(record: SupportVehicleRecord, catalog: Catalog): SvTally {
  const unknown: string[] = [];
  let equipment = 0;
  let ammunition = 0;
  for (const m of record.mounts) {
    const facts = itemFacts(m, record, catalog);
    const tons = totalOf(facts);
    if (tons === null) {
      unknown.push(m.name || "an unnamed item");
      continue;
    }
    if (facts.ammo) ammunition += tons;
    else equipment += tons;
  }
  const structure = structureTons(record);
  if (structure === null) unknown.push("the chassis");
  const engine = engineTons(record);
  if (engine === null) unknown.push("the engine");
  const armor = armorTons(record);
  if (armor === null) unknown.push("the armor");
  const items = ceilLot(record, equipment + ammunition);
  const lines: TallyLine[] = [
    { label: "Chassis", tons: structure ?? 0 },
    { label: "Engine", tons: engine ?? 0 },
    { label: "Fuel", tons: record.fuelTons },
    { label: "Heat sinks", tons: record.heatSinks.count },
    { label: "Armor", tons: armor ?? 0 },
    { label: "Turret", tons: turretTons(record, catalog) },
    { label: "Pintle mounts", tons: pintleTons(record, catalog) },
    { label: "Power amplifiers", tons: amplifierTons(record, catalog) },
    { label: "Fire control", tons: fireControlTons(record, catalog) },
    { label: "Weapons, equipment and ammunition", tons: items },
  ].filter((line) => line.tons !== 0 || line.label === "Armor");
  return { lines, total: tidy(lines.reduce((sum, l) => sum + l.tons, 0)), unknown };
}

/** Quarters: one slot for every 50 steerage, 20 crew or second-class and 5 officer or first-class quarters (p. 132). */
const QUARTERS_PER_SLOT: [RegExp, number][] = [[/^quarters-steerage-/, 50], [/^quarters-(second-class|crew)-/, 20], [/^quarters-(first-class|officer)-/, 5]];

export interface SlotTally {
  available: number;
  used: number;
  lost: { label: string; slots: number }[];
}
/** Item slots: 5 plus 1 for every 10 tons, less what BAR 10 armor of Tech Rating E or F takes, against the items mounted (pp. 120, 134, 341-345). */
export function slotTally(record: SupportVehicleRecord, catalog: Catalog): SlotTally {
  const lost = [{ label: "armor", slots: armorSlots(record) }].filter((l) => l.slots !== 0);
  const available = baseSlots(record) - lost.reduce((sum, l) => sum + l.slots, 0);
  const used = record.mounts.reduce((sum, m) => {
    const facts = itemFacts(m, record, catalog);
    // Quarters take a slot for each so many quarters (p. 132); every other item its own count.
    const places = QUARTERS_PER_SLOT.find(([pattern]) => pattern.test(facts.row?.id ?? ""))?.[1];
    return sum + (places === undefined ? facts.slots * facts.qty : Math.ceil(facts.qty / places));
  }, 0);
  return { available, used, lost };
}
