const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const options = require("../options.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function createLocalStorage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("Settings copy covers English and Simplified Chinese", () => {
  assert.equal(options.translate("en", "pageTitle"), "YouTube Digest Settings");
  assert.equal(options.translate("zh-CN", "pageTitle"), "YouTube Digest 设置");
  assert.equal(
    options.translate("zh-CN", "clearedDigests", { count: 2 }),
    "已清除 2 条缓存。",
  );
  assert.equal(options.translate("zh-CN", "showApiKey"), "显示");

  assert.deepEqual(
    Object.keys(options.COPY.en).sort(),
    Object.keys(options.COPY["zh-CN"]).sort(),
  );

  const html = read("options.html");
  const referencedKeys = [
    ...html.matchAll(/data-i18n(?:-html|-aria-label)?="([^"]+)"/g),
  ].map((match) => match[1]);
  for (const key of referencedKeys) {
    assert.ok(options.COPY.en[key], `Missing English copy for ${key}`);
    assert.ok(options.COPY["zh-CN"][key], `Missing Chinese copy for ${key}`);
  }
  assert.doesNotMatch(JSON.stringify(options.COPY), /—/);
  assert.doesNotMatch(html, /—/);
});

test("language preference persists through extension-compatible storage", async () => {
  const storedValues = {};
  const chromeApi = {
    storage: {
      local: {
        async get(key) {
          return Object.hasOwn(storedValues, key)
            ? { [key]: storedValues[key] }
            : {};
        },
        async set(items) {
          Object.assign(storedValues, items);
        },
        async remove() {},
        async clear() {},
      },
    },
  };
  const storage = options.createStorageAdapter(chromeApi);

  await options.persistPreferredLanguage(storage, "zh-CN");

  assert.equal(storedValues[options.LANGUAGE_STORAGE_KEY], "zh-CN");
  assert.equal(await options.readPreferredLanguage(storage), "zh-CN");
});

test("missing interface language follows the system locale and falls back to Simplified Chinese", async () => {
  const storage = options.createStorageAdapter(null, createLocalStorage());

  assert.equal(await options.readPreferredLanguage(storage, "ja-JP"), "ja");
  assert.equal(await options.readPreferredLanguage(storage, "fr-CA"), "fr");
  assert.equal(await options.readPreferredLanguage(storage, "de-DE"), "zh-CN");
  assert.equal(options.resolveSystemLanguage("zh-HK"), "zh-CN");
});

test("non-extension preview safely persists language in localStorage", async () => {
  const localStorage = createLocalStorage();
  const firstSession = options.createStorageAdapter(null, localStorage);

  await options.persistPreferredLanguage(firstSession, "zh-CN");

  const reopenedSession = options.createStorageAdapter(null, localStorage);
  assert.equal(await options.readPreferredLanguage(reopenedSession), "zh-CN");
  assert.equal(options.normalizeLanguage("unsupported"), "en");
});

test("language and translation controls expose compact selects", () => {
  const html = read("options.html");
  assert.match(
    html,
    /<select id="interfaceLanguage"[^>]*aria-label="Interface language"/,
  );
  assert.match(html, /<select id="sourceLanguage" class="language-control" name="sourceLanguage"><\/select>/);
  assert.match(html, /<select id="targetLanguage" class="language-control" name="targetLanguage"><\/select>/);
  assert.equal(Object.keys(options.INTERFACE_LANGUAGE_NAMES).length, 13);
  assert.match(
    read("options.css"),
    /\.translation-language-grid select\s*\{[^}]*width:\s*108px;/,
  );
  assert.match(read("options.js"), /function saveSettingsSilently\(\)/);
  assert.match(read("options.js"), /supadataApiKey: supadataApiKeyInput\.value/);
  assert.match(read("options.js"), /supadataApiKeyInput\.addEventListener\("input", \(\) => \{/);
  assert.match(read("options.js"), /key === "ytd_note_translation_cache"/);
  assert.match(read("options.js"), /chrome\?\.storage\?\.onChanged\?\.addListener\?/);
  assert.match(read("options.js"), /sourceLanguageSelect\.value = settings\.sourceLanguage/);
  assert.match(read("options.js"), /sourceLanguageSelect\.addEventListener\("change"/);
  assert.match(read("options.js"), /targetLanguageSelect\.addEventListener\("change"/);
  assert.match(html, /data-api-key-toggle="supadataApiKey"/);
  assert.match(html, /data-api-key-toggle="aiApiKey"/);
});

test("customization guidance is concise and has a visible placeholder reminder", () => {
  const html = read("options.html");
  const steps = html.match(
    /<ol class="customization-steps">([\s\S]*?)<\/ol>/,
  );

  assert.ok(steps, "Expected a numbered customization guide");
  assert.equal((steps[1].match(/<li\b/g) || []).length, 3);
  assert.match(html, /class="prompt-reminder"/);
  assert.match(html, /role="note"/);
  assert.equal(
    options.translate("zh-CN", "customizationReminder"),
    "复制前，请先把 [PROVIDER] 和 [MODEL] 替换成你想使用的服务和模型。",
  );
  assert.equal(
    options.translate("en", "customizationStepFolder"),
    "Open the extracted YouTube Digest project folder in your coding agent.",
  );
  assert.equal(
    options.translate("zh-CN", "customizationStepFolder"),
    "在编程 Agent 中打开 YouTube Digest 解压后的项目文件夹。",
  );
  assert.doesNotMatch(html, /~\/Documents\/youtube-digest/);
  assert.doesNotMatch(html, /%USERPROFILE%\\Documents\\youtube-digest/);
});

test("customization prompt switches languages and preserves technical values", () => {
  const html = read("options.html");
  const englishPrompt = options.translate("en", "customizationPrompt");
  const chinesePrompt = options.translate("zh-CN", "customizationPrompt");

  assert.match(html, /placeholder="Paste your Supadata key"/);
  assert.match(html, /placeholder="Paste your DeepSeek key"/);
  assert.match(html, /https:\/\/dash\.supadata\.ai\/auth\/sign-up/);
  assert.match(html, /https:\/\/platform\.deepseek\.com\/api_keys/);
  assert.ok(html.includes(`>${englishPrompt}</textarea>`));
  assert.match(chinesePrompt, /^请把当前本地 YouTube Digest 工作区改为使用/);
  assert.notEqual(chinesePrompt, englishPrompt);
  assert.match(
    englishPrompt,
    /Keep DeepSeek-only request fields and retry behavior isolated to DeepSeek\. Handle provider-specific rules separately so one provider does not affect another\./,
  );
  assert.match(
    chinesePrompt,
    /DeepSeek 专用的请求参数和重试逻辑继续只用于 DeepSeek。新服务的专属规则请单独处理，避免相互影响。/,
  );

  for (const prompt of [englishPrompt, chinesePrompt]) {
    assert.match(prompt, /\[PROVIDER\]/);
    assert.match(prompt, /\[MODEL\]/);
    assert.match(prompt, /manifest\.json/);
    assert.match(prompt, /README\.md/);
    assert.match(prompt, /README\.zh-CN\.md/);
    assert.match(prompt, /PRIVACY\.md/);
    assert.match(prompt, /SECURITY\.md/);
    assert.match(prompt, /npm test/);
    assert.match(prompt, /npm run check/);
    assert.match(prompt, /npm run package/);
    assert.doesNotMatch(prompt, /—/);
  }
  const textareaTag = html.match(/<textarea id="customizationPrompt"[^>]*>/);
  assert.ok(textareaTag, "Expected the customization prompt textarea");
  assert.doesNotMatch(textareaTag[0], /\sreadonly(?:\s|=|>)/);
  assert.match(
    textareaTag[0],
    /aria-describedby="customizationPromptReminder"/,
  );
  assert.doesNotMatch(html, /<textarea id="customizationPrompt"[^>]*data-i18n/);
});

test("language switching preserves edited prompt drafts for the page session", () => {
  const drafts = options.createPromptDrafts();
  const chineseDefault = drafts["zh-CN"];

  const chinese = options.switchPromptDraft(
    drafts,
    "en",
    "zh-CN",
    "Edited English [PROVIDER] [MODEL]",
  );
  assert.equal(chinese.prompt, chineseDefault);

  const english = options.switchPromptDraft(
    drafts,
    "zh-CN",
    "en",
    "已编辑中文 [PROVIDER] [MODEL]",
  );
  assert.equal(english.prompt, "Edited English [PROVIDER] [MODEL]");

  const restoredChinese = options.switchPromptDraft(
    drafts,
    "en",
    "zh-CN",
    english.prompt,
  );
  assert.equal(restoredChinese.prompt, "已编辑中文 [PROVIDER] [MODEL]");
});

test("copy helper writes the current edited textarea value", async () => {
  const writes = [];
  const clipboard = {
    async writeText(value) {
      writes.push(value);
    },
  };

  await options.copyPromptValue(
    clipboard,
    "My edited prompt for [PROVIDER] and [MODEL]",
  );

  assert.deepEqual(writes, ["My edited prompt for [PROVIDER] and [MODEL]"]);
});

test("localized prompt updates preserve the textarea selection and scroll", () => {
  const textarea = {
    value: options.translate("en", "customizationPrompt"),
    selectionStart: 12,
    selectionEnd: 48,
    selectionDirection: "forward",
    scrollTop: 90,
    scrollLeft: 7,
    setSelectionRange(start, end, direction) {
      this.selectionStart = start;
      this.selectionEnd = end;
      this.selectionDirection = direction;
    },
  };
  const chinesePrompt = options.translate("zh-CN", "customizationPrompt");

  options.updateLocalizedPrompt(textarea, chinesePrompt);

  assert.equal(textarea.value, chinesePrompt);
  assert.equal(textarea.selectionStart, 12);
  assert.equal(textarea.selectionEnd, 48);
  assert.equal(textarea.selectionDirection, "forward");
  assert.equal(textarea.scrollTop, 90);
  assert.equal(textarea.scrollLeft, 7);
});
