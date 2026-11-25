// A block of the sheet: a rounded frame with its name on a black tab.
import type { ReactNode } from "react";
import { INK } from "./text";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TAB_HEIGHT = 44;
/** Stencil capitals are about this wide as a share of their size, letter spacing included. */
const CAPITAL = 0.72;

export default function Frame({ rect, title, center = false, children }: { rect: Rect; title?: string; center?: boolean; children?: ReactNode }) {
  // The tab's type is 26 units, or smaller where the name would not fit the frame; never under the sheet's smallest.
  const size = title ? Math.max(20, Math.min(26, (rect.w - 40) / (title.length * CAPITAL))) : 26;
  const width = title ? title.length * size * CAPITAL + 36 : 0;
  const tabX = center ? rect.x + (rect.w - width) / 2 : rect.x + 18;
  return (
    <g>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={20} fill="#fff" stroke={INK} strokeWidth={4} />
      {title && (
        <g>
          <rect x={tabX} y={rect.y - TAB_HEIGHT / 2} width={width} height={TAB_HEIGHT} rx={14} fill={INK} />
          <text className="bt-sheet__head" x={tabX + width / 2} y={rect.y + size * 0.35} textAnchor="middle" fontSize={size} fill="#fff" letterSpacing={1}>
            {title}
          </text>
        </g>
      )}
      {children}
    </g>
  );
}
