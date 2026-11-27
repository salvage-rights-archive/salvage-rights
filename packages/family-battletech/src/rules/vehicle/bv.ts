// Battle Value of a Combat Vehicle: TechManual's method in the Battle Value v4.1 replacement pages ("Calculating Vehicle BV"), with the Unit
// Type Modifiers, Defensive Factors and Speed Factor tables (printed pp. 315-316) and the item values in data/bv.ts, which the 'Mech method
// shares. Nothing here throws: an item the book prints no BV for is left out of the total and listed in `unvalued`, and `complete` says so.
import { VEHICULAR_STEALTH } from "../../data/chassis";
import { ADVANCED_BV_MODIFIERS, ARMOR_BV_MODIFIER, ARTEMIS_IDS, BV_METHOD, TARGET_MODIFIER, TARGETING_COMPUTER_IDS } from "../../data/bv";
import { AIRBORNE_MOTIVES, VEHICLE_BV, motiveOf } from "../../data/vehicle";
import { ammoBvEntryOf, bvEntryOf, defensiveMunitionBv, munitionAmmoEntry, retroStreakCap, skillMultiplier, speedFactor } from "../bv";
import { bvWithMunition, chosenMunition, grenadeExtraBv } from "../munitions";
import type { PilotSkills } from "../bv";
import { isModularArmor, modularPoints } from "../advanced-armor";
import type { Catalog } from "../catalog";
import { own, tidy, roundHalfUp } from "../walk";
import { assignedArmor, flankMP, itemFacts, rowOf, structurePoints } from "./vehicle";
import type { VehicleRecord } from "./vehicle";
import { armorLocations } from "./vehicle";

export interface VehicleBvLine {
  label: string;
  value: number;
  note?: string;
}
export interface VehicleBvResult {
  total: number;
  defensive: number;
  offensive: number;
  skillMultiplier: number;
  lines: VehicleBvLine[];
  /** Items the book prints no BV for: left out of the total. */
  unvalued: string[];
  complete: boolean;
}

/** Target Movement Modifier for the hexes moved at flank (Total Warfare p. 117), and 1 more for a VTOL or WiGE (Total Warfare pp. 55 and 117; TechManual p. 316 note). A vehicle with
 * vehicular stealth armor uses the modifiers of a 'Mech with stealth armor (TO:AUE p. 192), which add the stealth armor's long-range modifier of 2; modular armor does not take it
 * off, since stealth is counted as if it worked at full effect (same page). */
export function targetModifier(record: Pick<VehicleRecord, "cruise" | "motive"> & { armor?: { type: string } }): number {
  const hexes = flankMP(record);
  const band = TARGET_MODIFIER.bands.find(([most]) => hexes <= most)?.[1] ?? 0;
  const stealth = record.armor?.type === VEHICULAR_STEALTH.id ? BV_METHOD.stealthTargetModifier : 0;
  return band + (AIRBORNE_MOTIVES.includes(record.motive as never) ? TARGET_MODIFIER.jumpBonus : 0) + stealth;
}
/** Defensive Factor: 1 + the modifier over 10 (the table's rows run 1.0 to 1.8, then 1 + modifier / 10). */
export const defensiveFactor = (record: Pick<VehicleRecord, "cruise" | "motive"> & { armor?: { type: string } }): number => 1 + targetModifier(record) / 10;

export function vehicleBv(record: VehicleRecord, catalog: Catalog, pilot: PilotSkills = { gunnery: 4, piloting: 5 }): VehicleBvResult {
  const lines: VehicleBvLine[] = [];
  const unvalued: string[] = [];
  const motive = motiveOf(record.motive);
  // Defensive Battle Rating.
  const armor = assignedArmor(record) + modularPoints(record.mounts); // modular armor adds its points at the armor modifier of the armor beside it (TO:AUE p. 192)
  const locations = armorLocations(record).length;
  const structure = structurePoints(record) * locations;
  let defensiveEquipment = 0;
  let defensiveAmmo = 0;
  // Offensive: each weapon's unmodified BV, by firing place.
  const weapons: { id: string; location: string; bv: number; direct: boolean }[] = [];
  const ammoBins: { weapon: string; bv: number }[] = [];
  const artemis: Record<string, number> = {};
  let targetingComputer = false;
  let otherEquipment = 0;
  let retroStreak = 0;
  let grenades = 0;
  // The weapons on the unit, for a munition that takes its figure from the launcher that fires it.
  const launcherRows = record.mounts.flatMap((m) => {
    const r = rowOf(m, record, catalog);
    return r === undefined || r.kind !== "weapon" ? [] : [r];
  });
  for (const m of record.mounts) {
    const row = rowOf(m, record, catalog);
    if (row === undefined) {
      unvalued.push(m.name || "an unnamed item");
      continue;
    }
    const facts = itemFacts(m, record, catalog);
    if (facts.ammo) {
      // Retro-Streak ammunition adds to the Defensive Battle Value; the Dead-Fire, improved ATM and fuel-air munitions count as the ammunition of the launcher that fires them (IO:AE p. 190).
      const defensiveMunition = defensiveMunitionBv(row);
      if (defensiveMunition !== undefined) {
        retroStreak += defensiveMunition * (facts.tons ?? 0);
        continue;
      }
      const special = munitionAmmoEntry(row, launcherRows);
      if (special !== undefined) {
        if (typeof special === "string") unvalued.push(row.name);
        else ammoBins.push({ weapon: special.id, bv: (special.ammoBv ?? 0) * (facts.tons ?? 0) });
        continue;
      }
      const entry = ammoBvEntryOf(row.id);
      if (entry?.ammoBv === undefined) {
        if (entry === undefined) unvalued.push(row.name);
        continue;
      }
      const value = entry.ammoBv * (facts.tons ?? 0);
      if (entry.options.defensiveAmmo) defensiveAmmo += value;
      else ammoBins.push({ weapon: entry.id, bv: value });
      continue;
    }
    if (isModularArmor(row.id)) continue; // its points are in the armor total; it has no Battle Value of its own
    if (ARTEMIS_IDS[row.id] !== undefined) {
      artemis[m.location] = (artemis[m.location] ?? 0) + 1;
      continue;
    }
    if (TARGETING_COMPUTER_IDS.includes(row.id)) {
      targetingComputer = true;
      continue;
    }
    const entry = bvEntryOf(row.id);
    // A mine dispenser is worth a minefield of its mine type, a grenade launcher its own BV and what its grenade adds (rules/munitions.ts).
    const chosen = chosenMunition(row, m.munition, catalog, record.editionId);
    const bv = bvWithMunition(chosen, entry?.bv);
    if (entry !== undefined) grenades += grenadeExtraBv(chosen, entry.bv);
    if (bv === undefined) {
      unvalued.push(row.name);
      continue;
    }
    if (entry?.options.defensive) defensiveEquipment += bv;
    else if (row.kind === "weapon") weapons.push({ id: row.id, location: m.location, bv, direct: row.directFire === true });
    else otherEquipment += bv;
  }
  // Artemis IV on the launchers of the same place, one system to a launcher (+20 percent of the launcher, not its ammunition).
  for (const [location, count] of Object.entries(artemis)) {
    let left = count;
    for (const w of weapons) {
      if (left > 0 && w.location === location && /^(lrm|srm|mml)-\d+-(is|clan)$/.test(w.id)) {
        w.bv *= VEHICLE_BV.artemis;
        left -= 1;
      }
    }
  }
  if (targetingComputer) for (const w of weapons) if (w.direct) w.bv *= VEHICLE_BV.targetingComputer;
  // Rear-firing weapons count half; where the forward-arc ones are worth less, they are halved instead. The turret is in no arc.
  const rear = weapons.filter((w) => w.location === "b").reduce((s, w) => s + w.bv, 0);
  const forward = weapons.filter((w) => w.location !== "b" && w.location !== "t").reduce((s, w) => s + w.bv, 0);
  const halved = forward < rear ? (w: { location: string }) => w.location !== "b" && w.location !== "t" : (w: { location: string }) => w.location === "b";
  let weaponBv = 0;
  const unmodifiedByModel = new Map<string, number>();
  for (const w of weapons) {
    weaponBv += halved(w) ? w.bv * VEHICLE_BV.rearFactor : w.bv;
    const entry = bvEntryOf(w.id);
    unmodifiedByModel.set(w.id, (unmodifiedByModel.get(w.id) ?? 0) + (entry?.bv ?? 0));
  }
  // Ammunition counts up to the BV of the weapons it feeds (all of that model together).
  const ammoByModel = new Map<string, number>();
  for (const bin of ammoBins) ammoByModel.set(bin.weapon, (ammoByModel.get(bin.weapon) ?? 0) + bin.bv);
  let ammoBv = 0;
  for (const [weapon, value] of ammoByModel) ammoBv += Math.min(value, unmodifiedByModel.get(weapon) ?? 0);
  defensiveEquipment += Math.min(retroStreak, retroStreakCap(launcherRows));
  const amsCap = defensiveEquipment; // anti-missile ammunition counts up to the systems themselves
  const defensiveAmmoCounted = Math.min(defensiveAmmo, amsCap);

  // The armor type modifier (TM p. 315; TO:AUE p. 192 extends it to every unit but infantry); a type the tables do not list counts 1.
  const armorModifier = own(ARMOR_BV_MODIFIER.values, record.armor.type) ?? own(ADVANCED_BV_MODIFIERS.armor, record.armor.type)?.value ?? 1;
  const defensiveBase = armor * VEHICLE_BV.armorFactor * armorModifier + structure * VEHICLE_BV.structureFactor + defensiveEquipment + defensiveAmmoCounted;
  const typeModifier = motive?.bvModifier ?? 1;
  const factor = defensiveFactor(record);
  const defensive = defensiveBase * typeModifier * factor;
  lines.push(
    { label: "Armor points", value: armor * VEHICLE_BV.armorFactor * armorModifier, note: `${String(armor)} x ${String(VEHICLE_BV.armorFactor)}${armorModifier === 1 ? "" : ` x ${String(armorModifier)} (armor type)`}` },
    { label: "Structure points", value: structure * VEHICLE_BV.structureFactor, note: `${String(structure)} x ${String(VEHICLE_BV.structureFactor)}` },
    { label: "Defensive equipment", value: defensiveEquipment + defensiveAmmoCounted },
    { label: "Unit type modifier", value: typeModifier },
    { label: "Defensive factor", value: tidy(factor), note: `flank ${String(flankMP(record))} MP` },
    { label: "Defensive Battle Rating", value: tidy(defensive) },
  );
  const weaponRating = weaponBv + ammoBv + otherEquipment + record.tons / VEHICLE_BV.tonsDivisor;
  const speed = speedFactor(flankMP(record));
  const offensive = weaponRating * speed;
  lines.push(
    { label: "Weapons, ammunition and equipment", value: tidy(weaponBv + ammoBv + otherEquipment) },
    { label: "Tons over 2", value: record.tons / VEHICLE_BV.tonsDivisor },
    { label: "Speed factor", value: speed },
    { label: "Offensive Battle Rating", value: tidy(offensive) },
  );
  const multiplier = skillMultiplier(pilot);
  // Incendiary grenades add half the launcher's BV to the unit's base BV, before the skill multiplier (TO:AUE p. 198: a doubtful reading, the book names one-shot weapons).
  if (grenades > 0) lines.push({ label: "Incendiary grenades", value: tidy(grenades), note: "half each launcher's BV, added to the base BV (a doubtful reading of TO:AUE p. 198)" });
  const total = roundHalfUp((defensive + offensive + grenades) * multiplier);
  return { total, defensive: tidy(defensive), offensive: tidy(offensive), skillMultiplier: multiplier, lines, unvalued, complete: unvalued.length === 0 };
}
