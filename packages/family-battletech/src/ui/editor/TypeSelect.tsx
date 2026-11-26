// The 'Mech type selector (BattleMech, IndustrialMech, OmniMech): a labelled select with the chosen type's description and the page
// its rules start on beside it, in the text and not in a tooltip. It lists what the record's rules level, tech base and era or year
// allow, so the build form and the editor re-filter it as those change. A type whose rules are not built yet is listed disabled, with
// the reason in the text. It takes a record (anything with the fields availability reads) and reports the new type.
//
// The build form on the Classic home may also offer other unit families (`families`: vehicles, aerospace, ProtoMechs, battle armor,
// and later infantry): each is a group of its own in the same list that opens that family's editor instead. A group lists only what
// the rules level, year and era allow (the form passes none otherwise). Choosing one family's option clears the others.
import { MECH_TYPES } from "../../data/chassis";
import type { MechType } from "../../data/chassis";
import { bookName } from "../../data/editions";
import { typeChoices } from "../../rules/availability";
import { mechTypeOf } from "../../rules/mech";
import type { MechRecord } from "../../rules/mech";

type Subject = Pick<MechRecord, "techBase" | "year" | "era" | "rulesLevel" | "unitType">;

export interface AeroTypeChoices {
  /** The units of one family on offer: an id, its label and a line saying what it is and where its rules are. */
  options: { id: string; label: string; note: string }[];
  /** The chosen one, when a unit of this family is the choice. */
  chosen: string | undefined;
  onChoose: (id: string | undefined) => void;
}

/** One unit family in the list: its option-value prefix, the group's visible label and its choices. Groups show in array order. */
export interface TypeFamily {
  prefix: string;
  label: string;
  choices: AeroTypeChoices;
}

export default function TypeSelect({
  record,
  onChange,
  id = "field-unitType",
  className,
  families = [],
}: {
  record: Subject;
  onChange: (type: MechType) => void;
  id?: string;
  className?: string;
  families?: TypeFamily[];
}) {
  const choices = typeChoices(record);
  const current = mechTypeOf(record);
  const noteId = `${id}-note`;
  const waiting = choices.flatMap((choice) => (choice.disabled === undefined ? [] : [`${MECH_TYPES.find((t) => t.id === choice.id)?.label ?? choice.id} is not offered yet: ${choice.disabled}`]));
  const picked = families.flatMap((family) => {
    const option = family.choices.chosen === undefined ? undefined : family.choices.options.find((each) => each.id === family.choices.chosen);
    return option ? [{ family, option }] : [];
  })[0];
  return (
    <div className={className ? `bt-field bt-level ${className}` : "bt-field bt-level"}>
      <label htmlFor={id}>Type</label>
      <select
        id={id}
        value={picked ? `${picked.family.prefix}${picked.option.id}` : current.id}
        aria-describedby={noteId}
        onChange={(event) => {
          const value = event.target.value;
          const chosen = families.find((family) => value.startsWith(family.prefix));
          for (const family of families) if (family !== chosen) family.choices.onChoose(undefined);
          if (chosen) chosen.choices.onChoose(value.slice(chosen.prefix.length));
          else onChange(value as MechType);
        }}
      >
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id} disabled={choice.disabled !== undefined}>
            {choice.label}
          </option>
        ))}
        {families.map(
          (family) =>
            family.choices.options.length > 0 && (
              <optgroup key={family.prefix} label={family.label}>
                {family.choices.options.map((option) => (
                  <option key={option.id} value={`${family.prefix}${option.id}`}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ),
        )}
      </select>
      <span id={noteId} className="bt-hint bt-level__note">
        {picked ? picked.option.note : `${current.description} ${bookName(current.cite.book)}, p. ${String(current.cite.page)}.`}
        {!picked && waiting.length > 0 && ` ${waiting.join(" ")}`}
      </span>
    </div>
  );
}
