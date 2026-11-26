// The vehicle's armor and structure diagram: a labelled box for each location with one bubble for each point. A plain placeholder until the
// paper doll replaces this one component (brief-classic-dolls.md): the props are the doll's seam. With `onSelect` each box is a button named by
// its location and points; without it the whole drawing is one labelled image.
import { useState } from "react";
import type { KeyboardEvent } from "react";

export interface DiagramLocation {
  code: string;
  name: string;
  armor: number;
  structure?: number;
}
export interface VehicleDiagramProps {
  locations: DiagramLocation[];
  use: "armor" | "structure";
  onSelect?: (code: string) => void;
  selected?: string;
  inError?: string[];
  /** The drawing's own name, when it is an image. */
  label?: string;
  /** Ink and paper: the sheet passes black and white; the editor takes the page's text colour. */
  ink?: string;
  paper?: string;
  /** Where to draw it inside a larger drawing (the sheet): it is then sized by this, not by the page. */
  rect?: { x: number; y: number; w: number; h: number };
}

const BOX_W = 180;
const BOX_H = 165;
const GAP = 14;
/** Where each location sits, as column and row of the cross: rotor and front above, sides and turret across, rear below. */
const CELL: Record<string, [number, number]> = { rot: [2, 0], f: [1, 0], l: [0, 1], t: [1, 1], r: [2, 1], b: [1, 2] };
const stray = (index: number): [number, number] => [index % 3, 3 + Math.floor(index / 3)];

/** The bubble size and columns that fit `count` bubbles in the box's room. */
function pack(count: number): { radius: number; columns: number } {
  const width = BOX_W - 16;
  const height = BOX_H - 40;
  for (let radius = 9; radius > 2; radius -= 0.5) {
    const step = radius * 2 + 2.5;
    const columns = Math.floor(width / step);
    if (columns > 0 && Math.ceil(count / columns) * step <= height) return { radius, columns };
  }
  return { radius: 2.5, columns: Math.floor(width / 5.5) };
}

export default function VehicleDiagram({ locations, use, onSelect, selected, inError = [], label, ink = "currentColor", paper = "none", rect }: VehicleDiagramProps) {
  const [focused, setFocused] = useState<string>();
  const strays = locations.filter((l) => !Object.hasOwn(CELL, l.code));
  const placed = locations.map((l) => {
    const known = Object.hasOwn(CELL, l.code);
    const [col, row] = known ? (CELL[l.code] ?? [0, 0]) : stray(strays.indexOf(l));
    return { ...l, x: 8 + col * (BOX_W + GAP), y: 8 + row * (BOX_H + GAP) };
  });
  const rows = Math.max(...placed.map((p) => Math.round((p.y - 8) / (BOX_H + GAP)) + 1), 3);
  const width = 3 * BOX_W + 2 * GAP + 16;
  const height = rows * BOX_H + (rows - 1) * GAP + 16;
  const points = (l: DiagramLocation) => (use === "armor" ? l.armor : (l.structure ?? 0));
  return (
    <svg {...(rect ? { x: rect.x, y: rect.y, width: rect.w, height: rect.h, preserveAspectRatio: "xMidYMid meet" } : { className: "bt-vehicle-diagram" })} viewBox={`0 0 ${String(width)} ${String(height)}`} role={onSelect ? "group" : "img"} aria-label={label ?? `Vehicle ${use} diagram`} style={{ color: ink }}>
      {placed.map((l) => {
        const count = Math.max(0, Math.floor(points(l)));
        const { radius, columns } = pack(count);
        const step = radius * 2 + 2.5;
        const text = `${l.name}, ${String(count)} ${use} point${count === 1 ? "" : "s"}`;
        const bad = inError.includes(l.code);
        const activate = () => {
          onSelect?.(l.code);
        };
        const key = (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        };
        return (
          <g
            key={l.code}
            data-location={l.code}
            {...(onSelect ? { role: "button", tabIndex: 0, "aria-label": text, "aria-pressed": selected === l.code, onClick: activate, onKeyDown: key, onFocus: () => { setFocused(l.code); }, onBlur: () => { setFocused(undefined); } } : {})}
            className={onSelect ? "bt-vehicle-diagram__box bt-vehicle-diagram__box--button" : "bt-vehicle-diagram__box"}
          >
            <rect x={l.x} y={l.y} width={BOX_W} height={BOX_H} rx={10} fill={paper} stroke={bad ? "var(--sr-danger, #b3261e)" : ink} strokeWidth={selected === l.code || focused === l.code ? 6 : 2.5} strokeDasharray={focused === l.code ? "14 6" : undefined} />
            <text x={l.x + 10} y={l.y + 24} fontSize={17} fontWeight={700} fill={ink}>
              {`${l.name} ${String(count)}`}
            </text>
            {Array.from({ length: count }, (_, i) => (
              <circle key={i} cx={l.x + 8 + radius + (i % columns) * step} cy={l.y + 36 + radius + Math.floor(i / columns) * step} r={radius} fill="none" stroke={ink} strokeWidth={1.2} aria-hidden="true" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
