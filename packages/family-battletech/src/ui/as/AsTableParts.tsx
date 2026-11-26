// Small controls of the table tracker: a number stepper and the armor and structure bubbles (44 px buttons with a running count).
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";

/** A number with a minus and a plus button beside it; typing a number works too. */
export function Stepper({ id, label, value, min = 0, max, onChange }: { id: string; label: string; value: number; min?: number; max?: number; onChange: (next: number) => void }) {
  const clamp = (n: number): number => Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, n));
  return (
    <div className="bt-field as-stepper">
      <label htmlFor={id}>{label}</label>
      <span className="as-stepper__row">
        <button type="button" className="bt-button bt-button--secondary" aria-label={`One less: ${label}`} disabled={value <= min} onClick={() => { onChange(clamp(value - 1)); }}>
          -
        </button>
        <input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(event) => { onChange(clamp(Number.parseInt(event.target.value, 10) || 0)); }} />
        <button type="button" className="bt-button bt-button--secondary" aria-label={`One more: ${label}`} disabled={max !== undefined && value >= max} onClick={() => { onChange(clamp(value + 1)); }}>
          +
        </button>
      </span>
    </div>
  );
}

interface BubbleProps {
  /** Bubbles of this kind left (after every applied hit). */
  count: number;
  /** The kind's full count on the card, for the running count. */
  full: number;
  /** Bubbles before this kind's first one that the staged and marked damage reaches (armor's bubbles come before structure's). */
  before: number;
  /** Points of staged damage, waiting for the End Phase; they take the first bubbles of the unit. */
  waiting: number;
  /** Points marked for the hit being built. */
  marking: number;
  name: string;
  unit: string;
  onMark: (points: number) => void;
}

/** One kind's bubbles. A bubble that is still there is a button: pressing it marks damage up to and including it for the hit being built. */
export function Bubbles({ count, full, before, waiting, marking, name, unit, onMark }: BubbleProps) {
  const group = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const cells = Array.from({ length: count }, (_, i) => {
    const global = before + i;
    const state = global < waiting ? "waiting" : global < waiting + marking ? "marking" : "intact";
    return { i, global, state };
  });
  const firstFree = cells.find((c) => c.state !== "waiting")?.i ?? 0;
  const tab = (i: number): 0 | -1 => ((cells[active]?.state === "waiting" ? firstFree : active) === i ? 0 : -1);
  const move = (event: KeyboardEvent<HTMLDivElement>): void => {
    const buttons = Array.from(group.current?.querySelectorAll("button") ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? at + 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? at - 1 : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : -1;
    const target = buttons[next];
    if (next >= 0 && target) {
      event.preventDefault();
      target.focus();
    }
  };
  return (
    <div className="as-bubbles">
      <p className="as-bubbles__count">{`${name} ${String(count)} of ${String(full)}`}</p>
      <div ref={group} role="group" aria-label={`${name} bubbles`} className="as-bubbles__row" onKeyDown={move}>
        {cells.map((c) =>
          c.state === "waiting" ? (
            <span key={c.i} className="as-bubble as-bubble--waiting" role="img" aria-label={`${name} ${String(c.i + 1)}: waiting for the End Phase`} />
          ) : (
            <button
              key={c.i}
              type="button"
              className={`as-bubble${c.state === "marking" ? " as-bubble--marking" : ""}`}
              tabIndex={tab(c.i)}
              aria-pressed={c.state === "marking"}
              aria-label={`${name} ${String(c.i + 1)}`}
              onFocus={() => { setActive(c.i); }}
              onClick={() => {
                const points = c.global - waiting + 1;
                onMark(points === marking ? points - 1 : points);
              }}
            />
          ),
        )}
        {count === 0 && <span className="as-bubbles__none">{`No ${unit} left`}</span>}
      </div>
    </div>
  );
}
