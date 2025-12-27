import { recordUsage, searchPrompts } from "../core/search.js";

const queryInput = document.getElementById("query");
const resultsEl = document.getElementById("results");
const closeButton = document.getElementById("close");
const toastEl = document.getElementById("toast");

let results = searchPrompts("", 20);
let selectedIndex = 0;
let toastTimer = null;

function render() {
  resultsEl.innerHTML = "";
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

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "pv-empty";
    empty.textContent = "No results";
    resultsEl.appendChild(empty);
  }
}

function runSearch(query) {
  results = searchPrompts(query, 20);
  selectedIndex = 0;
  render();
}

function selectNext(delta) {
  if (!results.length) return;
  selectedIndex = (selectedIndex + delta + results.length) % results.length;
  render();
}

function closePalette() {
  chrome.runtime.sendMessage({ type: "UI/CLOSE", requestId: crypto.randomUUID() });
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove("is-visible");
    toastTimer = null;
  }, 1400);
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
  recordUsage(choice.id);
  await chrome.runtime.sendMessage({
    type: "ACTION/EXECUTE",
    requestId: crypto.randomUUID(),
    promptId: choice.id,
    renderedText: choice.body,
    mode: "insert",
  });
}

queryInput?.addEventListener("input", (e) => {
  const value = e.target.value;
  runSearch(value);
});

queryInput?.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectNext(1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectNext(-1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    void activateSelection();
  } else if (e.key === "Escape") {
    e.preventDefault();
    closePalette();
  }
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
  queryInput?.focus();
  render();
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id && sender.id !== chrome.runtime.id) return;
  if (msg.type === "UI/TOAST") {
    showToast(msg.message);
  }
});

window.addEventListener("unload", () => {
  clearToast();
});
