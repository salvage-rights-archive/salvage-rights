// What the AeroTech pages decide before a record is touched: which unit types an edition can build today, the new-unit form and what a
// change of edition resets in it, which tech bases and equipment an edition offers a unit, and small edits to a record. Pure functions;
// the book figures all come from data/aero.ts and rules/aero.ts.
import type { RulesLevel } from "../../data/chassis";
import type { EraRow } from "../../data/editions";
import { rulesetOf } from "../../data/rulesets";
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast, levelRow, techBaseChoices } from "../../rules/levels";
import { DEFAULT_AERO_EDITION, FIGHTER_FIGURES, aeroTypesFor, figureOf } from "../../data/aero";
import type { AeroType, AeroTypeRow } from "../../data/aero";
import { AERO_WEAPON_EDITIONS, aeroWeaponOffered, ammoRowOf } from "../../data/aero-weapons";
import type { UnitId } from "../../data/units";
import { fighterKind, locationsOf, newAeroRecord, vesselGroup } from "../../rules/aero";
import type { AeroMount, AeroRecord } from "../../rules/aero";
import { baseFits, erasOfYear, ownSpans, pastEraCap, setYear } from "../../rules/availability";
import { mountableOn } from "../../rules/catalog";
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { phaseIn, windowOf } from "../../rules/time";

/**
 * Whether the app builds this unit type under the edition: the fighters, small craft, DropShips, JumpShips, WarShips and space stations
 * (each with its rules check and record sheet) where the edition prints their figures. A type it prints none for is hidden from every
 * new-unit list; a saved record of one still opens.
 */
export function typeReady(editionId: string, unitType: string): boolean {
  if (fighterKind({ unitType }) !== undefined) return figureOf(FIGHTER_FIGURES.maxThrustFactor, editionId) !== undefined;
  return vesselGroup({ unitType, editionId }) !== undefined;
}

export const typeRow = (editionId: string, unitType: string): AeroTypeRow | undefined => aeroTypesFor(editionId).find((row) => row.type === unitType);

/** The tech bases the unit may choose: Classic's rule (hide, do not mark): its rules level, its year and the era picked decide them (no Clan before the Clan sub-eras,
 * Mixed from its prototype years and at its level, none across the Succession Wars). Older editions have no level, so only the year and era limit them, and AeroTech (1986)
 * lists Inner Sphere weapons only (its p. 15 table). The base the record already has stays on offer. */
export function techBasesFor(record: Pick<AeroRecord, "editionId" | "rulesLevel" | "year" | "era" | "techBase">, keepCurrent = true): string[] {
  const listed = record.editionId === AERO_WEAPON_EDITIONS.at1 ? ["inner-sphere"] : ["inner-sphere", "clan", "mixed"];
  const level = record.editionId === DEFAULT_AERO_EDITION ? record.rulesLevel : "unlimited";
  return techBaseChoices(level, keepCurrent ? record.techBase : "", record).map(([id]) => id).filter((id) => (keepCurrent && id === record.techBase) || listed.includes(id));
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
  /** The current edition only: the older books have no levels. */
  rulesLevel?: RulesLevel;
  /** Above the tech base, as in Classic's form: the year sets the era, and the era and year decide which tech bases are offered. */
  year: number | null;
  era?: string;
  techBase: AeroRecord["techBase"];
}

/** Where a type starts: the lightest the edition allows, or the heaviest where it names no lightest. */
export const startTons = (row: AeroTypeRow | undefined): number => row?.weight.min ?? row?.weight.max ?? 100;

const inBand = (row: AeroTypeRow, tons: number): boolean => (row.weight.min === undefined || tons >= row.weight.min) && (row.weight.max === undefined || tons <= row.weight.max);

export function newDraft(editionId: string = DEFAULT_AERO_EDITION): AeroDraft {
  return settle({ chassis: "", model: "", editionId, unitType: "", tons: 0, safeThrust: 5, year: null, techBase: "inner-sphere" });
}

/** The unit types the form offers at its edition and level: the ones the app builds, and in the current edition those at or below the rules level (hide, do not mark). */
export function typesAt(draft: Pick<AeroDraft, "editionId" | "rulesLevel">): AeroTypeRow[] {
  const atLevel = (row: AeroTypeRow) => draft.editionId !== DEFAULT_AERO_EDITION || levelAtLeast(draft.rulesLevel ?? DEFAULT_LEVEL, row.level ?? DEFAULT_LEVEL);
  return aeroTypesFor(draft.editionId).filter((row) => typeReady(draft.editionId, row.type) && atLevel(row));
}

/** The eras a typed year is in that the form offers: Classic's rule (an era whose tech bases the level does not offer is not a choice, so at Introductory only the
 * Inner Sphere era of a year in two). One means the era is settled; two, the player picks, and the era decides the tech base. */
export function yearErasOf(draft: Pick<AeroDraft, "editionId" | "rulesLevel" | "year">): EraRow[] {
  const level = draft.editionId === DEFAULT_AERO_EDITION ? draft.rulesLevel : "unlimited";
  const bases = techBaseChoices(level, "", { year: draft.year, editionId: draft.editionId }).map(([value]) => value);
  return erasOfYear(draft.year, rulesetOf(draft.editionId)).filter((era) => era.techBases === undefined || era.techBases.some((base) => bases.includes(base)));
}

/** What still blocks the form, in words ("" when nothing does): in the current rules a year above Introductory, and the era when the year is in two. The older books
 * have no levels and print no dates, so they ask for neither. */
export function draftMissing(draft: AeroDraft): string {
  const level = draft.rulesLevel ?? DEFAULT_LEVEL;
  if (draft.editionId !== DEFAULT_AERO_EDITION || level === "introductory") return "";
  if (draft.year === null) return `A year is needed at ${levelRow(level).label} rules: it sets the era, and the era and year decide what is offered.`;
  return yearErasOf(draft).length > 1 && !yearErasOf(draft).some((era) => era.id === draft.era) ? `The year ${String(draft.year)} is in two eras; choose one, since it decides the tech base.` : "";
}

/**
 * Brings a form to what its edition offers, and nothing more, in the order the form reads: the level (current edition), the year, the era, the tech base the year and
 * era leave, then the type (the edition's first buildable one at the level when the chosen one is not) and its tons (kept where the type's weight range holds them,
 * else its lightest). The name, model and thrust are never touched.
 */
export function settle(draft: AeroDraft): AeroDraft {
  const current = draft.editionId === DEFAULT_AERO_EDITION;
  const next: AeroDraft = { ...draft };
  if (current) next.rulesLevel ??= DEFAULT_LEVEL;
  else delete next.rulesLevel;
  setYear(next, next.year);
  const eras = yearErasOf(next);
  if (eras.length === 1 && eras[0]) next.era = eras[0].id;
  else if (next.era !== undefined && next.year !== null && !eras.some((era) => era.id === next.era)) delete next.era;
  const bases = techBasesFor(next, false);
  next.techBase = bases.includes(next.techBase) ? next.techBase : ((bases[0] ?? "inner-sphere") as AeroDraft["techBase"]);
  const offered = typesAt(next);
  const row = offered.find((r) => r.type === next.unitType) ?? offered.find((r) => r.type === "aerospace-fighter") ?? offered[0] ?? typeRow(next.editionId, next.unitType) ?? aeroTypesFor(next.editionId)[0];
  next.tons = row !== undefined && next.tons > 0 && inBand(row, next.tons) ? next.tons : startTons(row);
  next.unitType = row?.type ?? next.unitType;
  return next;
}

/** The unit the form describes: a bare one to build on, with the rules level the form chose in the current edition. */
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
      techBase: draft.techBase,
      year: draft.year,
      ...(draft.era === undefined ? {} : { era: draft.era }),
      ...(draft.editionId === DEFAULT_AERO_EDITION ? { rulesLevel: draft.rulesLevel ?? row?.level ?? DEFAULT_LEVEL } : {}),
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
    if (!current) return record.techBase === "mixed" || row.techBase === record.techBase;
    const dates = seen(row).availability;
    // The current rules read the unit as Classic does: the tech base (a Clan unit keeps the Star League items built before 2781), the level, the era's date limit, then the year.
    if (!baseFits(row.techBase, record.techBase, dates)) return false;
    if (record.rulesLevel !== undefined && !levelAtLeast(record.rulesLevel, equipmentLevel(row))) return false;
    if (pastEraCap(record, dates)) return false;
    return window === null || phaseIn(ownSpans(record, row.techBase, dates), row.prototypeYear, window) !== null;
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

/** Sets one location's patchwork armor type on a fighter (Tactical Operations: AUE p. 189); the record's own armor type, or none, takes the choice away. One edit. */
export function setFighterPatchwork(draft: AeroRecord, location: string, type: string | null): void {
  const next = { ...draft.armor.patchwork };
  if (type === null || type === draft.armor.type) delete next[location];
  else next[location] = type;
  if (Object.keys(next).length === 0) delete draft.armor.patchwork;
  else draft.armor.patchwork = next;
}

/** The armor locations to show: the edition's, then any other location that holds points (kept, and reported by the check). */
export function armorLocations(record: AeroRecord, known: string[]): string[] {
  return [...known, ...Object.entries(record.armor.points).filter(([loc, n]) => !known.includes(loc) && n !== 0).map(([loc]) => loc)];
}
