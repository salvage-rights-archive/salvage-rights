// How an era is written in a drop-down. The full text is the era name, the book other name for it and its years. Narrower than 720 px the years are left out of the
// option (the caption under the select and the Year field show them), and narrower than 420 px the name is cut to its last part (Renaissance), so the choice fits;
// the full text stays as the option title (and the select title, for the era chosen).
import { useSyncExternalStore } from "react";
import { eraLabel } from "../data/editions";
import type { EraRow } from "../data/editions";
import { marked } from "../rules/time";
import type { Outside } from "../rules/time";

/** How much room the era choices have: 0 wide (years shown), 1 narrow (no years), 2 tight (the short name). */
export type EraRoom = 0 | 1 | 2;

const NARROW = "(max-width: 719px)";
const TIGHT = "(max-width: 419px)";

const subscribe = (notify: () => void): (() => void) => {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const queries = [window.matchMedia(NARROW), window.matchMedia(TIGHT)];
  for (const query of queries) query.addEventListener("change", notify);
  return () => { for (const query of queries) query.removeEventListener("change", notify); };
};
const read = (): EraRoom => (typeof window.matchMedia !== "function" ? 0 : window.matchMedia(TIGHT).matches ? 2 : window.matchMedia(NARROW).matches ? 1 : 0);

/** How much room the era choices have on this screen. */
export const useEraRoom = (): EraRoom => useSyncExternalStore(subscribe, read, () => 0);

/** The era with its other name and years: "Jihad (Wars of Reaving) (3068-3085)"; an open-ended era reads "(from 3151)". */
export const eraFull = (era: EraRow): string => `${eraLabel(era)} (${era.endYear === undefined ? `from ${String(era.startYear)}` : `${String(era.startYear)}-${String(era.endYear)}`})`;

/** The era's name cut to its last part: "Late Succession War - Renaissance" is "Renaissance", "Star League in Exile (faction, 2786-2801)" is "Star League in Exile". */
const shortName = (era: EraRow): string => era.name.replace(/\s*\(.*\)$/, "").split(" - ").at(-1) ?? era.name;

/** One era as a drop-down choice: `label` is what shows (name and years; no years when narrow; the last part of the name when tight), `full` the whole text (the option's title). */
export const eraChoice = (era: EraRow, room: EraRoom, outside?: Outside): { value: string; label: string; full: string } => ({ value: era.id, label: marked(room === 0 ? eraFull(era) : room === 1 ? eraLabel(era) : shortName(era), outside), full: marked(eraFull(era), outside) });

/** The eras to offer in a drop-down: the ones given, every era and sub-era, one row to a name (the first of two of one name stays), sorted by start year then end year. `keep`, the era
 * a record already holds (a sub-era it was saved with, say), stays on offer whatever. */
export function eraList(eras: EraRow[], keep?: EraRow): EraRow[] {
  const list = eras.filter((era, index) => eras.findIndex((row) => row.name === era.name) === index);
  if (keep && !list.some((era) => era.id === keep.id)) list.push(keep);
  return list.sort((a, b) => a.startYear - b.startYear || (a.endYear ?? Infinity) - (b.endYear ?? Infinity));
}
