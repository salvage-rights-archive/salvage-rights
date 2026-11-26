// Armor points per location, with the paper doll beside them: the armor diagram (front and rear) and the internal
// structure at a smaller scale. Choosing a location anywhere selects it for the whole page.
import { useState } from "react";
import { ARMOR } from "../../data/chassis";
import type { Catalog } from "../../rules/catalog";
import { allocateArmor, armorPointsForTons, bodyOf, locationName, maxArmor } from "../../rules/mech";
import type { Layout, LocationCode, MechRecord } from "../../rules/mech";
import { dollBox } from "../doll/box";
import MechDoll from "../doll/mech-doll";
import { PAPER } from "../doll/pen";
import { STRUCTURE_SCALE, dollUnitFromRecord, recordCodeOf } from "../doll/layouts";
import type { DollUse } from "../doll/layouts";
import { shieldPoints } from "../../rules/shields";
import { NumberField, fieldId } from "../EditorPage";
import type { OnEdit } from "../EditorPage";

const WITH_REAR: string[] = ["CT", "LT", "RT"];
/** Where each location's field sits in the body-shaped grid: [row, column]. A quad's legs take the arms' and legs' places:
 * the front legs where the arms are (outside), the rear legs where the legs are (inside), left and right as on the doll. */
type Cell = [row: number, column: number];
const BODY_CELLS: Record<string, Record<string, Cell>> = {
  biped: { HD: [1, 3], LA: [2, 1], LT: [2, 2], CT: [2, 3], RT: [2, 4], RA: [2, 5], "LT-rear": [3, 2], "CT-rear": [3, 3], "RT-rear": [3, 4], LL: [4, 2], RL: [4, 4] },
  quad: { HD: [1, 3], FLL: [2, 1], LT: [2, 2], CT: [2, 3], RT: [2, 4], FRL: [2, 5], "LT-rear": [3, 2], "CT-rear": [3, 3], "RT-rear": [3, 4], RLL: [4, 2], RRL: [4, 4] },
  // A tripod's center leg stands between its two side legs.
  tripod: { HD: [1, 3], LA: [2, 1], LT: [2, 2], CT: [2, 3], RT: [2, 4], RA: [2, 5], "LT-rear": [3, 2], "CT-rear": [3, 3], "RT-rear": [3, 4], LL: [4, 2], CL: [4, 3], RL: [4, 4] },
};

export default function ArmorPanel({
  record,
  catalog,
  layout,
  armorTons,
  changed,
  selected,
  errorLocations,
  onSelect,
  onEdit,
  readOnly = false,
}: {
  record: MechRecord;
  catalog: Catalog;
  layout: Layout;
  armorTons: number | null;
  changed: Set<string>;
  selected: LocationCode | undefined;
  /** Locations whose armor the rules check reports as an error; the armor doll outlines them in red. */
  errorLocations: Set<string>;
  onSelect: (location: LocationCode) => void;
  onEdit: OnEdit;
  /** The armor is fixed in an OmniMech base: shown from a configuration, edited only on the base. */
  readOnly?: boolean;
}) {
  /** The tons typed into the armor-tons box; until one is typed it follows the armor weight of the record. */
  const [tonsTyped, setTonsTyped] = useState<number>();
  const locations = (layout.supported ? layout.locations : Object.keys(record.armor)) as LocationCode[];
  const max = maxArmor(record);
  const points = Object.values(record.armor).reduce((sum, a) => sum + (a ? a.front + (a.rear ?? 0) : 0), 0);
  const type = Object.hasOwn(ARMOR.types, record.chassis.armorType) ? (ARMOR.types[record.chassis.armorType]?.name ?? record.chassis.armorType) : record.chassis.armorType;
  const shields = shieldPoints(record, catalog);
  const unit = dollUnitFromRecord(record, shields);
  // A shield is a location on the doll with no field of its own: what it draws is said in words here.
  const shieldNotes = ([["Left", shields.left, shields.absorbLeft], ["Right", shields.right, shields.absorbRight]] as const).flatMap(([side, capacity, absorbance]) =>
    capacity === undefined ? [] : [`${side} arm shield: Damage Capacity ${capacity}${absorbance === undefined ? "" : `, Damage Absorbance ${absorbance}`}`],
  );

  // The fields in the order they are seen on the body-shaped grid, row by row, so Tab follows the picture.
  const cellOf = (location: string, side: "front" | "rear"): Cell | undefined =>
    (BODY_CELLS[Object.hasOwn(BODY_CELLS, record.configuration) ? record.configuration : bodyOf(record.configuration)] ?? {})[side === "rear" ? `${location}-rear` : location];
  const fieldOrder = locations
    .flatMap((location): [LocationCode, "front" | "rear"][] =>
      WITH_REAR.includes(location) || record.armor[location]?.rear !== undefined ? [[location, "front"], [location, "rear"]] : [[location, "front"]],
    )
    .map((item, index) => ({ item, index, at: cellOf(...item) }))
    .sort((a, b) => (a.at?.[0] ?? 99) - (b.at?.[0] ?? 99) || (a.at?.[1] ?? 99) - (b.at?.[1] ?? 99) || a.index - b.index)
    .map(({ item }) => item);

  const tons = tonsTyped ?? armorTons ?? 0;
  const buyable = armorPointsForTons(record, tons);
  const totalMax = Object.values(max).reduce((sum, n) => sum + n, 0);

  const chooseOnDoll = (doll: string) => {
    const location = recordCodeOf(doll);
    if (!location) return;
    onSelect(location);
    document.getElementById(fieldId(`armor.${location}`))?.focus();
  };

  const doll = (use: Exclude<DollUse, "transfer">, scale: number) => {
    if (!unit) return null;
    const box = dollBox(unit, use, scale);
    return (
      <svg
        className={`bt-doll bt-doll--${use}`}
        viewBox={`0 0 ${Math.ceil(box.width)} ${Math.ceil(box.height)}`}
        role="group"
        aria-label={use === "armor" ? "Armor, front and rear" : "Internal structure"}
      >
        {/* A white sheet, so the doll's black labels and focus ring are seen on the dark theme too. */}
        <rect width="100%" height="100%" fill={PAPER} aria-hidden="true" />
        <MechDoll
          unit={unit}
          use={use}
          frame={{ centerX: -box.left, top: -box.top, scale }}
          suffix={use}
          selected={selected?.toLowerCase()}
          // The limit covers front and rear together, so both plates of a torso are marked.
          inError={use === "armor" ? [...errorLocations].flatMap((code) => [code.toLowerCase(), `${code.toLowerCase()}r`]) : []}
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
          disabled={readOnly}
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
      <div className="bt-armor__tools" role="group" aria-label="Armor helpers">
        <NumberField
          id="armor-tons"
          label="Armor tons"
          value={tons}
          disabled={readOnly}
          onValid={(value) => {
            setTonsTyped(value ?? 0);
          }}
          after={<span className="bt-hint">{buyable === null ? "points unknown" : `= ${buyable} points`}</span>}
        />
        <button
          type="button"
          id="armor-allocate"
          className="bt-button bt-button--secondary"
          disabled={readOnly || buyable === null}
          onClick={() => {
            onEdit((draft) => {
              draft.armor = allocateArmor(draft, buyable ?? 0);
            });
          }}
        >
          Allocate
        </button>
        <button
          type="button"
          id="armor-max"
          className="bt-button bt-button--secondary"
          disabled={readOnly}
          onClick={() => {
            setTonsTyped(undefined);
            onEdit((draft) => {
              draft.armor = allocateArmor(draft, totalMax);
            });
          }}
        >
          {`Max armor (${totalMax} points)`}
        </button>
        <p className="bt-hint">
          Allocate spreads the points of the tons above over the locations: each in proportion to its maximum, the head near 9, the torsos about 3 front to 1 rear. This spread is our own helper, not a book rule. Every figure can be edited afterwards.
        </p>
      </div>
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
          {shieldNotes.length > 0 && (
            <p className="bt-hint">{`${shieldNotes.join(". ")}. A shield's points come with its size; they are marked off on the record sheet.`}</p>
          )}
          {unit && <div className="bt-armor__structure">{doll("structure", STRUCTURE_SCALE)}</div>}
        </div>
      </div>
    </section>
  );
}
