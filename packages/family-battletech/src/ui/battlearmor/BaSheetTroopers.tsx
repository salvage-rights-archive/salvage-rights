// The trooper rows of the battle armor sheet: for each trooper its number, then its own point (the grey circle) and one circle for every armor
// point, as on the Total Warfare sheet. The circles are the ones the player marks off in play.
import { INK } from "../sheet/text";
import type { BaRecord } from "../../rules/battlearmor/record";
import { troopersOf } from "./edit";

const STEP = 46;

export default function BaSheetTroopers({ record, x, top, rowHeight }: { record: BaRecord; x: number; top: number; rowHeight: number }) {
  return (
    <g>
      {troopersOf(record).map((trooper, row) => {
        const y = top + row * rowHeight + rowHeight / 2;
        return (
          <g key={trooper.code}>
            <text x={x} y={y + 12} fontSize={36} fontWeight={700} fill={INK}>{String(row + 1)}</text>
            <circle cx={x + 70} cy={y} r={17} fill="#bbb" stroke={INK} strokeWidth={3} />
            {Array.from({ length: trooper.armor }, (_, i) => (
              <circle key={i} cx={x + 70 + (i + 1) * STEP} cy={y} r={17} fill="#fff" stroke={INK} strokeWidth={3} />
            ))}
          </g>
        );
      })}
    </g>
  );
}
