import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseSpecials } from "../../rules/as-unit";
import AsAidsPage from "./AsAidsPage";
import { GlossSwitch, SpecialLinks } from "./AsSpecials";
import { resetPlayFilter } from "./playSettings";
import { resetSpecialSettings } from "./specialSettings";

beforeEach(() => {
  localStorage.clear();
  resetSpecialSettings();
  resetPlayFilter();
});
afterEach(cleanup);

describe("Special abilities", () => {
  it("lists the standard abilities with their pages, adds our note only when the switch is on, and keeps a followed link's code listed", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/aids#special-HPG"]}>
        <AsAidsPage />
      </MemoryRouter>,
    );
    const amp = document.getElementById("special-AMP");
    expect(amp?.textContent).toContain("Amphibious, Alpha Strike: Commander's Edition, p. 76");
    expect(amp?.textContent).not.toContain("naval");
    // HPG is optional and the level is Standard, but the link asked for it, so it is listed, without a mark.
    expect(document.getElementById("special-HPG")?.textContent).toBeTruthy();
    expect(document.getElementById("special-ABA")).toBeNull();
    await user.click(screen.getAllByLabelText("Show our short notes")[0]!);
    expect(document.getElementById("special-AMP")?.textContent).toContain("naval");
    await user.selectOptions(screen.getByLabelText("Rules level"), "advanced");
    expect(document.getElementById("special-ABA")).toBeTruthy();
  });

  it("writes each special on a card as a link to its aids entry with its page, and a code we do not know plainly", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SpecialLinks specials={parseSpecials("IF1, CASE, QQ1")} />
        <GlossSwitch id="g" />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/battletech/alpha-strike/aids#special-IF", "/battletech/alpha-strike/aids#special-CASE"]);
    expect(screen.getByText("p. 78")).toBeTruthy();
    expect(screen.getByText("QQ1")).toBeTruthy();
    expect(screen.queryByText(/with a spotter/)).toBeNull();
    await user.click(screen.getByLabelText("Show our short notes"));
    expect(screen.getByText(/with a spotter/)).toBeTruthy();
  });
});
