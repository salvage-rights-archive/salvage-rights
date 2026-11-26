// The host of a figure doll (vehicle, ProtoMech, battle armor, infantry): the <svg>, the white sheet under it, and the scale the doll fits to.
// Standing alone it is sized by its page; given a `rect` it is placed inside a larger drawing (the record sheet). The four unit types' diagrams
// are this one component with their own doll, so selection, error outlines and keyboard come from the doll itself. A location the doll cannot
// draw (a code its layout lacks, or a figure that fits no room) is never lost: it is listed under the drawing as a plain labelled button.
import { useEffect, useState } from "react";
import type { ComponentType, JSX } from "react";
import type { FigureUse, IFigureBox, IFigureDollProps, IFigureLayout, IFigureUnit } from "./figure-doll";
import { PAPER } from "./pen";

export interface IFigureKind {
  Doll: ComponentType<IFigureDollProps>;
  layout(unit: IFigureUnit): IFigureLayout;
  fit(unit: IFigureUnit, use: FigureUse, width: number, height: number, labelSize?: number, short?: boolean): { scale: number; box: IFigureBox } | undefined;
}

export interface IFigureDiagramProps {
  kind: IFigureKind;
  unit: IFigureUnit;
  use: FigureUse;
  /** Makes this drawing's pattern ids unique on a page that has several. */
  suffix: string;
  onSelect?(code: string): void;
  selected?: string;
  inError?: string[];
  /** The drawing's own name, when it stands as one image or as a group of buttons. */
  label?: string;
  ink?: string;
  /** Where to draw it inside a larger drawing: it is then sized by this, not by the page. */
  rect?: { x: number; y: number; w: number; h: number };
  className?: string;
  /** The room the doll is fitted to, and its label size; a larger label reads better where the page shrinks the drawing. */
  room?: { width: number; height: number };
  labelSize?: number;
  shortLabels?: boolean;
}

/** The locations as a plain list: buttons when the diagram takes picks, text otherwise. */
function Leftovers({ locations, use, selected, inError, onSelect }: { locations: IFigureUnit["locations"]; use: FigureUse; selected: string | undefined; inError: string[]; onSelect: ((code: string) => void) | undefined }): JSX.Element | null {
  if (locations.length === 0) return null;
  return (
    <ul className="bt-list bt-figure-list" aria-label="Locations the drawing does not show">
      {locations.map((l) => {
        const points = Math.max(0, Math.floor((use === "armor" ? l.armor : (l.structure ?? l.armor)) || 0));
        const text = `${l.name}, ${String(points)} ${use === "armor" ? "armor" : "structure"}${inError.includes(l.code) ? ", in error" : ""}`;
        return (
          <li key={l.code}>
            {onSelect ? <button type="button" className="bt-button" aria-pressed={selected === l.code} onClick={() => { onSelect(l.code); }}>{text}</button> : text}
          </li>
        );
      })}
    </ul>
  );
}

export default function FigureDiagram({ kind, unit, use, suffix, onSelect, selected, inError = [], label, ink, rect, className, room = { width: 760, height: 760 }, labelSize, shortLabels }: IFigureDiagramProps): JSX.Element | null {
  const [host, setHost] = useState<SVGSVGElement | null>(null);
  const [pixels, setPixels] = useState(0);
  useEffect(() => {
    if (!host || typeof ResizeObserver === "undefined") return undefined;
    const watch = new ResizeObserver(() => { setPixels(host.getBoundingClientRect().width); });
    watch.observe(host);
    return () => { watch.disconnect(); };
  }, [host]);
  const size = rect ? { width: rect.w, height: rect.h } : room;
  const fit = kind.fit(unit, use, size.width, size.height, labelSize, shortLabels);
  const drawnCodes = new Set(kind.layout(unit).locations.map((each) => each.code));
  const rest = fit ? unit.locations.filter((each) => !drawnCodes.has(each.code)) : unit.locations;
  // On a sheet the list cannot stand inside the drawing: the sheet prints its own text of the points.
  const list = rect ? null : <Leftovers locations={rest} use={use} selected={selected} inError={inError} onSelect={onSelect} />;
  if (!fit) return list;
  const { box, scale } = fit;
  const { Doll } = kind;
  // A hit area of 44 CSS pixels, in the drawing's units, so that a small part stays as easy to touch at 320 px as a large one.
  const minTarget = !rect && onSelect && pixels > 0 ? Math.ceil((44 * Math.ceil(box.width)) / pixels) : undefined;
  const place = rect ? { x: rect.x, y: rect.y, width: rect.w, height: rect.h, preserveAspectRatio: "xMidYMid meet" as const } : {};
  const role = onSelect ? { role: "group", "aria-label": label ?? (use === "armor" ? "Armor by location" : "Internal structure by location") } : label ? { role: "img", "aria-label": label } : {};
  const drawing = (
    <svg ref={setHost} {...place} {...(className ? { className } : {})} viewBox={`0 0 ${String(Math.ceil(box.width))} ${String(Math.ceil(box.height))}`} {...role}>
      {/* A white sheet, so the doll's black labels and focus ring are seen on the dark theme too. */}
      <rect width="100%" height="100%" fill={PAPER} aria-hidden="true" />
      <Doll
        unit={unit} use={use} frame={{ centerX: -box.left, top: -box.top, scale }} suffix={suffix}
        {...(selected === undefined ? {} : { selected })} {...(onSelect ? { onSelect } : {})} {...(inError.length > 0 ? { inError } : {})} {...(ink ? { ink } : {})}
        {...(minTarget ? { minTarget } : {})} {...(labelSize === undefined ? {} : { labelSize })} {...(shortLabels ? { shortLabels } : {})}
      />
    </svg>
  );
  return rest.length === 0 || rect ? drawing : <>{drawing}{list}</>;
}
