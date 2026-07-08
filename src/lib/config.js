/* JingZen Translate - configuration read/write (chrome.storage.local) */

import { DEFAULTS } from './constants.js';

/**
 * Read extension configuration from chrome.storage.local.
 * Merges with DEFAULTS for any missing keys.
 */
export function getConfig() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get({ jzt_config: DEFAULTS }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ...DEFAULTS });
          return;
        }
        resolve({ ...DEFAULTS, ...((res && res.jzt_config) || {}) });
      });
    } catch (e) {
      resolve({ ...DEFAULTS });
    }
  });
}

/**
 * Partially update extension configuration.
 */
export function setConfig(patch) {
  return getConfig().then((cfg) =>
    new Promise((resolve) => {
      const next = { ...cfg, ...patch };
      try {
        chrome.storage.local.set({ jzt_config: next }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[JZT] setConfig error:', chrome.runtime.lastError);
          }
          resolve(next);
        });
      } catch (e) {
        resolve(next);
      }
    })
  );
}
