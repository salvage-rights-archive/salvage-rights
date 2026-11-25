import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mordelBiped, mordelOdd } from "../rules/fixtures";
import ImportPage from "./ImportPage";
import type { MordelClient, MordelFailure, MordelResult } from "./mordel-client";
import { openFamilyStorage } from "./storage";

const control = vi.hoisted(() => ({ failSetKey: false }));

vi.mock("./storage", async (importOriginal) => {
  const original = await importOriginal<typeof import("./storage")>();
  return {
    ...original,
    openFamilyStorage: async () => {
      const real = await original.openFamilyStorage();
      return { ...real, setKey: (key: string) => (control.failSetKey ? Promise.reject(new Error("disk full")) : real.setKey(key)) };
    },
  };
});

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  control.failSetKey = false;
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
  return (
    <>
      <p data-testid="where">{location.pathname + location.search}</p>
      <p data-testid="state">{JSON.stringify(location.state)}</p>
    </>
  );
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
    await userEvent.setup().click(screen.getByRole("button", { name: "Show key" }));
    expect(field.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide key" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("tests a key: says it works, or shows the client message as is, keeping the typed key out of every message", async () => {
    const user = userEvent.setup();
    let result: MordelResult<true> = { ok: true, value: true };
    renderImport(fakeClient({ testKey: () => Promise.resolve(result) }));
    const field = await screen.findByLabelText<HTMLInputElement>("Mordel key");
    await user.type(field, "sekrit-key-123");
    const cases: [MordelResult<true>, string, string][] = [
      [{ ok: true, value: true }, "status", "That key works."],
      [failure("bad-key", "mordel.net did not accept that key."), "alert", "mordel.net did not accept that key."],
      [failure("slow-down", "mordel.net asked us to slow down. Try again in a minute."), "alert", "mordel.net asked us to slow down. Try again in a minute."],
      [failure("offline", "We could not reach mordel.net. You may be offline."), "alert", "We could not reach mordel.net. You may be offline."],
    ];
    for (const [next, role, text] of cases) {
      result = next;
      await user.click(screen.getByRole("button", { name: "Test key" }));
      await waitFor(() => {
        expect(screen.getByRole(role).textContent).toBe(text);
      });
      expect(field.value).toBe("sekrit-key-123");
      expect(document.body.textContent).not.toContain("sekrit-key-123");
    }
  });

  it("saves a key, shows it as saved without displaying it, removes it; refuses an empty key and reports a failed save", async () => {
    const user = userEvent.setup();
    renderImport(fakeClient());
    const field = await screen.findByLabelText<HTMLInputElement>("Mordel key");
    const save = screen.getByRole("button", { name: "Save key" });
    await waitFor(() => {
      expect((save as HTMLButtonElement).disabled).toBe(false);
    });
    await user.click(save);
    expect(screen.getByRole("alert").textContent).toBe("Type your key first.");

    control.failSetKey = true;
    await user.type(field, "abc123");
    await user.click(save);
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("We could not save that on this device.");
    });
    expect(field.value).toBe("abc123");

    control.failSetKey = false;
    await user.click(save);
    expect(await screen.findByText("A key is saved on this device.")).toBeTruthy();
    expect(await (await openFamilyStorage()).getKey()).toBe("abc123");
    expect(screen.queryByLabelText("Mordel key")).toBeNull();
    expect(document.body.textContent).not.toContain("abc123");
    await user.click(screen.getByRole("button", { name: "Remove key" }));
    expect(await screen.findByLabelText("Mordel key")).toBeTruthy();
    expect(await (await openFamilyStorage()).getKey()).toBeUndefined();
  });

  it("imports unit 474, saves it and opens the editor with the import notes; a cv reference is refused", async () => {
    const user = userEvent.setup();
    await (await openFamilyStorage()).setKey("abc123");
    const unit = vi.fn(() => Promise.resolve<MordelResult<unknown>>({ ok: true, value: mordelOdd() }));
    renderImport(fakeClient({ unit }));
    const box = await screen.findByLabelText("Unit number or address");
    await user.type(box, "cv 12");
    await user.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Only BattleMechs can be imported so far.");
    });
    expect(unit).not.toHaveBeenCalled();

    await user.clear(box);
    await user.type(box, "474");
    await user.click(screen.getByRole("button", { name: "Import" }));
    const where = await screen.findByTestId("where");
    expect(unit).toHaveBeenCalledWith("bm", 474);
    const saved = await (await openFamilyStorage()).list();
    expect(saved).toHaveLength(1);
    expect(where.textContent).toBe(`/battletech/classic/editor?id=${saved[0]?.id ?? ""}`);
    const state = JSON.parse(screen.getByTestId("state").textContent) as { notes: string[] };
    expect(state.notes).toContain("Frobnicator 9000 is not in our equipment table.");
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
});
