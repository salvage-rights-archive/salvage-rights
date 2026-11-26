import "fake-indexeddb/auto";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { newAsForce } from "../../rules/as-force";
import { newAsUnit } from "../../rules/as-unit";
import AsTablePage from "./AsTablePage";
import { openAsStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

describe("Alpha Strike table", () => {
  it("stages a hit until the turn ends, then applies it, keeps it across a reload and resets on request", async () => {
    const user = userEvent.setup();
    const storage = await openAsStorage();
    const unit = newAsUnit("u1");
    unit.name = { chassis: "Test Walker", model: "TW-1" };
    unit.card.armor = 4;
    unit.card.structure = 3;
    await storage.save(unit);
    const force = { ...newAsForce("f1", "Lance"), members: [{ unitId: "u1", skill: 4 }] };
    await storage.saveForce(force);
    const open = () => render(<MemoryRouter initialEntries={["/table?force=f1"]}><AsTablePage /></MemoryRouter>);
    open();
    await user.type(await screen.findByLabelText("Damage taken"), "5");
    await user.click(screen.getByRole("button", { name: "Stage the hit" }));
    expect(screen.getByText(/Waiting for the End Phase: 5 = 5/)).toBeTruthy();
    expect(screen.getByText("4 of 4")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "End the turn" }));
    expect(screen.getByRole("heading", { name: "Lance: turn 2" })).toBeTruthy();
    expect(screen.getByText("0 of 4")).toBeTruthy();
    expect(screen.getByText("2 of 3")).toBeTruthy();
    expect((await openStore("battletech").then((s) => s.get<{ turn: number }>("as-table:f1")))?.turn).toBe(2);
    cleanup();
    open();
    expect(await screen.findByRole("heading", { name: "Lance: turn 2" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reset game" }));
    await user.click(within(screen.getByRole("group", { name: "Confirm reset" })).getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("heading", { name: "Lance: turn 1" })).toBeTruthy();
    expect(screen.getByText("4 of 4")).toBeTruthy();
  });
});
