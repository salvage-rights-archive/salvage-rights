// Converting a Classic 'Mech to an Alpha Strike card, all six parts: the body, damage and heat (rules/as-convert.ts), the special abilities
// (rules/as-convert-specials.ts), a suggested role (rules/as-role.ts) and the Point Value (rules/as-pv.ts). This file only joins them, so
// the pieces stay small and none imports another in a circle. Where a part has no figure the card leaves it blank and a finding says why.
import { convertMech } from "./as-convert";
import type { Finding, MechConversion, Step } from "./as-convert";
import { convertSpecials } from "./as-convert-specials";
import { pointValue } from "./as-pv";
import type { PointValue } from "./as-pv";
import { suggestRole } from "./as-role";
import type { RoleResult } from "./as-role";
import type { AsCard, AsSpecial } from "./as-unit";
import { newAsUnit } from "./as-unit";
import type { Catalog } from "./catalog";
import type { MechRecord } from "./mech";

export interface FullConversion extends MechConversion {
  specials: Step<AsSpecial[]> | null;
  role: RoleResult | null;
  point: PointValue | null;
}

/** The six parts for a 'Mech record. An OmniMech base chassis (no pods) is not a unit and stops after the body, as `convertMech` does. */
export function convertClassicMech(record: MechRecord, catalog: Catalog): FullConversion {
  const base = convertMech(record, catalog);
  const result: FullConversion = { ...base, pending: [], specials: null, role: null, point: null };
  if (record.omni?.isBase === true) return result;

  const specials = convertSpecials(record, catalog, base);
  result.specials = specials;
  result.working = [...base.working, ...specials.working];
  const findings: Finding[] = [...base.findings, ...specials.findings];
  if (specials.value) result.unit.card.specials = specials.value;

  const blank = newAsUnit("").card;
  const card: AsCard = { ...blank, ...result.unit.card };
  const complete = base.weapons !== null && base.heat !== null && result.unit.card.move !== undefined && result.unit.card.armor !== undefined && result.unit.card.structure !== undefined;

  const role = suggestRole(card);
  result.role = role;
  if (complete) {
    result.unit.card.role = role.role;
    result.working.push({ step: "role", rule: `role ${role.role ?? "none (support unit)"}`, detail: role.because, cite: role.cite });
  } else {
    findings.push({ code: "role-needs-card", part: "role", message: "The role is read from the Move, Armor and damage, and some of those have no figure yet, so we left it blank." });
  }

  if (complete) {
    const point = pointValue(card);
    result.point = point;
    if (point.value !== null) result.unit.card.pv = point.value;
    for (const line of point.working) result.working.push({ step: "points", rule: line.rule, detail: line.detail, cite: line.cite });
    for (const f of point.findings) findings.push({ code: f.code, part: "Point Value", message: f.message, ...(f.cite ? { cite: f.cite } : {}) });
  } else {
    findings.push({ code: "pv-needs-card", part: "Point Value", message: "The Point Value starts from the whole card (Move, Armor, Structure and damage), and some of those have no figure yet, so we left it at 0." });
  }
  result.findings = dedupe(findings);
  return result;
}

function dedupe(list: Finding[]): Finding[] {
  const seen = new Set<string>();
  return list.filter((f) => {
    const key = `${f.code}|${f.part}|${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
