// The 'Mech type selector (BattleMech, IndustrialMech, OmniMech): a labelled select with the chosen type's description and the page
// its rules start on beside it, in the text and not in a tooltip. It lists what the record's rules level, tech base and era or year
// allow, so the build form and the editor re-filter it as those change. A type whose rules are not built yet is listed disabled, with
// the reason in the text. It takes a record (anything with the fields availability reads) and reports the new type.
//
// The build form on the Classic home may also offer the aerospace units (`aero`): a second group in the same list that opens the
// AeroTech editor instead. The group lists only what the rules level allows (the form passes none below Standard).
import { MECH_TYPES } from "../../data/chassis";
import type { MechType } from "../../data/chassis";
import { bookName } from "../../data/editions";
import { typeChoices } from "../../rules/availability";
import { mechTypeOf } from "../../rules/mech";
import type { MechRecord } from "../../rules/mech";

type Subject = Pick<MechRecord, "techBase" | "year" | "era" | "rulesLevel" | "unitType">;

export interface AeroTypeChoices {
  /** The aerospace units on offer: an id, its label and a line saying what it is and where its rules are. */
  options: { id: string; label: string; note: string }[];
  /** The chosen one, when an aerospace unit is the choice. */
  chosen: string | undefined;
  onChoose: (id: string | undefined) => void;
}

const AERO_PREFIX = "aero:";

export default function TypeSelect({
  record,
  onChange,
  id = "field-unitType",
  className,
  aero,
}: {
  record: Subject;
  onChange: (type: MechType) => void;
  id?: string;
  className?: string;
  aero?: AeroTypeChoices;
}) {
  const choices = typeChoices(record);
  const current = mechTypeOf(record);
  const noteId = `${id}-note`;
  const waiting = choices.flatMap((choice) => (choice.disabled === undefined ? [] : [`${MECH_TYPES.find((t) => t.id === choice.id)?.label ?? choice.id} is not offered yet: ${choice.disabled}`]));
  const picked = aero?.chosen === undefined ? undefined : aero.options.find((option) => option.id === aero.chosen);
  return (
    <div className={className ? `bt-field bt-level ${className}` : "bt-field bt-level"}>
      <label htmlFor={id}>Type</label>
      <select
        id={id}
        value={picked ? `${AERO_PREFIX}${picked.id}` : current.id}
        aria-describedby={noteId}
        onChange={(event) => {
          const value = event.target.value;
          if (value.startsWith(AERO_PREFIX)) aero?.onChoose(value.slice(AERO_PREFIX.length));
          else {
            aero?.onChoose(undefined);
            onChange(value as MechType);
          }
        }}
      >
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id} disabled={choice.disabled !== undefined}>
            {choice.label}
          </option>
        ))}
        {aero && aero.options.length > 0 && (
          <optgroup label="Aerospace (opens the AeroTech editor)">
            {aero.options.map((option) => (
              <option key={option.id} value={`${AERO_PREFIX}${option.id}`}>
                {option.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <span id={noteId} className="bt-hint bt-level__note">
        {picked ? picked.note : `${current.description} ${bookName(current.cite.book)}, p. ${String(current.cite.page)}.`}
        {!picked && waiting.length > 0 && ` ${waiting.join(" ")}`}
      </span>
    </div>
  );
}
