// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React from "react";
import type { BubblePoint, Shape } from "./shape-bubbles";
import { aroundPivot, joint, outline, pivotMark, plateFace, rivets, round, seam, seams, slab, withBehind, type IDecor, type IPart } from "./parts-kit";
import { HEAD_PLATE, PAULDRON_PLATE, head, torsoCenter, torsoCenterTrunk, torsoSide } from "./parts-front";
import { INK, PAPER } from "./pen";

/*
 * What a variant swaps or adds on a body seen from the front: the superheavy shells, the Land-Air canopy head, the
 * armless shoulder cap, and the pods, wings and rotor drawn on and behind the figure. Each is drawn once, left side on
 * the left; a layout mirrors it. Our own drawing, nothing traced.
 */

export type VariantPartId = "head-canopy" | "head-super" | "torso-center-super" | "torso-center-trunk-super" | "torso-side-super" | "arm-cap" | "shield" | "shield-absorb";

export const VARIANT_PIVOTS = {
    "head-canopy": [0, 214],
    "head-super": [0, 214],
    "torso-center-super": [0, 206],
    "torso-center-trunk-super": [0, 206],
    "torso-side-super": [-84, 204],
    "arm-cap": [-266, 230],
    "shield": [0, 0],
    "shield-absorb": [0, 0],
} satisfies Record<VariantPartId, BubblePoint>;

// ---- Superheavy shells: the head and the torsos again, each with a second, slightly larger copy of itself behind it, so
// that the shell reads as thicker armor standing off from the first.

const puffed = (part: IPart, k: number): IPart => withBehind(part, (pen, ids) => {
    const [cx, cy] = part.label;
    return <g transform={`translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`}>{part.draw(pen, ids)}</g>;
});

const headSuper = puffed(head, 1.1);
const torsoCenterSuper = puffed(torsoCenter, 1.05);
const torsoCenterTrunkSuper = puffed(torsoCenterTrunk, 1.05);
const torsoSideSuper = puffed(torsoSide, 1.05);

// ---- Land-Air canopy head: the helm under a glazed dome with frames.

const headCanopy = aroundPivot(VARIANT_PIVOTS["head-canopy"], {
    plates: [HEAD_PLATE],
    label: [0, 172],
    draw: (pen, ids) => (
        <>
            {outline("M -58,160 C -62,122 -34,92 0,90 C 34,92 62,122 58,160 L 48,192 L 26,212 L -26,212 L -48,192 Z", pen)}
            <path d="M -48,136 C -50,112 -30,98 0,96 C 30,98 50,112 48,136 Z" fill={pen.hatchJoints ? `url(#${ids.hatch})` : PAPER} stroke={INK} strokeWidth={round(pen.contour * 0.7)} strokeLinejoin="round" />
            {seams(["M 0,97 L 0,136", "M -24,102 L -26,136", "M 24,102 L 26,136"], pen)}
            {plateFace(HEAD_PLATE, pen)}
        </>
    ),
});

// ---- Armless shoulder cap: the pauldron over a short collar and a ribbed ring, in place of the whole arm.

const CAP_COLLAR_PLATE: Shape = [[-240, 326], [-296, 326], [-302, 350], [-296, 384], [-246, 384], [-240, 352]];

const armCap = aroundPivot(VARIANT_PIVOTS["arm-cap"], {
    plates: [PAULDRON_PLATE, CAP_COLLAR_PLATE],
    label: [-270, 356],
    draw: (pen, ids) => (
        <>
            {outline("M -230,306 L -308,306 C -314,340 -314,376 -306,394 L -234,394 C -226,376 -226,340 -230,306 Z", pen)}
            {plateFace(CAP_COLLAR_PLATE, pen)}
            {rivets(CAP_COLLAR_PLATE, pen)}
            {joint("M -232,390 L -308,390 C -316,402 -316,418 -308,430 L -232,430 C -224,418 -224,402 -232,390 Z", ["M -234,401 L -306,401", "M -233,412 L -307,412", "M -234,422 L -306,422"], pen, ids)}
            {outline("M -212,206 C -218,178 -252,164 -290,166 C -322,168 -344,190 -346,222 L -342,296 C -330,310 -306,316 -284,314 L -222,308 C -212,282 -208,242 -212,206 Z", pen)}
            {seam("M -216,210 C -226,188 -258,178 -292,179 C -320,181 -336,200 -339,226", pen)}
            {plateFace(PAULDRON_PLATE, pen)}
            {rivets(PAULDRON_PLATE, pen)}
            {pivotMark([-268, 418], pen)}
        </>
    ),
});

// ---- Shield (left): a tall plate carried outside the arm, drawn around the middle of its top edge, with a bracket on the
// side that faces the arm. Its upper plate takes a circle for each point of Damage Capacity; the lower plate, under a strap,
// a diamond for each point of Damage Absorbance. The lower plate is a part of its own with no drawing, so that the two
// counts are two doll locations filled by the same engine. Our own drawing; the published sheets were read for where the
// shield stands and what it counts, nothing else.

/** The shield as drawn: half its width and its length. */
export const SHIELD = { half: 48, length: 416 } as const;
const SHIELD_CAPACITY_PLATE: Shape = slab(-38, 10, 38, 280, 8);
const SHIELD_ABSORB_PLATE: Shape = [[-38, 304], [38, 304], [38, 346], [14, 404], [-14, 404], [-38, 346]];

const shield: IPart = {
    plates: [SHIELD_CAPACITY_PLATE],
    label: [0, 145],
    draw: (pen, ids) => (
        <>
            {outline("M 44,22 L 66,22 L 66,62 L 44,62 Z", pen)}
            {outline("M -38,0 L 38,0 L 48,10 L 48,348 L 18,416 L -18,416 L -48,348 L -48,10 Z", pen)}
            {joint("M -47,285 L 47,285 L 47,299 L -47,299 Z", ["M -47,292 L 47,292"], pen, ids)}
            {plateFace(SHIELD_CAPACITY_PLATE, pen)}
            {plateFace(SHIELD_ABSORB_PLATE, pen)}
            {rivets(SHIELD_CAPACITY_PLATE, pen)}
        </>
    ),
};

const shieldAbsorb: IPart = { plates: [SHIELD_ABSORB_PLATE], label: [0, 340], draw: () => <></> };

export const VARIANT_PARTS: Record<VariantPartId, IPart> = {
    "shield": shield,
    "shield-absorb": shieldAbsorb,
    "head-canopy": headCanopy,
    "head-super": headSuper,
    "torso-center-super": torsoCenterSuper,
    "torso-center-trunk-super": torsoCenterTrunkSuper,
    "torso-side-super": torsoSideSuper,
    "arm-cap": armCap,
};

// ---- Pods under the feet: a track unit (a tread loop over road wheels) or a pair of tires, wider than the foot it covers
// and no taller than the foot's own band, so it hides the foot and nothing above it.

const stadium = (cx: number, cy: number, w: number, h: number): string => {
    const r = h / 2;
    return `M ${round(cx - w / 2 + r)},${round(cy - r)} L ${round(cx + w / 2 - r)},${round(cy - r)} A ${round(r)},${round(r)} 0 0 1 ${round(cx + w / 2 - r)},${round(cy + r)} L ${round(cx - w / 2 + r)},${round(cy + r)} A ${round(r)},${round(r)} 0 0 1 ${round(cx - w / 2 + r)},${round(cy - r)} Z`;
};

const rectShape = (x0: number, y0: number, x1: number, y1: number): Shape => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** The pod under a leg seen from the front, centered on its foot point and `width` across at the most. */
export const frontPod = (kind: "tracks" | "wheels", [fx, fy]: BubblePoint, width: number): IDecor => {
    const w = round(width + 20), h = round(w * 0.3), top = fy - h * 0.9, cy = top + h / 2;
    return {
        bounds: rectShape(fx - w / 2, top, fx + w / 2, top + h),
        draw: (pen) => kind === "tracks" ? (
            <g>
                <path d={stadium(fx, cy, w, h)} fill={PAPER} stroke={INK} strokeWidth={pen.contour} strokeLinejoin="round" />
                {pen.panel > 0 ? <path d={stadium(fx, cy, w - 16, h - 14)} fill="none" stroke={INK} strokeWidth={round(pen.panel * 2.4)} strokeDasharray="4 5" /> : null}
                {[-0.3, 0, 0.3].map((at) => <circle key={at} cx={round(fx + w * at)} cy={round(cy)} r={round(h * 0.2)} fill={PAPER} stroke={INK} strokeWidth={round(Math.max(pen.panel, pen.contour * 0.5))} />)}
            </g>
        ) : (
            <g>
                {[-1, 1].map((side) => (
                    <React.Fragment key={side}>
                        <rect x={round(fx + side * w * 0.24 - w * 0.17)} y={round(top - 4)} width={round(w * 0.34)} height={round(h + 8)} rx={9} fill={PAPER} stroke={INK} strokeWidth={pen.contour} strokeLinejoin="round" />
                        {seams([0.25, 0.5, 0.75].map((t) => `M ${round(fx + side * w * 0.24 - w * 0.17 + 5)},${round(top - 4 + (h + 8) * t)} L ${round(fx + side * w * 0.24 + w * 0.17 - 5)},${round(top - 4 + (h + 8) * t)}`), pen)}
                    </React.Fragment>
                ))}
                <rect x={round(fx - w * 0.08)} y={round(cy - 5)} width={round(w * 0.16)} height={10} fill={PAPER} stroke={INK} strokeWidth={round(Math.max(pen.panel, pen.contour * 0.5))} />
            </g>
        ),
    };
};

// ---- Wings and a rotor, drawn behind the figure, left side on the left; the right is the same turned over.

/** A wing folded up behind the shoulder, in two panels. */
export const FOLDED_WING: IDecor = {
    bounds: [[-218, 196], [-296, 60], [-218, 60]],
    draw: (pen) => (
        <>
            {outline("M -218,200 L -240,132 L -272,64 L -296,60 L -300,86 L -280,162 L -264,206 Z", pen)}
            {seams(["M -246,200 L -264,140 L -286,84", "M -230,166 L -272,150"], pen)}
        </>
    ),
};

/** A fixed wing swept out from the shoulder, mostly behind the arm. */
export const FIXED_WING: IDecor = {
    bounds: [[-230, 176], [-438, 176], [-438, 252], [-230, 252]],
    draw: (pen) => (
        <>
            {outline("M -230,204 L -420,176 L -438,192 L -426,224 L -240,254 Z", pen)}
            {seams(["M -252,222 L -424,198", "M -258,238 L -424,214", "M -420,178 L -426,222"], pen)}
        </>
    ),
};

/** A rotor's blades, edge on, across the shoulders behind the head. */
export const ROTOR: IDecor = {
    bounds: [[-340, 140], [340, 140], [340, 160], [-340, 160]],
    draw: (pen) => (
        <>
            {outline("M -342,150 L -300,141 L 300,141 L 342,150 L 300,159 L -300,159 Z", pen)}
            {seams(["M -296,150 L -20,150", "M 20,150 L 296,150"], pen)}
            {outline("M -26,170 L -20,138 L 20,138 L 26,170 Z", pen)}
        </>
    ),
};

/** The fighter-mode picture beside a Land-Air 'Mech: a fighter seen from above, nose up, labelled with the 'Mech locations
 * that become each of its firing arcs. Interstellar Operations: Alternate Eras, LAM Fighter Firing Arcs Table, p. 106:
 * Head and Center Torso are the Nose; Center Torso (Rear), Left Leg and Right Leg are the Aft; Left Torso, its rear and
 * Left Arm are the Left Wing, and the right side's likewise the Right Wing. Checked against the page image. */
export const FIGHTER_INSET: IDecor = {
    bounds: [[400, 140], [720, 140], [720, 492], [400, 492]],
    draw: (pen) => {
        const text = (x: number, y: number, line: string, key: string) => (
            <text key={key} x={x} y={y} textAnchor="middle" fontFamily="sans-serif" fontWeight={700} fontSize={16} fill={INK} aria-hidden="true">{line}</text>
        );
        return (
            <g>
                {outline("M 544,284 L 448,356 L 446,378 L 544,368 Z", pen)}
                {outline("M 576,284 L 672,356 L 674,378 L 576,368 Z", pen)}
                {outline("M 546,404 L 508,424 L 508,438 L 546,430 Z", pen)}
                {outline("M 574,404 L 612,424 L 612,438 L 574,430 Z", pen)}
                {outline("M 560,194 C 570,206 578,236 578,276 L 576,404 C 574,424 568,436 560,440 C 552,436 546,424 544,404 L 542,276 C 542,236 550,206 560,194 Z", pen)}
                <ellipse cx={560} cy={238} rx={9} ry={19} fill={PAPER} stroke={INK} strokeWidth={round(Math.max(pen.panel, pen.contour * 0.5))} />
                {seams(["M 560,290 L 560,420"], pen)}
                {text(560, 156, "NOSE", "nose")}
                {text(560, 176, "HD CT", "nose-locations")}
                {text(458, 406, "LEFT WING", "left")}
                {text(458, 426, "LT LTR LA", "left-locations")}
                {text(662, 406, "RIGHT WING", "right")}
                {text(662, 426, "RT RTR RA", "right-locations")}
                {text(560, 468, "AFT", "aft")}
                {text(560, 488, "CTR LL RL", "aft-locations")}
            </g>
        );
    },
};
