import type { Msg } from "../core/types";

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

// Generic routing (optional): background can relay ACTION/EXECUTE etc.
// Keep it minimal in MVP.
