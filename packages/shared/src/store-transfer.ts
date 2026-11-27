import type { Store } from "./store";

export interface ExportFile {
  app: "salvage-rights";
  version: 1;
  namespace: string;
  exportedAt: string;
  entries: Record<string, unknown>;
}

/** `omit` names keys that never leave the device (a family's `privateKeys`). */
export async function exportStore(store: Store, omit: readonly string[] = []): Promise<ExportFile> {
  const entries: Record<string, unknown> = {};
  for (const key of await store.keys()) {
    if (omit.includes(key)) continue;
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
  omit: readonly string[] = [],
): Promise<{ imported: number; problems: string[] }> {
  const read = readExportFile(file, store.namespace);
  if (!read.entries) return { imported: 0, problems: read.problems };
  let imported = 0;
  for (const [key, value] of Object.entries(read.entries)) {
    if (omit.includes(key)) continue;
    await store.set(key, value);
    imported += 1;
  }
  return { imported, problems: [] };
}

/** Everything kept on the device, one export per store, in one file. */
export interface BackupFile {
  app: "salvage-rights";
  version: 1;
  kind: "backup";
  exportedAt: string;
  stores: ExportFile[];
}

export interface BackupStore {
  store: Store;
  /** Keys left out of the backup and never written by a restore. */
  omit?: readonly string[];
}

export async function exportBackup(stores: BackupStore[]): Promise<BackupFile> {
  const parts: ExportFile[] = [];
  for (const { store, omit } of stores) parts.push(await exportStore(store, omit));
  return { app: "salvage-rights", version: 1, kind: "backup", exportedAt: new Date().toISOString(), stores: parts };
}

/** The stores of a backup file by namespace and how many items they hold, or the problem with the file. */
export function readBackupFile(file: unknown): { parts: Map<string, unknown>; count: number } | { problem: string } {
  if (!isRecord(file) || file.app !== "salvage-rights" || file.kind !== "backup") return { problem: "That file is not a Salvage Rights backup." };
  if (file.version !== 1 || !Array.isArray(file.stores)) return { problem: "That backup is from a version this app cannot read." };
  const parts = new Map<string, unknown>();
  let count = 0;
  for (const part of file.stores as unknown[]) {
    if (!isRecord(part) || typeof part.namespace !== "string" || !isRecord(part.entries)) return { problem: "That backup is damaged. Nothing was restored." };
    parts.set(part.namespace, part);
    count += Object.keys(part.entries).length;
  }
  return { parts, count };
}

/** Restores every store the backup holds. Items with the same key are replaced; everything else is kept. A part for a store this build lacks is passed over. */
export async function importBackup(stores: BackupStore[], file: unknown): Promise<{ imported: number; problems: string[] }> {
  const read = readBackupFile(file);
  if ("problem" in read) return { imported: 0, problems: [read.problem] };
  let imported = 0;
  const problems: string[] = [];
  for (const { store, omit } of stores) {
    const part = read.parts.get(store.namespace);
    if (part === undefined) continue;
    const result = await importStore(store, part, omit);
    imported += result.imported;
    problems.push(...result.problems);
  }
  return { imported, problems };
}
