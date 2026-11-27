import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DraftOffer, useRecordHistory } from "./useRecordHistory";

interface Unit {
  id: string;
  tons: number;
}

function Editor({ initial }: { initial: Unit }) {
  const { record, edit, save, draft } = useRecordHistory(initial, () => Promise.resolve());
  return (
    <div>
      <DraftOffer draft={draft} />
      <output>{record.tons}</output>
      <button type="button" onClick={() => { edit((d) => { d.tons += 5; }); }}>Heavier</button>
      <button type="button" onClick={() => { void save(); }}>Save</button>
    </div>
  );
}

const open = (initial: Unit) => render(<RouterProvider router={createMemoryRouter([{ path: "/", element: <Editor initial={initial} /> }])} />);

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
});

describe("the unsaved draft", () => {
  it("is offered on the next visit and restored as one step; saving clears it", async () => {
    const user = userEvent.setup();
    const first = open({ id: "u1", tons: 20 });
    await user.click(screen.getByRole("button", { name: "Heavier" }));
    first.unmount();

    open({ id: "u1", tons: 20 });
    expect(screen.getByRole("status").textContent).toBe("20");
    await user.click(screen.getByRole("button", { name: "Restore them" }));
    expect(screen.getByRole("status").textContent).toBe("25");
    expect(screen.queryByRole("group", { name: "Unsaved changes from an earlier visit" })).toBeNull();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(localStorage.getItem("sr-draft:u1")).toBeNull();
  });

  it("is dropped when the player discards it, and a draft for another record is never offered", async () => {
    localStorage.setItem("sr-draft:u1", JSON.stringify({ id: "other", tons: 99 }));
    const wrong = open({ id: "u1", tons: 20 });
    expect(screen.queryByRole("button", { name: "Restore them" })).toBeNull();
    wrong.unmount();

    localStorage.setItem("sr-draft:u1", JSON.stringify({ id: "u1", tons: 99 }));
    open({ id: "u1", tons: 20 });
    await userEvent.setup().click(screen.getByRole("button", { name: "Discard them" }));
    expect(localStorage.getItem("sr-draft:u1")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("20");
  });
});
