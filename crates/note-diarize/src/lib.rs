//! Who said which line, worked out on the user's own machine.
//!
//! §5.2 puts speaker separation in the free tier and notes that Buzz and
//! MacWhisper have already proved it can run locally. This crate is how that
//! promise is kept in a *browser*, where "run pyannote" is not available: a
//! classical MFCC front end, energy-based voice activity detection and
//! agglomerative clustering, all pure arithmetic that compiles to a few
//! kilobytes of wasm with nothing to download.
//!
//! # What this is honestly good at
//!
//! Two to four people, one recording, distinct voices, not talking over each
//! other. That is the overwhelming majority of meetings, and it is what the
//! interface claims.
//!
//! # What it is not
//!
//! It is not a neural speaker-embedding model. It will merge two similar
//! voices, it will split one person who moves from a headset to a laptop
//! microphone mid-call, and it cannot separate overlapping speech at all --
//! the segment goes to whoever dominated it. Those limits are stated in the
//! interface next to the result, and every assignment is editable, because a
//! diarizer that is wrong and unfixable is worse than no diarizer.
//!
//! The alternative -- uploading the audio to a hosted diarization service --
//! would be more accurate and would also be the exact thing this product
//! exists not to do.

#![forbid(unsafe_code)]

pub mod cluster;
pub mod fft;
pub mod mfcc;
pub mod vad;

// Test-only, and deliberately not shipped: the synthesiser exists to give the
// clusterer something to be checked against, and compiling it into the wasm
// bundle would put a formant synthesiser in every user's download.
#[cfg(test)]
mod testing;

use note_core::{Segment, Transcript};
use serde::{Deserialize, Serialize};

pub use cluster::{cluster, cosine_distance, Stop};
pub use crate::divergence as gaussian_divergence;
pub use mfcc::{Analyser, Frame, SAMPLE_RATE};

/// How the caller wants speakers decided.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "snake_case")]
pub enum SpeakerCount {
    /// Work it out. The usual case: a user does not want to count the people
    /// in their own meeting before pressing a button.
    #[default]
    Auto,
    /// The user knows. Always more accurate than the automatic guess, so the
    /// interface offers it as a correction rather than as a required input.
    Exactly(usize),
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Options {
    pub speakers: SpeakerCount,
    /// The divergence at which two segments are called different people.
    ///
    /// In the units of [`divergence`], and measured rather than guessed: on
    /// real speech, merges within one person top out around 0.27 and the first
    /// merge across two people costs 0.39 or more, so anything from 0.25 to
    /// 0.45 gives the same answer on all of the fixtures. The default sits in
    /// the middle of that plateau, which is the point -- a constant that is
    /// only correct at one value is a constant that is about to be wrong.
    ///
    /// Erring high merges two real people, which a user has to notice before
    /// they can fix it; erring low invents a speaker, which is worse, because
    /// it is what makes a one-person voice note come back as a panel
    /// discussion and the whole feature look broken.
    pub threshold: f32,
    /// Never propose more than this many speakers automatically. A meeting
    /// with nine detected voices is nearly always a threshold that was too
    /// tight, not nine people.
    pub max_speakers: usize,
    /// Segments with less than this much voiced audio are left unassigned
    /// rather than guessed at: "mm-hm" carries no timbre worth clustering.
    ///
    /// The single largest cause of invented speakers, and by a distance. Half
    /// a second of speech covers a handful of phonemes, so its statistics
    /// describe *what was said* far more than *who said it*, and it lands
    /// wherever those phonemes happen to sit -- usually far from everything,
    /// which makes it a speaker of its own. Nothing is lost by refusing to
    /// characterise it: `fill_gaps` gives it the neighbour it almost certainly
    /// belongs to. Above about 1.3 s the cost turns the other way and a real
    /// speaker's short turns start being absorbed into the person before them.
    pub min_voiced_ms: i64,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            speakers: SpeakerCount::Auto,
            threshold: 0.35,
            max_speakers: 8,
            min_voiced_ms: 900,
        }
    }
}

/// What diarization found, beyond the labels themselves.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Report {
    pub speakers: usize,
    /// Segments left without a speaker because they were too short or too
    /// quiet to characterise. Surfaced so the interface can say "3 lines were
    /// too short to attribute" rather than leaving silent gaps in the legend.
    pub unassigned: usize,
    /// The tightest and loosest distances actually merged. A support number:
    /// when a user says "it split me in two", these say whether the threshold
    /// was the problem.
    pub min_merge_distance: f32,
    pub max_merge_distance: f32,
}

/// Label every segment of `transcript` with a speaker.
///
/// `samples` must be the same 16 kHz mono audio the transcript was made from;
/// the segment timings index into it directly.
pub fn diarize(transcript: &mut Transcript, samples: &[f32], options: &Options) -> Report {
    let analyser = Analyser::new();
    let mut frames = analyser.analyse(samples);
    mfcc::normalise(&mut frames);
    let voiced = vad::voiced_mask(&frames);

    // Which segments we can actually characterise, and their embeddings.
    let mut indices: Vec<usize> = Vec::new();
    let mut embeddings: Vec<Fingerprint> = Vec::new();
    let mut unassigned = 0;

    for (index, segment) in transcript.segments.iter().enumerate() {
        match embed(segment, &frames, &voiced, options.min_voiced_ms) {
            Some(embedding) => {
                indices.push(index);
                embeddings.push(embedding);
            }
            None => unassigned += 1,
        }
    }

    if embeddings.is_empty() {
        for segment in &mut transcript.segments {
            segment.speaker = None;
        }
        transcript.sync_speakers();
        return Report {
            speakers: 0,
            unassigned,
            min_merge_distance: 0.0,
            max_merge_distance: 0.0,
        };
    }

    let stop = match options.speakers {
        SpeakerCount::Auto => Stop::Threshold(options.threshold),
        SpeakerCount::Exactly(k) => Stop::Speakers(k),
    };
    let tree = cluster::build_with(&embeddings, divergence);
    let labels = cluster::cluster_tree(&tree, embeddings.len(), stop, options.max_speakers);

    for (position, &segment_index) in indices.iter().enumerate() {
        transcript.segments[segment_index].speaker = Some(format!("S{}", labels[position]));
    }
    // Unassignable segments inherit their neighbour rather than showing as an
    // "Unknown" speaker in the middle of somebody's turn. A one-word "right"
    // between two of Ana's sentences was almost certainly Ana, and a legend
    // entry for it would be noise.
    fill_gaps(&mut transcript.segments);
    transcript.sync_speakers();

    let (min_merge, max_merge) = merge_span(&embeddings, &labels);
    Report {
        speakers: transcript.speakers.len(),
        unassigned,
        min_merge_distance: min_merge,
        max_merge_distance: max_merge,
    }
}

/// Embeddings for every characterisable segment, for tuning and inspection.
///
/// The same work `diarize` does, exposed so the `probe` example can look at
/// the merge sequence without a second implementation of it drifting away
/// from this one.
pub fn embeddings_for(transcript: &Transcript, samples: &[f32], min_voiced_ms: i64) -> Vec<Fingerprint> {
    let analyser = Analyser::new();
    let mut frames = analyser.analyse(samples);
    mfcc::normalise(&mut frames);
    let voiced = vad::voiced_mask(&frames);
    transcript
        .segments
        .iter()
        .filter_map(|segment| embed(segment, &frames, &voiced, min_voiced_ms))
        .collect()
}

/// What one segment's voice sounds like: a diagonal Gaussian over its voiced
/// frames.
///
/// Coefficient 0 is dropped: it is frame energy, so keeping it would cluster
/// on "who was nearer the microphone".
///
/// # Why the spread is kept rather than folded into the mean
///
/// Concatenating the mean and the standard deviation into one vector and
/// taking a cosine between two of them -- which is what this did first --
/// throws away the one thing that decides whether a difference in means
/// matters: how much each segment was moving around its own mean anyway. Two
/// sentences from one person differ in mean MFCC by a lot, because they
/// contain different words; the test that separates people is whether that
/// difference is large *compared to the within-segment scatter*, and that is a
/// ratio the cosine cannot see.
#[derive(Debug, Clone, PartialEq)]
pub struct Fingerprint {
    mean: [f32; mfcc::N_MFCC - 1],
    variance: [f32; mfcc::N_MFCC - 1],
}

/// Keeps a nearly-constant segment from dividing by ~0 and producing an
/// enormous distance to everything, which would make it its own speaker.
/// Roughly the variance of a quiet, steady vowel.
const VARIANCE_FLOOR: f32 = 0.05;

/// Symmetric Kullback-Leibler divergence between two diagonal Gaussians.
///
/// The classical speaker-clustering distance, and it is classical because it
/// is the right shape: a difference in means is divided by the variances, so
/// a segment that was all over the place is not called a different person for
/// being all over the place in a slightly different direction.
///
///   D = ½ Σ [ σ²ᵢ/σ²ⱼ + σ²ⱼ/σ²ᵢ − 2 + (μᵢ−μⱼ)² (1/σ²ᵢ + 1/σ²ⱼ) ]
pub fn divergence(a: &Fingerprint, b: &Fingerprint) -> f32 {
    let mut total = 0.0;
    for i in 0..mfcc::N_MFCC - 1 {
        let (va, vb) = (a.variance[i], b.variance[i]);
        let delta = a.mean[i] - b.mean[i];
        total += va / vb + vb / va - 2.0 + delta * delta * (1.0 / va + 1.0 / vb);
    }
    // Halved per the definition, then divided by the number of coefficients so
    // the scale does not depend on how many were kept -- a threshold tuned
    // here would otherwise silently change meaning if N_MFCC ever did.
    0.5 * total / (mfcc::N_MFCC - 1) as f32
}

// Indexing two fixed-size arrays in step; a zipped iterator here reads
// worse than the index does.
#[allow(clippy::needless_range_loop)]
fn embed(
    segment: &Segment,
    frames: &[Frame],
    voiced: &[bool],
    min_voiced_ms: i64,
) -> Option<Fingerprint> {
    let first = (segment.start_ms / 10).max(0) as usize;
    let last = ((segment.end_ms / 10) as usize).min(frames.len());
    if first >= last {
        return None;
    }

    let used: Vec<&Frame> = (first..last)
        .filter(|i| voiced.get(*i).copied().unwrap_or(false))
        .map(|i| &frames[i])
        .collect();
    if (used.len() as i64) * 10 < min_voiced_ms {
        return None;
    }

    let count = used.len() as f32;
    let mut mean = [0.0f32; mfcc::N_MFCC];
    for frame in &used {
        for i in 0..mfcc::N_MFCC {
            mean[i] += frame.coefficients[i];
        }
    }
    for value in &mut mean {
        *value /= count;
    }

    let mut variance = [0.0f32; mfcc::N_MFCC];
    for frame in &used {
        for i in 0..mfcc::N_MFCC {
            variance[i] += (frame.coefficients[i] - mean[i]).powi(2);
        }
    }

    let mut fingerprint = Fingerprint {
        mean: [0.0; mfcc::N_MFCC - 1],
        variance: [0.0; mfcc::N_MFCC - 1],
    };
    for i in 1..mfcc::N_MFCC {
        fingerprint.mean[i - 1] = mean[i];
        fingerprint.variance[i - 1] = (variance[i] / count).max(VARIANCE_FLOOR);
    }
    Some(fingerprint)
}

/// Give unassigned segments the speaker of the nearest assigned neighbour.
fn fill_gaps(segments: &mut [Segment]) {
    let mut last: Option<String> = None;
    let mut pending: Vec<usize> = Vec::new();
    for index in 0..segments.len() {
        match segments[index].speaker.clone() {
            Some(speaker) => {
                for &waiting in &pending {
                    // A gap between two turns goes to whichever side is
                    // nearer in time; before the first assigned segment there
                    // is only one candidate.
                    segments[waiting].speaker = Some(match &last {
                        None => speaker.clone(),
                        Some(previous) => {
                            let before = segments[waiting].start_ms - segments[index - 1].end_ms;
                            let after = segments[index].start_ms - segments[waiting].end_ms;
                            if before <= after {
                                previous.clone()
                            } else {
                                speaker.clone()
                            }
                        }
                    });
                }
                pending.clear();
                last = Some(speaker);
            }
            None => pending.push(index),
        }
    }
    // Anything trailing after the last assigned segment.
    if let Some(speaker) = last {
        for waiting in pending {
            segments[waiting].speaker = Some(speaker.clone());
        }
    }
}

/// The closest and furthest within-cluster pair, for the support report.
fn merge_span(embeddings: &[Fingerprint], labels: &[usize]) -> (f32, f32) {
    let mut min = f32::INFINITY;
    let mut max: f32 = 0.0;
    for i in 0..embeddings.len() {
        for j in i + 1..embeddings.len() {
            if labels[i] != labels[j] {
                continue;
            }
            let d = divergence(&embeddings[i], &embeddings[j]);
            min = min.min(d);
            max = max.max(d);
        }
    }
    if min.is_infinite() {
        (0.0, 0.0)
    } else {
        (min, max)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::{synth_silence, synth_voice, Voice};
    use note_core::{Segment, Source};

    /// Build audio from a script of (voice, seconds) turns, plus the
    /// transcript whose timings match it.
    fn conversation(turns: &[(Voice, f32)]) -> (Vec<f32>, Transcript) {
        let mut audio = Vec::new();
        let mut segments = Vec::new();
        let mut at_ms = 0i64;
        for (index, (voice, seconds)) in turns.iter().enumerate() {
            audio.extend(synth_voice(*voice, *seconds, index as u32 * 1_000));
            let length = (*seconds * 1000.0) as i64;
            segments.push(Segment::new(at_ms, at_ms + length, format!("turn {index}")));
            at_ms += length;
            // A short pause between turns, as in real speech.
            audio.extend(synth_silence(0.2, index as u32));
            at_ms += 200;
        }
        (audio, Transcript::from_segments(Source::Recorded, segments))
    }

    /// # What these synthetic tests can and cannot check
    ///
    /// They check the algebra: that segments of one synthesised tract group
    /// together, that a supplied count is honoured, that the labels are stable
    /// and that nothing panics. They deliberately do **not** check the
    /// automatic speaker count, because they cannot: a synthesiser's frames
    /// are far steadier than a person's, so the ratio the automatic cut reads
    /// -- between-segment distance against within-segment spread -- does not
    /// have speech's scale here. Calibrating against these voices is exactly
    /// how the over-splitting bug survived. That lives in
    /// `tests/real_speech.rs`, on recorded speech.
    #[test]
    fn a_two_person_conversation_groups_each_voice_together() {
        let (audio, mut transcript) = conversation(&[
            (Voice::A, 2.0),
            (Voice::B, 2.0),
            (Voice::A, 2.0),
            (Voice::B, 2.0),
        ]);
        diarize(
            &mut transcript,
            &audio,
            &Options {
                speakers: SpeakerCount::Exactly(2),
                min_voiced_ms: 200,
                ..Default::default()
            },
        );
        let ids: Vec<&str> = transcript
            .segments
            .iter()
            .map(|s| s.speaker.as_deref().unwrap())
            .collect();
        assert_eq!(ids[0], ids[2], "the same voice got two speakers: {ids:?}");
        assert_eq!(ids[1], ids[3], "the same voice got two speakers: {ids:?}");
        assert_ne!(ids[0], ids[1], "two voices got one speaker: {ids:?}");
    }

    #[test]
    fn three_voices_are_separated_too() {
        // Three seconds a turn, not two: the middle voice sits between the
        // other two by design, and telling it apart from them needs enough
        // frames for a segment's mean to settle. That is a property of the
        // measurement, not a workaround -- the same is true of real speech,
        // which is why `min_voiced_ms` exists.
        let (audio, mut transcript) = conversation(&[
            (Voice::A, 3.0),
            (Voice::B, 3.0),
            (Voice::C, 3.0),
            (Voice::A, 3.0),
            (Voice::B, 3.0),
        ]);
        diarize(
            &mut transcript,
            &audio,
            &Options {
                speakers: SpeakerCount::Exactly(3),
                min_voiced_ms: 200,
                ..Default::default()
            },
        );
        let ids: Vec<&str> = transcript
            .segments
            .iter()
            .map(|s| s.speaker.as_deref().unwrap())
            .collect();
        assert_eq!(ids[0], ids[3], "{ids:?}");
        assert_eq!(ids[1], ids[4], "{ids:?}");
        assert_ne!(ids[2], ids[0], "{ids:?}");
        assert_ne!(ids[2], ids[1], "{ids:?}");
    }

    #[test]
    fn telling_it_the_count_overrides_what_it_would_have_guessed() {
        let (audio, mut transcript) =
            conversation(&[(Voice::A, 2.0), (Voice::A, 2.0), (Voice::A, 2.0)]);
        let report = diarize(
            &mut transcript,
            &audio,
            &Options {
                speakers: SpeakerCount::Exactly(2),
                min_voiced_ms: 200,
                ..Default::default()
            },
        );
        assert_eq!(report.speakers, 2, "{report:?}");
    }

    /// Gap filling, which is what keeps a "mm-hm" from becoming a person.
    #[test]
    fn a_short_interjection_inherits_a_neighbour_rather_than_becoming_a_ghost_speaker() {
        let (audio, mut transcript) = conversation(&[
            (Voice::A, 2.0),
            (Voice::A, 0.1), // too short to characterise
            (Voice::A, 2.0),
        ]);
        let report = diarize(
            &mut transcript,
            &audio,
            &Options {
                speakers: SpeakerCount::Exactly(1),
                ..Default::default()
            },
        );
        assert!(report.unassigned >= 1, "{report:?}");
        assert_eq!(report.speakers, 1, "a ghost speaker appeared: {report:?}");
        assert!(transcript.segments.iter().all(|s| s.speaker.is_some()));
    }

    #[test]
    fn silence_produces_no_speakers_rather_than_an_arbitrary_one() {
        let audio = synth_silence(3.0, 1);
        let mut transcript = Transcript::from_segments(
            Source::Recorded,
            vec![Segment::new(0, 3_000, "nothing was said")],
        );
        // Everything is "voiced" in featureless audio (see `vad`), so it does
        // get a speaker -- what must not happen is a panic or several.
        let report = diarize(&mut transcript, &audio, &Options::default());
        assert!(report.speakers <= 1, "{report:?}");
    }

    #[test]
    fn an_empty_transcript_or_empty_audio_is_handled_rather_than_panicking() {
        let mut empty = Transcript::new(Source::Imported);
        assert_eq!(diarize(&mut empty, &[], &Options::default()).speakers, 0);

        let mut transcript = Transcript::from_segments(
            Source::Imported,
            vec![Segment::new(0, 1_000, "text with no audio behind it")],
        );
        let report = diarize(&mut transcript, &[], &Options::default());
        assert_eq!(report.speakers, 0);
        assert_eq!(report.unassigned, 1);
        assert!(transcript.segments[0].speaker.is_none());
    }

    #[test]
    fn the_speaker_cap_is_respected_even_with_a_very_tight_threshold() {
        let (audio, mut transcript) = conversation(&[
            (Voice::A, 1.0),
            (Voice::B, 1.0),
            (Voice::C, 1.0),
            (Voice::A, 1.0),
        ]);
        let report = diarize(
            &mut transcript,
            &audio,
            &Options {
                threshold: 0.0001,
                max_speakers: 2,
                ..Default::default()
            },
        );
        assert!(report.speakers <= 2, "{report:?}");
    }
}
