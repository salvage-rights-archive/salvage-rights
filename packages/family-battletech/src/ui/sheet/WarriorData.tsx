// The warrior data block: the pilot's name and skills, and the Hits Taken track with the Consciousness number each hit needs.
import { CONSCIOUSNESS } from "../../data/sheet";
import Frame from "./Frame";
import type { Rect } from "./Frame";
import { INK } from "./text";

export default function WarriorData({ rect }: { rect: Rect }) {
  const { x, y } = rect;
  const rule = (x1: number, x2: number, ry: number) => <line x1={x1} x2={x2} y1={ry} y2={ry} stroke={INK} strokeWidth={2} />;
  const cells = CONSCIOUSNESS.length;
  const cell = (rect.w - 48) / cells;
  const row = (label: string, values: string[], top: number) => (
    <g>
      <text x={x + 24} y={top} fontSize={20} fill={INK}>
        {label}
      </text>
      {values.map((value, index) => (
        <g key={index}>
          <rect x={x + 24 + index * cell} y={top + 8} width={cell} height={38} fill="#fff" stroke={INK} strokeWidth={2} />
          <text x={x + 24 + index * cell + cell / 2} y={top + 35} fontSize={value === "Dead" ? 20 : 24} textAnchor="middle" fill={INK}>
            {value}
          </text>
        </g>
      ))}
    </g>
  );
  return (
    <Frame rect={rect} title="WARRIOR DATA">
      <text x={x + 24} y={y + 84} fontSize={24} fontWeight={700} fill={INK}>
        Name:
      </text>
      {rule(x + 100, x + rect.w - 24, y + 86)}
      <text x={x + 24} y={y + 138} fontSize={22} fontWeight={700} fill={INK}>
        Gunnery Skill:
      </text>
      {rule(x + 186, x + 250, y + 140)}
      <text x={x + 24} y={y + 188} fontSize={22} fontWeight={700} fill={INK}>
        Piloting Skill:
      </text>
      {rule(x + 186, x + 250, y + 190)}
      {row("Hits Taken", ["1", "2", "3", "4", "5", "6"], y + 232)}
      {row("Consciousness #", CONSCIOUSNESS, y + 296)}
    </Frame>
  );
}
