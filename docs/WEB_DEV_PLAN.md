# 小野兔 Rabbit — Web 版开发计划

> 版本：v0.1 | 基于架构设计 v0.3 | 实施周期：2-3 周

---

## 一、前置准备

### 1.1 新仓库初始化

```
rabbit-editor-web/
├── index.html              ← 从 renderer/index.html 迁移
├── sw.js                   ← 新建，空壳
├── manifest.json           ← 新建
├── package.json            ← 精简，只保留 esbuild
├── esbuild.config.js       ← 新建
├── renderer/
│   ├── bundle.js           ← 构建产物
│   ├── styles/             ← 从桌面版完整复制
│   └── js/                 ← 迁移 + 新增
└── .gitignore
```

### 1.2 环境准备

- 安装 Node.js
- `npm init`，只装 `esbuild` 一个依赖
- 配置 `package.json` scripts

---

## 二、模块开发（按依赖顺序）

### Phase 0：基础设施层（第 1-2 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| **P0.1** | `renderer/js/platformInfo.js` | 浏览器能力检测：`showDirectoryPicker` 支持、OPFS 支持、File System Access API 支持、PWA 安装支持 |
| **P0.2** | `renderer/js/storage.js` | IndexedDB 封装。3 个 object store：`fileBindings`（handle→UUID 映射）、`conversations`（对话历史）、`virtualFiles`（虚拟文件）。每个 store 提供 `get/put/delete/getAll` 方法 |
| **P0.3** | `renderer/js/fileAdapter.js` | 文件系统抽象层。提供统一的 `openFile/openFolder/saveFile/listDirectory/createFile/renameFile/deleteFile/readFile` 接口。内部 WebKit 引擎 File System Access API ↔ 降级到 `<input>` + IndexedDB |
| **P0.4** | `renderer/js/platformInfo.js` | 检测能力：`hasNativeFS` / `hasOPFS` / `pwaAvailable`。暴露一个 `platform.capabilities` 对象供其他模块查询 |

**验收标准**：
- `FileSystemHandle.isSameEntry()` 遍历匹配正确工作
- 降级模式下 `<input>` 能正确触发文件读取和下载
- 打开文件夹能列出本地和索引库两种来源

---

### Phase 1：数据层（第 3-5 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| **P1.1** | `renderer/js/storage.js` | 完成 `fileBindings` store（handle→UUID 映射），实现 `isSameEntry()` 遍历匹配 |
| **P1.2** | `renderer/js/storage.js` | 完成 `conversations` store：对话历史的增删改查、每文件最多保留 100 条、超出自动裁剪最早记录 |
| **P1.3** | `renderer/js/storage.js` | 完成 `virtualFiles` store：文件读写、文件名冲突检测（同名+1） |
| **P1.4** | `renderer/js/fileAdapter.js` | Handle 权限恢复：`handle.requestPermission({ mode: 'readwrite' })`，失败时显示引导 UI |
| **P1.5** | `renderer/js/fileAdapter.js` | 虚拟文件保存：触发浏览器下载（`<a download>`），保留 dirty-state 追踪 |
| **P1.6** | `renderer/js/fileAdapter.js` | 目录列表：支持本地文件夹（listDirectory）+ 虚拟文件列表合并显示 |

**验收标准**：
- 打开文件→关闭页面→重新打开→权限恢复成功
- 对话历史按文件 UUID 绑定，同名文件不碰撞
- 虚拟文件 Ctrl+S 触发下载，文件名冲突自动加 _1/_2

---

### Phase 2：核心应用层（第 6-10 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| **P2.1** | `renderer/js/app.js` | 迁移入口：替换所有 `window.electronAPI.*` 调用为 `fileAdapter.*` / `storage.*`。`saveFile/openFile/openFolder/closeFile/newFile/openRecentFile` 全部重写 |
| **P2.2** | `renderer/js/settings.js` | 从 IPC 读文件改为 `localStorage.getItem('rabbit-settings')`。保留 `customPrompts` 逻辑。新增 `baseUrl` 作为代理中转地址 |
| **P2.3** | `renderer/js/aiClient.js` | 删除 `window.electronAPI.aiRequest()`，改为 `fetch()` 直连。保留 `sendMessage()` 函数签名不变，内部改用浏览器 fetch |
| **P2.4** | `renderer/js/fileBrowser.js` | 迁移文件浏览器：`listFiles` → `fileAdapter.listDirectory()`。保留右键菜单、双击重命名、文件图标逻辑 |
| **P2.5** | `renderer/js/aiPanel.js` | 对话历史：`window.electronAPI.loadConversation/saveConversation` → `storage.js` 的 IDB 方法 |
| **P2.6** | `renderer/js/menubar.js` | 移除"退出"菜单项。窗口模式项改为 CSS 布局切换（不涉及 Fullscreen API） |
| **P2.7** | `renderer/js/keybindings.js` | F11 → `element.requestFullscreen()`。Ctrl+Shift+1/2/3 → CSS 类切换。其余快捷键不变 |
| **P2.8** | `renderer/js/editor.js` | 几乎不变。预览模式 toggle 同已有逻辑 |
| **P2.9** | `renderer/js/outline.js` | 完全不变 |
| **P2.10** | `renderer/js/searchReplace.js` | 完全不变 |
| **P2.11** | `renderer/js/ctrlKPopup.js` | 完全不变 |

**验收标准**：
- 所有文件操作通过 fileAdapter 正确执行
- AI 请求发送成功（用 DeepSeek/OpenAI 测试）
- 对话历史在页面刷新前后一致
- 键盘快捷键全部可用

---

### Phase 3：降级与兼容（第 11-13 天）

| 任务 | 说明 |
|------|------|
| **P3.1** | File System Access API 不可用时自动降级为 `<input>` + 虚拟文件模式。状态栏显示当前模式图标 |
| **P3.2** | Firefox / Safari 测试。验证 IndexedDB 后备方案可用。PWA 在 Firefox 不可用，降级为常规 web page |
| **P3.3** | 浏览器兼容检测页。首次访问时显示能力检测结果，提示用户推荐使用 Chrome/Edge 以获得最佳体验 |
| **P3.4** | 大文件加载性能测试（>500KB 的 .md 文件）。验证 CodeMirror 渲染和 outline 解析不会阻塞 UI |
| **P3.5** | 数据保护。自动保存到 IndexedDB（60s 间隔），标签页关闭前 dirty-state 检测，防止意外关闭丢数据 |

**验收标准**：
- Firefox 下能正常导入/编辑/下载文件
- 500KB 文件打开不卡顿
- 未保存修改时关闭标签页有 `beforeunload` 提示

---

### Phase 4：PWA + 部署（第 14-17 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| **P4.1** | `manifest.json` | PWA 配置：`display: standalone`、图标、主题色 |
| **P4.2** | `sw.js` | Service Worker：预缓存 index.html + bundle.js + 所有 CSS。运行时 Cache-First。AI API 请求 Network-First |
| **P4.3** | `renderer/js/pwa.js` | PWA 安装引导 UI："添加到桌面"按钮 + `beforeinstallprompt` 事件 |
| **P4.4** | 部署 | GitHub Pages：`.github/workflows/deploy.yml`，push → 自动构建 → 发布到 `gh-pages` 分支 |
| **P4.5** | `README.md` | Web 版专属 README：安装说明、浏览器兼容表、快捷键速查 |
| **P4.6** | 图标 | 生成 192px + 512px PNG 图标（从现有 `rabbit-edit.png` 裁剪） |

**验收标准**：
- 访问 `https://benbenzhuyi.github.io/rabbit-editor-web` 正常打开
- PWA 可安装，standalone 模式运行
- 离线状态下仍可打开应用并编辑已缓存文件

---

## 三、各模块改动量明细

| 模块 | 桌面版行数 | Web 版行数 | 新增 | 修改 | 删除 |
|------|:--------:|:--------:|:----:|:----:|:----:|
| `platformInfo.js` | — | ~40 | ✓ | — | — |
| `storage.js` | — | ~200 | ✓ | — | — |
| `fileAdapter.js` | — | ~300 | ✓ | — | — |
| `app.js` | 464 | ~300 | — | ✓ | — |
| `fileBrowser.js` | 430 | ~350 | — | ✓ | — |
| `aiClient.js` | 109 | ~80 | — | ✓ | — |
| `aiPanel.js` | 310 | ~250 | — | ✓ | — |
| `settings.js` | 150 | ~100 | — | ✓ | — |
| `menubar.js` | 200 | ~180 | — | ✓ | — |
| `keybindings.js` | 280 | ~250 | — | ✓ | — |
| `editor.js` | 537 | 537 | — | — | — |
| `outline.js` | 280 | 280 | — | — | — |
| `searchReplace.js` | 192 | 192 | — | — | — |
| `ctrlKPopup.js` | 142 | 142 | — | — | — |
| `statusbar.js` | 60 | 60 | — | — | — |
| **合计** | | | ~540 行新代码 | ~750 行修改 | ~50 行删除 |

---

## 四、开发分支策略

```
master (桌面版 v0.5.2)
  │
  └── web (新建分支)
        │
        ├── Phase 0-1 commits
        ├── Phase 2 commits
        ├── Phase 3 commits
        └── Phase 4 commits → merge → deploy
```

桌面版和 Web 版在同一个仓库里，通过分支隔离。最终 Web 版可能需要独立仓库以减少依赖项体积（去掉 electron-builder 等桌面构建依赖）。

---

## 五、待决策项

| 议题 | 选项 A | 选项 B | 推荐 |
|------|--------|--------|:--:|
| 仓库分离 | 同仓库 web 分支 | 独立 `rabbit-editor-web` 仓库 | **A** — 代码复用方便 |
| 部署平台 | GitHub Pages | Vercel | **A** — zero-config |
| esbuild 构建位置 | 本地构建后 push bundle | CI/CD 自动构建 | **B** — 更干净 |
| API Key 存储 | localStorage（默认） | 仅会话模式（不持久化） | **A** — 默认 localStorage |

---

*计划版本：v0.1 | 创建日期：2026-06-18*
