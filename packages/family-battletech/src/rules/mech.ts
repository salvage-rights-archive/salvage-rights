// The 'Mech record and the pure functions over it: slot layout, weights, structure, armor limits, walking MP.
// A 'Mech is plain data; there is no class. None of these functions throws on a record they do not understand: a key
// that is not in a chassis table, a configuration with no fixed layout or a mount the catalog does not know gives
// the best answer available, with null (or supported: false) where it cannot know.
import {
  ARMOR,
  COCKPITS,
  ENGINE_TYPES,
  ENGINE_WEIGHTS,
  GYROS,
  HEAD_MAX_ARMOR,
  HEAD_STRUCTURE,
  HEAT_SINKS,
  INTERNAL_STRUCTURE,
  SHEET,
  STRUCTURE_TYPES,
} from "../data/chassis";

export type LocationCode = "HD" | "CT" | "LT" | "RT" | "LA" | "RA" | "LL" | "RL" | "FLL" | "FRL" | "RLL" | "RRL";
export type TechBase = "inner-sphere" | "clan";

export interface Mount {
  id: string;
  equipmentId: string | null; // null: not in our table
  part?: "structure" | "armor"; // a slot taken by the structure or armor type, not by an equipment item
  name: string;
  techBase: TechBase;
  location: LocationCode | null;
  slot: number | null; // zero-based first slot; null when not placed
  linkedTo?: string;
}

export interface MechRecord {
  schema: 1;
  id: string;
  editionId: string;
  name: { chassis: string; model: string };
  techBase: TechBase | "mixed";
  year: number | null;
  tons: number;
  configuration: string; // "biped" | "quad" | the source's own word
  chassis: {
    engine: { type: string; rating: number };
    gyro: string;
    cockpit: string;
    structure: string;
    armorType: string;
    myomer: string;
    heatSinks: { type: string; count: number };
  };
  armor: Partial<Record<LocationCode, { front: number; rear?: number }>>;
  mounts: Mount[];
  notes: { overview?: string; capabilities?: string; deployment?: string; variants?: string; notables?: string };
  imageUrl?: string;
  source?: {
    kind: "mordel";
    unitType: string;
    id: number;
    designer: string;
    fetchedAt: string;
    original: unknown;
    values: { battleValue?: number; cost?: number; rulesLevel?: string; era?: string };
  };
}

/** What one equipment item needs from the catalog for layout and weight. Task 2's catalog supplies it. */
export interface MountFacts {
  tons: number;
  slots: number;
}
export type FactsOf = (mount: Mount, record: MechRecord) => MountFacts | undefined;

export interface SlotCell {
  kind: "fixed" | "mount" | "empty";
  label: string;
  mountId?: string;
}
export interface Layout {
  supported: boolean; // false when the configuration has no fixed layout
  locations: LocationCode[];
  slots: Partial<Record<LocationCode, SlotCell[]>>;
  unplaced: Mount[]; // mounts that take slots and have no (usable) place
  conflicts: { location: LocationCode; slot: number; mountIds: string[] }[];
  overflow: { location: LocationCode; mountId: string }[];
  partSlots: { part: "structure" | "armor"; needed: number; present: number }[];
}

export interface WeightLine {
  label: string;
  tons: number | null; // null: could not be worked out
}

// ---------------------------------------------------------------------------------------------------------------
// Lookups that only see a table's own keys, so a key like "constructor" is unknown rather than a surprise.
// ---------------------------------------------------------------------------------------------------------------
function own<T>(table: Record<string | number, T>, key: string | number): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

type ConfigurationName = keyof typeof SHEET.configurations;
function configurationOf(name: string) {
  return Object.hasOwn(SHEET.configurations, name) ? SHEET.configurations[name as ConfigurationName] : undefined;
}

/** Rounds up to the next half ton, ignoring float noise. */
function ceilHalf(x: number): number {
  return Math.ceil(Math.round(x * 2 * 1e6) / 1e6) / 2;
}
const tidy = (x: number) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------------------------------------------

/** One label per slot ("" for none) for every location, from the fixed parts of the chassis. */
function fixedLabels(record: MechRecord, config: NonNullable<ReturnType<typeof configurationOf>>) {
  const labels: Partial<Record<LocationCode, string[]>> = {};
  const set = (loc: LocationCode, slot: number, label: string) => {
    const cells = labels[loc];
    if (cells && slot >= 0 && slot < cells.length) cells[slot] = label;
  };
  const size: Partial<Record<LocationCode, number>> = config.size;
  const fixed: Partial<Record<LocationCode, readonly string[]>> = config.fixed;
  for (const loc of Object.keys(size) as LocationCode[]) labels[loc] = Array<string>(size[loc] ?? 0).fill("");
  for (const loc of Object.keys(fixed) as LocationCode[]) fixed[loc]?.forEach((label, i) => set(loc, i, label));

  const cockpit = own(COCKPITS.types, record.chassis.cockpit);
  if (cockpit) {
    for (const n of cockpit.cockpit) set("HD", n - 1, "Cockpit");
    for (const n of cockpit.sensors) set("HD", n - 1, "Sensors");
    for (const n of cockpit.lifeSupport) set("HD", n - 1, "Life Support");
  }

  // Center torso: some engine cells, then the gyro, then the rest of the engine. Where the book leaves the placement
  // of a non-standard gyro to the designer we keep it contiguous, right after the first engine cells.
  const engine = own(ENGINE_TYPES.types, record.chassis.engine.type);
  const gyro = own(GYROS.types, record.chassis.gyro);
  const above = Math.min(SHEET.engineAbove, engine?.ct ?? SHEET.engineAbove);
  const gyroSlots = gyro?.slots ?? own(GYROS.types, "standard")?.slots ?? 4;
  if (engine) {
    for (let i = 0; i < above; i++) set("CT", i, "Engine");
    for (let i = 0; i < engine.ct - above; i++) set("CT", above + gyroSlots + i, "Engine");
    for (let i = 0; i < engine.side; i++) {
      set("LT", i, "Engine");
      set("RT", i, "Engine");
    }
  }
  if (gyro) for (let i = 0; i < gyro.slots; i++) set("CT", above + i, "Gyro");
  return labels;
}

export function layout(record: MechRecord, factsOf: FactsOf): Layout {
  const partSlots: Layout["partSlots"] = [];
  const structure = own(STRUCTURE_TYPES.types, record.chassis.structure);
  if (structure) {
    partSlots.push({ part: "structure", needed: structure.slots, present: record.mounts.filter((m) => m.part === "structure").length });
  }
  const armor = own(ARMOR.types, record.chassis.armorType);
  if (armor) {
    partSlots.push({ part: "armor", needed: armor.slots, present: record.mounts.filter((m) => m.part === "armor").length });
  }

  const config = configurationOf(record.configuration);
  if (!config) return { supported: false, locations: [], slots: {}, unplaced: [], conflicts: [], overflow: [], partSlots };

  const locations = Object.keys(config.size) as LocationCode[];
  const labels = fixedLabels(record, config);
  const slots: Partial<Record<LocationCode, SlotCell[]>> = {};
  for (const loc of locations) {
    slots[loc] = (labels[loc] ?? []).map((label): SlotCell => (label ? { kind: "fixed", label } : { kind: "empty", label: "" }));
  }

  const unplaced: Mount[] = [];
  const overflow: Layout["overflow"] = [];
  const clashes = new Map<string, { location: LocationCode; slot: number; mountIds: string[] }>();
  for (const mount of record.mounts) {
    const taken = mount.part ? 1 : (factsOf(mount, record)?.slots ?? 1);
    if (taken <= 0) continue;
    const cells = mount.location ? slots[mount.location] : undefined;
    const first = mount.slot;
    if (!mount.location || !cells || first === null || !Number.isInteger(first) || first < 0) {
      unplaced.push(mount);
      continue;
    }
    for (let i = 0; i < taken; i++) {
      const index = first + i;
      const cell = cells[index];
      if (!cell) {
        overflow.push({ location: mount.location, mountId: mount.id });
        break;
      }
      if (cell.kind !== "empty") {
        const key = `${mount.location}:${index}`;
        const clash = clashes.get(key) ?? { location: mount.location, slot: index, mountIds: [] };
        if (cell.mountId && !clash.mountIds.includes(cell.mountId)) clash.mountIds.push(cell.mountId);
        clash.mountIds.push(mount.id);
        clashes.set(key, clash);
        continue;
      }
      cells[index] = { kind: "mount", label: mount.name, mountId: mount.id };
    }
  }
  const conflicts = [...clashes.values()].sort(
    (a, b) => locations.indexOf(a.location) - locations.indexOf(b.location) || a.slot - b.slot,
  );
  return { supported: true, locations, slots, unplaced, conflicts, overflow, partSlots };
}

// ---------------------------------------------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------------------------------------------

export function weights(record: MechRecord, factsOf: FactsOf): { lines: WeightLine[]; total: number | null } {
  const { chassis } = record;
  const lines: WeightLine[] = [];

  const structure = own(STRUCTURE_TYPES.types, chassis.structure);
  const structureRow = own(INTERNAL_STRUCTURE.rows, record.tons);
  lines.push({ label: "Structure", tons: structure && structureRow ? structureRow[structure.weightColumn] : null });

  const engine = own(ENGINE_TYPES.types, chassis.engine.type);
  const engineRow = own(ENGINE_WEIGHTS.rows, chassis.engine.rating);
  lines.push({ label: "Engine", tons: engine && engineRow ? engineRow[engine.weightColumn] : null });

  const gyro = own(GYROS.types, chassis.gyro);
  const rating = chassis.engine.rating;
  lines.push({
    label: "Gyro",
    tons: gyro && Number.isFinite(rating) && rating > 0 ? ceilHalf(Math.ceil(rating / 100) * gyro.multiplier) : null,
  });

  lines.push({ label: "Cockpit", tons: own(COCKPITS.types, chassis.cockpit)?.tons ?? null });

  const extraSinks = Math.max(0, chassis.heatSinks.count - HEAT_SINKS.freeWithEngine);
  lines.push({ label: "Heat sinks", tons: Number.isFinite(extraSinks) ? extraSinks * HEAT_SINKS.tonsEach : null });

  const armorType = own(ARMOR.types, chassis.armorType);
  const points = Object.values(record.armor).reduce((sum, a) => sum + (a ? a.front + (a.rear ?? 0) : 0), 0);
  lines.push({
    label: "Armor",
    tons: armorType && Number.isFinite(points) ? ceilHalf(points / (ARMOR.basePointsPerTon * armorType.multiplier)) : null,
  });

  for (const mount of record.mounts) {
    if (mount.part) continue; // its weight is in the structure or armor line
    const facts = factsOf(mount, record);
    if (!facts) lines.push({ label: mount.name, tons: null });
    else if (facts.tons > 0) lines.push({ label: mount.name, tons: facts.tons });
  }

  const total = lines.some((l) => l.tons === null) ? null : tidy(lines.reduce((sum, l) => sum + (l.tons ?? 0), 0));
  return { lines, total };
}

// ---------------------------------------------------------------------------------------------------------------
// Structure, armor limits, speed
// ---------------------------------------------------------------------------------------------------------------

export function structurePoints(record: MechRecord): Partial<Record<LocationCode, number>> {
  const row = own(INTERNAL_STRUCTURE.rows, record.tons);
  if (!row) return {};
  const points: Partial<Record<LocationCode, number>> = { HD: HEAD_STRUCTURE, CT: row.ct, LT: row.side, RT: row.side };
  if (record.configuration === "biped") {
    Object.assign(points, { LA: row.arm, RA: row.arm, LL: row.leg, RL: row.leg });
  } else if (record.configuration === "quad") {
    Object.assign(points, { FLL: row.leg, FRL: row.leg, RLL: row.leg, RRL: row.leg });
  }
  return points;
}

/** The most armor each location may carry: 9 on the head, twice the structure points elsewhere (front plus rear). */
export function maxArmor(record: MechRecord): Partial<Record<LocationCode, number>> {
  const max: Partial<Record<LocationCode, number>> = {};
  for (const [loc, points] of Object.entries(structurePoints(record)) as [LocationCode, number][]) {
    max[loc] = loc === "HD" ? HEAD_MAX_ARMOR : points * 2;
  }
  return max;
}

export function walkMP(record: MechRecord): number | null {
  const { rating } = record.chassis.engine;
  if (!(record.tons > 0) || !Number.isFinite(rating)) return null;
  const mp = rating / record.tons;
  return Number.isInteger(mp) && mp > 0 ? mp : null;
}

/** A new record with the change applied to a copy; the original and its nested parts are untouched. */
export function editRecord(record: MechRecord, change: (draft: MechRecord) => void): MechRecord {
  const draft = structuredClone(record);
  change(draft);
  return draft;
}
