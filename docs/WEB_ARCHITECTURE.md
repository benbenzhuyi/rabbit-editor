# 小野兔 Rabbit — Web 版架构设计

> 版本：v0.3-draft | 方案：纯静态站点 | 零后端依赖 | 经 Claude 评审修正

---

## 一、架构总览

```
┌──────────────────────────────────────────────────┐
│                     浏览器                         │
│  ┌────────────────────────────────────────────┐  │
│  │              Service Worker                 │  │
│  │          (离线缓存 + 存储代理)               │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  IndexedDB  │ │   OPFS   │ │  localStorage │  │
│  │  对话历史    │ │  文件系统 │ │  设置/最近文件  │  │
│  │  虚拟文件    │ │  用户项目 │ │  API Key      │  │
│  └────────────┘ └──────────┘ └───────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │         渲染层 (几乎完全复用)                 │  │
│  │  CodeMirror 6 / marked / highlight.js      │  │
│  │  AI 面板 / Ctrl+K / Ctrl+L / 大纲 / 搜索     │  │
│  │  左侧边栏 / 设置 / 主题                      │  │
│  └────────────────────────────────────────────┘  │
│                      │                           │
│                   fetch()                         │
│                      ↓                           │
│              AI API (直接调用)                     │
└──────────────────────────────────────────────────┘
```

**核心原则**：
- 不依赖任何服务端代码，一个静态 `index.html` 即可运行
- 尽可能复用桌面版 renderer/ 下的所有 JS 模块
- 用浏览器原生 API 替换 Electron IPC 通道

---

## 二、关键技术选型

| 桌面版 (Electron) | Web 版 | API 成熟度 |
|---|---|---|
| `fs.readFile/writeFile` | **File System Access API** | Chrome 86+, Edge 86+, Opera 72+ |
| `fs.readdir` (文件浏览器) | `showDirectoryPicker()` | Chrome 86+ |
| `dialog.showOpenDialog` | `showOpenFilePicker()` | Chrome 86+ |
| `dialog.showSaveDialog` | `showSaveFilePicker()` | Chrome 86+ |
| 系统路径读取 | **OPFS** (Origin Private File System) | Chrome 102+ |
| `mainWindow.setFullScreen` | **Fullscreen API** | 所有主流浏览器 |
| 主进程 `/v1/chat/completions` | **fetch()** 直连 | 所有浏览器 |
| 对话历史存储 | **IndexedDB** | 所有浏览器 |
| 用户设置存储 | **localStorage** | 所有浏览器 |
| 应用菜单栏 | 同现有 HTML 菜单 | — |
| 单实例锁 | Service Worker `clients.claim()` | Chrome 40+ |
| Electron Menu.setApplicationMenu | `<nav id="menubar">` (同现有) | — |
| `app.getPath('userData')` | `indexedDB.open('rabbit-editor')` | — |

---

## 三、浏览器存储体系

### 3.1 三层存储

```
┌───────────────────────────────────────────────┐
│           IndexedDB: rabbit-storage            │
│  ┌─────────────────────────────────────────┐  │
│  │ conversations  文件级对话历史   │  │
│  │   key: hashFileName + lastModified     │  │
│  │   value: { fileId, messages[],         │  │
│  │            createdAt, updatedAt }       │  │
│  ├─────────────────────────────────────────┤  │
│  │ virtualFiles   无 File System API 后备  │  │
│  │   key: fileHandleId (自增)              │  │
│  │   value: { name, content, mime, size }  │  │
│  └─────────────────────────────────────────┘  │
├───────────────────────────────────────────────┤
│        Origin Private File System (OPFS)       │
│  ┌─────────────────────────────────────────┐  │
│  │  当用户通过 showDirectoryPicker() 打开    │  │
│  │  文件夹后，OPFS 存储项目元数据：          │  │
│  │  - 最近打开的目录 handle 索引              │  │
│  │  - 文件修改时间戳缓存                     │  │
│  │  - 大纲缓存（加速大型文件解析）            │  │
│  └─────────────────────────────────────────┘  │
├───────────────────────────────────────────────┤
│              localStorage                      │
│  ┌─────────────────────────────────────────┐  │
│  │ settings      应用设置 JSON              │  │
│  │ recentFiles  最近 5 个文件路径/ID        │  │
│  │ apiKey       加密存储的 API Key (可选)   │  │
│  │ theme        当前主题 (dark/light)       │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

### 3.2 对话历史的键设计

**⚠️ 错误方案（不可用）**：
```javascript
// ❌ fileHandle.name 只是文件名，不同文件夹的同名文件会碰撞
const key = await hashFileName(fileHandle.name) + '_' + lastModified;
```

**正确方案：UUID 映射表**：
```javascript
// 在 IndexedDB 中建立 fileHandle → UUID 映射
// File System Access API 的 handle 对象没有原生的稳定 ID，
// 需要用 FileSystemHandle.isSameEntry() 做匹配查找

async function getFileUUID(fileHandle) {
  // 遍历所有已存 handle，用 isSameEntry() 做比对
  const allBindings = await db.getAll('fileBindings');
  for (const binding of allBindings) {
    if (await binding.handle.isSameEntry(fileHandle)) {
      return binding.uuid;
    }
  }
  // 未找到：生成新 UUID 并存储 handle + 绑定
  const uuid = crypto.randomUUID();
  await db.put('fileBindings', { handle: fileHandle, uuid, name: fileHandle.name });
  return uuid;
}

// 对话历史 key = 'conv_' + uuid，保证全局唯一
const convKey = 'conv_' + fileUUID;
```

### 3.3 Handle 持久化与权限恢复（关键坑点）

**File System Access API 的 Handle 无法序列化存入 OPFS**。但它们**可以**存入 IndexedDB（浏览器对此有特殊支持）：

```javascript
// ✅ 正确：将 handle 存入 IndexedDB
const db = await openDB('rabbit-handles', 1, {
  upgrade(db) { db.createObjectStore('handles'); }
});
await db.put('handles', dirHandle, 'currentDir');

// 恢复时需要重新请求权限
const savedHandle = await db.get('handles', 'currentDir');
if (savedHandle) {
  // 🔴 每次页面加载都必须重新授权
  const permission = await savedHandle.requestPermission({ mode: 'readwrite' });
  if (permission === 'granted') {
    // 可以继续使用
  } else {
    // 显示"重新授权"引导 UI
  }
}
```

**这对 UX 的影响**：用户每次刷新页面/重新打开标签页，都需要点一次"授权"弹窗。必须在 UI 上设计专门的"重新授权"引导流程（如状态栏显示"⚡ 点击恢复文件访问"），不能静默处理。

### 3.4 存储容量

| 存储方式 | 容量限制 |
|----------|---------|
| IndexedDB | ~ 浏览器总磁盘的 50-60%（通常 >10GB）|
| OPFS | 取决于可用磁盘空间 |
| localStorage | 5-10MB |

对于写作者的文本数据，完全够用。

---

## 四、文件系统方案

### 4.1 方案 A：File System Access API（推荐，Chrome/Edge）

```
用户点击 "打开文件夹" 或 Ctrl+Shift+O
         │
         ▼
showDirectoryPicker() ──→ 获取目录 handle (保存在 IndexedDB)
         │
         ▼
遍历目录下的 .md / .txt / .html 等文件
         │
    ┌────┴────┐
    │         │
    ▼         ▼
打开文件    写入文件
handle.     handle.
getFile()   createWritable()
    │              │
    ▼              ▼
editor.      editor.
setContent  getContent
```

**关键 API**:
- `window.showDirectoryPicker()` — 选择文件夹
- `window.showOpenFilePicker()` — 选择单个文件
- `window.showSaveFilePicker()` — 另存为
- `directoryHandle.getFileHandle(name, { create: true })` — 新建文件
- `fileHandle.createWritable()` — 写入

### 4.2 方案 B：Input + IndexedDB（通用后备）

当浏览器不支持 File System Access API（Firefox/Safari）时：

```
<input type="file" accept=".md,.txt,...">
         │
         ▼
  FileReader.readAsText()
         │
         ▼
  editor.setContent() ──→ 标记为 "虚拟文件"
         │
         ▼
  Ctrl+S ──→ 触发下载 (<a download>)
```

虚拟文件存储在 IndexedDB `virtualFiles` object store 中。

### 4.3 统一文件接口

```javascript
// fileAdapter.js — 屏蔽两种方案的差异
export const FileAdapter = {
  // 是否支持原生文件系统
  hasNativeFS: 'showDirectoryPicker' in window,

  // 打开文件
  async openFile() {
    if (hasNativeFS) return openWithFilePicker();
    return openWithInputFallback();
  },

  // 保存文件
  async saveFile(fileId, content, handle) {
    if (handle?.createWritable) {
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } else {
      saveToIndexedDB(fileId, content);
    }
  },

  // 列出目录
  async listDirectory(dirHandle) {
    const entries = [];
    for await (const [name, handle] of dirHandle) {
      entries.push({ name, handle, kind: handle.kind });
    }
    return entries.sort( /* 文件夹在前 */ );
  }
};
```

---

## 五、AI 请求方案

### 5.1 直连模式（当前桌面版逻辑）

```javascript
// 替换 main.js 的 ipcMain.handle('ai:request')
// 改为 aiClient.js 中直接 fetch
async function sendMessage(messages, config) {
  const url = config.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 2048,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  return json.choices?.[0]?.message?.content;
}
```

### 5.2 CORS 与网络可达性

| API 类型 | CORS | 网络可达性（中国大陆） | 解决方案 |
|----------|------|:---:|---------|
| OpenAI | 支持任意 Origin | **不通** | 需代理 |
| DeepSeek | 支持 CORS（需验证版本） | 正常 | 直连 |
| 阿里云百炼 | **不支持浏览器直连** | 正常 | 需 CORS 代理 |
| 智谱 GLM | **不支持浏览器直连** | 正常 | 需 CORS 代理 |
| llama.cpp | 默认不支持 | — | `--cors` 参数 |
| Ollama | 默认 localhost | — | `OLLAMA_ORIGINS=*` |

**🔴 关键问题：主要用户在中国大陆，OpenAI 域名本身不通。** 即使 CORS 没问题，也访问不到。

**解决方案：用户直接填写自定义 baseUrl**——这其实就是设置面板中已有的 `API 基础地址` 字段。大陆用户可以填自己的中转 API 地址（如 `https://my-proxy.example.com/v1`），aiClient.js 将该地址拼上 `/chat/completions` 发请求。不需要应用层做任何代理转发逻辑——纯静态站点也没有后端路由来实现 `/proxy/` 转发。不需要额外的 `proxyUrl` 字段。

### 5.3 API Key 安全（诚实说明）

**localStorage 存 API Key 本质上是明文等价的**。`SubtleCrypto` 加密的密钥也在同一 JS 上下文里，只对"他人直接打开 DevTools 看 Application 标签"这种低级威胁有防护作用。

如果页面被注入恶意 JS（XSS），加密毫无意义——攻击者可以直接调用你的 `sendMessage()` 函数。

**建议选项**：
- **默认**：localStorage 存储（方便，但不防 XSS）
- **安全模式**：每次会话输入，不持久化（最安全）
- **部署层面**：使用严格的 CSP（Content Security Policy）头限制脚本加载来源

---

## 六、项目目录结构

```
rabbit-editor-web/
├── index.html                    # 单文件入口 (含所有 HTML)
├── sw.js                         # Service Worker (离线缓存)
├── manifest.json                 # PWA manifest
├── assets/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── screenshot.png
├── renderer/                     # 从桌面版直接迁移
│   ├── styles/
│   │   ├── main.css
│   │   ├── editor.css
│   │   ├── sidebar.css
│   │   ├── ai-panel.css
│   │   └── search.css
│   └── js/
│       ├── app.js                # 入口，替换 IPC 调用为浏览器 API
│       ├── editor.js             # CodeMirror 6 (几乎不变)
│       ├── fileBrowser.js        # 文件浏览器 (替换 fs API)
│       ├── fileManager.js        # 拖拽处理 (不变)
│       ├── outline.js            # 大纲导航 (不变)
│       ├── aiPanel.js            # AI 面板 (不变)
│       ├── aiClient.js           # AI 客户端 (fetch 直连)
│       ├── ctrlKPopup.js         # Ctrl+K 浮窗 (不变)
│       ├── searchReplace.js      # 查找替换 (不变)
│       ├── settings.js           # 设置 (localStorage)
│       ├── statusbar.js          # 状态栏 (不变)
│       ├── menubar.js            # 菜单栏 (不变)
│       ├── keybindings.js        # 快捷键 (不变)
│       ├── fileAdapter.js        # 🆕 文件系统抽象层
│       ├── storage.js            # 🆕 IndexedDB 封装
│       └── platformInfo.js       # 🆕 平台能力检测
├── esbuild.config.js             # 构建配置
└── package.json
```

---

## 七、与桌面版的差异

### 7.1 需要重写的模块

| 模块 | 桌面版 | Web 版 | 改动量 |
|------|--------|--------|--------|
| `main.js` | Electron IPC | **删除** | 全部移除 |
| `preload.js` | contextBridge | **删除** | 全部移除 |
| `fileAdapter.js` | 不存在 | **新建** | 全部新增 |
| `storage.js` | 不存在 | **新建** | 全部新增 |
| `app.js` | 通过 preload 调 IPC | 直接调 fileAdapter | 约 20% |
| `fileBrowser.js` | IPC 调 fs | fileAdapter | 约 30% |
| `aiClient.js` | IPC 调 main | fetch 直连 | 约 10% |
| `settings.js` | IPC 读写文件 | localStorage | 约 30% |
| `keybindings.js` | (部分窗口模式 IPC) | Fullscreen API | 约 5% |

### 7.2 无需改动的模块

`editor.js`, `outline.js`, `aiPanel.js`, `ctrlKPopup.js`, `searchReplace.js`, `statusbar.js`, `menubar.js`, 所有 CSS

### 7.3 桌面版独有功能的 Web 替代

| 桌面版功能 | Web 版实现 | 备注 |
|-----------|-----------|------|
| 窗口模式 Ctrl+Shift+1/2/3 | CSS 显示/隐藏元素（同桌面版逻辑） | 与全屏无关，纯布局切换 |
| F11 全屏切换 | `element.requestFullscreen()` | Fullscreen API |
| 拖拽文件打开 | `dragover` + FileReader (已有) | 不变 |
| 命令行启动 | PWA 安装后桌面图标启动 | manifest.json |
| 托盘/最小化到系统栏 | PWA 不支持 | — |
| 系统级单实例 | Service Worker 可做同源单标签页 | — |

---

## 八、PWA 增强

### 8.1 manifest.json

```json
{
  "name": "小野兔 Rabbit",
  "short_name": "Rabbit",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e1e1e",
  "theme_color": "#1e1e1e",
  "icons": [
    { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 8.2 Service Worker

```
策略：Cache-First for 静态资源，Network-First for API
- 预缓存: index.html, bundle.js, 所有 CSS
- 运行时缓存: 图标、字体
- 不缓存: AI API 请求
```

---

## 九、部署方案

| 平台 | 方式 | 成本 |
|------|------|------|
| **GitHub Pages** | 直接 push 到 `gh-pages` 分支 | 免费 |
| **Vercel** | 连接 GitHub 仓库，自动部署 | 免费 |
| **Cloudflare Pages** | 同上 | 免费 |
| **Netlify** | 拖拽上传或 Git 连接 | 免费 |
| **自建服务器** | Nginx 托管静态文件 | 服务器费用 |

推荐 **GitHub Pages** + **Vercel** 双部署，零成本。

---

## 十、浏览器兼容性

| 功能 | Chrome | Edge | Firefox | Safari |
|------|:------:|:----:|:-------:|:------:|
| 基础编辑 (CodeMirror) | ✓ | ✓ | ✓ | ✓ |
| AI API (fetch) | ✓ | ✓ | ✓ | ✓ |
| File System Access API | ✓ 86+ | ✓ 86+ | ✗ | ✗ |
| OPFS | ✓ 102+ | ✓ 102+ | ✓ 111+ | ✓ 15.2+ |
| IndexedDB | ✓ | ✓ | ✓ | ✓ |
| Fullscreen API | ✓ | ✓ | ✓ | ✓ |
| PWA | ✓ | ✓ | ✗* | ✓ |

*Firefox PWA：桌面版不支持，移动版支持。

对于 Firefox/Safari 用户，自动降级到 IndexedDB 虚拟文件模式。

---

## 十一、构建方案：esbuild 打包

### 11.1 为什么需要打包

桌面版使用 ES module（`import ... from`），浏览器中不支持裸模块说明符（如 `import { keymap } from '@codemirror/view'`）。需要用 esbuild 将所有 JS 模块打包成单一 `bundle.js`，格式设为 IIFE：

```javascript
// esbuild.config.js
require('esbuild').build({
  entryPoints: ['renderer/js/app.js'],
  bundle: true,
  outfile: 'renderer/bundle.js',
  platform: 'browser',
  format: 'iife',
  minify: true,          // 生产环境压缩
  sourcemap: false,
}).catch(() => process.exit(1));
```

### 11.2 构建配置

```json
// package.json scripts
{
  "build": "esbuild renderer/js/app.js --bundle --outfile=renderer/bundle.js --platform=browser --format=iife",
  "build:prod": "esbuild renderer/js/app.js --bundle --outfile=renderer/bundle.js --platform=browser --format=iife --minify"
}
```

输出 `renderer/bundle.js` 可直接被 `index.html` 的 `<script src="bundle.js">` 加载，无需任何模块加载器。

---

## 十二、实施路线图

### 第一阶段：核心迁移（约 1 周）
- 删除 main.js / preload.js
- 创建 fileAdapter.js (File System Access API + IndexedDB 后备)
- 创建 storage.js (IndexedDB 封装：对话历史、虚拟文件、文件绑定映射表)
- 实现 Handle 权限恢复 UI 流程（刷新页面后的重新授权引导）
- 重写 app.js 中的文件操作
- 重写 settings.js (localStorage 替代)
- aiClient.js 直连 + 代理支持

### 第二阶段：兼容性补齐（约 1 周）
- File System Access API 不可用时的降级方案（input + IndexedDB）
- 虚拟文件："未保存"状态管理、Ctrl+S 触发下载、文件名冲突处理
- CORS 配置检测、浏览器兼容性检测页
- Firefox/Safari 降级模式测试
- 自动保存到 IndexedDB + dirty-state 追踪（防标签页崩溃丢内容）

### 第三阶段：PWA 化（约 0.5 周）
- manifest.json + sw.js
- Service Worker 缓存策略调试（Cache-First 静态资源）
- 安装提示 UI

### 第四阶段：部署与测试（约 0.5 周）
- GitHub Pages / Vercel 部署
- 端到端功能对比测试
- 大文件加载性能测试
- 编写 Web 版 README

### 总计：约 2-3 周（现实预估）

---

## 十二、局限与取舍

| 局限性 | 影响 | 缓解方案 |
|--------|------|---------|
| 无 File System Access 时 | 文件需导入/下载 | IndexedDB 持久化虚拟文件 |
| Handle 权限每次刷新需重新授权 | UX 摩擦 | 状态栏"恢复访问"引导 UI |
| 大陆用户无法直连 OpenAI | API 不可用 | 设置中提供代理地址字段 |
| 国内 API 多不支持 CORS | 无法浏览器直连 | 提供 CORS 代理配置选项 |
| 无原生拖拽到系统 | 拖拽只能接收，不能拖出 | 不实现 |
| 浏览器标签页崩溃 | 未保存内容可能丢失 | 自动保存到 IndexedDB + dirty-state 追踪 |
| API Key 本地存储 = 明文 | XSS 攻击可窃取 | CSP 防护 + "每次会话输入"模式 |
| 无后台运行 | 关闭标签页 = 关闭应用 | PWA standalone 模式减少意外关闭 |
| 同名文件在不同文件夹 | 对话历史可能碰撞 | UUID 映射表解决 |

---

## 十三、数据流对比

### 桌面版
```
renderer → preload.js → IPC → main.js → fs / fetch
                                      → dialog
                                      → Menu
```

### Web 版
```
renderer → fileAdapter.js → File System Access API / IndexedDB
         → aiClient.js    → fetch(url)
         → settings.js    → localStorage
         → storage.js     → IndexedDB
```

数据流更简单，调用链更短，调试更方便。

---

## 十四、结论

Web 版完全可行，且改动量远小于直觉——渲染层 80%+ 代码可复用。核心工作是：

1. 用 3 个新模块（fileAdapter, storage, platformInfo）替换 main.js + preload.js
2. 微调 app.js、fileBrowser.js、settings.js、aiClient.js
3. 添加 PWA 包装

这也是方案 1 优于方案 2 的原因——不需要任何服务端代码，部署只是复制静态文件。

---

*文档版本：v0.3-draft | 状态：架构设计（经 Claude 二审修正）*

---

## 附录 A：v0.2 修正清单

| # | 问题 | v0.1 原文 | v0.2 修正 |
|---|------|----------|----------|
| 1 | Handle 持久化 | "OPFS 存储 handle 索引" | 修正为 IndexedDB 存储 + `requestPermission()` 恢复流程 |
| 2 | 对话 Key 碰撞 | `hashFileName(fileHandle.name)` | 改为 UUID 映射表方案 |
| 3 | CORS/网络 | OpenAI/DeepSeek "直连 ✓" | 补充大陆网络现实、国内 API CORS 问题、代理地址字段 |
| 4 | 实施时间 | "约 1 周" | 修正为 "约 2-3 周" |
| 5 | API Key 安全 | "SubtleCrypto 加密" | 诚实说明：localStorage = 明文等价，SubtleCrypto 只防低级威胁 |
| 6 | 窗口模式映射 | "Fullscreen API + CSS" | 修正为纯 CSS 布局切换 |
| 7 | 构建流程 | 缺失 | 新增第十一章：esbuild 构建方案 |
| 8 | 局限表 | 6 项 | 扩展为 9 项，新增权限摩擦、大陆网络、密钥安全诚实说明等 |

### v0.3 修正清单

| # | 问题 | 修正 |
|---|------|------|
| 1 | 3.3/3.4 标题编号重复 | 合并为一个 3.4 |
| 2 | 4.1 流程图 OPFS 注释 | 改为 IndexedDB |
| 3 | 5.2 伪代理代码 | 删除，改为"用户填自定义 baseUrl 即可" |
| 4 | `getHandleKey()` 未定义 | 改为 `FileSystemHandle.isSameEntry()` 遍历匹配，补充完整实现 |
