import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openStore } from "./store";

let counter = 0;
const ns = () => `test-${String(++counter)}`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("openStore with IndexedDB", () => {
  it("sets and gets a value", async () => {
    const store = await openStore(ns());
    await store.set("a", { n: 1 });
    expect(await store.get("a")).toEqual({ n: 1 });
    expect(store.persistent).toBe(true);
  });

  it("returns undefined for a missing key", async () => {
    const store = await openStore(ns());
    expect(await store.get("nope")).toBeUndefined();
  });

  it("deletes a key", async () => {
    const store = await openStore(ns());
    await store.set("a", 1);
    await store.delete("a");
    expect(await store.get("a")).toBeUndefined();
  });

  it("lists keys", async () => {
    const store = await openStore(ns());
    await store.set("a", 1);
    await store.set("b", 2);
    expect((await store.keys()).sort()).toEqual(["a", "b"]);
  });

  it("keeps namespaces apart and persists across opens", async () => {
    const one = ns();
    const a = await openStore(one);
    const b = await openStore(ns());
    await a.set("x", 1);
    expect(await b.keys()).toEqual([]);
    const again = await openStore(one);
    expect(await again.get("x")).toBe(1);
  });

  it("rejects when a write fails after opening", async () => {
    const store = await openStore(ns());
    await expect(store.set("a", () => 1)).rejects.toBeDefined();
  });
});

describe("openStore fallback", () => {
  async function checkMemory() {
    const store = await openStore(ns());
    expect(store.persistent).toBe(false);
    await store.set("a", 1);
    expect(await store.get("a")).toBe(1);
    expect(await store.keys()).toEqual(["a"]);
    await store.delete("a");
    expect(await store.get("a")).toBeUndefined();
  }

  it("uses memory when indexedDB is missing", async () => {
    const saved = globalThis.indexedDB;
    // @ts-expect-error simulating an environment without IndexedDB
    delete globalThis.indexedDB;
    try {
      await checkMemory();
    } finally {
      globalThis.indexedDB = saved;
    }
  });

  it("uses memory when indexedDB.open throws", async () => {
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new Error("blocked");
    });
    await checkMemory();
  });
});
