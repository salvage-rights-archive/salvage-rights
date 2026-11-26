// The infantry platoon's figure: the paper doll (doll/infantry-doll.tsx), one drawing for each line of the platoon (a big platoon is split into
// sub-platoons, coded pl1, pl2 and so on), each a trooper figure with a bubble on its chest. The doll knows one location, `pl`, so each line is
// drawn as that and its pick is reported under the line's own code. With `onSelect` each line is a button named by its name and troopers.
import FigureDiagram from "../doll/figure-diagram";
import type { IFigureKind } from "../doll/figure-diagram";
import InfantryDoll, { fitInfantryDoll, infantryLayout } from "../doll/infantry-doll";

export interface DiagramLocation {
  code: string;
  name: string;
  /** For a platoon: the troopers on the line. */
  armor: number;
  structure?: number;
}
export interface InfantryDiagramProps {
  locations: DiagramLocation[];
  use: "armor" | "structure";
  /** The kind of trooper: foot, jump, motorized or mechanized. */
  kind?: string;
  onSelect?(code: string): void;
  selected?: string;
  inError?: string[];
}

const KIND: IFigureKind = { Doll: InfantryDoll, layout: infantryLayout, fit: fitInfantryDoll };

export default function InfantryDiagram({ locations, use, kind = "foot", onSelect, selected, inError = [] }: InfantryDiagramProps) {
  return (
    <div className="bt-infantry-diagram">
      {locations.map((l) => (
        <FigureDiagram
          key={l.code}
          kind={KIND} unit={{ layout: kind, locations: [{ code: "pl", name: l.name, armor: l.armor, ...(l.structure === undefined ? {} : { structure: l.structure }) }] }}
          label={onSelect ? l.name : `${l.name}, ${String(l.armor)} troopers`} use={use} suffix={`inf-${use}-${l.code}`} labelSize={24} room={{ width: 760, height: 600 }}
          {...(onSelect ? { onSelect: () => { onSelect(l.code); } } : {})} {...(selected === l.code ? { selected: "pl" } : {})} {...(inError.includes(l.code) ? { inError: ["pl"] } : {})}
        />
      ))}
    </div>
  );
}
