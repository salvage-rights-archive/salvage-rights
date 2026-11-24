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
    entries[key] = await store.get(key);
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

/** Imported entries overwrite keys with the same name; other keys are kept. */
export async function importStore(
  store: Store,
  file: unknown,
): Promise<{ imported: number; problems: string[] }> {
  const reject = (problem: string) => ({ imported: 0, problems: [problem] });
  if (!isRecord(file)) return reject("The file is not an object.");
  if (file.app !== "salvage-rights") return reject("The file is not a Salvage Rights export (wrong app).");
  if (file.version !== 1) return reject("The file has an unsupported version.");
  if (file.namespace !== store.namespace) {
    return reject(`The file is for a different namespace (expected "${store.namespace}").`);
  }
  if (!isRecord(file.entries)) return reject("The file has no entries object.");
  let imported = 0;
  for (const [key, value] of Object.entries(file.entries)) {
    await store.set(key, value);
    imported += 1;
  }
  return { imported, problems: [] };
}
