import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Bubbles } from "./AsTableParts";

afterEach(cleanup);

const bubbles = (count: number) => <Bubbles name="Armor" unit="armor" count={count} full={6} before={0} waiting={0} marking={0} onMark={() => undefined} />;

describe("armor and structure bubbles", () => {
  it("keeps one bubble in the tab order when the count drops below the remembered position", async () => {
    const { rerender } = render(bubbles(6));
    await userEvent.setup().click(screen.getByRole("button", { name: "Armor 6" }));
    rerender(bubbles(2));
    expect(screen.getAllByRole("button").filter((b) => b.tabIndex === 0)).toHaveLength(1);
  });
});
