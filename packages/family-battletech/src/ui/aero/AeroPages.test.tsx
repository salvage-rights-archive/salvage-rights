import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AERO_EDITIONS } from "../../data/aero";
import { newAeroRecord } from "../../rules/aero";
import type { AeroRecord } from "../../rules/aero";
import AeroEditorPage from "./AeroEditorPage";
import AeroHomePage from "./AeroHomePage";
import AeroSheetPage from "./AeroSheetPage";
import { AERO_EDITOR, AERO_HOME, AERO_SHEET } from "./routes";
import { openAeroStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

const fighter = (id: string, editionId: string, extra: Partial<AeroRecord> = {}): AeroRecord => ({
  ...newAeroRecord({ id, chassis: "Sabre", model: "SB-27", unitType: "aerospace-fighter", tons: 25, safeThrust: 7, year: 3050 }, editionId),
  ...extra,
});
const save = async (record: AeroRecord) => void (await (await openAeroStorage()).save(record));

function openEditor(id: string) {
  const router = createMemoryRouter(
    [
      { path: AERO_EDITOR, element: <AeroEditorPage /> },
      { path: AERO_HOME, element: <h1>AeroTech home</h1> },
    ],
    { initialEntries: [`${AERO_EDITOR}?id=${id}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
const optionsOf = (label: string) => within(screen.getByLabelText(label)).getAllByRole("option").map((o) => o.textContent);

describe("AeroTech pages", () => {
  it("the home lists the five editions oldest first with the current rules as the default", async () => {
    const router = createMemoryRouter([{ path: AERO_HOME, element: <AeroHomePage /> }], { initialEntries: [AERO_HOME] });
    render(<RouterProvider router={router} />);
    const cards = await screen.findAllByRole("heading", { level: 3 });
    expect(cards.map((h) => h.textContent)).toEqual(AERO_EDITIONS.map((e) => e.name));
    expect(screen.getAllByText("Default edition")).toHaveLength(1);
    expect(cards.at(-1)?.parentElement?.textContent).toContain("Default edition");
    expect((screen.getByLabelText("Edition") as HTMLSelectElement).value).toBe("tw-tm-so");
    // The file input waits for storage.
    await waitFor(() => { expect((screen.getByLabelText("Import a file") as HTMLInputElement).disabled).toBe(false); });
  });

  it("changing the edition in the new-unit form resets only what the edition lacks", async () => {
    const user = userEvent.setup();
    render(<RouterProvider router={createMemoryRouter([{ path: AERO_HOME, element: <AeroHomePage /> }], { initialEntries: [AERO_HOME] })} />);
    await user.type(await screen.findByLabelText("Name"), "Wasp");
    await user.selectOptions(screen.getByLabelText("Type"), "conventional-fighter");
    const tons = screen.getByLabelText("Tons");
    await user.clear(tons);
    await user.type(tons, "30");
    await user.selectOptions(screen.getByLabelText("Edition"), "aerotech-1986");
    // AeroTech (1986) builds no conventional fighter: the type moves to its own, the name and the tons (still in its range) stay.
    expect(optionsOf("Type")).toEqual(["Aerospace fighter"]);
    expect((screen.getByLabelText("Type") as HTMLSelectElement).value).toBe("aerospace-fighter");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Wasp");
    expect((screen.getByLabelText("Tons") as HTMLInputElement).value).toBe("30");
    // BattleSpace has no type we build yet: none is listed, and nothing can be started.
    await user.selectOptions(screen.getByLabelText("Edition"), "battlespace");
    expect(optionsOf("Type").join()).not.toContain("fighter");
    expect((screen.getByRole("button", { name: "Start building" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("the editor offers only what the unit's edition builds", async () => {
    const user = userEvent.setup();
    await save(fighter("old", "aerotech-1986", { techBase: "inner-sphere" }));
    openEditor("old");
    await screen.findByRole("heading", { level: 1, name: "Sabre SB-27" });
    expect(optionsOf("Type")).toEqual(["Aerospace fighter"]);
    expect(optionsOf("Engine type")).toEqual(["Standard Fusion"]);
    expect(optionsOf("Heat sink type")).toEqual(["Single"]);
    expect(optionsOf("Tech base")).toEqual(["Inner Sphere"]);
    expect(screen.queryByLabelText("Rules level")).toBeNull();
    // Its weapon list is its own table: a medium laser, no extended-range one.
    await user.click(screen.getByRole("button", { name: "Add equipment to Nose" }));
    const picker = within(screen.getByRole("dialog"));
    await user.type(picker.getByLabelText("Search by name"), "medium laser");
    expect(picker.getByRole("button", { name: /^Medium Laser/ })).toBeTruthy();
    expect(picker.queryByRole("button", { name: /^ER Medium Laser/ })).toBeNull();
    await user.keyboard("{Escape}");
    cleanup();
    await save(fighter("new", "tw-tm-so", { rulesLevel: "standard" }));
    openEditor("new");
    await screen.findByRole("heading", { level: 1, name: "Sabre SB-27" });
    expect(optionsOf("Type")).toContain("Conventional fighter");
    expect(optionsOf("Engine type")).toContain("XL Fusion");
    expect(screen.getByLabelText("Rules level")).toBeTruthy();
  });

  it("asks before leaving with unsaved changes, and saving ends the question", async () => {
    const user = userEvent.setup();
    await save(fighter("a", "tw-tm-so"));
    const router = openEditor("a");
    await user.type(await screen.findByLabelText("Model"), "X");
    void router.navigate(AERO_HOME);
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("You have unsaved changes.")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Stay" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await (await openAeroStorage()).get("a"))?.record?.name.model).toBe("SB-27X");
    await router.navigate(AERO_HOME);
    expect(await screen.findByRole("heading", { name: "AeroTech home" })).toBeTruthy();
  });

  it("the check panel shows findings with their page, and Check under another edition lists that edition's", async () => {
    const user = userEvent.setup();
    await save(fighter("a", "aerotech-1986", { armor: { type: "standard", tons: 0, points: { NO: 20 } } }));
    openEditor("a");
    const panel = within((await screen.findByRole("heading", { name: "Rules check" })).closest("section") as HTMLElement);
    expect(panel.getByText(/20 armor points are set but the armor gives 10/)).toBeTruthy();
    expect(panel.getByText(/AeroTech.*p\. \d+/)).toBeTruthy();
    await user.selectOptions(panel.getByLabelText("Check under"), "aerotech2");
    const under = within(panel.getByRole("region", { name: "Check under AeroTech 2" }));
    expect(under.getByText(/20 armor points are set but the armor gives 0/)).toBeTruthy();
    // The unit itself is unchanged.
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("every unit reads NOT OFFICIAL until the player states a book; a change to the design takes it away, and Undo gets it back", async () => {
    const user = userEvent.setup();
    await save(fighter("a", "tw-tm-so"));
    openEditor("a");
    const panel = within((await screen.findByRole("heading", { name: "Official or not" })).closest("section") as HTMLElement);
    expect(panel.getByText("NOT OFFICIAL")).toBeTruthy();
    expect((panel.getByRole("button", { name: "Mark OFFICIAL" }) as HTMLButtonElement).disabled).toBe(true);
    await user.type(panel.getByLabelText("Book"), "TechManual");
    await user.type(panel.getByLabelText("Page (optional)"), "12");
    await user.click(panel.getByRole("button", { name: "Mark OFFICIAL" }));
    expect(panel.getByText("OFFICIAL")).toBeTruthy();
    expect(panel.getByText("TechManual, p. 12")).toBeTruthy();
    // A change to the design (not the name) turns it NOT OFFICIAL and says which book it came from.
    await user.type(screen.getByLabelText("Fuel tons"), "1");
    expect(panel.getByText("NOT OFFICIAL")).toBeTruthy();
    expect(panel.getByText(/changed from the published design in TechManual/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(panel.getByText("OFFICIAL")).toBeTruthy();
    await user.click(panel.getByRole("button", { name: "Mark NOT OFFICIAL" }));
    expect(panel.getByText("NOT OFFICIAL")).toBeTruthy();
    expect(panel.queryByText(/changed from/)).toBeNull();
  });

  it("the sheet page prints a fighter and a DropShip, says plainly when a unit has no sheet, and links the editor to it", async () => {
    await save(fighter("a", "tw-tm-so"));
    await save({ ...newAeroRecord({ id: "d", chassis: "Leopard", model: "", unitType: "dropship", tons: 1900 }, "tw-tm-so") });
    await save({ ...newAeroRecord({ id: "x", chassis: "Odd", model: "", unitType: "dropship", tons: 1900 }, "aerotech-1986") });
    const router = createMemoryRouter(
      [
        { path: AERO_SHEET, element: <AeroSheetPage /> },
        { path: AERO_EDITOR, element: <AeroEditorPage /> },
        { path: AERO_HOME, element: <h1>AeroTech home</h1> },
      ],
      { initialEntries: [`${AERO_SHEET}?id=a`] },
    );
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Sabre SB-27 record sheet" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Sabre SB-27 aerospace fighter record sheet" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Print" })).toBeTruthy();
    await router.navigate(`${AERO_SHEET}?id=d`);
    expect(await screen.findByRole("img", { name: "Leopard aerodyne civilian dropship record sheet" })).toBeTruthy();
    await router.navigate(`${AERO_SHEET}?id=x`);
    expect(await screen.findByText(/We have no record sheet for this unit type/)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    // From the editor, a fighter and a DropShip link to their sheets and a unit with none does not.
    await router.navigate(`${AERO_EDITOR}?id=a`);
    expect(await screen.findByRole("link", { name: "Record sheet" })).toBeTruthy();
    await router.navigate(`${AERO_EDITOR}?id=d`);
    await screen.findByRole("heading", { level: 1, name: "Leopard" });
    expect(screen.getByRole("link", { name: "Record sheet" })).toBeTruthy();
    await router.navigate(`${AERO_EDITOR}?id=x`);
    await screen.findByRole("heading", { level: 1, name: "Odd" });
    expect(screen.queryByRole("link", { name: "Record sheet" })).toBeNull();
  });

  it("a WarShip's editor offers the station-keeping drive and the ship systems only where the edition builds them, and the check speaks for the edition", async () => {
    const user = userEvent.setup();
    await save({ ...newAeroRecord({ id: "w", chassis: "Mjolnir", model: "", unitType: "warship", tons: 500000, year: 3070 }, "tw-tm-so") });
    await save({ ...newAeroRecord({ id: "w2", chassis: "Old Mjolnir", model: "", unitType: "warship", tons: 500000, year: 3070 }, "aerotech2") });
    openEditor("w");
    await screen.findByRole("heading", { level: 1, name: "Mjolnir" });
    expect(optionsOf("Drive")).toEqual(["Maneuvering drive", "Station-keeping drive"]);
    expect(screen.getByLabelText("Docking hardpoint")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Drive"), "station-keeping");
    // The drive gives no Safe Thrust to choose, and the check says what the book leaves out.
    expect(screen.queryByLabelText("Safe Thrust")).toBeNull();
    expect(screen.getByText("Max Thrust 1")).toBeTruthy();
    expect(await screen.findByText(/gives this drive no Max Thrust/)).toBeTruthy();
    cleanup();
    openEditor("w2");
    await screen.findByRole("heading", { level: 1, name: "Old Mjolnir" });
    expect(screen.queryByLabelText("Drive")).toBeNull();
    expect(screen.getByLabelText("Built to tow other vessels")).toBeTruthy();
  });
});
