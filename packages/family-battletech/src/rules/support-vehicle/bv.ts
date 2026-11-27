// Battle Value of a Support Vehicle: TechManual's method in the Battle Value v4.1 replacement pages ("Calculating Vehicle BV"; "Calculating Aerospace BV" for the
// airship and the fixed-wing unit, which the vehicle pages send there). The Unit Type Modifiers, Defensive Factors, Offensive BV Adjustment (fire control) and
// Speed Factor tables are the book's (printed pp. 315-316); the item values are in data/bv.ts, which the 'Mech method shares. The armor factor is the points times
// the BAR over 10, in place of the 2.5 of a combat unit (the page's note and its worked example, the CellCo Ranger, 38 x 0.7). Nothing here throws: an item the book
// prints no BV for is left out of the total and listed in `unvalued`, and `complete` says so.
import { ARTEMIS_IDS, TARGET_MODIFIER, TARGETING_COMPUTER_IDS } from "../../data/bv";
import { INFANTRY_WEAPON_BV } from "../../data/infantry-bv";
import { SV_BV, svMotiveOf } from "../../data/support-vehicle";
import { ammoBvEntryOf, bvEntryOf, defensiveMunitionBv, munitionAmmoEntry, retroStreakCap, skillMultiplier, speedFactor } from "../bv";
import type { PilotSkills } from "../bv";
import type { Catalog } from "../catalog";
import { bvWithMunition, chosenMunition } from "../munitions";
import { stemOf, tidy, roundHalfUp } from "../walk";
import { armorLocations, assignedArmor, isAir, itemFacts, playFlank, rowOf, structuralIntegrity, structurePoints } from "./sv";
import type { SupportVehicleRecord } from "./sv";

export interface SvBvLine {
  label: string;
  value: number;
  note?: string;
}
export interface SvBvResult {
  total: number;
  defensive: number;
  offensive: number;
  skillMultiplier: number;
  lines: SvBvLine[];
  unvalued: string[];
  complete: boolean;
}

/** Target Movement Modifier for the hexes moved at flank (Total Warfare p. 117), and 1 more for a VTOL or WiGE (Total Warfare pp. 55 and 117; TechManual p. 316 note). */
export function targetModifier(record: Pick<SupportVehicleRecord, "cruise" | "motive" | "structure" | "engine">): number {
  const hexes = playFlank(record);
  const band = TARGET_MODIFIER.bands.find(([most]) => hexes <= most)?.[1] ?? 0;
  return band + (record.motive === "vtol" || record.motive === "wige" ? TARGET_MODIFIER.jumpBonus : 0);
}

export function svBv(record: SupportVehicleRecord, catalog: Catalog, pilot: PilotSkills = { gunnery: 4, piloting: 5 }): SvBvResult {
  const lines: SvBvLine[] = [];
  const unvalued: string[] = [];
  const motive = svMotiveOf(record.motive);
  const air = isAir(record);
  const fireControl = SV_BV.fireControl[record.fireControl];
  let defensiveEquipment = 0;
  let defensiveAmmo = 0;
  let retroStreak = 0;
  const weapons: { id: string; location: string; bv: number; direct: boolean; heavy: boolean }[] = [];
  const ammoBins: { weapon: string; bv: number; heavy: boolean }[] = [];
  const artemis: Record<string, number> = {};
  let targetingComputer = false;
  let otherEquipment = 0;
  const launcherRows = record.mounts.flatMap((m) => {
    const r = rowOf(m, record, catalog);
    return r === undefined || r.kind !== "weapon" ? [] : [r];
  });
  for (const m of record.mounts) {
    const facts = itemFacts(m, record, catalog);
    const row = facts.row;
    if (row === undefined) {
      unvalued.push(m.name || "an unnamed item");
      continue;
    }
    if (facts.infantry) {
      // A Light or Medium weapon of a Small unit counts at the Conventional Infantry Weapons table's figure, once for each, and is not adjusted for fire control (the page).
      // OUR INFERENCE: the book names no Battle Value table for these weapons; the infantry table is the only one that lists them (book panel 2026-11-26).
      const bv = INFANTRY_WEAPON_BV[stemOf(row.id)];
      if (bv === undefined) unvalued.push(row.name);
      else for (let n = 0; n < facts.qty; n += 1) weapons.push({ id: row.id, location: m.location, bv, direct: false, heavy: false });
      continue;
    }
    if (facts.ammo) {
      const defensiveMunition = defensiveMunitionBv(row);
      if (defensiveMunition !== undefined) {
        retroStreak += defensiveMunition * (facts.tons ?? 0) * facts.qty;
        continue;
      }
      const special = munitionAmmoEntry(row, launcherRows);
      if (special !== undefined) {
        if (typeof special === "string") unvalued.push(row.name);
        else ammoBins.push({ weapon: special.id, bv: (special.ammoBv ?? 0) * (facts.tons ?? 0) * facts.qty, heavy: true });
        continue;
      }
      const entry = ammoBvEntryOf(row.id);
      if (entry?.ammoBv === undefined) {
        if (entry === undefined) unvalued.push(row.name);
        continue;
      }
      const value = entry.ammoBv * (facts.tons ?? 0) * facts.qty;
      if (entry.options.defensiveAmmo) defensiveAmmo += value;
      else ammoBins.push({ weapon: entry.id, bv: value, heavy: true });
      continue;
    }
    if (ARTEMIS_IDS[row.id] !== undefined) {
      artemis[m.location] = (artemis[m.location] ?? 0) + facts.qty;
      continue;
    }
    if (TARGETING_COMPUTER_IDS.includes(row.id)) {
      targetingComputer = true;
      continue;
    }
    const entry = bvEntryOf(row.id);
    const chosen = chosenMunition(row, m.munition, catalog, record.editionId);
    const bv = bvWithMunition(chosen, entry?.bv);
    if (bv === undefined) {
      // Cargo, seats, quarters and the like carry no Battle Value: they are not a gap in the table.
      if (entry !== undefined || row.kind === "weapon") unvalued.push(row.name);
      continue;
    }
    if (entry?.options.defensive) defensiveEquipment += bv * facts.qty;
    else if (row.kind === "weapon") for (let n = 0; n < facts.qty; n += 1) weapons.push({ id: row.id, location: m.location, bv, direct: row.directFire === true, heavy: true });
    else otherEquipment += bv * facts.qty;
  }
  for (const [location, count] of Object.entries(artemis)) {
    let left = count;
    for (const w of weapons) {
      if (left > 0 && w.location === location && /^(lrm|srm|mml)-\d+-(is|clan)$/.test(w.id)) {
        w.bv *= SV_BV.artemis;
        left -= 1;
      }
    }
  }
  if (targetingComputer) for (const w of weapons) if (w.direct) w.bv *= SV_BV.targetingComputer;
  // Heavy weapons and their ammunition take the fire control multiplier; Light and Medium weapons do not.
  const unmodifiedByModel = new Map<string, number>();
  for (const w of weapons) {
    const entry = bvEntryOf(w.id);
    unmodifiedByModel.set(w.id, (unmodifiedByModel.get(w.id) ?? 0) + (entry?.bv ?? w.bv));
    if (w.heavy) w.bv *= fireControl;
  }
  // Rear-firing weapons count half; where the forward-arc ones are worth less, they are halved instead. The turret is in no arc.
  const isRear = (w: { location: string }) => w.location === "b" || w.location === "bl" || w.location === "br";
  const rear = weapons.filter(isRear).reduce((s, w) => s + w.bv, 0);
  const forward = weapons.filter((w) => !isRear(w) && w.location !== "t").reduce((s, w) => s + w.bv, 0);
  const halved = forward < rear ? (w: { location: string }) => !isRear(w) && w.location !== "t" : isRear;
  let weaponBv = 0;
  for (const w of weapons) weaponBv += halved(w) ? w.bv * SV_BV.rearFactor : w.bv;
  const ammoByModel = new Map<string, number>();
  for (const bin of ammoBins) ammoByModel.set(bin.weapon, (ammoByModel.get(bin.weapon) ?? 0) + bin.bv);
  let ammoBv = 0;
  for (const [weapon, value] of ammoByModel) ammoBv += Math.min(value, unmodifiedByModel.get(weapon) ?? 0) * fireControl;
  defensiveEquipment += Math.min(retroStreak, retroStreakCap(launcherRows));
  const defensiveAmmoCounted = Math.min(defensiveAmmo, defensiveEquipment);

  // Defensive Battle Rating: the armor points times BAR over 10, the structure (1.5 a point in each location, or 2.0 times the structural integrity of an air unit).
  const armorPoints = assignedArmor(record);
  const armorValue = armorPoints * SV_BV.armorFactor * (record.armor.bar / 10);
  const si = structuralIntegrity(record);
  const structure = air ? (si ?? 0) * SV_BV.siFactor : structurePoints(record) * armorLocations(record).length * SV_BV.structureFactor;
  const defensiveBase = armorValue + structure + defensiveEquipment + defensiveAmmoCounted;
  const typeModifier = motive?.bvModifier ?? 1;
  const factor = air ? 1 : 1 + targetModifier(record) / 10;
  const defensive = defensiveBase * typeModifier * factor;
  lines.push(
    { label: "Armor points", value: tidy(armorValue), note: `${String(armorPoints)} x BAR ${String(record.armor.bar)} / 10` },
    { label: air ? "Structural integrity" : "Structure points", value: tidy(structure), note: air ? `${String(si ?? 0)} x ${String(SV_BV.siFactor)}` : `${String(structurePoints(record) * armorLocations(record).length)} x ${String(SV_BV.structureFactor)}` },
    { label: "Defensive equipment", value: tidy(defensiveEquipment + defensiveAmmoCounted) },
    { label: "Unit type modifier", value: typeModifier },
    ...(air ? [] : [{ label: "Defensive factor", value: tidy(factor), note: `flank ${String(playFlank(record))} MP` }]),
    { label: "Defensive Battle Rating", value: tidy(defensive) },
  );
  // Offensive: the weapons, their ammunition and the equipment, and (for a ground or naval unit) the tons over 2; times the speed factor of the flank MP (Maximum Thrust for an air unit).
  const weaponRating = weaponBv + ammoBv + otherEquipment + (air ? 0 : record.tons / SV_BV.tonsDivisor);
  const speed = speedFactor(Math.ceil(playFlank(record)));
  const offensive = weaponRating * speed;
  lines.push(
    { label: "Weapons, ammunition and equipment", value: tidy(weaponBv + ammoBv + otherEquipment), note: `heavy weapons and their ammunition x ${String(fireControl)} for ${record.fireControl} fire control` },
    ...(air ? [] : [{ label: "Tons over 2", value: record.tons / SV_BV.tonsDivisor }]),
    { label: "Speed factor", value: speed },
    { label: "Offensive Battle Rating", value: tidy(offensive) },
  );
  const multiplier = skillMultiplier(pilot);
  const total = roundHalfUp((defensive + offensive) * multiplier);
  return { total, defensive: tidy(defensive), offensive: tidy(offensive), skillMultiplier: multiplier, lines, unvalued, complete: unvalued.length === 0 };
}
