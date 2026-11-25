// The rules level selector: a labelled select with the chosen level's description and the page that names it beside it, in the
// text and not in a tooltip. It takes a record (anything with an optional `rulesLevel`) and reports the new level, so the
// editor, the build form and later unit types put it in "the equivalent place" without knowing about a 'Mech.
import { RULES_LEVELS } from "../../data/chassis";
import type { RulesLevel } from "../../data/chassis";
import { bookName } from "../../data/editions";
import { DEFAULT_LEVEL, levelRow } from "../../rules/levels";

export default function LevelSelect({
  record,
  onChange,
  id = "field-rulesLevel",
  className,
}: {
  record: { rulesLevel?: RulesLevel };
  onChange: (level: RulesLevel) => void;
  id?: string;
  className?: string;
}) {
  const level = levelRow(record.rulesLevel ?? DEFAULT_LEVEL);
  const noteId = `${id}-note`;
  return (
    <div className={className ? `bt-field bt-level ${className}` : "bt-field bt-level"}>
      <label htmlFor={id}>Rules level</label>
      <select
        id={id}
        value={level.id}
        aria-describedby={noteId}
        onChange={(event) => {
          onChange(event.target.value as RulesLevel);
        }}
      >
        {RULES_LEVELS.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label}
          </option>
        ))}
      </select>
      <span id={noteId} className="bt-hint bt-level__note">
        {level.description}
        {level.cite && ` ${[level.cite, ...(level.see ?? [])].map((c) => `${bookName(c.book)}, p. ${String(c.page)}`).join("; ")}.`}
      </span>
    </div>
  );
}
