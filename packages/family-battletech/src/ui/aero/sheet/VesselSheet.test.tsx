import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VESSEL_SHEET_PROFILES, sheetProfileFor } from "../../../data/aero-sheet";
import type { SheetProfile } from "../../../data/aero-sheet";
import { locationsOf, newAeroRecord, stationKeeping } from "../../../rules/aero";
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
      // A station-keeping drive has no Safe Thrust to print.
      expect(lines, profile.id).toEqual(expect.arrayContaining(["Leopard CV", String(record.tons), stationKeeping(record) ? "Station-keeping only" : "4", "NOT OFFICIAL", "Not an official record sheet. Made with Salvage Rights, an unofficial fan project."]));
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

  it("draws every facing of every type, shape and edition inside the page, strays included", () => {
    for (const profile of VESSEL_SHEET_PROFILES) {
      for (const shape of ["aerodyne", "spheroid"] as const) {
        const record = vesselFor(profile, { shape });
        record.armor.points = { ...Object.fromEntries(locationsOf(record).armor.map((loc) => [loc, 30])), X1: 5, X2: 6, X3: 7 };
        const { svg } = drawn(record, profile);
        const areas = [...svg.querySelectorAll("[data-area]")];
        expect(areas.length, `${profile.id} ${shape}`).toBe(locationsOf(record).armor.length);
        for (const area of areas) {
          const box = area.querySelector("rect");
          const [x, y, w, h] = ["x", "y", "width", "height"].map((a) => Number(box?.getAttribute(a)));
          expect(x, `${profile.id} ${shape} ${area.getAttribute("data-area") ?? ""}`).toBeGreaterThanOrEqual(0);
          expect((x ?? 0) + (w ?? 0)).toBeLessThanOrEqual(1700);
          expect((y ?? 0) + (h ?? 0)).toBeLessThanOrEqual(2200);
        }
        cleanup();
      }
    }
  });

  it("prints a standard-scale capital missile at a tenth with C, as the bay rules count it", () => {
    const ship = sheetProfileFor("tw-tm-so", "warship");
    if (!ship) throw new Error("no sheet");
    const whale = (n: number): AeroRecord => ({ ...vesselFor(ship), mounts: Array.from({ length: n }, (_, i) => ({ id: `w${String(i)}`, equipmentId: "killer-whale-is", name: "Killer Whale", arc: "AF" })) });
    expect([1, 2].map((n) => bayLines(whale(n), catalog)[0]?.av.find((v) => v !== ""))).toEqual(["4C", "8C"]);
  });

  it("gives a large craft the crew's own track and no heat circles, and a small craft its pilot's and the Heat Scale, on every form", () => {
    for (const profile of VESSEL_SHEET_PROFILES) {
      const { svg, lines } = drawn(vesselFor(profile), profile);
      const small = profile.kind === "small-craft";
      expect(lines.includes("Consciousness #"), profile.id).toBe(profile.crew?.track === "pilot");
      expect(lines.includes(profile.crew?.incap ?? ""), profile.id).toBe(true);
      // Every form's brackets follow the rules table (TW p. 235), capital ones on large craft; AeroTech 2 Revised spells the last box "Incp.".
      expect(lines, profile.id).toContain("Hexes at SRV, MRV, LRV, ERV: standard 0-6, 7-12, 13-20, 21-25");
      if (!small) expect(lines, profile.id).toContain("Capital scale (C): 0-12, 13-24, 25-40, 41-50");
      if (profile.editionId === "aerotech2-revised" && !small) expect(profile.crew?.incap).toBe("Incp.");
      expect(svg.querySelectorAll("[data-sinks] circle").length > 0, profile.id).toBe(profile.heatScale === true);
      expect(profile.heatScale === true, profile.id).toBe(small && profile.editionId !== "aerotech2");
      cleanup();
    }
    // AeroTech 2 prints a small craft on its DropShip form, which the heat scale and the unit's own name still reach.
    const standIn = sheetProfileFor("aerotech2", "small-craft");
    if (!standIn) throw new Error("no sheet");
    const { svg, lines } = drawn(vesselFor(standIn, { unitType: "small-craft" }), standIn);
    expect(svg.querySelectorAll('[data-heat-source="flagged"] [data-heat]').length).toBeGreaterThan(0);
    expect(lines).toContain("Spheroid Small craft record sheet");
    expect(lines).toContain("SMALL CRAFT DATA");
  });

  it("draws the critical boxes each form does: open fields, six blank boxes, a row of ten, and no Engine row on the current station", () => {
    const rows = (edition: string, type: string) => {
      const profile = sheetProfileFor(edition, type);
      if (!profile) throw new Error("no sheet");
      const { svg } = drawn(vesselFor(profile), profile);
      const row = (label: string) => svg.querySelector(`[data-critical="${label}"]`);
      return { svg, row };
    };
    const at2 = rows("aerotech2", "warship");
    expect([at2.row("Cargo")?.querySelectorAll("[data-open]").length, at2.row("Docking Collars")?.querySelectorAll("rect").length, at2.row("Grav Decks")?.querySelectorAll("rect").length]).toEqual([1, 6, 6]);
    expect(rows("aerotech2", "dropship").row("Doors")?.querySelectorAll("[data-open]").length).toBe(1);
    expect([rows("aerotech2-revised", "jumpship").row("Docking Collars")?.querySelectorAll("rect").length, rows("aerotech2-revised", "dropship").row("Doors")?.querySelectorAll("rect").length]).toEqual([10, 3]);
    const station = rows("tw-tm-so", "space-station");
    expect(station.row("Engine")).toBeNull();
    expect(station.svg.querySelector('[data-critical="Avionics"]')).not.toBeNull();
    expect(station.svg.querySelectorAll("[data-turn]").length).toBe(0);
  });

  it("lays six heat arcs and the scale of a spheroid small craft out above the sinks, inside the block", () => {
    const profile = sheetProfileFor("tw-tm-so", "small-craft");
    if (!profile) throw new Error("no sheet");
    const record = vesselFor(profile, { shape: "spheroid", unitType: "dropship" });
    record.mounts = ["NO", "FL", "FR", "AL", "AR", "AF"].map((arc, i) => ({ id: `m${String(i)}`, equipmentId: "medium-laser-is", name: "Medium Laser", arc }));
    const { svg } = drawn(record, { ...profile, kind: "dropship" });
    const arcs = [...svg.querySelectorAll("[data-heat-arcs] text")];
    expect(arcs).toHaveLength(6);
    const scaleBottom = Math.max(...[...svg.querySelectorAll("[data-heat]")].map((t) => Number(t.getAttribute("y"))));
    const circlesTop = Math.min(...[...svg.querySelectorAll("[data-sinks] circle")].map((c) => Number(c.getAttribute("cy")) - Number(c.getAttribute("r"))));
    expect(scaleBottom).toBeLessThan(circlesTop);
    const arcRight = Math.max(...arcs.map((t) => Number(t.getAttribute("x")) + Number(t.getAttribute("textLength") ?? 0)));
    expect(arcRight).toBeLessThanOrEqual(1325 + 345);
    // The sheet's type never goes under 20 units.
    expect(Math.min(...[...svg.querySelectorAll("[data-heat], [data-heat-arcs] text")].map((t) => Number(t.getAttribute("font-size"))))).toBeGreaterThanOrEqual(20);
  });

  it("stays quick and bounded with absurd counts of points, sinks and weapons", () => {
    const profile = sheetProfileFor("tw-tm-so", "small-craft");
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
