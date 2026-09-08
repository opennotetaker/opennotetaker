// The shapes that cross between the Rust core, the browser and storage.
//
// Written out rather than generated from the Rust types. wasm-bindgen produces
// declarations for the *functions*, not for the JSON they carry, so these are
// the only description of that JSON on this side. Keeping them in one file
// means a change to a Rust `Serialize` has exactly one place to be mirrored --
// and `npm run typecheck` then names every call site that assumed otherwise.

export type Source = "recorded" | "imported";
export type Origin = "extracted" | "generated";

export interface Segment {
  start_ms: number;
  end_ms: number;
  text: string;
  speaker: string | null;
  confidence: number | null;
  edited: boolean;
}

export interface Speaker {
  id: string;
  label: string;
  named: boolean;
}

export interface Transcript {
  language: string | null;
  segments: Segment[];
  speakers: Speaker[];
  duration_ms: number;
  source: Source;
}

export interface ActionItem {
  text: string;
  owner: string | null;
  due: string | null;
  at_ms: number | null;
}

/// The countable facts about a transcript, for an extracted summary's header.
///
/// Structured rather than a finished sentence, because that sentence has to be
/// written in the reader's language — see `summary.stats` in the catalogues.
export interface SummaryStats {
  sentences: number;
  minutes: number;
  speakers: number;
}

export interface Summary {
  origin: Origin;
  /// Prose, from the paid summariser. Empty for an extracted summary, which
  /// reports `stats` instead.
  overview: string;
  /// Counts, from the free summariser. `null` for a written one.
  stats: SummaryStats | null;
  keywords: string[];
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  questions: string[];
}

export interface DiarizeReport {
  speakers: number;
  unassigned: number;
  min_merge_distance: number;
  max_merge_distance: number;
}

export interface DiarizeOptions {
  speakers: { mode: "auto" } | { mode: "exactly"; 0: number };
  threshold: number;
  max_speakers: number;
  min_voiced_ms: number;
}

export interface Quote {
  credits: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  price_usd: number;
}

export interface Pricing {
  credit_usd: number;
  pack_credits: number;
  pack_usd: number;
}

export interface Passage {
  note_id: string;
  segment: number;
  start_ms: number;
  end_ms: number;
  speaker: string | null;
  text: string;
}

export interface Hit {
  passage: Passage;
  score: number;
}

export interface Citation {
  tag: string;
  note_id: string;
  note_title: string;
  at_ms: number;
  speaker: string | null;
  text: string;
}

export interface AskRequest {
  question: string;
  passages: Citation[];
}

export interface Answer {
  answer: string;
  answered: boolean;
  cited: Citation[];
}

export type RedactionKind = "email" | "phone" | "long_number" | "url";

export interface RedactionReport {
  counts: [RedactionKind, number][];
}

export interface ExportFormatInfo {
  format: string;
  label: string;
  extension: string;
  mime: string;
}

export interface TalkTimeRow {
  id: string;
  label: string;
  ms: number;
}

/// What was agreed, by whom, before a recording started.
///
/// Stored with the note and rendered into document exports, because the
/// artefact outlives the app: consent that exists only as a dialog somebody
/// clicked is not evidence of anything a month later.
export interface ConsentRecord {
  /// ISO 8601, in the recorder's own timezone offset.
  at: string;
  /// What the recorder typed: who is in the room.
  participants: string;
  /// The exact wording that was on screen when they confirmed. Kept verbatim
  /// so a later change to our copy does not retroactively rewrite what a user
  /// agreed to.
  disclosure: string;
  /// Which sources were captured.
  captured: string[];
  method: "announced" | "written" | "solo";
}

/// One stored recording, as the library holds it.
export interface Note {
  id: string;
  title: string;
  /// Milliseconds since the epoch. Used for retention and for ordering.
  created: number;
  updated: number;
  transcript: Transcript;
  summary: Summary | null;
  /// The paid summary, kept separately from the free one so that buying a
  /// summary never overwrites the extracted one a user may still want.
  aiSummary: Summary | null;
  consent: ConsentRecord | null;
  /// The recording itself, when the user chose to keep it. Absent when they
  /// chose "transcript only", which is the privacy-maximal option and the
  /// default for imports.
  audio: Blob | null;
  audioType: string | null;
  durationMs: number;
  language: string | null;
  /// Every language heard in the recording, as ISO codes, when more than one
  /// was. Absent on notes made before the recogniser could tell.
  languages?: string[];
}

/// How long the library keeps things.
export type Retention = "forever" | "90d" | "30d" | "7d" | "session";

export interface Settings {
  retention: Retention;
  /// Keep the audio alongside the transcript. Off means the recording is
  /// discarded once transcribed.
  keepAudio: boolean;
  /// Strip obvious secrets before any paid request leaves the machine.
  redactBeforeSending: boolean;
  model: string;
  /// A Whisper language name, or empty to detect.
  language: string;
  /// A second language, for a meeting known to be held in two. Only read when
  /// a first one is named -- see `secondLanguage` in lib/transcribe.ts.
  secondLanguage: string;
  /// Use Whisper's own `translate` task, which turns any of its 99 source
  /// languages into English in the tab, for nothing. Any other target language
  /// is the paid route on a finished transcript.
  translateToEnglish: boolean;
  diarize: boolean;
}
