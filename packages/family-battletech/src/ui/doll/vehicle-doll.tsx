// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import { FigureDoll, figureBox, fitFigure, type FigureUse, type IFigureBox, type IFigureDollProps, type IFigureExtra, type IFigureLayout, type IFigureLocation, type IFigureUnit } from "./figure-doll";
import { bareDeck, chinTurret, rotorHub, turret, VEHICLE_HULLS, type IVehicleHull, type VehicleMotive } from "./parts-vehicle";

/*
 * The vehicle paper doll: a hull seen from above for each motive type, with the locations the unit lists. `unit.layout` is
 * the motive type (tracked, wheeled, hover, wige, vtol, naval, hydrofoil, submarine); the turrets come from the locations:
 * `t` is one turret (on a VTOL, the chin turret), `ft` and `bt` are a front and a rear turret, and with neither the deck is
 * bare. Location codes: `f` front, `l` left side, `r` right side, `b` rear, `rot` rotor; a large vehicle whose sides are two
 * locations each lists `fl`, `fr`, `bl` and `br` in place of `l` and `r`. Armor and structure are the same figure, the
 * structure one drawn smaller by its frame.
 */

/** The names a motive type also goes by. */
const MOTIVE_ALIASES: Record<string, VehicleMotive> = { "naval-surface": "naval", "displacement-hull": "naval", "sub": "submarine", "wheel": "wheeled", "track": "tracked" };

export const VEHICLE_LAYOUT_IDS = Object.keys(VEHICLE_HULLS) as VehicleMotive[];

/** The hull a layout id draws: its own, or a tank's for one that is not known, so that a vehicle is always drawn. */
const hullFor = (layout: string): IVehicleHull => {
    const id = Object.hasOwn(MOTIVE_ALIASES, layout) ? MOTIVE_ALIASES[layout] : layout;
    return (id !== undefined && Object.hasOwn(VEHICLE_HULLS, id) ? VEHICLE_HULLS[id as VehicleMotive] : undefined) ?? VEHICLE_HULLS.tracked;
};

/** Room in the middle column for a gun barrel ahead of a turret and for the label under it. */
const BARREL = { single: 84, dual: 40 };
const LABEL_STRIP = { single: 32, dual: 28 };

const built = new Map<string, IFigureLayout>();

/** The figure a vehicle is drawn with: its hull, and what its locations put in the middle column. */
export const vehicleLayout = (unit: IFigureUnit): IFigureLayout => {
    const hull = hullFor(unit.layout);
    const has = (code: string): boolean => unit.locations.some((each) => each.code === code);
    const dual = has("ft") && has("bt"), single = !dual && has("t"), vtol = hull.motive === "vtol", split = has("fl") || has("fr") || has("bl") || has("br");
    const key = `${hull.motive}|${dual ? 2 : single ? 1 : 0}|${has("rot") ? "rot" : ""}|${split ? "split" : ""}`;
    const known = built.get(key);
    if (known) return known;

    const { column, bowY, reach, bottom, top } = hull;
    const chin = vtol && single;
    const sideLabel = (name: string): Pick<IFigureLocation, "label" | "labelAt" | "labelAnchor"> => vtol
        ? { label: [name, "SIDE", ""], labelAt: [name === "LEFT" ? -204 : 204, 455], labelAnchor: name === "LEFT" ? "end" : "start" }
        : { label: [name, "SIDE", ""], labelAt: [name === "LEFT" ? -reach : reach, top], labelAnchor: name === "LEFT" ? "start" : "end" };
    const corner = (side: "LEFT" | "RIGHT", end: "FRONT" | "REAR"): Pick<IFigureLocation, "label" | "labelAt" | "labelAnchor"> => ({
        label: [end, side, ""], labelAt: [side === "LEFT" ? -reach : reach, end === "FRONT" ? top : bottom + 30], labelAnchor: side === "LEFT" ? "start" : "end",
    });
    const locations: IFigureLocation[] = [
        {
            code: "f", part: hull.front, at: { x: 0, y: 0 }, label: ["FRONT"],
            ...(chin ? { labelAt: [-66, bowY - 26], labelAnchor: "end" } : { labelAt: [0, top - 16], labelAnchor: "middle" }),
        },
        {
            code: "b", part: hull.rear, at: { x: 0, y: 0 }, label: ["REAR"],
            ...(vtol ? { labelAt: [60, hull.sternY + 44], labelAnchor: "start" } : { labelAt: [0, bottom + 30], labelAnchor: "middle" }),
        },
        ...(split ? [
            { code: "fl", part: hull.sideFront, at: { x: 0, y: 0 }, ...corner("LEFT", "FRONT") },
            { code: "fr", part: hull.sideFront, at: { x: 0, y: 0, mirror: true }, ...corner("RIGHT", "FRONT") },
            { code: "bl", part: hull.sideRear, at: { x: 0, y: 0 }, ...corner("LEFT", "REAR") },
            { code: "br", part: hull.sideRear, at: { x: 0, y: 0, mirror: true }, ...corner("RIGHT", "REAR") },
        ] satisfies IFigureLocation[] : [
            { code: "l", part: hull.side, at: { x: 0, y: 0 }, ...sideLabel("LEFT") },
            { code: "r", part: hull.side, at: { x: 0, y: 0, mirror: true }, ...sideLabel("RIGHT") },
        ] satisfies IFigureLocation[]),
    ];
    const extras: IFigureExtra[] = [{ id: "hull", decor: hull.shell, at: { x: 0, y: 0 }, behind: true }];
    const width = column.half * 2, length = column.bottom - column.top;

    if (has("rot")) {
        const middle = (column.top + column.bottom) / 2, radius = Math.min(column.half - 8, 50);
        locations.push({ code: "rot", part: rotorHub(radius), at: { x: 0, y: middle }, label: ["ROTOR", ""], labelAt: [0, middle + radius + 34], labelAnchor: "middle" });
    }
    if (chin) {
        locations.unshift({ code: "t", part: chinTurret(50), at: { x: 0, y: bowY - 58 }, label: ["TURRET"], labelAt: [66, bowY - 26], labelAnchor: "start" });
    } else if (single) {
        const top = column.top + BARREL.single;
        locations.push({ code: "t", part: turret(width, column.bottom - LABEL_STRIP.single - top, BARREL.single), at: { x: 0, y: top }, label: ["TURRET"], labelAt: [0, column.bottom - 6], labelAnchor: "middle" });
    } else if (dual) {
        const zone = length / 2, shell = zone - BARREL.dual - LABEL_STRIP.dual;
        locations.push(
            { code: "ft", part: turret(width, shell, BARREL.dual), at: { x: 0, y: column.top + BARREL.dual }, label: ["FRONT TURRET"], labelAt: [0, column.top + zone - 6], labelAnchor: "middle" },
            { code: "bt", part: turret(width, shell, BARREL.dual), at: { x: 0, y: column.top + zone + BARREL.dual }, label: ["REAR TURRET"], labelAt: [0, column.bottom - 6], labelAnchor: "middle" },
        );
    } else if (!has("rot")) {
        extras.push({ id: "deck", decor: bareDeck(column.half, column.top, column.bottom), at: { x: 0, y: 0 }, behind: false });
    }

    const layout: IFigureLayout = {
        id: hull.motive, kind: "Vehicle", locations, extras,
        bounds: chin ? [[-60, bowY - 142], [60, bowY - 142]] : undefined,
        guide: `M 0,${top - 34} L 0,${bottom + 10}`,
    };
    built.set(key, layout);
    return layout;
};

export type IVehicleDollProps = IFigureDollProps;

export default function VehicleDoll(props: IVehicleDollProps): JSX.Element {
    return <FigureDoll {...props} layout={vehicleLayout(props.unit)} testId="vehicle-doll" />;
}

/** The box the vehicle doll needs at a scale, and the largest scale at which it fits a room. */
export const vehicleDollBox = (unit: IFigureUnit, use: FigureUse, scale: number, labelSize?: number, short = false): IFigureBox =>
    figureBox(vehicleLayout(unit), unit, use, scale, labelSize, short);
export const fitVehicleDoll = (unit: IFigureUnit, use: FigureUse, width: number, height: number, labelSize?: number, short = false): { scale: number; box: IFigureBox } | undefined =>
    fitFigure(vehicleLayout(unit), unit, use, width, height, labelSize, short);
