/* JingZen Translate - options page */
import { getConfig, setConfig } from '../lib/config.js';
import { fetchModels, getApiUrl, getModelsUrl, buildSystemPrompt, translateText, clearModelCache } from '../lib/api.js';
import { DEFAULTS, LANG_NAME } from '../lib/constants.js';
import { PROVIDERS, matchProvider, CUSTOM, isPresetUrl, getProviderName } from '../lib/providers.js';
import { t } from '../lib/i18n.js';

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ── Status display ──
  let statusTimer = null;
  function setStatus(text, cls) {
    const s = $('status');
    if (!s) return;
    s.textContent = text;
    s.className = 'status ' + (cls || '');
    if (statusTimer) clearTimeout(statusTimer);
    if (cls === 'ok') statusTimer = setTimeout(() => (s.textContent = ''), 4000);
  }

  function setModelHint(text) {
    const h = $('modelHint');
    if (h) h.textContent = text;
  }

  // ── Init ──
  function init() {
    // ---- Provider dropdown ----
    const providerSel = $('provider');
    PROVIDERS.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.url;
      o.textContent = p.name;
      providerSel.appendChild(o);
    });

    const providerDisplay = $('providerDisplay');
    const providerBtn = $('providerBtn');
    const providerOptions = $('providerOptions');
    const apiUrlInput = $('apiBaseUrl');
    const apiKeyInput = $('apiKey');
    const editKeyBtn = $('editKey');
    const confirmKeyBtn = $('confirmKey');
    const modelInput = $('model');

    // ---- Modal ----
    const modalOverlay = $('providerModal');
    const modalName = $('modalName');
    const modalUrl = $('modalUrl');
    const modalTitle = $('modalTitle');
    const modalCancel = $('modalCancel');
    const modalConfirm = $('modalConfirm');
    let editingCustomUrl = '';

    function openModal(title, name, url, editUrl) {
      modalTitle.textContent = title;
      modalName.value = name || '';
      modalUrl.value = url || '';
      editingCustomUrl = editUrl || '';
      modalOverlay.classList.add('show');
      setTimeout(() => modalName.focus(), 100);
    }

    function closeModal() {
      modalOverlay.classList.remove('show');
      editingCustomUrl = '';
    }

    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    modalConfirm.addEventListener('click', () => {
      const name = modalName.value.trim();
      const url = modalUrl.value.trim();
      if (!name) { setStatus(t('modal_name_required'), 'err'); modalName.focus(); return; }
      if (!url) { setStatus(t('modal_url_required'), 'err'); modalUrl.focus(); return; }

      if (editingCustomUrl && editingCustomUrl !== url) {
        const i = customProviders.findIndex((cp) => cp.url === editingCustomUrl);
        if (i >= 0) customProviders.splice(i, 1);
      }
      const existing = customProviders.findIndex((cp) => cp.url === url);
      if (existing >= 0) customProviders[existing] = { url, name };
      else customProviders.push({ url, name });

      selectPresetProvider(url, name, true);
      closeModal();
    });

    // ---- Provider dropdown state ----
    let providerDropdownVisible = false;
    let isCurrentCustom = false;
    let customProviders = [];

    function selectPresetProvider(url, name, isCustom) {
      providerSel.value = isCustom ? CUSTOM : url;
      providerDisplay.textContent = name;
      apiUrlInput.value = url;
      apiUrlInput.disabled = true;
      isCurrentCustom = !!isCustom;
      hideProviderDropdown();

      getConfig().then((cfg) => {
        const saved = (cfg.savedProviders || {})[url] || {};
        const savedKey = saved.apiKey || '';
        if (savedKey) {
          apiKeyInput.value = savedKey;
          apiKeyInput.type = 'password';
          apiKeyInput.disabled = true;
          editKeyBtn.style.display = '';
          confirmKeyBtn.style.display = 'none';
          if (saved.model) modelInput.value = saved.model;
          triggerModelRefresh();
        } else {
          apiKeyInput.value = '';
          apiKeyInput.type = 'text';
          apiKeyInput.disabled = false;
          apiKeyInput.focus();
          editKeyBtn.style.display = 'none';
          confirmKeyBtn.style.display = '';
          modelInput.value = '';
          modelListData = [];
          hideDropdown();
          setModelHint(t('model_hint_no_key'));
        }
      });
    }

    function renderProviderDropdown() {
      providerOptions.innerHTML = '';
      // Preset providers
      PROVIDERS.forEach((p) => {
        const div = document.createElement('div');
        const matched = !isCurrentCustom && matchProvider(apiUrlInput.value) === p.url;
        div.className = 'opt' + (matched ? ' selected' : '');
        div.textContent = p.name;
        div.addEventListener('click', () => {
          selectPresetProvider(p.url, p.name, false);
        });
        providerOptions.appendChild(div);
      });

      // Saved custom providers
      if (customProviders.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'opt-separator';
        providerOptions.appendChild(sep);
        customProviders.forEach((cp, idx) => {
          const div = document.createElement('div');
          const matched =
            isCurrentCustom &&
            apiUrlInput.value.replace(/\/+$/, '').toLowerCase() ===
            cp.url.replace(/\/+$/, '').toLowerCase();
          div.className = 'opt' + (matched ? ' selected' : '');
          div.style.whiteSpace = 'nowrap';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = cp.name + t('custom_suffix');
          div.appendChild(nameSpan);

          // Edit button
          const editBtn = document.createElement('span');
          editBtn.textContent = '✏️';
          editBtn.style.cssText =
            'font-size:13px;padding:3px 6px;border-radius:5px;color:#c0c0c5;cursor:pointer;transition:all .1s;';
          editBtn.addEventListener('mouseenter', () => {
            editBtn.style.color = '#4a9eff';
            editBtn.style.background = 'rgba(74,158,255,0.1)';
          });
          editBtn.addEventListener('mouseleave', () => {
            editBtn.style.color = '#c0c0c5';
            editBtn.style.background = 'transparent';
          });
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal();
            openModal(t('modal_edit_title'), cp.name, cp.url, cp.url);
          });
          div.appendChild(editBtn);

          // Delete button
          const delBtn = document.createElement('span');
          delBtn.textContent = '✕';
          delBtn.style.cssText =
            'font-size:14px;padding:3px 6px;border-radius:5px;color:#c0c0c5;cursor:pointer;transition:all .1s;';
          delBtn.addEventListener('mouseenter', () => {
            delBtn.style.color = '#ff3b30';
            delBtn.style.background = 'rgba(255,59,48,0.1)';
          });
          delBtn.addEventListener('mouseleave', () => {
            delBtn.style.color = '#c0c0c5';
            delBtn.style.background = 'transparent';
          });
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const deletedUrl = cp.url;
            customProviders.splice(idx, 1);
            renderProviderDropdown();
            getConfig().then((cfg) => {
              const sp = { ...(cfg.savedProviders || {}) };
              delete sp[deletedUrl];
              const patch = { savedProviders: sp };
              if (cfg.apiBaseUrl === deletedUrl) {
                patch.apiKey = '';
                patch.model = '';
                patch.apiBaseUrl = '';
              }
              chrome.storage.local.set({ jzt_config: { ...cfg, ...patch } }, () =>
                location.reload()
              );
            });
          });
          div.appendChild(delBtn);

          div.addEventListener('click', (e) => {
            if (e.target === delBtn || e.target === editBtn) return;
            selectPresetProvider(cp.url, cp.name, true);
          });
          providerOptions.appendChild(div);
        });
      }

      // Custom entry
      const customDiv = document.createElement('div');
      const isCustom =
        matchProvider(apiUrlInput.value) === CUSTOM &&
        !customProviders.some((cp) => cp.url === apiUrlInput.value.trim());
      customDiv.className = 'opt' + (isCustom ? ' selected' : '');
      customDiv.textContent = t('custom_provider');
      customDiv.addEventListener('click', () => {
        hideProviderDropdown();
        openModal(t('modal_add_title'), '', '', '');
      });
      providerOptions.appendChild(customDiv);
    }

    function showProviderDropdown() {
      providerDropdownVisible = true;
      renderProviderDropdown();
      providerOptions.classList.add('show');
      providerBtn.classList.add('active');
    }

    function hideProviderDropdown() {
      providerDropdownVisible = false;
      providerOptions.classList.remove('show');
      providerBtn.classList.remove('active');
    }

    function toggleProviderDropdown(e) {
      e.preventDefault();
      e.stopPropagation();
      providerDropdownVisible ? hideProviderDropdown() : showProviderDropdown();
    }

    providerBtn.addEventListener('click', toggleProviderDropdown);
    providerDisplay.addEventListener('click', toggleProviderDropdown);

    // ---- API Key edit/confirm ----
    editKeyBtn.addEventListener('click', () => {
      apiKeyInput.disabled = false;
      apiKeyInput.type = 'text';
      apiKeyInput.focus();
      editKeyBtn.style.display = 'none';
      confirmKeyBtn.style.display = '';
    });

    confirmKeyBtn.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      if (!key) { setStatus(t('key_required'), 'err'); return; }
      apiKeyInput.type = 'password';
      apiKeyInput.disabled = true;
      editKeyBtn.style.display = '';
      confirmKeyBtn.style.display = 'none';
      triggerModelRefresh();
    });

    // ---- Model dropdown ----
    const modelOptions = $('modelOptions');
    const modelDropdownBtn = $('modelDropdownBtn');
    let modelListData = [];
    let dropdownVisible = false;
    let suppressFocusShow = false;

    function renderModelDropdown(filter) {
      const f = (filter || '').toLowerCase();
      const filtered = filter
        ? modelListData.filter((m) => m.toLowerCase().includes(f))
        : modelListData;
      modelOptions.innerHTML = '';
      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'opt-empty';
        empty.textContent =
          modelListData.length === 0 ? t('model_no_data') : t('model_no_match');
        modelOptions.appendChild(empty);
      } else {
        filtered.forEach((id) => {
          const div = document.createElement('div');
          div.className = 'opt' + (id === modelInput.value ? ' selected' : '');
          div.textContent = id;
          div.addEventListener('click', () => {
            modelInput.value = id;
            hideDropdown();
            suppressFocusShow = true;
            modelInput.focus();
            setTimeout(() => { suppressFocusShow = false; }, 200);
          });
          modelOptions.appendChild(div);
        });
      }
    }

    function showDropdown() {
      dropdownVisible = true;
      modelOptions.classList.add('show');
      modelDropdownBtn.classList.add('active');
      renderModelDropdown('');
    }

    function hideDropdown() {
      dropdownVisible = false;
      modelOptions.classList.remove('show');
      modelDropdownBtn.classList.remove('active');
    }

    function toggleDropdown() {
      dropdownVisible ? hideDropdown() : showDropdown();
    }

    modelDropdownBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleDropdown();
    });

    modelInput.addEventListener('click', () => {
      if (modelListData.length > 0) toggleDropdown();
    });

    modelInput.addEventListener('input', () => {
      if (dropdownVisible) renderModelDropdown(modelInput.value);
    });

    // Click outside to close dropdowns
    document.addEventListener('click', (e) => {
      if (dropdownVisible) {
        const modelWrap = modelInput.closest('.model-wrap');
        if (modelWrap && !modelWrap.contains(e.target)) hideDropdown();
      }
      if (providerDropdownVisible) {
        const providerWrap = providerBtn.closest('.model-wrap');
        if (providerWrap && !providerWrap.contains(e.target)) hideProviderDropdown();
      }
    });

    // ---- Model refresh ----
    async function triggerModelRefresh() {
      const key = apiKeyInput.value.trim();
      const url = apiUrlInput.value.trim();
      if (!key || !url) return;
      const cfg = { ...DEFAULTS, apiKey: key, apiBaseUrl: url };
      setModelHint(t('model_hint_loading'));
      clearModelCache();
      try {
        const models = await fetchModels(key, cfg);
        modelListData = models;
        if (!modelInput.value && models.length > 0) modelInput.value = models[0];
        setModelHint(
          models.length > 0
            ? t('model_hint_fetched', { count: String(models.length) })
            : t('model_hint_empty')
        );
      } catch (err) {
        modelListData = [];
        setModelHint(t('model_hint_error', { error: (err.message || err).slice(0, 80) }));
        console.error('[JZT] fetchModels', err);
      }
    }

    // ---- Load config ----
    function load() {
      getConfig().then((cfg) => {
        apiUrlInput.value = cfg.apiBaseUrl || '';
        providerSel.value = matchProvider(cfg.apiBaseUrl);
        apiUrlInput.disabled = true;

        const savedProviders = cfg.savedProviders || {};
        const currentSaved = savedProviders[cfg.apiBaseUrl] || {};
        const customName = currentSaved.name || '';
        const isCustom = !!customName;
        isCurrentCustom = isCustom;

        providerDisplay.textContent = isCustom
          ? customName
          : (PROVIDERS.find(
              (p) =>
                p.url.replace(/\/+$/, '').toLowerCase() ===
                (cfg.apiBaseUrl || '').replace(/\/+$/, '').toLowerCase()
            )?.name || t('custom_provider'));

        // Build custom providers list from savedProviders
        customProviders = [];
        const presetUrlsSet = new Set(
          PROVIDERS.map((p) => p.url.replace(/\/+$/, '').toLowerCase())
        );
        Object.keys(savedProviders).forEach((url) => {
          if (!url) return;
          if (presetUrlsSet.has(url.replace(/\/+$/, '').toLowerCase())) return;
          const sp = savedProviders[url];
          const name = sp.name || url;
          customProviders.push({ url, name });
        });

        // API Key
        const savedKey = currentSaved.apiKey || '';
        apiKeyInput.type = savedKey ? 'password' : 'text';
        apiKeyInput.value = savedKey;
        apiKeyInput.disabled = !!savedKey;
        editKeyBtn.style.display = savedKey ? '' : 'none';
        confirmKeyBtn.style.display = savedKey ? 'none' : '';

        // Model
        modelInput.value = currentSaved.model || cfg.model || '';

        // Other fields
        ['sourceLang', 'targetLang', 'pageTranslateMode'].forEach((f) => {
          if ($(f)) $(f).value = cfg[f] != null ? cfg[f] : '';
        });
        $('selectionEnabled').checked = cfg.selectionEnabled !== false;

        // Auto-refresh models
        if (savedKey && cfg.apiBaseUrl) triggerModelRefresh();
      });
    }

    // ---- Save ----
    function save(silent) {
      getConfig().then((cfg) => {
        const url = apiUrlInput.value.trim();
        const key = apiKeyInput.value.trim();
        const patch = {
          apiBaseUrl: url,
          apiKey: key,
          savedProviders: {
            ...(cfg.savedProviders || {}),
            [url]: {
              apiKey: key,
              model: modelInput.value.trim(),
              name: (customProviders.find((c) => c.url === url) || {}).name || '',
            },
          },
          model: modelInput.value.trim(),
          sourceLang: $('sourceLang').value,
          targetLang: $('targetLang').value,
          pageTranslateMode: $('pageTranslateMode').value,
          selectionEnabled: $('selectionEnabled').checked,
        };
        chrome.storage.local.set({ jzt_config: { ...cfg, ...patch } }, () => {
          if (!silent) setStatus(t('saved'), 'ok');
        });
      });
    }

    // ---- Test connection ----
    function test() {
      const cfg = {
        ...DEFAULTS,
        apiBaseUrl: apiUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        model: modelInput.value.trim(),
        sourceLang: $('sourceLang').value,
        targetLang: $('targetLang').value,
      };
      if (!cfg.apiKey) { setStatus(t('key_required'), 'err'); return; }
      if (!cfg.model) { setStatus(t('model_required'), 'err'); return; }
      if (!cfg.apiBaseUrl) { setStatus(t('url_required'), 'err'); return; }
      setStatus(t('testing'), '');
      translateText('Colorless green ideas sleep furiously.', cfg)
        .then((out) => setStatus(t('test_success', { result: out }), 'ok'))
        .catch((err) => setStatus(t('test_fail', { error: (err.message || err).slice(0, 100) }), 'err'));
    }

    $('save').addEventListener('click', () => save(false));
    $('test').addEventListener('click', test);
    $('reset').addEventListener('click', () => {
      if (!confirm(t('reset_confirm'))) return;
      chrome.storage.local.remove('jzt_config', () => {
        setStatus(t('reset_done'), 'ok');
        setTimeout(() => location.reload(), 1500);
      });
    });

    load();
    console.log('[JZT] options init ok');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
