// Converting a Classic 'Mech to an Alpha Strike card, part one: unit type, size class, movement (jump and TMM), armor and structure,
// for BattleMechs, IndustrialMechs and OmniMech configurations. Pure functions over the record and the catalog; nothing throws on a
// record it does not understand. Each step returns its value (null when the book gives none), the working that shows how it was
// reached (our own short wording and the page) and its findings: a part our record holds that the book has no value for is a finding,
// never a guess. The tables are in data/as-convert.ts. Part two adds each weapon's damage at Short, Medium, Long and Extreme and their
// sums. Part three (the end of this file) adds the heat steps: heat output, dissipation, heat-modified damage, the final whole-number
// damage values, the Overheat Value and the Long-range check for the OVL ability, and `convertMech`, which runs all three parts.
// Specials, role and Point Value are later pieces.
import { ARMOR, ENGINE_TYPES, HEAT_SINKS, STRUCTURE_TYPES } from "../data/chassis";
import {
  AES_ARM_IDS,
  ARMOR_DIVISOR,
  ARMOR_RULES,
  ARTILLERY_CANNON_ROWS,
  ASC_PAGES,
  AS_WEAPON_TABLE,
  DISSIPATION_ITEMS,
  ENGINE_MAPPING,
  FIRE_CONTROL,
  HEAT_ITEMS_NOT_IN_BOOK,
  HEAT_PAGES,
  HEAT_RULES,
  HEAT_SINK_DISSIPATION,
  HEAT_SPECIAL,
  LARGE_ENGINE_OVER,
  MECH_SIZE_CLASSES,
  MOVE,
  MOVEMENT_HEAT,
  MOVE_EQUIPMENT,
  STRUCTURE_RULES,
  STRUCTURE_TABLE,
  TARGETING_COMPUTER_IDS,
  TMM_ROWS,
  TYPE_OF_MECH,
  WEAPONS_IGNORED,
  WEAPONS_NOT_ADDED,
  WEAPON_ATTACHMENTS,
  WEAPON_PAGES,
  WEAPON_ROW_OF,
  WEAPON_RULES,
} from "../data/as-convert";
import type { AsWeaponRow, AscCite, DamageValue } from "../data/as-convert";
import { newAsUnit } from "./as-unit";
import type { AsCard, AsDamage, AsMove, AsUnit } from "./as-unit";
import type { Catalog } from "./catalog";
import { mechTypeOf, walkMP } from "./mech";
import type { MechRecord } from "./mech";
import { armorPoints, equipmentItems, jumpMP, mascOf, movementPenalty, own, roundHalfUp, stemOf, tidy } from "./walk";
import type { Item } from "./walk";

/** One line of how a value was reached: which rule, the figures it used, and the page. */
export interface Working {
  step: "type" | "size" | "movement" | "tmm" | "armor" | "structure" | "weapons" | "heat" | "damage" | "overheat" | "special" | "role" | "points";
  rule: string;
  detail: string;
  cite: AscCite;
}

/** A part of the record the book has no conversion for (or a figure it does not settle). Our own wording. */
export interface Finding {
  code: string;
  /** What in the record it is about, as the player knows it. */
  part: string;
  message: string;
  cite?: AscCite;
}

export interface Step<T> {
  /** The converted figure, or null when it cannot be worked out (see `findings`). */
  value: T | null;
  working: Working[];
  findings: Finding[];
}

const done = <T>(value: T, working: Working[], findings: Finding[] = []): Step<T> => ({ value, working, findings });
const stuck = <T>(finding: Finding, working: Working[] = []): Step<T> => ({ value: null, working, findings: [finding] });

// ---- Unit type and size class ------------------------------------------------------------------------------------------------------

/** BM or IM (an OmniMech configuration is a BattleMech). */
export function convertType(record: MechRecord): Step<"BM" | "IM"> {
  const kind = mechTypeOf(record).id;
  const row = TYPE_OF_MECH.find((r) => r.unitType === kind);
  if (!row) return stuck({ code: "unit-type", part: kind, message: "The book has no Alpha Strike type for this kind of 'Mech." });
  return done(row.type, [{ step: "type", rule: "unit type by kind of 'Mech", detail: `${kind} is ${row.type}`, cite: row.cite }]);
}

export function convertSize(record: MechRecord): Step<number> {
  if (!(record.tons > 0)) return stuck({ code: "tons", part: "weight", message: "The weight is not a positive number of tons, so there is no size class.", cite: ASC_PAGES.size });
  const row = MECH_SIZE_CLASSES.find((r) => r.under === null || record.tons < r.under);
  if (!row) return stuck({ code: "tons", part: "weight", message: "No size class covers this weight.", cite: ASC_PAGES.size });
  return done(row.size, [{ step: "size", rule: "size class by weight", detail: `${String(record.tons)} tons is ${row.name}, size ${String(row.size)}`, cite: row.cite }]);
}

// ---- Movement and TMM --------------------------------------------------------------------------------------------------------------

/** The Target Movement Modifier of a ground Move in inches. */
export function tmmOf(inches: number): number {
  const row = TMM_ROWS.find((r) => inches >= r.from && (r.to === null || inches <= r.to));
  return row ? row.tmm : 0;
}

export interface MovementResult {
  move: AsMove[];
  /** From the ground Move (a 'Mech's untyped, non-jumping movement). */
  tmm: number;
  /** The special the jump mode's TMM earns against the ground TMM (JMPS stronger, JMPW weaker), for the specials piece. */
  jumpSpecial?: { code: "JMPS" | "JMPW"; value: number };
  /** The same for an underwater mode that is stronger than the ground TMM. */
  submersibleSpecial?: { code: "SUBS"; value: number };
}

const NO_ALPHA_MOVE = ["lam", "bimodal-lam"];

/** The Jumping MP the card's jump Move comes from: the jump jets less a shield's penalty, none when a large shield forbids jumping. */
const jumpMPOf = (items: Item[], penalty: ReturnType<typeof movementPenalty>) => (penalty.noJump ? 0 : Math.max(0, jumpMP(items) - penalty.jump));

export function convertMovement(record: MechRecord, catalog: Catalog): Step<MovementResult> {
  const working: Working[] = [];
  const findings: Finding[] = [];
  const fail = (finding: Finding): Step<MovementResult> => ({ value: null, working, findings: [...findings, finding] });

  if (NO_ALPHA_MOVE.includes(record.configuration)) {
    return fail({ code: "lam-movement", part: "Land-Air 'Mech", message: "The book gives no Move for a Land-Air 'Mech's AirMech and fighter modes in these pages.", cite: ASC_PAGES.move });
  }
  const walk = walkMP(record);
  if (walk === null) return fail({ code: "walk-mp", part: "engine", message: "The engine rating does not divide into whole Walking MP for this weight.", cite: ASC_PAGES.move });

  const { items, unknown } = equipmentItems(record, catalog);
  if (unknown.length > 0) {
    findings.push({ code: "unknown-mount", part: unknown.map((m) => m.name).join(", "), message: "Our catalog does not know these items, so any movement equipment among them is not counted." });
  }
  const penalty = movementPenalty(record, catalog);
  const hardened = record.chassis.armorType === "hardened" ? MOVE.hardenedArmorMP.value : 0;
  const penaltyMP = penalty.walk + hardened;
  const effective = Math.max(0, walk - penaltyMP);
  working.push({
    step: "movement",
    rule: penaltyMP > 0 ? "Walking MP less the permanent penalty, 2 inches each" : "Walking MP, 2 inches each",
    detail: penaltyMP > 0 ? `${String(walk)} - ${String(penaltyMP)} = ${String(effective)} MP, ${String(effective * MOVE.inchesPerMP.value)} in` : `${String(walk)} MP, ${String(effective * MOVE.inchesPerMP.value)} in`,
    cite: penaltyMP > 0 ? ASC_PAGES.penalties : MOVE.inchesPerMP.cite,
  });

  const masc = mascOf(record, items);
  const boosts = (masc.mounts.length > 0 ? 1 : 0) + (items.some((i) => MOVE_EQUIPMENT.supercharger.includes(stemOf(i.row.id))) ? 1 : 0);
  if (boosts > 0 && penaltyMP > 0) {
    return fail({
      code: "penalty-with-boost",
      part: "MASC or supercharger with a Move penalty",
      message: "The book's text puts the Move penalty both before the conversion and after the boost; we do not pick one for this unit.",
      cite: ASC_PAGES.penalties,
    });
  }

  let ground = effective * MOVE.inchesPerMP.value;
  if (boosts > 0) {
    const factor = boosts === 2 ? MOVE.boost.both : MOVE.boost.one;
    const boosted = roundHalfUp(ground * factor);
    working.push({ step: "movement", rule: boosts === 2 ? "MASC and supercharger together" : "MASC or supercharger", detail: `${String(ground)} x ${String(factor)} = ${String(boosted)} in`, cite: MOVE.boost.cite });
    ground = boosted;
  }
  const step = MOVE.roundUpTo.value;
  const rounded = Math.ceil(ground / step) * step;
  if (rounded !== ground) working.push({ step: "movement", rule: "Move rounds up to the next 2 inches", detail: `${String(ground)} to ${String(rounded)} in`, cite: MOVE.roundUpTo.cite });
  ground = rounded;

  const unconverted = items.filter((i) => MOVE_EQUIPMENT.unconverted.includes(stemOf(i.row.id)));
  if (unconverted.length > 0) {
    return fail({
      code: "jump-equipment",
      part: unconverted.map((i) => i.mount.name).join(", "),
      message: "The book counts jump jets only; it gives no Move for this jump equipment.",
      cite: ASC_PAGES.jump,
    });
  }

  const jumpMPs = jumpMPOf(items, penalty);
  const umuMPs = items.filter((i) => MOVE_EQUIPMENT.umu.includes(stemOf(i.row.id))).length;
  const jump = jumpMPs * MOVE.inchesPerMP.value;
  const umu = umuMPs * MOVE.inchesPerMP.value;

  const move: AsMove[] = [];
  if (jump > 0 && jump === ground) {
    move.push({ inches: ground, mode: MOVE.modes.jump });
    working.push({ step: "movement", rule: "jump equal to ground Move: one entry with the jump letter", detail: `${String(ground)}"j`, cite: ASC_PAGES.jump });
  } else {
    move.push({ inches: ground, mode: MOVE.modes.ground });
    if (jump > 0) {
      move.push({ inches: jump, mode: MOVE.modes.jump });
      working.push({ step: "movement", rule: "jump listed after the ground Move", detail: `${String(jumpMPs)} jump MP, ${String(jump)}"j`, cite: ASC_PAGES.jump });
    }
  }
  if (umu > 0) {
    move.push({ inches: umu, mode: MOVE.modes.umu });
    working.push({ step: "movement", rule: "underwater maneuvering units listed last", detail: `${String(umuMPs)} MP, ${String(umu)}"s`, cite: ASC_PAGES.jump });
  }

  const tmm = tmmOf(ground);
  working.push({ step: "tmm", rule: "TMM from the ground Move", detail: `${String(ground)} in gives +${String(tmm)}`, cite: ASC_PAGES.tmm });
  const result: MovementResult = { move, tmm };
  if (jump > 0 && jump !== ground) {
    const delta = tmmOf(jump) - tmm;
    if (delta !== 0) {
      result.jumpSpecial = { code: delta > 0 ? "JMPS" : "JMPW", value: Math.abs(delta) };
      working.push({ step: "tmm", rule: "jump TMM against the ground TMM", detail: `+${String(tmmOf(jump))} against +${String(tmm)}: ${result.jumpSpecial.code}${String(Math.abs(delta))}`, cite: ASC_PAGES.tmm });
    }
  }
  if (umu > 0 && umu !== ground) {
    const delta = tmmOf(umu) - tmm;
    if (delta > 0) {
      result.submersibleSpecial = { code: "SUBS", value: delta };
      working.push({ step: "tmm", rule: "underwater TMM against the ground TMM", detail: `+${String(tmmOf(umu))} against +${String(tmm)}: SUBS${String(delta)}`, cite: ASC_PAGES.tmm });
    } else if (delta < 0) {
      findings.push({ code: "weak-submersible", part: "underwater movement", message: "The errata's rule for a weaker underwater TMM names the jump mode by mistake, so we do not pick the special.", cite: ASC_PAGES.tmm });
    }
  }
  return { value: result, working, findings };
}

// ---- Armor -------------------------------------------------------------------------------------------------------------------------------

export function convertArmor(record: MechRecord): Step<number> {
  const type = record.chassis.armorType;
  const rule = ARMOR_RULES.find((r) => r.armorType === type);
  if (!rule) return stuck({ code: "armor-type", part: own(ARMOR.types, type)?.name ?? type, message: "The book has no conversion rule for this armor type.", cite: ASC_PAGES.armorSpecial });
  const factor = armorPoints(record);
  const working: Working[] = [{ step: "armor", rule: "armor factor: every armor point, front and rear", detail: String(factor), cite: ASC_PAGES.armor }];
  let adjusted = tidy(factor * rule.multiplier);
  if (rule.round === "up") adjusted = Math.ceil(adjusted);
  else if (rule.round === "normal") adjusted = roundHalfUp(adjusted);
  if (rule.multiplier !== 1) {
    working.push({ step: "armor", rule: `${own(ARMOR.types, type)?.name ?? type} armor changes the factor${rule.round === "none" ? "" : rule.round === "up" ? ", rounded up" : ", rounded normally"}`, detail: `${String(factor)} x ${String(rule.multiplier)} = ${String(adjusted)}`, cite: rule.cite });
  }
  const value = roundHalfUp(adjusted / ARMOR_DIVISOR.value);
  working.push({ step: "armor", rule: "divide by 30, round normally", detail: `${String(adjusted)} / 30 = ${String(value)}`, cite: ARMOR_DIVISOR.cite });
  return done(value, working);
}

// ---- Structure ---------------------------------------------------------------------------------------------------------------------------

export function convertStructure(record: MechRecord): Step<number> {
  const engine = record.chassis.engine;
  const mapping = ENGINE_MAPPING.find((m) => m.engineType === engine.type);
  const engineName = own(ENGINE_TYPES.types, engine.type)?.name ?? engine.type;
  const fail = <T>(message: string, code = "engine-structure"): Step<T> => stuck({ code, part: `${engineName} engine, ${String(record.tons)} tons`, message, cite: ASC_PAGES.structureTable });
  if (!mapping) return fail("The book's structure table names no row for this engine type.");
  if (!(record.tons > 0)) return fail("The weight is not a positive number of tons.", "tons");

  const superheavy = record.tons > STRUCTURE_TABLE.standardTons.to;
  const large = engine.rating > LARGE_ENGINE_OVER;
  let kind: (typeof STRUCTURE_TABLE.rows)[number]["kind"] = mapping.kind;
  if (large) {
    if (mapping.kind === "standard") kind = "large";
    else if (mapping.kind === "xl") kind = "large-xl";
    else if (mapping.kind === "xxl") kind = "large-xxl";
    else if (mapping.kind === "light" && superheavy) kind = "xl";
    else return fail("The table has no row for a large engine of this type at this weight.");
  }
  // The standard row is the same in both bases; the large row exists for the Inner Sphere only.
  if (large && mapping.tech === "any" && record.techBase === "clan") return fail("The table has no Clan row for a large engine of this type.");
  const tech = mapping.tech === "any" ? (large || record.techBase !== "clan" ? "inner-sphere" : "clan") : mapping.tech;
  const row = STRUCTURE_TABLE.rows.find((r) => r.tech === tech && r.kind === kind);
  if (!row) return fail("The table has no row for this engine in this technology base.");

  const range = superheavy ? STRUCTURE_TABLE.superheavyTons : STRUCTURE_TABLE.standardTons;
  const column = (record.tons - range.from) / range.step;
  const base = Number.isInteger(column) ? (superheavy ? row.superheavy : row.standard)[column] : undefined;
  if (base === undefined) return fail("The table has no column for this weight.", "tons");

  const working: Working[] = [{ step: "structure", rule: "structure by engine and weight", detail: `${engineName}${large ? " (large)" : ""}, ${String(record.tons)} tons: ${String(base)}`, cite: row.cite }];
  if (mapping.note) working[0] = { ...working[0]!, detail: `${working[0]!.detail} (${mapping.note})` };

  const type = record.chassis.structure;
  if (own(STRUCTURE_TYPES.types, type) === undefined) return stuck({ code: "structure-type", part: type, message: "Our tables do not know this structure type, so the special-structure rules cannot be checked.", cite: ASC_PAGES.structureSpecial }, working);
  const rule = STRUCTURE_RULES.find((r) => r.structure === type);
  let value = base;
  if (rule) {
    value = Math.ceil(tidy(base * rule.multiplier));
    working.push({ step: "structure", rule: `${own(STRUCTURE_TYPES.types, type)?.name ?? type} structure changes the value, rounded up`, detail: `${String(base)} x ${String(rule.multiplier)} = ${String(value)}`, cite: rule.cite });
  }
  return done(value, working);
}

// ---- All of part one -----------------------------------------------------------------------------------------------------------------------

export type BodyFields = Pick<AsCard, "type" | "size" | "tmm" | "move" | "armor" | "structure">;

export interface BodyConversion {
  /** The fields part one could work out; a field is absent when its step has a finding. */
  card: Partial<BodyFields>;
  jumpSpecial?: MovementResult["jumpSpecial"];
  submersibleSpecial?: MovementResult["submersibleSpecial"];
  working: Working[];
  findings: Finding[];
}

/** Type, size, movement, TMM, armor and structure of a BattleMech, IndustrialMech or OmniMech configuration. */
export function convertBody(record: MechRecord, catalog: Catalog): BodyConversion {
  if (record.omni?.isBase === true) {
    return { card: {}, working: [], findings: [{ code: "omni-base", part: "OmniMech base chassis", message: "A base chassis with no pods is not a unit; convert one of its configurations." }] };
  }
  const type = convertType(record);
  const size = convertSize(record);
  const movement = convertMovement(record, catalog);
  const armor = convertArmor(record);
  const structure = convertStructure(record);
  const card: Partial<BodyFields> = {};
  if (type.value !== null) card.type = type.value;
  if (size.value !== null) card.size = size.value;
  if (movement.value !== null) {
    card.move = movement.value.move;
    card.tmm = movement.value.tmm;
  }
  if (armor.value !== null) card.armor = armor.value;
  if (structure.value !== null) card.structure = structure.value;
  const out: BodyConversion = {
    card,
    working: [type, size, movement, armor, structure].flatMap((s) => s.working),
    findings: [type, size, movement, armor, structure].flatMap((s) => s.findings),
  };
  if (movement.value?.jumpSpecial) out.jumpSpecial = movement.value.jumpSpecial;
  if (movement.value?.submersibleSpecial) out.submersibleSpecial = movement.value.submersibleSpecial;
  return out;
}

// ---- Part two: weapon damage by range ----------------------------------------------------------------------------------------------

export interface RangeSet {
  short: number;
  medium: number;
  long: number;
  extreme: number;
}
const AES_ARMS = ["LA", "RA"];
const RANGES = ["short", "medium", "long", "extreme"] as const;
const RANGE_LABEL: Record<(typeof RANGES)[number], string> = { short: "Short", medium: "Medium", long: "Long", extreme: "Extreme" };
const zero = (): RangeSet => ({ short: 0, medium: 0, long: 0, extreme: 0 });
const fmt = (x: number) => String(tidy(x));
const rangesText = (v: RangeSet) => `${fmt(v.short)}/${fmt(v.medium)}/${fmt(v.long)}/${fmt(v.extreme)}`;

/** One weapon of the unit as it counts toward the attack values. */
export interface WeaponLine {
  mountId: string;
  name: string;
  /** The table row used: "Clan: Gauss Rifle". */
  tableRow: string;
  rear: boolean;
  /** The row's damage at each range for this weapon's fire control, before the multipliers. */
  base: RangeSet;
  /** The multipliers that applied: ammunition, targeting computer, actuator enhancement. */
  factors: { label: string; factor: number }[];
  /** The weapon's damage at each range: `base` times every factor, not rounded. */
  damage: RangeSet;
  /** The heat it adds to the unit's heat output: the table's heat, or 0 for a rocket launcher or a one-shot launcher (errata v1.3, p. 115). */
  heat: number;
  /** The table row's Notes ("AC", "LRM", "Indirect Fire", "Heat" and the rest): which special abilities it feeds. */
  notes: string[];
  /** The damage with no Artemis or Apollo (the left-most value of a missile row), for the abilities that use it (pp. 125-126, 131). */
  plain: RangeSet;
  cite: AscCite;
}

export interface WeaponDamage {
  /** The weapons that make up the sums: the forward ones, or the rear ones where they deliver more at every range (p. 100). */
  arc: "front" | "rear";
  lines: WeaponLine[];
  /** Every weapon that has a table row, forward and rear: the heat step needs both arcs. */
  all: WeaponLine[];
  /** The damage subtotal at each range: the sum of the lines, not rounded (errata v1.6, p. 101). Extreme is for aerospace and is not on a 'Mech's card. */
  subtotal: RangeSet;
  /** The subtotal rounded up to the next tenth: the heat-modified damage of a unit that has no heat reduction. The heat step (CONV-3) replaces
   * it where the unit does reduce; the final whole numbers and the 0* of Minimal Damage come after that step too. */
  roundedUp: RangeSet;
}

/** The figure of a table cell for a fire-control level (0 none, 1 Artemis IV or Apollo, 2 Artemis V); null where the row has no such value. */
function cell(value: DamageValue, level: number): number | null {
  if (value === null) return 0;
  if (typeof value === "number") return level === 0 ? value : null;
  return value[level] ?? null;
}

const upToTenth = (x: number) => tidy(Math.ceil(tidy(x * 10)) / 10);

const TABLE = new Map<string, AsWeaponRow>(AS_WEAPON_TABLE.map((r) => [`${r.tech}/${r.name}`, r]));
const ROW_OF = new Map(WEAPON_ROW_OF.map((r) => [r.id, r]));
const NOT_ADDED = new Map(WEAPONS_NOT_ADDED.flatMap((g) => g.ids.map((id) => [id, g] as const)));
const MML_ID = /^mml-(\d+)-(is|clan)$/;

/** The ammunition rows that feed a weapon (our catalog's ids): the standard bins, the half-ton bins, and the LB-X cluster rounds. */
function ammoIdsFor(weaponId: string): string[] {
  const tech = /-(is|clan)$/.exec(weaponId)?.[1] ?? "is";
  const stem = stemOf(weaponId).replace(/-lsw$/, "");
  const lb = /^lb-(\d+)-x-ac$/.exec(stem);
  if (lb) return [`ammo-lb-${lb[1]}-x-${tech}`, `ammo-lb-${lb[1]}-x-cluster-${tech}`];
  return [`ammo-${stem}-${tech}`, `ammo-${stem}-half-${tech}`];
}

const shotsOf = (item: Item): number | undefined => item.row.shots ?? (item.row.shotsPerTon === undefined ? undefined : item.row.shotsPerTon * (item.tons ?? 1));

/** Every weapon of the unit with its damage at each range, summed per range. A weapon the book or our catalog cannot place is a finding and
 * leaves the value null: a sum without it would be a guess. */
export function convertWeapons(record: MechRecord, catalog: Catalog): Step<WeaponDamage> {
  const working: Working[] = [];
  const findings: Finding[] = [];
  const blockers: Finding[] = [];
  const block = (finding: Finding) => {
    blockers.push(finding);
  };
  const result = (value: WeaponDamage | null): Step<WeaponDamage> => ({ value: blockers.length > 0 ? null : value, working, findings: [...blockers, ...findings] });
  if (record.omni?.isBase === true) {
    block({ code: "omni-base", part: "OmniMech base chassis", message: "A base chassis with no pods is not a unit; convert one of its configurations." });
    return result(null);
  }

  const { items, unknown } = equipmentItems(record, catalog);
  for (const mount of unknown) {
    block({ code: "unknown-mount", part: mount.name, message: "Our catalog does not know this item, so we cannot tell whether it is a weapon and cannot count its damage.", cite: WEAPON_PAGES.other });
  }

  // 1. Which items are weapons, and which row of the table each one uses.
  interface Candidate {
    item: Item;
    row: AsWeaponRow;
    level: number;
    fireControl?: string;
    attachment?: string;
  }
  const weapons: Candidate[] = [];
  for (const item of items) {
    if (item.row.kind !== "weapon") continue;
    const id = item.row.id;
    const notAdded = NOT_ADDED.get(id);
    if (notAdded) {
      working.push({ step: "weapons", rule: `${item.mount.name} is not added to the attack values`, detail: `it belongs to ${notAdded.ability}`, cite: notAdded.cite });
      continue;
    }
    if (WEAPONS_IGNORED.includes(id)) {
      working.push({ step: "weapons", rule: `${item.mount.name} has no damage and no ability in the book`, detail: "an item the tables do not list and no other rule accounts for is ignored", cite: WEAPON_PAGES.other });
      continue;
    }
    const entry = ROW_OF.get(id);
    const row = entry && TABLE.get(`${entry.tech}/${entry.name}`);
    if (!row) {
      block({ code: "no-table-row", part: item.mount.name, message: "The book's weapon tables for a 'Mech list no row we can match to this weapon, so its damage cannot be placed.", cite: WEAPON_PAGES.tablesIntro });
      continue;
    }
    weapons.push({ item, row, level: 0 });
  }

  // 2. Items that sit beside a weapon: a PPC capacitor or laser pulse module changes its row; Artemis or Apollo changes its level.
  const hostFor = (mount: Item["mount"], fits: (c: Candidate) => boolean, taken: Set<string>): Candidate | "ambiguous" | undefined => {
    const linked = weapons.find((c) => c.item.mount.id === mount.linkedTo);
    if (linked) return linked;
    const near = weapons.filter((c) => c.item.mount.location === mount.location && fits(c) && !taken.has(c.item.mount.id));
    if (near.length === 0) return undefined;
    return near.every((c) => c.item.row.id === near[0]!.item.row.id) ? near[0] : "ambiguous";
  };
  const taken = new Set<string>();
  for (const item of items) {
    const attachment = WEAPON_ATTACHMENTS.find((a) => a.itemIds.includes(item.row.id));
    if (!attachment) continue;
    const host = hostFor(item.mount, (c) => attachment.hosts.includes(c.row.name), taken);
    if (host === "ambiguous") block({ code: "attachment-host", part: item.mount.name, message: "More than one different weapon in its location could be its host, so we cannot tell which row of the table it changes.", cite: WEAPON_PAGES.tablesIntro });
    else if (host === undefined || !attachment.hosts.includes(host.row.name)) findings.push({ code: "attachment-alone", part: item.mount.name, message: "No weapon it works with is linked to it or in its location, so it changes nothing here.", cite: WEAPON_PAGES.tablesIntro });
    else {
      const next = TABLE.get(`${host.row.tech}/${host.row.name}${attachment.suffix}`);
      if (!next) block({ code: "no-table-row", part: `${host.item.mount.name} with ${item.mount.name}`, message: "The book's tables have no row for this weapon with this attachment.", cite: WEAPON_PAGES.tablesIntro });
      else {
        taken.add(host.item.mount.id);
        working.push({ step: "weapons", rule: `${item.mount.name} changes the row of ${host.item.mount.name}`, detail: `${host.row.name} becomes ${next.name}`, cite: next.cite });
        host.row = next;
        host.attachment = item.mount.name;
      }
    }
  }
  const fcTaken = new Set<string>();
  for (const item of items) {
    const fc = own(FIRE_CONTROL, item.row.id);
    if (!fc) continue;
    const fits = (c: Candidate) => (fc.fits === "mrm" ? c.row.name.startsWith("MRM") : !c.row.name.startsWith("MRM") && Array.isArray(c.row.short));
    const host = hostFor(item.mount, fits, fcTaken);
    if (host === "ambiguous") block({ code: "fire-control-host", part: item.mount.name, message: "More than one different launcher in its location could be the one it serves, so we cannot tell which one gets the higher value.", cite: WEAPON_PAGES.missiles });
    else if (host === undefined || !fits(host)) findings.push({ code: "fire-control-alone", part: item.mount.name, message: "No launcher it serves is linked to it or in its location, so it changes nothing here.", cite: WEAPON_PAGES.missiles });
    else {
      const value = cell(host.row.short, fc.index);
      if (value === null) block({ code: "fire-control-value", part: `${host.item.mount.name} with ${item.mount.name}`, message: "The table gives this launcher no value for this fire-control system.", cite: host.row.cite });
      else {
        fcTaken.add(host.item.mount.id);
        host.level = fc.index;
        host.fireControl = item.mount.name;
      }
    }
  }

  // 3. Each weapon's table values and multipliers.
  const hasTc = items.some((i) => TARGETING_COMPUTER_IDS.includes(i.row.id));
  const aesArms = new Set(items.filter((i) => AES_ARM_IDS.includes(i.row.id)).map((i) => i.mount.location));
  const ammoItems = items.filter((i) => i.row.kind === "ammunition");
  const counted = new Map<string, number>();
  for (const c of weapons) counted.set(c.item.row.id, (counted.get(c.item.row.id) ?? 0) + 1);

  /** The multiplier the ammunition rule gives a weapon model (null when it cannot be told). */
  const ammoFactor = (c: Candidate): { factor: number; detail: string } | null => {
    const { row, item } = c;
    const needsAmmo = (row.section === "ballistic" || row.section === "missile") && !row.name.includes("Rocket Launcher");
    if (!needsAmmo) return { factor: 1, detail: "" };
    const id = item.row.id;
    const count = counted.get(id) ?? 1;
    const mml = MML_ID.exec(id);
    const feeders = (ids: string[]) => ammoItems.filter((a) => ids.includes(a.row.id));
    const known = (ids: string[]) => ids.some((x) => catalog.byId(x) !== undefined);
    const ids = mml ? [`ammo-mml-${mml[1]}-lrm-${mml[2]}`, `ammo-mml-${mml[1]}-srm-${mml[2]}`] : ammoIdsFor(id);
    if (!known(ids)) {
      block({ code: "no-ammunition-row", part: item.mount.name, message: "Our catalog has no ammunition row for this weapon, so we cannot count its shots for the ammunition rule.", cite: WEAPON_RULES.ammunition.cite });
      return null;
    }
    const sum = (list: Item[]): number | undefined => list.reduce<number | undefined>((s, a) => { const n = shotsOf(a); return s === undefined || n === undefined ? undefined : s + n; }, 0);
    let shots: number | undefined;
    let shotsText: string;
    if (mml) {
      const lrm = sum(feeders([ids[0]!]));
      const srm = sum(feeders([ids[1]!]));
      shots = lrm === undefined || srm === undefined ? undefined : Math.floor((lrm + srm) / 2);
      shotsText = `(${String(lrm)} + ${String(srm)}) / 2 rounded down = ${String(shots)} shots`;
    } else {
      shots = sum(feeders(ids));
      shotsText = `${String(shots)} shots`;
    }
    if (shots === undefined) {
      block({ code: "ammunition-shots", part: item.mount.name, message: "Our catalog gives no shot count for this weapon's ammunition, so the ammunition rule cannot be applied.", cite: WEAPON_RULES.ammunition.cite });
      return null;
    }
    const need = /^(Prototype )?Ultra/.test(row.name) ? WEAPON_RULES.ammunition.ultraShots : /^Rotary/.test(row.name) ? WEAPON_RULES.ammunition.rotaryShots : WEAPON_RULES.ammunition.shots;
    // A special munition (Artemis-capable, Inferno and the rest) shares the launcher's bins; the book gives no rule for assigning its shots.
    const family = /^(lrm|srm|mml)-/.exec(id)?.[1];
    const specials = family ? ammoItems.filter((a) => a.row.feeds?.includes(family as "lrm" | "srm" | "mml")) : [];
    if (specials.length > 0) {
      const perTon = mml ? Math.max(catalog.byId(ids[0]!)?.shotsPerTon ?? 0, catalog.byId(ids[1]!)?.shotsPerTon ?? 0) : (catalog.byId(ids[0]!)?.shotsPerTon ?? 0);
      const most = shots + specials.reduce((s, a) => s + perTon * (a.tons ?? 1) * (a.row.shotsFactor ?? 1), 0);
      if (shots / count < need !== most / count < need) {
        block({ code: "special-ammunition", part: item.mount.name, message: "The unit carries special munitions for this launcher, and how their shots are shared decides whether the ammunition rule applies; the book does not say, so we do not guess.", cite: WEAPON_RULES.ammunition.cite });
        return null;
      }
    }
    const per = shots / count;
    return per < need
      ? { factor: WEAPON_RULES.ammunition.multiplier, detail: `${shotsText} for ${String(count)} weapon${count === 1 ? "" : "s"} = ${fmt(per)} each, fewer than ${String(need)}` }
      : { factor: 1, detail: `${shotsText} for ${String(count)} weapon${count === 1 ? "" : "s"} = ${fmt(per)} each, ${String(need)} or more` };
  };

  const lines: WeaponLine[] = [];
  for (const c of weapons) {
    const { row, item } = c;
    const base = zero();
    let missing = false;
    for (const range of RANGES) {
      const v = cell(row[range], c.level);
      if (v === null) missing = true;
      else base[range] = v;
    }
    if (missing) {
      block({ code: "fire-control-value", part: item.mount.name, message: "The table gives this launcher no value for the fire-control system it carries.", cite: row.cite });
      continue;
    }
    const factors: WeaponLine["factors"] = [];
    const ammo = ammoFactor(c);
    if (ammo === null) continue;
    if (ammo.factor !== 1) factors.push({ label: "too few shots", factor: ammo.factor });
    if (hasTc && row.tc) factors.push({ label: "targeting computer", factor: WEAPON_RULES.targetingComputer.multiplier });
    if (aesArms.has(item.mount.location) && AES_ARMS.includes(item.mount.location as string)) factors.push({ label: "actuator enhancement system", factor: WEAPON_RULES.aes.multiplier });
    const damage = zero();
    for (const range of RANGES) damage[range] = tidy(factors.reduce((x, f) => x * f.factor, base[range]));
    const rear = item.mount.rear === true && !AES_ARMS.includes(item.mount.location as string);
    const tableRow = `${row.tech === "clan" ? "Clan" : "Inner Sphere"}: ${row.name}`;
    const noHeat = /\bOS\b/.test(item.row.type ?? "") || row.name.includes("Rocket Launcher");
    const plain = zero();
    for (const range of RANGES) plain[range] = tidy(factors.reduce((x, f) => x * f.factor, cell(row[range], 0) ?? base[range]));
    const line = { mountId: item.mount.id, name: item.mount.name, tableRow, rear, base, factors, damage, heat: noHeat ? 0 : row.heat, notes: row.notes, plain, cite: row.cite };
    lines.push(line);
    const parts = [`${rangesText(base)}${c.fireControl ? ` with ${c.fireControl}` : ""}`];
    for (const f of factors) parts.push(`x ${String(f.factor)} ${f.label}`);
    if (ammo.detail) parts.push(`(${ammo.detail})`);
    if (item.row.techBase !== record.techBase && record.techBase !== "mixed") parts.push("(a weapon of the other technology base: its own table)");
    working.push({
      step: "weapons",
      rule: `${item.mount.name}${rear ? " (rear)" : ""}: ${tableRow}${row.cite.errata ? " (errata v1.6)" : ""}`,
      detail: factors.length > 0 || ammo.detail ? `${parts.join(" ")} = ${rangesText(damage)}` : `${parts[0]!} (short/medium/long/extreme)`,
      cite: row.cite,
    });
  }

  // 4. Forward or rear weapons (p. 100), and the sums.
  const sum = (list: { damage: RangeSet }[]): RangeSet => {
    const total = zero();
    for (const l of list) for (const range of RANGES) total[range] = tidy(total[range] + l.damage[range]);
    return total;
  };
  const front = lines.filter((l) => !l.rear);
  const rearLines = lines.filter((l) => l.rear);
  const frontSum = sum(front);
  const rearSum = sum(rearLines);
  let arc: "front" | "rear" = "front";
  if (rearLines.length > 0) {
    const better = (["short", "medium", "long"] as const).map((r) => rearSum[r] > frontSum[r]);
    if (better.every(Boolean)) {
      arc = "rear";
      working.push({ step: "weapons", rule: "the rear weapons deliver more at every range, so they are used", detail: `${rangesText(rearSum)} against ${rangesText(frontSum)}`, cite: WEAPON_PAGES.arcs });
    } else {
      if (better.some(Boolean)) findings.push({ code: "rear-arc", part: "rear-facing weapons", message: "The rear weapons deliver more at some ranges and not others; the book does not say how to compare, so we used the forward weapons.", cite: WEAPON_PAGES.arcs });
      working.push({ step: "weapons", rule: "rear-facing weapons are not counted", detail: `${rangesText(frontSum)} forward; the rear ones may earn the rear-firing special`, cite: WEAPON_PAGES.arcs });
    }
  }
  const used = arc === "front" ? front : rearLines;
  const subtotal = arc === "front" ? frontSum : rearSum;
  const roundedUp = zero();
  for (const range of RANGES) {
    roundedUp[range] = upToTenth(subtotal[range]);
    working.push({ step: "weapons", rule: `damage subtotal at ${RANGE_LABEL[range]}, not rounded`, detail: `${String(used.length)} weapon${used.length === 1 ? "" : "s"}: ${fmt(subtotal[range])}`, cite: WEAPON_PAGES.tablesIntro });
  }
  working.push({ step: "weapons", rule: "without heat reduction the subtotal is rounded up to the next tenth", detail: rangesText(roundedUp), cite: WEAPON_RULES.roundUpTo.cite });
  return result({ arc, lines: used, all: lines, subtotal, roundedUp });
}

// ---- Part three: heat, heat-modified damage, final damage, Overheat Value ---------------------------------------------------------

const upWhole = (x: number) => Math.ceil(tidy(x));
const sumOf = (xs: number[]) => tidy(xs.reduce((a, b) => a + b, 0));

/** The heat a unit sheds in a turn: heat sinks of each kind, coolant pods, and the single-piece systems (errata v1.3, p. 115). */
export function convertDissipation(record: MechRecord, catalog: Catalog): Step<number> {
  const working: Working[] = [];
  const findings: Finding[] = [];
  const { type, count, extra } = record.chassis.heatSinks;
  let total = 0;
  for (const group of [{ type, count }, ...(extra ?? [])]) {
    const each = own(HEAT_SINK_DISSIPATION, group.type);
    const name = own(HEAT_SINKS.types, group.type)?.name ?? group.type;
    if (each === undefined) {
      return stuck({ code: "heat-sink-type", part: `${name} heat sinks`, message: "The book's Heat Dissipation Table has no entry for this kind of heat sink.", cite: HEAT_PAGES.dissipation }, working);
    }
    total += group.count * each;
    working.push({ step: "heat", rule: `${name} heat sinks, ${String(each)} each`, detail: `${String(group.count)} x ${String(each)} = ${String(group.count * each)}`, cite: HEAT_PAGES.dissipation });
  }
  const { items, unknown } = equipmentItems(record, catalog);
  if (unknown.length > 0) {
    findings.push({ code: "unknown-mount", part: unknown.map((m) => m.name).join(", "), message: "Our catalog does not know these items, so any heat dissipation among them is not counted.", cite: HEAT_PAGES.dissipation });
  }
  const pods = items.filter((i) => DISSIPATION_ITEMS.perPod.ids.includes(i.row.id)).length;
  if (pods > 0) {
    total += pods * DISSIPATION_ITEMS.perPod.each;
    working.push({ step: "heat", rule: "coolant pods, 1 each", detail: `${String(pods)} x ${String(DISSIPATION_ITEMS.perPod.each)} = ${String(pods * DISSIPATION_ITEMS.perPod.each)}`, cite: HEAT_PAGES.dissipation });
  }
  for (const once of DISSIPATION_ITEMS.once) {
    if (!items.some((i) => once.ids.includes(i.row.id))) continue;
    total += once.value;
    working.push({ step: "heat", rule: `${once.name}, counted once`, detail: `+${String(once.value)}`, cite: HEAT_PAGES.dissipation });
  }
  for (const item of items.filter((i) => HEAT_ITEMS_NOT_IN_BOOK.includes(i.row.id))) {
    findings.push({ code: "heat-item-not-in-book", part: item.mount.name, message: "The book's heat tables have no entry for this item, so it changes nothing here.", cite: HEAT_PAGES.dissipation });
  }
  working.push({ step: "heat", rule: "total heat dissipation", detail: String(total), cite: HEAT_PAGES.dissipation });
  return { value: total, working, findings };
}

export interface HeatOutput {
  /** The heat of firing everything, with the special cases and the most heat-intensive movement: for the Short and Medium brackets. */
  total: number;
  /** The same without the weapons that have no Long-range damage value: for the Long-range check. */
  long: number;
}

/** The heat a 'Mech adds for moving, from its jump jets and engine (errata v1.3, p. 115). */
export function convertMovementHeat(record: MechRecord, catalog: Catalog): Step<number> {
  const working: Working[] = [];
  const fail = (finding: Finding): Step<number> => stuck(finding, working);
  const type = convertType(record).value;
  if (type === null) return fail({ code: "unit-type", part: mechTypeOf(record).id, message: "The book has no Alpha Strike type for this kind of 'Mech, so its movement heat is not known.", cite: HEAT_PAGES.output });
  if (NO_ALPHA_MOVE.includes(record.configuration)) return fail({ code: "lam-movement", part: "Land-Air 'Mech", message: "The book gives no Move for a Land-Air 'Mech's AirMech and fighter modes, so its movement heat is not known.", cite: HEAT_PAGES.output });
  const { items } = equipmentItems(record, catalog);
  const unconverted = items.filter((i) => MOVE_EQUIPMENT.unconverted.includes(stemOf(i.row.id)));
  if (unconverted.length > 0) {
    return fail({ code: "jump-equipment", part: unconverted.map((i) => i.mount.name).join(", "), message: "The book counts jump jets only for the jumping Move, so the jumping heat of this unit is not known.", cite: ASC_PAGES.jump });
  }
  const jets = items.filter((i) => i.row.kind === "jump-jet");
  const improved = jets.filter((i) => MOVEMENT_HEAT.improvedJumpJets.includes(stemOf(i.row.id))).length;
  if (improved > 0 && improved < jets.length) {
    return fail({ code: "mixed-jump-jets", part: "improved and standard jump jets together", message: "The book says what improved jump jets do to jumping heat but not when only some of the jets are improved.", cite: HEAT_PAGES.output });
  }
  const jumpMPs = jumpMPOf(items, movementPenalty(record, catalog));
  const xxl = MOVEMENT_HEAT.xxlEngines.includes(record.chassis.engine.type);
  let heat: number;
  if (jumpMPs > 0) {
    // One heat per 2 inches of jumping Move is one per Jumping MP.
    const base = xxl ? Math.max(MOVEMENT_HEAT.xxlJumpMin, 2 * jumpMPs) : Math.max(MOVEMENT_HEAT.jumpMin, jumpMPs);
    heat = improved > 0 ? Math.max(MOVEMENT_HEAT.improvedMin, Math.ceil(base / 2)) : base;
    working.push({
      step: "heat",
      rule: `movement heat of jumping: ${xxl ? "2" : "1"} per 2 inches of jumping Move, at least ${String(xxl ? MOVEMENT_HEAT.xxlJumpMin : MOVEMENT_HEAT.jumpMin)}${xxl ? " (XXL engine)" : ""}${improved > 0 ? ", halved rounding up for improved jump jets, at least 3" : ""}`,
      detail: `${String(jumpMPs * 2)} in of jumping Move: ${String(heat)}`,
      cite: HEAT_PAGES.output,
    });
  } else {
    heat = xxl ? MOVEMENT_HEAT.xxlWalk : type === "BM" ? MOVEMENT_HEAT.walk : 0;
    working.push({
      step: "heat",
      rule: xxl ? "movement heat with an XXL engine and no jump jets" : type === "BM" ? "movement heat of a BattleMech without jump jets" : "an IndustrialMech without jump jets adds no movement heat",
      detail: String(heat),
      cite: HEAT_PAGES.output,
    });
  }
  return { value: heat, working, findings: [] };
}

/** Maximum heat output (errata v1.3, p. 115): every weapon fired, the special cases, and movement; and the Long-range variant of it. */
export function convertHeatOutput(record: MechRecord, catalog: Catalog, weapons: WeaponDamage): Step<HeatOutput> {
  const working: Working[] = [];
  const findings: Finding[] = [];
  const { items } = equipmentItems(record, catalog);
  /** One thing that fires: its heat, which way it faces, and whether it has a Long-range damage value. */
  interface Source {
    name: string;
    heat: number;
    rear: boolean;
    long: boolean;
  }
  const sources: Source[] = weapons.all.map((l) => ({ name: l.name, heat: l.heat, rear: l.rear, long: l.base.long > 0 }));
  let special = 0;
  let specialLong = 0;
  const addSpecial = (label: string, heat: number) => {
    special += heat;
    specialLong += heat;
    working.push({ step: "heat", rule: label, detail: `+${String(heat)}`, cite: HEAT_PAGES.special });
  };

  // Weapons the damage step leaves out still fire and make heat (artillery, one-shot launchers aside); anti-missile systems are a special case.
  for (const item of items) {
    const id = item.row.id;
    const heatOfItem = item.row.heat ?? 0;
    if (item.row.kind !== "weapon") {
      if (heatOfItem > 0 && !HEAT_ITEMS_NOT_IN_BOOK.includes(id)) {
        findings.push({ code: "item-heat", part: item.mount.name, message: "Our catalog gives this item a heat, but the book adds heat only for weapons and the special cases it lists, so we did not count it.", cite: HEAT_PAGES.output });
      }
      continue;
    }
    if (HEAT_SPECIAL.ams.ids.includes(id)) {
      addSpecial(`${item.mount.name}: anti-missile system`, HEAT_SPECIAL.ams.heat);
    } else if (id === HEAT_SPECIAL.lams.clan.id) {
      addSpecial(`${item.mount.name}: Clan laser anti-missile system`, HEAT_SPECIAL.lams.clan.heat);
    } else if (id === HEAT_SPECIAL.lams.inner.id) {
      addSpecial(`${item.mount.name}: Inner Sphere laser anti-missile system`, HEAT_SPECIAL.lams.inner.heat);
    } else if (NOT_ADDED.get(id)?.why === "melee") {
      if (heatOfItem > 0) findings.push({ code: "item-heat", part: item.mount.name, message: "Our catalog gives this melee item a heat, but the book's heat output counts weapons that fire, so we did not count it.", cite: HEAT_PAGES.output });
    } else if (NOT_ADDED.has(id) || WEAPONS_IGNORED.includes(id)) {
      if (/\bOS\b/.test(item.row.type ?? "")) {
        working.push({ step: "heat", rule: `${item.mount.name}: a one-shot launcher adds no heat`, detail: "+0", cite: HEAT_PAGES.special });
        continue;
      }
      const rowName = own(ARTILLERY_CANNON_ROWS, id);
      const tableRow = rowName === undefined ? undefined : TABLE.get(`is/${rowName}`);
      sources.push({ name: item.mount.name, heat: tableRow?.heat ?? heatOfItem, rear: item.mount.rear === true, long: tableRow !== undefined && (cell(tableRow.long, 0) ?? 0) > 0 });
    }
  }

  // Rear-facing weapons: count the arm that makes more heat (errata v1.3, p. 115).
  const heatOf = (list: Source[]) => {
    const front = sumOf(list.filter((s) => !s.rear).map((s) => s.heat));
    const rear = sumOf(list.filter((s) => s.rear).map((s) => s.heat));
    return { front, rear, used: Math.max(front, rear), arc: rear > front ? ("rear" as const) : ("front" as const) };
  };
  const all = heatOf(sources);
  const longOnly = heatOf(sources.filter((s) => s.long));
  const hasRear = sources.some((s) => s.rear);
  working.push({
    step: "heat",
    rule: hasRear ? `weapon heat: forward ${fmt(all.front)} against rear ${fmt(all.rear)}, the larger counts` : "heat of firing every weapon",
    detail: `${fmt(all.used)}${hasRear ? ` (${all.arc})` : ""}`,
    cite: HEAT_PAGES.output,
  });
  if (hasRear && all.arc !== weapons.arc) {
    findings.push({ code: "arc-mismatch", part: "rear-facing weapons", message: `The damage step used the ${weapons.arc} weapons and the heat rule counts the ${all.arc} weapons' heat; the two rules each say so, and the book does not say to match them.`, cite: HEAT_PAGES.output });
  }

  if (record.chassis.armorType === HEAT_SPECIAL.stealth.armorType || items.some((i) => HEAT_SPECIAL.stealth.ids.includes(i.row.id))) addSpecial("stealth armor or a stealth system, counted once", HEAT_SPECIAL.stealth.heat);
  if (items.some((i) => HEAT_SPECIAL.chameleon.ids.includes(i.row.id))) addSpecial("Chameleon Light Polarization Shield", HEAT_SPECIAL.chameleon.heat);

  const movement = convertMovementHeat(record, catalog);
  working.push(...movement.working);
  findings.push(...movement.findings);
  if (movement.value === null) return { value: null, working, findings };

  const total = tidy(all.used + special + movement.value);
  const long = tidy(longOnly.used + specialLong + movement.value);
  working.push({ step: "heat", rule: "maximum heat output (Short and Medium)", detail: `${fmt(all.used)} + ${fmt(special)} + ${fmt(movement.value)} movement = ${fmt(total)}`, cite: HEAT_PAGES.output });
  working.push({ step: "heat", rule: "Long-range heat output: weapons with no Long-range damage value left out", detail: `${fmt(longOnly.used)} + ${fmt(specialLong)} + ${fmt(movement.value)} movement = ${fmt(long)}`, cite: HEAT_PAGES.longCheck });
  return { value: { total, long }, working, findings };
}

/** What the heat-modified damage formula needs, and what the Long-range check decided. */
export interface HeatState {
  output: number;
  longOutput: number;
  dissipation: number;
  /** The unit makes more heat than it sheds plus 4, so the formula applies. */
  reduces: boolean;
  /** The unit qualifies for the Overheat Long ability, so its Long damage is reduced like Short and Medium. */
  ovl: boolean;
}

export type HeatRange = "short" | "medium" | "long" | "extreme";

/** The heat-modified damage of a subtotal at one bracket, rounded up to the tenth (errata v1.3, p. 115): the formula where the unit
 * reduces, otherwise the subtotal itself. Null where the errata gives no rule (Extreme on a unit that reduces). Special-ability damage
 * is heat-modified the same way (errata v1.6, p. 116), for the specials piece to use. */
export function heatModifiedDamage(subtotal: number, range: HeatRange, heat: HeatState): number | null {
  if (!heat.reduces) return upToTenth(subtotal);
  if (range === "extreme") return null;
  if (range === "long" && !heat.ovl) return upToTenth(subtotal);
  return upToTenth((subtotal * heat.dissipation) / (heat.output - HEAT_RULES.margin));
}

/** A heat-modified value to a card's final base damage: up to the next whole number, 0* for more than 0 and under 0.5, a dash for none. */
export function finalDamage(modified: number): AsDamage {
  if (modified <= 0) return null;
  if (modified < HEAT_RULES.minimalBelow) return { value: 0, minimal: true };
  return { value: upWhole(modified) };
}

/** Final damage of a special ability's sum of heat-modified damage values: rounded normally, not up (errata v1.3, p. 116). */
export function finalAbilityDamage(sumOfModified: number): AsDamage {
  if (sumOfModified <= 0) return null;
  if (sumOfModified < HEAT_RULES.minimalBelow) return { value: 0, minimal: true };
  return { value: roundHalfUp(sumOfModified) };
}

export interface HeatConversion {
  output: number;
  longOutput: number;
  dissipation: number;
  state: HeatState;
  /** The heat-modified damage of each bracket, up to the tenth. Extreme is absent where the book gives no rule for it. */
  modified: { short: number; medium: number; long: number; extreme?: number };
  /** The card's damage. Extreme is absent where the book gives no rule for it; a 'Mech's card does not print it. */
  final: { short: AsDamage; medium: AsDamage; long: AsDamage; extreme?: AsDamage };
  /** The Overheat Value, 0 to 4. */
  ov: number;
  /** The unit qualifies for the Overheat Long ability. */
  ovl: boolean;
}

/** Heat output, dissipation, heat-modified damage, final damage, the Overheat Value and the Long-range check for OVL. */
export function convertHeat(record: MechRecord, catalog: Catalog, weapons: Step<WeaponDamage> = convertWeapons(record, catalog)): Step<HeatConversion> {
  if (weapons.value === null) return stuck({ code: "heat-needs-damage", part: "weapon damage", message: "The heat step starts from the weapon damage subtotals, which have no value yet (see the weapon findings)." });
  const damage = weapons.value;
  const working: Working[] = [];
  const findings: Finding[] = [];
  const out = convertHeatOutput(record, catalog, damage);
  const diss = convertDissipation(record, catalog);
  working.push(...out.working, ...diss.working);
  findings.push(...out.findings, ...diss.findings);
  if (out.value === null || diss.value === null) return { value: null, working, findings };

  const sub = damage.subtotal;
  const D = diss.value;
  const margin = HEAT_RULES.margin;
  const state: HeatState = { output: out.value.total, longOutput: out.value.long, dissipation: D, reduces: out.value.total - margin > D, ovl: false };
  const stuckHere = (finding: Finding): Step<HeatConversion> => ({ value: null, working, findings: [...findings, finding] });
  const finish = (s: HeatState, m: HeatConversion["modified"], overheat: number, overheatLong: boolean): HeatConversion => {
    const final: HeatConversion["final"] = { short: finalDamage(m.short), medium: finalDamage(m.medium), long: finalDamage(m.long) };
    if (m.extreme !== undefined) final.extreme = finalDamage(m.extreme);
    const shown = (d: AsDamage) => (d === null ? "-" : d.minimal ? "0*" : String(d.value));
    working.push({
      step: "damage",
      rule: "final damage: heat-modified damage rounded up to the next whole number; more than 0 and under 0.5 is 0*; none is a dash",
      detail: `${fmt(m.short)}/${fmt(m.medium)}/${fmt(m.long)} gives ${shown(final.short)}/${shown(final.medium)}/${shown(final.long)}`,
      cite: HEAT_PAGES.final,
    });
    return { output: s.output, longOutput: s.longOutput, dissipation: s.dissipation, state: s, modified: m, final, ov: overheat, ovl: overheatLong };
  };

  if (!state.reduces) {
    working.push({ step: "damage", rule: "dissipation is at least the heat output minus 4: no reduction, each subtotal rounds up to the tenth", detail: `${fmt(D)} >= ${fmt(state.output)} - ${String(margin)}`, cite: HEAT_PAGES.modified });
    const modified = { short: heatModifiedDamage(sub.short, "short", state) ?? 0, medium: heatModifiedDamage(sub.medium, "medium", state) ?? 0, long: heatModifiedDamage(sub.long, "long", state) ?? 0, extreme: heatModifiedDamage(sub.extreme, "extreme", state) ?? 0 };
    working.push({ step: "overheat", rule: "no heat reduction: Overheat Value 0 and no OVL", detail: "0", cite: HEAT_PAGES.overheat });
    return { value: finish(state, modified, 0, false), working, findings };
  }

  working.push({ step: "damage", rule: "the unit makes more heat than it sheds plus 4: damage is heat-modified", detail: `${fmt(D)} < ${fmt(state.output)} - ${String(margin)}; each subtotal x ${fmt(D)} / ${fmt(state.output - margin)}`, cite: HEAT_PAGES.modified });
  const modifiedAt = (range: HeatRange) => heatModifiedDamage(sub[range], range, state) ?? 0;

  // The Overheat Value: how far the Medium bracket (Short if there is none) drops, in whole numbers, at most 4.
  const base: "medium" | "short" = sub.medium > 0 ? "medium" : "short";
  const before = upWhole(sub[base]);
  const afterFinal = finalDamage(modifiedAt(base));
  if (afterFinal?.minimal) {
    return stuckHere({ code: "ov-minimal", part: "Overheat Value", message: "The heat-modified damage used for the Overheat Value is minimal damage (0*); the book does not say how that counts against the whole number, so we leave the Overheat Value unset.", cite: HEAT_PAGES.overheat });
  }
  const after = afterFinal === null ? 0 : afterFinal.value;
  const ov = Math.min(HEAT_RULES.overheatMax, Math.max(0, before - after));
  working.push({
    step: "overheat",
    rule: `Overheat Value: how far ${base} damage drops, at most ${String(HEAT_RULES.overheatMax)}${base === "short" ? " (no Medium damage, so Short is used)" : ""}`,
    detail: `${String(before)} (rounded up) - ${String(after)} (heat-modified, rounded up) = ${String(before - after)}${before - after > HEAT_RULES.overheatMax ? `, capped at ${String(HEAT_RULES.overheatMax)}` : ""}`,
    cite: HEAT_PAGES.overheat,
  });

  // The Long-range check for OVL: the Long heat output decides whether Long damage would drop by a whole point.
  let ovl = false;
  if (sub.long > 0) {
    const longBefore = upWhole(sub.long);
    const reducesLong = state.longOutput - margin > D;
    const raw = reducesLong ? upToTenth((sub.long * D) / (state.longOutput - margin)) : upToTenth(sub.long);
    if (reducesLong && raw > 0 && raw < HEAT_RULES.minimalBelow) {
      return stuckHere({ code: "ovl-minimal", part: "Overheat Long check", message: "The Long-range check ends in minimal damage (0*); the book does not say how that counts against the whole number, so we leave the damage unset.", cite: HEAT_PAGES.longCheck });
    }
    const longAfter = upWhole(raw);
    const drops = longBefore - longAfter >= HEAT_RULES.ovlDrop;
    working.push({
      step: "overheat",
      rule: "Long-range check: the Long heat output decides whether Long damage drops by a whole point",
      detail: reducesLong ? `${String(longBefore)} against ${fmt(sub.long)} x ${fmt(D)} / ${fmt(state.longOutput - margin)} = ${fmt(raw)}, rounded up ${String(longAfter)}: ${drops ? "drops by at least 1" : "does not drop by 1"}` : `Long heat ${fmt(state.longOutput)} is not over ${fmt(D)} + ${String(margin)}: no drop`,
      cite: HEAT_PAGES.longCheck,
    });
    if (drops && ov === 0) {
      working.push({ step: "overheat", rule: "no OVL: the ability is given only to a unit that has an Overheat Value (errata v1.6 to p. 128)", detail: "Overheat Value 0", cite: HEAT_PAGES.ovlAbility });
    } else if (drops) {
      ovl = true;
      state.ovl = true;
      working.push({ step: "overheat", rule: "the unit has OVL: its Long damage is heat-modified with the Short and Medium heat output", detail: `${fmt(sub.long)} x ${fmt(D)} / ${fmt(state.output - margin)}`, cite: HEAT_PAGES.longCheck });
    }
  }

  const modified: HeatConversion["modified"] = { short: modifiedAt("short"), medium: modifiedAt("medium"), long: modifiedAt("long") };
  if (sub.extreme > 0) {
    findings.push({ code: "extreme-heat", part: "Extreme range damage", message: "The Converting Heat errata gives no rule for heat-modifying the Extreme bracket (the printed page grouped it with Long, which the errata replaces); a 'Mech's card does not print Extreme, so we leave it unset.", cite: HEAT_PAGES.longCheck });
  } else {
    modified.extreme = 0;
  }
  return { value: finish(state, modified, ov, ovl), working, findings };
}

// ---- All three parts ---------------------------------------------------------------------------------------------------------------

/** A unit the conversion has begun: the card fields parts one to three can work out, no specials, role or Point Value yet. */
export type PartialAsUnit = Omit<Partial<AsUnit>, "card"> & { card: Partial<AsCard> };

export interface MechConversion {
  unit: PartialAsUnit;
  /** What the later pieces (CONV-4 specials, CONV-5 role, CONV-6 Point Value) still have to set. */
  pending: ("specials" | "role" | "pv")[];
  /** The specials parts one to three already know the book gives (jump and underwater TMM, Overheat Long); CONV-4 adds them to `specials`. */
  earned: { jump?: MovementResult["jumpSpecial"]; submersible?: MovementResult["submersibleSpecial"]; ovl?: boolean };
  weapons: WeaponDamage | null;
  heat: HeatConversion | null;
  working: Working[];
  findings: Finding[];
}

/** Parts one to three of the conversion for a 'Mech record: type, size, movement, TMM, armor, structure, damage by range and the Overheat
 * Value. Where a step has a finding its fields are left out of `unit.card`; nothing is guessed. */
export function convertMech(record: MechRecord, catalog: Catalog): MechConversion {
  const body = convertBody(record, catalog);
  const unit: PartialAsUnit = {
    schema: 1,
    kind: "as-unit",
    name: { chassis: record.name.chassis, model: record.name.model },
    techBase: record.techBase,
    year: record.year,
    card: { ...body.card },
    source: { kind: "converted", ref: record.id, credit: "Converted from a Classic record in this app" },
  };
  const result: MechConversion = { unit, pending: ["specials", "role", "pv"], earned: {}, weapons: null, heat: null, working: [...body.working], findings: [...body.findings] };
  if (body.jumpSpecial) result.earned.jump = body.jumpSpecial;
  if (body.submersibleSpecial) result.earned.submersible = body.submersibleSpecial;
  if (record.omni?.isBase === true) return result;

  const weapons = convertWeapons(record, catalog);
  const heat = convertHeat(record, catalog, weapons);
  result.weapons = weapons.value;
  result.heat = heat.value;
  result.working.push(...weapons.working, ...heat.working);
  result.findings.push(...weapons.findings, ...heat.findings);
  if (heat.value !== null) {
    unit.card.damage = { s: heat.value.final.short, m: heat.value.final.medium, l: heat.value.final.long };
    unit.card.ov = heat.value.ov;
    result.earned.ovl = heat.value.ovl;
  }
  // The same finding can come from two steps (an unknown item); keep one.
  const seen = new Set<string>();
  result.findings = result.findings.filter((f) => {
    const key = `${f.code}|${f.part}|${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return result;
}

/**
 * The draft the unit page opens from a conversion: whatever figures the conversion worked out (rules/as-convert-all.ts adds the abilities, role and
 * Point Value), everything else as a blank card leaves it, so the player checks it and saves. Nothing is guessed to fill a gap. It is NOT OFFICIAL:
 * the mark rests only on the Master Unit List (rules/as-mul.ts). `source.values` keeps the card as converted, to compare with later edits.
 */
export function conversionDraft(record: MechRecord, conversion: MechConversion, id: string, now: string): AsUnit {
  const blank = newAsUnit(id);
  const { card, source, ...rest } = conversion.unit;
  const whole: AsCard = { ...blank.card, ...card };
  return {
    ...blank,
    ...rest,
    id,
    card: whole,
    rulesLevel: record.rulesLevel,
    era: record.era,
    source: { ...blank.source, ...source, kind: "converted", ref: record.id, at: now, values: structuredClone(whole) },
  };
}
