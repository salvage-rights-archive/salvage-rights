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
  FRANKENMECH,
  GYROS,
  HEAD_MAX_ARMOR,
  HEAT_SINK_RULES,
  HEAT_SINKS,
  INTERNAL_STRUCTURE,
  LAM,
  MIXED_TECHNOLOGY,
  MYOMER,
  SHEET,
  SHIELDS,
  STRUCTURE_TYPES,
} from "../data/chassis";
import type { Cite, PartFacts, Span } from "../data/chassis";
import { configurationInTime, equipmentPhase, eraOfRecord, eraOfYear, partPhase, partSpans, typeInTime, windowOf } from "./availability";
import { locationsFor, mountableOn, mountsRequired, podMountable } from "./catalog";
import { heatSinkMixAllowed, levelAtLeast, levelIn, levelItems, levelRow, mixedPhase } from "./levels";
import { datesText, partIsPrototypeOnly, partPrototype } from "./time";
import type { Catalog, EquipmentRow } from "./catalog";
import { ARM_FULL, armorSpread, armsOf, configurationOf, donorTons, engineTons, freeHeatSinks, industrialRulesOf, layout as buildLayout, maxArmor, mechTypeOf, structurePoints, walkMP, weights } from "./mech";
import { locationName, type Layout, type LocationCode, type MechRecord, type Mount } from "./mech";
import { mountedShields, missingActuators, shieldStats } from "./shields";
import { equipmentItems, mascOf, movementPenalty, rowOf, stemOf, TSM_ROWS } from "./walk";

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

// The rule for the Universal Technology Advancement Table's two dates: a prototype, or an item fielded between its prototype and production years, is Experimental level.
const IO_UTA = { book: "Interstellar Operations: Alternate Eras", page: 27 };

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
const mountName = (record: MechRecord, id: string) => record.mounts.find((m) => m.id === id)?.name ?? "an unnamed mount";
const finding = (check: string, level: Finding["level"], message: string, extra: Omit<Finding, "check" | "level" | "message"> = {}): Finding => ({
  check,
  level,
  message,
  ...extra,
});

/** The heat sink type key a row stands for. */
function heatSinkTypeOf(row: EquipmentRow): string {
  if (row.id.startsWith("compact")) return "compact";
  if (row.id.startsWith("laser")) return "laser";
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
/** What the pods of a configuration weigh and what the base leaves for them: the record's weight less the base alone (the fixed mounts, the base's own heat sinks). */
function podTons(record: MechRecord, catalog: Catalog): { pods: number; space: number } | undefined {
  if (!record.omni) return undefined;
  const fixed = new Set(record.omni.baseMountIds);
  const base: MechRecord = { ...record, mounts: record.mounts.filter((m) => fixed.has(m.id)), chassis: { ...record.chassis, heatSinks: { ...record.chassis.heatSinks, count: record.omni.baseHeatSinks, ...(record.chassis.heatSinks.extra ? { extra: record.chassis.heatSinks.extra.map((g, i) => ({ ...g, count: record.omni?.baseExtraHeatSinks?.[i] ?? 0 })) } : {}) } } };
  const all = weights(record, catalog.factsOf).total;
  const own = weights(base, catalog.factsOf).total;
  return all === null || own === null ? undefined : { pods: tidy(all - own), space: tidy(record.tons - own) };
}

function weightCheck({ record, layout, catalog }: CheckInput): Finding[] {
  const out: Finding[] = [];
  const where = { field: "tons" };
  const type = mechTypeOf(record);
  const limits = type.tonnage;
  if (isPositive(record.tons) && !(record.tons >= limits.min && record.tons <= limits.max && record.tons % limits.step === 0)) {
    out.push(
      finding("weight", "error", `${/^[AEIOU]/i.test(type.label) ? "An" : "A"} ${type.label} weighs ${limits.min} to ${limits.max} tons in steps of ${limits.step}; ${num(record.tons)} is not allowed.`, {
        where,
        cite: limits.cite,
      }),
    );
  }
  const { lines, total } = weights(record, catalog.factsOf);
  if (!layout.supported) {
    // The weights are worked out for a biped, a quad or a tripod; any other body has parts this tool does not know, so no over or under figure.
    const known = total !== null && Number.isFinite(total) ? ` The parts it knows add up to ${tons(total)}, for information only.` : "";
    out.push(finding("weight", "note", `The weight is not checked for the ${record.configuration} configuration.${known}`, { where }));
    return out;
  }
  if (total === null || !Number.isFinite(total)) {
    const unknown = lines.filter((l) => l.tons === null || !Number.isFinite(l.tons)).map((l) => l.label);
    out.push(finding("weight", "note", `The total weight could not be worked out; not known: ${unknown.join(", ")}.`, { where }));
  } else if (total > record.tons) {
    const pods = record.omni && !record.omni.isBase ? podTons(record, catalog) : undefined;
    const podNote = pods === undefined ? "" : ` (the pods weigh ${tons(pods.pods)}; this chassis has ${tons(pods.space)} of pod space)`;
    out.push(finding(pods === undefined ? "weight" : "omni-overweight", "error", `The parts weigh ${tons(total)}, over the ${tons(record.tons)} this 'Mech may weigh${podNote}.`, { where, cite: tm(PAGE.weight) }));
  } else if (record.omni?.isBase) {
    // The unloaded base is not a legal unit: what it leaves is the pod space (TechManual pp.20, 58), not waste.
    const open = layout.locations.flatMap((loc) => {
      const n = (layout.slots[loc] ?? []).filter((c) => c.kind === "empty").length;
      return n > 0 ? [`${locationName(loc)} ${n}`] : [];
    });
    out.push(finding("omni-pod-space", "note", `Pod space: ${tons(tidy(record.tons - total))}; open slots: ${open.length > 0 ? open.join(", ") : "none"}.`, { where, cite: tm(20) }));
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
  const spread = armorSpread(own(ARMOR.types, record.chassis.armorType) ? ARMOR.types[record.chassis.armorType] : undefined, record.configuration);
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
  if (isPositive(record.tons) && isPositive(rating) && walkMP(record) === null && record.frankenmech) {
    out.push(finding("engine", "error", `Engine rating ${rating} over ${record.tons} tons gives under 1 walking MP; a FrankenMech's engine must give at least 1.`, { where, cite: FRANKENMECH.cite }));
  } else if (isPositive(record.tons) && isPositive(rating) && walkMP(record) === null) {
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
  const { type, count, extra } = record.chassis.heatSinks;
  const where = { field: "chassis.heatSinks" };
  const cite = HEAT_SINK_RULES.cite;
  if (!isCount(count)) {
    return [finding("heat-sinks", "error", `The heat sink count is ${num(count)}; it must be a whole number, zero or more.`, { where, cite })];
  }
  // The standard rule is one heat sink type per 'Mech (TechManual p.53). The owner ruled (2026-11-25) that an Inner Sphere and a Clan double may
  // share a mixed technology 'Mech (TO:AUE p.189 leaves the mix to the players' judgment; mixed technology is itself Advanced, so the level
  // check asks for that), and that any other mix needs a FrankenMech or Fan-made rules or higher. heatSinkMixAllowed answers for every pair.
  const groups = [{ type, count }, ...(extra ?? [])];
  for (const [index, group] of (extra ?? []).entries()) {
    if (!isCount(group.count)) {
      out.push(finding("heat-sinks", "error", `The extra heat sink group ${index + 1} has ${num(group.count)} sinks; it must be a whole number, zero or more.`, { where, cite }));
    }
  }
  groups.forEach((a, i) => {
    groups.slice(i + 1).forEach((b) => {
      if (heatSinkMixAllowed(record, a.type, b.type)) return;
      // Compact and laser sinks (the rows with a page of their own) keep their own rule against mixing; the rest fall to the one-type rule.
      const barred = [a.type, b.type].map((t) => (own(HEAT_SINKS.types, t) ? HEAT_SINKS.types[t] : undefined)).find((t) => t?.cite !== undefined);
      const doubles = [a.type, b.type].every((t) => HEAT_SINK_RULES.mixable.includes(t)) && a.type !== b.type;
      const why = a.type === b.type ? "are listed twice; give the sinks of one type a single count" : doubles ? "may be mixed only on a mixed technology 'Mech" : "may be mixed only on a FrankenMech or at Fan-made rules or higher";
      out.push(finding("heat-sinks", "error", `${partName(HEAT_SINKS, a.type)} and ${partName(HEAT_SINKS, b.type)} heat sinks ${why}; the standard rules allow one type.`, { where, cite: barred?.cite ?? cite }));
    });
  });
  const allowed = groups.map((g) => g.type);
  const extraCount = (extra ?? []).reduce((n, g) => n + (isCount(g.count) ? g.count : 0), 0);
  const sinksOf = (m: Mount): number => {
    const row = rowOf(catalog, record, m);
    return row ? (HEAT_SINKS.types[heatSinkTypeOf(row)]?.perMount ?? 1) : 1;
  };
  const free = freeHeatSinks(record);
  if (count < free) {
    out.push(finding("heat-sinks", "error", `The chassis has ${count} heat sinks; a 'Mech has at least the ${free} heat sinks its engine provides.`, { where, cite: industrialRulesOf(record)?.cites.heatSinks ?? cite }));
  }
  const sinks = record.mounts.filter((m) => rowOf(catalog, record, m)?.kind === "heat-sink");
  const rating = record.chassis.engine.rating;
  if (isPositive(rating)) {
    // An OmniMech's engine holds only the base's sinks critical-free: every sink a configuration adds takes slots (TechManual p.54).
    const held = Math.min(record.omni ? record.omni.baseHeatSinks : count, count, Math.floor(rating / HEAT_SINK_RULES.ratingPerHeldSink));
    const placed = sinks.reduce((n, m) => n + sinksOf(m), 0);
    if (placed + held !== count + extraCount) {
      const podSinks = record.omni ? sinks.filter((m) => m.pod).length : 0;
      const omni = podSinks > 0 ? ` The base's sinks are the only ones the engine holds; the ${podSinks} pod heat ${podSinks === 1 ? "sink" : "sinks"} all take slots.` : "";
      out.push(
        finding(omni ? "omni-heat-sink-slots" : "heat-sinks", "error", `${placed} heat sinks are placed and the engine can hold ${held}, which makes ${placed + held}; the chassis lists ${count + extraCount}.${omni}`, { where, cite }),
      );
    } else {
      // The totals agree; each further kind must still be the sinks placed of its own type, since none of them come with the engine.
      for (const group of extra ?? []) {
        if (!isCount(group.count)) continue;
        const ofKind = sinks.reduce((n, m) => {
          const row = rowOf(catalog, record, m);
          return row !== undefined && heatSinkTypeOf(row) === group.type ? n + sinksOf(m) : n;
        }, 0);
        if (ofKind !== group.count) {
          out.push(finding("heat-sinks", "error", `The chassis lists ${group.count} ${partName(HEAT_SINKS, group.type)} heat sinks, none held by the engine, but ${ofKind} are placed.`, { where, cite }));
        }
      }
    }
  }
  if (own(HEAT_SINKS.types, type)) {
    // The standard rule is one heat sink type per 'Mech, free engine sinks included, so a mismatch is an error; a mixed record's second group is the other kind.
    const names = allowed.map((t) => partName(HEAT_SINKS, t)).join(" and ");
    for (const m of sinks) {
      const row = rowOf(catalog, record, m);
      const kind = row ? heatSinkTypeOf(row) : type;
      if (allowed.includes(kind)) continue;
      if (m.pod) {
        out.push(finding("omni-heat-sink-type", "error", `Pod heat sink ${m.name} is a ${partName(HEAT_SINKS, kind)} sink; this OmniMech's sinks are ${names}, and a 'Mech carries one type.`, { where: { mountId: m.id }, cite }));
      } else {
        out.push(finding("heat-sinks", "error", `${m.name} is a ${partName(HEAT_SINKS, kind)} heat sink, but the chassis uses ${names}; a 'Mech carries one heat sink type only.`, { where: { mountId: m.id }, cite }));
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
    const allowed = locationsFor(row, record.configuration);
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
    const required = row ? mountsRequired(row, record.configuration) : undefined;
    if (row === undefined || required === undefined) continue;
    const found = record.mounts.filter((m) => m.equipmentId === id);
    const part = partName(MYOMER, record.chassis.myomer);
    const isMyomer = TSM_ROWS.includes(id) || Object.values(MYOMER.types).some((t) => t.catalogId === id);
    const spread = locationsFor(row, record.configuration);
    if (spread && spread.length === required && found.length === required && found.every((m) => m.location !== null) && !spread.every((place) => found.some((m) => m.location === place))) {
      out.push(finding("placement", "error", `${row.name} must be mounted once in each of ${spread.map(locationName).join(", ")}.`, { where: { mountId: found[0]?.id }, cite: row.cite }));
    }
    if (found.length !== required) {
      out.push(
        finding("placement", "error", `${row.name} must be mounted ${required} times; this 'Mech has ${found.length}.`, {
          where: found[0] ? { mountId: found[0].id } : { field: "chassis.myomer" },
          cite: isMyomer ? MYOMER.cite : row.cite,
        }),
      );
    }
    if (isMyomer && found.length > 0 && named !== id) {
      out.push(finding("placement", "error", `${row.name} is mounted, but the chassis myomer is ${part}.`, { where: { mountId: found[0]?.id, field: "chassis.myomer" }, cite: MYOMER.cite }));
    }
  }
  return out;
}

/** Why an item is not available in a year: not yet introduced, extinct, or extinct and not yet reintroduced. */
function unavailableBecause(row: EquipmentRow, name: string, year: number): string {
  const spans = [...row.availability].sort((a, b) => a.from - b.from);
  const first = spans[0];
  if (first && year < first.from) return `${name} is not yet introduced in ${year}; ${row.prototypeYear !== undefined ? `${datesText(row.prototypeYear, first.from).toLowerCase()}` : `it first appears in ${first.from}`}.`;
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
    const window = windowOf(record);
    // The catalog says whether the item is in production; only when it is not do its prototype years matter.
    const inProduction = record.year !== null ? catalog.available(row, record.editionId, record.year) : window === null || catalog.availableBetween(row, record.editionId, window.from, window.to);
    const phase = inProduction ? "production" : equipmentPhase(row, record, catalog);
    if (phase === "prototype") {
      // A prototype is Experimental-level equipment until its production year (IO:AE printed p.27); the level check reports a unit built lower.
      const when = record.year !== null ? String(record.year) : `the ${eraOfRecord(record)?.name ?? "chosen"} era`;
      const needs = levelRow(levelIn("standard", phase, row.prototypeLevel)).label;
      out.push(finding("availability", "note", `${mount.name} is a prototype in ${when} (${datesText(row.prototypeYear, row.availability[0]?.from).toLowerCase()}); it needs ${needs} rules.`, { where, cite: IO_UTA }));
    }
    if (record.year === null && window !== null && phase === null) {
      const era = eraOfRecord(record);
      const reason = `${mount.name} is not available in the ${era?.name ?? "chosen"} era (${window.from} to ${Number.isFinite(window.to) ? window.to : "on"}).`;
      out.push(finding("availability", row.yearsInferred ? "note" : "error", `${reason} Set a year to check it against one.`, { where, cite: tm(PAGE.availability) }));
    }
    if (record.year !== null && phase === null) {
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

/** The era and the year disagree, or the body type is not one this tech base and time had. */
function eraCheck({ record }: CheckInput): Finding[] {
  const out: Finding[] = [];
  const holds = eraOfYear(record.year);
  if (record.era !== undefined && record.year !== null && holds?.id !== record.era) {
    out.push(finding("availability", "warning", `The era is ${record.era}, but the year ${record.year} is ${holds ? `in the ${holds.name} era` : "in no era we list"}. Choose the era again or change the year.`, { where: { field: "era" } }));
  }
  const type = mechTypeOf(record);
  const row = configurationOf(record.configuration);
  const bodyInTime = !row || configurationInTime(record.configuration, record);
  if (bodyInTime && !typeInTime(type, record)) {
    const when = record.year !== null ? String(record.year) : `the ${eraOfRecord(record)?.name ?? "chosen"} era`;
    out.push(finding("availability", "error", `A ${type.label} is not available to ${record.techBase === "clan" ? "a Clan" : record.techBase === "mixed" ? "a mixed technology" : "an Inner Sphere"} 'Mech in ${when}; ${spansText(record.techBase === "clan" ? (type.clanAvailability ?? type.availability) : type.availability, prototypeOf(record.techBase === "clan" ? (type.clanPrototypeYear ?? type.prototypeYear) : type.prototypeYear))}.`, { where: { field: "unitType" }, cite: type.availabilityCite }));
  }
  if (row && !bodyInTime) {
    const when = record.year !== null ? String(record.year) : `the ${eraOfRecord(record)?.name ?? "chosen"} era`;
    out.push(finding("availability", "error", `A ${row.name} is not available to ${record.techBase === "clan" ? "a Clan" : record.techBase === "mixed" ? "a mixed technology" : "an Inner Sphere"} 'Mech in ${when}; ${spansText(record.techBase === "clan" ? (row.clanAvailability ?? row.availability) : row.availability, prototypeOf(record.techBase === "clan" ? (row.clanPrototypeYear ?? row.prototypeYear) : row.prototypeYear))}.`, { where: { field: "configuration" }, cite: { book: "Interstellar Operations: Alternate Eras", page: 44 } }));
  }
  if (record.techBase === "mixed" && mixedPhase(record) === null) {
    const when = record.year !== null ? String(record.year) : `the ${eraOfRecord(record)?.name ?? "chosen"} era`;
    out.push(finding("availability", "error", `Mixed technology is not available in ${when}; the book dates its first prototypes to about ${MIXED_TECHNOLOGY.clanPrototypeYear}.`, { where: { field: "techBase" }, cite: MIXED_TECHNOLOGY.availabilityCite }));
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
  for (const group of chassis.heatSinks.extra ?? []) parts.push(["extra heat sink type", group.type, HEAT_SINKS.types, "chassis.heatSinks"]);
  for (const [label, key, table, field] of parts) {
    if (!own(table, key)) {
      out.push(finding("unmatched", "note", `The ${label} ${quoted(key)} is not in our tables, so what depends on it is not checked.`, { where: { field } }));
    }
  }
  return out;
}

/** One finding for each thing the record uses that belongs to a higher rules level than the record's own: its name, its level,
 * the page that gives it and the level it needs. A record with no level reads as the lowest that fits, so nothing is reported. */
function levelCheck({ record, catalog }: CheckInput): Finding[] {
  const level = record.rulesLevel;
  if (level === undefined) return [];
  return levelItems(record, catalog)
    .filter((item) => !levelAtLeast(level, item.level))
    .map((item) => {
      const needs = levelRow(item.level).label;
      const why = item.prototype === undefined ? `is ${needs} level` : `is a prototype in this unit's time (${item.prototype.toLowerCase()}), and prototypes are ${needs} level`;
      return finding("level", "error", `${item.name} (${item.what}) ${why}; this unit is built at ${levelRow(level).label} level. It needs ${needs} or higher.`, {
        where: item.where,
        cite: item.cite ?? tm(PAGE.techBase),
      });
    });
}

/** A tripod also needs its own cockpit and no other body may use it. */
function configurationCheck({ record }: CheckInput): Finding[] {
  const row = configurationOf(record.configuration);
  if (!row) return [];
  const out: Finding[] = [];
  if (record.configuration === "tripod" && record.techBase === "clan") {
    out.push(
      finding("configuration", "note", "The book gives the tripod's technology as Inner Sphere, and this record is Clan.", { where: { field: "configuration" }, cite: row.levelCite }),
    );
  }
  const cockpit = own(COCKPITS.types, record.chassis.cockpit) ? COCKPITS.types[record.chassis.cockpit] : undefined;
  if (row.cockpit && record.chassis.cockpit !== row.cockpit) {
    const needed = partName(COCKPITS, row.cockpit);
    out.push(
      finding("configuration", "error", `A ${record.configuration} must mount the ${needed} cockpit; ${partName(COCKPITS, record.chassis.cockpit)} is not allowed.`, {
        where: { field: "chassis.cockpit" },
        cite: COCKPITS.types[row.cockpit]?.cite ?? COCKPITS.cite,
      }),
    );
  } else if (cockpit?.only && cockpit.only !== record.configuration) {
    out.push(
      finding("configuration", "error", `The ${cockpit.name} cockpit is for a ${cockpit.only} only; this is a ${record.configuration}.`, {
        where: { field: "chassis.cockpit" },
        cite: cockpit.cite ?? COCKPITS.cite,
      }),
    );
  }
  return out;
}

/** The Land-Air 'Mech construction changes (Interstellar Operations: Alternate Eras, p.108). Conversion equipment weight
 * and the landing gear and avionics slots are in weights() and layout(), so a clash on those cells is a slots finding. */
function lamCheck({ record, catalog }: CheckInput): Finding[] {
  if (!own(LAM.conversionPercent, record.configuration)) return [];
  const out: Finding[] = [];
  const cite = LAM.cite;
  const add = (message: string, where?: Finding["where"]) => out.push(finding("lam", "error", message, { where, cite }));
  if (record.techBase !== "inner-sphere") add(`A Land-Air 'Mech uses Inner Sphere technology only; this one is ${techBaseName(record.techBase)}.`, { field: "techBase" });
  if (isPositive(record.tons) && record.tons > LAM.maxTons) add(`A Land-Air 'Mech weighs at most ${tons(LAM.maxTons)}; this one is ${tons(record.tons)}.`, { field: "tons" });
  const { engine, gyro, structure, armorType } = record.chassis;
  if (own(ENGINE_TYPES.types, engine.type) && !LAM.engines.includes(engine.type)) {
    add(`A Land-Air 'Mech has a standard or compact fusion engine; ${partName(ENGINE_TYPES, engine.type)} is not allowed.`, { field: "chassis.engine" });
  }
  if (own(GYROS.types, gyro) && !LAM.gyros.includes(gyro)) {
    add(`A Land-Air 'Mech has a standard, compact or heavy-duty gyro; ${partName(GYROS, gyro)} is not allowed.`, { field: "chassis.gyro" });
  }
  if ((STRUCTURE_TYPES.types[structure]?.slots ?? 0) > 0 && own(STRUCTURE_TYPES.types, structure)) {
    add(`${partName(STRUCTURE_TYPES, structure)} structure takes critical slots, which a Land-Air 'Mech may not use.`, { field: "chassis.structure" });
  }
  if ((ARMOR.types[armorType]?.slots ?? 0) > 0 && own(ARMOR.types, armorType)) {
    add(`${partName(ARMOR, armorType)} armor takes critical slots, which a Land-Air 'Mech may not use.`, { field: "chassis.armorType" });
  }
  for (const arm of ["LA", "RA"] as const) {
    if (armsOf(record)?.[arm]?.lowerArm === false) add(`A Land-Air 'Mech must have both lower arm actuators; the ${locationName(arm)} has none.`, { location: arm });
  }
  const jets = record.mounts.filter((m) => rowOf(catalog, record, m)?.kind === "jump-jet").length;
  if (jets < LAM.minJumpMP) add(`A Land-Air 'Mech needs at least ${LAM.minJumpMP} jump jets; this one has ${jets}.`);
  const split = new Map<string, Set<string | null>>();
  for (const m of record.mounts) {
    const bar = LAM.barred.find((b) => b.ids.includes(m.equipmentId ?? ""));
    if (bar) add(`${m.name} cannot be mounted on a Land-Air 'Mech: ${bar.why}.`, { mountId: m.id, location: m.location ?? undefined });
    const row = rowOf(catalog, record, m);
    if (row?.perMech !== undefined) split.set(row.name, (split.get(row.name) ?? new Set()).add(m.location));
  }
  for (const [name, places] of split) {
    if (places.size > 1) add(`${name} may not be split between locations on a Land-Air 'Mech; all of it goes in one location.`);
  }
  return out;
}

/** The dates of a body or 'Mech type row as the part-like facts `spansText` reads. */
const prototypeOf = (year: number | undefined): PartFacts => (year === undefined ? {} : { prototypeYear: year });

/** What a part's dates say, in words: "it appears in 2579" or "it is available 2487 to 2850 and from 3035". */
function spansText(spans: Span[], part: PartFacts, techBase: MechRecord["techBase"] = "inner-sphere"): string {
  const [only] = spans;
  const prototype = partPrototype(part, techBase);
  const early = prototype === undefined ? "" : `its prototype appears in ${prototype} and `;
  if (spans.length === 1 && only !== undefined && only.to === undefined) {
    return partIsPrototypeOnly(part, techBase) ? `prototypes appear in ${only.from}` : prototype === undefined ? `it appears in ${only.from}` : `${early}production begins in ${only.from}`;
  }
  return `${early}it is available ${spans.map((s) => (s.to === undefined ? `from ${s.from}` : `${s.from} to ${s.to}`)).join(" and ")}`;
}

/**
 * The newer structure, armor, engine and cockpit types (rows that carry PartFacts in data/chassis.ts): whose technology each is,
 * when it first appears, a warning for a part printed for IndustrialMechs or Primitive 'Mechs, and what it does in play as a note.
 * Play effects are shown, never simulated.
 */
function partsCheck({ record, catalog }: CheckInput): Finding[] {
  const out: Finding[] = [];
  const { chassis } = record;
  const parts: [string, { cite: Cite; types: Record<string, PartFacts & { name: string }> }, string, string][] = [
    ["structure", STRUCTURE_TYPES, chassis.structure, "chassis.structure"],
    ["armor", ARMOR, chassis.armorType, "chassis.armorType"],
    ["engine", ENGINE_TYPES, chassis.engine.type, "chassis.engine"],
    ["cockpit", COCKPITS, chassis.cockpit, "chassis.cockpit"],
    ["gyro", GYROS, chassis.gyro, "chassis.gyro"],
    ["heat sink", HEAT_SINKS, chassis.heatSinks.type, "chassis.heatSinks"],
    ["myomer", MYOMER, chassis.myomer, "chassis.myomer"],
  ];
  for (const group of chassis.heatSinks.extra ?? []) parts.push(["heat sink", HEAT_SINKS, group.type, "chassis.heatSinks"]);
  for (const [what, table, key, field] of parts) {
    const part = own(table.types, key) ? table.types[key] : undefined;
    if (!part) continue;
    const where = { field };
    const cite = part.cite ?? table.cite;
    const clanOnly = part.techBase === "clan" && record.techBase === "inner-sphere";
    const isOnly = part.techBase === "inner-sphere" && record.techBase === "clan";
    if (clanOnly || isOnly) {
      out.push(finding("parts", "error", `${part.name} ${what} is ${clanOnly ? "Clan" : "Inner Sphere"} technology; this is ${record.techBase === "clan" ? "a Clan" : "an Inner Sphere"} 'Mech.`, { where, cite }));
    }
    const spans = partSpans(part, record.techBase);
    const phase = partPhase(part, record);
    const when = record.year !== null ? String(record.year) : `the ${eraOfRecord(record)?.name ?? "chosen"} era`;
    if (spans !== undefined && phase === null) {
      out.push(finding("parts", "error", `${part.name} ${what} is not available in ${when}; ${spansText(spans, part, record.techBase)}.`, { where, cite: part.availabilityCite ?? cite }));
    } else if (phase === "prototype") {
      const needs = levelRow(levelIn("standard", phase, part.prototypeLevel)).label;
      out.push(finding("parts", "note", `${part.name} ${what} is a prototype in ${when} (${datesText(partPrototype(part, record.techBase), spans?.[0]?.from).toLowerCase()}); it needs ${needs} rules.`, { where, cite: IO_UTA }));
    }
    if (part.industrial && industrialRulesOf(record) === undefined) {
      out.push(finding("parts", "error", `${part.name} ${what} is printed for IndustrialMechs; a ${mechTypeOf(record).label} may not use it.`, { where, cite }));
    }
    if (part.primitive) {
      out.push(finding("parts", "warning", `${part.name} ${what} is printed for Primitive BattleMechs, which have their own construction rules this tool does not check.`, { where, cite }));
    }
    if (part.rules) out.push(finding("parts", "note", `${part.name} ${what}${part.rulesLevel && part.rulesLevel !== "standard" ? ` (${part.rulesLevel} rules)` : ""}: ${part.rules}`, { where, cite: part.rulesCite ?? cite }));
  }
  const slow = movementPenalty(record, catalog);
  if (slow.because.length > 0) {
    const armor = own(ARMOR.types, chassis.armorType) ? ARMOR.types[chassis.armorType] : undefined;
    out.push(finding("parts", "note", `Movement: ${slow.because.join("; ")}. The record sheet and the Battle Value count it.`, { cite: armor?.movement ? (armor.rulesCite ?? ARMOR.cite) : SHIELDS.cite }));
  }
  return out;
}

/** Shields (TO:AUE printed pp.100 and 103): only in an arm, one to an arm, none on a body without arms; what each gives its arm and what a large one costs. */
function shieldCheck({ record, catalog }: CheckInput): Finding[] {
  const shields = mountedShields(record, catalog);
  if (shields.length === 0) return [];
  const out: Finding[] = [];
  const size = configurationOf(record.configuration)?.size as Partial<Record<LocationCode, number>> | undefined;
  const armless = size !== undefined && size.LA === undefined && size.RA === undefined;
  const cite = SHIELDS.rulesCite;
  for (const shield of shields) {
    const where = { mountId: shield.mount.id, location: shield.mount.location ?? undefined };
    if (armless) {
      out.push(finding("shields", "error", `A ${record.configuration} has no arms, so it cannot mount ${shield.mount.name}; a shield goes in an arm.`, { where, cite }));
      continue;
    }
    if (shield.arm === null) {
      if (shield.mount.location !== null) {
        out.push(finding("shields", "error", `${shield.mount.name} is in the ${locationName(shield.mount.location)}; a shield may only be mounted in an arm.`, { where, cite }));
      }
      continue;
    }
    const { da, dc } = shieldStats(record, shield);
    const lost = missingActuators(record, shield.arm);
    const reduced = lost > 0 ? ` (less ${lost} each for ${lost === 1 ? "its" : "the"} missing arm or hand actuator${lost === 1 ? "" : "s"})` : "";
    out.push(finding("shields", "note", `${shield.mount.name} in the ${locationName(shield.arm)}: Damage Absorption ${da}, Damage Capacity ${dc}${reduced}. A Shield Bash takes ${shield.row.bash} to hit.`, { where, cite: SHIELDS.cite }));
  }
  for (const arm of ["LA", "RA"] as const) {
    const here = shields.filter((s) => s.arm === arm);
    if (here.length > SHIELDS.perArm) {
      out.push(finding("shields", "error", `The ${locationName(arm)} mounts ${here.length} shields; only ${SHIELDS.perArm} may be mounted per arm.`, { where: { location: arm }, cite }));
    }
  }
  const jets = record.mounts.filter((m) => rowOf(catalog, record, m)?.kind === "jump-jet").length;
  if (jets > 0 && shields.some((s) => s.row.noJump)) {
    out.push(finding("shields", "note", "A 'Mech carrying a large shield may not jump; its jump jets are for the Battle Value only.", { cite: SHIELDS.cite }));
  }
  return out;
}

function unsupportedCheck({ record, layout }: CheckInput): Finding[] {
  if (layout.supported) return [];
  return [
    finding(
      "unsupported",
      "note",
      `The ${record.configuration} configuration has no fixed slot layout here, so the weight, slots and placement checks are skipped and armor is checked on the head and torsos only.`,
      { where: { field: "configuration" } },
    ),
  ];
}

/**
 * The rules of the record's 'Mech type. Equipment printed for another kind of unit is refused for any type. An OmniMech's rules are
 * not built, so it is checked as a BattleMech and says so. An IndustrialMech (TechManual, IndustrialMech Construction, printed
 * pp.64-75) has its own: Inner Sphere or Clan, a biped or a quad, only industrial structure, the engines, cockpits, gyro, heat
 * sinks, myomer and armor its tables name, jump jets only with a fusion or fission engine and only standard ones, and no Artemis IV,
 * Beagle Active Probe, C3 or targeting computer without Advanced Fire Control. One finding for each rule it breaks (one for each item
 * where the rule is about an item); the tonnage limit is in the weight check.
 */
function unitTypeCheck({ record, catalog }: CheckInput): Finding[] {
  const type = mechTypeOf(record);
  const out: Finding[] = [];
  const add = (message: string, cite: { book: string; page: number }, where?: Finding["where"]) => out.push(finding("unit-type", "error", message, { where, cite }));
  if (!type.ready && !record.omni) {
    out.push(finding("unit-type", "note", `${type.label} rules are not built yet, so this is checked as a BattleMech.`, { where: { field: "unitType" }, cite: type.cite }));
  }
  for (const mount of record.mounts) {
    const row = rowOf(catalog, record, mount);
    if (row && !mountableOn(row, type.unit)) {
      add(`${mount.name} is not equipment a ${type.label} may mount.`, row.cite, { mountId: mount.id, location: mount.location ?? undefined });
    }
  }
  const rules = type.industrial;
  if (!rules) return out;
  const { chassis } = record;
  const names = (table: { types: Record<string, { name: string }> }, keys: string[], renamed: Record<string, string> = {}) =>
    keys.map((key) => (own(renamed, key) ? (renamed[key] ?? key) : partName(table, key))).join(", ");
  const unit = type.label;
  if (!rules.techBases.some((base) => base === record.techBase)) {
    add(`A ${unit} is Inner Sphere or Clan; a ${techBaseName(record.techBase).toLowerCase()} technology 'Mech is not allowed.`, rules.cites.techBase, { field: "techBase" });
  }
  if (!rules.configurations.includes(record.configuration)) {
    add(`A ${unit} is a ${rules.configurations.join(" or a ")}; the ${record.configuration} configuration is not allowed.`, rules.cites.configuration, { field: "configuration" });
  }
  const parts: [string, { types: Record<string, { name: string }> }, string, string[], string, Cite, Record<string, string>?][] = [
    ["structure", STRUCTURE_TYPES, chassis.structure, rules.parts.structure, "chassis.structure", rules.cites.structure],
    ["engine", ENGINE_TYPES, chassis.engine.type, rules.parts.engine, "chassis.engine", rules.cites.engine],
    ["cockpit", COCKPITS, chassis.cockpit, rules.parts.cockpit, "chassis.cockpit", rules.cites.cockpit],
    ["gyro", GYROS, chassis.gyro, rules.parts.gyro, "chassis.gyro", rules.cites.gyro],
    ["heat sink", HEAT_SINKS, chassis.heatSinks.type, rules.parts.heatSink, "chassis.heatSinks", rules.cites.heatSinks],
    ["myomer", MYOMER, chassis.myomer, rules.parts.myomer, "chassis.myomer", rules.cites.myomer],
    ["armor", ARMOR, chassis.armorType, rules.parts.armor, "chassis.armorType", rules.cites.armor, rules.armorNames],
  ];
  for (const group of chassis.heatSinks.extra ?? []) parts.push(["heat sink", HEAT_SINKS, group.type, rules.parts.heatSink, "chassis.heatSinks", rules.cites.heatSinks]);
  for (const [what, table, key, allowed, field, cite, renamed] of parts) {
    if (own(table.types, key) && !allowed.includes(key)) {
      const name = renamed !== undefined && own(renamed, key) ? (renamed[key] ?? key) : partName(table, key);
      add(`${name} ${what} is not allowed on an ${unit}; it has ${names(table, allowed, renamed)}.`, cite, { field });
    }
  }
  const jets = record.mounts.filter((m) => rowOf(catalog, record, m)?.kind === "jump-jet");
  if (jets.length > 0 && own(ENGINE_TYPES.types, chassis.engine.type) && !rules.jumpEngines.includes(chassis.engine.type)) {
    add(`An ${unit} may mount jump jets only with a fusion or fission engine; this one has ${partName(ENGINE_TYPES, chassis.engine.type)} and ${jets.length} jump ${jets.length === 1 ? "jet" : "jets"}.`, rules.cites.jump, { field: "chassis.engine" });
  }
  for (const m of jets) {
    const row = rowOf(catalog, record, m);
    if (row && stemOf(row.id) !== "jump-jet") add(`${m.name} is not a standard jump jet; an ${unit} may use only standard jump jets.`, rules.cites.jump, { mountId: m.id });
  }
  if (chassis.cockpit !== "industrial-afc") {
    for (const m of record.mounts) {
      if (m.equipmentId !== null && rules.needsFireControl.includes(m.equipmentId)) {
        add(`${m.name} needs Advanced Fire Control; this ${unit}'s ${own(COCKPITS.types, chassis.cockpit) ? `${partName(COCKPITS, chassis.cockpit)} cockpit has` : "cockpit has"} none.`, rules.cites.fireControl, { mountId: m.id, location: m.location ?? undefined });
      }
    }
  }
  const amplifiers = weights(record, catalog.factsOf).lines.find((l) => l.label === "Power amplifiers");
  if (amplifiers?.tons) {
    out.push(finding("unit-type", "note", `The ${partName(ENGINE_TYPES, chassis.engine.type)} engine needs power amplifiers for the energy weapons: ${tons(amplifiers.tons)}, in the weight and taking no slots.`, { where: { field: "chassis.engine" }, cite: rules.cites.powerAmplifier }));
  }
  return out;
}

const LAUNCHER = /^(lrm|srm|mml)-\d+-(is|clan)$/;
// A Gauss rifle, autocannon (any kind) or PPC: the weapons that keep the lower arm and hand off the arm they sit in on an OmniMech (TechManual p.57).
const ARM_HEAVY = /(^|-)(gauss|ppc)(-|$)|(^|-)ac-\d|-x-ac-/;

/**
 * The rules only an OmniMech's configuration has (TechManual pp.19-20, 44-58): a body an Omni may have, no pod item the books bar from pods
 * (the catalog's `pod: false`), the lower arm and hand off any arm that carries a Gauss rifle, autocannon or PPC, and one Artemis IV state
 * for every missile launcher (errata v8.0): if the base's launchers lack it, none has it; if they have it, every launcher does.
 */
function omniCheck({ record, catalog }: CheckInput): Finding[] {
  if (!record.omni) return [];
  const out: Finding[] = [];
  const rules = mechTypeOf(record).omni;
  const body = configurationOf(record.configuration);
  if (rules && body && !rules.bodies.includes(record.configuration)) {
    out.push(finding("omni-unit-type", "error", `${/^[AEIOU]/i.test(body.name) ? "An" : "A"} ${body.name} cannot be built as an OmniMech.`, { where: { field: "configuration" }, cite: rules.bodyCite }));
  }
  for (const m of record.mounts) {
    const row = rowOf(catalog, record, m);
    if (!row) continue;
    if (m.pod && !podMountable(row)) {
      out.push(finding("omni-pod-forbidden", "error", `${m.name} cannot be pod-mounted; an OmniMech can only carry it as fixed equipment in the base.`, { where: { mountId: m.id }, cite: row.podCite ?? row.cite }));
    }
    if ((m.location === "LA" || m.location === "RA") && ARM_HEAVY.test(row.id) && !row.id.startsWith("protomech")) {
      const has = { ...ARM_FULL, ...armsOf(record)?.[m.location] };
      if (has.lowerArm || has.hand) {
        out.push(finding("omni-arm-actuators", "error", `The ${locationName(m.location)} carries ${m.name}; on an OmniMech the lower arm and hand actuators must be removed from that arm first.`, { where: { mountId: m.id, location: m.location }, cite: tm(PAGE.techBase) }));
      }
    }
  }
  // Artemis: which launcher an Artemis belongs to is its link, else the first launcher in its location.
  const launchers = record.mounts.filter((m) => LAUNCHER.test(m.equipmentId ?? ""));
  const artemis = record.mounts.filter((m) => rowOf(catalog, record, m)?.needs === "launcher");
  const hostOf = (a: Mount) => launchers.find((l) => l.id === a.linkedTo) ?? (a.linkedTo === undefined ? launchers.find((l) => l.location === a.location) : undefined);
  const isFixed = (m: Mount) => !m.pod;
  if (launchers.some(isFixed)) {
    const baseHas = artemis.some((a) => isFixed(a));
    const cite = tm(PAGE.artemis);
    for (const a of artemis.filter((x) => x.pod)) {
      const host = hostOf(a);
      if (host && isFixed(host)) {
        out.push(finding("omni-artemis", "error", `${a.name} is linked to the fixed launcher ${host.name}; Artemis on a fixed launcher is part of the base.`, { where: { mountId: a.id }, cite }));
      } else if (!baseHas) {
        out.push(finding("omni-artemis", "error", `The base launchers lack Artemis, so every launcher here must lack it; ${a.name} is mounted.`, { where: { mountId: a.id }, cite }));
      }
    }
    if (baseHas) {
      for (const l of launchers.filter((x) => x.pod && !artemis.some((a) => hostOf(a)?.id === x.id))) {
        out.push(finding("omni-artemis", "error", `The base launchers have Artemis, so every launcher here must have it; ${l.name} does not.`, { where: { mountId: l.id }, cite }));
      }
    }
  }
  return out;
}

/** The FrankenMech option (Campaign Operations p.213): what the page asks of a 'Mech built from donor parts, beyond the construction checks
 * every 'Mech gets. The engine, gyro, cockpit and armor limits are the ordinary checks reading the FrankenMech's own figures (walkMP, structurePoints,
 * weights). Where the page asks for one heat sink type, the owner ruled otherwise (2026-11-25): the kinds may mix, so the heat sink check says yes. */
function frankenCheck({ record, catalog }: CheckInput): Finding[] {
  const franken = record.frankenmech;
  if (!franken) return [];
  const cite = FRANKENMECH.cite;
  const out: Finding[] = [];
  const say = (level: Finding["level"], message: string, where: Finding["where"] = { field: "frankenmech" }) => out.push(finding("frankenmech", level, message, { where, cite }));
  if (record.omni || record.unitType === "omnimech") say("error", "An OmniMech cannot be a FrankenMech: its Omni parts lose their benefits and cannot be reconfigured. Build it as a BattleMech or IndustrialMech instead.", { field: "unitType" });
  const points = structurePoints(record);
  const locations = Object.keys(points) as LocationCode[];
  if (isPositive(record.tons) && locations.length !== FRANKENMECH.locationCount) {
    say("error", `The FrankenMech rules are written for ${FRANKENMECH.locationCount} body locations; a ${record.configuration} has ${locations.length || "none we know"}.`, { field: "configuration" });
  }
  for (const [loc, donor] of Object.entries(franken.donors ?? {}) as [LocationCode, number][]) {
    if (loc !== "CT" && !Object.hasOwn(INTERNAL_STRUCTURE.rows, donor)) say("error", `The ${locationName(loc)} donor weighs ${num(donor)} tons, which is not a 'Mech tonnage in the structure table.`, { location: loc, field: "frankenmech" });
  }
  // Legs come from a 'Mech of the same tonnage or heavier; mismatched legs cost piloting (a lower arm or foreleg is not a leg, so only LL, RL and the rest of the leg locations count).
  const legs = locations.filter((loc) => !["HD", "CT", "LT", "RT", "LA", "RA"].includes(loc));
  for (const loc of legs) {
    const donor = donorTons(record, loc);
    if (donor < record.tons) say("error", `The ${locationName(loc)} comes from a ${donor}-ton donor; a FrankenMech of ${record.tons} tons needs legs from a 'Mech of ${record.tons} tons or more.`, { location: loc, field: "frankenmech" });
  }
  if (legs.length > 0) {
    const mixedTons = new Set(legs.map((loc) => donorTons(record, loc))).size > 1;
    const { notOneMech, differentTonnage } = FRANKENMECH.legPiloting;
    say("note", mixedTons ? `The legs come from different tonnages: +${differentTonnage} on Piloting Skill Rolls.` : `Legs not all from one 'Mech: +${notOneMech} on Piloting Skill Rolls; legs of different tonnages: +${differentTonnage}.`);
  }
  // Myomers cannot be mixed, and a MASC means standard myomer.
  if (mascOf(record, equipmentItems(record, catalog).items).mounts.length > 0 && record.chassis.myomer !== "standard") {
    say("error", "A FrankenMech with MASC installed may use only standard myomer.", { field: "chassis.myomer" });
  }
  return out;
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
  { id: "level", editions: "all", run: levelCheck },
  { id: "configuration", editions: "all", run: configurationCheck },
  { id: "unit-type", editions: "all", run: unitTypeCheck },
  { id: "unmatched", editions: "all", run: unmatchedCheck },
  { id: "parts", editions: "all", run: partsCheck },
  { id: "era", editions: "all", run: eraCheck },
  { id: "shields", editions: "all", run: shieldCheck },
  { id: "lam", editions: "all", run: lamCheck },
  { id: "unsupported", editions: "all", run: unsupportedCheck },
  { id: "omni", editions: "all", run: omniCheck },
  { id: "frankenmech", editions: "all", run: frankenCheck },
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
  // Unlimited: the check still says everything, but nothing it finds blocks the sheet.
  if (record.rulesLevel === "unlimited") return out.map((f) => (f.level === "error" ? { ...f, level: "warning" as const } : f));
  return out;
}
