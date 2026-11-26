// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import { INK, PAPER, type IPenIds, type IPenStyle } from "./pen";
import { circleShape, clipShape, roundedRectShape, type BubblePoint, type Shape } from "./shape-bubbles";
import { inner, joint, offsetShape, outline, plateFace, polygonPath, rivets, round, seams, type IDecor, type IPart } from "./parts-kit";

/*
 * The parts for a vehicle seen from above, its front at the top of the sheet. A hull is a deck (a convex outline given as
 * half-widths down its length) cut into the plates of its locations: the front across the bow, the rear across the stern,
 * a side down each flank, and a column down the middle for the turret or turrets, or the rotor. Each plate is the cut
 * piece moved in by a margin and each plate's outline is the plate grown again, so a plate always lies inside its outline
 * and the outlines never meet. What tells the motive types apart is drawn around the deck and is no location: tracks,
 * wheels, a hover skirt and its fans, wings, a tail boom and rotor blades, a wake, foils, dive planes and a screw.
 * Our own drawing, nothing traced.
 *
 * The locations: Front, Left Side, Right Side, Rear and Turret (Total Warfare, Ground Combat Vehicle Hit Location Table,
 * p. 193); a VTOL has Rotors and, under the standard rules, no turret (Total Warfare, VTOL Combat Vehicle Hit Location
 * Table, p. 196; TechManual p. 98); a second turret makes a front and a rear turret, each a location (Tactical Operations:
 * Advanced Units and Equipment, Vehicular Dual Turret, p. 159). Each checked against the page image.
 */

export type VehicleMotive = "tracked" | "wheeled" | "hover" | "wige" | "vtol" | "naval" | "hydrofoil" | "submarine";

/** How far a plate lies inside its cut piece, and how far its outline is drawn outside the plate. */
const INSET = 13;
const MARGIN = 9;

/** A plate drawn with its outline, its rivets and its border. */
const slabbed = (plate: Shape, pen: IPenStyle): JSX.Element => (
    <>
        {outline(polygonPath(offsetShape(plate, MARGIN)), pen)}
        {plateFace(plate, pen)}
        {rivets(plate, pen)}
    </>
);

const middleOf = (shape: Shape): BubblePoint => [
    shape.reduce((sum, [x]) => sum + x, 0) / shape.length,
    shape.reduce((sum, [, y]) => sum + y, 0) / shape.length,
];

const plated = (plate: Shape): IPart => ({ plates: [plate], label: middleOf(plate), draw: (pen) => slabbed(plate, pen) });

const box = (x0: number, y0: number, x1: number, y1: number): Shape => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** A rectangle with rounded ends, as path data. */
const pill = (x0: number, y0: number, x1: number, y1: number, r: number): string =>
    `M ${x0 + r},${y0} L ${x1 - r},${y0} Q ${x1},${y0} ${x1},${y0 + r} L ${x1},${y1 - r} Q ${x1},${y1} ${x1 - r},${y1} L ${x0 + r},${y1} Q ${x0},${y1} ${x0},${y1 - r} L ${x0},${y0 + r} Q ${x0},${y0} ${x0 + r},${y0} Z`;

const ring = (cx: number, cy: number, r: number, pen: IPenStyle, width = pen.contour): JSX.Element =>
    <circle cx={cx} cy={cy} r={r} fill={PAPER} stroke={INK} strokeWidth={round(width)} />;

// ---- The decks: half-widths down the length, the bow first. A bow is pointed (a parabola from its tip) or round (a
// quarter ellipse, in equal turns); either way the half-width never grows faster further aft, so the deck is convex.

type Profile = [number, number][];

const bow = (kind: "pointed" | "round", tip: number, full: number, half: number, steps = 6): Profile =>
    Array.from({ length: steps + 1 }, (_, i): [number, number] => {
        const t = i / steps, turn = t * Math.PI / 2;
        return kind === "pointed"
            ? [round(tip + (full - tip) * t), round(half * (1 - (1 - t) ** 2))]
            : [round(tip + (full - tip) * (1 - Math.cos(turn))), round(half * Math.sin(turn))];
    });

/** The same curve turned round, for a stern that closes to a point. */
const stern = (kind: "pointed" | "round", full: number, tip: number, half: number, steps = 6): Profile =>
    bow(kind, tip, full, half, steps).reverse();

const deckOf = (profile: Profile): Shape => {
    const right = profile.map(([y, half]): BubblePoint => [half, y]);
    const left = [...profile].reverse().filter(([, half]) => half > 0).map(([y, half]): BubblePoint => [-half, y]);
    return [...right, ...left];
};

interface IHullSpec {
    profile: Profile;
    /** Where the front plate ends and the rear plate begins, down the deck. */
    frontTo: number;
    rearFrom: number;
    /** Half the width of the middle column. */
    column: number;
    /** The drawing's reach either side of the center line, and its lowest point, with what is drawn around the deck. */
    reach: number;
    bottom: number;
    /** Its highest point, where that is not the bow. */
    top?: number;
    /** What is drawn around and under the deck, left and right. */
    around(pen: IPenStyle, ids: IPenIds, deck: Shape): JSX.Element;
}

/** Tread ribs or tire ribs: short lines across a strip. */
const ribs = (x0: number, x1: number, from: number, to: number, pitch: number): string[] =>
    Array.from({ length: Math.max(0, Math.floor((to - from) / pitch) - 1) }, (_, i) => `M ${x0},${round(from + (i + 1) * pitch)} L ${x1},${round(from + (i + 1) * pitch)}`);

const both = (draw: (side: 1 | -1) => JSX.Element): JSX.Element => <>{([-1, 1] as const).map((side) => <React.Fragment key={side}>{draw(side)}</React.Fragment>)}</>;

/** A path's mirror image across the center line (absolute M, L, Q and C commands with x,y pairs only). */
const flip = (d: string): string => d.replace(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${round(-Number(x))},${y}`);
const sided = (d: string, side: 1 | -1): string => (side === 1 ? d : flip(d));

/** A wake: the curl of water thrown off each bow and the lines trailing from the stern. */
const wake = (bowY: number, half: number, sternY: number, pen: IPenStyle): JSX.Element => both((side) => (
    <>
        {seams([
            sided(`M ${round(half * 0.42)},${bowY + 96} C ${round(half * 0.8)},${bowY + 110} ${round(half + 26)},${bowY + 150} ${round(half + 44)},${bowY + 214}`, side),
            sided(`M ${round(half * 0.7)},${bowY + 92} C ${round(half + 6)},${bowY + 96} ${round(half + 44)},${bowY + 128} ${round(half + 66)},${bowY + 176}`, side),
            sided(`M ${round(half * 0.5)},${sternY + 14} C ${round(half * 0.54)},${sternY + 34} ${round(half * 0.62)},${sternY + 50} ${round(half * 0.74)},${sternY + 62}`, side),
        ], pen)}
    </>
));

const HULLS: Record<VehicleMotive, IHullSpec> = {
    // A tank: a slab hull with a chamfered glacis between two tread loops.
    tracked: {
        profile: [[140, 184], [226, 280], [884, 280], [950, 232]],
        frontTo: 330, rearFrom: 800, column: 134, reach: 346, bottom: 962,
        around: (pen, ids) => both((side) => (
            <>
                {joint(sided(pill(284, 196, 346, 938, 18), side), ribs(side * 290, side * 340, 196, 938, 24), pen, ids)}
                {seams([sided("M 296,214 L 296,920", side)], pen)}
                {outline(sided("M 250,952 L 250,972 L 222,972 L 222,952 Z", side), pen)}
            </>
        )),
    },
    // An armored car: a narrower hood, three tires a side.
    wheeled: {
        profile: [[140, 150], [256, 270], [892, 270], [950, 236]],
        frontTo: 330, rearFrom: 800, column: 128, reach: 340, bottom: 962,
        around: (pen, ids) => both((side) => (
            <>
                {[300, 566, 832].map((y) => (
                    <React.Fragment key={y}>
                        {joint(sided(`M 250,${y - 14} L 290,${y - 14} L 290,${y + 14} L 250,${y + 14} Z`, side), [], pen, ids)}
                        {outline(sided(pill(282, y - 62, 340, y + 62, 16), side), pen)}
                        {seams(ribs(side * 288, side * 334, y - 62, y + 62, 20), pen)}
                    </React.Fragment>
                ))}
                {outline(sided("M 150,132 L 150,118 L 196,118 L 214,140 Z", side), pen)}
            </>
        )),
    },
    // A hovercraft: a round-bowed hull inside its air skirt, two lift fans astern.
    hover: {
        profile: [...bow("round", 150, 290, 268, 8), [870, 268], [946, 214]],
        frontTo: 330, rearFrom: 800, column: 130, reach: 318, bottom: 1042, top: 100,
        around: (pen, _ids, deck) => (
            <>
                {both((side) => (
                    <>
                        {ring(side * 118, 1000, 40, pen)}
                        {seams([`M ${side * 118 - 28},972 L ${side * 118 + 28},1028`, `M ${side * 118 + 28},972 L ${side * 118 - 28},1028`], pen)}
                        {ring(side * 118, 1000, 9, pen, Math.max(pen.panel, pen.contour * 0.5))}
                    </>
                ))}
                {outline(polygonPath(offsetShape(deck, 46)), pen)}
                {inner(polygonPath(offsetShape(deck, 28)), pen)}
                {seams(offsetShape(deck, 46).map(([x, y], i, all) => {
                    const [bx, by] = all[(i + 1) % all.length] ?? [x, y];
                    const mx = (x + bx) / 2, my = (y + by) / 2, length = Math.hypot(mx, my - 560) || 1;
                    return `M ${round(mx)},${round(my)} L ${round(mx - mx / length * 14)},${round(my - (my - 560) / length * 14)}`;
                }), pen)}
            </>
        ),
    },
    // A wing-in-ground-effect craft: a pointed nose, a stub wing each side and a tailplane with twin fins.
    wige: {
        profile: [...bow("pointed", 120, 330, 258), [870, 258], [946, 204]],
        frontTo: 330, rearFrom: 800, column: 124, reach: 352, bottom: 1010,
        around: (pen) => (
            <>
                {both((side) => (
                    <>
                        {outline(sided("M 250,404 L 350,470 L 352,650 L 250,640 Z", side), pen)}
                        {seams([sided("M 262,600 L 344,612", side), sided("M 262,622 L 346,634", side), sided("M 322,456 L 322,646", side)], pen)}
                        {outline(sided("M 150,940 L 236,972 L 236,1008 L 150,996 Z", side), pen)}
                        {outline(sided("M 190,930 L 204,930 L 208,1008 L 186,1008 Z", side), pen)}
                    </>
                ))}
                {outline("M -150,950 L 150,950 L 150,990 L -150,990 Z", pen)}
                {seams(["M -146,972 L 146,972"], pen)}
            </>
        ),
    },
    // A helicopter: a short cabin, a tail boom with its tail rotor and the main rotor's four blades.
    vtol: {
        profile: [...bow("round", 176, 300, 190, 7), [620, 190], [700, 160], [764, 104]],
        frontTo: 310, rearFrom: 640, column: 72, reach: 330, bottom: 1010,
        around: (pen, ids) => (
            <>
                {outline("M -42,740 L 42,740 L 22,968 L -22,968 Z", pen)}
                {seams(["M 0,776 L 0,952", "M -34,820 L 34,820", "M -28,890 L 28,890"], pen)}
                {outline("M -112,930 L 112,930 L 112,962 L -112,962 Z", pen)}
                {outline("M -18,956 L 18,956 L 12,1008 L -12,1008 Z", pen)}
                {joint("M 22,936 L 46,936 L 46,956 L 22,956 Z", [], pen, ids)}
                {outline(pill(44, 884, 58, 1008, 7), pen)}
                {[45, 135, 225, 315].map((turn) => (
                    <g key={turn} transform={`translate(0 475) rotate(${turn})`}>
                        {outline("M -11,-40 L 11,-40 L 16,-410 L 9,-440 L -9,-440 L -16,-410 Z", pen)}
                        {seams(["M 0,-60 L 0,-428"], pen)}
                    </g>
                ))}
                {both((side) => outline(sided("M 150,640 L 214,654 L 214,676 L 150,676 Z", side), pen))}
            </>
        ),
    },
    // A ship: a long pointed bow, a square transom with twin screws and a rudder, and her wake.
    naval: {
        profile: [...bow("pointed", 96, 420, 262, 7), [880, 262], [950, 232]],
        frontTo: 350, rearFrom: 810, column: 124, reach: 330, bottom: 1012,
        around: (pen, ids) => (
            <>
                {wake(96, 262, 950, pen)}
                {both((side) => (
                    <>
                        {joint(sided("M 96,952 L 132,952 L 132,984 L 96,984 Z", side), [], pen, ids)}
                        {outline(sided("M 84,980 L 144,980 L 136,1000 L 92,1000 Z", side), pen)}
                    </>
                ))}
                {outline("M -10,952 L 10,952 L 8,1010 L -8,1010 Z", pen)}
            </>
        ),
    },
    // A hydrofoil: a slim hull riding on a foil forward and a foil aft, each on two struts.
    hydrofoil: {
        profile: [...bow("pointed", 96, 400, 216, 7), [870, 216], [950, 184]],
        frontTo: 350, rearFrom: 810, column: 96, reach: 340, bottom: 990,
        around: (pen, ids) => (
            <>
                {wake(96, 216, 950, pen)}
                {both((side) => (
                    <>
                        {joint(sided("M 150,296 L 300,318 L 300,340 L 150,330 Z", side), [], pen, ids)}
                        {outline(sided("M 270,270 L 322,286 L 340,372 L 318,400 L 286,388 Z", side), pen)}
                        {seams([sided("M 290,296 L 318,384", side)], pen)}
                        {joint(sided("M 180,842 L 286,852 L 286,874 L 180,872 Z", side), [], pen, ids)}
                        {outline(sided("M 262,812 L 306,826 L 318,896 L 300,918 L 272,906 Z", side), pen)}
                        {seams([sided("M 280,834 L 300,902", side)], pen)}
                    </>
                ))}
                {outline("M -10,948 L 10,948 L 8,988 L -8,988 Z", pen)}
            </>
        ),
    },
    // A submarine: a round bow with its planes, a hull drawn in to a point astern, the stern planes and the screw.
    submarine: {
        profile: [...bow("round", 110, 300, 236, 8), [690, 236], ...stern("pointed", 690, 960, 236, 5).slice(1)],
        frontTo: 330, rearFrom: 750, column: 100, reach: 320, bottom: 1016,
        around: (pen, ids) => (
            <>
                {both((side) => (
                    <>
                        {outline(sided("M 190,250 L 318,290 L 320,326 L 214,318 Z", side), pen)}
                        {seams([sided("M 232,292 L 312,310", side)], pen)}
                        {outline(sided("M 96,884 L 226,930 L 226,962 L 70,950 Z", side), pen)}
                        {seams([sided("M 110,918 L 216,946", side)], pen)}
                    </>
                ))}
                {joint("M -30,964 L 30,964 L 22,986 L -22,986 Z", [], pen, ids)}
                {outline("M -74,994 C -40,980 -16,984 0,996 C 16,984 40,980 74,994 C 40,1016 16,1012 0,1000 C -16,1012 -40,1016 -74,994 Z", pen)}
                {ring(0, 997, 8, pen, Math.max(pen.panel, pen.contour * 0.5))}
            </>
        ),
    },
};

export interface IVehicleHull {
    motive: VehicleMotive;
    front: IPart;
    rear: IPart;
    /** The left side; the right side is the same part mirrored. */
    side: IPart;
    /** The left side in two, for the large vehicles whose sides are a front and a rear location each. */
    sideFront: IPart;
    sideRear: IPart;
    /** The middle column, between the front and rear plates and the two sides: where turrets and a rotor go. */
    column: { half: number; top: number; bottom: number };
    /** The deck's first and last points down the sheet, the drawing's reach either side, its highest and its lowest point. */
    top: number;
    bowY: number;
    sternY: number;
    reach: number;
    bottom: number;
    /** The hull's shell with what is drawn around it. */
    shell: IDecor;
}

const FAR = 2000;

/** Clipping leaves a corner twice where a cut passes through one; a plate has each corner once. */
const distinct = (shape: Shape): Shape => shape.filter(([x, y], i) => {
    const [px, py] = shape[(i + shape.length - 1) % shape.length] ?? [NaN, NaN];
    return Math.hypot(x - px, y - py) > 0.5;
});

/** A convex shape with every edge moved `d` inward: what is left of it inside each of its edges' lines moved in by `d`.
 * Unlike moving the corners, this stays convex where a short edge closes up altogether. */
const inset = (shape: Shape, d: number): Shape => {
    const area = shape.reduce((sum, [x1, y1], i) => {
        const [x2, y2] = shape[(i + 1) % shape.length] ?? [x1, y1];
        return sum + x1 * y2 - x2 * y1;
    }, 0);
    const turn = Math.sign(area) || 1;
    return distinct(shape.reduce((left: Shape, [ax, ay], i): Shape => {
        const [bx, by] = shape[(i + 1) % shape.length] ?? [ax, ay];
        const length = Math.hypot(bx - ax, by - ay) || 1;
        // How far inside this edge's line a point is, less the margin.
        const depth = ([px, py]: BubblePoint): number => turn * ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / length - d;
        return left.flatMap((p, j): Shape => {
            const q = left[(j + 1) % left.length] ?? p;
            const dp = depth(p), dq = depth(q);
            const crossing: BubblePoint = [p[0] + (q[0] - p[0]) * dp / (dp - dq), p[1] + (q[1] - p[1]) * dp / (dp - dq)];
            if (dp >= 0 && dq >= 0) return [q];
            if (dp >= 0) return [crossing];
            if (dq >= 0) return [crossing, q];
            return [];
        });
    }, shape));
};

const hullOf = (motive: VehicleMotive): IVehicleHull => {
    const spec = HULLS[motive];
    const deck = deckOf(spec.profile);
    const cut = (x0: number, y0: number, x1: number, y1: number): Shape => inset(distinct(clipShape(deck, box(x0, y0, x1, y1))), INSET);
    const half = (spec.frontTo + spec.rearFrom) / 2;
    const bowY = spec.profile[0]?.[0] ?? 0, sternY = spec.profile[spec.profile.length - 1]?.[0] ?? 0;
    return {
        motive,
        front: plated(cut(-FAR, -FAR, FAR, spec.frontTo)),
        rear: plated(cut(-FAR, spec.rearFrom, FAR, FAR)),
        side: plated(cut(-FAR, spec.frontTo, -spec.column, spec.rearFrom)),
        sideFront: plated(cut(-FAR, spec.frontTo, -spec.column, half)),
        sideRear: plated(cut(-FAR, half, -spec.column, spec.rearFrom)),
        column: { half: spec.column - INSET, top: spec.frontTo + INSET, bottom: spec.rearFrom - INSET },
        top: spec.top ?? bowY - 6, bowY, sternY, reach: spec.reach, bottom: spec.bottom,
        shell: {
            bounds: box(-spec.reach, spec.top ?? bowY - 6, spec.reach, spec.bottom),
            draw: (pen, ids) => (
                <>
                    {spec.around(pen, ids, deck)}
                    {outline(polygonPath(offsetShape(deck, 6)), pen)}
                </>
            ),
        },
    };
};

export const VEHICLE_HULLS: Record<VehicleMotive, IVehicleHull> = {
    tracked: hullOf("tracked"), wheeled: hullOf("wheeled"), hover: hullOf("hover"), wige: hullOf("wige"),
    vtol: hullOf("vtol"), naval: hullOf("naval"), hydrofoil: hullOf("hydrofoil"), submarine: hullOf("submarine"),
};

// ---- What stands in the middle column. Each is drawn with its top middle at the origin, pointing up the sheet.

/** A turret `width` across and `length` long: a rounded shell, broader at the front, with its mantlet and a gun `barrel`
 * long ahead of it. Its plate is the shell's top. */
export const turret = (width: number, length: number, barrel: number): IPart => {
    const plate = roundedRectShape(-width / 2 + MARGIN, MARGIN, width - MARGIN * 2, length - MARGIN * 2, Math.min(width, length) * 0.3, Math.min(width, length) * 0.16);
    return {
        plates: [plate],
        label: [0, length / 2],
        draw: (pen, ids) => (
            <>
                {outline(`M -9,${-barrel + 14} L 9,${-barrel + 14} L 9,4 L -9,4 Z`, pen)}
                {inner(`M -14,${-barrel} L 14,${-barrel} L 14,${-barrel + 16} L -14,${-barrel + 16} Z`, pen)}
                {joint(`M -34,${Math.max(-barrel + 20, -22)} L 34,${Math.max(-barrel + 20, -22)} L 44,10 L -44,10 Z`, [], pen, ids)}
                {slabbed(plate, pen)}
            </>
        ),
    };
};

/** A VTOL's chin turret: a small round mount under the nose with two short guns. */
export const chinTurret = (radius: number): IPart => {
    const plate = circleShape(0, 0, radius - MARGIN, 24);
    return {
        plates: [plate],
        label: [0, 0],
        draw: (pen) => (
            <>
                {both((side) => outline(`M ${side * 16 - 6},${-radius - 30} L ${side * 16 + 6},${-radius - 30} L ${side * 16 + 6},${-radius + 8} L ${side * 16 - 6},${-radius + 8} Z`, pen))}
                {ring(0, 0, radius, pen)}
                {plateFace(plate, pen)}
                {rivets(plate, pen)}
            </>
        ),
    };
};

/** A rotor's hub seen from above: a notched collar round the mast head, whose top is its plate. */
export const rotorHub = (radius: number): IPart => {
    const plate = circleShape(0, 0, radius - MARGIN, 24);
    return {
        plates: [plate],
        label: [0, 0],
        draw: (pen, ids) => (
            <>
                <circle cx={0} cy={0} r={radius + 8} fill={pen.hatchJoints ? `url(#${ids.hatch})` : PAPER} stroke={INK} strokeWidth={round(pen.contour * 0.8)} />
                {ring(0, 0, radius, pen)}
                {seams(Array.from({ length: 12 }, (_, i) => {
                    const a = i * Math.PI / 6;
                    return `M ${round((radius + 2) * Math.cos(a))},${round((radius + 2) * Math.sin(a))} L ${round((radius + 7) * Math.cos(a))},${round((radius + 7) * Math.sin(a))}`;
                }), pen)}
                {plateFace(plate, pen)}
            </>
        ),
    };
};

/** The deck of a vehicle with nothing in its middle column: an engine grille and two hatches, `half` wide either side. */
export const bareDeck = (half: number, top: number, bottom: number): IDecor => {
    const mid = (top + bottom) / 2, w = round(Math.min(half - 8, 96));
    return {
        bounds: box(-half, top, half, bottom),
        draw: (pen) => (
            <>
                {both((side) => (
                    <>
                        {ring(side * w * 0.5, top + 64, Math.min(34, w * 0.4), pen, pen.contour * 0.7)}
                        {seams([`M ${round(side * w * 0.5 - 14)},${top + 64} L ${round(side * w * 0.5 + 14)},${top + 64}`], pen)}
                    </>
                ))}
                {inner(pill(-w, mid - 20, w, bottom - 40, 10), pen)}
                {seams(ribs(-w + 8, w - 8, mid - 20, bottom - 40, 22), pen)}
            </>
        ),
    };
};
