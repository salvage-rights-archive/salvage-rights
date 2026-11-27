import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

/** The one outside service the app talks to (the Mordel import). Pictures of imported units come from it too. */
const MORDEL = "https://mordel.net";
const MORDEL_PICTURES = `${MORDEL} https://www.mordel.net`;

/**
 * The Content Security Policy of a built page. Static hosting sends no headers of ours, so it travels as a meta tag
 * (which cannot carry frame-ancestors, report-uri or sandbox). Everything is our own files except: styles set on
 * elements (the dolls and sheets size themselves that way), pictures the player loads (data and blob addresses) or
 * that an imported unit shows from mordel.net, and requests to the Mordel API. The card reader, where an edition
 * ships it, compiles WebAssembly.
 */
export function contentSecurityPolicy(options: { ocr: boolean }): string {
  return [
    "default-src 'self'",
    `script-src 'self'${options.ocr ? " 'wasm-unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${MORDEL_PICTURES}`,
    "font-src 'self'",
    `connect-src 'self' ${MORDEL}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** The policy of the 404 page: nothing but its one script, named by its hash. */
export function notFoundPolicy(html: string): string {
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (script === undefined) throw new Error("404.html has no inline script to name in its policy");
  return `default-src 'none'; script-src 'sha256-${createHash("sha256").update(script).digest("base64")}'; base-uri 'none'; form-action 'none'`;
}

const meta = (policy: string) => `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;

/**
 * Puts the policy first in the head of the built index.html, and gives the built 404.html (a public file, copied as it
 * is) its base path and its own policy. Built sites only: the dev server reloads modules in ways the policy forbids.
 */
export function cspPlugin(options: { ocr: boolean; base: string }): Plugin {
  let outDir = "";
  return {
    name: "salvage-rights-csp",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: {
      order: "post",
      handler: (html) => html.replace(/<head>/, `<head>\n    ${meta(contentSecurityPolicy(options))}`),
    },
    closeBundle() {
      const file = join(outDir, "404.html");
      const html = readFileSync(file, "utf8").replaceAll("%BASE_URL%", options.base);
      writeFileSync(file, html.replace(/<head>/, `<head>\n    ${meta(notFoundPolicy(html))}`));
    },
  };
}
