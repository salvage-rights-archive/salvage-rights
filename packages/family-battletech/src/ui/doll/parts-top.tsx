// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React from "react";
import { INK, PAPER } from "./pen";
import type { BubblePoint, Shape } from "./shape-bubbles";
import {
    aroundPivot, bar, inner, joint, octagon, offsetShape, outline, plateFace, polygonPath, rivets, round, seams, slab, type IDecor, type IPart,
} from "./parts-kit";

/*
 * The parts for a 'Mech seen from above, for five, six and eight legs, where three or four legs a side could not be read
 * from the front: a hull of a head plate, a center spine and two side flanks, with the rear armor as plates on the aft hull,
 * and one angled leg (hip, thigh, knee, shin, foot pad) that every leg of every layout is a copy of, turned and mirrored.
 * The plates are computed from a few numbers and each outline is its plate grown by a margin, so a plate always lies inside
 * its outline. Left side on the left; the front of the 'Mech is the top of the sheet. Our own drawing, nothing traced.
 */

export type TopPartId =
    | "hull-head" | "hull-center-2" | "hull-center-3" | "hull-center-4" | "hull-flank-2" | "hull-flank-3" | "hull-flank-4"
    | "hull-aft-center" | "hull-aft-side" | "top-leg";

/** Each is drawn around its own origin, which a layout moves to where it goes. */
export const TOP_PIVOTS: Record<TopPartId, BubblePoint> = {
    "hull-head": [0, 0], "hull-center-2": [0, 0], "hull-center-3": [0, 0], "hull-center-4": [0, 0],
    "hull-flank-2": [0, 0], "hull-flank-3": [0, 0], "hull-flank-4": [0, 0],
    "hull-aft-center": [0, 0], "hull-aft-side": [0, 0], "top-leg": [0, 0],
};

/** Row pitch down the hull (one leg pair to a row), the gap between the rows' plates, and the width of the outline margin. */
export const ROW = 150;
const GAP = 20;
const MARGIN = 9;

/** The height of the deck above the spine's first plate, where the center torso's label is printed. */
export const BAY = 116;
export const HEAD_CENTER = -BAY - 44;
/** The hull's flank edge, where each hip joint sits. */
export const HIP_X = -170;

/** A plate drawn with its outline, its rivets and its border. */
const slabbed = (plate: Shape, pen: Parameters<IPart["draw"]>[0]): React.JSX.Element => (
    <>
        {outline(polygonPath(offsetShape(plate, MARGIN)), pen)}
        {plateFace(plate, pen)}
        {rivets(plate, pen)}
    </>
);

// ---- Head: a faceted canopy seen from above, with a visor slit and an antenna.

const HEAD_PLATE: Shape = [[-46, -30], [46, -30], [58, -10], [54, 14], [30, 30], [-30, 30], [-54, 14], [-58, -10]];

const hullHead: IPart = {
    plates: [HEAD_PLATE],
    label: [0, 0],
    draw: (pen) => (
        <>
            {pen.panel > 0 ? <path d="M -52,-34 L -64,-58" fill="none" stroke="rgb(0,0,0)" strokeWidth={pen.panel * 1.6} strokeLinecap="round" /> : null}
            {slabbed(HEAD_PLATE, pen)}
            {seams(["M -40,-40 L 40,-40", "M -30,38 L 30,38"], pen)}
        </>
    ),
};

// ---- Spine: a deck for the label, then a plate for each row of legs with a ribbed joint between rows.

const rowTop = (i: number): number => i * ROW;
const rowBottom = (i: number): number => (i + 1) * ROW - GAP;

const spine = (rows: number): IPart => {
    const plates = Array.from({ length: rows }, (_, i): Shape => slab(-56, rowTop(i), 56, rowBottom(i), 14));
    return {
        plates,
        label: [0, rowTop(0) + 60],
        draw: (pen, ids) => (
            <>
                {Array.from({ length: rows - 1 }, (_, i) => (
                    <React.Fragment key={i}>{joint(polygonPath([[-46, rowBottom(i) - 4], [46, rowBottom(i) - 4], [46, rowTop(i + 1) + 4], [-46, rowTop(i + 1) + 4]]), [`M -46,${rowBottom(i) + GAP / 2} L 46,${rowBottom(i) + GAP / 2}`], pen, ids)}</React.Fragment>
                ))}
                {outline(polygonPath(slab(-70, -BAY, 70, -8, 16)), pen)}
                {joint(polygonPath([[-46, -12], [46, -12], [46, rowTop(0) + 4], [-46, rowTop(0) + 4]]), [], pen, ids)}
                {plates.map((plate, i) => <React.Fragment key={i}>{slabbed(plate, pen)}</React.Fragment>)}
            </>
        ),
    };
};

// ---- Flank (left): a plate for each row of legs along the spine, with a rail along the outer edge.

const flank = (rows: number): IPart => {
    const plates = Array.from({ length: rows }, (_, i): Shape => slab(-158, rowTop(i), -84, rowBottom(i), 14));
    return {
        plates,
        label: [-121, rowTop(0) + 60],
        draw: (pen, ids) => (
            <>
                {Array.from({ length: rows - 1 }, (_, i) => (
                    <React.Fragment key={i}>{joint(polygonPath([[-150, rowBottom(i) - 4], [-92, rowBottom(i) - 4], [-92, rowTop(i + 1) + 4], [-150, rowTop(i + 1) + 4]]), [], pen, ids)}</React.Fragment>
                ))}
                {plates.map((plate, i) => <React.Fragment key={i}>{slabbed(plate, pen)}</React.Fragment>)}
                {seams([`M -172,${rowTop(0) + 10} L -172,${rowBottom(rows - 1) - 10}`], pen)}
            </>
        ),
    };
};

// ---- Aft hull: the stern seen from behind, the rear armor plates, each with its vents.

const AFT_CENTER_PLATE = slab(-72, 0, 72, 120, 18);
const AFT_SIDE_PLATE = slab(-60, 0, 60, 100, 16);

const aftCenter: IPart = {
    plates: [AFT_CENTER_PLATE],
    label: [0, 60],
    draw: (pen) => (
        <>
            {slabbed(AFT_CENTER_PLATE, pen)}
            {inner("M -40,132 L 40,132 L 30,146 L -30,146 Z", pen)}
            {seams(["M -24,133 L -20,145", "M -8,133 L -7,145", "M 8,133 L 7,145", "M 24,133 L 20,145"], pen)}
        </>
    ),
};

const aftSide: IPart = {
    plates: [AFT_SIDE_PLATE],
    label: [0, 50],
    draw: (pen) => (
        <>
            {outline("M -70,24 L -86,22 L -86,30 L -70,32 Z M -70,48 L -88,46 L -88,54 L -70,56 Z M -70,72 L -86,72 L -86,80 L -70,80 Z", pen)}
            {slabbed(AFT_SIDE_PLATE, pen)}
        </>
    ),
};

// ---- Leg (left, pointing out to the left): a hip ball, a thigh angled slightly forward, a knee ball, a shin angled back
// and a broad foot pad. The foot point is the pad's middle and `footDir` the way the shin runs out of it.

const THIGH: Shape = bar([-24, 0], [-124, -23], 34, 32, 8);
const SHIN: Shape = bar([-166, -14], [-226, 46], 28, 24, 8);
const SHIN_DIR: BubblePoint = [-0.707, 0.707];
const PAD_FROM: BubblePoint = [-226 + SHIN_DIR[0] * 6, 46 + SHIN_DIR[1] * 6];
const PAD_TO: BubblePoint = [-226 + SHIN_DIR[0] * 46, 46 + SHIN_DIR[1] * 46];
const PAD: Shape = bar(PAD_FROM, PAD_TO, 32, 46, 10);

const topLeg: IPart = aroundPivot([0, 0], {
    plates: [THIGH, SHIN],
    label: [-76, -12],
    foot: [(PAD_FROM[0] + PAD_TO[0]) / 2, (PAD_FROM[1] + PAD_TO[1]) / 2],
    footDir: SHIN_DIR,
    footWidth: 92,
    draw: (pen, ids) => (
        <>
            {joint(polygonPath(octagon(0, 0, 30)), [], pen, ids)}
            {slabbed(THIGH, pen)}
            {slabbed(SHIN, pen)}
            {joint(polygonPath(octagon(-146, -26, 21)), [], pen, ids)}
            {outline(polygonPath(PAD), pen)}
            {seams([`M ${PAD_FROM[0]},${PAD_FROM[1]} L ${PAD_TO[0]},${PAD_TO[1]}`, `M ${PAD_FROM[0] + 14},${PAD_FROM[1] + 14} L ${PAD_TO[0] + 20},${PAD_TO[1] + 20}`], pen)}
        </>
    ),
});

export const TOP_PARTS: Record<TopPartId, IPart> = {
    "hull-head": hullHead,
    "hull-center-2": spine(2), "hull-center-3": spine(3), "hull-center-4": spine(4),
    "hull-flank-2": flank(2), "hull-flank-3": flank(3), "hull-flank-4": flank(4),
    "hull-aft-center": aftCenter,
    "hull-aft-side": aftSide,
    "top-leg": topLeg,
};

/** A track unit under a foot seen from above, centered on the foot point and lying along the way the leg runs out of it. */
export const topPod = ([fx, fy]: BubblePoint, [dx, dy]: BubblePoint): IDecor => {
    const angle = Math.atan2(-dx, dy) * 180 / Math.PI, length = 104, width = 50, r = width / 2;
    const turn = angle * Math.PI / 180;
    const corners: Shape = ([[-r, -length / 2], [r, -length / 2], [r, length / 2], [-r, length / 2]] as BubblePoint[])
        .map(([x, y]): BubblePoint => [fx + x * Math.cos(turn) - y * Math.sin(turn), fy + x * Math.sin(turn) + y * Math.cos(turn)]);
    const stadium = (w: number, l: number): string =>
        `M ${-w / 2},${-l / 2 + w / 2} A ${w / 2},${w / 2} 0 0 1 ${w / 2},${-l / 2 + w / 2} L ${w / 2},${l / 2 - w / 2} A ${w / 2},${w / 2} 0 0 1 ${-w / 2},${l / 2 - w / 2} Z`;
    return {
        bounds: corners,
        draw: (pen) => (
            <g transform={`translate(${fx} ${fy}) rotate(${round(angle)})`}>
                <path d={stadium(width, length)} fill={PAPER} stroke={INK} strokeWidth={pen.contour} strokeLinejoin="round" />
                {pen.panel > 0 ? <path d={stadium(width - 14, length - 14)} fill="none" stroke={INK} strokeWidth={round(pen.panel * 2.4)} strokeDasharray="4 5" /> : null}
                {[-30, 0, 30].map((y) => <circle key={y} cx={0} cy={y} r={9} fill={PAPER} stroke={INK} strokeWidth={round(Math.max(pen.panel, pen.contour * 0.5))} />)}
            </g>
        ),
    };
};
