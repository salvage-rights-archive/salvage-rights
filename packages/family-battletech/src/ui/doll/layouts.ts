// Salvage Rights paper doll engine. GPL-3.0-or-later.
import { locationName, maxArmor, structurePoints, type LocationCode, type MechRecord } from "../../rules/mech";
import { placePoint, type IPlacement } from "./geometry";
import { PART_PIVOTS, PARTS, type PartId } from "./parts";
import { mapPath } from "./parts-kit";
import { BAY, HEAD_CENTER, HIP_X, ROW } from "./parts-top";
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
    /** Where damage goes once this location is destroyed (the damage transfer diagram's arrow). */
    transfersTo?: string;
}

export interface IDollLayout {
    id: DollLayoutId;
    view: "front" | "top";
    /** Drawn in this order, back to front. */
    front: IDollLocation[];
    rear: IDollLocation[];
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

export const FRONT_GUIDE: IDollGuide = { armor: "M 0,40 L 0,950 M 0,962 L 0,1170", other: "M 0,40 L 0,950", cross: "M -360,230 L 360,230 M -360,520 L 360,520" };

export interface IDollVariant {
    tracks: boolean;
    armless: boolean;
    superheavy: boolean;
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
export const layoutOf = (unit: Pick<IDollUnit, "layoutId" | "variant">): IDollLayout | undefined => DOLL_LAYOUTS[unit.layoutId];

/** A location label lines: its full name, or only its code (CT, LTR) where the figure is drawn too small for names. */
export const labelLines = (location: IDollLocation, short = false): string[] =>
    short ? (location.loc === "hd" ? ["HD"] : [location.loc.toUpperCase(), ""]) : location.label;

/** Where a location label starts: the head's short label rises clear of the head, which a small figure would cover. */
export const labelPoint = (location: IDollLocation, short = false): BubblePoint =>
    short && location.shortHangsFrom ? location.shortHangsFrom
        : short && location.loc === "hd" ? [location.labelAt[0], location.labelAt[1] - 55] : location.labelAt;

export const STRUCTURE_SCALE = 0.6;
export const TRANSFER_SCALE = 0.2;
/** The widest bubble spacing, in sheet units. */
export const ARMOR_PITCH = 30;
export const STRUCTURE_PITCH = 20;

const flipAnchor = (anchor: IDollLocation["labelAnchor"]): IDollLocation["labelAnchor"] =>
    anchor === "start" ? "end" : anchor === "end" ? "start" : "middle";

/** The right-side twin of a left-side location: the same part turned over, its label on the other side. */
const mirrored = (left: IDollLocation, loc: string, label: string[], transfersTo?: string): IDollLocation => ({
    loc,
    part: left.part,
    at: { ...left.at, x: -left.at.x, mirror: !left.at.mirror, rotate: left.at.rotate ? -left.at.rotate : undefined },
    label,
    labelAt: [-left.labelAt[0], left.labelAt[1]],
    labelAnchor: flipAnchor(left.labelAnchor),
    shortHangsFrom: left.shortHangsFrom && [-left.shortHangsFrom[0], left.shortHangsFrom[1]],
    transfersTo,
});

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

// A four-legged 'Mech seen from the front and above, as its record sheet shows it: the front legs outside, the rear legs
// (the far pair) in the gap between them and the center torso, drawn first. Each leg's label sits under its foot.
// Damage transfer: a destroyed leg's damage moves to the torso on its side, a side torso's to the center torso, and the
// head's and center torso's nowhere (Total Warfare, Transferring Damage, p.123; a destroyed side torso blows off the
// front leg on its side, Torso Destruction, p.121).
const FRONT_LEFT_LEG: IDollLocation = { loc: "fll", part: "quad-leg-front", at: home("quad-leg-front"), label: ["FRONT", "LEFT", "LEG"], labelAt: [-282, 912], labelAnchor: "middle", shortHangsFrom: [-282, 892], transfersTo: "lt" };
const REAR_LEFT_LEG: IDollLocation = { loc: "rll", part: "quad-leg-rear", at: home("quad-leg-rear"), label: ["REAR", "LEFT", "LEG"], labelAt: [-136, 898], labelAnchor: "middle", shortHangsFrom: [-136, 872], transfersTo: "lt" };

const QUAD: IDollLayout = {
    id: "quad",
    view: "front",
    front: [
        REAR_LEFT_LEG,
        mirrored(REAR_LEFT_LEG, "rrl", ["REAR", "RIGHT", "LEG"], "rt"),
        FRONT_LEFT_LEG,
        mirrored(FRONT_LEFT_LEG, "frl", ["FRONT", "RIGHT", "LEG"], "rt"),
        LEFT_TORSO,
        mirrored(LEFT_TORSO, "rt", ["RIGHT", "TORSO"], "ct"),
        CENTER_TORSO,
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

// A tripod: the biped with a third, center leg between the two side legs. The legs stand as the biped's do; the center leg
// hangs low, so that the center torso's label fits above it, and its label sits under its foot, which pushes the rear torsos
// down. A destroyed center leg's damage goes to the center torso, a side leg's to the torso on its side (Interstellar
// Operations: Alternate Eras, Tripod 'Mech Game Rules, p. 159).
const CENTER_LEG: IDollLocation = { loc: "cl", part: "center-leg", at: home("center-leg"), label: ["CENTER", "LEG"], labelAt: [0, 968], labelAnchor: "middle", shortHangsFrom: [0, 950], transfersTo: "ct" };

const TRIPOD: IDollLayout = {
    id: "tripod",
    view: "front",
    front: [
        CENTER_LEG,
        LEFT_LEG,
        mirrored(LEFT_LEG, "rl", ["RIGHT", "LEG"], "rt"),
        LEFT_TORSO,
        mirrored(LEFT_TORSO, "rt", ["RIGHT", "TORSO"], "ct"),
        LEFT_ARM,
        mirrored(LEFT_ARM, "ra", ["RIGHT", "ARM"], "rt"),
        { ...CENTER_TORSO, labelAt: [0, 640] },
        HEAD,
    ],
    rear: rearTorsosMoved(70),
};

// A monoped: one broad piston leg in the middle, its label beside the foot. The rules for these are not in the app yet, so
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
        { ...CENTER_TORSO, labelAt: [112, 540], labelAnchor: "start" },
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

const HULL_TOP = 230;
const LEG_ANGLES: Record<number, number[]> = { 2: [26, -26], 3: [28, 0, -28], 4: [34, 12, -12, -34] };
const legCenterY = (row: number): number => HULL_TOP + row * ROW + (ROW - 20) / 2;

/** A left leg in a row of a hull with `rows` leg pairs, its label beyond the foot. */
const topLeg = (loc: string, row: number, rows: number, label: string[], transfersTo: string): IDollLocation => {
    const at: IPlacement = { x: HIP_X, y: legCenterY(row), rotate: LEG_ANGLES[rows]?.[row] ?? 0 };
    const [fx, fy] = placePoint(PARTS["top-leg"].foot ?? [0, 0], at);
    const up = label.length * 11;
    return { loc, part: "top-leg", at, label, labelAt: [fx - 60, fy - up + 8], labelAnchor: "end", shortHangsFrom: [fx - 56, fy - 18], transfersTo };
};

/** A hull of `rows` leg pairs, whose legs are `legs` (left, right), and the aft plates `aftTop` down the sheet. */
const hullLayout = (id: DollLayoutId, rows: 2 | 3 | 4, legs: IDollLocation[], tail: IDollLocation[], aftTop: number): IDollLayout => {
    const head: IDollLocation = { loc: "hd", part: "hull-head", at: { x: 0, y: HULL_TOP + HEAD_CENTER }, label: ["HEAD"], labelAt: [0, HULL_TOP + HEAD_CENTER - 54], labelAnchor: "middle" };
    const center: IDollLocation = { loc: "ct", part: `hull-center-${rows}`, at: { x: 0, y: HULL_TOP }, label: ["CENTER", "TORSO"], labelAt: [0, HULL_TOP - 62], labelAnchor: "middle", shortHangsFrom: [0, HULL_TOP - BAY + 8] };
    const flankLeft: IDollLocation = { loc: "lt", part: `hull-flank-${rows}`, at: { x: 0, y: HULL_TOP }, label: ["LEFT", "TORSO"], labelAt: [-76, HULL_TOP - 165], labelAnchor: "end", shortHangsFrom: [-104, HULL_TOP - 190], transfersTo: "ct" };
    const aftSide: IDollLocation = { loc: "ltr", part: "hull-aft-side", at: { x: -158, y: aftTop }, label: ["LEFT TORSO", "(REAR)"], labelAt: [-262, aftTop + 46], labelAnchor: "end" };
    return {
        id,
        view: "top",
        front: [
            ...tail, ...legs, flankLeft, mirrored(flankLeft, "rt", ["RIGHT", "TORSO"], "ct"), center, head,
        ],
        rear: [
            aftSide, mirrored(aftSide, "rtr", ["RIGHT TORSO", "(REAR)"]),
            { loc: "ctr", part: "hull-aft-center", at: { x: 0, y: aftTop }, label: ["CENTER TORSO (REAR)"], labelAt: [0, aftTop + 176], labelAnchor: "middle" },
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

/** A pentapod: the quad's four legs and a fifth, the tail leg, pointing back from the rear center. */
const PENTAPOD_TAIL: IDollLocation = (() => {
    const at: IPlacement = { x: 0, y: HULL_TOP + 2 * ROW - 30, rotate: -90, scale: 0.9 };
    const [fx, fy] = placePoint(PARTS["top-leg"].foot ?? [0, 0], at);
    return { loc: "cl", part: "top-leg", at, label: ["CENTER", "LEG"], labelAt: [fx + 64, fy - 12], labelAnchor: "start", shortHangsFrom: [fx + 56, fy - 22], transfersTo: "ct" };
})();

const PENTAPOD = hullLayout("pentapod", 2, legPairs(2, [
    ["fll", ["FRONT", "LEFT", "LEG"], "frl", ["FRONT", "RIGHT", "LEG"]],
    ["rll", ["REAR", "LEFT", "LEG"], "rrl", ["REAR", "RIGHT", "LEG"]],
]), [PENTAPOD_TAIL], 830);
const HEXAPOD = hullLayout("hexapod", 3, legPairs(3, numbered(3)), [], HULL_TOP + 3 * ROW + 140);
const OCTOPOD = hullLayout("octopod", 4, legPairs(4, numbered(4)), [], HULL_TOP + 4 * ROW + 140);

/** The same figure at a smaller scale, for the very small 'Mechs: every part, position and label moved in by `k`, the
 * labels' type with them, so that a given bubble is larger against the figure. */
const scaledLayout = (base: IDollLayout, id: DollLayoutId, k: number): IDollLayout => {
    const scale = (location: IDollLocation): IDollLocation => ({
        ...location,
        at: { ...location.at, x: location.at.x * k, y: location.at.y * k, scale: (location.at.scale ?? 1) * k },
        labelAt: [location.labelAt[0] * k, location.labelAt[1] * k],
        shortHangsFrom: location.shortHangsFrom && [location.shortHangsFrom[0] * k, location.shortHangsFrom[1] * k],
    });
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

/** A doll location's display name, from the record's own names; the rear torsos add "(Rear)". */
export const dollLocationName = (loc: string): string => {
    const at = Object.hasOwn(RECORD_OF, loc) ? RECORD_OF[loc] : undefined;
    if (at) return `${locationName(at.code)}${at.rear ? " (Rear)" : ""}`;
    // The legs of a hexapod or octopod are numbered from the front; these are doll codes only, with no record location yet.
    const numbered = /^([lr])([1-4])$/.exec(loc);
    return numbered ? `${numbered[1] === "l" ? "Left" : "Right"} Leg ${numbered[2]}` : loc;
};

/** The layout each configuration draws with; none is drawn for the rest yet. */
const LAYOUT_OF_CONFIGURATION: Record<string, DollLayoutId> = { biped: "biped", quad: "quad", tripod: "tripod" };

/** A tripod's limits and structure are a biped's with a third leg that has the same structure as the other two (Interstellar
 * Operations: Alternate Eras, Tripod 'Mech Construction Rules, p. 159); the rules module has no tripod table yet. */
const pointsFor = (record: MechRecord, of: (record: MechRecord) => Partial<Record<LocationCode, number>>): Partial<Record<LocationCode, number>> => {
    if (record.configuration !== "tripod") return of(record);
    const points = of({ ...record, configuration: "biped" });
    return points.LL === undefined ? points : { ...points, CL: points.LL };
};

const recordLocation = (loc: string) => (Object.hasOwn(RECORD_OF, loc) ? RECORD_OF[loc] : undefined);

/** The record location (HD, LT, FLL) a doll location (lower case; the rear torsos end in "r") stands for. */
export const recordCodeOf = (loc: string): LocationCode | undefined => recordLocation(loc)?.code;

export const dollUnitFromRecord = (record: MechRecord): IDollUnit | undefined => {
    const layoutId = Object.hasOwn(LAYOUT_OF_CONFIGURATION, record.configuration) ? LAYOUT_OF_CONFIGURATION[record.configuration] : undefined;
    if (!layoutId) return undefined;
    const max = pointsFor(record, maxArmor), structure = pointsFor(record, structurePoints);
    return {
        layoutId,
        variant: { tracks: false, armless: false, superheavy: record.tons > 100 },
        armor: (loc) => {
            const at = recordLocation(loc);
            if (!at) return 0;
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

