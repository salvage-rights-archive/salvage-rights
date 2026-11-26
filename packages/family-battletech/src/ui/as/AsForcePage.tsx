import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AS_FORCE_CITES, AS_SKILL_NAMES, SKILLS } from "../../data/alpha-strike";
import { clampSkill, duplicateForce, forceTotals } from "../../rules/as-force";
import type { AsForce } from "../../rules/as-force";
import { asOfficialMark } from "../../rules/as-mul";
import { unitTitle } from "../../rules/as-unit";
import type { AsUnit } from "../../rules/as-unit";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { forceHref, limitWords } from "./AsForces";
import { downloadForce, openAsStorage } from "./storage";
import type { AsStorage } from "./storage";
import "../classic.scss";
import "./alpha-strike.scss";

const HOME = "/battletech/alpha-strike/home";

type Loaded =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "ready"; storage: AsStorage; force: AsForce; roster: AsUnit[] };

export default function AsForcePage() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const storage = await openAsStorage();
        const entry = id ? await storage.getForce(id) : undefined;
        const roster = (await storage.list()).flatMap((e) => (e.unit ? [e.unit] : []));
        if (!live) return;
        if (!entry) setLoaded({ state: "missing" });
        else if (!entry.force) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", storage, force: entry.force, roster });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (loaded.state === "ready") return <ForceEditor key={loaded.force.id} initial={loaded.force} roster={loaded.roster} storage={loaded.storage} />;
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Alpha Strike force</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That force is not saved on this device." : `This saved force cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={HOME}>
          Back to Alpha Strike
        </Link>
      </p>
    </div>
  );
}

function ForceEditor({ initial, roster, storage }: { initial: AsForce; roster: AsUnit[]; storage: AsStorage }) {
  const navigate = useNavigate();
  // Every change is saved as it is made, so there is no unsaved state to guard.
  const [force, setForce] = useState(initial);
  const [limitText, setLimitText] = useState(initial.pvLimit === undefined ? "" : String(initial.pvLimit));
  const [choice, setChoice] = useState("");
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const membersRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  const byId = new Map(roster.map((u) => [u.id, u]));
  const totals = forceTotals(force, byId);
  const over = totals.room !== undefined && totals.room < 0;
  const limitBad = limitText.trim() !== "" && !/^\d+$/.test(limitText.trim());

  const change = async (next: AsForce, message = "Saved.") => {
    setForce(next);
    try {
      await storage.saveForce(next);
      setProblem("");
      setStatus(message);
    } catch {
      setStatus("");
      setProblem(STORAGE_WRITE_FAILED);
    }
  };

  const setMember = (index: number, patch: Partial<AsForce["members"][number]>) =>
    change({ ...force, members: force.members.map((m, i) => (i === index ? { ...m, ...patch } : m)) });

  const add = () => {
    const unit = byId.get(choice);
    if (!unit) return;
    void change({ ...force, members: [...force.members, { unitId: unit.id, skill: clampSkill(unit.skill) }] }, `Added ${unitTitle(unit) || "a unit"}.`);
  };

  const remove = (index: number) => {
    const unit = totals.lines[index]?.unit;
    const name = (unit && unitTitle(unit)) || "the unit";
    void change({ ...force, members: force.members.filter((_, i) => i !== index) }, `Removed ${name}.`);
    membersRef.current?.focus();
  };

  const copy = async () => {
    const next = duplicateForce(force, crypto.randomUUID());
    try {
      await storage.saveForce(next);
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    await navigate(forceHref(next.id));
  };

  const deleteForce = async () => {
    try {
      await storage.removeForce(force.id);
    } catch {
      setConfirming(false);
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    void navigate(HOME);
  };

  return (
    <div className="sr-page as-force">
      <header className="as-unit__header">
        <p>
          <Link className="bt-back" to={HOME}>
            Back to Alpha Strike
          </Link>
        </p>
        <h1>{force.name.trim() || "Unnamed force"}</h1>
        <div className="bt-actions">
          <Link className="bt-button" to={`/battletech/alpha-strike/table?force=${encodeURIComponent(force.id)}`}>
            Play at the table
          </Link>
          <button type="button" className="bt-button bt-button--secondary" onClick={() => { downloadForce(force, roster); setStatus("Export started."); }}>
            Export
          </button>
          <button type="button" className="bt-button bt-button--secondary" onClick={() => void copy()}>
            Duplicate
          </button>
          <button type="button" ref={deleteRef} className="bt-button bt-button--secondary" onClick={() => { setConfirming(true); }}>
            Delete
          </button>
        </div>
      </header>
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {confirming && (
        <div
          className="bt-confirm"
          role="group"
          aria-label="Confirm delete"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setConfirming(false);
              deleteRef.current?.focus();
            }
          }}
        >
          <p>{`Delete ${force.name.trim() || "this force"}? The units stay in your roster. This cannot be undone.`}</p>
          <span className="bt-actions">
            <button type="button" className="bt-button" onClick={() => void deleteForce()}>
              Delete
            </button>
            <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={() => { setConfirming(false); deleteRef.current?.focus(); }}>
              Keep
            </button>
          </span>
        </div>
      )}

      <section className="bt-section" aria-labelledby="as-force-details">
        <h2 id="as-force-details">The force</h2>
        <div className="bt-field">
          <label htmlFor="as-force-name">Name</label>
          <input id="as-force-name" value={force.name} onChange={(e) => void change({ ...force, name: e.target.value })} />
        </div>
        <div className="bt-field">
          <label htmlFor="as-force-limit">PV limit</label>
          <input
            id="as-force-limit"
            inputMode="numeric"
            value={limitText}
            aria-invalid={limitBad ? true : undefined}
            aria-describedby="as-force-limit-note"
            onChange={(e) => {
              const text = e.target.value;
              setLimitText(text);
              const trimmed = text.trim();
              if (trimmed === "") void change({ ...force, pvLimit: undefined });
              else if (/^\d+$/.test(trimmed)) void change({ ...force, pvLimit: Number(trimmed) });
            }}
          />
          <p id="as-force-limit-note" className={`as-field-note ${limitBad ? "bt-problem" : "bt-hint"}`}>
            {limitBad ? "Write the limit as a whole number, or leave it blank for none." : "The total the players agree on before they build forces (about 400 for a company-sized game). Blank means no limit."}
          </p>
        </div>
        <div className="as-totals" role="region" aria-label="Totals" aria-live="polite">
          <p className="as-totals__main">
            <strong className={over ? "as-over" : undefined}>{limitWords(totals.total, totals.room)}</strong>
          </p>
          <p>{`${String(totals.count)} ${totals.count === 1 ? "unit" : "units"}${totals.missing > 0 ? `, and ${String(totals.missing)} no longer in your roster (counted as nothing)` : ""}.`}</p>
        </div>
        <p className="bt-hint">{`Each unit's PV is adjusted for its pilot's Skill (Alpha Strike: Commander's Edition, p. ${String(AS_FORCE_CITES.skill.page)}); force building is on pp. ${AS_FORCE_CITES.steps.pages.join("-")}. If a source gives Piloting and Gunnery skills but no Alpha Strike Skill, use their average rounded down (errata v7.02).`}</p>
      </section>

      <section className="bt-section" aria-labelledby="as-force-members">
        <h2 id="as-force-members" ref={membersRef} tabIndex={-1}>
          Units in this force
        </h2>
        {force.members.length === 0 ? (
          <p>No units yet. Add one from your roster below.</p>
        ) : (
          <ul className="bt-list">
            {totals.lines.map((line, index) => {
              const name = line.unit ? unitTitle(line.unit) || "Unnamed unit" : "";
              return (
                <li key={index} className="bt-row as-member">
                  {line.unit ? (
                    <>
                      <span className="bt-row__text as-member__name">
                        <strong>{name}</strong>
                        {` ${line.unit.card.type}, base PV ${String(line.base)}`}
                        <span className="bt-row__credit">{asOfficialMark(line.unit).text}</span>
                      </span>
                      <span className="as-member__pv">{`PV ${String(line.adjusted)}`}</span>
                      <div className="bt-field">
                        <label htmlFor={`as-skill-${String(index)}`}>Skill</label>
                        <select id={`as-skill-${String(index)}`} value={clampSkill(line.member.skill)} onChange={(e) => void setMember(index, { skill: Number(e.target.value) })}>
                          {SKILLS.map((s) => (
                            <option key={s} value={s}>{`${String(s)}, ${AS_SKILL_NAMES[s] ?? ""}`}</option>
                          ))}
                        </select>
                      </div>
                      <div className="bt-field">
                        <label htmlFor={`as-pilot-${String(index)}`}>Pilot</label>
                        <input id={`as-pilot-${String(index)}`} value={line.member.pilot ?? ""} onChange={(e) => void setMember(index, { pilot: e.target.value })} />
                      </div>
                    </>
                  ) : (
                    <span className="bt-row__text as-member__name">This unit is no longer in your roster.</span>
                  )}
                  <button type="button" className="bt-button bt-button--secondary" aria-label={name ? `Remove ${name}` : "Remove this unit"} onClick={() => { remove(index); }}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bt-section" aria-labelledby="as-force-add">
        <h2 id="as-force-add">Add from your roster</h2>
        {roster.length === 0 ? (
          <p>
            Your roster is empty. <Link to={HOME}>Add units on the Alpha Strike page</Link> first.
          </p>
        ) : (
          <div className="bt-field">
            <label htmlFor="as-force-unit">Unit</label>
            <select id="as-force-unit" value={choice} onChange={(e) => { setChoice(e.target.value); }}>
              <option value="">Choose a unit</option>
              {roster.map((u) => (
                <option key={u.id} value={u.id}>{`${unitTitle(u) || "Unnamed unit"} (PV ${String(u.card.pv)})`}</option>
              ))}
            </select>
            <button type="button" className="bt-button" disabled={choice === ""} onClick={add}>
              Add to force
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
