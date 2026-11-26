import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const scss = readFileSync(join(import.meta.dirname, "gothic-theme.scss"), "utf8");
const hostScss = readFileSync(join(import.meta.dirname, "../../../../host/src/styles/tokens.scss"), "utf8");

/** The text between the braces that follow `opening`. Blocks in these files are not nested. */
function blockAfter(source: string, opening: string): string {
  const start = source.indexOf(opening);
  if (start < 0) throw new Error(`no "${opening}"`);
  const open = source.indexOf("{", start);
  return source.slice(open + 1, source.indexOf("\n}", open));
}

function colors(block: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of block.matchAll(/(--(?:sr|bt-gothic)-[a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    found.set(match[1] ?? "", match[2] ?? "");
  }
  return found;
}

const names = (block: string) => [...block.matchAll(/^\s*(--sr-[a-z-]+):/gm)].map((m) => m[1] ?? "");

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

// The shell's own pairs (tokens.test.ts), then the extra surfaces and status colours the Gothic pages put text on.
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
  ["--sr-ink", "--sr-surface-alt"],
  ["--sr-ink-muted", "--sr-surface-alt"],
  ["--sr-accent", "--sr-surface-alt"],
  ["--sr-on-secondary", "--sr-secondary-bg"],
  ["--sr-field-ink", "--sr-field-bg"],
  ["--sr-danger", "--sr-surface-alt"],
  ["--sr-ok", "--sr-surface-alt"],
  ["--sr-info", "--sr-surface-alt"],
  ["--sr-patina", "--sr-surface-alt"],
  ["--sr-hazard", "--sr-surface-alt"],
  ["--sr-focus", "--sr-bg"],
];

const MOODS = [
  ["dark", "@mixin sr-dark", "@mixin bt-gothic-dark"],
  ["light", "@mixin sr-light", "@mixin bt-gothic-light"],
] as const;

describe("Gothic theme", () => {
  it.each(MOODS)("every listed text pair in the %s mood is at least 4.5:1", (_mood, _host, mixin) => {
    const tokens = new Map([...colors(blockAfter(hostScss, ":root")), ...colors(blockAfter(scss, mixin))]);
    const failing = PAIRS.flatMap(([fg, bg]) => {
      const fgHex = tokens.get(fg);
      const bgHex = tokens.get(bg);
      if (fgHex === undefined || bgHex === undefined) return [`${fg} on ${bg}: missing`];
      const ratio = contrast(fgHex, bgHex);
      return ratio >= 4.5 ? [] : [`${fg} on ${bg}: ${ratio.toFixed(2)}`];
    });
    expect(failing).toEqual([]);
  });

  it.each(MOODS)("the %s mood sets every token the shell's matching theme sets, and the glow and ornament colours", (_mood, hostMixin, mixin) => {
    const ours = names(blockAfter(scss, mixin));
    expect(names(blockAfter(hostScss, hostMixin)).filter((name) => !ours.includes(name))).toEqual([]);
    const own = colors(blockAfter(scss, mixin));
    expect([own.has("--bt-gothic-glow"), own.has("--bt-gothic-ornament")]).toEqual([true, true]);
  });

  it("the Settings classes out-rank the device setting, and print resets the ground", () => {
    expect(scss).toContain("body.bt-gothic.dark {");
    expect(scss).toContain("body.bt-gothic.light {");
    expect(scss).toContain("body.bt-gothic:not(.dark)");
    expect(blockAfter(scss, "@media print")).toMatch(/background:\s*#fff/);
  });
});
