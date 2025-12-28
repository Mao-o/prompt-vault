import type { Msg } from "../core/types";

const IFRAME_ID = "__prompt_vault_palette_iframe__";
const OVERLAY_ID = "__prompt_vault_palette_overlay__";
let lastActiveElement: Element | null = null;
let overlayEl: HTMLDivElement | null = null;
let toastEl: HTMLDivElement | null = null;
let toastTimer: number | null = null;
let typeaheadHandler: ((event: KeyboardEvent) => void) | null = null;
let pendingTypeahead = "";
let paletteReady = false;

function isEditable(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el instanceof HTMLInputElement && el.type === "password") return false;
    return !el.readOnly && !el.disabled;
  }
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

function restoreFocus() {
  if (lastActiveElement instanceof HTMLElement) {
    lastActiveElement.focus();
  }
}

function closePalette() {
  const existing = document.getElementById(IFRAME_ID);
  if (existing) existing.remove();
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  if (typeaheadHandler) {
    document.removeEventListener("keydown", typeaheadHandler, true);
    typeaheadHandler = null;
  }
  if (toastTimer) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (toastEl) {
    toastEl.remove();
    toastEl = null;
  }
  pendingTypeahead = "";
  paletteReady = false;
  restoreFocus();
}

function showPageToast(message: string) {
  // Clear existing toast and timer
  if (toastTimer) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (toastEl) {
    toastEl.remove();
    toastEl = null;
  }
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.left = "50%";
  toast.style.bottom = "18px";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "rgba(20, 24, 33, 0.9)";
  toast.style.color = "#fff";
  toast.style.padding = "10px 14px";
  toast.style.borderRadius = "12px";
  toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
  toast.style.fontSize = "13px";
  toast.style.zIndex = "2147483647";
  toast.style.pointerEvents = "none";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 120ms ease";
  document.documentElement.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });
  toastEl = toast;
  toastTimer = window.setTimeout(() => {
    if (toastEl) {
      toastEl.style.opacity = "0";
      window.setTimeout(() => {
        if (toastEl) {
          toastEl.remove();
          toastEl = null;
        }
        toastTimer = null;
      }, 180);
    }
  }, 2000);
}

function openPalette() {
  const existing = document.getElementById(IFRAME_ID);
  if (existing) return;

  lastActiveElement = document.activeElement;
  pendingTypeahead = "";
  paletteReady = false;

  overlayEl = document.createElement("div");
  overlayEl.id = OVERLAY_ID;
  overlayEl.style.position = "fixed";
  overlayEl.style.inset = "0";
  overlayEl.style.background = "rgba(15, 18, 25, 0.35)";
  overlayEl.style.backdropFilter = "blur(4px)";
  overlayEl.style.zIndex = "2147483646";
  overlayEl.style.pointerEvents = "auto";
  overlayEl.addEventListener(
    "mousedown",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePalette();
    },
    true
  );

  const iframe = document.createElement("iframe");
  iframe.id = IFRAME_ID;
  iframe.src = chrome.runtime.getURL("ui/palette.html");
  iframe.tabIndex = -1;
  iframe.style.position = "fixed";
  iframe.style.top = "16px";
  iframe.style.left = "50%";
  iframe.style.transform = "translateX(-50%)";
  iframe.style.width = "min(720px, calc(100vw - 32px))";
  iframe.style.height = "min(520px, calc(100vh - 32px))";
  iframe.style.zIndex = "2147483647";
  iframe.style.border = "0";
  iframe.style.borderRadius = "16px";
  iframe.style.boxShadow = "0 16px 60px rgba(0,0,0,0.35)";
  iframe.style.background = "transparent";
  iframe.addEventListener(
    "load",
    () => {
      iframe.contentWindow?.focus();
    },
    { once: true }
  );

  document.documentElement.appendChild(overlayEl);
  document.documentElement.appendChild(iframe);
  requestAnimationFrame(() => {
    iframe.focus({ preventScroll: true });
  });

  typeaheadHandler = (event: KeyboardEvent) => {
    if (paletteReady) return;
    if (!document.getElementById(IFRAME_ID)) return;
    if (event.isComposing) return;

    if (event.key === "Escape" || ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K"))) {
      event.preventDefault();
      closePalette();
      return;
    }

    if (event.key === "Backspace") {
      pendingTypeahead = pendingTypeahead.slice(0, -1);
      event.preventDefault();
      return;
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      pendingTypeahead += event.key;
      event.preventDefault();
    }
  };
  document.addEventListener("keydown", typeaheadHandler, true);
}

function togglePalette() {
  const existing = document.getElementById(IFRAME_ID);
  if (existing) {
    closePalette();
  } else {
    openPalette();
  }
}

function insertTextAtCursor(target: Element | null, text: string): boolean {
  if (!isEditable(target)) return false;

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const before = target.value.slice(0, start);
    const after = target.value.slice(end);
    target.value = `${before}${text}${after}`;
    const pos = start + text.length;
    target.setSelectionRange(pos, pos);
    target.focus();
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    const selection = target.ownerDocument.getSelection();
    if (!selection) return false;
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(text));
    selection.collapseToEnd();
    target.focus();
    return true;
  }

  return false;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const tmp = document.createElement("textarea");
    tmp.value = text;
    tmp.style.position = "fixed";
    tmp.style.opacity = "0";
    document.body.appendChild(tmp);
    tmp.select();
    const ok = document.execCommand("copy");
    tmp.remove();
    if (!ok) {
      console.warn("Prompt Vault: clipboard copy may have failed.");
    }
    return ok;
  }
}

chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  if (sender.id && sender.id !== chrome.runtime.id) return;

  if (msg.type === "UI/TOGGLE") {
    togglePalette();
    return;
  }

  if (msg.type === "UI/CLOSE") {
    closePalette();
    return;
  }

  if (msg.type === "UI/READY") {
    if (!document.getElementById(IFRAME_ID)) return;
    paletteReady = true;
    if (typeaheadHandler) {
      document.removeEventListener("keydown", typeaheadHandler, true);
      typeaheadHandler = null;
    }
    if (pendingTypeahead) {
      chrome.runtime.sendMessage({
        type: "UI/TYPEAHEAD",
        requestId: crypto.randomUUID(),
        text: pendingTypeahead,
      } satisfies Msg);
      pendingTypeahead = "";
    }
    return;
  }

  if (msg.type === "ACTION/EXECUTE") {
    (async () => {
      const target = lastActiveElement;
      const targetEditable = isEditable(target);
      let success = insertTextAtCursor(target, msg.renderedText);

      if (!success) {
        const copied = await copyToClipboard(msg.renderedText);
        success = copied;
        if (copied && !targetEditable) {
          showPageToast("Copied instead (no editable field)");
        }
        if (!copied) {
          chrome.runtime.sendMessage({
            type: "UI/TOAST",
            requestId: crypto.randomUUID(),
            message: "Copy failed. Try again.",
          } satisfies Msg);
        }
      }

      if (!success) {
        sendResponse({ ok: false });
        chrome.runtime.sendMessage({
          type: "ACTION/RESULT",
          requestId: msg.requestId,
          ok: false,
          error: {
            code: "CONTENT_INSERT_FAILED",
            message: "Insert/copy failed",
            recoverable: true,
          },
        } satisfies Msg);
      } else {
        sendResponse({ ok: true });
        chrome.runtime.sendMessage({
          type: "ACTION/RESULT",
          requestId: msg.requestId,
          ok: true,
        } satisfies Msg);
      }

      closePalette();
    })();
    return true; // keep the channel open for async sendResponse
  }
});
