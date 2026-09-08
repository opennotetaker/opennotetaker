//! The boundary between the Rust core and the tab.
//!
//! # Why everything crosses as a JSON string
//!
//! `serde-wasm-bindgen` would hand back real JavaScript objects and save a
//! serialisation. It would also put a second, implicit schema at this
//! boundary -- the one the bindings infer -- next to the explicit one
//! `serde_json` already gives us, and the two disagree on exactly the cases
//! that matter (enum representations, `Option`, integers above 2^53). A JSON
//! string is one schema, checked by the same `Serialize` implementations the
//! export format and the stored library use, and the cost is a parse of a few
//! hundred kilobytes at human-interaction speed.
//!
//! One exception: audio. PCM crosses as a `Float32Array` view with no copy,
//! because an hour of 16 kHz audio is 230 MB as JSON and 230 KB as bytes.
//!
//! # Errors, and why the logic is one layer down
//!
//! Every entry point returns `Result<_, JsError>` rather than panicking. A
//! Rust panic in wasm poisons the module -- every later call traps and the app
//! has to be reloaded -- so a malformed transcript would take the whole tab
//! down rather than one button.
//!
//! `JsError` cannot be constructed off a wasm target, so a test that checks
//! "this input is rejected rather than panicking" cannot run on the host if
//! the logic returns `JsError` directly. The work therefore lives in [`imp`],
//! which returns `Result<_, String>` and is fully tested by `cargo test`, and
//! the exported functions are one-line wrappers that convert. The property
//! most worth testing here is precisely the one that would otherwise be
//! untestable.

#![forbid(unsafe_code)]

use note_core::{redact, Index, Redactor, Source, Transcript};
use note_credits::Rates;
use note_export::{ExportOptions, Format};
use serde::Deserialize;
use wasm_bindgen::prelude::*;

/// The vendor rates every quote is computed against.
///
/// One constant, so the browser cannot quote against a different price list
/// than the gateway charges from.
const RATES: Rates = Rates::DEEPSEEK_CHAT;

use work::{emit, parse, transcript as read_transcript, Outcome};

/// Convert an internal result into the one the bindings expose.
fn out(result: Outcome) -> Result<String, JsError> {
    result.map_err(|e| JsError::new(&e))
}

// ---------------------------------------------------------------- transcript

/// Sort, clamp and de-overlap a transcript, and rebuild its speaker legend.
#[wasm_bindgen(js_name = normaliseTranscript)]
pub fn normalise_transcript(transcript: &str) -> Result<String, JsError> {
    out(work::normalise_transcript(transcript))
}

/// Build a transcript from Whisper's raw chunks.
#[wasm_bindgen(js_name = transcriptFromChunks)]
pub fn transcript_from_chunks(
    chunks: &str,
    language: Option<String>,
    recorded: bool,
) -> Result<String, JsError> {
    out(work::transcript_from_chunks(chunks, language, recorded))
}

/// Split the line playing at `at_ms` in two. Returns the new transcript and
/// the index of the second half, so the editor can put the caret there.
#[wasm_bindgen(js_name = splitSegment)]
pub fn split_segment(transcript: &str, at_ms: f64) -> Result<String, JsError> {
    out(work::split_segment(transcript, at_ms))
}

/// A clip's transcript, with the clock rebased to the start of the clip.
#[wasm_bindgen(js_name = excerptTranscript)]
pub fn excerpt_transcript(transcript: &str, from_ms: f64, to_ms: f64) -> Result<String, JsError> {
    out(work::excerpt_transcript(transcript, from_ms, to_ms))
}

/// Who held the floor for how long, most talkative first.
#[wasm_bindgen(js_name = talkTime)]
pub fn talk_time(transcript: &str) -> Result<String, JsError> {
    out(work::talk_time(transcript))
}

/// Which line is playing at `at_ms`, or `null` before the first one starts.
#[wasm_bindgen(js_name = segmentAt)]
pub fn segment_at(transcript: &str, at_ms: f64) -> Result<Option<usize>, JsError> {
    work::segment_at(transcript, at_ms).map_err(|e| JsError::new(&e))
}

// ---------------------------------------------------------------- diarization

/// Label every line with a speaker, from the audio it was transcribed from.
///
/// `pcm` must be the same 16 kHz mono samples Whisper was given. It crosses as
/// a typed-array view rather than as JSON -- see the module doc.
#[wasm_bindgen(js_name = diarize)]
pub fn diarize(transcript: &str, pcm: &[f32], options: &str) -> Result<String, JsError> {
    out(work::diarize(transcript, pcm, options))
}

/// The default diarization settings, so the interface does not carry a second
/// copy of them that can drift from the core's.
#[wasm_bindgen(js_name = diarizeDefaults)]
pub fn diarize_defaults() -> Result<String, JsError> {
    out(work::diarize_defaults())
}

// ------------------------------------------------------------------- summary

/// The free summary: topics, key points, actions, decisions and questions, all
/// picked out of the transcript on this machine.
#[wasm_bindgen(js_name = summariseLocally)]
pub fn summarise_locally(transcript: &str, options: &str) -> Result<String, JsError> {
    out(work::summarise_locally(transcript, options))
}

/// The transcript as the paid summariser will send it: attributed,
/// timestamped, turns merged.
///
/// Exposed because the browser prices the job against exactly this string.
#[wasm_bindgen(js_name = renderForModel)]
pub fn render_for_model(transcript: &str) -> Result<String, JsError> {
    out(work::render_for_model(transcript))
}

/// How many requests a transcript this long will take.
#[wasm_bindgen(js_name = summaryChunks)]
pub fn summary_chunks(rendered: &str) -> usize {
    work::summary_chunks(rendered)
}

/// The languages whose action items, decisions and deadlines the free
/// summariser can actually find.
///
/// Exposed so the interface can name them. Topics and key sentences work in
/// any language Whisper transcribes -- they are word frequency -- but cue
/// detection is phrase matching and is per-language. Finding no action items
/// in a Finnish meeting and letting the reader conclude their meeting had none
/// is indistinguishable from a correct empty result, which is why this is on
/// screen rather than in a changelog.
#[wasm_bindgen(js_name = cueLanguages)]
pub fn cue_languages() -> Result<String, JsError> {
    out(work::cue_languages())
}

// -------------------------------------------------------------------- search

/// A BM25 index over one transcript or the whole library.
///
/// Held across calls rather than rebuilt per query: a library of a hundred
/// meetings is tens of thousands of passages, and rebuilding that for every
/// keystroke would make search feel broken.
#[wasm_bindgen]
pub struct Library {
    index: Index,
}

#[wasm_bindgen]
impl Library {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Library {
        Library {
            index: Index::new(),
        }
    }

    /// Add one stored note.
    #[wasm_bindgen(js_name = addNote)]
    pub fn add_note(&mut self, note_id: &str, transcript: &str) -> Result<(), JsError> {
        self.add(note_id, transcript).map_err(|e| JsError::new(&e))
    }

    #[wasm_bindgen(js_name = passageCount)]
    pub fn passage_count(&self) -> usize {
        self.index.len()
    }

    /// The best matching passages, best first. Free, local, and the whole of
    /// what most searches need.
    #[wasm_bindgen(js_name = search)]
    pub fn search(&self, query: &str, limit: usize) -> Result<String, JsError> {
        out(self.find(query, limit))
    }

    /// The passages a paid question would be answered from, already tagged and
    /// titled -- so the interface can show exactly what will be sent before
    /// anything is sent.
    #[wasm_bindgen(js_name = askPassages)]
    pub fn ask_passages(&self, question: &str, titles: &str) -> Result<String, JsError> {
        out(self.passages_for(question, titles))
    }
}

/// The same three operations, host-testable.
impl Library {
    pub fn add(&mut self, note_id: &str, json: &str) -> Result<(), String> {
        self.index.add(note_id, &read_transcript(json)?);
        Ok(())
    }

    pub fn find(&self, query: &str, limit: usize) -> Outcome {
        emit(&self.index.search(query, limit))
    }

    pub fn passages_for(&self, question: &str, titles: &str) -> Outcome {
        let titles: std::collections::HashMap<String, String> = parse(titles, "the note titles")?;
        let hits = self.index.search(question, note_summary::ask::MAX_PASSAGES);
        let request = note_summary::ask::AskRequest::from_hits(question, &hits, |note_id| {
            titles
                .get(note_id)
                .cloned()
                .unwrap_or_else(|| "Untitled".into())
        });
        emit(&request)
    }
}

impl Default for Library {
    fn default() -> Self {
        Self::new()
    }
}

// ------------------------------------------------------------------- privacy

/// Strip the obvious secrets from a transcript, and report what was found.
///
/// Runs before a paid request is built, never after -- redacting the copy that
/// has already been sent would be theatre.
#[wasm_bindgen(js_name = redactTranscript)]
pub fn redact_transcript(transcript: &str, redactor: &str) -> Result<String, JsError> {
    out(work::redact_transcript(transcript, redactor))
}

/// The redaction kinds, with the labels the interface shows.
#[wasm_bindgen(js_name = redactionKinds)]
pub fn redaction_kinds() -> Result<String, JsError> {
    out(work::redaction_kinds())
}

// -------------------------------------------------------------------- export

#[wasm_bindgen(js_name = exportTranscript)]
pub fn export_transcript(transcript: &str, format: &str, options: &str) -> Result<String, JsError> {
    out(work::export_transcript(transcript, format, options))
}

/// Every format, with the label, extension and MIME type the download needs.
#[wasm_bindgen(js_name = exportFormats)]
pub fn export_formats() -> Result<String, JsError> {
    out(work::export_formats())
}

// --------------------------------------------------------------------- money

/// What a generative summary of this transcript will cost.
///
/// Computed here, from the same crate the gateway charges with, so the figure
/// on the button and the figure on the invoice cannot disagree.
#[wasm_bindgen(js_name = quoteSummary)]
pub fn quote_summary(rendered: &str) -> Result<String, JsError> {
    out(work::quote_summary(rendered))
}

#[wasm_bindgen(js_name = quoteAsk)]
pub fn quote_ask(question: &str, passages: &str) -> Result<String, JsError> {
    out(work::quote_ask(question, passages))
}

#[wasm_bindgen(js_name = quoteTranslation)]
pub fn quote_translation(lines: &str, target: &str) -> Result<String, JsError> {
    out(work::quote_translation(lines, target))
}

/// What a credit is worth and what a pack costs, read from the core rather
/// than written twice.
#[wasm_bindgen(js_name = creditPricing)]
pub fn credit_pricing() -> Result<String, JsError> {
    out(work::credit_pricing())
}

/// How translation is batched, so the interface can show progress against the
/// same batches the gateway will be asked for.
#[wasm_bindgen(js_name = translationBatchSize)]
pub fn translation_batch_size() -> usize {
    note_summary::translate::BATCH_LINES
}

// ---------------------------------------------------------------------- time

#[wasm_bindgen(js_name = formatClock)]
pub fn format_clock(ms: f64) -> String {
    note_core::format_clock(ms as i64)
}

#[wasm_bindgen(js_name = parseClock)]
pub fn parse_clock(text: &str) -> Option<f64> {
    note_core::parse_clock(text).map(|ms| ms as f64)
}

/// The work itself. Everything above is a wrapper; everything here is tested.
pub mod work {
    use super::*;

    pub type Outcome = Result<String, String>;

    pub fn parse<T: serde::de::DeserializeOwned>(json: &str, what: &str) -> Result<T, String> {
        serde_json::from_str(json).map_err(|e| format!("could not read {what}: {e}"))
    }

    /// Read a transcript and establish its invariant in the same step.
    ///
    /// Every entry point that takes a transcript goes through here, so a
    /// transcript round-tripped through storage, hand-edited, or written by an
    /// older version of the app is sorted, de-overlapped and carrying a
    /// complete speaker legend before any consumer sees it. Leaving that to
    /// callers is how an exporter ends up defending against a malformed
    /// transcript.
    pub fn transcript(json: &str) -> Result<Transcript, String> {
        let mut transcript: Transcript = parse(json, "the transcript")?;
        transcript.normalise();
        Ok(transcript)
    }

    pub fn emit<T: serde::Serialize>(value: &T) -> Outcome {
        serde_json::to_string(value).map_err(|e| e.to_string())
    }

    pub fn normalise_transcript(json: &str) -> Outcome {
        emit(&read_transcript(json)?)
    }

    pub fn transcript_from_chunks(
        chunks: &str,
        language: Option<String>,
        recorded: bool,
    ) -> Outcome {
        #[derive(Deserialize)]
        struct Chunk {
            start_ms: i64,
            end_ms: i64,
            text: String,
        }
        let chunks: Vec<Chunk> = parse(chunks, "the transcription output")?;
        let mut transcript = Transcript::from_segments(
            if recorded {
                Source::Recorded
            } else {
                Source::Imported
            },
            chunks
                .into_iter()
                .map(|c| note_core::Segment::new(c.start_ms, c.end_ms, c.text))
                .collect(),
        );
        transcript.language = language.filter(|l| !l.trim().is_empty());
        emit(&transcript)
    }

    pub fn split_segment(json: &str, at_ms: f64) -> Outcome {
        let mut transcript = read_transcript(json)?;
        let index = transcript
            .split_at(at_ms as i64)
            .map_err(|e| e.to_string())?;
        emit(&serde_json::json!({ "transcript": transcript, "index": index }))
    }

    pub fn excerpt_transcript(json: &str, from_ms: f64, to_ms: f64) -> Outcome {
        emit(&read_transcript(json)?.excerpt(from_ms as i64, to_ms as i64))
    }

    pub fn talk_time(json: &str) -> Outcome {
        let transcript = read_transcript(json)?;
        let rows: Vec<serde_json::Value> = transcript
            .talk_time()
            .into_iter()
            .map(|(id, ms)| {
                serde_json::json!({
                    "id": id,
                    "label": transcript.label_for(&id).unwrap_or(&id),
                    "ms": ms,
                })
            })
            .collect();
        emit(&rows)
    }

    pub fn segment_at(json: &str, at_ms: f64) -> Result<Option<usize>, String> {
        Ok(read_transcript(json)?.segment_at(at_ms as i64))
    }

    pub fn diarize(json: &str, pcm: &[f32], options: &str) -> Outcome {
        let mut transcript = read_transcript(json)?;
        let options: note_diarize::Options = parse(options, "the diarization options")?;
        let report = note_diarize::diarize(&mut transcript, pcm, &options);
        emit(&serde_json::json!({ "transcript": transcript, "report": report }))
    }

    pub fn diarize_defaults() -> Outcome {
        emit(&note_diarize::Options::default())
    }

    pub fn summarise_locally(json: &str, options: &str) -> Outcome {
        let transcript = read_transcript(json)?;
        let options: note_summary::local::Options = if options.trim().is_empty() {
            Default::default()
        } else {
            parse(options, "the summary options")?
        };
        emit(&note_summary::summarise(&transcript, &options))
    }

    pub fn render_for_model(json: &str) -> Outcome {
        Ok(note_summary::prompt::render_transcript(&read_transcript(
            json,
        )?))
    }

    pub fn summary_chunks(rendered: &str) -> usize {
        note_summary::prompt::chunk_transcript(rendered, note_summary::prompt::MAX_CHARS_PER_CHUNK)
            .len()
    }

    pub fn redact_transcript(json: &str, redactor: &str) -> Outcome {
        let transcript = read_transcript(json)?;
        let redactor: Redactor = if redactor.trim().is_empty() {
            Redactor::default()
        } else {
            parse(redactor, "the redaction settings")?
        };
        let (cleaned, report) = redact::redact_transcript(&transcript, &redactor);
        emit(&serde_json::json!({ "transcript": cleaned, "report": report }))
    }

    pub fn redaction_kinds() -> Outcome {
        let kinds: Vec<serde_json::Value> = note_core::RedactionKind::ALL
            .iter()
            .map(|kind| {
                serde_json::json!({
                    "kind": kind,
                    "label": kind.label(),
                    "placeholder": kind.placeholder(),
                })
            })
            .collect();
        emit(&kinds)
    }

    pub fn export_transcript(json: &str, format: &str, options: &str) -> Outcome {
        let transcript = read_transcript(json)?;
        let format: Format = parse(&format!("\"{format}\""), "the export format")?;
        let options: ExportOptions = if options.trim().is_empty() {
            ExportOptions::default()
        } else {
            parse(options, "the export options")?
        };
        Ok(note_export::export(&transcript, format, &options))
    }

    pub fn export_formats() -> Outcome {
        let formats: Vec<serde_json::Value> = Format::ALL
            .iter()
            .map(|format| {
                serde_json::json!({
                    "format": format,
                    "label": format.label(),
                    "extension": format.extension(),
                    "mime": format.mime(),
                })
            })
            .collect();
        emit(&formats)
    }

    pub fn quote_summary(rendered: &str) -> Outcome {
        let chunks = summary_chunks(rendered);
        emit(&note_credits::quote_summary(rendered, chunks, RATES))
    }

    pub fn quote_ask(question: &str, passages: &str) -> Outcome {
        let passages: Vec<String> = parse(passages, "the passages")?;
        emit(&note_credits::quote_ask(question, &passages, RATES))
    }

    pub fn quote_translation(lines: &str, target: &str) -> Outcome {
        let lines: Vec<String> = parse(lines, "the lines")?;
        emit(&note_credits::quote_translation(&lines, target, RATES))
    }

    pub fn credit_pricing() -> Outcome {
        emit(&note_credits::pricing())
    }

    pub fn cue_languages() -> Outcome {
        emit(&note_summary::local::cue_languages())
    }
}

#[cfg(test)]
mod tests {
    use super::work;
    use super::Library;

    const TRANSCRIPT: &str = r#"{
        "source": "recorded",
        "language": "en",
        "duration_ms": 9000,
        "segments": [
            {"start_ms": 0, "end_ms": 4000, "text": "Let's review the burn rate.", "speaker": "S0"},
            {"start_ms": 4000, "end_ms": 9000, "text": "I'll send the forecast by Friday.", "speaker": "S1"}
        ],
        "speakers": []
    }"#;

    /// Nothing here may panic on bad input: a Rust panic traps the wasm
    /// module and every later call fails, so one malformed transcript would
    /// take the whole tab down.
    #[test]
    fn malformed_input_is_an_error_and_never_a_panic() {
        assert!(work::normalise_transcript("not json").is_err());
        assert!(work::normalise_transcript("{}").is_err());
        assert!(work::export_transcript(TRANSCRIPT, "no-such-format", "").is_err());
        assert!(work::quote_ask("q", "not json").is_err());
        assert!(work::split_segment(TRANSCRIPT, 90_000.0).is_err());
    }

    #[test]
    fn a_transcript_survives_the_round_trip_and_gains_its_speaker_legend() {
        let out = work::normalise_transcript(TRANSCRIPT).unwrap();
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["speakers"].as_array().unwrap().len(), 2);
        assert_eq!(value["speakers"][0]["label"], "Speaker 1");
    }

    #[test]
    fn whisper_chunks_become_a_transcript() {
        let chunks = r#"[{"start_ms":0,"end_ms":1000,"text":"hello"},
                          {"start_ms":1000,"end_ms":2000,"text":"  "}]"#;
        let out = work::transcript_from_chunks(chunks, Some("en".into()), true).unwrap();
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(
            value["segments"].as_array().unwrap().len(),
            1,
            "blank dropped"
        );
        assert_eq!(value["source"], "recorded");
        assert_eq!(value["language"], "en");
    }

    #[test]
    fn the_free_summary_comes_back_labelled_as_extracted() {
        let out = work::summarise_locally(TRANSCRIPT, "").unwrap();
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["origin"], "extracted");
        assert!(!value["action_items"].as_array().unwrap().is_empty());
    }

    /// The interface names these on the summary panel, so an empty list would
    /// silently turn an honest disclosure into a blank.
    #[test]
    fn the_cue_languages_are_reported_by_their_own_endonyms() {
        let languages: Vec<String> = serde_json::from_str(&work::cue_languages().unwrap()).unwrap();
        assert!(languages.iter().any(|l| l == "简体中文"), "{languages:?}");
        assert!(languages.iter().any(|l| l == "繁體中文"), "{languages:?}");
        assert!(languages.iter().any(|l| l == "English"), "{languages:?}");
        assert!(languages.len() >= 9);
    }

    /// Export headings cross the boundary from the interface, so a Chinese
    /// reader gets a Chinese document rather than Chinese text under English
    /// headings.
    #[test]
    fn export_labels_cross_the_wasm_boundary() {
        let options = serde_json::json!({
            "title": "预算评审",
            "speakers": true,
            "summary": null,
            "recorded_at": null,
            "consent": null,
            "labels": {
                "summary": "摘要",
                "key_points": "要点",
                "decisions": "决定",
                "action_items": "行动项",
                "questions_asked": "提出的问题",
                "questions_open": "待解决的问题",
                "topics": "主题",
                "who_spoke": "谁在说话",
                "transcript": "文字记录",
                "consent": "录音同意",
                "unknown_speaker": "未知",
                "due": "截止",
                "stats": "{sentences} 句 · 约 {minutes} 分钟 · {speakers} 位发言者"
            }
        })
        .to_string();
        let out = work::export_transcript(TRANSCRIPT, "markdown", &options).unwrap();
        assert!(out.contains("# 预算评审"), "{out}");
        assert!(out.contains("## 文字记录"), "{out}");
        assert!(!out.contains("## Transcript"), "{out}");
    }

    /// A caller that sends no labels still gets a valid document, in English.
    #[test]
    fn export_labels_are_optional() {
        let out = work::export_transcript(TRANSCRIPT, "markdown", "").unwrap();
        assert!(out.contains("## Transcript"), "{out}");
    }

    #[test]
    fn every_export_format_is_reachable_by_the_name_it_advertises() {
        let formats: Vec<serde_json::Value> =
            serde_json::from_str(&work::export_formats().unwrap()).unwrap();
        assert_eq!(formats.len(), 8);
        for format in formats {
            let name = format["format"].as_str().unwrap();
            let out = work::export_transcript(TRANSCRIPT, name, "").unwrap();
            assert!(!out.is_empty(), "{name} exported nothing");
        }
    }

    #[test]
    fn the_library_indexes_notes_and_finds_them_again() {
        let mut library = Library::new();
        library.add("n1", TRANSCRIPT).unwrap();
        assert_eq!(library.passage_count(), 2);

        let hits: Vec<serde_json::Value> =
            serde_json::from_str(&library.find("burn rate", 5).unwrap()).unwrap();
        assert!(!hits.is_empty());
        assert_eq!(hits[0]["passage"]["note_id"], "n1");
    }

    #[test]
    fn ask_passages_are_tagged_and_titled_before_anything_is_sent() {
        let mut library = Library::new();
        library.add("n1", TRANSCRIPT).unwrap();
        let out = library
            .passages_for("forecast", r#"{"n1":"Q3 planning"}"#)
            .unwrap();
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["passages"][0]["tag"], "M1");
        assert_eq!(value["passages"][0]["note_title"], "Q3 planning");
    }

    #[test]
    fn a_note_with_no_title_is_named_rather_than_left_blank() {
        let mut library = Library::new();
        library.add("n1", TRANSCRIPT).unwrap();
        let out = library.passages_for("forecast", "{}").unwrap();
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["passages"][0]["note_title"], "Untitled");
    }

    #[test]
    fn a_quote_is_a_positive_number_of_credits_and_the_pricing_is_readable() {
        let rendered = work::render_for_model(TRANSCRIPT).unwrap();
        assert!(rendered.contains("Speaker 1:"));
        let quote: serde_json::Value =
            serde_json::from_str(&work::quote_summary(&rendered).unwrap()).unwrap();
        assert!(quote["credits"].as_u64().unwrap() >= 1);

        let pricing: serde_json::Value =
            serde_json::from_str(&work::credit_pricing().unwrap()).unwrap();
        assert_eq!(pricing["pack_credits"], 1000);
    }

    #[test]
    fn redaction_reports_what_it_took_out() {
        let with_email = TRANSCRIPT.replace(
            "I'll send the forecast by Friday.",
            "Send it to ana@example.com by Friday.",
        );
        let out = work::redact_transcript(&with_email, "").unwrap();
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["report"]["counts"][0][1], 1);
        assert!(!out.contains("ana@example.com"));
    }

    #[test]
    fn diarizing_with_no_audio_leaves_the_lines_unassigned_rather_than_failing() {
        let defaults = work::diarize_defaults().unwrap();
        let out = work::diarize(TRANSCRIPT, &[], &defaults).unwrap();
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["report"]["speakers"], 0);
        assert_eq!(value["report"]["unassigned"], 2);
    }

    #[test]
    fn clock_formatting_and_parsing_are_reachable_and_agree() {
        assert_eq!(super::format_clock(65_000.0), "1:05");
        assert_eq!(super::parse_clock("1:05"), Some(65_000.0));
        assert_eq!(super::parse_clock("nonsense"), None);
    }

    #[test]
    fn splitting_and_excerpting_come_back_as_usable_transcripts() {
        let out = work::split_segment(TRANSCRIPT, 2_000.0).unwrap();
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["index"], 1);
        assert_eq!(value["transcript"]["segments"].as_array().unwrap().len(), 3);

        let clip = work::excerpt_transcript(TRANSCRIPT, 4_000.0, 9_000.0).unwrap();
        let value: serde_json::Value = serde_json::from_str(&clip).unwrap();
        assert_eq!(value["segments"][0]["start_ms"], 0);
    }
}
