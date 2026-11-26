import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { newAsForce } from "../../rules/as-force";
import { newAsUnit } from "../../rules/as-unit";
import type { AsCard } from "../../rules/as-unit";
import AsTablePage from "./AsTablePage";
import { openAsStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "wakeLock");
  localStorage.clear();
});

async function seed(card: Partial<AsCard>) {
  const user = userEvent.setup();
  const storage = await openAsStorage();
  const unit = newAsUnit("u1");
  unit.name = { chassis: "Test Walker", model: "TW-1" };
  unit.card = { ...unit.card, armor: 4, structure: 3, move: [{ mode: "", inches: 8 }], tmm: 2, damage: { s: { value: 2 }, m: { value: 2 }, l: { value: 1 } }, ...card };
  await storage.save(unit);
  await storage.saveForce({ ...newAsForce("f1", "Lance"), members: [{ unitId: "u1", skill: 4 }] });
  const open = () => render(<MemoryRouter initialEntries={["/table?force=f1"]}><AsTablePage /></MemoryRouter>);
  open();
  await screen.findByRole("heading", { name: /Lance: turn/ });
  return { user, open };
}

describe("Alpha Strike table", () => {
  it("stages a hit until the turn ends, then applies it, keeps it across a reload and resets on request", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75); // every critical roll is a 10, a fire control hit, which leaves structure alone
    const { user, open } = await seed({});
    await user.type(screen.getByLabelText("Damage taken"), "5");
    await user.click(screen.getByRole("button", { name: "Stage the hit" }));
    expect(screen.getByText(/Waiting for the End Phase: 5 = 5/)).toBeTruthy();
    expect(screen.getByText("Armor 4 of 4")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "End the turn" }));
    expect(screen.getByRole("heading", { name: "Lance: turn 2" })).toBeTruthy();
    expect(screen.getByText("Armor 0 of 4")).toBeTruthy();
    expect(screen.getByText("Structure 2 of 3")).toBeTruthy();
    expect(screen.getByText(/Critical roll 10: Fire control hit/)).toBeTruthy();
    expect((await openStore("battletech").then((s) => s.get<{ turn: number }>("as-table:f1")))?.turn).toBe(2);
    cleanup();
    open();
    expect(await screen.findByRole("heading", { name: "Lance: turn 2" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reset game" }));
    await user.click(within(screen.getByRole("group", { name: "Confirm reset" })).getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("heading", { name: "Lance: turn 1" })).toBeTruthy();
    expect(screen.getByText("Armor 4 of 4")).toBeTruthy();
  });

  it("marks damage on the bubbles, stages it, and undo takes the staging back", async () => {
    const { user } = await seed({});
    await user.click(screen.getByRole("button", { name: "Armor 3" }));
    expect((screen.getByLabelText("Damage taken") as HTMLInputElement).value).toBe("3");
    await user.click(screen.getByRole("button", { name: "Stage the hit" }));
    expect(screen.getByText(/Waiting for the End Phase: 3 = 3/)).toBeTruthy();
    expect(screen.getAllByRole("img", { name: /waiting for the End Phase/ })).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByText(/Waiting for the End Phase/)).toBeNull();
  });

  it("builds heat with the stepper, shows S at 4, and the unit shuts down", async () => {
    const { user } = await seed({ ov: 4 });
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole("button", { name: "One more: Overheat used (up to 4)" }));
    expect((screen.getByRole("button", { name: "One more: Overheat used (up to 4)" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "End the turn" }));
    expect(screen.getByText("S (shut down)")).toBeTruthy();
    expect(screen.getByText(/Skill 4, PV \d+\. Shut down/)).toBeTruthy();
  });

  it("rolls a critical for the player, shows the roll and the row, and recomputes the to-hit", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75);
    const { user } = await seed({});
    await user.click(screen.getByRole("button", { name: "Roll a critical for me" }));
    expect(screen.getByText(/Critical roll 10: Fire control hit \(row 10 of the 'Mech table, p. 50\)/)).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("calls the unit crippled by the numbers, then destroyed and greyed with no orders left", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // a roll of 8: a Weapon Hit
    const { user } = await seed({ armor: 2, structure: 4 });
    expect(screen.getByText("Crippled: not yet")).toBeTruthy();
    await user.type(screen.getByLabelText("Damage taken"), "4");
    await user.click(screen.getByRole("button", { name: "Stage the hit" }));
    await user.click(screen.getByRole("button", { name: "End the turn" }));
    expect(screen.getByText("Crippled: yes")).toBeTruthy();
    expect(screen.getByText(/Met: Armor 0, structure 2: crippled at no armor and structure 2 or less/)).toBeTruthy();
    await user.type(screen.getByLabelText("Damage taken"), "5");
    await user.click(screen.getByRole("button", { name: "Stage the hit" }));
    await user.click(screen.getByRole("button", { name: "End the turn" }));
    expect(screen.getByText(/Skill 4, PV \d+\. Destroyed/)).toBeTruthy();
    expect(screen.queryByRole("group", { name: /Orders for/ })).toBeNull();
    expect(document.querySelector(".as-table__unit--down")).not.toBeNull();
  });

  it("asks for the screen to stay on, and lets it go when the switch is turned off", async () => {
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release }));
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const { user } = await seed({});
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
    await user.click(screen.getByLabelText("Keep the screen on"));
    await waitFor(() => expect(release).toHaveBeenCalled());
  });
});
