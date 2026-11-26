// Weapons by arc, and for small craft and DropShips the weapon bays, transport bays, quarters and crew. An arc lists what is in it with a
// count against the edition's limit; items are added through the grouped picker. An arc the edition does not give the unit, holding items
// the unit already has, stays listed so the items can be moved (the rules check reports them).
import { useEffect, useRef, useState } from "react";
import { CRAFT_FIGURES, FIGHTER_FIGURES, craftBaysFor, figureOf } from "../../data/aero";
import {
  aeroLocationName,
  craftAmmoShortfalls,
  craftArcs,
  craftCrew,
  craftDoors,
  craftKind,
  craftQuarters,
  craftWeaponBays,
  fighterArcs,
  fighterKind,
  locationsOf,
} from "../../rules/aero";
import type { AeroMount, AeroRecord } from "../../rules/aero";
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { tidy } from "../../rules/walk";
import AeroPicker from "./AeroPicker";
import { mountFor, strayArcs } from "./edit";
import type { AeroOnEdit } from "./edit";
import { NumberField, SelectField, TextField } from "./fields";

const num = (n: number): string => String(tidy(n));
const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
export const arcDomId = (arc: string): string => `arc-${arc}`;
export const mountDomId = (id: string): string => `mount-${id}`;

/** The figures an arc shows under its name; empty where the edition prints no limit for it. */
function arcSummary(record: AeroRecord, arc: string, catalog: Catalog): string {
  const fighter = fighterArcs(record, catalog).find((a) => a.arc === arc);
  if (fighter) {
    const tons = fighter.tonsLimit === undefined ? `${plural(fighter.weaponTons, "ton")} of weapons` : `${num(fighter.weaponTons)} of ${plural(fighter.tonsLimit, "ton")} of weapons`;
    return `${num(fighter.items)} of ${plural(fighter.limit, "item")}, ${tons}`;
  }
  const craft = craftArcs(record, catalog).find((a) => a.arc === arc);
  if (craft) return `${plural(craft.weapons, "weapon")} (${num(craft.limit)} before more fire control), ${plural(craft.weaponTons, "ton")} of weapons${craft.fireControlTons > 0 ? `, fire control ${plural(craft.fireControlTons, "ton")}` : ""}`;
  return "";
}

function MountRow({ record, mount, arcs, onEdit }: { record: AeroRecord; mount: AeroMount; arcs: string[]; onEdit: AeroOnEdit }) {
  const locations = locationsOf(record);
  const ammunition = mount.amount !== undefined || (mount.equipmentId ?? "").startsWith("ammo-");
  const craft = craftKind(record) !== undefined && figureOf(CRAFT_FIGURES.bayLimit, record.editionId) !== undefined;
  const wing = mount.arc === "LW" || mount.arc === "RW";
  const edit = (change: (m: AeroMount) => void, field?: string) => {
    onEdit((d) => {
      const m = d.mounts.find((each) => each.id === mount.id);
      if (m) change(m);
    }, field);
  };
  const label = mount.name || "Item";
  return (
    <li className="bt-row">
      <span className="bt-row__text">
        <strong id={mountDomId(mount.id)} tabIndex={-1}>
          {label}
        </strong>
      </span>
      <div className="bt-grid">
        <SelectField
          id={`mount-${mount.id}-arc`}
          label={`${label}: arc`}
          value={mount.arc}
          options={arcs.map((arc) => ({ value: arc, label: aeroLocationName(arc) }))}
          onChange={(v) => {
            edit((m) => {
              m.arc = v;
              if (v !== "LW" && v !== "RW") delete m.aft;
            });
          }}
        />
        {ammunition && (
          <NumberField
            id={`mount-${mount.id}-amount`}
            label={`${label}: tons`}
            value={mount.amount ?? 1}
            min={0}
            onValid={(v) => {
              edit((m) => void (m.amount = v ?? 1), `${mount.id}-amount`);
            }}
          />
        )}
        {craft && (
          <TextField
            id={`mount-${mount.id}-bay`}
            label={`${label}: bay`}
            value={mount.bay ?? ""}
            hint="Items with the same bay name share a bay. Empty: the arc's own."
            onChange={(v) => {
              edit((m) => {
                if (v.trim() === "") delete m.bay;
                else m.bay = v;
              }, `${mount.id}-bay`);
            }}
          />
        )}
        {(mount.aft === true || (locations.wingsFireAft && wing)) && (
          <label className="bt-check">
            <input
              type="checkbox"
              checked={mount.aft === true}
              onChange={(event) => {
                edit((m) => {
                  if (event.target.checked) m.aft = true;
                  else delete m.aft;
                });
              }}
            />
            {`${label} fires aft`}
          </label>
        )}
      </div>
      <span className="bt-row__actions">
        <button
          type="button"
          className="bt-button bt-button--secondary"
          aria-label={`Remove ${label}`}
          onClick={() => {
            onEdit((d) => void (d.mounts = d.mounts.filter((each) => each.id !== mount.id)));
          }}
        >
          Remove
        </button>
      </span>
    </li>
  );
}

export function WeaponsPanel({ record, catalog, onEdit }: { record: AeroRecord; catalog: Catalog; onEdit: AeroOnEdit }) {
  const [adding, setAdding] = useState<string>();
  const opener = useRef<HTMLElement | null>(null);
  const fighter = fighterKind(record);
  const known = locationsOf(record).arcs;
  const stray = strayArcs(record, known);
  const arcs = [...known, ...stray];
  const arms = figureOf(FIGHTER_FIGURES.arms, record.editionId);
  useEffect(() => {
    if (adding === undefined && opener.current?.isConnected) opener.current.focus();
  }, [adding]);
  if (arcs.length === 0) return null;
  const choose = (row: EquipmentRow) => {
    const arc = adding;
    setAdding(undefined);
    if (arc !== undefined) onEdit((d) => void d.mounts.push(mountFor(d, row, arc)));
  };
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="aero-weapons">
      <h2 id="aero-weapons">Weapons and equipment by arc</h2>
      {fighter && arms?.countsAmmo !== true && <p className="bt-hint">Ammunition does not count against an arc in this edition.</p>}
      {arcs.map((arc) => {
        const mounts = record.mounts.filter((m) => m.arc === arc);
        const summary = arcSummary(record, arc, catalog);
        const name = aeroLocationName(arc);
        return (
          <div key={arc} role="group" aria-labelledby={`${arcDomId(arc)}-name`}>
            <h3 id={arcDomId(arc)} tabIndex={-1}>
              <span id={`${arcDomId(arc)}-name`}>{name}</span>
              {summary && <span className="bt-hint">{` ${summary}`}</span>}
            </h3>
            {stray.includes(arc) && <p className="bt-hint">This edition does not give the unit this arc. Move the items to one it does.</p>}
            {mounts.length > 0 && (
              <ul className="bt-list">
                {mounts.map((mount) => (
                  <MountRow key={mount.id} record={record} mount={mount} arcs={arcs} onEdit={onEdit} />
                ))}
              </ul>
            )}
            <p>
              <button
                type="button"
                className="bt-button bt-button--secondary"
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setAdding(arc);
                }}
              >
                {`Add equipment to ${name}`}
              </button>
            </p>
          </div>
        );
      })}
      {adding !== undefined && (
        <AeroPicker
          record={record}
          catalog={catalog}
          title={`Add equipment to ${aeroLocationName(adding)}`}
          onChoose={choose}
          onClose={() => {
            setAdding(undefined);
          }}
        />
      )}
    </section>
  );
}

const QUARTERS: [string, string][] = [
  ["steerage", "Steerage"],
  ["second-class", "Second class"],
  ["first-class", "First class"],
];

/** Small craft and DropShips: weapon bays, transport bays, quarters and crew, with the figures the edition prints for each. */
export function CraftPanel({ record, catalog, onEdit }: { record: AeroRecord; catalog: Catalog; onEdit: AeroOnEdit }) {
  if (craftKind(record) === undefined) return null;
  const kinds = craftBaysFor(record.editionId);
  const bays = record.bays ?? [];
  const weaponBays = craftWeaponBays(record, catalog);
  const shortfalls = craftAmmoShortfalls(record, catalog);
  const crew = craftCrew(record, catalog);
  const doors = craftDoors(record);
  const quarters = craftQuarters(record, catalog);
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="aero-craft">
      <h2 id="aero-craft">Bays, quarters and crew</h2>
      {bays.length > 0 && (
        <ul className="bt-list">
          {bays.map((bay, index) => (
            <li key={index} className="bt-row">
              <div className="bt-grid">
                <SelectField
                  id={`bay-${String(index)}-kind`}
                  label={`Bay ${String(index + 1)} kind`}
                  value={bay.kind}
                  options={kinds.map((row) => ({ value: row.kind, label: row.label }))}
                  onChange={(v) => {
                    onEdit((d) => {
                      const b = d.bays?.[index];
                      if (b) b.kind = v;
                    });
                  }}
                />
                <NumberField
                  id={`bay-${String(index)}-capacity`}
                  label={`Bay ${String(index + 1)} cubicles (tons for cargo)`}
                  value={bay.capacity}
                  min={0}
                  onValid={(v) => {
                    onEdit((d) => {
                      const b = d.bays?.[index];
                      if (b) b.capacity = v ?? 0;
                    }, `bay-${String(index)}-capacity`);
                  }}
                />
                <NumberField
                  id={`bay-${String(index)}-doors`}
                  label={`Bay ${String(index + 1)} doors`}
                  value={bay.doors}
                  min={0}
                  onValid={(v) => {
                    onEdit((d) => {
                      const b = d.bays?.[index];
                      if (b) b.doors = v ?? 0;
                    }, `bay-${String(index)}-doors`);
                  }}
                />
              </div>
              <span className="bt-row__actions">
                <button
                  type="button"
                  className="bt-button bt-button--secondary"
                  aria-label={`Remove bay ${String(index + 1)}`}
                  onClick={() => {
                    onEdit((d) => void (d.bays = (d.bays ?? []).filter((_, i) => i !== index)));
                  }}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p>
        <button
          type="button"
          className="bt-button bt-button--secondary"
          onClick={() => {
            onEdit((d) => void (d.bays = [...(d.bays ?? []), { kind: kinds[0]?.kind ?? "cargo", capacity: 1, doors: 1 }]));
          }}
        >
          Add a transport bay
        </button>
      </p>
      <fieldset className="bt-arm">
        <legend>Quarters (people)</legend>
        <div className="bt-grid">
          {QUARTERS.map(([key, label]) => (
            <NumberField
              key={key}
              id={`quarters-${key}`}
              label={label}
              value={record.quarters?.[key] ?? 0}
              min={0}
              onValid={(v) => {
                onEdit((d) => {
                  const next = { ...d.quarters, [key]: v ?? 0 };
                  if (next[key] === 0) delete next[key];
                  if (Object.keys(next).length === 0) delete d.quarters;
                  else d.quarters = next;
                }, `quarters-${key}`);
              }}
            />
          ))}
          <NumberField
            id="field-crew"
            label="Crew"
            value={record.crew ?? null}
            allowEmpty
            min={0}
            hint={crew ? `at least ${num(crew.minimum)}: ${num(crew.base)} to run it and ${plural(crew.gunners, "gunner")}` : undefined}
            onValid={(v) => {
              onEdit((d) => {
                if (v === null) delete d.crew;
                else d.crew = v;
              }, "crew");
            }}
          />
        </div>
      </fieldset>
      <ul className="bt-list bt-readout">
        {quarters.tons > 0 && <li className="bt-hint">{`Quarters ${plural(quarters.tons, "ton")}`}</li>}
        {doors && (
          <li className="bt-hint">{`${plural(doors.doors, "door")}${doors.limit === undefined ? "" : `, at most ${num(doors.limit)}`}; ${plural(doors.launchRate, "unit")} launched or landed a turn`}</li>
        )}
        {weaponBays.map((bay) => (
          <li key={bay.bay} className="bt-hint">{`Weapon bay ${bay.bay.startsWith("arc:") ? `of the ${aeroLocationName(bay.arc)}` : bay.bay}: ${plural(bay.weapons, "weapon")}, attack ${num(bay.attack)} of ${num(bay.limit)}${bay.over ? " (over)" : ""}`}</li>
        ))}
        {shortfalls.map((s) => (
          <li key={`${s.bay}-${s.weaponId}`} className="bt-hint">{`${catalog.byId(s.weaponId)?.name ?? s.weaponId} has ${num(s.have)} of the ${num(s.required)} shots of ammunition the book asks for`}</li>
        ))}
      </ul>
    </section>
  );
}
