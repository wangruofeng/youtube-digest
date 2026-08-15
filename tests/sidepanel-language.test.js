const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const options = require("../options.js");

function loadSidepanelUiHelpers() {
  const listeners = { addListener() {} };
  const sandbox = {
    console,
    URL,
    TextDecoder,
    TextEncoder,
    setTimeout: () => 0,
    clearTimeout: () => {},
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
      createElement: () => ({ set textContent(text) {}, get innerHTML() { return ""; } }),
    },
    chrome: {
      runtime: { onMessage: listeners, sendMessage: () => Promise.resolve({}) },
      windows: { getCurrent: () => Promise.resolve({ id: 1 }) },
      tabs: { onUpdated: listeners, onActivated: listeners },
    },
    YTD_SETTINGS: {},
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("sidepanel.js"), sandbox);
  return sandbox.__YTD_TRANSCRIPT_TESTING__;
}

test("side panel copy covers English and Simplified Chinese", () => {
  const { UI_COPY, t, setUiLanguage, normalizeUiLanguage } =
    loadSidepanelUiHelpers();

  assert.deepEqual(
    Object.keys(UI_COPY.en).sort(),
    Object.keys(UI_COPY["zh-CN"]).sort(),
  );
  assert.doesNotMatch(JSON.stringify(UI_COPY), /—/);

  setUiLanguage("en");
  assert.equal(t("tabTranscript"), "Transcript");
  assert.equal(t("originalWithLanguage", { language: "en" }), "Original (en)");
  assert.equal(t("subtitleBadge", { label: "Original" }), "From video subtitles · Original");

  setUiLanguage("zh-CN");
  assert.equal(t("tabTranscript"), "字幕");
  assert.equal(t("backToTopTitle"), "回到顶部");
  assert.equal(t("originalWithLanguage", { language: "en" }), "原文（en）");
  assert.equal(t("subtitleBadge", { label: "原文" }), "来自视频字幕 · 原文");

  // Unknown languages and unknown keys fall back safely.
  assert.equal(normalizeUiLanguage("fr"), "fr");
  setUiLanguage("unsupported");
  assert.equal(t("tabTranscript"), "Transcript");
  assert.equal(t("missingKey"), "");
});

test("side panel reads the preferred language persisted by the options page", () => {
  const js = read("sidepanel.js");
  const html = read("sidepanel.html");

  // The panel must watch the exact storage key the settings page writes.
  assert.ok(js.includes(options.LANGUAGE_STORAGE_KEY));
  assert.match(js, /loadPreferredUiLanguage\(\)/);
  assert.match(js, /chrome\.storage\?\.onChanged\?\.addListener\?/);
  assert.match(js, /if \(currentTranscript\) renderTranscript\(\);/);
  assert.match(js, /if \(currentAnalysis\) renderAnalysisResults\(currentAnalysis\);/);
  assert.match(js, /getDigestCacheKey\(videoId, sourceLanguage/);
  assert.match(js, /startDigest\(currentVideoId, currentVideoUrl, true\)/);
  assert.match(js, /generation !== digestGeneration/);
  assert.match(js, /cached\.analysisSourceLanguage === requestedSourceLanguage/);
  assert.match(js, /targetLanguage !== getTargetLanguage\(\)\.code/);
  assert.match(js, /showSourceLanguageUnavailableError\(transcriptResult\.message\)/);
  assert.match(js, /sourceLanguage: "en"/);

  // Every static label in the panel markup resolves in both languages.
  const { UI_COPY } = loadSidepanelUiHelpers();
  assert.equal(UI_COPY.en.switchSourceLanguageToEnglish, "Switch original language to English");
  assert.equal(UI_COPY["zh-CN"].switchSourceLanguageToEnglish, "将原文语言切换为英语");
  const attributePattern = /data-i18n(?:-title|-aria-label)?="([^"]+)"/g;
  for (const match of html.matchAll(attributePattern)) {
    assert.ok(UI_COPY.en[match[1]], `Missing English copy for ${match[1]}`);
    assert.ok(UI_COPY["zh-CN"][match[1]], `Missing Chinese copy for ${match[1]}`);
  }
});

test("back-to-top pill is wired to the transcript tab scroll position", () => {
  const html = read("sidepanel.html");
  const css = read("sidepanel.css");
  const js = read("sidepanel.js");

  assert.match(html, /id="backToTopBtn"[\s\S]*?aria-label="Back to top"/);
  assert.match(css, /\.back-to-top-btn\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*18px;[^}]*right:\s*16px;/);
  assert.match(js, /function updateBackToTopVisibility\(\)/);
  assert.match(js, /BACK_TO_TOP_THRESHOLD_PX = 400/);
  assert.match(
    js,
    /addEventListener\("scroll", updateBackToTopVisibility, \{ passive: true \}\)/,
  );
  // Clicking back-to-top must pause auto-scroll so playback tracking cannot
  // drag the user straight back down.
  assert.match(
    js,
    /getElementById\("backToTopBtn"\)\?\.addEventListener\("click", \(\) => \{[\s\S]*?autoScrollEnabled = false;[\s\S]*?scrollTo\(\{ top: 0, behavior: "smooth" \}\)/,
  );
});
