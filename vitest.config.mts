import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["packages/*/{src,vite}/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/live/**"], // the live check runs only by hand: npm run mordel:smoke
  },
});
