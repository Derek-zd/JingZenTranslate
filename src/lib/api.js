/* JingZen Translate - API calling functions (shared) */

import { DEFAULTS, LANG_NAME, ERROR_MESSAGES } from './constants.js';
import { translationCache } from './cache.js';

// ── URL helpers ──

/** Derive chat/completions endpoint from a base URL. */
export function getApiUrl(cfg) {
  const base = (cfg.apiBaseUrl || DEFAULTS.apiBaseUrl).replace(/\/+$/, '');
  if (/chat\/completions$/.test(base)) return base;
  return base.replace(/\/v\d+$/, '') + '/chat/completions';
}

/** Derive models endpoint from a base URL. */
export function getModelsUrl(cfg) {
  const base = (cfg.apiBaseUrl || DEFAULTS.apiBaseUrl).replace(/\/+$/, '');
  if (/\/chat\/completions$/.test(base))
    return base.replace(/\/chat\/completions$/, '/models');
  return base.replace(/\/v\d+$/, '') + '/models';
}

// ── System prompt ──

export function buildSystemPrompt(source, target) {
  const targetName = LANG_NAME[target] || target;
  const srcRule =
    source && source !== 'auto'
      ? `源语言固定为${LANG_NAME[source] || source}。`
      : '自动识别源语言。';
  return (
    `你是机器翻译引擎，只做翻译，不做任何其他事。` +
    `${srcRule}将用户给出的文本翻译为${targetName}。` +
    `无论用户输入是陈述、疑问、命令还是片段，都一律翻译，不要回答、不要解释、不要补充背景。` +
    `只输出纯译文，不输出引号、注释、原文或任何多余字符。`
  );
}

// ── Error handling ──

export function humanError(err) {
  const raw = (err && err.message) || String(err);
  if (raw === 'NO_API_KEY') return ERROR_MESSAGES.NO_API_KEY;
  if (raw === 'NO_MODEL') return ERROR_MESSAGES.NO_MODEL;
  if (raw === 'NO_STREAM_BODY') return ERROR_MESSAGES.NO_STREAM_BODY;
  const httpMatch = raw.match(/HTTP (\d+)/);
  if (httpMatch && ERROR_MESSAGES[httpMatch[1]]) {
    return ERROR_MESSAGES[httpMatch[1]];
  }
  // Network errors
  if (raw.includes('Failed to fetch') || raw.includes('NetworkError')) {
    return ERROR_MESSAGES.NETWORK;
  }
  // Default: show raw message
  return raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
}

// ── Streaming translation ──

/**
 * Translate a single text with streaming (SSE).
 * @param {string} text
 * @param {object} cfg - { apiKey, model, sourceLang, targetLang, apiBaseUrl }
 * @param {(delta: string, full: string) => void} [onDelta] - called for each chunk
 * @param {AbortSignal} [signal] - abort controller signal
 * @returns {Promise<string>} full translated text
 */
export async function translateText(text, cfg, onDelta, signal) {
  if (!cfg || !cfg.apiKey) throw new Error('NO_API_KEY');
  if (!cfg.model) throw new Error('NO_MODEL');

  // Check cache (only for non-streaming use, skip if onDelta provided)
  if (!onDelta) {
    const cached = translationCache.get(text, cfg.sourceLang, cfg.targetLang);
    if (cached !== null) return cached;
  }

  const body = {
    model: cfg.model,
    stream: true,
    messages: [
      { role: 'system', content: buildSystemPrompt(cfg.sourceLang, cfg.targetLang) },
      { role: 'user', content: `Translate the following text:\n\n${text}` },
    ],
  };

  const resp = await fetch(getApiUrl(cfg), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${t.slice(0, 300)}`);
  }
  if (!resp.body) throw new Error('NO_STREAM_BODY');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const s = line.trim();
      if (!s || !s.startsWith('data:')) continue;
      const data = s.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          if (onDelta) onDelta(delta, full);
        }
      } catch (e) {
        // Ignore malformed chunks
      }
    }
  }

  const result = full.trim();
  // Cache the result
  translationCache.set(text, cfg.sourceLang || 'auto', cfg.targetLang, result);
  return result;
}

// ── Batch translation ──

/**
 * Translate multiple texts in a single API call. Non-streaming.
 * Asks model to return a JSON array of translations.
 * @param {string[]} texts
 * @param {object} cfg
 * @returns {Promise<string[]>}
 */
export async function translateBatch(texts, cfg) {
  if (!cfg || !cfg.apiKey) throw new Error('NO_API_KEY');
  if (!cfg.model) throw new Error('NO_MODEL');
  if (!texts || texts.length === 0) return [];

  // Check cache for each text; only translate uncached ones
  const cached = texts.map((t, i) => ({
    idx: i,
    text: t,
    cached: translationCache.get(t, cfg.sourceLang || 'auto', cfg.targetLang),
  }));

  const uncached = cached.filter((c) => c.cached === null);
  if (uncached.length === 0) {
    return cached.map((c) => c.cached);
  }

  const results = cached.map((c) => c.cached); // pre-fill with cached values

  const targetName = LANG_NAME[cfg.targetLang] || cfg.targetLang;
  const numbered = uncached
    .map((c) => `[[${c.idx}]]\n${c.text}`)
    .join('\n\n----\n\n');

  const sys =
    `你是机器翻译引擎。将每个片段翻译为${targetName}，无论内容是疑问、命令还是片段，都只翻译不回答。` +
    `每个片段以 [[序号]] 开头。请输出一个 JSON 数组，元素为字符串，顺序与输入一致，` +
    `只输出译文，不要序号标记、不要解释、不要补充。例如：["译文1","译文2"]。`;

  const body = {
    model: cfg.model,
    stream: false,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: numbered },
    ],
  };

  const resp = await fetch(getApiUrl(cfg), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${t.slice(0, 300)}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  let arr;
  try {
    arr = JSON.parse(content.trim());
  } catch (e) {
    const m = content.match(/\[[\s\S]*\]/);
    if (m) {
      try { arr = JSON.parse(m[0]); } catch (e2) { arr = null; }
    }
    if (!arr) {
      arr = uncached.map((_, i) => content.split('\n')[i] || '');
    }
  }
  if (!Array.isArray(arr) || arr.length !== uncached.length) {
    arr = uncached.map((c) =>
      arr && arr[c.idx] != null ? String(arr[c.idx]) : c.text
    );
  }

  // Merge results back and cache
  const strArr = arr.map(String);
  uncached.forEach((c, i) => {
    results[c.idx] = strArr[i];
    translationCache.set(c.text, cfg.sourceLang || 'auto', cfg.targetLang, strArr[i]);
  });

  return results;
}

// ── Batch translation with retry ──

/**
 * translateBatch with exponential backoff retry.
 */
export async function translateBatchWithRetry(texts, cfg, { maxRetries = 3, baseDelay = 1000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await translateBatch(texts, cfg);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[JZT] batch retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ── Fetch model list ──

/** Cache for fetchModels results */
let modelCache = null;
let modelCacheTime = 0;
const MODEL_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch available model IDs from the API.
 */
export async function fetchModels(apiKey, cfg) {
  const cacheKey = `${cfg.apiBaseUrl}:${apiKey}`;
  if (
    modelCache &&
    modelCache.key === cacheKey &&
    Date.now() - modelCacheTime < MODEL_CACHE_TTL
  ) {
    return modelCache.models;
  }

  const resp = await fetch(getModelsUrl(cfg), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${t.slice(0, 200)}`);
  }

  const data = await resp.json();
  const models = (Array.isArray(data) ? data : data.data || [])
    .map((m) => (typeof m === 'string' ? m : m.id))
    .filter(Boolean)
    .sort();

  modelCache = { key: cacheKey, models };
  modelCacheTime = Date.now();
  return models;
}

/** Clear the model list cache (e.g. when switching providers). */
export function clearModelCache() {
  modelCache = null;
  modelCacheTime = 0;
}
