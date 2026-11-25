import { existsSync, readFileSync } from "node:fs";
import type { Plugin } from "vite";

export interface Edition {
  id: string;
  families: string[];
  /** Licenses allowed for the workspace packages (host, shared, families). */
  allowLicenses: string[];
  /** Licenses allowed for packages from node_modules. */
  allowThirdPartyLicenses: string[];
}

const VIRTUAL_ID = "virtual:families";
const RESOLVED_ID = "\0virtual:families";
const FAMILY_ID_PATTERN = /^[a-z0-9-]+$/;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Reads and checks an edition file. Every error message names the file. */
export function readEdition(editionPath: string): Edition {
  let text: string;
  try {
    text = readFileSync(editionPath, "utf8");
  } catch {
    throw new Error(`Cannot read edition file ${editionPath}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Edition file ${editionPath} is not valid JSON`);
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`Edition file ${editionPath} must contain a JSON object`);
  }
  const rec = data as Record<string, unknown>;
  const id = rec["id"];
  const families = rec["families"];
  const allowLicenses = rec["allowLicenses"];
  const allowThirdPartyLicenses = rec["allowThirdPartyLicenses"];

  if (typeof id !== "string" || !FAMILY_ID_PATTERN.test(id)) {
    throw new Error(`Edition file ${editionPath} needs an "id" of lower case letters, digits and hyphens`);
  }
  if (!isStringArray(families)) {
    throw new Error(`Edition file ${editionPath} needs "families" as an array of strings`);
  }
  const bad = families.find((family) => !FAMILY_ID_PATTERN.test(family));
  if (bad !== undefined) {
    throw new Error(`Edition file ${editionPath} lists family id ${JSON.stringify(bad)}; use only a-z, 0-9 and hyphens`);
  }
  if (!isStringArray(allowLicenses)) {
    throw new Error(`Edition file ${editionPath} needs "allowLicenses" as an array of strings`);
  }
  if (!isStringArray(allowThirdPartyLicenses)) {
    throw new Error(`Edition file ${editionPath} needs "allowThirdPartyLicenses" as an array of strings`);
  }
  return { id, families, allowLicenses, allowThirdPartyLicenses };
}

/** The source of the `virtual:families` module for an edition. */
export function familiesModuleSource(edition: Edition): string {
  const imports = edition.families.map(
    (family, i) => `import family${i} from ${JSON.stringify(`@salvage-rights/family-${family}`)};`,
  );
  const list = edition.families.map((_, i) => `  family${i}`).join(",\n");
  return [
    ...imports,
    "",
    `export const editionId = ${JSON.stringify(edition.id)};`,
    `export const families = [\n${list}\n];`,
    "",
  ].join("\n");
}

export interface PackageInfo {
  name?: unknown;
  license?: unknown;
}

/** Reads one package.json by path; returns undefined when there is none. */
export type ReadPackageJson = (file: string) => PackageInfo | undefined;

/** Finds the nearest package.json with a name at or above the file's folder. */
function owningPackage(file: string, read: ReadPackageJson): { dir: string; info: PackageInfo } | undefined {
  let dir = file.slice(0, Math.max(file.lastIndexOf("/"), 0));
  for (;;) {
    const info = read(`${dir}/package.json`);
    if (info !== undefined && typeof info.name === "string") return { dir, info };
    const cut = dir.lastIndexOf("/");
    if (cut <= 0) return undefined;
    dir = dir.slice(0, cut);
  }
}

/**
 * Checks every module that went into a bundle. Returns one message per problem: a module of a family that is not in
 * the edition, a workspace package whose license the edition does not allow, or a third-party package whose license is
 * not on the edition's list (or is not readable). Virtual modules (ids starting with a NUL character) are skipped.
 */
export function bundleProblems(moduleIds: Iterable<string>, edition: Edition, read: ReadPackageJson): string[] {
  const problems: string[] = [];
  for (const rawId of moduleIds) {
    if (rawId.startsWith("\0")) continue;
    const id = rawId.replace(/[?#].*$/, "").replaceAll("\\", "/");

    const family = /\/packages\/family-([a-z0-9-]+)\//.exec(id)?.[1];
    if (family !== undefined && !edition.families.includes(family)) {
      problems.push(`${id} belongs to family "${family}", which is not part of edition "${edition.id}"`);
    }

    const thirdParty = id.includes("/node_modules/");
    if (!thirdParty && !id.includes("/packages/")) continue;
    const owner = owningPackage(id, read);
    if (owner === undefined) {
      problems.push(`${id} has no package.json with a name, so its license cannot be checked`);
      continue;
    }
    const license = owner.info.license;
    const allowed = thirdParty ? edition.allowThirdPartyLicenses : edition.allowLicenses;
    if (typeof license !== "string" || license === "") {
      problems.push(`${id} is in package "${String(owner.info.name)}", which has no license field`);
    } else if (!allowed.includes(license)) {
      problems.push(
        `${id} is in package "${String(owner.info.name)}" with license "${license}", which edition "${edition.id}" does not allow`,
      );
    }
  }
  return problems;
}

export interface NoticePackage {
  name: string;
  version: string;
  license: string;
  /** The package's own license file, when it ships one. */
  text?: string;
}

/** The name of the notices file in every build. The About page links to it. */
export const NOTICES_FILE = "third-party-notices.txt";

const LICENSE_FILE_NAMES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "license", "license.md"];

/** The third-party packages (from node_modules) that own any of the modules, once each, in name order. */
export function thirdPartyPackages(
  moduleIds: Iterable<string>,
  read: ReadPackageJson,
  readText: (file: string) => string | undefined,
): NoticePackage[] {
  const found = new Map<string, NoticePackage>();
  for (const rawId of moduleIds) {
    const id = rawId.replace(/[?#].*$/, "").replaceAll("\\", "/");
    if (rawId.startsWith("\0") || !id.includes("/node_modules/")) continue;
    const owner = owningPackage(id, read);
    if (owner === undefined || found.has(owner.dir)) continue;
    const info = owner.info as PackageInfo & { version?: unknown };
    let text: string | undefined;
    for (const file of LICENSE_FILE_NAMES) {
      text = readText(`${owner.dir}/${file}`);
      if (text !== undefined) break;
    }
    found.set(owner.dir, {
      name: String(info.name),
      version: typeof info.version === "string" ? info.version : "unknown version",
      license: typeof info.license === "string" ? info.license : "unknown license",
      ...(text === undefined ? {} : { text }),
    });
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The notices file: every third-party package in the build with its license text, then any extra notices. */
export function noticesText(packages: NoticePackage[], extras: string[]): string {
  const rule = "=".repeat(78);
  const parts = [
    "Third-party notices for Salvage Rights",
    "",
    "This build contains the following software and fonts made by others, each under its own license.",
  ];
  for (const item of packages) {
    parts.push("", rule, `${item.name} ${item.version}`, `License: ${item.license}`, rule, "");
    parts.push(item.text?.trim() ?? "This package ships no license file. See its page on npmjs.com.");
  }
  for (const extra of extras) parts.push("", rule, "", extra.trim());
  return `${parts.join("\n")}\n`;
}

function readTextFile(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

/** `noticeFiles` are text files added to the end of the notices file as they are (fonts and pictures). */
export function familiesPlugin(editionPath: string, noticeFiles: string[] = [], extraNotices: string[] = []): Plugin {
  const edition = readEdition(editionPath);
  const cache = new Map<string, PackageInfo | undefined>();
  const read: ReadPackageJson = (file) => {
    if (!cache.has(file)) {
      let info: PackageInfo | undefined;
      try {
        info = JSON.parse(readFileSync(file, "utf8")) as PackageInfo;
      } catch {
        info = undefined;
      }
      cache.set(file, info);
    }
    return cache.get(file);
  };
  return {
    name: "salvage-rights-families",
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      return id === RESOLVED_ID ? familiesModuleSource(edition) : undefined;
    },
    generateBundle() {
      const ids = [...this.getModuleIds()].filter((id) => {
        if (id.startsWith("\0")) return false;
        return existsSync(id.replace(/[?#].*$/, ""));
      });
      const problems = bundleProblems(ids, edition, read);
      if (problems.length > 0) {
        this.error(`Edition "${edition.id}" bundle check failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
      }
      const extras = [...noticeFiles.flatMap((file) => readTextFile(file) ?? []), ...extraNotices];
      this.emitFile({
        type: "asset",
        fileName: NOTICES_FILE,
        source: noticesText(thirdPartyPackages(ids, read, readTextFile), extras),
      });
    },
  };
}
