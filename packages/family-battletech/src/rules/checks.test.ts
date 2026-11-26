import { describe, expect, it } from "vitest";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { createCatalog, expand, type EquipmentGroup } from "./catalog";
import { CHECKS, runChecks, type Finding } from "./checks";
import { bipedRecord, lamRecord, mount, quadRecord, tripodRecord } from "./fixtures";
import { editRecord, newRecord, setMyomer, type LocationCode, type MechRecord, type Mount } from "./mech";

// The stub items the fixtures name, a few launchers and guns, and an item that is only weight, beside the real "other" table.
const TM = { book: "TechManual", page: 341 };
const FIXTURE_ITEMS: EquipmentGroup[] = [
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: TM, checked: "page" },
    items: [
      { id: "medium-laser", name: "Medium Laser", tons: 1, slots: 1, availability: [{ from: 2300 }] },
      { id: "ac-10", name: "AC/10", tons: 12, slots: 7, availability: [{ from: 2460 }] },
      { id: "ballast", name: "Ballast", tons: 15, slots: 1, availability: [{ from: 2300 }] },
      { id: "lrm-5-is", name: "LRM 5", tons: 2, slots: 1, availability: [{ from: 2300 }] },
      { id: "machine-gun-is", name: "Machine Gun", tons: 0.5, slots: 1, availability: [{ from: 1950 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: TM, checked: "page", tons: 1, slots: 1 },
    items: [{ id: "ac-10-ammo", name: "AC/10 Ammo", availability: [{ from: 2460 }] }],
  },
  {
    defaults: { kind: "jump-jet", techBase: "inner-sphere", cite: TM, checked: "page", tons: 0.5, slots: 1 },
    items: [{ id: "jump-jet", name: "Jump Jet (fixture)", availability: [{ from: 2471 }] }],
  },
];
const catalog = createCatalog(expand([...FIXTURE_ITEMS, ...OTHER]));

type Edit = (draft: MechRecord) => void;
interface Want {
  level: Finding["level"];
  text: string;
  where?: Finding["where"];
  page?: number;
}
const forCheck = (record: MechRecord, id: string) => runChecks(record, catalog).filter((f) => f.check === id);
const errors = (findings: Finding[]) => findings.filter((f) => f.level === "error");
function expectFinding(found: Finding[], want: Want) {
  const hit = found.find((f) => f.level === want.level && f.message.includes(want.text));
  expect(hit, `no ${want.level} containing "${want.text}" in ${JSON.stringify(found.map((f) => f.message))}`).toBeDefined();
  if (want.where) expect(hit?.where).toMatchObject(want.where);
  if (want.page !== undefined) expect(hit?.cite?.page).toBe(want.page);
}
type Row = [name: string, edit: Edit, want: Want, base?: MechRecord];
const at = (d: MechRecord, id: string) => d.mounts.find((m) => m.id === id);
const tsm = (d: MechRecord, count: number) => {
  for (let i = 0; i < count; i++) d.mounts.push(mount(`tsm-${i}`, "tsm-is", "LT", 1 + i));
};

describe("the shared fixtures", () => {
  it.each([
    ["biped", bipedRecord()],
    ["quad", quadRecord()],
    ["tripod", tripodRecord()],
  ])("the %s is legal: no error findings, and the checks run in order", (_name, record) => {
    expect(errors(runChecks(record, catalog))).toEqual([]);
    expect(CHECKS.map((c) => c.id)).toEqual(["weight", "slots", "armor", "engine", "heat-sinks", "jump", "placement", "availability", "level", "configuration", "unit-type", "unmatched", "parts", "era", "shields", "lam", "unsupported", "omni", "frankenmech", "arms", "pairing", "artemis", "myomer", "stealth", "patchwork", "aes", "clan-case", "split"]);
  });

  it("starts a new tripod with a level error at Standard, citing the page that makes it Advanced, and none at Advanced", () => {
    const options = { chassis: "Digger", model: "", tons: 55, walk: 5, techBase: "inner-sphere", configuration: "tripod", year: null } as const;
    const standard = runChecks(newRecord(options, "total-warfare", "t-1"), catalog);
    expectFinding(standard.filter((f) => f.check === "level"), { level: "error", text: "Tripod (configuration) is Advanced level; this unit is built at Standard level", where: { field: "configuration" }, page: 158 });
    expect(runChecks(newRecord({ ...options, rulesLevel: "advanced" }, "total-warfare", "t-2"), catalog).filter((f) => f.check === "level")).toEqual([]);
  });
});

describe("weight", () => {
  it.each<Row>([
    ["over the tonnage", (d) => void d.mounts.push(mount("b", "ballast", "CT", 11)), { level: "error", text: "55 tons, over the 50 tons", where: { field: "tons" }, page: 46 }],
    ["under the tonnage", () => undefined, { level: "warning", text: "10 tons is unused", page: 46 }],
    ["a tonnage the book does not allow", (d) => void (d.tons = 52), { level: "error", text: "52 is not allowed", where: { field: "tons" }, page: 46 }],
  ])("%s", (_name, edit, want) => {
    expectFinding(forCheck(editRecord(bipedRecord(), edit), "weight"), want);
  });
  it("says it could not total, never ok, when a mount is unknown", () => {
    const unknown = editRecord(bipedRecord(), (d) => void d.mounts.push(mount("x", null, "CT", 11)));
    expectFinding(forCheck(unknown, "weight"), { level: "note", text: "could not be worked out; not known: x" });
    expect(forCheck(unknown, "weight").some((f) => f.level !== "note")).toBe(false);
    expectFinding(forCheck(unknown, "unmatched"), { level: "note", text: "x is not in our equipment table", where: { mountId: "x" } });
  });
});

describe("slots", () => {
  it("reports each conflicting item, an overflow, an unplaced mount and missing structure slots", () => {
    const broken = editRecord(bipedRecord(), (d) => {
      d.chassis.structure = "endo-steel";
      const laser = at(d, "laser-l");
      if (laser) laser.slot = 0; // the shoulder
      const ac = at(d, "ac");
      if (ac) ac.slot = 10; // 7 slots from slot 10 of 12
      const ammo = at(d, "ammo");
      if (ammo) ammo.location = null;
      d.mounts.push(mount("clash", "medium-laser", "RA", 4), mount("clash-2", "medium-laser", "RA", 4));
    });
    const found = forCheck(broken, "slots");
    expect(found.every((f) => f.level === "error" && f.cite)).toBe(true);
    expectFinding(found, { level: "error", text: "laser-l shares slot 1 of the Left Arm with Shoulder", where: { location: "LA", mountId: "laser-l" } });
    expectFinding(found, { level: "error", text: "clash shares slot 5 of the Right Arm with", where: { mountId: "clash" } });
    expectFinding(found, { level: "error", text: "clash-2 shares slot 5 of the Right Arm", where: { mountId: "clash-2" } });
    expectFinding(found, { level: "error", text: "ac runs past the end of the Right Torso from slot 11", where: { location: "RT", mountId: "ac" } });
    expectFinding(found, { level: "error", text: "ammo has no location", where: { mountId: "ammo" } });
    expectFinding(found, { level: "error", text: "Endo Steel structure takes 14 critical slots; the record places 0", where: { field: "chassis.structure" }, page: 47 });

    // Stealth armor: two slots in each arm, leg and side torso and none elsewhere, one count per location.
    const stealth = editRecord(bipedRecord(), (d) => {
      d.chassis.armorType = "stealth";
      d.mounts = (["CT", "CT", "LA", "LA", "RA", "RA", "LT", "LT", "RT", "RT", "LL", "LL"] as const).map((loc, i) => ({
        ...mount(`stealth-${i}`, null, loc, loc === "CT" ? 10 + i : 4 + (i % 2)),
        part: "armor" as const,
      }));
      for (const m of d.mounts.filter((x) => x.location === "LT" || x.location === "RT")) m.slot = m.id.endsWith("6") || m.id.endsWith("8") ? 0 : 1;
    });
    const stealthFound = forCheck(stealth, "slots");
    expectFinding(stealthFound, { level: "error", text: "Stealth armor takes 0 slots in the Center Torso; the record places 2", where: { location: "CT" }, page: 56 });
    expectFinding(stealthFound, { level: "error", text: "Stealth armor takes 2 slots in the Right Leg; the record places 0", where: { location: "RL" } });
    expect(stealthFound.filter((f) => f.message.includes("Left Arm"))).toEqual([]);
  });
});

describe("armor", () => {
  it.each<Row>([
    ["a limb over its maximum", (d) => void (d.armor.LA = { front: 22 }), { level: "error", text: "Left Arm armor is 22; the most it can carry is 16.", where: { location: "LA", field: "armor.LA" }, page: 54 }],
    ["a torso over its maximum counts front and rear", (d) => void (d.armor.CT = { front: 30, rear: 10 }), { level: "error", text: "(30 front, 10 rear); the most it can carry is 32", where: { location: "CT" } }],
    ["the head over 9", (d) => void (d.armor.HD = { front: 10 }), { level: "error", text: "Head armor is 10; the most it can carry is 9", page: 54 }],
    ["negative points", (d) => void (d.armor.LA = { front: -3 }), { level: "error", text: "front armor is -3", where: { field: "armor.LA" } }],
    ["a tonnage the structure table lacks gives one note, not location errors", (d) => void (d.tons = 52), { level: "note", text: "Armor limits are unknown: 52 tons", where: { field: "tons" } }],
    ["a location the configuration lacks", (d) => void (d.armor.LA = { front: 4 }), { level: "error", text: "This quad has no Left Arm", where: { location: "LA", field: "armor.LA" } }, quadRecord()],
    ["the tonnage the points need", () => undefined, { level: "note", text: "need 5 tons of Standard armor", where: { field: "chassis.armorType" }, page: 55 }],
  ])("%s", (name, edit, want, base) => {
    const found = forCheck(editRecord(base ?? bipedRecord(), edit), "armor");
    expectFinding(found, want);
    if (name.startsWith("a tonnage")) expect(errors(found)).toEqual([]);
  });
});

describe("engine", () => {
  it.each<Row>([
    ["a rating giving a fractional walking speed", (d) => void (d.chassis.engine.rating = 205), { level: "error", text: "walking speed of 4.1; it must be a whole number", where: { field: "chassis.engine" }, page: 48 }],
    ["a rating not in the engine table", (d) => void (d.chassis.engine.rating = 202), { level: "error", text: "rated 202 is not in the engine table", page: 49 }],
    ["an unknown type", (d) => void (d.chassis.engine.type = "gas-turbine"), { level: "error", text: '"gas-turbine" is not one we know', page: 50 }],
    ["an unknown type also notes the weight was not checked", (d) => void (d.chassis.engine.type = "gas-turbine"), { level: "note", text: "weight could not be checked" }],
    ["a rating that is not a number", (d) => void (d.chassis.engine.rating = Number.NaN), { level: "error", text: "rating is (not a number); it must be a positive number", where: { field: "chassis.engine" } }],
    ["a tonnage of zero", (d) => void (d.tons = 0), { level: "error", text: "The tonnage is 0", where: { field: "tons" } }],
  ])("%s", (_name, edit, want) => {
    expectFinding(forCheck(editRecord(bipedRecord(), edit), "engine"), want);
  });
});

describe("heat-sinks", () => {
  const sinkless: Edit = (d) => void (d.mounts = d.mounts.filter((m) => !m.id.startsWith("hs-")));
  it.each<Row>([
    ["below the ten the engine provides", (d) => void (d.chassis.heatSinks.count = 8), { level: "error", text: "at least the 10 heat sinks its engine provides", page: 53 }],
    ["placed sinks plus engine-held do not make the count", sinkless, { level: "error", text: "0 heat sinks are placed and the engine can hold 8, which makes 8; the chassis lists 10", page: 53 }],
    ["a count that is not a number", (d) => void (d.chassis.heatSinks.count = Number.NaN), { level: "error", text: "count is (not a number)", where: { field: "chassis.heatSinks" } }],
    ["a type that differs from the chassis", (d) => void d.mounts.splice(-1, 1, mount("hs-2", "double-heat-sink-is", "RL", 5)), { level: "error", text: "hs-2 is a Double heat sink, but the chassis uses Single", where: { mountId: "hs-2" }, page: 53 }],
  ])("%s", (_name, edit, want) => {
    expectFinding(forCheck(editRecord(bipedRecord(), edit), "heat-sinks"), want);
  });
});

describe("jump", () => {
  it.each<Row>([
    [
      "more jets than the walking speed",
      (d) => void d.mounts.push(mount("jj-4", "jump-jet", "LT", 5), mount("jj-5", "jump-jet", "RT", 5)),
      { level: "error", text: "5 standard jump jets are mounted; walking speed 4 allows at most 4", where: { mountId: "jj-5" }, page: 51 },
    ],
    ["standard and improved jets mixed", (d) => void d.mounts.push(mount("ijj", "improved-jump-jet-is", "LT", 5)), { level: "error", text: "ijj is an improved jump jet but jj-1 is a standard one", where: { mountId: "ijj" }, page: 51 }],
  ])("%s", (_name, edit, want) => {
    expectFinding(forCheck(editRecord(bipedRecord(), edit), "jump"), want);
  });
});

describe("placement", () => {
  const link = (d: MechRecord, id: string, equipmentId: string, location: LocationCode, slot: number, linkedTo: string) =>
    void d.mounts.push({ ...mount(id, equipmentId, location, slot), linkedTo });
  it.each<Row>([
    ["a location the row forbids", (d) => void d.mounts.push(mount("bl", "bridgelayer-light-is", "CT", 11)), { level: "error", text: "bl cannot be mounted on a biped", where: { location: "CT", mountId: "bl" }, page: 344 }],
    ["the quad rule on a quad", (d) => void d.mounts.push(mount("wb", "wrecking-ball-is", "LT", 8)), { level: "error", text: "wb cannot be mounted on a quad", page: 345 }, quadRecord()],
    [
      "a linked pair split between locations",
      (d) => {
        d.mounts.push(mount("lrm", "lrm-5-is", "LT", 5));
        link(d, "art", "artemis-iv-is", "RT", 5, "lrm");
      },
      { level: "error", text: "art is in the Right Torso but lrm is in the Left Torso; they must share a location", where: { location: "RT", mountId: "art" }, page: 207 },
    ],
    ["a link to itself", (d) => link(d, "art", "artemis-iv-is", "RT", 5, "art"), { level: "error", text: "art is linked to itself", where: { mountId: "art" } }],
    ["a link to a host that is not there", (d) => link(d, "art", "artemis-iv-is", "RT", 5, "gone"), { level: "error", text: "art is linked to a mount that is not on this 'Mech" }],
    ["a link to a host of the wrong type", (d) => link(d, "art", "artemis-iv-is", "LA", 5, "laser-l"), { level: "error", text: "art attaches to a standard LRM, SRM or MML launcher; laser-l is not one", page: 207 }],
    ["a machine gun array with one gun", (d) => void d.mounts.push(mount("mga", "machine-gun-array-is", "CT", 11), mount("mg", "machine-gun-is", "CT", 8)), { level: "error", text: "links two to four machine guns of one size in its own location; the Center Torso has 1", page: 228 }],
    ["Triple-Strength Myomer with too few mounts", (d) => (d.chassis.myomer = "tsm", tsm(d, 5)), { level: "error", text: "must be mounted 6 times; this 'Mech has 5", page: 52 }],
    ["Triple-Strength Myomer named by the chassis and not mounted", (d) => void (d.chassis.myomer = "tsm"), { level: "error", text: "must be mounted 6 times; this 'Mech has 0", where: { field: "chassis.myomer" } }],
    ["Triple-Strength Myomer mounted on a standard myomer chassis", (d) => tsm(d, 6), { level: "error", text: "is mounted, but the chassis myomer is Standard", where: { field: "chassis.myomer" } }],
  ])("%s", (_name, edit, want, base) => {
    expectFinding(forCheck(editRecord(base ?? bipedRecord(), edit), "placement"), want);
  });
});

describe("rear-firing placement (TM p.57)", () => {
  const rearLaser = (location: LocationCode): Edit => (d) => void d.mounts.push({ ...mount("rl", "medium-laser", location, 3), rear: true });
  it("flags a rear-firing weapon in an arm and not one in a side torso", () => {
    expectFinding(forCheck(editRecord(bipedRecord(), rearLaser("LA")), "placement"), { level: "error", text: "rl is set to fire to the rear", where: { location: "LA", mountId: "rl" }, page: 57 });
    expect(forCheck(editRecord(bipedRecord(), rearLaser("LT")), "placement").filter((f) => f.where?.mountId === "rl")).toEqual([]);
  });
});

describe("availability", () => {
  const withDoubleSink: Edit = (d) => {
    d.year = 2900;
    d.mounts.splice(-1, 1, mount("hs-2", "double-heat-sink-is", "RL", 5));
  };
  it.each<Row>([
    ["before the item is introduced", (d) => void (d.year = 2400), { level: "error", text: "ac is not yet introduced in 2400; it first appears in 2460", where: { mountId: "ac" }, page: 290 }],
    ["in the gap between extinction and reintroduction", withDoubleSink, { level: "error", text: "gone after 2865, and not reintroduced until 3040", where: { mountId: "hs-2" }, page: 290 }],
    ["another tech base", (d) => void d.mounts.push({ ...mount("cj", "jump-jet-clan", "LT", 5), techBase: "clan" }), { level: "error", text: "cj is Clan equipment, which an Inner Sphere 'Mech may not use", where: { mountId: "cj" }, page: 57 }],
    [
      "an inferred year is only a note",
      (d) => {
        d.techBase = "mixed";
        d.year = 2400;
        d.mounts = [{ ...mount("cj", "jump-jet-clan", "LT", 5), techBase: "clan" }];
      },
      { level: "note", text: "does not print the year for this tech base" },
    ],
  ])("%s", (_name, edit, want) => {
    expectFinding(forCheck(editRecord(bipedRecord(), edit), "availability"), want);
  });
  it("gives nothing when the year is not known", () => {
    expect(forCheck(editRecord(bipedRecord(), (d) => void (d.year = null)), "availability")).toEqual([]);
  });
});

describe("unmatched", () => {
  it("names a mount and a chassis part the tables do not know", () => {
    const odd = editRecord(bipedRecord(), (d) => {
      d.mounts.push(mount("x", "mystery-box", "CT", 11));
      d.chassis.gyro = "tachyon";
    });
    const found = forCheck(odd, "unmatched");
    expectFinding(found, { level: "note", text: "x is not in our equipment table", where: { mountId: "x" } });
    expectFinding(found, { level: "note", text: 'The gyro "tachyon" is not in our tables', where: { field: "chassis.gyro" } });
  });
});

describe("configuration", () => {
  it("wants the tripod cockpit on a tripod and keeps it off other bodies, citing the construction rules page", () => {
    const onTripod = forCheck(editRecord(tripodRecord(), (d) => void (d.chassis.cockpit = "standard")), "configuration");
    expectFinding(onTripod, { level: "error", text: "must mount the Tripod cockpit", where: { field: "chassis.cockpit" }, page: 159 });
    const onBiped = forCheck(editRecord(bipedRecord(), (d) => void (d.chassis.cockpit = "tripod")), "configuration");
    expectFinding(onBiped, { level: "error", text: "for a tripod only", page: 159 });
  });
});

describe("Land-Air 'Mech", () => {
  const forLam = (edit: Edit) => forCheck(editRecord(lamRecord(), edit), "lam");
  it("is legal as a fixture and says once that it is built under experimental rules, citing the level's page", () => {
    expect(errors(runChecks(lamRecord(), catalog))).toEqual([]);
    expectFinding(forCheck(editRecord(lamRecord(), (d) => void (d.rulesLevel = "standard")), "level"), { level: "error", text: "Land-Air 'Mech (configuration) is Experimental level", page: 100 });
    expect(forCheck(bipedRecord(), "level")).toEqual([]);
  });

  it.each<Row>([
    ["Clan technology", (d) => void (d.techBase = "clan"), { level: "error", text: "Inner Sphere technology only; this one is Clan", where: { field: "techBase" }, page: 108 }],
    ["over 55 tons", (d) => void (d.tons = 60), { level: "error", text: "at most 55 tons; this one is 60 tons", where: { field: "tons" } }],
    ["an XL engine", (d) => void (d.chassis.engine.type = "xl"), { level: "error", text: "standard or compact fusion engine; XL Fusion is not allowed", where: { field: "chassis.engine" } }],
    ["an XL gyro", (d) => void (d.chassis.gyro = "xl"), { level: "error", text: "standard, compact or heavy-duty gyro; XL is not allowed", where: { field: "chassis.gyro" } }],
    ["endo steel structure", (d) => void (d.chassis.structure = "endo-steel"), { level: "error", text: "Endo Steel structure takes critical slots", where: { field: "chassis.structure" } }],
    ["ferro-fibrous armor", (d) => void (d.chassis.armorType = "ferro-fibrous"), { level: "error", text: "Ferro-Fibrous armor takes critical slots", where: { field: "chassis.armorType" } }],
    ["an arm without its lower arm actuator", (d) => void (d.arms = { RA: { lowerArm: false, hand: false } }), { level: "error", text: "both lower arm actuators; the Right Arm has none", where: { location: "RA" } }],
    ["Triple-Strength Myomer in two locations", (d) => void d.mounts.push(mount("t1", "tsm-is", "LT", 3), mount("t2", "tsm-is", "RT", 3)), { level: "error", text: "Triple-Strength Myomer may not be split between locations" }],
  ])("limits: %s", (_name, edit, want) => {
    expectFinding(forLam(edit), want);
  });

  it("starts from newRecord with the three jump jets it needs, waiting unplaced, and breaks no Land-Air rule", () => {
    const fresh = newRecord({ chassis: "Hawk", model: "", tons: 50, walk: 4, techBase: "inner-sphere", configuration: "lam", year: null }, "total-warfare", "new-lam");
    expect(fresh.mounts.filter((m) => m.equipmentId === "jump-jet-is").map((m) => [m.location, m.slot])).toEqual([[null, null], [null, null], [null, null]]);
    expect(runChecks(fresh, catalog).filter((f) => f.check === "lam" || f.where?.field === "configuration")).toMatchObject([{ check: "level", level: "error" }]);
  });

  it("needs three jump jets and says how many it has", () => {
    expect(forLam(() => undefined)).toEqual([]);
    expectFinding(forLam((d) => void (d.mounts = d.mounts.filter((m) => m.id !== "jj-3"))), { level: "error", text: "at least 3 jump jets; this one has 2", page: 108 });
  });

  it("names each barred item on the mount and leaves a biped with the same items alone", () => {
    const add: Edit = (d) => void d.mounts.push(mount("bh", "backhoe-is", "LA", 5), mount("hg", "heavy-gauss-rifle-is", "LT", 3));
    const found = forLam(add);
    expectFinding(found, { level: "error", text: "bh cannot be mounted on a Land-Air 'Mech: it interferes with conversion", where: { mountId: "bh" }, page: 108 });
    expectFinding(found, { level: "error", text: "hg cannot be mounted on a Land-Air 'Mech: it needs a Piloting skill roll", where: { mountId: "hg" } });
    expect(forCheck(editRecord(bipedRecord(), add), "lam")).toEqual([]);
  });
});

describe("unsupported", () => {
  it("gives one note for a hexapod, and nothing from the checks that read the layout", () => {
    const tripod = editRecord(bipedRecord(), (d) => void (d.configuration = "hexapod"));
    const findings = runChecks(tripod, catalog);
    expect(findings.filter((f) => f.check === "unsupported")).toMatchObject([{ level: "note", message: expect.stringContaining("hexapod") }]);
    expect(findings.filter((f) => ["slots", "placement"].includes(f.check))).toEqual([]);
    expect(findings.filter((f) => f.check === "weight")).toMatchObject([{ level: "note", message: expect.stringMatching(/not checked for the hexapod.*for information only/) }]);
    expect(findings.find((f) => f.check === "unsupported")?.message).toContain("weight");
  });
});

describe("hostile records", () => {
  const unknownCode = (d: MechRecord) => {
    (d.armor as Record<string, { front: number }>)["ZZ"] = { front: 5 };
    d.mounts.push({ ...mount("odd", "backhoe-is", "LA", 5), location: "ZZ" as LocationCode });
  };
  it.each<[string, Edit]>([
    ["zero tonnage", (d) => void (d.tons = 0)],
    ["an infinite tonnage", (d) => void (d.tons = Number.POSITIVE_INFINITY)],
    ["a NaN engine rating", (d) => void (d.chassis.engine.rating = Number.NaN)],
    ["unknown location codes on armor and a mount", unknownCode],
    ["a mount linked to itself", (d) => void (d.mounts[0] = { ...mount("ac", "ac-10", "RT", 0), linkedTo: "ac" })],
    ["negative and NaN armor", (d) => void (d.armor.LA = { front: -4, rear: Number.NaN })],
    ["a NaN slot and a NaN heat sink count", (d) => ((d.chassis.heatSinks.count = Number.NaN), void (d.mounts[0] = { ...mount("ac", "ac-10", "RT", Number.NaN) }))],
  ])("%s: the checks run and no message shows NaN, undefined, null or Infinity", (_name, edit) => {
    const findings = runChecks(editRecord(bipedRecord(), edit), catalog);
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.message).not.toMatch(/NaN|undefined|null|Infinity/);
  });
});

describe("runChecks", () => {
  it.each([
    ["a check that throws", { ...catalog, available: () => { throw new Error("boom"); } }, "availability", "The availability check could not be completed"],
    ["a layout that cannot be built", { ...catalog, factsOf: () => { throw new Error("boom"); } }, "unsupported", "layout could not be worked out"],
  ])("reports %s as a plain note and still runs the rest", (_name, broken, id, text) => {
    const findings = runChecks(bipedRecord(), broken);
    expectFinding(findings.filter((f) => f.check === id), { level: "note", text });
    expect(findings.some((f) => f.message.includes("boom"))).toBe(false);
    expect(findings.some((f) => f.check === "engine" || f.check === "armor")).toBe(true);
  });
});

describe("arm, tool and pairing checks", () => {
  const withMounts = (...items: [id: string, equipmentId: string, location: LocationCode][]) => (d: MechRecord) => void d.mounts.push(...items.map(([id, equipmentId, location], i) => mount(id, equipmentId, location, 6 + i)));
  const noHand = { lowerArm: true, hand: false };
  const real = createCatalog(expand([...OTHER, ...WEAPONS]));
  const arms = (check: string, edit: Edit) => runChecks(editRecord(bipedRecord(), edit), real).filter((f) => f.check === check);

  it("a hatchet needs the hand actuator, and an arm holds only one", () => {
    expectFinding(arms("arms", (d) => (withMounts(["h", "hatchet-is", "LA"])(d), (d.arms = { LA: noHand }))), { level: "error", text: "needs the full set of arm actuators", where: { location: "LA", mountId: "h" }, page: 220 });
    expect(arms("arms", withMounts(["h", "hatchet-is", "LA"]))).toEqual([]);
  });
  it("two hatchets in one arm are one too many", () => {
    expectFinding(arms("arms", withMounts(["h1", "hatchet-is", "RA"], ["h2", "hatchet-is", "RA"])), { level: "error", text: "more than one Hatchet", where: { mountId: "h2" }, page: 220 });
  });
  it("a tool wants the hand removed, and the pile driver the lower arm too", () => {
    expectFinding(arms("arms", withMounts(["b", "backhoe-is", "LA"])), { level: "error", text: "remove the hand actuator", where: { mountId: "b" }, page: 241 });
    expect(arms("arms", (d) => (withMounts(["b", "backhoe-is", "LA"])(d), (d.arms = { LA: noHand })))).toEqual([]);
    expectFinding(arms("arms", (d) => (withMounts(["p", "heavy-duty-pile-driver-is", "LA"])(d), (d.arms = { LA: noHand }))), { level: "error", text: "remove both actuators", page: 244 });
  });
  it("two different tools in one arm are refused, and the salvage arm excludes the rest", () => {
    const off = { LA: { lowerArm: true, hand: false } };
    expectFinding(arms("arms", (d) => (withMounts(["b", "backhoe-is", "LA"], ["c", "chainsaw-is", "LA"])(d), (d.arms = off))), { level: "error", text: "only one kind of industrial tool", where: { location: "LA", mountId: "c" } });
    expectFinding(arms("arms", (d) => (withMounts(["s", "salvage-arm-is", "LA"], ["r", "rock-cutter-is", "LA"])(d), (d.arms = off))), { level: "error", text: "salvage arm excludes all the others" });
  });
  it("a third lift hoist is refused", () => {
    expectFinding(arms("pairing", withMounts(["a", "lift-hoist-is", "LA"], ["b", "lift-hoist-is", "RA"], ["c", "lift-hoist-is", "LT"])), { level: "error", text: "3 lift hoists", where: { mountId: "c" }, page: 245 });
    expect(arms("pairing", withMounts(["a", "lift-hoist-is", "LA"], ["b", "lift-hoist-is", "RA"]))).toEqual([]);
  });
  it("an extended fuel tank outside the torso and an ejection seat outside the head are refused", () => {
    const placed = arms("placement", withMounts(["t", "extended-fuel-tank-is", "LA"], ["e", "ejection-seat-is", "CT"]));
    expectFinding(placed, { level: "error", text: "t cannot go in the Left Arm", where: { mountId: "t" } });
    expectFinding(placed, { level: "error", text: "e cannot go in the Center Torso", where: { mountId: "e" } });
  });
  it("C3 together with C3i is refused", () => {
    expectFinding(arms("pairing", withMounts(["m", "c3-computer-master-is", "LT"], ["i", "improved-c3-computer-is", "RT"])), { level: "error", text: "C3 and C3i are incompatible", where: { mountId: "i" }, page: 209 });
  });
  it("a heavy Gauss rifle needs a fusion or fission engine", () => {
    const gauss = withMounts(["g", "heavy-gauss-rifle-is", "LT"]);
    expectFinding(arms("pairing", (d) => (gauss(d), (d.chassis.engine.type = "ice"))), { level: "error", text: "needs a fusion or fission engine", page: 219 });
    expect(arms("pairing", gauss)).toEqual([]);
  });
});

describe("myomer, stealth and Artemis rules", () => {
  const stealthFindings = (d: MechRecord) => runChecks(d, catalog).filter((f) => f.message.includes("Stealth"));

  it("choosing MASC as the myomer adds one unplaced MASC of 5 percent of the tonnage in tons and slots, and standard takes it away again", () => {
    const masc = editRecord(bipedRecord(), (d) => void setMyomer(d, "masc", catalog));
    const added = masc.mounts.filter((m) => m.equipmentId === "masc-is");
    expect(added).toHaveLength(1);
    expect(catalog.factsOf(added[0] as Mount, masc)).toMatchObject({ tons: 3, slots: 3 });
    expect(forCheck(masc, "placement")).toEqual([]);
    expect(editRecord(masc, (d) => void setMyomer(d, "standard", catalog)).mounts.some((m) => m.equipmentId === "masc-is")).toBe(false);
  });

  it("MASC together with Triple-Strength Myomer is an error, from the mounts or the chassis", () => {
    const both = editRecord(bipedRecord(), (d) => {
      d.chassis.myomer = "tsm";
      tsm(d, 6);
      d.mounts.push(mount("masc", "masc-is", "RT", 0));
    });
    expectFinding(forCheck(both, "myomer"), { level: "error", text: "MASC and Triple-Strength Myomer cannot be on the same", page: 52 });
    expect(forCheck(editRecord(both, (d) => void (d.mounts = d.mounts.filter((m) => m.id !== "masc"))), "myomer")).toEqual([]);
  });

  it("stealth armor needs a Guardian ECM Suite", () => {
    const bare = editRecord(bipedRecord(), (d) => void (d.chassis.armorType = "stealth"));
    expectFinding(forCheck(bare, "stealth"), { level: "error", text: "needs a Guardian ECM Suite", where: { field: "chassis.armorType" }, page: 213 });
    expect(forCheck(editRecord(bare, (d) => void d.mounts.push(mount("ecm", "guardian-ecm-suite-is", "HD", 0))), "stealth")).toEqual([]);
  });

  it("stealth armor is Inner Sphere only and not before its prototype year", () => {
    const stealth = (techBase: MechRecord["techBase"], year: number) => editRecord(bipedRecord(), (d) => ((d.chassis.armorType = "stealth"), (d.techBase = techBase), (d.year = year)));
    expect(stealthFindings(stealth("inner-sphere", 3070)).filter((f) => f.level === "error" && f.check !== "slots" && f.check !== "stealth")).toEqual([]);
    expect(stealthFindings(stealth("clan", 3070)).some((f) => f.level === "error" && /Clan|Inner Sphere/.test(f.message))).toBe(true);
    expect(stealthFindings(stealth("inner-sphere", 3040)).some((f) => f.level === "error" && f.message.includes("3051"))).toBe(true);
  });

  it("a standard 'Mech with Artemis on one of two LRMs is an error naming the bare launcher", () => {
    const base = editRecord(bipedRecord(), (d) => void d.mounts.push(mount("l1", "lrm-5-is", "LT", 0), mount("l2", "lrm-5-is", "RT", 0), mount("a1", "artemis-iv-is", "LT", 1)));
    expectFinding(forCheck(base, "artemis"), { level: "error", text: "LRM", where: { mountId: "l2" }, page: 207 });
    expect(forCheck(editRecord(base, (d) => void d.mounts.push(mount("a2", "artemis-iv-is", "RT", 1))), "artemis")).toEqual([]);
  });
});
