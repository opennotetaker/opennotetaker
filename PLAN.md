# OpenNoteTaker — Implementation Plan

> Derived from `市场洞察与竞品研究 - 竞品分析 - 产品竞争格局调研-192.md`
> (11 competitors: Otter, Fireflies, Meetily, Buzz, Fathom, tl;dv, Grain,
> Notta, Sonix.ai, MacWhisper, Granola).

**Goal.** A privacy-first AI transcription / meeting-notes product as a
**standalone web site**: audio & meeting transcription, per-sentence
timeline, speaker separation, keyword summary, subtitle/text export — all
running *in the tab*, with an optional self-hosted deployment and exactly
one paid capability.

## 1. What the research actually decided

The report leaves little to invent. Four findings drive every choice below.

**Finding 1 — the free/paid line is already drawn by the market.** §5.2 lists
six capabilities that 11/11 competitors prove can run locally at zero
marginal cost (transcription, timeline, diarization, export, multilingual,
bot-free recording), and exactly one capability that 9 of the 11 competitors
that have it put behind a paywall: **generative AI summary / action items**.
So: those six are free and local, and generative summarisation is the paid
route. §6's open-core split says the same thing in different words.

This also matches the OpenApps rule (`openapps-integration`): you may charge
for work performed with a key we hold, and nothing else. A client-side
"unlocked" flag on local work is a suggestion, not a paywall.

**Finding 2 — the empty square on the board is "web site + local/private".**
§4 空白1 and §8⑤: 0/11 competitors combine a browser-native product with
local/private processing. The ones that process locally (Meetily, Buzz,
MacWhisper) all make you install something; the eight with a web site all
upload your audio. §8⑤ warns this gap may exist for a *reason* — "local"
usually means "run a Docker container", which is not a thing a
non-technical user does.

Our answer is the one the report asks for: **the local processing happens in
the browser itself**, via WebAssembly and WebGPU. No install, no container,
no upload — and the self-hosting story (§9 切入点2) is then a bonus for
advanced users rather than the price of admission.

**Finding 3 — consent is the trust asset nobody has claimed.** §4 空白2 and
§5.3 共性差评2: 4 of 9 competitors with reviewable feedback are complained
at over recording consent, and Granola faced an actual class action. Nobody
markets consent as a feature. §9 切入点1 makes this the primary wedge, with
the warning that it must not read as legal boilerplate.

So consent is **product surface, not a checkbox**: a one-step, unskippable,
plain-language gate before recording; a script to read aloud; a consent
record stored with the recording and exportable; a recording indicator that
is never hidden.

**Finding 4 — billing opacity is the second-largest complaint.** §5.3
共性差评1: 4 of 9 competitors are complained at over surprise renewals and
cancellation mazes. §9 切入点3 and §10 want one simple tier.

### The one deviation from the report, stated plainly

§10 recommends **$8–15/month subscription**, and warns against 按量计费.
OpenApps has no subscription rail — accounts are credit-based ($5 = 1000
credits). Rather than build a second billing system, this app uses credits
**and takes the report's underlying goal more literally than a subscription
would**: every paid job shows an exact price *before* you commit, there is
nothing to auto-renew, and there is nothing to cancel. The failure mode the
report identified (§5.3 共性差评1, "was charged after I thought I
cancelled") is structurally impossible here. The report's objection to
按量计费 is a *cognitive-load* objection, which is answered by quoting one
number up front — not by the billing period.

## 2. Feature ledger — every feature in §5.2, and its disposition

| § | Feature | Priority | Tier | Where it lives |
|---|---|---|---|---|
| 5.2 | Audio/video/meeting transcription | P0 | **Free, local** | Whisper ONNX in-tab (`transcribe.ts`) |
| 5.2 | Per-sentence timeline | P0 | **Free, local** | `note-core` + transcript editor |
| 5.2 | Speaker separation / identification | P0 | **Free, local** | `note-diarize` (Rust→wasm) |
| 5.2 | Subtitle / text / document export | P0 | **Free, local** | `note-export` (SRT/VTT/TXT/MD/JSON/CSV/HTML) |
| 5.2 | Keyword summary (extractive) | P1 | **Free, local** | `note-summary::local` |
| 5.2 | Bot-free local audio capture | P1 | **Free, local** | `recorder.ts` (mic + tab/system, mixed) |
| 4 空白1 | Meeting auto-detection (Meet/Zoom/Teams/VooV) | P1 | **Free, local** | `apps/extension` — URL detection + handover; the app never requires it |
| 5.2 | Multilingual transcription (99 langs) | P1 | **Free, local** | Whisper multilingual checkpoints |
| 5.2 | **AI deep summary / action items** | P0 | **Paid** | gateway `/opennotetaker/summarize` |
| 5.2 | Cross-meeting AI Q&A | 机会型 | **Paid** | local BM25 retrieval → gateway `/ask` |
| 5.2 | Cross-language translation | 机会型 | **Paid** | gateway `/translate` |
| 5.2 | Clips (剪辑分享) | 机会型 | **Free, local** | range export — local, so free |
| 5.2 | CRM / sales intelligence | **不建议做** | — | **Not built.** §5.2 rules it out as conflicting with the privacy/non-technical positioning |
| 5.2 | Hardware recorder | — | — | Not built (1/11, out of form) |
| 9 切入点1 | Consent & transparency surface | — | **Free** | `consent.ts`, consent record, recording indicator |
| 9 切入点2 | Self-host / private deployment | — | **Free** | static bundle + Dockerfile + compose |
| 4 空白 | Retention control ("你说了算") | — | **Free** | library retention policy + purge |

**Languages.** §3 of the report found the地区空白 to be non-Japanese Asia-Pacific
— 9/11 competitors treat North America as the main battleground, and only Notta
(Japanese) covers East Asia at all. Chinese is served by nobody in the set. The
interface therefore ships in English, 简体中文 and 繁體中文, and the free
summariser's cue detection covers nine languages rather than one.

Two features are *added* beyond §5.2 because the positioning demands them:
a **privacy centre** that names every network call the app can make, and a
**retention policy**, which is what tagline §10-3 ("录什么、存多久，你说了算")
actually promises.

## 3. Architecture

```
                    ┌──────────── the browser tab ────────────┐
  microphone ──┐    │                                          │
  tab/system ──┼───▶│ recorder.ts ──▶ WebM/Opus ──┐            │
  file import ─┘    │                             ▼            │
                    │                      decode → 16 kHz mono│
                    │                             │            │
                    │        transformers.js ◀────┤            │
                    │        (Whisper ONNX,       │            │
                    │         WebGPU / wasm)      │            │
                    │             │ segments      │ PCM        │
                    │             ▼               ▼            │
                    │        ┌─────────── note-wasm ─────────┐ │
                    │        │ note-core     transcript model│ │
                    │        │ note-diarize  MFCC + cluster  │ │
                    │        │ note-summary  extractive      │ │
                    │        │ note-export   SRT/VTT/MD/...  │ │
                    │        │ note-credits  the quote       │ │
                    │        └───────────────────────────────┘ │
                    │             │                            │
                    │        IndexedDB library (retention)     │
                    └──────────────┬───────────────────────────┘
                                   │ only for paid work, only text
                                   ▼
                    openapps-gateway  /opennotetaker/{summarize,ask,translate}
                        ensure_affordable → vendor call → charge
                                   │
                                   ▼
                            openapps-server (credits)
```

**Audio never leaves the tab.** The paid routes take *text* — the transcript
you already have — never the recording. That is a property of the wire
format, not a promise, and the privacy centre says so.

### Crates

| Crate | Contents | Why separate |
|---|---|---|
| `note-core` | `Segment`, `Transcript`, `Speaker`; timeline arithmetic, merge/split, BM25 index, redaction | The vocabulary every other crate speaks |
| `note-diarize` | Pre-emphasis, framing, FFT, mel filterbank, MFCC, VAD, segment embeddings, agglomerative clustering | Pure DSP, heavily testable, no model download |
| `note-summary` | Local extractive summary (keywords, key sentences, action items, decisions, questions); LLM prompt construction + strict JSON parsing | Shared by wasm (free tier + quoting) and the gateway (paid tier) — one prompt, never two dialects |
| `note-export` | SRT, VTT, TXT, Markdown, JSON, CSV, HTML | Pure formatting; snapshot-testable |
| `note-credits` | `Rates`, `Quote`, `quote_summary`, `quote_ask`, `quote_translation` | **Compiled twice** — to wasm for the price the browser shows, native for the price the gateway charges. They agree by construction |
| `note-wasm` | `wasm_bindgen` surface | The only crate that knows it is in a browser |

### Web app

Plain TypeScript + Vite, no framework — matching `opendownloader/apps/web`.
The self-hosting story is "these are static files"; a framework runtime
does not help that and every dependency is one more thing to audit.

## 4. Milestones

- **M0** Skeleton: Cargo + npm workspaces, toolchain pin, licences, README.
- **M1** `note-core` — model, timeline, BM25, redaction. Tests.
- **M2** `note-export` — six formats. Tests.
- **M3** `note-diarize` — FFT→MFCC→VAD→cluster. Tests on synthetic voices,
  and on recorded speech: the synthetic ones passed throughout a period when
  one person talking came back as four speakers.
- **M4** `note-summary` — extractive (multilingual, incl. CJK) + prompts/parsers.
- **M5** `note-credits` — quotes for all three paid jobs.
- **M6** `note-wasm` + `build-wasm.sh`.
- **M7** Web app: consent → record → transcribe → diarize → edit → summarise
  → export → library, plus privacy centre and account surface.
- **M8** Gateway: `opennotetaker.rs`, three routes, wired + tested.
- **M9** Self-host (Dockerfile/compose), e2e smoke, docs, landing copy.

## 5. Constraints that hold everywhere

1. **No audio, ever, over the network.** Paid routes accept text only.
2. **No third-party origin at runtime** except Hugging Face, once, for model
   weights — named in the UI. ONNX Runtime's wasm is served from our origin.
3. **No analytics, no telemetry, no cookies.** A privacy claim with a tracker
   behind it is the thing we are competing against.
4. **The six free features never call the network** and never check a licence.
5. **Every paid job is quoted before it runs**, and the quote is computed by
   the same crate on both sides.
6. **Charge after the work.** `ensure_affordable` → work → `charge`.
7. Dual MIT/Apache-2.0, matching the monorepo.
