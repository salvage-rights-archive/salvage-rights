import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import AsMulImport from "./AsMulImport";

afterEach(cleanup);

function Where() {
  const state = useLocation().state as { draft?: { name: unknown; source: unknown } } | null;
  return <p data-testid="draft">{JSON.stringify(state?.draft ? { name: state.draft.name, source: state.draft.source } : null)}</p>;
}

const PAGE = `<html><body><h1 class="ba-title">Test Hornet THR-1</h1><span class="ba-crumb">Search / Test Hornet</span>
<div class="u-kv"><span class="k">Type</span><span class="v">BattleMech</span><span class="k">Role</span><span class="v">Striker</span></div>
<div class="u-statgrid"><div><div class="k">PV</div><div class="v">28</div></div><div><div class="k">Size</div><div class="v">2</div></div><div><div class="k">Move</div><div class="v">10"</div></div>
<div><div class="k">Armor</div><div class="v">4</div></div><div><div class="k">Struct</div><div class="v">3</div></div></div>
<div class="u-abilrow"><span class="aschip">DMG 2/2/1/0</span></div></body></html>`;

function renderImport() {
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route path="/home" element={<AsMulImport />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("From a Master Unit List page on the Alpha Strike home", () => {
  it("opens a picked page as a draft, and says plainly when the file is not a unit page", async () => {
    const user = userEvent.setup();
    renderImport();
    const field = screen.getByLabelText("Saved Master Unit List page");
    await user.upload(field, new File(["<html><body>nothing here</body></html>"], "other.html", { type: "text/html" }));
    expect(await screen.findByText(/not a Master Unit List unit page/)).toBeTruthy();
    await user.upload(field, new File([PAGE], "unit.html", { type: "text/html" }));
    await waitFor(() => { expect(screen.getByTestId("draft").textContent).toContain("Test Hornet"); });
    expect(screen.getByTestId("draft").textContent).toContain("mul-export");
  });
});
