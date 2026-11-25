import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { newAsUnit, parseSpecials } from "../../rules/as-unit";
import AsHomePage from "./AsHomePage";
import AsUnitPage from "./AsUnitPage";
import { openAsStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

function renderAt(entry: string | { pathname: string; state: unknown }) {
  const router = createMemoryRouter(
    [
      { path: "/battletech/alpha-strike/home", element: <AsHomePage /> },
      { path: "/battletech/alpha-strike/unit", element: <AsUnitPage /> },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("Alpha Strike roster pages", () => {
  it("lists saved units and offers Export raw and Delete for one it cannot read", async () => {
    const storage = await openAsStorage();
    const unit = newAsUnit("u1");
    unit.name = { chassis: "Test Walker", model: "TW-1" };
    unit.card.pv = 36;
    await storage.save(unit);
    await (await openStore("battletech")).set("as-unit:bad", { unit: {} });
    renderAt("/battletech/alpha-strike/home");
    const row = (await screen.findByText("Test Walker TW-1")).closest("li");
    expect(row?.textContent).toContain("BM, size 1, PV 36");
    expect(within(row as HTMLElement).getByRole("link", { name: "Open Test Walker TW-1" }).getAttribute("href")).toBe("/battletech/alpha-strike/unit?id=u1");
    const broken = (await screen.findByText(/This saved unit cannot be read/)).closest("li") as HTMLElement;
    expect(within(broken).getByRole("button", { name: "Export raw" })).toBeTruthy();
    await userEvent.click(within(broken).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(screen.getByRole("group", { name: "Confirm delete" })).getByRole("button", { name: "Delete" }));
    await waitFor(() => { expect(screen.queryByText(/This saved unit cannot be read/)).toBeNull(); });
  });

  it("builds a unit from the form, shows the preview and a finding, saves it, and asks before leaving with unsaved changes", async () => {
    const user = userEvent.setup();
    const router = renderAt("/battletech/alpha-strike/unit");
    const form = await screen.findByRole("form", { name: "Unit card values" });
    const save = screen.getByRole("button", { name: "Save" });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await user.type(within(form).getByLabelText("Name"), "Thunderbolt");
    await user.type(within(form).getByLabelText("Special abilities"), "QQ1");
    const pv = within(form).getByLabelText("Point Value (PV)");
    await user.clear(pv);
    await user.type(pv, "36");
    const preview = screen.getByRole("region", { name: "Card preview" });
    expect(preview.textContent).toContain("Thunderbolt");
    expect(preview.textContent).toContain("PV 36");
    expect(screen.getByText(/We do not know the special ability "QQ"/)).toBeTruthy();
    await user.type(within(form).getByLabelText("Move"), "fast");
    expect(within(form).getByText('Write movement like 8"/6"j.')).toBeTruthy();
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await user.clear(within(form).getByLabelText("Move"));
    await user.type(within(form).getByLabelText("Move"), '8"/6"j');
    await act(async () => void router.navigate("/battletech/alpha-strike/home"));
    expect(await screen.findByText("You have unsaved changes.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Stay" }));
    await user.click(save);
    await waitFor(async () => {
      const [entry] = await (await openAsStorage()).list();
      expect(entry?.unit?.card.move).toEqual([{ inches: 8, mode: "" }, { inches: 6, mode: "j" }]);
      expect(entry?.unit?.card.specials[0]?.code).toBe("QQ");
    });
    expect(await screen.findByText("Saved.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens a unit handed over for review with its values filled in and counts it as unsaved until Save is pressed", async () => {
    const draft = newAsUnit("d1");
    draft.name = { chassis: "Scanned Walker", model: "SW-2" };
    draft.card.specials = parseSpecials("ECM");
    draft.source = { kind: "scan", credit: "read from a card", style: "asce" };
    renderAt({ pathname: "/battletech/alpha-strike/unit", state: { draft } });
    expect(await screen.findByRole("heading", { level: 1, name: "Scanned Walker SW-2" })).toBeTruthy();
    expect((screen.getByLabelText("Special abilities") as HTMLInputElement).value).toBe("ECM");
    expect(screen.getByText("You have changes that are not saved.")).toBeTruthy();
    expect(await (await openAsStorage()).list()).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => {
      expect((await (await openAsStorage()).list())[0]?.unit?.source).toEqual({ kind: "scan", credit: "read from a card", style: "asce" });
    });
  });
});
