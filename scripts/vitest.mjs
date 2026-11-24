// Starts Vitest from the real-cased path. On Windows, a working directory with a lowercase drive letter makes Node
// load Vitest as file:///c:/... while the workers load it as file:///C:/..., which gives two Vitest instances.
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const entry = realpathSync.native(resolve(process.cwd(), "node_modules/vitest/vitest.mjs"));
await import(pathToFileURL(entry).href);
