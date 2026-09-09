# OpenNoteTaker

**Meeting notes that never leave your machine.**

Recording, transcription, speaker separation, summaries and every export
format run inside the browser tab, on your own processor or GPU. No bot joins
your call. No audio is uploaded. There is no subscription to cancel.

```
npm install
npm run build:wasm      # needs a Rust toolchain + wasm-bindgen 0.2.126
npm run dev             # http://localhost:5182
```

Or run the whole thing yourself, with no toolchain:

```
docker compose up --build   # http://localhost:8088
```

## What it does

| | Where it runs | Price |
|---|---|---|
| Transcription, 99 languages | Your browser | Free |
| Interface in English, 简体中文, 繁體中文 | Your browser | Free |
| A timestamp on every sentence | Your browser | Free |
| Telling speakers apart | Your browser | Free |
| Recording without a bot in the call | Your browser | Free |
| Noticing the Meet, Zoom, Teams or VooV call you just joined | An optional extension | Free |
| SRT, WebVTT, text, Markdown, JSON, CSV, HTML | Your browser | Free |
| Topics, key lines, action items, decisions | Your browser | Free |
| …with cue detection in 9 languages | Your browser | Free |
| Search across everything you have recorded | Your browser | Free |
| Translating into English while transcribing | Your browser | Free |
| Clipping a range, words and audio | Your browser | Free |
| AI-written minutes and action items | Our server, our model key | Credits |
| Questions across your whole library | Retrieval local, the answer paid | Credits |
| Translating a finished transcript, any language | Our server, our model key | Credits |

## Getting audio worth transcribing

**Record both sides.** Both boxes are ticked before you press start, and they
should stay that way for anything that is not an in-person meeting:

- **Your microphone** — you, and the room you are in.
- **The meeting tab's sound** — everyone else.

Microphone-only on a video call is the one setting that quietly produces a
recording nobody can use, and the reason is not obvious. The browser applies
echo cancellation to a microphone, which means it identifies whatever is coming
out of your speakers and *removes* it. On a call, that is the other people. You
do not get a quiet recording of them; you get a recording they are missing
from. The consent screen says so if you untick the tab.

Headphones do not rescue it either — then the microphone never hears the far
side at all.

**If the meeting is in a desktop app.** Zoom, Teams and VooV as installed
applications are not browser tabs, and no browser can reach their sound: tab
audio is the ceiling of the web platform here, and on macOS there is not even a
system-audio option in the share dialog. The way through is a loopback device,
which presents your computer's *output* to every application as though it were
an input:

| | Install | Then |
|---|---|---|
| macOS | [BlackHole](https://existential.audio/blackhole/) (free) or Loopback | Make a Multi-Output Device in Audio MIDI Setup so you still hear the call, and pick BlackHole under **Choose which input** |
| Windows | VB-Cable, or "Stereo Mix" if your sound card has it | Pick it under **Choose which input** |
| Linux | Nothing — PulseAudio and PipeWire already expose a monitor source | Pick the `.monitor` input |

**Choose which input** is on the recorder as well as on the consent screen,
and changing it there takes effect immediately — no gap in the file, no second
recording to stitch. That is deliberate: the wrong microphone is the one you
only discover after you have started, and a loopback device is the one you
remember when the other person is already talking. If the recording began
without a microphone at all, the same control adds one, and the consent
record's list of what was captured is updated to match.

Turn **Clean up the sound** off when you do this. Echo cancellation, noise
suppression and automatic gain are built for a microphone in a room; pointed at
a loopback device they have no echo to cancel and audibly damage what they are
given.

## Two languages in one meeting

Whisper is asked which language it is hearing, every four seconds, and each
stretch is transcribed in the language actually being spoken. A meeting that
switches between English and 中文 comes out as one transcript holding both,
with the switch placed at the pause where it happened rather than on the
detector's own grid.

This is not a refinement of "detect automatically" — it is what makes that
setting mean anything. transformers.js does not implement Whisper's language
detection, and asked for none it takes one:

```js
if (!language) {
    // TODO: Implement language detection
    logger.warn('No language specified - defaulting to English (en).');
    language = 'en';
}
```

So "detect" silently meant English, and anything else was decoded as English
anyway: Chinese arriving as romanised syllables, or as fluent English sentences
nobody said. Whisper detects the language itself — the token it predicts
straight after `<|startoftranscript|>` *is* the language — so one decoder step
per window reads it out.

If you already know what will be spoken, name it under **Privacy → the
language spoken**, and a second one beside it. Detection still decides which of
the two is being spoken when; naming them only stops it wandering into a third,
which an accented syllable or a noisy stretch is otherwise enough to cause.

**Tiny (English)** is an English-only checkpoint: it has no language tokens at
all and will render any other language as English-sounding nonsense. Use Base
or larger for anything but English.

## When the transcript has gaps, or a language nobody spoke

Three faults come from the recogniser rather than from your recording, and all
three are now corrected in the pipeline. They are worth knowing about because
each one used to be silent.

**Whisper's pipeline drops spans.** It reconciles overlapping 30-second windows
by matching their tokens, and when that match fails it does not error — the
audio simply produces nothing. It is also chaotic: moving where a pass starts
by half a second loses a different span, or none. So any stretch of *audible*
speech with no transcript over it is now read again on its own, where there is
no window to reconcile against. You will see "Reading 12s again" while it works.

**Silence votes for a language.** Detection reads the language token Whisper
predicts, which is an argmax over ninety-nine candidates with no "none of
these" among them — so every pause picks one at random. Two pauses agreeing
used to be enough to open a transcription pass in a language nobody spoke,
which Whisper then filled with invented text. Quiet stretches now inherit the
language around them, and a language holding under 4% of the recording is
discarded unless it holds 25 seconds outright.

**One Chinese, two scripts.** Whisper has a single `zh` and writes 简体 or 繁體
as it feels, changing many times within one file. Half a transcript in each is
not a style. Output is normalised to Simplified unless you ask for Traditional,
which is left alone — that direction is not one character to one, and no table
can choose between 干, 乾 and 幹.

## When it finds more people than were in the room

Speakers are told apart by the sound of each voice, on your machine, with no
model to download. One recording of one person can still come back as several
speakers, and the usual causes are worth knowing:

- **Very short lines.** A half-second "right" carries almost no information
  about *who* said it, so lines under 900 ms are not characterised at all —
  they inherit the speaker of the line beside them instead. This is why a
  transcript full of one-word interjections behaves better than it used to.
- **One person on two microphones.** Moving from a headset to the laptop
  changes the voice more than two people usually differ. There is no fixing
  this from the audio; set the count by hand.
- **Similar voices**, and **people talking over each other** — a line goes to
  whoever dominated it, and there is no attempt to separate overlapping speech.

The remedy is on the note itself, under *Who is speaking*: set the number of
people and press **Work out the speakers again**. A supplied count always wins
over the automatic guess, in both directions — it will split a recording it had
merged, or merge one it had split. Clicking a name in the transcript moves that
single line to someone else.

Both of those need the audio, and so does re-transcribing. That is decided
**before** you record — the record screen carries the choice and says what it
costs, because the moment it matters is the one before the recording exists.
It stays off by default, since the audio is the larger and more sensitive half,
but a transcript you cannot re-run is a transcript you are stuck with.

## Being asked, instead of remembering

A recorder you have to remember to start is one you use for the first three
meetings. So there is an optional extension
([`apps/extension`](apps/extension)) that notices when you join a **Google
Meet, Zoom, Microsoft Teams or VooV / 腾讯会议** call and asks, in the corner
of the meeting, whether to record it. Accepting opens this app with that tab
already chosen — no share picker, no "share tab audio" box to forget.

It is a detector and nothing else. It reads URLs, not pages; it never touches
audio; it contacts no server; and it never starts a recording on its own — it
opens the consent screen and stops there. The app works exactly as well
without it, which is why it is a separate, optional thing rather than a
requirement. It cannot see the Zoom, Teams or VooV *desktop* applications:
nothing running in a browser can. Join in the browser, or press record
yourself.

The line between the two halves is not a business decision dressed up.
Everything above it runs on your hardware and costs nothing to serve, so
charging for it would be charging for the login. Everything below it is a bill
we pay a model vendor. See [`docs/what-costs-money.md`](docs/what-costs-money.md).

## Languages

Two different things, often confused:

**The interface** speaks English, 简体中文 and 繁體中文. Each is complete —
`npm run typecheck` fails on a missing string, so a locale is finished or it is
not shipped. Traditional Chinese is written separately rather than converted
from Simplified: the vocabulary differs (點數/积分, 檔案/文件, 逐字稿/文字记录),
not just the glyphs. Exported documents follow the interface language, so a
Chinese meeting exports under Chinese headings.

**Transcription** handles all 99 languages Whisper does, in any interface
language. Topics and key lines are frequency measures and work in every one of
them. Action items, decisions and deadlines are phrase matching, so they work in
the nine languages `note-summary` carries cue lists for — English, 简体中文,
繁體中文, 日本語, 한국어, Español, Français, Deutsch, Português — and the summary
panel names them on screen rather than leaving a French user to conclude their
meeting had no action items.

Every language's cues are matched against every sentence, so a meeting held half
in English and half in Chinese gets both. That is the normal case in this
product's own market, not an edge case.

## Why it exists

This product is the answer to a specific finding. A survey of eleven
competitors — Otter, Fireflies, Meetily, Buzz, Fathom, tl;dv, Grain, Notta,
Sonix, MacWhisper and Granola — turned up two gaps that nobody had filled:

1. **Nobody combines a browser-native product with local processing.** The
   three that process locally all make you install an application. The eight
   you open in a browser all upload your audio. Zero of eleven do both.
2. **Nobody treats recording consent as a feature.** Four of the nine with
   reviewable user feedback are complained at over it, and one faced a class
   action. It is a clause in everyone's terms of service and a selling point
   in nobody's product.

[`PLAN.md`](PLAN.md) records the whole derivation, including the one place the
research's recommendation was not followed and why.

## How it is built

```
crates/
  note-core      transcript model, timeline, BM25 search, redaction
  note-diarize   MFCC + voice activity detection + clustering — no model download
  note-summary   the free extractive summariser; the prompts and parsers the paid one shares
  note-export    SRT, WebVTT, text, Markdown, JSON, CSV, HTML
  note-credits   what a paid job costs, compiled for both the browser and the gateway
  note-wasm      the wasm-bindgen surface
apps/web         the site: plain TypeScript, Vite, no framework
```

The Rust core compiles to a 400 KB WebAssembly module and is tested as an
ordinary `cargo test` target — 170 tests, including four that run the speaker
separation over short recordings of real speech, because the synthetic voices
it used to be tested on were all passing while one person talking came back as
four speakers.

Whisper runs through `transformers.js` on WebGPU, falling back to WebAssembly.
The model weights are fetched from Hugging Face once and cached; ONNX Runtime's
own binary is served from this origin rather than a CDN, so that "nothing
leaves your machine" has no silent exception in it.

The paid routes live in `openapps-gateway` in the surrounding monorepo. They
take **text** — never audio — and the price is computed by `note-credits`
compiled natively there and to wasm here, so the figure on the button and the
figure on the invoice cannot disagree.

```
cargo test --workspace                    # the core
npm run typecheck && npm run smoke        # the app, in a real browser
```

## Documentation

- [`PLAN.md`](PLAN.md) — the research, the feature ledger, the milestones
- [`docs/self-hosting.md`](docs/self-hosting.md) — running it yourself
- [`docs/privacy.md`](docs/privacy.md) — every request the app can make
- [`docs/what-costs-money.md`](docs/what-costs-money.md) — the free/paid line and the pricing
- [`docs/architecture.md`](docs/architecture.md) — how the pieces fit

## Licence

MIT or Apache-2.0, at your option.
