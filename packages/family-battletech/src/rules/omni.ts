// OmniMechs: one chassis holding the fixed part once (the base) and every configuration of pods (Prime, A, B...). Plain data like
// MechRecord; a configuration is turned into an ordinary MechRecord by `resolveConfiguration`, and cost, Battle Value, the checks, the
// layout and the sheet read that record exactly as they read any 'Mech (TechManual pp.19-20, 44-58, read against the page image).
// Nothing here throws on a chassis it does not understand: an unknown configuration id resolves to nothing, never an exception.
import type { RulesLevel } from "../data/chassis";
import type { Catalog } from "./catalog";
import { podMountable } from "./catalog";
import { runChecks } from "./checks";
import type { Finding } from "./checks";
import { levelItems, levelRow, lowestLevelFor } from "./levels";
import { armsOf, layout as buildLayout, newRecord, weights } from "./mech";
import type { LocationCode, MechRecord, Mount, NewMechOptions, OmniLink } from "./mech";
import { rowOf } from "./walk";

export type { OmniLink };
export type MechSource = NonNullable<MechRecord["source"]>;

/** Everything fixed (TechManual pp.19-20): the chassis parts, the armor and the fixed mounts. No pod equipment; the base is not a legal unit. */
export interface OmniBase {
  chassis: MechRecord["chassis"];
  armor: MechRecord["armor"];
  /** Slot parts of the structure and armor types, fixed heat sinks beyond the engine's holding, base jump jets, MASC or TSM, and any fixed
   * weapon, ammunition or equipment. Each has a location and slot like any mount. */
  mounts: Mount[];
}

/** Only what a pod changes. */
export interface OmniConfiguration {
  /** Stable, never reused. */
  id: string;
  /** "Prime", "A", "B" or the producer's own ("MS1-OA"): free text, shown after the chassis name. */
  code: string;
  name?: string;
  year?: number | null;
  rulesLevel?: RulesLevel;
  /** The lower arm and hand are pod items (TechManual p.45); absent means both are there. */
  arms?: MechRecord["arms"];
  /** Pod items only: weapons, ammunition, extra heat sinks, extra jump jets, CASE where the base lacks it, electronics. */
  mounts: Mount[];
  notes?: MechRecord["notes"];
  imageUrl?: string;
  picture?: MechRecord["picture"];
  source?: MechSource;
}

export interface OmniChassis {
  schema: 1;
  /** A resolved record's id is `${id}:${configuration.id}`. */
  id: string;
  editionId: string;
  name: { chassis: string; alternate?: string };
  techBase: MechRecord["techBase"];
  year: number | null;
  era?: string;
  rulesLevel?: RulesLevel;
  tons: number;
  /** The body type, MechRecord.configuration ("biped", "quad", "tripod"); called `body` here so that "configuration" means a set of pods. */
  body: string;
  base: OmniBase;
  /** Display order. */
  configurations: OmniConfiguration[];
  /** The Primary configuration (the book's word; "Prime" is the conventional code); it names one of `configurations`. */
  primaryId: string;
  notes: MechRecord["notes"];
  imageUrl?: string;
  picture?: MechRecord["picture"];
  source?: MechSource;
}

/** The id the editor and `resolveConfiguration` use for the unloaded base. */
export const BASE = "base";

const tidy = (x: number) => Math.round(x * 1000) / 1000;
const SINK = /^(?:double-|compact-|laser-)?heat-sink-(?:is|clan)$/;
/** How many heat sinks a mount stands for: one, two for a compact one (two to a slot), none for anything else. */
export const sinksIn = (mount: Pick<Mount, "equipmentId">): number => (mount.equipmentId !== null && SINK.test(mount.equipmentId) ? (mount.equipmentId.startsWith("compact-") ? 2 : 1) : 0);

/** The heat sinks a set of pod mounts adds, split between the chassis's main kind and each of its further kinds (a mixed chassis). */
function podSinkSplit(mounts: Pick<Mount, "equipmentId">[], extra: { type: string }[] | undefined): { main: number; extra: number[] } {
  const typeOf = (id: string | null) => (id?.startsWith("double-") ? (id.endsWith("-clan") ? "double-clan" : "double") : id?.startsWith("compact-") ? "compact" : id?.startsWith("laser-") ? "laser" : "single");
  const more = (extra ?? []).map((g) => mounts.reduce((n, m) => n + (typeOf(m.equipmentId) === g.type ? sinksIn(m) : 0), 0));
  return { main: mounts.reduce((n, m) => n + sinksIn(m), 0) - more.reduce((a, b) => a + b, 0), extra: more };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The model line of a configuration: its code, then its name. */
export const configurationTitle = (c: Pick<OmniConfiguration, "code" | "name">) => (c.name ? `${c.code} ${c.name}` : c.code);

function build(chassis: OmniChassis, configuration: OmniConfiguration | undefined): MechRecord {
  const pods = (configuration?.mounts ?? []).map((m): Mount => ({ ...structuredClone(m), pod: true }));
  const fixed = chassis.base.mounts.map((m) => structuredClone(m));
  const base = chassis.base.chassis;
  const podSinks = podSinkSplit(pods, base.heatSinks.extra);
  const heatSinks: MechRecord["chassis"]["heatSinks"] = { ...structuredClone(base.heatSinks), count: base.heatSinks.count + podSinks.main };
  heatSinks.extra?.forEach((g, i) => void (g.count += podSinks.extra[i] ?? 0));
  const record: MechRecord = {
    schema: 1,
    id: `${chassis.id}:${configuration?.id ?? BASE}`,
    editionId: chassis.editionId,
    name: { chassis: chassis.name.chassis, model: configuration ? configurationTitle(configuration) : "Base" },
    techBase: chassis.techBase,
    year: configuration && configuration.year !== undefined ? configuration.year : chassis.year,
    rulesLevel: configuration?.rulesLevel ?? chassis.rulesLevel,
    unitType: "omnimech",
    omni: { chassisId: chassis.id, configurationId: configuration?.id ?? BASE, code: configuration?.code ?? "Base", baseHeatSinks: base.heatSinks.count, ...(base.heatSinks.extra ? { baseExtraHeatSinks: base.heatSinks.extra.map((g) => g.count) } : {}), baseMountIds: fixed.map((m) => m.id) },
    tons: chassis.tons,
    configuration: chassis.body,
    chassis: { ...structuredClone(base), heatSinks },
    armor: structuredClone(chassis.base.armor),
    mounts: [...fixed, ...pods],
    notes: structuredClone(configuration?.notes ?? chassis.notes),
  };
  if (!configuration) record.omni = { ...(record.omni as OmniLink), isBase: true };
  if (chassis.era !== undefined) record.era = chassis.era;
  const arms = armsOf({ configuration: chassis.body, arms: configuration?.arms });
  if (arms) record.arms = structuredClone(arms);
  const imageUrl = configuration?.imageUrl ?? chassis.imageUrl;
  if (imageUrl !== undefined) record.imageUrl = imageUrl;
  const picture = configuration?.picture ?? chassis.picture;
  if (picture) record.picture = structuredClone(picture);
  const source = configuration?.source ?? chassis.source;
  if (source) record.source = structuredClone(source);
  return record;
}

/** The base alone, as an ordinary record: every fixed part and no pods. It is not a legal unit, so the editor shows no Battle Value for it. */
export const resolveBase = (chassis: OmniChassis): MechRecord => build(chassis, undefined);

/** One configuration as an ordinary record (the base chassis's parts, the fixed mounts, then the pods); undefined for an id the chassis lacks. */
export function resolveConfiguration(chassis: OmniChassis, configurationId: string): MechRecord | undefined {
  if (configurationId === BASE) return resolveBase(chassis);
  const configuration = chassis.configurations.find((c) => c.id === configurationId);
  return configuration && build(chassis, configuration);
}

/** Every configuration, the Primary first and the rest in display order. */
export function resolveAll(chassis: OmniChassis): MechRecord[] {
  const ordered = [...chassis.configurations].sort((a, b) => Number(b.id === chassis.primaryId) - Number(a.id === chassis.primaryId));
  return ordered.map((c) => build(chassis, c));
}

/** The configuration shown first: the Primary, else the first. */
export const primaryOf = (chassis: OmniChassis): OmniConfiguration | undefined => chassis.configurations.find((c) => c.id === chassis.primaryId) ?? chassis.configurations[0];

// ---------------------------------------------------------------------------------------------------------------
// Pod space (TechManual pp.20, 58)
// ---------------------------------------------------------------------------------------------------------------
export interface PodSpace {
  /** What the base leaves: the tonnage less everything fixed; null when a fixed item's weight is not known. */
  tons: number | null;
  /** The open slots in each location of the base. */
  slots: Partial<Record<LocationCode, number>>;
  /** The slots of each arm's lower arm and hand: open slots too, once a configuration removes the actuators. */
  actuators: Partial<Record<"LA" | "RA", number>>;
}

export function podSpace(chassis: OmniChassis, catalog: Catalog): PodSpace {
  const base = resolveBase(chassis);
  const total = weights(base, catalog.factsOf).total;
  const layout = buildLayout(base, catalog.factsOf);
  const slots: PodSpace["slots"] = {};
  const actuators: PodSpace["actuators"] = {};
  for (const location of layout.locations) {
    const cells = layout.slots[location] ?? [];
    slots[location] = cells.filter((c) => c.kind === "empty").length;
    if (location === "LA" || location === "RA") {
      const count = cells.filter((c) => c.kind === "fixed" && (c.label === "Lower Arm Actuator" || c.label === "Hand Actuator")).length;
      if (count > 0) actuators[location] = count;
    }
  }
  return { tons: total === null ? null : tidy(chassis.tons - total), slots, actuators };
}

// ---------------------------------------------------------------------------------------------------------------
// Editing: a resolved record goes back into the chassis
// ---------------------------------------------------------------------------------------------------------------
const stripPod = (m: Mount): Mount => {
  const plain = { ...m };
  delete plain.pod;
  return plain;
};

/**
 * Writes an edited configuration back: its pod mounts, arms, year, level, notes and picture go to the configuration. Fixed mounts and
 * every chassis part stay as the base has them (a configuration cannot change them; TechManual pp.19-20), so whatever the edit did to
 * them is dropped. A configuration the chassis lacks leaves the chassis as it was.
 */
export function applyConfigurationEdit(chassis: OmniChassis, configurationId: string, edited: MechRecord): OmniChassis {
  const next = structuredClone(chassis);
  const configuration = next.configurations.find((c) => c.id === configurationId);
  if (!configuration) return chassis;
  const fixed = new Set(chassis.base.mounts.map((m) => m.id));
  configuration.mounts = edited.mounts.filter((m) => !fixed.has(m.id)).map(stripPod);
  if (edited.arms) configuration.arms = structuredClone(edited.arms);
  else delete configuration.arms;
  if (!same(edited.year, configuration.year !== undefined ? configuration.year : chassis.year)) configuration.year = edited.year;
  if (edited.rulesLevel !== (configuration.rulesLevel ?? chassis.rulesLevel)) {
    if (edited.rulesLevel === undefined || edited.rulesLevel === chassis.rulesLevel) delete configuration.rulesLevel;
    else configuration.rulesLevel = edited.rulesLevel;
  }
  if (!same(edited.notes, configuration.notes ?? chassis.notes)) configuration.notes = structuredClone(edited.notes);
  if (!same(edited.picture, configuration.picture ?? chassis.picture)) {
    if (edited.picture) configuration.picture = structuredClone(edited.picture);
    else delete configuration.picture;
  }
  return next;
}

/**
 * Writes an edited base back: its chassis parts, armor and fixed mounts, and the identity of the chassis (name, tonnage, body, tech base,
 * year, era, level, notes, picture). Pods are not touched. A fixed mount new to the base whose id a configuration's pod already has gets a
 * fresh id, so a resolved record never holds two mounts with one id.
 */
export function applyBaseEdit(chassis: OmniChassis, edited: MechRecord): OmniChassis {
  const next = structuredClone(chassis);
  const before = new Set(chassis.base.mounts.map((m) => m.id));
  const podIds = new Set(chassis.configurations.flatMap((c) => c.mounts.map((m) => m.id)));
  const taken = new Set([...before, ...podIds, ...edited.mounts.map((m) => m.id)]);
  const renamed = new Map<string, string>();
  for (const m of edited.mounts) {
    if (before.has(m.id) || !podIds.has(m.id)) continue;
    let n = 1;
    while (taken.has(`${m.id}-base-${String(n)}`)) n += 1;
    renamed.set(m.id, `${m.id}-base-${String(n)}`);
    taken.add(`${m.id}-base-${String(n)}`);
  }
  next.base = {
    chassis: structuredClone(edited.chassis),
    armor: structuredClone(edited.armor),
    mounts: edited.mounts.map((m) => {
      const mount = stripPod(structuredClone(m));
      mount.id = renamed.get(mount.id) ?? mount.id;
      if (mount.linkedTo !== undefined) mount.linkedTo = renamed.get(mount.linkedTo) ?? mount.linkedTo;
      return mount;
    }),
  };
  next.name = { ...next.name, chassis: edited.name.chassis };
  next.techBase = edited.techBase;
  next.year = edited.year;
  if (edited.era === undefined) delete next.era;
  else next.era = edited.era;
  if (edited.rulesLevel === undefined) delete next.rulesLevel;
  else next.rulesLevel = edited.rulesLevel;
  next.tons = edited.tons;
  next.body = edited.configuration;
  if (armsOf({ configuration: next.body, arms: {} }) === undefined) for (const c of next.configurations) delete c.arms;
  next.notes = structuredClone(edited.notes);
  if (edited.imageUrl === undefined) delete next.imageUrl;
  else next.imageUrl = edited.imageUrl;
  if (edited.picture) next.picture = structuredClone(edited.picture);
  else delete next.picture;
  return next;
}

// ---------------------------------------------------------------------------------------------------------------
// Configurations: add, copy, rename, delete, reorder
// ---------------------------------------------------------------------------------------------------------------
const defaultId = () => crypto.randomUUID();

/** The code a new configuration takes: the first letter A to Z no configuration uses; past Z, the source code and a number. */
export function nextCode(chassis: OmniChassis, from = "A"): string {
  const used = new Set(chassis.configurations.map((c) => c.code));
  for (let i = 0; i < 26; i += 1) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  for (let n = 2; ; n += 1) if (!used.has(`${from} ${String(n)}`)) return `${from} ${String(n)}`;
}

/** A copy of a configuration added at the end: its pods, arms and notes under a new id, the next free code, " (copy)" after its name, and
 * no Mordel source (the copy is not Mordel's). Mount ids are kept: they only need to be unique inside one resolved record. */
export function copyConfiguration(chassis: OmniChassis, configurationId: string, newId: () => string = defaultId): OmniChassis {
  const from = chassis.configurations.find((c) => c.id === configurationId);
  if (!from) return chassis;
  const copy: OmniConfiguration = { ...structuredClone(from), id: newId(), code: nextCode(chassis, from.code), name: `${from.name ?? ""} (copy)`.trim() };
  delete copy.source;
  return { ...chassis, configurations: [...chassis.configurations, copy] };
}

/** A new, empty configuration (an open frame with every pod ton unused) added at the end. */
export function addConfiguration(chassis: OmniChassis, newId: () => string = defaultId): OmniChassis {
  return { ...chassis, configurations: [...chassis.configurations, { id: newId(), code: nextCode(chassis), mounts: [] }] };
}

export function renameConfiguration(chassis: OmniChassis, configurationId: string, change: { code?: string; name?: string }): OmniChassis {
  return {
    ...chassis,
    configurations: chassis.configurations.map((c) => {
      if (c.id !== configurationId) return c;
      const next = { ...c, ...(change.code === undefined ? {} : { code: change.code }) };
      if (change.name !== undefined) {
        if (change.name === "") delete next.name;
        else next.name = change.name;
      }
      return next;
    }),
  };
}

/** Deletes a configuration unless it is the last. Deleting the Primary hands that place to `newPrimaryId`, else to the first left. */
export function deleteConfiguration(chassis: OmniChassis, configurationId: string, newPrimaryId?: string): OmniChassis {
  if (chassis.configurations.length <= 1 || !chassis.configurations.some((c) => c.id === configurationId)) return chassis;
  const configurations = chassis.configurations.filter((c) => c.id !== configurationId);
  const primaryId =
    chassis.primaryId !== configurationId ? chassis.primaryId : (configurations.find((c) => c.id === newPrimaryId) ?? (configurations[0] as OmniConfiguration)).id;
  return { ...chassis, configurations, primaryId };
}

/** Moves a configuration one place earlier (-1) or later (1) in the display order. */
export function moveConfiguration(chassis: OmniChassis, configurationId: string, step: -1 | 1): OmniChassis {
  const at = chassis.configurations.findIndex((c) => c.id === configurationId);
  const to = at + step;
  if (at < 0 || to < 0 || to >= chassis.configurations.length) return chassis;
  const configurations = [...chassis.configurations];
  const [moved] = configurations.splice(at, 1);
  configurations.splice(to, 0, moved as OmniConfiguration);
  return { ...chassis, configurations };
}

// ---------------------------------------------------------------------------------------------------------------
// Making and splitting chassis
// ---------------------------------------------------------------------------------------------------------------

/** A new chassis: standard parts, the ten heat sinks every 'Mech starts with, no armor, an empty base and one empty Prime. */
export function newOmniChassis(options: Omit<NewMechOptions, "unitType">, editionId: string, id: string, newId: () => string = defaultId): OmniChassis {
  const record = newRecord({ ...options, unitType: "omnimech" }, editionId, id);
  return splitRecord(record, record.mounts.map((m) => m.id), newId);
}

/** The mounts "Make Omni" fixes by default: the structure and armor slots, every heat sink, every jump jet and every item the books bar from pods
 * (MASC, Triple-Strength Myomer and the rest); weapons, ammunition and the other equipment become the Prime's pods. The player may change it. */
export function defaultFixedMounts(record: MechRecord, catalog: Catalog): string[] {
  return record.mounts
    .filter((m) => {
      const row = rowOf(catalog, record, m);
      return m.part !== undefined || sinksIn(m) > 0 || (row !== undefined && (row.kind === "jump-jet" || !podMountable(row)));
    })
    .map((m) => m.id);
}

/** What a configuration's pods weigh: its weight less the base's alone; null when a weight is not known. */
export function podTonsUsed(chassis: OmniChassis, record: MechRecord, catalog: Catalog): number | null {
  const all = weights(record, catalog.factsOf).total;
  const own = weights(resolveBase(chassis), catalog.factsOf).total;
  return all === null || own === null ? null : tidy(all - own);
}

/**
 * "Make Omni": a plain record becomes a chassis. The mounts named (and every structure and armor slot part) become the base's fixed
 * equipment, every other mount a pod of one Prime configuration that keeps the record's model as its name. The heat sinks the pods carry
 * come off the base's count, since a configuration's sinks are counted with it.
 */
export function splitRecord(record: MechRecord, fixedMountIds: string[], newId: () => string = defaultId): OmniChassis {
  const fixed = new Set(fixedMountIds);
  const isFixed = (m: Mount) => m.part !== undefined || fixed.has(m.id);
  const pods = record.mounts.filter((m) => !isFixed(m));
  const podSinks = podSinkSplit(pods, record.chassis.heatSinks.extra);
  const baseSinks: MechRecord["chassis"]["heatSinks"] = { ...structuredClone(record.chassis.heatSinks), count: Math.max(0, record.chassis.heatSinks.count - podSinks.main) };
  baseSinks.extra?.forEach((g, i) => void (g.count = Math.max(0, g.count - (podSinks.extra[i] ?? 0))));
  const prime: OmniConfiguration = { id: newId(), code: "Prime", mounts: pods.map(stripPod) };
  if (record.name.model.trim()) prime.name = record.name.model.trim();
  if (record.arms) prime.arms = structuredClone(record.arms);
  const chassis: OmniChassis = {
    schema: 1,
    id: record.id,
    editionId: record.editionId,
    name: { chassis: record.name.chassis },
    techBase: record.techBase,
    year: record.year,
    rulesLevel: record.rulesLevel,
    tons: record.tons,
    body: record.configuration,
    base: {
      chassis: { ...structuredClone(record.chassis), heatSinks: baseSinks },
      armor: structuredClone(record.armor),
      mounts: record.mounts.filter(isFixed).map(stripPod),
    },
    configurations: [prime],
    primaryId: prime.id,
    notes: structuredClone(record.notes),
  };
  if (record.era !== undefined) chassis.era = record.era;
  if (record.imageUrl !== undefined) chassis.imageUrl = record.imageUrl;
  if (record.picture) chassis.picture = structuredClone(record.picture);
  if (chassis.rulesLevel === undefined) delete chassis.rulesLevel;
  return chassis;
}

// ---------------------------------------------------------------------------------------------------------------
// Checks on the chassis itself, and what a base edit breaks
// ---------------------------------------------------------------------------------------------------------------
const tm = (page: number) => ({ book: "TechManual", page });

/** The rules level of a configuration: the highest among the base and its pods, never below Standard (the OmniMech type is Standard; no
 * book prints a level for Omni technology itself, and the record sheets print each configuration's level from its contents). */
export const configurationLevel = (record: MechRecord, catalog: Catalog): RulesLevel => lowestLevelFor(record, catalog);

/** The checks that belong to the chassis and not to one configuration: the Primary and the configurations, their codes, ids and years, and the base's level. */
export function omniChassisFindings(chassis: OmniChassis, catalog: Catalog): Finding[] {
  const out: Finding[] = [];
  const add = (check: string, level: Finding["level"], message: string, cite?: Finding["cite"], where?: Finding["where"]) => out.push({ check, level, message, cite, where });
  const count = chassis.configurations.length;
  if (count === 0) add("omni-configurations", "error", "This OmniMech has no configuration; there is nothing to build.", tm(20));
  else if (count === 1) add("omni-configurations", "note", "This OmniMech has one configuration; an OmniMech has a Primary configuration and at least one Alternate.", tm(20));
  if (count > 0 && !chassis.configurations.some((c) => c.id === chassis.primaryId)) add("omni-primary", "error", "No configuration is marked as the Primary.", tm(20));
  const seen = new Set<string>();
  const codes = new Set<string>();
  for (const c of chassis.configurations) {
    if (seen.has(c.id)) add("omni-dup-id", "error", `Two configurations share the id ${c.id}.`);
    seen.add(c.id);
    if (codes.has(c.code)) add("omni-primary", "error", `Two configurations are both named ${c.code}.`, tm(20));
    codes.add(c.code);
    if (c.year != null && chassis.year !== null && c.year < chassis.year) {
      add("omni-era", "error", `${c.code} is dated ${c.year}, before the chassis year ${chassis.year}; a configuration is on or after its chassis.`, tm(292));
    }
  }
  const base = resolveBase(chassis);
  const level = lowestLevelFor(base, catalog);
  if (level !== "introductory" && level !== "standard") {
    const holds = levelItems(base, catalog).find((i) => i.what !== "type" && i.level === level);
    if (holds) add("omni-base-level", "note", `The base holds ${holds.name}, which is ${levelRow(level).label} level; every configuration is at least that level.`, holds.cite);
  }
  return out;
}

export interface BrokenConfiguration {
  id: string;
  code: string;
  /** The errors the edit added to this configuration, in the checks' own words. */
  added: Finding[];
}

const keyOf = (f: Finding) => `${f.check}|${f.message}|${f.where?.mountId ?? ""}|${f.where?.field ?? ""}`;

/** What an edit to the base (or anything else) broke: for each configuration, the errors after that were not there before. Nothing is changed. */
export function brokenBy(before: OmniChassis, after: OmniChassis, catalog: Catalog): BrokenConfiguration[] {
  const broken: BrokenConfiguration[] = [];
  for (const c of after.configurations) {
    const was = new Set(runChecks(resolveConfiguration(before, c.id) ?? resolveBase(before), catalog).filter((f) => f.level === "error").map(keyOf));
    const record = resolveConfiguration(after, c.id);
    const added = record ? runChecks(record, catalog).filter((f) => f.level === "error" && !was.has(keyOf(f))) : [];
    if (added.length > 0) broken.push({ id: c.id, code: c.code, added });
  }
  return broken;
}
