// The ProtoMech diagram: the paper doll (doll/proto-doll.tsx) in its host, used by the armor panel and the sheet. With `onSelect` each location is a button
// named by its name and points; without it the whole figure is one labelled image.
import FigureDiagram from "../doll/figure-diagram";
import type { IFigureKind } from "../doll/figure-diagram";
import ProtoDoll, { fitProtoDoll, protoLayout } from "../doll/proto-doll";

export interface ProtoDiagramLocation {
  code: string;
  name: string;
  armor: number;
  structure?: number;
}
export interface ProtoDiagramProps {
  locations: ProtoDiagramLocation[];
  use: "armor" | "structure";
  /** The body: biped, quad or glider. */
  body?: string;
  onSelect?(code: string): void;
  selected?: string;
  inError?: string[];
  /** Placed inside another SVG (the sheet) at this rectangle, instead of standing alone. */
  frame?: { x: number; y: number; w: number; h: number };
  /** Ink for the sheet. */
  ink?: string;
}

const KIND: IFigureKind = { Doll: ProtoDoll, layout: protoLayout, fit: fitProtoDoll };

export default function ProtoDiagram({ locations, use, body = "biped", onSelect, selected, inError, frame, ink }: ProtoDiagramProps) {
  const total = locations.reduce((sum, l) => sum + Math.max(0, (use === "armor" ? l.armor : (l.structure ?? 0)) || 0), 0);
  return (
    <FigureDiagram
      kind={KIND} unit={{ layout: body, locations }} use={use} suffix={`proto-${use}${frame ? "-sheet" : ""}`} {...(frame ? {} : { className: "pm-diagram" })}
      labelSize={frame ? (use === "armor" ? 20 : 14) : use === "armor" ? 26 : 22} {...(frame ? { shortLabels: true } : {})} room={{ width: 760, height: 760 }}
      {...(frame ? { rect: frame, label: `${use === "armor" ? "Armor" : "Internal structure"}: ${String(total)} points in all` } : {})}
      {...(onSelect ? { onSelect } : {})} {...(selected === undefined ? {} : { selected })} {...(inError ? { inError } : {})} {...(ink ? { ink } : {})}
    />
  );
}
