import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { RuleTester, type Rule } from "eslint";
import { describe, it } from "vitest";

const modulePath = resolve(process.cwd(), "eslint-rules/package-boundaries.mjs");
const loaded = (await import(pathToFileURL(modulePath).href)) as { default: Rule.RuleModule };
const rule = loaded.default;

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

const EXTENSIONS = ["ts", "mts", "js", "mjs", "cjs", "jsx"];
const FAMILY = "@salvage-rights/family-battletech";

function file(path: string): string {
  return resolve(process.cwd(), path);
}

function forms(specifier: string): string[] {
  return [
    `import "${specifier}";`,
    `export * from "${specifier}";`,
    `export { x } from "${specifier}";`,
    `import("${specifier}");`,
    `require("${specifier}");`,
  ];
}

const invalid: { code: string; filename: string }[] = [];
const valid: { code: string; filename: string }[] = [];

function reject(path: string, specifier: string, extensions = EXTENSIONS): void {
  for (const ext of extensions) {
    for (const code of forms(specifier)) invalid.push({ code, filename: file(`${path}.${ext}`) });
  }
}

function allow(path: string, specifier: string): void {
  for (const code of forms(specifier)) valid.push({ code, filename: file(path) });
}

// Shared and host never reach a family, in every form and every extension.
for (const pkg of ["shared", "host"]) {
  const leak = `packages/${pkg}/src/leak`;
  reject(leak, FAMILY);
  reject(leak, `${FAMILY}/src/index`);
  reject(leak, "../../family-battletech/src/index");
  reject(leak, "./../../family-battletech/src/index");
  reject(leak, "../../../packages/family-battletech/src/index");
  reject(leak, "../src/../../family-battletech/src/index");
}
reject("packages/shared/src/leak", "@salvage-rights/host");
reject("packages/shared/src/leak", "../../host/src/index");

// A family never reaches another family or host.
reject("packages/family-example/src/leak", "@salvage-rights/family-ten-thousand-fleets");
reject("packages/family-example/src/leak", "@salvage-rights/host");
reject("packages/family-example/src/leak", "../../family-battletech/src/index");

// rules/ and data/ stay inside themselves.
reject("packages/family-example/src/rules/leak", "../rules/../index", ["ts"]);
reject("packages/family-example/src/rules/leak", "../index", ["ts"]);
reject("packages/family-example/src/data/leak", "../ExamplePage", ["ts"]);
reject("packages/family-example/src/rules/leak", "@salvage-rights/shared", ["ts"]);
reject("packages/family-example/src/rules/leak", "react", ["ts"]);
reject("packages/family-example/src/data/leak", "react-dom/client", ["ts"]);

// Allowed forms.
allow("packages/family-example/src/rules/x.ts", "../data/table");
allow("packages/family-example/src/rules/nested/y.ts", "./helper");
allow("packages/family-example/src/rules/nested/y.ts", "../x");
allow("packages/family-example/src/rules/x.ts", "./nested/y");
allow("packages/host/src/app.ts", "@salvage-rights/shared");
allow("packages/family-example/src/index.ts", "@salvage-rights/shared");
allow("packages/family-example/src/index.ts", "./ExamplePage");
allow("packages/family-example/src/index.ts", "./rules/x");
allow("packages/family-example/src/ExamplePage.tsx", "react");
allow("packages/shared/src/store.ts", "./family");
allow("tests/leak.ts", FAMILY);
allow("scripts/leak.mjs", FAMILY);

describe("local/package-boundaries", () => {
  tester.run("package-boundaries", rule, {
    valid,
    invalid: invalid.map((c) => ({ ...c, errors: [{ messageId: "forbidden" }] })),
  });
});
