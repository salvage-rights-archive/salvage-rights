import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, notFoundPolicy } from "./csp-plugin";

describe("content security policy", () => {
  it("allows our own files and mordel.net only, and WebAssembly only where the card reader ships", () => {
    const policy = contentSecurityPolicy({ ocr: false });
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self';");
    expect(policy).toContain("connect-src 'self' https://mordel.net;");
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toMatch(/unsafe-eval|\*/);
    expect(contentSecurityPolicy({ ocr: true })).toContain("script-src 'self' 'wasm-unsafe-eval';");
  });

  it("names the 404 page's one script by its hash", () => {
    const script = "location.replace('/x/');";
    const hash = createHash("sha256").update(script).digest("base64");
    expect(notFoundPolicy(`<head><script>${script}</script></head>`)).toContain(`script-src 'sha256-${hash}'`);
    expect(() => notFoundPolicy("<head></head>")).toThrow();
  });
});
