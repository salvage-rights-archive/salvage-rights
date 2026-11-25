// Reading a record against the catalog: the lookups, the walk over its equipment and the figures of the record that the
// rating rules (Battle Value in bv.ts, C-Bill cost in cost.ts) both need. Pure functions over plain data; nothing here
// throws. A mount the catalog does not know is handed back in `unknown` for the caller to report, never guessed.
import { ARMOR } from "../data/chassis";
import { SHEET_HEAT_SINKS } from "../data/sheet";
import type { Catalog, EquipmentRow } from "./catalog";
import { slotsTaken, structurePoints, weights } from "./mech";
import type { MechRecord, Mount } from "./mech";
import { shieldMovement } from "./shields";

/** A lookup that only sees a table's own keys, so a key like "constructor" is unknown rather than a surprise. */
export function own<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}
/** Takes float noise off a figure: rounded to 6 decimal places. */
export const tidy = (x: number) => Math.round(x * 1e6) / 1e6;
/** The books' "round to the nearest whole number, .5 rounds up". */
export const roundHalfUp = (x: number) => Math.floor(tidy(x) + 0.5);
/** A catalog row id without its tech base ending: "medium-pulse-laser-clan" is "medium-pulse-laser". */
export const stemOf = (id: string) => id.replace(/-(is|clan)$/, "");

/** The catalog row of a mount as the record's edition sees it; undefined for a structure or armor slot or an unknown item. */
export const rowOf = (catalog: Catalog, record: MechRecord, mount: Mount): EquipmentRow | undefined =>
  mount.part || mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);

/** One mounted item with its catalog row; `tons` is undefined when the catalog cannot work out its weight. */
export interface Item {
  mount: Mount;
  row: EquipmentRow;
  slots: number;
  tons: number | undefined;
}
/** Every equipment mount of the record (structure and armor slots left out), in the record's order, with its catalog row;
 * the mounts the catalog has no row for are in `unknown`. */
export function equipmentItems(record: MechRecord, catalog: Catalog): { items: Item[]; unknown: Mount[] } {
  const items: Item[] = [];
  const unknown: Mount[] = [];
  for (const mount of record.mounts) {
    if (mount.part) continue;
    const row = rowOf(catalog, record, mount);
    if (!row) unknown.push(mount);
    else items.push({ mount, row, slots: slotsTaken(mount, record, catalog.factsOf), tons: catalog.factsOf(mount, record)?.tons });
  }
  return { items, unknown };
}

/** The movement points the record's armor and shields take away (never negative), and the words that say why. A large shield also
 * forbids jumping in play; the Battle Value rules still use the jump rating as normal (TO:AUE p.193), so `noJump` is separate. */
export interface MovementPenalty {
  /** Walking MP taken away (a shield's); Running MP is then worked out from the reduced Walking MP, never reduced for the same cause. */
  walk: number;
  /** Running MP taken away on top of that, for what the book prints as a Running reduction alone (hardened armor, TO:AUE p.93). */
  run: number;
  jump: number;
  noJump: boolean;
  because: string[];
  /** The same in a few words, for the record sheet. */
  short: string[];
}
export function movementPenalty(record: MechRecord, catalog: Catalog): MovementPenalty {
  const shield = shieldMovement(record, catalog);
  const armor = own(ARMOR.types, record.chassis.armorType);
  const armorRun = Math.max(0, -(armor?.movement?.run ?? 0));
  const because: string[] = [];
  const short: string[] = [];
  if (armorRun > 0 && armor) {
    because.push(`${armor.name} armor: -${String(armorRun)} Running MP`);
    short.push(`${armor.name}: Run -${String(armorRun)}`);
  }
  if (shield.mp > 0) {
    because.push(`${shield.names.join(", ")}: -${String(shield.mp)} Walking MP (Running MP follows from it) and Jumping MP`);
    short.push(`Shield: MP -${String(shield.mp)}`);
  }
  if (shield.noJump) {
    because.push("Large shield: no jumping");
    short.push("No jump");
  }
  return { walk: shield.mp, run: armorRun, jump: shield.mp, noJump: shield.noJump, because, short };
}

/** Walking MP after the penalty, and Running MP derived from that (Walking x 1.5 rounded up) less any Running-only reduction. */
export function penalisedMovement(walk: number, penalty: MovementPenalty): { walk: number; run: number } {
  const reduced = Math.max(0, walk - penalty.walk);
  return { walk: reduced, run: Math.max(0, Math.ceil(reduced * 1.5) - penalty.run) };
}

/** Jumping MP: one for each jump jet mounted. */
export const jumpMP = (items: Item[]) => items.filter((i) => i.row.kind === "jump-jet").length;

// The myomer enhancements: the chassis names the myomer, and the record also carries TSM as its six mounts and MASC as a mount.
const TSM_ROW = "tsm-is";
const PROTOTYPE_TSM_ROW = "prototype-triple-strength-myomer-is";
const MASC_ROWS = ["masc-is", "masc-clan"];
const MASC_MYOMER = ["masc", "masc-clan"];
/** Rows that stand for the musculature itself rather than an item bought or valued on its own. */
export const TSM_ROWS = [TSM_ROW, PROTOTYPE_TSM_ROW];
/** Which triple-strength myomer the record has, if any, from the chassis myomer or its mounts. */
export function tsmOf(record: MechRecord, items: Item[]): "tsm" | "prototype" | undefined {
  if (items.some((i) => i.row.id === PROTOTYPE_TSM_ROW)) return "prototype";
  return record.chassis.myomer === "tsm" || items.some((i) => i.row.id === TSM_ROW) ? "tsm" : undefined;
}
/** The MASC mounts, and whether the chassis names MASC as its myomer (a record may say either or both). */
export function mascOf(record: MechRecord, items: Item[]): { mounts: Item[]; named: boolean } {
  return { mounts: items.filter((i) => MASC_ROWS.includes(i.row.id)), named: MASC_MYOMER.includes(record.chassis.myomer) };
}

/** Armor points over every location, front and rear. */
export const armorPoints = (record: MechRecord) => Object.values(record.armor).reduce((sum, a) => sum + (a ? a.front + (a.rear ?? 0) : 0), 0);
/** Internal structure points over every location the configuration has (0 for a tonnage the table does not list). */
export const structureTotal = (record: MechRecord) => Object.values(structurePoints(record)).reduce((sum, n) => sum + n, 0);

/** Heat Sink Capacity: each group of the chassis's heat sinks times the heat one of its type takes away (the sheet's table, which the
 * record sheet prints from), the second kind of a mixed record included; null for a type we do not know. */
export function heatSinkCapacity(record: MechRecord): number | null {
  const { type, count, extra } = record.chassis.heatSinks;
  let total = 0;
  for (const group of [{ type, count }, ...(extra ?? [])]) {
    const each = own(SHEET_HEAT_SINKS, group.type)?.perSink;
    if (each === undefined) return null;
    total += group.count * each;
  }
  return total;
}

/** The tons of one of the weight rules' chassis lines ("Gyro", "Armor", "Engine"), null when it cannot be worked out. */
export function weightLine(record: MechRecord, catalog: Catalog, label: string): number | null {
  return weights(record, catalog.factsOf).lines.find((l) => l.label === label)?.tons ?? null;
}
