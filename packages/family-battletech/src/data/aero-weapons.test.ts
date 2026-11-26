import { describe, expect, it } from "vitest";
import { loadCatalog } from "../rules/catalog";
import { AERO_WEAPON_EDITIONS as E, AT1_WEAPONS, AT2_WEAPONS, AT2R_WEAPONS, OVERLAY_FIELDS, aeroCatalogFigures, aeroWeaponFigures, aeroWeaponOffered } from "./aero-weapons";

const catalog = await loadCatalog();
const baseOf = (id: string) => aeroCatalogFigures(catalog, id.replace(/\+artemis$/, ""));

describe("the aerospace weapon tables", () => {
  it("no overlay field repeats the value beneath it, the catalog's or (for Revised) AeroTech 2's, and every row is a listed catalog item", () => {
    const repeats: string[] = [];
    const strays: string[] = [];
    for (const [edition, rows, beneath] of [
      [E.at2, AT2_WEAPONS, (id: string) => baseOf(id)],
      [E.at2r, AT2R_WEAPONS, (id: string) => ({ ...baseOf(id), ...AT2_WEAPONS[id] })],
    ] as const) {
      for (const [id, row] of Object.entries(rows)) {
        const under: Record<string, unknown> = { ...beneath(id) };
        if (!catalog.byId(id.replace(/\+artemis$/, "")) || !aeroWeaponOffered(edition, id)) strays.push(`${edition} ${id}`);
        for (const field of OVERLAY_FIELDS) if (field in row && row[field] === under[field]) repeats.push(`${edition} ${id} ${field}`);
      }
    }
    expect(strays).toEqual([]);
    expect(repeats).toEqual([]);
  });

  it.each([
    ["small-laser-is", 1, "3", [0, 1, 2, 3], 0.5, undefined],
    ["medium-laser-is", 3, "5", [0, 3, 6, 9], 1, undefined],
    ["large-laser-is", 8, "8", [0, 5, 10, 15], 5, undefined],
    ["ppc-is", 10, "10", [3, 6, 12, 18], 7, undefined],
    ["ac-2-is", 1, "2", [4, 8, 16, 24], 6, 45],
    ["ac-5-is", 1, "5", [3, 6, 12, 18], 8, 20],
    ["ac-10-is", 3, "10", [0, 5, 10, 15], 12, 10],
    ["ac-20-is", 7, "20", [0, 3, 6, 9], 14, 5],
    ["machine-gun-is", 0, "2", [0, 1, 2, 3], 0.5, 200],
    ["flamer-is", 3, "2", [0, 1, 2, 3], 1, undefined],
    ["lrm-5-is", 2, "1/Msl", [6, 7, 14, 21], 2, 24],
    ["lrm-10-is", 4, "1/Msl", [6, 7, 14, 21], 5, 12],
    ["lrm-15-is", 5, "1/Msl", [6, 7, 14, 21], 7, 8],
    ["lrm-20-is", 6, "1/Msl", [6, 7, 14, 21], 10, 6],
    ["srm-2-is", 2, "2/Msl", [0, 3, 6, 9], 1, 50],
    ["srm-4-is", 3, "2/Msl", [0, 3, 6, 9], 2, 25],
    ["srm-6-is", 4, "2/Msl", [0, 3, 6, 9], 3, 15],
  ])("AeroTech (1986) p. 15 prints %s as the catalog holds it (heat %d, damage %s, ranges %j, %f tons, %s shots)", (id, heat, damage, hexRange, tons, shots) => {
    expect(AT1_WEAPONS.ids).toContain(id);
    expect(aeroWeaponFigures(catalog, id, E.at1)).toEqual({ id, heat, attack: damage, hexRange, tons, ...(shots ? { ammoPerTon: shots } : {}) });
  });

  it.each([
    [E.at2, "srm-4-is", { attack: 6, maxRange: "Short" }],
    [E.at2r, "srm-4-is", { attack: 6 }],
    [E.at2, "ultra-ac-10-is", { maxRange: "Long" }],
    [E.at2r, "ultra-ac-10-is", { maxRange: "Medium" }],
    [E.at2, "srm-2-is+artemis", { attack: 4, tons: 2, heat: 2 }],
    [E.at2r, "srm-2-is+artemis", { attack: 2, tons: 2 }],
    [E.at2, "srm-6-is+artemis", { attack: 1, note: expect.stringContaining("misprint") }],
    [E.at2r, "srm-6-is+artemis", { attack: 8 }],
    [E.at2, "ams-is", { bayClass: "AMS", attack: 3 }],
    [E.at2, "rocket-launcher-10-is", undefined],
    [E.at2r, "rocket-launcher-10-is", { bayClass: "Rocket Launcher", heat: 0, attack: 6, maxRange: "Medium", tons: 0.5 }],
    [E.at2r, "arrow-iv-is", { bayClass: "Artillery", heat: 10, attack: 20, maxRange: "Extreme", tons: 15, ammoPerTon: 5 }],
    [E.at2r, "srm-6-clan+artemis", { attack: 8, tons: 4 }],
  ])("%s prints %s as %j", (edition, id, expected) => {
    const figures = aeroWeaponFigures(catalog, id, edition);
    if (expected === undefined) expect(figures).toBeUndefined();
    else expect(figures).toMatchObject(expected);
  });

  it("the current edition reads the catalog: by.aero, else the capital columns, else the ground figures; pairs and unlisted items are not offered", () => {
    expect(aeroWeaponFigures(catalog, "lb-5-x-ac-is", E.current)).toMatchObject({ bayClass: "LB-X AC", heat: 1, attack: 3, maxRange: "Long", tons: 8, ammoPerTon: 20 });
    expect(aeroWeaponFigures(catalog, "ams-is", E.current)).toMatchObject({ bayClass: "Point Defense", attack: "Special", ammoPerTon: 12 });
    expect(aeroWeaponFigures(catalog, "killer-whale-is", E.current)).toMatchObject({ bayClass: "Capital Missile", heat: 20, maxRange: "Extreme", tonsPerShot: 50 });
    expect(aeroWeaponFigures(catalog, "srm-2-is+artemis", E.current)).toBeUndefined();
    expect(aeroWeaponFigures(catalog, "arrow-iv-is", E.current)).toBeUndefined();
    expect(aeroWeaponFigures(catalog, "no-such-weapon", E.current)).toBeUndefined();
  });

  it("the bombs, bay doors and look-down radars the books print are catalog rows an aerospace unit may mount", () => {
    for (const id of ["bomb-high-explosive-is", "bomb-cluster-clan", "bomb-mines-is", "bomb-inferno-clan"]) expect(catalog.byId(id)?.units).toEqual(["aero"]);
    expect(catalog.byId("bomb-laser-guided-is")?.availability).toEqual([{ from: 1950, to: 2800 }, { from: 3060 }]);
    expect(catalog.byId("bay-door-is")).toMatchObject({ tons: 0, units: ["smallcraft", "dropship"] });
    expect(catalog.byId("look-down-radar-clan")).toMatchObject({ tons: 5, units: ["aero", "smallcraft", "dropship"] });
  });

  it("every weapon an aerospace unit may mount has a bay class, as does every capital weapon but the mass drivers", () => {
    const missing = catalog
      .all()
      .filter((r) => r.kind === "weapon" && !r.id.includes("mass-driver"))
      .filter((r) => r.by?.aero?.rangeClass !== undefined || r.type === "CAP, AE")
      .filter((r) => r.bayClass === undefined)
      .map((r) => r.id);
    expect(missing).toEqual([]);
  });
});
