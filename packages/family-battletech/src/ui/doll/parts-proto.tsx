// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import { INK, type IPenIds, type IPenStyle } from "./pen";
import type { BubblePoint, Shape } from "./shape-bubbles";
import { accent, inner, joint, outline, pivotMark, piston, plateFace, rivets, round, seam, seams, type IDecor, type IPart } from "./parts-kit";

/*
 * The parts for a ProtoMech seen from the front, in the 'Mech parts' hand: a hunched barrel of a torso with the head sunk
 * into its top, long arms hung from heavy shoulders, short reverse-kneed legs on clawed feet, and the main gun in a housing
 * over the right shoulder. Each part is drawn once, by hand, in the figure's own units, left side on the left, and carries
 * the plates its bubbles sit on (convex, inside the outline). Both legs are one part, as they are one location; a quad's
 * four legs are one part too. Our own drawing, nothing traced.
 *
 * The locations: Head, Torso, Left Arm, Right Arm, Legs and Main Gun (Total Warfare, ProtoMech Hit Location Table, p. 185;
 * TechManual p. 82: five body locations with an optional sixth, the main gun, and both legs one location). A quad has no
 * arms, and its four legs are one location (Interstellar Operations: Alternate Eras, Expanded ProtoMech Structure and Armor
 * Table, p. 95). Each checked against the page image.
 */

// ---- Head: a low sensor dome sunk between the shoulders, with a hatched sensor slit over its plate.

const HEAD_PLATE: Shape = [[-40, 134], [40, 134], [54, 150], [54, 178], [40, 196], [-40, 196], [-54, 178], [-54, 150]];

export const protoHead: IPart = {
    plates: [HEAD_PLATE],
    label: [0, 164],
    draw: (pen, ids) => (
        <>
            {pen.panel > 0 ? <path d="M -46,112 L -56,90" fill="none" stroke={INK} strokeWidth={round(pen.panel * 1.6)} strokeLinecap="round" /> : null}
            {outline("M -36,104 L 36,104 L 60,124 C 66,144 66,168 62,184 L 46,206 L -46,206 L -62,184 C -66,168 -66,144 -60,124 Z", pen)}
            {joint("M -44,112 L 44,112 L 52,128 L -52,128 Z", ["M -47,120 L 47,120"], pen, ids)}
            {plateFace(HEAD_PLATE, pen)}
        </>
    ),
};

// ---- Torso: a barrel chest, a bare band under its plate where the label is printed, a ribbed waist and a small pelvis
// with its skirt plate. `pelvis` is left off a quad, whose legs hang from the shoulders and the haunches.

const TORSO_PLATE: Shape = [[-96, 222], [96, 222], [106, 248], [100, 330], [84, 378], [-84, 378], [-100, 330], [-106, 248]];

const torso = (pelvis: boolean): IPart => ({
    plates: [TORSO_PLATE],
    label: [0, 300],
    draw: (pen, ids) => (
        <>
            {pelvis ? (
                <>
                    {outline("M -62,452 L 62,452 L 80,480 L 44,510 L -44,510 L -80,480 Z", pen)}
                    {accent("M -34,490 L 34,490 L 26,504 L -26,504 Z", "M -30,497 L 30,497", pen, ids)}
                    {joint("M -70,424 L 70,424 L 64,458 L -64,458 Z", ["M -68,436 L 68,436", "M -66,447 L 66,447"], pen, ids)}
                </>
            ) : null}
            {outline("M -84,196 L 84,196 L 122,220 C 130,270 122,340 106,392 L 84,432 L -84,432 L -106,392 C -122,340 -130,270 -122,220 Z", pen)}
            {seam("M -80,198 C -60,214 60,214 80,198", pen)}
            {seam("M -92,386 L 92,386", pen)}
            {plateFace(TORSO_PLATE, pen)}
            {rivets(TORSO_PLATE, pen)}
            {pelvis ? pivotMark([0, 440], pen) : null}
        </>
    ),
});

export const protoTorso = torso(true);
export const protoTorsoQuad = torso(false);

// ---- Arm (left): a heavy shoulder, a ribbed upper arm, a long forearm and a three-clawed hand.

const SHOULDER_PLATE: Shape = [[-134, 212], [-190, 212], [-200, 232], [-200, 284], [-186, 298], [-134, 294]];
const FOREARM_PLATE: Shape = [[-144, 344], [-190, 344], [-198, 374], [-196, 432], [-188, 450], [-148, 450], [-140, 432], [-138, 374]];

export const protoArm: IPart = {
    plates: [SHOULDER_PLATE, FOREARM_PLATE],
    label: [-166, 320],
    draw: (pen, ids) => (
        <>
            {outline("M -144,464 L -196,464 L -204,494 L -190,516 L -181,488 L -171,516 L -161,488 L -150,516 L -138,494 Z", pen)}
            {joint("M -140,298 L -192,298 L -190,338 L -142,338 Z", ["M -141,311 L -191,311", "M -141,324 L -190,324"], pen, ids)}
            {outline("M -132,332 L -200,332 C -210,372 -210,424 -202,466 L -138,466 C -128,424 -126,372 -132,332 Z", pen)}
            {plateFace(FOREARM_PLATE, pen)}
            {rivets(FOREARM_PLATE, pen)}
            {outline("M -122,206 C -148,192 -192,196 -210,220 L -212,290 C -196,308 -150,312 -124,302 Z", pen)}
            {seam("M -128,210 C -150,200 -188,204 -204,224", pen)}
            {plateFace(SHOULDER_PLATE, pen)}
            {rivets(SHOULDER_PLATE, pen)}
            {pivotMark([-166, 318], pen)}
        </>
    ),
};

// ---- A leg (left), drawn around its hip: a ribbed hip, a broad thigh, a reverse knee, a short shin and a clawed foot.
// The foot's sole is 236 below the hip.

const LEG = {
    hip: "M -34,-8 L 36,-8 C 44,0 44,10 38,18 L -38,18 C -44,10 -42,0 -34,-8 Z",
    hipRibs: ["M -40,5 L 42,5"],
    thigh: "M 40,4 L -38,2 C -52,30 -52,80 -40,112 L 26,114 C 40,80 46,40 40,4 Z",
    thighPlate: [[30, 14], [-30, 14], [-42, 40], [-38, 90], [-28, 104], [20, 104], [32, 80], [36, 40]] as Shape,
    knee: "M 24,108 L -38,106 L -40,136 L 22,136 Z",
    kneeRibs: ["M 23,118 L -39,117", "M 22,127 L -40,127"],
    shin: "M 26,126 L -40,124 C -48,150 -48,180 -42,200 L 22,200 C 30,180 32,150 26,126 Z",
    shinPlate: [[16, 136], [-30, 136], [-38, 160], [-34, 190], [14, 190], [22, 160]] as Shape,
    foot: "M 26,196 L -46,196 L -72,222 L -74,236 L 44,236 L 40,220 Z",
    footSeams: ["M -70,228 L 42,228", "M -22,198 L -30,228", "M 6,198 L 8,228"],
    pistons: [[[-48, 56], [-52, 158]]] as [BubblePoint, BubblePoint][],
};
export const LEG_LENGTH = 236;

interface ILegAt {
    hip: BubblePoint;
    scale: number;
    mirror: boolean;
}

const legPoint = ([x, y]: BubblePoint, { hip, scale, mirror }: ILegAt): BubblePoint => [hip[0] + (mirror ? -x : x) * scale, hip[1] + y * scale];

const drawLeg = (at: ILegAt, pen: IPenStyle, ids: IPenIds, key: string): JSX.Element => {
    const thighPlate = LEG.thighPlate.map((point) => legPoint(point, at)), shinPlate = LEG.shinPlate.map((point) => legPoint(point, at));
    return (
        <React.Fragment key={key}>
            <g transform={`translate(${at.hip[0]} ${at.hip[1]}) scale(${at.mirror ? -at.scale : at.scale} ${at.scale})`}>
                {joint(LEG.hip, LEG.hipRibs, pen, ids)}
                {joint(LEG.knee, LEG.kneeRibs, pen, ids)}
                {outline(LEG.thigh, pen)}
                {outline(LEG.shin, pen)}
                {outline(LEG.foot, pen)}
                {seams(LEG.footSeams, pen)}
                {LEG.pistons.map(([a, b], i) => <React.Fragment key={i}>{piston(a, b, pen, 4)}</React.Fragment>)}
            </g>
            {plateFace(thighPlate, pen)}
            {rivets(thighPlate, pen)}
            {plateFace(shinPlate, pen)}
        </React.Fragment>
    );
};

/** Several legs as one part: one location's plates are all of their thighs and shins. */
const legs = (set: ILegAt[], label: BubblePoint): IPart => ({
    plates: set.flatMap((at) => [LEG.thighPlate.map((point) => legPoint(point, at)), LEG.shinPlate.map((point) => legPoint(point, at))]),
    label,
    draw: (pen, ids) => <>{set.map((at, i) => drawLeg(at, pen, ids, String(i)))}</>,
});

/** Where the feet stand, down the sheet. */
export const PROTO_GROUND = 740;

/** A biped's two legs, hung from the pelvis. */
export const protoLegs: IPart = legs([
    { hip: [-60, 504], scale: 1, mirror: false },
    { hip: [60, 504], scale: 1, mirror: true },
], [0, 560]);

/** A quad's four legs: the rear pair, the far ones, small under the haunches and drawn first; the front pair tall, hung
 * from the shoulders. */
const QUAD_FRONT = 1.5, QUAD_REAR = 0.8;
export const QUAD_GROUND = 626;
export const protoLegsQuad: IPart = legs([
    { hip: [-58, QUAD_GROUND - LEG_LENGTH * QUAD_REAR], scale: QUAD_REAR, mirror: false },
    { hip: [58, QUAD_GROUND - LEG_LENGTH * QUAD_REAR], scale: QUAD_REAR, mirror: true },
    { hip: [-190, QUAD_GROUND - LEG_LENGTH * QUAD_FRONT], scale: QUAD_FRONT, mirror: false },
    { hip: [190, QUAD_GROUND - LEG_LENGTH * QUAD_FRONT], scale: QUAD_FRONT, mirror: true },
], [0, 520]);

// ---- Main gun: a housing over the right shoulder on a ribbed mount, its barrel raised.

const GUN_PLATE: Shape = [[114, 92], [190, 92], [200, 106], [200, 158], [188, 172], [116, 172], [104, 158], [104, 106]];

export const protoMainGun: IPart = {
    plates: [GUN_PLATE],
    label: [152, 132],
    draw: (pen, ids) => (
        <>
            {joint("M 128,178 L 176,178 L 172,212 L 132,212 Z", ["M 129,190 L 175,190", "M 131,201 L 173,201"], pen, ids)}
            {outline("M 142,26 L 162,26 L 162,86 L 142,86 Z", pen)}
            {inner("M 137,10 L 167,10 L 167,30 L 137,30 Z", pen)}
            {seams(["M 137,20 L 167,20"], pen)}
            {outline("M 108,82 L 196,82 L 210,100 L 210,164 L 194,182 L 110,182 L 94,164 L 94,100 Z", pen)}
            {plateFace(GUN_PLATE, pen)}
            {rivets(GUN_PLATE, pen)}
        </>
    ),
};

// ---- A glider's wings, behind the figure: a ribbed gliding surface swept out and down from each shoulder.

export const GLIDER_WINGS: IDecor = {
    bounds: [[-330, 150], [330, 150], [330, 520], [-330, 520]],
    draw: (pen) => (
        <>
            {[1, -1].map((side) => (
                <g key={side} transform={side === 1 ? undefined : "scale(-1 1)"}>
                    {outline("M -110,214 L -250,150 L -326,168 L -330,300 L -300,430 L -250,520 L -226,440 L -196,470 L -186,400 L -150,420 L -120,330 Z", pen)}
                    {seams(["M -128,236 L -306,198", "M -126,262 L -318,300", "M -124,290 L -296,420", "M -122,312 L -244,500"], pen)}
                </g>
            ))}
        </>
    ),
};
