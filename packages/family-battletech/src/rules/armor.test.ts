import { describe, expect, it } from "vitest";
import { ADVANCED_BV_MODIFIERS, ARMOR_BV_MODIFIER, ENGINE_BV_MODIFIER, STRUCTURE_BV_MODIFIER } from "../data/bv";
import { ARMOR, COCKPITS, ENGINE_TYPES, STRUCTURE_TYPES } from "../data/chassis";
import { ARMOR_COST, COCKPIT_COST, ENGINE_COST, STRUCTURE_COST } from "../data/cost";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { battleValue } from "./bv";
import { createCatalog, expand } from "./catalog";
import { runChecks } from "./checks";
import { bipedRecord, mount, quadRecord } from "./fixtures";
import { editRecord, engineTons, layout, weights } from "./mech";
import type { Mount, MechRecord } from "./mech";
import { shieldPoints } from "./shields";
import { movementPenalty, penalisedMovement } from "./walk";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));
const shield = (size: "small" | "medium" | "large", location: Mount["location"], id = `shield-${size}-${String(location)}`): Mount => ({
  ...mount(id, `shield-${size}-is`, location, null),
  name: `Shield, ${size}`,
});
/** The fixture biped with its equipment replaced and chassis parts patched. */
const walker = (mounts: Mount[], chassis: Partial<MechRecord["chassis"]> = {}, patch: Partial<MechRecord> = {}) => {
  const base = bipedRecord();
  return bipedRecord({ mounts, chassis: { ...base.chassis, ...chassis }, ...patch });
};
const findings = (record: MechRecord, check: string) => runChecks(record, catalog).filter((f) => f.check === check);

describe("the newer armor, structure, engine and cockpit types", () => {
  // [key, table, cost table, tech base, rules level, slots]: each has a cite and a page-read check, a cost row and a Battle Value modifier.
  const rows = [
    ["hardened", ARMOR, ARMOR_COST, "both", "experimental", 0],
    ["ferro-lamellor", ARMOR, ARMOR_COST, "clan", "experimental", 12],
    ["laser-reflective", ARMOR, ARMOR_COST, "inner-sphere", "experimental", 10],
    ["laser-reflective-clan", ARMOR, ARMOR_COST, "clan", "experimental", 5],
    ["reactive", ARMOR, ARMOR_COST, "inner-sphere", "experimental", 14],
    ["reactive-clan", ARMOR, ARMOR_COST, "clan", "experimental", 7],
    ["anti-penetrative-ablation", ARMOR, ARMOR_COST, "inner-sphere", "advanced", 6],
    ["ballistic-reinforced", ARMOR, ARMOR_COST, "inner-sphere", "advanced", 10],
    ["heat-dissipating", ARMOR, ARMOR_COST, "both", "advanced", 6],
    ["impact-resistant", ARMOR, ARMOR_COST, "inner-sphere", "advanced", 10],
    ["commercial", ARMOR, ARMOR_COST, "both", undefined, 0],
    ["composite", STRUCTURE_TYPES, STRUCTURE_COST, "inner-sphere", "experimental", 0],
    ["endo-composite", STRUCTURE_TYPES, STRUCTURE_COST, "inner-sphere", "experimental", 7],
    ["endo-composite-clan", STRUCTURE_TYPES, STRUCTURE_COST, "clan", "experimental", 4],
    ["reinforced", STRUCTURE_TYPES, STRUCTURE_COST, "both", "experimental", 0],
    ["industrial", STRUCTURE_TYPES, STRUCTURE_COST, "both", undefined, 0],
    ["xxl", ENGINE_TYPES, ENGINE_COST, "inner-sphere", "experimental", undefined],
    ["xxl-clan", ENGINE_TYPES, ENGINE_COST, "clan", "experimental", undefined],
    ["torso-mounted", COCKPITS, COCKPIT_COST, "both", "experimental", undefined],
  ] as const;
  it.each(rows)("%s has its tech base, level, cite, cost and Battle Value", (key, table, costTable, techBase, level, slots) => {
    const row = (table.types as Record<string, { techBase?: string; rulesLevel?: string; slots?: number; cite?: unknown; checked?: string }>)[key];
    expect(row?.techBase).toBe(techBase);
    expect(row?.rulesLevel).toBe(level);
    if (slots !== undefined) expect(row?.slots).toBe(slots);
    expect(row?.cite ?? table.cite).toBeDefined();
    expect(row?.checked ?? table.checked).toBe("page");
    expect(Object.hasOwn(costTable.rows, key)).toBe(true);
    const bv = table === ARMOR ? [ARMOR_BV_MODIFIER.values, ADVANCED_BV_MODIFIERS.armor] : table === STRUCTURE_TYPES ? [STRUCTURE_BV_MODIFIER.values, ADVANCED_BV_MODIFIERS.structure] : table === ENGINE_TYPES ? [ENGINE_BV_MODIFIER.values, ADVANCED_BV_MODIFIERS.engine] : [{ "torso-mounted": 1 }];
    expect(bv.some((t) => Object.hasOwn(t, key))).toBe(true);
  });
});

describe("armor weight and hardened armor", () => {
  it.each([
    ["hardened", 48, 6], // 8 points a ton
    ["ferro-lamellor", 56, 4], // 14 points a ton
    ["industrial", 53, 5], // the book's worked example: 53 points in 5 tons
  ])("%s armor: %i points weigh %f tons", (armorType, points, expected) => {
    const record = walker([], { armorType }, { armor: { CT: { front: points } } });
    expect(weights(record, catalog.factsOf).lines.find((l) => l.label === "Armor")?.tons).toBe(expected);
  });

  it("hardened armor takes 1 from Running MP on the sheet and in the Battle Value, and nothing else", () => {
    const plain = walker([]);
    const hard = walker([], { armorType: "hardened" });
    expect(movementPenalty(hard, catalog)).toMatchObject({ walk: 0, run: 1, jump: 0, noJump: false });
    expect(battleValue(hard, catalog).offensive.runMP).toBe(battleValue(plain, catalog).offensive.runMP - 1);
  });
});

describe("Battle Value modifiers", () => {
  const points = 8 + 8 + 14 + 4 + 10 + 3 + 10 + 3 + 9 + 6 + 5; // the fixture biped's armor
  it("hardened armor's modifier is 2.0 on the armor term", () => {
    const bv = battleValue(walker([], { armorType: "hardened" }), catalog);
    expect(bv.defensive.armor).toBe(points * 2.5 * 2);
    expect(bv.unvalued).toEqual([]);
  });

  it("reinforced structure's modifier is 2.0 and composite's 0.5 on the structure term", () => {
    const standard = battleValue(walker([]), catalog).defensive.structure;
    expect(battleValue(walker([], { structure: "reinforced" }), catalog).defensive.structure).toBe(standard * 2);
    expect(battleValue(walker([], { structure: "composite" }), catalog).defensive.structure).toBe(standard * 0.5);
  });

  it("a torso-mounted cockpit doubles the center torso armor and the finished value takes 0.95", () => {
    const plain = battleValue(walker([]), catalog);
    const torso = battleValue(walker([], { cockpit: "torso-mounted" }), catalog);
    expect(torso.defensive.armor).toBe(plain.defensive.armor + (14 + 4) * 2.5);
    expect(torso.modifiers.torsoCockpit).toBe(true);
    expect(torso.baseBv).toBe(Math.floor((torso.defensive.rating + torso.offensive.rating) * 0.95 + 0.5));
  });

  it("XXL engines weigh a third, take 6 and 4 side torso slots, and count 0.25 and 0.5", () => {
    expect(engineTons("xxl", 300)).toBe(6.5); // 19 tons standard
    expect(engineTons("xxl-clan", 300)).toBe(6.5);
    const sideSlots = (type: string) => layout(walker([], {}, { chassis: { ...bipedRecord().chassis, engine: { type, rating: 200 } } }), catalog.factsOf).slots.LT?.filter((c) => c.label.includes("XXL")).length;
    expect([sideSlots("xxl"), sideSlots("xxl-clan")]).toEqual([6, 4]);
    expect(ADVANCED_BV_MODIFIERS.engine.xxl?.value).toBe(0.25);
    expect(ADVANCED_BV_MODIFIERS.engine["xxl-clan"]?.value).toBe(0.5);
  });
});

describe("the torso-mounted cockpit", () => {
  it("puts the cockpit and its sensors in the center torso and a life support slot in each side torso", () => {
    const slots = layout(walker([], { cockpit: "torso-mounted" }), catalog.factsOf).slots;
    const labels = (loc: "HD" | "CT" | "LT" | "RT") => (slots[loc] ?? []).map((c) => c.label);
    expect(labels("HD").filter(Boolean)).toEqual(["Sensors", "Sensors"]);
    expect(labels("CT").slice(-2)).toEqual(["Cockpit", "Sensors"]);
    expect([labels("LT"), labels("RT")].map((l) => l.includes("Life Support"))).toEqual([true, true]);
  });
});

describe("what the checks say about the newer parts", () => {
  it.each([
    ["a Clan-only part on an Inner Sphere 'Mech", { armorType: "ferro-lamellor" }, {}, "Clan technology"],
    ["a part before its year", { armorType: "hardened" }, { year: 3040 }, "not available in 3040"],
    ["an IndustrialMech part", { structure: "industrial" }, {}, "printed for IndustrialMechs"],
  ])("%s is reported", (_name, chassis, patch, text) => {
    const messages = findings(walker([], chassis, patch), "parts").map((f) => f.message);
    expect(messages.some((m) => m.includes(text))).toBe(true);
  });

  it("a part's play effects are shown as a note with the page", () => {
    const note = findings(walker([], { armorType: "hardened" }), "parts").find((f) => f.level === "note" && f.message.startsWith("Hardened armor (experimental rules):"));
    expect(note?.cite).toEqual({ book: "Tactical Operations: Advanced Units and Equipment", page: 93 });
  });
});

describe("shields", () => {
  const errors = (record: MechRecord) => findings(record, "shields").filter((f) => f.level === "error").map((f) => f.message);

  it("a shield goes in an arm, one to an arm, and not on a body without arms", () => {
    expect(errors(walker([shield("medium", "LA")]))).toEqual([]);
    expect(errors(walker([shield("medium", "LL")]))[0]).toContain("only be mounted in an arm");
    expect(errors(walker([shield("small", "RA", "a"), shield("large", "RA", "b")]))[0]).toContain("only 1 may be mounted per arm");
    expect(errors(quadRecord({ mounts: [shield("small", "LT")] }))[0]).toContain("has no arms");
  });

  it("a medium shield takes 1 MP and a large one 1 MP and jumping; a small one nothing", () => {
    expect(movementPenalty(walker([shield("small", "LA")]), catalog)).toMatchObject({ walk: 0, run: 0, noJump: false });
    expect(movementPenalty(walker([shield("medium", "LA")]), catalog)).toMatchObject({ walk: 1, run: 0, jump: 1, noJump: false });
    const large = walker([shield("large", "RA"), { ...mount("jj", "jump-jet-is", "CT", null), name: "Jump Jet" }]);
    expect(movementPenalty(large, catalog)).toMatchObject({ walk: 1, run: 0, noJump: true });
    // the Battle Value counts the ground penalty and still uses the jump rating as normal
    expect(battleValue(large, catalog).offensive).toMatchObject({ runMP: 5, jumpMP: 1 });
  });

  it("takes a shield MP off Walking and derives Running from it, and takes hardened armor off Running alone", () => {
    const shielded = movementPenalty(walker([shield("medium", "LA")]), catalog);
    expect(penalisedMovement(5, shielded)).toEqual({ walk: 4, run: 6 });
    expect(penalisedMovement(4, shielded)).toEqual({ walk: 3, run: 5 });
    expect(penalisedMovement(5, movementPenalty(walker([], { armorType: "hardened" }), catalog))).toEqual({ walk: 5, run: 7 });
  });

  it("shieldPoints gives each arm's Damage Capacity, less 1 for each missing actuator", () => {
    const record = walker([shield("medium", "LA"), shield("large", "RA")]);
    expect(shieldPoints(record, catalog)).toEqual({ left: 18, right: 25 });
    const noHand = editRecord(record, (d) => void (d.arms = { RA: { lowerArm: true, hand: false } }));
    expect(shieldPoints(noHand, catalog)).toEqual({ left: 18, right: 24 });
    expect(shieldPoints(walker([shield("small", "LA")]), catalog)).toEqual({ left: 11 });
    expect(shieldPoints(quadRecord({ mounts: [shield("small", "LT")] }), catalog)).toEqual({});
  });
});
