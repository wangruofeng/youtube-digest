const test = require("node:test");
const assert = require("node:assert/strict");

const settings = require("../settings.js");

test("DeepSeek defaults use V4 Flash", () => {
  const normalized = settings.normalize({
    provider: "unexpected",
    aiApiKey: "  example-key  ",
    aiBaseUrl: "https://api.example.com/v1",
    aiModel: "example-model",
    supadataApiKey: "  example-supadata  ",
  });

  assert.equal(normalized.provider, "deepseek");
  assert.equal(normalized.aiBaseUrl, "https://api.deepseek.com");
  assert.equal(normalized.aiModel, "deepseek-v4-flash");
  assert.equal(normalized.aiApiKey, "example-key");
  assert.equal(normalized.supadataApiKey, "example-supadata");
  assert.equal(
    settings.chatCompletionsUrl(),
    "https://api.deepseek.com/chat/completions",
  );
});

test("legacy custom migration clears only the AI key and is idempotent", () => {
  const legacy = {
    provider: "custom",
    aiApiKey: "custom-secret",
    aiBaseUrl: "https://api.example.com/v1",
    aiModel: "example-model",
    supadataApiKey: " supadata-secret ",
  };
  const first = settings.migrateLegacyCustom(legacy);

  assert.equal(first.migrated, true);
  assert.equal(first.settings.provider, "deepseek");
  assert.equal(first.settings.aiBaseUrl, settings.DEFAULTS.aiBaseUrl);
  assert.equal(first.settings.aiModel, settings.DEFAULTS.aiModel);
  assert.equal(first.settings.aiApiKey, "");
  assert.equal(first.settings.supadataApiKey, "supadata-secret");

  const second = settings.migrateLegacyCustom(first.settings);
  assert.equal(second.migrated, false);
  assert.deepEqual(second.settings, first.settings);

  const configuredDeepSeek = settings.normalize({
    ...first.settings,
    aiApiKey: "new-deepseek-key",
  });
  assert.equal(configuredDeepSeek.aiApiKey, "new-deepseek-key");
});

test("Supadata receives a canonical YouTube URL", () => {
  assert.equal(
    settings.canonicalYouTubeUrl("ydTeb_I0b94"),
    "https://www.youtube.com/watch?v=ydTeb_I0b94",
  );
  assert.throws(
    () => settings.canonicalYouTubeUrl('"><script>'),
    /Invalid YouTube video ID/,
  );
});

test("translation languages preserve English source and use the system language for target", () => {
  const defaults = settings.normalize({}, "ja-JP");
  assert.equal(defaults.sourceLanguage, "en");
  assert.equal(defaults.targetLanguage, "ja");

  const configured = settings.normalize({
    sourceLanguage: "ja",
    targetLanguage: "fr",
  });
  assert.equal(configured.sourceLanguage, "ja");
  assert.equal(configured.targetLanguage, "fr");
  assert.equal(settings.TRANSLATION_LANGUAGES.length, 13);
  assert.equal(settings.getTranslationLanguage("fr").nativeName, "Français");
  assert.equal(settings.normalize({ sourceLanguage: "invalid" }).sourceLanguage, "en");
  assert.equal(
    settings.normalize({ targetLanguage: "invalid" }, "unsupported").targetLanguage,
    "zh-CN",
  );
  assert.equal(settings.getSystemTranslationLanguage("fr-CA"), "fr");
  assert.equal(settings.getSystemTranslationLanguage("zh-HK"), "zh-CN");
  assert.equal(settings.getSystemTranslationLanguage("de-DE"), "zh-CN");
});
