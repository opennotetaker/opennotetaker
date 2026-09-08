//! The transcript model, and the operations every surface performs on it.
//!
//! One type travels through the whole product: the recorder produces audio,
//! Whisper produces [`Segment`]s, the diarizer labels them, the editor moves
//! them about, the exporters render them and the paid routes summarise them.
//! Keeping that vocabulary in one crate is what stops "a segment" meaning
//! four slightly different things in four places.
//!
//! Two properties are load-bearing rather than incidental:
//!
//! - **Times are integer milliseconds, never floats.** A subtitle format
//!   writes hundredths or thousandths of a second, and accumulating float
//!   error across an hour of audio produces cues that drift visibly against
//!   the audio near the end. Integers cannot drift.
//! - **A transcript is always sorted and non-overlapping after
//!   [`Transcript::normalise`].** Every consumer -- export, diarization,
//!   search, the editor's click-to-seek -- assumes it, so exactly one place
//!   establishes it.

#![forbid(unsafe_code)]

pub mod redact;
pub mod search;
pub mod summary;
pub mod time;

use serde::{Deserialize, Serialize};
use thiserror::Error;

pub use redact::{redact, RedactionKind, RedactionReport, Redactor};
pub use search::{Hit, Index, Passage};
pub use summary::{ActionItem, Origin, Summary, SummaryStats};
pub use time::{format_clock, format_srt, format_vtt, parse_clock};

#[derive(Debug, Error, PartialEq, Eq)]
pub enum CoreError {
    #[error("a segment ends before it starts: {start_ms}..{end_ms}")]
    Backwards { start_ms: i64, end_ms: i64 },
    #[error("no segment covers {at_ms} ms")]
    NoSegmentAt { at_ms: i64 },
    #[error("cannot split a segment at its own boundary")]
    SplitAtBoundary,
}

/// One person, as far as the product can tell them apart.
///
/// `id` is stable and machine-assigned; `label` is what the user renamed
/// them to. They are separate fields because renaming "Speaker 2" to "Priya"
/// must not invalidate the diarizer's assignments, and because an export can
/// then show the friendly name while the data keeps the stable one.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Speaker {
    pub id: String,
    pub label: String,
    /// Set when the user has renamed this speaker, so the interface can tell
    /// "not yet identified" from "identified as Speaker 2".
    #[serde(default)]
    pub named: bool,
}

impl Speaker {
    /// The nth speaker the diarizer found, before anybody names them.
    pub fn nth(index: usize) -> Self {
        Self {
            id: format!("S{index}"),
            label: format!("Speaker {}", index + 1),
            named: false,
        }
    }

    pub fn rename(&mut self, label: impl Into<String>) {
        let label = label.into();
        self.named = !label.trim().is_empty();
        self.label = label;
    }
}

/// One utterance: a span of time with words in it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Segment {
    pub start_ms: i64,
    pub end_ms: i64,
    pub text: String,
    /// A [`Speaker::id`], or `None` before diarization has run (or where it
    /// declined to guess).
    #[serde(default)]
    pub speaker: Option<String>,
    /// The model's own confidence, 0.0..=1.0, where it reports one. Shown as
    /// a hint in the editor so a user knows which lines to check, never used
    /// to silently drop text.
    #[serde(default)]
    pub confidence: Option<f32>,
    /// True once a human has edited this line. Export and the paid summariser
    /// both prefer edited text, and the editor marks it so a re-run of
    /// transcription does not quietly discard corrections.
    #[serde(default)]
    pub edited: bool,
}

impl Segment {
    pub fn new(start_ms: i64, end_ms: i64, text: impl Into<String>) -> Self {
        Self {
            start_ms,
            end_ms,
            text: text.into(),
            speaker: None,
            confidence: None,
            edited: false,
        }
    }

    pub fn with_speaker(mut self, speaker: impl Into<String>) -> Self {
        self.speaker = Some(speaker.into());
        self
    }

    pub fn duration_ms(&self) -> i64 {
        (self.end_ms - self.start_ms).max(0)
    }

    pub fn contains(&self, at_ms: i64) -> bool {
        at_ms >= self.start_ms && at_ms < self.end_ms
    }

    /// Overlap with another span, in milliseconds. Zero when they are
    /// disjoint. Used by diarization to attribute a speaker turn to the
    /// transcript lines it actually covers.
    pub fn overlap_ms(&self, start_ms: i64, end_ms: i64) -> i64 {
        (self.end_ms.min(end_ms) - self.start_ms.max(start_ms)).max(0)
    }
}

/// Where a transcript came from. Kept because the consent record and the
/// privacy centre both need to say what was recorded, and "a file you
/// imported" and "a meeting you recorded" carry different obligations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Source {
    /// Recorded here, in this tab, with consent captured.
    Recorded,
    /// A file the user already had.
    Imported,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Transcript {
    /// BCP-47-ish, as Whisper reports it. `None` when detection was skipped.
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub segments: Vec<Segment>,
    #[serde(default)]
    pub speakers: Vec<Speaker>,
    #[serde(default)]
    pub duration_ms: i64,
    pub source: Source,
}

impl Transcript {
    pub fn new(source: Source) -> Self {
        Self {
            language: None,
            segments: Vec::new(),
            speakers: Vec::new(),
            duration_ms: 0,
            source,
        }
    }

    pub fn from_segments(source: Source, segments: Vec<Segment>) -> Self {
        let mut transcript = Self {
            language: None,
            segments,
            speakers: Vec::new(),
            duration_ms: 0,
            source,
        };
        transcript.normalise();
        transcript
    }

    /// Establish the invariant everything downstream relies on: segments
    /// sorted by start, no backwards spans, no overlaps, no empty text.
    ///
    /// Whisper's windowed decoding genuinely does emit an occasional cue that
    /// starts before its predecessor ends, and a human editing timings can
    /// produce worse. Clamping here -- rather than defending against it in
    /// six consumers -- is why the exporters can be as simple as they are.
    pub fn normalise(&mut self) {
        self.segments.retain(|s| !s.text.trim().is_empty());
        self.segments
            .sort_by(|a, b| a.start_ms.cmp(&b.start_ms).then(a.end_ms.cmp(&b.end_ms)));

        let mut previous_end = i64::MIN;
        for segment in &mut self.segments {
            segment.text = segment.text.trim().to_string();
            if segment.start_ms < 0 {
                segment.start_ms = 0;
            }
            if segment.start_ms < previous_end {
                segment.start_ms = previous_end;
            }
            // A cue that has been clamped past its own end would render as a
            // zero- or negative-length subtitle, which players hide entirely.
            // Give it a minimum readable span instead of dropping the words.
            if segment.end_ms <= segment.start_ms {
                segment.end_ms = segment.start_ms + MIN_SEGMENT_MS;
            }
            previous_end = segment.end_ms;
        }

        self.duration_ms = self
            .duration_ms
            .max(self.segments.last().map_or(0, |s| s.end_ms));
        self.sync_speakers();
    }

    /// Ensure every speaker id referenced by a segment has a [`Speaker`] row,
    /// and drop rows nothing references any more.
    ///
    /// Called after normalisation and after any edit that reassigns speakers,
    /// so the legend in the interface can never list a speaker with no lines,
    /// nor omit one that has them.
    pub fn sync_speakers(&mut self) {
        let mut order: Vec<String> = Vec::new();
        for segment in &self.segments {
            if let Some(id) = &segment.speaker {
                if !order.iter().any(|s| s == id) {
                    order.push(id.clone());
                }
            }
        }
        // Renames survive: an existing row is kept as-is, only its position
        // changes, so naming someone and then re-running diarization does not
        // discard the name.
        let mut rebuilt = Vec::with_capacity(order.len());
        for (index, id) in order.iter().enumerate() {
            match self.speakers.iter().find(|s| &s.id == id) {
                Some(existing) => rebuilt.push(existing.clone()),
                None => {
                    let mut speaker = Speaker::nth(index);
                    speaker.id = id.clone();
                    rebuilt.push(speaker);
                }
            }
        }
        self.speakers = rebuilt;
    }

    pub fn is_empty(&self) -> bool {
        self.segments.is_empty()
    }

    pub fn label_for(&self, speaker_id: &str) -> Option<&str> {
        self.speakers
            .iter()
            .find(|s| s.id == speaker_id)
            .map(|s| s.label.as_str())
    }

    /// The whole transcript as running text, one line per segment.
    pub fn plain_text(&self) -> String {
        self.segments
            .iter()
            .map(|s| s.text.as_str())
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Running text with speaker attribution, which is what the summariser
    /// wants: "who said what" changes the summary, and a model given
    /// unattributed text invents attributions.
    pub fn attributed_text(&self) -> String {
        let mut out = String::new();
        let mut last: Option<&str> = None;
        for segment in &self.segments {
            let label = segment
                .speaker
                .as_deref()
                .and_then(|id| self.label_for(id))
                .unwrap_or("Unknown");
            if last != Some(label) {
                if !out.is_empty() {
                    out.push('\n');
                }
                out.push_str(label);
                out.push_str(":\n");
                last = Some(label);
            }
            out.push_str(&segment.text);
            out.push('\n');
        }
        out
    }

    /// The index of the segment playing at `at_ms`, for click-to-seek and for
    /// following along during playback.
    ///
    /// Returns the nearest preceding segment when `at_ms` falls in a silence,
    /// because a highlight that blinks off between every sentence reads as a
    /// bug rather than as accuracy.
    pub fn segment_at(&self, at_ms: i64) -> Option<usize> {
        if self.segments.is_empty() {
            return None;
        }
        match self.segments.binary_search_by(|s| {
            if s.end_ms <= at_ms {
                std::cmp::Ordering::Less
            } else if s.start_ms > at_ms {
                std::cmp::Ordering::Greater
            } else {
                std::cmp::Ordering::Equal
            }
        }) {
            Ok(index) => Some(index),
            // Between two segments: the one before, unless we are before the
            // first segment starts, where there is nothing to highlight.
            Err(0) => None,
            Err(index) => Some(index - 1),
        }
    }

    /// How long each speaker held the floor, most talkative first.
    ///
    /// This is the "who dominated the meeting" number, and it is computed
    /// locally from data we already have -- a small thing that competitors
    /// with an equivalent put behind an account.
    pub fn talk_time(&self) -> Vec<(String, i64)> {
        let mut totals: Vec<(String, i64)> = Vec::new();
        for segment in &self.segments {
            let Some(id) = &segment.speaker else { continue };
            match totals.iter_mut().find(|(s, _)| s == id) {
                Some((_, total)) => *total += segment.duration_ms(),
                None => totals.push((id.clone(), segment.duration_ms())),
            }
        }
        totals.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
        totals
    }

    /// Fold consecutive segments by the same speaker into one, where doing so
    /// does not produce a cue too long to read.
    ///
    /// Whisper cuts on its own 30-second window and on pauses, not on turns,
    /// so a single sentence often arrives as three cues. For a *document*
    /// export that reads badly; for a *subtitle* export merging would be
    /// wrong. Hence a method, called by the document exporters only.
    pub fn merged_by_speaker(&self, max_gap_ms: i64, max_span_ms: i64) -> Vec<Segment> {
        let mut out: Vec<Segment> = Vec::new();
        for segment in &self.segments {
            match out.last_mut() {
                Some(previous)
                    if previous.speaker == segment.speaker
                        && segment.start_ms - previous.end_ms <= max_gap_ms
                        && segment.end_ms - previous.start_ms <= max_span_ms =>
                {
                    previous.text.push(' ');
                    previous.text.push_str(&segment.text);
                    previous.end_ms = segment.end_ms;
                    previous.edited |= segment.edited;
                }
                _ => out.push(segment.clone()),
            }
        }
        out
    }

    /// Split the segment covering `at_ms` in two, apportioning the words by
    /// where the cut falls.
    ///
    /// The editor needs this when the diarizer put a speaker change in the
    /// middle of a cue -- which it will, because Whisper's boundaries are
    /// acoustic and a turn boundary is conversational.
    pub fn split_at(&mut self, at_ms: i64) -> Result<usize, CoreError> {
        let index = self
            .segments
            .iter()
            .position(|s| s.contains(at_ms))
            .ok_or(CoreError::NoSegmentAt { at_ms })?;
        let segment = &self.segments[index];
        if at_ms <= segment.start_ms || at_ms >= segment.end_ms {
            return Err(CoreError::SplitAtBoundary);
        }

        let fraction = (at_ms - segment.start_ms) as f64 / segment.duration_ms().max(1) as f64;
        let words: Vec<String> = segment
            .text
            .split_whitespace()
            .map(str::to_string)
            .collect();
        // At least one word each side: a cue with no text is dropped by
        // `normalise`, which would silently lose the split the user asked for.
        let cut =
            ((words.len() as f64 * fraction).round() as usize).clamp(1, words.len().max(2) - 1);

        let (head, tail) = words.split_at(cut.min(words.len()));
        let mut second = segment.clone();
        second.start_ms = at_ms;
        second.text = tail.join(" ");

        let first = &mut self.segments[index];
        first.end_ms = at_ms;
        first.text = head.join(" ");

        self.segments.insert(index + 1, second);
        Ok(index + 1)
    }

    /// Everything between two times, with the clock rebased to zero.
    ///
    /// This is the free half of "clips" (§5.2 剪辑分享): the excerpt's
    /// transcript. The audio half is a `MediaRecorder` range in the browser.
    /// Both are local, so both are free.
    pub fn excerpt(&self, from_ms: i64, to_ms: i64) -> Transcript {
        let (from_ms, to_ms) = (from_ms.min(to_ms), from_ms.max(to_ms));
        let segments: Vec<Segment> = self
            .segments
            .iter()
            .filter(|s| s.overlap_ms(from_ms, to_ms) > 0)
            .map(|s| {
                let mut clipped = s.clone();
                clipped.start_ms = s.start_ms.max(from_ms) - from_ms;
                clipped.end_ms = s.end_ms.min(to_ms) - from_ms;
                clipped
            })
            .collect();
        let mut excerpt = Transcript {
            language: self.language.clone(),
            segments,
            speakers: self.speakers.clone(),
            duration_ms: to_ms - from_ms,
            source: self.source,
        };
        excerpt.normalise();
        excerpt
    }
}

/// The shortest cue we will emit rather than drop. Below roughly this, a
/// subtitle is on screen for less time than it takes to notice.
const MIN_SEGMENT_MS: i64 = 200;

#[cfg(test)]
mod tests {
    use super::*;

    fn transcript() -> Transcript {
        Transcript::from_segments(
            Source::Recorded,
            vec![
                Segment::new(0, 2_000, "Morning everyone.").with_speaker("S0"),
                Segment::new(2_000, 5_500, "Shall we start with the budget?").with_speaker("S0"),
                Segment::new(5_500, 9_000, "Yes, I have the numbers here.").with_speaker("S1"),
                Segment::new(9_000, 12_000, "Great, go ahead.").with_speaker("S0"),
            ],
        )
    }

    #[test]
    fn normalising_sorts_clamps_overlaps_and_drops_empty_cues() {
        let mut t = Transcript::from_segments(
            Source::Imported,
            vec![
                Segment::new(5_000, 7_000, "second"),
                Segment::new(0, 6_000, "first"),
                Segment::new(8_000, 9_000, "   "),
            ],
        );
        t.normalise();
        assert_eq!(t.segments.len(), 2, "the blank cue should be gone");
        assert_eq!(t.segments[0].text, "first");
        assert_eq!(
            t.segments[1].start_ms, 6_000,
            "the overlap should be clamped, not left to the exporter"
        );
        assert!(t.segments[1].start_ms < t.segments[1].end_ms);
    }

    /// A cue clamped past its own end must keep its words. Dropping it would
    /// lose transcript silently, which is worse than a slightly wrong timing.
    #[test]
    fn a_fully_swallowed_cue_keeps_its_words() {
        let mut t = Transcript::from_segments(
            Source::Imported,
            vec![
                Segment::new(0, 10_000, "long one"),
                Segment::new(1_000, 2_000, "swallowed"),
            ],
        );
        t.normalise();
        assert_eq!(t.segments.len(), 2);
        assert_eq!(t.segments[1].text, "swallowed");
        assert!(t.segments[1].end_ms > t.segments[1].start_ms);
    }

    #[test]
    fn speakers_are_derived_from_the_segments_that_reference_them() {
        let t = transcript();
        assert_eq!(t.speakers.len(), 2);
        assert_eq!(t.speakers[0].id, "S0");
        assert_eq!(t.speakers[0].label, "Speaker 1");
        assert!(!t.speakers[0].named);
    }

    #[test]
    fn renaming_a_speaker_survives_a_later_resync() {
        let mut t = transcript();
        t.speakers[1].rename("Priya");
        t.sync_speakers();
        assert_eq!(t.label_for("S1"), Some("Priya"));
        assert!(t.speakers[1].named);
    }

    #[test]
    fn a_speaker_with_no_remaining_lines_leaves_the_legend() {
        let mut t = transcript();
        for segment in &mut t.segments {
            segment.speaker = Some("S0".into());
        }
        t.sync_speakers();
        assert_eq!(t.speakers.len(), 1);
    }

    #[test]
    fn segment_at_finds_the_line_playing_and_holds_it_through_silence() {
        let mut t = transcript();
        t.segments[2].start_ms = 6_000; // a 500 ms gap after segment 1
        assert_eq!(t.segment_at(1_000), Some(0));
        assert_eq!(
            t.segment_at(5_700),
            Some(1),
            "a gap should hold the previous line"
        );
        assert_eq!(t.segment_at(6_500), Some(2));
        assert_eq!(t.segment_at(-1), None);
    }

    #[test]
    fn talk_time_ranks_speakers_by_how_long_they_held_the_floor() {
        let totals = transcript().talk_time();
        assert_eq!(totals[0], ("S0".to_string(), 8_500));
        assert_eq!(totals[1], ("S1".to_string(), 3_500));
    }

    #[test]
    fn merging_folds_a_speakers_run_but_respects_the_span_limit() {
        let merged = transcript().merged_by_speaker(1_000, 60_000);
        assert_eq!(merged.len(), 3, "S0's first two lines should become one");
        assert_eq!(
            merged[0].text,
            "Morning everyone. Shall we start with the budget?"
        );

        let unmerged = transcript().merged_by_speaker(1_000, 3_000);
        assert_eq!(
            unmerged.len(),
            4,
            "a span limit shorter than the pair blocks the merge"
        );
    }

    #[test]
    fn splitting_apportions_the_words_by_where_the_cut_falls() {
        let mut t = transcript();
        let index = t.split_at(3_750).unwrap();
        assert_eq!(index, 2);
        assert_eq!(t.segments[1].text, "Shall we start");
        assert_eq!(t.segments[2].text, "with the budget?");
        assert_eq!(t.segments[1].end_ms, 3_750);
        assert_eq!(t.segments[2].start_ms, 3_750);
    }

    #[test]
    fn splitting_never_produces_an_empty_side() {
        let mut t =
            Transcript::from_segments(Source::Imported, vec![Segment::new(0, 4_000, "one two")]);
        t.split_at(10).unwrap();
        assert!(t.segments.iter().all(|s| !s.text.trim().is_empty()));
    }

    #[test]
    fn splitting_off_a_boundary_or_off_the_transcript_is_refused() {
        let mut t = transcript();
        assert_eq!(t.split_at(2_000), Err(CoreError::SplitAtBoundary));
        assert_eq!(
            t.split_at(90_000),
            Err(CoreError::NoSegmentAt { at_ms: 90_000 })
        );
    }

    #[test]
    fn an_excerpt_rebases_the_clock_and_keeps_only_what_overlaps() {
        let clip = transcript().excerpt(5_500, 9_000);
        assert_eq!(clip.segments.len(), 1);
        assert_eq!(clip.segments[0].start_ms, 0);
        assert_eq!(clip.segments[0].end_ms, 3_500);
        assert_eq!(clip.segments[0].text, "Yes, I have the numbers here.");
        assert_eq!(clip.duration_ms, 3_500);
    }

    #[test]
    fn attributed_text_names_a_speaker_once_per_turn_not_once_per_line() {
        let mut t = transcript();
        t.speakers[0].rename("Ana");
        let text = t.attributed_text();
        assert_eq!(text.matches("Ana:").count(), 2, "two turns, two headings");
        assert!(text.contains("Speaker 2:"));
    }

    #[test]
    fn a_transcript_round_trips_through_json() {
        let t = transcript();
        let json = serde_json::to_string(&t).unwrap();
        assert_eq!(serde_json::from_str::<Transcript>(&json).unwrap(), t);
    }
}
