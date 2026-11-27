# Salvage Rights

Battlefield recovery and salvage for mecha tabletop games. We recover and salvage the units, equipment and rules of mecha games, edition by edition, so they are not lost. Then we give you the tools to build with them and play them, on whatever you have in your hand.

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

## The games

Five BattleTech games work today, in the `free` and `dev` editions:

- **Classic BattleTech**: build, check and print 'Mechs (BattleMechs, IndustrialMechs, OmniMechs and the other 'Mech
  layouts), combat and support vehicles, ProtoMechs, battle armor and conventional infantry, with Battle Value and
  C-bill cost. You pick the rules edition, rules level, tech base and year, and each rules finding cites the rulebook
  page it comes from.
- **Alpha Strike**: unit cards, forces and formations, conversion from a Classic design, printing, play aids and a
  table tracker.
- **Aces**: unit and command cards, automated opponents, games at the table and campaigns.
- **AeroTech**: fighters, small craft and large craft in three rules editions, with record sheets.
- **Gothic**: 'Mechs, Abomination units, forces, a tracker for play and a rules reference.

More games are listed on the BattleTech tile as coming soon.

Everything you make is saved on your device (the app works offline once installed) and can be exported to a file and
imported back. You can also import a design from [mordel.net](https://www.mordel.net/) by its number or address,
using your own Mordel key; the key stays on your device and is sent only to mordel.net.

The live check against mordel.net is `npm run mordel:smoke`. It reads a test key from `.env.mordel` in the repository
root (one line, `MORDEL_API_KEY=...`). That file is git-ignored and must never be committed. No other test calls
mordel.net; the browser tests answer its requests with a made-up unit.

Credits: the import uses the mordel.net API built by MordelBlacknight, and each imported design is credited, in the
editor and in saved files, to the mordel.net member who made it.

## Tests

`npm run check` runs the type check, lint, the unit tests and the edition checks, and builds both shipped editions
(`free` and `ten-thousand-fleets`). It does not run the browser tests.

- `npm run test:e2e` builds the `dev` and `free` editions, serves each the way GitHub Pages does and runs the
  Playwright specs in `packages/host/e2e/` in Chromium (the shell, every game's flows, and axe scans in both
  themes). The first time, run `npx playwright install chromium`.
- `npm run test:e2e:all` also runs Firefox and WebKit. It needs `npx playwright install` first.

On Windows, `npm test` works from any path. Calling `npx vitest` directly, or an editor's Vitest extension, can still
fail with "failed to find the current suite" when the folder was opened with a lowercase drive letter (`c:\...`). The
fix is to open it as `C:\...`.

## Editions

An edition is a list of families built into one site (`editions/edition.<id>.json`), written to `dist/<id>/`.

| Edition | Contains | Used for |
| --- | --- | --- |
| `free` | The BattleTech and Ten Thousand Fleets families; Ten Thousand Fleets is not ready yet, so the landing page shows the BattleTech tile | The public site |
| `ten-thousand-fleets` | The Ten Thousand Fleets family only (Apache-2.0 only) | A site that carries no GPL code |
| `dev` | Those two families and the example family, which has two ready games | Development and the browser tests |

Build one with `npm run build:free`, `npm run build:tkf` or `npm run build:dev`.

## Security and privacy

The app is a static site with no server of ours and no accounts. What you make stays in your browser's storage. The
built pages carry a Content Security Policy (`packages/host/vite/csp-plugin.ts`) that allows only the site's own
files, pictures you load yourself, and requests to mordel.net when you ask for an import. To report a security
problem, open an [issue](https://github.com/salvage-rights-archive/salvage-rights/issues) without the details and we
will arrange a private way to send them.

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

## Artwork

Some pictures in the app were generated with an AI image tool, and each one is labelled where it is shown. We would
rather show work made by a person. If you are an artist, or hold the rights to a piece, and can let us use it
legally, we will gladly replace any AI-generated art and credit you. To offer a piece, start a thread in
[Discussions](https://github.com/salvage-rights-archive/salvage-rights/discussions) or open an
[issue](https://github.com/salvage-rights-archive/salvage-rights/issues).
