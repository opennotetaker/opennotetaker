//! Translating a finished transcript.
//!
//! §5.2 marks cross-language translation as an opportunity with an uncertain
//! cost type -- "local model or external API". The answer here is: both, and
//! the free one first.
//!
//! Whisper already translates. Its `translate` task turns any of its 99
//! source languages into English, in the tab, for nothing, and the app offers
//! that as a transcription option rather than as a paid feature. This module
//! is the *other* case -- any language into any other language, on the same
//! vendor key the summariser uses -- and it is priced per line for the same
//! reason: it is a real bill.
//!
//! The invariant here differs from the summariser's. A summary is prose and a
//! wrong length is a stylistic matter; a translation is pinned to timestamps
//! nobody is recomputing, so **a reply with a different number of lines than
//! it was given is refused outright**. Renumbering the transcript to fit would
//! desynchronise every line after the mistake, and the user would find out by
//! watching subtitles drift.

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::prompt::extract_json;

/// Lines per request.
///
/// Small enough that one bad reply costs little to retry, large enough that a
/// long transcript is not hundreds of round trips. Also bounds the vendor
/// spend one `ensure_affordable` check authorises.
pub const BATCH_LINES: usize = 60;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TranslateRequest {
    pub lines: Vec<String>,
    /// A language name, not a code: models handle "Simplified Chinese" more
    /// reliably than "zh-Hans", and the interface has the name anyway.
    pub target: String,
    #[serde(default)]
    pub source: Option<String>,
}

#[derive(Debug, Error, PartialEq)]
pub enum TranslateError {
    #[error("sent {sent} lines and got {got} back")]
    CountMismatch { sent: usize, got: usize },
    #[error("the reply was not JSON: {0}")]
    NotJson(String),
}

pub fn build_translate_request(request: &TranslateRequest, model: &str) -> serde_json::Value {
    let source = request
        .source
        .as_deref()
        .filter(|s| !s.trim().is_empty() && !s.eq_ignore_ascii_case("auto"))
        .map(|s| format!(" from {s}"))
        .unwrap_or_default();

    let system = format!(
        "You translate meeting transcript lines{source} into {}.\n\n\
         Rules:\n\
         1. Return exactly as many translations as you are given lines, in the same order. \
         This is absolute: each line is pinned to a timestamp, and a missing or extra line \
         desynchronises the whole transcript.\n\
         2. Translate a line that needs no translation by copying it. Never merge, split, \
         drop or reorder lines.\n\
         3. Keep names, numbers and product terms as they are.\n\
         4. Spoken language stays spoken. Do not tidy it into written prose.\n\n\
         Return json of exactly this shape: {{\"translations\": [\"...\", \"...\"]}}",
        request.target
    );

    // Numbered, so a model that loses its place has something to count
    // against -- and so a miscount is visible in the reply rather than only
    // in the count.
    let user = request
        .lines
        .iter()
        .enumerate()
        .map(|(index, line)| format!("{}. {line}", index + 1))
        .collect::<Vec<_>>()
        .join("\n");

    serde_json::json!({
        "model": model,
        "max_tokens": 8000,
        "system": system,
        "messages": [{ "role": "user", "content": user }],
    })
}

pub fn parse_translations(content: &str, expected: usize) -> Result<Vec<String>, TranslateError> {
    let value = extract_json(content).map_err(|e| TranslateError::NotJson(e.to_string()))?;
    let lines: Vec<String> = value
        .get("translations")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .map(|item| item.as_str().unwrap_or_default().trim().to_string())
                .collect()
        })
        .ok_or_else(|| TranslateError::NotJson("no translations array".into()))?;

    if lines.len() != expected {
        return Err(TranslateError::CountMismatch {
            sent: expected,
            got: lines.len(),
        });
    }
    Ok(lines)
}

/// Split a transcript's lines into request-sized batches.
pub fn batches(lines: &[String]) -> Vec<&[String]> {
    lines.chunks(BATCH_LINES).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> TranslateRequest {
        TranslateRequest {
            lines: vec!["Good morning.".into(), "Shall we start?".into()],
            target: "Simplified Chinese".into(),
            source: None,
        }
    }

    #[test]
    fn the_prompt_numbers_the_lines_and_names_the_target() {
        let built = build_translate_request(&request(), "m");
        let system = built["system"].as_str().unwrap();
        assert!(system.contains("Simplified Chinese"));
        assert!(system.contains("desynchronises"));
        assert!(
            system.contains("json"),
            "the vendor's JSON mode keys off this word"
        );
        assert_eq!(
            built["messages"][0]["content"].as_str().unwrap(),
            "1. Good morning.\n2. Shall we start?"
        );
    }

    #[test]
    fn an_auto_source_is_left_unstated_rather_than_asserted() {
        let mut request = request();
        request.source = Some("auto".into());
        let system = build_translate_request(&request, "m")["system"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(!system.contains("from auto"), "{system}");

        request.source = Some("English".into());
        let system = build_translate_request(&request, "m")["system"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(system.contains("from English"));
    }

    #[test]
    fn a_matching_reply_parses_in_order() {
        let out = parse_translations(r#"{"translations":["早上好。","我们开始吧？"]}"#, 2).unwrap();
        assert_eq!(out, ["早上好。", "我们开始吧？"]);
    }

    /// The failure this whole module is arranged around.
    #[test]
    fn a_miscount_is_refused_rather_than_padded_or_truncated() {
        assert_eq!(
            parse_translations(r#"{"translations":["one"]}"#, 2),
            Err(TranslateError::CountMismatch { sent: 2, got: 1 })
        );
        assert_eq!(
            parse_translations(r#"{"translations":["a","b","c"]}"#, 2),
            Err(TranslateError::CountMismatch { sent: 2, got: 3 })
        );
    }

    #[test]
    fn a_reply_that_is_not_a_translation_is_an_error() {
        assert!(matches!(
            parse_translations("sorry, I can't", 1),
            Err(TranslateError::NotJson(_))
        ));
        assert!(matches!(
            parse_translations(r#"{"lines":["a"]}"#, 1),
            Err(TranslateError::NotJson(_))
        ));
    }

    #[test]
    fn batching_covers_every_line_exactly_once() {
        let lines: Vec<String> = (0..145).map(|i| format!("line {i}")).collect();
        let batches = batches(&lines);
        assert_eq!(batches.len(), 3);
        assert_eq!(batches.iter().map(|b| b.len()).sum::<usize>(), 145);
        assert_eq!(batches[0][0], "line 0");
        assert_eq!(batches[2].last().unwrap(), "line 144");
    }
}
