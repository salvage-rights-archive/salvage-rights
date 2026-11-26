// The warrior data block: the pilot's name and skills, and the Hits Taken track with the Consciousness number each hit needs.
import { CONSCIOUSNESS } from "../../data/sheet";
import Frame from "./Frame";
import type { Rect } from "./Frame";
import { INK, MIN_SIZE, squeeze } from "./text";

/** A pilot filled in by the force page. Skills are as the pilot's card gives them; `carries` names the Abomination units a Handler serves. */
export interface SheetPilot {
  name: string;
  gunnery: number;
  piloting: number;
  frayed: boolean;
  /** A Handler rides in this 'Mech (Gothic; drawn only where the sheet has a Handler box). */
  handler: boolean;
  carries?: string;
}

/** With `gothic`, Gothic's check boxes: Frayed always, Handler only where the unit may carry one. */
export default function WarriorData({ rect, gothic, pilot, gunner }: { rect: Rect; gothic?: { handler: boolean }; pilot?: SheetPilot; /** A second warrior, the gunner (a QuadVee's crew): the block holds two compact ones. */ gunner?: boolean }) {
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
  const filled = (text: string, left: number, top: number, width: number, name: string) => (
    <text x={left} y={top} fontSize={24} fill={INK} data-pilot={name} {...squeeze(text, 24, width)}>
      {text}
    </text>
  );
  const box = (label: string, top: number, name: string, ticked = false) => (
    <g data-box={name}>
      <text x={x + 256} y={top} fontSize={20} fontWeight={700} fill={INK}>
        {label}
      </text>
      <rect x={x + rect.w - 50} y={top - 24} width={30} height={30} fill="#fff" stroke={INK} strokeWidth={2} />
      {ticked && (
        <text x={x + rect.w - 35} y={top - 1} fontSize={28} fontWeight={700} textAnchor="middle" fill={INK}>
          X
        </text>
      )}
    </g>
  );
  if (gunner) {
    const crew = (who: string, top: number, filled: SheetPilot | undefined) => (
      <g data-warrior={who.toLowerCase()}>
        <text x={x + 24} y={top} fontSize={22} fontWeight={700} fill={INK}>{`${who}:`}</text>
        {rule(x + 112, x + rect.w - 24, top + 2)}
        {filled && filled.name.trim() !== "" && <text x={x + 120} y={top - 4} fontSize={22} fill={INK} {...squeeze(filled.name.trim(), 22, rect.w - 150)}>{filled.name.trim()}</text>}
        <text x={x + 24} y={top + 36} fontSize={20} fontWeight={700} fill={INK}>Gunnery:</text>
        {rule(x + 118, x + 168, top + 38)}
        <text x={x + 200} y={top + 36} fontSize={20} fontWeight={700} fill={INK}>Piloting:</text>
        {rule(x + 292, x + 342, top + 38)}
        {row("Hits Taken", ["1", "2", "3", "4", "5", "6"], top + 56)}
        {row("Consciousness #", CONSCIOUSNESS, top + 108)}
      </g>
    );
    return (
      <Frame rect={rect} title="WARRIOR DATA">
        {crew("Pilot", y + 84, pilot)}
        {crew("Gunner", y + 84 + 190, undefined)}
      </Frame>
    );
  }
  return (
    <Frame rect={rect} title="WARRIOR DATA">
      <text x={x + 24} y={y + 84} fontSize={24} fontWeight={700} fill={INK}>
        Name:
      </text>
      {rule(x + 100, x + rect.w - 24, y + 86)}
      {pilot && pilot.name.trim() !== "" && filled(pilot.name.trim(), x + 108, y + 80, rect.w - 140, "name")}
      <text x={x + 24} y={y + 138} fontSize={22} fontWeight={700} fill={INK}>
        Gunnery Skill:
      </text>
      {rule(x + 186, x + 250, y + 140)}
      {pilot && filled(String(pilot.gunnery), x + 206, y + 134, 40, "gunnery")}
      <text x={x + 24} y={y + 188} fontSize={22} fontWeight={700} fill={INK}>
        Piloting Skill:
      </text>
      {rule(x + 186, x + 250, y + 190)}
      {pilot && filled(String(pilot.piloting), x + 206, y + 184, 40, "piloting")}
      {gothic && box("Frayed", y + 138, "frayed", pilot?.frayed === true)}
      {gothic?.handler === true && box("Handler", y + 188, "handler", pilot?.handler === true)}
      {gothic?.handler === true && pilot?.handler === true && pilot.carries && (
        <text x={x + 24} y={y + 209} fontSize={MIN_SIZE} fill={INK} data-pilot="carries" {...squeeze(`Handler for: ${pilot.carries}`, MIN_SIZE, rect.w - 48)}>
          {`Handler for: ${pilot.carries}`}
        </text>
      )}
      {row("Hits Taken", ["1", "2", "3", "4", "5", "6"], y + 232)}
      {row("Consciousness #", CONSCIOUSNESS, y + 296)}
    </Frame>
  );
}
