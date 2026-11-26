// The ProtoMech part options: the cockpit, armor type, jump system and partial wing a record names (data/protomech.ts holds every figure). This file finds the option a
// record uses, works out what it does to movement and the torso, and decides which options to offer (hide, do not mark: the rules level, the year and the option's dates).
// A record may name an id this version does not know; the lookups then give undefined and nothing throws. Pure functions.
import { PROTO_ARMOR_TYPES, PROTO_COCKPITS, PROTO_CONFIGS, PROTO_JUMP_SYSTEMS, PROTO_ULTRA, PROTO_WEIGHT, PROTO_WING } from "../../data/protomech";
import type { ProtoArmorType, ProtoCockpit, ProtoDates, ProtoJumpSystem } from "../../data/protomech";
import type { RulesLevel } from "../../data/chassis";
import { levelAtLeast, levelIn } from "../levels";
import { own } from "../walk";
import { configOf, isGlider, isUltra } from "./config";
import { plainRun } from "./movement";
import { datesPhase, levelOfRecord } from "./offered";
import type { ProtoRecord } from "./record";

export const cockpitOf = (record: Pick<ProtoRecord, "cockpit">): ProtoCockpit | undefined => own(PROTO_COCKPITS, record.cockpit ?? "standard");
export const armorTypeOf = (record: Pick<ProtoRecord, "armorType">): ProtoArmorType | undefined => own(PROTO_ARMOR_TYPES, record.armorType ?? "standard");
export const jumpSystemOf = (record: Pick<ProtoRecord, "jumpType">): ProtoJumpSystem | undefined => own(PROTO_JUMP_SYSTEMS, record.jumpType ?? "standard");

/** The cockpit weight in kilograms: from 10 tons the control system weighs 750 kg (IO:AE p. 95). */
export function cockpitKg(record: Pick<ProtoRecord, "cockpit" | "tons">): number | undefined {
  const cockpit = cockpitOf(record);
  return cockpit && isUltra(record) && cockpit.ultra ? cockpit.ultra.kg : cockpit?.kg;
}
/** The cockpit cost: the Ultraheavy cockpit, 800,000, replaces the standard one from 10 tons (IO:AE p. 215). */
export function cockpitCost(record: Pick<ProtoRecord, "cockpit" | "tons">): number | undefined {
  const cockpit = cockpitOf(record);
  return cockpit && isUltra(record) && cockpit.ultra?.cost !== undefined ? cockpit.ultra.cost : cockpit?.cost;
}

/** The most Jumping MP (or UMU MP) the jets may give: the Walking MP, or the base Running MP (Walking x 1.5 rounded up; the Myomer Booster does not raise it) for extended jump jets
 * (IO:AE p. 59, book panel ruling). The UMU cap at the Walking MP is inferred from the jump jet rules TO:AUE p. 104 points to (TM p. 84). An unknown system is held to the Walking MP. */
export const jumpReach = (record: Pick<ProtoRecord, "walk" | "jumpType">): number => (jumpSystemOf(record)?.reach === "run" ? plainRun(record.walk) : record.walk);

/** The Jumping MP the partial wing adds in a standard atmosphere (TO:AUE p. 107); it only adds to a unit that can jump, and not to UMUs. */
export const wingBonus = (record: Pick<ProtoRecord, "partialWing" | "jump" | "jumpType">): number =>
  record.partialWing === true && record.jump > 0 && jumpSystemOf(record)?.underwater !== true ? PROTO_WING.bonusAtStandard : 0;

/** The Jumping MP for the Battle Value and the sheet: the jets with the wing's bonus. UMU MP are counted as jump jets for the Battle Value (TO:AUE p. 192), so they are counted here. */
export const jumpMP = (record: Pick<ProtoRecord, "partialWing" | "jump" | "jumpType">): number => Math.max(0, record.jump) + wingBonus(record);

/** The torso's items the unit may carry: two, less one for Electric Discharge armor (IO:AE p. 59) and one for the partial wing (TO:AUE p. 104). Never below 0. */
export const torsoItemsLost = (record: Pick<ProtoRecord, "armorType" | "partialWing">): number => (armorTypeOf(record)?.torsoItems ?? 0) + (record.partialWing === true ? PROTO_WING.torsoItems : 0);

export const wingKg = (record: Pick<ProtoRecord, "partialWing" | "tons">): number => (record.partialWing === true ? record.tons * PROTO_WING.kgPerTon : 0);

/** One option the record uses that has dates or a level of its own. */
export interface UsedOption {
  label: string;
  field: string;
  dates?: ProtoDates;
  level: RulesLevel;
}
/** The options the record uses (only those that are not the TechManual standard, plus the standard jump jets and armor whose own dates apply). */
export function usedOptions(record: ProtoRecord): UsedOption[] {
  const out: UsedOption[] = [];
  const config = configOf(record);
  if (config && record.configuration !== undefined && record.configuration !== "biped") out.push({ label: config.label, field: "configuration", dates: config.dates, level: config.level });
  if (isUltra(record)) out.push({ label: PROTO_ULTRA.label, field: "tons", dates: PROTO_ULTRA.dates, level: PROTO_ULTRA.level });
  const cockpit = cockpitOf(record);
  if (cockpit && record.cockpit !== undefined && record.cockpit !== "standard") out.push({ label: cockpit.label, field: "cockpit", dates: cockpit.dates, level: cockpit.level });
  const armor = armorTypeOf(record);
  if (armor && Object.values(record.armor).some((points) => points > 0)) out.push({ label: armor.label, field: record.armorType === undefined || record.armorType === "standard" ? "armor" : "armorType", dates: armor.dates ?? undefined, level: armor.level });
  const jump = jumpSystemOf(record);
  if (jump && record.jump > 0) out.push({ label: jump.label, field: record.jumpType === undefined || record.jumpType === "standard" ? "jump" : "jumpType", dates: jump.dates, level: jump.level });
  if (record.partialWing === true) out.push({ label: PROTO_WING.label, field: "partialWing", dates: PROTO_WING.dates, level: PROTO_WING.level });
  return out;
}

/** Whether an option with these dates and level is on offer to the record: its time is in its span (or prototype years) and the record's level reaches what it needs there. */
export function optionOffered(record: ProtoRecord, level: RulesLevel, dates?: ProtoDates): boolean {
  const phase = dates === undefined ? "production" : datesPhase(record, dates);
  return phase !== null && levelAtLeast(levelOfRecord(record), levelIn(level, phase));
}

export interface OptionChoice {
  id: string;
  label: string;
}
const offered = <T extends { label: string; level: RulesLevel; dates?: ProtoDates }>(table: Record<string, T>, record: ProtoRecord, current: string): OptionChoice[] =>
  Object.entries(table)
    .filter(([id, option]) => id === current || optionOffered(record, option.level, option.dates))
    .map(([id, option]) => ({ id, label: option.label }));

/** The cockpits, armor types and jump systems to offer: those the rules level and time allow, and the one the record already has. */
export const cockpitChoices = (record: ProtoRecord): OptionChoice[] =>
  offered(PROTO_COCKPITS, record, record.cockpit ?? "standard").filter((c) => c.id !== "interface" || record.cockpit === "interface" || record.techBase === "clan"); // the interface is for Clan ProtoMechs (IO:AE p. 96)
export const armorChoices = (record: ProtoRecord): OptionChoice[] => offered(PROTO_ARMOR_TYPES, record, record.armorType ?? "standard");
export const jumpChoices = (record: ProtoRecord): OptionChoice[] => offered(PROTO_JUMP_SYSTEMS, record, record.jumpType ?? "standard");
export const wingOffered = (record: ProtoRecord): boolean => record.partialWing === true || (!isGlider(record) && optionOffered(record, PROTO_WING.level, PROTO_WING.dates));

/** The chassis to offer: a biped always, the others when the rules level and time allow (hide, do not mark), and the one the record already has. */
export const configChoices = (record: ProtoRecord): OptionChoice[] => offered(PROTO_CONFIGS, record, record.configuration ?? "biped");
/** The weights to offer: the TechManual weights, and the Ultraheavy ones when the rules level and time allow them or the unit already weighs that much. */
export function tonnageChoices(record: ProtoRecord): number[] {
  const top = isUltra(record) || optionOffered(record, PROTO_ULTRA.level, PROTO_ULTRA.dates) ? PROTO_WEIGHT.max : PROTO_WEIGHT.standardMax;
  return Array.from({ length: top - PROTO_WEIGHT.min + 1 }, (_, i) => PROTO_WEIGHT.min + i);
}

/** The names of the options that are not the TechManual's, for the saved list and the record sheet. */
export function optionSummary(record: Pick<ProtoRecord, "configuration" | "tons" | "cockpit" | "armorType" | "jumpType" | "partialWing">): string[] {
  const out: string[] = [];
  if (record.configuration !== undefined && record.configuration !== "biped") out.push(configOf(record)?.label ?? `Chassis "${record.configuration}"`);
  if (isUltra(record)) out.push(PROTO_ULTRA.label);
  if (record.cockpit !== undefined && record.cockpit !== "standard") out.push(cockpitOf(record)?.label ?? `Cockpit "${record.cockpit}"`);
  if (record.armorType !== undefined && record.armorType !== "standard") out.push(armorTypeOf(record)?.label ?? `Armor "${record.armorType}"`);
  if (record.jumpType !== undefined && record.jumpType !== "standard") out.push(jumpSystemOf(record)?.label ?? `Jump system "${record.jumpType}"`);
  if (record.partialWing === true) out.push(PROTO_WING.label);
  return out;
}
