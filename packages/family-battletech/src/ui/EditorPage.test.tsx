import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

  it("adds a structure type's slots unplaced in one edit that Undo takes back whole, and lists the import notes", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1", { notes: ["Mordel does not say where the heat sinks go."] });
    expect(await screen.findByText("Mordel does not say where the heat sinks go.")).toBeTruthy();
    expect(screen.getByText("Import notes")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Structure type"), "endo-steel");
    const tray = screen.getByRole("heading", { name: "Unplaced" }).parentElement as HTMLElement;
    expect(within(tray).getAllByText("Endo Steel")).toHaveLength(14);
    expect(within(tray).queryAllByRole("button", { name: /^Replace/ })).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(within(tray).queryByText("Endo Steel")).toBeNull();
  });

  it("points a finding at its field, saves with a status, and asks before leaving with unsaved changes", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    const router = await open("imported-1");
    await user.type(await field("Tons"), "5");
    await user.click(within(rules()).getByRole("button", { name: /weighs 20 to 100 tons/ }));
    expect(document.activeElement).toBe(screen.getByLabelText("Tons"));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByText("Saved.")).closest("[role=status]")).toBeTruthy();
    expect((await stored("imported-1"))?.tons).toBe(505);
    await user.type(screen.getByLabelText("Tons"), "0");
    void router.navigate("/battletech/classic/home");
    expect(await screen.findByText("You have unsaved changes.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Stay" }));
    expect(screen.queryByText("You have unsaved changes.")).toBeNull();
    void router.navigate("/battletech/classic/home");
    await user.click(await screen.findByRole("button", { name: "Leave without saving" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/battletech/classic/home");
    });
  });

  it("marks what was changed since the import and nothing that was not", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await screen.findByRole("heading", { name: "Critical slots" });
    expect(screen.queryByText("Changed since import")).toBeNull();
    await user.selectOptions(screen.getByLabelText("Gyro"), "xl");
    const markerOf = (label: string) => {
      const id = screen.getByLabelText(label).getAttribute("aria-describedby");
      return id ? document.getElementById(id)?.textContent : undefined;
    };
    expect(markerOf("Gyro")).toBe("Changed since import");
    expect(markerOf("Cockpit")).toBeUndefined();
    await user.click(within(slotList("Left Arm")).getByRole("button", { name: "Move Medium Laser" }));
    await user.click(screen.getByRole("button", { name: "Place Medium Laser in Left Torso slot 5" }));
    expect(within(slotList("Left Torso").querySelector("li:has(button[aria-label='Move Medium Laser'])") as HTMLElement).getByText("Changed since import")).toBeTruthy();
    const untouched = within(slotList("Right Arm")).getByText("Medium Laser").closest("li") as HTMLElement;
    expect(within(untouched).queryByText("Changed since import")).toBeNull();
  });
});

const slotList = (location: string) => screen.getByRole("list", { name: `${location} slots` });
const moveButton = (location: string) => within(slotList(location)).getByRole<HTMLButtonElement>("button", { name: "Move Medium Laser" });

describe("The critical slots", () => {
  it("labels fixed cells without controls and gives each mount Move and Remove", async () => {
    await saved(mordelBiped());
    await open("imported-1");
    await screen.findByRole("heading", { name: "Critical slots" });
    const arm = within(slotList("Left Arm"));
    const shoulder = arm.getByText("Shoulder").closest("li");
    expect(shoulder && within(shoulder).queryAllByRole("button")).toHaveLength(0);
    const laser = arm.getByText("Medium Laser").closest("li");
    expect(laser && within(laser).getAllByRole("button").map((b) => b.textContent)).toEqual(["Move", "Replace", "Remove"]);
    expect(arm.getAllByText("Empty").length).toBeGreaterThan(0);
  });

  it("moves a mount by keyboard to a free slot in another location, and Escape leaves it where it was", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await screen.findByRole("heading", { name: "Critical slots" });
    moveButton("Left Arm").focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Choose a slot for Medium Laser. Press Escape to cancel.")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(moveButton("Left Arm"));
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Place Medium Laser in Left Torso slot 5" }));
    expect(within(slotList("Left Arm")).queryByText("Medium Laser")).toBeNull();
    expect(document.activeElement).toBe(moveButton("Left Torso"));
    expect(within(slotList("Left Torso")).getByText("Medium Laser").closest("li")?.textContent).toMatch(/^5/);
  });

  it("allows a move onto an occupied slot and reports the clash naming both items", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await user.click(await within(await screen.findByRole("list", { name: "Left Arm slots" })).findByRole("button", { name: "Move Medium Laser" }));
    await user.click(screen.getByRole("button", { name: "Place Medium Laser in Right Torso slot 1" }));
    const clash = within(rules()).getAllByText(/shares slot 1 of the Right Torso with/);
    expect(clash.map((c) => c.textContent).join(" ")).toMatch(/AC\/10.*Medium Laser/);
    expect(screen.getByRole("heading", { name: "Sharing a slot, or taking none" })).toBeTruthy();
  });

  it("keeps an unplaced mount in the tray and places it from there", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await user.click(await within(await screen.findByRole("list", { name: "Left Arm slots" })).findByRole("button", { name: "Move Medium Laser" }));
    await user.click(screen.getByRole("button", { name: "Leave unplaced" }));
    const tray = screen.getByRole("heading", { name: "Unplaced" }).parentElement as HTMLElement;
    await user.click(within(tray).getByRole("button", { name: "Place Medium Laser" }));
    await user.click(screen.getByRole("button", { name: "Place Medium Laser in Left Arm slot 7" }));
    expect(within(slotList("Left Arm")).getByText("Medium Laser").closest("li")?.textContent).toMatch(/^7/);
    expect(within(tray).queryByText("Medium Laser")).toBeNull();
  });
});

describe("The equipment picker", () => {
  it("lists what the edition offers, caps the list, can lift the filters and replaces equipment in place", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    const catalog = await loadCatalog();
    const offered = catalog.offered("core-2026", { techBase: "inner-sphere", year: 3025 }).length;
    const everything = catalog.all().length;
    expect(offered).toBeLessThan(100);
    expect(everything).toBeGreaterThan(100);
    await open("imported-1");
    await user.click(within(await screen.findByRole("list", { name: "Left Arm slots" })).getByRole("button", { name: "Replace Medium Laser" }));
    const dialog = screen.getByRole("dialog", { name: "Replace Medium Laser" });
    expect(document.activeElement).toBe(within(dialog).getByLabelText("Search by name"));
    expect(within(dialog).getAllByRole("button", { name: /Inner Sphere/ })).toHaveLength(offered);
    expect(within(dialog).queryByText(/^Showing 100 of/)).toBeNull();
    await user.type(within(dialog).getByLabelText("Search by name"), "medium pulse");
    expect(within(dialog).getByText("No equipment matches.")).toBeTruthy();
    await user.clear(within(dialog).getByLabelText("Search by name"));
    await user.click(within(dialog).getByRole("checkbox", { name: "Show everything" }));
    expect(within(dialog).getAllByRole("list", { name: "Equipment" })[0]?.children).toHaveLength(100);
    expect(within(dialog).getByText(`Showing 100 of ${everything}`)).toBeTruthy();
    await user.type(within(dialog).getByLabelText("Search by name"), "medium pulse");
    await user.click(within(dialog).getByRole("button", { name: /^Medium Pulse Laser Inner Sphere, 2 tons, 1 slot/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const cell = within(slotList("Left Arm")).getByText("Medium Pulse Laser").closest("li");
    expect(cell?.textContent).toMatch(/^5/);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Replace Medium Pulse Laser");
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
    expect(screen.getByRole("button", { name: "Left Arm", pressed: true })).toBeTruthy();
  });

  it("shows the armor fields of a quad and says no doll is drawn for it", async () => {
    await saved(mordelQuad());
    await open("imported-1");
    expect(await field("Front Left Leg armor")).toBeTruthy();
    expect(screen.getByText("No doll is drawn for this body type yet.")).toBeTruthy();
  });
});
