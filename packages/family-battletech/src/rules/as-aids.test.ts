import { describe, expect, it } from "vitest";
import type { RulesLevel } from "../data/chassis";
import { extremeDamage, heatEffect, oddsByRange, offersOptional } from "./as-aids";

const base = { skill: 4, attackerType: "BM", attackerMove: "ground" as const, targetType: "BM", targetTmm: 2, targetMove: "ground" as const };

describe("play aids arithmetic", () => {
  it("gives the odds and expected damage at each range, with Extreme taking Long less 1 and only when asked for", () => {
    const rows = oddsByRange(base, { S: { value: 3 }, M: { value: 3 }, L: { value: 2 } }, true);
    // 4 + 2 (TMM) + the range's own modifier: 6, 8, 10 and 12, which 2D6 meets 26, 15, 6 and 1 times in 36.
    expect(rows.map((r) => [r.id, r.tn, Math.round(r.chance * 36)])).toEqual([["S", 6, 26], ["M", 8, 15], ["L", 10, 6], ["E", 12, 1]]);
    expect(rows[1]?.expected).toBeCloseTo((15 / 36) * 3);
    expect(rows[3]).toMatchObject({ damage: extremeDamage(2), expected: 1 / 36 });
    expect(oddsByRange(base, {}, false).map((r) => r.id)).toEqual(["S", "M", "L"]);
    expect(oddsByRange({ ...base, attackerMove: "sprint" }, {}, false)).toEqual([]);
  });

  it("counts a 0* range as half a point on a hit, and a dash as no attack", () => {
    const rows = oddsByRange(base, { S: { value: 0, minimal: true }, M: null }, false);
    expect(rows[0]).toMatchObject({ minimal: true, expected: (26 / 36) * 0.5 });
    expect(rows[1]).toMatchObject({ none: true });
    expect(rows[1]?.expected).toBeUndefined();
  });

  it("measures an underwater attacker's ranges at half distance, so every bracket still comes out", () => {
    expect(oddsByRange({ ...base, flags: ["underwater"] }, {}, false).map((r) => r.id)).toEqual(["S", "M", "L"]);
  });

  it("reads the heat scale: the level on attacks, 2 inches of Move a level, 1 TMM from level 2, shutdown at 4", () => {
    expect([0, 1, 2, 4].map(heatEffect)).toMatchObject([
      { attack: 0, moveLoss: 0, tmmLoss: 0, shutdown: false },
      { attack: 1, moveLoss: 2, tmmLoss: 0, shutdown: false },
      { attack: 2, moveLoss: 4, tmmLoss: 1, shutdown: false },
      { attack: 4, moveLoss: 8, tmmLoss: 1, shutdown: true },
    ]);
  });

  it("offers the optional rules from Advanced up", () => {
    const levels: RulesLevel[] = ["introductory", "standard", "advanced", "unlimited"];
    expect(levels.map(offersOptional)).toEqual([false, false, true, true]);
  });
});
