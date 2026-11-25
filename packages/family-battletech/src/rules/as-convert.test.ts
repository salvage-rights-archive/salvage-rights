import { describe, expect, it } from "vitest";
import { ARMOR_RULES, AS_WEAPON_TABLE, ENGINE_MAPPING, MECH_SIZE_CLASSES, STRUCTURE_RULES, STRUCTURE_TABLE, TMM_ROWS, TYPE_OF_MECH, WEAPON_ROW_OF } from "../data/as-convert";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { ARMOR, ENGINE_TYPES, STRUCTURE_TYPES } from "../data/chassis";
import { convertArmor, convertBody, convertMovement, convertSize, convertStructure, convertType, convertWeapons, tmmOf } from "./as-convert";
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

describe("weapon damage by range (ASC pp. 99-110, errata v1.6)", () => {
  const clan = (mounts: Mount[]): MechRecord => mech(75, 4, mounts, {}, { techBase: "clan" });
  const damage = (record: MechRecord) => convertWeapons(record, catalog);
  const sums = (record: MechRecord) => {
    const step = damage(record);
    return step.value && [step.value.subtotal.short, step.value.subtotal.medium, step.value.subtotal.long, step.value.roundedUp.short, step.value.roundedUp.medium, step.value.roundedUp.long];
  };

  it("the book's Mad Cat Mk II: 6.49 at Short, 7 at Medium and 4.2 at Long, from the Clan table (p. 100)", () => {
    // Two Gauss rifles, four ER medium lasers and two LRM 10s, with enough ammunition that the ammunition rule does not apply.
    const record = clan([...many(2, "gauss-rifle-clan"), ...many(4, "er-medium-laser-clan"), ...many(2, "lrm-10-clan"), ...many(3, "ammo-gauss-rifle-clan"), ...many(2, "ammo-lrm-10-clan")]);
    expect(sums(record)).toEqual([6.49, 7, 4.2, 6.5, 7, 4.2]);
    const step = damage(record);
    expect(step.value?.lines).toHaveLength(8);
    expect(step.working.some((w) => w.cite.page === 109 || w.cite.page === 108)).toBe(true);
    expect(step.findings).toEqual([]);
  });

  it("fewer than 10 shots a weapon multiplies by 0.75, and an Ultra needs 20 (p. 101, errata v1.6 wording)", () => {
    // One ton of Gauss ammunition is 8 shots. One ton of Ultra AC/5 ammunition is 20 shots: enough for one weapon, but 10 each for two.
    expect(sums(clan([item("gauss-rifle-clan"), item("ammo-gauss-rifle-clan")]))?.slice(0, 3)).toEqual([0.93375, 1.125, 1.125]);
    expect(sums(clan([item("ultra-ac-5-clan"), item("ammo-ultra-ac-5-clan")]))?.slice(0, 3)).toEqual([0.75, 0.75, 0.75]);
    expect(sums(clan([...many(2, "ultra-ac-5-clan"), item("ammo-ultra-ac-5-clan")]))?.slice(0, 3)).toEqual([1.125, 1.125, 1.125]);
  });

  it("a targeting computer multiplies the weapons marked Y by 1.10 and an actuator enhancement system the weapons in its arm by 1.05", () => {
    const ppc = item("er-ppc-is", "RA");
    const base = [item("flamer-is", "LA"), item("medium-laser-is", "CT")];
    expect(sums(mech(60, 4, [...base, ppc]))?.slice(0, 3)).toEqual([1.7, 1.5, 1]);
    // The medium laser and the ER PPC (TC Y) are multiplied; the flamer (TC N) is not.
    expect(sums(mech(60, 4, [...base, ppc, item("targeting-computer-is", "RT")]))?.slice(0, 3)).toEqual([1.85, 1.65, 1.1]);
    // The AES is in the right arm: the ER PPC is multiplied by 1.05, the others are not.
    expect(sums(mech(60, 4, [...base, ppc, item("aes-arm-is", "RA")]))?.slice(0, 3)).toEqual([1.75, 1.55, 1.05]);
  });

  it("Artemis IV takes the second value of its launcher, and a Multi-Missile Launcher counts the average of both ammunition counts", () => {
    const lrm = item("lrm-15-is", "LT");
    const withArtemis = [lrm, { ...item("artemis-iv-is", "LT"), linkedTo: lrm.id }, ...many(2, "ammo-lrm-15-is")];
    expect(sums(mech(60, 4, withArtemis))?.slice(0, 3)).toEqual([0.6, 1.2, 1.2]);
    // MML 5: 24 LRM shots and 20 SRM shots in one ton each, 22 on average, so 22 for the one launcher: no reduction.
    expect(sums(mech(60, 4, [item("mml-5-is"), item("ammo-mml-5-lrm-is"), item("ammo-mml-5-srm-is")]))?.slice(0, 3)).toEqual([0.6, 0.45, 0.3]);
  });

  it("a weapon the book or our catalog cannot place is a finding and no value; artillery and melee items are left to their abilities", () => {
    const stuck = damage(mech(60, 4, [item("medium-laser-is"), item("centurion-weapon-system-is")]));
    expect(stuck.value).toBeNull();
    expect(stuck.findings.map((f) => f.code)).toEqual(["no-table-row"]);
    const placed = damage(mech(60, 4, [item("medium-laser-is"), item("arrow-iv-is"), item("hatchet-is")]));
    expect(placed.findings).toEqual([]);
    expect(placed.value?.subtotal.short).toBe(0.5);
    expect(placed.working.filter((w) => w.rule.includes("not added"))).toHaveLength(2);
    expect(damage(mech(60, 4, [{ ...item("medium-laser-is"), equipmentId: null, name: "Mystery Cannon" }])).findings[0]?.code).toBe("unknown-mount");
  });

  it("rear-firing weapons are used only when they deliver more at every range", () => {
    const rear = (id: string) => ({ ...item(id, "CT"), rear: true as const });
    expect(sums(mech(50, 4, [item("medium-laser-is", "LA"), rear("small-laser-is")]))?.slice(0, 3)).toEqual([0.5, 0.5, 0]);
    expect(sums(mech(50, 4, [item("small-laser-is", "LA"), rear("ppc-is")]))?.slice(0, 3)).toEqual([0.75, 1, 1]);
    const mixed = damage(mech(50, 4, [item("large-laser-is", "LA"), rear("ppc-is")]));
    expect(mixed.findings.map((f) => f.code)).toEqual(["rear-arc"]);
  });

  it("the table has the errata's values and every weapon id we map has a row", () => {
    const find = (tech: string, name: string) => AS_WEAPON_TABLE.find((r) => r.tech === tech && r.name === name);
    expect(find("is", "Large Re-Engineered Laser")).toMatchObject({ heat: 9, short: 0.945, medium: 0.945, long: null });
    expect(find("clan", "SRM 4")).toMatchObject({ short: [0.6, 0.6, 0.63] });
    expect(find("clan", "Improved ATM 6")?.long).toBe(0.6);
    expect(find("clan", "Heavy Flamer")?.cite.errata).toBe("v1.6");
    for (const entry of WEAPON_ROW_OF) {
      expect(find(entry.tech, entry.name), entry.id).toBeDefined();
      expect(catalog.byId(entry.id), entry.id).toBeDefined();
    }
  });
});
