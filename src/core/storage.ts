import type { PromptRecord, PromptId, InsertMode } from "./types";

const DB_NAME = "prompt_vault_db";
const DB_VERSION = 1;

type StoreNames = "prompts" | "embeddings" | "usage" | "settings";

export interface EmbeddingRecord {
  id: PromptId;
  dim: number;
  model: string;
  normalized: boolean;
  vector: ArrayBufferLike; // Float32Array stored as ArrayBuffer
}

export interface UsageRecord {
  id?: number; // auto-increment
  promptId: PromptId;
  usedAt: number;
  action: InsertMode;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export interface UsageStats {
  promptId: PromptId;
  count: number;
  lastUsedAt: number;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open or upgrade IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // prompts store
      if (!db.objectStoreNames.contains("prompts")) {
        const promptStore = db.createObjectStore("prompts", { keyPath: "id" });
        promptStore.createIndex("updatedAt", "updatedAt", { unique: false });
        promptStore.createIndex("pinned", "pinned", { unique: false });
        promptStore.createIndex("title", "title", { unique: false });
        promptStore.createIndex("tags", "tags", { unique: false, multiEntry: true });
      }

      // embeddings store
      if (!db.objectStoreNames.contains("embeddings")) {
        db.createObjectStore("embeddings", { keyPath: "id" });
      }

      // usage store
      if (!db.objectStoreNames.contains("usage")) {
        const usageStore = db.createObjectStore("usage", { keyPath: "id", autoIncrement: true });
        usageStore.createIndex("promptId", "promptId", { unique: false });
        usageStore.createIndex("usedAt", "usedAt", { unique: false });
      }

      // settings store
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };
  });
}

/**
 * Generic transaction helper
 */
function withStore<T>(
  storeName: StoreNames,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = callback(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

// ============================================================================
// PROMPTS API
// ============================================================================

export function listPrompts(): Promise<PromptRecord[]> {
  return withStore("prompts", "readonly", (store) => store.getAll());
}

export function getPrompt(id: PromptId): Promise<PromptRecord | undefined> {
  return withStore("prompts", "readonly", (store) => store.get(id));
}

export function upsertPrompt(prompt: PromptRecord): Promise<void> {
  return withStore("prompts", "readwrite", (store) => store.put(prompt)).then(() => undefined);
}

export function deletePrompt(id: PromptId): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["prompts", "embeddings"], "readwrite");

        // Delete from both stores
        tx.objectStore("prompts").delete(id);
        tx.objectStore("embeddings").delete(id);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ============================================================================
// EMBEDDINGS API
// ============================================================================

export function getEmbedding(id: PromptId): Promise<EmbeddingRecord | undefined> {
  return withStore("embeddings", "readonly", (store) => store.get(id));
}

export function getEmbeddings(): Promise<EmbeddingRecord[]> {
  return withStore("embeddings", "readonly", (store) => store.getAll());
}

export function putEmbedding(id: PromptId, vector: Float32Array, model: string): Promise<void> {
  // Normalize vector before storing
  const normalized = normalizeVector(vector);
  const record: EmbeddingRecord = {
    id,
    dim: normalized.length,
    model,
    normalized: true,
    vector: normalized.buffer.slice(0),
  };
  return withStore("embeddings", "readwrite", (store) => store.put(record)).then(() => undefined);
}

export function deleteEmbedding(id: PromptId): Promise<void> {
  return withStore("embeddings", "readwrite", (store) => store.delete(id)).then(() => undefined);
}

/**
 * Normalize vector to unit length for cosine similarity via dot product
 */
function normalizeVector(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm < 1e-10) return vec; // avoid division by zero

  const result = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    result[i] = vec[i] / norm;
  }
  return result;
}

// ============================================================================
// USAGE API
// ============================================================================

export function recordUsage(promptId: PromptId, action: InsertMode): Promise<void> {
  const record: UsageRecord = {
    promptId,
    usedAt: Date.now(),
    action,
  };
  return withStore("usage", "readwrite", (store) => store.add(record)).then(() => undefined);
}

export function getUsageStats(promptId?: PromptId): Promise<UsageStats[]> {
  return openDB().then(
    (db) =>
      new Promise<UsageStats[]>((resolve, reject) => {
        const tx = db.transaction("usage", "readonly");
        const store = tx.objectStore("usage");

        let request: IDBRequest<UsageRecord[]>;
        if (promptId) {
          // Get usage for a specific prompt
          const index = store.index("promptId");
          request = index.getAll(promptId);
        } else {
          // Get all usage records
          request = store.getAll();
        }

        request.onsuccess = () => {
          const records = request.result;
          const statsMap = new Map<PromptId, UsageStats>();

          for (const record of records) {
            const existing = statsMap.get(record.promptId);
            if (existing) {
              existing.count += 1;
              existing.lastUsedAt = Math.max(existing.lastUsedAt, record.usedAt);
            } else {
              statsMap.set(record.promptId, {
                promptId: record.promptId,
                count: 1,
                lastUsedAt: record.usedAt,
              });
            }
          }

          resolve(Array.from(statsMap.values()));
        };

        request.onerror = () => reject(request.error);
      })
  );
}

// ============================================================================
// SETTINGS API
// ============================================================================

export function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  return withStore("settings", "readonly", (store) => store.get(key)).then(
    (record: SettingsRecord | undefined) => (record ? (record.value as T) : undefined)
  );
}

export function setSetting(key: string, value: unknown): Promise<void> {
  const record: SettingsRecord = { key, value };
  return withStore("settings", "readwrite", (store) => store.put(record)).then(() => undefined);
}

export function deleteSetting(key: string): Promise<void> {
  return withStore("settings", "readwrite", (store) => store.delete(key)).then(() => undefined);
}

// ============================================================================
// UTILITY: DOT PRODUCT
// ============================================================================

/**
 * Compute dot product of two normalized vectors (= cosine similarity)
 */
export function dotProduct(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}
