// The ProtoMech record sheet: a Point of up to five ProtoMechs on one page (Total Warfare), our own drawing on 1700 by 2200 units, the Classic sheet's
// proportions, with no logos or art. Each ProtoMech has its data, its armor and structure diagrams (the plain stand-in, ProtoDiagram) and its weapons
// inventory. Pure: it reads nothing but its props. The sheet is paper: white, with black ink. The type never goes under 20 units.
import { PROTO_LOCATION_NAMES } from "../../data/protomech";
import type { Catalog } from "../../rules/catalog";
import { armorPoints, locationsOf, mountName, plainRun, rowOf, runMP, structurePoints, structureRow } from "../../rules/protomech/build";
import { jumpMP, jumpSystemOf, optionSummary, wingBonus } from "../../rules/protomech/options";
import { protoBattleValue, protoCost } from "../../rules/protomech/rating";
import { protoOfficialState } from "../../rules/protomech/official";
import { officialLabel } from "../../rules/official";
import { protoTitle } from "../../rules/protomech/record";
import type { ProtoRecord } from "../../rules/protomech/record";
import Frame from "../sheet/Frame";
import { TRADEMARK_LINE } from "../sheet/RecordSheet";
import { INK, squeeze } from "../sheet/text";
import ProtoDiagram from "./ProtoDiagram";

export const SHEET_WIDTH = 1700;
export const SHEET_HEIGHT = 2200;
export const POINT_SIZE = 5;
const BLOCK_TOP = 250;
const BLOCK_HEIGHT = 376;
const BLOCK_GAP = 8;

/** The weapons inventory lines of one ProtoMech, as the sheet prints them. */
export function inventoryOf(record: ProtoRecord, catalog: Catalog): { location: string; name: string; damage: string; range: string; ammo: string }[] {
  const order = ["t", "la", "ra", "mg"];
  const rank = (code: string) => (order.includes(code) ? order.indexOf(code) : order.length);
  return [...record.mounts]
    .sort((a, b) => rank(a.location) - rank(b.location))
    .map((mount) => {
      const row = rowOf(catalog, record, mount);
      const range = row?.range;
      const location = mount.location === "t" ? (mount.rear === true ? "Torso (R)" : "Torso") : (PROTO_LOCATION_NAMES[mount.location] ?? mount.location);
      return {
        location,
        name: mountName(mount) || "Unnamed item",
        damage: row?.damage ?? "",
        range: range === undefined ? "" : `${String(range[1])}/${String(range[2])}/${String(range[3])}`,
        ammo: mount.shots !== undefined && mount.shots > 0 ? String(mount.shots) : "",
      };
    });
}

/** The facts of one block, in the sheet's words. */
export function protoFacts(record: ProtoRecord, catalog: Catalog) {
  const bv = protoBattleValue(record, catalog);
  const row = structureRow(record);
  const locations = locationsOf(record).map((code) => ({ code, name: PROTO_LOCATION_NAMES[code] ?? code, armor: record.armor[code] ?? 0, structure: row?.structure[code] }));
  return {
    title: protoTitle(record) || "Unnamed ProtoMech",
    tons: String(record.tons),
    walk: String(record.walk),
    run: record.booster ? `${String(plainRun(record.walk))} (${String(runMP(record))})` : String(plainRun(record.walk)),
    jumpLabel: jumpSystemOf(record)?.unit ?? "Jumping MP",
    jump: wingBonus(record) > 0 ? `${String(record.jump)} (${String(jumpMP(record))} with wing)` : String(record.jump),
    options: optionSummary(record).join(", "),
    heatSinks: String(record.heatSinks),
    bv: String(bv.total),
    cost: protoCost(record, catalog).total.toLocaleString("en-US"),
    armorPoints: armorPoints(record),
    structurePoints: structurePoints(record) ?? 0,
    locations,
    inventory: inventoryOf(record, catalog),
    official: officialLabel(protoOfficialState(record)),
  };
}

function Block({ record, catalog, index, y }: { record: ProtoRecord; catalog: Catalog; index: number; y: number }) {
  const facts = protoFacts(record, catalog);
  const x = 30;
  const rect = { x, y, w: SHEET_WIDTH - 60, h: BLOCK_HEIGHT };
  const lines: [string, string][] = [
    ["Tonnage", facts.tons],
    ["Walking MP", facts.walk],
    ["Running MP", facts.run],
    [facts.jumpLabel, facts.jump],
    ["Heat sinks", facts.heatSinks],
    ["Battle Value", facts.bv],
  ];
  const inventoryX = x + 1000;
  return (
    <Frame rect={rect} title={`PROTOMECH ${String(index + 1)}`}>
      <text x={x + 24} y={y + 62} fontSize={34} fontWeight={700} fill={INK} {...squeeze(facts.title, 34, 370, true)}>
        {facts.title}
      </text>
      {lines.map(([label, value], i) => (
        <g key={label}>
          <text x={x + 24} y={y + 108 + i * 38} fontSize={24} fill={INK}>{`${label}:`}</text>
          <text x={x + 220} y={y + 108 + i * 38} fontSize={24} fontWeight={700} fill={INK} data-testid={label === "Battle Value" ? `sheet-bv-${String(index)}` : undefined}>
            {value}
          </text>
        </g>
      ))}
      {facts.options !== "" && (
        <text x={x + 24} y={y + 322} fontSize={20} fill={INK} {...squeeze(facts.options, 20, 340)}>
          {facts.options}
        </text>
      )}
      <text x={x + 24} y={y + 346} fontSize={22} fill={INK}>{"Pilot: ______________________"}</text>
      <ProtoDiagram locations={facts.locations} use="armor" frame={{ x: x + 380, y: y + 28, w: 540, h: 346 }} />
      <text x={inventoryX} y={y + 40} fontSize={24} fontWeight={700} fill={INK}>Weapons and equipment</text>
      {["Location", "Type", "Dmg", "S/M/L", "Ammo"].map((head, i) => (
        <text key={head} x={inventoryX + [0, 150, 400, 470, 570][i]!} y={y + 72} fontSize={20} fontWeight={700} fill={INK}>
          {head}
        </text>
      ))}
      {facts.inventory.slice(0, 6).map((line, i) => (
        <g key={`${line.name}-${String(i)}`}>
          <text x={inventoryX} y={y + 104 + i * 32} fontSize={22} fill={INK}>{line.location}</text>
          <text x={inventoryX + 150} y={y + 104 + i * 32} fontSize={22} fill={INK} {...squeeze(line.name, 22, 240)}>{line.name}</text>
          <text x={inventoryX + 400} y={y + 104 + i * 32} fontSize={22} fill={INK} {...squeeze(line.damage, 22, 64)}>{line.damage}</text>
          <text x={inventoryX + 470} y={y + 104 + i * 32} fontSize={22} fill={INK}>{line.range}</text>
          <text x={inventoryX + 570} y={y + 104 + i * 32} fontSize={22} fill={INK}>{line.ammo}</text>
        </g>
      ))}
      <ProtoDiagram locations={facts.locations} use="structure" frame={{ x: inventoryX + 330, y: y + 196, w: 290, h: 176 }} />
      <text x={inventoryX} y={y + 340} fontSize={20} fill={INK}>{`Armor ${String(facts.armorPoints)}, structure ${String(facts.structurePoints)}`}</text>
      <text x={inventoryX} y={y + 366} fontSize={20} fill={INK}>{`${facts.official.badge}`}</text>
    </Frame>
  );
}

export default function ProtoSheet({ records, catalog }: { records: ProtoRecord[]; catalog: Catalog }) {
  const point = records.slice(0, POINT_SIZE);
  const names = point.map((r) => protoTitle(r) || "Unnamed ProtoMech");
  return (
    <>
      <svg className="bt-sheet" viewBox={`0 0 ${String(SHEET_WIDTH)} ${String(SHEET_HEIGHT)}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`ProtoMech Point record sheet: ${names.join(", ")}`}>
        <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill="#fff" />
        <text className="bt-sheet__head" x={40} y={100} fontSize={80} fill={INK}>PROTOMECH POINT</text>
        <text x={42} y={150} fontSize={30} fontWeight={700} fill={INK}>{`${String(point.length)} ${point.length === 1 ? "ProtoMech" : "ProtoMechs"}`}</text>
        <text x={42} y={190} fontSize={22} fill={INK}>Built under TechManual construction, played under Total Warfare</text>
        <text className="bt-sheet__head" x={1670} y={100} fontSize={24} textAnchor="end" letterSpacing={3} fill={INK}>SALVAGE RIGHTS</text>
        {point.map((record, i) => (
          <Block key={`${record.id}-${String(i)}`} record={record} catalog={catalog} index={i} y={BLOCK_TOP + i * (BLOCK_HEIGHT + BLOCK_GAP)} />
        ))}
        <text x={SHEET_WIDTH / 2} y={2194} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(TRADEMARK_LINE, 20, 1640)}>{TRADEMARK_LINE}</text>
      </svg>
      <section className="sr-visually-hidden bt-sheet-text" aria-labelledby="pm-sheet-text">
        <h2 id="pm-sheet-text">The record sheet as text</h2>
        {point.map((record, i) => {
          const facts = protoFacts(record, catalog);
          return (
            <div key={`${record.id}-${String(i)}`}>
              <h3>{`${String(i + 1)}. ${facts.title}`}</h3>
              <dl>
                {[["Tonnage", facts.tons], ["Walking MP", facts.walk], ["Running MP", facts.run], [facts.jumpLabel, facts.jump], ["Heat sinks", facts.heatSinks], ["Battle Value", facts.bv], ["Cost", `${facts.cost} C-bills`], ...(facts.options === "" ? [] : [["Options", facts.options]]), ["Armor", facts.locations.map((l) => `${l.name} ${String(l.armor)}`).join(", ")], ["Internal structure", facts.locations.map((l) => `${l.name} ${String(l.structure ?? 0)}`).join(", ")], ["Marked", facts.official.badge]].map(([term, value]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <ul>
                {facts.inventory.map((line, j) => (
                  <li key={j}>{`${line.location}: ${line.name}, damage ${line.damage}, range ${line.range}${line.ammo === "" ? "" : `, ${line.ammo} shots`}`}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </>
  );
}
