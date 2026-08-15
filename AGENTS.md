# AGENTS.md

Rules for AI coding agents working in this repository. YouTube Digest is a
Manifest V3 Chrome side-panel extension written in plain HTML/CSS/JavaScript
with no build step.

## Commands

- `npm test`: node:test suite in `tests/`
- `npm run check`: runs the release gate (allowlist, syntax, credential scan, tests)
- `npm run package`: builds the public ZIP via `scripts/package-extension.sh`

## Hard constraints (tests enforce these)

1. **Release allowlist**: every file shipped to users must be listed in
   `public_allowlist` inside `scripts/check-release.sh`. New runtime files
   (scripts, HTML, prompts) referenced by the manifest, HTML, or
   `loadPromptSection` fail `npm run check` until allowlisted.
2. **No em dashes (`—`)** in README.md, README.zh-CN.md, manifest
   descriptions, or UI copy dictionaries. Regex-enforced.
3. **`background.js` keeps exactly 4 `await requestAiCompletion({` call
   sites** (`tests/release.test.js` counts them). New AI features must reuse
   `callAiTranslation` or the four existing handlers.
4. **AI prompts live in `prompts/*.md`**, loaded at runtime by `## Section`
   heading through `loadPromptSection` (it reads the first fenced code block
   in the section). Release tests assert the section headings exist.
5. **UI copy parity**: `UI_COPY` in `sidepanel.js` and `COPY` in `options.js`
   must define identical `en` and `zh-CN` key sets, and every
   `data-i18n` / `data-i18n-title` / `data-i18n-aria-label` key used in HTML
   must exist in both languages.
6. **DeepSeek is the only published provider.** Options page must not grow
   provider / base URL / model inputs (release test forbids them). Other
   models are supported through the Local remix customization prompt.
7. **README.md and README.zh-CN.md are updated together**; release tests
   couple their assertions (features, roadmap, install guidance).
8. Tests load `sidepanel.js` / `background.js` into `node:vm` sandboxes with
   a fake `chrome`: top-level code must not touch `chrome.*` outside
   functions or the `DOMContentLoaded` handler. Cross-realm values need a
   `JSON.parse(JSON.stringify(...))` round trip before `assert.deepEqual`.

## Storage keys (chrome.storage.local)

- `ytd_settings`: keys and translation language pair (`settings.js` owns
  validation; 13 languages in `TRANSLATION_LANGUAGES`)
- `ytd_options_language`: options/sidepanel interface language
- `digest_<videoId>`: per-video transcript, analysis, translation caches
- `ytd_notes`: saved notes

## Where to read more

- `README.md` / `README.zh-CN.md`: features, install, cost estimates
- `PRIVACY.md`: exact data flow to Supadata and DeepSeek
- `prompts/*.md`: every AI prompt with variable documentation
- `docs/superpowers/specs/`: design notes for larger changes
