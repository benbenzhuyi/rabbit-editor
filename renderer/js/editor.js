/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Editor Module (CodeMirror 6)
   ═══════════════════════════════════════════════════════ */

import { basicSetup } from 'codemirror';
import { EditorView, keymap, Decoration } from '@codemirror/view';
import { EditorState, Compartment, StateEffect, StateField } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { marked } from 'marked';
import hljs from 'highlight.js';

// ── marked setup ────────────────────────────────────────

marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

// ── State ────────────────────────────────────────────────

let editorView = null;
let previewMode = false;
let lastCursorPos = null;
let currentFontSize = 16;
let wordWrapEnabled = true;
const FONT_MIN = 8;
const FONT_MAX = 32;
const FONT_DEFAULT = 16;
let changeCallbacks = [];
let cursorCallbacks = [];
let updateCallbacks = [];

const wrapCompartment = new Compartment();

// Search highlight decorations
const setSearchHighlights = StateEffect.define();
const clearSearchHighlights = StateEffect.define();

const searchHighlightField = StateField.define({
  create() { return Decoration.none; },
  update(decos, tr) {
    for (const e of tr.effects) {
      if (e.is(setSearchHighlights)) return e.value;
      if (e.is(clearSearchHighlights)) return Decoration.none;
    }
    return decos;
  },
  provide: f => EditorView.decorations.from(f),
});

// ── Custom dark theme ───────────────────────────────────

const rabbitDarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
    },
    '.cm-content': {
      fontFamily: "'Microsoft YaHei', 'Segoe UI', sans-serif",
      fontSize: '16px',
      lineHeight: '1.7',
      caretColor: '#aeafad',
    },
    '.cm-cursor': {
      borderLeftColor: '#aeafad',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(86, 156, 214, 0.35) !important',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    '.cm-gutters': {
      backgroundColor: '#1e1e1e',
      color: '#858585',
      border: 'none',
      borderRight: '1px solid #333',
      fontFamily: "'Consolas', 'Courier New', monospace",
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      color: '#c6c6c6',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#333',
      color: '#999',
      border: '1px solid #555',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      outline: '1px solid #888',
    },
    // Markdown heading styles
    '.cm-header-1': { fontSize: '1.5em', fontWeight: '700', color: '#569cd6' },
    '.cm-header-2': { fontSize: '1.3em', fontWeight: '700', color: '#569cd6' },
    '.cm-header-3': { fontSize: '1.15em', fontWeight: '600', color: '#569cd6' },
    '.cm-header-4': { fontSize: '1.05em', fontWeight: '600', color: '#569cd6' },
    '.cm-header-5, .cm-header-6': { fontWeight: '600', color: '#569cd6' },
    '.cm-strong': { fontWeight: '800', color: '#dcdcaa' },
    '.cm-emphasis': { fontStyle: 'italic', color: '#ce9178' },
    '.cm-strikethrough': { textDecoration: 'line-through', color: '#888' },
    '.cm-link, .cm-url': { color: '#4fc1ff', textDecoration: 'underline' },
    '.cm-link-text': { color: '#4ec9b0' },
    '.cm-quote': { color: '#6a9955', fontStyle: 'italic' },
    '.cm-list': { color: '#d7ba7d' },
    '.cm-codeBlock': { fontFamily: "'Consolas', 'Courier New', monospace" },
    '.cm-hr': { color: '#555' },
    '.cm-tooltip': {
      backgroundColor: '#2d2d2d',
      border: '1px solid #555',
      color: '#d4d4d4',
    },
  },
  { dark: true }
);

// ── Custom keybindings ──────────────────────────────────

const customKeymap = keymap.of([
  // Ctrl+D: duplicate current line
  {
    key: 'Ctrl-d',
    run: (view) => {
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      const tr = view.state.update({
        changes: { from: line.to + 1, insert: '\n' + line.text },
        selection: { anchor: line.to + 1 + line.text.length },
      });
      view.dispatch(tr);
      return true;
    },
  },
  // Ctrl+Shift+K: delete current line
  {
    key: 'Ctrl-Shift-k',
    run: (view) => {
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      const to = line.number < view.state.doc.lines ? line.to + 1 : line.to;
      const tr = view.state.update({
        changes: { from: line.from, to },
      });
      view.dispatch(tr);
      return true;
    },
  },
  // Alt+Up: move line up
  {
    key: 'Alt-ArrowUp',
    run: (view) => {
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      if (line.number <= 1) return true;
      const prevLine = view.state.doc.line(line.number - 1);
      const tr = view.state.update({
        changes: [
          { from: prevLine.from, to: line.to },
          line.text + '\n' + prevLine.text,
        ],
      });
      view.dispatch(tr);
      return true;
    },
  },
  // Alt+Down: move line down
  {
    key: 'Alt-ArrowDown',
    run: (view) => {
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      if (line.number >= view.state.doc.lines) return true;
      const nextLine = view.state.doc.line(line.number + 1);
      const tr = view.state.update({
        changes: [
          { from: line.from, to: nextLine.to },
          nextLine.text + '\n' + line.text,
        ],
      });
      view.dispatch(tr);
      return true;
    },
  },
]);

// ── Build extensions ────────────────────────────────────

function buildExtensions() {
  return [
    basicSetup,
    customKeymap,
    wrapCompartment.of(EditorView.lineWrapping),
    searchHighlightField,
    markdown({
      codeLanguages: languages,
    }),
    rabbitDarkTheme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        changeCallbacks.forEach(cb => cb());
      }
      if (update.selectionSet) {
        cursorCallbacks.forEach(cb => cb());
      }
      updateCallbacks.forEach(cb => cb());
    }),
  ];
}

// ── Public API ──────────────────────────────────────────

export function init(container) {
  const state = EditorState.create({
    doc: '',
    extensions: buildExtensions(),
  });

  editorView = new EditorView({
    state,
    parent: container,
  });

  // Trigger initial cursor update
  cursorCallbacks.forEach(cb => cb());
}

export function getContent() {
  return editorView ? editorView.state.doc.toString() : '';
}

export function setContent(text) {
  if (!editorView) return;
  if (previewMode) togglePreview();
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text },
  });
  // Trigger outline rebuild after content change
  updateCallbacks.forEach(cb => cb());
}

export function getCursorPosition() {
  if (!editorView) return { line: 1, column: 1 };
  const pos = editorView.state.selection.main.head;
  const line = editorView.state.doc.lineAt(pos);
  return { line: line.number, column: pos - line.from + 1 };
}

export function onChange(cb) { changeCallbacks.push(cb); }

export function onCursorActivity(cb) { cursorCallbacks.push(cb); }

export function onUpdate(cb) { updateCallbacks.push(cb); }

// ── Zoom ─────────────────────────────────────────────────

export function zoomIn() {
  setFontSize(currentFontSize + 1);
}

export function zoomOut() {
  setFontSize(currentFontSize - 1);
}

export function zoomReset() {
  setFontSize(FONT_DEFAULT);
}

function setFontSize(size) {
  currentFontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, size));
  if (!editorView) return;
  editorView.dom.style.fontSize = currentFontSize + 'px';
  const content = editorView.dom.querySelector('.cm-content');
  if (content) content.style.fontSize = currentFontSize + 'px';
}

export function getFontSize() {
  return currentFontSize;
}

// ── Preview toggle ──────────────────────────────────────

export function togglePreview() {
  const editorContainer = document.getElementById('editor-container');
  const previewContainer = document.getElementById('preview-container');
  const previewContent = document.getElementById('preview-content');
  const statusMode = document.getElementById('status-mode');

  if (!previewMode) {
    lastCursorPos = editorView.state.selection.main.head;
    previewContent.innerHTML = marked.parse(editorView.state.doc.toString());
    editorContainer.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    previewMode = true;
    statusMode.textContent = '预览';
    statusMode.className = 'preview-mode';
  } else {
    previewContainer.classList.add('hidden');
    editorContainer.classList.remove('hidden');
    previewMode = false;
    statusMode.textContent = '源码';
    statusMode.className = 'source-mode';
    if (lastCursorPos !== null && editorView) {
      editorView.dispatch({
        selection: { anchor: lastCursorPos },
        scrollIntoView: true,
      });
    }
    editorView.focus();
  }
}

export function isPreviewMode() {
  return previewMode;
}

export function focus() {
  if (editorView && !previewMode) editorView.focus();
}

export function getView() {
  return editorView;
}

export function highlightRanges(ranges, activeIdx) {
  if (!editorView) return;
  const marks = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const cls = i === activeIdx ? 'search-current' : 'search-match';
    marks.push(Decoration.mark({ class: cls }).range(r.from, r.to));
  }
  editorView.dispatch({
    effects: setSearchHighlights.of(Decoration.set(marks)),
  });
}

export function clearHighlights() {
  if (!editorView) return;
  editorView.dispatch({ effects: clearSearchHighlights.of(null) });
}

// ── Selection helpers ─────────────────────────────────────

export function getSelection() {
  if (!editorView) return null;
  const sel = editorView.state.selection.main;
  const fromLine = editorView.state.doc.lineAt(sel.from);
  const toLine = editorView.state.doc.lineAt(sel.to);
  return {
    text: editorView.state.sliceDoc(sel.from, sel.to),
    fromLine: fromLine.number,
    toLine: toLine.number,
    from: sel.from,
    to: sel.to,
    coords: getSelectionCoords(),
  };
}

function getSelectionCoords() {
  if (!editorView) return { top: 0, bottom: 0, left: 0 };
  const sel = editorView.state.selection.main;
  const startCoords = editorView.coordsAtPos(sel.from);
  const endCoords = editorView.coordsAtPos(sel.to);
  if (!startCoords || !endCoords) return { top: 0, bottom: 0, left: 0 };
  return {
    top: startCoords.top,
    bottom: endCoords.bottom,
    left: startCoords.left,
  };
}

export function replaceSelection(text) {
  if (!editorView) return;
  const sel = editorView.state.selection.main;
  const from = sel.from;
  editorView.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: from, head: from + text.length },
  });
  editorView.focus();
}

export function insertAfterSelection(text) {
  if (!editorView) return;
  const sel = editorView.state.selection.main;
  const insertPos = sel.to;
  const insertText = '\n' + text;
  editorView.dispatch({
    changes: { from: insertPos, insert: insertText },
    // Select the new content (skip leading newline), so user sees what was added
    selection: { anchor: insertPos + 1, head: insertPos + insertText.length },
  });
  editorView.focus();
}

export function selectLine(lineNumber) {
  if (!editorView) return;
  const line = editorView.state.doc.line(lineNumber);
  editorView.dispatch({
    selection: { anchor: line.from, head: line.to },
    scrollIntoView: true,
  });
}

export function getCurrentLineText() {
  if (!editorView) return '';
  const pos = editorView.state.selection.main.head;
  const line = editorView.state.doc.lineAt(pos);
  return line.text;
}

export function toggleWordWrap() {
  if (!editorView) return;
  wordWrapEnabled = !wordWrapEnabled;
  const el = document.getElementById('status-wrap');
  editorView.dispatch({
    effects: wrapCompartment.reconfigure(
      wordWrapEnabled ? EditorView.lineWrapping : []
    ),
  });
  if (el) {
    el.className = wordWrapEnabled ? 'wrap-on' : 'wrap-off';
  }
  return wordWrapEnabled;
}
