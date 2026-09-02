/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — Help / About dialogs
   ═══════════════════════════════════════════════════════ */

export function init() {
  const overlay = document.getElementById('help-overlay');
  if (!overlay) return;
  document.getElementById('help-close')?.addEventListener('click', hide);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hide();
  });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
    }
  });
}

export function hide() {
  document.getElementById('help-overlay')?.classList.add('hidden');
}

function show(title, html, wide) {
  const overlay = document.getElementById('help-overlay');
  const modal = document.getElementById('help-modal');
  const titleEl = document.getElementById('help-title');
  const body = document.getElementById('help-body');
  if (!overlay || !modal || !titleEl || !body) return;
  titleEl.textContent = title;
  body.innerHTML = html;
  modal.classList.toggle('help-modal-wide', !!wide);
  overlay.classList.remove('hidden');
  overlay.focus();
}

export function showHelp() {
  show('rabbit 帮助', `
    <div class="help-section">
      <h3>这是什么</h3>
      <p>小野兔 Rabbit 是本地优先的 Markdown 编辑器，支持 CodeMirror 编辑、实时预览，以及本地 / 云端 AI 辅助写作。</p>
    </div>
    <div class="help-section">
      <h3>文件</h3>
      <p>用「文件」菜单打开、保存 Markdown。<kbd>Ctrl+S</kbd> 保存，<kbd>Ctrl+Shift+S</kbd> 另存为。打开某个文件后，左侧文件树可以使用该文件所在目录。</p>
    </div>
    <div class="help-section">
      <h3>编辑与预览</h3>
      <p><kbd>Ctrl+Shift+P</kbd> 在源码和预览之间切换。预览里的链接会在系统浏览器中打开，不会离开编辑器。</p>
    </div>
    <div class="help-section">
      <h3>AI</h3>
      <p>右侧面板对话；<kbd>Ctrl+K</kbd> 对选区快速改写；<kbd>Ctrl+,</kbd> 打开设置，填写 API 地址、模型和密钥。本地 llama.cpp / Ollama 与 OpenAI 兼容接口都可以。</p>
    </div>
    <div class="help-section">
      <h3>更多</h3>
      <p>完整快捷键见「帮助 → 快捷键一览」（<kbd>Shift+F1</kbd>）。版本与项目地址见「关于小野兔」。</p>
    </div>
  `);
}

const SHORTCUT_GROUPS = [
  ['文件', [
    ['Ctrl+N', '新建'],
    ['Ctrl+O', '打开'],
    ['Ctrl+S', '保存'],
    ['Ctrl+Shift+S', '另存为'],
    ['Ctrl+Shift+O', '打开文件夹'],
    ['Ctrl+W', '关闭文件'],
  ]],
  ['编辑', [
    ['Ctrl+Z / Ctrl+Y', '撤销 / 重做'],
    ['Ctrl+X / C / V', '剪切 / 复制 / 粘贴'],
    ['Ctrl+A', '全选'],
    ['Ctrl+F / Ctrl+H', '查找 / 替换'],
    ['Ctrl+D', '复制行'],
    ['Ctrl+Shift+K', '删除行'],
    ['Ctrl+,', '设置'],
  ]],
  ['视图', [
    ['Ctrl+Shift+P', '预览切换'],
    ['Ctrl+Shift+W', '自动换行'],
    ['Ctrl+= / - / 0', '放大 / 缩小 / 重置缩放'],
    ['Ctrl+B / Ctrl+J', '左 / 右边栏'],
    ['F11', '窗口模式轮换'],
  ]],
  ['AI', [
    ['Ctrl+K', '选区弹窗编辑'],
    ['Ctrl+L', '选区引用 AI'],
    ['Alt+L', '聚焦 AI 输入'],
    ['Ctrl+Shift+T', 'AI 回复替换选区'],
    ['Ctrl+Shift+I', 'AI 回复插入选区'],
    ['Ctrl+Shift+C', '复制 AI 回复'],
  ]],
  ['帮助', [
    ['F1', 'rabbit 帮助'],
    ['Shift+F1', '快捷键一览'],
    ['Ctrl+F1', '关于小野兔'],
    ['Alt+H', '打开帮助菜单'],
  ]],
];

export function showShortcuts() {
  const tables = SHORTCUT_GROUPS.map(([group, rows]) => {
    const body = rows.map(([k, d]) =>
      `<tr><td class="help-kbd"><kbd>${k}</kbd></td><td>${d}</td></tr>`
    ).join('');
    return `<h3>${group}</h3><table class="help-shortcut-table">${body}</table>`;
  }).join('');
  show('快捷键一览', tables, true);
}

export async function showAbout() {
  let version = '';
  try {
    const info = await window.electronAPI.getAppInfo();
    version = info?.version || '';
  } catch (_) {}
  const verLine = version ? `版本 ${version}` : '';
  show('关于小野兔', `
    <div class="help-about">
      <img class="help-about-icon" src="assets/icon.png" alt="小野兔">
      <div class="help-about-name">小野兔 Rabbit</div>
      <div class="help-about-ver">${verLine}</div>
      <p>本地优先的 AI 辅助 Markdown 编辑器。</p>
      <p><a href="https://github.com/benbenzhuyi/rabbit-editor" target="_blank" rel="noreferrer">github.com/benbenzhuyi/rabbit-editor</a></p>
    </div>
  `);
}
