// Battle Value 2 of a 'Mech record: TechManual's method (the v4.1 replacement for pp. 302-314) with its tables (p. 315-317), and
// Interstellar Operations: Alternate Eras for the Land-Air 'Mech (p. 186) and the tripod (p. 188). The figures are in data/bv.ts.
// Nothing here throws: an item the book prints no BV for is left out of the total and listed in `unvalued`, and `complete`
// says so. The method is read as the book prints it; the places where the printed text is ambiguous are noted at the line.
import {
  ARMOR_BV_MODIFIER,
  ARTEMIS_IDS,
  BV_METHOD,
  CASE_ROWS,
  ENGINE_BV_MODIFIER,
  EQUIPMENT_BV,
  GYRO_BV_MODIFIER,
  HEAT_EFFICIENCY_BONUS,
  HEAT_MULTIPLIER,
  IMPROVED_JUMP_JET_IDS,
  LAM_BV,
  MACHINE_GUN_ARRAY_IDS,
  MASC_IDS,
  PHYSICAL_BV,
  SKILL_MULTIPLIER,
  SPEED_FACTOR,
  STRUCTURE_BV_MODIFIER,
  TARGET_MODIFIER,
  TARGETING_COMPUTER_IDS,
  TSM_IDS,
  WEAPON_BV,
} from "../data/bv";
import type { BvGroup, BvOptions } from "../data/bv";
import { structurePoints, walkMP } from "./mech";
import type { LocationCode, MechRecord, Mount } from "./mech";
import type { Catalog, EquipmentRow } from "./catalog";

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
  modifiers: { smallCockpit: boolean; tsm: boolean };
  unvalued: Unvalued[];
}

// ---------------------------------------------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------------------------------------------
// SHARED? own(table, key): a lookup that only sees a table's own keys (mech.ts has a private copy).
function own<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}
// SHARED? tidy(x): float-noise rounding to 6 places (mech.ts has a private copy to 3).
const tidy = (x: number) => Math.round(x * 1e6) / 1e6;
// SHARED? roundHalfUp(x): the book's "nearest whole number, .5 rounds up".
const roundHalfUp = (x: number) => Math.floor(tidy(x) + 0.5);

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

const ARMS: LocationCode[] = ["LA", "RA"];
const INWARD: Partial<Record<LocationCode, LocationCode>> = { LA: "LT", RA: "RT" }; // Damage Transfer Diagram, Total Warfare p. 123

// ---------------------------------------------------------------------------------------------------------------
// The calculation
// ---------------------------------------------------------------------------------------------------------------
export function battleValue(record: MechRecord, catalog: Catalog, pilot: PilotSkills = { gunnery: 4, piloting: 5 }): BvResult {
  const unvalued: Unvalued[] = [];
  const note = (mount: Mount | undefined, name: string, why: string) => unvalued.push({ mountId: mount?.id, name, why });
  const { chassis } = record;

  // SHARED? items: every non-part mount with its catalog row, slots and tons, unmatched ones reported (cost walks the same record).
  // Classify every mount once.
  interface Item {
    mount: Mount;
    row: EquipmentRow;
    slots: number;
    tons: number;
  }
  const items: Item[] = [];
  for (const mount of record.mounts) {
    if (mount.part) continue;
    const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
    if (!row) {
      note(mount, mount.name, "not in our equipment table");
      continue;
    }
    const facts = catalog.factsOf(mount, record);
    items.push({ mount, row, slots: facts?.slots ?? mount.slots ?? 1, tons: facts?.tons ?? 0 });
  }
  const has = (ids: string[]) => items.some((i) => ids.includes(i.row.id));
  const isLam = record.configuration === "lam" || record.configuration === "bimodal-lam";
  const standardLam = record.configuration === "lam";
  const stealth = chassis.armorType === "stealth";
  const tsm = has(TSM_IDS);
  const masc = has(MASC_IDS);

  // ---- Movement -------------------------------------------------------------------------------------------------
  const walk = walkMP(record) ?? Math.max(0, Math.floor(chassis.engine.rating / Math.max(1, record.tons)));
  const walkMax = tsm ? walk + 2 : walk; // Total Warfare p. 143
  const runMP = masc ? walk * 2 : Math.ceil(walkMax * 1.5); // MASC: double the Walking MP, Total Warfare p. 138; running: p. 53
  // SHARED? jumpMP: the count of jump-jet mounts.
  const jumpMP = items.filter((i) => i.row.kind === "jump-jet").length;
  const improvedJets = has(IMPROVED_JUMP_JET_IDS);
  const cruise = jumpMP * LAM_BV.cruisePerJumpMP;
  const flank = Math.ceil(cruise * LAM_BV.flankFactor);

  // ---- Defensive Battle Rating ----------------------------------------------------------------------------------
  // SHARED? armorPoints (front plus rear over every location) and structure (the sum of structurePoints(record)); cost needs both.
  const armorPoints = Object.values(record.armor).reduce((sum, a) => sum + (a ? a.front + (a.rear ?? 0) : 0), 0);
  const armorMod = own(ARMOR_BV_MODIFIER.values, chassis.armorType);
  const structureMod = own(STRUCTURE_BV_MODIFIER.values, chassis.structure);
  const engineMod = own(ENGINE_BV_MODIFIER.values, chassis.engine.type);
  const gyroMod = own(GYRO_BV_MODIFIER.values, chassis.gyro);
  for (const [what, value, key] of [
    ["armor type", armorMod, chassis.armorType],
    ["internal structure type", structureMod, chassis.structure],
    ["engine type", engineMod, chassis.engine.type],
    ["gyro type", gyroMod, chassis.gyro],
  ] as const) {
    if (value === undefined) note(undefined, `${what} "${key}"`, "no printed Battle Value modifier; counted as 1.0");
  }
  const structure = Object.values(structurePoints(record)).reduce((sum, n) => sum + n, 0);
  const armor = armorPoints * BV_METHOD.armorFactor * (armorMod ?? 1);
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
      defensiveAmmo.set(ammoEntry.id, { ...seen, ammo: seen.ammo + (ammoEntry.ammoBv ?? 0) * (tons > 0 ? tons : 1) });
    }
  }
  for (const { systems, ammo } of defensiveAmmo.values()) defensiveEquipment += Math.min(systems, ammo);

  // Explosive ammunition and Gauss weapons: points per critical slot, by where the slot is.
  const clanMech = record.techBase === "clan" || chassis.engine.type === "xl-clan";
  const xlInnerSphere = chassis.engine.type === "xl";
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
      // An arm is safe only with CASE in the arm and in the next location inward (one reading of the book's "or in the next location inward").
      const inward = caseAt(INWARD[loc] ?? null);
      return own1 === undefined || inward === undefined ? 1 : Math.max(prototype(own1), prototype(inward));
    }
    if (loc === "LT" || loc === "RT") return prototype(own1);
    return 1; // center torso, head and every leg
  };
  let explosive = 0;
  for (const { mount, row, slots } of items) {
    const ammoEntry = row.kind === "ammunition" ? AMMO.get(row.id) : undefined;
    const fuel = isLam && LAM_BV.fuelSlotIds.includes(row.id);
    if ((row.kind === "ammunition" && !ammoEntry?.options.inert) || fuel) {
      explosive += slots * BV_METHOD.explosiveAmmoPerSlot * exposure(mount.location);
    }
    const entry = WEAPONS.get(row.id) ?? EQUIPMENT.get(row.id);
    if (entry?.options.gauss) explosive += slots * BV_METHOD.gaussPerSlot * (exposure(mount.location) > 0 ? 1 : 0);
  }
  const defensiveSubtotal = Math.max(BV_METHOD.minimumDefensive, armor + structureBv + gyro + defensiveEquipment - explosive);

  // Target Movement Modifier: the highest the 'Mech can present (running or MASC, jumping, a standard LAM's AirMech flank, stealth armor).
  const modifiers = [movementModifier(runMP, false)];
  if (jumpMP > 0) modifiers.push(movementModifier(jumpMP, true));
  if (standardLam && jumpMP > 0) modifiers.push(movementModifier(flank, false) + LAM_BV.airborneModifier);
  const targetModifier = Math.max(...modifiers) + (stealth ? BV_METHOD.stealthTargetModifier : 0);
  const factor = 1 + targetModifier / 10;
  const defensiveRating = defensiveSubtotal * factor;

  // ---- Offensive Battle Rating ----------------------------------------------------------------------------------
  // SHARED? heat sink capacity: chassis.heatSinks.count times 1 (single) or 2 (double); cost needs the type and count.
  const heatSinkFactor = chassis.heatSinks.type.startsWith("double") ? 2 : 1;
  const capacity = chassis.heatSinks.count * heatSinkFactor + items.reduce((sum, i) => sum + (own(HEAT_EFFICIENCY_BONUS, i.row.id) ?? 0), 0);
  const jumpHeat = jumpMP === 0 ? 0 : Math.max(BV_METHOD.jumpHeatMinimum, improvedJets ? Math.ceil(jumpMP / 2) : jumpMP);
  const airMechHeat = standardLam ? Math.round(flank / 3) : 0; // one heat per 3 MP, IO:AE p. 102
  const movementHeat = Math.max(BV_METHOD.runningHeat, jumpHeat, airMechHeat) + (stealth ? BV_METHOD.stealthHeat : 0);
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

  // Artemis IV on a launcher (not its ammunition) and the targeting computer on direct-fire weapons.
  const artemisTaken = new Set<string>();
  for (const { mount, row } of items) {
    const multiplier = own(ARTEMIS_IDS, row.id);
    if (multiplier === undefined) continue;
    const host =
      weapons.find((w) => w.item.mount.id === mount.linkedTo) ??
      weapons.find((w) => !artemisTaken.has(w.item.mount.id) && w.item.mount.location === mount.location && /^(lrm|srm|mml)-\d+-/.test(w.item.row.id));
    if (host) {
      artemisTaken.add(host.item.mount.id);
      host.mod *= multiplier;
      host.notes.push(`${row.name}: x${multiplier}`);
    } else note(mount, mount.name, "not linked to a launcher, so its bonus is not counted");
  }
  const tc = has(TARGETING_COMPUTER_IDS);
  for (const w of weapons) {
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
      note(mount, mount.name, "special or unlisted ammunition: the book prints no BV for it");
      continue;
    }
    if (entry.options.defensiveAmmo) continue;
    // BV per ton, taken in proportion for a bin of other than a ton (the book prints the full-ton rule for 'Mechs only).
    const bin = tons > 0 ? tons : 1;
    ammoBv.set(entry.id, (ammoBv.get(entry.id) ?? 0) + (entry.ammoBv ?? 0) * bin);
  }
  let ammunition = 0;
  for (const [id, bv] of ammoBv) ammunition += WEAPONS.has(id) ? Math.min(bv, modelBv.get(id) ?? 0) : bv;

  // Other equipment, added in full.
  let equipment = 0;
  const directFireBv = (w: W) => w.bv * (w.item.mount.rear && bodyMounted(w) ? 0.5 : 1);
  for (const { mount, row } of items) {
    if (row.kind === "heat-sink" || row.kind === "jump-jet" || row.kind === "ammunition" || WEAPONS.has(row.id)) continue;
    const physical = own(PHYSICAL_BV.rows, row.id);
    const entry = EQUIPMENT.get(row.id);
    if (physical) {
      const t = record.tons;
      const damage = physical.damage === "hatchet" ? Math.ceil(t / 5) : physical.damage === "sword" ? Math.ceil(t / 10) + 1 : Math.ceil(t / 10);
      equipment += damage * (tsm ? 2 : 1) * physical.factor;
    } else if (TARGETING_COMPUTER_IDS.includes(row.id)) {
      equipment += BV_METHOD.targetingComputerBv * weapons.filter((w) => w.item.row.directFire).reduce((s, w) => s + directFireBv(w), 0);
    } else if (MACHINE_GUN_ARRAY_IDS.includes(row.id)) {
      const guns = weapons.filter((w) => /machine-gun-(is|clan)$/.test(w.item.row.id) && w.item.mount.location === mount.location);
      equipment += BV_METHOD.machineGunArray * guns.reduce((s, w) => s + w.bv, 0);
    } else if (entry && !entry.options.defensive) equipment += entry.bv;
    else if (!entry && !LAM_BV.fuelSlotIds.includes(row.id) && own(CASE_ROWS, row.id) === undefined) note(mount, mount.name, "the book prints no Battle Value for it");
  }

  const tonnage = record.tons * (tsm ? BV_METHOD.tsmTonnage : 1);
  weaponRating += ammunition + equipment + tonnage;

  const runForSpeed = runMP;
  const speedMP = standardLam ? runForSpeed + Math.round(flank / 2) : runForSpeed + Math.ceil(jumpMP / 2);
  const speed = speedFactor(speedMP);
  const offensiveRating = weaponRating * speed;

  // ---- Final ----------------------------------------------------------------------------------------------------
  const smallCockpit = chassis.cockpit === "small";
  const sum = (defensiveRating + offensiveRating) * (smallCockpit ? BV_METHOD.smallCockpit : 1);
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
    modifiers: { smallCockpit, tsm },
    unvalued,
  };
}
