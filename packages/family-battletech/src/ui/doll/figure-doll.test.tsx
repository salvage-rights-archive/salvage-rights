// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import BattleArmorDoll, { battleArmorLayout } from "./battle-armor-doll";
import { figurePlates, type FigureUse, type IFigureLayout, type IFigureUnit, type IFigureUnitLocation } from "./figure-doll";
import type { IDollFrame } from "./geometry";
import InfantryDoll from "./infantry-doll";
import ProtoDoll, { protoLayout } from "./proto-doll";
import { edgeDistance, insideShape } from "./shape-bubbles";
import VehicleDoll, { fitVehicleDoll, VEHICLE_LAYOUT_IDS, vehicleLayout } from "./vehicle-doll";

afterEach(cleanup);

const FRAME: IDollFrame = { centerX: 400, top: 0, scale: 1 };

const at = (code: string, armor: number, structure?: number): IFigureUnitLocation => ({ code, name: code.toUpperCase(), armor, structure });

type Ring = { x: number; y: number; outer: number };

/** The rings in each location's part of the bubble layer, read back from the markup. */
const ringsOf = (doll: React.JSX.Element): Record<string, Ring[]> => {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<svg>{doll}</svg>);
  const found: Record<string, Ring[]> = {};
  for (const group of host.querySelectorAll("g[data-bubbles]")) {
    found[group.getAttribute("data-bubbles") ?? ""] = [...group.querySelectorAll("circle")].map((circle) => ({
      x: Number(circle.getAttribute("cx")),
      y: Number(circle.getAttribute("cy")),
      outer: Number(circle.getAttribute("r")) + Number(circle.getAttribute("stroke-width")) / 2,
    }));
  }
  return found;
};

/** What is wrong with a drawing: a location short of its bubbles, a bubble outside its plates, two bubbles touching, or
 * bubbles closer together than `minPitch`. */
const problemsOf = (layout: IFigureLayout, unit: IFigureUnit, use: FigureUse, rings: Record<string, Ring[]>, minPitch: number): string[] => {
  const problems: string[] = [];
  for (const location of layout.locations) {
    const wanted = unit.locations.find((each) => each.code === location.code);
    if (!wanted) continue;
    const own = rings[location.code] ?? [];
    const count = use === "armor" ? wanted.armor : wanted.structure ?? 0;
    if (own.length !== count) problems.push(`${location.code} draws ${own.length} of ${count}`);
    const plates = figurePlates(location, FRAME);
    own.forEach((ring, i) => {
      if (!plates.some((plate) => insideShape(plate, [ring.x, ring.y]) && edgeDistance(plate, [ring.x, ring.y]) >= ring.outer - 0.5)) problems.push(`${location.code} bubble outside its plate`);
      for (const other of own.slice(i + 1)) {
        const apart = Math.hypot(ring.x - other.x, ring.y - other.y);
        if (apart < ring.outer + other.outer - 0.2) problems.push(`${location.code} bubbles overlap`);
        if (apart < minPitch - 0.2) problems.push(`${location.code} bubbles ${apart.toFixed(1)} apart`);
      }
    });
  }
  return [...new Set(problems)];
};

describe("the vehicle doll", () => {
  // The most a Combat Vehicle carries is 3.5 points a ton plus 40, and no location but the rotor (2 points) has a limit of
  // its own (TechManual p. 105); the heaviest of each motive type is in the Combat Vehicle Motive Types Table (TechManual
  // p. 96); every location, a turret too, has a point of structure for each 10 tons, rounded up (TechManual p. 98).
  const MAX_TONS: Record<string, number> = { tracked: 100, wheeled: 80, hover: 50, wige: 80, vtol: 30, naval: 300, hydrofoil: 100, submarine: 300 };
  const codesOf = (motive: string): string[] => (motive === "vtol" ? ["f", "l", "r", "b", "rot"] : ["f", "l", "r", "b", "t"]);

  it.each(VEHICLE_LAYOUT_IDS)("holds the heaviest %s vehicle's armor and structure, shared out or all in one location", (motive) => {
    const tons = MAX_TONS[motive] ?? 0, factor = Math.floor(3.5 * tons + 40), structure = Math.ceil(tons / 10);
    const plated = codesOf(motive).filter((code) => code !== "rot");
    const shared: IFigureUnit = { layout: motive, locations: codesOf(motive).map((code) => at(code, code === "rot" ? 2 : Math.floor(factor / plated.length), structure)) };
    expect(problemsOf(vehicleLayout(shared), shared, "armor", ringsOf(<VehicleDoll unit={shared} use="armor" frame={FRAME} suffix="t" />), 12)).toEqual([]);
    expect(problemsOf(vehicleLayout(shared), shared, "structure", ringsOf(<VehicleDoll unit={shared} use="structure" frame={FRAME} suffix="t" />), 20)).toEqual([]);
    for (const code of plated) {
      const one: IFigureUnit = { layout: motive, locations: codesOf(motive).map((each) => at(each, each === code ? factor : 0)) };
      expect(problemsOf(vehicleLayout(one), one, "armor", ringsOf(<VehicleDoll unit={one} use="armor" frame={FRAME} suffix="t" />), 0)).toEqual([]);
    }
  });

  it("draws the turrets and sides the unit lists: none, one, a front and a rear turret, a chin turret, split sides", () => {
    const drawn = (layout: string, codes: string[]): string[] => {
      const unit: IFigureUnit = { layout, locations: codes.map((code) => at(code, 10, 4)) };
      return Object.keys(ringsOf(<VehicleDoll unit={unit} use="armor" frame={FRAME} suffix="t" />)).sort();
    };
    expect(drawn("tracked", ["f", "l", "r", "b"])).toEqual(["b", "f", "l", "r"]);
    expect(drawn("tracked", ["f", "l", "r", "b", "t"])).toEqual(["b", "f", "l", "r", "t"]);
    // A front and a rear turret, each its own location (Tactical Operations: Advanced Units and Equipment p. 159).
    const dual: IFigureUnit = { layout: "naval", locations: ["f", "l", "r", "b", "ft", "bt"].map((code) => at(code, 60, 10)) };
    expect(problemsOf(vehicleLayout(dual), dual, "armor", ringsOf(<VehicleDoll unit={dual} use="armor" frame={FRAME} suffix="t" />), 12)).toEqual([]);
    const chin: IFigureUnit = { layout: "vtol", locations: [...["f", "l", "r", "b", "t"].map((code) => at(code, 20, 3)), at("rot", 2, 3)] };
    expect(problemsOf(vehicleLayout(chin), chin, "armor", ringsOf(<VehicleDoll unit={chin} use="armor" frame={FRAME} suffix="t" />), 12)).toEqual([]);
    const split: IFigureUnit = { layout: "tracked", locations: ["f", "fl", "fr", "bl", "br", "b", "t"].map((code) => at(code, 80, 20)) };
    expect(problemsOf(vehicleLayout(split), split, "armor", ringsOf(<VehicleDoll unit={split} use="armor" frame={FRAME} suffix="t" />), 12)).toEqual([]);
    // A motive type the doll does not know is drawn as a tank, and a location it does not know is left out.
    expect(drawn("walker", ["f", "l", "r", "b", "zz"])).toEqual(["b", "f", "l", "r"]);
  });

  it("fits a room: the box at the fitted scale is no larger than the room", () => {
    const unit: IFigureUnit = { layout: "hover", locations: ["f", "l", "r", "b", "t"].map((code) => at(code, 30, 5)) };
    const fitted = fitVehicleDoll(unit, "armor", 400, 500);
    expect(fitted?.box.width).toBeLessThanOrEqual(400);
    expect(fitted?.box.height).toBeLessThanOrEqual(500);
    expect(Math.max((fitted?.box.width ?? 0) / 400, (fitted?.box.height ?? 0) / 500)).toBeGreaterThan(0.98);
  });
});

describe("the ProtoMech doll", () => {
  // The most each location holds, at 15 tons: Interstellar Operations: Alternate Eras, Expanded ProtoMech Structure and
  // Armor Table, p. 95 (the same figures as TechManual p. 82 up to 9 tons). A quad has no arms and its legs take the
  // Legs (Quad, All) column.
  it.each([
    ["biped", [at("hd", 9, 4), at("t", 30, 15), at("la", 6, 4), at("ra", 6, 4), at("lg", 16, 8), at("mg", 6, 2)]],
    ["glider", [at("hd", 9, 4), at("t", 30, 15), at("la", 6, 4), at("ra", 6, 4), at("lg", 16, 8), at("mg", 6, 2)]],
    ["quad", [at("hd", 9, 4), at("t", 30, 15), at("lg", 28, 14), at("mg", 6, 2)]],
  ] as const)("holds a 15-ton %s's armor and structure", (layout, locations) => {
    const unit: IFigureUnit = { layout, locations: [...locations] };
    expect(problemsOf(protoLayout(unit), unit, "armor", ringsOf(<ProtoDoll unit={unit} use="armor" frame={FRAME} suffix="t" />), 18)).toEqual([]);
    expect(problemsOf(protoLayout(unit), unit, "structure", ringsOf(<ProtoDoll unit={unit} use="structure" frame={FRAME} suffix="t" />), 18)).toEqual([]);
  });

  it("draws the main gun only for a unit that lists it", () => {
    const unit: IFigureUnit = { layout: "biped", locations: [at("hd", 3, 1), at("t", 4, 2), at("la", 2, 1), at("ra", 2, 1), at("lg", 4, 2)] };
    expect(Object.keys(ringsOf(<ProtoDoll unit={unit} use="armor" frame={FRAME} suffix="t" />)).sort()).toEqual(["hd", "la", "lg", "ra", "t"]);
  });
});

describe("the battle armor doll", () => {
  // An assault suit carries 18 points of armor at the most (TechManual, Battle Armor Protection Table, p. 169), and a
  // record sheet numbers its troopers 1 to 6 (Total Warfare p. 226).
  it.each(["humanoid", "quad", "humanoid-row"])("gives each of six %s troopers 18 armor bubbles on the suit and one for the trooper", (layout) => {
    const unit: IFigureUnit = { layout, locations: Array.from({ length: 6 }, (_, i) => ({ code: `t${i + 1}`, name: `Trooper ${i + 1}`, armor: 18 })) };
    const rings = ringsOf(<BattleArmorDoll unit={unit} use="armor" frame={FRAME} suffix="t" />);
    const figure = battleArmorLayout(unit);
    expect(Object.keys(rings)).toEqual(["t1", "t2", "t3", "t4", "t5", "t6"]);
    for (const location of figure.locations) {
      const own = rings[location.code] ?? [];
      const plates = figurePlates(location, FRAME);
      const onPlate = own.filter((ring) => plates.some((plate) => insideShape(plate, [ring.x, ring.y]) && edgeDistance(plate, [ring.x, ring.y]) >= ring.outer - 0.5));
      expect([location.code, own.length, onPlate.length]).toEqual([location.code, 19, 18]);
      for (const [i, ring] of own.entries()) {
        for (const other of own.slice(i + 1)) expect(Math.hypot(ring.x - other.x, ring.y - other.y)).toBeGreaterThanOrEqual(Math.min(18, ring.outer + other.outer));
      }
    }
  });
});

describe("the infantry doll", () => {
  // The largest platoons: 30 on foot, motorized or jumping, 28 mechanized (TechManual, Conventional Infantry Motive Types
  // Table, p. 145).
  it.each([["foot", 30], ["jump", 30], ["motorized", 30], ["mechanized-tracked", 28]] as const)("draws a %s platoon with a bubble for each of its %i troopers, none touching", (layout, count) => {
    const unit: IFigureUnit = { layout, locations: [{ code: "pl", name: "Platoon", armor: count }] };
    const rings = ringsOf(<InfantryDoll unit={unit} use="armor" frame={FRAME} suffix="t" />).pl ?? [];
    expect(rings).toHaveLength(count);
    for (const [i, ring] of rings.entries()) {
      for (const other of rings.slice(i + 1)) expect(Math.hypot(ring.x - other.x, ring.y - other.y)).toBeGreaterThan(ring.outer + other.outer + 20);
    }
  });
});

describe("a figure doll's locations", () => {
  it("are buttons named by the location and its points when they can be chosen, and one labelled image when they cannot", () => {
    const unit: IFigureUnit = { layout: "tracked", locations: [{ code: "f", name: "Front", armor: 30, structure: 5 }, { code: "t", name: "Turret", armor: 20, structure: 5 }] };
    const chosen: string[] = [];
    const { getByRole, queryAllByRole, rerender, container } = render(
      <svg><VehicleDoll unit={unit} use="armor" frame={FRAME} suffix="t" selected="t" inError={["f"]} onSelect={(code) => chosen.push(code)} /></svg>,
    );
    expect(queryAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["Front, 30 armor, in error", "Turret, 20 armor"]);
    expect(getByRole("button", { name: "Turret, 20 armor" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(getByRole("button", { name: "Front, 30 armor, in error" }), { key: "Enter" });
    fireEvent.click(getByRole("button", { name: "Turret, 20 armor" }));
    expect(chosen).toEqual(["f", "t"]);
    expect(container.querySelector("[data-error='f']")).not.toBeNull();
    expect(container.querySelector("[data-selected='t']")).not.toBeNull();

    rerender(<svg><VehicleDoll unit={unit} use="structure" frame={FRAME} suffix="t" /></svg>);
    expect(queryAllByRole("button")).toEqual([]);
    expect(getByRole("img").getAttribute("aria-label")).toBe("Vehicle structure diagram");

    // A suit is named by its armor in either use, and a platoon by its troopers.
    rerender(<svg><BattleArmorDoll unit={{ layout: "humanoid", locations: [{ code: "t1", name: "Trooper 1", armor: 10 }] }} use="structure" frame={FRAME} suffix="t" onSelect={() => undefined} /></svg>);
    expect(getByRole("button").getAttribute("aria-label")).toBe("Trooper 1, 10 armor");
    rerender(<svg><InfantryDoll unit={{ layout: "jump", locations: [{ code: "pl", name: "Platoon", armor: 21 }] }} use="armor" frame={FRAME} suffix="t" onSelect={() => undefined} /></svg>);
    expect(getByRole("button").getAttribute("aria-label")).toBe("Platoon, 21 troopers");
  });
});
