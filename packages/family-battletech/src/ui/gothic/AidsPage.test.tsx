import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { ABOM_CLASSES, HOBBLE_LOCATIONS, MOB_LOCATIONS, PLANETARY_CONDITIONS, RANDOM_CREATURE } from "../../data/gothic";
import { loadCatalog } from "../../rules/catalog";
import AidsPage from "./AidsPage";

afterEach(cleanup);

async function page() {
  render(
    <MemoryRouter>
      <AidsPage />
    </MemoryRouter>,
  );
  await waitFor(() => { expect(within(screen.getByRole("table", { name: "Abomination-mounted weapons" })).getAllByRole("row").length).toBeGreaterThan(1); });
  return screen.getAllByTestId("aid-table");
}
const bodyRows = (section: HTMLElement) => within(section).getAllByRole("row").length - 1;

describe("Gothic rules reference", () => {
  it("draws every table from the data: row counts follow the data lists and the catalog", async () => {
    const sections = await page();
    const rows = Object.fromEntries(sections.map((s) => [s.dataset["table"], bodyRows(s)]));
    const abominationWeapons = (await loadCatalog()).all().filter((r) => r.kind === "weapon" && r.units?.includes("abomination") === true);
    expect(rows["classes"]).toBe(ABOM_CLASSES.length + 1);
    expect(rows["creature"]).toBe(RANDOM_CREATURE.length);
    expect(rows["mob-locations"]).toBe(MOB_LOCATIONS.length);
    expect(rows["hobble-locations"]).toBe(HOBBLE_LOCATIONS.length);
    expect(rows["conditions"]).toBe(PLANETARY_CONDITIONS.flatMap((c) => c.ids).length);
    // The weapons table lists every catalog row that Abominations carry.
    expect(rows["weapons"]).toBe(abominationWeapons.length);
  });

  it("names its pages under every table", async () => {
    const sections = await page();
    for (const section of sections) expect(within(section).getByTestId("aid-cite").textContent, section.dataset["table"]).toMatch(/\(Catalyst Game Labs\), pp?\. \d/);
  });

  it("keeps prose out: outside the tables each block is at most one sentence", async () => {
    const sections = await page();
    for (const block of document.querySelectorAll("p, li")) {
      const text = (block.textContent ?? "").trim();
      expect(text.split(/[.!?]\s+(?=[A-Z])/).length, text).toBeLessThanOrEqual(1);
    }
    expect(sections.length).toBeGreaterThan(10);
  });
});
