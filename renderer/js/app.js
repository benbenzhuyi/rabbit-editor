/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — App Entry Point
   ═══════════════════════════════════════════════════════ */

import * as Editor from './editor.js';
import * as FileManager from './fileManager.js';
import * as FileBrowser from './fileBrowser.js';
import * as Outline from './outline.js';
import * as MenuBar from './menubar.js';
import * as StatusBar from './statusbar.js';
import * as Keybindings from './keybindings.js';
import * as AiPanel from './aiPanel.js';
import * as CtrlKPopup from './ctrlKPopup.js';
import * as Settings from './settings.js';
import * as SearchReplace from './searchReplace.js';

let currentFilePath = null;
let isModified = false;

// ── Public state accessors ──────────────────────────────

export function getCurrentFilePath() { return currentFilePath; }

export function setCurrentFilePath(filePath) {
  currentFilePath = filePath;
  updateTitle();
}

export function getIsModified() { return isModified; }

export function setIsModified(val) {
  isModified = val;
  window.__hasUnsavedChanges = val;
  StatusBar.setSaveState(!val);
  updateTitle();
}

function updateTitle() {
  const base = currentFilePath
    ? currentFilePath.split(/[/\\]/).pop()
    : '未命名.md';
  const prefix = isModified ? '• ' : '';
  document.title = `${prefix}小野兔 Rabbit - ${base}`;
}

// ── Word count ──────────────────────────────────────────

export function countWords(text) {
  if (!text || text.trim().length === 0) return 0;
  const cjk = text.match(/[一-鿿㐀-䶿豈-﫿]/g);
  let count = cjk ? cjk.length : 0;
  const nonCjk = text
    .replace(/[一-鿿㐀-䶿豈-﫿]/g, ' ')
    .replace(/[^\w]+/g, ' ')
    .trim();
  if (nonCjk.length > 0) count += nonCjk.split(/\s+/).length;
  return count;
}

// ── Window mode cycling ─────────────────────────────────

export async function cycleWindowMode() {
  let mode = await window.electronAPI.getWindowMode();
  mode = mode >= 3 ? 1 : mode + 1;
  await window.electronAPI.setWindowMode(mode);
}

// ── File operations ─────────────────────────────────────

export async function newFile() {
  if (isModified) {
    const choice = await window.electronAPI.confirmClose();
    if (choice === 0) await saveFile();
    else if (choice === 2) return;
  }
  Editor.setContent('');
  setCurrentFilePath(null);
  setIsModified(false);
  Editor.focus();
  AiPanel.loadConversation();
}

export async function openFile() {
  if (isModified) {
    const choice = await window.electronAPI.confirmClose();
    if (choice === 0) await saveFile();
    else if (choice === 2) return;
  }
  const result = await window.electronAPI.openDialog();
  if (!result.success) return;
  const readResult = await window.electronAPI.readFile(result.filePath);
  if (!readResult.success) {
    alert(`无法打开文件：${readResult.error}`);
    return;
  }
  Editor.setContent(readResult.content);
  setCurrentFilePath(result.filePath);
  setIsModified(false);
  Editor.focus();
  await window.electronAPI.addRecentFile(result.filePath);
  MenuBar.updateRecentFiles(await window.electronAPI.getRecentFiles());
  const dir = result.filePath.replace(/[/\\][^/\\]+$/, '');
  FileBrowser.setRootDir(dir);
  FileBrowser.highlightFile(result.filePath);
  AiPanel.loadConversation();
}

export async function saveFile() {
  if (currentFilePath) {
    const result = await window.electronAPI.writeFile(currentFilePath, Editor.getContent());
    if (result.success) setIsModified(false);
    else alert(`保存失败：${result.error}`);
  } else {
    await saveFileAs();
  }
}

export async function saveFileAs() {
  const result = await window.electronAPI.saveDialog();
  if (!result.success) return;
  const writeResult = await window.electronAPI.writeFile(result.filePath, Editor.getContent());
  if (writeResult.success) {
    setCurrentFilePath(result.filePath);
    setIsModified(false);
    await window.electronAPI.addRecentFile(result.filePath);
    MenuBar.updateRecentFiles(await window.electronAPI.getRecentFiles());
  } else {
    alert(`保存失败：${writeResult.error}`);
  }
}

export async function closeFile() {
  if (isModified) {
    const choice = await window.electronAPI.confirmClose();
    if (choice === 0) { await saveFile(); if (isModified) return; }
    else if (choice === 2) return;
  }
  Editor.setContent('');
  setCurrentFilePath(null);
  setIsModified(false);
}

export async function openFileByPath(filePath, openInPreview) {
  const ext = filePath.split('.').pop().toLowerCase();
  const textExts = ['md', 'txt', 'html', 'htm', 'json', 'js', 'css', 'xml', 'yaml', 'yml', 'csv', 'log', 'rst', 'tex', 'py', 'java', 'c', 'cpp', 'h', 'sh'];
  if (!textExts.includes(ext)) return;
  if (isModified) {
    const choice = await window.electronAPI.confirmClose();
    if (choice === 0) await saveFile();
    else if (choice === 2) return;
  }
  const result = await window.electronAPI.readFile(filePath);
  if (!result.success) {
    alert(`无法打开文件：${result.error}`);
    return;
  }
  Editor.setContent(result.content);
  setCurrentFilePath(filePath);
  setIsModified(false);

  // If opening from file browser for .md, switch to preview mode
  if (openInPreview && !Editor.isPreviewMode()) {
    Editor.togglePreview();
  }
  // Don't steal focus when opened from file browser click

  await window.electronAPI.addRecentFile(filePath);
  MenuBar.updateRecentFiles(await window.electronAPI.getRecentFiles());
  // Update file browser to show this file's directory
  const dir = filePath.replace(/[/\\][^/\\]+$/, '');
  FileBrowser.setRootDir(dir);
  FileBrowser.highlightFile(filePath);
  AiPanel.loadConversation();
}

export async function openRecentFile(filePath) {
  if (isModified) {
    const choice = await window.electronAPI.confirmClose();
    if (choice === 0) await saveFile();
    else if (choice === 2) return;
  }
  const result = await window.electronAPI.readFile(filePath);
  if (!result.success) {
    alert(`无法打开文件：${result.error}`);
    MenuBar.updateRecentFiles(
      (await window.electronAPI.getRecentFiles()).filter(f => f !== filePath)
    );
    return;
  }
  Editor.setContent(result.content);
  setCurrentFilePath(filePath);
  setIsModified(false);
  Editor.focus();
  await window.electronAPI.addRecentFile(filePath);
  MenuBar.updateRecentFiles(await window.electronAPI.getRecentFiles());
  AiPanel.loadConversation();
}

// ── Init ─────────────────────────────────────────────────

async function init() {
  Editor.init(document.getElementById('editor-container'));
  FileBrowser.init();
  Outline.init();
  AiPanel.init();
  CtrlKPopup.init();
  SearchReplace.init();
  await Settings.init();
  MenuBar.init();
  StatusBar.init();
  Keybindings.init();
  Keybindings.initWheelZoom();
  FileManager.initDragDrop(document.body);

  // Track modified state
  Editor.onChange(() => { if (!isModified) setIsModified(true); });

  // Track cursor position and selection in status bar
  Editor.onCursorActivity(() => {
    const pos = Editor.getCursorPosition();
    StatusBar.setCursor(pos.line, pos.column);
    const sel = Editor.getSelection();
    if (sel && sel.text && sel.text.length > 0) {
      StatusBar.setSelectedWords(countWords(sel.text));
    } else {
      StatusBar.setSelectedWords(0);
    }
  });

  // Track word count
  Editor.onUpdate(() => {
    StatusBar.setWordCount(countWords(Editor.getContent()));
  });

  // Initial status bar
  const pos = Editor.getCursorPosition();
  StatusBar.setCursor(pos.line, pos.column);
  StatusBar.setWordCount(0);
  StatusBar.setSaveState(true);

  // Make SOURCE/PREVIEW indicator clickable
  const modeEl = document.getElementById('status-mode');
  if (modeEl) {
    modeEl.addEventListener('click', () => Editor.togglePreview());
  }

  // Settings button in status bar
  const settingsBtn = document.getElementById('status-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => Settings.showPanel());
  }

  // Ctrl+, handled at main process level (Chromium intercept)
  window.electronAPI.onShortcutSettings(() => Settings.showPanel());

  // Word wrap toggle button
  const wrapEl = document.getElementById('status-wrap');
  if (wrapEl) {
    wrapEl.addEventListener('click', () => Editor.toggleWordWrap());
  }

  // Temperature click-to-edit in status bar
  initStatusTempClick();

  // Panel header click behaviors
  initPanelBehaviors();

  // Resize handles for sidebars and panel divider
  initResizeHandles();
  initPanelDivider();

  // Load recent files
  MenuBar.updateRecentFiles(await window.electronAPI.getRecentFiles());

  // Window mode changes from main process
  window.electronAPI.onWindowModeChanged((mode) => {
    document.body.className = document.body.className
      .replace(/window-mode-\d/g, '').trim();
    if (mode !== 1) document.body.classList.add(`window-mode-${mode}`);
    if (mode === 3) document.body.classList.add('no-menubar');
    else document.body.classList.remove('no-menubar');
  });

  // Handle force-save-and-close from main process
  window.electronAPI.onForceSaveAndClose(async () => {
    await saveFile();
    window.__hasUnsavedChanges = false;
    window.close();
  });

  // Warn on close with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (isModified) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Auto-save via settings timer
  window.addEventListener('settings:auto-save', () => {
    if (isModified && currentFilePath) saveFile();
  });

  updateTitle();
  window.__hasUnsavedChanges = false;
}

// ── Sidebar resize handles ──────────────────────────────

function initResizeHandles() {
  const leftHandle = document.getElementById('resize-handle-left');
  const rightHandle = document.getElementById('resize-handle-right');
  const leftSidebar = document.getElementById('left-sidebar');
  const rightSidebar = document.getElementById('right-sidebar');

  function makeResizable(handle, sidebar, direction) {
    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = sidebar.getBoundingClientRect().width;
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!handle.classList.contains('active')) return;
      const delta = e.clientX - startX;
      let newWidth = startWidth + (direction === 'left' ? delta : -delta);
      newWidth = Math.max(160, Math.min(480, newWidth));
      sidebar.style.width = newWidth + 'px';
      sidebar.style.transition = 'none';
    });

    document.addEventListener('mouseup', () => {
      if (!handle.classList.contains('active')) return;
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      sidebar.style.transition = '';
    });
  }

  makeResizable(leftHandle, leftSidebar, 'left');
  makeResizable(rightHandle, rightSidebar, 'right');
}

// ── Panel divider (vertical resize between file browser and outline) ──

function initPanelDivider() {
  const divider = document.getElementById('panel-divider');
  const fbPanel = document.getElementById('file-browser-panel');
  const outlinePanel = document.getElementById('outline-panel');
  const leftSidebar = document.getElementById('left-sidebar');
  if (!divider || !fbPanel || !outlinePanel || !leftSidebar) return;

  let startY, startFbHeight, totalHeight;

  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startY = e.clientY;
    const sidebarRect = leftSidebar.getBoundingClientRect();
    const fbRect = fbPanel.getBoundingClientRect();
    const outlineRect = outlinePanel.getBoundingClientRect();
    startFbHeight = fbRect.height;
    totalHeight = fbRect.height + outlineRect.height + divider.getBoundingClientRect().height;
    divider.classList.add('active');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!divider.classList.contains('active')) return;
    const delta = e.clientY - startY;
    const newFbHeight = startFbHeight + delta;
    const sidebarHeight = leftSidebar.getBoundingClientRect().height;
    const minH = 28;
    const maxH = sidebarHeight - minH - 4;
    const clamped = Math.max(minH, Math.min(maxH, newFbHeight));
    const fbPercent = (clamped / sidebarHeight) * 100;
    const outlinePercent = 100 - fbPercent - 0.5;

    fbPanel.style.flex = `1 1 ${fbPercent}%`;
    fbPanel.style.transition = 'none';
    outlinePanel.style.flex = `1 1 ${outlinePercent}%`;
    outlinePanel.style.transition = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (!divider.classList.contains('active')) return;
    divider.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    fbPanel.style.transition = '';
    outlinePanel.style.transition = '';
  });
}

// ── Panel header click / double-click behaviors ──────────

function initPanelBehaviors() {
  const fbHeader = document.getElementById('file-browser-header');
  const outlineHeader = document.querySelector('#outline-panel .sidebar-header');
  const fbPanel = document.getElementById('file-browser-panel');
  const outlinePanel = document.getElementById('outline-panel');

  // States: 0 = maximized, 1 = half, 2 = minimized
  let fbState = 1;
  let outlineState = 1;

  const applyState = (panel, otherPanel, state) => {
    panel.classList.remove('minimized', 'maximized');
    if (state === 0) {
      panel.classList.add('maximized');
      otherPanel.classList.remove('maximized', 'minimized');
      otherPanel.style.flex = '1 1 20%';
    } else if (state === 1) {
      panel.style.flex = '1 1 50%';
      otherPanel.style.flex = '1 1 50%';
      otherPanel.classList.remove('maximized', 'minimized');
    } else if (state === 2) {
      panel.classList.add('minimized');
      otherPanel.classList.remove('maximized', 'minimized');
      otherPanel.style.flex = '1 1 auto';
    }
  };

  if (fbHeader) {
    let fbClickTimer;
    fbHeader.addEventListener('click', (e) => {
      if (e.target.closest('.sidebar-btn') || e.target.closest('.rename-input')) return;
      if (fbClickTimer) {
        // Double click
        clearTimeout(fbClickTimer);
        fbClickTimer = null;
        fbState = fbState === 2 ? 0 : 2;
        applyState(fbPanel, outlinePanel, fbState);
      } else {
        fbClickTimer = setTimeout(() => {
          fbClickTimer = null;
          fbState = (fbState + 1) % 3;
          applyState(fbPanel, outlinePanel, fbState);
        }, 250);
      }
    });
  }

  if (outlineHeader) {
    let outlineClickTimer;
    outlineHeader.addEventListener('click', (e) => {
      if (outlineClickTimer) {
        clearTimeout(outlineClickTimer);
        outlineClickTimer = null;
        outlineState = outlineState === 2 ? 0 : 2;
        applyState(outlinePanel, fbPanel, outlineState);
      } else {
        outlineClickTimer = setTimeout(() => {
          outlineClickTimer = null;
          outlineState = (outlineState + 1) % 3;
          applyState(outlinePanel, fbPanel, outlineState);
        }, 250);
      }
    });
  }
}

// ── Status bar temperature click-to-edit ──────────────────

function statusTempClick(span) {
  span.addEventListener('click', () => {
    const current = parseFloat(span.textContent) || 0.7;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '2';
    input.step = '0.1';
    input.value = current;
    input.className = 'status-temp-input';
    span.replaceWith(input);
    input.focus();
    input.select();

    const finish = () => {
      let val = parseFloat(input.value);
      if (isNaN(val)) val = current;
      val = Math.max(0, Math.min(2, Math.round(val * 10) / 10));
      const newSpan = document.createElement('span');
      newSpan.id = 'status-temp';
      newSpan.title = '点击修改温度值';
      newSpan.textContent = val.toFixed(1);
      input.replaceWith(newSpan);
      statusTempClick(newSpan);
      AiClient.setConfig({ temperature: val });
      const st = document.getElementById('set-temperature');
      if (st) st.value = val;
      Settings.saveTemperature(val);
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = current; input.blur(); }
    });
  });
}

function initStatusTempClick() {
  const el = document.getElementById('status-temp');
  if (el) statusTempClick(el);
}

initStatusTempClick();
init();
