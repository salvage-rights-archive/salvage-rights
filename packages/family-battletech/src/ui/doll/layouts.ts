// Salvage Rights paper doll engine. GPL-3.0-or-later.
import { MECH_SHIELD_BOXES } from "../../data/sheet";
import { locationName, maxArmor, structurePoints, type LocationCode, type MechRecord } from "../../rules/mech";
import { placePoint, type IPlacement } from "./geometry";
import { PART_PIVOTS, PARTS, type PartId } from "./parts";
import { mapPath, type IDecor } from "./parts-kit";
import { applyVariant, FRONT_GUIDE, mirrored, scaleLocation } from "./variants";
import { HEAD_CENTER, HIP_X, HULL_TOP, ROW, STAR_AT } from "./parts-top";
import type { BubblePoint } from "./shape-bubbles";

/*
 * Body-type layouts: which part draws each location and where, its label, and where its damage goes when the location
 * is destroyed. Layout units are the Armor Diagram box's: x from its center line, y from its top; the front view sits
 * within y 60-940 and the rear torsos within y 965-1165. The Internal Structure box and the damage transfer diagram
 * draw the same layout smaller (STRUCTURE_SCALE, TRANSFER_SCALE).
 */

export type DollUse = "armor" | "structure" | "transfer";

export type DollLayoutId = "biped" | "tripod" | "quad" | "monoped" | "pentapod" | "hexapod" | "octopod" | "legless" | "micro-biped" | "micro-quad";

export interface IDollLocation {
    /** The location code that armor damage and bubble clicks use. */
    loc: string;
    part: PartId;
    at: IPlacement;
    /** The label's lines; the count goes on the last one ("" puts it on a line of its own). */
    label: string[];
    labelAt: BubblePoint;
    labelAnchor: "start" | "middle" | "end";
    /** Where a short label (the code, on a figure drawn small) hangs from: its top edge, so it clears the part above. */
    shortHangsFrom?: BubblePoint;
    /** A short line from the label to the location it names, where the label stands clear of it (armor and structure). */
    leader?: [BubblePoint, BubblePoint];
    /** Where damage goes once this location is destroyed (the damage transfer diagram's arrow). */
    transfersTo?: string;
    /** The uses that draw this location, where it is not all of them: a shield is drawn on the armor diagram only. */
    uses?: DollUse[];
    /** Its points are set by what it is, not by the player: drawn and named, never a button. */
    fixed?: boolean;
    /** What marks each point, where it is not a circle. */
    marks?: "diamond";
    /** The short label's lines, where they are not the location's code over its count. */
    shortLabel?: string[];
}

export interface IDollLayout {
    id: DollLayoutId;
    view: "front" | "top";
    /** Drawn in this order, back to front. */
    front: IDollLocation[];
    rear: IDollLocation[];
    /** Drawings that are no location, from a variant. */
    extras?: IDollExtra[];
    /** The blueprint pen's center line and cross lines, where the figure's own are not the biped's. */
    guide?: IDollGuide;
    /** The labels' type size as a share of the use's own: a figure drawn small has its labels drawn small with it. */
    labelScale?: number;
}

/** Path data of the blueprint pen's lines: the center line with the rear torsos, without them, and the cross lines. */
export interface IDollGuide {
    armor: string;
    other: string;
    cross: string;
}

export { FRONT_GUIDE };

/** A drawing on a figure that is no location: a wing, a rotor, a pod, a picture beside it. It is drawn in the figure's units
 * at `at`, behind the locations or over them, in the uses listed. */
export interface IDollExtra {
    id: string;
    decor: IDecor;
    at: IPlacement;
    behind: boolean;
    uses: DollUse[];
}

/** The part swaps and additions a unit asks for; each applies to the layouts it fits and leaves the locations as they are. */
export interface IDollVariant {
    /** Track pods or wheel pods under every leg (wheels on the front-view layouts only). */
    pods?: "tracks" | "wheels";
    /** A shoulder cap in place of each arm, on the biped. */
    armless: boolean;
    /** The superheavy head and shells, on the biped and the tripod. */
    superheavy: boolean;
    /** Two or four arms, on any layout: the bodies with arms keep their pair for two; the others gain them. A five-legged
     * body takes two at most. */
    arms?: 2 | 4;
    /** The Land-Air 'Mech family, on the biped: canopy head and folded wings (LAM, bimodal), a rotor (VTOL), fixed wings. */
    lam?: "lam" | "bimodal" | "vtol" | "partial-wing";
    /** A shield carried on the left arm, the right arm or both, on any layout with arms: a shield location beside the arm
     * (of four arms, beside the outer one on that side). */
    shields?: { left?: boolean; right?: boolean };
}

/** What the doll needs from a unit: counts per location (already capped by the rules) and the damage marked. */
export interface IDollUnit {
    layoutId: DollLayoutId;
    variant: IDollVariant;
    armor(loc: string): number;
    structure(loc: string): number;
    armorDamaged(loc: string, index: number): boolean;
    structureDamaged(loc: string, index: number): boolean;
}

/** The layout a unit is drawn with. */
const resolved = new Map<string, IDollLayout>();
export const layoutOf = (unit: Pick<IDollUnit, "layoutId" | "variant">): IDollLayout | undefined => {
    const base = DOLL_LAYOUTS[unit.layoutId];
    if (!base) return undefined;
    const key = `${unit.layoutId}|${JSON.stringify(unit.variant)}`;
    const known = resolved.get(key);
    if (known) return known;
    const made = applyVariant(base, unit.variant);
    resolved.set(key, made);
    return made;
};

/** The locations a use draws, back to front: the front view, with the rear torsos on the armor diagram. */
export const locationsOf = (layout: IDollLayout, use: DollUse): IDollLocation[] =>
    (use === "armor" ? [...layout.front, ...layout.rear] : layout.front).filter((location) => !location.uses || location.uses.includes(use));

/** A location label lines: its full name, or only its code (CT, LTR) where the figure is drawn too small for names. */
export const labelLines = (location: IDollLocation, short = false): string[] =>
    short ? (location.shortLabel ?? (location.loc === "hd" ? ["HD"] : [location.loc.toUpperCase(), ""])) : location.label;

/** Where a location label starts: the head's short label rises clear of the head, which a small figure would cover. */
export const labelPoint = (location: IDollLocation, short = false): BubblePoint =>
    short && location.shortHangsFrom ? location.shortHangsFrom
        : short && location.loc === "hd" ? [location.labelAt[0], location.labelAt[1] - 55] : location.labelAt;

export const STRUCTURE_SCALE = 0.6;
export const TRANSFER_SCALE = 0.2;
/** The widest bubble spacing, in sheet units. */
export const ARMOR_PITCH = 30;
export const STRUCTURE_PITCH = 20;

/** A part where its own drawing put it. */
const home = (part: PartId): IPlacement => ({ x: PART_PIVOTS[part][0], y: PART_PIVOTS[part][1] });

const LEFT_LEG: IDollLocation = { loc: "ll", part: "leg", at: home("leg"), label: ["LEFT", "LEG"], labelAt: [-368, 902], labelAnchor: "start", transfersTo: "lt" };
const LEFT_TORSO: IDollLocation = { loc: "lt", part: "torso-side", at: home("torso-side"), label: ["LEFT", "TORSO"], labelAt: [-84, 104], labelAnchor: "end", transfersTo: "ct" };
const LEFT_ARM: IDollLocation = { loc: "la", part: "arm", at: home("arm"), label: ["LEFT", "ARM"], labelAt: [-368, 104], labelAnchor: "start", transfersTo: "lt" };
const LEFT_TORSO_REAR: IDollLocation = { loc: "ltr", part: "torso-side-rear", at: home("torso-side-rear"), label: ["LEFT TORSO", "(REAR)"], labelAt: [-226, 1054], labelAnchor: "end" };

const CENTER_TORSO: IDollLocation = { loc: "ct", part: "torso-center", at: home("torso-center"), label: ["CENTER", "TORSO", ""], labelAt: [0, 646], labelAnchor: "middle" };
const HEAD: IDollLocation = { loc: "hd", part: "head", at: home("head"), label: ["HEAD"], labelAt: [0, 74], labelAnchor: "middle" };
const CENTER_TORSO_REAR: IDollLocation = { loc: "ctr", part: "torso-center-rear", at: home("torso-center-rear"), label: ["CENTER TORSO (REAR)"], labelAt: [0, 1190], labelAnchor: "middle" };

/** The rear torsos below the front view, the same on every layout that has them. */
const REAR_TORSOS: IDollLocation[] = [
    LEFT_TORSO_REAR,
    mirrored(LEFT_TORSO_REAR, "rtr", ["RIGHT TORSO", "(REAR)"]),
    CENTER_TORSO_REAR,
];

const BIPED: IDollLayout = {
    id: "biped",
    view: "front",
    front: [
        LEFT_LEG,
        mirrored(LEFT_LEG, "rl", ["RIGHT", "LEG"], "rt"),
        LEFT_TORSO,
        mirrored(LEFT_TORSO, "rt", ["RIGHT", "TORSO"], "ct"),
        LEFT_ARM,
        mirrored(LEFT_ARM, "ra", ["RIGHT", "ARM"], "rt"),
        CENTER_TORSO,
        HEAD,
    ],
    rear: REAR_TORSOS,
};

// A four-legged 'Mech seen from the front: the rear legs (the far pair, smaller, drawn first) stand under the body with a small
// gap between them, the front legs beside them, and each side torso has a shelf out over its front leg's hip so the leg hangs
// from the torso. The center torso has no pelvis: the legs begin under it. Each leg's label sits under its foot.
// Damage transfer: a destroyed leg's damage moves to the torso on its side, a side torso's to the center torso, and the
// head's and center torso's nowhere (Total Warfare, Transferring Damage, p.123; a destroyed side torso blows off the
// front leg on its side, Torso Destruction, p.121).
/** The center torso of the bodies with no pelvis: its label is printed on the bare lower shell, between the chest plate and
 * the waist ring (the short label hangs from the top of that shell). */
const TRUNK: IDollLocation = { ...CENTER_TORSO, part: "torso-center-trunk", at: home("torso-center-trunk"), labelAt: [0, 390], shortHangsFrom: [0, 368] };

const FRONT_LEFT_LEG: IDollLocation = { loc: "fll", part: "quad-leg-front", at: home("quad-leg-front"), label: ["FRONT", "LEFT", "LEG"], labelAt: [-236, 912], labelAnchor: "middle", shortHangsFrom: [-236, 892], transfersTo: "lt" };
const REAR_LEFT_LEG: IDollLocation = { loc: "rll", part: "quad-leg-rear", at: home("quad-leg-rear"), label: ["REAR", "LEFT", "LEG"], labelAt: [-76, 898], labelAnchor: "middle", shortHangsFrom: [-76, 872], transfersTo: "lt" };

const QUAD: IDollLayout = {
    id: "quad",
    view: "front",
    front: [
        REAR_LEFT_LEG,
        mirrored(REAR_LEFT_LEG, "rrl", ["REAR", "RIGHT", "LEG"], "rt"),
        FRONT_LEFT_LEG,
        mirrored(FRONT_LEFT_LEG, "frl", ["FRONT", "RIGHT", "LEG"], "rt"),
        { ...LEFT_TORSO, part: "torso-side-wide", at: home("torso-side-wide") },
        mirrored({ ...LEFT_TORSO, part: "torso-side-wide", at: home("torso-side-wide") }, "rt", ["RIGHT", "TORSO"], "ct"),
        TRUNK,
        HEAD,
    ],
    rear: REAR_TORSOS,
};

/** A location moved down the sheet by `dy`, its label with it. */
const moved = (location: IDollLocation, dy: number): IDollLocation => ({
    ...location,
    at: { ...location.at, y: location.at.y + dy },
    labelAt: [location.labelAt[0], location.labelAt[1] + dy],
    shortHangsFrom: location.shortHangsFrom && [location.shortHangsFrom[0], location.shortHangsFrom[1] + dy],
});

/** The rear torsos moved to clear what hangs below or above the front view. */
const rearTorsosMoved = (dy: number): IDollLocation[] => REAR_TORSOS.map((location) => moved(location, dy));

// A tripod: the biped without its pelvis and with a third leg, the side legs' drawing seen square on, hung straight down from
// the center torso on the body's center line, the side legs set a little wider apart to make room. The center leg's label sits under its foot, which
// pushes the rear torsos down. A destroyed center leg's damage goes to the center torso, a side leg's to the torso on its side (Interstellar
// Operations: Alternate Eras, Tripod 'Mech Game Rules, p. 159).
const CENTER_LEG: IDollLocation = { loc: "cl", part: "leg-center", at: home("leg-center"), label: ["CENTER", "LEG"], labelAt: [0, 968], labelAnchor: "middle", shortHangsFrom: [0, 950], transfersTo: "ct" };
const SIDE_LEG: IDollLocation = { ...LEFT_LEG, at: { ...home("leg"), x: home("leg").x - 12 } };

const TRIPOD: IDollLayout = {
    id: "tripod",
    view: "front",
    front: [
        CENTER_LEG,
        SIDE_LEG,
        mirrored(SIDE_LEG, "rl", ["RIGHT", "LEG"], "rt"),
        LEFT_TORSO,
        mirrored(LEFT_TORSO, "rt", ["RIGHT", "TORSO"], "ct"),
        LEFT_ARM,
        mirrored(LEFT_ARM, "ra", ["RIGHT", "ARM"], "rt"),
        TRUNK,
        HEAD,
    ],
    rear: rearTorsosMoved(70),
};

// A monoped: one broad piston leg hung straight from the pelvis-less center torso, its label beside the foot. The rules for these are not in the app yet, so
// the arrows are provisional: each arm's damage goes to the torso on its side, a side torso's to the center torso, and the
// center leg's to the center torso.
const MONO_LEG: IDollLocation = { loc: "cl", part: "mono-leg", at: home("mono-leg"), label: ["CENTER", "LEG"], labelAt: [150, 912], labelAnchor: "start", shortHangsFrom: [150, 892], transfersTo: "ct" };

const MONOPED: IDollLayout = {
    id: "monoped",
    view: "front",
    front: [
        MONO_LEG,
        LEFT_TORSO,
        mirrored(LEFT_TORSO, "rt", ["RIGHT", "TORSO"], "ct"),
        LEFT_ARM,
        mirrored(LEFT_ARM, "ra", ["RIGHT", "ARM"], "rt"),
        TRUNK,
        HEAD,
    ],
    rear: REAR_TORSOS,
};

// A legless 'Mech: the torsos and arms over a thruster skirt that is part of the center torso, with the center torso's label
// under the skirt. Arrows are provisional until the rules are read, as for the monoped.
const LEGLESS: IDollLayout = {
    id: "legless",
    view: "front",
    front: [
        LEFT_TORSO,
        mirrored(LEFT_TORSO, "rt", ["RIGHT", "TORSO"], "ct"),
        LEFT_ARM,
        mirrored(LEFT_ARM, "ra", ["RIGHT", "ARM"], "rt"),
        { ...CENTER_TORSO, part: "torso-center-legless", at: home("torso-center-legless"), label: ["CENTER TORSO", ""], labelAt: [0, 776], shortHangsFrom: [0, 762] },
        HEAD,
    ],
    rear: rearTorsosMoved(-150),
};

// ---- Five, six and eight legs, seen from above: a hull of a head plate, a center spine and two flanks, the legs set along
// its sides in pairs, front pair angled forward and rear pair back, and the rear armor as plates on the aft hull below.
// The rules for these bodies are not in the app yet, so their arrows are provisional until the rules are read: each leg
// sends its damage to the nearest side torso, a center leg to the center torso, a side torso to the center torso.

const LEG_ANGLES: Record<number, number[]> = { 2: [26, -26], 3: [28, 0, -28], 4: [34, 12, -12, -34] };
const legCenterY = (row: number): number => HULL_TOP + row * ROW + (ROW - 20) / 2;

/** A left leg in a row of a hull with `rows` leg pairs, its label beyond the foot. */
const topLeg = (loc: string, row: number, rows: number, label: string[], transfersTo: string): IDollLocation => {
    const at: IPlacement = { x: HIP_X, y: legCenterY(row), rotate: LEG_ANGLES[rows]?.[row] ?? 0 };
    const [fx, fy] = placePoint(PARTS["top-leg"].foot ?? [0, 0], at);
    const up = label.length * 11;
    return { loc, part: "top-leg", at, label, labelAt: [fx - 60, fy - up + 8], labelAnchor: "end", shortHangsFrom: [fx - 56, fy - 18], transfersTo };
};

/** A hull of `rows` leg pairs, whose legs are `legs` (left, right). The three torso labels stand in one row under the hull,
 * each beneath its own column (left flank, spine, right flank); the aft plates start below the lowest foot, so that no
 * leg label meets theirs. */
const hullLayout = (id: DollLayoutId, rows: 2 | 3 | 4, legs: IDollLocation[]): IDollLayout => {
    const hullBottom = HULL_TOP + rows * ROW - 20;
    const lowestFoot = Math.max(...legs.map((leg) => placePoint(PARTS["top-leg"].foot ?? [0, 0], leg.at)[1]));
    const aftTop = Math.max(hullBottom + 170, lowestFoot + 130);
    const head: IDollLocation = { loc: "hd", part: "hull-head", at: { x: 0, y: HULL_TOP + HEAD_CENTER }, label: ["HEAD"], labelAt: [0, HULL_TOP + HEAD_CENTER - 54], labelAnchor: "middle" };
    const center: IDollLocation = { loc: "ct", part: `hull-center-${rows}`, at: { x: 0, y: HULL_TOP }, label: ["CENTER", "TORSO", ""], labelAt: [0, hullBottom + 42], labelAnchor: "middle", shortHangsFrom: [0, hullBottom + 22] };
    const flankLeft: IDollLocation = { loc: "lt", part: `hull-flank-${rows}`, at: { x: 0, y: HULL_TOP }, label: ["LEFT", "TORSO", ""], labelAt: [-121, hullBottom + 42], labelAnchor: "middle", shortHangsFrom: [-178, hullBottom + 22], transfersTo: "ct" };
    const aftSide: IDollLocation = { loc: "ltr", part: "hull-aft-side", at: { x: -158, y: aftTop }, label: ["LEFT TORSO", "(REAR)"], labelAt: [-262, aftTop + 46], labelAnchor: "end" };
    return {
        id,
        view: "top",
        front: [
            ...legs, flankLeft, mirrored(flankLeft, "rt", ["RIGHT", "TORSO", ""], "ct"), center, head,
        ],
        rear: [
            aftSide, mirrored(aftSide, "rtr", ["RIGHT TORSO", "(REAR)"]),
            { loc: "ctr", part: "hull-aft-center", at: { x: 0, y: aftTop }, label: ["CENTER TORSO (REAR)"], labelAt: [0, aftTop + 176], labelAnchor: "middle", shortHangsFrom: [0, aftTop + 158] },
        ],
        guide: { armor: `M 0,40 L 0,${aftTop + 150}`, other: `M 0,40 L 0,${HULL_TOP + rows * ROW}`, cross: "" },
    };
};

/** The pairs of left and right legs, one pair to a row, named by the codes and labels the layout uses. */
const legPairs = (rows: 2 | 3 | 4, names: [string, string[], string, string[]][]): IDollLocation[] =>
    names.flatMap(([left, leftLabel, right, rightLabel], row) => {
        const l = topLeg(left, row, rows, leftLabel, "lt");
        return [l, mirrored(l, right, rightLabel, "rt")];
    });

const numbered = (rows: 3 | 4): [string, string[], string, string[]][] =>
    Array.from({ length: rows }, (_, i): [string, string[], string, string[]] => [`l${i + 1}`, ["LEFT", `LEG ${i + 1}`], `r${i + 1}`, ["RIGHT", `LEG ${i + 1}`]]);

// ---- The five-legged 'Mech, a starfish seen from above (the owner's design): a turret head at the middle, the center torso
// a ring of five plates around it, five face torsos on the sides of the pentagon, and a leg radiating from each face torso.
// A vertex points forward and a flat side faces aft, so one leg goes straight back and the others are front left, front
// right, left and right. Each face torso is its own outward face: there are no rear-armor plates. The rules for this body
// are not in the app yet: each face torso takes the side torso's points and each leg the leg's, and the arrows are
// provisional (each leg to its own face torso, each face torso to the center torso). Each face torso has 6 critical spaces;
// the center torso keeps its 12, filled as on any 'Mech, and holds the cockpit as on a tripod; the turret head has 12 spaces;
// to be worked out further with the owner when its rules are written (owner's design, 2026-11-25).

const STAR_LEG_AT = 216;
/** Each face: its torso and leg codes, the direction it faces (degrees clockwise from the sheet's +x), which way its torso label
 * leans along the face (away from the leader lines that go to the head and the center torso), and its names. */
const STAR_FACES: { torso: string; leg: string; angle: number; lean: 1 | -1; torsoLabel: string[]; legLabel: string[] }[] = [
    { torso: "flt", leg: "fll", angle: -126, lean: -1, torsoLabel: ["FRONT LEFT", "TORSO"], legLabel: ["FRONT", "LEFT", "LEG"] },
    { torso: "frt", leg: "frl", angle: -54, lean: 1, torsoLabel: ["FRONT RIGHT", "TORSO"], legLabel: ["FRONT", "RIGHT", "LEG"] },
    { torso: "rt", leg: "rl", angle: 18, lean: -1, torsoLabel: ["RIGHT", "TORSO"], legLabel: ["RIGHT", "LEG"] },
    { torso: "at", leg: "al", angle: 90, lean: -1, torsoLabel: ["AFT", "TORSO"], legLabel: ["AFT", "LEG"] },
    { torso: "lt", leg: "ll", angle: 162, lean: 1, torsoLabel: ["LEFT", "TORSO"], legLabel: ["LEFT", "LEG"] },
];

/** A point `radius` out from the middle of the star along `angle` degrees. */
const starPoint = (angle: number, radius: number, across = 0): BubblePoint => {
    const a = angle * Math.PI / 180;
    return [STAR_AT[0] + Math.cos(a) * radius - Math.sin(a) * across, STAR_AT[1] + Math.sin(a) * radius + Math.cos(a) * across];
};

const starLocations = (): IDollLocation[] => {
    const legs = STAR_FACES.map(({ leg, torso, angle, legLabel }): IDollLocation => {
        const right = Math.cos(angle * Math.PI / 180) > 0.1 || angle === 90;
        const [px, py] = starPoint(angle, STAR_LEG_AT);
        const at: IPlacement = { x: px, y: py, rotate: right ? angle : angle - 180, mirror: right || undefined };
        const [fx, fy] = placePoint(PARTS["top-leg"].foot ?? [0, 0], at);
        const nx = Math.cos(angle * Math.PI / 180), ny = Math.sin(angle * Math.PI / 180);
        const anchor: IDollLocation["labelAnchor"] = nx < -0.3 ? "end" : nx > 0.3 ? "start" : "middle";
        const x = fx + nx * 64, y = ny > 0.5 ? fy + 76 : fy + ny * 40 - (legLabel.length - 1) * 11;
        return { loc: leg, part: "top-leg", at, label: legLabel, labelAt: [x, y], labelAnchor: anchor, shortHangsFrom: [fx + nx * 125, ny > 0.5 ? fy + 60 : fy - 14 + ny * 95], transfersTo: torso };
    });
    const faces = STAR_FACES.map(({ torso, angle, lean, torsoLabel }): IDollLocation => {
        const nx = Math.cos(angle * Math.PI / 180), ny = Math.sin(angle * Math.PI / 180);
        // The label sits just outside the face, beside its leg, on the side away from the head and center torso lines.
        const reach = 212 + Math.abs(nx) * 70 + Math.abs(ny) * 26 + (torso === "lt" || torso === "rt" ? 130 : 0);
        const [x, y] = starPoint(angle, reach, lean * 120);
        // At the record sheet's size the codes are large against the figure: they stand further out.
        const [sx, sy] = starPoint(angle, reach + 75, lean * 150);
        return {
            loc: torso, part: "star-face", at: { x: STAR_AT[0], y: STAR_AT[1], rotate: angle + 90 },
            label: torsoLabel, labelAt: [x, y - 5], labelAnchor: "middle", shortHangsFrom: [sx, sy - 26], transfersTo: "ct",
        };
    });
    return [...legs, ...faces];
};

const starPentapod = (): IDollLayout => {
    const [hx, hy] = starPoint(-90, 330), [cx, cy] = starPoint(126, 340);
    const turret: IDollLocation = {
        loc: "hd", part: "star-turret", at: { x: STAR_AT[0], y: STAR_AT[1] }, label: ["HEAD"], labelAt: [hx, hy - 8], labelAnchor: "middle",
        shortHangsFrom: [hx, hy - 24], leader: [[hx, hy + 6], starPoint(-90, 52)],
    };
    const ring: IDollLocation = {
        loc: "ct", part: "star-ring", at: { x: STAR_AT[0], y: STAR_AT[1] }, label: ["CENTER", "TORSO"], labelAt: [cx, cy - 5], labelAnchor: "middle",
        shortHangsFrom: [cx, cy - 26], leader: [starPoint(126, 305), starPoint(126, 136)],
    };
    return {
        id: "pentapod",
        view: "top",
        front: [...starLocations(), ring, turret],
        rear: [],
        guide: { armor: "M 0,60 L 0,900", other: "M 0,60 L 0,900", cross: "" },
    };
};

const PENTAPOD = starPentapod();
const HEXAPOD = hullLayout("hexapod", 3, legPairs(3, numbered(3)));
const OCTOPOD = hullLayout("octopod", 4, legPairs(4, numbered(4)));

/** The same figure at a smaller scale, for the very small 'Mechs: every part, position and label moved in by `k`, the
 * labels' type with them, so that a given bubble is larger against the figure. */
const scaledLayout = (base: IDollLayout, id: DollLayoutId, k: number): IDollLayout => {
    const scale = (location: IDollLocation): IDollLocation => scaleLocation(location, k);
    const guide = base.guide ?? FRONT_GUIDE;
    const guideScaled = (d: string): string => mapPath(d, ([x, y]) => [x * k, y * k]);
    return {
        ...base, id, front: base.front.map(scale), rear: base.rear.map(scale), labelScale: k,
        guide: { armor: guideScaled(guide.armor), other: guideScaled(guide.other), cross: guideScaled(guide.cross) },
    };
};

export const DOLL_LAYOUTS: Partial<Record<DollLayoutId, IDollLayout>> = {
    biped: BIPED,
    quad: QUAD,
    tripod: TRIPOD,
    monoped: MONOPED,
    legless: LEGLESS,
    pentapod: PENTAPOD,
    hexapod: HEXAPOD,
    octopod: OCTOPOD,
    "micro-biped": scaledLayout(BIPED, "micro-biped", 0.6),
    "micro-quad": scaledLayout(QUAD, "micro-quad", 0.6),
};

/** The record location a doll location reads, and whether it reads the rear armor. */
const RECORD_OF: Record<string, { code: LocationCode; rear: boolean }> = {
    hd: { code: "HD", rear: false }, ct: { code: "CT", rear: false }, lt: { code: "LT", rear: false },
    rt: { code: "RT", rear: false }, la: { code: "LA", rear: false }, ra: { code: "RA", rear: false },
    ll: { code: "LL", rear: false }, rl: { code: "RL", rear: false }, cl: { code: "CL", rear: false },
    fll: { code: "FLL", rear: false }, frl: { code: "FRL", rear: false }, rll: { code: "RLL", rear: false }, rrl: { code: "RRL", rear: false },
    ctr: { code: "CT", rear: true }, ltr: { code: "LT", rear: true }, rtr: { code: "RT", rear: true },
};

const STAR_NAMES: Record<string, string> = { flt: "Front Left Torso", frt: "Front Right Torso", at: "Aft Torso", al: "Aft Leg" };

/** The shield locations: the Damage Capacity boxes (lsh, rsh) and the Damage Absorbance boxes (lsha, rsha) of each side. */
const SHIELD_LOCATIONS: Record<string, { side: "left" | "right"; counts: "capacity" | "absorbance"; name: string }> = {
    lsh: { side: "left", counts: "capacity", name: "Left Shield Damage Capacity" },
    rsh: { side: "right", counts: "capacity", name: "Right Shield Damage Capacity" },
    lsha: { side: "left", counts: "absorbance", name: "Left Shield Damage Absorbance" },
    rsha: { side: "right", counts: "absorbance", name: "Right Shield Damage Absorbance" },
};

/** What the doll draws for the shields a unit carries: the points of Damage Capacity on each arm and, where known, of
 * Damage Absorbance. A side with no shield has no entry. */
export interface IDollShields {
    left?: number;
    right?: number;
    absorbLeft?: number;
    absorbRight?: number;
}

/** The shield boxes of a record: for each arm, those of the first shield mounted in it (the 'Mech Shield Table,
 * data/sheet.ts). It asks only where the shield is; whether it may be there is the rules check's business. */
export const shieldPointsForDoll = (record: MechRecord): IDollShields => {
    const boxes = (arm: LocationCode) => {
        const id = record.mounts.find((mount) => mount.location === arm && mount.equipmentId !== null && Object.hasOwn(MECH_SHIELD_BOXES.rows, mount.equipmentId))?.equipmentId;
        return id ? MECH_SHIELD_BOXES.rows[id] : undefined;
    };
    const left = boxes("LA"), right = boxes("RA");
    return {
        ...(left ? { left: left.capacity, absorbLeft: left.absorbance } : {}),
        ...(right ? { right: right.capacity, absorbRight: right.absorbance } : {}),
    };
};

/** The points a shield location draws; undefined for any other location. */
const shieldCount = (loc: string, shields: IDollShields): number | undefined => {
    const at = Object.hasOwn(SHIELD_LOCATIONS, loc) ? SHIELD_LOCATIONS[loc] : undefined;
    if (!at) return undefined;
    const count = at.counts === "capacity" ? (at.side === "left" ? shields.left : shields.right) : (at.side === "left" ? shields.absorbLeft : shields.absorbRight);
    return Math.max(0, count ?? 0);
};

/** A doll location's display name, from the record's own names; the rear torsos add "(Rear)". */
export const dollLocationName = (loc: string, arms?: 2 | 4): string => {
    const at = Object.hasOwn(RECORD_OF, loc) ? RECORD_OF[loc] : undefined;
    if (Object.hasOwn(SHIELD_LOCATIONS, loc)) return SHIELD_LOCATIONS[loc]?.name ?? loc;
    if (at) return `${arms === 4 && (loc === "la" || loc === "ra") ? "Upper " : ""}${locationName(at.code)}${at.rear ? " (Rear)" : ""}`;
    // The legs of a hexapod or octopod are numbered from the front; these are doll codes only, with no record location yet.
    if (loc === "la2" || loc === "ra2") return `Lower ${loc === "la2" ? "Left" : "Right"} Arm`;
    const numbered = /^([lr])([1-4])$/.exec(loc);
    if (numbered) return `${numbered[1] === "l" ? "Left" : "Right"} Leg ${numbered[2]}`;
    // The five-legged body's face torsos and aft leg are doll codes only too.
    return STAR_NAMES[loc] ?? loc;
};

/** The layout each configuration draws with; none is drawn for the rest yet. */
const LAYOUT_OF_CONFIGURATION: Record<string, DollLayoutId> = { biped: "biped", quad: "quad", tripod: "tripod", lam: "biped", "bimodal-lam": "biped" };

/** The Land-Air 'Mech picture (canopy head, folded wings, fighter-mode inset) for the configurations that are one. */
const LAM_VARIANT: Record<string, IDollVariant["lam"]> = { lam: "lam", "bimodal-lam": "bimodal" };

const recordLocation = (loc: string) => (Object.hasOwn(RECORD_OF, loc) ? RECORD_OF[loc] : undefined);

/** The record location (HD, LT, FLL) a doll location (lower case; the rear torsos end in "r") stands for. */
export const recordCodeOf = (loc: string): LocationCode | undefined => recordLocation(loc)?.code;

export const dollUnitFromRecord = (record: MechRecord, shields: IDollShields = shieldPointsForDoll(record)): IDollUnit | undefined => {
    const layoutId = Object.hasOwn(LAYOUT_OF_CONFIGURATION, record.configuration) ? LAYOUT_OF_CONFIGURATION[record.configuration] : undefined;
    if (!layoutId) return undefined;
    const max = maxArmor(record), structure = structurePoints(record);
    return {
        layoutId,
        variant: { armless: false, superheavy: record.tons > 100, ...(Object.hasOwn(LAM_VARIANT, record.configuration) ? { lam: LAM_VARIANT[record.configuration] } : {}),
            ...(shields.left || shields.right ? { shields: { left: Boolean(shields.left), right: Boolean(shields.right) } } : {}),
        },
        armor: (loc) => {
            const at = recordLocation(loc);
            if (!at) return shieldCount(loc, shields) ?? 0;
            // The doll draws at most what a location can carry; the rules check reports any excess.
            const limit = max[at.code] ?? 0, entry = record.armor[at.code];
            const front = Math.max(0, Math.min(entry?.front ?? 0, limit));
            // A torso's maximum covers front and rear together: the rear gets what the front leaves.
            return at.rear ? Math.max(0, Math.min(entry?.rear ?? 0, limit - front)) : front;
        },
        structure: (loc) => {
            const at = recordLocation(loc);
            return at && !at.rear ? Math.max(0, structure[at.code] ?? 0) : 0;
        },
        armorDamaged: () => false,
        structureDamaged: () => false,
    };
};

