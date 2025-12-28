import type { PromptRecord } from "./types";

const prompts: PromptRecord[] = [];

export function listPrompts(): Promise<PromptRecord[]> {
  return Promise.resolve([...prompts]);
}

export function upsertPrompt(prompt: PromptRecord): Promise<void> {
  const idx = prompts.findIndex((p) => p.id === prompt.id);
  if (idx >= 0) {
    prompts[idx] = prompt;
  } else {
    prompts.push(prompt);
  }
  return Promise.resolve();
}

export function deletePrompt(id: string): Promise<void> {
  const idx = prompts.findIndex((p) => p.id === id);
  if (idx >= 0) {
    prompts.splice(idx, 1);
  }
  return Promise.resolve();
}
