// Speech to text, on this machine.
//
// Whisper, exported to ONNX and run by transformers.js on WebGPU, falling back
// to the WebAssembly backend. §5.2 of the competitor research puts
// transcription, its timeline and its 99 languages in the free tier on the
// grounds that Buzz and MacWhisper have proved they can run locally -- both as
// installed desktop applications. This file is the same claim in a tab.
//
// # The one network call, and why it is named on screen
//
// The model weights are fetched from Hugging Face, once, after which the
// browser caches them. That is the only request this feature makes, and the
// interface says so before it happens rather than in a privacy policy. The
// ONNX Runtime binary is served from our own origin (see scripts/copy-ort.mjs)
// specifically so it is not a second, silent one.
//
// # Why not a hosted transcription API
//
// It would be more accurate on hard audio. It would also mean uploading the
// recording of somebody's meeting to a server and metering it, which is the
// product this one exists as an alternative to. Where the local model is not
// good enough, the interface says so plainly rather than upselling.

import { TARGET_SAMPLE_RATE } from "./decode";
import { isChinese, toSimplified, wantsTraditional } from "./script";
import { t } from "./i18n";

export interface TranscribeModel {
  id: string;
  label: string;
  size: string;
  note: string;
  englishOnly: boolean;
}

/// Four, spanning the real trade-off -- download size against accuracy -- and
/// not one checkpoint more. A dropdown of fifteen is a worse product than four
/// a user can actually choose between.
///
/// The names and sizes are not translated: "Base" and "~80 MB" are what the
/// model is called and how big it is in any language, and translating a
/// checkpoint's name would make it harder to look up, not easier.
export const MODELS: TranscribeModel[] = [
  {
    id: "onnx-community/whisper-tiny.en",
    label: "Tiny (English)",
    size: "~40 MB",
    note: "model.tiny",
    englishOnly: true,
  },
  {
    id: "onnx-community/whisper-base",
    label: "Base",
    size: "~80 MB",
    note: "model.base",
    englishOnly: false,
  },
  {
    id: "onnx-community/whisper-small",
    label: "Small",
    size: "~250 MB",
    note: "model.small",
    englishOnly: false,
  },
  {
    id: "onnx-community/whisper-large-v3-turbo",
    label: "Large v3 Turbo",
    size: "~800 MB",
    note: "model.turbo",
    englishOnly: false,
  },
];

export const DEFAULT_MODEL = MODELS[1]!.id;

/// The languages worth putting in a dropdown, by how often meetings are held
/// in them. Whisper handles 99; a list of 99 is a list nobody reads. "Detect"
/// is first and is the default, because it is right almost always.
///
/// Every entry is written in its own script, so a reader scanning for their
/// language finds the word they call it rather than the English name for it.
/// That is why this list is not translated: a Chinese reader looking for
/// Vietnamese wants "Tiếng Việt", not 越南语.
/// `iso` is what Whisper's own language tokens are keyed by (`<|zh|>`), and
/// what detection reads back out of the model. `code` is the name the settings
/// store and the pipeline both accept. Both are carried because the two ends of
/// this file speak different halves of the same vocabulary.
export const LANGUAGES: { code: string; iso: string; label: string }[] = [
  { code: "", iso: "", label: "language.detect" },
  { code: "english", iso: "en", label: "English" },
  { code: "chinese", iso: "zh", label: "中文" },
  { code: "spanish", iso: "es", label: "Español" },
  { code: "hindi", iso: "hi", label: "हिन्दी Hindi" },
  { code: "arabic", iso: "ar", label: "العربية Arabic" },
  { code: "portuguese", iso: "pt", label: "Português" },
  { code: "french", iso: "fr", label: "Français" },
  { code: "german", iso: "de", label: "Deutsch" },
  { code: "japanese", iso: "ja", label: "日本語 Japanese" },
  { code: "korean", iso: "ko", label: "한국어 Korean" },
  { code: "russian", iso: "ru", label: "Русский" },
  { code: "indonesian", iso: "id", label: "Bahasa Indonesia" },
  { code: "italian", iso: "it", label: "Italiano" },
  { code: "dutch", iso: "nl", label: "Nederlands" },
  { code: "turkish", iso: "tr", label: "Türkçe" },
  { code: "vietnamese", iso: "vi", label: "Tiếng Việt" },
  { code: "thai", iso: "th", label: "ไทย Thai" },
  { code: "polish", iso: "pl", label: "Polski" },
  { code: "ukrainian", iso: "uk", label: "Українська" },
];

/// The ISO code Whisper knows a language by, from either of its names.
export function whisperCode(name: string): string {
  const known = LANGUAGES.find(
    (language) => language.code === name.toLowerCase() || language.iso === name.toLowerCase(),
  );
  // Not in the short list: Whisper takes the bare subtag, and there is one
  // `zh` -- which script comes out is decided by the audio, not by a tag.
  return known?.iso || name.split("-")[0]!.toLowerCase();
}

/// The display name for a language Whisper reported, or the raw code where we
/// do not carry one.
///
/// Whisper reports "chinese", not "中文", and showing that back untranslated
/// beside otherwise fully translated text is the kind of seam that makes an
/// interface feel half-done.
export function languageName(code: string | null): string | null {
  if (!code) return null;
  const wanted = code.toLowerCase();
  const known = LANGUAGES.find(
    (language) => language.code === wanted || (language.iso !== "" && language.iso === wanted),
  );
  return known ? known.label : code;
}

export interface Support {
  ok: boolean;
  device: "webgpu" | "wasm";
  reason?: string;
}

/// Whether transcription can run here at all, and on what.
export async function support(): Promise<Support> {
  if (typeof OfflineAudioContext === "undefined") {
    return { ok: false, device: "wasm", reason: t("error.unsupported") };
  }
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (gpu && (await gpu.requestAdapter())) return { ok: true, device: "webgpu" };
  } catch {
    // A GPU that announces itself and then refuses an adapter is not worth
    // surfacing; the WebAssembly backend still works.
  }
  return { ok: true, device: "wasm" };
}

export interface Progress {
  stage: "model" | "transcribing";
  fraction: number | null;
  note: string;
}

export interface Options {
  pcm: Float32Array;
  model?: string;
  /// A Whisper language name, or empty to detect. Ignored by `.en` models.
  language?: string;
  /// A second language, when the recording is known to hold two.
  ///
  /// Only meaningful beside a first one: "detect it, but one of them is
  /// definitely Chinese" is not a thing to ask for, and a leftover second
  /// choice read as the only choice would silently force a whole recording
  /// into it. Naming both still leaves detection to decide which is being
  /// spoken *when* -- it only narrows what detection is allowed to answer.
  secondLanguage?: string;
  /// Translate into English as it transcribes.
  ///
  /// Whisper's own `translate` task, so it costs nothing and runs here. §5.2
  /// marks cross-language translation as an opportunity with an uncertain cost
  /// type; this is the half of it that is genuinely free, and the app offers
  /// it here rather than pretending translation is only ever a paid feature.
  translate?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: Progress) => void;
}

export interface Chunk {
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface Transcribed {
  chunks: Chunk[];
  /// Every language actually heard, in the order it was first heard, as ISO
  /// codes. One entry for an ordinary recording; two for the bilingual meeting
  /// this whole detection path exists for.
  languages: string[];
  /// The one that was spoken longest. A transcript carries a single language
  /// -- the summariser picks its cue tables by it -- and for a meeting held
  /// mostly in one language with a stretch of another, that is the answer.
  dominant: string | null;
}

interface WhisperChunk {
  text: string;
  timestamp: [number, number | null];
}

// -------------------------------------------------- which language, and when

/// The reading grid for language detection.
///
/// Four seconds, and the number is measured rather than chosen. OpenSubs hit
/// this first on a bilingual news clip and settled it there: ten-second cells
/// cannot see an eight-second return to the other language at all -- both cells
/// overlapping it read as the language on either side, and the insert is
/// transcribed in a language nobody is speaking. Four seconds is short enough
/// that the shortest real insert covers two cells.
///
/// The cost is one encoder pass per cell, and the encoder runs on a padded
/// 30-second spectrogram whatever it is handed, so a shorter window is not a
/// cheaper one. Naming a single language skips all of it.
const DETECT_WINDOW_S = 4;
/// The window, step and reach used to place a change once it has been found.
const REFINE_WINDOW_S = 4;
const REFINE_STEP_S = 2;
const REFINE_SPAN_S = 4;
/// How far either side of the estimate to look for a pause to cut at, and how
/// much quieter than its neighbours a frame has to be to count as one.
const SNAP_RADIUS_S = 0.75;
const SNAP_QUIET_RATIO = 0.4;
/// How far past its own end each pass reads, so a sentence already under way
/// at the cut is finished rather than lost between two passes.
const LEAD_OUT_S = 3;
const CHUNK_LENGTH_S = 30;
const STRIDE_LENGTH_S = 5;

/// How quiet a cell has to be, against the loudest cell in the recording,
/// before its vote is thrown away.
///
/// A cell of silence still gets a language: the detector reads the token after
/// `<|startoftranscript|>`, and that is an argmax over ninety-nine candidates
/// with no "none of these" among them. On a 28-minute meeting the pauses
/// therefore vote, at random, and a couple of them agreeing is enough to open a
/// transcription pass in a language nobody spoke -- which Whisper then fills
/// with invented text, because a language model asked to transcribe silence in
/// Thai writes Thai. That is where "OK ที่นี่ ที่นี่นี่ ทุกคน..." came from.
///
/// -34 dBFS against the recording's own peak, so it adapts to how hot the
/// recording was rather than assuming a level.
const QUIET_CELL_RATIO = 0.0004;

/// What share of the recording a language must hold to be believed, and the
/// floor below which no amount of share is enough.
///
/// Length alone cannot decide this, and trying it was wrong: the bilingual
/// fixture switches after **4.4 seconds** of a 29-second file, so any threshold
/// high enough to absorb a flicker in a 28-minute meeting also absorbs a real
/// half of a short one. Share is the property that separates them. Those 4.4
/// seconds are 15% of their recording; the invented Thai was some 8 seconds of
/// 1,680, which is 0.5%.
///
/// Both conditions have to fail before a language is dropped, so a genuinely
/// brief switch inside a long meeting -- one sentence in Chinese, thirty
/// seconds of it -- is kept on the absolute floor even though its share is
/// small.
const STRAY_LANGUAGE_SHARE = 0.04;
const STRAY_LANGUAGE_S = 25;

// ---------------------------------------------------------------------------
// Recovering what the pipeline drops, and refusing what it invents.
//
// Both ported from OpenSubs, which measured them first on real footage. They
// are properties of this recogniser rather than of either product, and the
// second one is the reason a 28-minute meeting came back with stretches
// missing that a listener can plainly hear.
// ---------------------------------------------------------------------------

/// No single spoken segment worth one line runs longer than this.
const MAX_SEGMENT_S = 12;
/// Slower than this is not speech, whatever the timestamps claim.
///
/// The pair is a hallucination test: a segment spanning half a minute with
/// four words in it is not a slow speaker, it is the model having smeared a
/// guess across a span it could not read.
const MIN_CHARS_PER_SECOND = 2;

/// A stretch of speech with no transcript over it is worth reading again.
const GAP_S = 4;
/// Past this, the gap is not a recogniser slip and re-reading it is not cheap.
const MAX_GAP_S = 60;
/// At most this many second readings, however many gaps there turn out to be.
const MAX_REFILLS = 30;
/// ...but no more than one re-read per this many seconds of audio, so the
/// budget scales with the file rather than being generous for a short one and
/// ruinous for a long one.
const REFILL_SECONDS_EACH = 20;
/// And at most this many rounds, so a stubborn gap cannot loop.
const MAX_REFILL_ROUNDS = 4;
/// How loud a gap must be, against the whole recording, to be worth re-reading.
/// Most gaps are real: a pause, a held silence. Only the ones with someone
/// talking in them are a failure.
const GAP_SPEECH_RATIO = 0.15;

/// A stretch of the recording that is all one language.
export interface LanguageRun {
  /// Sample offsets into the decoded audio.
  from: number;
  to: number;
  /// A Whisper ISO code: "en", "zh", "ja"...
  language: string;
}

interface WhisperInternals {
  model: {
    generation_config: {
      lang_to_id?: Record<string, number>;
      decoder_start_token_id: number;
      suppress_tokens?: number[];
    };
    generate(options: Record<string, unknown>): Promise<unknown>;
  };
  processor(audio: Float32Array): Promise<{ input_features: unknown }>;
}

/// Read the language token Whisper predicts first for one window.
///
/// This is the whole reason the module has to reach inside the pipeline.
/// transformers.js does not implement Whisper's language detection -- asked for
/// none, it takes one:
///
///     if (!language) {
///         // TODO: Implement language detection
///         logger.warn('No language specified - defaulting to English (en).');
///         language = 'en';
///     }
///
/// So "detect it" silently meant English, and anything not spoken in English
/// came back as confident, fluent, entirely invented English -- Chinese
/// arriving as romanised syllables or as sentences nobody said. That is worse
/// than failing, because it looks like a transcript.
///
/// Whisper detects the language itself: the token predicted straight after
/// `<|startoftranscript|>` *is* the language, so one decoder step reads it out.
async function detectWindow(
  pipe: WhisperInternals,
  window: Float32Array,
  idToLang: Map<number, string>,
  suppress: number[],
): Promise<string | null> {
  const { input_features } = await pipe.processor(window);
  const out = (await pipe.model.generate({
    inputs: input_features,
    max_new_tokens: 1,
    decoder_input_ids: [pipe.model.generation_config.decoder_start_token_id],
    // Appended to the model's own list rather than replacing it: this
    // suppresses the languages the user has ruled out, and must not quietly
    // un-suppress everything Whisper suppresses for its own reasons.
    ...(suppress.length > 0
      ? {
          suppress_tokens: [
            ...(pipe.model.generation_config.suppress_tokens ?? []),
            ...suppress,
          ],
        }
      : {}),
  })) as { sequences?: { tolist(): unknown[] }[] } & { tolist?: () => unknown[] }[];
  const first = (out as { sequences?: { tolist(): unknown[] }[] }).sequences?.[0] ?? out[0];
  const ids = first?.tolist?.() as (number | bigint)[] | undefined;
  if (!ids?.length) return null;
  return idToLang.get(Number(ids[ids.length - 1])) ?? null;
}

/// A single cell disagreeing with both its neighbours is noise -- a bar of
/// music, a held silence, one ambiguous sentence.
///
/// Deliberately weak. Two cells is eight seconds, about as short as a real
/// stretch of speech gets, so anything surviving two cells is believed.
export function smoothLabels(labels: string[]): string[] {
  const out = [...labels];
  for (let i = 1; i < out.length - 1; i += 1) {
    if (out[i] !== out[i - 1] && out[i - 1] === out[i + 1]) out[i] = out[i - 1]!;
  }
  return out;
}

/// Mean square energy per detection cell.
///
/// Exported so the silence gate can be tested without a model: it is arithmetic
/// over the same buffer the detector reads.
export function cellEnergies(audio: Float32Array, cell: number): number[] {
  const out: number[] = [];
  for (let at = 0; at < audio.length; at += cell) {
    const end = Math.min(at + cell, audio.length);
    let sum = 0;
    // Every fourth sample: this decides a threshold, not a measurement, and
    // reading a quarter of a 28-minute recording is four times less work.
    for (let i = at; i < end; i += 4) sum += audio[i]! * audio[i]!;
    const n = Math.max(1, Math.ceil((end - at) / 4));
    out.push(sum / n);
  }
  return out;
}

/// Replace the labels of cells too quiet to have carried speech.
///
/// A quiet cell inherits the nearest loud one rather than voting. Its own vote
/// is an argmax over ninety-nine languages on noise, and two such cells landing
/// on the same wrong answer is all it takes to open a transcription pass in a
/// language nobody spoke.
export function silenceInherits(labels: string[], energies: number[]): string[] {
  const peak = Math.max(...energies, 0);
  if (!(peak > 0)) return [...labels];
  const floor = peak * QUIET_CELL_RATIO;
  const loud = labels.map((_, i) => (energies[i] ?? 0) >= floor);
  // Nothing above the floor: the recording is silence, and there is no
  // neighbour to inherit from. Leave it alone rather than inventing agreement.
  if (!loud.some(Boolean)) return [...labels];

  const out = [...labels];
  for (let i = 0; i < out.length; i += 1) {
    if (loud[i]) continue;
    let back = i - 1;
    while (back >= 0 && !loud[back]) back -= 1;
    let forward = i + 1;
    while (forward < out.length && !loud[forward]) forward += 1;
    // Whichever side is nearer; the earlier one on a tie, so a quiet stretch
    // between two languages stays with the one that was already being spoken.
    const nearer =
      back < 0 ? forward : forward >= out.length ? back : i - back <= forward - i ? back : forward;
    out[i] = labels[nearer]!;
  }
  return out;
}

/// Drop languages that hold too little of the recording to be real.
///
/// Detection noise does not arrive as one long stretch; it arrives as a flicker
/// somewhere in the middle of a meeting held in something else. Left alone each
/// flicker opens its own transcription pass, and Whisper fills that pass with
/// invented text in the language it was told to expect — which is how a wall of
/// Thai reached a Chinese meeting's transcript.
///
/// Judged per *language* over the whole recording rather than per run, because
/// a language spoken for a real but brief stretch is credible and the same
/// number of seconds scattered as three flickers is not.
export function absorbStrayLanguages(
  runs: LanguageRun[],
  totalSamples: number,
  shareFloor = STRAY_LANGUAGE_SHARE,
  absoluteFloorSamples = STRAY_LANGUAGE_S * TARGET_SAMPLE_RATE,
): LanguageRun[] {
  if (runs.length < 2 || totalSamples <= 0) return runs.map((run) => ({ ...run }));

  const held = new Map<string, number>();
  for (const run of runs) {
    held.set(run.language, (held.get(run.language) ?? 0) + (run.to - run.from));
  }
  const stray = new Set(
    [...held]
      .filter(([, samples]) => samples / totalSamples < shareFloor && samples < absoluteFloorSamples)
      .map(([language]) => language),
  );
  // Never drop every language: if the whole recording reads as noise, the
  // detection was wrong about something other than which parts to keep.
  if (stray.size === 0 || stray.size === held.size) return runs.map((run) => ({ ...run }));

  const kept: LanguageRun[] = [];
  for (const run of runs) {
    if (stray.has(run.language)) {
      // Hand the span to whichever surviving neighbour is longer: that is the
      // language more likely to have been spoken through it.
      const before = kept[kept.length - 1];
      const after = runs.find((other) => other.from >= run.to && !stray.has(other.language));
      if (before && (!after || before.to - before.from >= after.to - after.from)) {
        before.to = run.to;
      } else if (after) {
        after.from = Math.min(after.from, run.from);
      } else if (before) {
        before.to = run.to;
      }
      continue;
    }
    const last = kept[kept.length - 1];
    if (last && last.language === run.language) last.to = run.to;
    else kept.push({ ...run });
  }
  // A stray run at the very start leaves a hole; the first survivor takes it.
  if (kept.length > 0) {
    kept[0]!.from = Math.min(kept[0]!.from, runs[0]!.from);
    kept[kept.length - 1]!.to = Math.max(kept[kept.length - 1]!.to, runs[runs.length - 1]!.to);
  }
  return kept;
}

/// Whether a segment reads as something the model invented rather than heard.
///
/// Whisper smears a guess across a span it could not read: a long stretch
/// holding very little text. Applied both to a first reading and to what a
/// re-read brings back, because a re-read can smear exactly as the first did —
/// and one that does must not be kept, or it fills the gap with nonsense and
/// stops the next round retrying the span.
export function looksInvented(text: string, seconds: number): boolean {
  return seconds > MAX_SEGMENT_S && text.length / seconds < MIN_CHARS_PER_SECOND;
}

/// RMS between two times, in seconds.
export function loudness(audio: Float32Array, from: number, to: number): number {
  const a = Math.max(0, Math.round(from * TARGET_SAMPLE_RATE));
  const b = Math.min(audio.length, Math.round(to * TARGET_SAMPLE_RATE));
  if (b <= a) return 0;
  let sum = 0;
  for (let i = a; i < b; i += 1) sum += audio[i]! * audio[i]!;
  return Math.sqrt(sum / (b - a));
}

/// Merge a grid of per-cell labels into stretches.
export function runsFromLabels(labels: string[], cell: number, length: number): LanguageRun[] {
  const runs: LanguageRun[] = [];
  for (const [i, language] of labels.entries()) {
    const to = Math.min((i + 1) * cell, length);
    const last = runs[runs.length - 1];
    if (last && last.language === language) last.to = to;
    else runs.push({ from: i * cell, to, language });
  }
  return runs.filter((run) => run.to > run.from);
}

/// The quietest 100 ms within `radius` of `centre`, as a sample offset.
///
/// A language change is a speaker change and speaker changes have gaps, so
/// cutting at the quietest moment avoids splitting a word between two passes.
/// It only moves for an actual pause: a moment merely a little quieter than its
/// neighbours is somewhere inside a word, and the measured estimate is better.
export function quietestNear(audio: Float32Array, centre: number, radius: number): number {
  const frame = Math.round(0.1 * TARGET_SAMPLE_RATE);
  const from = Math.max(0, centre - radius);
  const to = Math.min(audio.length - frame, centre + radius);
  if (to <= from) return Math.max(0, Math.min(centre, audio.length));

  let quietest = centre;
  let lowest = Infinity;
  let total = 0;
  let frames = 0;
  for (let at = from; at <= to; at += frame) {
    let energy = 0;
    for (let i = at; i < at + frame; i += 4) energy += audio[i]! * audio[i]!;
    total += energy;
    frames += 1;
    // Ties go to the frame nearest the estimate: across a long silence the
    // energies are all but equal, and drifting to one end of it would put the
    // cut further from the change than the estimate already was.
    if (energy < lowest - 1e-9) {
      lowest = energy;
      quietest = at;
    }
  }
  const mean = frames > 0 ? total / frames : 0;
  if (!(lowest < mean * SNAP_QUIET_RATIO)) return Math.max(0, Math.min(centre, audio.length));
  return quietest + Math.round(frame / 2);
}

/// How many windows the pipeline will cut this audio into.
///
/// Mirrors the loop in transformers.js rather than approximating it with a
/// division: the last window is whatever is left over, and `ceil(length/jump)`
/// is off by one for exactly the lengths that land on a boundary.
export function whisperWindows(samples: number, chunkLengthS: number, strideLengthS: number): number {
  const window = TARGET_SAMPLE_RATE * chunkLengthS;
  const jump = window - 2 * TARGET_SAMPLE_RATE * strideLengthS;
  if (jump <= 0 || samples <= 0) return 1;
  let offset = 0;
  let count = 0;
  for (;;) {
    count += 1;
    if (offset + window >= samples) return count;
    offset += jump;
  }
}

/// Split the audio into stretches that are each one language.
///
/// Adjacent cells agreeing are merged, so a single-language recording comes
/// back as one run and is transcribed in one pass: the common case pays for the
/// detection and nothing else.
async function languageRuns(
  transcriber: unknown,
  audio: Float32Array,
  allowed: string[],
  onProgress?: (progress: Progress) => void,
  signal?: AbortSignal,
): Promise<LanguageRun[]> {
  const pipe = transcriber as WhisperInternals;
  const langToId = pipe.model?.generation_config?.lang_to_id;
  // An English-only checkpoint has no language tokens to choose between.
  if (!langToId) return [{ from: 0, to: audio.length, language: "en" }];
  const idToLang = new Map(
    Object.entries(langToId).map(([token, id]) => [id, token.replace(/[<|>]/g, "")]),
  );

  // Naming the languages narrows the ballot. Left empty, all ninety-nine are
  // candidates -- which is right when nobody has said what is being spoken, and
  // is how a bilingual English/Chinese recording can come back also reporting a
  // language nobody in the room speaks.
  const suppress =
    allowed.length > 0
      ? [...idToLang].filter(([, code]) => !allowed.includes(code)).map(([id]) => id)
      : [];

  const cell = DETECT_WINDOW_S * TARGET_SAMPLE_RATE;
  const cells = Math.max(1, Math.ceil(audio.length / cell));
  const labels: string[] = [];
  for (let i = 0; i < cells; i += 1) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    // `slice`, not `subarray`: a copy with its own buffer, because what reaches
    // an ONNX session should not depend on a view's byteOffset. A view here
    // meant every window read the opening seconds again, however far in it was
    // taken -- and so every window came back as the same language.
    const window = audio.slice(i * cell, Math.min((i + 1) * cell, audio.length));
    labels.push((await detectWindow(pipe, window, idToLang, suppress)) ?? allowed[0] ?? "en");
    onProgress?.({
      stage: "transcribing",
      fraction: (i + 1) / cells,
      note: t("run.listeningForLanguage"),
    });
  }

  // Three filters, cheapest first, each removing a different way a language
  // nobody spoke gets into the result: a pause voting at random, a single cell
  // disagreeing with both neighbours, and a flicker too short to be real.
  const heard = silenceInherits(labels, cellEnergies(audio, cell));
  const runs = absorbStrayLanguages(
    runsFromLabels(smoothLabels(heard), cell, audio.length),
    audio.length,
  );

  // Put each change where it actually happened, not on the grid that found it.
  // A cut two seconds early leaves two seconds of the *old* language at the
  // head of the new language's pass, and Whisper does not skip what it cannot
  // place: it invents.
  const refineWindow = REFINE_WINDOW_S * TARGET_SAMPLE_RATE;
  for (let i = 1; i < runs.length; i += 1) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const after = runs[i]!.language;
    const span = REFINE_SPAN_S * TARGET_SAMPLE_RATE;
    const lo = Math.max(runs[i - 1]!.from, runs[i]!.from - span);
    const hi = Math.min(runs[i]!.to - refineWindow, runs[i]!.from + span);
    let lastBefore: number | null = null;
    let firstAfter: number | null = null;
    for (let at = lo; at <= hi; at += REFINE_STEP_S * TARGET_SAMPLE_RATE) {
      const window = audio.slice(at, at + refineWindow);
      const heard = await detectWindow(pipe, window, idToLang, suppress);
      if (heard === after) {
        firstAfter = at;
        break;
      }
      lastBefore = at;
    }
    // A window reads as a language once most of it is that language, so the
    // change lies after the middle of the last window that still read as the
    // old one and before the middle of the first that read as the new one.
    const estimate =
      firstAfter === null
        ? runs[i]!.from
        : lastBefore === null
          ? firstAfter + refineWindow / 2
          : (lastBefore + firstAfter) / 2 + refineWindow / 2;
    const cut = quietestNear(
      audio,
      Math.max(runs[i - 1]!.from + 1, Math.min(estimate, runs[i]!.to - 1)),
      SNAP_RADIUS_S * TARGET_SAMPLE_RATE,
    );
    runs[i - 1]!.to = cut;
    runs[i]!.from = cut;
  }

  return runs.filter((run) => run.to > run.from);
}

/// Decoder debris, not content.
///
/// A multi-byte character split across the end of a token sequence decodes to
/// U+FFFD REPLACEMENT CHARACTER -- which is exactly what a mixed-language
/// recording produces most of, at every seam.
export function readable(text: string): string {
  return text.replace(/\uFFFD/g, "").replace(/\s+/g, " ").trim();
}

type Transcriber = (
  audio: Float32Array,
  settings: Record<string, unknown>,
) => Promise<{ text: string; chunks?: WhisperChunk[] }>;

/// Read again over any stretch of speech that produced nothing.
///
/// Whisper's pipeline reconciles overlapping windows by matching their tokens,
/// and when that match goes wrong it does not error — it drops the span.
/// Measured by OpenSubs on real footage: twenty seconds of a Chinese interview
/// simply absent from the output.
///
/// It is also *chaotic*. Moving where a pass begins by half a second reshuffles
/// every 30-second window inside it, and the same audio then loses a different
/// span, or none. Three runs over one file covered 210 seconds, then 184, then
/// 201. So it cannot be tuned away by choosing better boundaries; a boundary
/// that avoids it on one file is luck.
///
/// What can be done is to notice. Silence needs no transcript, so a gap is only
/// suspicious when there is sound in it — and then the span is read again on
/// its own, where it is the whole input rather than one window among many and
/// there is nothing to reconcile it against.
async function fillGaps(
  chunks: Chunk[],
  runs: LanguageRun[],
  audio: Float32Array,
  transcriber: Transcriber,
  englishOnly: boolean,
  translate: boolean,
  onProgress?: (progress: Progress) => void,
  signal?: AbortSignal,
): Promise<void> {
  let energy = 0;
  for (let i = 0; i < audio.length; i += 16) energy += audio[i]! * audio[i]!;
  const overall = Math.sqrt(energy / Math.max(1, audio.length / 16));
  if (!(overall > 0)) return;

  // Re-reading is bounded work. A handful of gaps is a recogniser having a bad
  // moment, which is worth fixing; dozens mean something else is wrong, and
  // grinding through all of them would turn a transcription that finished
  // badly into one that does not finish.
  let budget = Math.min(
    MAX_REFILLS,
    Math.ceil(audio.length / TARGET_SAMPLE_RATE / REFILL_SECONDS_EACH),
  );

  // Rounds, because one re-read often does not finish the job: something in
  // the first seconds after a speaker changes poisons the window, and stepping
  // past it is all that is needed. So whatever a re-read leaves uncovered
  // becomes a gap again, until nothing new comes back.
  for (let round = 0; round < MAX_REFILL_ROUNDS && budget > 0; round += 1) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const found: Chunk[] = [];
    chunks.sort((a, b) => a.start_ms - b.start_ms);

    for (const run of runs) {
      const from = run.from / TARGET_SAMPLE_RATE;
      const to = run.to / TARGET_SAMPLE_RATE;
      let cursor = from;
      const inside = chunks.filter(
        (c) => c.start_ms / 1000 >= from - 0.5 && c.start_ms / 1000 < to,
      );
      for (const seg of [...inside, { start_ms: to * 1000, end_ms: to * 1000, text: "" }]) {
        const startS = seg.start_ms / 1000;
        const gap = startS - cursor;
        if (
          budget > 0 &&
          gap >= GAP_S &&
          gap <= MAX_GAP_S &&
          loudness(audio, cursor, startS) > overall * GAP_SPEECH_RATIO
        ) {
          budget -= 1;
          if (signal?.aborted) throw new DOMException("aborted", "AbortError");
          onProgress?.({
            stage: "transcribing",
            fraction: null,
            note: t("run.rereading", { seconds: Math.round(gap) }),
          });
          const slice = audio.slice(
            Math.round(cursor * TARGET_SAMPLE_RATE),
            Math.round(startS * TARGET_SAMPLE_RATE),
          );
          const again = await transcriber(slice, {
            return_timestamps: true,
            chunk_length_s: CHUNK_LENGTH_S,
            stride_length_s: STRIDE_LENGTH_S,
            no_repeat_ngram_size: 6,
            ...(englishOnly
              ? {}
              : { language: run.language, task: translate ? "translate" : "transcribe" }),
          });
          for (const chunk of again.chunks ?? []) {
            const text = readable(chunk.text);
            const [begin, end] = chunk.timestamp;
            if (!text || typeof begin !== "number") continue;
            const covers = (typeof end === "number" && end > begin ? end : begin) - begin;
            if (looksInvented(text, covers)) continue;
            const start = cursor + begin;
            // Never past the gap it was asked to fill.
            if (start >= startS) continue;
            found.push({
              start_ms: Math.round(start * 1000),
              end_ms: Math.round(
                Math.min(
                  startS,
                  cursor + (typeof end === "number" && end > begin ? end : begin + 1),
                ) * 1000,
              ),
              text,
            });
          }
        }
        cursor = Math.max(cursor, seg.end_ms / 1000);
      }
    }

    if (found.length === 0) break;
    chunks.push(...found);
    chunks.sort((a, b) => a.start_ms - b.start_ms);
  }
}

let pipelinePromise: Promise<unknown> | null = null;
let loadedModel: string | null = null;

/// Whether a model is already in memory, so the interface can say "loaded"
/// rather than warning about a download that will not happen.
export function isLoaded(model: string): boolean {
  return loadedModel === model && pipelinePromise !== null;
}

/// Transcribe 16 kHz mono PCM into timed chunks.
///
/// Timestamps are per segment, not per word: word-level timings need a model
/// exported with cross-attentions, which the quantised ONNX Whisper builds are
/// not, and asking for them throws outright rather than degrading.
export async function transcribe(options: Options): Promise<Transcribed> {
  const device = await support();
  if (!device.ok) throw new Error(device.reason ?? t("error.unsupported"));

  const model = options.model ?? DEFAULT_MODEL;
  options.onProgress?.({ stage: "model", fraction: null, note: t("run.loadingModel") });

  // transformers.js is roughly 10 MB and most visits never transcribe, so it
  // is imported the first time this runs rather than at page load.
  const { pipeline, env } = await import("@huggingface/transformers");

  // Serve ONNX Runtime's WebAssembly backend from our own origin. See the
  // module doc: an undeclared third-party runtime fetch would make this
  // product's central claim false.
  const wasm = env.backends?.onnx?.wasm;
  if (wasm) wasm.wasmPaths = new URL("./ort/", document.baseURI).href;

  if (loadedModel !== model) {
    pipelinePromise = null;
    loadedModel = model;
  }
  pipelinePromise ??= pipeline("automatic-speech-recognition", model, {
    device: device.device,
    // Quantised weights on WebGPU, full precision on the WebAssembly backend.
    // This is a hard constraint, not a tuning preference: `q8` fails outright
    // on ONNX Runtime's wasm backend for these Whisper exports -- session
    // creation dies on a missing scale -- while WebGPU loads them happily.
    // Choosing q8 everywhere works on the developer's machine and breaks for
    // everyone without WebGPU.
    dtype: device.device === "webgpu" ? "q8" : "fp32",
    progress_callback: (event: { status?: string; progress?: number }) => {
      if (event.status === "progress" && typeof event.progress === "number") {
        options.onProgress?.({
          stage: "model",
          fraction: event.progress / 100,
          note: t("run.downloadingModel", { percent: Math.round(event.progress) }),
        });
      }
    },
  });

  const transcriber = (await pipelinePromise) as (
    audio: Float32Array,
    settings: Record<string, unknown>,
  ) => Promise<{ text: string; chunks?: WhisperChunk[] }>;

  if (options.signal?.aborted) throw new DOMException("aborted", "AbortError");
  const minutes = options.pcm.length / TARGET_SAMPLE_RATE / 60;
  options.onProgress?.({
    stage: "transcribing",
    fraction: null,
    note:
      minutes < 1
        ? t("run.listeningShort")
        : t("run.listening", { minutes: Math.round(minutes) }),
  });

  const englishOnly = model.endsWith(".en");
  const primary = options.language?.trim() ? whisperCode(options.language.trim()) : null;
  const secondary =
    primary && options.secondLanguage?.trim()
      ? whisperCode(options.secondLanguage.trim())
      : null;
  const named = [primary, secondary]
    .filter((code): code is string => Boolean(code))
    .filter((code, i, all) => all.indexOf(code) === i);

  // Where each language starts and stops.
  //
  // An English-only checkpoint has one answer by construction, and so does a
  // single named language -- neither pays for detection. Two named languages
  // still need detecting, because knowing which of them is being spoken *when*
  // is the whole point; naming them only narrows what detection may answer.
  const runs: LanguageRun[] =
    englishOnly || named.length === 1
      ? [{ from: 0, to: options.pcm.length, language: named[0] ?? "en" }]
      : await languageRuns(transcriber, options.pcm, named, options.onProgress, options.signal);

  const chunks: Chunk[] = [];
  const heard: string[] = [];
  const spoken = new Map<string, number>();
  for (const run of runs) {
    spoken.set(run.language, (spoken.get(run.language) ?? 0) + (run.to - run.from));
    if (options.signal?.aborted) throw new DOMException("aborted", "AbortError");
    if (!heard.includes(run.language)) heard.push(run.language);

    // Each stretch goes through the pipeline whole rather than window by
    // window, so the pipeline's own overlap handling still stitches words
    // across a seam. Only a real language change breaks that continuity, and a
    // language change is a change of speaker.
    //
    // The pass reads a few seconds past its own end and keeps a segment only if
    // that segment *started* before the cut: finishing a sentence already under
    // way is what the overrun is for, transcribing the next speaker in the
    // wrong language is what it must not become.
    const readTo = Math.min(run.to + LEAD_OUT_S * TARGET_SAMPLE_RATE, options.pcm.length);
    const result = await transcriber(options.pcm.slice(run.from, readTo), {
      return_timestamps: true,
      // Whisper's context is 30 seconds; longer audio is windowed, with overlap
      // so a word spanning a boundary is not lost.
      chunk_length_s: CHUNK_LENGTH_S,
      stride_length_s: STRIDE_LENGTH_S,
      // Whisper at this size gets stuck in loops -- twenty seconds of one
      // repeated phrase, in any language. Blocking a repeated n-gram is the
      // cheap half of the standard mitigation; six is long enough that ordinary
      // repetition in speech survives it.
      no_repeat_ngram_size: 6,
      ...(englishOnly
        ? {}
        : { language: run.language, task: options.translate ? "translate" : "transcribe" }),
    });

    // Timestamps come back relative to the slice, so they are put back on the
    // recording's own timeline before anything downstream sees them.
    const offset = run.from / TARGET_SAMPLE_RATE;
    const cut = run.to / TARGET_SAMPLE_RATE;
    for (const chunk of result.chunks ?? []) {
      const text = readable(chunk.text);
      if (!text) continue;
      const [start, end] = chunk.timestamp;
      if (typeof start !== "number") continue;
      // Began after this pass's own audio ended: that is the next speaker, and
      // the next pass reads them in their own language.
      if (offset + start >= cut) continue;
      // A long span holding almost no text is a guess smeared across audio the
      // model could not read, not a slow speaker. Dropping it also lets the gap
      // filler below see the span as unread and try it on its own.
      const covers = (typeof end === "number" && end > start ? end : start) - start;
      if (looksInvented(text, covers)) continue;
      chunks.push({
        start_ms: Math.round((offset + start) * 1000),
        // A final chunk can come back with a null end; give it a plausible
        // length rather than a zero-length cue no player will show.
        end_ms: Math.round(
          (offset +
            (typeof end === "number" && end > start
              ? end
              : start + Math.max(0.3, text.length * 0.06))) *
            1000,
        ),
        text,
      });
    }
  }

  chunks.sort((a, b) => a.start_ms - b.start_ms);

  // Anything the pipeline dropped, read again on its own.
  await fillGaps(
    chunks,
    runs,
    options.pcm,
    transcriber,
    englishOnly,
    Boolean(options.translate),
    options.onProgress,
    options.signal,
  );

  if (chunks.length === 0) {
    throw new Error(t("error.noSpeech"));
  }

  // One script, whichever one was asked for.
  //
  // Whisper has a single `<|zh|>` and writes whichever script it likes, changing
  // within a file — measured here across a 28-minute meeting that alternated
  // dozens of times. Choosing 简体 has to mean something, and afterwards is the
  // only place it can. Traditional is left alone: that direction is not one
  // character to one, and a table cannot choose between 干, 乾 and 幹.
  if (heard.some(isChinese) && !wantsTraditional(options.language)) {
    for (const chunk of chunks) chunk.text = await toSimplified(chunk.text);
  }

  const dominant =
    [...spoken.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? heard[0] ?? null;
  return { chunks, languages: heard, dominant };
}
