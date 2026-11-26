import { beforeAll, describe, expect, it } from "vitest";
import { ERAS } from "../data/editions";
import type { Span } from "../data/chassis";
import { configurationAvailable, configurationChoices, equipmentAvailable, eraOfRecord, erasOfYear, partAvailable, partChoices, setEra, setYear, typeAvailable } from "./availability";
import type { PartKind } from "./availability";
import { expand, groupOf, loadCatalog } from "./catalog";
import type { Catalog } from "./catalog";
import { runChecks } from "./checks";
import { bipedRecord, mount } from "./fixtures";
import { lowestLevelFor, techBaseChoices } from "./levels";
import type { MechRecord } from "./mech";
import { datesText, phaseIn } from "./time";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});
const record = (patch: Partial<MechRecord> = {}): MechRecord => bipedRecord({ editionId: "total-warfare", rulesLevel: "standard", ...patch });
const offers = (id: string, patch: Partial<MechRecord> = {}, everything = false) => equipmentAvailable(catalog.byId(id)!, record(patch), catalog, everything);

describe("equipment availability", () => {
  it("offers an item from its introduction year, not before, not while it is extinct, and again from its reintroduction", () => {
    const years = (id: string, list: number[]) => list.map((year) => offers(id, { year }));
    expect(years("medium-laser-is", [2299, 2300])).toEqual([false, true]);
    expect(years("double-heat-sink-is", [2866, 2900, 3039, 3040])).toEqual([false, false, false, true]);
  });

  it("offers a Clan unit Clan rows and an Inner Sphere unit Inner Sphere rows, and a mixed unit both", () => {
    expect([offers("lrm-5-clan", { techBase: "inner-sphere", year: 3060 }), offers("lrm-5-clan", { techBase: "clan", year: 3060 }), offers("ultra-ac-20-is", { techBase: "clan", year: 3060 }), offers("ultra-ac-20-is", { techBase: "mixed", year: 3060 })]).toEqual([false, true, false, true]);
  });

  it("hides an item above the unit's level, and Show everything lifts the tech base and the years but never the level", () => {
    const patch = { techBase: "clan", year: 3025, rulesLevel: "standard" } as const;
    expect([offers("ppc-capacitor-is", { year: 3065 }), offers("ppc-capacitor-is", { year: 3065, rulesLevel: "experimental" })]).toEqual([false, true]);
    expect([offers("ultra-ac-20-is", patch), offers("ultra-ac-20-is", patch, true), offers("ppc-capacitor-is", patch, true)]).toEqual([false, true, false]);
  });

  it("limits a unit with an era and no year to the whole era: introduced by its last year and not extinct before its first", () => {
    const era = (id: string) => ({ year: null, era: id, rulesLevel: "experimental" as const });
    expect([
      offers("medium-laser-is", era("age-of-war")),
      offers("double-heat-sink-is", era("early-succession-war")),
      offers("double-heat-sink-is", era("late-succession-war-lostech")),
      offers("ppc-capacitor-is", era("late-succession-war-renaissance")),
      offers("ppc-capacitor-is", era("clan-invasion")),
    ]).toEqual([true, true, false, false, true]);
  });
});

describe("chassis parts and body types", () => {
  it("applies the same rule to a chassis part: its tech base, its years, its level, and no limit where the book prints none", () => {
    const parts: [PartKind, string, Partial<MechRecord>, boolean][] = [
      ["engine", "xl", { year: 3025 }, false], // extinct 2866 to 3034
      ["engine", "xl", { year: 2700 }, true],
      ["engine", "xl-clan", { year: 3060 }, false], // a Clan part for an Inner Sphere unit
      ["engine", "xl-clan", { year: 3060, techBase: "clan" }, true],
      ["structure", "endo-steel", { year: 3040 }, true], // reintroduced
      ["gyro", "heavy-duty", { year: 3066 }, false],
      ["armor", "hardened", { year: 3100 }, false], // Experimental, the unit is Standard
      ["myomer", "standard", { year: 2100 }, true],
      ["gyro", "no-such-gyro", { year: 2100 }, true],
    ];
    expect(parts.map(([kind, key, patch]) => partAvailable(kind, key, record(patch)))).toEqual(parts.map(([, , , expected]) => expected));
  });

  it("applies it to a body type: not before it exists, not above the level, not for a Clan unit, not after it goes extinct", () => {
    const bodies: [string, Partial<MechRecord>, boolean][] = [
      ["quad", { year: 3025 }, true],
      ["tripod", { year: 2500, rulesLevel: "advanced" }, false],
      ["tripod", { year: 3025 }, false],
      ["tripod", { year: 3060, rulesLevel: "advanced", techBase: "clan" }, false],
      ["tripod", { year: 3060, rulesLevel: "advanced" }, true],
      ["lam", { year: 3100, rulesLevel: "experimental" }, false],
    ];
    expect(bodies.map(([key, patch]) => configurationAvailable(key, record(patch)))).toEqual(bodies.map(([, , expected]) => expected));
  });

  it("keeps the part and body type a record already has in its selector, marked, and hides the others it may not have", () => {
    const old = record({ year: 3025 });
    const engines = partChoices("engine", old, "xl");
    expect(engines).toContainEqual(["xl", "XL Fusion (not available here)"]);
    expect(engines.map(([key]) => key)).not.toContain("light");
    expect(partChoices("engine", old, "standard")).not.toContainEqual(expect.arrayContaining(["xl"]));
    expect(configurationChoices(old, "tripod")).toEqual([["biped", "Biped"], ["quad", "Quad"], ["tripod", "Tripod (not available here)"]]);
  });
});

describe("era and year", () => {
  it("keep each other consistent: a year names its era, an era that does not hold the year clears it, and old records read their era from the year", () => {
    const draft = record({ year: 3025 });
    expect(eraOfRecord(draft)?.id).toBe("late-succession-war-renaissance");
    setYear(draft, 3067);
    expect([draft.era, draft.year]).toEqual(["civil-war", 3067]);
    setEra(draft, "civil-war");
    expect(draft.year).toBe(3067);
    setEra(draft, "jihad");
    expect([draft.era, draft.year]).toEqual(["jihad", null]);
    setEra(draft, "no-such-era");
    expect(draft.era).toBeUndefined();
    expect(eraOfRecord({ year: 3067, era: "star-league" })?.id).toBe("civil-war");
    expect(ERAS.map((e) => e.id)).toContain("civil-war");
  });
});

describe("the rules check", () => {
  it("reports what the record uses that its era or year does not allow, and an era the year is not in", () => {
    const found = (patch: Partial<MechRecord>) => runChecks(record(patch), catalog).filter((f) => f.check === "availability" || f.check === "parts").map((f) => f.message);
    expect(found({ year: 3025, chassis: { ...record().chassis, engine: { type: "xl", rating: 200 } } })).toEqual([expect.stringContaining("XL Fusion engine is not available in 3025; its prototype appears in 2556 and it is available 2579 to 2865 and from 3035")]);
    expect(found({ year: null, era: "age-of-war", configuration: "quad", chassis: { ...record().chassis, gyro: "xl" } })).toContainEqual(expect.stringContaining("XL gyro is not available in the Age of War era"));
    expect(found({ year: 3025, era: "star-league" })).toEqual([expect.stringContaining("The era is star-league, but the year 3025 is in the Late Succession War - Renaissance era")]);
  });
});

describe("superheavy parts", () => {
  it("are data only: no BattleMech, tripod or Show everything choice offers a superheavy cockpit or gyro", () => {
    const parts: [PartKind, string][] = [["cockpit", "superheavy"], ["cockpit", "superheavy-industrial"], ["cockpit", "superheavy-tripod"], ["gyro", "superheavy"]];
    for (const configuration of ["biped", "quad", "tripod"]) {
      for (const [kind, key] of parts) expect(partAvailable(kind, key, record({ configuration, rulesLevel: "unlimited", year: 3140 }), true), `${key} on a ${configuration}`).toBe(false);
    }
  });
});

describe("equipment groups", () => {
  it("never offers a BattleMech an item whose `units` leaves out the BattleMech, with or without Show everything", () => {
    const row = { ...catalog.byId("medium-laser-is")!, units: ["vehicle" as const] };
    const unit = record({ year: 3060 });
    expect([equipmentAvailable(row, unit, catalog), equipmentAvailable(row, unit, catalog, true), equipmentAvailable({ ...row, units: ["mech" as const] }, unit, catalog)]).toEqual([false, false, true]);
  });

  it("sorts rows into groups by their ids, ammunition by the weapon family it feeds", () => {
    const ids: [string, string][] = [
      ["medium-laser-is", "energy"],
      ["risc-hyper-laser-is", "energy"],
      ["ultra-ac-5-clan", "ballistic"],
      ["streak-srm-4-is", "missile"],
      ["ammo-lrm-10-is", "ammo-missile"],
      ["ammo-gauss-rifle-clan", "ammo-ballistic"],
      ["double-heat-sink-clan", "heat"],
      ["guardian-ecm-suite-is", "electronics"],
      ["inf-laser-rifle-ebony-assault-is", "infantry"],
      ["turret-is", "vehicle"],
      ["kraken-t-is", "capital"],
      ["heavy-n-ppc-clan", "capital"],
      ["ammo-copperhead-sniper-is", "ammo-artillery"],
      ["ammo-mortar-airburst-clan", "ammo-missile"],
      ["ammo-remote-sensor-dispenser-is", "ammo-other"],
    ];
    expect(ids.map(([id]) => groupOf({ id, kind: id.startsWith("ammo-") ? "ammunition" : "weapon" }).id)).toEqual(ids.map(([, group]) => group));
  });

  it("leaves no row of the table in the catch-all group", () => {
    const loose = catalog.all().filter((row) => groupOf(row).id === "other");
    expect(loose.map((row) => row.id)).toEqual([]);
  });
});

describe("prototype and production dates", () => {
  it("puts a window before the prototype year, in the prototype stretch, or in production", () => {
    const stretch: Span[] = [{ from: 2579 }];
    const cases: [string, Span[] | undefined, number | undefined, { from: number; to: number } | null, string | null][] = [
      ["before the prototype year", stretch, 2556, { from: 2555, to: 2555 }, null],
      ["from the prototype year", stretch, 2556, { from: 2556, to: 2556 }, "prototype"],
      ["the year before production", stretch, 2556, { from: 2578, to: 2578 }, "prototype"],
      ["from the production year", stretch, 2556, { from: 2579, to: 2579 }, "production"],
      ["an era that holds both stretches", stretch, 2556, { from: 2500, to: 2600 }, "production"],
      ["no prototype year", stretch, undefined, { from: 2578, to: 2578 }, null],
      ["no window", stretch, 2556, null, "production"],
    ];
    expect(cases.map(([, spans, prototype, window]) => phaseIn(spans, prototype, window))).toEqual(cases.map(([, , , , expected]) => expected));
  });

  it("offers a prototype only at Experimental level and above, and an item with one date as before", () => {
    const offered = (id: string, year: number, rulesLevel: MechRecord["rulesLevel"]) => offers(id, { year, rulesLevel });
    expect([
      offered("er-large-laser-is", 2609, "experimental"), // prototype 2610, production 2620: not yet a prototype
      offered("er-large-laser-is", 2615, "standard"),
      offered("er-large-laser-is", 2615, "experimental"),
      offered("er-large-laser-is", 2620, "standard"),
      offered("machine-gun-is", 1960, "standard"), // one date printed
    ]).toEqual([false, false, true, true, true]);
  });

  it("keeps the printed level of an item the books print at a lower level in its prototype years", () => {
    const rows = catalog.all().filter((row) => row.prototypeLevel !== undefined);
    expect(rows.map((row) => row.id).sort()).toEqual(["mace-is", "variable-speed-laser-large-is", "variable-speed-laser-medium-is", "variable-speed-laser-small-is"]);
    // The Mace: prototype 3061, production 3079, and Advanced in Tactical Operations: Advanced Units and Equipment.
    expect([offers("mace-is", { year: 3070, rulesLevel: "advanced" }), offers("mace-is", { year: 3070, rulesLevel: "standard" }), offers("chain-whip-is", { year: 3075, rulesLevel: "advanced" }), offers("chain-whip-is", { year: 3075, rulesLevel: "experimental" })]).toEqual([true, false, false, true]);
  });

  it("applies it to a part and to a body type, and labels the prototype in the selector", () => {
    const at = (year: number, rulesLevel: MechRecord["rulesLevel"]) => ({ year, rulesLevel }) as const;
    expect([
      partAvailable("engine", "xl", record(at(2560, "standard"))), // XL: prototype 2556, production 2579
      partAvailable("engine", "xl", record(at(2560, "experimental"))),
      partAvailable("engine", "xl", record(at(2579, "standard"))),
      configurationAvailable("tripod", record(at(2590, "advanced"))), // tripod: prototype 2585, production 2602, an Advanced body
      configurationAvailable("tripod", record(at(2590, "experimental"))),
      configurationAvailable("tripod", record(at(2602, "advanced"))),
    ]).toEqual([false, true, true, false, true, true]);
    expect(partChoices("engine", record(at(2560, "experimental")), "standard")).toContainEqual(["xl", "XL Fusion (prototype 2556, production 2579)"]);
    expect(partChoices("engine", record(at(2600, "experimental")), "standard")).toContainEqual(["xl", "XL Fusion"]);
  });

  it("dates Omni technology: Clan prototype 2854, production 2856; Inner Sphere 3052", () => {
    const omni = (patch: Partial<MechRecord>) => typeAvailable("omnimech", record(patch));
    expect([
      omni({ techBase: "clan", year: 2853, rulesLevel: "experimental" }),
      omni({ techBase: "clan", year: 2855, rulesLevel: "standard" }),
      omni({ techBase: "clan", year: 2855, rulesLevel: "experimental" }),
      omni({ techBase: "clan", year: 2856 }),
      omni({ year: 3051 }),
      omni({ year: 3052 }),
    ]).toEqual([false, false, true, true, false, true]);
    expect([datesText(2854, 2856), datesText(undefined, 3052), datesText(2854, undefined)]).toEqual(["Prototype 2854, production 2856", "Production 3052", "Prototype 2854"]);
  });

  it("says in the rules check what level a prototype needs, and the lowest level that fits counts it", () => {
    const mech = (rulesLevel: MechRecord["rulesLevel"]) => ({ ...record({ year: 2615, rulesLevel }), mounts: [mount("l1", "er-large-laser-is", "RA", null)] });
    const messages = (rulesLevel: MechRecord["rulesLevel"]) => runChecks(mech(rulesLevel), catalog).filter((f) => f.check === "level" || f.check === "availability").map((f) => `${f.level}: ${f.message}`);
    expect(messages("standard")).toEqual([
      expect.stringContaining("note: l1 is a prototype in 2615 (prototype 2610, production 2620); it needs Experimental rules."),
      expect.stringContaining("error: ER Large Laser (equipment) is a prototype in this unit's time (prototype 2610, production 2620), and prototypes are Experimental level; this unit is built at Standard level. It needs Experimental or higher."),
    ]);
    expect(messages("experimental")).toEqual([expect.stringContaining("note: l1 is a prototype in 2615")]);
    expect(lowestLevelFor(mech(undefined), catalog)).toBe("experimental");
  });

  it("holds the years the Universal Technology Advancement Table prints for the Clan items the harvest had inferred", () => {
    const rows = ["tag-clan", "artemis-iv-clan", "double-heat-sink-clan", "masc-clan", "improved-jump-jet-is"].map((id) => catalog.byId(id));
    expect(rows.map((row) => [row?.availability[0]?.from, row?.prototypeYear, row?.yearsInferred])).toEqual([
      [2830, 2828, false],
      [2818, 2816, false],
      [2827, 2825, false],
      [2827, 2820, false],
      [3070, undefined, false],
    ]);
  });

  it("rejects an item whose prototype year is not before its production year", () => {
    const defaults = { kind: "other", techBase: "clan", tons: 1, slots: 1, cite: { book: "TechManual", page: 1 }, checked: "page" } as const;
    expect(() => expand([{ defaults, items: [{ id: "a", name: "A", availability: [{ from: 3000 }], prototypeYear: 3000 }] }])).toThrow("the prototype year is not before the production year");
    expect(expand([{ defaults, items: [{ id: "a", name: "A", availability: [{ from: 3000 }], prototypeYear: 2990 }] }])[0]?.prototypeYear).toBe(2990);
  });
});

describe("the year decides the era, and a dual year the tech base", () => {
  it("offers Clan from 2800 and not 2799, and a year in two eras lets the picked era decide Inner Sphere or Clan", () => {
    const bases = (year: number, era?: string) => techBaseChoices("standard", era === "clan-golden-years" ? "clan" : "inner-sphere", { year, era }).map(([value]) => value);
    expect([bases(2799).includes("clan"), bases(2800).includes("clan")]).toEqual([false, true]);
    expect(erasOfYear(2900).map((e) => e.id)).toEqual(["early-succession-war", "clan-golden-years"]);
    expect(erasOfYear(3060).map((e) => e.id)).toEqual(["clan-invasion"]); // one era: shown as text, no choice
    expect([bases(2900, "clan-golden-years").includes("clan"), bases(2900, "clan-golden-years").includes("inner-sphere")]).toEqual([true, false]);
    expect([bases(2900, "early-succession-war").includes("clan"), bases(2900, "early-succession-war").includes("inner-sphere")]).toEqual([false, true]);
  });

  it("needs a year above Introductory, with an error on the year field, and a yearless record still loads", () => {
    const errors = (patch: Partial<MechRecord>) => runChecks(record({ year: null, ...patch }), catalog).filter((f) => f.where?.field === "year" && f.level === "error");
    expect(errors({ rulesLevel: "standard" })).toHaveLength(1);
    expect(errors({ rulesLevel: "introductory" })).toHaveLength(0);
  });

  it("gives a Clan unit Star League Inner Sphere items as its own, not later ones, and does not flag them as mixed", () => {
    const clan = { techBase: "clan", year: 2900, era: "clan-golden-years" } as const;
    expect([offers("medium-laser-is", clan), offers("ultra-ac-20-is", { ...clan, year: 3060, era: undefined })]).toEqual([true, false]);
    const flagged = (id: string, patch: Partial<MechRecord>) => runChecks(record({ ...patch, mounts: [mount("m", id, "RA", 0)] }), catalog).some((f) => f.check === "availability" && f.level === "error" && f.message.includes("equipment, which a Clan"));
    expect([flagged("medium-laser-is", clan), flagged("ultra-ac-20-is", { ...clan, year: 3060, era: undefined })]).toEqual([false, true]);
  });
});
