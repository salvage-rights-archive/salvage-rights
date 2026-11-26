// Looking up a special ability from the code a card carries, which of them a rules level shows, and the line each screen writes for it.
// The table is data/as-specials.ts and the short notes are data/as-glosses.ts; nothing here holds a figure.
import { ARTX_FAMILY, AS_EDITION } from "../data/alpha-strike";
import type { RulesLevel } from "../data/chassis";
import { AS_GLOSSES } from "../data/as-glosses";
import { AS_SPECIALS } from "../data/as-specials";
import type { AsSpecialRow } from "../data/as-specials";

const BY_CODE = new Map<string, AsSpecialRow>(AS_SPECIALS.flatMap((row) => [row.code, ...(row.aliases ?? [])].map((c): [string, AsSpecialRow] => [c, row])));

/** The table row for a card's code (`IF`, an alias such as `DN`, or any `ART...` code), or none for a code we do not know. */
export function findSpecial(code: string): AsSpecialRow | undefined {
  const upper = code.toUpperCase();
  return BY_CODE.get(upper) ?? (ARTX_FAMILY.test(upper) ? BY_CODE.get("ARTX") : undefined);
}

/** The anchor of a special's entry on the aids page. */
export const specialAnchor = (row: AsSpecialRow): string => `special-${row.code}`;

/** Alpha Strike has no rules levels of its own; as the design maps them, the standard abilities show from Introductory up and the optional ones from Advanced up. */
export const levelShows = (level: RulesLevel, row: AsSpecialRow): boolean => row.level === "standard" || !["introductory", "standard"].includes(level);

/** Rows to list for a rules level, and for one unit type when given. A row the book limits to other unit types is left out, not marked. */
export function specialsFor(level: RulesLevel, unitType?: string): AsSpecialRow[] {
  return AS_SPECIALS.filter((row) => levelShows(level, row) && (unitType === undefined || row.types === undefined || row.types.includes(unitType)));
}

/** The note in our words, or none when we wrote none. */
export const glossOf = (row: AsSpecialRow): string | undefined => AS_GLOSSES[row.code];

/** "Alpha Strike: Commander's Edition, p. 78" with the errata named where it changes the entry. */
export const specialCite = (row: AsSpecialRow): string => `${AS_EDITION.name}, p. ${String(row.page)}${row.errata ? ", errata v7.02" : ""}`;
