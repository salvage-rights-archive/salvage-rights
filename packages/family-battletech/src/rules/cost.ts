// The C-Bill cost of a BattleMech (TechManual, Basic Cost Calculations, printed pp.274-285). A pure function over the record
// and the catalog: nothing here throws on a record it does not understand. A part or item the cost tables do not print a
// price for is left out of the total and listed in `unpriced`; a price the book does not print for a tech base but which we
// took from the Inner Sphere entry is listed in `notes`. The figures are in data/cost.ts.
import type { Cite, Checked } from "../data/chassis";
import {
  ACTUATOR_COST,
  ARMOR_COST,
  COCKPIT_COST,
  CONFIGURATION_COST,
  ENGINE_COST,
  EQUIPMENT_COST,
  FINAL_COST,
  GYRO_COST,
  HEAT_SINK_COST,
  INDUSTRIAL_COST,
  JUMP_JET_COST,
  LIFE_SUPPORT_COST,
  MASC_COST,
  MUSCULATURE_COST,
  NON_FUSION_ENGINES,
  RETRACTABLE_BLADE_COST,
  ROUNDING,
  SENSORS_COST,
  STRUCTURE_COST,
} from "../data/cost";
import type { Price } from "../data/cost";
import type { Catalog, EquipmentRow } from "./catalog";
import { armsOf, configurationOf, industrialRulesOf } from "./mech";
import type { LocationCode, MechRecord, Mount } from "./mech";
import { equipmentItems, mascOf, own, stemOf, tsmOf, TSM_ROWS, weightLine } from "./walk";

export interface CostLine {
  label: string;
  /** C-bills, not rounded. */
  cost: number;
  /** How it was worked out, in numbers: "5,000 x 200 x 25 / 75". */
  how: string;
  cite: Cite;
  checked: Checked;
}
export interface Unpriced {
  /** The catalog row id, or null for a part of the chassis or an item the catalog does not know. */
  id: string | null;
  name: string;
  why: string;
}
export interface UnitCost {
  /** Final cost rounded up to the nearest .01 C-bill, as the book (errata v8.0, p.274) says; of the priced parts only when `unpriced` is not empty. */
  total: number;
  /** Structural lines, equipment lines, then the conversion cost of a Land-Air 'Mech, in the order they are added. */
  lines: CostLine[];
  structural: number;
  equipment: number;
  /** The Land-Air 'Mech conversion cost added before the final multiplier; 0 for any other body. */
  conversion: number;
  /** The Omni conversion factor times (1 + tons / 100), applied to the sum of the lines. */
  multiplier: number;
  unpriced: Unpriced[];
  notes: string[];
}
export interface CostOptions {
  /** True multiplies the cost by 1.25 (printed p.285). Absent, the record says: a resolved OmniMech configuration (or the base) has it, any other 'Mech does not. */
  omni?: boolean;
}

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------
/** Round up to a whole 1/100, ignoring float noise (a value like 2229479.1666 becomes 2229479.17). */
export function roundUpCents(x: number): number {
  const per = 1 / ROUNDING.cents;
  return Math.ceil(Math.round(x * per * 1e6) / 1e6) / per;
}
const money = (x: number) => String(Math.round(x * 1000) / 1000).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const LIMBS: { arms: string[]; legs: string[] } = {
  arms: ["LA", "RA"],
  legs: ["LL", "RL", "CL", "FLL", "FRL", "RLL", "RRL"],
};

/** The price of a catalog row: its own id first, then its id without the tech base ending. */
function priceOf(row: EquipmentRow): { price: Price; cite: Cite; checked: Checked } | undefined {
  for (const key of [row.id, stemOf(row.id)]) {
    for (const group of EQUIPMENT_COST) {
      const price = own(group.prices, key);
      if (price !== undefined) return { price, cite: group.cite, checked: group.checked };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// Formulas for the variable-cost items, one per rule the book states as a formula. Each takes only numbers.
// ---------------------------------------------------------------------------------------------------------------
/** Engine (p.278): the type's figure times the rating times the 'Mech's tonnage, over 75. */
export const engineCost = (perRating: number, rating: number, tons: number) => (perRating * rating * tons) / ENGINE_COST.divisor;
/** Jump jets (p.278): the type's figure times the square of the number of jets times the 'Mech's tonnage. */
export const jumpJetCost = (perJetSquared: number, jets: number, tons: number) => perJetSquared * jets * jets * tons;
/** MASC (p.278): 1,000 times the engine rating times the MASC's tons. */
export const mascCost = (rating: number, mascTons: number) => MASC_COST.perRatingTon * rating * mascTons;
/** Heat sinks (p.278): singles cost for those beyond the engine's free ten; doubles for every one. */
export const heatSinkCost = (each: number, free: number, count: number) => each * Math.max(0, count - free);
/** An item priced by the ton (targeting computer, hatchet, sword): the whole tons of its weight, rounded up (p.292 notes). */
export const perTonCost = (perTon: number, tons: number) => perTon * Math.ceil(tons);
const ceilHalf = (x: number) => Math.ceil(Math.round(x * 2 * 1e6) / 1e6) / 2;
/** Retractable blade (p.293): the mechanism plus a price per ton for the blade, whose weight is the 'Mech's tonnage over 20 rounded up to a half ton, then to a whole ton. */
export const retractableBladeCost = (tons: number) => RETRACTABLE_BLADE_COST.mechanism + RETRACTABLE_BLADE_COST.perTon * Math.ceil(ceilHalf(tons / 20));
/** The Land-Air 'Mech conversion equipment (IO:AE p.181): a share of the structural, weapon and equipment cost, added before the final multiplier. */
export const conversionCost = (share: number, structuralAndEquipment: number) => share * structuralAndEquipment;
/** The final multiplier (p.285): the Omni factor times (1 + tons / 100). */
export const finalMultiplier = (tons: number, omni: boolean, tonsDivisor = FINAL_COST.tonsDivisor) => (omni ? FINAL_COST.omniFactor : 1) * (1 + tons / tonsDivisor);

// ---------------------------------------------------------------------------------------------------------------
// The cost of a 'Mech
// ---------------------------------------------------------------------------------------------------------------
export function unitCost(record: MechRecord, catalog: Catalog, options: CostOptions = {}): UnitCost {
  const { chassis, tons } = record;
  const structural: CostLine[] = [];
  const equipment: CostLine[] = [];
  const unpriced: Unpriced[] = [];
  const notes: string[] = [];
  const add = (into: CostLine[], label: string, cost: number, how: string, source: { cite: Cite; checked: Checked }) =>
    into.push({ label, cost, how, cite: source.cite, checked: source.checked });
  const skip = (name: string, why: string, id: string | null = null) => unpriced.push({ id, name, why });
  const assume = (label: string) => notes.push(`${label}: the book prints one price for both tech bases and none for this Clan part, so the Inner Sphere price is used.`);
  const tonsKnown = Number.isFinite(tons) && tons > 0;
  const industrial = industrialRulesOf(record) !== undefined;
  const config = configurationOf(record.configuration);
  const special = own(CONFIGURATION_COST, record.configuration);
  const { items, unknown } = equipmentItems(record, catalog);

  // Cockpit, life support, sensors, musculature
  const cockpit = own(COCKPIT_COST.rows, chassis.cockpit);
  if (cockpit) add(structural, `Cockpit (${chassis.cockpit})`, cockpit.cost, money(cockpit.cost), { cite: cockpit.cite ?? COCKPIT_COST.cite, checked: COCKPIT_COST.checked });
  else skip(`Cockpit "${chassis.cockpit}"`, "the cost table has no such cockpit");
  add(structural, "Life support", LIFE_SUPPORT_COST.cost, money(LIFE_SUPPORT_COST.cost), LIFE_SUPPORT_COST);
  if (tonsKnown) {
    add(structural, "Sensors", SENSORS_COST.perTon * tons, `${money(SENSORS_COST.perTon)} x ${tons}`, SENSORS_COST);
    const tsm = tsmOf(record, items);
    const key = tsm === "prototype" ? "prototype-tsm" : tsm ? "tsm" : own(MUSCULATURE_COST.rows, chassis.myomer) ? chassis.myomer : "standard";
    const musculature = MUSCULATURE_COST.rows[key];
    if (musculature) add(structural, key === "standard" ? "Musculature" : `Musculature (${key})`, musculature.perTon * tons, `${money(musculature.perTon)} x ${tons}`, { cite: musculature.cite ?? MUSCULATURE_COST.cite, checked: MUSCULATURE_COST.checked });
  } else skip("Sensors and musculature", "the tonnage is not a positive number");

  // Internal structure (a tripod's costs more)
  const structure = own(STRUCTURE_COST.rows, chassis.structure);
  if (structure && tonsKnown) {
    const factor = special?.structureFactor ?? 1;
    if (structure.assumed) assume(`Internal structure "${chassis.structure}"`);
    const source = factor === 1 ? { cite: structure.cite ?? STRUCTURE_COST.cite, checked: STRUCTURE_COST.checked } : { cite: special?.cite ?? STRUCTURE_COST.cite, checked: special?.checked ?? STRUCTURE_COST.checked };
    add(structural, `Internal structure (${chassis.structure})`, structure.perTon * tons * factor, `${money(structure.perTon)} x ${tons}${factor === 1 ? "" : ` x ${factor}`}`, source);
  } else if (tonsKnown) skip(`Internal structure "${chassis.structure}"`, "the cost table has no such structure");

  // Actuators: the arms and legs the configuration has (a quad's legs carry a full set each, as the book's quad example prices them)
  if (config && tonsKnown) {
    const limbs = Object.keys(config.size) as LocationCode[];
    const A = ACTUATOR_COST.perTon;
    let actuators = 0;
    const parts: string[] = [];
    for (const loc of limbs) {
      if (LIMBS.arms.includes(loc)) {
        const arm = armsOf(record)?.[loc as "LA" | "RA"] ?? { lowerArm: true, hand: true };
        const each = A.upperArm + (arm.lowerArm ? A.lowerArm : 0) + (arm.hand ? A.hand : 0);
        actuators += each * tons;
        parts.push(`${loc} ${each}`);
      } else if (LIMBS.legs.includes(loc)) {
        const each = A.upperLeg + A.lowerLeg + A.foot;
        actuators += each * tons;
        parts.push(`${loc} ${each}`);
      }
    }
    add(structural, "Actuators", actuators, `(${parts.join(" + ")}) x ${tons}`, ACTUATOR_COST);
    if (record.configuration === "tripod") notes.push("Tripod actuators: the book prints no list for the center leg; it is priced with the same upper leg, lower leg and foot actuators as the other two.");
  } else if (tonsKnown) skip("Actuators", `no limb layout for the "${record.configuration}" configuration`);

  // Engine
  const engine = own(ENGINE_COST.rows, chassis.engine.type);
  if (engine && tonsKnown && Number.isFinite(chassis.engine.rating)) {
    if (engine.assumed) assume(`Engine "${chassis.engine.type}"`);
    add(structural, `Engine (${chassis.engine.type} ${chassis.engine.rating})`, engineCost(engine.perRating, chassis.engine.rating, tons), `${money(engine.perRating)} x ${chassis.engine.rating} x ${tons} / ${ENGINE_COST.divisor}`, { cite: engine.cite ?? ENGINE_COST.cite, checked: ENGINE_COST.checked });
  } else skip(`Engine "${chassis.engine.type}" ${chassis.engine.rating}`, engine ? "the tonnage or rating is not a number" : "the cost table has no such engine");

  // Gyro: its cost is per ton of gyro, and the weight rules already work that out
  const gyro = own(GYRO_COST.rows, chassis.gyro);
  const gyroTons = weightLine(record, catalog, "Gyro");
  if (gyro && gyroTons !== null) add(structural, `Gyro (${chassis.gyro})`, gyro.perGyroTon * gyroTons, `${money(gyro.perGyroTon)} x ${gyroTons}`, GYRO_COST);
  else skip(`Gyro "${chassis.gyro}"`, gyro ? "its weight could not be worked out" : "the cost table has no such gyro");

  // Heat sinks: the count is the chassis's; the placed heat sink mounts only say where they go
  const sinks = own(HEAT_SINK_COST.rows, chassis.heatSinks.type);
  if (sinks && Number.isFinite(chassis.heatSinks.count)) {
    if (sinks.assumed) assume(`Heat sinks "${chassis.heatSinks.type}"`);
    // With a non-fusion engine there are no free sinks: every one is paid for (printed p.278).
    const free = NON_FUSION_ENGINES.includes(chassis.engine.type) ? 0 : sinks.free;
    const paid = Math.max(0, chassis.heatSinks.count - free);
    add(structural, `Heat sinks (${chassis.heatSinks.type}, ${paid} paid for)`, heatSinkCost(sinks.each, free, chassis.heatSinks.count), `${money(sinks.each)} x ${paid}`, HEAT_SINK_COST);
  } else skip(`Heat sinks "${chassis.heatSinks.type}"`, "the cost table has no such heat sink");
  // The second kind of a mixed record is priced at its own figure, and none of its sinks come free with the engine.
  for (const group of chassis.heatSinks.extra ?? []) {
    const row = own(HEAT_SINK_COST.rows, group.type);
    if (row && Number.isFinite(group.count)) {
      if (row.assumed) assume(`Heat sinks "${group.type}"`);
      add(structural, `Heat sinks (${group.type}, ${group.count} paid for)`, row.each * group.count, `${money(row.each)} x ${group.count}`, HEAT_SINK_COST);
    } else skip(`Heat sinks "${group.type}"`, "the cost table has no such heat sink");
  }

  // Armor
  const armor = own(ARMOR_COST.rows, chassis.armorType);
  const armorTons = weightLine(record, catalog, "Armor");
  if (armor && armorTons !== null) add(structural, `Armor (${chassis.armorType}, ${armorTons} tons)`, armor.perTon * armorTons, `${money(armor.perTon)} x ${armorTons}`, { cite: armor.cite ?? ARMOR_COST.cite, checked: ARMOR_COST.checked });
  else skip(`Armor "${chassis.armorType}"`, armor ? "its weight could not be worked out" : "the cost table has no such armor");

  // Equipment: jump jets are priced together (the count is squared); everything else one mount at a time
  // (Structure and armor slots are priced with the structure or armor, so the walk leaves them out.)
  for (const mount of unknown) {
    skip(mount.name, mount.equipmentId === null ? "not in our equipment table" : `the equipment table has no row "${mount.equipmentId}"`, mount.equipmentId);
  }
  // MASC is priced by its weight, which only a MASC mount carries; a chassis that names MASC without one cannot be priced for it.
  const masc = mascOf(record, items);
  if (masc.named && masc.mounts.length === 0) skip(`Myomer "${chassis.myomer}"`, "MASC is named but not mounted, so its weight and price are not known");
  const jets = new Map<string, Mount[]>();
  const pricedOnce = new Set<string>();
  for (const { mount, row, tons: mountTons } of items) {
    // A fixed-count item (partial wing, talons, blue shield) is bought once, at the weight of all its mounts together.
    if (row.splitWeight && !TSM_ROWS.includes(row.id)) {
      if (pricedOnce.has(row.id)) continue;
      pricedOnce.add(row.id);
    }
    const itemTons = row.splitWeight && mountTons !== undefined ? items.filter((i) => i.row.id === row.id).reduce((sum, i) => sum + (i.tons ?? 0), 0) : mountTons;
    if (row.kind === "heat-sink") continue; // paid for by count, above
    if (TSM_ROWS.includes(row.id) || row.id === "super-cooled-myomer-is" || row.id === "industrial-tsm-is") continue; // the myomer slots are the musculature priced above
    // An IndustrialMech's environmental sealing and tracks have prices by rule (printed p.278): 225 x tonnage, and 500 x engine rating x tonnage over 75.
    if (stemOf(row.id) === "environmental-sealing") {
      if (!tonsKnown) skip(mount.name, "the tonnage is not a positive number", row.id);
      else add(structural, "Environmental sealing", INDUSTRIAL_COST.sealingPerTon * tons, `${money(INDUSTRIAL_COST.sealingPerTon)} x ${tons}`, INDUSTRIAL_COST);
      continue;
    }
    if (stemOf(row.id) === "tracks") {
      if (!tonsKnown || !Number.isFinite(chassis.engine.rating)) skip(mount.name, "the tonnage or engine rating is not a number", row.id);
      else add(equipment, "Tracks", engineCost(INDUSTRIAL_COST.tracksPerRating, chassis.engine.rating, tons), `${money(INDUSTRIAL_COST.tracksPerRating)} x ${chassis.engine.rating} x ${tons} / ${ENGINE_COST.divisor}`, INDUSTRIAL_COST);
      continue;
    }
    if (row.kind === "ammunition") continue; // ammunition is not bought for a unit's cost (p.282)
    if (stemOf(row.id) === "umu") {
      jets.set("umu", [...(jets.get("umu") ?? []), mount]);
      continue;
    }
    if (row.kind === "jump-jet") {
      const kind = row.id.startsWith("improved-") ? "improved" : stemOf(row.id) === "jump-jet" ? "standard" : undefined;
      if (kind === undefined) skip(mount.name, "no jump jet price for this kind in the cost tables", row.id);
      else jets.set(kind, [...(jets.get(kind) ?? []), mount]);
      continue;
    }
    if (stemOf(row.id) === "masc") {
      if (itemTons === undefined || !Number.isFinite(chassis.engine.rating)) skip(mount.name, "its weight or the engine rating is not known", row.id);
      else add(equipment, mount.name, mascCost(chassis.engine.rating, itemTons), `${money(MASC_COST.perRatingTon)} x ${chassis.engine.rating} x ${itemTons}`, MASC_COST);
      continue;
    }
    if (stemOf(row.id) === "retractable-blade") {
      if (!tonsKnown) skip(mount.name, "the tonnage is not a positive number", row.id);
      else {
        const bladeTons = Math.ceil(ceilHalf(tons / 20));
        add(equipment, mount.name, retractableBladeCost(tons), `${money(RETRACTABLE_BLADE_COST.mechanism)} + ${money(RETRACTABLE_BLADE_COST.perTon)} x ${bladeTons} tons`, RETRACTABLE_BLADE_COST);
      }
      continue;
    }
    const found = priceOf(row);
    if (!found) {
      skip(mount.name, "the cost tables print no price for it", row.id);
      continue;
    }
    if (typeof found.price === "number") add(equipment, mount.name, found.price, money(found.price), found);
    else if ("perAmount" in found.price) {
      const meters = mount.amount ?? row.amount?.min ?? 0;
      add(equipment, mount.name, found.price.perAmount * meters, `${money(found.price.perAmount)} x ${meters} ${row.amount?.unit ?? ""}`.trim(), found);
    } else if ("perRating" in found.price) add(equipment, mount.name, found.price.perRating * (Number.isFinite(chassis.engine.rating) ? chassis.engine.rating : 0), `${money(found.price.perRating)} x ${chassis.engine.rating}`, found);
    else if ("perUnitTon" in found.price) add(equipment, mount.name, found.price.perUnitTon * (tonsKnown ? tons : 0), `${money(found.price.perUnitTon)} x ${tons}`, found);
    else if ("perWeight" in found.price) {
      if (itemTons === undefined) skip(mount.name, "its weight could not be worked out", row.id);
      else add(equipment, mount.name, found.price.perWeight * itemTons + (found.price.base ?? 0), `${found.price.base ? `${money(found.price.base)} + ` : ""}${money(found.price.perWeight)} x ${itemTons} tons`, found);
    } else {
      if (itemTons === undefined) skip(mount.name, "its weight could not be worked out", row.id);
      else add(equipment, mount.name, perTonCost(found.price.perTon, itemTons), `${money(found.price.perTon)} x ${Math.ceil(itemTons)} tons`, found);
    }
  }
  const amplifiers = weightLine(record, catalog, "Power amplifiers");
  if (amplifiers !== null && amplifiers > 0) add(equipment, "Power amplifiers", INDUSTRIAL_COST.amplifierPerTon * amplifiers, `${money(INDUSTRIAL_COST.amplifierPerTon)} x ${amplifiers}`, INDUSTRIAL_COST);
  for (const [kind, group] of jets) {
    const row = own(JUMP_JET_COST.rows, kind);
    if (row && tonsKnown) add(equipment, `Jump jets (${kind}, ${group.length})`, jumpJetCost(row.perJetSquared, group.length, tons), `${row.perJetSquared} x ${group.length}^2 x ${tons}`, JUMP_JET_COST);
  }

  // Land-Air 'Mech conversion equipment, added before the final multiplier
  const sum = (lines: CostLine[]) => lines.reduce((total, l) => total + l.cost, 0);
  const structuralTotal = sum(structural);
  const equipmentTotal = sum(equipment);
  const conversion = special?.conversion === undefined ? 0 : conversionCost(special.conversion, structuralTotal + equipmentTotal);
  const conversionLines: CostLine[] =
    special?.conversion === undefined
      ? []
      : [{ label: "Conversion equipment", cost: conversion, how: `${special.conversion} x ${money(structuralTotal + equipmentTotal)}`, cite: special.cite, checked: special.checked }];

  // An IndustrialMech: the tonnage is divided by 400 and there is no Omni factor (printed p.285).
  const multiplier = tonsKnown ? (industrial ? finalMultiplier(tons, false, INDUSTRIAL_COST.tonsDivisor) : finalMultiplier(tons, options.omni ?? record.omni !== undefined)) : 1;
  if (!tonsKnown) skip("Final multiplier", "the tonnage is not a positive number");
  const total = roundUpCents((structuralTotal + equipmentTotal + conversion) * multiplier);
  return {
    total,
    lines: [...structural, ...equipment, ...conversionLines],
    structural: structuralTotal,
    equipment: equipmentTotal,
    conversion,
    multiplier,
    unpriced,
    notes,
  };
}
