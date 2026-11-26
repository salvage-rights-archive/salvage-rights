// What the battle armor editor decides before a record is touched: small edits to a record, the troopers the figure draws, and where a finding points.
// Pure functions over the record; the figures all come from data/battlearmor.ts and rules/battlearmor/.
import { weightClassOf } from "../../data/battlearmor";
import { locationsOf } from "../../rules/battlearmor/construct";
import type { BaFinding } from "../../rules/battlearmor/checks";
import type { BaRecord } from "../../rules/battlearmor/record";
import type { DiagramLocation } from "./BattleArmorDiagram";

export type BaChange = (draft: BaRecord) => void;
export type BaOnEdit = (change: BaChange, field?: string) => void;

export const fieldId = (path: string): string => `field-${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
export const mountDomId = (id: string): string => `ba-mount-${id}`;

/** The troopers of the squad or Point, one figure each: the armor points on every one, and the trooper's own point. */
export function troopersOf(record: Pick<BaRecord, "troopers" | "armor">): DiagramLocation[] {
  const count = Math.min(6, Math.max(1, Math.round(record.troopers)));
  return Array.from({ length: count }, (_, i) => ({ code: `t${String(i + 1)}`, name: `Trooper ${String(i + 1)}`, armor: Math.max(0, record.armor.points), structure: 1 }));
}

/** A change of body: a quad has two free ground MP and no manipulators, non-ground movement, arm slots or arm items; a humanoid goes back to one. Nothing is removed beyond that, and the rules check says what is left to do. */
export function setBody(draft: BaRecord, body: "humanoid" | "quad"): void {
  if (draft.body === body) return;
  draft.body = body;
  const cls = weightClassOf(draft.weightClass);
  const free = body === "quad" ? (cls?.ground.free.quad ?? 2) : (cls?.ground.free.humanoid ?? 1);
  draft.ground = free;
  if (body === "quad") {
    draft.motive = { kind: "none", mp: 0 };
    draft.manipulators = { la: "none", ra: "none" };
    for (const mount of draft.mounts) mount.location = "body";
    delete draft.armor.slots;
  }
}

/** The id of the control a finding points at, when this page has one. */
export function targetFor(where: BaFinding["where"], record: BaRecord): string | undefined {
  if (!where) return undefined;
  if (where.mountId !== undefined && record.mounts.some((m) => m.id === where.mountId)) return mountDomId(where.mountId);
  const field = where.field;
  if (field === undefined) return undefined;
  if (field === "manipulators") return fieldId(locationsOf(record.body).includes("la") ? "manip-ra" : "ground");
  return fieldId(field);
}
