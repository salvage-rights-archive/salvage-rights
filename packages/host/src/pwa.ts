import { useSyncExternalStore } from "react";

/** Same value as CACHE_PREFIX in vite/pwa-plugin.ts, which names the caches. */
const CACHE_PREFIX = "sr-shell-";
const ANNOUNCED_KEY = "sr-offline-ready-announced";
const CHECK_EVERY_MS = 60 * 60 * 1000;

export interface PwaState {
  /** A new version is installed and waiting. */
  updateReady: boolean;
  /** The first install finished and has not been announced yet. */
  offlineReady: boolean;
  online: boolean;
  /** The browser offered to install the app and has not been asked yet. */
  canPrompt: boolean;
  /** The page runs as an installed app (or has just been installed). */
  installed: boolean;
  /** The update was asked for while the editor had unsaved changes, so it did not go ahead. */
  updateBlocked: boolean;
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/** iPhone, iPod and iPad (an iPad asks for the desktop site and says it is a Mac, but has a touch screen). */
export function isIos(agent = navigator.userAgent, platform = navigator.platform, touchPoints = navigator.maxTouchPoints): boolean {
  return /iPad|iPhone|iPod/.test(agent) || (platform === "MacIntel" && touchPoints > 1);
}

/**
 * True when leaving the page now would lose work. It asks the same question the browser asks on reload: the editor
 * answers "beforeunload" with a prevented event while it holds changes that are not saved, so this reuses that
 * logic rather than keeping a second record of it.
 */
export function hasUnsavedEdits(): boolean {
  const probe = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(probe);
  return probe.defaultPrevented;
}

let state: PwaState = {
  updateReady: false,
  offlineReady: false,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  canPrompt: false,
  installed: typeof window === "undefined" ? false : isStandalone(),
  updateBlocked: false,
};
const listeners = new Set<() => void>();
let installPrompt: InstallPromptEvent | undefined;
let reloadOnTakeover = false;
let reloading = false;

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, () => state);
}

/**
 * Starts the watch on a registration: says when the first install is done and when a newer version is waiting. A
 * worker that finishes installing while another worker already controls the page is an update; the first one is not.
 */
export function watchRegistration(
  registration: ServiceWorkerRegistration,
  hasController: () => boolean = () => navigator.serviceWorker.controller !== null,
): void {
  const follow = (worker: ServiceWorker) => {
    const firstInstall = !hasController();
    const check = () => {
      if (worker.state === "installed" && !firstInstall) set({ updateReady: true });
      if (worker.state === "activated" && firstInstall) announceOfflineReady();
    };
    worker.addEventListener("statechange", check);
    check();
  };
  if (registration.waiting && hasController()) set({ updateReady: true });
  if (registration.installing) follow(registration.installing);
  registration.addEventListener("updatefound", () => {
    if (registration.installing) follow(registration.installing);
  });
}

/** The "Offline ready" message is shown once, ever: later visits do not repeat it. */
function announceOfflineReady() {
  try {
    if (localStorage.getItem(ANNOUNCED_KEY) === "1") return;
    localStorage.setItem(ANNOUNCED_KEY, "1");
  } catch {
    // Without storage the message may repeat after a restart; better than never saying it.
  }
  set({ offlineReady: true });
  // A passing notice with no button to tab through: it goes by itself.
  setTimeout(dismissOfflineReady, 10_000);
}

function dismissOfflineReady() {
  set({ offlineReady: false });
}

/** Asks the waiting worker to take over, then reloads once it has. Does nothing while there are unsaved changes. */
export async function applyUpdate(): Promise<"applied" | "unsaved"> {
  if (hasUnsavedEdits()) {
    set({ updateBlocked: true });
    return "unsaved";
  }
  set({ updateBlocked: false });
  const registration = await navigator.serviceWorker.getRegistration();
  reloadOnTakeover = true;
  registration?.waiting?.postMessage("SKIP_WAITING");
  return "applied";
}

/** Asks the running worker for its version, or null when none runs. */
export async function workerVersion(): Promise<string | null> {
  const worker = (await navigator.serviceWorker.getRegistration())?.active;
  if (!worker) return null;
  return new Promise((done) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      done(typeof event.data === "string" ? event.data : null);
    };
    worker.postMessage("GET_VERSION", [channel.port2]);
    setTimeout(() => {
      done(null);
    }, 2000);
  });
}

export interface ResetDeps {
  registrations(): Promise<readonly { unregister(): Promise<boolean> }[]>;
  cacheNames(): Promise<string[]>;
  deleteCache(name: string): Promise<boolean>;
  reload(): void;
}

/**
 * Unregisters the worker, deletes this app's caches and reloads. The saved 'Mechs and settings are in IndexedDB and
 * are not touched, and neither are caches that belong to anything else.
 */
export async function resetAppCache(
  deps: ResetDeps = {
    registrations: () => navigator.serviceWorker.getRegistrations(),
    cacheNames: () => caches.keys(),
    deleteCache: (name) => caches.delete(name),
    reload: () => {
      window.location.reload();
    },
  },
): Promise<void> {
  try {
    await Promise.all((await deps.registrations()).map((registration) => registration.unregister()));
    await Promise.all((await deps.cacheNames()).filter((name) => name.startsWith(CACHE_PREFIX)).map(deps.deleteCache));
    try {
      localStorage.removeItem(ANNOUNCED_KEY);
    } catch {
      // Nothing to clear.
    }
  } finally {
    deps.reload();
  }
}

/** Asks the browser to keep the saved data. Safe to call often: it asks only when not already granted. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!("storage" in navigator) || typeof navigator.storage.persist !== "function") return false;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

/** Shows the browser's install question. Returns false when it cannot be shown. */
export async function promptInstall(): Promise<boolean> {
  const event = installPrompt;
  if (!event) return false;
  installPrompt = undefined;
  set({ canPrompt: false });
  await event.prompt();
  return (await event.userChoice).outcome === "accepted";
}

/** Registers the worker and starts the listeners. Production builds only (the dev server has no worker). */
export function startPwa(base: string): void {
  window.addEventListener("online", () => {
    set({ online: true });
  });
  window.addEventListener("offline", () => {
    set({ online: false });
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = undefined;
    set({ installed: true, canPrompt: false });
    void requestPersistence();
  });
  // An installed app asks for lasting storage on each launch (it is a no-op once granted).
  if (state.installed) void requestPersistence();

  if (!("serviceWorker" in navigator)) return;
  // Reload only after the person asked for the update; a worker taking over at first install changes nothing.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // The worker claimed a page that had none: the first install is complete.
    if (!reloadOnTakeover) announceOfflineReady();
    if (!reloadOnTakeover || reloading) return;
    reloading = true;
    window.location.reload();
  });
  navigator.serviceWorker
    .register(`${base}sw.js`, { scope: base })
    .then((registration) => {
      watchRegistration(registration);
      const check = () => {
        void registration.update().catch(() => undefined);
      };
      check();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
      setInterval(check, CHECK_EVERY_MS);
    })
    .catch((error: unknown) => {
      console.warn("The app could not be set up for offline use.", error);
    });
}
