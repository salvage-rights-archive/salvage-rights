// The builders for our vocabulary: a searchable picker of tokens, the fields for a token's numbers and choices, and an ordered list
// of placed tokens with reorder and delete buttons. Everything is a plain control at least 44 px tall, so it works by keyboard.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { ACES_TOKENS, ACES_VALUES, tokenById } from "../../data/aces-vocab";
import type { CardSide, Group, ParamKind, ParamSpec, Slot, VocabToken } from "../../data/aces-vocab";
import { renderUse } from "../../rules/aces-card";
import type { ParamValue, TokenUse } from "../../rules/aces-card";
import { IconLabel } from "./icons";

const GROUP_ORDER: Group[] = ["ideal", "enemies", "this unit", "force", "target", "distance", "sight", "range", "cover", "terrain", "position", "objective", "stat", "flag", "overheat", "order", "support", "other"];
const GROUP_WORDS: Record<Group, string> = {
  ideal: "The ideal target",
  enemies: "Enemies",
  "this unit": "This unit",
  force: "Your force",
  target: "Target",
  distance: "Distance",
  sight: "Line of sight",
  range: "Attack range",
  cover: "Cover",
  terrain: "Terrain",
  position: "Position",
  objective: "Objective",
  stat: "Statistics",
  flag: "Flags",
  overheat: "Overheat",
  order: "Orders",
  support: "Support",
  other: "Your own note",
};

const PARAM_WORDS: Record<string, string> = {
  inches: "Inches",
  atLeast: "At least this many",
  tmm: "TMM at least",
  n: "Modifier",
  ov: "OV",
  count: "Number",
  behind: "From behind if it can",
  dry: "Keep out of water",
  quals: "Which enemies",
  note: "Your note",
};
const KIND_WORDS: Partial<Record<ParamKind, string>> = {
  colour: "Colour",
  ref: "Measured against",
  amount: "How many",
  stat: "Statistic",
  bracket: "Range",
  mode: "Movement",
  terrain: "Terrain",
  column: "Column",
  token: "Token",
};
const paramWord = (spec: ParamSpec): string => PARAM_WORDS[spec.name] ?? KIND_WORDS[spec.kind] ?? spec.name;

/** The tokens that may be placed in this slot on this side of a card. */
export function tokensFor(slot: Slot, side: CardSide): VocabToken[] {
  return ACES_TOKENS.filter((tok) => tok.slots.includes(slot) && tok.sides.includes(side));
}

const valuesOf = (kind: ParamKind): readonly { id: string; label: string }[] => (ACES_VALUES as Partial<Record<ParamKind, readonly { id: string; label: string }[]>>)[kind] ?? [];

const NUMBER_DEFAULTS: Partial<Record<ParamKind, number>> = { inches: 6, count: 1, tn: 7, ov: 1, signed: 0 };
const NUMBER_MIN: Partial<Record<ParamKind, number>> = { inches: 1, count: 0, tn: 2, ov: 0 };

/** A new use of a token with every required choice filled in, so it reads at once. */
export function newUse(tok: VocabToken): TokenUse {
  const params: Record<string, ParamValue> = {};
  for (const spec of tok.params) {
    if (spec.optional) continue;
    const number = NUMBER_DEFAULTS[spec.kind];
    if (number !== undefined) params[spec.name] = number;
    else if (spec.kind === "flag") params[spec.name] = true;
    else if (spec.kind === "quals") params[spec.name] = ["moved"];
    else params[spec.name] = (spec.values ?? valuesOf(spec.kind).map((v) => v.id))[0] ?? "";
  }
  return { token: tok.id, ...(tok.params.length > 0 ? { params } : {}), ...(tok.id === "other" ? { note: "" } : {}) };
}

/** A token's wording with each blank shown as an ellipsis, for the picker. */
function describe(tok: VocabToken): string {
  if (tok.id === "other") return "A note of your own";
  return tok.label.replace(/\[([^\]]*)\]/g, "$1").replace(/\{\w+\}/g, "…").replace(/…{2,}/g, "…");
}

export function useText(use: TokenUse): string {
  return use.token === "other" ? use.note?.trim() || "your own note" : renderUse(use);
}

// ---- A number with its - and + buttons ---------------------------------------------------------------------------------------

export function Stepper({ id, label, value, min = 0, max, optional, onChange }: { id: string; label: string; value: number | undefined; min?: number; max?: number; optional?: boolean; onChange: (v: number | undefined) => void }) {
  const clamp = (n: number) => Math.max(min, max === undefined ? n : Math.min(max, n));
  return (
    <div className="bt-field aces-stepper">
      <label htmlFor={id}>{label}</label>
      <div className="aces-stepper__row">
        <button type="button" className="bt-button bt-button--secondary aces-stepper__button" aria-label={`Less: ${label}`} disabled={value !== undefined && value <= min} onClick={() => { onChange(value === undefined ? undefined : clamp(value - 1)); }}>
          <span aria-hidden="true">-</span>
        </button>
        <input id={id} inputMode="numeric" value={value === undefined ? "" : String(value)} placeholder={optional ? "not set" : undefined} onChange={(e) => {
          const text = e.target.value.trim();
          if (text === "") onChange(optional ? undefined : min);
          else if (/^-?\d+$/.test(text)) onChange(clamp(Number(text)));
        }} />
        <button type="button" className="bt-button bt-button--secondary aces-stepper__button" aria-label={`More: ${label}`} disabled={max !== undefined && value !== undefined && value >= max} onClick={() => { onChange(value === undefined ? clamp(min) : clamp(value + 1)); }}>
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
}

function OptionSelect({ id, label, value, options, onChange, none }: { id: string; label: string; value: string; options: readonly { id: string; label: string }[]; onChange: (v: string) => void; none?: string }) {
  return (
    <div className="bt-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => { onChange(e.target.value); }}>
        {none !== undefined && <option value="">{none}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The fields for one token's numbers and choices. */
export function UseFields({ idBase, use, onChange }: { idBase: string; use: TokenUse; onChange: (u: TokenUse) => void }) {
  const tok = tokenById.get(use.token);
  if (!tok) return <p className="bt-hint">The app does not know this step, so it keeps it as it is.</p>;
  const setParam = (name: string, value: ParamValue | undefined) => {
    const params = { ...use.params };
    if (value === undefined) delete params[name];
    else params[name] = value;
    const next: TokenUse = { ...use };
    if (Object.keys(params).length > 0) next.params = params;
    else delete next.params;
    onChange(next);
  };
  return (
    <div className="aces-params">
      {tok.id === "other" && (
        <div className="bt-field as-wide">
          <label htmlFor={`${idBase}-note`}>Your note (asked as a yes or no question in play)</label>
          <input id={`${idBase}-note`} value={use.note ?? ""} onChange={(e) => { onChange({ ...use, note: e.target.value }); }} />
        </div>
      )}
      {tok.params.map((spec) => {
        const id = `${idBase}-${spec.name}`;
        const value = use.params?.[spec.name];
        const label = paramWord(spec);
        switch (spec.kind) {
          case "inches":
          case "count":
          case "tn":
          case "ov":
          case "signed":
            return <Stepper key={spec.name} id={id} label={label} value={typeof value === "number" ? value : undefined} min={spec.kind === "signed" ? -9 : NUMBER_MIN[spec.kind] ?? 0} {...(spec.optional ? { optional: true } : {})} onChange={(v) => { setParam(spec.name, v); }} />;
          case "flag":
            return (
              <label key={spec.name} className="bt-check" htmlFor={id}>
                <input id={id} type="checkbox" checked={value === true} onChange={(e) => { setParam(spec.name, e.target.checked ? true : undefined); }} />
                {label}
              </label>
            );
          case "quals": {
            const chosen = Array.isArray(value) ? value : [];
            return (
              <fieldset key={spec.name} className="aces-fieldset">
                <legend>{label}</legend>
                {ACES_VALUES.quals.map((q) => (
                  <label key={q.id} className="bt-check">
                    <input type="checkbox" checked={chosen.includes(q.id)} onChange={(e) => {
                      const next = ACES_VALUES.quals.map((x) => x.id as string).filter((x) => (x === q.id ? e.target.checked : chosen.includes(x)));
                      setParam(spec.name, next.length > 0 ? next : undefined);
                    }} />
                    <IconLabel icon={q.icon}>{q.label}</IconLabel>
                  </label>
                ))}
              </fieldset>
            );
          }
          default: {
            const all = valuesOf(spec.kind);
            const options = spec.values ? all.filter((o) => spec.values?.includes(o.id)) : all;
            return <OptionSelect key={spec.name} id={id} label={label} value={typeof value === "string" ? value : ""} options={options} {...(spec.optional ? { none: "Not used" } : {})} onChange={(v) => { setParam(spec.name, v === "" ? undefined : v); }} />;
          }
        }
      })}
    </div>
  );
}

// ---- The picker ------------------------------------------------------------------------------------------------------------------

export function TokenPicker({ slot, side, addLabel, onPick }: { slot: Slot; side: CardSide; addLabel: string; onPick: (tok: VocabToken) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const searchId = useId();
  const tokens = useMemo(() => tokensFor(slot, side), [slot, side]);
  const q = query.trim().toLowerCase();
  const shown = tokens.filter((tok) => q === "" || describe(tok).toLowerCase().includes(q) || GROUP_WORDS[tok.group].toLowerCase().includes(q));
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);
  const close = () => {
    setOpen(false);
    setQuery("");
    openerRef.current?.focus();
  };
  return (
    <div className="aces-picker">
      <button type="button" ref={openerRef} className="bt-button bt-button--secondary" aria-expanded={open} onClick={() => { if (open) close(); else setOpen(true); }}>
        {addLabel}
      </button>
      {open && (
        <div
          className="aces-picker__panel"
          role="group"
          aria-label={addLabel}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className="bt-field">
            <label htmlFor={searchId}>Search the list</label>
            <input id={searchId} ref={searchRef} type="search" value={query} onChange={(e) => { setQuery(e.target.value); }} />
          </div>
          {shown.length === 0 && <p className="bt-hint">Nothing matches. Try another word, or pick A note of your own.</p>}
          {GROUP_ORDER.filter((g) => shown.some((tok) => tok.group === g)).map((g) => (
            <section key={g} aria-label={GROUP_WORDS[g]}>
              <h4 className="aces-picker__group">{GROUP_WORDS[g]}</h4>
              <ul className="aces-picker__list">
                {shown.filter((tok) => tok.group === g).map((tok) => (
                  <li key={tok.id}>
                    <button type="button" className="bt-button bt-button--secondary aces-picker__item" onClick={() => {
                      onPick(tok);
                      close();
                    }}>
                      <IconLabel {...(tok.icon ? { icon: tok.icon } : {})}>{describe(tok)}</IconLabel>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <button type="button" className="bt-button bt-button--secondary" onClick={close}>
            Close the list
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Reorder and delete buttons ------------------------------------------------------------------------------------------------

export function RowButtons({ what, index, count, onMove, onRemove }: { what: string; index: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
  return (
    <span className="bt-row__actions">
      <button type="button" data-act="up" className="bt-button bt-button--secondary" aria-label={`Move up: ${what}`} disabled={index === 0} onClick={() => { onMove(index - 1); }}>
        Move up
      </button>
      <button type="button" data-act="down" className="bt-button bt-button--secondary" aria-label={`Move down: ${what}`} disabled={index === count - 1} onClick={() => { onMove(index + 1); }}>
        Move down
      </button>
      <button type="button" data-act="remove" className="bt-button bt-button--secondary" aria-label={`Remove: ${what}`} onClick={onRemove}>
        Remove
      </button>
    </span>
  );
}

/** Moves one entry of a list to a new place. */
export function moved<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

/** After a list changes, keeps keyboard focus with the row the player was working on. */
export function useRowFocus(root: RefObject<HTMLElement | null>) {
  const wanted = useRef<{ index: number; act: "first" | "up" | "down" | "remove" } | undefined>(undefined);
  useEffect(() => {
    const want = wanted.current;
    wanted.current = undefined;
    const row = want ? root.current?.querySelectorAll<HTMLElement>(":scope > li")[want.index] : undefined;
    if (!want || !row) return;
    const pick = (selector: string) => row.querySelector<HTMLElement>(`${selector}:not([disabled])`);
    const target = want.act === "first" ? row.querySelector<HTMLElement>("input, select") : pick(`[data-act="${want.act}"]`) ?? pick('[data-act="up"]') ?? pick('[data-act="down"]');
    target?.focus();
  });
  return (index: number, act: "first" | "up" | "down" | "remove") => {
    wanted.current = { index, act };
  };
}

// ---- An ordered list of placed tokens --------------------------------------------------------------------------------------------

export function TokenList({ idBase, heading, slot, side, items, onChange, addLabel, empty, extra }: {
  idBase: string;
  heading?: string;
  slot: Slot;
  side: CardSide;
  items: readonly TokenUse[];
  onChange: (items: TokenUse[]) => void;
  addLabel: string;
  empty: string;
  /** More controls under a row, such as a filter's own condition. */
  extra?: (item: TokenUse, set: (u: TokenUse) => void, id: string) => ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const want = useRowFocus(listRef);
  const set = (i: number, u: TokenUse) => { onChange(items.map((x, at) => (at === i ? u : x))); };
  return (
    <div className="aces-list">
      {heading && <h3>{heading}</h3>}
      {items.length === 0 ? (
        <p className="bt-hint">{empty}</p>
      ) : (
        <ul ref={listRef} className="bt-list aces-use-list">
          {items.map((item, i) => (
            <TokenRow key={i} idBase={`${idBase}-${String(i)}`} item={item} index={i} count={items.length} onSet={(u) => { set(i, u); }} extra={extra}
              onMove={(to) => {
                want(to, to < i ? "up" : "down");
                onChange(moved(items, i, to));
              }}
              onRemove={() => {
                want(Math.min(i, items.length - 2), "remove");
                onChange(items.filter((_, at) => at !== i));
              }} />
          ))}
        </ul>
      )}
      <TokenPicker slot={slot} side={side} addLabel={addLabel} onPick={(tok) => {
        want(items.length, "first");
        onChange([...items, newUse(tok)]);
      }} />
    </div>
  );
}

function TokenRow({ idBase, item, index, count, onSet, onMove, onRemove, extra }: {
  idBase: string;
  item: TokenUse;
  index: number;
  count: number;
  onSet: (u: TokenUse) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
  extra: ((item: TokenUse, set: (u: TokenUse) => void, id: string) => ReactNode) | undefined;
}) {
  const text = useText(item);
  const icon = tokenById.get(item.token)?.icon;
  return (
    <li className="bt-row aces-use">
      <span className="bt-row__text aces-use__text">
        <IconLabel {...(icon ? { icon } : {})}>{`${String(index + 1)}. ${text}`}</IconLabel>
      </span>
      <RowButtons what={`${String(index + 1)}. ${text}`} index={index} count={count} onMove={onMove} onRemove={onRemove} />
      <UseFields idBase={idBase} use={item} onChange={onSet} />
      {extra?.(item, onSet, idBase)}
    </li>
  );
}
