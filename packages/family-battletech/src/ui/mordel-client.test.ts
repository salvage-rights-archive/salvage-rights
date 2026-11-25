import { describe, expect, it, vi } from "vitest";
import { createMordelClient, MORDEL_BASE } from "./mordel-client";

const KEY = "test-key-not-real-1234";
const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, ...init });
const noWait = () => Promise.resolve();

describe("mordel client", () => {
  it("sends the key only in X-API-Key, never in the address", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(json({ id: 1 })));
    const client = createMordelClient({ key: KEY, fetch: fetchMock, wait: noWait });
    expect(await client.unit("bm", 7)).toEqual({ ok: true, value: { id: 1 } });
    await client.testKey();
    for (const [address, init] of fetchMock.mock.calls) {
      expect(String(address).startsWith(MORDEL_BASE)).toBe(true);
      expect(String(address)).not.toContain(KEY);
      expect(init?.method).toBe("GET");
      expect(init?.redirect).toBe("error");
      expect(init?.headers).toMatchObject({ "X-API-Key": KEY, Accept: "application/json" });
    }
  });

  it.each([
    ["401", () => new Response("", { status: 401 }), "bad-key"],
    ["404", () => new Response("", { status: 404 }), "not-found"],
    ["503", () => new Response("", { status: 503 }), "server"],
    ["not json", () => new Response("<html>", { status: 200 }), "server"],
    ["status Error", () => json({ status: "Error" }), "server"],
    ["rejected", () => Promise.reject(new Error(`boom ${KEY}`)), "offline"],
  ])("maps %s to a plain failure without the key", async (_name, answer, failure) => {
    const client = createMordelClient({ key: KEY, fetch: () => Promise.resolve(answer()).catch((e: unknown) => Promise.reject(e as Error)), wait: noWait });
    const result = await client.unit("bm", 1);
    expect(result).toMatchObject({ ok: false, failure });
    expect(JSON.stringify(result)).not.toContain(KEY);
  });

  it("waits Retry-After seconds on 429, retries once, then gives slow-down", async () => {
    const wait = vi.fn(noWait);
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response("", { status: 429, headers: { "Retry-After": "2" } })));
    const result = await createMordelClient({ key: KEY, fetch: fetchMock, wait }).unit("bm", 1);
    expect(result).toMatchObject({ ok: false, failure: "slow-down" });
    expect(wait).toHaveBeenCalledExactlyOnceWith(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("succeeds when the retry after a 429 is answered", async () => {
    const answers = [new Response("", { status: 429 }), json({ id: 3 })];
    const wait = vi.fn(noWait);
    const result = await createMordelClient({ key: KEY, fetch: () => Promise.resolve(answers.shift() as Response), wait }).unit("bm", 3);
    expect(result).toEqual({ ok: true, value: { id: 3 } });
    expect(wait).toHaveBeenCalledWith(5000);
  });

  it("myUnits follows next_cursor across pages and stops on null", async () => {
    const pages = [
      json({ units: [{ unit_type_short: "bm", id: 1, name: "A", tons: 50, year: 3050, designer: "d" }, { id: 2 }], next_cursor: "abc" }),
      json({ units: [{ unit_type_short: "bm", id: 3, name: "B", tons: 20, designer: "e" }], next_cursor: null }),
    ];
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(pages.shift() as Response));
    const result = await createMordelClient({ key: KEY, fetch: fetchMock, wait: noWait }).myUnits();
    expect(result).toEqual({
      ok: true,
      value: [
        { unitType: "bm", id: 1, name: "A", tons: 50, year: 3050, designer: "d" },
        { unitType: "bm", id: 3, name: "B", tons: 20, year: null, designer: "e" },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("owner=me&type=bm&limit=1000");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("cursor=abc");
  });
});
