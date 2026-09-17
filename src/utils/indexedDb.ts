import { RecordedLesson } from '../types';

const DB_NAME = 'TeachRecordDB';
const DB_VERSION = 2;
const STORE_NAME = 'lessons';
const RECOVERY_STORE = 'recoveryChunks';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(RECOVERY_STORE)) {
        const recovery = db.createObjectStore(RECOVERY_STORE, { keyPath: ['sessionId', 'index'] });
        recovery.createIndex('sessionId', 'sessionId', { unique: false });
        recovery.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Every exported function below opens its own short-lived connection via
 * openDb() and must close it once its transaction settles. Previously these
 * connections were never closed, which leaks a live IDBDatabase handle per
 * call (harmless for a handful of calls, but it accumulates over a long
 * recording session with many autosave/library operations, and can also
 * block a future version upgrade or indexedDB.deleteDatabase call). This
 * helper runs a transaction and guarantees db.close() runs afterwards,
 * whether the transaction succeeds or fails.
 */
function withTransaction<T>(
  db: IDBDatabase,
  storeNames: string | string[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const tx = db.transaction(storeNames, mode);
  return run(tx).finally(() => {
    try {
      db.close();
    } catch {
      /* already closed */
    }
  });
}

export async function saveRecordedLesson(lesson: RecordedLesson): Promise<void> {
  try {
    const db = await openDb();
    await withTransaction(db, STORE_NAME, 'readwrite', (tx) => {
      return new Promise<void>((resolve, reject) => {
        const store = tx.objectStore(STORE_NAME);
        // We don't store transient blobUrl in IndexedDB; we store the actual Blob
        const itemToSave = {
          ...lesson,
          blobUrl: undefined,
        };
        const req = store.put(itemToSave);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.error('Failed to save to IndexedDB', err);
  }
}

export async function getAllRecordedLessons(): Promise<RecordedLesson[]> {
  try {
    const db = await openDb();
    return await withTransaction(db, STORE_NAME, 'readonly', (tx) => {
      return new Promise<RecordedLesson[]>((resolve, reject) => {
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          try {
            const results = req.result as RecordedLesson[];
            // Sort descending by date
            results.sort((a, b) => b.createdAt - a.createdAt);
            // Create object URLs for each blob
            const hydrated = results.map((item) => {
              if (item.blob) {
                return {
                  ...item,
                  blobUrl: URL.createObjectURL(item.blob),
                };
              }
              return item;
            });
            resolve(hydrated);
          } catch (err) {
            // A failure while hydrating blob URLs should surface as a rejected
            // promise, not hang forever waiting on a resolve() that never runs.
            reject(err);
          }
        };

        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.error('Failed to load recordings from IndexedDB', err);
    return [];
  }
}

export async function deleteRecordedLesson(id: string): Promise<void> {
  try {
    const db = await openDb();
    await withTransaction(db, STORE_NAME, 'readwrite', (tx) => {
      return new Promise<void>((resolve, reject) => {
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.error('Failed to delete recording from IndexedDB', err);
  }
}

export interface RecoveryChunk {
  sessionId: string;
  index: number;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

export async function saveRecoveryChunk(chunk: RecoveryChunk): Promise<void> {
  try {
    const db = await openDb();
    await withTransaction(db, RECOVERY_STORE, 'readwrite', (tx) => {
      return new Promise<void>((resolve, reject) => {
        tx.objectStore(RECOVERY_STORE).put(chunk);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    });
  } catch (err) {
    console.warn('Recovery chunk could not be persisted', err);
  }
}

export async function getRecoverySessions(): Promise<
  Array<{ sessionId: string; mimeType: string; createdAt: number; chunks: number }>
> {
  try {
    const db = await openDb();
    const rows = await withTransaction(db, RECOVERY_STORE, 'readonly', (tx) => {
      return new Promise<RecoveryChunk[]>((resolve, reject) => {
        const req = tx.objectStore(RECOVERY_STORE).getAll();
        req.onsuccess = () => resolve(req.result as RecoveryChunk[]);
        req.onerror = () => reject(req.error);
      });
    });
    const map = new Map<
      string,
      { sessionId: string; mimeType: string; createdAt: number; chunks: number }
    >();
    for (const row of rows) {
      const existing = map.get(row.sessionId);
      if (existing) existing.chunks += 1;
      else
        map.set(row.sessionId, {
          sessionId: row.sessionId,
          mimeType: row.mimeType,
          createdAt: row.createdAt,
          chunks: 1,
        });
    }
    return [...map.values()];
  } catch (err) {
    console.warn('Recovery sessions could not be read', err);
    return [];
  }
}

export async function getRecoveryChunks(sessionId: string): Promise<RecoveryChunk[]> {
  try {
    const db = await openDb();
    return await withTransaction(db, RECOVERY_STORE, 'readonly', (tx) => {
      return new Promise<RecoveryChunk[]>((resolve, reject) => {
        const index = tx.objectStore(RECOVERY_STORE).index('sessionId');
        const req = index.getAll(sessionId);
        req.onsuccess = () =>
          resolve((req.result as RecoveryChunk[]).sort((a, b) => a.index - b.index));
        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.warn('Recovery chunks could not be read', err);
    return [];
  }
}

export async function clearRecoverySession(sessionId: string): Promise<void> {
  try {
    const chunks = await getRecoveryChunks(sessionId);
    if (chunks.length === 0) return;
    const db = await openDb();
    await withTransaction(db, RECOVERY_STORE, 'readwrite', (tx) => {
      return new Promise<void>((resolve, reject) => {
        const store = tx.objectStore(RECOVERY_STORE);
        for (const chunk of chunks) store.delete([chunk.sessionId, chunk.index]);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    });
  } catch (err) {
    console.warn('Recovery session could not be cleared', err);
  }
}
