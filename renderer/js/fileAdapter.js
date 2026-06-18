/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit Web — File System Adapter
   ═══════════════════════════════════════════════════════ */

import { supportsDirectory, supportsSingleFile, canSaveDirectly } from './platformInfo.js';
import { getFileUUID } from './storage.js';

let currentDirHandle = null;
let currentFileUUID = null; // for conversation binding

export function getCurrentFileUUID() { return currentFileUUID; }

/* ─── Detect File System Access capability ──────────────── */

function hasNativeFS() { return supportsDirectory() || supportsSingleFile(); }

/* ─── Open File ────────────────────────────────────────── */

export async function openFile() {
  if (hasNativeFS()) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: '文本文件', accept: { 'text/*': ['.md', '.txt', '.html', '.json', '.js', '.css', '.xml', '.yaml', '.csv', '.log'] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      const content = await file.text();
      currentFileUUID = await getFileUUID(handle);
      return { success: true, filePath: handle.name, content, handle, uuid: currentFileUUID };
    } catch (e) {
      if (e.name === 'AbortError') return { success: false, canceled: true };
      return { success: false, error: e.message };
    }
  }
  return openWithInputFallback();
}

async function openWithInputFallback() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt,.html,.json,.js,.css,.xml,.yaml,.csv,.log';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) { resolve({ success: false, canceled: true }); return; }
      const content = await file.text();
      const fakeHandle = { name: file.name, size: file.size, type: 'virtual', lastModified: file.lastModified };
      currentFileUUID = crypto.randomUUID();
      resolve({ success: true, filePath: file.name, content, handle: fakeHandle, uuid: currentFileUUID });
    };
    input.click();
  });
}

/* ─── Open Folder ──────────────────────────────────────── */

export async function openFolder() {
  if (!supportsDirectory()) {
    return { success: false, error: '你的浏览器不支持打开文件夹，请使用 Chrome 或 Edge。' };
  }

  try {
    const handle = await window.showDirectoryPicker();
    currentDirHandle = handle;
    const entries = await listDirectory(handle);
    return { success: true, folderPath: handle.name, entries };
  } catch (e) {
    if (e.name === 'AbortError') return { success: false, canceled: true };
    return { success: false, error: e.message };
  }
}

export async function restorePermission() {
  if (currentDirHandle) {
    const perm = await currentDirHandle.requestPermission({ mode: 'readwrite' });
    return perm === 'granted';
  }
  return false;
}

/* ─── List Directory ───────────────────────────────────── */

export async function listDirectory(dirHandle) {
  if (!dirHandle) dirHandle = currentDirHandle;
  if (!dirHandle) return [];

  const entries = [];
  try {
    for await (const [name, handle] of dirHandle) {
      entries.push({ name, path: name, type: handle.kind === 'directory' ? 'directory' : 'file', handle });
    }
  } catch (_) {}

  return entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

export async function readEntry(entry) {
  if (entry.handle && typeof entry.handle.getFile === 'function') {
    const file = await entry.handle.getFile();
    const content = await file.text();
    currentFileUUID = await getFileUUID(entry.handle);
    return { success: true, name: entry.handle.name, content, handle: entry.handle, uuid: currentFileUUID };
  }
  return { success: false, error: '不支持的文件类型' };
}

/* ─── Save ──────────────────────────────────────────────── */

export async function saveFile(content, handle) {
  if (handle && typeof handle.createWritable === 'function') {
    try {
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  if (canSaveDirectly()) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: handle?.name || '未命名.md' });
      const writable = await h.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true, handle: h };
    } catch (e) {
      if (e.name === 'AbortError') return { success: false, canceled: true };
      return { success: false, error: e.message };
    }
  }

  // Fallback: force download
  downloadFile(content, handle?.name || '未命名.md');
  return { success: true };
}

function downloadFile(content, name) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Create / Rename / Delete ──────────────────────────── */

export async function createFile(dirHandle, name = '未命名.md') {
  if (!dirHandle || typeof dirHandle.getFileHandle !== 'function') return { success: false, error: '不支持的操作' };
  try {
    const h = await dirHandle.getFileHandle(name, { create: true });
    const writable = await h.createWritable();
    await writable.write('');
    await writable.close();
    return { success: true, handle: h, name };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function renameEntry(oldHandle, newName, parentHandle) {
  return { success: false, error: 'Web 版暂不支持重命名（浏览器 API 限制）' };
}

export async function deleteEntry(entryHandle, parentHandle) {
  if (!parentHandle || typeof parentHandle.removeEntry !== 'function') return { success: false, error: '不支持的操作' };
  try {
    const name = entryHandle.name || entryHandle;
    await parentHandle.removeEntry(name, { recursive: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
