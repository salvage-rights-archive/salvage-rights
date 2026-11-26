// The printable record sheet of a Combat Vehicle, one SVG of 1700 by 2200 units (Letter proportions, the Classic sheet's own): the vehicle data, the armor and
// structure diagrams, the weapons and equipment inventory, the ammunition and the notes. Our own drawing, with no logos or art; the arrangement of blocks
// follows the publisher's. The type never goes under 20 units. Pure: it reads nothing but its props. The sheet is paper: white, with black ink.
import { ARMOR } from "../../data/chassis";
import { bookName } from "../../data/editions";
import type { Catalog } from "../../rules/catalog";
import { nameWithMunition } from "../../rules/munitions";
import { officialLabel } from "../../rules/official";
import { vehicleBv } from "../../rules/vehicle/bv";
import { vehicleOfficialState } from "../../rules/vehicle/checks";
import { vehicleCost } from "../../rules/vehicle/cost";
import { armorLocations, crewOf, engineRating, flankMP, itemFacts, motiveRowOf, structurePoints, vehicleLocationName, vehicleTally } from "../../rules/vehicle/vehicle";
import type { VehicleRecord } from "../../rules/vehicle/vehicle";
import { own } from "../../rules/walk";
import { TRADEMARK_LINE } from "../sheet/RecordSheet";
import Frame from "../sheet/Frame";
import type { Rect } from "../sheet/Frame";
import { INK, squeeze, wrap } from "../sheet/text";
import VehicleDiagram from "./VehicleDiagram";

export const SHEET_WIDTH = 1700;
export const SHEET_HEIGHT = 2200;
const RECTS = {
  data: { x: 30, y: 235, w: 800, h: 780 },
  armor: { x: 860, y: 235, w: 810, h: 780 },
  inventory: { x: 30, y: 1060, w: 1640, h: 760 },
  notes: { x: 30, y: 1865, w: 1640, h: 230 },
} satisfies Record<string, Rect>;

export interface InventoryRow {
  qty: string;
  name: string;
  location: string;
  heat: string;
  damage: string;
  range: [string, string, string, string];
}

const dash = (n: number | undefined): string => (n === undefined || n === 0 ? "-" : String(n));

/** The weapons and equipment inventory, like items in a place together; ammunition is listed apart (`ammoLines`). */
export function inventoryRows(record: VehicleRecord, catalog: Catalog): InventoryRow[] {
  const rows = new Map<string, InventoryRow & { count: number }>();
  for (const m of record.mounts) {
    const facts = itemFacts(m, record, catalog);
    if (facts.ammo) continue;
    const key = `${m.equipmentId ?? m.name}|${m.location}|${m.munition ?? ""}`;
    const found = rows.get(key);
    if (found) {
      found.count += 1;
      found.qty = String(found.count);
      continue;
    }
    const row = facts.row;
    const range = row?.by?.vehicle?.range ?? row?.range;
    rows.set(key, {
      count: 1,
      qty: "1",
      name: nameWithMunition(m.name || row?.name || "Item", row, m.munition, catalog, record.editionId),
      location: vehicleLocationName(m.location),
      heat: facts.weapon || facts.heat > 0 ? String(facts.heat) : "-",
      damage: row?.by?.vehicle?.damage ?? row?.damage ?? "-",
      range: [dash(range?.[0]), dash(range?.[1]), dash(range?.[2]), dash(range?.[3])],
    });
  }
  return [...rows.values()];
}

/** Ammunition bins: name, location and shots (the shots a ton carries times the bin's tons). */
export function ammoLines(record: VehicleRecord, catalog: Catalog): string[] {
  return record.mounts.flatMap((m) => {
    const facts = itemFacts(m, record, catalog);
    if (!facts.ammo) return [];
    const shots = facts.row?.shotsPerTon === undefined ? undefined : Math.floor((facts.row.shotsPerTon * (facts.tons ?? 0) * 1e6) / 1e6);
    return [`${m.name}${shots === undefined ? "" : ` (${String(shots)})`}, ${vehicleLocationName(m.location)}`];
  });
}

export function sheetTitle(record: VehicleRecord): string {
  return `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed vehicle";
}

const TECH = { "inner-sphere": "Inner Sphere", clan: "Clan", mixed: "Mixed" } as const;

export default function VehicleSheet({ record, catalog, textHeading }: { record: VehicleRecord; catalog: Catalog; textHeading?: string }) {
  const name = sheetTitle(record);
  const nameSize = Math.min(84, Math.floor(1020 / (Math.max(name.length, 1) * 0.62)));
  const motive = motiveRowOf(record);
  const rating = engineRating(record);
  const bv = vehicleBv(record, catalog);
  const cost = vehicleCost(record, catalog);
  const tally = vehicleTally(record, catalog);
  const official = officialLabel(vehicleOfficialState(record));
  const mark = official.badge === "OFFICIAL" ? `OFFICIAL: ${official.detail}` : official.badge;
  const armorName = own(ARMOR.types, record.armor.type) ? (ARMOR.types[record.armor.type]?.name ?? record.armor.type) : record.armor.type;
  const sinks = Math.max(0, record.heatSinks.count);
  const data: [string, string][] = [
    ["Type", `${motive?.label ?? record.motive}${record.turret ? ", with a turret" : ""}`],
    ["Tonnage", `${String(record.tons)} tons`],
    ["Tech base", TECH[record.techBase]],
    ["Year", record.year === null ? "not set" : String(record.year)],
    ["Cruising MP", String(record.cruise)],
    ["Flank MP", String(flankMP(record))],
    ["Engine", `${record.engine.type}${rating === null ? "" : `, rating ${String(rating)}`}`],
    ["Armor", `${armorName}, ${String(record.armor.tons)} tons`],
    ["Structure", `${String(structurePoints(record))} points a location`],
    ["Heat sinks", String(sinks)],
    ["Crew", String(crewOf(record))],
    ["Weight used", `${String(tally.total)} of ${String(record.tons)} tons`],
    ["Battle Value", bv.total.toLocaleString("en-US")],
    ["Cost", `${cost.total.toLocaleString("en-US")} C-bills`],
  ];
  const rows = inventoryRows(record, catalog);
  const ammo = ammoLines(record, catalog);
  const locations = armorLocations(record).map((code) => ({ code, name: vehicleLocationName(code), armor: record.armor.points[code] ?? 0, structure: structurePoints(record) }));
  const columns = [
    { x: 50, w: 70, label: "Qty" },
    { x: 125, w: 560, label: "Type" },
    { x: 690, w: 240, label: "Location" },
    { x: 935, w: 90, label: "Heat" },
    { x: 1030, w: 200, label: "Damage" },
    { x: 1235, w: 90, label: "Min" },
    { x: 1330, w: 100, label: "Short" },
    { x: 1435, w: 110, label: "Medium" },
    { x: 1550, w: 100, label: "Long" },
  ];
  const noteText = [record.notes["notes"], `Not an official record sheet. Made with Salvage Rights, an unofficial fan project. Built from ${bookName("TechManual")} (Combat Vehicle construction).`].filter((t): t is string => t !== undefined && t !== "");
  return (
    <>
      <svg className="bt-sheet" viewBox={`0 0 ${String(SHEET_WIDTH)} ${String(SHEET_HEIGHT)}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${name} record sheet`}>
        <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill="#fff" />
        <text className="bt-sheet__head" x={40} y={40 + nameSize * 0.8} fontSize={nameSize} fill={INK}>
          {name}
        </text>
        <text x={42} y={170} fontSize={34} fontWeight={700} fill={INK}>
          {`Combat vehicle record sheet (${motive?.sheet ?? "ground"})`}
        </text>
        <text className="bt-sheet__head" x={1670} y={170} fontSize={24} textAnchor="end" letterSpacing={3} fill={INK}>
          SALVAGE RIGHTS
        </text>
        <text x={1670} y={142} fontSize={26} fontWeight={700} textAnchor="end" fill={INK} data-official={official.badge === "OFFICIAL"} {...squeeze(mark, 26, 600, true)}>
          {mark}
        </text>

        <Frame rect={RECTS.data} title="VEHICLE DATA">
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
          <VehicleDiagram locations={locations} use="armor" motive={record.motive} ink={INK} label={`${name} armor points`} rect={{ x: RECTS.armor.x + 20, y: RECTS.armor.y + 40, w: RECTS.armor.w - 40, h: RECTS.armor.h - 60 }} />
        </Frame>

        <Frame rect={RECTS.inventory} title="WEAPONS AND EQUIPMENT INVENTORY">
          {columns.map((c) => (
            <text key={c.label} x={c.x} y={RECTS.inventory.y + 80} fontSize={24} fontWeight={700} fill={INK}>
              {c.label}
            </text>
          ))}
          <line x1={50} x2={1650} y1={RECTS.inventory.y + 92} y2={RECTS.inventory.y + 92} stroke={INK} strokeWidth={2} />
          {rows.slice(0, 14).map((row, i) => {
            const y = RECTS.inventory.y + 130 + i * 38;
            const cells = [row.qty, row.name, row.location, row.heat, row.damage, ...row.range];
            return cells.map((cell, ci) => (
              <text key={`${String(i)}-${String(ci)}`} x={(columns[ci]?.x ?? 0)} y={y} fontSize={26} fill={INK} {...squeeze(cell, 26, columns[ci]?.w ?? 100)}>
                {cell}
              </text>
            ));
          })}
          {rows.length > 14 && (
            <text x={50} y={RECTS.inventory.y + 130 + 14 * 38} fontSize={22} fill={INK}>{`and ${String(rows.length - 14)} more lines, listed in the text copy`}</text>
          )}
          <text x={50} y={RECTS.inventory.y + 700} fontSize={24} fontWeight={700} fill={INK}>
            Ammo:
          </text>
          {wrap(ammo.length === 0 ? "none" : ammo.join("; "), 24, 1480).slice(0, 2).map((line, i) => (
            <text key={line} x={150} y={RECTS.inventory.y + 700 + i * 30} fontSize={24} fill={INK}>
              {line}
            </text>
          ))}
        </Frame>

        <Frame rect={RECTS.notes} title="NOTES">
          {noteText.flatMap((t) => wrap(t, 24, 1560)).slice(0, 5).map((line, i) => (
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
              {["Qty", "Type", "Location", "Heat", "Damage", "Min", "Short", "Medium", "Long"].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.qty}</td>
                <td>{row.name}</td>
                <td>{row.location}</td>
                <td>{row.heat}</td>
                <td>{row.damage}</td>
                {row.range.map((r, ri) => (
                  <td key={ri}>{r}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p>{`Ammo: ${ammo.length === 0 ? "none" : ammo.join("; ")}`}</p>
        <h3>Armor and structure points</h3>
        <ul>
          {locations.map((l) => (
            <li key={l.code}>{`${l.name}: armor ${String(l.armor)}, structure ${String(l.structure)}`}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
