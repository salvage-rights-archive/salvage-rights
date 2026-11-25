import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bipedRecord } from "../rules/fixtures";
import HomePage from "./HomePage";
import { openFamilyStorage, toMechFile } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

function renderHome() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

const saved = (id: string, model: string) => bipedRecord({ id, name: { chassis: "Test Walker", model } });

describe("Classic BattleTech home", () => {
  it("shows one heading, the edition with its books, and stores a changed choice", async () => {
    const user = userEvent.setup();
    renderHome();
    expect(await screen.findByRole("heading", { level: 1, name: "Classic BattleTech" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const select = await screen.findByLabelText<HTMLSelectElement>("Edition");
    expect(select.value).toBe("core-2026");
    expect(screen.getByText(/^Play: BattleTech Core Rulebook, 2026, first printing\. Construction: TechManual,/)).toBeTruthy();
    await user.selectOptions(select, "core-2026");
    expect(await (await openFamilyStorage()).getEdition()).toBe("core-2026");
  });

  it("says nothing is saved and links to the import page", async () => {
    renderHome();
    expect(await screen.findByText("No 'Mechs saved yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import from Mordel" }).getAttribute("href")).toBe("/battletech/classic/import");
  });

  it("lists saved 'Mechs with their actions, confirms a delete, and lists an unreadable entry with only Delete", async () => {
    const user = userEvent.setup();
    const storage = await openFamilyStorage();
    await storage.save(saved("a", "TW-1"));
    await storage.save(saved("b", "TW-2"));
    renderHome();
    const row = (await screen.findByText(/Test Walker TW-1/)).closest("li");
    if (!row) throw new Error("no row");
    expect(within(row).getByText(/50 tons/)).toBeTruthy();
    expect(within(row).getByRole("link", { name: /^Open/ }).getAttribute("href")).toBe("/battletech/classic/editor?id=a");
    for (const name of ["Duplicate", "Export", "Delete"]) expect(within(row).getByRole("button", { name: new RegExp(`^${name}`) })).toBeTruthy();

    await user.click(within(row).getByRole("button", { name: /^Duplicate/ }));
    expect(await screen.findByText(/Test Walker TW-1 \(copy\)/)).toBeTruthy();
    expect(await storage.list()).toHaveLength(3);

    await user.click(within(row).getByRole("button", { name: /^Delete/ }));
    expect(screen.getByText("Delete Test Walker TW-1? This cannot be undone.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Keep" }));
    expect(await storage.list()).toHaveLength(3);
    await user.click(within(row).getByRole("button", { name: /^Delete/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(async () => {
      expect(await storage.list()).toHaveLength(2);
    });
  });

  it("lists an unreadable entry as such, with only Delete", async () => {
    const { openStore } = await import("@salvage-rights/shared");
    await (await openStore("battletech")).set("mech:broken", { record: { schema: 99 } });
    renderHome();
    const row = (await screen.findByText(/cannot be read/i)).closest("li");
    if (!row) throw new Error("no row");
    expect(within(row).getAllByRole("button").map((b) => b.textContent)).toEqual(["Delete"]);
    expect(within(row).queryByRole("link")).toBeNull();
  });

  it("imports a 'Mech file, giving a repeated id a new one, and refuses what is not a 'Mech file", async () => {
    const user = userEvent.setup();
    const storage = await openFamilyStorage();
    await storage.save(saved("a", "TW-1"));
    renderHome();
    const input = await screen.findByLabelText("Import a file");
    const file = (text: string) => new File([text], "x.json", { type: "application/json" });

    await user.upload(input, file("not json at all"));
    expect((await screen.findByRole("alert")).textContent).toBe("That file is not a 'Mech file.");
    expect(await storage.list()).toHaveLength(1);

    await user.upload(input, file(JSON.stringify({ app: "other" })));
    expect((await screen.findByRole("alert")).textContent).toBe("This file was not made by Salvage Rights.");
    expect(await storage.list()).toHaveLength(1);

    await user.upload(input, file(JSON.stringify(toMechFile(saved("a", "TW-1")))));
    expect((await screen.findByRole("status", { name: "Import result" })).textContent).toBe("'Mech imported.");
    const ids = (await storage.list()).map((e) => e.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
