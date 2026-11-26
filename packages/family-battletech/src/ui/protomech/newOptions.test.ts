import { describe, expect, it } from "vitest";
import { protoNewOptions } from "./newOptions";

describe("the new-unit offer", () => {
  it("offers a ProtoMech by level and year: not before 3055, only at Experimental in the prototype years, from Standard once in production, never at Introductory", () => {
    const offered = (rulesLevel: "introductory" | "standard" | "experimental", year: number | null) => protoNewOptions({ rulesLevel, year, era: undefined, clanOffered: true }).length === 1;
    expect([offered("standard", 3050), offered("experimental", 3050)]).toEqual([false, false]);
    expect([offered("standard", 3057), offered("experimental", 3057)]).toEqual([false, true]);
    expect([offered("standard", 3059), offered("introductory", 3070)]).toEqual([true, false]);
  });
});
