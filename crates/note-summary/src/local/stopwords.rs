//! Words that carry no topic.
//!
//! A short list on purpose. A long one starts removing domain words -- "call",
//! "team", "plan", "cost" -- which in a meeting transcript are often exactly
//! the topic. Everything here is either grammatical, or filler that a
//! transcript is full of and a summary should never be.
//!
//! English and the largest Latin-script languages only. Spaceless scripts do
//! not go through this path at all (see `local::term_scores`), and a language
//! with no list here simply keeps its function words -- visible in the topic
//! list, but a milder failure than removing content words by guesswork.

/// Sorted, so the lookup is a binary search rather than a linear scan over a
/// few hundred entries once per token of an hour-long transcript.
const STOPWORDS: &[&str] = &[
    "aber",
    "about",
    "actually",
    "after",
    "again",
    "against",
    "algo",
    "all",
    "alors",
    "already",
    "also",
    "although",
    "always",
    "am",
    "and",
    "another",
    "any",
    "anything",
    "are",
    "aren",
    "around",
    "auch",
    "aus",
    "avec",
    "back",
    "basically",
    "be",
    "because",
    "been",
    "before",
    "being",
    "bien",
    "both",
    "but",
    "came",
    "can",
    "can't",
    "cannot",
    "come",
    "comes",
    "coming",
    "could",
    "couldn",
    "dans",
    "das",
    "dass",
    "definitely",
    "dem",
    "den",
    "der",
    "des",
    "did",
    "didn",
    "didn't",
    "die",
    "does",
    "doesn",
    "doesn't",
    "doing",
    "don",
    "don't",
    "done",
    "durch",
    "each",
    "eine",
    "einen",
    "either",
    "else",
    "en",
    "encore",
    "enough",
    "es",
    "est",
    "et",
    "even",
    "ever",
    "every",
    "everything",
    "exactly",
    "from",
    "für",
    "gets",
    "getting",
    "give",
    "going",
    "gonna",
    "got",
    "gotta",
    "guess",
    "had",
    "hadn",
    "has",
    "hasn",
    "hasn't",
    "have",
    "haven",
    "haven't",
    "having",
    "he",
    "her",
    "here",
    "hers",
    "herself",
    "him",
    "himself",
    "his",
    "how",
    "however",
    "i",
    "ich",
    "into",
    "is",
    "isn",
    "isn't",
    "it",
    "its",
    "itself",
    "just",
    "kind",
    "know",
    "las",
    "les",
    "let",
    "like",
    "look",
    "looking",
    "los",
    "made",
    "mais",
    "make",
    "making",
    "many",
    "maybe",
    "me",
    "mean",
    "means",
    "might",
    "mine",
    "more",
    "most",
    "much",
    "must",
    "my",
    "myself",
    "nicht",
    "not",
    "nothing",
    "now",
    "off",
    "okay",
    "once",
    "one",
    "only",
    "onto",
    "other",
    "others",
    "our",
    "ours",
    "ourselves",
    "out",
    "over",
    "own",
    "para",
    "part",
    "pero",
    "por",
    "pour",
    "pretty",
    "probably",
    "put",
    "que",
    "quite",
    "rather",
    "really",
    "right",
    "said",
    "same",
    "say",
    "saying",
    "says",
    "see",
    "seen",
    "sein",
    "she",
    "should",
    "shouldn",
    "sich",
    "since",
    "some",
    "somebody",
    "something",
    "sort",
    "still",
    "stuff",
    "such",
    "sure",
    "take",
    "than",
    "that",
    "the",
    "their",
    "theirs",
    "them",
    "themselves",
    "then",
    "there",
    "these",
    "they",
    "thing",
    "things",
    "think",
    "this",
    "those",
    "though",
    "through",
    "thus",
    "too",
    "und",
    "under",
    "une",
    "until",
    "us",
    "use",
    "used",
    "using",
    "very",
    "want",
    "was",
    "wasn",
    "wasn't",
    "way",
    "we",
    "well",
    "were",
    "weren",
    "what",
    "whatever",
    "when",
    "where",
    "whether",
    "which",
    "while",
    "who",
    "whom",
    "why",
    "will",
    "with",
    "within",
    "without",
    "won",
    "won't",
    "would",
    "wouldn",
    "yeah",
    "yes",
    "yet",
    "you",
    "your",
    "yours",
    "yourself",
];

pub fn is_stopword(word: &str) -> bool {
    if STOPWORDS.binary_search(&word).is_ok() {
        return true;
    }
    // A contraction is one token to the segmenter -- UAX #29 treats the
    // apostrophe as MidLetter -- so `let's` never matched the `let` in the
    // list above, and neither did `i'll`, `we're` or `that's`. The result was
    // a topic line reading "staging · let's · i'll · push" on a meeting whose
    // actual topic was staging. Judge a contraction by the word it is built
    // from, which is the part before the apostrophe.
    //
    // Only when that head is itself a stopword: `don't` yields `don`, which is
    // not in the list and should not be, and `won't` yields `won`, a real
    // word. Both simply fall through and keep their own entry below.
    match word.split_once(['\'', '\u{2019}']) {
        Some((head, _)) if !head.is_empty() => STOPWORDS.binary_search(&head).is_ok(),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A contraction is one token, so `let's` has to be judged by `let`.
    /// Found on a real nine-line meeting whose topics came back as
    /// "staging · let's · i'll · push".
    #[test]
    fn a_contraction_is_a_stopword_when_the_word_it_is_built_from_is() {
        for word in ["let's", "i'll", "we'll", "we're", "that's", "it's", "there's", "you're"] {
            assert!(is_stopword(word), "{word} should be a stopword");
        }
        // The curly apostrophe a transcriber actually emits, not just ASCII.
        assert!(is_stopword("let\u{2019}s"));
    }

    /// And it must not swallow content words that merely contain one.
    #[test]
    fn a_contraction_whose_head_is_a_real_word_is_kept() {
        for word in ["won't", "shan't", "o'clock", "customer's", "team's"] {
            assert_eq!(
                is_stopword(word),
                super::STOPWORDS.binary_search(&word).is_ok(),
                "{word} should only be a stopword if it is listed outright",
            );
        }
    }

    /// The lookup is a binary search, so an unsorted list would silently miss
    /// entries rather than fail loudly.
    #[test]
    fn the_list_is_sorted_and_free_of_duplicates() {
        for pair in STOPWORDS.windows(2) {
            assert!(
                pair[0] < pair[1],
                "{:?} is not before {:?}",
                pair[0],
                pair[1]
            );
        }
    }

    #[test]
    fn grammar_is_filtered_and_meeting_vocabulary_is_not() {
        for word in ["the", "would", "actually", "yeah", "und", "que"] {
            assert!(is_stopword(word), "{word} should be filtered");
        }
        for word in [
            "budget",
            "hosting",
            "hiring",
            "migration",
            "cost",
            "team",
            "deadline",
        ] {
            assert!(!is_stopword(word), "{word} is a topic, not a stop word");
        }
    }
}
