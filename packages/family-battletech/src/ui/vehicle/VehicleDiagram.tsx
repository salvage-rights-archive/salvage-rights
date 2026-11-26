// The vehicle's armor and structure diagram: the paper doll (doll/vehicle-doll.tsx) in its host. The motive type picks the hull; the turret comes from the
// locations. With `onSelect` each location is a button named by its name and points; without it the whole drawing is one labelled image.
import FigureDiagram from "../doll/figure-diagram";
import type { IFigureKind } from "../doll/figure-diagram";
import VehicleDoll, { fitVehicleDoll } from "../doll/vehicle-doll";

export interface DiagramLocation {
  code: string;
  name: string;
  armor: number;
  structure?: number;
}
export interface VehicleDiagramProps {
  locations: DiagramLocation[];
  use: "armor" | "structure";
  /** The motive type, which picks the hull. */
  motive?: string;
  onSelect?: (code: string) => void;
  selected?: string;
  inError?: string[];
  /** The drawing's own name, when it is an image. */
  label?: string;
  /** Ink: the sheet passes black; the editor takes the doll's own. */
  ink?: string;
  /** Where to draw it inside a larger drawing (the sheet): it is then sized by this, not by the page. */
  rect?: { x: number; y: number; w: number; h: number };
}

const KIND: IFigureKind = { Doll: VehicleDoll, fit: fitVehicleDoll };

export default function VehicleDiagram({ locations, use, motive = "tracked", onSelect, selected, inError, label, ink, rect }: VehicleDiagramProps) {
  return (
    <FigureDiagram
      kind={KIND} unit={{ layout: motive, locations }} use={use} suffix={rect ? "vehicle-sheet" : "vehicle-editor"} {...(rect ? {} : { className: "bt-vehicle-diagram" })}
      labelSize={rect ? 26 : 30} room={{ width: 760, height: 900 }}
      {...(onSelect ? { onSelect } : {})} {...(selected === undefined ? {} : { selected })} {...(inError ? { inError } : {})} {...(label ? { label } : {})} {...(ink ? { ink } : {})} {...(rect ? { rect } : {})}
    />
  );
}
