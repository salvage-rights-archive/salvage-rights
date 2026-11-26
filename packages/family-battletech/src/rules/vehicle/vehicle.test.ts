import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import { checkVehicle, markVehicleOfficial, vehicleOfficialState } from "./checks";
import { armorChoices, engineChoices, equipmentOffered, motiveChoices } from "./availability";
import {
  armorLocations, armorPointsFor, baseSlots, controlTons, crewOf, engineRating, engineWeight, flankMP, itemFacts, liftTons, maxArmorPoints, newVehicleRecord, slotTally, structurePoints, structureTons, turretTons, vehicleTally, withDefaults,
} from "./vehicle";
import type { MotiveId, VehicleRecord } from "./vehicle";
import { targetModifier, vehicleBv } from "./bv";
import { vehicleCost } from "./cost";

const catalog = await loadCatalog();
const build = (fields: Partial<VehicleRecord> & Pick<VehicleRecord, "motive" | "tons">, mounts: [string, string, number?][] = []): VehicleRecord => {
  const record = { ...newVehicleRecord({ id: "v", year: 3060, motive: fields.motive as MotiveId, tons: fields.tons }), ...fields };
  return { ...record, mounts: mounts.map(([location, equipmentId, amount], i) => ({ id: `m${i}`, equipmentId, name: equipmentId, location, ...(amount === undefined ? {} : { amount }) })) };
};
const checks = (record: VehicleRecord) => checkVehicle(record, catalog).map((f) => `${f.check}:${f.level}`);

// The book's four worked designs (TechManual pp. 98-109).
describe("construction by the book's worked examples", () => {
  it("hover: the Hephaestus, 30 tons, 8 cruising MP, Clan standard fusion engine", () => {
    const r = build({ motive: "hover", tons: 30, cruise: 8, techBase: "clan", turret: true });
    expect([engineRating(r), flankMP(r), engineWeight(r), liftTons(r), controlTons(r), structureTons(r), structurePoints(r), baseSlots(r)]).toEqual([110, 12, 6, 3, 1.5, 3, 3, 11]);
  });
  it("tracked ICE: the Zhukov, 75 tons, 3 cruising MP", () => {
    const r = build({ motive: "tracked", tons: 75, cruise: 3, engine: { type: "ice" } });
    expect([engineRating(r), engineWeight(r), controlTons(r), structureTons(r), structurePoints(r), crewOf(r), baseSlots(r), maxArmorPoints(r), armorPointsFor("standard", 11)]).toEqual([225, 20, 4, 7.5, 8, 5, 20, 302, 176]);
  });
  it("VTOL ICE: the Yellow Jacket has a rotor and 2 armor points there at most", () => {
    const r = build({ motive: "vtol", tons: 30, cruise: 6, engine: { type: "ice" }, armor: { type: "standard", tons: 3.5, points: { f: 20, l: 13, r: 13, b: 8, rot: 3 } } });
    expect([engineRating(r), engineWeight(r), liftTons(r), armorPointsFor("standard", 3.5), armorLocations(r)]).toEqual([40, 2, 3, 56, ["f", "l", "r", "b", "rot"]]);
    expect(checks(r)).toContain("armor:error");
  });
  it("submarine ICE: the Neptune, 100 tons, 3 cruising MP", () => {
    const r = build({ motive: "submarine", tons: 100, cruise: 3, engine: { type: "ice" } });
    expect([engineRating(r), engineWeight(r), liftTons(r), crewOf(r)]).toEqual([270, 29, 10, 7]);
  });
});

describe("weight and slots with equipment", () => {
  it("a turret weighs a tenth of what it holds, ammunition left out; a ferro-fibrous armor costs slots", () => {
    const r = build({ motive: "tracked", tons: 75, cruise: 3, engine: { type: "ice" }, turret: true, armor: { type: "ferro-fibrous", tons: 5, points: {} } }, [["t", "ac-10-is"], ["t", "ac-10-is"], ["body", "ammo-ac-10-is", 2]]);
    expect(turretTons(r, catalog)).toBe(2.5);
    expect(vehicleTally(r, catalog).lines.find((l) => l.label === "Ammunition")?.tons).toBe(2);
    expect(slotTally(r, catalog)).toMatchObject({ available: 18, used: 3 });
    expect(itemFacts(r.mounts[0] as VehicleRecord["mounts"][number], r, catalog)).toMatchObject({ tons: 12, slots: 1 });
  });
  it("an ICE engine needs power amplifiers for energy weapons; a fusion engine does not", () => {
    const ice = build({ motive: "tracked", tons: 50, cruise: 3, engine: { type: "ice" }, heatSinks: { count: 8 } }, [["f", "large-laser-is"]]);
    expect(vehicleTally(ice, catalog).lines.find((l) => l.label === "Power amplifiers")?.tons).toBe(0.5);
    expect(vehicleTally({ ...ice, engine: { type: "standard" } }, catalog).lines.some((l) => l.label === "Power amplifiers")).toBe(false);
  });
});

describe("the rules check", () => {
  const sound = { motive: "tracked" as const, tons: 20, cruise: 5, armor: { type: "standard", tons: 2, points: { f: 12, l: 8, r: 8, b: 4 } } };
  it.each([
    ["weight over the vehicle's tons", build({ ...sound, tons: 10, armor: { type: "standard", tons: 8, points: {} } }), "weight:error"],
    ["over the motive type's top weight", build({ motive: "vtol", tons: 40, cruise: 3 }), "type:error"],
    ["a VTOL turret", build({ ...sound, motive: "vtol", turret: true, tons: 20 }), "type:error"],
    ["an armored motive system on a VTOL (TO:AUE p. 95)", build({ ...sound, motive: "vtol", tons: 20 }, [["body", "armored-motive-system-is"]]), "type:error"],
    ["WiGE below 5 cruising MP", build({ motive: "wige", tons: 20, cruise: 4 }), "engine:error"],
    ["more armor than the tons give", build({ ...sound, armor: { type: "standard", tons: 1, points: { f: 40 } } }), "armor:error"],
    ["too few heat sinks for the lasers", build({ ...sound, heatSinks: { count: 2 } }, [["f", "large-laser-is"]]), "heat:error"],
    ["a weapon in the body", build(sound, [["body", "medium-laser-is"]]), "equipment:error"],
    ["equipment in the turret of a turretless vehicle", build(sound, [["t", "machine-gun-is"]]), "equipment:error"],
    ["a weapon with no ammunition", build(sound, [["f", "ac-5-is"]]), "equipment:warning"],
    ["an ammunition bin under a ton", build(sound, [["f", "ac-5-is"], ["body", "ammo-ac-5-is", 0.5]]), "equipment:error"],
    ["a jump jet is not for vehicles", build(sound, [["f", "jump-jet-is"]]), "equipment:error"],
    ["Clan equipment on an Inner Sphere vehicle", build(sound, [["f", "er-ppc-clan"]]), "equipment:warning"],
    ["no year above Introductory", build({ ...sound, year: null }), "time:warning"],
  ])("%s", (_name, record, expected) => {
    expect(checks(record)).toContain(expected);
  });
  it("a vehicle the book would accept has no error", () => {
    const record = build({ ...sound, heatSinks: { count: 10 } }, [["f", "medium-laser-is"], ["f", "machine-gun-is"], ["body", "ammo-machine-gun-is", 0.5]]);
    expect(checkVehicle(record, catalog).filter((f) => f.level === "error")).toEqual([]);
  });
});

describe("what a record offers", () => {
  it("hides what its level, tech base and year leave out", () => {
    const r = build({ motive: "tracked", tons: 50, year: 2900 });
    expect(armorChoices(r).map(([id]) => id)).toEqual(["standard"]);
    expect(engineChoices(r).map(([id]) => id)).toContain("ice");
    expect(engineChoices(r).map(([id]) => id)).not.toContain("compact");
    expect(equipmentOffered(catalog.byId("er-ppc-clan")!, r, catalog)).toBe(false);
    expect(motiveChoices({ rulesLevel: "introductory", motive: "tracked" }).map(([id]) => id)).toEqual(["tracked"]);
    expect(motiveChoices({ rulesLevel: "standard", motive: "tracked" })).toHaveLength(8);
  });
});

describe("Battle Value and cost, the book's Hephaestus (Primary)", () => {
  const prime = build(
    { motive: "hover", tons: 30, cruise: 8, techBase: "clan", year: 3060, turret: true, omni: {}, armor: { type: "ferro-fibrous-clan", tons: 5, points: { f: 20, l: 20, r: 20, b: 18, t: 18 } } },
    [["body", "active-probe-clan"], ["t", "medium-pulse-laser-clan"], ["t", "medium-pulse-laser-clan"], ["t", "tag-clan"], ["body", "ecm-suite-clan"]],
  );
  it("Battle Value is 777 (TechManual BV v4.1, worked example)", () => {
    const bv = vehicleBv(prime, catalog);
    expect([bv.total, bv.defensive, bv.offensive, bv.complete]).toEqual([777, 328.79, 447.93, true]);
  });
  it("cost is 1,995,000 C-bills (TechManual p. 285, worked example)", () => {
    expect(vehicleCost(prime, catalog).total).toBe(1_995_000);
  });
});

describe("airborne motion and the class dates", () => {
  it("a VTOL or a WiGE is one harder to hit than a hover vehicle at the same speed (Total Warfare pp. 55 and 117)", () => {
    expect([targetModifier({ motive: "hover", cruise: 6 }), targetModifier({ motive: "vtol", cruise: 6 }), targetModifier({ motive: "wige", cruise: 6 })]).toEqual([3, 4, 4]);
  });
  it("combat vehicles are prototypes from 2460 (Experimental) and in production from 2470 (Interstellar Operations: Alternate Eras p. 44)", () => {
    const base = { motive: "tracked" as const, tons: 20, cruise: 3 };
    expect(checks(build({ ...base, year: 2400 }))).toContain("time:warning");
    expect(checks(build({ ...base, year: 2465 }))).toContain("time:warning");
    expect(checks(build({ ...base, year: 2465, rulesLevel: "experimental" }))).not.toContain("time:warning");
    expect(checks(build({ ...base, year: 2470 }))).not.toContain("time:warning");
  });
});

describe("the record", () => {
  it("keeps what it does not know, and reads a damaged record without throwing", () => {
    const read = withDefaults({ schema: 1, motive: "walker", future: { a: 1 }, mounts: [{ location: "q", extra: true }], armor: "no" });
    expect(read).toMatchObject({ motive: "walker", future: { a: 1 }, mounts: [{ location: "q", extra: true }] });
    expect(withDefaults({ schema: 2 })).toBeUndefined();
    expect(checkVehicle(read!, catalog).length).toBeGreaterThan(0);
  });
  it("OFFICIAL holds only while the design is the marked one", () => {
    const r = build({ motive: "tracked", tons: 20, cruise: 3 });
    markVehicleOfficial(r, "Total Warfare", 12);
    expect(vehicleOfficialState(r)).toEqual({ official: true, book: "Total Warfare", page: 12 });
    expect(vehicleOfficialState({ ...r, tons: 25 }).official).toBe(false);
    expect(vehicleOfficialState({ ...r, name: { chassis: "x", model: "y" } }).official).toBe(true);
  });
});
