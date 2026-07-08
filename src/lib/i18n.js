/* JingZen Translate - lightweight i18n
 * Auto-detects browser language; defaults to Chinese.
 */

const messages = {
  zh: {
    // Popup
    popup_title: 'JingZen Translate',
    provider_label: '供应商',
    model_label: '模型',
    selection_label: '划词翻译',
    page_mode_label: '整页模式',
    bilingual: '双语对照',
    replace: '替换原文',
    translate_page: '翻译本页',
    open_settings: '打开设置',
    shortcut_hint: '快捷键 Ctrl+Shift+Y',
    warn_no_config: '尚未配置 API Key 和模型，请先打开设置。',
    warn_no_key: '尚未配置 API Key，请先打开设置。',
    warn_no_model: '尚未配置模型，请先打开设置。',

    // Options
    options_title: 'JingZen Translate 设置',
    options_subtitle: '基于大模型 API 的浏览器翻译，兼容 OpenAI 协议',
    provider_title: 'API 提供商',
    api_url_label: 'API 地址',
    api_key_label: 'API Key',
    edit_key: '修改',
    confirm_key: '确认',
    model_title: '模型',
    model_placeholder: '输入或选择模型名称…',
    model_hint_default: '选择提供商并确认后自动获取模型列表',
    model_hint_loading: '正在获取模型列表…',
    model_hint_fetched: '已获取 {count} 个模型，可点击 ▾ 展开选择或直接输入',
    model_hint_empty: '未获取到模型，请手动输入模型 ID',
    model_hint_error: '获取失败：{error}，请手动输入模型 ID',
    model_hint_no_key: '请填写 API Key 后确认以获取模型列表',
    model_no_match: '没有匹配的模型',
    model_no_data: '暂无模型，请手动输入',
    source_lang: '源语言',
    target_lang: '目标语言',
    auto_detect: '自动检测',
    page_mode: '整页翻译模式',
    selection_enabled: '启用划词翻译',
    save: '保存',
    saved: '已保存',
    test: '测试连接',
    testing: '测试中…',
    test_success: '成功：{result}',
    test_fail: '失败：{error}',
    reset: '重置所有配置',
    reset_confirm: '确定要重置所有配置吗？此操作不可撤销。',
    reset_done: '已重置，刷新页面生效',
    modal_add_title: '添加自定义供应商',
    modal_edit_title: '编辑自定义供应商',
    modal_name_label: '名称',
    modal_url_label: 'API 地址',
    modal_name_placeholder: '例如：我的服务器',
    modal_url_placeholder: 'https://…',
    modal_cancel: '取消',
    modal_confirm: '确认',
    modal_name_required: '请输入供应商名称',
    modal_url_required: '请输入 API 地址',
    custom_provider: '自定义…',
    custom_suffix: ' (自定义)',
    key_required: '请填写 API Key',
    model_required: '请先输入模型名称',
    url_required: '请先填写 API 地址',

    // Content
    translating: '翻译中…',
    copy: '复制',
    copied: '已复制译文',
    translate_failed: '翻译失败',
    no_api_key_popup: '尚未配置 API Key',
    no_model_popup: '未选择模型',
    no_model_hint: '请刷新页面或打开设置页重新保存',
    go_settings: '去设置',
    page_translating: '正在翻译中，请稍候…',
    no_translatable: '页面无可翻译内容',
    page_done: '整页翻译完成',
    page_done_fail: '翻译完成，{count} 段失败',
    toggled_back: '已切换回原文',
    select_text_first: '请先选中文本',
    invalid_selection: '选中文本不合法',
    no_url_translate: '不支持翻译链接地址',
    no_editable_translate: '不支持翻译可编辑区域',

    // Right-click menu
    context_translate_selection: '用 JingZen 翻译选区',
    context_translate_page: '用 JingZen 翻译整页',
  },

  en: {
    popup_title: 'JingZen Translate',
    provider_label: 'Provider',
    model_label: 'Model',
    selection_label: 'Selection',
    page_mode_label: 'Page Mode',
    bilingual: 'Bilingual',
    replace: 'Replace',
    translate_page: 'Translate Page',
    open_settings: 'Settings',
    shortcut_hint: 'Shortcut Ctrl+Shift+Y',
    warn_no_config: 'API Key and model not configured. Please open settings.',
    warn_no_key: 'API Key not configured. Please open settings.',
    warn_no_model: 'Model not selected. Please open settings.',

    options_title: 'JingZen Translate Settings',
    options_subtitle: 'Browser translation via LLM APIs, OpenAI compatible',
    provider_title: 'API Provider',
    api_url_label: 'API URL',
    api_key_label: 'API Key',
    edit_key: 'Edit',
    confirm_key: 'Confirm',
    model_title: 'Model',
    model_placeholder: 'Enter or select model name…',
    model_hint_default: 'Select a provider and confirm to fetch model list',
    model_hint_loading: 'Fetching model list…',
    model_hint_fetched: '{count} models loaded. Click ▾ to select or type directly',
    model_hint_empty: 'No models found. Please enter model ID manually',
    model_hint_error: 'Fetch failed: {error}. Please enter model ID manually',
    model_hint_no_key: 'Enter API Key and confirm to fetch model list',
    model_no_match: 'No matching models',
    model_no_data: 'No models available, enter manually',
    source_lang: 'Source Language',
    target_lang: 'Target Language',
    auto_detect: 'Auto Detect',
    page_mode: 'Page Translation Mode',
    selection_enabled: 'Enable Selection Translation',
    save: 'Save',
    saved: 'Saved',
    test: 'Test Connection',
    testing: 'Testing…',
    test_success: 'Success: {result}',
    test_fail: 'Failed: {error}',
    reset: 'Reset All Settings',
    reset_confirm: 'Are you sure you want to reset all settings? This cannot be undone.',
    reset_done: 'Settings reset. Refreshing…',
    modal_add_title: 'Add Custom Provider',
    modal_edit_title: 'Edit Custom Provider',
    modal_name_label: 'Name',
    modal_url_label: 'API URL',
    modal_name_placeholder: 'e.g. My Server',
    modal_url_placeholder: 'https://…',
    modal_cancel: 'Cancel',
    modal_confirm: 'Confirm',
    modal_name_required: 'Please enter a provider name',
    modal_url_required: 'Please enter an API URL',
    custom_provider: 'Custom…',
    custom_suffix: ' (Custom)',
    key_required: 'Please enter an API Key',
    model_required: 'Please enter a model name',
    url_required: 'Please enter an API URL',

    context_translate_selection: 'Translate selection with JingZen',
    context_translate_page: 'Translate page with JingZen',
  },
};

/** Detect browser language; default to zh. */
function detectLang() {
  try {
    return (navigator.language || 'zh').startsWith('zh') ? 'zh' : 'en';
  } catch (e) {
    return 'zh';
  }
}

const lang = detectLang();

/**
 * Get a translated message by key. Supports simple {key} interpolation.
 */
export function t(key, vars) {
  let msg = (messages[lang] && messages[lang][key]) || messages.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(`{${k}}`, v);
    }
  }
  return msg;
}

/**
 * Get the current language code ('zh' or 'en').
 */
export function currentLang() {
  return lang;
}
