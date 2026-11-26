import { beforeAll, describe, expect, it } from "vitest";
import { ABOM_TYPES } from "../data/gothic";
import { loadCatalog, mountableOn, type Catalog } from "./catalog";
import { checkAbomination, clusterColumn, creatureFor, damageModifier, launcherTubes, mobHobbleModifier, newAbominationUnit, stumbleTarget, unitStats, withDefaults } from "./abomination";

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

  it("every type passes its own check, its weapons being Abomination rows (the Light Blazer row comes from the ruleset piece)", () => {
    for (const type of ABOM_TYPES) {
      const findings = checkAbomination(newAbominationUnit(type.id, "u"), "standard", catalog).filter((f) => !f.message.includes("light-blazer-gothic"));
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
