// ProtoMech construction (TechManual pp. 80-89): the structure and armor limits, the engine, jump jets, Myomer Booster, heat sinks and armor,
// the weight of every mounted item and its ammunition, and the weight tally. Every figure is read from data/protomech.ts; this file only does the
// arithmetic. Kilograms throughout. Pure functions; nothing here throws, and a record that does not fit the tables (a weight the book has no row for,
// an item we do not know) gives undefined or null for that figure and a note in `unknown`, never a guess.
import { PROTO_AMMO_KG, PROTO_BANDED_KG, PROTO_CODES, PROTO_CONFIGS, PROTO_LAUNCHERS, PROTO_PARTS, PROTO_STRUCTURE } from "../../data/protomech";
import type { ProtoLauncher, ProtoLocation, ProtoStructureRow } from "../../data/protomech";
import { groupOf } from "../catalog";
import type { Catalog, EquipmentRow } from "../catalog";
import { engineTons } from "../mech";
import { own, tidy } from "../walk";
import { plainRun } from "./movement";
import { isGlider, isQuad, limitRows } from "./config";
import { armorTypeOf, cockpitKg, jumpSystemOf, torsoItemsLost, wingKg } from "./options";
import type { ProtoMount, ProtoRecord } from "./record";

/** The structure and armor row for the record's tonnage; undefined for a weight the table does not have. A quad has the Legs (Quad, All) column for its legs (IO:AE p. 95). */
export function structureRow(record: Pick<ProtoRecord, "tons" | "configuration">): ProtoStructureRow | undefined {
  const base = Number.isInteger(record.tons) ? own(PROTO_STRUCTURE.rows as Record<string, ProtoStructureRow>, String(record.tons)) : undefined;
  if (!base || !isQuad(record)) return base;
  return { ...base, structure: { ...base.structure, lg: base.quadLegs[0] }, armor: { ...base.armor, lg: base.quadLegs[1] } };
}

/** The locations the unit has: the main gun only when it carries one, and no arms on a quad. */
export const locationsOf = (record: Pick<ProtoRecord, "mainGun" | "configuration">): ProtoLocation[] =>
  PROTO_CODES.filter((code) => (code !== "mg" || record.mainGun) && (PROTO_CONFIGS[record.configuration ?? "biped"]?.arms !== false || (code !== "la" && code !== "ra")));

/** Total internal structure points, over the locations the unit has; null where the table has no row. */
export function structurePoints(record: ProtoRecord): number | null {
  const row = structureRow(record);
  return row ? locationsOf(record).reduce((sum, code) => sum + row.structure[code], 0) : null;
}

/** Total armor points placed, over the locations the unit has (points on a location it lacks are not counted; the check reports them). */
export const armorPoints = (record: ProtoRecord): number => locationsOf(record).reduce((sum, code) => sum + (record.armor[code] ?? 0), 0);

// ---- Movement and the engine ----------------------------------------------------------------------------------------------------

export { plainRun, runMP } from "./movement";

/** Engine rating: tons x Running MP (the unboosted one), between 1 and 400 (p. 83); a quad or a glider has tons x (Running or WiGE Flanking MP less 2) (IO:AE p. 95).
 * Null for a walk that is not a whole number of at least 1, and for a quad or glider so slow that the rating would be 0 or less. */
export function engineRating(record: ProtoRecord): number | null {
  if (!Number.isInteger(record.walk) || record.walk < 1) return null;
  const run = plainRun(record.walk) - (isQuad(record) || isGlider(record) ? PROTO_PARTS.quadRunOffset : 0);
  if (run < 1) return null;
  const raw = record.tons * run;
  // From rating 40 up the engine is one on the Master Engine Table, so the rating rounds up to a multiple of 5 (p. 84).
  return raw >= PROTO_PARTS.smallEngineBelow ? Math.ceil(raw / 5) * 5 : raw;
}

/** Engine weight in kilograms: 25 a point of rating below 40, else the Master Engine Table (p. 49) at the rating rounded up to a multiple of 5; null when the table has no such engine. */
export function engineKg(record: ProtoRecord): number | null {
  const rating = engineRating(record);
  if (rating === null || rating < 1 || rating > PROTO_PARTS.engineMaxRating) return null;
  if (rating < PROTO_PARTS.smallEngineBelow) return rating * PROTO_PARTS.smallEngineKgPerRating;
  const tons = engineTons("standard", rating);
  return tons === null ? null : tons * 1000;
}

export const structureKg = (record: ProtoRecord): number => record.tons * PROTO_PARTS.structureKgPerTon;
/** The weight of the jump jets or UMUs: the jump jet weight table, doubled for extended jump jets (IO:AE p. 59); null for a system we do not know. */
export function jumpJetKg(record: ProtoRecord): number | null {
  const system = jumpSystemOf(record);
  if (!system) return null;
  const per = PROTO_PARTS.jumpJetKg.find((band) => record.tons <= band.upTo)?.kg ?? (PROTO_PARTS.jumpJetKg.at(-1)?.kg ?? 0);
  return Math.max(0, record.jump) * per * system.kgFactor;
}
export const boosterKg = (record: ProtoRecord): number => (record.booster ? record.tons * PROTO_PARTS.boosterKgPerTon : 0);
export const heatSinkKg = (record: ProtoRecord): number => Math.max(0, record.heatSinks) * PROTO_PARTS.heatSinkKg;
/** The weight of the armor points: 50 kg each, 75 for Electric Discharge armor (IO:AE p. 59); null for an armor type we do not know. */
export const armorKg = (record: ProtoRecord): number | null => {
  const type = armorTypeOf(record);
  return type ? armorPoints(record) * type.kgPerPoint : null;
};

/** What a location holds at most: the Location Restrictions Table (p. 87) or the expanded one (IO:AE p. 95), with the torso cut by Electric Discharge armor and the partial wing. Undefined for a place that is not a location. */
export function limitOf(record: ProtoRecord, location: string): { items: number; kg: number | null } | undefined {
  const limit = own(limitRows(record), location);
  return limit && location === "t" ? { ...limit, items: Math.max(0, limit.items - torsoItemsLost(record)) } : limit;
}

// ---- Mounted items ------------------------------------------------------------------------------------------------------------

/** The launcher kind a mount is (the mount holds its family's catalog row), or undefined for any other item. */
export function launcherOf(mount: Pick<ProtoMount, "equipmentId">): { kind: string; launcher: ProtoLauncher } | undefined {
  const found = Object.entries(PROTO_LAUNCHERS.rows).find(([, launcher]) => launcher.row === mount.equipmentId);
  return found ? { kind: found[0], launcher: found[1] } : undefined;
}

/** The tubes a launcher mount has, whole and at least 1; a launcher with none stated is read as one tube. */
export const tubesOf = (mount: Pick<ProtoMount, "tubes">): number => (mount.tubes !== undefined && Number.isInteger(mount.tubes) && mount.tubes >= 1 ? mount.tubes : 1);

/** What a mount is called: a launcher by its tubes ("SRM 3"), anything else by its name. */
export function mountName(mount: ProtoMount): string {
  const launch = launcherOf(mount);
  return launch ? `${launch.launcher.label} ${String(tubesOf(mount))}` : mount.name;
}

export const rowOf = (catalog: Catalog, record: Pick<ProtoRecord, "editionId">, mount: Pick<ProtoMount, "equipmentId">): EquipmentRow | undefined =>
  mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);

/** The weight of one mounted item, in kilograms: a launcher by its tubes (p. 89), any other item at the catalog's tons x 1,000 (p. 87). Undefined when it cannot be weighed. */
export function mountKg(mount: ProtoMount, catalog: Catalog, record: Pick<ProtoRecord, "editionId" | "tons">): number | undefined {
  const launch = launcherOf(mount);
  if (launch) return tubesOf(mount) * launch.launcher.kgPerTube;
  const bands = mount.equipmentId === null ? undefined : own(PROTO_BANDED_KG.rows, mount.equipmentId);
  if (bands) return [...bands].reverse().find((band) => record.tons >= band.fromTons)?.kg;
  const tons = rowOf(catalog, record, mount)?.tons;
  return typeof tons === "number" ? Math.round(tons * 1000) : undefined;
}

/** The weight of the ammunition carried for a mount (the weight per shot x the shots, up to the next whole kilogram, p. 88); 0 for an item with none. */
export function ammoKg(mount: ProtoMount): number {
  const shots = mount.shots !== undefined && mount.shots > 0 ? mount.shots : 0;
  const launch = launcherOf(mount);
  if (launch) return Math.ceil(tidy(shots * tubesOf(mount) * launch.launcher.kgPerMissile));
  const per = mount.equipmentId === null ? undefined : own(PROTO_AMMO_KG.rows, mount.equipmentId);
  return per === undefined ? 0 : Math.ceil(tidy(shots * per));
}

/** Whether an item takes ammunition (so the editor asks for shots): launchers and the weapons the Ammunition Weight Table lists. */
export const usesAmmo = (mount: Pick<ProtoMount, "equipmentId">): boolean => launcherOf(mount) !== undefined || (mount.equipmentId !== null && own(PROTO_AMMO_KG.rows, mount.equipmentId) !== undefined);

/** An energy weapon, for the heat sinks it needs: the Energy group, and plasma weapons, which a ProtoMech treats as energy weapons (errata v8.0, p. 235). */
export const isEnergy = (row: EquipmentRow): boolean => row.kind === "weapon" && (groupOf(row).id === "energy" || row.id.startsWith("plasma-"));

/** The heat the unit's energy weapons make when all fire: the heat sinks it needs (p. 86). Items we cannot find count nothing (the check reports them). */
export function energyHeat(record: ProtoRecord, catalog: Catalog): number {
  let heat = 0;
  for (const mount of record.mounts) {
    const row = rowOf(catalog, record, mount);
    if (row && isEnergy(row) && row.heat !== undefined) heat += row.heat;
  }
  return heat;
}

// ---- The weight tally ----------------------------------------------------------------------------------------------------------

export interface WeightLine {
  label: string;
  kg: number;
}
export interface Tally {
  lines: WeightLine[];
  /** Kilograms spent; what could not be weighed is not in it. */
  total: number;
  /** The names of items and parts that could not be weighed. */
  unknown: string[];
}

export function tally(record: ProtoRecord, catalog: Catalog): Tally {
  const lines: WeightLine[] = [];
  const unknown: string[] = [];
  const add = (label: string, kg: number | null | undefined) => {
    if (kg === null || kg === undefined) unknown.push(label);
    else if (kg !== 0) lines.push({ label, kg });
  };
  add("Internal structure", structureKg(record));
  const rating = engineRating(record);
  add(rating === null ? "Engine" : `Engine, rating ${String(rating)}`, engineKg(record));
  add("Cockpit", cockpitKg(record));
  add(jumpSystemOf(record)?.label ?? "Jump system", jumpJetKg(record));
  add("Myomer Booster", boosterKg(record));
  add("Partial wing", wingKg(record));
  add("Heat sinks", heatSinkKg(record));
  add(armorTypeOf(record)?.label ?? "Armor", armorKg(record));
  for (const mount of record.mounts) {
    const name = mountName(mount) || "Unnamed item";
    add(name, mountKg(mount, catalog, record));
    const ammo = ammoKg(mount);
    if (ammo > 0) add(`${name} ammunition`, ammo);
  }
  return { lines, total: lines.reduce((sum, line) => sum + line.kg, 0), unknown };
}

/** What a location holds: its items (a launcher counts as one) and their weight, ammunition not counted (p. 87). */
export function holdsAt(record: ProtoRecord, catalog: Catalog, location: string): { items: number; kg: number; unknown: number } {
  let items = 0;
  let kg = 0;
  let unknown = 0;
  for (const mount of record.mounts) {
    if (mount.location !== location) continue;
    items += 1;
    const each = mountKg(mount, catalog, record);
    if (each === undefined) unknown += 1;
    else kg += each;
  }
  // The partial wing is a torso item (its slot is taken off the limit by limitOf) and its weight counts toward the torso's combined weight (book panel, TO:AUE p. 104, TM p. 87).
  if (location === "t") kg += wingKg(record);
  return { items, kg, unknown };
}
