import { describe, expect, it } from "vitest";
import { toGray } from "./image";
import { cropRaster, fakeRecogniser, LOW_CONFIDENCE, NO_CARD_MESSAGE, normaliseCard, scanCard, WRONG_SHAPE_MESSAGE } from "./index";
import type { FieldResult, Raster } from "./index";
import { CARD_H, CARD_W, EXAMPLE_LAYOUT, photoOfCard, plainPicture } from "./test-card";

const nobody = fakeRecogniser({});
const DEFAULT_PHOTO = photoOfCard();

async function scan(photo: Raster, recogniser = nobody) {
  const out = await scanCard(photo, EXAMPLE_LAYOUT, { recogniser });
  if (!out.ok) throw new Error(out.message);
  return out;
}

function field(fields: FieldResult[], id: string): FieldResult {
  const found = fields.find((f) => f.id === id);
  if (!found) throw new Error(`no field ${id}`);
  return found;
}

function meanGray(card: Raster, x: number, y: number, w: number, h: number): number {
  const gray = toGray(card);
  let sum = 0;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) sum += gray.data[j * gray.width + i]!;
  return sum / (w * h);
}

describe("card scanning engine", () => {
  it("straightens a card that is turned and leaning, to the layout size and to its own edge", () => {
    const out = normaliseCard(DEFAULT_PHOTO, EXAMPLE_LAYOUT);
    if (!out.ok) throw new Error(out.message);
    expect(out.card.width).toBe(CARD_W);
    expect(out.card.height).toBe(CARD_H);
    // the marker block sits at the top left of the card and is dark; the edge of the card is paper, not table
    expect(meanGray(out.card, 0.06 * CARD_W, 0.06 * CARD_H, 0.04 * CARD_W, 0.06 * CARD_H)).toBeLessThan(60);
    expect(meanGray(out.card, 0.12 * CARD_W, 0.06 * CARD_H, 0.03 * CARD_W, 0.06 * CARD_H)).toBeGreaterThan(220);
    for (const [x, y] of [[8, 8], [CARD_W - 12, 8], [8, CARD_H - 12], [CARD_W - 12, CARD_H - 12]] as const) {
      expect(meanGray(out.card, x, y, 4, 4)).toBeGreaterThan(200);
    }
  });

  it("counts rings from pixels alone, and marks a row with a stray mark as less sure", async () => {
    const { fields } = await scan(DEFAULT_PHOTO);
    const armor = field(fields, "armor");
    expect(armor.value).toBe(7);
    expect(armor.confidence).toBeGreaterThanOrEqual(0.9);
    const structure = field(fields, "structure");
    expect(structure.value).toBe(4);
    expect(structure.confidence).toBeLessThan(armor.confidence);
    expect(structure.note).toMatch(/other mark/);
  });

  it("counts filled discs instead of rings when the layout says so", async () => {
    const layout = { ...EXAMPLE_LAYOUT, fields: [{ id: "structure", kind: "bubbles" as const, shape: "disc" as const, rect: { x: 0.1, y: 0.6, w: 0.8, h: 0.1 } }] };
    const out = await scanCard(DEFAULT_PHOTO, layout, { recogniser: nobody });
    expect(out.ok && out.fields[0]?.value).toBe(1);
  });

  it("reads a pip as filled or empty", async () => {
    const { fields } = await scan(DEFAULT_PHOTO);
    expect(field(fields, "filled").value).toBe(true);
    expect(field(fields, "empty").value).toBe(false);
  });

  it("passes digits and text fields to the recogniser and returns the value, rectangle and crop", async () => {
    const recogniser = fakeRecogniser({
      points: { text: "32", confidence: 0.95 },
      title: { text: "ALPHA-ONE", confidence: 0.9 },
    });
    const { card, fields } = await scan(DEFAULT_PHOTO, recogniser);
    const points = field(fields, "points");
    expect(points).toMatchObject({ value: "32", confidence: 0.95, low: false, rect: EXAMPLE_LAYOUT.fields[0]!.rect });
    expect(points.box).toEqual({ x: 735, y: 37, w: 158, h: 76 });
    expect(cropRaster(card, points.box)).toMatchObject({ width: points.box.w, height: points.box.h });
    expect(field(fields, "title").value).toBe("ALPHA-ONE");
  });

  it("marks a field low when the recogniser is unsure or characters had to be dropped", async () => {
    const recogniser = fakeRecogniser({
      points: { text: "3x2", confidence: 0.9 },
      title: { text: "ALPHA", confidence: LOW_CONFIDENCE - 0.1 },
    });
    const { fields } = await scan(DEFAULT_PHOTO, recogniser);
    const points = field(fields, "points");
    expect(points).toMatchObject({ value: "32", low: true });
    expect(points.note).toMatch(/dropped/);
    expect(field(fields, "title").low).toBe(true);
  });

  it.each([
    ["an empty grey picture", plainPicture(120), NO_CARD_MESSAGE],
    ["a round object", plainPicture(60, 90), NO_CARD_MESSAGE],
    ["a card lying the wrong way", photoOfCard({ cardWidth: 457, cardHeight: 640 }), WRONG_SHAPE_MESSAGE],
  ])("refuses %s with a plain message", async (_name, photo, message) => {
    expect(await scanCard(photo, EXAMPLE_LAYOUT, { recogniser: nobody })).toEqual({ ok: false, message });
  });
});
