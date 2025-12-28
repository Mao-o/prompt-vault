import type { Msg, SearchResult } from "../core/types";

const queryInput = document.getElementById("query") as HTMLInputElement | null;
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
let initialized = false;
let currentQuery = "";
let pendingActivation = false;
let isPaletteOpen = false;
let blurHandler: (() => void) | null = null;
let windowFocusHandler: (() => void) | null = null;
const WAIT_FOR_RESULTS_TIMEOUT_MS = 800;
const SEARCH_DEBOUNCE_MS = 16;

function focusQueryInput() {
  if (!queryInput) return;
  queryInput.focus({ preventScroll: true });
}

async function waitForResults(targetRequestId: string | null, timeoutMs = WAIT_FOR_RESULTS_TIMEOUT_MS) {
  if (!targetRequestId) return;
  const start = performance.now();
  while (pendingRequestId === targetRequestId && isLoading && performance.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 24));
  }
}

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
    item.dataset.index = String(idx);
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

  // Ensure selected item is visible
  const selectedEl = resultsEl.querySelector<HTMLElement>(".pv-result.is-selected");
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: "nearest" });
  }
}

function runSearch(query: string) {
  if (query === currentQuery && pendingRequestId) {
    return;
  }

  if (query === currentQuery && !isLoading && !error && results.length) {
    return;
  }

  currentQuery = query;
  selectedIndex = 0;
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
  isPaletteOpen = false;

  // Clean up event listeners
  if (blurHandler && queryInput) {
    queryInput.removeEventListener("blur", blurHandler);
    blurHandler = null;
  }
  if (windowFocusHandler) {
    window.removeEventListener("focus", windowFocusHandler);
    windowFocusHandler = null;
  }

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
  const awaitingRequest = pendingRequestId;
  if (awaitingRequest) {
    pendingActivation = true;
    showToast("Loading results...");
    await waitForResults(awaitingRequest, 2000); // Wait up to 2 seconds
    // If request is still pending after timeout, let SEARCH/RESULTS handler complete it
    if (pendingRequestId === awaitingRequest) {
      return; // Still waiting, will be handled by SEARCH/RESULTS
    }
  }

  // Check if we have results now
  if (!results.length) {
    pendingActivation = false;
    showToast(isLoading ? "Searching..." : "No results to insert");
    return;
  }

  if (selectedIndex >= results.length) {
    selectedIndex = 0;
  }

  const choice = results[selectedIndex];
  if (!choice) {
    pendingActivation = false;
    return;
  }

  // Clear pending activation before executing
  pendingActivation = false;

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
  }, SEARCH_DEBOUNCE_MS);
});

resultsEl?.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(".pv-result");
  if (!target) return;
  const idx = Number(target.dataset.index ?? -1);
  if (Number.isNaN(idx) || idx < 0 || idx >= results.length) return;
  selectedIndex = idx;
  render();
  void activateSelection();
});

queryInput?.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    e.stopPropagation();
    if (!error && results.length) {
      selectNext(1);
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    e.stopPropagation();
    if (!error && results.length) {
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
  } else if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
    e.preventDefault();
    closePalette();
  }
});

function initPalette() {
  if (initialized) return;
  initialized = true;
  isPaletteOpen = true;

  document.body.classList.add("is-ready");
  chrome.runtime.sendMessage({ type: "UI/READY" } satisfies Msg).catch((err) => {
    console.debug("Prompt Vault: UI ready message failed", err);
  });

  // Focus input and ensure it stays focused
  if (queryInput) {
    focusQueryInput();
    // Re-focus if focus is lost (e.g., after clicking results)
    // This handles iframe-internal focus movements
    // Remove existing listener if any (defensive programming)
    if (blurHandler) {
      queryInput.removeEventListener("blur", blurHandler);
    }
    blurHandler = () => {
      setTimeout(() => {
        // Only re-focus if palette is still open and focus is on body
        if (isPaletteOpen && queryInput && document.activeElement === document.body && queryInput.isConnected) {
          focusQueryInput();
        }
      }, 0);
    };
    queryInput.addEventListener("blur", blurHandler);
  }

  // Handle window/tab focus restoration when palette is open
  // Remove existing listener if any (defensive programming)
  if (windowFocusHandler) {
    window.removeEventListener("focus", windowFocusHandler);
  }
  windowFocusHandler = () => {
    // Only re-focus if palette is open (not closed)
    if (!isPaletteOpen || !queryInput) return;

    const activeEl = document.activeElement;
    // Re-focus only if focus is on body/documentElement (lost focus scenario)
    // Don't re-focus if user is interacting with other elements
    if (
      activeEl === document.body ||
      activeEl === document.documentElement ||
      activeEl === null
    ) {
      // Small delay to let other focus handlers (like blur) complete first
      // This prevents duplicate focus calls when both blur and window.focus fire
      setTimeout(() => {
        // Double-check palette is still open and focus is still on body
        if (isPaletteOpen && queryInput && document.activeElement === document.body) {
          focusQueryInput();
        }
      }, 10); // Slightly longer delay to let blur handler run first
    }
  };
  window.addEventListener("focus", windowFocusHandler);

  // Initial search with empty query
  runSearch("");
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPalette, { once: true });
} else {
  initPalette();
}

chrome.runtime.onMessage.addListener(
  (msg: Msg, sender, _sendResponse): boolean | Promise<void> | undefined => {
    if (sender.id && sender.id !== chrome.runtime.id) return undefined;

    if (msg.type === "UI/TOAST") {
      showToast(msg.message);
      return undefined;
    }

    if (msg.type === "UI/TYPEAHEAD") {
      if (queryInput && msg.text) {
        queryInput.value = `${queryInput.value}${msg.text}`;
        const end = queryInput.value.length;
        queryInput.setSelectionRange(end, end);
        runSearch(queryInput.value);
      }
      focusQueryInput();
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
        if (pendingActivation) {
          pendingActivation = false;
          void activateSelection();
        }
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
        if (pendingActivation) {
          pendingActivation = false;
          showToast("Search failed. Please try again.");
        }
      }
      return undefined;
    }

    return undefined;
  }
);

window.addEventListener("unload", () => {
  clearToast();
});
