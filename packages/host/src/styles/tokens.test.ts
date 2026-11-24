import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const scss = readFileSync(join(import.meta.dirname, "tokens.scss"), "utf8");

function colors(block: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of block.matchAll(/(--sr-[a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    found.set(match[1] ?? "", match[2] ?? "");
  }
  return found;
}

/** The text between the braces that follow `opening`. Blocks in this file are not nested. */
function blockAfter(opening: string): string {
  const start = scss.indexOf(opening);
  if (start < 0) throw new Error(`tokens.scss has no "${opening}"`);
  const open = scss.indexOf("{", start);
  return scss.slice(open + 1, scss.indexOf("\n}", open));
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const value = parseInt(hex.slice(i, i + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const PAIRS: [string, string][] = [
  ["--sr-ink", "--sr-bg"],
  ["--sr-ink", "--sr-surface"],
  ["--sr-ink-muted", "--sr-bg"],
  ["--sr-ink-muted", "--sr-surface"],
  ["--sr-accent", "--sr-bg"],
  ["--sr-accent", "--sr-surface"],
  ["--sr-on-accent", "--sr-accent-bg"],
  ["--sr-header-ink", "--sr-header-bg"],
  ["--sr-header-link", "--sr-header-bg"],
  ["--sr-header-focus", "--sr-header-bg"],
];

describe("token contrast", () => {
  it.each([
    ["dark", "@mixin sr-dark"],
    ["light", "@mixin sr-light"],
  ])("every listed text pair in the %s theme is at least 4.5:1", (_theme, mixin) => {
    const tokens = new Map([...colors(blockAfter(":root")), ...colors(blockAfter(mixin))]);
    const failing = PAIRS.flatMap(([fg, bg]) => {
      const fgHex = tokens.get(fg);
      const bgHex = tokens.get(bg);
      if (fgHex === undefined || bgHex === undefined) return [`${fg} on ${bg}: missing`];
      const ratio = contrast(fgHex, bgHex);
      return ratio >= 4.5 ? [] : [`${fg} on ${bg}: ${ratio.toFixed(2)}`];
    });
    expect(failing).toEqual([]);
  });
});
