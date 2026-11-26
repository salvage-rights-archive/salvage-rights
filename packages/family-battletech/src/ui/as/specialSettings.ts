// What the special-ability screens share: whether our short notes show. It is a per-viewer convenience kept in the browser; if it will not
// store it, the screens still work and fall back to the default. The rules level they cut the list to is the play setting (playSettings.ts).
import { useSyncExternalStore } from "react";

export interface SpecialSettings {
  /** Our short notes, off until we have read the first batch. */
  glosses: boolean;
}

const KEY = "salvage-rights:as-special-settings";
const DEFAULTS: SpecialSettings = { glosses: false };

let current: SpecialSettings | undefined;
const listeners = new Set<() => void>();

function read(): SpecialSettings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (parsed && typeof parsed === "object") {
      const o = parsed as Partial<SpecialSettings>;
      return { glosses: o.glosses === true };
    }
  } catch {
    // Storage blocked or unreadable: use the defaults.
  }
  return DEFAULTS;
}

const snapshot = (): SpecialSettings => (current ??= read());

export function setSpecialSettings(change: Partial<SpecialSettings>): void {
  current = { ...snapshot(), ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Kept for this visit only.
  }
  listeners.forEach((l) => { l(); });
}

/** Forget what was read, so the next read goes to the browser again (for tests). */
export function resetSpecialSettings(): void {
  current = undefined;
  listeners.forEach((l) => { l(); });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useSpecialSettings = (): SpecialSettings => useSyncExternalStore(subscribe, snapshot);
