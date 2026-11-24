import { expect, it } from "vitest";
import { restoredPath } from "./restore-path";

it("returns a saved path under the base and ignores one outside it or none", () => {
  expect(restoredPath("/salvage-rights/about?x=1#top", "/salvage-rights/")).toBe("/salvage-rights/about?x=1#top");
  expect(restoredPath("//elsewhere.example/", "/salvage-rights/")).toBeNull();
  expect(restoredPath(null, "/salvage-rights/")).toBeNull();
});
