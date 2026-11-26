import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VESSEL_SHEET_PROFILES, sheetProfileFor } from "../../../data/aero-sheet";
import type { SheetProfile } from "../../../data/aero-sheet";
import { newAeroRecord } from "../../../rules/aero";
import type { AeroRecord } from "../../../rules/aero";
import { loadCatalog } from "../../../rules/catalog";
import { MAX_SINKS_DRAWN } from "../../sheet/HeatData";
import { MAX_BUBBLES_DRAWN } from "./Diagram";
import FighterSheet from "./FighterSheet";
import { MAX_BAY_LINES, bayLines } from "./vessel-facts";

afterEach(cleanup);
const catalog = await loadCatalog();

const TONS: Record<string, number> = { "small-craft": 200, dropship: 3000, jumpship: 100000, warship: 500000, "space-station": 100000 };

function vesselFor(profile: SheetProfile, extra: Partial<AeroRecord> = {}): AeroRecord {
  const unitType = profile.kind as AeroRecord["unitType"];
  const record = newAeroRecord({ id: "v", chassis: "Leopard", model: "CV", unitType: unitType as "dropship", tons: TONS[profile.kind] ?? 3000, safeThrust: 4, year: 3070, shape: "spheroid" }, profile.editionId);
  record.armor.points = Object.fromEntries(Object.keys(record.armor.points).map((loc, i) => [loc, 20 + i]));
  record.mounts = [
    { id: "m1", equipmentId: "medium-laser-is", name: "Medium Laser", arc: "NO" },
    { id: "m2", equipmentId: "large-laser-is", name: "Large Laser", arc: "NO" },
    { id: "m3", equipmentId: "ac-10-is", name: "Autocannon/10", arc: "AF" },
  ];
  return { ...record, ...extra };
}

function drawn(record: AeroRecord, profile: SheetProfile) {
  const { container } = render(<FighterSheet record={record} catalog={catalog} profile={profile} />);
  const svg = container.querySelector<SVGSVGElement>("svg.bt-sheet");
  if (!svg) throw new Error("no sheet");
  return { svg, lines: [...svg.querySelectorAll("text")].map((t) => t.textContent.replace(/\s+/g, " ").trim()) };
}

describe("The small craft, DropShip and capital ship record sheets", () => {
  it("prints the unit's name, tons, thrust, bays, each facing's threshold and the mark on every edition's sheet", () => {
    for (const profile of VESSEL_SHEET_PROFILES) {
      const record = vesselFor(profile);
      const { svg, lines } = drawn(record, profile);
      expect(lines, profile.id).toEqual(expect.arrayContaining(["Leopard CV", String(record.tons), "4", "NOT OFFICIAL", "Not an official record sheet. Made with Salvage Rights, an unofficial fan project."]));
      // The nose: its threshold (a tenth of the points, rounded up) with the points in brackets.
      expect([...svg.querySelectorAll('[data-area="NO"] text')].map((t) => t.textContent), profile.id).toContain("2 (20)");
      // Weapons in one arc are split by class: the lasers in the nose are one bay line, the autocannon in the aft another.
      expect(svg.querySelectorAll("[data-inventory] [data-line]").length, profile.id).toBe(2);
      expect(svg.querySelectorAll("image, use").length, profile.id).toBe(0);
      expect([...svg.querySelectorAll("[textLength]")].every((t) => Number(t.getAttribute("textLength")) > 0), profile.id).toBe(true);
      cleanup();
    }
  });

  it("finds the sheet each type prints on, AeroTech 2 using its one DropShip sheet for a small craft and its one large craft sheet for the rest", () => {
    const at = (edition: string, unitType: string) => sheetProfileFor(edition, unitType)?.id;
    expect([at("aerotech2", "small-craft"), at("aerotech2", "jumpship"), at("aerotech2-revised", "space-station"), at("tw-tm-so", "small-craft"), at("aerotech-1986", "dropship")]).toEqual(["aerotech2-dropship", "aerotech2-warship", "aerotech2-revised-space-station", "tw-tm-so-small-craft", undefined]);
  });

  it("carries the heat scale on a small craft only, and gives each bay its attack at each bracket, capital bays in capital scale", () => {
    const small = VESSEL_SHEET_PROFILES.find((p) => p.editionId === "tw-tm-so" && p.kind === "small-craft");
    const ship = VESSEL_SHEET_PROFILES.find((p) => p.editionId === "tw-tm-so" && p.kind === "dropship");
    if (!small || !ship) throw new Error("no current sheets");
    expect(drawn(vesselFor(small), small).svg.querySelectorAll('[data-heat-source="flagged"] [data-heat]').length).toBeGreaterThan(0);
    expect(drawn(vesselFor(ship), ship).svg.querySelectorAll('[data-heat-source="flagged"] [data-heat]').length).toBe(0);
    const bays = bayLines({ ...vesselFor(ship), mounts: [{ id: "n", equipmentId: "nac-10-is", name: "NAC/10", arc: "NO" }, { id: "n2", equipmentId: "nac-10-is", name: "NAC/10", arc: "NO" }] }, catalog);
    expect(bays).toHaveLength(1);
    expect(bays[0]?.av[0]).toBe("20C");
  });

  it("stays quick and bounded with absurd counts of points, sinks and weapons", () => {
    const profile = sheetProfileFor("tw-tm-so", "dropship");
    if (!profile) throw new Error("no current sheet");
    const huge = vesselFor(profile, { si: 5_000_000 });
    huge.armor.points = { NO: 1e9, FL: 1e9, FR: 1e9, AL: 1e9, AR: 1e9, AF: 1e9 };
    huge.heatSinks.count = 1e9;
    huge.mounts = Array.from({ length: 4000 }, (_, i) => ({ id: `m${String(i)}`, equipmentId: "medium-laser-is", name: `Laser ${String(i)}`, arc: "NO", bay: `bay ${String(i)}` }));
    const started = performance.now();
    const { svg } = drawn(huge, profile);
    expect(performance.now() - started).toBeLessThan(15_000);
    for (const loc of ["NO", "FL", "AF"]) expect(svg.querySelectorAll(`[data-area="${loc}"] circle`).length).toBeLessThanOrEqual(MAX_BUBBLES_DRAWN);
    expect(svg.querySelectorAll("[data-sinks] circle").length).toBe(MAX_SINKS_DRAWN);
    expect(svg.querySelectorAll("[data-inventory] [data-line]").length).toBeLessThanOrEqual(MAX_BAY_LINES);
    expect([...svg.querySelectorAll('[data-area="NO"] text')].map((t) => t.textContent)).toContain("100000000 (1000000000)");
  }, 30_000);
});
