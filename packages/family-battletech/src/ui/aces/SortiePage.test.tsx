import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newCampaign, newPilot } from "../../rules/aces-campaign";
import { newAsUnit } from "../../rules/as-unit";
import { openAsStorage } from "../as/storage";
import SortiePage from "./SortiePage";
import { openCampaignStorage } from "./campaign-storage";
import { openGameStorage } from "./game-storage";
import { ACES_GAME, ACES_SORTIE, sortieHref } from "./routes";

// The campaign, units and pilots are invented; only the opposing unit names are the book's.

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

describe("Sortie page", () => {
  it("sets up sortie 2 with the units found, offers to add the missing opposing units, hides a wounded pilot, and creates the linked game with the reconnaissance cost kept", async () => {
    const as = await openAsStorage();
    const unit = (id: string, chassis: string, model: string, pv: number) => {
      const u = newAsUnit(id);
      return { ...u, name: { chassis, model }, card: { ...u.card, role: "Brawler", pv, armor: 3, structure: 3 } };
    };
    await as.save(unit("m1", "Anvil", "AV-1", 30));
    await as.save(unit("t1", "Locust", "IIC 4", 30));
    const campaign = {
      ...newCampaign({ id: "c1", name: "Test run", book: "scouring-sands", difficulty: "standard", startWarchest: 400 }),
      roster: [{ unitId: "m1", name: "Anvil AV-1", type: "BM", pv: 30, size: 3, status: "active" as const }],
      pilots: [newPilot("p1", "Ash", "BM"), { ...newPilot("p2", "Birch", "BM"), wounded: true }],
    };
    await (await openCampaignStorage()).save(campaign);

    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        { path: ACES_SORTIE, element: <SortiePage /> },
        { path: ACES_GAME, element: <p>The game</p> },
      ],
      { initialEntries: [sortieHref("c1", 2)] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Start sortie 02" })).toBeTruthy();
    expect(screen.getByText("PV limit 120, adjusted for your difficulty 120. Fielded: 0 units, 0 PV.")).toBeTruthy();
    await user.click(screen.getByLabelText("Entry 02-Y, 60 SP"));
    expect(screen.getByText("Read 02-Y in your book.")).toBeTruthy();
    expect(screen.getByText("Reconnaissance cost: 60 SP, taken in the after-sortie expenses.")).toBeTruthy();
    // The unit and the pilot choice: the wounded pilot is not offered.
    await user.click(screen.getByLabelText("Anvil AV-1 (BM, 30 PV)"));
    const options = [...(screen.getByLabelText("Named Pilot of Anvil AV-1") as HTMLSelectElement).options].map((o) => o.textContent);
    expect(options).toEqual(["No Named Pilot", "Ash, Skill 4"]);
    await user.selectOptions(screen.getByLabelText("Named Pilot of Anvil AV-1"), "Ash, Skill 4");
    // Three of the four opposing units are not saved yet; the Fulcrums are two units of one name.
    expect(screen.getAllByRole("link", { name: /^Add this unit/ })).toHaveLength(3);
    expect(screen.getByText("3 of the opposing units are not in your Alpha Strike units yet. Add them, then come back to this page.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Create the game" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(ACES_GAME));
    const game = (await (await openGameStorage()).list())[0]?.game;
    expect(game?.campaign).toEqual({ campaignId: "c1", sortie: "2" });
    expect(game?.name).toBe("Sortie 2: Putting Down Roots");
    expect(game?.sides.player.units[0]).toMatchObject({ pilot: "Ash" });
    expect(game?.sides.automated.units.map((u) => u.name)).toEqual(["Locust IIC 4"]);
    const saved = (await (await openCampaignStorage()).get("c1"))?.campaign;
    expect(saved?.started).toEqual({ number: 2, gameId: game?.id, recon: [{ label: "Reconnaissance 02-Y", sp: 60 }] });
  });
});
