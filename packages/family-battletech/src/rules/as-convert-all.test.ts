import { describe, expect, it } from "vitest";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { conversionDraft } from "./as-convert";
import { convertClassicMech } from "./as-convert-all";
import { formatSpecials } from "./as-unit";
import { suggestRole } from "./as-role";
import { createCatalog, expand } from "./catalog";
import { bipedRecord, mount } from "./fixtures";
import type { MechRecord, Mount } from "./mech";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));

let n = 0;
const item = (equipmentId: string, location: Mount["location"] = "CT"): Mount => ({ ...mount(`m${(n += 1)}`, equipmentId, location, null), name: equipmentId });
const many = (count: number, id: string) => Array.from({ length: count }, () => item(id));

/** A 'Mech of the given weight and Walking MP with the given equipment. */
function mech(tons: number, walk: number, mounts: Mount[] = [], chassis: Partial<MechRecord["chassis"]> = {}, patch: Partial<MechRecord> = {}): MechRecord {
  const base = bipedRecord();
  return { ...base, tons, mounts, chassis: { ...base.chassis, engine: { type: "standard", rating: tons * walk }, ...chassis }, ...patch };
}
const specialsOf = (record: MechRecord) => formatSpecials(convertClassicMech(record, catalog).unit.card.specials ?? []);

describe("special abilities from equipment (ASC pp. 116-133, errata v1.6)", () => {
  it.each([
    ["an ECM suite, a TAG and a probe", mech(50, 4, [item("guardian-ecm-suite-is"), item("tag-is"), item("beagle-active-probe-is")]), "ECM"],
    ["hardened armor", mech(50, 4, [], { armorType: "hardened" }), "CR"],
    ["a 105-ton 'Mech is Large (p. 125)", mech(105, 3), "LG"],
    ["an internal combustion engine", mech(50, 4, [], { engine: { type: "ice", rating: 200 } }), "EE"],
    ["a Clan 'Mech with ammunition has CASE; an Inner Sphere one only if it lists it (errata, p. 122)", mech(50, 4, [item("ultra-ac-5-clan"), item("ammo-ultra-ac-5-clan")], {}, { techBase: "clan" }), "CASE"],
  ] as [string, MechRecord, string][])("%s earns %s", (_name, record, code) => {
    expect(convertClassicMech(record, catalog).unit.card.specials?.map((s) => s.code)).toContain(code);
  });

  it("an Inner Sphere 'Mech with ammunition does not get CASE, and one with no explosive component gets ENE (p. 123)", () => {
    expect(specialsOf(mech(50, 4, [item("ac-5-is"), item("ammo-ac-5-is")]))).not.toMatch(/CASE|ENE/);
    expect(specialsOf(mech(50, 4, [item("medium-laser-is")]))).toBe("ENE");
  });

  it("a probe or a Watchdog also earns the specials the book adds, and one mounted twice counts once", () => {
    expect(specialsOf(mech(50, 4, [item("bloodhound-active-probe-is"), item("medium-laser-is")]))).toBe("BH, ENE, RCN");
    expect(specialsOf(mech(50, 4, [item("tag-is"), item("tag-is")]))).toBe("ENE, TAG");
  });

  it("C3 slaves carry no number; two boosted masters do (p. 121)", () => {
    expect(specialsOf(mech(50, 4, [item("c3-computer-slave-is"), item("c3-computer-slave-is")]))).toContain("C3S");
    expect(specialsOf(mech(50, 4, [item("c3-boosted-master-is"), item("c3-boosted-master-is")]))).toMatch(/C3BSM2/);
  });

  it("mobile headquarters: the points of the equipment, rounded down (p. 127, errata)", () => {
    // A C3 master (5) and an improved C3 (2.5) make 7.5, MHQ7; the master also earns TAG.
    expect(specialsOf(mech(50, 4, [item("c3-computer-master-is"), item("improved-c3-computer-is")]))).toMatch(/MHQ7/);
  });

  it("the heat of flamers and plasma weapons: a bracket total of 5 to 10 is 1, 11 or more is 2 (p. 124)", () => {
    expect(specialsOf(mech(50, 4, [...many(3, "flamer-is")]))).toContain("HT1/0/0");
  });

  it("jump jets earn JMPW or JMPS from the movement step (p. 93); LRMs earn LRM and IF from the damage and heat", () => {
    const jenner = convertClassicMech(mech(35, 7, many(5, "jump-jet-is")), catalog).unit.card.specials?.map((s) => s.raw);
    expect(jenner).toContain("JMPW1");
    // Two LRM 15 with enough ammunition, no heat reduction: left-most values 0.45/0.9/0.9 each, so 0.9 at Short (1) and 1.8 at Medium and Long (2).
    const boat = specialsOf(mech(60, 4, [...many(2, "lrm-15-is"), ...many(4, "ammo-lrm-15-is")]));
    expect(boat).toContain("LRM1/2/2");
    expect(boat).toMatch(/IF2/);
  });

  it("an artillery weapon earns ARTX-# and leaves the Point Value unset, with a finding", () => {
    const result = convertClassicMech(mech(60, 4, [item("arrow-iv-is"), item("ammo-arrow-iv-is")]), catalog);
    expect(formatSpecials(result.unit.card.specials ?? [])).toContain("ARTAIS-1");
    expect(result.unit.card.pv).toBeUndefined();
    expect(result.findings.some((f) => f.code === "pv-artillery")).toBe(true);
  });
});

describe("role (ASC pp. 134-136)", () => {
  const card = (move: string, armor: number, damage: [number, number, number], specials = "") => {
    return { type: "BM", size: 2, tmm: 1, move: [{ inches: Number(move), mode: "" }], role: null, pv: 0, damage: { s: { value: damage[0] }, m: { value: damage[1] }, l: { value: damage[2] } }, ov: 0, armor, structure: 3, specials: specials === "" ? [] : [{ code: specials, values: [], raw: specials }] };
  };
  it("the figures of each role: slow and heavy at short range is a Juggernaut, fast and light is a Striker or Scout", () => {
    expect(suggestRole(card("4", 8, [5, 3, 0]) as never).role).toBe("Juggernaut");
    expect(suggestRole(card("10", 3, [3, 1, 0]) as never).role).toBe("Scout");
    expect(suggestRole(card("10", 5, [4, 2, 0]) as never).role).toBe("Striker");
    expect(suggestRole(card("10", 3, [0, 2, 3]) as never).role).toBe("Sniper");
  });

  it("an IndustrialMech and an unarmed unit are support units: no role", () => {
    expect(suggestRole({ ...(card("8", 4, [0, 0, 0]) as never as object), type: "BM" } as never).role).toBeNull();
    expect(suggestRole({ ...(card("8", 4, [2, 2, 0]) as never as object), type: "IM" } as never).role).toBeNull();
  });
});

describe("a converted 'Mech arrives whole, NOT OFFICIAL, and an OmniMech configuration converts directly", () => {
  const record = mech(50, 4, [...many(2, "medium-laser-is"), item("guardian-ecm-suite-is"), item("tag-is")]);
  it("fills the Point Value, role and abilities, and the draft keeps the card as converted for later comparison", () => {
    const conversion = convertClassicMech(record, catalog);
    const draft = conversionDraft(record, conversion, "new-id", "2026-11-26T00:00:00Z");
    expect(draft.card.pv).toBeGreaterThan(0);
    expect(draft.card.specials.length).toBeGreaterThan(0);
    expect(draft.card.role).not.toBeUndefined();
    expect(draft.source).toMatchObject({ kind: "converted", ref: record.id, values: draft.card });
    expect(draft.source.official).toBeUndefined();
    expect(conversion.working.map((w) => w.step)).toEqual(expect.arrayContaining(["special", "role", "points"]));
  });

  it("an OmniMech configuration gets the OMNI ability, and a base chassis with no pods stops after the body", () => {
    const link = { chassisId: "c", configurationId: "x", code: "Prime", baseHeatSinks: 10, baseMountIds: [] };
    const prime = mech(50, 4, [item("medium-laser-is")], {}, { unitType: "omnimech", omni: link });
    expect(specialsOf(prime)).toContain("OMNI");
    const base = convertClassicMech(mech(50, 4, [], {}, { unitType: "omnimech", omni: { ...link, isBase: true } }), catalog);
    expect(base.specials).toBeNull();
    expect(base.point).toBeNull();
  });
});
