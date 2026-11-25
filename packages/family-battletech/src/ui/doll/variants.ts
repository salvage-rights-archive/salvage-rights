// Salvage Rights paper doll engine. GPL-3.0-or-later.
import { mapPath, outline, polygonPath, slab, type IDecor } from "./parts-kit";
import { frontPod, FIGHTER_INSET, FIXED_WING, FOLDED_WING, ROTOR } from "./parts-variants";
import { HULL_TOP, STAR_AT, STAR_FACE, topPod } from "./parts-top";
import { PARTS, type PartId } from "./parts";
import { placePoint, type IPlacement } from "./geometry";
import type { BubblePoint } from "./shape-bubbles";
import type { IDollExtra, IDollGuide, IDollLayout, IDollLocation, IDollVariant } from "./layouts";

/** The center line and cross lines of the front view, in the biped's units. */
export const FRONT_GUIDE: IDollGuide = { armor: "M 0,40 L 0,950 M 0,962 L 0,1170", other: "M 0,40 L 0,950", cross: "M -360,230 L 360,230 M -360,520 L 360,520" };

/*
 * Variants: part swaps and additions on a layout, never new layouts. A variant leaves the layout's locations as they are;
 * it swaps the part that draws a location, moves a label out of the way, or adds a drawing that is no location (a wing, a
 * pod) and so has no plates, no bubbles and no button.
 */

export const flipAnchor = (anchor: IDollLocation["labelAnchor"]): IDollLocation["labelAnchor"] =>
    anchor === "start" ? "end" : anchor === "end" ? "start" : "middle";

/** The right-side twin of a left-side location: the same part turned over, its label on the other side. */
export const mirrored = (left: IDollLocation, loc: string, label: string[], transfersTo?: string): IDollLocation => ({
    loc,
    part: left.part,
    at: { ...left.at, x: -left.at.x, mirror: !left.at.mirror, rotate: left.at.rotate ? -left.at.rotate : undefined },
    label,
    labelAt: [-left.labelAt[0], left.labelAt[1]],
    labelAnchor: flipAnchor(left.labelAnchor),
    shortHangsFrom: left.shortHangsFrom && [-left.shortHangsFrom[0], left.shortHangsFrom[1]],
    leader: left.leader && [[-left.leader[0][0], left.leader[0][1]], [-left.leader[1][0], left.leader[1][1]]],
    transfersTo,
});

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

const SUPERHEAVY_PARTS: Partial<Record<PartId, PartId>> = { head: "head-super", "torso-center": "torso-center-super", "torso-center-trunk": "torso-center-trunk-super", "torso-side": "torso-side-super" };

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

// ---- Arms: two or four, on any layout. The layouts with arms already (biped, tripod, monoped, legless) keep their pair for
// two; the others (quad, pentapod, hexapod, octopod) gain one. Four arms are an upper pair and a lower pair. The arms are
// doll locations only (la ra, and la2 ra2 for the lower pair): no record configuration has them yet. Their points are the
// biped's arm figures; the rules do not cover them, so each arm's damage going to the torso on its side is provisional.

type ArmCount = NonNullable<IDollVariant["arms"]>;

const leftArm = (loc: string, part: PartId, at: IPlacement, label: string[], labelAt: BubblePoint, labelAnchor: IDollLocation["labelAnchor"], hang?: BubblePoint): IDollLocation =>
    ({ loc, part, at, label, labelAt, labelAnchor, shortHangsFrom: hang, transfersTo: "lt" });

const armNames = (count: ArmCount, row: "upper" | "lower"): [string[], string[]] =>
    count === 2 ? [["LEFT", "ARM"], ["RIGHT", "ARM"]] : row === "upper" ? [["UPPER", "LEFT", "ARM"], ["UPPER", "RIGHT", "ARM"]] : [["LOWER", "LEFT", "ARM"], ["LOWER", "RIGHT", "ARM"]];

/** The pair of arms whose left one is `left`, the right the same turned over. */
const armPair = (left: IDollLocation, row: "upper" | "lower", count: ArmCount): IDollLocation[] => {
    const [leftLabel, rightLabel] = armNames(count, row);
    const suffix = row === "lower" ? "2" : "";
    return [{ ...left, label: leftLabel, loc: `la${suffix}` }, mirrored({ ...left, label: leftLabel, loc: `la${suffix}` }, `ra${suffix}`, rightLabel, "rt")];
};

/** Where an arm seen from the front hangs: the shoulder (where the arm drawing's pivot lands) and its size. */
interface IArmSpot {
    x: number;
    y: number;
    s: number;
}

/** The arm positions per body: the biped-like bodies (which already have a pair for two arms) take a lower pair outside the
 * upper one for four; a quad's arms stand outside its front legs, so for both counts a strut drawn behind the arm joins each
 * shoulder to the torso. Each lower pair sits outside the upper pair's forearm, since the two cannot both hang beside the same
 * flank. */
const FRONT_ARMS: Record<"body" | "quad", Partial<Record<ArmCount, { upper: IArmSpot; lower?: IArmSpot }>>> = {
    body: { 4: { upper: { x: -256, y: 230, s: 0.8 }, lower: { x: -342, y: 380, s: 0.68 } } },
    quad: {
        2: { upper: { x: -336, y: 195, s: 0.9 } },
        4: { upper: { x: -336, y: 195, s: 0.9 }, lower: { x: -422, y: 330, s: 0.8 } },
    },
};

/** A shoulder strut from under the torso flank out to an arm's pauldron, drawn behind both. */
const strut = (arm: IArmSpot): IDecor => {
    const reach = arm.x + 38 * arm.s + 4, mid = arm.y + 5;
    const plate = slab(-200, mid - 12, reach, mid + 12, 5);
    return { bounds: plate, draw: (pen) => outline(polygonPath(plate), pen) };
};

const frontArms = (layout: IDollLayout, count: ArmCount): IDollLayout => {
    const set = FRONT_ARMS[layout.id === "quad" ? "quad" : "body"][count];
    if (!set) return layout;
    // The upper label stands left of the pauldron (hanging above it at the sheet's size); the lower one under the hand.
    const upperAt = set.upper;
    const upperEdge = upperAt.x - 66 * upperAt.s - 16;
    const upperLines = count === 4 ? 3 : 2;
    const upper = leftArm("la", "arm", { x: upperAt.x, y: upperAt.y, scale: upperAt.s }, [], [upperEdge, upperAt.y - 8 - (upperLines - 1) * 0], "end", [upperEdge, upperAt.y - 40 * upperAt.s - 112]);
    const arms = [...armPair(upper, "upper", count)];
    const extras: IDollExtra[] = layout.id === "quad" ? [...pair("strut-upper", strut(upperAt), true)] : [];
    if (count === 4 && set.lower) {
        const l = set.lower;
        const underHand = l.y + 470 * l.s;
        arms.push(...armPair(leftArm("la2", "arm", { x: l.x, y: l.y, scale: l.s }, [], [l.x - 20, underHand + 16], "middle", [l.x - 20, underHand + 8]), "lower", count));
        extras.push(...pair("strut-lower", strut(l), true));
    }
    const rest = layout.front.filter((location) => location.loc !== "la" && location.loc !== "ra");
    const at = rest.findIndex((location) => location.loc === "ct");
    const cut = at < 0 ? rest.length : at;
    return { ...layout, front: [...rest.slice(0, cut), ...arms, ...rest.slice(cut)], extras: [...(layout.extras ?? []), ...extras] };
};

/** Arms seen from above reach forward from the front of the hull, either side of the head: the upper pair from the inner front
 * corners of the flanks, a lower pair from the outer corners, fanned out so that neither meets the other, the head or the
 * first pair of legs. */
const topArms = (layout: IDollLayout, count: ArmCount): IDollLayout => {
    const tip = (at: IPlacement): BubblePoint => placePoint(PARTS["top-arm"].tip ?? [0, 0], at);
    const upperAt: IPlacement = { x: -110, y: HULL_TOP, rotate: -4, scale: 0.7 };
    const [ux, uy] = tip(upperAt);
    const lines = count === 4 ? 3 : 2;
    const upper = leftArm("la", "top-arm", upperAt, [], [ux, uy - 12 - (lines - 1) * 22], "middle", [ux - 70, uy - 170]);
    const arms: IDollLocation[] = [...armPair(upper, "upper", count)];
    if (count === 4) {
        const lowerAt: IPlacement = { x: -165, y: HULL_TOP + 2, rotate: -38, scale: 0.72 };
        const [lx, ly] = tip(lowerAt);
        arms.unshift(...armPair(leftArm("la2", "top-arm", lowerAt, [], [lx - 34, ly - 30], "end", [lx - 34, ly - 110]), "lower", count));
    }
    // With four arms the first pair of legs steps back, so that the lower arms do not cross its thighs.
    const back = (location: IDollLocation): IDollLocation => location.loc === "l1" || location.loc === "r1" ? {
        ...location,
        at: { ...location.at, y: location.at.y + 55 },
        labelAt: [location.labelAt[0], location.labelAt[1] + 55],
        shortHangsFrom: location.shortHangsFrom && [location.shortHangsFrom[0], location.shortHangsFrom[1] + 55],
    } : location;
    return { ...layout, front: [...arms, ...(count === 4 ? layout.front.map(back) : layout.front)] };
};

/** The five-legged body's two arms reach forward from the front-left and front-right face torsos, either side of the
 * forward point. Four arms do not fit there without meeting the torso labels, so the pentapod takes two at most. */
const pentapodArms = (layout: IDollLayout): IDollLayout => {
    const a = -126 * Math.PI / 180;
    const along = 40;
    const shoulder: BubblePoint = [
        STAR_AT[0] + Math.cos(a) * STAR_FACE[1] - Math.sin(a) * along,
        STAR_AT[1] + Math.sin(a) * STAR_FACE[1] + Math.cos(a) * along,
    ];
    const at: IPlacement = { x: shoulder[0], y: shoulder[1], rotate: -4, scale: 0.7 };
    const [tx, ty] = placePoint(PARTS["top-arm"].tip ?? [0, 0], at);
    const arm = leftArm("la", "top-arm", at, [], [tx - 14, ty - 52], "middle", [tx - 150, ty - 175]);
    return { ...layout, front: [...armPair(arm, "upper", 2), ...layout.front] };
};

const withArms = (layout: IDollLayout, count: ArmCount): IDollLayout => {
    if (layout.id === "pentapod") return pentapodArms(layout);
    if (layout.id === "hexapod" || layout.id === "octopod") return topArms(layout, count);
    if (layout.view !== "front" || layout.id.startsWith("micro")) return layout;
    // A biped-like body that already has its pair keeps it for two arms.
    if (count === 2 && layout.front.some((location) => location.loc === "la")) return layout;
    return frontArms(layout, count);
};

/** The layout with the variant's swaps and additions; the layout itself when it has none. */
export const applyVariant = (layout: IDollLayout, variant: IDollVariant): IDollLayout => {
    let out = layout;
    if (variant.arms) out = withArms(out, variant.arms);
    if (variant.superheavy && (layout.id === "biped" || layout.id === "tripod")) out = superheavy(out);
    if (variant.armless && layout.id === "biped") out = withParts(out, swapped({ arm: "arm-cap" }));
    if (variant.lam && layout.id === "biped") out = landAir(out, variant.lam);
    if (variant.pods) out = withPods(out, variant.pods);
    return out;
};
