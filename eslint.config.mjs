import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const familyPattern = {
  group: ["@salvage-rights/family-*", "@salvage-rights/family-*/*"],
  message: "Families are only loaded through the edition, never imported directly.",
};
const hostPattern = {
  group: ["@salvage-rights/host", "@salvage-rights/host/*"],
  message: "A family never imports the host.",
};
const relativeIntoPackage = {
  regex: "^(\\.\\./)+(shared|host|family-[^/]+)(/|$)",
  message: "Do not reach into another package by a relative path.",
};

export default tseslint.config(
  { ignores: ["**/dist/**", "node_modules/**", "test-results/**", "playwright-report/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  // Package boundaries. Later blocks replace earlier ones for the same files, so the narrower blocks repeat
  // the patterns of the broader ones. Root `tests/**` is not restricted.
  {
    files: ["packages/host/**/*.{ts,tsx}", "packages/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [familyPattern, relativeIntoPackage] }],
    },
  },
  {
    files: ["packages/family-*/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [familyPattern, hostPattern, relativeIntoPackage] }],
    },
  },
  {
    files: ["packages/family-*/src/rules/**/*.{ts,tsx}", "packages/family-*/src/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "rules/ and data/ are plain TypeScript; no React." },
            { name: "react-dom", message: "rules/ and data/ are plain TypeScript; no React." },
          ],
          patterns: [
            familyPattern,
            hostPattern,
            relativeIntoPackage,
            { group: ["react/*", "react-dom/*"], message: "rules/ and data/ are plain TypeScript; no React." },
            { group: ["@salvage-rights/shared", "@salvage-rights/shared/*"], message: "rules/ and data/ import only each other." },
            {
              // Leaving rules/ or data/ by a relative path. Approximate: it also flags "../x" inside a nested folder.
              regex: "^(\\.\\./)+(?!(rules|data)/)",
              message: "rules/ and data/ import only each other.",
            },
          ],
        },
      ],
    },
  },
);
