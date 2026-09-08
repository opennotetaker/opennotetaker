//! Cutting a transcript into sentences and words, in any language Whisper
//! transcribes.
//!
//! Splitting on `.` handles English and breaks Chinese, Japanese, Thai,
//! Arabic and Greek in four different ways. Since the free summariser is
//! offered in all 99 languages, this module is the place that knows about
//! that, and everything above it works on already-split text.

use unicode_segmentation::UnicodeSegmentation;

/// A sentence, and where in the recording it was said.
#[derive(Debug, Clone, PartialEq)]
pub struct Sentence {
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub speaker: Option<String>,
    /// Which transcript segment it came from, so the interface can scroll to
    /// it when a summary line is clicked.
    pub segment: usize,
}

/// Terminators across the scripts a meeting is plausibly held in.
///
/// The CJK full-width forms are separate code points from their ASCII
/// counterparts, the Arabic question mark is a mirrored character that is not
/// `?`, and the Greek question mark looks like a semicolon. Each of these is a
/// sentence boundary that ASCII-only splitting silently misses, turning a
/// whole paragraph into one "sentence" that no summariser can rank usefully.
const TERMINATORS: &[char] = &[
    '.', '!', '?', // ASCII
    '。', '！', '？', '．', // CJK full-width
    '؟', '۔', // Arabic
    ';', // Greek question mark (U+037E)
    '।', '॥', // Devanagari danda
];

/// Split a transcript into sentences, interpolating each one's timing across
/// the segment it came from.
///
/// The interpolation is by character count, which is not exactly how long
/// something takes to say -- but the alternative is a word-level alignment the
/// quantised Whisper exports cannot produce, and the error is a fraction of a
/// segment. It is used to jump the player to a summary line, where being a
/// second early is unnoticeable.
pub fn sentences(transcript: &note_core::Transcript) -> Vec<Sentence> {
    let mut out = Vec::new();
    for (index, segment) in transcript.segments.iter().enumerate() {
        let pieces = split_sentences(&segment.text);
        let total: usize = pieces
            .iter()
            .map(|p| p.chars().count())
            .sum::<usize>()
            .max(1);
        let mut consumed = 0usize;
        let span = segment.duration_ms().max(1);
        for piece in pieces {
            let length = piece.chars().count();
            let start = segment.start_ms + span * consumed as i64 / total as i64;
            consumed += length;
            let end = segment.start_ms + span * consumed as i64 / total as i64;
            out.push(Sentence {
                text: piece,
                start_ms: start,
                end_ms: end.max(start + 1),
                speaker: segment.speaker.clone(),
                segment: index,
            });
        }
    }
    out
}

/// Sentence boundaries within one string.
pub fn split_sentences(text: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = text.chars().collect();
    for (i, &c) in chars.iter().enumerate() {
        current.push(c);
        if !TERMINATORS.contains(&c) {
            continue;
        }
        // Two things wear a full stop without ending a sentence, and both are
        // common in speech: a decimal point ("3.5 percent") and an
        // abbreviation ("Dr. Chen", "e.g."). Splitting on either produces a
        // fragment that then ranks as its own key point.
        if matches!(c, '.' | '!' | '?' | ';') {
            let next = chars.get(i + 1).copied();
            let glued = matches!(next, Some(n) if !n.is_whitespace() && !TERMINATORS.contains(&n));
            if glued || (c == '.' && ends_with_abbreviation(&current)) {
                continue;
            }
        }
        push_trimmed(&mut out, &mut current);
    }
    push_trimmed(&mut out, &mut current);
    out
}

/// Whether the text so far ends in something that takes a full stop without
/// ending a sentence.
///
/// A closed list rather than a heuristic. "Capitalised and short" would catch
/// "Dr." and also every sentence ending in a name, and the failure -- a name
/// welded to the following sentence -- is the more visible one.
fn ends_with_abbreviation(current: &str) -> bool {
    let word: String = current
        .trim_end_matches('.')
        .chars()
        .rev()
        .take_while(|c| c.is_alphabetic())
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    if word.is_empty() {
        return false;
    }
    // A single letter is an initial: "J. Smith", and in "e.g." each half
    // arrives here as one letter too.
    if word.chars().count() == 1 {
        return true;
    }
    const ABBREVIATIONS: &[&str] = &[
        "approx", "apr", "aug", "co", "corp", "dec", "dept", "dr", "eg", "esp", "est", "etc",
        "feb", "fig", "fri", "govt", "ie", "inc", "jan", "jul", "jun", "ltd", "mar", "may", "mon",
        "mr", "mrs", "ms", "mt", "no", "nov", "oct", "prof", "sat", "sep", "sept", "sr", "st",
        "sun", "thu", "tue", "vs", "wed",
    ];
    ABBREVIATIONS.contains(&word.to_lowercase().as_str())
}

fn push_trimmed(out: &mut Vec<String>, current: &mut String) {
    let trimmed = current.trim();
    if !trimmed.is_empty() {
        out.push(trimmed.to_string());
    }
    current.clear();
}

/// Lowercased word tokens. For spaceless scripts this returns the run as one
/// token, which the caller handles by also considering character n-grams.
pub fn words(text: &str) -> Vec<String> {
    text.unicode_words()
        .map(str::to_lowercase)
        .filter(|w| !w.is_empty())
        .collect()
}

/// True where a string is written in a script that does not put spaces
/// between words, so word-frequency counting has to fall back to n-grams.
pub fn is_spaceless(text: &str) -> bool {
    let mut cjk = 0usize;
    let mut total = 0usize;
    for c in text.chars().filter(|c| c.is_alphabetic()) {
        total += 1;
        if matches!(c as u32,
            0x3040..=0x30FF | 0x3400..=0x4DBF | 0x4E00..=0x9FFF | 0xF900..=0xFAFF | 0x0E00..=0x0E7F)
        {
            cjk += 1;
        }
    }
    total > 0 && cjk * 2 > total
}

#[cfg(test)]
mod tests {
    use super::*;
    use note_core::{Segment, Source, Transcript};

    #[test]
    fn english_splits_on_terminators_but_not_on_abbreviations_or_decimals() {
        let out = split_sentences("Dr. Chen said margin is 3.5 percent. We agreed! Did we?");
        assert_eq!(
            out,
            [
                "Dr. Chen said margin is 3.5 percent.",
                "We agreed!",
                "Did we?"
            ]
        );
    }

    /// ASCII-only splitting turns this whole line into one sentence, which
    /// then cannot be ranked or quoted.
    #[test]
    fn chinese_splits_on_its_own_full_width_punctuation() {
        let out = split_sentences("我们下周开始。预算已经批准了！还有问题吗？");
        assert_eq!(out.len(), 3, "{out:?}");
        assert_eq!(out[0], "我们下周开始。");
    }

    #[test]
    fn initials_and_common_abbreviations_do_not_split_a_sentence() {
        assert_eq!(
            split_sentences("J. R. Patel owns it. Next topic."),
            ["J. R. Patel owns it.", "Next topic."]
        );
        assert_eq!(
            split_sentences("Ship it by Fri. then review."),
            ["Ship it by Fri. then review."]
        );
        // A sentence that genuinely ends in a name must still split.
        assert_eq!(
            split_sentences("That was agreed by Chen. We move on."),
            ["That was agreed by Chen.", "We move on."]
        );
    }

    #[test]
    fn text_with_no_terminator_at_all_is_still_one_sentence() {
        assert_eq!(split_sentences("no full stop here"), ["no full stop here"]);
        assert!(split_sentences("   ").is_empty());
    }

    #[test]
    fn sentence_timings_are_interpolated_across_the_segment_they_came_from() {
        let transcript = Transcript::from_segments(
            Source::Recorded,
            vec![Segment::new(0, 4_000, "First half here. Second half here.").with_speaker("S0")],
        );
        let out = sentences(&transcript);
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].start_ms, 0);
        assert!(
            out[1].start_ms > 1_500 && out[1].start_ms < 2_500,
            "{out:?}"
        );
        assert_eq!(out[1].end_ms, 4_000);
        assert_eq!(out[1].speaker.as_deref(), Some("S0"));
        assert_eq!(out[1].segment, 0);
    }

    #[test]
    fn spaceless_scripts_are_recognised_and_latin_ones_are_not() {
        assert!(is_spaceless("预算审查"));
        assert!(is_spaceless("こんにちは"));
        assert!(!is_spaceless("budget review"));
        assert!(!is_spaceless(""));
        // A mostly-English line with one CJK word is not a CJK line.
        assert!(!is_spaceless("the 预算 review meeting"));
    }
}
