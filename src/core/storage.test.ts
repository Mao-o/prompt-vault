/**
 * Storage API test suite
 * These tests require a browser environment with IndexedDB support
 */

import {
  listPrompts,
  upsertPrompt,
  deletePrompt,
  getEmbedding,
  putEmbedding,
  getEmbeddings,
  recordUsage,
  getUsageStats,
  getSetting,
  setSetting,
  dotProduct,
  type EmbeddingRecord,
} from "./storage";
import type { PromptRecord } from "./types";

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`Assertion failed: ${msg}\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`);
  }
}

function assertTrue(condition: boolean, msg?: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

export async function runStorageTests() {
  console.log("Running storage tests...");

  // Test dot product
  {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([1, 0, 0]);
    const c = new Float32Array([0, 1, 0]);

    assertEqual(dotProduct(a, b), 1, "Parallel vectors should have dot product 1");
    assertEqual(dotProduct(a, c), 0, "Orthogonal vectors should have dot product 0");
  }

  // Test prompts CRUD
  {
    const testPrompt: PromptRecord = {
      id: "test-prompt-1",
      title: "Test Prompt",
      body: "This is a test prompt",
      tags: ["test", "example"],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Upsert
    await upsertPrompt(testPrompt);
    console.log("✓ Upsert prompt");

    // List
    const prompts = await listPrompts();
    assertTrue(prompts.some((p) => p.id === testPrompt.id), "Prompt should be in list");
    console.log("✓ List prompts");

    // Update
    const updated = { ...testPrompt, body: "Updated body" };
    await upsertPrompt(updated);
    const prompts2 = await listPrompts();
    const found = prompts2.find((p) => p.id === testPrompt.id);
    assertEqual(found?.body, "Updated body", "Prompt body should be updated");
    console.log("✓ Update prompt");

    // Delete
    await deletePrompt(testPrompt.id);
    const prompts3 = await listPrompts();
    assertTrue(!prompts3.some((p) => p.id === testPrompt.id), "Prompt should be deleted");
    console.log("✓ Delete prompt");
  }

  // Test embeddings
  {
    const testId = "test-embedding-1";
    const vector = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const model = "test-model";

    // Put embedding (will be normalized)
    await putEmbedding(testId, vector, model);
    console.log("✓ Put embedding");

    // Get embedding
    const emb = await getEmbedding(testId);
    assertTrue(emb !== undefined, "Embedding should exist");
    assertEqual(emb?.model, model, "Model should match");
    assertTrue(emb?.normalized === true, "Vector should be normalized");

    // Check normalization
    const stored = new Float32Array(emb!.vector);
    let norm = 0;
    for (let i = 0; i < stored.length; i++) {
      norm += stored[i] * stored[i];
    }
    norm = Math.sqrt(norm);
    assertTrue(Math.abs(norm - 1) < 0.001, "Stored vector should have unit norm");
    console.log("✓ Get embedding and verify normalization");

    // Get all embeddings
    const embeddings = await getEmbeddings();
    assertTrue(embeddings.some((e) => e.id === testId), "Embedding should be in list");
    console.log("✓ Get all embeddings");

    // Clean up
    await deletePrompt(testId); // This also deletes the embedding
  }

  // Test usage tracking
  {
    const promptId = "test-usage-1";

    // Record usage
    await recordUsage(promptId, "copy");
    await recordUsage(promptId, "insert");
    await recordUsage(promptId, "copy");
    console.log("✓ Record usage");

    // Get usage stats
    const stats = await getUsageStats(promptId);
    const stat = stats.find((s) => s.promptId === promptId);
    assertTrue(stat !== undefined, "Usage stats should exist");
    assertEqual(stat?.count, 3, "Usage count should be 3");
    assertTrue(stat!.lastUsedAt > 0, "Last used timestamp should be set");
    console.log("✓ Get usage stats");

    // Get all usage stats
    const allStats = await getUsageStats();
    assertTrue(allStats.length > 0, "Should have usage stats");
    console.log("✓ Get all usage stats");
  }

  // Test settings
  {
    const key = "test-setting";
    const value = { foo: "bar", num: 42 };

    // Set setting
    await setSetting(key, value);
    console.log("✓ Set setting");

    // Get setting
    const retrieved = await getSetting(key);
    assertEqual(retrieved, value, "Setting should match");
    console.log("✓ Get setting");

    // Get non-existent setting
    const notFound = await getSetting("non-existent-key");
    assertEqual(notFound, undefined, "Non-existent setting should be undefined");
    console.log("✓ Get non-existent setting");
  }

  console.log("✓ All storage tests passed");
}

// Note: These tests need to be run in a browser environment with IndexedDB
// Example usage in browser console:
// import { runStorageTests } from './storage.test.js';
// runStorageTests().then(() => console.log('Done'));
