// The one definition of where the two editions are served for the browser tests. The Playwright config starts a
// static server on each origin; the specs open pages under each one's base path. The config picks two free
// ephemeral ports for each run and passes them on in E2E_DEV_PORT and E2E_FREE_PORT, so runs from different
// worktrees never fight over a port. Without them (for example when a spec is opened on its own) the old defaults apply.
export const BASE_PATH = "/salvage-rights";
export const DEV_ORIGIN = `http://127.0.0.1:${process.env["E2E_DEV_PORT"] ?? "4173"}`;
export const FREE_ORIGIN = `http://127.0.0.1:${process.env["E2E_FREE_PORT"] ?? "4174"}`;
