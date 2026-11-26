// The rules level selector: a labelled select with the chosen level's description and the page that names it beside it, in the
// text and not in a tooltip. It takes a record (anything with an optional `rulesLevel`) and reports the new level, so the
// editor, the build form and later unit types put it in "the equivalent place" without knowing about a 'Mech. A game's ruleset
// (Classic when none is given) decides which levels are listed and what the game calls them.
import { RULES_LEVELS } from "../../data/chassis";
import type { RulesLevel } from "../../data/chassis";
import { bookName } from "../../data/editions";
import { CLASSIC } from "../../data/rulesets";
import type { Ruleset } from "../../data/rulesets";
import { DEFAULT_LEVEL, levelRow } from "../../rules/levels";

/** What the note says of a level the game's own sheets print: the Classic note names Classic's books, so the game says it in its own words. */
const PRINTED_ON_SHEETS = "A level the Gothic record sheets print.";
const SHEET_LEVELS: RulesLevel[] = ["introductory", "standard", "licensed-noncanon"];

export default function LevelSelect({
  record,
  onChange,
  id = "field-rulesLevel",
  className,
  ruleset = CLASSIC,
}: {
  record: { rulesLevel?: RulesLevel };
  onChange: (level: RulesLevel) => void;
  id?: string;
  className?: string;
  ruleset?: Ruleset;
}) {
  const level = levelRow(record.rulesLevel ?? DEFAULT_LEVEL, ruleset);
  const noteId = `${id}-note`;
  const own = ruleset.game !== "classic" && SHEET_LEVELS.includes(level.id);
  // The current level stays listed even when the game does not offer it, so the selector never blanks.
  const rows = RULES_LEVELS.filter((row) => row.id === level.id || ruleset.levels.includes(row.id)).map((row) => levelRow(row.id, ruleset));
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
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label}
          </option>
        ))}
      </select>
      <span id={noteId} className="bt-hint bt-level__note">
        {own ? PRINTED_ON_SHEETS : level.description}
        {!own && level.cite && ` ${[level.cite, ...(level.see ?? [])].map((c) => `${bookName(c.book)}, p. ${String(c.page)}`).join("; ")}.`}
      </span>
    </div>
  );
}
