// Battle Value and C-bill cost of an aerospace unit, edition by edition (figures in data/aero-bv.ts, data/bv.ts and data/cost.ts). AeroTech (1986)
// and BattleSpace print neither, so both functions give null there. Nothing here throws: an item no table values or prices is left out and listed,
// and the total then says "at least". Where the book leaves a choice to the table (two sides that tie), the breakdown notes the one we took.
import { AERO_BV_METHOD, AERO_BV_OVERLAYS, AERO_COST, AERO_PRICE_OVERLAYS, AT2_BV_RULES, TM_AERO_BV_RULES } from "../data/aero-bv";
import type { AeroBvMethod, AeroCostFigures } from "../data/aero-bv";
import { fighterPatchworkTypes, figureOf } from "../data/aero";
import { HEAT_MULTIPLIER } from "../data/bv";
import type { BvOptions } from "../data/bv";
import { ARMOR_COST, ENGINE_COST } from "../data/cost";
import { aeroCatalogFigures, aeroWeaponFigures } from "../data/aero-weapons";
import { armorTypeAt, craftCrew, capitalKind, engineRating, fighterHeat, fighterKind, fighterPatchworkActive, fighterSI, fighterTally, locationsOf, maxThrust, patchworkTonsAt, vessel } from "./aero";
import type { AeroMount, AeroRecord } from "./aero";
import { ammoBvEntryOf, bvEntryOf, speedFactor } from "./bv";
import type { Catalog, EquipmentRow } from "./catalog";
import { priceOf } from "./cost";
import { own, roundHalfUp, stemOf, tidy } from "./walk";

export interface AeroBvLine {
  label: string;
  value: number;
}
export interface AeroBvWeapon {
  mountId: string;
  name: string;
  arc: string;
  bv: number;
  heat: number;
  /** How it entered the weapon rating: "full", "half" (past heat efficiency), or an arc's share. */
  counted: string;
}
export interface AeroUnvalued {
  mountId: string;
  name: string;
  why: string;
}
export interface AeroBv {
  /** Final Battle Value, rounded (.5 up). */
  total: number;
  defensive: { lines: AeroBvLine[]; subtotal: number; modifier: number; rating: number };
  offensive: { weapons: AeroBvWeapon[]; lines: AeroBvLine[]; weaponRating: number; thrust: number; speedFactor: number; rating: number };
  /** AeroTech 2 books: the large-vessel divisor applied to the subtotal (1 for fighters). */
  divisor: number;
  /** Where the book leaves a choice to the table (a tie between two sides), the reading we took. */
  notes: string[];
  unvalued: AeroUnvalued[];
  /** The pages the method and its figures come from, as the panel shows them. */
  cite: string;
}

// ---- Item values ---------------------------------------------------------------------------------------------------------------

interface ItemBv {
  bv: number;
  ammoBv?: number;
  options: BvOptions;
}
const ARTEMIS = /\+artemis$/;
const isCapitalOrBomb = (row: EquipmentRow | undefined) => row !== undefined && (row.bayClass?.startsWith("Capital") === true || row.id.startsWith("bomb-"));

/** The overlay row of an edition for a catalog id, if any. */
function overlayOf(id: string, editionId: string): { bv: number | undefined; ammoBv: number | undefined } | undefined {
  for (const group of AERO_BV_OVERLAYS) {
    if (!group.editions.includes(editionId)) continue;
    const row = Object.hasOwn(group.rows, id) ? group.rows[id] : undefined;
    if (row) return { bv: row[0], ammoBv: row[1] };
  }
  return undefined;
}

/** A weapon's or item's BV in an edition: the overlay where the edition's book prints its own, else data/bv.ts. AeroTech 2 takes its standard
 * weapons from the BattleTech Master Rules of 1998, whose table we have not read yet, so only its capital weapons, bombs and AMS are valued. */
function itemBv(id: string, editionId: string, catalog: Catalog): ItemBv | string {
  const baseId = id.replace(ARTEMIS, "");
  const entry = bvEntryOf(baseId);
  const overlay = overlayOf(baseId, editionId);
  if (editionId === "aerotech2" && !overlay && !isCapitalOrBomb(catalog.byId(baseId))) return "AeroTech 2 takes this from the BattleTech Master Rules (1998) table, which we have not read yet";
  const bv = overlay?.bv ?? entry?.bv;
  if (bv === undefined || !entry) return overlay?.bv !== undefined ? { bv: overlay.bv, options: {} } : "no printed Battle Value";
  const ammoBv = overlay?.ammoBv ?? entry.ammoBv;
  return { bv: ARTEMIS.test(id) ? bv * AT2_BV_RULES.artemis : bv, ...(ammoBv === undefined ? {} : { ammoBv }), options: entry.options };
}

/** The heat a weapon counts in the edition: its aerospace table figure (the AR-10 at 20 in the AeroTech 2 books). */
function heatOf(id: string, editionId: string, catalog: Catalog, options: BvOptions): number {
  const style = figureOf(AERO_BV_METHOD, editionId)?.style;
  if (style === "at2" && id.startsWith("ar-10-launcher")) return AT2_BV_RULES.ar10Heat;
  const heat = (aeroWeaponFigures(catalog, id, editionId) ?? aeroCatalogFigures(catalog, id.replace(ARTEMIS, "")))?.heat ?? 0;
  if (style !== "techmanual") return heat;
  return typeof options.heat === "number" ? options.heat : options.heat === undefined ? heat : heat * HEAT_MULTIPLIER[options.heat];
}

const isAmmo = (mount: AeroMount, row: EquipmentRow | undefined) => row?.kind === "ammunition" || (mount.equipmentId ?? "").startsWith("ammo-");

interface Weapon {
  mount: AeroMount;
  id: string;
  bv: number;
  heat: number;
  defensive: boolean;
  gauss: boolean;
}
interface Ammo {
  mount: AeroMount;
  /** The id of the weapon whose ammunition it is. */
  weaponId: string;
  bv: number;
  explosive: boolean;
  defensive: boolean;
  tons: number;
}
interface Parts {
  weapons: Weapon[];
  ammo: Ammo[];
  /** Non-defensive equipment BV and defensive equipment BV. */
  equipment: number;
  defensiveEquipment: number;
  hasCase: boolean;
  unvalued: AeroUnvalued[];
}

function partsOf(record: AeroRecord, catalog: Catalog): Parts {
  const parts: Parts = { weapons: [], ammo: [], equipment: 0, defensiveEquipment: 0, hasCase: false, unvalued: [] };
  for (const mount of record.mounts) {
    const id = mount.equipmentId;
    const row = id === null ? undefined : catalog.byId(id.replace(ARTEMIS, ""));
    const name = row?.name ?? mount.name;
    if (id === null || !row) {
      parts.unvalued.push({ mountId: mount.id, name, why: "not in our equipment table" });
      continue;
    }
    if (/^case(-ii)?-(is|clan)$/.test(id)) parts.hasCase = true;
    if (isAmmo(mount, row)) {
      const entry = ammoBvEntryOf(id);
      const weaponId = entry?.id;
      const value = weaponId === undefined ? undefined : itemBv(weaponId, record.editionId, catalog);
      if (weaponId === undefined || value === undefined || typeof value === "string" || value.ammoBv === undefined) {
        parts.unvalued.push({ mountId: mount.id, name, why: typeof value === "string" ? value : "no printed Battle Value for this ammunition" });
        continue;
      }
      const tons = mount.amount ?? 1;
      parts.ammo.push({ mount, weaponId, bv: value.ammoBv * tons, explosive: value.options.inert !== true, defensive: value.options.defensiveAmmo === true, tons });
      continue;
    }
    const value = itemBv(id, record.editionId, catalog);
    if (typeof value === "string") {
      if (row.kind === "weapon") parts.unvalued.push({ mountId: mount.id, name, why: value });
      continue;
    }
    if (value.options.none === true) continue;
    if (row.kind === "weapon" && value.options.defensive !== true) {
      parts.weapons.push({ mount, id, bv: value.bv, heat: heatOf(id, record.editionId, catalog, value.options), defensive: false, gauss: value.options.gauss === true });
    } else if (value.options.defensive === true) {
      parts.defensiveEquipment += value.bv;
      parts.weapons.push({ mount, id, bv: value.bv, heat: 0, defensive: true, gauss: value.options.gauss === true });
    } else parts.equipment += value.bv;
  }
  return parts;
}

/** Ammunition BV capped at the unmodified BV of the weapons of its model (per model, all mounts together): the share of each bin that counts. */
function ammoShares(parts: Parts): Map<Ammo, number> {
  const out = new Map<Ammo, number>();
  const models = new Set(parts.ammo.map((a) => a.weaponId));
  for (const model of models) {
    const bins = parts.ammo.filter((a) => a.weaponId === model);
    const ammoBv = bins.reduce((s, a) => s + a.bv, 0);
    const weaponBv = parts.weapons.filter((w) => w.id.replace(ARTEMIS, "") === model).reduce((s, w) => s + w.bv / (ARTEMIS.test(w.id) ? AT2_BV_RULES.artemis : 1), 0);
    const share = ammoBv === 0 ? 0 : Math.min(1, weaponBv / ammoBv);
    for (const bin of bins) out.set(bin, bin.bv * share);
  }
  return out;
}

// ---- The unit's figures the methods read -----------------------------------------------------------------------------------------

interface Frame {
  kind: "fighter" | "craft" | "dropship" | "capital";
  armor: number;
  si: number;
  capacity: number;
  safe: number;
  max: number | null;
}
function frameOf(record: AeroRecord, catalog: Catalog): Frame | undefined {
  const armor = Object.values(record.armor.points).reduce((s, n) => s + n, 0);
  if (fighterKind(record)) {
    const si = fighterSI(record);
    return si === null ? undefined : { kind: "fighter", armor, si, capacity: fighterHeat(record).capacity, safe: record.thrust.safe, max: maxThrust(record) };
  }
  const v = vessel(record, catalog);
  if (!v || v.si === null) return undefined;
  const kind = v.group === "capital" ? "capital" : record.unitType === "dropship" ? "dropship" : "craft";
  return { kind, armor, si: v.si, capacity: v.heat?.capacity ?? 0, safe: record.thrust.safe, max: v.maxThrust };
}

// ---- AeroTech 2 and Revised -------------------------------------------------------------------------------------------------------

function at2Bv(record: AeroRecord, catalog: Catalog, method: AeroBvMethod, frame: Frame, parts: Parts): AeroBv {
  const fighter = frame.kind === "fighter";
  const capital = frame.kind === "capital";
  const offensive = parts.weapons.filter((w) => !w.defensive);
  const maxHeat = tidy(offensive.reduce((s, w) => s + w.heat, 0));
  const shares = ammoShares(parts);
  const defensiveAmmo = parts.ammo.filter((a) => a.defensive).reduce((s, a) => s + a.bv, 0);
  const lines: AeroBvLine[] = [
    { label: `Armor (${String(frame.armor)} x ${String(capital ? method.capitalArmor : method.armor)})`, value: frame.armor * (capital ? method.capitalArmor : method.armor) },
    { label: `Structural Integrity (${String(frame.si)} x ${String(capital ? method.capitalSi : method.si)})`, value: frame.si * (capital ? method.capitalSi : method.si) },
    { label: "Fuel (a point a ton)", value: record.fuelTons * (method.fuelPerTon ?? 0) },
    { label: "Defensive equipment and its ammunition", value: parts.defensiveEquipment + defensiveAmmo },
  ];
  if (fighter) {
    const caseOn = parts.hasCase || record.techBase === "clan";
    // Every ton of ammunition counts: the book's own example deducts the Eisensturm's Gauss ammunition (AeroTech 2: Revised Edition p. 83), and
    // its table prints the same 2,519 (p. 124), so the TechManual's inert Gauss ammunition does not carry over to these editions.
    const explosive = parts.ammo.filter((a) => !a.defensive).reduce((s, a) => s + a.tons, 0);
    lines.push({ label: `Explosive ammunition (${String(explosive)} t${caseOn ? ", with CASE" : ""})`, value: -explosive * (caseOn ? AT2_BV_RULES.ammoPerTon.case : AT2_BV_RULES.ammoPerTon.open) });
    if (maxHeat > frame.capacity) lines.push({ label: `Heat over capacity (${String(maxHeat)} - ${String(frame.capacity)}) x 5`, value: -(maxHeat - frame.capacity) * AT2_BV_RULES.heatOverPerPoint });
  }
  const subtotal = tidy(lines.reduce((s, l) => s + l.value, 0));
  const modifier = method.typeModifier[record.unitType as keyof AeroBvMethod["typeModifier"]] ?? 1;
  const defRating = tidy(subtotal * modifier);

  const weaponsBv = offensive.reduce((s, w) => s + w.bv, 0);
  const ammoBv = [...shares.entries()].filter(([a]) => !a.defensive).reduce((s, [, v]) => s + v, 0);
  const base = tidy(weaponsBv + ammoBv + parts.equipment);
  const offLines: AeroBvLine[] = [
    { label: "Weapons", value: weaponsBv },
    { label: "Ammunition (no more than its weapons)", value: tidy(ammoBv) },
    { label: "Other equipment", value: parts.equipment },
    { label: "Base weapon rating", value: base },
  ];
  let modified = base;
  if (maxHeat > frame.capacity && maxHeat > 0) {
    const x = (frame.capacity * base) / maxHeat;
    const y = (base - x) / (fighter ? AT2_BV_RULES.heatDivisor.fighter : AT2_BV_RULES.heatDivisor.other);
    modified = tidy(x + y);
    offLines.push({ label: `Heat ${String(maxHeat)} over capacity ${String(frame.capacity)}: X + Y`, value: modified });
  }
  if (fighter) offLines.push({ label: "Bombing rating (the tons)", value: record.tons });
  const weaponRating = tidy(modified + (fighter ? record.tons : 0));
  const thrust = fighter ? (frame.max ?? 0) : frame.safe;
  const factor = speedFactor(thrust);
  const offRating = tidy(weaponRating * factor);
  const sum = defRating + offRating;
  const divisor = fighter ? 1 : 1 + sum / AT2_BV_RULES.largeVesselDivisor;
  return {
    total: roundHalfUp(sum / divisor),
    defensive: { lines, subtotal, modifier, rating: defRating },
    offensive: {
      weapons: offensive.map((w) => ({ mountId: w.mount.id, name: catalog.byId(w.id.replace(ARTEMIS, ""))?.name ?? w.mount.name, arc: w.mount.arc, bv: w.bv, heat: w.heat, counted: "full" })),
      lines: offLines,
      weaponRating,
      thrust,
      speedFactor: factor,
      rating: offRating,
    },
    divisor,
    notes: [],
    unvalued: parts.unvalued,
    cite: AT2_BV_RULES.cite[record.editionId as keyof typeof AT2_BV_RULES.cite] ?? "",
  };
}

// ---- The current rules ---------------------------------------------------------------------------------------------------------

/** The arcs in order around the unit, so the two beside the front are its neighbours. A wing that fires aft is its own arc ("LW*"). */
function ringOf(record: AeroRecord): string[] {
  const loc = locationsOf(record);
  if (loc.arcs.includes("LB")) return ["NO", "FR", "RB", "AR", "AF", "AL", "LB", "FL"];
  if (loc.arcs.includes("FL")) return ["NO", "FR", "AR", "AF", "AL", "FL"];
  return loc.wingsFireAft ? ["NO", "RW", "RW*", "AF", "LW*", "LW"] : ["NO", "RW", "AF", "LW"];
}
const arcKey = (m: AeroMount) => (m.aft === true && (m.arc === "LW" || m.arc === "RW") ? `${m.arc}*` : m.arc);

/** Artemis IV on a current-edition unit is its own mount: each one raises one missile launcher in its arc, the most valuable first. */
function applyArtemis(record: AeroRecord, weapons: Weapon[]): void {
  const counts = new Map<string, number>();
  for (const m of record.mounts) if (/^artemis-iv-(is|clan)$/.test(m.equipmentId ?? "")) counts.set(arcKey(m), (counts.get(arcKey(m)) ?? 0) + 1);
  for (const [arc, n] of counts) {
    weapons
      .filter((w) => !w.defensive && arcKey(w.mount) === arc && /^(lrm|srm|mml)-\d+-(is|clan)$/.test(w.id))
      .sort((a, b) => b.bv - a.bv)
      .slice(0, n)
      .forEach((w) => (w.bv = tidy(w.bv * TM_AERO_BV_RULES.artemis)));
  }
}

function tmBv(record: AeroRecord, catalog: Catalog, method: AeroBvMethod, frame: Frame, parts: Parts): AeroBv {
  const capital = frame.kind === "capital";
  const smallUnit = frame.kind === "fighter" || frame.kind === "craft";
  const notes: string[] = [];
  if (fighterPatchworkActive(record)) notes.push("Patchwork armor: the aerospace method gives no armor type a modifier, so every armor point counts the same wherever it sits (TechManual Battle Value v4.1 p. 313, step 1; Tactical Operations: AUE p. 194 works the armor location by location, which here changes nothing).");
  applyArtemis(record, parts.weapons);
  const shares = ammoShares(parts);
  const defensiveAmmo = Math.min(
    parts.defensiveEquipment,
    [...shares.keys()].filter((a) => a.defensive).reduce((s, a) => s + a.bv, 0),
  );
  const lines: AeroBvLine[] = [
    { label: `Armor (${String(frame.armor)} x ${String(capital ? method.capitalArmor : method.armor)})`, value: frame.armor * (capital ? method.capitalArmor : method.armor) },
    { label: `Structural Integrity (${String(frame.si)} x ${String(capital ? method.capitalSi : method.si)})`, value: frame.si * (capital ? method.capitalSi : method.si) },
    { label: "Defensive equipment and its ammunition", value: parts.defensiveEquipment + defensiveAmmo },
  ];
  let subtotal = tidy(lines.reduce((s, l) => s + l.value, 0));
  if (smallUnit && record.techBase !== "clan" && !parts.hasCase) {
    const types = new Set(parts.ammo.filter((a) => a.explosive && !a.defensive).map((a) => a.mount.equipmentId)).size;
    const gauss = parts.weapons.filter((w) => w.gauss).length;
    const cut = types * TM_AERO_BV_RULES.ammoPerType + gauss * TM_AERO_BV_RULES.gaussEach;
    if (cut > 0) {
      lines.push({ label: `Explosive ammunition (${String(types)} kinds) and Gauss weapons (${String(gauss)}), no CASE`, value: -cut });
      subtotal = Math.max(1, tidy(subtotal - cut));
    }
  }
  const modifier = method.typeModifier[record.unitType as keyof AeroBvMethod["typeModifier"]] ?? 1;
  const defRating = tidy(subtotal * modifier);

  const offensive = parts.weapons.filter((w) => !w.defensive);
  const offAmmo = [...shares.entries()].filter(([a]) => !a.defensive);
  const weapons: AeroBvWeapon[] = [];
  const offLines: AeroBvLine[] = [];
  let weaponRating = 0;
  if (smallUnit) {
    // Rear-firing weapons (the aft arc) count half; if the nose's weapons are worth less than them, the forward ones are halved instead.
    const rear = offensive.filter((w) => w.mount.arc === "AF");
    const nose = offensive.filter((w) => w.mount.arc === "NO").reduce((s, w) => s + w.bv, 0);
    const rearSum = rear.reduce((s, w) => s + w.bv, 0);
    const halveRear = nose >= rearSum;
    const modified = offensive.map((w) => ({ w, bv: (w.mount.arc === "AF") === halveRear ? w.bv * TM_AERO_BV_RULES.rearFactor : w.bv }));
    const efficiency = frame.capacity + TM_AERO_BV_RULES.heatEfficiencyBonus;
    const totalHeat = tidy(offensive.reduce((s, w) => s + w.heat, 0));
    const ammoBv = tidy(offAmmo.reduce((s, [, v]) => s + v, 0));
    offLines.push({ label: "Ammunition (no more than its weapons)", value: ammoBv }, { label: "Other equipment", value: parts.equipment });
    offLines.push({ label: `Heat efficiency (${String(frame.capacity)} + 6) against weapon heat ${String(totalHeat)}`, value: efficiency });
    weaponRating = ammoBv + parts.equipment;
    const cold = modified.filter((m) => m.w.heat === 0);
    const hot = modified.filter((m) => m.w.heat > 0).sort((a, b) => b.bv - a.bv || a.w.heat - b.w.heat);
    let running = 0;
    let over = false;
    for (const m of [...cold, ...hot]) {
      const half = totalHeat > efficiency && m.w.heat > 0 && over;
      const value = half ? m.bv / 2 : m.bv;
      weaponRating += value;
      weapons.push({ mountId: m.w.mount.id, name: catalog.byId(m.w.id.replace(ARTEMIS, ""))?.name ?? m.w.mount.name, arc: m.w.mount.arc, bv: tidy(value), heat: m.w.heat, counted: m.w.heat === 0 ? "no heat" : half ? "half" : "full" });
      if (m.w.heat > 0) {
        running += m.w.heat;
        if (running >= efficiency) over = true;
      }
    }
  } else {
    // DropShips (TechManual v4.1 p. 313) and capital ships (SO:AA p. 148): by arc. The front is the arc worth most (a WarShip compares its nose,
    // broadsides and aft only), the side beside it worth more comes next, then the other side, then the rest at a quarter.
    const ring = ringOf(record);
    const arcBv = new Map<string, number>(ring.map((a) => [a, 0]));
    const arcHeat = new Map<string, number>(ring.map((a) => [a, 0]));
    for (const w of offensive) {
      const key = arcKey(w.mount);
      arcBv.set(key, (arcBv.get(key) ?? 0) + w.bv);
      arcHeat.set(key, (arcHeat.get(key) ?? 0) + w.heat);
    }
    const arcAmmo = new Map<string, number>();
    for (const [a, v] of offAmmo) arcAmmo.set(arcKey(a.mount), (arcAmmo.get(arcKey(a.mount)) ?? 0) + v);
    const candidates = record.unitType === "warship" ? ring.filter((a) => ["NO", "LB", "RB", "AF"].includes(a)) : ring;
    const front = candidates.reduce((best, a) => ((arcBv.get(a) ?? 0) > (arcBv.get(best) ?? 0) ? a : best), candidates[0] ?? "NO");
    const i = ring.indexOf(front);
    const leftOf = ring[(i - 1 + ring.length) % ring.length] ?? front;
    const rightOf = ring[(i + 1) % ring.length] ?? front;
    const efficiency = frame.capacity;
    const value = (a: string) => tidy((arcBv.get(a) ?? 0) + (arcAmmo.get(a) ?? 0));
    const heat = (a: string) => arcHeat.get(a) ?? 0;
    // The arcs' shares with a given side taken second.
    const sharesWith = (side: string, other: string): [string, number][] => {
      let running = heat(front);
      // The front counts in full even when its own heat is over capacity. The first side: a DropShip weighs the heat fired before it
      // (TechManual Battle Value v4.1 p. 312); a capital ship weighs it with the side's own heat, "would be exceeded by firing this arc"
      // (Strategic Operations: Advanced Aerospace Rules p. 149). "Exceeded" is strictly over capacity.
      const sideOver = capital ? running + heat(side) > efficiency : running > efficiency;
      running += heat(side);
      // The opposite side, for both: the front and first side's heat only, not its own (TechManual p. 312 step 7, which SO:AA p. 149 leaves
      // standing "except as noted"; panel reading, CONFLICTS 81).
      const otherOver = running > efficiency;
      const all: [string, number][] = [
        [front, 1],
        [side, sideOver ? TM_AERO_BV_RULES.arcs.side[1] : TM_AERO_BV_RULES.arcs.side[0]],
        [other, otherOver ? TM_AERO_BV_RULES.arcs.otherSide[1] : TM_AERO_BV_RULES.arcs.otherSide[0]],
        ...ring.filter((a) => a !== front && a !== side && a !== other).map((a): [string, number] => [a, TM_AERO_BV_RULES.arcs.rear]),
      ];
      return front === side ? all.slice(0, 1) : all;
    };
    const sumOf = (list: [string, number][]) => tidy(list.reduce((s, [a, share]) => s + tidy(value(a) * share), 0));
    const left = arcBv.get(leftOf) ?? 0;
    const right = arcBv.get(rightOf) ?? 0;
    const chosen = right > left ? sharesWith(rightOf, leftOf) : sharesWith(leftOf, rightOf);
    // On a tie the book picks a side at random; we always take the left, and say so where the other choice would change the figure.
    if (left === right && leftOf !== rightOf && sumOf(chosen) !== sumOf(sharesWith(rightOf, leftOf))) {
      notes.push(`Sides tie: we took the left (the book picks at random, ${capital ? "Strategic Operations: Advanced Aerospace Rules p. 149" : "TechManual Battle Value v4.1 p. 313"}).`);
    }
    for (const [a, share] of chosen) {
      const v = tidy(value(a) * share);
      weaponRating += v;
      offLines.push({ label: `${a.replace("*", " (aft)")} x ${String(share)}`, value: v });
    }
    for (const w of offensive) weapons.push({ mountId: w.mount.id, name: catalog.byId(w.id.replace(ARTEMIS, ""))?.name ?? w.mount.name, arc: arcKey(w.mount), bv: w.bv, heat: w.heat, counted: "in its arc" });
    weaponRating += parts.equipment;
    if (parts.equipment > 0) offLines.push({ label: "Other equipment", value: parts.equipment });
  }
  weaponRating = tidy(weaponRating);
  const kind = capitalKind(record);
  const thrust = kind === "jumpship" || kind === "space-station" ? TM_AERO_BV_RULES.capitalThrust[kind] : (frame.max ?? 0);
  const factor = speedFactor(Math.ceil(thrust));
  const offRating = tidy(weaponRating * factor);
  return {
    total: roundHalfUp(defRating + offRating),
    defensive: { lines, subtotal, modifier, rating: defRating },
    offensive: { weapons, lines: offLines, weaponRating, thrust, speedFactor: factor, rating: offRating },
    divisor: 1,
    notes,
    unvalued: parts.unvalued,
    cite: capital ? "Strategic Operations: Advanced Aerospace Rules pp. 148-149, TechManual Battle Value v4.1 pp. 312-313" : "TechManual Battle Value v4.1 pp. 312-313, TechManual pp. 316-318",
  };
}

/** The unit's Battle Value under its edition, or null where the edition prints none (AeroTech, BattleSpace) or the unit is not one it builds. */
export function aeroBattleValue(record: AeroRecord, catalog: Catalog): AeroBv | null {
  const method = figureOf(AERO_BV_METHOD, record.editionId);
  const frame = method && frameOf(record, catalog);
  if (!method || !frame) return null;
  const parts = partsOf(record, catalog);
  return method.style === "at2" ? at2Bv(record, catalog, method, frame, parts) : tmBv(record, catalog, method, frame, parts);
}

// ---- Cost ---------------------------------------------------------------------------------------------------------------------------

export interface AeroCostLine {
  label: string;
  cost: number;
  how: string;
}
export interface AeroCost {
  /** Final cost: rounded to the nearest C-bill (to the nearest million for large craft in the AeroTech 2 books). */
  total: number;
  lines: AeroCostLine[];
  subtotal: number;
  multiplier: number;
  unpriced: { id: string | null; name: string; why: string }[];
  cite: string;
}

const n = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 3 });

function ammoPriceOf(id: string, editionId: string): number | undefined {
  const group = AERO_PRICE_OVERLAYS.find((g) => g.editions.includes(editionId));
  const key = stemOf(id);
  return group && Object.hasOwn(group.ammoPerTon, key) ? group.ammoPerTon[key] : undefined;
}
function weaponPriceOf(row: EquipmentRow, editionId: string, tons: number): number | undefined {
  const group = AERO_PRICE_OVERLAYS.find((g) => g.editions.includes(editionId));
  const key = stemOf(row.id);
  if (group && Object.hasOwn(group.weapons, key)) return group.weapons[key];
  const price = priceOf(row)?.price;
  if (price === undefined) return undefined;
  if (typeof price === "number") return price;
  if ("perTon" in price) return price.perTon * Math.ceil(tons);
  if ("perWeight" in price) return (price.base ?? 0) + price.perWeight * tons;
  return undefined;
}

/** The unit's C-bill cost under its edition (TechManual pp. 283, 285; AeroTech 2 pp. 51-52; AeroTech 2: Revised Edition pp. 77-78), or null where
 * the edition prints no costs. Capital ships are not priced yet: the panel says so. */
export function aeroCost(record: AeroRecord, catalog: Catalog): AeroCost | null {
  const costs = figureOf(AERO_COST, record.editionId);
  const fighter = fighterKind(record);
  const v = fighter ? null : vessel(record, catalog);
  if (!costs || (!fighter && v?.group !== "craft")) return null;
  const lines: AeroCostLine[] = [];
  const add = (label: string, cost: number, how: string) => lines.push({ label, cost: tidy(cost), how });
  const unpriced: AeroCost["unpriced"] = [];
  const t = record.tons;
  const heatSinks = fighter ? fighterHeat(record).total : (v?.heat?.total ?? 0);
  if (fighter === "aerospace") {
    add("Cockpit", costs.cockpit, n(costs.cockpit));
    add("Life support", costs.lifeSupport, n(costs.lifeSupport));
    add("Sensors", costs.sensorsPerTon * t, `${n(costs.sensorsPerTon)} x ${n(t)}`);
  } else if (fighter === "conventional") {
    const control = fighterTally(record, catalog).lines.find((l) => l.label === "Cockpit and controls")?.tons ?? 0;
    add("Avionics", costs.avionicsPerControlTon * control, `${n(costs.avionicsPerControlTon)} x ${n(control)}`);
  } else {
    const crew = record.crew ?? craftCrew(record, catalog)?.minimum ?? 0;
    const arcs = new Set(record.mounts.filter((m) => catalog.byId(m.equipmentId ?? "")?.kind === "weapon").map((m) => m.arc)).size;
    add("Bridge", costs.bridge.base + costs.bridge.perTon * t, `${n(costs.bridge.base)} + ${n(costs.bridge.perTon)} x ${n(t)}`);
    add("Computer", costs.computer, n(costs.computer));
    add("Life support", costs.lifeSupportPerPerson * crew, `${n(costs.lifeSupportPerPerson)} x ${n(crew)} crew`);
    add("Sensors", costs.craftSensors, n(costs.craftSensors));
    add("Fire control computer", costs.fireControl, n(costs.fireControl));
    add("Gunnery control", costs.gunneryPerArc * arcs, `${n(costs.gunneryPerArc)} x ${n(arcs)} arcs`);
  }
  const si = fighter ? (fighterSI(record) ?? 0) : (v?.si ?? 0);
  const siEach = fighter === "aerospace" ? costs.siPerPoint["aerospace-fighter"] : fighter === "conventional" ? costs.siPerPoint["conventional-fighter"] : costs.siPerPoint.craft;
  add("Structural Integrity", siEach * si, `${n(siEach)} x ${n(si)}`);
  add("Attitude thrusters", costs.attitudeThruster, n(costs.attitudeThruster));
  add("Landing gear", costs.landingGearPerTon * t, `${n(costs.landingGearPerTon)} x ${n(t)}`);
  if (record.unitType === "dropship") add("Docking collar", costs.dockingCollar, n(costs.dockingCollar));
  if (fighter) {
    const rating = engineRating(record) ?? 0;
    const perRating = Object.hasOwn(ENGINE_COST.rows, record.engine.type) ? ENGINE_COST.rows[record.engine.type]?.perRating : undefined;
    if (perRating === undefined) unpriced.push({ id: null, name: "Engine", why: "no price for this engine type" });
    else add("Engine", (perRating * rating * t) / ENGINE_COST.divisor, `${n(perRating)} x ${n(rating)} x ${n(t)} / 75`);
  } else {
    const engine = v?.engineTons ?? 0;
    add("Drive unit", (costs.driveUnit.perThrustTon * record.thrust.safe * t) / costs.driveUnit.tonsDivisor, `${n(costs.driveUnit.perThrustTon)} x ${n(record.thrust.safe)} x ${n(t)} / 100`);
    add("Engine", costs.craftEnginePerTon * engine, `${n(costs.craftEnginePerTon)} x ${n(engine)} t`);
    if (costs.engineControl !== undefined) add("Engine control", costs.engineControl, n(costs.engineControl));
  }
  add("Fuel tanks", costs.fuelPerTon * record.fuelTons, `${n(costs.fuelPerTon)} x ${n(record.fuelTons)} t`);
  if (fighter && fighterPatchworkActive(record)) {
    // Patchwork armor is priced a type at a time, on the tons of the locations that wear it (TO:AUE p. 189); the two Interstellar Operations types take their price from its cost table (p. 215).
    const types = new Map<string, number>();
    for (const loc of Object.keys(record.armor.points)) types.set(armorTypeAt(record, loc), (types.get(armorTypeAt(record, loc)) ?? 0) + (patchworkTonsAt(record, loc) ?? 0));
    for (const [id, typeTons] of types) {
      const type = fighterPatchworkTypes(record.editionId).find((t) => t.id === id);
      const each = Object.hasOwn(costs.armorPerTon, id) ? costs.armorPerTon[id] : type === undefined ? undefined : own(ARMOR_COST.rows, type.like)?.perTon;
      if (each === undefined) unpriced.push({ id: null, name: `Armor (${type?.name ?? id})`, why: "no price for this armor type" });
      else if (typeTons > 0) add(`Armor (${type?.name ?? id})`, each * typeTons, `${n(each)} x ${n(typeTons)} t`);
    }
  } else {
    const armorEach = Object.hasOwn(costs.armorPerTon, record.armor.type) ? costs.armorPerTon[record.armor.type] : undefined;
    if (armorEach === undefined) unpriced.push({ id: null, name: "Armor", why: "no price for this armor type" });
    else add("Armor", armorEach * record.armor.tons, `${n(armorEach)} x ${n(record.armor.tons)} t`);
  }
  const sinkEach = record.heatSinks.type === "double" ? costs.heatSinkEach.double : costs.heatSinkEach.single;
  if (sinkEach !== undefined) add("Heat sinks", sinkEach * heatSinks, `${n(sinkEach)} x ${n(heatSinks)}`);
  if (fighter === "conventional" && costs.amplifierPerTon !== undefined) {
    const amps = fighterTally(record, catalog).lines.find((l) => l.label === "Power amplifiers")?.tons ?? 0;
    if (amps > 0) add("Power amplifiers", costs.amplifierPerTon * amps, `${n(costs.amplifierPerTon)} x ${n(amps)} t`);
  }
  const ammoClasses = new Set<string>();
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId.replace(ARTEMIS, ""));
    const name = row?.name ?? mount.name;
    if (!row || mount.equipmentId === null) {
      unpriced.push({ id: mount.equipmentId, name, why: "not in our equipment table" });
      continue;
    }
    if (isAmmo(mount, row)) {
      ammoClasses.add(stemOf(row.id));
      if (!costs.buysAmmunition) continue;
      const each = ammoPriceOf(row.id, record.editionId);
      const tons = mount.amount ?? 1;
      if (each === undefined) unpriced.push({ id: row.id, name, why: "no ammunition price in this edition's table" });
      else add(name, each * tons, `${n(each)} x ${n(tons)} t`);
      continue;
    }
    if (record.editionId === "aerotech2" && !isCapitalOrBomb(row)) {
      unpriced.push({ id: row.id, name, why: "AeroTech 2 takes this from the BattleTech Master Rules (1998) price table, which we have not read yet" });
      continue;
    }
    const tons = (aeroWeaponFigures(catalog, mount.equipmentId, record.editionId) ?? aeroCatalogFigures(catalog, row.id))?.tons ?? 0;
    let price = weaponPriceOf(row, record.editionId, tons);
    if (price !== undefined && ARTEMIS.test(mount.equipmentId)) {
      const artemis = catalog.byId(`artemis-iv-${row.techBase === "clan" ? "clan" : "is"}`);
      const extra = artemis && weaponPriceOf(artemis, record.editionId, 1);
      price = extra === undefined ? undefined : price + extra;
    }
    if (price === undefined) unpriced.push({ id: row.id, name, why: "no price in the cost tables" });
    else add(name, price, n(price));
  }
  if (fighter && costs.casePerAmmoClass !== undefined && record.mounts.some((m) => /^case-(is|clan)$/.test(m.equipmentId ?? ""))) {
    add("CASE", costs.casePerAmmoClass * ammoClasses.size, `${n(costs.casePerAmmoClass)} x ${n(ammoClasses.size)} ammunition classes`);
  }
  const subtotal = tidy(lines.reduce((s, l) => s + l.cost, 0));
  const f = costs.final;
  const multiplier = fighter
    ? (record.omni !== undefined ? f.omni : 1) * (1 + t / f.fighterDivisor)
    : record.unitType === "small-craft"
      ? 1 + t / f.smallCraftDivisor
      : record.shape === "spheroid"
        ? f.spheroid
        : f.aerodyne;
  const raw = subtotal * multiplier;
  const large = !fighter && record.unitType !== "small-craft" && costs.roundLargeToMillion;
  return {
    total: large ? Math.round(raw / 1_000_000) * 1_000_000 : roundHalfUp(raw),
    lines,
    subtotal,
    multiplier: tidy(multiplier),
    unpriced,
    cite: costCite(record.editionId),
  };
}

function costCite(editionId: string): string {
  const row = AERO_COST.find((r) => r.editions.includes(editionId));
  return row?.cite[editionId] ?? "";
}

/** The figures the cost uses, for the panel's note. */
export type { AeroCostFigures };
