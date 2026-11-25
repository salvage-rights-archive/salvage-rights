// Draws a made-up card on a darker table, for the card reader test page. Our own plain boxes and type, no official art.
import type { CardLayout, Raster } from "@salvage-rights/shared";

const CARD_W = 1050;
const CARD_H = 750;

/** The layout of the card `drawTestCard` draws. */
export const TEST_CARD_LAYOUT: CardLayout = {
  id: "test-card",
  width: CARD_W,
  height: CARD_H,
  fields: [
    { id: "points", kind: "digits", rect: { x: 0.7, y: 0.05, w: 0.2, h: 0.12 }, maxLength: 3 },
    { id: "title", kind: "text", rect: { x: 0.05, y: 0.05, w: 0.6, h: 0.12 }, allowed: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -" },
    { id: "damage", kind: "digits", rect: { x: 0.05, y: 0.3, w: 0.4, h: 0.12 }, allowed: "/*" },
    { id: "armor", kind: "bubbles", rect: { x: 0.1, y: 0.8, w: 0.8, h: 0.1 }, max: 10 },
  ],
};

export function drawTestCard(): Raster {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 1100;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot draw a test card.");
  context.fillStyle = "#464646";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((3 * Math.PI) / 180);
  context.translate(-CARD_W / 2, -CARD_H / 2);
  context.fillStyle = "#ececec";
  context.fillRect(0, 0, CARD_W, CARD_H);
  context.fillStyle = "#161616";
  context.textBaseline = "middle";
  context.font = "bold 64px sans-serif";
  const at = (id: string) => {
    const rect = TEST_CARD_LAYOUT.fields.find((field) => field.id === id)!.rect;
    return { x: rect.x * CARD_W, y: (rect.y + rect.h / 2) * CARD_H };
  };
  context.fillText("035", at("points").x + 10, at("points").y);
  context.fillText("TEST WALKER TW-1", at("title").x + 10, at("title").y);
  context.fillText("3/2/0*", at("damage").x + 10, at("damage").y);
  context.lineWidth = 5;
  context.strokeStyle = "#161616";
  for (let i = 0; i < 6; i++) {
    context.beginPath();
    context.arc((0.15 + 0.06 * i) * CARD_W, 0.85 * CARD_H, 22, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width: pixels.width, height: pixels.height, data: pixels.data };
}
