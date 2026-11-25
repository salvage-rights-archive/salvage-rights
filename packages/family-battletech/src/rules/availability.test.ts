import { beforeAll, describe, expect, it } from "vitest";
import { ERAS } from "../data/editions";
import { configurationAvailable, configurationChoices, equipmentAvailable, eraOfRecord, partAvailable, partChoices, setEra, setYear } from "./availability";
import type { PartKind } from "./availability";
import { groupOf, loadCatalog } from "./catalog";
import type { Catalog } from "./catalog";
import { runChecks } from "./checks";
import { bipedRecord } from "./fixtures";
import type { MechRecord } from "./mech";

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
    expect([offers("lrm-5-clan", { techBase: "inner-sphere", year: 3060 }), offers("lrm-5-clan", { techBase: "clan", year: 3060 }), offers("lrm-5-is", { techBase: "clan", year: 3060 }), offers("lrm-5-is", { techBase: "mixed", year: 3060 })]).toEqual([false, true, false, true]);
  });

  it("hides an item above the unit's level, and Show everything lifts the tech base and the years but never the level", () => {
    const patch = { techBase: "clan", year: 3025, rulesLevel: "standard" } as const;
    expect([offers("ppc-capacitor-is", { year: 3065 }), offers("ppc-capacitor-is", { year: 3065, rulesLevel: "experimental" })]).toEqual([false, true]);
    expect([offers("lrm-5-is", patch), offers("lrm-5-is", patch, true), offers("ppc-capacitor-is", patch, true)]).toEqual([false, true, false]);
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
    expect(found({ year: 3025, chassis: { ...record().chassis, engine: { type: "xl", rating: 200 } } })).toEqual([expect.stringContaining("XL Fusion engine is not available in 3025; it is available 2579 to 2865 and from 3035")]);
    expect(found({ year: null, era: "age-of-war", configuration: "quad", chassis: { ...record().chassis, gyro: "xl" } })).toEqual([expect.stringContaining("XL gyro is not available in the Age of War era")]);
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
