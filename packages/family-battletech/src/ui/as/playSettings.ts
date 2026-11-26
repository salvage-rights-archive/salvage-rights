// The one Alpha Strike play setting (rules level, edition, game year, tech base), shared by the home, the aids, the specials, the unit and
// the force pages. It lives in the on-device store (as-play-filter); this module keeps a copy in memory so every screen sees a change at
// once, and so a browser that will not store still lets the player choose for this visit.
import { useSyncExternalStore } from "react";
import type { PlayFilter } from "../../rules/as-force";
import { openAsStorage } from "./storage";
import type { AsStorage } from "./storage";

export interface PlaySnapshot {
  filter: PlayFilter;
  /** False until the saved setting has been read (or reading failed). */
  ready: boolean;
  /** Set when the saved setting could not be read or written. */
  problem: "read" | "write" | "";
}

let snapshot: PlaySnapshot = { filter: {}, ready: false, problem: "" };
let started = false;
let storage: AsStorage | undefined;
const listeners = new Set<() => void>();

const publish = (next: PlaySnapshot) => {
  snapshot = next;
  listeners.forEach((l) => { l(); });
};

function start() {
  if (started) return;
  started = true;
  void (async () => {
    try {
      storage = await openAsStorage();
      const saved = await storage.getFilter();
      // A choice made while the saved one was loading wins over it.
      publish({ filter: { ...saved, ...snapshot.filter }, ready: true, problem: "" });
    } catch {
      publish({ ...snapshot, ready: true, problem: "read" });
    }
  })();
}

/** Changes the setting. A key set to undefined is cleared. */
export function updatePlayFilter(change: Partial<PlayFilter>): void {
  const merged: PlayFilter = { ...snapshot.filter, ...change };
  const filter = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined)) as PlayFilter;
  publish({ ...snapshot, filter, problem: "" });
  storage?.setFilter(filter).catch(() => { publish({ ...snapshot, problem: "write" }); });
}

/** Forget what was read, so the next screen reads the store again (for tests). */
export function resetPlayFilter(): void {
  started = false;
  storage = undefined;
  publish({ filter: {}, ready: false, problem: "" });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  start();
  return () => { listeners.delete(listener); };
};

export const usePlaySettings = (): PlaySnapshot => useSyncExternalStore(subscribe, () => snapshot);
