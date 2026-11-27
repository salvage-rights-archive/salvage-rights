// The printable record sheet of a Support Vehicle, one SVG of 1700 by 2200 units (Letter proportions, the Classic sheet's own): the unit data, the armor and structure
// diagram (the ground, naval or VTOL doll, or the fighter's areas for an airship or fixed-wing unit), the weapons and equipment inventory, the ammunition and the
// notes. Our own drawing, with no logos or art; the blocks follow the publisher's sheets for these units as a form. The type never goes under 20 units. Pure: it
// reads nothing but its props. The sheet is paper: white, with black ink.
import { bookName } from "../../data/editions";
import { svEngineOf, svModOf, svMotiveOf } from "../../data/support-vehicle";
import type { Catalog } from "../../rules/catalog";
import { chosenMunition, nameWithMunition } from "../../rules/munitions";
import { officialLabel } from "../../rules/official";
import { svBv } from "../../rules/support-vehicle/bv";
import { svOfficialState } from "../../rules/support-vehicle/checks";
import { svCost } from "../../rules/support-vehicle/cost";
import {
  armorLocations, armorTons, assignedArmor, crewTally, engineTons, flankMP, fuelPoints, isAir, itemFacts, playCruise, rangeKm, rowOf, sizeOf, structuralIntegrity, structurePoints, structureTons, svLocationName, svTally,
} from "../../rules/support-vehicle/sv";
import type { SupportVehicleRecord } from "../../rules/support-vehicle/sv";
import { tidy } from "../../rules/walk";
import { TRADEMARK_LINE } from "../sheet/RecordSheet";
import Frame from "../sheet/Frame";
import type { Rect } from "../sheet/Frame";
import { INK, squeeze, wrap } from "../sheet/text";
import SvDiagram from "./SvDiagram";

export const SHEET_WIDTH = 1700;
export const SHEET_HEIGHT = 2200;
const RECTS = {
  data: { x: 30, y: 235, w: 800, h: 900 },
  armor: { x: 860, y: 235, w: 810, h: 900 },
  inventory: { x: 30, y: 1170, w: 1640, h: 690 },
  notes: { x: 30, y: 1895, w: 1640, h: 200 },
} satisfies Record<string, Rect>;
const ROWS = 12;

export interface InventoryRow {
  qty: string;
  name: string;
  location: string;
  heat: string;
  damage: string;
  range: [string, string, string, string];
}

const dash = (n: number | undefined): string => (n === undefined || n === 0 ? "-" : String(n));
const AERO_BANDS = ["Short", "Medium", "Long", "Extreme"] as const;

/** The weapons and equipment inventory, like items in a place together; ammunition is listed apart (`ammoLines`). A ground or naval unit shows hex ranges; an air unit the damage at each aerospace range band; a Light or Medium weapon the infantry table's damage rounded and its Base Range times 1, 2 and 3. */
export function inventoryRows(record: SupportVehicleRecord, catalog: Catalog): InventoryRow[] {
  const air = isAir(record);
  const rows = new Map<string, InventoryRow & { count: number }>();
  for (const m of record.mounts) {
    const facts = itemFacts(m, record, catalog);
    if (facts.ammo) continue;
    const key = `${m.equipmentId ?? m.name}|${m.location}|${m.pintle === true ? "pintle" : ""}|${chosenMunition(rowOf(m, record, catalog), m.munition, catalog, record.editionId)?.id ?? ""}`;
    const found = rows.get(key);
    if (found) {
      found.count += facts.qty;
      found.qty = String(found.count);
      continue;
    }
    const row = facts.row;
    let damage = row?.by?.vehicle?.damage ?? row?.damage ?? "-";
    let range: InventoryRow["range"];
    if (facts.infantry && row?.infantry) {
      const base = row.infantry.baseRange;
      damage = String(Math.floor(row.infantry.damage + 0.5));
      range = base === 0 ? ["-", "0", "1", "2"] : ["-", String(base), String(base * 2), String(base * 3)];
    } else if (air) {
      const reach = row?.by?.aero?.rangeClass;
      const value = row?.by?.aero?.damage ?? row?.damage ?? "-";
      damage = "";
      range = reach === undefined ? ["-", "-", "-", "-"] : (AERO_BANDS.map((band, i) => (i <= AERO_BANDS.indexOf(reach) ? value : "-")) as InventoryRow["range"]);
    } else {
      const hexes = row?.by?.vehicle?.range ?? row?.range;
      range = [dash(hexes?.[0]), dash(hexes?.[1]), dash(hexes?.[2]), dash(hexes?.[3])];
    }
    rows.set(key, {
      count: facts.qty,
      qty: String(facts.qty),
      name: nameWithMunition(m.name || row?.name || "Item", row, m.munition, catalog, record.editionId) + (m.pintle === true ? " (pintle)" : ""),
      location: svLocationName(m.location, record),
      heat: air || !(facts.weapon && !facts.infantry) ? "-" : String(facts.heat),
      damage,
      range,
    });
  }
  return [...rows.values()];
}

/** Ammunition bins: name, location and shots (the shots a ton carries times the bin's tons). */
export function ammoLines(record: SupportVehicleRecord, catalog: Catalog): string[] {
  return record.mounts.flatMap((m) => {
    const facts = itemFacts(m, record, catalog);
    if (!facts.ammo) return [];
    const shots = facts.row?.shotsPerTon === undefined ? undefined : Math.floor((facts.row.shotsPerTon * (facts.tons ?? 0) * 1e6) / 1e6);
    return [`${m.name}${shots === undefined ? "" : ` (${String(shots)})`}, ${svLocationName(m.location, record)}`];
  });
}

export function sheetTitle(record: SupportVehicleRecord): string {
  return `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed Support Vehicle";
}

const TECH = { "inner-sphere": "Inner Sphere", clan: "Clan", mixed: "Mixed" } as const;
const BLANKS: Record<string, string> = { ground: "Ground Vehicle", "large-ground": "Large Ground Vehicle", naval: "Naval Vehicle", vtol: "VTOL", airship: "Airship", fighter: "Conventional Fighter" };

export default function SvSheet({ record, catalog, textHeading }: { record: SupportVehicleRecord; catalog: Catalog; textHeading?: string }) {
  const name = sheetTitle(record);
  const nameSize = Math.min(84, Math.floor(1020 / (Math.max(name.length, 1) * 0.62)));
  const motive = svMotiveOf(record.motive);
  const air = isAir(record);
  const bv = svBv(record, catalog);
  const cost = svCost(record, catalog);
  const tally = svTally(record, catalog);
  const crew = crewTally(record, catalog);
  const official = officialLabel(svOfficialState(record));
  const mark = official.badge === "OFFICIAL" ? `OFFICIAL: ${official.detail}` : official.badge;
  const sinks = Math.max(0, record.heatSinks.count);
  const mods = record.structure.mods.map((id) => svModOf(id)?.label ?? id).join(", ");
  const engine = svEngineOf(record.engine.type);
  const engineWeight = engineTons(record);
  const range = rangeKm(record);
  const points = fuelPoints(record);
  const sheetKind = motive === undefined ? "ground" : motive.hasLargeSheet && sizeOf(record) === "large" ? "large-ground" : motive.sheet;
  const si = structuralIntegrity(record);
  const data: [string, string][] = [
    ["Type", `${motive?.label ?? record.motive}, ${sizeOf(record)}${record.turret ? ", with a turret" : ""}`],
    ["Tonnage", `${String(record.tons)} tons`],
    ["Tech base", TECH[record.techBase]],
    ["Year", record.year === null ? "not set" : String(record.year)],
    air ? ["Thrust", `Safe ${String(record.cruise)}, Maximum ${String(flankMP(record))}`] : ["Movement", `${String(playCruise(record))} cruising, ${String(Math.ceil(tidy(playCruise(record) * 1.5)))} flank`],
    ["Engine", `${engine?.label ?? record.engine.type}, Tech Rating ${record.engine.rating}${engineWeight === null ? "" : `, ${String(engineWeight)} tons`}`],
    ["Chassis", `Structural Tech Rating ${record.structure.rating}, ${String(structureTons(record) ?? "?")} tons${mods === "" ? "" : `; ${mods}`}`],
    ["Fuel", air ? (points === null ? "none needed" : `${String(record.fuelTons)} tons, ${String(points)} Fuel Points`) : range === null ? "none needed" : `${String(record.fuelTons)} tons, range ${String(range)} km`],
    ["Armor", `BAR ${String(record.armor.bar)}, Tech Rating ${record.armor.rating}, ${String(assignedArmor(record))} points, ${String(armorTons(record) ?? "?")} tons`],
    [air ? "Integrity" : "Structure", air ? String(si ?? 0) : `${String(structurePoints(record))} points a location`],
    ["Fire control", record.fireControl],
    ["Crew", `${String(crew.crew)} (minimum ${String(crew.minimum)})`],
    ["Heat sinks", String(sinks)],
    ["Weight used", `${String(tally.total)} of ${String(record.tons)} tons`],
    ["Battle Value", bv.total.toLocaleString("en-US")],
    ["Cost", `${cost.total.toLocaleString("en-US")} C-bills`],
  ];
  const rows = inventoryRows(record, catalog);
  const ammo = ammoLines(record, catalog);
  const locations = armorLocations(record).map((code) => ({ code, name: svLocationName(code, record), armor: record.armor.points[code] ?? 0, structure: structurePoints(record) }));
  const columns = air
    ? [{ x: 50, w: 70, label: "Qty" }, { x: 125, w: 620, label: "Type" }, { x: 750, w: 240, label: "Location" }, { x: 1060, w: 130, label: "Short" }, { x: 1235, w: 130, label: "Medium" }, { x: 1410, w: 130, label: "Long" }, { x: 1555, w: 100, label: "Extreme" }]
    : [
        { x: 50, w: 70, label: "Qty" }, { x: 125, w: 560, label: "Type" }, { x: 690, w: 240, label: "Location" }, { x: 935, w: 90, label: "Heat" }, { x: 1030, w: 200, label: "Damage" },
        { x: 1235, w: 90, label: "Min" }, { x: 1330, w: 100, label: "Short" }, { x: 1435, w: 110, label: "Medium" }, { x: 1550, w: 100, label: "Long" },
      ];
  const noteText = [record.notes["notes"], `Not an official record sheet. Made with Salvage Rights, an unofficial fan project. Built from ${bookName("TechManual")} (Support Vehicle construction); the blank for this unit is the ${BLANKS[sheetKind] ?? "Ground Vehicle"} sheet.`].filter((t): t is string => t !== undefined && t !== "");
  const cells = (row: InventoryRow): string[] => (air ? [row.qty, row.name, row.location, ...row.range] : [row.qty, row.name, row.location, row.heat, row.damage, ...row.range]);
  return (
    <>
      <svg className="bt-sheet" viewBox={`0 0 ${String(SHEET_WIDTH)} ${String(SHEET_HEIGHT)}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${name} record sheet`}>
        <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill="#fff" />
        <text className="bt-sheet__head" x={40} y={40 + nameSize * 0.8} fontSize={nameSize} fill={INK}>
          {name}
        </text>
        <text x={42} y={170} fontSize={34} fontWeight={700} fill={INK}>
          {`Support vehicle record sheet (${(BLANKS[sheetKind] ?? "ground").toLowerCase()})`}
        </text>
        <text className="bt-sheet__head" x={1670} y={170} fontSize={24} textAnchor="end" letterSpacing={3} fill={INK}>
          SALVAGE RIGHTS
        </text>
        <text x={1670} y={142} fontSize={26} fontWeight={700} textAnchor="end" fill={INK} data-official={official.badge === "OFFICIAL"} {...squeeze(mark, 26, 600, true)}>
          {mark}
        </text>

        <Frame rect={RECTS.data} title="SUPPORT VEHICLE DATA">
          {data.map(([label, value], i) => (
            <g key={label}>
              <text x={RECTS.data.x + 30} y={RECTS.data.y + 80 + i * 50} fontSize={30} fontWeight={700} fill={INK}>
                {label}
              </text>
              <text x={RECTS.data.x + 290} y={RECTS.data.y + 80 + i * 50} fontSize={30} fill={INK} {...squeeze(value, 30, RECTS.data.w - 320)}>
                {value}
              </text>
            </g>
          ))}
        </Frame>

        <Frame rect={RECTS.armor} title="ARMOR AND STRUCTURE">
          <SvDiagram record={record} use="armor" ink={INK} label={`${name} armor points`} rect={{ x: RECTS.armor.x + 20, y: RECTS.armor.y + 40, w: RECTS.armor.w - 40, h: RECTS.armor.h - 60 }} />
        </Frame>

        <Frame rect={RECTS.inventory} title="WEAPONS AND EQUIPMENT INVENTORY">
          {columns.map((c) => (
            <text key={c.label} x={c.x} y={RECTS.inventory.y + 80} fontSize={24} fontWeight={700} fill={INK}>
              {c.label}
            </text>
          ))}
          <line x1={50} x2={1650} y1={RECTS.inventory.y + 92} y2={RECTS.inventory.y + 92} stroke={INK} strokeWidth={2} />
          {rows.slice(0, ROWS).map((row, i) => {
            const y = RECTS.inventory.y + 130 + i * 38;
            return cells(row).map((cell, ci) => (
              <text key={`${String(i)}-${String(ci)}`} x={columns[ci]?.x ?? 0} y={y} fontSize={26} fill={INK} {...squeeze(cell, 26, columns[ci]?.w ?? 100)}>
                {cell}
              </text>
            ));
          })}
          {rows.length > ROWS && <text x={50} y={RECTS.inventory.y + 130 + ROWS * 38} fontSize={22} fill={INK}>{`and ${String(rows.length - ROWS)} more lines, listed in the text copy`}</text>}
          <text x={50} y={RECTS.inventory.y + 640} fontSize={24} fontWeight={700} fill={INK}>
            Ammo:
          </text>
          {wrap(ammo.length === 0 ? "none" : ammo.join("; "), 24, 1480).slice(0, 2).map((line, i) => (
            <text key={line} x={150} y={RECTS.inventory.y + 640 + i * 30} fontSize={24} fill={INK}>
              {line}
            </text>
          ))}
        </Frame>

        <Frame rect={RECTS.notes} title="NOTES">
          {noteText.flatMap((t) => wrap(t, 24, 1560)).slice(0, 4).map((line, i) => (
            <text key={`${String(i)}-${line}`} x={50} y={RECTS.notes.y + 70 + i * 30} fontSize={24} fill={INK}>
              {line}
            </text>
          ))}
        </Frame>

        <text x={SHEET_WIDTH / 2} y={2194} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(TRADEMARK_LINE, 20, 1640)}>
          {TRADEMARK_LINE}
        </text>
      </svg>
      <section className="sr-visually-hidden bt-sheet-text" aria-labelledby={`sheet-text-${record.id}`}>
        <h2 id={`sheet-text-${record.id}`}>{textHeading ?? "The record sheet as text"}</h2>
        <dl>
          {data.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div>
            <dt>Official</dt>
            <dd>{official.detail ? `${official.badge}, ${official.detail}` : official.badge}</dd>
          </div>
        </dl>
        <table>
          <caption>Weapons and equipment inventory</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.label} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {cells(row).map((cell, ci) => (
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p>{`Ammo: ${ammo.length === 0 ? "none" : ammo.join("; ")}`}</p>
        <h3>Armor and structure points</h3>
        <ul>
          {locations.map((l) => (
            <li key={l.code}>{air ? `${l.name}: armor ${String(l.armor)}` : `${l.name}: armor ${String(l.armor)}, structure ${String(l.structure)}`}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
