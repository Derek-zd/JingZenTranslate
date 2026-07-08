/* JingZen Translate - provider list and helpers */

export const PROVIDERS = [
  { name: 'DeepSeek',     url: 'https://api.deepseek.com' },
  { name: 'OpenAI',       url: 'https://api.openai.com/v1' },
  { name: '智谱 GLM',     url: 'https://open.bigmodel.cn/api/paas/v4' },
  { name: '阿里百炼',     url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { name: 'Moonshot',     url: 'https://api.moonshot.cn/v1' },
  { name: 'MiniMax',      url: 'https://api.minimax.chat/v1' },
  { name: 'Ollama 本地',  url: 'http://localhost:11434/v1' },
  { name: '美团 LongCat', url: 'https://api.longcat.chat/openai' },
  { name: '火山引擎',     url: 'https://ark.cn-beijing.volces.com/api/v3' },
  { name: 'SiliconFlow',  url: 'https://api.siliconflow.cn/v1' },
];

export const CUSTOM = '__custom__';

const presetUrls = new Set(
  PROVIDERS.map((p) => p.url.replace(/\/+$/, '').toLowerCase())
);

/**
 * Match a URL to a preset provider. Returns the preset URL if found, or CUSTOM.
 */
export function matchProvider(url) {
  if (!url) return CUSTOM;
  const norm = url.replace(/\/+$/, '').toLowerCase();
  const hit = PROVIDERS.find(
    (p) => p.url.replace(/\/+$/, '').toLowerCase() === norm
  );
  return hit ? hit.url : CUSTOM;
}

/**
 * Check if a URL is a preset provider URL.
 */
export function isPresetUrl(url) {
  if (!url) return false;
  return presetUrls.has(url.replace(/\/+$/, '').toLowerCase());
}

/**
 * Get a human-readable provider name for a URL.
 */
export function getProviderName(url, savedProviders) {
  if (!url) return '';
  const sp = (savedProviders || {})[url];
  if (sp && sp.name) return sp.name;
  const norm = url.replace(/\/+$/, '').toLowerCase();
  const p = PROVIDERS.find(
    (p) => p.url.replace(/\/+$/, '').toLowerCase() === norm
  );
  if (p) return p.name;
  try { return new URL(url).hostname; } catch (e) { return url; }
}
