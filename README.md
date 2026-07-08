# JingZen Translate

基于大模型 API 的浏览器翻译插件（Edge/Chrome）。无服务端，API Key 仅保存在本地浏览器。

## 功能

- **划词翻译**：选中网页文本，自动在选区下方弹出流式译文浮层，支持复制。
- **整页翻译**：一键翻译整页，支持「双语对照」和「直接替换」两种模式。
- **多供应商**：支持 DeepSeek、OpenAI、智谱 GLM、阿里百炼、Moonshot、MiniMax、Ollama、LongCat、火山引擎、SiliconFlow 及自定义供应商。
- **快捷键**：`Ctrl+Shift+Y`（Mac `⌘+Shift+Y`）翻译当前页面。
- **右键菜单**：在页面或选区上右键触发翻译。
- **翻译缓存**：重复文本自动复用缓存，节省 API 费用。
- **中英双语界面**：根据浏览器语言自动切换。

## 安装（开发模式）

1. 克隆仓库并安装依赖：
   ```bash
   npm install
   npm run build
   ```
2. 打开 `edge://extensions`（或 `chrome://extensions`）。
3. 右上角开启「开发人员模式」。
4. 点击「加载解压缩的扩展」，选择项目根目录（含 `manifest.json`，指向 `dist/`）。
5. 点击工具栏图标 →「打开设置」，填入 API Key，点「测试连接」验证。

## 开发

```bash
npm run dev    # 监听文件变化自动构建
npm run build  # 单次构建
npm run release  # 生产构建 + 打包 zip
```

## 文件结构

```
manifest.json
package.json
build.js
src/
  lib/
    config.js       # 配置读写（chrome.storage）
    api.js          # API 调用：translateText, translateBatch, fetchModels
    constants.js    # 常量：默认值、语言映射、HTML 标签集合
    providers.js    # 供应商列表与匹配
    cache.js        # LRU 翻译缓存
    i18n.js         # 中英双语
  background/
    service-worker.js   # 右键菜单 / 快捷键 / 首次安装引导
  content/
    content.js + .css   # 划词浮层 + 整页翻译 DOM 改写
  options/
    options.js + .html + .css  # 设置页
  popup/
    popup.js + .html + .css    # 工具栏弹窗
icons/
dist/               # 构建输出（gitignore）
```

## 隐私

本插件不收集任何个人信息。API Key 仅保存在本地浏览器中。网页文本发送到用户配置的第三方 API。详见 [PRIVACY.md](./PRIVACY.md)。

## License

MIT
