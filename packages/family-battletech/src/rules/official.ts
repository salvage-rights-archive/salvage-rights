// The two marks a design carries. OFFICIAL / NOT OFFICIAL is a fact the player states (a design the game's publisher put out, in a named
// book) and the app keeps honest: the mark holds only while the design is the one that was marked. "Verified Standard Rules Compliant" is
// never typed: it is worked out from the record, the rules level and the rules check, and says only what our check covered. Pure functions;
// nothing here throws on a record it does not understand, and no list of official designs is kept.
import { editionName } from "../data/editions";
import type { Catalog } from "./catalog";
import { runChecks } from "./checks";
import type { Finding } from "./checks";
import { DEFAULT_LEVEL, LEVEL_ORDER, levelAtLeast, levelItems, levelOfRecord } from "./levels";
import { armsOf } from "./mech";
import type { MechRecord, Mount } from "./mech";

/** Canonical text of a value: object keys in order, so two equal values written in different key orders agree. */
export function canon(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

// ---------------------------------------------------------------------------------------------------------------
// OFFICIAL / NOT OFFICIAL
// ---------------------------------------------------------------------------------------------------------------

/** A mount without its id, so that two records built from one design agree whatever ids their mounts were given. */
const mountShape = (m: Mount) => canon({ equipmentId: m.equipmentId, name: m.name, techBase: m.techBase, location: m.location, slot: m.slot, part: m.part, slots: m.slots, amount: m.amount, rear: m.rear, linked: m.linkedTo !== undefined });

/** The design as the mark sees it: tonnage, tech base, year, body, chassis parts, armor, arm actuators and every mount. Not the name, the
 * notes or the picture (renaming and describing a unit does not change the design), and not the rules level or the OmniMech link. */
export function designKey(record: MechRecord): string {
  return canon({
    tons: record.tons,
    techBase: record.techBase,
    year: record.year,
    configuration: record.configuration,
    chassis: record.chassis,
    armor: record.armor,
    arms: armsOf(record) ?? {},
    mounts: record.mounts.map(mountShape).sort(),
  });
}

export type OfficialState = { official: true; book: string; page?: number } | { official: false; changedFrom?: string };

/** Whether the record is OFFICIAL now. It is only when it was marked with a book and its design is still the marked one; a marked record
 * that was edited reads as NOT OFFICIAL, changed from the published design in its book, and reads as OFFICIAL again if the edit is undone. */
export function officialState(record: MechRecord): OfficialState {
  const mark = record.official;
  const book = mark?.book?.trim();
  if (mark?.status !== "official" || !book || mark.design === undefined) return { official: false };
  if (mark.design !== designKey(record)) return { official: false, changedFrom: book };
  return mark.page === undefined ? { official: true, book } : { official: true, book, page: mark.page };
}

/** The badge's words: `OFFICIAL, TechManual, p. 12` or `NOT OFFICIAL`, with the book named when an edit took the mark away. */
export function officialLabel(state: OfficialState): { badge: string; detail: string } {
  if (state.official) return { badge: "OFFICIAL", detail: state.page === undefined ? state.book : `${state.book}, p. ${String(state.page)}` };
  return { badge: "NOT OFFICIAL", detail: state.changedFrom === undefined ? "" : `changed from the published design in ${state.changedFrom}` };
}

/** Marks the record OFFICIAL in the named book (and page, when given), keeping the design as it is now. Does nothing without a book. */
export function markOfficial(draft: MechRecord, book: string, page?: number | null): void {
  const named = book.trim();
  if (!named) return;
  draft.official = { status: "official", book: named, design: designKey(draft), ...(page !== undefined && page !== null && Number.isInteger(page) && page > 0 ? { page } : {}) };
}

/** Takes the mark off: the record reads as NOT OFFICIAL, as one built here does. */
export function unmarkOfficial(draft: MechRecord): void {
  delete draft.official;
}

// ---------------------------------------------------------------------------------------------------------------
// Verified Standard Rules Compliant
// ---------------------------------------------------------------------------------------------------------------

/** The version of the rules check a verification names. */
export const RULES_CHECK_VERSION = "0.1.0";

export interface ComplianceReason {
  text: string;
  /** The finding's place, or the record's field, that the reason points at. */
  where?: Finding["where"];
}
export type Compliance = { verified: true; edition: string; version: string } | { verified: false; reasons: ComplianceReason[] };

/** The line the record sheet prints for a verified 'Mech. Our own words: it says what our check covered and claims no one's endorsement. */
export const verifiedLine = (edition: string, date: string) => `Verified Standard Rules Compliant: Salvage Rights rules check, ${edition}, ${date}.`;

/**
 * Yes only when every one of these holds: the rules level is Standard or lower and nothing the record uses asks for more (no Advanced item,
 * no prototype in its time); the rules check gives no error and no warning; every part and mount was found in our tables (an item we do
 * not know cannot be verified); the layout could be worked out; and the record has a year or an era, so availability was checked. Otherwise
 * it lists each reason, pointing at the finding or field. The base of an OmniMech alone is not a unit and is never verified.
 */
export function standardCompliance(record: MechRecord, catalog: Catalog, findings: Finding[] = runChecks(record, catalog)): Compliance {
  const reasons: ComplianceReason[] = [];
  const standard = DEFAULT_LEVEL;
  const level = levelOfRecord(record, catalog);
  if (record.omni?.isBase) reasons.push({ text: "The base chassis of an OmniMech is not a unit by itself; verify one of its configurations." });
  if (!LEVEL_ORDER.includes(level) || !levelAtLeast(standard, level)) reasons.push({ text: `The rules level is ${level}; Standard or lower is needed.`, where: { field: "rulesLevel" } });
  // The rules check already says it where it reports an item above the record's own level; a level item is added only where it does not.
  const told = new Set(findings.filter((f) => f.check === "level").map((f) => `${f.where?.field ?? ""}|${f.where?.mountId ?? ""}`));
  for (const item of levelItems(record, catalog)) {
    if (levelAtLeast(standard, item.level) || told.has(`${item.where.field ?? ""}|${item.where.mountId ?? ""}`)) continue;
    const when = item.prototype === undefined ? "" : ` in its prototype years (${item.prototype})`;
    reasons.push({ text: `${item.name} needs ${item.level} rules${when}.`, where: item.where });
  }
  for (const finding of findings) {
    if (finding.level === "error" || finding.level === "warning" || finding.check === "unmatched" || finding.check === "unsupported") {
      reasons.push({ text: finding.message, ...(finding.where ? { where: finding.where } : {}) });
    }
  }
  if (record.year === null && record.era === undefined) reasons.push({ text: "The unit has no year or era, so its availability was not checked.", where: { field: "year" } });
  return reasons.length > 0 ? { verified: false, reasons } : { verified: true, edition: editionName(record.editionId), version: RULES_CHECK_VERSION };
}
