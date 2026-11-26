// ProtoMech part options: the Inner Sphere interface cockpit, Electric Discharge armor, extended jump jets, UMUs and the partial wing (IO:AE pp. 59, 96, 190-191, 213;
// TO:AUE pp. 104-107, 192, 217, 223). Each test states one behavior of the option against the printed figures.
import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import type { Catalog } from "../catalog";
import { tally } from "./build";
import { checkProto, protoLowestLevel } from "./checks";
import { armorChoices, cockpitChoices, jumpChoices, jumpMP, optionSummary, wingOffered } from "./options";
import { offeredEquipment } from "./offered";
import { protoBattleValue, protoCost } from "./rating";
import { newProtoRecord, withDefaults } from "./record";
import type { ProtoRecord } from "./record";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});

/** A 6 ton ProtoMech, Walking MP 4 (Running MP 6), with 10 armor points, at Experimental rules in 3080. */
const proto = (extra: Partial<ProtoRecord> = {}): ProtoRecord => {
  const record = { ...newProtoRecord({ chassis: "Option", model: "1", tons: 6, walk: 4, year: 3080 }), rulesLevel: "experimental" as const, ...extra };
  record.armor = { ...record.armor, t: 10 };
  return record;
};
const kgOf = (record: ProtoRecord, label: string) => tally(record, catalog).lines.find((l) => l.label === label)?.kg;
const costOf = (record: ProtoRecord, label: string) => protoCost(record, catalog).lines.find((l) => l.label === label)?.cost;
const mount = (id: string, location: string) => ({ id, equipmentId: "er-micro-laser-clan", name: id, location });
const errors = (record: ProtoRecord, check: string) => checkProto(record, catalog).filter((f) => f.check === check && f.level === "error");

describe("the Inner Sphere ProtoMech interface cockpit", () => {
  it("weighs what the standard cockpit does, costs 1,000,000 in its place and leaves the Battle Value alone", () => {
    const plain = proto();
    const fitted = proto({ cockpit: "interface" });
    expect([kgOf(plain, "Cockpit"), kgOf(fitted, "Cockpit")]).toEqual([500, 500]);
    expect(costOf(fitted, "Inner Sphere ProtoMech interface cockpit")).toBe(1_000_000);
    expect(protoCost(fitted, catalog).lines.some((l) => l.cost === 500_000)).toBe(false);
    expect(protoBattleValue(fitted, catalog).total).toBe(protoBattleValue(plain, catalog).total);
  });

  it("is offered only at Experimental rules from about 3071 to its extinction in 3085, and asks for Experimental", () => {
    const ids = (r: ProtoRecord) => cockpitChoices(r).map((c) => c.id);
    expect(ids(proto())).toEqual(["standard", "interface"]);
    expect([ids(proto({ rulesLevel: "standard" })), ids(proto({ year: 3070 })), ids(proto({ year: 3086 }))]).toEqual([["standard"], ["standard"], ["standard"]]);
    expect(ids(proto({ rulesLevel: "standard", cockpit: "interface" }))).toContain("interface");
    expect(protoLowestLevel(proto({ cockpit: "interface" }), catalog)).toBe("experimental");
    expect(errors(proto({ rulesLevel: "standard", cockpit: "interface" }), "part")).toHaveLength(1);
  });
});

describe("Electric Discharge armor", () => {
  it("weighs 75 kg and costs 1,250 a point, and adds 32 to the Battle Value as a weapon", () => {
    const plain = proto();
    const edp = proto({ armorType: "edp" });
    expect([kgOf(plain, "Standard ProtoMech armor"), kgOf(edp, "Electric Discharge ProtoMech (EDP) armor")]).toEqual([500, 750]);
    expect([costOf(plain, "Standard ProtoMech armor"), costOf(edp, "Electric Discharge ProtoMech (EDP) armor")]).toEqual([6_250, 12_500]);
    const [a, b] = [protoBattleValue(plain, catalog), protoBattleValue(edp, catalog)];
    expect([b.offensive.weapons - a.offensive.weapons, b.defensive.armor]).toEqual([32, a.defensive.armor]);
  });

  it("takes one of the torso's two items, and is offered only at Experimental rules", () => {
    const loaded = (extra: Partial<ProtoRecord>) => proto({ mounts: [mount("a", "t"), mount("b", "t")], ...extra });
    expect([errors(loaded({}), "location"), errors(loaded({ armorType: "edp" }), "location").map((f) => f.where?.location)]).toEqual([[], ["t"]]);
    expect([armorChoices(proto()).map((a) => a.id), armorChoices(proto({ rulesLevel: "standard" })).map((a) => a.id)]).toEqual([["standard", "edp"], ["standard"]]);
  });
});

describe("standard ProtoMech armor", () => {
  it("keeps its dates: an error in 3050, and Experimental rules in its prototype years", () => {
    const parts = (r: ProtoRecord) => errors(r, "part").filter((f) => f.where?.field === "armor").length;
    expect([parts(proto({ year: 3050 })), parts(proto({ year: 3057, rulesLevel: "standard" })), parts(proto({ year: 3057 }))]).toEqual([1, 1, 0]);
    expect(protoLowestLevel(proto({ year: 3057 }), catalog)).toBe("experimental");
  });
});

describe("extended jump jets", () => {
  it("weigh twice the jump jet table, cost 500 a ton for each jet squared, and may reach the Running MP", () => {
    const six = proto({ jump: 6, jumpType: "xjj" });
    expect([kgOf(six, "Extended jump jets (XJJ)"), costOf(six, "Extended jump jets (XJJ)")]).toEqual([1200, 108_000]);
    expect(errors(six, "jump")).toEqual([]);
    expect([errors(proto({ jump: 7, jumpType: "xjj" }), "jump"), errors(proto({ jump: 5 }), "jump")].map((e) => e.length)).toEqual([1, 1]);
  });

  it("are standard rules, offered from their 3071 prototype years at Experimental and from 3075 at Standard", () => {
    const ids = (year: number, rulesLevel: ProtoRecord["rulesLevel"]) => jumpChoices(proto({ year, rulesLevel })).map((j) => j.id).filter((id) => id !== "umu");
    expect([ids(3072, "standard"), ids(3072, "experimental"), ids(3075, "standard"), ids(3070, "experimental")]).toEqual([["standard"], ["standard", "xjj"], ["standard", "xjj"], ["standard"]]);
  });
});

describe("the book panel rulings", () => {
  it("caps extended jump jets at the base Running MP, which the Myomer Booster does not raise", () => {
    expect([errors(proto({ jump: 6, jumpType: "xjj", booster: true }), "jump"), errors(proto({ jump: 7, jumpType: "xjj", booster: true }), "jump")].map((e) => e.length)).toEqual([0, 1]);
  });

  it("counts the partial wing's weight toward the torso's 2,000 kg", () => {
    const withWing = (tons: number) => proto({ tons, walk: 5, jump: 3, partialWing: true, mounts: [{ id: "a", equipmentId: "er-micro-laser-clan", name: "a", location: "t" }] });
    expect([errors(withWing(8), "location").length, errors(withWing(9), "location").length]).toEqual([0, 1]);
  });

  it("notes, and does not refuse, a wing on a unit with UMUs", () => {
    const record = proto({ partialWing: true, jump: 2, jumpType: "umu" });
    const found = checkProto(record, catalog).filter((f) => f.where?.field === "partialWing");
    expect(found.map((f) => f.level)).toEqual(["note"]);
  });

  it("takes Mixed Technology only with the interface cockpit, or at Advanced rules, and then opens the Inner Sphere list", () => {
    const tech = (r: ProtoRecord) => errors(r, "tech-base").length;
    expect([tech(proto({ techBase: "mixed", cockpit: "interface" })), tech(proto({ cockpit: "interface" })), tech(proto({ techBase: "mixed", rulesLevel: "standard" })), tech(proto({ techBase: "mixed", rulesLevel: "advanced" }))]).toEqual([0, 1, 1, 0]);
    const ids = (r: ProtoRecord) => offeredEquipment(r, catalog).map((row) => row.id);
    expect([ids(proto()).includes("angel-ecm-is"), ids(proto({ techBase: "mixed", cockpit: "interface" })).includes("angel-ecm-is")]).toEqual([false, true]);
    expect(protoLowestLevel(proto({ techBase: "mixed", rulesLevel: "advanced", year: 3090 }), catalog)).toBe("advanced");
  });
});

describe("the partial wing", () => {
  it("weighs a fifth of the ProtoMech, costs 50,000 a ton, takes a torso item and adds 2 Jumping MP to a unit that can jump", () => {
    const wing = proto({ partialWing: true, jump: 3 });
    expect([kgOf(wing, "Partial wing"), costOf(wing, "Partial wing")]).toEqual([1200, 60_000]);
    expect([jumpMP(wing), jumpMP(proto({ partialWing: true })), jumpMP(proto({ jump: 3 }))]).toEqual([5, 0, 3]);
    expect(protoBattleValue(wing, catalog).total).toBeGreaterThan(protoBattleValue(proto({ jump: 3 }), catalog).total);
    expect(errors({ ...wing, mounts: [mount("a", "t"), mount("b", "t")] }, "location")).toHaveLength(1);
    expect([wingOffered(proto()), wingOffered(proto({ year: 3069 })), wingOffered(proto({ rulesLevel: "standard" }))]).toEqual([true, false, false]);
  });
});

describe("underwater maneuvering units", () => {
  it("weigh and cost as jump jets, add nothing from a wing, and need Experimental rules", () => {
    const umu = proto({ jump: 3, jumpType: "umu", partialWing: true });
    expect([kgOf(umu, "Underwater maneuvering units (UMU)"), costOf(umu, "Underwater maneuvering units (UMU)"), jumpMP(umu)]).toEqual([300, 10_800, 3]);
    expect([errors(proto({ jump: 4, jumpType: "umu" }), "jump"), errors(proto({ jump: 5, jumpType: "umu" }), "jump")].map((e) => e.length)).toEqual([0, 1]);
    expect(jumpChoices(proto({ rulesLevel: "standard" })).map((j) => j.id)).not.toContain("umu");
  });
});

describe("saving and reading the options", () => {
  it("keeps them through a round trip, and reports an id it does not know without throwing", () => {
    const record = proto({ cockpit: "interface", armorType: "edp", jumpType: "xjj", partialWing: true, jump: 2 });
    const read = withDefaults(JSON.parse(JSON.stringify(record)));
    expect(read && optionSummary(read)).toEqual(["Inner Sphere ProtoMech interface cockpit", "Electric Discharge ProtoMech (EDP) armor", "Extended jump jets (XJJ)", "Partial wing"]);
    const strange = proto({ cockpit: "gold-plated", jump: 1 });
    expect(checkProto(strange, catalog).some((f) => f.check === "part" && f.level === "warning")).toBe(true);
    expect(tally(strange, catalog).unknown).toContain("Cockpit");
  });
});
