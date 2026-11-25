import { describe, expect, it } from "vitest";
import { fromMordelAs } from "./as-mordel";
import { formatSpecials } from "./as-unit";
import { mordelAsBody } from "./fixtures";

const NOW = "2026-11-25T10:00:00.000Z";
const run = (body: unknown, requested = "bm") => fromMordelAs(body, NOW, () => "new-id", requested);

describe("Alpha Strike values from Mordel", () => {
  it("maps the card, the identity, the rules level and the era, and keeps the values as fetched under a credited source", () => {
    const result = run(mordelAsBody());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { unit } = result;
    expect(unit.name).toEqual({ chassis: "Test Walker", model: "TW-1" });
    expect(unit.card).toMatchObject({ type: "BM", size: 2, tmm: 2, role: "Brawler", pv: 30, ov: 1, armor: 5, structure: 4 });
    expect(unit.card.move).toEqual([{ inches: 8, mode: "" }, { inches: 6, mode: "j" }]);
    expect(unit.card.damage).toEqual({ s: { value: 3 }, m: { value: 2 }, l: { value: 0, minimal: true } });
    expect(formatSpecials(unit.card.specials)).toBe("ECM, IF1, TUR(2/2/1, LRM1/1/0)");
    expect([unit.rulesLevel, unit.techBase, unit.year, unit.era]).toEqual(["advanced", "clan", 3055, "clan-invasion"]);
    expect(unit.source).toEqual({ kind: "mordel", credit: "Designed by Nobody In Particular on mordel.net; API by MordelBlacknight", ref: "bm 900002", at: NOW, values: unit.card });
  });

  it("takes a missing role as none, an unknown era or level as unset, a dash as no damage, and the type from the block", () => {
    const result = run(mordelAsBody({ role: null, era: "Succession Wars", rules_level: "Mystery", unit_type_short: "cv" }, { type: "cv", move: '6"t', tmm: null, damage: { short: "-", medium: 1, long: "0" } }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unit.card).toMatchObject({ type: "CV", role: null, tmm: null, move: [{ inches: 6, mode: "t" }] });
    expect(result.unit.card.damage).toEqual({ s: null, m: { value: 1 }, l: { value: 0 } });
    expect(result.unit.era).toBeUndefined();
    expect(result.unit.rulesLevel).toBeUndefined();
  });

  it.each([
    ["a body that is not a unit", "nope", /nothing we can read/],
    ["a unit without the block", mordelAsBody({ alpha_strike: null }), /no Alpha Strike values for this unit/],
    ["a type with no card values", mordelAsBody({ unit_type_short: "ba" }), /only for BattleMechs/],
    ["a missing armor figure", mordelAsBody({}, { armor: null }), /could not read .*size, armor/],
    ["movement that is not readable", mordelAsBody({}, { move: "fast" }), /could not read .*movement/],
    ["damage that is not readable", mordelAsBody({}, { damage: { short: "x", medium: "1", long: "1" } }), /could not read .*damage/],
  ])("answers %s with a plain message and imports nothing", (_what, body, message) => {
    const result = run(body);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(message);
  });
});
