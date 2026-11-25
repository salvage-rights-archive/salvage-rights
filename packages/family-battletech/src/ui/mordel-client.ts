// The one place that talks to mordel.net. The key goes only in the X-API-Key header; messages are written for a
// player and never carry the key, a header, the address query or raw error text. Nothing here logs.

export const MORDEL_BASE = "https://mordel.net/api/v1";

export type MordelFailure = "bad-key" | "not-found" | "slow-down" | "offline" | "server" | "bad-request";
export type MordelResult<T> = { ok: true; value: T } | { ok: false; failure: MordelFailure; message: string };

export interface MordelListRow {
  unitType: string;
  id: number;
  name: string;
  tons: number;
  year: number | null;
  designer: string;
}

export interface MordelClient {
  testKey(): Promise<MordelResult<true>>;
  unit(unitType: string, id: number): Promise<MordelResult<unknown>>;
  /** All or nothing: a failure on any page returns only the failure. After 20 pages it stops and says `truncated`. */
  myUnits(): Promise<MordelResult<{ rows: MordelListRow[]; truncated: boolean }>>;
}

const MESSAGES: Record<MordelFailure, string> = {
  "bad-key": "mordel.net did not accept that key.",
  "not-found": "mordel.net has no unit with that number.",
  "slow-down": "mordel.net asked us to slow down. Try again in a minute.",
  offline: "We could not reach mordel.net. You may be offline.",
  server: "mordel.net had a problem. Try again later.",
  "bad-request": "We sent mordel.net a request it did not understand. This is a fault in the app.",
};

const MAX_PAGES = 20;
const DEFAULT_RETRY_SECONDS = 5;
const MAX_RETRY_SECONDS = 60;

const fail = (failure: MordelFailure): { ok: false; failure: MordelFailure; message: string } => ({
  ok: false,
  failure,
  message: MESSAGES[failure],
});

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function retrySeconds(header: string | null): number {
  const n = header === null || header.trim() === "" ? NaN : Number(header);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, MAX_RETRY_SECONDS) : DEFAULT_RETRY_SECONDS;
}

export function createMordelClient(options: {
  key: string;
  fetch?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
}): MordelClient {
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const wait = options.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const send = (path: string): Promise<Response> =>
    doFetch(MORDEL_BASE + path, {
      method: "GET",
      headers: { "X-API-Key": options.key, Accept: "application/json" },
      redirect: "error",
    });

  async function get(path: string): Promise<MordelResult<unknown>> {
    let response: Response;
    try {
      response = await send(path);
      if (response.status === 429) {
        await wait(retrySeconds(response.headers.get("Retry-After")) * 1000);
        response = await send(path);
      }
    } catch {
      // A refused redirect (redirect: "error") lands here too, and is reported as offline.
      return fail("offline");
    }
    if (response.status === 429) return fail("slow-down");
    if (response.status === 401) return fail("bad-key");
    if (response.status === 404) return fail("not-found");
    // Any other 4xx means our own request was wrong (the list answers 400 to a parameter it does not know).
    if (response.status >= 400) return fail(response.status >= 500 ? "server" : "bad-request");
    if (!response.ok) return fail("server");
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return fail("server");
    }
    if (isObject(body) && body.status === "Error") return fail("server");
    return { ok: true, value: body };
  }

  const rowOf = (raw: unknown): MordelListRow | undefined => {
    if (!isObject(raw) || typeof raw.id !== "number" || typeof raw.name !== "string" || !raw.name) return undefined;
    return {
      unitType: typeof raw.unit_type_short === "string" ? raw.unit_type_short : "bm",
      id: raw.id,
      name: raw.name,
      tons: typeof raw.tons === "number" ? raw.tons : 0,
      year: typeof raw.year === "number" ? raw.year : null,
      designer: typeof raw.designer === "string" ? raw.designer : "",
    };
  };

  return {
    testKey: async () => {
      const result = await get("/key");
      return result.ok ? { ok: true, value: true } : result;
    },
    unit: (unitType, id) => get(`/units/${encodeURIComponent(unitType)}/${encodeURIComponent(String(id))}`),
    myUnits: async () => {
      const rows: MordelListRow[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < MAX_PAGES; page++) {
        const query: string = "/units?owner=me&type=bm&limit=1000" + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
        const result: MordelResult<unknown> = await get(query);
        if (!result.ok) return result;
        const body = result.value;
        if (!isObject(body) || !Array.isArray(body.units)) return fail("server");
        for (const raw of body.units) {
          const row = rowOf(raw);
          if (row) rows.push(row);
        }
        cursor = typeof body.next_cursor === "string" && body.next_cursor ? body.next_cursor : null;
        if (cursor === null) return { ok: true, value: { rows, truncated: false } };
      }
      return { ok: true, value: { rows, truncated: true } };
    },
  };
}
