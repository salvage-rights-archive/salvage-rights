import { describe, expect, it } from "vitest";
import { OTHER } from "../data/equipment/other";
import { createCatalog, expand, type EquipmentGroup } from "./catalog";
import { CHECKS, runChecks, type Finding } from "./checks";
import { bipedRecord, mount, quadRecord } from "./fixtures";
import { editRecord, type MechRecord } from "./mech";

// The stub items the fixtures name, plus a few launchers and an item that is only weight, beside the real "other" table.
const TM = { book: "TechManual", page: 341 };
const FIXTURE_ITEMS: EquipmentGroup[] = [
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: TM, checked: "page" },
    items: [
      { id: "medium-laser", name: "Medium Laser", tons: 1, slots: 1, availability: [{ from: 2300 }] },
      { id: "ac-10", name: "AC/10", tons: 12, slots: 7, availability: [{ from: 2460 }] },
      { id: "ballast", name: "Ballast", tons: 15, slots: 1, availability: [{ from: 2300 }] },
      { id: "lrm-5-is", name: "LRM 5", tons: 2, slots: 1, availability: [{ from: 2300 }] },
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

/** The fixture biped with the two heat sinks its 200 engine cannot hold: nothing in it breaks a rule. */
const legal = editRecord(bipedRecord(), (d) => {
  d.mounts.push(mount("hs-1", "heat-sink-is", "LL", 5), mount("hs-2", "heat-sink-is", "RL", 5));
});
const forCheck = (record: MechRecord, id: string) => runChecks(record, catalog).filter((f) => f.check === id);
const errors = (findings: Finding[]) => findings.filter((f) => f.level === "error");

describe("the legal fixture", () => {
  it("has no error findings; unused tonnage is only a warning", () => {
    const findings = runChecks(legal, catalog);
    expect(errors(findings)).toEqual([]);
    expect(forCheck(legal, "weight")).toMatchObject([{ level: "warning" }]);
  });
  it("runs the ten checks in the stated order", () => {
    expect(CHECKS.map((c) => c.id)).toEqual(["weight", "slots", "armor", "engine", "heat-sinks", "jump", "placement", "availability", "unmatched", "unsupported"]);
  });
});

describe("weight", () => {
  it("is an error over the tonnage, with both numbers", () => {
    const heavy = editRecord(legal, (d) => void d.mounts.push(mount("b", "ballast", "CT", 11)));
    const [f] = forCheck(heavy, "weight");
    expect(f).toMatchObject({ level: "error", cite: { book: "TechManual", page: 46 } });
    expect(f?.message).toContain("55");
    expect(f?.message).toContain("50");
  });
  it("says it could not total, never ok, when a mount is unknown", () => {
    const unknown = editRecord(legal, (d) => void d.mounts.push(mount("x", null, "CT", 11)));
    expect(forCheck(unknown, "weight")).toMatchObject([{ level: "note", message: expect.stringContaining("could not be worked out") }]);
    expect(forCheck(unknown, "unmatched")).toMatchObject([{ level: "note", where: { mountId: "x" } }]);
  });
});

describe("slots", () => {
  it("reports a conflict, an overflow, an unplaced mount and missing structure slots", () => {
    const broken = editRecord(legal, (d) => {
      d.chassis.structure = "endo-steel";
      const at = (id: string) => d.mounts.find((m) => m.id === id);
      const laser = at("laser-l");
      if (laser) laser.slot = 0; // the shoulder
      const ac = at("ac");
      if (ac) ac.slot = 10; // 7 slots from slot 10 of 12
      const ammo = at("ammo");
      if (ammo) ammo.location = null;
    });
    const found = forCheck(broken, "slots");
    expect(found.every((f) => f.level === "error" && f.cite)).toBe(true);
    const messages = found.map((f) => f.message).join("\n");
    expect(messages).toContain("laser-l and Shoulder both use slot 1 of the Left Arm");
    expect(messages).toContain("ac runs past the end of the Right Torso from slot 11");
    expect(messages).toContain("ammo has no location");
    expect(messages).toContain("takes 14 critical slots; the record places 0");
    expect(found.find((f) => f.message.startsWith("laser-l"))?.where).toMatchObject({ location: "LA" });
  });
});

describe("armor", () => {
  it("is an error over a location's maximum, and a note gives the tonnage the points need", () => {
    const over = editRecord(legal, (d) => void (d.armor.LA = { front: 22 }));
    const found = forCheck(over, "armor");
    expect(found.find((f) => f.level === "error")).toMatchObject({
      where: { location: "LA" },
      message: "Left Arm armor is 22; the most it can carry is 16.",
      cite: { page: 54 },
    });
    expect(found.find((f) => f.level === "note")?.message).toMatch(/need \d+(\.5)? tons of standard armor/);
  });
});

describe("engine", () => {
  it.each([
    ["a rating that gives a fractional walking speed", 205, "must be a whole number", 48],
    ["a rating not in the engine table", 202, "not in the engine table", 49],
  ])("is an error for %s", (_name, rating, text, page) => {
    const bad = editRecord(legal, (d) => void (d.chassis.engine.rating = rating));
    const found = forCheck(bad, "engine").filter((f) => f.level === "error");
    expect(found.some((f) => f.message.includes(text) && f.cite?.page === page)).toBe(true);
    expect(found.every((f) => f.where?.field === "chassis.engine")).toBe(true);
  });
  it("is an error for an unknown type, with a note that weight was not checked", () => {
    const bad = editRecord(legal, (d) => void (d.chassis.engine.type = "gas-turbine"));
    expect(forCheck(bad, "engine").map((f) => f.level)).toEqual(["error", "note"]);
  });
});

describe("heat-sinks", () => {
  it("is an error below the minimum, when mounts and the engine do not make the count, and for a mixed type", () => {
    const few = editRecord(legal, (d) => void (d.chassis.heatSinks.count = 8));
    expect(forCheck(few, "heat-sinks").some((f) => f.level === "error" && f.message.includes("at least 10"))).toBe(true);

    const none = editRecord(legal, (d) => void (d.mounts = d.mounts.filter((m) => !m.id.startsWith("hs-"))));
    expect(forCheck(none, "heat-sinks")).toMatchObject([
      { level: "error", message: expect.stringMatching(/0 heat sinks are placed and the engine can hold 8.*lists 10/), cite: { page: 53 } },
    ]);

    const mixed = editRecord(legal, (d) => void (d.mounts[d.mounts.length - 1] = mount("hs-2", "double-heat-sink-is", "RL", 5)));
    expect(forCheck(mixed, "heat-sinks")).toMatchObject([{ level: "error", where: { mountId: "hs-2" }, cite: { page: 53 } }]);
  });
});

describe("jump", () => {
  it("is an error over the walking speed and for mixed jet types", () => {
    const tooMany = editRecord(legal, (d) => {
      d.mounts.push(mount("jj-4", "jump-jet", "LT", 5), mount("jj-5", "jump-jet", "RT", 5));
    });
    expect(forCheck(tooMany, "jump")).toMatchObject([{ level: "error", message: expect.stringContaining("5 standard jump jets"), cite: { page: 51 } }]);

    const mixed = editRecord(legal, (d) => void d.mounts.push(mount("ijj", "improved-jump-jet-is", "LT", 5)));
    expect(forCheck(mixed, "jump")).toMatchObject([{ level: "error", message: expect.stringContaining("mixed") }]);
  });
});

describe("placement", () => {
  it("is an error for a forbidden location, a split pair, and the wrong count of a per-'Mech item", () => {
    const wrongPlace = editRecord(legal, (d) => void d.mounts.push(mount("bl", "bridgelayer-light-is", "CT", 11)));
    expect(forCheck(wrongPlace, "placement")).toMatchObject([
      { level: "error", where: { location: "CT", mountId: "bl" }, message: expect.stringContaining("cannot be mounted on a biped"), cite: { page: 344 } },
    ]);

    const split = editRecord(legal, (d) => {
      d.mounts.push(mount("lrm", "lrm-5-is", "LT", 5), { ...mount("art", "artemis-iv-is", "RT", 5), linkedTo: "lrm" });
    });
    expect(forCheck(split, "placement")).toMatchObject([{ level: "error", where: { location: "RT", mountId: "art" }, cite: { page: 207 } }]);

    const missingHost = editRecord(legal, (d) => void d.mounts.push({ ...mount("art", "artemis-iv-is", "RT", 5), linkedTo: "gone" }));
    expect(forCheck(missingHost, "placement")).toMatchObject([{ level: "error", where: { mountId: "art" } }]);

    const tsm = editRecord(legal, (d) => {
      for (let i = 0; i < 5; i++) d.mounts.push(mount(`tsm-${i}`, "tsm-is", "CT", 11 - i));
    });
    expect(forCheck(tsm, "placement")).toMatchObject([{ level: "error", message: expect.stringContaining("6 times; this 'Mech has 5"), cite: { page: 52 } }]);
  });
  it("uses the quad rule on a quad", () => {
    const quad = editRecord(quadRecord(), (d) => void d.mounts.push(mount("bl", "bridgelayer-light-is", "CT", 11), mount("bh", "backhoe-is", "LT", 3), mount("wb", "wrecking-ball-is", "LT", 8)));
    expect(forCheck(quad, "placement").map((f) => f.where?.mountId)).toEqual(["wb"]);
  });
});

describe("availability", () => {
  it("is an error before the item exists, and for another tech base, and a note where the year is inferred", () => {
    const early = editRecord(legal, (d) => void (d.year = 2400));
    expect(forCheck(early, "availability").map((f) => [f.level, f.where?.mountId])).toEqual([
      ["error", "ac"],
      ["error", "ammo"],
      ["error", "jj-1"],
      ["error", "jj-2"],
      ["error", "jj-3"],
    ]);

    const clan = editRecord(legal, (d) => void d.mounts.push({ ...mount("cj", "jump-jet-clan", "LT", 5), techBase: "clan" }));
    expect(forCheck(clan, "availability")).toMatchObject([{ level: "error", where: { mountId: "cj" }, cite: { page: 57 } }]);

    const mixed = editRecord(legal, (d) => {
      d.techBase = "mixed";
      d.year = 2400;
      d.mounts = [{ ...mount("cj", "jump-jet-clan", "LT", 5), techBase: "clan" }];
    });
    expect(forCheck(mixed, "availability")).toMatchObject([{ level: "note", message: expect.stringContaining("does not print the year") }]);

    expect(forCheck(editRecord(early, (d) => void (d.year = null)), "availability")).toEqual([]);
  });
});

describe("unmatched", () => {
  it("names a mount and a chassis part the tables do not know", () => {
    const odd = editRecord(legal, (d) => {
      d.mounts.push(mount("x", "mystery-box", "CT", 11));
      d.chassis.gyro = "tachyon";
    });
    expect(forCheck(odd, "unmatched")).toMatchObject([
      { level: "note", message: expect.stringContaining("x is not in our equipment table") },
      { level: "note", message: expect.stringContaining('"tachyon"') },
    ]);
  });
});

describe("unsupported", () => {
  it("gives one note for a tripod, and no slot, placement or weight errors", () => {
    const tripod = editRecord(legal, (d) => void (d.configuration = "tripod"));
    const findings = runChecks(tripod, catalog);
    expect(findings.filter((f) => f.check === "unsupported")).toMatchObject([{ level: "note", message: expect.stringContaining("tripod") }]);
    expect(findings.filter((f) => ["slots", "placement", "weight"].includes(f.check) && f.level === "error")).toEqual([]);
    expect(forCheck(tripod, "slots")).toEqual([]);
  });
});

describe("runChecks", () => {
  it("turns a check that throws into a note naming it and still runs the others", () => {
    const broken = { ...catalog, available: () => { throw new Error("boom"); } };
    const findings = runChecks(legal, broken);
    expect(findings).toContainEqual(expect.objectContaining({ check: "availability", level: "note", message: expect.stringContaining("boom") }));
    expect(findings.some((f) => f.check === "weight")).toBe(true);
  });
});
