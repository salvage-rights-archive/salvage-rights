// The behaviour card editor (design 6.1): identity, then the movement side with one tab per column, then the combat side. The
// player builds the card from our own vocabulary; nothing is saved until Save, and a card with only its identity saves too.
import { withoutSample } from "../../rules/aces-samples";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useSearchParams } from "react-router";
import { AS_GROUND_ROLES } from "../../data/alpha-strike";
import { ACES_VALUES } from "../../data/aces-vocab";
import type { ColumnId } from "../../data/aces-vocab";
import { cardLevel, deckKey, findings, hasOvBand, newAcesCard } from "../../rules/aces-card";
import type { AcesCard, Column } from "../../rules/aces-card";
import LeaveConfirm from "../editor/LeaveConfirm";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { CombatEditor, CombatPreview } from "./CombatEditor";
import { ColumnEditor, ColumnPreview, emptyColumn } from "./ColumnEditor";
import { ACES_CARDS, cardHref } from "./routes";
import { openAcesStorage } from "./storage";
import type { AcesStorage } from "./storage";
import "./aces.scss";

const SUBTYPES = ["Hover", "Infantry", "JMPS"];
const COLUMNS: { id: ColumnId; name: string }[] = ACES_VALUES.column.map((c) => ({ id: c.id, name: c.label }));
type Step = "identity" | "movement" | "combat";
const STEPS: { id: Step; name: string }[] = [
  { id: "identity", name: "1. Identity" },
  { id: "movement", name: "2. Movement side" },
  { id: "combat", name: "3. Combat side" },
];

/** The priority as typed: empty is not recorded, otherwise one to three digits. */
function readPriority(text: string): { ok: true; value: number | null } | { ok: false } {
  const t = text.trim();
  if (t === "") return { ok: true, value: null };
  return /^\d{1,3}$/.test(t) ? { ok: true, value: Number(t) } : { ok: false };
}
const priorityText = (n: number | null): string => (n === null ? "" : String(n).padStart(3, "0"));

type Loaded =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "ready"; storage: AcesStorage; card: AcesCard; isNew: boolean };

export default function CardEditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const storage = await openAcesStorage();
        if (id === "") {
          if (live) setLoaded({ state: "ready", storage, card: newAcesCard(crypto.randomUUID(), new Date().toISOString()), isNew: true });
          return;
        }
        const entry = await storage.get("aces-card", id);
        if (!live) return;
        if (!entry) setLoaded({ state: "missing" });
        else if (entry.record?.kind !== "aces-card") setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", storage, card: entry.record, isNew: false });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (loaded.state === "ready") return <CardForm key={loaded.card.id} initial={loaded.card} isNew={loaded.isNew} storage={loaded.storage} />;
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Aces card</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That card is not saved on this device." : `This saved card cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={ACES_CARDS}>
          Back to your cards
        </Link>
      </p>
    </div>
  );
}

function CardForm({ initial, isNew, storage }: { initial: AcesCard; isNew: boolean; storage: AcesStorage }) {
  const navigate = useNavigate();
  const [card, setCard] = useState<AcesCard>(initial);
  const [priorities, setPriorities] = useState({ movement: priorityText(initial.movement.priority), combat: priorityText(initial.combat.priority) });
  const [saved, setSaved] = useState(() => JSON.stringify([initial, priorityText(initial.movement.priority), priorityText(initial.combat.priority)]));
  const [step, setStep] = useState<Step>("identity");
  const [column, setColumn] = useState<ColumnId>("aggressive");
  const [otherSubtype, setOtherSubtype] = useState(() => initial.deck.subtype !== undefined && initial.deck.subtype !== "" && !SUBTYPES.includes(initial.deck.subtype));
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const skipGuard = useRef(false);
  const uid = useId();

  const move = readPriority(priorities.movement);
  const fight = readPriority(priorities.combat);
  const errors: { role?: string; position?: string; movement?: string; combat?: string } = {};
  if (card.deck.role === "") errors.role = "Choose the deck's role.";
  if (!Number.isInteger(card.position) || card.position < 1 || card.position > card.of) errors.position = `Choose a number from 1 to ${String(card.of)}.`;
  if (!move.ok) errors.movement = "Use one to three digits, or leave it empty.";
  if (!fight.ok) errors.combat = "Use one to three digits, or leave it empty.";
  const invalid = Object.keys(errors).length > 0;

  const built: AcesCard = {
    ...card,
    movement: { ...card.movement, priority: move.ok ? move.value : card.movement.priority },
    combat: { ...card.combat, priority: fight.ok ? fight.value : card.combat.priority },
  };
  const ovBand = hasOvBand(built);
  const dirty = JSON.stringify([card, priorities.movement, priorities.combat]) !== saved;
  const notes = findings(built);
  const level = cardLevel(built);
  const blocker = useBlocker(() => dirty && !skipGuard.current);
  const title = built.deck.role === "" ? "New card" : `${deckKey(built)}, card ${String(built.position)} of ${String(built.of)}`;

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

  const change = (patch: Partial<AcesCard>) => {
    setStatus("");
    setCard((c) => ({ ...c, ...patch }));
  };
  const setDeck = (patch: Partial<AcesCard["deck"]>) => {
    const next = { ...card.deck, ...patch };
    if (next.subtype === "" || next.subtype === undefined) delete next.subtype;
    change({ deck: next });
  };
  const defaultNoOv = !hasOvBand({ deck: card.deck });
  const setNoOv = (checked: boolean) => {
    const { noOv: _drop, ...rest } = card;
    void _drop;
    setStatus("");
    setCard(checked === defaultNoOv ? rest : { ...rest, noOv: checked });
  };
  const setColumnValue = (id: ColumnId, value: Column) => {
    const columns = card.movement.columns;
    if (columns) change({ movement: { ...card.movement, columns: { ...columns, [id]: value } } });
  };

  const save = async () => {
    if (invalid) return;
    try {
      await storage.save(withoutSample(built));
    } catch {
      setStatus("");
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setProblem("");
    setCard(built);
    setSaved(JSON.stringify([built, priorities.movement, priorities.combat]));
    setStatus(level === "identity" ? "Saved with its identity only. It still runs as a priority card." : "Saved.");
    if (isNew) {
      skipGuard.current = true;
      await navigate(cardHref(built.id), { replace: true });
      skipGuard.current = false;
    }
  };

  const remove = async () => {
    try {
      await storage.remove("aces-card", card.id);
    } catch {
      setConfirming(false);
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    skipGuard.current = true;
    void navigate(ACES_CARDS);
  };

  const columns = card.movement.columns;
  const copyId = `${uid}-copy`;

  return (
    <div className="sr-page aces-editor">
      <header className="as-unit__header">
        <Link className="bt-back" to={ACES_CARDS}>
          <span aria-hidden="true">&larr; </span>Your cards
        </Link>
        <h1 tabIndex={-1}>{title}</h1>
        <p className="bt-hint">{level === "full" ? "Both sides are recorded." : level === "identity" ? "Only the identity is recorded so far. The game will tell you to read this card." : level === "movement" ? "The movement side is recorded." : "The combat side is recorded."}</p>
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
        {invalid && <p className="bt-hint">Fix the marked fields to save.</p>}
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
          aria-label="Card entry"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <nav aria-label="Steps" className="aces-steps">
            {STEPS.map((s) => (
              <button key={s.id} type="button" className="bt-button bt-button--secondary aces-step" aria-pressed={step === s.id} onClick={() => { setStep(s.id); }}>
                {s.name}
              </button>
            ))}
          </nav>

          {step === "identity" && (
            <section aria-labelledby={`${uid}-identity`}>
              <h2 id={`${uid}-identity`}>Identity</h2>
              <div className="bt-field">
                <label htmlFor={`${uid}-role`}>Role</label>
                <select id={`${uid}-role`} value={card.deck.role} aria-invalid={errors.role ? true : undefined} aria-describedby={errors.role ? `${uid}-role-error` : undefined} onChange={(e) => { setDeck({ role: e.target.value }); }}>
                  <option value="">Choose a role</option>
                  {AS_GROUND_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {errors.role && <p id={`${uid}-role-error`} className="bt-problem as-field-note">{errors.role}</p>}
              </div>
              <fieldset className="aces-fieldset">
                <legend>Subtype, if the deck has one</legend>
                {[{ id: "", label: "None" }, ...SUBTYPES.map((s) => ({ id: s, label: s })), { id: "__other", label: "Another" }].map((s) => {
                  const checked = s.id === "__other" ? otherSubtype : !otherSubtype && (card.deck.subtype ?? "") === s.id;
                  return (
                    <label key={s.id || "none"} className="bt-check aces-chip">
                      <input
                        type="radio"
                        name={`${uid}-subtype`}
                        checked={checked}
                        onChange={() => {
                          setOtherSubtype(s.id === "__other");
                          setDeck({ subtype: s.id === "__other" ? "" : s.id });
                        }}
                      />
                      {s.label}
                    </label>
                  );
                })}
                {otherSubtype && (
                  <div className="bt-field">
                    <label htmlFor={`${uid}-subtype-text`}>Subtype, as printed in the deck's name</label>
                    <input id={`${uid}-subtype-text`} value={card.deck.subtype ?? ""} onChange={(e) => { setDeck({ subtype: e.target.value }); }} />
                  </div>
                )}
              </fieldset>
              <div className="bt-field">
                <label htmlFor={`${uid}-position`}>Card number in the deck (n of {card.of})</label>
                <select id={`${uid}-position`} value={String(card.position)} onChange={(e) => { change({ position: Number(e.target.value) }); }}>
                  {Array.from({ length: card.of }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>
                      {String(n)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bt-field">
                <label htmlFor={copyId}>Your label, if you own more than one copy of this deck</label>
                <input id={copyId} value={card.copy ?? ""} onChange={(e) => { const { copy: _drop, ...rest } = card; void _drop; setStatus(""); setCard(e.target.value === "" ? rest : { ...rest, copy: e.target.value }); }} />
              </div>
              <label className="bt-check" htmlFor={`${uid}-noov`}>
                <input id={`${uid}-noov`} type="checkbox" checked={!ovBand} onChange={(e) => { setNoOv(e.target.checked); }} />
                This deck has no overheat band
              </label>
              <p className="bt-hint">Hover and Infantry decks start with this ticked. Set it the same on each card of the deck.</p>
              <div className="bt-field">
                <label htmlFor={`${uid}-note`}>Your private notes</label>
                <textarea id={`${uid}-note`} rows={3} value={card.note ?? ""} onChange={(e) => { const { note: _drop, ...rest } = card; void _drop; setStatus(""); setCard(e.target.value === "" ? rest : { ...rest, note: e.target.value }); }} />
                <p className="bt-hint as-field-note">Kept on this device and in your own library file, never shown to anyone else. Use them for anything the lists here cannot say.</p>
              </div>
            </section>
          )}

          {step === "movement" && (
            <section aria-labelledby={`${uid}-movement`}>
              <h2 id={`${uid}-movement`}>Movement side</h2>
              <div className="bt-field">
                <label htmlFor={`${uid}-mpri`}>Movement priority</label>
                <input id={`${uid}-mpri`} inputMode="numeric" value={priorities.movement} aria-invalid={errors.movement ? true : undefined} aria-describedby={errors.movement ? `${uid}-mpri-error` : `${uid}-mpri-hint`} onChange={(e) => { setStatus(""); setPriorities((p) => ({ ...p, movement: e.target.value })); }} />
                <p id={`${uid}-mpri-hint`} className="bt-hint as-field-note">The three digit number on this side, such as 047. Empty if you have not read it.</p>
                {errors.movement && <p id={`${uid}-mpri-error`} className="bt-problem as-field-note">{errors.movement}</p>}
              </div>
              {!columns ? (
                <>
                  <p className="bt-hint">Only the priority is recorded for this side.</p>
                  <button
                    type="button"
                    className="bt-button bt-button--secondary"
                    onClick={() => { change({ movement: { ...card.movement, columns: { aggressive: emptyColumn(), balanced: emptyColumn(), cautious: emptyColumn() } } }); }}
                  >
                    Record the three columns
                  </button>
                </>
              ) : (
                <>
                  <nav aria-label="Columns" className="aces-steps">
                    {COLUMNS.map((c) => (
                      <button key={c.id} type="button" className="bt-button bt-button--secondary aces-step" aria-pressed={column === c.id} onClick={() => { setColumn(c.id); }}>
                        {c.name}
                      </button>
                    ))}
                  </nav>
                  <ColumnEditor
                    key={column}
                    idBase={`${uid}-col-${column}`}
                    name={COLUMNS.find((c) => c.id === column)?.name ?? column}
                    column={columns[column]}
                    hasWhen={column !== "cautious"}
                    onChange={(c) => { setColumnValue(column, c); }}
                  />
                  <button
                    type="button"
                    className="bt-button bt-button--secondary"
                    onClick={() => {
                      const { columns: _drop, ...rest } = card.movement;
                      void _drop;
                      change({ movement: rest });
                    }}
                  >
                    Forget the recorded columns
                  </button>
                </>
              )}
            </section>
          )}

          {step === "combat" && (
            <section aria-labelledby={`${uid}-combat`}>
              <h2 id={`${uid}-combat`}>Combat side</h2>
              <div className="bt-field">
                <label htmlFor={`${uid}-cpri`}>Combat priority</label>
                <input id={`${uid}-cpri`} inputMode="numeric" value={priorities.combat} aria-invalid={errors.combat ? true : undefined} aria-describedby={errors.combat ? `${uid}-cpri-error` : `${uid}-cpri-hint`} onChange={(e) => { setStatus(""); setPriorities((p) => ({ ...p, combat: e.target.value })); }} />
                <p id={`${uid}-cpri-hint`} className="bt-hint as-field-note">It can differ from the movement priority. Empty if you have not read it.</p>
                {errors.combat && <p id={`${uid}-cpri-error`} className="bt-problem as-field-note">{errors.combat}</p>}
              </div>
              <CombatEditor idBase={`${uid}-combat-rules`} combat={card.combat} overheat={ovBand} onChange={(combat) => { change({ combat }); }} />
              {card.combat.target && (
                <button
                  type="button"
                  className="bt-button bt-button--secondary"
                  onClick={() => {
                    const { target: _t, overheat: _o, ...rest } = card.combat;
                    void _t;
                    void _o;
                    change({ combat: rest });
                  }}
                >
                  Forget the combat rules
                </button>
              )}
            </section>
          )}
        </form>

        <div className="aces-editor__side">
          <section className="as-card" aria-labelledby={`${uid}-preview`}>
            <h2 id={`${uid}-preview`}>Card preview</h2>
            <p>
              <strong>{built.deck.role === "" ? "No role chosen" : deckKey(built)}</strong>
              {` card ${String(built.position)} of ${String(built.of)}`}
              {built.copy ? `, ${built.copy}` : ""}
            </p>
            <p className="bt-hint">{`Movement priority ${priorityText(built.movement.priority) || "not recorded"}. Combat priority ${priorityText(built.combat.priority) || "not recorded"}.`}</p>
            {columns ? COLUMNS.map((c) => <ColumnPreview key={c.id} name={c.name} column={columns[c.id]} />) : <p className="bt-hint">Movement columns not recorded.</p>}
            <CombatPreview combat={built.combat} overheat={ovBand} />
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
