import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../rules/catalog";
import { gladiator, mordelBiped } from "../rules/fixtures";
import { fromMordel } from "../rules/mordel";
import SheetPage from "./SheetPage";
import { openFamilyStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

function open(id: string, query = "") {
  const router = createMemoryRouter([{ path: "/battletech/classic/sheet", element: <SheetPage /> }], {
    initialEntries: [`/battletech/classic/sheet?id=${id}${query}`],
  });
  render(<RouterProvider router={router} />);
}

describe("The record sheet page", () => {
  it("shows the saved 'Mech's sheet with the way back, the way to the editor and Print, and says when the 'Mech has rules errors", async () => {
    const result = fromMordel(mordelBiped(), await loadCatalog(), "total-warfare", "2026-01-01T00:00:00Z", () => "imported-1");
    if (!result.ok) throw new Error(result.message);
    result.record.armor.HD = { front: 40 };
    await (await openFamilyStorage()).save(result.record);
    open("imported-1");
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Test Walker TW-1 record sheet");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Your 'Mechs/ }).getAttribute("href")).toBe("/battletech/classic/home");
    expect(screen.getByRole("link", { name: "Edit" }).getAttribute("href")).toBe("/battletech/classic/editor?id=imported-1");
    expect(screen.getByRole("button", { name: "Print" })).toBeTruthy();
    expect(screen.getByText("Prints on one page, Letter or A4. In the print dialog, turn off headers and footers.")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/^This 'Mech has \d+ rules errors?\. The sheet shows it as saved\.$/);
    expect(screen.getByRole("img", { name: "Test Walker TW-1 record sheet" })).toBeTruthy();
  });

  it("prints each configuration of a saved OmniMech as its own sheet titled chassis and configuration, and the base with no Battle Value", async () => {
    await (await openFamilyStorage()).saveOmni(gladiator());
    open("gladiator", "&c=a");
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Gladiator A record sheet");
    expect(screen.getByRole("link", { name: "Edit" }).getAttribute("href")).toBe("/battletech/classic/editor?id=gladiator&c=a");
    expect(screen.getByRole("navigation", { name: "Configurations" }).textContent).toBe("PrimeABase");
    cleanup();
    open("gladiator", "&c=base");
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Gladiator Base record sheet");
    expect(screen.getAllByText(/the base has none; pod space 26.5 tons/).length).toBeGreaterThan(0);
  });

  it("says so, with the way back, for a 'Mech that is not saved", async () => {
    open("nobody");
    expect(await screen.findByText("That 'Mech is not saved on this device.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to Classic BattleTech" })).toBeTruthy();
  });
});
