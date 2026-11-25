import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../../rules/catalog";
import { mordelBiped, mordelQuad, mordelWith } from "../../rules/fixtures";
import { fromMordel } from "../../rules/mordel";
import type { MechRecord } from "../../rules/mech";
import RecordSheet from "./RecordSheet";
import { inventoryStep } from "./MechData";

afterEach(cleanup);

async function recordOf(response: unknown): Promise<MechRecord> {
  const result = fromMordel(response, await loadCatalog(), "core-2026", "2026-01-01T00:00:00Z", () => "sheet-1");
  if (!result.ok) throw new Error(result.message);
  return result.record;
}

/** The sheet drawn, and every line of type on it. */
async function drawn(record: MechRecord) {
  const { container } = render(<RecordSheet record={record} catalog={await loadCatalog()} />);
  const svg = container.querySelector<SVGSVGElement>("svg.bt-sheet");
  if (!svg) throw new Error("no sheet");
  const lines = [...svg.querySelectorAll("text")].map((t) => t.textContent.replace(/\s+/g, " ").trim());
  return { container, svg, lines };
}

describe("The record sheet", () => {
  it("prints the movement, an inventory line, the ammunition, an empty slot, the heat sinks and the credit", async () => {
    const { svg, lines } = await drawn(await recordOf(mordelBiped()));
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Test Walker TW-1 record sheet");
    expect(lines).toContain("BattleMech record sheet");
    expect(lines).toContain("Walking: 4");
    expect(lines).toContain("Running: 6");
    expect(lines).toContain("Jumping: 3");
    expect(lines).toContain("Rules edition: Core Rulebook (2026)");
    // Two Medium Lasers in two arms are two lines of one; the AC/10 is in the right torso.
    const ac = [...svg.querySelectorAll("[data-line]")].map((g) => [...g.querySelectorAll("text")].map((t) => t.textContent));
    expect(ac).toContainEqual(["1", "Autocannon/10", "RT", "3", "10", "—", "5", "10", "15"]);
    expect(ac).toContainEqual(["1", "Medium Laser", "LA", "3", "5", "—", "3", "6", "9"]);
    expect(lines).toContain("Ammo: (Autocannon/10) 10");
    expect(lines).toContain("BV: 1,000 (mordel.net)");
    expect(lines.filter((line) => line === "Roll Again").length).toBeGreaterThan(10);
    expect(lines).toContain("Single Heat Sinks: 10 (10)");
    expect(lines).toContain("Not an official record sheet. Made with Salvage Rights, an unofficial fan project. Designed by Nobody In Particular on mordel.net.");
    expect(svg.querySelectorAll("[data-diagram]")).toHaveLength(3);
  });

  it("has no credit, no Battle Value and a blank rule for a 'Mech made here", async () => {
    const record = await recordOf(mordelBiped());
    delete record.source;
    const { lines } = await drawn(record);
    expect(lines).toContain("BV:");
    expect(lines.some((line) => line.includes("mordel.net"))).toBe(false);
  });

  it("draws the three diagrams for a quad", async () => {
    const { svg, lines } = await drawn(await recordOf(mordelQuad()));
    expect(svg.querySelectorAll("[data-diagram]")).toHaveLength(3);
    expect(svg.querySelectorAll("[data-testid='mech-doll'][data-layout='quad']")).toHaveLength(3);
    expect(svg.querySelectorAll("[data-diagram='text']")).toHaveLength(0);
    expect(lines).toContain("FLL");
  });

  it("lists each location's points as text in place of the diagrams for a body type with no doll", async () => {
    const record = await recordOf(mordelQuad());
    record.configuration = "tripod";
    const { svg, lines } = await drawn(record);
    expect(svg.querySelectorAll("[data-testid='mech-doll']")).toHaveLength(0);
    expect(svg.querySelectorAll("[data-diagram='text']")).toHaveLength(2);
    expect(lines).toContain("Center Torso: 20 front, 8 rear");
    expect(lines).toContain("Front Left Leg: 20");
  });

  it("draws the player's picture before Mordel's, Mordel's before nothing, and ignores any other host", async () => {
    const own = { dataUrl: "data:image/png;base64,iVBORw0KGgo=" };
    const unit = mordelBiped();
    const withPicture = async (image: string | undefined, picture?: MechRecord["picture"]) => {
      const record = await recordOf(mordelWith(unit, { image_url: image ?? null }));
      if (picture) record.picture = picture;
      const { svg } = await drawn(record);
      cleanup();
      const frame = svg.querySelector("[data-picture]");
      return [frame?.getAttribute("data-picture"), svg.querySelector("[data-picture] image")?.getAttribute("href")];
    };
    expect(await withPicture("https://mordel.net/a.png", own)).toEqual(["image", own.dataUrl]);
    expect(await withPicture("https://mordel.net/a.png")).toEqual(["image", "https://mordel.net/a.png"]);
    expect(await withPicture("https://example.com/a.png")).toEqual(["empty", undefined]);
    expect(await withPicture(undefined)).toEqual(["empty", undefined]);
  });

  it("steps the inventory type down to hold 14 lines at its default size and up to 19 at its smallest", () => {
    const room = 391;
    expect(inventoryStep(14, room).size).toBe(23);
    expect(inventoryStep(15, room).size).toBeLessThan(23);
    expect(inventoryStep(19, room).size).toBe(20);
    expect(inventoryStep(19, room).capacity).toBeGreaterThanOrEqual(19);
    expect(inventoryStep(30, room).capacity).toBeLessThan(30);
  });
});
