import { describe, expect, it } from "vitest";
import type { FamilyManifest, GameManifest } from "./family";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import { listedGames, openableFamilies, shownFamilies, tileLayout } from "./visibility";

function game(id: string, ready: boolean): GameManifest {
  return { id, shortName: id, fullName: id, ready, routes: [] };
}

function family(id: string, games: GameManifest[]): FamilyManifest {
  return {
    id,
    name: id,
    blurb: "",
    accent: "rust",
    games,
    unitTypes: [],
    eras: [],
    measures: [],
    routes: [],
    credits: { owner: "", license: "", notes: [] },
  };
}

function settings(partial: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...partial };
}

const a = family("a", [game("one", true), game("two", false), game("three", true)]);
const b = family("b", [game("only", true)]);
const c = family("c", [game("soon", false)]);

describe("listedGames", () => {
  it("never lists a game that is not ready", () => {
    expect(listedGames(a, DEFAULT_SETTINGS).map((g) => g.id)).toEqual(["one", "three"]);
  });
  it("omits a ready game named in hiddenGames and keeps input order", () => {
    expect(listedGames(a, settings({ hiddenGames: ["a/one"] })).map((g) => g.id)).toEqual(["three"]);
  });
  it("ignores unknown ids and ids of other families", () => {
    expect(listedGames(a, settings({ hiddenGames: ["b/one", "zzz", "a/nope"] })).map((g) => g.id)).toEqual([
      "one",
      "three",
    ]);
  });
});

describe("shownFamilies", () => {
  it("omits a family in hiddenFamilies", () => {
    expect(shownFamilies([a, b], settings({ hiddenFamilies: ["a"] })).map((f) => f.id)).toEqual(["b"]);
  });
  it("omits a family whose ready games are all hidden one by one", () => {
    expect(shownFamilies([a, b], settings({ hiddenGames: ["a/one", "a/three"] })).map((f) => f.id)).toEqual(["b"]);
  });
  it("omits a family with no ready game and keeps input order", () => {
    expect(shownFamilies([b, c, a], DEFAULT_SETTINGS).map((f) => f.id)).toEqual(["b", "a"]);
  });
  it("ignores unknown ids", () => {
    expect(shownFamilies([a, b], settings({ hiddenFamilies: ["x"], hiddenGames: ["x/y"] }))).toEqual([a, b]);
  });
});

describe("openableFamilies", () => {
  it("keeps families with at least one ready game", () => {
    expect(openableFamilies([a, c, b]).map((f) => f.id)).toEqual(["a", "b"]);
  });
});

describe("tileLayout", () => {
  it("is none-ready when no family has a ready game, whatever the settings", () => {
    expect(tileLayout([c], DEFAULT_SETTINGS)).toBe("none-ready");
    expect(tileLayout([], DEFAULT_SETTINGS)).toBe("none-ready");
    expect(tileLayout([c], settings({ hiddenFamilies: ["c"] }))).toBe("none-ready");
  });
  it("is all-hidden when ready games exist but settings hide them all", () => {
    expect(tileLayout([a, b], settings({ hiddenFamilies: ["a", "b"] }))).toBe("all-hidden");
  });
  it("is single for one shown family", () => {
    expect(tileLayout([a, b, c], settings({ hiddenFamilies: ["a"] }))).toBe("single");
  });
  it("is grid for two or more", () => {
    expect(tileLayout([a, b, c], DEFAULT_SETTINGS)).toBe("grid");
  });
  it("ignores unknown ids", () => {
    expect(tileLayout([a], settings({ hiddenFamilies: ["x"] }))).toBe("single");
  });
});
