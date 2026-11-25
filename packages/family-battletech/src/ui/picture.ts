// The player's own picture of a 'Mech: checked, scaled down and encoded so that it is small enough to keep in the record.
import { MAX_PICTURE_CHARS } from "./storage";

export type PictureResult = { ok: true; dataUrl: string } | { ok: false; message: string };

export const PICTURE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_PICTURE_BYTES = 8 * 1024 * 1024;
/** The longest side a kept picture has, in pixels. */
export const MAX_PICTURE_SIDE = 800;

const WRONG_TYPE = "That file is not a picture we can use (PNG, JPEG or WebP).";
const TOO_LARGE = "That picture is too large (8 MB at most).";
const UNREADABLE = "That picture could not be read.";

/**
 * Accepts a PNG, JPEG or WebP file of at most 8 MB and returns it as a data address: scaled so the longer side is at
 * most 800 px (never scaled up) and encoded as JPEG on a white background, or kept as PNG when the file is a PNG that
 * needed no scaling. A picture that would still be too long for a record is encoded as JPEG at lower quality.
 */
export async function readPicture(file: File): Promise<PictureResult> {
  if (!PICTURE_TYPES.includes(file.type)) return { ok: false, message: WRONG_TYPE };
  if (file.size > MAX_PICTURE_BYTES) return { ok: false, message: TOO_LARGE };
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, MAX_PICTURE_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return { ok: false, message: UNREADABLE };
      if (file.type === "image/png" && scale === 1) {
        context.drawImage(bitmap, 0, 0);
        const png = canvas.toDataURL("image/png");
        if (png.startsWith("data:image/png;base64,") && png.length <= MAX_PICTURE_CHARS) return { ok: true, dataUrl: png };
      }
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.5]) {
        const jpeg = canvas.toDataURL("image/jpeg", quality);
        if (jpeg.startsWith("data:image/jpeg;base64,") && jpeg.length <= MAX_PICTURE_CHARS) return { ok: true, dataUrl: jpeg };
      }
      return { ok: false, message: UNREADABLE };
    } finally {
      bitmap.close();
    }
  } catch {
    return { ok: false, message: UNREADABLE };
  }
}
