import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hasUnsavedEdits, resetAppCache, usePwa, watchRegistration } from "./pwa";

describe("hasUnsavedEdits", () => {
  it("is true only while some page has asked the browser to confirm leaving", () => {
    expect(hasUnsavedEdits()).toBe(false);
    const warn = (event: Event) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    expect(hasUnsavedEdits()).toBe(true);
    window.removeEventListener("beforeunload", warn);
    expect(hasUnsavedEdits()).toBe(false);
  });
});

interface FakeWorker extends EventTarget {
  state: string;
}
interface FakeRegistration extends EventTarget {
  installing: FakeWorker | null;
  waiting: FakeWorker | null;
}

/** Runs a worker through installing, installed (and activated) on a registration, as the browser would. */
function install(controlled: boolean, finish: string[]): void {
  const registration = Object.assign(new EventTarget(), { installing: null, waiting: null }) as FakeRegistration;
  watchRegistration(registration as unknown as ServiceWorkerRegistration, () => controlled);
  const worker = Object.assign(new EventTarget(), { state: "installing" }) as FakeWorker;
  registration.installing = worker;
  registration.dispatchEvent(new Event("updatefound"));
  for (const state of finish) {
    worker.state = state;
    worker.dispatchEvent(new Event("statechange"));
  }
}

describe("watchRegistration", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("the first install says offline ready once and is not an update", () => {
    install(false, ["installed", "activated"]);
    const pwa = renderHook(() => usePwa()).result.current;
    expect(pwa.offlineReady).toBe(true);
    expect(pwa.updateReady).toBe(false);
    expect(localStorage.getItem("sr-offline-ready-announced")).toBe("1");
  });

  it("a worker installed while another controls the page is an update", () => {
    install(true, ["installed"]);
    expect(renderHook(() => usePwa()).result.current.updateReady).toBe(true);
  });
});

describe("resetAppCache", () => {
  it("unregisters the worker, deletes only this app's caches, then reloads", async () => {
    const unregister = vi.fn(() => Promise.resolve(true));
    const deleteCache = vi.fn((name: string) => Promise.resolve(name !== ""));
    const reload = vi.fn();
    await resetAppCache({
      registrations: () => Promise.resolve([{ unregister }]),
      cacheNames: () => Promise.resolve(["sr-shell-abc", "someone-elses", "sr-ocr-abc", "sr-shell-old"]),
      deleteCache,
      reload,
    });
    expect(unregister).toHaveBeenCalledOnce();
    expect(deleteCache.mock.calls.map(([name]) => name)).toEqual(["sr-shell-abc", "sr-ocr-abc", "sr-shell-old"]);
    expect(reload).toHaveBeenCalledOnce();
  });
});
