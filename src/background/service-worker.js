/* JingZen Translate - background service worker
 * Context menus / keyboard shortcuts / first-run onboarding
 */
import { getConfig } from '../lib/config.js';
import { t } from '../lib/i18n.js';

// ── Context menus ──

chrome.runtime.onInstalled.addListener(async (details) => {
  // Create right-click menu items
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'jzt-translate-selection',
        title: t('context_translate_selection'),
        contexts: ['selection'],
      });
      chrome.contextMenus.create({
        id: 'jzt-translate-page',
        title: t('context_translate_page'),
        contexts: ['page'],
      });
    });
  } catch (e) {
    /* ignore */
  }

  // First install: auto-open settings page if no API key configured
  if (details.reason === 'install') {
    try {
      const cfg = await getConfig();
      if (!cfg.apiKey) {
        chrome.runtime.openOptionsPage();
      }
    } catch (e) {
      /* ignore */
    }
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  if (info.menuItemId === 'jzt-translate-page') {
    chrome.tabs.sendMessage(tab.id, { type: 'translate-page' }).catch(() => {});
  } else if (info.menuItemId === 'jzt-translate-selection') {
    chrome.tabs.sendMessage(tab.id, { type: 'translate-selection' }).catch(() => {});
  }
});

// ── Keyboard shortcut ──

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'translate-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'translate-page' }).catch(() => {});
      }
    });
  }
});

// ── Message relay ──

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'open-options') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }
  return true;
});
