import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bipedRecord } from "../rules/fixtures";
import RecordBoundary from "./RecordBoundary";
import { openFamilyStorage } from "./storage";
import * as storageModule from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Explodes(): never {
  throw new Error("boom");
}

function open() {
  const router = createMemoryRouter(
    [
      { path: "/battletech/classic/sheet", element: <RecordBoundary id="bad-1"><Explodes /></RecordBoundary> },
      { path: "/battletech/classic/home", element: <p>Home page</p> },
    ],
    { initialEntries: ["/battletech/classic/sheet?id=bad-1"] },
  );
  render(<RouterProvider router={router} />);
}

describe("The saved 'Mech boundary", () => {
  it("replaces a page that throws with the record's id and its reason, and exports exactly what is stored", async () => {
    const storage = await openFamilyStorage();
    await storage.save(bipedRecord({ id: "bad-1" }));
    const downloads: [string, unknown][] = [];
    vi.spyOn(storageModule, "downloadJson").mockImplementation((name, value) => void downloads.push([name, value]));
    open();
    expect(await screen.findByRole("heading", { level: 1, name: "This 'Mech could not be shown" })).toBeTruthy();
    expect(screen.getByText("bad-1")).toBeTruthy();
    expect(screen.getByText("boom")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Export raw record" }));
    await waitFor(() => {
      expect(downloads).toHaveLength(1);
    });
    expect(downloads[0]).toEqual(["bad-1.raw.json", await storage.raw("bad-1")]);
    expect(downloads[0]?.[1]).toMatchObject({ record: { id: "bad-1" } });
  });

  it("deletes the record only after a second choice, then goes to the home page", async () => {
    const storage = await openFamilyStorage();
    await storage.save(bipedRecord({ id: "bad-1" }));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Delete this record" }));
    expect(await storage.get("bad-1")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Delete it for good" }));
    expect(await screen.findByText("Home page")).toBeTruthy();
    expect(await storage.get("bad-1")).toBeUndefined();
  });
});
