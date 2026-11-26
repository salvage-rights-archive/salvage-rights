// The printable record sheet of a small craft, DropShip or capital ship: one SVG of 1700 by 2200 units (Letter proportions, the fighter sheet's own). One
// arrangement serves every type and edition (our own layout of the blocks the flagged blanks name: vessel data, the weapon bays by arc, the armor
// diagram with a threshold for each facing, crew data, critical damage, heat data and the velocity record); the profile decides the critical boxes, the
// velocity rows and whether the heat scale is printed. The page and its notice are cited in the text copy. The type never goes under 20 units.
// Pure: it reads nothing but its props. The sheet is paper: white, with black ink.
import { AERO_HEAT_TOP, FLAGGED_HEAT, PILOT_TRACK, SHEET_FOOT, VESSEL_LABELS } from "../../../data/aero-sheet";
import type { SheetProfile } from "../../../data/aero-sheet";
import { FIGHTER_EDITIONS } from "../../../data/aero";
import type { AeroRecord } from "../../../rules/aero";
import type { Catalog } from "../../../rules/catalog";
import { TRADEMARK_LINE } from "../../sheet/RecordSheet";
import Frame from "../../sheet/Frame";
import type { Rect } from "../../sheet/Frame";
import { INK, squeeze } from "../../sheet/text";
import { MAX_SINKS_DRAWN } from "../../sheet/HeatData";
import Bubble from "../../doll/bubble";
import { drawnBubble } from "../../doll/shape-bubbles";
import type { Shape } from "../../doll/shape-bubbles";
import { Blank, Check, CriticalBlock, NotesBlock, Rule, SinkCircles, VelocityBlock } from "./Blocks";
import { MAX_SI_DRAWN, bubblesIn } from "./Diagram";
import { MAX_BAY_LINES, vesselFacts } from "./vessel-facts";
import type { VesselFacts } from "./vessel-facts";
import SheetHead from "./SheetHead";
import VesselText from "./VesselText";

const SHEET_WIDTH = 1700;
const SHEET_HEIGHT = 2200;
const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

const BLOCKS = {
  data: r(30, 245, 690, 400),
  inventory: r(30, 665, 690, 780),
  crew: r(30, 1465, 690, 330),
  armor: r(735, 245, 935, 760),
  critical: r(735, 1025, 570, 770),
  heat: r(1325, 1025, 345, 770),
  velocity: r(30, 1815, 1640, 320),
};

/** Where each armor facing sits in the diagram: the centre as a share of the block, and the size. A facing we have no place for goes in a row below. */
const PLACES: Record<string, { x: number; y: number; w: number; h: number }> = {
  NO: { x: 0.5, y: 0.1, w: 260, h: 150 },
  FO: { x: 0.5, y: 0.1, w: 260, h: 150 },
  LS: { x: 0.14, y: 0.5, w: 250, h: 150 },
  RS: { x: 0.86, y: 0.5, w: 250, h: 150 },
  FL: { x: 0.17, y: 0.28, w: 250, h: 150 },
  FR: { x: 0.83, y: 0.28, w: 250, h: 150 },
  LW: { x: 0.14, y: 0.5, w: 250, h: 150 },
  RW: { x: 0.86, y: 0.5, w: 250, h: 150 },
  LB: { x: 0.14, y: 0.5, w: 250, h: 150 },
  RB: { x: 0.86, y: 0.5, w: 250, h: 150 },
  AL: { x: 0.17, y: 0.68, w: 250, h: 150 },
  AR: { x: 0.83, y: 0.68, w: 250, h: 150 },
  AF: { x: 0.5, y: 0.9, w: 260, h: 150 },
};
const LABEL_BAND = 72;

function Diagram({ rect, facts, profile }: { rect: Rect; facts: VesselFacts; profile: SheetProfile }) {
  const strays = facts.armor.filter((a) => PLACES[a.code] === undefined);
  return (
    <g data-diagram="">
      <Frame rect={rect} title="ARMOR DIAGRAM" />
      <text x={rect.x + rect.w - 24} y={rect.y + 36} fontSize={21} textAnchor="end" fill={INK}>
        {facts.scale}
      </text>
      {facts.armor.map((area) => {
        const place = PLACES[area.code] ?? { x: (strays.indexOf(area) + 0.5) / Math.max(strays.length, 1), y: 0.97, w: Math.min(200, (rect.w - 40) / Math.max(strays.length, 1)), h: 120 };
        const cx = rect.x + place.x * rect.w;
        const cy = rect.y + 40 + place.y * (rect.h - 80);
        const x = cx - place.w / 2;
        const y = cy - place.h / 2;
        const area0: Shape = [[x, y + LABEL_BAND], [x + place.w, y + LABEL_BAND], [x + place.w, y + place.h], [x, y + place.h]];
        const { points, pitch } = bubblesIn([area0], area.points);
        const { radius, strokeWidth } = drawnBubble(pitch / 2);
        const lines = profile.thresholds ? [area.name, "Damage Threshold", `${String(area.threshold)} (${String(area.points)})`] : [area.name, String(area.points)];
        return (
          <g key={area.code} data-area={area.code} data-drawn={points.length}>
            <rect x={x} y={y} width={place.w} height={place.h} rx={12} fill="#fff" stroke={INK} strokeWidth={3} />
            {lines.map((line, i) => (
              <text key={i} x={cx} y={y + 22 + i * 22} fontSize={20} fontWeight={i === lines.length - 1 ? 700 : 400} textAnchor="middle" fill={INK} {...squeeze(line, 20, place.w - 12)}>
                {line}
              </text>
            ))}
            {points.map(([px, py], i) => (
              <Bubble key={i} x={Math.round(px * 10) / 10} y={Math.round(py * 10) / 10} radius={radius} strokeWidth={strokeWidth} />
            ))}
          </g>
        );
      })}
      <SiBox rect={rect} facts={facts} />
      {facts.strayArmor.length > 0 && (
        <text x={rect.x + 24} y={rect.y + rect.h - 12} fontSize={20} fill={INK}>
          {`Armor on facings this sheet does not draw: ${facts.strayArmor.map((a) => `${a.code} ${String(a.points)}`).join(", ")}`}
        </text>
      )}
    </g>
  );
}

/** Structural Integrity (and, for a capital ship, the drive's and sail's integrity) in the middle of the diagram. */
function SiBox({ rect, facts }: { rect: Rect; facts: VesselFacts }) {
  const w = 230;
  const h = 200;
  const x = rect.x + rect.w / 2 - w / 2;
  const y = rect.y + 40 + 0.5 * (rect.h - 80) - h / 2 - (facts.capital ? 0 : 0);
  const circles = Math.min(Number(facts.si) || 0, MAX_SI_DRAWN);
  const extra = facts.data.filter(([label]) => /Integrity$/.test(label) && label !== "Structural Integrity");
  return (
    <g data-si="">
      <rect x={x} y={y} width={w} height={h} rx={14} fill="#fff" stroke={INK} strokeWidth={3} />
      <text x={x + w / 2} y={y + 28} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
        Structural Integrity
      </text>
      <text x={x + w / 2} y={y + 58} fontSize={26} fontWeight={700} textAnchor="middle" fill={INK}>
        {facts.si}
      </text>
      {Array.from({ length: circles }, (_, i) => (
        <circle key={i} cx={x + 22 + (i % 10) * 20.5} cy={y + 80 + Math.floor(i / 10) * 20} r={7} fill="#fff" stroke={INK} strokeWidth={2} />
      ))}
      {extra.map(([label, value], i) => (
        <text key={label} x={x + w / 2} y={y + 168 + i * 24 - (extra.length - 1) * 24} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(`${label}: ${value}`, 20, w - 12)}>
          {`${label}: ${value}`}
        </text>
      ))}
    </g>
  );
}

function Data({ rect, facts, profile }: { rect: Rect; facts: VesselFacts; profile: SheetProfile }) {
  const { x, y, w } = rect;
  const half = (w - 48) / 2;
  const clan = facts.techBase === "Clan" || facts.techBase === "Mixed";
  const inner = facts.techBase === "Inner Sphere" || facts.techBase === "Mixed";
  const type = [facts.shape, facts.use, facts.typeLabel].filter((part) => part !== "").join(" ");
  // The structural figures that have a place in the diagram are not repeated here.
  const rows = facts.data.filter(([label]) => label !== "Structural Integrity" && !/Integrity$/.test(label));
  const cells: [string, string][] = [...(facts.stationKeeping && facts.max === "" ? [] : ([["Max Thrust:", facts.max]] as [string, string][])), ...rows.map(([label, value]): [string, string] => [`${label}:`, value])];
  return (
    <Frame rect={rect} title={`${facts.typeLabel.toUpperCase()} DATA`}>
      <Blank x={x + 24} y={y + 76} w={w - 48} label="Type:" value={type} />
      <Blank x={x + 24} y={y + 118} w={half * 0.95} label="Tonnage:" value={facts.tons} />
      <Blank x={x + 24 + half * 1.05} y={y + 118} w={half * 0.95} label={facts.stationKeeping && profile.editionId === FIGHTER_EDITIONS.current ? "Thrust:" : "Safe Thrust:"} value={facts.safe} />
      {cells.slice(0, 8).map(([label, value], i) => (
        <Blank key={label} x={i % 2 === 0 ? x + 24 : x + 24 + half * 1.05} y={y + 160 + Math.floor(i / 2) * 42} w={half * 0.95} label={label} value={value} />
      ))}
      <text x={x + 24} y={y + 372} fontSize={22} fill={INK}>
        Tech base:
      </text>
      <Check x={x + 150} y={y + 372} on={clan} label="Clan" />
      <Check x={x + 270} y={y + 372} on={inner} label="Inner Sphere" />
    </Frame>
  );
}

function Inventory({ rect, facts, profile }: { rect: Rect; facts: VesselFacts; profile: SheetProfile }) {
  const { x, y, w } = rect;
  const pitch = 66;
  const av = w - 24 - 4 * pitch;
  const columns = { name: 24, loc: av - 150, ht: av - 52, av };
  const rowH = 32;
  const top = y + 82;
  const shown = facts.weapons.slice(0, MAX_BAY_LINES);
  const ammo = facts.ammo.join("; ");
  const brackets = profile.brackets ?? { standard: "1-6, 7-12, 13-20, 21-25" };
  const legend = [`Hexes at SRV, MRV, LRV, ERV: standard ${brackets.standard}`, ...(brackets.capital !== undefined && facts.typeLabel !== VESSEL_LABELS["small-craft"] ? [`Capital scale (C): ${brackets.capital}`] : [])];
  return (
    <Frame rect={rect} title="WEAPONS AND EQUIPMENT INVENTORY">
      <g data-inventory="">
        {legend.map((line, i) => (
          <text key={line} x={x + 24} y={y + (legend.length === 1 ? 62 : 52) + i * 24} fontSize={20} fill={INK} {...squeeze(line, 20, w - 48)}>
            {line}
          </text>
        ))}
        <text x={x + columns.name} y={y + 100} fontSize={20} fontWeight={700} fill={INK}>
          Bay
        </text>
        <text x={x + columns.loc} y={y + 100} fontSize={20} fontWeight={700} fill={INK}>
          Loc.
        </text>
        <text x={x + columns.ht} y={y + 100} fontSize={20} fontWeight={700} fill={INK}>
          Ht
        </text>
        {["SRV", "MRV", "LRV", "ERV"].map((label, i) => (
          <text key={label} x={x + columns.av + i * pitch + pitch / 2} y={y + 100} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
            {label}
          </text>
        ))}
        {Array.from({ length: MAX_BAY_LINES }, (_, index) => {
          const line = shown[index];
          const base = top + (index + 1) * rowH + 14;
          return (
            <g key={index} data-line={line === undefined ? undefined : ""}>
              <Rule x1={x + 20} x2={x + w - 20} y={base + 4} />
              {line && (
                <>
                  <text x={x + columns.name} y={base} fontSize={21} fill={INK} {...squeeze(`${line.qty > 1 ? `${String(line.qty)} x ` : ""}${line.name}`, 21, columns.loc - columns.name - 8)}>
                    {`${line.qty > 1 ? `${String(line.qty)} x ` : ""}${line.name}`}
                  </text>
                  <text x={x + columns.loc} y={base} fontSize={21} fill={INK} {...squeeze(line.loc, 21, 96)}>
                    {line.loc}
                  </text>
                  <text x={x + columns.ht} y={base} fontSize={21} fill={INK}>
                    {line.heat}
                  </text>
                  {line.av.map((value, i) => (
                    <text key={i} x={x + columns.av + i * pitch + pitch / 2} y={base} fontSize={21} textAnchor="middle" fill={INK} {...squeeze(value, 21, pitch - 4)}>
                      {value}
                    </text>
                  ))}
                </>
              )}
            </g>
          );
        })}
        {facts.weapons.length > MAX_BAY_LINES && (
          <text x={x + 24} y={top + (MAX_BAY_LINES + 1) * rowH + 34} fontSize={20} fill={INK}>
            {`${String(facts.weapons.length - MAX_BAY_LINES)} more bays are in the text version of this sheet.`}
          </text>
        )}
        <text x={x + 24} y={y + rect.h - 30} fontSize={22} fontWeight={700} fill={INK}>
          Ammo:
        </text>
        <text x={x + 110} y={y + rect.h - 30} fontSize={21} fill={INK} {...squeeze(ammo, 21, w - 140)}>
          {ammo}
        </text>
      </g>
    </Frame>
  );
}

function Crew({ rect, facts, profile }: { rect: Rect; facts: VesselFacts; profile: SheetProfile }) {
  const { x, y, w } = rect;
  const cols = PILOT_TRACK.hits.length;
  const cell = (w - 250) / cols;
  // A small craft keeps its pilot's track; a DropShip or capital ship's crew take Hits Taken and a Modifier that ends on Incap. (the large craft forms).
  const pilot = profile.crew?.track === "pilot";
  const crewModifier = [...PILOT_TRACK.modifier.slice(0, cols - 1), profile.crew?.incap ?? "Incap."];
  const rows: [string, string[]][] = pilot ? [["Hits Taken", PILOT_TRACK.hits], ["Consciousness #", PILOT_TRACK.consciousness], ["Modifier", PILOT_TRACK.modifier]] : [["Hits Taken", PILOT_TRACK.hits], ["Modifier", crewModifier]];
  return (
    <Frame rect={rect} title="CREW DATA">
      <Blank x={x + 24} y={y + 76} w={(w - 48) / 2 - 10} label="Gunnery:" />
      <Blank x={x + 24 + (w - 48) / 2 + 10} y={y + 76} w={(w - 48) / 2 - 10} label="Piloting:" />
      {rows.map(([label, values], row) => (
        <g key={label}>
          <text x={x + 24} y={y + 134 + row * 40} fontSize={20} fill={INK}>
            {label}
          </text>
          {values.map((value, c) => (
            <g key={c}>
              <rect x={x + 230 + c * cell} y={y + 108 + row * 40} width={cell} height={36} fill="#fff" stroke={INK} strokeWidth={2} />
              <text x={x + 230 + c * cell + cell / 2} y={y + 133 + row * 40} fontSize={20} textAnchor="middle" fill={INK}>
                {value}
              </text>
            </g>
          ))}
        </g>
      ))}
      <Blank x={x + 24} y={y + 270} w={(w - 48) / 2 - 10} label="Crew:" value={facts.crew.have === "" ? (facts.crew.least === "" ? "" : `at least ${facts.crew.least}`) : facts.crew.have} />
      <Blank x={x + 24 + (w - 48) / 2 + 10} y={y + 270} w={(w - 48) / 2 - 10} label="Passengers:" value={facts.passengers} />
      <Blank x={x + 24} y={y + 312} w={(w - 48) / 2 - 10} label="Life boats/Escape pods:" value={facts.pods} />
    </Frame>
  );
}

function Heat({ rect, facts, profile }: { rect: Rect; facts: VesselFacts; profile: SheetProfile }) {
  const { x, y, w, h } = rect;
  const line = `Heat Sinks: ${String(facts.sinks.total)} (${String(facts.sinks.capacity)})`;
  const arcs = facts.heatByArc.filter((a) => a.heat > 0);
  const scale = profile.heatScale === true;
  const rows = FLAGGED_HEAT.rows;
  const arcTop = y + 150;
  const arcPitch = 24;
  // The arcs go two across (a spheroid has six), and the scale's rows close up to leave the sinks their place at the foot.
  const arcCols = 2;
  const colW = (w - 48) / arcCols;
  const tableTop = arcTop + Math.max(Math.ceil(arcs.length / arcCols), 1) * arcPitch + 44;
  const circlesTop = y + h - 100;
  const rowPitch = Math.min(22, (circlesTop - 14 - (tableTop + 20)) / Math.max(rows.length - 1, 1));
  return (
    <Frame rect={rect} title="HEAT DATA">
      <text x={x + 24} y={y + 76} fontSize={22} fontWeight={700} fill={INK} {...squeeze(line, 22, w - 48, true)}>
        {line}
      </text>
      <Check x={x + 24} y={y + 114} on={facts.sinks.type === "Single"} label="Single" />
      <Check x={x + 190} y={y + 114} on={facts.sinks.type === "Double"} label="Double" />
      <text x={x + 24} y={arcTop - 4} fontSize={20} fontWeight={700} fill={INK}>
        Heat generated per arc
      </text>
      <g data-heat-arcs="">
        {arcs.length === 0 && (
          <text x={x + 24} y={arcTop + 24} fontSize={20} fill={INK}>
            None
          </text>
        )}
        {arcs.map((arc, i) => (
          <text key={arc.arc} x={x + 24 + (i % arcCols) * colW} y={arcTop + 24 + Math.floor(i / arcCols) * arcPitch} fontSize={20} fill={INK} {...squeeze(`${arc.name}: ${String(arc.heat)}`, 20, colW - 8)}>
            {`${arc.name}: ${String(arc.heat)}`}
          </text>
        ))}
      </g>
      {scale && (
        <g data-heat-source="flagged">
          <text x={x + 24} y={tableTop - 6} fontSize={20} fontWeight={700} fill={INK}>
            {`Heat level, effect (scale 0 to ${String(AERO_HEAT_TOP)})`}
          </text>
          {rows.map((row, i) => (
            <text key={row.level} x={x + 24} y={tableTop + 20 + i * rowPitch} fontSize={20} fill={INK} data-heat={row.level} {...squeeze(`${String(row.level)}: ${row.effect}`, 20, w - 48)}>
              {`${String(row.level)}: ${row.effect}`}
            </text>
          ))}
        </g>
      )}
      {!scale && (
        <text x={x + 24} y={h + y - 150} fontSize={20} fill={INK} data-zero-heat="" {...squeeze("Zero-heat unit: no Heat Scale in play.", 20, w - 48)}>
          Zero-heat unit: no Heat Scale in play.
        </text>
      )}
      {/* The sinks are circles only on a unit with a Heat Scale; a large craft writes the number and its capacity (SO:AA p. 11). */}
      {scale && <SinkCircles x={x + 24} y={circlesTop} w={w - 48} count={Math.min(facts.sinks.total, MAX_SINKS_DRAWN)} rows={3} />}
    </Frame>
  );
}

export interface VesselSheetProps {
  record: AeroRecord;
  catalog: Catalog;
  profile: SheetProfile;
}

export default function VesselSheet({ record, catalog, profile }: VesselSheetProps) {
  const facts = vesselFacts(record, catalog, profile);
  // The heading names the unit's own type: a small craft printed on the DropShip form, or a JumpShip on the large craft form, is not called by the form's name.
  const heading = [facts.shape, facts.use, `${facts.typeLabel} record sheet`].filter((part) => part !== "").join(" ");
  return (
    <>
      <svg className="bt-sheet" viewBox={`0 0 ${String(SHEET_WIDTH)} ${String(SHEET_HEIGHT)}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${facts.title} ${heading.toLowerCase()}`}>
        <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill="#fff" />
        <SheetHead facts={facts} heading={heading} />
        <Data rect={BLOCKS.data} facts={facts} profile={profile} />
        <Inventory rect={BLOCKS.inventory} facts={facts} profile={profile} />
        <Crew rect={BLOCKS.crew} facts={facts} profile={profile} />
        <Diagram rect={BLOCKS.armor} facts={facts} profile={profile} />
        <CriticalBlock rect={BLOCKS.critical} profile={profile} />
        <Heat rect={BLOCKS.heat} facts={facts} profile={profile} />
        {/* AeroTech 2 prints its velocity record down the page; the wide block of this layout takes it across, as the Revised sheets do. The current station has a Notes box instead. */}
        {profile.velocity === "notes" ? <NotesBlock rect={BLOCKS.velocity} /> : <VelocityBlock rect={BLOCKS.velocity} profile={profile.velocity === "down" ? { ...profile, velocity: "across" } : profile} fuel={facts.fuel} />}
        <text x={SHEET_WIDTH / 2} y={2173} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(SHEET_FOOT, 20, 1640)}>
          {SHEET_FOOT}
        </text>
        <text x={SHEET_WIDTH / 2} y={2194} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(TRADEMARK_LINE, 20, 1640)}>
          {TRADEMARK_LINE}
        </text>
      </svg>
      <VesselText facts={facts} record={record} profile={profile} />
    </>
  );
}
