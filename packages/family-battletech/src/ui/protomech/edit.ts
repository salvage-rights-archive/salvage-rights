// Small edits to a ProtoMech record, and the callback the editor hands each panel. Pure functions; the figures come from data/protomech.ts and rules/protomech/.
import { launcherOf } from "../../rules/protomech/build";
import type { EquipmentRow } from "../../rules/catalog";
import type { ProtoMount, ProtoRecord } from "../../rules/protomech/record";
import { PROTO_LAUNCHERS, PROTO_WEIGHT } from "../../data/protomech";

/** An edit to a record; edits with the same `field` in a row (one visit to a field) are one Undo step. */
export type ProtoChange = (draft: ProtoRecord) => void;
export type ProtoOnEdit = (change: ProtoChange, field?: string) => void;

export const mountDomId = (id: string): string => `pm-mount-${id}`;
export const locationDomId = (code: string): string => `pm-loc-${code}`;

/** A mount id no mount of the record has. */
export function freshMountId(record: ProtoRecord): string {
  for (let n = record.mounts.length + 1; ; n += 1) if (!record.mounts.some((m) => m.id === `mount-${String(n)}`)) return `mount-${String(n)}`;
}

/** The mount for an item put in a location: a launcher starts at 3 tubes where its kind allows, the others carry no ammunition until the player says. */
export function mountFor(record: ProtoRecord, row: EquipmentRow, location: string): ProtoMount {
  const mount: ProtoMount = { id: freshMountId(record), equipmentId: row.id, name: row.name, location };
  const launch = launcherOf(mount);
  if (launch) mount.tubes = Math.min(3, launch.launcher.maxTubes);
  return mount;
}

/** The label an item has in the picker: a launcher is one entry for any number of tubes. */
export function pickerLabel(row: EquipmentRow): string {
  const launch = launcherOf({ equipmentId: row.id });
  return launch ? `${launch.launcher.label} launcher (you choose the tubes)` : row.name;
}

export const launcherKinds = Object.values(PROTO_LAUNCHERS.rows);

/** Sets the chassis. A glider has no jump jets, partial wing or Myomer Booster and is built only from 10 tons (IO:AE p. 94), so the ones the unit had are taken off and its weight raised to 10;
 * a quad has no arms, so any armor the arms held is cleared. */
export function setChassis(d: ProtoRecord, id: string): void {
  if (id === "biped") delete d.configuration;
  else d.configuration = id;
  if (id === "glider") {
    d.jump = 0;
    d.booster = false;
    delete d.partialWing;
    delete d.jumpType;
    d.tons = Math.max(d.tons, PROTO_WEIGHT.ultraFrom);
  }
  if (id === "quad") {
    d.armor.la = 0;
    d.armor.ra = 0;
  }
}
