/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Search & Replace Module
   ═══════════════════════════════════════════════════════ */

import * as Editor from './editor.js';
import { SearchCursor } from '@codemirror/search';

let matches = [];
let currentIndex = -1;
let searchVisible = false;
let replaceVisible = false;

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

  // Drag to move
  if (dragHandle && searchBar) {
    let dragStartX, dragStartY, barStartX, barStartY;

    dragHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = searchBar.getBoundingClientRect();
      barStartX = rect.left;
      barStartY = rect.top;
      searchBar.classList.add('dragging');
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!searchBar.classList.contains('dragging')) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      searchBar.style.left = (barStartX + dx) + 'px';
      searchBar.style.top = (barStartY + dy) + 'px';
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
    if (e.key === 'Escape' && searchVisible) {
      closeSearch();
      Editor.focus();
    }
  });
}

export function openSearch(presetQuery) {
  const bar = document.getElementById('search-bar');
  const input = document.getElementById('search-input');
  bar.classList.remove('hidden');
  searchVisible = true;
  if (presetQuery) {
    input.value = presetQuery;
    performSearch();
  }
  input.focus();
  input.select();
}

export function openReplace(presetQuery) {
  openSearch(presetQuery);
  if (!replaceVisible) toggleReplace();
}

export function closeSearch() {
  document.getElementById('search-bar').classList.add('hidden');
  searchVisible = false;
  matches = [];
  currentIndex = -1;
  Editor.clearHighlights();
}

function toggleReplace() {
  const row = document.getElementById('replace-row');
  const btn = document.getElementById('search-toggle-replace');
  replaceVisible = !replaceVisible;
  row.classList.toggle('hidden', !replaceVisible);
  btn.classList.toggle('expanded', replaceVisible);
  if (replaceVisible) document.getElementById('replace-input').focus();
}

function performSearch() {
  const query = document.getElementById('search-input').value;
  const countEl = document.getElementById('search-count');
  if (!query) {
    matches = [];
    currentIndex = -1;
    Editor.clearHighlights();
    countEl.textContent = '';
    return;
  }

  const view = Editor.getView();
  if (!view) return;

  matches = [];
  const cursor = new SearchCursor(view.state.doc, query);
  while (!cursor.next().done) {
    matches.push({ from: cursor.value.from, to: cursor.value.to });
  }

  currentIndex = matches.length > 0 ? 0 : -1;

  if (matches.length > 0) {
    countEl.textContent = `${currentIndex + 1} / ${matches.length}`;
    countEl.className = 'search-count';
  } else {
    countEl.textContent = '无结果';
    countEl.className = 'search-count no-results';
  }

  Editor.highlightRanges(matches, currentIndex);
  if (currentIndex >= 0) selectMatch(currentIndex);
}

function navigateMatch(direction) {
  if (matches.length === 0) return;
  currentIndex = (currentIndex + direction + matches.length) % matches.length;
  selectMatch(currentIndex);
  Editor.highlightRanges(matches, currentIndex);
  updateCountDisplay();
}

function selectMatch(index) {
  const view = Editor.getView();
  if (!view) return;
  const m = matches[index];
  view.dispatch({
    selection: { anchor: m.from, head: m.to },
    scrollIntoView: true,
  });
}

function updateCountDisplay() {
  const el = document.getElementById('search-count');
  if (el && matches.length > 0) {
    el.textContent = `${currentIndex + 1} / ${matches.length}`;
  }
}

function replaceCurrent() {
  if (matches.length === 0 || currentIndex < 0) return;
  const view = Editor.getView();
  const replaceText = document.getElementById('replace-input').value;
  const m = matches[currentIndex];
  view.dispatch({ changes: { from: m.from, to: m.to, insert: replaceText } });
  setTimeout(() => performSearch(), 50);
}

function replaceAll() {
  if (matches.length === 0) return;
  const view = Editor.getView();
  const replaceText = document.getElementById('replace-input').value;
  const changes = [...matches].reverse().map(m => ({ from: m.from, to: m.to, insert: replaceText }));
  view.dispatch({ changes });
  matches = [];
  currentIndex = -1;
  document.getElementById('search-count').textContent = '';
  Editor.clearHighlights();
}

export function isSearchVisible() { return searchVisible; }
