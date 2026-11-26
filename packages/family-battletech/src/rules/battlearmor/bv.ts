// Battle armor Battle Value and C-bill cost. Battle Value follows TechManual Battle Value v4.1 pp. 310-311 (the method), with the tables printed
// pp. 315-317 (the shared Speed Factor and Target Modifier tables of data/bv.ts, the unit size modifiers below); cost follows TechManual p. 281 for the
// structure, pp. 296-297 for equipment (data/cost.ts) and p. 285 for the final formula. Fractions are kept to the end, then rounded half up.
import { BATTLE_ARMOR_BV, TARGET_MODIFIER } from "../../data/bv";
import { BA_BOOSTERS, COST_FIGURES, GROUND_MP_COST, armorTypeOf, isMotive, manipulatorOf, weightClassOf } from "../../data/battlearmor";
import type { Catalog, EquipmentRow } from "../catalog";
import { priceOf } from "../cost";
import { skillMultiplier, speedFactor } from "../bv";
import { roundHalfUp, tidy } from "../walk";
import { dispenserBv, chosenMunition } from "../munitions";
import { build, carriesShots, figuresOf, isMyomerBooster, isMechanicalBooster, myomerBonus, shotsOf } from "./construct";
import type { BaRecord } from "./record";

/** The Battle Armor Unit Size Modifier Table (printed p. 316): troopers in the unit, 1 to 6. */
export const SIZE_MODIFIER = [1.0, 2.2, 3.6, 5.2, 7.0, 9.0];
/** Claws that aid a Swarm attack add to the weapon rating (v4.1 p. 310): magnets 3 a pair, vibro-claws 1 each (table p. 317). */
const SWARM_CLAW_BV: Record<string, number> = { "battle-claw-magnets": 1.5, "heavy-claw-magnets": 1.5, "battle-claw-vibro": 1, "heavy-claw-vibro": 1 };
/** Missile systems, which the direct-fire rating leaves out. */
const MISSILE = /^ba-(lrm|srm|mrm|advanced-srm|rocket-launcher)-|^ba-compact-narc-|^ba-pop-up-mine-|^ba-tube-artillery-/;
/** The Defensive Factor Modifier Table adds for a Camo System item (the armor types add theirs: data/battlearmor.ts). */
const CAMO_ITEM_FACTOR = 0.2;
const BATTLE_ARMOR_FACTOR = 0.1;

interface Entry {
  bv: number;
  ammoBv?: number;
  defensive?: boolean;
}
const ENTRIES = new Map<string, Entry>();
for (const group of BATTLE_ARMOR_BV) for (const [id, bv, ammoBv, options] of group.rows) ENTRIES.set(id, { bv, ...(ammoBv === undefined ? {} : { ammoBv }), ...(options?.defensive ? { defensive: true } : {}) });

export interface BaBv {
  /** One suit's defensive and offensive ratings and total, before rounding. */
  defensive: number;
  offensive: number;
  perSuit: number;
  /** The unit's Battle Value at Gunnery 4, Anti-'Mech 5, and with the record's skills. */
  base: number;
  total: number;
  steps: { label: string; value: number }[];
  /** Items counted as nothing because no BV table lists them. */
  unvalued: string[];
}

/** The highest Target Movement Modifier the suit can present: ground, jump (+1) and VTOL (+1) (v4.1 Defensive Factors Table note). */
function targetModifier(hexes: number, bonus: number): number {
  const band = TARGET_MODIFIER.bands.find(([most]) => hexes <= most);
  return (band?.[1] ?? 0) + bonus;
}

export function battleValue(record: BaRecord, catalog: Catalog): BaBv {
  const b = build(record, catalog);
  const steps: BaBv["steps"] = [];
  const unvalued: string[] = [];
  const armor = armorTypeOf(record.armor.type);

  // Step 1: defensive rating.
  const points = Math.max(0, record.armor.points);
  let defensive = points * (armor?.bvPerPoint ?? 2.5) + 1;
  const mounts = record.mounts.flatMap((mount) => {
    const figures = figuresOf(mount, catalog, record.editionId, record.weightClass);
    // A mine dispenser is worth a 10-point minefield of its mine type (TO:AUE p. 195, note P), not a table line (rules/munitions.ts).
    const mine = dispenserBv(figures?.row.id.startsWith("ba-mine-dispenser") ? chosenMunition(figures.row, mount.munition, catalog, record.editionId) : undefined);
    return figures ? [{ mount, row: figures.row, entry: mine === undefined ? ENTRIES.get(figures.row.id) : { bv: mine } }] : [];
  });
  for (const m of mounts) if (m.entry?.defensive) defensive += 1;
  const tmm = Math.max(targetModifier(b.moves.ground, 0), b.moves.jump > 0 ? targetModifier(b.moves.jump, TARGET_MODIFIER.jumpBonus) : 0, b.moves.vtol > 0 ? targetModifier(b.moves.vtol, 1) : 0, b.moves.umu > 0 ? targetModifier(b.moves.umu, 0) : 0);
  const camoItem = mounts.some((m) => m.row.id.startsWith("ba-camo-system"));
  const factor = 1 + tmm / 10 + BATTLE_ARMOR_FACTOR + (armor?.bvFactor ?? 0) + (camoItem ? CAMO_ITEM_FACTOR : 0);
  const defensiveRating = defensive * factor;
  steps.push({ label: "Defensive rating", value: tidy(defensiveRating) });

  // Step 2: offensive rating.
  let direct = 0;
  let missile = 0;
  let other = 0;
  for (const { mount, row, entry } of mounts) {
    if (!entry) {
      if (row.kind === "weapon") unvalued.push(row.name);
      continue;
    }
    if (entry.defensive) continue;
    if (MISSILE.test(row.id)) {
      missile += entry.bv;
      if (carriesShots(row) && entry.ammoBv !== undefined) missile += ((shotsOf(mount) * (row.ammoKgPerShot ?? 0)) / 1000) * entry.ammoBv;
    } else if (row.kind === "weapon") direct += entry.bv;
    else other += entry.bv;
  }
  const claws = record.body === "humanoid" ? (SWARM_CLAW_BV[record.manipulators.la] ?? 0) + (SWARM_CLAW_BV[record.manipulators.ra] ?? 0) : 0;
  const antiMech = b.capabilities.swarm ? direct + claws : 0;
  const weaponRating = direct + missile + antiMech + other;
  const speed = speedFactor(Math.max(b.moves.ground, b.moves.jump, b.moves.vtol, b.moves.umu));
  const offensiveRating = weaponRating * speed;
  steps.push({ label: "Weapon rating", value: tidy(weaponRating) }, { label: "Speed factor", value: speed }, { label: "Offensive rating", value: tidy(offensiveRating) });

  const perSuit = defensiveRating + offensiveRating;
  const size = SIZE_MODIFIER[Math.min(6, Math.max(1, Math.round(record.troopers))) - 1] ?? 1;
  const base = roundHalfUp(perSuit * size);
  const skill = skillMultiplier({ gunnery: record.skills.gunnery, piloting: record.skills.antiMech });
  return { defensive: tidy(defensiveRating), offensive: tidy(offensiveRating), perSuit: tidy(perSuit), base, total: roundHalfUp(perSuit * size * skill), steps, unvalued };
}

export interface BaCostLine {
  label: string;
  cost: number;
}
export interface BaCost {
  lines: BaCostLine[];
  /** One suit's structure and equipment, its training, and the unit's total. */
  perSuit: number;
  total: number;
  unpriced: string[];
}

export function unitCost(record: BaRecord, catalog: Catalog): BaCost {
  const cls = weightClassOf(record.weightClass);
  const lines: BaCostLine[] = [];
  const unpriced: string[] = [];
  let structure = 0;
  if (cls) {
    structure += cls.cost.chassis;
    const free = record.body === "quad" ? (cls.ground.free.quad ?? cls.ground.free.humanoid) : cls.ground.free.humanoid;
    structure += Math.max(0, record.ground - free) * GROUND_MP_COST;
    const kind = record.motive.kind;
    if (isMotive(kind)) structure += record.motive.mp * (cls.cost[kind] ?? 0);
  }
  for (const id of [record.manipulators.la, record.manipulators.ra]) structure += manipulatorOf(id)?.cost ?? 0;
  structure += Math.max(0, record.armor.points) * (armorTypeOf(record.armor.type)?.costPerPoint ?? 0);
  if (record.techBase === "clan") structure *= COST_FIGURES.clanMultiplier;
  lines.push({ label: "Structure, motive, manipulators and armor", cost: tidy(structure) });
  let equipment = 0;
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);
    const price = row ? priceOf(row) : undefined;
    // The items whose price follows the suit: a myomer booster is 75,000 for each Ground MP it gives, a mechanical jump booster costs a jump jet of the class, and a reusable drop
    // chute costs twice the drop chute it is fitted to (TO:AUE p. 225; a standard one if the suit carries none).
    if (row && isMyomerBooster(row) && typeof price?.price === "object" && "perAmount" in price.price) {
      equipment += price.price.perAmount * myomerBonus(record.weightClass);
      continue;
    }
    if (row && mount.pack === true && typeof price?.price === "number") {
      equipment += price.price + BA_BOOSTERS.dwp.extraCost;
      continue;
    }
    if (row && isMechanicalBooster(row) && cls) {
      equipment += cls.cost.jump;
      continue;
    }
    if (row?.id.startsWith("ba-drop-chute-reusable")) {
      const fitted = record.mounts.map((m) => (m.equipmentId === null ? undefined : catalog.rowFor(m.equipmentId, record.editionId))).find((r) => r !== undefined && /^ba-drop-chute-(standard|camouflage|stealth)-/.test(r.id));
      const chute = fitted ? priceOf(fitted) : priceOf({ id: "ba-drop-chute-standard-is" } as EquipmentRow);
      if (typeof chute?.price === "number") {
        equipment += 2 * chute.price;
        continue;
      }
    }
    if (!row || typeof price?.price !== "number") {
      unpriced.push(mount.name || mount.equipmentId || "an item");
      continue;
    }
    equipment += price.price;
  }
  lines.push({ label: "Weapons and equipment", cost: tidy(equipment) });
  const training = COST_FIGURES.trainingCost[record.techBase];
  lines.push({ label: "Training", cost: training });
  const perSuit = structure + equipment + training;
  const troopers = Math.max(1, Math.round(record.troopers));
  return { lines, perSuit: tidy(perSuit), total: tidy(perSuit * troopers), unpriced };
}
