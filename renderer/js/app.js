/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit Web — App Entry Point
   ═══════════════════════════════════════════════════════ */

import * as AiClient from './aiClient.js';
import * as Editor from './editor.js';
import * as FileManager from './fileManager.js';
import * as FileAdapter from './fileAdapter.js';
import * as FileBrowser from './fileBrowser.js';
import * as Outline from './outline.js';
import * as MenuBar from './menubar.js';
import * as StatusBar from './statusbar.js';
import * as Keybindings from './keybindings.js';
import * as AiPanel from './aiPanel.js';
import * as CtrlKPopup from './ctrlKPopup.js';
import * as Settings from './settings.js';
import * as SearchReplace from './searchReplace.js';
import { loadConversation, saveConversation } from './storage.js';

let currentFilePath = null;
let currentFileHandle = null;
let currentFileUUID = null;
let isModified = false;

// ── Public state accessors ──────────────────────────────

export function getCurrentFilePath() { return currentFilePath; }
export function getCurrentFileUUID() { return currentFileUUID; }

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
  const base = currentFilePath || '未命名.md';
  const prefix = isModified ? '• ' : '';
  document.title = `${prefix}小野兔 Rabbit Web - ${base}`;
}

// ── Word count ──────────────────────────────────────────

export function countWords(text) {
  if (!text || text.trim().length === 0) return 0;
  const cjk = text.match(/[一-鿿㐀-䶿豈-﫿]/g);
  let count = cjk ? cjk.length : 0;
  const nonCjk = text.replace(/[一-鿿㐀-䶿豈-﫿]/g, ' ').replace(/[^\w]+/g, ' ').trim();
  if (nonCjk.length > 0) count += nonCjk.split(/\s+/).length;
  return count;
}

// ── File operations ─────────────────────────────────────

export async function newFile() {
  if (isModified) {
    const choice = await showConfirmDialog();
    if (choice === 0) await saveFile();
    else if (choice === 2) return;
  }
  Editor.setContent('');
  setCurrentFilePath(null);
  currentFileHandle = null;
  currentFileUUID = null;
  setIsModified(false);
  Editor.focus();
  loadConversationUI();
}

export async function openFile() {
  if (isModified) {
    const choice = await showConfirmDialog();
    if (choice === 0) await saveFile();
    else if (choice === 2) return;
  }
  const result = await FileAdapter.openFile();
  if (result.success) {
    Editor.setContent(result.content);
    setCurrentFilePath(result.filePath);
    currentFileHandle = result.handle;
    currentFileUUID = result.uuid || FileAdapter.getCurrentFileUUID();
    setIsModified(false);
    await loadConversationUI();
  }
}

export async function openFileByPath(filePath, openInPreview) {
  // Web: attempt to match a known virtual file or prompt user
  // For FileSystemAccess handles, this is handled by openFile()
  return openFile();
}

export async function saveFile() {
  if (!currentFileHandle) {
    return saveFileAs();
  }
  const content = Editor.getContent();
  const result = await FileAdapter.saveFile(content, currentFileHandle);
  if (result.success) setIsModified(false);
  else alert(`保存失败：${result.error}`);
}

export async function saveFileAs() {
  const content = Editor.getContent();
  const result = await FileAdapter.saveFile(content, currentFileHandle);
  if (result.success) {
    if (result.handle) currentFileHandle = result.handle;
    setIsModified(false);
  }
}

export async function closeFile() {
  if (isModified) {
    const choice = await showConfirmDialog();
    if (choice === 0) { await saveFile(); if (isModified) return; }
    else if (choice === 2) return;
  }
  Editor.setContent('');
  setCurrentFilePath(null);
  currentFileHandle = null;
  currentFileUUID = null;
  setIsModified(false);
}

export async function openFolder() {
  const result = await FileAdapter.openFolder();
  if (result.success) {
    FileBrowser.setRootDirFromEntries(result.entries, result.folderPath);
  }
}

async function showConfirmDialog() {
  const msg = '文件尚未保存，是否保存后再关闭？\n[0] 保存  [1] 不保存  [2] 取消';
  const choice = confirm(msg);
  if (choice) {
    // confirm = true = "确定" = save
    return 0;
  }
  // user clicked Cancel or Esc — return -1 for "cancel"
  return 2;
}

// ── Conversation ─────────────────────────────────────────

export async function loadConversationUI() {
  if (currentFileUUID) {
    const msgs = await loadConversation(currentFileUUID);
    AiPanel.loadConversation(msgs);
  } else {
    AiPanel.loadConversation([]);
  }
}

export async function saveConversationUI(messages) {
  if (currentFileUUID) {
    await saveConversation(currentFileUUID, messages);
  }
}

// ── Init ─────────────────────────────────────────────────

async function init() {
  Editor.init(document.getElementById('editor-container'));
  FileBrowser.init();
  Outline.init();
  AiPanel.init();
  CtrlKPopup.init();
  SearchReplace.init();
  MenuBar.init();
  StatusBar.init();
  Keybindings.init();
  Keybindings.initWheelZoom();
  FileManager.initDragDrop(document.body);
  Settings.init();

  // Track modified state
  Editor.onChange(() => { if (!isModified) setIsModified(true); });

  // Track cursor position and selection in status bar
  Editor.onCursorActivity(() => {
    const pos = Editor.getCursorPosition();
    StatusBar.setCursor(pos.line, pos.column);
    const sel = Editor.getSelection();
    StatusBar.setSelectedWords((sel && sel.text) ? countWords(sel.text) : 0);
  });

  // Track word count
  Editor.onUpdate(() => { StatusBar.setWordCount(countWords(Editor.getContent())); });

  // Initial status bar
  const pos = Editor.getCursorPosition();
  StatusBar.setCursor(pos.line, pos.column);
  StatusBar.setWordCount(0);
  StatusBar.setSaveState(true);

  // Panel header click behaviors
  initPanelBehaviors();

  // Resize handles for sidebars and panel divider
  initResizeHandles();
  initPanelDivider();

  // Auto-save via settings timer
  window.addEventListener('settings:auto-save', () => {
    if (isModified && currentFileHandle) saveFile();
  });

  // Warn on close with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (isModified) { e.preventDefault(); e.returnValue = ''; }
  });

  // Mode indicator
  const modeEl = document.getElementById('status-mode');
  if (modeEl) modeEl.addEventListener('click', () => Editor.togglePreview());

  // Settings button
  const settingsBtn = document.getElementById('status-settings');
  if (settingsBtn) settingsBtn.addEventListener('click', () => Settings.showPanel());

  // Word wrap toggle
  const wrapEl = document.getElementById('status-wrap');
  if (wrapEl) {
    wrapEl.addEventListener('click', () => { Editor.toggleWordWrap(); MenuBar.refreshMenuChecks(); });
  }

  // Temperature click-to-edit
  initStatusTempClick();

  MenuBar.refreshMenuChecks();
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
      let newWidth = startWidth + (direction === 'left' ? e.clientX - startX : startX - e.clientX);
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

// ── Panel divider ───────────────────────────────────────

function initPanelDivider() {
  const divider = document.getElementById('panel-divider');
  const fbPanel = document.getElementById('file-browser-panel');
  const outlinePanel = document.getElementById('outline-panel');
  const leftSidebar = document.getElementById('left-sidebar');
  if (!divider || !fbPanel || !outlinePanel || !leftSidebar) return;

  let startY, startFbHeight;
  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startY = e.clientY;
    const fbRect = fbPanel.getBoundingClientRect();
    startFbHeight = fbRect.height;
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
    fbPanel.style.flex = `1 1 ${(clamped / sidebarHeight) * 100}%`;
    fbPanel.style.transition = 'none';
    outlinePanel.style.flex = '1 1 auto';
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

  let fbState = 1, outlineState = 1;
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
    } else {
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
        clearTimeout(fbClickTimer); fbClickTimer = null;
        fbState = fbState === 2 ? 0 : 2;
        applyState(fbPanel, outlinePanel, fbState);
      } else {
        fbClickTimer = setTimeout(() => { fbClickTimer = null; fbState = (fbState + 1) % 3; applyState(fbPanel, outlinePanel, fbState); }, 250);
      }
    });
  }

  if (outlineHeader) {
    let outlineClickTimer;
    outlineHeader.addEventListener('click', (e) => {
      if (outlineClickTimer) {
        clearTimeout(outlineClickTimer); outlineClickTimer = null;
        outlineState = outlineState === 2 ? 0 : 2;
        applyState(outlinePanel, fbPanel, outlineState);
      } else {
        outlineClickTimer = setTimeout(() => { outlineClickTimer = null; outlineState = (outlineState + 1) % 3; applyState(outlinePanel, fbPanel, outlineState); }, 250);
      }
    });
  }
}

// ── Temp click-to-edit ───────────────────────────────────

function statusTempClick(span) {
  span.addEventListener('click', () => {
    const current = parseFloat(span.textContent) || 0.7;
    const input = document.createElement('input');
    input.type = 'number'; input.min = '0'; input.max = '2'; input.step = '0.1';
    input.value = current; input.className = 'status-temp-input';
    span.replaceWith(input); input.focus(); input.select();

    const finish = () => {
      let val = parseFloat(input.value);
      if (isNaN(val)) val = current;
      val = Math.max(0, Math.min(2, Math.round(val * 10) / 10));
      const newSpan = document.createElement('span');
      newSpan.id = 'status-temp'; newSpan.title = '点击修改温度值';
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

init();
