import "fake-indexeddb/auto";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mordelBiped } from "../rules/fixtures";
import ImportPage from "./ImportPage";
import type { MordelClient, MordelFailure, MordelResult } from "./mordel-client";
import { openFamilyStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

const failure = (f: MordelFailure, message: string): MordelResult<never> => ({ ok: false, failure: f, message });

function fakeClient(over: Partial<MordelClient> = {}): MordelClient {
  return {
    testKey: () => Promise.resolve({ ok: true, value: true }),
    unit: () => Promise.resolve({ ok: true, value: mordelBiped() }),
    myUnits: () => Promise.resolve({ ok: true, value: { rows: [], truncated: false } }),
    ...over,
  };
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function renderImport(client: MordelClient) {
  render(
    <MemoryRouter initialEntries={["/battletech/classic/import"]}>
      <Routes>
        <Route path="/battletech/classic/import" element={<ImportPage makeClient={() => client} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Import from Mordel", () => {
  it("with no key shows the key field and the credit", async () => {
    renderImport(fakeClient());
    expect(await screen.findByRole("heading", { level: 1, name: "Import from Mordel" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const field = screen.getByLabelText<HTMLInputElement>("Mordel key");
    expect(field.type).toBe("password");
    expect(field.autocomplete).toBe("off");
    expect(screen.getByRole("button", { name: "Test key" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save key" })).toBeTruthy();
    expect(screen.getByText("Uses the mordel.net API built by MordelBlacknight.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "mordel.net" }).getAttribute("href")).toBe("https://www.mordel.net/");
    const toggle = screen.getByRole("button", { name: "Show key" });
    await userEvent.setup().click(toggle);
    expect(field.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide key" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("reports a rejected key, keeps what was typed and never repeats the key", async () => {
    const user = userEvent.setup();
    renderImport(fakeClient({ testKey: () => Promise.resolve(failure("bad-key", "mordel.net did not accept that key.")) }));
    const field = await screen.findByLabelText<HTMLInputElement>("Mordel key");
    await user.type(field, "sekrit-key-123");
    await user.click(screen.getByRole("button", { name: "Test key" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("mordel.net did not accept that key.");
    expect(field.value).toBe("sekrit-key-123");
    expect(document.body.textContent).not.toContain("sekrit-key-123");
  });

  it("saves a key, then shows it as saved without displaying it", async () => {
    const user = userEvent.setup();
    renderImport(fakeClient());
    await user.type(await screen.findByLabelText("Mordel key"), "abc123");
    await user.click(screen.getByRole("button", { name: "Save key" }));
    expect(await screen.findByText("A key is saved on this device.")).toBeTruthy();
    expect(await (await openFamilyStorage()).getKey()).toBe("abc123");
    expect(screen.queryByLabelText("Mordel key")).toBeNull();
    expect(document.body.textContent).not.toContain("abc123");
    await user.click(screen.getByRole("button", { name: "Remove key" }));
    expect(await screen.findByLabelText("Mordel key")).toBeTruthy();
    expect(await (await openFamilyStorage()).getKey()).toBeUndefined();
  });

  it("imports unit 474 with a stored key, saves it and opens the editor; a cv reference is refused", async () => {
    const user = userEvent.setup();
    await (await openFamilyStorage()).setKey("abc123");
    const unit = vi.fn(() => Promise.resolve<MordelResult<unknown>>({ ok: true, value: mordelBiped() }));
    renderImport(fakeClient({ unit }));
    const box = await screen.findByLabelText("Unit number or address");
    await user.type(box, "cv 12");
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Only BattleMechs can be imported so far.");
    expect(unit).not.toHaveBeenCalled();

    await user.clear(box);
    await user.type(box, "474");
    await user.click(screen.getByRole("button", { name: "Import" }));
    const where = await screen.findByTestId("where");
    expect(unit).toHaveBeenCalledWith("bm", 474);
    const saved = await (await openFamilyStorage()).list();
    expect(saved).toHaveLength(1);
    expect(where.textContent).toBe(`/battletech/classic/editor?id=${saved[0]?.id ?? ""}`);
  });

  it("lists My designs with designer, and says so when there are none", async () => {
    await (await openFamilyStorage()).setKey("abc123");
    const row = { unitType: "bm", id: 7, name: "Test Walker TW-1", tons: 50, year: 3025, designer: "Somebody" };
    renderImport(fakeClient({ myUnits: () => Promise.resolve({ ok: true, value: { rows: [row], truncated: true } }) }));
    const item = (await screen.findByText(/Test Walker TW-1/)).closest("li");
    if (!item) throw new Error("no row");
    expect(within(item).getByText(/50 tons/)).toBeTruthy();
    expect(within(item).getByText(/Somebody/)).toBeTruthy();
    expect(screen.getByText("This list is cut short. mordel.net has more of your designs than we can show here.")).toBeTruthy();
    cleanup();
    renderImport(fakeClient());
    expect(await screen.findByText("You have no designs on mordel.net yet.")).toBeTruthy();
  });

  it("shows a slow-down or offline failure in an alert", async () => {
    const user = userEvent.setup();
    await (await openFamilyStorage()).setKey("abc123");
    const message = "We could not reach mordel.net. You may be offline.";
    renderImport(fakeClient({ unit: () => Promise.resolve(failure("offline", message)) }));
    await user.type(await screen.findByLabelText("Unit number or address"), "474");
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect((await screen.findByRole("alert")).textContent).toBe(message);
  });
});
