// The critical table: each location's slots numbered 1 to 6 as on the published sheets, the hit boxes under the center torso
// and the damage transfer diagram. Slot labels are the editor's own, from `layout`.
import { CRITICAL_BOXES, EMPTY_SLOT, SHEET_COLUMNS } from "../../data/sheet";
import { locationName } from "../../rules/mech";
import type { LocationCode, Layout, MechRecord } from "../../rules/mech";
import { dollUnitFromRecord } from "../doll/layouts";
import { fitDoll } from "../doll/box";
import MechDoll from "../doll/mech-doll";
import Frame from "./Frame";
import type { Rect } from "./Frame";
import { FAINT, INK, squeeze, wrap } from "./text";

const PITCH = 24;
const SLOT_TYPE = 21;
const COLUMN_GAP = 6;

/** One location: its name, then its slots in groups of six, a 12-slot location marked 1-3 and 4-6 at the left. */
function Location({ code, layout, x, y, width }: { code: LocationCode; layout: Layout; x: number; y: number; width: number }) {
  const cells = layout.slots[code] ?? [];
  const groups = Math.max(1, Math.ceil(cells.length / 6));
  const label = width - 84;
  return (
    <g data-location={code}>
      <text x={x + width / 2} y={y + 22} fontSize={24} fontWeight={700} textAnchor="middle" fill={INK}>
        {locationName(code)}
      </text>
      {Array.from({ length: groups }, (_, group) => {
        const top = y + 40 + group * (6 * PITCH + 12);
        return (
          <g key={group}>
            {groups > 1 && (
              <text x={x + 24} y={top + 3 * PITCH + 4} fontSize={28} fontWeight={700} textAnchor="middle" fill={INK}>
                {`${String(group * 3 + 1)}-${String(group * 3 + 3)}`}
              </text>
            )}
            {cells.slice(group * 6, group * 6 + 6).map((cell, index) => {
              const empty = cell.kind === "empty";
              const text = empty ? EMPTY_SLOT : cell.label;
              return (
                <g key={index} data-slot={empty ? "empty" : cell.kind}>
                  <text x={x + 68} y={top + index * PITCH + 14} fontSize={SLOT_TYPE} textAnchor="end" fontWeight={empty ? 400 : 700} fill={empty ? FAINT : INK}>
                    {`${String(index + 1)}.`}
                  </text>
                  <text
                    x={x + 78}
                    y={top + index * PITCH + 14}
                    fontSize={SLOT_TYPE}
                    fontWeight={empty ? 400 : 700}
                    fill={empty ? FAINT : INK}
                    {...squeeze(text, SLOT_TYPE, label, !empty)}
                  >
                    {text}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

/** The height a location takes: its name and its groups of six slots. */
const heightOf = (code: LocationCode, layout: Layout) => 40 + Math.max(1, Math.ceil((layout.slots[code]?.length ?? 0) / 6)) * (6 * PITCH + 12) + 6;

export default function CriticalTable({ rect, record, layout }: { rect: Rect; record: MechRecord; layout: Layout }) {
  const columns = Object.hasOwn(SHEET_COLUMNS, record.configuration) ? SHEET_COLUMNS[record.configuration] : undefined;
  if (!layout.supported || !columns) {
    return (
      <Frame rect={rect} title="CRITICAL TABLE">
        <text x={rect.x + 30} y={rect.y + 90} fontSize={24} fill={INK}>
          {`This sheet has no critical table for a ${record.configuration} yet.`}
        </text>
      </Frame>
    );
  }
  const inner = rect.w - 30;
  const width = (inner - (columns.length - 1) * COLUMN_GAP) / columns.length;
  const columnX = (index: number) => rect.x + 15 + index * (width + COLUMN_GAP);
  const top = rect.y + 40;
  const stack = (codes: LocationCode[], index: number) => {
    let y = top;
    return codes
      .filter((code) => layout.slots[code])
      .map((code) => {
        const at = y;
        y += heightOf(code, layout) + 8;
        return <Location key={code} code={code} layout={layout} x={columnX(index)} y={at} width={width} />;
      });
  };
  // The middle column: head and center torso, then the hit boxes and the damage transfer diagram.
  const middle = columns[1] ?? [];
  const middleEnd = middle.reduce((y, code) => y + (layout.slots[code] ? heightOf(code, layout) + 8 : 0), top);
  const hitsTop = middleEnd + 6;
  const unit = dollUnitFromRecord(record);
  const diagramTop = hitsTop + CRITICAL_BOXES.length * 34 + 14;
  const diagramRoom = { width: width - 40, height: rect.y + rect.h - 40 - diagramTop };
  const fit = unit ? fitDoll(unit, "transfer", diagramRoom.width, diagramRoom.height) : undefined;
  const middleX = columnX(1);
  return (
    <Frame rect={rect} title="CRITICAL TABLE">
      {columns.map((codes, index) => (
        <g key={index}>{stack(codes, index)}</g>
      ))}
      {CRITICAL_BOXES.map(({ label, boxes }, row) => (
        <g key={label} data-hits={label}>
          <text x={middleX + width / 2 + 20} y={hitsTop + row * 34 + 24} fontSize={24} fontWeight={700} textAnchor="end" fill={INK}>
            {label}
          </text>
          {Array.from({ length: boxes }, (_, box) => (
            <circle key={box} cx={middleX + width / 2 + 40 + box * 30} cy={hitsTop + row * 34 + 16} r={11} fill="#fff" stroke={INK} strokeWidth={2.5} />
          ))}
        </g>
      ))}
      {unit && fit && (
        <g data-diagram="transfer">
          <g transform={`translate(${String(middleX + width / 2 - fit.box.width / 2)} ${String(diagramTop)})`}>
            <MechDoll unit={unit} use="transfer" frame={{ centerX: -fit.box.left, top: -fit.box.top, scale: fit.scale }} suffix="sheet-transfer" />
          </g>
          <text x={middleX + width / 2} y={diagramTop + fit.box.height + 26} fontSize={22} textAnchor="middle" fill={INK}>
            Damage Transfer Diagram
          </text>
        </g>
      )}
      {!unit && (
        <g data-diagram="transfer-text">
          <rect x={middleX + 20} y={diagramTop} width={width - 40} height={Math.max(60, diagramRoom.height)} rx={12} fill="#fff" stroke={INK} strokeWidth={2.5} />
          {wrap("Damage transfer: no diagram is drawn for this body type yet.", 20, width - 70).map((line, index) => (
            <text key={index} x={middleX + width / 2} y={diagramTop + 34 + index * 24} fontSize={20} textAnchor="middle" fill={INK}>
              {line}
            </text>
          ))}
        </g>
      )}
    </Frame>
  );
}
