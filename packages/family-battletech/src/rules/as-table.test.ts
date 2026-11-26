import { describe, expect, it } from "vitest";
import { newAsUnit } from "./as-unit";
import { endTurn, fitTable, newTable, setUnit, stageHit, unstageHit } from "./as-table";

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
