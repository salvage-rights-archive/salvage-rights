import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ABOM_CLASSES, ABOM_TYPES } from "../../data/gothic";
import type { AbomClassId } from "../../data/gothic";
import Silhouette from "./Silhouette";

afterEach(cleanup);

function drawn(typeId: string | undefined, classId: AbomClassId): string {
  const { container } = render(<Silhouette typeId={typeId} classId={classId} size={40} />);
  const d = container.querySelector("path")?.getAttribute("d") ?? "";
  cleanup();
  return d;
}

describe("Abomination silhouettes", () => {
  it("draws every box type and every class fallback as its own creature", () => {
    const all = [...ABOM_TYPES.map((t) => drawn(t.id, t.classId)), ...ABOM_CLASSES.map((c) => drawn(undefined, c.id))];
    expect(all.every((d) => d.length > 100)).toBe(true);
    expect(new Set(all).size).toBe(ABOM_TYPES.length + ABOM_CLASSES.length);
  });

  it("falls back to the class drawing for a custom or unknown type", () => {
    for (const c of ABOM_CLASSES) {
      expect(drawn("no-such-type", c.id)).toBe(drawn(undefined, c.id));
      expect(drawn("constructor", c.id)).toBe(drawn(undefined, c.id));
    }
  });

  it("is decoration: hidden from assistive technology, sized as asked, in the text colour, with no text", () => {
    const { container } = render(<Silhouette typeId="gnat" classId="swarmer" size={48} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("width")).toBe("48");
    expect(svg?.getAttribute("fill")).toBe("currentColor");
    expect(svg?.textContent).toBe("");
    expect(container.querySelector("text, title, desc")).toBeNull();
  });
});
