import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGothicTheme } from "./theme";

function Page({ on }: { on?: boolean }) {
  useGothicTheme(on);
  return null;
}

describe("useGothicTheme", () => {
  it("puts bt-gothic on the body while a Gothic page is mounted and takes it off on leaving", () => {
    const { unmount } = render(<Page />);
    expect(document.body.classList.contains("bt-gothic")).toBe(true);
    unmount();
    expect(document.body.classList.contains("bt-gothic")).toBe(false);
  });

  it("adds nothing when it is off, and keeps the class until the last of two pages leaves", () => {
    render(<Page on={false} />).unmount();
    expect(document.body.classList.contains("bt-gothic")).toBe(false);
    const outer = render(<Page />);
    const inner = render(<Page />);
    inner.unmount();
    expect(document.body.classList.contains("bt-gothic")).toBe(true);
    outer.unmount();
    expect(document.body.classList.contains("bt-gothic")).toBe(false);
  });
});
