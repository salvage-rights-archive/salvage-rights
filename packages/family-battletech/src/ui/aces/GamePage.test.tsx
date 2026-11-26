import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newAcesCard } from "../../rules/aces-card";
import type { AcesCard, Column } from "../../rules/aces-card";
import { newAcesGame } from "../../rules/aces-game";
import { newAsUnit } from "../../rules/as-unit";
import type { AsCard } from "../../rules/as-unit";
import GamePage from "./GamePage";
import { openGameStorage } from "./game-storage";
import { ACES_GAME } from "./routes";
import { openAcesStorage } from "./storage";

// Every unit and card here is invented for the tests.
const AT = "2026-01-01T00:00:00Z";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

const card: AsCard = { ...newAsUnit("x").card, type: "BM", role: "Brawler", pv: 20, tmm: 2, armor: 3, structure: 3, move: [{ inches: 6, mode: "" }] };
const nearest: Column = { target: { zone: { keyword: "nearest" }, flags: [] }, move: { mode: "ground" }, filters: [{ token: "keep-distance", params: { inches: 6, ref: "target" } }] };
const brawlers: AcesCard[] = Array.from({ length: 6 }, (_, i) => ({
  ...newAcesCard(`b${String(i + 1)}`, AT),
  deck: { role: "Brawler" },
  position: i + 1,
  movement: { priority: 100 + i, columns: { aggressive: nearest, balanced: nearest, cautious: nearest } },
  combat: { priority: 500 },
}));

async function saveGame(): Promise<void> {
  const aces = await openAcesStorage();
  for (const c of brawlers) await aces.save(c);
  const game = newAcesGame({
    id: "g",
    name: "Table test",
    seed: 4,
    at: AT,
    player: { units: [{ unitId: "ma", name: "Mine A", card, skill: 4, pv: 20 }] },
    automated: { units: [{ unitId: "ta", name: "Theirs A", card, skill: 4, pv: 20 }] },
    cards: brawlers,
  });
  await (await openGameStorage()).save(game);
}

const open = () => {
  const router = createMemoryRouter([{ path: ACES_GAME, element: <GamePage /> }], { initialEntries: [`${ACES_GAME}?id=g`] });
  return render(<RouterProvider router={router} />);
};

describe("Aces game page: Initiative and Movement", () => {
  it("plays a short movement phase: Initiative, a unit tapped as moved with its TMM, an automated activation, reload and undo", async () => {
    await saveGame();
    const user = userEvent.setup();
    const view = open();

    expect(await screen.findByRole("heading", { level: 2, name: "Turn 1: Initiative" })).toBeTruthy();
    await user.type(screen.getByLabelText("Your force: 2D6 roll, 2 to 12"), "5");
    await user.type(screen.getByLabelText("Automated force: 2D6 roll, 2 to 12"), "9");
    expect(screen.getByText("Automated force wins Initiative.", { exact: false })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Start the Movement Phase" }));

    // The player's force lost, so it moves first.
    expect(await screen.findByRole("heading", { level: 2, name: /You move 1 unit/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Mine A: Ground" }));
    expect(screen.getByText(/moved Ground \(TMM 2\)/)).toBeTruthy();

    expect(await screen.findByRole("heading", { level: 2, name: /The automated force moves 1 unit/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Activate Theirs A" }));
    expect(await screen.findByText("How far is each of these enemies from Theirs A, in inches?")).toBeTruthy();
    await user.type(screen.getByLabelText("Distance to Mine A, in inches"), "12");
    await user.click(screen.getByRole("button", { name: "Done with distances" }));
    expect(await screen.findByText("Move Theirs A: Aggressive, target Mine A, Ground")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Done: Theirs A has moved" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Go to the Combat Phase" }) as HTMLButtonElement).disabled).toBe(false));

    // A reload comes back to the same step.
    view.unmount();
    open();
    expect(await screen.findByRole("heading", { level: 2, name: /Every unit has moved/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Go to the Combat Phase" }) as HTMLButtonElement).disabled).toBe(false);

    // Undo takes the activation back to its pinned decision.
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Move Theirs A: Aggressive, target Mine A, Ground")).toBeTruthy();
  });

  it("a 0* hit asks for its 1D6 and delivers nothing under 4, and a hit on the rear adds 1 (ASCE p. 48; Quick-Start p. 21)", async () => {
    const aces = await openAcesStorage();
    for (const c of brawlers) await aces.save(c);
    const minimal: AsCard = { ...card, damage: { s: { value: 0, minimal: true }, m: { value: 0 }, l: { value: 0 } } };
    const game = newAcesGame({
      id: "g",
      name: "Table test",
      seed: 4,
      at: AT,
      player: { units: [{ unitId: "ma", name: "Mine A", card: minimal, skill: 4, pv: 20 }] },
      automated: { units: [{ unitId: "ta", name: "Theirs A", card, skill: 4, pv: 20 }] },
      cards: brawlers,
    });
    await (await openGameStorage()).save({ ...game, phase: "combat", initiative: { player: 5, automated: 9, winner: "automated", turn: 1 } });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Attack with Mine A" }));
    await user.type(screen.getByLabelText(/Distance to the target/), "3");
    await user.type(screen.getByLabelText(/2D6 attack roll/), "12");
    await user.type(await screen.findByLabelText(/Minimal damage \(0\*\)/), "3");
    expect(screen.getByText("The hit delivers no damage, so there is no critical hit check.")).toBeTruthy();
    await user.clear(screen.getByLabelText(/Minimal damage \(0\*\)/));
    await user.type(screen.getByLabelText(/Minimal damage \(0\*\)/), "4");
    await user.click(screen.getByLabelText(/struck the target/));
    await user.click(screen.getByRole("button", { name: "Record the attack" }));
    expect(await screen.findByText(/2 staged/)).toBeTruthy();
  });

  it.each([
    ["a failed 0* roll still delivers the OV", "3", 2],
    ["a 0* roll of 4 delivers the OV and 1 more", "4", 3],
  ])("a 0* hit with OV 2 still rolls the 1D6: %s (ASCE pp. 48, 53)", async (_name, die, staged) => {
    const aces = await openAcesStorage();
    for (const c of brawlers) await aces.save(c);
    const minimal: AsCard = { ...card, ov: 2, damage: { s: { value: 0, minimal: true }, m: { value: 0 }, l: { value: 0 } } };
    const game = newAcesGame({
      id: "g",
      name: "Table test",
      seed: 4,
      at: AT,
      player: { units: [{ unitId: "ma", name: "Mine A", card: minimal, skill: 4, pv: 20 }] },
      automated: { units: [{ unitId: "ta", name: "Theirs A", card, skill: 4, pv: 20 }] },
      cards: brawlers,
    });
    await (await openGameStorage()).save({ ...game, phase: "combat", initiative: { player: 5, automated: 9, winner: "automated", turn: 1 } });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Attack with Mine A" }));
    await user.type(screen.getByLabelText(/Distance to the target/), "3");
    await user.selectOptions(screen.getByLabelText("Overheat to use"), "2");
    await user.type(screen.getByLabelText(/2D6 attack roll/), "12");
    await user.type(await screen.findByLabelText(/Minimal damage \(0\*\)/), die);
    await user.click(screen.getByRole("button", { name: "Record the attack" }));
    expect(await screen.findByText(new RegExp(`${String(staged)} staged`))).toBeTruthy();
  });

  it("asks for the screen to stay on, and lets it go when the switch is turned off", async () => {
    await saveGame();
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release }));
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const user = userEvent.setup();
    open();
    await screen.findByRole("heading", { level: 2, name: "Turn 1: Initiative" });
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
    await user.click(screen.getByLabelText("Keep the screen on"));
    await waitFor(() => expect(release).toHaveBeenCalled());
    Reflect.deleteProperty(navigator, "wakeLock");
  });
});
