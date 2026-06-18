/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit Web — IndexedDB Storage
   ═══════════════════════════════════════════════════════ */

const DB_NAME = 'rabbit-storage';
const DB_VERSION = 1;
let db = null;

async function openDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('fileBindings')) {
        d.createObjectStore('fileBindings', { keyPath: 'uuid' });
      }
      if (!d.objectStoreNames.contains('conversations')) {
        d.createObjectStore('conversations', { keyPath: 'uuid' });
      }
      if (!d.objectStoreNames.contains('virtualFiles')) {
        d.createObjectStore('virtualFiles', { keyPath: 'uuid' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

/* ─── File Bindings ──────────────────────────────────── */

const convStore = 'conversations';
const bindStore = 'fileBindings';
const vfStore = 'virtualFiles';

export async function getFileUUID(fileHandle) {
  const d = await openDB();
  const all = await new Promise((res, rej) => {
    const tx = d.transaction(bindStore, 'readonly');
    const req = tx.objectStore(bindStore).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  for (const bind of all) {
    if (bind.handle && typeof bind.handle.isSameEntry === 'function') {
      try {
        if (await bind.handle.queryPermission({ mode: 'readwrite' }) === 'granted') {
          if (await bind.handle.isSameEntry(fileHandle)) return bind.uuid;
        }
      } catch (_) { /* stale handle, skip */ }
    }
  }

  // Not found — create new binding
  const uuid = crypto.randomUUID();
  await new Promise((res, rej) => {
    const tx = d.transaction(bindStore, 'readwrite');
    const req = tx.objectStore(bindStore).put({ uuid, handle: fileHandle, name: fileHandle.name });
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
  return uuid;
}

/* ─── Conversations ───────────────────────────────────── */

const MAX_MESSAGES = 100;

export async function loadConversation(uuid) {
  const d = await openDB();
  const entry = await new Promise((res, rej) => {
    const tx = d.transaction(convStore, 'readonly');
    const req = tx.objectStore(convStore).get(uuid);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return entry ? entry.messages : [];
}

export async function saveConversation(uuid, messages) {
  const d = await openDB();
  const trimmed = messages.slice(-MAX_MESSAGES);
  return new Promise((res, rej) => {
    const tx = d.transaction(convStore, 'readwrite');
    tx.objectStore(convStore).put({ uuid, messages: trimmed, updatedAt: Date.now() });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

/* ─── Virtual Files ───────────────────────────────────── */

export async function loadVirtualFileContent(uuid) {
  const d = await openDB();
  const entry = await new Promise((res, rej) => {
    const tx = d.transaction(vfStore, 'readonly');
    const req = tx.objectStore(vfStore).get(uuid);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return entry ? { name: entry.name, content: entry.content } : null;
}

export async function saveVirtualFile(uuid, name, content) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(vfStore, 'readwrite');
    tx.objectStore(vfStore).put({ uuid, name, content, updatedAt: Date.now() });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
