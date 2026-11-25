import { describe, expect, it, vi } from "vitest";
import { plainPicture } from "./test-card";
import { parametersFor, prepareCrop, tesseractRecogniser } from "./tesseract";
import type { OcrWorker, OcrWorkerFactory } from "./tesseract";
import type { DigitsField, TextField } from "./types";

const PATHS = { workerPath: "/ocr/x/worker.min.js", corePath: "/ocr/x/", langPath: "/ocr/x/" };
const POINTS: DigitsField = { id: "points", kind: "digits", rect: { x: 0, y: 0, w: 1, h: 1 }, allowed: "*" };
const TITLE: TextField = { id: "title", kind: "text", rect: { x: 0, y: 0, w: 1, h: 1 }, allowed: "ABC " };

function mockWorker(texts: string[]) {
  const worker = {
    setParameters: vi.fn<OcrWorker["setParameters"]>(() => Promise.resolve()),
    recognize: vi.fn<OcrWorker["recognize"]>(() => Promise.resolve({ data: { text: texts.shift() ?? "", confidence: 0, blocks: [{ paragraphs: [{ lines: [{ words: [{ symbols: [{ confidence: 90 }, { confidence: 85.2 }] }] }] }] }] } })),
    terminate: vi.fn(() => Promise.resolve()),
  } satisfies OcrWorker;
  return worker;
}

describe("the Tesseract recogniser", () => {
  it("starts nothing until the first read, then reuses one worker with the field's own whitelist", async () => {
    const worker = mockWorker(["035\n", "ABC"]);
    const createWorker = vi.fn<OcrWorkerFactory>(() => Promise.resolve(worker));
    const recogniser = tesseractRecogniser({ paths: PATHS, createWorker, toImage: (raster) => Promise.resolve(raster) });
    expect(createWorker).not.toHaveBeenCalled();

    const crop = plainPicture(230);
    const first = await recogniser.recognise(POINTS, crop);
    expect(first.text).toBe("035");
    expect(first.confidence).toBeCloseTo(0.876, 3);
    await recogniser.recognise(TITLE, crop);

    expect(createWorker).toHaveBeenCalledOnce();
    expect(createWorker.mock.calls[0]?.[0]).toBe(PATHS);
    expect(worker.setParameters.mock.calls.map(([p]) => p.tessedit_char_whitelist)).toEqual(["0123456789*", "ABC "]);
    await recogniser.close();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("reads nothing as empty with no confidence, and tries again after a failed start", async () => {
    const worker = mockWorker(["  "]);
    const createWorker = vi
      .fn()
      .mockRejectedValueOnce(new Error("no files"))
      .mockResolvedValue(worker);
    const recogniser = tesseractRecogniser({ paths: PATHS, createWorker, toImage: (raster) => Promise.resolve(raster) });
    await expect(recogniser.recognise(POINTS, plainPicture(230))).rejects.toThrow("no files");
    expect(await recogniser.recognise(POINTS, plainPicture(230))).toEqual({ text: "", confidence: 0 });
  });
});

describe("preparing a crop", () => {
  it("flips light ink on dark to dark on light, enlarges a short crop and adds a margin", () => {
    // 40 px wide, 20 px tall, dark paper with a light block
    const small = { width: 40, height: 20, data: new Uint8ClampedArray(40 * 20 * 4).fill(20) };
    for (let i = 3; i < small.data.length; i += 4) small.data[i] = 255;
    for (let y = 8; y < 12; y++) for (let x = 18; x < 22; x++) small.data.fill(240, (y * 40 + x) * 4, (y * 40 + x) * 4 + 3);
    const out = prepareCrop(small);
    expect(out.height).toBe(20 * 4 + 24); // enlarged four times, 12 px margin each side
    const at = (x: number, y: number) => out.data[(y * out.width + x) * 4]!;
    expect(at(2, 2)).toBe(255); // margin is paper
    expect(at(12 + 5, 12 + 5)).toBeGreaterThan(220); // the old dark paper is now light
    expect(at(12 + 80, 12 + 40)).toBeLessThan(40); // the old light block is now dark ink
  });

  it("allows any characters when a text field names none", () => {
    expect(parametersFor({ id: "t", kind: "text", rect: { x: 0, y: 0, w: 1, h: 1 } }).tessedit_char_whitelist).toBe("");
  });
});
