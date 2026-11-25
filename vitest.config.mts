import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["packages/*/{src,vite}/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "tests/live/**"], // the live check runs only by hand: npm run mordel:smoke
  },
});
