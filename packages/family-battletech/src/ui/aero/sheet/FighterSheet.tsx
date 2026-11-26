// The printable record sheet of a fighter, one SVG of 1700 by 2200 units (Letter proportions, the Classic sheet's own). Three arrangements: the
// AeroTech (1986) sheet in our own layout, the AeroTech 2 pair (AeroTech 2 and its Revised edition) and the current blank. The flagged ones follow
// the publisher's blank, drawn by us with no logo or art; the page and its notice are cited in the text copy. The type never goes under 20 units.
// Pure: it reads nothing but its props. The sheet is paper: white, with black ink.
import type { SheetProfile } from "../../../data/aero-sheet";
import { sheetProfileFor } from "../../../data/aero-sheet";
import type { AeroRecord } from "../../../rules/aero";
import type { Catalog } from "../../../rules/catalog";
import { fighterFacts } from "./facts";
import type { FighterFacts } from "./facts";
import { TRADEMARK_LINE } from "../../sheet/RecordSheet";
import { INK, squeeze } from "../../sheet/text";
import type { Rect } from "../../sheet/Frame";
import ArmorDiagram from "./Diagram";
import { CriticalBlock, DataBlock, EquipmentAreas, GroundTables, HeatData, HeatScale, HeatScaleColumn, MovementVectors, NotesBlock, PilotBlock, SinksStrip, StoresBlock, VelocityBlock } from "./Blocks";
import SheetText from "./SheetText";
import { SHEET_FOOT } from "../../../data/aero-sheet";

export const SHEET_WIDTH = 1700;
export const SHEET_HEIGHT = 2200;

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/** The blocks of each arrangement, in sheet units. */
const AT1 = {
  data: r(30, 240, 640, 400),
  pilot: r(30, 660, 640, 240),
  velocity: r(30, 920, 640, 890),
  armor: r(690, 240, 560, 1000),
  heat: r(1270, 240, 400, 1010),
  equipment: r(690, 1270, 980, 860),
};
const AT2 = {
  armor: r(30, 220, 1060, 1010),
  vessel: r(1110, 220, 560, 880),
  heat: r(1110, 1120, 560, 1030),
  critical: r(30, 1250, 510, 420),
  pilot: r(560, 1250, 530, 290),
  stores: r(560, 1560, 530, 250),
  velocityDown: r(560, 1560, 530, 590),
  velocityAcross: r(30, 1830, 1060, 320),
};
const CURRENT = {
  data: r(30, 245, 690, 830),
  armor: r(735, 245, 545, 1060),
  stores: r(1300, 245, 370, 340),
  notes: r(30, 1095, 690, 310),
  critical: r(30, 1425, 520, 340),
  pilot: r(570, 1425, 520, 300),
  heat: r(1110, 1350, 480, 780),
  scale: r(1610, 1290, 60, 850),
  ground: r(1110, 1350, 560, 780),
  velocity: r(30, 1790, 1060, 345),
};

export interface FighterSheetProps {
  record: AeroRecord;
  catalog: Catalog;
  /** The sheet to draw; found from the record's edition and unit type when absent. */
  profile?: SheetProfile;
}

export default function FighterSheet({ record, catalog, profile = sheetProfileFor(record.editionId, record.unitType) }: FighterSheetProps) {
  if (!profile) return null;
  const facts = fighterFacts(record, catalog, profile);
  const name = facts.title;
  const nameSize = Math.min(84, Math.floor((profile.layout === "at2" ? 1000 : 1020) / (Math.max(name.length, 1) * 0.62)));
  const heading = profile.title;
  return (
    <>
      <svg className="bt-sheet" viewBox={`0 0 ${String(SHEET_WIDTH)} ${String(SHEET_HEIGHT)}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${name} ${heading.toLowerCase()}`}>
        <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill="#fff" />
        <text className="bt-sheet__head" x={40} y={30 + nameSize * 0.8} fontSize={nameSize} fill={INK} {...squeeze(name, nameSize, profile.layout === "at2" ? 1040 : 1100)}>
          {name}
        </text>
        <text x={42} y={170} fontSize={34} fontWeight={700} fill={INK}>
          {heading}
        </text>
        <text x={42} y={204} fontSize={22} fill={INK} {...squeeze(`Built under ${facts.edition}`, 22, 1000)}>
          {`Built under ${facts.edition}`}
        </text>
        <text className="bt-sheet__head" x={1670} y={170} fontSize={24} textAnchor="end" letterSpacing={3} fill={INK}>
          SALVAGE RIGHTS
        </text>
        <text x={1670} y={142} fontSize={26} fontWeight={700} textAnchor="end" fill={INK} data-official={facts.official.badge === "OFFICIAL"} {...squeeze(facts.official.line, 26, 560, true)}>
          {facts.official.line}
        </text>
        {profile.layout === "at1" && <At1 record={record} facts={facts} profile={profile} />}
        {profile.layout === "at2" && <At2 facts={facts} profile={profile} />}
        {profile.layout === "current" && <Current facts={facts} profile={profile} />}
        <text x={SHEET_WIDTH / 2} y={2173} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(SHEET_FOOT, 20, 1640)}>
          {SHEET_FOOT}
        </text>
        <text x={SHEET_WIDTH / 2} y={2194} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(TRADEMARK_LINE, 20, 1640)}>
          {TRADEMARK_LINE}
        </text>
      </svg>
      <SheetText facts={facts} record={record} profile={profile} />
    </>
  );
}

interface LayoutProps {
  facts: FighterFacts;
  profile: SheetProfile;
}

const siOf = (facts: FighterFacts) => ({ label: "Structural Integrity", value: facts.si });

function At1({ facts, profile }: LayoutProps & { record: AeroRecord }) {
  return (
    <>
      <DataBlock rect={AT1.data} facts={facts} profile={profile} />
      <SinksStrip rect={{ x: AT1.data.x, y: AT1.data.y + 250, w: AT1.data.w, h: 120 }} facts={facts} profile={profile} />
      <PilotBlock rect={AT1.pilot} profile={profile} />
      <VelocityBlock rect={AT1.velocity} profile={profile} fuel={facts.fuel} />
      <ArmorDiagram rect={AT1.armor} profile={profile} armor={facts.armor} si={siOf(facts)} />
      <HeatScale rect={AT1.heat} profile={profile} />
      <EquipmentAreas rect={AT1.equipment} facts={facts} />
    </>
  );
}

function At2({ facts, profile }: LayoutProps) {
  const across = profile.velocity === "across";
  return (
    <>
      <ArmorDiagram rect={AT2.armor} profile={profile} armor={facts.armor} si={siOf(facts)} />
      <MovementVectors x={AT2.armor.x + 10} y={AT2.armor.y + 20} />
      <DataBlock rect={AT2.vessel} facts={facts} profile={profile} />
      <SinksStrip rect={{ x: AT2.vessel.x, y: AT2.vessel.y + AT2.vessel.h - 130, w: AT2.vessel.w, h: 120 }} facts={facts} profile={profile} />
      <PilotBlock rect={AT2.pilot} profile={profile} />
      <HeatScale rect={AT2.heat} profile={profile} />
      <CriticalBlock rect={AT2.critical} profile={profile} />
      {across ? (
        <>
          <StoresBlock rect={AT2.stores} profile={profile} />
          <text x={30} y={1730} fontSize={22} fill={INK}>
            BV:
          </text>
          <line x1={90} x2={400} y1={1734} y2={1734} stroke={INK} strokeWidth={2} />
          <text x={30} y={1780} fontSize={22} fill={INK}>
            Cost:
          </text>
          <line x1={100} x2={400} y1={1784} y2={1784} stroke={INK} strokeWidth={2} />
          <VelocityBlock rect={AT2.velocityAcross} profile={profile} fuel={facts.fuel} />
        </>
      ) : (
        <VelocityBlock rect={AT2.velocityDown} profile={profile} fuel={facts.fuel} />
      )}
    </>
  );
}

function Current({ facts, profile }: LayoutProps) {
  const conventional = profile.kind === "conventional";
  return (
    <>
      <DataBlock rect={CURRENT.data} facts={facts} profile={profile} />
      <ArmorDiagram rect={CURRENT.armor} profile={profile} armor={facts.armor} si={siOf(facts)} />
      <StoresBlock rect={CURRENT.stores} profile={profile} />
      <NotesBlock rect={CURRENT.notes} />
      <CriticalBlock rect={CURRENT.critical} profile={profile} />
      <PilotBlock rect={CURRENT.pilot} profile={profile} />
      {conventional ? (
        <GroundTables rect={CURRENT.ground} facts={facts} profile={profile} />
      ) : (
        <>
          <HeatData rect={CURRENT.heat} facts={facts} profile={profile} />
          <HeatScaleColumn rect={CURRENT.scale} />
        </>
      )}
      <VelocityBlock rect={CURRENT.velocity} profile={profile} fuel={facts.fuel} />
    </>
  );
}
