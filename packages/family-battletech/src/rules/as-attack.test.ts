import { describe, expect, it } from "vitest";
import { odds2d6, physicalDamage, rangeBracket, resolveMultipleRolls, splitDamage, targetNumber, type AttackInput } from "./as-attack";

// Invented units; the figures come from the rules tables and worked examples, never from a card.
const base: AttackInput = { skill: 4, attackerType: "BM", attackerMove: "ground", distance: 3, targetType: "BM", targetTmm: 2, targetMove: "ground" };
const tn = (over: Partial<AttackInput>) => targetNumber({ ...base, ...over }).total;

describe("target number", () => {
  it("adds the parts of an indirect attack: Skill 3, standstill, medium range, TMM 2, indirect, spotter on the ground, woods (Aces p. 3)", () => {
    const result = targetNumber({ ...base, skill: 3, attackerMove: "standstill", distance: 12, flags: ["indirect", "woods"], spotterMove: "ground" });
    expect(result.total).toBe(8);
    expect(result.parts.map((p) => p.value)).toEqual([3, -1, 0, 2, 2, 1, 1]);
    expect(result.parts.every((p) => p.cite.includes("p. "))).toBe(true);
  });

  it("reads the range bracket at its edges, and extreme only when switched on", () => {
    expect([6, 6.5, 24, 24.5, 42].map((d) => rangeBracket(d))).toEqual(["S", "M", "M", "L", "L"]);
    expect(rangeBracket(43)).toBeNull();
    expect(targetNumber({ ...base, distance: 43 }).blocked?.id).toBe("out-of-range");
    expect(tn({ distance: 43, extreme: true })).toBe(4 + 2 + 6);
  });

  it("gives partial cover to 'Mechs only, never to vehicles, infantry or a hull-down unit", () => {
    const covered = (targetType: string, more: AttackInput["flags"] = []) => tn({ targetType, flags: ["partial-cover", ...(more ?? [])] });
    expect(covered("BM")).toBe(4 + 2 + 1);
    expect([covered("CV"), covered("CI"), covered("BM", ["target-hull-down"])]).toEqual([6, 6, 4 + 2 + 1]);
  });

  it("treats target and attacker types: battle armor +1, infantry ignore standstill, a jumping target with strong jets, no attack after a sprint", () => {
    expect(tn({ targetType: "BA" })).toBe(4 + 2 + 1);
    expect(tn({ attackerType: "CI", attackerMove: "standstill" })).toBe(4 + 2);
    expect(tn({ targetMove: "jump", jumpSpecial: 2 })).toBe(4 + 2 + 1 + 2);
    expect(targetNumber({ ...base, attackerMove: "sprint" }).blocked?.id).toBe("sprint");
  });

  it("prices immobile targets at -4 and an emplacement attacking once at -1", () => {
    expect(tn({ targetMove: "immobile" })).toBe(0);
    expect(tn({ targetType: "BD", targetMove: "ground" })).toBe(0);
    expect(tn({ attackerType: "BD", attackerMove: "standstill" })).toBe(4 - 1 + 2);
  });

  it("adds heat and fire control to weapon attacks only, and the anti-'Mech terms to that physical attack", () => {
    expect(tn({ heat: 2, fireControlHits: 1, flags: ["shield"] })).toBe(4 + 2 + 2 + 2 + 1);
    expect(tn({ physical: "charge", heat: 2, fireControlHits: 1, flags: ["shield"] })).toBe(4 + 2 + 1);
    expect(tn({ physical: "anti-mech", attackerType: "CI", targetCarriesBa: true })).toBe(4 + 2 + 1 + 3 + 3);
  });
});

describe("odds", () => {
  it("counts the ways of 2D6, with 2 or less certain and above 12 impossible", () => {
    expect([1, 2, 3, 7, 12, 13].map((n) => Math.round(odds2d6(n) * 36))).toEqual([36, 36, 35, 21, 1, 0]);
  });
});

describe("multiple attack rolls", () => {
  it("makes one roll per damage point, reduces the total once, and gives at most one critical from natural twelves", () => {
    // The worked example: five rolls, four succeed (two of them natural 12s), a reduction of 1 leaves 3.
    const result = resolveMultipleRolls(5, 7, [12, 8, 12, 7, 3], 1);
    expect(result).toMatchObject({ successes: 4, damage: 3, naturalTwelves: 2, criticalFromTwelve: true });
    expect(resolveMultipleRolls(3, 13, [12, 12, 12]).damage).toBe(0);
    expect(resolveMultipleRolls(1, 6, [6], 5).damage).toBe(1);
  });

  it("splits damage between two targets from the value at the second range", () => {
    const byRange = { S: 3, M: 3, L: 2, E: 0 };
    expect([splitDamage(byRange, 2, "L").secondary, splitDamage(byRange, 2, "M").secondary]).toEqual([0, 1]);
    expect(tn({ flags: ["secondary"] })).toBe(4 + 2 + 1);
  });
});

describe("physical attack damage", () => {
  it("follows the damage table for each kind, with the p. 46 charge and dive examples", () => {
    const base2 = { size: 1, tmm: 2, targetSize: 3 };
    expect(physicalDamage({ ...base2, type: "standard" }).toTarget).toBe(1);
    expect(physicalDamage({ ...base2, type: "melee" }).toTarget).toBe(2);
    expect(physicalDamage({ ...base2, type: "charge" })).toMatchObject({ toTarget: 2, toAttackerOnHit: 2 });
    expect(physicalDamage({ ...base2, type: "dfa" })).toMatchObject({ toTarget: 3, toAttackerOnHit: 1, toAttackerOnMiss: 2 });
    expect(physicalDamage({ ...base2, type: "dfa", jumpJets: "weak" }).toTarget).toBe(2);
  });
});
