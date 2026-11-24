import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { openStore } from "./store";
import { exportStore, importStore } from "./store-transfer";

let counter = 0;
const ns = () => `transfer-${String(++counter)}`;

describe("store transfer", () => {
  it("round-trips every entry into an empty store", async () => {
    const name = ns();
    const source = await openStore(name);
    await source.set("a", 1);
    await source.set("b", { c: [1, 2] });
    const file = await exportStore(source);
    expect(file.app).toBe("salvage-rights");
    expect(file.version).toBe(1);
    expect(file.namespace).toBe(name);

    const target = await openStore(`${name}-copy`);
    const copy = { ...file, namespace: `${name}-copy` };
    const result = await importStore(target, copy);
    expect(result).toEqual({ imported: 2, problems: [] });
    expect(await target.get("a")).toBe(1);
    expect(await target.get("b")).toEqual({ c: [1, 2] });
  });

  it("overwrites same keys and keeps others", async () => {
    const name = ns();
    const store = await openStore(name);
    await store.set("keep", 1);
    await store.set("same", "old");
    const file = {
      app: "salvage-rights",
      version: 1,
      namespace: name,
      exportedAt: "2026-01-01T00:00:00.000Z",
      entries: { same: "new" },
    };
    expect((await importStore(store, file)).imported).toBe(1);
    expect(await store.get("keep")).toBe(1);
    expect(await store.get("same")).toBe("new");
  });

  it.each([
    ["a non-object", "nope", /object/],
    ["null", null, /object/],
    ["a wrong app", { app: "other", version: 1, namespace: "N", entries: {} }, /app/],
    ["a wrong version", { app: "salvage-rights", version: 2, namespace: "N", entries: {} }, /version/],
    ["a different namespace", { app: "salvage-rights", version: 1, namespace: "other", entries: {} }, /namespace/],
    ["missing entries", { app: "salvage-rights", version: 1, namespace: "N" }, /entries/],
  ])("rejects %s", async (_label, file, reason) => {
    const store = await openStore("N");
    await store.set("existing", 1);
    const result = await importStore(store, file);
    expect(result.imported).toBe(0);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toMatch(reason);
    expect(await store.keys()).toEqual(["existing"]);
  });
});
