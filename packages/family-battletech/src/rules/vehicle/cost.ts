// The C-bill cost of a Combat Vehicle: TechManual's Combat Vehicle Costs table (printed p. 279) for the structure, engine, heat sinks, armor, turret
// and power amplifiers, the equipment prices the 'Mech cost uses (data/cost.ts), and the Final Unit Cost Formulas Table (p. 285) for the tonnage
// multiplier. An item with no printed price is left out and listed in `unpriced`. Rounded up to a hundredth of a C-bill, as errata v8.0 says of p. 274.
import { COST_FORMULA_CITE, VEHICLE_COST } from "../../data/vehicle";
import type { BookPage } from "../../data/vehicle";
import { perTonCost, priceOf, roundUpCents } from "../cost";
import type { Catalog } from "../catalog";
import { amplifierTons, engineRating, freeHeatSinks, isFusion, itemFacts, liftTons, motiveRowOf, rowOf, structureTons, controlTons, turretTons } from "./vehicle";
import type { VehicleRecord } from "./vehicle";
import { own } from "../walk";

export interface VehicleCostLine {
  label: string;
  cost: number;
  how: string;
  cite: BookPage;
}
export interface VehicleCost {
  total: number;
  lines: VehicleCostLine[];
  /** The Omni factor (1.25 or 1) times (1 + tons / the motive type's divisor). */
  multiplier: number;
  unpriced: { name: string; why: string }[];
}

const money = (x: number): string => String(Math.round(x * 1000) / 1000).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function vehicleCost(record: VehicleRecord, catalog: Catalog, options: { omni?: boolean } = {}): VehicleCost {
  const lines: VehicleCostLine[] = [];
  const unpriced: VehicleCost["unpriced"] = [];
  const cite = VEHICLE_COST.cite;
  const add = (label: string, cost: number, how: string, at: BookPage = cite) => lines.push({ label, cost, how, cite: at });
  const motive = motiveRowOf(record);
  const structure = structureTons(record);
  add("Internal structure", VEHICLE_COST.structurePerTon * structure, `${money(VEHICLE_COST.structurePerTon)} x ${String(structure)} t`);
  add("Control systems", VEHICLE_COST.controlsPerTon * controlTons(record), `${money(VEHICLE_COST.controlsPerTon)} x ${String(controlTons(record))} t`);
  const lift = liftTons(record);
  if (lift > 0) {
    const rotor = motive?.lift === "rotor";
    const each = rotor ? VEHICLE_COST.rotorPerTon : VEHICLE_COST.liftPerTon;
    add(rotor ? "Rotors" : motive?.lift === "dive" ? "Dive equipment" : "Lift equipment", each * lift, `${money(each)} x ${String(lift)} t`);
  }
  const rating = engineRating(record);
  const perRating = own(VEHICLE_COST.engine, record.engine.type) ? VEHICLE_COST.engine[record.engine.type] : undefined;
  if (rating === null || perRating === undefined) unpriced.push({ name: "the engine", why: perRating === undefined ? "the cost table has no such engine" : "its rating is not known" });
  else add("Engine", (perRating * rating * record.tons) / VEHICLE_COST.engineDivisor, `${money(perRating)} x ${String(rating)} x ${String(record.tons)} / ${String(VEHICLE_COST.engineDivisor)}`);
  // Heat sinks: a fusion engine's first ten are free; with any other engine every sink is paid for.
  const paid = Math.max(0, record.heatSinks.count - (isFusion(record.engine.type) ? freeHeatSinks(record) : 0));
  if (paid > 0) add("Heat sinks", VEHICLE_COST.heatSinkEach * paid, `${money(VEHICLE_COST.heatSinkEach)} x ${String(paid)}`);
  const armorEach = own(VEHICLE_COST.armorPerTon, record.armor.type) ? VEHICLE_COST.armorPerTon[record.armor.type] : undefined;
  if (record.armor.tons > 0) {
    if (armorEach === undefined) unpriced.push({ name: `${record.armor.type} armor`, why: "the cost table has no such armor" });
    else add("Armor", armorEach * record.armor.tons, `${money(armorEach)} x ${String(record.armor.tons)} t`);
  }
  const turret = turretTons(record, catalog);
  if (turret > 0) add("Turret", VEHICLE_COST.turretPerTon * turret, `${money(VEHICLE_COST.turretPerTon)} x ${String(turret)} t`);
  const amps = amplifierTons(record, catalog);
  if (amps > 0) add("Power amplifiers", VEHICLE_COST.amplifierPerTon * amps, `${money(VEHICLE_COST.amplifierPerTon)} x ${String(amps)} t`);
  // Equipment, one mount at a time, at the prices the 'Mech cost uses.
  for (const m of record.mounts) {
    const row = rowOf(m, record, catalog);
    if (row === undefined) {
      unpriced.push({ name: m.name || "an unnamed item", why: "not in our equipment table" });
      continue;
    }
    const found = priceOf(row);
    const facts = itemFacts(m, record, catalog);
    if (!found) {
      unpriced.push({ name: row.name, why: "the cost tables print no price for it" });
      continue;
    }
    const at = found.cite;
    if (typeof found.price === "number") add(row.name, found.price, money(found.price), at);
    else if ("perTon" in found.price) add(row.name, perTonCost(found.price.perTon, facts.tons ?? 0), `${money(found.price.perTon)} x ${String(Math.ceil(facts.tons ?? 0))} t`, at);
    else if ("perWeight" in found.price) add(row.name, found.price.perWeight * (facts.tons ?? 0) + (found.price.base ?? 0), `${money(found.price.perWeight)} x ${String(facts.tons ?? 0)} t`, at);
    else if ("perUnitTon" in found.price) add(row.name, found.price.perUnitTon * record.tons, `${money(found.price.perUnitTon)} x ${String(record.tons)}`, at);
    else if ("perAmount" in found.price) add(row.name, found.price.perAmount * (m.amount ?? row.amount?.min ?? 0), `${money(found.price.perAmount)} x ${String(m.amount ?? row.amount?.min ?? 0)}`, at);
    else unpriced.push({ name: row.name, why: "its price depends on the 'Mech's engine" });
  }
  const omni = options.omni ?? record.omni !== undefined;
  const multiplier = (omni ? VEHICLE_COST.omniFactor : 1) * (1 + record.tons / (motive?.costDivisor ?? 100));
  const total = roundUpCents(lines.reduce((sum, l) => sum + l.cost, 0) * multiplier);
  lines.push({ label: "Final cost multiplier", cost: 0, how: `${omni ? "1.25 x " : ""}(1 + ${String(record.tons)} / ${String(motive?.costDivisor ?? 100)})`, cite: COST_FORMULA_CITE });
  return { total, lines, multiplier, unpriced };
}
