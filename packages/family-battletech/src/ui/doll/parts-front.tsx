// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import type { BubblePoint, Shape } from "./shape-bubbles";
import {
    accent, aroundPivot, inner, joint, mapPath, outline, pivotMark, piston, plateFace, rivets, round, seam, seams, withBehind,
    type IPart,
} from "./parts-kit";
import { INK, PAPER, type IPenIds, type IPenStyle } from "./pen";

/*
 * The parts for a 'Mech seen from the front: the biped's, the quad's legs and the one-legged and legless bodies' parts,
 * the Land-Air, superheavy and armless swaps, and the pods and wings that go on them. Each part is drawn once, by hand,
 * as curved path data, and carries the plates its bubbles sit on (convex, inside the outline by at least the plate border
 * plus 2), a label point inside it (where damage-transfer arrows start and end) and, for a leg, the foot point where a pod
 * attaches. Parts are written in the biped layout's own units, left side on the left (negative x); `aroundPivot` moves
 * each to its pivot (neck, shoulder, hip), so a layout can place, mirror, scale and turn it. Our own drawing, nothing
 * traced.
 */

/** A leg of the stocky kind: one drawing (see `quadLeg`), stretched and hung from its hip. Left side, the hip is where the
 * leg hangs from. */
interface IQuadLegSet {
    hip: BubblePoint;
    /** Sideways and lengthwise stretch of the leg drawing. */
    kx: number;
    ky: number;
}
/** A quad's legs, the rear ones smaller because they are the far pair and set in under the body with a small gap between
 * them, the front ones beside them under the shoulders; and a monoped's leg, which is broad and hangs directly under the
 * body. */
const QUAD_LEGS: Record<"front" | "rear" | "mono", IQuadLegSet> = {
    front: { hip: [-236, 456], kx: 1, ky: 1 },
    rear: { hip: [-76, 470], kx: 0.8, ky: 0.92 },
    mono: { hip: [0, 490], kx: 1.5, ky: 0.95 },
};

/** Where each part was drawn: a layout places every part it uses at its own pivot, as the biped does. */
export const FRONT_PIVOTS = {
    "head": [0, 214],
    "torso-center": [0, 206],
    "torso-side": [-84, 204],
    "torso-center-rear": [0, 972],
    "torso-side-rear": [-82, 978],
    "arm": [-266, 230],
    "leg": [-118, 520],
    "quad-leg-front": QUAD_LEGS.front.hip,
    "quad-leg-rear": QUAD_LEGS.rear.hip,
    "mono-leg": QUAD_LEGS.mono.hip,
    "torso-center-legless": [0, 206],
    "torso-center-trunk": [0, 206],
    "torso-side-wide": [-84, 204],
} satisfies Record<FrontPartId, BubblePoint>;

export type FrontPartId = "head" | "torso-center" | "torso-side" | "torso-center-rear" | "torso-side-rear" | "arm" | "leg"
    | "quad-leg-front" | "quad-leg-rear" | "mono-leg" | "torso-center-legless" | "torso-center-trunk" | "torso-side-wide";


// ---- Head: a hexagonal helm with a crest, a V-notched visor, a chin guard and a whip antenna at the left temple.

export const HEAD_PLATE: Shape = [[-42, 142], [42, 142], [50, 160], [42, 188], [24, 204], [-24, 204], [-42, 188], [-50, 160]];

export const head = aroundPivot(FRONT_PIVOTS.head, {
    plates: [HEAD_PLATE],
    label: [0, 172],
    draw: (pen, ids) => (
        <>
            {pen.panel > 0 ? <path d="M -50,118 L -60,82" fill="none" stroke={INK} strokeWidth={round(pen.panel * 1.6)} strokeLinecap="round" /> : null}
            {pen.panel > 0 ? <circle cx={-60} cy={79} r={3.5} fill={PAPER} stroke={INK} strokeWidth={pen.panel} /> : null}
            {outline("M -34,100 L -10,92 Q 0,86 10,92 L 34,100 L 54,118 C 58,134 60,148 58,160 L 48,192 L 26,212 L -26,212 L -48,192 L -58,160 C -60,148 -58,134 -54,118 Z", pen)}
            {seam("M -38,108 L 38,108", pen)}
            <path d="M -46,118 L 46,118 L 40,132 L 6,132 L 0,138 L -6,132 L -40,132 Z" fill={pen.hatchJoints ? `url(#${ids.hatch})` : PAPER} stroke={INK} strokeWidth={round(pen.contour * 0.7)} strokeLinejoin="round" />
            {pen.hatchJoints ? null : seams(["M -42,123 L 42,123", "M -40,128 L 40,128"], pen)}
            {plateFace(HEAD_PLATE, pen)}
        </>
    ),
});

// ---- Center torso: a V-shaped chest plate, a ribbed waist ring, the pelvis plate and a skirt plate between the legs.

const CHEST_PLATE: Shape = [[-78, 228], [78, 228], [86, 242], [80, 320], [60, 404], [36, 436], [-36, 436], [-60, 404], [-80, 320], [-86, 242]];
const PELVIS_PLATE: Shape = [[-60, 500], [60, 500], [66, 512], [66, 536], [34, 580], [-34, 580], [-66, 536], [-66, 512]];

export const torsoCenter = aroundPivot(FRONT_PIVOTS["torso-center"], {
    plates: [CHEST_PLATE, PELVIS_PLATE],
    label: [0, 330],
    draw: (pen, ids) => (
        <>
            {outline("M -62,206 L 62,206 L 96,222 C 100,276 92,340 78,390 L 58,446 L 58,478 L 74,494 L 76,540 L 30,604 L -30,604 L -76,540 L -74,494 L -58,478 L -58,446 L -78,390 C -92,340 -100,276 -96,222 Z", pen)}
            {seam("M -58,208 C -44,226 44,226 58,208", pen)}
            {joint("M -56,446 L 56,446 L 58,482 L -58,482 Z", ["M -57,458 L 57,458", "M -57.5,470 L 57.5,470"], pen, ids)}
            {accent("M -30,586 L 30,586 L 22,600 L -22,600 Z", "M -26,593 L 26,593", pen, ids)}
            {plateFace(CHEST_PLATE, pen)}
            {plateFace(PELVIS_PLATE, pen)}
            {rivets(CHEST_PLATE, pen)}
            {rivets(PELVIS_PLATE, pen)}
            {pivotMark([0, 464], pen)}
        </>
    ),
});

// ---- Center torso without a pelvis, for the bodies whose legs hang straight from it: the chest, a bare lower shell where the
// label is printed, and the waist ring, ending where the legs begin. Its points are packed into the chest plate.

const TRUNK_PLATE: Shape = [[-78, 228], [78, 228], [86, 242], [80, 300], [68, 350], [-68, 350], [-80, 300], [-86, 242]];

export const torsoCenterTrunk = aroundPivot(FRONT_PIVOTS["torso-center-trunk"], {
    plates: [TRUNK_PLATE],
    label: [0, 300],
    draw: (pen, ids) => (
        <>
            {outline("M -62,206 L 62,206 L 96,222 C 100,276 92,340 78,390 L 60,440 L 58,488 L -58,488 L -60,440 L -78,390 C -92,340 -100,276 -96,222 Z", pen)}
            {seam("M -58,208 C -44,226 44,226 58,208", pen)}
            {seam("M -72,358 L 72,358", pen)}
            {joint("M -58,456 L 58,456 L 58,488 L -58,488 Z", ["M -58,467 L 58,467", "M -58,478 L 58,478"], pen, ids)}
            {plateFace(TRUNK_PLATE, pen)}
            {rivets(TRUNK_PLATE, pen)}
        </>
    ),
});

// ---- Side torso (left): an angular shell, its top rising to the shoulder under the pauldron, its foot cut away
// above the hip.

const SIDE_PLATE: Shape = [[-104, 212], [-150, 196], [-196, 196], [-202, 250], [-202, 380], [-190, 428], [-162, 452], [-104, 456], [-96, 420]];

export const torsoSide = aroundPivot(FRONT_PIVOTS["torso-side"], {
    plates: [SIDE_PLATE],
    label: [-150, 330],
    draw: (pen) => (
        <>
            {outline("M -84,198 L -152,178 C -180,172 -206,178 -222,192 L -230,268 C -232,330 -222,392 -204,440 L -170,470 L -96,476 L -70,446 Z", pen)}
            {seam("M -220,326 C -220,368 -214,402 -202,428", pen)}
            {plateFace(SIDE_PLATE, pen)}
            {rivets(SIDE_PLATE, pen)}
        </>
    ),
});

// ---- Side torso for a quad: the same shell with a shelf out over the front leg's hip, so that the leg hangs from the torso.

const SHELF_PLATE: Shape = [[-208, 438], [-286, 452], [-292, 470], [-208, 474]];

export const torsoSideWide = aroundPivot(FRONT_PIVOTS["torso-side-wide"], {
    plates: [SIDE_PLATE, SHELF_PLATE],
    label: [-150, 330],
    draw: (pen) => (
        <>
            {outline("M -84,198 L -152,178 C -180,172 -206,178 -222,192 L -230,268 C -232,330 -226,392 -218,424 L -290,440 C -302,446 -304,466 -296,482 L -96,482 L -70,446 Z", pen)}
            {seam("M -220,326 C -220,368 -216,400 -210,424", pen)}
            {plateFace(SIDE_PLATE, pen)}
            {plateFace(SHELF_PLATE, pen)}
            {rivets(SIDE_PLATE, pen)}
            {rivets(SHELF_PLATE, pen)}
        </>
    ),
});

// ---- Arm (left): a layered pauldron over a banded upper arm, a ribbed elbow with its piston, a heavy forearm
// tapering to the wrist, and a fist.

export const PAULDRON_PLATE: Shape = [[-228, 204], [-258, 190], [-296, 190], [-322, 204], [-330, 230], [-328, 288], [-298, 300], [-232, 296]];
const FOREARM_PLATE: Shape = [[-242, 452], [-306, 452], [-316, 500], [-314, 592], [-300, 624], [-256, 626], [-244, 596], [-238, 500]];

const arm = aroundPivot(FRONT_PIVOTS.arm, {
    plates: [PAULDRON_PLATE, FOREARM_PLATE],
    label: [-268, 350],
    draw: (pen, ids) => (
        <>
            {outline("M -240,298 C -238,330 -240,366 -244,402 L -292,402 C -296,366 -298,330 -296,298 Z", pen)}
            {seams(["M -250,330 L -288,330", "M -252,366 L -290,366"], pen)}
            {joint("M -236,396 L -300,396 C -308,408 -308,428 -300,440 L -236,440 C -228,428 -228,408 -236,396 Z", ["M -238,407 L -300,407", "M -234,418 L -304,418", "M -238,429 L -300,429"], pen, ids)}
            {outline("M -250,638 L -306,638 L -312,668 L -300,700 L -258,700 L -246,670 Z", pen)}
            {seams(["M -309,656 L -248,656", "M -308,679 L -251,679", "M -252,646 L -238,660 L -244,684"], pen)}
            {outline("M -228,436 L -310,436 C -326,470 -330,540 -322,600 L -306,640 L -250,642 C -236,600 -226,520 -228,436 Z", pen)}
            {plateFace(FOREARM_PLATE, pen)}
            {rivets(FOREARM_PLATE, pen)}
            {piston([-302, 326], [-322, 466], pen)}
            {outline("M -212,206 C -218,178 -252,164 -290,166 C -322,168 -344,190 -346,222 L -342,296 C -330,310 -306,316 -284,314 L -222,308 C -212,282 -208,242 -212,206 Z", pen)}
            {seam("M -216,210 C -226,188 -258,178 -292,179 C -320,181 -336,200 -339,226", pen)}
            {plateFace(PAULDRON_PLATE, pen)}
            {rivets(PAULDRON_PLATE, pen)}
            {pivotMark([-268, 418], pen)}
        </>
    ),
});

// ---- Leg (left): a ribbed hip, a tapered thigh, a pointed knee guard over the knee, a heavy calf, the ankle with its
// piston and a broad, split-toed foot.

const THIGH_PLATE: Shape = [[-78, 512], [-170, 508], [-180, 550], [-176, 640], [-166, 688], [-92, 690], [-80, 640], [-74, 570]];
const KNEE_PLATE: Shape = [[-112, 698], [-160, 698], [-170, 712], [-168, 734], [-148, 752], [-122, 752], [-102, 734], [-102, 712]];
const SHIN_PLATE: Shape = [[-100, 782], [-170, 780], [-184, 806], [-190, 866], [-94, 868], [-90, 822]];

const leg = aroundPivot(FRONT_PIVOTS.leg, {
    plates: [THIGH_PLATE, KNEE_PLATE, SHIN_PLATE],
    label: [-124, 600],
    foot: [-145, 930],
    footDir: [0, 1],
    footWidth: 182,
    draw: (pen, ids) => (
        <>
            {joint("M -72,466 L -178,460 C -190,472 -192,490 -186,502 L -68,506 C -60,492 -62,478 -72,466 Z", ["M -72,478 L -186,474", "M -68,491 L -189,489"], pen, ids)}
            {joint("M -84,696 L -182,692 L -186,766 L -86,770 Z", ["M -84,720 L -183,716", "M -85,744 L -184,741"], pen, ids)}
            {outline("M -64,500 C -96,488 -156,486 -184,500 C -196,556 -194,640 -180,700 L -82,706 C -70,640 -60,564 -64,500 Z", pen)}
            {plateFace(THIGH_PLATE, pen)}
            {rivets(THIGH_PLATE, pen)}
            {joint("M -96,878 L -190,876 L -194,898 L -94,900 Z", ["M -95,888 L -192,886"], pen, ids)}
            {outline("M -88,756 L -180,752 C -198,790 -206,840 -204,880 L -82,884 C -76,840 -78,790 -88,756 Z", pen)}
            {plateFace(SHIN_PLATE, pen)}
            {rivets(SHIN_PLATE, pen)}
            {outline("M -98,690 C -120,680 -152,680 -174,690 L -182,736 C -168,758 -148,768 -134,770 C -118,768 -98,758 -88,740 Z", pen)}
            {plateFace(KNEE_PLATE, pen)}
            {outline("M -96,890 L -190,888 L -226,912 L -236,940 L -54,940 L -62,914 Z", pen)}
            {seams(["M -59,926 L -231,926", "M -118,891 L -112,926", "M -166,889 L -174,926"], pen)}
            {piston([-194, 600], [-206, 790], pen)}
            {piston([-206, 830], [-224, 918], pen)}
            {pivotMark([-122, 484], pen)}
            {pivotMark([-142, 888], pen)}
        </>
    ),
});

// ---- Quad leg (left): a short, heavy walking leg seen from the front. A ribbed hip, a broad thigh, a knee guard, a
// flared shin and a wide foot, drawn once around its own center line with the hip at the origin, then stretched and
// moved to a corner of the body by `quadLeg`. Distances below are in those local units.

const QUAD_LEG = {
    /** The hip joint is broader on the inside, where it tucks under the torso. */
    hip: "M -60,-18 L 70,-18 C 78,-8 78,8 70,22 L -64,22 C -72,8 -70,-8 -60,-18 Z",
    hipRibs: ["M -62,-5 L 72,-5", "M -64,8 L 72,8"],
    thigh: "M -62,18 C -68,76 -66,146 -58,190 L 58,190 C 66,146 68,76 62,18 Z",
    thighPlate: [[-52, 34], [52, 34], [60, 70], [58, 130], [50, 162], [-50, 162], [-58, 130], [-60, 70]] as Shape,
    kneeJoint: "M -58,184 L 58,184 L 64,254 L -64,254 Z",
    kneeRibs: ["M -60,208 L 60,208", "M -62,232 L 62,232"],
    knee: "M -60,180 C -40,174 40,174 60,180 L 68,226 C 56,252 30,262 0,264 C -30,262 -56,252 -68,226 Z",
    kneePlate: [[-42, 192], [42, 192], [57, 206], [57, 224], [40, 244], [-40, 244], [-57, 224], [-57, 206]] as Shape,
    shin: "M -56,244 L 56,244 C 66,282 72,330 70,370 L -70,370 C -72,330 -66,282 -56,244 Z",
    shinPlate: [[-50, 274], [50, 274], [62, 302], [62, 348], [56, 358], [-56, 358], [-62, 348], [-62, 302]] as Shape,
    ankle: "M -62,368 L 62,368 L 66,390 L -66,390 Z",
    ankleRibs: ["M -63,379 L 63,379"],
    foot: "M -58,384 L 58,384 L 72,408 L 76,434 L -76,434 L -72,408 Z",
    footSeams: ["M -73,422 L 73,422", "M -28,385 L -24,422", "M 28,385 L 24,422"],
    pistons: [[[-70, 60], [-76, 186]], [[-70, 270], [-78, 360]]] as [BubblePoint, BubblePoint][],
    label: [0, 100] as BubblePoint,
    footPoint: [0, 430] as BubblePoint,
};

/** What a leg of this kind may add: drawing behind it or over it (in layout units), and a piston on each side instead of one. */
interface ILegExtras {
    behind?: (pen: IPenStyle) => JSX.Element | null;
    over?: (pen: IPenStyle, at: (point: BubblePoint) => BubblePoint) => JSX.Element | null;
    bothSides?: boolean;
}

const quadLeg = ({ hip, kx, ky }: IQuadLegSet, extras: ILegExtras = {}): IPart => {
    const at = ([x, y]: BubblePoint): BubblePoint => [hip[0] + x * kx, hip[1] + y * ky];
    const path = (d: string): string => mapPath(d, at);
    const plate = (shape: Shape): Shape => shape.map(at);
    const thighPlate = plate(QUAD_LEG.thighPlate), kneePlate = plate(QUAD_LEG.kneePlate), shinPlate = plate(QUAD_LEG.shinPlate);
    return aroundPivot(hip, {
        plates: [thighPlate, kneePlate, shinPlate],
        label: at(QUAD_LEG.label),
        foot: at(QUAD_LEG.footPoint),
        footDir: [0, 1],
        footWidth: 152 * kx,
        draw: (pen, ids) => (
            <>
                {extras.behind?.(pen)}
                {joint(path(QUAD_LEG.hip), QUAD_LEG.hipRibs.map(path), pen, ids)}
                {outline(path(QUAD_LEG.thigh), pen)}
                {plateFace(thighPlate, pen)}
                {rivets(thighPlate, pen)}
                {joint(path(QUAD_LEG.ankle), QUAD_LEG.ankleRibs.map(path), pen, ids)}
                {outline(path(QUAD_LEG.shin), pen)}
                {plateFace(shinPlate, pen)}
                {rivets(shinPlate, pen)}
                {joint(path(QUAD_LEG.kneeJoint), QUAD_LEG.kneeRibs.map(path), pen, ids)}
                {outline(path(QUAD_LEG.knee), pen)}
                {plateFace(kneePlate, pen)}
                {outline(path(QUAD_LEG.foot), pen)}
                {seams(QUAD_LEG.footSeams.map(path), pen)}
                {QUAD_LEG.pistons.map(([a, b], i) => <React.Fragment key={i}>{piston(at(a), at(b), pen)}</React.Fragment>)}
                {extras.bothSides ? QUAD_LEG.pistons.map(([[ax, ay], [bx, by]], i) => (
                    <React.Fragment key={`r${i}`}>{piston(at([-ax, ay]), at([-bx, by]), pen)}</React.Fragment>
                )) : null}
                {extras.over?.(pen, at)}
                {pivotMark(hip, pen)}
                {pivotMark(at([0, 392]), pen)}
            </>
        ),
    });
};

// ---- Rear torsos: the back of the chest above a finned heat exchanger, and the back of each side torso.

const REAR_CENTER_PLATE: Shape = [[-70, 990], [70, 990], [80, 1004], [76, 1090], [60, 1120], [34, 1134], [-34, 1134], [-60, 1120], [-76, 1090], [-80, 1004]];
const REAR_SIDE_PLATE: Shape = [[-100, 990], [-146, 984], [-180, 994], [-190, 1020], [-190, 1090], [-176, 1124], [-140, 1134], [-102, 1134], [-96, 1060]];

const torsoCenterRear = aroundPivot(FRONT_PIVOTS["torso-center-rear"], {
    plates: [REAR_CENTER_PLATE],
    label: [0, 1060],
    draw: (pen) => (
        <>
            {outline("M -62,972 L 62,972 L 92,986 C 96,1030 92,1080 80,1116 L 56,1146 L 26,1160 L -26,1160 L -56,1146 L -80,1116 C -92,1080 -96,1030 -92,986 Z", pen)}
            {inner("M -40,1140 L 40,1140 L 30,1154 L -30,1154 Z", pen)}
            {seams(["M -24,1141 L -20,1153", "M -8,1141 L -7,1153", "M 8,1141 L 7,1153", "M 24,1141 L 20,1153"], pen)}
            {plateFace(REAR_CENTER_PLATE, pen)}
            {rivets(REAR_CENTER_PLATE, pen)}
        </>
    ),
});

const torsoSideRear = aroundPivot(FRONT_PIVOTS["torso-side-rear"], {
    plates: [REAR_SIDE_PLATE],
    label: [-150, 1060],
    draw: (pen) => (
        <>
            {outline("M -198,1014 L -216,1012 L -216,1020 L -198,1022 Z M -198,1036 L -218,1034 L -218,1042 L -198,1044 Z M -198,1058 L -218,1058 L -218,1066 L -198,1066 Z M -198,1080 L -216,1082 L -216,1090 L -198,1088 Z", pen)}
            {outline("M -80,978 L -150,968 C -172,968 -190,976 -202,988 L -206,1060 C -204,1098 -196,1124 -180,1138 L -140,1150 L -82,1150 Z", pen)}
            {plateFace(REAR_SIDE_PLATE, pen)}
            {rivets(REAR_SIDE_PLATE, pen)}
        </>
    ),
});


/** A part with `before` drawn behind it, written in layout units (the part itself is drawn around its pivot). */
const behindIn = (pivot: BubblePoint, part: IPart, before: (pen: IPenStyle, ids: IPenIds) => JSX.Element): IPart =>
    withBehind(part, (pen, ids) => <g transform={`translate(${-pivot[0]} ${-pivot[1]})`}>{before(pen, ids)}</g>);

/** A coil spring: a zigzag between two heights, `half` either side of x. */
const spring = (x: number, top: number, bottom: number, half: number, coils: number, pen: IPenStyle): JSX.Element | null => {
    if (pen.panel <= 0) {
        return null;
    }
    const steps = coils * 2;
    const points = Array.from({ length: steps + 1 }, (_, i) => `${round(x + (i === 0 || i === steps ? 0 : i % 2 ? half : -half))},${round(top + (bottom - top) * i / steps)}`);
    return <path d={`M ${points.join(" L ")}`} fill="none" stroke={INK} strokeWidth={round(pen.panel * 1.8)} strokeLinejoin="round" strokeLinecap="round" />;
};

// ---- A monoped's leg: the stocky leg drawn broader, hanging straight under the body, with a heavy ram each side and a coil
// spring at each heel. (A tripod's center leg is the side leg's own drawing, set between the two.)

const monoLeg = quadLeg(QUAD_LEGS.mono, {
    bothSides: true,
    over: (pen, at) => (
        <>
            {[-1, 1].map((side) => (
                <React.Fragment key={side}>
                    {piston(at([side * 70, 40]), at([side * 76, 176]), pen, 9)}
                    {spring(at([side * 88, 0])[0], at([0, 292])[1], at([0, 384])[1], 6, 5, pen)}
                </React.Fragment>
            ))}
        </>
    ),
});

// ---- A legless 'Mech's center torso: the center torso with a thruster skirt hung under it, a flared bell with a ribbed
// ring and three nozzles. The skirt has no armor of its own.

const torsoCenterLegless = behindIn(FRONT_PIVOTS["torso-center-legless"], torsoCenter, (pen, ids) => (
    <>
        {outline("M -44,590 L 44,590 L 98,684 L 90,706 L -90,706 L -98,684 Z", pen)}
        {joint("M -84,646 L 84,646 L 94,672 L -94,672 Z", ["M -88,654 L 88,654", "M -91,663 L 91,663"], pen, ids)}
        {outline("M -80,706 L -34,706 L -44,744 L -70,744 Z M -24,706 L 24,706 L 20,750 L -20,750 Z M 34,706 L 80,706 L 70,744 L 44,744 Z", pen)}
        {seams(["M -56,712 L -56,740", "M 0,712 L 0,744", "M 56,712 L 56,740"], pen)}
    </>
));

export const FRONT_PARTS: Record<FrontPartId, IPart> = {
    "head": head,
    "torso-center": torsoCenter,
    "torso-side": torsoSide,
    "torso-center-rear": torsoCenterRear,
    "torso-side-rear": torsoSideRear,
    "arm": arm,
    "leg": leg,
    "quad-leg-front": quadLeg(QUAD_LEGS.front),
    "quad-leg-rear": quadLeg(QUAD_LEGS.rear),
    "mono-leg": monoLeg,
    "torso-center-legless": torsoCenterLegless,
    "torso-center-trunk": torsoCenterTrunk,
    "torso-side-wide": torsoSideWide,
};
