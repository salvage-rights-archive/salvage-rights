// The labelled fields the AeroTech editor and home share: a number typed into a text box (what is typed is shown as typed, only a valid
// number reaches the record), a text box and a select. The same look as the Classic editor's, written here so this editor does not load
// that one.
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export const fieldId = (path: string): string => `field-${path.replace(/[^A-Za-z0-9]+/g, "-")}`;

export function Field({ id, label, hint, className, children }: { id: string; label: string; hint?: string; className?: string; children: (describedBy: string | undefined) => ReactNode }) {
  return (
    <div className={className ? `bt-field ${className}` : "bt-field"}>
      <label htmlFor={id}>{label}</label>
      {children(hint ? `${id}-hint` : undefined)}
      {hint && (
        <span id={`${id}-hint`} className="bt-hint">
          {hint}
        </span>
      )}
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onValid,
  allowEmpty = false,
  hint,
  name,
  min,
}: {
  id: string;
  label: string;
  /** The accessible name, when the visible label is a short form of it. */
  name?: string;
  value: number | null;
  onValid: (value: number | null) => void;
  allowEmpty?: boolean;
  /** Shown beside the field; replaced by "Enter a number." while what is typed is not one. */
  hint?: string;
  /** Numbers below this are not taken. */
  min?: number;
}) {
  const [draft, setDraft] = useState<string>();
  const parse = (text: string): number | null | undefined => {
    const trimmed = text.trim();
    if (trimmed === "") return allowEmpty ? null : undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) && (min === undefined || n >= min) ? n : undefined;
  };
  const parsed = draft === undefined ? undefined : parse(draft);
  const invalid = draft !== undefined && parsed === undefined;
  // A draft that no longer matches the record (after Undo, say) gives way to the record's value.
  const shown = draft !== undefined && (invalid || parsed === value) ? draft : value === null ? "" : String(value);
  return (
    <Field id={id} label={label} hint={invalid ? (min === undefined || min <= 0 ? "Enter a number." : `Enter a number of ${String(min)} or more.`) : hint}>
      {(describedBy) => (
        <input
          id={id}
          aria-label={name}
          type="text"
          inputMode="decimal"
          value={shown}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            const next = parse(text);
            if (next !== undefined) onValid(next);
          }}
          onBlur={() => {
            if (!invalid) setDraft(undefined);
          }}
        />
      )}
    </Field>
  );
}

export function TextField({ id, label, value, onChange, hint, name }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: string; name?: string }) {
  return (
    <Field id={id} label={label} hint={hint}>
      {(describedBy) => (
        <input
          id={id}
          aria-label={name}
          type="text"
          value={value}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      )}
    </Field>
  );
}

/** A select over choices; a value the choices lack stays on offer, labelled `(as saved)`, so a record never blanks a field it holds. */
export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  hint,
  className,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  hint?: string;
  className?: string;
}) {
  const known = options.some((option) => option.value === value);
  const longest = Math.max(...options.map((option) => option.label.length), known ? 0 : `${value} (as saved)`.length);
  return (
    <Field id={id} label={label} hint={hint} className={className}>
      {(describedBy) => (
        <select
          id={id}
          value={value}
          style={{ "--bt-select-min": `${String(longest + 4)}ch` } as CSSProperties}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {!known && <option value={value}>{`${value === "" ? "none" : value} (as saved)`}</option>}
        </select>
      )}
    </Field>
  );
}
