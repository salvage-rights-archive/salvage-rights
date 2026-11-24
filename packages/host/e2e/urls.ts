// The one definition of where the two editions are served for the browser tests. The Playwright config starts a
// static server on each origin; the specs open pages under each one's base path.
export const BASE_PATH = "/salvage-rights";
export const DEV_ORIGIN = "http://127.0.0.1:4173";
export const FREE_ORIGIN = "http://127.0.0.1:4174";
