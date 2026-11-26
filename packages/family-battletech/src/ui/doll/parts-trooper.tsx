// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import type { IPenIds, IPenStyle } from "./pen";
import type { BubblePoint, Shape } from "./shape-bubbles";
import { inner, joint, outline, seams, type IPart } from "./parts-kit";

/*
 * The parts for conventional infantry: one small trooper per soldier, seen from the front and drawn with the top middle
 * of the helmet at the origin, each with one bubble on the chest. The kind of platoon shows in what the trooper has:
 * a rifle at the shoulder (foot), a jump pack and its exhaust (jump), a motorcycle under them (motorized), or the hatch of
 * a carrier they ride in (mechanized). A platoon is one part: its troopers in rows. Our own drawing, nothing traced.
 */

export type TrooperKind = "foot" | "jump" | "motorized" | "mechanized";

/** A trooper's cell, the bubble on the chest and its spacing. */
const CELL: Record<TrooperKind, { width: number; height: number }> = {
    foot: { width: 72, height: 124 }, jump: { width: 72, height: 124 }, motorized: { width: 78, height: 128 }, mechanized: { width: 88, height: 128 },
};
const CHEST: BubblePoint = [0, 46];
const CHEST_PITCH = 26;

const mirrored = (draw: JSX.Element): JSX.Element => <g transform="scale(-1 1)">{draw}</g>;

const head = (pen: IPenStyle): JSX.Element => (
    <>
        {inner("M -7,16 L 7,16 L 6,27 L -6,27 Z", pen)}
        {outline("M -12,11 C -12,-3 12,-3 12,11 L 14,18 L -14,18 Z", pen)}
    </>
);

const torso = (pen: IPenStyle): JSX.Element => (
    <>
        {outline("M -22,30 L -31,37 L -31,62 L -24,64 L -21,42 Z", pen)}
        {mirrored(outline("M -22,30 L -31,37 L -31,62 L -24,64 L -21,42 Z", pen))}
        {outline("M -19,25 L 19,25 L 23,34 L 19,67 L -19,67 L -23,34 Z", pen)}
    </>
);

const standingLeg = (pen: IPenStyle): JSX.Element => (
    <>
        {outline("M -18,66 L -2,66 L -3,100 L -17,100 Z", pen)}
        {outline("M -19,98 L -1,98 L -1,107 L -23,107 Z", pen)}
    </>
);

const rifle = (pen: IPenStyle): JSX.Element => (
    <>
        {inner("M 33,8 L 37,8 L 37,40 L 33,40 Z", pen)}
        {outline("M 31,38 L 39,38 L 40,78 L 31,78 Z", pen)}
    </>
);

const DRAW: Record<TrooperKind, (pen: IPenStyle, ids: IPenIds) => JSX.Element> = {
    foot: (pen) => (
        <>
            {standingLeg(pen)}
            {mirrored(standingLeg(pen))}
            {rifle(pen)}
            {torso(pen)}
            {head(pen)}
        </>
    ),
    jump: (pen, ids) => (
        <>
            {outline("M -27,52 L -19,52 L -23,80 Z", pen)}
            {mirrored(outline("M -27,52 L -19,52 L -23,80 Z", pen))}
            {joint("M -28,24 L -16,15 L 16,15 L 28,24 L 28,54 L -28,54 Z", [], pen, ids)}
            {standingLeg(pen)}
            {mirrored(standingLeg(pen))}
            {torso(pen)}
            {head(pen)}
        </>
    ),
    motorized: (pen, ids) => (
        <>
            {outline("M -18,66 L -7,66 L -19,100 L -31,100 Z", pen)}
            {mirrored(outline("M -18,66 L -7,66 L -19,100 L -31,100 Z", pen))}
            {joint("M -7,70 C -7,62 7,62 7,70 L 7,104 C 7,112 -7,112 -7,104 Z", ["M -7,78 L 7,78", "M -7,88 L 7,88", "M -7,98 L 7,98"], pen, ids)}
            {inner("M -33,60 L 33,60 L 33,66 L -33,66 Z", pen)}
            {torso(pen)}
            {head(pen)}
        </>
    ),
    mechanized: (pen, ids) => (
        <>
            {joint("M -40,82 L -27,82 L -27,112 L -40,112 Z", ["M -40,92 L -27,92", "M -40,102 L -27,102"], pen, ids)}
            {mirrored(joint("M -40,82 L -27,82 L -27,112 L -40,112 Z", ["M -40,92 L -27,92", "M -40,102 L -27,102"], pen, ids))}
            {torso(pen)}
            {outline("M -30,62 L 30,62 L 36,74 L 36,98 L -36,98 L -36,74 Z", pen)}
            {seams(["M -32,76 L 32,76", "M -12,84 L 12,84", "M -12,90 L 12,90"], pen)}
            {head(pen)}
        </>
    ),
};

/** How many troopers stand in a row: a mechanized platoon's rows are shorter, as its squads are. */
export const TROOPERS_PER_ROW: Record<TrooperKind, number> = { foot: 10, jump: 10, motorized: 10, mechanized: 7 };

export interface IPlatoon {
    part: IPart;
    spots: { points: BubblePoint[]; pitch: number };
    /** The box round every trooper, which is what is outlined when the platoon is selected. */
    ring: Shape;
    width: number;
    height: number;
}

/** A platoon of `count` troopers, its top middle at the origin: rows of troopers filled from the top left, a short last
 * row centered. */
export const platoon = (kind: TrooperKind, count: number): IPlatoon => {
    const cell = CELL[kind], perRow = TROOPERS_PER_ROW[kind];
    const total = Math.max(0, Math.floor(count)), columns = Math.min(perRow, Math.max(total, 1)), rows = Math.max(1, Math.ceil(total / perRow));
    const places = Array.from({ length: total }, (_, i): BubblePoint => {
        const row = Math.floor(i / perRow), inRow = row === rows - 1 ? total - row * perRow : perRow;
        return [(i % perRow - (inRow - 1) / 2) * cell.width, row * cell.height + 6];
    });
    const width = columns * cell.width, height = rows * cell.height;
    return {
        part: {
            plates: [],
            label: [0, height / 2],
            // A trooper is a tenth of a 'Mech's height on the sheet: a line that heavy would close it up.
            draw: (pen, ids) => <>{places.map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}>{DRAW[kind]({ ...pen, contour: pen.contour * 0.6 }, ids)}</g>)}</>,
        },
        spots: { points: places.map(([x, y]): BubblePoint => [x + CHEST[0], y + CHEST[1]]), pitch: CHEST_PITCH },
        ring: [[-width / 2, 0], [width / 2, 0], [width / 2, height], [-width / 2, height]],
        width, height,
    };
};
