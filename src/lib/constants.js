/* JingZen Translate - shared constants */

export const DEFAULTS = {
  apiKey: '',
  savedProviders: {},  // { url: { name, apiKey, model }, ... }
  apiBaseUrl: 'https://api.deepseek.com',
  model: '',
  targetLang: 'zh',
  sourceLang: 'auto',
  pageTranslateMode: 'bilingual', // "bilingual" | "replace"
  selectionEnabled: true,
};

export const LANG_NAME = {
  zh: '中文', en: '英文', ja: '日文', ko: '韩文',
  fr: '法文', de: '德文', es: '西班牙文', ru: '俄文',
};

// HTML tags to treat as block-level for full-page translation grouping
export const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER',
  'FIGCAPTION', 'DT', 'DD', 'SUMMARY', 'LABEL', 'CAPTION',
]);

// HTML tags to skip entirely during page translation
export const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT',
  'BUTTON', 'OPTION', 'SVG', 'CANVAS', 'CODE', 'KBD', 'OBJECT', 'EMBED',
]);

// User-friendly error messages for HTTP status codes
export const ERROR_MESSAGES = {
  400: '请求参数错误，请检查 API 地址与模型名称',
  401: 'API Key 无效，请检查设置',
  402: 'API 账户余额不足',
  403: 'API 访问被拒绝，请检查账户权限',
  404: 'API 端点不存在，请检查 API 地址',
  429: '请求过于频繁，请稍后重试',
  500: 'API 服务器错误，请稍后重试',
  502: 'API 网关错误，请稍后重试',
  503: 'API 服务暂时不可用',
  NO_API_KEY: '请先在设置页配置 API Key',
  NO_MODEL: '请先在设置页选择模型',
  NO_STREAM_BODY: 'API 未返回流式响应',
  NETWORK: '网络错误，请检查连接',
};
