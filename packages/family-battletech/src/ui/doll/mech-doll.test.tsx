// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { bipedRecord, quadRecord } from "../../rules/fixtures";
import { editRecord, maxArmor, structurePoints, type MechRecord } from "../../rules/mech";
import type { IDollFrame } from "./geometry";
import { DOLL_LAYOUTS, dollUnitFromRecord, STRUCTURE_SCALE, type DollUse } from "./layouts";
import MechDoll, { placedPlates } from "./mech-doll";
import type { PenPreset } from "./pen";
import { edgeDistance, insideShape } from "./shape-bubbles";

const FRAMES: Record<DollUse, IDollFrame> = {
  armor: { centerX: 1612.5, top: 10, scale: 1 },
  structure: { centerX: 1577.5, top: 1270, scale: STRUCTURE_SCALE },
  transfer: { centerX: 612.5, top: 2200, scale: 0.2 },
};

const CODES: Record<string, string> = { hd: "HD", ct: "CT", lt: "LT", rt: "RT", la: "LA", ra: "RA", ll: "LL", rl: "RL" };

const unitOf = (record: MechRecord) => {
  const unit = dollUnitFromRecord(record);
  if (!unit) throw new Error("no doll for this record");
  return unit;
};

const draw = (record: MechRecord, use: DollUse, extra: { pen?: PenPreset; selected?: string; onSelect?: (loc: string) => void } = {}) =>
  MechDoll({ unit: unitOf(record), use, frame: FRAMES[use], suffix: "t", ...extra });

const markupOf = (record: MechRecord, use: DollUse, extra: { pen?: PenPreset } = {}) =>
  renderToStaticMarkup(<svg>{draw(record, use, extra)}</svg>);

type Ring = { x: number; y: number; outer: number };

/** The rings drawn in each location's group, read back from the markup. */
const ringsByLocation = (markup: string): Record<string, Ring[]> => {
  const host = document.createElement("div");
  host.innerHTML = markup;
  const found: Record<string, Ring[]> = {};
  for (const group of host.querySelectorAll("g[data-loc]")) {
    found[group.getAttribute("data-loc") ?? ""] = [...group.querySelectorAll(":scope > circle")].map((circle) => ({
      x: Number(circle.getAttribute("cx")),
      y: Number(circle.getAttribute("cy")),
      // The ring is drawn inside its radius: the circle's own radius plus half its stroke is its outer edge.
      outer: Number(circle.getAttribute("r")) + Number(circle.getAttribute("stroke-width")) / 2,
    }));
  }
  return found;
};

const countsOf = (markup: string) => Object.fromEntries(Object.entries(ringsByLocation(markup)).map(([loc, rings]) => [loc, rings.length]));

describe("the paper doll", () => {
  it.each([50, 100])("keeps every armor bubble inside its plate and clear of the others at %i tons", (tons) => {
    const base = bipedRecord({ tons });
    const record = editRecord(base, (draft) => {
      // Full armor everywhere, a third of each torso behind.
      for (const [loc, max] of Object.entries(maxArmor(draft))) {
        const torso = loc === "CT" || loc === "LT" || loc === "RT";
        const rear = torso ? Math.floor(max / 6) : 0;
        draft.armor[loc as keyof typeof draft.armor] = torso ? { front: max - rear, rear } : { front: max };
      }
    });
    const rings = ringsByLocation(markupOf(record, "armor"));
    const layout = DOLL_LAYOUTS.biped;
    const locations = [...(layout?.front ?? []), ...(layout?.rear ?? [])];
    const problems: string[] = [];
    const all: (Ring & { loc: string })[] = [];
    for (const location of locations) {
      const plates = placedPlates(location, FRAMES.armor);
      for (const ring of rings[location.loc] ?? []) {
        all.push({ ...ring, loc: location.loc });
        if (!plates.some((plate) => insideShape(plate, [ring.x, ring.y]) && edgeDistance(plate, [ring.x, ring.y]) >= ring.outer - 0.5)) {
          problems.push(`${location.loc} bubble outside its plate`);
        }
      }
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (a && b && Math.hypot(a.x - b.x, a.y - b.y) < a.outer + b.outer - 0.5) problems.push(`${a.loc} overlaps ${b.loc}`);
      }
    }
    expect(all.length).toBeGreaterThan(100);
    expect(problems.slice(0, 5)).toEqual([]);
  });

  it("draws the record's armor per location, capped at the location's maximum", () => {
    const record = editRecord(bipedRecord(), (draft) => {
      draft.armor.HD = { front: 12 };
      draft.armor.CT = { front: 20, rear: 4 };
      draft.armor.LT = { front: 30, rear: 30 };
      draft.armor.LA = { front: -3 };
      draft.armor.RT = { front: 20, rear: 30 };
      delete draft.armor.RL;
    });
    const max = maxArmor(record);
    const counts = countsOf(markupOf(record, "armor"));
    expect(counts).toMatchObject({ hd: 9, ct: 20, ctr: 4, lt: max.LT, ltr: 0, rt: 20, rtr: 4, la: 0, ra: 8, ll: 6, rl: 0 });
    expect(max.LT).toBe(24);
  });

  it("draws the structure points on the structure doll", () => {
    const record = bipedRecord();
    const counts = countsOf(markupOf(record, "structure"));
    const points = structurePoints(record);
    expect(counts).toEqual(Object.fromEntries(Object.entries(CODES).map(([loc, code]) => [loc, points[code as keyof typeof points]])));
  });

  it("renders each pen, defaulting to salvage for armor and blueprint for the transfer diagram", () => {
    const record = bipedRecord();
    const markups = (["ink", "salvage", "blueprint"] as const).map((pen) => markupOf(record, "armor", { pen }));
    expect(new Set(markups).size).toBe(3);
    expect(markupOf(record, "armor")).toBe(markups[1]);
    expect(markupOf(record, "transfer")).toBe(markupOf(record, "transfer", { pen: "blueprint" }));
  });

  it("names a location by its place and points, and selects it on Enter or Space", () => {
    const picked: string[] = [];
    const tree = renderToStaticMarkup(<svg>{draw(bipedRecord(), "armor", { selected: "la", onSelect: (loc) => picked.push(loc) })}</svg>);
    const host = document.createElement("div");
    host.innerHTML = tree;
    expect(host.querySelector("g[data-loc=la]")?.getAttribute("aria-label")).toBe("Left Arm, 8 armor");
    expect(host.querySelector("g[data-loc=la]")?.getAttribute("aria-pressed")).toBe("true");
    expect(host.querySelector("g[data-loc=ra]")?.getAttribute("aria-pressed")).toBe("false");
    expect(host.querySelector("g[data-loc=ctr]")?.getAttribute("aria-label")).toBe("Center Torso (Rear), 4 armor");
    expect(host.querySelector("[role=img]")).toBeNull();

    // The element handlers, called the way React calls them.
    const root = draw(bipedRecord(), "armor", { onSelect: (loc) => picked.push(loc) }) as React.ReactElement<{ children: React.ReactNode }>;
    const groups = React.Children.toArray(root.props.children).filter(
      (child): child is React.ReactElement<{ "data-loc"?: string; onKeyDown?: (event: unknown) => void }> =>
        React.isValidElement(child) && (child.props as Record<string, unknown>)["data-loc"] === "rl",
    );
    const preventDefault = vi.fn();
    groups[0]?.props.onKeyDown?.({ key: "Enter", preventDefault });
    groups[0]?.props.onKeyDown?.({ key: " ", preventDefault });
    groups[0]?.props.onKeyDown?.({ key: "a", preventDefault });
    expect(picked).toEqual(["rl", "rl"]);
  });

  it("is one image without a handler, and draws nothing for a quad", () => {
    const host = document.createElement("div");
    host.innerHTML = markupOf(bipedRecord(), "armor");
    expect(host.querySelector("[role=img]")?.getAttribute("aria-label")).toBe("Armor diagram");
    expect(host.querySelector("[role=button]")).toBeNull();
    expect(dollUnitFromRecord(quadRecord())).toBeUndefined();
  });
});
