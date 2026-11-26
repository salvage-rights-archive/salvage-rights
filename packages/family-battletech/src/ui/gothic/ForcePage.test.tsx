import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gothicBoxMechs } from "../../data/gothic-units";
import { GOTHIC_BASE } from "../../data/rulesets";
import { newAbominationUnit, newForce, newForceMech, newForceUnit } from "../../rules/abomination";
import { battleValue } from "../../rules/bv";
import { loadCatalog } from "../../rules/catalog";
import { openFamilyStorage } from "../storage";
import ForcePage from "./ForcePage";
import { openGothicStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

/** Saves two box 'Mechs (the 30-ton UM-R60B first, then the PXH-1T) and seven Gnat units, and a force that holds them all. */
async function seed(): Promise<void> {
  const catalog = await loadCatalog();
  const box = gothicBoxMechs(catalog);
  const family = await openFamilyStorage();
  const gothic = await openGothicStorage();
  const records = ["UM-R60B", "PXH-1T"].map((model, i) => ({ ...(box.find((r) => r.name.model === model) ?? box[0]!), id: `mech-${String(i)}` }));
  for (const record of records) await family.save(record);
  const units = Array.from({ length: 7 }, (_, i) => ({ ...newAbominationUnit("gnat", `unit-${String(i)}`), label: `Gnat ${String(i + 1)}` }));
  for (const unit of units) await gothic.save(unit);
  await gothic.saveForce({
    ...newForce("f1"),
    name: "Test Lance",
    mechs: records.map((r, i) => ({ ...newForceMech(r.id, `m${String(i)}`), pilot: `Pilot ${String(i + 1)}` })),
    units: units.map((u, i) => newForceUnit(u.id, `e${String(i)}`)),
  });
}

async function show(user: ReturnType<typeof userEvent.setup>) {
  const router = createMemoryRouter([{ path: `${GOTHIC_BASE}/force`, element: <ForcePage /> }], { initialEntries: [`${GOTHIC_BASE}/force?id=f1`] });
  const view = render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 2, name: "The force at a glance" }, { timeout: 5000 });
  return { user, ...view };
}

describe("The Gothic force page", () => {
  it("totals the 'Mechs' Battle Value only, at the pilots' skills, and says Abominations have none", async () => {
    await seed();
    await show(userEvent.setup());
    const catalog = await loadCatalog();
    const box = gothicBoxMechs(catalog);
    const expected = ["UM-R60B", "PXH-1T"].reduce((sum, model) => sum + battleValue(box.find((r) => r.name.model === model)!, catalog, { gunnery: 4, piloting: 5 }).total, 0);
    expect(screen.getByTestId("force-bv").textContent).toBe(`'Mech Battle Value: ${expected.toLocaleString("en-US")}`);
    expect(screen.getByText(/Abomination units have no Battle Value in the book/)).toBeTruthy();
  });

  it("shows -2 when the leading pilot is Frayed, hides the Handler box in a 30-ton 'Mech and reports a unit with the bonus but no Handler", async () => {
    await seed();
    const { user } = await show(userEvent.setup());
    expect(screen.getByText("No Initiative modifier applies.")).toBeTruthy();
    await user.click(screen.getByLabelText(/^Frayed MechWarrior in .*UM-R60B/));
    expect(within(screen.getByRole("list", { name: "Initiative modifiers" })).getByText(/^Initiative −2: Led by a Frayed MechWarrior/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Handler aboard .*UM-R60B/)).toBeNull();
    expect(screen.getByLabelText(/^Handler aboard .*PXH-1T/)).toBeTruthy();
    await user.click(screen.getByLabelText("Handler bonus for Gnat 1 (Gnat)"));
    expect(within(screen.getByRole("list", { name: "Force findings" })).getByText(/Gnat 1 \(Gnat\) has the Handler bonus, but no 'Mech with a Handler aboard/)).toBeTruthy();
  });

  it("prints the 'Mech sheets with their pilots, then the units five to a page with the Handler written on both", async () => {
    await seed();
    const { user, container } = await show(userEvent.setup());
    await user.click(screen.getByLabelText(/^Handler aboard .*PXH-1T/));
    await user.selectOptions(screen.getByLabelText("Handler for Gnat 1 (Gnat)"), "m1");
    await user.click(screen.getByLabelText("Handler bonus for Gnat 1 (Gnat)"));
    await user.click(screen.getByRole("button", { name: "Print all sheets" }));
    await screen.findByRole("heading", { level: 1, name: "Test Lance record sheets" });
    const sheets = [...container.querySelectorAll<SVGSVGElement>("svg.bt-sheet")].map((svg) => svg.getAttribute("aria-label") ?? "");
    expect(sheets.map((label) => (label.startsWith("Abomination") ? "units" : "mech"))).toEqual(["mech", "mech", "units", "units"]);
    const texts = [...container.querySelectorAll("svg.bt-sheet text")].map((t) => t.textContent.trim());
    expect(texts).toContain("Pilot 2");
    expect(texts.some((t) => /^Handler for: .*Gnat 1/.test(t))).toBe(true);
    expect(texts.some((t) => t.includes("PXH-1T") && t.includes("Pilot 2"))).toBe(true);
  });

  it("keeps a saved force across a reload", async () => {
    await seed();
    const { user } = await show(userEvent.setup());
    await user.type(screen.getByLabelText("Force name"), " Two");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved.");
    cleanup();
    await show(userEvent.setup());
    await waitFor(() => { expect((screen.getByLabelText("Force name") as HTMLInputElement).value).toBe("Test Lance Two"); });
    expect((screen.getByLabelText(/^Pilot name for .*PXH-1T/) as HTMLInputElement).value).toBe("Pilot 2");
  });
});
