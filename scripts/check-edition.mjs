// Usage: node scripts/check-edition.mjs <edition id>
//
// Fails (exit 1) when a family in the edition has a license the edition does not allow, and, when
// dist/<edition id>/ exists, when any built file mentions the name of a family that is not in the edition.
// Family ids are not searched for: a short id such as "example" also occurs in library code.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const editionId = process.argv[2];

function fail(messages) {
  for (const message of messages) console.error(`check-edition: ${message}`);
  process.exit(1);
}

if (!editionId || !/^[a-z0-9-]+$/.test(editionId)) {
  fail(["usage: node scripts/check-edition.mjs <edition id>"]);
}

const editionPath = join(root, "editions", `edition.${editionId}.json`);
if (!existsSync(editionPath)) fail([`no edition file ${editionPath}`]);

let edition;
try {
  edition = JSON.parse(readFileSync(editionPath, "utf8"));
} catch {
  fail([`${editionPath} is not valid JSON`]);
}
if (!Array.isArray(edition.families) || !Array.isArray(edition.allowLicenses)) {
  fail([`${editionPath} needs "families" and "allowLicenses" arrays`]);
}

function readFamily(id) {
  const file = join(root, "packages", `family-${id}`, "package.json");
  if (!existsSync(file)) fail([`family "${id}" has no package at ${file}`]);
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  const name = pkg.salvageRights?.familyName;
  if (typeof name !== "string" || name === "") fail([`${file} has no salvageRights.familyName`]);
  return { id, name, license: pkg.license };
}

const problems = [];
const included = new Set(edition.families);

for (const id of edition.families) {
  const family = readFamily(id);
  if (!edition.allowLicenses.includes(family.license)) {
    problems.push(
      `family "${id}" has license "${family.license}", which edition "${editionId}" does not allow (${edition.allowLicenses.join(", ")})`,
    );
  }
}

const packagesDir = join(root, "packages");
const excluded = readdirSync(packagesDir)
  .filter((dir) => dir.startsWith("family-"))
  .map((dir) => dir.slice("family-".length))
  .filter((id) => !included.has(id))
  .map(readFamily);

const distDir = join(root, "dist", editionId);
if (existsSync(distDir)) {
  const files = readdirSync(distDir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile());
  for (const entry of files) {
    const file = join(entry.parentPath, entry.name);
    const text = readFileSync(file, "utf8").toLowerCase();
    for (const family of excluded) {
      if (text.includes(family.name.toLowerCase())) {
        problems.push(`${file} mentions "${family.name}", which is not part of edition "${editionId}"`);
      }
    }
  }
}

if (problems.length > 0) fail(problems);
console.log(`check-edition: edition "${editionId}" is clean`);
