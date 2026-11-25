// The armor diagram and the internal structure diagram: the paper doll where the body type has one, else a framed list of
// each location's points as text, so the sheet is still usable.
import type { MechRecord } from "../../rules/mech";
import { dollUnitFromRecord } from "../doll/layouts";
import { fitDoll } from "../doll/box";
import MechDoll from "../doll/mech-doll";
import Frame from "./Frame";
import type { Rect } from "./Frame";
import { DASH } from "./facts";
import type { LocationPoints } from "./facts";
import { INK } from "./text";

/** The type size the doll's labels are drawn at on the sheet: the smallest the sheet prints. */
const LABEL = 20;
const INSET = 8;

const points = (n: number | undefined) => (n === undefined ? DASH : String(n));

/** One location's armor as text: `Left Torso: 10 front, 3 rear`. */
export const armorText = (p: LocationPoints) =>
  p.rear === undefined ? `${p.name}: ${points(p.front)}` : `${p.name}: ${points(p.front)} front, ${points(p.rear)} rear`;
export const structureText = (p: LocationPoints) => `${p.name}: ${points(p.structure)}`;

function TextBox({ rect, title, lines, center }: { rect: Rect; title: string; lines: string[]; center?: boolean }) {
  return (
    <Frame rect={rect} title={title} center={center}>
      <g data-diagram="text">
        {lines.map((line, index) => (
          <text key={index} x={rect.x + 28} y={rect.y + 84 + index * 34} fontSize={24} fill={INK}>
            {line}
          </text>
        ))}
      </g>
    </Frame>
  );
}

function Doll({ rect, record, use, title, suffix }: { rect: Rect; record: MechRecord; use: "armor" | "structure"; title: string; suffix: string }) {
  const unit = dollUnitFromRecord(record);
  const room = { width: rect.w - 2 * INSET, height: rect.h - 2 * INSET - 14 };
  const fit = unit ? fitDoll(unit, use, room.width, room.height, LABEL, true) : undefined;
  return (
    <Frame rect={rect} title={title} center>
      {unit && fit && (
        <g data-diagram={use} transform={`translate(${String(rect.x + (rect.w - fit.box.width) / 2)} ${String(rect.y + 14 + (rect.h - 14 - fit.box.height) / 2)})`}>
          <MechDoll unit={unit} use={use} frame={{ centerX: -fit.box.left, top: -fit.box.top, scale: fit.scale }} suffix={suffix} labelSize={LABEL} shortLabels />
        </g>
      )}
    </Frame>
  );
}

export function ArmorDiagram({ rect, record, points }: { rect: Rect; record: MechRecord; points: LocationPoints[] }) {
  return dollUnitFromRecord(record) ? (
    <Doll rect={rect} record={record} use="armor" title="ARMOR DIAGRAM" suffix="sheet-armor" />
  ) : (
    <TextBox rect={rect} title="ARMOR DIAGRAM" lines={points.map(armorText)} center />
  );
}

export function StructureDiagram({ rect, record, points }: { rect: Rect; record: MechRecord; points: LocationPoints[] }) {
  return dollUnitFromRecord(record) ? (
    <Doll rect={rect} record={record} use="structure" title="INTERNAL STRUCTURE DIAGRAM" suffix="sheet-structure" />
  ) : (
    <TextBox rect={rect} title="INTERNAL STRUCTURE DIAGRAM" lines={points.map(structureText)} center />
  );
}
