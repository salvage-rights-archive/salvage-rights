import { describe, expect, it } from "vitest";
import { fixtureFamily } from "./test-fixtures";
import { startupProblems } from "./startup";

describe("startupProblems", () => {
  it("is empty for valid families and names the family of each problem", () => {
    expect(startupProblems([fixtureFamily("one"), fixtureFamily("two")])).toEqual([]);

    const broken = fixtureFamily("broken", { name: "" });
    const problems = startupProblems([fixtureFamily("one"), broken, fixtureFamily("one")]);
    expect(problems).toContain("broken: manifest.name must not be empty");
    expect(problems.some((p) => p.includes('duplicate family id "one"'))).toBe(true);
  });
});
