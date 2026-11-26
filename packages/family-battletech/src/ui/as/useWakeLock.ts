// Keeps the screen on while a table page is open, with an off switch the player's choice is remembered by (Screen Wake Lock).
import { useEffect, useState } from "react";

const KEY = "as-table-keep-awake";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

/** The switch, whether the browser can do it at all, and the setter that remembers the choice. Asks again when the page comes back to the front. */
export function useWakeLock(): { on: boolean; supported: boolean; set: (on: boolean) => void } {
  const [on, setOn] = useState(read);
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  useEffect(() => {
    if (!on || !supported) return;
    let live = true;
    let sentinel: WakeLockSentinel | undefined;
    const request = async (): Promise<void> => {
      try {
        const got = await navigator.wakeLock.request("screen");
        if (live) sentinel = got;
        else void got.release();
      } catch {
        // The browser may refuse (low battery, hidden page): the screen then dims as usual.
      }
    };
    const back = (): void => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", back);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", back);
      void sentinel?.release().catch(() => undefined);
    };
  }, [on, supported]);
  const set = (next: boolean): void => {
    setOn(next);
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Private window: the choice lasts until the page closes.
    }
  };
  return { on, supported, set };
}
