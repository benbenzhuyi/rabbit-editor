/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Keybindings Module
   ═══════════════════════════════════════════════════════ */

import * as App from './app.js';
import * as Editor from './editor.js';
import * as Outline from './outline.js';
import * as AiPanel from './aiPanel.js';
import * as CtrlKPopup from './ctrlKPopup.js';
import * as SearchReplace from './searchReplace.js';
import * as Settings from './settings.js';
import * as MenuBar from './menubar.js';

// ── Init ─────────────────────────────────────────────────

export function init() {
  document.addEventListener('keydown', handleKeydown);

  // Capture-phase intercept on editor area for CodeMirror-bound shortcuts
  const editorArea = document.getElementById('editor-area');
  if (editorArea) {
    editorArea.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl || e.shiftKey) return;

      const code = e.code;
      if (code === 'KeyL') {
        e.preventDefault();
        e.stopImmediatePropagation();
        AiPanel.quoteToAI();
      } else if (code === 'KeyK') {
        e.preventDefault();
        e.stopImmediatePropagation();
        CtrlKPopup.showCtrlKPopup();
      } else if (code === 'KeyF') {
        e.preventDefault();
        e.stopImmediatePropagation();
        const sel = Editor.getSelection();
        SearchReplace.openSearch(sel?.text || '');
      } else if (code === 'KeyH') {
        e.preventDefault();
        e.stopImmediatePropagation();
        const sel = Editor.getSelection();
        SearchReplace.openReplace(sel?.text || '');
      } else if (code === 'Comma') {
        e.preventDefault();
        e.stopImmediatePropagation();
        Settings.showPanel();
      }
    }, true); // capture phase
  }

  // Also listen at window capture level as fallback for Ctrl+,
  // in case the editor-area listener never fires (e.g. <body> focused)
  window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && !e.shiftKey && e.code === 'Comma') {
      e.preventDefault();
      Settings.showPanel();
    }
  }, true);
}

// ── Global shortcut handler ─────────────────────────────

function handleKeydown(e) {
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;
  const alt = e.altKey;

  // F11: cycle window mode
  if (e.key === 'F11') {
    e.preventDefault();
    App.cycleWindowMode();
    return;
  }

  // Ctrl+Shift+1/2/3: set window mode
  if (ctrl && shift && (e.key === '!' || e.key === '1')) {
    e.preventDefault();
    window.electronAPI.setWindowMode(1);
    return;
  }
  if (ctrl && shift && (e.key === '@' || e.key === '2')) {
    e.preventDefault();
    window.electronAPI.setWindowMode(2);
    return;
  }
  if (ctrl && shift && (e.key === '#' || e.key === '3')) {
    e.preventDefault();
    window.electronAPI.setWindowMode(3);
    return;
  }

  // Ctrl+Shift+P: toggle preview
  if (ctrl && shift && (e.key === 'P' || e.key === 'p')) {
    e.preventDefault();
    Editor.togglePreview();
    return;
  }

  // Ctrl+N: new file
  if (ctrl && !shift && (e.key === 'N' || e.key === 'n')) {
    e.preventDefault();
    App.newFile();
    return;
  }

  // Ctrl+O: open file
  if (ctrl && !shift && (e.key === 'O' || e.key === 'o')) {
    e.preventDefault();
    App.openFile();
    return;
  }

  // Ctrl+S: save
  if (ctrl && !shift && (e.key === 'S' || e.key === 's')) {
    e.preventDefault();
    App.saveFile();
    return;
  }

  // Ctrl+Shift+S: save as
  if (ctrl && shift && (e.key === 'S' || e.key === 's')) {
    e.preventDefault();
    App.saveFileAs();
    return;
  }

  // Ctrl+W: close file
  if (ctrl && !shift && (e.key === 'W' || e.key === 'w')) {
    e.preventDefault();
    App.closeFile();
    return;
  }

  // Ctrl+B: toggle left sidebar
  if (ctrl && !shift && (e.key === 'B' || e.key === 'b')) {
    e.preventDefault();
    const sidebar = document.getElementById('left-sidebar');
    if (sidebar) sidebar.classList.toggle('hidden');
    return;
  }

  // Ctrl+J: toggle right AI panel
  if (ctrl && !shift && (e.key === 'J' || e.key === 'j')) {
    e.preventDefault();
    const sidebar = document.getElementById('right-sidebar');
    if (sidebar) sidebar.classList.toggle('hidden');
    return;
  }

  // Ctrl+= zoom in
  if (ctrl && !shift && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    Editor.zoomIn();
    return;
  }

  // Ctrl+- zoom out
  if (ctrl && !shift && (e.key === '-' || e.key === '_')) {
    e.preventDefault();
    Editor.zoomOut();
    return;
  }

  // Ctrl+0 zoom reset
  if (ctrl && !shift && (e.key === '0' || e.key === ')')) {
    e.preventDefault();
    Editor.zoomReset();
    return;
  }

  // Ctrl+, settings
  if (ctrl && !shift && e.code === 'Comma') {
    e.preventDefault();
    Settings.showPanel();
    return;
  }

  // F1: help (placeholder)
  if (e.key === 'F1') {
    e.preventDefault();
    // Help not implemented in Phase 1
    return;
  }

  // Ctrl+L: quote to AI
  if (ctrl && !shift && (e.key === 'L' || e.key === 'l')) {
    e.preventDefault();
    AiPanel.quoteToAI();
    return;
  }

  // Ctrl+K: inline quick edit popup
  if (ctrl && !shift && (e.key === 'K' || e.key === 'k')) {
    e.preventDefault();
    CtrlKPopup.showCtrlKPopup();
    return;
  }

  // Ctrl+Shift+C: copy last AI response
  if (ctrl && shift && (e.key === 'C' || e.key === 'c')) {
    e.preventDefault();
    AiPanel.copyLastResponse();
    return;
  }

  // Ctrl+Shift+T: replace selection with last AI response
  if (ctrl && shift && (e.key === 'T' || e.key === 't')) {
    e.preventDefault();
    AiPanel.replaceWithLastResponse();
    return;
  }

  // Ctrl+Shift+I: insert last AI response after selection
  if (ctrl && shift && (e.key === 'I' || e.key === 'i')) {
    e.preventDefault();
    AiPanel.insertLastResponse();
    return;
  }

  // Alt+L: focus AI input
  if (alt && !ctrl && !shift && (e.key === 'L' || e.key === 'l')) {
    e.preventDefault();
    const input = document.getElementById('ai-input');
    if (input) {
      const sidebar = document.getElementById('right-sidebar');
      if (sidebar && sidebar.classList.contains('hidden')) sidebar.classList.remove('hidden');
      input.focus();
    }
    return;
  }

  // Alt+F/E/V/A/S: open menus
  if (alt && !ctrl && !shift) {
    const menuKeys = ['f', 'e', 'v', 'a', 's'];
    if (menuKeys.includes(e.key.toLowerCase())) {
      e.preventDefault();
      MenuBar.openMenuByKey(e.key);
      return;
    }
  }

  // Ctrl+F: find
  if (ctrl && !shift && (e.key === 'F' || e.key === 'f')) {
    e.preventDefault();
    const sel = Editor.getSelection();
    SearchReplace.openSearch(sel?.text || '');
    return;
  }

  // Ctrl+H: replace
  if (ctrl && !shift && (e.key === 'H' || e.key === 'h')) {
    e.preventDefault();
    const sel = Editor.getSelection();
    SearchReplace.openReplace(sel?.text || '');
    return;
  }

  // F3: find next
  if (e.key === 'F3' && !e.shiftKey) {
    e.preventDefault();
    // SearchReplace handles this internally via its own listeners
    // Focus the search input for navigation
    const input = document.getElementById('search-input');
    if (input && !SearchReplace.isSearchVisible()) {
      SearchReplace.openSearch();
    }
    return;
  }

  // Shift+F3: find previous
  // (F3 and Shift+F3 navigation is handled by searchReplace's own listeners)

  // Alt+Shift+1~6: collapse outline to heading level
  if (alt && shift && e.key >= '1' && e.key <= '6') {
    e.preventDefault();
    Outline.collapseToLevel(parseInt(e.key, 10));
    return;
  }

  // Alt+Shift+9: expand all outline
  if (alt && shift && (e.key === '9' || e.key === '(')) {
    e.preventDefault();
    Outline.expandAll();
    return;
  }

  // Ctrl+Alt+T: toggle theme (dark/light)
  if (ctrl && alt && !shift && (e.key === 'T' || e.key === 't')) {
    e.preventDefault();
    const isLight = document.documentElement.hasAttribute('data-theme') &&
      document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    Editor.applyEditorTheme();
    MenuBar.refreshMenuChecks();
    return;
  }

  // Ctrl+Shift+W: toggle word wrap
  if (ctrl && shift && (e.key === 'W' || e.key === 'w')) {
    e.preventDefault();
    Editor.toggleWordWrap();
    MenuBar.refreshMenuChecks();
    return;
  }

  // Ctrl+wheel: handled in initWheelZoom
}

// ── Wheel zoom ───────────────────────────────────────────

export function initWheelZoom() {
  const editorArea = document.getElementById('editor-area');
  if (!editorArea) return;

  editorArea.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        Editor.zoomIn();
      } else {
        Editor.zoomOut();
      }
    }
  }, { passive: false });
}
