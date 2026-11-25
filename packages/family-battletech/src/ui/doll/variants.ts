// Salvage Rights paper doll engine. GPL-3.0-or-later.
import { mapPath, type IDecor } from "./parts-kit";
import { frontPod, FIGHTER_INSET, FIXED_WING, FOLDED_WING, ROTOR } from "./parts-variants";
import { topPod } from "./parts-top";
import { PARTS, type PartId } from "./parts";
import type { IDollExtra, IDollGuide, IDollLayout, IDollLocation, IDollVariant } from "./layouts";

/** The center line and cross lines of the front view, in the biped's units. */
export const FRONT_GUIDE: IDollGuide = { armor: "M 0,40 L 0,950 M 0,962 L 0,1170", other: "M 0,40 L 0,950", cross: "M -360,230 L 360,230 M -360,520 L 360,520" };

/*
 * Variants: part swaps and additions on a layout, never new layouts. A variant leaves the layout's locations as they are;
 * it swaps the part that draws a location, moves a label out of the way, or adds a drawing that is no location (a wing, a
 * pod) and so has no plates, no bubbles and no button.
 */

/** A location with its drawing, position and label moved to `k` times the distance from the center line and the top. */
export const scaleLocation = (location: IDollLocation, k: number): IDollLocation => ({
    ...location,
    at: { ...location.at, x: location.at.x * k, y: location.at.y * k, scale: (location.at.scale ?? 1) * k },
    labelAt: [location.labelAt[0] * k, location.labelAt[1] * k],
    shortHangsFrom: location.shortHangsFrom && [location.shortHangsFrom[0] * k, location.shortHangsFrom[1] * k],
    leader: location.leader && [[location.leader[0][0] * k, location.leader[0][1] * k], [location.leader[1][0] * k, location.leader[1][1] * k]],
});

/** A superheavy is drawn this much larger than a 'Mech of 100 tons, so that its larger counts still fit at a size a bubble
 * can be read. */
const SUPERHEAVY_SCALE = 1.45;

const SUPERHEAVY_PARTS: Partial<Record<PartId, PartId>> = { head: "head-super", "torso-center": "torso-center-super", "torso-side": "torso-side-super" };

const withParts = (layout: IDollLayout, swap: (location: IDollLocation) => IDollLocation): IDollLayout =>
    ({ ...layout, front: layout.front.map(swap), rear: layout.rear.map(swap) });

const swapped = (to: Partial<Record<PartId, PartId>>) => (location: IDollLocation): IDollLocation =>
    ({ ...location, part: to[location.part] ?? location.part });

const scaledMap = (d: string, k: number): string => mapPath(d, ([x, y]) => [x * k, y * k]);

/** The superheavy's head and broader shells, the whole figure larger. Applies to the biped and the tripod. */
const superheavy = (layout: IDollLayout): IDollLayout => {
    const swapParts = swapped(SUPERHEAVY_PARTS);
    const scaled = withParts(layout, (location) => scaleLocation(swapParts(location), SUPERHEAVY_SCALE));
    const guide = layout.guide ?? FRONT_GUIDE;
    return { ...scaled, guide: { armor: scaledMap(guide.armor, SUPERHEAVY_SCALE), other: scaledMap(guide.other, SUPERHEAVY_SCALE), cross: scaledMap(guide.cross, SUPERHEAVY_SCALE) } };
};

const ALL_USES = ["armor", "structure", "transfer"] as const;

/** A decoration and its twin turned over on the other side. */
const pair = (id: string, decor: IDecor, behind: boolean): IDollExtra[] => [
    { id: `${id}-left`, decor, at: { x: 0, y: 0 }, behind, uses: [...ALL_USES] },
    { id: `${id}-right`, decor, at: { x: 0, y: 0, mirror: true }, behind, uses: [...ALL_USES] },
];

/** The Land-Air 'Mech family, on the biped: a canopy head, and wings, a rotor or a fighter-mode picture beside the figure.
 * The wings and the rotor stand out above the arms' labels, which move out to leave them room. */
const landAir = (layout: IDollLayout, kind: NonNullable<IDollVariant["lam"]>): IDollLayout => {
    const moveArmLabels = (location: IDollLocation): IDollLocation =>
        location.loc === "la" || location.loc === "ra" ? { ...location, labelAt: [location.labelAt[0] + (location.loc === "la" ? -28 : 28), location.labelAt[1]] } : location;
    const canopy = swapped({ head: "head-canopy" });
    const landed = withParts(layout, (location) => canopy(kind === "vtol" ? location : moveArmLabels(location)));
    const extras: IDollExtra[] =
        kind === "vtol" ? [{ id: "rotor", decor: ROTOR, at: { x: 0, y: 0 }, behind: true, uses: [...ALL_USES] }]
        : kind === "partial-wing" ? pair("wing-fixed", FIXED_WING, true)
        : [...pair("wing-folded", FOLDED_WING, true), { id: "fighter-inset", decor: FIGHTER_INSET, at: { x: 0, y: 0 }, behind: false, uses: ["armor"] }];
    return { ...landed, extras: [...(layout.extras ?? []), ...extras] };
};

/** A pod under the foot of every leg of the figure: tracks on any layout, wheels (QuadVee) on the front-view ones. */
const withPods = (layout: IDollLayout, kind: "tracks" | "wheels"): IDollLayout => {
    // A pod hangs below the foot and, from above, reaches past it: the label that sits under a foot moves down and a side
    // label out, clear of it.
    const clear = (location: IDollLocation): IDollLocation => {
        if (!PARTS[location.part].foot) return location;
        const [x, y] = location.labelAt;
        const hang = location.shortHangsFrom;
        if (layout.view === "top") {
            const out = location.labelAnchor === "end" ? -POD_CLEARANCE_TOP : POD_CLEARANCE_TOP;
            return { ...location, labelAt: [x + out, y], shortHangsFrom: hang && [hang[0] + out, hang[1]] };
        }
        return location.labelAnchor === "middle" ? { ...location, labelAt: [x, y + POD_CLEARANCE_FRONT], shortHangsFrom: hang && [hang[0], hang[1] + POD_CLEARANCE_FRONT] } : location;
    };
    const extras = layout.front.flatMap((location): IDollExtra[] => {
        const part = PARTS[location.part];
        if (!part.foot) return [];
        const decor = layout.view === "top"
            ? topPod(part.foot, part.footDir ?? [0, 1])
            : frontPod(kind, part.foot, part.footWidth ?? 150);
        return [{ id: `pod-${location.loc}`, decor, at: location.at, behind: false, uses: [...ALL_USES] }];
    });
    // Labels moved down make the rear torsos below them move down too.
    const down = (location: IDollLocation): IDollLocation => ({
        ...location,
        at: { ...location.at, y: location.at.y + POD_CLEARANCE_FRONT },
        labelAt: [location.labelAt[0], location.labelAt[1] + POD_CLEARANCE_FRONT],
        shortHangsFrom: location.shortHangsFrom && [location.shortHangsFrom[0], location.shortHangsFrom[1] + POD_CLEARANCE_FRONT],
    });
    const rear = layout.view === "front" ? layout.rear.map(down) : layout.rear;
    return { ...layout, front: layout.front.map(clear), rear, extras: [...(layout.extras ?? []), ...extras] };
};

const POD_CLEARANCE_FRONT = 30;
const POD_CLEARANCE_TOP = 40;

/** The layout with the variant's swaps and additions; the layout itself when it has none. */
export const applyVariant = (layout: IDollLayout, variant: IDollVariant): IDollLayout => {
    let out = layout;
    if (variant.superheavy && (layout.id === "biped" || layout.id === "tripod")) out = superheavy(out);
    if (variant.armless && layout.id === "biped") out = withParts(out, swapped({ arm: "arm-cap" }));
    if (variant.lam && layout.id === "biped") out = landAir(out, variant.lam);
    if (variant.pods) out = withPods(out, variant.pods);
    return out;
};
