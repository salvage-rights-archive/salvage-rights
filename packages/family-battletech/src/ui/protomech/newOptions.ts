// Whether the new-unit list offers a ProtoMech for the form's rules level, year and era (hide, do not mark): above Introductory, where Clan technology is on offer
// for that year and era, and where ProtoMechs exist (their prototype years on). With no year the form already asks for one, so the choice is shown.
import type { RulesLevel } from "../../data/chassis";
import { levelAtLeast } from "../../rules/levels";
import { newProtoRecord } from "../../rules/protomech/record";
import { unitInTime } from "../../rules/protomech/offered";

export interface ProtoNewOption {
  id: string;
  label: string;
  note: string;
}

export function protoNewOptions(form: { rulesLevel: RulesLevel | undefined; year: number | null; era: string | undefined; clanOffered: boolean }): ProtoNewOption[] {
  if (!form.clanOffered || !levelAtLeast(form.rulesLevel ?? "standard", "standard")) return [];
  const probe = newProtoRecord({ year: form.year, ...(form.era === undefined ? {} : { era: form.era }), ...(form.rulesLevel === undefined ? {} : { rulesLevel: form.rulesLevel }) });
  if (!unitInTime(probe)) return [];
  return [{ id: "protomech", label: "ProtoMech", note: "ProtoMech: a Clan unit of 2 to 9 tons, built under TechManual construction and opened in the ProtoMech editor. TechManual, p. 80." }];
}
