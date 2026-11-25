import { describe, expect, it } from "vitest";
import { ARMOR_RULES, ENGINE_MAPPING, MECH_SIZE_CLASSES, STRUCTURE_RULES, STRUCTURE_TABLE, TMM_ROWS, TYPE_OF_MECH } from "../data/as-convert";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { ARMOR, ENGINE_TYPES, STRUCTURE_TYPES } from "../data/chassis";
import { convertArmor, convertBody, convertMovement, convertSize, convertStructure, convertType, tmmOf } from "./as-convert";
import { createCatalog, expand } from "./catalog";
import { bipedRecord, mount } from "./fixtures";
import type { MechRecord, Mount } from "./mech";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));

let n = 0;
const item = (equipmentId: string, location: Mount["location"] = "CT"): Mount => ({ ...mount(`m${(n += 1)}`, equipmentId, location, null), name: equipmentId });
const many = (count: number, id: string) => Array.from({ length: count }, () => item(id));

/** A 'Mech of the given weight and Walking MP (engine rating = tons x walk), with the given equipment and part types. */
function mech(tons: number, walk: number, mounts: Mount[] = [], chassis: Partial<MechRecord["chassis"]> = {}, patch: Partial<MechRecord> = {}): MechRecord {
  const base = bipedRecord();
  return { ...base, tons, mounts, chassis: { ...base.chassis, engine: { type: "standard", rating: tons * walk }, ...chassis }, ...patch };
}
const withArmor = (record: MechRecord, points: number): MechRecord => ({ ...record, armor: { CT: { front: points - 4, rear: 4 } } });

describe("unit type and size class (ASC p. 91, table p. 92, errata v1.6)", () => {
  it.each([
    [20, "mech", "BM", 1],
    [35, "mech", "BM", 1],
    [40, "mech", "BM", 2],
    [55, "mech", "BM", 2],
    [60, "mech", "BM", 3],
    [75, "mech", "BM", 3],
    [80, "mech", "BM", 4],
    [100, "mech", "BM", 4],
    [105, "mech", "BM", 4], // superheavy: size 4, and the errata takes away the asterisk, so no automatic LG
    [45, "industrialmech", "IM", 2], // the book's own example: 45 tons is size 2
    [65, "omnimech", "BM", 3],
  ] as [number, MechRecord["unitType"], string, number][])("%i tons, %s is %s size %i", (tons, unitType, type, size) => {
    const record = mech(tons, 4, [], {}, { unitType });
    expect(convertType(record).value).toBe(type);
    const sized = convertSize(record);
    expect(sized.value).toBe(size);
    expect(sized.working[0]?.cite).toMatchObject({ book: "Alpha Strike Companion", page: 92 });
  });
});

describe("movement, jump and TMM (ASC pp. 92-95, errata v1.6 for rounding and the TMM table)", () => {
  const jets = (count: number) => many(count, "jump-jet-is");
  const move = (record: MechRecord) => convertMovement(record, catalog).value;
  // Each row: the page example it checks, the 'Mech, its Move as a card prints it, TMM and the special its jump earns.
  it.each([
    ["Barghest, 4 Walking MP (p. 92)", mech(70, 4), `8"`, 1],
    ["Panther, 4 walk and 4 jump: jump added to the Move (p. 93)", mech(35, 4, jets(4)), `8"j`, 1],
    ["Jenner, 7 walk and 5 jump (p. 93)", mech(35, 7, jets(5)), `14"/10"j`, 3, "JMPW1"],
    ["errata example, 10 in with 6 in of jump (p. 95)", mech(55, 5, jets(3)), `10"/6"j`, 2, "JMPW1"],
    ["Sasquatch, a large shield takes 1 Walking MP (p. 94)", mech(100, 5, [item("shield-large-is", "LA")]), `8"`, 1],
    ["MASC: 10 MP gives 20 in, 25 after the boost, 26 by the errata (p. 93)", mech(20, 10, [item("masc-is")]), `26"`, 4],
    ["MASC and supercharger together multiply by 1.5", mech(50, 5, [item("masc-is"), item("supercharger-is")]), `16"`, 3],
    ["hardened armor takes 1 Walking MP (p. 94)", mech(50, 5, [], { armorType: "hardened" }), `8"`, 1],
    ["Aquagladius, 6 walk and 5 UMU (p. 94)", mech(50, 6, many(5, "umu-is")), `12"/10"s`, 2, undefined],
  ] as [string, MechRecord, string, number, string?][])("%s", (_name, record, card, tmm, special) => {
    const result = move(record);
    expect(result?.move.map((m) => `${String(m.inches)}"${m.mode}`).join("/")).toBe(card);
    expect(result?.tmm).toBe(tmm);
    expect(result?.jumpSpecial ? `${result.jumpSpecial.code}${String(result.jumpSpecial.value)}` : undefined).toBe(special);
  });

  it.each([
    [4, 0], [5, 1], [9, 2], [13, 3], [19, 4], [35, 5],
  ])("a Move of %i in has TMM +%i (the band's first inch)", (inches, tmm) => {
    expect(tmmOf(inches)).toBe(tmm);
  });
});

describe("armor (ASC pp. 95-97)", () => {
  // Armor factor, armor type, the Alpha Strike armor it converts to.
  it.each([
    [107, "standard", 4], // 107 / 30 = 3.57, the book's example figure
    [105, "standard", 4], // 3.5 rounds up
    [104, "ferro-fibrous", 3],
    [100, "hardened", 7], // doubled to 200, then 6.67
    [100, "ferro-lamellor", 4], // 120, then 4
    [101, "laser-reflective", 3], // 75.75 rounds up to 76, then 2.53
    [100, "reactive-clan", 3], // 75, then 2.5 rounds up
    [100, "commercial", 2], // halved to 50 first, then 1.67
    [100, "industrial", 3], // Barrier Armor Rating 10: nothing changes
  ] as [number, string, number][])("%i points of %s armor is %i", (points, armorType, expected) => {
    const result = convertArmor(withArmor(mech(50, 4, [], { armorType }), points));
    expect(result.value).toBe(expected);
    expect(result.working.at(-1)?.cite.page).toBe(95);
  });
});

describe("structure (ASC pp. 97-99)", () => {
  const structure = (tons: number, engineType: string, rating: number, structureType = "standard", techBase: MechRecord["techBase"] = "inner-sphere") =>
    convertStructure(mech(tons, 4, [], { engine: { type: engineType, rating }, structure: structureType }, { techBase })).value;
  // Tons, engine, rating, the table's value (page 98 read against the page image).
  it.each([
    [45, "light", 180, 2], // the book's example: a 45-ton Inner Sphere light fusion engine
    [100, "compact", 400, 10],
    [100, "standard", 300, 8],
    [100, "xl", 300, 4],
    [100, "xl-clan", 300, 5],
    [75, "xxl-clan", 300, 3],
    [100, "standard", 500, 6], // over 400: the Large Fusion row
    [100, "xl", 500, 4],
    [50, "ice", 200, 4], // the standard row's footnote includes ICE
    [105, "standard", 315, 8], // superheavy columns
    [200, "compact", 400, 20],
    [200, "xxl-clan", 400, 8],
    [150, "light", 300, 8],
    [150, "light", 450, 6], // a large light engine: the superheavy XL row stands for it
  ] as [number, string, number, number][])("%i tons, %s %i is %i", (tons, engine, rating, expected) => {
    expect(structure(tons, engine, rating)).toBe(expected);
  });

  it("composite structure halves the value rounding up, reinforced doubles it", () => {
    expect(structure(50, "standard", 200, "composite")).toBe(2);
    expect(structure(55, "standard", 220, "composite")).toBe(3);
    expect(structure(50, "standard", 200, "reinforced")).toBe(8);
    expect(structure(50, "standard", 200, "endo-steel")).toBe(4);
  });
});

describe("a part the book has no value for is a finding, not a guess", () => {
  const codes = (r: MechRecord) => convertBody(r, catalog).findings.map((f) => f.code);
  it.each([
    ["a mechanical jump booster", mech(50, 4, [item("mechanical-jump-booster-is")]), "jump-equipment", "move"],
    ["a Land-Air 'Mech", mech(50, 4, [], {}, { configuration: "lam" }), "lam-movement", "move"],
    ["a shield with MASC", mech(50, 5, [item("shield-medium-is", "LA"), item("masc-is")]), "penalty-with-boost", "move"],
    ["an armor type with no rule", mech(50, 4, [], { armorType: "mystery" }), "armor-type", "armor"],
    ["a large Clan standard engine", mech(50, 10, [], { engine: { type: "standard", rating: 500 } }, { techBase: "clan" }), "engine-structure", "structure"],
    ["a structure type we do not know", mech(50, 4, [], { structure: "mystery" }), "structure-type", "structure"],
  ] as [string, MechRecord, string, "move" | "armor" | "structure"][])("%s", (_name, record, code, field) => {
    const body = convertBody(record, catalog);
    expect(codes(record)).toContain(code);
    const key = field === "move" ? "move" : field;
    expect(body.card[key as "move" | "armor" | "structure"]).toBeUndefined();
    // The other fields still convert.
    expect(body.card.type).toBe("BM");
    expect(body.card.size).toBe(2);
  });

  it("an OmniMech base chassis has no values at all, a configuration of it does", () => {
    const link = { chassisId: "c", configurationId: "x", code: "Prime", baseHeatSinks: 10, baseMountIds: [] };
    expect(convertBody(mech(50, 4, [], {}, { unitType: "omnimech", omni: { ...link, isBase: true } }), catalog)).toMatchObject({ card: {}, findings: [{ code: "omni-base" }] });
    const prime = convertBody(mech(50, 4, [], {}, { unitType: "omnimech", omni: link }), catalog);
    expect(prime.card).toMatchObject({ type: "BM", size: 2, tmm: 1, armor: 3, structure: 4 });
    expect(prime.working.length).toBeGreaterThan(4);
  });
});

describe("the conversion tables", () => {
  it("every row carries its cite and was checked against the page; the structure table has its full width", () => {
    const rows = [...TYPE_OF_MECH, ...MECH_SIZE_CLASSES, ...TMM_ROWS, ...ARMOR_RULES, ...STRUCTURE_RULES, ...ENGINE_MAPPING, ...STRUCTURE_TABLE.rows];
    for (const row of rows) {
      expect(row.checked).toBe("page");
      expect(row.cite.book).toBe("Alpha Strike Companion");
    }
    for (const row of STRUCTURE_TABLE.rows) {
      expect(row.standard).toHaveLength(19);
      expect(row.superheavy).toHaveLength(20);
    }
    // Every armor, structure and engine type of our tables is mapped or deliberately left to a finding.
    const unmapped = Object.keys(ARMOR.types).filter((id) => !ARMOR_RULES.some((r) => r.armorType === id));
    expect(unmapped).toEqual([]);
    expect(Object.keys(ENGINE_TYPES.types).filter((id) => !ENGINE_MAPPING.some((m) => m.engineType === id))).toEqual([]);
    expect(Object.keys(STRUCTURE_TYPES.types).length).toBeGreaterThan(0);
  });
});
