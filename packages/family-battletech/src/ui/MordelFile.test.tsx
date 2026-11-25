import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter, Route, RouterProvider, Routes, createMemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BLK, CRAWLER, STRIDER } from "../rules/mordel-files.fixtures";
import EditorPage from "./EditorPage";
import HomePage from "./HomePage";
import { openFamilyStorage } from "./storage";
import AsMordelFile from "./as/AsMordelFile";
import { openAsStorage } from "./as/storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

const file = (text: string, name: string) => new File([text], name, { type: "text/plain" });

function renderClassic() {
  const router = createMemoryRouter(
    [
      { path: "/battletech/classic/home", element: <HomePage /> },
      { path: "/battletech/classic/editor", element: <EditorPage /> },
      { path: "/battletech/alpha-strike/home", element: <p>Alpha Strike home</p> },
    ],
    { initialEntries: ["/battletech/classic/home"] },
  );
  render(<RouterProvider router={router} />);
}

describe("Importing a Mordel file on the Classic home", () => {
  it("opens a 'Mech file in the editor unsaved, credits the unnamed member, and keeps it only when Save is pressed", async () => {
    const user = userEvent.setup();
    renderClassic();
    await user.upload(await screen.findByLabelText("Import a file from Mordel"), file(STRIDER, "Test_Strider_TS-1.mtf"));
    expect(await screen.findByRole("heading", { level: 1, name: "Test Strider TS-1" })).toBeTruthy();
    expect(screen.getByText("This 'Mech is not saved yet. Review it, then press Save.")).toBeTruthy();
    expect(screen.getByText("Designed by a mordel.net member on mordel.net")).toBeTruthy();
    expect(await (await openFamilyStorage()).list()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => {
      expect(await (await openFamilyStorage()).list()).toHaveLength(1);
    });
    await waitFor(() => {
      expect(screen.queryByText(/is not saved yet/)).toBeNull();
    });
  });

  it("says plainly that a vehicle file cannot be built in Classic and offers the Alpha Strike route", async () => {
    const user = userEvent.setup();
    renderClassic();
    await user.upload(await screen.findByLabelText("Import a file from Mordel"), file(BLK, "Test_Crawler.blk.txt"));
    expect(await screen.findByText(/no vehicle builder yet/)).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Go to the Alpha Strike home" }));
    expect(await screen.findByText("Alpha Strike home")).toBeTruthy();
  });
});

describe("Importing a Mordel Alpha Strike conversion", () => {
  function Where() {
    const state = useLocation().state as { draft?: { name: unknown; source: unknown } } | null;
    return <p data-testid="draft">{JSON.stringify(state?.draft ? { name: state.draft.name, source: state.draft.source } : null)}</p>;
  }
  const renderAs = () =>
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="/home" element={<AsMordelFile />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

  it("opens a vehicle's conversion text for review without saving it, and refuses a vehicle file or a 'Mech file plainly", async () => {
    const user = userEvent.setup();
    renderAs();
    const input = await screen.findByLabelText("Alpha Strike Conversion file");
    await user.upload(input, file(BLK, "x.blk.txt"));
    expect(await screen.findByText(/holds no Alpha Strike values/)).toBeTruthy();
    await user.upload(input, file(STRIDER, "x.mtf"));
    expect(await screen.findByText(/This is a 'Mech file/)).toBeTruthy();
    await user.upload(input, file(CRAWLER, "Test_Crawler_-_Alpha_Strike_Conversion.txt"));
    const draft = JSON.parse((await screen.findByTestId("draft")).textContent) as { name: { chassis: string }; source: { kind: string; credit: string } };
    expect(draft.name.chassis).toBe('"Test" Crawler');
    expect(draft.source).toMatchObject({ kind: "mordel" });
    expect(await (await openAsStorage()).list()).toEqual([]);
  });
});
