import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { openStore } from "@salvage-rights/shared";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newAbominationUnit } from "../../rules/abomination";
import AbominationsPage from "./AbominationsPage";
import { ABOM_PREFIX, openGothicStorage, toAbomFile } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

const show = () => render(<MemoryRouter><AbominationsPage /></MemoryRouter>);
const ready = async (user: ReturnType<typeof userEvent.setup>) => {
  show();
  await waitFor(() => { expect((screen.getByLabelText("Import a file") as HTMLInputElement).disabled).toBe(false); }, { timeout: 5000 });
  return user;
};

describe("The Abomination units page", () => {
  it("adds a Tyrant as three creatures of 26 pips with 2 SRM 5 (one shot), skills 4 and 4", async () => {
    const user = await ready(userEvent.setup());
    await user.click(screen.getByRole("button", { name: "Add Tyrant" }));
    const form = within(await screen.findByRole("form", { name: "Abomination unit" }));
    expect(form.getByText(/3 creatures of 26 pips/)).toBeTruthy();
    expect(form.getByText(/2 SRM 5 \(one shot\)/).textContent).toContain("2 Small Laser");
    expect((screen.getByLabelText("Gunnery") as HTMLInputElement).value).toBe("4");
    expect((screen.getByLabelText("AniMelee") as HTMLInputElement).value).toBe("4");
  });

  it("offers a custom type at Fan-made and higher, and not at Unofficial", async () => {
    const user = await ready(userEvent.setup());
    await user.selectOptions(screen.getByLabelText("Rules level"), "licensed-noncanon");
    expect(screen.getByRole("option", { name: "Unofficial" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start a custom type" })).toBeNull();
    await user.selectOptions(screen.getByLabelText("Rules level"), "fan-made");
    expect(screen.getByRole("button", { name: "Start a custom type" })).toBeTruthy();
  });

  it("keeps a saved unit across a reload and deletes it on confirmation", async () => {
    const user = await ready(userEvent.setup());
    await user.click(screen.getByRole("button", { name: "Add Werebeast" }));
    await user.type(screen.getByLabelText("Label"), "Pack One");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Pack One (Werebeast)")).toBeTruthy();
    cleanup();
    await ready(user);
    expect(await screen.findByText("Pack One (Werebeast)")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Delete Pack One (Werebeast)" }));
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0] as HTMLElement);
    expect(await screen.findByText("No units saved yet.")).toBeTruthy();
  });

  it("imports a unit file that an export made, with its figures and its own id unchanged", async () => {
    const unit = { ...newAbominationUnit("ravager", "r-1"), label: "Big One", gunnery: 3 };
    const file = new File([JSON.stringify(toAbomFile([unit]))], "big.abom.json", { type: "application/json" });
    const user = await ready(userEvent.setup());
    await user.upload(screen.getByLabelText("Import a file"), file);
    expect(await screen.findByText("Big One (Ravager)")).toBeTruthy();
    const saved = (await (await openGothicStorage()).list()).map((e) => e.unit);
    expect(saved).toEqual([unit]);
  });

  it.each([
    { saved: undefined, reported: true },
    { saved: "standard", reported: true },
    { saved: "fan-made", reported: false },
  ] as const)("reports a custom unit by the level it was saved at ($saved), and an unreadable saved unit can still be deleted", async ({ saved, reported }) => {
    const { typeId: _none, ...base } = newAbominationUnit("gnat", "c-1");
    void _none;
    const custom = { name: "Mine", classId: "swarmer", creatures: 2, pipsPerRow: 4, ground: 1, weapons: [], mob: null, hobble: null, melee: null } as const;
    await (await openGothicStorage()).save({ ...base, custom: { ...custom, weapons: [] }, ...(saved ? { rulesLevel: saved } : {}) });
    await (await openStore("battletech")).set(`${ABOM_PREFIX}bad`, { unit: { schema: 2 } });
    await ready(userEvent.setup());
    expect(await screen.findByText(/This saved unit cannot be read/)).toBeTruthy();
    expect(screen.queryAllByText(/needs the Fan-made level or higher/).length).toBe(reported ? 1 : 0);
  });
});
