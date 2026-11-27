// How an era is written in a drop-down. The full text is the era's name and its years. Narrower than 720 px the years are left out of the option (the Year
// field beside it already shows them), and narrower than 420 px the name is cut to its last part ("Renaissance"), so the choice fits; the full text stays
// as the option's title (and the select's, for the era chosen).
import { useSyncExternalStore } from "react";
import { eraLabel } from "../data/editions";
import type { EraRow } from "../data/editions";

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

/** The era with its years: "Jihad (Wars of Reaving) (3068-3085)". */
export const eraFull = (era: EraRow): string => `${eraLabel(era)} (${String(era.startYear)}${era.endYear === undefined ? " on" : `-${String(era.endYear)}`})`;

/** The era's name cut to its last part: "Late Succession War - Renaissance" is "Renaissance", "Star League in Exile (faction, 2786-2801)" is "Star League in Exile". */
const shortName = (era: EraRow): string => era.name.replace(/\s*\(.*\)$/, "").split(" - ").at(-1) ?? era.name;

/** One era as a drop-down choice: `label` is what shows, `full` the whole text (the option's title). */
export const eraChoice = (era: EraRow, room: EraRoom): { value: string; label: string; full: string } => ({ value: era.id, label: room === 0 ? eraFull(era) : room === 1 ? eraLabel(era) : shortName(era), full: eraFull(era) });
