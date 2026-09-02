/* 小野兔 Rabbit — Help / About dialogs */

var ignoreHideUntil = 0;

export function init() {
  const overlay = document.getElementById("help-overlay");
  if (!overlay) return;
  document.getElementById("help-close").addEventListener("click", hide);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) hide();
  });
  overlay.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      e.preventDefault();
      hide();
    }
  });
  if (window.electronAPI && window.electronAPI.onShortcutHelp) {
    window.electronAPI.onShortcutHelp(function (kind) {
      if (kind === "shortcuts") showShortcuts();
      else if (kind === "about") showAbout();
      else showHelp();
    });
  }
}

export function hide() {
  if (Date.now() < ignoreHideUntil) return;
  var overlay = document.getElementById("help-overlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
  overlay.style.display = "";
}

function show(title, html, wide) {
  var overlay = document.getElementById("help-overlay");
  var modal = document.getElementById("help-modal");
  var titleEl = document.getElementById("help-title");
  var body = document.getElementById("help-body");
  if (!overlay || !modal || !titleEl || !body) {
    console.error("help overlay missing", !!overlay, !!modal, !!titleEl, !!body);
    return;
  }
  titleEl.textContent = title;
  body.innerHTML = html || "";
  modal.classList.toggle("help-modal-wide", !!wide);
  overlay.classList.remove("hidden");
  overlay.style.display = "flex";
  overlay.style.zIndex = "100000";
  overlay.style.visibility = "visible";
  overlay.style.opacity = "1";
  ignoreHideUntil = Date.now() + 400;
  overlay.focus();
  body.scrollTop = 0;
}

function showLater(title, html, wide) {
  setTimeout(function () { show(title, html, wide); }, 50);
}

export function showHelp() {
  if (window.electronAPI && window.electronAPI.openHelpPage) { window.electronAPI.openHelpPage("help"); return; }
  showLater("rabbit 帮助", HELP_HTML, true);
}

export function showShortcuts() {
  if (window.electronAPI && window.electronAPI.openHelpPage) { window.electronAPI.openHelpPage("shortcuts"); return; }
  var html = "<p class=\"help-lead\">以下为当前版本实际生效的快捷键。菜单栏「帮助」也可用 Alt+H 打开。</p>";
  for (var g = 0; g < SHORTCUT_GROUPS.length; g++) {
    var group = SHORTCUT_GROUPS[g][0];
    var rows = SHORTCUT_GROUPS[g][1];
    html += "<h3>" + group + "</h3><table class=\"help-shortcut-table\"><tbody>";
    for (var i = 0; i < rows.length; i++) {
      html += "<tr><td class=\"help-kbd\"><kbd>" + rows[i][0] + "</kbd></td><td>" + rows[i][1] + "</td></tr>";
    }
    html += "</tbody></table>";
  }
  showLater("快捷键一览", html, true);
}

export function showAbout() {
  if (window.electronAPI && window.electronAPI.openHelpPage) { window.electronAPI.openHelpPage("about"); return; }
  var version = "0.6.1";
  var name = "小野兔 Rabbit";
  var run = function () {
    showLater("关于小野兔",
      "<div class=\"help-about\">" +
      "<img class=\"help-about-icon\" src=\"assets/icon.png\" alt=\"小野兔\">" +
      "<div class=\"help-about-name\">" + name + "</div>" +
      "<div class=\"help-about-ver\">版本 " + version + "</div>" +
      "<p class=\"help-about-tag\">轻量化、开源、本地优先的 AI 辅助 Markdown 编辑器</p>" +
      "<table class=\"help-about-meta\">" +
      "<tr><td>产品</td><td>小野兔 Rabbit</td></tr>" +
      "<tr><td>版本</td><td>" + version + "</td></tr>" +
      "<tr><td>许可</td><td>MIT License</td></tr>" +
      "<tr><td>运行环境</td><td>Windows · Electron 36 · CodeMirror 6</td></tr>" +
      "<tr><td>数据位置</td><td>全部保存在本机 userData，无需云端账户</td></tr>" +
      "<tr><td>项目</td><td><a href=\"https://github.com/benbenzhuyi/rabbit-editor\" target=\"_blank\" rel=\"noreferrer\">github.com/benbenzhuyi/rabbit-editor</a></td></tr>" +
      "<tr><td>发布页</td><td><a href=\"https://github.com/benbenzhuyi/rabbit-editor/releases\" target=\"_blank\" rel=\"noreferrer\">Releases</a></td></tr>" +
      "</table>" +
      "<p class=\"help-about-note\">预览中的链接会在系统浏览器打开，不会离开编辑器。API 密钥只写在本机 settings.json。</p>" +
      "</div>"
    );
  };
  if (window.electronAPI && window.electronAPI.getAppInfo) {
    window.electronAPI.getAppInfo().then(function (info) {
      if (info && info.version) version = info.version;
      if (info && info.name) name = info.name;
      run();
    }).catch(run);
  } else {
    run();
  }
}

var HELP_HTML = [
  "<p class=\"help-lead\">小野兔把 Markdown 源码编辑、实时预览、文件管理、大纲导航、AI 对话和选区改写放在同一个桌面工作台里。下面按界面区域说明。</p>",
  "<div class=\"help-section\"><h3>1. 界面组成</h3><ul>",
  "<li><strong>菜单栏</strong>：文件、编辑、视图、帮助。</li>",
  "<li><strong>左边栏</strong>：文件浏览器 + 大纲导航，可拖动改宽度；中间分隔线可改高度。</li>",
  "<li><strong>中央编辑区</strong>：Markdown 源码，或渲染预览。</li>",
  "<li><strong>右边栏</strong>：AI 对话、模型与消息操作。</li>",
  "<li><strong>状态栏</strong>：行列、字数、选区字数、保存状态、AI 状态、模型、温度、换行、源码/预览、设置。</li>",
  "</ul></div>",
  "<div class=\"help-section\"><h3>2. 文件与工作区</h3><ul>",
  "<li>新建 / 打开 / 保存 / 另存为，未保存时切换或退出会先确认。</li>",
  "<li>「打开文件夹」把目录载入左侧文件树。单击文件打开；从文件树打开 Markdown 会进预览。</li>",
  "<li>支持 md / txt / html / json / js / css / py 等文本。另存为默认 .md。</li>",
  "<li>文件可拖进窗口打开。最近文件最多 5 条。</li>",
  "<li>文件树：单击文件夹展开，Shift+单击箭头展开子目录，双击名称重命名，右键可新建/重命名/删除。</li>",
  "<li>覆盖已有文件前会做备份；不会用空内容覆盖非空文件。</li>",
  "</ul></div>",
  "<div class=\"help-section\"><h3>3. 编辑与预览</h3><ul>",
  "<li>源码：Markdown 高亮、行号、当前行高亮、括号匹配。Ctrl+D 复制行，Ctrl+Shift+K 删除行，Alt+↑ / Alt+↓ 移动行。</li>",
  "<li>Ctrl+Shift+P 在源码和预览之间切换，尽量保持阅读位置；缩放两边共用。</li>",
  "<li>预览支持标题、列表、引用、链接、表格、图片、任务列表、代码高亮。链接在系统浏览器打开，不会把窗口导航走。</li>",
  "<li>Ctrl+F 查找，Ctrl+H 替换。窗口可拖动。Enter / Shift+Enter 跳转匹配，Esc 关闭。</li>",
  "</ul></div>",
  "<div class=\"help-section\"><h3>4. 大纲</h3><ul>",
  "<li>自动解析 H1–H6，点击跳到源码或预览对应位置。</li>",
  "<li>Alt+Shift+1～6 折叠到指定标题级别，Alt+Shift+9 全部展开。</li>",
  "</ul></div>",
  "<div class=\"help-section\"><h3>5. AI 辅助</h3>",
  "<p>走 OpenAI 兼容接口，可接 llama.cpp、Ollama、DeepSeek、Claude 兼容服务或自建接口。在「编辑 → 设置」或 Ctrl+, 里填基础地址、API Key、模型、温度、Tokens 和各模式提示词。</p><ul>",
  "<li><strong>Ctrl+K</strong>：对选区（无选区则当前行）润色 / 续写 / 定制 / 翻译。润色和翻译会替换选区，续写插入到后方。Ctrl+Enter 执行，Esc 关闭。</li>",
  "<li><strong>Ctrl+L</strong>：把选区或当前行引用到右侧对话，格式为 @文件名 行号。</li>",
  "<li>右边栏：Enter 发送，Shift+Enter 换行。对话按当前文件分别保存。可复制、替换选区、插入到选区后。</li>",
  "<li>Ctrl+Shift+C / T / I：复制、替换、插入最近一次 AI 回复。Alt+L 打开右边栏并聚焦输入框。</li>",
  "</ul></div>",
  "<div class=\"help-section\"><h3>6. 视图、主题与窗口</h3><ul>",
  "<li>Ctrl+B / Ctrl+J 开关左 / 右边栏。Ctrl+Alt+T 深色/浅色。</li>",
  "<li>Ctrl+= / - / 0 缩放，Ctrl+滚轮连续缩放。</li>",
  "<li>三种窗口：普通（Ctrl+Shift+1）、全屏有菜单（2）、全屏无菜单（3）。F11 循环。</li>",
  "<li>「退出保存窗口」（Ctrl+Alt+R）会记住位置、大小、模式和侧栏，下次启动恢复。</li>",
  "<li>「视图 → 语言」可选中/英/法/俄/西/葡/德/意/日/朝鲜语，重启后生效。</li>",
  "</ul></div>",
  "<div class=\"help-section\"><h3>7. 设置存在哪</h3>",
  "<p>都在本机 Electron userData 目录，不经过云端账户：</p><ul>",
  "<li><code>settings.json</code>：AI 参数、语言、窗口恢复（含 API Key）</li>",
  "<li><code>recent_files.json</code>：最近文件</li>",
  "<li><code>window-state.json</code>：窗口布局</li>",
  "<li><code>conversations/</code>：按文件保存的 AI 对话</li>",
  "</ul></div>",
  "<div class=\"help-section\"><h3>8. 需要知道的边界</h3><ul>",
  "<li>语言切换要重启。</li>",
  "<li>AI 必须是 OpenAI 兼容接口。</li>",
  "<li>预览里做替换，最终改的仍是源码。</li>",
  "<li>完整快捷键见「帮助 → 快捷键一览」（Shift+F1）。版本信息见「关于小野兔」（Ctrl+F1）。</li>",
  "</ul></div>"
].join("");

var SHORTCUT_GROUPS = [
  ["文件", [
    ["Ctrl+N", "新建空白文档"],
    ["Ctrl+O", "打开本地文件"],
    ["Ctrl+Shift+O", "打开文件夹到左侧文件树"],
    ["Ctrl+S", "保存"],
    ["Ctrl+Shift+S", "另存为"],
    ["Ctrl+W", "关闭当前文件"]
  ]],
  ["编辑", [
    ["Ctrl+Z", "撤销"],
    ["Ctrl+Y", "重做"],
    ["Ctrl+X / Ctrl+C / Ctrl+V", "剪切 / 复制 / 粘贴"],
    ["Ctrl+A", "全选"],
    ["Ctrl+D", "复制当前行"],
    ["Ctrl+Shift+K", "删除当前行"],
    ["Alt+↑ / Alt+↓", "当前行上移 / 下移"],
    ["Ctrl+,", "打开设置"]
  ]],
  ["查找替换", [
    ["Ctrl+F", "打开查找；有选区时用选中文字"],
    ["Ctrl+H", "打开查找替换"],
    ["Enter", "下一个匹配"],
    ["Shift+Enter", "上一个匹配"],
    ["F3 / Shift+F3", "查找下一个 / 上一个"],
    ["Esc", "关闭查找并清除高亮"]
  ]],
  ["AI 辅助", [
    ["Ctrl+K", "选区 AI 处理（润色 / 续写 / 翻译 / 定制）"],
    ["Ctrl+Enter", "在 Ctrl+K 窗口中确认执行"],
    ["Ctrl+L", "将选区或当前行引用到 AI 对话"],
    ["Alt+L", "显示右边栏并聚焦 AI 输入框"],
    ["Ctrl+Shift+C", "复制最近一次 AI 回复"],
    ["Ctrl+Shift+T", "用最近一次 AI 回复替换选区"],
    ["Ctrl+Shift+I", "将最近一次 AI 回复插入选区后方"],
    ["Enter", "在 AI 输入框中发送"],
    ["Shift+Enter", "在 AI 输入框中换行"],
    ["Esc", "取消消息编辑、关闭 Ctrl+K 或移出输入焦点"]
  ]],
  ["视图与布局", [
    ["Ctrl+Shift+P", "源码 / 预览切换"],
    ["Ctrl+Shift+W", "自动换行"],
    ["Ctrl+= / Ctrl+- / Ctrl+0", "放大 / 缩小 / 重置缩放"],
    ["Ctrl+鼠标滚轮", "连续缩放源码和预览"],
    ["Ctrl+B", "显示或隐藏左边栏"],
    ["Ctrl+J", "显示或隐藏右边栏"],
    ["Ctrl+Alt+T", "深色 / 浅色主题"],
    ["Ctrl+Alt+R", "开关「退出保存窗口」"],
    ["Ctrl+Shift+1", "普通窗口"],
    ["Ctrl+Shift+2", "全屏，保留菜单"],
    ["Ctrl+Shift+3", "全屏，隐藏菜单"],
    ["F11", "循环切换三种窗口模式"]
  ]],
  ["大纲", [
    ["Alt+Shift+1～6", "折叠到指定标题级别"],
    ["Alt+Shift+9", "展开全部标题"]
  ]],
  ["菜单与帮助", [
    ["Alt+F", "打开文件菜单"],
    ["Alt+E", "打开编辑菜单"],
    ["Alt+V", "打开视图菜单"],
    ["Alt+H", "打开帮助菜单"],
    ["F1", "rabbit 帮助"],
    ["Shift+F1", "快捷键一览"],
    ["Ctrl+F1", "关于小野兔"]
  ]]
];
