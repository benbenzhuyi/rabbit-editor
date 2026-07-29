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
import DOMPurify from 'dompurify';
import { duplicateLine, moveLineUp, moveLineDown } from './editCommands.js';

marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

let editorView = null;
let previewMode = false;
let lastSourceLine = 1;
let currentFontSize = 16;
let wordWrapEnabled = true;
const FONT_MIN = 8;
const FONT_MAX = 32;
const FONT_DEFAULT = 16;
let changeCallbacks = [];
let cursorCallbacks = [];
let updateCallbacks = [];

const wrapCompartment = new Compartment();
const themeCompartment = new Compartment();

const setSearchHighlights = StateEffect.define();
const clearSearchHighlights = StateEffect.define();

const searchHighlightField = StateField.define({
  create() { return Decoration.none; },
  update(decos, tr) {
    for (const e of tr.effects) {
      if (e.is(setSearchHighlights)) return e.value;
      if (e.is(clearSearchHighlights)) return Decoration.none;
    }
    return decos.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f),
});

const rabbitDarkTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#1e1e1e', color: '#d4d4d4' },
    '.cm-content': { fontFamily: "'Microsoft YaHei', 'Segoe UI', sans-serif", fontSize: '16px', lineHeight: '1.7', caretColor: '#aeafad' },
    '.cm-cursor': { borderLeftColor: '#aeafad' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'rgba(86, 156, 214, 0.35) !important' },
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
    '.cm-gutters': { backgroundColor: '#1e1e1e', color: '#858585', border: 'none', borderRight: '1px solid #333', fontFamily: "'Consolas', 'Courier New', monospace" },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(255, 255, 255, 0.03)', color: '#c6c6c6' },
    '.cm-foldPlaceholder': { backgroundColor: '#333', color: '#999', border: '1px solid #555' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(255, 255, 255, 0.1)', outline: '1px solid #888' },
    '.cm-header-1': { fontSize: '1.5em', fontWeight: '700', color: '#569cd6' },
    '.cm-header-2': { fontSize: '1.3em', fontWeight: '700', color: '#4fc1ff' },
    '.cm-header-3': { fontSize: '1.15em', fontWeight: '600', color: '#4ec9b0' },
    '.cm-header-4': { fontSize: '1.05em', fontWeight: '600', color: '#dcdcaa' },
    '.cm-header-5': { fontWeight: '600', color: '#ce9178' },
    '.cm-header-6': { fontWeight: '600', color: '#666' },
    '.cm-strong': { fontWeight: '800', color: '#dcdcaa' },
    '.cm-emphasis': { fontStyle: 'italic', color: '#ce9178' },
    '.cm-strikethrough': { textDecoration: 'line-through', color: '#888' },
    // Formatting marks
    '.cm-formatting': { color: '#b8b8b8' },
    '.cm-formatting-strong, .cm-formatting-em': { color: '#c0c0c0' },
    '.cm-link, .cm-url': { color: '#4fc1ff', textDecoration: 'underline' },
    '.cm-link-text': { color: '#4ec9b0' },
    '.cm-quote': { color: '#6a9955', fontStyle: 'italic' },
    '.cm-list': { color: '#d7ba7d' },
    '.cm-codeBlock': { fontFamily: "'Consolas', 'Courier New', monospace" },
    '.cm-hr': { color: '#8a8a6a' },
    '.cm-tooltip': { backgroundColor: '#2d2d2d', border: '1px solid #555', color: '#d4d4d4' },
  },
  { dark: true }
);

const rabbitLightTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#ffffff', color: '#333333' },
    '.cm-content': { fontFamily: "'Microsoft YaHei', 'Segoe UI', sans-serif", fontSize: '16px', lineHeight: '1.7', caretColor: '#333' },
    '.cm-cursor': { borderLeftColor: '#333' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'rgba(0, 120, 212, 0.25) !important' },
    '.cm-activeLine': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
    '.cm-gutters': { backgroundColor: '#f3f3f3', color: '#666', border: 'none', borderRight: '1px solid #d4d4d4', fontFamily: "'Consolas', 'Courier New', monospace" },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(0, 0, 0, 0.03)', color: '#333' },
    '.cm-foldPlaceholder': { backgroundColor: '#e0e0e0', color: '#666', border: '1px solid #ccc' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(0, 0, 0, 0.08)', outline: '1px solid #888' },
    '.cm-header-1': { fontSize: '1.5em', fontWeight: '700', color: '#0078d4' },
    '.cm-header-2': { fontSize: '1.3em', fontWeight: '700', color: '#106ebe' },
    '.cm-header-3': { fontSize: '1.15em', fontWeight: '600', color: '#267f6e' },
    '.cm-header-4': { fontSize: '1.05em', fontWeight: '600', color: '#7a6e00' },
    '.cm-header-5': { fontWeight: '600', color: '#8e562e' },
    '.cm-header-6': { fontWeight: '600', color: '#666666' },
    '.cm-strong': { fontWeight: '800', color: '#7a6e00' },
    '.cm-emphasis': { fontStyle: 'italic', color: '#8e562e' },
    '.cm-strikethrough': { textDecoration: 'line-through', color: '#888' },
    '.cm-link, .cm-url': { color: '#106ebe', textDecoration: 'underline' },
    '.cm-link-text': { color: '#267f6e' },
    '.cm-quote': { color: '#498039', fontStyle: 'italic' },
    '.cm-list': { color: '#8e562e' },
    '.cm-codeBlock': { fontFamily: "'Consolas', 'Courier New', monospace" },
    '.cm-hr': { color: '#7a7a50' },
    '.cm-formatting': { color: '#888' },
    '.cm-formatting-strong, .cm-formatting-em': { color: '#777' },
    '.cm-tooltip': { backgroundColor: '#f3f3f3', border: '1px solid #ccc', color: '#333' },
  },
  { dark: false }
);

const customKeymap = keymap.of([
  {
    key: 'Ctrl-d',
    run: (view) => {
      view.dispatch(view.state.update(duplicateLine(view.state)));
      return true;
    },
  },
  {
    key: 'Ctrl-Shift-k',
    run: (view) => {
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      const to = line.number < view.state.doc.lines ? line.to + 1 : line.to;
      view.dispatch(view.state.update({ changes: { from: line.from, to } }));
      return true;
    },
  },
  {
    key: 'Alt-ArrowUp',
    run: (view) => {
      const spec = moveLineUp(view.state);
      if (spec) view.dispatch(view.state.update(spec));
      return true;
    },
  },
  {
    key: 'Alt-ArrowDown',
    run: (view) => {
      const spec = moveLineDown(view.state);
      if (spec) view.dispatch(view.state.update(spec));
      return true;
    },
  },
]);

function buildExtensions() {
  return [
    basicSetup,
    customKeymap,
    wrapCompartment.of(EditorView.lineWrapping),
    searchHighlightField,
    markdown({ codeLanguages: languages }),
    themeCompartment.of(rabbitDarkTheme),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) changeCallbacks.forEach(cb => cb());
      if (update.selectionSet) cursorCallbacks.forEach(cb => cb());
      updateCallbacks.forEach(cb => cb());
    }),
  ];
}

export function init(container) {
  const state = EditorState.create({ doc: '', extensions: buildExtensions() });
  editorView = new EditorView({ state, parent: container });
  cursorCallbacks.forEach(cb => cb());
  applyEditorTheme();
}

export function applyEditorTheme() {
  if (!editorView) return;
  const isLight = document.documentElement.hasAttribute('data-theme') && document.documentElement.getAttribute('data-theme') === 'light';
  editorView.dispatch({ effects: themeCompartment.reconfigure(isLight ? rabbitLightTheme : rabbitDarkTheme) });
}

export function getContent() { return editorView ? editorView.state.doc.toString() : ''; }

export function setContent(text) {
  if (!editorView) return;
  if (previewMode) togglePreview();
  editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: text } });
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

export function zoomIn() { setFontSize(currentFontSize + 1); }
export function zoomOut() { setFontSize(currentFontSize - 1); }
export function zoomReset() { setFontSize(FONT_DEFAULT); }

function setFontSize(size) {
  currentFontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, size));
  if (editorView) {
    editorView.dom.style.fontSize = currentFontSize + 'px';
    const content = editorView.dom.querySelector('.cm-content');
    if (content) content.style.fontSize = currentFontSize + 'px';
  }

  // Preview and source mode share one zoom level.
  const previewContent = document.getElementById('preview-content');
  if (previewContent) previewContent.style.fontSize = currentFontSize + 'px';
}

export function getFontSize() { return currentFontSize; }

// ── Preview toggle ──────────────────────────────────────

export function togglePreview() {
  const ec = document.getElementById('editor-container');
  const pc = document.getElementById('preview-container');
  const pContent = document.getElementById('preview-content');
  const sm = document.getElementById('status-mode');

  if (!previewMode) {
    // ── Source → Preview ──────────────────────────────
    // Step 1: record which source line is at the top of the viewport RIGHT NOW
    const anchorLine = getSourceFirstVisibleLine();
    lastSourceLine = anchorLine;

    // Step 2: render markdown, injecting data-src-line on EVERY block element
    pContent.innerHTML = renderWithLineIds(editorView.state.doc.toString());
    pContent.style.fontSize = currentFontSize + 'px';

    // Step 3: show preview, hide editor
    ec.classList.add('hidden');
    pc.classList.remove('hidden');
    previewMode = true;
    sm.textContent = '预览';
    sm.className = 'preview-mode';

    // Step 4: after layout, scroll preview so that anchorLine is at the top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollPreviewToLine(pc, anchorLine);
      });
    });

  } else {
    // ── Preview → Source ──────────────────────────────
    // Step 1: find which source line is at the top of the preview RIGHT NOW
    // Must be done before hiding (hidden collapses layout)
    const anchorLine = getPreviewFirstVisibleLine(pc);
    lastSourceLine = anchorLine;

    // Step 2: show editor, hide preview
    pc.classList.add('hidden');
    ec.classList.remove('hidden');
    previewMode = false;
    sm.textContent = '源码';
    sm.className = 'source-mode';

    // Step 3: after editor is fully laid out, scroll so anchorLine is at the top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollEditorToLine(anchorLine);
        });
      });
    });
  }
}

// ── Helpers: get the first visible line ─────────────────

/**
 * Returns the 1-based line number of the first line currently visible
 * in the CodeMirror editor viewport.
 */
function getSourceFirstVisibleLine() {
  if (!editorView) return 1;
  // editorView.viewport.from is the document offset of the first rendered char.
  // We clamp to 0 so lineAt never throws.
  const topOffset = Math.max(0, editorView.viewport.from);
  // scrollTop of the scroll DOM gives us a more accurate "first visible" line
  // because viewport.from lags slightly when the editor hasn't re-measured yet.
  const scrollTop = editorView.scrollDOM.scrollTop;
  if (scrollTop <= 0) return 1;
  // Walk line by line from viewport.from upward to find the actual first visible line.
  const lineAtTop = editorView.state.doc.lineAt(topOffset);
  // Use coordsAtPos to find which line's top edge is at or just below scrollTop.
  for (let n = lineAtTop.number; n <= editorView.state.doc.lines; n++) {
    const lineObj = editorView.state.doc.line(n);
    const coords = editorView.coordsAtPos(lineObj.from);
    if (coords && coords.top >= editorView.scrollDOM.getBoundingClientRect().top) {
      return n;
    }
  }
  return lineAtTop.number;
}

/**
 * Returns the 1-based source line number of the topmost visible block
 * element in the preview container.
 */
function getPreviewFirstVisibleLine(pc) {
  if (!pc) return lastSourceLine;
  const containerTop = pc.getBoundingClientRect().top;
  const els = pc.querySelectorAll('[data-src-line]');
  for (const el of els) {
    const rect = el.getBoundingClientRect();
    // The first element whose bottom edge is below the container top is "visible"
    if (rect.bottom > containerTop) {
      return parseInt(el.dataset.srcLine, 10);
    }
  }
  return lastSourceLine;
}

// ── Helpers: scroll to a given source line ───────────────

/**
 * Scrolls the CodeMirror editor so that `lineNumber` appears at the top.
 * Uses pure scrollDOM arithmetic — no dispatch, no requestMeasure.
 */
function scrollEditorToLine(lineNumber) {
  if (!editorView) return;
  const total = editorView.state.doc.lines;
  const n = Math.max(1, Math.min(total, lineNumber));
  const lineObj = editorView.state.doc.line(n);
  // Move cursor to that line (no scrollIntoView — we handle scroll ourselves)
  editorView.dispatch({ selection: { anchor: lineObj.from }, scrollIntoView: false });
  // Now scroll so the line is flush at the top
  const coords = editorView.coordsAtPos(lineObj.from);
  const editorRect = editorView.scrollDOM.getBoundingClientRect();
  if (coords) {
    const offset = coords.top - editorRect.top;
    editorView.scrollDOM.scrollTop = editorView.scrollDOM.scrollTop + offset;
  }
  editorView.focus();
}

/**
 * Scrolls the preview container so that the element with
 * data-src-line closest to `lineNumber` appears at the top.
 */
function scrollPreviewToLine(pc, lineNumber) {
  const els = Array.from(pc.querySelectorAll('[data-src-line]'));
  if (els.length === 0) { pc.scrollTop = 0; return; }

  // Find the element whose data-src-line is the largest value ≤ lineNumber.
  // That is the block that "contains" or immediately precedes the anchor line.
  let best = els[0];
  for (const el of els) {
    const ln = parseInt(el.dataset.srcLine, 10);
    if (ln <= lineNumber) best = el;
    else break;
  }

  // Scroll so best's top edge aligns with the container's top.
  const containerTop = pc.getBoundingClientRect().top;
  const elTop = best.getBoundingClientRect().top;
  pc.scrollTop = pc.scrollTop + (elTop - containerTop);
}

// ── Markdown renderer: inject data-src-line on every block ──

/**
 * Parses the markdown source line-by-line and produces HTML where every
 * top-level block element carries a data-src-line attribute pointing back
 * to the source line it originated from.  This covers headings, paragraphs,
 * list items, blockquotes, code fences, and horizontal rules — so the sync
 * logic always has a nearby anchor regardless of content type.
 */
function renderWithLineIds(src) {
  const lines = src.split('\n');
  const totalLines = lines.length;

  // ── Pass 1: tag each source line with its 1-based number ──────────────
  // We emit one comment sentinel per logical block start,
  // then let marked render the whole document.  Because we can't easily
  // hook into marked's AST here, we use a two-step approach:
  //   a) Render full HTML with marked (correct output).
  //   b) Build a line→element mapping by inserting unique markers BEFORE
  //      rendering, then replace them with data attributes after.

  // Build a map: for each line index, is it a "block start"?
  const blockStartLines = [];
  let inFence = false;
  for (let i = 0; i < totalLines; i++) {
    const line = lines[i];
    // Track fenced code blocks (``` or ~~~)
    if (/^(`{3,}|~{3,})/.test(line)) {
      if (!inFence) {
        blockStartLines.push(i + 1); // code fence start → new block
        inFence = true;
      } else {
        inFence = false; // closing fence — not a new block start
      }
      continue;
    }
    if (inFence) continue; // inside a code block — skip

    const trimmed = line.trim();
    if (trimmed === '') continue; // blank line — not a block

    // Headings, thematic breaks, setext underlines are always block starts
    if (/^#{1,6}\s/.test(trimmed)) { blockStartLines.push(i + 1); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) { blockStartLines.push(i + 1); continue; }
    // List items
    if (/^(\*|-|\+|\d+[.)]) /.test(trimmed)) { blockStartLines.push(i + 1); continue; }
    // Blockquotes
    if (/^>/.test(trimmed)) { blockStartLines.push(i + 1); continue; }
    // Paragraph: first non-empty line after a blank line (or start of doc)
    const prevTrimmed = i > 0 ? lines[i - 1].trim() : '';
    if (prevTrimmed === '') { blockStartLines.push(i + 1); continue; }
  }
  if (blockStartLines.length === 0) blockStartLines.push(1);

  // ── Pass 2: inject sentinel comments into source, render, then annotate ─
  // We insert comment markers before each block-start line. Unlike an HTML
  // element, a comment does not make marked treat the following Markdown as
  // a raw HTML block.
  const markedLines = [...lines];
  // Insert sentinels from bottom to top so indices stay stable.
  for (let k = blockStartLines.length - 1; k >= 0; k--) {
    const lineIdx = blockStartLines[k] - 1; // 0-based
    markedLines.splice(lineIdx, 0, `<!--SRC_LINE_${blockStartLines[k]}-->`);
  }

  // ── Pass 3: annotate the detached result, then sanitize the final HTML ──
  const wrapper = document.createElement('div');
  wrapper.innerHTML = marked.parse(markedLines.join('\n'));

  let lastLine = 1;
  const childNodes = Array.from(wrapper.childNodes);
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    if (node.nodeType === Node.COMMENT_NODE) {
      const marker = /^SRC_LINE_(\d+)$/.exec(node.nodeValue || '');
      if (!marker) continue;
      lastLine = parseInt(marker[1], 10);
      node.remove();
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.dataset.srcLine = lastLine;
    }
  }

  return DOMPurify.sanitize(wrapper.innerHTML, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style'],
  });
}

export function setLastCursorPos(lineNumber) { lastSourceLine = lineNumber; }

export function isPreviewMode() { return previewMode; }
export function focus() { if (editorView && !previewMode) editorView.focus(); }
export function getView() { return editorView; }

export function highlightRanges(ranges, activeIdx) {
  if (!editorView) return;
  const marks = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const cls = i === activeIdx ? 'search-current' : 'search-match';
    marks.push(Decoration.mark({ class: cls }).range(r.from, r.to));
  }
  editorView.dispatch({ effects: setSearchHighlights.of(Decoration.set(marks)) });
}

export function clearHighlights() {
  if (!editorView) return;
  editorView.dispatch({ effects: clearSearchHighlights.of(null) });
}

export function getSelection() {
  if (!editorView) return null;
  const sel = editorView.state.selection.main;
  const fromLine = editorView.state.doc.lineAt(sel.from);
  const toLine = editorView.state.doc.lineAt(sel.to);
  return {
    text: editorView.state.sliceDoc(sel.from, sel.to),
    fromLine: fromLine.number, toLine: toLine.number,
    from: sel.from, to: sel.to,
    coords: getSelectionCoords(),
  };
}

function getSelectionCoords() {
  if (!editorView) return { top: 0, bottom: 0, left: 0 };
  const sel = editorView.state.selection.main;
  const startCoords = editorView.coordsAtPos(sel.from);
  const endCoords = editorView.coordsAtPos(sel.to);
  if (!startCoords || !endCoords) return { top: 0, bottom: 0, left: 0 };
  return { top: startCoords.top, bottom: endCoords.bottom, left: startCoords.left };
}

export function replaceSelection(text) {
  if (!editorView) return;
  const sel = editorView.state.selection.main;
  const from = sel.from;
  editorView.dispatch({ changes: { from: sel.from, to: sel.to, insert: text }, selection: { anchor: from, head: from + text.length } });
  editorView.focus();
}

export function insertAfterSelection(text) {
  if (!editorView) return;
  const sel = editorView.state.selection.main;
  const insertPos = sel.to;
  const insertText = '\n' + text;
  editorView.dispatch({ changes: { from: insertPos, insert: insertText }, selection: { anchor: insertPos + 1, head: insertPos + insertText.length } });
  editorView.focus();
}

export function selectLine(lineNumber) {
  if (!editorView) return;
  const line = editorView.state.doc.line(lineNumber);
  editorView.dispatch({ selection: { anchor: line.from, head: line.to }, scrollIntoView: true });
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
  editorView.dispatch({ effects: wrapCompartment.reconfigure(wordWrapEnabled ? EditorView.lineWrapping : []) });
  if (el) el.className = wordWrapEnabled ? 'wrap-on' : 'wrap-off';
  return wordWrapEnabled;
}
