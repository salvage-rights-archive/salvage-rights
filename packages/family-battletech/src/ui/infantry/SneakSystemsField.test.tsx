import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { armorKitOf } from "../../data/infantry-tables";
import SneakSystemsField from "./SneakSystemsField";

afterEach(cleanup);

it("choosing camo on a one-system suit replaces IR; a two-system suit swaps by unchecking first", () => {
  const picked = vi.fn();
  const one = render(<SneakSystemsField kit={armorKitOf("sneak-1")!} systems={["ir"]} onChange={picked} />);
  fireEvent.click(screen.getByRole("radio", { name: "camo" }));
  expect(picked).toHaveBeenLastCalledWith(["camo"]);
  one.unmount();
  render(<SneakSystemsField kit={armorKitOf("sneak-2")!} systems={["ir", "ecm"]} onChange={picked} />);
  expect((screen.getByRole("checkbox", { name: "camo" }) as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: "IR" }));
  expect(picked).toHaveBeenLastCalledWith(["ecm"]);
});
