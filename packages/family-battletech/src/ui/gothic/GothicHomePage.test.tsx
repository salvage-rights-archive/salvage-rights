import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { RouterProvider, createMemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GOTHIC_BOX_SPECS, gothicBoxMechs } from "../../data/gothic-units";
import { GOTHIC_BASE } from "../../data/rulesets";
import { loadCatalog } from "../../rules/catalog";
import { bipedRecord } from "../../rules/fixtures";
import EditorPage from "../EditorPage";
import HomePage from "../HomePage";
import { openFamilyStorage, toMechFile } from "../storage";
import GothicHomePage from "./GothicHomePage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(cleanup);

const GOTHIC_HOME = `${GOTHIC_BASE}/home`;
const Where = () => {
  const at = useLocation();
  return <p>{`at ${at.pathname}${at.search}`}</p>;
};

function open(path: string, ...pages: [string, React.ReactElement][]) {
  const router = createMemoryRouter(
    [...pages.map(([p, element]) => ({ path: p, element })), { path: "*", element: <Where /> }],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const classic = (id: string, model: string) => bipedRecord({ id, name: { chassis: "Test Walker", model } });
const boxCopy = async (id: string, model = "FS9-HB") => {
  const box = gothicBoxMechs(await loadCatalog()).find((record) => record.name.model === model);
  if (!box) throw new Error(model);
  return { ...box, id };
};

describe("BattleTech: Gothic home", () => {
  it("lists only Gothic 'Mechs, and the Classic home only Classic ones", async () => {
    const storage = await openFamilyStorage();
    await storage.save(classic("c1", "CL-1"));
    await storage.save(await boxCopy("g1"));
    open(GOTHIC_HOME, [GOTHIC_HOME, <GothicHomePage />]);
    expect(await screen.findByRole("link", { name: "Open Firestarter FS9-HB" })).toBeTruthy();
    expect(screen.queryByText(/Test Walker/)).toBeNull();
    cleanup();
    open("/battletech/classic/home", ["/battletech/classic/home", <HomePage />]);
    expect(await screen.findByRole("link", { name: "Open Test Walker CL-1" })).toBeTruthy();
    expect(screen.queryByText(/FS9-HB/)).toBeNull();
  });

  it("starts from a box 'Mech: saves a copy of its own and opens the Gothic editor on it", async () => {
    const user = userEvent.setup();
    const spec = GOTHIC_BOX_SPECS.find((s) => s.model === "FS9-HB");
    const router = open(GOTHIC_HOME, [GOTHIC_HOME, <GothicHomePage />]);
    const start = await screen.findByRole("button", { name: `Start from ${spec?.chassis ?? ""} FS9-HB` });
    await waitFor(() => {
      expect((start as HTMLButtonElement).disabled).toBe(false);
    }, { timeout: 5000 });
    await user.click(start);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`${GOTHIC_BASE}/editor`);
    }, { timeout: 5000 });
    const id = new URLSearchParams(router.state.location.search).get("id") ?? "";
    const entries = await (await openFamilyStorage()).list();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe(id);
    expect(id).not.toMatch(/^gothic-box-/);
    expect(entries[0]?.record?.editionId).toBe("gothic");
  });

  it("builds from Gothic's choices only: no Type or Tech base, the Gothic levels with Unofficial, the three eras and the year 3015", async () => {
    open(GOTHIC_HOME, [GOTHIC_HOME, <GothicHomePage />]);
    const form = await screen.findByRole("form", { name: "Build a new Gothic 'Mech" });
    expect(within(form).queryByLabelText("Type")).toBeNull();
    expect(within(form).queryByLabelText("Tech base")).toBeNull();
    const levels = within(form).getByLabelText("Rules level");
    expect(within(levels).getAllByRole("option").map((o) => o.textContent)).toEqual(["Introductory", "Standard", "Unofficial", "Fan-made", "Unlimited"]);
    expect(within(within(form).getByLabelText("Era")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Age of War", "Star League", "Endless War"]);
    expect((within(form).getByLabelText("Year") as HTMLInputElement).value).toBe("3015");
  });

  it("refuses a Classic file here and a Gothic file on the Classic page, each with a pointer to the other", async () => {
    const user = userEvent.setup();
    const file = (record: ReturnType<typeof classic>) => new File([JSON.stringify(toMechFile(record))], "x.json", { type: "application/json" });
    // The file input stays disabled until the page's storage is open, as a player would see it.
    const input = async () => {
      const found = await screen.findByLabelText<HTMLInputElement>("Import a file");
      await waitFor(() => {
        expect(found.disabled).toBe(false);
      }, { timeout: 10_000 });
      return found;
    };
    open(GOTHIC_HOME, [GOTHIC_HOME, <GothicHomePage />]);
    await user.upload(await input(), file(classic("c1", "CL-1")));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("That is a Classic file. Import it on the Classic page.");
    }, { timeout: 5000 });
    expect(screen.getByRole("link", { name: "Go to the Classic home" }).getAttribute("href")).toBe("/battletech/classic/home");
    cleanup();
    open("/battletech/classic/home", ["/battletech/classic/home", <HomePage />]);
    await user.upload(await input(), file(await boxCopy("g1")));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("That is a Gothic file. Import it on the Gothic page.");
    }, { timeout: 5000 });
    expect(screen.getByRole("link", { name: "Go to the Gothic home" }).getAttribute("href")).toBe(GOTHIC_HOME);
    expect(await (await openFamilyStorage()).list()).toHaveLength(0);
  });

  it("gives a Gothic record's editor its sheet and home links under Gothic's own base", async () => {
    await (await openFamilyStorage()).save(await boxCopy("g1"));
    const router = createMemoryRouter([{ path: `${GOTHIC_BASE}/editor`, element: <EditorPage /> }], { initialEntries: [`${GOTHIC_BASE}/editor?id=g1`] });
    render(<RouterProvider router={router} />);
    expect((await screen.findByRole("link", { name: "Record sheet" })).getAttribute("href")).toBe(`${GOTHIC_BASE}/sheet?id=g1`);
    expect(screen.getByRole("link", { name: /Your 'Mechs/ }).getAttribute("href")).toBe(GOTHIC_HOME);
  });
});
