/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — AI Panel Module
   ═══════════════════════════════════════════════════════ */

import * as AiClient from './aiClient.js';
import * as Editor from './editor.js';
import * as App from './app.js';

let messages = [];
let currentResponse = '';
let pendingRefs = [];
let selectedRefIndex = -1;

// ── Init ─────────────────────────────────────────────────

export function init() {
  const panel = document.getElementById('ai-panel');
  if (!panel) return;

  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send-btn');
  const stopBtn = document.getElementById('ai-stop-btn');
  const modeSelect = document.getElementById('ai-mode');
  const tokensInput = document.getElementById('ai-tokens');
  const newChatBtn = document.getElementById('ai-new-chat');

  // Send message
  sendBtn.addEventListener('click', () => sendMessage());
  stopBtn.addEventListener('click', () => stopStreaming());

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // @ autocomplete
    if (e.key === '@') {
      setTimeout(() => showAtMenu(input), 50);
    }
    if (e.key === 'Escape') {
      hideAtMenu();
      hideCtrlKPopup();
    }
  });

  input.addEventListener('input', () => {
    // Detect @ for autocomplete
    const cursorPos = input.selectionStart;
    const textBefore = input.value.substring(0, cursorPos);
    if (textBefore.endsWith('@')) {
      showAtMenu(input);
    }
  });

  // New chat button
  newChatBtn.addEventListener('click', () => startNewChat());

}

// ── Load / Save conversation ────────────────────────────

export async function loadConversation() {
  const filePath = App.getCurrentFilePath();
  const result = await window.electronAPI.loadConversation(filePath);
  if (result.success && result.data) {
    messages = result.data.messages || [];
  } else {
    messages = [];
  }
  renderMessages();
}

async function saveConversation() {
  const filePath = App.getCurrentFilePath();
  await window.electronAPI.saveConversation(filePath, messages);
}

function startNewChat() {
  messages = [];
  currentResponse = '';
  saveConversation();
  renderMessages();
}

// ── Send message ────────────────────────────────────────

async function sendMessage() {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();

  if (!text) return;

  if (AiClient.getIsStreaming()) {
    appendErrorMessage('请等待当前 AI 响应完成后再发送');
    return;
  }

  // Build user message
  const userMsg = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    role: 'user',
    content: text,
  };

  messages.push(userMsg);
  input.value = '';
  renderMessages();
  scrollToBottom();
  await saveConversation();

  // Build API messages
  const mode = document.getElementById('ai-mode').value;
  const maxTokens = parseInt(document.getElementById('ai-tokens').value) || 2048;
  const apiMessages = AiClient.buildMessages(mode, text, null, null, maxTokens);

  // Add conversation context
  const contextMessages = messages.slice(-10).map(m => ({
    role: m.role,
    content: m.content,
  }));

  // Show loading indicator
  const assistantMsg = {
    id: (Date.now() + 1).toString(),
    timestamp: new Date().toISOString(),
    role: 'assistant',
    content: '...',
    streaming: true,
  };
  messages.push(assistantMsg);
  renderMessages();
  scrollToBottom();
  setStreamingState(true);

  try {
    const content = await AiClient.sendMessage([
      apiMessages[0],
      ...contextMessages.slice(0, -1),
      apiMessages[1],
    ], { maxTokens });

    assistantMsg.content = content;
    assistantMsg.streaming = false;
    saveConversation();
    renderMessages();
    scrollToBottom();
  } catch (err) {
    messages = messages.filter(m => m.id !== assistantMsg.id);
    renderMessages();
    appendErrorMessage(err.message || 'AI 请求失败');
  }

  currentResponse = '';
  setStreamingState(false);
}

function stopStreaming() {
  window.electronAPI.removeAiListeners();
  if (currentResponse) {
    finalizeAssistantMessage(currentResponse);
  } else {
    // Remove empty assistant placeholder
    messages = messages.filter(m => !m.streaming);
  }
  currentResponse = '';
  setStreamingState(false);
}

// ── Message rendering ──────────────────────────────────

function renderMessages() {
  const container = document.getElementById('ai-messages');
  if (!container) return;

  container.innerHTML = messages.map((m, i) => {
    const roleLabel = m.role === 'user' ? '你' : 'AI';
    const refsHtml = m.references && m.references.length > 0
      ? `<div class="msg-refs">📎 ${m.references.map(r => r.lines ? r.name + ' ' + r.lines : r.name).join(', ')}</div>`
      : '';
    const contentHtml = escapeHtml(m.content);
    const actionsHtml = m.role === 'assistant' && !m.streaming
      ? `<div class="msg-actions">
          <button class="msg-action-btn" data-action="copy" data-idx="${i}">复制</button>
          <button class="msg-action-btn" data-action="replace" data-idx="${i}">替换选中</button>
          <button class="msg-action-btn" data-action="insert" data-idx="${i}">插入后方</button>
          <button class="msg-action-btn delete" data-action="delete" data-idx="${i}">删除</button>
        </div>`
      : '';
    const streamingClass = m.streaming ? 'ai-streaming' : '';

    return `<div class="ai-message ${m.role} ${streamingClass}" data-idx="${i}">
      <div class="msg-header"><span class="msg-role">${roleLabel}</span><span>${formatTime(m.timestamp)}</span></div>
      ${refsHtml}
      <div class="msg-content">${contentHtml}</div>
      ${actionsHtml}
    </div>`;
  }).join('');

  // Wire up action buttons
  container.querySelectorAll('.msg-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const action = btn.dataset.action;
      handleMessageAction(action, idx);
    });
  });

}

function updateLastAssistantMessage(content, streaming) {
  const container = document.getElementById('ai-messages');
  if (!container) return;
  const msgs = container.querySelectorAll('.ai-message.assistant');
  const last = msgs[msgs.length - 1];
  if (last) {
    const contentEl = last.querySelector('.msg-content');
    if (contentEl) {
      contentEl.textContent = content;
      if (streaming) last.classList.add('ai-streaming');
      else last.classList.remove('ai-streaming');
    }
  }
}

function finalizeAssistantMessage(content) {
  const lastMsg = messages.filter(m => m.role === 'assistant').pop();
  if (lastMsg) {
    lastMsg.content = content;
    lastMsg.streaming = false;
  }
  saveConversation();
  renderMessages();
  scrollToBottom();
}

function appendErrorMessage(error) {
  messages.push({
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    role: 'assistant',
    content: `[错误] ${error}`,
  });
  saveConversation();
  renderMessages();
  scrollToBottom();
}

// ── Message actions ────────────────────────────────────

function handleMessageAction(action, idx) {
  const msg = messages[idx];
  if (!msg || msg.role !== 'assistant') return;

  switch (action) {
    case 'copy':
      navigator.clipboard.writeText(msg.content);
      break;
    case 'replace':
      Editor.replaceSelection(msg.content);
      break;
    case 'insert':
      Editor.insertAfterSelection(msg.content);
      break;
    case 'delete':
      messages.splice(idx, 1);
      saveConversation();
      renderMessages();
      break;
  }
}

// Wrap global action handlers for keyboard shortcuts
export function copyLastResponse() {
  const last = [...messages].reverse().find(m => m.role === 'assistant');
  if (last) navigator.clipboard.writeText(last.content);
}

export function replaceWithLastResponse() {
  const last = [...messages].reverse().find(m => m.role === 'assistant');
  if (last) Editor.replaceSelection(last.content);
}

export function insertLastResponse() {
  const last = [...messages].reverse().find(m => m.role === 'assistant');
  if (last) Editor.insertAfterSelection(last.content);
}

// ── Ctrl+L: Quote to AI ────────────────────────────────

export function quoteToAI() {
  const sel = Editor.getSelection();
  const filePath = App.getCurrentFilePath();
  const fileName = filePath ? filePath.split(/[/\\]/).pop() : '未命名.md';
  const input = document.getElementById('ai-input');

  console.log('[quoteToAI] called', { hasSel: !!sel, hasText: sel?.text?.length > 0, fileName, inputExists: !!input });

  if (!input) {
    alert('quoteToAI: 找不到 AI 输入框元素');
    return;
  }

  // Ensure right sidebar is visible
  const sidebar = document.getElementById('right-sidebar');
  if (sidebar && sidebar.classList.contains('hidden')) {
    sidebar.classList.remove('hidden');
  }

  if (sel && sel.text && sel.text.length > 0) {
    const lines = `${sel.fromLine}-${sel.toLine}`;
    const quote = `@${fileName} ${lines} `;
    input.value = input.value ? input.value + '\n' + quote : quote;
  } else {
    const lineNum = Editor.getCursorPosition().line;
    const quote = `@${fileName} ${lineNum}-${lineNum} `;
    input.value = input.value ? input.value + '\n' + quote : quote;
    Editor.selectLine(lineNum);
  }

  // Visual feedback: briefly flash the input background
  input.style.transition = 'background-color 0.15s';
  input.style.backgroundColor = 'rgba(86,156,214,0.2)';
  setTimeout(() => { input.style.backgroundColor = ''; }, 400);

  input.focus();
  input.scrollIntoView({ behavior: 'smooth' });
}

// ── @ File Reference Menu ──────────────────────────────

let atMenuEl = null;

function getAtMenuEl() {
  if (!atMenuEl) {
    atMenuEl = document.createElement('div');
    atMenuEl.className = 'at-menu';
    atMenuEl.id = 'at-menu';
    document.body.appendChild(atMenuEl);
  }
  return atMenuEl;
}

async function showAtMenu(input) {
  const menu = getAtMenuEl();
  const coords = getCaretCoordinates(input);
  const inputRect = input.getBoundingClientRect();

  menu.style.left = (inputRect.left + coords.left) + 'px';
  menu.style.top = (inputRect.bottom - 200) + 'px';
  menu.style.minWidth = Math.max(220, inputRect.width) + 'px';

  // Get files from current directory
  const dirPath = getCurrentDir();
  let entries = [];
  if (dirPath) {
    const result = await window.electronAPI.listFiles(dirPath);
    if (result.success) {
      entries = result.entries.filter(e => e.type === 'file').slice(0, 20);
    }
  }

  menu.innerHTML = entries.map((e, i) =>
    `<div class="at-menu-item" data-idx="${i}" data-path="${escapeAttr(e.path)}" data-name="${escapeAttr(e.name)}">
      <span class="at-file-icon">📄</span>
      <span class="at-file-name">${escapeHtml(e.name)}</span>
    </div>`
  ).join('') +
  `<div class="at-menu-footer" id="at-browse-folder">📁 浏览其他文件夹...</div>`;

  menu.classList.add('visible');
  selectedRefIndex = -1;

  // Wire up clicks
  menu.querySelectorAll('.at-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      insertAtRef(item.dataset.path, item.dataset.name);
    });
  });

  document.getElementById('at-browse-folder').addEventListener('click', async () => {
    const result = await window.electronAPI.openFolderDialog();
    if (result.success) {
      const listResult = await window.electronAPI.listFiles(result.folderPath);
      if (listResult.success) {
        menu.querySelectorAll('.at-menu-item').forEach(el => el.remove());
        listResult.entries.filter(e => e.type === 'file').slice(0, 20).forEach((e, i) => {
          const item = document.createElement('div');
          item.className = 'at-menu-item';
          item.innerHTML = `<span class="at-file-icon">📄</span><span class="at-file-name">${escapeHtml(e.name)}</span>`;
          item.addEventListener('click', () => insertAtRef(e.path, e.name));
          menu.insertBefore(item, document.getElementById('at-browse-folder'));
        });
      }
    }
  });

  // Keyboard navigation
  input.addEventListener('keydown', handleAtKeyNav, { once: false });
}

function handleAtKeyNav(e) {
  const menu = getAtMenuEl();
  if (!menu.classList.contains('visible')) return;
  const items = menu.querySelectorAll('.at-menu-item');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedRefIndex = Math.min(selectedRefIndex + 1, items.length - 1);
    items.forEach((el, i) => el.classList.toggle('selected', i === selectedRefIndex));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedRefIndex = Math.max(selectedRefIndex - 1, 0);
    items.forEach((el, i) => el.classList.toggle('selected', i === selectedRefIndex));
  } else if (e.key === 'Enter' && selectedRefIndex >= 0) {
    e.preventDefault();
    const item = items[selectedRefIndex];
    if (item) insertAtRef(item.dataset.path, item.dataset.name);
  } else if (e.key === 'Escape') {
    hideAtMenu();
  }
}

function insertAtRef(path, name) {
  const input = document.getElementById('ai-input');
  if (!input) return;
  const cursorPos = input.selectionStart;
  const textBefore = input.value.substring(0, cursorPos);
  const textAfter = input.value.substring(cursorPos);
  const atPos = textBefore.lastIndexOf('@');
  input.value = textBefore.substring(0, atPos) + '@' + name + ' ' + textAfter;
  hideAtMenu();
  input.focus();
}

function hideAtMenu() {
  const menu = getAtMenuEl();
  menu.classList.remove('visible');
  selectedRefIndex = -1;
}

// ── Streaming state ────────────────────────────────────

function setStreamingState(streaming) {
  const sendBtn = document.getElementById('ai-send-btn');
  const stopBtn = document.getElementById('ai-stop-btn');
  if (sendBtn) sendBtn.classList.toggle('hidden', streaming);
  if (stopBtn) stopBtn.classList.toggle('visible', streaming);
}

// ── Helpers ────────────────────────────────────────────

function parseAtReferences(text) {
  const refs = [];
  const atRegex = /@([^\s]+?)(?:\s+(\d+)(?:-(\d+))?)?/g;
  let match;
  while ((match = atRegex.exec(text)) !== null) {
    const name = match[1];
    const startLine = match[2] ? parseInt(match[2], 10) : null;
    const endLine = match[3] ? parseInt(match[3], 10) : startLine;
    const dirPath = getCurrentDir();
    const fullPath = dirPath ? dirPath.replace(/[/\\]+$/, '') + '/' + name : name;
    refs.push({
      name,
      path: fullPath,
      lines: startLine ? `${startLine}-${endLine}` : null,
    });
  }
  return refs;
}

function getCurrentDir() {
  const fp = App.getCurrentFilePath();
  if (fp) return fp.replace(/[/\\][^/\\]+$/, '');
  return null;
}

function getCaretCoordinates(input) {
  // Simple estimation based on character position
  const textBefore = input.value.substring(0, input.selectionStart);
  const lines = textBefore.split('\n');
  const lastLine = lines[lines.length - 1];
  return {
    left: lastLine.length * 8 + 8,
    top: (lines.length - 1) * 20 + 8,
  };
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function scrollToBottom() {
  const container = document.getElementById('ai-messages');
  if (container) {
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
  }
}

export { hideAtMenu as hideAtMenu };
