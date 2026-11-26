// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import type { IPenIds, IPenStyle } from "./pen";
import type { BubblePoint, Shape } from "./shape-bubbles";
import { accent, inner, joint, outline, plateFace, rivets, seam, seams, type IPart } from "./parts-kit";

/*
 * The parts for a battle armor trooper seen from the front, in the 'Mech parts' hand: one suit per trooper, drawn with its
 * top middle at the origin. A humanoid suit has a domed helmet, a broad chest, a battle claw on the left arm, a gun on the
 * right and jump nozzles behind the shoulders; a quad suit is a low body on four legs with the pilot's dome and a gun on
 * top. The chest (or body) plate carries the suit's armor bubbles and the helmet (or dome) carries one bubble for the
 * trooper inside. Our own drawing, nothing traced.
 */

export interface ISuit {
    part: IPart;
    /** Where the trooper's own bubble sits, and its spacing. */
    trooper: { points: BubblePoint[]; pitch: number };
    /** The suit's reach either side of its center line, and its height. */
    reach: number;
    height: number;
}

const mirrored = (draw: JSX.Element): JSX.Element => <g transform="scale(-1 1)">{draw}</g>;

// ---- Humanoid suit.

const CHEST_PLATE: Shape = [[-56, 72], [56, 72], [70, 84], [66, 146], [50, 180], [-50, 180], [-66, 146], [-70, 84]];

const shoulderAndForearm = (pen: IPenStyle, ids: IPenIds): JSX.Element => (
    <>
        {joint("M -90,112 L -120,114 L -122,140 L -94,140 Z", ["M -92,126 L -121,127"], pen, ids)}
        {outline("M -88,136 L -126,136 C -134,160 -134,186 -128,204 L -94,204 C -86,186 -84,160 -88,136 Z", pen)}
        {seam("M -90,150 L -129,150", pen)}
        {outline("M -80,56 C -104,52 -124,66 -124,90 L -120,116 C -108,122 -92,120 -84,112 Z", pen)}
        {seam("M -86,62 C -104,60 -116,72 -118,90", pen)}
    </>
);

const leg = (pen: IPenStyle): JSX.Element => (
    <>
        {outline("M -58,210 L -8,210 L -10,262 L -14,290 L -60,290 C -64,262 -64,236 -58,210 Z", pen)}
        {seams(["M -62,250 L -10,250", "M -61,258 L -11,258"], pen)}
        {outline("M -62,286 L -12,286 L -8,304 L -74,304 L -72,294 Z", pen)}
    </>
);

const humanoid: IPart = {
    plates: [CHEST_PLATE],
    label: [0, 126],
    draw: (pen, ids) => (
        <>
            {outline("M -70,60 L -62,34 L -44,34 L -40,60 Z", pen)}
            {mirrored(outline("M -70,60 L -62,34 L -44,34 L -40,60 Z", pen))}
            {leg(pen)}
            {mirrored(leg(pen))}
            {outline("M -96,204 L -126,204 L -134,226 L -124,244 L -117,222 L -111,244 L -104,222 L -96,240 L -90,222 Z", pen)}
            {outline("M 100,202 L 122,202 L 120,250 L 102,250 Z", pen)}
            {inner("M 97,246 L 125,246 L 125,260 L 97,260 Z", pen)}
            {shoulderAndForearm(pen, ids)}
            {mirrored(shoulderAndForearm(pen, ids))}
            {joint("M -56,192 L 56,192 L 60,216 L -60,216 Z", ["M -57,204 L 57,204"], pen, ids)}
            {outline("M -50,58 L 50,58 L 86,70 C 92,100 88,140 74,170 L 60,196 L -60,196 L -74,170 C -88,140 -92,100 -86,70 Z", pen)}
            {plateFace(CHEST_PLATE, pen)}
            {rivets(CHEST_PLATE, pen)}
            {outline("M -22,0 L 22,0 L 36,16 C 40,32 38,50 32,62 L -32,62 C -38,50 -40,32 -36,16 Z", pen)}
            {joint("M -28,10 L 28,10 L 31,24 L -31,24 Z", ["M -29,17 L 29,17"], pen, ids)}
        </>
    ),
};

export const HUMANOID_SUIT: ISuit = { part: humanoid, trooper: { points: [[0, 43]], pitch: 26 }, reach: 136, height: 304 };

// ---- Quad suit.

const BODY_PLATE: Shape = [[-70, 58], [70, 58], [82, 74], [80, 120], [62, 142], [-62, 142], [-80, 120], [-82, 74]];

const quadLegs = (pen: IPenStyle, ids: IPenIds): JSX.Element => (
    <>
        {outline("M -60,148 L -26,148 L -28,206 L -58,206 Z", pen)}
        {outline("M -62,202 L -24,202 L -18,232 L -72,232 Z", pen)}
        {joint("M -84,84 L -112,84 C -118,92 -118,104 -112,112 L -84,112 Z", [], pen, ids)}
        {outline("M -98,92 L -128,100 C -138,124 -140,152 -134,178 L -104,180 C -96,152 -94,120 -98,92 Z", pen)}
        {joint("M -104,174 L -134,174 L -136,192 L -106,192 Z", [], pen, ids)}
        {outline("M -104,188 L -138,188 L -142,214 L -108,214 Z", pen)}
        {outline("M -102,210 L -144,210 L -158,232 L -96,232 Z", pen)}
        {seams(["M -152,224 L -98,224"], pen)}
    </>
);

const quad: IPart = {
    plates: [BODY_PLATE],
    label: [0, 100],
    draw: (pen, ids) => (
        <>
            {quadLegs(pen, ids)}
            {mirrored(quadLegs(pen, ids))}
            {outline("M 48,46 L 54,8 L 68,10 L 66,48 Z", pen)}
            {inner("M 50,0 L 72,3 L 70,16 L 48,13 Z", pen)}
            {outline("M -30,50 C -30,20 -16,4 0,4 C 16,4 30,20 30,50 Z", pen)}
            {outline("M -64,44 L 64,44 L 94,66 C 98,90 96,116 88,134 L 66,154 L -66,154 L -88,134 C -96,116 -98,90 -94,66 Z", pen)}
            {accent("M -40,146 L 40,146 L 34,158 L -34,158 Z", "M -37,152 L 37,152", pen, ids)}
            {plateFace(BODY_PLATE, pen)}
            {rivets(BODY_PLATE, pen)}
        </>
    ),
};

export const QUAD_SUIT: ISuit = { part: quad, trooper: { points: [[0, 28]], pitch: 26 }, reach: 160, height: 234 };
