import { describe, expect, it } from "vitest";
import { defenseFactor, movementModifier, overheatFactor, pointValue } from "./as-pv";
import { parseMove, parseSpecials } from "./as-unit";
import type { AsCard } from "./as-unit";

/** A card from the figures a player reads off it: Move as typed (`8"/6"j`), damage S/M/L as typed (`3/3/1`, `0*` for minimal, `-` for none). */
function card(over: { type?: string; size: number; move: string; tmm?: number; armor: number; structure: number; damage: string; ov?: number; specials?: string }): AsCard {
  const [s = "-", m = "-", l = "-"] = over.damage.split("/");
  const dmg = (t: string) => (t === "-" || t === "0" ? null : t === "0*" ? { value: 0, minimal: true as const } : { value: Number(t) });
  const move = parseMove(over.move);
  return {
    type: over.type ?? "BM",
    size: over.size,
    tmm: over.tmm ?? 1,
    move: move.ok ? move.value : [],
    role: null,
    pv: 0,
    damage: { s: dmg(s), m: dmg(m), l: dmg(l) },
    ov: over.ov ?? 0,
    armor: over.armor,
    structure: over.structure,
    specials: parseSpecials(over.specials ?? ""),
  };
}
const detail = (c: AsCard, startsWith: string) => pointValue(c).working.find((w) => w.rule.startsWith(startsWith))?.detail ?? "";

describe("Point Value of a ground unit (ASC pp. 138-141, errata v1.6)", () => {
  it("a whole 'Mech by hand, step by step", () => {
    // Size 3, 8 in, Armor 6, Structure 6, damage 3/3/1, Overheat Value 2, ENE (no factor).
    // Offense: 3 + 3 + 1 + 3 (Medium again) = 10; Size 3 / 2 = 1.5; OV 2 gives 1 + 0.5 = 1.5; 13.
    // Defense: Move 8 / 8 = 1; (6 x 2 + 6 x 1) x Defense Factor 1.1 (Move 8 is +1, a tenth) = 19.8, to the half point 20; 21.
    // Subtotal 34: TMM 1 is not Agile, the unit has Medium damage so it is no Brawler. Point Value 34.
    const result = pointValue(card({ size: 3, move: `8"`, armor: 6, structure: 6, damage: "3/3/1", ov: 2, specials: "ENE" }));
    expect(result).toMatchObject({ offense: 13, defense: 21, subtotal: 34, value: 34 });
    expect(result.working.every((w) => w.cite.page >= 138 && w.cite.page <= 141)).toBe(true);
  });

  it("the Attack Damage Factor counts Medium twice, and a 0* as half a point (p. 138 and its errata)", () => {
    expect(detail(card({ size: 1, move: `4"`, armor: 1, structure: 1, damage: "3/2/1" }), "Attack Damage Factor")).toContain("= 8");
    expect(detail(card({ size: 1, move: `4"`, armor: 1, structure: 1, damage: "3/2/0*" }), "Attack Damage Factor")).toContain("= 7.5");
  });

  it("the Overheat Factor: 0, 1, then half a point for each point over 1 (p. 139)", () => {
    expect([0, 1, 2, 4].map(overheatFactor)).toEqual([0, 1, 1.5, 2.5]);
  });

  it("the Movement Modifier bands and the Defense Factor rule of the errata (p. 141)", () => {
    expect([4, 5, 8, 9, 12, 13, 18, 19, 34, 35].map(movementModifier)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
    // The errata's own example: a total of -1 gives 0.9. 1 or 2 is a tenth more than 1; above 2 a quarter more.
    expect([-1, 0, 1, 2, 4].map(defenseFactor)).toEqual([0.9, 1, 1.1, 1.2, 2]);
  });

  it("Barrier Armor Rating and IndustrialMechs halve the Structure Factor once, and BAR halves the Armor multiplier (p. 141 examples)", () => {
    // The book's examples: an IndustrialMech with 5 Armor and BAR has an Armor Factor of 5; 8 Structure with BAR is a Structure Factor of 4.
    expect(detail(card({ type: "IM", size: 1, move: `4"`, armor: 5, structure: 8, damage: "-", specials: "BAR,BFC" }), "Defensive Interaction")).toContain("(5 x 1 + 8 x 0.5)");
  });

  it("Agile: the book's Dasher Prime (+9) and Dasher H (+10) examples (errata, p. 141)", () => {
    // TMM 4 and Medium damage 3: (4 - 1) x 3 = 9. TMM 4, no Medium, Short 5: (4 - 2) x 5 = 10.
    expect(detail(card({ size: 1, move: `20"`, tmm: 4, armor: 2, structure: 2, damage: "3/3/-" }), "Subtotal modifiers")).toContain("Agile +9");
    expect(detail(card({ size: 1, move: `20"`, tmm: 4, armor: 2, structure: 2, damage: "5/-/-" }), "Subtotal modifiers")).toContain("Agile +10");
  });

  it("Brawler: a unit with 2 to 5 inches of Move that only delivers damage at Short loses half its subtotal; C3 adds a twentieth (errata, p. 141)", () => {
    const slow = pointValue(card({ size: 2, move: `4"`, tmm: 0, armor: 4, structure: 4, damage: "3/-/-" }));
    expect(slow.working.find((w) => w.rule.startsWith("Subtotal modifiers"))?.detail).toMatch(/Brawler -/);
    const withC3 = card({ size: 2, move: `4"`, tmm: 0, armor: 4, structure: 4, damage: "3/-/-", specials: "C3S,ECM" });
    // ECM keeps a unit from being a Brawler. C3S: subtotal 4 + 0.5 + 12 = 16.5, a twentieth is 0.825, to the half point 1.
    expect(detail(withC3, "Subtotal modifiers")).toBe("C3 +1");
  });

  it("force bonuses are added at the end: MHQ 1 to 4 is its rating, 5 and over is 4 plus a fifth rounded up (errata, p. 140)", () => {
    const base = pointValue(card({ size: 2, move: `8"`, armor: 4, structure: 4, damage: "2/2/0" })).value ?? 0;
    expect(pointValue(card({ size: 2, move: `8"`, armor: 4, structure: 4, damage: "2/2/0", specials: "MHQ2,RCN" })).value).toBe(base + 4);
    expect(pointValue(card({ size: 2, move: `8"`, armor: 4, structure: 4, damage: "2/2/0", specials: "MHQ6" })).value).toBe(base + 6);
  });

  it("artillery needs the blast radius, which a card does not hold: no value, and a finding", () => {
    const result = pointValue(card({ size: 3, move: `6"`, armor: 5, structure: 5, damage: "2/2/-", specials: "ARTAIS-1" }));
    expect(result.value).toBeNull();
    expect(result.findings[0]?.code).toBe("pv-artillery");
  });
});
