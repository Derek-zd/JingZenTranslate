/* JingZen Translate - content script
 * Selection translation (floating popup) + full-page translation (DOM rewrite)
 */
import { getConfig } from '../lib/config.js';
import {
  translateText,
  translateBatchWithRetry,
  humanError,
} from '../lib/api.js';
import { BLOCK_TAGS, SKIP_TAGS, ERROR_MESSAGES } from '../lib/constants.js';
import { t } from '../lib/i18n.js';

// ── Helpers ──

function isEditable(node) {
  if (!node) return false;
  const tag = node.nodeName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (node.isContentEditable) return true;
  return false;
}

function showToast(msg, ms = 2500) {
  const el = document.createElement('div');
  el.className = 'jzt-toast';
  el.textContent = msg;
  document.documentElement.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function openOptionsPage() {
  try {
    chrome.runtime.openOptionsPage();
  } catch (e) {
    chrome.runtime.sendMessage({ type: 'open-options' });
  }
}

function isLikelyUrl(text) {
  if (/^https?:\/\//i.test(text)) return true;
  if (/^www\./i.test(text)) return true;
  if (/:\/\//.test(text)) return true;
  return false;
}

function isSameLanguage(text, targetLang) {
  const trimmed = text.replace(/\s/g, '');
  if (trimmed.length === 0) return false;
  const total = trimmed.length;

  if (targetLang === 'zh') {
    return (text.match(/[\u4e00-\u9fff]/g) || []).length / total > 0.5;
  }
  if (targetLang === 'en') {
    return (text.match(/[a-zA-Z]/g) || []).length / total > 0.5;
  }
  if (targetLang === 'ja') {
    return (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length / total > 0.3;
  }
  if (targetLang === 'ko') {
    return (text.match(/[\uac00-\ud7af\u1100-\u11ff]/g) || []).length / total > 0.3;
  }
  return false;
}

function isTranslatableText(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return /[\p{L}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(trimmed);
}

function getSelectionSnap() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return null;
  const text = sel.toString().trim();
  if (!text || text.length < 1) return null;
  if (text.length > 5000) return null;
  if (!/[\p{L}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text)) return null;
  if (isLikelyUrl(text)) return null;
  let node = sel.anchorNode;
  if (node && node.nodeType === 3) node = node.parentElement;
  if (isEditable(node)) return null;

  let rect;
  try {
    rect = sel.getRangeAt(0).getBoundingClientRect();
  } catch (e) {
    return null;
  }
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  return { text, rect };
}

// ── Popup (selection translation) ──

let popupEl = null;
let currentAbort = null;
let currentSourceText = null;

function closePopup() {
  if (popupEl) {
    const el = popupEl;
    popupEl = null;
    currentSourceText = null;
    el.classList.add('jzt-leaving');
    const remove = () => el.remove();
    el.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 200);
  }
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
}

function showPopup(rect, htmlContent) {
  closePopup();
  const el = document.createElement('div');
  el.className = 'jzt-popup';
  el.innerHTML = htmlContent;
  document.documentElement.appendChild(el);

  const margin = 8;
  const pw = el.offsetWidth;
  const ph = el.offsetHeight;
  let left = rect.left + rect.width / 2 - pw / 2;
  let top = rect.bottom + margin;
  left = Math.max(margin, Math.min(left, window.innerWidth - pw - margin));
  if (top + ph > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - ph - margin);
  }
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  popupEl = el;
  return el;
}

async function doSelectionTranslation(text, rect) {
  currentSourceText = text;
  let cfg = await getConfig();

  // Retry once on empty config (possible sync delay)
  if (!cfg.apiKey || !cfg.model) {
    await new Promise((r) => setTimeout(r, 10));
    cfg = await getConfig();
  }

  if (!cfg.apiKey) {
    showPopup(
      rect,
      `<div class="jzt-error">${t('no_api_key_popup')}</div>
       <div class="jzt-foot"><span></span><button class="jzt-btn" data-act="open-options">${t('go_settings')}</button></div>`
    );
    const btn = popupEl.querySelector('[data-act="open-options"]');
    if (btn) btn.onclick = openOptionsPage;
    return;
  }
  if (!cfg.model) {
    showPopup(
      rect,
      `<div class="jzt-error">${t('no_model_popup')}<br><span style="font-size:11px;color:rgba(255,129,129,0.8)">${t('no_model_hint')}</span></div>
       <div class="jzt-foot"><span></span><button class="jzt-btn" data-act="open-options">${t('go_settings')}</button></div>`
    );
    const btn = popupEl.querySelector('[data-act="open-options"]');
    if (btn) btn.onclick = openOptionsPage;
    return;
  }

  showPopup(rect, `<div class="jzt-body jzt-loading">${t('translating')}</div>`);
  const bodyEl = popupEl.querySelector('.jzt-body');
  const ctrl = new AbortController();
  currentAbort = ctrl;

  try {
    let full = '';
    await translateText(
      text,
      cfg,
      (_delta, f) => {
        full = f;
        bodyEl.classList.remove('jzt-loading');
        bodyEl.textContent = f;
      },
      ctrl.signal
    );
    const meta = document.createElement('div');
    meta.className = 'jzt-foot';
    meta.innerHTML = `<span class="jzt-meta">${cfg.model}</span>
      <button class="jzt-btn" data-act="copy">${t('copy')}</button>`;
    popupEl.appendChild(meta);
    meta.querySelector('[data-act="copy"]').onclick = async () => {
      try {
        await navigator.clipboard.writeText(full);
        showToast(t('copied'));
      } catch (e) { /* ignore */ }
    };
  } catch (err) {
    bodyEl.classList.remove('jzt-loading');
    bodyEl.className = 'jzt-body jzt-error';
    bodyEl.textContent = t('translate_failed') + '：' + humanError(err);
  } finally {
    currentAbort = null;
  }
}

// ── Selection event with debounce ──

let selectionTimer = null;

document.addEventListener('mouseup', (e) => {
  // Click inside popup — do nothing
  if (popupEl && popupEl.contains(e.target)) return;

  // Popup visible, click outside — close it
  if (popupEl && !popupEl.contains(e.target)) {
    closePopup();
    return;
  }

  const snap = getSelectionSnap();
  if (!snap) return;

  // Same text as last popup — ignore (was just closed)
  if (currentSourceText && snap.text === currentSourceText) {
    currentSourceText = null;
    return;
  }

  clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    getConfig().then((cfg) => {
      if (cfg.selectionEnabled === false) return;
      if (isSameLanguage(snap.text, cfg.targetLang)) return;
      doSelectionTranslation(snap.text, snap.rect);
    });
  }, 200); // 200ms debounce
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePopup();
});

// ── Full-page translation ──

function collectBlocks() {
  const blocks = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[contenteditable='true']")) return NodeFilter.FILTER_REJECT;
      if (parent.closest('.jzt-popup, .jzt-progress, .jzt-progress-bar, .jzt-toast')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.dataset.jzt === 'tr') return NodeFilter.FILTER_REJECT;
      if (!isTranslatableText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  let group = null;
  let groupBlock = null;
  for (const n of nodes) {
    const block = n.parentElement.closest(
      Array.from(BLOCK_TAGS).map((t) => t.toLowerCase()).join(',')
    );
    if (!group || block !== groupBlock) {
      if (group) blocks.push(group);
      group = { nodes: [n], text: n.nodeValue };
      groupBlock = block;
    } else {
      group.nodes.push(n);
      group.text += '\n' + n.nodeValue;
    }
  }
  if (group) blocks.push(group);
  return blocks;
}

function clearTranslations() {
  document.querySelectorAll("span[data-jzt='tr']").forEach((el) => el.remove());
  document.querySelectorAll("[data-jzt='src']").forEach((el) => {
    el.classList.remove('jzt-src-muted');
    delete el.dataset.jzt;
  });
}

let translating = false;

async function translatePage() {
  if (translating) {
    showToast(t('page_translating'));
    return;
  }
  const cfg = await getConfig();
  if (!cfg.apiKey) {
    showToast(ERROR_MESSAGES.NO_API_KEY);
    openOptionsPage();
    return;
  }
  if (!cfg.model) {
    showToast(ERROR_MESSAGES.NO_MODEL);
    openOptionsPage();
    return;
  }

  const existing = document.querySelectorAll("span[data-jzt='tr']");
  if (existing.length > 0) {
    clearTranslations();
    showToast(t('toggled_back'));
    return;
  }

  translating = true;
  const blocks = collectBlocks();
  if (blocks.length === 0) {
    showToast(t('no_translatable'));
    translating = false;
    return;
  }

  // Progress bar
  const bar = document.createElement('div');
  bar.className = 'jzt-progress-bar';
  const prog = document.createElement('div');
  prog.className = 'jzt-progress';
  bar.appendChild(prog);
  document.documentElement.appendChild(bar);

  let done = 0;
  const BATCH = 8;
  const CONCURRENCY = 3;
  let failCount = 0;

  for (let i = 0; i < blocks.length; i += BATCH * CONCURRENCY) {
    const slices = [];
    for (let j = 0; j < CONCURRENCY && i + j * BATCH < blocks.length; j++) {
      slices.push({
        blocks: blocks.slice(i + j * BATCH, i + (j + 1) * BATCH),
        offset: i + j * BATCH,
      });
    }

    const results = await Promise.allSettled(
      slices.map(async (slice) => {
        const texts = slice.blocks.map((b) => b.text);
        const translations = await translateBatchWithRetry(texts, cfg, {
          maxRetries: 2,
          baseDelay: 1000,
        });
        return { slice, translations };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const { slice, translations } = r.value;
        slice.blocks.forEach((b, idx) => {
          applyTranslation(b, translations[idx] || '', cfg.pageTranslateMode);
        });
      } else {
        failCount += BATCH;
        console.warn('[JZT] batch fail', r.reason);
      }
      done += r.status === 'fulfilled' ? r.value.slice.blocks.length : BATCH;
    }

    prog.style.width = (Math.min(done, blocks.length) / blocks.length) * 100 + '%';
    // Yield to the browser to keep UI responsive
    await new Promise((r) => setTimeout(r, 0));
  }

  setTimeout(() => bar.remove(), 1200);
  if (failCount) showToast(t('page_done_fail', { count: String(failCount) }));
  else showToast(t('page_done'));
  translating = false;
}

function applyTranslation(block, translation, mode) {
  const firstNode = block.nodes[0];
  const parent = firstNode.parentElement;
  if (!parent) return;

  if (mode === 'replace') {
    firstNode.nodeValue = translation;
    for (let k = 1; k < block.nodes.length; k++) {
      block.nodes[k].nodeValue = '';
    }
  } else {
    const last = block.nodes[block.nodes.length - 1];
    const span = document.createElement('span');
    span.className = 'jzt-tr';
    span.dataset.jzt = 'tr';
    span.textContent = translation;
    last.after(span);
    block.nodes.forEach((n) => {
      if (n.parentElement) n.parentElement.dataset.jzt = 'src';
    });
    if (parent) parent.classList.add('jzt-src-muted');
  }
}

// ── Right-click selection translation ──

function doRightClickSelectionTranslation() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) {
    showToast(t('select_text_first'));
    return;
  }
  const text = sel.toString().trim();
  if (!text || text.length < 1 || text.length > 5000) {
    showToast(t('invalid_selection'));
    return;
  }
  if (isLikelyUrl(text)) {
    showToast(t('no_url_translate'));
    return;
  }
  let node = sel.anchorNode;
  if (node && node.nodeType === 3) node = node.parentElement;
  if (isEditable(node)) {
    showToast(t('no_editable_translate'));
    return;
  }
  let rect;
  try {
    rect = sel.getRangeAt(0).getBoundingClientRect();
  } catch (e) {
    rect = {
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      width: 0,
      height: 0,
    };
  }
  doSelectionTranslation(text, rect);
}

// ── Message handlers ──

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'translate-page') {
    translatePage();
    sendResponse({ ok: true });
  } else if (msg.type === 'translate-selection') {
    doRightClickSelectionTranslation();
    sendResponse({ ok: true });
  } else if (msg.type === 'ping') {
    sendResponse({ ok: true });
  }
  return true;
});

// Watch for config changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.jzt_config) {
    console.log('[JZT] config updated');
  }
});

console.log('[JZT] content script loaded');
