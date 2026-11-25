// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";

/*
 * The doll's line style, every value in one place so a style change is one edit. Black on white only: anything that
 * would be gray is a hatch or a stripe, so the sheet prints the same on any printer. One defs block per doll, its ids
 * suffixed, since a roster prints many sheets on one page.
 */

export const INK = "rgb(0,0,0)";
export const PAPER = "rgb(255,255,255)";

export type PenPreset = "ink" | "salvage" | "blueprint";

export interface IPenStyle {
    /** Each location's outline. */
    contour: number;
    /** The plate the bubbles sit on. */
    plateBorder: number;
    /** Seams and panel lines; dashed when construction lines are on. */
    panel: number;
    /** Rivet dots along the plates; 0 draws none. */
    rivetRadius: number;
    rivetPitch: number;
    /** Joints filled with hatching; otherwise drawn as ribbed boots. */
    hatchJoints: boolean;
    /** A hazard stripe on the doll's one or two accent plates. */
    hazardAccents: boolean;
    /** A center line and pivot marks, the field-blueprint look. */
    constructionLines: boolean;
}

export const PEN_PRESETS: Record<PenPreset, IPenStyle> = {
    // Clean ink: crisp outlines, riveted plates, ribbed joints.
    ink: { contour: 3.5, plateBorder: 1.25, panel: 1.25, rivetRadius: 1.7, rivetPitch: 22, hatchJoints: false, hazardAccents: false, constructionLines: false },
    // Salvage: heavier line, hatched joints, bigger rivets, a hazard-striped skirt.
    salvage: { contour: 4.5, plateBorder: 1.75, panel: 1.5, rivetRadius: 2.3, rivetPitch: 17, hatchJoints: true, hazardAccents: true, constructionLines: false },
    // Field blueprint: fine line, dashed seams, a center line and pivot marks.
    blueprint: { contour: 2.25, plateBorder: 1, panel: 1, rivetRadius: 1.3, rivetPitch: 30, hatchJoints: false, hazardAccents: false, constructionLines: true },
};

// Picked at the style checkpoint (2026-11-24): the salvage pen for the armor and structure dolls, the blueprint pen's
// lighter line for the small damage transfer diagram.
export const DEFAULT_PEN: PenPreset = "salvage";
export const DEFAULT_TRANSFER_PEN: PenPreset = "blueprint";

export interface IPenIds {
    hatch: string;
    hazard: string;
    arrow: string;
}

export const penIds = (suffix: string): IPenIds => ({
    hatch: `doll-hatch-${suffix}`,
    hazard: `doll-hazard-${suffix}`,
    arrow: `doll-arrow-${suffix}`,
});

export function DollDefs(props: { suffix: string; pen: IPenStyle }): JSX.Element {
    const ids = penIds(props.suffix);
    const hatchWidth = Math.max(props.pen.panel, 1);
    return (
        <defs>
            <pattern id={ids.hatch} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
                <rect width={6} height={6} fill={PAPER} />
                <line x1={0} y1={0} x2={0} y2={6} stroke={INK} strokeWidth={hatchWidth} />
            </pattern>
            <pattern id={ids.hazard} patternUnits="userSpaceOnUse" width={14} height={14} patternTransform="rotate(-45)">
                <rect width={14} height={14} fill={PAPER} />
                <rect width={7} height={14} fill={INK} />
            </pattern>
            <marker id={ids.arrow} viewBox="0 0 10 10" refX={7} refY={5} markerWidth={3.5} markerHeight={3.5} orient="auto">
                <path d="M 0,0 L 10,5 L 0,10 Z" fill={INK} />
            </marker>
        </defs>
    );
}
