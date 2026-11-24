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
import { clearPending, readPending, writePending } from "./pending-settings";

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

  // Saves to the store; the pending note (written at `at`) goes once that has worked in a persistent store,
  // and stays if it fails or the store is only memory.
  const save = useCallback(
    (next: Settings, at: number) => {
      storePromise
        .then(async (store) => {
          await saveSettings(store, next);
          return store.persistent;
        })
        .then(
          (persistent) => {
            // A memory store forgets on the next load, so then the note is the only durable copy.
            if (persistent) clearPending(at);
            setSaveFailed(false);
          },
          () => {
            setSaveFailed(true);
          },
        );
    },
    [storePromise],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([storePromise, readPromise]).then(([store, stored]) => {
      if (cancelled) return;
      setPersistent(store.persistent);
      if (!changedThisSession.current) {
        // A note means a save was cut off last time: it is newer than whatever the store holds.
        const note = readPending();
        if (note) {
          const noted = readSettings(note.settings);
          changedThisSession.current = true; // so an export carries what is shown, not the older stored value
          current.current = noted;
          setSettings(noted);
          save(noted, note.at);
        } else if (stored) {
          current.current = stored;
          setSettings(stored);
        }
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storePromise, readPromise, save]);

  const update = useCallback(
    (next: Settings) => {
      changedThisSession.current = true;
      current.current = next;
      setSettings(next);
      save(next, writePending(next));
    },
    [save],
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
