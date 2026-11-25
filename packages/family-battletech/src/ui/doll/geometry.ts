// Salvage Rights paper doll engine. GPL-3.0-or-later.
import type { BubblePoint, Shape } from "./shape-bubbles";

/*
 * Where a doll part sits. Each part is drawn once, around its own pivot (a neck, a shoulder, a hip); a placement
 * mirrors it (the right side is the left one turned over), scales and turns it, then moves it into the layout. A
 * frame takes layout units to the sheet: x from the box's center line, y from its top, times the frame's scale.
 */

export interface IPlacement {
    x: number;
    y: number;
    scale?: number;
    mirror?: boolean;
    /** Degrees, clockwise on the sheet. */
    rotate?: number;
}

export const placePoint = ([px, py]: BubblePoint, at: IPlacement): BubblePoint => {
    const scale = at.scale ?? 1;
    const x = (at.mirror ? -px : px) * scale, y = py * scale;
    const angle = (at.rotate ?? 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return [at.x + x * cos - y * sin, at.y + x * sin + y * cos];
};

export const placeShape = (shape: Shape, at: IPlacement): Shape => shape.map((point) => placePoint(point, at));

/** The SVG transform that places a part's drawing the way placePoint places its points. */
export const svgTransform = (at: IPlacement): string => [
    `translate(${at.x} ${at.y})`,
    at.rotate ? `rotate(${at.rotate})` : "",
    at.scale !== undefined && at.scale !== 1 ? `scale(${at.scale})` : "",
    at.mirror ? "scale(-1 1)" : "",
].filter(Boolean).join(" ");

export interface IDollFrame {
    /** The sheet x of the box's center line. */
    centerX: number;
    /** The sheet y of the box's top. */
    top: number;
    /** Sheet units per layout unit. */
    scale: number;
}

export const toSheet = ([x, y]: BubblePoint, frame: IDollFrame): BubblePoint => [frame.centerX + x * frame.scale, frame.top + y * frame.scale];

export const frameTransform = (frame: IDollFrame): string => `translate(${frame.centerX} ${frame.top}) scale(${frame.scale})`;
