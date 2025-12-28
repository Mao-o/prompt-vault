import type { Msg, SearchResult } from "../core/types";

const queryInput = document.getElementById("query") as HTMLInputElement;
const resultsEl = document.getElementById("results") as HTMLDivElement;
const closeButton = document.getElementById("close") as HTMLButtonElement;
const toastEl = document.getElementById("toast") as HTMLDivElement;

let results: SearchResult[] = [];
let selectedIndex = 0;
let toastTimer: number | null = null;
let isLoading = false;
let error: string | null = null;
let pendingRequestId: string | null = null;
let isComposing = false;
let searchDebounce: number | null = null;

function render() {
  resultsEl.innerHTML = "";

  if (error) {
    const errorEl = document.createElement("div");
    errorEl.className = "pv-error";
    errorEl.textContent = error;
    resultsEl.appendChild(errorEl);
    return;
  }

  if (!results.length && isLoading) {
    const loading = document.createElement("div");
    loading.className = "pv-loading";
    loading.textContent = "Searching...";
    resultsEl.appendChild(loading);
    return;
  }

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "pv-empty";
    empty.textContent = "No results";
    resultsEl.appendChild(empty);
    return;
  }

  results.forEach((result, idx) => {
    const item = document.createElement("div");
    item.className = "pv-result";
    if (idx === selectedIndex) item.classList.add("is-selected");

    const title = document.createElement("div");
    title.className = "pv-result-title";
    title.textContent = result.title;

    const snippet = document.createElement("div");
    snippet.className = "pv-result-snippet";
    snippet.textContent = result.snippet;

    const meta = document.createElement("div");
    meta.className = "pv-result-meta";
    meta.textContent = `${result.tags.join(", ")}${result.pinned ? " • pinned" : ""}`;

    item.appendChild(title);
    item.appendChild(snippet);
    item.appendChild(meta);
    resultsEl.appendChild(item);
  });

  if (isLoading) {
    const loading = document.createElement("div");
    loading.className = "pv-loading pv-loading-inline";
    loading.textContent = "Updating…";
    resultsEl.appendChild(loading);
  }
}

function runSearch(query: string) {
  // Cancel pending request if any
  if (pendingRequestId) {
    pendingRequestId = null;
  }

  isLoading = true;
  error = null;
  // keep current results during loading to avoid flicker; render only if empty
  if (!results.length) {
    render();
  }

  const requestId = crypto.randomUUID();
  pendingRequestId = requestId;

  chrome.runtime.sendMessage({
    type: "SEARCH/REQUEST",
    requestId,
    query,
    limit: 20,
  } satisfies Msg).catch((err) => {
    if (pendingRequestId === requestId) {
      isLoading = false;
      error = "Search failed. Please try again.";
      pendingRequestId = null;
      render();
    }
    console.error("Search request failed:", err);
  });
}

function selectNext(delta: number) {
  if (!results.length) return;
  selectedIndex = (selectedIndex + delta + results.length) % results.length;
  render();
}

function closePalette() {
  // Cancel any pending search
  pendingRequestId = null;
  isLoading = false;
  // Restore focus to the previous element if possible
  chrome.runtime.sendMessage({ type: "UI/CLOSE", requestId: crypto.randomUUID() } satisfies Msg);
}

function showToast(message: string) {
  if (!toastEl) return;
  // Clear any existing toast
  clearToast();
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  // Force reflow to ensure transition
  void toastEl.offsetWidth;
  toastTimer = window.setTimeout(() => {
    if (toastEl) {
      toastEl.classList.remove("is-visible");
    }
    toastTimer = null;
  }, 2000);
}

function clearToast() {
  if (!toastEl) return;
  toastEl.classList.remove("is-visible");
  if (toastTimer) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
}

async function activateSelection() {
  const choice = results[selectedIndex];
  if (!choice) {
    closePalette();
    return;
  }

  // If still loading, wait a bit for results (with timeout)
  if (isLoading && results.length === 0) {
    const maxWait = 2000; // 2 seconds max wait
    const startTime = Date.now();
    while (isLoading && results.length === 0 && Date.now() - startTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    // Re-check after waiting
    const updatedChoice = results[selectedIndex];
    if (!updatedChoice) {
      closePalette();
      return;
    }
  }

  try {
    await chrome.runtime.sendMessage({
      type: "ACTION/EXECUTE",
      requestId: crypto.randomUUID(),
      promptId: choice.id,
      renderedText: choice.body,
      mode: "insert",
    } satisfies Msg);
    closePalette();
  } catch (err) {
    console.error("Failed to execute action:", err);
    showToast("Action failed. Please try again.");
  }
}

queryInput?.addEventListener("input", (e) => {
  const value = (e.target as HTMLInputElement).value;
  if (isComposing) return;
  if (searchDebounce) {
    window.clearTimeout(searchDebounce);
  }
  searchDebounce = window.setTimeout(() => {
    runSearch(value);
    searchDebounce = null;
  }, 120);
});

queryInput?.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!isLoading && !error) {
      selectNext(1);
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!isLoading && !error) {
      selectNext(-1);
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    // Enter immediately executes - will wait for results if loading
    void activateSelection();
  } else if (e.key === "Escape") {
    e.preventDefault();
    closePalette();
  }
});

queryInput?.addEventListener("compositionstart", () => {
  isComposing = true;
});

queryInput?.addEventListener("compositionend", (e) => {
  isComposing = false;
  const value = (e.target as HTMLInputElement).value;
  runSearch(value);
});

closeButton?.addEventListener("click", () => {
  closePalette();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    closePalette();
  }
});

window.addEventListener("load", () => {
  // Focus input and ensure it stays focused
  if (queryInput) {
    queryInput.focus();
    // Re-focus if focus is lost (e.g., after clicking)
    queryInput.addEventListener("blur", () => {
      // Only re-focus if palette is still open and no other element was intentionally focused
      setTimeout(() => {
        if (document.activeElement === document.body && queryInput) {
          queryInput.focus();
        }
      }, 0);
    });
  }
  // Initial search with empty query
  runSearch("");
});

chrome.runtime.onMessage.addListener(
  (msg: Msg, sender, _sendResponse): boolean | Promise<void> | undefined => {
    if (sender.id && sender.id !== chrome.runtime.id) return undefined;

    if (msg.type === "UI/TOAST") {
      showToast(msg.message);
      return undefined;
    }

    if (msg.type === "SEARCH/RESULTS") {
      if (pendingRequestId === msg.requestId) {
        isLoading = false;
        error = null;
        results = msg.results;
        selectedIndex = 0;
        pendingRequestId = null;
        render();
      }
      return undefined;
    }

    if (msg.type === "SEARCH/ERROR") {
      if (pendingRequestId === msg.requestId) {
        isLoading = false;
        error = msg.error.message || "Search error occurred";
        results = [];
        selectedIndex = 0;
        pendingRequestId = null;
        render();
      }
      return undefined;
    }

    return undefined;
  }
);

window.addEventListener("unload", () => {
  clearToast();
});
