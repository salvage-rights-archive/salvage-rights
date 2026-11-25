import "fake-indexeddb/auto";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../rules/catalog";
import { mordelBiped, mordelQuad } from "../rules/fixtures";
import { fromMordel } from "../rules/mordel";
import type { MechRecord } from "../rules/mech";
import EditorPage from "./EditorPage";
import { openFamilyStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

/** An imported 'Mech in the made-up Mordel shape, saved on the device. `own: true` drops the source, as a hand-made one. */
async function saved(response: unknown, own = false): Promise<MechRecord> {
  const result = fromMordel(response, await loadCatalog(), "core-2026", "2026-01-01T00:00:00Z", () => (own ? "own-1" : "imported-1"));
  if (!result.ok) throw new Error(result.message);
  const record = { ...result.record };
  if (own) delete record.source;
  await (await openFamilyStorage()).save(record);
  return record;
}
const stored = async (id: string) => (await (await openFamilyStorage()).get(id))?.record;

async function open(id: string, state?: unknown) {
  const router = createMemoryRouter(
    [
      { path: "/battletech/classic/editor", element: <EditorPage /> },
      { path: "/battletech/classic/home", element: <h1>Classic BattleTech home</h1> },
    ],
    { initialEntries: [{ pathname: "/battletech/classic/editor", search: `?id=${id}`, state }] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
const field = (label: string) => screen.findByLabelText<HTMLInputElement>(label);
const rules = () => screen.getByRole("region", { name: "Rules check" });

describe("The 'Mech editor", () => {
  it("names the page for the 'Mech, credits the designer of an imported one and not of one made here", async () => {
    await saved(mordelBiped());
    await open("imported-1");
    expect(await screen.findByRole("heading", { level: 1, name: "Test Walker TW-1" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Designed by Nobody In Particular on mordel.net")).toBeTruthy();
    expect(screen.getByText("Mordel's figures: Battle Value 1000, cost 2000000 C-bills, rules level Introductory, era Succession Wars")).toBeTruthy();
    cleanup();
    await saved(mordelBiped(), true);
    await open("own-1");
    await screen.findByRole("heading", { level: 1, name: "Test Walker TW-1" });
    expect(screen.queryByText(/Designed by/)).toBeNull();
  });

  it("says so, with a way home, when the 'Mech is not saved here", async () => {
    await open("nobody");
    expect(await screen.findByText("That 'Mech is not saved on this device.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Classic BattleTech/ }).getAttribute("href")).toBe("/battletech/classic/home");
  });

  it("recomputes the rules check as tonnage is typed, without saving, and flags what is not a number", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    const tons = await field("Tons");
    await user.clear(tons);
    expect(tons.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Enter a number.")).toBeTruthy();
    await user.type(tons, "55");
    expect(tons.getAttribute("aria-invalid")).toBeNull();
    expect(within(rules()).getByText(/of 55 tons/)).toBeTruthy();
    expect((await stored("imported-1"))?.tons).toBe(50);
  });

  it("undoes and redoes edits, with both buttons disabled at the ends of the history", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    const undo = await screen.findByRole<HTMLButtonElement>("button", { name: "Undo" });
    const redo = screen.getByRole<HTMLButtonElement>("button", { name: "Redo" });
    expect([undo.disabled, redo.disabled]).toEqual([true, true]);
    await user.selectOptions(screen.getByLabelText("Gyro"), "xl");
    expect([undo.disabled, redo.disabled]).toEqual([false, true]);
    await user.click(undo);
    expect(screen.getByLabelText<HTMLSelectElement>("Gyro").value).toBe("standard");
    expect([undo.disabled, redo.disabled]).toEqual([true, false]);
    await user.click(redo);
    expect(screen.getByLabelText<HTMLSelectElement>("Gyro").value).toBe("xl");
  });

  it("points a finding at its field, saves with a status, and asks before leaving with unsaved changes", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await user.type(await field("Tons"), "5");
    await user.click(within(rules()).getByRole("button", { name: /weighs 20 to 100 tons/ }));
    expect(document.activeElement).toBe(screen.getByLabelText("Tons"));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByText("Saved.")).closest("[role=status]")).toBeTruthy();
    expect((await stored("imported-1"))?.tons).toBe(505);
  });
});

describe("The armor panel", () => {
  it("accepts armor above the maximum, shows the maximum beside the field and reports it", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    const arm = await field("Left Arm armor");
    expect(screen.getAllByText("of 16").length).toBeGreaterThan(0);
    await user.clear(arm);
    await user.type(arm, "20");
    expect(within(rules()).getByText(/Left Arm armor is 20; the most it can carry is 16/)).toBeTruthy();
  });

  it("moves focus to a location's armor field when it is chosen on the doll", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await user.click(await screen.findByRole("button", { name: "Left Arm, 8 armor" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Left Arm armor"));
  });

  it("shows the armor fields of a quad and says no doll is drawn for it", async () => {
    await saved(mordelQuad());
    await open("imported-1");
    expect(await field("Front Left Leg armor")).toBeTruthy();
    expect(screen.getByText("No doll is drawn for this body type yet.")).toBeTruthy();
  });
});
