// The battle armor figure: the paper doll (doll/battle-armor-doll.tsx) in its host, one suit for each trooper (codes t1 to t6) with its armor bubbles and
// the trooper's own bubble. It takes the trooper list and reports a pick; nothing else about a suit reaches it. With `rect` it is drawn inside the
// record sheet at that rectangle.
import FigureDiagram from "../doll/figure-diagram";
import type { IFigureKind } from "../doll/figure-diagram";
import BattleArmorDoll, { battleArmorLayout, fitBattleArmorDoll } from "../doll/battle-armor-doll";

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
  /** Where to draw it inside the sheet, and the drawing's own name there. */
  rect?: { x: number; y: number; w: number; h: number };
  label?: string;
}

const KIND: IFigureKind = { Doll: BattleArmorDoll, layout: battleArmorLayout, fit: fitBattleArmorDoll };

export default function BattleArmorDiagram({ locations, use, body = "humanoid", onSelect, selected, inError, rect, label }: BattleArmorDiagramProps) {
  return (
    <FigureDiagram
      kind={KIND} unit={{ layout: body, locations }} use={use} suffix={rect ? `ba-sheet-${use}` : `ba-${use}`} {...(rect ? { rect, labelSize: 22 } : { className: "ba-diagram", labelSize: 26 })} room={{ width: 900, height: 900 }}
      {...(label ? { label } : {})} {...(onSelect ? { onSelect } : {})} {...(selected === undefined ? {} : { selected })} {...(inError ? { inError } : {})}
    />
  );
}
