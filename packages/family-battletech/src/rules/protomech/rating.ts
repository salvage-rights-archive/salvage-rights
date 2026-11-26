// A ProtoMech's Battle Value (TechManual Battle Value v4.1, "Calculating ProtoMech BV", printed pp. 306-307) and its C-bill cost (TechManual printed pp. 279 and 285).
// Both come from the unit's parts and its mounts; a mount with no printed figure is reported in `unvalued`, never guessed. Weapon figures are the catalog's
// (data/bv.ts keys them by catalog id; data/cost.ts prices them); a launcher built by the tube has its own table (data/protomech.ts). Pure functions; nothing throws.
import { bvEntryOf, speedFactor } from "../bv";
import { TARGET_MODIFIER } from "../../data/bv";
import { PROTO_BV, PROTO_COST, PROTO_LAUNCHER_SIZES, PROTO_MELEE, PROTO_QUAD_MELEE, PROTO_WING } from "../../data/protomech";
import type { Catalog } from "../catalog";
import { priceOf, roundUpCents } from "../cost";
import { armorPoints, ammoKg, engineKg, engineRating, launcherOf, mountName, plainRun, rowOf, runMP, structurePoints, tubesOf } from "./build";
import { isGlider, isQuad } from "./config";
import { armorTypeOf, cockpitCost, cockpitOf, jumpMP, jumpSystemOf, wingKg } from "./options";
import type { ProtoMount, ProtoRecord } from "./record";
import { PROTO_PARTS } from "../../data/protomech";
import { roundHalfUp, tidy } from "../walk";

export interface Unvalued {
  mountId?: string;
  name: string;
  why: string;
}

/** The Target Movement Modifier for a number of hexes moved (Total Warfare p. 117), as the BV tables use it. */
function targetModifier(hexes: number, jumped: boolean): number {
  const band = TARGET_MODIFIER.bands.find(([most]) => hexes <= most);
  return (band?.[1] ?? 0) + (jumped ? TARGET_MODIFIER.jumpBonus : 0);
}

export interface ProtoBvLine {
  mountId: string;
  name: string;
  /** The weapon's printed BV; the rear-facing and forward torso adjustments are in `counted`. */
  bv: number;
  counted: number;
  ammoBv: number;
}
export interface ProtoBv {
  /** Final Battle Value for the standard pilot (Gunnery 4), rounded. */
  total: number;
  defensive: { armor: number; structure: number; equipment: number; subtotal: number; targetModifier: number; factor: number; rating: number };
  offensive: { weapons: number; ammunition: number; speed: number; speedFactor: number; rating: number };
  lines: ProtoBvLine[];
  unvalued: Unvalued[];
}

interface Valued {
  mount: ProtoMount;
  name: string;
  bv: number;
  ammoPerTon: number;
  defensive: boolean;
  defensiveAmmo: boolean;
  key: string;
}

/** The printed figures for one mount: its BV and its ammunition's BV per ton, or the reason there are none. */
function figuresOf(mount: ProtoMount, catalog: Catalog, record: ProtoRecord): Omit<Valued, "mount" | "name" | "key"> | string {
  const launch = launcherOf(mount);
  if (launch) {
    const at = tubesOf(mount) - 1;
    const bv = launch.launcher.bv[at];
    const ammo = launch.launcher.ammoBv[at];
    return bv === undefined || ammo === undefined ? "a launcher size the BV table does not print" : { bv, ammoPerTon: ammo, defensive: false, defensiveAmmo: false };
  }
  const row = rowOf(catalog, record, mount);
  if (!row) return "an item not in our equipment table";
  if (row.id === PROTO_MELEE.row) return { bv: Math.ceil(record.tons / PROTO_MELEE.tonsPerDamage) * PROTO_MELEE.bvFactor, ammoPerTon: 0, defensive: false, defensiveAmmo: false };
  if (row.id === PROTO_QUAD_MELEE.row) return { bv: Math.ceil(record.tons / PROTO_QUAD_MELEE.tonsPerStep) * PROTO_QUAD_MELEE.damagePerStep * PROTO_QUAD_MELEE.bvFactor, ammoPerTon: 0, defensive: false, defensiveAmmo: false };
  const entry = bvEntryOf(row.id);
  if (!entry) return "an item with no Battle Value in our tables";
  return { bv: entry.options.none === true ? 0 : entry.bv, ammoPerTon: entry.ammoBv ?? 0, defensive: entry.options.defensive === true, defensiveAmmo: entry.options.defensiveAmmo === true };
}

export function protoBattleValue(record: ProtoRecord, catalog: Catalog): ProtoBv {
  const unvalued: Unvalued[] = [];
  const valued: Valued[] = [];
  for (const mount of record.mounts) {
    const figures = figuresOf(mount, catalog, record);
    const name = mountName(mount) || "Unnamed item";
    if (typeof figures === "string") unvalued.push({ mountId: mount.id, name, why: figures });
    else valued.push({ ...figures, mount, name, key: `${mount.equipmentId ?? ""}|${String(mount.tubes ?? "")}` });
  }

  // Defensive Battle Rating: armor x 2.5, structure x 1.5, defensive equipment (its ammunition up to the systems' own BV), then the Defensive Factor + 0.1.
  const defensiveItems = valued.filter((v) => v.defensive);
  const systems = defensiveItems.reduce((sum, v) => sum + v.bv, 0);
  const defensiveAmmo = defensiveItems.filter((v) => v.defensiveAmmo).reduce((sum, v) => sum + (ammoKg(v.mount) / 1000) * v.ammoPerTon, 0);
  const equipment = systems + Math.min(defensiveAmmo, systems);
  const armor = armorPoints(record) * PROTO_BV.armorFactor;
  const structure = (structurePoints(record) ?? 0) * PROTO_BV.structureFactor;
  const subtotal = armor + structure + equipment;
  // A glider is read by its WiGE Flanking MP for the defensive and the speed factor (IO:AE p. 186); it has no jump jets or booster to count.
  const glider = isGlider(record);
  const running = runMP(record);
  const jumping = glider ? 0 : jumpMP(record);
  // A glider in flight is airborne: its modifier is that of its WiGE Flanking MP plus 1 (IO:AE pp. 106, 186; book panel).
  const tmm = Math.max(targetModifier(running, glider), jumping > 0 ? targetModifier(jumping, true) : 0);
  const factor = 1 + tmm / 10 + PROTO_BV.defensiveBonus;
  const defensive = { armor, structure, equipment, subtotal, targetModifier: tmm, factor: tidy(factor), rating: subtotal * factor };

  // Offensive Battle Rating: the weapons at their printed BV (the ProtoMech method prints no rear-facing step), plus ammunition by the kilogram, never more
  // than the BV of the weapons it is for, times the Speed Factor.
  const weapons = valued.filter((v) => !v.defensive);
  const lines: ProtoBvLine[] = weapons.map((v) => ({ mountId: v.mount.id, name: v.name, bv: v.bv, counted: v.bv, ammoBv: (ammoKg(v.mount) / 1000) * v.ammoPerTon }));
  const byModel = new Map<string, { weapons: number; ammo: number }>();
  weapons.forEach((v, i) => {
    const line = lines[i];
    const have = byModel.get(v.key) ?? { weapons: 0, ammo: 0 };
    byModel.set(v.key, { weapons: have.weapons + v.bv, ammo: have.ammo + (line?.ammoBv ?? 0) });
  });
  const ammunition = [...byModel.values()].reduce((sum, m) => sum + Math.min(m.ammo, m.weapons), 0);
  // Electric Discharge armor counts its armor points as standard armor and adds its own Battle Value as a weapon (IO:AE p. 191).
  const armorWeapon = armorPoints(record) > 0 ? (armorTypeOf(record)?.bvAsWeapon ?? 0) : 0;
  if (armorWeapon > 0) lines.push({ mountId: "", name: armorTypeOf(record)?.label ?? "Armor", bv: armorWeapon, counted: armorWeapon, ammoBv: 0 });
  const weaponBv = lines.reduce((sum, line) => sum + line.counted, 0) + ammunition;
  const speed = plainRun(record.walk) + Math.ceil(jumping / 2) + (record.booster && !glider ? 1 : 0);
  const sf = speedFactor(speed);
  const offensive = { weapons: weaponBv, ammunition, speed, speedFactor: sf, rating: weaponBv * sf };

  return { total: roundHalfUp(defensive.rating + offensive.rating), defensive, offensive, lines, unvalued };
}

// ---- Cost ------------------------------------------------------------------------------------------------------------------

export interface ProtoCostLine {
  label: string;
  cost: number;
}
export interface ProtoCost {
  /** The unit's cost in C-bills, rounded up to the cent after the final multiplier (errata v8.0 to TechManual p. 274). */
  total: number;
  structural: number;
  equipment: number;
  multiplier: number;
  lines: ProtoCostLine[];
  unpriced: Unvalued[];
}

/** The price of one mounted item: a launcher at its catalog launcher's price where its size is a standard one, else by the tube (p. 293 note); anything else at the catalog's price. */
function priceOfMount(mount: ProtoMount, catalog: Catalog, record: ProtoRecord): number | string {
  const launch = launcherOf(mount);
  if (launch) {
    const tubes = tubesOf(mount);
    const standard = (PROTO_LAUNCHER_SIZES[launch.kind] ?? []).includes(tubes) ? catalog.byId(`${launch.kind === "streak" ? "streak-srm" : launch.kind}-${String(tubes)}-clan`) : undefined;
    const printed = standard ? priceOf(standard)?.price : undefined;
    return typeof printed === "number" ? printed : tubes * launch.launcher.tubeCost;
  }
  const row = rowOf(catalog, record, mount);
  if (!row) return "an item not in our equipment table";
  const price = priceOf(row)?.price;
  if (price === undefined) return "an item with no price in our tables";
  return typeof price === "number" ? price : "an item priced by a size or weight we do not work out here";
}

export function protoCost(record: ProtoRecord, catalog: Catalog): ProtoCost {
  const C = PROTO_COST;
  const tons = record.tons;
  const lines: ProtoCostLine[] = [];
  const add = (label: string, cost: number) => lines.push({ label, cost });
  const cockpit = cockpitOf(record);
  const jump = jumpSystemOf(record);
  const armorType = armorTypeOf(record);
  const unpriced: Unvalued[] = [];
  if (cockpit) add(cockpit.label, cockpitCost(record) ?? cockpit.cost);
  else unpriced.push({ name: "Cockpit", why: "a cockpit we do not know" });
  add("Life support", C.lifeSupport);
  add("Sensors", C.sensorsPerTon * tons);
  add("Musculature", C.musculaturePerTon * tons);
  // A quad and a glider have a structure cost of their own per ton, whatever their weight (IO:AE p. 180); a quad has no arms to put actuators in, and its one leg location pays the printed 540 a ton: the book prints no separate four-leg figure (book panel; mordel.net charges 360 a ton more, as if the arm actuators were kept).
  add("Internal structure", (Object.hasOwn(C.structurePerTonBy, record.configuration ?? "") ? (C.structurePerTonBy[record.configuration ?? ""] ?? C.structurePerTon) : C.structurePerTon) * tons);
  if (!isQuad(record)) add("Arm actuators, both arms", 2 * C.armActuatorPerTon * tons);
  add("Leg actuators, both legs", C.legActuatorPerTon * tons);
  const rating = engineRating(record);
  if (rating !== null && engineKg(record) !== null) add(`Engine, rating ${String(rating)}`, (C.engineFactor * rating * tons) / C.engineDivisor);
  if (record.jump > 0) {
    if (jump) add(jump.label, jump.costPerTonSquared * record.jump * record.jump * tons);
    else unpriced.push({ name: "Jump system", why: "a jump system we do not know" });
  }
  if (record.partialWing === true) add(PROTO_WING.label, (PROTO_WING.costPerTon * wingKg(record)) / 1000);
  if (record.booster && rating !== null) add("Myomer Booster", C.boosterPerRatingTon * rating * ((tons * PROTO_PARTS.boosterKgPerTon) / 1000));
  if (record.heatSinks > 0) add("Heat sinks", C.heatSink * record.heatSinks);
  const points = armorPoints(record);
  if (points > 0) {
    if (armorType) add(armorType.label, armorType.costPerPoint * points);
    else unpriced.push({ name: "Armor", why: "an armor type we do not know" });
  }
  const structural = lines.reduce((sum, line) => sum + line.cost, 0);

  let equipment = 0;
  for (const mount of record.mounts) {
    const price = priceOfMount(mount, catalog, record);
    const name = mountName(mount) || "Unnamed item";
    if (typeof price === "string") unpriced.push({ mountId: mount.id, name, why: price });
    else {
      equipment += price;
      add(name, price);
    }
  }
  const multiplier = 1 + tons / C.tonsDivisor;
  return { total: roundUpCents((structural + equipment) * multiplier), structural, equipment, multiplier, lines, unpriced };
}
