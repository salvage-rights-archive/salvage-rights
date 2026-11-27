// The C-bill cost of a Support Vehicle: TechManual's Support Vehicle Structural Costs table (printed p. 280) for the chassis, engine and armor, the Tech Rating
// multiplier on those three, then the heat sinks, turret, pintle and power amplifiers, the equipment prices the 'Mech cost uses (data/cost.ts), fire control as a
// share of the weapons, and the Final Unit Cost Formulas Table (p. 285). An item with no printed price is left out and listed in `unpriced`. Rounded up to a
// hundredth of a C-bill, as errata v8.0 says of p. 274 (the book's worked examples round up to the whole C-bill, as its earlier printing did).
import { SV_COST, SV_PAGES, svEngineOf, svModOf, svMotiveOf } from "../../data/support-vehicle";
import type { BookPage } from "../../data/vehicle";
import { perTonCost, priceOf, roundUpCents } from "../cost";
import type { Catalog } from "../catalog";
import { tidy } from "../walk";
import { amplifierTons, armorTons, assignedArmor, engineTons, itemFacts, needsGunner, pintleTons, structureTons, turretTons } from "./sv";
import type { SupportVehicleRecord } from "./sv";

export interface SvCostLine {
  label: string;
  cost: number;
  how: string;
  cite: BookPage;
}
export interface SvCost {
  total: number;
  lines: SvCostLine[];
  /** The Omni factor (1.25 or 1) times (1 + tons / the motive type's divisor). */
  multiplier: number;
  unpriced: { name: string; why: string }[];
}

const money = (x: number): string => String(Math.round(x * 1000) / 1000).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function svCost(record: SupportVehicleRecord, catalog: Catalog): SvCost {
  const lines: SvCostLine[] = [];
  const unpriced: SvCost["unpriced"] = [];
  const cite = SV_COST.cite;
  const add = (label: string, cost: number, how: string, at: BookPage = cite) => lines.push({ label, cost, how, cite: at });
  const mods = record.structure.mods.reduce((product, id) => product * (svModOf(id)?.costMultiplier ?? 1), 1);
  const chassis = structureTons(record);
  const engine = engineTons(record);
  const engineType = svEngineOf(record.engine.type);
  let structural = 0;
  if (chassis === null) unpriced.push({ name: "the chassis", why: "its weight is not known" });
  else {
    const cost = SV_COST.chassisPerTon * chassis * mods;
    structural += cost;
    add("Chassis", cost, `${money(SV_COST.chassisPerTon)} x ${String(chassis)} t${mods === 1 ? "" : ` x ${String(tidy(mods))}`}`);
  }
  if (record.engine.type === "none") add("Engine", 0, "no engine");
  else if (engine === null || engineType === undefined) unpriced.push({ name: "the engine", why: engineType === undefined ? "the cost table has no such engine" : "its weight is not known" });
  else {
    const cost = SV_COST.enginePerTon * engine * engineType.costMultiplier;
    structural += cost;
    add("Engine", cost, `${money(SV_COST.enginePerTon)} x ${String(engine)} t x ${String(engineType.costMultiplier)}`);
  }
  const points = assignedArmor(record);
  const perPoint = SV_COST.armorPerPoint[record.armor.bar];
  if (points > 0) {
    if (perPoint === undefined || armorTons(record) === null) unpriced.push({ name: "the armor", why: "the cost table has no such armor" });
    else {
      structural += perPoint * points;
      add("Armor", perPoint * points, `${String(points)} points x ${money(perPoint)}`);
    }
  }
  // The multiplier is the STRUCTURAL Tech Rating's: the worked examples say so (TM printed p. 276, the Dixon "Structural Tech Rating of D"; p. 277, the Simca) and the table (p. 280) heads the line "Tech Rating", the chassis rating.
  const rating = SV_COST.structuralMultiplier[record.structure.rating as keyof typeof SV_COST.structuralMultiplier];
  if (rating !== undefined) {
    add(`Tech Rating ${record.structure.rating} multiplier on the structure`, structural * (rating - 1), `x ${String(rating)}`);
  }
  if (record.heatSinks.count > 0) add("Heat sinks", SV_COST.heatSinkEach * record.heatSinks.count, `${money(SV_COST.heatSinkEach)} x ${String(record.heatSinks.count)}`);
  const turret = turretTons(record, catalog);
  if (turret > 0) add("Turret", SV_COST.turretPerTon * turret, `${money(SV_COST.turretPerTon)} x ${String(turret)} t`);
  const pintle = pintleTons(record, catalog);
  if (pintle > 0) add("Pintle mounts", SV_COST.pintlePerTon * pintle, `${money(SV_COST.pintlePerTon)} x ${String(pintle)} t`);
  const amps = amplifierTons(record, catalog);
  if (amps > 0) add("Power amplifiers", SV_COST.amplifierPerTon * amps, `${money(SV_COST.amplifierPerTon)} x ${String(amps)} t`);
  // Equipment, one mount at a time, at the prices the 'Mech cost uses; fire control is a share of the cost of the weapons that need a gunner.
  let weaponCost = 0;
  for (const m of record.mounts) {
    const facts = itemFacts(m, record, catalog);
    const row = facts.row;
    if (facts.ammo) continue; // ammunition is bought to reload; the book's unit cost has none (the Dixon's 257,000)
    if (row === undefined) {
      unpriced.push({ name: m.name || "an unnamed item", why: "not in our equipment table" });
      continue;
    }
    const found = priceOf(row);
    if (!found) {
      unpriced.push({ name: row.name, why: "the cost tables print no price for it" });
      continue;
    }
    const at = found.cite;
    const each = found.price;
    const one =
      typeof each === "number" ? each
      : "perTon" in each ? perTonCost(each.perTon, facts.tons ?? 0)
      : "perWeight" in each ? each.perWeight * (facts.tons ?? 0) + (each.base ?? 0)
      : "perAmount" in each ? each.perAmount * (m.amount ?? row.amount?.min ?? 0)
      : undefined;
    if (one === undefined) {
      unpriced.push({ name: row.name, why: "its price depends on figures we do not carry for a Support Vehicle" });
      continue;
    }
    const cost = one * facts.qty;
    add(facts.qty > 1 ? `${row.name} x ${String(facts.qty)}` : row.name, cost, money(one) + (facts.qty > 1 ? ` x ${String(facts.qty)}` : ""), at);
    if (needsGunner(facts)) weaponCost += cost;
  }
  if (record.fireControl !== "none" && weaponCost > 0) add(`${record.fireControl === "basic" ? "Basic" : "Advanced"} fire control`, weaponCost * SV_COST.fireControl[record.fireControl], `${String(SV_COST.fireControl[record.fireControl] * 100)} percent of ${money(weaponCost)}`, { book: "TechManual", page: 293 });
  const omni = record.structure.mods.includes("omni");
  const divisor = svMotiveOf(record.motive)?.costDivisor ?? 100;
  const multiplier = (omni ? SV_COST.omniFactor : 1) * (1 + record.tons / divisor);
  const subtotal = lines.reduce((sum, l) => sum + l.cost, 0);
  const total = roundUpCents(subtotal * multiplier);
  lines.push({ label: "Final cost multiplier", cost: 0, how: `${omni ? "1.25 x " : ""}(1 + ${String(record.tons)} / ${money(divisor)})`, cite: SV_PAGES.finalCost });
  return { total, lines, multiplier, unpriced };
}
