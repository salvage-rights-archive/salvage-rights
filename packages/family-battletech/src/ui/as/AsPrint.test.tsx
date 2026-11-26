import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newAsForce } from "../../rules/as-force";
import { bubbleLayout, fitSpecials, printCard, printRoster } from "../../rules/as-print";
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
    big.card.armor = 40;
    big.card.structure = 30;
    const b = render(<AsCardFace card={printCard(big, 4)} />).container;
    expect(count(b, ".as-cardface__bubble--armor")).toBe(40);
    expect(count(b, ".as-cardface__bubble--structure")).toBe(30);
    cleanup();
    // Past what a pencil can mark, the card prints the figures in two boxes, as the book's DropShip card does.
    big.card.armor = 150;
    big.card.structure = 120;
    const n = render(<AsCardFace card={printCard(big, 4)} />).container;
    expect(count(n, ".as-cardface__bubble")).toBe(0);
    expect([...n.querySelectorAll(".as-cardface__figure")].map((t) => t.textContent)).toEqual(["150", "120"]);
  });

  it("gives a unit with no armor a row of its own, so the A: and S: labels do not meet", () => {
    const layout = bubbleLayout(0, 5, 156, 26);
    expect(layout.rows.armor).toBe(1);
    expect(layout.structure[0]?.y).toBeGreaterThan(layout.pitch);
    const none = mech();
    none.card.armor = 0;
    const labels = [...render(<AsCardFace card={printCard(none, 4)} />).container.querySelectorAll("text")].filter((t) => t.textContent === "A:" || t.textContent === "S:");
    expect(new Set(labels.map((t) => t.getAttribute("y"))).size).toBe(2);
  });

  it("squeezes a long all-capitals name, the stats row and the role to their boxes, and fits special abilities by shrinking, then by pointing to the roster", () => {
    const wide = mech();
    wide.name = { chassis: "WARHAMMER HEAVY ASSAULT WALKER", model: "WHM-6R-PROTOTYPE" };
    wide.card.move = [{ inches: 12, mode: "" }, { inches: 10, mode: "j" }, { inches: 8, mode: "t" }, { inches: 6, mode: "h" }];
    wide.card.role = "MISSILE BOAT SKIRMISHER";
    const c = render(<AsCardFace card={printCard(wide, 4)} />).container;
    const guarded = [...c.querySelectorAll("text[data-fit]")].map((t) => t.textContent);
    expect(guarded.some((t) => t?.includes("WARHAMMER"))).toBe(true);
    expect(guarded.some((t) => t?.startsWith("TP:"))).toBe(true);
    expect(guarded.some((t) => t?.startsWith("ROLE:"))).toBe(true);
    // Few abilities keep the large type; more shrink it; too many name the roster and cut no ability in half.
    expect(fitSpecials("IF1, CASE").size).toBe(6.8);
    const some = fitSpecials(Array.from({ length: 20 }, (_, i) => `AB${String(i).padStart(2, "0")}1`).join(", "));
    expect(some.more).toBe(false);
    expect(some.size).toBeLessThan(6.8);
    const lots = fitSpecials(Array.from({ length: 40 }, (_, i) => `ABIL${String(i)}(1/2/3)`).join(", "));
    expect(lots.more).toBe(true);
    expect(lots.lines.at(-1)).toBe("more on the roster");
    expect(lots.lines.slice(0, -1).join(" ")).toMatch(/\),$/);
  });

  it("leaves the OV line off the ProtoMech and large-unit cards and writes both Crew effects", () => {
    const proto = mech();
    proto.card.type = "PM";
    expect(printCard(proto, 4).ov).toBeNull();
    const ship = mech();
    ship.card.type = "DS";
    const s = render(<AsCardFace card={printCard(ship, 4)} />).container;
    expect(printCard(ship, 4).ov).toBeNull();
    expect(textOf(s)).toContain("+2 weapon TN");
    expect(textOf(s)).toContain("+2 control roll");
    expect(textOf(s)).toContain("DS only");
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
