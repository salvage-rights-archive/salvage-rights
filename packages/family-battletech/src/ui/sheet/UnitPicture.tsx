// The unit picture: the player's own, else Mordel's, else an empty frame. Fitted inside its box, never cropped or stretched.
import type { MechRecord } from "../../rules/mech";
import { mordelPicture } from "../picture";
import type { Rect } from "./Frame";
import { FAINT, INK } from "./text";

/** The address of the picture the sheet draws: the player's own, else Mordel's (only from mordel.net); undefined when it has none. */
export const sheetPicture = (record: MechRecord): string | undefined => record.picture?.dataUrl ?? (mordelPicture(record.imageUrl) ? record.imageUrl : undefined);

export default function UnitPicture({ rect, record, label }: { rect: Rect; record: MechRecord; label: string }) {
  const href = sheetPicture(record);
  return (
    <g data-picture={href === undefined ? "empty" : "image"}>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={20} fill="#fff" stroke={INK} strokeWidth={4} />
      {href === undefined ? (
        <text x={rect.x + rect.w / 2} y={rect.y + rect.h / 2} fontSize={28} textAnchor="middle" fill={FAINT}>
          Unit picture
        </text>
      ) : (
        <image
          href={href}
          x={rect.x + 16}
          y={rect.y + 16}
          width={rect.w - 32}
          height={rect.h - 32}
          preserveAspectRatio="xMidYMid meet"
          // Mordel is not told which page asks. React's SVG typings lack the attribute.
          {...{ referrerPolicy: "no-referrer" }}
        >
          <title>{label}</title>
        </image>
      )}
    </g>
  );
}
