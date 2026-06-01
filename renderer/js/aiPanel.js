/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — AI Panel Module
   ═══════════════════════════════════════════════════════ */

import * as AiClient from './aiClient.js';
import * as Editor from './editor.js';
import * as App from './app.js';

let messages = [];
let currentResponse = '';
let editingMsgId = null;   // id of message being edited

// ── Init ─────────────────────────────────────────────────

// ── Model presets ──────────────────────────────────────

const MODEL_PRESETS = [
  'deepseek-chat',
  'deepseek-reasoner',
  'gpt-4o',
  'gpt-4o-mini',
  'claude-sonnet-4-20250514',
  'local-model',
];

export function init() {
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send-btn');
  const newChatBtn = document.getElementById('ai-new-chat');
  const modelSelect = document.getElementById('ai-model-select');

  // Populate model selector
  const config = AiClient.getConfig();
  const currentModel = config.model || 'local-model';
  const models = new Set([currentModel, ...MODEL_PRESETS]);
  modelSelect.innerHTML = [...models].map(m =>
    `<option value="${m}" ${m === currentModel ? 'selected' : ''}>${m}</option>`
  ).join('');

  sendBtn.addEventListener('click', () => sendMessage());
  newChatBtn.addEventListener('click', () => startNewChat());

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') { input.blur(); }
  });
}

// ── Load / Save conversation ────────────────────────────

export async function loadConversation() {
  const filePath = App.getCurrentFilePath();
  const result = await window.electronAPI.loadConversation(filePath);
  messages = result.success && result.data ? (result.data.messages || []) : [];
  editingMsgId = null;
  renderMessages();
}

async function saveConversation() {
  await window.electronAPI.saveConversation(App.getCurrentFilePath(), messages);
}

function startNewChat() {
  messages = [];
  editingMsgId = null;
  saveConversation();
  renderMessages();
}

// ── Send message ────────────────────────────────────────

async function sendMessage() {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if (!text || AiClient.getIsStreaming()) return;

  input.value = '';

  // If editing or refreshing: re-submit from this point
  if (editingMsgId) {
    const idx = messages.findIndex(m => m.id === editingMsgId);
    if (idx >= 0) {
      messages = messages.slice(0, idx + 1);
      messages[idx].content = text;
      messages[idx].editing = false;
    }
    editingMsgId = null;
  } else {
    const userMsg = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      role: 'user',
      content: text,
    };
    messages.push(userMsg);
  }

  renderMessages();
  scrollToBottom();
  await saveConversation();

  // Build API messages — use content as-is (no special mode/wordCount injection)
  const apiMessages = [
    { role: 'system', content: '你是一位全能的AI写作助手。请根据用户的具体要求来完成任务。直接输出所需内容，不需要解释或说明。' },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  // Show loading
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

  try {
    const model = document.getElementById('ai-model-select')?.value || AiClient.getConfig().model;
    const content = await AiClient.sendMessage(apiMessages, { model });
    assistantMsg.content = content;
    assistantMsg.streaming = false;
    await saveConversation();
    renderMessages();
    scrollToBottom();
  } catch (err) {
    messages = messages.filter(m => m.id !== assistantMsg.id);
    renderMessages();
    appendErrorMessage(err.message || 'AI 请求失败');
  }
}

function appendErrorMessage(error) {
  messages.push({
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    role: 'assistant',
    content: '[错误] ' + error,
  });
  saveConversation();
  renderMessages();
  scrollToBottom();
}

// ── Render messages ─────────────────────────────────────

function renderMessages() {
  const container = document.getElementById('ai-messages');
  if (!container) return;

  container.innerHTML = messages.map((m, i) => {
    const roleLabel = m.role === 'user' ? '用户' : 'AI';
    const editingClass = m.editing ? ' editing' : '';
    const streamingClass = m.streaming ? ' ai-streaming' : '';

    let contentHtml;
    if (m.editing) {
      contentHtml = `<textarea class="ai-edit-input" data-id="${m.id}" rows="3">${escapeHtml(m.content)}</textarea>`;
    } else {
      contentHtml = escapeHtml(m.content);
    }

    let actionsHtml = '';
    if (m.role === 'user' && !m.streaming) {
      actionsHtml = `
        <div class="msg-actions">
          <button class="msg-icon-btn" data-action="copy" data-idx="${i}" title="复制">📋</button>
          <button class="msg-icon-btn" data-action="edit" data-idx="${i}" title="编辑">✏️</button>
          <button class="msg-icon-btn delete" data-action="delete" data-idx="${i}" title="删除">🗑️</button>
          <button class="msg-icon-btn" id="msg-refresh-${i}" data-action="refresh" data-idx="${i}" title="重新提交">🔄</button>
        </div>`;
    } else if (m.role === 'assistant' && !m.streaming) {
      actionsHtml = `
        <div class="msg-actions">
          <button class="msg-icon-btn" data-action="copy" data-idx="${i}" title="复制">📋</button>
          <button class="msg-icon-btn" data-action="replace" data-idx="${i}" title="替换选中">📥</button>
          <button class="msg-icon-btn" data-action="insert" data-idx="${i}" title="插入后方">📌</button>
          <button class="msg-icon-btn delete" data-action="delete" data-idx="${i}" title="删除">🗑️</button>
        </div>`;
    }

    return `<div class="ai-message ${m.role} ${streamingClass} ${editingClass}" data-idx="${i}">
      <div class="msg-header"><span class="msg-role">${roleLabel}</span><span>${formatTime(m.timestamp)}</span></div>
      <div class="msg-content">${contentHtml}</div>
      ${actionsHtml}
    </div>`;
  }).join('');

  // Wire up action buttons
  container.querySelectorAll('.msg-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const action = btn.dataset.action;
      handleMessageAction(action, idx);
    });
  });

  // Wire up edit textareas
  container.querySelectorAll('.ai-edit-input').forEach(textarea => {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const id = textarea.dataset.id;
        const msg = messages.find(m => m.id === id);
        if (msg) {
          // Set the main input with edited content so sendMessage() picks it up
          document.getElementById('ai-input').value = textarea.value.trim();
          msg.content = textarea.value.trim();
          msg.editing = false;
          editingMsgId = id;
          renderMessages();
          sendMessage();
        }
      }
      if (e.key === 'Escape') {
        const id = textarea.dataset.id;
        const msg = messages.find(m => m.id === id);
        if (msg) {
          msg.editing = false;
          editingMsgId = null;
          renderMessages();
        }
      }
    });
    textarea.focus();
  });
}

// ── Message actions ────────────────────────────────────

function handleMessageAction(action, idx) {
  const msg = messages[idx];
  if (!msg) return;

  switch (action) {
    case 'copy':
      navigator.clipboard.writeText(msg.content);
      break;
    case 'edit':
      // Enter edit mode
      msg.editing = true;
      editingMsgId = msg.id;
      renderMessages();
      break;
    case 'delete':
      messages.splice(idx, 1);
      if (editingMsgId === msg.id) editingMsgId = null;
      saveConversation();
      renderMessages();
      break;
    case 'refresh':
      // Re-submit from this user message, discard all later messages
      if (msg.role !== 'user') break;
      messages = messages.slice(0, idx + 1);
      editingMsgId = msg.id;
      msg.editing = false;
      // Put message content in input so sendMessage() picks it up
      document.getElementById('ai-input').value = msg.content;
      saveConversation();
      renderMessages();
      sendMessage();
      break;
    case 'replace':
      if (msg.role !== 'assistant') break;
      Editor.replaceSelection(msg.content);
      break;
    case 'insert':
      if (msg.role !== 'assistant') break;
      Editor.insertAfterSelection(msg.content);
      break;
  }
}

// ── Ctrl+L: Quote to AI ────────────────────────────────

export function quoteToAI() {
  const sel = Editor.getSelection();
  const filePath = App.getCurrentFilePath();
  const fileName = filePath ? filePath.split(/[/\\]/).pop() : '未命名.md';
  const input = document.getElementById('ai-input');
  if (!input) return;

  const sidebar = document.getElementById('right-sidebar');
  if (sidebar?.classList.contains('hidden')) sidebar.classList.remove('hidden');

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

  input.style.transition = 'background-color 0.15s';
  input.style.backgroundColor = 'rgba(86,156,214,0.2)';
  setTimeout(() => { input.style.backgroundColor = ''; }, 400);
  input.focus();
  input.scrollIntoView({ behavior: 'smooth' });
}

// ── Global action handlers ──────────────────────────────

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

// ── Helpers ────────────────────────────────────────────

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

function scrollToBottom() {
  const container = document.getElementById('ai-messages');
  if (container) setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}
