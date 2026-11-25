import { describe, expect, it, vi } from "vitest";
import { createMordelClient, MORDEL_BASE } from "./mordel-client";

const KEY = "test-key-not-real-1234";
const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, ...init });
const status = (code: number, headers: Record<string, string> = {}) => new Response("", { status: code, headers });
const noWait = () => Promise.resolve();
/** A fetch that gives the next answer from the list each time it is called. */
const answering = (...answers: (Response | Error)[]) =>
  vi.fn<typeof fetch>(() => {
    const next = answers.shift();
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next ?? status(500));
  });
const unitRow = (id: number) => ({ unit_type_short: "bm", id, name: `Unit ${id}`, tons: 50, year: 3050, designer: "d" });

describe("mordel client", () => {
  it("sends the key only in X-API-Key, never in the address, and tests it at /key", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(json({ status: "OK", unit: {} })));
    const client = createMordelClient({ key: KEY, fetch: fetchMock, wait: noWait });
    expect(await client.unit("bm", 7)).toEqual({ ok: true, value: { status: "OK", unit: {} } });
    expect(await client.testKey()).toEqual({ ok: true, value: true });
    expect(fetchMock.mock.calls.map(([address]) => String(address))).toEqual([`${MORDEL_BASE}/units/bm/7`, `${MORDEL_BASE}/key`]);
    for (const [address, init] of fetchMock.mock.calls) {
      expect(String(address)).not.toContain(KEY);
      expect(init?.method).toBe("GET");
      expect(init?.redirect).toBe("error");
      expect(init?.headers).toEqual({ "X-API-Key": KEY, Accept: "application/json" });
    }
  });

  it.each([
    ["401", status(401), "bad-key"],
    ["404", status(404), "not-found"],
    ["400", status(400), "bad-request"],
    ["503", status(503), "server"],
    ["not json", new Response("<html>", { status: 200 }), "server"],
    ["status Error", json({ status: "Error" }), "server"],
    ["rejected", new Error(`boom ${KEY}`), "offline"],
  ])("maps %s to a plain failure without the key", async (_name, answer, failure) => {
    const result = await createMordelClient({ key: KEY, fetch: answering(answer), wait: noWait }).unit("bm", 1);
    expect(result).toMatchObject({ ok: false, failure });
    expect(JSON.stringify(result)).not.toContain(KEY);
  });

  it("retries once after a 429, and gives slow-down if the second answer is a 429 too", async () => {
    const wait = vi.fn(noWait);
    const failing = answering(status(429, { "Retry-After": "2" }), status(429));
    expect(await createMordelClient({ key: KEY, fetch: failing, wait }).unit("bm", 1)).toMatchObject({ failure: "slow-down" });
    expect(wait).toHaveBeenCalledExactlyOnceWith(2000);
    expect(failing).toHaveBeenCalledTimes(2);

    const recovering = answering(status(429), json({ id: 3 }));
    expect(await createMordelClient({ key: KEY, fetch: recovering, wait }).unit("bm", 3)).toEqual({ ok: true, value: { id: 3 } });
  });

  it.each([
    ["90", 60000],
    ["Wed, 21 Oct 2026 07:28:00 GMT", 5000],
    ["-1", 5000],
    ["", 5000],
  ])("waits for Retry-After %j: %i ms", async (header, ms) => {
    const wait = vi.fn(noWait);
    await createMordelClient({ key: KEY, fetch: answering(status(429, { "Retry-After": header }), json({})), wait }).unit("bm", 1);
    expect(wait).toHaveBeenCalledExactlyOnceWith(ms);
  });

  it("myUnits follows next_cursor (encoded), skips rows without id or name, and stops on null", async () => {
    const fetchMock = answering(
      json({ status: "OK", units: [unitRow(1), { id: 2 }, { name: "No id" }], next_cursor: "a b&c" }),
      json({ status: "OK", units: [{ ...unitRow(3), year: null }], next_cursor: null }),
    );
    const result = await createMordelClient({ key: KEY, fetch: fetchMock, wait: noWait }).myUnits();
    expect(result).toEqual({
      ok: true,
      value: {
        truncated: false,
        rows: [
          { unitType: "bm", id: 1, name: "Unit 1", tons: 50, year: 3050, designer: "d" },
          { unitType: "bm", id: 3, name: "Unit 3", tons: 50, year: null, designer: "d" },
        ],
      },
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${MORDEL_BASE}/units?owner=me&type=bm&limit=1000`);
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(`${MORDEL_BASE}/units?owner=me&type=bm&limit=1000&cursor=a%20b%26c`);
  });

  it("myUnits stops after 20 pages and says it was cut short", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(json({ units: [unitRow(1)], next_cursor: "more" })));
    const result = await createMordelClient({ key: KEY, fetch: fetchMock, wait: noWait }).myUnits();
    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(result).toMatchObject({ ok: true, value: { truncated: true } });
  });

  it("myUnits gives only the failure when a page fails midway or has no units array", async () => {
    const midway = answering(json({ units: [unitRow(1)], next_cursor: "x" }), status(503));
    expect(await createMordelClient({ key: KEY, fetch: midway, wait: noWait }).myUnits()).toMatchObject({ ok: false, failure: "server" });
    const noUnits = answering(json({ status: "OK", count: 0 }));
    expect(await createMordelClient({ key: KEY, fetch: noUnits, wait: noWait }).myUnits()).toMatchObject({ ok: false, failure: "server" });
  });
});
