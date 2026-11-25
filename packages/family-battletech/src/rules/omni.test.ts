import { describe, expect, it } from "vitest";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { createCatalog, expand } from "./catalog";
import { bipedRecord, clanMount, gladiator } from "./fixtures";
import { editRecord, weights } from "./mech";
import {
  BASE,
  addConfiguration,
  applyBaseEdit,
  applyConfigurationEdit,
  copyConfiguration,
  deleteConfiguration,
  moveConfiguration,
  newOmniChassis,
  podSpace,
  renameConfiguration,
  resolveAll,
  resolveBase,
  resolveConfiguration,
  splitRecord,
} from "./omni";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));
let counter = 0;
const ids = () => `new-${String(++counter)}`;

describe("resolving a configuration (TechManual pp.19-20, 58)", () => {
  it("is the base's fixed parts and mounts followed by the pods, as an ordinary record that fills the 95 tons of the book's example", () => {
    const chassis = gladiator();
    const prime = resolveConfiguration(chassis, "prime");
    expect(prime?.id).toBe("gladiator:prime");
    expect(prime?.name).toEqual({ chassis: "Gladiator", model: "Prime" });
    expect(prime?.unitType).toBe("omnimech");
    expect(prime?.mounts.slice(0, chassis.base.mounts.length).every((m) => m.pod === undefined)).toBe(true);
    expect(prime?.mounts.filter((m) => m.pod).map((m) => m.id)).toEqual(chassis.configurations[0]?.mounts.map((m) => m.id));
    expect(prime?.chassis.heatSinks.count).toBe(19); // the base's 16 and the three pod sinks
    expect(prime?.omni).toMatchObject({ configurationId: "prime", baseHeatSinks: 16 });
    expect(prime && weights(prime, catalog.factsOf).total).toBe(95);
    expect(resolveConfiguration(chassis, "nope")).toBeUndefined();
    expect(resolveAll(chassis).map((r) => r.omni?.code)).toEqual(["Prime", "A"]);
  });

  it("leaves 26.5 tons of pod space in the base, and the slots the base does not fill, with the arms' removable actuators counted apart", () => {
    const chassis = gladiator();
    const base = resolveBase(chassis);
    expect(base.omni?.isBase).toBe(true);
    expect(base.mounts.some((m) => m.pod)).toBe(false);
    const space = podSpace(chassis, catalog);
    expect(space.tons).toBe(26.5);
    expect(space.slots).toMatchObject({ LT: 6, RT: 6, CT: 0, HD: 0, LL: 0 });
    expect(space.actuators).toEqual({ LA: 2, RA: 2 });
  });
});

describe("editing", () => {
  it("writes a configuration's pods and arms back and drops any change to the fixed parts, armor or chassis", () => {
    const chassis = gladiator();
    const prime = resolveConfiguration(chassis, "prime");
    if (!prime) throw new Error("no prime");
    const edited = editRecord(prime, (d) => {
      d.mounts = d.mounts.filter((m) => m.id !== "mg-1" && m.id !== "masc");
      d.armor.HD = { front: 5 };
      d.chassis.engine.rating = 190;
      d.arms = {};
    });
    const next = applyConfigurationEdit(chassis, "prime", edited);
    expect(next.configurations[0]?.mounts.some((m) => m.id === "mg-1")).toBe(false);
    expect(next.base).toEqual(chassis.base);
    expect(next.configurations[0]?.arms).toEqual({});
    expect(next.configurations[1]).toEqual(chassis.configurations[1]);
    expect(applyConfigurationEdit(chassis, "nope", edited)).toBe(chassis);
  });

  it("writes a base edit to the base and the chassis identity, keeps every pod, and renames a new fixed mount whose id a pod already has", () => {
    const chassis = gladiator();
    const edited = editRecord(resolveBase(chassis), (d) => {
      d.chassis.engine.rating = 285;
      d.name.chassis = "Gladiator X";
      d.mounts.push(clanMount("gauss", "case-clan", "RT", 9));
    });
    const next = applyBaseEdit(chassis, edited);
    expect(next.base.chassis.engine.rating).toBe(285);
    expect(next.name.chassis).toBe("Gladiator X");
    expect(next.configurations).toEqual(chassis.configurations);
    expect(next.base.mounts.at(-1)?.id).toBe("gauss-base-1");
    expect(new Set(resolveConfiguration(next, "prime")?.mounts.map((m) => m.id)).size).toBe(resolveConfiguration(next, "prime")?.mounts.length);
  });
});

describe("configurations", () => {
  it("copies with the next free letter and no Mordel source, renames, reorders and adds an empty one", () => {
    const withSource = { ...gladiator(), configurations: gladiator().configurations.map((c) => ({ ...c, source: { kind: "mordel" as const, unitType: "bm", id: 1, designer: "d", fetchedAt: "", original: null, values: {} } })) };
    const copied = copyConfiguration(withSource, "prime", ids);
    const copy = copied.configurations[2];
    expect(copy).toMatchObject({ code: "B", name: "(copy)" });
    expect(copy?.source).toBeUndefined();
    expect(copy?.mounts).toEqual(withSource.configurations[0]?.mounts);
    expect(copyConfiguration(copied, "a", ids).configurations[3]?.code).toBe("C");
    const renamed = renameConfiguration(copied, copy?.id ?? "", { code: "MS1-OA", name: "Dominus" });
    expect(resolveConfiguration(renamed, copy?.id ?? "")?.name.model).toBe("MS1-OA Dominus");
    expect(moveConfiguration(renamed, copy?.id ?? "", -1).configurations.map((c) => c.id)[1]).toBe(copy?.id);
    expect(addConfiguration(gladiator(), ids).configurations[2]).toMatchObject({ code: "B", mounts: [] });
  });

  it("deletes any but the last, and gives the Primary to the one named or the first left", () => {
    const chassis = gladiator();
    expect(deleteConfiguration(chassis, "prime").primaryId).toBe("a");
    expect(deleteConfiguration(chassis, "a").primaryId).toBe("prime");
    expect(deleteConfiguration(deleteConfiguration(chassis, "prime"), "a").configurations).toHaveLength(1);
  });
});

describe("making a chassis", () => {
  it("builds a new one with standard parts, the ten sinks, an empty base and one empty Prime", () => {
    const chassis = newOmniChassis({ chassis: "Fire Falcon", model: "", tons: 20, walk: 8, techBase: "clan", configuration: "biped", year: null }, "classic", "ff", ids);
    expect(chassis.configurations).toHaveLength(1);
    expect(chassis.configurations[0]).toMatchObject({ code: "Prime", mounts: [] });
    expect(chassis.primaryId).toBe(chassis.configurations[0]?.id);
    expect(chassis.base.chassis.heatSinks.count).toBe(10);
    expect(chassis.base.mounts.every((m) => m.id.startsWith("heat-sink"))).toBe(true);
    expect(resolveConfiguration(chassis, BASE)?.omni?.isBase).toBe(true);
  });

  it("splits a plain record into a base and a Prime, taking the pod sinks off the base's count", () => {
    const plain = bipedRecord();
    const chassis = splitRecord(plain, ["jj-1", "jj-2", "jj-3", "hs-1"], ids);
    expect(chassis.base.mounts.map((m) => m.id)).toEqual(["jj-1", "jj-2", "jj-3", "hs-1"]);
    expect(chassis.configurations[0]?.mounts.map((m) => m.id)).toEqual(["ac", "ammo", "laser-l", "laser-r", "hs-2"]);
    expect(chassis.base.chassis.heatSinks.count).toBe(9);
    expect(chassis.configurations[0]?.name).toBe("TW-1");
    expect(resolveConfiguration(chassis, chassis.primaryId)?.chassis.heatSinks.count).toBe(10);
  });
});
