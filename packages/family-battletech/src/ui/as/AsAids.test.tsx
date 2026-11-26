import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bipedRecord, mount } from "../../rules/fixtures";
import { splitRecord } from "../../rules/omni";
import { openFamilyStorage } from "../storage";
import AsAidsPage from "./AsAidsPage";
import AsConvert from "./AsConvert";
import { resetPlayFilter } from "./playSettings";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetPlayFilter();
});
afterEach(cleanup);

describe("To-hit calculator", () => {
  it("builds the Target Number from the answers, shows the odds and the expected damage, and refuses a sprinter", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AsAidsPage />
      </MemoryRouter>,
    );
    // Skill 4, attacker moved (+0), 8 inches is Medium (+2), target TMM 2: 4 + 0 + 2 + 2 = 8, which 2D6 meets 15 times in 36.
    expect(screen.getByRole("status", { name: "" }).textContent).toContain("Target Number 8");
    expect(screen.getByRole("status", { name: "" }).textContent).toContain("42%");
    await user.type(screen.getByLabelText("Damage at medium range (from the card)"), "3");
    expect(screen.getByText(/Expected damage 1\.25/)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Attacker movement"), "sprint");
    expect(screen.getByText("A unit that sprinted cannot attack.")).toBeTruthy();
  });
});

describe("Play aids and the rules level", () => {
  it("has a section for each aid, and shows the optional ranges only once the level is Advanced", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AsAidsPage />
      </MemoryRouter>,
    );
    for (const name of ["To-hit calculator", "Ranges", "Heat", "Critical hits", "Turn sequence", "Movement costs"]) expect(screen.getByRole("heading", { name })).toBeTruthy();
    expect(screen.queryByLabelText("Extreme range is in play")).toBeNull();
    expect(screen.queryByText(/Horizon/)).toBeNull();
    const level = screen.getByLabelText("Rules level");
    await waitFor(() => { expect((level as HTMLSelectElement).disabled).toBe(false); });
    await user.selectOptions(level, "advanced");
    await user.click(screen.getByLabelText("Extreme range is in play"));
    // Extreme adds +6: 4 + 2 (TMM) + 6 = 12 at its edge, and its damage is the Long value less 1.
    expect(screen.getByText(/Extreme: Target Number 12/)).toBeTruthy();
    expect(screen.getByText(/past 60" to the board edge/)).toBeTruthy();
  });
});

function Where() {
  const state = useLocation().state as { draft?: { source: { kind: string; ref: string }; card: { type: string } } } | null;
  return <p data-testid="draft">{JSON.stringify(state?.draft ? { kind: state.draft.source.kind, ref: state.draft.source.ref, type: state.draft.card.type } : null)}</p>;
}

describe("Convert a Classic 'Mech", () => {
  it("lists the saved Classic 'Mechs and opens the converted card for review without saving it", async () => {
    const user = userEvent.setup();
    const record = bipedRecord();
    await (await openFamilyStorage()).save(record);
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="/home" element={<AsConvert />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    const pick = await screen.findByLabelText("Classic 'Mech");
    await waitFor(() => { expect(pick.querySelectorAll("option").length).toBe(2); });
    await user.selectOptions(pick, record.id);
    await user.click(screen.getByRole("button", { name: "Convert" }));
    await user.click(await screen.findByRole("button", { name: "Open the card to review" }));
    expect(JSON.parse((await screen.findByTestId("draft")).textContent)).toEqual({ kind: "converted", ref: record.id, type: "BM" });
  });

  it("lists each configuration of a saved OmniMech chassis and converts it directly", async () => {
    const user = userEvent.setup();
    const chassis = splitRecord(bipedRecord({ id: "omni-1", mounts: [{ ...mount("m1", "medium-laser-is", "RA", null), name: "Medium Laser" }] }), []);
    const configurationId = chassis.configurations[0]?.id ?? "";
    await (await openFamilyStorage()).saveOmni(chassis);
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="/home" element={<AsConvert />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    const pick = await screen.findByLabelText("Classic 'Mech");
    await waitFor(() => { expect(pick.querySelectorAll("option").length).toBe(2); });
    await user.selectOptions(pick, `omni-1:${configurationId}`);
    await user.click(screen.getByRole("button", { name: "Convert" }));
    expect(await screen.findByText(/Point Value \d+/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Open the card to review" }));
    expect(JSON.parse((await screen.findByTestId("draft")).textContent)).toMatchObject({ kind: "converted", ref: `omni-1:${configurationId}` });
  });
});
