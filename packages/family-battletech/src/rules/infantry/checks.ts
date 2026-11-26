// The conventional infantry rules check: advice, never a refusal. Each finding names the printed page its rule rests on.
import { WEAPON_RULES, armorKitOf, specializationOf } from "../../data/infantry-tables";
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

  if (m) {
    if (record.perSquad > m.maxSquad) add("error", "squad", `A ${m.label.toLowerCase()} squad holds at most ${String(m.maxSquad)} troopers.`, at(TM, 145), "perSquad");
    if (record.perSquad < 1 || record.squads < 1) add("error", "size", "The platoon needs at least one squad of one trooper.", undefined, "squads");
    if (record.squads > 5 * p.lines.length && p.lines.length > 0) add("warning", "squads", "A platoon or sub-platoon has at most 5 squads.", at(TM, 146), "squads");
    if (p.lines.length > 1) add("note", "sub-platoons", `The platoon is over the ${String(m.maxPlatoon)}-trooper line and plays as ${String(p.lines.length)} sub-platoons of ${[...new Set(p.lines)].join(" and ")}.`, at(TM, 146));
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
      }
    }
  }
  if (record.skills.gunnery > 8 || record.skills.antiMech > 8) add("warning", "skill", "Skill ratings run from 0 to 8.", at("TechManual Battle Value v4.1", 314), "skills");
  const bv = infantryBv(record, catalog);
  if (bv.reason) add("note", "bv-reason", `The Battle Value is not worked out: ${bv.reason}`, at(TO, 191));
  for (const name of bv.unvalued) add("note", "bv-unvalued", `${name} has no Battle Value in our table, so the platoon's is not worked out.`);
  for (const name of infantryCost(record, catalog).unpriced) add("note", "unpriced", `${name} has no price in our table, so the cost is not complete.`);
  return found;
}
