//! Search across one transcript or a whole library, locally.
//!
//! BM25 over segments. Not because a meeting archive needs state-of-the-art
//! retrieval, but because this index has a second job: it selects the
//! passages sent to the paid cross-meeting Q&A route. Retrieval quality is
//! therefore a *cost* lever -- better passages mean fewer tokens for the same
//! answer -- and it runs here, on the user's machine, for free.
//!
//! Tokenisation has to work for the 99 languages Whisper transcribes. Space
//! splitting handles most of them; for scripts that do not use spaces
//! (Chinese, Japanese, Thai) it would produce one enormous token per
//! sentence, so those are additionally indexed as character bigrams, which is
//! the standard cheap answer and needs no per-language dictionary.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use unicode_segmentation::UnicodeSegmentation;

/// Saturation and length-normalisation constants. The usual defaults; a
/// meeting transcript has no property that argues for tuning them.
const K1: f64 = 1.2;
const B: f64 = 0.75;

/// One indexed passage, addressed well enough to jump to it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Passage {
    /// Which transcript, when the index spans a library. Empty for one.
    pub note_id: String,
    pub segment: usize,
    pub start_ms: i64,
    pub end_ms: i64,
    pub speaker: Option<String>,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Hit {
    pub passage: Passage,
    pub score: f64,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct Index {
    passages: Vec<Passage>,
    /// Term -> (passage index, term frequency).
    postings: HashMap<String, Vec<(usize, u32)>>,
    lengths: Vec<f64>,
    average_length: f64,
}

impl Index {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn len(&self) -> usize {
        self.passages.len()
    }

    pub fn is_empty(&self) -> bool {
        self.passages.is_empty()
    }

    /// Add every segment of one transcript.
    pub fn add(&mut self, note_id: &str, transcript: &crate::Transcript) {
        for (segment_index, segment) in transcript.segments.iter().enumerate() {
            let terms = tokenize(&segment.text);
            let passage_index = self.passages.len();
            self.passages.push(Passage {
                note_id: note_id.to_string(),
                segment: segment_index,
                start_ms: segment.start_ms,
                end_ms: segment.end_ms,
                speaker: segment
                    .speaker
                    .as_deref()
                    .and_then(|id| transcript.label_for(id))
                    .map(str::to_string),
                text: segment.text.clone(),
            });
            self.lengths.push(terms.len() as f64);

            let mut counts: HashMap<String, u32> = HashMap::new();
            for term in terms {
                *counts.entry(term).or_default() += 1;
            }
            for (term, count) in counts {
                self.postings
                    .entry(term)
                    .or_default()
                    .push((passage_index, count));
            }
        }
        self.average_length = if self.lengths.is_empty() {
            0.0
        } else {
            self.lengths.iter().sum::<f64>() / self.lengths.len() as f64
        };
    }

    /// The `limit` best passages for a query, best first.
    pub fn search(&self, query: &str, limit: usize) -> Vec<Hit> {
        if self.passages.is_empty() {
            return Vec::new();
        }
        let total = self.passages.len() as f64;
        let mut scores: HashMap<usize, f64> = HashMap::new();

        for term in dedup(tokenize(query)) {
            let Some(postings) = self.postings.get(&term) else {
                continue;
            };
            // The +0.5 / +0.5 form, so a term appearing in every passage
            // scores near zero rather than negative -- which would make a
            // common word actively *penalise* a passage that contains it.
            let document_frequency = postings.len() as f64;
            let idf = (1.0 + (total - document_frequency + 0.5) / (document_frequency + 0.5)).ln();
            for &(passage, frequency) in postings {
                let frequency = f64::from(frequency);
                let normalised = self.lengths[passage] / self.average_length.max(1.0);
                let weight = frequency * (K1 + 1.0) / (frequency + K1 * (1.0 - B + B * normalised));
                *scores.entry(passage).or_default() += idf * weight;
            }
        }

        let mut hits: Vec<Hit> = scores
            .into_iter()
            .map(|(passage, score)| Hit {
                passage: self.passages[passage].clone(),
                score,
            })
            .collect();
        // Ties broken by position so results are stable between runs; an
        // unstable ordering makes the answer to a paid question change
        // without the question changing.
        hits.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then(a.passage.start_ms.cmp(&b.passage.start_ms))
        });
        hits.truncate(limit);
        hits
    }
}

/// Lowercased word tokens, plus character bigrams for spaceless scripts.
fn tokenize(text: &str) -> Vec<String> {
    let mut terms = Vec::new();
    for word in text.unicode_words() {
        let word = word.to_lowercase();
        if word.is_empty() {
            continue;
        }
        if is_spaceless_script(&word) {
            let chars: Vec<char> = word.chars().collect();
            if chars.len() == 1 {
                terms.push(word);
            } else {
                for pair in chars.windows(2) {
                    terms.push(pair.iter().collect());
                }
            }
        } else {
            terms.push(word);
        }
    }
    terms
}

/// CJK ideographs, kana and Thai -- the scripts where `unicode_words` returns
/// a run far longer than one word.
fn is_spaceless_script(word: &str) -> bool {
    word.chars().any(|c| {
        matches!(c as u32,
            0x3040..=0x30FF     // kana
            | 0x3400..=0x4DBF   // CJK extension A
            | 0x4E00..=0x9FFF   // CJK unified
            | 0xF900..=0xFAFF   // CJK compatibility
            | 0x0E00..=0x0E7F   // Thai
        )
    })
}

fn dedup(mut terms: Vec<String>) -> Vec<String> {
    terms.sort();
    terms.dedup();
    terms
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Segment, Source, Transcript};

    fn indexed() -> Index {
        let mut index = Index::new();
        index.add(
            "n1",
            &Transcript::from_segments(
                Source::Recorded,
                vec![
                    Segment::new(0, 3_000, "We need to ship the billing migration by Friday.")
                        .with_speaker("S0"),
                    Segment::new(3_000, 6_000, "The billing tests are still red.")
                        .with_speaker("S1"),
                    Segment::new(6_000, 9_000, "Let us talk about hiring instead.")
                        .with_speaker("S0"),
                ],
            ),
        );
        index
    }

    #[test]
    fn the_passage_that_answers_the_query_ranks_first() {
        let hits = indexed().search("billing migration", 3);
        assert!(hits[0].passage.text.contains("migration"), "{hits:#?}");
        assert!(hits[0].score > hits[1].score);
    }

    #[test]
    fn a_hit_carries_enough_to_jump_to_it_and_to_cite_it() {
        let hits = indexed().search("hiring", 1);
        assert_eq!(hits[0].passage.start_ms, 6_000);
        assert_eq!(hits[0].passage.segment, 2);
        assert_eq!(hits[0].passage.speaker.as_deref(), Some("Speaker 1"));
        assert_eq!(hits[0].passage.note_id, "n1");
    }

    #[test]
    fn a_word_in_every_passage_never_scores_below_zero() {
        // The naive IDF goes negative here, which would rank a passage
        // *lower* for containing the search term.
        let mut index = Index::new();
        index.add(
            "n1",
            &Transcript::from_segments(
                Source::Imported,
                vec![
                    Segment::new(0, 1_000, "budget"),
                    Segment::new(1_000, 2_000, "budget"),
                ],
            ),
        );
        for hit in index.search("budget", 5) {
            assert!(hit.score >= 0.0, "{hit:?}");
        }
    }

    /// Space splitting on Chinese yields one token per sentence, which then
    /// matches nothing a user would type. Bigrams are why this works.
    #[test]
    fn a_language_without_spaces_is_still_searchable() {
        let mut index = Index::new();
        index.add(
            "n1",
            &Transcript::from_segments(
                Source::Imported,
                vec![
                    Segment::new(0, 2_000, "我们下周要完成预算审查"),
                    Segment::new(2_000, 4_000, "招聘计划推迟到下个月"),
                ],
            ),
        );
        let hits = index.search("预算", 2);
        assert!(!hits.is_empty(), "no hit for a term that is present");
        assert!(hits[0].passage.text.contains("预算"));
    }

    #[test]
    fn an_empty_index_and_an_unknown_term_both_return_nothing_rather_than_panicking() {
        assert!(Index::new().search("anything", 5).is_empty());
        assert!(indexed().search("zzzz", 5).is_empty());
    }

    #[test]
    fn one_index_can_span_a_library_and_says_which_note_a_hit_came_from() {
        let mut index = indexed();
        index.add(
            "n2",
            &Transcript::from_segments(
                Source::Recorded,
                vec![Segment::new(0, 2_000, "The offsite is in Lisbon.")],
            ),
        );
        let hits = index.search("Lisbon", 1);
        assert_eq!(hits[0].passage.note_id, "n2");
    }
}
