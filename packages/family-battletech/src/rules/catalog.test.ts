import { describe, expect, it } from "vitest";
import { DEFAULT_EDITION, EDITIONS, editionName, newer, playCites } from "../data/editions";
import { ammoLines, createCatalog, expand, inventoryLines, loadCatalog, podMountable, type EquipmentGroup } from "./catalog";
import { bipedRecord, mount } from "./fixtures";

const TM = { book: "TechManual", page: 341 };
const GROUPS: EquipmentGroup[] = [
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: TM, checked: "page", slots: 1 },
    items: [
      { id: "ac-2-is", name: "Autocannon/2", aliases: ["AC/2"], tons: 6, slots: 1, availability: [{ from: 2300 }] },
      { id: "er-medium-laser-is", name: "ER Medium Laser", tons: 1, availability: [{ from: 3058 }] },
      { id: "gauss-rifle-is", name: "Gauss Rifle", tons: 15, slots: 7, availability: [{ from: 2590, to: 2865 }, { from: 3040 }] },
      { id: "er-medium-laser-clan", name: "ER Medium Laser", techBase: "clan", tons: 1, availability: [{ from: 2824 }] },
      {
        id: "ppc-is",
        name: "PPC",
        tons: 7,
        slots: 3,
        availability: [{ from: 2460 }],
        editions: { "test-ed": { tons: 8, availability: [{ from: 2500 }] } },
      },
    ],
  },
  {
    defaults: { kind: "jump-jet", techBase: "inner-sphere", cite: { book: "TechManual", page: 51 }, checked: "page" },
    items: [{ id: "jump-jet-is", name: "Jump Jet", aliases: ["Jump Jets"], tons: "jump-jet", slots: 1, availability: [{ from: 2471 }] }],
  },
];
const ROWS = expand(GROUPS);
const catalog = createCatalog(ROWS);
const row = (id: string) => {
  const found = catalog.byId(id);
  if (!found) throw new Error(`no row ${id} in the test table`);
  return found;
};

describe("expand", () => {
  it("fills an item from its group's defaults and lets the item override them", () => {
    const laser = row("er-medium-laser-is");
    expect(laser).toMatchObject({ kind: "weapon", techBase: "inner-sphere", slots: 1, aliases: [], checked: "page", cite: TM });
    expect(row("er-medium-laser-clan").techBase).toBe("clan");
    expect(row("gauss-rifle-is").slots).toBe(7);
  });

  const OK = { kind: "weapon", techBase: "clan", tons: 1, slots: 1, cite: TM, checked: "page", availability: [{ from: 1 }] };
  it.each([
    ["a duplicate id", { id: "dup-is" }, "dup-is"],
    ["a missing tons", { id: "no-tons-is", tons: undefined }, "no-tons-is"],
    ["a missing cite", { id: "no-cite-is", cite: undefined }, "no-cite-is"],
    ["a formula that is not registered", { id: "formula-is", tons: "no-such-formula" }, "formula-is"],
    ["an empty availability", { id: "empty-is", availability: [] }, "empty-is"],
    ["a span that ends before it starts", { id: "span-is", availability: [{ from: 3000, to: 2999 }] }, "span-is"],
    ["an invalid tech base", { id: "base-is", techBase: "mixed" }, "base-is"],
    ["an invalid kind", { id: "kind-is", kind: "gadget" }, "kind-is"],
  ])("throws naming the id for %s", (_label, change, id) => {
    const item = { ...OK, name: "Item", ...change };
    const groups = [{ defaults: {}, items: [{ ...OK, id: "dup-is", name: "First" }, item] }];
    expect(() => expand(groups as unknown as EquipmentGroup[])).toThrow(id);
  });

  it.each([
    ["a range that runs backwards", { id: "range-is", range: [0, 6, 4, 9] }, "range-is"],    ["a negative heat", { id: "heat-is", heat: -1 }, "heat-is"],
  ])("throws naming the id for %s", (_label, change, id) => {
    const groups = [{ defaults: {}, items: [{ ...OK, name: "Item", ...change }] }];
    expect(() => expand(groups as unknown as EquipmentGroup[])).toThrow(id);
  });

  it("keeps perMech, yearsInferred and directFire on the expanded row", () => {
    const groups = [
      {
        defaults: { ...OK, yearsInferred: true, directFire: true },
        items: [{ id: "tsm-is", name: "TSM", perMech: 6, locations: ["LA"], locationsQuad: ["LT"], editions: { other: { locationsQuad: [] } } }],
      },
    ] as unknown as EquipmentGroup[];
    const rows = expand(groups);
    expect(rows[0]).toMatchObject({ perMech: 6, yearsInferred: true, directFire: true, locations: ["LA"], locationsQuad: ["LT"] });
    const seen = createCatalog(rows);
    expect(seen.offered("other", { techBase: "clan", year: null })[0]?.locationsQuad).toEqual([]);
    expect(seen.offered("total-warfare", { techBase: "clan", year: null })[0]?.locationsQuad).toEqual(["LT"]);
  });
});

describe("match", () => {
  it("finds by name and by alias ignoring case, spacing, hyphens, slashes and periods, within the tech base", () => {
    expect(catalog.match("ER Medium Laser", "inner-sphere")?.id).toBe("er-medium-laser-is");
    expect(catalog.match("er medium laser", "clan")?.id).toBe("er-medium-laser-clan");
    expect(catalog.match("  ER-Medium  Laser ", "inner-sphere")?.id).toBe("er-medium-laser-is");
    expect(catalog.match("ac 2", "inner-sphere")?.id).toBe("ac-2-is"); // alias "AC/2"
    expect(catalog.match("A.C./2", "inner-sphere")?.id).toBe("ac-2-is");
    expect(catalog.match("AC/2", "clan")).toBeUndefined();
    expect(catalog.match("Nothing Like It", "inner-sphere")).toBeUndefined();
  });
});

describe("offered and available", () => {
  const ids = (list: { id: string }[]) => list.map((r) => r.id).sort();

  it("keeps rows of the wanted tech base whose spans contain the year; mixed keeps both; a null year keeps every row", () => {
    expect(ids(catalog.offered("total-warfare", { techBase: "inner-sphere", year: 3025 }))).toEqual(["ac-2-is", "jump-jet-is", "ppc-is"]); // the Gauss rifle is in its gap
    expect(ids(catalog.offered("total-warfare", { techBase: "clan", year: 3025 }))).toEqual(["ac-2-is", "er-medium-laser-clan", "jump-jet-is", "ppc-is"]); // with the Star League rows an Inner Sphere item before 2781 is a Clan unit's own too
    expect(ids(catalog.offered("total-warfare", { techBase: "mixed", year: 3060 }))).toEqual(
      ["ac-2-is", "er-medium-laser-clan", "er-medium-laser-is", "gauss-rifle-is", "jump-jet-is", "ppc-is"],
    );
    expect(catalog.offered("total-warfare", { techBase: "inner-sphere", year: null })).toHaveLength(5);
    expect(catalog.available(row("ac-2-is"), "total-warfare", null)).toBe(true);
  });

  it("offers a row that went extinct and was reintroduced before, not during, and after the gap", () => {
    const gauss = row("gauss-rifle-is");
    const answers = [2589, 2590, 2865, 2866, 3039, 3040, 3100].map((year) => catalog.available(gauss, "total-warfare", year));
    expect(answers).toEqual([false, true, true, false, false, true, true]);
  });

  it("applies an edition override to that edition only", () => {
    const ppc = row("ppc-is");
    expect(catalog.available(ppc, "test-ed", 2470)).toBe(false);
    expect(catalog.available(ppc, "test-ed", 2500)).toBe(true);
    expect(catalog.available(ppc, "total-warfare", 2470)).toBe(true);
    const ppcMount = mount("p", "ppc-is", "RA", 0);
    expect(catalog.factsOf(ppcMount, bipedRecord({ editionId: "test-ed" }))).toEqual({ tons: 8, slots: 3, energy: true });
    expect(catalog.factsOf(ppcMount, bipedRecord({ editionId: "total-warfare" }))).toEqual({ tons: 7, slots: 3, energy: true });
  });

  it("gives a row as an edition sees it, and nothing for an unknown id", () => {
    expect(catalog.rowFor("ppc-is", "test-ed")).toMatchObject({ tons: 8, availability: [{ from: 2500 }] });
    expect(catalog.rowFor("ppc-is", "total-warfare")).toMatchObject({ tons: 7, availability: [{ from: 2460 }] });
    expect(catalog.rowFor("nope", "total-warfare")).toBeUndefined();
  });
});

describe("targeting computer", () => {
  const laser = { kind: "weapon", techBase: "inner-sphere", cite: TM, checked: "page", slots: 2 } as const;
  const tc = createCatalog(
    expand([
      { defaults: { ...laser, directFire: true }, items: [{ id: "laser-is", name: "Laser", tons: 7, availability: [{ from: 1 }] }] },
      { defaults: laser, items: [{ id: "mg-is", name: "MG", tons: 0.5, slots: 1, availability: [{ from: 1 }] }] },
      {
        defaults: { kind: "other", techBase: "inner-sphere", cite: TM, checked: "page", availability: [{ from: 1 }] },
        items: [
          { id: "tc-is", name: "TC", tons: "targeting-computer-is", slots: "targeting-computer-is" },
          { id: "tc-clan", name: "TC", techBase: "clan", tons: "targeting-computer-clan", slots: "targeting-computer-clan" },
        ],
      },
    ]),
  );

  it("weighs the record's direct-fire weapons over 4 or 5, rounded up, ignoring the rest", () => {
    const record = bipedRecord({
      mounts: [mount("a", "laser-is", "RA", 0), mount("b", "laser-is", "LA", 0), mount("c", "mg-is", "RT", 0), mount("d", null, "LT", 0), mount("t", "tc-is", "CT", 0)],
    });
    expect(tc.factsOf(mount("t", "tc-is", "CT", 0), record)).toEqual({ tons: 4, slots: 4 }); // 14 / 4 = 3.5
    expect(tc.factsOf(mount("t", "tc-clan", "CT", 0), record)).toEqual({ tons: 3, slots: 3 }); // 14 / 5 = 2.8
    expect(tc.factsOf(mount("t", "tc-is", "CT", 0), bipedRecord({ mounts: [mount("c", "mg-is", "RT", 0)] }))).toEqual({ tons: 0, slots: 0 });
  });
});

describe("factsOf", () => {
  it("resolves a number and a named formula, and gives undefined for a mount it does not know", () => {
    expect(catalog.factsOf(mount("a", "ac-2-is", "RA", 0), bipedRecord())).toEqual({ tons: 6, slots: 1 });
    expect(catalog.factsOf(mount("j", "jump-jet-is", "CT", 0), bipedRecord({ tons: 50 }))).toEqual({ tons: 0.5, slots: 1 });
    expect(catalog.factsOf(mount("j", "jump-jet-is", "CT", 0), bipedRecord({ tons: 70 }))).toEqual({ tons: 1, slots: 1 });
    expect(catalog.factsOf(mount("j", "jump-jet-is", "CT", 0), bipedRecord({ tons: 100 }))).toEqual({ tons: 2, slots: 1 });
    expect(catalog.factsOf(mount("n", null, "CT", 0), bipedRecord())).toBeUndefined();
    expect(catalog.factsOf(mount("z", "not-a-row", "CT", 0), bipedRecord())).toBeUndefined();
  });
});

describe("the equipment table", () => {
  it("loads, has unique lower-case hyphenated ids, a citation and a span on every row, and resolvable weights", async () => {
    const real = await loadCatalog();
    const all = real.all();
    expect(all.length).toBeGreaterThan(200);
    expect(await loadCatalog()).toBe(real); // cached
    const ids = all.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const record = bipedRecord({ tons: 55 });
    for (const r of all) {
      expect(r.id, r.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(r.cite.book, r.id).not.toBe("");
      expect(r.cite.page, r.id).toBeGreaterThan(0);
      if (r.rulesLevel !== undefined) expect(r.cite, `${r.id} has a rules level but no cite`).toBeDefined();
      expect(r.availability.length, r.id).toBeGreaterThan(0);
      const facts = real.factsOf({ ...mount("m", r.id, null, null), techBase: r.techBase }, record);
      expect(Number.isFinite(facts?.tons), `${r.id} tons`).toBe(true);
      expect(Number.isInteger(facts?.slots), `${r.id} slots`).toBe(true);
    }
  });
});

describe("play statistics", () => {
  // Heat, damage and range as TechManual's Weapons and Equipment tables (printed pp. 341-343) print them.
  it.each([
    ["medium-laser-is", 3, "5", [0, 3, 6, 9]],
    ["large-laser-is", 8, "8", [0, 5, 10, 15]],
    ["ppc-is", 10, "10", [3, 6, 12, 18]],
    ["ac-10-is", 3, "10", [0, 5, 10, 15]],
    ["lrm-20-is", 6, "1/Msl", [6, 7, 14, 21]],
    ["srm-6-is", 4, "2/Msl", [0, 3, 6, 9]],
    ["er-large-laser-clan", 12, "10", [0, 8, 15, 25]],
    ["gauss-rifle-is", 1, "15", [2, 7, 15, 22]],
    ["heavy-machine-gun-is", 0, "3", [0, 1, 2, 0]],
    ["heavy-machine-gun-clan", 0, "3", [0, 1, 2, 0]],
  ])("%s prints the book's heat, damage and range", async (id, heat, damage, range) => {
    expect((await loadCatalog()).byId(id)).toMatchObject({ heat, damage, range });
  });

  const STATS = createCatalog(
    expand([
      {
        defaults: { kind: "weapon", techBase: "inner-sphere", cite: TM, checked: "page", tons: 1, slots: 1, availability: [{ from: 1 }] },
        items: [
          { id: "ml", name: "Medium Laser", heat: 3, damage: "5", range: [0, 3, 6, 9] },
          { id: "ppc", name: "PPC", heat: 10, damage: "10", range: [3, 6, 12, 18] },
          { id: "mg", name: "Machine Gun" },
          { id: "hmg", name: "Heavy Machine Gun", heat: 0, damage: "3", range: [0, 1, 2, 0] },
        ],
      },
      {
        defaults: { kind: "ammunition", techBase: "inner-sphere", cite: TM, checked: "page", tons: 1, slots: 1, availability: [{ from: 1 }] },
        items: [
          { id: "ammo-ac", name: "AC/10 Ammo", shotsPerTon: 10 },
          { id: "ammo-mg-half", name: "MG Ammo (Half Ton)", shots: 100, tons: 0.5 },
          { id: "ammo-none", name: "Other Ammo" },
        ],
      },
    ]),
  );

  it("lists one line per weapon per location in record-sheet order, with dashes for what is missing", () => {
    const record = bipedRecord({
      mounts: [
        mount("p", "ppc", "RA", 0),
        mount("m1", "ml", "LA", 0),
        mount("m2", "ml", "LA", 1),
        mount("x", null, "CT", 0),
        mount("g", "mg", "HD", 0),
        mount("h", "hmg", "CT", 1),
        mount("a", "ammo-ac", "LT", 0),
        mount("u", "ml", null, null),
      ],
    });
    expect(inventoryLines(record, STATS)).toEqual([
      { qty: 1, name: "Machine Gun", location: "HD", heat: "—", damage: "—", min: "—", short: "—", medium: "—", long: "—" },
      { qty: 1, name: "Heavy Machine Gun", location: "CT", heat: "0", damage: "3", min: "—", short: "1", medium: "2", long: "—" },
      { qty: 1, name: "x", location: "CT", heat: "—", damage: "—", min: "—", short: "—", medium: "—", long: "—" },
      { qty: 2, name: "Medium Laser", location: "LA", heat: "3", damage: "5", min: "—", short: "3", medium: "6", long: "9" },
      { qty: 1, name: "PPC", location: "RA", heat: "10", damage: "10", min: "3", short: "6", medium: "12", long: "18" },
      { qty: 1, name: "Medium Laser", location: "—", heat: "3", damage: "5", min: "—", short: "3", medium: "6", long: "9" },
    ]);
  });

  it("lists a rear-firing weapon as its own line after the forward ones, in a location written like LT(R)", () => {
    const record = bipedRecord({ mounts: [mount("f", "ml", "LT", 0), { ...mount("r", "ml", "LT", 1), rear: true }, mount("f2", "ml", "LT", 2)] });
    expect(inventoryLines(record, STATS).map((l) => [l.qty, l.name, l.location])).toEqual([
      [2, "Medium Laser", "LT"],
      [1, "Medium Laser", "LT(R)"],
    ]);
  });

  it("sums an ammunition item's shots over its bins and gives null where the row has no figure", () => {
    const record = bipedRecord({
      mounts: [mount("a1", "ammo-ac", "LT", 0), mount("a2", "ammo-ac", "RT", 0), mount("h", "ammo-mg-half", "CT", 0), mount("n", "ammo-none", "LL", 0)],
    });
    expect(ammoLines(record, STATS)).toEqual([
      { name: "AC/10 Ammo", shots: 20 },
      { name: "MG Ammo (Half Ton)", shots: 100 },
      { name: "Other Ammo", shots: null },
    ]);
  });
});

describe("conventional infantry weapons", () => {
  // TechManual Conventional Infantry Weapons Table (printed pp. 349-352): damage is per trooper, range is a Base Range.
  it.each([
    ["inf-bow-compound-is", { mode: "Melee", baseRange: 0, damage: 0.01, shots: "1" }, 0.001],
    ["inf-grenade-launcher-is", { mode: "Support", baseRange: 1, damage: 0.81, inferno: 0.34, shots: "10" }, 0.005],
    ["inf-laser-pistol-er-clan", { size: "Small", baseRange: 1, damage: 0.21, clip: "cells" }, 0.001],
    ["inf-particle-cannon-support-is", { size: "Medium", baseRange: 3, damage: 1.58, crew: "5" }, 1.8],
  ])("%s carries the book's per-trooper figures", async (id, infantry, tons) => {
    expect((await loadCatalog()).byId(id)).toMatchObject({ units: ["infantry"], kind: "weapon", slots: 0, tons, infantry });
  });

  it("is offered to infantry only: every infantry row names its unit type and no BattleMech picker lists one", async () => {
    const real = await loadCatalog();
    const rows = real.all().filter((r) => r.infantry !== undefined);
    expect(rows.length).toBeGreaterThan(250);
    expect(rows.every((r) => r.units?.length === 1 && r.units[0] === "infantry")).toBe(true);
    expect(real.offered("total-warfare", { techBase: "mixed", year: null }).filter((r) => r.infantry)).toEqual([]);
  });
});

describe("TechManual weapons table: the other unit types' columns (printed pp. 341-343)", () => {
  // The Space columns (NA leaves a unit type out; another number is that unit type's slots) and the Aero values in parentheses, which
  // agree with Total Warfare's Aero Attack Value and Aerospace Range columns (printed p. 303).
  it.each([
    ["medium-laser-is", ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "abomination"], { aero: { rangeClass: "Short" } }],
    ["lrm-5-is", ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "abomination"], { aero: { damage: "3", rangeClass: "Long" } }],
    ["ultra-ac-5-is", ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], { vehicle: { slots: 1 }, aero: { slots: 1, heat: 2, damage: "7", rangeClass: "Long" } }],
    ["lb-2-x-ac-clan", ["mech", "industrialmech", "vehicle", "protomech", "aero", "smallcraft", "dropship"], { protomech: { slots: 1 } }],
    ["bay-door-is", ["vehicle", "smallcraft", "dropship"], {}], // Industrial Equipment table, printed p. 344: CV, SV, SC and DS columns
    ["cargo-container-is", ["industrialmech", "vehicle", "aero", "smallcraft", "dropship"], { aero: { slots: 0 }, dropship: { slots: 0 } }], // the table's F, SC and DS columns print 0
  ])("%s", async (id, units, by) => {
    const row = (await loadCatalog()).byId(id);
    expect(row?.units).toEqual(units);
    expect(row?.by).toMatchObject(by);
  });
});

describe("Interstellar Operations: Alternate Eras unit-type columns", () => {
  // The Space columns of the Additional Alternate Era table (printed pp. 211, 213, 215): NA leaves the unit type out; a number that differs
  // from the 'Mech's is the slots on that unit type.
  it.each([
    ["primitive-prototype-ac-5-is", ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "ship", "building"], { vehicle: { slots: 1, note: "Support vehicle: 4 slots" }, aero: { slots: 1 } }],
    ["prototype-case-is", ["mech", "industrialmech", "vehicle", "aero"], { aero: { slots: 0 } }],
  ])("%s may be mounted only on the unit types whose column is not NA", async (id, units, by) => {
    const row = (await loadCatalog()).byId(id);
    expect(row?.units).toEqual(units);
    expect(row?.by).toMatchObject(by);
  });
});

describe("missile munitions from TO:AUE pp. 226-229 and IO:AE p. 213", () => {
  // id, tech base, first year, rules level, launcher families, the Ammo (per Ton) multiplier
  it.each([
    ["ammo-heat-seeking-lrm-is", "inner-sphere", 2340, "advanced", ["lrm", "mml"], 0.5],
    ["ammo-smoke-lrm-clan", "clan", 2825, "advanced", ["lrm", "mml"], undefined],
    ["ammo-tandem-charge-srm-is", "inner-sphere", 2757, "experimental", ["srm", "mml"], 0.5],
    ["ammo-dead-fire-srm-is", "inner-sphere", 3052, "experimental", ["srm", "mml"], undefined],
  ])("%s is a one-ton bin of the launcher's ammunition at the printed date and level", async (id, techBase, from, rulesLevel, feeds, shotsFactor) => {
    const row = (await loadCatalog()).byId(id);
    expect(row).toMatchObject({ kind: "ammunition", techBase, rulesLevel, feeds, tons: 1, slots: 1 });
    expect(row?.availability[0]?.from).toBe(from);
    expect(row?.shotsFactor).toBe(shotsFactor);
  });

  it.each([
    ["srt-6-is", "srm-6-is", "ammo-srt-6-is", 2380],
    ["lrt-20-clan", "lrm-20-clan", "ammo-lrt-20-clan", 2824],
  ])("%s is the launcher %s fitted as a torpedo launcher, with its own ammunition (TechManual p. 230)", async (id, launcher, ammo, from) => {
    const real = await loadCatalog();
    const row = real.byId(id);
    const base = real.byId(launcher);
    expect({ tons: row?.tons, slots: row?.slots, heat: row?.heat, damage: row?.damage, range: row?.range, vehicle: row?.by?.vehicle }).toEqual({ tons: base?.tons, slots: base?.slots, heat: base?.heat, damage: base?.damage, range: base?.range, vehicle: base?.by?.vehicle });
    expect(row?.availability[0]?.from).toBe(from);
    expect(real.byId(ammo)?.shotsPerTon).toBe(real.byId(launcher.replace(/^/, "ammo-"))?.shotsPerTon);
  });

  it("a bin of a half-count munition carries half the launcher's shots on the record", async () => {
    const real = await loadCatalog();
    const record = bipedRecord({ mounts: [mount("l", "lrm-10-is", "RT", 0), mount("a", "ammo-heat-seeking-lrm-is", "LT", 0), mount("s", "ammo-smoke-lrm-is", "CT", 0)] });
    expect(ammoLines(record, real).map((l) => [l.name, l.shots])).toEqual([["Heat-Seeking LRM Ammo", 6], ["Smoke LRM Ammo", 12]]); // LRM 10 carries 12 a ton
  });
});

describe("Tactical Operations: Advanced Units and Equipment unit-type columns (printed pp. 217, 219, 221, 223)", () => {
  // The Space columns of the Heavy Weapons and Equipment Construction Data: NA leaves the unit type out; a number that differs from the Mech column is the slots there.
  it.each([
    ["rotary-ac-5-clan", ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "ship", "building"], { vehicle: { slots: 1, note: "Support vehicle: 8 slots" }, aero: { slots: 1 } }],
    ["heavy-flamer-clan", ["mech", "industrialmech", "vehicle", "protomech", "building"], {}],
    ["light-mass-driver-is", ["ship"], {}],
    ["hyperspectral-imager-is", ["vehicle", "aero", "smallcraft", "dropship", "ship", "building"], { vehicle: { note: "Support vehicle: 2 slots" } }],
    ["vtol-mast-mount-clan", ["vehicle"], {}],
  ])("%s may be mounted only on the unit types whose column is not NA", async (id, units, by) => {
    const row = (await loadCatalog()).byId(id);
    expect(row?.units).toEqual(units);
    expect(row?.by ?? {}).toMatchObject(by);
  });
});

describe("rows an OmniMech cannot pod-mount (TechManual p.53, TO:AUE pp.87-112 and 148-160, IO:AE pp.83-88)", () => {
  it("are flagged pod: false with the page that says so, and the items the books let a pod carry are not", async () => {
    const catalog = await loadCatalog();
    const flagged = catalog.all().filter((row) => row.pod === false);
    expect(flagged.every((row) => row.podCite !== undefined)).toBe(true);
    expect(flagged.map((row) => [row.id, row.podCite?.page])).toEqual(
      expect.arrayContaining([["masc-is", 53], ["masc-clan", 53], ["tsm-is", 53], ["aes-arm-is", 90], ["blue-shield-is", 108], ["partial-wing-clan", 104], ["chameleon-lps-is", 112], ["null-signature-system-is", 148], ["void-signature-system-is", 160], ["harjel-iii-clan", 83], ["risc-emergency-coolant-system-is", 86], ["super-cooled-myomer-is", 88]]),
    );
    for (const id of ["supercharger-is", "case-ii-is", "radical-heat-sink-is", "jump-jet-is", "double-heat-sink-clan", "case-is"]) {
      const row = catalog.byId(id);
      expect([id, row !== undefined && podMountable(row)]).toEqual([id, true]);
    }
    expect(() => expand([{ defaults: { kind: "other", techBase: "clan", tons: 1, slots: 1, availability: [{ from: 3000 }], cite: { book: "b", page: 1 }, checked: "page" }, items: [{ id: "x-clan", name: "X", pod: false }] }])).toThrow("no page says so");
  });
});

describe("EDITIONS", () => {
  it("offers Total Warfare and the Core Rulebook, each with a play book and the one construction book, and defaults to Total Warfare", () => {
    expect(EDITIONS.map((e) => e.id)).toEqual(["total-warfare", "bcr-tm"]);
    expect(DEFAULT_EDITION).toBe("total-warfare");
    for (const edition of EDITIONS) expect(edition.books.map((b) => b.role).sort()).toEqual(["construction", "play"]);
    expect(EDITIONS.map((e) => e.books.find((b) => b.role === "construction")?.title)).toEqual(["TechManual", "TechManual"]);
    expect(EDITIONS[0]?.unitTypes.find((u) => u.id === "mech")?.ready).toBe(true);
  });

  it("names the edition on a sheet line and cites its own play book's pages", () => {
    expect(editionName("bcr-tm")).toBe("Core Rulebook (BCR) / TechManual");
    expect(playCites("total-warfare")).toContain("Total Warfare (Catalyst Game Labs): weapon figures p. 303-304");
    expect(playCites("bcr-tm")).toContain("target movement modifier p. 68");
  });

  it("applies a row's bcr-tm override only under that edition, from the real table", async () => {
    const catalog = await loadCatalog();
    expect(catalog.rowFor("lb-10-x-ac-is", "total-warfare")?.type).toBe("DB, C/S/F");
    expect(catalog.rowFor("lb-10-x-ac-is", "bcr-tm")?.type).toBe("DB, S");
    expect(catalog.rowFor("lb-10-x-ac-is", "bcr-tm")?.heat).toBe(catalog.rowFor("lb-10-x-ac-is", "total-warfare")?.heat);
  });
});

describe("newer: the book whose printing or errata is latest wins a disagreement", () => {
  it.each([
    ["TechManual", "Tactical Operations: Advanced Units and Equipment", "TechManual"], // errata 22 Aug 2024 over the 2024-06 printing
    ["Tactical Operations: Advanced Units and Equipment", "Interstellar Operations: Alternate Eras", "Tactical Operations: Advanced Units and Equipment"],
    ["Total Warfare", "BattleTech Core Rulebook", "BattleTech Core Rulebook"],
    ["TechManual", "TechManual", undefined],
    ["TechManual", "A Book Not Listed", undefined],
  ])("%s against %s: %s", (a, b, expected) => {
    expect(newer(a, b)).toBe(expected);
    expect(newer(b, a)).toBe(expected);
  });
});
