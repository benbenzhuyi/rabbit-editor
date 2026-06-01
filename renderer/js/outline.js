/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Outline Navigator Module
   ═══════════════════════════════════════════════════════ */

import * as Editor from './editor.js';

let currentActiveLine = -1;

// ── Init ─────────────────────────────────────────────────

export function init() {
  // Listen for editor content changes to rebuild outline
  Editor.onUpdate(() => rebuildOutline());
  // Listen for cursor changes to highlight current heading
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
  if (Editor.isPreviewMode()) {
    Editor.togglePreview();
  }
  // Use CodeMirror's dispatch to set cursor
  const content = Editor.getView();
  if (content) {
    const line = content.state.doc.line(lineNumber);
    content.dispatch({
      selection: { anchor: line.from },
      scrollIntoView: true,
    });
    content.focus();
  }
}

// ── Update active heading highlight ─────────────────────

function updateActiveHeading() {
  const pos = Editor.getCursorPosition();
  const headings = parseHeadings();

  // Find the heading whose line is closest to cursor (before or at cursor)
  let activeHeading = null;
  for (const h of headings) {
    if (h.line <= pos.line) {
      activeHeading = h;
    } else {
      break;
    }
  }

  // Remove previous highlights
  document.querySelectorAll('#outline-tree .tree-node.active').forEach(n => n.classList.remove('active'));

  if (activeHeading) {
    const row = document.querySelector(`#outline-tree .tree-node[data-line="${activeHeading.line}"]`);
    if (row) {
      row.classList.add('active');
      row.scrollIntoView({ block: 'nearest' });
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
