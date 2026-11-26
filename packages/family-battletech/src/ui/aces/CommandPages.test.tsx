import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CommandCard, SpecialOrderCard, SupportCard } from "../../rules/aces-card";
import CardLibraryPage from "./CardLibraryPage";
import CommandEditorPage, { makeCommand } from "./CommandEditorPage";
import SpecialOrderPage from "./OrderEditor";
import { ACES_CARDS, ACES_COMMAND, ACES_ORDER, ACES_SUPPORT } from "./routes";
import { openAcesStorage } from "./storage";
import SupportCardPage from "./SupportEditor";

// Every card here is invented for the tests; no printed card.

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

function renderAt(entry: string) {
  const router = createMemoryRouter(
    [
      { path: ACES_CARDS, element: <CardLibraryPage /> },
      { path: ACES_COMMAND, element: <CommandEditorPage /> },
      { path: ACES_ORDER, element: <SpecialOrderPage /> },
      { path: ACES_SUPPORT, element: <SupportCardPage /> },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);
}

type User = ReturnType<typeof userEvent.setup>;
const step = async (user: User, name: string) => { await user.click(await screen.findByRole("button", { name })); };
async function pick(user: User, opener: string, search: string, entry: string) {
  await user.click(screen.getByRole("button", { name: opener }));
  await user.type(screen.getByLabelText("Search the list"), search);
  await user.click(screen.getByRole("button", { name: entry }));
}
const AT = "2026-01-01T00:00:00Z";
const onlyRecord = async <T,>(kind: "aces-command" | "aces-order" | "aces-support"): Promise<T> => (await (await openAcesStorage()).list([kind]))[0]?.record as T;

describe("Aces command, special order and support card pages", () => {
  it("enters an invented command card across its steps, saves it and shows it again after a reload", async () => {
    const user = userEvent.setup();
    renderAt(ACES_COMMAND);
    await user.type(await screen.findByLabelText("Commander"), "Test Marshal");
    await user.type(screen.getByLabelText("Faction"), "Test House");
    await user.selectOptions(screen.getByLabelText("Card letter"), "C");
    await step(user, "2. Orders");
    await pick(user, "Add an order", "initiative", "Initiative roll …");
    await user.selectOptions(screen.getByLabelText("Phase"), "Initiative");
    await user.click(screen.getByRole("button", { name: "More: Modifier" }));
    await step(user, "3. Colour lists");
    await pick(user, "Add a key to the RED list", "no armor", "no Armor left");
    await step(user, "4. Support side");
    await user.selectOptions(screen.getByLabelText("Support cards are"), "spend-always");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved.")).toBeTruthy();

    const saved = await onlyRecord<CommandCard>("aces-command");
    expect(saved).toMatchObject({ commander: "Test Marshal", faction: "Test House", letter: "C" });
    expect(saved.orders[0]).toMatchObject({ token: "initiative", phase: "initiative", params: { n: 1 } });
    expect(saved.colours.red[0]?.token).toBe("no-armor");
    expect(saved.support.spend.token).toBe("spend-always");

    cleanup();
    renderAt(`${ACES_COMMAND}?id=${saved.id}`);
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Test Marshal (Test House), card C");
    expect(screen.getByRole("region", { name: "Orders preview" }).textContent).toContain("Initiative: Initiative roll +1");
  });

  it("keeps the strategy rows in the order the player puts them", async () => {
    const user = userEvent.setup();
    const storage = await openAcesStorage();
    await storage.save({ ...makeCommand("c1", AT), commander: "Test Marshal", strategy: [{ letter: null, when: { join: "all", clauses: [{ token: "enemy-without-armor" }] } }, { letter: "D", when: { join: "all", clauses: [{ token: "objective-complete" }] } }] });
    renderAt(`${ACES_COMMAND}?id=c1`);
    await step(user, "5. Strategy rows");
    await user.click(await screen.findByRole("button", { name: /^Move up: 2\. change to D/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved.")).toBeTruthy();
    expect((await onlyRecord<CommandCard>("aces-command")).strategy.map((r) => r.letter)).toEqual(["D", null]);
  });

  it("builds a special order's column with the same column editor as a behaviour card", async () => {
    const user = userEvent.setup();
    renderAt(ACES_ORDER);
    await user.selectOptions(await screen.findByLabelText("Special order"), "fleeing");
    await user.click(screen.getByRole("button", { name: "Record the column" }));
    await pick(user, "Add a filter to the Fleeing column", "stand in", "stand in …");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved.")).toBeTruthy();
    const saved = await onlyRecord<SpecialOrderCard>("aces-order");
    expect(saved.order).toBe("fleeing");
    expect(saved.column?.filters[0]?.token).toBe("stand-in");
  });

  it("will not save a support card without a name, and keeps its figures as entered", async () => {
    const user = userEvent.setup();
    renderAt(ACES_SUPPORT);
    const save = await screen.findByRole("button", { name: "Save" });
    await user.click(screen.getByRole("checkbox", { name: "Its damage covers an area" }));
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Give the card a name.")).toBeTruthy();
    await user.type(screen.getByLabelText("Name"), "Test Barrage");
    await user.click(screen.getByRole("button", { name: "More: Cost" }));
    await user.click(screen.getByRole("button", { name: "More: Damage" }));
    await user.click(save);
    expect(await screen.findByText("Saved.")).toBeTruthy();
    expect(await onlyRecord<SupportCard>("aces-support")).toMatchObject({ name: "Test Barrage", cost: 1, tn: 7, damage: 2, area: true });
  });

  it("groups command decks by commander with the letters A to E they have and lack", async () => {
    const storage = await openAcesStorage();
    for (const letter of ["A", "C"] as const) await storage.save({ ...makeCommand(`c-${letter}`, AT), commander: "Test Marshal", faction: "Test House", letter, position: letter === "A" ? 1 : 3 });
    renderAt(ACES_CARDS);
    expect((await screen.findByRole("heading", { name: "Test Marshal (Test House)" })).nextElementSibling?.textContent).toBe("Recorded A, C. Missing B, D, E.");
    expect(screen.getByRole("link", { name: "Open Test Marshal (Test House) card C" })).toBeTruthy();
  });
});
