// The conventional infantry record and what is worked out from it: the platoon's size and lines, its damage at each number of troopers,
// range modifiers, movement, weight, cost and Battle Value. A record is plain data; nothing here throws on one it does not understand, and
// keys this version does not know are kept. Rules: TechManual pp. 144-155 with errata v8.0 (see data/infantry-tables.ts).
import { TARGET_MODIFIER } from "../../data/bv";
import { INFANTRY_WEAPON_BV } from "../../data/infantry-bv";
import { ADVANCED_INFANTRY_BV, ANTI_MECH, ARMOR_KITS, BEAST_COST, CREATURE_SIZES, FIELD_GUN_RULES, FORMATIONS, INFANTRY_BV, MOTIVES, RANGE_MODIFIERS, SECONDARY_SLOT_TROOPS, SNEAK_SYSTEMS, SPECIALIST_BASE_TONS, STEALTH_MODIFIERS, WEAPON_RULES, XCT, armorKitOf, beastOf, motiveOf, specializationOf, xctOf } from "../../data/infantry-tables";
import type { ArmorKit, Beast, Formation, Motive, Specialization, XctRow } from "../../data/infantry-tables";
import type { RulesLevel } from "../../data/chassis";
import { bvEntryOf, skillMultiplier, speedFactor } from "../bv";
import type { Catalog, EquipmentRow } from "../catalog";
import { priceOf, roundUpCents } from "../cost";
import { levelAtLeast } from "../levels";
import { roundHalfUp, tidy } from "../walk";

export type InfantryTechBase = "inner-sphere" | "clan";

export interface InfantryRecord {
  schema: 1;
  id: string;
  kind: "infantry";
  /** The edition the unit is built under (data/editions.ts): total-warfare or bcr-tm. */
  editionId: string;
  name: { chassis: string; model: string };
  rulesLevel?: RulesLevel;
  year: number | null;
  era?: string;
  techBase: InfantryTechBase;
  motive: string;
  /** A Formation id (the affiliation): it decides the standard squad and platoon sizes. */
  formation: string;
  squads: number;
  perSquad: number;
  /** Catalog row ids; null is none chosen. */
  primary: string | null;
  secondary: { weapon: string | null; perSquad: number };
  /** An ArmorKit id; null is no armor kit. */
  armor: string | null;
  /** A sneak suit's systems (camo, ir, ecm), as many as the suit has; unset or unusable means the suit's defaults. */
  sneakSystems?: string[];
  antiMech: boolean;
  specializations: string[];
  /** Paramedics and TAG troopers a squad: each replaces one Secondary Weapon trooper, two of the pair a squad at most (TO:AUE p. 153). */
  paramedics: number;
  tagTroops: number;
  /** A Xenoplanetary Condition-Trained environment (XCT_ENVIRONMENTS id); null is not XCT. */
  xct: string | null;
  /** The creature of a beast-mounted platoon (BEASTS id), used when the type is "beast". */
  beast: string | null;
  /** Field guns (TO:AUE p. 122): one catalog row, as many as the platoon has crew for; and one field artillery row. */
  fieldGun: { weapon: string | null; count: number };
  fieldArtillery: string | null;
  skills: { gunnery: number; antiMech: number };
  notes?: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const whole = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback);

/** The standard size a formation gives a motive, as [troopers a squad, squads]; undefined for a motive it has no row for (VTOL). */
export function standardSize(formationId: string, motive: string): [number, number] | undefined {
  const formation: Formation | undefined = FORMATIONS.find((f) => f.id === formationId) ?? FORMATIONS[0];
  const row = motiveOf(motive);
  if (!formation || !row) return undefined;
  if (row.id === "microlite") return [2, 4];
  if (row.id === "microcopter") return [4, 4];
  return formation.sizes[row.id as keyof Formation["sizes"]];
}

export function newInfantryRecord(init: Partial<Pick<InfantryRecord, "editionId" | "rulesLevel" | "year" | "techBase" | "motive" | "formation">> & { name?: string; model?: string }, id: string = crypto.randomUUID()): InfantryRecord {
  const techBase = init.techBase ?? "inner-sphere";
  const formation = init.formation ?? (techBase === "clan" ? "clan" : "generic");
  const motive = init.motive ?? "foot";
  const [perSquad, squads] = standardSize(formation, motive) ?? [4, 4];
  return {
    schema: 1,
    id,
    kind: "infantry",
    editionId: init.editionId ?? "total-warfare",
    name: { chassis: init.name ?? "", model: init.model ?? "" },
    rulesLevel: init.rulesLevel ?? "standard",
    year: init.year ?? null,
    techBase,
    motive,
    formation,
    squads,
    perSquad,
    primary: null,
    secondary: { weapon: null, perSquad: 0 },
    armor: null,
    antiMech: false,
    specializations: [],
    paramedics: 0,
    tagTroops: 0,
    xct: null,
    beast: null,
    fieldGun: { weapon: null, count: 0 },
    fieldArtillery: null,
    skills: { gunnery: 4, antiMech: 5 },
  };
}

/** The squads a beast-mounted platoon starts with: a Very Large or Monstrous beast is a squad of its own (TO:AUE p. 106), a Large creature carries one rider, so the riders are grouped by the usual 7. */
export function beastSize(beast: Beast | undefined): [perSquad: number, squads: number] {
  if (!beast) return [7, 3];
  const size = CREATURE_SIZES[beast.size];
  return size.troops === 1 ? [7, Math.floor(size.creatures / 7)] : [size.troops, size.creatures];
}

/** A record read from storage or a file, with its defaults; undefined when it is not a record at all. Unknown keys stay. */
export function withDefaults(value: unknown, fallbackId: string): InfantryRecord | undefined {
  if (!isObject(value) || value.kind !== "infantry") return undefined;
  const base = newInfantryRecord({}, typeof value.id === "string" && value.id !== "" ? value.id : fallbackId);
  const name = isObject(value.name) ? value.name : {};
  const secondary = isObject(value.secondary) ? value.secondary : {};
  const skills = isObject(value.skills) ? value.skills : {};
  const gun = isObject(value.fieldGun) ? value.fieldGun : {};
  return {
    ...base,
    ...(value as Partial<InfantryRecord>),
    schema: 1,
    kind: "infantry",
    id: base.id,
    name: { chassis: typeof name.chassis === "string" ? name.chassis : "", model: typeof name.model === "string" ? name.model : "" },
    year: typeof value.year === "number" ? value.year : null,
    squads: whole(value.squads, base.squads),
    perSquad: whole(value.perSquad, base.perSquad),
    primary: typeof value.primary === "string" ? value.primary : null,
    secondary: { weapon: typeof secondary.weapon === "string" ? secondary.weapon : null, perSquad: whole(secondary.perSquad, 0) },
    armor: typeof value.armor === "string" ? value.armor : null,
    ...(Array.isArray(value.sneakSystems) ? { sneakSystems: value.sneakSystems.filter((s): s is string => typeof s === "string") } : {}),
    specializations: Array.isArray(value.specializations) ? value.specializations.filter((s): s is string => typeof s === "string") : [],
    skills: { gunnery: whole(skills.gunnery, 4), antiMech: whole(skills.antiMech, 5) },
    antiMech: typeof value.antiMech === "boolean" ? value.antiMech : base.antiMech,
    paramedics: whole(value.paramedics, 0),
    tagTroops: whole(value.tagTroops, 0),
    xct: typeof value.xct === "string" ? value.xct : null,
    beast: typeof value.beast === "string" ? value.beast : null,
    fieldGun: { weapon: typeof gun.weapon === "string" ? gun.weapon : null, count: whole(gun.count, 0) },
    fieldArtillery: typeof value.fieldArtillery === "string" ? value.fieldArtillery : null,
  };
}

/** The location codes of the platoon's lines: `pl` for one line, `pl1`, `pl2`... for sub-platoons. */
export const lineCode = (index: number, lines: number): string => (lines === 1 ? "pl" : `pl${String(index + 1)}`);

export interface Platoon {
  motive: Motive | undefined;
  specializations: Specialization[];
  armor: ArmorKit | undefined;
  beast: Beast | undefined;
  /** Creatures a beast-mounted platoon rides (one a trooper on a Large creature, one a squad on a larger one). */
  creatures: number;
  xct: XctRow | undefined;
  /** Paramedics and TAG troopers in the platoon, after the squads' two secondary slots are shared out. */
  medics: number;
  tagTroopers: number;
  fieldGun: EquipmentRow | undefined;
  fieldGuns: number;
  /** Troopers one field gun, or the field artillery piece, needs to operate. */
  gunCrew: number;
  fieldArtillery: EquipmentRow | undefined;
  /** The damage divisor on what the platoon takes: the armor kit's times the creature's. */
  divisor: number;
  /** The systems of a sneak suit (empty for any other kit): the player's choice, else the suit's defaults. */
  sneakSystems: string[];
  primary: EquipmentRow | undefined;
  secondary: EquipmentRow | undefined;
  troopers: number;
  /** Troopers on each record sheet line: the platoon divided as evenly as possible into lines of at most the motive's maximum, odd troopers to the first. */
  lines: number[];
  secondaryTroopers: number;
  primaryTroopers: number;
  /** The most Secondary Weapons a squad can carry: the crew limit and 2 (TM p. 152). */
  secondaryLimit: number;
  /** The damage a primary trooper delivers, held to 0.60 (errata v8.0). */
  primaryDamage: number;
  capped: boolean;
  totalDamage: number;
  perTrooper: number;
  /** The platoon's damage at 1, 2, ... troopers of the longest line. */
  damageAt: number[];
  /** The weapon whose Base Range and damage type govern the platoon's attack. */
  ruling: EquipmentRow | undefined;
  baseRange: number;
  /** To-hit modifier by hexes 0 to the end of the range (null beyond); the same-hex entry carries the point-blank, heavy burst and crew adjustments. */
  rangeMods: number[];
  heavyBurst: boolean;
  specials: string[];
  mp: number;
  mpType: string;
  moveOrShoot: boolean;
  weight: number;
  linesWeight: number[];
  perTroopTons: number;
}

const crewNumber = (row: EquipmentRow | undefined): number => Math.max(1, parseInt(row?.infantry?.crew ?? "1", 10) || 1);
const flagsOf = (row: EquipmentRow | undefined): string => row?.infantry?.flags ?? "";
const halfTon = (x: number): number => Math.ceil(tidy(x * 2)) / 2;

/** Splits n troopers into the fewest lines of at most `max`, as evenly as possible, odd troopers to the first (TM p. 146). */
export function splitLines(troopers: number, max: number): number[] {
  if (troopers <= 0 || max <= 0) return [];
  const count = Math.ceil(troopers / max);
  const base = Math.floor(troopers / count);
  const extra = troopers - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

/** The systems a sneak suit carries: the chosen ones, no more than the suit has; the suit's defaults when none of the choice is usable. A stored choice longer than the suit's count is cut in table order (camo, IR, ECM), so a switch to sneak-1 keeps the first system of the choice, not the default. */
export function sneakSystemsOf(kit: ArmorKit | undefined, chosen: string[] | undefined): string[] {
  if (!kit?.systems) return [];
  const picked = SNEAK_SYSTEMS.filter((id) => chosen?.includes(id)).slice(0, kit.systems);
  return picked.length > 0 ? picked : (kit.defaultSystems ?? []);
}

export function platoonOf(record: InfantryRecord, catalog: Catalog): Platoon {
  const motive = motiveOf(record.motive);
  const specs = record.specializations.flatMap((id) => specializationOf(id) ?? []);
  const armor = record.armor === null ? undefined : armorKitOf(record.armor);
  const primary = record.primary === null ? undefined : catalog.byId(record.primary);
  const secondary = record.secondary.weapon === null ? undefined : catalog.byId(record.secondary.weapon);
  const beast = record.motive === "beast" && record.beast !== null ? beastOf(record.beast) : undefined;
  const xct = record.xct === null ? undefined : xctOf(record.xct);
  const fieldGun = record.fieldGun.weapon === null ? undefined : catalog.byId(record.fieldGun.weapon);
  const fieldArtillery = record.fieldArtillery === null ? undefined : catalog.byId(record.fieldArtillery);
  const troopers = record.squads * record.perSquad;
  // Paramedics and TAG troopers each take one of a squad's two secondary slots (TO:AUE p. 153); medics first.
  const slot = SECONDARY_SLOT_TROOPS.perSquad;
  const medicsPerSquad = Math.min(slot, record.paramedics);
  const tagPerSquad = Math.min(slot - medicsPerSquad, record.tagTroops);
  const medics = Math.min(troopers, medicsPerSquad * record.squads);
  const tagTroopers = Math.min(troopers, tagPerSquad * record.squads);
  // A specialty's platoon ceiling holds the whole platoon to one line of that size (the most restrictive wins).
  const lineMax = Math.min(motive?.maxPlatoon ?? 30, ...specs.flatMap((s) => (s.maxPlatoon ? [s.maxPlatoon[0]] : [])));
  const lines = splitLines(troopers, lineMax);
  const perSquadSecondary = secondary ? Math.max(0, Math.min(record.secondary.perSquad, WEAPON_RULES.maxSecondaryPerSquad, slot - medicsPerSquad - tagPerSquad)) : 0;
  const secondaryTroopers = Math.min(troopers, perSquadSecondary * record.squads);
  // A medic carries no weapon and gives no damage; a TAG trooper still fires his own weapon.
  const primaryTroopers = Math.max(0, troopers - secondaryTroopers - medics);
  const rawPrimary = primary?.infantry?.damage ?? 0;
  const capped = rawPrimary > WEAPON_RULES.primaryDamageCap;
  const primaryDamage = Math.min(rawPrimary, WEAPON_RULES.primaryDamageCap);
  const raw = primaryTroopers * primaryDamage + secondaryTroopers * (secondary?.infantry?.damage ?? 0);
  const totalDamage = troopers === 0 ? 0 : roundHalfUp(raw);
  const perTrooper = troopers === 0 ? 0 : totalDamage / troopers;
  const longest = Math.max(0, ...lines);
  const damageAt = Array.from({ length: longest }, (_, i) => roundHalfUp((i + 1) * perTrooper));

  const ruling = perSquadSecondary >= 2 && secondary ? secondary : primary;
  const baseRange = Math.min(7, Math.max(0, ruling?.infantry?.baseRange ?? 0));
  const table = RANGE_MODIFIERS[baseRange] ?? [0];
  // Same-hex adjustments (TM p. 149): point-blank +1, heavy burst -1, crew other than 1 +1.
  const burstSecondary = perSquadSecondary >= 2 && flagsOf(secondary).includes("B");
  const heavyBurst = (primaryTroopers > 0 && (capped || flagsOf(primary).includes("B"))) || burstSecondary;
  const crewed = (row: EquipmentRow | undefined) => (row?.infantry?.crew ?? "1") !== "1";
  // Point-blank weapons add their +1 at hex 0 whichever weapon sets the range (TM p. 152).
  const pointBlank = (primaryTroopers > 0 && primary?.infantry?.damageType === "P") || (perSquadSecondary >= 1 && secondary?.infantry?.damageType === "P") ? 1 : 0;
  // Heavy Burst's -1 at hex 0 holds when the burst weapon is the one that sets the range; its damage bonus holds either way.
  const burstSetsRange = ruling === primary ? primaryTroopers > 0 && (capped || flagsOf(primary).includes("B")) : burstSecondary;
  const crew = (primaryTroopers > 0 && crewed(primary)) || (perSquadSecondary >= 1 && crewed(secondary)) ? 1 : 0;
  const sameHex = (table[0] ?? 0) + pointBlank + crew - (burstSetsRange ? 1 : 0);
  const rangeMods = table.map((m, i) => (i === 0 ? sameHex : m));

  const specials: string[] = [];
  const used = [primaryTroopers > 0 ? primary : undefined, perSquadSecondary >= 1 ? secondary : undefined];
  if (used.some((r) => flagsOf(r).includes("A"))) specials.push("Anti-aircraft");
  if (heavyBurst) specials.push("Heavy burst (+1D6 against conventional infantry)");
  if (used.some((r) => flagsOf(r).includes("F"))) specials.push("Flame (damage may be applied as heat)");
  if (flagsOf(ruling).includes("N")) specials.push("Non-penetrating");
  if (beast) {
    const size = CREATURE_SIZES[beast.size];
    if (beast.bonusInfantry > 0 || beast.bonusOther > 0) specials.push(`${beast.name} mounts add ${beast.bonusInfantry > 0 ? `${String(beast.bonusInfantry)}D6` : "0"} damage against infantry and ${String(beast.bonusOther)} against other units at point-blank range`);
    if (size.attackerToHit !== 0) specials.push(`Attackers ${size.attackerToHit < 0 ? "" : "+"}${String(size.attackerToHit)} to hit (${beast.size} creatures)`);
    if (beast.divisor > 1) specials.push(`Damage divisor ${String(beast.divisor)} (creatures)`);
  }
  if (tagTroopers > 0) specials.push(`TAG troops: TAG attacks at ${SECONDARY_SLOT_TROOPS.tag.range.join("/")} hexes`);
  if (medics > 0) specials.push(`Paramedics: ${String(medics)} (tend up to 5 wounded each, TO:AUE p. 153)`);
  if (xct) specials.push(`Condition-trained: ${xct.label.toLowerCase()}`);

  // Movement
  const own = specs.find((s) => s.mp !== null);
  let mp = own?.mp ?? beast?.mp ?? motive?.mp ?? 0;
  let mpType = own?.mpType ?? (beast ? (beast.mpType === "Submarine" ? "Sub" : beast.mpType) : motive?.mpType) ?? "";
  // Very Large and Monstrous creatures carry their Support Weapons with no MP loss (TO:AUE p. 106).
  const twoSupport = secondary?.infantry?.mode === "Support" && perSquadSecondary >= 2 && !(beast && beast.size !== "Large");
  let moveOrShoot = false;
  if (twoSupport) {
    if (record.motive === "foot") moveOrShoot = true;
    else if (record.motive !== "tracked") mp -= 1;
  }
  if (record.motive === "microcopter" && secondary?.infantry?.mode === "Support" && perSquadSecondary >= 1) mp -= 1;
  if (armor?.encumbering) mp -= 1;
  const particle = [primary, secondary].some((r) => r !== undefined && /particle-cannon-support/.test(r.id));
  if (particle && mp > 2) mp = 2;
  mp = Math.max(motive || own ? 1 : 0, mp);
  // A platoon with field artillery moves as motorized infantry with 1 MP (TO:AUE p. 123).
  if (fieldArtillery) {
    mp = FIELD_GUN_RULES.artilleryMp;
    mpType = "Ground";
  }

  // Weight (TM p. 155 with errata v8.0; specialists TO:AUE p. 152)
  const mechanized = motive?.mechanized ?? false;
  let perTroop: number;
  if (specs.length > 0) {
    const base = specs.some((s) => s.id === "combat-engineers" || s.id === "marines") ? SPECIALIST_BASE_TONS[(motive?.id ?? "foot")] : 0.1;
    perTroop = base + specs.reduce((sum, s) => sum + s.addedTons, 0);
  } else perTroop = (motive?.weight ?? 0) + (record.antiMech && !mechanized ? ANTI_MECH.kitTons : 0);
  const tonsOf = (row: EquipmentRow | undefined): number => (typeof row?.tons === "number" ? row.tons : 0);
  const gunCrew = Math.max(FIELD_GUN_RULES.minCrew, Math.ceil(tonsOf(fieldGun)), fieldGun ? 0 : Math.ceil(tonsOf(fieldArtillery)));
  const fieldGuns = fieldGun ? record.fieldGun.count : 0;
  // A beast adds its own weight to each rider's 0.2 t; a medic carries 0.05 t of gear; each field gun, and the artillery piece, brings its own tons and one ton of ammunition (TO:AUE pp. 107, 123, 153).
  const creatures = beast ? Math.ceil(troopers / CREATURE_SIZES[beast.size].troops) : 0;
  const extra = creatures * (beast?.weight ?? 0) + medics * SECONDARY_SLOT_TROOPS.paramedic.addedTons + fieldGuns * (tonsOf(fieldGun) + FIELD_GUN_RULES.ammoTons) + (fieldArtillery ? tonsOf(fieldArtillery) + FIELD_GUN_RULES.ammoTons : 0);
  const weight = halfTon(troopers * perTroop + extra);
  const linesWeight = lines.map((n) => (troopers === 0 ? 0 : tidy(weight * (n / troopers))));
  return {
    motive,
    specializations: specs,
    armor,
    beast,
    creatures,
    xct,
    medics,
    tagTroopers,
    fieldGun,
    fieldGuns,
    gunCrew,
    fieldArtillery,
    divisor: (armor?.divisor ?? 1) * (beast?.divisor ?? 1),
    sneakSystems: sneakSystemsOf(armor, record.sneakSystems),
    primary,
    secondary,
    troopers,
    lines,
    secondaryTroopers,
    primaryTroopers,
    secondaryLimit: secondary ? Math.min(WEAPON_RULES.maxSecondaryPerSquad, Math.floor(record.perSquad / crewNumber(secondary))) : 0,
    primaryDamage,
    capped,
    totalDamage,
    perTrooper,
    damageAt,
    ruling,
    baseRange,
    rangeMods,
    heavyBurst,
    specials,
    mp,
    mpType,
    moveOrShoot,
    weight,
    linesWeight,
    perTroopTons: tidy(perTroop),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Cost (TechManual p. 276 and the Base Conventional Infantry Costs table, p. 282; specialties TO:AUE p. 225)
// ---------------------------------------------------------------------------------------------------------------
export interface InfantryCost {
  total: number;
  perTrooper: number;
  notes: string[];
  unpriced: string[];
}
const priceNumber = (row: EquipmentRow | undefined): number | undefined => {
  const found = row ? priceOf(row) : undefined;
  return typeof found?.price === "number" ? found.price : undefined;
};

/** A trooper costs 2,000 x the square root of his weapon's price, times the motive's factor (and 5 for the anti-'Mech kit); the platoon is the sum
 * plus the armor kit's price for each trooper, times each specialty's factor. The book does not say whether a Secondary Weapon operator pays for
 * his Secondary or his Primary Weapon: he is costed with the Secondary (as his damage is). */
export function infantryCost(record: InfantryRecord, catalog: Catalog): InfantryCost {
  const p = platoonOf(record, catalog);
  const notes: string[] = [];
  const unpriced: string[] = [];
  const primaryPrice = priceNumber(p.primary);
  const secondaryPrice = priceNumber(p.secondary);
  if (p.primary && primaryPrice === undefined) unpriced.push(p.primary.name);
  if (p.secondary && secondaryPrice === undefined) unpriced.push(p.secondary.name);
  const trooper = (price: number | undefined) => 2000 * Math.sqrt(price ?? 0);
  const factor = (p.motive?.costFactor ?? 1) * (record.antiMech && !(p.motive?.mechanized ?? false) ? ANTI_MECH.costFactor : 1);
  let total = (p.primaryTroopers * trooper(primaryPrice) + p.secondaryTroopers * trooper(secondaryPrice)) * factor;
  // The kit is priced for each trooper and sits inside the total the specialty factors (the "TC" of TO:AUE p. 225) multiply.
  if (p.armor) total += p.armor.cost * p.troopers;
  // Beast-mounted infantry: 5,000 C-bills a ton of the unit (TO:AUE p. 225, "5,000xTT"), counted in the unit cost the factors below multiply.
  if (p.beast) {
    total += BEAST_COST.perTon * p.weight;
    notes.push("Beast-mounted infantry add 5,000 C-bills a ton of the whole unit, riders and creatures; the page prints no other cost for them.");
  }
  for (const s of p.specializations) total *= s.costFactor;
  if (p.xct) total *= XCT.costFactor;
  if (p.armor) notes.push("The armor kit's price is added for each trooper before the specialty factors; the books do not say so in words (owner question).");
  if (p.specializations.some((s) => s.id === "scuba-mechanized")) notes.push("Mechanized SCUBA has no cost factor in the book, so it is priced at the base.");
  if (p.tagTroopers > 0) notes.push("TAG troops have no cost factor in the book, so they are priced at the base.");
  // Field guns and field artillery are "as weapon" (TO:AUE p. 225): the weapon's price and a ton of its ammunition, added after the platoon's cost; the page gives no multiplier.
  const ammoPrice = (row: EquipmentRow): number | undefined => priceNumber(catalog.byId(bvEntryOf(row.id)?.options.ammo?.[0] ?? `ammo-${row.id}`));
  for (const [row, count] of [[p.fieldGun, p.fieldGuns], [p.fieldArtillery, p.fieldArtillery ? 1 : 0]] as const) {
    if (!row || count === 0) continue;
    const gun = priceNumber(row);
    const ammo = ammoPrice(row);
    if (gun === undefined) unpriced.push(row.name);
    if (ammo === undefined) unpriced.push(`${row.name} ammunition`);
    total += count * ((gun ?? 0) + (ammo ?? 0));
  }
  // Paramedics: TC x 0.375 for each medic, added after everything else is final (TO:AUE p. 225). The page says "TC" is the total unit cost; the medics' own cost is read that way, not as a share of one trooper's (owner question).
  if (p.medics > 0) {
    total += p.medics * SECONDARY_SLOT_TROOPS.paramedic.costFactor * total;
    notes.push("Each paramedic adds 0.375 of the platoon's total cost, as the table prints it.");
  }
  return { total: roundUpCents(total), perTrooper: p.troopers === 0 ? 0 : roundUpCents(total / p.troopers), notes, unpriced };
}

// ---------------------------------------------------------------------------------------------------------------
// Battle Value (TechManual Battle Value v4.1 p. 309, with the Conventional Infantry Weapons BV Table)
// ---------------------------------------------------------------------------------------------------------------
export interface InfantryBv {
  bv: number | undefined;
  defensive: number;
  offensive: number;
  weaponBv: number;
  speed: number;
  targetModifier: number;
  skill: number;
  /** The Unit Type Modifier applied: 1 unless the Advanced rules apply (see infantryBv). */
  unitType: number;
  unvalued: string[];
}
const stemOf = (id: string): string => id.replace(/-(is|clan)$/, "");
const bvOf = (row: EquipmentRow | undefined): number | undefined => (row ? INFANTRY_WEAPON_BV[stemOf(row.id)] : undefined);

export function infantryBv(record: InfantryRecord, catalog: Catalog): InfantryBv {
  const p = platoonOf(record, catalog);
  const unvalued: string[] = [];
  for (const row of [p.primary, p.secondary]) if (row && bvOf(row) === undefined) unvalued.push(row.name);
  const jumper = p.mpType === "Jump";
  const band = TARGET_MODIFIER.bands.find(([most]) => p.mp <= most);
  const targetModifier = (band?.[1] ?? 0) + (jumper ? TARGET_MODIFIER.jumpBonus : 0);
  const mechanized = p.motive?.mechanized ?? false;
  // With an armor kit or a specialty the Advanced infantry rules apply (TO:AUE pp. 191, 193); a platoon is not worked out only when a weapon has no Battle Value in our table.
  const advanced = p.armor !== undefined || p.specializations.length > 0 || p.beast !== undefined || p.xct !== undefined;
  const divisor = advanced ? p.divisor : 1;
  // A sneak suit adds each chosen system's bonus (TO:AUE p. 191, cumulative); the DEST suit has its own.
  const stealth = p.armor?.systems ? p.sneakSystems.reduce((sum, id) => sum + (STEALTH_MODIFIERS.find((m) => m.id === id)?.bv ?? 0), 0) : (p.armor?.bvStealth ?? 0);
  const defensive = p.troopers * divisor * INFANTRY_BV.perTrooper * (1 + targetModifier / 10 + stealth);
  const single = p.primaryTroopers * (bvOf(p.primary) ?? 0) + p.secondaryTroopers * (bvOf(p.secondary) ?? 0);
  // A platoon with field guns cannot make anti-'Mech attacks (TO:AUE p. 123), nor can a Monstrous creature's riders (p. 108), so they are treated as the mechanized are.
  const noAntiMech = mechanized || p.fieldGuns > 0 || p.beast?.size === "Monstrous";
  // The books print no Battle Value for a field gun or artillery piece: it counts as the vehicle weapon it is (the weapon's BV and a ton of its ammunition), at the platoon's speed factor.
  let field = 0;
  for (const [row, count] of [[p.fieldGun, p.fieldGuns], [p.fieldArtillery, p.fieldArtillery ? 1 : 0]] as const) {
    if (!row || count === 0) continue;
    const entry = bvEntryOf(row.id);
    if (entry === undefined) unvalued.push(row.name);
    else field += count * (entry.bv + (entry.ammoBv ?? 0) * FIELD_GUN_RULES.ammoTons);
  }
  const weaponBv = (noAntiMech ? single : single * 2) + field; // all other infantry can make anti-'Mech attacks: the weapons count again
  const speed = speedFactor(p.mp);
  const offensive = weaponBv * speed;
  // Mechanized infantry use the 5 column and change only Gunnery (BV v4.1 p. 314; errata v8.0 for TM p. 155 drops the fixed 8 for them); other platoons without the kit are fixed at 8.
  const antiMechSkill = noAntiMech ? 5 : record.antiMech ? record.skills.antiMech : ANTI_MECH.defaultSkill;
  const skill = skillMultiplier({ gunnery: record.skills.gunnery, piloting: antiMechSkill });
  // Unit Type Modifier (TO:AUE p. 193; owner ruling, 2026-11-27): a mechanized platoon takes the row of its motive (Tracked 0.9, Wheeled 0.8, Hover 0.7, VTOL 0.7); a motive with no row (foot,
  // motorized, jump, beast-mounted) takes 1.0. The specialties' modifiers and the XCT troops' 0.1 are added. The Naval (0.6) and WiGE (0.7) rows match no infantry motive, so they are not applied.
  const unitType = advanced ? (p.motive?.unitType ?? 1) + p.specializations.reduce((sum, s) => sum + s.bvModifier, 0) + (p.xct ? XCT.bvModifier : 0) : 1;
  const worked = unvalued.length === 0 && p.primary !== undefined;
  return { bv: worked ? roundHalfUp((defensive + offensive) * unitType * skill) : undefined, defensive, offensive, weaponBv, speed, targetModifier, skill, unitType, unvalued };
}

/** Hide, do not mark: an Advanced option is offered from the Advanced rules level and from its year; one the record already holds stays listed (the rules check reports it). */
export function offered(level: RulesLevel, year: number | null, option: { year?: number }, held = false): boolean {
  return held || (levelAtLeast(level, "advanced") && (year === null || option.year === undefined || option.year <= year));
}

/** The armor kits a tech base and year may use (Advanced). */
export function armorKitsFor(techBase: InfantryTechBase, year: number | null): ArmorKit[] {
  return ARMOR_KITS.filter((k) => (k.techBase === "both" || k.techBase === techBase) && (year === null || k.year <= year));
}
export { ADVANCED_INFANTRY_BV, MOTIVES };
