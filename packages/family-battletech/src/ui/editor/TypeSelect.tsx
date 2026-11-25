// The 'Mech type selector (BattleMech, IndustrialMech, OmniMech): a labelled select with the chosen type's description and the page
// its rules start on beside it, in the text and not in a tooltip. It lists what the record's rules level, tech base and era or year
// allow, so the build form and the editor re-filter it as those change. A type whose rules are not built yet is listed disabled, with
// the reason in the text. It takes a record (anything with the fields availability reads) and reports the new type.
import { MECH_TYPES } from "../../data/chassis";
import type { MechType } from "../../data/chassis";
import { bookName } from "../../data/editions";
import { typeChoices } from "../../rules/availability";
import { mechTypeOf } from "../../rules/mech";
import type { MechRecord } from "../../rules/mech";

type Subject = Pick<MechRecord, "techBase" | "year" | "era" | "rulesLevel" | "unitType">;

export default function TypeSelect({
  record,
  onChange,
  id = "field-unitType",
  className,
}: {
  record: Subject;
  onChange: (type: MechType) => void;
  id?: string;
  className?: string;
}) {
  const choices = typeChoices(record);
  const current = mechTypeOf(record);
  const noteId = `${id}-note`;
  const waiting = choices.flatMap((choice) => (choice.disabled === undefined ? [] : [`${MECH_TYPES.find((t) => t.id === choice.id)?.label ?? choice.id} is not offered yet: ${choice.disabled}`]));
  return (
    <div className={className ? `bt-field bt-level ${className}` : "bt-field bt-level"}>
      <label htmlFor={id}>Type</label>
      <select
        id={id}
        value={current.id}
        aria-describedby={noteId}
        onChange={(event) => {
          onChange(event.target.value as MechType);
        }}
      >
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id} disabled={choice.disabled !== undefined}>
            {choice.label}
          </option>
        ))}
      </select>
      <span id={noteId} className="bt-hint bt-level__note">
        {current.description} {`${bookName(current.cite.book)}, p. ${String(current.cite.page)}.`}
        {waiting.length > 0 && ` ${waiting.join(" ")}`}
      </span>
    </div>
  );
}
