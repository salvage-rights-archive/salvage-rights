// The rules check for Combat Vehicles: what is illegal or does not add up, each finding with the printed page it rests on. Findings are advice,
// never refusals: nothing is removed from a record and nothing throws on one this version does not understand. They share the 'Mech check's
// `Finding` shape, so the same panel shows them. Messages are our own words and state the numbers.
import { ARMOR, ENGINE_TYPES } from "../../data/chassis";
import { VEHICLE_ARMOR, VEHICLE_CLASS_DATES, VEHICLE_ENGINES, VEHICLE_RULES, ENGINE_SLOTS_CITE, ARMOR_CITE, MOTIVE_CITE, SUSPENSION_CITE } from "../../data/vehicle";
import type { Catalog } from "../catalog";
import { mountableOn } from "../catalog";
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast, levelIn, levelRow } from "../levels";
import { equipmentPhase, eraNeedsPick } from "../availability";
import type { Finding } from "../checks";
import { canon } from "../official";
import type { OfficialState } from "../official";
import { officialLabel } from "../official";
import { phaseIn, windowOf } from "../time";
import { own, tidy } from "../walk";
import { enginePossible, equipmentOffered, armorPossible } from "./availability";
import {
  SMALL_BIN, ammoIdOf, amplifierTons, armorLocations, armorPointsFor, assignedArmor, baseRating, baseSlots, engineRating, engineWeight, energyHeat, flankMP, freeHeatSinks, isFusion, itemFacts, maxArmorPoints, motiveRowOf,
  mountLocations, rowOf, slotTally, suspensionFactor, vehicleLocationName, vehicleTally,
} from "./vehicle";
import type { VehicleRecord } from "./vehicle";

const tm = (page: number) => ({ book: "TechManual", page });
const num = (x: number): string => (Number.isFinite(x) ? String(tidy(x)) : "(not a number)");
const tons = (x: number): string => `${num(x)} ${x === 1 ? "ton" : "tons"}`;
const plural = (n: number, word: string): string => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
const finding = (check: string, level: Finding["level"], message: string, extra: Omit<Finding, "check" | "level" | "message"> = {}): Finding => ({ check, level, message, ...extra });
const quoted = (key: unknown): string => `"${String(key)}"`;

export interface VehicleCheck {
  id: string;
  run(input: { record: VehicleRecord; catalog: Catalog }): Finding[];
}

const typeCheck: VehicleCheck = {
  id: "type",
  run({ record }) {
    const row = motiveRowOf(record);
    if (!row) return [finding("type", "warning", `We do not build a vehicle of the motive type ${quoted(record.motive)}, so none of its figures can be checked.`, { where: { field: "motive" } })];
    const out: Finding[] = [];
    if (!Number.isInteger(record.tons) || record.tons < 1) out.push(finding("type", "error", `A vehicle weighs a whole number of tons from 1; this one is ${num(record.tons)}.`, { where: { field: "tons" }, cite: tm(98) }));
    else if (record.tons > row.maxTons) out.push(finding("type", "error", `A ${row.label} vehicle weighs at most ${tons(row.maxTons)}; this one is ${tons(record.tons)}.`, { where: { field: "tons" }, cite: MOTIVE_CITE }));
    if (record.turret && record.motive === "vtol") out.push(finding("type", "error", "A VTOL may not carry a turret.", { where: { field: "turret" }, cite: tm(98) }));
    // Armored motive systems are for tracked, wheeled, hover, hydrofoil, naval and WiGE vehicles only; of the types built here that leaves out the VTOL (TO:AUE p. 95).
    if (record.motive === "vtol" && record.mounts.some((m) => (m.equipmentId ?? "").startsWith("armored-motive-system-"))) out.push(finding("type", "error", "A VTOL may not carry an armored motive system.", { where: { field: "mounts" }, cite: { book: "Tactical Operations: Advanced Units and Equipment", page: 95 } }));
    // A reusable drop chute: wheeled, tracked, hover or WiGE vehicles only, none over 100 tons (TO:AUE p. 160).
    if (record.mounts.some((m) => (m.equipmentId ?? "").startsWith("reusable-vdc-")) && (!["tracked", "wheeled", "hover", "wige"].includes(record.motive) || record.tons > 100)) out.push(finding("type", "error", "A drop chute is for wheeled, tracked, hover and WiGE vehicles of 100 tons or less.", { where: { field: "mounts" }, cite: { book: "Tactical Operations: Advanced Units and Equipment", page: 160 } }));
    return out;
  },
};

const weightCheck: VehicleCheck = {
  id: "weight",
  run({ record, catalog }) {
    const tally = vehicleTally(record, catalog);
    const out: Finding[] = [];
    if (tally.unknown.length > 0) out.push(finding("weight", "warning", `We could not weigh ${tally.unknown.join(", ")}, so the total leaves them out.`, { where: { field: "mounts" } }));
    if (tally.total > record.tons) out.push(finding("weight", "error", `The parts weigh ${tons(tally.total)}, which is ${tons(tally.total - record.tons)} over the vehicle's ${tons(record.tons)}.`, { where: { field: "tons" }, cite: tm(97) }));
    else if (tally.total < record.tons) out.push(finding("weight", "note", `${tons(record.tons - tally.total)} are not used: they may be cargo space, or are wasted.`, { where: { field: "tons" }, cite: tm(107) }));
    return out;
  },
};

const engineCheck: VehicleCheck = {
  id: "engine",
  run({ record }) {
    const out: Finding[] = [];
    const type = record.engine.type;
    const known = VEHICLE_ENGINES.some((e) => e.id === type);
    if (!known) {
      out.push(finding("engine", "error", `A vehicle uses an internal combustion or a fusion engine; ${quoted(type)} is neither.`, { where: { field: "engine" }, cite: tm(101) }));
    } else if (!enginePossible(type, record)) {
      const name = own(ENGINE_TYPES.types, type) ? ENGINE_TYPES.types[type]?.name : type;
      out.push(finding("engine", "warning", `The ${name ?? type} engine is not available to this unit's tech base, year or rules level.`, { where: { field: "engine" }, cite: tm(101) }));
    }
    if (!Number.isFinite(record.cruise) || record.cruise < 1 || !Number.isInteger(record.cruise)) {
      out.push(finding("engine", "error", "Cruising MP is a whole number of 1 or more.", { where: { field: "cruise" }, cite: tm(100) }));
      return out;
    }
    const row = motiveRowOf(record);
    if (row?.minCruise !== undefined && record.cruise < row.minCruise) out.push(finding("engine", "error", `A WiGE vehicle has at least ${row.minCruise} Cruising MP; this one has ${record.cruise}.`, { where: { field: "cruise" }, cite: tm(101) }));
    if (row && suspensionFactor(record) === null) {
      out.push(finding("engine", "warning", `The book prints no suspension factor for a ${row.label} vehicle of ${tons(record.tons)}, so the engine cannot be worked out.`, { where: { field: "engine" }, cite: SUSPENSION_CITE }));
      return out;
    }
    const base = baseRating(record);
    const rating = engineRating(record);
    if (base !== null && rating !== null) {
      if (base < VEHICLE_RULES.engine.min) out.push(finding("engine", "note", `The formula gives a rating of ${num(base)}; the least a vehicle may have is ${VEHICLE_RULES.engine.min}, so the engine is rated ${VEHICLE_RULES.engine.min}.`, { where: { field: "cruise" }, cite: tm(100) }));
      if (base > VEHICLE_RULES.engine.max) out.push(finding("engine", "error", `The speed asked for needs an engine rated ${num(Math.ceil(base / 5) * 5)}; no vehicle engine is rated above ${VEHICLE_RULES.engine.max}.`, { where: { field: "cruise" }, cite: tm(100) }));
    }
    if (rating !== null && engineWeight(record) === null) out.push(finding("engine", "warning", `The Master Engine Table has no ${type} engine of rating ${rating}, so its weight is not known.`, { where: { field: "engine" }, cite: tm(101) }));
    const lost = VEHICLE_ENGINES.find((e) => e.id === type)?.slots ?? 0;
    if (lost !== 0) out.push(finding("engine", "note", lost > 0 ? `The ${type} engine takes ${plural(lost, "item slot")}.` : `The ${type} engine gives ${plural(-lost, "extra item slot")}.`, { where: { field: "engine" }, cite: ENGINE_SLOTS_CITE }));
    return out;
  },
};

const armorCheck: VehicleCheck = {
  id: "armor",
  run({ record }) {
    const out: Finding[] = [];
    const type = record.armor.type;
    if (!VEHICLE_ARMOR.some((a) => a.id === type)) {
      out.push(finding("armor", "error", `A vehicle wears standard or ferro-fibrous armor; ${quoted(type)} is not one of them.`, { where: { field: "armor.type" }, cite: ARMOR_CITE }));
    } else if (!armorPossible(type, record)) {
      const name = own(ARMOR.types, type) ? ARMOR.types[type]?.name : type;
      out.push(finding("armor", "warning", `${name ?? type} armor is not available to this unit's tech base, year or rules level.`, { where: { field: "armor.type" }, cite: ARMOR_CITE }));
    }
    if (record.armor.tons < 0 || !Number.isInteger(tidy(record.armor.tons * 2))) out.push(finding("armor", "error", "Armor comes in lots of a half ton or a whole ton.", { where: { field: "armor.tons" }, cite: ARMOR_CITE }));
    const available = armorPointsFor(type, record.armor.tons);
    const assigned = assignedArmor(record);
    const max = maxArmorPoints(record);
    if (available !== null && assigned > available) out.push(finding("armor", "error", `${plural(assigned, "armor point")} are assigned, but ${tons(record.armor.tons)} of ${type} armor gives ${available}.`, { where: { field: "armor.points" }, cite: ARMOR_CITE }));
    if (available !== null && available > max) out.push(finding("armor", "note", `${tons(record.armor.tons)} would give ${available} points, but a ${tons(record.tons)} vehicle takes at most ${max}: ${plural(available - max, "point")} could not be mounted.`, { where: { field: "armor.tons" }, cite: ARMOR_CITE }));
    if (assigned > max) out.push(finding("armor", "error", `${plural(assigned, "armor point")} are assigned; a ${tons(record.tons)} vehicle takes at most ${max}.`, { where: { field: "armor.points" }, cite: ARMOR_CITE }));
    if (available !== null && assigned < available && assigned <= max) out.push(finding("armor", "note", `${plural(available - assigned, "armor point")} are not assigned to a location.`, { where: { field: "armor.points" } }));
    const here = armorLocations(record);
    for (const [loc, points] of Object.entries(record.armor.points)) {
      if (points < 0 || !Number.isInteger(points)) out.push(finding("armor", "error", `${vehicleLocationName(loc)} armor is a whole number of points of 0 or more.`, { where: { field: `armor.points.${loc}` }, cite: ARMOR_CITE }));
      else if (!here.includes(loc) && points > 0) out.push(finding("armor", "warning", `${vehicleLocationName(loc)} has ${plural(points, "armor point")}, but this vehicle has no such location.`, { where: { field: `armor.points.${loc}` } }));
    }
    const rotor = record.armor.points["rot"] ?? 0;
    if (record.motive === "vtol" && rotor > VEHICLE_RULES.armor.rotorMax) out.push(finding("armor", "error", `A rotor holds at most ${plural(VEHICLE_RULES.armor.rotorMax, "armor point")}; this one has ${rotor}.`, { where: { field: "armor.points.rot" }, cite: ARMOR_CITE }));
    return out;
  },
};

const heatCheck: VehicleCheck = {
  id: "heat",
  run({ record, catalog }) {
    const out: Finding[] = [];
    const heat = energyHeat(record, catalog);
    const sinks = record.heatSinks.count;
    if (!Number.isInteger(sinks) || sinks < 0) out.push(finding("heat", "error", "The number of heat sinks is a whole number of 0 or more.", { where: { field: "heatSinks" }, cite: tm(104) }));
    else if (sinks < heat) out.push(finding("heat", "error", `Firing every energy weapon at once makes ${plural(heat, "point")} of heat, and the unit has ${plural(sinks, "heat sink")}.`, { where: { field: "heatSinks" }, cite: tm(104) }));
    if (isFusion(record.engine.type) && Number.isInteger(sinks) && sinks < freeHeatSinks(record)) out.push(finding("heat", "note", `A fusion engine gives ${freeHeatSinks(record)} heat sinks at no weight; the unit has only ${sinks}.`, { where: { field: "heatSinks" }, cite: tm(104) }));
    if (heat === 0 && sinks > freeHeatSinks(record)) out.push(finding("heat", "note", "The unit carries no energy weapon, so it needs no heat sinks beyond the free ones.", { where: { field: "heatSinks" }, cite: tm(104) }));
    const amps = amplifierTons(record, catalog);
    if (amps > 0) out.push(finding("heat", "note", `The internal combustion engine needs power amplifiers for the energy weapons: ${tons(amps)}, in the weight and taking no slot.`, { where: { field: "engine" }, cite: tm(107) }));
    return out;
  },
};

const BAD_PLACE: Record<string, string> = { rot: "The rotor carries no equipment." };

const equipmentCheck: VehicleCheck = {
  id: "equipment",
  run({ record, catalog }) {
    const out: Finding[] = [];
    const places = mountLocations(record);
    const slots = slotTally(record, catalog);
    if (slots.used > slots.available) {
      const why = slots.lost.map((l) => `${plural(l.slots, "slot")} to the ${l.label}`).join(" and ");
      out.push(finding("equipment", "error", `The items use ${plural(slots.used, "slot")}, but the vehicle has ${slots.available} (${baseSlots(record)} for its weight${why === "" ? "" : `, less ${why}`}).`, { where: { field: "mounts" }, cite: tm(98) }));
    }
    for (const m of record.mounts) {
      const row = rowOf(m, record, catalog);
      const name = m.name || "an unnamed item";
      const at = { mountId: m.id };
      if (m.equipmentId === null || row === undefined) {
        out.push(finding("equipment", "warning", `${name} is not in our equipment table, so its weight, slots and rules are not checked.`, { where: at }));
      } else {
        if (!mountableOn(row, "vehicle")) out.push(finding("equipment", "error", `${row.name} is not printed for vehicles.`, { where: at, cite: row.cite }));
        else if (!equipmentOffered(row, record, catalog)) {
          const level = equipmentLevel(row);
          const phase = equipmentPhase(row, { ...record, unitType: "mech" }, catalog);
          const needs = levelIn(level, phase, row.prototypeLevel);
          const reason = !levelAtLeast(record.rulesLevel ?? DEFAULT_LEVEL, needs) ? `needs ${levelRow(needs).label} rules` : "is not available to this unit's tech base, year or era";
          out.push(finding("equipment", "warning", `${row.name} ${reason}.`, { where: at, cite: row.cite }));
        }
        const facts = itemFacts(m, record, catalog);
        if (facts.ammo) {
          const small = SMALL_BIN.test(row.id.replace(/^ammo-/, ""));
          const least = small ? VEHICLE_RULES.ammo.smallMinTons : VEHICLE_RULES.ammo.minTons;
          if ((facts.tons ?? 0) < least) out.push(finding("equipment", "error", `${name} is a bin of ${tons(facts.tons ?? 0)}; a bin of this ammunition is at least ${tons(least)}.`, { where: at, cite: VEHICLE_RULES.ammo.cite }));
        }
        if (m.location === "body" && facts.weapon) out.push(finding("equipment", "error", `${name} is a weapon in the body, which has no firing arc; put it in a side, the rear, the front or the turret.`, { where: at, cite: tm(107) }));
      }
      if (own(BAD_PLACE, m.location)) out.push(finding("equipment", "error", `${name}: ${BAD_PLACE[m.location]}`, { where: at, cite: tm(107) }));
      else if (!places.includes(m.location)) out.push(finding("equipment", "error", m.location === "t" ? `${name} is in the turret, and the vehicle has none.` : `${name} is in ${quoted(m.location)}, which this vehicle does not have.`, { where: at, cite: tm(107) }));
    }
    // Ammunition: each ammunition-fed weapon needs a bin of its ammunition, and a bin needs a weapon.
    const weapons = new Set<string>();
    const ammo = new Set<string>();
    for (const m of record.mounts) {
      const row = rowOf(m, record, catalog);
      if (!row) continue;
      if (row.kind === "weapon") weapons.add(row.id);
      if (row.kind === "ammunition") ammo.add(row.id);
    }
    for (const id of weapons) {
      if (catalog.byId(ammoIdOf(id)) !== undefined && !ammo.has(ammoIdOf(id))) out.push(finding("equipment", "warning", `${catalog.byId(id)?.name ?? id} has no ammunition on the unit.`, { where: { field: "mounts" }, cite: VEHICLE_RULES.ammo.cite }));
    }
    for (const id of ammo) {
      const weapon = id.replace(/^ammo-/, "");
      const fits = [...weapons].some((w) => w === weapon || catalog.byId(id)?.feeds !== undefined);
      if (!fits) out.push(finding("equipment", "note", `${catalog.byId(id)?.name ?? id} has no weapon on the unit that fires it.`, { where: { field: "mounts" } }));
    }
    return out;
  },
};

const turretCheck: VehicleCheck = {
  id: "turret",
  run({ record }) {
    if (!record.turret || record.motive === "vtol") return [];
    const inside = record.mounts.some((m) => m.location === "t");
    return inside ? [] : [finding("turret", "note", "The turret holds nothing, so it weighs nothing; a vehicle may go without it.", { where: { field: "turret" }, cite: tm(107) })];
  },
};

const timeCheck: VehicleCheck = {
  id: "time",
  run({ record }) {
    const level = record.rulesLevel ?? DEFAULT_LEVEL;
    const out: Finding[] = [];
    if (level !== "introductory" && record.year === null) out.push(finding("time", "warning", `A year is needed at ${levelRow(level).label} rules: it decides which parts and equipment are available.`, { where: { field: "year" } }));
    else if (record.year !== null && eraNeedsPick(record)) out.push(finding("time", "note", `The year ${num(record.year)} falls in two eras; pick one, since it decides the tech base.`, { where: { field: "era" } }));
    const dates = VEHICLE_CLASS_DATES;
    const phase = phaseIn([{ from: dates.production }], dates.prototype, windowOf(record));
    if (phase === null) out.push(finding("time", "warning", `Combat vehicles are not built before ${String(dates.prototype)} (prototypes) and ${String(dates.production)} (production).`, { where: { field: "year" }, cite: dates.cite }));
    else if (phase === "prototype" && !levelAtLeast(level, "experimental")) out.push(finding("time", "warning", `Before ${String(dates.production)} a combat vehicle is a prototype, which needs Experimental rules.`, { where: { field: "year" }, cite: dates.cite }));
    const row = motiveRowOf(record);
    if (row && !levelAtLeast(level, row.level)) out.push(finding("level", "warning", `A ${row.label} vehicle needs ${levelRow(row.level).label} rules.`, { where: { field: "motive" }, cite: MOTIVE_CITE }));
    return out;
  },
};

const OFFICIAL_ID = "official";
/** The design as the OFFICIAL mark sees it: everything but the name, the notes, the picture, the mark and the rules level. */
export function vehicleDesignKey(record: VehicleRecord): string {
  const design: Record<string, unknown> = { ...record };
  for (const key of ["name", "notes", "picture", "official", "rulesLevel", "id"]) delete design[key];
  design.mounts = record.mounts.map((m) => canon({ ...m, id: undefined })).sort();
  return canon(design);
}
/** Marks a vehicle OFFICIAL in the named book, keeping the design as it is now. Does nothing without a book. */
export function markVehicleOfficial(draft: VehicleRecord, book: string, page?: number | null): void {
  const named = book.trim();
  if (!named) return;
  draft.official = { status: "official", book: named, design: vehicleDesignKey(draft), ...(page !== undefined && page !== null && Number.isInteger(page) && page > 0 ? { page } : {}) };
}
export function vehicleOfficialState(record: VehicleRecord): OfficialState {
  const mark = record.official;
  const book = mark?.book?.trim();
  if (mark?.status !== "official" || !book || mark.design === undefined) return { official: false };
  if (mark.design !== vehicleDesignKey(record)) return { official: false, changedFrom: book };
  return mark.page === undefined ? { official: true, book } : { official: true, book, page: mark.page };
}
const officialCheck: VehicleCheck = {
  id: OFFICIAL_ID,
  run({ record }) {
    const state = vehicleOfficialState(record);
    return !state.official && state.changedFrom !== undefined ? [finding(OFFICIAL_ID, "note", `Marked official, but ${officialLabel(state).detail}.`, { where: { field: "official" } })] : [];
  },
};

/** Flank MP, so the panel and the sheet say it from one place. */
export const speedText = (record: Pick<VehicleRecord, "cruise">): string => `${num(record.cruise)} cruising, ${num(flankMP(record))} flank`;

export const VEHICLE_CHECKS: VehicleCheck[] = [typeCheck, weightCheck, engineCheck, armorCheck, heatCheck, equipmentCheck, turretCheck, timeCheck, officialCheck];

/** Every finding for the unit. Never throws: a check that fails on a record it does not understand gives a note. */
export function checkVehicle(record: VehicleRecord, catalog: Catalog): Finding[] {
  return VEHICLE_CHECKS.flatMap((check) => {
    try {
      return check.run({ record, catalog });
    } catch {
      return [finding(check.id, "note", `The ${check.id} check could not read this unit.`)];
    }
  });
}
