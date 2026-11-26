// A suggested role for a ground unit, from the Alpha Strike Companion's "Unit Role Classification" (pp. 134-136). The book gives each role a
// Move, an Armor band, a preferred range and the abilities it needs, and says plainly that they are a guide: many units fit more than one,
// and a unit's role is as much how it is meant to be used as its figures. So this returns the roles whose figures all fit, the one we
// suggest (the best fit when none fits entirely) and why; the player can change it on the card. A pure function of the card. An unarmed
// or non-military unit (and every IndustrialMech) is a support unit in the book, which is not one of the eight card roles.
import { ROLE_ORDER, ROLE_PAGES, ROLE_RULES } from "../data/as-role";
import type { AscCite } from "../data/as-convert";
import type { AsCard, AsDamage, AsSpecial } from "./as-unit";

export interface RoleResult {
  /** The suggested role, or null for a support unit. */
  role: string | null;
  /** Every role whose figures all fit, in the order we prefer them (empty when none does). */
  fits: string[];
  /** Why, in our words. */
  because: string;
  cite: AscCite;
}

const value = (d: AsDamage): number => (d === null ? 0 : d.minimal ? 0.5 : d.value);
const has = (specials: AsSpecial[], code: string) => specials.some((s) => s.code === code);

/** The range bracket the unit delivers most at (a tie goes to the longer bracket: 3/3/1 prefers Medium). */
export function preferredRange(card: AsCard): "short" | "medium" | "long" | null {
  const [s, m, l] = [value(card.damage.s), value(card.damage.m), value(card.damage.l)];
  if (s + m + l === 0) return null;
  const top = Math.max(s, m, l);
  if (l === top && l > 0 && l >= m) return l > s || l === m ? "long" : "short";
  if (m === top) return "medium";
  return "short";
}

/** Points a role's figures score for a card: 2 for Move, 2 for Armor, 1 for the preferred range, 1 for what its abilities need (6 is a full fit). */
function score(card: AsCard, name: string): number {
  const r = ROLE_RULES[name];
  if (!r) return -1;
  const l = value(card.damage.l);
  const best = card.move.length === 0 ? 0 : Math.max(...card.move.map((x) => x.inches));
  const jumps = card.move.some((x) => x.mode === "j");
  const speedOk = (best >= r.move.from && (r.move.to === null || best <= r.move.to)) || (r.move.orMediumWithJump === true && best === 8 && jumps);
  const armorOk = card.armor >= r.armor.from && (r.armor.to === null || card.armor <= r.armor.to);
  const rangeOk = r.range === "any" || preferredRange(card) === r.range;
  let needsOk = true;
  if (r.needs === "long-indirect") needsOk = l >= 1 && (has(card.specials, "IF") || card.specials.some((x) => x.code.startsWith("ART"))) && has(card.specials, "LRM");
  else if (r.needs === "long-direct") {
    const lrm = card.specials.find((x) => x.code === "LRM");
    needsOk = l - (lrm === undefined ? 0 : Number(lrm.values[2] ?? 0) || 0) >= 1;
  } else if (r.maxLong !== undefined) needsOk = l <= r.maxLong;
  return (speedOk ? 2 : 0) + (armorOk ? 2 : 0) + (rangeOk ? 1 : 0) + (needsOk ? 1 : 0);
}

export function suggestRole(card: AsCard): RoleResult {
  const cite = ROLE_PAGES.overview;
  const total = value(card.damage.s) + value(card.damage.m) + value(card.damage.l);
  if (card.type === "IM") return { role: null, fits: [], because: "the book classes an IndustrialMech as a support unit, which is not one of the eight roles", cite };
  if (total === 0) return { role: null, fits: [], because: "the book classes an unarmed unit as a support unit, which is not one of the eight roles", cite };
  const scored = ROLE_ORDER.map((name) => ({ name, points: score(card, name) }));
  const fits = scored.filter((x) => x.points === 6).map((x) => x.name);
  const top = Math.max(...scored.map((x) => x.points));
  const first = fits[0] ?? scored.find((x) => x.points === top)?.name ?? null;
  const best = card.move.length === 0 ? 0 : Math.max(...card.move.map((x) => x.inches));
  const figures = `Move ${String(best)}, Armor ${String(card.armor)}, preferred range ${preferredRange(card) ?? "none"}`;
  const because =
    fits.length === 0
      ? `${figures}: no role fits every figure, so this is the closest (the book calls the guide loose)`
      : `${figures}${fits.length > 1 ? `; ${fits.join(", ")} all fit, and we put them in the order of the narrowest figures first` : ""}`;
  return { role: first, fits, because, cite: (first !== null ? ROLE_RULES[first]?.cite : undefined) ?? cite };
}
