import { test as base, expect } from "@playwright/test";
import type { Locator, Page, Route } from "@playwright/test";

import { BASE_PATH, DEV_ORIGIN, FREE_ORIGIN } from "./urls";

export const DEV = `${DEV_ORIGIN}${BASE_PATH}`;

/**
 * Assertions for a page that loads its code on demand. Opening a family page shows "Loading�" until its chunks arrive, and a page that
 * opens the on-device store needs a moment more; on a machine running many browsers that takes longer than an assertion's 5 seconds, and the
 * wait ended on the "Loading�" page (no heading, no enabled input). This waits for the page itself: it costs nothing when the page is
 * quick, and a page that never arrives still fails, only later. The test's own timeout and the global defaults are unchanged.
 */
export const LAZY_PAGE_MS = 25_000;
export const expectPage = expect.configure({ timeout: LAZY_PAGE_MS });
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

/** A made-up unit with an Alpha Strike block, for the Alpha Strike import. Not a real design. */
export const AS_UNIT_ID = 424243;
const AS_UNIT_BODY = {
  status: "OK",
  unit: {
    unit_type_short: "bm",
    id: AS_UNIT_ID,
    name_parts: { name: "Test Walker", alternate_name: null, model: "TW-1" },
    designer: "Test Designer",
    tech_base: "Inner Sphere",
    mixed_tech: false,
    era: "Clan Invasion",
    year: 3055,
    rules_level: "Standard",
    role: "Brawler",
    point_value: 30,
    alpha_strike: {
      type: "BM",
      size: 2,
      move: '8"/6"j',
      tmm: 2,
      armor: 5,
      structure: 4,
      damage: { short: "3", medium: "2", long: "0*" },
      overheat: 1,
      point_value: 30,
      specials: ["ECM", "IF1"],
    },
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
    if (request.method() === "GET" && keyed && path === `/units/bm/${String(AS_UNIT_ID)}`) return json(AS_UNIT_BODY);
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
  await page.getByRole("link", { name: "Classic, BattleTech" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classic BattleTech");
  await page.getByRole("link", { name: "Import from Mordel" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Import from Mordel");
  await page.getByLabel("Mordel key").fill(FAKE_KEY);
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByText("A key is saved on this device.")).toBeVisible();
  // The page asks mordel.net for the member's designs as it opens; let that finish before going on, so leaving the
  // page never cancels a request in flight (WebKit reports that as a page error).
  await expect(page.getByText("You have no designs on mordel.net yet.")).toBeVisible();
  await page.getByLabel("Unit number or address").fill(String(UNIT_ID));
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(MECH_NAME);
}

/** Saves an Alpha Strike unit by hand with just a name and a PV, and comes back to the Alpha Strike home. */
export async function saveAsUnit(page: Page, base: string, name: string, pv: number): Promise<void> {
  await page.goto(`${base}/battletech/alpha-strike/unit`);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Point Value (PV)").fill(String(pv));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
}

export const ACES = "/battletech/aces";
/** Gothic's pages. */
export const GOTHIC = "/battletech/gothic";

/** Starts from a box 'Mech on the Gothic home (nothing from the sheets but its figures); returns the editor's path with its id. */
export async function startGothicBox(page: Page, base: string, name: string): Promise<string> {
  await page.goto(`${base}${GOTHIC}/home`);
  await page.getByRole("button", { name: `Start from ${name}` }).click();
  await expectPage(page.getByRole("heading", { level: 1 })).toHaveText(name);
  const editor = new URL(page.url());
  return `${editor.pathname.replace(/^\/salvage-rights/, "")}${editor.search}`;
}

/**
 * Builds a Gothic force on the Gothic pages: two box 'Mechs (the 30-ton UM-R60B leads, then the 45-ton PXH-1T with a Handler) and three
 * Gnat units, two of them on that Handler. Leaves the page on the saved force and returns its path with the id.
 */
export async function buildGothicForce(page: Page, base: string): Promise<string> {
  await startGothicBox(page, base, "UrbanMech UM-R60B");
  await startGothicBox(page, base, "Phoenix Hawk PXH-1T");
  await page.goto(`${base}${GOTHIC}/abominations`);
  await expectPage(page.getByLabel("Import a file")).toBeEnabled();
  for (const label of ["Gnat One", "Gnat Two", "Gnat Three"]) {
    await page.getByRole("button", { name: "Add Gnat" }).click();
    await page.getByLabel("Label").fill(label);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expectPage(page.getByText(`${label} (Gnat) saved.`)).toBeVisible();
  }
  await page.goto(`${base}${GOTHIC}/home`);
  await page.getByRole("link", { name: "Forces" }).click();
  await expectPage(page.getByRole("heading", { level: 1 })).toHaveText("Gothic forces");
  await page.getByRole("button", { name: "Start a new force" }).click();
  await page.getByLabel("Force name").fill("Test Lance");
  await page.getByLabel("Add a 'Mech").selectOption({ label: "UrbanMech UM-R60B, 30 tons" });
  await page.getByRole("button", { name: "Add 'Mech" }).click();
  await page.getByLabel("Add a 'Mech").selectOption({ label: "Phoenix Hawk PXH-1T, 45 tons" });
  await page.getByRole("button", { name: "Add 'Mech" }).click();
  await page.getByLabel(/^Pilot name for Phoenix Hawk PXH-1T/).fill("Ann");
  await page.getByLabel(/^Handler aboard Phoenix Hawk PXH-1T/).check();
  for (const label of ["Gnat One", "Gnat Two", "Gnat Three"]) {
    await page.getByLabel("Add a unit").selectOption({ label: `${label} (Gnat)` });
    await page.getByRole("button", { name: "Add unit" }).click();
  }
  for (const label of ["Gnat One", "Gnat Two"]) {
    await page.getByLabel(`Handler for ${label} (Gnat)`).selectOption({ index: 1 });
    await page.getByLabel(`Handler bonus for ${label} (Gnat)`).check();
  }
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expectPage(page.getByText("Saved.")).toBeVisible();
  const saved = new URL(page.url());
  return `${saved.pathname.replace(/^\/salvage-rights/, "")}${saved.search}`;
}

/** Opens a picker by its button, searches it and picks the entry whose name is given. */
export async function pickToken(page: Page, opener: string, search: string, entry: string): Promise<void> {
  await page.getByRole("button", { name: opener, exact: true }).click();
  await page.getByLabel("Search the list").fill(search);
  await page.getByRole("button", { name: entry, exact: true }).click();
}

/**
 * Saves an invented Aces card (nothing from a printed card): a Brawler, card 3 of 6, with a condition and a filter in its
 * Aggressive column, a combat rule and one overheat row. Returns the editor's path (with its id) for a later visit.
 */
export async function saveAcesCard(page: Page, base: string): Promise<string> {
  await page.goto(`${base}${ACES}/card`);
  await page.getByLabel("Role", { exact: true }).selectOption("Brawler");
  await page.getByLabel(/^Card number in the deck/).selectOption("3");
  await page.getByRole("button", { name: "2. Movement side" }).click();
  await page.getByLabel("Movement priority").fill("47");
  await page.getByRole("button", { name: "Record the three columns" }).click();
  await pickToken(page, "Add a test to: When the Aggressive column applies", "has moved", "the ideal … has moved");
  await pickToken(page, "Add a filter to the Aggressive column", "keep", "keep … from …");
  await page.getByRole("button", { name: "3. Combat side" }).click();
  await page.getByLabel("Combat priority").fill("112");
  await page.getByRole("button", { name: "Record the combat rules" }).click();
  await pickToken(page, "Add a way to choose", "no armor", "no Armor left");
  await page.getByRole("button", { name: "Add an overheat row" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expectPage(page.getByText("Saved.")).toBeVisible();
  await page.waitForURL(/[?]id=/);
  const saved = new URL(page.url());
  return `${saved.pathname.replace(/^\/salvage-rights/, "")}${saved.search}`;
}

/**
 * Saves an invented command card A (nothing from a printed card): an Initiative order, a key on the RED list, support spending, a
 * strategy row. Returns the editor path for a later visit.
 */
export async function saveAcesCommand(page: Page, base: string): Promise<string> {
  await page.goto(`${base}${ACES}/command`);
  await page.getByLabel("Commander").fill("Invented Marshal");
  await page.getByLabel("Faction").fill("Invented House");
  await page.getByRole("button", { name: "2. Orders" }).click();
  await pickToken(page, "Add an order", "initiative", "Initiative roll …");
  await page.getByRole("button", { name: "3. Colour lists" }).click();
  await pickToken(page, "Add a key to the RED list", "no armor", "no Armor left");
  await page.getByRole("button", { name: "4. Support side" }).click();
  await page.getByLabel("Support cards are").selectOption("spend-always");
  await page.getByRole("button", { name: "5. Strategy rows" }).click();
  await page.getByRole("button", { name: "Add a strategy row" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expectPage(page.getByText("Saved.")).toBeVisible();
  await page.waitForURL(/[?]id=/);
  const saved = new URL(page.url());
  return `${saved.pathname.replace(/^\/salvage-rights/, "")}${saved.search}`;
}

const inventedUnit = (id: string, chassis: string) => ({
  schema: 1,
  kind: "as-unit",
  id,
  editionId: "asce",
  name: { chassis, model: "" },
  card: { type: "BM", size: 2, tmm: 2, move: [{ inches: 6, mode: "" }], role: "Brawler", pv: 20, damage: { s: { value: 3 }, m: { value: 3 }, l: { value: 1 } }, ov: 1, armor: 4, structure: 4, specials: [] },
  skill: 4,
  source: { kind: "manual" },
});

/** Writes records into the family store the way the pages do: the key, then the saved record. */
async function putRecords(page: Page, records: [string, unknown][]): Promise<void> {
  await page.goto(`${DEV}${ACES}/home`);
  await page.evaluate(async (list) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("salvage-rights:battletech", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("kv");
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error("open failed"));
      };
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      for (const [key, value] of list) tx.objectStore("kv").put({ ...(value as object), savedAt: new Date().toISOString() }, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        reject(new Error("write failed"));
      };
    });
  }, records);
}

/** Saves invented Alpha Strike units with real figures (Armor 4, Structure 4, damage 3, 3, 1, OV 1) so an attack has something to do. */
export async function putAsUnits(page: Page, names: string[]): Promise<void> {
  await putRecords(page, names.map((name) => [`as-unit:${name.toLowerCase().replace(/ /g, "-")}`, { unit: inventedUnit(name.toLowerCase().replace(/ /g, "-"), name) }]));
}

/**
 * Answers an Aces game's resolver questions until the given text shows: every distance as 10 inches, yes and no as No, a pick of
 * units as none. For the invented games of the tests only.
 */
export async function answerQuestions(page: Page, done: RegExp | string): Promise<void> {
  const target = page.getByText(done).first();
  const distances = page.getByLabel(/^Distance to .*, in inches$/);
  for (let i = 0; i < 14; i += 1) {
    if (await target.isVisible()) return;
    if (await distances.first().isVisible()) {
      for (const input of await distances.all()) await input.fill("10");
      await page.getByRole("button", { name: "Done with distances" }).click();
      continue;
    }
    const no = page.getByRole("button", { name: "No", exact: true });
    if (await no.isVisible()) {
      await no.click();
      continue;
    }
    const none = page.getByRole("button", { name: /^(None of them|Done)$/ });
    if (await none.isVisible()) {
      // A sight question has every enemy in sight; any other pick of units is none.
      if (await page.getByText(/in line of sight|can it see|see /i).first().isVisible()) for (const box of await page.getByRole("region", { name: "Question" }).getByRole("checkbox").all()) await box.check();
      await none.click();
      continue;
    }
    await page.waitForTimeout(150);
  }
  await expectPage(target).toBeVisible();
}

export { expect };
