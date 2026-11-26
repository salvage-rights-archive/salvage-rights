// The printed card and roster, as plain data: what each field of the blank card (ASCE p. 213, drawn by us) holds for one unit at one
// Skill, how the armor and structure bubbles lie in their box, how the special abilities wrap, and the one-page roster with totals.
// Pure; nothing here throws on a unit it does not understand (an unknown type is drawn with no critical boxes).
import { AS_CARD_AIR, AS_CARD_CRITS, AS_CARD_LAYOUT_OF, AS_UNIT_TYPES } from "../data/alpha-strike";
import type { CardCritRow, CardLayout } from "../data/alpha-strike";
import { findFormation, forceTotals, groupsOf, skillAdjustedPv } from "./as-force";
import type { AsForce, AsMember } from "./as-force";
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
  /** Null when the blank card has no OV line (infantry, ProtoMech, large units). */
  ov: string | null;
  heatScale: boolean;
  armor: number;
  structure: number;
  threshold: string;
  specials: string;
  specialsFit: SpecialsFit;
  crits: CardCritRow[];
}

/** The blank cards with no OV line: infantry (p. 214), ProtoMech and the large unit (p. 215). */
const NO_OV: readonly CardLayout[] = ["infantry", "proto", "large-air"];

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
    ov: NO_OV.includes(layout) ? null : String(card.ov),
    heatScale,
    armor: Math.max(0, Math.floor(card.armor)),
    structure: Math.max(0, Math.floor(card.structure)),
    threshold: card.threshold === undefined ? "" : String(card.threshold),
    specials: formatSpecials(card.specials),
    specialsFit: fitSpecials(formatSpecials(card.specials)),
    crits: AS_CARD_CRITS[layout],
  };
}

export interface BubbleLayout {
  /** "bubbles" while every one fits at a size a pencil can mark; "numbers" past that (two boxes to write the figures in, as the book's DropShip card has). */
  mode: "bubbles" | "numbers";
  /** Bubble diameter and the gap from one bubble to the next, in card units. */
  diameter: number;
  pitch: number;
  armor: { x: number; y: number }[];
  rows: { armor: number; structure: number };
  structure: { x: number; y: number }[];
}

/** The smallest bubble, in card units (hundredths of an inch), that is still worth marking with a pencil. */
export const MIN_BUBBLE = 4;

/**
 * Where the armor bubbles (first) and the structure bubbles (after them) sit in a box `width` by `height`. The bubbles start large and
 * shrink until every one fits, so a 'Mech's few stay easy to mark and a large unit's many still fit; past the smallest worthwhile size the
 * layout is "numbers". The armor always has a row of its own, so the A: and S: labels never meet when a unit has no armor.
 */
export function bubbleLayout(armor: number, structure: number, width: number, height: number): BubbleLayout {
  for (let diameter = 10; diameter >= MIN_BUBBLE; diameter -= 0.5) {
    const pitch = diameter + 1.5;
    const perRow = Math.max(1, Math.floor(width / pitch));
    const armorRows = Math.max(1, Math.ceil(armor / perRow));
    const rows = armorRows + Math.ceil(structure / perRow);
    if (rows * pitch <= height) {
      const at = (count: number, firstRow: number) =>
        Array.from({ length: count }, (_, i) => ({ x: (i % perRow) * pitch + diameter / 2, y: (firstRow + Math.floor(i / perRow)) * pitch + diameter / 2 }));
      return { mode: "bubbles", diameter, pitch, rows: { armor: armorRows, structure: rows - armorRows }, armor: at(armor, 0), structure: at(structure, armorRows) };
    }
  }
  return { mode: "numbers", diameter: MIN_BUBBLE, pitch: MIN_BUBBLE + 1.5, rows: { armor: 1, structure: 1 }, armor: [], structure: [] };
}

/** Text broken into lines of at most `maxChars`, at spaces. Nothing is dropped. */
export function wrapLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter((w) => w !== "")) {
    if (line !== "" && line.length + 1 + word.length > maxChars) {
      lines.push(line);
      line = word;
    } else line = line === "" ? word : `${line} ${word}`;
  }
  if (line !== "") lines.push(line);
  return lines;
}

/** The type sizes the Special box tries, largest first; the last is the smallest still legible at print size (about 4 points). */
export const SPECIAL_SIZES = [6.8, 6.2, 5.6] as const;
/** The Special box holds this many lines and is this many units wide. */
const SPECIAL_LINES = 3;
const SPECIAL_WIDTH = 176;
/** Written on the last line when the abilities do not fit even at the smallest size. */
export const SPECIAL_MORE = "more on the roster";

export interface SpecialsFit {
  size: number;
  lines: string[];
  /** True when abilities were left off the card; the roster page lists them in full. */
  more: boolean;
}

/** Whether `text` ends on a whole ability: a comma at the top level, not inside the brackets of one ability. */
function endsOnAbility(text: string): boolean {
  let depth = 0;
  for (const c of text) depth += c === "(" ? 1 : c === ")" ? -1 : 0;
  return depth === 0 && text.endsWith(",");
}

/**
 * The special abilities in their box: the largest type size at which they all fit in three lines. If they do not fit at the smallest, the
 * card prints the whole abilities that fit in two lines and "more on the roster" on the third, never a cut ability.
 */
export function fitSpecials(text: string): SpecialsFit {
  for (const size of SPECIAL_SIZES) {
    const lines = wrapLines(text, Math.floor(SPECIAL_WIDTH / (size * 0.56)));
    if (lines.length <= SPECIAL_LINES) return { size, lines, more: false };
  }
  const size = SPECIAL_SIZES[SPECIAL_SIZES.length - 1] ?? 5.6;
  const words = wrapLines(text, Math.floor(SPECIAL_WIDTH / (size * 0.56))).slice(0, SPECIAL_LINES - 1).join(" ").split(" ");
  while (words.length > 0 && !endsOnAbility(words.join(" "))) words.pop();
  const kept = wrapLines(words.join(" "), Math.floor(SPECIAL_WIDTH / (size * 0.56)));
  return { size, lines: [...kept, SPECIAL_MORE], more: true };
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
  specials: string;
}

export interface PrintRoster {
  name: string;
  rows: RosterRow[];
  total: number;
  pvLimit?: number;
  /** Positive while under the limit, negative over it; absent with no limit (from the force totals). */
  room?: number;
  missing: number;
}

/** The group column of the roster: the group's name and its formation type, else the label typed before groups existed. */
function groupLabel(force: AsForce, member: AsMember): string {
  const group = groupsOf(force).find((g) => g.id === member.group);
  if (!group) return member.formation?.trim() ?? "";
  const type = findFormation(group.formation)?.name;
  return [group.name.trim() || "Unnamed group", type].filter(Boolean).join(", ");
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
            formation: groupLabel(force, line.member),
            basePv: line.base,
            pv: line.adjusted,
            specials: formatSpecials(line.unit.card.specials),
          },
        ]
      : [],
  );
  return { name: force.name.trim() || "Unnamed force", rows, total: totals.total, pvLimit: force.pvLimit, room: totals.room, missing: totals.missing };
}

/** Cards in groups of nine, one group to a printed sheet. */
export function sheetsOf<T>(items: readonly T[], perSheet = 9): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += perSheet) out.push(items.slice(i, i + perSheet));
  return out;
}
