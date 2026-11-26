// What a battle armor suit may use at its rules level, year, era and tech base. Hide, do not mark: the editor offers only what these say is
// available, keeping a part the record already uses visible, and the rules check reports it. The dates are the books' (data/battlearmor.ts
// for the suit's parts, the equipment catalog for items); this reads them through the shared time and level pieces and forks nothing.
import { ARMOR_TYPES, MANIPULATORS, MOTIVE, WEIGHT_CLASSES } from "../../data/battlearmor";
import type { ArmorRow, Dated, ManipulatorRow, MotiveKind, WeightClassRow } from "../../data/battlearmor";
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast, levelIn } from "../levels";
import type { RulesLevel } from "../../data/chassis";
import { mountableOn } from "../catalog";
import type { Catalog, EquipmentRow } from "../catalog";
import { isStarLeagueTech } from "../../data/chassis";
import { ownSpans, pastEraCap } from "../availability";
import { phaseIn, rowPhase, windowOf } from "../time";
import type { Phase, When } from "../time";
import type { BaRecord, BaTechBase } from "./record";

export type BaSubject = Pick<BaRecord, "techBase" | "year" | "era" | "rulesLevel" | "editionId">;

/** The suit itself is Total Warfare standard rules: Introductory (3025 technology) has no suits. */
export const SUIT_LEVEL: RulesLevel = "standard";

const levelOf = (record: BaSubject): RulesLevel => record.rulesLevel ?? DEFAULT_LEVEL;
const whenOf = (record: BaSubject): When => ({ year: record.year, era: record.era, editionId: record.editionId });

/** Whether a dated part is built by the tech base at all (a row printed for one base only). */
export const baseFits = (row: Pick<Dated, "techBase">, techBase: BaTechBase): boolean => row.techBase === undefined || row.techBase === techBase;

/** Where the record's time falls against a dated part: in production, in its prototype years, or neither. A part the tech base does not build is neither. */
export function phaseOf(row: Dated, record: BaSubject): Phase | null {
  if (!baseFits(row, record.techBase)) return null;
  return rowPhase(row, record.techBase, windowOf(whenOf(record)));
}

/** True when the suit's rules level reaches what the part asks in its phase: its own level in production, Experimental in its prototype years (IO:AE printed p. 27). */
export function levelFits(row: Pick<Dated, "rulesLevel">, phase: Phase | null, record: BaSubject): boolean {
  return phase !== null && levelAtLeast(levelOf(record), levelIn(row.rulesLevel ?? DEFAULT_LEVEL, phase));
}

/** The part is offered: built by the tech base, in time, and at the record's level. */
export const offered = (row: Dated, record: BaSubject): boolean => levelFits(row, phaseOf(row, record), record);

/** Whether battle armor is offered at all at a level: Standard and above. */
export const suitOffered = (level: RulesLevel | undefined): boolean => levelAtLeast(level ?? DEFAULT_LEVEL, SUIT_LEVEL);

/** The parts a choice list shows, the current one kept so a selector never blanks. */
const choices = <T extends Dated & { id: string }>(table: T[], record: BaSubject, current: string | undefined): T[] => table.filter((row) => row.id === current || offered(row, record));
export const weightClassChoices = (record: BaSubject, current?: string): WeightClassRow[] => choices(WEIGHT_CLASSES, record, current);
export const armorChoices = (record: BaSubject, current?: string): ArmorRow[] => choices(ARMOR_TYPES, record, current);
export const manipulatorChoices = (record: BaSubject, current?: string): ManipulatorRow[] => choices(MANIPULATORS, record, current);
export const motiveChoices = (record: BaSubject, current?: string): MotiveKind[] =>
  (Object.keys(MOTIVE) as MotiveKind[]).filter((kind) => kind === current || offered(MOTIVE[kind], record));

/** The tech bases a suit may take: Inner Sphere and Clan, never Mixed. */
export const TECH_BASES: BaTechBase[] = ["inner-sphere", "clan"];

/** An item's phase for the suit: production, prototype or neither, from the row's dates read through the record's edition. A Clan suit takes Star League technology as its own (the owner's ruling), so the Inner Sphere extinctions do not hide it. */
export function itemPhase(row: EquipmentRow, record: BaSubject, catalog: Catalog): Phase | null {
  const seen = catalog.rowFor(row.id, record.editionId) ?? row;
  return phaseIn(ownSpans(record, row.techBase, seen.availability), row.prototypeYear, windowOf(whenOf(record)));
}

/** The item is meant for suits, of the suit's tech base, at or below its rules level, in its time (the prototype years need Experimental, or the row's own `prototypeLevel`). */
export function itemOffered(row: EquipmentRow, record: BaSubject, catalog: Catalog): boolean {
  if (!mountableOn(row, "battlearmor")) return false;
  const seen = catalog.rowFor(row.id, record.editionId) ?? row;
  const level = equipmentLevel(seen);
  if (!levelAtLeast(levelOf(record), level)) return false;
  if (!(row.techBase === record.techBase || (record.techBase === "clan" && isStarLeagueTech(row.techBase, seen.availability)))) return false;
  if (pastEraCap(record, seen.availability)) return false;
  const phase = itemPhase(row, record, catalog);
  return phase === "production" || (phase === "prototype" && levelAtLeast(levelOf(record), levelIn(level, phase, row.prototypeLevel)));
}

/** The catalog items offered to a suit. */
export const equipmentChoices = (catalog: Catalog, record: BaSubject): EquipmentRow[] => catalog.all().filter((row) => itemOffered(row, record, catalog));
