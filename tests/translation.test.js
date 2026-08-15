const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadSidepanelHelpers({
  sendMessage = () => Promise.resolve({}),
  setTimeoutImpl = () => 0,
  clearTimeoutImpl = () => {},
} = {}) {
  const listeners = { addListener() {} };
  const sandbox = {
    console,
    URL,
    TextDecoder,
    TextEncoder,
    setTimeout: setTimeoutImpl,
    clearTimeout: clearTimeoutImpl,
    setInterval() {},
    clearInterval() {},
    IntersectionObserver: class {},
    CSS: { escape: (value) => value },
    window: { getSelection: () => null, close() {} },
    document: {
      addEventListener() {},
      querySelectorAll: () => [],
      querySelector: () => null,
      getElementById: () => null,
      createElement: () => {
        let value = "";
        return {
          set textContent(text) {
            value = String(text);
          },
          get innerHTML() {
            return value
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")
              .replaceAll('"', "&quot;");
          },
        };
      },
    },
    chrome: {
      runtime: { onMessage: listeners, sendMessage },
      windows: { getCurrent: () => Promise.resolve({ id: 1 }) },
      tabs: { onUpdated: listeners, onActivated: listeners },
    },
    YTD_SETTINGS: {},
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("sidepanel.js"), sandbox);
  return sandbox.__YTD_TRANSCRIPT_TESTING__;
}

function loadBackgroundHelpers({
  settings = {
    provider: "deepseek",
    aiApiKey: "test-key",
    aiBaseUrl: "https://api.deepseek.com",
    aiModel: "deepseek-v4-flash",
  },
  fetchImpl = fetch,
  setTimeoutImpl = () => 0,
  clearTimeoutImpl = () => {},
} = {}) {
  const listeners = { addListener() {} };
  const sandbox = {
    console,
    URL,
    TextDecoder,
    TextEncoder,
    fetch: fetchImpl,
    AbortController,
    setTimeout: setTimeoutImpl,
    clearTimeout: clearTimeoutImpl,
    importScripts() {},
    chrome: {
      storage: {
        local: {
          setAccessLevel: () => Promise.resolve(),
          get: async () => ({ ytd_settings: settings }),
        },
      },
      action: { onClicked: listeners },
      sidePanel: {
        setPanelBehavior() {},
        setOptions: () => Promise.resolve(),
      },
      runtime: {
        onInstalled: listeners,
        onMessage: listeners,
        openOptionsPage() {},
        getURL: (resourcePath) => `chrome-extension://test/${resourcePath}`,
      },
      tabs: { onUpdated: listeners, onActivated: listeners },
    },
    YTD_SETTINGS: {
      STORAGE_KEY: "ytd_settings",
      normalize: (value) => value,
      chatCompletionsUrl: (baseUrl) => `${baseUrl}/chat/completions`,
      canonicalYouTubeUrl: (videoId) => `https://www.youtube.com/watch?v=${videoId}`,
    },
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("background.js"), sandbox);
  return sandbox.__YTD_TRANSLATION_TESTING__;
}

function createFakeTimers() {
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, delay, active: true });
      return id;
    },
    clearTimeout(id) {
      const timer = timers.get(id);
      if (timer) timer.active = false;
    },
    fireActive(delay) {
      const match = [...timers.entries()].find(
        ([, timer]) => timer.active && timer.delay === delay,
      );
      assert.ok(match, `Expected an active ${delay}ms timer`);
      match[1].active = false;
      match[1].callback();
    },
    activeCount(delay) {
      return [...timers.values()].filter(
        (timer) => timer.active && timer.delay === delay,
      ).length;
    },
    createdCount(delay) {
      return [...timers.values()].filter((timer) => timer.delay === delay).length;
    },
  };
}

function streamingResponse(chunks, { ok = true, status = 200 } = {}) {
  let index = 0;
  return {
    ok,
    status,
    body: {
      getReader() {
        return {
          async read() {
            if (index >= chunks.length) return { done: true };
            return { done: false, value: chunks[index++] };
          },
          async cancel() {},
        };
      },
    },
  };
}

const encode = (value) => new TextEncoder().encode(value);
const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

test("Transcript header exposes and wires Original, Chinese, and bilingual modes", () => {
  const html = read("sidepanel.html");
  const js = read("sidepanel.js");
  assert.match(html, /data-transcript-mode="original"[\s\S]*?>Original</);
  assert.match(html, /data-transcript-mode="zh"[\s\S]*?>\u4e2d\u6587</);
  assert.match(html, /data-transcript-mode="bilingual"[\s\S]*?>\u53cc\u8bed</);
  assert.match(js, /handleTranscriptModeChange\(button\.dataset\.transcriptMode\)/);
  assert.match(js, /contentType: "transcriptBatch"/);
  assert.doesNotMatch(js, /English \+ Chinese/);
  assert.match(js, /Original \(\$\{language\}\)/);
});

test("Overview header exposes and wires the same three language modes", () => {
  const html = read("sidepanel.html");
  const js = read("sidepanel.js");
  assert.match(html, /data-overview-mode="original"[\s\S]*?>Original</);
  assert.match(html, /data-overview-mode="zh"[\s\S]*?>\u4e2d\u6587</);
  assert.match(html, /data-overview-mode="bilingual"[\s\S]*?>\u53cc\u8bed</);
  assert.match(html, /id="overviewLangSpinner"/);
  assert.match(js, /handleOverviewModeChange\(button\.dataset\.overviewMode\)/);
  assert.match(js, /contentType: "transcriptBatch"/);
});

test("content language controls share their title rows", () => {
  const html = read("sidepanel.html");

  assert.match(
    html,
    /transcript-header-main[\s\S]*?transcriptTitle[\s\S]*?transcriptModeControl/,
  );
  assert.doesNotMatch(
    read("sidepanel.css"),
    /@media \(max-width: 390px\)[\s\S]*?\.transcript-header-main[\s\S]*?flex-direction:\s*column/,
  );
  assert.match(
    html,
    /section-header[\s\S]*?chaptersTitle[\s\S]*?overviewModeControl/,
  );
  assert.doesNotMatch(html, /overview-language-bar/);
  assert.match(
    html,
    /section-header[\s\S]*?notesTitle[\s\S]*?notesModeControl[\s\S]*?notes-filter/,
  );
});

test("notes expose Original, Chinese, and bilingual modes with four-worker translation", () => {
  const html = read("sidepanel.html");
  const js = read("sidepanel.js");
  const css = read("sidepanel.css");

  assert.match(html, /data-notes-mode="original"[\s\S]*?>Original</);
  assert.match(html, /data-notes-mode="zh"[\s\S]*?>\u4e2d\u6587</);
  assert.match(html, /data-notes-mode="bilingual"[\s\S]*?>\u53cc\u8bed</);
  assert.match(html, /id="notesLangSpinner"/);
  assert.match(js, /function noteTranslationCacheKey\(note\)/);
  assert.match(js, /contentType: "transcriptBatch"/);
  assert.match(js, /function translateNotes\(\)/);
  assert.match(js, /OVERVIEW_TRANSLATION_CONCURRENCY/);
  assert.match(css, /\.note-translation\s*\{/);
});

test("notes render original, Chinese, bilingual, pending, and failed states", () => {
  const { noteTranslationCacheKey, renderNoteTranslationContent } =
    loadSidepanelHelpers();
  const note = { id: "note_123", text: "A saved English note." };

  assert.equal(noteTranslationCacheKey(note), "note_123:en:zh-CN:note");
  assert.match(
    renderNoteTranslationContent(note, "original", "中文笔记。", ""),
    /A saved English note/,
  );
  const chinese = renderNoteTranslationContent(note, "zh", "中文笔记。", "");
  assert.match(chinese, /中文笔记/);
  assert.doesNotMatch(chinese, /A saved English note/);
  const bilingual = renderNoteTranslationContent(
    note,
    "bilingual",
    "中文笔记。",
    "",
  );
  assert.match(bilingual, /note-original/);
  assert.match(bilingual, /A saved English note/);
  assert.match(bilingual, /中文笔记/);
  assert.match(
    renderNoteTranslationContent(note, "zh", "", ""),
    /translation-pending/,
  );
  assert.match(
    renderNoteTranslationContent(note, "zh", "", "Translation failed."),
    /translation-retry-btn/,
  );
});

test("transcript and chapter cards provide icon-only copy controls", () => {
  const { renderCardCopyButton, getOverviewCopyText } = loadSidepanelHelpers();
  const js = read("sidepanel.js");
  const css = read("sidepanel.css");
  const html = read("sidepanel.html");

  assert.match(renderCardCopyButton("chapter-copy-icon"), /chapter-copy-icon/);
  assert.match(
    renderCardCopyButton("chapter-copy-icon"),
    /<svg width="14" height="14"[^>]*aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"><\/rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"><\/path><\/svg>/,
  );
  // Copied feedback swaps the copy icon for a check icon, not text glyphs.
  assert.match(js, /button\.innerHTML = CHECK_ICON_SVG/);
  assert.match(
    js,
    /<polyline points="20 6 9 17 4 12"><\/polyline>/,
  );
  assert.doesNotMatch(js, /⧉/);
  assert.doesNotMatch(js, /copiedExcl|quoteCopyAction/);
  // The transcript header keeps its Copy button as a text label next to
  // Export; the icon treatment stays on the in-card copy controls only.
  assert.match(html, /id="copyTranscriptBtn"[\s\S]*?data-i18n="copyBtn"/);
  assert.doesNotMatch(
    html,
    /id="copyTranscriptBtn"[\s\S]*?data-i18n-title="copyBtn"/,
  );
  assert.doesNotMatch(html, /icon-only-btn/);
  assert.match(js, /function getTranscriptSegmentCopyText/);
  assert.match(js, /wireCardCopyButton\(li, \(\) => getChapterCopyText/);
  assert.match(css, /\.card-copy-icon\s*\{/);
  assert.equal(getOverviewCopyText("Original", "中文"), "Original");
});

test("note translations restore only fresh 30-day persistent entries", () => {
  const { getFreshNoteTranslations } = loadSidepanelHelpers();
  const now = 1_800_000_000_000;
  const fresh = getFreshNoteTranslations(
    {
      "note_1:zh:note": { text: "仍有效", timestamp: now - 29 * 24 * 60 * 60 * 1000 },
      "note_2:zh:note": { text: "已过期", timestamp: now - 31 * 24 * 60 * 60 * 1000 },
      "note_3:zh:note": { text: "", timestamp: now },
    },
    now,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(fresh)), [
    ["note_1:zh:note", { text: "仍有效", timestamp: now - 29 * 24 * 60 * 60 * 1000 }],
  ]);
});

test("overview analysis splits into stable chapter and quote segments", () => {
  const { getOverviewSegments } = loadSidepanelHelpers();
  const segments = getOverviewSegments({
    chapters: [
      { title: "Intro", summary: "How the video starts" },
      { title: "Demo", summary: "" },
    ],
    keyQuotes: [{ quote: "A wow fact." }, { quote: "" }],
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(segments)),
    [
      { id: "chapter-0-title", text: "Intro" },
      { id: "chapter-0-summary", text: "How the video starts" },
      { id: "chapter-1-title", text: "Demo" },
      { id: "quote-0", text: "A wow fact." },
    ],
  );
  for (const segment of segments) {
    assert.match(segment.id, /^[A-Za-z0-9:_-]{1,128}$/);
  }
});

test("overview sends each title, summary, and quote as one aligned request with bounded concurrency", () => {
  const js = read("sidepanel.js");
  assert.match(
    js,
    /segments: \[\{ id: sourceSegment\.id, text: sourceSegment\.text \}\]/,
  );
  assert.match(js, /OVERVIEW_TRANSLATION_CONCURRENCY = 4/);
  assert.match(js, /Promise\.all\(Array\.from\(\{ length: workerCount \}, translateNext\)\)/);
  assert.doesNotMatch(js, /function buildOverviewBatches/);
});

test("provider JSON slips map to friendly localized overview errors", () => {
  const { friendlyOverviewError, setUiLanguage } = loadSidepanelHelpers();

  setUiLanguage("en");
  assert.equal(
    friendlyOverviewError(
      "Expected ',' or ']' after array element in JSON at position 138",
    ),
    "Translation failed.",
  );
  assert.equal(friendlyOverviewError(""), "Translation failed.");
  assert.equal(
    friendlyOverviewError("Translation unavailable."),
    "Translation unavailable.",
  );
  assert.equal(
    friendlyOverviewError("Rate limit exceeded"),
    "Rate limit exceeded",
  );

  setUiLanguage("zh-CN");
  assert.equal(friendlyOverviewError("SyntaxError: Unexpected token"), "翻译失败。");
  assert.equal(friendlyOverviewError("Translation unavailable."), "翻译不可用。");
});

test("overview translation retries each failed item once", async () => {
  const js = read("sidepanel.js");
  assert.match(js, /OVERVIEW_BATCH_RETRY_MS = 1500/);
  assert.match(js, /OVERVIEW_BATCH_MAX_ATTEMPTS = 2/);
  assert.match(js, /requestOverviewTranslationSegment/);

  const background = read("background.js");
  assert.match(background, /overviewBatch: "Overview batch translation"/);
  assert.match(background, /maxTokens: 1536/);
});

test("overview renders translated-only, bilingual, pending, and failed states", () => {
  const { renderOverviewSegmentHtml } = loadSidepanelHelpers();

  const translatedOnly = renderOverviewSegmentHtml(
    "Chapter title",
    "\u7ae0\u8282\u6807\u9898",
    "",
    "zh",
  );
  assert.doesNotMatch(translatedOnly, /Chapter title/);
  assert.match(translatedOnly, /\u7ae0\u8282\u6807\u9898/);

  const bilingual = renderOverviewSegmentHtml(
    "Chapter title",
    "\u7ae0\u8282\u6807\u9898",
    "",
    "bilingual",
  );
  assert.match(bilingual, /Chapter title/);
  assert.match(bilingual, /overview-translation/);
  assert.match(bilingual, /\u7ae0\u8282\u6807\u9898/);

  const pending = renderOverviewSegmentHtml("Chapter title", "", "", "zh");
  assert.match(pending, /translation-pending/);
  assert.doesNotMatch(pending, /Chapter title/);

  const failed = renderOverviewSegmentHtml(
    "Chapter title",
    "",
    "Translation failed.",
    "zh",
  );
  assert.match(failed, /translation-error/);
  assert.match(failed, /translation-retry-btn/);

  const original = renderOverviewSegmentHtml(
    "Chapter title",
    "\u7ae0\u8282\u6807\u9898",
    "",
    "original",
  );
  assert.equal(original, "Chapter title");
});

test("background translates one overview item through the subtitle-compatible protocol", async () => {
  const requests = [];
  const helpers = loadBackgroundHelpers({
    fetchImpl: async (url, options) => {
      if (url.startsWith("chrome-extension://")) {
        return { ok: true, text: async () => read("prompts/translation.md") };
      }
      requests.push(JSON.parse(options.body));
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  '{"segments":[{"id":"chapter-0-title","text":"\u7b2c\u4e00\u7ae0\u6807\u9898"}]}',
              },
            },
          ],
        }),
      };
    },
  });

  const result = await helpers.handleTranslateContent(
    { segments: [{ id: "chapter-0-title", text: "First chapter heading" }] },
    "transcriptBatch",
    "zh",
    "Video",
  );

  assert.equal(result.success, true);
  assert.equal(
    result.translatedContent.segments[0].text,
    "\u7b2c\u4e00\u7ae0\u6807\u9898",
  );
  assert.equal(requests.length, 1);
  assert.match(requests[0].messages[0].content, /Translate the transcript segments into/);
  assert.match(requests[0].messages[0].content, /Use \u4f60, never \u60a8/);
});

test("background uses the configured source language for Supadata", async () => {
  const requests = [];
  const helpers = loadBackgroundHelpers({
    settings: {
      provider: "deepseek",
      aiApiKey: "test-key",
      aiBaseUrl: "https://api.deepseek.com",
      aiModel: "deepseek-v4-flash",
      supadataApiKey: "supadata-key",
      sourceLanguage: "ja",
      targetLanguage: "zh-CN",
    },
    fetchImpl: async (url) => {
      requests.push(url);
      return { ok: true, json: async () => ({ content: [] }) };
    },
  });

  await helpers.handleFetchTranscript("ydTeb_I0b94");
  assert.equal(new URL(requests[0]).searchParams.get("lang"), "ja");
});

test("background rejects Supadata's fallback subtitle language", async () => {
  const helpers = loadBackgroundHelpers({
    settings: {
      provider: "deepseek",
      aiApiKey: "test-key",
      aiBaseUrl: "https://api.deepseek.com",
      aiModel: "deepseek-v4-flash",
      supadataApiKey: "supadata-key",
      sourceLanguage: "zh-CN",
      targetLanguage: "ja",
    },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        lang: "en",
        availableLangs: ["en", "ja"],
        content: [{ text: "English fallback", offset: 0, duration: 1000, lang: "en" }],
      }),
    }),
  });

  const result = await helpers.handleFetchTranscript("ydTeb_I0b94");
  assert.equal(result.success, false);
  assert.equal(result.error, "REQUESTED_LANGUAGE_UNAVAILABLE");
});

test("analysis and saved notes keep the configured source language", () => {
  const backgroundSource = read("background.js");
  const analysisPrompt = read("prompts/analysis.md");
  const notePrompt = read("prompts/note-cleanup.md");

  assert.match(
    backgroundSource,
    /sourceLanguage: getTranslationLanguage\(settings\.sourceLanguage\)\.name/,
  );
  assert.match(backgroundSource, /sourceLanguage: sourceLanguage\.code/);
  assert.match(analysisPrompt, /in \{sourceLanguage\}\. Do not translate them into English\./);
  assert.match(notePrompt, /well-formed \{sourceLanguage\}\./);
  assert.match(
    read("prompts/translation.md"),
    /Return exactly one \{langName\} rendition for each segment\./,
  );
});

test("semantic segmentation rebuilds sentences across caption boundaries", () => {
  const { groupTranscriptEntries } = loadSidepanelHelpers();
  const segments = groupTranscriptEntries(
    [
      { start: 0, text: "Caption boundaries should" },
      { start: 2, text: "not break a complete sentence." },
      { start: 5, text: "The next thought also" },
      { start: 7, text: "stays together!" },
    ],
    { minChars: 1, idealChars: 100, maxChars: 320, maxSeconds: 20 },
  );
  assert.equal(segments.length, 2);
  assert.equal(
    segments[0].text,
    "Caption boundaries should not break a complete sentence.",
  );
  assert.equal(segments[0].start, 0);
  assert.equal(segments[1].text, "The next thought also stays together!");
  assert.equal(segments[1].start, 5);
});

test("a huge raw Supadata entry is split into seekable bounded segments", () => {
  const { groupTranscriptEntries } = loadSidepanelHelpers();
  const text = Array.from({ length: 900 }, (_, index) => `word${index}`).join(" ");
  const segments = groupTranscriptEntries([
    { start: 12, duration: 90, text },
  ]);
  assert.ok(segments.length > 8);
  assert.ok(segments.every((segment) => segment.text.length <= 384));
  assert.equal(segments[0].start, 12);
  assert.ok(segments.at(-1).start > segments[0].start);
  assert.ok(segments.every((segment) => /^segment-\d+-\d+$/.test(segment.id)));
});

test("Chinese sentence and clause punctuation creates semantic guardrails", () => {
  const { groupTranscriptEntries } = loadSidepanelHelpers();
  const segments = groupTranscriptEntries(
    [
      { start: 0, text: "这是一个被字幕切开的" },
      { start: 2, text: "完整句子。这是第二个想法，" },
      { start: 5, text: "也应该保持语义完整！" },
    ],
    { minChars: 1, idealChars: 100, maxChars: 320, maxSeconds: 20 },
  );
  assert.equal(segments.length, 2);
  assert.equal(segments[0].text, "这是一个被字幕切开的完整句子。");
  assert.equal(segments[1].text, "这是第二个想法，也应该保持语义完整！");
});

test("structured translation batches align by stable ID and expose missing fallback", () => {
  const sidepanel = loadSidepanelHelpers();
  const background = loadBackgroundHelpers();
  const source = [
    { id: "segment-0-0", text: "A complete first sentence." },
    { id: "segment-1-5000", text: "A complete second sentence." },
  ];
  assert.deepEqual(
    JSON.parse(JSON.stringify(background.validateTranscriptBatchRequest({ segments: source }))),
    source,
  );

  const normalized = background.normalizeTranslatedSegmentBatch(
    {
      segments: [
        { id: "unknown", text: "\u5ffd\u7565" },
        { id: "segment-1-5000", text: "\u7b2c\u4e8c\u4e2a\u5b8c\u6574\u53e5\u5b50\u3002" },
      ],
    },
    source,
  );
  const aligned = sidepanel.alignTranslatedSegmentBatch(
    source,
    normalized.segments,
  );
  assert.equal(aligned[0].id, source[0].id);
  assert.equal(aligned[0].text, "");
  assert.match(aligned[0].error, /unavailable/i);
  assert.equal(aligned[1].text, "\u7b2c\u4e8c\u4e2a\u5b8c\u6574\u53e5\u5b50\u3002");
});

test("translated-only omits English while bilingual renders aligned English and Chinese", () => {
  const { renderTranscriptSegmentContent } = loadSidepanelHelpers();
  const segment = { id: "segment-0-0", text: "Original English sentence." };
  const translatedOnly = renderTranscriptSegmentContent(
    segment,
    "zh",
    "\u4e2d\u6587\u8bd1\u6587\u3002",
    "",
  );
  const bilingual = renderTranscriptSegmentContent(
    segment,
    "bilingual",
    "\u4e2d\u6587\u8bd1\u6587\u3002",
    "",
  );
  assert.doesNotMatch(translatedOnly, /Original English sentence/);
  assert.match(translatedOnly, /\u4e2d\u6587\u8bd1\u6587/);
  assert.match(bilingual, /transcript-original/);
  assert.match(bilingual, /Original English sentence/);
  assert.match(bilingual, /\u4e2d\u6587\u8bd1\u6587/);
});

test("subtitle formatting tags render in original and translated segment text", () => {
  const { renderTranscriptSegmentContent } = loadSidepanelHelpers();
  const html = renderTranscriptSegmentContent(
    {
      id: "segment-0-0",
      text: "Think <i>deeply</i>, <b>carefully</b>, and <u>clearly</u>.<br>Next line.",
    },
    "bilingual",
    "\u5b57\u5730<i>\u601d\u8003</i>\u7684\u3002<strong>\u91cd\u70b9</strong>",
    "",
  );

  assert.match(html, /Think <i>deeply<\/i>/);
  assert.match(html, /<b>carefully<\/b>/);
  assert.match(html, /<u>clearly<\/u>\.<br>Next line/);
  assert.match(html, /\u5b57\u5730<i>\u601d\u8003<\/i>\u7684\u3002<strong>\u91cd\u70b9<\/strong>/);
});

test("subtitle markup renderer keeps attributed and arbitrary HTML escaped", () => {
  const { renderSubtitleInlineMarkup } = loadSidepanelHelpers();
  const html = renderSubtitleInlineMarkup(
    '<img src=x onerror="alert(1)"><i onclick="alert(2)">unsafe</i><script>alert(3)</script>',
  );

  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /&lt;i onclick=&quot;alert\(2\)&quot;&gt;unsafe<\/i>/);
  assert.match(html, /&lt;script&gt;alert\(3\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<img\b|<i\s+onclick|<script\b/);
});

test("background rejects unsupported language fallthrough and malformed batches", () => {
  const source = read("background.js");
  const { validateTranscriptBatchRequest } = loadBackgroundHelpers();
  assert.match(source, /normalizedTargetLanguage/);
  assert.throws(
    () => validateTranscriptBatchRequest({ segments: [] }),
    /1 to 4 segments/,
  );
  assert.throws(
    () =>
      validateTranscriptBatchRequest({
        segments: [
          { id: "duplicate", text: "first" },
          { id: "duplicate", text: "second" },
        ],
      }),
    /unique and stable/,
  );
});

test("all AI product requests use DeepSeek non-thinking and JSON behavior", async () => {
  const deepSeekRequests = [];
  const successfulFetch = (requests) => async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "translated" } }],
      }),
    };
  };

  const deepSeek = loadBackgroundHelpers({
    fetchImpl: successfulFetch(deepSeekRequests),
  });
  const deepSeekResult = await deepSeek.requestAiCompletion({
    maxTokens: 128,
    responseFormat: { type: "json_object" },
    messages: [{ role: "user", content: "Hello." }],
  });
  assert.equal(deepSeekResult.text, "translated");
  assert.deepEqual(deepSeekRequests[0].thinking, { type: "disabled" });
  assert.deepEqual(deepSeekRequests[0].response_format, {
    type: "json_object",
  });

  const backgroundSource = read("background.js");
  assert.equal(
    (backgroundSource.match(/await requestAiCompletion\(\{/g) || []).length,
    4,
  );
  assert.doesNotMatch(backgroundSource, /disableThinking/);
  for (const callPath of [
    "handleAnalyzeTranscript",
    "cleanupNoteText",
    "handleExplainSelection",
    "callAiTranslation",
  ]) {
    assert.match(
      backgroundSource,
      new RegExp(`async function ${callPath}\\([\\s\\S]*?requestAiCompletion\\(\\{`),
    );
  }
});

test("blank-line chunks reset provider idle timeout and valid JSON succeeds", async () => {
  const timers = createFakeTimers();
  const helpers = loadBackgroundHelpers({
    setTimeoutImpl: timers.setTimeout,
    clearTimeoutImpl: timers.clearTimeout,
    fetchImpl: async () =>
      streamingResponse([
        encode("\n"),
        encode("\n"),
        encode('{"choices":[{"message":{"content":"translated"}}]}'),
      ]),
  });

  const result = await helpers.callAiTranslation("Translate.", "Hello.");
  assert.equal(result.success, true);
  assert.equal(result.text, "translated");
  assert.equal(timers.createdCount(50_000), 5);
  assert.equal(timers.activeCount(50_000), 0);
  assert.equal(timers.activeCount(120_000), 0);
});

test("provider idle silence aborts with a distinct Retry-able error", async () => {
  const timers = createFakeTimers();
  const helpers = loadBackgroundHelpers({
    setTimeoutImpl: timers.setTimeout,
    clearTimeoutImpl: timers.clearTimeout,
    fetchImpl: async (_url, { signal }) => ({
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () =>
            new Promise((_resolve, reject) => {
              signal.addEventListener("abort", () => {
                const error = new Error("aborted");
                error.name = "AbortError";
                reject(error);
              });
            }),
        }),
      },
    }),
  });

  const request = helpers.callAiTranslation("Translate.", "Hello.");
  await nextTurn();
  timers.fireActive(50_000);
  const result = await request;
  assert.equal(result.success, false);
  assert.equal(result.code, "AI_IDLE_TIMEOUT");
  assert.match(result.error, /inactive for 50 seconds.*Retry/i);
  assert.equal(timers.activeCount(120_000), 0);
});

test("blank-line keepalives cannot evade the provider hard cap", async () => {
  const timers = createFakeTimers();
  let releaseRead;
  let signal;
  const helpers = loadBackgroundHelpers({
    setTimeoutImpl: timers.setTimeout,
    clearTimeoutImpl: timers.clearTimeout,
    fetchImpl: async (_url, options) => {
      signal = options.signal;
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: () =>
              new Promise((resolve, reject) => {
                releaseRead = () => resolve({ done: false, value: encode("\n") });
                signal.addEventListener("abort", () => {
                  const error = new Error("aborted");
                  error.name = "AbortError";
                  reject(error);
                }, { once: true });
              }),
          }),
        },
      };
    },
  });

  const request = helpers.callAiTranslation("Translate.", "Hello.");
  await nextTurn();
  releaseRead();
  await nextTurn();
  releaseRead();
  await nextTurn();
  assert.equal(timers.activeCount(50_000), 1);
  timers.fireActive(120_000);
  const result = await request;
  assert.equal(result.success, false);
  assert.equal(result.code, "AI_HARD_TIMEOUT");
  assert.match(result.error, /120-second limit.*Retry/i);
  assert.equal(timers.activeCount(50_000), 0);
});

test("provider response reader accepts leading whitespace before JSON", async () => {
  const helpers = loadBackgroundHelpers({
    fetchImpl: async () =>
      streamingResponse([
        encode('  \n\t{"choices":[{"message":{"content":"ok"}}]}'),
      ]),
  });
  const result = await helpers.callAiTranslation("Translate.", "Hello.");
  assert.equal(result.success, true);
  assert.equal(result.text, "ok");
});

test("provider response reader rejects bodies over 2 MiB", async () => {
  const helpers = loadBackgroundHelpers({
    fetchImpl: async () =>
      streamingResponse([new Uint8Array(2 * 1024 * 1024 + 1)]),
  });
  const result = await helpers.callAiTranslation("Translate.", "Hello.");
  assert.equal(result.success, false);
  assert.equal(result.code, "AI_RESPONSE_TOO_LARGE");
  assert.match(result.error, /2 MiB limit/);
});

test("DeepSeek retries one empty transcript JSON response without response_format", async () => {
  const requests = [];
  const helpers = loadBackgroundHelpers({
    fetchImpl: async (url, options) => {
      if (url.startsWith("chrome-extension://")) {
        return { ok: true, text: async () => read("prompts/translation.md") };
      }
      requests.push(JSON.parse(options.body));
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: requests.length === 1
                ? ""
                : '{"segments":[{"id":"segment-0-0","text":"\u4e2d\u6587\u8bd1\u6587\u3002"}]}',
            },
          }],
        }),
      };
    },
  });
  const result = await helpers.handleTranslateContent(
    { segments: [{ id: "segment-0-0", text: "English source sentence." }] },
    "transcriptBatch",
    "zh",
    "Video",
  );
  assert.equal(result.success, true);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].response_format, { type: "json_object" });
  assert.equal(Object.hasOwn(requests[1], "response_format"), false);
  assert.equal(requests[0].max_tokens, 1536);
});

test("translation message watchdog rejects, clears its timer, and ignores late replies", async () => {
  let timeoutCallback;
  let timeoutDelay;
  let resolveMessage;
  let clearCount = 0;
  const helpers = loadSidepanelHelpers({
    sendMessage: () =>
      new Promise((resolve) => {
        resolveMessage = resolve;
      }),
    setTimeoutImpl(callback, delay) {
      timeoutCallback = callback;
      timeoutDelay = delay;
      return 73;
    },
    clearTimeoutImpl(id) {
      assert.equal(id, 73);
      clearCount += 1;
    },
  });

  const request = helpers.sendTranslationMessage({
    action: "translateContent",
  });
  assert.equal(timeoutDelay, 130_000);
  timeoutCallback();
  await assert.rejects(request, /timed out after 130 seconds.*Retry/i);
  assert.equal(clearCount, 1);

  resolveMessage({ success: true });
  await Promise.resolve();
  assert.equal(clearCount, 1);

  let successTimeoutCallback;
  let successClearCount = 0;
  const successfulHelpers = loadSidepanelHelpers({
    sendMessage: () => Promise.resolve({ success: true }),
    setTimeoutImpl(callback) {
      successTimeoutCallback = callback;
      return 91;
    },
    clearTimeoutImpl(id) {
      assert.equal(id, 91);
      successClearCount += 1;
    },
  });
  assert.deepEqual(
    await successfulHelpers.sendTranslationMessage({
      action: "translateContent",
    }),
    { success: true },
  );
  assert.equal(successClearCount, 1);
  successTimeoutCallback();
  assert.equal(successClearCount, 1);
});

test("Chinese prompt preserves natural bilingual-learning style rules", () => {
  const prompt = read("prompts/translation.md");
  assert.match(prompt, /Translate the complete thought/);
  assert.match(prompt, /Use 你, never 您/);
  assert.match(prompt, /spaces between Chinese and adjacent English words or digits/);
  assert.match(prompt, /source-language `text`/);
});
