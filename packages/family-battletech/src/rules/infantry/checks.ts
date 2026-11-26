// The conventional infantry rules check: advice, never a refusal. Each finding names the printed page its rule rests on.
import { CREATURE_SIZES, FIELD_ARTILLERY_ID, FIELD_GUN_ID, FIELD_GUN_RULES, SECONDARY_SLOT_TROOPS, WEAPON_RULES, XCT, armorKitOf, specializationOf, xctOf } from "../../data/infantry-tables";
import type { Catalog } from "../catalog";
import { DEFAULT_LEVEL, equipmentLevel, levelAtLeast, levelRow } from "../levels";
import { yearEraFindings } from "../checks";
import { infantryBv, infantryCost, platoonOf } from "./platoon";
import type { InfantryRecord } from "./platoon";

export interface InfantryFinding {
  level: "error" | "warning" | "note";
  check: string;
  message: string;
  cite?: string;
  where?: { field: string };
}

const TM = "TechManual";
const TO = "Tactical Operations: Advanced Units and Equipment";
const at = (book: string, page: number) => `${book}, p. ${String(page)}`;

export function checkInfantry(record: InfantryRecord, catalog: Catalog): InfantryFinding[] {
  const found: InfantryFinding[] = [];
  const add = (level: InfantryFinding["level"], check: string, message: string, cite?: string, field?: string) => found.push({ level, check, message, cite, where: field ? { field } : undefined });
  const p = platoonOf(record, catalog);
  const level = record.rulesLevel ?? DEFAULT_LEVEL;
  const m = p.motive;
  const mechanized = m?.mechanized ?? false;

  if (level === "introductory") add("error", "introductory-infantry", "Infantry is Level Two: it is not used at the Introductory level.", at("Total Warfare", 9), "rulesLevel");
  for (const f of yearEraFindings(record, level, "platoon")) found.push({ level: f.level, check: "year", message: f.message, cite: f.cite ? at(f.cite.book, f.cite.page) : undefined, where: f.where?.field ? { field: f.where.field } : undefined });
  if (!m) add("error", "motive", `The platoon type "${record.motive}" is not one this app knows.`, at(TM, 145), "motive");
  if (m && !levelAtLeast(level, m.level)) add("error", "motive-level", `${m.label} infantry is an Advanced option.`, at(m.cite.book, m.cite.page), "motive");
  if (m?.year !== undefined && record.year !== null && record.year < m.year) add("warning", "motive-year", `${m.label} infantry appears in ${String(m.year)}.`, at(m.cite.book, m.cite.page), "motive");

  if (m) {
    if (record.perSquad > m.maxSquad) add("error", "squad", `A ${m.label.toLowerCase()} squad holds at most ${String(m.maxSquad)} troopers.`, at(TM, 145), "perSquad");
    if (record.perSquad < 1 || record.squads < 1) add("error", "size", "The platoon needs at least one squad of one trooper.", undefined, "squads");
    if (record.squads > 5 * p.lines.length && p.lines.length > 0) add("warning", "squads", "A platoon or sub-platoon has at most 5 squads.", at(TM, 146), "squads");
    if (p.lines.length > 1) add("note", "sub-platoons", `The platoon is over the ${String(m.maxPlatoon)}-trooper line and plays as ${String(p.lines.length)} sub-platoons of ${[...new Set(p.lines)].join(" and ")}.`, at(TM, 146));
  }

  if (record.motive === "beast") {
    const b = p.beast;
    if (!b) add("warning", "beast-unknown", record.beast === null ? "No creature is chosen for the beast-mounted platoon." : "The creature is not in our table.", at("Tactical Operations: Advanced Units and Equipment", 106), "beast");
    else {
      const size = CREATURE_SIZES[b.size];
      if (p.creatures > size.creatures) add("error", "beast-creatures", `A platoon rides at most ${String(size.creatures)} ${b.size} creatures, so at most ${String(size.creatures * size.troops)} troopers.`, at("Tactical Operations: Advanced Units and Equipment", 106), "squads");
      if (size.troops > 1 && record.perSquad !== size.troops) add("warning", "beast-squad", `Each ${b.size} creature is a squad of its own and carries ${String(size.troops)} troopers.`, at("Tactical Operations: Advanced Units and Equipment", 106), "perSquad");
      const support = p.secondary?.infantry?.mode === "Support";
      if (support && record.secondary.perSquad > size.supportPerCreature) add("error", "beast-support", size.supportPerCreature === 0 ? "Troopers on Large creatures may not carry support weapons." : `A ${b.size} creature carries at most ${String(size.supportPerCreature)} support weapons.`, at("Tactical Operations: Advanced Units and Equipment", 106), "secondary");
      if (record.antiMech && b.size === "Monstrous") add("warning", "beast-anti-mech", "Riders of Monstrous creatures may not make anti-'Mech attacks, so the kit does nothing.", at("Tactical Operations: Advanced Units and Equipment", 108), "antiMech");
      if (p.xct?.id === "vacuum" || p.xct?.id === "toxic") add("error", "xct-beast", "XCT troops may not be beast-mounted if they are to operate in vacuum or trace atmospheres.", at("Tactical Operations: Advanced Units and Equipment", 162), "xct");
    }
  }

  const primary = p.primary;
  if (record.primary === null) add("warning", "primary", "No primary weapon is chosen.", at(TM, 151), "primary");
  else if (!primary) add("warning", "primary-unknown", "The primary weapon is not in our table.", undefined, "primary");
  if (primary?.infantry) {
    if (primary.infantry.mode === "Support") add("error", "primary-type", `${primary.name} is a Support weapon, which only a Secondary Weapon may be.`, at(TM, 148), "primary");
    if (mechanized && (primary.infantry.mode === "Melee" || primary.infantry.damageType === "P")) add("error", "mechanized-melee", "Mechanized infantry may not use Melee or point-blank weapons.", at(TM, 148), "primary");
  }
  const secondary = p.secondary;
  if (secondary?.infantry) {
    if (record.secondary.perSquad < 1) add("warning", "secondary-count", "A Secondary Weapon is chosen but none are assigned to a squad.", at(TM, 151), "secondary");
    if (record.secondary.perSquad > p.secondaryLimit) add("error", "secondary-limit", `A squad of ${String(record.perSquad)} may carry ${String(p.secondaryLimit)} of ${secondary.name} (2 a squad at most, and one a crew of ${secondary.infantry.crew} allows).`, at(TM, 152), "secondary");
    if (primary?.infantry?.mode === "Melee" && secondary.infantry.mode === "Support") add("error", "melee-support", "A platoon with a Melee primary weapon may take only a Melee or Standard Secondary Weapon.", at(TM, 152), "secondary");
    if (record.motive === "microlite") add("error", "microlite-support", "Microlite VTOL platoons carry no Support Weapons.", at(TO, 136), "secondary");
    if (record.motive === "microcopter" && record.secondary.perSquad > 1) add("error", "microcopter-support", "Micro-copter VTOL platoons carry at most 1 Support Weapon a squad.", at(TO, 136), "secondary");
  } else if (record.secondary.weapon !== null) add("warning", "secondary-unknown", "The secondary weapon is not in our table.", undefined, "secondary");
  for (const row of [primary, secondary]) {
    if (!row) continue;
    const wanted = record.techBase === "clan" ? "clan" : "inner-sphere";
    if (row.techBase !== wanted) add("error", "weapon-tech", `${row.name} is ${row.techBase === "clan" ? "Clan" : "Inner Sphere"} equipment on a ${wanted === "clan" ? "Clan" : "Inner Sphere"} platoon.`, at(TM, 147), row === primary ? "primary" : "secondary");
    if (record.year !== null && !catalog.available(row, record.editionId, record.year)) add("warning", "weapon-year", `${row.name} is not available in ${String(record.year)}.`, at(row.cite.book, row.cite.page), row === primary ? "primary" : "secondary");
    if (!levelAtLeast(level, equipmentLevel(row))) add("warning", "weapon-level", `${row.name} needs ${levelRow(equipmentLevel(row)).label} rules or higher.`, at(row.cite.book, row.cite.page));
    if (/particle-cannon-support/.test(row.id) && record.motive !== "motorized" && record.motive !== "tracked") add("error", "particle-cannon", "The Support Particle Cannon may only be used by motorized and tracked mechanized platoons.", at(TM, 352));
  }
  if (p.capped) add("note", "primary-cap", `A primary weapon delivers at most ${String(WEAPON_RULES.primaryDamageCap)} damage a trooper; ${primary?.name ?? "the weapon"} is held to it and the platoon gains Heavy Burst.`, at(TM, 150));

  if (record.armor !== null) {
    const kit = armorKitOf(record.armor);
    if (!kit) add("warning", "armor-unknown", "The armor kit is not in our table.", at(TO, 129), "armor");
    else {
      if (!levelAtLeast(level, "advanced")) add("error", "armor-level", "Infantry armor kits are an Advanced option.", at(TO, 129), "armor");
      if (kit.techBase !== "both" && kit.techBase !== record.techBase) add("error", "armor-tech", `${kit.name} is not available to this tech base.`, at(TO, 130), "armor");
      if (record.year !== null && kit.year > record.year) add("warning", "armor-year", `${kit.name} was introduced in ${String(kit.year)}.`, at(kit.cite.book, kit.cite.page), "armor");
      if (kit.encumbering && record.antiMech && !mechanized) add("warning", "armor-anti-mech", "Encumbering armor prevents anti-'Mech Leg and Swarm attacks, so the anti-'Mech kit is wasted.", at(TO, 130), "armor");
    }
  }
  if (record.antiMech && mechanized) add("warning", "anti-mech-mechanized", "Mechanized platoons cannot make anti-'Mech attacks, so the kit does nothing.", at(TM, 155), "antiMech");
  if (record.specializations.length > 0) {
    if (!levelAtLeast(level, "advanced")) add("error", "spec-level", "Specialized infantry is an Advanced option, for Veteran troops or better.", at(TO, 152), "specializations");
    for (const id of record.specializations) {
      const spec = specializationOf(id);
      if (!spec) add("warning", "spec-unknown", `Specialty "${id}" is not in our table.`, at(TO, 153));
      else {
        if (spec.motives && m && !spec.motives.includes(m.id)) add("error", "spec-motive", `${spec.name} needs ${spec.motives.map((x) => x).join(" or ")} infantry.`, at(TO, 153), "specializations");
        if (spec.maxSquad !== null && record.perSquad > spec.maxSquad) add("error", "spec-squad", `${spec.name} squads hold at most ${String(spec.maxSquad)} troopers.`, at(TO, 153), "perSquad");
        if (spec.maxSecondary !== null && record.secondary.perSquad > spec.maxSecondary) add("error", "spec-secondary", `${spec.name} carry at most ${String(spec.maxSecondary)} Secondary Weapons a squad.`, at(TO, 153), "secondary");
        if (spec.year !== undefined && record.year !== null && record.year < spec.year) add("warning", "spec-year", `${spec.name} appear in ${String(spec.year)}.`, at(TO, 225), "specializations");
      }
    }
  }
  const medicTags = record.paramedics > 0 || record.tagTroops > 0;
  if (medicTags) {
    if (!levelAtLeast(level, "advanced")) add("error", "medic-level", "Paramedics and TAG troops are an Advanced option.", at(TO, 153), "paramedics");
    if (record.paramedics + record.tagTroops > SECONDARY_SLOT_TROOPS.perSquad) add("warning", "medic-squad", `A squad has at most ${String(SECONDARY_SLOT_TROOPS.perSquad)} paramedics and TAG troops together; the extra are left out.`, at(TO, 153), "paramedics");
    else if (p.secondary && record.secondary.perSquad + record.paramedics + record.tagTroops > SECONDARY_SLOT_TROOPS.perSquad) add("warning", "medic-secondary", "Paramedics and TAG troops each replace a Secondary Weapon trooper, so the squad's Secondary Weapons are cut to fit.", at(TO, 153), "secondary");
    if (record.tagTroops > 0 && record.tagTroops < SECONDARY_SLOT_TROOPS.tag.minPerSquad) add("warning", "tag-minimum", `TAG troops only function when ${String(SECONDARY_SLOT_TROOPS.tag.minPerSquad)} are assigned to a squad.`, at(TO, 153), "tagTroops");
  }
  if (record.xct !== null) {
    const env = xctOf(record.xct);
    if (!levelAtLeast(level, "advanced")) add("error", "xct-level", "Xenoplanetary Condition-Trained troops are an Advanced option.", at(TO, 163), "xct");
    if (record.year !== null && record.year < XCT.year) add("warning", "xct-year", `XCT troops appear in ${String(XCT.year)}.`, at(TO, 163), "xct");
    if (!env) add("warning", "xct-unknown", "The XCT environment is not in our table.", at(TO, 162), "xct");
    else {
      if (record.armor === null || !env.armor.includes(record.armor)) add("error", "xct-armor", `XCT troops for ${env.label.toLowerCase()} must wear one of: ${env.armor.map((id) => armorKitOf(id)?.name ?? id).join(", ")}.`, at(TO, 162), "armor");
      if ((env.id === "vacuum" || env.id === "toxic") && (record.motive === "microlite" || record.motive === "microcopter")) add("error", "xct-vtol", "XCT troops may not be mechanized VTOL infantry if they are to operate in vacuum or trace atmospheres.", at(TO, 162), "xct");
    }
  }
  const gunRow = p.fieldGun;
  const artRow = p.fieldArtillery;
  if (record.fieldGun.weapon !== null || record.fieldArtillery !== null) {
    const FP = FIELD_GUN_RULES.cite;
    if (!levelAtLeast(level, "advanced")) add("error", "field-level", "Field guns and field artillery are an Advanced option.", at(FP.book, FP.page), "fieldGun");
    if (m && !FIELD_GUN_RULES.motives.includes(m.id)) add("error", "field-motive", "Only motorized platoons, and wheeled or tracked mechanized platoons, may tow field guns or field artillery.", at(FP.book, FP.page), "motive");
    if (record.fieldGun.weapon !== null) {
      if (!gunRow) add("warning", "field-unknown", "The field gun is not in our table.", at(FP.book, FP.page), "fieldGun");
      else {
        if (!FIELD_GUN_ID.test(gunRow.id)) add("error", "field-gun-type", `${gunRow.name} cannot be a field gun: only autocannons and Gauss weapons (not Heavy or Hyper-Assault) can.`, at(FP.book, 122), "fieldGun");
        if (p.fieldGuns < 1) add("warning", "field-count", "A field gun is chosen but the platoon has none.", at(FP.book, FP.page), "fieldGun");
        if (p.fieldGuns > Math.floor(p.troopers / p.gunCrew)) add("error", "field-crew", `Each ${gunRow.name} needs ${String(p.gunCrew)} troopers to operate; ${String(p.troopers)} troopers crew ${String(Math.floor(p.troopers / p.gunCrew))}.`, at(FP.book, FP.page), "fieldGun");
        if (record.antiMech) add("warning", "field-anti-mech", "A platoon with field guns cannot make anti-'Mech attacks, so the kit does nothing.", at(FP.book, FP.page), "antiMech");
      }
    }
    if (record.fieldArtillery !== null) {
      if (!artRow) add("warning", "field-unknown", "The field artillery piece is not in our table.", at(FP.book, FP.page), "fieldArtillery");
      else {
        if (!FIELD_ARTILLERY_ID.test(artRow.id)) add("error", "field-artillery-type", `${artRow.name} cannot be field artillery: only Sniper, Thumper, Long Tom, Arrow IV and the artillery cannons can.`, at(FP.book, 122), "fieldArtillery");
        const tons = typeof artRow.tons === "number" ? artRow.tons : 0;
        if (p.troopers < tons) add("error", "field-artillery-crew", `${artRow.name} needs a platoon of at least ${String(tons)} troopers (its weight in tons).`, at(FP.book, 122), "fieldArtillery");
      }
    }
    for (const [row, field] of [[gunRow, "fieldGun"], [artRow, "fieldArtillery"]] as const) {
      if (!row) continue;
      if (row.techBase !== (record.techBase === "clan" ? "clan" : "inner-sphere")) add("error", "weapon-tech", `${row.name} is ${row.techBase === "clan" ? "Clan" : "Inner Sphere"} equipment on a ${record.techBase === "clan" ? "Clan" : "Inner Sphere"} platoon.`, at(TM, 147), field);
      if (record.year !== null && !catalog.available(row, record.editionId, record.year)) add("warning", "weapon-year", `${row.name} is not available in ${String(record.year)}.`, at(row.cite.book, row.cite.page), field);
      if (!levelAtLeast(level, equipmentLevel(row))) add("warning", "weapon-level", `${row.name} needs ${levelRow(equipmentLevel(row)).label} rules or higher.`, at(row.cite.book, row.cite.page), field);
    }
  }
  if (record.skills.gunnery > 8 || record.skills.antiMech > 8) add("warning", "skill", "Skill ratings run from 0 to 8.", at("TechManual Battle Value v4.1", 314), "skills");
  const bv = infantryBv(record, catalog);
  for (const name of bv.unvalued) add("note", "bv-unvalued", `${name} has no Battle Value in our table, so the platoon's is not worked out.`);
  for (const name of infantryCost(record, catalog).unpriced) add("note", "unpriced", `${name} has no price in our table, so the cost is not complete.`);
  return found;
}
