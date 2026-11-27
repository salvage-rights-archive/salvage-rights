import { describe, expect, it } from "vitest";
import { ERAS, SUB_ERAS } from "../data/editions";
import { eraChoice, eraList } from "./eraChoice";

const era = (id: string) => {
  const row = [...ERAS, ...SUB_ERAS].find((r) => r.id === id);
  if (!row) throw new Error("era missing");
  return row;
};

describe("eraChoice", () => {
  it("drops the year span on a narrow screen and cuts the name to its last part on a tight one, keeping the whole text as the full name", () => {
    const row = era("late-succession-war-renaissance");
    const full = "Late Succession War - Renaissance (3020-3049)";
    expect(eraChoice(row, 0)).toEqual({ value: row.id, label: full, full });
    expect(eraChoice(row, 1).label).toBe("Late Succession War - Renaissance");
    expect(eraChoice(row, 2)).toEqual({ value: row.id, label: "Renaissance", full });
  });
});

describe("eraList", () => {
  it("is sorted by start year, offers every era and sub-era once to a name, and keeps a held era on offer", () => {
    const all = [...ERAS, ...SUB_ERAS];
    const list = eraList([...all].reverse(), era("jihad"));
    expect(list.map((r) => r.startYear)).toEqual([...list.map((r) => r.startYear)].sort((a, b) => a - b));
    expect(new Set(list.map((r) => r.name)).size).toBe(list.length);
    expect(list.map((r) => r.id).sort()).toEqual(all.map((r) => r.id).sort());
    expect(eraList([era("jihad"), { ...era("jihad"), id: "jihad-twin" }]).map((r) => r.id)).toEqual(["jihad"]);
  });
});
