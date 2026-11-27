// The rules check for Support Vehicles: what is illegal or does not add up, each finding with the printed page it rests on. Findings are advice, never refusals:
// nothing is removed from a record and nothing throws on one this version does not understand. They share the 'Mech check's `Finding` shape, so the same panel
// shows them. Messages are our own words and state the numbers.
import { SV_PAGES, SV_ROTOR_MAX, SV_WEIGHT_RULES, ULTRA_LIGHT_BAR, svEngineOf, svModOf } from "../../data/support-vehicle";
import type { SvMod } from "../../data/support-vehicle";
import type { Catalog, EquipmentRow } from "../catalog";
import { mountableOn } from "../catalog";
import { asEquipment, chosenMunition, choicesFor } from "../munitions";
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast, levelIn, levelRow } from "../levels";
import { equipmentPhase, eraNeedsPick } from "../availability";
import type { Finding } from "../checks";
import { canon, officialLabel } from "../official";
import type { OfficialState } from "../official";
import { own, tidy } from "../walk";
import { barPossible, enginePossible, equipmentOffered, lightMedium, modFits } from "./availability";
import {
  AMMO_MIN_TONS, AMMO_SMALL_MIN_TONS, SMALL_BIN, ammoIdOf, amplifierTons, armoredOnlyBar, armorCell, armorLocations, armorSlots, armorTons, assignedArmor, baseSlots, canHaveTurret, crewTally, energyHeat, engineMinimumNote, engineTons,
  flankMP, fuelPercent, fuelPoints, isAir, isSmall, itemFacts, largeOnly, maxArmorPoints, maxTonsOf, minRatingOf, mountLocations, needsFuel, rangeKm, rowOf, seatsAboard, sizeOf, slotTally, svSlotsOf,
  structureTons, svLocationName, svMotiveRowOf, svTally, weightRowOf,
} from "./sv";
import type { SupportVehicleRecord } from "./sv";

const num = (x: number): string => (Number.isFinite(x) ? String(tidy(x)) : "(not a number)");
const tons = (x: number): string => `${num(x)} ${x === 1 ? "ton" : "tons"}`;
const plural = (n: number, word: string): string => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
const finding = (check: string, level: Finding["level"], message: string, extra: Omit<Finding, "check" | "level" | "message"> = {}): Finding => ({ check, level, message, ...extra });
const quoted = (key: unknown): string => `"${String(key)}"`;

export interface SvCheck {
  id: string;
  run(input: { record: SupportVehicleRecord; catalog: Catalog }): Finding[];
}

const typeCheck: SvCheck = {
  id: "type",
  run({ record }) {
    const row = svMotiveRowOf(record);
    if (!row) return [finding("type", "warning", `We do not build a Support Vehicle of the motive type ${quoted(record.motive)}, so none of its figures can be checked.`, { where: { field: "motive" } })];
    const out: Finding[] = [];
    const max = maxTonsOf(record) ?? row.maxTons;
    if (!Number.isFinite(record.tons) || record.tons < SV_WEIGHT_RULES.min) out.push(finding("type", "error", `A Support Vehicle weighs at least ${tons(SV_WEIGHT_RULES.min)}; this one is ${num(record.tons)}.`, { where: { field: "tons" }, cite: SV_PAGES.weights }));
    else if (record.tons > max) out.push(finding("type", "error", `A ${row.label} Support Vehicle${max < row.maxTons ? " with the hydrofoil modification" : ""} weighs at most ${tons(max)}; this one is ${tons(record.tons)}.`, { where: { field: "tons" }, cite: SV_PAGES.motives }));
    else if (isSmall(record) ? !Number.isInteger(tidy(record.tons * 1000)) : !Number.isInteger(tidy(record.tons * 2))) out.push(finding("type", "error", isSmall(record) ? "A Small Support Vehicle is weighed to the kilogram." : "A Support Vehicle of 5 tons or more is weighed in half tons.", { where: { field: "tons" }, cite: SV_PAGES.weights }));
    else if (weightRowOf(record) === undefined) out.push(finding("type", "warning", `The Master Support Vehicle Weight Table has no ${row.label} row for ${tons(record.tons)}.`, { where: { field: "tons" }, cite: SV_PAGES.weights }));
    // The turret flag is kept when the choice is hidden (a switch to a VTOL and back); it does nothing while the unit cannot carry one.
    if (record.turret && !canHaveTurret(record)) out.push(finding("type", "note", `A ${record.motive === "vtol" ? "VTOL" : row.air ? row.label.toLowerCase() : "convertible"} Support Vehicle carries no turret, so the turret setting is kept but counts for nothing.`, { where: { field: "turret" }, cite: SV_PAGES.structure }));
    return out;
  },
};

/** A modification's restriction as a sentence for a finding. */
const modProblem = (mod: SvMod, record: SupportVehicleRecord): string | undefined => {
  if (!modFits(mod, record)) return `${mod.label}: ${mod.only.replace(/\.$/, "")}.`;
  const clash = record.structure.mods.find((held) => mod.excludes?.includes(held as never) === true);
  return clash === undefined ? undefined : `${mod.label} may not be combined with ${svModOf(clash)?.label ?? clash}.`;
};

const chassisCheck: SvCheck = {
  id: "chassis",
  run({ record }) {
    const out: Finding[] = [];
    const letter = record.structure.rating;
    if (!/^[A-F]$/.test(letter)) {
      out.push(finding("chassis", "error", `A Structural Tech Rating is a letter from A to F; ${quoted(letter)} is not one.`, { where: { field: "structure.rating" }, cite: SV_PAGES.structure }));
      return out;
    }
    const min = minRatingOf(record);
    if (min !== undefined && letter < min) out.push(finding("chassis", "error", `This weight and these modifications need a Structural Tech Rating of at least ${min}; the unit has ${letter}.`, { where: { field: "structure.rating" }, cite: SV_PAGES.structure }));
    for (const id of record.structure.mods) {
      const mod = svModOf(id);
      if (mod === undefined) {
        out.push(finding("chassis", "warning", `We do not know the chassis modification ${quoted(id)}, so its weight is left out.`, { where: { field: "structure.mods" } }));
        continue;
      }
      const problem = modProblem(mod, record);
      if (problem !== undefined) out.push(finding("chassis", "error", problem, { where: { field: "structure.mods" }, cite: SV_PAGES.modifications }));
    }
    const chassis = structureTons(record);
    if (chassis !== null && record.structure.mods.includes("trailer") && record.engine.type !== "none") out.push(finding("chassis", "note", "A trailer needs no engine or controls unless it must move without a tractor; choose no engine to build it without.", { where: { field: "engine" }, cite: SV_PAGES.engine }));
    if (record.structure.mods.includes("ultra-light") && record.armor.bar > ULTRA_LIGHT_BAR) out.push(finding("armor", "error", `An ultra-light chassis may not carry armor better than BAR ${String(ULTRA_LIGHT_BAR)}.`, { where: { field: "armor.bar" }, cite: SV_PAGES.modifications }));
    if (record.structure.mods.includes("omni")) out.push(finding("chassis", "note", "The Omni modification is recorded and costed, but this editor does not split a unit into a base configuration and pods: build each configuration as its own unit.", { where: { field: "structure.mods" }, cite: SV_PAGES.modifications }));
    return out;
  },
};

const weightCheck: SvCheck = {
  id: "weight",
  run({ record, catalog }) {
    const tally = svTally(record, catalog);
    const out: Finding[] = [];
    if (tally.unknown.length > 0) out.push(finding("weight", "warning", `We could not weigh ${tally.unknown.join(", ")}, so the total leaves them out.`, { where: { field: "mounts" } }));
    if (tally.total > record.tons) out.push(finding("weight", "error", `The parts weigh ${tons(tally.total)}, which is ${tons(tally.total - record.tons)} over the unit's ${tons(record.tons)}.`, { where: { field: "tons" }, cite: SV_PAGES.weights }));
    else if (tally.total < record.tons) out.push(finding("weight", "note", `${tons(record.tons - tally.total)} are not used: they may be cargo space where the unit has a slot to spare, or are wasted.`, { where: { field: "tons" }, cite: SV_PAGES.weights }));
    return out;
  },
};

const engineCheck: SvCheck = {
  id: "engine",
  run({ record }) {
    const out: Finding[] = [];
    const type = record.engine.type;
    if (type === "none") {
      if (!record.structure.mods.includes("trailer")) out.push(finding("engine", "error", "Only a trailer may go without an engine.", { where: { field: "engine" }, cite: SV_PAGES.engine }));
      return out;
    }
    const engine = svEngineOf(type);
    if (engine === undefined) {
      out.push(finding("engine", "error", `${quoted(type)} is not an engine type a Support Vehicle uses.`, { where: { field: "engine" }, cite: SV_PAGES.engine }));
      return out;
    }
    if (!enginePossible(type, record)) out.push(finding("engine", "error", `A ${svMotiveRowOf(record)?.label.toLowerCase() ?? record.motive} Support Vehicle may not use a ${engine.label.toLowerCase()} engine${record.motive === "fixed-wing" && engine.electric ? " without the propeller modification" : ""}.`, { where: { field: "engine" }, cite: SV_PAGES.engine }));
    if (!/^[A-F]$/.test(record.engine.rating)) {
      out.push(finding("engine", "error", `An engine's Tech Rating is a letter from A to F; ${quoted(record.engine.rating)} is not one.`, { where: { field: "engine.rating" }, cite: SV_PAGES.engine }));
      return out;
    }
    if (engine.multiplier["ABCDEF".indexOf(record.engine.rating)] === null) out.push(finding("engine", "error", `There is no ${engine.label.toLowerCase()} engine at Tech Rating ${record.engine.rating}.`, { where: { field: "engine.rating" }, cite: SV_PAGES.engine }));
    const air = isAir(record);
    if (!Number.isFinite(record.cruise) || record.cruise <= 0) {
      out.push(finding("engine", "error", air ? "Safe Thrust must be more than 0." : "Cruising MP is a whole number of 1 or more.", { where: { field: "cruise" }, cite: SV_PAGES.engine }));
      return out;
    }
    if (record.motive === "airship") {
      if (record.cruise > 2) out.push(finding("engine", "error", `An airship's Safe Thrust is at most 2; this one is ${num(record.cruise)}.`, { where: { field: "cruise" }, cite: SV_PAGES.engine }));
      if (!Number.isInteger(tidy(record.cruise * 4))) out.push(finding("engine", "error", "An airship's Safe Thrust goes in steps of a quarter point.", { where: { field: "cruise" }, cite: SV_PAGES.engine }));
    } else if (!Number.isInteger(record.cruise)) out.push(finding("engine", "error", air ? "Safe Thrust is a whole number." : "Cruising MP is a whole number.", { where: { field: "cruise" }, cite: SV_PAGES.engine }));
    const weight = engineTons(record);
    if (weight === null) out.push(finding("engine", "warning", "We cannot work out the engine weight for these figures.", { where: { field: "engine" }, cite: SV_PAGES.engine }));
    else {
      const note = engineMinimumNote(record);
      if (note !== undefined) out.push(finding("engine", "note", note, { where: { field: "engine" }, cite: SV_PAGES.engine }));
    }
    if (record.structure.mods.includes("hydrofoil") && record.motive === "naval") out.push(finding("engine", "note", `The hydrofoil modification multiplies the Cruising MP by 1.25 in play; the engine above is sized on the ${num(record.cruise)} MP.`, { where: { field: "cruise" }, cite: SV_PAGES.modifications }));
    out.push(finding("engine", "note", `Flank ${air ? "(Maximum Thrust)" : "MP"} is ${num(flankMP(record))}.`, { where: { field: "cruise" }, cite: SV_PAGES.engine }));
    return out;
  },
};

const fuelCheck: SvCheck = {
  id: "fuel",
  run({ record }) {
    const out: Finding[] = [];
    if (record.engine.type === "none" || svEngineOf(record.engine.type) === undefined) return out;
    const lot = isSmall(record) ? 0.001 : 0.5;
    if (record.fuelTons < 0 || !Number.isInteger(tidy(record.fuelTons / lot))) out.push(finding("fuel", "error", isSmall(record) ? "Fuel is weighed to the kilogram." : "Fuel is weighed in half tons.", { where: { field: "fuelTons" }, cite: SV_PAGES.fuel }));
    if (!needsFuel(record)) {
      if (record.fuelTons > 0) out.push(finding("fuel", "note", "This engine burns no fuel, so the fuel weight does nothing.", { where: { field: "fuelTons" }, cite: SV_PAGES.fuel }));
      return out;
    }
    if (record.fuelTons === 0) out.push(finding("fuel", "warning", "This engine needs fuel and the unit carries none; every fuel-burning Support Vehicle gives some weight to it.", { where: { field: "fuelTons" }, cite: SV_PAGES.fuel }));
    else if (isAir(record)) out.push(finding("fuel", "note", `${tons(record.fuelTons)} of fuel is ${String(fuelPoints(record) ?? "?")} Fuel Points.`, { where: { field: "fuelTons" }, cite: SV_PAGES.fuel }));
    else {
      const percent = fuelPercent(record);
      const range = rangeKm(record);
      if (range !== null && percent !== null) out.push(finding("fuel", "note", `${tons(record.fuelTons)} of fuel is a range of ${String(range)} km (${num(percent)} percent of the engine weight for each 100 km).`, { where: { field: "fuelTons" }, cite: SV_PAGES.fuel }));
    }
    return out;
  },
};

const armorCheck: SvCheck = {
  id: "armor",
  run({ record }) {
    const out: Finding[] = [];
    const { bar, rating } = record.armor;
    const cell = armorCell(bar, rating);
    if (!/^[A-F]$/.test(rating) || !Number.isInteger(bar) || bar < 2 || bar > 10) out.push(finding("armor", "error", `Support Vehicle armor is BAR 2 to 10 at Tech Rating A to F; BAR ${num(bar)} at ${quoted(rating)} is not in the table.`, { where: { field: "armor.bar" }, cite: SV_PAGES.armor }));
    else if (cell === undefined) out.push(finding("armor", "error", `There is no BAR ${String(bar)} armor at Tech Rating ${rating}.`, { where: { field: "armor.bar" }, cite: SV_PAGES.armor }));
    else if (armoredOnlyBar(record) && !record.structure.mods.includes("armored")) out.push(finding("armor", "error", `BAR ${String(bar)} armor at Tech Rating ${rating} needs the Armored chassis modification.`, { where: { field: "armor.bar" }, cite: SV_PAGES.armor }));
    if (Number.isInteger(bar) && bar >= 2 && bar <= 10 && !barPossible(bar, record) && bar !== record.armor.bar) out.push(finding("armor", "warning", `BAR ${String(bar)} armor is not available at this unit's year or rules level.`, { where: { field: "armor.bar" } }));
    const here = armorLocations(record);
    const assigned = assignedArmor(record);
    const max = maxArmorPoints(record);
    if (max !== null && assigned > max) out.push(finding("armor", "error", `${plural(assigned, "armor point")} are assigned; a ${tons(record.tons)} unit of this type takes at most ${String(max)}.`, { where: { field: "armor.points" }, cite: SV_PAGES.armor }));
    for (const [loc, points] of Object.entries(record.armor.points)) {
      if (points < 0 || !Number.isInteger(points)) out.push(finding("armor", "error", `${svLocationName(loc, record)} armor is a whole number of points of 0 or more.`, { where: { field: `armor.points.${loc}` }, cite: SV_PAGES.armor }));
      else if (!here.includes(loc) && points > 0) out.push(finding("armor", "warning", `${svLocationName(loc, record)} has ${plural(points, "armor point")}, but this unit has no such location.`, { where: { field: `armor.points.${loc}` } }));
    }
    if (record.motive === "vtol" && (record.armor.points["rot"] ?? 0) > SV_ROTOR_MAX) out.push(finding("armor", "error", `A rotor holds at most ${plural(SV_ROTOR_MAX, "armor point")}; this one has ${String(record.armor.points["rot"])}.`, { where: { field: "armor.points.rot" }, cite: SV_PAGES.armor }));
    const needsOne = record.structure.mods.some((m) => ["armored", "amphibious", "environmental-sealing", "submersible"].includes(m));
    if (needsOne) for (const loc of here) if ((record.armor.points[loc] ?? 0) < 1) out.push(finding("armor", "error", `With the Armored, Amphibious, Environmental sealing or Submersible modification each location holds at least 1 armor point; the ${svLocationName(loc, record)} holds none.`, { where: { field: `armor.points.${loc}` }, cite: SV_PAGES.armor }));
    const weight = armorTons(record);
    if (weight !== null && assigned > 0) out.push(finding("armor", "note", `${plural(assigned, "armor point")} of BAR ${String(bar)} armor weigh ${tons(weight)}.`, { where: { field: "armor.points" }, cite: SV_PAGES.armor }));
    const slots = armorSlots(record);
    if (slots > 0) out.push(finding("armor", "note", `BAR 10 armor at Tech Rating ${rating} takes ${plural(slots, "item slot")}, as ferro-fibrous armor does.`, { where: { field: "armor.bar" }, cite: { book: "TechManual errata v8.0", page: 8 } }));
    return out;
  },
};

const heatCheck: SvCheck = {
  id: "heat",
  run({ record, catalog }) {
    const out: Finding[] = [];
    const heat = energyHeat(record, catalog);
    const sinks = record.heatSinks.count;
    if (!Number.isInteger(sinks) || sinks < 0) out.push(finding("heat", "error", "The number of heat sinks is a whole number of 0 or more.", { where: { field: "heatSinks" }, cite: SV_PAGES.space }));
    else if (sinks < heat) out.push(finding("heat", "error", `Firing every heavy energy weapon at once makes ${plural(heat, "point")} of heat, and the unit has ${plural(sinks, "heat sink")}.`, { where: { field: "heatSinks" }, cite: { book: "TechManual", page: 133 } }));
    if (heat === 0 && sinks > 0) out.push(finding("heat", "note", "The unit carries no heavy energy weapon, so it needs no heat sinks; a Support Vehicle's engine gives none free.", { where: { field: "heatSinks" }, cite: { book: "TechManual", page: 133 } }));
    const amps = amplifierTons(record, catalog);
    if (amps > 0) out.push(finding("heat", "note", `This engine is not a fission or fusion one, so the heavy energy weapons need power amplifiers: ${tons(amps)}, in the weight and taking no slot.`, { where: { field: "engine" }, cite: { book: "TechManual", page: 137 } }));
    return out;
  },
};

const BAD_PLACE: Record<string, string> = { rot: "The rotor carries no equipment." };

function unavailableReason(row: EquipmentRow, record: SupportVehicleRecord, catalog: Catalog): string {
  const level = equipmentLevel(row);
  const phase = equipmentPhase(row, { ...record, unitType: "mech" }, catalog);
  const needs = levelIn(level, phase, row.prototypeLevel);
  return !levelAtLeast(record.rulesLevel ?? DEFAULT_LEVEL, needs) ? `needs ${levelRow(needs).label} rules` : "is not available to this unit's tech base, year or era";
}

const equipmentCheck: SvCheck = {
  id: "equipment",
  run({ record, catalog }) {
    const out: Finding[] = [];
    const places = mountLocations(record);
    const slots = slotTally(record, catalog);
    if (slots.used > slots.available) {
      const why = slots.lost.map((l) => `${plural(l.slots, "slot")} to the ${l.label}`).join(" and ");
      out.push(finding("equipment", "error", `The items use ${plural(slots.used, "slot")}, but the unit has ${slots.available} (${baseSlots(record)} for its weight${why === "" ? "" : `, less ${why}`}).`, { where: { field: "mounts" }, cite: SV_PAGES.space }));
    }
    const small = isSmall(record);
    for (const m of record.mounts) {
      const row = rowOf(m, record, catalog);
      const name = m.name || "an unnamed item";
      const at = { mountId: m.id };
      if (m.equipmentId === null || row === undefined) {
        out.push(finding("equipment", "warning", `${name} is not in our equipment table, so its weight, slots and rules are not checked.`, { where: at }));
      } else {
        const facts = itemFacts(m, record, catalog);
        if (row.infantry !== undefined) {
          if (!small) out.push(finding("equipment", "error", `${row.name} is a Light or Medium weapon; a Support Vehicle of 5 tons or more mounts Heavy weapons only.`, { where: at, cite: { book: "TechManual", page: 136 } }));
          else if (!lightMedium(row)) out.push(finding("equipment", "error", `${row.name} is a melee weapon; a Small Support Vehicle mounts the Standard and Support weapons of the infantry table.`, { where: at, cite: { book: "TechManual", page: 136 } }));
        } else if (row.choiceFor !== undefined || !mountableOn(row, "vehicle") || svSlotsOf(row) === null) {
          out.push(finding("equipment", "error", `${row.name} is not printed for Support Vehicles.`, { where: at, cite: row.cite }));
        } else if (largeOnly(row) && sizeOf(record) !== "large") {
          out.push(finding("equipment", "error", `${row.name} is for Large Support Vehicles only.`, { where: at, cite: row.cite }));
        } else if (small && row.kind === "weapon") {
          out.push(finding("equipment", "error", `${row.name} is a Heavy weapon; a Small Support Vehicle mounts Light and Medium weapons only.`, { where: at, cite: { book: "TechManual", page: 136 } }));
        }
        if (row.infantry === undefined && !equipmentOffered(row, record, catalog)) out.push(finding("equipment", "warning", `${row.name} ${unavailableReason(row, record, catalog)}.`, { where: at, cite: row.cite }));
        const choices = choicesFor(row, catalog, record.editionId);
        if (choices.length > 0) {
          const chosen = chosenMunition(row, m.munition, catalog, record.editionId);
          if (m.munition !== undefined && !choices.some((c) => c.id === m.munition)) out.push(finding("equipment", "note", `${name} names the munition ${quoted(m.munition)}, which it does not take; it counts as ${chosen?.name ?? "the standard type"}.`, { where: at, cite: row.cite }));
          else if (chosen !== undefined && !equipmentOffered(asEquipment(chosen, "vehicle"), record, catalog)) out.push(finding("equipment", "warning", `${chosen.name} ${unavailableReason(chosen, record, catalog)}.`, { where: at, cite: chosen.cite }));
        }
        if (facts.ammo) {
          const least = SMALL_BIN.test(row.id.replace(/^ammo-/, "")) ? AMMO_SMALL_MIN_TONS : AMMO_MIN_TONS;
          if ((facts.tons ?? 0) < least) out.push(finding("equipment", "error", `${name} is a bin of ${tons(facts.tons ?? 0)}; a bin of this ammunition is at least ${tons(least)}.`, { where: at, cite: { book: "TechManual", page: 137 } }));
        }
        if (m.location === "body" && facts.weapon) out.push(finding("equipment", "error", `${name} is a weapon in the body, which has no firing arc; put it in a side, the rear, the front or the turret.`, { where: at, cite: { book: "TechManual", page: 136 } }));
        if (m.pintle === true) {
          if (!small || record.motive === "fixed-wing" || record.motive === "naval") out.push(finding("equipment", "error", "A pintle mount is for Small Support Vehicles, and not for fixed-wing or naval ones.", { where: at, cite: { book: "TechManual", page: 234 } }));
          if (!facts.infantry && facts.weapon) out.push(finding("equipment", "error", `${name}: a pintle carries Light and Medium weapons only.`, { where: at, cite: { book: "TechManual", page: 137 } }));
          if (!["f", "l", "r", "b"].includes(m.location)) out.push(finding("equipment", "error", `${name}: a pintle sits in the front, a side or the rear.`, { where: at, cite: { book: "TechManual", page: 137 } }));
        }
      }
      if (own(BAD_PLACE, m.location)) out.push(finding("equipment", "error", `${name}: ${BAD_PLACE[m.location]}`, { where: at, cite: { book: "TechManual", page: 136 } }));
      else if (!places.includes(m.location)) out.push(finding("equipment", "error", m.location === "t" ? `${name} is in the turret, and the unit has none.` : `${name} is in ${quoted(m.location)}, which this unit does not have.`, { where: at, cite: { book: "TechManual", page: 136 } }));
    }
    const weapons = new Set<string>();
    const ammo = new Set<string>();
    for (const m of record.mounts) {
      const row = rowOf(m, record, catalog);
      if (!row) continue;
      if (row.kind === "weapon") weapons.add(row.id);
      if (row.kind === "ammunition") ammo.add(row.id);
    }
    for (const id of weapons) if (catalog.byId(ammoIdOf(id)) !== undefined && !ammo.has(ammoIdOf(id))) out.push(finding("equipment", "warning", `${catalog.byId(id)?.name ?? id} has no ammunition on the unit.`, { where: { field: "mounts" }, cite: { book: "TechManual", page: 137 } }));
    for (const id of ammo) {
      const weapon = id.replace(/^ammo-/, "");
      if (![...weapons].some((w) => w === weapon || catalog.byId(id)?.feeds !== undefined)) out.push(finding("equipment", "note", `${catalog.byId(id)?.name ?? id} has no weapon on the unit that fires it.`, { where: { field: "mounts" } }));
    }
    return out;
  },
};

const crewCheck: SvCheck = {
  id: "crew",
  run({ record, catalog }) {
    const out: Finding[] = [];
    const crew = crewTally(record, catalog);
    out.push(finding("crew", "note", `The rules ask for a crew of ${String(crew.minimum)}: ${[`${String(crew.base)} base`, crew.nonGunners > 0 ? `${String(crew.nonGunners)} to run communications, kitchen and medical gear` : "", crew.gunners > 0 ? `${String(crew.gunners)} gunners` : "", crew.officers > 0 ? `${String(crew.officers)} officers` : ""].filter((s) => s !== "").join(", ")}.`, { where: { field: "extraCrew" }, cite: SV_PAGES.crew }));
    if (!Number.isInteger(record.extraCrew) || record.extraCrew < 0) out.push(finding("crew", "error", "Extra crew is a whole number of 0 or more.", { where: { field: "extraCrew" }, cite: SV_PAGES.crew }));
    if (isSmall(record)) {
      const seats = seatsAboard(record, catalog);
      if (seats < crew.crew) out.push(finding("crew", "warning", `A Small Support Vehicle weighs a seat for everyone aboard; it has ${plural(seats, "seat")} for a crew of ${String(crew.crew)}.`, { where: { field: "mounts" }, cite: { book: "TechManual", page: 133 } }));
    }
    if (record.fireControl === "none" && crew.gunners > 0) out.push(finding("crew", "note", "Without fire control every attack takes +2 to hit; basic fire control gives +1 and advanced +0, and both reduce the gunners.", { where: { field: "fireControl" }, cite: SV_PAGES.crew }));
    return out;
  },
};

const timeCheck: SvCheck = {
  id: "time",
  run({ record }) {
    const level = record.rulesLevel ?? DEFAULT_LEVEL;
    const out: Finding[] = [];
    if (level !== "introductory" && record.year === null) out.push(finding("time", "warning", `A year is needed at ${levelRow(level).label} rules: it decides which parts and equipment are available.`, { where: { field: "year" } }));
    else if (record.year !== null && eraNeedsPick(record)) out.push(finding("time", "note", `The year ${num(record.year)} falls in two eras; pick one, since it decides the tech base.`, { where: { field: "era" } }));
    return out;
  },
};

const OFFICIAL_ID = "official";
/** The design as the OFFICIAL mark sees it: everything but the name, the notes, the picture, the mark and the rules level. */
export function svDesignKey(record: SupportVehicleRecord): string {
  const design: Record<string, unknown> = { ...record };
  for (const key of ["name", "notes", "picture", "official", "rulesLevel", "id"]) delete design[key];
  design.mounts = record.mounts.map((m) => canon({ ...m, id: undefined })).sort();
  return canon(design);
}
export function markSvOfficial(draft: SupportVehicleRecord, book: string, page?: number | null): void {
  const named = book.trim();
  if (!named) return;
  draft.official = { status: "official", book: named, design: svDesignKey(draft), ...(page !== undefined && page !== null && Number.isInteger(page) && page > 0 ? { page } : {}) };
}
export function svOfficialState(record: SupportVehicleRecord): OfficialState {
  const mark = record.official;
  const book = mark?.book?.trim();
  if (mark?.status !== "official" || !book || mark.design === undefined) return { official: false };
  if (mark.design !== svDesignKey(record)) return { official: false, changedFrom: book };
  return mark.page === undefined ? { official: true, book } : { official: true, book, page: mark.page };
}
const officialCheck: SvCheck = {
  id: OFFICIAL_ID,
  run({ record }) {
    const state = svOfficialState(record);
    return !state.official && state.changedFrom !== undefined ? [finding(OFFICIAL_ID, "note", `Marked official, but ${officialLabel(state).detail}.`, { where: { field: "official" } })] : [];
  },
};

/** Cruising and flank MP, or Safe and Maximum Thrust, so the panel and the sheet say it from one place. */
export const speedText = (record: Pick<SupportVehicleRecord, "cruise" | "motive">): string => (isAir(record) ? `Safe Thrust ${num(record.cruise)}, Maximum Thrust ${num(flankMP(record))}` : `${num(record.cruise)} cruising, ${num(flankMP(record))} flank`);

export const SV_CHECKS: SvCheck[] = [typeCheck, chassisCheck, weightCheck, engineCheck, fuelCheck, armorCheck, heatCheck, equipmentCheck, crewCheck, timeCheck, officialCheck];

/** Every finding for the unit. Never throws: a check that fails on a record it does not understand gives a note. */
export function checkSv(record: SupportVehicleRecord, catalog: Catalog): Finding[] {
  return SV_CHECKS.flatMap((check) => {
    try {
      return check.run({ record, catalog });
    } catch {
      return [finding(check.id, "note", `The ${check.id} check could not read this unit.`)];
    }
  });
}
