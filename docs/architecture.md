# How OpenNoteTaker is put together

## The shape

```
                    ┌──────────────── the browser tab ────────────────┐
  microphone ──┐    │                                                  │
  tab audio ───┼───▶│  recorder.ts ──▶ WebM/Opus ──┐                   │
  a file ──────┘    │                              ▼                   │
                    │                    decode.ts → 16 kHz mono PCM   │
                    │                              │                   │
                    │      transformers.js ◀───────┤                   │
                    │      (Whisper ONNX,          │ the same buffer   │
                    │       WebGPU or wasm)        │ goes to both      │
                    │            │ segments       ▼                    │
                    │            ▼      ┌──────── note-wasm ─────────┐ │
                    │      note-core ◀──│ note-diarize   who spoke   │ │
                    │      Transcript   │ note-summary   topics      │ │
                    │            │      │ note-export    SRT, MD, …  │ │
                    │            │      │ note-credits   the price   │ │
                    │            ▼      └────────────────────────────┘ │
                    │      IndexedDB, with a retention policy          │
                    └──────────────┬───────────────────────────────────┘
                                   │ text only, only on a priced button
                                   ▼
                      openapps-gateway  /opennotetaker/{summarise,ask,translate}
                        ensure_affordable → vendor call → charge
                                   │
                                   ▼
                         openapps-server (the credit ledger)
```

Outside that tab, and optional, sits the meeting detector:

```
  ┌─── meet.google.com / zoom.us / teams.microsoft.com / meeting.tencent.com ───┐
  │  content.js   "you are in a Google Meet. Record it?"                        │
  └───────────────────────────────┬─────────────────────────────────────────────┘
                                  │ the user says yes
                                  ▼
                       background.js   detect(url) → platforms.js
                                  │
                                  │ chrome.tabCapture.getMediaStreamId
                                  │   { targetTabId: the meeting,
                                  │     consumerTabId: the app }
                                  ▼
  ┌─── the app's tab ───────────────────────────────────────────────────────────┐
  │  bridge.js ──postMessage──▶ ext-bridge.ts ──▶ the consent screen            │
  │                                                        │ the user agrees    │
  │                                          recorder.ts ◀─┘ getUserMedia(id)   │
  └─────────────────────────────────────────────────────────────────────────────┘
```

## Decisions worth knowing about

**The language is detected here, not by the library.** transformers.js has an
unimplemented `TODO` where Whisper's language detection belongs and silently
falls back to English, so every on-device transcription was decoded as English
whatever was being said. `lib/transcribe.ts` reads the language token Whisper
predicts after `<|startoftranscript|>` instead, on a four-second grid, merges
agreeing cells into runs, refines each boundary and snaps it to the quietest
100 ms nearby, then transcribes each run in its own language and puts the
results back on one timeline. Four seconds and not ten because a ten-second
grid cannot see an eight-second insert at all — both cells overlapping it read
as the language on either side.

**Each pass reads past its own cut and keeps only what it began.** A language
change is placed where the language changes, and a sentence does not always
stop there. Ending a pass exactly at the cut left the tail of a sentence
transcribed by neither pass — the next one had the audio but was reading it as
the wrong language.

**The detector is an extension, and the app does not require one.** A page
cannot see another tab, so noticing a meeting is impossible from inside the
product — it is the one capability that genuinely needs an extension, and the
reason competitors reach for a desktop application here. What the app must
never do is *depend* on it: Firefox and Safari have no build of it, and a
privacy product that makes you install more code before it works has argued
itself out of its own position. So the handover fills the consent screen in and
changes nothing else, and every path through `recorder.ts` still ends at the
share picker when there is no extension, or when the stream id it handed over
has expired.

**The microphone is a device the user chooses, not the system default.** Two
unrelated problems have the same fix. The default input is regularly the wrong
one — a webcam across the desk, a headset that was unplugged an hour ago — and
a desktop-application meeting can only be recorded at all through a loopback
driver, which appears to a browser as just another input. So `lib/inputs.ts`
lists them, and the names are asked for only once the browser will give them
without a fresh permission prompt.

**The input can be changed while the recording runs.** `MediaRecorder` is
recording the output of a mixing node, and that node's track is never replaced
— only what feeds into it changes. So swapping the microphone is a disconnect
and a connect, and the file continues as one piece with no gap, no second
header and no shift in the timeline. The new input is opened before the old one
is released, so an unplugged or busy device leaves the recording exactly as it
was rather than trading a working microphone for an error message.

**The processing chain is a checkbox because it is wrong half the time.** Echo
cancellation, noise suppression and automatic gain are correct for a microphone
in a room and destructive for a loopback device carrying an entire meeting.
Worse, the correct-looking default is the dangerous one: with echo cancellation
on and only a microphone recorded, the far side of a call is not attenuated but
*cancelled* — a silent failure discovered at playback, which is why the consent
screen states it rather than leaving it to the manual.

**A handed-over tab is played back as well as recorded.** `getDisplayMedia`
leaves the captured tab audible; `chrome.tabCapture` mutes it. Without the
monitor connection in `recorder.ts` the user would stop hearing the meeting the
moment they agreed to record it, and would blame the recorder.

**The consent screen is never skipped, including by the extension.** One click
from a banner in the call to a running recorder is technically available and is
the entire product being built against. The handover names the platform,
carries the tab's title into the consent record, ticks the source — and then
stops at the same screen everyone else reaches.

**The audio is decoded once and shared.** Whisper and the diarizer both want
16 kHz mono float samples, and the diarizer indexes into that buffer using the
transcript's own milliseconds. A second decode at a different rate would
misalign every speaker label — silently, and only on long recordings.

**Everything crosses the wasm boundary as a JSON string.** `serde-wasm-bindgen`
would save a serialisation and add a second implicit schema next to the
explicit one `serde_json` already gives us, disagreeing on exactly the cases
that matter: enum representations, `Option`, integers above 2⁵³. The exception
is PCM, which crosses as a typed-array view — an hour of audio is 230 MB as
JSON and 230 KB as bytes.

**Nothing in `note-wasm` can panic.** A Rust panic in wasm poisons the module:
every later call traps and the tab has to be reloaded. So the work lives in a
`work` module returning `Result<_, String>` — fully tested on the host — and
the exported functions are one-line wrappers that convert to `JsError`.

**`note-credits` is compiled twice.** To wasm for the price the browser shows,
natively into the gateway for the price it charges. The request carries no
price and the gateway would ignore one if it did. That is not tidiness: it is
the mechanism by which the two figures cannot drift apart.

**Speaker separation is classical DSP, not a neural model.** Pre-emphasis,
framing, a hand-written radix-2 FFT, a mel filterbank, DCT, energy-based voice
activity detection, then agglomerative clustering with average linkage. It is
less accurate than pyannote. It is also a few kilobytes of WebAssembly with
nothing to download, which is what lets speaker separation be free and offline.
The interface states its limits — similar voices, crosstalk, one person
changing microphone — and every assignment is editable.

**Two segments are compared as distributions, not as points.** A segment's
fingerprint is a diagonal Gaussian over its voiced frames — a mean and a
variance per cepstral coefficient — and the distance between two of them is the
symmetric Kullback–Leibler divergence. The first version concatenated the mean
and the standard deviation into one vector and took a cosine between two of
those, which discards the only thing that decides whether a difference in means
matters: how much each segment was moving around its own mean anyway. Two
sentences from one person differ a great deal in mean MFCC, because they contain
different words; what separates *people* is that difference measured against
the within-segment scatter, and a cosine cannot see a ratio. On real speech the
consequence was severe — one person talking for a minute came back as four
speakers — and it was invisible to a test suite built on synthesised vowels,
whose frames barely vary within a segment at all.

**Segments shorter than 900 ms are not characterised.** Half a second of speech
covers a handful of phonemes, so its statistics describe what was said far more
than who said it, and it lands wherever those phonemes sit — usually far from
everything, which makes it a speaker of its own. It costs nothing to refuse:
`fill_gaps` hands the line to the neighbour it almost certainly belongs to.
This was the second-largest source of invented speakers after the distance.

**The threshold is a measured plateau, not a tuned point.** Within one person,
merges top out around 0.27 of the new divergence; the first merge across two
people costs 0.39 or more. Anything from 0.25 to 0.45 gives the same answer on
every fixture, and the shipped 0.35 sits in the middle of that band. A constant
that is only right at one value is a constant that is about to be wrong.

**The subtitle and document exporters disagree on purpose.** SRT and WebVTT
must preserve Whisper's cue boundaries exactly; a merged cue is a wall of text
that outlasts the sentence. Text, Markdown and HTML must do the opposite,
because Whisper cuts on its 30-second window and on breaths, and an unmerged
document reads as one-line paragraphs.

**The `session` retention policy uses a different store.** Not an IndexedDB
store that is emptied on close — an in-memory one that never writes. "Deleted
when you close the tab" and "never written to disk" are different promises,
and only the second survives a browser crash.

## The crates

| Crate | Contents |
|---|---|
| `note-core` | `Segment`, `Transcript`, `Speaker`; timeline arithmetic, merge and split, BM25 search, redaction, clock formatting |
| `note-diarize` | FFT, MFCC, voice activity detection, agglomerative clustering, segment embeddings |
| `note-summary` | The free extractive summariser and its per-language cue tables; the prompts and strict parsers the paid summariser, Q&A and translation share with the gateway |
| `note-export` | Eight formats |
| `note-credits` | `Rates`, `Quote`, and the three quoting functions |
| `note-wasm` | The `wasm_bindgen` surface — the only crate that knows it is in a browser |

## Languages

Three decisions worth knowing about.

**Cues are a table, not five flat lists.** Topic extraction is arithmetic over
word frequency and works in any language `note-summary` can segment. Cue
detection — what marks an action, a decision, a deadline — is phrase matching
and is per-language by nature. Holding one struct per language means the
interface can *name* the languages it works in (`cueLanguages()`), a
code-switched meeting gets both languages, and a language cannot be half-added
because the struct has no optional fields.

**Chinese topics come from character n-grams, with two prunes.** There is no
segmentation dictionary here, so words are found as two- and three-character
spans. Raw, that fills the topic list with debris: 服务器 shatters into 服务 and
务器, and 上个季度 yields 个季. Two rules clean it up — an n-gram that never
occurs outside a longer one is dropped as a fragment, and one that begins or
ends on a grammatical particle (的, 了, 个) is dropped as a span across a word
boundary. Simplified and Traditional stop lists are separate, because they are
different character sets and not a conversion.

**Nothing user-facing is an English string in Rust.** `note-export` takes a
`Labels` struct; the extractive summariser returns `SummaryStats` rather than a
composed sentence. Both exist so the crates hold no language: only the interface
knows what the reader wants, and a "6 sentences · about 2 min · 2 speakers"
template translates cleanly into languages with no plurals, which a sentence
would not.

## Testing

`cargo test --workspace` — 170 tests, four of which run on recorded speech in
`crates/note-diarize/tests/fixtures`. Those files are there because the
synthesised voices could not do the job: they were green throughout the period
when one person talking came back as four speakers. A synthesiser holding a
vowel produces frames nearly identical to each other, so a segment's
within-segment spread is ~0 — and whether the difference *between* two segments
is large next to the spread *within* them is the entire question a diarizer
answers. Audio with no spread cannot pose it.

The synthesised voices were kept, and now articulate: the tract glides between
vowel targets at a syllable rate, and speaker identity lives in the *scale* of
the tract, as it does in a person. They cover the algebra — grouping, a
supplied count, stable label numbering, degenerate inputs — while the
calibration is checked on speech. The fixtures are macOS `say` voices, so they
are regenerable and carry nobody's actual voice; `npm run smoke` runs the same
one-speaker file through the wasm the app calls.

`npm run smoke` — 69 checks, driving the real built bundle in a real Chromium.
It stubs transcription at the one seam where model output enters the app,
because downloading hundreds of megabytes per CI run to test somebody else's
inference engine is not a test of this application. Everything downstream of
that seam runs for real. It also watches the network per screen and fails if
any screen but Account contacts anything.

`npm run bilingual` — the one check that cannot be faked, and the one that is
not in the suite above: a real Whisper checkpoint, downloaded, transcribing a
real bilingual recording, asserting that the Chinese half arrives as Chinese
characters and the English half as Latin script. It is opt-in because it pulls
~80 MB per run. The fixture is synthesised by
`apps/web/scripts/make-bilingual-fixture.sh` from macOS's own voices, so no
recording of a real meeting is committed here to test one.

`npm run test:extension` — the detector's URL rules, in both directions: every
meeting URL these four products have shipped is recognised, and a Zoom pricing
page, a Teams chat and a Google search for "zoom" are not. It also asserts the
manifest injects on exactly the hosts the detector knows, and that no message
the code asks for is missing from any of its three locales.

`npm run test:extension:e2e` — the whole handover in a real browser: the
extension is loaded unpacked, a page is served *from `meet.google.com`* by
intercepting the request, and the test then does what a user does. Press
Record; the app opens on the consent screen, naming the meeting it came from,
with the source ticked and nothing recording. It also checks that "never ask
here" is obeyed. What it cannot cover is the stream id itself — `tabCapture`
will not mint one for a driven click — so what it exercises is the fallback,
which is the path every user hits whenever the shortcut is unavailable.

`cargo test -p openapps-gateway` — 56 tests, of which 17 cover these routes:
that an anonymous request never reaches the vendor, an unaffordable one never
reaches the vendor, a failed call charges nothing, an unreadable reply charges
nothing, a retry charges once, a client-supplied price is ignored, and audio
smuggled into an extra field never reaches the vendor.
