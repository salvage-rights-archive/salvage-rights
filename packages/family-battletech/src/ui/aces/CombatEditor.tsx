// The combat side of a behaviour card: who it shoots (zones, flags and ordered tie-break keys) and the overheat rows (p. 18-19).
import { useRef } from "react";
import { tokenById } from "../../data/aces-vocab";
import { renderOv, renderTarget } from "../../rules/aces-card";
import type { AcesCard, OvRow, TokenUse } from "../../rules/aces-card";
import { TargetEditor } from "./ColumnEditor";
import { RowButtons, Stepper, TokenList, UseFields, moved, newUse, tokensFor, useRowFocus } from "./TokenPicker";

type Combat = AcesCard["combat"];
type CombatTarget = NonNullable<Combat["target"]>;

export const emptyCombatTarget = (): CombatTarget => ({ zone: null, flags: [], keys: [] });

function OvRowEditor({ idBase, row, index, count, onSet, onMove, onRemove }: { idBase: string; row: OvRow; index: number; count: number; onSet: (r: OvRow) => void; onMove: (to: number) => void; onRemove: () => void }) {
  const alsoTokens = tokensFor("ov-also", "combat");
  const actionTokens = tokensFor("ov-action", "combat");
  const text = renderOv(row);
  const setTn = (test: string) => {
    const { tn: _drop, ...rest } = row;
    void _drop;
    if (test === "") {
      const { join: _join, ...bare } = rest;
      void _join;
      onSet(bare);
    } else onSet({ ...rest, tn: { test: test as "at-most" | "at-least", value: row.tn?.value ?? 7 } });
  };
  const setAlso = (id: string) => {
    const { also: _drop, join: _join, ...rest } = row;
    void _drop;
    void _join;
    onSet(id === "" ? rest : { ...rest, also: { token: id }, join: row.join ?? "and" });
  };
  return (
    <li className="bt-row aces-use">
      <span className="bt-row__text aces-use__text">{`${String(index + 1)}. ${text}`}</span>
      <RowButtons what={`${String(index + 1)}. ${text}`} index={index} count={count} onMove={onMove} onRemove={onRemove} />
      <div className="aces-params">
        <div className="bt-field">
          <label htmlFor={`${idBase}-tn`}>Target number test</label>
          <select id={`${idBase}-tn`} value={row.tn?.test ?? ""} onChange={(e) => { setTn(e.target.value); }}>
            <option value="">None</option>
            <option value="at-most">At most</option>
            <option value="at-least">At least</option>
          </select>
        </div>
        {row.tn && <Stepper id={`${idBase}-tnvalue`} label="Target number" value={row.tn.value} min={2} onChange={(v) => { onSet({ ...row, tn: { test: row.tn?.test ?? "at-most", value: v ?? 2 } }); }} />}
        <div className="bt-field">
          <label htmlFor={`${idBase}-also`}>Second test</label>
          <select id={`${idBase}-also`} value={row.also?.token ?? ""} onChange={(e) => { setAlso(e.target.value); }}>
            <option value="">None</option>
            {alsoTokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {row.tn && row.also && (
          <div className="bt-field">
            <label htmlFor={`${idBase}-join`}>The two tests are joined by</label>
            <select id={`${idBase}-join`} value={row.join ?? "and"} onChange={(e) => { onSet({ ...row, join: e.target.value === "or" ? "or" : "and" }); }}>
              <option value="and">and</option>
              <option value="or">or</option>
            </select>
          </div>
        )}
        <div className="bt-field">
          <label htmlFor={`${idBase}-action`}>Then</label>
          <select
            id={`${idBase}-action`}
            value={row.action.token}
            onChange={(e) => {
              const tok = tokenById.get(e.target.value);
              if (tok) onSet({ ...row, action: newUse(tok) });
            }}
          >
            {actionTokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label.replace(/\{\w+\}/g, "N")}
              </option>
            ))}
          </select>
        </div>
        <UseFields idBase={`${idBase}-action-params`} use={row.action} onChange={(action: TokenUse) => { onSet({ ...row, action }); }} />
      </div>
    </li>
  );
}

/** The combat side; `overheat` says whether this deck has overheat rows at all. */
export function CombatEditor({ idBase, combat, overheat, onChange }: { idBase: string; combat: Combat; overheat: boolean; onChange: (c: Combat) => void }) {
  const target = combat.target;
  const rows = combat.overheat ?? [];
  const listRef = useRef<HTMLUListElement>(null);
  const want = useRowFocus(listRef);
  const setRows = (next: OvRow[]) => {
    const { overheat: _drop, ...rest } = combat;
    void _drop;
    onChange(next.length === 0 ? rest : { ...rest, overheat: next });
  };
  if (!target) {
    return (
      <div className="aces-side">
        <p className="bt-hint">Only the priority is recorded for this side. The game will tell you to read the card.</p>
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { onChange({ ...combat, target: emptyCombatTarget() }); }}>
          Record the combat rules
        </button>
      </div>
    );
  }
  return (
    <div className="aces-side">
      <h3>Target</h3>
      <TargetEditor idBase={`${idBase}-target`} side="combat" value={{ zone: target.zone, flags: target.flags }} onChange={(t) => { onChange({ ...combat, target: { ...target, ...t } }); }} />
      <TokenList
        idBase={`${idBase}-keys`}
        heading="Choose among targets by, in order"
        slot="key"
        side="combat"
        items={target.keys}
        addLabel="Add a way to choose"
        empty="Nothing recorded yet."
        onChange={(keys) => { onChange({ ...combat, target: { ...target, keys } }); }}
      />
      {overheat && (
        <div className="aces-list">
          <h3>Overheat rows, first that applies</h3>
          {rows.length === 0 ? (
            <p className="bt-hint">No overheat rows recorded.</p>
          ) : (
            <ul ref={listRef} className="bt-list aces-use-list">
              {rows.map((row, i) => (
                <OvRowEditor
                  key={i}
                  idBase={`${idBase}-ov-${String(i)}`}
                  row={row}
                  index={i}
                  count={rows.length}
                  onSet={(r) => { setRows(rows.map((x, at) => (at === i ? r : x))); }}
                  onMove={(to) => {
                    want(to, to < i ? "up" : "down");
                    setRows(moved(rows, i, to));
                  }}
                  onRemove={() => {
                    want(Math.min(i, rows.length - 2), "remove");
                    setRows(rows.filter((_, at) => at !== i));
                  }}
                />
              ))}
            </ul>
          )}
          <button
            type="button"
            className="bt-button bt-button--secondary"
            disabled={rows.length >= 3}
            onClick={() => {
              want(rows.length, "first");
              setRows([...rows, { action: { token: "ov-max" } }]);
            }}
          >
            Add an overheat row
          </button>
        </div>
      )}
    </div>
  );
}

/** The combat side in our words. */
export function CombatPreview({ combat, overheat }: { combat: Combat; overheat: boolean }) {
  if (!combat.target) return <p className="bt-hint">Combat rules not recorded.</p>;
  return (
    <section className="aces-preview-col" aria-label="Combat rules preview">
      <h3>Combat</h3>
      <p>{renderTarget(combat.target) || "Target: nothing recorded"}</p>
      {overheat && combat.overheat && combat.overheat.length > 0 && (
        <ol className="aces-preview-col__filters">
          {combat.overheat.map((row, i) => (
            <li key={i}>{renderOv(row)}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
