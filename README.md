# Salvage Rights

Archaeology for mecha tabletop games. We dig up the units, equipment and rules of mecha games, edition by edition, so they are not lost. Then we give you the tools to build with them and play them, on whatever you have in your hand.

## Running it

```
npm ci
npm run dev
npm run check
```

## Tests

`npm run check` runs the type check, lint, the unit tests and the edition checks. It does not run the browser tests.

- `npm run test:e2e` builds the `dev` and `free` editions, serves each the way GitHub Pages does and runs the
  Playwright specs in `packages/host/e2e/` in Chromium. The first time, run `npx playwright install chromium`.
- `npm run test:e2e:all` also runs Firefox and WebKit. It needs `npx playwright install` first.

On Windows, run the tests from a path with a capital drive letter (`C:\...`, not `c:\...`). With a lowercase drive
letter Vitest fails with "failed to find the current suite".

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
| `packages/family-ten-thousand-fleets` | Apache-2.0 |
| `packages/family-example` | Apache-2.0 |
| `packages/family-battletech` | GPL-3.0-or-later |

A build that includes `packages/family-battletech` is distributed as a whole under the GNU General Public License, version 3 or later.

These tools are built with AI assistance.
