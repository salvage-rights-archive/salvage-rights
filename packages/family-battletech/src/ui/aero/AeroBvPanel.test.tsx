import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { sheetProfileFor } from "../../data/aero-sheet";
import { newAeroRecord } from "../../rules/aero";
import { loadCatalog } from "../../rules/catalog";
import AeroBvPanel from "./AeroBvPanel";
import { fighterFacts } from "./sheet/facts";

afterEach(cleanup);
const catalog = await loadCatalog();

const fighter = (editionId: string) => ({
  ...newAeroRecord({ id: "f", unitType: "aerospace-fighter", tons: 50, safeThrust: 6, year: 3050 }, editionId),
  mounts: [{ id: "m1", equipmentId: "medium-laser-is", name: "Medium Laser", arc: "NO" }],
});

describe("the AeroTech Battle Value and cost panel", () => {
  it("an AeroTech 2 fighter with an item we cannot value shows 'at least' in the panel and leaves the sheet's BV field blank", () => {
    const record = fighter("aerotech2");
    render(<AeroBvPanel record={record} catalog={catalog} />);
    expect(screen.getByTestId("bv-total").textContent).toMatch(/^at least \d/);
    const profile = sheetProfileFor(record.editionId, record.unitType);
    if (!profile) throw new Error("no AeroTech 2 sheet");
    expect(fighterFacts(record, catalog, profile).bv).toBe("");
  });

  it("is not there at all for AeroTech (1986), which prints no Battle Value", () => {
    const { container } = render(<AeroBvPanel record={fighter("aerotech-1986")} catalog={catalog} />);
    expect(container.innerHTML).toBe("");
  });
});
