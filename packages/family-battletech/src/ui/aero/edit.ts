// What the AeroTech pages decide before a record is touched: which unit types an edition can build today, the new-unit form and what a
// change of edition resets in it, which tech bases and equipment an edition offers a unit, and small edits to a record. Pure functions;
// the book figures all come from data/aero.ts and rules/aero.ts.
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast } from "../../rules/levels";
import { DEFAULT_AERO_EDITION, FIGHTER_FIGURES, aeroTypesFor, figureOf } from "../../data/aero";
import type { AeroType, AeroTypeRow } from "../../data/aero";
import { AERO_WEAPON_EDITIONS, aeroWeaponOffered, ammoRowOf } from "../../data/aero-weapons";
import type { UnitId } from "../../data/units";
import { fighterKind, locationsOf, newAeroRecord } from "../../rules/aero";
import type { AeroMount, AeroRecord } from "../../rules/aero";
import { mountableOn } from "../../rules/catalog";
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { phaseIn, windowOf } from "../../rules/time";

/**
 * Whether the app builds this unit type under the edition: the fighters today. Small craft and DropShips can be built in the editor but
 * wait here (and so are hidden from every new-unit list) until AERO-10 brings back their sheets together with their checks: the weight tally,
 * structural integrity range (TM p. 187), armor limit and allocation (TM p. 191), arcs and fire control (TM p. 196), matched arcs and bay
 * limits (TM p. 195), minimum ammunition (TM p. 194), crew (TM p. 189), doors (TM p. 196) and the DropShip zero-heat rule (TM p. 193).
 * The others (JumpShips, WarShips, stations) wait too. A saved record of a waiting type still opens.
 */
export function typeReady(editionId: string, unitType: string): boolean {
  if (fighterKind({ unitType }) !== undefined) return figureOf(FIGHTER_FIGURES.maxThrustFactor, editionId) !== undefined;
  return false;
}

export const typeRow = (editionId: string, unitType: string): AeroTypeRow | undefined => aeroTypesFor(editionId).find((row) => row.type === unitType);

/** The tech bases an edition offers. AeroTech (1986) lists Inner Sphere weapons only (its p. 15 table); a base the record already has stays on offer. */
export function techBasesFor(editionId: string, current?: string): string[] {
  const all = editionId === AERO_WEAPON_EDITIONS.at1 ? ["inner-sphere"] : ["inner-sphere", "clan", "mixed"];
  return current !== undefined && !all.includes(current) ? [...all, current] : all;
}

/** The weight range a type is built in, in words; undefined where the book names none. */
export function weightHint(weight: { min?: number; max?: number; step?: number } | undefined): string | undefined {
  if (!weight) return undefined;
  const { min, max, step } = weight;
  const range = min !== undefined && max !== undefined ? `${String(min)} to ${String(max)} tons` : max !== undefined ? `up to ${String(max)} tons` : min !== undefined ? `from ${String(min)} tons` : undefined;
  return range === undefined ? undefined : `${range}${step === undefined ? "" : `, in steps of ${String(step)}`}`;
}


// ---- The new-unit form ----------------------------------------------------------------------------------------------------------

export interface AeroDraft {
  chassis: string;
  model: string;
  editionId: string;
  unitType: string;
  tons: number;
  safeThrust: number;
}

/** Where a type starts: the lightest the edition allows, or the heaviest where it names no lightest. */
export const startTons = (row: AeroTypeRow | undefined): number => row?.weight.min ?? row?.weight.max ?? 100;

const inBand = (row: AeroTypeRow, tons: number): boolean => (row.weight.min === undefined || tons >= row.weight.min) && (row.weight.max === undefined || tons <= row.weight.max);

export function newDraft(editionId: string = DEFAULT_AERO_EDITION): AeroDraft {
  return settle({ chassis: "", model: "", editionId, unitType: "", tons: 0, safeThrust: 5 });
}

/**
 * Brings a form to what its edition offers, and nothing more: the type stays where the edition builds it and otherwise becomes the
 * edition's first buildable one; the tons stay where the (new) type's weight range holds them and otherwise start at its lightest. The name, model
 * and thrust are never touched.
 */
export function settle(draft: AeroDraft): AeroDraft {
  const types = aeroTypesFor(draft.editionId);
  const keep = types.find((row) => row.type === draft.unitType && typeReady(draft.editionId, row.type));
  const buildable = types.filter((r) => typeReady(draft.editionId, r.type));
  const row = keep ?? buildable.find((r) => r.type === "aerospace-fighter") ?? buildable[0] ?? types[0];
  const tons = row !== undefined && draft.tons > 0 && inBand(row, draft.tons) ? draft.tons : startTons(row);
  return { ...draft, unitType: row?.type ?? draft.unitType, tons };
}

/** The unit the form describes: a bare one to build on, with the rules level of its type in the current edition. */
export function recordFromDraft(draft: AeroDraft, id: string = crypto.randomUUID()): AeroRecord {
  const row = typeRow(draft.editionId, draft.unitType);
  const unitType = draft.unitType as AeroType;
  return newAeroRecord(
    {
      id,
      chassis: draft.chassis.trim(),
      model: draft.model.trim(),
      unitType,
      tons: draft.tons,
      safeThrust: draft.safeThrust,
      ...(draft.editionId === DEFAULT_AERO_EDITION ? { rulesLevel: row?.level ?? DEFAULT_LEVEL } : {}),
    },
    draft.editionId,
  );
}

// ---- Equipment ------------------------------------------------------------------------------------------------------------------

const UNIT_OF: Record<string, UnitId> = {
  "aerospace-fighter": "aero",
  "conventional-fighter": "aero",
  "small-craft": "smallcraft",
  dropship: "dropship",
  jumpship: "ship",
  warship: "ship",
  "space-station": "ship",
};

/**
 * The catalog rows the edition offers this unit: the weapons its book lists (the current edition: the aerospace-mountable ones), the
 * ammunition those weapons use, and in the current edition the other equipment its unit type may mount. Tech base narrows it in every
 * edition; in the current edition the unit's rules level and its year or era narrow it too. `everything` lifts the tech base, level and
 * date limits (not the edition's list); a row named in `keep` is always on offer. A unit type we do not know is offered nothing.
 */
export function offeredEquipment(record: AeroRecord, catalog: Catalog, everything = false, keep?: string): EquipmentRow[] {
  const unit = Object.hasOwn(UNIT_OF, record.unitType) ? UNIT_OF[record.unitType] : undefined;
  if (unit === undefined) return [];
  const edition = record.editionId;
  const current = edition === DEFAULT_AERO_EDITION;
  const window = windowOf({ era: record.era, year: record.year });
  const seen = (row: EquipmentRow) => catalog.rowFor(row.id, edition) ?? row;
  const ammoOf = new Set<string>();
  const out: EquipmentRow[] = [];
  const narrow = (row: EquipmentRow): boolean => {
    if (everything || row.id === keep) return true;
    if (record.techBase !== "mixed" && row.techBase !== record.techBase) return false;
    if (!current) return true;
    if (record.rulesLevel !== undefined && !levelAtLeast(record.rulesLevel, equipmentLevel(row))) return false;
    return window === null || phaseIn(row.availability, row.prototypeYear, window) !== null;
  };
  for (const base of catalog.all()) {
    if (base.kind === "weapon" && mountableOn(base, unit) && aeroWeaponOffered(edition, base.id)) {
      const ammo = ammoRowOf(catalog, base.id);
      if (ammo && narrow(base)) ammoOf.add(ammo.id);
      if (narrow(base)) out.push(seen(base));
    } else if (base.kind === "other" && current && mountableOn(base, unit) && narrow(base)) out.push(seen(base));
  }
  for (const base of catalog.all()) if (base.kind === "ammunition" && (ammoOf.has(base.id) || base.id === keep)) out.push(seen(base));
  return out;
}

/** An edit to a record, and the callback the page hands each panel: edits with the same `field` in a row (one visit to a field) are one Undo step. */
export type AeroChange = (draft: AeroRecord) => void;
export type AeroOnEdit = (change: AeroChange, field?: string) => void;

/** After the type or shape changes: a zero entry for each armor location the unit now has, and no zero entry for one it lacks. Points on a location it lacks stay (the rules check reports them). */
export function syncArmorLocations(draft: AeroRecord): void {
  const known = locationsOf(draft).armor;
  if (known.length === 0) return;
  for (const loc of known) draft.armor.points[loc] ??= 0;
  for (const [loc, n] of Object.entries(draft.armor.points)) if (n === 0 && !known.includes(loc)) delete draft.armor.points[loc];
}

// ---- Mounts and bays ------------------------------------------------------------------------------------------------------------

/** A mount id no mount of the record has. */
export function freshMountId(record: AeroRecord): string {
  for (let n = record.mounts.length + 1; ; n += 1) if (!record.mounts.some((m) => m.id === `mount-${String(n)}`)) return `mount-${String(n)}`;
}

/** The mount for an item put in an arc: ammunition starts at one ton. */
export function mountFor(record: AeroRecord, row: EquipmentRow, arc: string): AeroMount {
  return { id: freshMountId(record), equipmentId: row.id, name: row.name, arc, ...(row.kind === "ammunition" ? { amount: 1 } : {}) };
}

/** The arcs a unit's mounts sit in that its edition does not give it, in the order first met: they stay visible and can be moved. */
export function strayArcs(record: AeroRecord, known: string[]): string[] {
  return [...new Set(record.mounts.map((m) => m.arc).filter((arc) => !known.includes(arc)))];
}

/** The armor locations to show: the edition's, then any other location that holds points (kept, and reported by the check). */
export function armorLocations(record: AeroRecord, known: string[]): string[] {
  return [...known, ...Object.entries(record.armor.points).filter(([loc, n]) => !known.includes(loc) && n !== 0).map(([loc]) => loc)];
}
