import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

export interface Edition {
  id: string;
  families: string[];
  allowLicenses: string[];
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
  return { id, families, allowLicenses };
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

export function familiesPlugin(editionPath: string): Plugin {
  const edition = readEdition(editionPath);
  return {
    name: "salvage-rights-families",
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      return id === RESOLVED_ID ? familiesModuleSource(edition) : undefined;
    },
  };
}
