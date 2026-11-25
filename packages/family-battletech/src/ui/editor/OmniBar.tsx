// What an OmniMech chassis adds to the editor: the tab strip over its base and configurations (Prime, A, B...) with the controls that add,
// copy, rename, reorder and delete a configuration, the pod space readout, what an edit to the base breaks in each configuration, and the
// side-by-side comparison. The chassis lives in the page's history; every change here goes back to it through `onChassis`.
import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { locationName } from "../../rules/mech";
import type { LocationCode, MechRecord } from "../../rules/mech";
import { battleValue } from "../../rules/bv";
import { unitCost } from "../../rules/cost";
import type { Catalog } from "../../rules/catalog";
import {
  BASE,
  brokenBy,
  configurationLevel,
  configurationTitle,
  copyConfiguration,
  deleteConfiguration,
  moveConfiguration,
  podSpace,
  podTonsUsed,
  renameConfiguration,
  resolveConfiguration,
} from "../../rules/omni";
import type { OmniChassis } from "../../rules/omni";
import { levelRow } from "../../rules/levels";
import { equipmentItems, jumpMP, rowOf, heatSinkCapacity } from "../../rules/walk";
import { citation } from "./FindingsPanel";
import { TextField } from "../EditorPage";

export const OMNI_PANEL_ID = "omni-panel";
export const omniTabId = (id: string) => `omni-tab-${id}`;

type Change = (chassis: OmniChassis) => OmniChassis;
export type OnChassis = (change: Change, field?: string) => void;

const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? "" : "s"}`;
const number = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** The tab strip over the base and the configurations, and the controls for the selected configuration. */
export function ConfigurationBar({
  chassis,
  selected,
  onSelect,
  onChassis,
  comparing,
  onCompare,
}: {
  chassis: OmniChassis;
  selected: string;
  onSelect: (id: string) => void;
  onChassis: OnChassis;
  comparing: boolean;
  onCompare: (on: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [successor, setSuccessor] = useState("");
  const tabs = [BASE, ...chassis.configurations.map((c) => c.id)];
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const current = chassis.configurations.find((c) => c.id === selected);
  const isPrimary = current?.id === chassis.primaryId;
  const only = chassis.configurations.length <= 1;
  const at = chassis.configurations.findIndex((c) => c.id === selected);

  const go = (id: string) => {
    onSelect(id);
    setDeleting(false);
    refs.current[id]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const i = tabs.indexOf(selected);
    const target = event.key === "ArrowRight" ? tabs[(i + 1) % tabs.length] : event.key === "ArrowLeft" ? tabs[(i - 1 + tabs.length) % tabs.length] : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : undefined;
    if (target === undefined) return;
    event.preventDefault();
    go(target);
  };
  const add = () => {
    const from = current?.id ?? chassis.primaryId;
    const next = copyConfiguration(chassis, from);
    const created = next.configurations.at(-1);
    if (!created || next === chassis) return;
    onChassis(() => next);
    onSelect(created.id);
  };
  const remove = () => {
    if (!current) return;
    const next = deleteConfiguration(chassis, current.id, successor || undefined);
    if (next === chassis) return;
    setDeleting(false);
    onChassis(() => next);
    onSelect(next.primaryId);
  };

  return (
    <section className="bt-panel bt-omni" aria-labelledby="bt-omni-heading">
      <h2 id="bt-omni-heading">Configurations</h2>
      <div role="tablist" aria-label="Base and configurations" className="bt-omni__tabs" onKeyDown={onKeyDown}>
        {tabs.map((id) => {
          const config = chassis.configurations.find((c) => c.id === id);
          const label = id === BASE ? "Base" : config ? `${configurationTitle(config)}${id === chassis.primaryId ? " (Primary)" : ""}` : id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={omniTabId(id)}
              ref={(element) => {
                refs.current[id] = element;
              }}
              aria-selected={id === selected}
              aria-controls={OMNI_PANEL_ID}
              tabIndex={id === selected ? 0 : -1}
              className="bt-omni__tab"
              onClick={() => {
                go(id);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="bt-actions bt-omni__actions">
        <button type="button" className="bt-button" onClick={add}>
          Add configuration
        </button>
        <button
          type="button"
          className="bt-button bt-button--secondary"
          aria-pressed={comparing}
          onClick={() => {
            onCompare(!comparing);
          }}
        >
          Compare configurations
        </button>
      </div>
      <p className="bt-hint">{selected === BASE ? "Add configuration copies the Primary." : `Add configuration copies ${current ? configurationTitle(current) : "this one"}.`}</p>

      {current && (
        <div className="bt-omni__manage" role="group" aria-label={`The ${current.code} configuration`}>
          <div className="bt-grid">
            <TextField
              id="omni-code"
              label="Code"
              value={current.code}
              onChange={(code) => {
                onChassis((c) => renameConfiguration(c, current.id, { code }), `omni-code-${current.id}`);
              }}
            />
            <TextField
              id="omni-name"
              label="Name"
              value={current.name ?? ""}
              onChange={(name) => {
                onChassis((c) => renameConfiguration(c, current.id, { name }), `omni-name-${current.id}`);
              }}
            />
          </div>
          <div className="bt-actions">
            <button
              type="button"
              className="bt-button bt-button--secondary"
              disabled={at <= 0}
              onClick={() => {
                onChassis((c) => moveConfiguration(c, current.id, -1));
              }}
            >
              Move earlier
            </button>
            <button
              type="button"
              className="bt-button bt-button--secondary"
              disabled={at < 0 || at >= chassis.configurations.length - 1}
              onClick={() => {
                onChassis((c) => moveConfiguration(c, current.id, 1));
              }}
            >
              Move later
            </button>
            <button
              type="button"
              className="bt-button bt-button--secondary"
              disabled={isPrimary}
              onClick={() => {
                onChassis((c) => ({ ...c, primaryId: current.id }));
              }}
            >
              Make Primary
            </button>
            <button
              type="button"
              className="bt-button bt-button--secondary"
              disabled={only}
              onClick={() => {
                setSuccessor(chassis.configurations.find((c) => c.id !== current.id)?.id ?? "");
                setDeleting(true);
              }}
            >
              Delete configuration
            </button>
          </div>
          {only && <p className="bt-hint">An OmniMech keeps at least one configuration.</p>}
          {deleting && (
            <div className="bt-confirm" role="group" aria-label="Confirm delete configuration">
              <p>{`Delete ${configurationTitle(current)}? This cannot be undone.`}</p>
              {isPrimary && (
                <div className="bt-field">
                  <label htmlFor="omni-successor">New Primary</label>
                  <select
                    id="omni-successor"
                    value={successor}
                    onChange={(event) => {
                      setSuccessor(event.target.value);
                    }}
                  >
                    {chassis.configurations
                      .filter((c) => c.id !== current.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {configurationTitle(c)}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <span className="bt-actions">
                <button type="button" className="bt-button" onClick={remove}>
                  Delete
                </button>
                <button
                  type="button"
                  className="bt-button bt-button--secondary"
                  onClick={() => {
                    setDeleting(false);
                  }}
                >
                  Keep
                </button>
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** The pod space the base leaves, and on a configuration how much its pods use. */
export function PodSpacePanel({ chassis, record, catalog, onEditBase }: { chassis: OmniChassis; record: MechRecord; catalog: Catalog; onEditBase: () => void }) {
  const space = useMemo(() => podSpace(chassis, catalog), [chassis, catalog]);
  const used = record.omni?.isBase ? null : podTonsUsed(chassis, record, catalog);
  const meter = useId();
  const slots = (Object.entries(space.slots) as [LocationCode, number][]).filter(([, n]) => n > 0);
  const actuators = (Object.entries(space.actuators) as [LocationCode, number][]).map(([loc, n]) => `${locationName(loc)} ${n}`);
  return (
    <section className="bt-panel" aria-labelledby="bt-pod-heading">
      <h2 id="bt-pod-heading">Pod space</h2>
      {space.tons === null ? (
        <p>The base holds an item whose weight is not known, so its pod space is not worked out.</p>
      ) : used === null ? (
        <p>{`The base leaves ${number(space.tons)} tons for pods.`}</p>
      ) : (
        <>
          <label htmlFor={meter}>{`Pods use ${number(used)} of ${number(space.tons)} tons`}</label>
          <meter id={meter} min={0} max={space.tons} value={Math.min(used, space.tons)} optimum={space.tons} className="bt-omni__meter">
            {`${number(used)} of ${number(space.tons)} tons`}
          </meter>
          {used > space.tons && <p className="bt-problem">{`The pods are ${number(Math.round((used - space.tons) * 1000) / 1000)} tons over the pod space.`}</p>}
        </>
      )}
      <p>{slots.length === 0 ? "The base leaves no open slots." : `Open slots in the base: ${slots.map(([loc, n]) => `${locationName(loc)} ${n}`).join(", ")}.`}</p>
      {actuators.length > 0 && <p className="bt-hint">{`Each arm's lower arm and hand are pod items: removing them adds their slots (${actuators.join(", ")}).`}</p>}
      {!record.omni?.isBase && (
        <p className="bt-hint">
          The base's parts are fixed here.{" "}
          <button type="button" className="bt-link" onClick={onEditBase}>
            Edit base
          </button>
        </p>
      )}
    </section>
  );
}

/** What the changes since the last save to the base break: for each configuration, the errors it did not have before. Nothing is changed for the player. */
export function BaseBreaks({ saved, chassis, catalog }: { saved: OmniChassis; chassis: OmniChassis; catalog: Catalog }) {
  const baseChanged = JSON.stringify([saved.base, saved.tons, saved.body, saved.techBase]) !== JSON.stringify([chassis.base, chassis.tons, chassis.body, chassis.techBase]);
  const deferred = useDeferredValue(chassis);
  const broken = useMemo(() => (baseChanged ? brokenBy(saved, deferred, catalog) : []), [baseChanged, saved, deferred, catalog]);
  if (!baseChanged) return null;
  const summary = broken.length === 0 ? "The changes to the base break nothing in any configuration." : `The changes to the base break ${plural(broken.length, "configuration")} of ${chassis.configurations.length}.`;
  return (
    <section className="bt-panel" aria-labelledby="bt-breaks-heading">
      <h2 id="bt-breaks-heading">What the base changes break</h2>
      <p role="status">{summary}</p>
      {broken.length > 0 && (
        <ul className="bt-breaks">
          {broken.map((b) => (
            <li key={b.id}>
              <strong>{b.code}</strong>: {plural(b.added.length, "new error")}
              <ul>
                {b.added.map((f, index) => (
                  <li key={index}>{`${f.message}${f.cite ? ` (${citation(f.cite)})` : ""}`}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="bt-hint">Nothing was changed in the configurations; fix each one or undo the base change.</p>
    </section>
  );
}

/** Battle Value, cost, pod tons, heat and speed of every configuration side by side. */
export function CompareView({ chassis, catalog }: { chassis: OmniChassis; catalog: Catalog }) {
  const rows = useMemo(
    () =>
      chassis.configurations.flatMap((c) => {
        const record = resolveConfiguration(chassis, c.id);
        if (!record) return [];
        const bv = battleValue(record, catalog);
        const cost = unitCost(record, catalog);
        const { items } = equipmentItems(record, catalog);
        const heat = record.mounts.reduce((sum, m) => {
          const row = rowOf(catalog, record, m);
          return sum + (row?.kind === "weapon" ? (row.heat ?? 0) : 0);
        }, 0);
        return [
          {
            id: c.id,
            title: configurationTitle(c),
            bv: `${bv.unvalued.length > 0 ? "at least " : ""}${number(bv.total)}`,
            cost: `${cost.unpriced.length > 0 ? "at least " : ""}${number(cost.total)}`,
            pods: podTonsUsed(chassis, record, catalog),
            heat: `${heat} of ${heatSinkCapacity(record) ?? "?"}`,
            jump: jumpMP(items),
            level: levelRow(configurationLevel(record, catalog)).label,
          },
        ];
      }),
    [chassis, catalog],
  );
  const space = podSpace(chassis, catalog).tons;
  const lines: [string, (r: (typeof rows)[number]) => string][] = [
    ["Battle Value", (r) => r.bv],
    ["Cost (C-bills)", (r) => r.cost],
    ["Pod tons used", (r) => (r.pods === null ? "unknown" : `${number(r.pods)}${space === null ? "" : ` of ${number(space)}`}`)],
    ["Heat, firing every weapon, of capacity", (r) => r.heat],
    ["Jump MP", (r) => String(r.jump)],
    ["Rules level", (r) => r.level],
  ];
  return (
    <section className="bt-panel bt-compare" aria-labelledby="bt-compare-heading">
      <h2 id="bt-compare-heading">Configurations side by side</h2>
      <div className="bt-compare__scroll" tabIndex={0} role="region" aria-label="Comparison table">
        <table>
          <caption className="sr-visually-hidden">Battle Value, cost, pod tons, heat, jump and rules level of each configuration</caption>
          <thead>
            <tr>
              <td />
              {rows.map((r) => (
                <th key={r.id} scope="col">
                  {r.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map(([label, read]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {rows.map((r) => (
                  <td key={r.id}>{read(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="bt-hint">Battle Value is for a Gunnery 4, Piloting 5 pilot. Cost includes the Omni factor of 1.25.</p>
    </section>
  );
}
