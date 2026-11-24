import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import packageBoundaries from "./eslint-rules/package-boundaries.mjs";

export default tseslint.config(
  { ignores: ["**/dist/**", "node_modules/**", "test-results/**", "playwright-report/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  // Package boundaries, decided by where an import resolves (see eslint-rules/package-boundaries.mjs).
  // Root tests/ and scripts/ are not covered. The globs name every extension so no file type is skipped.
  {
    files: ["packages/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { local: { rules: { "package-boundaries": packageBoundaries } } },
    rules: { "local/package-boundaries": "error" },
  },
);