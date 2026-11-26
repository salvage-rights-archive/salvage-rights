import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { duplicateForce, forceTotals, newAsForce } from "../../rules/as-force";
import type { AsForce } from "../../rules/as-force";
import { unitTitle } from "../../rules/as-unit";
import type { AsUnit } from "../../rules/as-unit";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadJson } from "../storage";
import { downloadForce, fromForceFile, openAsStorage, planForceImport } from "./storage";
import type { AsForceEntry, AsStorage } from "./storage";

const MAX_IMPORT_BYTES = 1024 * 1024 * 8;
export const forceHref = (id: string) => `/battletech/alpha-strike/force?id=${encodeURIComponent(id)}`;
export const printForceHref = (id: string) => `/battletech/alpha-strike/print?force=${encodeURIComponent(id)}`;
export const printUnitHref = (id: string) => `/battletech/alpha-strike/print?unit=${encodeURIComponent(id)}`;

/** The wording for a total against a limit, shared by the home list and the force page. */
export function limitWords(total: number, room: number | undefined): string {
  if (room === undefined) return `${String(total)} PV`;
  return room >= 0 ? `${String(total)} PV of ${String(total + room)} (${String(room)} to spare)` : `${String(total)} PV of ${String(total + room)} (${String(-room)} over the limit)`;
}

interface Pending {
  force: AsForce;
  add: AsUnit[];
  conflicts: AsUnit[];
}

/** The home page's Forces section: the saved forces, a new one, a copy, a file in or out. */
export default function AsForces() {
  const navigate = useNavigate();
  const [storage, setStorage] = useState<AsStorage>();
  const [forces, setForces] = useState<AsForceEntry[]>([]);
  const [roster, setRoster] = useState<AsUnit[]>([]);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [pending, setPending] = useState<Pending>();
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const replaceRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const say = (text: string) => {
    setProblem("");
    setStatus(text);
  };
  const fail = (text: string) => {
    setStatus("");
    setProblem(text);
  };

  const reload = async (s: AsStorage): Promise<boolean> => {
    try {
      setForces(await s.listForces());
      setRoster((await s.list()).flatMap((e) => (e.unit ? [e.unit] : [])));
      return true;
    } catch {
      fail(STORAGE_READ_FAILED);
      return false;
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const s = await openAsStorage();
        setStorage(s);
        setForces(await s.listForces());
        setRoster((await s.list()).flatMap((e) => (e.unit ? [e.unit] : [])));
      } catch {
        fail(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);
  useEffect(() => {
    if (pending) replaceRef.current?.focus();
  }, [pending]);

  const attempt = async (work: (s: AsStorage) => Promise<string>) => {
    if (!storage) return;
    try {
      const message = await work(storage);
      if (await reload(storage)) say(message);
    } catch {
      fail(STORAGE_WRITE_FAILED);
    }
  };

  const duplicate = (force: AsForce) =>
    attempt(async (s) => {
      await s.saveForce(duplicateForce(force, crypto.randomUUID()));
      return "Force copied.";
    });

  const remove = async (id: string) => {
    setConfirming(undefined);
    await attempt(async (s) => {
      await s.removeForce(id);
      return "Deleted.";
    });
    headingRef.current?.focus();
  };

  const exportRaw = async (id: string) => {
    if (!storage) return;
    try {
      downloadJson(`${id.replace(/[^A-Za-z0-9-]+/g, "-") || "force"}.raw.json`, (await storage.rawForce(id)) ?? null);
      say("Export started.");
    } catch {
      fail("We could not read that force to export it.");
    }
  };

  const finish = (plan: Pending, replace: boolean) => {
    setPending(undefined);
    return attempt(async (s) => {
      const have = new Set((await s.listForces()).map((f) => f.id));
      for (const unit of [...plan.add, ...(replace ? plan.conflicts : [])]) await s.save(unit);
      await s.saveForce(have.has(plan.force.id) ? { ...plan.force, id: crypto.randomUUID() } : plan.force);
      const kept = replace ? 0 : plan.conflicts.length;
      return `Force imported with ${String(plan.add.length)} new ${plan.add.length === 1 ? "unit" : "units"}${kept > 0 ? `; ${String(kept)} of your own ${kept === 1 ? "unit was" : "units were"} kept as they are` : ""}.`;
    });
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    input.value = "";
    if (!chosen || !storage) return;
    say("");
    setPending(undefined);
    if (chosen.size > MAX_IMPORT_BYTES) return fail("That file is too large to be a force file.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(await chosen.text());
    } catch {
      return fail("That file is not a force file.");
    }
    const result = fromForceFile(parsed);
    if (!result.ok) return fail(result.message);
    try {
      const { add, conflicts } = planForceImport(result.units, (await storage.list()).flatMap((e) => (e.unit ? [e.unit] : [])));
      const plan = { force: result.force, add, conflicts };
      if (conflicts.length > 0) setPending(plan);
      else await finish(plan, false);
    } catch {
      fail(STORAGE_READ_FAILED);
    }
  };

  const byId = new Map(roster.map((u) => [u.id, u]));

  return (
    <section className="bt-section" aria-labelledby="as-forces">
      <h2 id="as-forces" ref={headingRef} tabIndex={-1}>
        Forces
      </h2>
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {storage && forces.length === 0 ? (
        <p>No forces yet.</p>
      ) : (
        <ul className="bt-list">
          {forces.map((entry) => {
            const force = entry.force;
            if (!force) {
              return (
                <li key={entry.id} className="bt-row">
                  <span className="bt-row__text">This saved force cannot be read. {entry.unreadable}</span>
                  <span className="bt-row__actions">
                    <button type="button" className="bt-button bt-button--secondary" onClick={() => void exportRaw(entry.id)}>
                      Export raw
                    </button>
                    <button type="button" className="bt-button bt-button--secondary" onClick={(event) => { openerRef.current = event.currentTarget; setConfirming({ id: entry.id, name: "this force" }); }}>
                      Delete
                    </button>
                  </span>
                </li>
              );
            }
            const name = force.name || "Unnamed force";
            const totals = forceTotals(force, byId);
            const over = totals.room !== undefined && totals.room < 0;
            return (
              <li key={entry.id} className="bt-row">
                <span className="bt-row__text">
                  <strong>{name}</strong>
                  {` ${String(totals.count)} ${totals.count === 1 ? "unit" : "units"}, `}
                  <span className={over ? "as-over" : undefined}>{limitWords(totals.total, totals.room)}</span>
                </span>
                <span className="bt-row__actions">
                  <Link className="bt-button" aria-label={`Open ${name}`} to={forceHref(force.id)}>
                    Open
                  </Link>
                  <Link className="bt-button bt-button--secondary" aria-label={`Print ${name}`} to={printForceHref(force.id)}>
                    Print
                  </Link>
                  <button type="button" className="bt-button bt-button--secondary" aria-label={`Duplicate ${name}`} onClick={() => void duplicate(force)}>
                    Duplicate
                  </button>
                  <button type="button" className="bt-button bt-button--secondary" aria-label={`Export ${name}`} onClick={() => { downloadForce(force, roster); say("Export started."); }}>
                    Export
                  </button>
                  <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={(event) => { openerRef.current = event.currentTarget; setConfirming({ id: entry.id, name }); }}>
                    Delete
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {confirming && (
        <div
          className="bt-confirm"
          role="group"
          aria-label="Confirm delete force"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setConfirming(undefined);
              openerRef.current?.focus();
            }
          }}
        >
          <p>{`Delete ${confirming.name}? The units stay in your roster. This cannot be undone.`}</p>
          <span className="bt-row__actions">
            <button type="button" className="bt-button" onClick={() => void remove(confirming.id)}>
              Delete
            </button>
            <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={() => { setConfirming(undefined); openerRef.current?.focus(); }}>
              Keep
            </button>
          </span>
        </div>
      )}
      {pending && (
        <div className="bt-confirm" role="group" aria-label="Units that differ">
          <p>
            {`This file has ${String(pending.conflicts.length)} ${pending.conflicts.length === 1 ? "unit" : "units"} with the same id as one of yours but different values: ${pending.conflicts.map((u) => unitTitle(u) || "unnamed").join(", ")}. Replace yours with the file's, or keep yours?`}
          </p>
          <span className="bt-row__actions">
            <button type="button" ref={replaceRef} className="bt-button" onClick={() => void finish(pending, true)}>
              Replace mine
            </button>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => void finish(pending, false)}>
              Keep mine
            </button>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => { setPending(undefined); say("Import cancelled."); }}>
              Cancel
            </button>
          </span>
        </div>
      )}
      <p>
        <button
          type="button"
          className="bt-button"
          onClick={() => {
            const force = newAsForce(crypto.randomUUID());
            void (async () => {
              if (!storage) return;
              try {
                await storage.saveForce(force);
                await navigate(forceHref(force.id));
              } catch {
                fail(STORAGE_WRITE_FAILED);
              }
            })();
          }}
        >
          Start a new force
        </button>
      </p>
      <div className="bt-field">
        <label htmlFor="as-force-file">Import a force file</label>
        <input id="as-force-file" type="file" accept="application/json,.json" disabled={!storage} onChange={(event) => void upload(event)} />
      </div>
    </section>
  );
}
