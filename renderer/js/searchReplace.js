/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Search & Replace Module
   ═══════════════════════════════════════════════════════ */

import * as Editor from './editor.js';
import { SearchCursor } from '@codemirror/search';

let matches = [];
let currentIndex = -1;
let searchVisible = false;
let replaceVisible = false;
let previewOriginalHTML = ''; // saved on search, restored on close

export function init() {
  const searchInput = document.getElementById('search-input');
  const toggleBtn = document.getElementById('search-toggle-replace');
  const closeBtn = document.getElementById('search-close');
  const prevBtn = document.getElementById('search-prev');
  const nextBtn = document.getElementById('search-next');
  const replaceOneBtn = document.getElementById('replace-one');
  const replaceAllBtn = document.getElementById('replace-all');
  const searchBar = document.getElementById('search-bar');
  const dragHandle = searchBar?.querySelector('.search-drag-handle');

  if (dragHandle && searchBar) {
    let dragStartX, dragStartY, barStartX, barStartY;
    dragHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragStartX = e.clientX; dragStartY = e.clientY;
      const rect = searchBar.getBoundingClientRect();
      barStartX = rect.left; barStartY = rect.top;
      searchBar.classList.add('dragging');
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!searchBar.classList.contains('dragging')) return;
      searchBar.style.left = (barStartX + e.clientX - dragStartX) + 'px';
      searchBar.style.top = (barStartY + e.clientY - dragStartY) + 'px';
      searchBar.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (!searchBar.classList.contains('dragging')) return;
      searchBar.classList.remove('dragging');
      document.body.style.userSelect = '';
    });
  }

  searchInput.addEventListener('input', () => performSearch());
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); navigateMatch(e.shiftKey ? -1 : 1); }
    if (e.key === 'Escape') closeSearch();
  });
  closeBtn.addEventListener('click', () => closeSearch());
  prevBtn.addEventListener('click', () => navigateMatch(-1));
  nextBtn.addEventListener('click', () => navigateMatch(1));
  toggleBtn.addEventListener('click', () => toggleReplace());
  replaceOneBtn.addEventListener('click', () => replaceCurrent());
  replaceAllBtn.addEventListener('click', () => replaceAll());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchVisible) { closeSearch(); Editor.focus(); }
  });
}

export function openSearch(presetQuery) {
  const bar = document.getElementById('search-bar');
  const input = document.getElementById('search-input');
  bar.classList.remove('hidden');
  searchVisible = true;
  if (presetQuery) { input.value = presetQuery; performSearch(); }
  input.focus(); input.select();
}

export function openReplace(presetQuery) {
  openSearch(presetQuery);
  if (!replaceVisible) toggleReplace();
}

export function closeSearch() {
  document.getElementById('search-bar').classList.add('hidden');
  searchVisible = false;
  matches = []; currentIndex = -1;
  clearAllHighlights();
  // Restore preview HTML if we modified it
  if (previewOriginalHTML) {
    const container = document.getElementById('preview-content');
    if (container) container.innerHTML = previewOriginalHTML;
    previewOriginalHTML = '';
  }
}

function toggleReplace() {
  const row = document.getElementById('replace-row');
  const btn = document.getElementById('search-toggle-replace');
  replaceVisible = !replaceVisible;
  row.classList.toggle('hidden', !replaceVisible);
  btn.classList.toggle('expanded', replaceVisible);
  if (replaceVisible) document.getElementById('replace-input').focus();
}

// ── Search engine (works in both source and preview modes) ──

function performSearch() {
  const query = document.getElementById('search-input').value;
  const countEl = document.getElementById('search-count');
  if (!query) {
    matches = []; currentIndex = -1;
    clearAllHighlights();
    countEl.textContent = '';
    return;
  }

  if (Editor.isPreviewMode()) {
    performPreviewSearch(query);
  } else {
    performSourceSearch(query);
  }

  if (matches.length > 0) {
    currentIndex = 0;
    countEl.textContent = `1 / ${matches.length}`;
    countEl.className = 'search-count';
    selectMatch(0);
  } else {
    currentIndex = -1;
    countEl.textContent = '无结果';
    countEl.className = 'search-count no-results';
  }
}

function performSourceSearch(query) {
  const view = Editor.getView();
  if (!view) { matches = []; return; }
  matches = [];
  const cursor = new SearchCursor(view.state.doc, query);
  while (!cursor.next().done) {
    matches.push({ from: cursor.value.from, to: cursor.value.to, type: 'source' });
  }
  Editor.highlightRanges(matches, currentIndex);
}

function performPreviewSearch(query) {
  const container = document.getElementById('preview-content');
  if (!container) { matches = []; return; }

  // Save original HTML for restore on close
  if (!previewOriginalHTML) {
    previewOriginalHTML = container.innerHTML;
  } else {
    // Restore original before re-searching
    container.innerHTML = previewOriginalHTML;
  }

  // Insert <mark> tags around matches by replacing innerHTML
  const escaped = escapeRegex(query);
  const regex = new RegExp(`(${escaped})`, 'gi');
  container.innerHTML = container.innerHTML.replace(regex, '<mark class="search-match">$1</mark>');

  // Collect all <mark> elements as matches
  matches = [];
  const marks = container.querySelectorAll('mark.search-match');
  marks.forEach((mark, i) => {
    matches.push({ el: mark, idx: i, type: 'preview' });
  });
}

function selectMatch(index) {
  if (matches.length === 0 || index < 0) return;

  const m = matches[index];
  if (m.type === 'source') {
    Editor.highlightRanges(matches, index);
    const view = Editor.getView();
    if (view) view.dispatch({ selection: { anchor: m.from, head: m.to }, scrollIntoView: true });
  } else {
    // Update preview current highlight
    const container = document.getElementById('preview-content');
    container.querySelectorAll('mark.search-current').forEach(el => el.className = 'search-match');
    m.el.className = 'search-current';
    m.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function navigateMatch(direction) {
  if (matches.length === 0) return;
  currentIndex = (currentIndex + direction + matches.length) % matches.length;
  selectMatch(currentIndex);
  updateCountDisplay();
}

function updateCountDisplay() {
  const el = document.getElementById('search-count');
  if (el && matches.length > 0) {
    el.textContent = `${currentIndex + 1} / ${matches.length}`;
  }
}

function clearAllHighlights() {
  Editor.clearHighlights();
  // Restore preview HTML if we modified it
  if (previewOriginalHTML) {
    const container = document.getElementById('preview-content');
    if (container) container.innerHTML = previewOriginalHTML;
    previewOriginalHTML = '';
  }
}

// ── Replace ────────────────────────────────────────────────

function replaceCurrent() {
  if (matches.length === 0 || currentIndex < 0) return;
  const view = Editor.getView();
  if (!view) return;
  const replaceText = document.getElementById('replace-input').value;
  const m = matches[currentIndex];
  view.dispatch({ changes: { from: m.from, to: m.to, insert: replaceText } });
  setTimeout(() => performSearch(), 50);
}

function replaceAll() {
  if (matches.length === 0) return;
  const view = Editor.getView();
  if (!view) return;
  const replaceText = document.getElementById('replace-input').value;
  const changes = [...matches].reverse().map(m => ({ from: m.from, to: m.to, insert: replaceText }));
  view.dispatch({ changes });
  matches = []; currentIndex = -1;
  document.getElementById('search-count').textContent = '';
  clearAllHighlights();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isSearchVisible() { return searchVisible; }
