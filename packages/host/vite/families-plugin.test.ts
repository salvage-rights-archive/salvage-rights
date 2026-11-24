import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bundleProblems, familiesModuleSource, familiesPlugin, readEdition } from "./families-plugin";
import type { Edition } from "./families-plugin";

function editionFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "edition-"));
  const file = join(dir, "edition.test.json");
  writeFileSync(file, content);
  return file;
}

describe("familiesModuleSource", () => {
  it("imports each family in order and exports the edition id", () => {
    const source = familiesModuleSource({
      id: "demo",
      families: ["a", "b"],
      allowLicenses: [],
      allowThirdPartyLicenses: [],
    });
    const a = source.indexOf('"@salvage-rights/family-a"');
    const b = source.indexOf('"@salvage-rights/family-b"');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(source).toContain('export const editionId = "demo";');
    expect(source).toMatch(/export const families = \[\s*family0,\s*family1\s*\];/);
  });
});

describe("readEdition", () => {
  it("reads a valid edition", () => {
    const file = editionFile('{"id":"x","families":["a-1"],"allowLicenses":["MIT"],"allowThirdPartyLicenses":["ISC"]}');
    expect(readEdition(file)).toEqual({
      id: "x",
      families: ["a-1"],
      allowLicenses: ["MIT"],
      allowThirdPartyLicenses: ["ISC"],
    });
  });

  it("names the file when it is missing", () => {
    const missing = join(tmpdir(), "no-such-edition-file.json");
    expect(() => readEdition(missing)).toThrow(missing);
  });

  it("names the file when it is not JSON", () => {
    const file = editionFile("not json");
    expect(() => readEdition(file)).toThrow(file);
  });

  it("names the file when a family id has bad characters", () => {
    const file = editionFile('{"id":"x","families":["Bad/Id"],"allowLicenses":[],"allowThirdPartyLicenses":[]}');
    expect(() => readEdition(file)).toThrow(file);
  });
});

describe("bundleProblems", () => {
  const edition: Edition = {
    id: "demo",
    families: ["kept"],
    allowLicenses: ["Apache-2.0"],
    allowThirdPartyLicenses: ["MIT"],
  };
  const packages: Record<string, { name?: string; license?: string }> = {
    "/repo/packages/host/package.json": { name: "@x/host", license: "Apache-2.0" },
    "/repo/packages/family-kept/package.json": { name: "@x/family-kept", license: "Apache-2.0" },
    "/repo/packages/family-other/package.json": { name: "@x/family-other", license: "GPL-3.0-or-later" },
    "/repo/packages/gpl-lib/package.json": { name: "@x/gpl-lib", license: "GPL-3.0-or-later" },
    "/repo/node_modules/fine/package.json": { name: "fine", license: "MIT" },
    "/repo/node_modules/fine/dist/package.json": { type: "module" } as { name?: string },
    "/repo/node_modules/copyleft/package.json": { name: "copyleft", license: "GPL-2.0" },
    "/repo/node_modules/unlabeled/package.json": { name: "unlabeled" },
  };
  const read = (file: string) => packages[file];

  it("accepts modules of allowed packages, skipping virtual ids and query suffixes", () => {
    const ids = [
      "\0virtual:families",
      "\\repo\\packages\\host\\src\\main.tsx",
      "/repo/packages/family-kept/src/index.ts?url",
      "/repo/node_modules/fine/dist/index.js",
    ];
    expect(bundleProblems(ids, edition, read)).toEqual([]);
  });

  it("names a module from a family outside the edition", () => {
    const id = "/repo/packages/family-other/src/index.ts";
    const problems = bundleProblems([id], edition, read);
    expect(problems.some((p) => p.includes(id) && p.includes("family-other"))).toBe(true);
  });

  it("names a workspace package whose license the edition does not allow", () => {
    const id = "/repo/packages/gpl-lib/src/a.ts";
    const problems = bundleProblems([id], edition, read);
    expect(problems.some((p) => p.includes(id) && p.includes("GPL-3.0-or-later"))).toBe(true);
  });

  it("names a third-party package whose license is not allowed or not readable", () => {
    const bad = "/repo/node_modules/copyleft/index.js";
    const none = "/repo/node_modules/unlabeled/index.js";
    const problems = bundleProblems([bad, none], edition, read);
    expect(problems.some((p) => p.includes(bad) && p.includes("GPL-2.0"))).toBe(true);
    expect(problems.some((p) => p.includes(none) && p.includes("no license"))).toBe(true);
  });
});

describe("familiesPlugin", () => {
  it("resolves and loads virtual:families", () => {
    const plugin = familiesPlugin(editionFile('{"id":"x","families":["a"],"allowLicenses":[],"allowThirdPartyLicenses":[]}'));
    const resolve = plugin.resolveId as (id: string) => string | undefined;
    const load = plugin.load as (id: string) => string | undefined;
    const resolved = resolve("virtual:families");
    expect(resolved).toBeDefined();
    expect(load(resolved ?? "")).toContain("@salvage-rights/family-a");
    expect(resolve("other")).toBeUndefined();
  });
});
