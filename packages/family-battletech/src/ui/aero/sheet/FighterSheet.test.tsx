import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SHEET_PROFILES, sheetProfileFor } from "../../../data/aero-sheet";
import type { SheetProfile } from "../../../data/aero-sheet";
import { DEFAULT_AERO_EDITION } from "../../../data/aero";
import { newAeroRecord } from "../../../rules/aero";
import type { AeroRecord } from "../../../rules/aero";
import { loadCatalog } from "../../../rules/catalog";
import { MAX_SINKS_DRAWN } from "../../sheet/HeatData";
import { MAX_BUBBLES_DRAWN, MAX_SI_DRAWN } from "./Diagram";
import FighterSheet from "./FighterSheet";
import { weaponLines } from "./facts";

afterEach(cleanup);
const catalog = await loadCatalog();

const POINTS = [14, 22, 22, 18, 20, 12];

/** A small built fighter on the sheet's own edition and kind. */
function fighterFor(profile: SheetProfile, extra: Partial<AeroRecord> = {}): AeroRecord {
  const record = newAeroRecord({ id: "f", chassis: "Sabre", model: "SB-27", unitType: profile.kind === "aerospace" ? "aerospace-fighter" : "conventional-fighter", tons: 50, safeThrust: 6, year: 3050 }, profile.editionId);
  record.armor.points = Object.fromEntries(profile.armor.map((loc, i) => [loc, POINTS[i] ?? 10]));
  record.heatSinks.count = 4;
  record.fuelTons = 5;
  record.mounts = [
    { id: "m1", equipmentId: "medium-laser-is", name: "Medium Laser", arc: "NO" },
    { id: "m2", equipmentId: "medium-laser-is", name: "Medium Laser", arc: "NO" },
    { id: "m3", equipmentId: "ac-5-is", name: "Autocannon/5", arc: "LW" },
  ];
  return { ...record, ...extra };
}

function drawn(record: AeroRecord, profile?: SheetProfile) {
  const { container } = render(<FighterSheet record={record} catalog={catalog} {...(profile ? { profile } : {})} />);
  const svg = container.querySelector<SVGSVGElement>("svg.bt-sheet");
  if (!svg) throw new Error("no sheet");
  const lines = [...svg.querySelectorAll("text")].map((t) => t.textContent.replace(/\s+/g, " ").trim());
  return { container, svg, lines };
}

describe("The fighter record sheets", () => {
  it("prints the unit's name, figures, armor, threshold, weapons and the mark on the sheet of each edition", () => {
    for (const profile of SHEET_PROFILES) {
      const { svg, lines } = drawn(fighterFor(profile), profile);
      expect(svg.getAttribute("aria-label"), profile.id).toBe(`Sabre SB-27 ${profile.title.toLowerCase()}`);
      expect(lines, profile.id).toEqual(expect.arrayContaining(["Sabre SB-27", "50", "6", "NOT OFFICIAL", "Autocannon/5", "Not an official record sheet. Made with Salvage Rights, an unofficial fan project."]));
      // Two Medium Lasers in the nose are one line (with a quantity, or "2 x" where the sheet has no quantity column).
      expect(lines.some((line) => line.endsWith("Medium Laser")), profile.id).toBe(true);
      // The first armor area (the nose; AeroTech (1986) starts at the cockpit): its points, and on the later sheets its threshold (a tenth, rounded up) with the points in brackets.
      const nose = svg.querySelector(`[data-area="${profile.armor[0] ?? ""}"]`);
      expect([...(nose?.querySelectorAll("text") ?? [])].map((t) => t.textContent), profile.id).toContain(profile.thresholds ? "2 (14)" : "14");
      expect(svg.querySelectorAll("[data-line]").length, profile.id).toBeGreaterThanOrEqual(2);
      // A browser refuses (and reports as an error) a text length that is not positive.
      expect([...svg.querySelectorAll("[textLength]")].every((t) => Number(t.getAttribute("textLength")) > 0), profile.id).toBe(true);
      cleanup();
    }
  });

  it("splits an attack value that changes with range across the brackets, one figure each", () => {
    const profile = SHEET_PROFILES.find((p) => p.editionId === DEFAULT_AERO_EDITION && p.kind === "aerospace");
    if (!profile) throw new Error("no current profile");
    const record = fighterFor(profile, { mounts: [{ id: "p", equipmentId: "snub-nose-ppc-is", name: "Snub-Nose PPC", arc: "NO" }, { id: "h", equipmentId: "hyper-assault-gauss-20-clan", name: "HAG/20", arc: "NO" }] });
    expect(weaponLines(record, catalog).map((l) => l.av)).toEqual([["10", "8", "", ""], ["16", "12", "12", ""]]);
  });

  it("draws one bubble for each armor point of each area", () => {
    const profile = sheetProfileFor("aerotech-1986", "aerospace-fighter");
    if (!profile) throw new Error("no AeroTech sheet");
    const { svg } = drawn(fighterFor(profile), profile);
    const counts = Object.fromEntries(profile.armor.map((loc) => [loc, svg.querySelectorAll(`[data-area-bubbles="${loc}"] circle`).length]));
    expect(counts).toEqual({ CP: 14, NO: 22, LW: 22, RW: 18, FU: 20, EN: 12 });
  });

  it("carries the flagged heat scale only on the flagged sheets and our own words on AeroTech (1986)", () => {
    const sources = SHEET_PROFILES.map((profile) => {
      const { svg, container } = drawn(fighterFor(profile), profile);
      const flagged = [...svg.querySelectorAll('[data-heat-source="flagged"] [data-effect]')].map((t) => t.textContent);
      const own = [...svg.querySelectorAll('[data-heat-source="own"] [data-effect]')].map((t) => t.textContent);
      cleanup();
      void container;
      return [profile.id, flagged.includes("Ammo Explosion, avoid on 8+"), own.includes("Ammo explodes, avoid 8+")] as const;
    });
    // A conventional fighter of the current rules has no heat at all, so its sheet has neither table.
    expect(sources).toEqual([
      ["at1-fighter", false, true],
      ["at2-fighter", true, false],
      ["at2r-aerospace", true, false],
      ["at2r-conventional", true, false],
      ["current-aerospace", true, false],
      ["current-conventional", false, false],
    ]);
  });

  it("shows no publisher's logo, picture or name on any sheet: our labels and the trademark line only", () => {
    for (const profile of SHEET_PROFILES) {
      const { svg, lines } = drawn(fighterFor(profile), profile);
      expect(svg.querySelectorAll("image, use").length, profile.id).toBe(0);
      const outside = lines.filter((line) => /FASA|FanPro|WizKids|WK ?Games|Catalyst|Topps|Copyright|©|permission to photocopy/i.test(line));
      // Only the trademark and non-affiliation line, which is ours and names the owners as the trademark notice requires.
      expect(outside, profile.id).toHaveLength(1);
      expect(outside[0]).toMatch(/^BattleTech, 'Mech, BattleMech, and MechWarrior are registered trademarks/);
      cleanup();
    }
  });

  it("stays quick and bounded with absurd counts of points, sinks, Structural Integrity and weapons", () => {
    const profile = sheetProfileFor("tw-tm-so", "aerospace-fighter");
    if (!profile) throw new Error("no current sheet");
    const huge = fighterFor(profile, { thrust: { safe: 5_000_000 } });
    huge.armor.points = { NO: 1e9, LW: 1e9, RW: 1e9, AF: 1e9 };
    huge.heatSinks.count = 1e9;
    huge.mounts = Array.from({ length: 5000 }, (_, i) => ({ id: `m${String(i)}`, equipmentId: "medium-laser-is", name: `Laser ${String(i)}`, arc: "NO" }));
    const started = performance.now();
    const { svg } = drawn(huge, profile);
    expect(performance.now() - started).toBeLessThan(15_000);
    for (const loc of profile.armor) expect(svg.querySelectorAll(`[data-area-bubbles="${loc}"] circle`).length).toBeLessThanOrEqual(MAX_BUBBLES_DRAWN);
    expect(svg.querySelectorAll("[data-sinks] circle").length).toBe(MAX_SINKS_DRAWN);
    expect(svg.querySelectorAll("[data-si] circle").length).toBeLessThanOrEqual(MAX_SI_DRAWN);
    expect(svg.querySelectorAll("[data-inventory] [data-line]").length).toBeLessThanOrEqual(14);
    // The printed figure keeps the true count.
    expect([...svg.querySelectorAll('[data-area="NO"] text')].map((t) => t.textContent)).toContain("100000000 (1000000000)");
  }, 30_000);
});
