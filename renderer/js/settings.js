/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit Web — Settings Module (localStorage)
   ═══════════════════════════════════════════════════════ */

import * as AiClient from './aiClient.js';

const STORAGE_KEY = 'rabbit-settings';

const defaults = {
  aiBaseUrl: 'http://localhost:8080/v1',
  aiApiKey: '',
  aiModel: 'local-model',
  aiDefaultMode: '续写',
  ctrlKWords: 800,
  maxTokens: 2048,
  temperature: 0.7,
  customPrompts: {},
  autoSaveInterval: 60,
  proxyUrl: '',
};

let currentSettings = { ...defaults };
let autoSaveTimer = null;

export function getSettings() { return { ...currentSettings }; }

export function init() {
  loadFromLocalStorage();
  applySettings();
  wireUI();
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) currentSettings = { ...defaults, ...JSON.parse(raw) };
  } catch (_) {
    currentSettings = { ...defaults };
  }
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
}

function wireUI() {
  const overlay = document.getElementById('settings-overlay');
  const closeBtn = document.getElementById('settings-close');
  const cancelBtn = document.getElementById('settings-cancel');
  const saveBtn = document.getElementById('settings-save');

  if (closeBtn) closeBtn.addEventListener('click', () => hidePanel());
  if (cancelBtn) cancelBtn.addEventListener('click', () => hidePanel());
  if (saveBtn) saveBtn.addEventListener('click', () => saveAndApply());
  if (overlay) {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hidePanel(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePanel(); });
  }

  const promptMode = document.getElementById('set-prompt-mode');
  const promptText = document.getElementById('set-prompt-text');
  const promptReset = document.getElementById('set-prompt-reset');
  if (promptMode && promptText) {
    promptMode.addEventListener('change', () => {
      promptText.value = currentSettings.customPrompts[promptMode.value] || AiClient.SYSTEM_PROMPTS[promptMode.value] || '';
    });
  }
  if (promptReset && promptMode && promptText) {
    promptReset.addEventListener('click', () => {
      promptText.value = AiClient.SYSTEM_PROMPTS[promptMode.value] || '';
    });
  }
}

export function showPanel() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) { overlay.classList.remove('hidden'); overlay.focus(); }
  populateForm();
}

function hidePanel() {
  document.getElementById('settings-overlay').classList.add('hidden');
}

function populateForm() {
  const s = currentSettings;
  document.getElementById('set-ai-base-url').value = s.aiBaseUrl;
  document.getElementById('set-ai-api-key').value = s.aiApiKey;
  document.getElementById('set-ai-model').value = s.aiModel;
  document.getElementById('set-ai-default-mode').value = s.aiDefaultMode;
  document.getElementById('set-ctrlk-words').value = s.ctrlKWords;
  document.getElementById('set-max-tokens').value = s.maxTokens;
  document.getElementById('set-temperature').value = s.temperature;
  const pm = document.getElementById('set-prompt-mode');
  const pt = document.getElementById('set-prompt-text');
  if (pm && pt) pt.value = currentSettings.customPrompts[pm.value] || AiClient.SYSTEM_PROMPTS[pm.value] || '';
}

async function saveAndApply() {
  currentSettings.aiBaseUrl = document.getElementById('set-ai-base-url').value.trim() || defaults.aiBaseUrl;
  currentSettings.aiApiKey = document.getElementById('set-ai-api-key').value.trim();
  currentSettings.aiModel = document.getElementById('set-ai-model').value.trim() || defaults.aiModel;
  currentSettings.aiDefaultMode = document.getElementById('set-ai-default-mode').value;
  currentSettings.ctrlKWords = parseInt(document.getElementById('set-ctrlk-words').value) || 800;
  currentSettings.maxTokens = parseInt(document.getElementById('set-max-tokens').value) || 2048;
  currentSettings.temperature = parseFloat(document.getElementById('set-temperature').value) || 0.7;

  const pm = document.getElementById('set-prompt-mode').value;
  const pt = document.getElementById('set-prompt-text').value.trim();
  if (!currentSettings.customPrompts) currentSettings.customPrompts = {};
  if (pt && pt !== AiClient.SYSTEM_PROMPTS[pm]) {
    currentSettings.customPrompts[pm] = pt;
  } else {
    delete currentSettings.customPrompts[pm];
  }

  saveToLocalStorage();
  applySettings();
  hidePanel();
}

function applySettings() {
  const s = currentSettings;
  AiClient.setConfig({
    baseUrl: s.aiBaseUrl,
    apiKey: s.aiApiKey,
    model: s.aiModel,
    temperature: s.temperature,
    maxTokens: s.maxTokens,
    customPrompts: s.customPrompts || {},
  });

  const modelEl = document.getElementById('status-model');
  if (modelEl) modelEl.textContent = `当前模型: ${s.aiModel}`;

  if (autoSaveTimer) clearInterval(autoSaveTimer);
  if (s.autoSaveInterval > 0) {
    autoSaveTimer = setInterval(() => {
      window.dispatchEvent(new CustomEvent('settings:auto-save'));
    }, s.autoSaveInterval * 1000);
  }
}

export async function saveTemperature(val) {
  currentSettings.temperature = val;
  saveToLocalStorage();
}
