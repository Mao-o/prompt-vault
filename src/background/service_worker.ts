import type { Msg, AppError } from "../core/types";
import { searchPrompts } from "../core/search";
import { recordUsage } from "../core/storage";

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
    const startTime = performance.now();
    searchPrompts(msg.query, msg.limit)
      .then((results) => {
        const elapsedMs = performance.now() - startTime;
        const response: Msg = {
          type: "SEARCH/RESULTS",
          requestId: msg.requestId,
          results,
          elapsedMs,
        };
        // Send response to the sender (UI)
        chrome.runtime.sendMessage(response).catch((err) => {
          console.error("Failed to send search results:", err);
        });
        sendResponse({ ok: true });
      })
      .catch((err) => {
        const error: AppError = {
          code: "UNKNOWN",
          message: err instanceof Error ? err.message : "Search failed",
          detail: err,
          recoverable: true,
        };
        const response: Msg = {
          type: "SEARCH/ERROR",
          requestId: msg.requestId,
          error,
        };
        chrome.runtime.sendMessage(response).catch((err) => {
          console.error("Failed to send search error:", err);
        });
        sendResponse({ ok: false });
      });

    return true; // Keep channel open for async response
  }

  // Handle ACTION/EXECUTE
  if (msg.type === "ACTION/EXECUTE") {
    const { promptId, renderedText, mode } = msg;

    // Record usage first
    recordUsage(promptId, mode)
      .then(() => {
        if (mode === "copy") {
          // Copy to clipboard
          return navigator.clipboard.writeText(renderedText).then(() => {
            const response: Msg = {
              type: "ACTION/RESULT",
              requestId: msg.requestId,
              ok: true,
            };
            sendResponse(response);
          });
        } else {
          // For "insert" mode, forward to content script
          chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
            if (!tab?.id) {
              const error: AppError = {
                code: "NO_ACTIVE_EDITABLE",
                message: "No active tab found",
                recoverable: false,
              };
              const response: Msg = {
                type: "ACTION/RESULT",
                requestId: msg.requestId,
                ok: false,
                error,
              };
              sendResponse(response);
              return;
            }

            // Forward to content script for insertion
            chrome.tabs
              .sendMessage(tab.id, {
                type: "CONTENT/INSERT",
                requestId: msg.requestId,
                text: renderedText,
              })
              .then(() => {
                const response: Msg = {
                  type: "ACTION/RESULT",
                  requestId: msg.requestId,
                  ok: true,
                };
                sendResponse(response);
              })
              .catch((err) => {
                const error: AppError = {
                  code: "CONTENT_INSERT_FAILED",
                  message: err instanceof Error ? err.message : "Failed to insert text",
                  detail: err,
                  recoverable: true,
                };
                const response: Msg = {
                  type: "ACTION/RESULT",
                  requestId: msg.requestId,
                  ok: false,
                  error,
                };
                sendResponse(response);
              });
          });
        }
      })
      .catch((err) => {
        const error: AppError = {
          code: "UNKNOWN",
          message: err instanceof Error ? err.message : "Failed to record usage",
          detail: err,
          recoverable: true,
        };
        const response: Msg = {
          type: "ACTION/RESULT",
          requestId: msg.requestId,
          ok: false,
          error,
        };
        sendResponse(response);
      });

    return true; // Keep channel open for async response
  }

  // Handle DIAG/PING
  if (msg.type === "DIAG/PING") {
    const response: Msg = {
      type: "DIAG/PONG",
      requestId: msg.requestId,
      from: "background",
    };
    sendResponse(response);
    return false; // sync response
  }
});

// Generic routing (optional): background can relay ACTION/EXECUTE etc.
// Keep it minimal in MVP.
