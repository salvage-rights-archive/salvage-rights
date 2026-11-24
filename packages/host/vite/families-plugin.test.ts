import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { familiesModuleSource, familiesPlugin, readEdition } from "./families-plugin";

function editionFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "edition-"));
  const file = join(dir, "edition.test.json");
  writeFileSync(file, content);
  return file;
}

describe("familiesModuleSource", () => {
  it("imports each family in order and exports the edition id", () => {
    const source = familiesModuleSource({ id: "demo", families: ["a", "b"], allowLicenses: [] });
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
    const file = editionFile('{"id":"x","families":["a-1"],"allowLicenses":["MIT"]}');
    expect(readEdition(file)).toEqual({ id: "x", families: ["a-1"], allowLicenses: ["MIT"] });
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
    const file = editionFile('{"id":"x","families":["Bad/Id"],"allowLicenses":[]}');
    expect(() => readEdition(file)).toThrow(file);
  });
});

describe("familiesPlugin", () => {
  it("throws naming the file when the edition is unusable", () => {
    const file = editionFile("{");
    expect(() => familiesPlugin(file)).toThrow(file);
  });

  it("resolves and loads virtual:families", () => {
    const plugin = familiesPlugin(editionFile('{"id":"x","families":["a"],"allowLicenses":[]}'));
    const resolve = plugin.resolveId as (id: string) => string | undefined;
    const load = plugin.load as (id: string) => string | undefined;
    const resolved = resolve("virtual:families");
    expect(resolved).toBeDefined();
    expect(load(resolved ?? "")).toContain("@salvage-rights/family-a");
    expect(resolve("other")).toBeUndefined();
  });
});
