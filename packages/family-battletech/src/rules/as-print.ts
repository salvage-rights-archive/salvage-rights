// The printed card and roster, as plain data: what each field of the blank card (ASCE p. 213, drawn by us) holds for one unit at one
// Skill, how the armor and structure bubbles lie in their box, how the special abilities wrap, and the one-page roster with totals.
// Pure; nothing here throws on a unit it does not understand (an unknown type is drawn with no critical boxes).
import { AS_CARD_AIR, AS_CARD_CRITS, AS_CARD_LAYOUT_OF, AS_UNIT_TYPES } from "../data/alpha-strike";
import type { CardCritRow, CardLayout } from "../data/alpha-strike";
import { forceTotals, skillAdjustedPv } from "./as-force";
import type { AsForce } from "./as-force";
import { formatDamage, formatMove, formatSpecials, unitTitle } from "./as-unit";
import type { AsUnit } from "./as-unit";

export interface PrintCard {
  unitId: string;
  title: string;
  type: string;
  size: number;
  layout: CardLayout;
  air: boolean;
  tmm: string;
  move: string;
  thrust: string;
  role: string;
  skill: number;
  pv: number;
  basePv: number;
  pilot: string;
  /** The damage brackets in order: S, M, L, and E for a card that has it. */
  damage: { bracket: string; value: string }[];
  /** Null when the blank card has no OV line (infantry). */
  ov: string | null;
  heatScale: boolean;
  armor: number;
  structure: number;
  threshold: string;
  specials: string;
  crits: CardCritRow[];
}

const BRACKETS = [
  { key: "s", bracket: "S (+0)" },
  { key: "m", bracket: "M (+2)" },
  { key: "l", bracket: "L (+4)" },
  { key: "e", bracket: "E (+6)" },
] as const;

/** One unit's card at a Skill: every field the blank card has, as text, with the Skill-adjusted PV (ASCE p. 29) and the base PV beside it. */
export function printCard(unit: AsUnit, skill: number, pilot = ""): PrintCard {
  const card = unit.card;
  const layout = AS_CARD_LAYOUT_OF[card.type] ?? "infantry";
  const air = AS_CARD_AIR.includes(layout);
  const heatScale = AS_UNIT_TYPES.find((t) => t.code === card.type)?.heat === true;
  return {
    unitId: unit.id,
    title: unitTitle(unit),
    type: card.type,
    size: card.size,
    layout,
    air,
    tmm: card.tmm === null ? "" : String(card.tmm),
    move: formatMove(card.move),
    thrust: card.thrust === undefined ? "" : String(card.thrust),
    role: card.role ?? "",
    skill,
    pv: skillAdjustedPv(card.pv, skill),
    basePv: card.pv,
    pilot,
    damage: BRACKETS.filter((b) => b.key !== "e" || air).map((b) => ({ bracket: b.bracket, value: formatDamage(card.damage[b.key] ?? null) })),
    ov: layout === "infantry" ? null : String(card.ov),
    heatScale,
    armor: Math.max(0, Math.floor(card.armor)),
    structure: Math.max(0, Math.floor(card.structure)),
    threshold: card.threshold === undefined ? "" : String(card.threshold),
    specials: formatSpecials(card.specials),
    crits: AS_CARD_CRITS[layout],
  };
}

export interface BubbleLayout {
  /** Bubble diameter and the gap from one bubble to the next, in card units. */
  diameter: number;
  pitch: number;
  armor: { x: number; y: number }[];
  rows: { armor: number; structure: number };
  structure: { x: number; y: number }[];
}

/**
 * Where the armor bubbles (first) and the structure bubbles (after them) sit in a box `width` by `height`. The bubbles start large and
 * shrink until every one fits, so a 'Mech's few stay easy to mark and a large unit's many still fit.
 */
export function bubbleLayout(armor: number, structure: number, width: number, height: number): BubbleLayout {
  for (let diameter = 10; diameter >= 2; diameter -= 0.5) {
    const pitch = diameter + 1.5;
    const perRow = Math.max(1, Math.floor(width / pitch));
    const armorRows = Math.ceil(armor / perRow);
    const rows = armorRows + Math.ceil(structure / perRow);
    if (rows * pitch <= height || diameter === 2) {
      const at = (count: number, firstRow: number) =>
        Array.from({ length: count }, (_, i) => ({ x: (i % perRow) * pitch + diameter / 2, y: (firstRow + Math.floor(i / perRow)) * pitch + diameter / 2 }));
      return { diameter, pitch, rows: { armor: armorRows, structure: rows - armorRows }, armor: at(armor, 0), structure: at(structure, armorRows) };
    }
  }
  return { diameter: 2, pitch: 3.5, rows: { armor: 0, structure: 0 }, armor: [], structure: [] };
}

/** Text broken into lines of at most `maxChars`, at spaces; a line past `maxLines` is cut with an ellipsis so nothing runs off the box. */
export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter((w) => w !== "")) {
    if (line !== "" && line.length + 1 + word.length > maxChars) {
      lines.push(line);
      line = word;
    } else line = line === "" ? word : `${line} ${word}`;
  }
  if (line !== "") lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${(kept[maxLines - 1] ?? "").slice(0, Math.max(0, maxChars - 1))}…`;
  return kept;
}

/** The cards to print for a force: one per member whose unit is still in the roster, at the member's Skill. */
export function forceCards(force: AsForce, roster: ReadonlyMap<string, AsUnit>): PrintCard[] {
  return force.members.flatMap((m) => {
    const unit = roster.get(m.unitId);
    return unit ? [printCard(unit, m.skill, m.pilot?.trim() ?? "")] : [];
  });
}

export interface RosterRow {
  title: string;
  type: string;
  size: number;
  move: string;
  role: string;
  skill: number;
  pilot: string;
  formation: string;
  basePv: number;
  pv: number;
}

export interface PrintRoster {
  name: string;
  rows: RosterRow[];
  total: number;
  pvLimit?: number;
  missing: number;
}

/** The one-page roster: a row per unit with its adjusted PV, the total, and how many members the roster no longer holds. */
export function printRoster(force: AsForce, roster: ReadonlyMap<string, AsUnit>): PrintRoster {
  const totals = forceTotals(force, roster);
  const rows = totals.lines.flatMap((line): RosterRow[] =>
    line.unit
      ? [
          {
            title: unitTitle(line.unit) || "Unnamed unit",
            type: line.unit.card.type,
            size: line.unit.card.size,
            move: line.unit.card.move.length === 0 && line.unit.card.thrust !== undefined ? `THR ${String(line.unit.card.thrust)}` : formatMove(line.unit.card.move),
            role: line.unit.card.role ?? "",
            skill: line.member.skill,
            pilot: line.member.pilot?.trim() ?? "",
            formation: line.member.formation?.trim() ?? "",
            basePv: line.base,
            pv: line.adjusted,
          },
        ]
      : [],
  );
  return { name: force.name.trim() || "Unnamed force", rows, total: totals.total, pvLimit: force.pvLimit, missing: totals.missing };
}

/** Cards in groups of nine, one group to a printed sheet. */
export function sheetsOf<T>(items: readonly T[], perSheet = 9): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += perSheet) out.push(items.slice(i, i + perSheet));
  return out;
}
