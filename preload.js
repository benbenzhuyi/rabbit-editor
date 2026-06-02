const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  newFile: (dirPath) => ipcRenderer.invoke('file:new', dirPath),
  listFiles: (dirPath) => ipcRenderer.invoke('file:list', dirPath),
  createDir: (parentPath) => ipcRenderer.invoke('file:create-dir', parentPath),
  deleteEntry: (targetPath) => ipcRenderer.invoke('file:delete-entry', targetPath),
  renameEntry: (oldPath, newName) => ipcRenderer.invoke('file:rename-entry', oldPath, newName),

  // Dialogs
  openDialog: () => ipcRenderer.invoke('dialog:open'),
  openFolderDialog: () => ipcRenderer.invoke('dialog:open-folder'),
  saveDialog: () => ipcRenderer.invoke('dialog:save'),
  confirmClose: () => ipcRenderer.invoke('dialog:confirm-close'),

  // App paths
  getPaths: () => ipcRenderer.invoke('app:get-paths'),

  // Window mode
  setWindowMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),
  getWindowMode: () => ipcRenderer.invoke('window:get-mode'),
  onWindowModeChanged: (callback) => {
    ipcRenderer.on('window:mode-changed', (_event, mode) => callback(mode));
  },

  // Recent files
  getRecentFiles: () => ipcRenderer.invoke('recent:get'),
  addRecentFile: (filePath) => ipcRenderer.invoke('recent:add', filePath),

  // Force save and close (from main process close handler)
  onForceSaveAndClose: (callback) => {
    ipcRenderer.on('app:force-save-and-close', () => callback());
  },

  // Main process shortcuts
  onShortcutSettings: (callback) => {
    ipcRenderer.on('shortcut:settings', () => callback());
  },

  // AI streaming
  aiRequest: (config) => ipcRenderer.invoke('ai:request', config),
  onAiStreamChunk: (callback) => {
    ipcRenderer.on('ai:stream-chunk', (_event, chunk) => callback(chunk));
  },
  onAiStreamEnd: (callback) => {
    ipcRenderer.on('ai:stream-end', () => callback());
  },
  onAiStreamError: (callback) => {
    ipcRenderer.on('ai:stream-error', (_event, error) => callback(error));
  },
  // Remove AI stream listeners (call when component destroys)
  removeAiListeners: () => {
    ipcRenderer.removeAllListeners('ai:stream-chunk');
    ipcRenderer.removeAllListeners('ai:stream-end');
    ipcRenderer.removeAllListeners('ai:stream-error');
  },

  // Multi-file read for @ references
  readMultipleFiles: (filePaths) => ipcRenderer.invoke('file:read-multiple', filePaths),

  // Conversation storage
  loadConversation: (filePath) => ipcRenderer.invoke('conversations:load', filePath),
  saveConversation: (filePath, messages) => ipcRenderer.invoke('conversations:save', filePath, messages),

  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
});
