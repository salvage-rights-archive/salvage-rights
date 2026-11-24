// Usage: node packages/host/e2e/serve-pages.mjs <dist folder> <port>
//
// A static server that behaves like GitHub Pages for the base path /salvage-rights/: files come from the dist
// folder, a directory serves its index.html, any unknown path is answered with the dist folder's 404.html and
// status 404, and anything outside the base path is answered 404.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const BASE = "/salvage-rights/";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

const [folder, portText] = process.argv.slice(2);
if (!folder || !portText) {
  console.error("usage: node serve-pages.mjs <dist folder> <port>");
  process.exit(1);
}
const root = resolve(folder);
const port = Number(portText);

/** The file for a request path, or null when it is missing or lies outside the dist folder. */
async function fileFor(pathname) {
  if (!pathname.startsWith(BASE)) return null;
  let relative;
  try {
    relative = decodeURIComponent(pathname.slice(BASE.length));
  } catch {
    return null;
  }
  let target = resolve(root, relative);
  if (target !== root && !target.startsWith(root + sep)) return null;
  try {
    if ((await stat(target)).isDirectory()) target = join(target, "index.html");
    if (!(await stat(target)).isFile()) return null;
    return target;
  } catch {
    return null;
  }
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const file = await fileFor(pathname);
  if (file !== null) {
    try {
      const content = await readFile(file);
      response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      response.end(content);
      return;
    } catch {
      // The file vanished after the check: answer as for any unknown path.
    }
  }
  try {
    const page = await readFile(join(root, "404.html"));
    response.writeHead(404, { "content-type": TYPES[".html"] });
    response.end(page);
  } catch {
    response.writeHead(404, { "content-type": TYPES[".txt"] });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}${BASE}`);
});
