import { describe, expect, it } from "vitest";
import { RULES_LEVELS } from "../data/chassis";
import type { RulesLevel } from "../data/chassis";
import { OTHER } from "../data/equipment/other";
import { createCatalog, expand, loadCatalog } from "./catalog";
import type { EquipmentGroup, EquipmentRow } from "./catalog";
import { runChecks } from "./checks";
import { bipedRecord, mount, tripodRecord } from "./fixtures";
import { equipmentLevel, levelAtLeast, levelOf, lowestLevelFor, techBaseChoices, withLevel } from "./levels";
import { editRecord } from "./mech";
import type { MechRecord } from "./mech";

const TM = { book: "TechManual", page: 341 };
const STUBS: EquipmentGroup[] = [
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: TM, checked: "page" },
    items: [
      { id: "medium-laser", name: "Medium Laser", tons: 1, slots: 1, availability: [{ from: 2300 }] },
      { id: "ac-10", name: "AC/10", tons: 12, slots: 7, availability: [{ from: 2460 }] },
      { id: "late-gun", name: "Late Gun", tons: 1, slots: 1, availability: [{ from: 3050 }] },
      { id: "prototype", name: "Prototype Gun", tons: 1, slots: 1, availability: [{ from: 3050 }], rulesLevel: "experimental", cite: { book: "Tactical Operations: Advanced Units and Equipment", page: 330 } },
    ],
  },
  { defaults: { kind: "ammunition", techBase: "inner-sphere", cite: TM, checked: "page", tons: 1, slots: 1 }, items: [{ id: "ac-10-ammo", name: "AC/10 Ammo", availability: [{ from: 2460 }] }] },
  { defaults: { kind: "jump-jet", techBase: "inner-sphere", cite: TM, checked: "page", tons: 0.5, slots: 1 }, items: [{ id: "jump-jet", name: "Jump Jet (stub)", availability: [{ from: 2471 }] }] },
];
const catalog = createCatalog(expand([...STUBS, ...OTHER]));
const row = (id: string): EquipmentRow => catalog.byId(id) as EquipmentRow;
const withMount = (id: string) => (d: MechRecord) => void d.mounts.push(mount("extra", id, "CT", 8));

describe("rules levels", () => {
  it("are seven, in order; the four published ones carry a page and the other three do not", () => {
    expect(RULES_LEVELS.map((l) => [l.id, l.cite !== undefined])).toEqual([
      ["introductory", true],
      ["standard", true],
      ["advanced", true],
      ["experimental", true],
      ["licensed-noncanon", false],
      ["fan-made", false],
      ["unlimited", false],
    ]);
  });

  it.each<[RulesLevel, RulesLevel, boolean]>([
    ["standard", "introductory", true],
    ["standard", "standard", true],
    ["introductory", "standard", false],
    ["advanced", "experimental", false],
    ["fan-made", "licensed-noncanon", true],
    ["unlimited", "fan-made", true],
    ["experimental", "unlimited", false],
  ])("%s includes %s: %s", (a, b, expected) => {
    expect(levelAtLeast(a, b)).toBe(expected);
  });

  it("reads a row with no level as Standard, and derives Introductory from the year and tech base", () => {
    expect(levelOf({})).toBe("standard");
    expect([row("medium-laser"), row("late-gun"), row("prototype"), row("double-heat-sink-is")].map(equipmentLevel)).toEqual(["introductory", "standard", "experimental", "standard"]);
  });

  it.each<[string, MechRecord, RulesLevel]>([
    ["a plain biped", bipedRecord(), "introductory"],
    ["a tripod", tripodRecord(), "advanced"],
    ["a biped with an experimental item", editRecord(bipedRecord(), withMount("prototype")), "experimental"],
    ["a biped with a Standard item", editRecord(bipedRecord(), withMount("late-gun")), "standard"],
    ["a Clan record", bipedRecord({ techBase: "clan" }), "standard"],
    ["a mixed record in its production years", bipedRecord({ techBase: "mixed", year: 3085 }), "advanced"],
    ["a mixed record in its prototype years", bipedRecord({ techBase: "mixed", year: 3060 }), "experimental"],
    ["a biped with an endo steel structure", editRecord(bipedRecord(), (d) => void (d.chassis.structure = "endo-steel")), "standard"],
  ])("finds the lowest level for %s", (_name, record, expected) => {
    expect(lowestLevelFor(record, catalog)).toBe(expected);
  });

  it("gives an old record the lowest level that fits and leaves one that has a level alone", () => {
    const old = tripodRecord();
    expect(old.rulesLevel).toBeUndefined();
    expect(withLevel(old, catalog)).toEqual({ ...old, rulesLevel: "advanced" });
    const chosen = bipedRecord({ rulesLevel: "unlimited" });
    expect(withLevel(chosen, catalog)).toBe(chosen);
  });
});

describe("chassis part levels", () => {
  it("takes a part row's own level: hardened armor lifts the unit to Experimental in the level finding", () => {
    const record = editRecord(bipedRecord({ rulesLevel: "standard" }), (d) => void (d.chassis.armorType = "hardened"));
    expect(lowestLevelFor(record, catalog)).toBe("experimental");
    const found = runChecks(record, catalog).filter((f) => f.check === "level");
    expect(found.map((f) => f.message)).toEqual([expect.stringContaining("Hardened (armor) is Experimental level; this unit is built at Standard level")]);
    expect(found[0]?.where).toMatchObject({ field: "chassis.armorType" });
  });
});

describe("the level check", () => {
  const levelFindings = (record: MechRecord) => runChecks(record, catalog).filter((f) => f.check === "level");

  it("names an item above the unit's level with its page and the level it needs, and stops when the level is raised", () => {
    const record = editRecord(bipedRecord({ rulesLevel: "standard" }), withMount("prototype"));
    const [finding, ...rest] = levelFindings(record);
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ level: "error", where: { mountId: "extra" }, cite: { page: 330 } });
    expect(finding?.message).toContain("Prototype Gun (equipment) is Experimental level; this unit is built at Standard level. It needs Experimental or higher.");
    expect(levelFindings({ ...record, rulesLevel: "experimental" })).toEqual([]);
  });

  it("holds Introductory to 3025 technology", () => {
    const names = levelFindings(editRecord(bipedRecord({ rulesLevel: "introductory" }), (d) => void (d.chassis.heatSinks.type = "double"))).map((f) => f.message);
    expect(names).toEqual([expect.stringContaining("Double (heat sink) is Standard level")]);
  });

  it("downgrades every error to a warning at Unlimited, where nothing is above the level", () => {
    const record = editRecord(bipedRecord({ rulesLevel: "standard" }), (d) => {
      withMount("prototype")(d);
      d.armor.HD = { front: 12 };
    });
    expect(runChecks(record, catalog).filter((f) => f.level === "error").map((f) => f.check)).toEqual(expect.arrayContaining(["armor", "level"]));
    const unlimited = runChecks({ ...record, rulesLevel: "unlimited" }, catalog);
    expect(unlimited.filter((f) => f.level === "error")).toEqual([]);
    expect(unlimited.filter((f) => f.check === "level")).toEqual([]);
    expect(unlimited.filter((f) => f.check === "armor" && f.level !== "note").map((f) => f.level)).toEqual(["warning"]);
  });
});

describe("the Introductory level against the Quick-Start record sheets", () => {
  it("holds every weapon and the jump jets the Griffin and Wolverine sheets print", async () => {
    const real = await loadCatalog();
    const printed = ["Medium Laser", "SRM 6", "Autocannon/5", "LRM 10", "PPC", "Jump Jet", "LRM 10 Ammo", "SRM 6 Ammo"];
    const found = printed.map((name) => real.match(name, "inner-sphere"));
    expect(printed.filter((_, i) => !found[i])).toEqual([]);
    expect(found.map((r) => r && equipmentLevel(r))).toEqual(printed.map(() => "introductory"));
  });
});

describe("tech base choices", () => {
  it("offers only Inner Sphere at Introductory, and keeps a current choice so the selector never blanks", () => {
    expect(techBaseChoices("introductory", "inner-sphere", { year: 3085 }).map(([v]) => v)).toEqual(["inner-sphere"]);
    expect(techBaseChoices("introductory", "clan", { year: 3085 }).map(([v]) => v)).toEqual(["inner-sphere", "clan"]);
    expect(techBaseChoices(undefined, "inner-sphere", { year: 3085 }).map(([v]) => v)).toEqual(["inner-sphere", "clan"]);
  });

  it("hides Clan before the Clan Sub-Eras (2800, IO:AE p.17), keeps a current Clan record's choice, and reports it with the page", () => {
    const offered = (year: number | null, era?: string, current = "inner-sphere") => techBaseChoices("standard", current, { year, era }).some(([v]) => v === "clan");
    expect([offered(2799), offered(2800), offered(null), offered(null, "star-league"), offered(null, "early-succession-war"), offered(2400, undefined, "clan")]).toEqual([false, true, true, false, true, true]);
    const found = runChecks(bipedRecord({ techBase: "clan", year: 2400 }), catalog).filter((f) => f.message.startsWith("Clan technology is not available"));
    expect(found).toHaveLength(1);
    expect(found[0]?.cite).toMatchObject({ page: 17 });
  });

  it("hides Mixed until its level and time: Advanced from production, Experimental from the prototype year, never before it; the current one stays", () => {
    const offered = (level: RulesLevel, year: number | null, current = "inner-sphere") => techBaseChoices(level, current, { year }).some(([v]) => v === "mixed");
    expect([offered("standard", 3085), offered("advanced", 3085), offered("advanced", null), offered("advanced", 3060), offered("experimental", 3060), offered("unlimited", 2830), offered("experimental", 2819), offered("standard", 3085, "mixed")]).toEqual([
      false, true, true, false, true, true, false, true,
    ]);
  });

  it("reports mixed technology before its first prototype year, with the page", () => {
    const found = runChecks(bipedRecord({ techBase: "mixed", year: 2800, rulesLevel: "advanced" }), catalog).filter((f) => f.message.startsWith("Mixed technology is not available"));
    expect(found).toHaveLength(1);
    expect(found[0]?.cite).toMatchObject({ page: 45 });
  });
});
