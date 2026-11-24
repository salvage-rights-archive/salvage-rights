import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { RuleTester, type Rule } from "eslint";
import { describe, it } from "vitest";

const modulePath = resolve(process.cwd(), "eslint-rules/package-boundaries.mjs");
const loaded = (await import(pathToFileURL(modulePath).href)) as { default: Rule.RuleModule };

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

const FAMILY = "@salvage-rights/family-battletech";
const SHARED_LEAK = "packages/shared/src/leak";
const ROOT_FAMILY_DIR = "packages/family-example/src";

function at(name: string, path: string, code: string): { name: string; filename: string; code: string } {
  return { name, filename: resolve(process.cwd(), path), code };
}

function bad(name: string, path: string, code: string) {
  return { ...at(name, path, code), errors: [{ messageId: "forbidden" }] };
}

describe("local/package-boundaries", () => {
  tester.run("package-boundaries", loaded.default, {
    invalid: [
      bad("shared importing a family by name", `${SHARED_LEAK}.ts`, `import "${FAMILY}";`),
      bad("a family subpath is also a family", `${SHARED_LEAK}.ts`, `import "${FAMILY}/src/index";`),
      bad("export-from a family", `${SHARED_LEAK}.ts`, `export * from "${FAMILY}";`),
      bad("dynamic import of a family", `${SHARED_LEAK}.ts`, `import("${FAMILY}");`),
      bad("require of a family", `${SHARED_LEAK}.ts`, `require("${FAMILY}");`),
      bad("relative path into a family", `${SHARED_LEAK}.ts`, `import "../../family-battletech/src/index";`),
      bad("relative path through packages/", `${SHARED_LEAK}.ts`, `import "../../../packages/family-battletech/src/index";`),
      bad("relative path with a leading ./..", `${SHARED_LEAK}.ts`, `import "./../../family-battletech/src/index";`),
      bad("relative path that wanders out and back", `${SHARED_LEAK}.ts`, `import "../src/../../family-battletech/src/index";`),
      bad("shared importing the host", `${SHARED_LEAK}.ts`, `import "@salvage-rights/host";`),
      bad("host importing a family", "packages/host/src/leak.ts", `import "${FAMILY}";`),
      bad("a family importing another family", `${ROOT_FAMILY_DIR}/leak.ts`, `import "@salvage-rights/family-ten-thousand-fleets";`),
      bad("a family importing the host", `${ROOT_FAMILY_DIR}/leak.ts`, `import "@salvage-rights/host";`),
      bad("rules/ leaving through ../rules/../", `${ROOT_FAMILY_DIR}/rules/leak.ts`, `import "../rules/../index";`),
      bad("data/ reaching a page", `${ROOT_FAMILY_DIR}/data/leak.ts`, `import "../ExamplePage";`),
      bad("rules/ importing shared", `${ROOT_FAMILY_DIR}/rules/leak.ts`, `import "@salvage-rights/shared";`),
      bad("rules/ importing react", `${ROOT_FAMILY_DIR}/rules/leak.ts`, `import "react";`),
      bad("data/ importing react-dom", `${ROOT_FAMILY_DIR}/data/leak.ts`, `import "react-dom/client";`),
      bad(".mts is covered", "packages/shared/src/leak.mts", `import "${FAMILY}";`),
      bad(".cts is covered", "packages/shared/src/leak.cts", `import "${FAMILY}";`),
      bad(".js is covered", "packages/shared/src/leak.js", `import "${FAMILY}";`),
      bad(".jsx is covered", "packages/shared/src/leak.jsx", `import "${FAMILY}";`),
      bad(".mjs is covered", "packages/shared/src/leak.mjs", `import "${FAMILY}";`),
      bad(".cjs is covered", "packages/shared/src/leak.cjs", `require("${FAMILY}");`),
    ],
    valid: [
      at("rules/ importing data/", `${ROOT_FAMILY_DIR}/rules/x.ts`, `import "../data/table";`),
      at("nested rules/ file importing a sibling", `${ROOT_FAMILY_DIR}/rules/nested/y.ts`, `import "./helper";`),
      at("nested rules/ file importing up within rules/", `${ROOT_FAMILY_DIR}/rules/nested/y.ts`, `import "../x";`),
      at("host importing shared", "packages/host/src/app.ts", `import "@salvage-rights/shared";`),
      at("family index importing shared", `${ROOT_FAMILY_DIR}/index.ts`, `import "@salvage-rights/shared";`),
      at("family files importing each other", `${ROOT_FAMILY_DIR}/index.ts`, `import "./ExamplePage";`),
      at("repo-root files outside packages/", "packages/host/vite/x.ts", `import "../../../site.config.json";`),
      at("root tests/ may import a family", "tests/leak.ts", `import "${FAMILY}";`),
      at("root scripts/ may import a family", "scripts/leak.mjs", `import "${FAMILY}";`),
    ],
  });
});
