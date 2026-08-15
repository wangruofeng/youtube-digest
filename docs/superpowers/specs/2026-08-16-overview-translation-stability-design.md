# Overview translation stability

## Scope

Stop the Overview tab from visibly jumping while chapter and quote translations
arrive. Keep the existing translation API, cache keys, retry behavior, and
four-request concurrency limit unchanged.

## Design

Switching the Overview language mode continues to render the complete overview
once so every segment has its pending, cached, or original state. After that
initial render, a completed or failed translation updates only the DOM nodes
for the matching stable overview segment ID. It must not call
`renderAnalysisResults` again.

Each rendered chapter title, chapter summary, and quote receives a stable
segment identifier. A small update helper finds that rendered segment and
replaces its language-specific content and retry handler in place. If a stale
translation result arrives after a mode or video change, the existing
generation guard continues to discard it.

## Error handling

The in-place helper is a no-op when the expected segment is absent. This can
happen when an older request completes after the user changes video or mode;
the generation guard prevents state corruption, and no full rerender is needed.

## Validation

- Add focused node tests proving translation completion and failure update a
  targeted overview segment without invoking the whole overview renderer.
- Run `npm test` and `npm run check`.
- Manually load the unpacked extension, open Overview, switch to Chinese or
  bilingual, and verify completed translations do not move the visible list or
  reset its scroll position.
