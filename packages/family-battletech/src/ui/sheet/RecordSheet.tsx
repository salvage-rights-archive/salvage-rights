// The printable record sheet of a 'Mech, laid out in the arrangement players know from the published sheets: title, 'Mech
// data, warrior data, unit picture and armor diagram across the top; critical table, internal structure and heat data
// below. One SVG of 1700 by 2200 units (Letter proportions); the type never goes under 20 units, 6.6 pt at Letter width.
// Pure: it reads nothing but its props, so it can be tested and reused. The sheet is paper: white, with black ink.
import type { Catalog } from "../../rules/catalog";
import type { MechRecord } from "../../rules/mech";
import { ArmorDiagram, StructureDiagram } from "./Diagrams";
import CriticalTable from "./CriticalTable";
import { HeatData, HeatScale } from "./HeatData";
import MechData from "./MechData";
import SheetText from "./SheetText";
import UnitPicture from "./UnitPicture";
import WarriorData from "./WarriorData";
import { sheetFacts } from "./facts";
import { INK, squeeze } from "./text";

export const SHEET_WIDTH = 1700;
export const SHEET_HEIGHT = 2200;

const RECTS = {
  mech: { x: 30, y: 215, w: 640, h: 895 },
  warrior: { x: 700, y: 215, w: 390, h: 360 },
  picture: { x: 700, y: 600, w: 390, h: 510 },
  armor: { x: 1110, y: 40, w: 560, h: 900 },
  structure: { x: 1110, y: 990, w: 465, h: 520 },
  scale: { x: 1592, y: 968, w: 78, h: 1177 },
  heat: { x: 1110, y: 1550, w: 465, h: 595 },
  critical: { x: 30, y: 1150, w: 1060, h: 995 },
};

const TRADEMARK_LINE =
  "BattleTech, 'Mech, BattleMech, and MechWarrior are registered trademarks and/or trademarks of The Topps Company, Inc. Unofficial, non-commercial fan project, not affiliated with or endorsed by Topps or Catalyst Game Labs.";

export default function RecordSheet({ record, catalog }: { record: MechRecord; catalog: Catalog }) {
  const facts = sheetFacts(record, catalog);
  const name = facts.title;
  const nameSize = Math.min(84, Math.floor(1020 / (Math.max(name.length, 1) * 0.62)));
  const credit = facts.designer === undefined ? "" : ` Designed by ${facts.designer} on mordel.net.`;
  return (
    <>
      <svg
        className="bt-sheet"
        viewBox={`0 0 ${String(SHEET_WIDTH)} ${String(SHEET_HEIGHT)}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${name} record sheet`}
      >
        <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill="#fff" />
        <text className="bt-sheet__head" x={40} y={40 + nameSize * 0.8} fontSize={nameSize} fill={INK}>
          {name}
        </text>
        <text x={42} y={170} fontSize={34} fontWeight={700} fill={INK}>
          BattleMech record sheet
        </text>
        <text className="bt-sheet__head" x={1090} y={170} fontSize={24} textAnchor="end" letterSpacing={3} fill={INK}>
          SALVAGE RIGHTS
        </text>

        <MechData rect={RECTS.mech} facts={facts} />
        <WarriorData rect={RECTS.warrior} />
        <UnitPicture rect={RECTS.picture} record={record} label={`${name}, unit picture`} />
        <ArmorDiagram rect={RECTS.armor} record={record} points={facts.points} />
        <CriticalTable rect={RECTS.critical} record={record} layout={facts.layout} />
        <StructureDiagram rect={RECTS.structure} record={record} points={facts.points} />
        <HeatScale rect={RECTS.scale} />
        <HeatData rect={RECTS.heat} facts={facts} />

        <text x={SHEET_WIDTH / 2} y={2171} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(`Not an official record sheet. Made with Salvage Rights, an unofficial fan project.${credit}`, 20, 1640)}>
          {`Not an official record sheet. Made with Salvage Rights, an unofficial fan project.${credit}`}
        </text>
        <text x={SHEET_WIDTH / 2} y={2194} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(TRADEMARK_LINE, 20, 1640)}>
          {TRADEMARK_LINE}
        </text>
      </svg>
      <SheetText facts={facts} record={record} />
    </>
  );
}
