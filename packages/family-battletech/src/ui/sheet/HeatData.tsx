// The heat data block (heat sinks, and the effects of each heat level) and the heat scale down the sheet's right edge.
import { HEAT_EFFECTS, HEAT_SCALE_TOP } from "../../data/sheet";
import Frame from "./Frame";
import type { Rect } from "./Frame";
import type { SheetFacts } from "./facts";
import { INK, squeeze } from "./text";

const ROW = 24;
/** Most circles in a column of heat sinks. */
const COLUMN = 10;
/** Most heat sink circles drawn, however many the record says (a slip of the keys must not hang the page); the printed line keeps the true count. */
export const MAX_SINKS_DRAWN = 100;

export function HeatData({ rect, facts }: { rect: Rect; facts: SheetFacts }) {
  const { x, y } = rect;
  const sinks = facts.heatSinks;
  const drawn = Math.min(sinks.count, MAX_SINKS_DRAWN);
  const columns = Math.max(1, Math.ceil(drawn / COLUMN));
  const pitch = Math.min(28, (rect.w - 340 - 24) / columns);
  const tableTop = y + 130;
  return (
    <Frame rect={rect} title="HEAT DATA">
      <text x={x + 24} y={y + 78} fontSize={25} fontWeight={700} fill={INK} {...squeeze(sinks.line, 25, rect.w - 48, true)}>
        {sinks.line}
      </text>
      <text x={x + 24} y={tableTop - 12} fontSize={20} fontWeight={700} fill={INK}>
        Heat Level*
      </text>
      <text x={x + 150} y={tableTop - 12} fontSize={20} fontWeight={700} fill={INK}>
        Effects
      </text>
      {HEAT_EFFECTS.rows.map((row, index) => (
        <g key={row.level} data-heat={row.level}>
          <text x={x + 100} y={tableTop + ROW * index + 12} fontSize={21} textAnchor="end" fill={INK}>
            {row.level}
          </text>
          <text x={x + 150} y={tableTop + ROW * index + 12} fontSize={21} fill={INK} {...squeeze(row.effect, 21, 190)}>
            {row.effect}
          </text>
        </g>
      ))}
      {Array.from({ length: drawn }, (_, index) => (
        <circle
          key={index}
          cx={x + rect.w - 24 - pitch / 2 - Math.floor(index / COLUMN) * pitch}
          cy={tableTop + 12 + (index % COLUMN) * 30}
          r={Math.min(11, pitch / 2 - 2)}
          fill="#fff"
          stroke={INK}
          strokeWidth={2.5}
        />
      ))}
    </Frame>
  );
}

/** The heat scale: an Overflow box over the boxes 30 to 0, with an asterisk on each level that has an effect. */
export function HeatScale({ rect }: { rect: Rect }) {
  const effects = new Set(HEAT_EFFECTS.rows.map((row) => row.level));
  const boxes = HEAT_SCALE_TOP + 1;
  const pitch = (rect.h - 96) / boxes;
  return (
    <g data-heat-scale="">
      <text x={rect.x + rect.w / 2} y={rect.y + 20} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
        Heat
      </text>
      <text x={rect.x + rect.w / 2} y={rect.y + 44} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
        Scale
      </text>
      <rect x={rect.x} y={rect.y + 56} width={rect.w} height={34} fill="#fff" stroke={INK} strokeWidth={2} />
      <text x={rect.x + rect.w / 2} y={rect.y + 79} fontSize={20} textAnchor="middle" fill={INK} textLength={rect.w - 8} lengthAdjust="spacingAndGlyphs">
        Overflow
      </text>
      {Array.from({ length: boxes }, (_, index) => {
        const level = HEAT_SCALE_TOP - index;
        const top = rect.y + 96 + index * pitch;
        return (
          <g key={level} data-level={level}>
            <rect x={rect.x} y={top} width={rect.w} height={pitch} fill="#fff" stroke={INK} strokeWidth={2} />
            <text x={rect.x + rect.w / 2} y={top + pitch / 2 + 7} fontSize={20} textAnchor="middle" fill={INK}>
              {effects.has(level) ? `${String(level)}*` : String(level)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
