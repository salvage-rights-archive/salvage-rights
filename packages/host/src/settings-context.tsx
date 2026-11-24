import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_SETTINGS,
  exportStore,
  loadSettings,
  readExportFile,
  readSettings,
  openStore,
  saveSettings,
} from "@salvage-rights/shared";
import type { ExportFile, Settings, Store } from "@salvage-rights/shared";

export interface SettingsValue {
  settings: Settings;
  /** Applies the settings at once and saves them. A failed save keeps them in memory and sets `saveFailed`. */
  update(next: Settings): void;
  /** False until the store is open, and when it falls back to memory. */
  persistent: boolean;
  /** True once the stored settings have been read (or could not be), so a first paint can wait for them. */
  loaded: boolean;
  saveFailed: boolean;
  /** Everything in the host store, ready to save as a file. */
  exportSettings(): Promise<ExportFile>;
  /** Applies the settings entry of a parsed export file, as `update` does. Returns the problems; nothing changes if any. */
  importSettings(file: unknown): string[];
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [persistent, setPersistent] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [{ storePromise, readPromise }] = useState(() => {
    const opened: Promise<Store> = openStore("host");
    // Resolves once the stored settings have been read; null when they could not be.
    const read: Promise<Settings | null> = opened.then(async (store) => {
      try {
        return await loadSettings(store);
      } catch {
        return null;
      }
    });
    return { storePromise: opened, readPromise: read };
  });
  const changedThisSession = useRef(false);
  const current = useRef<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([storePromise, readPromise]).then(([store, stored]) => {
      if (cancelled) return;
      setPersistent(store.persistent);
      if (stored && !changedThisSession.current) {
        current.current = stored;
        setSettings(stored);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storePromise, readPromise]);

  const update = useCallback(
    (next: Settings) => {
      changedThisSession.current = true;
      current.current = next;
      setSettings(next);
      storePromise
        .then((store) => saveSettings(store, next))
        .then(
          () => {
            setSaveFailed(false);
          },
          () => {
            setSaveFailed(true);
          },
        );
    },
    [storePromise],
  );

  // Settings never changed are not in the store yet, and a file without them could not be imported again.
  // The export waits for the stored settings to be read, so defaults never stand in for stored values.
  const exportSettings = useCallback(async () => {
    const stored = await readPromise;
    const file = await exportStore(await storePromise);
    const mine = changedThisSession.current ? current.current : (stored ?? DEFAULT_SETTINGS);
    return { ...file, entries: { ...file.entries, settings: mine } };
  }, [storePromise, readPromise]);

  const importSettings = useCallback(
    (file: unknown): string[] => {
      const read = readExportFile(file, "host");
      if (!read.entries) return read.problems;
      if (!("settings" in read.entries)) return ["That file has no settings in it."];
      update(readSettings(read.entries.settings));
      return [];
    },
    [update],
  );

  const value = useMemo(
    () => ({ settings, update, persistent, loaded, saveFailed, exportSettings, importSettings }),
    [settings, update, persistent, loaded, saveFailed, exportSettings, importSettings],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (value === null) throw new Error("useSettings needs a SettingsProvider");
  return value;
}
