// How much room a doll needs on its sheet.
import { placePoint, placeShape } from "./geometry";
import { placedPlates } from "./mech-doll";
import { PARTS } from "./parts";
import { labelLines, labelPoint, layoutOf, locationsOf, type DollUse, type IDollUnit } from "./layouts";

/** Label type size and an average glyph width as a share of it, per use, to leave room for the labels. */
export const LABEL = { armor: { size: 20, glyph: 0.62 }, structure: { size: 15, glyph: 0.62 } } as const;
const MARGIN = 12;

/** The box a doll needs, in sheet units: every plate and label of the layout at that scale, so nothing is clipped. The
 * damage transfer diagram has no labels. `labelSize` is the type size the labels are drawn at, when it is not the use's own. */
export function dollBox(unit: Pick<IDollUnit, "layoutId" | "variant">, use: DollUse, scale: number, labelSize?: number, short = false) {
  const layout = layoutOf(unit);
  const locations = layout ? locationsOf(layout, use) : [];
  const frame = { centerX: 0, top: 0, scale };
  const xs: number[] = [];
  const ys: number[] = [];
  for (const location of locations) {
    for (const plate of placedPlates(location, frame)) {
      for (const [x, y] of plate) {
        xs.push(x);
        ys.push(y);
      }
    }
    if (use === "transfer") {
      // The figure has no labels, but its feet reach below the shin plates.
      const foot = PARTS[location.part].foot;
      if (foot) ys.push((placePoint(foot, location.at)[1] + 12) * scale);
      continue;
    }
    const { size: own, glyph } = LABEL[use];
    const size = (labelSize ?? own) * (layout?.labelScale ?? 1);
    const width = Math.max(...labelLines(location, short).map((line) => line.length + 5)) * size * glyph;
    const x = labelPoint(location, short)[0] * scale;
    const y = labelPoint(location, short)[1] * scale;
    const [from, to] = location.labelAnchor === "start" ? [x, x + width] : location.labelAnchor === "end" ? [x - width, x] : [x - width / 2, x + width / 2];
    xs.push(from, to);
    ys.push(y - size, y + labelLines(location, short).length * (size + 2));
  }
  for (const extra of layout?.extras ?? []) {
    if (!extra.uses.includes(use)) continue;
    for (const [x, y] of placeShape(extra.decor.bounds, extra.at)) {
      xs.push(x * scale);
      ys.push(y * scale);
    }
  }
  const left = Math.min(...xs) - MARGIN;
  const top = Math.min(...ys) - MARGIN;
  return { left, top, width: Math.max(...xs) + MARGIN - left, height: Math.max(...ys) + MARGIN - top };
}

/** The largest scale at which the doll's box fits the room, or undefined when it fits at none. */
export function fitDoll(unit: Pick<IDollUnit, "layoutId" | "variant">, use: DollUse, width: number, height: number, labelSize?: number, short = false): { scale: number; box: ReturnType<typeof dollBox> } | undefined {
  let low = 0.05;
  let high = 1.5;
  const fits = (scale: number) => {
    const box = dollBox(unit, use, scale, labelSize, short);
    return box.width <= width && box.height <= height;
  };
  if (!fits(low)) return undefined;
  for (let i = 0; i < 24; i += 1) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return { scale: low, box: dollBox(unit, use, low, labelSize, short) };
}
