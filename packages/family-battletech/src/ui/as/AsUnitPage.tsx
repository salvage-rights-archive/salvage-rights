import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Link, useBlocker, useLocation, useNavigate, useSearchParams } from "react-router";
import { AS_AEROSPACE_ROLES, AS_EDITION, AS_GROUND_ROLES, AS_UNIT_TYPES, SKILLS } from "../../data/alpha-strike";
import { formatDamage, formatMove, formatSpecials, newAsUnit, parseDamage, parseMove, parseSpecials, unitFindings, unitTitle } from "../../rules/as-unit";
import type { AsDamage, AsUnit } from "../../rules/as-unit";
import { asOfficialMark } from "../../rules/as-mul";
import LeaveConfirm from "../editor/LeaveConfirm";
import { readPicture } from "../picture";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { GlossSwitch, SpecialLinks } from "./AsSpecials";
import { downloadUnit, isAsUnit, openAsStorage } from "./storage";
import type { AsStorage } from "./storage";

const HOME = "/battletech/alpha-strike/home";

/** The form holds text, so a half-typed value is never lost; `buildUnit` turns it into a unit and says what is wrong. */
interface Fields {
  chassis: string;
  model: string;
  type: string;
  size: string;
  tmm: string;
  move: string;
  role: string;
  pv: string;
  s: string;
  m: string;
  l: string;
  ov: string;
  armor: string;
  structure: string;
  specials: string;
  skill: string;
  notes: string;
  picture: string;
}

const dmg = (d: AsDamage) => formatDamage(d);

export function fieldsOf(unit: AsUnit): Fields {
  const { card } = unit;
  return {
    chassis: unit.name.chassis,
    model: unit.name.model,
    type: card.type,
    size: String(card.size),
    tmm: card.tmm === null ? "" : String(card.tmm),
    move: formatMove(card.move),
    role: card.role ?? "",
    pv: String(card.pv),
    s: dmg(card.damage.s),
    m: dmg(card.damage.m),
    l: dmg(card.damage.l),
    ov: String(card.ov),
    armor: String(card.armor),
    structure: String(card.structure),
    specials: formatSpecials(card.specials),
    skill: String(unit.skill),
    notes: unit.notes ?? "",
    picture: unit.picture?.dataUrl ?? "",
  };
}

type Errors = Partial<Record<keyof Fields, string>>;

const WHOLE = "Use a whole number, 0 or more.";
const DAMAGE = "Use a number, 0* or a dash.";

/**
 * The unit the fields describe, laid over the unit they started from (so its id, source and other kept parts stay), and what is
 * wrong with them. A field that is wrong leaves the earlier value in the unit, so the preview keeps showing something.
 */
export function buildUnit(fields: Fields, base: AsUnit): { unit: AsUnit; errors: Errors } {
  const errors: Errors = {};
  const whole = (key: "size" | "pv" | "ov" | "armor" | "structure", previous: number): number => {
    if (/^\d+$/.test(fields[key].trim())) return Number(fields[key]);
    errors[key] = WHOLE;
    return previous;
  };
  const damage = (key: "s" | "m" | "l", previous: AsDamage): AsDamage => {
    const parsed = parseDamage(fields[key]);
    if (parsed.ok) return parsed.value;
    errors[key] = DAMAGE;
    return previous;
  };
  const move = parseMove(fields.move);
  if (!move.ok) errors.move = 'Write movement like 8"/6"j.';
  let tmm: number | null = base.card.tmm;
  if (fields.tmm.trim() === "") tmm = null;
  else if (/^\d+$/.test(fields.tmm.trim())) tmm = Number(fields.tmm);
  else errors.tmm = WHOLE;
  if (fields.chassis.trim() === "") errors.chassis = "Give the unit a name.";
  const unit: AsUnit = {
    ...base,
    name: { chassis: fields.chassis.trim(), model: fields.model.trim() },
    skill: Number(fields.skill),
    notes: fields.notes === "" ? undefined : fields.notes,
    picture: fields.picture === "" ? undefined : { dataUrl: fields.picture },
    card: {
      ...base.card,
      type: fields.type,
      size: whole("size", base.card.size),
      tmm,
      move: move.ok ? move.value : base.card.move,
      role: fields.role === "" ? null : fields.role,
      pv: whole("pv", base.card.pv),
      damage: { ...base.card.damage, s: damage("s", base.card.damage.s), m: damage("m", base.card.damage.m), l: damage("l", base.card.damage.l) },
      ov: whole("ov", base.card.ov),
      armor: whole("armor", base.card.armor),
      structure: whole("structure", base.card.structure),
      specials: parseSpecials(fields.specials),
    },
  };
  return { unit, errors };
}

function TextField({ id, label, value, error, onChange, hint, wide }: { id: string; label: string; value: string; error?: string; onChange: (v: string) => void; hint?: string; wide?: boolean }) {
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`bt-field${wide ? " as-wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} aria-invalid={error ? true : undefined} aria-describedby={describedBy} onChange={(e) => { onChange(e.target.value); }} />
      {hint && (
        <p id={`${id}-hint`} className="bt-hint as-field-note">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="bt-problem as-field-note">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectField({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <div className="bt-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => { onChange(e.target.value); }}>
        {children}
      </select>
    </div>
  );
}

/** The card in a plain layout: the same fields, read off the unit as it would be saved. */
function Preview({ unit }: { unit: AsUnit }) {
  const { card } = unit;
  const type = AS_UNIT_TYPES.find((t) => t.code === card.type);
  const range = (label: string, value: AsDamage) => (
    <div className="as-card__cell">
      <dt>{label}</dt>
      <dd>{formatDamage(value)}</dd>
    </div>
  );
  return (
    <section className="as-card" aria-labelledby="as-card-heading">
      <h2 id="as-card-heading">Card preview</h2>
      <div className="as-card__head">
        <strong className="as-card__name">{unitTitle(unit) || "Unnamed unit"}</strong>
        <span className="as-card__pv">{`PV ${String(card.pv)}`}</span>
      </div>
      <dl className="as-card__grid">
        <div className="as-card__cell"><dt>TP</dt><dd>{type ? `${card.type}` : card.type}</dd></div>
        <div className="as-card__cell"><dt>SZ</dt><dd>{card.size}</dd></div>
        <div className="as-card__cell"><dt>TMM</dt><dd>{card.tmm ?? "-"}</dd></div>
        <div className="as-card__cell"><dt>MV</dt><dd>{formatMove(card.move) || "-"}</dd></div>
        <div className="as-card__cell"><dt>ROLE</dt><dd>{card.role ?? "-"}</dd></div>
        <div className="as-card__cell"><dt>SKILL</dt><dd>{unit.skill}</dd></div>
      </dl>
      <dl className="as-card__grid">
        {range("S (+0)", card.damage.s)}
        {range("M (+2)", card.damage.m)}
        {range("L (+4)", card.damage.l)}
        <div className="as-card__cell"><dt>OV</dt><dd>{card.ov}</dd></div>
        <div className="as-card__cell"><dt>A</dt><dd>{card.armor}</dd></div>
        <div className="as-card__cell"><dt>S</dt><dd>{card.structure}</dd></div>
      </dl>
      <div className="as-card__special">
        <strong>SPECIAL:</strong>
        <SpecialLinks specials={card.specials} />
        {card.specials.length > 0 && <GlossSwitch id="as-card-gloss" />}
      </div>
      {unit.picture && <img className="as-card__picture" src={unit.picture.dataUrl} alt="" />}
    </section>
  );
}

type Loaded =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "ready"; storage: AsStorage; unit: AsUnit; isNew: boolean; review?: boolean };

export default function AsUnitPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const draftState = (useLocation().state as { draft?: unknown } | null)?.draft;
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const storage = await openAsStorage();
        if (id === "") {
          // An importer or the scanner can open this page with a unit to review: nothing is saved until Save is pressed.
          const review = isAsUnit(draftState) ? draftState : undefined;
          if (live) setLoaded({ state: "ready", storage, unit: review ?? newAsUnit(crypto.randomUUID()), isNew: true, review: review !== undefined });
          return;
        }
        const entry = await storage.get(id);
        if (!live) return;
        if (!entry) setLoaded({ state: "missing" });
        else if (!entry.unit) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", storage, unit: entry.unit, isNew: false });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id, draftState]);

  if (loaded.state === "ready") return <UnitForm key={loaded.unit.id} initial={loaded.unit} isNew={loaded.isNew} review={loaded.review === true} storage={loaded.storage} />;
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Alpha Strike unit</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That unit is not saved on this device." : `This saved unit cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={HOME}>
          Back to Alpha Strike
        </Link>
      </p>
    </div>
  );
}

function UnitForm({ initial, isNew, review, storage }: { initial: AsUnit; isNew: boolean; review: boolean; storage: AsStorage }) {
  const navigate = useNavigate();
  // A unit handed over for review starts out different from "saved", so it counts as unsaved until Save is pressed.
  const [saved, setSaved] = useState<Fields>(() => fieldsOf(review ? newAsUnit("") : initial));
  const [fields, setFields] = useState<Fields>(() => fieldsOf(initial));
  /** The saved unit the fields are laid over: after a save it is the unit that was saved. */
  const [base, setBase] = useState<AsUnit>(initial);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const skipGuard = useRef(false);
  const pictureId = useId();

  const { unit, errors } = buildUnit(fields, base);
  const dirty = JSON.stringify(fields) !== JSON.stringify(saved);
  const invalid = Object.keys(errors).length > 0;
  const findings = unitFindings(unit);
  const blocker = useBlocker(() => dirty && !skipGuard.current);

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

  const set = (key: keyof Fields) => (value: string) => {
    setStatus("");
    setFields((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    if (invalid) return;
    try {
      await storage.save(unit);
    } catch {
      setStatus("");
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setProblem("");
    setBase(unit);
    setSaved(fields);
    setStatus("Saved.");
    if (isNew) {
      // The address now names the saved unit; the guard stays off only while that move happens.
      skipGuard.current = true;
      await navigate(`/battletech/alpha-strike/unit?id=${encodeURIComponent(unit.id)}`, { replace: true });
      skipGuard.current = false;
    }
  };

  const remove = async () => {
    try {
      await storage.remove(unit.id);
    } catch {
      setConfirming(false);
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    skipGuard.current = true;
    void navigate(HOME);
  };

  const choosePicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen) return;
    const result = await readPicture(chosen);
    input.value = "";
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    setProblem("");
    set("picture")(result.dataUrl);
  };

  const typeKnown = AS_UNIT_TYPES.some((t) => t.code === fields.type);
  const roleKnown = fields.role === "" || AS_GROUND_ROLES.includes(fields.role) || AS_AEROSPACE_ROLES.includes(fields.role);
  const title = unitTitle(unit);

  return (
    <div className="sr-page as-unit">
      <header className="as-unit__header">
        <Link className="bt-back" to={HOME}>
          <span aria-hidden="true">&larr; </span>Your units
        </Link>
        <h1 tabIndex={-1}>{title || "New unit"}</h1>
        <p className="bt-hint">{`Played under: ${AS_EDITION.name}`}</p>
        {base.source.kind !== "manual" && (
          <p className="bt-credit">{`Source: ${base.source.kind === "mordel" ? "mordel.net" : base.source.kind === "mul-export" ? "Master Unit List" : base.source.kind}${base.source.credit ? `. ${base.source.credit}` : ""}${base.source.ref ? ` (${base.source.ref})` : ""}`}</p>
        )}
        <p className="bt-credit">{asOfficialMark(unit).text}</p>
        <div className="bt-actions">
          <button type="button" className="bt-button" disabled={!dirty || invalid} onClick={() => void save()}>
            Save
          </button>
          <button
            type="button"
            className="bt-button bt-button--secondary"
            disabled={invalid}
            onClick={() => {
              downloadUnit(unit);
              setStatus("Export started.");
            }}
          >
            Export
          </button>
          {!isNew && (
            <button type="button" ref={deleteRef} className="bt-button bt-button--secondary" onClick={() => { setConfirming(true); }}>
              Delete
            </button>
          )}
        </div>
        {dirty && <p className="bt-hint">You have changes that are not saved.</p>}
        {invalid && <p className="bt-hint">Fix the marked fields to save or export.</p>}
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
          <p>{`Delete ${title || "this unit"}? This cannot be undone.`}</p>
          <span className="bt-actions">
            <button type="button" className="bt-button" onClick={() => void remove()}>
              Delete
            </button>
            <button
              type="button"
              ref={keepRef}
              className="bt-button bt-button--secondary"
              onClick={() => {
                setConfirming(false);
                deleteRef.current?.focus();
              }}
            >
              Keep
            </button>
          </span>
        </div>
      )}

      <div className="as-unit__body">
        <form
          className="as-form"
          aria-label="Unit card values"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="bt-grid">
            <TextField id="as-chassis" label="Name" value={fields.chassis} error={errors.chassis} onChange={set("chassis")} />
            <TextField id="as-model" label="Model" value={fields.model} onChange={set("model")} />
            <SelectField id="as-type" label="Type" value={fields.type} onChange={set("type")}>
              {!typeKnown && <option value={fields.type}>{fields.type || "(none)"}</option>}
              {AS_UNIT_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {`${t.code} (${t.name})`}
                </option>
              ))}
            </SelectField>
            <TextField id="as-size" label="Size" value={fields.size} error={errors.size} onChange={set("size")} />
            <TextField id="as-tmm" label="TMM" value={fields.tmm} error={errors.tmm} onChange={set("tmm")} hint="Leave blank for a unit that has Thrust instead." />
            <TextField id="as-move" label="Move" value={fields.move} error={errors.move} onChange={set("move")} hint={'For example 8"/6"j.'} />
            <SelectField id="as-role" label="Role" value={fields.role} onChange={set("role")}>
              <option value="">None</option>
              {!roleKnown && <option value={fields.role}>{fields.role}</option>}
              <optgroup label="Ground roles">
                {AS_GROUND_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Aerospace roles">
                {AS_AEROSPACE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </optgroup>
            </SelectField>
            <TextField id="as-pv" label="Point Value (PV)" value={fields.pv} error={errors.pv} onChange={set("pv")} />
            <TextField id="as-s" label="Damage S (+0)" value={fields.s} error={errors.s} onChange={set("s")} />
            <TextField id="as-m" label="Damage M (+2)" value={fields.m} error={errors.m} onChange={set("m")} />
            <TextField id="as-l" label="Damage L (+4)" value={fields.l} error={errors.l} onChange={set("l")} />
            <TextField id="as-ov" label="Overheat Value (OV)" value={fields.ov} error={errors.ov} onChange={set("ov")} />
            <TextField id="as-armor" label="Armor" value={fields.armor} error={errors.armor} onChange={set("armor")} />
            <TextField id="as-structure" label="Structure" value={fields.structure} error={errors.structure} onChange={set("structure")} />
            <SelectField id="as-skill" label="Skill" value={fields.skill} onChange={set("skill")}>
              {SKILLS.map((s) => (
                <option key={s} value={String(s)}>
                  {s}
                </option>
              ))}
            </SelectField>
            <TextField id="as-specials" label="Special abilities" value={fields.specials} onChange={set("specials")} hint="Separate with commas, for example IF1, CASE, LRM1/1/0." wide />
            <div className="bt-field as-wide">
              <label htmlFor="as-notes">Notes</label>
              <textarea id="as-notes" rows={3} value={fields.notes} onChange={(e) => { set("notes")(e.target.value); }} />
            </div>
            <div className="bt-field as-wide">
              <label htmlFor={pictureId}>Your own picture</label>
              <input id={pictureId} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void choosePicture(e)} />
              {fields.picture !== "" && (
                <button type="button" className="bt-button bt-button--secondary" onClick={() => { set("picture")(""); }}>
                  Remove picture
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="as-unit__side">
          <Preview unit={unit} />
          <section className="as-findings" aria-labelledby="as-findings-heading">
            <h2 id="as-findings-heading">Findings</h2>
            {findings.length === 0 ? (
              <p className="bt-hint">Nothing to report.</p>
            ) : (
              <ul>
                {findings.map((f) => (
                  <li key={f.id}>
                    {f.text} <span className="bt-hint">{f.cite}</span>
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
