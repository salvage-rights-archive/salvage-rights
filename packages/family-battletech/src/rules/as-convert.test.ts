import { describe, expect, it } from "vitest";
import { ARMOR_RULES, AS_WEAPON_TABLE, ENGINE_MAPPING, MECH_SIZE_CLASSES, STRUCTURE_RULES, STRUCTURE_TABLE, TMM_ROWS, TYPE_OF_MECH, WEAPON_ROW_OF } from "../data/as-convert";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { ARMOR, ENGINE_TYPES, STRUCTURE_TYPES } from "../data/chassis";
import {
  convertArmor,
  convertBody,
  convertDissipation,
  convertHeat,
  convertHeatOutput,
  convertMech,
  convertMovement,
  convertMovementHeat,
  convertSize,
  convertStructure,
  convertType,
  convertWeapons,
  conversionDraft,
  finalAbilityDamage,
  finalDamage,
  heatModifiedDamage,
  tmmOf,
} from "./as-convert";
import type { Step, WeaponDamage, WeaponLine } from "./as-convert";
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
    const unmapped = Object.keys(ARMOR.types).filter((id) => ARMOR.types[id]?.units === undefined).filter((id) => !ARMOR_RULES.some((r) => r.armorType === id));
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
    // A special munition counts the launcher's shots times its multiplier: an LRM 20 has 6 shots (under 10), and a ton of Heat-Seeking (x0.5) could add 3 (still under
    // 10, so the rule applies either way), but a ton of Smoke (x1) could add 6 (over 10), which decides it, so no value.
    const lrm20 = [item("lrm-20-is"), item("ammo-lrm-20-is")];
    expect(sums(mech(60, 4, [...lrm20, item("ammo-heat-seeking-lrm-is")]))).not.toBeNull();
    expect(sums(mech(60, 4, [...lrm20, item("ammo-smoke-lrm-is")]))).toBeNull();
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

// ---- Part three: heat, damage, Overheat Value (ASC pp. 115-116 as the Converting Heat errata v1.3 replaces them) ----------------

describe("heat dissipation (errata v1.3, p. 115)", () => {
  const sinks = (type: string, count: number, extra?: { type: string; count: number }[]): Partial<MechRecord["chassis"]> => ({ heatSinks: { type, count, ...(extra ? { extra } : {}) } });
  it.each([
    ["ten single sinks", mech(50, 4, [], sinks("single", 10)), 10],
    ["the book's example: ten double sinks and a coolant pod make 21", mech(50, 4, [item("coolant-pod-is")], sinks("double", 10)), 21],
    ["mixed groups: ten Inner Sphere doubles and four Clan doubles", mech(50, 4, [], sinks("double", 10, [{ type: "double-clan", count: 4 }])), 28],
    ["compact sinks are one each", mech(50, 4, [], sinks("compact", 12)), 12],
    ["laser sinks are two each", mech(50, 4, [], sinks("laser", 10)), 20],
    ["a partial wing (two mounts), the radical system and the RISC coolant system count once each", mech(50, 4, [item("partial-wing-is", "LT"), item("partial-wing-is", "RT"), item("radical-heat-sink-is"), item("risc-emergency-coolant-system-is")], sinks("single", 10)), 15],
  ] as [string, MechRecord, number][])("%s", (_name, record, total) => {
    const step = convertDissipation(record, catalog);
    expect(step.value).toBe(total);
    expect(step.working.at(-1)?.cite).toMatchObject({ page: 115, errata: "heat-v1.3" });
  });
  it("a heat sink kind the table does not list is a finding and no value", () => {
    const step = convertDissipation(mech(50, 4, [], { heatSinks: { type: "mystery", count: 10 } }), catalog);
    expect(step.value).toBeNull();
    expect(step.findings.map((f) => f.code)).toEqual(["heat-sink-type"]);
  });
});

describe("heat output: movement and the special cases (errata v1.3, p. 115)", () => {
  const jets = (count: number, id = "jump-jet-is") => many(count, id);
  it.each([
    ["a BattleMech without jump jets adds 2", mech(50, 4), 2],
    ["an IndustrialMech without jump jets adds none", mech(50, 4, [], {}, { unitType: "industrialmech" }), 0],
    ["jumping is 1 per 2 inches: 5 jets", mech(50, 4, jets(5)), 5],
    ["but at least 3", mech(50, 4, jets(2)), 3],
    ["an XXL engine without jump jets: 6", mech(50, 4, [], { engine: { type: "xxl", rating: 200 } }), 6],
    ["an XXL engine jumping: 2 per 2 inches, 8 for 4 jets", mech(50, 4, jets(4), { engine: { type: "xxl", rating: 200 } }), 8],
    ["improved jump jets halve it rounding up, at least 3: 8 jets give 4", mech(50, 4, jets(8, "improved-jump-jet-is")), 4],
    ["improved jets with an XXL engine are 1 per 2 inches: 5 jets give 5", mech(50, 4, jets(5, "improved-jump-jet-is"), { engine: { type: "xxl", rating: 200 } }), 5],
    ["improved jets with an XXL engine, at least 3: 2 jets give 3", mech(50, 4, jets(2, "improved-jump-jet-is"), { engine: { type: "xxl", rating: 200 } }), 3],
  ] as [string, MechRecord, number][])("%s", (_name, record, heat) => {
    expect(convertMovementHeat(record, catalog).value).toBe(heat);
  });

  const output = (record: MechRecord) => {
    const weapons = convertWeapons(record, catalog);
    return weapons.value && convertHeatOutput(record, catalog, weapons.value).value;
  };
  it.each([
    // Short and Medium output, then Long output (weapons with no Long damage value left out).
    ["two medium lasers (3 each) and 2 for walking; they have no Long damage", mech(50, 4, many(2, "medium-laser-is")), 8, 2],
    ["a machine gun is heat-neutral; an anti-missile system adds 1 even at Long", mech(50, 4, [item("machine-gun-is"), item("ppc-is"), item("ams-is")]), 13, 13],
    ["laser anti-missile systems add 5 (Clan) and 7 (Inner Sphere)", mech(50, 4, [item("laser-anti-missile-system-clan"), item("laser-anti-missile-system-is")]), 14, 14],
    ["a rocket launcher adds no heat", mech(50, 4, [item("rocket-launcher-10-is"), item("medium-laser-is")]), 5, 2],
    ["the rear weapons' heat counts when it is larger than the forward weapons'", mech(50, 4, [item("medium-laser-is", "LA"), { ...item("ppc-is", "CT"), rear: true }]), 12, 12],
    ["stealth armor adds 10 and the Chameleon shield 6", mech(50, 4, [item("chameleon-lps-is")], { armorType: "stealth" }), 18, 18],
    ["the Null-Signature System (10) and the Chameleon shield (6) together make 16", mech(50, 4, [item("chameleon-lps-is"), item("null-signature-system-is")]), 18, 18],
  ] as [string, MechRecord, number, number][])("%s", (_name, record, total, long) => {
    expect(output(record)).toEqual({ total, long });
  });
});

describe("heat-modified damage, final damage and the Overheat Value (errata v1.3, pp. 115-116)", () => {
  const cite = { book: "Alpha Strike Companion" as const, page: 101, checked: "page" as const };
  /** A weapons step made by hand: each entry is [heat, has Long damage]; the subtotals are what the book's example gives. */
  const weaponsStep = (heats: [number, boolean][], subtotal: [number, number, number, number?]): Step<WeaponDamage> => {
    const lines: WeaponLine[] = heats.map(([heat, long], n) => ({
      mountId: `w${String(n)}`,
      name: `weapon ${String(n)}`,
      tableRow: "made up",
      rear: false,
      base: { short: 1, medium: 1, long: long ? 1 : 0, extreme: 0 },
      factors: [],
      damage: { short: 1, medium: 1, long: 1, extreme: 0 },
      heat,
      notes: [],
      plain: { short: 1, medium: 1, long: 1, extreme: 0 },
      cite,
    }));
    const [short, medium, long, extreme = 0] = subtotal;
    const sub = { short, medium, long, extreme };
    return { value: { arc: "front", lines, all: lines, subtotal: sub, roundedUp: sub }, working: [], findings: [] };
  };
  const shown = (d: { value: number; minimal?: true } | null | undefined) => (d === undefined ? "?" : d === null ? "-" : d.minimal ? "0*" : String(d.value));
  const card = (record: MechRecord, step: Step<WeaponDamage>) => {
    const heat = convertHeat(record, catalog, step).value;
    return heat && `${shown(heat.final.short)}/${shown(heat.final.medium)}/${shown(heat.final.long)} OV${String(heat.ov)}${heat.ovl ? " OVL" : ""}`;
  };
  const sinks = (count: number) => mech(50, 4, [], { heatSinks: { type: "single", count } });

  it.each([
    // The errata's own example: Long subtotal 4.5, 50 weapon heat at Long and 3 more that cannot reach Long, 2 for walking, 40 dissipation.
    // Long heat 52 gives 3.8, whole 4, one under the whole subtotal 5: OVL. The actual Long damage then uses 53 + 2 - 4: 3.6, so 4.
    ["the book's Long-range example: 4.5 subtotal, 40 dissipation", sinks(40), weaponsStep([[50, true], [3, false]], [4.5, 4.5, 4.5]), "4/4/4 OV1 OVL"],
    ["no reduction when dissipation is the heat output minus 4 or more: subtotals only round up to the tenth (0.401 and 0.901 are the book's examples)", sinks(10), weaponsStep([[12, true]], [0.401, 0.901, 0.2]), "1/1/0* OV0"],
    ["a bracket with no damage is a dash", sinks(10), weaponsStep([[3, false]], [0.5, 0.5, 0]), "1/1/- OV0"],
    ["the Overheat Value is at most 4", sinks(10), weaponsStep([[40, true]], [10, 10, 0]), "3/3/- OV4"],
    ["minimal damage: more than 0 and under 0.5 after heat-modification is 0*", sinks(14), weaponsStep([[30, true]], [0.5, 2, 0]), "0*/1/- OV1"],
    ["a unit with no Medium damage takes its Overheat Value from Short", sinks(5), weaponsStep([[30, false]], [6, 0, 0]), "2/-/- OV4"],
  ] as [string, MechRecord, Step<WeaponDamage>, string][])("%s", (_name, record, step, expected) => {
    expect(card(record, step)).toBe(expected);
  });

  it("heat-modified damage and the final rounding of a bracket: up to the tenth, then up to the whole; 0* under 0.5; special abilities round normally", () => {
    const state = { output: 55, longOutput: 52, dissipation: 40, reduces: true, ovl: true };
    expect(heatModifiedDamage(4.5, "long", state)).toBe(3.6);
    expect(finalDamage(3.6)).toEqual({ value: 4 });
    expect(heatModifiedDamage(4.5, "long", { ...state, ovl: false })).toBe(4.5); // without OVL the Long subtotal is not reduced
    expect(finalDamage(0.4)).toEqual({ value: 0, minimal: true });
    expect(finalDamage(0.5)).toEqual({ value: 1 });
    expect(finalDamage(0)).toBeNull();
    expect(finalAbilityDamage(2.4)).toEqual({ value: 2 });
    expect(finalAbilityDamage(2.5)).toEqual({ value: 3 });
  });
});

describe("a part the heat rules have no answer for is a finding, not a guess", () => {
  it.each([
    ["a mechanical jump booster", mech(50, 4, [item("mechanical-jump-booster-is"), item("medium-laser-is")]), "jump-equipment"],
    ["improved and standard jump jets together", mech(50, 4, [...many(3, "jump-jet-is"), ...many(2, "improved-jump-jet-is"), item("medium-laser-is")]), "mixed-jump-jets"],
    ["a heat sink kind the table lacks", mech(50, 4, [item("medium-laser-is")], { heatSinks: { type: "mystery", count: 10 } }), "heat-sink-type"],
    ["a weapon the weapon tables cannot place", mech(50, 4, [item("centurion-weapon-system-is")]), "no-table-row"],
  ] as [string, MechRecord, string][])("%s leaves damage and Overheat Value unset", (_name, record, code) => {
    const result = convertMech(record, catalog);
    expect(result.findings.map((f) => f.code)).toContain(code);
    expect(result.unit.card.damage).toBeUndefined();
    expect(result.unit.card.ov).toBeUndefined();
    expect(result.unit.card.armor).toBeDefined(); // the earlier parts still convert
  });
  it("an item with a heat the book does not name, and Extreme damage on a unit that reduces, are findings beside the values", () => {
    const record = mech(50, 4, [item("spot-welder-is", "RA"), ...many(4, "ac-2-is"), ...many(3, "ammo-ac-2-is"), ...many(8, "medium-laser-is")]);
    const result = convertMech(record, catalog);
    expect(result.findings.map((f) => f.code)).toEqual(expect.arrayContaining(["item-heat", "extreme-heat"]));
    expect(result.heat?.final.extreme).toBeUndefined();
    expect(result.unit.card.damage).toBeDefined();
  });
});

describe("convertMech runs parts one to three", () => {
  it("a made-up 50-ton 'Mech with more heat than it sheds: body, damage, Overheat Value and OVL, with the specials, role and Point Value left to later pieces", () => {
    // Two ER PPCs (15 heat, 1/1/1 each) and two Large Lasers (8 heat, 0.8/0.8 each), ten single heat sinks, walking: output 48, Long output 32.
    // Subtotals 3.6/3.6/2. Short and Medium: 3.6 x 10 / 44 = 0.82, up to 0.9, final 1; Medium drops from 4 to 1: Overheat Value 3.
    // Long check: 2 x 10 / 28 = 0.72, up to 0.8, whole 1, one under 2: OVL; the Long damage is 2 x 10 / 44 = 0.46, up to 0.5, final 1.
    const result = convertMech(mech(50, 4, [...many(2, "er-ppc-is"), ...many(2, "large-laser-is")]), catalog);
    expect(result.unit.card).toMatchObject({ type: "BM", size: 2, tmm: 1, damage: { s: { value: 1 }, m: { value: 1 }, l: { value: 1 } }, ov: 3 });
    expect(result.unit.card.move?.map((m) => m.inches)).toEqual([8]);
    expect(result.earned.ovl).toBe(true);
    expect(result.heat).toMatchObject({ output: 48, longOutput: 32, dissipation: 10, ov: 3 });
    expect(result.pending).toEqual(["specials", "role", "pv"]);
    expect(result.unit.card.specials).toBeUndefined();
    expect(result.unit.card.role).toBeUndefined();
    expect(result.unit.card.pv).toBeUndefined();
    expect(result.unit.source?.kind).toBe("converted");
    expect(new Set(result.working.map((w) => w.step))).toEqual(new Set(["type", "size", "movement", "tmm", "armor", "structure", "weapons", "heat", "damage", "overheat"]));
    expect(result.findings).toEqual([]);
  });
});

describe("conversionDraft", () => {
  it("fills the converted figures, keeps the Classic id and leaves Point Value and role for the player", () => {
    const record = mech(50, 4, [...many(2, "er-ppc-is")]);
    const draft = conversionDraft(record, convertMech(record, catalog), "new-id", "2026-11-26T00:00:00Z");
    expect(draft).toMatchObject({ id: "new-id", source: { kind: "converted", ref: record.id, at: "2026-11-26T00:00:00Z" }, card: { type: "BM", pv: 0, role: null, specials: [] } });
    expect(draft.card.armor).toBeGreaterThan(0);
  });
});
