// Our own small icons for the Aces vocabulary, drawn from plain shapes (a tick, a cross, triangles, rings, an eye, arrows). An
// icon never stands alone: it is hidden from assistive technology and always sits beside its words.
import type { ReactNode } from "react";
import type { IconId } from "../../data/aces-vocab";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const letter = (ch: string): ReactNode => (
  <>
    <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" {...stroke} />
    <text x="8" y="11.6" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">
      {ch}
    </text>
  </>
);

const eye = (
  <>
    <path d="M1.5 8 C4 3.5 12 3.5 14.5 8 C12 12.5 4 12.5 1.5 8 Z" {...stroke} />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
  </>
);

const SHAPES: Record<IconId, ReactNode> = {
  moved: (
    <>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" {...stroke} />
      <path d="M4.5 8.5 L7 11 L11.5 5" {...stroke} />
    </>
  ),
  unmoved: (
    <>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" {...stroke} />
      <path d="M5 5 L11 11 M11 5 L5 11" {...stroke} />
    </>
  ),
  most: (
    <>
      <path d="M8 1.5 L14.5 13.5 H1.5 Z" {...stroke} />
      <path d="M8 6.5 V11.5 M5.5 9 H10.5" {...stroke} />
    </>
  ),
  fewest: (
    <>
      <path d="M8 14.5 L14.5 2.5 H1.5 Z" {...stroke} />
      <path d="M5.5 7 H10.5" {...stroke} />
    </>
  ),
  zone: (
    <>
      <circle cx="8" cy="8" r="6.5" {...stroke} />
      <circle cx="8" cy="8" r="3" {...stroke} />
    </>
  ),
  "attack-range": (
    <>
      <circle cx="8" cy="8" r="4.5" {...stroke} />
      <path d="M8 1 V4.5 M8 11.5 V15 M1 8 H4.5 M11.5 8 H15" {...stroke} />
    </>
  ),
  sight: eye,
  "no-sight": (
    <>
      {eye}
      <path d="M2.5 13.5 L13.5 2.5" {...stroke} />
    </>
  ),
  closer: <path d="M1.5 3.5 L6.5 8 L1.5 12.5 M14.5 3.5 L9.5 8 L14.5 12.5" {...stroke} />,
  spacing: <path d="M6 3.5 L1.5 8 L6 12.5 M10 3.5 L14.5 8 L10 12.5" {...stroke} />,
  bracket: <path d="M1.5 4 V12 M14.5 4 V12 M1.5 8 H14.5" {...stroke} />,
  ground: letter("G"),
  jump: letter("J"),
  sprint: letter("S"),
  standstill: (
    <>
      <circle cx="8" cy="8" r="6.5" {...stroke} />
      <path d="M5 8 H11" {...stroke} strokeWidth={2.5} />
    </>
  ),
  "destroy-objective": (
    <>
      <circle cx="8" cy="8" r="6.5" {...stroke} />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <path d="M8 1.5 V5 M8 11 V14.5 M1.5 8 H5 M11 8 H14.5" {...stroke} />
    </>
  ),
  "move-objective": (
    <>
      <circle cx="8" cy="8" r="6.5" {...stroke} />
      <path d="M5.5 5.5 L10.5 10.5 M10.5 5.5 L5.5 10.5" {...stroke} />
    </>
  ),
};

/** What each icon stands for, in our words, for the legend. */
export const ICON_WORDS: Record<IconId, string> = {
  moved: "moved (or cannot move)",
  unmoved: "not yet moved",
  most: "the most",
  fewest: "the fewest",
  zone: "zones, nearest first",
  "attack-range": "in attack range",
  sight: "in line of sight",
  "no-sight": "line of sight blocked",
  closer: "get closer",
  spacing: "keep a distance",
  bracket: "range bracket",
  ground: "Ground",
  jump: "Jump",
  sprint: "Sprint",
  standstill: "Standstill",
  "destroy-objective": "destroy objective",
  "move-objective": "movement objective",
};

export function AcesIcon({ id }: { id: IconId }) {
  return (
    <svg className="aces-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      {SHAPES[id]}
    </svg>
  );
}

/** Words with their icon in front; without an icon, just the words. */
export function IconLabel({ icon, children }: { icon?: IconId; children: ReactNode }) {
  return (
    <span className="aces-icon-label">
      {icon ? <AcesIcon id={icon} /> : null}
      {children}
    </span>
  );
}
