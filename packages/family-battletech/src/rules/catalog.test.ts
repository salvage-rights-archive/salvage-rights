import { describe, expect, it } from "vitest";
import { DEFAULT_EDITION, EDITIONS } from "../data/editions";
import { createCatalog, expand, loadCatalog, type EquipmentGroup } from "./catalog";
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

  it("keeps perMech, yearsInferred and directFire on the expanded row", () => {
    const [row] = expand([{ defaults: { ...OK, yearsInferred: true, directFire: true }, items: [{ id: "tsm-is", name: "TSM", perMech: 6 }] }] as unknown as EquipmentGroup[]);
    expect(row).toMatchObject({ perMech: 6, yearsInferred: true, directFire: true });
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
    expect(ids(catalog.offered("core-2026", { techBase: "inner-sphere", year: 3025 }))).toEqual(["ac-2-is", "jump-jet-is", "ppc-is"]); // the Gauss rifle is in its gap
    expect(ids(catalog.offered("core-2026", { techBase: "clan", year: 3025 }))).toEqual(["er-medium-laser-clan"]);
    expect(ids(catalog.offered("core-2026", { techBase: "mixed", year: 3060 }))).toEqual(
      ["ac-2-is", "er-medium-laser-clan", "er-medium-laser-is", "gauss-rifle-is", "jump-jet-is", "ppc-is"],
    );
    expect(catalog.offered("core-2026", { techBase: "inner-sphere", year: null })).toHaveLength(5);
    expect(catalog.available(row("ac-2-is"), "core-2026", null)).toBe(true);
  });

  it("offers a row that went extinct and was reintroduced before, not during, and after the gap", () => {
    const gauss = row("gauss-rifle-is");
    const answers = [2589, 2590, 2865, 2866, 3039, 3040, 3100].map((year) => catalog.available(gauss, "core-2026", year));
    expect(answers).toEqual([false, true, true, false, false, true, true]);
  });

  it("applies an edition override to that edition only", () => {
    const ppc = row("ppc-is");
    expect(catalog.available(ppc, "test-ed", 2470)).toBe(false);
    expect(catalog.available(ppc, "test-ed", 2500)).toBe(true);
    expect(catalog.available(ppc, "core-2026", 2470)).toBe(true);
    const ppcMount = mount("p", "ppc-is", "RA", 0);
    expect(catalog.factsOf(ppcMount, bipedRecord({ editionId: "test-ed" }))).toEqual({ tons: 8, slots: 3 });
    expect(catalog.factsOf(ppcMount, bipedRecord({ editionId: "core-2026" }))).toEqual({ tons: 7, slots: 3 });
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
      expect(r.cite.book, r.id).toBe("TechManual");
      expect(r.cite.page, r.id).toBeGreaterThan(0);
      expect(r.availability.length, r.id).toBeGreaterThan(0);
      const facts = real.factsOf({ ...mount("m", r.id, null, null), techBase: r.techBase }, record);
      expect(Number.isFinite(facts?.tons), `${r.id} tons`).toBe(true);
      expect(Number.isInteger(facts?.slots), `${r.id} slots`).toBe(true);
    }
  });
});

describe("EDITIONS", () => {
  it("starts with core-2026, a play book and a construction book", () => {
    expect(EDITIONS[0]?.id).toBe("core-2026");
    expect(DEFAULT_EDITION).toBe("core-2026");
    expect(EDITIONS[0]?.books.map((b) => b.role).sort()).toEqual(["construction", "play"]);
    expect(EDITIONS[0]?.unitTypes.find((u) => u.id === "mech")?.ready).toBe(true);
  });
});
