import { useState } from "react";
import { AS_EDITIONS } from "../../data/alpha-strike";
import { RULES_LEVELS } from "../../data/chassis";
import type { RulesLevel } from "../../data/chassis";
import { playLevel } from "../../rules/as-force";
import { eraOfYear } from "../../rules/time";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { updatePlayFilter, usePlaySettings } from "./playSettings";

/**
 * The one Alpha Strike setting: rules level and edition (read by the aids, the specials, the unit and the force pages), and the game year
 * and tech base that narrow the force's unit list. A unit above the level, dated after the year or of the other tech base is left out
 * of that list, not marked. `rulesOnly` shows the level and edition alone, for the aids page.
 */
export default function AsPlayFilter({ rulesOnly = false }: { rulesOnly?: boolean }) {
  const { filter, ready, problem } = usePlaySettings();
  // What the player has typed, until the year is blank or four digits; before that the box shows the saved year.
  const [typed, setTyped] = useState<string>();
  const text = typed ?? (filter.year === undefined ? "" : String(filter.year));

  const bad = text.trim() !== "" && !/^\d{4}$/.test(text.trim());
  const era = filter.year === undefined ? undefined : eraOfYear(filter.year);
  const level = playLevel(filter);

  return (
    <div>
      <div role="alert" className="bt-problem">
        {problem === "read" ? STORAGE_READ_FAILED : problem === "write" ? STORAGE_WRITE_FAILED : ""}
      </div>
      <div className="as-aids__grid">
        <div className="bt-field">
          <label htmlFor="as-level">Rules level</label>
          <select
            id="as-level"
            value={level}
            disabled={!ready}
            aria-describedby="as-level-note"
            onChange={(event) => { updatePlayFilter({ rulesLevel: event.target.value as RulesLevel }); }}
          >
            {RULES_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <p id="as-level-note" className="as-field-note bt-hint">
            Units above this level are left out of the force&apos;s unit list. The aids and the special abilities list follow it.
          </p>
        </div>
        <div className="bt-field">
          <label htmlFor="as-edition">Edition</label>
          <select
            id="as-edition"
            value={filter.editionId ?? AS_EDITIONS[0].id}
            disabled={!ready}
            onChange={(event) => { updatePlayFilter({ editionId: event.target.value }); }}
          >
            {AS_EDITIONS.map((e) => (
              <option key={e.id} value={e.id}>{`${e.name}, ${e.printing}`}</option>
            ))}
          </select>
        </div>
        {!rulesOnly && (
          <>
            <div className="bt-field">
              <label htmlFor="as-year">Game year</label>
              <input
                id="as-year"
                inputMode="numeric"
                value={text}
                disabled={!ready}
                aria-invalid={bad || undefined}
                aria-describedby="as-year-note"
                onChange={(event) => {
                  setTyped(event.target.value);
                  const v = event.target.value.trim();
                  if (v === "") updatePlayFilter({ year: undefined });
                  else if (/^\d{4}$/.test(v)) updatePlayFilter({ year: Number.parseInt(v, 10) });
                }}
              />
              <p id="as-year-note" className="as-field-note bt-hint">
                {bad ? "Write the year as four digits, such as 3052." : era ? `The ${era.name} era. Units dated after ${String(filter.year)} are left out of the force's unit list.` : filter.year !== undefined ? "That year is before the first era." : "Leave blank to pick from every unit."}
              </p>
            </div>
            <div className="bt-field">
              <label htmlFor="as-tech">Tech base</label>
              <select
                id="as-tech"
                value={filter.techBase ?? ""}
                disabled={!ready}
                onChange={(event) => { updatePlayFilter({ techBase: event.target.value === "" ? undefined : (event.target.value as "inner-sphere" | "clan") }); }}
              >
                <option value="">Any</option>
                <option value="inner-sphere">Inner Sphere</option>
                <option value="clan">Clan</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
