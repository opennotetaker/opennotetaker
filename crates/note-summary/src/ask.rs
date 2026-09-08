//! Asking a question across every meeting you have recorded.
//!
//! §5.2 lists cross-meeting AI Q&A as an opportunity, paid, with the note
//! that Otter, Fathom and Granola all put it behind their highest tier. The
//! shape here follows from the report's own reasoning about *why* it costs
//! money: retrieval plus a model call. Only the second half is a vendor bill.
//!
//! So the split is deliberate and visible in the interface: **the search is
//! free and local** -- `note_core::search` indexes the whole library in the
//! browser and finds the passages -- **and only the answer is paid for.** A
//! user who just wants to find where something was said never pays anything,
//! and never uploads anything either. The passages that do go to the model
//! are the handful that matched, not the library.
//!
//! That also makes the price small and predictable: an answer costs roughly
//! the same whether you have five meetings or five hundred, because the
//! number of passages sent is capped, not proportional.

use note_core::Passage;
use serde::{Deserialize, Serialize};

use crate::prompt::{extract_json, ParseError};

/// How many passages accompany a question.
///
/// Enough to answer from, few enough to keep the price flat and legible.
/// Beyond about this many the model's answer stops improving and the bill
/// keeps growing.
pub const MAX_PASSAGES: usize = 24;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AskRequest {
    pub question: String,
    /// Retrieved locally, already ranked. Each carries where it came from so
    /// the answer can cite it.
    pub passages: Vec<Citation>,
}

/// A passage as the model sees it, and as an answer cites it back.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Citation {
    /// A short label the model quotes back, e.g. `M3`. Deliberately not the
    /// note's real id: those are ULIDs, and asking a model to reproduce one
    /// exactly is asking for a citation that resolves to nothing.
    pub tag: String,
    /// Which stored note this came from. Never shown to the model.
    #[serde(default)]
    pub note_id: String,
    #[serde(default)]
    pub note_title: String,
    pub at_ms: i64,
    #[serde(default)]
    pub speaker: Option<String>,
    pub text: String,
}

impl AskRequest {
    /// Build a request from local search hits.
    pub fn from_hits(
        question: &str,
        hits: &[note_core::Hit],
        title_of: impl Fn(&str) -> String,
    ) -> Self {
        let passages = hits
            .iter()
            .take(MAX_PASSAGES)
            .enumerate()
            .map(|(index, hit)| Citation::from_passage(&hit.passage, index, &title_of))
            .collect();
        Self {
            question: question.trim().to_string(),
            passages,
        }
    }
}

impl Citation {
    fn from_passage(passage: &Passage, index: usize, title_of: &impl Fn(&str) -> String) -> Self {
        Self {
            tag: format!("M{}", index + 1),
            note_id: passage.note_id.clone(),
            note_title: title_of(&passage.note_id),
            at_ms: passage.start_ms,
            speaker: passage.speaker.clone(),
            text: passage.text.clone(),
        }
    }
}

const SYSTEM: &str = "\
You answer questions about meetings, using only the numbered excerpts you are given.

Rules:

1. Answer only from the excerpts. If they do not contain the answer, say so and \
set \"answered\" to false. \"The recordings do not cover this\" is a good answer; \
a guess dressed as a fact is not.
2. Cite every claim with the excerpt tags it came from, e.g. [\"M2\", \"M5\"].
3. Be brief. Two or three sentences unless the question genuinely needs more.
4. Answer in the language of the question.

Return exactly this JSON shape and nothing else:

{\"answer\": \"...\", \"answered\": true, \"cited\": [\"M1\", \"M4\"]}";

pub fn build_ask_request(request: &AskRequest, model: &str) -> serde_json::Value {
    let mut user = String::from("Excerpts:\n\n");
    for passage in &request.passages {
        user.push_str(&format!(
            "[{}] {} — {}{}: {}\n",
            passage.tag,
            passage.note_title,
            note_core::format_clock(passage.at_ms),
            passage
                .speaker
                .as_deref()
                .map(|s| format!(" — {s}"))
                .unwrap_or_default(),
            passage.text,
        ));
    }
    user.push_str("\nQuestion: ");
    user.push_str(&request.question);

    serde_json::json!({
        "model": model,
        "max_tokens": 1200,
        "system": SYSTEM,
        "messages": [{ "role": "user", "content": user }],
    })
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Answer {
    pub answer: String,
    /// False when the recordings do not cover the question. The interface
    /// renders this differently from an answer -- an unanswerable question
    /// styled as an answer is how a retrieval product teaches people to
    /// distrust it.
    pub answered: bool,
    /// The passages the answer rests on, resolved back to real note ids so
    /// the interface can jump to the moment.
    pub cited: Vec<Citation>,
}

pub fn parse_answer(content: &str, passages: &[Citation]) -> Result<Answer, ParseError> {
    let value = extract_json(content)?;
    let object = value.as_object().ok_or(ParseError::WrongShape)?;

    let answer = object
        .get("answer")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .trim()
        .to_string();
    if answer.is_empty() {
        return Err(ParseError::Empty);
    }

    let tags: Vec<String> = object
        .get("cited")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str())
                .map(|tag| tag.trim().to_uppercase())
                .collect()
        })
        .unwrap_or_default();

    // Resolve against the passages actually sent, dropping anything invented.
    // A citation that does not resolve is worse than none: it is a link the
    // user clicks and lands nowhere, which reads as the product being broken
    // rather than as the model being wrong.
    let cited = tags
        .iter()
        .filter_map(|tag| passages.iter().find(|p| &p.tag == tag))
        .cloned()
        .collect();

    Ok(Answer {
        answer,
        answered: object
            .get("answered")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
        cited,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use note_core::{Segment, Source, Transcript};

    fn passages() -> Vec<Citation> {
        vec![
            Citation {
                tag: "M1".into(),
                note_id: "01J".into(),
                note_title: "Q3 planning".into(),
                at_ms: 65_000,
                speaker: Some("Ana".into()),
                text: "We decided to move hosting to the cheaper region.".into(),
            },
            Citation {
                tag: "M2".into(),
                note_id: "01K".into(),
                note_title: "Standup".into(),
                at_ms: 5_000,
                speaker: None,
                text: "Hosting migration is not started yet.".into(),
            },
        ]
    }

    #[test]
    fn the_prompt_labels_each_excerpt_with_its_meeting_and_its_time() {
        let request = AskRequest {
            question: "What did we decide about hosting?".into(),
            passages: passages(),
        };
        let user = build_ask_request(&request, "m")["messages"][0]["content"]
            .as_str()
            .unwrap()
            .to_string();
        assert!(user.contains("[M1] Q3 planning — 1:05 — Ana:"), "{user}");
        assert!(user.contains("[M2] Standup — 0:05:"), "{user}");
        assert!(user.trim().ends_with("What did we decide about hosting?"));
    }

    #[test]
    fn citations_resolve_back_to_the_note_and_the_moment() {
        let answer = parse_answer(
            r#"{"answer":"You moved hosting.","answered":true,"cited":["M1"]}"#,
            &passages(),
        )
        .unwrap();
        assert_eq!(answer.cited.len(), 1);
        assert_eq!(answer.cited[0].note_id, "01J");
        assert_eq!(answer.cited[0].at_ms, 65_000);
    }

    /// A link that lands nowhere reads as the product being broken.
    #[test]
    fn an_invented_citation_is_dropped_rather_than_shown() {
        let answer = parse_answer(
            r#"{"answer":"Something.","answered":true,"cited":["M1","M9","nonsense"]}"#,
            &passages(),
        )
        .unwrap();
        assert_eq!(answer.cited.len(), 1);
        assert_eq!(answer.cited[0].tag, "M1");
    }

    #[test]
    fn not_knowing_is_carried_through_rather_than_flattened_into_an_answer() {
        let answer = parse_answer(
            r#"{"answer":"The recordings do not cover this.","answered":false,"cited":[]}"#,
            &passages(),
        )
        .unwrap();
        assert!(!answer.answered);
        assert!(answer.cited.is_empty());
    }

    #[test]
    fn an_empty_or_malformed_answer_is_an_error() {
        assert_eq!(
            parse_answer(r#"{"answer":"   "}"#, &passages()),
            Err(ParseError::Empty)
        );
        assert!(matches!(
            parse_answer("no json here", &passages()),
            Err(ParseError::NotJson(_))
        ));
    }

    #[test]
    fn building_from_local_hits_caps_the_passage_count_and_tags_them_in_order() {
        let mut index = note_core::Index::new();
        index.add(
            "01J",
            &Transcript::from_segments(
                Source::Recorded,
                (0..60)
                    .map(|i| Segment::new(i * 1_000, i * 1_000 + 900, format!("hosting line {i}")))
                    .collect(),
            ),
        );
        let hits = index.search("hosting", 100);
        let request = AskRequest::from_hits("where?", &hits, |_| "Q3 planning".into());
        assert_eq!(request.passages.len(), MAX_PASSAGES);
        assert_eq!(request.passages[0].tag, "M1");
        assert_eq!(
            request.passages[MAX_PASSAGES - 1].tag,
            format!("M{MAX_PASSAGES}")
        );
        assert_eq!(request.passages[0].note_title, "Q3 planning");
    }
}
