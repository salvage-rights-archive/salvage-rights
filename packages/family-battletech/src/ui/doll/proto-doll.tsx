// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import { FigureDoll, figureBox, fitFigure, type FigureUse, type IFigureBox, type IFigureDollProps, type IFigureLayout, type IFigureLocation, type IFigureUnit } from "./figure-doll";
import { GLIDER_WINGS, PROTO_GROUND, protoArm, protoHead, protoLegs, protoLegsQuad, protoMainGun, protoTorso, protoTorsoQuad, QUAD_GROUND } from "./parts-proto";

/*
 * The ProtoMech paper doll, seen from the front. `unit.layout` is the body: biped, quad or glider (a biped with its wings);
 * an ultraheavy is drawn with its body's figure, whose plates hold a 15-ton ProtoMech's points. Location codes: `hd` head,
 * `t` torso, `la` and `ra` arms, `lg` legs (one location, both or all four legs) and `mg` main gun, drawn only when the unit
 * lists it. Armor and structure are the same figure, the structure one drawn smaller by its frame.
 */

const HERE = { x: 0, y: 0 };

const HEAD: IFigureLocation = { code: "hd", part: protoHead, at: HERE, label: ["HEAD"], labelAt: [0, 80], labelAnchor: "middle" };
const TORSO: IFigureLocation = { code: "t", part: protoTorso, at: HERE, label: ["TORSO"], labelAt: [0, 414], labelAnchor: "middle" };
const MAIN_GUN: IFigureLocation = { code: "mg", part: protoMainGun, at: HERE, label: ["MAIN", "GUN"], labelAt: [220, 108], labelAnchor: "start" };

const BIPED: IFigureLayout = {
    id: "biped", kind: "ProtoMech",
    locations: [
        { code: "lg", part: protoLegs, at: HERE, label: ["LEGS"], labelAt: [0, PROTO_GROUND + 32], labelAnchor: "middle" },
        MAIN_GUN,
        TORSO,
        { code: "la", part: protoArm, at: HERE, label: ["LEFT", "ARM"], labelAt: [-222, 240], labelAnchor: "end" },
        { code: "ra", part: protoArm, at: { x: 0, y: 0, mirror: true }, label: ["RIGHT", "ARM"], labelAt: [222, 262], labelAnchor: "start" },
        HEAD,
    ],
    bounds: [[-216, 6], [216, 6], [216, PROTO_GROUND], [-216, PROTO_GROUND]],
    guide: `M 0,50 L 0,${PROTO_GROUND + 50}`,
};

const QUAD: IFigureLayout = {
    id: "quad", kind: "ProtoMech",
    locations: [
        { code: "lg", part: protoLegsQuad, at: HERE, label: ["LEGS"], labelAt: [0, QUAD_GROUND + 32], labelAnchor: "middle" },
        // With no shoulder under it, the gun's mount stands in on the torso's own slope.
        { ...MAIN_GUN, at: { x: -24, y: 8 }, labelAt: [196, 116] },
        { ...TORSO, part: protoTorsoQuad },
        HEAD,
    ],
    bounds: [[-304, 6], [304, 6], [304, QUAD_GROUND], [-304, QUAD_GROUND]],
    guide: `M 0,50 L 0,${QUAD_GROUND + 50}`,
};

/** A glider's arm labels stand under the hands, clear of the wings. */
const GLIDER: IFigureLayout = {
    ...BIPED, id: "glider",
    locations: BIPED.locations.map((location) => (
        location.code === "la" ? { ...location, labelAt: [-150, 548], labelAnchor: "end" }
            : location.code === "ra" ? { ...location, labelAt: [150, 548], labelAnchor: "start" } : location
    )),
    extras: [{ id: "wings", decor: GLIDER_WINGS, at: HERE, behind: true }],
};

export const PROTO_LAYOUTS: Record<string, IFigureLayout> = { biped: BIPED, quad: QUAD, glider: GLIDER };

/** The figure a ProtoMech is drawn with; one whose body is not known is drawn as a biped, or as a quad when its id says so. */
export const protoLayout = (unit: IFigureUnit): IFigureLayout =>
    (Object.hasOwn(PROTO_LAYOUTS, unit.layout) ? PROTO_LAYOUTS[unit.layout] : undefined) ?? (unit.layout.includes("quad") ? QUAD : BIPED);

export type IProtoDollProps = IFigureDollProps;

export default function ProtoDoll(props: IProtoDollProps): JSX.Element {
    return <FigureDoll {...props} layout={protoLayout(props.unit)} testId="proto-doll" />;
}

/** The box the ProtoMech doll needs at a scale, and the largest scale at which it fits a room. */
export const protoDollBox = (unit: IFigureUnit, use: FigureUse, scale: number, labelSize?: number, short = false): IFigureBox =>
    figureBox(protoLayout(unit), unit, use, scale, labelSize, short);
export const fitProtoDoll = (unit: IFigureUnit, use: FigureUse, width: number, height: number, labelSize?: number, short = false): { scale: number; box: IFigureBox } | undefined =>
    fitFigure(protoLayout(unit), unit, use, width, height, labelSize, short);
