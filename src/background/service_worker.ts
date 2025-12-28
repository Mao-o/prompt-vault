import type { Msg } from "../core/types";
import { searchPrompts } from "../core/search";

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-palette") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const msg: Msg = { type: "UI/TOGGLE", requestId: crypto.randomUUID() };
  chrome.tabs.sendMessage(tab.id, msg).catch(async () => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        files: ["content/content_script.js"],
      });
      await chrome.tabs.sendMessage(tab.id!, msg);
    } catch (error) {
      // Restricted pages (chrome://, webstore, etc.). Show unobtrusive badge for a moment.
      await chrome.action.setBadgeText({ tabId: tab.id!, text: "!" });
      await chrome.action.setBadgeBackgroundColor({ tabId: tab.id!, color: "#f59e0b" });
      setTimeout(() => {
        void chrome.action.setBadgeText({ tabId: tab.id!, text: "" });
      }, 1500);
      console.warn("Prompt Vault: cannot inject on this page", error);
    }
  });
});

// Handle UI/CLOSE messages from palette and forward to content script
chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  if (msg.type === "UI/CLOSE") {
    // Forward to content script to close the palette and restore focus
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, msg).catch((err) => {
          console.warn("Failed to forward UI/CLOSE to content script:", err);
        });
      }
    });
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "SEARCH/REQUEST") {
    // Mock implementation: use synchronous searchPrompts
    // TODO: Replace with async API call when ClaudeCode search API is ready
    try {
      const startTime = performance.now();
      const results = searchPrompts(msg.query, msg.limit);
      const elapsedMs = performance.now() - startTime;

      const response: Msg = {
        type: "SEARCH/RESULTS",
        requestId: msg.requestId,
        results,
        elapsedMs,
      };

      // Send response to the sender (UI)
      // UI page sends messages from iframe, so we need to send back via runtime
      // The UI page has an onMessage listener to receive this
      chrome.runtime.sendMessage(response).catch((err) => {
        console.error("Failed to send search results:", err);
      });

      sendResponse({ ok: true });
    } catch (err) {
      const error: Msg = {
        type: "SEARCH/ERROR",
        requestId: msg.requestId,
        error: {
          code: "UNKNOWN",
          message: err instanceof Error ? err.message : "Search failed",
          recoverable: true,
        },
      };

      // Send error response to UI page
      chrome.runtime.sendMessage(error).catch((err) => {
        console.error("Failed to send search error:", err);
      });

      sendResponse({ ok: false });
    }
    return true; // Keep channel open for async response
  }
});

// Generic routing (optional): background can relay ACTION/EXECUTE etc.
// Keep it minimal in MVP.
