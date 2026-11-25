import { describe, expect, it } from "vitest";
import { formatDamage, formatMove, formatSpecials, newAsUnit, parseDamage, parseMove, parseSpecials, unitFindings } from "./as-unit";
import type { AsDamage, AsSpecial, AsUnit } from "./as-unit";

/** A special without its `raw` text, so a row states only the code, values and inner specials. */
const bare = (s: AsSpecial): object => ({ code: s.code, values: s.values, ...(s.inner ? { inner: s.inner.map(bare) } : {}) });

describe("Alpha Strike unit text forms", () => {
  it.each([
    ['8"', [{ inches: 8, mode: "" }], '8"'],
    ['8"/6"j', [{ inches: 8, mode: "" }, { inches: 6, mode: "j" }], '8"/6"j'],
    ["10 t", [{ inches: 10, mode: "t" }], '10"t'],
    ["", [], ""],
  ])("reads the move %j", (text, move, canonical) => {
    expect(parseMove(text)).toEqual({ ok: true, value: move });
    expect(formatMove(move)).toBe(canonical);
  });

  it("refuses a move that is not inches", () => {
    expect(parseMove("fast")).toEqual({ ok: false });
  });

  it.each([
    ["3", { value: 3 }, "3"],
    ["0", { value: 0 }, "0"],
    ["0*", { value: 0, minimal: true }, "0*"],
    ["-", null, "-"],
    ["", null, "-"],
  ] as [string, AsDamage, string][])("reads the damage %j", (text, damage, canonical) => {
    expect(parseDamage(text)).toEqual({ ok: true, value: damage });
    expect(formatDamage(damage)).toBe(canonical);
  });

  it.each(["2*", "x", "1/2"])("refuses the damage %j", (text) => {
    expect(parseDamage(text)).toEqual({ ok: false });
  });

  it.each([
    ["IF1", [{ code: "IF", values: ["1"] }]],
    ["CASE, ENE", [{ code: "CASE", values: [] }, { code: "ENE", values: [] }]],
    ["LRM1/1/0", [{ code: "LRM", values: ["1", "1", "0"] }]],
    ["BHJ2, C3BSM", [{ code: "BHJ2", values: [] }, { code: "C3BSM", values: [] }]],
    ["SDS-C, ARTAC-1", [{ code: "SDS-C", values: [] }, { code: "ARTAC", values: ["1"] }]],
    ["TUR(2/2/1, IF1)", [{ code: "TUR", values: ["2", "2", "1"], inner: [{ code: "IF", values: ["1"] }] }]],
    ["XYZ3", [{ code: "XYZ", values: ["3"] }]],
  ])("reads the specials %j and writes them back as written", (text, expected) => {
    const specials = parseSpecials(text);
    expect(specials.map(bare)).toEqual(expected);
    expect(formatSpecials(specials)).toBe(text);
  });
});

describe("Alpha Strike unit findings", () => {
  const unit = (change: (u: AsUnit) => void): AsUnit => {
    const u = newAsUnit("a");
    change(u);
    return u;
  };

  it.each([
    ["a clean 'Mech", () => undefined, []],
    ["an unknown type", (u: AsUnit) => void (u.card.type = "ZZ"), ["type"]],
    ["an unknown role", (u: AsUnit) => void (u.card.role = "Tank"), ["role"]],
    ["an aerospace role on a ground type", (u: AsUnit) => void (u.card.role = "Dogfighter"), ["role-kind"]],
    ["an unknown special, even inside a turret", (u: AsUnit) => void (u.card.specials = parseSpecials("IF1, TUR(1/1/1, QQ)")), ["special-QQ"]],
    ["an unknown movement letter", (u: AsUnit) => void (u.card.move = [{ inches: 4, mode: "x" }]), ["mode-x"]],
    ["heat on a unit that does not track it", (u: AsUnit) => {
      u.card.type = "CV";
      u.card.ov = 1;
    }, ["heat"]],
  ])("%s", (_name, change, ids) => {
    expect(unitFindings(unit(change)).map((f) => f.id)).toEqual(ids);
  });
});
