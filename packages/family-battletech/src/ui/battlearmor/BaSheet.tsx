// The printable battle armor record sheet: one SVG of 1700 by 2200 units (Letter proportions, the Classic sheet's own), our own drawing in the
// arrangement of the Total Warfare Battle Armor Record Sheet (the publisher's blank, marked for personal reproduction: one block for the squad or
// Point with its type, skills, movement, weapons, the four capability boxes, a row for each trooper with its own point then its armor points, and the
// armor line), with the Leg Attacks and Swarm Attacks tables beside it. No logo or art. Pure: it reads nothing but its props; the sheet is paper.
import { armorTypeOf, unitWord, weightClassOf } from "../../data/battlearmor";
import { build, figuresOf, locationName, shotsOf, carriesShots } from "../../rules/battlearmor/construct";
import { officialState } from "../../rules/battlearmor/checks";
import { battleValue } from "../../rules/battlearmor/bv";
import type { BaRecord } from "../../rules/battlearmor/record";
import type { Catalog } from "../../rules/catalog";
import { officialLabel } from "../../rules/official";
import { tidy } from "../../rules/walk";
import Frame from "../sheet/Frame";
import { TRADEMARK_LINE } from "../sheet/RecordSheet";
import { INK, squeeze } from "../sheet/text";
import BaSheetTroopers from "./BaSheetTroopers";

export const SHEET_WIDTH = 1700;
export const SHEET_HEIGHT = 2200;

interface Line {
  label: string;
  damage: string;
  range: string[];
}
const dash = (n: number) => (n === 0 ? "-" : String(n));

/** The weapons the sheet lists, each with its damage and the four range bands, and the other items by name. */
export function linesOf(record: BaRecord, catalog: Catalog): { weapons: Line[]; items: string[] } {
  const weapons: Line[] = [];
  const items: string[] = [];
  for (const mount of record.mounts) {
    const figures = figuresOf(mount, catalog, record.editionId);
    if (!figures) {
      items.push(`${mount.name || "Unknown item"} (${locationName(mount.location)})`);
      continue;
    }
    const { row } = figures;
    const name = row.name.replace(/ \(Battle Armor\)$/, "");
    const where = locationName(mount.location);
    if (row.kind === "weapon") {
      const label = carriesShots(row) ? `${name} (${String(shotsOf(mount))} shots), ${where}` : `${name}, ${where}`;
      weapons.push({ label, damage: row.damage ?? "-", range: (row.range ?? [0, 0, 0, 0]).map(dash) });
    } else items.push(`${name}, ${where}`);
  }
  return { weapons, items };
}

const CHECKS = (b: ReturnType<typeof build>) => [
  ["Mechanized", b.capabilities.mechanized],
  ["Swarm", b.capabilities.swarm],
  ["Leg", b.capabilities.leg],
] as const;

export default function BaSheet({ record, catalog }: { record: BaRecord; catalog: Catalog }) {
  const b = build(record, catalog);
  const cls = weightClassOf(record.weightClass);
  const armor = armorTypeOf(record.armor.type);
  const { weapons, items } = linesOf(record, catalog);
  const bv = battleValue(record, catalog);
  const official = officialLabel(officialState(record));
  const name = `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed battle armor";
  const nameSize = Math.min(84, Math.floor(1020 / (Math.max(name.length, 1) * 0.62)));
  const word = unitWord(record.techBase);
  const other = [b.moves.jump > 0 && `Jump ${String(b.moves.jump)}`, b.moves.vtol > 0 && `VTOL ${String(b.moves.vtol)}`, b.moves.umu > 0 && `UMU ${String(b.moves.umu)}`].filter(Boolean).join(", ");
  const mods = [
    armor?.rangeMods && `To-hit against it at short, medium, long: +${armor.rangeMods.join("/+")}`,
    armor?.moveMods && `To-hit by hexes moved 0, 1, 2, 3 or more: +${armor.moveMods.slice(0, 3).join("/+")}/+0`,
    armor?.invisibleToProbes && "Not seen by active probes",
    armor?.ignoresHeat && "Ignores damage from heat-causing weapons",
  ].filter(Boolean) as string[];
  const troopersH = Math.ceil(Math.max(1, Math.min(6, record.troopers)) / 3) * 300;
  const unitTop = 240;
  const troopersTop = unitTop + 760;
  const height = troopersTop + troopersH + 150 - unitTop;
  const x = 60;
  const cols = [560, 760, 860, 960, 1060];
  return (
    <svg className="bt-sheet" viewBox={`0 0 ${String(SHEET_WIDTH)} ${String(SHEET_HEIGHT)}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${name} record sheet`}>
      <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill="#fff" />
      <text className="bt-sheet__head" x={40} y={30 + nameSize * 0.8} fontSize={nameSize} fill={INK} {...squeeze(name, nameSize, 1100)}>
        {name}
      </text>
      <text x={42} y={170} fontSize={34} fontWeight={700} fill={INK}>
        Battle armor record sheet
      </text>
      <text x={42} y={204} fontSize={22} fill={INK}>
        {`${cls?.label ?? record.weightClass} ${record.body}, ${record.techBase === "clan" ? "Clan" : "Inner Sphere"}, ${String(record.troopers)} troopers. Battle Value ${String(bv.total)}.`}
      </text>
      <text className="bt-sheet__head" x={1670} y={170} fontSize={24} textAnchor="end" letterSpacing={3} fill={INK}>
        SALVAGE RIGHTS
      </text>
      <text x={1670} y={142} fontSize={26} fontWeight={700} textAnchor="end" fill={INK} data-official={official.badge === "OFFICIAL"} {...squeeze(`${official.badge} ${official.detail}`.trim(), 26, 560, true)}>
        {`${official.badge} ${official.detail}`.trim()}
      </text>

      <Frame rect={{ x: 30, y: unitTop, w: 1130, h: height }} title={`BATTLE ARMOR: ${word.toUpperCase()}`}>
        <text x={x} y={unitTop + 80} fontSize={28} fill={INK}>{`Type: ${name}`}</text>
        <text x={x} y={unitTop + 128} fontSize={28} fill={INK}>{`Gunnery skill: ${String(record.skills.gunnery)}      Anti-'Mech skill: ${String(record.skills.antiMech)}`}</text>
        <text x={x} y={unitTop + 176} fontSize={28} fill={INK}>{`Ground MP: ${String(b.moves.ground)}      Other MP: ${other || "none"}`}</text>
        <text x={x} y={unitTop + 240} fontSize={26} fontWeight={700} fill={INK}>Weapons and equipment</text>
        {["Dmg", "Min", "Sht", "Med", "Lng"].map((h, i) => (
          <text key={h} x={cols[i] ?? 0} y={unitTop + 240} fontSize={24} fontWeight={700} fill={INK}>{h}</text>
        ))}
        {weapons.slice(0, 8).map((w, i) => (
          <g key={`${w.label}-${String(i)}`}>
            <text x={x} y={unitTop + 280 + i * 38} fontSize={24} fill={INK} {...squeeze(w.label, 24, 480)}>{w.label}</text>
            {[w.damage, ...w.range].map((v, c) => (
              <text key={c} x={cols[c] ?? 0} y={unitTop + 280 + i * 38} fontSize={24} fill={INK}>{v}</text>
            ))}
          </g>
        ))}
        <text x={x} y={unitTop + 600} fontSize={24} fill={INK} {...squeeze(items.length === 0 ? "Other equipment: none" : `Other equipment: ${items.join("; ")}`, 24, 1040)}>
          {items.length === 0 ? "Other equipment: none" : `Other equipment: ${items.join("; ")}`}
        </text>
        {CHECKS(b).map(([label, on], i) => (
          <g key={label}>
            <rect x={x + i * 300} y={unitTop + 650} width={34} height={34} fill={on ? INK : "#fff"} stroke={INK} strokeWidth={3} />
            <text x={x + i * 300 + 48} y={unitTop + 678} fontSize={26} fill={INK}>{`${label}: ${on ? "yes" : "no"}`}</text>
          </g>
        ))}
        <BaSheetTroopers record={record} rect={{ x, y: troopersTop, w: 1010, h: troopersH }} />
        <text x={x} y={troopersTop + troopersH + 50} fontSize={26} fill={INK} {...squeeze(`Armor: ${armor?.label ?? record.armor.type}${mods.length ? `. ${mods.join(". ")}` : ""}`, 26, 1040)}>
          {`Armor: ${armor?.label ?? record.armor.type}${mods.length ? `. ${mods.join(". ")}` : ""}`}
        </text>
        <text x={x} y={troopersTop + troopersH + 96} fontSize={24} fill={INK}>
          {`Weight ${String(tidy(b.totalKg))} kg of ${String(cls?.maxKg ?? 0)}. Each suit has ${String(record.armor.points)} armor points and the trooper.`}
        </text>
      </Frame>

      <Frame rect={{ x: 1190, y: 240, w: 480, h: 300 }} title="LEG ATTACKS">
        <text x={1220} y={320} fontSize={24} fontWeight={700} fill={INK}>Troopers active: to-hit</text>
        {[["4 to 6", "+0"], ["3", "+2"], ["2", "+5"], ["1", "+7"]].map(([n, m], i) => (
          <text key={n} x={1220} y={364 + i * 40} fontSize={26} fill={INK}>{`${n ?? ""}: ${m ?? ""}`}</text>
        ))}
      </Frame>
      <Frame rect={{ x: 1190, y: 600, w: 480, h: 220 }} title="SWARM ATTACKS">
        <text x={1220} y={680} fontSize={24} fontWeight={700} fill={INK}>Troopers active: to-hit</text>
        {[["4 to 6", "+2"], ["1 to 3", "+5"]].map(([n, m], i) => (
          <text key={n} x={1220} y={724 + i * 40} fontSize={26} fill={INK}>{`${n ?? ""}: ${m ?? ""}`}</text>
        ))}
      </Frame>

      <text x={40} y={SHEET_HEIGHT - 40} fontSize={18} fill={INK} {...squeeze(TRADEMARK_LINE, 18, 1620)}>
        {TRADEMARK_LINE}
      </text>
    </svg>
  );
}
