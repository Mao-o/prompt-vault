import type { Msg, PromptRecord, SearchResult } from "../core/types";

const queryInput = document.getElementById("query") as HTMLInputElement | null;
const resultsEl = document.getElementById("results") as HTMLDivElement;
const closeButton = document.getElementById("close") as HTMLButtonElement;
const newButton = document.getElementById("new-prompt") as HTMLButtonElement;
const toastEl = document.getElementById("toast") as HTMLDivElement;
const editorEl = document.getElementById("editor") as HTMLElement;
const editorTitleEl = document.getElementById("editor-title") as HTMLElement;
const editorCloseButton = document.getElementById("editor-close") as HTMLButtonElement;
const titleInput = document.getElementById("prompt-title") as HTMLInputElement;
const bodyInput = document.getElementById("prompt-body") as HTMLTextAreaElement;
const tagsInput = document.getElementById("prompt-tags") as HTMLInputElement;
const pinnedInput = document.getElementById("prompt-pinned") as HTMLInputElement;
const editorStatus = document.getElementById("editor-status") as HTMLElement;
const deleteButton = document.getElementById("delete-prompt") as HTMLButtonElement;
const variablesEl = document.getElementById("variables") as HTMLElement;
const variableFieldsEl = document.getElementById("variable-fields") as HTMLDivElement;
const variablesCancelButton = document.getElementById("variables-cancel") as HTMLButtonElement;
const variablesInsertButton = document.getElementById("variables-insert") as HTMLButtonElement;

type WorkerResponse = { ok: boolean; prompts?: PromptRecord[]; error?: string };
let results: SearchResult[] = [];
let selectedIndex = 0;
let pendingRequestId: string | null = null;
let isLoading = false;
let currentQuery = "";
let isComposing = false;
let searchDebounce: number | null = null;
let saveDebounce: number | null = null;
let toastTimer: number | null = null;
let editing: PromptRecord | null = null;
let templateToInsert: SearchResult | null = null;

function send<T extends object>(message: Msg): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

function focusQuery() {
  queryInput?.focus({ preventScroll: true });
}

function showToast(message: string) {
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("is-visible"), 1800);
}

function closePalette() {
  chrome.runtime.sendMessage({ type: "UI/CLOSE", requestId: crypto.randomUUID() } satisfies Msg);
}

function tagsFromInput(): string[] {
  return Array.from(new Set(tagsInput.value.split(",").map((tag) => tag.trim()).filter(Boolean)));
}

function currentEditorRecord(): PromptRecord | null {
  const body = bodyInput.value.trim();
  if (!body) return null;
  const now = Date.now();
  return {
    id: editing?.id ?? crypto.randomUUID(),
    title: titleInput.value.trim() || undefined,
    body: bodyInput.value,
    tags: tagsFromInput(),
    pinned: pinnedInput.checked,
    createdAt: editing?.createdAt ?? now,
    updatedAt: now,
    lastUsedAt: editing?.lastUsedAt,
  };
}

async function saveEditor() {
  const prompt = currentEditorRecord();
  if (!prompt) {
    editorStatus.textContent = "Add prompt text to save";
    return;
  }
  const response = await send<WorkerResponse>({
    type: "PROMPT/UPSERT_REQUEST",
    requestId: crypto.randomUUID(),
    prompt,
  });
  if (!response.ok) {
    editorStatus.textContent = "Could not save";
    return;
  }
  editing = prompt;
  editorStatus.textContent = "Saved locally";
  refreshSearch();
}

function scheduleSave() {
  editorStatus.textContent = "Saving…";
  if (saveDebounce) window.clearTimeout(saveDebounce);
  saveDebounce = window.setTimeout(() => void saveEditor(), 350);
}

function openEditor(prompt?: PromptRecord) {
  editing = prompt ?? null;
  editorTitleEl.textContent = prompt ? "Edit prompt" : "New prompt";
  titleInput.value = prompt?.title ?? "";
  bodyInput.value = prompt?.body ?? "";
  tagsInput.value = prompt?.tags.join(", ") ?? "";
  pinnedInput.checked = Boolean(prompt?.pinned);
  editorStatus.textContent = prompt ? "Saved locally" : "Add prompt text to save";
  deleteButton.hidden = !prompt;
  variablesEl.hidden = true;
  editorEl.hidden = false;
  bodyInput.focus({ preventScroll: true });
}

function closeEditor() {
  if (saveDebounce) {
    window.clearTimeout(saveDebounce);
    saveDebounce = null;
    void saveEditor();
  }
  editorEl.hidden = true;
  editing = null;
  focusQuery();
}

async function editSelected() {
  const selected = results[selectedIndex];
  if (!selected) {
    openEditor();
    return;
  }
  const response = await send<WorkerResponse>({
    type: "PROMPT/LIST_REQUEST",
    requestId: crypto.randomUUID(),
  });
  const prompt = response.prompts?.find((item) => item.id === selected.id);
  if (prompt) openEditor(prompt);
}

async function deleteEditing() {
  if (!editing) return;
  const response = await send<WorkerResponse>({
    type: "PROMPT/DELETE_REQUEST",
    requestId: crypto.randomUUID(),
    id: editing.id,
  });
  if (!response.ok) {
    showToast("Could not delete prompt");
    return;
  }
  showToast("Prompt deleted");
  editorEl.hidden = true;
  editing = null;
  refreshSearch();
  focusQuery();
}

function extractVariables(body: string): string[] {
  const values = new Set<string>();
  for (const match of body.matchAll(/{{\s*([^{}]+?)\s*}}/g)) {
    const name = match[1].trim();
    if (name) values.add(name);
  }
  return [...values];
}

function renderTemplate(body: string): string {
  return body.replace(/{{\s*([^{}]+?)\s*}}/g, (_match, rawName: string) => {
    const name = rawName.trim();
    const input = variableFieldsEl.querySelector<HTMLInputElement>(`[data-variable="${CSS.escape(name)}"]`);
    return input?.value ?? "";
  });
}

function openVariableForm(choice: SearchResult) {
  templateToInsert = choice;
  variableFieldsEl.replaceChildren();
  for (const variable of extractVariables(choice.body)) {
    const label = document.createElement("label");
    label.textContent = variable;
    const input = document.createElement("input");
    input.type = "text";
    input.autocomplete = "off";
    input.dataset.variable = variable;
    label.appendChild(input);
    variableFieldsEl.appendChild(label);
  }
  editorEl.hidden = true;
  variablesEl.hidden = false;
  variableFieldsEl.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
}

function closeVariableForm() {
  variablesEl.hidden = true;
  templateToInsert = null;
  focusQuery();
}

async function executeChoice(choice: SearchResult, renderedText = choice.body) {
  try {
    await send<Record<string, never>>({
      type: "ACTION/EXECUTE",
      requestId: crypto.randomUUID(),
      promptId: choice.id,
      renderedText,
      mode: "insert",
    });
    closePalette();
  } catch {
    showToast("Action failed. Please try again.");
  }
}

function activateSelected() {
  const choice = results[selectedIndex];
  if (!choice) {
    showToast(isLoading ? "Searching…" : "No results to insert");
    return;
  }
  if (pendingRequestId) {
    showToast("Searching…");
    return;
  }
  if (extractVariables(choice.body).length) {
    openVariableForm(choice);
    return;
  }
  void executeChoice(choice);
}

function renderResults() {
  resultsEl.replaceChildren();
  if (!results.length) {
    const message = document.createElement("div");
    message.className = "pv-empty";
    message.textContent = isLoading ? "Searching…" : "No prompts found";
    resultsEl.appendChild(message);
    return;
  }

  results.forEach((result, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "pv-result";
    item.dataset.index = String(index);
    if (index === selectedIndex) item.classList.add("is-selected");

    const title = document.createElement("div");
    title.className = "pv-result-title";
    title.textContent = result.title;
    const snippet = document.createElement("div");
    snippet.className = "pv-result-snippet";
    snippet.textContent = result.snippet;
    const meta = document.createElement("div");
    meta.className = "pv-result-meta";
    const hasVariables = extractVariables(result.body).length > 0;
    meta.textContent = [result.tags.join(", "), result.pinned ? "pinned" : "", hasVariables ? "template" : ""]
      .filter(Boolean)
      .join(" · ");
    item.append(title, snippet, meta);
    item.addEventListener("click", () => {
      selectedIndex = index;
      renderResults();
      activateSelected();
    });
    resultsEl.appendChild(item);
  });
  resultsEl.querySelector<HTMLElement>(".is-selected")?.scrollIntoView({ block: "nearest" });
}

function runSearch(query: string) {
  currentQuery = query;
  selectedIndex = 0;
  isLoading = true;
  const requestId = crypto.randomUUID();
  pendingRequestId = requestId;
  renderResults();
  chrome.runtime
    .sendMessage({ type: "SEARCH/REQUEST", requestId, query, limit: 20 } satisfies Msg)
    .catch(() => {
      if (pendingRequestId === requestId) {
        pendingRequestId = null;
        isLoading = false;
        showToast("Search failed");
        renderResults();
      }
    });
}

function refreshSearch() {
  currentQuery = "";
  runSearch(queryInput?.value ?? "");
}

queryInput?.addEventListener("input", (event) => {
  if (isComposing) return;
  if (searchDebounce) window.clearTimeout(searchDebounce);
  const value = (event.target as HTMLInputElement).value;
  searchDebounce = window.setTimeout(() => runSearch(value), 16);
});

queryInput?.addEventListener("compositionstart", () => (isComposing = true));
queryInput?.addEventListener("compositionend", (event) => {
  isComposing = false;
  runSearch((event.target as HTMLInputElement).value);
});

queryInput?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" && results.length) {
    event.preventDefault();
    selectedIndex = (selectedIndex + 1) % results.length;
    renderResults();
  } else if (event.key === "ArrowUp" && results.length) {
    event.preventDefault();
    selectedIndex = (selectedIndex - 1 + results.length) % results.length;
    renderResults();
  } else if (event.key === "Enter") {
    event.preventDefault();
    activateSelected();
  } else if (event.key === "Escape") {
    event.preventDefault();
    closePalette();
  }
});

for (const control of [titleInput, bodyInput, tagsInput, pinnedInput]) {
  control.addEventListener("input", scheduleSave);
  control.addEventListener("change", scheduleSave);
}

newButton.addEventListener("click", () => openEditor());
editorCloseButton.addEventListener("click", closeEditor);
deleteButton.addEventListener("click", () => void deleteEditing());
variablesCancelButton.addEventListener("click", closeVariableForm);
variablesInsertButton.addEventListener("click", () => {
  if (!templateToInsert) return;
  void executeChoice(templateToInsert, renderTemplate(templateToInsert.body));
});

variablesEl.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeVariableForm();
  } else if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement)) {
    event.preventDefault();
    variablesInsertButton.click();
  }
});

closeButton.addEventListener("click", closePalette);
window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
    event.preventDefault();
    openEditor();
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
    event.preventDefault();
    void editSelected();
  } else if (event.key === "Escape" && !variablesEl.hidden) {
    event.preventDefault();
    closeVariableForm();
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    closePalette();
  }
});

chrome.runtime.onMessage.addListener((message: Msg, sender) => {
  if (sender.id && sender.id !== chrome.runtime.id) return;
  if (message.type === "UI/TYPEAHEAD" && queryInput) {
    queryInput.value += message.text;
    runSearch(queryInput.value);
    focusQuery();
  }
  if (message.type === "SEARCH/RESULTS" && message.requestId === pendingRequestId) {
    pendingRequestId = null;
    isLoading = false;
    results = message.results;
    renderResults();
  }
  if (message.type === "SEARCH/ERROR" && message.requestId === pendingRequestId) {
    pendingRequestId = null;
    isLoading = false;
    results = [];
    showToast(message.error.message || "Search failed");
    renderResults();
  }
  if (message.type === "UI/TOAST") showToast(message.message);
});

document.body.classList.add("is-ready");
chrome.runtime.sendMessage({ type: "UI/READY" } satisfies Msg).catch(() => undefined);
focusQuery();
runSearch("");
