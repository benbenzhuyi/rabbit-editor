# 小野兔 Rabbit

轻量化 AI 辅助 Markdown 编辑器，专为写作者设计。

## 特性

- **沉浸写作** — 深色主题，所有高频操作支持快捷键
- **AI 原生** — Ctrl+K 浮动润色/续写，Ctrl+L 引用到 AI，右侧对话面板
- **大纲驱动** — 自动解析 H1-H6 标题，点击跳转，折叠展开
- **本地优先** — 默认连接 llama.cpp/Ollama，支持 OpenAI 兼容 API（DeepSeek 等）
- **Markdown 增强** — CodeMirror 6 源码增强渲染 + marked 预览模式

## 安装

### 开发运行

```bash
git clone https://github.com/你的用户名/small-rabbit-editor.git
cd small-rabbit-editor
npm install
npm start
```

### 构建安装包

```bash
npm run pack
```

## AI 模型配置

| 模型 | API 基础地址 |
|------|-------------|
| llama.cpp | `http://localhost:8080/v1` |
| Ollama | `http://localhost:11434/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| OpenAI | `https://api.openai.com/v1` |

## 快捷键速查

| 快捷键 | 功能 |
|--------|------|
| Ctrl+N / Ctrl+O / Ctrl+S | 新建 / 打开 / 保存 |
| Ctrl+K | 浮动窗口快速修改（润色/续写） |
| Ctrl+L | 引用选中文本到 AI 对话框 |
| Ctrl+F / Ctrl+H | 查找 / 替换 |
| Ctrl+Shift+P | 源码 / 预览切换 |
| Ctrl+B / Ctrl+J | 左侧边栏 / 右侧 AI 面板 |
| Ctrl+Shift+1/2/3 | 窗口模式切换 |
| F11 | 循环窗口模式 |
| Ctrl+, | 打开设置 |

## 技术栈

- Electron
- CodeMirror 6
- marked + highlight.js
- 原生 HTML/CSS/JS

## License

MIT
