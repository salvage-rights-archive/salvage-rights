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
    | "hull-aft-center" | "hull-aft-side" | "top-leg" | "star-turret" | "star-ring" | "star-face" | "top-arm";

/** Each is drawn around its own origin, which a layout moves to where it goes. */
export const TOP_PIVOTS: Record<TopPartId, BubblePoint> = {
    "hull-head": [0, 0], "hull-center-2": [0, 0], "hull-center-3": [0, 0], "hull-center-4": [0, 0],
    "hull-flank-2": [0, 0], "hull-flank-3": [0, 0], "hull-flank-4": [0, 0],
    "hull-aft-center": [0, 0], "hull-aft-side": [0, 0], "top-leg": [0, 0], "star-turret": [0, 0], "star-ring": [0, 0], "star-face": [0, 0], "top-arm": [0, 0],
};

/** The top of the hull's first row of plates, down the sheet. */
export const HULL_TOP = 230;

/** Row pitch down the hull (one leg pair to a row), the gap between the rows' plates, and the width of the outline margin. */
export const ROW = 150;
const GAP = 20;
const MARGIN = 9;

/** The head sits just above the spine's first plate. */
export const HEAD_CENTER = -52;
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

// ---- Spine: a plate for each row of legs with a ribbed joint between rows.

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

// ---- The five-legged 'Mech, a starfish: a turret head at the middle, the center torso as a ring of five plates around it, a
// face torso on each of the pentagon's five sides, and a leg radiating from each face torso. Drawn pointing at one face
// (the side facing straight up); a layout turns each copy to its own face. Apothems, from the middle, in layout units.

const TAN36 = Math.tan(36 * Math.PI / 180);
/** The middle of the star, in layout units. */
export const STAR_AT: BubblePoint = [0, 440];
export const STAR_RING = [48, 110] as const;
export const STAR_FACE = [118, 206] as const;

/** The trapezoid between two apothems on the face that looks straight up. */
const faceTrapezoid = (near: number, far: number): Shape =>
    [[-far * TAN36, -far], [far * TAN36, -far], [near * TAN36, -near], [-near * TAN36, -near]];

const turned = (shape: Shape, degrees: number): Shape => {
    const c = Math.cos(degrees * Math.PI / 180), s = Math.sin(degrees * Math.PI / 180);
    return shape.map(([x, y]): BubblePoint => [x * c - y * s, x * s + y * c]);
};

const TURRET_PLATE: Shape = Array.from({ length: 20 }, (_, i): BubblePoint => [27 * Math.cos(i * Math.PI / 10), 27 * Math.sin(i * Math.PI / 10)]);

const starTurret: IPart = {
    plates: [TURRET_PLATE],
    label: [0, 0],
    draw: (pen, ids) => (
        <>
            <circle cx={0} cy={0} r={45} fill={pen.hatchJoints ? `url(#${ids.hatch})` : PAPER} stroke={INK} strokeWidth={round(pen.contour * 0.8)} />
            <circle cx={0} cy={0} r={37} fill={PAPER} stroke={INK} strokeWidth={pen.contour} />
            {seams(Array.from({ length: 12 }, (_, i) => {
                const a = i * Math.PI / 6;
                return `M ${round(39 * Math.cos(a))},${round(39 * Math.sin(a))} L ${round(44 * Math.cos(a))},${round(44 * Math.sin(a))}`;
            }), pen)}
            {plateFace(TURRET_PLATE, pen)}
            {rivets(TURRET_PLATE, pen)}
            {pen.panel > 0 ? <path d="M 0,-43 L 5,-36 L -5,-36 Z" fill={INK} stroke={INK} strokeWidth={1} strokeLinejoin="round" /> : null}
        </>
    ),
};

const RING_PLATES: Shape[] = [-36, 36, 108, 180, 252].map((turn) => turned(offsetShape(faceTrapezoid(...STAR_RING), -12), turn));

const starRing: IPart = {
    plates: RING_PLATES,
    label: [0, -80],
    draw: (pen) => (
        <>
            {RING_PLATES.map((plate, i) => <React.Fragment key={i}>{slabbed(plate, pen)}</React.Fragment>)}
        </>
    ),
};

const FACE_PLATE: Shape = offsetShape(faceTrapezoid(...STAR_FACE), -14);

const starFace: IPart = {
    plates: [FACE_PLATE],
    label: [0, -158],
    draw: (pen) => slabbed(FACE_PLATE, pen),
};


// ---- Arm seen from above, pointing forward: a shoulder ball, an upper arm, an elbow ball, a forearm and a hand. Drawn pointing
// straight up from the shoulder; a layout turns, scales and mirrors it.

const UPPER_ARM: Shape = bar([0, -10], [-4, -118], 40, 38, 10);
const FOREARM: Shape = bar([-6, -140], [-12, -248], 38, 36, 10);
const HAND: Shape = bar([-12, -254], [-14, -284], 32, 46, 8);

const topArm: IPart = {
    plates: [UPPER_ARM, FOREARM],
    label: [-4, -90],
    tip: [-14, -284],
    draw: (pen, ids) => (
        <>
            {joint(polygonPath(octagon(0, 0, 32)), [], pen, ids)}
            {slabbed(UPPER_ARM, pen)}
            {slabbed(FOREARM, pen)}
            {joint(polygonPath(octagon(-5, -129, 26)), [], pen, ids)}
            {outline(polygonPath(HAND), pen)}
            {seams(["M -26,-262 L -26,-284", "M -14,-262 L -14,-284", "M -2,-262 L -2,-284"], pen)}
        </>
    ),
};

export const TOP_PARTS: Record<TopPartId, IPart> = {
    "hull-head": hullHead,
    "hull-center-2": spine(2), "hull-center-3": spine(3), "hull-center-4": spine(4),
    "hull-flank-2": flank(2), "hull-flank-3": flank(3), "hull-flank-4": flank(4),
    "hull-aft-center": aftCenter,
    "hull-aft-side": aftSide,
    "top-leg": topLeg,
    "star-turret": starTurret,
    "star-ring": starRing,
    "star-face": starFace,
    "top-arm": topArm,
};

/** A track unit under a foot seen from above, centered on the foot point and lying along the way the leg runs out of it. */
export const topPod = ([px, py]: BubblePoint, [dx, dy]: BubblePoint): IDecor => {
    // Centered a little beyond the foot point, so that it covers the pad and not the shin.
    const fx = px + dx * 24, fy = py + dy * 24;
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
