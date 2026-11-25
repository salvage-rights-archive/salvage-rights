import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { bipedRecord } from "../rules/fixtures";
import HomePage from "./HomePage";
import { openFamilyStorage, toMechFile } from "./storage";

const control = vi.hoisted(() => ({ persistent: true, failSave: false }));

vi.mock("./storage", async (importOriginal) => {
  const original = await importOriginal<typeof import("./storage")>();
  return {
    ...original,
    openFamilyStorage: async () => {
      const real = await original.openFamilyStorage();
      return {
        ...real,
        persistent: control.persistent,
        save: (record: Parameters<typeof real.save>[0]) =>
          control.failSave ? Promise.reject(new Error("disk full")) : real.save(record),
      };
    },
  };
});

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  control.persistent = true;
  control.failSave = false;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderHome() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

const saved = (id: string, model: string, extra: Partial<ReturnType<typeof bipedRecord>> = {}) =>
  bipedRecord({ id, name: { chassis: "Test Walker", model }, ...extra });
const rawEdition = async () => (await openStore("battletech")).get<string>("edition");

describe("Classic BattleTech home", () => {
  it("on a first visit shows the edition and its books, an empty list and the import link, and stores a chosen edition", async () => {
    const user = userEvent.setup();
    renderHome();
    expect(await screen.findByRole("heading", { level: 1, name: "Classic BattleTech" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const select = await screen.findByLabelText<HTMLSelectElement>("Edition");
    expect(select.value).toBe("core-2026");
    expect(screen.getByText(/^Play: BattleTech Core Rulebook \(Catalyst Game Labs\), 2026, first printing\. Construction: TechManual \(Catalyst Game Labs\),/)).toBeTruthy();
    expect(await screen.findByText("No 'Mechs saved yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import from Mordel" }).getAttribute("href")).toBe("/battletech/classic/import");
    expect(await rawEdition()).toBeUndefined();
    await user.selectOptions(select, "core-2026");
    await waitFor(async () => {
      expect(await rawEdition()).toBe("core-2026");
    });
  });

  it("builds a new 'Mech from a name, tonnage and walking speed, offering only speeds an engine exists for", async () => {
    const user = userEvent.setup();
    renderHome();
    const form = await screen.findByRole("form", { name: "Build a new one" });
    await user.type(within(form).getByLabelText("Name"), " Digger ");
    await user.selectOptions(within(form).getByLabelText("Tonnage"), "75");
    const walk = within(form).getByLabelText<HTMLSelectElement>("Walking MP");
    expect([...walk.options].map((o) => o.value)).toEqual(["1", "2", "3", "4", "5"]);
    await user.selectOptions(walk, "5");
    await user.selectOptions(within(form).getByLabelText("Configuration"), "quad");
    await waitFor(() => expect(within(form).getByRole<HTMLButtonElement>("button", { name: "Start building" }).disabled).toBe(false));
    await user.click(within(form).getByRole("button", { name: "Start building" }));
    await waitFor(async () => {
      const [entry] = await (await openFamilyStorage()).list();
      expect(entry?.record).toMatchObject({
        name: { chassis: "Digger", model: "" },
        tons: 75,
        configuration: "quad",
        editionId: "core-2026",
        chassis: { engine: { type: "standard", rating: 375 } },
      });
    });
  });

  it("lists saved 'Mechs with tonnage and designer credit, duplicates, and deletes after a confirm", async () => {
    const user = userEvent.setup();
    const storage = await openFamilyStorage();
    await storage.save(
      saved("a", "TW-1", { source: { kind: "mordel", unitType: "bm", id: 5, designer: "", fetchedAt: "2026-01-01T00:00:00Z", original: null, values: {} } }),
    );
    await storage.save(saved("b", "TW-2"));
    renderHome();
    const row = (await screen.findByText("Test Walker TW-1")).closest("li");
    if (!row) throw new Error("no row");
    expect(within(row).getByText(/50 tons/)).toBeTruthy();
    expect(within(row).getByText("Designed by an unnamed designer on mordel.net")).toBeTruthy();
    expect(screen.getByText("Test Walker TW-2").closest("li")?.textContent).not.toContain("Designed by");
    expect(within(row).getByRole("link", { name: /^Open/ }).getAttribute("href")).toBe("/battletech/classic/editor?id=a");

    await user.click(within(row).getByRole("button", { name: /^Duplicate/ }));
    expect(await screen.findByText("Test Walker TW-1 (copy)")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Copy saved.");
    expect(await storage.list()).toHaveLength(3);

    await user.click(within(row).getByRole("button", { name: /^Delete/ }));
    expect(screen.getByText("Delete Test Walker TW-1? This cannot be undone.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Keep" }));
    expect(await storage.list()).toHaveLength(3);
    await user.click(within(row).getByRole("button", { name: /^Delete/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(async () => {
      expect(await storage.list()).toHaveLength(2);
    });
    expect(screen.getByRole("status").textContent).toBe("Deleted.");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your 'Mechs" }));
  });

  it("cancels a delete on Escape and returns focus to its button; focus goes to the empty line after the last delete", async () => {
    const user = userEvent.setup();
    await (await openFamilyStorage()).save(saved("a", "TW-1"));
    renderHome();
    const open = await screen.findByRole("button", { name: "Delete Test Walker TW-1" });
    await user.click(open);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("group", { name: "Confirm delete" })).toBeNull();
    expect(document.activeElement).toBe(open);
    await user.click(open);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const empty = await screen.findByText("No 'Mechs saved yet.");
    await waitFor(() => {
      expect(document.activeElement).toBe(empty);
    });
  });

  it("lists an unreadable entry as such, with only Delete", async () => {
    await (await openStore("battletech")).set("mech:broken", { record: { schema: 99 } });
    renderHome();
    const row = (await screen.findByText(/cannot be read/i)).closest("li");
    if (!row) throw new Error("no row");
    expect(within(row).getAllByRole("button").map((b) => b.textContent)).toEqual(["Delete"]);
    expect(within(row).queryByRole("link")).toBeNull();
  });

  it("imports a 'Mech file, giving a repeated id a new one, and refuses what is not a usable file", async () => {
    const user = userEvent.setup();
    const storage = await openFamilyStorage();
    await storage.save(saved("a", "TW-1"));
    renderHome();
    const input = await screen.findByLabelText("Import a file");
    const file = (text: string) => new File([text], "x.json", { type: "application/json" });
    const refused: [File, string][] = [
      [file("not json at all"), "That file is not a 'Mech file."],
      [file("x".repeat(1024 * 1024 + 1)), "That file is too large to be a 'Mech file."],
      [file(JSON.stringify({ app: "other" })), "This file was not made by Salvage Rights."],
    ];
    for (const [chosen, message] of refused) {
      await user.upload(input, chosen);
      await waitFor(() => {
        expect(screen.getByRole("alert").textContent).toBe(message);
      });
      expect(await storage.list()).toHaveLength(1);
    }

    await user.upload(input, file(JSON.stringify(toMechFile(saved("a", "TW-1")))));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("'Mech imported.");
    });
    expect(screen.getByRole("alert").textContent).toBe("");
    const ids = (await storage.list()).map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("exports the record as a file named from its name", async () => {
    const user = userEvent.setup();
    await (await openFamilyStorage()).save(bipedRecord({ id: "a", name: { chassis: "Test Walker", model: "TW-1/b" } }));
    let blob: Blob | undefined;
    vi.stubGlobal("URL", {
      createObjectURL: (b: Blob) => {
        blob = b;
        return "blob:test";
      },
      revokeObjectURL: vi.fn(),
    });
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    renderHome();
    await user.click(await screen.findByRole("button", { name: /^Export/ }));
    expect(names).toEqual(["Test-Walker-TW-1-b.mech.json"]);
    expect(JSON.parse((await blob?.text()) ?? "null")).toEqual(toMechFile(bipedRecord({ id: "a", name: { chassis: "Test Walker", model: "TW-1/b" } })));
    expect(screen.getByRole("status").textContent).toBe("Export started.");
  });

  it("warns when the browser will not keep data, and shows a failed save in the alert region", async () => {
    const user = userEvent.setup();
    control.persistent = false;
    await (await openFamilyStorage()).save(saved("a", "TW-1"));
    renderHome();
    expect(await screen.findByText("This browser is not letting us save. Your 'Mechs last until you close this tab.")).toBeTruthy();
    control.failSave = true;
    await user.click(await screen.findByRole("button", { name: /^Duplicate/ }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("We could not save that on this device.");
    });
  });
});
