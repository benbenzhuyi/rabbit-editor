/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — File Browser Module
   ═══════════════════════════════════════════════════════ */

import * as App from './app.js';
import * as Editor from './editor.js';

let rootDir = null;
let selectedPath = null;  // persistent selected file
let contextMenu = null;
let contextTarget = null;
let contextParentDir = null;

// ── Init ─────────────────────────────────────────────────

export function init() {
  const collapseBtn = document.getElementById('btn-collapse-all');
  const refreshBtn = document.getElementById('btn-refresh-tree');

  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    collapseAll();
  });

  refreshBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (rootDir) refresh(rootDir);
  });

  contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  contextMenu.id = 'file-context-menu';
  document.body.appendChild(contextMenu);
  document.addEventListener('click', () => hideContextMenu());

  loadDefaultRoot();
}

async function loadDefaultRoot() {
  const paths = await window.electronAPI.getPaths();
  rootDir = paths.documents;
  if (rootDir) refresh(rootDir);
}

function getParentPath(dirPath) {
  const sep = dirPath.includes('\\') ? '\\' : '/';
  const parts = dirPath.split(sep).filter(Boolean);
  if (parts.length <= 1) return null;
  parts.pop();
  const parent = parts.join(sep);
  return dirPath.startsWith(sep) ? sep + parent : parent;
}

// ── Tree Rendering ──────────────────────────────────────

export async function refresh(dirPath) {
  rootDir = dirPath;
  const tree = document.getElementById('file-tree');
  tree.innerHTML = '';

  // Show current path in header
  const header = document.getElementById('file-browser-header');
  const existingPath = header.querySelector('.sidebar-path');
  if (existingPath) existingPath.remove();
  const pathEl = document.createElement('span');
  pathEl.className = 'sidebar-path';
  pathEl.textContent = shortenPath(dirPath);
  pathEl.title = dirPath;
  const titleEl = header.querySelector('.sidebar-title');
  titleEl.after(pathEl);

  // Parent directory navigation
  const parentPath = getParentPath(dirPath);
  if (parentPath) {
    const upNode = document.createElement('div');
    upNode.className = 'tree-node parent-dir';
    upNode.innerHTML = '<span class="tree-icon">📂</span><span class="tree-name">..</span>';
    upNode.addEventListener('click', () => setRootDir(parentPath));
    tree.appendChild(upNode);
  }

  const result = await window.electronAPI.listFiles(dirPath);
  if (!result.success) {
    tree.innerHTML += `<div class="tree-empty-hint">无法读取目录</div>`;
    return;
  }

  for (const entry of result.entries) {
    if (entry.type === 'directory') {
      renderDirectoryNode(tree, entry, 0, true);
    }
  }
  for (const entry of result.entries) {
    if (entry.type === 'file') {
      renderFileNode(tree, entry, 0);
    }
  }

  // Re-apply selected highlight after DOM rebuild
  applySelectedHighlight();
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    md: '📝', txt: '📄', html: '🌐', htm: '🌐', json: '📋',
    js: '📜', css: '🎨', xml: '📰', yaml: '📋', yml: '📋',
    csv: '📊', log: '📄', py: '🐍', sh: '💻',
  };
  return map[ext] || '📄';
}

function shortenPath(dirPath) {
  const parts = dirPath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length <= 3) return dirPath;
  return '.../' + parts.slice(-2).join('/');
}

function renderDirectoryNode(parent, entry, depth, collapsed) {
  const container = document.createElement('div');

  const node = document.createElement('div');
  node.className = 'tree-node directory';
  node.style.paddingLeft = (depth * 16) + 'px';
  node.dataset.path = entry.path;
  node.dataset.type = 'directory';
  node.dataset.depth = depth;

  const arrow = document.createElement('span');
  arrow.className = 'tree-arrow' + (collapsed ? '' : ' expanded');
  arrow.textContent = '▶';

  const icon = document.createElement('span');
  icon.className = 'tree-icon';
  icon.textContent = collapsed ? '📁' : '📂';

  const name = document.createElement('span');
  name.className = 'tree-name';
  name.textContent = entry.name;

  node.appendChild(arrow);
  node.appendChild(icon);
  node.appendChild(name);

  const children = document.createElement('div');
  children.className = 'tree-children' + (collapsed ? ' collapsed' : '');

  container.appendChild(node);
  container.appendChild(children);
  parent.appendChild(container);

  // Arrow click: toggle expand/collapse
  arrow.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNode(arrow, icon, children, entry.path, depth);
  });

  // Shift+click arrow: expand all children
  arrow.addEventListener('click', (e) => {
    if (e.shiftKey) {
      e.stopPropagation();
      expandAllChildren(children, entry.path, depth);
    }
  });

  // Click node: toggle expand
  node.addEventListener('click', async (e) => {
    if (e.target === arrow) return; // handled above
    await toggleNode(arrow, icon, children, entry.path, depth);
  });

  // Right-click context menu
  node.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, entry.path, 'directory', entry.path);
  });

  // Lazy load children on first expand
  if (!collapsed) {
    loadChildren(children, entry.path, depth + 1);
  }
}

function renderFileNode(parent, entry, depth) {
  const node = document.createElement('div');
  node.className = 'tree-node file';
  node.style.paddingLeft = (depth * 16 + 16) + 'px';
  node.dataset.path = entry.path;
  node.dataset.type = 'file';
  node.dataset.depth = depth;

  const icon = document.createElement('span');
  icon.className = 'tree-icon';
  icon.textContent = fileIcon(entry.name);

  const name = document.createElement('span');
  name.className = 'tree-name';
  name.textContent = entry.name;

  node.appendChild(icon);
  node.appendChild(name);
  parent.appendChild(node);

  // Click to open file
  node.addEventListener('click', async () => {
    await App.openFileByPath(entry.path);
    highlightFile(entry.path);
  });

  // Right-click context menu
  node.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, entry.path, 'file', entry.path);
  });
}

// ── Node Operations ─────────────────────────────────────

async function toggleNode(arrow, icon, children, dirPath, depth) {
  const isCollapsed = children.classList.contains('collapsed');
  if (isCollapsed) {
    children.classList.remove('collapsed');
    arrow.classList.add('expanded');
    icon.textContent = '📂';
    // Load children if not loaded yet
    if (children.children.length === 0) {
      await loadChildren(children, dirPath, depth + 1);
    }
  } else {
    children.classList.add('collapsed');
    arrow.classList.remove('expanded');
    icon.textContent = '📁';
  }
}

async function expandAllChildren(children, dirPath, depth) {
  children.classList.remove('collapsed');
  if (children.children.length === 0) {
    await loadChildren(children, dirPath, depth + 1);
  }
  // Recursively expand all sub-folders
  const subArrows = children.querySelectorAll(':scope > .tree-node.directory > .tree-arrow');
  const subChildren = children.querySelectorAll(':scope > .tree-children');
  subArrows.forEach(a => a.classList.add('expanded'));
  subChildren.forEach(c => c.classList.remove('collapsed'));
  // Load sub-children
  for (const childNode of children.querySelectorAll(':scope > .tree-node.directory')) {
    const childPath = childNode.dataset.path;
    const childContainer = childNode.nextElementSibling;
    if (childContainer && childContainer.classList.contains('tree-children') && childContainer.children.length === 0) {
      await loadChildren(childContainer, childPath, depth + 1);
    }
  }
}

function collapseAll() {
  const allArrows = document.querySelectorAll('#file-tree .tree-arrow');
  const allChildren = document.querySelectorAll('#file-tree .tree-children');
  const allIcons = document.querySelectorAll('#file-tree .tree-node.directory > .tree-icon');
  allArrows.forEach(a => a.classList.remove('expanded'));
  allChildren.forEach(c => c.classList.add('collapsed'));
  allIcons.forEach(i => i.textContent = '📁');
}

async function loadChildren(container, dirPath, depth) {
  const result = await window.electronAPI.listFiles(dirPath);
  if (!result.success) return;

  const existing = container.querySelectorAll(':scope > .tree-node');
  existing.forEach(n => n.remove());
  const existingChildren = container.querySelectorAll(':scope > .tree-children');
  existingChildren.forEach(c => c.remove());

  // Directories first
  for (const entry of result.entries) {
    if (entry.type === 'directory') {
      renderDirectoryNode(container, entry, depth, true);
    }
  }
  for (const entry of result.entries) {
    if (entry.type === 'file') {
      renderFileNode(container, entry, depth);
    }
  }
}

// ── Context Menu ────────────────────────────────────────

function showContextMenu(x, y, path, type, parentDir) {
  contextTarget = { path, type };
  contextParentDir = parentDir;
  contextMenu.innerHTML = '';

  if (type === 'directory') {
    addContextItem('📝', '新建文件', async () => {
      const result = await window.electronAPI.newFile(path);
      if (result.success) {
        await refresh(rootDir);
      }
    });
    addContextItem('📁', '新建文件夹', async () => {
      const result = await window.electronAPI.createDir(path);
      if (result.success) {
        await refresh(rootDir);
      }
    });
    addSeparator();
    addContextItem('✏️', '重命名', () => startRename(path, type));
    addContextItem('🗑️', '删除', () => deleteEntry(path));
    addSeparator();
    addContextItem('📋', '复制路径', () => {
      navigator.clipboard.writeText(path);
    });
  } else {
    addContextItem('✏️', '重命名', () => startRename(path, type));
    addContextItem('🗑️', '删除', () => deleteEntry(path));
    addSeparator();
    addContextItem('📋', '复制路径', () => {
      navigator.clipboard.writeText(path);
    });
  }

  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.classList.add('visible');
}

function addContextItem(icon, label, action) {
  const item = document.createElement('div');
  item.className = 'context-menu-item';
  item.innerHTML = `<span class="menu-icon">${icon}</span>${label}`;
  item.addEventListener('click', action);
  contextMenu.appendChild(item);
}

function addSeparator() {
  const sep = document.createElement('div');
  sep.className = 'context-menu-separator';
  contextMenu.appendChild(sep);
}

function hideContextMenu() {
  contextMenu.classList.remove('visible');
}

// ── Rename ──────────────────────────────────────────────

function startRename(oldPath, type) {
  hideContextMenu();
  const node = document.querySelector(`.tree-node[data-path="${CSS.escape(oldPath)}"]`);
  if (!node) return;

  const nameEl = node.querySelector('.tree-name');
  const oldName = nameEl.textContent;
  const input = document.createElement('input');
  input.className = 'rename-input';
  input.value = oldName;
  input.style.width = (Math.max(oldName.length * 10, 60)) + 'px';

  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const finish = async () => {
    const newName = input.value.trim();
    input.replaceWith(nameEl);
    if (newName && newName !== oldName) {
      const result = await window.electronAPI.renameEntry(oldPath, newName);
      if (!result.success) {
        alert(`重命名失败：${result.error}`);
      }
      await refresh(rootDir);
    }
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') {
      input.value = oldName;
      input.blur();
    }
  });
}

// ── Delete ──────────────────────────────────────────────

async function deleteEntry(targetPath) {
  hideContextMenu();
  const name = targetPath.split(/[/\\]/).pop();
  const type = targetPath.includes('.') ? '文件' : '文件夹';
  if (!confirm(`确定要删除${type} "${name}" 吗？\n此操作不可撤销。`)) return;
  const result = await window.electronAPI.deleteEntry(targetPath);
  if (!result.success) {
    alert(`删除失败：${result.error}`);
  }
  await refresh(rootDir);
}

// ── Highlight ───────────────────────────────────────────

export function highlightFile(filePath) {
  selectedPath = filePath;
  applySelectedHighlight();
}

function applySelectedHighlight() {
  document.querySelectorAll('#file-tree .tree-node.selected').forEach(n => n.classList.remove('selected'));
  if (selectedPath) {
    const node = document.querySelector(`#file-tree .tree-node[data-path="${CSS.escape(selectedPath)}"]`);
    if (node) {
      node.classList.add('selected');
      node.scrollIntoView({ block: 'nearest' });
    }
  }
}

// ── Public methods ──────────────────────────────────────

export function getRootDir() {
  return rootDir;
}

export function setRootDir(dirPath) {
  rootDir = dirPath;
  refresh(dirPath);
}
