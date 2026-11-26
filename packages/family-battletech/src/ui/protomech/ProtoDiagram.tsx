// The ProtoMech diagram: each location as a labelled box with one bubble per point. A plain stand-in kept in one component so the paper doll can
// replace it in one place (brief-classic-dolls.md): it takes the doll's own props, `unit.locations`-style, and is used by the armor panel and the sheet.
// With `onSelect` each box is a button named by location and points; without it the whole figure is one labelled image.
import type { KeyboardEvent } from "react";

export interface ProtoDiagramLocation {
  code: string;
  name: string;
  armor: number;
  structure?: number;
}
export interface ProtoDiagramProps {
  locations: ProtoDiagramLocation[];
  use: "armor" | "structure";
  onSelect?(code: string): void;
  selected?: string;
  inError?: string[];
  /** Placed inside another SVG (the sheet) at this rectangle, instead of standing alone. */
  frame?: { x: number; y: number; w: number; h: number };
  /** Ink for the sheet; the page uses its own colors. */
  ink?: string;
}

const WIDTH = 640;
const HEIGHT = 426;
/** The boxes, sized for the most points each location can hold (TechManual p. 82: 6 head, 18 torso, 4 arm, 10 legs, 3 main gun). */
const BOXES: Record<string, { x: number; y: number; w: number; h: number }> = {
  hd: { x: 240, y: 8, w: 160, h: 116 },
  la: { x: 8, y: 140, w: 126, h: 140 },
  t: { x: 150, y: 140, w: 340, h: 140 },
  ra: { x: 506, y: 140, w: 126, h: 140 },
  mg: { x: 8, y: 298, w: 126, h: 120 },
  lg: { x: 190, y: 298, w: 260, h: 120 },
};
const STEP = 26;
const RADIUS = 9;

export default function ProtoDiagram({ locations, use, onSelect, selected, inError = [], frame, ink }: ProtoDiagramProps) {
  const shown = locations.filter((l) => Object.hasOwn(BOXES, l.code));
  const points = (l: ProtoDiagramLocation) => Math.max(0, (use === "armor" ? l.armor : (l.structure ?? 0)) || 0);
  const total = shown.reduce((sum, l) => sum + points(l), 0);
  const label = `${use === "armor" ? "Armor" : "Internal structure"}: ${shown.map((l) => `${l.name} ${String(points(l))}`).join(", ")}; ${String(total)} in all`;
  const place = frame ? { x: frame.x, y: frame.y, width: frame.w, height: frame.h } : {};
  const press = (code: string) => (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(code);
    }
  };
  return (
    <svg
      className={`pm-diagram${frame ? " pm-diagram--sheet" : ""}`}
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      preserveAspectRatio="xMidYMid meet"
      role={onSelect ? "group" : "img"}
      aria-label={onSelect ? `${use === "armor" ? "Armor" : "Internal structure"} by location` : label}
      style={ink ? ({ color: ink } as React.CSSProperties) : undefined}
      {...place}
    >
      {shown.map((l) => {
        const box = BOXES[l.code] as (typeof BOXES)[string];
        const n = points(l);
        const columns = Math.max(1, Math.floor((box.w - 20) / STEP));
        const bad = inError.includes(l.code);
        const chosen = selected === l.code;
        const text = `${l.name}, ${String(n)} ${n === 1 ? "point" : "points"}`;
        const body = (
          <>
            <rect className="pm-diagram__box" x={box.x} y={box.y} width={box.w} height={box.h} rx={12} />
            <text className="pm-diagram__label" x={box.x + 12} y={box.y + 24} fontSize={20}>
              {`${l.name} ${String(n)}`}
            </text>
            {Array.from({ length: n }, (_, i) => (
              <circle
                key={i}
                className={use === "armor" ? "pm-diagram__armor" : "pm-diagram__structure"}
                cx={box.x + 22 + (i % columns) * STEP}
                cy={box.y + 52 + Math.floor(i / columns) * STEP}
                r={RADIUS}
              />
            ))}
          </>
        );
        return onSelect ? (
          <g
            key={l.code}
            role="button"
            tabIndex={0}
            aria-label={text}
            aria-pressed={chosen}
            className={`pm-diagram__loc${bad ? " pm-diagram__loc--error" : ""}${chosen ? " pm-diagram__loc--selected" : ""}`}
            onClick={() => {
              onSelect(l.code);
            }}
            onKeyDown={press(l.code)}
          >
            {body}
          </g>
        ) : (
          <g key={l.code} className={`pm-diagram__loc${bad ? " pm-diagram__loc--error" : ""}`}>
            {body}
          </g>
        );
      })}
    </svg>
  );
}
