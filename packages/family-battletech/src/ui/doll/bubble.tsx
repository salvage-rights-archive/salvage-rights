// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import { INK, PAPER } from "./pen";

/** A damaged point's red, part of the drawing style like the pens' ink and paper. */
export const DAMAGE = "rgb(200,0,0)";

export interface IBubbleProps {
    x: number;
    y: number;
    radius: number;
    strokeWidth: number;
    filled?: boolean;
    ink?: string;
    paper?: string;
}

/** One point of armor or structure. The ring is drawn 3 short of the radius, inside it, so it stays within its plate. */
export default function Bubble(props: IBubbleProps): JSX.Element {
    const { x, y, radius, strokeWidth } = props;
    return (
        <circle
            cx={x} cy={y} r={Math.max(0, radius - 3)}
            stroke={props.ink ?? INK} strokeWidth={strokeWidth}
            fill={props.filled ? DAMAGE : props.paper ?? PAPER}
        />
    );
}
