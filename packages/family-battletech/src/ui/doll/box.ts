// How much room a doll needs on its sheet.
import { placedPlates } from "./mech-doll";
import { DOLL_LAYOUTS, labelLines, labelPoint, type DollLayoutId, type DollUse } from "./layouts";

/** Label type size and an average glyph width as a share of it, per use, to leave room for the labels. */
export const LABEL = { armor: { size: 20, glyph: 0.62 }, structure: { size: 15, glyph: 0.62 } } as const;
const MARGIN = 12;

/** The box a doll needs, in sheet units: every plate and label of the layout at that scale, so nothing is clipped. The
 * damage transfer diagram has no labels. `labelSize` is the type size the labels are drawn at, when it is not the use's own. */
export function dollBox(layoutId: DollLayoutId, use: DollUse, scale: number, labelSize?: number, short = false) {
  const layout = DOLL_LAYOUTS[layoutId];
  const locations = layout ? (use === "armor" ? [...layout.front, ...layout.rear] : layout.front) : [];
  const unit = { centerX: 0, top: 0, scale };
  const xs: number[] = [];
  const ys: number[] = [];
  for (const location of locations) {
    for (const plate of placedPlates(location, unit)) {
      for (const [x, y] of plate) {
        xs.push(x);
        ys.push(y);
      }
    }
    if (use === "transfer") continue;
    const { size: own, glyph } = LABEL[use];
    const size = labelSize ?? own;
    const width = Math.max(...labelLines(location, short).map((line) => line.length + 5)) * size * glyph;
    const x = labelPoint(location, short)[0] * scale;
    const y = labelPoint(location, short)[1] * scale;
    const [from, to] = location.labelAnchor === "start" ? [x, x + width] : location.labelAnchor === "end" ? [x - width, x] : [x - width / 2, x + width / 2];
    xs.push(from, to);
    ys.push(y - size, y + labelLines(location, short).length * (size + 2));
  }
  const left = Math.min(...xs) - MARGIN;
  const top = Math.min(...ys) - MARGIN;
  return { left, top, width: Math.max(...xs) + MARGIN - left, height: Math.max(...ys) + MARGIN - top };
}

/** The largest scale at which the doll's box fits the room, or undefined when it fits at none. */
export function fitDoll(layoutId: DollLayoutId, use: DollUse, width: number, height: number, labelSize?: number, short = false): { scale: number; box: ReturnType<typeof dollBox> } | undefined {
  let low = 0.05;
  let high = 1.5;
  const fits = (scale: number) => {
    const box = dollBox(layoutId, use, scale, labelSize, short);
    return box.width <= width && box.height <= height;
  };
  if (!fits(low)) return undefined;
  for (let i = 0; i < 24; i += 1) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return { scale: low, box: dollBox(layoutId, use, low, labelSize, short) };
}
