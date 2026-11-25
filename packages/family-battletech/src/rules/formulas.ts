// The formulas: the items whose weight or slots the books scale with the unit. A catalog row names one in its `tons` or
// `slots` (a string); `resolveFormula` evaluates it. Most are one line of the SCALED table: a share of the unit's tonnage
// (or of its engine's weight, or of a size the player chose), a rounding rule and optional extras, so a new ratio item is
// a table entry, not a function. The few that read other mounts or a printed band are plain functions. Pure; nothing throws.
import { engineTons } from "./mech";
import type { Catalog, EquipmentRow } from "./catalog";
import type { MechRecord, Mount } from "./mech";

export type Formula = (row: EquipmentRow, record: MechRecord, catalog: Catalog, mount?: Mount) => number;

type Rounding = "ceil" | "ceil-half" | "round";
/** value = of / divide (or of x times), rounded, plus `add`. `of` is what it scales with; `quad` replaces the divisor on a quad
 * ('Mech); `perAmount` multiplies by the size the player chose for the mount (Jump MP, tons), default 1. */
interface Scaled {
  of: "tons" | "engine";
  divide?: number;
  times?: number;
  quad?: number;
  round: Rounding;
  add?: number;
  perAmount?: true;
}
const ceilHalf = (x: number) => Math.ceil(x * 2 - 1e-9) / 2;
const ROUND: Record<Rounding, (x: number) => number> = { ceil: (x) => Math.ceil(x - 1e-9), "ceil-half": ceilHalf, round: Math.round };

function scaled(spec: Scaled): Formula {
  return (_row, record, _catalog, mount) => {
    const base = spec.of === "tons" ? record.tons : (engineTons(record.chassis.engine.type, record.chassis.engine.rating) ?? 0);
    const divisor = record.configuration === "quad" && spec.quad !== undefined ? spec.quad : spec.divide;
    const raw = divisor !== undefined ? base / divisor : base * (spec.times ?? 1);
    return ROUND[spec.round](raw * (spec.perAmount ? (mount?.amount ?? 1) : 1)) + (spec.add ?? 0);
  };
}

/** Weight-class bands, as the books print them: light 10-35, medium 40-55, heavy 60-75, assault 80 and over. */
const weightClass = (tons: number) => (tons <= 35 ? 1 : tons <= 55 ? 2 : tons <= 75 ? 3 : 4);

function directFireTons(record: MechRecord, catalog: Catalog): number {
  let total = 0;
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
    if (row?.directFire) total += catalog.factsOf(mount, record)?.tons ?? 0;
  }
  return total;
}

const jumpJet: Formula = (_row, record) => (record.tons <= 55 ? 0.5 : record.tons <= 85 ? 1 : 2);

const SCALED: Record<string, Scaled> = {
  // MASC (TechManual p. 52): 5 percent of the tonnage (Inner Sphere) or 4 percent (Clan), rounded normally; slots the same.
  "masc-is": { of: "tons", divide: 20, round: "round" },
  "masc-clan": { of: "tons", times: 0.04, round: "round" },
  // Hatchet (TM p. 220) and sword slots (p. 237); claws and talons (TO:AUE p. 100), lance and mace (p. 100): one ton and one slot
  // for every 15, 20 or 10 tons of the 'Mech, rounded up.
  "ceil-tons-15": { of: "tons", divide: 15, round: "ceil" },
  "ceil-tons-20": { of: "tons", divide: 20, round: "ceil" },
  "ceil-tons-10": { of: "tons", divide: 10, round: "ceil" },
  // Sword weight (TM p. 237); retractable blade (p. 237): the same plus half a ton for the mechanism, and one more slot.
  "sword-tons": { of: "tons", divide: 20, round: "ceil-half" },
  "blade-tons": { of: "tons", divide: 20, round: "ceil-half", add: 0.5 },
  "blade-slots": { of: "tons", divide: 20, round: "ceil", add: 1 },
  // Actuator Enhancement System (TO:AUE p. 90): tonnage over 35 (over 50 on a quad), up to the half ton, for each component.
  "aes-tons": { of: "tons", divide: 35, quad: 50, round: "ceil-half" },
  // Partial wing (p. 104): 7 percent of the tonnage (Inner Sphere) or 5 percent (Clan), up to the half ton, for the whole wing.
  "partial-wing-is": { of: "tons", times: 0.07, round: "ceil-half" },
  "partial-wing-clan": { of: "tons", times: 0.05, round: "ceil-half" },
  // Mechanical jump boosters (p. 104): 5 percent of the tonnage for every Jumping MP chosen, up to the half ton, for all legs.
  "jump-booster": { of: "tons", times: 0.05, round: "ceil-half", perAmount: true },
  // Tracks and environmental sealing (TechManual pp. 213, 249): a tenth of the unit, up to the half ton. Extended fuel tank (p. 244): a tenth of the engine.
  "tenth-tons": { of: "tons", divide: 10, round: "ceil-half" },
  "fuel-tank-tons": { of: "engine", divide: 10, round: "ceil-half" },
  // Booby trap (p. 108): a tenth of the 'Mech, up to the half ton.
  "booby-trap": { of: "tons", divide: 10, round: "ceil-half" },
  // Supercharger (p. 156): a tenth of the engine's weight, up to the half ton.
  supercharger: { of: "engine", divide: 10, round: "ceil-half" },
};

export const FORMULAS: Record<string, Formula> = {
  ...Object.fromEntries(Object.entries(SCALED).map(([name, spec]) => [name, scaled(spec)])),
  // Jump pack (TO:AUE p. 105): the tons the player chose.
  "chosen-tons": (row, _record, _catalog, mount) => mount?.amount ?? row.amount?.min ?? 0,
  // One slot for each ton of the chosen size or fraction of one (cargo, communications equipment and fuel tanks on a 'Mech, TM pp. 212, 239, 244).
  "ceil-amount": (row, _record, _catalog, mount) => Math.ceil(mount?.amount ?? row.amount?.min ?? 0),
  // Jump Jets table (TM p. 51): per jet, by 'Mech tonnage band 10-55, 60-85, 90-100.
  "jump-jet": jumpJet,
  // Improved jump jets (p. 51): twice the standard weight per jet (two slots, in the data).
  "improved-jump-jet": (row, record, catalog, mount) => 2 * jumpJet(row, record, catalog, mount),
  // Targeting computer (p. 238): the weight of the record's direct-fire weapons over 4 (Inner Sphere) or 5 (Clan), rounded up.
  "targeting-computer-is": (_row, record, catalog) => Math.ceil(directFireTons(record, catalog) / 4),
  "targeting-computer-clan": (_row, record, catalog) => Math.ceil(directFireTons(record, catalog) / 5),
  // A fuel tank takes a slot for each ton of its weight, or part of one (TechManual p. 244).
  "fuel-tank-slots": (row, record, catalog, mount) => Math.ceil(FORMULAS["fuel-tank-tons"]?.(row, record, catalog, mount) ?? 0),
  // AES slots (TO:AUE p. 90): one per weight class of the 'Mech.
  "aes-slots": (_row, record) => weightClass(record.tons),
};

/** The value of a formula for a mount; undefined when the name is not a formula. */
export function resolveFormula(name: string, row: EquipmentRow, record: MechRecord, catalog: Catalog, mount?: Mount): number | undefined {
  return Object.hasOwn(FORMULAS, name) ? FORMULAS[name]?.(row, record, catalog, mount) : undefined;
}
