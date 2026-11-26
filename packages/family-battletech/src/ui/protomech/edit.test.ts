import { describe, expect, it } from "vitest";
import { newProtoRecord } from "../../rules/protomech/record";
import { setChassis } from "./edit";

describe("choosing a chassis", () => {
  it("clears the arm armor of a quad, and the jump, wing and booster of a glider, which is built from 10 tons", () => {
    const quad = newProtoRecord({ tons: 8 });
    quad.armor.la = 3;
    quad.armor.ra = 3;
    setChassis(quad, "quad");
    expect([quad.configuration, quad.armor.la, quad.armor.ra]).toEqual(["quad", 0, 0]);
    const glider = { ...newProtoRecord({ tons: 6 }), jump: 2, booster: true, partialWing: true as const, jumpType: "xjj" };
    setChassis(glider, "glider");
    expect([glider.configuration, glider.tons, glider.jump, glider.booster, glider.partialWing, glider.jumpType]).toEqual(["glider", 10, 0, false, undefined, undefined]);
    setChassis(glider, "biped");
    expect(glider.configuration).toBeUndefined();
  });
});
