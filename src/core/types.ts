// src/core/types.ts
export type RuntimeTarget = "background" | "content" | "ui";

export type RequestId = string;

export type PromptId = string;

export type InsertMode = "insert" | "copy";

export interface PromptRecord {
  id: PromptId;
  title?: string;
  body: string;
  tags: string[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

export interface SearchResult {
  id: PromptId;
  title: string;
  snippet: string;
  body: string;
  tags: string[];
  pinned: boolean;
  score: number;
  // For UX/debug
  sim?: number;
  recencyBoost?: number;
  pinBoost?: number;
  siteBoost?: number;
}

export type ErrorCode = "CONTENT_INSERT_FAILED" | "NO_ACTIVE_EDITABLE" | "INVALID_MESSAGE" | "UNKNOWN";

export interface AppError {
  code: ErrorCode;
  message: string;
  detail?: unknown;
  recoverable: boolean;
}

export type Msg =
  // --- UI lifecycle ---
  | { type: "UI/READY" }
  | { type: "UI/TOGGLE"; requestId: RequestId }
  | { type: "UI/OPEN"; requestId: RequestId }
  | { type: "UI/CLOSE"; requestId: RequestId }
  | { type: "UI/TYPEAHEAD"; requestId: RequestId; text: string }
  | { type: "UI/TOAST"; requestId: RequestId; message: string }

  // --- Search ---
  | {
      type: "SEARCH/REQUEST";
      requestId: RequestId;
      query: string;
      limit: number;
    }
  | {
      type: "SEARCH/RESULTS";
      requestId: RequestId;
      results: SearchResult[];
      elapsedMs: number;
    }
  | { type: "SEARCH/ERROR"; requestId: RequestId; error: AppError }

  // --- Prompt CRUD ---
  | { type: "PROMPT/LIST_REQUEST"; requestId: RequestId }
  | { type: "PROMPT/LIST_RESULT"; requestId: RequestId; prompts: PromptRecord[] }
  | { type: "PROMPT/UPSERT_REQUEST"; requestId: RequestId; prompt: PromptRecord }
  | { type: "PROMPT/DELETE_REQUEST"; requestId: RequestId; id: PromptId }
  | { type: "PROMPT/MUTATION_RESULT"; requestId: RequestId; ok: boolean; error?: AppError }

  // --- Action: Insert/Copy ---
  | {
      type: "ACTION/EXECUTE";
      requestId: RequestId;
      promptId: PromptId;
      renderedText: string; // variables already resolved
      mode: InsertMode; // "insert" or "copy"
    }
  | { type: "ACTION/RESULT"; requestId: RequestId; ok: boolean; error?: AppError }

  // --- Diagnostics ---
  | { type: "DIAG/PING"; requestId: RequestId }
  | { type: "DIAG/PONG"; requestId: RequestId; from: RuntimeTarget };

export type MsgHandler = (msg: Msg, sender: chrome.runtime.MessageSender) => void;
