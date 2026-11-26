// The TechManual's worked infantry examples (pp. 145-155, 276, Battle Value v4.1 p. 309) as the tests of the build, plus the record and the check.
import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import type { Catalog } from "../catalog";
import { checkInfantry } from "./checks";
import { infantryBv, infantryCost, newInfantryRecord, platoonOf, splitLines, withDefaults } from "./platoon";
import type { InfantryRecord } from "./platoon";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});

const make = (over: Partial<InfantryRecord>, init: Parameters<typeof newInfantryRecord>[0] = {}): InfantryRecord => ({ ...newInfantryRecord(init, "t"), ...over });

describe("platoon build (the book's examples)", () => {
  it("a motorized laser rifle platoon of 28: damage 8, 0 then 1 then 1, ranges, 6 tons with the kit, cost", () => {
    const r = make({ primary: "inf-laser-rifle-is", antiMech: true }, { motive: "motorized" });
    const p = platoonOf(r, catalog);
    expect([p.troopers, p.totalDamage, p.damageAt[0], p.damageAt[1], p.damageAt[2], p.damageAt[27]]).toEqual([28, 8, 0, 1, 1, 8]);
    expect(p.rangeMods).toEqual([-2, 0, 0, 2, 2, 4, 4]);
    expect([p.mp, p.weight]).toEqual([3, 6]);
    expect(infantryCost({ ...r, antiMech: false }, catalog).total).toBe(3167838.38); // the book rounds this down to 3,167,838; errata v8.0 rounds up to .01
  });

  it("the Marian foot platoon of 100: four lines of 25, damage 60, two support machine guns a squad, move or shoot, 10 tons", () => {
    const r = make({ primary: "inf-auto-rifle-is", secondary: { weapon: "inf-machine-gun-support-is", perSquad: 2 }, antiMech: true }, { formation: "marian" });
    const p = platoonOf({ ...r, squads: 10, perSquad: 10 }, catalog);
    expect([p.lines, p.totalDamage, p.perTrooper, p.damageAt[24]]).toEqual([[25, 25, 25, 25], 60, 0.6, 15]);
    expect(p.rangeMods.slice(0, 3)).toEqual([-2, 0, 0]); // -2, -1 heavy burst, +1 crew 2
    expect([p.moveOrShoot, p.heavyBurst, p.weight, p.linesWeight[0]]).toEqual([true, true, 10, 2.5]);
  });

  it("the hover LRM platoon: damage 10 (the book example prints 8 from the older 0.19 figure; the v4.1 table has 0.48), 4 MP, -1 at hex 0, 20 tons; the tracked Clan point: 17, -1, 3 MP", () => {
    const hover = platoonOf(make({ primary: "inf-auto-rifle-is", secondary: { weapon: "inf-lrm-launcher-corean-farshot-is", perSquad: 2 } }, { motive: "hover" }), catalog);
    expect([hover.totalDamage, hover.mp, hover.rangeMods[0], hover.rangeMods.length, hover.weight]).toEqual([10, 4, -1, 10, 20]);
    const point = platoonOf(make({ primary: "inf-gauss-submachine-gun-clan", secondary: { weapon: "inf-autocannon-bearhunter-super-heavy-clan", perSquad: 1 } }, { motive: "tracked", techBase: "clan" }), catalog);
    expect([point.totalDamage, point.mp, point.rangeMods[0], point.heavyBurst, point.weight]).toEqual([17, 3, -1, false, 20]);
  });

  it("a primary weapon over 0.60 is held to it and the platoon gains heavy burst", () => {
    const p = platoonOf(make({ primary: "inf-laser-rifle-federated-barrett-m61a-is" }), catalog);
    expect([p.primaryDamage, p.capped, p.heavyBurst]).toEqual([0.6, true, true]);
  });

  it("Battle Value of the anti-'Mech jump platoon of 21 with 3 heavy support lasers is 168", () => {
    const r = make({ primary: "inf-laser-rifle-blazer-is", secondary: { weapon: "inf-support-laser-heavy-is", perSquad: 1 }, antiMech: true, perSquad: 7, squads: 3 }, { motive: "jump" });
    const bv = infantryBv(r, catalog);
    expect([bv.targetModifier, bv.speed, bv.bv]).toEqual([2, 0.77, 168]);
  });

  it("Battle Value with the Advanced infantry rules: damage divisor and specialty modifier; unknown cases are not worked out", () => {
    const foot = make({ primary: "inf-auto-rifle-is", armor: "ballistic-plate-standard", specializations: ["marines"], perSquad: 7, squads: 4 });
    const bv = infantryBv(foot, catalog);
    expect([bv.defensive, bv.bv]).toEqual([84, 146]); // 28 x 2 x 1.5 = 84; (84 + 2 x 28 x 1.59 x 0.54) x 1.3 x 0.85
    // Mechanized infantry use the 5 column (Gunnery 4 and 5 is 1.0), not a fixed 8.
    expect(infantryBv(make({ primary: "inf-auto-rifle-is" }, { motive: "hover" }), catalog).skill).toBe(1);
  });

  it("a sneak suit adds the Defensive Factor bonus of each chosen system (TO:AUE p. 191: camo 0.2, IR 0.2, ECM 0.1), defaulting to the owner's choices", () => {
    // 28 foot troopers with auto rifles: offense 2 x 28 x 1.59 x 0.54 = 48.0816, skill 0.85, divisor 1, so defense is 28 x 1 x 1.5 x (1 + bonus).
    const suit = make({ primary: "inf-auto-rifle-is", perSquad: 7, squads: 4 });
    const bvOf = (armor: string, sneakSystems?: string[]) => infantryBv({ ...suit, armor, ...(sneakSystems ? { sneakSystems } : {}) }, catalog).bv;
    // one system (IR, +0.2): (50.4 + 48.0816) x 0.85 = 83.7; two (IR + ECM, +0.3): (54.6 + 48.0816) x 0.85 = 87.3; three (+0.5): (63 + 48.0816) x 0.85 = 94.4
    expect([bvOf("sneak-1"), bvOf("sneak-2"), bvOf("sneak-3")]).toEqual([84, 87, 94]);
    // chosen: camo + ECM on a two-system suit (+0.3) is the same; a choice over the suit's count is cut to it (camo + IR, +0.4: (58.8 + 48.0816) x 0.85 = 90.9)
    expect([bvOf("sneak-2", ["camo", "ecm"]), bvOf("sneak-2", ["camo", "ir", "ecm"])]).toEqual([87, 91]);
    // an old record has no sneakSystems and loads with the defaults of the suit
    const old = withDefaults({ ...suit, armor: "sneak-3" }, "x") as InfantryRecord;
    expect([old.sneakSystems, platoonOf(old, catalog).sneakSystems]).toEqual([undefined, ["camo", "ir", "ecm"]]);
  });

  it("a mechanized platoon under the Advanced rules keeps the Hover row's Unit Type Modifier of 0.7 (TO:AUE p. 193; the table has no motorized row)", () => {
    const r = make({ primary: "inf-auto-rifle-is", armor: "flak-standard" }, { motive: "hover" });
    const p = platoonOf(r, catalog);
    const bv = infantryBv(r, catalog);
    // 20 troopers, 5 MP (+2, Defensive Factor 1.2): defense 20 x 1 x 1.5 x 1.2 = 36; offense 20 x 1.59 x 1.00 = 31.8, not doubled (no anti-Mech attacks); (36 + 31.8) x 0.7 x 1.0 = 47.46 (TO:AUE pp. 191, 193, TM pp. 309, 317)
    expect([p.troopers, p.mp, bv.targetModifier, bv.bv]).toEqual([20, 5, 2, 47]);
  });

  it("splits a platoon into the fewest even lines, odd troopers to the first", () => {
    expect([splitLines(100, 30), splitLines(37, 30), splitLines(28, 30), splitLines(0, 30)]).toEqual([[25, 25, 25, 25], [19, 18], [28], []]);
  });
});

describe("record and check", () => {
  it("reads a record with its defaults, keeps unknown keys and refuses what is not a record", () => {
    expect(withDefaults({ kind: "mech" }, "x")).toBeUndefined();
    const r = withDefaults({ kind: "infantry", id: "a", squads: 3, extra: 1 }, "x") as InfantryRecord & { extra: number };
    expect([r.id, r.squads, r.motive, r.extra]).toEqual(["a", 3, "foot", 1]);
  });

  it("finds a melee weapon on mechanized infantry, too many support weapons, and an armor kit below Advanced", () => {
    const r = make({ primary: "inf-blade-sword-is", armor: "flak-standard", secondary: { weapon: "inf-mortar-heavy-is", perSquad: 2 } }, { motive: "hover" });
    const checks = checkInfantry(r, catalog).map((f) => f.check);
    expect(checks).toEqual(expect.arrayContaining(["mechanized-melee", "secondary-limit", "armor-level"]));
    expect(checkInfantry({ ...r, rulesLevel: "introductory" }, catalog).map((f) => f.check)).toContain("introductory-infantry");
  });
});
