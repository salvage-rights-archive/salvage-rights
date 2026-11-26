// The battle armor figure: the paper doll (doll/battle-armor-doll.tsx) in its host, one suit for each trooper (codes t1 to t6) with its armor bubbles and
// the trooper's own bubble. It takes the trooper list and reports a pick; nothing else about a suit reaches it.
import FigureDiagram from "../doll/figure-diagram";
import type { IFigureKind } from "../doll/figure-diagram";
import BattleArmorDoll, { fitBattleArmorDoll } from "../doll/battle-armor-doll";

export interface DiagramLocation {
  code: string;
  name: string;
  armor: number;
  structure?: number;
}
export interface BattleArmorDiagramProps {
  locations: DiagramLocation[];
  use: "armor" | "structure";
  /** The suit: humanoid or quad. */
  body?: string;
  onSelect?: (code: string) => void;
  selected?: string;
  inError?: string[];
}

const KIND: IFigureKind = { Doll: BattleArmorDoll, fit: fitBattleArmorDoll };

export default function BattleArmorDiagram({ locations, use, body = "humanoid", onSelect, selected, inError }: BattleArmorDiagramProps) {
  return (
    <FigureDiagram
      kind={KIND} unit={{ layout: body, locations }} use={use} suffix={`ba-${use}`} className="ba-diagram" labelSize={26} room={{ width: 900, height: 900 }}
      {...(onSelect ? { onSelect } : {})} {...(selected === undefined ? {} : { selected })} {...(inError ? { inError } : {})}
    />
  );
}
