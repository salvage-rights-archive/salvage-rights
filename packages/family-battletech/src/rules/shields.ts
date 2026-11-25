// BattleMech shields (Tactical Operations: Advanced Units and Equipment, construction rules printed p.100, 'Mech Shield Table
// p.103): which shields a record mounts and in which arm, the points the record sheet gives each one, and the movement they
// cost. Pure functions over the record and the catalog; nothing here throws on a record it does not understand.
import { SHIELDS } from "../data/chassis";
import type { ShieldRow } from "../data/chassis";
import type { Catalog } from "./catalog";
import { armsOf, configurationOf } from "./mech";
import type { LocationCode, MechRecord, Mount } from "./mech";

const ARMS = ["LA", "RA"] as const;
type Arm = (typeof ARMS)[number];

/** A shield mount, with the book's row for its size. `arm` is the arm it sits in, or null for a location that is no arm. */
export interface MountedShield {
  mount: Mount;
  row: ShieldRow;
  arm: Arm | null;
}

/** Every shield the record mounts, in the record's order. A mount the catalog does not know is not a shield here. */
export function mountedShields(record: MechRecord, catalog: Catalog): MountedShield[] {
  const out: MountedShield[] = [];
  for (const mount of record.mounts) {
    if (mount.part || mount.equipmentId === null) continue;
    const id = catalog.rowFor(mount.equipmentId, record.editionId)?.id;
    const row = id !== undefined && Object.hasOwn(SHIELDS.rows, id) ? SHIELDS.rows[id] : undefined;
    if (row) out.push({ mount, row, arm: ARMS.find((a) => a === mount.location) ?? null });
  }
  return out;
}

/** The arm and hand actuators the arm lacks: the lower arm (which takes the hand with it) and the hand. The shoulder and upper arm are always there. */
export function missingActuators(record: MechRecord, arm: Arm): number {
  const has = armsOf(record)?.[arm];
  return has ? Number(!has.lowerArm) + Number(!has.hand) : 0;
}

/** What one shield gives its arm: Damage Absorption and Damage Capacity, each less the book's 1 for every missing actuator, never below 0. */
export function shieldStats(record: MechRecord, shield: MountedShield): { da: number; dc: number } {
  const lost = shield.arm === null ? 0 : missingActuators(record, shield.arm) * SHIELDS.lostPerMissingActuator;
  return { da: Math.max(0, shield.row.da - lost), dc: Math.max(0, shield.row.dc - lost) };
}

/** What the paper doll draws for the shields a record carries: each arm's Damage Capacity (`left`, `right`) and Damage Absorption
 * (`absorbLeft`, `absorbRight`). An arm without a shield has no entry. */
export interface ShieldPoints {
  left?: number;
  right?: number;
  absorbLeft?: number;
  absorbRight?: number;
}

/**
 * The points to draw for each arm's shield on the paper doll: its Damage Capacity, which is what the shield's boxes on the record
 * sheet count, and its Damage Absorption (TO:AUE p.103), each less 1 for every missing lower-arm or hand actuator. An arm without
 * a shield has no entry, and neither has an arm the configuration lacks (a quad has none, and a body we do not lay out has none).
 * When an arm holds more than one shield (which the rules check reports) the first is drawn.
 */
export function shieldPoints(record: MechRecord, catalog: Catalog): ShieldPoints {
  const size = configurationOf(record.configuration)?.size as Partial<Record<LocationCode, number>> | undefined;
  const out: ShieldPoints = {};
  const shields = mountedShields(record, catalog);
  for (const [arm, dc, da] of [["LA", "left", "absorbLeft"], ["RA", "right", "absorbRight"]] as const) {
    if (!size || size[arm] === undefined) continue;
    const shield = shields.find((s) => s.arm === arm);
    if (shield) Object.assign(out, { [dc]: shieldStats(record, shield).dc, [da]: shieldStats(record, shield).da });
  }
  return out;
}
/** The Walking, Running and Jumping MP the record's shields take away, and whether it may not jump. Shields do not add up: the
 * heaviest one counts (the book gives the table's figure per shield and says nothing about a second). */
export function shieldMovement(record: MechRecord, catalog: Catalog): { mp: number; noJump: boolean; names: string[] } {
  const shields = mountedShields(record, catalog);
  return {
    mp: Math.max(0, ...shields.map((s) => s.row.mp)),
    noJump: shields.some((s) => s.row.noJump === true),
    names: shields.filter((s) => s.row.mp > 0 || s.row.noJump).map((s) => s.mount.name),
  };
}
