// Battle armor construction: what a suit weighs, how its slots are used, what it can move and do. Every figure is read from
// data/battlearmor.ts (the TechManual tables) and the equipment catalog; this file only does the arithmetic. Nothing here throws on a record it
// does not understand: an unknown weight class, armor type, manipulator or item is counted as nothing and reported in `unknown`, so the rules
// check can say so. Weights are kilograms.
import {
  MOTIVE,
  isMotive,
  SHOTS_PER_SLOT,
  WEAPON_LIMITS,
  armorTypeOf,
  manipulatorOf,
  weightClassOf,
} from "../../data/battlearmor";
import type { BaLocation, ManipulatorRow, WeightClassRow } from "../../data/battlearmor";
import type { Catalog, EquipmentRow } from "../catalog";
import { tidy } from "../walk";
import type { BaMount, BaRecord } from "./record";

/** The locations a body has: a humanoid has two arms and a body, a quad only a body (printed p. 163). */
export const locationsOf = (body: string): BaLocation[] => (body === "quad" ? ["body"] : ["ra", "la", "body"]);
export const LOCATION_NAMES: Record<BaLocation, string> = { ra: "Right Arm", la: "Left Arm", body: "Body" };
export const locationName = (code: string): string => (Object.hasOwn(LOCATION_NAMES, code) ? LOCATION_NAMES[code as BaLocation] : `"${code}"`);

/** An item of the catalog's missile launchers, which carry ammunition counted in shots. */
export const carriesShots = (row: EquipmentRow | undefined): boolean => row?.ammoKgPerShot !== undefined;
export const isBooster = (row: EquipmentRow | undefined): boolean => row?.id.startsWith("ba-jump-booster") === true;
export const isClamps = (row: EquipmentRow | undefined): boolean => row?.id.startsWith("ba-magnetic-clamps") === true;

/** Kilograms, with float noise off (the catalog stores tons). */
const kgOfTons = (tons: number): number => tidy(tons * 1000);
/** The shots a launcher mount carries: what it was given, never below zero. */
export const shotsOf = (mount: Pick<BaMount, "shots">): number => Math.max(0, Math.floor(mount.shots ?? 0));
/** The slots a launcher's ammunition takes: one for each four shots, rounded up. */
export const ammoSlots = (shots: number): number => Math.ceil(shots / SHOTS_PER_SLOT);

export interface MountFigures {
  row: EquipmentRow;
  /** The item's own weight and ammunition weight, in kilograms, and its slots including ammunition. */
  itemKg: number;
  ammoKg: number;
  slots: number;
}
export function figuresOf(mount: BaMount, catalog: Catalog, editionId: string): MountFigures | undefined {
  const row = mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, editionId);
  if (!row || typeof row.tons !== "number" || typeof row.slots !== "number") return undefined;
  const shots = carriesShots(row) ? shotsOf(mount) : 0;
  return { row, itemKg: kgOfTons(row.tons), ammoKg: tidy(shots * (row.ammoKgPerShot ?? 0)), slots: row.slots + (shots > 0 ? ammoSlots(shots) : 0) };
}

export interface SlotUse {
  capacity: number;
  /** Slots taken by armor, by items and by missile ammunition. */
  armor: number;
  items: number;
  ammo: number;
  used: number;
}
export interface WeightLine {
  label: string;
  kg: number;
}
export interface Moves {
  ground: number;
  jump: number;
  vtol: number;
  umu: number;
}
export interface Capabilities {
  swarm: boolean;
  leg: boolean;
  mechanized: boolean;
}
export interface BaBuild {
  weightClass: WeightClassRow | undefined;
  lines: WeightLine[];
  totalKg: number;
  /** The class's most and least; undefined for an unknown class. */
  maxKg: number | undefined;
  minKg: number | undefined;
  moves: Moves;
  slots: Partial<Record<BaLocation, SlotUse>>;
  /** Anti-'Mech weapons in each location, against `WEAPON_LIMITS`. */
  weapons: Partial<Record<BaLocation, number>>;
  capabilities: Capabilities;
  /** Slots the armor takes in all, and what the player has placed (a plan that does not add up is advice, not a refusal). */
  armorSlotsNeeded: number;
  armorSlotsPlaced: number;
  /** Names of parts the tables do not have, for the rules check. */
  unknown: string[];
}

const manipulatorsOf = (record: BaRecord): { la: ManipulatorRow | undefined; ra: ManipulatorRow | undefined } => ({ la: manipulatorOf(record.manipulators.la), ra: manipulatorOf(record.manipulators.ra) });

/** What the Battle Armor Capabilities Table (printed p. 167, errata v8.0) lets a suit do, from its class, body, manipulators and motive. */
export function capabilitiesOf(record: BaRecord, mounts: { row: EquipmentRow }[]): Capabilities {
  if (record.body === "quad") return { swarm: false, leg: false, mechanized: false };
  const cls = record.weightClass;
  const { la, ra } = manipulatorsOf(record);
  const groups = [la?.group, ra?.group];
  const count = (group: string) => groups.filter((g) => g === group).length;
  const gloves = count("glove");
  const basics = count("basic");
  const claws = count("claw");
  const clamps = mounts.some((m) => isClamps(m.row));
  // Anti-'Mech attacks: two gloves, two basic manipulators or a claw (light and PA(L)); two basic or a claw (medium); none above.
  const antiMech = cls === "pal" || cls === "light" ? gloves >= 2 || basics >= 2 || claws >= 1 : cls === "medium" ? basics >= 2 || claws >= 1 : false;
  // Mechanized: one basic manipulator is enough for a medium or heavy suit; magnetic clamps stand in for manipulators (Inner Sphere, heavy or lighter).
  const byManipulators = cls === "pal" || cls === "light" ? gloves >= 2 || basics >= 1 || claws >= 1 : cls === "medium" || cls === "heavy" ? basics >= 1 || claws >= 1 : false;
  const mechanized = byManipulators || (clamps && cls !== "assault" && cls !== undefined);
  const umu = record.motive.kind === "umu";
  return { swarm: antiMech && !umu, leg: antiMech, mechanized };
}

/** Works out the whole suit. Never throws. */
export function build(record: BaRecord, catalog: Catalog): BaBuild {
  const cls = weightClassOf(record.weightClass);
  const lines: WeightLine[] = [];
  const unknown: string[] = [];
  const add = (label: string, kg: number) => {
    if (kg !== 0) lines.push({ label, kg: tidy(kg) });
  };

  if (cls) add("Chassis", cls.chassisKg[record.techBase]);
  else unknown.push(`weight class "${record.weightClass}"`);

  // Ground MP above the free ones weighs; fewer than the free ones weigh nothing.
  const free = cls ? (record.body === "quad" ? (cls.ground.free.quad ?? cls.ground.free.humanoid) : cls.ground.free.humanoid) : record.ground;
  if (cls) add(`Ground MP above ${String(free)}`, Math.max(0, record.ground - free) * cls.ground.kgPerMp);

  const kind = record.motive.kind;
  const motiveMp = Math.max(0, record.motive.mp);
  if (cls && kind !== "none") {
    const known = isMotive(kind) ? kind : undefined;
    const system = known ? cls[known] : undefined;
    if (known && system) add(`${MOTIVE[known].label} (${String(motiveMp)} MP)`, motiveMp * system.kgPerMp);
    else unknown.push(`motive system "${kind}" (not offered to this class)`);
  }

  const { la, ra } = manipulatorsOf(record);
  for (const [side, id, row] of [["left", record.manipulators.la, la], ["right", record.manipulators.ra, ra]] as const) {
    if (!row) unknown.push(`manipulator "${id}"`);
    else add(`${row.label}, ${side} arm`, row.kg);
  }

  const armor = armorTypeOf(record.armor.type);
  const points = Math.max(0, record.armor.points);
  if (!armor) unknown.push(`armor type "${record.armor.type}"`);
  else {
    // A type the tech base does not build weighs nothing here; the armor check reports it once.
    const kgPerPoint = armor.kg[record.techBase];
    if (kgPerPoint !== undefined) add(`${armor.label} armor, ${String(points)} points`, points * kgPerPoint);
  }

  const used: { mount: BaMount; figures: MountFigures }[] = [];
  for (const mount of record.mounts) {
    const figures = figuresOf(mount, catalog, record.editionId);
    if (!figures) {
      unknown.push(mount.name || mount.equipmentId || "an item");
      continue;
    }
    used.push({ mount, figures });
    add(figures.row.name.replace(/ \(Battle Armor\)$/, ""), figures.itemKg);
    if (figures.ammoKg > 0) add(`${figures.row.name.replace(/ \(Battle Armor\)$/, "")} ammunition (${String(shotsOf(mount))} shots)`, figures.ammoKg);
  }

  const totalKg = tidy(lines.reduce((sum, line) => sum + line.kg, 0));

  // Slots.
  const slots: Partial<Record<BaLocation, SlotUse>> = {};
  const here = locationsOf(record.body);
  for (const loc of here) {
    const capacity = cls ? (loc === "body" ? (record.body === "quad" ? (cls.slots.quadBody ?? 0) : cls.slots.body) : cls.slots.arm) : 0;
    slots[loc] = { capacity, armor: 0, items: 0, ammo: 0, used: 0 };
  }
  const armorNeeded = armor && points > 0 ? armor.slots : 0;
  const plan = record.armor.slots;
  const planned = plan ? Object.values(plan).reduce((a, n) => a + (Number.isFinite(n) ? Math.max(0, n) : 0), 0) : 0;
  const armorSlotsPlaced = plan === undefined ? armorNeeded : planned;
  for (const loc of here) {
    const use = slots[loc];
    if (!use) continue;
    use.armor = plan === undefined ? (loc === "body" ? armorNeeded : 0) : Math.max(0, plan[loc] ?? 0);
  }
  const weapons: Partial<Record<BaLocation, number>> = {};
  for (const { mount, figures } of used) {
    const use = slots[mount.location as BaLocation];
    const base = figures.row.slots as number;
    const ammo = figures.slots - base;
    if (use) {
      use.items += base;
      use.ammo += ammo;
    }
    if (figures.row.kind === "weapon" && use) weapons[mount.location as BaLocation] = (weapons[mount.location as BaLocation] ?? 0) + 1;
  }
  for (const loc of here) {
    const use = slots[loc];
    if (use) use.used = use.armor + use.items + use.ammo;
  }

  // Movement.
  const boosters = used.filter((u) => isBooster(u.figures.row)).length;
  const moves: Moves = {
    ground: record.ground,
    jump: kind === "jump" ? motiveMp + boosters : 0,
    vtol: kind === "vtol" ? motiveMp : 0,
    umu: kind === "umu" ? motiveMp : 0,
  };

  return {
    weightClass: cls,
    lines,
    totalKg,
    maxKg: cls?.maxKg,
    minKg: cls?.minKg,
    moves,
    slots,
    weapons,
    capabilities: capabilitiesOf(record, used.map((u) => ({ row: u.figures.row }))),
    armorSlotsNeeded: armorNeeded,
    armorSlotsPlaced,
    unknown,
  };
}

/** The most anti-'Mech weapons a location may carry (printed p. 170, errata v8.0). */
export const weaponLimit = (body: string, loc: string): number => (loc === "body" ? (body === "quad" ? WEAPON_LIMITS.quadBody : WEAPON_LIMITS.body) : WEAPON_LIMITS.arm);
