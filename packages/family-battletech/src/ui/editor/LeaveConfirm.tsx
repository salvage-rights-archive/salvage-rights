import { useEffect, useId, useRef } from "react";
import { useBlocker } from "react-router";
import { dialogKeyDown } from "./dialog";

/** The unsaved-changes question, a modal dialog like the picker: focus goes to Stay and comes back there. */
export default function LeaveConfirm({ proceed, reset }: { proceed: () => void; reset: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const stay = useRef<HTMLButtonElement>(null);
  const before = useRef<Element | null>(null);
  const messageId = useId();
  useEffect(() => {
    before.current = document.activeElement;
    stay.current?.focus();
  }, []);
  const keep = () => {
    reset();
    // Back to what had focus; if that is gone, to the page's heading.
    const opener = before.current;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    else document.querySelector<HTMLElement>("h1")?.focus();
  };
  return (
    <div className="bt-picker-backdrop">
      <div
        ref={box}
        className="bt-picker bt-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={messageId}
        onKeyDown={(event) => {
          dialogKeyDown(event, box.current, keep);
        }}
      >
        <p id={messageId}>You have unsaved changes.</p>
        <span className="bt-actions">
          <button type="button" className="bt-button" onClick={proceed}>
            Leave without saving
          </button>
          <button type="button" ref={stay} className="bt-button bt-button--secondary" onClick={keep}>
            Stay
          </button>
        </span>
      </div>
    </div>
  );
}

/** The whole guard for a page with unsaved work: leaving inside the app asks first, and closing or reloading the tab warns. */
export function LeaveGuard({ dirty }: { dirty: boolean }) {
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
  return blocker.state === "blocked" ? <LeaveConfirm proceed={blocker.proceed} reset={blocker.reset} /> : null;
}
