import { useEffect, useState } from "react";
import type { PlayFilter } from "../../rules/as-force";
import { eraOfYear } from "../../rules/time";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { openAsStorage } from "./storage";
import type { AsStorage } from "./storage";

/**
 * The game year and tech base the player is picking for. A unit dated after the year, or of the other tech base, is left out of the
 * force's unit list (not marked); a unit with no year or a mixed tech base is never left out by that part.
 */
export default function AsPlayFilter() {
  const [storage, setStorage] = useState<AsStorage>();
  const [filter, setFilter] = useState<PlayFilter>({});
  const [text, setText] = useState("");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const s = await openAsStorage();
        const f = await s.getFilter();
        setStorage(s);
        setFilter(f);
        setText(f.year === undefined ? "" : String(f.year));
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  const apply = (next: PlayFilter) => {
    setFilter(next);
    storage?.setFilter(next).then(
      () => { setProblem(""); },
      () => { setProblem(STORAGE_WRITE_FAILED); },
    );
  };
  const bad = text.trim() !== "" && !/^\d{4}$/.test(text.trim());
  const era = filter.year === undefined ? undefined : eraOfYear(filter.year);

  return (
    <div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <div className="bt-field">
        <label htmlFor="as-year">Game year</label>
        <input
          id="as-year"
          inputMode="numeric"
          value={text}
          disabled={!storage}
          aria-invalid={bad || undefined}
          aria-describedby="as-year-note"
          onChange={(event) => {
            setText(event.target.value);
            const v = event.target.value.trim();
            if (v === "") apply({ ...filter, year: undefined });
            else if (/^\d{4}$/.test(v)) apply({ ...filter, year: Number.parseInt(v, 10) });
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
          disabled={!storage}
          onChange={(event) => { apply({ ...filter, techBase: event.target.value === "" ? undefined : (event.target.value as "inner-sphere" | "clan") }); }}
        >
          <option value="">Any</option>
          <option value="inner-sphere">Inner Sphere</option>
          <option value="clan">Clan</option>
        </select>
      </div>
    </div>
  );
}
