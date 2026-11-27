import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mordelAsBody } from "../../rules/fixtures";
import type { MordelClient, MordelResult } from "../mordel-client";
import { openFamilyStorage } from "../storage";
import AsMordelImport from "./AsMordelImport";
import { openAsStorage } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

const client = (reply: MordelResult<unknown>): MordelClient => ({
  testKey: () => Promise.resolve({ ok: true, value: true }),
  unit: () => Promise.resolve(reply),
  file: () => Promise.resolve({ ok: false, failure: "not-found", message: "no file" }),
  myUnits: () => Promise.resolve({ ok: true, value: { rows: [], truncated: false } }),
});

function Where() {
  const state = useLocation().state as { draft?: { source: unknown; name: unknown } } | null;
  return <p data-testid="draft">{JSON.stringify(state?.draft ? { name: state.draft.name, source: state.draft.source } : null)}</p>;
}

function renderImport(reply: MordelResult<unknown>) {
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route path="/home" element={<AsMordelImport makeClient={() => client(reply)} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("From Mordel on the Alpha Strike home", () => {
  it("asks for the key once, then opens the fetched unit for review without saving it", async () => {
    const user = userEvent.setup();
    renderImport({ ok: true, value: mordelAsBody() });
    await user.type(await screen.findByLabelText("Mordel key"), "made-up-key");
    await user.click(screen.getByRole("button", { name: "Save key" }));
    expect(await (await openFamilyStorage()).getKey()).toBe("made-up-key");
    await user.type(await screen.findByLabelText("Unit number or address"), "bm 900002");
    await user.click(screen.getByRole("button", { name: "Import from Mordel" }));
    const draft = JSON.parse((await screen.findByTestId("draft")).textContent) as { name: unknown; source: { credit: string; ref: string } };
    expect(draft.name).toEqual({ chassis: "Test Walker", model: "TW-1" });
    expect(draft.source.credit).toContain("MordelBlacknight");
    expect(await (await openAsStorage()).list()).toEqual([]);
  });

  it("says in plain words what went wrong, for a bad number, an unsupported type and a refusal", async () => {
    const user = userEvent.setup();
    await (await openFamilyStorage()).setKey("made-up-key");
    renderImport({ ok: false, failure: "not-found", message: "mordel.net has no unit with that number." });
    const field = await screen.findByLabelText("Unit number or address");
    const go = screen.getByRole("button", { name: "Import from Mordel" });
    const alert = screen.getByRole("alert");
    await user.type(field, "hello");
    await user.click(go);
    expect(alert.textContent).toBe("Enter a unit number such as 474, or a mordel.net address.");
    await user.clear(field);
    await user.type(field, "ba 5");
    await user.click(go);
    expect(alert.textContent).toMatch(/only for BattleMechs/);
    await user.clear(field);
    await user.type(field, "474");
    await user.click(go);
    await waitFor(() => { expect(alert.textContent).toBe("mordel.net has no unit with that number."); });
    expect(screen.queryByTestId("draft")).toBeNull();
  });
});
