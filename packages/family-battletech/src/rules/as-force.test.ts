import { describe, expect, it } from "vitest";
import { duplicateForce, forceTotals, newAsForce, pvStep, skillAdjustedPv } from "./as-force";
import { newAsUnit } from "./as-unit";
import type { AsUnit } from "./as-unit";

const unitWithPv = (id: string, pv: number): AsUnit => {
  const unit = newAsUnit(id);
  unit.card.pv = pv;
  return unit;
};

describe("Alpha Strike force rules", () => {
  it("steps the PV by the two tables of ASCE p. 29 at every row edge and past the footnotes", () => {
    const decrease: [number, number][] = [[0, 1], [14, 1], [15, 2], [24, 2], [25, 3], [44, 4], [45, 5], [94, 9], [95, 10], [104, 10], [105, 11], [114, 11], [115, 12]];
    for (const [base, step] of decrease) expect(pvStep(base, "decrease"), `decrease at ${String(base)}`).toBe(step);
    const increase: [number, number][] = [[0, 1], [7, 1], [8, 2], [12, 2], [13, 3], [22, 4], [23, 5], [47, 9], [48, 10], [52, 10], [53, 11], [57, 11], [58, 12]];
    for (const [base, step] of increase) expect(pvStep(base, "increase"), `increase at ${String(base)}`).toBe(step);
  });

  it("adjusts a PV for Skill: the three worked values in the book, Skill 4 unchanged, and a floor of 1", () => {
    const cases: [number, number, number][] = [
      [35, 6, 27], // p. 29: two steps down at 4 each
      [39, 2, 55], // p. 29: two steps up at 8 each
      [35, 1, 56], // p. 111: three steps up at 7 each
      [36, 4, 36],
      [3, 7, 1],
      [0, 4, 1],
      [20, 9, 20 - 3 * 2], // a Skill past the table is held to 7
    ];
    for (const [base, skill, expected] of cases) expect(skillAdjustedPv(base, skill), `${String(base)} at Skill ${String(skill)}`).toBe(expected);
  });

  it("totals the adjusted PV against the limit, counts units that are gone as nothing, and copies a force under a new id", () => {
    const roster = new Map([unitWithPv("a", 35), unitWithPv("b", 39)].map((u) => [u.id, u]));
    const force = { ...newAsForce("f1", "Strike lance"), pvLimit: 80, members: [{ unitId: "a", skill: 6, pilot: "Ada" }, { unitId: "b", skill: 2 }, { unitId: "gone", skill: 4 }] };
    const totals = forceTotals(force, roster);
    expect(totals.lines.map((l) => l.adjusted)).toEqual([27, 55, 0]);
    expect(totals).toMatchObject({ total: 82, count: 2, missing: 1, room: -2 });
    expect(forceTotals({ ...force, pvLimit: undefined }, roster).room).toBeUndefined();

    const copy = duplicateForce(force, "f2");
    expect(copy).toMatchObject({ id: "f2", name: "Strike lance copy", pvLimit: 80 });
    expect(copy.members).toEqual(force.members);
    copy.members[0]!.skill = 0;
    expect(force.members[0]?.skill).toBe(6);
  });
});
