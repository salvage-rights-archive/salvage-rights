// The Year field with the Era drop-down beside it, as every unit editor shows them: the year picks the era by the tech base, an era chosen fills the year, the
// choices follow the tech base and the rules level (hide, do not mark; Unlimited offers all, tagged), and a caption under the select gives the era in full.
// One component so the rule lives in rules/availability.ts and the layout in one place.
import { eraNeedsPick, eraOfRecord, eraOutside, erasForTechBase, erasOfYear, resolveEra, setEra, setYear } from "../rules/availability";
import { rulesetOf } from "../data/rulesets";
import type { When } from "../rules/availability";
import type { RulesLevel } from "../data/chassis";
import { NumberField, SelectField } from "./aero/fields";
import { eraCaptionText } from "./eraCaption";
import { eraChoice, eraList, useEraRoom } from "./eraChoice";

type Draft = When & { techBase?: string };
type Subject = Draft & { rulesLevel?: RulesLevel };

/** A tech base change: a year in two eras takes the era the new tech base decides. Call it inside the edit that sets the tech base. */
export function eraFollowsBase(draft: Draft): void {
  if (erasOfYear(draft.year, rulesetOf(draft.editionId)).length > 1) resolveEra(draft);
}

/** Year and Era side by side (stacked on a phone). `hint` is the Year's note. */
export function YearEraFields<R extends Subject>({ record, onEdit, hint }: { record: R; onEdit: (mutate: (draft: R) => void, coalesce?: string) => void; hint?: string }) {
  const room = useEraRoom();
  const ruleset = rulesetOf(record.editionId);
  const yearEras = erasOfYear(record.year, ruleset);
  const pick = yearEras.length > 1 && eraNeedsPick(record);
  const eraNow = eraOfRecord(record);
  const options = [{ value: "", label: pick ? "Choose an era" : "Any era" }, ...eraList(erasForTechBase([...ruleset.eras, ...(ruleset.subEras ?? [])], record.techBase, record.rulesLevel), eraNow).map((era) => eraChoice(era, room, eraOutside(era, record.techBase, record.rulesLevel)))];
  return (
    <div className="bt-grid__wide bt-yearera">
      <NumberField
        id="field-year"
        label="Year"
        value={record.year}
        allowEmpty
        hint={hint}
        onValid={(v) => {
          onEdit((d) => {
            setYear(d, v);
          }, "year");
        }}
      />
      <SelectField
        id="field-era"
        label="Era"
        value={pick ? "" : (eraNow?.id ?? record.era ?? "")}
        options={options}
        caption={pick ? undefined : eraCaptionText(eraNow)}
        hint={yearEras.length > 1 ? `The year ${String(record.year)} is in two eras; the era you choose decides the tech base.` : undefined}
        onChange={(v) => {
          onEdit((d) => {
            setEra(d, v);
          });
        }}
      />
    </div>
  );
}
