// The expanded ProtoMechs (Interstellar Operations: Alternate Eras printed pp. 92-96, 180, 186, 215): quads, gliders and Ultraheavy ProtoMechs. Each test is one rule, with the figures read from the book.
import { beforeAll, describe, expect, it } from "vitest";
import { PROTO_MAX_ARMOR_FACTOR, PROTO_STRUCTURE } from "../../data/protomech";
import { loadCatalog } from "../catalog";
import type { Catalog } from "../catalog";
import { engineKg, engineRating, locationsOf, structurePoints, structureRow, tally } from "./build";
import { checkProto, protoLowestLevel } from "./checks";
import { configChoices, tonnageChoices } from "./options";
import { offeredEquipment } from "./offered";
import { protoBattleValue, protoCost } from "./rating";
import { newProtoRecord, withDefaults } from "./record";
import type { ProtoMount, ProtoRecord } from "./record";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});

const mount = (id: string, equipmentId: string, location: string, extra: Partial<ProtoMount> = {}): ProtoMount => ({ id, equipmentId, name: id, location, ...extra });
const build = (tons: number, walk: number, configuration: string | undefined, extra: Partial<ProtoRecord> = {}): ProtoRecord => ({
  ...newProtoRecord({ chassis: "Test", model: "1", tons, walk, year: 3090, ...(configuration === undefined ? {} : { configuration }) }),
  rulesLevel: "advanced",
  ...extra,
});
const errors = (record: ProtoRecord, check: string) => checkProto(record, catalog).filter((f) => f.check === check && f.level === "error");

describe("the expanded structure and armor table", () => {
  it("adds up to the printed armor factor for every weight, with a quad's legs column too", () => {
    for (const [tons, [plain, gun]] of Object.entries(PROTO_MAX_ARMOR_FACTOR)) {
      const row = PROTO_STRUCTURE.rows[Number(tons)];
      expect(row && [row.armor.hd + row.armor.t + row.quadLegs[1], row.armor.hd + row.armor.t + row.quadLegs[1] + row.armor.mg]).toEqual([plain, gun]);
    }
  });
});

describe("an Ultraheavy ProtoMech", () => {
  it("weighs a 750 kg cockpit and 150 kg for each jump, costs the 800,000 cockpit, and holds three torso items and one of 1,000 kg on each arm", () => {
    const record = build(12, 3, undefined, { jump: 2 });
    const lines = Object.fromEntries(tally(record, catalog).lines.map((l) => [l.label, l.kg]));
    expect([lines.Cockpit, lines["ProtoMech jump jets"]]).toEqual([750, 300]);
    expect(protoCost(record, catalog).lines.find((l) => l.label === "Standard ProtoMech cockpit")?.cost).toBe(800_000);
    const three = { ...record, mounts: ["a", "b", "c"].map((id) => mount(id, "er-micro-laser-clan", "t")) };
    const four = { ...record, mounts: ["a", "b", "c", "d"].map((id) => mount(id, "er-micro-laser-clan", "t")) };
    expect([errors(three, "location").length, errors(four, "location").length]).toEqual([0, 1]);
    expect(structurePoints(record)).toBe(12 + 3 + 3 + 3 + 7);
  });

  it("is hidden below Advanced rules and before its prototype year, and Experimental until it is in production", () => {
    const at = (year: number, rulesLevel: "standard" | "advanced" | "experimental") => tonnageChoices({ ...build(5, 3, undefined), year, rulesLevel }).at(-1);
    expect([at(3090, "standard"), at(3090, "advanced"), at(3070, "advanced"), at(3080, "advanced"), at(3080, "experimental")]).toEqual([9, 15, 9, 9, 15]);
    expect(protoLowestLevel(build(12, 3, undefined, { year: 3080 }), catalog)).toBe("experimental");
    expect(protoLowestLevel(build(12, 3, undefined, { year: 3090 }), catalog)).toBe("advanced");
    expect(errors(build(12, 3, undefined, { year: 3070 }), "part")).toHaveLength(1);
  });
});

describe("a quad ProtoMech", () => {
  it("has no arms, takes the Legs (Quad, All) column, and its engine rating is its weight times its Running MP less 2", () => {
    const quad = build(8, 3, "quad");
    expect(locationsOf(quad)).toEqual(["hd", "t", "lg"]);
    expect([structurePoints(quad), structureRow(quad)?.armor.lg]).toEqual([2 + 8 + 9, 18]);
    expect([engineRating(quad), engineKg(quad)]).toEqual([24, 600]);
    expect(errors({ ...quad, armor: { ...quad.armor, la: 2 } }, "armor")).toHaveLength(1);
  });

  it("needs a Running MP of 3", () => {
    expect(errors(build(8, 1, "quad"), "engine")).toHaveLength(1);
    expect(errors(build(8, 2, "quad"), "engine")).toEqual([]);
  });

  it("holds four torso items, or six and two in the main gun when Ultraheavy", () => {
    const items = (ids: string[], location: string) => ids.map((id) => mount(id, "er-micro-laser-clan", location));
    expect(errors(build(8, 3, "quad", { mounts: items(["a", "b", "c", "d"], "t") }), "location")).toEqual([]);
    expect(errors(build(8, 3, "quad", { mounts: items(["a", "b", "c", "d", "e"], "t") }), "location")).toHaveLength(1);
    const ultra = build(10, 3, "quad", { mainGun: true, mounts: [...items(["a", "b", "c", "d", "e", "f"], "t"), ...items(["g", "h"], "mg")] });
    expect(errors(ultra, "location")).toEqual([]);
  });

  it("costs 500 a ton for structure and 540 a ton for its legs once, with no arm actuators", () => {
    const lines = Object.fromEntries(protoCost(build(8, 3, "quad"), catalog).lines.map((l) => [l.label, l.cost]));
    expect([lines["Internal structure"], lines["Leg actuators, both legs"], lines["Arm actuators, both arms"]]).toEqual([4000, 4320, undefined]);
  });

  it("alone carries the quad melee system, valued at 2 damage per 5 tons times 1.25, and takes no magnetic clamp", () => {
    const melee = build(8, 3, "quad", { mounts: [mount("m", "protomech-quad-melee-weapon-system-clan", "t")] });
    expect(offeredEquipment(melee, catalog).map((r) => r.id)).toContain("protomech-quad-melee-weapon-system-clan");
    expect(offeredEquipment(build(8, 3, undefined), catalog).map((r) => r.id)).not.toContain("protomech-quad-melee-weapon-system-clan");
    expect(errors({ ...melee, configuration: undefined }, "item")).toHaveLength(1);
    expect(protoBattleValue(melee, catalog).lines[0]?.bv).toBe(Math.ceil(8 / 5) * 2 * 1.25);
    expect(errors({ ...melee, mounts: [mount("c", "magnetic-clamp-system-clan", "t")] }, "item")).toHaveLength(1);
  });
});

describe("a glider ProtoMech", () => {
  it("is built on WiGE Cruising MP: its engine rating is its weight times its WiGE Flanking MP less 2, and it needs a Flanking MP of 4", () => {
    expect(engineRating(build(12, 4, "glider"))).toBe(50);
    expect(errors(build(12, 4, "glider"), "engine")).toEqual([]);
    expect(errors(build(12, 2, "glider"), "engine")).toHaveLength(1);
  });

  it("may not have jump jets, a booster or a partial wing, and costs 600 a ton for structure", () => {
    const glider = build(12, 4, "glider", { jump: 2, booster: true, partialWing: true, rulesLevel: "experimental" });
    expect(errors(glider, "part").map((f) => f.where?.field)).toEqual(["jump"]);
    expect(protoCost(glider, catalog).lines.find((l) => l.label === "Internal structure")?.cost).toBe(7200);
    expect(errors({ ...glider, mounts: [mount("c", "magnetic-clamp-system-clan", "t")] }, "item")).toHaveLength(1);
  });

  it("is read by its WiGE Flanking MP for the Battle Value, with the airborne +1 on its target movement modifier only", () => {
    const bv = protoBattleValue(build(12, 4, "glider", { jump: 2, booster: true }), catalog);
    expect([bv.offensive.speed, bv.defensive.targetModifier]).toEqual([6, 3]);
  });

  it("is built only from 10 tons on the biped chassis: hidden below, an error where a record already has it, and the Ultra (Biped) location column", () => {
    expect(configChoices(build(5, 4, undefined)).map((c) => c.id)).toEqual(["biped", "quad"]);
    expect(configChoices(build(12, 4, undefined)).map((c) => c.id)).toEqual(["biped", "quad", "glider"]);
    expect(configChoices(build(5, 4, "glider")).map((c) => c.id)).toContain("glider");
    expect(errors(build(5, 4, "glider"), "weight")).toHaveLength(1);
    const three = build(12, 4, "glider", { mounts: ["a", "b", "c"].map((id) => mount(id, "er-micro-laser-clan", "t")) });
    expect(errors(three, "location")).toEqual([]);
  });

  it("has its dates: Experimental in 3083, in production from 3084, not before 3075", () => {
    expect(protoLowestLevel(build(12, 4, "glider", { year: 3083 }), catalog)).toBe("experimental");
    expect(errors(build(12, 4, "glider", { year: 3070 }), "part").length).toBeGreaterThan(0);
  });
});

describe("reading a record with a chassis", () => {
  it("keeps the chassis, and reads one it does not know as a biped with a warning", () => {
    expect(withDefaults({ schema: 1, id: "x", configuration: "glider" })?.configuration).toBe("glider");
    const odd = build(5, 3, "hexapod");
    expect(checkProto(odd, catalog).some((f) => f.check === "configuration")).toBe(true);
    expect(locationsOf(odd)).toContain("la");
  });
});
