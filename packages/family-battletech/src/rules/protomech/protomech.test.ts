// ProtoMech rules: the book's worked examples (TechManual pp. 82-89, 285, 306-307: the Siren-4, Hydra and Delphyne-2) decide the arithmetic.
import { beforeAll, describe, expect, it } from "vitest";
import { PROTO_MAX_ARMOR_FACTOR, PROTO_STRUCTURE } from "../../data/protomech";
import { loadCatalog } from "../catalog";
import type { Catalog } from "../catalog";
import { ammoKg, armorPoints, engineKg, engineRating, structurePoints, tally } from "./build";
import { checkProto } from "./checks";
import { offeredEquipment } from "./offered";
import { protoBattleValue, protoCost } from "./rating";
import { newProtoRecord, withDefaults } from "./record";
import type { ProtoMount, ProtoRecord } from "./record";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});

const mount = (id: string, equipmentId: string, location: string, extra: Partial<ProtoMount> = {}): ProtoMount => ({ id, equipmentId, name: id, location, ...extra });

/** The Delphyne-2 (p. 89): 9 tons, walk 5, jump 5, 2 heat sinks, 40 armor, 2 ER micro lasers in the arms, 2 SRM 3 in the torso with 10 shots each. */
function delphyne(): ProtoRecord {
  const record = newProtoRecord({ chassis: "Delphyne", model: "2", tons: 9, walk: 5, year: 3070 });
  record.jump = 5;
  record.heatSinks = 2;
  record.armor = { hd: 6, t: 16, la: 4, ra: 4, lg: 10, mg: 0 };
  record.mounts = [
    mount("a", "er-micro-laser-clan", "la"),
    mount("b", "er-micro-laser-clan", "ra"),
    mount("c", "srm-2-clan", "t", { tubes: 3, shots: 10 }),
    mount("d", "srm-2-clan", "t", { tubes: 3, shots: 10 }),
  ];
  return record;
}

describe("the structure and armor table", () => {
  it("adds up to the printed maximum armor factor, with and without a main gun", () => {
    for (const [tons, [plain, gun]] of Object.entries(PROTO_MAX_ARMOR_FACTOR)) {
      const row = PROTO_STRUCTURE.rows[Number(tons)];
      const sum = (skip: string[]) => Object.entries(row?.armor ?? {}).filter(([c]) => !skip.includes(c)).reduce((s, [, n]) => s + n, 0);
      expect([sum(["mg"]), sum([])]).toEqual([plain, gun]);
    }
  });
});

describe("the worked examples", () => {
  it("weighs the Delphyne-2 at exactly 9 tons and finds nothing wrong", () => {
    const record = delphyne();
    expect(tally(record, catalog).total).toBe(9000);
    expect([structurePoints(record), armorPoints(record), engineRating(record), engineKg(record)]).toEqual([20, 40, 75, 2000]);
    expect(checkProto(record, catalog).filter((f) => f.level !== "note")).toEqual([]);
  });

  it("weighs engines under rating 40 by the point and the rest by the Master Engine Table", () => {
    const siren = newProtoRecord({ tons: 3, walk: 10 });
    const hydra = newProtoRecord({ tons: 6, walk: 4 });
    expect([engineRating(siren), engineKg(siren), engineRating(hydra), engineKg(hydra)]).toEqual([45, 1000, 36, 900]);
  });

  it("gives the Delphyne-2 a Battle Value of 316 and a cost of 895,653", () => {
    const record = delphyne();
    const bv = protoBattleValue(record, catalog);
    expect([Math.round(bv.defensive.rating), bv.offensive.speedFactor, bv.total, bv.unvalued]).toEqual([182, 1.76, 316, []]);
    expect(protoCost(record, catalog).total).toBe(895_653);
  });
});

describe("the rules check", () => {
  const has = (record: ProtoRecord, check: string, level = "error") => checkProto(record, catalog).some((f) => f.check === check && f.level === level);

  it("holds each location to what the book allows", () => {
    const record = delphyne();
    record.mounts.push(mount("e", "er-micro-laser-clan", "la"), mount("f", "er-micro-laser-clan", "hd"), mount("g", "er-micro-laser-clan", "t", { rear: true }));
    record.mounts.push(mount("h", "er-medium-laser-clan", "ra"));
    expect(has(record, "location")).toBe(true);
    const locations = checkProto(record, catalog).filter((f) => f.check === "location").map((f) => f.where?.location);
    expect(locations).toEqual(expect.arrayContaining(["la", "hd", "t", "ra"]));
  });

  it("needs a year the ProtoMechs exist in, and Experimental rules in their prototype years", () => {
    const early = { ...delphyne(), year: 3050 };
    expect(has(early, "year")).toBe(true);
    const prototype = { ...delphyne(), year: 3057 };
    expect(has(prototype, "level")).toBe(true);
    expect(has({ ...prototype, rulesLevel: "experimental" as const }, "level")).toBe(false);
  });

  it("is Clan only, and not part of Introductory", () => {
    expect(has({ ...delphyne(), techBase: "inner-sphere" }, "tech-base")).toBe(true);
    expect(has({ ...delphyne(), rulesLevel: "introductory" }, "level")).toBe(true);
  });

  it("reports jump over walk, too many armor points, no main gun and too few heat sinks", () => {
    const record = delphyne();
    record.jump = 6;
    record.armor.hd = 7;
    record.armor.mg = 1;
    record.heatSinks = 1;
    expect(["jump", "armor", "heat"].every((check) => has(record, check))).toBe(true);
    expect(checkProto(record, catalog).filter((f) => f.check === "armor")).toHaveLength(2);
  });
});

describe("what is offered", () => {
  it("lists Clan items by year, launchers once by their tubes, and none the chapter forbids", () => {
    const ids = (year: number) => offeredEquipment({ ...delphyne(), year }, catalog).map((r) => r.id);
    expect(ids(3065)).toEqual(expect.arrayContaining(["er-micro-laser-clan", "srm-2-clan", "lrm-5-clan", "streak-srm-2-clan"]));
    expect(ids(3065)).not.toEqual(expect.arrayContaining(["srm-4-clan"]));
    expect(ids(3065).some((id) => /^atm|^mml/.test(id))).toBe(false);
    expect(ids(3062)).not.toContain("plasma-cannon-clan");
    expect(ids(3070)).toContain("plasma-cannon-clan");
  });
});

describe("reading a record", () => {
  it("keeps keys it does not know and fills what is missing", () => {
    const read = withDefaults({ schema: 1, id: "x", tons: 5, later: { a: 1 } });
    expect(read?.tons).toBe(5);
    expect((read as unknown as Record<string, unknown>).later).toEqual({ a: 1 });
    expect(read?.armor.hd).toBe(0);
    expect(withDefaults({ schema: 2 })).toBeUndefined();
  });
});

describe("the ProtoMech autocannons", () => {
  it("are offered from their year at Advanced, take 1,000 kg divided by the shots a ton per shot, and only fit a main gun", () => {
    const record = { ...newProtoRecord({ chassis: "Gun", model: "1", tons: 9, walk: 3, year: 3075 }), rulesLevel: "advanced" as const, mainGun: true };
    const offered = (r: ProtoRecord) => offeredEquipment(r, catalog).map((row) => row.id);
    expect(offered(record)).toEqual(expect.arrayContaining(["protomech-ac-2-clan", "protomech-ac-4-clan", "protomech-ac-8-clan"]));
    expect(offered({ ...record, year: 3065 })).not.toContain("protomech-ac-2-clan");
    const kg = (id: string) => ammoKg(mount("m", id, "mg", { shots: 4 }));
    expect([kg("protomech-ac-2-clan"), kg("protomech-ac-4-clan"), kg("protomech-ac-8-clan")]).toEqual([100, 200, 400]);
    const place = (location: string) => ({ ...record, mounts: [mount("g", "protomech-ac-2-clan", location)] });
    const where = (r: ProtoRecord) => checkProto(r, catalog).filter((f) => f.check === "location").map((f) => f.where?.location);
    expect([where(place("mg")), where(place("t"))]).toEqual([[], ["t"]]);
  });
});
