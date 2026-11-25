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

export interface IPart {
    draw(pen: IPenStyle, ids: IPenIds): JSX.Element;
    plates: Shape[];
    label: BubblePoint;
    foot?: BubblePoint;
    /** The way the leg runs out of its foot, as a unit vector (down the sheet for a leg seen from the front). */
    footDir?: BubblePoint;
    /** How wide the foot is across footDir, where a pod under it must be at least as wide. */
    footWidth?: number;
    /** The end of an arm seen from above, where its label stands. */
    tip?: BubblePoint;
}

/** A drawing that is not a location: a wing, a rotor, a pod. It has no plates and no bubbles; `bounds` is the shape it
 * takes up, in the same units as its drawing, so a figure's box leaves room for it. */
export interface IDecor {
    draw(pen: IPenStyle, ids: IPenIds): JSX.Element;
    bounds: Shape;
}

export const round = (n: number): number => Math.round(n * 10) / 10;

export const outline = (d: string, pen: IPenStyle): JSX.Element =>
    <path d={d} fill={PAPER} stroke={INK} strokeWidth={pen.contour} strokeLinejoin="round" strokeLinecap="round" />;

/** A part drawn inside a location, with a lighter line than the location's outline. */
export const inner = (d: string, pen: IPenStyle): JSX.Element =>
    <path d={d} fill={PAPER} stroke={INK} strokeWidth={round(pen.contour * 0.7)} strokeLinejoin="round" strokeLinecap="round" />;

export const plateFace = (shape: Shape, pen: IPenStyle): JSX.Element | null => pen.plateBorder > 0
    ? <polygon points={shapePoints(shape)} fill={PAPER} stroke={INK} strokeWidth={pen.plateBorder} strokeLinejoin="round" />
    : null;

export const seam = (d: string, pen: IPenStyle, key?: string): JSX.Element | null => pen.panel > 0
    ? <path key={key} d={d} fill="none" stroke={INK} strokeWidth={pen.panel} strokeLinecap="round" strokeDasharray={pen.constructionLines ? "7 4" : undefined} />
    : null;

export const seams = (list: string[], pen: IPenStyle): JSX.Element => <g>{list.map((d, i) => seam(d, pen, `s${i}`))}</g>;

export const signedArea = (shape: Shape): number => shape.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = cornerAt(shape, i + 1);
    return sum + x1 * y2 - x2 * y1;
}, 0) / 2;

/** Rivets just outside a plate, along each edge long enough to carry them, none on the corners. */
export const rivets = (shape: Shape, pen: IPenStyle): JSX.Element | null => {
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
export const joint = (d: string, ribs: string[], pen: IPenStyle, ids: IPenIds): JSX.Element => (
    <g>
        <path d={d} fill={pen.hatchJoints ? `url(#${ids.hatch})` : PAPER} stroke={INK} strokeWidth={round(Math.max(pen.panel, pen.contour * 0.6))} strokeLinejoin="round" />
        {pen.hatchJoints ? null : seams(ribs, pen)}
    </g>
);

/** A hydraulic piston: a cylinder (two rails) for most of the way, then the rod, pinned at both ends. */
export const piston = ([ax, ay]: BubblePoint, [bx, by]: BubblePoint, pen: IPenStyle, half = 5): JSX.Element | null => {
    if (pen.panel <= 0) {
        return null;
    }
    const length = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / length, uy = (by - ay) / length;
    const mx = ax + ux * length * 0.58, my = ay + uy * length * 0.58;
    const corners: BubblePoint[] = [
        [ax - uy * half, ay + ux * half], [mx - uy * half, my + ux * half], [mx + uy * half, my - ux * half], [ax + uy * half, ay - ux * half],
    ];
    const body = corners.map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
    return (
        <g>
            <line x1={round(mx)} y1={round(my)} x2={round(bx)} y2={round(by)} stroke={INK} strokeWidth={round(pen.panel * 2.2 * half / 5)} strokeLinecap="round" />
            <polygon points={body} fill={PAPER} stroke={INK} strokeWidth={pen.panel} strokeLinejoin="round" />
            <circle cx={round(ax)} cy={round(ay)} r={3.5} fill={PAPER} stroke={INK} strokeWidth={pen.panel} />
            <circle cx={round(bx)} cy={round(by)} r={3.5} fill={PAPER} stroke={INK} strokeWidth={pen.panel} />
        </g>
    );
};

/** The doll's accent plate: hazard stripes in a pen that has them, a plain plate with a seam otherwise. */
export const accent = (d: string, stripe: string, pen: IPenStyle, ids: IPenIds): JSX.Element => (
    <g>
        <path d={d} fill={pen.hazardAccents ? `url(#${ids.hazard})` : PAPER} stroke={INK} strokeWidth={round(Math.max(pen.panel, pen.contour * 0.6))} strokeLinejoin="round" />
        {pen.hazardAccents ? null : seam(stripe, pen)}
    </g>
);

/** A blueprint pivot mark: a small ring with crossed ticks. */
export const pivotMark = ([x, y]: BubblePoint, pen: IPenStyle): JSX.Element | null => pen.constructionLines ? (
    <g>
        <circle cx={x} cy={y} r={5} fill="none" stroke={INK} strokeWidth={0.75} />
        <path d={`M ${x - 10},${y} L ${x + 10},${y} M ${x},${y - 10} L ${x},${y + 10}`} fill="none" stroke={INK} strokeWidth={0.75} />
    </g>
) : null;

export const shift = (shape: Shape, [px, py]: BubblePoint): Shape => shape.map(([x, y]): BubblePoint => [x - px, y - py]);

/** A part written in layout units, moved so its pivot is its origin. */
export const aroundPivot = (pivot: BubblePoint, part: IPart): IPart => ({
    draw: (pen, ids) => <g transform={`translate(${-pivot[0]} ${-pivot[1]})`}>{part.draw(pen, ids)}</g>,
    plates: part.plates.map((plate) => shift(plate, pivot)),
    label: cornerAt(shift([part.label], pivot), 0),
    foot: part.foot ? cornerAt(shift([part.foot], pivot), 0) : undefined,
    footDir: part.footDir,
    footWidth: part.footWidth,
});

/** A part's decoration drawn over it: the same part with `before` drawn behind its own drawing (a swapped part's extra
 * shell) and its plates and label kept. */
export const withBehind = (part: IPart, before: (pen: IPenStyle, ids: IPenIds) => JSX.Element): IPart => ({
    ...part,
    draw: (pen, ids) => <>{before(pen, ids)}{part.draw(pen, ids)}</>,
});

// ---- Straight-edged parts, for the top-down figures: plates are computed, outlines are the plates grown by a margin.

export const polygonPath = (shape: Shape): string => `M ${shape.map(([x, y]) => `${round(x)},${round(y)}`).join(" L ")} Z`;

/** A convex shape with every edge moved `d` outward (inward when negative). */
export const offsetShape = (shape: Shape, d: number): Shape => {
    const turn = Math.sign(signedArea(shape)) || 1;
    const edges = shape.map(([ax, ay], i) => {
        const [bx, by] = cornerAt(shape, i + 1);
        const length = Math.hypot(bx - ax, by - ay) || 1;
        const ux = (bx - ax) / length, uy = (by - ay) / length;
        return { px: ax + turn * uy * d, py: ay - turn * ux * d, ux, uy };
    });
    return edges.map((next, i): BubblePoint => {
        const before = edges[(i + edges.length - 1) % edges.length] ?? next;
        const cross = before.ux * next.uy - before.uy * next.ux;
        if (Math.abs(cross) < 1e-9) {
            return [next.px, next.py];
        }
        const t = ((next.px - before.px) * next.uy - (next.py - before.py) * next.ux) / cross;
        return [before.px + before.ux * t, before.py + before.uy * t];
    });
};

/** A chamfered rectangle: x0,y0 to x1,y1 with each corner cut by `cut`. */
export const slab = (x0: number, y0: number, x1: number, y1: number, cut: number): Shape => [
    [x0 + cut, y0], [x1 - cut, y0], [x1, y0 + cut], [x1, y1 - cut], [x1 - cut, y1], [x0 + cut, y1], [x0, y1 - cut], [x0, y0 + cut],
];

/** A bar from a to b, half as wide as `wa` at a and `wb` at b, its ends chamfered by `cut`. */
export const bar = ([ax, ay]: BubblePoint, [bx, by]: BubblePoint, wa: number, wb: number, cut: number): Shape => {
    const length = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / length, uy = (by - ay) / length, nx = -uy, ny = ux;
    const at = (px: number, py: number, w: number, along: number): BubblePoint => [px + nx * w + ux * along, py + ny * w + uy * along];
    return [
        at(ax, ay, wa - cut, 0), at(ax, ay, wa, cut), at(bx, by, wb, -cut), at(bx, by, wb - cut, 0),
        at(bx, by, -(wb - cut), 0), at(bx, by, -wb, -cut), at(ax, ay, -wa, cut), at(ax, ay, -(wa - cut), 0),
    ];
};

/** A regular octagon, for a ball joint seen from above. */
export const octagon = (cx: number, cy: number, r: number): Shape =>
    Array.from({ length: 8 }, (_, i): BubblePoint => [cx + r * Math.cos((i * 45 + 22.5) * Math.PI / 180), cy + r * Math.sin((i * 45 + 22.5) * Math.PI / 180)]);

/** The same path with every point moved by `map` (absolute M, L and C commands only, which is all these legs use). */
export const mapPath = (d: string, map: (point: BubblePoint) => BubblePoint): string => {
    const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    let next = 0;
    return d.replace(/-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/g, () => {
        const [x, y] = map([numbers[next++] ?? 0, numbers[next++] ?? 0]);
        return `${round(x)},${round(y)}`;
    });
};
