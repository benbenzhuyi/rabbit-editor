/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Settings Module
   ═══════════════════════════════════════════════════════ */

import * as Editor from './editor.js';
import * as AiClient from './aiClient.js';

const defaults = {
  autoSaveInterval: 60,
  fontSize: 16,
  showLineNumbers: true,
  wordWrap: true,
  aiBaseUrl: 'http://localhost:8080/v1',
  aiApiKey: '',
  aiModel: 'local-model',
  aiDefaultMode: '续写',
  ctrlKWords: 800,
  maxTokens: 2048,
  temperature: 0.7,
  theme: 'dark',
  customPrompts: {},
};

let currentSettings = { ...defaults };
let autoSaveTimer = null;

export function getSettings() { return { ...currentSettings }; }

export async function init() {
  // Load from disk
  const result = await window.electronAPI.loadSettings();
  if (result) currentSettings = { ...defaults, ...result };

  // Apply loaded settings
  applySettings();

  // Wire up settings UI
  const overlay = document.getElementById('settings-overlay');
  const closeBtn = document.getElementById('settings-close');
  const cancelBtn = document.getElementById('settings-cancel');
  const saveBtn = document.getElementById('settings-save');
  const tabs = document.querySelectorAll('.settings-tab');

  closeBtn.addEventListener('click', () => hidePanel());
  cancelBtn.addEventListener('click', () => hidePanel());
  saveBtn.addEventListener('click', () => saveAndApply());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hidePanel(); });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Prompt editor mode selector
  const promptMode = document.getElementById('set-prompt-mode');
  const promptText = document.getElementById('set-prompt-text');
  const promptReset = document.getElementById('set-prompt-reset');

  if (promptMode && promptText) {
    promptMode.addEventListener('change', () => {
      const mode = promptMode.value;
      promptText.value = currentSettings.customPrompts[mode] || AiClient.SYSTEM_PROMPTS[mode] || '';
    });
  }

  if (promptReset && promptMode && promptText) {
    promptReset.addEventListener('click', () => {
      const mode = promptMode.value;
      promptText.value = AiClient.SYSTEM_PROMPTS[mode] || '';
    });
  }

}

export function showPanel() {
  const overlay = document.getElementById('settings-overlay');
  overlay.classList.remove('hidden');
  populateForm();
}

function hidePanel() {
  document.getElementById('settings-overlay').classList.add('hidden');
}

function switchTab(tabName) {
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.toggle('hidden', c.id !== `settings-tab-${tabName}`));
}

function populateForm() {
  const s = currentSettings;
  document.getElementById('set-auto-save').value = s.autoSaveInterval;
  document.getElementById('set-font-size').value = s.fontSize;
  document.getElementById('set-line-numbers').checked = s.showLineNumbers;
  document.getElementById('set-word-wrap').checked = s.wordWrap;
  document.getElementById('set-ai-base-url').value = s.aiBaseUrl;
  document.getElementById('set-ai-api-key').value = s.aiApiKey;
  document.getElementById('set-ai-model').value = s.aiModel;
  document.getElementById('set-ai-default-mode').value = s.aiDefaultMode;
  document.getElementById('set-ctrlk-words').value = s.ctrlKWords;
  document.getElementById('set-max-tokens').value = s.maxTokens;
  document.getElementById('set-temperature').value = s.temperature;
  document.getElementById('set-theme').value = s.theme;

  // Populate prompt editor with first mode
  const promptMode = document.getElementById('set-prompt-mode');
  const promptText = document.getElementById('set-prompt-text');
  const mode = promptMode.value;
  promptText.value = s.customPrompts[mode] || AiClient.SYSTEM_PROMPTS[mode] || '';
}

async function saveAndApply() {
  currentSettings.autoSaveInterval = parseInt(document.getElementById('set-auto-save').value) || 60;
  currentSettings.fontSize = parseInt(document.getElementById('set-font-size').value) || 16;
  currentSettings.showLineNumbers = document.getElementById('set-line-numbers').checked;
  currentSettings.wordWrap = document.getElementById('set-word-wrap').checked;
  currentSettings.aiBaseUrl = document.getElementById('set-ai-base-url').value.trim() || defaults.aiBaseUrl;
  currentSettings.aiApiKey = document.getElementById('set-ai-api-key').value.trim();
  currentSettings.aiModel = document.getElementById('set-ai-model').value.trim() || defaults.aiModel;
  currentSettings.aiDefaultMode = document.getElementById('set-ai-default-mode').value;
  currentSettings.ctrlKWords = parseInt(document.getElementById('set-ctrlk-words').value) || 800;
  currentSettings.maxTokens = parseInt(document.getElementById('set-max-tokens').value) || 2048;
  currentSettings.temperature = parseFloat(document.getElementById('set-temperature').value) || 0.7;
  currentSettings.theme = document.getElementById('set-theme').value;

  // Save current prompt text for the selected mode
  const promptMode = document.getElementById('set-prompt-mode').value;
  const promptText = document.getElementById('set-prompt-text').value.trim();
  if (!currentSettings.customPrompts) currentSettings.customPrompts = {};
  if (promptText && promptText !== AiClient.SYSTEM_PROMPTS[promptMode]) {
    currentSettings.customPrompts[promptMode] = promptText;
  } else {
    delete currentSettings.customPrompts[promptMode];
  }

  await window.electronAPI.saveSettings(currentSettings);
  applySettings();
  hidePanel();
}

function applySettings() {
  const s = currentSettings;

  // Apply AI config
  AiClient.setConfig({
    baseUrl: s.aiBaseUrl,
    apiKey: s.aiApiKey,
    model: s.aiModel,
    temperature: s.temperature,
    maxTokens: s.maxTokens,
    customPrompts: s.customPrompts || {},
  });

  // Apply font size
  if (s.fontSize && s.fontSize !== Editor.getFontSize()) {
    Editor.zoomReset();
    for (let i = 16; i < s.fontSize; i++) Editor.zoomIn();
    for (let i = 16; i > s.fontSize; i--) Editor.zoomOut();
  }

  // Apply word wrap
  // (toggle if current state differs)
  if (document.getElementById('status-wrap')) {
    const wrapOn = document.getElementById('status-wrap').classList.contains('wrap-on');
    if (wrapOn !== s.wordWrap) Editor.toggleWordWrap();
  }

  // Sync AI panel defaults
  const aiMode = document.getElementById('ai-mode');
  if (aiMode) aiMode.value = s.aiDefaultMode;
  const aiTokens = document.getElementById('ai-tokens');
  if (aiTokens) aiTokens.value = s.maxTokens;

  // Update status bar model name
  const modelEl = document.getElementById('status-model');
  if (modelEl) {
    modelEl.textContent = `当前模型: ${s.aiModel}`;
  }

  // Restart auto-save timer
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  if (s.autoSaveInterval > 0) {
    autoSaveTimer = setInterval(() => {
      // App's saveFile is imported dynamically; use window dispatch
      window.dispatchEvent(new CustomEvent('settings:auto-save'));
    }, s.autoSaveInterval * 1000);
  }
}

export function getAutoSaveInterval() { return currentSettings.autoSaveInterval; }
