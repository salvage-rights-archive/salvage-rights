import { describe, expect, it } from "vitest";
import { readPicture } from "./picture";

// Decoding and scaling need a real canvas; the browser test covers them.
describe("readPicture", () => {
  it("refuses a file that is not a PNG, JPEG or WebP picture and one over 8 MB", async () => {
    expect(await readPicture(new File(["not a picture"], "notes.txt", { type: "text/plain" }))).toEqual({
      ok: false,
      message: "That file is not a picture we can use (PNG, JPEG or WebP).",
    });
    expect(await readPicture(new File([new Uint8Array(8 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }))).toEqual({
      ok: false,
      message: "That picture is too large (8 MB at most).",
    });
  });
});
