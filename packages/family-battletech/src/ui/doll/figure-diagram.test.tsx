import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import VehicleDiagram from "../vehicle/VehicleDiagram";

afterEach(cleanup);

it("lists a location the drawing has no place for as a button, so it can still be picked", () => {
  const picked = vi.fn();
  render(<VehicleDiagram use="armor" onSelect={picked} locations={[{ code: "f", name: "Front", armor: 10 }, { code: "sponson", name: "Sponson", armor: 4 }]} />);
  expect(screen.getByRole("button", { name: /^Front, 10 armor/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sponson, 4 armor" }));
  expect(picked).toHaveBeenCalledWith("sponson");
});
