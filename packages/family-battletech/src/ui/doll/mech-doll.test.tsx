// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { bipedRecord, quadRecord } from "../../rules/fixtures";
import { editRecord, maxArmor, structurePoints, type MechRecord } from "../../rules/mech";
import type { IDollFrame } from "./geometry";
import { ARMOR_PITCH, DOLL_LAYOUTS, dollUnitFromRecord, STRUCTURE_PITCH, STRUCTURE_SCALE, layoutOf, type DollLayoutId, type DollUse, type IDollShields, type IDollUnit, type IDollVariant } from "./layouts";
import MechDoll, { fillPlates, placedPlates } from "./mech-doll";
import type { PenPreset } from "./pen";
import { edgeDistance, insideShape } from "./shape-bubbles";

const FRAMES: Record<DollUse, IDollFrame> = {
  armor: { centerX: 1612.5, top: 10, scale: 1 },
  structure: { centerX: 1577.5, top: 1270, scale: STRUCTURE_SCALE },
  transfer: { centerX: 612.5, top: 2200, scale: 0.2 },
};

const CODES: Record<string, string> = { hd: "HD", ct: "CT", lt: "LT", rt: "RT", la: "LA", ra: "RA", ll: "LL", rl: "RL" };

const unitOf = (record: MechRecord, shields?: IDollShields) => {
  const unit = dollUnitFromRecord(record, shields);
  if (!unit) throw new Error("no doll for this record");
  return unit;
};

const draw = (record: MechRecord, use: DollUse, extra: { pen?: PenPreset; selected?: string; onSelect?: (loc: string) => void; shields?: IDollShields } = {}) => (
  <MechDoll unit={unitOf(record, extra.shields)} use={use} frame={FRAMES[use]} suffix="t" pen={extra.pen} selected={extra.selected} onSelect={extra.onSelect} />
);

afterEach(cleanup);

/** The smallest spacing, in layout units, at which a full location must still be drawn. */
const MIN_PITCH = { armor: 12, structure: 10 };

/** The most each doll location holds at 100 tons: the head 9 armor and 3 structure, the rest twice and once the rows of the
 * internal structure table, any leg (a tripod's or monoped's center leg too) taking the leg row. A rear torso holds a sixth of
 * its torso's armor, which the front then lacks. */
const fullOf = (superheavy: boolean) => {
  // A superheavy of 200 tons: Interstellar Operations: Alternate Eras, Superheavy 'Mech Structure Table, p. 155, and its head
  // holds 12 armor (same page). The table is not in the rules module yet.
  const row = superheavy ? { CT: 60, LT: 42, LA: 33, LL: 42 } : structurePoints(bipedRecord({ tons: 100 }));
  const head = superheavy ? { armor: 12, structure: 4 } : { armor: 9, structure: 3 };
  const structure = (loc: string): number =>
    loc === "hd" ? head.structure : loc === "ct" ? row.CT ?? 0 : loc === "lt" || loc === "rt" || loc === "flt" || loc === "frt" || loc === "at" ? row.LT ?? 0 : loc === "la" || loc === "ra" || loc === "la2" || loc === "ra2" ? row.LA ?? 0 : row.LL ?? 0;
  const rearOf = (loc: string): number => Math.floor((structure(loc) * 2) / 6);
  const isRear = (loc: string): boolean => loc === "ctr" || loc === "ltr" || loc === "rtr";
  return {
    structure: (loc: string): number => (isRear(loc) ? 0 : structure(loc)),
    armor: (loc: string): number => {
      if (isRear(loc)) return rearOf(loc.slice(0, 2) === "ct" ? "ct" : `${loc[0]}t`);
      const max = loc === "hd" ? head.armor : structure(loc) * 2;
      return loc === "ct" || loc === "lt" || loc === "rt" ? max - rearOf(loc) : max;
    },
  };
};

const fullUnit = (layoutId: DollLayoutId, variant: Partial<IDollVariant> = {}): IDollUnit => {
  const full = fullOf(variant.superheavy === true);
  return {
    layoutId,
    variant: { armless: false, superheavy: false, ...variant },
    armor: full.armor,
    structure: full.structure,
    armorDamaged: () => false,
    structureDamaged: () => false,
  };
};

const BODY_TYPES = (Object.keys(DOLL_LAYOUTS) as DollLayoutId[]).filter((id) => !id.startsWith("micro"));

const markupOf = (record: MechRecord, use: DollUse, extra: { pen?: PenPreset; shields?: IDollShields } = {}) =>
  renderToStaticMarkup(<svg>{draw(record, use, extra)}</svg>);

type Ring = { x: number; y: number; outer: number };

/** The rings in each location's part of the bubble layer, read back from the markup. */
const ringsByLocation = (markup: string): Record<string, Ring[]> => {
  const host = document.createElement("div");
  host.innerHTML = markup;
  const found: Record<string, Ring[]> = {};
  for (const group of host.querySelectorAll("g[data-bubbles]")) {
    found[group.getAttribute("data-bubbles") ?? ""] = [...group.querySelectorAll("circle")].map((circle) => ({
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
  it.each([["biped", 50], ["biped", 100], ["quad", 55], ["quad", 100]] as const)("keeps every armor bubble inside its plate and clear of the others on a %s of %i tons", (configuration, tons) => {
    const base = configuration === "quad" ? quadRecord({ tons }) : bipedRecord({ tons });
    const record = editRecord(base, (draft) => {
      // Full armor everywhere, a third of each torso behind.
      for (const [loc, max] of Object.entries(maxArmor(draft))) {
        const torso = loc === "CT" || loc === "LT" || loc === "RT";
        const rear = torso ? Math.floor(max / 6) : 0;
        draft.armor[loc as keyof typeof draft.armor] = torso ? { front: max - rear, rear } : { front: max };
      }
    });
    const rings = ringsByLocation(markupOf(record, "armor"));
    const layout = DOLL_LAYOUTS[configuration];
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
        for (const other of locations) {
          if (other.loc !== location.loc && placedPlates(other, FRAMES.armor).some((plate) => insideShape(plate, [ring.x, ring.y]))) {
            problems.push(`${location.loc} bubble lies in a plate of ${other.loc}`);
          }
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

  it("names a location by its place and points, and selects it by click, Enter or Space", () => {
    const picked: string[] = [];
    const { container } = render(<svg>{draw(bipedRecord(), "armor", { selected: "la", onSelect: (loc) => picked.push(loc) })}</svg>);
    const group = (loc: string) => container.querySelector(`g[data-loc=${loc}]`);
    expect(group("la")?.getAttribute("aria-label")).toBe("Left Arm, 8 armor");
    expect(group("la")?.getAttribute("aria-pressed")).toBe("true");
    expect(group("ra")?.getAttribute("aria-pressed")).toBe("false");
    expect(group("ctr")?.getAttribute("aria-label")).toBe("Center Torso (Rear), 4 armor");
    expect(container.querySelector("[role=img]")).toBeNull();
    // Only the selected location has the heavier outline, drawn in the overlay.
    expect(container.querySelectorAll("[data-selected]")).toHaveLength(1);
    expect(container.querySelector("[data-selected=la]")).not.toBeNull();

    const rl = group("rl");
    if (!rl) throw new Error("no right leg");
    fireEvent.click(rl);
    fireEvent.keyDown(rl, { key: "Enter" });
    fireEvent.keyDown(rl, { key: " " });
    fireEvent.keyDown(rl, { key: "a" });
    expect(picked).toEqual(["rl", "rl", "rl"]);
  });

  it("draws a focus outline for the focused location and removes it on blur", () => {
    const { container } = render(<svg>{draw(bipedRecord(), "armor", { onSelect: () => undefined })}</svg>);
    const ct = container.querySelector("g[data-loc=ct]");
    if (!ct) throw new Error("no center torso");
    expect(container.querySelector("[data-focus]")).toBeNull();
    fireEvent.focus(ct);
    expect(container.querySelector("[data-focus=ct]")).not.toBeNull();
    expect(container.querySelector("[data-selected]")).toBeNull();
    fireEvent.blur(ct);
    expect(container.querySelector("[data-focus]")).toBeNull();
  });

  it("is one labelled image without a handler, and for the transfer diagram with one", () => {
    const { container } = render(<svg>{draw(bipedRecord(), "armor")}</svg>);
    expect(container.querySelector("[role=img]")?.getAttribute("aria-label")).toBe("Armor diagram");
    expect(container.querySelector("[role=button]")).toBeNull();
    cleanup();
    const transfer = render(<svg>{draw(bipedRecord(), "transfer", { onSelect: () => undefined })}</svg>);
    expect(transfer.container.querySelector("[role=img]")?.getAttribute("aria-label")).toBe("Damage transfer diagram");
    expect(transfer.container.querySelector("[role=button]")).toBeNull();
  });

  it("draws a bubble for every point of a 100-ton quad at full armor and full structure, in every location", () => {
    const record = editRecord(quadRecord({ tons: 100 }), (draft) => {
      for (const [loc, max] of Object.entries(maxArmor(draft))) {
        const torso = loc === "CT" || loc === "LT" || loc === "RT";
        const rear = torso ? Math.floor(max / 6) : 0;
        draft.armor[loc as keyof typeof draft.armor] = torso ? { front: max - rear, rear } : { front: max };
      }
    });
    const max = maxArmor(record), points = structurePoints(record);
    const rear = (code: "CT" | "LT" | "RT") => Math.floor((max[code] ?? 0) / 6);
    expect(countsOf(markupOf(record, "armor"))).toEqual({
      hd: 9, ct: 62 - rear("CT"), lt: 42 - rear("LT"), rt: 42 - rear("RT"), fll: 42, frl: 42, rll: 42, rrl: 42,
      ctr: rear("CT"), ltr: rear("LT"), rtr: rear("RT"),
    });
    expect(countsOf(markupOf(record, "structure"))).toEqual({
      hd: 3, ct: points.CT, lt: points.LT, rt: points.RT, fll: 21, frl: 21, rll: 21, rrl: 21,
    });
  });

  it("reads a quad's front and rear armor from the right record locations and sends each leg's damage to its side torso", () => {
    const record = editRecord(quadRecord(), (draft) => {
      draft.armor.FLL = { front: 11 };
      draft.armor.FRL = { front: 12 };
      draft.armor.RLL = { front: 13 };
      draft.armor.RRL = { front: 14 };
      draft.armor.LT = { front: 10, rear: 3 };
    });
    const unit = unitOf(record);
    expect(unit.layoutId).toBe("quad");
    expect([unit.armor("fll"), unit.armor("frl"), unit.armor("rll"), unit.armor("rrl")]).toEqual([11, 12, 13, 14]);
    expect([unit.armor("lt"), unit.armor("ltr")]).toEqual([10, 3]);
    const transfers = Object.fromEntries((DOLL_LAYOUTS.quad?.front ?? []).map((location) => [location.loc, location.transfersTo]));
    expect(transfers).toEqual({ fll: "lt", rll: "lt", frl: "rt", rrl: "rt", lt: "ct", rt: "ct", ct: undefined, hd: undefined });
  });

  it("draws no doll for a configuration with no layout", () => {
    expect(dollUnitFromRecord(quadRecord({ configuration: "hexapod" }))).toBeUndefined();
  });

  it("draws a tripod record with its center leg, which has the structure of the other legs", () => {
    const record = editRecord(bipedRecord({ tons: 100, configuration: "tripod" }), (draft) => void (draft.armor.CL = { front: 30 }));
    const unit = unitOf(record);
    expect(unit.layoutId).toBe("tripod");
    expect([unit.armor("cl"), unit.armor("ll"), unit.structure("cl")]).toEqual([30, 6, 21]);
  });

  it.each<[string, DollLayoutId, Partial<IDollVariant>]>([
    ...BODY_TYPES.map((id): [string, DollLayoutId, Partial<IDollVariant>] => [`100-ton ${id}`, id, {}]),
    ["200-ton superheavy biped", "biped", { superheavy: true }],
    ["200-ton superheavy tripod", "tripod", { superheavy: true }],
    ["100-ton four-armed biped", "biped", { arms: 4 }],
    ["100-ton two-armed quad", "quad", { arms: 2 }],
    ["100-ton four-armed quad", "quad", { arms: 4 }],
    ["100-ton two-armed octopod", "octopod", { arms: 2 }],
    ["100-ton four-armed octopod", "octopod", { arms: 4 }],
    ["100-ton two-armed pentapod", "pentapod", { arms: 2 }],
  ])("draws every point of a %s at full armor and structure, at a size a bubble can be read", (_name, layoutId, variant) => {
    const unit = fullUnit(layoutId, variant);
    const layout = layoutOf(unit);
    const frame = { centerX: 0, top: 0, scale: 1 };
    const armor = countsOf(renderToStaticMarkup(<svg><MechDoll unit={unit} use="armor" frame={frame} suffix="t" /></svg>));
    const structure = countsOf(renderToStaticMarkup(<svg><MechDoll unit={unit} use="structure" frame={frame} suffix="t" /></svg>));
    const wanted = (use: "armor" | "structure") =>
      Object.fromEntries([...(layout?.front ?? []), ...(use === "armor" ? (layout?.rear ?? []) : [])].map((location) => [location.loc, unit[use](location.loc)]));
    expect(armor).toEqual(wanted("armor"));
    expect(structure).toEqual(wanted("structure"));
    for (const location of [...(layout?.front ?? []), ...(layout?.rear ?? [])]) {
      const plates = placedPlates(location, frame);
      expect(fillPlates(plates, unit.armor(location.loc), ARMOR_PITCH).pitch, `${location.loc} armor`).toBeGreaterThanOrEqual(MIN_PITCH.armor);
      expect(fillPlates(plates, unit.structure(location.loc), STRUCTURE_PITCH).pitch, `${location.loc} structure`).toBeGreaterThanOrEqual(MIN_PITCH.structure);
    }
  });

  it.each<[string, DollLayoutId, Partial<IDollVariant>, Record<string, string>, string[]]>([
    ["superheavy biped", "biped", { superheavy: true }, { hd: "head-super", ct: "torso-center-super", lt: "torso-side-super" }, []],
    ["superheavy tripod", "tripod", { superheavy: true }, { hd: "head-super", ct: "torso-center-trunk-super", rt: "torso-side-super" }, []],
    ["Land-Air 'Mech", "biped", { lam: "lam" }, { hd: "head-canopy" }, ["wing-folded-left", "wing-folded-right", "fighter-inset"]],
    ["bimodal Land-Air 'Mech", "biped", { lam: "bimodal" }, { hd: "head-canopy" }, ["wing-folded-left", "wing-folded-right", "fighter-inset"]],
    ["VTOL Land-Air 'Mech", "biped", { lam: "vtol" }, { hd: "head-canopy" }, ["rotor"]],
    ["Partial-wing 'Mech", "biped", { lam: "partial-wing" }, { hd: "head-canopy" }, ["wing-fixed-left", "wing-fixed-right"]],
    ["QuadVee on tracks", "quad", { pods: "tracks" }, { fll: "quad-leg-front" }, ["pod-fll", "pod-frl", "pod-rll", "pod-rrl"]],
    ["QuadVee on wheels", "quad", { pods: "wheels" }, { rrl: "quad-leg-rear" }, ["pod-fll", "pod-frl", "pod-rll", "pod-rrl"]],
    ["tracked octopod", "octopod", { pods: "tracks" }, { l4: "top-leg" }, ["l1", "r1", "l2", "r2", "l3", "r3", "l4", "r4"].map((loc) => `pod-${loc}`)],
    ["armless biped", "biped", { armless: true }, { la: "arm-cap", ra: "arm-cap" }, []],
    ["four-armed biped", "biped", { arms: 4 }, { la: "arm", la2: "arm", ra2: "arm" }, ["strut-lower-left", "strut-lower-right"]],
    ["two-armed quad", "quad", { arms: 2 }, { la: "arm", ra: "arm" }, ["strut-upper-left", "strut-upper-right"]],
    ["four-armed hexapod", "hexapod", { arms: 4 }, { la: "top-arm", ra2: "top-arm" }, []],
  ])("swaps the parts of a %s and leaves its locations as they were", (_name, layoutId, variant, parts, decor) => {
    const frame = { centerX: 0, top: 0, scale: 1 };
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<svg><MechDoll unit={fullUnit(layoutId, variant)} use="armor" frame={frame} suffix="v" /></svg>);
    const base = DOLL_LAYOUTS[layoutId];
    const wanted = [...(base?.front ?? []), ...(base?.rear ?? [])].map((location) => location.loc);
    const drawn = [...host.querySelectorAll("g[data-loc]")];
    const added = variant.arms ? ["la", "ra", "la2", "ra2"] : [];
    expect(drawn.map((group) => group.getAttribute("data-loc")).filter((loc) => !added.includes(loc ?? ""))).toEqual(wanted.filter((loc) => !added.includes(loc)));
    for (const [loc, part] of Object.entries(parts)) expect(host.querySelector(`g[data-loc=${loc}]`)?.getAttribute("data-part"), loc).toBe(part);
    expect([...host.querySelectorAll("[data-decor]")].map((each) => each.getAttribute("data-decor")).sort()).toEqual([...decor].sort());
  });

  it("draws a shield beside the arm that carries one, on the armor diagram only, as a named picture and not a button", () => {
    const base = bipedRecord();
    const record = { ...base, mounts: [...base.mounts, { id: "shield", equipmentId: "shield-medium-is", name: "Shield, Medium", techBase: "inner-sphere" as const, location: "LA" as const, slot: 5 }] };
    const shields = { left: 18, absorbLeft: 5 };
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<svg>{draw(record, "armor", { onSelect: () => undefined, shields })}</svg>);
    // The 'Mech Shield Table: a medium shield has a Damage Capacity of 18 (circles) and a Damage Absorbance of 5 (diamonds).
    expect(host.querySelectorAll("g[data-bubbles=lsh] circle")).toHaveLength(18);
    expect(host.querySelectorAll("g[data-bubbles=lsha] [data-mark=diamond]")).toHaveLength(5);
    expect(host.querySelector("g[data-loc=lsh]")?.getAttribute("role")).toBe("img");
    expect(host.querySelector("g[data-loc=lsh]")?.getAttribute("aria-label")).toBe("Left Shield Damage Capacity, 18");
    expect(host.querySelector("g[data-loc=rsh]")).toBeNull();
    // It stands outside the arm: every corner of its plate is left of the arm's plates.
    const layout = layoutOf(unitOf(record, shields));
    const xs = (loc: string) => (layout?.front ?? []).filter((location) => location.loc === loc).flatMap((location) => placedPlates(location, FRAMES.armor)).flat().map(([x]) => x);
    expect(Math.max(...xs("lsh"))).toBeLessThan(Math.min(...xs("la")));
    for (const use of ["structure", "transfer"] as const) expect(markupOf(record, use, { shields })).not.toContain("data-loc=\"lsh\"");
  });

  it("draws no shield on a body without arms, and a full large shield at a size a bubble can be read on the smallest", () => {
    const shields = { left: true, right: true };
    for (const unit of [fullUnit("biped", { armless: true, shields }), fullUnit("quad", { shields })]) {
      expect(layoutOf(unit)?.front.map((location) => location.loc)).not.toContain("lsh");
    }
    // Beside an arm seen from above the shield is at its smallest; a large shield has a Damage Capacity of 25.
    const small = layoutOf(fullUnit("octopod", { arms: 4, shields }))?.front.find((location) => location.loc === "rsh");
    expect(small && fillPlates(placedPlates(small, { centerX: 0, top: 0, scale: 1 }), 25, ARMOR_PITCH).pitch).toBeGreaterThanOrEqual(MIN_PITCH.armor);
  });

  it.each(BODY_TYPES)("sends the damage of every location of a %s to places it has, and reaches the center torso from all but the head", (layoutId) => {
    const next = Object.fromEntries((DOLL_LAYOUTS[layoutId]?.front ?? []).map((location) => [location.loc, location.transfersTo]));
    for (const [loc, to] of Object.entries(next)) {
      if (to !== undefined) expect(Object.keys(next), loc).toContain(to);
      let at: string | undefined = loc;
      for (let hops = 0; hops < 4 && at && at !== "ct"; hops++) at = next[at];
      if (loc !== "hd") expect(at, loc).toBe("ct");
    }
  });
});
