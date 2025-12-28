const IFRAME_ID = "__prompt_vault_palette_iframe__";
let lastActiveElement = null;
let outsideClickHandler = null;

function isEditable(el) {
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
  if (outsideClickHandler) {
    document.removeEventListener("mousedown", outsideClickHandler, true);
    outsideClickHandler = null;
  }
  restoreFocus();
}

function openPalette() {
  const existing = document.getElementById(IFRAME_ID);
  if (existing) return;

  lastActiveElement = document.activeElement;

  const iframe = document.createElement("iframe");
  iframe.id = IFRAME_ID;
  iframe.src = chrome.runtime.getURL("ui/palette.html");
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

  document.documentElement.appendChild(iframe);

  outsideClickHandler = (event) => {
    const frame = document.getElementById(IFRAME_ID);
    if (!frame) return;
    if (event.target === frame) return;
    closePalette();
  };
  document.addEventListener("mousedown", outsideClickHandler, true);
}

function togglePalette() {
  const existing = document.getElementById(IFRAME_ID);
  if (existing) {
    closePalette();
  } else {
    openPalette();
  }
}

function insertTextAtCursor(target, text) {
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

async function copyToClipboard(text) {
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

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (sender.id && sender.id !== chrome.runtime.id) return;

  if (msg.type === "UI/TOGGLE") {
    togglePalette();
    return;
  }

  if (msg.type === "UI/CLOSE") {
    closePalette();
    return;
  }

  if (msg.type === "ACTION/EXECUTE") {
    const target = lastActiveElement;
    const inserted = insertTextAtCursor(target, msg.renderedText);
    if (!inserted) {
      const copied = await copyToClipboard(msg.renderedText);
      if (!copied) {
        chrome.runtime.sendMessage({
          type: "UI/TOAST",
          requestId: crypto.randomUUID(),
          message: "Copy failed. Try again.",
        });
      }
    }
    closePalette();
    chrome.runtime.sendMessage({ type: "ACTION/RESULT", requestId: msg.requestId, ok: true });
  }
});
