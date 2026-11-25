// The rules checks the editor's panel shows beside a 'Mech. The editor lets the player change anything; each check here
// says what is illegal or does not add up, with the printed TechManual page the rule rests on. One table of checks and
// one runner. A check reads `layout`, `weights` and the tables and never recomputes what they already give. Messages are
// our own words and state the numbers. `where.field` uses the record's own paths: tons, year, techBase, configuration,
// chassis.engine, chassis.gyro, chassis.cockpit, chassis.structure, chassis.armorType, chassis.myomer,
// chassis.heatSinks and armor.<location code>.
import {
  ARMOR,
  COCKPITS,
  ENGINE_TYPES,
  ENGINE_WEIGHTS,
  GYROS,
  HEAD_MAX_ARMOR,
  HEAT_SINK_RULES,
  HEAT_SINKS,
  INTERNAL_STRUCTURE,
  MYOMER,
  SHEET,
  STRUCTURE_TYPES,
} from "../data/chassis";
import type { Catalog, EquipmentRow } from "./catalog";
import { engineTons, layout as buildLayout, maxArmor, walkMP, weights } from "./mech";
import { locationName, type Layout, type LocationCode, type MechRecord, type Mount } from "./mech";

export interface Finding {
  check: string;
  level: "error" | "warning" | "note";
  message: string;
  where?: { location?: LocationCode; mountId?: string; field?: string };
  cite?: { book: string; page: number };
}
export interface CheckInput {
  record: MechRecord;
  layout: Layout;
  catalog: Catalog;
}
export interface Check {
  id: string;
  editions: string[] | "all";
  run(input: CheckInput): Finding[];
}

// ---------------------------------------------------------------------------------------------------------------
// Helpers, written once
// ---------------------------------------------------------------------------------------------------------------
const tm = (page: number) => ({ book: "TechManual", page });
// Printed pages of rules that no chassis table already cites: tonnage limits and the weight limit (p.46), engine rating
// from walking speed (p.48), jump jets (p.51), armor weight (p.55), tech base of equipment (p.57), Artemis IV (p.207),
// machine gun arrays (p.228), the first page of the cost and availability tables (p.290; they run to p.293).
const PAGE = { weight: 46, engineRating: 48, jump: 51, armorTons: 55, techBase: 57, artemis: 207, machineGunArray: 228, availability: 290 };
const TONNAGE = { min: 20, max: 100, step: 5 }; // p.46

const TECH_BASE_NAMES: Record<string, string> = { "inner-sphere": "Inner Sphere", clan: "Clan", mixed: "Mixed" };

const own = (table: object, key: string | number) => Object.hasOwn(table, key);
const quoted = (key: unknown) => `"${String(key)}"`;
const techBaseName = (key: string) => (own(TECH_BASE_NAMES, key) ? (TECH_BASE_NAMES[key] ?? quoted(key)) : quoted(key));
/** A chassis part's display name from its table; an unknown key prints as itself in quotes. */
const partName = (table: { types: Record<string, { name: string }> }, key: string) => (own(table.types, key) ? (table.types[key]?.name ?? quoted(key)) : quoted(key));
/** The one place a number goes into a message: a number that is not a finite number never prints as NaN or Infinity. */
const num = (x: number) => (Number.isFinite(x) ? String(x) : "(not a number)");
const tons = (x: number) => `${num(x)} ${x === 1 ? "ton" : "tons"}`;
/** Slot numbers in the record are zero-based; the player sees them from 1. */
const slotLabel = (slot: number) => num(slot + 1);
const tidy = (x: number) => Math.round(x * 1000) / 1000;
const isCount = (x: number) => Number.isInteger(x) && x >= 0;
const isPositive = (x: number) => Number.isFinite(x) && x > 0;
const rowOf = (catalog: Catalog, record: MechRecord, mount: Mount): EquipmentRow | undefined =>
  mount.part || mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);
const mountName = (record: MechRecord, id: string) => record.mounts.find((m) => m.id === id)?.name ?? "an unnamed mount";
const finding = (check: string, level: Finding["level"], message: string, extra: Omit<Finding, "check" | "level" | "message"> = {}): Finding => ({
  check,
  level,
  message,
  ...extra,
});

/** The heat sink type key a row stands for. */
function heatSinkTypeOf(row: EquipmentRow): string {
  return row.id.startsWith("double") ? (row.techBase === "clan" ? "double-clan" : "double") : "single";
}

// What an item that `needs` something must be paired with, the book's page for it, and the size class a pairing is made
// within. A `needs` with no entry here (liquid cargo space) has nothing in the record to check against and is left alone.
const HOSTS: Record<string, { host: RegExp; what: string; page: number }> = {
  launcher: { host: /^(lrm|srm|mml)-\d+-(is|clan)$/, what: "standard LRM, SRM or MML launcher", page: PAGE.artemis },
  "machine-gun": { host: /^(?:(light|heavy)-)?machine-gun-(is|clan)$/, what: "machine gun", page: PAGE.machineGunArray },
};
const hostRule = (row: EquipmentRow | undefined) => (row?.needs !== undefined && own(HOSTS, row.needs) ? HOSTS[row.needs] : undefined);
const gunSize = (id: string | null) => /^(light|heavy)-/.exec(id ?? "")?.[1] ?? "standard";

// ---------------------------------------------------------------------------------------------------------------
// The checks
// ---------------------------------------------------------------------------------------------------------------
function weightCheck({ record, catalog }: CheckInput): Finding[] {
  const out: Finding[] = [];
  const where = { field: "tons" };
  if (isPositive(record.tons) && !(record.tons >= TONNAGE.min && record.tons <= TONNAGE.max && record.tons % TONNAGE.step === 0)) {
    out.push(
      finding("weight", "error", `A BattleMech weighs ${TONNAGE.min} to ${TONNAGE.max} tons in steps of ${TONNAGE.step}; ${num(record.tons)} is not allowed.`, {
        where,
        cite: tm(PAGE.weight),
      }),
    );
  }
  const { lines, total } = weights(record, catalog.factsOf);
  if (total === null || !Number.isFinite(total)) {
    const unknown = lines.filter((l) => l.tons === null || !Number.isFinite(l.tons)).map((l) => l.label);
    out.push(finding("weight", "note", `The total weight could not be worked out; not known: ${unknown.join(", ")}.`, { where }));
  } else if (total > record.tons) {
    out.push(finding("weight", "error", `The parts weigh ${tons(total)}, over the ${tons(record.tons)} this 'Mech may weigh.`, { where, cite: tm(PAGE.weight) }));
  } else if (total < record.tons) {
    out.push(finding("weight", "warning", `The parts weigh ${tons(total)} of ${tons(record.tons)}; ${tons(tidy(record.tons - total))} is unused.`, { where, cite: tm(PAGE.weight) }));
  }
  return out;
}

function slotsCheck({ record, layout }: CheckInput): Finding[] {
  if (!layout.supported) return [];
  const out: Finding[] = [];
  const cite = SHEET.cites.counts;
  for (const c of layout.conflicts) {
    const cell = layout.slots[c.location]?.[c.slot];
    const ids = [...new Set(c.mountIds)];
    for (const id of ids) {
      const others = ids.filter((o) => o !== id).map((o) => mountName(record, o));
      if (cell?.kind === "fixed") others.push(cell.label);
      out.push(
        finding("slots", "error", `${mountName(record, id)} shares slot ${slotLabel(c.slot)} of the ${locationName(c.location)} with ${others.join(" and ")}.`, {
          where: { location: c.location, mountId: id },
          cite,
        }),
      );
    }
  }
  for (const o of layout.overflow) {
    const mount = record.mounts.find((m) => m.id === o.mountId);
    const start = mount?.slot == null ? "" : ` from slot ${slotLabel(mount.slot)}`;
    out.push(
      finding("slots", "error", `${mountName(record, o.mountId)} runs past the end of the ${locationName(o.location)}${start}.`, {
        where: { location: o.location, mountId: o.mountId },
        cite,
      }),
    );
  }
  for (const m of layout.unplaced) {
    out.push(finding("slots", "error", `${m.name} has no location and slot yet.`, { where: { mountId: m.id }, cite }));
  }
  for (const p of layout.partSlots) {
    if (p.needed === p.present) continue;
    const structure = p.part === "structure";
    const type = structure ? partName(STRUCTURE_TYPES, record.chassis.structure) : partName(ARMOR, record.chassis.armorType);
    out.push(
      finding("slots", "error", `${type} ${p.part} takes ${p.needed} critical slots; the record places ${p.present}.`, {
        where: { field: structure ? "chassis.structure" : "chassis.armorType" },
        cite: structure ? STRUCTURE_TYPES.cite : ARMOR.cite,
      }),
    );
  }
  // An armor type with a place for each of its slots (stealth): the count in every location must match. A location short of
  // slots is not reported while some armor slot is still unplaced, since that one is already an error above.
  const spread = (own(ARMOR.types, record.chassis.armorType) ? ARMOR.types[record.chassis.armorType] : undefined)?.slotsIn?.[record.configuration === "quad" ? "quad" : "biped"];
  if (spread) {
    const armorMounts = record.mounts.filter((m) => m.part === "armor");
    const anyUnplaced = armorMounts.some((m) => !m.location);
    const type = partName(ARMOR, record.chassis.armorType);
    for (const loc of layout.locations) {
      const wanted = spread[loc] ?? 0;
      const found = armorMounts.filter((m) => m.location === loc).length;
      if (found === wanted || (found < wanted && anyUnplaced)) continue;
      out.push(
        finding("slots", "error", `${type} armor takes ${wanted} slot${wanted === 1 ? "" : "s"} in the ${locationName(loc)}; the record places ${found}.`, {
          where: { location: loc, field: "chassis.armorType" },
          cite: ARMOR.cite,
        }),
      );
    }
  }
  return out;
}

function armorCheck({ record, layout, catalog }: CheckInput): Finding[] {
  const out: Finding[] = [];
  const max = maxArmor(record);
  const known = Object.keys(max).length > 0;
  if (!known) {
    out.push(
      finding("armor", "note", `Armor limits are unknown: ${num(record.tons)} tons is not a tonnage the structure table has.`, {
        where: { field: "tons" },
        cite: INTERNAL_STRUCTURE.cite,
      }),
    );
  }
  for (const [loc, a] of Object.entries(record.armor) as [LocationCode, { front: number; rear?: number } | undefined][]) {
    if (!a) continue;
    const where = { location: loc, field: `armor.${loc}` };
    const sides: [string, number][] = [["front", a.front]];
    if (a.rear !== undefined) sides.push(["rear", a.rear]);
    const bad = sides.filter(([, v]) => !isCount(v));
    for (const [side, v] of bad) {
      out.push(finding("armor", "error", `${locationName(loc)} ${side} armor is ${num(v)}; armor points are whole numbers, zero or more.`, { where, cite: tm(54) }));
    }
    if (bad.length > 0 || !known) continue;
    const limit = max[loc];
    if (limit === undefined) {
      // A configuration with no fixed layout is reported by the unsupported check; only the locations we know are checked.
      if (layout.supported) {
        out.push(finding("armor", "error", `This ${record.configuration} has no ${locationName(loc)}, but armor is set there.`, { where, cite: tm(54) }));
      }
      continue;
    }
    const total = a.front + (a.rear ?? 0);
    if (total > limit) {
      const split = a.rear === undefined ? "" : ` (${a.front} front, ${a.rear} rear)`;
      out.push(
        finding("armor", "error", `${locationName(loc)} armor is ${total}${split}; the most it can carry is ${limit}.`, {
          where,
          cite: loc === "HD" ? HEAD_MAX_ARMOR.cite : tm(54),
        }),
      );
    }
  }
  const line = weights(record, catalog.factsOf).lines.find((l) => l.label === "Armor");
  if (line && line.tons !== null && Number.isFinite(line.tons)) {
    out.push(
      finding("armor", "note", `The armor points carried need ${tons(line.tons)} of ${partName(ARMOR, record.chassis.armorType)} armor.`, {
        where: { field: "chassis.armorType" },
        cite: tm(PAGE.armorTons),
      }),
    );
  }
  return out;
}

function engineCheck({ record }: CheckInput): Finding[] {
  const out: Finding[] = [];
  const { type, rating } = record.chassis.engine;
  const where = { field: "chassis.engine" };
  if (!isPositive(record.tons)) {
    out.push(finding("engine", "error", `The tonnage is ${num(record.tons)}; it must be a positive number.`, { where: { field: "tons" }, cite: tm(PAGE.engineRating) }));
  }
  if (!isPositive(rating)) {
    out.push(finding("engine", "error", `The engine rating is ${num(rating)}; it must be a positive number.`, { where, cite: tm(PAGE.engineRating) }));
  } else if (!own(ENGINE_WEIGHTS.rows, rating) && own(ENGINE_TYPES.types, type)) {
    out.push(finding("engine", "error", `An engine rated ${rating} is not in the engine table.`, { where, cite: ENGINE_WEIGHTS.cite }));
  }
  if (!own(ENGINE_TYPES.types, type)) {
    out.push(finding("engine", "error", `Engine type ${quoted(type)} is not one we know.`, { where, cite: ENGINE_TYPES.cite }));
  }
  if (engineTons(type, rating) === null) out.push(finding("engine", "note", "The engine weight could not be checked.", { where }));
  if (isPositive(record.tons) && isPositive(rating) && walkMP(record) === null) {
    out.push(
      finding("engine", "error", `Engine rating ${rating} over ${record.tons} tons gives a walking speed of ${tidy(rating / record.tons)}; it must be a whole number.`, {
        where,
        cite: tm(PAGE.engineRating),
      }),
    );
  }
  return out;
}

function heatSinkCheck({ record, catalog }: CheckInput): Finding[] {
  const out: Finding[] = [];
  const { type, count } = record.chassis.heatSinks;
  const where = { field: "chassis.heatSinks" };
  const cite = HEAT_SINK_RULES.cite;
  if (!isCount(count)) {
    return [finding("heat-sinks", "error", `The heat sink count is ${num(count)}; it must be a whole number, zero or more.`, { where, cite })];
  }
  if (count < HEAT_SINK_RULES.freeWithEngine) {
    out.push(finding("heat-sinks", "error", `The chassis has ${count} heat sinks; a 'Mech has at least the ${HEAT_SINK_RULES.freeWithEngine} heat sinks its engine provides.`, { where, cite }));
  }
  const sinks = record.mounts.filter((m) => rowOf(catalog, record, m)?.kind === "heat-sink");
  const rating = record.chassis.engine.rating;
  if (isPositive(rating)) {
    const held = Math.min(count, Math.floor(rating / HEAT_SINK_RULES.ratingPerHeldSink));
    if (sinks.length + held !== count) {
      out.push(
        finding("heat-sinks", "error", `${sinks.length} heat sinks are placed and the engine can hold ${held}, which makes ${sinks.length + held}; the chassis lists ${count}.`, { where, cite }),
      );
    }
  }
  if (own(HEAT_SINKS.types, type)) {
    // The book allows one heat sink type per 'Mech, free engine sinks included, so a mismatch is an error.
    for (const m of sinks) {
      const row = rowOf(catalog, record, m);
      const kind = row ? heatSinkTypeOf(row) : type;
      if (kind !== type) {
        out.push(
          finding("heat-sinks", "error", `${m.name} is a ${partName(HEAT_SINKS, kind)} heat sink, but the chassis uses ${partName(HEAT_SINKS, type)}; a 'Mech carries one heat sink type only.`, {
            where: { mountId: m.id },
            cite,
          }),
        );
      }
    }
  }
  return out;
}

function jumpCheck({ record, catalog }: CheckInput): Finding[] {
  const jets = record.mounts.filter((m) => rowOf(catalog, record, m)?.kind === "jump-jet");
  const first = jets[0];
  if (!first) return [];
  const out: Finding[] = [];
  const isImproved = (m: Mount) => rowOf(catalog, record, m)?.id.startsWith("improved-") === true;
  const improved = jets.filter(isImproved);
  const standard = jets.filter((m) => !isImproved(m));
  const cite = tm(PAGE.jump);
  const kindOf = (m: Mount) => (isImproved(m) ? "an improved" : "a standard");
  for (const m of jets.filter((j) => isImproved(j) !== isImproved(first))) {
    out.push(
      finding("jump", "error", `${m.name} is ${kindOf(m)} jump jet but ${first.name} is ${kindOf(first)} one; a 'Mech may mount one jump jet type only.`, { where: { mountId: m.id }, cite }),
    );
  }
  const walk = walkMP(record);
  if (walk !== null) {
    const run = Math.ceil(walk * 1.5);
    const over = standard[walk];
    if (over) out.push(finding("jump", "error", `${standard.length} standard jump jets are mounted; walking speed ${walk} allows at most ${walk}.`, { where: { mountId: over.id }, cite }));
    const overImproved = improved[run];
    if (overImproved) {
      out.push(finding("jump", "error", `${improved.length} improved jump jets are mounted; running speed ${run} allows at most ${run}.`, { where: { mountId: overImproved.id }, cite }));
    }
  }
  return out;
}

function placementCheck({ record, layout, catalog }: CheckInput): Finding[] {
  if (!layout.supported) return [];
  const out: Finding[] = [];
  // Whether a non-splittable item's slots are contiguous is not checked: a mount is one first slot and a count, so its
  // slots are always contiguous in this record model and the check could never fire.
  for (const mount of record.mounts) {
    const row = rowOf(catalog, record, mount);
    const rule = hostRule(row);
    const where = { location: mount.location ?? undefined, mountId: mount.id };
    if (mount.linkedTo !== undefined) {
      const host = record.mounts.find((m) => m.id === mount.linkedTo);
      if (mount.linkedTo === mount.id) {
        out.push(finding("placement", "error", `${mount.name} is linked to itself.`, { where, cite: rule ? tm(rule.page) : row?.cite }));
      } else if (!host) {
        out.push(finding("placement", "error", `${mount.name} is linked to a mount that is not on this 'Mech.`, { where, cite: rule ? tm(rule.page) : row?.cite }));
      } else if (rule && !rule.host.test(host.equipmentId ?? "")) {
        out.push(finding("placement", "error", `${mount.name} attaches to a ${rule.what}; ${host.name} is not one.`, { where, cite: tm(rule.page) }));
      } else if (rule && mount.location && host.location && mount.location !== host.location) {
        out.push(
          finding("placement", "error", `${mount.name} is in the ${locationName(mount.location)} but ${host.name} is in the ${locationName(host.location)}; they must share a location.`, {
            where,
            cite: tm(rule.page),
          }),
        );
      }
    }
    if (rule && row?.needs === "machine-gun" && mount.location) {
      // A machine gun array links two to four machine guns of one size, all in its own location (p.228).
      const guns = record.mounts.filter((m) => m.id !== mount.id && m.location === mount.location && rule.host.test(m.equipmentId ?? ""));
      const sizes = new Set(guns.map((g) => gunSize(g.equipmentId)));
      if (guns.length < 2 || guns.length > 4 || sizes.size > 1) {
        out.push(
          finding("placement", "error", `${mount.name} links two to four machine guns of one size in its own location; the ${locationName(mount.location)} has ${guns.length}${sizes.size > 1 ? " of mixed sizes" : ""}.`, {
            where,
            cite: tm(rule.page),
          }),
        );
      }
    } else if (rule && mount.linkedTo === undefined && mount.location) {
      const found = record.mounts.some((m) => m.id !== mount.id && m.location === mount.location && rule.host.test(m.equipmentId ?? ""));
      if (!found) {
        out.push(finding("placement", "error", `${mount.name} needs a ${rule.what} in the same location, and the ${locationName(mount.location)} has none.`, { where, cite: tm(rule.page) }));
      }
    }
    if (!row || !mount.location) continue;
    const allowed = record.configuration === "quad" ? (row.locationsQuad ?? row.locations) : row.locations;
    if (allowed && !allowed.includes(mount.location)) {
      const message =
        allowed.length === 0
          ? `${mount.name} cannot be mounted on a ${record.configuration}.`
          : `${mount.name} cannot go in the ${locationName(mount.location)}; it may go in ${allowed.map(locationName).join(", ")}.`;
      out.push(finding("placement", "error", message, { where, cite: row.cite }));
    }
  }
  // Items the 'Mech carries a fixed number of (Triple-Strength Myomer): the count is checked both ways against the record.
  const named = own(MYOMER.types, record.chassis.myomer) ? MYOMER.types[record.chassis.myomer]?.catalogId : undefined;
  const ids = new Set<string>(named ? [named] : []);
  for (const m of record.mounts) if (rowOf(catalog, record, m)?.perMech !== undefined && m.equipmentId) ids.add(m.equipmentId);
  for (const id of ids) {
    const row = catalog.rowFor(id, record.editionId);
    if (row?.perMech === undefined) continue;
    const found = record.mounts.filter((m) => m.equipmentId === id);
    const part = partName(MYOMER, record.chassis.myomer);
    if (found.length !== row.perMech) {
      out.push(
        finding("placement", "error", `${row.name} must be mounted ${row.perMech} times; this 'Mech has ${found.length}.`, {
          where: found[0] ? { mountId: found[0].id } : { field: "chassis.myomer" },
          cite: MYOMER.cite,
        }),
      );
    }
    if (found.length > 0 && named !== id) {
      out.push(finding("placement", "error", `${row.name} is mounted, but the chassis myomer is ${part}.`, { where: { mountId: found[0]?.id, field: "chassis.myomer" }, cite: MYOMER.cite }));
    }
  }
  return out;
}

/** Why an item is not available in a year: not yet introduced, extinct, or extinct and not yet reintroduced. */
function unavailableBecause(row: EquipmentRow, name: string, year: number): string {
  const spans = [...row.availability].sort((a, b) => a.from - b.from);
  const first = spans[0];
  if (first && year < first.from) return `${name} is not yet introduced in ${year}; it first appears in ${first.from}.`;
  const last = [...spans].reverse().find((s) => s.from <= year);
  const next = spans.find((s) => s.from > year);
  if (next && last?.to !== undefined) return `${name} is extinct in ${year}: gone after ${last.to}, and not reintroduced until ${next.from}.`;
  return `${name} is extinct in ${year}${last?.to === undefined ? "" : `; it was last available in ${last.to}`}.`;
}

function availabilityCheck({ record, catalog }: CheckInput): Finding[] {
  const out: Finding[] = [];
  for (const mount of record.mounts) {
    const row = rowOf(catalog, record, mount);
    if (!row) continue;
    const where = { mountId: mount.id };
    if (record.techBase !== "mixed" && row.techBase !== record.techBase) {
      out.push(
        finding("availability", "error", `${mount.name} is ${techBaseName(row.techBase)} equipment, which ${record.techBase === "clan" ? "a" : "an"} ${techBaseName(record.techBase)} 'Mech may not use.`, {
          where,
          cite: tm(PAGE.techBase),
        }),
      );
    }
    if (record.year !== null && !catalog.available(row, record.editionId, record.year)) {
      // The dates come from the cost and availability tables, pp.290-293; a row that cites a page there keeps its page.
      const fromRow = row.cite.page >= PAGE.availability && row.cite.page <= PAGE.availability + 3;
      const reason = unavailableBecause(row, mount.name, record.year);
      const where2 = fromRow ? "" : ` The dates are in the availability tables that start on p.${PAGE.availability}.`;
      if (row.yearsInferred) {
        out.push(finding("availability", "note", `${reason} The book does not print the year for this tech base, so this is a guess.${where2}`, { where, cite: fromRow ? row.cite : tm(PAGE.availability) }));
      } else {
        out.push(finding("availability", "error", `${reason}${where2}`, { where, cite: fromRow ? row.cite : tm(PAGE.availability) }));
      }
    }
  }
  return out;
}

function unmatchedCheck({ record, catalog }: CheckInput): Finding[] {
  const out: Finding[] = [];
  for (const mount of record.mounts) {
    if (!mount.part && !rowOf(catalog, record, mount)) {
      out.push(finding("unmatched", "note", `${mount.name} is not in our equipment table, so its weight, size and rules are not checked.`, { where: { mountId: mount.id } }));
    }
  }
  const { chassis } = record;
  const parts: [string, string, object, string][] = [
    ["engine type", chassis.engine.type, ENGINE_TYPES.types, "chassis.engine"],
    ["gyro", chassis.gyro, GYROS.types, "chassis.gyro"],
    ["cockpit", chassis.cockpit, COCKPITS.types, "chassis.cockpit"],
    ["structure", chassis.structure, STRUCTURE_TYPES.types, "chassis.structure"],
    ["armor type", chassis.armorType, ARMOR.types, "chassis.armorType"],
    ["myomer", chassis.myomer, MYOMER.types, "chassis.myomer"],
    ["heat sink type", chassis.heatSinks.type, HEAT_SINKS.types, "chassis.heatSinks"],
  ];
  for (const [label, key, table, field] of parts) {
    if (!own(table, key)) {
      out.push(finding("unmatched", "note", `The ${label} ${quoted(key)} is not in our tables, so what depends on it is not checked.`, { where: { field } }));
    }
  }
  return out;
}

function unsupportedCheck({ record, layout }: CheckInput): Finding[] {
  if (layout.supported) return [];
  return [
    finding(
      "unsupported",
      "note",
      `The ${record.configuration} configuration has no fixed slot layout here, so the slots and placement checks are skipped and armor is checked on the head and torsos only.`,
      { where: { field: "configuration" } },
    ),
  ];
}

export const CHECKS: Check[] = [
  { id: "weight", editions: "all", run: weightCheck },
  { id: "slots", editions: "all", run: slotsCheck },
  { id: "armor", editions: "all", run: armorCheck },
  { id: "engine", editions: "all", run: engineCheck },
  { id: "heat-sinks", editions: "all", run: heatSinkCheck },
  { id: "jump", editions: "all", run: jumpCheck },
  { id: "placement", editions: "all", run: placementCheck },
  { id: "availability", editions: "all", run: availabilityCheck },
  { id: "unmatched", editions: "all", run: unmatchedCheck },
  { id: "unsupported", editions: "all", run: unsupportedCheck },
];

const NO_LAYOUT: Layout = { supported: false, locations: [], slots: {}, unplaced: [], conflicts: [], overflow: [], partSlots: [] };

/** Every check that applies to the record's edition, in table order. A check that throws becomes a note under its own id
 * with a fixed message, so one bad check cannot blank the panel. The layout is computed once; if it cannot be, the
 * layout-reading checks see an unsupported layout and the failure is reported under `unsupported`. */
export function runChecks(record: MechRecord, catalog: Catalog): Finding[] {
  let layout = NO_LAYOUT;
  let layoutFailed = false;
  try {
    layout = buildLayout(record, catalog.factsOf);
  } catch {
    layoutFailed = true;
  }
  const out: Finding[] = [];
  for (const check of CHECKS) {
    if (check.editions !== "all" && !check.editions.includes(record.editionId)) continue;
    if (layoutFailed && check.id === "unsupported") {
      out.push(finding("unsupported", "note", "The slot layout could not be worked out, so the slots and placement checks were skipped."));
      continue;
    }
    try {
      out.push(...check.run({ record, layout, catalog }));
    } catch {
      out.push(finding(check.id, "note", `The ${check.id} check could not be completed for this record.`));
    }
  }
  return out;
}
