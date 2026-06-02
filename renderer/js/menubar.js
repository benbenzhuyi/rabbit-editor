/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Menu Bar Module
   ═══════════════════════════════════════════════════════ */

import * as App from './app.js';
import * as FileBrowser from './fileBrowser.js';
import * as Editor from './editor.js';

// ── State ────────────────────────────────────────────────

let activeMenu = null;

// ── Menu action handlers ────────────────────────────────

const menuActions = {
  new: () => App.newFile(),
  open: () => App.openFile(),
  save: () => App.saveFile(),
  saveAs: () => App.saveFileAs(),
  openFolder: () => openFolderDialog(),
  closeFile: () => App.closeFile(),
  exit: () => window.close(),

  undo: () => document.execCommand('undo'),
  redo: () => document.execCommand('redo'),
  cut: () => document.execCommand('cut'),
  copy: () => document.execCommand('copy'),
  paste: () => document.execCommand('paste'),
  selectAll: () => document.execCommand('selectAll'),
  copyLine: () => Editor.focus(), // Handled by CodeMirror keymap
  deleteLine: () => Editor.focus(), // Handled by CodeMirror keymap

  togglePreview: () => Editor.togglePreview(),
  zoomIn: () => Editor.zoomIn(),
  zoomOut: () => Editor.zoomOut(),
  zoomReset: () => Editor.zoomReset(),
  themeDark: () => {
    document.documentElement.removeAttribute('data-theme');
    Editor.applyEditorTheme();
  },
  themeLight: () => {
    document.documentElement.setAttribute('data-theme', 'light');
    Editor.applyEditorTheme();
  },
  wordWrap: () => Editor.toggleWordWrap(),
  fontSizeUp: () => Editor.zoomIn(),
  fontSizeDown: () => Editor.zoomOut(),
};

// ── Init ─────────────────────────────────────────────────

export function init() {
  const menuItems = document.querySelectorAll('.menu-item');

  menuItems.forEach((item) => {
    const label = item.querySelector('.menu-label');
    const dropdown = item.querySelector('.menu-dropdown');

    // Click on menu label
    label.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeMenu === item) {
        closeAllMenus();
      } else {
        closeAllMenus();
        item.classList.add('active');
        activeMenu = item;
      }
    });

    // Click on dropdown items
    if (dropdown) {
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdownItem = e.target.closest('.menu-dropdown-item');
        if (!dropdownItem || dropdownItem.classList.contains('disabled')) return;

        const action = dropdownItem.dataset.action;
        if (action && menuActions[action]) {
          closeAllMenus();
          menuActions[action]();
        }
        // recent: handled separately via submenu clicks
      });
    }
  });

  // Handle recent file submenu clicks
  const recentMenu = document.getElementById('menu-recent-files');
  if (recentMenu) {
    recentMenu.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = e.target.closest('.menu-dropdown-item');
      if (!item || item.classList.contains('disabled')) return;
      const filePath = item.dataset.filepath;
      if (filePath) {
        closeAllMenus();
        await App.openRecentFile(filePath);
      }
    });
  }

  // Close menus on outside click
  document.addEventListener('click', () => {
    closeAllMenus();
  });
}

// ── Close all menus ─────────────────────────────────────

function closeAllMenus() {
  document.querySelectorAll('.menu-item').forEach((m) => m.classList.remove('active'));
  activeMenu = null;
}

export function closeMenus() {
  closeAllMenus();
}

// ── Update recent files ─────────────────────────────────

export function updateRecentFiles(recentFiles) {
  const container = document.getElementById('menu-recent-files');
  if (!container) return;

  if (!recentFiles || recentFiles.length === 0) {
    container.innerHTML =
      '<div class="menu-dropdown-item disabled">（无最近文件）</div>';
    return;
  }

  container.innerHTML = recentFiles
    .map((fp) => {
      const display = fp.length > 80 ? '...' + fp.slice(-77) : fp;
      return `<div class="menu-dropdown-item" data-filepath="${fp.replace(/"/g, '&quot;')}">${escapeHtml(display)}</div>`;
    })
    .join('');
}

// ── Keyboard menu access (Alt+F, Alt+E, Alt+V, Alt+A, Alt+S) ──

export function openMenuByKey(key) {
  const map = {
    f: 'file',
    e: 'edit',
    v: 'view',
    a: 'ai',
    s: 'settings',
  };
  const menuName = map[key.toLowerCase()];
  if (!menuName) return;

  const menuItem = document.querySelector(`.menu-item[data-menu="${menuName}"]`);
  if (menuItem) {
    closeAllMenus();
    menuItem.classList.add('active');
    activeMenu = menuItem;
  }
}

// ── Helpers ──────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function openFolderDialog() {
  const result = await window.electronAPI.openFolderDialog();
  if (result.success) {
    FileBrowser.setRootDir(result.folderPath);
  }
}
