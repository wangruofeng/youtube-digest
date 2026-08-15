/**
 * Shared, non-secret configuration helpers.
 *
 * API keys are stored in chrome.storage.local by options.js. This file contains
 * defaults and validation only, so it is safe to publish.
 */
var YTD_SETTINGS = (() => {
  const STORAGE_KEY = "ytd_settings";
  const TRANSLATION_LANGUAGES = Object.freeze([
    { code: "en", name: "English", nativeName: "English", supadataCode: "en" },
    { code: "zh-CN", name: "Simplified Chinese", nativeName: "简体中文", supadataCode: "zh" },
    { code: "zh-TW", name: "Traditional Chinese", nativeName: "繁體中文", supadataCode: "zh-TW" },
    { code: "ja", name: "Japanese", nativeName: "日本語", supadataCode: "ja" },
    { code: "ko", name: "Korean", nativeName: "한국어", supadataCode: "ko" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी", supadataCode: "hi" },
    { code: "es", name: "Spanish", nativeName: "Español", supadataCode: "es" },
    { code: "fr", name: "French", nativeName: "Français", supadataCode: "fr" },
    { code: "ar", name: "Arabic", nativeName: "العربية", supadataCode: "ar" },
    { code: "bn", name: "Bengali", nativeName: "বাংলা", supadataCode: "bn" },
    { code: "pt", name: "Portuguese", nativeName: "Português", supadataCode: "pt" },
    { code: "ru", name: "Russian", nativeName: "Русский", supadataCode: "ru" },
    { code: "ur", name: "Urdu", nativeName: "اردو", supadataCode: "ur" },
  ]);
  const TRANSLATION_LANGUAGE_CODES = new Set(
    TRANSLATION_LANGUAGES.map((language) => language.code),
  );
  const DEFAULTS = Object.freeze({
    provider: "deepseek",
    aiApiKey: "",
    aiBaseUrl: "https://api.deepseek.com",
    aiModel: "deepseek-v4-flash",
    supadataApiKey: "",
    sourceLanguage: "en",
    targetLanguage: "zh-CN",
  });

  function isLegacyCustom(input) {
    return !!input && input.provider === "custom";
  }

  function getSystemTranslationLanguage(
    systemLanguage = globalThis.navigator?.language,
  ) {
    const locale = String(systemLanguage || "").trim().toLowerCase();
    const exactMatch = TRANSLATION_LANGUAGES.find(
      (language) => language.code.toLowerCase() === locale,
    );
    if (exactMatch) return exactMatch.code;

    const primaryLanguage = locale.split("-")[0];
    if (primaryLanguage === "zh") return "zh-CN";
    const primaryMatch = TRANSLATION_LANGUAGES.find(
      (language) => language.code.toLowerCase() === primaryLanguage,
    );
    return primaryMatch?.code || DEFAULTS.targetLanguage;
  }

  function normalize(
    input = {},
    targetLanguageFallback = getSystemTranslationLanguage(),
  ) {
    return {
      provider: DEFAULTS.provider,
      aiApiKey: isLegacyCustom(input)
        ? ""
        : typeof input.aiApiKey === "string"
          ? input.aiApiKey.trim()
          : "",
      aiBaseUrl: DEFAULTS.aiBaseUrl,
      aiModel: DEFAULTS.aiModel,
      supadataApiKey:
        typeof input.supadataApiKey === "string"
          ? input.supadataApiKey.trim()
          : "",
      sourceLanguage: normalizeTranslationLanguage(input.sourceLanguage, "en"),
      targetLanguage: normalizeTranslationLanguage(
        input.targetLanguage,
        getSystemTranslationLanguage(targetLanguageFallback),
      ),
    };
  }

  function migrateLegacyCustom(input = {}, targetLanguageFallback) {
    return {
      settings: normalize(input, targetLanguageFallback),
      migrated: isLegacyCustom(input),
    };
  }

  function normalizeTranslationLanguage(value, fallback) {
    return TRANSLATION_LANGUAGE_CODES.has(value) ? value : fallback;
  }

  function getTranslationLanguage(code) {
    return (
      TRANSLATION_LANGUAGES.find((language) => language.code === code) ||
      TRANSLATION_LANGUAGES[0]
    );
  }

  function chatCompletionsUrl() {
    return `${DEFAULTS.aiBaseUrl}/chat/completions`;
  }

  function canonicalYouTubeUrl(videoId) {
    const normalized = String(videoId || "").trim();
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(normalized)) {
      throw new Error("Invalid YouTube video ID.");
    }
    return `https://www.youtube.com/watch?v=${normalized}`;
  }

  return {
    STORAGE_KEY,
    DEFAULTS,
    TRANSLATION_LANGUAGES,
    isLegacyCustom,
    getTranslationLanguage,
    getSystemTranslationLanguage,
    normalize,
    normalizeTranslationLanguage,
    migrateLegacyCustom,
    chatCompletionsUrl,
    canonicalYouTubeUrl,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_SETTINGS;
}
