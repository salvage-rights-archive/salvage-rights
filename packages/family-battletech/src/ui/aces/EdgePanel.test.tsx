import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { newAcesGame } from "../../rules/aces-game";
import type { AcesGame } from "../../rules/aces-game";
import { newAsUnit } from "../../rules/as-unit";
import { resetSpecialSettings } from "../as/specialSettings";
import EdgePanel from "./EdgePanel";

// Every unit here is invented for the tests.
const card = { ...newAsUnit("x").card, type: "BM", tmm: 3, size: 2 };
const base = newAcesGame({ id: "g", name: "t", seed: 1, at: "2026-01-01T00:00:00Z", player: { units: [{ unitId: "p", name: "Pilot", card, skill: 4, pv: 20, edge: 2 }] }, automated: { units: [] }, cards: [] });

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetSpecialSettings();
});

describe("Edge panel", () => {
  it("lists the abilities for the phase with the cost worked out, shows our note only when the switch is on, and spends through the game", async () => {
    const user = userEvent.setup();
    let game: AcesGame = { ...base, phase: "movement" };
    const apply = (change: (g: AcesGame) => AcesGame) => { game = change(game); };
    const view = render(<EdgePanel game={game} apply={apply} />);
    await user.click(screen.getByText("Edge tokens"));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Pilot", "Nimble (Movement)", "Speed Demon (Movement)", "Other (type the name)"]);
    expect(screen.getByText(/costs 2 Edge/)).toBeTruthy();
    expect(screen.queryByText(/pass through enemy units/)).toBeNull();
    await user.click(screen.getByLabelText("Show our short notes"));
    expect(screen.getByText(/pass through enemy units/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Spend the Edge" }));
    expect(game.sides.player.units[0]?.edge).toBe(0);
    view.unmount();
  });
});
