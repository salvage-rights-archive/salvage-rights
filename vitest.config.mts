import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["tests/setup.ts"],
    // UI tests drive whole pages; 5 s is too tight when the machine is busy (see tests/setup.ts).
    testTimeout: 20000,
    include: ["packages/*/{src,vite}/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "tests/live/**"], // the live check runs only by hand: npm run mordel:smoke
  },
});
