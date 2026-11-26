// The two choices the special-ability screens share: whether our short notes show, and the rules level the lists are cut to. They are
// per-viewer conveniences kept in the browser; if it will not store them, the screens still work and fall back to the defaults.
import { useSyncExternalStore } from "react";
import type { RulesLevel } from "../../data/chassis";

export interface SpecialSettings {
  /** Our short notes, off until the owner has read the first batch. */
  glosses: boolean;
  level: RulesLevel;
}

const KEY = "salvage-rights:as-special-settings";
const LEVELS: RulesLevel[] = ["introductory", "standard", "advanced", "experimental", "licensed-noncanon", "fan-made", "unlimited"];
const DEFAULTS: SpecialSettings = { glosses: false, level: "standard" };

let current: SpecialSettings | undefined;
const listeners = new Set<() => void>();

function read(): SpecialSettings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (parsed && typeof parsed === "object") {
      const o = parsed as Partial<SpecialSettings>;
      return { glosses: o.glosses === true, level: LEVELS.includes(o.level as RulesLevel) ? (o.level as RulesLevel) : DEFAULTS.level };
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
