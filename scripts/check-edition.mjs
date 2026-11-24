// Usage: node scripts/check-edition.mjs <edition id> [--require-dist]
//
// Fails (exit 1) when:
//   - the id inside the edition file differs from the id given;
//   - host, shared or a family in the edition has a license the edition does not allow;
//   - package.json dependencies break the boundaries (host or shared naming a family, a family naming another
//     family or the host, shared naming the host);
//   - a family marked salvageRights.devOnly is part of any edition other than dev;
//   - dist/<edition id>/ exists and a file there mentions the name of a family that is not in the edition.
// Without dist/<edition id>/ the built files are not checked, and a line says so. --require-dist makes a missing
// or empty dist/<edition id>/ an error. Family ids are not searched for: a short id such as "example" also
// occurs in library code.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const requireDist = args.includes("--require-dist");
const positional = args.filter((arg) => !arg.startsWith("--"));
const editionId = positional[0];
const USAGE = "usage: node scripts/check-edition.mjs <edition id> [--require-dist]";

function fail(messages) {
  for (const message of messages) console.error(`check-edition: ${message}`);
  process.exit(1);
}

function readJson(file) {
  if (!existsSync(file)) fail([`missing file ${file}`]);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fail([`${file} is not valid JSON`]);
  }
}

if (!editionId || positional.length !== 1 || !/^[a-z0-9-]+$/.test(editionId)) fail([USAGE]);

const editionPath = join(root, "editions", `edition.${editionId}.json`);
const edition = readJson(editionPath);
if (edition.id !== editionId) {
  fail([`${editionPath} has id ${JSON.stringify(edition.id)}, but edition "${editionId}" was asked for`]);
}
if (
  !Array.isArray(edition.families) ||
  !Array.isArray(edition.allowLicenses) ||
  !Array.isArray(edition.allowThirdPartyLicenses)
) {
  fail([`${editionPath} needs "families", "allowLicenses" and "allowThirdPartyLicenses" arrays`]);
}

function readPackage(dir) {
  const file = join(root, "packages", dir, "package.json");
  const pkg = readJson(file);
  return { dir, file, pkg, license: pkg.license };
}

function readFamily(id) {
  const info = readPackage(`family-${id}`);
  const name = info.pkg.salvageRights?.familyName;
  if (typeof name !== "string" || name === "") fail([`${info.file} has no salvageRights.familyName`]);
  return { ...info, id, name };
}

const problems = [];
const included = new Set(edition.families);
const members = edition.families.map(readFamily);
const checked = [readPackage("host"), readPackage("shared"), ...members];

for (const { dir, license } of checked) {
  if (!edition.allowLicenses.includes(license)) {
    problems.push(
      `package "${dir}" has license "${license}", which edition "${editionId}" does not allow (${edition.allowLicenses.join(", ")})`,
    );
  }
}

if (editionId !== "dev") {
  for (const { id, file, pkg } of members) {
    if (pkg.salvageRights?.devOnly === true) {
      problems.push(`family "${id}" is marked devOnly in ${file}; it may only be part of the dev edition`);
    }
  }
}

const DEPENDENCY_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"];
for (const { dir, file, pkg } of checked) {
  const own = dir === "host" || dir === "shared" ? dir : "family";
  for (const field of DEPENDENCY_FIELDS) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      if (!name.startsWith("@salvage-rights/")) continue;
      const target = name.slice("@salvage-rights/".length);
      const toFamily = target.startsWith("family-");
      const bad =
        (own !== "family" && toFamily) || (own === "shared" && target === "host") || (own === "family" && (toFamily || target === "host"));
      if (bad) problems.push(`${file} lists ${name} in ${field}; package "${dir}" must not depend on it`);
    }
  }
}

const excluded = readdirSync(join(root, "packages"))
  .filter((dir) => dir.startsWith("family-"))
  .map((dir) => dir.slice("family-".length))
  .filter((id) => !included.has(id))
  .map(readFamily);

const distDir = join(root, "dist", editionId);
const built = existsSync(distDir)
  ? readdirSync(distDir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
  : [];

if (built.length === 0) {
  if (requireDist) problems.push(`--require-dist: ${distDir} is missing or empty; build the edition first`);
  else console.log(`check-edition: ${distDir} does not exist or is empty; built files were not checked`);
}
for (const entry of built) {
  const file = join(entry.parentPath, entry.name);
  const text = readFileSync(file, "utf8").toLowerCase();
  for (const family of excluded) {
    if (text.includes(family.name.toLowerCase())) {
      problems.push(`${file} mentions "${family.name}", which is not part of edition "${editionId}"`);
    }
  }
}

if (problems.length > 0) fail(problems);
console.log(`check-edition: edition "${editionId}" is clean`);
