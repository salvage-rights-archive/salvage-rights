import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { fileKind, fromAsConversion, fromMtf, wrongFileMessage } from "./mordel-files";
import { layout } from "./mech";
import { ARM, BLK, CENTER, CRAWLER, HEAD, LEG, SPRINTER, STRIDER, sections } from "./mordel-files.fixtures";

const catalog = await loadCatalog();
const NOW = "2026-11-25T10:00:00.000Z";
let counter = 0;
const newId = () => `id-${++counter}`;
const read = (text: string) => fromMtf(text, catalog, "total-warfare", NOW, newId);
function record(text: string) {
  const result = read(text);
  if (!result.ok) throw new Error(result.message);
  return result;
}

describe("a 'Mech file from Mordel", () => {
  it("becomes a record with its parts, armor with rear facings, items in the slots the file gives them and the arm actuators it lists", () => {
    const { record: r, notes } = record(STRIDER);
    expect(r.name).toEqual({ chassis: "Test Strider", model: "TS-1" });
    expect([r.tons, r.year, r.techBase, r.configuration]).toEqual([40, 3058, "inner-sphere", "biped"]);
    expect(r.chassis).toMatchObject({ engine: { type: "standard", rating: 160 }, structure: "standard", armorType: "standard", heatSinks: { type: "single", count: 10 } });
    expect(r.armor).toMatchObject({ HD: { front: 9 }, CT: { front: 12, rear: 4 }, LT: { front: 8, rear: 3 }, LA: { front: 6 } });
    const where = r.mounts.map((m) => `${m.name}@${m.location}${String(m.slot)}`);
    expect(where).toEqual(["Medium Laser@LA3", "Medium Laser@RA4", "Heat Sink@LT0", "Heat Sink@LT1", "Autocannon/5@RT0", "Heat Sink@RT4", "Heat Sink@RT5", "Autocannon/5 Ammo@RT6", "Jump Jet@CT10", "Heat Sink@CT11"]);
    expect(r.arms).toEqual({ LA: { lowerArm: true, hand: false } });
    const made = layout(r, catalog.factsOf);
    expect(made.conflicts).toEqual([]);
    expect(made.unplaced).toEqual([]);
    expect(r.rulesLevel).toBeDefined();
    expect(notes[0]).toContain("not saved until you save it");
    expect(r.source).toMatchObject({ kind: "mordel", unitType: "bm", id: 0, fetchedAt: NOW, designer: "a mordel.net member" });
    expect(r.source?.baseline?.mounts).toEqual(r.mounts);
    expect(r.official).toBeUndefined();
  });

  it("reads a slot line ending in (R) as the same item firing to the rear", () => {
    const { record: r, notes } = record(STRIDER.replace("Left Torso:\nHeat Sink\nHeat Sink", "Left Torso:\nHeat Sink\nMedium Laser (R)"));
    expect(r.mounts.find((m) => m.location === "LT" && m.slot === 1)).toMatchObject({ name: "Medium Laser", equipmentId: "medium-laser-is", rear: true });
    expect(r.mounts.filter((m) => m.rear)).toHaveLength(1);
    expect(notes.join(" ")).not.toContain("(R)");
  });

  it("reads a mixed technology file: prefixes pick the tech base, structure and armor slots go where the file puts them, and the member is credited", () => {
    const text = STRIDER.replace("TechBase:Inner Sphere", "TechBase:Mixed (IS Chassis)")
      .replace("Structure:Standard", "Structure:IS Endo Steel")
      .replace("Armor:Standard(Inner Sphere)", "Armor:Ferro-Fibrous (Clan)")
      .replace("source:Custom Mordel.Net Units", "source:Custom Mordel.Net Units\nDesigner:Test Designer")
      .replace("Medium Laser, Right Arm", "CLERMediumLaser, Right Arm");
    const lists = {
      LA: ARM.slice(0, 3),
      RA: [...ARM, "CLERMediumLaser"],
      LT: [...Array<string>(7).fill("Endo Steel"), ...Array<string>(3).fill("Ferro-Fibrous")],
      RT: [...Array<string>(7).fill("Endo Steel"), ...Array<string>(2).fill("Ferro-Fibrous")],
      CT: CENTER,
      HD: HEAD,
      LL: [...LEG, ...Array<string>(2).fill("Ferro-Fibrous")],
      RL: LEG,
    };
    const body = text.slice(0, text.indexOf("Left Arm:"));
    const { record: r, notes } = record(body + sections(lists));
    expect(r.techBase).toBe("mixed");
    expect(r.chassis).toMatchObject({ structure: "endo-steel", armorType: "ferro-fibrous-clan" });
    expect(r.mounts.find((m) => m.name === "ER Medium Laser")).toMatchObject({ techBase: "clan", location: "RA", slot: 4 });
    const structure = r.mounts.filter((m) => m.part === "structure");
    expect(structure).toHaveLength(14);
    expect(structure.filter((m) => m.location === "LT").map((m) => m.slot)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(r.mounts.filter((m) => m.part === "armor").filter((m) => m.location === "LL").map((m) => m.slot)).toEqual([4, 5]);
    expect(r.source?.kind === "mordel" ? r.source.designer : undefined).toBe("Test Designer");
    expect(notes.join(" ")).not.toContain("does not name its designer");
  });

  it("keeps an item it cannot name, reads an OmniMech file as a plain 'Mech with a note, and takes the gyro and cockpit from the slots", () => {
    const text = STRIDER.replace("Config:Biped", "Config:Biped Omnimech").replace("AC/5, Right Torso", "ISFictionalGun, Right Torso");
    const lists = { RA: ARM, RT: ["ISFictionalGun", "ISFictionalGun"], CT: CENTER.filter((l) => l !== "Gyro").concat(["Gyro", "Gyro"]), HD: HEAD };
    const { record: r, notes } = record(text.slice(0, text.indexOf("Left Arm:")) + sections(lists));
    expect(r.chassis.gyro).toBe("compact");
    expect(r.mounts.filter((m) => m.name === "FictionalGun")).toHaveLength(1);
    expect(r.mounts.find((m) => m.name === "FictionalGun")).toMatchObject({ equipmentId: null, slots: 2, location: "RT", slot: 0 });
    expect(notes.join(" ")).toContain("FictionalGun");
    expect(notes.join(" ")).toContain("OmniMech");
  });

  it("answers a plain message, and throws nothing, for a file that is damaged or is not a 'Mech file", () => {
    const withoutMass = STRIDER.replace("Mass:40", "Mass:lots");
    const noEngine = STRIDER.replace("Engine:160 Fusion Engine(IS)", "Engine:big");
    const noLists = STRIDER.slice(0, STRIDER.indexOf("Weapons:")).replace(/^Medium Laser.*$/m, "");
    for (const bad of [withoutMass, noEngine, noLists, "", "\u0000\u0001 not a file", "{}"]) {
      const result = read(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(10);
    }
  });
});

describe("telling the files apart", () => {
  it("names a vehicle file, a record sheet and a conversion text, and says where each can go", () => {
    expect(fileKind(BLK, "Test_Crawler.blk.txt")).toBe("blk");
    expect(fileKind("%PDF-1.7 ...", "x.pdf")).toBe("pdf");
    expect(fileKind(STRIDER)).toBe("mtf");
    expect(fileKind(CRAWLER)).toBe("as-conversion");
    expect(fileKind("hello")).toBe("unknown");
    expect(wrongFileMessage("blk", "mtf")).toMatch(/no vehicle builder yet.*Alpha Strike home/);
    expect(wrongFileMessage("mtf", "as-conversion")).toMatch(/Classic BattleTech home/);
    expect(wrongFileMessage("pdf", "mtf")).toMatch(/cannot read PDFs/);
  });
});

describe("an Alpha Strike Conversion text from Mordel", () => {
  const read = (text: string) => {
    const result = fromAsConversion(text, NOW, () => "as-1");
    if (!result.ok) throw new Error(result.message);
    return result.unit;
  };

  it("reads a vehicle from its Final lines, with its specials, and credits the unnamed member", () => {
    const unit = read(CRAWLER);
    expect(unit.name).toEqual({ chassis: '"Test" Crawler', model: "" });
    expect(unit.card).toMatchObject({ type: "CV", size: 1, tmm: 2, pv: 14, ov: 0, armor: 3, structure: 2, move: [{ inches: 12, mode: "w" }], role: null });
    expect(unit.card.damage).toEqual({ s: { value: 2 }, m: { value: 1 }, l: { value: 0, minimal: true } });
    expect(unit.card.specials.map((s) => s.raw)).toEqual(["SRCH", "IF1"]);
    expect(unit.techBase).toBe("inner-sphere");
    expect(unit.source).toMatchObject({ kind: "mordel", at: NOW });
    expect(unit.source.credit).toContain("Designed by a mordel.net member");
    expect(unit.source.values).toEqual(unit.card);
  });

  it("splits a model code off the name, reads jump movement, overheat and extreme damage, credits the designer the file names, and refuses a text with a Final line missing", () => {
    const unit = read(SPRINTER);
    expect(unit.name).toEqual({ chassis: "Test Sprinter", model: "TSP-2A" });
    expect(unit.card).toMatchObject({ type: "BM", ov: 2, move: [{ inches: 8, mode: "" }, { inches: 6, mode: "j" }] });
    expect(unit.card.damage.e).toEqual({ value: 0 });
    expect(unit.source.credit).toContain("Designed by Test Designer");
    // and a plain message, nothing thrown, when a Final line is missing or the text is not a conversion
    const result = fromAsConversion(CRAWLER.replace(/^Final Point Value.*$/m, ""), NOW, () => "x");
    expect(result).toEqual({ ok: false, message: expect.stringContaining("Point Value") as unknown });
    expect(fromAsConversion("nothing here", NOW, () => "x").ok).toBe(false);
  });
});
