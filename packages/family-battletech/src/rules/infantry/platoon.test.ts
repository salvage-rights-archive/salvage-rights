// The TechManual's worked infantry examples (pp. 145-155, 276, Battle Value v4.1 p. 309) as the tests of the build, plus the record and the check.
import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import type { Catalog } from "../catalog";
import { FIELD_GUN_ID } from "../../data/infantry-tables";
import { checkInfantry } from "./checks";
import { infantryBv, infantryCost, newInfantryRecord, offered, platoonOf, splitLines, withDefaults } from "./platoon";
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

  it("under the Advanced rules a mechanized platoon takes the Unit Type Modifier row of its motive (TO:AUE p. 193: hover 0.7, wheeled 0.8, tracked 0.9, VTOL 0.7), and a motive with no row takes 1.0", () => {
    const r = make({ primary: "inf-auto-rifle-is", armor: "flak-standard" }, { motive: "hover" });
    const p = platoonOf(r, catalog);
    const bv = infantryBv(r, catalog);
    // 20 troopers, 5 MP (+2, Defensive Factor 1.2): defense 20 x 1 x 1.5 x 1.2 = 36; offense 20 x 1.59 x 1.00 = 31.8, not doubled (no anti-Mech attacks); (36 + 31.8) x 0.7 x 1.0 = 47.46 (TO:AUE pp. 191, 193, TM pp. 309, 317)
    expect([p.troopers, p.mp, bv.targetModifier, bv.bv]).toEqual([20, 5, 2, 47]);
    const row = (motive: string) => infantryBv(make({ primary: "inf-auto-rifle-is", armor: "flak-standard" }, { motive }), catalog).unitType;
    expect(["hover", "wheeled", "tracked", "microlite", "microcopter", "motorized", "foot", "jump"].map(row)).toEqual([0.7, 0.8, 0.9, 0.7, 0.7, 1, 1, 1]);
    // Only Standard options: the TechManual Battle Value, so no motive row; any Advanced option (a medic here) switches to the Advanced rules.
    const plain = make({ primary: "inf-auto-rifle-is" }, { motive: "hover" });
    expect([infantryBv(plain, catalog).unitType, infantryBv({ ...plain, paramedics: 1 }, catalog).unitType]).toEqual([1, 0.7]);
  });

  it("splits a platoon into the fewest even lines, odd troopers to the first", () => {
    expect([splitLines(100, 30), splitLines(37, 30), splitLines(28, 30), splitLines(0, 30)]).toEqual([[25, 25, 25, 25], [19, 18], [28], []]);
  });
});

describe("the remaining canon infantry options (TO:AUE pp. 106-108, 122-123, 153, 162-163, 225)", () => {
  const foot = (over: Partial<InfantryRecord> = {}, init: Parameters<typeof newInfantryRecord>[0] = {}) => make({ primary: "inf-auto-rifle-is", ...over }, init);

  it("paramedics and TAG troops each take one of a squad's two secondary slots: a medic fires nothing and weighs 0.05 t more, costs 0.375 of the platoon's total, and TAG troops keep their weapon and the base price", () => {
    const medics = foot({ paramedics: 1 }); // 4 squads of 7: 4 medics, 24 shooters
    const same = foot({ perSquad: 6 }); // 24 troopers, no medics
    const p = platoonOf(medics, catalog);
    expect([p.medics, p.primaryTroopers, p.weight]).toEqual([4, 24, 4]); // 28 x (0.085 + 0.05) = 3.78 t on every trooper, to the half ton
    expect(infantryCost(medics, catalog).total).toBe(Math.floor(Math.floor(infantryCost(same, catalog).total) * (1 + 4 * 0.375))); // finished cost rounded down, then 4 x 0.375 of it
    const tag = platoonOf(foot({ tagTroops: 2, secondary: { weapon: "inf-machine-gun-support-is", perSquad: 2 } }), catalog);
    expect([tag.tagTroopers, tag.secondaryTroopers, tag.primaryTroopers, tag.specials.some((s) => /TAG attacks at 3\/6\/9/.test(s))]).toEqual([8, 0, 28, true]);
    expect(infantryCost(foot({ tagTroops: 2 }), catalog).total).toBe(infantryCost(foot(), catalog).total);
    // A specialty with no Secondary Weapons leaves no slot: no medics are built, and the check says so.
    const engineers = foot({ paramedics: 1, specializations: ["scuba-standard"] });
    expect([platoonOf(engineers, catalog).medics, checkInfantry({ ...engineers, rulesLevel: "advanced" }, catalog).map((f) => f.check).includes("medic-no-secondary")]).toEqual([0, true]);
  });

  it("mechanized SCUBA moves 3 Sub MP and weighs 1.0 t a trooper, at the base price; XCT troops cost 1.5 times and add 0.1 to the Unit Type Modifier", () => {
    const scuba = foot({ specializations: ["scuba-mechanized"] }, { motive: "wheeled" });
    const p = platoonOf(scuba, catalog);
    expect([p.mp, p.mpType, p.weight, p.troopers]).toEqual([3, "Sub", 24, 24]); // 24 x (0.1 + 0.9)
    expect(infantryCost(scuba, catalog).total).toBe(infantryCost({ ...scuba, specializations: [] }, catalog).total);
    const suit = foot({ armor: "spacesuit", xct: "vacuum" });
    expect(infantryCost(suit, catalog).total).toBeCloseTo(infantryCost({ ...suit, xct: null }, catalog).total * 1.5, 1);
    expect(infantryBv(suit, catalog).unitType).toBe(1.1);
    expect(checkInfantry({ ...suit, rulesLevel: "advanced", armor: "snowsuit" }, catalog).map((f) => f.check)).toContain("xct-armor");
  });

  it("a platoon of motorized infantry tows as many field guns as it has crew for; each adds its tons and a ton of ammunition, and a platoon with artillery moves 1 MP", () => {
    const base = foot({ primary: null, fieldGun: { weapon: "ac-5-is", count: 3 } }, { motive: "motorized" });
    const p = platoonOf(base, catalog);
    expect([p.gunCrew, p.fieldGuns, p.weight]).toEqual([8, 3, 32.5]); // 28 x 0.195 + 3 x (8 + 1) = 32.46
    expect(infantryBv(base, catalog).weaponBv).toBe(237); // 3 x (70 + 9): the gun and a ton of its ammunition
    const checks = (r: InfantryRecord) => checkInfantry({ ...r, rulesLevel: "advanced" }, catalog).map((f) => f.check);
    expect(checks({ ...base, fieldGun: { weapon: "ac-5-is", count: 4 } })).toContain("field-crew");
    expect(checks({ ...base, motive: "foot" })).toContain("field-motive");
    expect(checks({ ...base, fieldGun: { weapon: "heavy-gauss-rifle-is", count: 1 } })).toContain("field-gun-type");
    const art = platoonOf(foot({ fieldArtillery: "thumper-artillery-is" }, { motive: "motorized" }), catalog);
    expect([art.mp, art.mpType]).toEqual([1, "Ground"]);
    // Both crews are counted: 3 AC/5 guns (24 troopers) and a 15 t piece (15) need 39 of 28. Light and medium N-Gauss may be guns.
    const both = { ...base, fieldArtillery: "thumper-artillery-is" };
    expect([platoonOf(both, catalog).artilleryCrew, checks(both)]).toEqual([15, expect.arrayContaining(["field-crew", "field-artillery-crew"])]);
    expect(FIELD_GUN_ID.test("medium-n-gauss-is") && FIELD_GUN_ID.test("light-n-gauss-clan") && !FIELD_GUN_ID.test("heavy-n-gauss-is")).toBe(true);
    // The first line carries the guns when the platoon is split.
    expect(platoonOf({ ...base, squads: 10, perSquad: 10 }, catalog).linesWeight[0]).toBeGreaterThan(27);
  });

  it("beast-mounted infantry: the creature sets weight, movement and divisor, cost adds 5,000 a ton, and a Large creature may not carry support weapons", () => {
    const horse = foot({ beast: "horse", squads: 3, perSquad: 7 }, { motive: "beast" });
    const p = platoonOf(horse, catalog);
    expect([p.creatures, p.weight, p.mp, p.mpType]).toEqual([21, 15, 3, "Ground"]); // 21 x 0.2 + 21 x 0.5 = 14.7 t
    expect(infantryCost(horse, catalog).total).toBeCloseTo(infantryCost({ ...horse, motive: "foot" }, catalog).total + 5000 * 15, 1); // 14.7 t, rounded up to the half ton
    const elephant = foot({ beast: "elephant", squads: 7, perSquad: 2 }, { motive: "beast" });
    expect([platoonOf(elephant, catalog).creatures, platoonOf(elephant, catalog).divisor, infantryBv(elephant, catalog).defensive]).toEqual([7, 2, 42]); // 14 x 2 x 1.5 x (1 + 0 at 2 MP)
    const support = { ...horse, secondary: { weapon: "inf-machine-gun-support-is", perSquad: 1 }, rulesLevel: "advanced" as const };
    expect(checkInfantry(support, catalog).map((f) => f.check)).toContain("beast-support");
    // XCT for vacuum bars a beast mount; for toxic air it does not. A Very Large creature halves a support weapon's crew (the 3-crew heavy mortar becomes 2, so a squad of 2 carries 1, not 0).
    const trained = (xct: string) => checkInfantry({ ...elephant, rulesLevel: "advanced", xct }, catalog).map((f) => f.check);
    expect([trained("vacuum").includes("xct-beast"), trained("toxic").includes("xct-beast")]).toEqual([true, false]);
    expect(platoonOf({ ...elephant, secondary: { weapon: "inf-mortar-heavy-is", perSquad: 2 } }, catalog).secondaryLimit).toBe(1);
  });

  it("an Advanced option is hidden below the Advanced rules level and before its year, unless the platoon already holds it", () => {
    const marines = { year: 2200 };
    expect([offered("standard", 3050, marines), offered("advanced", 2100, marines), offered("advanced", 3050, marines), offered("advanced", null, marines), offered("standard", 2100, marines, true)]).toEqual([false, false, true, true, true]);
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
