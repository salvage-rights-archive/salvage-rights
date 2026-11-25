import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCatalog } from "../rules/catalog";
import type { EquipmentRow } from "../rules/catalog";
import { equipmentLevel, levelAtLeast } from "../rules/levels";
import type { RulesLevel } from "../data/chassis";
import { bipedRecord, mount, mordelBiped, mordelOdd, mordelQuad, mordelWith } from "../rules/fixtures";
import { fromMordel } from "../rules/mordel";
import type { MechRecord } from "../rules/mech";
import EditorPage from "./EditorPage";
import { openFamilyStorage } from "./storage";

// Decoding a picture needs a real canvas; the editor is tested with the reading mocked.
const PICTURE = "data:image/png;base64,iVBORw0KGgo=";
const { readPicture } = vi.hoisted(() => ({ readPicture: vi.fn() }));
vi.mock("./picture", async (original) => ({ ...(await original<typeof import("./picture")>()), readPicture }));

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  readPicture.mockReset();
  readPicture.mockResolvedValue({ ok: true, dataUrl: PICTURE });
});
afterEach(cleanup);

/** An imported 'Mech in the made-up Mordel shape, saved on the device. `own: true` drops the source, as a hand-made one. */
async function saved(response: unknown, own = false): Promise<MechRecord> {
  const result = fromMordel(response, await loadCatalog(), "total-warfare", "2026-01-01T00:00:00Z", () => (own ? "own-1" : "imported-1"));
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
const slotList = (location: string) => screen.getByRole("list", { name: `${location} slots` });
const moveButton = (location: string) => within(slotList(location)).getByRole<HTMLButtonElement>("button", { name: "Move Medium Laser" });
type User = ReturnType<typeof userEvent.setup>;
const openActions = async (user: User, location: string, name = "Medium Laser") => {
  await user.click(await within(await screen.findByRole("list", { name: `${location} slots` })).findByRole("button", { name: `Actions for ${name}` }));
};

describe("The 'Mech editor", () => {
  it("names the page for the 'Mech, credits the designer of an imported one and not of one made here", async () => {
    await saved(mordelBiped());
    await open("imported-1");
    expect(await screen.findByRole("heading", { level: 1, name: "Test Walker TW-1" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Designed by Nobody In Particular on mordel.net")).toBeTruthy();
    expect(screen.getByText("Mordel's figures: Battle Value 1000, cost 2000000 C-bills, rules level Introductory, era Succession Wars")).toBeTruthy();
    cleanup();
    await saved(mordelOdd(), true);
    await open("own-1");
    await screen.findByRole("heading", { level: 1, name: "Test Oddity TO-X" });
    expect(screen.queryByText(/Designed by/)).toBeNull();
    expect(screen.getByText(/^[\d.]+ of 50 tons, not counting \d+ items? of unknown weight$/)).toBeTruthy();
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
    await user.clear(screen.getByLabelText("Tons"));
    await user.type(screen.getByLabelText("Tons"), "60");
    await user.click(undo);
    expect(screen.getByLabelText<HTMLInputElement>("Tons").value).toBe("50");
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
    await user.click(within(tray).getAllByRole("button", { name: "Actions for Endo Steel" })[0] as HTMLElement);
    expect(within(tray).queryAllByRole("button", { name: /^(Replace|Remove)/ })).toHaveLength(0);
    expect(within(tray).getByText("Changes with the structure type")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("heading", { name: "Unplaced" })).toBeNull();
  });

  it("points a finding at its field and saves with a status", async () => {
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

  it("asks before leaving with unsaved changes: focus on Stay, Tab kept inside, Escape stays and focus returns", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    const router = await open("imported-1");
    const tons = await field("Tons");
    // The way back to the list is a link in the header; leaving by it is guarded like any other navigation.
    expect(screen.getByRole("link", { name: "Your 'Mechs" }).getAttribute("href")).toBe("/battletech/classic/home");
    await user.type(tons, "5");
    void router.navigate("/battletech/classic/home");
    const dialog = await screen.findByRole("alertdialog", { name: "You have unsaved changes." });
    const stay = within(dialog).getByRole("button", { name: "Stay" });
    expect(document.activeElement).toBe(stay);
    await user.tab();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Leave without saving" }));
    await user.tab();
    expect(document.activeElement).toBe(stay);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(tons);
    expect(router.state.location.pathname).toBe("/battletech/classic/editor");
    void router.navigate("/battletech/classic/home");
    await user.click(await screen.findByRole("button", { name: "Leave without saving" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/battletech/classic/home");
    });
  });

  it("shows Mordel's picture of the 'Mech, removes it if it will not load, and ignores any other host", async () => {
    await saved(mordelWith(mordelBiped(), { image_url: "https://example.com/pictures/test.png" }));
    await open("imported-1");
    await screen.findByRole("heading", { level: 1, name: "Test Walker TW-1" });
    expect(screen.queryByRole("img")).toBeNull();
    cleanup();
    await saved(mordelWith(mordelBiped(), { image_url: "https://mordel.net/pictures/test.png" }));
    await open("imported-1");
    const picture = await screen.findByRole("img", { name: "Test Walker TW-1, picture from mordel.net" });
    expect(picture.getAttribute("referrerpolicy")).toBe("no-referrer");
    fireEvent.error(picture);
    expect(screen.queryByRole("img", { name: /picture from mordel.net/ })).toBeNull();
  });

  it("uploads a picture in place of Mordel's, undoes and removes it, and reports a file it cannot use", async () => {
    await saved(mordelWith(mordelBiped(), { image_url: "https://mordel.net/pictures/test.png" }));
    const user = userEvent.setup();
    await open("imported-1");
    await screen.findByRole("img", { name: "Test Walker TW-1, picture from mordel.net" });
    const upload = screen.getByLabelText("Upload a picture");
    const file = new File(["x"], "mine.png", { type: "image/png" });
    readPicture.mockResolvedValueOnce({ ok: false, message: "That picture could not be read." });
    await user.upload(upload, file);
    expect((await screen.findByRole("alert")).textContent).toBe("That picture could not be read.");
    expect(screen.queryByText("You have changes that are not saved.")).toBeNull();

    await user.upload(upload, file);
    expect(await screen.findByRole("img", { name: "Test Walker TW-1, your picture" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: /picture from mordel.net/ })).toBeNull();
    expect(screen.getByText("You have changes that are not saved.")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("");

    await user.click(screen.getByRole("button", { name: "Remove picture" }));
    expect(screen.queryByRole("img", { name: /your picture/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove picture" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("img", { name: "Test Walker TW-1, your picture" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await stored("imported-1"))?.picture).toEqual({ dataUrl: PICTURE });
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
    // The readout texts are in a section closed by default, and an edit to one is marked.
    expect((screen.getByText("Readout").closest("details") as HTMLDetailsElement).open).toBe(false);
    await user.type(screen.getByLabelText("Overview"), "!");
    expect(markerOf("Overview")).toBe("Changed since import");
    await openActions(user, "Left Arm");
    await user.click(moveButton("Left Arm"));
    await user.click(screen.getByRole("button", { name: "Place Medium Laser in Left Torso slot 5" }));
    expect(within(slotList("Left Torso").querySelector("li:has(button[aria-label='Actions for Medium Laser'])") as HTMLElement).getByText("Changed since import")).toBeTruthy();
    const untouched = within(slotList("Right Arm")).getByText("Medium Laser").closest("li") as HTMLElement;
    expect(within(untouched).queryByText("Changed since import")).toBeNull();
  });
});

describe("The critical slots", () => {
  it("labels fixed cells without controls and gives each mount an Actions button that opens Move, Replace and Remove", async () => {
    await saved(mordelBiped());
    await open("imported-1");
    await screen.findByRole("heading", { name: "Critical slots" });
    const arm = within(slotList("Left Arm"));
    const shoulder = arm.getByText("Shoulder").closest("li");
    expect(shoulder && within(shoulder).queryAllByRole("button")).toHaveLength(0);
    const laser = arm.getByText("Medium Laser").closest("li");
    expect(laser && within(laser).getAllByRole("button").map((b) => b.textContent)).toEqual(["Actions"]);
    await openActions(userEvent.setup(), "Left Arm");
    expect(laser && within(laser).getAllByRole("button").map((b) => b.textContent)).toEqual(["Actions", "Move", "Replace", "Remove"]);
    expect(laser && within(laser).getByRole("button", { name: "Actions for Medium Laser" }).getAttribute("aria-expanded")).toBe("true");
    expect(arm.getAllByText("Empty").length).toBeGreaterThan(0);
    // Tab order is the order of the widest layout, column by column: legs follow their side torsos.
    expect([...document.querySelectorAll(".bt-slotcol__head")].map((h) => h.textContent)).toEqual([
      "Left Arm", "Left Torso", "Left Leg", "Head", "Center Torso", "Right Torso", "Right Leg", "Right Arm",
    ]);
  });

  it("moves a mount by keyboard to a free slot in another location, and Escape leaves it where it was", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await screen.findByRole("heading", { name: "Critical slots" });
    await openActions(user, "Left Arm");
    moveButton("Left Arm").focus();
    await user.keyboard("{Enter}");
    const status = screen.getByText("Choose a slot for Medium Laser. Press Escape to cancel.");
    expect(document.activeElement).toBe(status);
    await user.keyboard("{Escape}");
    const actions = within(slotList("Left Arm")).getByRole("button", { name: "Actions for Medium Laser" });
    expect(document.activeElement).toBe(actions);
    expect(actions.getAttribute("aria-expanded")).toBe("false");
    // Escape closes an open Actions row and returns focus to its button.
    await user.keyboard("{Enter}");
    expect(actions.getAttribute("aria-expanded")).toBe("true");
    moveButton("Left Arm").focus();
    await user.keyboard("{Escape}");
    expect(actions.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(actions);
    await user.keyboard("{Enter}");
    await user.click(moveButton("Left Arm"));
    await user.click(within(rules()).getByRole("button", { name: /weighs 20 to 100 tons|parts weigh/ }));
    expect(screen.queryByText(/Choose a slot for/)).toBeNull();
    expect(document.activeElement?.id).toBe("field-tons");
    await openActions(user, "Left Arm");
    await user.click(moveButton("Left Arm"));
    await user.click(screen.getByRole("button", { name: "Place Medium Laser in Left Torso slot 5" }));
    expect(within(slotList("Left Arm")).queryByText("Medium Laser")).toBeNull();
    expect(document.activeElement).toBe(within(slotList("Left Torso")).getByRole("button", { name: "Actions for Medium Laser" }));
    expect(within(slotList("Left Torso")).getByText("Medium Laser").closest("li")?.textContent).toMatch(/^5/);
  });

  it("allows a move onto an occupied slot and reports the clash naming both items", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await openActions(user, "Left Arm");
    await user.click(moveButton("Left Arm"));
    await user.click(screen.getByRole("button", { name: "Place Medium Laser in Right Torso slot 1" }));
    const clash = within(rules()).getAllByText(/shares slot 1 of the Right Torso with/);
    expect(clash.map((c) => c.textContent).join(" ")).toMatch(/AC\/10.*Medium Laser/);
    expect(screen.getByRole("heading", { name: "Sharing a slot, or taking none" })).toBeTruthy();
  });

  it("shows a five-slot shield over every slot the record gives it, and the check names the same slots", async () => {
    const shield = (slot: number) => ({ ...mount("shield", "shield-medium-is", "LA", slot), name: "Shield, Medium" });
    const storage = await openFamilyStorage();
    // From slot 1 it lands on the four actuators: the panel names the clash in each of them and the check numbers them the same.
    await storage.save(bipedRecord({ id: "clash", editionId: "total-warfare", rulesLevel: "experimental", mounts: [shield(0)] }));
    await open("clash");
    const arm = await screen.findByRole("list", { name: "Left Arm slots" });
    expect(within(arm).getByText("Shoulder + Shield, Medium")).toBeTruthy();
    expect(within(arm).getByText("Shield, Medium").closest("li")?.textContent).toMatch(/^1-5/);
    expect(within(rules()).getAllByText(/Shield, Medium shares slot \d of the Left Arm with/)).toHaveLength(4);
    cleanup();
    // After the actuators, in slots 5 to 9, it is one block with no slot errors.
    await storage.save(bipedRecord({ id: "fits", editionId: "total-warfare", rulesLevel: "experimental", mounts: [shield(4)] }));
    await open("fits");
    expect((await within(await screen.findByRole("list", { name: "Left Arm slots" })).findByText("Shield, Medium")).closest("li")?.textContent).toMatch(/^5-9/);
    expect(within(rules()).queryByText(/shares slot/)).toBeNull();
  });

  it("keeps an unplaced mount in the tray and places it from there", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await openActions(user, "Left Arm");
    await user.click(moveButton("Left Arm"));
    await user.click(screen.getByRole("button", { name: "Leave unplaced" }));
    const tray = screen.getByRole("heading", { name: "Unplaced" }).parentElement as HTMLElement;
    await user.click(within(tray).getByRole("button", { name: "Actions for Medium Laser" }));
    await user.click(within(tray).getByRole("button", { name: "Place Medium Laser" }));
    await user.click(screen.getByRole("button", { name: "Place Medium Laser in Left Arm slot 7" }));
    expect(within(slotList("Left Arm")).getByText("Medium Laser").closest("li")?.textContent).toMatch(/^7/);
    expect(screen.queryByRole("heading", { name: "Unplaced" })).toBeNull();
    await openActions(user, "Left Arm");
    await user.click(moveButton("Left Arm"));
    expect(screen.getByText(/Choose a slot for Medium Laser/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByText(/Choose a slot for/)).toBeNull();
  });
});

describe("The equipment picker", () => {
  it("lists what the edition and the rules level offer, has no cap, can lift the filters and replaces equipment in place", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    const catalog = await loadCatalog();
    const atLevel = (rows: EquipmentRow[], level: RulesLevel) => rows.filter((row) => levelAtLeast(level, equipmentLevel(row))).length;
    const offered = atLevel(catalog.offered("total-warfare", { techBase: "inner-sphere", year: 3025 }), "introductory");
    const everythingIntro = atLevel(catalog.all(), "introductory");
    const everything = atLevel(catalog.all(), "standard");
    expect(offered).toBeGreaterThan(0);
    expect(everything).toBeGreaterThan(everythingIntro);
    await open("imported-1");
    await openActions(user, "Left Arm");
    await user.click(within(slotList("Left Arm")).getByRole("button", { name: "Replace Medium Laser" }));
    const dialog = screen.getByRole("dialog", { name: "Replace Medium Laser" });
    expect(document.activeElement).toBe(within(dialog).getByLabelText("Search by name"));
    expect(within(dialog).getAllByRole("button", { name: /Inner Sphere/ })).toHaveLength(offered);
    await user.type(within(dialog).getByLabelText("Search by name"), "light machine gun");
    expect(within(dialog).getByText("No equipment matches.")).toBeTruthy();
    await user.clear(within(dialog).getByLabelText("Search by name"));
    await user.click(within(dialog).getByRole("checkbox", { name: "Show everything" }));
    expect(within(dialog).getAllByRole("list", { name: "Equipment" })[0]?.children).toHaveLength(everythingIntro);
    // Raising the unit's level brings in the rest of Standard.
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await user.selectOptions(screen.getByLabelText("Rules level"), "standard");
    await user.click(within(slotList("Left Arm")).getByRole("button", { name: "Replace Medium Laser" }));
    const again = screen.getByRole("dialog", { name: "Replace Medium Laser" });
    await user.click(within(again).getByRole("checkbox", { name: "Show everything" }));
    expect(within(again).getAllByRole("list", { name: "Equipment" })[0]?.children).toHaveLength(everything);
    await user.type(within(again).getByLabelText("Search by name"), "light machine gun");
    await user.click(within(again).getByRole("button", { name: /^Light Machine Gun Inner Sphere, 0.5 tons, 1 slot/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const cell = within(slotList("Left Arm")).getByText("Light Machine Gun").closest("li");
    expect(cell?.textContent).toMatch(/^5/);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Replace Light Machine Gun");
  });
});

describe("The armor panel", () => {
  it("accepts armor above the maximum, shows the maximum beside the field and reports it", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    const arm = await field("LA, Left Arm armor");
    expect(screen.getAllByText("/ 16").length).toBeGreaterThan(0);
    await user.clear(arm);
    await user.type(arm, "20");
    expect(within(rules()).getByText(/Left Arm armor is 20; the most it can carry is 16/)).toBeTruthy();
    // The doll draws only the circles the location can carry (16), so it outlines the location in red and says so in
    // its name; a location within its limit stays as it was.
    const outline = document.querySelector("[data-error=la] polygon");
    expect(outline?.getAttribute("stroke")).toBe("rgb(179,38,30)");
    expect(document.querySelector(".bt-doll--armor [data-loc=la]")?.getAttribute("aria-label")).toBe("Left Arm, 16 armor, in error");
    expect(document.querySelector("[data-error=ra]")).toBeNull();
  });

  it("moves focus to a location's armor field when it is chosen on the doll", async () => {
    await saved(mordelBiped());
    const user = userEvent.setup();
    await open("imported-1");
    await user.click(await screen.findByRole("button", { name: "Left Arm, 8 armor" }));
    expect(document.activeElement).toBe(screen.getByLabelText("LA, Left Arm armor"));
    expect(screen.getByRole("button", { name: "Left Arm", pressed: true })).toBeTruthy();
  });

  it("draws a quad doll, and choosing a leg on it focuses that leg armor field", async () => {
    await saved(mordelQuad());
    const user = userEvent.setup();
    await open("imported-1");
    expect(await field("FLL, Front Left Leg armor")).toBeTruthy();
    expect(screen.queryByText("No doll is drawn for this body type yet.")).toBeNull();
    await user.click(await screen.findByRole("button", { name: "Rear Right Leg, 16 armor" }));
    expect(document.activeElement).toBe(screen.getByLabelText("RRL, Rear Right Leg armor"));
  });
});
