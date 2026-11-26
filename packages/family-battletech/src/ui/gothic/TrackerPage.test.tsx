import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newAbominationUnit, newForce, newForceMech, newForceUnit } from "../../rules/abomination";
import { openGothicStorage } from "./storage";
import TrackerPage from "./TrackerPage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

/** Saves a unit of the type, opens the page and puts the unit on the table. */
async function play(typeId: string, user: ReturnType<typeof userEvent.setup>) {
  const storage = await openGothicStorage();
  await storage.save({ ...newAbominationUnit(typeId, `${typeId}-1`), label: "Test" });
  return show(user);
}
async function show(user: ReturnType<typeof userEvent.setup>) {
  render(<MemoryRouter><TrackerPage /></MemoryRouter>);
  await waitFor(() => { expect(screen.queryByText("Loading your units.")).toBeNull(); }, { timeout: 5000 });
  const put = screen.queryByRole("button", { name: /^Put on the table: / });
  if (put) await user.click(put);
  return await screen.findByRole("heading", { level: 2, name: /\(/ });
}
const fact = (name: string) => screen.getByText(name).parentElement?.querySelector("dd")?.textContent;
const column = (weapon: string) => screen.getAllByRole("listitem").find((li) => li.querySelector("strong")?.textContent?.endsWith(weapon))?.textContent;

describe("The Abomination tracker", () => {
  it("offers only the units of the force it was opened from", async () => {
    const storage = await openGothicStorage();
    await storage.save({ ...newAbominationUnit("tyrant", "t-1"), label: "In force" });
    await storage.save({ ...newAbominationUnit("gnat", "g-1"), label: "Left out" });
    await storage.saveForce({ ...newForce("f1"), name: "Lance", units: [newForceUnit("t-1", "e1")] });
    render(<MemoryRouter initialEntries={["/play?force=f1"]}><TrackerPage /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Put on the table: In force (Tyrant)" }, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Left out/ })).toBeNull();
    expect(screen.getByText(/Showing the units of Lance/)).toBeTruthy();
  });

  it("tracks a unit entered twice as two, and applies the Handler bonus only to the entry whose 'Mech has a Handler", async () => {
    const user = userEvent.setup();
    const storage = await openGothicStorage();
    await storage.save({ ...newAbominationUnit("tyrant", "t-1"), label: "Twin" });
    await storage.saveForce({
      ...newForce("f1"),
      mechs: [{ ...newForceMech("r-1", "m1"), handler: true }],
      units: [{ ...newForceUnit("t-1", "e1"), handlerOf: "m1", handlerBonus: true }, newForceUnit("t-1", "e2")],
    });
    render(<MemoryRouter initialEntries={["/play?force=f1"]}><TrackerPage /></MemoryRouter>);
    const puts = await screen.findAllByRole("button", { name: "Put on the table: Twin (Tyrant)" }, { timeout: 5000 });
    expect(puts).toHaveLength(2);
    await user.click(puts[0]!);
    await user.click(screen.getByRole("button", { name: "Put on the table: Twin (Tyrant)" }));
    const stumbles = screen.getAllByText("Stumble target").map((dt) => dt.parentElement?.querySelector("dd")?.textContent);
    expect(stumbles).toEqual(["3", "4"]);
  });

  it("counts damage past a creature's last pip toward the phase, and End phase clears it", async () => {
    const user = userEvent.setup();
    await play("gnat", user);
    await user.click(screen.getByRole("button", { name: /^Add 1 extra damage: / }));
    expect(fact("Damage this phase")).toBe("1");
    await user.click(screen.getByRole("button", { name: /^End phase: / }));
    expect(fact("Damage this phase")).toBe("0");
  });

  it("takes a creature out when its last pip is marked and raises the attack modifier", async () => {
    const user = userEvent.setup();
    await play("tyrant", user);
    expect(fact("Active creatures")).toBe("3 of 3");
    await user.click(screen.getByRole("button", { name: "Creature 1 pip 26" }));
    expect(fact("Active creatures")).toBe("2 of 3");
    expect(fact("Attack modifier")).toBe("+1");
    expect(screen.getByRole("group", { name: /Creature 1, 26 of 26 pips marked, out/ })).toBeTruthy();
  });

  it("runs a launcher out of shots", async () => {
    const user = userEvent.setup();
    await play("tyrant", user);
    const spend = await screen.findByRole("button", { name: /Spend a shot: SRM 5 1/ });
    await user.click(spend);
    expect(screen.getByText(/SRM 5 1: 0 shots left/)).toBeTruthy();
    expect((spend as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/SRM 5 2: 1 shot left/)).toBeTruthy();
  });

  it("drops the cluster column with a creature: launcher tubes times creatures, other weapons the creatures", async () => {
    const user = userEvent.setup();
    await play("tyrant", user);
    await waitFor(() => { expect(column("SRM 5")).toContain("Cluster column 15"); });
    expect(column("Small Laser")).toContain("Cluster column 3");
    await user.click(screen.getByRole("button", { name: "Creature 2 pip 26" }));
    expect(column("SRM 5")).toContain("Cluster column 10");
    expect(column("Small Laser")).toContain("Cluster column 2");
  });

  it("shows the stumble target after 21 damage in a phase, and End phase clears the damage but not the loss", async () => {
    const user = userEvent.setup();
    await play("tyrant", user);
    expect(fact("Stumble target")).toBe("4");
    await user.click(screen.getByRole("button", { name: "Creature 1 pip 21" }));
    expect(fact("Damage this phase")).toBe("21");
    expect(fact("Stumble target")).toBe("5");
    await user.click(screen.getByRole("button", { name: "End phase: Test (Tyrant)" }));
    expect(fact("Damage this phase")).toBe("0");
    expect(screen.getByRole("group", { name: /Creature 1, 21 of 26 pips marked/ })).toBeTruthy();
  });

  it("answers a creature roll, and says roll again for a 5 or 6 on a four-creature unit", async () => {
    const user = userEvent.setup();
    await play("devil", user);
    const result = within(screen.getByRole("status"));
    await user.click(screen.getByRole("button", { name: "Rolled 3" }));
    expect(result.getByText("Creature 3.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Rolled 5" }));
    expect(result.getByText("Roll again.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Rolled 6" }));
    expect(result.getByText("Roll again.")).toBeTruthy();
  });

  it("keeps the table across a reload", async () => {
    const user = userEvent.setup();
    await play("tyrant", user);
    await user.click(screen.getByRole("button", { name: "Creature 1 pip 5" }));
    await user.click(screen.getByRole("button", { name: /Spend a shot: SRM 5 2/ }));
    cleanup();
    await show(user);
    expect(await screen.findByRole("group", { name: /Creature 1, 5 of 26 pips marked/ })).toBeTruthy();
    expect(screen.getByText(/SRM 5 2: 0 shots left/)).toBeTruthy();
  });
});
