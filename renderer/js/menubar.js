/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Menu Bar Module
   ═══════════════════════════════════════════════════════ */

import * as App from './app.js';
import * as FileBrowser from './fileBrowser.js';
import * as Editor from './editor.js';
import * as Settings from './settings.js';
import * as I18n from './i18n.js';
import * as AiPanel from './aiPanel.js';
import * as CtrlKPopup from './ctrlKPopup.js';
import * as SearchReplace from './searchReplace.js';
import * as Help from './help.js';

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
  find: () => {
    const sel = Editor.getSelection();
    SearchReplace.openSearch(sel?.text || '');
  },
  replace: () => {
    const sel = Editor.getSelection();
    SearchReplace.openReplace(sel?.text || '');
  },
  copyLine: () => Editor.focus(), // Handled by CodeMirror keymap
  deleteLine: () => Editor.focus(), // Handled by CodeMirror keymap
  selectionAiEdit: () => CtrlKPopup.showCtrlKPopup(),
  selectionQuoteAi: () => AiPanel.quoteToAI(),
  aiReplaceSelection: () => AiPanel.replaceWithLastResponse(),
  aiInsertSelection: () => AiPanel.insertLastResponse(),
  copyAiReply: () => AiPanel.copyLastResponse(),

  togglePreview: () => Editor.togglePreview(),
  zoomIn: () => Editor.zoomIn(),
  zoomOut: () => Editor.zoomOut(),
  zoomReset: () => Editor.zoomReset(),
  themeDark: () => {
    document.documentElement.removeAttribute('data-theme');
    Editor.applyEditorTheme();
    refreshMenuChecks();
  },
  themeLight: () => {
    document.documentElement.setAttribute('data-theme', 'light');
    Editor.applyEditorTheme();
    refreshMenuChecks();
  },
  wordWrap: () => {
    Editor.toggleWordWrap();
    refreshMenuChecks();
  },
  settings: () => Settings.showPanel(),
  toggleLeftSidebar: () => {
    document.getElementById('left-sidebar')?.classList.toggle('hidden');
    refreshMenuChecks();
  },
  toggleRightSidebar: () => {
    document.getElementById('right-sidebar')?.classList.toggle('hidden');
    refreshMenuChecks();
  },
  windowNormal: async () => {
    await window.electronAPI.setWindowMode(1);
    refreshMenuChecks();
  },
  windowFullscreenMenu: async () => {
    await window.electronAPI.setWindowMode(2);
    refreshMenuChecks();
  },
  windowFullscreenClean: async () => {
    await window.electronAPI.setWindowMode(3);
    refreshMenuChecks();
  },
  cycleWindowMode: async () => {
    await App.cycleWindowMode();
    refreshMenuChecks();
  },

  startupRestore: () => {
    const settings = Settings.getSettings();
    const newMode = (settings.startupMode || 'default') === 'default' ? 'last' : 'default';
    Settings.setStartupMode(newMode);
  },
  rabbitHelp: () => Help.showHelp(),
  shortcutList: () => Help.showShortcuts(),
  aboutRabbit: () => Help.showAbout(),

  setLanguage: async (language) => {
    if (!language || language === Settings.getSettings().language) return;
    await Settings.setLanguage(language);
    alert(`${I18n.t('restartTitle')}\n\n${I18n.t('restartMessage')}`);
    refreshMenuChecks();
  },
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
        refreshMenuChecks();
      }
    });

    // Click on dropdown items
    if (dropdown) {
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdownItem = e.target.closest('.menu-dropdown-item');
        if (!dropdownItem || dropdownItem.classList.contains('disabled')) return;

        const action = dropdownItem.dataset.action;
        if (action === 'setLanguage') {
          closeAllMenus();
          menuActions.setLanguage(dropdownItem.dataset.language);
          return;
        }
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

// ── Refresh checkmarks based on current state ─────────────

export function refreshMenuChecks() {
  // Word wrap
  const wwItem = document.getElementById('menu-item-wordwrap');
  if (wwItem) {
    const wrapEl = document.getElementById('status-wrap');
    const wrapOn = wrapEl && wrapEl.classList.contains('wrap-on');
    wwItem.classList.toggle('checked', !!wrapOn);
  }

  // Sidebars are checked while visible.
  const leftSidebarItem = document.getElementById('menu-item-left-sidebar');
  const rightSidebarItem = document.getElementById('menu-item-right-sidebar');
  const leftSidebar = document.getElementById('left-sidebar');
  const rightSidebar = document.getElementById('right-sidebar');
  if (leftSidebarItem) leftSidebarItem.classList.toggle('checked', !!leftSidebar && !leftSidebar.classList.contains('hidden'));
  if (rightSidebarItem) rightSidebarItem.classList.toggle('checked', !!rightSidebar && !rightSidebar.classList.contains('hidden'));

  // Window modes are mutually exclusive.
  window.electronAPI.getWindowMode().then((mode) => {
    const modeItems = {
      1: document.getElementById('menu-item-window-normal'),
      2: document.getElementById('menu-item-window-fullscreen-menu'),
      3: document.getElementById('menu-item-window-fullscreen-clean'),
    };
    Object.entries(modeItems).forEach(([itemMode, item]) => {
      item?.classList.toggle('checked', Number(itemMode) === mode);
    });
  });

  // Theme
  const isLight = document.documentElement.hasAttribute('data-theme') &&
    document.documentElement.getAttribute('data-theme') === 'light';
  const darkItem = document.getElementById('menu-item-theme-dark');
  const lightItem = document.getElementById('menu-item-theme-light');
  if (darkItem) darkItem.classList.toggle('checked', !isLight);
  if (lightItem) lightItem.classList.toggle('checked', !!isLight);

  // Startup mode
  const settings = Settings.getSettings();
  const startupMode = settings.startupMode || 'default';
  const restoreItem = document.getElementById('menu-item-startup-restore');
  console.log('[startupMode] item:', restoreItem, 'mode:', startupMode);
  if (restoreItem) restoreItem.classList.toggle('checked', startupMode === 'last');

  const language = settings.language || 'zh-CN';
  document.querySelectorAll('[data-action="setLanguage"]').forEach((item) => {
    item.classList.toggle('checked', item.dataset.language === language);
  });
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
      `<div class="menu-dropdown-item disabled">${I18n.t('noRecentFiles')}</div>`;
    return;
  }

  container.innerHTML = recentFiles
    .map((fp) => {
      const display = fp.length > 80 ? '...' + fp.slice(-77) : fp;
      return `<div class="menu-dropdown-item" data-filepath="${fp.replace(/"/g, '&quot;')}">${escapeHtml(display)}</div>`;
    })
    .join('');
}

// ── Keyboard menu access (Alt+F, Alt+E, Alt+V, Alt+A, Alt+S, Alt+H) ──

export function openMenuByKey(key) {
  const map = {
    f: 'file',
    e: 'edit',
    v: 'view',
    a: 'ai',
    s: 'settings',
    h: 'help',
  };
  const menuName = map[key.toLowerCase()];
  if (!menuName) return;

  const menuItem = document.querySelector(`.menu-item[data-menu="${menuName}"]`);
  if (menuItem) {
    closeAllMenus();
    menuItem.classList.add('active');
    activeMenu = menuItem;
    refreshMenuChecks();
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
