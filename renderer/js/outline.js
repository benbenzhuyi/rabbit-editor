/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Outline Navigator Module
   ═══════════════════════════════════════════════════════ */

import * as Editor from './editor.js';

let currentActiveLine = -1;
let selectedLine = -1;       // clicked by user in outline
let selectedTimeout = null;  // auto-clear after a few seconds
const SELECTED_DURATION = 5000; // 5s

// ── Init ─────────────────────────────────────────────────

export function init() {
  Editor.onUpdate(() => rebuildOutline());
  Editor.onCursorActivity(() => updateActiveHeading());
}

// ── Parse headings from editor content ──────────────────

function parseHeadings() {
  const text = Editor.getContent();
  const lines = text.split('\n');
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1,
        children: [],
      });
    }
  }
  return headings;
}

// ── Build tree from flat heading list ───────────────────

function buildTree(headings) {
  const root = [];
  const stack = [];
  for (const h of headings) {
    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }
    const node = { ...h, children: [] };
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }
  return root;
}

// ── Render heading tree ─────────────────────────────────

function rebuildOutline() {
  const container = document.getElementById('outline-tree');
  if (!container) return;

  const headings = parseHeadings();
  const tree = buildTree(headings);

  container.innerHTML = '';

  if (tree.length === 0) {
    container.innerHTML = '<div class="tree-empty-hint">暂无标题</div>';
    return;
  }

  for (const node of tree) {
    renderHeadingNode(container, node, 0);
  }
}

function renderHeadingNode(parent, node, depth) {
  const container = document.createElement('div');

  const row = document.createElement('div');
  row.className = 'tree-node heading heading-level-' + node.level;
  row.style.paddingLeft = (depth * 14) + 'px';
  row.dataset.line = node.line;
  row.dataset.level = node.level;

  // Arrow (only if has children)
  const arrow = document.createElement('span');
  if (node.children.length > 0) {
    arrow.className = 'tree-arrow expanded';
    arrow.textContent = '▶';
  } else {
    arrow.className = 'tree-arrow-spacer';
  }

  // Icon based on heading level
  const icon = document.createElement('span');
  icon.className = 'tree-icon';
  icon.textContent = 'H' + node.level;

  // Name
  const name = document.createElement('span');
  name.className = 'tree-name';
  name.textContent = node.text;

  row.appendChild(arrow);
  row.appendChild(icon);
  row.appendChild(name);
  container.appendChild(row);

  // Children
  const children = document.createElement('div');
  children.className = 'tree-children';
  for (const child of node.children) {
    renderHeadingNode(children, child, depth + 1);
  }
  container.appendChild(children);

  // Arrow click: toggle expand/collapse
  arrow.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.shiftKey) {
      // Shift+click: expand all children recursively
      expandAllDescendants(children);
    } else {
      children.classList.toggle('collapsed');
      arrow.classList.toggle('expanded');
    }
  });

  // Click row: jump to heading
  row.addEventListener('click', (e) => {
    if (e.target === arrow) return;
    jumpToLine(node.line);
  });

  parent.appendChild(container);
}

function expandAllDescendants(childrenEl) {
  childrenEl.classList.remove('collapsed');
  const subArrows = childrenEl.querySelectorAll(':scope .tree-arrow');
  subArrows.forEach(a => a.classList.add('expanded'));
  const subChildren = childrenEl.querySelectorAll(':scope .tree-children');
  subChildren.forEach(c => c.classList.remove('collapsed'));
}

// ── Jump to line ────────────────────────────────────────

function jumpToLine(lineNumber) {
  selectedLine = lineNumber;

  // Clear clicking highlight after a delay
  if (selectedTimeout) clearTimeout(selectedTimeout);
  selectedTimeout = setTimeout(() => { selectedLine = -1; updateOutlineHighlights(); }, SELECTED_DURATION);

  updateOutlineHighlights();

  if (Editor.isPreviewMode()) {
    // Scroll preview to the heading
    const previewContent = document.getElementById('preview-content');
    if (previewContent) {
      // Headings in preview are rendered as <h1>..<h6>, find by text match
      const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
      for (const h of headings) {
        // Match by line — nth heading in preview corresponds to nth heading in source
        // Simple approach: use line number to index
        const allPreHeadings = [...previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6')];
        const parsed = parseHeadings();
        const idx = parsed.findIndex(h => h.line === lineNumber);
        if (idx >= 0 && idx < allPreHeadings.length) {
          allPreHeadings[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    }
  } else {
    // Source mode: scroll editor to line without stealing focus
    const view = Editor.getView();
    if (view) {
      const line = view.state.doc.line(lineNumber);
      view.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      });
      // DO NOT call view.focus() — keep focus in outline
    }
  }
}

// ── Update active heading highlight ─────────────────────

function updateActiveHeading() {
  const pos = Editor.getCursorPosition();
  const headings = parseHeadings();

  let activeHeading = null;
  for (const h of headings) {
    if (h.line <= pos.line) { activeHeading = h; } else break;
  }
  currentActiveLine = activeHeading ? activeHeading.line : -1;
  updateOutlineHighlights();
}

function updateOutlineHighlights() {
  // Remove all highlights
  document.querySelectorAll('#outline-tree .tree-node.active').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('#outline-tree .tree-node.selected').forEach(n => n.classList.remove('selected'));

  // Show cursor-tracked heading (active)
  if (currentActiveLine > 0) {
    const activeRow = document.querySelector(`#outline-tree .tree-node[data-line="${currentActiveLine}"]`);
    if (activeRow && currentActiveLine !== selectedLine) {
      activeRow.classList.add('active');
    }
  }

  // Show clicked heading (selected) — takes priority
  if (selectedLine > 0) {
    const selectedRow = document.querySelector(`#outline-tree .tree-node[data-line="${selectedLine}"]`);
    if (selectedRow) {
      selectedRow.classList.add('selected');
      selectedRow.scrollIntoView({ block: 'nearest' });
    }
  }
}

// ── Collapse to level ───────────────────────────────────

export function collapseToLevel(level) {
  const allChildren = document.querySelectorAll('#outline-tree .tree-children');
  const allArrows = document.querySelectorAll('#outline-tree .tree-arrow');

  // Expand everything first
  allChildren.forEach(c => c.classList.remove('collapsed'));
  allArrows.forEach(a => a.classList.add('expanded'));

  // Then collapse nodes at or below target level
  const rows = document.querySelectorAll('#outline-tree .tree-node.heading');
  rows.forEach(row => {
    const rowLevel = parseInt(row.dataset.level, 10);
    if (rowLevel >= level) {
      const children = row.parentElement.querySelector('.tree-children');
      if (children) children.classList.add('collapsed');
      const arrow = row.querySelector('.tree-arrow');
      if (arrow) arrow.classList.remove('expanded');
    }
  });
}

export function expandAll() {
  const allChildren = document.querySelectorAll('#outline-tree .tree-children');
  const allArrows = document.querySelectorAll('#outline-tree .tree-arrow');
  allChildren.forEach(c => c.classList.remove('collapsed'));
  allArrows.forEach(a => a.classList.add('expanded'));
}
