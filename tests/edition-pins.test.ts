import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("the Ten Thousand Fleets edition must stay free of GPL code", () => {
  const edition = JSON.parse(
    readFileSync(resolve(process.cwd(), "editions/edition.ten-thousand-fleets.json"), "utf8"),
  ) as unknown;
  expect(edition).toEqual({
    id: "ten-thousand-fleets",
    families: ["ten-thousand-fleets"],
    allowLicenses: ["Apache-2.0"],
  });
});
