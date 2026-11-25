// Armor points per location, with the paper doll beside them: the armor diagram (front and rear) and the internal
// structure at a smaller scale. Choosing a location anywhere selects it for the whole page.
import { ARMOR } from "../../data/chassis";
import { locationName, maxArmor } from "../../rules/mech";
import type { Layout, LocationCode, MechRecord } from "../../rules/mech";
import MechDoll, { placedPlates } from "../doll/mech-doll";
import { DOLL_LAYOUTS, STRUCTURE_SCALE, dollUnitFromRecord } from "../doll/layouts";
import type { DollUse } from "../doll/layouts";
import { NumberField, fieldId } from "../EditorPage";
import type { OnEdit } from "../EditorPage";

const WITH_REAR: string[] = ["CT", "LT", "RT"];
/** Where each location's field sits in the body-shaped grid: [row, column]. A quad's legs take the arms' and legs' places. */
type Cell = [row: number, column: number];
const BODY_CELLS: Record<string, Record<string, Cell>> = {
  biped: { HD: [1, 3], LA: [2, 1], LT: [2, 2], CT: [2, 3], RT: [2, 4], RA: [2, 5], "LT-rear": [3, 2], "CT-rear": [3, 3], "RT-rear": [3, 4], LL: [4, 2], RL: [4, 4] },
  quad: { HD: [1, 3], FLL: [2, 1], LT: [2, 2], CT: [2, 3], RT: [2, 4], FRL: [2, 5], "LT-rear": [3, 2], "CT-rear": [3, 3], "RT-rear": [3, 4], RLL: [4, 2], RRL: [4, 4] },
};
/** Label type size and an average glyph width as a share of it, per use, to leave room for the labels. */
const LABEL = { armor: { size: 20, glyph: 0.62 }, structure: { size: 15, glyph: 0.62 } } as const;
const MARGIN = 12;

/** The box a doll needs, in sheet units: every plate and label of the layout at that scale, so nothing is clipped. */
function dollBox(layoutId: keyof typeof DOLL_LAYOUTS, use: "armor" | "structure", scale: number) {
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
    const { size, glyph } = LABEL[use];
    const width = Math.max(...location.label.map((line) => line.length + 5)) * size * glyph;
    const x = location.labelAt[0] * scale;
    const y = location.labelAt[1] * scale;
    const [from, to] = location.labelAnchor === "start" ? [x, x + width] : location.labelAnchor === "end" ? [x - width, x] : [x - width / 2, x + width / 2];
    xs.push(from, to);
    ys.push(y - size, y + location.label.length * (size + 2));
  }
  const left = Math.min(...xs) - MARGIN;
  const top = Math.min(...ys) - MARGIN;
  return { left, top, width: Math.max(...xs) + MARGIN - left, height: Math.max(...ys) + MARGIN - top };
}

/** The record location a doll location stands for: the rear torsos (ctr, ltr, rtr) are their front torso's. */
const recordLocation = (doll: string): string => (doll.length === 3 ? doll.slice(0, 2) : doll).toUpperCase();

export default function ArmorPanel({
  record,
  layout,
  armorTons,
  changed,
  selected,
  onSelect,
  onEdit,
}: {
  record: MechRecord;
  layout: Layout;
  armorTons: number | null;
  changed: Set<string>;
  selected: LocationCode | undefined;
  onSelect: (location: LocationCode) => void;
  onEdit: OnEdit;
}) {
  const locations = (layout.supported ? layout.locations : Object.keys(record.armor)) as LocationCode[];
  const max = maxArmor(record);
  const points = Object.values(record.armor).reduce((sum, a) => sum + (a ? a.front + (a.rear ?? 0) : 0), 0);
  const type = Object.hasOwn(ARMOR.types, record.chassis.armorType) ? (ARMOR.types[record.chassis.armorType]?.name ?? record.chassis.armorType) : record.chassis.armorType;
  const unit = dollUnitFromRecord(record);

  // The fields in the order they are seen on the body-shaped grid, row by row, so Tab follows the picture.
  const cellOf = (location: string, side: "front" | "rear"): Cell | undefined =>
    (BODY_CELLS[record.configuration] ?? {})[side === "rear" ? `${location}-rear` : location];
  const fieldOrder = locations
    .flatMap((location): [LocationCode, "front" | "rear"][] =>
      WITH_REAR.includes(location) || record.armor[location]?.rear !== undefined ? [[location, "front"], [location, "rear"]] : [[location, "front"]],
    )
    .map((item, index) => ({ item, index, at: cellOf(...item) }))
    .sort((a, b) => (a.at?.[0] ?? 99) - (b.at?.[0] ?? 99) || (a.at?.[1] ?? 99) - (b.at?.[1] ?? 99) || a.index - b.index)
    .map(({ item }) => item);

  const chooseOnDoll = (doll: string) => {
    const location = recordLocation(doll) as LocationCode;
    onSelect(location);
    document.getElementById(fieldId(`armor.${location}`))?.focus();
  };

  const doll = (use: Exclude<DollUse, "transfer">, scale: number) => {
    if (!unit) return null;
    const box = dollBox(unit.layoutId, use, scale);
    return (
      <svg
        className={`bt-doll bt-doll--${use}`}
        viewBox={`0 0 ${Math.ceil(box.width)} ${Math.ceil(box.height)}`}
        role="group"
        aria-label={use === "armor" ? "Armor, front and rear" : "Internal structure"}
      >
        <MechDoll
          unit={unit}
          use={use}
          frame={{ centerX: -box.left, top: -box.top, scale }}
          suffix={use}
          selected={selected?.toLowerCase()}
          onSelect={chooseOnDoll}
        />
      </svg>
    );
  };

  /** One location's field: its short code shows, its full name is the accessible name, and the most it can carry follows. */
  const cell = (location: LocationCode, side: "front" | "rear") => {
    const entry = record.armor[location];
    const limit = max[location];
    const name = locationName(location);
    const rear = side === "rear";
    const at = cellOf(location, side);
    const id = rear ? `${fieldId(`armor.${location}`)}-rear` : fieldId(`armor.${location}`);
    const hasRear = WITH_REAR.includes(location) || entry?.rear !== undefined;
    return (
      <div
        key={id}
        className="bt-armor__cell"
        data-selected={selected === location}
        style={at ? { gridRow: at[0], gridColumn: at[1] } : undefined}
      >
        <NumberField
          id={id}
          label={rear ? `${location} rear` : location}
          name={rear ? `${location} rear, ${name} rear armor` : `${location}, ${hasRear ? `${name} front armor` : `${name} armor`}`}
          value={(rear ? entry?.rear : entry?.front) ?? 0}
          changed={!rear && changed.has(`armor.${location}`)}
          onValid={(value) => {
            onEdit((draft) => {
              draft.armor[location] = { ...(draft.armor[location] ?? { front: 0 }), [side]: value ?? 0 };
            }, id);
          }}
          onFocus={() => {
            onSelect(location);
          }}
          after={!rear && limit !== undefined ? <span className="bt-hint">{`/ ${limit}`}</span> : undefined}
        />
      </div>
    );
  };

  return (
    <section className="bt-panel" aria-labelledby="bt-armor">
      <h2 id="bt-armor">Armor</h2>
      <p>{`${points} points, ${armorTons === null ? "weight unknown" : `${armorTons} tons`} of ${type}`}</p>
      <div className="bt-armor">
        {unit ? (
          <div className="bt-armor__doll">{doll("armor", 1)}</div>
        ) : (
          <p className="bt-hint">No doll is drawn for this body type yet.</p>
        )}
        <div className="bt-armor__side">
          <div className="bt-armor__body" role="group" aria-label="Armor points by location">
            {fieldOrder.map(([location, side]) => cell(location, side))}
          </div>
          {unit && <div className="bt-armor__structure">{doll("structure", STRUCTURE_SCALE)}</div>}
        </div>
      </div>
    </section>
  );
}
