// The rules check for battle armor: findings with the printed page they rest on. Findings are advice, never refusals: nothing is removed from a
// record and nothing throws on one this version does not understand. Messages are our own words and state the numbers.
import { ARMOR_TYPES, MANIPULATORS, MOTIVE, SQUAD, WEIGHT_CLASSES, armorTypeOf, isMotive, manipulatorOf, weightClassOf } from "../../data/battlearmor";
import type { Cite, Dated } from "../../data/battlearmor";
import type { RulesLevel } from "../../data/chassis";
import type { Catalog } from "../catalog";
import { LEVEL_ORDER, equipmentLevel, levelAtLeast, levelIn, levelRow } from "../levels";
import { canon, officialLabel } from "../official";
import type { OfficialState } from "../official";
import { yearEraFindings } from "../checks";
import { datesText } from "../time";
import { tidy } from "../walk";
import { baseFits, itemOffered, itemPhase, phaseOf, suitOffered } from "./availability";
import { asEquipment, chosenMunition, choicesFor } from "../munitions";
import { build, carriesShots, isBooster, isMechanicalBooster, isMyomerBooster, isTubeArtillery, isWing, locationName, locationsOf, myomerBonus, shotsOf, weaponLimit } from "./construct";
import type { BaRecord } from "./record";

export interface BaFinding {
  check: string;
  level: "error" | "warning" | "note";
  message: string;
  where?: { field?: string; mountId?: string };
  cite?: string;
}

const page = (cite: Cite): string => `${cite.book}, p. ${String(cite.page)}`;
const num = (n: number): string => String(tidy(n));
const TM = (p: number): string => `TechManual, p. ${String(p)}`;

type Check = (record: BaRecord, catalog: Catalog) => BaFinding[];

const typeCheck: Check = (record) => {
  const out: BaFinding[] = [];
  const cls = weightClassOf(record.weightClass);
  if (!cls) out.push({ check: "type", level: "warning", message: `"${record.weightClass}" is not a weight class we know.`, where: { field: "weightClass" } });
  if (cls && record.body === "quad" && cls.id === "pal") out.push({ check: "type", level: "error", message: "A PA(L) suit can only be humanoid.", where: { field: "body" }, cite: TM(162) });
  if (!suitOffered(record.rulesLevel)) out.push({ check: "type", level: "error", message: "Battle armor is not part of Introductory rules; it starts at Standard.", where: { field: "rulesLevel" }, cite: TM(160) });
  if (!(record.troopers >= 1 && record.troopers <= SQUAD.max && Number.isInteger(record.troopers))) {
    out.push({ check: "type", level: "error", message: `A ${record.techBase === "clan" ? "Point" : "squad"} holds one to ${String(SQUAD.max)} troopers; this one has ${num(record.troopers)}.`, where: { field: "troopers" }, cite: page(SQUAD.cite) });
  }
  return out;
};

/** The year, era and tech base against one another and the era table, shared with the 'Mech and AeroTech checks. */
const yearCheck: Check = (record) =>
  yearEraFindings({ year: record.year, era: record.era, techBase: record.techBase, editionId: record.editionId }, record.rulesLevel ?? "standard", "suit").map(({ level, message, where, cite }) => ({
    check: "year",
    level,
    message,
    ...(where?.field === undefined ? {} : { where: { field: where.field } }),
    ...(cite ? { cite: page(cite) } : {}),
  }));

const weightCheck: Check = (record, catalog) => {
  const b = build(record, catalog);
  const out: BaFinding[] = b.unknown.map((what) => ({ check: "weight", level: "warning" as const, message: `We do not have ${what}, so it is not counted in the weight.` }));
  if (b.maxKg === undefined || b.minKg === undefined) return out;
  if (b.totalKg > b.maxKg) out.push({ check: "weight", level: "error", message: `The suit weighs ${num(b.totalKg)} kg, ${num(b.totalKg - b.maxKg)} kg over the ${num(b.maxKg)} kg a ${b.weightClass?.label ?? ""} suit may weigh.`, cite: TM(163) });
  else if (b.totalKg < b.minKg) {
    const lighter = WEIGHT_CLASSES.find((row) => b.totalKg >= row.minKg && b.totalKg <= row.maxKg);
    out.push({ check: "weight", level: "note", message: `At ${num(b.totalKg)} kg the suit is under the ${num(b.minKg)} kg a ${b.weightClass?.label ?? ""} suit starts at${lighter ? `; it would be ${lighter.label}` : ""}.`, cite: TM(161) });
  }
  return out;
};

const motiveCheck: Check = (record, catalog) => {
  const out: BaFinding[] = [];
  const cls = weightClassOf(record.weightClass);
  if (!cls) return out;
  const quad = record.body === "quad";
  const free = quad ? (cls.ground.free.quad ?? cls.ground.free.humanoid) : cls.ground.free.humanoid;
  // A myomer booster raises the most Ground MP, beyond the normal limit (TO:AUE p. 99).
  const boost = record.mounts.some((m) => isMyomerBooster(m.equipmentId === null ? undefined : catalog.byId(m.equipmentId))) ? myomerBonus(record.weightClass) : 0;
  const normal = quad ? cls.ground.max.quad : cls.ground.max.humanoid;
  const max = normal === undefined ? undefined : normal + boost;
  if (max !== undefined && record.ground > max) out.push({ check: "motive", level: "error", message: `Ground MP is ${num(record.ground)}; a ${cls.label} ${record.body} suit has at most ${num(max)}.`, where: { field: "ground" }, cite: TM(164) });
  if (record.ground < free) out.push({ check: "motive", level: "warning", message: `A ${cls.label} ${record.body} suit has ${num(free)} ground MP at no weight; this one has ${num(record.ground)}.`, where: { field: "ground" }, cite: TM(164) });
  const kind = record.motive.kind;
  if (kind !== "none") {
    if (quad) out.push({ check: "motive", level: "error", message: "A quad suit may not have jump, VTOL or UMU movement.", where: { field: "motive" }, cite: TM(164) });
    const system = isMotive(kind) ? cls[kind] : undefined;
    if (!system) out.push({ check: "motive", level: "error", message: `A ${cls.label} suit cannot have ${kind} movement.`, where: { field: "motive" }, cite: TM(165) });
    else if (record.motive.mp > system.maxMp) out.push({ check: "motive", level: "error", message: `${num(record.motive.mp)} ${kind} MP is more than the ${num(system.maxMp)} a ${cls.label} suit may have.`, where: { field: "motive" }, cite: TM(165) });
    if (system && record.motive.mp <= 0) out.push({ check: "motive", level: "note", message: "A movement system is chosen with no MP.", where: { field: "motive" } });
    if ((kind === "vtol" || kind === "umu") && record.techBase !== "clan") out.push({ check: "motive", level: "error", message: `${kind.toUpperCase()} equipment is Clan technology.`, where: { field: "motive" }, cite: TM(165) });
  }
  const boosters = record.mounts.filter((m) => isBooster(m.equipmentId === null ? undefined : catalog.byId(m.equipmentId)));
  if (boosters.length > 0 && kind !== "jump") out.push({ check: "motive", level: "error", message: "A jump booster needs jump jets.", where: { mountId: boosters[0]?.id }, cite: TM(165) });
  if (boosters.length > 1) out.push({ check: "motive", level: "warning", message: "A suit has one jump booster.", where: { mountId: boosters[1]?.id }, cite: TM(165) });
  const wings = record.mounts.filter((m) => isWing(m.equipmentId === null ? undefined : catalog.byId(m.equipmentId)));
  if (wings.length > 0 && kind !== "jump") out.push({ check: "motive", level: "error", message: "A partial wing needs jump jets.", where: { mountId: wings[0]?.id }, cite: TM(266) });
  if (wings.length > 0 && boosters.length > 0) out.push({ check: "motive", level: "error", message: "A partial wing and a jump booster cannot be combined.", where: { mountId: wings[0]?.id }, cite: TM(266) });
  const badWing = wings.find((m) => m.location !== "body");
  if (badWing) out.push({ check: "motive", level: "error", message: "A partial wing can only be mounted in the Body.", where: { mountId: badWing.id }, cite: TM(266) });
  if (wings.length > 0 && (record.body === "quad" || !["pal", "light"].includes(record.weightClass))) out.push({ check: "motive", level: "error", message: "A partial wing fits only humanoid light suits and PA(L) or exoskeleton suits.", where: { mountId: wings[0]?.id }, cite: TM(266) });
  if (wings.length > 1) out.push({ check: "motive", level: "warning", message: "A suit has one partial wing.", where: { mountId: wings[1]?.id }, cite: TM(266) });
  return out;
};

const manipulatorCheck: Check = (record) => {
  const out: BaFinding[] = [];
  const sides = [["left", record.manipulators.la], ["right", record.manipulators.ra]] as const;
  if (record.body === "quad") {
    if (sides.some(([, id]) => id !== "none")) out.push({ check: "manipulators", level: "error", message: "A quad suit has no manipulators.", where: { field: "manipulators" }, cite: TM(166) });
    return out;
  }
  for (const [side, id] of sides) {
    if (!manipulatorOf(id)) out.push({ check: "manipulators", level: "warning", message: `We do not have the manipulator "${id}" (${side} arm).`, where: { field: "manipulators" } });
  }
  for (const row of MANIPULATORS) {
    if (row.pairs && [record.manipulators.la, record.manipulators.ra].filter((id) => id === row.id).length === 1) out.push({ check: "manipulators", level: "error", message: `${row.label} must be mounted in a pair.`, where: { field: "manipulators" }, cite: TM(166) });
  }
  return out;
};

const armorCheck: Check = (record) => {
  const out: BaFinding[] = [];
  const cls = weightClassOf(record.weightClass);
  const armor = armorTypeOf(record.armor.type);
  if (!armor) return [{ check: "armor", level: "warning", message: `"${record.armor.type}" is not an armor type we know.`, where: { field: "armor" } }];
  if (cls && record.armor.points > cls.maxArmor) out.push({ check: "armor", level: "error", message: `${num(record.armor.points)} armor points is more than the ${num(cls.maxArmor)} a ${cls.label} suit may carry.`, where: { field: "armor" }, cite: TM(169) });
  if (armor.kg[record.techBase] === undefined) out.push({ check: "armor", level: "error", message: `${armor.label} armor is not built by the ${record.techBase === "clan" ? "Clan" : "Inner Sphere"} tech base.`, where: { field: "armor" }, cite: TM(169) });
  if (record.armor.slots) {
    const placed = Object.values(record.armor.slots).reduce((a, n) => a + n, 0);
    const need = record.armor.points > 0 ? armor.slots : 0;
    if (placed !== need) out.push({ check: "armor", level: "warning", message: `The armor takes ${num(need)} weapon slots; ${num(placed)} are placed.`, where: { field: "armor" }, cite: TM(168) });
    if (record.body === "quad" && ((record.armor.slots.la ?? 0) > 0 || (record.armor.slots.ra ?? 0) > 0)) out.push({ check: "armor", level: "warning", message: "A quad suit has only a body to put armor slots in.", where: { field: "armor" } });
  }
  return out;
};

const slotCheck: Check = (record, catalog) => {
  const out: BaFinding[] = [];
  const b = build(record, catalog);
  for (const loc of locationsOf(record.body)) {
    const use = b.slots[loc];
    if (use && use.used > use.capacity) out.push({ check: "slots", level: "error", message: `${locationName(loc)} holds ${num(use.capacity)} slots and ${num(use.used)} are used (armor ${num(use.armor)}, items ${num(use.items)}, ammunition ${num(use.ammo)}).`, cite: TM(163) });
    const count = b.weapons[loc] ?? 0;
    const limit = weaponLimit(record.body, loc);
    if (count > limit) out.push({ check: "slots", level: "error", message: `${locationName(loc)} has ${num(count)} weapons; the limit is ${num(limit)}.`, cite: TM(170) });
  }
  for (const mount of record.mounts) {
    if (!locationsOf(record.body).includes(mount.location as never)) out.push({ check: "slots", level: "error", message: `${mount.name || "An item"} is in "${mount.location}", which a ${record.body} suit does not have.`, where: { mountId: mount.id } });
  }
  return out;
};

const equipmentCheck: Check = (record, catalog) => {
  const out: BaFinding[] = [];
  const camo = record.mounts.filter((m) => m.equipmentId?.startsWith("ba-camo-system"));
  if (camo.length > 1) out.push({ check: "equipment", level: "error", message: "A suit may mount only one camo system.", where: { mountId: camo[1]?.id }, cite: TM(253) });
  // One parafoil, in the Body (errata v8.0 to p. 266); one remote sensor dispenser (p. 268).
  const parafoils = record.mounts.filter((m) => m.equipmentId?.startsWith("ba-parafoil"));
  if (parafoils.length > 1) out.push({ check: "equipment", level: "error", message: "A suit may mount only one parafoil.", where: { mountId: parafoils[1]?.id }, cite: TM(266) });
  const outsideBody = parafoils.find((m) => m.location !== "body");
  if (outsideBody) out.push({ check: "equipment", level: "error", message: "A parafoil can only be mounted in the Body.", where: { mountId: outsideBody.id }, cite: TM(266) });
  const dispensers = record.mounts.filter((m) => m.equipmentId?.startsWith("ba-remote-sensor-dispenser"));
  if (dispensers.length > 1) out.push({ check: "equipment", level: "error", message: "A suit may mount only one remote sensor dispenser.", where: { mountId: dispensers[1]?.id }, cite: TM(268) });
  // The boosters and the tube artillery of TO:AUE pp. 96 and 98-99: one of each booster, never both, no stealth or mimetic armor with a myomer booster, the artillery in the Body.
  const rowOf = (m: BaRecord["mounts"][number]) => (m.equipmentId === null ? undefined : catalog.byId(m.equipmentId));
  const toAue = (n: number): string => `Tactical Operations: Advanced Units and Equipment, p. ${String(n)}`;
  const mechanical = record.mounts.filter((m) => isMechanicalBooster(rowOf(m)));
  const myomer = record.mounts.filter((m) => isMyomerBooster(rowOf(m)));
  if (mechanical.length > 1) out.push({ check: "equipment", level: "error", message: "A suit may mount only one mechanical jump booster.", where: { mountId: mechanical[1]?.id }, cite: toAue(98) });
  if (myomer.length > 1) out.push({ check: "equipment", level: "error", message: "A suit may mount only one myomer booster.", where: { mountId: myomer[1]?.id }, cite: toAue(98) });
  if (mechanical.length > 0 && myomer.length > 0) out.push({ check: "equipment", level: "error", message: "A mechanical jump booster and a myomer booster cannot be combined.", where: { mountId: myomer[0]?.id }, cite: toAue(98) });
  if (myomer.length > 0 && (record.armor.type.startsWith("stealth") || record.armor.type === "mimetic")) out.push({ check: "equipment", level: "error", message: "A suit with a myomer booster may not wear stealth or mimetic armor.", where: { mountId: myomer[0]?.id }, cite: toAue(98) });
  const tube = record.mounts.find((m) => isTubeArtillery(rowOf(m)) && m.location !== "body");
  if (tube) out.push({ check: "equipment", level: "error", message: "Tube artillery can only be mounted in the Body.", where: { mountId: tube.id }, cite: toAue(96) });
  if (camo.length > 0 && record.armor.type === "mimetic") out.push({ check: "equipment", level: "error", message: "A suit may mount only one camo system, and mimetic armor is one.", where: { mountId: camo[0]?.id }, cite: TM(253) });
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);
    if (!row) {
      out.push({ check: "equipment", level: "warning", message: `${mount.name || "An item"} is not in our table.`, where: { mountId: mount.id } });
      continue;
    }
    if (row.techBase !== record.techBase && !(record.techBase === "clan" && itemOffered(row, record, catalog))) out.push({ check: "equipment", level: "error", message: `${row.name} is ${row.techBase === "clan" ? "Clan" : "Inner Sphere"} equipment, on a ${record.techBase === "clan" ? "Clan" : "Inner Sphere"} suit.`, where: { mountId: mount.id }, cite: TM(170) });
    if (carriesShots(row) && shotsOf(mount) === 0) out.push({ check: "equipment", level: "note", message: `${row.name} carries no ammunition.`, where: { mountId: mount.id }, cite: TM(171) });
    // The mine type chosen for a dispenser: one it does not take reads as the standard mine; one the suit may not have is advice, as any item is.
    const choices = choicesFor(row, catalog, record.editionId);
    if (choices.length > 0) {
      const chosen = chosenMunition(row, mount.munition, catalog, record.editionId);
      if (mount.munition !== undefined && !choices.some((c) => c.id === mount.munition)) out.push({ check: "equipment", level: "note", message: `${row.name} names the mine type "${mount.munition}", which it does not take; it counts as ${chosen?.name ?? "the standard mine"}.`, where: { mountId: mount.id }, cite: toAue(137) });
      else if (chosen !== undefined && !itemOffered(asEquipment(chosen, "battlearmor"), record, catalog)) out.push({ check: "equipment", level: "warning", message: `${chosen.name} is not available to this suit's tech base, year or rules level.`, where: { mountId: mount.id }, cite: page(chosen.cite) });
    }
  }
  return out;
};

/** The dates of what the suit uses, against its year: a part the books date later is advice, with its printed years. */
const datesCheck: Check = (record, catalog) => {
  const out: BaFinding[] = [];
  const say = (what: string, row: Dated, where?: BaFinding["where"]) => {
    const phase = phaseOf(row, record);
    const printed = (record.techBase === "clan" ? (row.clanAvailability ?? row.availability) : row.availability)[0]?.from;
    const proto = record.techBase === "clan" ? (row.clanPrototypeYear ?? row.prototypeYear) : row.prototypeYear;
    if (!baseFits(row, record.techBase)) out.push({ check: "dates", level: "error", message: `${what} is ${row.techBase === "clan" ? "Clan" : "Inner Sphere"} technology only.`, ...(where ? { where } : {}), cite: page(row.datesCite) });
    else if (phase === null && record.year !== null) out.push({ check: "dates", level: "warning", message: `${what} is not available in ${num(record.year)}. ${datesText(proto, printed)}.`, ...(where ? { where } : {}), cite: page(row.datesCite) });
    else if (phase === "prototype") out.push({ check: "dates", level: "note", message: `${what} is a prototype in ${String(record.year)}, an Experimental-level item. ${datesText(proto, printed)}.`, ...(where ? { where } : {}), cite: page(row.datesCite) });
  };
  const cls = weightClassOf(record.weightClass);
  if (cls) say(`${cls.label} battle armor`, cls, { field: "weightClass" });
  const armor = ARMOR_TYPES.find((row) => row.id === record.armor.type);
  if (armor && record.armor.points > 0) say(`${armor.label} armor`, armor, { field: "armor" });
  for (const id of new Set([record.manipulators.la, record.manipulators.ra])) {
    const row = MANIPULATORS.find((m) => m.id === id);
    if (row && record.body === "humanoid" && id !== "none") say(row.label, row, { field: "manipulators" });
  }
  const kind = record.motive.kind;
  if (isMotive(kind)) say(MOTIVE[kind].label, MOTIVE[kind], { field: "motive" });
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);
    if (!row) continue;
    const phase = itemPhase(row, record, catalog);
    if (phase === null && record.year !== null) out.push({ check: "dates", level: "warning", message: `${row.name} is not available in ${num(record.year)}.`, where: { mountId: mount.id }, cite: page(row.cite) });
    else if (phase === "prototype") out.push({ check: "dates", level: "note", message: `${row.name} is a prototype in ${String(record.year)}, an Experimental-level item.`, where: { mountId: mount.id }, cite: page(row.cite) });
  }
  return out;
};

/** The lowest rules level that accepts everything on the suit, against the level the record is at. */
const levelCheck: Check = (record, catalog) => {
  const at: RulesLevel = record.rulesLevel ?? "standard";
  let needed: RulesLevel = "standard";
  const raise = (level: RulesLevel) => {
    if (LEVEL_ORDER.indexOf(level) > LEVEL_ORDER.indexOf(needed)) needed = level;
  };
  const dated = [weightClassOf(record.weightClass), record.armor.points > 0 ? armorTypeOf(record.armor.type) : undefined];
  for (const row of dated) if (row) raise(levelIn(row.rulesLevel ?? "standard", phaseOf(row, record)));
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.rowFor(mount.equipmentId, record.editionId);
    if (row) raise(levelIn(equipmentLevel(row), itemPhase(row, record, catalog), row.prototypeLevel));
  }
  return levelAtLeast(at, needed) ? [] : [{ check: "level", level: "error", message: `The suit needs ${levelRow(needed).label} rules and the unit is at ${levelRow(at).label}.`, where: { field: "rulesLevel" } }];
};

/** The design as the mark sees it: everything but the name, notes, picture, level and mark itself. */
export function designKey(record: BaRecord): string {
  const design: Record<string, unknown> = { ...record };
  for (const key of ["name", "notes", "picture", "official", "rulesLevel", "id"]) delete design[key];
  design.mounts = record.mounts.map((m) => canon({ ...m, id: undefined })).sort();
  return canon(design);
}
/** Marks the record OFFICIAL in the named book, keeping the design as it is now. Does nothing without a book. */
export function markOfficial(draft: BaRecord, book: string, pageNumber?: number | null): void {
  const named = book.trim();
  if (!named) return;
  draft.official = { status: "official", book: named, design: designKey(draft), ...(pageNumber !== undefined && pageNumber !== null && Number.isInteger(pageNumber) && pageNumber > 0 ? { page: pageNumber } : {}) };
}
/** OFFICIAL only while the design is the marked one. */
export function officialState(record: BaRecord): OfficialState {
  const mark = record.official;
  const book = mark?.book?.trim();
  if (mark?.status !== "official" || !book || mark.design === undefined) return { official: false };
  if (mark.design !== designKey(record)) return { official: false, changedFrom: book };
  return mark.page === undefined ? { official: true, book } : { official: true, book, page: mark.page };
}
const officialCheck: Check = (record) => {
  const state = officialState(record);
  return !state.official && state.changedFrom !== undefined ? [{ check: "official", level: "note", message: `Marked official, but ${officialLabel(state).detail}.`, where: { field: "official" } }] : [];
};

export const BA_CHECKS: { id: string; run: Check }[] = [
  { id: "type", run: typeCheck }, { id: "year", run: yearCheck }, { id: "weight", run: weightCheck }, { id: "motive", run: motiveCheck }, { id: "manipulators", run: manipulatorCheck }, { id: "armor", run: armorCheck },
  { id: "slots", run: slotCheck }, { id: "equipment", run: equipmentCheck }, { id: "dates", run: datesCheck }, { id: "level", run: levelCheck }, { id: "official", run: officialCheck },
];

/** Every finding for the suit. Never throws: a check that fails on a record it does not understand gives a note. */
export function checkBa(record: BaRecord, catalog: Catalog): BaFinding[] {
  return BA_CHECKS.flatMap((check) => {
    try {
      return check.run(record, catalog);
    } catch {
      return [{ check: check.id, level: "note" as const, message: `The ${check.id} check could not read this suit.` }];
    }
  });
}
