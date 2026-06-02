const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let windowMode = 1; // 1=normal, 2=fullscreen+menu, 3=fullscreen no menu

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    title: '小野兔 Rabbit - 未命名.md',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools for debugging
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('close', async (e) => {
    try {
      const hasUnsaved = await mainWindow.webContents.executeJavaScript(
        'window.__hasUnsavedChanges || false'
      );
      if (hasUnsaved) {
        e.preventDefault();
        const choice = await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: '小野兔 Rabbit',
          message: '文件尚未保存，是否保存后再退出？',
          detail: '不保存：放弃所有修改\n取消：回到编辑器继续编辑',
          buttons: ['保存', '不保存', '取消'],
          defaultId: 0,
          cancelId: 2,
        });
        if (choice === 0) {
          mainWindow.webContents.send('app:force-save-and-close');
        } else if (choice === 1) {
          mainWindow.destroy();
          app.quit();
        }
        // choice 2: cancel, do nothing
      }
    } catch (_) {
      // If executeJavaScript fails, just close
    }
  });

  // Remove native menu bar (we use custom HTML menu)
  Menu.setApplicationMenu(null);
}

// ── IPC Handlers ──────────────────────────────────────────

ipcMain.handle('file:read', async (_event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:write', async (_event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:new', async (_event, dirPath) => {
  try {
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
  return { success: true, filePath: result.filePath };
});

ipcMain.handle('app:get-paths', async () => {
  return {
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
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
    // modes 2 and 3 are fullscreen
    mainWindow.setFullScreen(true);
  }
  mainWindow.webContents.send('window:mode-changed', mode);
  return mode;
});

ipcMain.handle('window:get-mode', async () => {
  return windowMode;
});

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
  return loadRecentFiles();
});

ipcMain.handle('recent:add', async (_event, filePath) => {
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
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: '模型未返回任何内容' };
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
      results[fp] = fs.readFileSync(fp, 'utf-8');
    } catch (_) {
      results[fp] = null;
    }
  }
  return { success: true, files: results };
});

// ── Conversation Storage ────────────────────────────────────

const crypto = require('crypto');
const conversationsDir = path.join(app.getPath('userData'), 'conversations');

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
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
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
