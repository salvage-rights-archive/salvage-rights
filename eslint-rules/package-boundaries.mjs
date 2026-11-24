// Keeps the packages apart. Decides by where an import lands, never by matching path text.
//
//   host, shared  never reach a family; shared never reaches host
//   a family      never reaches another family or host
//   rules/, data/ of a family reach only that family's src/rules and src/data (no react, react-dom, shared)
//   any package   never reaches another package under packages/ by a relative path
//
// Checked: static imports, `export ... from`, `import("literal")` and `require("literal")`.
// Files outside packages/ (tests/, scripts/, config) are not restricted.
import { dirname, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SCOPE = "@salvage-rights/";

function toPosix(path) {
  return path.replaceAll("\\", "/");
}

/** Splits a path under packages/ into { pkg, rest }, or returns null when it is elsewhere. */
function locate(absolutePath) {
  const rel = toPosix(relative(ROOT, absolutePath));
  const match = /^packages\/([^/]+)(?:\/(.*))?$/.exec(rel);
  if (!match) return null;
  return { pkg: match[1], rest: match[2] ?? "" };
}

function inZone(rest) {
  return /^src\/(rules|data)(\/|$)/.test(rest);
}

function stringValue(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0].value.cooked ?? null;
  }
  return null;
}

function isFamily(pkg) {
  return pkg.startsWith("family-");
}

/** Returns a problem description for the import, or null when it is allowed. */
function check(filename, specifier) {
  const self = locate(filename);
  if (!self) return null;
  const zone = isFamily(self.pkg) && inZone(self.rest);

  if (specifier.startsWith(".")) {
    const target = locate(resolve(dirname(filename), specifier));
    // Repo-root files (site.config.json, editions/) are outside packages/ and allowed, except from rules/ and data/.
    if (target && target.pkg !== self.pkg) {
      return `"${specifier}" reaches package "${target.pkg}" by a relative path; a package stays inside itself`;
    }
    if (zone && !(target && inZone(target.rest))) {
      return `"${specifier}" leaves rules/ and data/; they import only each other`;
    }
    return null;
  }

  if (specifier.startsWith(SCOPE)) {
    const pkg = specifier.slice(SCOPE.length).split("/")[0];
    if (isFamily(pkg)) {
      return `"${specifier}" is a family package; families are only loaded through the edition`;
    }
    if (pkg === "host" && self.pkg !== "host") {
      return `"${specifier}" is the host; only the host itself may import it`;
    }
    if (pkg === "shared" && zone) {
      return `"${specifier}" is not allowed in rules/ and data/; they import only each other`;
    }
    return null;
  }

  if (zone && /^react(-dom)?(\/|$)/.test(specifier)) {
    return `"${specifier}" is not allowed in rules/ and data/; they are plain TypeScript`;
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: { forbidden: "Package boundary: {{ problem }}." },
  },
  create(context) {
    const filename = context.filename;

    function report(node, specifier) {
      if (specifier === null) return;
      const problem = check(filename, specifier);
      if (problem) context.report({ node, messageId: "forbidden", data: { problem } });
    }

    return {
      ImportDeclaration: (node) => report(node.source, stringValue(node.source)),
      ExportAllDeclaration: (node) => report(node.source, stringValue(node.source)),
      ExportNamedDeclaration: (node) => {
        if (node.source) report(node.source, stringValue(node.source));
      },
      ImportExpression: (node) => report(node.source, stringValue(node.source)),
      CallExpression: (node) => {
        if (node.callee.type === "Identifier" && node.callee.name === "require" && node.arguments.length > 0) {
          report(node.arguments[0], stringValue(node.arguments[0]));
        }
      },
    };
  },
};
