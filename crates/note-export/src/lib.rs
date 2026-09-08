//! Every way a transcript leaves this app.
//!
//! §5.2 puts export in the free tier, and this crate is why that costs
//! nothing to honour: it is string formatting over data the browser already
//! has. There is no service to meter, so there is nothing to charge for, and
//! a competitor putting SRT export behind a subscription (Sonix) is charging
//! for the account, not for the work.
//!
//! The formats split into two families, and conflating them is the mistake
//! worth naming:
//!
//! - **Subtitle formats** (SRT, WebVTT) must preserve Whisper's cue
//!   boundaries exactly. A cue is a thing that appears and disappears on
//!   screen; merging two of them because the same person said both produces a
//!   wall of text that outlasts the sentence.
//! - **Document formats** (text, Markdown, HTML) want the opposite: Whisper
//!   cuts on its 30-second window and on breaths, so an unmerged document
//!   reads as one-line paragraphs. These call
//!   [`Transcript::merged_by_speaker`].
//!
//! JSON and CSV are neither -- they are for getting the data out intact, and
//! merge nothing.

#![forbid(unsafe_code)]

use note_core::{format_clock, format_srt, format_vtt, Segment, Summary, Transcript};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Format {
    Srt,
    Vtt,
    /// Running text, no timings. What you paste into a document.
    Text,
    /// Timestamped and attributed plain text -- the transcript as a record.
    TextTimestamped,
    Markdown,
    Json,
    Csv,
    Html,
}

impl Format {
    pub fn extension(self) -> &'static str {
        match self {
            Self::Srt => "srt",
            Self::Vtt => "vtt",
            Self::Text | Self::TextTimestamped => "txt",
            Self::Markdown => "md",
            Self::Json => "json",
            Self::Csv => "csv",
            Self::Html => "html",
        }
    }

    pub fn mime(self) -> &'static str {
        match self {
            Self::Srt => "application/x-subrip",
            Self::Vtt => "text/vtt",
            Self::Text | Self::TextTimestamped => "text/plain;charset=utf-8",
            Self::Markdown => "text/markdown;charset=utf-8",
            Self::Json => "application/json",
            Self::Csv => "text/csv;charset=utf-8",
            Self::Html => "text/html;charset=utf-8",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Srt => "SubRip subtitles (.srt)",
            Self::Vtt => "WebVTT subtitles (.vtt)",
            Self::Text => "Plain text (.txt)",
            Self::TextTimestamped => "Timestamped text (.txt)",
            Self::Markdown => "Markdown notes (.md)",
            Self::Json => "JSON (.json)",
            Self::Csv => "Spreadsheet (.csv)",
            Self::Html => "Web page (.html)",
        }
    }

    pub const ALL: [Self; 8] = [
        Self::Srt,
        Self::Vtt,
        Self::Text,
        Self::TextTimestamped,
        Self::Markdown,
        Self::Json,
        Self::Csv,
        Self::Html,
    ];
}

/// Every word a document export writes that did not come from the transcript.
///
/// Pulled out of the exporters because a Chinese meeting exported with English
/// section headings is a half-translated document, and because this crate has
/// no business deciding what language a reader wants -- only the interface
/// knows that.
///
/// [`Labels::default`] is English, so a Rust-only caller (a CLI, a test) needs
/// to know nothing about this.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Labels {
    pub summary: String,
    pub key_points: String,
    pub decisions: String,
    pub action_items: String,
    /// Extraction cannot know whether a question was answered, so it gets the
    /// weaker heading; a written summary is asked specifically for unanswered
    /// ones and earns the stronger. Both live here so the exporter picks by
    /// origin and a translator supplies both.
    pub questions_asked: String,
    pub questions_open: String,
    pub topics: String,
    pub who_spoke: String,
    pub transcript: String,
    pub consent: String,
    pub unknown_speaker: String,
    pub due: String,
    /// The extracted summary's header line. `{sentences}`, `{minutes}` and
    /// `{speakers}` are substituted.
    ///
    /// A template of counts and separators rather than a sentence, quite
    /// deliberately: a sentence needs plural agreement, which differs by
    /// language and would drag a plural-rule engine into a crate that formats
    /// subtitles. "6 sentences · about 2 min · 2 speakers" translates cleanly
    /// into languages with no plurals at all.
    pub stats: String,
}

impl Default for Labels {
    fn default() -> Self {
        Self {
            summary: "Summary".into(),
            key_points: "Key points".into(),
            decisions: "Decisions".into(),
            action_items: "Action items".into(),
            questions_asked: "Questions asked".into(),
            questions_open: "Open questions".into(),
            topics: "Topics".into(),
            who_spoke: "Who spoke".into(),
            transcript: "Transcript".into(),
            consent: "Recording consent".into(),
            unknown_speaker: "Unknown".into(),
            due: "due".into(),
            stats: "{sentences} sentences · about {minutes} min · {speakers} speakers".into(),
        }
    }
}

impl Labels {
    fn questions(&self, origin: note_core::Origin) -> &str {
        match origin {
            note_core::Origin::Extracted => &self.questions_asked,
            note_core::Origin::Generated => &self.questions_open,
        }
    }

    /// The header for a summary, whichever tier wrote it: the model's prose
    /// where there is any, else the counts.
    fn header(&self, summary: &Summary) -> Option<String> {
        if !summary.overview.trim().is_empty() {
            return Some(summary.overview.trim().to_string());
        }
        let stats = summary.stats?;
        Some(
            self.stats
                .replace("{sentences}", &stats.sentences.to_string())
                .replace("{minutes}", &stats.minutes.to_string())
                .replace("{speakers}", &stats.speakers.to_string()),
        )
    }
}

/// What a document export puts at the top, and whether to attribute lines.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExportOptions {
    pub title: String,
    /// Prefix each block with who said it. Off for a clean reading copy.
    pub speakers: bool,
    /// The summary to render, from either tier -- `note_core::Summary` is
    /// shared so an export does not care which produced it.
    pub summary: Option<Summary>,
    /// Recorded at, as an already-formatted local string. Formatting a date
    /// belongs to the browser, which knows the user's locale and timezone;
    /// doing it here would mean shipping a timezone database to wasm.
    pub recorded_at: Option<String>,
    /// The words the exporter writes itself.
    ///
    /// Defaulted, so a caller that has nothing to say about language -- a
    /// test, a CLI, an older client -- keeps working and gets English.
    #[serde(default)]
    pub labels: Labels,
    /// The consent record, rendered verbatim into document exports.
    ///
    /// This is the §9 切入点1 wedge made durable: the export is the artefact
    /// that outlives the app, so if consent is only visible in the interface
    /// it is not really evidence of anything.
    pub consent: Option<String>,
}

impl Default for ExportOptions {
    fn default() -> Self {
        Self {
            title: "Transcript".into(),
            speakers: true,
            summary: None,
            labels: Labels::default(),
            recorded_at: None,
            consent: None,
        }
    }
}

/// Fold a document export's cues into readable paragraphs.
///
/// One second of silence ends a paragraph; so does thirty seconds of
/// continuous speech, because past that a block is no longer a paragraph.
const DOC_MAX_GAP_MS: i64 = 1_000;
const DOC_MAX_SPAN_MS: i64 = 30_000;

pub fn export(transcript: &Transcript, format: Format, options: &ExportOptions) -> String {
    match format {
        Format::Srt => srt(transcript),
        Format::Vtt => vtt(transcript),
        Format::Text => text(transcript, options),
        Format::TextTimestamped => text_timestamped(transcript, options),
        Format::Markdown => markdown(transcript, options),
        Format::Json => json(transcript, options),
        Format::Csv => csv(transcript),
        Format::Html => html(transcript, options),
    }
}

fn srt(transcript: &Transcript) -> String {
    let mut out = String::new();
    for (index, segment) in transcript.segments.iter().enumerate() {
        out.push_str(&format!("{}\n", index + 1));
        out.push_str(&format!(
            "{} --> {}\n",
            format_srt(segment.start_ms),
            format_srt(segment.end_ms)
        ));
        out.push_str(&cue_text(transcript, segment));
        out.push_str("\n\n");
    }
    out
}

fn vtt(transcript: &Transcript) -> String {
    let mut out = String::from("WEBVTT\n\n");
    for segment in &transcript.segments {
        out.push_str(&format!(
            "{} --> {}\n",
            format_vtt(segment.start_ms),
            format_vtt(segment.end_ms)
        ));
        out.push_str(&cue_text(transcript, segment));
        out.push_str("\n\n");
    }
    out
}

/// A speaker name inside a subtitle cue, in the form both formats agree on.
///
/// `<v Ana>` is WebVTT's voice span; SRT has no such thing, but players
/// overwhelmingly render the tag as literal text there, which is worse than
/// the plain `Ana: ` prefix SRT files conventionally use.
fn cue_text(transcript: &Transcript, segment: &Segment) -> String {
    match segment
        .speaker
        .as_deref()
        .and_then(|id| transcript.label_for(id))
    {
        Some(label) => format!("{label}: {}", segment.text),
        None => segment.text.clone(),
    }
}

fn document_blocks(transcript: &Transcript) -> Vec<Segment> {
    transcript.merged_by_speaker(DOC_MAX_GAP_MS, DOC_MAX_SPAN_MS)
}

fn text(transcript: &Transcript, options: &ExportOptions) -> String {
    let mut out = String::new();
    for block in document_blocks(transcript) {
        if options.speakers {
            if let Some(label) = block
                .speaker
                .as_deref()
                .and_then(|id| transcript.label_for(id))
            {
                out.push_str(label);
                out.push_str(": ");
            }
        }
        out.push_str(&block.text);
        out.push_str("\n\n");
    }
    out.trim_end().to_string() + "\n"
}

fn text_timestamped(transcript: &Transcript, options: &ExportOptions) -> String {
    let mut out = String::new();
    if !options.title.trim().is_empty() {
        out.push_str(&options.title);
        out.push('\n');
        if let Some(when) = &options.recorded_at {
            out.push_str(when);
            out.push('\n');
        }
        out.push('\n');
    }
    for block in document_blocks(transcript) {
        out.push_str(&format!("[{}] ", format_clock(block.start_ms)));
        if options.speakers {
            if let Some(label) = block
                .speaker
                .as_deref()
                .and_then(|id| transcript.label_for(id))
            {
                out.push_str(label);
                out.push_str(": ");
            }
        }
        out.push_str(&block.text);
        out.push('\n');
    }
    out
}

fn markdown(transcript: &Transcript, options: &ExportOptions) -> String {
    let mut out = String::new();
    out.push_str(&format!("# {}\n\n", options.title));
    if let Some(when) = &options.recorded_at {
        out.push_str(&format!("*{when}*\n\n"));
    }

    if let Some(summary) = &options.summary {
        if !summary.is_empty() {
            out.push_str(&format!("## {}\n\n", options.labels.summary));
            if let Some(header) = options.labels.header(summary) {
                out.push_str(&header);
                out.push_str("\n\n");
            }
            bullets(&mut out, &options.labels.key_points, &summary.key_points);
            bullets(&mut out, &options.labels.decisions, &summary.decisions);
            if !summary.action_items.is_empty() {
                out.push_str(&format!("### {}\n\n", options.labels.action_items));
                for item in &summary.action_items {
                    out.push_str("- [ ] ");
                    out.push_str(item.text.trim());
                    if let Some(owner) = &item.owner {
                        out.push_str(&format!(" — **{owner}**"));
                    }
                    if let Some(due) = &item.due {
                        out.push_str(&format!(" ({} {due})", options.labels.due));
                    }
                    if let Some(at) = item.at_ms {
                        out.push_str(&format!(" `{}`", format_clock(at)));
                    }
                    out.push('\n');
                }
                out.push('\n');
            }
            bullets(
                &mut out,
                options.labels.questions(summary.origin),
                &summary.questions,
            );
            if !summary.keywords.is_empty() {
                out.push_str(&format!(
                    "**{}:** {}\n\n",
                    options.labels.topics,
                    summary.keywords.join(", ")
                ));
            }
        }
    }

    if !transcript.speakers.is_empty() {
        out.push_str(&format!("## {}\n\n", options.labels.who_spoke));
        for (id, ms) in transcript.talk_time() {
            let label = transcript.label_for(&id).unwrap_or(&id);
            out.push_str(&format!("- **{label}** — {}\n", format_clock(ms)));
        }
        out.push('\n');
    }

    out.push_str(&format!("## {}\n\n", options.labels.transcript));
    for block in document_blocks(transcript) {
        out.push_str(&format!("**{}** ", format_clock(block.start_ms)));
        if options.speakers {
            if let Some(label) = block
                .speaker
                .as_deref()
                .and_then(|id| transcript.label_for(id))
            {
                out.push_str(&format!("**{label}:** "));
            }
        }
        out.push_str(&block.text);
        out.push_str("\n\n");
    }

    if let Some(consent) = &options.consent {
        out.push_str(&format!("---\n\n## {}\n\n", options.labels.consent));
        out.push_str(consent.trim());
        out.push('\n');
    }
    out
}

fn bullets(out: &mut String, heading: &str, items: &[String]) {
    if items.is_empty() {
        return;
    }
    out.push_str(&format!("### {heading}\n\n"));
    for item in items {
        out.push_str(&format!("- {}\n", item.trim()));
    }
    out.push('\n');
}

fn json(transcript: &Transcript, options: &ExportOptions) -> String {
    // The whole record, not a projection: this is the format somebody exports
    // to move their data out of the product, and anything omitted here is
    // data they cannot take with them.
    let value = serde_json::json!({
        "title": options.title,
        "recorded_at": options.recorded_at,
        "language": transcript.language,
        "duration_ms": transcript.duration_ms,
        "source": transcript.source,
        "consent": options.consent,
        "summary": options.summary,
        "speakers": transcript.speakers,
        "segments": transcript.segments,
    });
    serde_json::to_string_pretty(&value).unwrap_or_else(|_| "{}".into())
}

fn csv(transcript: &Transcript) -> String {
    let mut out = String::from("start_ms,end_ms,start,end,speaker,text\n");
    for segment in &transcript.segments {
        let label = segment
            .speaker
            .as_deref()
            .and_then(|id| transcript.label_for(id))
            .unwrap_or("");
        out.push_str(&format!(
            "{},{},{},{},{},{}\n",
            segment.start_ms,
            segment.end_ms,
            format_clock(segment.start_ms),
            format_clock(segment.end_ms),
            csv_field(label),
            csv_field(&segment.text),
        ));
    }
    out
}

/// RFC 4180 quoting. A transcript is full of commas and quotation marks, and
/// a spreadsheet reading an unquoted one silently shifts every column.
fn csv_field(value: &str) -> String {
    if value.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn html(transcript: &Transcript, options: &ExportOptions) -> String {
    let mut out = String::new();
    out.push_str("<!doctype html>\n<html lang=\"");
    out.push_str(&escape(transcript.language.as_deref().unwrap_or("en")));
    out.push_str("\">\n<meta charset=\"utf-8\">\n");
    out.push_str("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n");
    out.push_str(&format!("<title>{}</title>\n", escape(&options.title)));
    // Styles inline and no scripts: this file is meant to be opened from a
    // disk, mailed, or archived. A stylesheet reference would render it naked
    // anywhere but the machine that made it.
    out.push_str(HTML_STYLE);
    out.push_str(&format!("<h1>{}</h1>\n", escape(&options.title)));
    if let Some(when) = &options.recorded_at {
        out.push_str(&format!("<p class=\"meta\">{}</p>\n", escape(when)));
    }

    if let Some(summary) = &options.summary {
        if !summary.is_empty() {
            out.push_str(&format!(
                "<section class=\"summary\"><h2>{}</h2>\n",
                escape(&options.labels.summary)
            ));
            if let Some(header) = options.labels.header(summary) {
                out.push_str(&format!("<p>{}</p>\n", escape(&header)));
            }
            html_list(&mut out, &options.labels.key_points, &summary.key_points);
            html_list(&mut out, &options.labels.decisions, &summary.decisions);
            if !summary.action_items.is_empty() {
                out.push_str(&format!(
                    "<h3>{}</h3>\n<ul class=\"actions\">\n",
                    escape(&options.labels.action_items)
                ));
                for item in &summary.action_items {
                    out.push_str("<li>");
                    out.push_str(&escape(item.text.trim()));
                    if let Some(owner) = &item.owner {
                        out.push_str(&format!(" <b>{}</b>", escape(owner)));
                    }
                    if let Some(due) = &item.due {
                        out.push_str(&format!(
                            " <i>({} {})</i>",
                            escape(&options.labels.due),
                            escape(due)
                        ));
                    }
                    out.push_str("</li>\n");
                }
                out.push_str("</ul>\n");
            }
            html_list(
                &mut out,
                options.labels.questions(summary.origin),
                &summary.questions,
            );
            out.push_str("</section>\n");
        }
    }

    out.push_str(&format!(
        "<section class=\"transcript\"><h2>{}</h2>\n",
        escape(&options.labels.transcript)
    ));
    for block in document_blocks(transcript) {
        out.push_str("<p><span class=\"t\">");
        out.push_str(&format_clock(block.start_ms));
        out.push_str("</span> ");
        if options.speakers {
            if let Some(label) = block
                .speaker
                .as_deref()
                .and_then(|id| transcript.label_for(id))
            {
                out.push_str(&format!("<b class=\"s\">{}</b> ", escape(label)));
            }
        }
        out.push_str(&escape(&block.text));
        out.push_str("</p>\n");
    }
    out.push_str("</section>\n");

    if let Some(consent) = &options.consent {
        out.push_str(&format!(
            "<footer><h2>{}</h2><p>{}</p></footer>\n",
            escape(&options.labels.consent),
            escape(consent.trim())
        ));
    }
    out.push_str("</html>\n");
    out
}

fn html_list(out: &mut String, heading: &str, items: &[String]) {
    if items.is_empty() {
        return;
    }
    out.push_str(&format!("<h3>{}</h3>\n<ul>\n", escape(heading)));
    for item in items {
        out.push_str(&format!("<li>{}</li>\n", escape(item.trim())));
    }
    out.push_str("</ul>\n");
}

const HTML_STYLE: &str = r#"<style>
:root{color-scheme:light dark}
body{max-width:44rem;margin:2rem auto;padding:0 1rem;font:16px/1.65 system-ui,sans-serif}
h1{font-size:1.6rem;margin-bottom:.2em}
h2{font-size:1.15rem;margin-top:2rem}
h3{font-size:1rem;margin-bottom:.3em}
.meta{color:#6b7280;margin-top:0}
.summary{background:color-mix(in srgb,currentColor 5%,transparent);padding:.1rem 1rem 1rem;border-radius:.6rem}
.transcript p{margin:.6em 0}
.t{color:#6b7280;font-variant-numeric:tabular-nums;font-size:.85em}
.s{margin-right:.3em}
footer{margin-top:3rem;border-top:1px solid color-mix(in srgb,currentColor 15%,transparent);font-size:.9em;color:#6b7280}
</style>
"#;

/// Escape for HTML text and for a double-quoted attribute.
///
/// A transcript is untrusted input -- it is whatever a model produced from
/// whatever was said, and speakers do say "less than" and read out tags.
fn escape(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(c),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use note_core::{ActionItem, Segment, Source, Summary};

    fn transcript() -> Transcript {
        let mut t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 2_000, "Morning everyone.").with_speaker("S0"),
                Segment::new(2_000, 5_500, "Shall we start with the budget?").with_speaker("S0"),
                Segment::new(5_500, 9_000, "Yes, I have the numbers.").with_speaker("S1"),
            ],
        );
        t.speakers[0].rename("Ana");
        t
    }

    fn options() -> ExportOptions {
        ExportOptions {
            title: "Q3 planning".into(),
            recorded_at: Some("5 September 2026, 10:00".into()),
            consent: Some("Everyone present agreed to be recorded.".into()),
            summary: Some(Summary {
                origin: note_core::Origin::Extracted,
                stats: None,
                overview: "The team reviewed the budget.".into(),
                keywords: vec!["budget".into()],
                key_points: vec!["Numbers are ready".into()],
                decisions: vec!["Proceed with the plan".into()],
                action_items: vec![ActionItem {
                    text: "Send the numbers".into(),
                    owner: Some("Speaker 2".into()),
                    due: Some("Friday".into()),
                    at_ms: Some(5_500),
                }],
                questions: vec!["Who signs off?".into()],
            }),
            ..Default::default()
        }
    }

    /// The invariant that keeps subtitles usable: one cue in, one cue out.
    #[test]
    fn subtitle_formats_never_merge_cues() {
        let t = transcript();
        assert_eq!(srt(&t).matches("-->").count(), 3);
        assert_eq!(vtt(&t).matches("-->").count(), 3);
    }

    #[test]
    fn srt_numbers_cues_from_one_and_uses_comma_timestamps() {
        let out = srt(&transcript());
        assert!(out.starts_with("1\n00:00:00,000 --> 00:00:02,000\nAna: Morning everyone."));
        assert!(out.contains("\n3\n"));
    }

    #[test]
    fn vtt_starts_with_its_magic_line() {
        assert!(vtt(&transcript()).starts_with("WEBVTT\n\n"));
    }

    /// The mirror invariant: a document is unreadable if it keeps Whisper's
    /// breath-length cues as paragraphs.
    #[test]
    fn document_formats_fold_a_speakers_run_into_one_paragraph() {
        let out = text(&transcript(), &options());
        assert!(
            out.contains("Ana: Morning everyone. Shall we start with the budget?"),
            "{out}"
        );
        assert_eq!(out.trim().lines().filter(|l| !l.is_empty()).count(), 2);
    }

    #[test]
    fn a_reading_copy_can_leave_the_names_off() {
        let out = text(
            &transcript(),
            &ExportOptions {
                speakers: false,
                ..options()
            },
        );
        assert!(!out.contains("Ana:"), "{out}");
        assert!(out.contains("Morning everyone."));
    }

    #[test]
    fn markdown_carries_the_summary_the_actions_and_the_consent_record() {
        let out = markdown(&transcript(), &options());
        assert!(out.starts_with("# Q3 planning"));
        assert!(out.contains("- [ ] Send the numbers — **Speaker 2** (due Friday) `0:05`"));
        // Extracted, so the weaker heading -- see `Labels::questions`.
        assert!(out.contains("### Questions asked"), "{out}");
        assert!(out.contains("Everyone present agreed to be recorded."));
        assert!(
            out.contains("**Ana** — 0:05"),
            "talk time is missing:\n{out}"
        );
    }

    #[test]
    fn csv_quotes_the_commas_and_quotes_that_a_transcript_is_full_of() {
        let t = Transcript::from_segments(
            Source::Imported,
            vec![Segment::new(0, 1_000, "He said \"yes\", then left")],
        );
        let out = csv(&t);
        assert!(out.contains("\"He said \"\"yes\"\", then left\""), "{out}");
        assert_eq!(out.lines().count(), 2);
    }

    /// Someone will say "less than three" or read out a tag, and the export
    /// has to survive it.
    #[test]
    fn html_escapes_the_transcript_rather_than_rendering_it() {
        let t = Transcript::from_segments(
            Source::Imported,
            vec![Segment::new(0, 1_000, "<script>alert(1)</script> & co")],
        );
        let out = html(&t, &ExportOptions::default());
        assert!(!out.contains("<script>alert"), "{out}");
        assert!(out.contains("&lt;script&gt;"));
        assert!(out.contains("&amp; co"));
    }

    #[test]
    fn json_is_the_whole_record_so_a_user_can_actually_leave() {
        let value: serde_json::Value =
            serde_json::from_str(&json(&transcript(), &options())).unwrap();
        assert_eq!(value["title"], "Q3 planning");
        assert_eq!(value["segments"].as_array().unwrap().len(), 3);
        assert_eq!(value["speakers"][0]["label"], "Ana");
        assert_eq!(value["summary"]["action_items"][0]["due"], "Friday");
        assert!(value["consent"].is_string());
    }

    /// The whole point of `Labels`: a Chinese meeting must not export with
    /// English section headings.
    #[test]
    fn a_document_export_can_be_written_in_another_language() {
        let chinese = Labels {
            summary: "摘要".into(),
            key_points: "要点".into(),
            decisions: "决定".into(),
            action_items: "行动项".into(),
            questions_asked: "提出的问题".into(),
            questions_open: "待解决的问题".into(),
            topics: "主题".into(),
            who_spoke: "谁在说话".into(),
            transcript: "文字记录".into(),
            consent: "录音同意".into(),
            unknown_speaker: "未知".into(),
            due: "截止".into(),
            stats: "{sentences} 句 · 约 {minutes} 分钟 · {speakers} 位发言者".into(),
        };
        let out = markdown(
            &transcript(),
            &ExportOptions {
                labels: chinese,
                ..options()
            },
        );
        assert!(out.contains("## 摘要"), "{out}");
        assert!(out.contains("### 行动项"), "{out}");
        assert!(out.contains("## 文字记录"), "{out}");
        assert!(out.contains("(截止 Friday)"), "{out}");
        assert!(out.contains("**主题:**"), "{out}");
        // No English heading survived.
        for english in ["## Summary", "### Action items", "## Transcript", "(due "] {
            assert!(!out.contains(english), "{english:?} leaked through:\n{out}");
        }
    }

    /// An extracted summary has no prose, so the header is composed from its
    /// counts -- through the same template a translator supplies.
    #[test]
    fn an_extracted_summary_renders_its_counts_through_the_template() {
        let summary = Summary {
            origin: note_core::Origin::Extracted,
            stats: Some(note_core::SummaryStats {
                sentences: 42,
                minutes: 17,
                speakers: 3,
            }),
            ..Default::default()
        };
        let english = Labels::default();
        assert_eq!(
            english.header(&summary).unwrap(),
            "42 sentences · about 17 min · 3 speakers"
        );

        let chinese = Labels {
            stats: "{sentences} 句 · 约 {minutes} 分钟 · {speakers} 位发言者".into(),
            ..Labels::default()
        };
        assert_eq!(
            chinese.header(&summary).unwrap(),
            "42 句 · 约 17 分钟 · 3 位发言者"
        );
    }

    /// A written summary reports itself in prose, and the counts template is
    /// not used for it.
    #[test]
    fn a_written_summary_keeps_its_own_prose() {
        let summary = Summary {
            origin: note_core::Origin::Generated,
            overview: "The team settled the hosting question.".into(),
            stats: None,
            ..Default::default()
        };
        assert_eq!(
            Labels::default().header(&summary).unwrap(),
            "The team settled the hosting question."
        );
        assert!(Labels::default().header(&Summary::default()).is_none());
    }

    /// Extraction cannot know whether a question was answered; a written
    /// summary is asked specifically for the unanswered ones.
    /// Older clients, tests and CLIs send options with no `labels` at all.
    /// Requiring the field would break every one of them at the wasm boundary,
    /// where the failure surfaces as an opaque parse error.
    #[test]
    fn options_without_labels_still_deserialize_and_default_to_english() {
        let without = r#"{"title":"x","speakers":true,"summary":null,
                          "recorded_at":null,"consent":null}"#;
        let options: ExportOptions = serde_json::from_str(without).unwrap();
        assert_eq!(options.labels.transcript, "Transcript");
    }

    /// The interface relies on this: a locale may translate some export
    /// headings and not others, and each missing one has to fall back on its
    /// own rather than reverting the whole set to English — or worse, coming
    /// through blank.
    #[test]
    fn a_partial_label_set_falls_back_field_by_field() {
        let partial = r#"{"title":"x","speakers":true,"summary":null,"recorded_at":null,
                          "consent":null,"labels":{"summary":"摘要"}}"#;
        let options: ExportOptions = serde_json::from_str(partial).unwrap();
        assert_eq!(options.labels.summary, "摘要");
        assert_eq!(options.labels.transcript, "Transcript");
        assert!(
            !options.labels.due.is_empty(),
            "a blank heading is worse than an English one"
        );
    }

    #[test]
    fn the_questions_heading_follows_the_tier_that_produced_it() {
        let labels = Labels::default();
        assert_eq!(
            labels.questions(note_core::Origin::Extracted),
            "Questions asked"
        );
        assert_eq!(
            labels.questions(note_core::Origin::Generated),
            "Open questions"
        );
    }

    #[test]
    fn every_format_produces_something_for_an_empty_transcript_without_panicking() {
        let empty = Transcript::new(Source::Imported);
        for format in Format::ALL {
            let out = export(&empty, format, &ExportOptions::default());
            assert!(!format.extension().is_empty());
            assert!(
                out.len() < 4_000,
                "{format:?} produced {} bytes for an empty transcript",
                out.len()
            );
        }
    }

    #[test]
    fn a_segment_with_no_speaker_exports_without_an_empty_prefix() {
        let t = Transcript::from_segments(
            Source::Imported,
            vec![Segment::new(0, 1_000, "Just a voice note")],
        );
        assert!(srt(&t).contains("\nJust a voice note"));
        assert!(!srt(&t).contains(": Just"));
    }
}
