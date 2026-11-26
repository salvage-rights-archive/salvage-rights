// Point Value of a ground unit (BattleMech or IndustrialMech) from its Alpha Strike card, by the Alpha Strike Companion's method
// (pp. 138-141, errata v1.6). A pure function of the card: the same method gives a Point Value to a card the player typed, imported or
// converted. It returns the value with the working (our own short wording and the page) and its findings; where the book's method needs
// a figure the card does not hold (an artillery blast radius) the value is null and a finding says so, never a guess.
import {
  PV_ARMOR_MULTIPLIER,
  PV_BLANKET,
  PV_DAMAGE,
  PV_DEFENSE_FACTOR,
  PV_DEFENSE_SPECIALS,
  PV_FORCE_BONUS,
  PV_MHQ,
  PV_MOVEMENT,
  PV_MOVEMENT_MODIFIER,
  PV_OFFENSE_SPECIALS,
  PV_OVERHEAT,
  PV_PAGES,
  PV_RHS,
  PV_ROUND_HALF,
  PV_SIZE_FACTOR,
  PV_STRUCTURE_MULTIPLIER,
  PV_SUBTOTAL,
  PV_TYPE_MODIFIERS,
} from "../data/as-pv";
import type { AscCite } from "../data/as-convert";
import type { AsCard, AsDamage, AsSpecial } from "./as-unit";
import { roundHalfUp, tidy } from "./walk";

export interface PvLine {
  rule: string;
  detail: string;
  cite: AscCite;
}

export interface PvFinding {
  code: string;
  message: string;
  cite?: AscCite;
}

export interface PointValue {
  /** The Point Value, or null when the method needs something the card does not hold (see `findings`). */
  value: number | null;
  offense: number | null;
  defense: number | null;
  subtotal: number | null;
  working: PvLine[];
  findings: PvFinding[];
}

const fmt = (x: number) => String(tidy(x));
const nearestHalf = (x: number) => tidy(roundHalfUp(x / PV_ROUND_HALF) * PV_ROUND_HALF);

/** A damage value as the method counts it: none is 0 and minimal damage (0*) is half a point. */
const counted = (d: AsDamage): number => (d === null ? 0 : d.minimal ? PV_DAMAGE.minimal : d.value);
const delivers = (d: AsDamage): boolean => d !== null && (d.minimal === true || d.value > 0);

/** The first special with a code, and the number its first value gives (a minimal `0*` counts as 0.5). */
const find = (specials: AsSpecial[], code: string): AsSpecial | undefined => specials.find((s) => s.code === code);
const has = (specials: AsSpecial[], code: string): boolean => find(specials, code) !== undefined;
const ratingOf = (s: AsSpecial): number => {
  const first = s.values[0] ?? "";
  if (first === "") return 1; // a number left off the card is 1 (one launcher, one dispenser)
  if (first === "0*") return 0.5;
  const n = Number(first);
  return Number.isFinite(n) ? n : 0;
};

/** The Movement Modifier of a Move in inches (p. 140). */
export function movementModifier(inches: number): number {
  return PV_MOVEMENT_MODIFIER.find((r) => inches >= r.from && (r.to === null || inches <= r.to))?.modifier ?? 0;
}

/** The best Move the card gives, jumping or not, and the best that is not a jump (a card whose only Move is a jump is a unit whose walking
 * Move equals it). */
function moves(card: AsCard): { best: number; ground: number; jumps: boolean } {
  const all = card.move.map((m) => m.inches);
  const ground = card.move.filter((m) => m.mode !== "j").map((m) => m.inches);
  const best = all.length === 0 ? 0 : Math.max(...all);
  return { best, ground: ground.length === 0 ? best : Math.max(...ground), jumps: card.move.some((m) => m.mode === "j") };
}

/** The Defense Factor from the total of the target modifiers (errata v1.6, p. 141). */
export function defenseFactor(total: number): number {
  const d = PV_DEFENSE_FACTOR;
  if (total < 0) return tidy(1 - -total * d.negativeEach);
  if (total > d.lowUpTo) return tidy(1 + total * d.highEach);
  return tidy(1 + total * d.lowEach);
}

/** The Overheat Factor (p. 139): none for no Overheat Value, 1 for 1, then half a point for each point over 1. */
export function overheatFactor(ov: number): number {
  if (ov <= 0) return 0;
  return tidy(PV_OVERHEAT.first + (ov - 1) * PV_OVERHEAT.perExtraPoint);
}

export function pointValue(card: AsCard): PointValue {
  const working: PvLine[] = [];
  const findings: PvFinding[] = [];
  const out = (value: number | null, offense: number | null, defense: number | null, subtotal: number | null): PointValue => ({ value, offense, defense, subtotal, working, findings });
  const { specials } = card;
  const industrial = card.type === "IM";
  const move = moves(card);
  const [s, m, l] = [counted(card.damage.s), counted(card.damage.m), counted(card.damage.l)];

  const artillery = specials.filter((x) => /^ART/.test(x.code));
  if (artillery.length > 0) {
    findings.push({ code: "pv-artillery", message: "The book's factor for an artillery weapon needs its blast radius, which the card does not hold; we leave the Point Value unset.", cite: PV_PAGES.offenseTable });
    return out(null, null, null, null);
  }
  

  // ---- Step 1: Offensive Value ----
  const adf = tidy(s + m + l + m);
  working.push({ rule: "Attack Damage Factor: Short, Medium and Long, plus Medium again; 0* counts as 0.5", detail: `${fmt(s)} + ${fmt(m)} + ${fmt(l)} + ${fmt(m)} = ${fmt(adf)}`, cite: PV_PAGES.offense });
  const size = tidy(card.size * PV_SIZE_FACTOR);
  working.push({ rule: "Unit Size Factor: half the Size of a 'Mech", detail: `${String(card.size)} x ${String(PV_SIZE_FACTOR)} = ${fmt(size)}`, cite: PV_PAGES.offense });
  let ovf = overheatFactor(card.ov);
  const shortOnly = delivers(card.damage.s) && !delivers(card.damage.m) && !delivers(card.damage.l);
  if (ovf > 0 && shortOnly) ovf = tidy(ovf / PV_OVERHEAT.shortOnlyDivisor);
  working.push({ rule: `Overheat Factor: 0 for no Overheat Value, 1 for 1, half a point more for each point over 1${shortOnly ? "; halved for a unit that only delivers damage at Short" : ""}`, detail: `OV ${String(card.ov)} gives ${fmt(ovf)}`, cite: PV_PAGES.offenseTable });

  let specialFactor = 0;
  const specialParts: string[] = [];
  for (const sp of specials) {
    const entry = Object.hasOwn(PV_OFFENSE_SPECIALS, sp.code) ? PV_OFFENSE_SPECIALS[sp.code] : undefined;
    if (!entry) continue;
    const f = entry.factor;
    let value: number;
    if (f.kind === "flat") value = f.value;
    else if (f.kind === "rating") value = Math.min(f.max ?? Infinity, ratingOf(sp) * f.per);
    else if (f.kind === "heat") {
      const nums = sp.values.map((v) => Number(v) || 0);
      value = Math.max(0, ...nums) + ((nums[1] ?? 0) > 0 ? 0.5 : 0);
    } else if (f.kind === "if") value = ratingOf(sp);
    else if (f.kind === "booby") value = card.size * (move.best * 0.5);
    else if (f.kind === "ov") value = card.ov * f.per;
    else if (f.kind === "rhs") value = has(specials, "OVL") ? PV_RHS.withOvl : card.ov > 0 ? PV_RHS.withOv : PV_RHS.noOv;
    else value = Number(sp.values[2] ?? 0) || 0;
    value = tidy(value);
    specialFactor = tidy(specialFactor + value);
    specialParts.push(`${sp.code} ${fmt(value)}`);
  }
  if (specialParts.length > 0) working.push({ rule: "Offensive special ability factors", detail: `${specialParts.join(", ")} = ${fmt(specialFactor)}`, cite: PV_PAGES.offenseTable });

  // Blanket multipliers (the errata's table).
  let multiplier: number = PV_BLANKET.base;
  const blanketParts: string[] = [`base ${String(PV_BLANKET.base)}`];
  if (has(specials, PV_BLANKET.vrtCode)) {
    multiplier = tidy(multiplier + PV_BLANKET.vrt);
    blanketParts.push(`VRT +${String(PV_BLANKET.vrt)}`);
  }
  for (const code of PV_BLANKET.toHitPenalty.codes) {
    if (has(specials, code)) {
      multiplier = tidy(multiplier + PV_BLANKET.toHitPenalty.each);
      blanketParts.push(`${code} ${String(PV_BLANKET.toHitPenalty.each)}`);
    }
  }
  if (industrial && !PV_BLANKET.noFireControl.codes.some((c) => has(specials, c))) {
    multiplier = tidy(multiplier + PV_BLANKET.noFireControl.value);
    blanketParts.push(`no AFC or BFC ${String(PV_BLANKET.noFireControl.value)}`);
  }
  const before = tidy(adf + size + ovf + specialFactor);
  const offense = tidy(before * multiplier);
  working.push({ rule: "Offensive Value: the factors added up, times the blanket multipliers (not rounded: the errata deletes that step)", detail: `${fmt(before)} x ${fmt(multiplier)} (${blanketParts.join(", ")}) = ${fmt(offense)}`, cite: PV_PAGES.blanket });

  // ---- Step 2: Defensive Value ----
  const movementFactor = tidy(move.best / PV_MOVEMENT.divisor + (move.jumps ? PV_MOVEMENT.jumpBonus : 0));
  working.push({ rule: "Movement Factor: the best Move over 8, half a point more if the unit can jump", detail: `${String(move.best)} / ${String(PV_MOVEMENT.divisor)}${move.jumps ? ` + ${String(PV_MOVEMENT.jumpBonus)}` : ""} = ${fmt(movementFactor)}`, cite: PV_PAGES.defense });

  const bar = has(specials, "BAR");
  let defensiveSpecials = 0;
  const defenseParts: string[] = [];
  for (const sp of specials) {
    const entry = Object.hasOwn(PV_DEFENSE_SPECIALS, sp.code) ? PV_DEFENSE_SPECIALS[sp.code] : undefined;
    if (!entry) continue;
    const f = entry.factor;
    const threes = Math.floor(card.armor / 3);
    let value: number;
    if (f.kind === "flat") value = f.value;
    else if (f.kind === "armored") value = card.structure <= 1 ? 0 : f.value;
    else if (f.kind === "structureAtLeast") value = card.structure >= f.min ? f.value : 0;
    else value = f.each * threes;
    if (entry.halvedByBar && bar) value /= 2;
    value = tidy(value);
    defensiveSpecials = tidy(defensiveSpecials + value);
    defenseParts.push(`${sp.code} ${fmt(value)}`);
  }
  if (defenseParts.length > 0) working.push({ rule: "Defensive special ability factors", detail: `${defenseParts.join(", ")} = ${fmt(defensiveSpecials)}`, cite: PV_PAGES.defenseTable });

  const armorMultiplier = tidy(PV_ARMOR_MULTIPLIER.nonVehicle * (bar ? PV_ARMOR_MULTIPLIER.barHalves : 1));
  const armorFactor = tidy(card.armor * armorMultiplier);
  const structureMultiplier = industrial || bar ? PV_STRUCTURE_MULTIPLIER.industrialOrBar : PV_STRUCTURE_MULTIPLIER.other;
  const structureFactor = tidy(card.structure * structureMultiplier);

  const damageAll = (["s", "m", "l"] as const).every((r) => !delivers(card.damage[r]));
  const jumpCounts = move.jumps && damageAll && !has(specials, "TSEMP") && specials.every((x) => !/^ART/.test(x.code));
  let target = movementModifier(move.ground);
  const targetParts = [`Move ${String(move.ground)} ${target >= 0 ? "+" : ""}${String(target)}`];
  if (jumpCounts) {
    target += PV_TYPE_MODIFIERS.jumpCapable;
    targetParts.push(`jump-capable +${String(PV_TYPE_MODIFIERS.jumpCapable)}`);
  }
  if (PV_TYPE_MODIFIERS.large.codes.some((c) => has(specials, c))) {
    target += PV_TYPE_MODIFIERS.large.value;
    targetParts.push(`large ${String(PV_TYPE_MODIFIERS.large.value)}`);
  }
  if (has(specials, PV_TYPE_MODIFIERS.stealth.code)) {
    target += PV_TYPE_MODIFIERS.stealth.value;
    targetParts.push(`stealth +${String(PV_TYPE_MODIFIERS.stealth.value)}`);
  }
  for (const code of PV_TYPE_MODIFIERS.perHalf) {
    const sp = find(specials, code);
    if (sp) {
      target += ratingOf(sp) / 2;
      targetParts.push(`${code} +${fmt(ratingOf(sp) / 2)}`);
    }
  }
  const mimetic = has(specials, "MAS") ? PV_TYPE_MODIFIERS.mimetic.MAS : has(specials, "LMAS") ? PV_TYPE_MODIFIERS.mimetic.LMAS : 0;
  if (mimetic > target) {
    target = mimetic;
    targetParts.push(`mimetic armor +${String(mimetic)} used instead`);
  }
  const df = defenseFactor(target);
  const dir = nearestHalf((armorFactor + structureFactor) * df);
  working.push({
    rule: "Defensive Interaction Rating: (Armor Factor + Structure Factor) x Defense Factor, to the nearest half point",
    detail: `(${String(card.armor)} x ${fmt(armorMultiplier)} + ${String(card.structure)} x ${String(structureMultiplier)}) x ${fmt(df)} (target modifiers ${targetParts.join(", ")} = ${fmt(target)}) = ${fmt(dir)}`,
    cite: PV_PAGES.dir,
  });
  const defense = tidy(movementFactor + defensiveSpecials + dir);
  working.push({ rule: "Defensive Value: Movement Factor + defensive special factors + the rating", detail: `${fmt(movementFactor)} + ${fmt(defensiveSpecials)} + ${fmt(dir)} = ${fmt(defense)}`, cite: PV_PAGES.dir });

  // ---- Step 3: the subtotal and its modifiers ----
  const subtotal = tidy(offense + defense);
  working.push({ rule: "Point Value subtotal: Offensive Value + Defensive Value", detail: `${fmt(offense)} + ${fmt(defense)} = ${fmt(subtotal)}`, cite: PV_PAGES.subtotal });
  let modifiers = 0;
  const modifierParts: string[] = [];
  const A = PV_SUBTOTAL.agile;
  let tmm = card.tmm ?? 0;
  for (const code of A.jumpHalf) {
    const sp = find(specials, code);
    if (sp) tmm += ratingOf(sp) / 2;
  }
  let agile = 0;
  if (tmm > 1) {
    if (delivers(card.damage.m)) agile = (tmm - A.medium) * m;
    else if (tmm >= A.shortOnlyMinTmm) agile = (tmm - A.shortOnly) * s;
  }
  agile = nearestHalf(agile);
  if (agile !== 0) {
    modifiers += agile;
    modifierParts.push(`Agile +${fmt(agile)}`);
  }
  if (has(specials, PV_SUBTOTAL.c3.nova) || specials.some((x) => /^C3/.test(x.code) && x.code !== PV_SUBTOTAL.c3.exceptCode)) {
    const c3 = nearestHalf(subtotal * PV_SUBTOTAL.c3.rate);
    modifiers += c3;
    modifierParts.push(`C3 +${fmt(c3)}`);
  }
  const B = PV_SUBTOTAL.brawler;
  const armed = delivers(card.damage.s) || delivers(card.damage.m) || delivers(card.damage.l);
  const blocked = specials.some((x) => B.excluded.includes(x.code) || B.excludedPrefixes.some((p) => x.code.startsWith(p)) || B.excludedEcm.includes(x.code));
  if (armed && !blocked && move.best >= B.minMove) {
    const only = !delivers(card.damage.m) && !delivers(card.damage.l) ? "short" : !delivers(card.damage.l) ? "short-medium" : "more";
    const hit = B.cases.find((c) => c.ranges === only && move.best >= c.minMove && move.best <= c.maxMove);
    if (hit) {
      const cost = nearestHalf(subtotal * hit.rate);
      modifiers += cost;
      modifierParts.push(`Brawler ${fmt(cost)} (${hit.name})`);
    }
  }
  working.push({ rule: "Subtotal modifiers (Agile, C3, Brawler), each to the nearest half point, applied together", detail: modifierParts.length > 0 ? `${modifierParts.join("; ")}` : "none apply", cite: PV_PAGES.subtotal });

  let bonus = 0;
  const bonusParts: string[] = [];
  for (const sp of specials) {
    let b = Object.hasOwn(PV_FORCE_BONUS, sp.code) ? PV_FORCE_BONUS[sp.code] : undefined;
    if (sp.code === "MHQ") {
      const r = ratingOf(sp);
      b = r <= PV_MHQ.direct ? r : PV_MHQ.base + Math.ceil(r / PV_MHQ.divisor);
    }
    if (b === undefined) continue;
    bonus += b;
    bonusParts.push(`${sp.code} ${fmt(b)}`);
  }
  if (bonusParts.length > 0) working.push({ rule: "Force bonuses", detail: `${bonusParts.join(", ")} = ${fmt(bonus)}`, cite: PV_PAGES.forceBonuses });
  const raw = tidy(subtotal + modifiers + bonus);
  const value = Math.max(1, roundHalfUp(raw));
  working.push({ rule: "Point Value: subtotal + modifiers + force bonuses, rounded to the nearest whole number, at least 1", detail: `${fmt(raw)} gives ${String(value)}`, cite: PV_PAGES.forceBonuses });
  return out(value, offense, defense, subtotal);
}
