// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import { FigureDoll, figureBox, fitFigure, type FigureUse, type IFigureBox, type IFigureDollProps, type IFigureLayout, type IFigureUnit } from "./figure-doll";
import { platoon, type TrooperKind } from "./parts-trooper";

/*
 * The conventional infantry paper doll: one location, `pl` (the platoon), with a small trooper for each soldier and a
 * bubble on each trooper's chest. `unit.layout` is the kind of platoon: foot, jump, motorized or mechanized (an id that
 * begins with one of these, as "mechanized-hover", draws that kind). The platoon's `armor` is its number of troopers, since
 * a trooper is the point of damage a platoon has; both uses draw the same platoon.
 */

const KINDS: TrooperKind[] = ["foot", "jump", "motorized", "mechanized"];

/** The kind of trooper a layout id draws: foot soldiers for one that is not known. */
const kindOf = (layout: string): TrooperKind => KINDS.find((kind) => layout.startsWith(kind)) ?? "foot";

const built = new Map<string, IFigureLayout>();

/** The platoon's troopers: its armor, which the structure use reads too unless the unit gives a structure of its own. */
const troopers = (at: IFigureUnit["locations"][number] | undefined, use: FigureUse): number =>
    Math.max(0, Math.floor((use === "structure" ? at?.structure ?? at?.armor : at?.armor) ?? 0));

const counted = (unit: IFigureUnit): IFigureUnit =>
    ({ ...unit, locations: unit.locations.map((each) => (each.structure === undefined ? { ...each, structure: each.armor } : each)) });

const layoutFor = (unit: IFigureUnit, use: FigureUse): IFigureLayout => {
    const kind = kindOf(unit.layout);
    const at = unit.locations.find((each) => each.code === "pl");
    const count = troopers(at, use);
    const key = `${kind}|${count}`;
    const known = built.get(key);
    if (known) return known;
    const { part, spots, ring, height } = platoon(kind, count);
    const layout: IFigureLayout = {
        id: kind, kind: "Infantry", noun: "troopers",
        locations: [{ code: "pl", part, at: { x: 0, y: 20 }, spots, ring: [ring], label: ["TROOPERS"], labelAt: [0, 20 + height + 30], labelAnchor: "middle" }],
    };
    if (built.size > 400) built.clear();
    built.set(key, layout);
    return layout;
};

/** The figure a platoon is drawn with on its armor diagram: a trooper for each soldier. */
export const infantryLayout = (unit: IFigureUnit): IFigureLayout => layoutFor(unit, "armor");

export type IInfantryDollProps = IFigureDollProps;

export default function InfantryDoll(props: IInfantryDollProps): JSX.Element {
    return <FigureDoll {...props} unit={counted(props.unit)} layout={layoutFor(props.unit, props.use)} testId="infantry-doll" />;
}

/** The box the infantry doll needs at a scale, and the largest scale at which it fits a room. */
export const infantryDollBox = (unit: IFigureUnit, use: FigureUse, scale: number, labelSize?: number, short = false): IFigureBox =>
    figureBox(layoutFor(unit, use), unit, use, scale, labelSize, short);
export const fitInfantryDoll = (unit: IFigureUnit, use: FigureUse, width: number, height: number, labelSize?: number, short = false): { scale: number; box: IFigureBox } | undefined =>
    fitFigure(layoutFor(unit, use), unit, use, width, height, labelSize, short);
