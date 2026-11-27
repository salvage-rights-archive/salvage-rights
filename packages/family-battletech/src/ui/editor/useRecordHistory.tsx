// What every unit editor keeps while a record is open: the Undo and Redo history, what was last saved, the status and problem
// lines, the hold on leaving with unsaved changes, and a draft of the unsaved changes kept on the device so a closed or discarded
// tab does not lose them. The 'Mech editor has its own (an OmniMech edits two documents at once).
import { useEffect, useState } from "react";
import { useBlocker } from "react-router";
import { STORAGE_WRITE_FAILED } from "../storage";

const HISTORY_LIMIT = 100;
const DRAFT_PREFIX = "sr-draft:";

interface History<R> {
  past: R[];
  present: R;
  future: R[];
  /** The field being typed into: edits to it in a row make one step. */
  group?: string;
}

/** The unsaved changes found from an earlier visit, and what the player may do with them. */
export interface Draft {
  restore: () => void;
  discard: () => void;
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** The draft kept for this record, when it is one of ours for the same record and differs from what is saved. Never throws. */
function readDraft<R extends { id: string }>(saved: R): R | undefined {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DRAFT_PREFIX + saved.id) ?? "null");
    if (typeof parsed !== "object" || parsed === null || (parsed as { id?: unknown }).id !== saved.id) return undefined;
    return same(parsed, saved) ? undefined : (parsed as R);
  } catch {
    return undefined;
  }
}

/** Keeps or clears the draft. A full or missing store is passed over: the draft is a safeguard, not the save. */
function writeDraft(id: string, record: unknown): void {
  try {
    if (record === undefined) localStorage.removeItem(DRAFT_PREFIX + id);
    else localStorage.setItem(DRAFT_PREFIX + id, JSON.stringify(record));
  } catch {
    // Nothing to do: the player still has Save.
  }
}

/** `store` writes the record to the device; a failure is shown as the problem line and the record stays unsaved. */
export function useRecordHistory<R extends { id: string }>(initial: R, store: (record: R) => Promise<void>) {
  const [history, setHistory] = useState<History<R>>({ past: [], present: initial, future: [] });
  const [saved, setSaved] = useState(initial);
  const [justSaved, setJustSaved] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  // Unsaved changes from an earlier visit, offered until the player takes them, drops them or starts editing.
  const [found, setFound] = useState(() => readDraft(initial));
  const record = history.present;
  const dirty = !same(record, saved);

  /** Applies an edit. Edits with the same `field` in a row (one visit to a field) are one Undo step. */
  const edit = (change: (draft: R) => void, field?: string) => {
    setJustSaved(false);
    setStatus("");
    setFound(undefined);
    setHistory((h) => {
      const next = structuredClone(h.present);
      change(next);
      if (same(next, h.present)) return h;
      const joins = field !== undefined && h.group === field;
      return { past: joins ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], group: field };
    });
  };
  const undo = () => {
    setJustSaved(false);
    setHistory((h) => {
      const previous = h.past[h.past.length - 1];
      return previous ? { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] } : h;
    });
  };
  const redo = () => {
    setJustSaved(false);
    setHistory((h) => {
      const next = h.future[0];
      return next ? { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: h.future.slice(1) } : h;
    });
  };
  const save = async () => {
    const toSave = record;
    try {
      await store(toSave);
    } catch {
      setJustSaved(false);
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setProblem("");
    setSaved(toSave);
    setJustSaved(true);
  };
  /** Leaving a field ends the run of edits that make one Undo step. */
  const endGroup = () => {
    setHistory((h) => (h.group === undefined ? h : { ...h, group: undefined }));
  };

  // The draft follows the record: kept while there are unsaved changes, cleared once saved or undone. While an earlier
  // draft is still on offer it is left alone.
  useEffect(() => {
    if (found === undefined) writeDraft(initial.id, dirty ? record : undefined);
  }, [found, dirty, record, initial.id]);

  const draft: Draft | undefined = found && {
    // One Undo step, so Undo goes back to what is saved.
    restore: () => {
      setHistory((h) => ({ past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: found, future: [] }));
      setFound(undefined);
      setStatus("Unsaved changes restored. Save to keep them.");
    },
    discard: () => {
      setFound(undefined);
    },
  };

  const blocker = useBlocker(dirty);
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

  return { record, dirty, canUndo: history.past.length > 0, canRedo: history.future.length > 0, edit, undo, redo, save, endGroup, justSaved, status, setStatus, problem, blocker, draft };
}

/** The offer shown at the top of an editor when unsaved changes from an earlier visit were found. */
export function DraftOffer({ draft }: { draft: Draft | undefined }) {
  if (!draft) return null;
  return (
    <div className="bt-confirm" role="group" aria-label="Unsaved changes from an earlier visit">
      <p>We kept changes to this unit that were not saved last time.</p>
      <span className="bt-row__actions">
        <button type="button" className="bt-button" onClick={draft.restore}>
          Restore them
        </button>
        <button type="button" className="bt-button bt-button--secondary" onClick={draft.discard}>
          Discard them
        </button>
      </span>
    </div>
  );
}
