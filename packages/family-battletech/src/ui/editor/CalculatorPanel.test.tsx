import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { battleValue } from "../../rules/bv";
import { loadCatalog } from "../../rules/catalog";
import { unitCost } from "../../rules/cost";
import { mordelBiped } from "../../rules/fixtures";
import type { MechRecord } from "../../rules/mech";
import { fromMordel } from "../../rules/mordel";
import CalculatorPanel from "./CalculatorPanel";

afterEach(cleanup);

/** The made-up Mordel biped read against the real catalog, so that every item has a row. */
const bipedRecord = async (): Promise<MechRecord> => {
  const result = fromMordel(mordelBiped(), await loadCatalog(), "total-warfare", "2026-01-01T00:00:00Z", () => "calc-1");
  if (!result.ok) throw new Error(result.message);
  return result.record;
};
const panel = async (record: MechRecord) => {
  const catalog = await loadCatalog();
  render(<CalculatorPanel record={record} catalog={catalog} />);
  return { catalog, region: screen.getByRole("region", { name: "Battle Value and cost" }) };
};
const grouped = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

describe("The Battle Value and cost panel", () => {
  it("shows the engines' Battle Value and cost with separators, and cites the book", async () => {
    const record = await bipedRecord();
    const { catalog, region } = await panel(record);
    expect(within(region).getByTestId("bv-total").textContent).toBe(grouped(battleValue(record, catalog).total));
    expect(within(region).getByTestId("cost-total").textContent).toBe(`${grouped(unitCost(record, catalog).total)} C-bills`);
    expect(region.textContent).toContain("TechManual (Catalyst Game Labs), p. 285, errata v8.0");
    expect(region.textContent).not.toContain("Incomplete");
  });

  it("changes the Battle Value with the pilot's skills and the cost with the OmniMech box", async () => {
    const record = await bipedRecord();
    const user = userEvent.setup();
    const { catalog, region } = await panel(record);
    await user.selectOptions(within(region).getByLabelText("Gunnery"), "2");
    expect(within(region).getByTestId("bv-total").textContent).toBe(grouped(battleValue(record, catalog, { gunnery: 2, piloting: 5 }).total));
    await user.click(within(region).getByRole("checkbox", { name: /OmniMech/ }));
    expect(within(region).getByTestId("cost-total").textContent).toBe(`${grouped(unitCost(record, catalog, { omni: true }).total)} C-bills`);
  });

  it("opens and closes a breakdown with a button that says whether it is open", async () => {
    const user = userEvent.setup();
    const { region } = await panel(await bipedRecord());
    const toggle = within(region).getByRole("button", { name: "Show Battle Value breakdown" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(within(region).getByText("Defensive battle rating")).toBeTruthy();
  });

  it("says plainly that an item with no figure leaves the totals incomplete and lists it", async () => {
    const base = await bipedRecord();
    const odd = { id: "odd", equipmentId: "no-such-item", name: "Frobnicator", techBase: "inner-sphere" as const, location: "CT" as const, slot: null };
    const user = userEvent.setup();
    const { region } = await panel({ ...base, mounts: [...base.mounts, odd] });
    expect(region.textContent).toContain("Incomplete: 1 item has no BV figure");
    expect(within(region).getByTestId("bv-total").textContent).toMatch(/^at least /);
    expect(within(region).getByTestId("cost-total").textContent).toMatch(/^at least /);
    await user.click(within(region).getByRole("button", { name: "Show items with no BV figure" }));
    expect(within(region).getByText(/Frobnicator: /)).toBeTruthy();
  });

  it("shows both figures and the difference when Mordel gives another Battle Value", async () => {
    const base = await bipedRecord();
    const source = base.source;
    if (!source) throw new Error("no source");
    const record = { ...base, source: { ...source, values: { ...source.values, battleValue: 1 } } };
    const { catalog, region } = await panel(record);
    const ours = battleValue(record, catalog).baseBv;
    expect(region.textContent).toContain(`Mordel gives 1; we work out ${grouped(ours)}`);
    expect(region.textContent).toContain(`a difference of ${grouped(ours - 1)}`);
  });
});
