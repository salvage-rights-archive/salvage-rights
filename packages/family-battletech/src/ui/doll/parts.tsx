// Salvage Rights paper doll engine. GPL-3.0-or-later.
import { FRONT_PARTS, FRONT_PIVOTS, type FrontPartId } from "./parts-front";
import type { IPart } from "./parts-kit";

/*
 * The 'Mech parts kit, every part by id. A part is drawn once (see parts-front.tsx for the bodies seen from the front),
 * carries the plates its bubbles sit on and a label point, and is placed, mirrored, scaled and turned by a layout.
 */

export type { IDecor, IPart } from "./parts-kit";
export type PartId = FrontPartId;

/** Where each part was drawn: a layout places every part it uses at its own pivot. */
export const PART_PIVOTS = { ...FRONT_PIVOTS } satisfies Record<PartId, [number, number]>;

export const PARTS: Record<PartId, IPart> = { ...FRONT_PARTS };
