import { describe, expect, it } from "vitest";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { createCatalog, expand } from "./catalog";
import { battleValue } from "./bv";
import { runChecks } from "./checks";
import { finalMultiplier, unitCost } from "./cost";
import { bipedRecord, clanMount, gladiator } from "./fixtures";
import { configurationLevel, omniChassisFindings, brokenBy } from "./omni";
import type { OmniConfiguration } from "./omni";
import { editRecord, weights } from "./mech";
import type { MechRecord, Mount } from "./mech";
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

describe("the Omni checks (TechManual pp.19-20, 44-58)", () => {
  const prime = () => resolveConfiguration(gladiator(), "prime") as MechRecord;
  const found = (record: MechRecord, check: string) => runChecks(record, catalog).filter((f) => f.check === check);
  const withPods = (change: (pods: Mount[]) => Mount[]) => {
    const chassis = gladiator();
    const first = chassis.configurations[0] as OmniConfiguration;
    first.mounts = change(first.mounts);
    return resolveConfiguration(chassis, "prime") as MechRecord;
  };

  it("pass the book's Gladiator: no error on the Prime or on the A, and the base reports its pod space as a note", () => {
    for (const id of ["prime", "a"]) expect(runChecks(resolveConfiguration(gladiator(), id) as MechRecord, catalog).filter((f) => f.level === "error")).toEqual([]);
    expect(found(resolveBase(gladiator()), "omni-pod-space")[0]?.message).toContain("26.5 tons");
  });

  it.each([
    ["pod MASC is refused", (r: MechRecord) => editRecord(r, (d) => void d.mounts.push({ ...clanMount("masc-2", "masc-clan", "RT", 9), pod: true })), "omni-pod-forbidden", "cannot be pod-mounted"],
    ["a pod heat sink of another type", (r: MechRecord) => editRecord(r, (d) => void d.mounts.push({ ...clanMount("hs-x", "heat-sink-clan", "LT", 10), pod: true })), "omni-heat-sink-type", "carries one type"],
    ["a Gauss rifle in an arm that keeps its actuators", (r: MechRecord) => editRecord(r, (d) => void delete d.arms), "omni-arm-actuators", "lower arm and hand"],
    ["a body an Omni may not have", (r: MechRecord) => editRecord(r, (d) => void (d.configuration = "lam")), "omni-unit-type", "cannot be built as an OmniMech"],
    ["pods over the pod space", (r: MechRecord) => editRecord(r, (d) => void d.mounts.push({ ...clanMount("big", "gauss-rifle-clan", "RT", 9), pod: true })), "omni-overweight", "of pod space"],
  ])("report %s", (_what, change, check, text) => {
    const findings = found(change(prime()), check);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.level).toBe("error");
    expect(findings[0]?.message).toContain(text);
    expect(findings[0]?.cite?.page).toBeGreaterThan(0);
  });

  it("holds only the base's sinks in the engine: a pod sink always takes slots, and a base sink left unplaced is reported", () => {
    expect(found(prime(), "heat-sinks")).toEqual([]);
    const lost = editRecord(prime(), (d) => void (d.mounts = d.mounts.filter((m) => m.id !== "hs-base")));
    expect(found(lost, "omni-heat-sink-slots")[0]?.message).toContain("pod heat sinks all take slots");
    // 380 holds 15; the base lists 10, so only 10 are held and the three pod sinks are placed: 13 in all, and legal.
    const chassis = gladiator();
    chassis.base.chassis.heatSinks.count = 10;
    chassis.base.mounts = chassis.base.mounts.filter((m) => m.id !== "hs-base");
    expect(found(resolveConfiguration(chassis, "prime") as MechRecord, "heat-sinks")).toEqual([]);
  });

  it("gives every launcher the base's Artemis state: none where the base lacks it, all where it has it, and none on a fixed launcher", () => {
    const launcher = (id: string, location: Mount["location"], slot: number): Mount => clanMount(id, "lrm-10-clan", location, slot);
    const artemis = (id: string, location: Mount["location"], slot: number, link?: string): Mount => clanMount(id, "artemis-iv-clan", location, slot, link ? { linkedTo: link } : {});
    const build = (fixed: Mount[], pods: Mount[]) => {
      const chassis = gladiator();
      chassis.base.mounts.push(...fixed);
      (chassis.configurations[0] as OmniConfiguration).mounts.push(...pods);
      return found(resolveConfiguration(chassis, "prime") as MechRecord, "omni-artemis");
    };
    expect(build([launcher("fl", "RT", 9)], [artemis("pa", "RA", 7)])[0]?.message).toContain("lack Artemis");
    expect(build([launcher("fl", "RT", 9), artemis("fa", "RT", 10, "fl")], [launcher("pl", "LT", 8)])[0]?.message).toContain("must have it");
    expect(build([launcher("fl", "RT", 9)], [artemis("pa", "RT", 10, "fl")])[0]?.message).toContain("part of the base");
    expect(build([launcher("fl", "RT", 9), artemis("fa", "RT", 10, "fl")], [launcher("pl", "LT", 8), artemis("pa", "LT", 9, "pl")])).toEqual([]);
  });

  it("finds the chassis faults: one configuration, a missing Primary, a repeated code, a configuration older than its chassis, an advanced base", () => {
    const chassis = gladiator();
    const messages = (c: typeof chassis) => omniChassisFindings(c, catalog).map((f) => `${f.check}:${f.level}`);
    expect(messages(chassis)).toEqual([]);
    expect(messages({ ...chassis, configurations: [chassis.configurations[0] as OmniConfiguration] })).toEqual(["omni-configurations:note"]);
    expect(messages({ ...chassis, primaryId: "x" })).toEqual(["omni-primary:error"]);
    expect(messages({ ...chassis, configurations: chassis.configurations.map((c) => ({ ...c, code: "A" })) })).toEqual(["omni-primary:error"]);
    expect(messages({ ...chassis, configurations: [{ ...(chassis.configurations[0] as OmniConfiguration), year: 3000 }, chassis.configurations[1] as OmniConfiguration] })).toEqual(["omni-era:error"]);
    const advanced = { ...chassis, base: { ...chassis.base, mounts: [...chassis.base.mounts, clanMount("case2", "case-ii-clan", "RT", 9)] } };
    expect(omniChassisFindings(advanced, catalog).map((f) => f.check)).toEqual(["omni-base-level"]);
  });

  it("makes a configuration's level the highest of the base and its pods, never below Standard, and refuses the type before its dates", () => {
    expect(configurationLevel(prime(), catalog)).toBe("standard");
    const raised = withPods((pods) => [...pods, clanMount("case2", "case-ii-clan", "LT", 10)]);
    expect(configurationLevel(raised, catalog)).toBe("experimental");
    expect(found(raised, "level").some((f) => f.message.includes("Experimental"))).toBe(true);
    const early = (year: number, rulesLevel: "standard" | "experimental") => editRecord(prime(), (d) => void Object.assign(d, { year, rulesLevel }));
    const gate = (record: MechRecord) => found(record, "availability").filter((f) => f.where?.field === "unitType");
    expect(gate(early(2855, "standard")).map((f) => f.level)).toEqual(["error"]);
    expect(gate(early(2855, "experimental")).map((f) => f.level)).toEqual(["note"]);
    expect(gate(early(2856, "standard"))).toEqual([]);
  });

  it("names what a base edit breaks in each configuration and changes nothing itself", () => {
    const chassis = gladiator();
    const after = applyBaseEdit(chassis, editRecord(resolveBase(chassis), (d) => void (d.chassis.engine.rating = 285)));
    const broken = brokenBy(chassis, after, catalog);
    expect(broken.map((b) => b.code)).toEqual(["Prime", "A"]);
    expect(broken[0]?.added.length).toBeGreaterThan(0);
    expect(brokenBy(chassis, chassis, catalog)).toEqual([]);
  });
});

describe("cost and Battle Value of a configuration (TechManual pp.282, 285)", () => {
  const prime = resolveConfiguration(gladiator(), "prime") as MechRecord;
  const plain = (record: MechRecord): MechRecord => {
    const copy = structuredClone(record);
    delete copy.omni;
    for (const m of copy.mounts) delete m.pod;
    return copy;
  };

  it("multiplies the whole sum, base and pods together, by 1.25 and (1 + tons / 100); the book's worked pair 627,500 and 997,500 gives 1,255,000 and 1,995,000", () => {
    expect(627_500 * finalMultiplier(30, true, 50)).toBe(1_255_000);
    expect(997_500 * finalMultiplier(30, true, 50)).toBe(1_995_000);
    const cost = unitCost(prime, catalog);
    expect(cost.multiplier).toBe(1.25 * 1.95);
    expect(cost.total).toBeCloseTo((cost.structural + cost.equipment) * 1.25 * 1.95, 1);
    expect(unitCost(plain(prime), catalog).total).toBeCloseTo(cost.total / 1.25, 1); // the record alone does not make an Omni
  });

  it("prices the base on its own, less than any configuration, with the jump jets counted once for the whole unit", () => {
    const base = unitCost(resolveBase(gladiator()), catalog);
    const loaded = unitCost(prime, catalog);
    expect(base.multiplier).toBe(loaded.multiplier);
    expect(base.total).toBeLessThan(loaded.total);
    const jets = (c: typeof base) => c.lines.find((l) => l.label.startsWith("Jump jets"))?.cost;
    expect(jets(base)).toBeGreaterThan(0);
    expect(jets(base)).toBe(jets(loaded));
  });

  it("values each configuration as an ordinary 'Mech: the Omni link changes nothing, and the configurations differ", () => {
    expect(battleValue(prime, catalog)).toEqual(battleValue(plain(prime), catalog));
    expect(battleValue(prime, catalog).total).not.toBe(battleValue(resolveConfiguration(gladiator(), "a") as MechRecord, catalog).total);
  });
});
