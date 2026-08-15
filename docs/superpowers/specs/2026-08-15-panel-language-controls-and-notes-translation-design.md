# Panel language controls and notes translation

## Scope

Move each content-language control onto the right side of its relevant title
row, and give saved notes the same Original, Chinese, and bilingual modes as
transcript and overview content.

## Layout

- Transcript: place its language control beside `Full Transcript`; leave Copy
  and Export on the following actions row.
- Overview: remove the standalone language bar and place its control beside
  `Chapters`. The control applies to chapters and key quotes.
- Notes: place a new language control beside `Saved Notes`; leave the This
  Video and All Notes filter controls on the following row.

The controls share the existing compact pill styling and retain their loading
spinner at the end of the pill. Narrow widths may wrap the title and control
to separate lines without clipping either.

## Translation behavior

- Notes support `original`, `zh`, and `bilingual` modes.
- A note is translated as one independent segment using the established
  subtitle-compatible request type.
- The notes queue uses the existing four-request concurrency limit.
- Cache keys are stable per note ID and target language, so both filters reuse
  completed translations. Cached text is stored separately from the note record
  in local storage for 30 days.
- Each note shows its own pending state, error, and Retry action. One failure
  does not block other notes.
- Original mode performs no translation requests. Chinese mode hides the
  source text; bilingual mode renders source then Chinese beneath it.

## State and rendering

`loadNotes` retains the current filter identity and stores the rendered note
set for a mode change. Changing the notes language invalidates only in-flight
notes requests; switching video or filters invalidates stale work before the
new list renders.

## Validation

- Node tests cover title-row placement, all three notes modes, stable note
  keys, individual request payloads, cache reuse, and four-worker dispatch.
- Release checks and diff checks must pass.
- In the extension, verify a saved note in both This Video and All Notes views
  can change Original -> Chinese -> Bilingual without a shared list failure.
