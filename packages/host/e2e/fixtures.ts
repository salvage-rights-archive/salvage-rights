import { test as base, expect } from "@playwright/test";
import type { Locator, Page, Route } from "@playwright/test";

import { BASE_PATH, DEV_ORIGIN, FREE_ORIGIN } from "./urls";

export const DEV = `${DEV_ORIGIN}${BASE_PATH}`;
export const FREE = `${FREE_ORIGIN}${BASE_PATH}`;

/** Every test fails on a console error or an uncaught page error. */
export const test = base.extend<{ problems: void; mordel: void }>({
  /** Installs the mordel.net routes below; any request they do not expect fails the test. */
  mordel: [
    async ({ page }, use) => {
      const unexpected = await routeMordel(page);
      await use();
      expect(unexpected).toEqual([]);
    },
    { auto: true },
  ],
  problems: [
    async ({ page }, use) => {
      const found: string[] = [];
      // GitHub Pages answers a deep link with 404.html and status 404, and the browser logs that document
      // response as a console error. It is the intended route into the app, so that one message is expected.
      const notFoundPages = new Set<string>();
      page.on("response", (response) => {
        if (response.status() === 404 && response.request().isNavigationRequest()) notFoundPages.add(response.url());
      });
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const address = message.location().url.split("#")[0] ?? "";
        // Only the console error that names the document answered 404; the wording differs by browser.
        if (notFoundPages.has(address)) return;
        found.push(`console error: ${message.text()}`);
      });
      page.on("pageerror", (error) => {
        found.push(`page error: ${error.message}`);
      });
      await use();
      expect(found).toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Moves focus to the next control the way a keyboard does. WebKit's Tab skips links unless the user turns on a
 * browser setting that a test cannot reach, so there the expected control is focused by script instead (the
 * page was never clicked, so :focus-visible still applies). Other browsers press Tab `presses` times.
 */
export async function tabTo(page: Page, browserName: string, expected: Locator, presses = 1): Promise<void> {
  if (browserName === "webkit") {
    await expected.focus();
    return;
  }
  for (let i = 0; i < presses; i += 1) await page.keyboard.press("Tab");
}

// ---------------------------------------------------------------------------------------------------------------
// mordel.net is never called. A test that needs the import flow takes the `mordel` fixture, which answers the three
// requests the flow makes from the made-up unit below and fails the test on any other request to either host.
// ---------------------------------------------------------------------------------------------------------------

/** A made-up key; it is not a real one. Tests look for it in the page, the address and exported files. */
export const FAKE_KEY = "made-up-key-0123456789abcdef";
export const UNIT_ID = 424242;
export const MECH_NAME = "Test Walker TW-1";
export const CLASSIC = "/battletech/classic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "x-api-key, accept, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};

const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const item = (id: number, name: string, location: string, slots: number) => ({
  id,
  name,
  location,
  technology: "Inner Sphere",
  slots,
  associated_id: null,
});
const armor = (code: string, front: number, rear: number | null) => ({ code, armor: front, rear_armor: rear, structure: 1 });

/** A small legal biped in the shape of Mordel's detail response. Not a real design. */
const UNIT_BODY = {
  status: "OK",
  unit: {
    unit_type_short: "bm",
    id: UNIT_ID,
    name_parts: { name: "Test Walker", alternate_name: null, model: "TW-1" },
    designer: "Test Designer",
    tech_base: "Inner Sphere",
    mixed_tech: false,
    era: "Succession Wars",
    year: 3025,
    rules_level: "Introductory",
    tons: 50,
    battle_value: 1000,
    cost: 2000000,
    configuration: "Biped",
    image_url: "https://mordel.net/images/made-up.png",
    movement: { walk: 4, run: 6, jump: 3 },
    engine: { type: "Fusion", technology: "Inner Sphere", rating: 200, tons: 8.5 },
    heat_sinks: { count: 10, type: "Single" },
    structure: { type: "Standard", technology: "Inner Sphere" },
    armor: { type: "Standard", technology: "Inner Sphere", points: 77, tons: 5 },
    gyro: { type: "Standard" },
    cockpit: { type: "Standard" },
    myomer: { type: "Standard" },
    locations: [
      armor("H", 9, null),
      armor("CT", 14, 4),
      armor("LT", 10, 3),
      armor("RT", 10, 3),
      armor("LA", 8, null),
      armor("RA", 8, null),
      armor("LL", 6, null),
      armor("RL", 5, null),
    ],
    equipment: [
      item(1, "AC/10", "RT", 7),
      item(2, "AC/10 Ammo", "LT", 1),
      item(3, "Medium Laser", "LA", 1),
      item(4, "Medium Laser", "RA", 1),
      item(5, "Jump Jet", "CT", 1),
      item(6, "Jump Jet", "LL", 1),
      item(7, "Jump Jet", "RL", 1),
      item(8, "Heat Sink", "LL", 1),
      item(9, "Heat Sink", "RL", 1),
    ],
    fire_control: { artemis: false, apollo: false, clan_case: false },
    fluff: { overview: "A made-up walker.", capabilities: null, deployment: null, variants: null, notables: null },
  },
};

/** Sets up the mordel.net routes on a page. */
export async function routeMordel(page: Page): Promise<string[]> {
  const unexpected: string[] = [];
  await page.route("https://mordel.net/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(body) });
    const keyed = request.headers()["x-api-key"] === FAKE_KEY;
    if (request.method() === "GET" && keyed && path === "/key") return json({ status: "OK" });
    if (request.method() === "GET" && keyed && path === `/units/bm/${String(UNIT_ID)}`) return json(UNIT_BODY);
    if (request.method() === "GET" && keyed && path === "/units") {
      return json({ status: "OK", count: 0, next_cursor: null, server_time: 0, units: [] });
    }
    unexpected.push(`${request.method()} ${request.url()}`);
    await route.abort();
  });
  const picture = (route: Route) => route.fulfill({ status: 200, contentType: "image/png", headers: CORS, body: PIXEL });
  await page.route("https://www.mordel.net/**", picture);
  await page.route("https://mordel.net/images/**", picture);
  return unexpected;
}

/** From the landing page: opens Classic BattleTech, saves the key, imports the made-up unit and waits for the editor. */
export async function importMech(page: Page, base: string): Promise<void> {
  await page.goto(`${base}/`);
  await page.getByRole("link", { name: /^BattleTech/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classic BattleTech");
  await page.getByRole("link", { name: "Import from Mordel" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Import from Mordel");
  await page.getByLabel("Mordel key").fill(FAKE_KEY);
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByText("A key is saved on this device.")).toBeVisible();
  await page.getByLabel("Unit number or address").fill(String(UNIT_ID));
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(MECH_NAME);
}

export { expect };
