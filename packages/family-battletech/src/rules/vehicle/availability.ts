// What a vehicle's rules level, tech base, year and era offer it: the motive types, engines, armor and equipment. The Classic pieces do the
// work (rules/availability.ts and rules/levels.ts); a vehicle only says which unit type it is. Hide, do not mark: what the record does not
// reach is not listed, and a record already using one keeps it listed (the rules check reports it).
import { ARMOR, ENGINE_TYPES } from "../../data/chassis";
import { MOTIVES, VEHICLE_ARMOR, VEHICLE_ENGINES } from "../../data/vehicle";
import { equipmentAvailable, partAvailable, partPhase, datedLabel } from "../availability";
import type { Catalog, EquipmentRow } from "../catalog";
import { mountableOn } from "../catalog";
import { DEFAULT_LEVEL, levelAtLeast } from "../levels";
import { partPrototype, partSpans } from "../time";
import { own } from "../walk";
import type { MechRecord } from "../mech";
import type { VehicleRecord } from "./vehicle";

/** A vehicle as the Classic availability functions read a record: the fields they look at, standing in for a BattleMech. */
export type Subject = Pick<MechRecord, "techBase" | "year" | "era" | "rulesLevel" | "unitType"> & { editionId: string };
export const subjectOf = (record: Pick<VehicleRecord, "techBase" | "year" | "era" | "rulesLevel" | "editionId">): Subject => ({
  techBase: record.techBase,
  year: record.year,
  era: record.era,
  rulesLevel: record.rulesLevel,
  unitType: "mech",
  editionId: record.editionId,
});

const level = (record: Pick<VehicleRecord, "rulesLevel">) => record.rulesLevel ?? DEFAULT_LEVEL;

/** An equipment row a vehicle may be offered: printed for vehicles, and at the record's level, tech base and time. `everything` lifts the tech base and time. */
export function equipmentOffered(row: EquipmentRow, record: VehicleRecord, catalog: Catalog, everything = false): boolean {
  if (!mountableOn(row, "vehicle")) return false;
  // The row as a BattleMech's: the unit check is ours (above); the rest is the one rule for every unit.
  return equipmentAvailable({ ...row, units: ["mech"] }, subjectOf(record), catalog, everything);
}

/** A part in the vehicle's tables: an ICE engine has no dates (TechManual p. 101 allows it to every vehicle), the rest follow the Classic part rules. */
export function enginePossible(key: string, record: VehicleRecord, everything = false): boolean {
  if (!VEHICLE_ENGINES.some((e) => e.id === key)) return false;
  return key === "ice" || partAvailable("engine", key, subjectOf(record), everything);
}
export function armorPossible(key: string, record: VehicleRecord, everything = false): boolean {
  if (!VEHICLE_ARMOR.some((a) => a.id === key)) return false;
  return partAvailable("armor", key, subjectOf(record), everything);
}

/** Select options: the engines the record may use, and its own even when it may not. */
export function engineChoices(record: VehicleRecord): [string, string][] {
  return VEHICLE_ENGINES.flatMap(({ id }): [string, string][] => {
    const row = own(ENGINE_TYPES.types, id) ? ENGINE_TYPES.types[id] : undefined;
    if (!row || !(enginePossible(id, record) || id === record.engine.type)) return [];
    const phase = id === "ice" ? "production" : partPhase(row, record);
    return [[id, id === "ice" ? row.name : datedLabel(row.name, partPrototype(row, record.techBase), partSpans(row, record.techBase)?.[0]?.from, phase)]];
  });
}
export function armorChoices(record: VehicleRecord): [string, string][] {
  return VEHICLE_ARMOR.flatMap(({ id }): [string, string][] => {
    const row = own(ARMOR.types, id) ? ARMOR.types[id] : undefined;
    if (!row || !(armorPossible(id, record) || id === record.armor.type)) return [];
    return [[id, datedLabel(row.name, partPrototype(row, record.techBase), partSpans(row, record.techBase)?.[0]?.from, partPhase(row, record))]];
  });
}

/** The motive types the record's rules level offers, and its own. */
export function motiveChoices(record: Pick<VehicleRecord, "rulesLevel" | "motive">): [string, string][] {
  return MOTIVES.filter((m) => m.id === record.motive || levelAtLeast(level(record), m.level)).map((m): [string, string] => [m.id, m.label]);
}
