import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newAsForce } from "../../rules/as-force";
import { newAsUnit } from "../../rules/as-unit";
import type { AsUnit } from "../../rules/as-unit";
import AsForcePage from "./AsForcePage";
import AsHomePage from "./AsHomePage";
import { resetPlayFilter } from "./playSettings";
import { openAsStorage, toForceFile } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetPlayFilter();
});
afterEach(cleanup);

const unit = (id: string, chassis: string, pv: number): AsUnit => {
  const u = newAsUnit(id);
  u.name = { chassis, model: "" };
  u.card.pv = pv;
  return u;
};

function renderAt(entry: string) {
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          { path: "/battletech/alpha-strike/home", element: <AsHomePage /> },
          { path: "/battletech/alpha-strike/force", element: <AsForcePage /> },
        ],
        { initialEntries: [entry] },
      )}
    />,
  );
}

describe("Alpha Strike force pages", () => {
  it("adds roster units, adjusts the total when a Skill changes, says so in words when over the limit, and keeps the changes", async () => {
    const user = userEvent.setup();
    const storage = await openAsStorage();
    await storage.save(unit("a", "Archer", 35));
    await storage.save(unit("b", "Banshee", 39));
    await storage.saveForce({ ...newAsForce("f1", "Strike lance"), pvLimit: 70 });
    renderAt("/battletech/alpha-strike/force?id=f1");
    await screen.findByRole("heading", { level: 1, name: "Strike lance" });
    const totals = screen.getByRole("region", { name: "Totals" });
    expect(totals.textContent).toContain("0 PV of 70 (70 to spare)");
    for (const name of ["Archer (PV 35)", "Banshee (PV 39)"]) {
      await user.selectOptions(screen.getByLabelText("Unit"), name);
      await user.click(screen.getByRole("button", { name: "Add to force" }));
    }
    expect(totals.textContent).toContain("74 PV of 70 (4 over the limit)");
    const [first] = screen.getAllByRole("listitem");
    await user.selectOptions(within(first as HTMLElement).getByLabelText("Skill"), "6");
    expect(totals.textContent).toContain("66 PV of 70 (4 to spare)"); // 35 at Skill 6 is 27, plus 39
    await user.type(within(first as HTMLElement).getByLabelText("Pilot"), "Ada");
    await waitFor(async () => {
      const saved = (await storage.getForce("f1"))?.force;
      expect(saved?.members).toEqual([{ unitId: "a", skill: 6, pilot: "Ada" }, { unitId: "b", skill: 4 }]);
    });
  });

  it("copies a force from the home page and asks before replacing a unit in an imported force file that differs from yours", async () => {
    const user = userEvent.setup();
    const storage = await openAsStorage();
    await storage.save(unit("a", "Archer", 35));
    await storage.saveForce({ ...newAsForce("f1", "Strike lance"), members: [{ unitId: "a", skill: 4 }] });
    renderAt("/battletech/alpha-strike/home");
    await user.click(await screen.findByRole("button", { name: "Duplicate Strike lance" }));
    expect(await screen.findByText("Strike lance copy", { exact: false })).toBeTruthy();
    expect((await storage.listForces()).length).toBe(2);

    const theirs = unit("a", "Archer", 50);
    const file = new File([JSON.stringify(toForceFile({ ...newAsForce("f9", "Imported"), members: [{ unitId: "a", skill: 4 }] }, [theirs]))], "x.as-force.json", { type: "application/json" });
    await user.upload(screen.getByLabelText("Import a force file"), file);
    const prompt = await screen.findByRole("group", { name: "Units that differ" });
    expect(prompt.textContent).toContain("Archer");
    await user.click(within(prompt).getByRole("button", { name: "Keep mine" }));
    await waitFor(async () => {
      expect((await storage.listForces()).some((f) => f.id === "f9")).toBe(true);
    });
    expect((await storage.get("a"))?.unit?.card.pv).toBe(35);
  });
});

describe("the game year and tech base", () => {
  it("leave a later unit and the other tech base out of the unit list for a force, and the home shows the era", async () => {
    const user = userEvent.setup();
    const storage = await openAsStorage();
    await storage.save({ ...unit("a", "Archer", 35), year: 3025, techBase: "inner-sphere" });
    await storage.save({ ...unit("b", "Banshee", 39), year: 3060, techBase: "inner-sphere" });
    await storage.save({ ...unit("c", "Cougar", 30), year: 3000, techBase: "clan" });
    await storage.saveForce(newAsForce("f1", "Lance"));
    renderAt("/battletech/alpha-strike/home");
    expect(await screen.findByText("3025, Late Succession War - Renaissance")).toBeTruthy();
    await user.type(await screen.findByLabelText("Game year"), "3040");
    await user.selectOptions(screen.getByLabelText("Tech base"), "inner-sphere");
    await waitFor(async () => { expect(await storage.getFilter()).toEqual({ year: 3040, techBase: "inner-sphere" }); });
    cleanup();
    renderAt("/battletech/alpha-strike/force?id=f1");
    const picker = await screen.findByLabelText("Unit");
    expect([...picker.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["Choose a unit", "Archer (PV 35)"]);
  });
});

describe("the game era", () => {
  it("sits beside the game year, follows it, and an era chosen sets the year to the middle of its span", async () => {
    const user = userEvent.setup();
    const storage = await openAsStorage();
    renderAt("/battletech/alpha-strike/home");
    const era = await screen.findByLabelText("Era");
    await waitFor(() => { expect((era as HTMLSelectElement).disabled).toBe(false); });
    await user.type(screen.getByLabelText("Game year"), "3025");
    expect((era as HTMLSelectElement).value).toBe("late-succession-war-renaissance");
    await user.selectOptions(era, "dark-ages");
    await waitFor(async () => { expect((await storage.getFilter()).year).toBe(3141); });
    expect(era.closest(".bt-yearera")?.contains(screen.getByLabelText("Game year"))).toBe(true);
  });
});

describe("the rules level", () => {
  it("leaves a unit above the level out of the unit list for a force, and brings it back when the level is raised", async () => {
    const user = userEvent.setup();
    const storage = await openAsStorage();
    await storage.save({ ...unit("a", "Archer", 35), rulesLevel: "standard" });
    await storage.save({ ...unit("b", "Banshee", 39), rulesLevel: "advanced" });
    await storage.save(unit("c", "Cougar", 30));
    await storage.saveForce(newAsForce("f1", "Lance"));
    const names = async () => [...(await screen.findByLabelText("Unit")).querySelectorAll("option")].map((o) => o.textContent).sort();
    renderAt("/battletech/alpha-strike/force?id=f1");
    expect(await names()).toEqual(["Archer (PV 35)", "Choose a unit", "Cougar (PV 30)"]);
    cleanup();
    renderAt("/battletech/alpha-strike/home");
    const level = await screen.findByLabelText("Rules level");
    await waitFor(() => { expect((level as HTMLSelectElement).disabled).toBe(false); });
    await user.selectOptions(level, "advanced");
    await waitFor(async () => { expect((await storage.getFilter()).rulesLevel).toBe("advanced"); });
    cleanup();
    renderAt("/battletech/alpha-strike/force?id=f1");
    expect(await names()).toEqual(["Archer (PV 35)", "Banshee (PV 39)", "Choose a unit", "Cougar (PV 30)"]);
  });
});
