// Type on the sheet: a rough width for a line, so a long name can be squeezed into its column and a long line wrapped.
export const INK = "#000";
/** The lighter ink for what is empty or only a hint; 5.1 to 1 on white. */
export const FAINT = "#6e6e6e";
/** The smallest type on the sheet, in sheet units: 6.6 pt when the sheet prints at Letter width. */
export const MIN_SIZE = 20;

const widthOf = (text: string, size: number, bold: boolean) => text.length * size * (bold ? 0.6 : 0.55);

/** SVG attributes that squeeze a line into `max` units when it would run longer; none when it fits. */
export function squeeze(text: string, size: number, max: number, bold = false): { textLength?: number; lengthAdjust?: "spacingAndGlyphs" } {
  return widthOf(text, size, bold) > max ? { textLength: max, lengthAdjust: "spacingAndGlyphs" } : {};
}

/** Breaks a line at its spaces into lines of at most `max` units. A word longer than that stands alone. */
export function wrap(text: string, size: number, max: number, bold = false): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && widthOf(next, size, bold) > max) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
