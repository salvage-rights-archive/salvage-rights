import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, FREE, LAZY_PAGE_MS, expect, expectPage, test } from "./fixtures";

// The card reader runs in Chromium here; the worker and offline cache are checked in that browser only.
test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "the card reader is checked in Chromium");
});

const PAGE = `${DEV}/example/scan-test`;

function watchReaderFiles(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.includes("/ocr/")) seen.push(path);
  });
  return seen;
}

async function readTestCard(page: Page) {
  await page.getByRole("button", { name: "Draw a test card" }).click();
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What was read" })).toBeVisible({ timeout: 90_000 });
  const row = (id: string) => page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: id, exact: true }) });
  await expect(row("points")).toContainText("035");
  await expect(row("title")).toContainText("TEST WALKER");
  await expect(row("armor")).toContainText("6");
}

test("nothing of the card reader loads until Read is pressed, then a drawn card is read with no outside request", async ({ page }) => {
  const readerFiles = watchReaderFiles(page);
  const outside: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(DEV) && !request.url().startsWith("data:") && !request.url().startsWith("blob:")) outside.push(request.url());
  });
  await page.goto(PAGE);
  await expectPage(page.getByRole("button", { name: "Keep the card reader on this device" })).toBeEnabled();
  await page.getByRole("button", { name: "Draw a test card" }).click();
  expect(readerFiles).toEqual([]);

  await readTestCard(page);
  expect(readerFiles.some((path) => path.endsWith("worker.min.js"))).toBe(true);
  expect(readerFiles.some((path) => path.endsWith("eng.traineddata.gz"))).toBe(true);
  expect(outside).toEqual([]);
});

test("the reader read page passes the axe scan in both themes", async ({ page }) => {
  await page.goto(PAGE);
  await readTestCard(page);
  for (const theme of ["Dark", "Light"]) {
    await page.goto(`${DEV}/settings`);
    await page.getByRole("radio", { name: theme }).check();
    await page.goto(PAGE);
    await expectPage(page.getByRole("button", { name: "Keep the card reader on this device" })).toBeVisible();
    await page.getByRole("button", { name: "Draw a test card" }).click();
    await page.getByRole("button", { name: "Read", exact: true }).click();
    await expect(page.getByRole("heading", { name: "What was read" })).toBeVisible({ timeout: 90_000 });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme`).toEqual([]);
  }
});

test("a kept card reader works with no connection", async ({ page, context }) => {
  await page.goto(`${DEV}/`);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: LAZY_PAGE_MS }).toBe(true);
  await page.goto(PAGE);
  await page.getByRole("button", { name: "Keep the card reader on this device" }).click();
  await expect(page.getByRole("button", { name: "Card reader kept on this device" })).toBeVisible({ timeout: 90_000 });

  await context.setOffline(true);
  await page.goto(PAGE);
  await expectPage(page.getByText("The card reader works without a connection.")).toBeVisible();
  await readTestCard(page);
  await context.setOffline(false);
});

test("the free edition has no card reader files", async ({ request }) => {
  expect((await request.get(`${FREE}/ocr.json`)).status()).toBe(404);
});
