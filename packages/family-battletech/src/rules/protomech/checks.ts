// The rules check for ProtoMechs: findings with the printed page they rest on. Findings are advice, never refusals: nothing is removed from a record and nothing throws
// on one this version does not understand. Messages are our own words and state the numbers; a finding's `cite` names the deciding book and page. Standard construction
// is TechManual pp. 80-89 (errata v8.0); the dates are Interstellar Operations: Alternate Eras (printed pp. 29 and 44). Rules levels follow the 'Mech side: ProtoMechs are
// Standard rules in production, Experimental in their prototype years (IO:AE printed p. 27), and not part of Introductory (Inner Sphere, 3025 technology).
import { PROTO_CODES, PROTO_DATES, PROTO_LIMITS, PROTO_LOCATION_NAMES, PROTO_PART_PAGES, PROTO_PARTS, PROTO_REAR_LOCATIONS, PROTO_WEIGHT } from "../../data/protomech";
import type { ProtoCite } from "../../data/protomech";
import { LEVEL_ORDER, levelAtLeast, levelIn, levelRow } from "../levels";
import type { RulesLevel } from "../../data/chassis";
import type { Catalog } from "../catalog";
import { own, tidy } from "../walk";
import { armorKg, engineKg, engineRating, energyHeat, holdsAt, launcherOf, locationsOf, mountName, rowOf, structureRow, tally, usesAmmo } from "./build";
import { datesPhase, itemAvailable, itemLevel, itemPhase, levelOfRecord, protoMountable } from "./offered";
import type { ProtoRecord } from "./record";
import { eraNeedsPick } from "../time";

export interface ProtoFinding {
  check: string;
  level: "error" | "warning" | "note";
  message: string;
  where?: { field?: string; mountId?: string; location?: string };
  /** The deciding book and printed page ("TechManual, p. 87"). */
  cite?: string;
}

const num = (n: number): string => String(tidy(n));
const page = (cite: ProtoCite): string => `${cite.book}, p. ${String(cite.page)}`;
const TM = (p: number): string => `TechManual, p. ${String(p)}`;
const kg = (n: number): string => `${num(n)} kg`;
const nameOf = (code: string): string => (Object.hasOwn(PROTO_LOCATION_NAMES, code) ? (PROTO_LOCATION_NAMES[code] ?? code) : `"${code}"`);

/** The lowest rules level the unit can be built at: the highest any part of it asks for. */
export function protoLowestLevel(record: ProtoRecord, catalog: Catalog): RulesLevel {
  const needs: RulesLevel[] = ["standard"];
  const timed: [boolean, keyof typeof PROTO_DATES][] = [
    [true, "unit"],
    [record.jump > 0, "jumpJets"],
    [PROTO_CODES.some((code) => (record.armor[code] ?? 0) > 0), "armor"],
    [record.booster, "booster"],
  ];
  for (const [used, key] of timed) if (used && datesPhase(record, PROTO_DATES[key]) === "prototype") needs.push("experimental");
  for (const mount of record.mounts) {
    const row = rowOf(catalog, record, mount);
    if (row) needs.push(itemLevel(row, record, catalog));
  }
  return needs.reduce((high, level) => (LEVEL_ORDER.indexOf(level) > LEVEL_ORDER.indexOf(high) ? level : high), "standard" as RulesLevel);
}

type Out = ProtoFinding[];
type Check = (record: ProtoRecord, catalog: Catalog, out: Out) => void;

/** The unit's type, weight and tech base, and whether ProtoMechs exist at the record's level and time. */
const typeCheck: Check = (record, _catalog, out) => {
  const { min, max, step } = PROTO_WEIGHT;
  const cite = page(PROTO_WEIGHT.cite);
  if (!Number.isInteger(record.tons) || record.tons < min || record.tons > max) {
    out.push({ check: "weight", level: "error", message: `A ProtoMech weighs ${String(min)} to ${String(max)} tons in steps of ${String(step)}; this one is ${num(record.tons)}.`, where: { field: "tons" }, cite });
  }
  if (record.techBase !== "clan") out.push({ check: "tech-base", level: "error", message: `ProtoMechs are built with Clan technology only; this unit says "${record.techBase}".`, where: { field: "techBase" }, cite });
  const level = levelOfRecord(record);
  if (level === "introductory") out.push({ check: "level", level: "error", message: "Introductory rules are Inner Sphere, 3025 technology; ProtoMechs are Clan units and not part of it.", where: { field: "rulesLevel" }, cite: TM(80) });
  if (record.year === null && level !== "introductory") {
    out.push({ check: "year", level: "warning", message: `A year is needed above Introductory rules: it decides what ProtoMechs and equipment exist.`, where: { field: "year" } });
  } else if (eraNeedsPick(record)) {
    out.push({ check: "era", level: "warning", message: "This year falls in two eras; pick the one the unit is built in.", where: { field: "era" } });
  }
  const phase = datesPhase(record, PROTO_DATES.unit);
  const dates = PROTO_DATES.unit;
  if (record.year !== null && phase === null) {
    out.push({ check: "year", level: "error", message: `ProtoMechs do not exist in ${String(record.year)}: the first prototypes are from about ${String(dates.prototype)} and production starts in ${String(dates.production)}.`, where: { field: "year" }, cite: page(dates.cite) });
  } else if (phase === "prototype" && !levelAtLeast(level, levelIn("standard", "prototype"))) {
    out.push({ check: "level", level: "error", message: `In ${String(record.year)} ProtoMechs are prototypes (production starts in ${String(dates.production)}), which needs Experimental rules.`, where: { field: "rulesLevel" }, cite: page(dates.cite) });
  }
};

/** Engine rating, speed and jump (TechManual pp. 83-84). */
const movementCheck: Check = (record, _catalog, out) => {
  const rating = engineRating(record);
  if (rating === null) {
    out.push({ check: "engine", level: "error", message: "The Walking MP must be a whole number of at least 1.", where: { field: "walk" }, cite: TM(PROTO_PART_PAGES.engine) });
  } else if (rating > PROTO_PARTS.engineMaxRating) {
    out.push({ check: "engine", level: "error", message: `At ${String(record.walk)} Walking MP the engine rating is ${String(rating)}; a ProtoMech engine is rated 400 at most.`, where: { field: "walk" }, cite: TM(PROTO_PART_PAGES.engine) });
  } else if (engineKg(record) === null) {
    out.push({ check: "engine", level: "warning", message: `We have no weight for a standard fusion engine of rating ${String(Math.ceil(rating / 5) * 5)}.`, where: { field: "walk" }, cite: TM(PROTO_PART_PAGES.engine) });
  }
  if (!Number.isInteger(record.jump) || record.jump < 0) {
    out.push({ check: "jump", level: "error", message: "The Jumping MP must be a whole number, 0 or more.", where: { field: "jump" }, cite: TM(PROTO_PART_PAGES.jumpJets) });
  } else if (record.jump > record.walk) {
    out.push({ check: "jump", level: "error", message: `Jumping MP (${String(record.jump)}) may not be more than Walking MP (${String(record.walk)}).`, where: { field: "jump" }, cite: TM(PROTO_PART_PAGES.jumpJets) });
  }
};

/** Armor points against each location's limit (TechManual p. 82), and where armor may be. */
const armorCheck: Check = (record, _catalog, out) => {
  const row = structureRow(record);
  const cite = TM(PROTO_PART_PAGES.structure);
  const has = locationsOf(record);
  for (const [code, points] of Object.entries(record.armor)) {
    if (points === 0) continue;
    const where = { field: `armor.${code}`, location: code };
    if (!Number.isInteger(points) || points < 0) out.push({ check: "armor", level: "error", message: `${nameOf(code)} armor must be a whole number of points, 0 or more.`, where, cite });
    else if (!Object.hasOwn(PROTO_LOCATION_NAMES, code)) out.push({ check: "armor", level: "error", message: `A ProtoMech has no location "${code}", so its ${String(points)} armor points have nowhere to go.`, where, cite });
    else if (!has.some((c) => c === code)) out.push({ check: "armor", level: "error", message: `${nameOf(code)} armor needs a main gun: with none, the unit has no such location.`, where, cite });
    else if (row && points > row.armor[code as keyof typeof row.armor]) out.push({ check: "armor", level: "error", message: `${nameOf(code)} holds ${String(row.armor[code as keyof typeof row.armor])} armor points at most for a ${num(record.tons)} ton ProtoMech; this has ${String(points)}.`, where, cite });
  }
  if (!row && Number.isFinite(record.tons)) out.push({ check: "armor", level: "note", message: `We have no structure and armor row for ${num(record.tons)} tons, so armor limits are not checked.`, where: { field: "tons" }, cite });
};

/** Items by location: what each may hold, rear facing, launcher size, and what the unit can carry at all (TechManual pp. 87-89). */
const mountsCheck: Check = (record, catalog, out) => {
  const limitCite = page(PROTO_LIMITS.cite);
  for (const mount of record.mounts) {
    const name = mountName(mount) || "An item";
    const where = { mountId: mount.id, location: mount.location };
    const row = rowOf(catalog, record, mount);
    if (!row) {
      out.push({ check: "item", level: "warning", message: `${name} is not in our equipment table, so its weight and rules are not checked.`, where });
      continue;
    }
    if (!protoMountable(row)) out.push({ check: "item", level: "error", message: `${name} cannot be mounted on a ProtoMech.`, where, cite: TM(87) });
    else if (!itemAvailable(row, record, catalog)) {
      const phase = itemPhase(row, record, catalog);
      const needed = levelRow(itemLevel(row, record, catalog)).label;
      out.push({
        check: "item",
        level: "warning",
        message: phase === null ? `${name} is not available to a Clan unit${record.year === null ? "" : ` in ${String(record.year)}`}.` : `${name} needs ${needed} rules in ${String(record.year ?? "this time")}.`,
        where,
      });
    }
    if (!Object.hasOwn(PROTO_LIMITS.rows, mount.location)) out.push({ check: "location", level: "error", message: `${name} is in "${mount.location}", which is not a ProtoMech location.`, where, cite: limitCite });
    if (mount.rear === true && !PROTO_REAR_LOCATIONS.includes(mount.location)) out.push({ check: "rear", level: "error", message: `${name} faces the rear, which only a torso weapon may.`, where, cite: TM(80) });
    const launch = launcherOf(mount);
    if (launch) {
      if (mount.tubes !== undefined && (!Number.isInteger(mount.tubes) || mount.tubes < 1 || mount.tubes > launch.launcher.maxTubes)) {
        out.push({ check: "tubes", level: "error", message: `A ProtoMech ${launch.launcher.label} launcher has 1 to ${String(launch.launcher.maxTubes)} tubes; this one has ${num(mount.tubes)}.`, where, cite: TM(89) });
      }
    }
    if (usesAmmo(mount) && (mount.shots === undefined || mount.shots <= 0)) out.push({ check: "ammo", level: "warning", message: `${name} has no ammunition.`, where, cite: TM(88) });
    if (!usesAmmo(mount) && mount.shots !== undefined && mount.shots > 0) out.push({ check: "ammo", level: "note", message: `${name} takes no ammunition, so its ${num(mount.shots)} shots weigh nothing.`, where });
  }
  const known = new Set(PROTO_CODES as string[]);
  for (const code of [...PROTO_CODES, ...new Set(record.mounts.map((m) => m.location).filter((c) => !known.has(c)))]) {
    const limit = own(PROTO_LIMITS.rows, code);
    if (!limit) continue;
    const held = holdsAt(record, catalog, code);
    if (held.items === 0) continue;
    const where = { location: code };
    if (code === "mg" && !record.mainGun) {
      out.push({ check: "location", level: "error", message: `The main gun holds an item, but the unit has no main gun mount.`, where, cite: limitCite });
      continue;
    }
    if (held.items > limit.items) {
      out.push({ check: "location", level: "error", message: limit.items === 0 ? `${nameOf(code)} may hold no weapons or equipment; it has ${String(held.items)}.` : `${nameOf(code)} may hold ${String(limit.items)} ${limit.items === 1 ? "item" : "items"}; it has ${String(held.items)}.`, where, cite: limitCite });
    }
    if (limit.kg !== null && limit.items > 0 && held.kg > limit.kg) out.push({ check: "location", level: "error", message: `${nameOf(code)} may hold ${kg(limit.kg)} of equipment; it has ${kg(held.kg)}.`, where, cite: limitCite });
  }
};

/** The heat sinks the energy weapons need (TechManual p. 86). */
const heatCheck: Check = (record, catalog, out) => {
  const heat = energyHeat(record, catalog);
  if (record.heatSinks < heat) out.push({ check: "heat", level: "error", message: `The energy weapons make ${String(heat)} heat and the unit has ${String(record.heatSinks)} heat sinks; a ProtoMech needs a sink for each point.`, where: { field: "heatSinks" }, cite: TM(PROTO_PART_PAGES.heatSinks) });
  else if (record.heatSinks > heat) out.push({ check: "heat", level: "note", message: `${String(record.heatSinks - heat)} heat ${record.heatSinks - heat === 1 ? "sink does" : "sinks do"} nothing: ${String(heat)} are needed.`, where: { field: "heatSinks" }, cite: TM(PROTO_PART_PAGES.heatSinks) });
  if (!Number.isInteger(record.heatSinks) || record.heatSinks < 0) out.push({ check: "heat", level: "error", message: "The heat sinks must be a whole number, 0 or more.", where: { field: "heatSinks" }, cite: TM(PROTO_PART_PAGES.heatSinks) });
};

/** Weight against the tonnage (TechManual pp. 80, 87): over is an error, under is wasted weight. */
const weightCheck: Check = (record, catalog, out) => {
  const t = tally(record, catalog);
  const limit = record.tons * 1000;
  if (t.total > limit) out.push({ check: "weight", level: "error", message: `The parts and equipment weigh ${kg(t.total)}, which is ${kg(t.total - limit)} over the ${kg(limit)} of a ${num(record.tons)} ton ProtoMech.`, cite: TM(80) });
  else if (t.total < limit) out.push({ check: "weight", level: "note", message: `${kg(limit - t.total)} of the ${kg(limit)} is not used; unspent weight is wasted.`, cite: TM(87) });
  if (t.unknown.length > 0) out.push({ check: "weight", level: "warning", message: `We could not weigh: ${t.unknown.join(", ")}.` });
};

/** The parts with dates of their own: ProtoMech jump jets and armor (about 3055 to 3060) and the Myomer Booster (about 3066 to 3068), at the record's time and level. */
const partsCheck: Check = (record, _catalog, out) => {
  const parts: [boolean, keyof typeof PROTO_DATES, string, string][] = [
    [record.jump > 0, "jumpJets", "ProtoMech jump jets", "jump"],
    [PROTO_CODES.some((code) => (record.armor[code] ?? 0) > 0) || armorKg(record) > 0, "armor", "ProtoMech armor", "armor"],
    [record.booster, "booster", "The Myomer Booster", "booster"],
  ];
  const level = levelOfRecord(record);
  for (const [used, key, label, field] of parts) {
    if (!used || record.year === null) continue;
    const dates = PROTO_DATES[key];
    const phase = datesPhase(record, dates);
    if (phase === null) out.push({ check: "part", level: "error", message: `${label} do${label.startsWith("The") ? "es" : ""} not exist in ${String(record.year)}: prototypes appear about ${String(dates.prototype)}.`, where: { field }, cite: page(dates.cite) });
    else if (phase === "prototype" && !levelAtLeast(level, "experimental")) out.push({ check: "part", level: "error", message: `${label} are prototypes in ${String(record.year)} (production starts in ${String(dates.production)}), which needs Experimental rules.`, where: { field }, cite: page(dates.cite) });
  }
};

export const PROTO_CHECKS: { id: string; run: Check }[] = [
  { id: "type", run: typeCheck },
  { id: "movement", run: movementCheck },
  { id: "armor", run: armorCheck },
  { id: "parts", run: partsCheck },
  { id: "mounts", run: mountsCheck },
  { id: "heat", run: heatCheck },
  { id: "weight", run: weightCheck },
];

/** Every finding for the unit, errors first. */
export function checkProto(record: ProtoRecord, catalog: Catalog): ProtoFinding[] {
  const out: Out = [];
  for (const check of PROTO_CHECKS) {
    try {
      check.run(record, catalog, out);
    } catch {
      out.push({ check: check.id, level: "warning", message: "This part of the rules check could not read the unit." });
    }
  }
  const rank = { error: 0, warning: 1, note: 2 } as const;
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

