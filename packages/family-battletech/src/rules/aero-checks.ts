// The rules check for aerospace units (AeroTech, every edition): findings with the printed page they rest on, the rules level in the
// current edition, and "Check under" another edition. This file covers the fighters; the small craft, DropShip and capital ship checks
// join the table at the end (`AERO_CHECKS`) when their construction pieces land. Findings are advice, never refusals: nothing is removed
// from a record and nothing throws on one this version does not understand. Each edition keeps its own figures and errata, so a unit is
// always read against the edition asked for. Messages are our own words and state the numbers; a finding names the deciding book through
// its cite. Older editions predate the seven rules levels and show none.
import { ARMOR, ENGINE_TYPES, MIXED_TECHNOLOGY, PATCHWORK_ARMOR } from "../data/chassis";
import type { RulesLevel } from "../data/chassis";
import { CAPITAL_FIGURES, CRAFT_FIGURES, DEFAULT_AERO_EDITION, FIGHTER_ARMOR_TYPES, FIGHTER_FIGURES, fighterPatchworkTypes, aeroEditionName, aeroTypesFor, figureOf, kindFigureOf } from "../data/aero";
import type { AeroTypeRow, FigureGroup, FighterKind, FighterPatchworkType } from "../data/aero";
import { AERO_WEAPON_EDITIONS, aeroWeaponOffered } from "../data/aero-weapons";
import { armorTypeAt, fighterArcs, fighterArmor, fighterArmorLimit, fighterArmorTons, fighterPatchworkActive, energyWeaponHeat, fighterHeat, fighterKind, fighterPartsNotOffered, fighterTally, engineRating, fuelPoints, locationsOf, vessel, wingsMatch, aeroLocationName } from "./aero";
import type { AeroRecord } from "./aero";
import { partPhase } from "./availability";
import type { Catalog } from "./catalog";
import { VESSEL_CHECKS } from "./aero-vessel-checks";
import { DEFAULT_LEVEL, LEVEL_ORDER, equipmentLevel, levelAtLeast, levelIn, levelRow, mixedPhase, partLevel, patchworkPhase } from "./levels";
import { canon, officialLabel } from "./official";
import type { OfficialState } from "./official";
import { partPrototype, partSpans, phaseIn, windowOf, datesText } from "./time";
import type { Phase } from "./time";
import { own, tidy } from "./walk";

export interface AeroFinding {
  /** The id of the check that gave it (`AERO_CHECKS`). */
  check: string;
  level: "error" | "warning" | "note";
  message: string;
  where?: { field?: string; mountId?: string; arc?: string };
  /** The deciding book and printed page, as the data tables write them ("TechManual, p. 191"); absent where no one page decides it. */
  cite?: string;
}

export interface AeroCheckInput {
  record: AeroRecord;
  catalog: Catalog;
}
export interface AeroCheck {
  id: string;
  run(input: AeroCheckInput): AeroFinding[];
}

const num = (n: number): string => String(tidy(n));
const bookPage = (cite: { book: string; page: number }): string => `${cite.book}, p. ${String(cite.page)}`;
/** The page an edition prints a figure on; undefined where the edition prints none. */
const pageOf = <T>(group: FigureGroup<T>, editionId: string): string | undefined => group.find((row) => row.editions.includes(editionId))?.cite[editionId];
const kindPageOf = <T>(group: Record<FighterKind, FigureGroup<T>>, kind: FighterKind, editionId: string): string | undefined => pageOf(group[kind], editionId);
const withCite = (cite: string | undefined): { cite?: string } => (cite === undefined ? {} : { cite });
const typeRow = (record: AeroRecord): AeroTypeRow | undefined => aeroTypesFor(record.editionId).find((row) => row.type === record.unitType);
const KIND_NAMES: Record<FighterKind, string> = { aerospace: "aerospace", conventional: "conventional" };

// ---- The checks ---------------------------------------------------------------------------------------------------------------

/** The unit type, and its weight against the edition's range and step. */
const typeCheck: AeroCheck = {
  id: "type",
  run({ record }) {
    const edition = aeroEditionName(record.editionId);
    const row = typeRow(record);
    if (!row) return [{ check: "type", level: "warning", message: `${edition} does not build a unit of the type "${record.unitType}".`, where: { field: "unitType" } }];
    const { min, max, step } = row.weight;
    const out: AeroFinding[] = [];
    const where = { field: "tons" };
    if (min !== undefined && record.tons < min) out.push({ check: "type", level: "error", message: `At ${num(record.tons)} tons the unit is under the ${num(min)} tons ${edition} allows a ${row.label.toLowerCase()}.`, where, cite: row.cite });
    if (max !== undefined && record.tons > max) out.push({ check: "type", level: "error", message: `At ${num(record.tons)} tons the unit is over the ${num(max)} tons ${edition} allows a ${row.label.toLowerCase()}.`, where, cite: row.cite });
    if (step !== undefined && min !== undefined && tidy((record.tons - min) % step) !== 0) out.push({ check: "type", level: "warning", message: `${edition} builds a ${row.label.toLowerCase()} in steps of ${num(step)} tons; ${num(record.tons)} is not on a step.`, where, cite: row.cite });
    return out;
  },
};

/** The weight tally against the unit's tons. */
const weightCheck: AeroCheck = {
  id: "weight",
  run({ record, catalog }) {
    if (!typeRow(record)) return [];
    const ship = vessel(record, catalog);
    if (!fighterKind(record) && !ship) return [];
    const tally = ship ? ship.tally : fighterTally(record, catalog);
    const out: AeroFinding[] = [];
    if (tally.remaining < 0) out.push({ check: "weight", level: "error", message: `The parts weigh ${num(tally.total)} tons, ${num(-tally.remaining)} over the unit's ${num(record.tons)}.`, where: { field: "tons" } });
    else if (tally.remaining > 0 && tally.unknown.length === 0) out.push({ check: "weight", level: "note", message: ship ? `${num(tally.remaining)} tons of the unit's ${num(record.tons)} are left over, which the book counts as cargo space.` : `${num(tally.remaining)} tons of the unit's ${num(record.tons)} are not used.`, where: { field: "tons" } });
    const mounts = tally.unknown.filter((id) => id !== "engine");
    if (mounts.length > 0) out.push({ check: "weight", level: "note", message: `${String(mounts.length)} item${mounts.length === 1 ? "" : "s"} could not be weighed because we have no weight for ${mounts.length === 1 ? "it" : "them"}, so the total is short.`, where: { field: "mounts" } });
    return out;
  },
};

/** Engine rating against the edition's range, and the engine, armor and heat sink types the edition offers. */
const engineCheck: AeroCheck = {
  id: "engine",
  run({ record }) {
    const kind = fighterKind(record);
    if (!kind) {
      // A small craft, DropShip or capital ship: the parts its edition does not offer (the page is the engine step's).
      const ship = vessel(record);
      if (!ship) return [];
      const name = aeroEditionName(record.editionId);
      const page = ship.group === "capital" ? pageOf(CAPITAL_FIGURES.engine, record.editionId) : pageOf(CRAFT_FIGURES.engineShare, record.editionId);
      const says: Record<string, string> = {
        engine: `${name} does not offer a "${record.engine.type}" engine to this unit.`,
        armor: `${name} does not offer "${record.armor.type}" armor to this unit.`,
        "heat-sinks": `${name} does not offer ${record.heatSinks.type} heat sinks to this unit.`,
      };
      const fields: Record<string, string> = { engine: "engine", armor: "armor.type", "heat-sinks": "heatSinks" };
      return ship.notOffered.map((part) => ({ check: "engine", level: "warning" as const, message: says[part] ?? "", where: { field: fields[part] ?? "" }, ...withCite(page) }));
    }
    const out: AeroFinding[] = [];
    const rating = engineRating(record);
    const limits = figureOf(FIGHTER_FIGURES.ratingLimits, record.editionId);
    if (rating !== null && limits && (rating < limits.min || rating > limits.max)) {
      out.push({ check: "engine", level: "error", message: `The engine rating is ${num(rating)}; ${aeroEditionName(record.editionId)} allows ${num(limits.min)} to ${num(limits.max)}.`, where: { field: "thrust" }, ...withCite(pageOf(FIGHTER_FIGURES.ratingLimits, record.editionId)) });
    }
    const notOffered = fighterPartsNotOffered(record);
    const edition = aeroEditionName(record.editionId);
    if (notOffered.includes("engine")) out.push({ check: "engine", level: "warning", message: `${edition} does not offer a "${record.engine.type}" engine to a ${KIND_NAMES[kind]} fighter.`, where: { field: "engine" }, ...withCite(kindPageOf(FIGHTER_FIGURES.engineTypes, kind, record.editionId)) });
    if (notOffered.includes("armor")) out.push({ check: "engine", level: "warning", message: `${edition} does not offer "${record.armor.type}" armor to a fighter.`, where: { field: "armor.type" }, ...withCite(pageOf(FIGHTER_FIGURES.armorBasePoints, record.editionId)) });
    if (notOffered.includes("heat-sinks")) out.push({ check: "engine", level: "warning", message: `${edition} does not offer ${record.heatSinks.type} heat sinks to a ${KIND_NAMES[kind]} fighter.`, where: { field: "heatSinks" }, ...withCite(kindPageOf(FIGHTER_FIGURES.heatSinkTypes, kind, record.editionId)) });
    return out;
  },
};

/** Fuel and armor bought in the lots the edition prints. */
const lotsCheck: AeroCheck = {
  id: "lots",
  run({ record }) {
    if (!fighterKind(record)) return [];
    const out: AeroFinding[] = [];
    const lots: [string, number, FigureGroup<number>, string][] = [
      ["fuel", record.fuelTons, FIGHTER_FIGURES.fuelLot, "fuelTons"],
      ["armor", fighterArmorTons(record), FIGHTER_FIGURES.armorLot, "armor.tons"],
    ];
    for (const [name, tons, group, field] of lots) {
      const lot = figureOf(group, record.editionId);
      if (lot !== undefined && tidy(tons % lot) !== 0) out.push({ check: "lots", level: "warning", message: `${aeroEditionName(record.editionId)} sells ${name} in lots of ${num(lot)} ton${lot === 1 ? "" : "s"}; ${num(tons)} is not a whole number of lots.`, where: { field }, ...withCite(pageOf(group, record.editionId)) });
    }
    return out;
  },
};

/** Fuel the unit carries (a unit with none cannot fly under power for long). */
const fuelCheck: AeroCheck = {
  id: "fuel",
  run({ record }) {
    const points = fuelPoints(record);
    return points === 0 ? [{ check: "fuel", level: "note", message: "The unit carries no fuel.", where: { field: "fuelTons" } }] : [];
  },
};

/** Armor: points set against points bought, the edition's limit, and locations it does not have. */
const armorCheck: AeroCheck = {
  id: "armor",
  run({ record }) {
    const kind = fighterKind(record);
    if (!kind) return [];
    const out: AeroFinding[] = [];
    const armor = fighterArmor(record);
    const cite = pageOf(FIGHTER_FIGURES.armorBasePoints, record.editionId);
    if (armor.over !== null && armor.over > 0) out.push({ check: "armor", level: "error", message: `${num(armor.allocated)} armor points are set but the armor gives ${num(armor.available ?? 0)}: ${num(armor.over)} too many.`, where: { field: "armor.points" }, ...withCite(cite) });
    else if (armor.over !== null && armor.over < 0) out.push({ check: "armor", level: "note", message: `${num(-armor.over)} armor points are bought and not set on any location.`, where: { field: "armor.points" } });
    if (armor.bought === null && record.armor.tons > 0) out.push({ check: "armor", level: "note", message: `We have no points-a-ton figure for "${record.armor.type}" armor in ${aeroEditionName(record.editionId)}, so its points were not checked.`, where: { field: "armor.type" } });
    const limit = fighterArmorLimit(record);
    const rule = kindFigureOf(FIGHTER_FIGURES.armorLimit, kind, record.editionId);
    if (limit && rule) {
      const tons = fighterArmorTons(record);
      const over = rule.unit === "tons" && !fighterPatchworkActive(record) ? tons > limit.tons : armor.allocated > limit.points;
      if (over) {
        const said = rule.unit === "tons" && !fighterPatchworkActive(record) ? `${num(tons)} tons of armor are over the ${num(limit.tons)} tons` : `${num(armor.allocated)} armor points are over the ${num(limit.points)} points`;
        out.push({ check: "armor", level: "error", message: `${said} ${aeroEditionName(record.editionId)} lets a ${num(record.tons)}-ton ${KIND_NAMES[kind]} fighter carry.`, where: { field: "armor.points" }, ...withCite(kindPageOf(FIGHTER_FIGURES.armorLimit, kind, record.editionId)) });
      }
    }
    const known = locationsOf(record).armor;
    for (const [loc, points] of Object.entries(record.armor.points)) {
      if (points > 0 && known.length > 0 && !known.includes(loc)) out.push({ check: "armor", level: "warning", message: `${num(points)} armor points sit on ${aeroLocationName(loc)}, which a ${aeroEditionName(record.editionId)} unit of this type does not have.`, where: { field: `armor.points.${loc}` }, ...withCite(typeRow(record)?.cite) });
    }
    return out;
  },
};

/** Heat: sinks the engine gives free are counted in; this reports only what the edition's figures show. */
const heatCheck: AeroCheck = {
  id: "heat",
  run({ record, catalog }) {
    if (!fighterKind(record) || record.mounts.length === 0) return [];
    const heat = fighterHeat(record);
    // A conventional fighter makes heat only from its energy weapons, and its sinks must cover all of it.
    if (fighterKind(record) === "conventional" && figureOf(FIGHTER_FIGURES.energyHeatSinks, record.editionId) !== undefined) {
      const energy = energyWeaponHeat(record, catalog);
      return energy > heat.capacity ? [{ check: "heat", level: "error", message: `The energy weapons make ${num(energy)} heat and the sinks take away ${num(heat.capacity)}: a conventional fighter needs sinks for all of it.`, where: { field: "heatSinks" }, ...withCite(pageOf(FIGHTER_FIGURES.energyHeatSinks, record.editionId)) }] : [];
    }
    const generated = tidy(
      record.mounts.reduce((sum, m) => {
        const row = m.equipmentId === null ? undefined : catalog.byId(m.equipmentId);
        return sum + (row?.kind === "weapon" ? (row.by?.aero?.heat ?? row.heat ?? 0) : 0);
      }, 0),
    );
    return generated > heat.capacity ? [{ check: "heat", level: "note", message: `Firing every weapon makes ${num(generated)} heat and the sinks take away ${num(heat.capacity)}.`, where: { field: "heatSinks" }, ...withCite(pageOf(FIGHTER_FIGURES.freeHeatSinks, record.editionId)) }] : [];
  },
};

/** Arcs: items an arc holds, the aft arc's weight, unlike wings, and arcs and aft fire the edition lacks. */
const arcsCheck: AeroCheck = {
  id: "arcs",
  run({ record, catalog }) {
    const kind = fighterKind(record);
    if (!kind) return [];
    const out: AeroFinding[] = [];
    const edition = aeroEditionName(record.editionId);
    const armsCite = pageOf(FIGHTER_FIGURES.arms, record.editionId);
    for (const arc of fighterArcs(record, catalog)) {
      if (arc.items > arc.limit) out.push({ check: "arcs", level: "error", message: `The ${aeroLocationName(arc.arc)} arc holds ${num(arc.items)} items; ${edition} allows ${num(arc.limit)}.`, where: { arc: arc.arc }, ...withCite(armsCite) });
      if (arc.tonsLimit !== undefined && arc.weaponTons > arc.tonsLimit) out.push({ check: "arcs", level: "error", message: `The ${aeroLocationName(arc.arc)} arc holds ${num(arc.weaponTons)} tons of weapons; ${edition} allows ${num(arc.tonsLimit)}.`, where: { arc: arc.arc }, ...withCite(armsCite) });
    }
    if (!wingsMatch(record, catalog)) out.push({ check: "arcs", level: "error", message: `The wings must carry the same weapons in ${edition}; the left and right wing differ.`, where: { arc: "LW" }, ...withCite(pageOf(FIGHTER_FIGURES.wingsMatch, record.editionId)) });
    const locations = locationsOf(record);
    const aftOk = locations.wingsFireAft;
    for (const mount of record.mounts) {
      if (locations.arcs.length > 0 && !locations.arcs.includes(mount.arc)) out.push({ check: "arcs", level: "warning", message: `${mount.name || "An item"} is in the ${aeroLocationName(mount.arc)} arc, which ${edition} does not give this unit.`, where: { mountId: mount.id, arc: mount.arc }, ...withCite(typeRow(record)?.cite) });
      else if (mount.aft === true && !(aftOk && (mount.arc === "LW" || mount.arc === "RW"))) out.push({ check: "arcs", level: "warning", message: `${mount.name || "An item"} is set to fire aft from the ${aeroLocationName(mount.arc)}, which ${edition} does not allow.`, where: { mountId: mount.id, arc: mount.arc }, ...withCite(typeRow(record)?.cite) });
    }
    return out;
  },
};

// Which tech base's items an aerospace unit may mount: the Step 5 tech base paragraph says a Clan unit uses only Clan items and an Inner Sphere unit
// only Inner Sphere items (printed p. 194, read against the page image); p. 183 (Choose Technology Base) gives the same for the whole unit. The
// BattleMech chapter's p. 57 is not the fighter's rule. The fighter chapter states it itself, so nothing defers to a general rule.
const AT2_EDITION = "aerotech2";
const TECH_BASE_PAGES: Record<string, string> = { [DEFAULT_AERO_EDITION]: "TechManual, p. 194", [AT2_EDITION]: "AeroTech 2, p. 46" };
const hasTable = (editionId: string): boolean => (Object.values(AERO_WEAPON_EDITIONS) as string[]).includes(editionId);

/** Equipment the edition does not list, items not in our table, and (current edition) equipment of the other tech base. */
const equipmentCheck: AeroCheck = {
  id: "equipment",
  run({ record, catalog }) {
    const out: AeroFinding[] = [];
    const edition = aeroEditionName(record.editionId);
    for (const mount of record.mounts) {
      if (mount.equipmentId === null) {
        out.push({ check: "equipment", level: "note", message: `${mount.name || "An item"} is not in our table, so it was not checked.`, where: { mountId: mount.id } });
        continue;
      }
      const row = catalog.byId(mount.equipmentId);
      if (!row) {
        out.push({ check: "equipment", level: "note", message: `${mount.name || mount.equipmentId} is not in our table, so it was not checked.`, where: { mountId: mount.id } });
        continue;
      }
      if (row.kind === "weapon" && hasTable(record.editionId) && !aeroWeaponOffered(record.editionId, mount.equipmentId)) {
        out.push({ check: "equipment", level: "warning", message: `${row.name} is not in ${edition}'s weapon list; it stays on the unit.`, where: { mountId: mount.id } });
      }
      const techPage = TECH_BASE_PAGES[record.editionId];
      // AeroTech 2 lets capital weapons serve both tech bases (p. 46).
      const bothBases = record.editionId === AT2_EDITION && row.bayClass?.startsWith("Capital") === true;
      if (techPage !== undefined && !bothBases && record.techBase !== "mixed" && row.techBase !== record.techBase && (row.kind === "weapon" || row.kind === "ammunition")) {
        out.push({ check: "equipment", level: "warning", message: `${row.name} is ${row.techBase === "clan" ? "Clan" : "Inner Sphere"} equipment on a${record.techBase === "clan" ? " Clan" : "n Inner Sphere"} unit.`, where: { mountId: mount.id }, cite: techPage });
      }
    }
    return out;
  },
};

/** The patchwork armor types a fighter's locations wear (each once, in the order met), as the edition lists them; a type the list lacks is left out (the patchwork check reports it). */
function patchworkTypesUsed(record: AeroRecord): FighterPatchworkType[] {
  const list = fighterPatchworkTypes(record.editionId);
  const ids = [...new Set(Object.entries(record.armor.points).filter(([, n]) => n > 0).map(([loc]) => armorTypeAt(record, loc)))];
  return ids.flatMap((id) => list.filter((t) => t.id === id));
}

/** Whether the editor offers patchwork armor: a fighter in the current rules whose level reaches the option's at the unit's time (Advanced from production in 3075,
 * Experimental before). A record that already holds choices keeps it shown. Hide, do not mark. */
export function fighterPatchworkOffered(record: AeroRecord): boolean {
  if (fighterKind(record) === undefined || fighterPatchworkTypes(record.editionId).length === 0) return false;
  if (Object.keys(record.armor.patchwork ?? {}).length > 0) return true;
  if (record.rulesLevel === undefined) return false;
  const phase = patchworkPhase(record);
  return phase !== null && levelAtLeast(record.rulesLevel, levelIn(PATCHWORK_ARMOR.rulesLevel, phase));
}

const PATCHWORK_CITE = bookPage(PATCHWORK_ARMOR.cite);
/** Patchwork armor the unit cannot have: choices a record holds under an edition or unit type without the option, a location the unit lacks, a type the option does not list for a fighter.
 * (The weapon slots the types take are counted in the arcs check; tons and points by location are worked out, not set.) */
const patchworkCheck: AeroCheck = {
  id: "patchwork",
  run({ record }) {
    const held = Object.entries(record.armor.patchwork ?? {}).filter(([, type]) => type !== record.armor.type);
    if (held.length === 0) return [];
    if (!fighterPatchworkActive(record)) return [{ check: "patchwork", level: "warning", message: `${aeroEditionName(record.editionId)} does not offer patchwork armor to this unit; the record keeps the choices and they are read as one armor type.`, where: { field: "armor.patchwork" }, cite: PATCHWORK_CITE }];
    const list = fighterPatchworkTypes(record.editionId);
    const known = locationsOf(record).armor;
    return held.flatMap(([loc, id]): AeroFinding[] => {
      if (known.length > 0 && !known.includes(loc)) return [{ check: "patchwork", level: "warning", message: `${aeroLocationName(loc)} wears ${id} armor, and a unit of this type has no such location.`, where: { field: `armor.patchwork.${loc}` }, cite: PATCHWORK_CITE }];
      return list.some((t) => t.id === id) ? [] : [{ check: "patchwork", level: "warning", message: `${id} armor is not one patchwork armor offers a fighter, so ${aeroLocationName(loc)} was left out of the weight.`, where: { field: `armor.patchwork.${loc}` }, cite: PATCHWORK_CITE }];
    });
  },
};

/** The current edition's dates: equipment, engine and armor against the unit's year or era (older books print no dates we read). */
const datesCheck: AeroCheck = {
  id: "dates",
  run({ record, catalog }) {
    if (record.editionId !== DEFAULT_AERO_EDITION) return [];
    const out: AeroFinding[] = [];
    const when = { era: record.era, year: record.year };
    const window = windowOf(when);
    if (window === null) return [{ check: "dates", level: "note", message: "The unit has no year or era, so availability was not checked.", where: { field: "year" } }];
    const say = (name: string, phase: Phase | null, where: AeroFinding["where"], cite?: string) => {
      if (phase === null) out.push({ check: "dates", level: "warning", message: `${name} is not on sale in the unit's time.`, where, ...withCite(cite) });
    };
    for (const mount of record.mounts) {
      const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
      if (row) say(row.name, phaseIn((catalog.rowFor(row.id, record.editionId) ?? row).availability, row.prototypeYear, window), { mountId: mount.id }, bookPage(row.cite));
    }
    const engine = own(ENGINE_TYPES.types, record.engine.type) ? ENGINE_TYPES.types[record.engine.type] : undefined;
    if (engine) say(engine.name, partPhase(engine, { ...when, techBase: record.techBase }), { field: "engine" }, bookPage(ENGINE_TYPES.cite));
    const armorType = FIGHTER_ARMOR_TYPES.find((t) => t.id === record.armor.type);
    const armorRow = armorType && own(ARMOR.types, armorType.like) ? ARMOR.types[armorType.like] : undefined;
    if (armorType && armorRow) say(armorType.name, partPhase(armorRow, { ...when, techBase: record.techBase }), { field: "armor.type" }, bookPage(ARMOR.cite));
    if (fighterPatchworkActive(record)) {
      say("Patchwork armor", patchworkPhase(when), { field: "armor.patchwork" }, bookPage(PATCHWORK_ARMOR.cite));
      for (const type of patchworkTypesUsed(record)) {
        const row = type.id === record.armor.type ? undefined : own(ARMOR.types, type.like);
        if (row) say(type.name, partPhase(row, { ...when, techBase: record.techBase }), { field: "armor.patchwork" }, bookPage(ARMOR.cite));
      }
    }
    return out;
  },
};

// ---- Rules level (current edition only) ---------------------------------------------------------------------------------------

/** One thing a unit uses that asks something of the rules level. */
export interface AeroLevelItem {
  what: "type" | "equipment" | "engine" | "armor" | "tech base" | "option";
  name: string;
  level: RulesLevel;
  /** Set in the item's prototype years: its two dates in words; `level` is then the prototype's. */
  prototype?: string;
  cite?: string;
  where: { field?: string; mountId?: string };
}

/** What the unit uses that has a level, in the current edition. Empty under any other edition: the older books predate the levels and show none. */
export function aeroLevelItems(record: AeroRecord, catalog: Catalog): AeroLevelItem[] {
  if (record.editionId !== DEFAULT_AERO_EDITION) return [];
  const items: AeroLevelItem[] = [];
  const window = windowOf({ era: record.era, year: record.year });
  const row = typeRow(record);
  if (row?.level !== undefined) items.push({ what: "type", name: row.label, level: row.level, cite: row.cite, where: { field: "unitType" } });
  if (record.techBase === "mixed") {
    const phase = mixedPhase({ era: record.era, year: record.year });
    items.push({
      what: "tech base",
      name: "Mixed technology",
      level: levelIn(MIXED_TECHNOLOGY.rulesLevel, phase),
      ...(phase === "prototype" ? { prototype: `Prototype ~${String(MIXED_TECHNOLOGY.clanPrototypeYear)}, production ~${String(MIXED_TECHNOLOGY.availability[0]?.from ?? "")}` } : {}),
      cite: bookPage(MIXED_TECHNOLOGY.cite),
      where: { field: "techBase" },
    });
  }
  const part = (what: "engine" | "armor", name: string, facts: Parameters<typeof partSpans>[0] & { rulesLevel?: RulesLevel }, key: string, kind: "engine" | "armor", cite: string, field: string) => {
    const spans = partSpans(facts, record.techBase);
    const prototype = partPrototype(facts, record.techBase);
    const phase = phaseIn(spans, prototype, window);
    const level = partLevel(kind, key, facts);
    items.push({ what, name, level: levelIn(level, phase, facts.prototypeLevel), ...(phase === "prototype" ? { prototype: datesText(prototype, spans?.[0]?.from) } : {}), cite, where: { field } });
  };
  if (own(ENGINE_TYPES.types, record.engine.type)) part("engine", ENGINE_TYPES.types[record.engine.type]?.name ?? record.engine.type, ENGINE_TYPES.types[record.engine.type] ?? {}, record.engine.type, "engine", bookPage(ENGINE_TYPES.cite), "engine");
  const armorType = FIGHTER_ARMOR_TYPES.find((t) => t.id === record.armor.type);
  if (armorType && own(ARMOR.types, armorType.like)) part("armor", armorType.name, ARMOR.types[armorType.like] ?? {}, armorType.like, "armor", bookPage(ARMOR.cite), "armor.type");
  if (fighterPatchworkActive(record)) {
    // Patchwork armor is an Advanced option (TO:AUE p. 189), Experimental before its production year (IO:AE p. 45); each type it brings has its own level.
    const phase = patchworkPhase(record);
    items.push({ what: "option", name: "Patchwork armor", level: levelIn(PATCHWORK_ARMOR.rulesLevel, phase), ...(phase === "prototype" ? { prototype: `Production ${String(PATCHWORK_ARMOR.availability[0]?.from ?? "")}` } : {}), cite: bookPage(PATCHWORK_ARMOR.cite), where: { field: "armor.patchwork" } });
    for (const type of patchworkTypesUsed(record)) if (type.id !== record.armor.type && own(ARMOR.types, type.like)) part("armor", type.name, ARMOR.types[type.like] ?? {}, type.like, "armor", bookPage(ARMOR.cite), "armor.patchwork");
  }
  const seen = new Set<string>();
  for (const mount of record.mounts) {
    if (mount.equipmentId === null || seen.has(mount.equipmentId)) continue;
    const equipment = catalog.rowFor(mount.equipmentId, record.editionId);
    if (!equipment) continue;
    seen.add(equipment.id);
    const phase = phaseIn(equipment.availability, equipment.prototypeYear, window);
    items.push({
      what: "equipment",
      name: equipment.name,
      level: levelIn(equipmentLevel(equipment), phase, equipment.prototypeLevel),
      ...(phase === "prototype" ? { prototype: datesText(equipment.prototypeYear, equipment.availability[0]?.from) } : {}),
      cite: bookPage(equipment.levelCite ?? equipment.cite),
      where: { mountId: mount.id },
    });
  }
  return items;
}

/** The lowest level that accepts everything the unit uses in the current edition; undefined under an older edition (no levels). A bare unit is Introductory. */
export function aeroLowestLevel(record: AeroRecord, catalog: Catalog): RulesLevel | undefined {
  if (record.editionId !== DEFAULT_AERO_EDITION) return undefined;
  let lowest: RulesLevel = LEVEL_ORDER[0] ?? DEFAULT_LEVEL;
  for (const item of aeroLevelItems(record, catalog)) if (!levelAtLeast(lowest, item.level)) lowest = item.level;
  return lowest;
}

/** Items above the unit's own level. A unit with no level of its own asks for none (it is read at the lowest level that fits). */
const levelCheck: AeroCheck = {
  id: "level",
  run({ record, catalog }) {
    const own = record.rulesLevel;
    if (own === undefined || !LEVEL_ORDER.includes(own)) return [];
    return aeroLevelItems(record, catalog)
      .filter((item) => !levelAtLeast(own, item.level))
      .map((item) => ({
        check: "level",
        level: "warning" as const,
        message: `${item.name} needs ${levelRow(item.level).label} rules${item.prototype === undefined ? "" : ` in its prototype years (${item.prototype})`}; the unit is set to ${levelRow(own).label}.`,
        where: item.where,
        ...withCite(item.cite),
      }));
  },
};

// ---- OFFICIAL marks ---------------------------------------------------------------------------------------------------------------

/** The design as the mark sees it: everything but the name, notes, picture, level and mark itself. */
export function aeroDesignKey(record: AeroRecord): string {
  const design: Record<string, unknown> = { ...record };
  for (const key of ["name", "notes", "picture", "official", "rulesLevel", "id"]) delete design[key];
  design.mounts = record.mounts.map((m) => canon({ ...m, id: undefined })).sort();
  return canon(design);
}
/** Marks an aerospace record OFFICIAL in the named book, keeping the design as it is now. Does nothing without a book. */
export function markAeroOfficial(draft: AeroRecord, book: string, page?: number | null): void {
  const named = book.trim();
  if (!named) return;
  draft.official = { status: "official", book: named, design: aeroDesignKey(draft), ...(page !== undefined && page !== null && Number.isInteger(page) && page > 0 ? { page } : {}) };
}

/** As `officialState` for a 'Mech: OFFICIAL only while the design is the marked one. */
export function aeroOfficialState(record: AeroRecord): OfficialState {
  const mark = record.official;
  const book = mark?.book?.trim();
  if (mark?.status !== "official" || !book || mark.design === undefined) return { official: false };
  if (mark.design !== aeroDesignKey(record)) return { official: false, changedFrom: book };
  return mark.page === undefined ? { official: true, book } : { official: true, book, page: mark.page };
}

const officialCheck: AeroCheck = {
  id: "official",
  run({ record }) {
    const state = aeroOfficialState(record);
    return !state.official && state.changedFrom !== undefined ? [{ check: "official", level: "note", message: `Marked official, but ${officialLabel(state).detail}.`, where: { field: "official" } }] : [];
  },
};

// ---- Running them ---------------------------------------------------------------------------------------------------------------

/** One table of checks. The small craft, DropShip and capital ship pieces add their checks here. */
export const AERO_CHECKS: AeroCheck[] = [typeCheck, weightCheck, engineCheck, lotsCheck, fuelCheck, armorCheck, patchworkCheck, heatCheck, arcsCheck, equipmentCheck, datesCheck, levelCheck, officialCheck, ...VESSEL_CHECKS];

/** Every finding for the unit under its own edition. Never throws: a check that fails on a record it does not understand gives a note. */
export function checkAero(record: AeroRecord, catalog: Catalog): AeroFinding[] {
  return AERO_CHECKS.flatMap((check) => {
    try {
      return check.run({ record, catalog });
    } catch {
      return [{ check: check.id, level: "note" as const, message: `The ${check.id} check could not read this unit.` }];
    }
  });
}

/**
 * "Check under": the findings another edition's rules give the same unit. The record is not changed and nothing is marked in the editor.
 * A level belongs to the current edition alone, so it is carried only when `editionId` is the current one, and then only where the record
 * had one.
 */
export function checkUnder(record: AeroRecord, editionId: string, catalog: Catalog): AeroFinding[] {
  const { rulesLevel, ...rest } = record;
  return checkAero({ ...rest, editionId, ...(editionId === DEFAULT_AERO_EDITION && rulesLevel !== undefined ? { rulesLevel } : {}) }, catalog);
}
