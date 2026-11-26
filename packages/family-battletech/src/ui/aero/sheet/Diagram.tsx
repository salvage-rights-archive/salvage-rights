// The armor diagram of a fighter's sheet: our own drawing of a fighter seen from above, nose up, one shape per armor area, with a bubble for each armor
// point placed inside its area by the doll engine (`packBubbles`), so the bubbles follow the drawing. The drawing is plain polygons; the areas are the
// profile's (AeroTech (1986): cockpit, nose, wings, fuselage, engine; the later sheets: nose, wings, aft) and the Structural Integrity boxes sit in the
// fuselage. A huge armor count never hangs the page: at most MAX_BUBBLES_DRAWN bubbles are drawn in an area, and the printed figure keeps the true count.
import { INK } from "../../sheet/text";
import { squeeze } from "../../sheet/text";
import Bubble from "../../doll/bubble";
import { drawnBubble, packBubbles, shapePoints } from "../../doll/shape-bubbles";
import type { BubblePoint, Shape } from "../../doll/shape-bubbles";
import type { SheetProfile } from "../../../data/aero-sheet";
import type { ArmorArea } from "./facts";
import type { Rect } from "../../sheet/Frame";

/** Most armor bubbles drawn in one area, however many points the record says; the printed number keeps the true count. */
export const MAX_BUBBLES_DRAWN = 150;
/** Most Structural Integrity circles drawn. */
export const MAX_SI_DRAWN = 40;
/** The widest spacing of armor bubbles, in the diagram's own units. */
const MAX_PITCH = 22;

const mirror = (shape: Shape): Shape => shape.map(([x, y]): BubblePoint => [560 - x, y]);
const NOSE: Shape = [[280, 30], [322, 130], [334, 262], [226, 262], [238, 130]];
const CP: Shape = [[280, 30], [318, 115], [242, 115]];
const NO_BELOW_CP: Shape = [[242, 115], [318, 115], [334, 262], [226, 262]];
const FUSELAGE: Shape = [[226, 262], [334, 262], [334, 560], [226, 560]];
const LEFT_WING: Shape = [[226, 262], [30, 500], [30, 640], [226, 540]];
const AFT_BODY: Shape = [[238, 560], [322, 560], [314, 800], [246, 800]];
const AFT_FIN: Shape = [[238, 690], [168, 775], [168, 835], [240, 800]];

/** The shapes of each area, by code; an area made of parts lists them all. */
const AREAS: Record<string, { shapes: Shape[]; label: { x: number; y: number; anchor: "start" | "middle" | "end" } }> = {
  NO: { shapes: [NOSE], label: { x: 280, y: -50, anchor: "middle" } },
  LW: { shapes: [LEFT_WING], label: { x: 0, y: 680, anchor: "start" } },
  RW: { shapes: [mirror(LEFT_WING)], label: { x: 560, y: 680, anchor: "end" } },
  AF: { shapes: [AFT_BODY, AFT_FIN, mirror(AFT_FIN)], label: { x: 280, y: 870, anchor: "middle" } },
  // AeroTech (1986): the cockpit is the nose's tip, the fuselage and engine are areas of their own.
  CP: { shapes: [CP], label: { x: 280, y: -50, anchor: "middle" } },
  FU: { shapes: [FUSELAGE], label: { x: 560, y: 410, anchor: "end" } },
  EN: { shapes: [AFT_BODY], label: { x: 560, y: 760, anchor: "end" } },
};
const AT1_NO_SHAPE = NO_BELOW_CP;

const round = (n: number): number => Math.round(n * 10) / 10;

/** Where `count` bubbles go in an area (at most MAX_BUBBLES_DRAWN), and their spacing. */
export function bubblesIn(shapes: Shape[], count: number): { points: BubblePoint[]; pitch: number } {
  const wanted = Math.min(Math.max(Math.floor(count), 0), MAX_BUBBLES_DRAWN);
  return packBubbles(shapes.map((shape) => ({ within: [shape] })), wanted, { maxPitch: MAX_PITCH });
}

function Label({ area, anchor, size, thresholds }: { area: ArmorArea; anchor: { x: number; y: number; anchor: "start" | "middle" | "end" }; size: number; thresholds: boolean }) {
  const lines = thresholds ? [area.name, "Damage Threshold", `${String(area.threshold)} (${String(area.points)})`] : [area.name, String(area.points)];
  return (
    <g data-area={area.code}>
      {lines.map((line, index) => (
        <text key={index} x={anchor.x} y={anchor.y + index * 26} fontSize={size} fontWeight={index === lines.length - 1 ? 700 : 400} textAnchor={anchor.anchor} fill={INK} {...squeeze(line, size, 250)}>
          {line}
        </text>
      ))}
    </g>
  );
}

/** The diagram, drawn into `rect`; the drawing is 560 units wide and scales to the rectangle's width. */
export default function ArmorDiagram({ rect, profile, armor, si }: { rect: Rect; profile: SheetProfile; armor: ArmorArea[]; si: { label: string; value: string } }) {
  const scale = Math.min(rect.w / 560, (rect.h - 90) / 930);
  const at1 = profile.layout === "at1";
  const siCircles = Math.min(Number(si.value) || 0, MAX_SI_DRAWN);
  return (
    <g transform={`translate(${String(round(rect.x + (rect.w - 560 * scale) / 2))} ${String(round(rect.y + 80 * scale))}) scale(${String(round(scale * 1000) / 1000)})`} data-diagram="">
      {armor.map((area) => {
        const shapes = area.code === "NO" && at1 ? [AT1_NO_SHAPE] : (AREAS[area.code]?.shapes ?? []);
        // AeroTech (1986): the cockpit takes the label above the nose, so the nose's goes down the left side.
        const anchor = area.code === "NO" && at1 ? { x: 0, y: 120, anchor: "start" as const } : AREAS[area.code]?.label;
        const { points, pitch } = bubblesIn(shapes, area.points);
        const { radius, strokeWidth } = drawnBubble(pitch / 2);
        return (
          <g key={area.code} data-area-bubbles={area.code} data-drawn={points.length}>
            {shapes.map((shape, index) => (
              <polygon key={index} points={shapePoints(shape)} fill="#fff" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
            ))}
            {points.map(([x, y], index) => (
              <Bubble key={index} x={round(x)} y={round(y)} radius={radius} strokeWidth={strokeWidth} />
            ))}
            {anchor && <Label area={area} anchor={anchor} size={Math.max(22, 20.5 / scale)} thresholds={profile.thresholds} />}
          </g>
        );
      })}
      {/* Structural Integrity: the fuselage between nose and aft carries its boxes (the later sheets; AeroTech (1986) states it in the fighter data). */}
      {!at1 && (
        <g data-si="">
          <rect x={226} y={262} width={108} height={298} fill="#fff" stroke={INK} strokeWidth={4} />
          {si.label.split(" ").map((word, index) => (
            <text key={word} x={280} y={292 + index * 26} fontSize={22} fontWeight={700} textAnchor="middle" fill={INK} {...squeeze(word, 22, 100, true)}>
              {word}
            </text>
          ))}
          <text x={280} y={352} fontSize={26} fontWeight={700} textAnchor="middle" fill={INK}>
            {si.value}
          </text>
          {Array.from({ length: siCircles }, (_, index) => (
            <circle key={index} cx={245 + (index % 5) * 19} cy={382 + Math.floor(index / 5) * 19} r={7} fill="#fff" stroke={INK} strokeWidth={2} />
          ))}
        </g>
      )}
    </g>
  );
}
