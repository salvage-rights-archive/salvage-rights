// Battle Value 2 of a 'Mech record: TechManual's method (the v4.1 replacement for pp. 302-314) with its tables (p. 315-317), and
// Interstellar Operations: Alternate Eras for the Land-Air 'Mech (p. 186) and the tripod (p. 188). The figures are in data/bv.ts.
// Nothing here throws: an item the book prints no BV for is left out of the total and listed in `unvalued`, and `complete`
// says so. The method is read as the book prints it; the places where the printed text is ambiguous are noted at the line.
import {
  ADVANCED_BV_MODIFIERS,
  ARMOR_BV_MODIFIER,
  ARTEMIS_IDS,
  BV_METHOD,
  BV_RULE_ITEMS,
  CAPACITOR,
  CASE_ROWS,
  COOLANT_POD_IDS,
  ENGINE_BV_MODIFIER,
  EQUIPMENT_BV,
  GYRO_BV_MODIFIER,
  HEAT_EFFICIENCY_BONUS,
  HEAT_MULTIPLIER,
  IMPROVED_JUMP_JET_IDS,
  INDUSTRIAL_BV,
  LAM_BV,
  LASER_INSULATOR_IDS,
  MACHINE_GUN_ARRAY_IDS,
  PHYSICAL_BV,
  SKILL_MULTIPLIER,
  SPECIAL_MUNITIONS,
  SPEED_FACTOR,
  STRUCTURE_BV_MODIFIER,
  TARGET_MODIFIER,
  TARGETING_COMPUTER_IDS,
  TORSO_COCKPIT_BV,
  UNFIXED,
  UNLISTED_IS_ZERO,
  WEAPON_BV,
} from "../data/bv";
import type { BvGroup, BvOptions } from "../data/bv";
import { industrialRulesOf, totalHeatSinks, walkMP } from "./mech";
import type { LocationCode, MechRecord, Mount } from "./mech";
import type { Catalog, EquipmentRow } from "./catalog";
import { armorPoints, equipmentItems, heatSinkCapacity, jumpMP as jumpJets, mascOf, movementPenalty, own, roundHalfUp, stemOf, structureTotal, tidy, tsmOf } from "./walk";
import type { Item } from "./walk";

export interface PilotSkills {
  gunnery: number;
  piloting: number;
}
export interface Unvalued {
  mountId?: string;
  name: string;
  why: string;
}
export interface WeaponLine {
  mountId: string;
  name: string;
  unmodifiedBv: number;
  modifiedBv: number;
  heat: number;
  /** How it entered the Weapon Battle Rating: "full", "half" (past Heat Efficiency) or "no heat". */
  counted: "full" | "half" | "no heat";
  notes: string[];
}
export interface BvResult {
  /** Final Battle Value with the pilot's skills applied, rounded. */
  total: number;
  /** The Battle Value for a Gunnery 4, Piloting 5 pilot, rounded. */
  baseBv: number;
  pilot: PilotSkills;
  skillMultiplier: number;
  /** False when something on the record had no printed BV or a table did not know a key; the total leaves it out. */
  complete: boolean;
  defensive: {
    armor: number;
    structure: number;
    gyro: number;
    equipment: number;
    explosiveAmmo: number;
    subtotal: number;
    targetModifier: number;
    factor: number;
    rating: number;
  };
  offensive: {
    weapons: WeaponLine[];
    ammunition: number;
    equipment: number;
    tonnage: number;
    weaponRating: number;
    heatEfficiency: number;
    movementHeat: number;
    totalWeaponHeat: number;
    runMP: number;
    jumpMP: number;
    speedMP: number;
    speedFactor: number;
    rating: number;
  };
  modifiers: { smallCockpit: boolean; torsoCockpit: boolean; tsm: boolean; industrialTsm: boolean; noFireControl: boolean };
  unvalued: Unvalued[];
  /** Items counted as 0 because the books say equipment in none of their BV tables counts as 0 (TO:AUE p. 192). */
  zeroByRule: Unvalued[];
}

// ---------------------------------------------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------------------------------------------
interface Entry {
  id: string;
  bv: number;
  ammoBv?: number;
  options: BvOptions;
  cite: BvGroup["cite"];
  checked: BvGroup["checked"];
}
function indexOf(groups: BvGroup[]): Map<string, Entry> {
  const map = new Map<string, Entry>();
  for (const group of groups) {
    for (const [id, bv, ammoBv, options = {}] of group.rows) map.set(id, { id, bv, ammoBv, options, cite: group.cite, checked: group.checked });
  }
  return map;
}
const WEAPONS = indexOf(WEAPON_BV);
const EQUIPMENT = indexOf(EQUIPMENT_BV);
/** Ammunition row id to the entry whose ammunition it is; the first claim on a row stands. */
const AMMO = new Map<string, Entry>();
for (const entry of [...WEAPONS.values(), ...EQUIPMENT.values()]) {
  if (entry.ammoBv === undefined) continue;
  for (const id of entry.options.ammo ?? [`ammo-${entry.id}`]) if (!AMMO.has(id)) AMMO.set(id, entry);
}

/** The bands of the Target Movement Modifier table. */
function movementModifier(hexes: number, jumped: boolean): number {
  const band = TARGET_MODIFIER.bands.find(([most]) => hexes <= most);
  return (band?.[1] ?? 0) + (jumped ? TARGET_MODIFIER.jumpBonus : 0);
}

/** Speed Factor: the table to 25, the book's formula beyond it, to two decimals. */
export function speedFactor(speedMP: number): number {
  const table = SPEED_FACTOR.table;
  if (speedMP < table.length) return table[Math.max(0, speedMP)] ?? 1;
  return Math.round((1 + (speedMP - 5) / 10) ** SPEED_FACTOR.exponent * 100) / 100;
}

/** BV Skill Multiplier; a skill outside 0 to 8 is held to the table's edge. */
export function skillMultiplier(pilot: PilotSkills): number {
  const clamp = (n: number) => Math.min(8, Math.max(0, Math.round(n)));
  return SKILL_MULTIPLIER.rows[clamp(pilot.gunnery)]?.[clamp(pilot.piloting)] ?? 1;
}

/** An extended fuel tank "is treated as an ammo bin in combat" (TechManual printed p.244), so each slot counts as explosive for the Defensive Battle Rating. */
const FUEL_TANK_IDS = ["extended-fuel-tank-is", "extended-fuel-tank-clan"];
const ARMS: LocationCode[] = ["LA", "RA"];
const INWARD: Partial<Record<LocationCode, LocationCode>> = { LA: "LT", RA: "RT" }; // Damage Transfer Diagram, Total Warfare p. 123

// ---------------------------------------------------------------------------------------------------------------
// The calculation
// ---------------------------------------------------------------------------------------------------------------
export function battleValue(record: MechRecord, catalog: Catalog, pilot: PilotSkills = { gunnery: 4, piloting: 5 }): BvResult {
  const unvalued: Unvalued[] = [];
  const zeroByRule: Unvalued[] = [];
  /** An item with no table line: 0 by the books' rule if it is equipment from TechManual or Tactical Operations, else reported
   * as unvalued. Ammunition is never 0 by that rule: a special munition carries its launcher's ammunition BV (TO:AUE p. 198). */
  const unlisted = (item: { mount: Mount; row: EquipmentRow }, why: string) => {
    const fixed = own(UNFIXED, item.row.id) ?? (SPECIAL_MUNITIONS.stems.includes(stemOf(item.row.id)) ? SPECIAL_MUNITIONS.why : undefined);
    if (fixed) unvalued.push({ mountId: item.mount.id, name: item.mount.name, why: fixed });
    else if (item.row.kind !== "ammunition" && UNLISTED_IS_ZERO.books.includes(item.row.cite.book)) zeroByRule.push({ mountId: item.mount.id, name: item.mount.name, why: "in none of the BV tables: counts as 0 (TO:AUE p. 192)" });
    else unvalued.push({ mountId: item.mount.id, name: item.mount.name, why });
  };
  const note = (mount: Mount | undefined, name: string, why: string) => unvalued.push({ mountId: mount?.id, name, why });
  const { chassis } = record;

  // Every mount once, with its catalog row; one the catalog does not know is reported.
  const { items, unknown } = equipmentItems(record, catalog);
  for (const mount of unknown) note(mount, mount.name, "not in our equipment table");
  const has = (ids: string[]) => items.some((i) => ids.includes(i.row.id));
  /** Tons of ammunition in a bin, for BV per ton; a bin whose weight is not known counts as a ton. */
  const binTons = (tons: number | undefined) => (tons !== undefined && tons > 0 ? tons : 1);
  const isLam = record.configuration === "lam" || record.configuration === "bimodal-lam";
  const standardLam = record.configuration === "lam";
  const stealth = chassis.armorType === "stealth";
  const tsm = tsmOf(record, items) !== undefined;
  const mascFound = mascOf(record, items);
  const masc = mascFound.named || mascFound.mounts.length > 0;

  // ---- Movement -------------------------------------------------------------------------------------------------
  const penalty = movementPenalty(record, catalog);
  const walk = Math.max(0, (walkMP(record) ?? Math.max(0, Math.floor(chassis.engine.rating / Math.max(1, record.tons)))) - penalty.walk);
  // TSM adds 2 Walking MP from 9 heat (Total Warfare p. 143), where the heat scale has already taken 1 (p. 159): the most it
  // can legally generate is 1 more than its Walking MP.
  const walkMax = tsm ? walk + BV_METHOD.tsmWalkBonus : walk;
  // Shields take Walking MP away (Running follows from it, above) and hardened armor takes Running MP alone; the Defensive and Speed
  // Factors count the result (TO:AUE p. 192); a large shield's "no jumping" is not counted, the jump rating is used as normal (p. 193).
  const runMP = Math.max(0, (masc ? walk * 2 : Math.ceil(walkMax * 1.5)) - penalty.run); // MASC: double the Walking MP, Total Warfare p. 137; running: p. 53
  const jumpMP = jumpJets(items);
  const improvedJets = has(IMPROVED_JUMP_JET_IDS);
  const cruise = jumpMP * LAM_BV.cruisePerJumpMP;
  const flank = Math.ceil(cruise * LAM_BV.flankFactor);

  // ---- Defensive Battle Rating ----------------------------------------------------------------------------------
  const armorMod = own(ARMOR_BV_MODIFIER.values, chassis.armorType) ?? own(ADVANCED_BV_MODIFIERS.armor, chassis.armorType)?.value;
  const structureMod = own(STRUCTURE_BV_MODIFIER.values, chassis.structure) ?? own(ADVANCED_BV_MODIFIERS.structure, chassis.structure)?.value;
  const engineMod = own(ENGINE_BV_MODIFIER.values, chassis.engine.type) ?? own(ADVANCED_BV_MODIFIERS.engine, chassis.engine.type)?.value;
  const gyroMod = own(GYRO_BV_MODIFIER.values, chassis.gyro);
  for (const [what, value, key] of [
    ["armor type", armorMod, chassis.armorType],
    ["internal structure type", structureMod, chassis.structure],
    ["engine type", engineMod, chassis.engine.type],
    ["gyro type", gyroMod, chassis.gyro],
  ] as const) {
    if (value === undefined) note(undefined, `${what} "${key}"`, "no printed Battle Value modifier; counted as 1.0");
  }
  const structure = structureTotal(record);
  // A torso-mounted cockpit doubles the center torso armor, front and rear together, before the armor modifier (TO:AUE p. 193).
  const torsoCockpit = chassis.cockpit === TORSO_COCKPIT_BV.cockpit;
  const centerTorso = record.armor.CT ? record.armor.CT.front + (record.armor.CT.rear ?? 0) : 0;
  const armorTotal = armorPoints(record) + (torsoCockpit ? centerTorso * (TORSO_COCKPIT_BV.armorFactor - 1) : 0);
  // HarJel II and III multiply the armor BV of the location they are in, on top of the armor type (IO:AE p.185).
  const harjel = new Map<LocationCode, number>();
  for (const { mount, row } of items) {
    const multiplier = own(BV_RULE_ITEMS.harjel.multipliers, row.id);
    if (multiplier !== undefined && mount.location !== null) harjel.set(mount.location, (harjel.get(mount.location) ?? 1) * multiplier);
  }
  let harjelArmor = 0;
  for (const [loc, multiplier] of harjel) {
    const a = record.armor[loc];
    if (a) harjelArmor += (a.front + (a.rear ?? 0)) * (torsoCockpit && loc === "CT" ? TORSO_COCKPIT_BV.armorFactor : 1) * (multiplier - 1);
  }
  const armor = (armorTotal + harjelArmor) * BV_METHOD.armorFactor * (armorMod ?? 1);
  const structureBv = structure * BV_METHOD.structureFactor * (structureMod ?? 1) * (engineMod ?? 1);
  const gyro = record.tons * (gyroMod ?? 1);

  // Defensive equipment: the items marked with a dagger, and the anti-missile ammunition up to the systems' own BV.
  let defensiveEquipment = 0;
  const defensiveAmmo = new Map<string, { systems: number; ammo: number }>();
  for (const { row, tons } of items) {
    const entry = EQUIPMENT.get(row.id) ?? WEAPONS.get(row.id);
    if (entry?.options.defensive) {
      defensiveEquipment += entry.bv;
      if (entry.options.defensiveAmmo) defensiveAmmo.set(entry.id, { systems: (defensiveAmmo.get(entry.id)?.systems ?? 0) + entry.bv, ammo: defensiveAmmo.get(entry.id)?.ammo ?? 0 });
    }
    const ammoEntry = row.kind === "ammunition" ? AMMO.get(row.id) : undefined;
    if (ammoEntry?.options.defensiveAmmo) {
      const seen = defensiveAmmo.get(ammoEntry.id) ?? { systems: 0, ammo: 0 };
      defensiveAmmo.set(ammoEntry.id, { ...seen, ammo: seen.ammo + (ammoEntry.ammoBv ?? 0) * binTons(tons) });
    }
  }
  for (const { systems, ammo } of defensiveAmmo.values()) defensiveEquipment += Math.min(systems, ammo);

  // Explosive ammunition and Gauss weapons: points per critical slot, by where the slot is.
  // A Clan 'Mech with an XXL engine loses points for explosive slots as an Inner Sphere XL does, and so does an Inner Sphere XXL (TO:AUE p. 193).
  const xxl = chassis.engine.type === "xxl" || chassis.engine.type === "xxl-clan";
  const clanMech = !xxl && (record.techBase === "clan" || chassis.engine.type === "xl-clan");
  const xlInnerSphere = chassis.engine.type === "xl" || xxl;
  const caseAt = (loc: LocationCode | null): number | undefined => {
    const found = items.filter((i) => i.mount.location === loc && own(CASE_ROWS, i.row.id) !== undefined);
    return found.length === 0 ? undefined : Math.max(...found.map((i) => CASE_ROWS[i.row.id] ?? 0));
  };
  /** The fraction of the full penalty left on a slot in this location, as a multiplier (0 protected, 1 exposed); prototype CASE leaves 8 of 15. */
  const exposure = (loc: LocationCode | null): number => {
    if (loc === null) return 1;
    if (clanMech) return ["LT", "RT", "LA", "RA"].includes(loc) ? 0 : 1; // Clan 'Mechs are assumed to have CASE (the book's footnote)
    if (xlInnerSphere) return 1;
    const own1 = caseAt(loc);
    const prototype = (v: number | undefined) => (v === undefined ? 1 : v === 0 ? 0 : v / BV_METHOD.explosiveAmmoPerSlot);
    if (ARMS.includes(loc)) {
      // The penalty falls on arm ammunition "not protected by CASE in its location, or in the next location inward": CASE in
      // either place protects it, the better of the two counting.
      return Math.min(prototype(own1), prototype(caseAt(INWARD[loc] ?? null)));
    }
    if (loc === "LT" || loc === "RT") return prototype(own1);
    return 1; // center torso, head and every leg
  };
  // PPC capacitors, each with the PPC it is paired with: the one it is linked to, else an unpaired one in its location that
  // the pair table lists; undefined when there is none.
  const capacitors = new Map<Item, Item | undefined>();
  for (const cap of items.filter((i) => CAPACITOR.ids.includes(i.row.id))) {
    const taken = new Set(capacitors.values());
    const host = items.find((i) => i.mount.id === cap.mount.linkedTo) ?? items.find((i) => !taken.has(i) && i.mount.location === cap.mount.location && own(CAPACITOR.bv, i.row.id) !== undefined);
    capacitors.set(cap, host && own(CAPACITOR.bv, host.row.id) !== undefined ? host : undefined);
  }
  const gaussPoints = (item: Item, slots: number) => slots * BV_METHOD.gaussPerSlot * (exposure(item.mount.location) > 0 ? 1 : 0);

  let explosive = 0;
  // A PPC with its capacitor is treated as a Gauss weapon (the table's double dagger, TO:AUE p. 194): every slot of the pair.
  for (const [cap, host] of capacitors) if (host) explosive += gaussPoints(cap, cap.slots) + gaussPoints(host, host.slots);
  for (const item of items) {
    const { mount, row, slots } = item;
    const ammoEntry = row.kind === "ammunition" ? AMMO.get(row.id) : undefined;
    const fuel = (isLam && LAM_BV.fuelSlotIds.includes(row.id)) || FUEL_TANK_IDS.includes(row.id);
    if ((row.kind === "ammunition" && !ammoEntry?.options.inert) || fuel) {
      explosive += slots * BV_METHOD.explosiveAmmoPerSlot * exposure(mount.location);
    }
    const entry = WEAPONS.get(row.id) ?? EQUIPMENT.get(row.id);
    if (entry?.options.gauss || entry?.options.gaussSlots) explosive += gaussPoints(item, entry.options.gaussSlots ?? slots);
    if (COOLANT_POD_IDS.includes(row.id)) explosive += slots; // 1 point a slot (TO:AUE p. 193)
    if (own(BV_RULE_ITEMS.harjel.multipliers, row.id) !== undefined) explosive += slots * BV_RULE_ITEMS.harjel.perSlot; // 1 point a critical slot (IO:AE p. 185)
  }
  const defensiveSubtotal = Math.max(BV_METHOD.minimumDefensive, armor + structureBv + gyro + defensiveEquipment - explosive);

  // Target Movement Modifier: the highest the 'Mech can present (running or MASC, jumping, a standard LAM's AirMech flank, stealth armor).
  const modifiers = [movementModifier(runMP, false)];
  if (jumpMP > 0) modifiers.push(movementModifier(jumpMP, true));
  if (standardLam && jumpMP > 0) modifiers.push(movementModifier(flank, false) + LAM_BV.airborneModifier);
  // The Chameleon LPS and the Null-Signature System add the long-range modifier; the Void-Signature System raises it to +3, or adds 1 on a tie (TO:AUE pp. 193-194).
  const signature = BV_RULE_ITEMS.signature;
  let targetModifier = Math.max(...modifiers) + (stealth ? BV_METHOD.stealthTargetModifier : 0) + (has(signature.longRangeIds) ? signature.longRangeModifier : 0);
  if (has(signature.voidIds)) targetModifier = Math.max(targetModifier, signature.voidModifier) + (targetModifier === signature.voidModifier ? 1 : 0);
  const factor = 1 + targetModifier / 10;
  const defensiveRating = defensiveSubtotal * factor;

  // ---- Offensive Battle Rating ----------------------------------------------------------------------------------
  const sinkCapacity = heatSinkCapacity(record);
  const sinks = sinkCapacity ?? totalHeatSinks(chassis.heatSinks);
  if (sinkCapacity === null) note(undefined, `heat sink type "${chassis.heatSinks.type}"`, "how much heat one dissipates is not known; counted as 1");
  const pods = items.filter((i) => COOLANT_POD_IDS.includes(i.row.id)).length;
  // Coolant pods: heat sinks x (pods / 5), rounded up, at most twice the heat sinks (TO:AUE p. 193).
  const sinkCount = totalHeatSinks(chassis.heatSinks);
  const coolant = pods === 0 ? 0 : Math.min(2 * sinkCount, Math.ceil((sinkCount * pods) / 5));
  const capacity = sinks + coolant + items.reduce((sum, i) => sum + (own(HEAT_EFFICIENCY_BONUS, i.row.id) ?? 0), 0);
  const jumpHeat = jumpMP === 0 ? 0 : Math.max(BV_METHOD.jumpHeatMinimum, improvedJets ? Math.ceil(jumpMP / 2) : jumpMP);
  const airMechHeat = standardLam ? Math.round(flank / 3) : 0; // one heat per 3 MP, IO:AE p. 102
  // RISC super-cooled myomer: no movement heat for a unit with no jump jets or UMU (IO:AE p. 185).
  const cool = BV_RULE_ITEMS.superCooledMyomer;
  const noMovementHeat = (chassis.myomer === cool.myomer || has(cool.ids)) && jumpMP === 0 && !has(cool.umuIds);
  // An IndustrialMech with an internal combustion engine makes no heat by moving (v4.1, Determine Movement Heat Value).
  const industrialNoHeat = INDUSTRIAL_BV.noMovementHeatEngines.includes(chassis.engine.type);
  const movementHeat = industrialNoHeat ? 0 : (noMovementHeat ? 0 : Math.max(BV_METHOD.runningHeat, jumpHeat, airMechHeat)) + (stealth ? BV_METHOD.stealthHeat : 0);
  const heatEfficiency = (isLam ? BV_METHOD.lamHeatEfficiency : BV_METHOD.baseHeatEfficiency) + capacity - movementHeat;

  // Each weapon's unmodified BV, heat and place.
  interface W {
    item: Item;
    entry: Entry;
    heat: number;
    bv: number;
    rearHalf: boolean;
    mod: number;
    notes: string[];
  }
  const weapons: W[] = [];
  for (const item of items) {
    const entry = WEAPONS.get(item.row.id);
    if (!entry) continue;
    const o = entry.options;
    const base = item.row.heat;
    const heat = typeof o.heat === "number" ? o.heat : base === undefined ? undefined : base * (o.heat ? HEAT_MULTIPLIER[o.heat] : 1);
    if (heat === undefined) {
      note(item.mount, item.mount.name, "its heat is not printed, so Heat Efficiency cannot be worked out");
      continue;
    }
    weapons.push({ item, entry, heat, bv: entry.bv, rearHalf: false, mod: entry.bv, notes: [] });
  }

  // A PPC capacitor: the pair is worth the table's combined BV and runs 5 hotter.
  for (const [cap, hostItem] of capacitors) {
    const host = weapons.find((w) => w.item === hostItem);
    const pair = host && own(CAPACITOR.bv, host.item.row.id);
    if (host && pair !== undefined) {
      host.bv = pair;
      host.mod = pair;
      host.heat += CAPACITOR.heat;
      host.notes.push("PPC capacitor: pair BV, +5 heat");
    } else note(cap.mount, cap.mount.name, "not paired with a PPC the table lists, so its BV and heat are not counted");
  }

  // Rear-firing weapons in the torsos, legs and head count half; if the forward ones there are worth less, they are halved instead.
  const bodyMounted = (w: W) => !ARMS.includes(w.item.mount.location as LocationCode);
  const rearBv = weapons.filter((w) => w.item.mount.rear && bodyMounted(w)).reduce((s, w) => s + w.bv, 0);
  const frontBv = weapons.filter((w) => !w.item.mount.rear && bodyMounted(w)).reduce((s, w) => s + w.bv, 0);
  const halveForward = rearBv > 0 && frontBv < rearBv;
  for (const w of weapons) {
    if (!bodyMounted(w)) continue;
    if (halveForward ? !w.item.mount.rear : w.item.mount.rear) {
      w.rearHalf = true;
      w.notes.push(w.item.mount.rear ? "rear-firing: half" : "forward-firing, worth less than the rear weapons: half");
    }
  }

  // A laser insulator takes 1 off the heat of its laser; a RISC laser pulse module multiplies the BV of its laser by 1.15 (IO:AE p. 190).
  const laserOf = (mount: Mount) => weapons.find((w) => w.item.mount.id === mount.linkedTo) ?? weapons.find((w) => w.item.mount.location === mount.location && /\b(DE|P)\b/.test(w.item.row.type ?? ""));
  const pulseModule = BV_RULE_ITEMS.laserPulseModule;
  for (const { mount, row } of items) {
    const insulator = LASER_INSULATOR_IDS.includes(row.id);
    if (!insulator && !pulseModule.ids.includes(row.id)) continue;
    const host = laserOf(mount);
    if (!host) note(mount, mount.name, "not paired with a laser, so its effect is not counted");
    else if (insulator) host.heat = Math.max(0, host.heat - 1);
    else {
      host.mod *= pulseModule.multiplier;
      host.notes.push(`${row.name}: x${pulseModule.multiplier}`);
    }
  }

  // Artemis IV on a launcher (not its ammunition) and the targeting computer on direct-fire weapons.
  const artemisTaken = new Set<string>();
  for (const { mount, row } of items) {
    const multiplier = own(ARTEMIS_IDS, row.id);
    if (multiplier === undefined) continue;
    const host =
      weapons.find((w) => w.item.mount.id === mount.linkedTo) ??
      weapons.find((w) => !artemisTaken.has(w.item.mount.id) && w.item.mount.location === mount.location && (/\bM\b/.test(w.item.row.type ?? "") || w.item.row.id.startsWith("mrm-")));
    if (host) {
      artemisTaken.add(host.item.mount.id);
      host.mod *= multiplier;
      host.notes.push(`${row.name}: x${multiplier}`);
    } else note(mount, mount.name, "not linked to a launcher, so its bonus is not counted");
  }
  const tc = has(TARGETING_COMPUTER_IDS);
  // The Actuator Enhancement System: x1.25 on the weapons in its arm, physical weapons included, ammunition not (TO:AUE p. 192).
  const aes = BV_RULE_ITEMS.aes;
  const drone = has(BV_RULE_ITEMS.drone.ids);
  const aesArms = new Set(items.filter((i) => aes.armIds.includes(i.row.id)).map((i) => i.mount.location));
  const aesLimbs = new Set(items.filter((i) => aes.armIds.includes(i.row.id) || aes.legIds.includes(i.row.id)).map((i) => i.mount.location));
  for (const w of weapons) {
    if (aesArms.has(w.item.mount.location)) {
      w.mod *= aes.weaponFactor;
      w.notes.push(`actuator enhancement system: x${aes.weaponFactor}`);
    }
    if (drone) {
      w.mod *= BV_RULE_ITEMS.drone.weaponFactor;
      w.notes.push(`drone operating system: x${BV_RULE_ITEMS.drone.weaponFactor}`);
    }
    if (tc && w.item.row.directFire) {
      w.mod *= BV_METHOD.targetingComputer;
      w.notes.push("targeting computer: x1.25");
    }
    if (w.rearHalf) w.mod *= BV_METHOD.halved;
  }

  // Total Weapon Heat counts every offensive weapon, the rear-firing ones included.
  const totalHeat = weapons.reduce((s, w) => s + w.heat, 0);
  const lines = new Map<string, WeaponLine>();
  let weaponRating = 0;
  const hot = weapons.filter((w) => w.heat > 0).sort((a, b) => b.mod - a.mod || a.heat - b.heat);
  for (const w of weapons.filter((x) => x.heat === 0)) {
    weaponRating += w.mod;
    lines.set(w.item.mount.id, { mountId: w.item.mount.id, name: w.item.mount.name, unmodifiedBv: w.bv, modifiedBv: w.mod, heat: w.heat, counted: "no heat", notes: w.notes });
  }
  let running = 0;
  let exceeded = false;
  for (const w of hot) {
    const half = totalHeat > heatEfficiency && exceeded;
    weaponRating += half ? w.mod * BV_METHOD.halved : w.mod;
    lines.set(w.item.mount.id, { mountId: w.item.mount.id, name: w.item.mount.name, unmodifiedBv: w.bv, modifiedBv: w.mod, heat: w.heat, counted: half ? "half" : "full", notes: w.notes });
    if (totalHeat > heatEfficiency && !exceeded) {
      running += w.heat;
      if (running >= heatEfficiency) exceeded = true; // this weapon is still at full value
    }
  }

  // Ammunition: per weapon model, no more than the BV of the weapons themselves (an item with no weapon BV to cap it counts in full).
  const modelBv = new Map<string, number>();
  for (const w of weapons) modelBv.set(w.entry.id, (modelBv.get(w.entry.id) ?? 0) + w.bv);
  const ammoBv = new Map<string, number>();
  for (const { mount, row, tons } of items) {
    if (row.kind !== "ammunition") continue;
    const entry = AMMO.get(row.id);
    if (!entry) {
      unlisted({ mount, row }, "ammunition whose BV the books do not print");
      continue;
    }
    if (entry.options.defensiveAmmo) continue;
    // BV per ton, taken in proportion for a bin of other than a ton (the book prints the full-ton rule for 'Mechs only).
    ammoBv.set(entry.id, (ammoBv.get(entry.id) ?? 0) + (entry.ammoBv ?? 0) * binTons(tons));
  }
  let ammunition = 0;
  for (const [id, bv] of ammoBv) ammunition += WEAPONS.has(id) ? Math.min(bv, modelBv.get(id) ?? 0) : bv;

  // Other equipment, added in full. A targeting computer adds nothing here: its 25 percent is the x1.25 on its weapons above.
  let equipment = 0;
  for (const { mount, row } of items) {
    if (row.kind === "heat-sink" || row.kind === "jump-jet" || row.kind === "ammunition" || WEAPONS.has(row.id)) continue;
    const physical = own(PHYSICAL_BV.rows, row.id);
    const entry = EQUIPMENT.get(row.id);
    if (physical) {
      const t = record.tons;
      const d = physical.damage;
      const damage = typeof d === "number" ? d : d === "hatchet" ? Math.ceil(t / 5) : d === "sword" ? Math.ceil(t / 10) + 1 : d === "claws" ? Math.ceil(t / 7) : Math.ceil(t / 10);
      equipment += damage * (tsm && !physical.fixed ? 2 : 1) * physical.factor * (aesArms.has(mount.location) ? aes.weaponFactor : 1);
    } else if (MACHINE_GUN_ARRAY_IDS.includes(row.id)) {
      const guns = weapons.filter((w) => /machine-gun-(is|clan)$/.test(w.item.row.id) && w.item.mount.location === mount.location);
      equipment += BV_METHOD.machineGunArray * guns.reduce((s, w) => s + w.bv, 0);
    } else if (entry && !entry.options.defensive) equipment += entry.bv * (row.kind === "weapon" && aesArms.has(mount.location) ? aes.weaponFactor : 1);
    else if (!entry && !LAM_BV.fuelSlotIds.includes(row.id) && own(CASE_ROWS, row.id) === undefined) unlisted({ mount, row }, "the books print no Battle Value for it");
  }

  // Industrial TSM counts the tonnage 1.15 times (v4.1, Calculate Weapon Battle Rating, step 8); it is not TSM for movement or physical damage.
  const industrialTsm = chassis.myomer === "industrial-tsm" || items.some((i) => i.row.id === "industrial-tsm-is");
  // 10 percent of the tonnage for each limb with an Actuator Enhancement System (TO:AUE p. 192); with Triple-Strength Myomer the two are added.
  const tonnage = record.tons * ((tsm ? BV_METHOD.tsmTonnage : industrialTsm ? INDUSTRIAL_BV.tsmTonnage : 1) + aes.tonnageFactor * aesLimbs.size);
  weaponRating += ammunition + equipment + tonnage;

  const runForSpeed = runMP;
  const speedMP = standardLam ? runForSpeed + Math.round(flank / 2) : runForSpeed + Math.ceil(jumpMP / 2);
  const speed = speedFactor(speedMP);
  // An IndustrialMech without Advanced Fire Control multiplies its Offensive Battle Rating by 0.9 (v4.1, Determine Speed Factor).
  const noFireControl = industrialRulesOf(record) !== undefined && chassis.cockpit !== INDUSTRIAL_BV.fireControlCockpit;
  const offensiveRating = weaponRating * speed * (noFireControl ? INDUSTRIAL_BV.offensiveFactor : 1);

  // ---- Final ----------------------------------------------------------------------------------------------------
  const smallCockpit = chassis.cockpit === "small";
  const kits = items.reduce((product, i) => product * (own(BV_RULE_ITEMS.finalMultiplier.multipliers, i.row.id) ?? 1), 1);
  // A drone operating system: the final BV is multiplied by 0.95 and no cockpit modifier applies (TO:AUE p. 193).
  const sum = (defensiveRating + offensiveRating) * (drone ? BV_RULE_ITEMS.drone.finalFactor : (smallCockpit ? BV_METHOD.smallCockpit : 1) * (torsoCockpit ? TORSO_COCKPIT_BV.finalFactor : 1)) * kits;
  const baseBv = roundHalfUp(sum);
  const multiplier = skillMultiplier(pilot);
  return {
    total: roundHalfUp(baseBv * multiplier),
    baseBv,
    pilot,
    skillMultiplier: multiplier,
    complete: unvalued.length === 0,
    defensive: {
      armor: tidy(armor),
      structure: tidy(structureBv),
      gyro: tidy(gyro),
      equipment: defensiveEquipment,
      explosiveAmmo: tidy(explosive),
      subtotal: tidy(defensiveSubtotal),
      targetModifier,
      factor,
      rating: tidy(defensiveRating),
    },
    offensive: {
      weapons: [...lines.values()],
      ammunition: tidy(ammunition),
      equipment: tidy(equipment),
      tonnage,
      weaponRating: tidy(weaponRating),
      heatEfficiency,
      movementHeat,
      totalWeaponHeat: tidy(totalHeat),
      runMP,
      jumpMP,
      speedMP,
      speedFactor: speed,
      rating: tidy(offensiveRating),
    },
    modifiers: { smallCockpit, torsoCockpit, tsm, industrialTsm, noFireControl },
    unvalued,
    zeroByRule,
  };
}
