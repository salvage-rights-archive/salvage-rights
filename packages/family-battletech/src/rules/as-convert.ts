// Converting a Classic 'Mech to an Alpha Strike card, part one: unit type, size class, movement (jump and TMM), armor and structure,
// for BattleMechs, IndustrialMechs and OmniMech configurations. Pure functions over the record and the catalog; nothing throws on a
// record it does not understand. Each step returns its value (null when the book gives none), the working that shows how it was
// reached (our own short wording and the page) and its findings: a part our record holds that the book has no value for is a finding,
// never a guess. The tables are in data/as-convert.ts. Weapons, heat, specials, role and Point Value are later pieces.
import { ARMOR, ENGINE_TYPES, STRUCTURE_TYPES } from "../data/chassis";
import {
  ARMOR_DIVISOR,
  ARMOR_RULES,
  ASC_PAGES,
  ENGINE_MAPPING,
  LARGE_ENGINE_OVER,
  MECH_SIZE_CLASSES,
  MOVE,
  MOVE_EQUIPMENT,
  STRUCTURE_RULES,
  STRUCTURE_TABLE,
  TMM_ROWS,
  TYPE_OF_MECH,
} from "../data/as-convert";
import type { AscCite } from "../data/as-convert";
import type { AsCard, AsMove } from "./as-unit";
import type { Catalog } from "./catalog";
import { mechTypeOf, walkMP } from "./mech";
import type { MechRecord } from "./mech";
import { armorPoints, equipmentItems, jumpMP, mascOf, movementPenalty, own, roundHalfUp, stemOf, tidy } from "./walk";

/** One line of how a value was reached: which rule, the figures it used, and the page. */
export interface Working {
  step: "type" | "size" | "movement" | "tmm" | "armor" | "structure";
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
