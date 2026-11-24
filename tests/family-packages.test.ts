import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateEdition, validateManifest, type FamilyManifest } from "@salvage-rights/shared";
import battletech from "@salvage-rights/family-battletech";
import tenThousandFleets from "@salvage-rights/family-ten-thousand-fleets";
import example from "@salvage-rights/family-example";

const families: Record<string, FamilyManifest> = {
  battletech,
  "ten-thousand-fleets": tenThousandFleets,
  example,
};

interface Edition {
  id: string;
  families: string[];
  allowLicenses: string[];
}

const root = process.cwd();

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

const editionFiles = readdirSync(resolve(root, "editions")).filter((f) => f.endsWith(".json"));

describe("family packages", () => {
  for (const [key, manifest] of Object.entries(families)) {
    it(`${key} has a valid manifest`, () => {
      expect(validateManifest(manifest)).toEqual([]);
    });

    it(`${key} package.json matches its manifest`, () => {
      const pkg = readJson(`packages/family-${key}/package.json`) as {
        salvageRights: { familyId: string; familyName: string; devOnly?: boolean };
        license: string;
      };
      expect(manifest.credits.license.startsWith(pkg.license)).toBe(true);
      expect(pkg.salvageRights).toMatchObject({ familyId: manifest.id, familyName: manifest.name });
      expect(manifest.id).toBe(key);
    });
  }
});

describe("editions", () => {
  it("finds the three edition files", () => {
    expect(editionFiles.sort()).toEqual([
      "edition.dev.json",
      "edition.free.json",
      "edition.ten-thousand-fleets.json",
    ]);
  });

  for (const file of editionFiles) {
    it(`${file} is a valid edition`, () => {
      const edition = readJson(`editions/${file}`) as Edition;
      const manifests = edition.families.map((id) => {
        const manifest = families[id];
        expect(manifest, `family ${id}`).toBeDefined();
        return manifest as FamilyManifest;
      });
      expect(validateEdition(manifests)).toEqual([]);
    });
  }
});
