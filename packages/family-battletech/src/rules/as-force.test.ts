import { describe, expect, it } from "vitest";
import { checkFormation, duplicateForce, findFormation, findSpa, forceScas, forceSpas, forceTotals, groupFindings, groupTotals, inPlay, memberSpas, newAsForce, playFindings, pvStep, readFilter, skillAdjustedPv, unitAllowsSpa } from "./as-force";
import type { AsForce, AsMember } from "./as-force";
import { newAsUnit, parseMove } from "./as-unit";
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

describe("the play filter", () => {
  const unit = (year: number | null | undefined, techBase?: AsUnit["techBase"]): AsUnit => ({ ...newAsUnit("u"), year, techBase });
  it.each([
    [unit(3050), { year: 3025 }, false],
    [unit(3025), { year: 3025 }, true],
    [unit(undefined), { year: 3025 }, true],
    [unit(3000, "clan"), { techBase: "inner-sphere" as const }, false],
    [unit(3000, "mixed"), { techBase: "inner-sphere" as const }, true],
    [unit(3000, "inner-sphere"), {}, true],
    [{ ...unit(3000), rulesLevel: "advanced" as const }, {}, false], // Standard is the level until one is chosen
    [{ ...unit(3000), rulesLevel: "advanced" as const }, { rulesLevel: "advanced" as const }, true],
    [unit(3000), { rulesLevel: "introductory" as const }, false], // a unit that states no level counts as Standard
  ])("%#: picks or hides", (u, filter, shown) => {
    expect(inPlay(u, filter)).toBe(shown);
  });
  it("reports a unit in use that the setting would hide, instead of hiding it", () => {
    const u: AsUnit = { ...unit(3060), rulesLevel: "experimental" };
    expect(playFindings(u, { year: 3050 }).map((f) => f.id)).toEqual(["play-level", "play-year"]);
    expect(playFindings(u, { rulesLevel: "experimental", year: 3060 })).toEqual([]);
  });
  it("reads a stored filter and drops what it does not know", () => {
    expect(readFilter({ year: 3050.5, techBase: "both", rulesLevel: "huge", editionId: "old", extra: 1 })).toEqual({});
    expect(readFilter({ year: 3050, techBase: "clan", rulesLevel: "advanced", editionId: "asce" })).toEqual({ year: 3050, techBase: "clan", rulesLevel: "advanced", editionId: "asce" });
  });
});

describe("groups and formation types", () => {
  type Spec = { size?: number; role?: string; move?: string; armor?: number; m?: number; l?: number; s?: number; type?: string; specials?: string[]; model?: string };
  const unit = (id: string, spec: Spec): AsUnit => {
    const u = newAsUnit(id);
    const parsed = parseMove(spec.move ?? "6\"");
    u.card = {
      ...u.card,
      type: spec.type ?? "BM",
      size: spec.size ?? 2,
      role: spec.role ?? null,
      armor: spec.armor ?? 4,
      move: parsed.ok ? parsed.value : [],
      damage: { s: { value: spec.s ?? 2 }, m: { value: spec.m ?? 2 }, l: { value: spec.l ?? 1 } },
      specials: (spec.specials ?? []).map((code) => ({ code, values: [], raw: code })),
      pv: 30,
    };
    u.name = { chassis: spec.model ?? id, model: "" };
    return u;
  };
  const group = (specs: Spec[], officerAt?: number) => {
    const units = specs.map((s, i) => unit(`u${String(i)}`, s));
    const force = { ...newAsForce("f"), members: units.map((u, i) => ({ unitId: u.id, skill: 4, group: "g", ...(i === officerAt ? { officer: "commander" as const } : {}) })) };
    const totals = forceTotals(force, new Map(units.map((u) => [u.id, u])));
    return { force: { ...force, groups: [{ id: "g", name: "G" }] }, totals };
  };
  const meets = (id: string, specs: Spec[], officerAt?: number): boolean => {
    const { totals } = group(specs, officerAt);
    return checkFormation(findFormation(id)!, totals.lines).met;
  };
  const four = (spec: Spec): Spec[] => [spec, spec, spec, spec];

  it("checks each formation type against a group that meets it and one that does not", () => {
    const cases: [string, Spec[], Spec[], number?][] = [
      ["battle", [{ size: 3, role: "Brawler" }, { size: 3, role: "Sniper" }, { size: 2, role: "Skirmisher" }, { size: 1 }], [{ size: 3, role: "Brawler" }, { size: 2 }, { size: 2 }, { size: 1 }]],
      ["battle-light", [{ size: 1, role: "Scout" }, { size: 1 }, { size: 1 }, { size: 2 }], [{ size: 1 }, { size: 1 }, { size: 1 }, { size: 2 }]],
      ["assault", [{ size: 3, role: "Juggernaut", m: 3, armor: 5 }, { size: 3, m: 3, armor: 5 }, { size: 3, m: 3, armor: 5 }, { size: 2, m: 3, armor: 5 }], [{ size: 3, role: "Juggernaut", m: 3, armor: 5 }, { size: 3, m: 3, armor: 5 }, { size: 2, m: 3, armor: 5 }, { size: 2, m: 3, armor: 5 }]],
      ["assault-fast", [{ size: 3, role: "Juggernaut", m: 3, armor: 5, move: "10\"" }, { size: 3, m: 3, armor: 5, move: "6\"/4\"j" }, { size: 3, m: 3, armor: 5, move: "10\"" }, { size: 2, m: 3, armor: 5, move: "10\"" }], [{ size: 3, role: "Juggernaut", m: 3, armor: 5 }, { size: 3, m: 3, armor: 5 }, { size: 3, m: 3, armor: 5 }, { size: 2, m: 3, armor: 5 }]],
      ["striker", [{ move: "10\"", role: "Striker" }, { move: "8\"/8\"j", role: "Skirmisher" }, { move: "12\"" }, { move: "10\"" }], [{ move: "10\"", role: "Striker" }, { move: "8\"", role: "Skirmisher" }, { move: "12\"" }, { move: "10\"" }]],
      ["fire-support", [{ specials: ["IF"] }, { specials: ["IF"] }, { specials: ["IF"] }, {}], [{ specials: ["IF"] }, { specials: ["IF"] }, {}, {}]],
      ["fire-artillery", [{ specials: ["ARTLT"] }, { specials: ["ARTAC"] }, {}, {}], [{ specials: ["ARTLT"] }, {}, {}, {}]],
      ["fire-antiair", [{ role: "Sniper", specials: ["FLK"] }, { role: "Sniper", specials: ["AC"] }, { role: "Missile Boat" }, { role: "Missile Boat" }], [{ role: "Sniper", specials: ["FLK"] }, { role: "Sniper" }, { role: "Missile Boat" }, { role: "Missile Boat" }]],
      ["recon-light", [{ size: 1, move: "12\"", role: "Scout" }, { size: 1, move: "14\"", role: "Scout" }], [{ size: 1, move: "12\"", role: "Scout" }, { size: 1, move: "10\"", role: "Scout" }]],
      ["pursuit", [{ size: 2, move: "12\"", m: 2 }, { size: 2, move: "12\"" }, { size: 1, move: "14\"" }, { size: 2, move: "8\"" }], [{ size: 3, move: "12\"", m: 2 }, { size: 2, move: "12\"" }, { size: 1, move: "14\"" }, { size: 2, move: "8\"" }]],
      ["command", [{ role: "Sniper" }, { role: "Skirmisher" }, { role: "Scout" }, { role: "Brawler" }], [{ role: "Sniper" }, { role: "Brawler" }, { role: "Scout" }, { role: "Brawler" }], 0],
      ["support", [{}], []],
      ["interceptor", [{ type: "AF", role: "Interceptor" }, { type: "AF", role: "Interceptor" }, { type: "AF", role: "Dogfighter" }], [{ type: "AF", role: "Interceptor" }, { type: "AF", role: "Dogfighter" }]],
      ["ew", [{ type: "AF", specials: ["ECM"] }, { type: "AF", specials: ["TAG"] }, { type: "AF" }], [{ type: "AF", specials: ["ECM"] }, { type: "AF" }]],
    ];
    for (const [id, good, bad, officerAt] of cases) {
      expect(meets(id, good, officerAt), `${id} meets`).toBe(true);
      expect(meets(id, bad, id === "command" ? undefined : officerAt), `${id} fails`).toBe(false);
    }
  });

  it("lets every unit with the ideal role stand in for the requirements, but never for a variation", () => {
    const scouts = four({ role: "Scout", move: "4\"", size: 3 });
    expect(meets("recon", scouts)).toBe(true);
    expect(meets("recon-light", scouts)).toBe(false);
    expect(checkFormation(findFormation("recon")!, group(scouts).totals.lines).waivedBy).toBe("Scout");
  });

  it("scales a count to a Star and rounds a percentage up, and names what is missing", () => {
    const star = group([...Array.from({ length: 4 }, () => ({ size: 3, role: "Sniper" })), { size: 1 }]);
    expect(checkFormation(findFormation("battle")!, star.totals.lines).met).toBe(true); // 3 of 4 scales to 4 of 5
    const thin = group([{ size: 3, role: "Sniper" }, { size: 3, role: "Sniper" }, { size: 1 }, { size: 1 }, { size: 1 }]);
    const failed = checkFormation(findFormation("battle")!, thin.totals.lines);
    expect(failed.missing).toEqual([
      "At least 50% of the units: Size 3 or more (the group has 2, needs 3)",
      "At least 3 units: role Brawler, Sniper or Skirmisher (the group has 2, needs 4)",
    ]);
  });

  it("needs matched pairs only when the group is all vehicles", () => {
    const tank = (model: string): Spec => ({ type: "CV", size: 1, move: "10\"t", model });
    const pairs = [tank("A"), tank("A"), tank("B"), tank("B")];
    const odd = [tank("A"), tank("B"), tank("C"), tank("D")];
    const scout = { role: "Scout" };
    expect(meets("battle-light", pairs.map((p) => ({ ...p, ...scout })))).toBe(true);
    expect(meets("battle-light", odd.map((p) => ({ ...p, ...scout })))).toBe(false);
  });

  it("keeps the totals when a unit moves between groups, and advises on a group the wrong size for its organisation", () => {
    const g = group(four({ size: 2 }));
    const two = { ...g.force, groups: [{ id: "g", name: "A", org: "is-lance" }, { id: "h", name: "B" }], members: g.force.members.map((m, i) => (i < 1 ? { ...m, group: "h" } : m)) };
    const by = groupTotals(two, forceTotals(two, new Map(g.totals.lines.flatMap((l) => (l.unit ? [[l.unit.id, l.unit] as const] : [])))));
    expect(by.groups.map((x) => [x.count, x.total])).toEqual([[3, 90], [1, 30]]);
    expect(by.ungrouped.count).toBe(0);
    expect(by.groups.reduce((sum, x) => sum + x.total, 0)).toBe(g.totals.total);
    expect(groupFindings(two.groups[0]!, 3)[0]).toContain("4 ground units");
    expect(groupFindings(two.groups[0]!, 4)).toEqual([]);
  });
});

describe("pilot and command abilities", () => {
  const roster = (n: number, type = "BM"): AsUnit[] => Array.from({ length: n }, (_, i) => ({ ...newAsUnit(`a${String(i)}`), card: { ...newAsUnit("x").card, type, pv: 20 } }));
  const forceOf = (units: AsUnit[], members: Partial<AsMember>[]): { force: AsForce; totals: ReturnType<typeof forceTotals> } => {
    const force = { ...newAsForce("f"), members: units.map((u, i) => ({ unitId: u.id, skill: 4, ...members[i] })) };
    return { force, totals: forceTotals(force, new Map(units.map((u) => [u.id, u]))) };
  };

  it("adds up SPA points against the Skill table, with a bought cost held to its range", () => {
    const [mech] = roster(1);
    const one = (skill: number, spas: AsMember["spas"]) => memberSpas({ unitId: "a0", skill, spas }, mech);
    expect(one(4, [{ id: "sniper" }])).toMatchObject({ count: 1, points: 3, limit: { count: 1, points: 2 } });
    expect(one(4, [{ id: "sniper" }]).problems).toHaveLength(1); // 3 points against 2
    expect(one(3, [{ id: "fist-fire" }, { id: "float-like-a-butterfly", points: 2 }])).toMatchObject({ count: 2, points: 4, problems: [] }); // the worked example, p. 112
    expect(one(3, [{ id: "lucky", points: 9 }]).points).toBe(4);
    expect(one(6, [{ id: "dodge" }]).problems[0]).toContain("allows 0");
  });

  it("keeps an SPA to the unit types the book names", () => {
    const [mech, foot] = [roster(1)[0]!, roster(1, "CI")[0]!];
    expect(unitAllowsSpa(mech, findSpa("zweihander")!)).toBe(true);
    expect(unitAllowsSpa(foot, findSpa("zweihander")!)).toBe(false);
    expect(unitAllowsSpa(foot, findSpa("urban-guerrilla")!)).toBe(true);
    expect(unitAllowsSpa({ ...mech, card: { ...mech.card, type: "CV", move: [{ inches: 8, mode: "v" }] } }, findSpa("dust-off")!)).toBe(true); // a VTOL
    expect(memberSpas({ unitId: "a0", skill: 2, spas: [{ id: "zweihander" }] }, foot).problems[0]).toContain("not for this unit type");
  });

  it("lets one unit per 12 hold SPAs, and one officer per 6 units with a single commander", () => {
    const units = roster(13);
    const spas = [{ id: "sniper" }];
    const two = forceOf(units, [{ spas }, { spas }]);
    expect(forceSpas(two.force, two.totals)).toMatchObject({ holders: 2, allowed: 2 }); // 13 units is two companies
    const crowded = forceOf(roster(6), [{ spas }, { spas }]);
    expect(forceSpas(crowded.force, crowded.totals).problems).toHaveLength(1);
    const officers = forceOf(roster(6), [{ officer: "commander" }, { officer: "key" }]);
    officers.force.commands = ["flankers"];
    expect(forceScas(officers.force, officers.totals).problems.join(" ")).toContain("allows 1 officers");
    const none = forceOf(roster(6), []);
    none.force.commands = ["flankers"];
    expect(forceScas(none.force, none.totals).problems.join(" ")).toContain("one officer named as the force commander");
  });

  it("allows command abilities by the average Skill and checks each one's own condition", () => {
    const at = (skill: number, commands: string[]) => {
      const f = forceOf(roster(2), [{ skill, officer: "commander" }, { skill }]);
      f.force.commands = commands;
      return forceScas(f.force, f.totals);
    };
    expect([0, 2, 3, 4, 6].map((s) => at(s, []).allowed)).toEqual([3, 2, 2, 1, 1]);
    expect(at(4, ["flankers", "camouflage"]).problems[0]).toContain("allows 1");
    expect(at(6, ["flankers"]).problems.join(" ")).toContain("general specializations");
    expect(at(6, ["tactical-specialization"]).problems).toEqual([]);
    expect(at(4, ["strategic-planning"]).problems.join(" ")).toContain("Veteran or better");
    expect(at(2, ["false-flag"]).problems.join(" ")).toContain("also needs Off-Map Movement");
    expect(at(2, ["false-flag", "off-map-movement"]).problems).toEqual([]);
  });
});
