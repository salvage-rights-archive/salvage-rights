# Salvage Rights

Archaeology for mecha tabletop games. We dig up the units, equipment and rules of mecha games, edition by edition, so they are not lost. Then we give you the tools to build with them and play them, on whatever you have in your hand.

## Running it

You need Node.js 26 (22.22 and 24 also work). The repository pins it for Volta in `package.json` and for nvm and
fnm in `.nvmrc`, so a Node version manager picks the right one for you.

```
npm ci
npm run dev
npm run check
```

The type check runs on TypeScript 7 (the `typescript-7` package). TypeScript 6 is also installed, because the lint
tooling does not support version 7 yet; it can go when that changes.

## Tests

`npm run check` runs the type check, lint, the unit tests and the edition checks, and builds both shipped editions
(`free` and `ten-thousand-fleets`). It does not run the browser tests.

- `npm run test:e2e` builds the `dev` and `free` editions, serves each the way GitHub Pages does and runs the
  Playwright specs in `packages/host/e2e/` in Chromium. The first time, run `npx playwright install chromium`.
- `npm run test:e2e:all` also runs Firefox and WebKit. It needs `npx playwright install` first.

On Windows, `npm test` works from any path. Calling `npx vitest` directly, or an editor's Vitest extension, can still
fail with "failed to find the current suite" when the folder was opened with a lowercase drive letter (`c:\...`). The
fix is to open it as `C:\...`.

## Editions

An edition is a list of families built into one site (`editions/edition.<id>.json`), written to `dist/<id>/`.

| Edition | Contains | Used for |
| --- | --- | --- |
| `free` | The BattleTech and Ten Thousand Fleets families; neither has a ready game yet, so the landing page says so | The public site |
| `ten-thousand-fleets` | The Ten Thousand Fleets family only (Apache-2.0 only) | A site that carries no GPL code |
| `dev` | Those two families and the example family, which has two ready games | Development and the browser tests |

Build one with `npm run build:free`, `npm run build:tkf` or `npm run build:dev`.

## Packages and licenses

| Package | License |
| --- | --- |
| `packages/shared` | Apache-2.0 |
| `packages/host` | Apache-2.0 |
| `packages/family-ten-thousand-fleets` | Apache-2.0 (its `content/` folder is all rights reserved and is not under the Apache license) |
| `packages/family-example` | Apache-2.0 |
| `packages/family-battletech` | GPL-3.0-or-later |

A build that includes `packages/family-battletech` is distributed as a whole under the GNU General Public License, version 3 or later.

These tools are built with AI assistance.
