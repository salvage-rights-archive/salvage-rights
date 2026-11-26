import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newAcesCard } from "../../rules/aces-card";
import { newAsUnit } from "../../rules/as-unit";
import { openAsStorage } from "../as/storage";
import AcesHomePage from "./AcesHomePage";
import GamePage from "./GamePage";
import NewGamePage from "./NewGamePage";
import { openGameStorage } from "./game-storage";
import { ACES_GAME, ACES_HOME, ACES_NEW_GAME } from "./routes";
import { openAcesStorage } from "./storage";

// Every unit and card here is invented for the tests.

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

describe("New Aces game page", () => {
  it("sets up a three against four game, saves it with decks for the automated units, and lists it on the home with Resume and Delete", async () => {
    const as = await openAsStorage();
    for (const name of ["Mine A", "Mine B", "Mine C", "Theirs A", "Theirs B", "Theirs C", "Theirs D"]) {
      const unit = newAsUnit(name);
      await as.save({ ...unit, name: { chassis: name, model: "" }, card: { ...unit.card, role: "Brawler", pv: 20, armor: 3, structure: 3 } });
    }
    const aces = await openAcesStorage();
    for (let i = 1; i <= 6; i += 1) {
      await aces.save({ ...newAcesCard(`b${String(i)}`, "2026-01-01T00:00:00Z"), deck: { role: "Brawler" }, position: i, movement: { priority: 100 + i }, combat: { priority: 900 - i } });
    }

    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        { path: ACES_HOME, element: <AcesHomePage /> },
        { path: ACES_NEW_GAME, element: <NewGamePage /> },
        { path: ACES_GAME, element: <GamePage /> },
      ],
      { initialEntries: [ACES_NEW_GAME] },
    );
    render(<RouterProvider router={router} />);
    for (const [side, names] of [["your force", ["Mine A", "Mine B", "Mine C"]], ["automated force", ["Theirs A", "Theirs B", "Theirs C", "Theirs D"]]] as const) {
      for (const name of names) {
        await user.selectOptions(await screen.findByLabelText(`Add a unit to ${side}`), `${name} (PV 20)`);
        await user.click(screen.getByRole("button", { name: `Add to ${side}` }));
      }
    }
    expect(screen.getByText("Automated force: 4 units, 80 PV.")).toBeTruthy();
    expect(screen.getByText(/Your force is 60 PV and the automated force 80 PV, 133% of yours/)).toBeTruthy();
    expect(screen.queryByLabelText("Aces deck of Mine A")).toBeNull();
    expect(within(screen.getByLabelText("Aces deck of Theirs A")).getByRole("option", { name: "Usual deck (Brawler)" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Start the game" }));

    await waitFor(() => expect(router.state.location.pathname).toBe(ACES_GAME));
    const [saved] = await (await openGameStorage()).list();
    const game = saved?.game;
    expect([game?.sides.player.units.length, game?.sides.automated.units.length]).toEqual([3, 4]);
    expect(game?.decks.decks.map((d) => d.cards.length)).toEqual([1, 1, 1, 1]);
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();

    await router.navigate(ACES_HOME);
    await user.click(await screen.findByRole("button", { name: "Delete New game" }));
    await user.click(within(screen.getByRole("group", { name: "Confirm delete" })).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("No games saved on this device yet.")).toBeTruthy();
  });
});
