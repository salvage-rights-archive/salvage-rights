import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import { armorChoices, manipulatorChoices, motiveChoices, suitOffered, weightClassChoices } from "./availability";
import { battleValue, unitCost } from "./bv";
import { checkBa, markOfficial, officialState } from "./checks";
import { build } from "./construct";
import { newBaRecord, withDefaults } from "./record";
import type { BaRecord } from "./record";

const catalog = await loadCatalog();
const mount = (id: string, location = "body", shots?: number) => ({ id: `m-${id}-${location}`, equipmentId: id, name: id, location, ...(shots === undefined ? {} : { shots }) });

/** The Fenrir of the TechManual examples (printed pp. 163-170): Inner Sphere assault quad, 4 ground MP, 5 standard armor points. */
const fenrir = (): BaRecord => ({ ...newBaRecord({ id: "f", weightClass: "assault", body: "quad", year: 3060 }), ground: 4, armor: { type: "standard", points: 5 } });
/** The Purifier of the Battle Value v4.1 example (printed pp. 310-311): medium, 6 mimetic points, 3 jump, a claw and an ER small laser, six troopers. */
const purifier = (): BaRecord => ({
  ...newBaRecord({ id: "p", weightClass: "medium", year: 3070, troopers: 6 }),
  motive: { kind: "jump", mp: 3 },
  manipulators: { la: "none", ra: "battle-claw" },
  armor: { type: "mimetic", points: 6, slots: { body: 4, ra: 3 } },
  mounts: [mount("ba-er-small-laser-is", "la")],
});
/** The Grenadier [SRM/SL] of the same example: 9 standard stealth points, 2 ground MP, an SRM 4 with 7 shots and a small laser, four troopers. */
const grenadier = (): BaRecord => ({
  ...newBaRecord({ id: "g", weightClass: "medium", year: 3070, troopers: 4 }),
  ground: 2,
  armor: { type: "stealth-standard", points: 9 },
  mounts: [mount("ba-srm-4-is", "body", 7), mount("ba-small-laser-is", "body")],
});

describe("battle armor construction", () => {
  it("weighs the Fenrir as the book works it", () => {
    expect(build(fenrir(), catalog).totalKg).toBe(550 + 320 + 250);
  });

  it("weighs the Purifier's parts and finds its mimetic slots (4 body, 3 right arm)", () => {
    const b = build(purifier(), catalog);
    expect(b.totalKg).toBe(175 + 150 + 15 + 300 + 350);
    expect(b.slots.body?.used).toBe(4);
    expect(b.slots.ra?.used).toBe(3);
    expect(b.slots.la?.used).toBe(2);
  });

  it("gives missile ammunition one slot for each four shots, rounded up, and weighs it per shot", () => {
    const lrm5 = { ...newBaRecord({ weightClass: "heavy" }), mounts: [mount("ba-lrm-5-is", "body", 5)] };
    const b = build(lrm5, catalog);
    expect(b.slots.body?.ammo).toBe(2);
    expect(b.totalKg).toBe(300 + 300 + 5 * 41.5);
  });

  it("lets a battle claw, or two basic manipulators on a medium suit, make Swarm and Leg attacks; a quad and an assault suit never", () => {
    expect(build(purifier(), catalog).capabilities).toEqual({ swarm: true, leg: true, mechanized: true });
    const heavy = { ...newBaRecord({ weightClass: "heavy" }), manipulators: { la: "basic", ra: "none" } };
    expect(build(heavy, catalog).capabilities).toEqual({ swarm: false, leg: false, mechanized: true });
    expect(build(fenrir(), catalog).capabilities).toEqual({ swarm: false, leg: false, mechanized: false });
  });
});

describe("battle armor rules check", () => {
  const found = (record: BaRecord, check: string) => checkBa(record, catalog).filter((f) => f.check === check && f.level === "error");

  it("reports a suit over its class weight, with the page", () => {
    const heavy = { ...newBaRecord({ weightClass: "light", year: 3070 }), ground: 3, motive: { kind: "jump", mp: 3 }, armor: { type: "stealth-prototype", points: 6 } };
    const errors = found(heavy, "weight");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.cite).toBe("TechManual, p. 163");
  });

  it("reports motive and manipulators on a quad, and a jump booster without jump jets", () => {
    const quad = { ...fenrir(), motive: { kind: "jump", mp: 1 }, manipulators: { la: "basic", ra: "none" } };
    expect(found(quad, "motive").length).toBeGreaterThan(0);
    expect(found(quad, "manipulators")).toHaveLength(1);
    const booster = { ...newBaRecord({ weightClass: "light", year: 3070 }), mounts: [mount("ba-jump-booster-is")] };
    expect(found(booster, "motive")).toHaveLength(1);
  });

  it("allows one camo system, and mimetic armor is one (errata v8.0 to p. 253)", () => {
    const both = { ...purifier(), mounts: [mount("ba-camo-system-is")] };
    expect(found(both, "equipment")).toHaveLength(1);
  });

  it("reports a weapon over a location's limit, and slots over its size", () => {
    const light = { ...newBaRecord({ weightClass: "light", year: 3070 }), mounts: [mount("ba-small-laser-is", "ra"), mount("ba-small-laser-is", "ra")] };
    expect(found(light, "slots").some((f) => f.message.includes("limit"))).toBe(true);
  });

  it("says when a part is not yet built in the year, and which level the suit needs", () => {
    const early = { ...newBaRecord({ weightClass: "medium", techBase: "clan", year: 2830 }) };
    expect(checkBa(early, catalog).some((f) => f.check === "dates" && f.message.includes("not available"))).toBe(true);
    const experimental = { ...newBaRecord({ weightClass: "light", year: 3051 }), armor: { type: "stealth-prototype", points: 2 } };
    expect(found(experimental, "level")).toHaveLength(1);
  });

  it("holds the OFFICIAL mark only while the design is the marked one", () => {
    const record = purifier();
    markOfficial(record, "TechManual", 310);
    expect(officialState(record).official).toBe(true);
    record.armor.points = 5;
    expect(officialState(record).official).toBe(false);
  });
});

describe("battle armor availability", () => {
  it("hides what the year, tech base and rules level leave out, and offers the suit from Standard", () => {
    const clan = { techBase: "clan" as const, year: 2870, era: undefined, rulesLevel: "standard" as const, editionId: "total-warfare" };
    expect(weightClassChoices(clan).map((row) => row.id)).toEqual(["light", "medium"]);
    expect(motiveChoices(clan)).toEqual(["jump"]);
    expect(armorChoices(clan).map((row) => row.id)).toEqual(["standard", "stealth-basic", "stealth-standard"]);
    expect(manipulatorChoices({ ...clan, techBase: "inner-sphere", year: 3040 }).map((row) => row.id)).toContain("salvage-arm");
    expect(suitOffered("introductory")).toBe(false);
    expect(suitOffered("standard")).toBe(true);
  });
});

describe("battle armor Battle Value and cost", () => {
  it("makes the Purifier Level I 466, as the v4.1 example does", () => {
    const bv = battleValue(purifier(), catalog);
    expect(bv.perSuit).toBeCloseTo(51.78, 2);
    expect(bv.base).toBe(466);
  });

  it("makes the Grenadier squad 326, as the v4.1 example does", () => {
    const bv = battleValue(grenadier(), catalog);
    expect(bv.perSuit).toBeCloseTo(62.66, 2);
    expect(bv.base).toBe(326);
  });

  it("prices structure and training for every trooper (p. 281, p. 285)", () => {
    const light = { ...newBaRecord({ weightClass: "light", troopers: 4 }), armor: { type: "standard", points: 6 } };
    expect(unitCost(light, catalog).total).toBe((50_000 + 60_000 + 150_000) * 4);
  });
});

describe("the battle armor record", () => {
  it("keeps unknown keys and refuses a later schema", () => {
    const read = withDefaults({ schema: 1, id: "x", weightClass: "odd", extra: 7, mounts: [{ id: "a", location: "tail", more: 1 }] });
    expect(read?.weightClass).toBe("odd");
    expect((read as unknown as Record<string, unknown>).extra).toBe(7);
    expect(read?.mounts[0]?.location).toBe("tail");
    expect(withDefaults({ schema: 2 })).toBeUndefined();
  });
});

describe("battle armor year and era", () => {
  it("asks for a year above Introductory, as the Mech check does, and weighs Clan basic stealth at the TechManual 30 kg", () => {
    const noYear = { ...newBaRecord({ weightClass: "light" }), year: null };
    expect(checkBa(noYear, catalog).some((f) => f.check === "year" && f.level === "error")).toBe(true);
    const clan = { ...newBaRecord({ weightClass: "light", techBase: "clan", year: 2900 }), armor: { type: "stealth-basic", points: 2 } };
    expect(build(clan, catalog).lines.find((l) => l.label.startsWith("Stealth (basic)"))?.kg).toBe(60);
  });
});
