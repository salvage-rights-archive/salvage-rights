// What every unit editor keeps while a record is open: the Undo and Redo history, what was last saved, the status and problem
// lines, and the hold on leaving with unsaved changes. The 'Mech editor has its own (an OmniMech edits two documents at once).
import { useEffect, useState } from "react";
import { useBlocker } from "react-router";
import { STORAGE_WRITE_FAILED } from "../storage";

const HISTORY_LIMIT = 100;

interface History<R> {
  past: R[];
  present: R;
  future: R[];
  /** The field being typed into: edits to it in a row make one step. */
  group?: string;
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** `store` writes the record to the device; a failure is shown as the problem line and the record stays unsaved. */
export function useRecordHistory<R>(initial: R, store: (record: R) => Promise<void>) {
  const [history, setHistory] = useState<History<R>>({ past: [], present: initial, future: [] });
  const [saved, setSaved] = useState(initial);
  const [justSaved, setJustSaved] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const record = history.present;
  const dirty = !same(record, saved);

  /** Applies an edit. Edits with the same `field` in a row (one visit to a field) are one Undo step. */
  const edit = (change: (draft: R) => void, field?: string) => {
    setJustSaved(false);
    setStatus("");
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

  return { record, dirty, canUndo: history.past.length > 0, canRedo: history.future.length > 0, edit, undo, redo, save, endGroup, justSaved, status, setStatus, problem, blocker };
}
