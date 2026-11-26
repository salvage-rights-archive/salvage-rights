// The editors for one behaviour column: its condition, target rule, movement mode and ordered filters, and the preview that
// shows it the way the game will. The same pieces serve the special order cards later.
import { ACES_VALUES, ACES_ZONE_KEYWORDS, tokenById } from "../../data/aces-vocab";
import type { CardSide, Colour, MoveMode } from "../../data/aces-vocab";
import { render } from "../../rules/aces-card";
import type { Column, Condition, Filter, MoveSpec, TargetRule, TokenUse } from "../../rules/aces-card";
import { IconLabel } from "./icons";
import { Stepper, TokenList, tokensFor } from "./TokenPicker";

export const emptyColumn = (): Column => ({ target: { zone: null, flags: [] }, move: { mode: "ground" }, filters: [] });

const modeIcon = (mode: MoveMode) => ACES_VALUES.mode.find((m) => m.id === mode)?.icon;

/** A list of conditions joined by "all" or "any". An empty list is no condition at all. */
export function ConditionBuilder({ idBase, heading, value, side, onChange, empty }: { idBase: string; heading: string; value: Condition | undefined; side: CardSide; onChange: (c: Condition | undefined) => void; empty: string }) {
  const clauses = value?.clauses ?? [];
  const join = value?.join ?? "all";
  return (
    <div className="aces-condition">
      <TokenList
        idBase={idBase}
        heading={heading}
        slot="condition"
        side={side}
        items={clauses}
        addLabel={`Add a test to: ${heading}`}
        empty={empty}
        onChange={(next) => { onChange(next.length === 0 ? undefined : { join, clauses: next }); }}
      />
      {clauses.length > 1 && (
        <div className="bt-field">
          <label htmlFor={`${idBase}-join`}>These tests</label>
          <select id={`${idBase}-join`} value={join} onChange={(e) => { onChange({ join: e.target.value === "any" ? "any" : "all", clauses }); }}>
            <option value="all">must all hold</option>
            <option value="any">need only one to hold</option>
          </select>
        </div>
      )}
    </div>
  );
}

type Target = TargetRule & { keys?: TokenUse[] };

/** Zone rings or keyword, restriction flags and (for movement) the colour list that breaks ties. */
export function TargetEditor({ idBase, side, value, onChange }: { idBase: string; side: CardSide; value: TargetRule; onChange: (t: TargetRule) => void }) {
  const zoneKind = value.zone === null ? "none" : "rings" in value.zone ? "rings" : "keyword";
  const rings = value.zone && "rings" in value.zone ? value.zone.rings : [];
  const flags = tokensFor("target-flag", side);
  const growing = rings.every((r, i) => i === 0 || r > (rings[i - 1] ?? 0));
  const set = (patch: Partial<Target>) => { onChange({ ...value, ...patch }); };
  return (
    <div className="aces-target">
      <div className="bt-field">
        <label htmlFor={`${idBase}-zone`}>Zones</label>
        <select
          id={`${idBase}-zone`}
          value={zoneKind}
          onChange={(e) => {
            if (e.target.value === "rings") set({ zone: { rings: [6, 12, 24] } });
            else if (e.target.value === "keyword") set({ zone: { keyword: "nearest" } });
            else set({ zone: null });
          }}
        >
          <option value="none">Not set</option>
          <option value="rings">Rings, in inches</option>
          <option value="keyword">A keyword</option>
        </select>
      </div>
      {value.zone && "keyword" in value.zone && (
        <div className="bt-field">
          <label htmlFor={`${idBase}-keyword`}>Keyword</label>
          <select id={`${idBase}-keyword`} value={value.zone.keyword} onChange={(e) => { set({ zone: { keyword: e.target.value as (typeof ACES_ZONE_KEYWORDS)[number]["id"] } }); }}>
            {ACES_ZONE_KEYWORDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {zoneKind === "rings" && (
        <fieldset className="aces-fieldset">
          <legend>Rings, inner to outer</legend>
          {rings.map((r, i) => (
            <Stepper key={i} id={`${idBase}-ring-${String(i)}`} label={`Ring ${String(i + 1)}`} value={r} min={1} onChange={(v) => { set({ zone: { rings: rings.map((x, at) => (at === i ? (v ?? 1) : x)) } }); }} />
          ))}
          <span className="bt-actions">
            <button type="button" className="bt-button bt-button--secondary" disabled={rings.length >= 3} onClick={() => { set({ zone: { rings: [...rings, (rings[rings.length - 1] ?? 0) + 6] } }); }}>
              Add a ring
            </button>
            <button type="button" className="bt-button bt-button--secondary" disabled={rings.length <= 1} onClick={() => { set({ zone: { rings: rings.slice(0, -1) } }); }}>
              Remove the last ring
            </button>
          </span>
          {!growing && <p className="bt-problem">Each ring should be larger than the one inside it.</p>}
        </fieldset>
      )}
      {flags.length > 0 && (
        <fieldset className="aces-fieldset">
          <legend>Only enemies that are</legend>
          {flags.map((f) => (
            <label key={f.id} className="bt-check">
              <input type="checkbox" checked={value.flags.includes(f.id)} onChange={(e) => { set({ flags: e.target.checked ? [...value.flags, f.id] : value.flags.filter((x) => x !== f.id) }); }} />
              <IconLabel {...(f.icon ? { icon: f.icon } : {})}>{f.label}</IconLabel>
            </label>
          ))}
        </fieldset>
      )}
      {side === "movement" && (
        <div className="bt-field">
          <label htmlFor={`${idBase}-pick`}>Break ties with</label>
          <select
            id={`${idBase}-pick`}
            value={value.pick ?? ""}
            onChange={(e) => {
              const { pick: _drop, ...rest } = value;
              void _drop;
              onChange(e.target.value === "" ? rest : { ...rest, pick: e.target.value as Colour | "nearest" });
            }}
          >
            <option value="">Nothing recorded</option>
            <option value="nearest">The nearest enemy</option>
            {ACES_VALUES.colour.map((c) => (
              <option key={c.id} value={c.id}>
                {`The ${c.label} list`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/** Movement mode, and an optional second mode with its own condition. */
export function MoveEditor({ idBase, value, onChange }: { idBase: string; value: MoveSpec; onChange: (m: MoveSpec) => void }) {
  const modes = ACES_VALUES.mode;
  return (
    <div className="aces-move">
      <div className="bt-field">
        <label htmlFor={`${idBase}-mode`}>Movement</label>
        <select id={`${idBase}-mode`} value={value.mode} onChange={(e) => { onChange({ ...value, mode: e.target.value as MoveMode }); }}>
          {modes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="bt-field">
        <label htmlFor={`${idBase}-alt`}>Second choice</label>
        <select
          id={`${idBase}-alt`}
          value={value.alt?.mode ?? ""}
          onChange={(e) => {
            if (e.target.value === "") onChange({ mode: value.mode });
            else onChange({ mode: value.mode, alt: { mode: e.target.value as MoveMode, ...(value.alt?.when ? { when: value.alt.when } : {}) } });
          }}
        >
          <option value="">None</option>
          {modes.filter((m) => m.id !== value.mode).map((m) => (
            <option key={m.id} value={m.id}>
              {`${m.label}, if needed`}
            </option>
          ))}
        </select>
      </div>
      {value.alt && (
        <ConditionBuilder
          idBase={`${idBase}-altwhen`}
          heading={`When to use ${modes.find((m) => m.id === value.alt?.mode)?.label ?? "the second choice"}`}
          side="movement"
          value={value.alt.when}
          empty="No test recorded: it is used if needed."
          onChange={(c) => { onChange({ mode: value.mode, alt: { mode: value.alt?.mode ?? "ground", ...(c ? { when: c } : {}) } }); }}
        />
      )}
    </div>
  );
}

/** One column: condition (not for Cautious), target rule, movement and the ordered filters. */
export function ColumnEditor({ idBase, name, column, hasWhen, side = "movement", onChange }: { idBase: string; name: string; column: Column; hasWhen: boolean; side?: CardSide; onChange: (c: Column) => void }) {
  return (
    <div className="aces-column">
      {hasWhen && (
        <ConditionBuilder
          idBase={`${idBase}-when`}
          heading={`When the ${name} column applies`}
          side={side}
          value={column.when}
          empty="No test recorded yet."
          onChange={(c) => {
            const { when: _drop, ...rest } = column;
            void _drop;
            onChange(c ? { ...rest, when: c } : rest);
          }}
        />
      )}
      <h3>Target</h3>
      <TargetEditor idBase={`${idBase}-target`} side={side} value={column.target} onChange={(target) => { onChange({ ...column, target }); }} />
      <h3>Movement</h3>
      <MoveEditor idBase={`${idBase}-move`} value={column.move} onChange={(move) => { onChange({ ...column, move }); }} />
      <TokenList
        idBase={`${idBase}-filters`}
        heading="Where to stand, in order"
        slot="filter"
        side={side}
        items={column.filters}
        addLabel={`Add a filter to the ${name} column`}
        empty="No filters recorded yet."
        onChange={(items) => { onChange({ ...column, filters: items as Filter[] }); }}
        extra={(item, set, id) => {
          const filter = item as Filter;
          return (
            <ConditionBuilder
              idBase={`${id}-when`}
              heading="Only if"
              side={side}
              value={filter.when}
              empty="It always applies."
              onChange={(c) => {
                const { when: _drop, ...rest } = filter;
                void _drop;
                const next: Filter = c ? { ...rest, when: c } : rest;
                set(next);
              }}
            />
          );
        }}
      />
    </div>
  );
}

/** The column the way the game shows it: our words and icons. */
export function ColumnPreview({ name, column }: { name: string; column: Column }) {
  const shown = render(column);
  const mode = modeIcon(column.move.mode);
  return (
    <section className="aces-preview-col" aria-label={`${name} column`}>
      <h3>{name}</h3>
      <dl>
        {shown.when !== null && (
          <>
            <dt>When</dt>
            <dd>{shown.when}</dd>
          </>
        )}
        <dt>Target</dt>
        <dd>{shown.target || "nothing recorded"}</dd>
        <dt>Movement</dt>
        <dd>
          <IconLabel {...(mode ? { icon: mode } : {})}>{shown.move}</IconLabel>
        </dd>
      </dl>
      {shown.filters.length > 0 && (
        <ol className="aces-preview-col__filters">
          {column.filters.map((f, i) => (
            <li key={i}>
              <IconLabel {...(tokenById.get(f.token)?.icon ? { icon: tokenById.get(f.token)?.icon } : {})}>{shown.filters[i]}</IconLabel>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
