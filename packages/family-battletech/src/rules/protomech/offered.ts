// What a ProtoMech may mount, and when it and its parts exist. The catalog is the one equipment table (data/equipment/): a row is offered to a
// ProtoMech when its `units` names it (TechManual's item entries and errata v8.0 decide that list), minus the kinds the ProtoMech chapter forbids, and
// then by the same rules level, tech base, era and date limits the 'Mech side applies (rules/availability.ts, rules/time.ts). A ProtoMech is a Clan unit
// that uses Star League era Inner Sphere technology as its own (the owner's ruling, with IO:AE Alternate Eras). Hide, do not mark: a row the unit already
// holds stays in the list (`keep`), and the rules check reports it.
import { isStarLeagueTech } from "../../data/chassis";
import type { RulesLevel } from "../../data/chassis";
import { inGame, rulesetOf } from "../../data/rulesets";
import { PROTO_DATES, PROTO_EXCLUDED, PROTO_LAUNCHERS } from "../../data/protomech";
import type { ProtoDates } from "../../data/protomech";
import { equipmentPhase, ownSpans, pastEraCap } from "../availability";
import { mountableOn } from "../catalog";
import type { Catalog, EquipmentRow } from "../catalog";
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast, levelIn } from "../levels";
import type { MechRecord } from "../mech";
import { phaseIn, windowOf } from "../time";
import type { Phase } from "../time";
import type { ProtoRecord } from "./record";

type Subject = Parameters<typeof equipmentPhase>[1];

/** The record as the 'Mech-side availability rules read it: a Clan unit of the record's year, era, level and edition. */
export const subjectOf = (record: ProtoRecord): Subject => ({
  techBase: "clan" as MechRecord["techBase"],
  year: record.year,
  era: record.era,
  rulesLevel: record.rulesLevel,
  unitType: "mech",
  editionId: record.editionId,
});

export const levelOfRecord = (record: Pick<ProtoRecord, "rulesLevel">): RulesLevel => record.rulesLevel ?? DEFAULT_LEVEL;

/** Where the record's time falls against a part's printed dates: production, prototype, or neither. No year and no era is no limit. A part with no production year
 * (prototype only) is "production" from its prototype year to its extinction, at the part's own rules level. */
export function datesPhase(record: ProtoRecord, dates: ProtoDates): Phase | null {
  const prototypeOnly = dates.production === undefined;
  return phaseIn([{ from: dates.production ?? dates.prototype, to: dates.extinct }], prototypeOnly ? undefined : dates.prototype, windowOf({ era: record.era, year: record.year, editionId: record.editionId }));
}

/** The launcher kinds' catalog rows; the other sizes of a launcher are not offered, since a ProtoMech builds one by its tubes. */
const FAMILY_ROWS = new Set(Object.values(PROTO_LAUNCHERS.rows).map((launcher) => launcher.row));
const SIZED = /^(lrm|srm|streak-srm)-\d+-clan$/;

/** True when the catalog row is a kind a ProtoMech may carry at all, whatever the year: its `units` names the type, it has a weight in tons and it is not one the chapter forbids. */
export function protoMountable(row: EquipmentRow): boolean {
  if (!mountableOn(row, "protomech") || PROTO_EXCLUDED.test(row.id) || typeof row.tons !== "number") return false;
  if (row.kind !== "weapon" && row.kind !== "other") return false;
  return !SIZED.test(row.id) || FAMILY_ROWS.has(row.id);
}

/** The row's phase for the record: production, prototype or neither. */
export function itemPhase(row: EquipmentRow, record: ProtoRecord, catalog: Catalog): Phase | null {
  return equipmentPhase(row, subjectOf(record), catalog);
}

/** The level the row needs for the record's time: its own in production, Experimental (or the printed level) in its prototype years. */
export function itemLevel(row: EquipmentRow, record: ProtoRecord, catalog: Catalog): RulesLevel {
  const seen = catalog.rowFor(row.id, record.editionId) ?? row;
  return levelIn(equipmentLevel(seen), itemPhase(row, record, catalog), row.prototypeLevel);
}

/** Whether the row is on offer: mountable, on the edition's list, at or under the rules level, Clan or Star League technology and in the record's time. `everything` lifts the tech base and time limits. */
export function itemAvailable(row: EquipmentRow, record: ProtoRecord, catalog: Catalog, everything = false): boolean {
  if (!protoMountable(row) || !inGame(row.games, rulesetOf(record.editionId), record.rulesLevel)) return false;
  const seen = catalog.rowFor(row.id, record.editionId) ?? row;
  const level = equipmentLevel(seen);
  if (!levelAtLeast(levelOfRecord(record), level)) return false;
  if (everything) return true;
  if (!(row.techBase === "clan" || isStarLeagueTech(row.techBase, seen.availability))) return false;
  if (pastEraCap(subjectOf(record), ownSpans(subjectOf(record), row.techBase, seen.availability))) return false;
  const phase = itemPhase(row, record, catalog);
  return phase === "production" || (phase === "prototype" && levelAtLeast(levelOfRecord(record), levelIn(level, phase, row.prototypeLevel)));
}

/** The catalog rows to offer the unit, as the record's edition sees them; the rows in `keep` (what is already mounted) are always on the list. */
export function offeredEquipment(record: ProtoRecord, catalog: Catalog, everything = false, keep: string[] = []): EquipmentRow[] {
  const out: EquipmentRow[] = [];
  for (const base of catalog.all()) {
    if (keep.includes(base.id) ? protoMountable(base) : itemAvailable(base, record, catalog, everything)) out.push(catalog.rowFor(base.id, record.editionId) ?? base);
  }
  return out;
}

/** True when ProtoMechs exist for the record's time at all (the unit's production or prototype years). */
export const unitInTime = (record: ProtoRecord): boolean => datesPhase(record, PROTO_DATES.unit) !== null;

export { PROTO_DATES };
