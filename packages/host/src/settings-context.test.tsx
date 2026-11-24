import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@salvage-rights/shared";
import { SettingsProvider, useSettings } from "./settings-context";

vi.mock("@salvage-rights/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@salvage-rights/shared")>()),
  saveSettings: () => Promise.reject(new Error("disk full")),
}));

afterEach(cleanup);

function Probe() {
  const { settings, update, saveFailed } = useSettings();
  return (
    <>
      <button
        onClick={() => {
          update({ ...DEFAULT_SETTINGS, theme: "dark" });
        }}
      >
        Go dark
      </button>
      <p>{`theme ${settings.theme}, saveFailed ${String(saveFailed)}`}</p>
    </>
  );
}

it("keeps new settings in memory and reports it when saving fails", async () => {
  render(
    <SettingsProvider>
      <Probe />
    </SettingsProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Go dark" }));
  await waitFor(() => {
    expect(screen.getByText("theme dark, saveFailed true")).toBeTruthy();
  });
});
