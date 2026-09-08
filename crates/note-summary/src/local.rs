//! The free summary: what is already in the transcript, picked out.
//!
//! §5.2 puts "keyword summary (extractive/rule-based)" in the free tier and
//! generative summarisation in the paid one, on the grounds that the first
//! costs nothing to run and the second is a vendor bill. That line is exactly
//! right, and this module is the free half.
//!
//! It does four things, all of them arithmetic over words the user already
//! has:
//!
//! - **Topics** -- the terms that carry this transcript, by frequency against
//!   a stop list, with repeated multi-word phrases preferred over their parts.
//! - **Key points** -- the sentences densest in those terms.
//! - **Action items, decisions and questions** -- sentences matching cue
//!   patterns, with the owner and the deadline pulled out where they are
//!   stated plainly.
//!
//! # What it deliberately does not do
//!
//! It does not write a sentence that was not said. Everything here is quoted,
//! with a timestamp, and the interface labels it "picked out on this device"
//! -- because the honest description of extraction is *highlighting*, and
//! calling it "AI summary" would be selling the paid feature's name for the
//! free feature's output.
//!
//! # Languages
//!
//! Topics and key points work in any language: they are frequency and
//! density, and [`crate::text`] handles the segmentation. Cue detection
//! (actions, decisions, questions) is pattern matching against phrasings, so
//! it ships English and Chinese lists and degrades to "no cues found" rather
//! than to wrong ones elsewhere. The interface says which languages the cue
//! detection covers rather than letting a French user conclude their meeting
//! had no action items.

use std::collections::HashMap;

use note_core::{ActionItem, Origin, Summary, SummaryStats, Transcript};

use crate::text::{is_spaceless, sentences, words, Sentence};

#[path = "local/cues.rs"]
pub mod cues;
#[path = "local/stopwords.rs"]
mod stopwords;
use stopwords::is_stopword;

pub use cues::languages as cue_languages;

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(default)]
pub struct Options {
    pub max_keywords: usize,
    pub max_key_points: usize,
    pub max_actions: usize,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            max_keywords: 12,
            max_key_points: 7,
            max_actions: 15,
        }
    }
}

pub fn summarise(transcript: &Transcript, options: &Options) -> Summary {
    let sentences = sentences(transcript);
    if sentences.is_empty() {
        return Summary {
            origin: Origin::Extracted,
            ..Default::default()
        };
    }

    let scores = term_scores(&sentences);
    let keywords = top_terms(&scores, options.max_keywords);

    let mut action_items = Vec::new();
    let mut decisions = Vec::new();
    let mut questions = Vec::new();
    // Which sentences already appear under a heading of their own, so the key
    // points do not repeat them. A panel listing the same sentence as a
    // decision *and* a key point looks like it found twice as much as it did.
    let mut spoken_for: Vec<usize> = Vec::new();

    // Each sentence lands in exactly one list. Listing "谁负责这次的迁移？" under
    // both Action items and Questions makes the panel look like it found twice
    // as much as it did, and leaves the reader to work out that the two entries
    // are the same sentence.
    //
    // The order encodes what each signal is worth:
    //
    // 1. **A decision cue wins outright.** "We agreed we'll ship on Friday" is
    //    a decision that happens to contain an action cue.
    // 2. **An explicit question marker beats an action cue.** A sentence ending
    //    in ?, ？ or a question particle is asking, whatever words it contains
    //    -- "谁负责这次的迁移？" contains 负责 and is still a question. This costs
    //    us the polite imperative ("Can you send the deck by Friday?"), which
    //    lands under Questions rather than Actions; the reader still sees it,
    //    which is the cheaper failure.
    // 3. **An action cue beats a merely implied question.** "How do we get this
    //    done by Friday" with no question mark is work, not an enquiry.
    for (index, sentence) in sentences.iter().enumerate() {
        let lowered = sentence.text.to_lowercase();
        spoken_for.push(index);

        if matches_any(&lowered, |c| c.decisions) {
            push_unique(&mut decisions, sentence.text.clone());
        } else if is_explicit_question(&sentence.text) {
            push_unique(&mut questions, sentence.text.clone());
        } else if matches_any(&lowered, |c| c.actions) && action_items.len() < options.max_actions {
            action_items.push(ActionItem {
                owner: owner_of(sentence, transcript),
                due: due_of(&lowered),
                text: sentence.text.clone(),
                at_ms: Some(sentence.start_ms),
            });
        } else if is_question(&sentence.text, &lowered) {
            push_unique(&mut questions, sentence.text.clone());
        } else {
            // Nothing claimed it, so it stays available as a key point.
            spoken_for.pop();
        }
    }

    let key_points = key_sentences(&sentences, &scores, options.max_key_points, &spoken_for);

    Summary {
        origin: Origin::Extracted,
        overview: String::new(),
        stats: Some(stats(transcript, &sentences)),
        keywords,
        key_points,
        decisions,
        action_items,
        questions,
    }
}

/// Countable facts rather than a written summary.
///
/// The temptation is to stitch the top sentences into a paragraph, which reads
/// like prose the machine understood and is in fact three quotes in a row --
/// the failure mode this whole tier is labelled to avoid. Counts are honest
/// about what extraction can actually tell you, and they are checkable against
/// the transcript on screen.
///
/// Returned as numbers, not as a sentence: the sentence has to be written in
/// the reader's language, and this crate does not know which one that is.
fn stats(transcript: &Transcript, sentences: &[Sentence]) -> SummaryStats {
    SummaryStats {
        sentences: sentences.len(),
        minutes: ((transcript.duration_ms + 59_999) / 60_000).max(1),
        speakers: transcript.speakers.len(),
    }
}

/// Function words in spaceless scripts, which the Latin stop list never sees.
///
/// `stopwords` is matched against whole words, and Chinese and Japanese never
/// reach it -- they go through the n-gram path instead. Without this, 我们
/// ("we"), 这个 ("this") and 什么 ("what") are among the highest-frequency
/// n-grams in any transcript and take the top of every topic list.
fn is_cjk_stopword(term: &str) -> bool {
    const CJK_STOPWORDS: &[&str] = &[
        // Simplified
        "我们",
        "你们",
        "他们",
        "她们",
        "这个",
        "那个",
        "一个",
        "什么",
        "可以",
        "这样",
        "那样",
        "就是",
        "因为",
        "所以",
        "但是",
        "如果",
        "现在",
        "已经",
        "还有",
        "这些",
        "那些",
        "一下",
        "一些",
        "然后",
        "这里",
        "那里",
        "自己",
        "觉得",
        "知道",
        "应该",
        "可能",
        "或者",
        "而且",
        "其实",
        "比较",
        "非常",
        "真的",
        "东西",
        "时候",
        // Traditional
        "我們",
        "你們",
        "他們",
        "她們",
        "這個",
        "那個",
        "一個",
        "什麼",
        "這樣",
        "那樣",
        "因為",
        "如果",
        "現在",
        "已經",
        "還有",
        "這些",
        "那些",
        "然後",
        "這裡",
        "那裡",
        "覺得",
        "應該",
        "或者",
        "而且",
        "其實",
        "比較",
        "東西",
        "時候",
        // Japanese
        "です",
        "ます",
        "ました",
        "そして",
        "しかし",
        "という",
        "ように",
        "こと",
        "もの",
        "それ",
        "これ",
        "ため",
        "など",
        "から",
    ];
    CJK_STOPWORDS.contains(&term)
}

/// An n-gram that begins or ends on a grammatical particle is a span across a
/// word boundary, not a word.
///
/// 的预算 ("'s budget") and 个季度 ("[measure] quarter") are both real character
/// sequences and neither is a topic. These particles carry structure rather
/// than meaning, and a content word essentially never starts or ends on one --
/// which is what makes this cheap test a good proxy for the segmentation
/// dictionary this crate does not ship.
///
/// Deliberately short. Every character added here risks deleting a real word:
/// 会 is a particle in 我会 and a word in 会议, so it is not on the list.
fn spans_a_word_boundary(term: &str) -> bool {
    const EDGE_PARTICLES: &[char] = &[
        '的', '了', '吗', '呢', '吧', '啊', '把', '被', '就', '也', '都', '而', '嗎', '很',
    ];
    let mut chars = term.chars();
    let (Some(first), Some(last)) = (chars.next(), term.chars().last()) else {
        return false;
    };
    // 个 opens almost nothing (个人 is the exception) but closes plenty --
    // 这个, 那个 -- so it is tested at the front only.
    EDGE_PARTICLES.contains(&first) || EDGE_PARTICLES.contains(&last) || first == '个'
}

/// Term weights across the whole transcript.
///
/// Frequency, with three adjustments that matter more than the choice of
/// weighting scheme:
///
/// - stop words removed, or the top terms are "the", "we" and "and";
/// - bigrams counted alongside unigrams, so "burn rate" survives as a phrase;
/// - a term appearing in one long monologue scores below one appearing across
///   several turns, since a topic is something the meeting returned to.
fn term_scores(sentences: &[Sentence]) -> HashMap<String, f64> {
    let mut counts: HashMap<String, f64> = HashMap::new();
    let mut spread: HashMap<String, Vec<usize>> = HashMap::new();

    for (index, sentence) in sentences.iter().enumerate() {
        let mut terms: Vec<String> = Vec::new();
        if is_spaceless(&sentence.text) {
            // Character n-grams, because Chinese and Japanese put no spaces
            // between words and this crate ships no segmentation dictionary.
            //
            // Two *and* three characters. Most Chinese content words are two
            // characters, but plenty are three -- 服务器, 负责人, 迁移期 -- and a
            // bigram-only pass shatters those into 服务/务器, half of which are
            // meaningless fragments that then rank as topics. Emitting
            // trigrams alongside lets the real word out-score its own debris,
            // and `top_terms` drops the fragments once the whole word is kept.
            let chars: Vec<char> = sentence
                .text
                .chars()
                .filter(|c| c.is_alphabetic())
                .collect();
            for size in [2usize, 3] {
                for window in chars.windows(size) {
                    let term: String = window.iter().collect();
                    if !is_cjk_stopword(&term) && !spans_a_word_boundary(&term) {
                        terms.push(term);
                    }
                }
            }
        } else {
            let tokens: Vec<String> = words(&sentence.text)
                .into_iter()
                .filter(|w| w.chars().count() > 2 && !is_stopword(w))
                .collect();
            for pair in tokens.windows(2) {
                terms.push(format!("{} {}", pair[0], pair[1]));
            }
            terms.extend(tokens);
        }

        for term in terms {
            *counts.entry(term.clone()).or_default() += 1.0;
            spread.entry(term).or_default().push(index);
        }
    }

    prune_fragments(&mut counts);

    counts
        .into_iter()
        .filter(|(_, count)| *count >= 2.0)
        .map(|(term, count)| {
            let distinct = spread
                .get(&term)
                .map(|positions| {
                    let mut sorted = positions.clone();
                    sorted.dedup();
                    sorted.len()
                })
                .unwrap_or(1);
            // A phrase is worth more than either of its words, which is what
            // stops "rate" out-ranking "burn rate" purely by being shorter.
            let phrase_bonus = if term.contains(' ') { 1.6 } else { 1.0 };
            (term, count * (distinct as f64).sqrt() * phrase_bonus)
        })
        .collect()
}

/// Drop a short CJK n-gram that never occurs outside a longer one.
///
/// If 服务器 appears three times and 服务 also appears three times, then 服务
/// only ever occurs *inside* 服务器 and is a fragment of it, not a word the
/// meeting used. If 预算 appears four times and 的预算 twice, 预算 stands on its
/// own and is kept.
///
/// This is the piece that makes the trigram pass an improvement rather than
/// just more noise: without it, a word and both halves of it all score alike
/// and the topic list reads 服务 · 务器 · 服务器.
fn prune_fragments(counts: &mut HashMap<String, f64>) {
    let longer: Vec<(String, f64)> = counts
        .iter()
        .filter(|(term, _)| !term.is_ascii() && !term.contains(' ') && term.chars().count() >= 3)
        .map(|(term, count)| (term.clone(), *count))
        .collect();

    for (long, long_count) in longer {
        let chars: Vec<char> = long.chars().collect();
        for window in chars.windows(chars.len() - 1) {
            let short: String = window.iter().collect();
            if counts.get(&short).is_some_and(|c| *c <= long_count) {
                counts.remove(&short);
            }
        }
    }
}

fn top_terms(scores: &HashMap<String, f64>, limit: usize) -> Vec<String> {
    let mut ranked: Vec<(&String, &f64)> = scores.iter().collect();
    ranked.sort_by(|a, b| {
        b.1.partial_cmp(a.1)
            .unwrap_or(std::cmp::Ordering::Equal)
            // Longer first on a tie. Two n-grams that scored identically are
            // usually a word and a piece of it, and the word is the topic.
            .then(b.0.chars().count().cmp(&a.0.chars().count()))
            .then(a.0.cmp(b.0))
    });

    let mut out: Vec<String> = Vec::new();
    for (term, _) in ranked {
        if out.len() >= limit {
            break;
        }
        // Skip a unigram already carried by a phrase we kept, and a phrase
        // that merely extends one we kept. Otherwise the topic list reads
        // "burn rate, burn, rate, burn rate forecast".
        // Skip anything already carried by a term we kept. Two shapes of that:
        //
        // - **Words**: "burn" and "rate" once "burn rate" is in, or the reverse
        //   -- otherwise the list reads "burn rate, burn, rate, burn rate
        //   forecast".
        // - **Characters**: 服务 and 务器 once 服务器 is in. Without this the
        //   n-gram pass fills the topic list with fragments of a single word,
        //   which is exactly how it reads: 预算 · 个季 · 务器 · 季度 · 服务.
        let redundant = out.iter().any(|kept| {
            if term.contains(' ') || kept.contains(' ') {
                return kept.split(' ').any(|part| part == term)
                    || term.split(' ').any(|part| part == kept);
            }
            if !term.is_ascii() && !kept.is_ascii() {
                return kept.contains(term.as_str()) || term.contains(kept.as_str());
            }
            kept == term
        });
        if !redundant {
            out.push(term.clone());
        }
    }
    out
}

/// The sentences carrying the most of the transcript's own vocabulary.
///
/// Normalised by length, or the ranking simply returns the longest sentences;
/// floored at a minimum length, or it returns "Right." and "Exactly."
fn key_sentences(
    sentences: &[Sentence],
    scores: &HashMap<String, f64>,
    limit: usize,
    spoken_for: &[usize],
) -> Vec<String> {
    // Two limits, and the second matters more. `limit` is the caller's
    // ceiling; the other is a third of the transcript. A summary that selects
    // most of what was said is not a summary, it is the transcript with two
    // lines missing -- and on a short meeting a fixed ceiling of seven does
    // exactly that. Highlighting five sentences out of six teaches a reader
    // that the panel is not selective, so they stop reading it on the long
    // meetings where it would have helped.
    let limit = limit.min(sentences.len().div_ceil(3)).max(1);
    let mut ranked: Vec<(usize, f64)> = sentences
        .iter()
        .enumerate()
        .map(|(index, sentence)| {
            // Already listed as a decision, an action or a question.
            if spoken_for.contains(&index) {
                return (index, 0.0);
            }
            let spaceless = is_spaceless(&sentence.text);
            let tokens: Vec<String> = if spaceless {
                // Bigrams only here, deliberately: this is a density measure
                // over an already-scored vocabulary, and adding trigrams would
                // count the same characters twice and favour long sentences.
                let chars: Vec<char> = sentence
                    .text
                    .chars()
                    .filter(|c| c.is_alphabetic())
                    .collect();
                chars.windows(2).map(|p| p.iter().collect()).collect()
            } else {
                words(&sentence.text)
            };
            if tokens.len() < 4 {
                return (index, 0.0);
            }
            let total: f64 = tokens.iter().filter_map(|token| scores.get(token)).sum();
            // Bigrams too, so a sentence containing the phrase scores for it.
            let phrases: f64 = tokens
                .windows(2)
                .filter_map(|pair| scores.get(&format!("{} {}", pair[0], pair[1])))
                .sum();
            (index, (total + phrases) / (tokens.len() as f64).sqrt())
        })
        .collect();

    ranked.sort_by(|a, b| {
        b.1.partial_cmp(&a.1)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(a.0.cmp(&b.0))
    });
    let mut chosen: Vec<usize> = ranked
        .into_iter()
        .filter(|(_, score)| *score > 0.0)
        .take(limit)
        .map(|(index, _)| index)
        .collect();
    // Chronological, not by score: a summary read out of order is a list of
    // quotes, and a meeting has a shape.
    chosen.sort_unstable();
    chosen
        .into_iter()
        .map(|index| sentences[index].text.clone())
        .collect()
}

/// Does any language's list of this kind match?
///
/// Every language is tried against every sentence rather than the transcript
/// being assigned one language first. A meeting held half in English and half
/// in Chinese -- the normal case in this product's own market, not an edge
/// case -- would otherwise lose whichever half lost the vote.
fn matches_any(lowered: &str, pick: impl Fn(&cues::Cues) -> &'static [&'static str]) -> bool {
    cues::ALL
        .iter()
        .any(|set| pick(set).iter().any(|cue| lowered.contains(cue)))
}

/// Is this sentence asking something?
///
/// Three tests, because three families of language mark a question in three
/// different places, and speech transcription drops the question mark in all
/// of them:
///
/// - **A question mark**, in any of its scripts, when we are given one.
/// - **An opener** -- "why", "wer", "pourquoi". Only at the start of a
///   sentence or a clause, or every sentence containing "how" becomes one.
/// - **An ending** -- Japanese か, Korean 까요. These mark the question at the
///   far end, so an opener test finds none of them.
///
/// Chinese sits between the two: 吗 and 呢 are sentence-final particles and are
/// listed as endings, while 为什么 and 是不是 sit mid-sentence and are matched
/// anywhere.
/// A question marked as one, rather than merely phrased like one.
///
/// A question mark in any script, or a sentence-final interrogative particle in
/// a language that marks questions at the end. This is the strong signal, and
/// the one that outranks an action cue -- see the loop in [`summarise`].
fn is_explicit_question(text: &str) -> bool {
    let trimmed = text.trim_end_matches(['。', '.', ' ', '！']);
    if trimmed.ends_with('?') || trimmed.ends_with('？') || trimmed.ends_with('؟') {
        return true;
    }
    cues::ALL.iter().any(|set| {
        set.question_endings
            .iter()
            .any(|ending| trimmed.ends_with(ending))
    })
}

/// A question, including the ones speech transcription stripped the mark from.
///
/// Beyond [`is_explicit_question`], an interrogative opener counts -- "why",
/// "wer", "pourquoi". Only at the start of a sentence or a clause, or every
/// sentence containing "how" becomes a question. A CJK interrogative sits
/// mid-sentence rather than opening it, so those are matched anywhere.
fn is_question(text: &str, lowered: &str) -> bool {
    if is_explicit_question(text) {
        return true;
    }
    for set in cues::ALL {
        for lead in set.question_leads {
            let cjk = !lead.is_ascii();
            if (cjk && lowered.contains(lead))
                || lowered.starts_with(lead)
                || lowered.contains(&format!(", {lead}"))
            {
                return true;
            }
        }
    }
    false
}

/// Who owes the action, where the sentence says so.
///
/// Two sources, in order of reliability: a speaker's own name appearing
/// before a modal ("Ana will send it"), else the speaker who said it, since
/// "I'll send it" is the commonest phrasing of all and its owner is whoever
/// was talking.
fn owner_of(sentence: &Sentence, transcript: &Transcript) -> Option<String> {
    let lowered = sentence.text.to_lowercase();
    for speaker in &transcript.speakers {
        if !speaker.named {
            continue;
        }
        let name = speaker.label.to_lowercase();
        if let Some(at) = lowered.find(&name) {
            let after = &lowered[at + name.len()..];
            let owned = cues::ALL.iter().any(|set| {
                set.owner_markers
                    .iter()
                    .any(|marker| after.starts_with(marker))
            });
            if owned {
                return Some(speaker.label.clone());
            }
        }
    }

    if matches_any(&lowered, |c| c.first_person) {
        return sentence
            .speaker
            .as_deref()
            .and_then(|id| transcript.label_for(id))
            .map(str::to_string);
    }
    None
}

/// The deadline a sentence states, in the words it stated it.
///
/// The longest match wins: "by the end of the week" and "this week" both match
/// the same sentence, and reporting the shorter one loses the part that
/// mattered.
fn due_of(lowered: &str) -> Option<String> {
    cues::ALL
        .iter()
        .flat_map(|set| set.due.iter())
        .filter(|cue| lowered.contains(**cue))
        .max_by_key(|cue| cue.len())
        .map(|cue| cue.to_string())
}

fn push_unique(list: &mut Vec<String>, value: String) {
    if !list.iter().any(|existing| existing == &value) {
        list.push(value);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use note_core::{Segment, Source};

    fn meeting() -> Transcript {
        let mut t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 4_000, "Right, let's look at the burn rate.").with_speaker("S0"),
                Segment::new(
                    4_000,
                    10_000,
                    "The burn rate is up eleven percent on last quarter, mostly hosting.",
                )
                .with_speaker("S1"),
                Segment::new(
                    10_000,
                    15_000,
                    "We agreed to move the hosting to the cheaper region.",
                )
                .with_speaker("S0"),
                Segment::new(
                    15_000,
                    20_000,
                    "I'll send the burn rate forecast by Friday.",
                )
                .with_speaker("S1"),
                Segment::new(20_000, 24_000, "Who signs off on the hosting migration?")
                    .with_speaker("S0"),
                Segment::new(24_000, 26_000, "Right.").with_speaker("S1"),
            ],
        );
        t.speakers[1].rename("Priya");
        t
    }

    #[test]
    fn the_topics_are_what_the_meeting_kept_returning_to() {
        let summary = summarise(&meeting(), &Options::default());
        assert!(
            summary.keywords.iter().any(|k| k == "burn rate"),
            "{:?}",
            summary.keywords
        );
        assert!(summary.keywords.iter().any(|k| k.contains("hosting")));
    }

    /// The failure that makes a topic list useless: the phrase and both its
    /// words all listed as separate topics.
    #[test]
    fn a_phrase_crowds_out_its_own_component_words() {
        let summary = summarise(&meeting(), &Options::default());
        assert!(summary.keywords.contains(&"burn rate".to_string()));
        assert!(
            !summary.keywords.contains(&"burn".to_string()),
            "{:?}",
            summary.keywords
        );
        assert!(
            !summary.keywords.contains(&"rate".to_string()),
            "{:?}",
            summary.keywords
        );
    }

    #[test]
    fn stop_words_never_reach_the_topic_list() {
        let summary = summarise(&meeting(), &Options::default());
        for banned in ["the", "and", "that", "we"] {
            assert!(
                !summary.keywords.iter().any(|k| k == banned),
                "{banned:?} in {:?}",
                summary.keywords
            );
        }
    }

    #[test]
    fn an_action_carries_its_owner_its_deadline_and_where_to_check_it() {
        let summary = summarise(&meeting(), &Options::default());
        let action = summary
            .action_items
            .iter()
            .find(|a| a.text.contains("forecast"))
            .expect("the forecast action was not found");
        assert_eq!(action.owner.as_deref(), Some("Priya"), "{action:?}");
        assert_eq!(action.due.as_deref(), Some("by friday"));
        assert_eq!(action.at_ms, Some(15_000));
    }

    #[test]
    fn a_decision_is_a_decision_and_not_also_an_action() {
        let summary = summarise(&meeting(), &Options::default());
        assert!(summary
            .decisions
            .iter()
            .any(|d| d.contains("cheaper region")));
        assert!(
            !summary
                .action_items
                .iter()
                .any(|a| a.text.contains("cheaper region")),
            "the decision was double-counted as an action"
        );
    }

    #[test]
    fn a_question_is_found_even_where_the_transcript_dropped_the_question_mark() {
        let t = Transcript::from_segments(
            Source::Recorded,
            vec![Segment::new(0, 3_000, "Who owns the migration").with_speaker("S0")],
        );
        let summary = summarise(&t, &Options::default());
        assert_eq!(summary.questions.len(), 1, "{summary:?}");
    }

    /// Key points must be quotes in the order they were said, never a
    /// re-ordered highlight reel.
    #[test]
    fn key_points_are_verbatim_and_chronological() {
        let transcript = meeting();
        let summary = summarise(&transcript, &Options::default());
        assert!(!summary.key_points.is_empty());
        let all: Vec<&str> = transcript
            .segments
            .iter()
            .map(|s| s.text.as_str())
            .collect();
        let mut previous = 0usize;
        for point in &summary.key_points {
            let position = all
                .iter()
                .position(|line| line.contains(point.as_str()))
                .unwrap_or_else(|| panic!("{point:?} was not said verbatim"));
            assert!(position >= previous, "key points came back out of order");
            previous = position;
        }
    }

    /// Highlighting most of a short meeting is not a summary. This is the
    /// failure that makes a reader stop trusting the panel.
    #[test]
    fn key_points_never_swallow_most_of_a_short_transcript() {
        let summary = summarise(&meeting(), &Options::default());
        assert!(
            summary.key_points.len() <= 2,
            "6 sentences produced {} key points: {:?}",
            summary.key_points.len(),
            summary.key_points
        );
    }

    /// A sentence shown under Decisions must not also appear under Key points:
    /// listing it twice makes the panel look like it found twice as much.
    #[test]
    fn a_decision_or_an_action_is_never_repeated_as_a_key_point() {
        let summary = summarise(&meeting(), &Options::default());
        for listed in summary
            .decisions
            .iter()
            .cloned()
            .chain(summary.action_items.iter().map(|a| a.text.clone()))
            .chain(summary.questions.iter().cloned())
        {
            assert!(
                !summary.key_points.contains(&listed),
                "{listed:?} appears twice"
            );
        }
    }

    #[test]
    fn filler_lines_do_not_become_key_points() {
        let summary = summarise(&meeting(), &Options::default());
        assert!(!summary.key_points.iter().any(|p| p == "Right."));
    }

    /// The header is counts, not prose -- and counts rather than an English
    /// sentence, so a Chinese or Japanese reader gets it in their own language
    /// instead of ours.
    #[test]
    fn the_header_is_countable_facts_and_carries_no_english() {
        let summary = summarise(&meeting(), &Options::default());
        let stats = summary
            .stats
            .expect("an extracted summary must carry stats");
        assert_eq!(stats.speakers, 2);
        assert_eq!(stats.sentences, 6);
        assert!(
            stats.minutes >= 1,
            "a short meeting still lasted about a minute"
        );
        assert!(
            summary.overview.is_empty(),
            "the extractive tier must not write prose: {:?}",
            summary.overview
        );
        assert_eq!(summary.origin, Origin::Extracted);
    }

    /// The visible bug this fixes: a bigram-only pass shattered 服务器 into
    /// 服务 and 务器 and 上个季度 into 个季, and the topic list filled up with
    /// fragments of one word.
    #[test]
    fn chinese_topics_are_words_and_not_fragments_of_words() {
        let t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 4_000, "我们先看一下这个季度的预算情况。").with_speaker("S0"),
                Segment::new(
                    4_000,
                    10_000,
                    "预算比上个季度增加了百分之十一，主要是服务器成本。",
                )
                .with_speaker("S1"),
                Segment::new(10_000, 15_000, "我们决定把服务器迁移到便宜的区域。")
                    .with_speaker("S0"),
                Segment::new(15_000, 20_000, "服务器的预算下周之前要定下来。").with_speaker("S1"),
            ],
        );
        let topics = summarise(&t, &Options::default()).keywords;
        assert!(topics.iter().any(|k| k == "服务器"), "{topics:?}");
        for fragment in ["服务", "务器", "个季"] {
            assert!(
                !topics.iter().any(|k| k == fragment),
                "{fragment:?} is a fragment, not a topic: {topics:?}"
            );
        }
        // 我们 is a pronoun, and the commonest bigram in almost any Chinese
        // transcript.
        assert!(!topics.iter().any(|k| k == "我们"), "{topics:?}");
    }

    /// 吧 softens a statement; 吗 and 呢 ask. Treating 吧 as interrogative filed
    /// ordinary sentences under Questions.
    #[test]
    fn a_softening_particle_is_not_a_question() {
        let t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 3_000, "应该是小林吧。").with_speaker("S0"),
                Segment::new(3_000, 6_000, "这个预算合理吗？").with_speaker("S1"),
            ],
        );
        let summary = summarise(&t, &Options::default());
        assert_eq!(summary.questions.len(), 1, "{:?}", summary.questions);
        assert!(summary.questions[0].contains("合理吗"));
    }

    /// One sentence, one list. "谁负责这次的迁移？" contains an action cue and is
    /// still a question; showing it in both places doubles the apparent yield.
    #[test]
    fn a_sentence_never_appears_in_two_lists() {
        let t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 4_000, "谁负责这次的迁移？").with_speaker("S0"),
                Segment::new(4_000, 8_000, "我会在下周之前把报告发给你。").with_speaker("S1"),
                Segment::new(8_000, 12_000, "我们决定先不动这块。").with_speaker("S0"),
            ],
        );
        let summary = summarise(&t, &Options::default());
        assert_eq!(summary.questions.len(), 1, "{:?}", summary.questions);
        assert_eq!(summary.action_items.len(), 1, "{:?}", summary.action_items);
        assert_eq!(summary.decisions.len(), 1, "{:?}", summary.decisions);

        let mut seen: Vec<&str> = summary
            .questions
            .iter()
            .map(String::as_str)
            .chain(summary.action_items.iter().map(|a| a.text.as_str()))
            .chain(summary.decisions.iter().map(String::as_str))
            .chain(summary.key_points.iter().map(String::as_str))
            .collect();
        let before = seen.len();
        seen.sort_unstable();
        seen.dedup();
        assert_eq!(before, seen.len(), "a sentence was listed twice: {seen:?}");
    }

    #[test]
    fn a_chinese_meeting_gets_topics_and_key_points_too() {
        let t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 4_000, "我们先看一下预算情况。").with_speaker("S0"),
                Segment::new(
                    4_000,
                    9_000,
                    "预算比上个季度增加了百分之十一，主要是预算超支。",
                )
                .with_speaker("S1"),
                Segment::new(9_000, 13_000, "我们决定把预算控制在原来的水平。").with_speaker("S0"),
            ],
        );
        let summary = summarise(&t, &Options::default());
        assert!(
            summary.keywords.iter().any(|k| k.contains('预')),
            "{:?}",
            summary.keywords
        );
        assert!(!summary.key_points.is_empty());
        assert!(summary.decisions.iter().any(|d| d.contains("我们决定")));
    }

    #[test]
    fn a_traditional_chinese_meeting_finds_its_decisions_and_actions() {
        let t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 4_000, "我們先看一下預算的情況。").with_speaker("S0"),
                Segment::new(4_000, 9_000, "預算比上個季度增加了百分之十一。").with_speaker("S1"),
                Segment::new(9_000, 13_000, "我們決定把預算控制在原來的水平。").with_speaker("S0"),
                Segment::new(13_000, 18_000, "我會在週五前把報告寄給你。").with_speaker("S1"),
                Segment::new(18_000, 22_000, "誰負責這次的遷移？").with_speaker("S0"),
            ],
        );
        let summary = summarise(&t, &Options::default());
        assert!(
            summary.decisions.iter().any(|d| d.contains("我們決定")),
            "{:?}",
            summary.decisions
        );
        let action = summary
            .action_items
            .iter()
            .find(|a| a.text.contains("報告"))
            .expect("the report action was not found");
        assert_eq!(action.due.as_deref(), Some("週五前"));
        assert!(!summary.questions.is_empty(), "{summary:?}");
    }

    #[test]
    fn a_japanese_meeting_finds_a_question_marked_only_at_its_end() {
        let t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 4_000, "予算の状況を確認しましょう。").with_speaker("S0"),
                Segment::new(4_000, 8_000, "来週までに私が対応します。").with_speaker("S1"),
                Segment::new(8_000, 12_000, "この移行は誰が担当しますか").with_speaker("S0"),
                Segment::new(12_000, 16_000, "そうしましょう、決定しました。").with_speaker("S1"),
            ],
        );
        let summary = summarise(&t, &Options::default());
        // No question mark anywhere -- the か at the end is the only marker,
        // and an opener test would find none of these.
        assert!(
            summary.questions.iter().any(|q| q.contains("担当")),
            "{:?}",
            summary.questions
        );
        assert!(summary.decisions.iter().any(|d| d.contains("決定しました")));
        let action = summary
            .action_items
            .iter()
            .find(|a| a.text.contains("対応"))
            .expect("the Japanese action was not found");
        assert_eq!(action.due.as_deref(), Some("来週"));
    }

    /// The normal case in Singapore and Hong Kong, not an edge case: half the
    /// meeting in English, half in Chinese. Assigning the transcript one
    /// language first would lose whichever half lost the vote.
    #[test]
    fn a_code_switched_meeting_finds_cues_in_both_languages() {
        let t = Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 4_000, "We agreed to move hosting to the cheaper region.")
                    .with_speaker("S0"),
                Segment::new(4_000, 9_000, "我会在下周之前把预算报告发给你。").with_speaker("S1"),
                Segment::new(9_000, 13_000, "I'll send the forecast by Friday.").with_speaker("S0"),
            ],
        );
        let summary = summarise(&t, &Options::default());
        assert_eq!(summary.decisions.len(), 1, "{:?}", summary.decisions);
        assert_eq!(
            summary.action_items.len(),
            2,
            "one language's actions went missing: {:?}",
            summary.action_items
        );
    }

    #[test]
    fn european_languages_find_their_actions_too() {
        for (line, language) in [
            ("Je vais envoyer le rapport pour vendredi.", "French"),
            ("Voy a enviar el informe para el viernes.", "Spanish"),
            ("Ich werde den Bericht bis freitag schicken.", "German"),
            ("Vou enviar o relatório até sexta.", "Portuguese"),
        ] {
            let t = Transcript::from_segments(
                Source::Recorded,
                vec![Segment::new(0, 4_000, line).with_speaker("S0")],
            );
            let summary = summarise(&t, &Options::default());
            assert_eq!(
                summary.action_items.len(),
                1,
                "{language} found nothing in {line:?}"
            );
            assert!(
                summary.action_items[0].due.is_some(),
                "{language} missed the deadline in {line:?}"
            );
        }
    }

    /// "by the end of the week" and "this week" both match; reporting the
    /// shorter one loses the part that mattered.
    #[test]
    fn the_longest_deadline_phrase_wins() {
        let t = Transcript::from_segments(
            Source::Recorded,
            vec![Segment::new(
                0,
                4_000,
                "I'll have it done by the end of the week, so not this week's standup.",
            )
            .with_speaker("S0")],
        );
        let summary = summarise(&t, &Options::default());
        assert_eq!(
            summary.action_items[0].due.as_deref(),
            Some("by the end of the week")
        );
    }

    #[test]
    fn an_empty_transcript_summarises_to_an_empty_summary_rather_than_panicking() {
        let summary = summarise(&Transcript::new(Source::Imported), &Options::default());
        assert!(summary.is_empty());
        assert!(summary.stats.is_none(), "nothing to count means no counts");
        assert_eq!(summary.origin, Origin::Extracted);
    }

    #[test]
    fn the_limits_are_respected() {
        let options = Options {
            max_keywords: 2,
            max_key_points: 1,
            max_actions: 1,
        };
        let summary = summarise(&meeting(), &options);
        assert!(summary.keywords.len() <= 2);
        assert!(summary.key_points.len() <= 1);
        assert!(summary.action_items.len() <= 1);
    }
}
