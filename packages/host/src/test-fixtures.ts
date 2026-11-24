import type { FamilyManifest, FamilyRoute, GameManifest } from "@salvage-rights/shared";

function Page() {
  return null;
}

export const fixtureRoute: FamilyRoute = {
  path: "play",
  label: "Play",
  section: "play",
  load: () => Promise.resolve({ default: Page }),
};

export function fixtureGame(id: string, shortName: string, overrides: Partial<GameManifest> = {}): GameManifest {
  return { id, shortName, fullName: `${shortName} (full name)`, ready: true, routes: [fixtureRoute], ...overrides };
}

/** A made-up family with generic names, for host tests. */
export function fixtureFamily(id: string, overrides: Partial<FamilyManifest> = {}): FamilyManifest {
  return {
    id,
    name: `Family ${id}`,
    blurb: `Blurb of ${id}.`,
    accent: "rust",
    games: [fixtureGame("main", `Main of ${id}`)],
    unitTypes: [],
    eras: [],
    measures: ["inches"],
    routes: [],
    credits: { owner: "Fixture Owner Ltd", license: "Apache-2.0", notes: [] },
    ...overrides,
  };
}

export const FIXTURE_ARTWORK = {
  src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='2'%3E%3C/svg%3E",
  alt: "A fixture picture",
  credit: "Fixture Artist",
  permission: "Fixture permission",
};
