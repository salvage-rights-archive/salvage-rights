// Salvage Rights paper doll engine. GPL-3.0-or-later.
import React, { type JSX } from "react";
import Bubble from "./bubble";
import { frameTransform, placePoint, placeShape, svgTransform, toSheet, type IDollFrame } from "./geometry";
import { ARMOR_PITCH, DOLL_LAYOUTS, dollLocationName, STRUCTURE_PITCH, type DollUse, type IDollLocation, type IDollUnit } from "./layouts";
import { PARTS } from "./parts";
import { DEFAULT_PEN, DEFAULT_TRANSFER_PEN, DollDefs, INK, PEN_PRESETS, penIds, type IPenStyle, type PenPreset } from "./pen";
import { cornerAt, drawnBubble, edgeDistance, gridIn, insideShape, packBubbles, shapePoints, type BubblePoint, type Shape } from "./shape-bubbles";

/*
 * The 'Mech paper doll: one renderer for every body type and all three uses on the record sheet. "armor" draws the
 * front and the rear torsos with a bubble per point of armor; "structure" draws the front with a bubble per point of
 * internal structure; "transfer" draws the figure small, with an arrow from each location to where its damage goes.
 * Bubbles are packed into each location's plates, every plate filling from its own middle at the same pace; bubble N
 * shows point N. Paint order: every location's plates (each its own group), the selected and focused outlines, then every
 * location's bubbles, the arrows and the labels, so no plate covers a bubble or an outline. With `onSelect` each plate
 * group is a button named by the location and its points; without it the whole drawing is one image. The transfer
 * diagram is always one labelled image, even when `onSelect` is given.
 */

export interface IMechDollProps {
    unit: IDollUnit;
    use: DollUse;
    frame: IDollFrame;
    /** Makes this doll's pattern and marker ids unique on a page of many sheets. */
    suffix: string;
    pen?: PenPreset;
    /** The doll location (lower case code) drawn with a heavier outline. */
    selected?: string;
    /** Makes each location a button; called with the doll location's code. */
    onSelect?(loc: string): void;
    /** Doll locations whose amount breaks a rule: their outline, selected or not, is drawn in red. */
    inError?: string[];
    /** The labels' color; black unless the sheet marks the current phase. */
    ink?: string;
}

const DIAGRAM_NAMES: Record<DollUse, string> = { armor: "Armor diagram", structure: "Structure diagram", transfer: "Damage transfer diagram" };

const LABEL_FONT: Record<"armor" | "structure", number> = { armor: 20, structure: 15 };

/** A location's plates on the sheet. */
export const placedPlates = (location: IDollLocation, frame: IDollFrame): Shape[] =>
    PARTS[location.part].plates.map((plate) => placeShape(plate, location.at).map((point) => toSheet(point, frame)));

/** The outline of a location whose amount breaks a rule. On the white sheet it has a contrast of about 6.5 to 1. */
export const ERROR_INK = "rgb(179,38,30)";

/** How far outside a plate the focus outline is drawn, in sheet units. */
const FOCUS_GAP = 7;

/** A convex plate with every corner pushed `gap` away from its middle. */
const grown = (shape: Shape, gap: number): Shape => {
    const [cx, cy] = centroid(shape);
    return shape.map(([x, y]): BubblePoint => {
        const length = Math.hypot(x - cx, y - cy) || 1;
        return [x + (x - cx) / length * gap, y + (y - cy) / length * gap];
    });
};

const centroid = (shape: Shape): BubblePoint => {
    let area = 0, cx = 0, cy = 0;
    shape.forEach(([x1, y1], i) => {
        const [x2, y2] = cornerAt(shape, i + 1);
        const cross = x1 * y2 - x2 * y1;
        area += cross;
        cx += (x1 + x2) * cross;
        cy += (y1 + y2) * cross;
    });
    return [cx / (3 * area), cy / (3 * area)];
};

/**
 * Where `count` bubbles go in a location's plates, and their spacing: the widest spacing up to `maxPitch` at which all
 * fit; each plate fills from its own middle outward, every plate at the same share of its room.
 */
export const fillPlates = (plates: Shape[], count: number, maxPitch: number): { points: BubblePoint[]; pitch: number } => {
    const wanted = Math.max(Math.floor(count), 0);
    if (wanted === 0 || plates.length === 0) {
        return { points: [], pitch: maxPitch };
    }
    const regions = plates.map((plate) => ({ within: [plate] }));
    const { pitch } = packBubbles(regions, wanted, { maxPitch });
    if (pitch <= 0) {
        return { points: [], pitch };
    }
    const grid = gridIn(regions, pitch);
    const ranked = plates.flatMap((plate, index) => {
        const middle = centroid(plate);
        const own = grid
            .filter((point) => insideShape(plate, point) && edgeDistance(plate, point) >= pitch / 2)
            .map((point) => ({ point, distance: Math.hypot(point[0] - middle[0], point[1] - middle[1]) }))
            .sort((a, b) => a.distance - b.distance || a.point[1] - b.point[1] || a.point[0] - b.point[0]);
        return own.map((each, rank) => ({ ...each, plate: index, share: (rank + 0.5) / own.length }));
    });
    // A grid point that fits two plates belongs to the first; plates do not overlap, so this only guards the edges.
    const seen = new Set<string>();
    const points = ranked
        .sort((a, b) => a.share - b.share || a.plate - b.plate)
        .filter(({ point }) => {
            const key = `${point[0]},${point[1]}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, wanted)
        .map(({ point }) => point);
    return { points, pitch };
};

/** Lighter or heavier line for the smaller uses, so every figure reads the same weight on the sheet. */
const penFor = (use: DollUse, pen: IPenStyle): IPenStyle => {
    if (use === "transfer") {
        return { ...pen, contour: pen.contour * 2.5, plateBorder: 0, panel: 0, rivetRadius: 0, hatchJoints: false, hazardAccents: false, constructionLines: false };
    }
    if (use === "structure") {
        return { ...pen, contour: pen.contour * 1.25, plateBorder: pen.plateBorder * 1.25, panel: pen.panel * 1.25, rivetRadius: pen.rivetRadius * 1.2 };
    }
    return pen;
};

const round = (n: number): number => Math.round(n * 10) / 10;

/** The arrow from a location toward the one its damage moves to, stopping short of both middles. */
const transferArrow = (from: BubblePoint, to: BubblePoint, key: string, arrowId: string): JSX.Element => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const ux = (to[0] - from[0]) / length, uy = (to[1] - from[1]) / length;
    const start = Math.min(28, length * 0.2), stop = Math.min(48, length * 0.3);
    return (
        <line
            key={key}
            data-transfer={key}
            x1={round(from[0] + ux * start)} y1={round(from[1] + uy * start)}
            x2={round(to[0] - ux * stop)} y2={round(to[1] - uy * stop)}
            stroke={INK} strokeWidth={9} strokeLinecap="round" markerEnd={`url(#${arrowId})`}
        />
    );
};

export default function MechDoll(props: IMechDollProps): JSX.Element {
    const { unit, use, frame, suffix } = props;
    const [focused, setFocused] = React.useState<string | undefined>(undefined);
    const layout = DOLL_LAYOUTS[unit.layoutId];
    if (!layout) {
        return <g data-testid="mech-doll" data-layout={unit.layoutId} data-use={use} />;
    }
    const pen = penFor(use, PEN_PRESETS[props.pen ?? (use === "transfer" ? DEFAULT_TRANSFER_PEN : DEFAULT_PEN)]);
    const ids = penIds(suffix);
    const ink = props.ink ?? INK;
    const locations = use === "armor" ? [...layout.front, ...layout.rear] : layout.front;
    const anchorOf = (loc: string): BubblePoint | undefined => {
        const location = locations.find((each) => each.loc === loc);
        return location ? placePoint(PARTS[location.part].label, location.at) : undefined;
    };

    const counted = use === "transfer" ? [] : locations.map((location) => ({
        location,
        count: use === "armor" ? unit.armor(location.loc) : unit.structure(location.loc),
    }));

    const bubblesOf = (location: IDollLocation): JSX.Element[] => {
        const count = use === "armor" ? unit.armor(location.loc) : unit.structure(location.loc);
        const { points, pitch } = fillPlates(placedPlates(location, frame), count, use === "armor" ? ARMOR_PITCH : STRUCTURE_PITCH);
        return points.map(([x, y], index) => (
            <Bubble
                key={`${location.loc}-${index}`}
                filled={use === "armor" ? unit.armorDamaged(location.loc, index) : unit.structureDamaged(location.loc, index)}
                x={round(x)}
                y={round(y)}
                {...drawnBubble(pitch / 2)}
            />
        ));
    };
    const wrong = (loc: string): boolean => props.inError?.includes(loc) ?? false;
    const inkOf = (loc: string): string => (wrong(loc) ? ERROR_INK : INK);
    const onSelect = props.onSelect;
    // The transfer diagram has no points to name, so it stays one labelled image even when onSelect is given.
    const interactive = onSelect !== undefined && use !== "transfer";
    const pointsOf = (loc: string): number => (use === "armor" ? unit.armor(loc) : unit.structure(loc));

    const fontSize = use === "structure" ? LABEL_FONT.structure : LABEL_FONT.armor;
    const labels = counted.flatMap(({ location, count }) => {
        const [x, y] = toSheet(location.labelAt, frame);
        return location.label.map((line, i) => (
            <text
                key={`${location.loc}-label-${i}`}
                data-label={location.loc}
                x={round(x)}
                y={round(y + i * (fontSize + 2))}
                textAnchor={location.labelAnchor}
                fontFamily="sans-serif"
                fontWeight={700}
                fontSize={fontSize}
                fill={ink}
                aria-hidden="true"
            >
                {i === location.label.length - 1 ? `${line} [${count}]`.trim() : line}
            </text>
        ));
    });

    const arrows = use !== "transfer" ? [] : locations.flatMap((location) => {
        const from = anchorOf(location.loc), to = location.transfersTo ? anchorOf(location.transfersTo) : undefined;
        return from && to ? [transferArrow(from, to, `${location.loc}>${location.transfersTo}`, ids.arrow)] : [];
    });

    return (
        <g
            data-testid="mech-doll" data-layout={layout.id} data-use={use}
            role={interactive ? undefined : "img"} aria-label={interactive ? undefined : DIAGRAM_NAMES[use]}
        >
            <DollDefs suffix={suffix} pen={pen} />
            <g transform={frameTransform(frame)}>
                {pen.constructionLines ? (
                    <g aria-hidden="true">
                        <path d={use === "armor" ? "M 0,40 L 0,950 M 0,962 L 0,1170" : "M 0,40 L 0,950"} fill="none" stroke={INK} strokeWidth={0.75} strokeDasharray="18 5 3 5" />
                        <path d="M -360,230 L 360,230 M -360,520 L 360,520" fill="none" stroke={INK} strokeWidth={0.6} strokeDasharray="4 6" />
                    </g>
                ) : null}
            </g>
            {locations.map((location) => {
                const chosen = props.selected === location.loc;
                const choose = () => onSelect?.(location.loc);
                const buttonProps = interactive ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-pressed": chosen,
                    "aria-label": `${dollLocationName(location.loc)}, ${pointsOf(location.loc)} ${use}${wrong(location.loc) ? ", in error" : ""}`,
                    onClick: choose,
                    onFocus: () => setFocused(location.loc),
                    onBlur: () => setFocused((now) => (now === location.loc ? undefined : now)),
                    onKeyDown: (event: React.KeyboardEvent) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            choose();
                        }
                    },
                    // The stylesheet draws the browser's focus outline; the overlay below adds the dashed ring.
                    style: { cursor: "pointer" },
                } : {};
                return (
                    <g key={location.loc} data-loc={location.loc} {...buttonProps}>
                        <g transform={frameTransform(frame)}>
                            <g transform={svgTransform(location.at)}>{PARTS[location.part].draw(pen, ids)}</g>
                        </g>
                    </g>
                );
            })}
            {interactive ? (
                <g aria-hidden="true" pointerEvents="none" data-outlines="">
                    {locations.filter((location) => location.loc === props.selected || wrong(location.loc)).map((location) => (
                        <g
                            key={`selected-${location.loc}`}
                            {...(location.loc === props.selected ? { "data-selected": location.loc } : {})}
                            {...(wrong(location.loc) ? { "data-error": location.loc } : {})}
                        >
                            {placedPlates(location, frame).map((plate, i) => (
                                <polygon key={i} points={shapePoints(plate)} fill="none" stroke={inkOf(location.loc)} strokeWidth={pen.contour * 2} strokeLinejoin="round" />
                            ))}
                        </g>
                    ))}
                    {locations.filter((location) => location.loc === focused).map((location) => (
                        <g key={`focus-${location.loc}`} data-focus={location.loc}>
                            {placedPlates(location, frame).map((plate, i) => (
                                <polygon key={i} points={shapePoints(grown(plate, FOCUS_GAP))} fill="none" stroke={inkOf(location.loc)} strokeWidth={3} strokeDasharray="10 6" strokeLinejoin="round" />
                            ))}
                        </g>
                    ))}
                </g>
            ) : null}
            {use === "transfer" ? null : (
                <g aria-hidden="true" pointerEvents="none">
                    {locations.map((location) => <g key={location.loc} data-bubbles={location.loc}>{bubblesOf(location)}</g>)}
                </g>
            )}
            {arrows.length > 0 ? <g aria-hidden="true" transform={frameTransform(frame)}>{arrows}</g> : null}
            {labels}
        </g>
    );
}
