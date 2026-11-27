// The AeroTech year and era rule: the same one Classic builds with, read through Classic's functions.
import { describe, expect, it } from "vitest";
import { newAeroRecord } from "../../rules/aero";
import type { AeroRecord } from "../../rules/aero";
import { loadCatalog } from "../../rules/catalog";
import { draftMissing, newDraft, offeredEquipment, settle, techBasesFor, typesAt, yearErasOf } from "./edit";

const catalog = await loadCatalog();
const unit = (editionId: string, build: Partial<AeroRecord>): AeroRecord => ({ ...newAeroRecord({ id: "u", unitType: "aerospace-fighter", tons: 50, safeThrust: 5, rulesLevel: "advanced" }, editionId), ...build });
const ids = (record: AeroRecord) => offeredEquipment(record, catalog).map((row) => row.id);

describe("AeroTech year and era", () => {
  it("the tech bases follow the year and the era picked: no Clans before the Clan sub-eras, the picked era decides in a year in two, older editions the same without a level", () => {
    expect(techBasesFor(unit("tw-tm-so", { year: 2750, techBase: "inner-sphere" }))).toEqual(["inner-sphere"]);
    expect(techBasesFor(unit("tw-tm-so", { year: 3000, era: "clan-golden-years", techBase: "inner-sphere" }))).toEqual(["inner-sphere", "clan"]);
    expect(techBasesFor(unit("tw-tm-so", { year: 3000, era: "late-succession-war-lostech", techBase: "inner-sphere" }))).toEqual(["inner-sphere"]);
    expect(techBasesFor(unit("aerotech2", { year: 3060, techBase: "inner-sphere" }))).toEqual(["inner-sphere", "clan", "mixed"]);
    expect(techBasesFor(unit("aerotech2", { year: 2750, techBase: "inner-sphere" }))).toEqual(["inner-sphere"]);
    expect(techBasesFor(unit("aerotech-1986", { year: 3060, techBase: "inner-sphere" }))).toEqual(["inner-sphere"]);
  });

  it("a Clan unit keeps the Star League items built before 2781 and gets no later Inner Sphere ones, while an Inner Sphere unit has both", () => {
    const clan = ids(unit("tw-tm-so", { year: 3000, era: "clan-golden-years", techBase: "clan" }));
    expect(clan).toContain("medium-laser-is");
    expect(clan).not.toContain("lb-5-x-ac-is");
    expect(ids(unit("tw-tm-so", { year: 3070, techBase: "inner-sphere" }))).toEqual(expect.arrayContaining(["medium-laser-is", "lb-5-x-ac-is"]));
  });

  it("the new-unit form needs a year above Introductory and takes the era of a year in two from the tech base, and asks for neither in the older books", () => {
    const form = settle({ ...newDraft(), chassis: "Wasp" });
    expect(draftMissing(form)).toContain("A year is needed");
    expect(draftMissing(settle({ ...form, rulesLevel: "introductory" }))).toBe("");
    const two = settle({ ...form, year: 3000 });
    expect(yearErasOf(two).length).toBeGreaterThan(1);
    expect([two.era, draftMissing(two)]).toEqual(["late-succession-war-lostech", ""]);
    const picked = settle({ ...two, era: "clan-golden-years" });
    expect(draftMissing(picked)).toBe("");
    expect(settle({ ...picked, techBase: "clan" }).techBase).toBe("clan");
    expect(settle({ ...picked, year: 2750 }).techBase).toBe("inner-sphere");
    expect(draftMissing(settle(newDraft("aerotech2")))).toBe("");
  });

  it("a type above the level is not offered", () => {
    expect(typesAt({ editionId: "tw-tm-so", rulesLevel: "standard" }).map((t) => t.type)).not.toContain("warship");
    expect(typesAt({ editionId: "tw-tm-so", rulesLevel: "advanced" }).map((t) => t.type)).toContain("warship");
  });
});
