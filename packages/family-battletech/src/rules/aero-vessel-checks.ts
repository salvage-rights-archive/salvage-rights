// The rules check for small craft, DropShips and capital ships (AeroTech 2, AeroTech 2 Revised and the current rules): structural integrity,
// armor and its limit, arcs and fire control, matched arcs, weapon bays, minimum ammunition, crew, bay doors, the DropShip zero-heat rule and
// the WarShip's drive. These join the fighter checks in `AERO_CHECKS` (rules/aero-checks.ts). Every figure and page comes from data/aero.ts; a
// message states the numbers and names the deciding page through its cite. Findings are advice, never refusals, and a unit this version does
// not understand gets none from here.
import { CAPITAL_FIGURES, CAPITAL_SYSTEMS, CRAFT_FIGURES, DEFAULT_AERO_EDITION, FIGHTER_ARMOR_TYPES, FIGHTER_EDITIONS, FIGHTER_PATCHWORK_TYPES, aeroEditionName } from "../data/aero";
import type { FigureGroup } from "../data/aero";
import { aeroLocationName, armorTypeAt, fighterPatchworkActive, capitalKind, capitalSystems, craftAmmoShortfalls, craftKind, heatByArc, locationsOf, stationKeeping, towingShare, vessel } from "./aero";
import type { AeroRecord } from "./aero";
import type { AeroCheck, AeroFinding } from "./aero-checks";
import { tidy } from "./walk";

const num = (n: number): string => String(tidy(n));
const plural = (n: number, word: string): string => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
const withCite = (cite: string | undefined): { cite?: string } => (cite === undefined ? {} : { cite });
const pageOf = <T>(group: FigureGroup<T>, editionId: string): string | undefined => group.find((row) => row.editions.includes(editionId))?.cite[editionId];
/** The page of a figure for the record's vessel: a capital ship reads its own group first, then the small craft and DropShip one the AeroTech 2 books share with it. */
const pageFor = <T, C>(record: AeroRecord, craft: FigureGroup<T>, capital?: FigureGroup<C>): string | undefined =>
  capitalKind(record) !== undefined && capital !== undefined ? (pageOf(capital, record.editionId) ?? pageOf(craft, record.editionId)) : pageOf(craft, record.editionId);
const arcNames = (pair: string): string => pair.split("|").map(aeroLocationName).join(" and ");
const kindName = (record: AeroRecord): string => (record.unitType === "space-station" ? "space station" : record.unitType === "dropship" ? "DropShip" : record.unitType === "small-craft" ? "small craft" : record.unitType === "jumpship" ? "JumpShip" : "WarShip");

const AT2 = "aerotech2";
// The zero-net-heat rule of large craft, by edition: AeroTech 2 p. 12, AeroTech 2 Revised p. 22 (an arc over the sinks may fire alone, with a control roll),
// Strategic Operations: Advanced Aerospace Rules pp. 11 and 139 (the heat fired in a turn is limited to the sinks).
const ZERO_HEAT: Record<string, { cite: string; rule: string }> = {
  [FIGHTER_EDITIONS.at2]: { cite: "AeroTech 2, p. 12", rule: "a large craft may not make more heat than its sinks remove" },
  [FIGHTER_EDITIONS.at2r]: { cite: "AeroTech 2: Revised Edition, p. 22", rule: "it may fire that arc only on its own and must make a control roll" },
  [FIGHTER_EDITIONS.current]: { cite: "Strategic Operations: Advanced Aerospace Rules, pp. 11, 139", rule: "the weapons it fires in a turn may not make more heat than the sinks remove, so it cannot fire this whole arc at once (its other arcs still can)" },
};
// Armor of the other tech base: TechManual p. 191 is the current edition's rule; the older books' pages are not read, so they are not checked.
const PAGE_TECH_ARMOR = "TechManual, p. 191";

/** Structural Integrity against the range the edition allows, and the WarShip's drive (a station-keeping drive, or Safe Thrust under 1). */
const siCheck: AeroCheck = {
  id: "si",
  run({ record, catalog }) {
    const v = vessel(record, catalog);
    if (!v) return [];
    const out: AeroFinding[] = [];
    const edition = aeroEditionName(record.editionId);
    const siPage = pageFor(record, CRAFT_FIGURES.siRange, CAPITAL_FIGURES.siRange);
    if (typeof record.si === "number" && v.siRange) {
      if (record.si < v.siRange.min) out.push({ check: "si", level: "error", message: `Structural Integrity ${num(record.si)} is under the ${num(v.siRange.min)} that ${edition} asks (the unit's Max Thrust).`, where: { field: "si" }, ...withCite(siPage) });
      else if (record.si > v.siRange.max) out.push({ check: "si", level: "error", message: `Structural Integrity ${num(record.si)} is over the ${num(v.siRange.max)} that ${edition} allows (30 times the unit's Max Thrust).`, where: { field: "si" }, ...withCite(siPage) });
    }
    if (record.unitType === "warship") {
      const drivePage = pageOf(CAPITAL_FIGURES.engine, record.editionId);
      const kept = stationKeeping(record);
      if (kept) {
        out.push({ check: "si", level: "note", message: "The book gives this drive no Max Thrust; we use 1 (0.2 x 1.5, rounded up), so its Structural Integrity runs 1 to 30.", where: { field: "si" }, ...withCite(pageOf(CAPITAL_FIGURES.stationKeepingThrust, record.editionId)) });
      } else if (record.thrust.safe < 1) {
        const allowed = pageOf(CAPITAL_FIGURES.warshipStationKeeping, record.editionId) !== undefined;
        out.push({
          check: "si",
          level: allowed ? "warning" : "error",
          message: allowed ? "A WarShip with a Safe Thrust under 1 needs the station-keeping drive; choose it or a Safe Thrust of 1 or more." : `${edition} gives a WarShip no station-keeping drive: choose a Safe Thrust of 1 or more.`,
          where: { field: "thrust" },
          ...withCite(drivePage),
        });
      }
    }
    return out;
  },
};

/** Armor in a vessel: points against bought and free points, the tons the structure allows, a location the edition lacks, and an armor of the other tech base. */
const vesselArmorCheck: AeroCheck = {
  id: "vessel-armor",
  run({ record, catalog }) {
    const v = vessel(record, catalog);
    if (!v?.armor) return [];
    const out: AeroFinding[] = [];
    const armor = v.armor;
    const edition = aeroEditionName(record.editionId);
    const base = pageFor(record, CRAFT_FIGURES.freeArmor, CAPITAL_FIGURES.freeArmorDivisor);
    const unit = v.group === "capital" ? "capital-scale armor points" : "armor points";
    if (armor.over !== null && armor.over > 0) out.push({ check: "vessel-armor", level: "error", message: `${num(armor.allocated)} ${unit} are set but the armor and the free points give ${num(armor.available ?? 0)}: ${num(armor.over)} too many.`, where: { field: "armor.points" }, ...withCite(base) });
    else if (armor.over !== null && armor.over < 0) out.push({ check: "vessel-armor", level: "note", message: `${num(-armor.over)} ${unit} are available and not set on any location.`, where: { field: "armor.points" } });
    if (armor.bought === null && record.armor.tons > 0) out.push({ check: "vessel-armor", level: "note", message: `We have no points-a-ton figure for "${record.armor.type}" armor on this unit in ${edition}, so its points were not checked.`, where: { field: "armor.type" } });
    if (armor.limitTons !== null && armor.tonsOver !== null && armor.tonsOver > 0) {
      out.push({ check: "vessel-armor", level: "error", message: `${num(record.armor.tons)} tons of armor are over the ${num(armor.limitTons)} tons the structure of a ${num(record.tons)}-ton ${kindName(record)} allows.`, where: { field: "armor.tons" }, ...withCite(pageFor(record, CRAFT_FIGURES.armorLimit, CAPITAL_FIGURES.armorLimit)) });
    }
    const known = locationsOf(record).armor;
    for (const [loc, points] of Object.entries(record.armor.points)) {
      if (points > 0 && known.length > 0 && !known.includes(loc)) out.push({ check: "vessel-armor", level: "warning", message: `${num(points)} armor points sit on ${aeroLocationName(loc)}, which a ${edition} ${kindName(record)} does not have.`, where: { field: `armor.points.${loc}` } });
    }
    return out;
  },
};

/** A unit of one tech base using the other's armor (TechManual p. 191); a mixed unit may use either. Fighters, small craft and DropShips share the armor list. */
const armorTechBaseCheck: AeroCheck = {
  id: "armor-tech",
  run({ record }) {
    if (record.editionId !== DEFAULT_AERO_EDITION || record.techBase === "mixed") return [];
    // With patchwork armor each type a location wears with points on it is read, once, and the field names the first such location.
    const used: { id: string; field: string }[] = fighterPatchworkActive(record)
      ? Object.entries(record.armor.points).filter(([, n]) => n > 0).map(([loc]) => ({ id: armorTypeAt(record, loc), field: `armor.patchwork.${loc}` })).filter((u, i, all) => all.findIndex((o) => o.id === u.id) === i)
      : record.armor.tons > 0 ? [{ id: record.armor.type, field: "armor.type" }] : [];
    const side = (base: string) => (base === "clan" ? "Clan" : "Inner Sphere");
    return used.flatMap(({ id, field }) => {
      const type = [...FIGHTER_ARMOR_TYPES, ...FIGHTER_PATCHWORK_TYPES].find((t) => t.id === id);
      if (!type || type.techBase === "both" || type.techBase === record.techBase) return [];
      return [{ check: "armor-tech", level: "warning" as const, message: `${type.name} armor is ${side(type.techBase)} armor on a${record.techBase === "clan" ? " Clan" : "n Inner Sphere"} unit.`, where: { field }, cite: PAGE_TECH_ARMOR }];
    });
  },
};

/** Arcs of a vessel: weapons beyond an arc's limit (they ask for fire control, counted in the weight), the arcs that must match, and items in an arc the edition does not give the unit. */
const vesselArcsCheck: AeroCheck = {
  id: "vessel-arcs",
  run({ record, catalog }) {
    const v = vessel(record, catalog);
    if (!v) return [];
    const out: AeroFinding[] = [];
    const edition = aeroEditionName(record.editionId);
    const limitPage = pageFor(record, CRAFT_FIGURES.arcLimit, CAPITAL_FIGURES.arcLimit);
    for (const arc of v.arcs) {
      if (arc.weapons > arc.limit) {
        out.push({ check: "vessel-arcs", level: "note", message: `The ${aeroLocationName(arc.arc)} arc holds ${plural(arc.weapons, "weapon")}; past ${num(arc.limit)} it needs ${plural(arc.fireControlTons, "ton")} of fire control, counted in the weight.`, where: { arc: arc.arc }, ...withCite(limitPage) });
      }
    }
    const matchedPage = pageFor(record, CRAFT_FIGURES.matchedArcs, CAPITAL_FIGURES.matchedArcs);
    for (const pair of v.unmatched) out.push({ check: "vessel-arcs", level: "error", message: `The ${arcNames(pair)} arcs must carry the same weapons in ${edition}; they differ.`, where: { arc: pair.split("|")[0] ?? "" }, ...withCite(matchedPage) });
    const locations = locationsOf(record);
    for (const mount of record.mounts) {
      if (locations.arcs.length > 0 && !locations.arcs.includes(mount.arc)) out.push({ check: "vessel-arcs", level: "warning", message: `${mount.name || "An item"} is in the ${aeroLocationName(mount.arc)} arc, which ${edition} does not give this unit.`, where: { mountId: mount.id, arc: mount.arc } });
    }
    return out;
  },
};

/** Weapon bays: a bay over the attack limit, a named bay holding more than one weapon class or (AeroTech 2) more than one size, and weapons whose attack value we could not read. An arc's own bay is split by class and size as the book asks, so it is only counted. */
const bayCheck: AeroCheck = {
  id: "bays",
  run({ record, catalog }) {
    const v = vessel(record, catalog);
    if (!v) return [];
    const out: AeroFinding[] = [];
    const limitPage = pageFor(record, CRAFT_FIGURES.bayLimit, CAPITAL_FIGURES.bayLimit);
    const mixedPage = pageFor(record, CRAFT_FIGURES.mixedSizes, CAPITAL_FIGURES.mixedSizes);
    for (const bay of v.bays) {
      const own = bay.bay.startsWith("arc:");
      const name = own ? `of the ${aeroLocationName(bay.arc)}` : bay.bay;
      const where = { arc: bay.arc };
      if (bay.over) {
        const limit = v.group === "capital" ? bay.limit / 10 : bay.limit;
        out.push({
          check: "bays",
          level: own ? "note" : "error",
          message: own ? `The weapons of the ${aeroLocationName(bay.arc)} come to an attack of ${num(bay.attack)}; the book splits them into bays of at most ${num(bay.limit)}.` : `Weapon bay ${name} has an attack of ${num(bay.attack)}; ${aeroEditionName(record.editionId)} allows ${num(bay.limit)}${v.group === "capital" ? ` (${num(limit)} capital points)` : ""}.`,
          where,
          ...withCite(limitPage),
        });
      }
      if (!own && bay.classes.length > 1) out.push({ check: "bays", level: "error", message: `Weapon bay ${name} mixes weapon classes (${bay.classes.join(", ")}); a bay holds one class.`, where, ...withCite(mixedPage) });
      if (!own && !bay.mixedSizesAllowed && bay.sizes.length > 1) out.push({ check: "bays", level: "error", message: `Weapon bay ${name} mixes weapon sizes (${bay.sizes.join(", ")}); ${aeroEditionName(record.editionId)} asks one size to a bay.`, where, ...withCite(mixedPage) });
      if (bay.unknown.length > 0) out.push({ check: "bays", level: "note", message: `${plural(bay.unknown.length, "weapon")} in bay ${name} ${bay.unknown.length === 1 ? "has" : "have"} no attack value we can add up, so the bay's total is short.`, where });
    }
    return out;
  },
};

/** Minimum ammunition: ten shots for each weapon (twenty for an Ultra, sixty for a rotary autocannon), held in the same bay. Small craft and DropShips only. */
const ammoCheck: AeroCheck = {
  id: "ammo",
  run({ record, catalog }) {
    if (craftKind(record) === undefined) return [];
    const page = pageOf(CRAFT_FIGURES.minShots, record.editionId);
    return craftAmmoShortfalls(record, catalog).map((s) => ({
      check: "ammo",
      level: "warning" as const,
      message: `${catalog.byId(s.weaponId)?.name ?? s.weaponId} in ${s.bay.startsWith("arc:") ? `the ${aeroLocationName(s.bay.slice(4))} arc` : `bay ${s.bay}`} has ${num(s.have)} of the ${num(s.required)} shots of ammunition the book asks for.`,
      where: { field: "mounts" },
      ...withCite(page),
    }));
  },
};

/** Crew against the least the book asks (the base crew and a gunner for each six weapons). A unit with no crew entered is only told the least. */
const crewCheck: AeroCheck = {
  id: "crew",
  run({ record, catalog }) {
    const v = vessel(record, catalog);
    if (!v?.crew) return [];
    const page = pageFor(record, CRAFT_FIGURES.crew, CAPITAL_FIGURES.crew);
    if (record.crew === undefined) return [{ check: "crew", level: "note", message: `The unit needs a crew of at least ${num(v.crew.minimum)}: ${num(v.crew.base)} to run it and ${plural(v.crew.gunners, "gunner")}.`, where: { field: "crew" }, ...withCite(page) }];
    return record.crew < v.crew.minimum ? [{ check: "crew", level: "error", message: `A crew of ${num(record.crew)} is under the ${num(v.crew.minimum)} the unit needs: ${num(v.crew.base)} to run it and ${plural(v.crew.gunners, "gunner")}.`, where: { field: "crew" }, ...withCite(page) }] : [];
  },
};

/** Bay doors: more than the edition allows, and bays with fewer doors than it asks. */
const doorCheck: AeroCheck = {
  id: "doors",
  run({ record, catalog }) {
    const v = vessel(record, catalog);
    if (!v?.doors) return [];
    const out: AeroFinding[] = [];
    const page = pageFor(record, CRAFT_FIGURES.doors, CAPITAL_FIGURES.doors);
    const { counted, limit, withoutDoor } = v.doors;
    if (limit !== undefined && counted > limit) out.push({ check: "doors", level: "error", message: `${plural(counted, "door")} are counted against the most ${aeroEditionName(record.editionId)} allows, ${num(limit)}.`, where: { field: "bays" }, ...withCite(page) });
    if (withoutDoor.length > 0) out.push({ check: "doors", level: "error", message: `${withoutDoor.join(", ")} ${withoutDoor.length === 1 ? "needs" : "need"} a door.`, where: { field: "bays" }, ...withCite(page) });
    return out;
  },
};

/** The zero-net-heat rule of large craft (DropShips and capital ships): the heat of an arc's weapons all firing, against what the sinks take away. An arc over it can never fire whole, which is advice, not a refusal. */
const zeroHeatCheck: AeroCheck = {
  id: "zero-heat",
  run({ record, catalog }) {
    const rule = ZERO_HEAT[record.editionId];
    const v = vessel(record, catalog);
    if (rule === undefined || !v?.heat || (record.unitType !== "dropship" && capitalKind(record) === undefined)) return [];
    const capacity = v.heat.capacity;
    return heatByArc(record, catalog)
      .filter((arc) => arc.heat > capacity)
      .map((arc) => ({ check: "zero-heat", level: "warning" as const, message: `The ${arc.name} arc makes ${num(arc.heat)} heat when all its weapons fire and the sinks take away ${num(capacity)}; ${rule.rule}.`, where: { field: "heatSinks", arc: arc.arc }, cite: rule.cite }));
  },
};

/** The current edition's build rule: the sinks must cover the heat of the unit's hottest bay (Strategic Operations: Advanced Aerospace Rules p. 142; p. 139's table gives the Standard Rules no minimum; a DropShip, TechManual p. 193). */
const hottestBayCheck: AeroCheck = {
  id: "hottest-bay",
  run({ record, catalog }) {
    if (record.editionId !== FIGHTER_EDITIONS.current || (record.unitType !== "dropship" && capitalKind(record) === undefined)) return [];
    const capacity = vessel(record, catalog)?.heat?.capacity;
    const bays = vessel(record, catalog)?.bays ?? [];
    const hottest = bays.reduce<(typeof bays)[number] | undefined>((best, bay) => (best === undefined || bay.heat > best.heat ? bay : best), undefined);
    if (capacity === undefined || hottest === undefined || hottest.heat <= capacity) return [];
    return [{ check: "hottest-bay", level: "error", message: `Firing ${hottest.bay.startsWith("arc:") ? `the ${aeroLocationName(hottest.arc)} weapons` : `bay ${hottest.bay}`} makes ${num(hottest.heat)} heat and the sinks take away ${num(capacity)}; the sinks must cover the hottest bay.`, where: { field: "heatSinks", arc: hottest.arc }, cite: record.unitType === "dropship" ? "TechManual, p. 193" : "Strategic Operations: Advanced Aerospace Rules, p. 142" }];
  },
};

/** Ship systems of a capital ship: more than the edition allows, or on a type that may not carry them. */
const systemsCheck: AeroCheck = {
  id: "systems",
  run({ record }) {
    if (capitalKind(record) === undefined) return [];
    const systems = capitalSystems(record);
    const out: AeroFinding[] = [];
    const page = (kind: string) => {
      const row = CAPITAL_SYSTEMS.find((r) => r.kind === kind);
      return row === undefined ? undefined : pageOf(row.figures, record.editionId);
    };
    for (const line of systems.lines) {
      const label = CAPITAL_SYSTEMS.find((r) => r.kind === line.kind)?.label ?? line.kind;
      if (!line.allowed) out.push({ check: "systems", level: "error", message: `A ${kindName(record)} does not carry ${label.toLowerCase()} in ${aeroEditionName(record.editionId)}.`, where: { field: "systems" }, ...withCite(page(line.kind)) });
      else if (line.limit !== undefined && line.count > line.limit) out.push({ check: "systems", level: "error", message: `${plural(line.count, label.toLowerCase())} are over the ${num(line.limit)} a ${num(record.tons)}-ton ${kindName(record)} may carry.`, where: { field: "systems" }, ...withCite(page(line.kind)) });
    }
    if (systems.unknown.length > 0) out.push({ check: "systems", level: "note", message: `${systems.unknown.join(", ")} ${systems.unknown.length === 1 ? "is" : "are"} not a ship system ${aeroEditionName(record.editionId)} prints, so ${systems.unknown.length === 1 ? "it was" : "they were"} not weighed.`, where: { field: "systems" } });
    return out;
  },
};

/** A vessel built to tow, where the edition's books disagree on what the tow costs. */
const towingCheck: AeroCheck = {
  id: "towing",
  run({ record }) {
    if (record.towing !== true || record.editionId !== AT2) return [];
    return towingShare(record) > 0
      ? [{ check: "towing", level: "note", message: "A vessel built to tow adds a tenth to its structure's mass here (the book's structure step); the footnote of its equipment table (p. 47) asks a tenth of the whole mass instead, so check which your table uses.", where: { field: "si" }, cite: pageOf(CRAFT_FIGURES.towingSiShare, record.editionId) ?? "AeroTech 2, p. 44" }]
      : [];
  },
};

export const VESSEL_CHECKS: AeroCheck[] = [siCheck, vesselArmorCheck, armorTechBaseCheck, vesselArcsCheck, bayCheck, ammoCheck, crewCheck, doorCheck, zeroHeatCheck, hottestBayCheck, systemsCheck, towingCheck];
