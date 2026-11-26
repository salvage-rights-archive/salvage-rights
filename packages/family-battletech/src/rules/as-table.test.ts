import { describe, expect, it } from "vitest";
import { newAsUnit } from "./as-unit";
import { crippled } from "./as-play";
import type { PlayState } from "./as-play";
import { applyMotive, attackModifier, crippleChecks, critRow, endTurn, fitTable, motiveRow, newTable, setUnit, stageHit, unstageHit } from "./as-table";

const card = (armor: number, structure: number) => ({ ...newAsUnit("x").card, armor, structure, ov: 1 });
const dice = () => 7; // a roll of 7 is no critical hit on any table

describe("the Alpha Strike table", () => {
  it("holds a staged hit until the End Phase, then takes armor before structure and starts the next turn", () => {
    const cards = [card(3, 4)];
    let table = stageHit(newTable("f", cards), 0, { damage: 5 });
    table = stageHit(table, 0, { damage: 1 });
    table = unstageHit(table, 0);
    expect(table.units[0]?.play).toMatchObject({ armor: 3, structure: 4, staged: [{ damage: 5 }] });
    const after = endTurn(table, cards, dice);
    expect(after.turn).toBe(2);
    expect(after.units[0]?.play).toMatchObject({ armor: 0, structure: 2, staged: [] });
  });

  it("a unit that did not attack sheds its heat, one that did keeps it with its Overheat", () => {
    const cards = [card(2, 2), card(2, 2)];
    let table = newTable("f", cards);
    table = setUnit(setUnit(table, 0, { attacked: true, overheat: 1 }), 1, { attacked: false, overheat: 0 });
    table = { ...table, units: table.units.map((u) => ({ ...u, play: { ...u.play, heat: 1 } })) };
    const after = endTurn(table, cards, dice);
    expect(after.units.map((u) => u.play.heat)).toEqual([2, 0]);
  });

  it("fits a saved table to a force that gained a member", () => {
    const table = fitTable(newTable("f", [card(1, 1)]), [card(1, 1), card(4, 5)]);
    expect(table.units).toHaveLength(2);
    expect(table.units[1]?.play).toMatchObject({ armor: 4, structure: 5 });
  });
});

describe("the table's numbers", () => {
  const walker = { ...newAsUnit("w").card, armor: 4, structure: 5, move: [{ mode: "", inches: 8 }], tmm: 2, damage: { s: { value: 2 }, m: { value: 2 }, l: { value: 1 } } };

  it("works the three crippling conditions out as numbers, and agrees with the rule", () => {
    const play = { ...newTable("f", [walker]).units[0]?.play, armor: 0, structure: 3 } as PlayState;
    const [structure, damage, move] = crippleChecks(play, walker);
    expect(structure).toMatchObject({ met: true, text: expect.stringContaining("structure 3: crippled at no armor and structure 3 or less") });
    expect(damage?.met).toBe(false);
    expect(move?.text).toContain("Move 8 of 8");
    expect(crippleChecks(play, walker).some((c) => c.met)).toBe(crippled(play, walker, "asce"));
    const slow = { ...play, armor: 2, structure: 5, moveHits: ["immobile" as const] };
    expect(crippleChecks(slow, walker).find((c) => c.id === "move")?.met).toBe(true);
    const spent = { ...play, armor: 4, structure: 5, crits: { engine: 0, fireControl: 0, weapon: 3 } };
    expect(crippleChecks(spent, walker).find((c) => c.id === "damage")?.met).toBe(true);
  });

  it("names the roll and the table row, and adds fire control and heat to the to-hit", () => {
    expect(critRow(walker, 10).text).toBe("Critical roll 10: Fire control hit (row 10 of the 'Mech table, p. 50)");
    expect(critRow({ ...walker, type: "BA" }, 3)).toMatchObject({ kind: "weapon" });
    expect(motiveRow({ ...walker, type: "CV", move: [{ mode: "h", inches: 10 }] }, 10).text).toContain("10 + 1 = 11");
    const play = { ...newTable("f", [walker]).units[0]?.play, heat: 2, crits: { engine: 0, fireControl: 1, weapon: 0 } } as PlayState;
    expect(attackModifier(play, walker)).toBe(4);
  });

  it("notes each roll at the End Phase, and takes outside heat and a chosen spike into the heat", () => {
    const hot = { ...walker, ov: 2 };
    let table = setUnit(stageHit(newTable("f", [hot]), 0, { damage: 6 }), 0, { attacked: true, external: 2, deliberate: true });
    table = endTurn(table, [hot], () => 10);
    expect(table.last.some((l) => l.event.text.startsWith("Critical roll 10: Fire control hit"))).toBe(true);
    expect(table.units[0]?.play.heat).toBe(3);
    expect(table.units[0]).toMatchObject({ external: 0, deliberate: false });
    expect(applyMotive(table.units[0]?.play as PlayState, "half").moveHits).toEqual(["motive-half"]);
  });
});
