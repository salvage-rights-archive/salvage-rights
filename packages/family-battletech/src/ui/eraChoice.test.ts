import { describe, expect, it } from "vitest";
import { ERAS } from "../data/editions";
import { eraChoice } from "./eraChoice";

describe("eraChoice", () => {
  it("drops the year span on a narrow screen and cuts the name to its last part on a tight one, keeping the whole text as the full name", () => {
    const era = ERAS.find((row) => row.id === "late-succession-war-renaissance");
    if (!era) throw new Error("era missing");
    const full = "Late Succession War - Renaissance (3020-3049)";
    expect(eraChoice(era, 0)).toEqual({ value: era.id, label: full, full });
    expect(eraChoice(era, 1).label).toBe("Late Succession War - Renaissance");
    expect(eraChoice(era, 2)).toEqual({ value: era.id, label: "Renaissance", full });
  });
});
