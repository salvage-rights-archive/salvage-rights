// What every modal dialog in the editor shares: Escape asks to close, and Tab stays inside the dialog.
import type { KeyboardEvent } from "react";

const FOCUSABLE = "button:not([disabled]), input:not([disabled]), select:not([disabled]), [href]";

export function dialogKeyDown(event: KeyboardEvent<HTMLElement>, container: HTMLElement | null, onEscape: () => void): void {
  if (event.key === "Escape") {
    event.stopPropagation();
    onEscape();
    return;
  }
  if (event.key !== "Tab" || !container) return;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
