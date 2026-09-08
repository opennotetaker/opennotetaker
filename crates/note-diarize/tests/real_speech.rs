//! The diarizer, checked against speech instead of against a synthesiser.
//!
//! # Why these files are in the repository
//!
//! The unit tests in `src/lib.rs` run on a formant synthesiser, and they were
//! all green while one person talking for a minute came back as **four
//! speakers**. They could not have caught it: a synthesiser holding a vowel
//! produces frames that are nearly identical to each other, so a segment's
//! within-segment spread is ~0 -- and the whole question a diarizer answers is
//! whether the difference *between* two segments is large next to the spread
//! *within* them. Audio with no spread cannot pose that question.
//!
//! So the calibration lives here, on real recorded speech, and the constants
//! in `Options::default` are the ones these files agree on. They are macOS
//! `say` voices rather than microphone recordings of real people, which keeps
//! them regenerable and free of anyone's voice. What matters is that they are
//! speech: articulated, moving, with the within-segment variance that implies.
//!
//! Regenerate with `bash tests/fixtures/make-fixtures.sh` (needs macOS `say`
//! and ffmpeg).

use note_core::{Segment, Source, Transcript};
use note_diarize::{diarize, Options, SpeakerCount};

/// Canonical 16-bit PCM WAV, which is all these fixtures are.
///
/// Hand-rolled rather than a dependency: the crate ships to wasm and has no
/// runtime dependencies at all, and adding one for four header fields in a
/// test would be the tail wagging the dog.
fn read_wav(path: &str) -> Vec<f32> {
    let bytes = std::fs::read(path).unwrap_or_else(|e| panic!("{path}: {e}"));
    assert_eq!(&bytes[0..4], b"RIFF", "{path} is not a RIFF file");
    assert_eq!(&bytes[8..12], b"WAVE", "{path} is not a WAVE file");

    let mut at = 12;
    let mut channels = 0usize;
    let mut rate = 0u32;
    while at + 8 <= bytes.len() {
        let id = &bytes[at..at + 4];
        let size = u32::from_le_bytes([bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]])
            as usize;
        let body = at + 8;
        if id == b"fmt " {
            channels = u16::from_le_bytes([bytes[body + 2], bytes[body + 3]]) as usize;
            rate = u32::from_le_bytes([
                bytes[body + 4],
                bytes[body + 5],
                bytes[body + 6],
                bytes[body + 7],
            ]);
            let bits = u16::from_le_bytes([bytes[body + 14], bytes[body + 15]]);
            assert_eq!(bits, 16, "{path} is not 16-bit");
        } else if id == b"data" {
            assert_eq!(channels, 1, "{path} is not mono");
            assert_eq!(rate, 16_000, "{path} is not 16 kHz");
            return bytes[body..(body + size).min(bytes.len())]
                .as_chunks::<2>()
                .0
                .iter()
                .map(|c| i16::from_le_bytes(*c) as f32 / 32_768.0)
                .collect();
        }
        // Chunks are word-aligned; an odd size is followed by a pad byte.
        at = body + size + (size & 1);
    }
    panic!("{path} has no data chunk");
}

/// Cut the audio into lines the way a transcriber does: on the pauses, and
/// never letting one line run past a few seconds.
///
/// The diarizer is only ever handed a transcript someone else segmented, so a
/// test that fed it one segment per speaker would be testing an input it never
/// receives -- and over-splitting is precisely a failure to hold a *sequence*
/// of a speaker's lines together.
fn segment_like_a_transcriber(samples: &[f32]) -> Transcript {
    const PAUSE_FRAMES: usize = 12; // 120 ms
    const MAX_FRAMES: usize = 600; // 6 s

    let analyser = note_diarize::Analyser::new();
    let mut frames = analyser.analyse(samples);
    note_diarize::mfcc::normalise(&mut frames);
    let voiced = note_diarize::vad::voiced_mask(&frames);

    let mut segments: Vec<Segment> = Vec::new();
    let push = |segments: &mut Vec<Segment>, from: usize, to: usize| {
        if to > from {
            let n = segments.len();
            segments.push(Segment::new(from as i64 * 10, to as i64 * 10, format!("line {n}")));
        }
    };

    let mut start: Option<usize> = None;
    let mut silence = 0usize;
    for (i, &v) in voiced.iter().enumerate() {
        if v {
            silence = 0;
            start.get_or_insert(i);
            if let Some(s) = start {
                if i - s >= MAX_FRAMES {
                    push(&mut segments, s, i);
                    start = Some(i);
                }
            }
        } else if let Some(s) = start {
            silence += 1;
            if silence >= PAUSE_FRAMES {
                push(&mut segments, s, i - silence);
                start = None;
            }
        }
    }
    if let Some(s) = start {
        push(&mut segments, s, voiced.len());
    }
    Transcript::from_segments(Source::Recorded, segments)
}

fn run(fixture: &str, options: &Options) -> (usize, Vec<String>) {
    let samples = read_wav(&format!("{}/tests/fixtures/{fixture}", env!("CARGO_MANIFEST_DIR")));
    let mut transcript = segment_like_a_transcriber(&samples);
    assert!(
        transcript.segments.len() >= 4,
        "{fixture} produced only {} lines; the fixture or the segmenter is wrong",
        transcript.segments.len()
    );
    let report = diarize(&mut transcript, &samples, options);
    let labels = transcript
        .segments
        .iter()
        .map(|s| s.speaker.clone().unwrap_or_else(|| "-".into()))
        .collect();
    (report.speakers, labels)
}

/// The failure this fixture exists for. One person, sixteen seconds, and the
/// automatic mode used to answer "four".
#[test]
fn one_person_talking_is_one_speaker() {
    let (speakers, labels) = run("one-speaker.wav", &Options::default());
    assert_eq!(speakers, 1, "a monologue was split: {labels:?}");
}

#[test]
fn two_people_are_told_apart_without_being_counted_first() {
    let (speakers, labels) = run("two-speakers.wav", &Options::default());
    assert_eq!(speakers, 2, "{labels:?}");

    // Samantha, Daniel, Samantha: the first and last turns are one person and
    // the middle one is not, so whatever the labels are called, the shape has
    // to come back.
    assert_eq!(labels.first(), labels.last(), "the same voice got two speakers: {labels:?}");
    assert!(
        labels.iter().any(|l| Some(l) != labels.first()),
        "two voices got one speaker: {labels:?}"
    );
}

#[test]
fn three_people_are_not_merged_down_to_two() {
    let (speakers, labels) = run("three-speakers.wav", &Options::default());
    assert_eq!(speakers, 3, "{labels:?}");
}

/// The user's correction has to win, in both directions: this is the control
/// offered next to the result precisely because the automatic answer can be
/// wrong on a recording nobody has tested against.
#[test]
fn a_count_the_user_supplies_overrides_the_automatic_one() {
    for k in [1usize, 2, 4] {
        let (speakers, labels) = run(
            "three-speakers.wav",
            &Options { speakers: SpeakerCount::Exactly(k), ..Default::default() },
        );
        assert_eq!(speakers, k, "asked for {k}: {labels:?}");
    }
}
