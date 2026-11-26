import { beforeAll, describe, expect, it } from "vitest";
import { ABOM_TYPES } from "../data/gothic";
import { loadCatalog, mountableOn, type Catalog } from "./catalog";
import { checkAbomination, checkForce, clusterColumn, conditionEffect, creatureFor, damageModifier, initiativeModifiers, launcherTubes, mobHobbleModifier, newAbominationUnit, newForceMech, newForceUnit, stackCheck, stumbleTarget, unitStats, withDefaults } from "./abomination";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});

const NEW_ROWS = ["light-antimech-rifle-gothic", "medium-antimech-rifle-gothic", "heavy-antimech-rifle-gothic", "srm-5-gothic", "rocket-launcher-5-gothic"];

describe("Abomination weapons in the catalog", () => {
  it("the new rows are never offered to a BattleMech, and no shared row repeats its figures under `by.abomination`", () => {
    for (const id of NEW_ROWS) {
      const row = catalog.byId(id);
      expect(row, id).toBeDefined();
      expect(mountableOn(row!, "mech"), id).toBe(false);
    }
    expect(catalog.offered("total-warfare", { techBase: "inner-sphere", year: null }).some((r) => NEW_ROWS.includes(r.id))).toBe(false);
    expect(catalog.all().filter((r) => r.by && "abomination" in r.by).map((r) => r.id)).toEqual([]);
  });
});

describe("the ten types", () => {
  // Typed from the sheets (PDF index 33 and 34), not from the data: id, class, creatures, pips each, ground, jump, VTOL, Mob, Hobble, Melee.
  it.each([
    ["gnat", "swarmer", 6, 3, 1, 0, 6, 1, 1, 1],
    ["werebeast", "swarmer", 5, 6, 3, 2, 0, 4, 4, 2],
    ["devil", "swarmer", 4, 8, 1, 4, 0, 4, 4, 2],
    ["cricket", "swarmer", 5, 12, 1, 3, 0, null, null, 2],
    ["rampager", "hulk", 3, 30, 4, 0, 0, null, null, 6],
    ["tyrant", "hulk", 3, 26, 2, 0, 0, null, null, 4],
    ["colossus", "giant", 2, 48, 2, 0, 0, null, null, 5],
    ["troll-king", "giant", 2, 48, 2, 0, 0, null, null, 5],
    ["stone-giant", "titan", 1, 80, 2, 0, 0, null, null, 6],
    ["ravager", "titan", 1, 90, 3, 0, 0, null, null, 7],
  ])("%s resolves to the sheet's figures", (id, classId, creatures, pips, ground, jump, vtol, mob, hobble, melee) => {
    const stats = unitStats(newAbominationUnit(id, "u"));
    expect(stats).toMatchObject({ classId, creatures, pipsEach: pips, ground, mob, hobble, melee });
    expect([stats?.jump ?? 0, stats?.vtol ?? 0]).toEqual([jump, vtol]);
    expect(stats?.creatures).toBeLessThanOrEqual(stats?.size?.maxCreatures ?? 0);
  });

  it("every type passes its own check, its weapons being Abomination rows", () => {
    for (const type of ABOM_TYPES) {
      const findings = checkAbomination(newAbominationUnit(type.id, "u"), "standard", catalog);
      expect(findings, type.id).toEqual([]);
    }
  });
});

describe("play helpers", () => {
  it("a launcher's cluster column is tubes times active creatures: the Tyrant's SRM 5 is 15, then 10; a laser is the creature count", () => {
    const tubes = launcherTubes(catalog.byId("srm-5-gothic")!);
    expect([clusterColumn(tubes, 3), clusterColumn(tubes, 2), clusterColumn(undefined, 3)]).toEqual([15, 10, 3]);
  });

  it.each([
    [6, 1, 0],
    [4, 1, 0],
    [3, 2, 1],
    [2, 3, 3],
    [1, 3, 5],
  ])("with %i creatures active the Mob modifier is %i and the Hobble modifier %i (sheet, index 33)", (active, mob, hobble) => {
    expect([mobHobbleModifier("mob", active), mobHobbleModifier("hobble", active)]).toEqual([mob, hobble]);
  });

  it("each creature killed adds 1 to attacks, and the stumble target adds it with +1 above 20 damage", () => {
    expect([0, 1, 3].map(damageModifier)).toEqual([0, 1, 3]);
    expect([stumbleTarget(4, 20, 0), stumbleTarget(4, 21, 0), stumbleTarget(4, 21, 2)]).toEqual([4, 5, 7]);
  });

  it("the Random Creature Number Table rerolls for 4 and 5 creatures, and for a creature already out", () => {
    expect([creatureFor(5, 4), creatureFor(6, 4), creatureFor(6, 5), creatureFor(5, 5), creatureFor(6, 6)]).toEqual(["reroll", "reroll", "reroll", 5, 6]);
    expect([creatureFor(2, 4, [2]), creatureFor(2, 4, [1])]).toEqual(["reroll", 2]);
  });
});

describe("the check and the record", () => {
  it("reports Mob damage on a Giant and a custom type below Fan-made", () => {
    const giant = { ...newAbominationUnit("colossus", "g"), custom: { ...ABOM_TYPES.find((t) => t.id === "colossus")!, name: "Mine", mob: 2 } };
    expect(checkAbomination({ ...giant, typeId: undefined }, "fan-made").map((f) => f.check)).toEqual(["physical"]);
    expect(checkAbomination({ ...giant, typeId: undefined }, "standard").map((f) => f.check)).toEqual(["physical", "level"]);
  });

  it("reads without throwing, keeps a type and keys it does not know, and applies the Handler bonus to both skills", () => {
    const read = withDefaults({ schema: 1, typeId: "kraken", future: { a: 1 }, handlerBonus: true, gunnery: "x" }, "k1");
    expect(read).toMatchObject({ id: "k1", typeId: "kraken", future: { a: 1 }, gunnery: 4, handlerBonus: true });
    expect(unitStats(read!)).toBeUndefined();
    expect(checkAbomination(read!, "standard")[0]?.level).toBe("warning");
    expect(unitStats({ ...newAbominationUnit("gnat", "g"), handlerBonus: true })).toMatchObject({ gunneryEffective: 3, animeleeEffective: 3 });
    expect([withDefaults(null), withDefaults({ schema: 2 }), withDefaults([])]).toEqual([undefined, undefined, undefined]);
  });
});

describe("forces", () => {
  const mech = (id: string, over: Partial<ReturnType<typeof newForceMech>> = {}) => ({ ...newForceMech(`rec-${id}`, id), ...over });
  const unit = (id: string, over: Partial<ReturnType<typeof newForceUnit>> = {}) => ({ ...newForceUnit(`u-${id}`, id), ...over });
  const lookup = { mech: (r: string) => ({ name: r, tons: r === "rec-light" ? 35 : 50 }), unit: (u: string) => u };

  it.each([
    { name: "a Handler on a 35-ton 'Mech", mechs: [mech("light", { handler: true })], units: [], expected: ["handler-weight"] },
    { name: "a Handler on a 40-ton 'Mech is fine, three units are fine", mechs: [mech("m", { handler: true })], units: ["a", "b", "c"].map((i) => unit(i, { handlerOf: "m" })), expected: [] },
    { name: "a fourth unit on one Handler", mechs: [mech("m", { handler: true })], units: ["a", "b", "c", "d"].map((i) => unit(i, { handlerOf: "m" })), expected: ["handler-count"] },
    { name: "a bonus with no Handler", mechs: [mech("m")], units: [unit("a", { handlerBonus: true })], expected: ["handler-bonus"] },
    { name: "a link to a 'Mech with no Handler aboard", mechs: [mech("m")], units: [unit("a", { handlerOf: "m" })], expected: ["handler-bonus"] },
  ])("reports $name", ({ mechs, units, expected }) => {
    expect(checkForce({ mechs, units }, lookup).map((f) => f.check)).toEqual(expected);
  });

  it.each([
    { name: "Abominations only", mechs: [], units: [unit("a")], expected: [-4] },
    { name: "an empty force", mechs: [], units: [], expected: [] },
    { name: "a 'Mech beside Abominations lifts the -4", mechs: [mech("m")], units: [unit("a")], expected: [] },
    { name: "a Frayed leader", mechs: [mech("m", { frayed: true }), mech("n")], units: [], expected: [-2] },
    { name: "every 'Mech Frayed", mechs: [mech("m"), mech("n", { frayed: true })].map((m) => ({ ...m, frayed: true })), units: [], expected: [-2] },
    { name: "a Frayed pilot who is not the leader", mechs: [mech("m"), mech("n", { frayed: true })], units: [], expected: [] },
  ])("Initiative: $name", ({ mechs, units, expected }) => {
    expect(initiativeModifiers({ mechs, units }).map((m) => m.value)).toEqual(expected);
  });
});
describe("stacking (rulebook pp. 64 and 69, with the owner's ruling for an enemy 'Mech)", () => {
  const ids = ["swarmer", "hulk", "giant", "titan"] as const;
  it.each([
    ["none", [6, 3, 2, 1]],
    ["friendly", [4, 1, 0, 0]],
    ["enemy", [2, 0, 0, 0]],
  ] as const)("limits with %s 'Mech in the hex", (mech, limits) => {
    expect(ids.map((id) => stackCheck([], mech).limits[id])).toEqual(limits);
  });

  it("mixed classes count by Swarmer equivalents: a Titan and a Hulk fill the hex, a Titan and a Giant do not", () => {
    expect(stackCheck([{ classId: "titan" }, { classId: "hulk" }]).legal).toBe(true);
    const over = stackCheck([{ classId: "titan" }, { classId: "giant" }]);
    expect(over).toMatchObject({ legal: false, overWeight: true, used: 7 });
  });

  it("reports the room left, and the class that is over its limit", () => {
    expect(stackCheck([{ classId: "giant" }], "none").room).toEqual({ swarmer: 3, hulk: 1, giant: 1, titan: 0 });
    expect(stackCheck([{ classId: "hulk" }, { classId: "hulk" }], "friendly")).toMatchObject({ legal: false, overLimit: ["hulk"] });
  });

  it("a flier is ignored unless another unit is at its height", () => {
    const hulk = { classId: "hulk" as const, height: 3 };
    expect(stackCheck([{ classId: "titan" }, hulk]).used).toBe(4);
    expect(stackCheck([{ classId: "titan" }, hulk, { ...hulk }]).used).toBe(8);
  });
});

describe("planetary conditions for a unit with ultraviolet sensitivity (p. 90)", () => {
  it.each([
    ["full-moon-night", "abomination", { mp: 0, weapon: 0, physical: 0 }],
    ["moonless-night", "abomination", { mp: 0, weapon: 1, physical: 0 }],
    ["pitch-black", "frayed", { mp: 1, weapon: 2, physical: 0 }],
    ["glaring-sun", "abomination", { mp: 2, weapon: 3, physical: 1 }],
    ["glaring-sun", "frayed", { mp: 1, weapon: 2, physical: 0 }],
  ] as const)("%s for %s", (id, who, effect) => {
    expect(conditionEffect(id, who)).toEqual(effect);
  });
});
