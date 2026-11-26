import { describe, expect, it } from "vitest";
import { MECH_TYPES } from "../data/chassis";
import { EDITIONS } from "../data/editions";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { configurationChoices, equipmentAvailable, partChoices, typeAvailable, typeChoices } from "./availability";
import { battleValue } from "./bv";
import { createCatalog, expand } from "./catalog";
import { runChecks } from "./checks";
import { unitCost } from "./cost";
import { mordelBiped, mordelWith, mount } from "./fixtures";
import { editRecord, mechTypeOf, newRecord, weights } from "./mech";
import type { MechRecord } from "./mech";
import { fromMordel } from "./mordel";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));

/** The CTL-3R2 CattleMaster of TechManual's IndustrialMech example (printed pp.66-75): 25 tons, an ICE 100, a 1-ton gyro, the industrial
 * cockpit with Advanced Fire Control, industrial structure, 5 tons of industrial armor (53 points), one heat sink, three machine guns
 * with half a ton of ammunition, two small lasers with half a ton of power amplifiers, and a searchlight. It uses all 25 tons. */
function cattleMaster(patch: Partial<MechRecord> = {}): MechRecord {
  return {
    schema: 1,
    id: "cattlemaster",
    editionId: "total-warfare",
    name: { chassis: "CattleMaster", model: "CTL-3R2" },
    techBase: "inner-sphere",
    year: 3025,
    rulesLevel: "standard",
    unitType: "industrialmech",
    tons: 25,
    configuration: "biped",
    chassis: {
      engine: { type: "ice", rating: 100 },
      gyro: "standard",
      cockpit: "industrial-afc",
      structure: "industrial",
      armorType: "industrial",
      myomer: "standard",
      heatSinks: { type: "single", count: 1 },
    },
    armor: { HD: { front: 9 }, CT: { front: 6, rear: 2 }, LT: { front: 6, rear: 2 }, RT: { front: 6, rear: 2 }, LA: { front: 4 }, RA: { front: 4 }, LL: { front: 6 }, RL: { front: 6 } },
    mounts: [
      mount("mg-1", "machine-gun-is", "RA", 4),
      mount("mg-2", "machine-gun-is", "RA", 5),
      mount("mg-3", "machine-gun-is", "LA", 4),
      mount("ammo", "ammo-machine-gun-half-is", "CT", 10),
      mount("sl-1", "small-laser-is", "RA", 6),
      mount("sl-2", "small-laser-is", "RA", 7),
      mount("light", "searchlight-is", "RA", 8),
    ],
    notes: {},
    ...patch,
  };
}
const withChassis = (patch: Partial<MechRecord["chassis"]>) => (record: MechRecord) => editRecord(record, (d) => void Object.assign(d.chassis, patch));
const forCheck = (record: MechRecord, id: string) => runChecks(record, catalog).filter((f) => f.check === id);

describe("the 'Mech types", () => {
  it("are one table the edition's unit types come from; OmniMech is ready, with the Construction Options years and the Clan prototype year", () => {
    expect(MECH_TYPES.map((t) => [t.id, t.label, t.ready])).toEqual([["mech", "BattleMech", true], ["industrialmech", "IndustrialMech", true], ["omnimech", "OmniMech", true], ["primitive-mech", "Primitive BattleMech", true], ["primitive-industrialmech", "Primitive IndustrialMech", true]]);
    expect(EDITIONS[0]?.unitTypes.slice(0, 3)).toEqual([
      { id: "mech", name: "BattleMech", ready: true },
      { id: "industrialmech", name: "IndustrialMech", ready: true },
      { id: "omnimech", name: "OmniMech", ready: true },
    ]);
    const omni = MECH_TYPES.find((t) => t.id === "omnimech");
    expect([omni?.availability, omni?.clanAvailability, omni?.availabilityCite.page]).toEqual([[{ from: 3052 }], [{ from: 2856 }], 45]);
  });

  it("start a new record as a BattleMech biped; a record with no type, or one we do not know, reads as a BattleMech; Mordel's im and bm map to ours", () => {
    const made = newRecord({ chassis: "Test", model: "T-1", tons: 50, walk: 4, techBase: "inner-sphere", configuration: "biped", year: null }, "total-warfare", "x");
    expect([made.unitType, made.configuration, made.chassis.structure, made.chassis.cockpit]).toEqual(["mech", "biped", "standard", "standard"]);
    const industrial = newRecord({ chassis: "Test", model: "T-2", tons: 10, walk: 3, techBase: "inner-sphere", configuration: "quad", year: null, unitType: "industrialmech" }, "total-warfare", "y");
    expect([industrial.unitType, industrial.chassis.structure, industrial.chassis.cockpit, Object.keys(industrial.armor).length]).toEqual(["industrialmech", "industrial", "industrial", 8]);
    const saved = editRecord(made, (d) => void delete d.unitType); // as saved before types were offered
    expect([mechTypeOf(saved).id, mechTypeOf({ unitType: "battlemech" as never }).id, mechTypeOf({ unitType: "omnimech" }).id]).toEqual(["mech", "mech", "omnimech"]);
    const read = (code: string) => {
      const result = fromMordel(mordelWith(mordelBiped(), { unit_type_short: code }), catalog, "total-warfare", "2026-11-25T00:00:00.000Z", () => "id");
      return result.ok ? [result.record.unitType, result.record.source?.kind === "mordel" ? result.record.source.unitType : undefined] : result.message;
    };
    expect([read("bm"), read("im")]).toEqual([["mech", "bm"], ["industrialmech", "im"]]);
    expect(read("cv")).toContain("only BattleMechs (bm) and IndustrialMechs (im)");
  });
});

describe("an IndustrialMech", () => {
  it("built as the book's CattleMaster is legal and weighs exactly its 25 tons, with the power amplifiers in the weight", () => {
    const record = cattleMaster();
    expect(runChecks(record, catalog).filter((f) => f.level === "error")).toEqual([]);
    const { lines, total } = weights(record, catalog.factsOf);
    expect(total).toBe(25);
    expect(lines.find((l) => l.label === "Power amplifiers")?.tons).toBe(0.5);
    expect(lines.find((l) => l.label === "Heat sinks")?.tons).toBe(1); // an ICE gives no free heat sink
  });

  it.each<[string, (r: MechRecord) => MechRecord, string, number]>([
    ["a tonnage a BattleMech may have but not in steps of 5", (r) => editRecord(r, (d) => void (d.tons = 7)), "An IndustrialMech weighs 10 to 100 tons in steps of 5", 64],
    ["a Land-Air 'Mech", (r) => editRecord(r, (d) => void (d.configuration = "lam")), "biped or a quad or a tripod", 65],
    ["standard structure", withChassis({ structure: "standard" }), "Standard structure is not allowed", 67],
    ["an XL engine", withChassis({ engine: { type: "xl", rating: 100 } }), "XL Fusion engine is not allowed", 68],
    ["a standard cockpit", withChassis({ cockpit: "standard" }), "Standard cockpit is not allowed", 69],
    ["a compact gyro", withChassis({ gyro: "compact" }), "Compact gyro is not allowed", 69],
    ["double heat sinks", withChassis({ heatSinks: { type: "double", count: 1 } }), "Double heat sink is not allowed", 71],
    ["MASC", withChassis({ myomer: "masc" }), "MASC myomer is not allowed", 70],
    ["ferro-fibrous armor", withChassis({ armorType: "ferro-fibrous" }), "Ferro-Fibrous armor is not allowed", 72],
    ["jump jets on an ICE", (r) => editRecord(r, (d) => void d.mounts.push(mount("jj", "jump-jet-is", "CT", 11))), "only with a fusion or fission engine", 69],
    [
      "improved jump jets",
      (r) => editRecord(withChassis({ engine: { type: "standard", rating: 100 } })(r), (d) => void d.mounts.push(mount("jj", "improved-jump-jet-is", "CT", 11))),
      "only standard jump jets",
      69,
    ],
    ["Artemis IV without Advanced Fire Control", (r) => editRecord(withChassis({ cockpit: "industrial" })(r), (d) => void d.mounts.push(mount("art", "artemis-iv-is", "CT", 11))), "needs Advanced Fire Control", 69],
  ])("is refused %s, once, with the page", (_what, make, text, page) => {
    const found = runChecks(make(cattleMaster()), catalog).filter((f) => f.level === "error" && f.message.includes(text));
    expect(found).toHaveLength(1);
    expect(found[0]?.cite?.page).toBe(page);
  });

  it("may be mixed technology (Tactical Operations: AUE p.189, newer than TechManual p.64), which needs Advanced level", () => {
    const mixed = (patch: Partial<MechRecord>) => runChecks(cattleMaster({ techBase: "mixed", year: 3085, ...patch }), catalog).filter((f) => f.level === "error").map((f) => f.message);
    expect(mixed({ rulesLevel: "advanced" })).toEqual([]);
    expect(mixed({ rulesLevel: "standard" })).toEqual([expect.stringContaining("Mixed technology (tech base) is Advanced level")]);
  });

  it("is checked by the type's tonnage: 15 tons is allowed for it and not for a BattleMech, which also may not carry its parts or equipment", () => {
    const light = cattleMaster({ tons: 15, chassis: { ...cattleMaster().chassis, engine: { type: "ice", rating: 60 } } });
    expect(forCheck(light, "weight").filter((f) => f.message.includes("in steps of"))).toEqual([]);
    const combat = editRecord(light, (d) => {
      d.unitType = "mech";
      d.mounts.push(mount("seal", "environmental-sealing-is", "CT", 11));
    });
    const messages = runChecks(combat, catalog).filter((f) => f.level === "error").map((f) => f.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        "A BattleMech weighs 20 to 100 tons in steps of 5, or 105 to 200 tons as a superheavy 'Mech; 15 is not allowed.",
        "Industrial structure is printed for IndustrialMechs; a BattleMech may not use it.",
        "Industrial (Advanced Fire Control) cockpit is printed for IndustrialMechs; a BattleMech may not use it.",
        "seal is not equipment a BattleMech may mount.",
      ]),
    );
  });

  it("sees only its own parts, bodies and equipment, and an OmniMech is offered to a Clan record from 2856 and to a mixed one", () => {
    const record = cattleMaster();
    const keys = (kind: Parameters<typeof partChoices>[0], r: MechRecord) => partChoices(kind, r, "").map(([key]) => key);
    expect([keys("structure", record), keys("engine", record), keys("armor", record)]).toEqual([["industrial"], ["standard", "ice", "fuel-cell", "fission"], ["standard", "industrial", "commercial"]]);
    expect(partChoices("armor", record, "")[0]?.[1]).toBe("Heavy Industrial");
    const combat = cattleMaster({ unitType: "mech" });
    expect([keys("structure", combat).includes("industrial"), keys("engine", combat).includes("ice"), keys("armor", combat).includes("commercial")]).toEqual([false, false, false]);
    const advanced = { ...record, rulesLevel: "advanced" as const };
    expect([configurationChoices(advanced, "").map(([key]) => key), configurationChoices({ ...advanced, unitType: "mech" }, "").map(([key]) => key).includes("tripod")]).toEqual([["biped", "quad", "tripod"], true]);
    const sealing = catalog.byId("environmental-sealing-is");
    const laser = catalog.byId("medium-laser-is");
    if (!sealing || !laser) throw new Error("rows missing");
    expect([equipmentAvailable(sealing, record, catalog), equipmentAvailable(sealing, combat, catalog), equipmentAvailable(laser, record, catalog), equipmentAvailable(laser, combat, catalog)]).toEqual([true, false, true, true]);
    const choices = (patch: Partial<MechRecord>) => typeChoices({ ...record, ...patch }).map((c) => (c.disabled ? `${c.id} (disabled)` : c.id));
    expect([
      choices({ year: 3025 }),
      choices({ year: 3025, rulesLevel: "introductory", unitType: "mech" }),
      choices({ year: 3025, techBase: "mixed", unitType: "mech" }),
      choices({ year: 2900, techBase: "clan" }),
      choices({ year: 2400, unitType: "mech" }),
    ]).toEqual([["mech", "industrialmech"], ["mech"], ["mech", "industrialmech", "omnimech"], ["mech", "industrialmech", "omnimech"], ["mech"]]); // mixed: the OmniMech too, and the IndustrialMech (Tactical Operations: AUE p.189)
  });

  it("offers an OmniMech from its production year, and from the Clan prototype year only at Experimental level, labelled prototype (IO:AE p.45)", () => {
    expect([
      typeAvailable("omnimech", { techBase: "clan", year: 2855, rulesLevel: "standard" }),
      typeAvailable("omnimech", { techBase: "clan", year: 2855, rulesLevel: "experimental" }),
      typeAvailable("omnimech", { techBase: "clan", year: 2856, rulesLevel: "standard" }),
      typeAvailable("omnimech", { techBase: "clan", year: 2853, rulesLevel: "experimental" }),
      typeAvailable("omnimech", { techBase: "inner-sphere", year: 3051, rulesLevel: "experimental" }),
      typeAvailable("omnimech", { techBase: "inner-sphere", year: 3052, rulesLevel: "standard" }),
    ]).toEqual([false, true, true, false, false, true]);
  });

  it("has the Battle Value of the book's DemolitionMech, and a tenth less offense without Advanced Fire Control", () => {
    // WI-DM (v4.1 example): 35 tons, a fuel cell 105, industrial structure and armor (85 points), one heat sink, a rock cutter, a wrecking ball and a small laser.
    const demolition = cattleMaster({
      name: { chassis: "Demolition", model: "WI-DM" },
      tons: 35,
      chassis: { engine: { type: "fuel-cell", rating: 105 }, gyro: "standard", cockpit: "industrial", structure: "industrial", armorType: "industrial", myomer: "standard", heatSinks: { type: "single", count: 1 } },
      armor: { HD: { front: 9 }, CT: { front: 14, rear: 4 }, LT: { front: 10, rear: 3 }, RT: { front: 10, rear: 3 }, LA: { front: 8 }, RA: { front: 8 }, LL: { front: 8 }, RL: { front: 8 } },
      mounts: [mount("cutter", "rock-cutter-is", "RA", 4), mount("ball", "wrecking-ball-is", "LA", 4), mount("laser", "small-laser-is", "RT", 0)],
    });
    const plain = battleValue(demolition, catalog);
    expect([plain.defensive.rating, plain.offensive.rating, plain.baseBv, plain.modifiers.noFireControl]).toEqual([328.2, 52.2, 380, true]);
    const controlled = battleValue(withChassis({ cockpit: "industrial-afc" })(demolition), catalog);
    expect([controlled.offensive.rating, controlled.baseBv]).toEqual([58, 386]);
  });

  it("is priced by the IndustrialMech tables: the book's Uni, with the tonnage over 400 and 225 a ton for environmental sealing", () => {
    // ATAE-70 Uni (printed p.276): a 70-ton quad, a fuel cell 210, a 3-ton gyro, commercial armor (216 points = 9 tons), environmental sealing.
    // The book's text prices the fuel cell engine at 4,000 where its table (p.278) prints 3,500, so the engine is 686,000 here, not 784,000.
    const uni = cattleMaster({
      name: { chassis: "Uni", model: "ATAE-70" },
      tons: 70,
      configuration: "quad",
      chassis: { engine: { type: "fuel-cell", rating: 210 }, gyro: "standard", cockpit: "industrial", structure: "industrial", armorType: "commercial", myomer: "standard", heatSinks: { type: "single", count: 1 } },
      armor: { HD: { front: 9 }, CT: { front: 31, rear: 10 }, LT: { front: 20, rear: 9 }, RT: { front: 20, rear: 9 }, FLL: { front: 27 }, FRL: { front: 27 }, RLL: { front: 27 }, RRL: { front: 27 } },
      mounts: (["HD", "CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"] as const).map((place, i) => mount(`seal-${i}`, "environmental-sealing-is", place, place === "HD" ? 3 : place === "CT" ? 10 : place.endsWith("L") && place !== "LT" ? 4 : 0)),
    });
    expect(weights(uni, catalog.factsOf).total).toBe(47); // 14 structure, 11 engine, 3 gyro, 3 cockpit, 7 sealing, 9 armor
    const cost = unitCost(uni, catalog);
    expect([cost.structural, cost.multiplier, cost.total, cost.unpriced]).toEqual([2_179_750, 1.175, 2_561_206.25, []]);
    expect(cost.lines.find((l) => l.label === "Environmental sealing")?.cost).toBe(15_750);
    const armed = unitCost(cattleMaster(), catalog);
    expect(armed.lines.find((l) => l.label === "Power amplifiers")?.cost).toBe(10_000); // 20,000 a ton, half a ton of amplifiers
    expect(armed.multiplier).toBeCloseTo(1.0625, 10);
  });
});
