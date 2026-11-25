// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import { cornerAt, shapePoints, type BubblePoint, type Shape } from "./shape-bubbles";
import { INK, PAPER, type IPenIds, type IPenStyle } from "./pen";

/*
 * The 'Mech parts kit. Each part is drawn once, by hand, as curved path data, and carries the plates its bubbles sit
 * on (convex, inside the outline by at least the plate border plus 2), a label point inside it (where damage-transfer
 * arrows start and end) and, for a leg, the foot point where a track pod attaches. Parts are written in the biped
 * layout's own units, left side on the left (negative x); `aroundPivot` moves each to its pivot (neck, shoulder,
 * hip), so a layout can place, mirror, scale and turn it. Our own drawing, nothing traced.
 */

export type PartId = "head" | "torso-center" | "torso-side" | "torso-center-rear" | "torso-side-rear" | "arm" | "leg";

export interface IPart {
    draw(pen: IPenStyle, ids: IPenIds): JSX.Element;
    plates: Shape[];
    label: BubblePoint;
    foot?: BubblePoint;
}

const round = (n: number): number => Math.round(n * 10) / 10;

const outline = (d: string, pen: IPenStyle): JSX.Element =>
    <path d={d} fill={PAPER} stroke={INK} strokeWidth={pen.contour} strokeLinejoin="round" strokeLinecap="round" />;

/** A part drawn inside a location, with a lighter line than the location's outline. */
const inner = (d: string, pen: IPenStyle): JSX.Element =>
    <path d={d} fill={PAPER} stroke={INK} strokeWidth={round(pen.contour * 0.7)} strokeLinejoin="round" strokeLinecap="round" />;

const plateFace = (shape: Shape, pen: IPenStyle): JSX.Element | null => pen.plateBorder > 0
    ? <polygon points={shapePoints(shape)} fill={PAPER} stroke={INK} strokeWidth={pen.plateBorder} strokeLinejoin="round" />
    : null;

const seam = (d: string, pen: IPenStyle, key?: string): JSX.Element | null => pen.panel > 0
    ? <path key={key} d={d} fill="none" stroke={INK} strokeWidth={pen.panel} strokeLinecap="round" strokeDasharray={pen.constructionLines ? "7 4" : undefined} />
    : null;

const seams = (list: string[], pen: IPenStyle): JSX.Element => <g>{list.map((d, i) => seam(d, pen, `s${i}`))}</g>;

const signedArea = (shape: Shape): number => shape.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = cornerAt(shape, i + 1);
    return sum + x1 * y2 - x2 * y1;
}, 0) / 2;

/** Rivets just outside a plate, along each edge long enough to carry them, none on the corners. */
const rivets = (shape: Shape, pen: IPenStyle): JSX.Element | null => {
    if (pen.rivetRadius <= 0) {
        return null;
    }
    const turn = Math.sign(signedArea(shape));
    const gap = pen.plateBorder / 2 + pen.rivetRadius + 2.5;
    const dots: BubblePoint[] = [];
    shape.forEach(([ax, ay], i) => {
        const [bx, by] = cornerAt(shape, i + 1);
        const length = Math.hypot(bx - ax, by - ay);
        if (length < pen.rivetPitch * 1.5) {
            return;
        }
        const nx = turn * (by - ay) / length, ny = -turn * (bx - ax) / length;
        const count = Math.round(length / pen.rivetPitch);
        for (let k = 1; k < count; k++) {
            const t = k / count;
            dots.push([ax + t * (bx - ax) + nx * gap, ay + t * (by - ay) + ny * gap]);
        }
    });
    return <g>{dots.map(([x, y], i) => <circle key={i} cx={round(x)} cy={round(y)} r={pen.rivetRadius} fill={INK} />)}</g>;
};

/** A joint: a hatched recess, or a ribbed boot when the pen does not hatch. */
const joint = (d: string, ribs: string[], pen: IPenStyle, ids: IPenIds): JSX.Element => (
    <g>
        <path d={d} fill={pen.hatchJoints ? `url(#${ids.hatch})` : PAPER} stroke={INK} strokeWidth={round(Math.max(pen.panel, pen.contour * 0.6))} strokeLinejoin="round" />
        {pen.hatchJoints ? null : seams(ribs, pen)}
    </g>
);

/** A hydraulic piston: a cylinder (two rails) for most of the way, then the rod, pinned at both ends. */
const piston = ([ax, ay]: BubblePoint, [bx, by]: BubblePoint, pen: IPenStyle): JSX.Element | null => {
    if (pen.panel <= 0) {
        return null;
    }
    const length = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / length, uy = (by - ay) / length;
    const half = 5, mx = ax + ux * length * 0.58, my = ay + uy * length * 0.58;
    const corners: BubblePoint[] = [
        [ax - uy * half, ay + ux * half], [mx - uy * half, my + ux * half], [mx + uy * half, my - ux * half], [ax + uy * half, ay - ux * half],
    ];
    const body = corners.map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
    return (
        <g>
            <line x1={round(mx)} y1={round(my)} x2={round(bx)} y2={round(by)} stroke={INK} strokeWidth={round(pen.panel * 2.2)} strokeLinecap="round" />
            <polygon points={body} fill={PAPER} stroke={INK} strokeWidth={pen.panel} strokeLinejoin="round" />
            <circle cx={round(ax)} cy={round(ay)} r={3.5} fill={PAPER} stroke={INK} strokeWidth={pen.panel} />
            <circle cx={round(bx)} cy={round(by)} r={3.5} fill={PAPER} stroke={INK} strokeWidth={pen.panel} />
        </g>
    );
};

/** The doll's accent plate: hazard stripes in a pen that has them, a plain plate with a seam otherwise. */
const accent = (d: string, stripe: string, pen: IPenStyle, ids: IPenIds): JSX.Element => (
    <g>
        <path d={d} fill={pen.hazardAccents ? `url(#${ids.hazard})` : PAPER} stroke={INK} strokeWidth={round(Math.max(pen.panel, pen.contour * 0.6))} strokeLinejoin="round" />
        {pen.hazardAccents ? null : seam(stripe, pen)}
    </g>
);

/** A blueprint pivot mark: a small ring with crossed ticks. */
const pivotMark = ([x, y]: BubblePoint, pen: IPenStyle): JSX.Element | null => pen.constructionLines ? (
    <g>
        <circle cx={x} cy={y} r={5} fill="none" stroke={INK} strokeWidth={0.75} />
        <path d={`M ${x - 10},${y} L ${x + 10},${y} M ${x},${y - 10} L ${x},${y + 10}`} fill="none" stroke={INK} strokeWidth={0.75} />
    </g>
) : null;

const shift = (shape: Shape, [px, py]: BubblePoint): Shape => shape.map(([x, y]): BubblePoint => [x - px, y - py]);

/** A part written in layout units, moved so its pivot is its origin. */
const aroundPivot = (pivot: BubblePoint, part: IPart): IPart => ({
    draw: (pen, ids) => <g transform={`translate(${-pivot[0]} ${-pivot[1]})`}>{part.draw(pen, ids)}</g>,
    plates: part.plates.map((plate) => shift(plate, pivot)),
    label: cornerAt(shift([part.label], pivot), 0),
    foot: part.foot ? cornerAt(shift([part.foot], pivot), 0) : undefined,
});

/** Where each part was drawn: the biped places every part at its own pivot. */
export const BIPED_PIVOTS = {
    "head": [0, 214],
    "torso-center": [0, 206],
    "torso-side": [-84, 204],
    "torso-center-rear": [0, 972],
    "torso-side-rear": [-82, 978],
    "arm": [-266, 230],
    "leg": [-118, 520],
} satisfies Record<PartId, BubblePoint>;

// ---- Head: a hexagonal helm with a crest, a V-notched visor, a chin guard and a whip antenna at the left temple.

const HEAD_PLATE: Shape = [[-42, 142], [42, 142], [50, 160], [42, 188], [24, 204], [-24, 204], [-42, 188], [-50, 160]];

const head = aroundPivot(BIPED_PIVOTS.head, {
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

const torsoCenter = aroundPivot(BIPED_PIVOTS["torso-center"], {
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

// ---- Side torso (left): an angular shell, its top rising to the shoulder under the pauldron, its foot cut away
// above the hip.

const SIDE_PLATE: Shape = [[-104, 212], [-150, 196], [-196, 196], [-202, 250], [-202, 380], [-190, 428], [-162, 452], [-104, 456], [-96, 420]];

const torsoSide = aroundPivot(BIPED_PIVOTS["torso-side"], {
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

// ---- Arm (left): a layered pauldron over a banded upper arm, a ribbed elbow with its piston, a heavy forearm
// tapering to the wrist, and a fist.

const PAULDRON_PLATE: Shape = [[-228, 204], [-258, 190], [-296, 190], [-322, 204], [-330, 230], [-328, 288], [-298, 300], [-232, 296]];
const FOREARM_PLATE: Shape = [[-242, 452], [-306, 452], [-316, 500], [-314, 592], [-300, 624], [-256, 626], [-244, 596], [-238, 500]];

const arm = aroundPivot(BIPED_PIVOTS.arm, {
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

const leg = aroundPivot(BIPED_PIVOTS.leg, {
    plates: [THIGH_PLATE, KNEE_PLATE, SHIN_PLATE],
    label: [-124, 600],
    foot: [-145, 930],
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

// ---- Rear torsos: the back of the chest above a finned heat exchanger, and the back of each side torso.

const REAR_CENTER_PLATE: Shape = [[-70, 990], [70, 990], [80, 1004], [76, 1090], [60, 1120], [34, 1134], [-34, 1134], [-60, 1120], [-76, 1090], [-80, 1004]];
const REAR_SIDE_PLATE: Shape = [[-100, 990], [-146, 984], [-180, 994], [-190, 1020], [-190, 1090], [-176, 1124], [-140, 1134], [-102, 1134], [-96, 1060]];

const torsoCenterRear = aroundPivot(BIPED_PIVOTS["torso-center-rear"], {
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

const torsoSideRear = aroundPivot(BIPED_PIVOTS["torso-side-rear"], {
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

export const PARTS: Record<PartId, IPart> = {
    "head": head,
    "torso-center": torsoCenter,
    "torso-side": torsoSide,
    "torso-center-rear": torsoCenterRear,
    "torso-side-rear": torsoSideRear,
    "arm": arm,
    "leg": leg,
};
