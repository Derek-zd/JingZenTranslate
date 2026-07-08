/* JingZen Translate - popup: quick provider/model switch + actions */
import { getConfig, setConfig } from '../lib/config.js';
import { fetchModels, getApiUrl, getModelsUrl, clearModelCache } from '../lib/api.js';
import { DEFAULTS } from '../lib/constants.js';
import { PROVIDERS, getProviderName } from '../lib/providers.js';
import { t } from '../lib/i18n.js';

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  async function load() {
    const cfg = await getConfig();
    const providerSel = $('providerSelect');
    const modelSelect = $('modelSelect');
    const savedProviders = cfg.savedProviders || {};

    // ---- Provider dropdown ----
    const urls = Object.keys(savedProviders).filter(
      (u) => u && savedProviders[u].apiKey
    );
    providerSel.innerHTML = '';
    if (urls.length === 0) {
      providerSel.innerHTML = '<option value="">' + t('warn_no_key') + '</option>';
      providerSel.disabled = true;
    } else {
      providerSel.disabled = false;
      urls.forEach((url) => {
        const o = document.createElement('option');
        o.value = url;
        o.textContent = getProviderName(url, savedProviders);
        providerSel.appendChild(o);
      });
      providerSel.value =
        cfg.apiBaseUrl && (savedProviders[cfg.apiBaseUrl] || {}).apiKey
          ? cfg.apiBaseUrl
          : urls[0];
    }

    // ---- Refresh model list ----
    async function refreshModels() {
      const url = providerSel.value;
      if (!url) return;
      const key = (savedProviders[url] || {}).apiKey;
      if (!key) return;

      try {
        // fetchModels now has built-in 1-hour cache
        const models = await fetchModels(key, { apiBaseUrl: url });
        const prevModel = modelSelect.value;
        modelSelect.innerHTML = '';
        models.forEach((m) => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          modelSelect.appendChild(opt);
        });

        const saved = (savedProviders[url] || {}).model;
        if (saved && models.includes(saved)) {
          modelSelect.value = saved;
        } else if (prevModel && models.includes(prevModel)) {
          modelSelect.value = prevModel;
        } else {
          modelSelect.value = models[0] || '';
        }

        if (models.length > 0) {
          const latest = await getConfig();
          const sp = { ...(latest.savedProviders || {}) };
          const m = modelSelect.value;
          sp[url] = { ...(sp[url] || {}), model: m };
          setConfig({ savedProviders: sp, model: m });
        }
      } catch (e) {
        const latest = await getConfig();
        const saved = (latest.savedProviders || {})[url];
        const m = (saved && saved.model) || '';
        if (m) modelSelect.value = m;
        if (m) {
          setConfig({
            model: m,
            savedProviders: {
              ...(latest.savedProviders || {}),
              [url]: { ...(saved || {}), model: m },
            },
          });
        }
      }
      updateWarn();
    }

    // ---- Provider switch ----
    providerSel.addEventListener('change', () => {
      const url = providerSel.value;
      if (!url) return;
      const key = (savedProviders[url] || {}).apiKey || '';
      clearModelCache();
      setConfig({ apiBaseUrl: url, apiKey: key, model: '' }).then(() =>
        refreshModels()
      );
    });

    // ---- Model switch ----
    modelSelect.addEventListener('change', async () => {
      const url = providerSel.value;
      if (!url) return;
      const m = modelSelect.value;
      if (!m) return;
      const latest = await getConfig();
      const spUrl = (latest.savedProviders || {})[url] || {};
      setConfig({
        apiBaseUrl: url,
        apiKey: latest.apiKey || spUrl.apiKey || '',
        model: m,
        savedProviders: {
          ...(latest.savedProviders || {}),
          [url]: { ...spUrl, model: m },
        },
      });
    });

    // ---- Warning ----
    function updateWarn() {
      const url = providerSel.value;
      const key = url ? (savedProviders[url] || {}).apiKey || '' : '';
      const model = modelSelect.value;
      const missing = [];
      if (!key) missing.push('API Key');
      if (!model) missing.push(t('model_label'));
      const warnEl = $('warn');
      if (missing.length > 0) {
        warnEl.style.display = 'block';
        if (!key && !model) warnEl.textContent = t('warn_no_config');
        else if (!key) warnEl.textContent = t('warn_no_key');
        else warnEl.textContent = t('warn_no_model');
      } else {
        warnEl.style.display = 'none';
      }
    }

    // ---- Existing controls ----
    $('selSwitch').classList.toggle('on', cfg.selectionEnabled !== false);
    $('pageMode').value = cfg.pageTranslateMode || 'bilingual';

    // Initial model fetch
    await refreshModels();
  }

  // ---- Event bindings ----
  $('selSwitch').addEventListener('click', async () => {
    const cfg = await getConfig();
    const next = cfg.selectionEnabled === false ? true : false;
    await setConfig({ selectionEnabled: next });
    $('selSwitch').classList.toggle('on', next);
  });

  $('pageMode').addEventListener('change', async (e) => {
    await setConfig({ pageTranslateMode: e.target.value });
  });

  $('translatePage').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'translate-page' });
      } catch (e) {}
    }
    window.close();
  });

  $('options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  document.addEventListener('DOMContentLoaded', load);
})();
