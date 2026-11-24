import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_SETTINGS,
  exportStore,
  importStore,
  loadSettings,
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
  /** Imports a parsed file into the host store. Returns the problems; on success the settings are re-read. */
  importSettings(file: unknown): Promise<string[]>;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [persistent, setPersistent] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [storePromise] = useState<Promise<Store>>(() => openStore("host"));
  const changedBeforeLoad = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void storePromise.then(async (store) => {
      setPersistent(store.persistent);
      try {
        const loaded = await loadSettings(store);
        if (!cancelled && !changedBeforeLoad.current) setSettings(loaded);
      } catch {
        // Unreadable settings: keep the defaults.
      }
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storePromise]);

  const update = useCallback(
    (next: Settings) => {
      changedBeforeLoad.current = true;
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

  const exportSettings = useCallback(async () => exportStore(await storePromise), [storePromise]);

  const importSettings = useCallback(
    async (file: unknown) => {
      const store = await storePromise;
      const { problems } = await importStore(store, file);
      if (problems.length === 0) {
        changedBeforeLoad.current = true;
        setSettings(await loadSettings(store));
      }
      return problems;
    },
    [storePromise],
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
