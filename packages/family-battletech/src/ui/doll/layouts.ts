// Salvage Rights paper doll engine. GPL-3.0-or-later.
import { locationName, maxArmor, structurePoints, type LocationCode, type MechRecord } from "../../rules/mech";
import type { IPlacement } from "./geometry";
import { BIPED_PIVOTS, type PartId } from "./parts";
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
    /** Where damage goes once this location is destroyed (the damage transfer diagram's arrow). */
    transfersTo?: string;
}

export interface IDollLayout {
    id: DollLayoutId;
    view: "front" | "top";
    /** Drawn in this order, back to front. */
    front: IDollLocation[];
    rear: IDollLocation[];
    /** Sheet units in the Internal Structure box: x from its center line, y from its top. */
}

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

/** A location label lines: its full name, or only its code (CT, LTR) where the figure is drawn too small for names. */
export const labelLines = (location: IDollLocation, short = false): string[] =>
    short ? (location.loc === "hd" ? ["HD"] : [location.loc.toUpperCase(), ""]) : location.label;

/** Where a location label starts: the head's short label rises clear of the head, which a small figure would cover. */
export const labelPoint = (location: IDollLocation, short = false): BubblePoint =>
    short && location.loc === "hd" ? [location.labelAt[0], location.labelAt[1] - 55] : location.labelAt;

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
    transfersTo,
});

/** A part where the biped drawing put it. */
const home = (part: PartId): IPlacement => ({ x: BIPED_PIVOTS[part][0], y: BIPED_PIVOTS[part][1] });

const LEFT_LEG: IDollLocation = { loc: "ll", part: "leg", at: home("leg"), label: ["LEFT", "LEG"], labelAt: [-368, 902], labelAnchor: "start", transfersTo: "lt" };
const LEFT_TORSO: IDollLocation = { loc: "lt", part: "torso-side", at: home("torso-side"), label: ["LEFT", "TORSO"], labelAt: [-84, 104], labelAnchor: "end", transfersTo: "ct" };
const LEFT_ARM: IDollLocation = { loc: "la", part: "arm", at: home("arm"), label: ["LEFT", "ARM"], labelAt: [-368, 104], labelAnchor: "start", transfersTo: "lt" };
const LEFT_TORSO_REAR: IDollLocation = { loc: "ltr", part: "torso-side-rear", at: home("torso-side-rear"), label: ["LEFT TORSO", "(REAR)"], labelAt: [-226, 1054], labelAnchor: "end" };

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
        { loc: "ct", part: "torso-center", at: home("torso-center"), label: ["CENTER", "TORSO", ""], labelAt: [0, 646], labelAnchor: "middle" },
        { loc: "hd", part: "head", at: home("head"), label: ["HEAD"], labelAt: [0, 74], labelAnchor: "middle" },
    ],
    rear: [
        LEFT_TORSO_REAR,
        mirrored(LEFT_TORSO_REAR, "rtr", ["RIGHT TORSO", "(REAR)"]),
        { loc: "ctr", part: "torso-center-rear", at: home("torso-center-rear"), label: ["CENTER TORSO (REAR)"], labelAt: [0, 1190], labelAnchor: "middle" },
    ],
};

export const DOLL_LAYOUTS: Partial<Record<DollLayoutId, IDollLayout>> = {
    biped: BIPED,
};

/** The record location a doll location reads, and whether it reads the rear armor. */
const RECORD_OF: Record<string, { code: LocationCode; rear: boolean }> = {
    hd: { code: "HD", rear: false }, ct: { code: "CT", rear: false }, lt: { code: "LT", rear: false },
    rt: { code: "RT", rear: false }, la: { code: "LA", rear: false }, ra: { code: "RA", rear: false },
    ll: { code: "LL", rear: false }, rl: { code: "RL", rear: false },
    ctr: { code: "CT", rear: true }, ltr: { code: "LT", rear: true }, rtr: { code: "RT", rear: true },
};

/** A doll location's display name, from the record's own names; the rear torsos add "(Rear)". */
export const dollLocationName = (loc: string): string => {
    const at = Object.hasOwn(RECORD_OF, loc) ? RECORD_OF[loc] : undefined;
    return at ? `${locationName(at.code)}${at.rear ? " (Rear)" : ""}` : loc;
};

/** The layout each configuration draws with; none is drawn for the rest yet. */
const LAYOUT_OF_CONFIGURATION: Record<string, DollLayoutId> = { biped: "biped" };

const recordLocation = (loc: string) => (Object.hasOwn(RECORD_OF, loc) ? RECORD_OF[loc] : undefined);

export const dollUnitFromRecord = (record: MechRecord): IDollUnit | undefined => {
    const layoutId = Object.hasOwn(LAYOUT_OF_CONFIGURATION, record.configuration) ? LAYOUT_OF_CONFIGURATION[record.configuration] : undefined;
    if (!layoutId) return undefined;
    const max = maxArmor(record), structure = structurePoints(record);
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

