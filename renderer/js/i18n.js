import * as Settings from './settings.js';

export const LANGUAGES = [
  { code: 'zh-CN', flag: '🇨🇳', name: '中文' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'ko', flag: '🇰🇵', name: '조선말' },
];

const zh = {
  file: '文件', edit: '编辑', view: '视图', language: '语言',
  new: '新建', open: '打开', save: '保存', saveAs: '另存为',
  openFolder: '打开文件夹', recent: '最近文件', noRecentFiles: '（无最近文件）',
  closeFile: '关闭文件', exit: '退出', undo: '撤销', redo: '重做',
  cut: '剪切', copy: '复制', paste: '粘贴', selectAll: '全选',
  find: '查找', replace: '替换',
  copyLine: '复制行', deleteLine: '删除行', wordWrap: '自动换行',
  selectionAiEdit: '选区弹窗编辑', selectionQuoteAi: '选区引用AI',
  aiReplaceSelection: 'AI回复替换选区', aiInsertSelection: 'AI回复插入选区', copyAiReply: '复制AI回复',
  fontSizeUp: '增大字号', fontSizeDown: '减小字号', preview: '预览切换',
  zoomIn: '放大', zoomOut: '缩小', zoomReset: '重置缩放',
  leftSidebar: '左边栏', rightSidebar: '右边栏',
  windowNormal: '正常窗口', windowFullscreenMenu: '全屏有菜单',
  windowFullscreenClean: '全屏无菜单', cycleWindowMode: '窗口模式轮换',
  darkTheme: '深色主题', lightTheme: '浅色主题', restoreWindow: '退出保存窗口',
  fileBrowser: '文件浏览器', outline: '大纲导航', noHeadings: '暂无标题',
  conversation: '对话', newConversation: '新建对话', send: '发送',
  startChat: '输入消息开始与 AI 对话', messagePlaceholder: '输入消息 — 可直接描述写作要求 (Enter发送, Shift+Enter换行)',
  referenceHint: '输入 @ 引用文件 | Ctrl+L 引用编辑器内容',
  settings: '设置', aiSettings: 'AI 设置', cancel: '取消', confirm: '确定',
  polish: '润色', continueWriting: '续写', custom: '定制',
  enToZh: '英译中', zhToEn: '中译英', words: '字数', extraInstruction: '额外指令（可选）',
  baseUrl: '基础地址', apiKey: 'API 密钥', modelName: '模型名称',
  defaultMode: '默认模式', defaultWords: '默认字数', maxTokens: '最大输出 Tokens',
  temperature: '温度 (0-2)', customPrompt: '自定义提示词', editMode: '编辑模式',
  resetDefault: '恢复默认', source: '源码', previewMode: '预览', saved: '已保存',
  generating: '正在生成', wrap: '换行', currentModel: '当前模型',
  line: '行', column: '列', selected: '选中', goto: '定位',
  restartTitle: '语言已更改',
  restartMessage: '界面语言将在重启小野兔后生效。',
};

const packs = {
  'zh-CN': zh,
  en: {
    file:'File',edit:'Edit',view:'View',language:'Language',new:'New',open:'Open',save:'Save',saveAs:'Save As',
    openFolder:'Open Folder',recent:'Recent Files',noRecentFiles:'(No recent files)',closeFile:'Close File',exit:'Exit',
    undo:'Undo',redo:'Redo',cut:'Cut',copy:'Copy',paste:'Paste',selectAll:'Select All',find:'Find',replace:'Replace',copyLine:'Copy Line',deleteLine:'Delete Line',
    selectionAiEdit:'Edit Selection with AI',selectionQuoteAi:'Quote Selection to AI',
    aiReplaceSelection:'Replace Selection with AI Reply',aiInsertSelection:'Insert AI Reply after Selection',copyAiReply:'Copy AI Reply',
    wordWrap:'Word Wrap',fontSizeUp:'Increase Font Size',fontSizeDown:'Decrease Font Size',preview:'Toggle Preview',zoomIn:'Zoom In',
    zoomOut:'Zoom Out',zoomReset:'Reset Zoom',darkTheme:'Dark Theme',lightTheme:'Light Theme',restoreWindow:'Save window on exit',
    leftSidebar:'Left Sidebar',rightSidebar:'Right Sidebar',
    windowNormal:'Normal Window',windowFullscreenMenu:'Fullscreen with Menu',
    windowFullscreenClean:'Fullscreen without Menu',cycleWindowMode:'Cycle Window Mode',
    fileBrowser:'File Browser',outline:'Outline',noHeadings:'No headings',conversation:'Conversation',newConversation:'New Conversation',
    send:'Send',startChat:'Type a message to start chatting with AI',messagePlaceholder:'Describe your writing request (Enter to send, Shift+Enter for newline)',
    referenceHint:'Type @ to reference files | Ctrl+L to quote editor content',settings:'Settings',aiSettings:'AI Settings',
    cancel:'Cancel',confirm:'OK',polish:'Polish',continueWriting:'Continue',custom:'Custom',enToZh:'English to Chinese',
    zhToEn:'Chinese to English',words:'Words',extraInstruction:'Extra instructions (optional)',baseUrl:'Base URL',apiKey:'API Key',
    modelName:'Model',defaultMode:'Default Mode',defaultWords:'Default Words',maxTokens:'Maximum Output Tokens',
    temperature:'Temperature (0-2)',customPrompt:'Custom Prompt',editMode:'Edit Mode',resetDefault:'Restore Defaults',
    source:'Source',previewMode:'Preview',saved:'Saved',generating:'Generating',wrap:'Wrap',currentModel:'Current model',
    line:'Line',column:'Column',selected:'Selected',goto:'Go to Line',restartTitle:'Language changed',
    restartMessage:'The interface language will take effect after restarting Rabbit.',
  },
  fr: {
    file:'Fichier',edit:'Édition',view:'Affichage',language:'Langue',new:'Nouveau',open:'Ouvrir',save:'Enregistrer',saveAs:'Enregistrer sous',
    openFolder:'Ouvrir un dossier',recent:'Fichiers récents',noRecentFiles:'(Aucun fichier récent)',closeFile:'Fermer le fichier',exit:'Quitter',
    undo:'Annuler',redo:'Rétablir',cut:'Couper',copy:'Copier',paste:'Coller',selectAll:'Tout sélectionner',copyLine:'Copier la ligne',
    deleteLine:'Supprimer la ligne',wordWrap:'Retour à la ligne',fontSizeUp:'Agrandir la police',fontSizeDown:'Réduire la police',
    selectionAiEdit:'Modifier la sélection avec l’IA',selectionQuoteAi:'Citer la sélection à l’IA',
    aiReplaceSelection:'Remplacer par la réponse IA',aiInsertSelection:'Insérer la réponse IA',copyAiReply:'Copier la réponse IA',
    preview:'Basculer l’aperçu',zoomIn:'Agrandir',zoomOut:'Réduire',zoomReset:'Réinitialiser le zoom',darkTheme:'Thème sombre',
    lightTheme:'Thème clair',restoreWindow:'Enregistrer la fenêtre à la fermeture',fileBrowser:'Explorateur de fichiers',
    leftSidebar:'Barre latérale gauche',rightSidebar:'Barre latérale droite',
    windowNormal:'Fenêtre normale',windowFullscreenMenu:'Plein écran avec menu',
    windowFullscreenClean:'Plein écran sans menu',cycleWindowMode:'Changer de mode fenêtre',
    outline:'Plan',noHeadings:'Aucun titre',conversation:'Conversation',newConversation:'Nouvelle conversation',send:'Envoyer',
    startChat:'Écrivez un message pour démarrer avec l’IA',messagePlaceholder:'Décrivez votre demande (Entrée pour envoyer, Maj+Entrée pour une ligne)',
    referenceHint:'Tapez @ pour référencer un fichier | Ctrl+L pour citer l’éditeur',settings:'Paramètres',aiSettings:'Paramètres IA',
    cancel:'Annuler',confirm:'OK',polish:'Améliorer',continueWriting:'Continuer',custom:'Personnalisé',enToZh:'Anglais vers chinois',
    zhToEn:'Chinois vers anglais',words:'Mots',extraInstruction:'Instructions supplémentaires (facultatif)',baseUrl:'URL de base',
    apiKey:'Clé API',modelName:'Modèle',defaultMode:'Mode par défaut',defaultWords:'Nombre de mots',maxTokens:'Tokens de sortie maximum',
    temperature:'Température (0-2)',customPrompt:'Invite personnalisée',editMode:'Mode d’édition',resetDefault:'Valeurs par défaut',
    source:'Source',previewMode:'Aperçu',saved:'Enregistré',generating:'Génération',wrap:'Retour',currentModel:'Modèle actuel',
    line:'Ligne',column:'Colonne',selected:'Sélection',restartTitle:'Langue modifiée',
    restartMessage:'La langue de l’interface sera appliquée après le redémarrage de Rabbit.',
  },
};

const commonPacks = {
  ru: ['Файл','Правка','Вид','Язык','Новый','Открыть','Сохранить','Сохранить как','Открыть папку','Недавние файлы','(Нет недавних файлов)','Закрыть файл','Выход','Отменить','Повторить','Вырезать','Копировать','Вставить','Выбрать всё','Проводник','Структура','Настройки','Отправить'],
  es: ['Archivo','Editar','Ver','Idioma','Nuevo','Abrir','Guardar','Guardar como','Abrir carpeta','Archivos recientes','(Sin archivos recientes)','Cerrar archivo','Salir','Deshacer','Rehacer','Cortar','Copiar','Pegar','Seleccionar todo','Explorador de archivos','Esquema','Configuración','Enviar'],
  pt: ['Ficheiro','Editar','Ver','Idioma','Novo','Abrir','Guardar','Guardar como','Abrir pasta','Ficheiros recentes','(Sem ficheiros recentes)','Fechar ficheiro','Sair','Desfazer','Refazer','Cortar','Copiar','Colar','Selecionar tudo','Explorador de ficheiros','Estrutura','Definições','Enviar'],
  de: ['Datei','Bearbeiten','Ansicht','Sprache','Neu','Öffnen','Speichern','Speichern unter','Ordner öffnen','Zuletzt verwendet','(Keine zuletzt verwendeten Dateien)','Datei schließen','Beenden','Rückgängig','Wiederholen','Ausschneiden','Kopieren','Einfügen','Alles auswählen','Dateibrowser','Gliederung','Einstellungen','Senden'],
  it: ['File','Modifica','Vista','Lingua','Nuovo','Apri','Salva','Salva con nome','Apri cartella','File recenti','(Nessun file recente)','Chiudi file','Esci','Annulla','Ripeti','Taglia','Copia','Incolla','Seleziona tutto','Esplora file','Struttura','Impostazioni','Invia'],
  ja: ['ファイル','編集','表示','言語','新規','開く','保存','名前を付けて保存','フォルダーを開く','最近使ったファイル','（最近使ったファイルはありません）','ファイルを閉じる','終了','元に戻す','やり直す','切り取り','コピー','貼り付け','すべて選択','ファイルブラウザー','アウトライン','設定','送信'],
  ko: ['파일','편집','보기','언어','새 문서','열기','저장','다른 이름으로 저장','폴더 열기','최근 파일','(최근 파일 없음)','파일 닫기','끝내기','되돌리기','다시 실행','잘라내기','복사','붙여넣기','모두 선택','파일 탐색기','개요','설정','보내기'],
};

const commonKeys = ['file','edit','view','language','new','open','save','saveAs','openFolder','recent','noRecentFiles','closeFile','exit','undo','redo','cut','copy','paste','selectAll','fileBrowser','outline','settings','send'];
const extendedPacks = {
  ru: {
    leftSidebar:'Левая панель',rightSidebar:'Правая панель',
    selectionAiEdit:'Изменить выделение с ИИ',selectionQuoteAi:'Цитировать выделение для ИИ',aiReplaceSelection:'Заменить ответом ИИ',aiInsertSelection:'Вставить ответ ИИ',copyAiReply:'Копировать ответ ИИ',
    windowNormal:'Обычное окно',windowFullscreenMenu:'Полный экран с меню',windowFullscreenClean:'Полный экран без меню',cycleWindowMode:'Сменить режим окна',
    find:'Найти',replace:'Заменить',copyLine:'Копировать строку',deleteLine:'Удалить строку',wordWrap:'Перенос строк',fontSizeUp:'Увеличить шрифт',fontSizeDown:'Уменьшить шрифт',
    preview:'Переключить предпросмотр',zoomIn:'Увеличить',zoomOut:'Уменьшить',zoomReset:'Сбросить масштаб',darkTheme:'Тёмная тема',
    lightTheme:'Светлая тема',restoreWindow:'Сохранять окно при выходе',noHeadings:'Нет заголовков',conversation:'Диалог',
    newConversation:'Новый диалог',startChat:'Введите сообщение, чтобы начать диалог с ИИ',
    messagePlaceholder:'Опишите задачу (Enter — отправить, Shift+Enter — новая строка)',
    referenceHint:'Введите @ для ссылки на файл | Ctrl+L для цитаты из редактора',aiSettings:'Настройки ИИ',cancel:'Отмена',confirm:'ОК',
    polish:'Улучшить',continueWriting:'Продолжить',custom:'Свой режим',enToZh:'С английского на китайский',zhToEn:'С китайского на английский',
    words:'Слова',extraInstruction:'Дополнительные инструкции (необязательно)',baseUrl:'Базовый URL',apiKey:'Ключ API',modelName:'Модель',
    defaultMode:'Режим по умолчанию',defaultWords:'Количество слов',maxTokens:'Максимум выходных токенов',temperature:'Температура (0–2)',
    customPrompt:'Пользовательский промпт',editMode:'Режим редактирования',resetDefault:'Восстановить значения',source:'Исходник',
    previewMode:'Предпросмотр',saved:'Сохранено',generating:'Генерация',wrap:'Перенос',currentModel:'Текущая модель',line:'Строка',column:'Столбец',selected:'Выбрано',goto:'Перейти к строке',
  },
  es: {
    leftSidebar:'Barra lateral izquierda',rightSidebar:'Barra lateral derecha',
    selectionAiEdit:'Editar selección con IA',selectionQuoteAi:'Citar selección a la IA',aiReplaceSelection:'Reemplazar con respuesta IA',aiInsertSelection:'Insertar respuesta IA',copyAiReply:'Copiar respuesta IA',
    windowNormal:'Ventana normal',windowFullscreenMenu:'Pantalla completa con menú',windowFullscreenClean:'Pantalla completa sin menú',cycleWindowMode:'Alternar modo de ventana',
    find:'Buscar',replace:'Reemplazar',copyLine:'Copiar línea',deleteLine:'Eliminar línea',wordWrap:'Ajuste de línea',fontSizeUp:'Aumentar fuente',fontSizeDown:'Reducir fuente',
    preview:'Alternar vista previa',zoomIn:'Acercar',zoomOut:'Alejar',zoomReset:'Restablecer zoom',darkTheme:'Tema oscuro',
    lightTheme:'Tema claro',restoreWindow:'Guardar ventana al salir',noHeadings:'Sin encabezados',conversation:'Conversación',
    newConversation:'Nueva conversación',startChat:'Escribe un mensaje para iniciar una conversación con la IA',
    messagePlaceholder:'Describe tu solicitud (Enter para enviar, Mayús+Enter para nueva línea)',
    referenceHint:'Escribe @ para citar archivos | Ctrl+L para citar el editor',aiSettings:'Configuración de IA',cancel:'Cancelar',confirm:'Aceptar',
    polish:'Mejorar',continueWriting:'Continuar',custom:'Personalizado',enToZh:'Inglés a chino',zhToEn:'Chino a inglés',words:'Palabras',
    extraInstruction:'Instrucciones adicionales (opcional)',baseUrl:'URL base',apiKey:'Clave API',modelName:'Modelo',defaultMode:'Modo predeterminado',
    defaultWords:'Número de palabras',maxTokens:'Tokens máximos de salida',temperature:'Temperatura (0-2)',customPrompt:'Prompt personalizado',
    editMode:'Modo de edición',resetDefault:'Restaurar valores',source:'Código',previewMode:'Vista previa',saved:'Guardado',
    generating:'Generando',wrap:'Ajuste',currentModel:'Modelo actual',line:'Línea',column:'Columna',selected:'Seleccionado',goto:'Ir a línea',
  },
  pt: {
    leftSidebar:'Barra lateral esquerda',rightSidebar:'Barra lateral direita',
    selectionAiEdit:'Editar seleção com IA',selectionQuoteAi:'Citar seleção à IA',aiReplaceSelection:'Substituir pela resposta da IA',aiInsertSelection:'Inserir resposta da IA',copyAiReply:'Copiar resposta da IA',
    windowNormal:'Janela normal',windowFullscreenMenu:'Ecrã inteiro com menu',windowFullscreenClean:'Ecrã inteiro sem menu',cycleWindowMode:'Alternar modo da janela',
    find:'Localizar',replace:'Substituir',copyLine:'Copiar linha',deleteLine:'Eliminar linha',wordWrap:'Quebra de linha',fontSizeUp:'Aumentar letra',fontSizeDown:'Diminuir letra',
    preview:'Alternar pré-visualização',zoomIn:'Ampliar',zoomOut:'Reduzir',zoomReset:'Repor zoom',darkTheme:'Tema escuro',
    lightTheme:'Tema claro',restoreWindow:'Guardar janela ao sair',noHeadings:'Sem títulos',conversation:'Conversa',
    newConversation:'Nova conversa',startChat:'Escreva uma mensagem para iniciar a conversa com a IA',
    messagePlaceholder:'Descreva o pedido (Enter para enviar, Shift+Enter para nova linha)',
    referenceHint:'Digite @ para referir ficheiros | Ctrl+L para citar o editor',aiSettings:'Definições de IA',cancel:'Cancelar',confirm:'OK',
    polish:'Melhorar',continueWriting:'Continuar',custom:'Personalizado',enToZh:'Inglês para chinês',zhToEn:'Chinês para inglês',
    words:'Palavras',extraInstruction:'Instruções adicionais (opcional)',baseUrl:'URL base',apiKey:'Chave API',modelName:'Modelo',
    defaultMode:'Modo predefinido',defaultWords:'Número de palavras',maxTokens:'Máximo de tokens de saída',temperature:'Temperatura (0-2)',
    customPrompt:'Prompt personalizado',editMode:'Modo de edição',resetDefault:'Repor predefinições',source:'Código',
    previewMode:'Pré-visualização',saved:'Guardado',generating:'A gerar',wrap:'Quebra',currentModel:'Modelo atual',line:'Linha',column:'Coluna',selected:'Selecionado',goto:'Ir para linha',
  },
  de: {
    leftSidebar:'Linke Seitenleiste',rightSidebar:'Rechte Seitenleiste',
    selectionAiEdit:'Auswahl mit KI bearbeiten',selectionQuoteAi:'Auswahl an KI zitieren',aiReplaceSelection:'Durch KI-Antwort ersetzen',aiInsertSelection:'KI-Antwort einfügen',copyAiReply:'KI-Antwort kopieren',
    windowNormal:'Normales Fenster',windowFullscreenMenu:'Vollbild mit Menü',windowFullscreenClean:'Vollbild ohne Menü',cycleWindowMode:'Fenstermodus wechseln',
    find:'Suchen',replace:'Ersetzen',copyLine:'Zeile kopieren',deleteLine:'Zeile löschen',wordWrap:'Zeilenumbruch',fontSizeUp:'Schrift vergrößern',fontSizeDown:'Schrift verkleinern',
    preview:'Vorschau umschalten',zoomIn:'Vergrößern',zoomOut:'Verkleinern',zoomReset:'Zoom zurücksetzen',darkTheme:'Dunkles Design',
    lightTheme:'Helles Design',restoreWindow:'Fenster beim Beenden speichern',noHeadings:'Keine Überschriften',conversation:'Unterhaltung',
    newConversation:'Neue Unterhaltung',startChat:'Nachricht eingeben, um den KI-Dialog zu starten',
    messagePlaceholder:'Schreibauftrag beschreiben (Enter zum Senden, Umschalt+Enter für neue Zeile)',
    referenceHint:'@ für Dateiverweise | Ctrl+L für Editorzitat',aiSettings:'KI-Einstellungen',cancel:'Abbrechen',confirm:'OK',
    polish:'Überarbeiten',continueWriting:'Fortsetzen',custom:'Benutzerdefiniert',enToZh:'Englisch nach Chinesisch',zhToEn:'Chinesisch nach Englisch',
    words:'Wörter',extraInstruction:'Zusätzliche Anweisungen (optional)',baseUrl:'Basis-URL',apiKey:'API-Schlüssel',modelName:'Modell',
    defaultMode:'Standardmodus',defaultWords:'Standardwortzahl',maxTokens:'Maximale Ausgabetokens',temperature:'Temperatur (0–2)',
    customPrompt:'Eigener Prompt',editMode:'Bearbeitungsmodus',resetDefault:'Standard wiederherstellen',source:'Quelltext',
    previewMode:'Vorschau',saved:'Gespeichert',generating:'Wird generiert',wrap:'Umbruch',currentModel:'Aktuelles Modell',line:'Zeile',column:'Spalte',selected:'Ausgewählt',goto:'Zur Zeile',
  },
  it: {
    leftSidebar:'Barra laterale sinistra',rightSidebar:'Barra laterale destra',
    selectionAiEdit:'Modifica selezione con IA',selectionQuoteAi:'Cita selezione all’IA',aiReplaceSelection:'Sostituisci con risposta IA',aiInsertSelection:'Inserisci risposta IA',copyAiReply:'Copia risposta IA',
    windowNormal:'Finestra normale',windowFullscreenMenu:'Schermo intero con menu',windowFullscreenClean:'Schermo intero senza menu',cycleWindowMode:'Cambia modalità finestra',
    find:'Trova',replace:'Sostituisci',copyLine:'Copia riga',deleteLine:'Elimina riga',wordWrap:'A capo automatico',fontSizeUp:'Aumenta carattere',fontSizeDown:'Riduci carattere',
    preview:'Attiva anteprima',zoomIn:'Ingrandisci',zoomOut:'Riduci',zoomReset:'Reimposta zoom',darkTheme:'Tema scuro',
    lightTheme:'Tema chiaro',restoreWindow:'Salva finestra all’uscita',noHeadings:'Nessun titolo',conversation:'Conversazione',
    newConversation:'Nuova conversazione',startChat:'Scrivi un messaggio per iniziare con l’IA',
    messagePlaceholder:'Descrivi la richiesta (Invio per inviare, Maiusc+Invio per nuova riga)',
    referenceHint:'Digita @ per citare file | Ctrl+L per citare l’editor',aiSettings:'Impostazioni IA',cancel:'Annulla',confirm:'OK',
    polish:'Migliora',continueWriting:'Continua',custom:'Personalizzato',enToZh:'Inglese in cinese',zhToEn:'Cinese in inglese',
    words:'Parole',extraInstruction:'Istruzioni aggiuntive (facoltative)',baseUrl:'URL di base',apiKey:'Chiave API',modelName:'Modello',
    defaultMode:'Modalità predefinita',defaultWords:'Numero di parole',maxTokens:'Token massimi in uscita',temperature:'Temperatura (0-2)',
    customPrompt:'Prompt personalizzato',editMode:'Modalità di modifica',resetDefault:'Ripristina predefiniti',source:'Sorgente',
    previewMode:'Anteprima',saved:'Salvato',generating:'Generazione',wrap:'A capo',currentModel:'Modello attuale',line:'Riga',column:'Colonna',selected:'Selezionato',goto:'Vai a riga',
  },
  ja: {
    leftSidebar:'左サイドバー',rightSidebar:'右サイドバー',
    selectionAiEdit:'選択範囲をAI編集',selectionQuoteAi:'選択範囲をAIに引用',aiReplaceSelection:'AI回答で選択範囲を置換',aiInsertSelection:'AI回答を選択範囲後に挿入',copyAiReply:'AI回答をコピー',
    windowNormal:'通常ウィンドウ',windowFullscreenMenu:'メニュー付き全画面',windowFullscreenClean:'メニューなし全画面',cycleWindowMode:'ウィンドウモード切替',
    find:'検索',replace:'置換',copyLine:'行をコピー',deleteLine:'行を削除',wordWrap:'行を折り返す',fontSizeUp:'文字を大きく',fontSizeDown:'文字を小さく',
    preview:'プレビュー切替',zoomIn:'拡大',zoomOut:'縮小',zoomReset:'ズームをリセット',darkTheme:'ダークテーマ',
    lightTheme:'ライトテーマ',restoreWindow:'終了時にウィンドウを保存',noHeadings:'見出しがありません',conversation:'会話',
    newConversation:'新しい会話',startChat:'メッセージを入力して AI との会話を開始',
    messagePlaceholder:'執筆内容を入力（Enterで送信、Shift+Enterで改行）',
    referenceHint:'@ でファイルを参照 | Ctrl+L でエディター内容を引用',aiSettings:'AI 設定',cancel:'キャンセル',confirm:'決定',
    polish:'推敲',continueWriting:'続きを書く',custom:'カスタム',enToZh:'英語から中国語',zhToEn:'中国語から英語',words:'文字数',
    extraInstruction:'追加指示（任意）',baseUrl:'ベース URL',apiKey:'API キー',modelName:'モデル名',defaultMode:'既定モード',
    defaultWords:'既定文字数',maxTokens:'最大出力トークン',temperature:'温度 (0-2)',customPrompt:'カスタムプロンプト',
    editMode:'編集モード',resetDefault:'初期値に戻す',source:'ソース',previewMode:'プレビュー',saved:'保存済み',
    generating:'生成中',wrap:'折り返し',currentModel:'現在のモデル',line:'行',column:'列',selected:'選択',goto:'行へ移動',
  },
  ko: {
    leftSidebar:'왼쪽 사이드바',rightSidebar:'오른쪽 사이드바',
    selectionAiEdit:'선택 영역 AI 편집',selectionQuoteAi:'선택 영역 AI 인용',aiReplaceSelection:'AI 답변으로 선택 영역 바꾸기',aiInsertSelection:'AI 답변 삽입',copyAiReply:'AI 답변 복사',
    windowNormal:'일반 창',windowFullscreenMenu:'메뉴 있는 전체 화면',windowFullscreenClean:'메뉴 없는 전체 화면',cycleWindowMode:'창 모드 전환',
    find:'찾기',replace:'바꾸기',copyLine:'줄 복사',deleteLine:'줄 삭제',wordWrap:'자동 줄바꿈',fontSizeUp:'글자 크게',fontSizeDown:'글자 작게',
    preview:'미리보기 전환',zoomIn:'확대',zoomOut:'축소',zoomReset:'배율 초기화',darkTheme:'어두운 테마',
    lightTheme:'밝은 테마',restoreWindow:'끝낼 때 창 저장',noHeadings:'제목 없음',conversation:'대화',newConversation:'새 대화',
    startChat:'메시지를 입력하여 AI 대화를 시작하세요',messagePlaceholder:'글쓰기 요청 입력 (Enter 전송, Shift+Enter 줄바꿈)',
    referenceHint:'@ 로 파일 참조 | Ctrl+L 로 편집기 내용 인용',aiSettings:'AI 설정',cancel:'취소',confirm:'확인',
    polish:'다듬기',continueWriting:'이어쓰기',custom:'사용자 지정',enToZh:'영어→중국어',zhToEn:'중국어→영어',words:'글자 수',
    extraInstruction:'추가 지시 (선택)',baseUrl:'기본 URL',apiKey:'API 키',modelName:'모델 이름',defaultMode:'기본 모드',
    defaultWords:'기본 글자 수',maxTokens:'최대 출력 토큰',temperature:'온도 (0-2)',customPrompt:'사용자 지정 프롬프트',
    editMode:'편집 모드',resetDefault:'기본값 복원',source:'원문',previewMode:'미리보기',saved:'저장됨',
    generating:'생성 중',wrap:'줄바꿈',currentModel:'현재 모델',line:'줄',column:'열',selected:'선택',goto:'줄로 이동',
  },
};
for (const [code, values] of Object.entries(commonPacks)) {
  packs[code] = { ...packs.en };
  commonKeys.forEach((key, index) => { packs[code][key] = values[index]; });
  Object.assign(packs[code], extendedPacks[code]);
  const localized = {
    ru:['Язык изменён','Язык интерфейса изменится после перезапуска Rabbit.'],
    es:['Idioma cambiado','El idioma de la interfaz se aplicará después de reiniciar Rabbit.'],
    pt:['Idioma alterado','O idioma da interface será aplicado depois de reiniciar o Rabbit.'],
    de:['Sprache geändert','Die Oberflächensprache wird nach einem Neustart von Rabbit angewendet.'],
    it:['Lingua modificata','La lingua dell’interfaccia verrà applicata dopo il riavvio di Rabbit.'],
    ja:['言語を変更しました','Rabbit を再起動すると、インターフェースの言語が切り替わります。'],
    ko:['언어가 변경되었습니다','Rabbit을 다시 시작하면 화면 언어가 바뀝니다.'],
  }[code];
  packs[code].restartTitle = localized[0];
  packs[code].restartMessage = localized[1];
}

const sourceToKey = Object.fromEntries(Object.entries(zh).map(([key, value]) => [value, key]));
let currentLanguage = 'zh-CN';

export function getLanguage() { return currentLanguage; }
export function t(key) { return packs[currentLanguage]?.[key] || packs.en[key] || zh[key] || key; }

function translateTextNode(node) {
  const raw = node.nodeValue;
  const trimmed = raw.trim();
  const key = sourceToKey[trimmed];
  if (key) {
    node.nodeValue = raw.replace(trimmed, t(key));
    return;
  }
  for (const [source, sourceKey] of Object.entries(sourceToKey).sort((a, b) => b[0].length - a[0].length)) {
    if (source.length >= 2 && raw.includes(source)) {
      node.nodeValue = raw.replace(source, t(sourceKey));
      return;
    }
  }
}

function translateElement(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) translateTextNode(walker.currentNode);
  element.querySelectorAll?.('[title], [placeholder]').forEach((el) => {
    for (const attr of ['title', 'placeholder']) {
      const value = el.getAttribute(attr);
      const key = sourceToKey[value];
      if (key) el.setAttribute(attr, t(key));
    }
  });
}

export async function init() {
  currentLanguage = Settings.getSettings().language || 'zh-CN';
  if (!packs[currentLanguage]) currentLanguage = 'zh-CN';
  document.documentElement.lang = currentLanguage;
  if (currentLanguage === 'zh-CN') return;
  translateElement(document.body);
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else if (node.nodeType === Node.ELEMENT_NODE) translateElement(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });
}
