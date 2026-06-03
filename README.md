# 小野兔 Rabbit

轻量化 AI 辅助 Markdown 编辑器，专为 AI 写作者设计。

> 版本：v0.4.0 | License: MIT

![小野兔 Rabbit 截图](rabbit-edit.png)

## 特性

- **沉浸写作** — 深色/浅色主题可切换，所有高频操作支持快捷键
- **AI 原生** — Ctrl+K 浮动润色/续写，Ctrl+L 引用到 AI，右侧对话面板（编辑/刷新/重提交）
- **大纲驱动** — 自动解析 H1-H6 标题，彩色层级，点击跳转不抢焦点
- **本地优先** — 默认连接 llama.cpp/Ollama，支持 OpenAI / DeepSeek / Claude 等在线 API
- **Markdown 增强** — CodeMirror 6 源码增强渲染 + marked 预览模式
- **文件浏览器** — 目录树导航，右键菜单，双击重命名，点击不抢焦点
- **多模型切换** — AI 面板底部下拉选择模型，状态栏实时显示当前模型和温度
- **自定义提示词** — 设置中可编辑各模式的系统提示词

## 安装

### 下载使用

前往 [Releases](https://github.com/benbenzhuyi/rabbit-editor/releases) 下载对应平台的安装包：

| 平台 | 文件 |
|------|------|
| Windows x64 | `rabbit-editor-0.4.0-win-x64.zip`（解压后双击 `小野兔 Rabbit.exe`） |
| Linux x64 | `rabbit-editor-0.4.0-linux-x64.tar.gz`（解压后运行 `./small-rabbit-editor`） |

### 开发运行

```bash
git clone https://github.com/benbenzhuyi/rabbit-editor.git
cd rabbit-editor
npm install
npm start
```

## AI 模型配置

| 模型 | API 基础地址 | 模型名称 |
|------|-------------|---------|
| llama.cpp | `http://localhost:8080/v1` | `local-model` |
| Ollama | `http://localhost:11434/v1` | `llama3` 等 |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` / `deepseek-reasoner` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` / `gpt-4o-mini` |
| Claude (兼容) | 兼容 API 地址 | `claude-sonnet-4-20250514` |

在设置面板（Ctrl+, 或状态栏 ⚙ 设置）中配置 API 地址、Key 和模型名称。

## 快捷键速查

### 文件操作
| 快捷键 | 功能 |
|--------|------|
| Ctrl+N | 新建文件 |
| Ctrl+O | 打开文件 |
| Ctrl+S | 保存 |
| Ctrl+Shift+S | 另存为 |
| Ctrl+W | 关闭文件 |

### 编辑操作
| 快捷键 | 功能 |
|--------|------|
| Ctrl+Z / Ctrl+Y | 撤销 / 重做 |
| Ctrl+X / Ctrl+C / Ctrl+V | 剪切 / 复制 / 粘贴 |
| Ctrl+A | 全选 |
| Ctrl+D | 复制当前行 |
| Ctrl+Shift+K | 删除当前行 |
| Alt+Up / Alt+Down | 移动当前行 |
| Ctrl+Shift+W | 切换自动换行 |

### AI 辅助
| 快捷键 | 功能 |
|--------|------|
| Ctrl+K | 浮动窗口快速修改（润色/续写/翻译） |
| Ctrl+L | 引用选中文本到 AI 对话框 |
| Ctrl+Shift+C | 复制最后 AI 回复 |
| Ctrl+Shift+T | 替换选中为 AI 回复 |
| Ctrl+Shift+I | 插入 AI 回复到后方 |
| Alt+L | 聚焦 AI 输入框 |

### 视图操作
| 快捷键 | 功能 |
|--------|------|
| Ctrl+B / Ctrl+J | 左侧边栏 / 右侧 AI 面板 |
| Ctrl+Shift+P | 源码 / 预览切换 |
| Ctrl+Shift+1/2/3 | 正常 / 全屏有菜单 / 极简全屏 |
| F11 | 循环窗口模式 |
| Ctrl+Alt+T | 切换深色/浅色主题 |
| Ctrl+= / Ctrl+- / Ctrl+0 | 放大 / 缩小 / 重置缩放 |

### 查找替换
| 快捷键 | 功能 |
|--------|------|
| Ctrl+F | 查找 |
| Ctrl+H | 替换 |
| Enter / Shift+Enter | 下一个 / 上一个匹配 |
| Esc | 关闭 |

### 大纲导航
| 快捷键 | 功能 |
|--------|------|
| Alt+Shift+1~6 | 折叠到指定标题级别 |
| Alt+Shift+9 | 展开所有 |

### 其他
| 快捷键 | 功能 |
|--------|------|
| Ctrl+, | 打开设置 |

## 技术栈

- **桌面框架**: Electron v36
- **编辑器**: CodeMirror 6 + @codemirror/lang-markdown
- **渲染**: marked + highlight.js
- **构建**: esbuild + electron-builder
- **前端**: 原生 HTML/CSS/JS（无框架）

## 功能开发手册

完整的功能说明、架构文档和开发指南参见 [DEVELOPMENT_MANUAL.md](DEVELOPMENT_MANUAL.md)。

## License

MIT
