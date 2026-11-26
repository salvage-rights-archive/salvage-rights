import type { Store } from "./store";

export interface ExportFile {
  app: "salvage-rights";
  version: 1;
  namespace: string;
  exportedAt: string;
  entries: Record<string, unknown>;
}

export async function exportStore(store: Store): Promise<ExportFile> {
  const entries: Record<string, unknown> = {};
  for (const key of await store.keys()) {
    const value = await store.get(key);
    // Our own sample cards (a saved card or unit flagged `sample`) are not the player's, so a backup leaves them out.
    const held = isRecord(value) ? (value.record ?? value.unit) : undefined;
    if (isRecord(held) && held.sample === true) continue;
    entries[key] = value;
  }
  return {
    app: "salvage-rights",
    version: 1,
    namespace: store.namespace,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Checks the envelope of an export file for the namespace. Returns its entries, or the problems found. */
export function readExportFile(
  file: unknown,
  namespace: string,
): { entries: Record<string, unknown>; problems: [] } | { entries?: undefined; problems: string[] } {
  const reject = (problem: string) => ({ problems: [problem] });
  if (!isRecord(file)) return reject("The file is not an object.");
  if (file.app !== "salvage-rights") return reject("The file is not a Salvage Rights export (wrong app).");
  if (file.version !== 1) return reject("The file has an unsupported version.");
  if (file.namespace !== namespace) {
    return reject(`The file is for a different namespace (expected "${namespace}").`);
  }
  if (!isRecord(file.entries)) return reject("The file has no entries object.");
  return { entries: file.entries, problems: [] };
}

/** Imported entries overwrite keys with the same name; other keys are kept. */
export async function importStore(
  store: Store,
  file: unknown,
): Promise<{ imported: number; problems: string[] }> {
  const read = readExportFile(file, store.namespace);
  if (!read.entries) return { imported: 0, problems: read.problems };
  let imported = 0;
  for (const [key, value] of Object.entries(read.entries)) {
    await store.set(key, value);
    imported += 1;
  }
  return { imported, problems: [] };
}
