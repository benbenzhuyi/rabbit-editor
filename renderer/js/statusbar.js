/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Status Bar Module
   ═══════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────

let currentSaveState = false; // false = unsaved, true = saved

// ── Init ─────────────────────────────────────────────────

export function init() {
  // DOM elements should already exist
  setSaveState(false);
}

// ── Update cursor position ──────────────────────────────

export function setCursor(line, column) {
  const el = document.getElementById('status-cursor');
  if (el) {
    el.textContent = `行: ${line} | 列: ${column}`;
  }
}

// ── Update word count ───────────────────────────────────

export function setWordCount(count) {
  const el = document.getElementById('status-words');
  if (el) {
    el.textContent = `字数: ${count.toLocaleString()}`;
  }
}

// ── Update save state ───────────────────────────────────

export function setSelectedWords(count) {
  const el = document.getElementById('status-sel-words');
  if (!el) return;
  if (count > 0) {
    el.textContent = `| 选中: ${count.toLocaleString()}`;
    el.classList.remove('status-sel-hidden');
  } else {
    el.classList.add('status-sel-hidden');
  }
}

export function setSaveState(isSaved) {
  currentSaveState = isSaved;
  const el = document.getElementById('status-save');
  if (!el) return;

  if (isSaved) {
    el.textContent = '已保存';
    el.className = 'saved';
  } else {
    el.textContent = '未保存 ●';
    el.className = 'unsaved';
  }
}
