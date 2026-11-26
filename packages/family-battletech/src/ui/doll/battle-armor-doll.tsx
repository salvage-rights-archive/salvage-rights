// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import { FigureDoll, figureBox, fitFigure, type FigureUse, type IFigureBox, type IFigureDollProps, type IFigureLayout, type IFigureLocation, type IFigureUnit } from "./figure-doll";
import { HUMANOID_SUIT, QUAD_SUIT, type ISuit } from "./parts-suit";

/*
 * The battle armor paper doll: one suit per trooper, `t1` to `t6` (a Battle Armor Record Sheet numbers its troopers 1 to 6:
 * Total Warfare p. 226, checked against the page image), in the order the unit lists them. `unit.layout` is the suit,
 * humanoid or quad, and may end in "-row" (every suit in one row) or "-column" (one under another); otherwise they stand
 * three to a row. Each suit shows both counts in either use: its armor bubbles on the chest plate and, in the helmet, a
 * bubble for each point of `structure`, the trooper inside (1 when the unit gives none).
 */

const TROOPER = /^t[1-9]\d*$/;
const GAP = 36;
const LABEL_ROOM = 54;

const built = new Map<string, IFigureLayout>();

/** The figure a battle armor unit is drawn with: a suit for each trooper location it lists. */
export const battleArmorLayout = (unit: IFigureUnit): IFigureLayout => {
    const quad = unit.layout.startsWith("quad");
    const codes = unit.locations.map((each) => each.code).filter((code) => TROOPER.test(code));
    const perRow = unit.layout.endsWith("-row") ? Math.max(codes.length, 1) : unit.layout.endsWith("-column") ? 1 : 3;
    const key = `${quad ? "quad" : "humanoid"}|${perRow}|${codes.join(",")}`;
    const known = built.get(key);
    if (known) return known;

    const suit: ISuit = quad ? QUAD_SUIT : HUMANOID_SUIT;
    const cellWidth = suit.reach * 2 + GAP, cellHeight = suit.height + LABEL_ROOM + GAP;
    const columns = Math.min(perRow, Math.max(codes.length, 1));
    const locations = codes.map((code, i): IFigureLocation => {
        const x = (i % columns - (columns - 1) / 2) * cellWidth, y = 20 + Math.floor(i / columns) * cellHeight;
        return {
            code, part: suit.part, at: { x, y }, spots: suit.trooper,
            label: [`TROOPER ${code.slice(1)}`], labelAt: [x, y + suit.height + 34], labelAnchor: "middle",
        };
    });
    const rows = Math.ceil(codes.length / columns), halfWidth = columns * cellWidth / 2 - GAP / 2;
    const layout: IFigureLayout = {
        id: quad ? "quad" : "humanoid", kind: "Battle armor", locations, combined: true,
        bounds: [[-halfWidth, 20], [halfWidth, 20], [halfWidth, 20 + rows * cellHeight - GAP], [-halfWidth, 20 + rows * cellHeight - GAP]],
    };
    built.set(key, layout);
    return layout;
};

/** A unit with a point of structure for every trooper that gives none: the trooper inside the suit. */
const withTroopers = (unit: IFigureUnit): IFigureUnit =>
    ({ ...unit, locations: unit.locations.map((each) => (each.structure === undefined ? { ...each, structure: 1 } : each)) });

export type IBattleArmorDollProps = IFigureDollProps;

export default function BattleArmorDoll(props: IBattleArmorDollProps): JSX.Element {
    return <FigureDoll {...props} unit={withTroopers(props.unit)} layout={battleArmorLayout(props.unit)} testId="battle-armor-doll" />;
}

/** The box the battle armor doll needs at a scale, and the largest scale at which it fits a room. */
export const battleArmorDollBox = (unit: IFigureUnit, use: FigureUse, scale: number, labelSize?: number, short = false): IFigureBox =>
    figureBox(battleArmorLayout(unit), unit, use, scale, labelSize, short);
export const fitBattleArmorDoll = (unit: IFigureUnit, use: FigureUse, width: number, height: number, labelSize?: number, short = false): { scale: number; box: IFigureBox } | undefined =>
    fitFigure(battleArmorLayout(unit), unit, use, width, height, labelSize, short);
