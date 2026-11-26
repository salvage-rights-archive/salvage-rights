import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import InfantryDiagram from "./InfantryDiagram";

afterEach(cleanup);

it("draws one doll for each sub-platoon and reports a pick under the sub-platoon's own code", () => {
  const picked = vi.fn();
  render(<InfantryDiagram use="armor" onSelect={picked} locations={[{ code: "pl1", name: "Sub-platoon 1", armor: 15 }, { code: "pl2", name: "Sub-platoon 2", armor: 14 }]} />);
  expect(screen.getAllByTestId("infantry-doll")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: /^Sub-platoon 2, 14/ }));
  expect(picked).toHaveBeenCalledWith("pl2");
});
