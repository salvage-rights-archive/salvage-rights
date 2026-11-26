// The page around one saved Aces record that is not a behaviour card: load it by its id (or start a new one), the heading with Save
// and Delete, the unsaved-changes guard, and the two columns of form and preview. The command card, special order and support
// card pages each give it their own form. Nothing is saved until Save.
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useBlocker, useNavigate, useSearchParams } from "react-router";
import { findings } from "../../rules/aces-card";
import type { AcesRecord } from "../../rules/aces-card";
import LeaveConfirm from "../editor/LeaveConfirm";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { ACES_CARDS } from "./routes";
import { openAcesStorage } from "./storage";
import type { AcesStorage } from "./storage";
import "./aces.scss";

type Loaded<R> = { state: "loading" } | { state: "failed" } | { state: "missing" } | { state: "unreadable"; message: string } | { state: "ready"; storage: AcesStorage; record: R; isNew: boolean };

export interface FrameSpec<R extends AcesRecord> {
  kind: R["kind"];
  /** What the record is called in a sentence: "command card". */
  noun: string;
  make: (id: string, at: string) => R;
  heading: (r: R) => string;
  hint: (r: R) => string;
  /** What stops a save, in words; an empty list saves. */
  problems: (r: R) => string[];
  href: (id: string) => string;
}

export interface FrameProps<R extends AcesRecord> extends FrameSpec<R> {
  form: (r: R, set: (next: R) => void, idBase: string) => ReactNode;
  preview: (r: R) => ReactNode;
}

export function RecordFrame<R extends AcesRecord>(props: FrameProps<R>) {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const { kind, make } = props;
  const [loaded, setLoaded] = useState<Loaded<R>>({ state: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const storage = await openAcesStorage();
        if (id === "") {
          if (live) setLoaded({ state: "ready", storage, record: make(crypto.randomUUID(), new Date().toISOString()), isNew: true });
          return;
        }
        const entry = await storage.get(kind, id);
        if (!live) return;
        if (!entry) setLoaded({ state: "missing" });
        else if (entry.record?.kind !== kind) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", storage, record: entry.record as R, isNew: false });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
    // `make` is a module-level function on every page that uses this frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, kind]);

  if (loaded.state === "ready") return <Form key={loaded.record.id} {...props} initial={loaded.record} isNew={loaded.isNew} storage={loaded.storage} />;
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>{`Aces ${props.noun}`}</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? `That ${props.noun} is not saved on this device.` : `This saved ${props.noun} cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={ACES_CARDS}>
          Back to your cards
        </Link>
      </p>
    </div>
  );
}

function Form<R extends AcesRecord>({ initial, isNew, storage, ...spec }: FrameProps<R> & { initial: R; isNew: boolean; storage: AcesStorage }) {
  const navigate = useNavigate();
  const [record, setRecord] = useState<R>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const skipGuard = useRef(false);
  const uid = useId();

  const stops = spec.problems(record);
  const invalid = stops.length > 0;
  const dirty = JSON.stringify(record) !== saved;
  const notes = findings(record);
  const blocker = useBlocker(() => dirty && !skipGuard.current);
  const title = spec.heading(record);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty]);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  const set = (next: R) => {
    setStatus("");
    setRecord(next);
  };

  const save = async () => {
    if (invalid) return;
    try {
      await storage.save(record);
    } catch {
      setStatus("");
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setProblem("");
    setSaved(JSON.stringify(record));
    setStatus("Saved.");
    if (isNew) {
      skipGuard.current = true;
      await navigate(spec.href(record.id), { replace: true });
      skipGuard.current = false;
    }
  };

  const remove = async () => {
    try {
      await storage.remove(spec.kind, record.id);
    } catch {
      setConfirming(false);
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    skipGuard.current = true;
    void navigate(ACES_CARDS);
  };

  return (
    <div className="sr-page aces-editor">
      <header className="as-unit__header">
        <Link className="bt-back" to={ACES_CARDS}>
          <span aria-hidden="true">&larr; </span>Your cards
        </Link>
        <h1 tabIndex={-1}>{title}</h1>
        <p className="bt-hint">{spec.hint(record)}</p>
        <div className="bt-actions">
          <button type="button" className="bt-button" disabled={!dirty || invalid} onClick={() => void save()}>
            Save
          </button>
          {!isNew && (
            <button type="button" ref={deleteRef} className="bt-button bt-button--secondary" onClick={() => { setConfirming(true); }}>
              Delete
            </button>
          )}
        </div>
        {dirty && <p className="bt-hint">You have changes that are not saved.</p>}
        {invalid && (
          <ul className="bt-hint">
            {stops.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
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
          <p>{`Delete ${title}? This cannot be undone.`}</p>
          <span className="bt-actions">
            <button type="button" className="bt-button" onClick={() => void remove()}>
              Delete
            </button>
            <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={() => { setConfirming(false); deleteRef.current?.focus(); }}>
              Keep
            </button>
          </span>
        </div>
      )}

      <div className="aces-editor__body">
        <form
          className="aces-editor__form"
          aria-label={`${spec.noun[0]?.toUpperCase() ?? ""}${spec.noun.slice(1)} entry`}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {spec.form(record, set, uid)}
        </form>
        <div className="aces-editor__side">
          <section className="as-card" aria-labelledby={`${uid}-preview`}>
            <h2 id={`${uid}-preview`}>Preview</h2>
            {spec.preview(record)}
          </section>
          <section className="as-findings" aria-labelledby={`${uid}-findings`}>
            <h2 id={`${uid}-findings`}>Findings</h2>
            {notes.length === 0 ? (
              <p className="bt-hint">Nothing to report.</p>
            ) : (
              <ul>
                {notes.map((f) => (
                  <li key={`${f.at}-${f.problem}`}>
                    {f.problem} <span className="bt-hint">{f.at}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      {blocker.state === "blocked" && <LeaveConfirm proceed={blocker.proceed} reset={blocker.reset} />}
    </div>
  );
}

/** The private note every record may carry: kept on the device and in the player's own library file. */
export function NoteField({ id, record, onChange }: { id: string; record: AcesRecord; onChange: (note: string | undefined) => void }) {
  return (
    <div className="bt-field">
      <label htmlFor={id}>Your private notes</label>
      <textarea id={id} rows={3} value={record.note ?? ""} onChange={(e) => { onChange(e.target.value === "" ? undefined : e.target.value); }} />
      <p className="bt-hint as-field-note">Kept on this device and in your own library file, never shown to anyone else. Use them for anything the lists here cannot say.</p>
    </div>
  );
}

/** Applies a note to a record, leaving the key out when it is empty. */
export function withNote<R extends AcesRecord>(record: R, note: string | undefined): R {
  const { note: _drop, ...rest } = record;
  void _drop;
  return (note === undefined ? rest : { ...rest, note }) as R;
}
