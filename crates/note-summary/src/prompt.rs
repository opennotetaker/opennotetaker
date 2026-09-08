//! The paid summariser's request and its reply, in one place.
//!
//! This module is compiled twice: to wasm, where the browser uses it to price
//! the job before the user commits, and natively into `openapps-gateway`,
//! where the same code builds the request that is actually sent. That is not
//! tidiness -- it is the mechanism by which the price quoted and the price
//! charged describe the same work. A gateway with its own copy of the prompt
//! would drift from the browser's estimate on the first edit, and nothing
//! would notice until an invoice did.
//!
//! # Why the request is shaped like this
//!
//! **Attributed text, not raw text.** "We'll do it" means nothing without
//! knowing who said it, and a model given unattributed transcript invents
//! attributions rather than omitting them.
//!
//! **Timestamps in the input, and demanded in the output.** Every claim the
//! model makes must point at the moment it came from, so a reader can check
//! it against the recording. A summary you cannot verify is one you have to
//! trust, and this product's entire argument is that you should not have to.
//!
//! **A closed JSON schema, and a refusal to guess.** The model is told to
//! return empty arrays rather than fill them -- a meeting with no decisions
//! must produce no decisions, not three plausible ones.

use note_core::{ActionItem, Origin, Summary, Transcript};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// The token budget for one summary request.
///
/// A three-hour meeting does not fit in a model's context and would not
/// summarise well if it did, so long transcripts are folded (see
/// [`chunk_transcript`]) rather than truncated. Truncating silently
/// summarises the first hour and calls it the meeting.
pub const MAX_CHARS_PER_CHUNK: usize = 48_000;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SummaryRequest {
    /// The transcript, already attributed and timestamped.
    pub transcript: String,
    /// What the user wants out of it, in their own words. Empty for the
    /// default meeting-minutes shape.
    #[serde(default)]
    pub instructions: String,
    /// The language to write the summary in. `None` means "the language the
    /// meeting was held in", which is what a user almost always wants and
    /// what a model does not do reliably unless told.
    #[serde(default)]
    pub language: Option<String>,
}

impl SummaryRequest {
    /// Build a request from a transcript, attributing and timestamping it.
    pub fn from_transcript(transcript: &Transcript) -> Self {
        Self {
            transcript: render_transcript(transcript),
            instructions: String::new(),
            language: transcript.language.clone(),
        }
    }
}

/// The transcript as the model sees it: `[m:ss] Speaker: text`.
///
/// Merged by speaker first, because a model given Whisper's breath-length
/// cues spends its attention on reassembling turns instead of on the content,
/// and because the merged form is a third fewer tokens for the same words --
/// which is a third off the price.
pub fn render_transcript(transcript: &Transcript) -> String {
    let mut out = String::new();
    for block in transcript.merged_by_speaker(1_000, 30_000) {
        let label = block
            .speaker
            .as_deref()
            .and_then(|id| transcript.label_for(id))
            .unwrap_or("Unknown");
        out.push_str(&format!(
            "[{}] {label}: {}\n",
            note_core::format_clock(block.start_ms),
            block.text
        ));
    }
    out
}

/// Split a transcript that will not fit into pieces that will.
///
/// Splits on turn boundaries, so no chunk begins with half a sentence
/// attributed to nobody -- except where one line is itself longer than the
/// limit, which is the case worth naming.
///
/// A single enormous line is not hypothetical: an hour of continuous speech
/// with no pause long enough to end a segment merges into one turn, and a
/// transcript pasted in from elsewhere may have no line breaks at all. Left
/// alone, this function would hand that back as one over-sized chunk, and the
/// caller's "how many requests is this" guard would pass while the request
/// itself was too large for the model -- an over-limit request that failed at
/// the vendor rather than here. So an over-long line is cut, and the seam is
/// the lesser evil.
///
/// **Every chunk is at most `max_chars`.** Callers price and guard on that.
pub fn chunk_transcript(rendered: &str, max_chars: usize) -> Vec<String> {
    let max_chars = max_chars.max(1);
    if rendered.len() <= max_chars {
        return vec![rendered.to_string()];
    }
    let mut chunks = Vec::new();
    let mut current = String::new();

    let flush = |current: &mut String, chunks: &mut Vec<String>| {
        if !current.trim().is_empty() {
            chunks.push(std::mem::take(current));
        } else {
            current.clear();
        }
    };

    for line in rendered.lines() {
        if !current.is_empty() && current.len() + line.len() + 1 > max_chars {
            flush(&mut current, &mut chunks);
        }
        // `< max_chars`, not `+ 1 <=`: the newline this appends counts too.
        if line.len() < max_chars {
            current.push_str(line);
            current.push('\n');
            continue;
        }
        // The line alone does not fit. Cut it on character boundaries -- never
        // inside a UTF-8 sequence, which would produce invalid text rather
        // than an awkward seam.
        let mut rest = line;
        while rest.len() >= max_chars {
            let mut at = max_chars - 1;
            while at > 0 && !rest.is_char_boundary(at) {
                at -= 1;
            }
            if at == 0 {
                break;
            }
            current.push_str(&rest[..at]);
            current.push('\n');
            flush(&mut current, &mut chunks);
            rest = &rest[at..];
        }
        if !rest.is_empty() {
            current.push_str(rest);
            current.push('\n');
        }
    }
    flush(&mut current, &mut chunks);
    chunks
}

const SYSTEM: &str = "\
You write meeting minutes from a transcript. You reply with one JSON object and nothing else.

Rules, in order of importance:

1. Never state anything the transcript does not say. If the meeting reached no \
decisions, return an empty list. An empty list is a correct answer; a plausible \
invention is not.
2. Every action item and every decision must be traceable. Give the timestamp \
of the moment it was said, copied from the [m:ss] marks in the transcript.
3. Attribute an owner only where the transcript names one or where the speaker \
committed themselves (\"I'll send it\"). Otherwise the owner is null.
4. Give a due date only where one was said. Copy the words used (\"by Friday\", \
\"end of the month\"); do not convert them to a calendar date, because you do \
not know today's date.
5. Write in the language of the meeting unless told otherwise.

Return exactly this JSON shape:

{
  \"overview\": \"two or three sentences on what this meeting was about and what came of it\",
  \"key_points\": [\"the substantive points discussed\"],
  \"decisions\": [\"what was actually decided\"],
  \"action_items\": [{\"text\": \"what is to be done\", \"owner\": \"name or null\", \"due\": \"as said, or null\", \"at\": \"m:ss\"}],
  \"questions\": [\"questions raised and left unanswered\"],
  \"keywords\": [\"the topics, as short noun phrases\"]
}";

/// The vendor request, in the Anthropic message shape.
///
/// The gateway reshapes the envelope for whichever vendor it holds a key for,
/// but the system text and the user message cross unchanged -- so the words
/// the price was estimated against are the words that get sent.
pub fn build_summary_request(request: &SummaryRequest, model: &str) -> serde_json::Value {
    let mut user = String::new();
    if !request.instructions.trim().is_empty() {
        user.push_str("The reader asked for this specifically:\n");
        user.push_str(request.instructions.trim());
        user.push_str("\n\n");
    }
    if let Some(language) = &request.language {
        user.push_str(&format!("Write the summary in {language}.\n\n"));
    }
    user.push_str("Transcript:\n\n");
    user.push_str(&request.transcript);

    serde_json::json!({
        "model": model,
        "max_tokens": 4000,
        "system": SYSTEM,
        "messages": [{ "role": "user", "content": user }],
    })
}

#[derive(Debug, Error, PartialEq)]
pub enum ParseError {
    #[error("the reply was not JSON: {0}")]
    NotJson(String),
    #[error("the reply was JSON but not a summary")]
    WrongShape,
    #[error("the reply contained no summary content at all")]
    Empty,
}

/// Read a model's reply into a [`Summary`].
///
/// Tolerant of the two things every model does anyway -- wrapping the object
/// in a ```json fence, and adding a sentence before it -- and strict about
/// everything else. A partially-parsed summary shown as though it were
/// complete is worse than an error the user can retry.
pub fn parse_summary(content: &str) -> Result<Summary, ParseError> {
    let value = extract_json(content)?;
    let object = value.as_object().ok_or(ParseError::WrongShape)?;

    let summary = Summary {
        origin: Origin::Generated,
        // A written summary reports itself in prose; the counts belong to the
        // extractive tier, which has nothing else to say.
        stats: None,
        overview: object
            .get("overview")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .trim()
            .to_string(),
        keywords: strings(object.get("keywords")),
        key_points: strings(object.get("key_points")),
        decisions: strings(object.get("decisions")),
        questions: strings(object.get("questions")),
        action_items: object
            .get("action_items")
            .and_then(|v| v.as_array())
            .map(|items| items.iter().filter_map(action_item).collect())
            .unwrap_or_default(),
    };

    if summary.is_empty() {
        return Err(ParseError::Empty);
    }
    Ok(summary)
}

fn action_item(value: &serde_json::Value) -> Option<ActionItem> {
    let text = value.get("text")?.as_str()?.trim();
    if text.is_empty() {
        return None;
    }
    Some(ActionItem {
        text: text.to_string(),
        owner: optional_string(value.get("owner")),
        due: optional_string(value.get("due")),
        // A model that writes "around 12:30" rather than "12:30" loses the
        // link rather than the item: an unparseable timestamp is dropped, not
        // guessed at, because a wrong jump into the recording is worse than
        // no jump.
        at_ms: value
            .get("at")
            .and_then(|v| v.as_str())
            .and_then(note_core::parse_clock),
    })
}

/// A JSON null, the string "null", and an empty string all mean "not stated".
/// Models produce all three, and rendering "Owner: null" in an export is the
/// kind of detail that makes a product look unfinished.
fn optional_string(value: Option<&serde_json::Value>) -> Option<String> {
    let text = value?.as_str()?.trim();
    (!text.is_empty() && !text.eq_ignore_ascii_case("null") && !text.eq_ignore_ascii_case("none"))
        .then(|| text.to_string())
}

fn strings(value: Option<&serde_json::Value>) -> Vec<String> {
    value
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

/// Find the JSON object in a reply that may have prose or a fence around it.
pub fn extract_json(content: &str) -> Result<serde_json::Value, ParseError> {
    let trimmed = content.trim();
    if let Ok(value) = serde_json::from_str(trimmed) {
        return Ok(value);
    }
    // Scan for a balanced object, respecting strings and escapes -- a naive
    // "first { to last }" breaks on a transcript quote containing a brace.
    let bytes: Vec<char> = trimmed.chars().collect();
    let start = bytes
        .iter()
        .position(|c| *c == '{')
        .ok_or_else(|| ParseError::NotJson(trimmed.chars().take(120).collect()))?;
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;
    for (offset, &c) in bytes[start..].iter().enumerate() {
        if in_string {
            match c {
                _ if escaped => escaped = false,
                '\\' => escaped = true,
                '"' => in_string = false,
                _ => {}
            }
            continue;
        }
        match c {
            '"' => in_string = true,
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    let text: String = bytes[start..=start + offset].iter().collect();
                    return serde_json::from_str(&text)
                        .map_err(|e| ParseError::NotJson(e.to_string()));
                }
            }
            _ => {}
        }
    }
    Err(ParseError::NotJson("unbalanced braces".into()))
}

/// Fold several chunk summaries into one.
///
/// Used for a transcript too long for a single request. Concatenation rather
/// than a second model call: a second call would double the price to merge
/// lists that are already disjoint, and the overview is the only field where
/// joining reads at all awkwardly.
pub fn merge_summaries(parts: Vec<Summary>) -> Summary {
    let mut merged = Summary {
        origin: Origin::Generated,
        ..Default::default()
    };
    for part in parts {
        if !part.overview.trim().is_empty() {
            if !merged.overview.is_empty() {
                merged.overview.push(' ');
            }
            merged.overview.push_str(part.overview.trim());
        }
        extend_unique(&mut merged.keywords, part.keywords);
        extend_unique(&mut merged.key_points, part.key_points);
        extend_unique(&mut merged.decisions, part.decisions);
        extend_unique(&mut merged.questions, part.questions);
        for item in part.action_items {
            if !merged.action_items.iter().any(|a| a.text == item.text) {
                merged.action_items.push(item);
            }
        }
    }
    merged
        .action_items
        .sort_by_key(|a| a.at_ms.unwrap_or(i64::MAX));
    merged
}

fn extend_unique(into: &mut Vec<String>, from: Vec<String>) {
    for value in from {
        if !into.iter().any(|existing| existing == &value) {
            into.push(value);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use note_core::{Segment, Source};

    fn transcript() -> Transcript {
        let mut t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 3_000, "Let's review the budget.").with_speaker("S0"),
                Segment::new(3_000, 6_000, "It is up eleven percent.").with_speaker("S0"),
                Segment::new(65_000, 70_000, "I'll send the forecast.").with_speaker("S1"),
            ],
        );
        t.speakers[0].rename("Ana");
        t
    }

    #[test]
    fn the_rendered_transcript_carries_who_and_when_and_folds_a_turn() {
        let rendered = render_transcript(&transcript());
        assert!(
            rendered.starts_with("[0:00] Ana: Let's review the budget. It is up eleven percent.\n"),
            "{rendered}"
        );
        assert!(
            rendered.contains("[1:05] Speaker 2: I'll send the forecast."),
            "{rendered}"
        );
    }

    #[test]
    fn the_request_carries_the_instructions_the_language_and_the_transcript() {
        let request = SummaryRequest {
            transcript: "[0:00] Ana: hello".into(),
            instructions: "Focus on risks".into(),
            language: Some("English".into()),
        };
        let built = build_summary_request(&request, "some-model");
        let user = built["messages"][0]["content"].as_str().unwrap();
        assert!(user.contains("Focus on risks"));
        assert!(user.contains("Write the summary in English"));
        assert!(user.contains("[0:00] Ana: hello"));
        assert!(built["system"]
            .as_str()
            .unwrap()
            .contains("Never state anything"));
        assert_eq!(built["model"], "some-model");
    }

    #[test]
    fn a_clean_reply_parses_into_every_field() {
        let reply = r#"{
            "overview": "The team reviewed the budget.",
            "key_points": ["Budget is up eleven percent"],
            "decisions": ["Hold the current plan"],
            "action_items": [{"text": "Send the forecast", "owner": "Priya", "due": "by Friday", "at": "1:05"}],
            "questions": ["Who signs off?"],
            "keywords": ["budget"]
        }"#;
        let summary = parse_summary(reply).unwrap();
        assert_eq!(summary.origin, Origin::Generated);
        assert_eq!(summary.action_items[0].owner.as_deref(), Some("Priya"));
        assert_eq!(summary.action_items[0].at_ms, Some(65_000));
        assert_eq!(summary.decisions, ["Hold the current plan"]);
    }

    #[test]
    fn a_fenced_reply_with_a_preamble_still_parses() {
        let reply =
            "Sure! Here is the summary:\n\n```json\n{\"overview\": \"A short meeting.\"}\n```\n";
        assert_eq!(parse_summary(reply).unwrap().overview, "A short meeting.");
    }

    /// A brace inside a quoted transcript line breaks "first { to last }".
    #[test]
    fn a_brace_inside_a_quoted_string_does_not_confuse_the_extractor() {
        let reply = r#"{"overview": "He said {this} and left.", "keywords": ["a"]}"#;
        assert_eq!(
            parse_summary(reply).unwrap().overview,
            "He said {this} and left."
        );
    }

    #[test]
    fn null_owners_and_deadlines_become_absent_rather_than_the_word_null() {
        let reply = r#"{"overview":"x","action_items":[
            {"text":"Do the thing","owner":null,"due":"","at":"nope"},
            {"text":"Other thing","owner":"null","due":"None"}
        ]}"#;
        let summary = parse_summary(reply).unwrap();
        assert_eq!(summary.action_items[0].owner, None);
        assert_eq!(summary.action_items[0].due, None);
        assert_eq!(
            summary.action_items[0].at_ms, None,
            "an unparseable time must be dropped"
        );
        assert_eq!(summary.action_items[1].owner, None);
        assert_eq!(summary.action_items[1].due, None);
    }

    #[test]
    fn an_action_item_with_no_text_is_dropped_rather_than_shown_blank() {
        let reply = r#"{"overview":"x","action_items":[{"text":"  "},{"text":"real"}]}"#;
        let summary = parse_summary(reply).unwrap();
        assert_eq!(summary.action_items.len(), 1);
        assert_eq!(summary.action_items[0].text, "real");
    }

    #[test]
    fn a_reply_that_is_not_a_summary_is_an_error_rather_than_a_blank_panel() {
        assert!(matches!(
            parse_summary("I cannot help with that."),
            Err(ParseError::NotJson(_))
        ));
        assert_eq!(parse_summary("{}"), Err(ParseError::Empty));
        assert_eq!(parse_summary("[1,2,3]"), Err(ParseError::WrongShape));
    }

    #[test]
    fn a_long_transcript_is_chunked_on_line_boundaries_not_mid_sentence() {
        let rendered = (0..400)
            .map(|i| {
                format!(
                    "[0:0{}] Ana: a fairly long line of transcript number {i}",
                    i % 10
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        let chunks = chunk_transcript(&rendered, 2_000);
        assert!(chunks.len() > 5);
        for chunk in &chunks {
            assert!(chunk.len() <= 2_100, "chunk of {} bytes", chunk.len());
            assert!(
                chunk.starts_with('['),
                "a chunk began mid-line: {chunk:.40}"
            );
        }
        // Nothing lost.
        let rejoined: String = chunks.concat();
        assert_eq!(rejoined.lines().count(), rendered.lines().count());
    }

    /// The guard the gateway relies on: it counts chunks to decide whether a
    /// request is too big, so a chunk larger than the limit would slip past a
    /// check that looks like it covers this.
    #[test]
    fn no_chunk_ever_exceeds_the_limit_even_for_one_enormous_line() {
        let one_line = "a".repeat(10_000);
        let chunks = chunk_transcript(&one_line, 1_000);
        assert!(chunks.len() >= 10, "got {} chunks", chunks.len());
        for chunk in &chunks {
            assert!(chunk.len() <= 1_000, "chunk of {} bytes", chunk.len());
        }
        let rejoined: String = chunks.iter().map(|c| c.trim_end_matches('\n')).collect();
        assert_eq!(rejoined, one_line, "characters were lost in the cut");
    }

    /// Cutting inside a UTF-8 sequence would produce invalid text, not an
    /// awkward seam.
    #[test]
    fn an_over_long_line_is_cut_on_character_boundaries() {
        let chinese = "预算审查会议记录".repeat(500);
        for chunk in chunk_transcript(&chinese, 100) {
            assert!(chunk.len() <= 100);
            assert!(!chunk.is_empty());
        }
    }

    #[test]
    fn short_transcripts_are_one_chunk() {
        assert_eq!(chunk_transcript("[0:00] Ana: hi\n", 1_000).len(), 1);
    }

    #[test]
    fn merging_chunk_summaries_deduplicates_and_orders_actions_by_time() {
        let a = Summary {
            origin: Origin::Generated,
            overview: "First half.".into(),
            keywords: vec!["budget".into()],
            action_items: vec![ActionItem {
                text: "Later thing".into(),
                at_ms: Some(90_000),
                ..Default::default()
            }],
            ..Default::default()
        };
        let b = Summary {
            origin: Origin::Generated,
            overview: "Second half.".into(),
            keywords: vec!["budget".into(), "hiring".into()],
            action_items: vec![ActionItem {
                text: "Earlier thing".into(),
                at_ms: Some(10_000),
                ..Default::default()
            }],
            ..Default::default()
        };
        let merged = merge_summaries(vec![a, b]);
        assert_eq!(merged.overview, "First half. Second half.");
        assert_eq!(merged.keywords, ["budget", "hiring"]);
        assert_eq!(merged.action_items[0].text, "Earlier thing");
    }

    #[test]
    fn a_request_built_from_a_transcript_uses_its_language() {
        let mut t = transcript();
        t.language = Some("de".into());
        assert_eq!(
            SummaryRequest::from_transcript(&t).language.as_deref(),
            Some("de")
        );
    }
}
