// What the Support Vehicle pages decide before a record is touched: the edit callback type, the equipment on offer and small edits to a record. Pure functions;
// every book figure comes from data/support-vehicle.ts and rules/support-vehicle.
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { asEquipment, defaultMunitionId, offeredChoices } from "../../rules/munitions";
import { equipmentOffered } from "../../rules/support-vehicle/availability";
import { SMALL_BIN, armorLocations } from "../../rules/support-vehicle/sv";
import type { SupportVehicleRecord, SvMount } from "../../rules/support-vehicle/sv";

/** An edit to a record, and the callback the page hands each panel: edits with the same `field` in a row (one visit to a field) are one Undo step. */
export type SvChange = (draft: SupportVehicleRecord) => void;
export type SvOnEdit = (change: SvChange, field?: string) => void;

/** After the motive type, weight or turret changes: a zero entry for each armor location the unit now has; points on a location it lacks stay (the rules check reports them), unless they are zero. */
export function syncArmorLocations(draft: SupportVehicleRecord): void {
  const known = armorLocations(draft);
  for (const loc of known) draft.armor.points[loc] ??= 0;
  for (const [loc, n] of Object.entries(draft.armor.points)) if (n === 0 && !known.includes(loc)) delete draft.armor.points[loc];
}

/** A mount id no mount of the record has. */
export function freshMountId(record: Pick<SupportVehicleRecord, "mounts">): string {
  for (let n = record.mounts.length + 1; ; n += 1) if (!record.mounts.some((m) => m.id === `mount-${String(n)}`)) return `mount-${String(n)}`;
}

/** The mount for an item put in a location: ammunition starts at its least bin, an infantry weapon with one clip, a bay or cargo item at its least size. */
export function mountFor(record: Pick<SupportVehicleRecord, "mounts" | "editionId">, row: EquipmentRow, location: string, catalog?: Catalog): SvMount {
  const small = SMALL_BIN.test(row.id.replace(/^ammo-/, ""));
  const munition = catalog === undefined ? undefined : defaultMunitionId(row, catalog, record.editionId);
  const amount = row.kind === "ammunition" ? (small ? 0.5 : 1) : row.infantry !== undefined ? 1 : row.amount !== undefined ? row.amount.min : undefined;
  return { id: freshMountId(record), equipmentId: row.id, name: row.name, location, ...(amount === undefined ? {} : { amount }), ...(munition === undefined ? {} : { munition }) };
}

/** The locations mounts sit in that the unit does not have, in the order first met: they stay visible and can be moved. */
export function strayLocations(record: Pick<SupportVehicleRecord, "mounts">, known: string[]): string[] {
  return [...new Set(record.mounts.map((m) => m.location).filter((loc) => !known.includes(loc)))];
}

/** The catalog rows a Support Vehicle is offered: those printed for it at its size, level, tech base and time (`everything` lifts the tech base and time); `keep` stays on offer. */
export function offeredEquipment(record: SupportVehicleRecord, catalog: Catalog, everything = false, keep?: string): EquipmentRow[] {
  const out: EquipmentRow[] = [];
  for (const base of catalog.all()) {
    const row = catalog.rowFor(base.id, record.editionId) ?? base;
    if (row.kind === "heat-sink" || row.kind === "jump-jet") continue;
    if (row.id === keep || equipmentOffered(row, record, catalog, everything)) out.push(row);
  }
  return out;
}

/** The munitions a unit is offered for an item: those printed for it at its level, tech base and time, and the one it holds. Empty for an item with no choice. */
export const munitionChoices = (record: SupportVehicleRecord, catalog: Catalog, row: EquipmentRow, current: string | undefined): EquipmentRow[] =>
  offeredChoices(row, catalog, record.editionId, current, (choice) => equipmentOffered(asEquipment(choice, "vehicle"), record, catalog));
