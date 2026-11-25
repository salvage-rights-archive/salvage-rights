// Converting a Classic 'Mech to an Alpha Strike card, part one: unit type, size class, movement (jump and TMM), armor and structure,
// for BattleMechs, IndustrialMechs and OmniMech configurations. Pure functions over the record and the catalog; nothing throws on a
// record it does not understand. Each step returns its value (null when the book gives none), the working that shows how it was
// reached (our own short wording and the page) and its findings: a part our record holds that the book has no value for is a finding,
// never a guess. The tables are in data/as-convert.ts. Part two (the end of this file) adds each weapon's damage at Short, Medium, Long
// and Extreme and their sums; heat, specials, role and Point Value are later pieces.
import { ARMOR, ENGINE_TYPES, STRUCTURE_TYPES } from "../data/chassis";
import {
  AES_ARM_IDS,
  ARMOR_DIVISOR,
  ARMOR_RULES,
  ASC_PAGES,
  AS_WEAPON_TABLE,
  ENGINE_MAPPING,
  FIRE_CONTROL,
  LARGE_ENGINE_OVER,
  MECH_SIZE_CLASSES,
  MOVE,
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
import type { AsCard, AsMove } from "./as-unit";
import type { Catalog } from "./catalog";
import { mechTypeOf, walkMP } from "./mech";
import type { MechRecord } from "./mech";
import { armorPoints, equipmentItems, jumpMP, mascOf, movementPenalty, own, roundHalfUp, stemOf, tidy } from "./walk";
import type { Item } from "./walk";

/** One line of how a value was reached: which rule, the figures it used, and the page. */
export interface Working {
  step: "type" | "size" | "movement" | "tmm" | "armor" | "structure" | "weapons";
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
  const boosts = (masc.named || masc.mounts.length > 0 ? 1 : 0) + (items.some((i) => MOVE_EQUIPMENT.supercharger.includes(stemOf(i.row.id))) ? 1 : 0);
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

  const jumpMPs = penalty.noJump ? 0 : Math.max(0, jumpMP(items) - penalty.jump);
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
  cite: AscCite;
}

export interface WeaponDamage {
  /** The weapons that make up the sums: the forward ones, or the rear ones where they deliver more at every range (p. 100). */
  arc: "front" | "rear";
  lines: WeaponLine[];
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
      const most = shots + specials.reduce((s, a) => s + perTon * (a.tons ?? 1), 0);
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
    const line = { mountId: item.mount.id, name: item.mount.name, tableRow, rear, base, factors, damage, cite: row.cite };
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
  return result({ arc, lines: used, subtotal, roundedUp });
}
