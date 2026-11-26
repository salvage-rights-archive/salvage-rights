import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { newAcesCard } from "../../rules/aces-card";
import type { AcesCard } from "../../rules/aces-card";
import { downloadJson } from "../storage";
import CardEditorPage from "./CardEditorPage";
import CardLibraryPage from "./CardLibraryPage";
import { ACES_CARD, ACES_CARDS } from "./routes";
import { openAcesStorage } from "./storage";

// Every card here is invented for the tests; no printed card.

vi.mock("../storage", async (original) => ({ ...(await original<typeof import("../storage")>()), downloadJson: vi.fn() }));

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.mocked(downloadJson).mockClear();
});
afterEach(cleanup);

function renderAt(entry: string) {
  const router = createMemoryRouter(
    [
      { path: ACES_CARDS, element: <CardLibraryPage /> },
      { path: ACES_CARD, element: <CardEditorPage /> },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const AT = "2026-01-01T00:00:00Z";
const invented = (id: string, position: number): AcesCard => ({ ...newAcesCard(id, AT), deck: { role: "Brawler" }, position });

async function step(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("button", { name }));
}

/** Opens a picker by its button, finds an entry by a word and picks it. */
async function pick(user: ReturnType<typeof userEvent.setup>, opener: string, search: string, entry: string) {
  await user.click(screen.getByRole("button", { name: opener }));
  await user.type(screen.getByLabelText("Search the list"), search);
  await user.click(screen.getByRole("button", { name: entry }));
}

describe("Aces card pages", () => {
  it("enters an invented card from identity to filters, saves it, and shows it again after a reload", async () => {
    const user = userEvent.setup();
    renderAt(ACES_CARD);
    await user.selectOptions(await screen.findByLabelText("Role"), "Brawler");
    await user.selectOptions(screen.getByLabelText(/^Card number in the deck/), "3");
    await step(user, "2. Movement side");
    await user.type(screen.getByLabelText("Movement priority"), "47");
    await user.click(screen.getByRole("button", { name: "Record the three columns" }));
    await pick(user, "Add a test to: When the Aggressive column applies", "has moved", "the ideal … has moved");
    await pick(user, "Add a filter to the Aggressive column", "keep", "keep … from …");
    await user.selectOptions(screen.getByLabelText("Movement"), "Jump");
    expect(screen.getByRole("region", { name: "Aggressive column" }).textContent).toContain("the ideal RED has moved");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved.")).toBeTruthy();

    const saved = (await (await openAcesStorage()).list(["aces-card"]))[0]?.record as AcesCard;
    expect(saved.deck.role).toBe("Brawler");
    expect(saved.position).toBe(3);
    expect(saved.movement.priority).toBe(47);
    expect(saved.movement.columns?.aggressive.when?.clauses[0]?.token).toBe("ideal-moved");
    expect(saved.movement.columns?.aggressive.filters[0]?.token).toBe("keep-distance");
    expect(saved.movement.columns?.aggressive.move.mode).toBe("jump");

    cleanup();
    renderAt(`${ACES_CARD}?id=${saved.id}`);
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Brawler, card 3 of 6");
    expect(screen.getByRole("region", { name: "Aggressive column" }).textContent).toContain("keep 6\" from the target");
  });

  it("reorders filters with the move buttons and keeps the new order", async () => {
    const user = userEvent.setup();
    renderAt(ACES_CARD);
    await user.selectOptions(await screen.findByLabelText("Role"), "Scout");
    await step(user, "2. Movement side");
    await user.click(screen.getByRole("button", { name: "Record the three columns" }));
    await step(user, "Cautious");
    await pick(user, "Add a filter to the Cautious column", "stand in", "stand in …");
    await pick(user, "Add a filter to the Cautious column", "keep", "keep … from …");
    const list = () => screen.getAllByRole("listitem").filter((li) => /^\d\. /.test(li.textContent ?? "")).map((li) => /^\d\. \w+/.exec(li.textContent ?? "")?.[0]);
    expect(list()).toEqual(["1. stand", "2. keep"]);
    await user.click(screen.getByRole("button", { name: /^Move up: 2\. keep/ }));
    expect(list()).toEqual(["1. keep", "2. stand"]);
  });

  it("saves a card with only its identity, which still counts as a card", async () => {
    const user = userEvent.setup();
    renderAt(ACES_CARD);
    const save = await screen.findByRole("button", { name: "Save" });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await user.selectOptions(screen.getByLabelText("Role"), "Sniper");
    await user.click(save);
    expect(await screen.findByText(/Saved with its identity only/)).toBeTruthy();
    const record = (await (await openAcesStorage()).list(["aces-card"]))[0]?.record as AcesCard;
    expect(record.movement.columns).toBeUndefined();
    expect(record.combat.target).toBeUndefined();
  });

  it("hides the overheat rows for an infantry deck and shows them again when the deck is said to have a band", async () => {
    const user = userEvent.setup();
    renderAt(ACES_CARD);
    await user.selectOptions(await screen.findByLabelText("Role"), "Ambusher");
    await step(user, "3. Combat side");
    await user.click(screen.getByRole("button", { name: "Record the combat rules" }));
    expect(screen.getByRole("button", { name: "Add an overheat row" })).toBeTruthy();
    await step(user, "1. Identity");
    await user.click(screen.getByRole("radio", { name: "Infantry" }));
    await step(user, "3. Combat side");
    expect(screen.queryByRole("button", { name: "Add an overheat row" })).toBeNull();
    await step(user, "1. Identity");
    await user.click(screen.getByRole("checkbox", { name: "This deck has no overheat band" }));
    await step(user, "3. Combat side");
    expect(screen.getByRole("button", { name: "Add an overheat row" })).toBeTruthy();
  });

  it("exports the library file with the cards and their notes and no pictures", async () => {
    const storage = await openAcesStorage();
    await storage.save({ ...invented("c1", 1), note: "my own words" });
    await (await openStore("battletech")).set("aces-photo:c1", { dataUrl: "data:image/png;base64,AAAA" });
    renderAt(ACES_CARDS);
    await screen.findByRole("heading", { name: "Brawler" });
    await userEvent.click(screen.getByRole("button", { name: "Export library" }));
    const [name, file] = vi.mocked(downloadJson).mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe("my-cards.aces-library.json");
    expect(file.kind).toBe("aces-library");
    expect((file.cards as AcesCard[])[0]?.note).toBe("my own words");
    expect(file).not.toHaveProperty("photos");
    expect(JSON.stringify(file)).not.toContain("data:image");
  });

  it("asks before it deletes a card and keeps it when told to", async () => {
    const storage = await openAcesStorage();
    await storage.save(invented("c1", 1));
    renderAt(ACES_CARDS);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Delete Brawler card 1" }));
    await user.click(within(screen.getByRole("group", { name: "Confirm delete" })).getByRole("button", { name: "Keep" }));
    expect(screen.getByRole("button", { name: "Delete Brawler card 1" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Delete Brawler card 1" }));
    await user.click(within(screen.getByRole("group", { name: "Confirm delete" })).getByRole("button", { name: "Delete" }));
    await waitFor(() => { expect(screen.getByText("No behaviour cards recorded yet.")).toBeTruthy(); });
    expect(await storage.list(["aces-card"])).toEqual([]);
  });
});
