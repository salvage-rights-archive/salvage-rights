import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

function Broken(): never {
  throw new Error("fixture failure");
}

afterEach(cleanup);

describe("AppErrorBoundary", () => {
  it("replaces a crashed app with a heading and a reload button", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload the page" })).toBeTruthy();
    quiet.mockRestore();
  });
});
