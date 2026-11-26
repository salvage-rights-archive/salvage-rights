// The placeholder diagram of an infantry platoon: one labelled box for each line of the platoon with one bubble for each trooper, until the
// doll replaces it in this one place. The same props as the other unit types' diagrams. With `onSelect` each box is a button named by its
// location and trooper count; without, the whole figure is one labelled image.
import { INK } from "../sheet/text";

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
  onSelect?(code: string): void;
  selected?: string;
  inError?: string[];
}

const PER_ROW = 15;
const CELL = 22;
const BOX_W = PER_ROW * CELL + 16;

export default function InfantryDiagram({ locations, use, onSelect, selected, inError = [] }: InfantryDiagramProps) {
  const points = (l: DiagramLocation): number => (use === "structure" ? (l.structure ?? 0) : l.armor);
  const rows = (n: number) => Math.max(1, Math.ceil(n / PER_ROW));
  let y = 4;
  const boxes = locations.map((l) => {
    const n = points(l);
    const height = 30 + rows(n) * CELL + 8;
    const box = { l, n, y, height };
    y += height + 8;
    return box;
  });
  const total = y;
  const label = `Platoon diagram: ${locations.map((l) => `${l.name}, ${String(points(l))} troopers`).join("; ")}`;
  return (
    <svg className="bt-infantry-diagram" viewBox={`0 0 ${String(BOX_W + 8)} ${String(total)}`} role={onSelect ? "group" : "img"} aria-label={label} width="100%" style={{ maxWidth: BOX_W + 8 }}>
      {boxes.map(({ l, n, y: top, height }) => {
        const picked = selected === l.code;
        const bad = inError.includes(l.code);
        const content = (
          <g>
            <rect x={4} y={top} width={BOX_W} height={height} rx={8} fill="var(--sr-surface, #fff)" stroke={bad ? "#b00020" : INK} strokeWidth={picked ? 4 : 2} />
            <text x={14} y={top + 20} fontSize={14} fill="currentColor">{`${l.name}: ${String(n)}`}</text>
            {Array.from({ length: n }, (_, i) => (
              <circle key={i} cx={16 + (i % PER_ROW) * CELL + CELL / 2} cy={top + 30 + Math.floor(i / PER_ROW) * CELL + CELL / 2} r={CELL / 2 - 3} fill="none" stroke="currentColor" strokeWidth={1.5} />
            ))}
          </g>
        );
        return onSelect ? (
          <g key={l.code} role="button" tabIndex={0} aria-label={`${l.name}, ${String(n)} troopers`} aria-pressed={picked} onClick={() => { onSelect(l.code); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(l.code); } }} style={{ cursor: "pointer" }}>
            {content}
          </g>
        ) : (
          <g key={l.code}>{content}</g>
        );
      })}
    </svg>
  );
}
