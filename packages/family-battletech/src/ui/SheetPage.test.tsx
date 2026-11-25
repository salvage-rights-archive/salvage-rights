import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../rules/catalog";
import { mordelBiped } from "../rules/fixtures";
import { fromMordel } from "../rules/mordel";
import SheetPage from "./SheetPage";
import { openFamilyStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

function open(id: string) {
  const router = createMemoryRouter([{ path: "/battletech/classic/sheet", element: <SheetPage /> }], {
    initialEntries: [`/battletech/classic/sheet?id=${id}`],
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

  it("says so, with the way back, for a 'Mech that is not saved", async () => {
    open("nobody");
    expect(await screen.findByText("That 'Mech is not saved on this device.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to Classic BattleTech" })).toBeTruthy();
  });
});
