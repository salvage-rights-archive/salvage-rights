// The live check against mordel.net, run by hand with `npm run mordel:smoke`. The main config does not include it.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/live/**/*.test.ts"],
    testTimeout: 60_000,
    disableConsoleIntercept: true, // the summary lines are the point of the run, so print them as they are
  },
});
