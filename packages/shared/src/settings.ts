import type { Store } from "./store";

export type Theme = "device" | "light" | "dark";

/** Games are identified as "<family>/<game>". */
export interface Settings {
  theme: Theme;
  hiddenFamilies: string[];
  hiddenGames: string[];
}

export const DEFAULT_SETTINGS: Settings = { theme: "device", hiddenFamilies: [], hiddenGames: [] };

const SETTINGS_KEY = "settings";

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const items: unknown[] = value;
  return [...new Set(items.filter((item): item is string => typeof item === "string"))];
}

/** Ids are kept even when no installed family matches them. */
export function readSettings(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_SETTINGS, hiddenFamilies: [], hiddenGames: [] };
  const record = raw as Record<string, unknown>;
  const theme = record.theme === "light" || record.theme === "dark" ? record.theme : "device";
  return {
    theme,
    hiddenFamilies: strings(record.hiddenFamilies),
    hiddenGames: strings(record.hiddenGames),
  };
}

export async function loadSettings(store: Store): Promise<Settings> {
  return readSettings(await store.get(SETTINGS_KEY));
}

export function saveSettings(store: Store, settings: Settings): Promise<void> {
  return store.set(SETTINGS_KEY, settings);
}
