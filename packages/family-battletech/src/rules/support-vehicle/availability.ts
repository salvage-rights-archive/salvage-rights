// What a Support Vehicle's rules level, tech base, year and era offer it: the motive types, engines, chassis modifications, armor and equipment. The Classic
// pieces do the work (rules/availability.ts and rules/levels.ts); a Support Vehicle only says which unit type it is. Hide, do not mark: what the record does not
// reach is not listed, and a record already using one keeps it listed (the rules check reports it).
import { BARS, ENGINE_BARRED, SV_ARMOR_DATES, SV_ENGINES, SV_MODS, SV_MOTIVES } from "../../data/support-vehicle";
import type { SvMod } from "../../data/support-vehicle";
import { equipmentAvailable } from "../availability";
import type { Catalog, EquipmentRow } from "../catalog";
import { mountableOn } from "../catalog";
import { DEFAULT_LEVEL, levelAtLeast } from "../levels";
import { phaseIn, windowOf } from "../time";
import { subjectOf } from "../vehicle/availability";
import { isSmall, largeOnly, sizeOf, svSlotsOf } from "./sv";
import type { SupportVehicleRecord } from "./sv";

const level = (record: Pick<SupportVehicleRecord, "rulesLevel">) => record.rulesLevel ?? DEFAULT_LEVEL;

/** A Small unit mounts Light and Medium weapons only (the infantry table's Standard and Support weapons); a larger one mounts Heavy weapons only (TM p. 136). */
export function lightMedium(row: EquipmentRow): boolean {
  return row.infantry !== undefined && row.infantry.mode !== "Melee";
}

/** True when the row is one the unit's size may carry at all (before any level, tech base or year): printed for Support Vehicles, light or medium weapons on a Small unit, never on a larger one. */
export function mountsOnSize(row: EquipmentRow, record: Pick<SupportVehicleRecord, "tons" | "motive">): boolean {
  if (row.infantry !== undefined) return isSmall(record) && lightMedium(row);
  if (row.choiceFor !== undefined || !mountableOn(row, "vehicle") || svSlotsOf(row) === null) return false;
  if (isSmall(record) && row.kind === "weapon") return false;
  if (largeOnly(row) && sizeOf(record) !== "large") return false;
  return true;
}

/** An equipment row a Support Vehicle may be offered: printed for it, fitting its size, at the record's level, tech base and time. `everything` lifts the tech base and time. */
export function equipmentOffered(row: EquipmentRow, record: SupportVehicleRecord, catalog: Catalog, everything = false): boolean {
  if (!mountsOnSize(row, record)) return false;
  // An infantry weapon is a catalog row for infantry; the rest of the check is the one every unit uses, read as a BattleMech's.
  return equipmentAvailable({ ...row, units: ["mech"] }, subjectOf(record), catalog, everything);
}

/** An engine type the motive type may take (p. 127): a fixed-wing unit takes an electric one only with the propeller modification. */
export function enginePossible(id: string, record: Pick<SupportVehicleRecord, "motive" | "structure">): boolean {
  const engine = SV_ENGINES.find((e) => e.id === id);
  if (engine === undefined) return false;
  const barred = (ENGINE_BARRED as Record<string, string[]>)[record.motive] ?? [];
  if (barred.includes(id)) return false;
  return !(record.motive === "fixed-wing" && engine.electric && !record.structure.mods.includes("prop"));
}
export const engineChoices = (record: SupportVehicleRecord): [string, string][] =>
  SV_ENGINES.filter((e) => enginePossible(e.id, record) || e.id === record.engine.type).map((e): [string, string] => [e.id, e.label]);

/** True when a chassis modification fits the unit's motive type and size (p. 122 restrictions). */
export function modFits(mod: SvMod, record: Pick<SupportVehicleRecord, "motive" | "tons">): boolean {
  if (mod.motives !== undefined && !(mod.motives as string[]).includes(record.motive)) return false;
  return !(mod.small === true && !isSmall(record));
}
/** The modifications the record may have: those that fit its motive type and size and do not clash with one it holds, and the ones it holds. */
export function modChoices(record: SupportVehicleRecord): SvMod[] {
  return SV_MODS.filter((m) => record.structure.mods.includes(m.id) || (modFits(m, record) && !record.structure.mods.some((held) => m.excludes?.includes(held as never) === true || SV_MODS.find((x) => x.id === held)?.excludes?.includes(m.id) === true)));
}

/** The BAR levels the record's rules level, tech base and year offer, and its own (IO:AE printed p. 29: BAR 7 to 10 appear 2300 to 2470). */
export function barPossible(bar: number, record: SupportVehicleRecord): boolean {
  const dates = SV_ARMOR_DATES[bar];
  if (dates === undefined) return false;
  const phase = phaseIn([{ from: dates.production }], dates.prototype, windowOf(record));
  return phase === "production" || (phase === "prototype" && levelAtLeast(level(record), "experimental"));
}
export const barChoices = (record: SupportVehicleRecord): number[] => BARS.filter((bar) => bar === record.armor.bar || barPossible(bar, record));

/** The motive types the record's rules level offers, and its own. */
export const motiveChoices = (record: Pick<SupportVehicleRecord, "rulesLevel" | "motive">): [string, string][] =>
  SV_MOTIVES.filter((m) => m.id === record.motive || levelAtLeast(level(record), m.level)).map((m): [string, string] => [m.id, m.label]);
