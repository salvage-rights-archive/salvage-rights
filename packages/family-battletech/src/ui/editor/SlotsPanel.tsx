// The critical slots, one column per location, and the equipment that is not in a slot. Moving works by keyboard and
// pointer alike: Move (or Place, for an unplaced item) puts the page in a mode where every slot is a button.
import { useEffect, useRef, useState } from "react";
import type { Catalog } from "../../rules/catalog";
import { locationName } from "../../rules/mech";
import type { Layout, LocationCode, MechRecord, Mount, SlotCell } from "../../rules/mech";
import { Changed, mountDomId } from "../EditorPage";
import type { OnEdit } from "../EditorPage";

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
      blocks.push({ kind: cell.kind === "fixed" ? "fixed" : "empty", label: cell.label, start: index, length: 1 });
    }
  });
  return blocks;
}

const range = (start: number, length: number) => (length === 1 ? `${start + 1}` : `${start + 1}–${start + length}`);

export default function SlotsPanel({
  record,
  layout,
  catalog,
  changed,
  selected,
  onSelect,
  onEdit,
}: {
  record: MechRecord;
  layout: Layout;
  catalog: Catalog;
  changed: Set<string>;
  selected: LocationCode | undefined;
  onSelect: (location: LocationCode) => void;
  onEdit: OnEdit;
}) {
  const [moving, setMoving] = useState<string>();
  const pendingFocus = useRef<string | undefined>(undefined);
  const mover = moving === undefined ? undefined : record.mounts.find((m) => m.id === moving);

  // Focus moves after the edit has rendered, to where the mount's controls now are.
  useEffect(() => {
    if (pendingFocus.current === undefined) return;
    document.getElementById(pendingFocus.current)?.focus();
    pendingFocus.current = undefined;
  });

  useEffect(() => {
    if (moving === undefined) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      pendingFocus.current = `move-${moving}`;
      setMoving(undefined);
    };
    window.addEventListener("keydown", cancel);
    return () => {
      window.removeEventListener("keydown", cancel);
    };
  }, [moving]);

  const place = (mount: Mount, location: LocationCode | null, slot: number | null) => {
    pendingFocus.current = `move-${mount.id}`;
    setMoving(undefined);
    onEdit((draft) => {
      const target = draft.mounts.find((m) => m.id === mount.id);
      if (!target) return;
      target.location = location;
      target.slot = slot;
    });
  };
  const remove = (mount: Mount) => {
    pendingFocus.current = "bt-slots";
    onEdit((draft) => {
      draft.mounts = draft.mounts.filter((m) => m.id !== mount.id);
    });
  };

  const unmatched = (m: Mount) => !m.part && (m.equipmentId === null || !catalog.byId(m.equipmentId));

  /** A mount's name, its markers and its buttons. */
  const controls = (mount: Mount, unplacedItem = false) => (
    <>
      <span id={mountDomId(mount.id)} tabIndex={-1} className="bt-slot__name">
        {mount.name}
      </span>
      {changed.has(mount.id) && <Changed id={`${mountDomId(mount.id)}-changed`} />}
      {unmatched(mount) && <span className="bt-tag">Unmatched</span>}
      <span className="bt-slot__actions">
        <button
          type="button"
          id={`move-${mount.id}`}
          className="bt-button bt-button--secondary"
          aria-label={`${unplacedItem ? "Place" : "Move"} ${mount.name}`}
          onClick={() => {
            setMoving(mount.id);
          }}
        >
          {unplacedItem ? "Place" : "Move"}
        </button>
        {mount.part ? (
          <span className="bt-hint">{`Changes with the ${mount.part} type`}</span>
        ) : (
          <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${mount.name}`} onClick={() => { remove(mount); }}>
            Remove
          </button>
        )}
      </span>
    </>
  );

  const seen = new Set<string>();
  const drawn = new Set(layout.locations.flatMap((loc) => (layout.slots[loc] ?? []).flatMap((c) => (c.mountId ? [c.mountId] : []))));
  const unplacedIds = new Set(layout.unplaced.map((m) => m.id));
  const other = record.mounts.filter((m) => !drawn.has(m.id) && !unplacedIds.has(m.id));

  return (
    <section className="bt-panel" aria-labelledby="bt-slots">
      <h2 id="bt-slots" tabIndex={-1}>
        Critical slots
      </h2>
      <p role="status">{mover ? `Choose a slot for ${mover.name}. Press Escape to cancel.` : ""}</p>
      {mover && (
        <p>
          <button type="button" className="bt-button bt-button--secondary" onClick={() => { place(mover, null, null); }}>
            Leave unplaced
          </button>
        </p>
      )}
      {changed.has("mounts.removed") && <p className="bt-hint">Some equipment from the import has been removed.</p>}

      <div className="bt-tray">
        <h3>Unplaced</h3>
        {layout.unplaced.length === 0 ? (
          <p className="bt-hint">Everything is in a slot.</p>
        ) : (
          <ul className="bt-list">
            {layout.unplaced.map((mount) => (
              <li key={mount.id} className="bt-slot bt-slot--mount">
                {controls(mount, true)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {layout.supported ? (
        <div className="bt-slots">
          {layout.locations.map((location) => {
            const cells = layout.slots[location] ?? [];
            const name = locationName(location);
            return (
              <div key={location} className="bt-slotcol" data-selected={selected === location}>
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
                        const mount = block.kind === "mount" ? record.mounts.find((m) => m.id === block.mountId) : undefined;
                        return (
                          <li key={block.start} className={`bt-slot bt-slot--${block.kind}`} style={{ gridRow: `span ${block.length}` }}>
                            <span className="bt-slot__n">{range(block.start, block.length)}</span>
                            {block.kind === "mount" ? (mount && block.first ? controls(mount) : <span>{block.label}</span>) : <span>{block.kind === "empty" ? "Empty" : block.label}</span>}
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
          <ul className="bt-list">
            {other.map((mount) => (
              <li key={mount.id} className="bt-slot bt-slot--mount">
                {controls(mount)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
