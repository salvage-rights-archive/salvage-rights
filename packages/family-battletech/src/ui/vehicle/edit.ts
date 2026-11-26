// What the vehicle pages decide before a record is touched: the edit callback type, the new-unit starting values, the equipment on offer and small
// edits to a record. Pure functions; every book figure comes from data/vehicle.ts and rules/vehicle.
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { SMALL_BIN, armorLocations } from "../../rules/vehicle/vehicle";
import type { VehicleMount, VehicleRecord } from "../../rules/vehicle/vehicle";
import { equipmentOffered } from "../../rules/vehicle/availability";
import { motiveOf } from "../../data/vehicle";

/** An edit to a record, and the callback the page hands each panel: edits with the same `field` in a row (one visit to a field) are one Undo step. */
export type VehicleChange = (draft: VehicleRecord) => void;
export type VehicleOnEdit = (change: VehicleChange, field?: string) => void;

/** Where a motive type starts: a weight in its range that gives it a useful size (the heaviest it allows, or 20 tons for the light motive types). */
export const startTons = (motive: string): number => Math.min(motiveOf(motive)?.maxTons ?? 20, 20);

/** After the motive type or turret changes: a zero entry for each armor location the unit now has; points on a location it lacks stay (the rules check reports them), unless they are zero. */
export function syncArmorLocations(draft: VehicleRecord): void {
  const known = armorLocations(draft);
  for (const loc of known) draft.armor.points[loc] ??= 0;
  for (const [loc, n] of Object.entries(draft.armor.points)) if (n === 0 && !known.includes(loc)) delete draft.armor.points[loc];
}

/** A mount id no mount of the record has. */
export function freshMountId(record: Pick<VehicleRecord, "mounts">): string {
  for (let n = record.mounts.length + 1; ; n += 1) if (!record.mounts.some((m) => m.id === `mount-${String(n)}`)) return `mount-${String(n)}`;
}

/** The mount for an item put in a location: ammunition starts at its least bin. Items with no firing arc (ammunition and the rest) default to the body. */
export function mountFor(record: Pick<VehicleRecord, "mounts">, row: EquipmentRow, location: string): VehicleMount {
  const small = SMALL_BIN.test(row.id.replace(/^ammo-/, ""));
  return { id: freshMountId(record), equipmentId: row.id, name: row.name, location, ...(row.kind === "ammunition" ? { amount: small ? 0.5 : 1 } : {}) };
}

/** The locations mounts sit in that the vehicle does not have, in the order first met: they stay visible and can be moved. */
export function strayLocations(record: Pick<VehicleRecord, "mounts">, known: string[]): string[] {
  return [...new Set(record.mounts.map((m) => m.location).filter((loc) => !known.includes(loc)))];
}

/** The catalog rows a vehicle is offered: those printed for vehicles at its level, tech base and time (`everything` lifts the tech base and time); `keep` stays on offer. */
export function offeredEquipment(record: VehicleRecord, catalog: Catalog, everything = false, keep?: string): EquipmentRow[] {
  const out: EquipmentRow[] = [];
  for (const base of catalog.all()) {
    const row = catalog.rowFor(base.id, record.editionId) ?? base;
    if (row.kind === "heat-sink" || row.kind === "jump-jet") continue;
    if (row.id === keep || equipmentOffered(row, record, catalog, everything)) out.push(row);
  }
  return out;
}

