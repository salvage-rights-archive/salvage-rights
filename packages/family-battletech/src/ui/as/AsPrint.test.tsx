import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newAsForce } from "../../rules/as-force";
import { printCard, printRoster } from "../../rules/as-print";
import { newAsUnit, parseSpecials } from "../../rules/as-unit";
import type { AsUnit } from "../../rules/as-unit";
import AsCardFace from "./AsCardFace";
import AsPrintPage from "./AsPrintPage";
import { openAsStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

const mech = (): AsUnit => {
  const u = newAsUnit("m1");
  u.name = { chassis: "Thunderbolt", model: "TDR-5S" };
  u.card = { ...u.card, type: "BM", size: 3, tmm: 1, move: [{ inches: 8, mode: "" }], role: "Brawler", pv: 36, damage: { s: { value: 3 }, m: { value: 3 }, l: { value: 1 } }, ov: 1, armor: 7, structure: 5, specials: parseSpecials("IF1, CASE") };
  return u;
};

const vehicle = (): AsUnit => {
  const u = newAsUnit("v1");
  u.name = { chassis: "Test Tank", model: "TT-1" };
  u.card = { ...u.card, type: "CV", size: 2, tmm: 2, move: [{ inches: 6, mode: "t" }], role: "Sniper", pv: 20, damage: { s: { value: 2 }, m: { value: 2 }, l: { value: 0, minimal: true } }, ov: 0, armor: 4, structure: 3, specials: [] };
  return u;
};

const textOf = (container: HTMLElement) => container.textContent;
const count = (container: HTMLElement, selector: string) => container.querySelectorAll(selector).length;

describe("Alpha Strike printed card", () => {
  it("fills every field of the blank card for a 'Mech (with a heat scale) and for a vehicle (with motive boxes and no heat scale)", () => {
    const m = render(<AsCardFace card={printCard(mech(), 3)} />).container;
    // Skill 3 costs more than the base 36: the adjusted PV is on the card and the base beside it.
    for (const field of ["Thunderbolt TDR-5S", "PV:", "TP: BM", "SZ: 3", "TMM: 1", "MV: 8\"", "ROLE: Brawler", "SKILL: 3", "S (+0)", "L (+4)", "OV: 1", "HEAT SCALE", "SPECIAL:", "IF1, CASE", "CRITICAL HITS", "ALPHA STRIKE STATS", "ASCE p. 213"]) {
      expect(textOf(m), field).toContain(field);
    }
    expect(m.querySelector(".as-cardface__pv")?.textContent).toBe(String(printCard(mech(), 3).pv));
    expect(count(m, ".as-cardface__heat")).toBe(4);
    expect(count(m, ".as-cardface__crit")).toBe(1 + 4 + 4 + 4);
    cleanup();
    const v = render(<AsCardFace card={printCard(vehicle(), 4)} />).container;
    expect(textOf(v)).toContain("TP: CV");
    expect(textOf(v)).toContain("MV: 6\"t");
    expect(textOf(v)).not.toContain("HEAT SCALE");
    expect(textOf(v)).toContain("MOTIVE MV");
    expect(count(v, ".as-cardface__crit")).toBe(1 + 4 + 4 + 5);
  });

  it("draws exactly as many armor and structure bubbles as the card has, however many", () => {
    const m = render(<AsCardFace card={printCard(mech(), 4)} />).container;
    expect(count(m, ".as-cardface__bubble--armor")).toBe(7);
    expect(count(m, ".as-cardface__bubble--structure")).toBe(5);
    cleanup();
    const big = mech();
    big.card.armor = 60;
    big.card.structure = 45;
    const b = render(<AsCardFace card={printCard(big, 4)} />).container;
    expect(count(b, ".as-cardface__bubble--armor")).toBe(60);
    expect(count(b, ".as-cardface__bubble--structure")).toBe(45);
  });

  it("totals the roster at each member's Skill and leaves out a unit the roster no longer holds", () => {
    const force = { ...newAsForce("f", "Strike lance"), pvLimit: 60, members: [{ unitId: "m1", skill: 3 }, { unitId: "v1", skill: 5, pilot: "Ash" }, { unitId: "gone", skill: 4 }] };
    const roster = printRoster(force, new Map([["m1", mech()], ["v1", vehicle()]]));
    const m = printCard(mech(), 3);
    const v = printCard(vehicle(), 5);
    expect(roster.total).toBe(m.pv + v.pv);
    expect(roster.rows.map((r) => r.pv)).toEqual([m.pv, v.pv]);
    expect(roster.missing).toBe(1);
  });

  it("prints a force: ten cards make two sheets, and the roster page lists the total", async () => {
    const storage = await openAsStorage();
    const members = [];
    for (let i = 0; i < 10; i += 1) {
      const u = { ...mech(), id: `u${String(i)}` };
      await storage.save(u);
      members.push({ unitId: u.id, skill: 4 });
    }
    await storage.saveForce({ ...newAsForce("f1", "Strike lance"), members });
    render(<RouterProvider router={createMemoryRouter([{ path: "/battletech/alpha-strike/print", element: <AsPrintPage /> }], { initialEntries: ["/battletech/alpha-strike/print?force=f1"] })} />);
    expect(await screen.findByRole("region", { name: "Cards, sheet 2 of 2" })).toBeTruthy();
    expect(document.querySelectorAll(".as-sheet__cards")[0]?.children.length).toBe(9);
    expect(screen.getByRole("region", { name: "Force roster" }).textContent).toContain("Total, 10 units360");
    expect(screen.getAllByText(/ASCE p\. 213/).length).toBeGreaterThan(0);
  });
});
