export interface Store {
  readonly namespace: string;
  /** False when IndexedDB is unavailable and memory is used. */
  readonly persistent: boolean;
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

const STORE_NAME = "kv";

function memoryStore(namespace: string): Store {
  const map = new Map<string, unknown>();
  return {
    namespace,
    persistent: false,
    get: <T>(key: string) => Promise.resolve(map.get(key) as T | undefined),
    set: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    delete: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
    keys: () => Promise.resolve([...map.keys()]),
  };
}

/** How long to wait for IndexedDB to open before falling back to memory. */
export const OPEN_TIMEOUT_MS = 3000;

/**
 * Opens the database. A blocked open is not an error: the request can still succeed once the other connection
 * closes, so keep waiting. If the connection arrives after `isAbandoned()` turned true, close it.
 */
function openDatabase(name: string, isAbandoned: () => boolean): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (isAbandoned()) {
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB open failed"));
    };
  });
}

/** Runs one request in a transaction; resolves once the transaction completes. */
function run<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (kv: IDBObjectStore) => IDBRequest,
  pick: (request: IDBRequest) => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let result: T;
    try {
      const tx = db.transaction(STORE_NAME, mode);
      const request = action(tx.objectStore(STORE_NAME));
      request.onsuccess = () => {
        result = pick(request);
      };
      tx.oncomplete = () => {
        resolve(result);
      };
      tx.onerror = () => {
        reject(tx.error ?? request.error ?? new Error("IndexedDB request failed"));
      };
      tx.onabort = () => {
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
      };
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function idbStore(namespace: string, db: IDBDatabase): Store {
  return {
    namespace,
    persistent: true,
    get: <T>(key: string) =>
      run(db, "readonly", (kv) => kv.get(key), (r) => r.result as T | undefined),
    set: (key, value) =>
      run(db, "readwrite", (kv) => kv.put(value, key), () => undefined),
    delete: (key) => run(db, "readwrite", (kv) => kv.delete(key), () => undefined),
    keys: () =>
      run(db, "readonly", (kv) => kv.getAllKeys(), (r) => (r.result as IDBValidKey[]).map(String)),
  };
}

/** Opens the namespace's database, or falls back to memory if IndexedDB cannot be opened. */
export async function openStore(
  namespace: string,
  options: { timeoutMs?: number } = {},
): Promise<Store> {
  let abandoned = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      abandoned = true;
      reject(new Error("IndexedDB open timed out"));
    }, options.timeoutMs ?? OPEN_TIMEOUT_MS);
  });
  try {
    const db = await Promise.race([
      openDatabase(`salvage-rights:${namespace}`, () => abandoned),
      timeout,
    ]);
    return idbStore(namespace, db);
  } catch {
    abandoned = true;
    return memoryStore(namespace);
  } finally {
    clearTimeout(timer);
  }
}
