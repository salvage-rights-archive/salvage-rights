import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { makeClean, mordelBiped, mordelWith } from "./fixtures";
import { editRecord, setConfiguration } from "./mech";
import type { MechRecord } from "./mech";
import { fromMordel } from "./mordel";
import { markOfficial, officialLabel, officialState, standardCompliance } from "./official";
import { setYear } from "./availability";

const catalog = await loadCatalog();
const bring = (response: unknown): MechRecord => {
  const result = fromMordel(response, catalog, "total-warfare", "2026-01-01T00:00:00Z", () => "rec");
  if (!result.ok) throw new Error(result.message);
  return result.record;
};
const clean = () => editRecord(bring(mordelBiped()), makeClean);

describe("OFFICIAL", () => {
  it("needs a book, turns NOT OFFICIAL when the design changes and back when the change is undone, and ignores a rename", () => {
    const blank = editRecord(clean(), (d) => void markOfficial(d, "  "));
    expect(officialState(blank)).toEqual({ official: false });
    const marked = editRecord(clean(), (d) => void markOfficial(d, "TechManual", 12));
    expect(officialLabel(officialState(marked))).toEqual({ badge: "OFFICIAL", detail: "TechManual, p. 12" });
    const edits: [string, (d: MechRecord) => void, boolean][] = [
      ["a rename", (d) => void (d.name.model = "TW-2"), true],
      ["notes", (d) => void (d.notes.overview = "Our words."), true],
      ["armor", (d) => void (d.armor.CT = { front: 15, rear: 4 }), false],
      ["a mount", (d) => void d.mounts.pop(), false],
      ["the year", (d) => setYear(d, 3040), false],
    ];
    for (const [what, change, stays] of edits) {
      const after = editRecord(marked, change);
      expect(officialState(after).official, what).toBe(stays);
      if (!stays) expect(officialLabel(officialState(after)).detail, what).toBe("changed from the published design in TechManual");
    }
    expect(officialState(editRecord(editRecord(marked, (d) => void (d.armor.CT = { front: 15 })), (d) => void (d.armor.CT = marked.armor.CT))).official).toBe(true);
  });

  it("is NOT OFFICIAL for a Mordel import, unless Mordel marks the unit canon, and then only until it is changed", () => {
    expect(officialState(bring(mordelBiped()))).toEqual({ official: false });
    const canon = bring(mordelWith(mordelBiped(), { canon: true, sources: [{ title: "A Published Book" }] }));
    expect(officialLabel(officialState(canon)).detail).toBe("A Published Book");
    expect(officialState(editRecord(canon, (d) => void setConfiguration(d, "quad"))).official).toBe(false);
  });
});

describe("standardCompliance", () => {
  it("is yes for a clean Standard 'Mech and names the edition", () => {
    expect(standardCompliance(clean(), catalog)).toMatchObject({ verified: true, edition: "Total Warfare / TechManual" });
  });

  it("says why not: an Advanced item, an error, an unmatched mount, no year or era", () => {
    const cases: [string, (d: MechRecord) => void, RegExp][] = [
      ["an Advanced item", (d) => void (d.chassis.armorType = "hardened"), /Hardened/],
      ["an error", (d) => void (d.armor.CT = { front: 99 }), /./],
      ["an unmatched mount", (d) => void d.mounts.push({ id: "x", equipmentId: null, name: "Mystery Box", techBase: "inner-sphere", location: "CT", slot: 5 }), /Mystery Box/],
      ["no year or era", (d) => void (d.year = null), /no year or era/],
    ];
    for (const [what, change, reason] of cases) {
      const result = standardCompliance(editRecord(clean(), change), catalog);
      expect(result.verified, what).toBe(false);
      if (!result.verified) expect(result.reasons.map((r) => r.text).join("\n"), what).toMatch(reason);
    }
  });
});
