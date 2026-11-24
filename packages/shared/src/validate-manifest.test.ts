import { describe, expect, it } from "vitest";
import type { FamilyManifest } from "./family";
import { validateEdition, validateManifest } from "./validate-manifest";

const load = () => Promise.resolve({ default: () => null });

function fixture(): FamilyManifest {
  return {
    id: "example-family",
    name: "Example Family",
    blurb: "A family for tests.",
    accent: "rust",
    games: [
      {
        id: "game-one",
        shortName: "One",
        fullName: "Game One",
        ready: true,
        routes: [{ path: "play/table", label: "Table", section: "play", load }],
      },
    ],
    unitTypes: [{ id: "unit-one", name: "Unit One", ready: true }],
    eras: [{ id: "era-one", name: "Era One", startYear: 2000, endYear: 2100, subEras: [{ id: "sub-one", name: "Sub" }] }],
    measures: ["meters"],
    routes: [{ path: "workshop/unit", label: "Unit", section: "workshop", load }],
    credits: { owner: "Owner", license: "Apache-2.0", notes: [] },
  };
}

function mutate(change: (m: FamilyManifest) => void): string[] {
  const m = fixture();
  change(m);
  return validateManifest(m);
}

function expectMessage(problems: string[], text: string): void {
  expect(problems.some((p) => p.includes(text))).toBe(true);
}

describe("validateManifest", () => {
  it("accepts a valid manifest", () => {
    expect(validateManifest(fixture())).toEqual([]);
  });

  it("rejects a non-object", () => {
    expect(validateManifest(null)).toEqual(["manifest is not an object"]);
    expect(validateManifest("x")).toEqual(["manifest is not an object"]);
    expect(validateManifest([])).toEqual(["manifest is not an object"]);
  });

  it("rejects bad ids at every level", () => {
    expectMessage(mutate((m) => (m.id = "Bad_Id")), "manifest.id");
    expectMessage(mutate((m) => { m.games[0]!.id = "Bad"; }), "games[0].id");
    expectMessage(mutate((m) => { m.unitTypes[0]!.id = "-x"; }), "unitTypes[0].id");
    expectMessage(mutate((m) => { m.eras[0]!.id = "a--b"; }), "eras[0].id");
    expectMessage(mutate((m) => { m.eras[0]!.subEras![0]!.id = "X"; }), "eras[0].subEras[0].id");
  });

  it("rejects empty text fields", () => {
    expectMessage(mutate((m) => (m.name = "")), "manifest.name");
    expectMessage(mutate((m) => (m.blurb = " ")), "manifest.blurb");
    expectMessage(mutate((m) => { m.games[0]!.shortName = ""; }), "games[0].shortName");
    expectMessage(mutate((m) => { m.games[0]!.fullName = ""; }), "games[0].fullName");
  });

  it("rejects bad accent and measures", () => {
    expectMessage(mutate((m) => ((m as unknown as Record<string, unknown>).accent = "pink")), "accent");
    expectMessage(mutate((m) => ((m as unknown as Record<string, unknown>).measures = ["parsecs"])), "measures[0]");
    expectMessage(mutate((m) => (m.measures = [])), "measures");
  });

  it("rejects duplicates at one level", () => {
    expectMessage(mutate((m) => m.games.push({ ...m.games[0]!, routes: [] })), "duplicate game id");
    expectMessage(mutate((m) => m.unitTypes.push({ ...m.unitTypes[0]! })), "duplicate unit type id");
    expectMessage(mutate((m) => m.eras.push({ id: "era-one", name: "Dup" })), "duplicate era id");
    expectMessage(
      mutate((m) => m.eras[0]!.subEras!.push({ id: "sub-one", name: "Dup" })),
      "duplicate era id",
    );
  });

  it("rejects bad route paths", () => {
    expectMessage(mutate((m) => { m.routes[0]!.path = ""; }), "routes[0].path");
    expectMessage(mutate((m) => { m.routes[0]!.path = "/abs"; }), "routes[0].path");
    expectMessage(mutate((m) => { m.routes[0]!.path = "a/../b"; }), "routes[0].path");
    expectMessage(mutate((m) => { m.games[0]!.routes[0]!.path = ""; }), "games[0].routes[0].path");
  });

  it("rejects route paths that are not plain segments joined by slashes", () => {
    for (const path of ["play?x", "a#b", ".", "a/./b", "a//b", "a/", "Upper"]) {
      expectMessage(mutate((m) => { m.routes[0]!.path = path; }), "routes[0].path");
    }
  });

  it("rejects a family route that starts with a game id", () => {
    expectMessage(mutate((m) => m.routes.push({ ...m.routes[0]!, path: "game-one/extra" })), "routes[1].path");
    expectMessage(mutate((m) => m.routes.push({ ...m.routes[0]!, path: "game-one" })), "game-one");
  });

  it("rejects a ready flag that is not a boolean", () => {
    const loose = (value: unknown) => (m: FamilyManifest) => {
      (m.games[0] as unknown as Record<string, unknown>).ready = value;
    };
    expectMessage(mutate(loose("yes")), "games[0].ready");
    expectMessage(mutate((m) => { (m.unitTypes[0] as unknown as Record<string, unknown>).ready = 1; }), "unitTypes[0].ready");
  });

  it("rejects a ready game with no routes but accepts one that is not ready", () => {
    expectMessage(mutate((m) => { m.games[0]!.routes = []; }), "games[0].routes");
    expect(mutate((m) => { m.games[0]!.routes = []; m.games[0]!.ready = false; })).toEqual([]);
  });

  it("rejects duplicate route paths in one list", () => {
    expectMessage(mutate((m) => m.routes.push({ ...m.routes[0]! })), "duplicate route path");
    expectMessage(mutate((m) => m.games[0]!.routes.push({ ...m.games[0]!.routes[0]! })), "duplicate route path");
  });

  it("rejects incomplete artwork", () => {
    const art = { src: "a.png", alt: "alt", credit: "c", permission: "p" };
    expect(mutate((m) => (m.artwork = art))).toEqual([]);
    expectMessage(mutate((m) => (m.artwork = { ...art, alt: "" })), "artwork.alt");
    expectMessage(mutate((m) => (m.artwork = { ...art, credit: "" })), "artwork.credit");
    expectMessage(mutate((m) => (m.artwork = { ...art, permission: "" })), "artwork.permission");
  });

  it("rejects empty credits", () => {
    expectMessage(mutate((m) => (m.credits.owner = "")), "credits.owner");
    expectMessage(mutate((m) => (m.credits.license = "")), "credits.license");
  });

  it("rejects an era ending before it starts", () => {
    expectMessage(mutate((m) => { m.eras[0]!.endYear = 1999; }), "eras[0].endYear");
    expectMessage(mutate((m) => { m.eras[0]!.subEras![0] = { id: "s", name: "S", startYear: 5, endYear: 1 }; }), "eras[0].subEras[0].endYear");
  });

  it("collects every problem", () => {
    const problems = mutate((m) => {
      m.name = "";
      m.blurb = "";
    });
    expect(problems.length).toBeGreaterThanOrEqual(2);
  });
});

describe("validateEdition", () => {
  it("accepts distinct ids", () => {
    expect(validateEdition([fixture(), { ...fixture(), id: "other" }])).toEqual([]);
  });

  it("names a duplicated family id", () => {
    expectMessage(validateEdition([fixture(), fixture()]), "example-family");
  });
});
