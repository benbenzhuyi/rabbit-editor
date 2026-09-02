const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let windowMode = 1; // 1=normal, 2=fullscreen+menu, 3=fullscreen no menu
let openFilePath = null;
let forceClose = false;
let closeCheckInProgress = false;
const allowedRoots = new Set();
const allowedFiles = new Set();

function normalizePath(targetPath) {
  if (typeof targetPath !== 'string' || targetPath.trim() === '') {
    throw new Error('无效的文件路径');
  }
  const resolved = path.resolve(targetPath);
  if (fs.existsSync(resolved)) {
    return fs.realpathSync.native(resolved);
  }
  const parent = path.dirname(resolved);
  if (fs.existsSync(parent)) {
    return path.join(fs.realpathSync.native(parent), path.basename(resolved));
  }
  return resolved;
}

function authorizeRoot(rootPath) {
  allowedRoots.add(normalizePath(rootPath));
}

function authorizeFile(filePath) {
  const normalized = normalizePath(filePath);
  allowedFiles.add(normalized);
  authorizeRoot(path.dirname(normalized));
}

function isPathAllowed(targetPath) {
  const normalized = normalizePath(targetPath);
  if (allowedFiles.has(normalized)) return true;
  for (const root of allowedRoots) {
    const relative = path.relative(root, normalized);
    if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
      return true;
    }
  }
  return false;
}

function requireAllowedPath(targetPath) {
  const normalized = normalizePath(targetPath);
  if (!isPathAllowed(normalized)) {
    throw new Error('拒绝访问未经用户授权的路径');
  }
  return normalized;
}

function findOpenFileInArgs(args, workingDirectory = process.cwd()) {
  for (const arg of args) {
    if (typeof arg !== 'string') continue;
    const lower = arg.toLowerCase();
    if (!/\.(md|txt|html|htm|json|js|css|xml|yaml|yml|csv|log|rst|tex|py|java|c|cpp|h|sh)$/i.test(lower)) {
      continue;
    }

    const candidates = [
      path.resolve(arg),
      path.resolve(workingDirectory || process.cwd(), arg),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return normalizePath(candidate);
      }
    }
  }
  return null;
}

// Scan for a file path supplied by Explorer or the command line.
{
  const initialFile = findOpenFileInArgs(process.argv.slice(1));
  if (initialFile) {
    openFilePath = initialFile;
    authorizeFile(initialFile);
  }
}

function createWindow() {
  // Read saved window state if "保留上次退出状态" is enabled
  const settings = loadSettings();
  let savedState = null;
  if (settings.startupMode === 'last') {
    try {
      if (fs.existsSync(windowStatePath)) {
        savedState = JSON.parse(fs.readFileSync(windowStatePath, 'utf-8'));
      }
    } catch (_) {}
  }

  mainWindow = new BrowserWindow({
    width: savedState?.width || 1280,
    height: savedState?.height || 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    title: '小野兔 Rabbit - 未命名.md',
    icon: path.join(__dirname, 'renderer', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 显式恢复窗口位置（比构造函数 x/y 更可靠）
  if (savedState?.x != null && savedState?.y != null) {
    mainWindow.setBounds({
      x: savedState.x,
      y: savedState.y,
      width: savedState.width || 1280,
      height: savedState.height || 800,
    });
  }

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  const isHttpUrl = (url) => typeof url === 'string' && (url.startsWith('https:') || url.startsWith('http:'));
  const isAppPage = (url) => typeof url === 'string' && url.startsWith('file:') && url.includes('renderer/index.html');
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAppPage(url)) return;
    event.preventDefault();
    if (isHttpUrl(url)) shell.openExternal(url);
  });


  // 页面加载完成后恢复侧边栏状态
  mainWindow.webContents.on('did-finish-load', () => {
    // 恢复侧边栏
    if (savedState?.leftSidebarHidden) {
      mainWindow.webContents.executeJavaScript(
        'document.getElementById("left-sidebar")?.classList.add("hidden")'
      );
    }
    if (savedState?.rightSidebarHidden) {
      mainWindow.webContents.executeJavaScript(
        'document.getElementById("right-sidebar")?.classList.add("hidden")'
      );
    }
    // 恢复打开的文件
    if (openFilePath) {
      mainWindow.webContents.send('open-file', openFilePath);
    }
  });

  // Restore window mode if saved
  if (savedState?.mode && savedState.mode > 1) {
    windowMode = savedState.mode;
    mainWindow.setFullScreen(true);
  }

  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Intercept Ctrl+, at Chromium level (before DOM sees it)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && !input.shift && input.code === 'Comma') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:settings');
    }
  });

  // Also register Ctrl+, as a native menu accelerator (most reliable)
  // Hidden menu items still fire their accelerators
  const appMenu = Menu.buildFromTemplate([
    {
      label: 'App',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('shortcut:settings');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ]);
  Menu.setApplicationMenu(appMenu);
  // Hide native menu bar (we use custom HTML menu), but keep accelerators
  mainWindow.setMenuBarVisibility(false);

  // 关闭时保存窗口状态 + 检查未保存内容
  mainWindow.on('close', (e) => {
    if (forceClose) return;
    e.preventDefault();
    if (closeCheckInProgress) return;
    closeCheckInProgress = true;

    void (async () => {
      await saveWindowState();
      try {
        const hasUnsaved = await mainWindow.webContents.executeJavaScript(
          'window.__hasUnsavedChanges || false'
        );
        if (hasUnsaved) {
          const choice = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: '小野兔 Rabbit',
            message: '文件尚未保存，是否保存后再退出？',
            detail: '不保存：放弃所有修改\n取消：回到编辑器继续编辑',
            buttons: ['保存', '不保存', '取消'],
            defaultId: 0,
            cancelId: 2,
          });
          if (choice.response === 0) {
            closeCheckInProgress = false;
            mainWindow.webContents.send('app:force-save-and-close');
          } else if (choice.response === 1) {
            forceClose = true;
            mainWindow.destroy();
          } else {
            closeCheckInProgress = false;
          }
        } else {
          forceClose = true;
          mainWindow.destroy();
        }
      } catch (_) {
        forceClose = true;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
      }
    })();
  });

  // Remove native menu bar (we use custom HTML menu)
  Menu.setApplicationMenu(null);
}

// Handle file association: already-running app gets new file via open-file event
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('open-file', filePath);
  } else {
    openFilePath = filePath;
  }
});

// ── IPC Handlers ──────────────────────────────────────────

ipcMain.handle('file:read', async (_event, filePath) => {
  try {
    const safePath = requireAllowedPath(filePath);
    const content = fs.readFileSync(safePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:write', async (_event, filePath, content) => {
  try {
    const safePath = requireAllowedPath(filePath);
    // Safety: refuse to save empty content to an existing file
    if (content.trim() === '' && fs.existsSync(safePath)) {
      const existing = fs.readFileSync(safePath, 'utf-8');
      if (existing.trim() !== '') {
        console.error('Refusing to overwrite non-empty file with empty content:', safePath);
        return { success: false, error: 'Refusing to overwrite existing file with empty content (data-loss prevention)' };
      }
    }
    if (fs.existsSync(safePath)) {
      const stem = safePath.replace(/\.md$/i, '');
      let bakPath = stem + '.bak.md';
      if (fs.existsSync(bakPath)) {
        bakPath = stem + '.bak.' + Date.now() + '.md';
      }
      try {
        fs.copyFileSync(safePath, bakPath);
      } catch (bakErr) {
        return { success: false, error: 'Backup failed: ' + bakErr.message };
      }
    }
    const tmpPath = safePath + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmpPath, content, 'utf-8');
    try {
      fs.renameSync(tmpPath, safePath);
    } catch (_) {
      fs.copyFileSync(tmpPath, safePath);
      fs.unlinkSync(tmpPath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:new', async (_event, dirPath) => {
  try {
    dirPath = requireAllowedPath(dirPath);
    const baseName = '未命名.md';
    let filePath = path.join(dirPath, baseName);
    let counter = 1;
    while (fs.existsSync(filePath)) {
      filePath = path.join(dirPath, `${baseName.replace('.md', '')}_${counter}.md`);
      counter++;
    }
    fs.writeFileSync(filePath, '', 'utf-8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:list', async (_event, dirPath) => {
  try {
    dirPath = requireAllowedPath(dirPath);
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = entries
      .filter(e => !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(dirPath, e.name),
        type: e.isDirectory() ? 'directory' : 'file',
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name, 'zh-CN');
      });
    return { success: true, entries: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:create-dir', async (_event, parentPath) => {
  try {
    parentPath = requireAllowedPath(parentPath);
    const base = '新建文件夹';
    let dirPath = path.join(parentPath, base);
    let counter = 1;
    while (fs.existsSync(dirPath)) {
      dirPath = path.join(parentPath, `${base}_${counter}`);
      counter++;
    }
    fs.mkdirSync(dirPath);
    return { success: true, path: dirPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:delete-entry', async (_event, targetPath) => {
  try {
    targetPath = requireAllowedPath(targetPath);
    if (allowedRoots.has(targetPath)) {
      return { success: false, error: '不能删除当前授权的工作区根目录' };
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:rename-entry', async (_event, oldPath, newName) => {
  try {
    oldPath = requireAllowedPath(oldPath);
    if (allowedRoots.has(oldPath)) {
      return { success: false, error: '不能重命名当前授权的工作区根目录' };
    }
    if (typeof newName !== 'string' || newName === '' || newName === '.' || newName === '..' ||
        newName.includes('/') || newName.includes('\\')) {
      return { success: false, error: '文件名不能包含路径分隔符' };
    }
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    if (fs.existsSync(newPath)) {
      return { success: false, error: '同名文件或文件夹已存在' };
    }
    fs.renameSync(oldPath, newPath);
    return { success: true, newPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('dialog:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开文件',
    filters: [
      { name: '支持的文件', extensions: ['md', 'txt', 'html', 'htm', 'json', 'js', 'css', 'xml', 'yaml', 'yml', 'csv', 'log', 'rst', 'tex'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }
  authorizeFile(result.filePaths[0]);
  return { success: true, filePath: result.filePaths[0] };
});

ipcMain.handle('dialog:open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开文件夹',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }
  authorizeRoot(result.filePaths[0]);
  return { success: true, folderPath: result.filePaths[0] };
});

ipcMain.handle('dialog:save', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '另存为',
    filters: [{ name: 'Markdown 文件', extensions: ['md'] }],
  });
  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }
  authorizeFile(result.filePath);
  return { success: true, filePath: result.filePath };
});

ipcMain.handle('app:get-paths', async () => {
  return {
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
  };
});

ipcMain.handle('app:get-info', async () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
  };
});

// Handle close-confirm dialog from renderer
ipcMain.handle('dialog:confirm-close', async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: '小野兔 Rabbit',
    message: '文件尚未保存，是否保存后再关闭？',
    detail: '不保存：放弃所有修改\n取消：回到编辑器继续编辑',
    buttons: ['保存', '不保存', '取消'],
    defaultId: 0,
    cancelId: 2,
  });
  return result.response; // 0=保存, 1=不保存, 2=取消
});

// Window mode management
ipcMain.handle('window:set-mode', async (_event, mode) => {
  windowMode = mode;
  if (mode === 1) {
    mainWindow.setFullScreen(false);
  } else {
    mainWindow.setFullScreen(true);
  }
  mainWindow.webContents.send('window:mode-changed', mode);
  saveWindowState();
  return mode;
});

ipcMain.handle('window:get-mode', async () => {
  return windowMode;
});

async function saveWindowState() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const bounds = mainWindow.getBounds();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      mode: windowMode,
      leftSidebarHidden: false,
      rightSidebarHidden: false,
    };

    // 异步读取侧边栏可见性
    try {
      const leftHidden = await mainWindow.webContents.executeJavaScript(
        '!!document.getElementById("left-sidebar")?.classList.contains("hidden")'
      );
      const rightHidden = await mainWindow.webContents.executeJavaScript(
        '!!document.getElementById("right-sidebar")?.classList.contains("hidden")'
      );
      state.leftSidebarHidden = leftHidden;
      state.rightSidebarHidden = rightHidden;
    } catch (_) {}

    const dir = path.dirname(windowStatePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(windowStatePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存窗口状态失败:', e.message);
  }
}

// Recent files storage
const recentFilePath = path.join(app.getPath('userData'), 'recent_files.json');

function loadRecentFiles() {
  try {
    if (fs.existsSync(recentFilePath)) {
      return JSON.parse(fs.readFileSync(recentFilePath, 'utf-8'));
    }
  } catch (_) {}
  return [];
}

function saveRecentFiles(files) {
  try {
    const dir = path.dirname(recentFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(recentFilePath, JSON.stringify(files, null, 2), 'utf-8');
  } catch (_) {}
}

ipcMain.handle('recent:get', async () => {
  const files = loadRecentFiles();
  for (const filePath of files) {
    try { authorizeFile(filePath); } catch (_) {}
  }
  return files;
});

ipcMain.handle('recent:add', async (_event, filePath) => {
  authorizeFile(filePath);
  let files = loadRecentFiles();
  files = files.filter(f => f !== filePath);
  files.unshift(filePath);
  files = files.slice(0, 5);
  saveRecentFiles(files);
  return files;
});

// ── AI Request (simple request-response) ────────────────────

ipcMain.handle('ai:request', async (_event, config) => {
  const { messages, model, baseUrl, apiKey, temperature, maxTokens } = config;
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';

  try {
    console.log('[AI v0.6.0] Request to:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }

    // Read as text first, then try JSON parse (more robust)
    const rawText = await response.text();

    let json;
    try { json = JSON.parse(rawText); } catch (e) {
      return { success: false, error: `无法解析 API 响应: ${rawText.slice(0, 200)}` };
    }

    const choice = json.choices?.[0];
    const message = choice?.message;

    // Note: newer llama.cpp returns reasoning_content while content is empty string "".
    // JavaScript || treats "" as falsy so the fallback works correctly.
    let content = message?.content || message?.reasoning_content || choice?.text || json.content;

    if (!content || (typeof content === 'string' && content.trim().length === 0)) {
      const raw = JSON.stringify(json).slice(0, 300);
      return { success: false, error: `模型未返回任何内容\n原始响应: ${raw}` };
    }

    // Strip <think>...</think> blocks (Qwen model outputs these regardless of thinking setting)
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<\/?think>/g, '').trim();

    // If stripping left nothing, the model spent all tokens on thinking — tell user to increase limit
    if (!content) {
      return { success: false, error: '模型将全部 tokens 用于思考过程，请增加"最大输出 Tokens"（建议设为 4096 以上）' };
    }

    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── File read for @ references (returns multiple files) ─────

ipcMain.handle('file:read-multiple', async (_event, filePaths) => {
  const results = {};
  for (const fp of filePaths) {
    try {
      const safePath = requireAllowedPath(fp);
      results[fp] = fs.readFileSync(safePath, 'utf-8');
    } catch (_) {
      results[fp] = null;
    }
  }
  return { success: true, files: results };
});

// ── Conversation Storage ────────────────────────────────────

const crypto = require('crypto');
const conversationsDir = path.join(app.getPath('userData'), 'conversations');
const windowStatePath = path.join(app.getPath('userData'), 'window-state.json');

function hashPath(filePath) {
  return crypto.createHash('md5').update(filePath).digest('hex');
}

ipcMain.handle('conversations:load', async (_event, filePath) => {
  if (!filePath) return { success: true, data: { messages: [] } };
  const key = hashPath(filePath);
  const file = path.join(conversationsDir, `${key}.json`);
  try {
    if (fs.existsSync(file)) {
      return { success: true, data: JSON.parse(fs.readFileSync(file, 'utf-8')) };
    }
  } catch (_) {}
  return { success: true, data: { filePath, messages: [] } };
});

ipcMain.handle('conversations:save', async (_event, filePath, messages) => {
  if (!filePath) return { success: true };
  const key = hashPath(filePath);
  const file = path.join(conversationsDir, `${key}.json`);
  try {
    if (!fs.existsSync(conversationsDir)) fs.mkdirSync(conversationsDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ filePath, messages }, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Single-instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine, workingDirectory) => {
    const requestedFile = findOpenFileInArgs(commandLine, workingDirectory);
    if (requestedFile) authorizeFile(requestedFile);

    if (!mainWindow) {
      openFilePath = requestedFile;
      return;
    }

    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();

    if (!requestedFile) return;
    if (mainWindow.webContents.isLoadingMainFrame()) {
      openFilePath = requestedFile;
    } else {
      mainWindow.webContents.send('open-file', requestedFile);
    }
  });
}

// ── Settings Storage ───────────────────────────────────────

const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const defaultSettings = {
  autoSaveInterval: 60,
  fontSize: 16,
  showLineNumbers: true,
  wordWrap: true,
  aiBaseUrl: 'http://localhost:8080/v1',
  aiApiKey: '',
  aiModel: 'local-model',
  aiDefaultMode: '续写',
  ctrlKWords: 800,
  maxTokens: 2048,
  temperature: 0.7,
  theme: 'dark',
  language: 'zh-CN',
};

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) };
    }
  } catch (_) {}
  return { ...defaultSettings };
}

function saveSettingsFile(settings) {
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (_) { return false; }
}

ipcMain.handle('settings:load', async () => loadSettings());

ipcMain.handle('settings:save', async (_event, settings) => {
  return saveSettingsFile(settings);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
