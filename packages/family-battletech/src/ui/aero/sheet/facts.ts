// What a fighter's record sheet prints, worked out once from the record: the data block, the weapons and equipment lines, the armor of each
// area with its Damage Threshold, the heat sinks. Pure; nothing here throws on a record it does not understand (a figure we cannot work out
// is an empty string, never a made-up one).
import { aeroLocationName, armorTypeAt, artemisLinked, fighterHeat, fighterPatchworkActive, fighterSI, fuelPoints, maxThrust } from "../../../rules/aero";
import type { AeroMount, AeroRecord } from "../../../rules/aero";
import { aeroOfficialState } from "../../../rules/aero-checks";
import { aeroArtemisAttack, aeroCatalogFigures, aeroMmlSrm, aeroToHit, aeroWeaponFigures } from "../../../data/aero-weapons";
import type { AeroWeaponFigures } from "../../../data/aero-weapons";
import { DEFAULT_AERO_EDITION, aeroEditionName, fighterPatchworkTypes } from "../../../data/aero";
import { SHEET_HEAT_SINKS, TECH_BASE_NAMES } from "../../../data/sheet";
import type { SheetProfile } from "../../../data/aero-sheet";
import type { Catalog } from "../../../rules/catalog";
import { officialLabel } from "../../../rules/official";
import { aeroBattleValue, aeroCost } from "../../../rules/aero-bv";

/** Weapon and equipment lines printed before the rest wait for the text copy (the block has room for this many). */
export const MAX_LINES_DRAWN = 14;

/** How many inventory lines the sheet's block has room for: the current blank prints fourteen, the AeroTech 2 sheets nine (as the flagged page does). */
export const linesFor = (profile: Pick<SheetProfile, "layout">): number => (profile.layout === "current" ? MAX_LINES_DRAWN : 9);

export interface WeaponLine {
  qty: number;
  name: string;
  /** The arc, with "aft" where a wing weapon fires to the rear. */
  loc: string;
  heat: string;
  /** Attack value at short, medium, long and extreme range (the flagged sheets' columns); empty at a range the weapon does not reach. */
  av: [string, string, string, string];
  /** AeroTech (1986): damage, and the hex ranges (minimum, short, medium, long). */
  damage: string;
  hexes: string;
  /** The To-Hit Modifier column of the weapons table (Total Warfare pp. 303-304): empty where it is 0. */
  toHit: string;
}

export interface ArmorArea {
  code: string;
  name: string;
  points: number;
  threshold: number;
  /** The armor type of this area, set only when armor is patchwork (each area then says its own). */
  type?: string;
}

export interface FighterFacts {
  title: string;
  typeLabel: string;
  tons: string;
  techBase: string;
  edition: string;
  safe: string;
  max: string;
  si: string;
  fuel: string;
  armor: ArmorArea[];
  /** Armor on locations the sheet has no area for: kept in the text copy. */
  strayArmor: { code: string; points: number }[];
  armorTotal: number;
  weapons: WeaponLine[];
  ammo: string[];
  sinks: { count: number; total: number; capacity: number; type: string; line: string };
  official: { badge: string; detail: string; line: string };
  /** Battle Value and cost as the sheet prints them: empty where the edition prints none or an item has no figure, so a total that is only
   * "at least" never goes on paper. */
  bv: string;
  cost: string;
}

/** The AeroTech 2: Revised Edition blank has a BV and a Cost field beside its stores; the other fighter blanks have none. */
export const printsValue = (profile: Pick<SheetProfile, "layout" | "velocity">): boolean => profile.layout === "at2" && profile.velocity === "across";
const whole = (x: number) => x.toLocaleString("en-US");

const BANDS = ["Short", "Medium", "Long", "Extreme"] as const;
const text = (n: number | string | undefined): string => (n === undefined ? "" : String(n));

const isAmmo = (mount: AeroMount, catalog: Catalog): boolean => (mount.equipmentId !== null && catalog.byId(mount.equipmentId)?.kind === "ammunition") || (mount.equipmentId ?? "").startsWith("ammo-");

/** The weapon's figures under the record's edition; the catalog's own where the edition's table does not list it. */
const figuresOf = (mount: AeroMount, record: AeroRecord, catalog: Catalog): AeroWeaponFigures | undefined =>
  mount.equipmentId === null ? undefined : (aeroWeaponFigures(catalog, mount.equipmentId, record.editionId) ?? aeroCatalogFigures(catalog, mount.equipmentId));

export interface LineOptions {
  /** The launcher is linked to an Artemis IV FCS in its arc: the figure after the slash of the Aero Attack Value column. */
  linked?: boolean;
  /** A multi-mode launcher line for its SRM mode (range Short). */
  srm?: boolean;
}

export function lineOf(mount: AeroMount, record: AeroRecord, catalog: Catalog, qty: number, options: LineOptions = {}): WeaponLine {
  const f = figuresOf(mount, record, catalog);
  const id = mount.equipmentId ?? "";
  const current = record.editionId === DEFAULT_AERO_EDITION;
  const srm = current && options.srm === true ? aeroMmlSrm(id) : undefined;
  const linkedLrm = current && options.linked === true && srm === undefined ? aeroArtemisAttack(id) : undefined;
  const reach = srm !== undefined ? 1 : f?.maxRange === undefined ? 0 : BANDS.indexOf(f.maxRange) + 1;
  const attack = srm !== undefined ? String(options.linked === true ? srm.linked : srm.attack) : linkedLrm !== undefined ? String(linkedLrm) : f?.attack === undefined ? "" : String(f.attack);
  // The one attack value stands in every bracket up to the weapon's longest range class (the first bracket when the class is not known).
  const covered = reach > 0 ? reach : 1;
  // A value that changes by range ("10/8") gives one figure to each bracket, in order.
  const steps = attack.split("/");
  const av = [0, 1, 2, 3].map((band) => (steps.length > 1 ? (steps[band] ?? "") : attack !== "" && band < covered ? attack : "")) as WeaponLine["av"];
  const hexes = f?.hexRange === undefined ? "" : f.hexRange.map((n) => String(n)).join("/");
  const hit = current && mount.equipmentId !== null ? aeroToHit(id) : 0;
  return { qty, name: srm === undefined ? mount.name : `${mount.name} (SRM mode)`, loc: `${mount.arc}${mount.aft === true ? " aft" : ""}`, heat: text(f?.heat), av, damage: attack, hexes, toHit: hit === 0 ? "" : hit > 0 ? `+${String(hit)}` : String(hit) };
}

/** One line per kind of weapon in an arc: two Medium Lasers in the nose are one line with a quantity of 2. */
export function weaponLines(record: AeroRecord, catalog: Catalog): WeaponLine[] {
  const linked = artemisLinked(record, catalog);
  const groups = new Map<string, { mount: AeroMount; qty: number; linked: boolean }>();
  for (const mount of record.mounts) {
    if (isAmmo(mount, catalog)) continue;
    const isLinked = linked.has(mount.id);
    const key = `${mount.equipmentId ?? mount.name}|${mount.arc}|${mount.aft === true ? "aft" : ""}|${mount.amount ?? ""}|${isLinked ? "linked" : ""}`;
    const group = groups.get(key);
    if (group) group.qty += 1;
    else groups.set(key, { mount, qty: 1, linked: isLinked });
  }
  return [...groups.values()].flatMap(({ mount, qty, linked: isLinked }) => [
    lineOf(mount, record, catalog, qty, { linked: isLinked }),
    // A multi-mode launcher also has its SRM mode line (current rules: the Total Warfare table prints one for each mode).
    ...(record.editionId === DEFAULT_AERO_EDITION && aeroMmlSrm(mount.equipmentId ?? "") !== undefined ? [lineOf(mount, record, catalog, qty, { linked: isLinked, srm: true })] : []),
  ]);
}

/** The ammunition the unit carries, one line per mount: the name, its tons and the shots they hold. */
export function ammoLines(record: AeroRecord, catalog: Catalog): string[] {
  return record.mounts.filter((m) => isAmmo(m, catalog)).map((m) => {
    const row = m.equipmentId === null ? undefined : catalog.byId(m.equipmentId);
    const tons = m.amount ?? 1;
    const perTon = row?.shotsPerTon ?? row?.shots;
    return `${m.name} (${m.arc}): ${String(tons)} t${perTon === undefined ? "" : `, ${String(Math.round(tons * perTon * 100) / 100)} shots`}`;
  });
}

export function fighterFacts(record: AeroRecord, catalog: Catalog, profile: SheetProfile): FighterFacts {
  const name = `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed unit";
  const heat = fighterHeat(record);
  const sinkType = SHEET_HEAT_SINKS[record.heatSinks.type]?.label ?? record.heatSinks.type;
  const patchwork = fighterPatchworkActive(record);
  const types = fighterPatchworkTypes(record.editionId);
  const armor: ArmorArea[] = profile.armor.map((code) => {
    const points = record.armor.points[code] ?? 0;
    const type = armorTypeAt(record, code);
    return { code, name: aeroLocationName(code), points, threshold: Math.ceil(points / 10), ...(patchwork ? { type: types.find((t) => t.id === type)?.name ?? type } : {}) };
  });
  const stray = Object.entries(record.armor.points).filter(([code, n]) => !profile.armor.includes(code) && n !== 0).map(([code, points]) => ({ code, points }));
  const mark = officialLabel(aeroOfficialState(record));
  const max = maxThrust(record);
  const si = fighterSI(record);
  const fuel = fuelPoints(record);
  const bv = aeroBattleValue(record, catalog);
  const cost = aeroCost(record, catalog);
  return {
    title: name,
    typeLabel: record.unitType === "conventional-fighter" ? "Conventional fighter" : "Aerospace fighter",
    tons: text(record.tons),
    techBase: TECH_BASE_NAMES[record.techBase] ?? record.techBase,
    edition: aeroEditionName(record.editionId),
    safe: text(record.thrust.safe),
    max: max === null ? "" : text(max),
    si: si === null ? "" : text(si),
    fuel: fuel === null ? "" : text(fuel),
    armor,
    strayArmor: stray,
    armorTotal: armor.reduce((sum, a) => sum + a.points, 0) + stray.reduce((sum, a) => sum + a.points, 0),
    weapons: weaponLines(record, catalog),
    ammo: ammoLines(record, catalog),
    sinks: { count: heat.total, total: heat.total, capacity: heat.capacity, type: sinkType, line: `${sinkType} heat sinks: ${String(heat.total)} (${String(heat.capacity)})` },
    official: { ...mark, line: mark.badge === "OFFICIAL" ? `OFFICIAL: ${mark.detail}` : mark.badge },
    bv: bv && bv.unvalued.length === 0 ? whole(bv.total) : "",
    cost: cost && cost.unpriced.length === 0 ? whole(cost.total) : "",
  };
}
