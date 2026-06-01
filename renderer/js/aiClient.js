/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — AI Client Module (simple request-response)
   ═══════════════════════════════════════════════════════ */

let config = {
  baseUrl: 'http://localhost:8080/v1',
  apiKey: '',
  model: 'local-model',
  temperature: 0.7,
  maxTokens: 2048,
  customPrompts: {},
};

let isStreaming = false;

export function getConfig() { return { ...config }; }
export function setConfig(newConfig) { config = { ...config, ...newConfig }; }
export function getIsStreaming() { return isStreaming; }

function showLoading() {
  const el = document.getElementById('status-ai-loading');
  if (el) el.classList.remove('ai-loading-hidden');
}

function hideLoading() {
  const el = document.getElementById('status-ai-loading');
  if (el) el.classList.add('ai-loading-hidden');
}

export async function sendMessage(messages, options = {}) {
  const mergedConfig = { ...config, ...options };
  isStreaming = true;
  showLoading();

  try {
    const result = await window.electronAPI.aiRequest({
      messages,
      model: mergedConfig.model,
      baseUrl: mergedConfig.baseUrl,
      apiKey: mergedConfig.apiKey,
      temperature: mergedConfig.temperature,
      maxTokens: mergedConfig.maxTokens,
    });

    isStreaming = false;
    hideLoading();

    if (!result.success) {
      throw new Error(result.error || 'AI 请求失败');
    }

    return result.content;
  } catch (err) {
    isStreaming = false;
    hideLoading();
    throw err;
  }
}

// ── System prompt templates ────────────────────────────

export const SYSTEM_PROMPTS = {
  '续写': '你是一位专业创意写手。请根据用户提供的上下文，自然地续写内容。保持与原文一致的风格、语气和节奏。直接输出续写内容，不需要解释或说明。',
  '润色': '你是一位专业中文编辑。请对用户提供的文本进行润色优化，提升表达质量，修正语法错误和不流畅的表达。用户可能指定了目标字数，请在保持原意的前提下扩充或精简内容以达到目标篇幅。直接输出润色后的文本，不需要解释或说明。',
  '定制': '你是一位全能的AI助手。请根据用户的具体要求来完成写作任务。直接输出所需内容。',
  '英译中': '你是一位专业翻译。请将用户提供的英文内容翻译为流畅自然的中文。保持原文语义和风格，直接输出译文。',
  '中译英': '你是一位专业翻译。请将用户提供的中文内容翻译为流畅自然的英文。保持原文语义和风格，直接输出译文。',
};

export function buildMessages(mode, userContent, systemExtra, references, maxTokens) {
  // Use custom prompt if defined, otherwise default
  let systemPrompt = config.customPrompts[mode] || SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS['定制'];

  if (references && references.length > 0) {
    systemPrompt += '\n\n以下是被引用文件的内容作为参考：\n';
    for (const ref of references) {
      if (ref.content) {
        const label = ref.lines ? `[${ref.name} ${ref.lines}]` : `[${ref.name}]`;
        systemPrompt += `\n--- ${label} ---\n${ref.content}\n`;
      }
    }
  }

  if (systemExtra) {
    systemPrompt += '\n\n用户的额外要求：' + systemExtra;
  }

  // Put length hint in USER message — same pattern as Ctrl+K which works accurately.
  // LLMs follow user instructions far more faithfully than system prompt hints.
  let finalUserContent = userContent;
  if (mode === '续写' && maxTokens) {
    const targetChars = Math.round(maxTokens * 0.7);
    finalUserContent = `请续写以下内容（约${targetChars}字）：\n\n${userContent}`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: finalUserContent },
  ];
}
