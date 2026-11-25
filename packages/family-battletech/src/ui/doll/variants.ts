// Salvage Rights paper doll engine. GPL-3.0-or-later.
import { mapPath, outline, polygonPath, slab, type IDecor } from "./parts-kit";
import { frontPod, FIGHTER_INSET, FIXED_WING, FOLDED_WING, ROTOR, SHIELD } from "./parts-variants";
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

/** On a Land-Air 'Mech: how much further out a shield's short label hangs, how much further out a shield stands beyond a
 * fixed wing, and how much lower the fighter-mode picture stands, under the shield on the right arm. */
const SHIELD_LABEL_OUT_LAM = 40;
const SHIELD_OUT_WING = 90;
const INSET_UNDER_SHIELD = 620;

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
    // Under folded wings the arm labels stand further out, so a shield's short label, which hangs in the same row at the sheet's
    // size, hangs further out too. A fixed wing reaches out past the arm, so there the whole shield stands beyond its tip.
    const moveShield = (location: IDollLocation): IDollLocation => {
        if (location.part !== "shield" && location.part !== "shield-absorb") return location;
        const side = location.at.x < 0 ? -1 : 1;
        const hang = location.shortHangsFrom;
        if (kind !== "partial-wing") return location.part === "shield" && hang ? { ...location, shortHangsFrom: [hang[0] + side * SHIELD_LABEL_OUT_LAM, hang[1]] } : location;
        const dx = side * SHIELD_OUT_WING;
        return { ...location, at: { ...location.at, x: location.at.x + dx }, labelAt: [location.labelAt[0] + dx, location.labelAt[1]], shortHangsFrom: hang && [hang[0] + dx, hang[1]] };
    };
    const canopy = swapped({ head: "head-canopy" });
    const landed = withParts(layout, (location) => canopy(kind === "vtol" ? location : moveShield(moveArmLabels(location))));
    // The fighter-mode picture stands right of the figure: beside the leg, under the shield, when the right arm carries one.
    const insetDown = layout.front.some((location) => location.loc === "rsh") ? INSET_UNDER_SHIELD : 0;
    const extras: IDollExtra[] =
        kind === "vtol" ? [{ id: "rotor", decor: ROTOR, at: { x: 0, y: 0 }, behind: true, uses: [...ALL_USES] }]
        : kind === "partial-wing" ? pair("wing-fixed", FIXED_WING, true)
        : [...pair("wing-folded", FOLDED_WING, true), { id: "fighter-inset", decor: FIGHTER_INSET, at: { x: 0, y: insetDown }, behind: false, uses: ["armor"] }];
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

// ---- Shields: a shield location beside the arm that carries it, outside it, on every layout that has arms. Of four arms the
// outer one of the side (the lower pair) carries it, since nothing can stand beside the inner one; no record has four arms
// yet, so which arm holds the shield is the doll's own choice until the rules say. A shield is two doll locations, both on
// the armor diagram only and neither a button: the Damage Capacity boxes (lsh, rsh: circles) and the Damage Absorbance boxes
// (lsha, rsha: diamonds). The published sheets were read for the arrangement: the shield outside the arm, DC above DA,
// nothing on the internal structure or damage transfer diagrams.

/** How far the arm seen from the front reaches from its pivot, in its own units: its outer edge and the top of its pauldron. */
const ARM_REACH = { out: 80, up: 64 } as const;
/** The arm seen from above: how long it is to its tip and half its width. */
const TOP_ARM = { length: 284, half: 40 } as const;
/** A shield beside an arm seen from above is this share of the arm's own scale, so that a full large shield is still read. */
const TOP_SHIELD_SCALE = 0.74;
/** How far past the hand a shield seen from above reaches, so that its near end clears the first leg: little beside the one
 * pair of arms of a six- or eight-legged body, more beside the lower pair of four, most on the five-legged body, whose
 * front legs stand right beside its arms. */
const TOP_SHIELD_PAST = { hull2: 50, hull4: 90, star: 166 } as const;

interface IShieldSpot {
    at: IPlacement;
    anchor: IDollLocation["labelAnchor"];
    label: BubblePoint;
    hang: BubblePoint;
    absorbLabel: BubblePoint;
    absorbHang: BubblePoint;
    /** Where the carrying arm's own label moves to, out of the shield's way. */
    arm?: { labelAt?: BubblePoint; shortHangsFrom?: BubblePoint };
}

/** The shield beside a left arm seen from the front: upright, its top a little below the pauldron's, its name over it and
 * the absorbance count under it. `u` is the labels' scale. */
const frontShield = (arm: IDollLocation, u: number): IShieldSpot => {
    const s = arm.at.scale ?? 1, k = Math.max(s, 0.85 * u);
    const top = arm.at.y - ARM_REACH.up * s + 40 * u;
    const cx = arm.at.x - ARM_REACH.out * s - (16 + SHIELD.half) * k;
    const bottom = top + SHIELD.length * k;
    // An arm whose label stands left of its pauldron (a quad's) gives that place to the shield: the label moves over the pauldron.
    const over = arm.at.x + 40 * s;
    // At the sheet's size the shield's code hangs level with its arm's, where that is above the shield, so the two read as one row.
    const level = arm.labelAnchor === "end" && arm.shortHangsFrom ? arm.shortHangsFrom[1] : arm.labelAt[1] - 32 * u;
    return {
        at: { x: cx, y: top, scale: k },
        anchor: "middle",
        label: [cx, top - 56 * u],
        hang: [cx - 14 * u, level < top - 90 * u ? level : top - 100 * u],
        absorbLabel: [cx, bottom + 26 * u],
        absorbHang: [cx, bottom + 8 * u],
        arm: arm.labelAnchor === "end" ? {
            labelAt: [over, top - 40 * u - 14 - (arm.label.length - 1) * 22],
            shortHangsFrom: arm.shortHangsFrom && [over, arm.shortHangsFrom[1]],
        } : undefined,
    };
};

/** The shield beside a left arm seen from above: lying along the arm on its outer side, reaching past the hand, its labels
 * left of its outer edge. */
const topShield = (arm: IDollLocation, kind: keyof typeof TOP_SHIELD_PAST): IShieldSpot => {
    const s = arm.at.scale ?? 1, k = s * TOP_SHIELD_SCALE;
    const out = TOP_ARM.half * s + 16 + SHIELD.half * k;
    const [x, y] = placePoint([-out, -TOP_ARM.length * s - TOP_SHIELD_PAST[kind]], { x: arm.at.x, y: arm.at.y, rotate: arm.at.rotate });
    const at: IPlacement = { x, y, rotate: arm.at.rotate, scale: k };
    const edge = (along: number): BubblePoint => placePoint([-SHIELD.half, along], at);
    const [tx, ty] = placePoint(PARTS["top-arm"].tip ?? [0, 0], arm.at);
    const [nameX, nameY] = edge(0), [countX, countY] = edge(330), [innerX, innerY] = placePoint([SHIELD.half, 0], at);
    return {
        at,
        anchor: "end",
        label: [nameX - 8, nameY + 12],
        // At the sheet's size the code stands over the far end and the absorbance count left of it, under one another.
        hang: [innerX, Math.min(nameY, innerY) - 105],
        absorbLabel: [countX - 8, countY + 6],
        absorbHang: [nameX - 8, nameY + 10],
        arm: kind === "hull2" ? { labelAt: [tx + 24, ty - 34], shortHangsFrom: [tx + 40, ty - 170] }
            : kind === "hull4" ? { labelAt: [tx + 71, ty - 86], shortHangsFrom: [tx + 46, ty - 116] }
            : { labelAt: [tx + 26, ty - 52], shortHangsFrom: [tx + 30, ty - 125] },
    };
};

const SHIELD_ONLY = { uses: ["armor"], fixed: true } satisfies Partial<IDollLocation>;

const withShields = (layout: IDollLayout, shields: NonNullable<IDollVariant["shields"]>): IDollLayout => {
    // The left arm that carries: the outer one of two on a side. The right side is the left one turned over.
    const carrier = (side: "l" | "r"): IDollLocation | undefined =>
        layout.front.find((location) => location.loc === `${side}a2`) ?? layout.front.find((location) => location.loc === `${side}a`);
    const left = carrier("l");
    if (!left || (left.part !== "arm" && left.part !== "top-arm")) return layout;
    const spot = layout.view === "front" ? frontShield(left, layout.labelScale ?? 1)
        : topShield(left, layout.id === "pentapod" ? "star" : left.loc === "la2" ? "hull4" : "hull2");
    const capacity: IDollLocation = { loc: "lsh", part: "shield", at: spot.at, label: ["LEFT", "SHIELD", "DC"], labelAt: spot.label, labelAnchor: spot.anchor, shortHangsFrom: spot.hang };
    const absorb: IDollLocation = { loc: "lsha", part: "shield-absorb", at: spot.at, label: ["DA"], labelAt: spot.absorbLabel, labelAnchor: spot.anchor, shortHangsFrom: spot.absorbHang };
    const added: IDollLocation[] = [];
    const moved = new Map<string, IDollLocation>();
    if (shields.left) {
        added.push({ ...capacity, ...SHIELD_ONLY }, { ...absorb, ...SHIELD_ONLY, marks: "diamond", shortLabel: ["DA", ""] });
        if (spot.arm) moved.set(left.loc, { ...left, labelAt: spot.arm.labelAt ?? left.labelAt, shortHangsFrom: spot.arm.shortHangsFrom ?? left.shortHangsFrom });
    }
    const right = carrier("r");
    if (shields.right && right) {
        added.push(
            { ...mirrored(capacity, "rsh", ["RIGHT", "SHIELD", "DC"]), ...SHIELD_ONLY },
            { ...mirrored(absorb, "rsha", ["DA"]), ...SHIELD_ONLY, marks: "diamond", shortLabel: ["DA", ""] },
        );
        const flip = (point: BubblePoint | undefined): BubblePoint | undefined => point && [-point[0], point[1]];
        if (spot.arm) moved.set(right.loc, { ...right, labelAt: flip(spot.arm.labelAt) ?? right.labelAt, shortHangsFrom: flip(spot.arm.shortHangsFrom) ?? right.shortHangsFrom });
    }
    return { ...layout, front: [...added, ...layout.front.map((location) => moved.get(location.loc) ?? location)] };
};

/** The layout with the variant's swaps and additions; the layout itself when it has none. */
export const applyVariant = (layout: IDollLayout, variant: IDollVariant): IDollLayout => {
    let out = layout;
    if (variant.arms) out = withArms(out, variant.arms);
    // An armless body carries no shield.
    if (variant.shields && !(variant.armless && layout.id === "biped")) out = withShields(out, variant.shields);
    if (variant.superheavy && (layout.id === "biped" || layout.id === "tripod")) out = superheavy(out);
    if (variant.armless && layout.id === "biped") out = withParts(out, swapped({ arm: "arm-cap" }));
    if (variant.lam && layout.id === "biped") out = landAir(out, variant.lam);
    if (variant.pods) out = withPods(out, variant.pods);
    return out;
};
