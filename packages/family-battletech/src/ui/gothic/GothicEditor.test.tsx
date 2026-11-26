import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GOTHIC_BOX_SPECS, gothicBoxMechs } from "../../data/gothic-units";
import { GOTHIC_BASE } from "../../data/rulesets";
import { loadCatalog } from "../../rules/catalog";
import EditorPage from "../EditorPage";
import { openFamilyStorage } from "../storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

/** A saved copy of a box 'Mech, opened in the Gothic editor. */
async function openBox(model: string) {
  const box = gothicBoxMechs(await loadCatalog()).find((record) => record.name.model === model);
  if (!box) throw new Error(model);
  await (await openFamilyStorage()).save({ ...box, id: "g1" });
  const router = createMemoryRouter([{ path: `${GOTHIC_BASE}/editor`, element: <EditorPage /> }], { initialEntries: [`${GOTHIC_BASE}/editor?id=g1`] });
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 2, name: "Identity" });
}
const printedBv = (model: string) => GOTHIC_BOX_SPECS.find((spec) => spec.model === model)?.printedBv ?? 0;

describe("The editor in Gothic", () => {
  it("offers Gothic's choices only: no Type, Tech base or Show everything, Gothic levels and eras, and the Light Blazer with its inferred notes", async () => {
    const user = userEvent.setup();
    await openBox("FS9-HB");
    const card = screen.getByRole("heading", { level: 2, name: "Identity" }).closest("section");
    if (!card) throw new Error("no identity card");
    expect(within(card).queryByLabelText("Type")).toBeNull();
    expect(within(card).queryByLabelText("Tech base")).toBeNull();
    const level = within(card).getByLabelText<HTMLSelectElement>("Rules level");
    expect([...level.options].map((o) => o.text)).toEqual(["Introductory", "Standard", "Unofficial", "Fan-made", "Unlimited"]);
    expect([...within(card).getByLabelText<HTMLSelectElement>("Era").options].map((o) => o.text.split(" (")[0])).toEqual(["Any era", "Age of War", "Star League", "Endless War"]);
    await user.click(screen.getByRole("button", { name: "Add equipment" }));
    const dialog = screen.getByRole("dialog", { name: "Add equipment" });
    expect(within(dialog).queryByRole("checkbox", { name: "Show everything" })).toBeNull();
    await user.type(within(dialog).getByLabelText("Search by name"), "blazer");
    const blazer = within(dialog).getByRole("button", { name: /^Light Blazer/ });
    expect(blazer.textContent).toMatch(/Unofficial level.*weight not printed; inferred.*Battle Value not printed; inferred/);
    await user.clear(within(dialog).getByLabelText("Search by name"));
    await user.type(within(dialog).getByLabelText("Search by name"), "xl");
    expect(within(dialog).queryByRole("button", { name: /XL/ })).toBeNull();
  });

  it("hides the Official and Tournament check panels and the OFFICIAL badge, which only Classic defines", async () => {
    await openBox("UM-R60B");
    expect(screen.queryByRole("heading", { name: "Tournament check" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Official or not" })).toBeNull();
    expect(screen.queryByText(/NOT OFFICIAL|licensed-noncanon|Standard or lower/)).toBeNull();
  });

  it("shows no cost, and the printed Battle Value beside ours that says when it differs after a change", async () => {
    const user = userEvent.setup();
    await openBox("PXH-1T");
    expect(screen.queryByTestId("cost-total")).toBeNull();
    expect(screen.queryByText(/C-bills/)).toBeNull();
    expect(screen.getByTestId("bv-printed").textContent).toBe(`As printed on the sheet: ${printedBv("PXH-1T").toLocaleString("en-US")}`);
    const ours = Number(screen.getByTestId("bv-total").textContent?.replace(/\D/g, ""));
    await user.clear(screen.getByLabelText("CT, Center Torso front armor"));
    await user.type(screen.getByLabelText("CT, Center Torso front armor"), "1");
    await waitFor(() => { expect(Number(screen.getByTestId("bv-total").textContent?.replace(/\D/g, ""))).toBeLessThan(ours); });
    expect(screen.getByText(/^Differs from the printed Battle Value/)).toBeTruthy();
  });

  it("toggles the searchlight on the record and adds no weight", async () => {
    const user = userEvent.setup();
    await openBox("FS9-HB");
    const weight = () => document.querySelector('[aria-controls="bt-weight-lines"]')?.textContent;
    const before = weight();
    await user.click(screen.getByRole("checkbox", { name: /^Searchlight/ }));
    expect(weight()).toBe(before);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => { expect((await (await openFamilyStorage()).get("g1"))?.record).toMatchObject({ gothic: { searchlight: true } }); });
  });
});
