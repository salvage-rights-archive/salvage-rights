// The Alpha Strike unit as a card shows it, plus the player's own additions. Plain data; nothing here throws on text it does not
// understand: an unknown special is kept as typed (`raw`) and reported by `unitFindings`, never dropped.
import type { RulesLevel } from "../data/chassis";
import { AS_AEROSPACE_ROLES, AS_CITES, AS_EDITION, AS_GROUND_ROLES, AS_MOVE_MODES, AS_PLAY_SPECIAL_CODES, AS_SPECIAL_CODES, AS_UNIT_TYPES, ARTX_FAMILY, DEFAULT_SKILL } from "../data/alpha-strike";

/** 8" ground; 6" with mode "j" jump; vehicles carry their motive letter. */
export interface AsMove {
  inches: number;
  mode: string;
}

/** A damage value: a number, minimal damage (`0*`), or none (a dash on the card). */
export type AsDamage = { value: number; minimal?: true } | null;

/** One special ability as written on a card: `IF1` is code IF, values ["1"]; `TUR(2/2/1, IF1)` is code TUR, values ["2","2","1"], inner [IF1]. */
export interface AsSpecial {
  code: string;
  values: string[];
  /** Present when the special was written with brackets, even if nothing follows the values. */
  inner?: AsSpecial[];
  /** What was typed or read, so nothing is lost. */
  raw: string;
}

export interface AsCard {
  type: string;
  size: number;
  tmm: number | null;
  move: AsMove[];
  thrust?: number;
  role: string | null;
  pv: number;
  damage: { s: AsDamage; m: AsDamage; l: AsDamage; e?: AsDamage };
  ov: number;
  armor: number;
  structure: number;
  threshold?: number;
  specials: AsSpecial[];
}

export const AS_SOURCE_KINDS = ["manual", "file", "mordel", "mul-export", "scan", "converted"] as const;

/**
 * Where a unit came from. Every importer fills the same few fields, so a new source needs no change of shape: `credit` is who
 * made it (shown on the unit), `ref` the outside id (the Mordel unit id, the Master Unit List id, the Classic record id), `at`
 * when it was fetched, read or converted, `style` the card style of a scan, and `values` the card as it was fetched, kept so a
 * later edit can be compared with it. A unit saved without a source reads as manual.
 */
export interface AsSource {
  kind: (typeof AS_SOURCE_KINDS)[number];
  credit?: string;
  ref?: string;
  at?: string;
  style?: string;
  values?: AsCard;
  /** Set when the unit is a published design from a named source (the Master Unit List); it holds only while the card is still `values`. */
  official?: { book: string };
}

export interface AsUnit {
  schema: 1;
  kind: "as-unit";
  id: string;
  editionId: string;
  name: { chassis: string; model: string };
  card: AsCard;
  /** The player's skill for this unit when it is not in a force (0-7). */
  skill: number;
  rulesLevel?: RulesLevel;
  techBase?: "inner-sphere" | "clan" | "mixed";
  year?: number | null;
  era?: string;
  notes?: string;
  picture?: { dataUrl: string };
  source: AsSource;
}

/** A blank unit to start a form from. */
export function newAsUnit(id: string): AsUnit {
  const none = { value: 0 };
  return {
    schema: 1,
    kind: "as-unit",
    id,
    editionId: AS_EDITION.id,
    name: { chassis: "", model: "" },
    card: { type: "BM", size: 1, tmm: null, move: [], role: null, pv: 0, damage: { s: none, m: none, l: none }, ov: 0, armor: 0, structure: 0, specials: [] },
    skill: DEFAULT_SKILL,
    source: { kind: "manual" },
  };
}

// ---- Movement ------------------------------------------------------------------------------------------------------------

export type Parsed<T> = { ok: true; value: T } | { ok: false };

const MOVE_PART = /^(\d+)\s*(?:"|″|”|in|inch|inches)?\s*([A-Za-z]*)$/;

/** `8"/6"j` becomes two moves; the quote marks and spaces are optional, a blank text is no movement. */
export function parseMove(text: string): Parsed<AsMove[]> {
  const parts = text.split("/").map((p) => p.trim());
  if (parts.length === 1 && parts[0] === "") return { ok: true, value: [] };
  const move: AsMove[] = [];
  for (const part of parts) {
    const match = MOVE_PART.exec(part);
    if (!match) return { ok: false };
    move.push({ inches: Number(match[1]), mode: (match[2] ?? "").toLowerCase() });
  }
  return { ok: true, value: move };
}

export const formatMove = (move: AsMove[]): string => move.map((m) => `${String(m.inches)}"${m.mode}`).join("/");

// ---- Damage --------------------------------------------------------------------------------------------------------------

/** A number, `0*` for minimal damage, or a dash (or nothing) for none. */
export function parseDamage(text: string): Parsed<AsDamage> {
  const t = text.trim();
  if (t === "" || /^[-–—]$/.test(t)) return { ok: true, value: null };
  if (t === "0*") return { ok: true, value: { value: 0, minimal: true } };
  if (/^\d+$/.test(t)) return { ok: true, value: { value: Number(t) } };
  return { ok: false };
}

export const formatDamage = (d: AsDamage): string => (d === null ? "-" : d.minimal ? "0*" : String(d.value));

// ---- Special abilities ---------------------------------------------------------------------------------------------------

/** Splits on commas that are not inside brackets. */
function splitTop(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "(") depth += 1;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((p) => p.trim()).filter((p) => p !== "");
}

/** A code is known if it is on the Appendix list or is an artillery code. */
export const knownSpecial = (code: string): boolean => AS_SPECIAL_CODES.includes(code) || AS_PLAY_SPECIAL_CODES.includes(code) || ARTX_FAMILY.test(code);

// Longest code first, so BHJ2 wins over BHJ; the value marks that may follow a code start with a digit, a slash, a dash or a star.
const BY_LENGTH = [...AS_SPECIAL_CODES, ...AS_PLAY_SPECIAL_CODES].sort((a, b) => b.length - a.length);

/** Splits the head of a special into its code and the value text after it. */
function splitCode(head: string): { code: string; rest: string } {
  const upper = head.replace(/\s+/g, "").toUpperCase();
  for (const code of BY_LENGTH) {
    if (upper.startsWith(code) && /^(?:$|[0-9/*-])/.test(upper.slice(code.length))) return { code, rest: upper.slice(code.length) };
  }
  const letters = /^[A-Z0-9]*/.exec(upper)?.[0] ?? "";
  if (ARTX_FAMILY.test(letters)) return { code: letters, rest: upper.slice(letters.length) };
  const plain = /^[A-Z]*/.exec(upper)?.[0] ?? "";
  return { code: plain, rest: upper.slice(plain.length) };
}

const valuesOf = (text: string): string[] => (text === "" ? [] : text.split("/"));

function parseOne(token: string): AsSpecial {
  const open = token.indexOf("(");
  const bracketed = open >= 0 && token.endsWith(")");
  const head = bracketed ? token.slice(0, open) : token;
  const { code, rest } = splitCode(head);
  // An artillery code is written with a dash before its number (ARTX-#): the dash is not a value.
  const values = valuesOf(ARTX_FAMILY.test(code) && rest.startsWith("-") ? rest.slice(1) : rest);
  if (!bracketed) return { code, values, raw: token };
  const inner: AsSpecial[] = [];
  for (const item of splitTop(token.slice(open + 1, -1))) {
    if (/^[A-Za-z]/.test(item)) inner.push(parseOne(item));
    else values.push(...valuesOf(item));
  }
  return { code, values, inner, raw: token };
}

/** `IF1, CASE, LRM1/1/0, TUR(2/2/1, IF1)` becomes four specials. An unknown code is kept. */
export function parseSpecials(text: string): AsSpecial[] {
  return splitTop(text).map(parseOne);
}

export function formatSpecial(s: AsSpecial): string {
  if (s.code === "") return s.raw;
  const joined = s.values.join("/");
  if (s.inner === undefined) return `${s.code}${ARTX_FAMILY.test(s.code) && joined ? "-" : ""}${joined}`;
  return `${s.code}(${[joined, ...s.inner.map(formatSpecial)].filter((p) => p !== "").join(", ")})`;
}

export const formatSpecials = (specials: AsSpecial[]): string => specials.map(formatSpecial).join(", ");

// ---- Findings ------------------------------------------------------------------------------------------------------------

export interface AsFinding {
  id: string;
  text: string;
  /** Book and printed page. */
  cite: string;
}

const book = `${AS_EDITION.name} (${AS_EDITION.publisher})`;
const page = (n: number | string) => `${book}, p. ${String(n)}`;

function codesIn(specials: AsSpecial[]): string[] {
  return specials.flatMap((s) => [s.code === "" ? s.raw : s.code, ...codesIn(s.inner ?? [])]);
}

/** What on a unit the book's lists do not recognise: advice, never a refusal to save. */
export function unitFindings(unit: AsUnit): AsFinding[] {
  const { card } = unit;
  const out: AsFinding[] = [];
  const type = AS_UNIT_TYPES.find((t) => t.code === card.type);
  if (!type) out.push({ id: "type", text: `We do not know the type code "${card.type}".`, cite: page(AS_CITES.types.page) });
  if (card.role !== null) {
    const ground = AS_GROUND_ROLES.includes(card.role);
    if (!ground && !AS_AEROSPACE_ROLES.includes(card.role)) out.push({ id: "role", text: `We do not know the role "${card.role}".`, cite: page("112-114") });
    else if (type && ground === type.aerospace) out.push({ id: "role-kind", text: `"${card.role}" is a ${ground ? "ground" : "aerospace"} role, and ${type.code} is an ${type.aerospace ? "aerospace" : "ground"} type.`, cite: page("112-114") });
  }
  for (const code of codesIn(card.specials)) {
    if (!knownSpecial(code)) out.push({ id: `special-${code}`, text: `We do not know the special ability "${code}". It is kept as written.`, cite: page(AS_CITES.specials.page) });
  }
  for (const move of card.move) {
    if (move.mode !== "" && !AS_MOVE_MODES.includes(move.mode)) out.push({ id: `mode-${move.mode}`, text: `We do not know the movement letter "${move.mode}".`, cite: page("27-28") });
  }
  if (type && !type.heat && card.ov > 0) out.push({ id: "heat", text: `${type.name} units do not track heat, but this one has an Overheat Value of ${String(card.ov)}.`, cite: page(AS_CITES.types.page) });
  return out;
}

export const unitTitle = (unit: AsUnit): string => `${unit.name.chassis} ${unit.name.model}`.trim();
