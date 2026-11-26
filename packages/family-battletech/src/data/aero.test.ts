import { describe, expect, it } from "vitest";
import { AERO_EDITIONS, aeroEditionName, aeroFigures, aeroTypesFor } from "./aero";
import { newer } from "./editions";

describe("the AeroTech editions", () => {
  it("newer() puts the AeroTech 2 errata over AeroTech 2, and Revised over both", () => {
    expect(newer("AeroTech 2", "AeroTech")).toBe("AeroTech 2");
    expect(newer("AeroTech 2: Revised Edition", "AeroTech 2")).toBe("AeroTech 2: Revised Edition");
    expect(newer("Strategic Operations: Advanced Aerospace Rules", "AeroTech 2: Revised Edition")).toBe("Strategic Operations: Advanced Aerospace Rules");
  });

  it.each([
    ["aerotech-1986", ["aerospace-fighter"]],
    ["battlespace", ["dropship", "jumpship", "warship", "space-station"]],
    ["aerotech2", ["conventional-fighter", "aerospace-fighter", "small-craft", "dropship", "jumpship", "warship", "space-station"]],
    ["aerotech2-revised", ["conventional-fighter", "aerospace-fighter", "small-craft", "dropship", "jumpship", "warship", "space-station"]],
    ["tw-tm-so", ["conventional-fighter", "aerospace-fighter", "small-craft", "dropship", "jumpship", "warship", "space-station"]],
  ])("%s builds these unit types, each with a cite and a level only in the current edition", (id, types) => {
    const rows = aeroTypesFor(id);
    expect(rows.map((r) => r.type)).toEqual(types);
    expect(rows.every((r) => r.cite !== "" && r.armor.length > 0 && r.arcs.length > 0)).toBe(true);
    expect(rows.map((r) => r.level)).toEqual(id === "tw-tm-so" ? ["standard", "standard", "standard", "standard", "advanced", "advanced", "advanced"] : rows.map(() => undefined));
    expect(aeroEditionName(id)).not.toBe(id);
  });

  it.each([
    ["aerotech-1986", { min: 10, max: 100, step: 5 }],
    ["aerotech2", { min: 10, max: 100, step: 5 }],
    ["aerotech2-revised", { min: 10, max: 100, step: 5 }],
    ["tw-tm-so", { min: 5, max: 100, step: 5 }],
  ])("%s: the aerospace fighter's weight band", (id, band) => {
    expect(aeroTypesFor(id).find((r) => r.type === "aerospace-fighter")?.weight).toEqual(band);
  });

  it("a hull shape takes its own weight band, and an unknown edition gives an empty list", () => {
    const dropship = aeroTypesFor("tw-tm-so").find((r) => r.type === "dropship");
    expect(dropship && aeroFigures(dropship, "aerodyne").weight.max).toBe(35000);
    expect(dropship && aeroFigures(dropship, "spheroid").weight.max).toBe(100000);
    for (const id of ["battlespace", "aerotech2", "aerotech2-revised", "tw-tm-so"]) {
      const rows = aeroTypesFor(id);
      expect([rows.find((r) => r.type === "warship")?.arcs.includes("LB"), rows.find((r) => r.type === "jumpship")?.arcs.includes("LB")]).toEqual([true, false]); // conflict 49
    }
    expect(aeroTypesFor("no-such-edition")).toEqual([]);
    expect(AERO_EDITIONS).toHaveLength(5);
  });
});
