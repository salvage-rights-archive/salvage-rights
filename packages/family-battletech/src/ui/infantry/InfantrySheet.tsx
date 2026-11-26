// The printable record sheet of a conventional infantry platoon: our own drawing in the Total Warfare generic infantry sheet's arrangement
// (a line for each platoon or sub-platoon with troopers 1 to 30 and the platoon's damage under each, the range modifiers by hex, movement and
// skills), 1700 by 2200 units like the other Classic sheets. Pure: it reads nothing but its props. Paper: white, black ink.
import { armorKitOf, FORMATIONS } from "../../data/infantry-tables";
import type { Catalog } from "../../rules/catalog";
import { infantryBv, infantryCost, platoonOf } from "../../rules/infantry/platoon";
import type { InfantryRecord } from "../../rules/infantry/platoon";
import { TRADEMARK_LINE } from "../sheet/RecordSheet";
import { INK } from "../sheet/text";
import FigureDiagram from "../doll/figure-diagram";
import InfantryDoll, { fitInfantryDoll, infantryLayout } from "../doll/infantry-doll";

const DOLL = { Doll: InfantryDoll, layout: infantryLayout, fit: fitInfantryDoll };

const W = 1700;
const H = 2200;
const CELLS = 30;
const PER_ROW = 15;
const CELL_W = 106;
const signed = (n: number): string => (n > 0 ? `+${String(n)}` : n < 0 ? `-${String(Math.abs(n))}` : "0");
const num = (n: number): string => String(Math.round(n * 100) / 100);

export function sheetFacts(record: InfantryRecord, catalog: Catalog): string[] {
  const p = platoonOf(record, catalog);
  const bv = infantryBv(record, catalog);
  const cost = infantryCost(record, catalog);
  const formation = FORMATIONS.find((f) => f.id === record.formation)?.label ?? record.formation;
  return [
    `${p.motive?.label ?? record.motive} infantry, ${record.techBase === "clan" ? "Clan" : "Inner Sphere"} technology, ${formation}`,
    `${String(p.troopers)} troopers in ${String(record.squads)} squads of ${String(record.perSquad)}${p.lines.length > 1 ? `, played as ${String(p.lines.length)} sub-platoons of ${p.lines.join(", ")}` : ""}`,
    `Movement ${String(p.mp)} ${p.mpType}${p.moveOrShoot ? ", move or fire" : ""}`,
    `Primary weapon ${p.primary?.name ?? "none"}${p.secondary ? `; secondary ${p.secondary.name}, ${String(record.secondary.perSquad)} a squad` : ""}`,
    `Damage ${String(p.totalDamage)} for the full platoon; skills Gunnery ${String(record.skills.gunnery)}, Anti-'Mech ${p.motive?.mechanized ? "none (mechanized)" : record.antiMech ? String(record.skills.antiMech) : "8 (fixed)"}`,
    `Range modifiers by hex from 0: ${p.rangeMods.map(signed).join(", ")}`,
    ...(p.specials.length > 0 ? [`Special: ${p.specials.join("; ")}`] : []),
    ...(p.armor ? [`Armor kit ${p.armor.name}, damage divisor ${String(p.armor.divisor)}`] : []),
    ...(p.specializations.length > 0 ? [`Specialties: ${p.specializations.map((s) => s.name).join(", ")}`] : []),
    `Weight ${num(p.weight)} tons; cost ${cost.total.toLocaleString("en-US")} C-bills; Battle Value ${bv.bv === undefined ? "not worked out" : String(bv.bv)}`,
  ];
}

export default function InfantrySheet({ record, catalog }: { record: InfantryRecord; catalog: Catalog }) {
  const p = platoonOf(record, catalog);
  const title = `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed platoon";
  const facts = sheetFacts(record, catalog);
  const lines = p.lines.length === 0 ? [0] : p.lines;
  const lineHeight = 380;
  const top = 330;
  const rangeTop = top + lines.length * lineHeight + 20;
  const figuresTop = rangeTop + 350 + Math.max(0, facts.length - 1) * 36 + 20;
  const figuresH = Math.min(560, H - 70 - figuresTop - 50);
  const kind = p.motive?.mechanized ? "mechanized" : record.motive;
  const kit = record.armor ? armorKitOf(record.armor) : undefined;
  return (
    <svg className="bt-sheet bt-infantry-sheet" viewBox={`0 0 ${String(W)} ${String(H)}`} role="img" aria-label={`Record sheet of ${title}. ${facts.join(". ")}.`} xmlns="http://www.w3.org/2000/svg" fontFamily="Arial, Helvetica, sans-serif">
      <rect x={0} y={0} width={W} height={H} fill="#fff" />
      <text className="bt-sheet__head" x={40} y={90} fontSize={64} fill={INK}>{title}</text>
      <text x={40} y={140} fontSize={30} fill={INK}>{facts[0]}</text>
      <text x={40} y={185} fontSize={28} fill={INK}>{`Primary: ${p.primary?.name ?? "none"}${p.secondary ? ` | Secondary: ${p.secondary.name} x${String(record.secondary.perSquad)} a squad` : ""}${p.armor ? ` | Armor: ${p.armor.name}` : ""}`}</text>
      <text x={40} y={230} fontSize={28} fill={INK}>{`${String(p.troopers)} troopers, ${num(p.weight)} tons, ${infantryCost(record, catalog).total.toLocaleString("en-US")} C-bills, Battle Value ${String(infantryBv(record, catalog).bv ?? "not worked out")}`}</text>
      <text x={40} y={275} fontSize={28} fill={INK}>{p.specials.length > 0 ? `Special: ${p.specials.join("; ")}` : "Special: none"}</text>

      {lines.map((count, li) => {
        const y = top + li * lineHeight;
        return (
          <g key={li}>
            <rect x={30} y={y} width={W - 60} height={lineHeight - 20} rx={16} fill="#fff" stroke={INK} strokeWidth={4} />
            <text x={50} y={y + 40} fontSize={32} fontWeight="bold" fill={INK}>{lines.length === 1 ? "Platoon" : `Sub-platoon ${String(li + 1)}`}</text>
            <text x={420} y={y + 40} fontSize={28} fill={INK}>{`Gunnery ${String(record.skills.gunnery)}   Anti-'Mech ${p.motive?.mechanized ? "none" : record.antiMech ? String(record.skills.antiMech) : "8"}`}</text>
            <text x={W - 50} y={y + 40} fontSize={28} textAnchor="end" fill={INK}>{`Movement ${String(p.mp)} ${p.mpType}${p.moveOrShoot ? " (move or fire)" : ""}`}</text>
            {Array.from({ length: CELLS }, (_, i) => {
              const col = i % PER_ROW;
              const row = Math.floor(i / PER_ROW);
              const x = 60 + col * CELL_W;
              const cy = y + 62 + row * 150;
              const live = i < count;
              const damage = p.damageAt[i];
              return (
                <g key={i}>
                  <rect x={x} y={cy} width={CELL_W - 8} height={136} rx={8} fill={live ? "#fff" : INK} stroke={INK} strokeWidth={2} />
                  {live && (
                    <>
                      <text x={x + (CELL_W - 8) / 2} y={cy + 28} fontSize={24} textAnchor="middle" fill={INK}>{String(i + 1)}</text>
                      <circle cx={x + (CELL_W - 8) / 2} cy={cy + 62} r={20} fill="none" stroke={INK} strokeWidth={3} />
                      <rect x={x + 18} y={cy + 92} width={CELL_W - 44} height={34} fill="#fff" stroke={INK} strokeWidth={2} />
                      <text x={x + (CELL_W - 8) / 2} y={cy + 118} fontSize={26} textAnchor="middle" fill={INK}>{damage === undefined ? "" : String(damage)}</text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      <g>
        <text x={40} y={rangeTop + 36} fontSize={32} fontWeight="bold" fill={INK}>To-hit modifier by range in hexes</text>
        {Array.from({ length: 23 }, (_, hex) => {
          const mod = p.rangeMods[hex];
          const x = 40 + hex * 70;
          return (
            <g key={hex}>
              <rect x={x} y={rangeTop + 56} width={66} height={44} fill={mod === undefined ? INK : "#fff"} stroke={INK} strokeWidth={2} />
              <rect x={x} y={rangeTop + 100} width={66} height={56} fill={mod === undefined ? INK : "#fff"} stroke={INK} strokeWidth={2} />
              <text x={x + 33} y={rangeTop + 88} fontSize={26} textAnchor="middle" fill={mod === undefined ? "#fff" : INK}>{hex === 22 ? "22+" : String(hex)}</text>
              {mod !== undefined && <text x={x + 33} y={rangeTop + 140} fontSize={30} textAnchor="middle" fill={INK}>{signed(mod)}</text>}
            </g>
          );
        })}
        <text x={40} y={rangeTop + 190} fontSize={24} fill={INK}>{`The weapon that sets the range: ${p.ruling?.name ?? "none"} (Base Range ${String(p.baseRange)}). The 0 hex entry includes point-blank, heavy burst and crew adjustments.`}</text>
      </g>

      <g>
        <text x={40} y={rangeTop + 260} fontSize={30} fontWeight="bold" fill={INK}>Damage divisor</text>
        <text x={330} y={rangeTop + 260} fontSize={30} fill={INK}>{kit ? `${String(kit.divisor)} (${kit.name})` : "1 (no armor kit)"}</text>
        <text x={40} y={rangeTop + 310} fontSize={30} fontWeight="bold" fill={INK}>Notes</text>
        {facts.slice(1).map((line, i) => (
          <text key={i} x={40} y={rangeTop + 350 + i * 36} fontSize={24} fill={INK}>{line}</text>
        ))}
      </g>
      {figuresH >= 200 && (
        <g data-diagram="platoon-figures">
          <text x={40} y={figuresTop + 30} fontSize={30} fontWeight="bold" fill={INK}>Platoon figures</text>
          {lines.map((count, li) => (
            <FigureDiagram
              key={li} kind={DOLL} unit={{ layout: kind, locations: [{ code: "pl", name: lines.length === 1 ? "Platoon" : `Sub-platoon ${String(li + 1)}`, armor: count }] }} use="armor" suffix={`inf-sheet-${String(li)}`}
              label={`${lines.length === 1 ? "Platoon" : `Sub-platoon ${String(li + 1)}`}, ${String(count)} troopers`} labelSize={26}
              rect={{ x: 40 + (li * (W - 80)) / lines.length, y: figuresTop + 50, w: (W - 80) / lines.length - 20, h: figuresH }}
            />
          ))}
        </g>
      )}
      <text x={40} y={H - 30} fontSize={18} fill={INK}>{TRADEMARK_LINE}</text>
    </svg>
  );
}
