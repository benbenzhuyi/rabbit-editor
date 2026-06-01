/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Ctrl+K Inline Popup Module
   ═══════════════════════════════════════════════════════ */

import * as AiClient from './aiClient.js';
import * as Editor from './editor.js';

let lastMode = '润色';
let lastWordCount = 800;
let ctrlKActive = false;

export function init() {
  const popup = document.getElementById('ctrlk-popup');
  if (!popup) return;

  const modeSelect = document.getElementById('ctrlk-mode');
  const wordsInput = document.getElementById('ctrlk-words');
  const instructionInput = document.getElementById('ctrlk-instruction');
  const confirmBtn = document.getElementById('ctrlk-confirm');
  const cancelBtn = document.getElementById('ctrlk-cancel');

  modeSelect.value = lastMode;
  wordsInput.value = lastWordCount;

  confirmBtn.addEventListener('click', () => executeCtrlK());
  cancelBtn.addEventListener('click', () => hideCtrlKPopup());

  instructionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeCtrlK();
    }
    if (e.key === 'Escape') hideCtrlKPopup();
  });

  modeSelect.addEventListener('change', () => { lastMode = modeSelect.value; });
  wordsInput.addEventListener('change', () => { lastWordCount = parseInt(wordsInput.value, 10) || 800; });

  document.addEventListener('click', (e) => {
    if (ctrlKActive && !popup.contains(e.target)) hideCtrlKPopup();
  });
}

export function showCtrlKPopup() {
  const popup = document.getElementById('ctrlk-popup');
  if (!popup) return;

  // Ensure there is a selection: if nothing selected, auto-select current line
  const sel = Editor.getSelection();
  if (!sel || !sel.text || sel.text.length === 0) {
    const pos = Editor.getCursorPosition();
    Editor.selectLine(pos.line);
  }

  document.getElementById('ctrlk-mode').value = lastMode;
  document.getElementById('ctrlk-words').value = lastWordCount;
  document.getElementById('ctrlk-instruction').value = '';

  const confirmBtn = document.getElementById('ctrlk-confirm');
  confirmBtn.disabled = false;
  confirmBtn.textContent = '确定';

  // Position near selection
  const newSel = Editor.getSelection();
  const coords = newSel?.coords || { top: 200, left: 100, bottom: 220 };
  const rect = document.getElementById('editor-area').getBoundingClientRect();
  popup.style.top = Math.min(rect.top + coords.bottom + 10, rect.bottom - 220) + 'px';
  popup.style.left = Math.max(rect.left + 20, Math.min(rect.left + coords.left, rect.right - 360)) + 'px';
  popup.classList.add('visible');
  ctrlKActive = true;
  document.getElementById('ctrlk-instruction').focus();
}

export function hideCtrlKPopup() {
  const popup = document.getElementById('ctrlk-popup');
  if (popup) popup.classList.remove('visible');
  ctrlKActive = false;
}

export function isCtrlKActive() { return ctrlKActive; }

async function executeCtrlK() {
  const mode = document.getElementById('ctrlk-mode').value;
  const wordCount = parseInt(document.getElementById('ctrlk-words').value, 10) || 800;
  const instruction = document.getElementById('ctrlk-instruction').value.trim();
  lastMode = mode;
  lastWordCount = wordCount;

  const sel = Editor.getSelection();
  if (!sel || !sel.text) { hideCtrlKPopup(); return; }

  hideCtrlKPopup();

  const systemPrompt = AiClient.SYSTEM_PROMPTS[mode] || AiClient.SYSTEM_PROMPTS['定制'];
  const userContent = mode === '续写'
    ? `请续写以下内容（约${wordCount}字）：\n\n${sel.text}`
    : `请${mode}以下内容（目标约${wordCount}字）：\n\n${sel.text}`;

  const messages = [
    { role: 'system', content: systemPrompt + (instruction ? '\n\n额外要求：' + instruction : '') },
    { role: 'user', content: userContent },
  ];

  try {
    const result = await AiClient.sendMessage(messages, { maxTokens: Math.max(wordCount * 2, 256) });
    if (result) {
      if (mode === '续写') {
        Editor.insertAfterSelection(result);
      } else {
        Editor.replaceSelection(result);
      }
    }
  } catch (err) {
    alert('AI 请求失败: ' + err.message);
  }
}
