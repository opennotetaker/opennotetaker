// The Rust core, as the rest of the app sees it.
//
// Everything crosses this boundary as a JSON string (see the note-wasm module
// doc for why). That would be tedious and error-prone at every call site, so
// it happens exactly once, here, and the rest of the app works in typed
// objects.
//
// `load()` must be awaited before anything else. The wasm module is fetched
// and instantiated, and calling into it beforehand throws from inside the
// generated glue with a message about a stack pointer that names nothing a
// reader could act on.

import init, {
  Library as WasmLibrary,
  creditPricing,
  cueLanguages as cueLanguages_,
  diarize as wasmDiarize,
  diarizeDefaults,
  excerptTranscript,
  exportFormats,
  exportTranscript,
  formatClock as wasmFormatClock,
  normaliseTranscript,
  parseClock as wasmParseClock,
  quoteAsk,
  quoteSummary,
  quoteTranslation,
  redactTranscript,
  redactionKinds,
  renderForModel,
  segmentAt,
  splitSegment,
  summariseLocally,
  summaryChunks,
  talkTime,
  transcriptFromChunks,
  translationBatchSize,
} from "./wasm-gen/note_engine";
import wasmUrl from "./wasm-gen/note_engine_bg.wasm?url";

import { t } from "./lib/i18n";
import type {
  AskRequest,
  DiarizeOptions,
  DiarizeReport,
  ExportFormatInfo,
  Hit,
  Pricing,
  Quote,
  RedactionKind,
  RedactionReport,
  Summary,
  TalkTimeRow,
  Transcript,
} from "./types";

let ready: Promise<void> | null = null;

/// Fetch and instantiate the engine. Idempotent; safe to await from anywhere.
export function load(): Promise<void> {
  ready ??= init({ module_or_path: wasmUrl }).then(() => undefined);
  return ready;
}

export interface ExportOptions {
  title: string;
  speakers: boolean;
  summary: Summary | null;
  recorded_at: string | null;
  consent: string | null;
  /// Every word the Rust exporters write themselves — headings, "due", the
  /// counts template. Supplied by the interface, because only it knows what
  /// language the reader wants. See `i18n.exportLabels`.
  labels: Record<string, string>;
}

const json = <T>(text: string): T => JSON.parse(text) as T;

export function normalise(transcript: Transcript): Transcript {
  return json(normaliseTranscript(JSON.stringify(transcript)));
}

export interface WhisperChunk {
  start_ms: number;
  end_ms: number;
  text: string;
}

export function fromChunks(
  chunks: WhisperChunk[],
  language: string | null,
  recorded: boolean,
): Transcript {
  return json(transcriptFromChunks(JSON.stringify(chunks), language ?? undefined, recorded));
}

export function split(transcript: Transcript, atMs: number): { transcript: Transcript; index: number } {
  return json(splitSegment(JSON.stringify(transcript), atMs));
}

export function excerpt(transcript: Transcript, fromMs: number, toMs: number): Transcript {
  return json(excerptTranscript(JSON.stringify(transcript), fromMs, toMs));
}

export function talkTimes(transcript: Transcript): TalkTimeRow[] {
  return json(talkTime(JSON.stringify(transcript)));
}

export function lineAt(transcript: Transcript, atMs: number): number | null {
  return segmentAt(JSON.stringify(transcript), atMs) ?? null;
}

export function diarizeDefaultOptions(): DiarizeOptions {
  return json(diarizeDefaults());
}

/// Label the transcript's lines with speakers, from the audio it was made from.
///
/// The PCM crosses as a typed-array view with no copy -- an hour of 16 kHz
/// audio is 230 MB as JSON and 230 KB as bytes.
export function diarize(
  transcript: Transcript,
  pcm: Float32Array,
  options: DiarizeOptions,
): { transcript: Transcript; report: DiarizeReport } {
  return json(wasmDiarize(JSON.stringify(transcript), pcm, JSON.stringify(options)));
}

export function summariseLocal(transcript: Transcript): Summary {
  return json(summariseLocally(JSON.stringify(transcript), ""));
}

/// The transcript exactly as a paid request would carry it.
///
/// Used for two things that must agree: showing the user what would be sent,
/// and pricing it. Both read this one string.
export function renderForRequest(transcript: Transcript): string {
  return renderForModel(JSON.stringify(transcript));
}

export function requestCount(rendered: string): number {
  return summaryChunks(rendered);
}

export function redact(
  transcript: Transcript,
  kinds: RedactionKind[] | null,
): { transcript: Transcript; report: RedactionReport } {
  return json(
    redactTranscript(
      JSON.stringify(transcript),
      kinds ? JSON.stringify({ kinds }) : "",
    ),
  );
}

export function redactions(): { kind: RedactionKind; label: string; placeholder: string }[] {
  return json(redactionKinds());
}

/// Every export format, with the label in the reader's language.
///
/// The extension and MIME type come from the engine, which is the authority on
/// them; the label does not, because "Markdown notes (.md)" is interface copy
/// and belongs in the catalogue with the rest of it.
export function formats(): ExportFormatInfo[] {
  return json<ExportFormatInfo[]>(exportFormats()).map((format) => ({
    ...format,
    label: t(`format.${format.format}` as Parameters<typeof t>[0]),
  }));
}

export function render(
  transcript: Transcript,
  format: string,
  options: Partial<ExportOptions> = {},
): string {
  const full: ExportOptions = {
    title: "Transcript",
    speakers: true,
    summary: null,
    recorded_at: null,
    consent: null,
    // Empty is safe, and partial is safe too: `note_export::Labels` carries a
    // container-level `serde(default)`, so any field the interface does not
    // send falls back to its English default individually rather than the
    // whole struct being all-or-nothing. A locale that translates most of the
    // export headings and not the rest degrades one heading at a time.
    labels: {},
    ...options,
  };
  return exportTranscript(JSON.stringify(transcript), format, JSON.stringify(full));
}

// --------------------------------------------------------------------- money

export function quoteForSummary(rendered: string): Quote {
  return json(quoteSummary(rendered));
}

export function quoteForAsk(question: string, passages: string[]): Quote {
  return json(quoteAsk(question, JSON.stringify(passages)));
}

export function quoteForTranslation(lines: string[], target: string): Quote {
  return json(quoteTranslation(JSON.stringify(lines), target));
}

/// The credit denomination, read from the core rather than duplicated here.
///
/// Resolved on first use, not at import: a module-level call runs before
/// `load()` has instantiated the module.
let pricingCache: Pricing | null = null;
export function pricing(): Pricing {
  pricingCache ??= json<Pricing>(creditPricing());
  return pricingCache;
}

export function translationBatch(): number {
  return translationBatchSize();
}

/// The languages whose action items, decisions and deadlines the free
/// summariser can find, by their own endonyms.
///
/// Named on screen rather than left to be discovered by absence: finding no
/// action items in a Finnish meeting is indistinguishable from a correct empty
/// result, so the panel says which languages it actually looked for.
export function cueLanguages(): string[] {
  return json(cueLanguages_());
}

// ---------------------------------------------------------------- the library

/// A BM25 index over the whole stored library, held across queries.
export class SearchIndex {
  private readonly inner = new WasmLibrary();

  add(noteId: string, transcript: Transcript): void {
    this.inner.addNote(noteId, JSON.stringify(transcript));
  }

  get size(): number {
    return this.inner.passageCount();
  }

  search(query: string, limit = 30): Hit[] {
    if (!query.trim()) return [];
    return json(this.inner.search(query, limit));
  }

  /// Exactly the passages a paid question would carry, so the interface can
  /// show them before anything is sent.
  askPassages(question: string, titles: Record<string, string>): AskRequest {
    return json(this.inner.askPassages(question, JSON.stringify(titles)));
  }
}

// ----------------------------------------------------------------------- time

export function clock(ms: number): string {
  return wasmFormatClock(ms);
}

export function parseTime(text: string): number | null {
  return wasmParseClock(text) ?? null;
}

/// A credit count with its dollar value: `8 credits · $0.04`.
///
/// Both halves, always. Credits alone are a currency nobody has an instinct
/// for -- "26 credits" could be pennies or a month's subscription, and a
/// reader should not have to find the conversion to know which.
export function priceLabel(credits: number): string {
  return `${creditWord(credits)} · ${usd(credits * pricing().credit_usd)}`;
}

export function creditWord(credits: number): string {
  return credits === 1 ? t("common.credit") : t("common.credits", { count: credits });
}

/// Sub-cent amounts get three decimals rather than rounding to `$0.00`, which
/// reads as free and is the one thing a price must never do.
export function usd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}
