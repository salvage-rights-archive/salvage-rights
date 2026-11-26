// The head of every AeroTech record sheet: the unit's name, the sheet's title and edition, the OFFICIAL mark and our name. Pure; paper ink on white.
import { INK, squeeze } from "../../sheet/text";
import type { FighterFacts } from "./facts";

/** `narrow` for the arrangements whose first block starts lower on the left (the AeroTech 2 pair), where the name has a little less room. */
export default function SheetHead({ facts, heading, narrow = false }: { facts: Pick<FighterFacts, "title" | "edition" | "official">; heading: string; narrow?: boolean }) {
  const name = facts.title;
  const nameSize = Math.min(84, Math.floor((narrow ? 1000 : 1020) / (Math.max(name.length, 1) * 0.62)));
  return (
    <>
      <text className="bt-sheet__head" x={40} y={30 + nameSize * 0.8} fontSize={nameSize} fill={INK} {...squeeze(name, nameSize, narrow ? 1040 : 1100)}>
        {name}
      </text>
      <text x={42} y={170} fontSize={34} fontWeight={700} fill={INK}>
        {heading}
      </text>
      <text x={42} y={204} fontSize={22} fill={INK} {...squeeze(`Built under ${facts.edition}`, 22, 1000)}>
        {`Built under ${facts.edition}`}
      </text>
      <text className="bt-sheet__head" x={1670} y={170} fontSize={24} textAnchor="end" letterSpacing={3} fill={INK}>
        SALVAGE RIGHTS
      </text>
      <text x={1670} y={142} fontSize={26} fontWeight={700} textAnchor="end" fill={INK} data-official={facts.official.badge === "OFFICIAL"} {...squeeze(facts.official.line, 26, 560, true)}>
        {facts.official.line}
      </text>
    </>
  );
}
