// The ground unit roles' figures from Alpha Strike Companion "Unit Role Classification" pp. 134-136 (read against the page images):
// each role's Move band in inches, Armor band, preferred range and what its abilities must be. The book calls them a guide.
import type { AscCite } from "./as-convert";

const role = (page: number): AscCite => ({ book: "Alpha Strike Companion", page, checked: "page" });

export const ROLE_PAGES = { overview: role(134) };

export interface RoleRule {
  /** Move in inches: Slow 2 to 6, Medium-Fast 8 to 12, Fast 9 to 12 (a Move above 12 is faster still, so it stays in the Fast band). */
  move: { from: number; to: number | null; orMediumWithJump?: boolean };
  armor: { from: number; to: number | null };
  range: "short" | "medium" | "long" | "any";
  /** Missile Boat: Long damage of at least 1 through indirect fire or artillery, with LRMs. Sniper: Long damage of at least 1 without them. */
  needs?: "long-indirect" | "long-direct";
  /** Scout: no more than 1 point of damage at Long range. */
  maxLong?: number;
  cite: AscCite;
}

export const ROLE_RULES: Record<string, RoleRule> = {
  Ambusher: { move: { from: 2, to: 6 }, armor: { from: 0, to: 5 }, range: "short", cite: role(134) },
  Brawler: { move: { from: 8, to: 12 }, armor: { from: 0, to: null }, range: "medium", cite: role(134) },
  Juggernaut: { move: { from: 2, to: 6 }, armor: { from: 7, to: null }, range: "short", cite: role(135) },
  "Missile Boat": { move: { from: 0, to: null }, armor: { from: 0, to: null }, range: "long", needs: "long-indirect", cite: role(135) },
  Scout: { move: { from: 9, to: null }, armor: { from: 0, to: 4 }, range: "short", maxLong: 1, cite: role(135) },
  Skirmisher: { move: { from: 9, to: null, orMediumWithJump: true }, armor: { from: 4, to: 8 }, range: "medium", cite: role(136) },
  Sniper: { move: { from: 0, to: null }, armor: { from: 0, to: null }, range: "long", needs: "long-direct", cite: role(136) },
  Striker: { move: { from: 9, to: null }, armor: { from: 0, to: 5 }, range: "short", cite: role(136) },
};

/** The order we try them in when several fit: the roles that name a special need first, then the narrowest figures. */
export const ROLE_ORDER = ["Missile Boat", "Sniper", "Juggernaut", "Ambusher", "Scout", "Striker", "Skirmisher", "Brawler"];
