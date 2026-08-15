/**
 * SIDE PANEL LOGIC
 *
 * Handles the UI for YouTube Digest: video detection, transcript analysis,
 * rendering results, and export features.
 */

const DEBUG = false;
const debugLog = (...args) => {
  if (DEBUG) console.log(...args);
};

// ============================================================
// UI LANGUAGE — follows the preferred language chosen in Settings
// ============================================================
// The options page persists its interface-language choice under this key.
// It is intentionally duplicated from options.js (loading options.js here
// would initialize the settings form, which does not exist in the panel).
const PREFERRED_LANGUAGE_KEY = "ytd_options_language";
const SUPPORTED_UI_LANGUAGES = new Set([
  "en", "zh-CN", "zh-TW", "ja", "ko", "hi", "es", "fr", "ar", "bn", "pt", "ru", "ur",
]);

const UI_COPY = {
  en: {
    settingsBtn: "Settings",
    settingsBtnTitle: "Open YouTube Digest settings",
    tabTranscript: "Transcript",
    tabOverview: "Overview",
    tabNotes: "Notes",
    welcomeTitle: "Ready to Digest",
    welcomeDesc:
      "Navigate to a YouTube video and click the extension icon to get an AI-powered digest.",
    loadingText: "Fetching transcript",
    loadingSubtext: "Extracting captions from video...",
    errorTitle: "Error",
    errorMessage: "Something went wrong.",
    errorBtn: "Try Again",
    transcriptTitle: "Full Transcript",
    modeOriginalLabel: "Original",
    originalWithLanguage: ({ language }) => `Original (${language})`,
    copyBtn: "Copy",
    exportBtn: "Export",
    transcriptModeAria: "Transcript language",
    overviewModeAria: "Overview language",
    notesModeAria: "Notes language",
    translatingAria: "Translating",
    subtitleBadge: ({ label }) => `From video subtitles · ${label}`,
    bilingualBadge: ({ label, source, target }) =>
      source && target ? `${source} + ${target}` : `${label} + 简体中文`,
    translatedBadge: ({ label, source, target }) =>
      source && target ? `${target} · translated from ${source}` : `简体中文 · translated from ${label}`,
    chaptersTitle: "Chapters",
    chaptersPlaceholder: "Chapters will appear here",
    quotesTitle: "Key Quotes",
    quotesPlaceholder: "Quotes will be extracted when you view this tab...",
    loadingChapters: "Loading chapters...",
    loadingQuotes: "Loading quotes...",
    analysisFailed: ({ error }) => `Analysis failed: ${error}`,
    analysisError: ({ error }) => `Error: ${error}`,
    notesTitle: "Saved Notes",
    notesFilterThis: "This Video",
    notesFilterAll: "All Notes",
    notesIntro:
      'Move your mouse over the video and click the Note button to save timestamped notes, or press the "n" key while the video is focused.',
    notesEmptyThis:
      "No notes for this video yet. Hover over the video and click Note to save.",
    notesEmptyAll:
      "No notes saved yet. Hover over a video and click Note to save.",
    noteDeleteTitle: "Delete note",
    noteCopyText: "Copy text",
    noteCopyLink: "Copy timestamp",
    notePlay: "Play",
    copied: "Copied",
    quoteNoteAction: "Note",
    quoteSaveNoteTitle: "Save this quote as a note",
    quoteCopyTitle: "Copy this quote",
    saving: "Saving...",
    saved: "✓ Saved",
    btnError: "Error",
    followPlayback: "Follow playback",
    backToTopTitle: "Back to top",
    explainAction: "Explain",
    explainTitle: "Explain",
    analyzing: "Analyzing...",
    explainFailed: ({ error }) => `Failed to get explanation: ${error}`,
    explainError: ({ error }) => `Error: ${error}`,
    waitingTranslation: "Waiting for translation…",
    retrying: "Retrying…",
    retry: "Retry",
    translationUnavailable: "Translation unavailable.",
    translationFailed: "Translation failed.",
    apiKeyMissingTitle: "API key missing",
    apiKeyMissingMsg:
      "Add your Supadata API key in YouTube Digest Settings.",
    noTranscriptTitle: "No transcript found",
    switchSourceLanguageToEnglish: "Switch original language to English",
    missingKeysTitle: "API Keys Missing",
    supadataName: "Supadata",
    aiProviderName: "AI provider",
    listJoiner: " and ",
    missingKeysMessage: ({ missing, plural }) =>
      `Add your ${missing} API key${plural} in YouTube Digest Settings.`,
    openSettings: "Open Settings",
  },
  "zh-CN": {
    settingsBtn: "设置",
    settingsBtnTitle: "打开 YouTube Digest 设置",
    tabTranscript: "字幕",
    tabOverview: "概览",
    tabNotes: "笔记",
    welcomeTitle: "准备生成摘要",
    welcomeDesc:
      "打开一个 YouTube 视频，点击扩展图标即可获取 AI 摘要。",
    loadingText: "正在获取字幕",
    loadingSubtext: "正在从视频提取字幕…",
    errorTitle: "错误",
    errorMessage: "出了点问题。",
    errorBtn: "重试",
    transcriptTitle: "完整字幕",
    modeOriginalLabel: "原文",
    originalWithLanguage: ({ language }) => `原文（${language}）`,
    copyBtn: "复制",
    exportBtn: "导出",
    transcriptModeAria: "字幕语言",
    overviewModeAria: "概览语言",
    notesModeAria: "笔记语言",
    translatingAria: "正在翻译",
    subtitleBadge: ({ label }) => `来自视频字幕 · ${label}`,
    bilingualBadge: ({ label, source, target }) =>
      source && target ? `${source} + ${target}` : `${label} + 简体中文`,
    translatedBadge: ({ label, source, target }) =>
      source && target ? `${target} · 译自${source}` : `简体中文 · 译自${label}`,
    chaptersTitle: "章节",
    chaptersPlaceholder: "章节将显示在这里",
    quotesTitle: "关键引言",
    quotesPlaceholder: "打开此标签页时会自动提取关键引言…",
    loadingChapters: "正在加载章节...",
    loadingQuotes: "正在加载引言...",
    analysisFailed: ({ error }) => `分析失败：${error}`,
    analysisError: ({ error }) => `错误：${error}`,
    notesTitle: "已保存笔记",
    notesFilterThis: "本视频",
    notesFilterAll: "全部笔记",
    notesIntro:
      "将鼠标移到视频上，点击笔记按钮保存带时间戳的笔记；视频获得焦点时也可以按 “n” 键。",
    notesEmptyThis: "本视频还没有笔记。将鼠标移到视频上，点击笔记即可保存。",
    notesEmptyAll: "还没有保存过笔记。将鼠标移到视频上，点击笔记即可保存。",
    noteDeleteTitle: "删除笔记",
    noteCopyText: "复制文本",
    noteCopyLink: "复制时间戳",
    notePlay: "播放",
    copied: "已复制",
    quoteNoteAction: "笔记",
    quoteSaveNoteTitle: "将这条引言保存为笔记",
    quoteCopyTitle: "复制这条引言",
    saving: "保存中...",
    saved: "✓ 已保存",
    btnError: "错误",
    followPlayback: "跟随播放",
    backToTopTitle: "回到顶部",
    explainAction: "解释",
    explainTitle: "解释",
    analyzing: "正在分析…",
    explainFailed: ({ error }) => `获取解释失败：${error}`,
    explainError: ({ error }) => `错误：${error}`,
    waitingTranslation: "等待翻译…",
    retrying: "重试中…",
    retry: "重试",
    translationUnavailable: "翻译不可用。",
    translationFailed: "翻译失败。",
    apiKeyMissingTitle: "缺少 API 密钥",
    apiKeyMissingMsg: "请在 YouTube Digest 设置中添加 Supadata API 密钥。",
    noTranscriptTitle: "未找到字幕",
    switchSourceLanguageToEnglish: "将原文语言切换为英语",
    missingKeysTitle: "缺少 API 密钥",
    supadataName: "Supadata",
    aiProviderName: "AI 服务",
    listJoiner: " 和 ",
    missingKeysMessage: ({ missing }) =>
      `请在 YouTube Digest 设置中添加${missing}的 API 密钥。`,
    openSettings: "打开设置",
  },
};

let currentUiLanguage = "en";
let translationPreferences = { sourceLanguage: "en", targetLanguage: "zh-CN" };

// Inline action icons for copy controls. Stroke uses currentColor so the
// icons follow each button's hover/active palette for free.
const COPY_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const CHECK_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

function normalizeUiLanguage(language) {
  return SUPPORTED_UI_LANGUAGES.has(language) ? language : "en";
}

function t(key, params = {}) {
  const copy = UI_COPY[currentUiLanguage] ?? UI_COPY.en;
  const value = copy[key] ?? UI_COPY.en[key] ?? "";
  return typeof value === "function" ? value(params) : value;
}

/**
 * Applies the preferred interface language to every statically labeled
 * element. Dynamically rendered strings read t() at render time.
 */
function applyUiLanguage(language) {
  currentUiLanguage = normalizeUiLanguage(language);
  document.documentElement.lang = currentUiLanguage;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-title]")) {
    element.setAttribute("title", t(element.dataset.i18nTitle));
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
  updateTranslationModeLabels();
}

async function loadPreferredUiLanguage() {
  try {
    const stored = await chrome.storage.local.get(PREFERRED_LANGUAGE_KEY);
    applyUiLanguage(stored[PREFERRED_LANGUAGE_KEY]);
  } catch (_error) {
    applyUiLanguage("en");
  }
}

function getTranslationLanguage(code) {
  if (typeof YTD_SETTINGS.getTranslationLanguage === "function") {
    return YTD_SETTINGS.getTranslationLanguage(code);
  }
  const names = {
    en: "English", "zh-CN": "简体中文", "zh-TW": "繁體中文", ja: "日本語",
    ko: "한국어", hi: "हिन्दी", es: "Español", fr: "Français", ar: "العربية",
    bn: "বাংলা", pt: "Português", ru: "Русский", ur: "اردو",
  };
  return { code: names[code] ? code : "en", nativeName: names[code] || names.en };
}

function getSourceLanguage() {
  return getTranslationLanguage(translationPreferences.sourceLanguage);
}

function getTargetLanguage() {
  return getTranslationLanguage(translationPreferences.targetLanguage);
}

function updateTranslationModeLabels() {
  const source = getSourceLanguage().nativeName;
  const target = getTargetLanguage().nativeName;
  for (const button of document.querySelectorAll('[data-transcript-mode="original"], [data-overview-mode="original"], [data-notes-mode="original"]')) {
    button.textContent = source;
  }
  for (const button of document.querySelectorAll('[data-transcript-mode="zh"], [data-overview-mode="zh"], [data-notes-mode="zh"]')) {
    button.textContent = target;
  }
}

async function loadTranslationPreferences() {
  const previousSourceLanguage = translationPreferences.sourceLanguage;
  const previous = `${previousSourceLanguage}:${translationPreferences.targetLanguage}`;
  const stored = await chrome.storage.local.get(YTD_SETTINGS.STORAGE_KEY);
  const settings = YTD_SETTINGS.normalize(stored[YTD_SETTINGS.STORAGE_KEY]);
  translationPreferences = {
    sourceLanguage: settings.sourceLanguage,
    targetLanguage: settings.targetLanguage,
  };
  updateTranslationModeLabels();
  if (previous === `${translationPreferences.sourceLanguage}:${translationPreferences.targetLanguage}`) return;
  const sourceLanguageChanged =
    previousSourceLanguage !== translationPreferences.sourceLanguage;
  translationGeneration += 1;
  overviewTranslationGeneration += 1;
  notesTranslationGeneration += 1;

  // Transcript cache entries are language-specific. Reload the current video
  // so its list is fetched from Supadata with the newly selected source
  // language instead of retaining the previously displayed subtitle track.
  if (sourceLanguageChanged && currentVideoId && currentVideoUrl) {
    void startDigest(currentVideoId, currentVideoUrl, true);
    return;
  }

  if (currentTranscript) renderTranscript();
  if (currentAnalysis) renderAnalysisResults(currentAnalysis);
  if (currentNotes.length) renderNotes(currentNotes, currentNotesFilteredVideoId);
  if (currentTranscriptMode !== "original") void translateTranscript();
  if (currentOverviewMode !== "original") void translateOverview();
  if (currentNotesMode !== "original") void translateNotes();
}

// ============================================================
// STATE
// ============================================================

let currentVideoId = null;
let currentVideoUrl = null;
let currentAnalysis = null;
let currentTranscript = null;
let currentTranscriptText = null; // Plain text (for display/export)
let currentTranscriptTimestamped = null; // With timestamps for AI analysis
let currentTranscriptLanguage = null;
let currentVideoTitle = "";
let currentChannelName = "";
let currentVideoDescription = "";
let currentVideoDuration = 0;
let digestGeneration = 0;
let isAnalysisLoading = false; // Track if analysis is in progress
let youtubeTabId = null; // Store the YouTube tab ID for reliable messaging
let errorAction = null;

// --- Translation state ---
// The public transcript control intentionally supports only the original
// subtitles, Chinese, and an aligned source + Chinese view.
let currentTranscriptMode = "original";
let translationGeneration = 0; // Invalidates responses from older UI modes/videos.
let translationWorkCount = 0;
let transcriptScrollObserver = null;
// Stable keys include the video, source mode, language, and semantic segment ID.
let transcriptParagraphCache = new Map();
const TRANSLATION_MESSAGE_TIMEOUT_MS = 130_000;

// --- Overview translation state ---
// The Overview tab reuses the transcript's Original / 中文 / 双语 control for
// chapters and key quotes. Translations are cached per video + segment, so a
// re-visit renders instantly without another provider call.
let currentOverviewMode = "original";
let overviewTranslationGeneration = 0; // Invalidates in-flight overview batches.
let overviewTranslationWorkCount = 0;
let overviewTranslationCache = new Map(); // `${videoId}:zh:overview:${segmentId}`
let overviewSegmentErrors = new Map(); // Same keys; value = error message

// --- Notes translation state ---
// Notes persist independently of a video's digest cache, so translations stay
// in a panel-local cache keyed by the stable note ID.
let currentNotes = [];
let currentNotesFilteredVideoId = null;
let currentNotesMode = "original";
let notesTranslationGeneration = 0;
let notesTranslationWorkCount = 0;
let notesTranslationCache = new Map(); // `${noteId}:zh:note`
let notesTranslationTimestamps = new Map(); // Same keys; value = saved-at ms
let noteTranslationErrors = new Map(); // Same keys; value = error message
const NOTE_TRANSLATION_CACHE_STORAGE_KEY = "ytd_note_translation_cache";
const TRANSLATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Prevent a stopped service worker or dead message channel from leaving the
 * transcript queue stuck forever. The underlying Chrome message cannot be
 * cancelled, so settled guards deliberately ignore any late response.
 */
function sendTranslationMessage(message) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      callback(value);
    };

    timeoutId = setTimeout(() => {
      finish(
        reject,
        new Error(
          "Translation request timed out after 130 seconds. Please Retry.",
        ),
      );
    }, TRANSLATION_MESSAGE_TIMEOUT_MS);

    let messagePromise;
    try {
      messagePromise = chrome.runtime.sendMessage(message);
    } catch (error) {
      finish(reject, error);
      return;
    }

    Promise.resolve(messagePromise).then(
      (result) => finish(resolve, result),
      (error) => finish(reject, error),
    );
  });
}

// --- Auto-scroll state (follow video playback in transcript) ---
let autoScrollEnabled = true; // True = scroll transcript to follow video playback
let autoScrollInterval = null; // setInterval ID for polling video time
let lastAutoScrollTime = 0; // Timestamp of last programmatic scroll (ignores scroll events within 1s)

// The back-to-top pill only earns its place once the transcript is scrolled
// well past the start; below this it would just clutter the corner.
const BACK_TO_TOP_THRESHOLD_PX = 400;

// ============================================================
// TRANSCRIPT GROUPING
// ============================================================

const TRANSCRIPT_SEGMENT_LIMITS = Object.freeze({
  minChars: 60,
  idealChars: 180,
  maxChars: 320,
  maxSeconds: 20,
});

function normalizeCaptionText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/([\u3400-\u9fff])\s+([\u3400-\u9fff])/g, "$1$2")
    .replace(/([，。；：！？])\s+(?=[\u3400-\u9fff])/g, "$1")
    .replace(/\s+([,.;:!?，。；：！？])/g, "$1")
    .trim();
}

/**
 * Splits a single oversized thought at the strongest nearby punctuation.
 * Word boundaries are the final safety valve for captions with no punctuation.
 */
function splitOversizedThought(text, maxChars) {
  const parts = [];
  let rest = normalizeCaptionText(text);

  while (rest.length > maxChars) {
    const windowText = rest.slice(0, maxChars + 1);
    const lowerBound = Math.floor(maxChars * 0.55);
    let cut = -1;

    for (const pattern of [/[;:；：]\s*/g, /[,，]\s*/g, /\s/g]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(windowText))) {
        if (match.index >= lowerBound) cut = match.index + match[0].length;
      }
      if (cut > 0) break;
    }

    if (cut <= 0) cut = maxChars;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) parts.push(rest);
  return parts;
}

/**
 * Reconstructs complete sentences across raw caption boundaries. Each segment
 * keeps the timestamp of the first caption that contributed text. Character
 * and time limits prevent a malformed Supadata entry from becoming one giant
 * row while punctuation remains the preferred boundary.
 */
function groupTranscriptEntries(entries, limits = TRANSCRIPT_SEGMENT_LIMITS) {
  if (!Array.isArray(entries) || entries.length === 0) return [];

  const pieces = [];
  entries.forEach((entry, entryIndex) => {
    const text = normalizeCaptionText(entry?.text);
    if (!text) return;
    const start = Number.isFinite(Number(entry.start)) ? Number(entry.start) : 0;
    const duration = Math.max(0, Number(entry.duration) || 0);
    const sentenceParts =
      text.match(/[^.!?;:,。！？；：，]+(?:[.!?;:,。！？；：，]+["')\]”’）】」』]*|$)/g) ||
      [text];
    let consumedChars = 0;

    sentenceParts.forEach((sentencePart) => {
      const cleanPart = normalizeCaptionText(sentencePart);
      if (!cleanPart) return;
      const oversizedParts = splitOversizedThought(cleanPart, limits.maxChars);
      oversizedParts.forEach((part, partIndex) => {
        const ratio = text.length ? Math.min(1, consumedChars / text.length) : 0;
        pieces.push({
          text: part,
          start: start + duration * ratio,
          semanticEnd:
            /[.!?。！？]["')\]”’）】」』]*$/.test(part) ||
            oversizedParts.length > 1,
          clauseEnd: /[;:,；：，]["')\]”’）】」』]*$/.test(part),
          sourceOrder: `${entryIndex}:${partIndex}`,
        });
        consumedChars += part.length + 1;
      });
    });
  });

  const grouped = [];
  let current = null;

  const flush = () => {
    if (!current || !current.text.trim()) return;
    const index = grouped.length;
    const text = normalizeCaptionText(current.text);
    grouped.push({
      id: `segment-${index}-${Math.round(current.start * 1000)}`,
      start: current.start,
      text,
      texts: [text],
    });
    current = null;
  };

  pieces.forEach((piece) => {
    if (!current) current = { start: piece.start, text: "" };
    current.text = normalizeCaptionText(`${current.text} ${piece.text}`);
    const elapsed = Math.max(0, piece.start - current.start);
    const comfortablySized = current.text.length >= limits.minChars;
    const reachedIdeal = current.text.length >= limits.idealChars;
    const atNaturalBoundary =
      piece.semanticEnd ||
      (piece.clauseEnd &&
        (reachedIdeal ||
          current.text.length >= limits.maxChars ||
          elapsed >= limits.maxSeconds));
    const reachedGuardrail =
      atNaturalBoundary &&
      (current.text.length >= limits.maxChars || elapsed >= limits.maxSeconds);
    const reachedHardGuardrail =
      current.text.length >= Math.round(limits.maxChars * 1.2) ||
      elapsed >= limits.maxSeconds + 5;

    if (
      (atNaturalBoundary && (comfortablySized || elapsed >= 8)) ||
      (atNaturalBoundary && reachedIdeal) ||
      reachedGuardrail ||
      reachedHardGuardrail
    ) {
      flush();
    }
  });
  flush();

  return grouped;
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await evictOldCacheEntries(20);
  await loadPersistentNoteTranslations();

  // Localize the panel with the interface language chosen in Settings, and
  // keep following it live while the settings page stays open elsewhere.
  await loadPreferredUiLanguage();
  await loadTranslationPreferences();
  chrome.storage?.onChanged?.addListener?.((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes[PREFERRED_LANGUAGE_KEY]) {
      applyUiLanguage(changes[PREFERRED_LANGUAGE_KEY].newValue);
    }
    if (changes[YTD_SETTINGS.STORAGE_KEY]) {
      void loadTranslationPreferences();
    }
  });

  const configStatus = await chrome.runtime.sendMessage({
    action: "checkConfig",
  });

  if (!configStatus.hasSupadataKey || !configStatus.hasAiKey) {
    showConfigError(configStatus);
    return;
  }

  await checkCurrentTab();
});

// Listen for messages from the Digest button on YouTube page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDigestFromButton") {
    // Load the digest for the current video. Served from cache when we've
    // seen this video before (no API calls); fetched fresh otherwise.
    // (This used to force-clear the cache on every click, which silently
    // burned a transcript credit + analysis tokens per click.)
    checkCurrentTab();
    sendResponse({ success: true });
  }
  if (message.action === "transcriptProgress") {
    // Background is telling us the transcript fetch status changed
    updateLoading(message.title, message.subtitle);
    sendResponse({ success: true });
  }
  if (message.action === "noteSaved") {
    // Refresh notes list when a new note is saved
    const filterAll = document
      .getElementById("notesFilterAll")
      ?.classList.contains("active");
    loadNotes(filterAll ? null : currentVideoId);
    sendResponse({ success: true });
  }
  return false;
});

// ============================================================
// FOLLOW THE ACTIVE TAB
// ============================================================
// The panel watches which tab is in front of it and reacts:
//   - Front tab is NOT YouTube  -> the panel closes itself (window.close()).
//     We do this OURSELVES rather than relying only on the background
//     script's per-tab enable/disable, because Chrome doesn't reliably
//     apply per-tab panel state to tabs spawned in unusual ways (e.g. a
//     link opened from another app) — which let the panel linger on
//     non-YouTube pages.
//   - Front tab IS YouTube but on a different video -> refresh the digest.
//     YouTube is a single-page app (clicking a video swaps content without
//     a reload), so we track URL changes; startDigest() caches per video,
//     making re-checks instant and free for already-digested videos.
//
// Everything is scoped to the window this panel lives in: tab switches in
// OTHER browser windows must not close this panel or hijack its content.

let navigationRefreshTimer = null;
let panelWindowId = null;
chrome.windows.getCurrent().then((w) => {
  panelWindowId = w.id;
});

function scheduleDigestRefresh() {
  // Small delay lets YouTube finish rendering the new video's title and
  // description before we read them. Also collapses rapid-fire URL events
  // into a single refresh.
  clearTimeout(navigationRefreshTimer);
  navigationRefreshTimer = setTimeout(() => {
    checkCurrentTab();
  }, 600);
}

function panelIsShowingResults() {
  const results = document.getElementById("resultsState");
  return results && results.style.display !== "none";
}

/**
 * Reacts to the URL now in front of the panel: close on non-YouTube,
 * refresh the digest when the video changed.
 */
function handleFrontTabUrl(url) {
  if (!(url || "").startsWith("https://www.youtube.com")) {
    // Panel is a YouTube-only tool — remove itself from non-YouTube tabs.
    window.close();
    return;
  }

  const newVideoId = extractVideoId(url);
  // Refresh when the video changed, or when we're not currently showing
  // results (e.g. user went home, then clicked back into the same video).
  if (newVideoId !== currentVideoId || !panelIsShowingResults()) {
    scheduleDigestRefresh();
  }
}

// Fires when a tab's URL changes — including YouTube's no-reload navigation.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url || !tab.active) return;
  if (panelWindowId !== null && tab.windowId !== panelWindowId) return;
  handleFrontTabUrl(changeInfo.url);
});

// Fires when a different tab comes to the front — switching tabs, or a new
// tab being opened (including ones opened by clicking links in other apps).
chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  if (panelWindowId !== null && windowId !== panelWindowId) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    // Brand-new tabs may not have committed their URL yet — fall back to
    // the pending one so we judge where the tab is actually going.
    handleFrontTabUrl(tab.url || tab.pendingUrl || "");
  } catch (e) {
    // Tab closed before we could read it — nothing to do.
  }
});

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Error retry
  document.getElementById("errorBtn").addEventListener("click", () => {
    if (errorAction) {
      errorAction();
      return;
    }
    if (currentVideoId) {
      startDigest(currentVideoId, currentVideoUrl);
    }
  });

  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openOptions" });
  });

  // Transcript actions
  document
    .getElementById("copyTranscriptBtn")
    ?.addEventListener("click", copyTranscript);
  document
    .getElementById("exportTranscriptBtn")
    ?.addEventListener("click", exportTranscript);
  document.querySelectorAll(".transcript-mode-btn").forEach((button) => {
    button.addEventListener("click", () => {
      handleTranscriptModeChange(button.dataset.transcriptMode);
    });
  });

  document.querySelectorAll(".overview-mode-btn").forEach((button) => {
    button.addEventListener("click", () => {
      handleOverviewModeChange(button.dataset.overviewMode);
    });
  });

  document.querySelectorAll(".notes-mode-btn").forEach((button) => {
    button.addEventListener("click", () => {
      handleNotesModeChange(button.dataset.notesMode);
    });
  });

  // Follow playback button — re-enables auto-scroll after user scrolled away
  document
    .getElementById("followPlaybackBtn")
    ?.addEventListener("click", () => {
      autoScrollEnabled = true;
      document.getElementById("followPlaybackBtn").style.display = "none";
      // Jump straight back to the line currently being spoken. We scroll
      // directly (not via playbackTrackingTick) because the tick skips
      // entries that are already highlighted — and the current line almost
      // always IS highlighted, which made this button appear to do nothing.
      if (!scrollToActiveEntry()) {
        playbackTrackingTick(); // No highlight yet — let a tick establish one
      }
    });

  // Back-to-top button — appears once the transcript is scrolled far down
  document
    .getElementById("contentArea")
    ?.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
  document.getElementById("backToTopBtn")?.addEventListener("click", () => {
    // Pause auto-scroll first: otherwise the next playback tick (500ms) would
    // highlight the current line and yank the user straight back down.
    if (autoScrollInterval) {
      autoScrollEnabled = false;
      document.getElementById("followPlaybackBtn").style.display = "block";
    }
    // Stamp the scroll as programmatic so our own animation isn't mistaken
    // for the user scrolling away (which would re-trigger the pause above).
    lastAutoScrollTime = Date.now();
    document
      .getElementById("contentArea")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Notes filter buttons
  document.getElementById("notesFilterThis")?.addEventListener("click", () => {
    setNotesFilter(false);
    loadNotes(currentVideoId);
  });
  document.getElementById("notesFilterAll")?.addEventListener("click", () => {
    setNotesFilter(true);
    loadNotes(null); // Load all notes
  });
}

function setNotesFilter(showAll) {
  const thisVideoButton = document.getElementById("notesFilterThis");
  const allNotesButton = document.getElementById("notesFilterAll");
  thisVideoButton?.classList.toggle("active", !showAll);
  thisVideoButton?.setAttribute("aria-pressed", String(!showAll));
  allNotesButton?.classList.toggle("active", showAll);
  allNotesButton?.setAttribute("aria-pressed", String(showAll));
}

// ============================================================
// VIDEO DETECTION
// ============================================================

async function checkCurrentTab(forceReload = false) {
  try {
    // Try multiple strategies to find the YouTube tab
    let tab = null;

    // Strategy 1: Active tab in last focused window
    let tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (tabs[0]?.url?.includes("youtube.com")) {
      tab = tabs[0];
    }

    // Strategy 2: Any active YouTube tab
    if (!tab) {
      tabs = await chrome.tabs.query({
        url: "https://www.youtube.com/*",
        active: true,
      });
      if (tabs[0]) tab = tabs[0];
    }

    // Strategy 3: Any YouTube tab (last resort)
    if (!tab) {
      tabs = await chrome.tabs.query({ url: "https://www.youtube.com/*" });
      if (tabs[0]) tab = tabs[0];
    }

    debugLog("[YouTube Digest Panel] Found tab:", tab?.id, tab?.url);

    if (!tab?.url) {
      showState("welcome");
      return;
    }

    // Store the tab ID for reliable messaging later
    youtubeTabId = tab.id;

    const videoId = extractVideoId(tab.url);

    if (videoId) {
      currentVideoUrl = tab.url;

      try {
        // Route through background script for reliable message passing
        const result = await chrome.runtime.sendMessage({
          action: "relayToContent",
          payload: { action: "getVideoInfo" },
        });
        debugLog("[YouTube Digest Panel] getVideoInfo result:", result);
        if (result.success && result.response) {
          currentVideoTitle = result.response.title || "";
          currentChannelName = result.response.channelName || "";
          currentVideoDescription = result.response.description || "";
          currentVideoDuration = result.response.duration || 0;
        }
      } catch (e) {
        console.error("[YouTube Digest Panel] getVideoInfo error:", e);
        currentVideoTitle = "";
        currentChannelName = "";
        currentVideoDescription = "";
        currentVideoDuration = 0;
      }

      startDigest(videoId, tab.url, forceReload);
    } else {
      showState("welcome");
    }
  } catch (error) {
    console.error("Tab check error:", error);
    showState("welcome");
  }
}

function extractVideoId(url) {
  try {
    const urlObj = new URL(url);

    if (
      urlObj.hostname.includes("youtube.com") &&
      urlObj.searchParams.has("v")
    ) {
      return urlObj.searchParams.get("v");
    }

    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }

    if (urlObj.pathname.startsWith("/embed/")) {
      return urlObj.pathname.split("/")[2];
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================
// DIGEST PIPELINE
// ============================================================

async function startDigest(videoId, videoUrl, forceReload = false) {
  // Check if we already have this video loaded in memory
  if (!forceReload && videoId === currentVideoId && currentAnalysis) {
    showState("results");
    return;
  }

  const requestedSourceLanguage = getSourceLanguage().code;
  const generation = ++digestGeneration;

  // Every video change invalidates observer work and in-flight translations.
  if (forceReload || videoId !== currentVideoId) {
    translationGeneration += 1;
    overviewTranslationGeneration += 1;
    if (transcriptScrollObserver) transcriptScrollObserver.disconnect();
    transcriptScrollObserver = null;
  }

  // Check cache for this video
  const cached = await loadFromCache(videoId, requestedSourceLanguage);
  if (generation !== digestGeneration) return;
  if (cached) {
    debugLog("Loading from cache:", videoId);
    currentVideoId = videoId;
    currentVideoUrl = videoUrl;
    // Older cache entries did not record the language used to generate the
    // overview. Treat those analyses as stale so a previously cached English
    // overview cannot accompany a non-English subtitle track.
    currentAnalysis =
      cached.analysis && cached.analysisSourceLanguage === requestedSourceLanguage
        ? cached.analysis
        : null;
    currentTranscript = cached.transcript;
    currentTranscriptText = cached.transcriptText;
    currentTranscriptTimestamped = cached.transcriptTimestamped;
    currentTranscriptLanguage = cached.transcriptLanguage || null;
    isAnalysisLoading = false;

    // Restore semantic-segment translations from persistent storage.
    if (cached.paragraphCache) {
      for (const [key, value] of Object.entries(cached.paragraphCache)) {
        transcriptParagraphCache.set(key, value);
      }
    }
    // Restore overview (chapters + quotes) translations the same way.
    if (cached.overviewTranslationCache) {
      for (const [key, value] of Object.entries(cached.overviewTranslationCache)) {
        overviewTranslationCache.set(key, value);
      }
    }

    if (currentVideoTitle || currentChannelName) {
      const videoInfo = document.getElementById("videoInfo");
      document.getElementById("videoTitle").textContent = currentVideoTitle;
      document.getElementById("videoChannel").textContent = currentChannelName;
      videoInfo.style.display = "block";
    }

    // Always render transcript first
    renderTranscript();

    // Render analysis if we have it cached
    if (currentAnalysis) {
      renderAnalysisResults(currentAnalysis);
      highlightMomentsOnPage(currentAnalysis.keyMoments);
      if (currentOverviewMode !== "original") translateOverview();
    }

    showState("results");
    document.getElementById("tabsNav").style.display = "flex";

    // Load notes for this video
    loadNotes(videoId);

    // Setup explain feature
    setupExplainFeature();
    if (currentTranscriptMode !== "original") translateTranscript();
    return;
  }

  currentVideoId = videoId;
  currentVideoUrl = videoUrl;
  currentAnalysis = null;
  currentTranscript = null;
  currentTranscriptText = null;
  currentTranscriptTimestamped = null;
  currentTranscriptLanguage = null;
  isAnalysisLoading = false;

  if (currentVideoTitle || currentChannelName) {
    const videoInfo = document.getElementById("videoInfo");
    document.getElementById("videoTitle").textContent = currentVideoTitle;
    document.getElementById("videoChannel").textContent = currentChannelName;
    videoInfo.style.display = "block";
  }

  showState("loading");
  updateLoading(t("loadingText"), "");

  const transcriptResult = await chrome.runtime.sendMessage({
    action: "fetchTranscript",
    videoId: videoId,
  });

  if (generation !== digestGeneration) return;

  if (!transcriptResult.success) {
    if (transcriptResult.error === "NO_SUPADATA_KEY") {
      showError(t("apiKeyMissingTitle"), t("apiKeyMissingMsg"));
      return;
    }
    if (transcriptResult.error === "REQUESTED_LANGUAGE_UNAVAILABLE") {
      showSourceLanguageUnavailableError(transcriptResult.message);
      return;
    }
    showError(
      t("noTranscriptTitle"),
      transcriptResult.message || transcriptResult.error,
    );
    return;
  }

  currentTranscript = transcriptResult.transcript;
  currentTranscriptText = transcriptResult.transcriptText;
  currentTranscriptTimestamped = transcriptResult.transcriptTextTimestamped;
  currentTranscriptLanguage = transcriptResult.language || null;

  // Render transcript immediately (no LLM needed)
  renderTranscript();
  showState("results");
  document.getElementById("tabsNav").style.display = "flex";

  // Load notes for this video
  loadNotes(videoId);

  // Setup explain feature for text selection
  setupExplainFeature();
  if (currentTranscriptMode !== "original") translateTranscript();

  // Save transcript to cache (without analysis)
  await saveToCache(videoId, requestedSourceLanguage);

  // DON'T run LLM analysis automatically - wait for user to click Overview tab
  // This saves tokens when user just wants to see the transcript
}

// ============================================================
// RENDERING
// ============================================================

/**
 * Renders one overview text (chapter title, chapter summary, or quote) for the
 * active overview mode. Pure helper: callers resolve the cached translation
 * and error state by segment key before invoking it.
 */
function renderOverviewSegmentHtml(original, translation, error, mode) {
  if (mode === "original") return escapeHtml(original);

  if (mode === "zh") {
    if (translation) return renderSubtitleInlineMarkup(translation);
    if (error) {
      return `<span class="translation-error">${escapeHtml(error)}</span><button class="translation-retry-btn" type="button">${escapeHtml(t("retry"))}</button>`;
    }
    return `<span class="translation-pending">${escapeHtml(t("waitingTranslation"))}</span>`;
  }

  // Bilingual: original first, Chinese aligned below once it arrives.
  const originalHtml = escapeHtml(original);
  if (translation) {
    return `${originalHtml}<span class="overview-translation">${renderSubtitleInlineMarkup(translation)}</span>`;
  }
  if (error) {
    return `${originalHtml}<span class="overview-translation translation-error">${escapeHtml(error)}<button class="translation-retry-btn" type="button">${escapeHtml(t("retry"))}</button></span>`;
  }
  return originalHtml;
}

/**
 * Retry buttons live inside clickable chapter/quote cards; their pointer
 * events must stay isolated so retrying never seeks the video.
 */
function wireOverviewRetryButtons(container) {
  container.querySelectorAll(".translation-retry-btn").forEach((button) => {
    ["mousedown", "mouseup"].forEach((eventName) => {
      button.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      translateOverview();
    });
  });
}

/**
 * Renders the analysis results into the Overview tab.
 * Shows chapters and key quotes only, in the active overview language mode.
 */
function renderAnalysisResults(analysis) {
  const chapters = analysis.chapters || [];
  const keyQuotes = analysis.keyQuotes || [];

  // Chapters
  const chapterList = document.getElementById("chapterList");
  chapterList.innerHTML = "";
  chapterList.removeAttribute("aria-busy");
  chapters.forEach((chapter, index) => {
    const titleKey = overviewTranslationCacheKey(`chapter-${index}-title`);
    const summaryKey = overviewTranslationCacheKey(`chapter-${index}-summary`);
    const li = document.createElement("li");
    li.className = "chapter-item";
    li.dataset.seconds = chapter.timestampSeconds;
    li.style.setProperty("--reveal-i", `${index * 45}ms`);
    li.innerHTML = `
      <span class="chapter-timestamp">${escapeHtml(chapter.timestamp)}</span>
      <div class="chapter-content">
        <span class="chapter-title">${renderOverviewSegmentHtml(
          chapter.title,
          overviewTranslationCache.get(titleKey),
          overviewSegmentErrors.get(titleKey),
          currentOverviewMode,
        )}</span>
        <span class="chapter-summary">${renderOverviewSegmentHtml(
          chapter.summary || "",
          overviewTranslationCache.get(summaryKey),
          overviewSegmentErrors.get(summaryKey),
          currentOverviewMode,
        )}</span>
      </div>
      ${renderCardCopyButton("chapter-copy-icon")}
    `;
    li.addEventListener("click", () => {
      debugLog(
        "[YouTube Digest Panel] Chapter clicked:",
        chapter.timestamp,
        chapter.timestampSeconds,
      );
      seekTo(chapter.timestampSeconds);
    });
    wireCardCopyButton(li, () => getChapterCopyText(chapter, index));
    wireOverviewRetryButtons(li);
    chapterList.appendChild(li);
  });

  // Quotes - sort by timestamp (chronological order). Segment keys keep the
  // source-array index, so lookups use indexOf rather than the sorted position.
  const quotesList = document.getElementById("quotesList");
  quotesList.innerHTML = "";
  quotesList.removeAttribute("aria-busy");
  const sortedQuotes = [...keyQuotes].sort(
    (a, b) => (a.timestampSeconds || 0) - (b.timestampSeconds || 0),
  );
  sortedQuotes.forEach((quote) => {
    const quoteKey = overviewTranslationCacheKey(
      `quote-${keyQuotes.indexOf(quote)}`,
    );
    const div = document.createElement("div");
    div.className = "quote-item";
    div.dataset.seconds = quote.timestampSeconds;
    div.style.setProperty("--reveal-i", `${sortedQuotes.indexOf(quote) * 45}ms`);
    div.innerHTML = `
      <div class="quote-text">${renderOverviewSegmentHtml(
        quote.quote,
        overviewTranslationCache.get(quoteKey),
        overviewSegmentErrors.get(quoteKey),
        currentOverviewMode,
      )}</div>
      <div class="quote-meta">
        <span class="quote-timestamp">${escapeHtml(quote.timestamp)}</span>
        <div class="quote-actions">
          <button class="quote-save-note-btn" title="${escapeHtml(t("quoteSaveNoteTitle"))}">${escapeHtml(t("quoteNoteAction"))}</button>
          <button class="quote-copy-btn" title="${escapeHtml(t("quoteCopyTitle"))}" aria-label="${escapeHtml(t("quoteCopyTitle"))}">${COPY_ICON_SVG}</button>
        </div>
      </div>
    `;
    div.addEventListener("click", () => {
      debugLog(
        "[YouTube Digest Panel] Quote clicked:",
        quote.timestamp,
        quote.timestampSeconds,
      );
      seekTo(quote.timestampSeconds);
    });

    const quoteCopyBtn = div.querySelector(".quote-copy-btn");
    quoteCopyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(getQuoteCopyText(quote));
        quoteCopyBtn.innerHTML = CHECK_ICON_SVG;
        setTimeout(() => {
          quoteCopyBtn.innerHTML = COPY_ICON_SVG;
        }, 1500);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    });

    const quoteSaveNoteBtn = div.querySelector(".quote-save-note-btn");
    quoteSaveNoteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await saveQuoteAsNote(quote, quoteSaveNoteBtn);
    });

    wireOverviewRetryButtons(div);
    quotesList.appendChild(div);
  });
}

/**
 * Saves a key quote as a timestamped note.
 */
async function saveQuoteAsNote(quote, btn) {
  if (!currentVideoId) return;

  const originalText = btn.textContent;
  btn.textContent = t("saving");
  btn.disabled = true;

  try {
    const result = await chrome.runtime.sendMessage({
      action: "saveNote",
      videoId: currentVideoId,
      timestamp: quote.timestampSeconds,
      videoTitle: currentVideoTitle,
      channelName: currentChannelName,
    });

    if (result.success) {
      btn.textContent = t("saved");
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 1500);
      // Refresh notes list if on Notes tab
      loadNotes(currentVideoId);
    } else {
      console.error("[YouTube Digest] Save quote as note failed:", result.error);
      btn.textContent = t("btnError");
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 1500);
    }
  } catch (error) {
    console.error("[YouTube Digest] Save quote as note error:", error);
    btn.textContent = t("btnError");
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1500);
  }
}

/**
 * Legacy function for backwards compatibility with cached data.
 * Renders both transcript and analysis.
 */
function renderResults(analysis) {
  renderAnalysisResults(analysis);

  renderTranscript();

  document.getElementById("tabsNav").style.display = "flex";

  // Setup explain feature for text selection
  setupExplainFeature();
}

/**
 * Returns true while the user has a range of text selected.
 * Transcript row clicks must not seek in that state: the click emitted after
 * selection mouseup belongs to the selection/explain interaction, not playback.
 */
function hasNonCollapsedTextSelection() {
  const selection = window.getSelection();
  return Boolean(
    selection && selection.rangeCount > 0 && !selection.isCollapsed,
  );
}

/**
 * Preserves normal row-click seeking while keeping text selection inert.
 */
function seekFromTranscriptEntryClick(event, seconds) {
  if (hasNonCollapsedTextSelection()) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  seekTo(seconds);
}

function renderCardCopyButton(extraClass = "") {
  return `<button class="card-copy-icon ${extraClass}" type="button" title="${escapeHtml(t("copyBtn"))}" aria-label="${escapeHtml(t("copyBtn"))}">${COPY_ICON_SVG}</button>`;
}

function wireCardCopyButton(container, getText) {
  const button = container.querySelector(".card-copy-icon");
  if (!button) return;
  ["mousedown", "mouseup"].forEach((eventName) => {
    button.addEventListener(eventName, (event) => event.stopPropagation());
  });
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!(await copyToClipboard(getText()))) return;
    button.innerHTML = CHECK_ICON_SVG;
    button.title = t("copied");
    button.setAttribute("aria-label", t("copied"));
    setTimeout(() => {
      button.innerHTML = COPY_ICON_SVG;
      button.title = t("copyBtn");
      button.setAttribute("aria-label", t("copyBtn"));
    }, 1500);
  });
}

function getOverviewCopyText(original, translation) {
  if (currentOverviewMode === "zh") return translation || original;
  return currentOverviewMode === "bilingual" && translation
    ? `${original}\n${translation}`
    : original;
}

function getChapterCopyText(chapter, index) {
  const title = getOverviewCopyText(
    chapter.title,
    overviewTranslationCache.get(overviewTranslationCacheKey(`chapter-${index}-title`)),
  );
  const summary = String(chapter.summary || "").trim();
  if (!summary) return title;
  return `${title}\n${getOverviewCopyText(
    summary,
    overviewTranslationCache.get(overviewTranslationCacheKey(`chapter-${index}-summary`)),
  )}`;
}

function getQuoteCopyText(quote) {
  const index = (currentAnalysis?.keyQuotes || []).indexOf(quote);
  return getOverviewCopyText(
    quote.quote,
    overviewTranslationCache.get(overviewTranslationCacheKey(`quote-${index}`)),
  );
}

function renderTranscript() {
  if (!currentTranscript) return;

  const transcriptList = document.getElementById("transcriptList");
  transcriptList.innerHTML = "";

  // Show a small badge indicating the transcript came from the video's
  // existing subtitles. (We no longer AI-transcribe audio, so subtitles
  // are the only source.)
  const existingBadge = document.getElementById("transcriptSourceBadge");
  if (existingBadge) existingBadge.remove();

  const badge = document.createElement("div");
  badge.id = "transcriptSourceBadge";
  badge.className = "transcript-source-badge";
  badge.innerHTML = `<span class="source-dot source-dot--subs"></span> ${escapeHtml(t("subtitleBadge", { label: getOriginalTranscriptLabel() }))}`;
  transcriptList.parentElement.insertBefore(badge, transcriptList);

  // Group entries using smart sentence-boundary + time-guardrail logic
  const grouped = groupTranscriptEntries(currentTranscript);

  grouped.forEach((group) => {
    const div = document.createElement("div");
    div.className = "transcript-entry";
    div.dataset.seconds = group.start;

    const minutes = Math.floor(group.start / 60);
    const seconds = Math.floor(group.start % 60);
    const timestamp = `${minutes}:${String(seconds).padStart(2, "0")}`;

    div.innerHTML = `
      <span class="transcript-time">${timestamp}</span>
      <span class="transcript-text">${renderSubtitleInlineMarkup(group.text)}</span>
      ${renderCardCopyButton("transcript-card-copy")}
    `;

    div.addEventListener("click", (event) =>
      seekFromTranscriptEntryClick(event, group.start),
    );
    wireCardCopyButton(div, () => group.text);
    transcriptList.appendChild(div);
  });

  // Start tracking video playback for auto-scroll
  startPlaybackTracking();
}

function copyTranscript() {
  copyToClipboardWithFeedback(currentTranscriptText || "", "copyTranscriptBtn");
}

function exportTranscript() {
  const transcriptContent = currentTranscriptText || "";
  const videoUrl = `https://youtube.com/watch?v=${currentVideoId}`;

  let exportText = "";
  exportText += `TRANSCRIPT\n`;
  exportText += `${"=".repeat(60)}\n\n`;
  exportText += `Title: ${currentVideoTitle || "Unknown"}\n`;
  exportText += `Channel: ${currentChannelName || "Unknown"}\n`;
  exportText += `URL: ${videoUrl}\n`;
  exportText += `\n${"—".repeat(60)}\n\n`;

  if (currentVideoDescription) {
    exportText += `DESCRIPTION:\n${currentVideoDescription}\n`;
    exportText += `\n${"—".repeat(60)}\n\n`;
  }

  exportText += `TRANSCRIPT:\n\n${transcriptContent}\n`;
  exportText += `\n${"—".repeat(60)}\n`;
  exportText += `Exported by YouTube Digest\n`;

  const filename = `${sanitizeFilename(currentVideoTitle)}-transcript.txt`;
  downloadTextFile(exportText, filename);
}

// ============================================================
// UI STATE MANAGEMENT
// ============================================================

function showState(state) {
  document.getElementById("welcomeState").style.display =
    state === "welcome" ? "flex" : "none";
  document.getElementById("loadingState").style.display =
    state === "loading" ? "block" : "none";
  document.getElementById("errorState").style.display =
    state === "error" ? "block" : "none";
  const uploadEl = document.getElementById("uploadState");
  if (uploadEl) uploadEl.style.display = "none"; // Upload state removed — always hidden
  document.getElementById("resultsState").style.display =
    state === "results" ? "block" : "none";

  // The tab bar only belongs on the results view. We toggle it HERE, in one
  // place, so it tracks the view automatically. Previously each caller had to
  // remember to re-show it after showState("results"), and one path forgot —
  // which is why the tabs could vanish when re-opening an already-analyzed video.
  document.getElementById("tabsNav").style.display =
    state === "results" ? "flex" : "none";

  if (state !== "results") {
    stopPlaybackTracking();
  }
  updateBackToTopVisibility();
}

/**
 * Shows the back-to-top pill only while it can actually help: results are on
 * screen, the Transcript tab is the active one, and the transcript has been
 * scrolled past the starting stretch.
 */
function updateBackToTopVisibility() {
  const button = document.getElementById("backToTopBtn");
  if (!button) return;
  const transcriptTabActive = document
    .querySelector(".tab[data-tab='transcript']")
    ?.classList.contains("active");
  const scrolledDown =
    (document.getElementById("contentArea")?.scrollTop || 0) >
    BACK_TO_TOP_THRESHOLD_PX;
  button.style.display =
    transcriptTabActive && panelIsShowingResults() && scrolledDown
      ? "flex"
      : "none";
}

function updateLoading(title, subtitle) {
  document.getElementById("loadingText").textContent = title;
  document.getElementById("loadingSubtext").textContent = subtitle;
}

function showError(title, message) {
  errorAction = null;
  showState("error");
  document.getElementById("errorTitle").textContent = title;
  document.getElementById("errorMessage").textContent = message;
  document.getElementById("errorBtn").textContent = t("errorBtn");
}

function showSourceLanguageUnavailableError(message) {
  showError(t("noTranscriptTitle"), message);
  document.getElementById("errorBtn").textContent = t(
    "switchSourceLanguageToEnglish",
  );
  errorAction = async () => {
    const stored = await chrome.storage.local.get(YTD_SETTINGS.STORAGE_KEY);
    const settings = YTD_SETTINGS.normalize(stored[YTD_SETTINGS.STORAGE_KEY]);
    await chrome.storage.local.set({
      [YTD_SETTINGS.STORAGE_KEY]: { ...settings, sourceLanguage: "en" },
    });
    await loadTranslationPreferences();
  };
}

function showConfigError(configStatus) {
  const missingParts = [];
  if (!configStatus.hasSupadataKey) missingParts.push(t("supadataName"));
  if (!configStatus.hasAiKey) missingParts.push(t("aiProviderName"));

  showState("error");
  document.getElementById("errorTitle").textContent = t("missingKeysTitle");
  document.getElementById("errorMessage").textContent = t(
    "missingKeysMessage",
    {
      missing: missingParts.join(t("listJoiner")),
      plural: missingParts.length === 1 ? "" : "s",
    },
  );
  document.getElementById("errorBtn").textContent = t("openSettings");
  errorAction = () => chrome.runtime.sendMessage({ action: "openOptions" });
}

// ============================================================
// TAB SWITCHING
// ============================================================

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });

  // Start/stop playback tracking based on which tab is active
  if (tabName === "transcript") {
    startPlaybackTracking();
  } else {
    stopPlaybackTracking();
  }

  // Lazy-load LLM analysis when user switches to Overview tab
  if (tabName === "overview" && !currentAnalysis && !isAnalysisLoading) {
    triggerAnalysis();
  }

  updateBackToTopVisibility();
}

/**
 * Triggers the LLM analysis (lazy-loaded when user clicks Overview or Quotes tab).
 * This saves tokens by not running analysis until needed.
 */
async function triggerAnalysis() {
  if (!currentTranscriptTimestamped || isAnalysisLoading || currentAnalysis)
    return;

  isAnalysisLoading = true;
  const generation = digestGeneration;
  const sourceLanguage = getSourceLanguage().code;

  // Show loading skeletons in the Overview tab — chapter-shaped and
  // quote-shaped cards that preview the layout the analysis will fill in.
  const chapterList = document.getElementById("chapterList");
  const quotesList = document.getElementById("quotesList");

  const chapterSkeleton = (delay) => `
    <li class="skeleton-card" style="animation-delay: ${delay}ms" aria-hidden="true">
      <div class="skeleton-card__body">
        <div class="skeleton-line skeleton-line--title"></div>
        <div class="skeleton-line skeleton-line--summary"></div>
      </div>
    </li>`;
  const quoteSkeleton = `
    <div class="skeleton-card skeleton-card--quote" aria-hidden="true">
      <div class="skeleton-line skeleton-line--quote-text"></div>
      <div class="skeleton-line skeleton-line--quote-meta"></div>
    </div>`;

  if (chapterList) {
    chapterList.innerHTML =
      chapterSkeleton(0) + chapterSkeleton(90) + chapterSkeleton(180);
    chapterList.setAttribute("aria-busy", "true");
  }
  if (quotesList) {
    quotesList.innerHTML = quoteSkeleton + quoteSkeleton;
    quotesList.setAttribute("aria-busy", "true");
  }

  try {
    const analysisResult = await chrome.runtime.sendMessage({
      action: "analyzeTranscript",
      transcriptText: currentTranscriptTimestamped,
      videoTitle: currentVideoTitle,
      channelName: currentChannelName,
      videoDescription: currentVideoDescription,
      videoDuration: currentVideoDuration,
    });

    // A source-language change starts a new digest request. Never let an
    // older analysis (often English) overwrite the newly requested track.
    if (
      generation !== digestGeneration ||
      sourceLanguage !== getSourceLanguage().code
    ) {
      return;
    }

    if (!analysisResult.success) {
      if (chapterList)
        chapterList.innerHTML = `<li class="list-status list-status--error">${escapeHtml(t("analysisFailed", { error: analysisResult.error || "Unknown error" }))}</li>`;
      if (chapterList) chapterList.removeAttribute("aria-busy");
      if (quotesList) {
        quotesList.innerHTML = "";
        quotesList.removeAttribute("aria-busy");
      }
      isAnalysisLoading = false;
      return;
    }

    currentAnalysis = analysisResult.analysis;
    renderAnalysisResults(currentAnalysis);
    highlightMomentsOnPage(currentAnalysis.keyMoments);
    if (currentOverviewMode !== "original") translateOverview();

    // Save to cache now that we have analysis
    await saveToCache(currentVideoId);
  } catch (error) {
    console.error("[YouTube Digest Panel] Analysis error:", error);
    if (chapterList) {
      chapterList.innerHTML = `<li class="list-status list-status--error">${escapeHtml(t("analysisError", { error: error.message }))}</li>`;
      chapterList.removeAttribute("aria-busy");
    }
    if (quotesList) {
      quotesList.innerHTML = "";
      quotesList.removeAttribute("aria-busy");
    }
  }

  if (generation === digestGeneration) isAnalysisLoading = false;
}

// ============================================================
// TIMESTAMP / SEEK
// ============================================================

async function seekTo(seconds) {
  debugLog("[YouTube Digest Panel] seekTo called with:", seconds);
  if (seconds === undefined || seconds === null) {
    debugLog("[YouTube Digest Panel] seekTo aborted - no seconds value");
    return;
  }

  const payload = {
    action: "seekTo",
    seconds: Number(seconds),
  };

  try {
    // Try direct messaging to the stored YouTube tab first (fastest/reliable)
    if (youtubeTabId) {
      try {
        await chrome.tabs.sendMessage(youtubeTabId, payload);
        debugLog("[YouTube Digest Panel] seekTo direct success");
        return;
      } catch (directErr) {
        debugLog(
          "[YouTube Digest Panel] Direct seekTo failed, falling back to relay:",
          directErr.message,
        );
      }
    }

    // Fallback: route through background script
    const result = await chrome.runtime.sendMessage({
      action: "relayToContent",
      payload,
    });
    debugLog("[YouTube Digest Panel] seekTo relay result:", result);
  } catch (error) {
    console.error("[YouTube Digest Panel] seekTo error:", error);
  }
}

/**
 * Plays a saved note at its timestamp.
 * - If the note belongs to the video currently open, we seek the player in place.
 * - If it belongs to a DIFFERENT video (e.g. viewing "All Notes"), seeking the
 *   current player would jump to the wrong content, so we open that video in a
 *   new tab at the right timestamp instead.
 */
function playNote(note) {
  if (note.videoId && note.videoId === currentVideoId) {
    seekTo(note.timestampSeconds);
  } else {
    // note.timestampedUrl already includes the &t=<seconds>s anchor
    chrome.tabs.create({ url: note.timestampedUrl });
  }
}

async function highlightMomentsOnPage(moments) {
  if (!moments || !moments.length) return;

  try {
    // Route through background script for reliable message passing
    await chrome.runtime.sendMessage({
      action: "relayToContent",
      payload: {
        action: "highlightMoments",
        moments: moments,
        videoDuration: currentVideoDuration,
      },
    });
  } catch (error) {
    console.error("Highlight error:", error);
  }
}

// ============================================================
// UTILITY
// ============================================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

/**
 * Renders the small subset of inline formatting commonly present in subtitle
 * tracks and model translations. Everything is escaped first; only exact,
 * attribute-free allowlisted tags are restored as markup afterwards.
 */
function renderSubtitleInlineMarkup(text) {
  return escapeHtml(text).replace(
    /&lt;(\/?)(i|em|b|strong|u)&gt;|&lt;br(?:\s*\/)?&gt;/gi,
    (_match, closing, tagName) =>
      tagName ? `<${closing}${tagName.toLowerCase()}>` : "<br>",
  );
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Copy failed:", error);
    return false;
  }
}

async function copyToClipboardWithFeedback(text, buttonId) {
  const btn = document.getElementById(buttonId);
  const original = btn.textContent;

  const success = await copyToClipboard(text);
  if (success) {
    btn.textContent = t("copied");
    setTimeout(() => {
      btn.textContent = original;
    }, 2000);
  }
}

function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(str) {
  return (str || "untitled")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50)
    .toLowerCase();
}

// ============================================================
// TEXT SELECTION — EXPLAIN FEATURE
// ============================================================

/**
 * Sets up text selection handling in the transcript.
 * When user selects text, shows an "Explain" button.
 */
function setupExplainFeature() {
  const transcriptList = document.getElementById("transcriptList");
  if (!transcriptList) return;

  // Remove existing tooltip if any
  const existingTooltip = document.getElementById("explainTooltip");
  if (existingTooltip) existingTooltip.remove();

  // Create the explain tooltip/button
  const tooltip = document.createElement("div");
  tooltip.id = "explainTooltip";
  tooltip.className = "explain-tooltip";
  tooltip.innerHTML = `<button class="explain-btn">${escapeHtml(t("explainAction"))}</button>`;
  tooltip.style.display = "none";
  document.body.appendChild(tooltip);

  let selectedText = "";

  // Interacting with Explain must preserve the transcript selection and stay
  // isolated from document/row click behavior.
  tooltip.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  tooltip.addEventListener("mouseup", (event) => {
    event.stopPropagation();
  });
  tooltip.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  // Listen for text selection
  document.addEventListener("mouseup", (e) => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    // Only show if selecting within transcript
    const isInTranscript = transcriptList.contains(selection.anchorNode);

    // Allow any selection length (removed 10+ char requirement)
    if (text.length > 0 && isInTranscript) {
      selectedText = text;

      // Position the tooltip near the selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      tooltip.style.display = "block";
      tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
    } else {
      tooltip.style.display = "none";
    }
  });

  // Hide tooltip when clicking elsewhere
  document.addEventListener("mousedown", (e) => {
    if (!tooltip.contains(e.target)) {
      tooltip.style.display = "none";
    }
  });

  // Handle explain button click
  tooltip
    .querySelector(".explain-btn")
    .addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!selectedText) return;

      tooltip.style.display = "none";
      await showExplanation(selectedText);
    });
}

/**
 * Shows the explanation modal and fetches it from the configured AI provider.
 */
async function showExplanation(selectedText) {
  // Create modal
  const modal = document.createElement("div");
  modal.id = "explainModal";
  modal.className = "explain-modal-overlay";
  modal.innerHTML = `
    <div class="explain-modal">
      <div class="explain-modal-header">
        <div class="explain-modal-title">${escapeHtml(t("explainTitle"))}</div>
        <button class="explain-modal-close" id="closeExplain">✕</button>
      </div>
      <div class="explain-selected-text">"${escapeHtml(selectedText.substring(0, 200))}${selectedText.length > 200 ? "..." : ""}"</div>
      <div class="explain-modal-content" id="explanationContent">
        <div class="explain-loading">
          <div class="loading-bar"></div>
          <span>${escapeHtml(t("analyzing"))}</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  document
    .getElementById("closeExplain")
    .addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  // Get some context around the selection from the transcript
  const transcriptContext = getTranscriptContext(selectedText);

  // Fetch explanation
  try {
    const result = await chrome.runtime.sendMessage({
      action: "explainSelection",
      selectedText: selectedText,
      transcriptContext: transcriptContext,
      videoTitle: currentVideoTitle,
    });

    const contentDiv = document.getElementById("explanationContent");
    if (result.success) {
      contentDiv.innerHTML = `<div class="explain-text">${escapeHtml(result.explanation).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</div>`;
    } else {
      contentDiv.innerHTML = `<div class="explain-error">${escapeHtml(t("explainFailed", { error: result.error }))}</div>`;
    }
  } catch (error) {
    const contentDiv = document.getElementById("explanationContent");
    contentDiv.innerHTML = `<div class="explain-error">${escapeHtml(t("explainError", { error: error.message }))}</div>`;
  }
}

/**
 * Gets surrounding context from the transcript for the selected text.
 */
function getTranscriptContext(selectedText) {
  const fullText = currentTranscriptText || "";
  const index = fullText.indexOf(selectedText);

  if (index === -1) return "";

  // Get 200 chars before and after
  const start = Math.max(0, index - 200);
  const end = Math.min(fullText.length, index + selectedText.length + 200);

  return fullText.substring(start, end);
}

// ============================================================
// CACHING
// ============================================================

/**
 * Saves the current digest results to persistent local storage.
 * Results survive browser restarts — reopening the same video loads from cache
 * without consuming API tokens or Supadata calls.
 * Cache expires after 30 days. Oldest entries evicted when > 20 videos cached.
 */
function getDigestCacheKey(videoId, sourceLanguage = getSourceLanguage().code) {
  return `digest_${videoId}:${sourceLanguage}`;
}

async function saveToCache(videoId, sourceLanguage = getSourceLanguage().code) {
  if (!videoId || !currentTranscript) return;

  try {
    // Persist semantic-segment translations for this video.
    const paragraphCacheForVideo = {};
    for (const [key, value] of transcriptParagraphCache.entries()) {
      if (key.startsWith(`${videoId}:`)) {
        paragraphCacheForVideo[key] = value;
      }
    }

    // Persist overview (chapters + quotes) translations for this video.
    const overviewTranslationsForVideo = {};
    for (const [key, value] of overviewTranslationCache.entries()) {
      if (key.startsWith(`${videoId}:`)) {
        overviewTranslationsForVideo[key] = value;
      }
    }

    const cacheData = {
      analysis: currentAnalysis, // May be null if not yet analyzed
      analysisSourceLanguage: currentAnalysis ? sourceLanguage : null,
      transcript: currentTranscript,
      transcriptText: currentTranscriptText,
      transcriptTimestamped: currentTranscriptTimestamped,
      transcriptLanguage: currentTranscriptLanguage,
      videoTitle: currentVideoTitle,
      channelName: currentChannelName,
      paragraphCache: paragraphCacheForVideo,
      overviewTranslationCache: overviewTranslationsForVideo,
      sourceLanguage,
      timestamp: Date.now(),
    };

    await chrome.storage.local.set({ [getDigestCacheKey(videoId, sourceLanguage)]: cacheData });
    debugLog(
      "Saved to cache:",
      videoId,
      currentAnalysis ? "(with analysis)" : "(transcript only)",
    );

    // Evict old entries if we have more than 20 videos cached
    await evictOldCacheEntries(20);
  } catch (error) {
    console.error("Cache save error:", error);
  }
}

/**
 * Keeps the cache from growing unbounded.
 * Removes the oldest entries when we exceed maxEntries videos.
 *
 * @param {number} maxEntries - Maximum number of cached videos to keep
 */
async function evictOldCacheEntries(maxEntries) {
  try {
    const allData = await chrome.storage.local.get(null);
    let digestKeys = Object.keys(allData).filter((k) =>
      k.startsWith("digest_"),
    );
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const expired = digestKeys.filter((key) => {
      const timestamp = Number(allData[key]?.timestamp) || 0;
      return Date.now() - timestamp > THIRTY_DAYS;
    });
    if (expired.length) {
      await chrome.storage.local.remove(expired);
      const expiredSet = new Set(expired);
      digestKeys = digestKeys.filter((key) => !expiredSet.has(key));
    }

    if (digestKeys.length <= maxEntries) return;

    // Sort by timestamp (oldest first) and remove excess
    const sorted = digestKeys
      .map((k) => ({ key: k, ts: allData[k]?.timestamp || 0 }))
      .sort((a, b) => a.ts - b.ts);

    const toRemove = sorted
      .slice(0, sorted.length - maxEntries)
      .map((e) => e.key);
    if (toRemove.length > 0) {
      await chrome.storage.local.remove(toRemove);
      debugLog(`[YouTube Digest] Evicted ${toRemove.length} old cache entries`);
    }
  } catch (error) {
    console.error("Cache eviction error:", error);
  }
}

/**
 * Loads digest results from persistent local storage.
 * Returns null if not cached or expired (30-day expiry).
 */
async function loadFromCache(videoId, sourceLanguage = getSourceLanguage().code) {
  if (!videoId) return null;

  try {
    const cacheKey = getDigestCacheKey(videoId, sourceLanguage);
    const result = await chrome.storage.local.get(cacheKey);
    const cached = result[cacheKey];

    if (!cached) return null;

    // Cache expires after 30 days
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - cached.timestamp > THIRTY_DAYS) {
      await chrome.storage.local.remove(cacheKey);
      return null;
    }

    return cached;
  } catch (error) {
    console.error("Cache load error:", error);
    return null;
  }
}

/**
 * Updates the cache after enhance or translation operations.
 */
async function updateCache() {
  if (currentVideoId) {
    await saveToCache(currentVideoId);
  }
}

// ============================================================
// NOTES
// ============================================================

/**
 * Loads and renders notes from storage.
 * @param {string|null} videoId - Filter by video ID, or null for all notes
 */
async function loadNotes(videoId) {
  try {
    const result = await chrome.runtime.sendMessage({
      action: "getNotes",
      videoId: videoId,
    });

    if (result.success) {
      currentNotes = result.notes || [];
      currentNotesFilteredVideoId = videoId;
      renderNotes(result.notes, videoId);
      if (currentNotesMode !== "original") translateNotes();
    }
  } catch (error) {
    console.error("[YouTube Digest Panel] Load notes error:", error);
  }
}

/**
 * Renders the notes list in the Notes tab.
 */
/**
 * Copy buttons in the notes list keep their text labels (they distinguish
 * "copy text" from "copy timestamp"); the icon leads the label and flips to
 * a checkmark while the copied feedback is showing.
 */
function noteCopyButtonContent(icon, label) {
  return `${icon}<span>${escapeHtml(label)}</span>`;
}

function renderNotes(notes, filteredVideoId) {
  const notesList = document.getElementById("notesList");
  const notesIntro = document.getElementById("notesIntro");

  if (!notesList) return;

  notesList.innerHTML = "";

  if (!notes || notes.length === 0) {
    notesIntro.style.display = "block";
    notesIntro.textContent = filteredVideoId
      ? t("notesEmptyThis")
      : t("notesEmptyAll");
    return;
  }

  notesIntro.style.display = "none";

  notes.forEach((note, index) => {
    const noteEl = document.createElement("div");
    noteEl.className = "note-item";
    noteEl.style.setProperty("--reveal-i", `${index * 45}ms`);
    noteEl.innerHTML = `
      <div class="note-header">
        <span class="note-timestamp" data-url="${escapeHtml(note.timestampedUrl)}" data-seconds="${Number(note.timestampSeconds) || 0}">${escapeHtml(note.timestamp)}</span>
        ${!filteredVideoId ? `<span class="note-video-title">${escapeHtml(note.videoTitle)}</span>` : ""}
        <button class="note-delete" data-id="${escapeHtml(note.id)}" title="${escapeHtml(t("noteDeleteTitle"))}">✕</button>
      </div>
      <div class="note-text">${renderNoteText(note)}</div>
      <div class="note-actions">
        <button class="note-action-btn note-copy-text">${noteCopyButtonContent(COPY_ICON_SVG, t("noteCopyText"))}</button>
        <button class="note-action-btn note-copy-link" data-url="${escapeHtml(note.timestampedUrl)}">${noteCopyButtonContent(COPY_ICON_SVG, t("noteCopyLink"))}</button>
        <button class="note-action-btn note-play" data-seconds="${Number(note.timestampSeconds) || 0}">${escapeHtml(t("notePlay"))}</button>
      </div>
    `;

    // Timestamp click - play from this point (in this tab or a new one)
    noteEl.querySelector(".note-timestamp").addEventListener("click", () => {
      playNote(note);
    });

    // Delete button
    noteEl
      .querySelector(".note-delete")
      .addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteNote(note.id);
        loadNotes(filteredVideoId);
      });

    wireNoteRetryButtons(noteEl);

    // Copy text button copies the currently selected language when it exists.
    noteEl
      .querySelector(".note-copy-text")
      .addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(getNoteCopyText(note));
          const btn = noteEl.querySelector(".note-copy-text");
          btn.innerHTML = CHECK_ICON_SVG;
          setTimeout(() => {
            btn.innerHTML = noteCopyButtonContent(COPY_ICON_SVG, t("noteCopyText"));
          }, 2000);
        } catch (err) {
          console.error("Copy failed:", err);
        }
      });

    // Copy timestamp button — copies the timestamped YouTube link
    noteEl
      .querySelector(".note-copy-link")
      .addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(note.timestampedUrl);
          const btn = noteEl.querySelector(".note-copy-link");
          btn.innerHTML = CHECK_ICON_SVG;
          setTimeout(() => {
            btn.innerHTML = noteCopyButtonContent(COPY_ICON_SVG, t("noteCopyLink"));
          }, 2000);
        } catch (err) {
          console.error("Copy failed:", err);
        }
      });

    // Play button (in this tab if it's the current video, else a new tab)
    noteEl.querySelector(".note-play").addEventListener("click", () => {
      playNote(note);
    });

    notesList.appendChild(noteEl);
  });
}

function noteTranslationCacheKey(note) {
  return `${note.id}:${getSourceLanguage().code}:${getTargetLanguage().code}:note`;
}

function getFreshNoteTranslations(stored, now = Date.now()) {
  if (!stored || typeof stored !== "object") return [];
  return Object.entries(stored).flatMap(([key, entry]) => {
    const text = typeof entry?.text === "string" ? entry.text.trim() : "";
    const timestamp = Number(entry?.timestamp);
    if (!text || !Number.isFinite(timestamp) || now - timestamp > TRANSLATION_CACHE_TTL_MS) {
      return [];
    }
    return [[key, { text, timestamp }]];
  });
}

async function loadPersistentNoteTranslations() {
  try {
    const result = await chrome.storage.local.get(NOTE_TRANSLATION_CACHE_STORAGE_KEY);
    const stored = result[NOTE_TRANSLATION_CACHE_STORAGE_KEY];
    const fresh = getFreshNoteTranslations(stored);
    notesTranslationCache = new Map(fresh.map(([key, entry]) => [key, entry.text]));
    notesTranslationTimestamps = new Map(
      fresh.map(([key, entry]) => [key, entry.timestamp]),
    );
    if (Object.keys(stored || {}).length !== fresh.length) {
      await persistNoteTranslations();
    }
  } catch (error) {
    console.error("[YouTube Digest Panel] Load note translation cache error:", error);
  }
}

async function persistNoteTranslations() {
  try {
    const now = Date.now();
    const stored = Object.fromEntries(
      [...notesTranslationCache.entries()].flatMap(([key, text]) => {
        const timestamp = notesTranslationTimestamps.get(key);
        if (!text || !Number.isFinite(timestamp) || now - timestamp > TRANSLATION_CACHE_TTL_MS) {
          return [];
        }
        return [[key, { text, timestamp }]];
      }),
    );
    await chrome.storage.local.set({ [NOTE_TRANSLATION_CACHE_STORAGE_KEY]: stored });
  } catch (error) {
    console.error("[YouTube Digest Panel] Save note translation cache error:", error);
  }
}

function setNotesModeButtons(mode) {
  document.querySelectorAll(".notes-mode-btn").forEach((button) => {
    const active = button.dataset.notesMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setNotesTranslatingSpinner(show) {
  if (show) notesTranslationWorkCount += 1;
  else notesTranslationWorkCount = Math.max(0, notesTranslationWorkCount - 1);
  const spinner = document.getElementById("notesLangSpinner");
  if (spinner) spinner.classList.toggle("visible", notesTranslationWorkCount > 0);
}

function renderNoteText(note) {
  const cacheKey = noteTranslationCacheKey(note);
  return renderNoteTranslationContent(
    note,
    currentNotesMode,
    notesTranslationCache.get(cacheKey),
    noteTranslationErrors.get(cacheKey),
  );
}

function renderNoteTranslationContent(note, mode, translated, error) {
  const original = `&quot;${escapeHtml(note.text)}&quot;`;
  if (mode === "original") return original;

  const translatedHtml = translated
    ? renderSubtitleInlineMarkup(translated)
    : error
      ? `${escapeHtml(error)}<button class="translation-retry-btn" type="button">${escapeHtml(t("retry"))}</button>`
      : escapeHtml(t("waitingTranslation"));
  const stateClass = translated
    ? ""
    : error
      ? "translation-error"
      : "translation-pending";

  if (mode === "zh") {
    return `<span class="note-translation ${stateClass}">${translatedHtml}</span>`;
  }
  return `<span class="note-original">${original}</span><span class="note-translation ${stateClass}">${translatedHtml}</span>`;
}

function getNoteCopyText(note) {
  const translated = notesTranslationCache.get(noteTranslationCacheKey(note));
  return currentNotesMode === "original" || !translated ? note.text : translated;
}

function wireNoteRetryButtons(noteEl) {
  noteEl.querySelectorAll(".translation-retry-btn").forEach((button) => {
    ["mousedown", "mouseup"].forEach((eventName) => {
      button.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      translateNotes();
    });
  });
}

async function handleNotesModeChange(mode) {
  if (!['original', 'zh', 'bilingual'].includes(mode) || mode === currentNotesMode) return;
  currentNotesMode = mode;
  notesTranslationGeneration += 1;
  notesTranslationWorkCount = 0;
  setNotesTranslatingSpinner(false);
  setNotesModeButtons(mode);
  renderNotes(currentNotes, currentNotesFilteredVideoId);
  if (mode !== "original") await translateNotes();
}

async function requestNoteTranslation(note, generation) {
  try {
    const result = await sendTranslationMessage({
      action: "translateContent",
      content: { segments: [{ id: note.id, text: note.text }] },
      contentType: "transcriptBatch",
      targetLanguage: getTargetLanguage().code,
      videoTitle: note.videoTitle || currentVideoTitle,
    });
    if (generation !== notesTranslationGeneration) return;
    const [translated] = alignTranslatedSegmentBatch(
      [{ id: note.id, text: note.text }],
      result?.success ? result.translatedContent?.segments : [],
    );
    const cacheKey = noteTranslationCacheKey(note);
    if (translated.text) {
      notesTranslationCache.set(cacheKey, translated.text);
      notesTranslationTimestamps.set(cacheKey, Date.now());
      noteTranslationErrors.delete(cacheKey);
      await persistNoteTranslations();
    } else {
      noteTranslationErrors.set(
        cacheKey,
        result?.error || translated.error || t("translationFailed"),
      );
    }
  } catch (error) {
    if (generation !== notesTranslationGeneration) return;
    noteTranslationErrors.set(
      noteTranslationCacheKey(note),
      error.message || t("translationFailed"),
    );
  }
  if (generation === notesTranslationGeneration) {
    renderNotes(currentNotes, currentNotesFilteredVideoId);
  }
}

async function translateNotes() {
  if (currentNotesMode === "original" || !currentNotes.length) return;

  notesTranslationGeneration += 1;
  const generation = notesTranslationGeneration;
  currentNotes.forEach((note) => noteTranslationErrors.delete(noteTranslationCacheKey(note)));
  renderNotes(currentNotes, currentNotesFilteredVideoId);
  const pending = currentNotes.filter(
    (note) => !notesTranslationCache.has(noteTranslationCacheKey(note)),
  );
  if (!pending.length) return;

  setNotesTranslatingSpinner(true);
  try {
    let nextIndex = 0;
    const translateNext = async () => {
      while (generation === notesTranslationGeneration) {
        const note = pending[nextIndex];
        nextIndex += 1;
        if (!note) return;
        await requestNoteTranslation(note, generation);
      }
    };
    const workerCount = Math.min(OVERVIEW_TRANSLATION_CONCURRENCY, pending.length);
    await Promise.all(Array.from({ length: workerCount }, translateNext));
  } finally {
    setNotesTranslatingSpinner(false);
  }
}

/**
 * Deletes a note by ID.
 */
async function deleteNote(noteId) {
  try {
    await chrome.runtime.sendMessage({
      action: "deleteNote",
      noteId: noteId,
    });
  } catch (error) {
    console.error("[YouTube Digest Panel] Delete note error:", error);
  }
}

// ============================================================
// AUTO-SCROLL — Follow video playback in transcript
// ============================================================
// While a video plays, the transcript automatically scrolls to show which
// 30-second chunk is currently being spoken. If the user manually scrolls
// (e.g., to read ahead), auto-scroll pauses and a "Follow playback" button
// appears so they can resume it. Highlight always stays active regardless.

/**
 * Starts polling the video's current time and highlighting/scrolling
 * to the matching transcript entry.
 */
function startPlaybackTracking() {
  if (!currentTranscript || !currentTranscript.length) return;

  // Don't restart if already tracking (preserves user's auto-scroll state)
  if (autoScrollInterval) return;

  autoScrollEnabled = true;
  document.getElementById("followPlaybackBtn").style.display = "none";

  // Poll video time every 500ms
  autoScrollInterval = setInterval(() => playbackTrackingTick(), 500);

  // Listen for manual scrolls on the content area
  const contentArea = document.getElementById("contentArea");
  contentArea.removeEventListener("scroll", onContentAreaScroll);
  contentArea.addEventListener("scroll", onContentAreaScroll);
}

/**
 * Stops playback tracking entirely. Called when leaving transcript tab,
 * starting a new digest, or leaving results state.
 */
function stopPlaybackTracking() {
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
  autoScrollEnabled = true; // Reset for next time
  lastAutoScrollTime = 0;
  document.getElementById("followPlaybackBtn").style.display = "none";

  // Remove active highlights
  document
    .querySelectorAll(".transcript-entry.active-playback")
    .forEach((el) => {
      el.classList.remove("active-playback");
    });
}

/**
 * One tick of the playback tracker. Gets current video time from the
 * YouTube tab and highlights + scrolls to the matching transcript entry.
 */
async function playbackTrackingTick() {
  try {
    const result = await chrome.runtime.sendMessage({
      action: "relayToContent",
      payload: { action: "getCurrentTime" },
    });

    if (!result.success || !result.response) return;

    const currentTime = result.response.currentTime || 0;
    highlightActiveEntry(currentTime);
  } catch (error) {
    // Silently ignore — YouTube tab might be closed or navigated away
  }
}

/**
 * Scrolls the transcript to the entry currently being spoken (the one
 * carrying the active-playback highlight). Returns false if nothing is
 * highlighted yet. Stamps lastAutoScrollTime BEFORE scrolling so the scroll
 * events from our own smooth animation aren't mistaken for the user
 * scrolling away (which would re-disable auto-scroll immediately).
 */
function scrollToActiveEntry() {
  const activeEntry = document.querySelector(
    "#transcriptList .transcript-entry.active-playback",
  );
  if (!activeEntry) return false;

  lastAutoScrollTime = Date.now();
  activeEntry.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

/**
 * Finds the transcript entry matching the current playback time,
 * highlights it, and scrolls to it (if auto-scroll is enabled).
 *
 * @param {number} currentSeconds - Current video playback time in seconds
 */
function highlightActiveEntry(currentSeconds) {
  const transcriptList = document.getElementById("transcriptList");
  if (!transcriptList) return;

  const entries = transcriptList.querySelectorAll(".transcript-entry");
  if (entries.length === 0) return;

  // Find the entry whose time range contains the current playback time
  let activeEntry = null;
  entries.forEach((entry, index) => {
    const entrySeconds = parseInt(entry.dataset.seconds);
    const nextEntry = entries[index + 1];
    const nextSeconds = nextEntry
      ? parseInt(nextEntry.dataset.seconds)
      : Infinity;

    if (currentSeconds >= entrySeconds && currentSeconds < nextSeconds) {
      activeEntry = entry;
    }
  });

  if (!activeEntry) return;

  // Skip if this entry is already highlighted (no DOM thrashing)
  if (activeEntry.classList.contains("active-playback")) return;

  // Remove old highlight, add new one
  entries.forEach((e) => e.classList.remove("active-playback"));
  activeEntry.classList.add("active-playback");

  // Only scroll if auto-scroll is enabled
  if (autoScrollEnabled) {
    lastAutoScrollTime = Date.now();
    activeEntry.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * Scroll event handler for the content area.
 * Detects manual scrolling and disables auto-scroll so the user
 * can read at their own pace without being yanked back.
 */
function onContentAreaScroll() {
  // Ignore scroll events within 1 second of a programmatic scroll
  // (smooth scroll animations can last longer than a simple boolean flag)
  if (Date.now() - lastAutoScrollTime < 1000) return;

  // User scrolled manually — disable auto-scroll and show the button
  if (autoScrollEnabled && autoScrollInterval) {
    autoScrollEnabled = false;
    document.getElementById("followPlaybackBtn").style.display = "block";
  }
}

// ============================================================
// TRANSCRIPT MODE UI — Original / Chinese / aligned bilingual
// ============================================================

function getOriginalTranscriptLabel() {
  return getSourceLanguage().nativeName;
}

function getActiveTranscriptSegments() {
  return groupTranscriptEntries(currentTranscript || []);
}

function transcriptTranslationCacheKey(
  segment,
  sourceLanguage = getSourceLanguage().code,
  targetLanguage = getTargetLanguage().code,
) {
  return `${currentVideoId}:${sourceLanguage}:${targetLanguage}:semantic:${segment.id}`;
}

function setTranscriptModeButtons(mode) {
  document.querySelectorAll(".transcript-mode-btn").forEach((button) => {
    const active = button.dataset.transcriptMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

async function handleTranscriptModeChange(mode) {
  if (!["original", "zh", "bilingual"].includes(mode)) return;
  if (mode === currentTranscriptMode) return;

  currentTranscriptMode = mode;
  translationGeneration += 1;
  translationWorkCount = 0;
  setTranslatingSpinner(false);
  if (transcriptScrollObserver) transcriptScrollObserver.disconnect();
  transcriptScrollObserver = null;
  setTranscriptModeButtons(mode);

  if (mode === "original") {
    renderTranscript();
    return;
  }

  await translateTranscript();
}

function renderTranscriptSegmentContent(segment, mode, translated, error) {
  const original = renderSubtitleInlineMarkup(segment.text);
  let translationHtml = "";
  if (translated) {
    translationHtml = renderSubtitleInlineMarkup(translated);
  } else if (error) {
    translationHtml = `${escapeHtml(error)}<button class="translation-retry-btn" type="button">${escapeHtml(t("retry"))}</button>`;
  } else {
    translationHtml = escapeHtml(t("waitingTranslation"));
  }

  if (mode === "bilingual") {
    return `<span class="transcript-copy"><span class="transcript-original">${original}</span><span class="transcript-translation ${translated ? "" : error ? "translation-error" : "translation-pending"}">${translationHtml}</span></span>`;
  }

  return `<span class="transcript-copy"><span class="transcript-translation ${translated ? "" : error ? "translation-error" : "translation-pending"}">${translationHtml}</span></span>`;
}

function renderTranscriptModeRows(segments, mode) {
  const transcriptList = document.getElementById("transcriptList");
  if (!transcriptList) return [];
  transcriptList.innerHTML = "";

  const existingBadge = document.getElementById("transcriptSourceBadge");
  if (existingBadge) existingBadge.remove();
  const badge = document.createElement("div");
  badge.id = "transcriptSourceBadge";
  badge.className = "transcript-source-badge";
  const originalLabel = getOriginalTranscriptLabel();
  const modeLabel =
    mode === "bilingual"
      ? t("bilingualBadge", {
          source: getSourceLanguage().nativeName,
          target: getTargetLanguage().nativeName,
        })
      : t("translatedBadge", {
          source: getSourceLanguage().nativeName,
          target: getTargetLanguage().nativeName,
        });
  badge.innerHTML = `<span class="source-dot source-dot--subs"></span> ${escapeHtml(t("subtitleBadge", { label: modeLabel }))}`;
  transcriptList.parentElement.insertBefore(badge, transcriptList);

  const rows = [];
  segments.forEach((segment, index) => {
    const div = document.createElement("div");
    const cached = transcriptParagraphCache.get(
      transcriptTranslationCacheKey(segment),
    );
    div.className = `transcript-entry ${cached ? "translated" : "translating"}`;
    div.dataset.seconds = segment.start;
    div.dataset.segmentId = segment.id;
    div.dataset.segmentIndex = index;

    const minutes = Math.floor(segment.start / 60);
    const seconds = Math.floor(segment.start % 60);
    const timestamp = `${minutes}:${String(seconds).padStart(2, "0")}`;
    div.innerHTML = `
      <span class="transcript-time">${timestamp}</span>
      ${renderTranscriptSegmentContent(segment, mode, cached, "")}
      ${renderCardCopyButton("transcript-card-copy")}
    `;
    div.addEventListener("click", (event) =>
      seekFromTranscriptEntryClick(event, segment.start),
    );
    wireCardCopyButton(div, () =>
      getTranscriptSegmentCopyText(
        segment,
        transcriptParagraphCache.get(transcriptTranslationCacheKey(segment)),
      ),
    );
    transcriptList.appendChild(div);
    rows.push(div);
  });

  startPlaybackTracking();
  return rows;
}

function getTranscriptSegmentCopyText(segment, translation) {
  if (currentTranscriptMode === "zh") return translation || segment.text;
  return currentTranscriptMode === "bilingual" && translation
    ? `${segment.text}\n${translation}`
    : segment.text;
}

/**
 * Rebuilds a provider response in source order. Unknown IDs are ignored and
 * missing IDs remain explicit errors, never positional guesses.
 */
function alignTranslatedSegmentBatch(sourceSegments, responseSegments) {
  const translatedById = new Map();
  if (Array.isArray(responseSegments)) {
    responseSegments.forEach((item) => {
      if (!item || typeof item.id !== "string" || typeof item.text !== "string")
        return;
      const text = item.text.trim();
      if (text && !translatedById.has(item.id)) {
        translatedById.set(item.id, text);
      }
    });
  }

  return sourceSegments.map((segment) => ({
    id: segment.id,
    text: translatedById.get(segment.id) || "",
    error: translatedById.has(segment.id) ? "" : "Translation unavailable.",
  }));
}

function updateTranslatedRow(
  segment,
  index,
  alignedItem,
  generation,
  sourceLanguage,
  targetLanguage,
) {
  if (generation !== translationGeneration) return;
  const row = document.querySelector(
    `.transcript-entry[data-segment-id="${CSS.escape(segment.id)}"]`,
  );
  if (!row) return;

  if (alignedItem.text) {
    transcriptParagraphCache.set(
      transcriptTranslationCacheKey(segment, sourceLanguage, targetLanguage),
      alignedItem.text,
    );
  }

  const copy = row.querySelector(".transcript-copy");
  if (copy) {
    copy.outerHTML = renderTranscriptSegmentContent(
      segment,
      currentTranscriptMode,
      alignedItem.text,
      alignedItem.error,
    );
  }
  row.classList.toggle("translated", !!alignedItem.text);
  row.classList.toggle("translating", false);
  row.classList.toggle("translation-failed", !alignedItem.text);

  const retry = row.querySelector(".translation-retry-btn");
  if (retry) {
    ["mousedown", "mouseup"].forEach((eventName) => {
      retry.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });
    retry.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      retryTranslationSegment(index, generation);
    });
  }
}

let activeTranslationQueue = null;

async function requestTranscriptTranslationBatch(
  indices,
  segments,
  generation,
  videoId,
  mode,
) {
  const sourceBatch = indices.map((index) => segments[index]);
  const sourceLanguage = getSourceLanguage().code;
  const targetLanguage = getTargetLanguage().code;
  setTranslatingSpinner(true);
  try {
    const result = await sendTranslationMessage({
      action: "translateContent",
      content: {
        segments: sourceBatch.map(({ id, text }) => ({ id, text })),
      },
      contentType: "transcriptBatch",
      targetLanguage,
      videoTitle: currentVideoTitle,
    });

    const isStale =
      generation !== translationGeneration ||
      videoId !== currentVideoId ||
      mode !== currentTranscriptMode ||
      sourceLanguage !== getSourceLanguage().code ||
      targetLanguage !== getTargetLanguage().code;
    if (isStale) return;

    const responseSegments = result?.success
      ? result.translatedContent?.segments
      : [];
    const aligned = alignTranslatedSegmentBatch(sourceBatch, responseSegments);
    aligned.forEach((item, batchIndex) => {
      if (!result?.success) {
        item.error = result?.error || "Translation failed.";
      }
      updateTranslatedRow(
        sourceBatch[batchIndex],
        indices[batchIndex],
        item,
        generation,
        sourceLanguage,
        targetLanguage,
      );
    });
    await updateCache();
  } catch (error) {
    if (generation !== translationGeneration) return;
    sourceBatch.forEach((segment, batchIndex) => {
      updateTranslatedRow(
        segment,
        indices[batchIndex],
        { id: segment.id, text: "", error: error.message || "Translation failed." },
        generation,
        sourceLanguage,
        targetLanguage,
      );
    });
  } finally {
    setTranslatingSpinner(false);
  }
}

function retryTranslationSegment(index, generation) {
  if (generation !== translationGeneration || !activeTranslationQueue) return;
  const row = document.querySelector(
    `.transcript-entry[data-segment-index="${index}"]`,
  );
  if (row) {
    row.classList.add("translating");
    row.classList.remove("translation-failed");
    const translation = row.querySelector(".transcript-translation");
    if (translation) {
      translation.className = "transcript-translation translation-pending";
      translation.textContent = t("retrying");
    }
  }
  activeTranslationQueue.enqueue(index, true);
}

/**
 * Renders immediately, translates the first small batch, then observes the
 * remaining rows. Batches are sequential so the provider is never flooded.
 */
async function translateTranscript() {
  const segments = getActiveTranscriptSegments();
  if (!segments.length || currentTranscriptMode === "original") return;

  translationGeneration += 1;
  const generation = translationGeneration;
  const videoId = currentVideoId;
  const mode = currentTranscriptMode;
  if (transcriptScrollObserver) transcriptScrollObserver.disconnect();

  const rows = renderTranscriptModeRows(segments, mode);
  const queue = [];
  const queued = new Set();
  let processing = false;

  const processNext = async () => {
    if (processing || queue.length === 0 || generation !== translationGeneration)
      return;
    processing = true;
    const indices = queue.splice(0, 3);
    indices.forEach((index) => queued.delete(index));
    try {
      await requestTranscriptTranslationBatch(
        indices,
        segments,
        generation,
        videoId,
        mode,
      );
    } finally {
      processing = false;
      if (queue.length && generation === translationGeneration) processNext();
    }
  };

  const enqueue = (index, force = false) => {
    if (!Number.isInteger(index) || !segments[index]) return;
    const cached = transcriptParagraphCache.has(
      transcriptTranslationCacheKey(segments[index]),
    );
    if ((!force && cached) || queued.has(index)) return;
    queue.push(index);
    queued.add(index);
    // Let all entries reported in the same viewport turn collect before the
    // worker starts, producing one small contextual multi-segment request.
    Promise.resolve().then(processNext);
  };
  activeTranslationQueue = { enqueue };

  transcriptScrollObserver = new IntersectionObserver(
    (observerEntries) => {
      observerEntries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (a, b) =>
            Number(a.target.dataset.segmentIndex) -
            Number(b.target.dataset.segmentIndex),
        )
        .forEach((entry) => enqueue(Number(entry.target.dataset.segmentIndex)));
    },
    {
      root: document.getElementById("contentArea"),
      rootMargin: "320px 0px",
      threshold: 0,
    },
  );

  rows.forEach((row, index) => {
    if (!row.classList.contains("translated")) transcriptScrollObserver.observe(row);
    if (index < 3) enqueue(index);
  });
}

function setTranslatingSpinner(show) {
  if (show) translationWorkCount += 1;
  else translationWorkCount = Math.max(0, translationWorkCount - 1);
  const isTranslating = translationWorkCount > 0;
  const spinner = document.getElementById("langSpinner");
  if (spinner) spinner.classList.toggle("visible", isTranslating);
}

// ============================================================
// OVERVIEW MODE UI — Original / Chinese / aligned bilingual
// ============================================================
// Mirrors the transcript mode control for the AI overview: chapter titles,
// chapter summaries, and key quotes are translated as independent segments
// with stable IDs, so one malformed model response cannot fail the list.

function getOverviewSegments(analysis) {
  const segments = [];
  (analysis?.chapters || []).forEach((chapter, index) => {
    const title = String(chapter?.title || "").trim();
    if (title) {
      segments.push({ id: `chapter-${index}-title`, text: title });
    }
    const summary = String(chapter?.summary || "").trim();
    if (summary) {
      segments.push({ id: `chapter-${index}-summary`, text: summary });
    }
  });
  (analysis?.keyQuotes || []).forEach((quote, index) => {
    const text = String(quote?.quote || "").trim();
    if (text) segments.push({ id: `quote-${index}`, text });
  });
  return segments;
}

function overviewTranslationCacheKey(segmentId) {
  return `${currentVideoId}:${getSourceLanguage().code}:${getTargetLanguage().code}:overview:${segmentId}`;
}

function setOverviewModeButtons(mode) {
  document.querySelectorAll(".overview-mode-btn").forEach((button) => {
    const active = button.dataset.overviewMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setOverviewTranslatingSpinner(show) {
  if (show) overviewTranslationWorkCount += 1;
  else overviewTranslationWorkCount = Math.max(0, overviewTranslationWorkCount - 1);
  const isTranslating = overviewTranslationWorkCount > 0;
  const spinner = document.getElementById("overviewLangSpinner");
  if (spinner) spinner.classList.toggle("visible", isTranslating);
}

// Unlike the transcript (translated lazily as rows enter the viewport), the
// overview translates every visible item. Keep a small, bounded number of
// independent requests in flight so long lists render promptly without
// flooding the provider; a malformed response still affects only that row.
const OVERVIEW_BATCH_RETRY_MS = 1500; // Backoff before the single retry.
const OVERVIEW_BATCH_MAX_ATTEMPTS = 2;
const OVERVIEW_TRANSLATION_CONCURRENCY = 4;

/**
 * Resolves after the delay. Returns false when the generation went stale
 * while waiting, so the caller can abandon the run.
 */
function overviewBatchPause(ms, generation) {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(generation === overviewTranslationGeneration),
      ms,
    );
  });
}

/**
 * Provider JSON slips surface as raw "Expected ',' ..." parser text, which is
 * useless in the UI. Map them (and the aligner's literal) to localized copy.
 */
function friendlyOverviewError(message) {
  const text = String(message || "").trim();
  if (
    !text ||
    /^(Expected|Unexpected|SyntaxError)/i.test(text) ||
    /JSON at position/i.test(text)
  ) {
    return t("translationFailed");
  }
  if (text === "Translation unavailable.") return t("translationUnavailable");
  return text;
}

async function handleOverviewModeChange(mode) {
  if (!["original", "zh", "bilingual"].includes(mode)) return;
  if (mode === currentOverviewMode) return;

  currentOverviewMode = mode;
  overviewTranslationGeneration += 1; // Invalidate any in-flight batches.
  overviewTranslationWorkCount = 0;
  setOverviewTranslatingSpinner(false);
  setOverviewModeButtons(mode);

  if (mode === "original") {
    if (currentAnalysis) renderAnalysisResults(currentAnalysis);
    return;
  }

  await translateOverview();
}

/**
 * Sends one overview item using the same ID-aligned response handling as a
 * transcript row. A persistent failure stays attached to that item only.
 */
async function requestOverviewTranslationSegment(
  sourceSegment,
  generation,
  videoId,
  mode,
) {
  for (let attempt = 1; attempt <= OVERVIEW_BATCH_MAX_ATTEMPTS; attempt += 1) {
    let outcome = null; // { aligned } on success, { error } on failure
    try {
      const result = await sendTranslationMessage({
        action: "translateContent",
        content: {
          segments: [{ id: sourceSegment.id, text: sourceSegment.text }],
        },
        // Use the same long-lived message type as subtitle translation. This
        // keeps an already-running service worker compatible while the
        // payload remains deliberately one item per overview row.
        contentType: "transcriptBatch",
        targetLanguage: getTargetLanguage().code,
        videoTitle: currentVideoTitle,
      });

      const isStale =
        generation !== overviewTranslationGeneration ||
        videoId !== currentVideoId ||
        mode !== currentOverviewMode;
      if (isStale) return;

      if (result?.success) {
        outcome = {
          aligned: alignTranslatedSegmentBatch(
            [sourceSegment],
            result.translatedContent?.segments,
          ),
        };
      } else {
        outcome = { error: result?.error || t("translationFailed") };
      }
    } catch (error) {
      if (generation !== overviewTranslationGeneration) return;
      outcome = { error: error.message || t("translationFailed") };
    }

    const translated = outcome.aligned?.[0];
    if (translated?.text) {
      const key = overviewTranslationCacheKey(sourceSegment.id);
      overviewTranslationCache.set(key, translated.text);
      overviewSegmentErrors.delete(key);
      await updateCache();
      renderAnalysisResults(currentAnalysis);
      return;
    }

    // Retry this one failed item once, without repeating completed items.
    if (attempt < OVERVIEW_BATCH_MAX_ATTEMPTS) {
      const stillCurrent = await overviewBatchPause(
        OVERVIEW_BATCH_RETRY_MS,
        generation,
      );
      if (!stillCurrent) return;
      continue;
    }

    const failureMessage = translated
      ? friendlyOverviewError(translated.error)
      : friendlyOverviewError(outcome.error);
    overviewSegmentErrors.set(
      overviewTranslationCacheKey(sourceSegment.id),
      failureMessage,
    );
    await updateCache();
    renderAnalysisResults(currentAnalysis);
    return;
  }
}

/**
 * Translates every uncached overview segment with a small worker pool. The
 * generation guard drops results from older modes or videos; a fresh run also
 * serves as the retry path (old errors are cleared first).
 */
async function translateOverview() {
  if (!currentAnalysis) return;
  const segments = getOverviewSegments(currentAnalysis);
  if (!segments.length || currentOverviewMode === "original") return;

  overviewTranslationGeneration += 1;
  const generation = overviewTranslationGeneration;
  const videoId = currentVideoId;
  const mode = currentOverviewMode;

  // A fresh run also serves as the retry path: clear old errors first.
  segments.forEach((segment) => {
    overviewSegmentErrors.delete(overviewTranslationCacheKey(segment.id));
  });
  renderAnalysisResults(currentAnalysis);

  const pending = segments.filter(
    (segment) =>
      !overviewTranslationCache.has(overviewTranslationCacheKey(segment.id)),
  );
  if (!pending.length) return;

  setOverviewTranslatingSpinner(true);
  try {
    let nextIndex = 0;
    const translateNext = async () => {
      while (generation === overviewTranslationGeneration) {
        const segment = pending[nextIndex];
        nextIndex += 1;
        if (!segment) return;
        await requestOverviewTranslationSegment(segment, generation, videoId, mode);
      }
    };
    const workerCount = Math.min(OVERVIEW_TRANSLATION_CONCURRENCY, pending.length);
    await Promise.all(Array.from({ length: workerCount }, translateNext));
  } finally {
    setOverviewTranslatingSpinner(false);
  }
}

/**
 * Test-only: swaps the active UI language without touching the DOM. The
 * extension itself always goes through applyUiLanguage().
 */
function setUiLanguage(language) {
  currentUiLanguage = normalizeUiLanguage(language);
}

// Pure helpers are exposed for the repository's Node tests. The extension does
// not read this object at runtime.
globalThis.__YTD_TRANSCRIPT_TESTING__ = {
  sendTranslationMessage,
  groupTranscriptEntries,
  splitOversizedThought,
  alignTranslatedSegmentBatch,
  renderSubtitleInlineMarkup,
  renderTranscriptSegmentContent,
  getOverviewSegments,
  friendlyOverviewError,
  renderOverviewSegmentHtml,
  noteTranslationCacheKey,
  getFreshNoteTranslations,
  renderNoteTranslationContent,
  renderCardCopyButton,
  getTranscriptSegmentCopyText,
  getOverviewCopyText,
  UI_COPY,
  t,
  setUiLanguage,
  normalizeUiLanguage,
};
