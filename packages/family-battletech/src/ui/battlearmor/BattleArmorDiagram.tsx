// The battle armor figure seam: one box for each trooper (codes t1 to t6), each with one bubble for every armor point and the trooper's own bubble
// first. Until the Fable doll replaces it, this is the one place that draws it, on the sheet and in the editor's armor panel. It takes the trooper
// list and reports a pick; nothing else about a suit reaches it.
import type { ReactNode } from "react";

export interface DiagramLocation {
  code: string;
  name: string;
  armor: number;
  structure?: number;
}
export interface BattleArmorDiagramProps {
  locations: DiagramLocation[];
  use: "armor" | "structure";
  onSelect?: (code: string) => void;
  selected?: string;
  inError?: string[];
}

const SIZE = 14;
const GAP = 4;
const PER_ROW = 10;
/** More bubbles than a suit can carry (18 armor points and the trooper) are not drawn. */
const MOST = 30;

/** One row of bubbles; the first is the trooper's, drawn filled grey as on the sheet. */
function Bubbles({ count, trooper }: { count: number; trooper: boolean }) {
  const total = Math.min(MOST, Math.max(0, Math.floor(count)) + (trooper ? 1 : 0));
  const rows = Math.max(1, Math.ceil(total / PER_ROW));
  const width = Math.min(total, PER_ROW) * (SIZE + GAP);
  return (
    <svg className="ba-bubbles" viewBox={`0 0 ${String(Math.max(width, SIZE + GAP))} ${String(rows * (SIZE + GAP))}`} width={Math.max(width, SIZE + GAP)} height={rows * (SIZE + GAP)} aria-hidden="true" focusable="false">
      {Array.from({ length: total }, (_, i) => (
        <circle key={i} cx={(i % PER_ROW) * (SIZE + GAP) + SIZE / 2 + GAP / 2} cy={Math.floor(i / PER_ROW) * (SIZE + GAP) + SIZE / 2 + GAP / 2} r={SIZE / 2 - 1} className={trooper && i === 0 ? "ba-bubbles__trooper" : "ba-bubbles__armor"} />
      ))}
    </svg>
  );
}

export default function BattleArmorDiagram({ locations, use, onSelect, selected, inError = [] }: BattleArmorDiagramProps) {
  return (
    <ul className="ba-diagram bt-list" aria-label="Troopers">
      {locations.map((loc) => {
        const points = use === "armor" ? loc.armor : (loc.structure ?? 0);
        const label = use === "armor" ? `${loc.name}, ${String(loc.armor)} armor ${loc.armor === 1 ? "point" : "points"} and the trooper` : `${loc.name}, ${String(points)} structure ${points === 1 ? "point" : "points"}`;
        const classes = ["ba-diagram__box", selected === loc.code ? "is-selected" : "", inError.includes(loc.code) ? "is-error" : ""].filter(Boolean).join(" ");
        const inner: ReactNode = (
          <>
            <span className="ba-diagram__name">{loc.name}</span>
            <Bubbles count={points} trooper={use === "armor"} />
          </>
        );
        return (
          <li key={loc.code}>
            {onSelect ? (
              <button type="button" className={classes} aria-label={label} aria-pressed={selected === loc.code} onClick={() => { onSelect(loc.code); }}>
                {inner}
              </button>
            ) : (
              <div className={classes} role="img" aria-label={label}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
