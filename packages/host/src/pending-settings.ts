import type { Settings } from "@salvage-rights/shared";

/**
 * A synchronous write-ahead note for a settings save that has not finished yet. The browser can abort an
 * IndexedDB transaction when the page unloads, but a localStorage write is already done when it returns.
 * Every function swallows storage errors: localStorage can be missing or throw, and the note is only a safeguard.
 */
const KEY = "salvage-rights:host:pending-settings";

export interface PendingNote {
  settings: unknown;
  at: number;
}

let counter = 0;

/** Writes the note and returns its id, to pass to `clearPending` once the save has succeeded. */
export function writePending(settings: Settings): number {
  const at = Date.now() * 1000 + (counter++ % 1000);
  try {
    localStorage.setItem(KEY, JSON.stringify({ settings, at }));
  } catch {
    // Nothing to fall back on; the asynchronous save is still tried.
  }
  return at;
}

/** The note left behind, or null. A note that does not parse is removed. */
export function readPending(): PendingNote | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && "settings" in parsed) {
        const at = (parsed as { at?: unknown }).at;
        return { settings: (parsed as { settings: unknown }).settings, at: typeof at === "number" ? at : 0 };
      }
    } catch {
      // Falls through to removal.
    }
    localStorage.removeItem(KEY);
  } catch {
    // Storage is unavailable.
  }
  return null;
}

/** Removes the note, but only if it is still the one written with `at`: a newer update may have replaced it. */
export function clearPending(at: number): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && (parsed as { at?: unknown }).at === at) {
      localStorage.removeItem(KEY);
    }
  } catch {
    // Storage is unavailable or the note is unreadable; leave it for the next start-up.
  }
}
