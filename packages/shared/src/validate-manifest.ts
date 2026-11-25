import type { FamilyManifest } from "./family";

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ACCENTS: readonly string[] = ["rust", "patina", "hazard", "info"];
const MEASURES: readonly string[] = ["hexes", "inches", "meters", "kilometers"];
const SECTIONS: readonly string[] = ["workshop", "play", "archive"];

type Rec = Record<string, unknown>;

function isRec(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "";
}

function checkId(rec: Rec, where: string, out: string[]): void {
  const id = rec["id"];
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    out.push(`${where}.id must be lower case letters, digits and hyphens`);
  }
}

function checkText(rec: Rec, key: string, where: string, out: string[]): void {
  if (isBlank(rec[key])) out.push(`${where}.${key} must not be empty`);
}

function checkDuplicates(items: unknown[], where: string, label: string, out: string[], key = "id"): void {
  const seen = new Set<string>();
  for (const item of items) {
    const value = isRec(item) ? item[key] : undefined;
    if (typeof value !== "string") continue;
    if (seen.has(value)) out.push(`${where}: duplicate ${label} "${value}"`);
    seen.add(value);
  }
}

function checkReady(rec: Rec, where: string, out: string[]): void {
  if (typeof rec["ready"] !== "boolean") out.push(`${where}.ready must be true or false`);
}

function checkArtwork(artwork: unknown, where: string, out: string[]): void {
  if (artwork === undefined) return;
  if (!isRec(artwork)) {
    out.push(`${where} is not an object`);
    return;
  }
  for (const key of ["src", "alt", "credit", "permission"]) checkText(artwork, key, where, out);
}

/** `gameIds`, when given, are ids a route's first segment must not equal (it would hide that game's pages). */
function checkRoutes(routes: unknown, where: string, out: string[], gameIds: string[] = []): void {
  if (!Array.isArray(routes)) {
    out.push(`${where} must be an array`);
    return;
  }
  routes.forEach((route, i) => {
    const at = `${where}[${i}]`;
    if (!isRec(route)) {
      out.push(`${at} is not an object`);
      return;
    }
    const path = route["path"];
    if (typeof path !== "string" || !path.split("/").every((segment) => ID_PATTERN.test(segment))) {
      out.push(`${at}.path must be segments of lower case letters, digits and hyphens joined by "/"`);
    } else {
      const first = path.split("/")[0] ?? "";
      if (gameIds.includes(first)) {
        out.push(`${at}.path starts with the game id "${first}", which would hide that game's pages`);
      }
    }
    checkText(route, "label", at, out);
    if (typeof route["section"] !== "string" || !SECTIONS.includes(route["section"])) {
      out.push(`${at}.section must be one of ${SECTIONS.join(", ")}`);
    }
    if (typeof route["load"] !== "function") out.push(`${at}.load must be a function`);
  });
  checkDuplicates(routes, where, "route path", out, "path");
}

function checkEras(eras: unknown, where: string, out: string[]): void {
  if (!Array.isArray(eras)) {
    out.push(`${where} must be an array`);
    return;
  }
  eras.forEach((era, i) => {
    const at = `${where}[${i}]`;
    if (!isRec(era)) {
      out.push(`${at} is not an object`);
      return;
    }
    checkId(era, at, out);
    checkText(era, "name", at, out);
    const { startYear, endYear } = era;
    if (typeof startYear === "number" && typeof endYear === "number" && endYear < startYear) {
      out.push(`${at}.endYear must not be less than startYear`);
    }
    if (era["subEras"] !== undefined) checkEras(era["subEras"], `${at}.subEras`, out);
  });
  checkDuplicates(eras, where, "era id", out);
}

export function validateManifest(manifest: unknown): string[] {
  if (!isRec(manifest)) return ["manifest is not an object"];
  const out: string[] = [];

  checkId(manifest, "manifest", out);
  checkText(manifest, "name", "manifest", out);
  checkText(manifest, "blurb", "manifest", out);

  if (typeof manifest["accent"] !== "string" || !ACCENTS.includes(manifest["accent"])) {
    out.push(`accent must be one of ${ACCENTS.join(", ")}`);
  }

  const measures = manifest["measures"];
  if (!Array.isArray(measures) || measures.length === 0) {
    out.push("measures must be a non-empty array");
  } else {
    measures.forEach((m, i) => {
      if (typeof m !== "string" || !MEASURES.includes(m)) {
        out.push(`measures[${i}] must be one of ${MEASURES.join(", ")}`);
      }
    });
  }

  checkArtwork(manifest["artwork"], "artwork", out);

  const credits = manifest["credits"];
  if (!isRec(credits)) {
    out.push("credits is not an object");
  } else {
    checkText(credits, "owner", "credits", out);
    checkText(credits, "license", "credits", out);
  }

  const games = manifest["games"];
  if (!Array.isArray(games)) {
    out.push("games must be an array");
  } else {
    games.forEach((game, i) => {
      const at = `games[${i}]`;
      if (!isRec(game)) {
        out.push(`${at} is not an object`);
        return;
      }
      checkId(game, at, out);
      checkText(game, "shortName", at, out);
      checkText(game, "fullName", at, out);
      checkRoutes(game["routes"], `${at}.routes`, out);
      checkReady(game, at, out);
      checkArtwork(game["artwork"], `${at}.artwork`, out);
      if (game["icon"] !== undefined) checkText(game, "icon", at, out);
      if (game["ready"] === true && Array.isArray(game["routes"]) && game["routes"].length === 0) {
        out.push(`${at}.routes must have at least one route when the game is ready`);
      }
    });
    checkDuplicates(games, "games", "game id", out);
  }

  const unitTypes = manifest["unitTypes"];
  if (!Array.isArray(unitTypes)) {
    out.push("unitTypes must be an array");
  } else {
    unitTypes.forEach((unit, i) => {
      const at = `unitTypes[${i}]`;
      if (!isRec(unit)) {
        out.push(`${at} is not an object`);
        return;
      }
      checkId(unit, at, out);
      checkText(unit, "name", at, out);
      checkReady(unit, at, out);
    });
    checkDuplicates(unitTypes, "unitTypes", "unit type id", out);
  }

  checkEras(manifest["eras"], "eras", out);
  const gameIds = Array.isArray(games)
    ? games.flatMap((game) => (isRec(game) && typeof game["id"] === "string" ? [game["id"]] : []))
    : [];
  checkRoutes(manifest["routes"], "routes", out, gameIds);

  return out;
}

export function validateEdition(manifests: FamilyManifest[]): string[] {
  const out: string[] = [];
  checkDuplicates(manifests, "edition", "family id", out);
  return out;
}
