//! Take the obvious secrets out of a transcript before it goes anywhere.
//!
//! This exists because of one specific moment. The free features never leave
//! the tab, so nothing needs redacting for them. But the *paid* features send
//! text to a model vendor, and a meeting transcript is exactly the kind of
//! document that has somebody reading a phone number or a card number out
//! loud in the middle of it. Offering "summarise this" with no way to strip
//! that first would be selling a privacy-first product that quietly does the
//! opposite at the only moment it matters.
//!
//! So: a pass the user can leave on, that runs *before* the request is built,
//! and reports what it found so the redaction is visible rather than
//! mysterious.
//!
//! # What this is not
//!
//! It is not a DLP product and it does not claim recall. Hand-written scanners
//! catch well-formed patterns and miss the rest, and a transcript is
//! *speech* -- "four one one one, space, one one one one" defeats every
//! pattern here. The interface says so in those words. The honest framing is
//! "this catches the obvious ones"; a product that implied completeness would
//! be making the same kind of promise this whole app exists to avoid.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RedactionKind {
    Email,
    Phone,
    /// A long run of digits: card numbers, account numbers, IBANs read out.
    LongNumber,
    Url,
}

impl RedactionKind {
    /// What replaces the text. Named rather than blanked, so a reader (and
    /// the model) can still tell that *an email address* was said there --
    /// which is often the whole point of the sentence.
    pub fn placeholder(self) -> &'static str {
        match self {
            Self::Email => "[email]",
            Self::Phone => "[phone number]",
            Self::LongNumber => "[number]",
            Self::Url => "[link]",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Email => "email addresses",
            Self::Phone => "phone numbers",
            Self::LongNumber => "long numbers",
            Self::Url => "links",
        }
    }

    pub const ALL: [Self; 4] = [Self::Email, Self::Phone, Self::LongNumber, Self::Url];
}

/// Which kinds to strip. All on by default: a user who turned on redaction
/// asked for redaction.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Redactor {
    pub kinds: Vec<RedactionKind>,
}

impl Default for Redactor {
    fn default() -> Self {
        Self {
            kinds: RedactionKind::ALL.to_vec(),
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct RedactionReport {
    pub counts: Vec<(RedactionKind, usize)>,
}

impl RedactionReport {
    pub fn total(&self) -> usize {
        self.counts.iter().map(|(_, n)| n).sum()
    }

    pub fn is_empty(&self) -> bool {
        self.total() == 0
    }

    fn record(&mut self, kind: RedactionKind) {
        match self.counts.iter_mut().find(|(k, _)| *k == kind) {
            Some((_, count)) => *count += 1,
            None => self.counts.push((kind, 1)),
        }
    }
}

/// Redact `text`, returning the cleaned text and what was taken out.
///
/// Hand-written rather than regex-driven: a regex crate is 1.5 MB of wasm for
/// four patterns, and this ships to a browser.
pub fn redact(text: &str, redactor: &Redactor) -> (String, RedactionReport) {
    let mut report = RedactionReport::default();
    let mut out = String::with_capacity(text.len());
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        // Order matters. A URL may contain digits that look like a long
        // number, and an email contains an @ inside what could be read as a
        // URL host, so the most specific pattern is tried first.
        if let Some(end) = redactor
            .kinds
            .contains(&RedactionKind::Url)
            .then(|| scan_url(&chars, i))
            .flatten()
        {
            out.push_str(RedactionKind::Url.placeholder());
            report.record(RedactionKind::Url);
            i = end;
        } else if let Some((start, end)) = redactor
            .kinds
            .contains(&RedactionKind::Email)
            .then(|| scan_email(&chars, i))
            .flatten()
        {
            // An email starts before the cursor: the local part was already
            // emitted, so unwind it.
            out.truncate(
                out.char_indices()
                    .nth(out.chars().count() - (i - start))
                    .map_or(0, |(b, _)| b),
            );
            out.push_str(RedactionKind::Email.placeholder());
            report.record(RedactionKind::Email);
            i = end;
        } else if let Some((kind, end)) = scan_number(&chars, i, redactor) {
            out.push_str(kind.placeholder());
            report.record(kind);
            i = end;
        } else {
            out.push(chars[i]);
            i += 1;
        }
    }

    (out, report)
}

/// Redact every segment of a transcript, in place.
pub fn redact_transcript(
    transcript: &crate::Transcript,
    redactor: &Redactor,
) -> (crate::Transcript, RedactionReport) {
    let mut cleaned = transcript.clone();
    let mut report = RedactionReport::default();
    for segment in &mut cleaned.segments {
        let (text, found) = redact(&segment.text, redactor);
        segment.text = text;
        for (kind, count) in found.counts {
            for _ in 0..count {
                report.record(kind);
            }
        }
    }
    (cleaned, report)
}

fn scan_url(chars: &[char], start: usize) -> Option<usize> {
    for prefix in ["https://", "http://", "www."] {
        let prefix: Vec<char> = prefix.chars().collect();
        if chars.len() >= start + prefix.len()
            && chars[start..start + prefix.len()]
                .iter()
                .map(|c| c.to_ascii_lowercase())
                .eq(prefix.iter().copied())
        {
            let mut end = start + prefix.len();
            while end < chars.len() && !chars[end].is_whitespace() {
                end += 1;
            }
            // Trailing sentence punctuation belongs to the sentence, not the
            // URL; swallowing it turns "see www.x.com." into "[link]" with the
            // full stop gone.
            while end > start && matches!(chars[end - 1], '.' | ',' | ')' | ';' | ':' | '!' | '?') {
                end -= 1;
            }
            return Some(end);
        }
    }
    None
}

/// Find an email whose `@` is at or after `at`, returning its full span.
fn scan_email(chars: &[char], at: usize) -> Option<(usize, usize)> {
    if chars[at] != '@' {
        return None;
    }
    let mut start = at;
    while start > 0 && is_local_part(chars[start - 1]) {
        start -= 1;
    }
    if start == at {
        return None;
    }

    let mut end = at + 1;
    let mut dots = 0;
    while end < chars.len()
        && (chars[end].is_ascii_alphanumeric() || chars[end] == '.' || chars[end] == '-')
    {
        if chars[end] == '.' {
            dots += 1;
        }
        end += 1;
    }
    // A domain needs a dot and a TLD after it; "@here" in a chat log is not
    // an address.
    while end > at && chars[end - 1] == '.' {
        end -= 1;
        dots -= 1;
    }
    (dots > 0 && end > at + 2).then_some((start, end))
}

fn is_local_part(c: char) -> bool {
    c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '%' | '+' | '-')
}

/// A run of digits, possibly with separators, long enough to be worth hiding.
///
/// Phone numbers and card numbers are told apart by length, which is crude but
/// matches how they are read aloud, and both end up redacted either way -- the
/// distinction only affects which placeholder appears.
fn scan_number(
    chars: &[char],
    start: usize,
    redactor: &Redactor,
) -> Option<(RedactionKind, usize)> {
    if !chars[start].is_ascii_digit() && chars[start] != '+' {
        return None;
    }
    // Only at a boundary: otherwise "v2" in "meeting v2 room 3105" starts a
    // scan mid-token and the surrounding word is mangled.
    if start > 0 && (chars[start - 1].is_alphanumeric() || chars[start - 1] == '.') {
        return None;
    }

    let mut end = start;
    let mut digits = 0;
    while end < chars.len() {
        let c = chars[end];
        if c.is_ascii_digit() {
            digits += 1;
            end += 1;
        } else if matches!(c, ' ' | '-' | '(' | ')' | '+')
            && digits > 0
            && end + 1 < chars.len()
            && chars[end + 1].is_ascii_digit()
        {
            end += 1;
        } else {
            break;
        }
    }

    let kind = match digits {
        // Under seven digits is a year, a room number, a count -- redacting
        // those would make a summary useless while protecting nothing.
        0..=6 => return None,
        // E.164 allows fifteen digits including the country code, so the
        // phone band has to run that far. The band above it is where card and
        // account numbers live. The boundary is genuinely ambiguous in the
        // middle, and it does not matter much: both are redacted either way
        // and only the placeholder differs.
        7..=15 => RedactionKind::Phone,
        _ => RedactionKind::LongNumber,
    };
    redactor.kinds.contains(&kind).then_some((kind, end))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn clean(text: &str) -> (String, RedactionReport) {
        redact(text, &Redactor::default())
    }

    #[test]
    fn an_email_is_replaced_whole_including_its_local_part() {
        let (text, report) = clean("Send it to ana.lopez+work@example.com today.");
        assert_eq!(text, "Send it to [email] today.");
        assert_eq!(report.total(), 1);
        assert_eq!(report.counts[0].0, RedactionKind::Email);
    }

    #[test]
    fn a_card_number_read_out_with_spaces_is_still_caught() {
        let (text, _) = clean("The card is 4111 1111 1111 1111 by the way.");
        assert_eq!(text, "The card is [number] by the way.");
    }

    #[test]
    fn a_phone_number_is_told_from_a_card_by_its_length() {
        let (_, report) = clean("Call +44 20 7946 0958 later.");
        assert_eq!(report.counts[0].0, RedactionKind::Phone);
    }

    /// The failure that would make this feature worse than useless: stripping
    /// the numbers a summary is *about*.
    #[test]
    fn ordinary_numbers_in_a_meeting_survive() {
        let (text, report) = clean("We shipped 42 tickets in Q3 2026, up 15% from 2025.");
        assert_eq!(text, "We shipped 42 tickets in Q3 2026, up 15% from 2025.");
        assert!(report.is_empty());
    }

    #[test]
    fn a_link_loses_its_target_but_not_the_full_stop_after_it() {
        let (text, _) = clean("Notes are at https://wiki.example.com/q3-plan.");
        assert_eq!(text, "Notes are at [link].");
    }

    #[test]
    fn at_here_is_not_an_email_address() {
        let (text, report) = clean("I will @here the team.");
        assert_eq!(text, "I will @here the team.");
        assert!(report.is_empty());
    }

    #[test]
    fn turning_a_kind_off_leaves_it_alone() {
        let only_email = Redactor {
            kinds: vec![RedactionKind::Email],
        };
        let (text, _) = redact("a@b.com and 4111 1111 1111 1111", &only_email);
        assert_eq!(text, "[email] and 4111 1111 1111 1111");
    }

    #[test]
    fn redacting_a_transcript_reports_the_total_across_every_line() {
        let transcript = crate::Transcript::from_segments(
            crate::Source::Recorded,
            vec![
                crate::Segment::new(0, 1_000, "Mail me at a@b.com"),
                crate::Segment::new(1_000, 2_000, "or c@d.org, either way"),
            ],
        );
        let (cleaned, report) = redact_transcript(&transcript, &Redactor::default());
        assert_eq!(report.total(), 2);
        assert!(cleaned.segments.iter().all(|s| !s.text.contains('@')));
    }

    #[test]
    fn nothing_to_redact_returns_the_text_unchanged() {
        let (text, report) = clean("Just an ordinary sentence.");
        assert_eq!(text, "Just an ordinary sentence.");
        assert!(report.is_empty());
    }
}
