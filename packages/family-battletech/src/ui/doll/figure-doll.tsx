// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import Bubble from "./bubble";
import { frameTransform, placePoint, placeShape, svgTransform, toSheet, type IDollFrame, type IPlacement } from "./geometry";
import { ARMOR_PITCH, STRUCTURE_PITCH } from "./layouts";
import { ERROR_INK, fillPlates, grown, penFor } from "./mech-doll";
import type { IDecor, IPart } from "./parts-kit";
import { DEFAULT_PEN, DollDefs, INK, PAPER, PEN_PRESETS, penIds, type PenPreset } from "./pen";
import { drawnBubble, shapePoints, type BubblePoint, type Shape } from "./shape-bubbles";

/*
 * The paper doll for the units that are not 'Mechs: vehicles, ProtoMechs, battle armor and infantry. One renderer in the
 * 'Mech doll's hand: the same pens, the same plates, bubbles packed the same way (each plate from its own middle, bubble N
 * showing point N) and the same paint order (plates, the selected and focused outlines, bubbles, labels). A unit is a
 * layout id and a list of locations with their points; each kind (vehicle-doll.tsx and the rest) turns that into a figure
 * layout, so a location the unit does not list is not drawn and one the layout does not know is left out. With `onSelect`
 * each location is a button named by the location and its points; without it the whole drawing is one image.
 */

/** The uses these figures have: none of them has a damage transfer diagram. */
export type FigureUse = "armor" | "structure";

export interface IFigureUnitLocation {
    code: string;
    name: string;
    armor: number;
    structure?: number;
}

/** What a doll needs from a unit: the layout it is drawn with and its locations, each with its points. */
export interface IFigureUnit {
    layout: string;
    locations: IFigureUnitLocation[];
}

export interface IFigureLocation {
    /** The unit location's code. */
    code: string;
    part: IPart;
    at: IPlacement;
    /** The label's lines; the count follows the last one ("" puts it on a line of its own). */
    label: string[];
    labelAt: BubblePoint;
    labelAnchor: "start" | "middle" | "end";
    /** Where the short label (the code and the count, on a figure drawn small) stands, where that is not `labelAt`. */
    shortAt?: BubblePoint;
    /** A short line from the label to the location it names, where the label stands clear of it. */
    leader?: [BubblePoint, BubblePoint];
    /** Points drawn at set places in the part's own units and not packed into its plates: a trooper's one point. On a
     * figure that shows both counts at once these are the structure points; on a part with no plates, all its points. */
    spots?: { points: BubblePoint[]; pitch: number };
    /** The shapes outlined when the location is selected or focused, in the part's own units, where they are not its plates. */
    ring?: Shape[];
}

/** A drawing on a figure that is no location: tracks, a skirt, a wing. */
export interface IFigureExtra {
    id: string;
    decor: IDecor;
    at: IPlacement;
    behind: boolean;
}

export interface IFigureLayout {
    id: string;
    /** The whole drawing's name, as "Vehicle": the use is added ("Vehicle armor diagram"). */
    kind: string;
    /** Drawn in this order, back to front. */
    locations: IFigureLocation[];
    extras?: IFigureExtra[];
    /** The room the drawing takes up, in the figure's units, where it reaches beyond its plates and labels. */
    bounds?: Shape;
    /** Path data of the blueprint pen's center line. */
    guide?: string;
    /** The labels' type size as a share of the use's own. */
    labelScale?: number;
    /** Both counts are drawn on the one figure in either use: armor packed into the plates and structure at the spots. */
    combined?: boolean;
    /** What a location's points are called in its name, where that is not the use ("troopers"). */
    noun?: string;
}

export interface IFigureDollProps {
    unit: IFigureUnit;
    use: FigureUse;
    frame: IDollFrame;
    /** Makes this doll's pattern ids unique on a page of many sheets. */
    suffix: string;
    pen?: PenPreset;
    /** The location (its code) drawn with a heavier outline. */
    selected?: string;
    /** Makes each location a button; called with the location's code. */
    onSelect?(code: string): void;
    /** Locations whose amount breaks a rule: their outline, selected or not, is drawn in red. */
    inError?: string[];
    /** The labels' color; black unless the sheet marks the current phase. */
    ink?: string;
    /** The labels' type size in sheet units, where the use's own is too small for the page. */
    labelSize?: number;
    /** Label each location by its code rather than its name. */
    shortLabels?: boolean;
    /** The least width and height, in sheet units, of a location hit area: a small part gets an invisible, larger one so a finger finds it. */
    minTarget?: number;
}

export const FIGURE_LABEL = { armor: { size: 20, glyph: 0.62 }, structure: { size: 15, glyph: 0.62 } } as const;

const FOCUS_GAP = 7;
const MARGIN = 12;

const round = (n: number): number => Math.round(n * 10) / 10;
const whole = (n: number | undefined): number => Math.max(0, Math.floor(n ?? 0));

/** A location's plates on the sheet. */
export const figurePlates = (location: IFigureLocation, frame: IDollFrame): Shape[] =>
    location.part.plates.map((plate) => placeShape(plate, location.at).map((point) => toSheet(point, frame)));

const ringsOf = (location: IFigureLocation, frame: IDollFrame): Shape[] =>
    location.ring ? location.ring.map((shape) => placeShape(shape, location.at).map((point) => toSheet(point, frame))) : figurePlates(location, frame);

/** The label's lines as drawn: the name with its count, or the code with its count on one line. */
export const figureLabelLines = (location: IFigureLocation, count: number, short = false): string[] => {
    if (short) return [`${location.code.toUpperCase()} [${count}]`];
    return location.label.map((line, i) => (i === location.label.length - 1 ? `${line} [${count}]`.trim() : line));
};

const labelPoint = (location: IFigureLocation, short: boolean): BubblePoint => (short && location.shortAt ? location.shortAt : location.labelAt);

/** The points a use counts in a location: armor, or internal structure. */
const countOf = (at: IFigureUnitLocation | undefined, use: FigureUse): number => whole(use === "armor" ? at?.armor : at?.structure);

/** The count a location's label and name give: on a figure that shows both, always its armor. */
const namedCount = (layout: IFigureLayout, at: IFigureUnitLocation | undefined, use: FigureUse): number =>
    countOf(at, layout.combined ? "armor" : use);

/** A bubble whose ring keeps a quarter of its footprint as its gap where the usual gap of 3 would leave nothing to see:
 * a vehicle's whole armor in one location is drawn at a spacing the 'Mech doll never reaches. */
const ring = (footprint: number): { radius: number; strokeWidth: number } => {
    const drawn = drawnBubble(footprint);
    return footprint >= 8 ? drawn : { radius: footprint * 0.82 + 3, strokeWidth: Math.max(drawn.strokeWidth, 0.6) };
};

/** Where a location's bubbles go on the sheet, by what they count, and their spacing. */
export const figureBubbles = (layout: IFigureLayout, location: IFigureLocation, at: IFigureUnitLocation | undefined, use: FigureUse, frame: IDollFrame): { counts: FigureUse; points: BubblePoint[]; pitch: number }[] => {
    const spotted = (counts: FigureUse, count: number) => {
        const spots = location.spots ?? { points: [], pitch: 0 };
        return { counts, points: spots.points.slice(0, count).map((point) => toSheet(placePoint(point, location.at), frame)), pitch: spots.pitch * (location.at.scale ?? 1) * frame.scale };
    };
    const packed = (counts: FigureUse) => ({ counts, ...fillPlates(figurePlates(location, frame), countOf(at, counts), counts === "armor" ? ARMOR_PITCH : STRUCTURE_PITCH) });
    if (layout.combined) return [packed("armor"), spotted("structure", countOf(at, "structure"))];
    return [location.part.plates.length > 0 ? packed(use) : spotted(use, countOf(at, use))];
};

/** The locations of a layout that the unit has, each with the unit's entry for it. */
const present = (layout: IFigureLayout, unit: IFigureUnit): { location: IFigureLocation; at: IFigureUnitLocation }[] =>
    layout.locations.flatMap((location) => {
        const at = unit.locations.find((each) => each.code === location.code);
        return at ? [{ location, at }] : [];
    });

/** An invisible rectangle around a part that is smaller than the least target, so that its button is as large as that. */
const hitArea = (plates: Shape[], least: number | undefined): JSX.Element | null => {
    if (!least || plates.length === 0) return null;
    const xs = plates.flatMap((plate) => plate.map(([x]) => x)), ys = plates.flatMap((plate) => plate.map(([, y]) => y));
    const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const width = Math.max(right - left, least), height = Math.max(bottom - top, least);
    if (width === right - left && height === bottom - top) return null;
    return <rect data-hit="" x={round((left + right) / 2 - width / 2)} y={round((top + bottom) / 2 - height / 2)} width={round(width)} height={round(height)} fill="transparent" aria-hidden="true" />;
};

export function FigureDoll(props: IFigureDollProps & { layout: IFigureLayout; testId: string }): JSX.Element {
    const { unit, use, frame, suffix, layout } = props;
    const [focused, setFocused] = React.useState<string | undefined>(undefined);
    const pen = penFor(use, PEN_PRESETS[props.pen ?? DEFAULT_PEN]);
    const ids = penIds(suffix);
    const ink = props.ink ?? INK;
    const drawn = present(layout, unit);
    const wrong = (code: string): boolean => props.inError?.includes(code) ?? false;
    const inkOf = (code: string): string => (wrong(code) ? ERROR_INK : INK);
    const onSelect = props.onSelect;
    const interactive = onSelect !== undefined;
    const noun = layout.noun ?? (layout.combined ? "armor" : use);
    const fontSize = (props.labelSize ?? FIGURE_LABEL[use].size) * (layout.labelScale ?? 1);
    const short = props.shortLabels ?? false;

    const drawExtra = (extra: IFigureExtra): JSX.Element => (
        <g key={extra.id} data-decor={extra.id} aria-hidden="true" pointerEvents="none">
            <g transform={frameTransform(frame)}>
                <g transform={svgTransform(extra.at)}>{extra.decor.draw(pen, ids)}</g>
            </g>
        </g>
    );

    const labels = drawn.flatMap(({ location, at }) => {
        const [x, y] = toSheet(labelPoint(location, short), frame);
        return figureLabelLines(location, namedCount(layout, at, use), short).map((line, i) => (
            <text
                key={`${location.code}-label-${i}`} data-label={location.code}
                x={round(x)} y={round(y + i * (fontSize + 2))} textAnchor={location.labelAnchor}
                fontFamily="sans-serif" fontWeight={700} fontSize={fontSize} fill={ink} aria-hidden="true"
                // A label printed on the figure keeps a paper edge, so it reads where a small figure brings a line under it.
                stroke={PAPER} strokeWidth={3} strokeLinejoin="round" paintOrder="stroke"
            >
                {line}
            </text>
        ));
    });

    const leaders = drawn.flatMap(({ location }) => {
        if (!location.leader) return [];
        const [[ax, ay], [bx, by]] = [toSheet(location.leader[0], frame), toSheet(location.leader[1], frame)];
        return [<line key={`${location.code}-leader`} data-leader={location.code} x1={round(ax)} y1={round(ay)} x2={round(bx)} y2={round(by)} stroke={ink} strokeWidth={2.5} strokeLinecap="round" aria-hidden="true" />];
    });

    return (
        <g
            data-testid={props.testId} data-layout={layout.id} data-use={use}
            role={interactive ? undefined : "img"} aria-label={interactive ? undefined : `${layout.kind} ${use} diagram`}
        >
            <DollDefs suffix={suffix} pen={pen} />
            {pen.constructionLines && layout.guide ? (
                <g transform={frameTransform(frame)} aria-hidden="true">
                    <path d={layout.guide} fill="none" stroke={INK} strokeWidth={0.75} strokeDasharray="18 5 3 5" />
                </g>
            ) : null}
            {(layout.extras ?? []).filter((extra) => extra.behind).map(drawExtra)}
            {drawn.map(({ location, at }) => {
                const chosen = props.selected === location.code;
                const choose = () => onSelect?.(location.code);
                const buttonProps = interactive ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-pressed": chosen,
                    "aria-label": `${at.name}, ${namedCount(layout, at, use)} ${noun}${wrong(location.code) ? ", in error" : ""}`,
                    onClick: choose,
                    onFocus: () => setFocused(location.code),
                    onBlur: () => setFocused((now) => (now === location.code ? undefined : now)),
                    onKeyDown: (event: React.KeyboardEvent) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            choose();
                        }
                    },
                    style: { cursor: "pointer" },
                } : {};
                return (
                    <g key={location.code} data-loc={location.code} {...buttonProps}>
                        {interactive ? hitArea(figurePlates(location, frame), props.minTarget) : null}
                        <g transform={frameTransform(frame)}>
                            <g transform={svgTransform(location.at)}>{location.part.draw(pen, ids)}</g>
                        </g>
                    </g>
                );
            })}
            {(layout.extras ?? []).filter((extra) => !extra.behind).map(drawExtra)}
            {interactive ? (
                <g aria-hidden="true" pointerEvents="none" data-outlines="">
                    {drawn.filter(({ location }) => location.code === props.selected || wrong(location.code)).map(({ location }) => (
                        <g
                            key={`selected-${location.code}`}
                            {...(location.code === props.selected ? { "data-selected": location.code } : {})}
                            {...(wrong(location.code) ? { "data-error": location.code } : {})}
                        >
                            {ringsOf(location, frame).map((plate, i) => (
                                <polygon key={i} points={shapePoints(plate)} fill="none" stroke={inkOf(location.code)} strokeWidth={pen.contour * 2} strokeLinejoin="round" />
                            ))}
                        </g>
                    ))}
                    {drawn.filter(({ location }) => location.code === focused).map(({ location }) => (
                        <g key={`focus-${location.code}`} data-focus={location.code}>
                            {ringsOf(location, frame).map((plate, i) => (
                                <polygon key={i} points={shapePoints(grown(plate, FOCUS_GAP))} fill="none" stroke={inkOf(location.code)} strokeWidth={3} strokeDasharray="10 6" strokeLinejoin="round" />
                            ))}
                        </g>
                    ))}
                </g>
            ) : null}
            <g aria-hidden="true" pointerEvents="none">
                {drawn.map(({ location, at }) => (
                    <g key={location.code} data-bubbles={location.code}>
                        {figureBubbles(layout, location, at, use, frame).flatMap(({ counts, points, pitch }) => points.map(([x, y], index) => (
                            <Bubble key={`${counts}-${index}`} x={round(x)} y={round(y)} {...ring(pitch / 2)} />
                        )))}
                    </g>
                ))}
            </g>
            {leaders}
            {labels}
        </g>
    );
}

export interface IFigureBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** The box a figure needs, in sheet units: every plate, drawing and label of the layout at that scale, so nothing is clipped. */
export const figureBox = (layout: IFigureLayout, unit: IFigureUnit, use: FigureUse, scale: number, labelSize?: number, short = false): IFigureBox => {
    const frame = { centerX: 0, top: 0, scale };
    const xs: number[] = [], ys: number[] = [];
    const { size: own, glyph } = FIGURE_LABEL[use];
    const size = (labelSize ?? own) * (layout.labelScale ?? 1);
    for (const { location, at } of present(layout, unit)) {
        for (const [x, y] of [...figurePlates(location, frame), ...ringsOf(location, frame)].flat()) {
            xs.push(x);
            ys.push(y);
        }
        // The widest count a label can show has three figures.
        const lines = figureLabelLines(location, Math.max(namedCount(layout, at, use), 100), short);
        const width = Math.max(...lines.map((line) => line.length)) * size * glyph;
        const [x, y] = toSheet(labelPoint(location, short), frame);
        const [from, to] = location.labelAnchor === "start" ? [x, x + width] : location.labelAnchor === "end" ? [x - width, x] : [x - width / 2, x + width / 2];
        xs.push(from, to);
        ys.push(y - size, y + (lines.length - 1) * (size + 2) + size * 0.3);
    }
    for (const [x, y] of layout.bounds ?? []) {
        xs.push(x * scale);
        ys.push(y * scale);
    }
    for (const extra of layout.extras ?? []) {
        for (const [x, y] of placeShape(extra.decor.bounds, extra.at)) {
            xs.push(x * scale);
            ys.push(y * scale);
        }
    }
    if (xs.length === 0) return { left: -MARGIN, top: -MARGIN, width: MARGIN * 2, height: MARGIN * 2 };
    const left = Math.min(...xs) - MARGIN, top = Math.min(...ys) - MARGIN;
    return { left, top, width: Math.max(...xs) + MARGIN - left, height: Math.max(...ys) + MARGIN - top };
};

/** The largest scale at which the figure's box fits the room, or undefined when it fits at none. */
export const fitFigure = (layout: IFigureLayout, unit: IFigureUnit, use: FigureUse, width: number, height: number, labelSize?: number, short = false): { scale: number; box: IFigureBox } | undefined => {
    let low = 0.05, high = 1.5;
    const fits = (scale: number): boolean => {
        const box = figureBox(layout, unit, use, scale, labelSize, short);
        return box.width <= width && box.height <= height;
    };
    if (!fits(low)) return undefined;
    for (let i = 0; i < 24; i += 1) {
        const middle = (low + high) / 2;
        if (fits(middle)) low = middle;
        else high = middle;
    }
    return { scale: low, box: figureBox(layout, unit, use, low, labelSize, short) };
};
