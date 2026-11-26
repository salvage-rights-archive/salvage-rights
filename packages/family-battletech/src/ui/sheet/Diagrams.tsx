// The armor diagram and the internal structure diagram: the paper doll where the body type has one, else a framed list of
// each location's points as text, so the sheet is still usable.
import type { Catalog } from "../../rules/catalog";
import type { MechRecord } from "../../rules/mech";
import { shieldPoints } from "../../rules/shields";
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
  (p.rear === undefined ? `${p.name}: ${points(p.front)}` : `${p.name}: ${points(p.front)} front, ${points(p.rear)} rear`) + (p.armorType === undefined ? "" : `, ${p.armorType}`);

/** Patchwork armor: one line for each armor type, `Ferro-Fibrous (I.S.): RA, LA`, in the order the types first appear; none for one type all over. */
export function armorTypeLines(list: LocationPoints[]): string[] {
  const byType = new Map<string, string[]>();
  for (const p of list) if (p.armorType !== undefined) byType.set(p.armorType, [...(byType.get(p.armorType) ?? []), p.code]);
  return [...byType].map(([type, codes]) => `${type}: ${codes.join(", ")}`);
}

const LEGEND_PITCH = 26;
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

function Doll({ rect, record, catalog, use, title, suffix, legend = [] }: { rect: Rect; record: MechRecord; catalog: Catalog; use: "armor" | "structure"; title: string; suffix: string; legend?: string[] }) {
  const unit = dollUnitFromRecord(record, shieldPoints(record, catalog));
  // Patchwork armor: the armor type of each location is printed under the doll, which gives up that much room.
  const legendHeight = legend.length === 0 ? 0 : legend.length * LEGEND_PITCH + 10;
  const room = { width: rect.w - 2 * INSET, height: rect.h - 2 * INSET - 14 - legendHeight };
  const fit = unit ? fitDoll(unit, use, room.width, room.height, LABEL, true) : undefined;
  return (
    <Frame rect={rect} title={title} center>
      {unit && fit && (
        <g data-diagram={use} transform={`translate(${String(rect.x + (rect.w - fit.box.width) / 2)} ${String(rect.y + 14 + (rect.h - 14 - legendHeight - fit.box.height) / 2)})`}>
          <MechDoll unit={unit} use={use} frame={{ centerX: -fit.box.left, top: -fit.box.top, scale: fit.scale }} suffix={suffix} labelSize={LABEL} shortLabels />
        </g>
      )}
      {legend.length > 0 && (
        <g data-diagram="armor-types">
          {legend.map((line, index) => (
            <text key={line} x={rect.x + rect.w / 2} y={rect.y + rect.h - INSET - 8 - (legend.length - 1 - index) * LEGEND_PITCH} fontSize={LABEL} textAnchor="middle" fill={INK}>
              {line}
            </text>
          ))}
        </g>
      )}
    </Frame>
  );
}

export function ArmorDiagram({ rect, record, catalog, points }: { rect: Rect; record: MechRecord; catalog: Catalog; points: LocationPoints[] }) {
  return dollUnitFromRecord(record) ? (
    <Doll rect={rect} record={record} catalog={catalog} use="armor" title="ARMOR DIAGRAM" suffix="sheet-armor" legend={armorTypeLines(points)} />
  ) : (
    <TextBox rect={rect} title="ARMOR DIAGRAM" lines={points.map(armorText)} center />
  );
}

export function StructureDiagram({ rect, record, catalog, points }: { rect: Rect; record: MechRecord; catalog: Catalog; points: LocationPoints[] }) {
  return dollUnitFromRecord(record) ? (
    <Doll rect={rect} record={record} catalog={catalog} use="structure" title="INTERNAL STRUCTURE DIAGRAM" suffix="sheet-structure" />
  ) : (
    <TextBox rect={rect} title="INTERNAL STRUCTURE DIAGRAM" lines={points.map(structureText)} center />
  );
}
