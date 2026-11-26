// The critical slots, laid out like a record sheet, and the equipment that is not in a slot. Every slot is one compact
// row; a mount's row ends in one Actions button that opens Move, Replace and Remove. Moving works by keyboard and pointer
// alike: Move (or Place, for an unplaced item) puts the page in a mode where every slot is a button.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { bodyOf, canFireRear, locationName, slotsTaken } from "../../rules/mech";
import type { Layout, LocationCode, MechRecord, Mount, SlotCell } from "../../rules/mech";
import { Changed, mountDomId } from "../EditorPage";
import type { OnEdit } from "../EditorPage";
import Picker from "./Picker";

/** The record sheet's arrangement from the width of five columns up: one string per row of the grid, a location's lower-case
 * code naming its place and a dot an empty one. The head sits over the center torso and each leg under its side torso (a
 * quad's front legs take the arms' columns). Each band is six slots tall: the arms and torsos span two bands, the head one,
 * the center torso two, the legs one. */
const SHEET_ROWS: Record<string, string[]> = {
  biped: ["la lt hd rt ra", "la lt ct rt ra", ". ll ct rl ."],
  quad: ["fll lt hd rt frl", "fll lt ct rt frl", ". rll ct rrl ."],
  // The third leg stands under the center torso, in a row of its own.
  tripod: ["la lt hd rt ra", "la lt ct rt ra", ". ll ct rl .", ". . cl . ."],
};

/** The locations in the order the columns are met, left to right and top to bottom in each column, so that Tab follows what
 * is seen on the widest layout and the narrower ones flow the same way. */
const SHEET_ORDER: Record<string, LocationCode[]> = {
  biped: ["LA", "LT", "LL", "HD", "CT", "RT", "RL", "RA"],
  quad: ["FLL", "LT", "RLL", "HD", "CT", "RT", "RRL", "FRL"],
  tripod: ["LA", "LT", "LL", "HD", "CT", "CL", "RT", "RL", "RA"],
};

type Block =
  | { kind: "fixed" | "empty"; label: string; start: number; length: 1 }
  | { kind: "mount"; label: string; start: number; length: number; mountId: string; first: boolean };

/** Runs of cells of one mount become one block; the mount's first block (over the whole panel) carries its controls. */
function blocksOf(cells: SlotCell[], seen: Set<string>): Block[] {
  const blocks: Block[] = [];
  cells.forEach((cell, index) => {
    const last = blocks[blocks.length - 1];
    if (cell.kind === "mount" && cell.mountId !== undefined) {
      if (last?.kind === "mount" && last.mountId === cell.mountId) {
        last.length++;
        return;
      }
      blocks.push({ kind: "mount", label: cell.label, start: index, length: 1, mountId: cell.mountId, first: !seen.has(cell.mountId) });
      seen.add(cell.mountId);
    } else {
      blocks.push({ kind: cell.kind === "fixed" ? "fixed" : "empty", label: [cell.label, ...(cell.alsoLabels ?? [])].join(" + "), start: index, length: 1 });
    }
  });
  return blocks;
}

const range = (start: number, length: number) => (length === 1 ? `${start + 1}` : `${start + 1}-${start + length}`);

export default function SlotsPanel({
  record,
  layout,
  catalog,
  changed,
  selected,
  onSelect,
  onEdit,
  lockedIds,
}: {
  record: MechRecord;
  layout: Layout;
  catalog: Catalog;
  changed: Set<string>;
  selected: LocationCode | undefined;
  onSelect: (location: LocationCode) => void;
  onEdit: OnEdit;
  /** Mounts that may not be changed here: the fixed equipment of an OmniMech base, seen from a configuration. Pods are the rest. */
  lockedIds?: Set<string>;
}) {
  const [moving, setMoving] = useState<string>();
  /** The one mount whose Actions are open. */
  const [open, setOpen] = useState<string>();
  /** The picker is open: to replace this mount's equipment, or (`{}`) to add an item. */
  const [picking, setPicking] = useState<{ replace?: string }>();
  const pendingFocus = useRef<string | undefined>(undefined);
  const mover = moving === undefined ? undefined : record.mounts.find((m) => m.id === moving);

  // Focus moves after the edit has rendered, to where the control now is.
  useEffect(() => {
    if (pendingFocus.current === undefined) return;
    document.getElementById(pendingFocus.current)?.focus();
    pendingFocus.current = undefined;
  });

  useEffect(() => {
    if (moving === undefined) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      pendingFocus.current = `actions-${moving}`;
      setMoving(undefined);
    };
    window.addEventListener("keydown", cancel);
    return () => {
      window.removeEventListener("keydown", cancel);
    };
  }, [moving]);

  /** Closes the picker and returns focus to the button that opened it, applying the choice if there is one. */
  const finishPicking = (row?: EquipmentRow) => {
    if (!picking) return;
    pendingFocus.current = picking.replace === undefined ? "add-equipment" : `replace-${picking.replace}`;
    setPicking(undefined);
    if (!row) return;
    onEdit((draft) => {
      if (picking.replace === undefined) {
        let n = 1;
        while (draft.mounts.some((m) => m.id === `added-${n}`)) n++;
        draft.mounts.push({ id: `added-${n}`, equipmentId: row.id, name: row.name, techBase: row.techBase, location: null, slot: null });
        return;
      }
      const target = draft.mounts.find((m) => m.id === picking.replace);
      if (!target) return;
      target.equipmentId = row.id;
      target.name = row.name;
      target.techBase = row.techBase;
      delete target.slots;
    });
  };

  const place = (mount: Mount, location: LocationCode | null, slot: number | null) => {
    pendingFocus.current = `actions-${mount.id}`;
    setMoving(undefined);
    onEdit((draft) => {
      const target = draft.mounts.find((m) => m.id === mount.id);
      if (!target) return;
      target.location = location;
      target.slot = slot;
      if (!canFireRear(location)) delete target.rear;
    });
  };
  const remove = (mount: Mount) => {
    pendingFocus.current = "bt-slots";
    setOpen(undefined);
    onEdit((draft) => {
      draft.mounts = draft.mounts.filter((m) => m.id !== mount.id);
    });
  };

  const unmatched = (m: Mount) => !m.part && (m.equipmentId === null || !catalog.byId(m.equipmentId));

  /** A mount's row: its slots, name and markers, the Actions button and, when open, the actions beneath. */
  const mountRow = (mount: Mount, slots: string | undefined, key: string | number, style?: CSSProperties, unplacedItem = false) => {
    const isOpen = open === mount.id;
    const locked = lockedIds?.has(mount.id) === true;
    return (
      <li
        key={key}
        className="bt-slot bt-slot--mount"
        style={style}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !isOpen) return;
          event.stopPropagation();
          setOpen(undefined);
          document.getElementById(`actions-${mount.id}`)?.focus();
        }}
      >
        <span className="bt-slot__n">{slots}</span>
        <span className="bt-slot__main">
          <span id={mountDomId(mount.id)} tabIndex={-1} className="bt-slot__name">
            {mount.name}
          </span>
          {changed.has(mount.id) && <Changed id={`${mountDomId(mount.id)}-changed`} />}
          {mount.rear && <span className="bt-tag">Fires to the rear</span>}
          {unmatched(mount) && <span className="bt-tag">Unmatched</span>}
          {locked && <span className="bt-tag">Fixed in the base</span>}
        </span>
        {!locked && <button
          type="button"
          id={`actions-${mount.id}`}
          className="bt-button bt-button--secondary bt-slot__toggle"
          aria-expanded={isOpen}
          aria-label={`Actions for ${mount.name}`}
          onClick={() => {
            setOpen(isOpen ? undefined : mount.id);
          }}
        >
          Actions
        </button>}
        {isOpen && !locked && (
          <span className="bt-slot__actions">
            <button
              type="button"
              id={`move-${mount.id}`}
              className="bt-button bt-button--secondary"
              aria-label={`${unplacedItem ? "Place" : "Move"} ${mount.name}`}
              onClick={() => {
                pendingFocus.current = "bt-move-status";
                setOpen(undefined);
                setMoving(mount.id);
              }}
            >
              {unplacedItem ? "Place" : "Move"}
            </button>
            {mount.part ? (
              <span className="bt-hint">{`Changes with the ${mount.part} type`}</span>
            ) : (
              <>
                <button
                  type="button"
                  id={`replace-${mount.id}`}
                  className="bt-button bt-button--secondary"
                  aria-label={`Replace ${mount.name}`}
                  onClick={() => {
                    setPicking({ replace: mount.id });
                  }}
                >
                  Replace
                </button>
                {canFireRear(mount.location) && catalog.byId(mount.equipmentId ?? "")?.kind === "weapon" && (
                  <button
                    type="button"
                    id={`rear-${mount.id}`}
                    className="bt-button bt-button--secondary"
                    aria-pressed={mount.rear === true}
                    aria-label={`Fire ${mount.name} to the rear`}
                    onClick={() => {
                      pendingFocus.current = `rear-${mount.id}`;
                      onEdit((draft) => {
                        const target = draft.mounts.find((m) => m.id === mount.id);
                        if (!target) return;
                        if (target.rear) delete target.rear;
                        else target.rear = true;
                      });
                    }}
                  >
                    Rear
                  </button>
                )}
                <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${mount.name}`} onClick={() => { remove(mount); }}>
                  Remove
                </button>
              </>
            )}
          </span>
        )}
      </li>
    );
  };

  const seen = new Set<string>();
  const drawn = new Set(layout.locations.flatMap((loc) => (layout.slots[loc] ?? []).flatMap((c) => (c.mountId ? [c.mountId] : []))));
  const unplacedIds = new Set(layout.unplaced.map((m) => m.id));
  const other = record.mounts.filter((m) => !drawn.has(m.id) && !unplacedIds.has(m.id));
  const body = bodyOf(record.configuration);
  const sheet = Object.hasOwn(SHEET_ROWS, body) ? SHEET_ROWS[body] : undefined;
  const known = Object.hasOwn(SHEET_ORDER, body) ? (SHEET_ORDER[body] ?? []) : [];
  const columns = [...known.filter((l) => layout.locations.includes(l)), ...layout.locations.filter((l) => !known.includes(l))];
  const sheetStyle = sheet ? ({ "--bt-areas": sheet.map((row) => `"${row}"`).join(" ") } as CSSProperties) : undefined;

  return (
    <section className="bt-panel bt-panel--slots" aria-labelledby="bt-slots">
      <div className="bt-slots__bar">
        <h2 id="bt-slots" tabIndex={-1}>
          Critical slots
        </h2>
        <button
          type="button"
          id="add-equipment"
          className="bt-button"
          onClick={() => {
            setPicking({});
          }}
        >
          Add equipment
        </button>
      </div>
      <p role="status" id="bt-move-status" tabIndex={-1}>
        {mover ? `Choose a slot for ${mover.name}. Press Escape to cancel.` : ""}
      </p>
      {mover && (
        <p>
          <button type="button" className="bt-button bt-button--secondary" onClick={() => { place(mover, null, null); }}>
            Leave unplaced
          </button>
        </p>
      )}
      {changed.has("mounts.removed") && <p className="bt-hint">Some equipment from the import has been removed.</p>}

      {layout.unplaced.length > 0 && (
        <div className="bt-tray">
          <h3>Unplaced</h3>
          <ul className="bt-list bt-slotcol__cells">{layout.unplaced.map((mount) => mountRow(mount, undefined, mount.id, undefined, true))}</ul>
        </div>
      )}

      {layout.supported ? (
        <div className="bt-slots" style={sheetStyle}>
          {columns.map((location) => {
            const cells = layout.slots[location] ?? [];
            const name = locationName(location);
            return (
              <div key={location} className="bt-slotcol" data-selected={selected === location} style={sheet ? ({ "--bt-area": location.toLowerCase() } as CSSProperties) : undefined}>
                <h3>
                  <button type="button" className="bt-slotcol__head" aria-pressed={selected === location} onClick={() => { onSelect(location); }}>
                    {name}
                  </button>
                </h3>
                <ol className="bt-slotcol__cells" aria-label={`${name} slots`}>
                  {mover
                    ? cells.map((cell, index) => (
                        <li key={index} className="bt-slot">
                          <span className="bt-slot__n">{index + 1}</span>
                          <button
                            type="button"
                            className="bt-button bt-button--secondary bt-slot__place"
                            onClick={() => { place(mover, location, index); }}
                          >
                            {`Place ${mover.name} in ${name} slot ${index + 1}`}
                          </button>
                          <span className="bt-hint">{cell.kind === "empty" ? "Empty" : cell.label}</span>
                        </li>
                      ))
                    : blocksOf(cells, seen).map((block) => {
                        const span = { gridRow: `span ${block.length}` };
                        const mount = block.kind === "mount" ? record.mounts.find((m) => m.id === block.mountId) : undefined;
                        if (mount && block.kind === "mount" && block.first) return mountRow(mount, range(mount.slot ?? block.start, slotsTaken(mount, record, catalog.factsOf)), block.start, span);
                        return (
                          <li key={block.start} className={`bt-slot bt-slot--${block.kind}`} style={span}>
                            <span className="bt-slot__n">{range(block.start, block.length)}</span>
                            <span className="bt-slot__main">{block.kind === "empty" ? "Empty" : block.label}</span>
                          </li>
                        );
                      })}
                </ol>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="bt-hint">Slots are not drawn for this body type yet.</p>
      )}

      {other.length > 0 && (
        <div className="bt-tray">
          <h3>Sharing a slot, or taking none</h3>
          <ul className="bt-list bt-slotcol__cells">{other.map((mount) => mountRow(mount, undefined, mount.id))}</ul>
        </div>
      )}

      {picking && (
        <Picker
          podOnly={lockedIds !== undefined}
          record={record}
          catalog={catalog}
          title={picking.replace === undefined ? "Add equipment" : `Replace ${record.mounts.find((m) => m.id === picking.replace)?.name ?? "equipment"}`}
          current={picking.replace === undefined ? undefined : (record.mounts.find((m) => m.id === picking.replace)?.equipmentId ?? undefined)}
          onChoose={finishPicking}
          onClose={() => {
            finishPicking();
          }}
        />
      )}
    </section>
  );
}
