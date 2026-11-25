// The 'Mech data block: type and movement, the weapons and equipment inventory, the ammunition and the Battle Value.
import type { InventoryLine } from "../../rules/catalog";
import Frame from "./Frame";
import type { Rect } from "./Frame";
import type { SheetFacts } from "./facts";
import { FAINT, INK, MIN_SIZE, squeeze, wrap } from "./text";

/** The inventory's type sizes, largest first: the row pitch and type size in sheet units. The first size that holds every line
 * is used. The last is the smallest the sheet prints (6.6 pt at Letter width); past its room the table ends with a count. */
const SIZES: { pitch: number; size: number }[] = [
  { pitch: 27, size: 23 },
  { pitch: 25, size: 22 },
  { pitch: 23.5, size: 21 },
  { pitch: 22, size: 20 },
  { pitch: 20.5, size: MIN_SIZE },
];

/** Columns of the inventory: where each is, in units from the left edge of the frame, and how wide its text may be. */
const COLUMNS = {
  qty: { at: 36, anchor: "middle" as const },
  type: { at: 62, anchor: "start" as const, width: 195 },
  loc: { at: 284, anchor: "middle" as const },
  ht: { at: 328, anchor: "middle" as const },
  dmg: { at: 356, anchor: "start" as const, width: 82 },
  min: { at: 478, anchor: "middle" as const },
  sht: { at: 524, anchor: "middle" as const },
  med: { at: 570, anchor: "middle" as const },
  lng: { at: 616, anchor: "middle" as const },
};
const HEADINGS: [keyof typeof COLUMNS, string][] = [
  ["qty", "Qty"],
  ["type", "Type"],
  ["loc", "Loc"],
  ["ht", "Ht"],
  ["dmg", "Dmg"],
  ["min", "Min"],
  ["sht", "Sht"],
  ["med", "Med"],
  ["lng", "Lng"],
];

/** The size the inventory prints at for this many lines in this much height: the first size that holds them all, else the smallest. */
export function inventoryStep(count: number, room: number) {
  const step = SIZES.find((s) => count * s.pitch <= room) ?? SIZES[SIZES.length - 1]!;
  return { ...step, capacity: Math.floor(room / step.pitch) };
}

function Inventory({ x, top, bottom, lines }: { x: number; top: number; bottom: number; lines: InventoryLine[] }) {
  const step = inventoryStep(lines.length, bottom - top);
  const shown = lines.length > step.capacity ? lines.slice(0, step.capacity - 1) : lines;
  const hidden = lines.length - shown.length;
  const baseline = (index: number) => top + step.pitch * index + step.size * 0.35;
  return (
    <g>
      {HEADINGS.map(([key, text]) => (
        <text key={key} x={x + COLUMNS[key].at} y={top - 28} fontSize={20} fontWeight={700} textAnchor={COLUMNS[key].anchor} fill={INK}>
          {text}
        </text>
      ))}
      <line x1={x + 12} x2={x + 628} y1={top - 20} y2={top - 20} stroke={INK} strokeWidth={2} />
      {shown.map((line, index) => {
        const cell = (key: keyof typeof COLUMNS, text: string) => {
          const column = COLUMNS[key];
          const fit = "width" in column ? squeeze(text, step.size, column.width) : {};
          return (
            <text key={key} x={x + column.at} y={baseline(index)} fontSize={step.size} textAnchor={column.anchor} fill={text === "—" ? FAINT : INK} {...fit}>
              {text}
            </text>
          );
        };
        return (
          <g key={index} data-line="">
            {cell("qty", String(line.qty))}
            {cell("type", line.name)}
            {cell("loc", line.location)}
            {cell("ht", line.heat)}
            {cell("dmg", line.damage)}
            {cell("min", line.min)}
            {cell("sht", line.short)}
            {cell("med", line.medium)}
            {cell("lng", line.long)}
          </g>
        );
      })}
      {hidden > 0 && (
        <text x={x + COLUMNS.type.at} y={baseline(shown.length)} fontSize={step.size} fontStyle="italic" fill={INK}>
          {`and ${String(hidden)} more (see the editor)`}
        </text>
      )}
    </g>
  );
}

export default function MechData({ rect, facts }: { rect: Rect; facts: SheetFacts }) {
  const { x, y } = rect;
  const pair = (label: string, value: string, px: number, py: number, size: number, max: number) => (
    <text x={px} y={py} fontSize={size} fill={INK}>
      <tspan fontWeight={700}>{`${label} `}</tspan>
      <tspan {...squeeze(value, size, max)}>{value}</tspan>
    </text>
  );
  const ammo = facts.ammo ? wrap(`Ammo: ${facts.ammo}`, 22, 590) : [];
  const ammoTop = y + rect.h - 84 - ammo.length * 26;
  return (
    <Frame rect={rect} title="'MECH DATA">
      {pair("Type:", facts.title, x + 24, y + 74, 28, 480)}
      <text x={x + 24} y={y + 122} fontSize={24} fontWeight={700} fill={INK}>
        Movement Points:
      </text>
      {facts.movementNote !== undefined && (
        <text x={x + 262} y={y + 122} fontSize={MIN_SIZE} fontStyle="italic" fill={INK} {...squeeze(facts.movementNote, MIN_SIZE, 366)}>
          {facts.movementNote}
        </text>
      )}
      {pair("Walking:", facts.walk, x + 40, y + 156, 25, 200)}
      {pair("Running:", facts.run, x + 40, y + 188, 25, 200)}
      {pair("Jumping:", facts.jump, x + 40, y + 220, 25, 200)}
      {pair("Tonnage:", facts.tons, x + 330, y + 156, 25, 160)}
      {pair("Tech Base:", facts.techBase, x + 330, y + 188, 25, 160)}
      {facts.year !== undefined && pair("Year:", facts.year, x + 330, y + 220, 25, 160)}
      {pair("Rules edition:", facts.edition, x + 24, y + 254, 24, 400)}
      {pair("Rules level:", facts.level, x + 24, y + 280, 24, 400)}
      <line x1={x + 12} x2={x + rect.w - 12} y1={y + 292} y2={y + 292} stroke={INK} strokeWidth={2} />
      <text x={x + 24} y={y + 322} fontSize={26} fontWeight={700} fill={INK}>
        Weapons &amp; Equipment Inventory
      </text>
      <text x={x + rect.w - 24} y={y + 322} fontSize={MIN_SIZE} textAnchor="end" fill={INK}>
        (hexes)
      </text>
      <Inventory x={x} top={y + 372} bottom={ammoTop - 22} lines={facts.inventory} />
      {ammo.map((line, index) => (
        <text key={index} x={x + 24} y={ammoTop + index * 26} fontSize={22} fill={INK}>
          {line}
        </text>
      ))}
      <line x1={x + 12} x2={x + rect.w - 12} y1={y + rect.h - 66} y2={y + rect.h - 66} stroke={INK} strokeWidth={2} />
      <text x={x + 24} y={y + rect.h - 22} fontSize={32} fill={INK}>
        <tspan fontWeight={700}>BV:</tspan>
        {` ${facts.battleValue} `}
        <tspan fontSize={MIN_SIZE}>{`(${facts.battleValueFrom})`}</tspan>
      </text>
    </Frame>
  );
}
