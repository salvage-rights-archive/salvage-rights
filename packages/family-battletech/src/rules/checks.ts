// The rules checks the editor's panel shows beside a 'Mech. The editor lets the player change anything; each check here
// says what is illegal or does not add up, with the printed TechManual page the rule rests on. One table of checks and
// one runner. A check reads `layout`, `weights` and the tables and never recomputes what they already give. Messages are
// our own words and state the numbers.
import {
  ARMOR,
  COCKPITS,
  ENGINE_TYPES,
  ENGINE_WEIGHTS,
  GYROS,
  HEAD_MAX_ARMOR,
  HEAT_SINK_RULES,
  HEAT_SINKS,
  MYOMER,
  SHEET,
  STRUCTURE_TYPES,
} from "../data/chassis";
import type { Catalog, EquipmentRow } from "./catalog";
import { engineTons, layout as buildLayout, maxArmor, walkMP, weights } from "./mech";
import type { Layout, LocationCode, MechRecord, Mount } from "./mech";

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
// Printed pages of rules that are not already cited by a chassis table: weight limit (p.46), engine rating from walking
// speed (p.48), jump jets (p.51), armor weight (p.55), tech base of equipment (p.57), Artemis IV (p.207), machine gun
// arrays (p.228), where the cost and availability tables begin (p.290).
const PAGE = { weight: 46, engineRating: 48, jump: 51, armorTons: 55, techBase: 57, artemis: 207, machineGunArray: 228, availability: 290 };

const LOCATION_NAMES: Record<LocationCode, string> = {
  HD: "Head",
  CT: "Center Torso",
  LT: "Left Torso",
  RT: "Right Torso",
  LA: "Left Arm",
  RA: "Right Arm",
  LL: "Left Leg",
  RL: "Right Leg",
  FLL: "Front Left Leg",
  FRL: "Front Right Leg",
  RLL: "Rear Left Leg",
  RRL: "Rear Right Leg",
};
const locationName = (code: LocationCode) => LOCATION_NAMES[code];
/** Slot numbers in the record are zero-based; the player sees them from 1. */
const slotLabel = (slot: number) => String(slot + 1);
const own = (table: object, key: string | number) => Object.hasOwn(table, key);
const rowOf = (catalog: Catalog, mount: Mount): EquipmentRow | undefined =>
  mount.part || mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
const mountName = (record: MechRecord, id: string) => record.mounts.find((m) => m.id === id)?.name ?? id;
const tons = (x: number) => `${x} ${x === 1 ? "ton" : "tons"}`;
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
const isJumpJet = (row: EquipmentRow | undefined): row is EquipmentRow => row?.kind === "jump-jet";

// What an item that `needs` something must sit beside, and the book's page for it. An item with another `needs` (for
// example liquid cargo space) has nothing in the record to check it against and is left alone.
const HOSTS: Record<string, { host: RegExp; what: string; page: number }> = {
  launcher: { host: /^(lrm|srm|mml)-\d+-(is|clan)$/, what: "missile launcher", page: PAGE.artemis },
  "machine-gun": { host: /^((light|heavy)-)?machine-gun-(is|clan)$/, what: "machine gun", page: PAGE.machineGunArray },
};

// ---------------------------------------------------------------------------------------------------------------
// The checks
// ---------------------------------------------------------------------------------------------------------------
function weightCheck({ record, catalog }: CheckInput): Finding[] {
  const { lines, total } = weights(record, catalog.factsOf);
  if (total === null) {
    const unknown = lines.filter((l) => l.tons === null).map((l) => l.label);
    return [finding("weight", "note", `The total weight could not be worked out; not known: ${unknown.join(", ")}.`)];
  }
  if (total > record.tons) {
    return [finding("weight", "error", `The parts weigh ${tons(total)}, over the ${record.tons} tons this 'Mech may weigh.`, { cite: tm(PAGE.weight) })];
  }
  if (total < record.tons) {
    return [
      finding("weight", "warning", `The parts weigh ${tons(total)} of ${record.tons} tons; ${tons(tidy(record.tons - total))} is unused.`, {
        cite: tm(PAGE.weight),
      }),
    ];
  }
  return [];
}
const tidy = (x: number) => Math.round(x * 1000) / 1000;

function slotsCheck({ record, layout }: CheckInput): Finding[] {
  if (!layout.supported) return [];
  const out: Finding[] = [];
  const cite = SHEET.cites.counts;
  for (const c of layout.conflicts) {
    const names = [...new Set(c.mountIds)].map((id) => mountName(record, id));
    const cell = layout.slots[c.location]?.[c.slot];
    if (names.length < 2 && cell?.kind === "fixed") names.push(cell.label);
    out.push(
      finding("slots", "error", `${names.join(" and ")} both use slot ${slotLabel(c.slot)} of the ${locationName(c.location)}.`, {
        where: { location: c.location, mountId: c.mountIds[c.mountIds.length - 1] },
        cite,
      }),
    );
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
    const type = p.part === "structure" ? record.chassis.structure : record.chassis.armorType;
    out.push(
      finding("slots", "error", `${type} ${p.part} takes ${p.needed} critical slots; the record places ${p.present}.`, {
        where: { field: p.part === "structure" ? "chassis.structure" : "chassis.armorType" },
        cite: p.part === "structure" ? STRUCTURE_TYPES.cite : ARMOR.cite,
      }),
    );
  }
  return out;
}

function armorCheck({ record, layout }: CheckInput): Finding[] {
  const out: Finding[] = [];
  const max = maxArmor(record);
  for (const [loc, a] of Object.entries(record.armor) as [LocationCode, { front: number; rear?: number }][]) {
    const total = a.front + (a.rear ?? 0);
    const limit = max[loc];
    if (limit === undefined) {
      // For a configuration we have no limits for (the unsupported check says so) only the locations we know are checked.
      if (layout.supported) {
        out.push(finding("armor", "error", `This ${record.configuration} has no ${locationName(loc)}, but armor is set there.`, { where: { location: loc }, cite: tm(54) }));
      }
      continue;
    }
    if (total > limit) {
      const split = a.rear === undefined ? "" : ` (${a.front} front, ${a.rear} rear)`;
      out.push(
        finding("armor", "error", `${locationName(loc)} armor is ${total}${split}; the most it can carry is ${limit}.`, {
          where: { location: loc },
          cite: loc === "HD" ? HEAD_MAX_ARMOR.cite : tm(54),
        }),
      );
    }
  }
  return out;
}

function armorTonnageNote({ record, catalog }: CheckInput): Finding[] {
  const line = weights(record, catalog.factsOf).lines.find((l) => l.label === "Armor");
  if (!line || line.tons === null) return [];
  return [finding("armor", "note", `The armor points carried need ${tons(line.tons)} of ${record.chassis.armorType} armor.`, { cite: tm(PAGE.armorTons) })];
}

function engineCheck({ record }: CheckInput): Finding[] {
  const out: Finding[] = [];
  const { type, rating } = record.chassis.engine;
  const where = { field: "chassis.engine" };
  if (!own(ENGINE_TYPES.types, type)) {
    out.push(finding("engine", "error", `Engine type "${type}" is not one we know.`, { where, cite: ENGINE_TYPES.cite }));
  } else if (!own(ENGINE_WEIGHTS.rows, rating)) {
    out.push(finding("engine", "error", `An engine rated ${rating} is not in the engine table.`, { where, cite: ENGINE_WEIGHTS.cite }));
  }
  if (engineTons(type, rating) === null) {
    out.push(finding("engine", "note", "The engine weight could not be checked.", { where }));
  }
  if (walkMP(record) === null) {
    const speed = record.tons > 0 ? Math.round((rating / record.tons) * 100) / 100 : NaN;
    out.push(
      finding("engine", "error", `Engine rating ${rating} over ${record.tons} tons gives a walking speed of ${speed}; it must be a whole number.`, {
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
  if (count < HEAT_SINK_RULES.freeWithEngine) {
    out.push(finding("heat-sinks", "error", `The chassis has ${count} heat sinks; a fusion engine always provides at least ${HEAT_SINK_RULES.freeWithEngine}.`, { where, cite }));
  }
  const sinks = record.mounts.filter((m) => rowOf(catalog, m)?.kind === "heat-sink");
  const rating = record.chassis.engine.rating;
  if (Number.isFinite(rating) && rating > 0) {
    const held = Math.min(count, Math.floor(rating / HEAT_SINK_RULES.ratingPerHeldSink));
    if (sinks.length + held !== count) {
      out.push(
        finding(
          "heat-sinks",
          "error",
          `${sinks.length} heat sinks are placed and the engine can hold ${held}, which makes ${sinks.length + held}; the chassis lists ${count}.`,
          { where, cite },
        ),
      );
    }
  }
  if (own(HEAT_SINKS.types, type)) {
    const odd = sinks.filter((m) => heatSinkTypeOf(rowOf(catalog, m) as EquipmentRow) !== type);
    const first = odd[0];
    if (first) {
      // The book allows one heat sink type per 'Mech, free engine sinks included, so this is an error rather than a warning.
      out.push(
        finding("heat-sinks", "error", `${odd.length} placed heat sinks are not ${type}, the chassis type; a 'Mech carries one heat sink type only.`, {
          where: { mountId: first.id },
          cite,
        }),
      );
    }
  }
  return out;
}

function jumpCheck({ record, catalog }: CheckInput): Finding[] {
  const jets = record.mounts.filter((m) => isJumpJet(rowOf(catalog, m)));
  if (jets.length === 0) return [];
  const out: Finding[] = [];
  const improved = jets.filter((m) => rowOf(catalog, m)?.id.startsWith("improved-"));
  const standard = jets.length - improved.length;
  if (improved.length > 0 && standard > 0) {
    out.push(finding("jump", "error", "Standard and improved jump jets are mixed; a 'Mech may mount one jump jet type only.", { where: { mountId: jets[0]?.id }, cite: tm(PAGE.jump) }));
  }
  const walk = walkMP(record);
  if (walk !== null) {
    const run = Math.ceil(walk * 1.5);
    if (standard > walk) {
      out.push(finding("jump", "error", `${standard} standard jump jets are mounted; walking speed ${walk} allows at most ${walk}.`, { cite: tm(PAGE.jump) }));
    }
    if (improved.length > run) {
      out.push(finding("jump", "error", `${improved.length} improved jump jets are mounted; running speed ${run} allows at most ${run}.`, { cite: tm(PAGE.jump) }));
    }
  }
  return out;
}

function placementCheck({ record, layout, catalog }: CheckInput): Finding[] {
  if (!layout.supported) return [];
  const out: Finding[] = [];
  // Whether a non-splittable item's slots are contiguous is not checked: a mount is one first slot and a count, so its
  // slots are always contiguous in this record model and the check could never fire.
  const perMech = new Map<string, { row: EquipmentRow; found: Mount[] }>();
  for (const mount of record.mounts) {
    const row = rowOf(catalog, mount);
    if (row?.perMech !== undefined) {
      const entry = perMech.get(row.id) ?? { row, found: [] };
      entry.found.push(mount);
      perMech.set(row.id, entry);
    }
    if (mount.linkedTo !== undefined) {
      const host = record.mounts.find((m) => m.id === mount.linkedTo);
      const rule = row?.needs ? HOSTS[row.needs] : undefined;
      if (!host) {
        out.push(finding("placement", "error", `${mount.name} is linked to a mount that is not on this 'Mech.`, { where: { mountId: mount.id }, cite: rule ? tm(rule.page) : row?.cite }));
      } else if (rule && mount.location && host.location && mount.location !== host.location) {
        out.push(
          finding("placement", "error", `${mount.name} is in the ${locationName(mount.location)} but ${host.name} is in the ${locationName(host.location)}; they must share a location.`, {
            where: { location: mount.location, mountId: mount.id },
            cite: tm(rule.page),
          }),
        );
      }
    } else if (row?.needs && mount.location) {
      const rule = Object.hasOwn(HOSTS, row.needs) ? HOSTS[row.needs] : undefined;
      const found = rule && record.mounts.some((m) => m.id !== mount.id && m.location === mount.location && rule.host.test(m.equipmentId ?? ""));
      if (rule && !found) {
        out.push(
          finding("placement", "error", `${mount.name} needs a ${rule.what} in the same location, and the ${locationName(mount.location)} has none.`, {
            where: { location: mount.location, mountId: mount.id },
            cite: tm(rule.page),
          }),
        );
      }
    }
    if (!row || !mount.location) continue;
    const allowed = record.configuration === "quad" ? (row.locationsQuad ?? row.locations) : row.locations;
    if (allowed && !allowed.includes(mount.location)) {
      const message =
        allowed.length === 0
          ? `${mount.name} cannot be mounted on a ${record.configuration}.`
          : `${mount.name} cannot go in the ${locationName(mount.location)}; it may go in ${allowed.map(locationName).join(", ")}.`;
      out.push(finding("placement", "error", message, { where: { location: mount.location, mountId: mount.id }, cite: row.cite }));
    }
  }
  for (const { row, found } of perMech.values()) {
    if (found.length !== row.perMech) {
      out.push(
        finding("placement", "error", `${row.name} must be mounted ${row.perMech} times; this 'Mech has ${found.length}.`, {
          where: { mountId: found[0]?.id },
          cite: MYOMER.cite,
        }),
      );
    }
  }
  return out;
}

function availabilityCheck({ record, catalog }: CheckInput): Finding[] {
  const out: Finding[] = [];
  for (const mount of record.mounts) {
    const row = rowOf(catalog, mount);
    if (!row) continue;
    const where = { mountId: mount.id };
    if (record.techBase !== "mixed" && row.techBase !== record.techBase) {
      out.push(finding("availability", "error", `${mount.name} is ${row.techBase} equipment, which a ${record.techBase} 'Mech may not use.`, { where, cite: tm(PAGE.techBase) }));
    }
    if (record.year !== null && !catalog.available(row, record.editionId, record.year)) {
      const from = row.availability[0]?.from;
      const since = from === undefined ? "" : ` (first available ${from})`;
      if (row.yearsInferred) {
        out.push(
          finding("availability", "note", `${mount.name} may not exist in ${record.year}${since}, but the book does not print the year for this tech base, so this is a guess.`, {
            where,
            cite: tm(PAGE.availability),
          }),
        );
      } else {
        out.push(finding("availability", "error", `${mount.name} is not available in ${record.year}${since}.`, { where, cite: tm(PAGE.availability) }));
      }
    }
  }
  return out;
}

function unmatchedCheck({ record, catalog }: CheckInput): Finding[] {
  const out: Finding[] = [];
  for (const mount of record.mounts) {
    if (!mount.part && !rowOf(catalog, mount)) {
      out.push(finding("unmatched", "note", `${mount.name} is not in our equipment table, so its weight, size and rules are not checked.`, { where: { mountId: mount.id } }));
    }
  }
  const { chassis } = record;
  const parts: [string, string, object][] = [
    ["engine type", chassis.engine.type, ENGINE_TYPES.types],
    ["gyro", chassis.gyro, GYROS.types],
    ["cockpit", chassis.cockpit, COCKPITS.types],
    ["structure", chassis.structure, STRUCTURE_TYPES.types],
    ["armor type", chassis.armorType, ARMOR.types],
    ["myomer", chassis.myomer, MYOMER.types],
    ["heat sink type", chassis.heatSinks.type, HEAT_SINKS.types],
  ];
  for (const [label, key, table] of parts) {
    if (!own(table, key)) out.push(finding("unmatched", "note", `The ${label} "${key}" is not in our tables, so what depends on it is not checked.`));
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
  { id: "armor", editions: "all", run: (input) => [...armorCheck(input), ...armorTonnageNote(input)] },
  { id: "engine", editions: "all", run: engineCheck },
  { id: "heat-sinks", editions: "all", run: heatSinkCheck },
  { id: "jump", editions: "all", run: jumpCheck },
  { id: "placement", editions: "all", run: placementCheck },
  { id: "availability", editions: "all", run: availabilityCheck },
  { id: "unmatched", editions: "all", run: unmatchedCheck },
  { id: "unsupported", editions: "all", run: unsupportedCheck },
];

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Every check that applies to the record's edition, in table order. A check that throws becomes a note naming it, so
 * one bad check cannot blank the panel. The layout is computed once. */
export function runChecks(record: MechRecord, catalog: Catalog): Finding[] {
  let layout: Layout;
  try {
    layout = buildLayout(record, catalog.factsOf);
  } catch (error) {
    return [finding("layout", "note", `The slot layout could not be worked out, so no checks ran: ${reason(error)}`)];
  }
  const out: Finding[] = [];
  for (const check of CHECKS) {
    if (check.editions !== "all" && !check.editions.includes(record.editionId)) continue;
    try {
      out.push(...check.run({ record, layout, catalog }));
    } catch (error) {
      out.push(finding(check.id, "note", `The ${check.id} check could not run: ${reason(error)}`));
    }
  }
  return out;
}
