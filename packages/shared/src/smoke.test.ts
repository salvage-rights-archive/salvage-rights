import { expect, it } from "vitest";
import { SHARED_READY } from "./index";

it("the shared package loads", () => {
  expect(SHARED_READY).toBe(true);
});
