import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { mordelBiped, mordelWith } from "./fixtures";
import { fromMordel } from "./mordel";
import { megamekLink, parseMtfActuators } from "./mtf-actuators";

// Trimmed copies of Mordel's own .mtf exports (limb sections only), one per case.
const fixture = (name: string) => readFileSync(`packages/family-battletech/src/rules/mtf-fixtures/${name}`, "utf8");
const FULL = { lowerArm: true, hand: true };
const catalog = await loadCatalog();

describe("parseMtfActuators", () => {
  it("finds the missing right hand of a Vindicator VND-PE", () => {
    expect(parseMtfActuators(fixture("vindicator-vnd-pe.mtf"))?.arms).toEqual({ LA: FULL, RA: { lowerArm: true, hand: false } });
  });

  it("finds an arm with neither lower arm nor hand actuator, and reports no leg gaps", () => {
    const found = parseMtfActuators(fixture("scarecrow-ucu-f4r.mtf"));
    expect(found?.arms).toEqual({ LA: { lowerArm: false, hand: false }, RA: { lowerArm: false, hand: false } });
    expect(found?.legsMissing).toEqual({});
  });

  it("gives a quad no arms, even when the file lists arm sections", () => {
    const quad = fixture("goliath-gol-3s.mtf");
    expect(parseMtfActuators(quad)?.arms).toEqual({});
    expect(parseMtfActuators(quad + "\nLeft Arm:\nShoulder\nUpper Arm Actuator\n")?.arms).toEqual({});
  });

  it("reads a leg that lacks an actuator, and text that is no 'Mech file as nothing", () => {
    expect(parseMtfActuators("Right Leg:\nHip\nUpper Leg Actuator\nLower Leg Actuator\n")?.legsMissing).toEqual({ RL: ["Foot Actuator"] });
    expect(parseMtfActuators("not a unit file")).toBeUndefined();
  });
});

describe("the .mtf file in the Mordel import", () => {
  it("sets the arms from the file instead of guessing, and says what it left out", () => {
    const mtf = parseMtfActuators(fixture("vindicator-vnd-pe.mtf"));
    const result = fromMordel(mordelBiped(), catalog, "total-warfare", "2026-11-26T00:00:00Z", () => "id-1", "bm", mtf);
    if (!result.ok) throw new Error(result.message);
    expect(result.record.arms).toEqual({ RA: { lowerArm: true, hand: false } });
    expect(result.notes).toEqual(expect.arrayContaining([expect.stringMatching(/\.mtf file leaves out the hand actuator of the Right Arm/)]));
  });

  it("finds the link to the file in the unit's files list", () => {
    const withLink = mordelWith(mordelBiped(), { files: { megamek: "https://www.mordel.net/api/v1/units/bm/1/files/megamek" } });
    expect(megamekLink(withLink)).toBe("https://www.mordel.net/api/v1/units/bm/1/files/megamek");
    expect(megamekLink(mordelBiped())).toBeUndefined();
  });
});
