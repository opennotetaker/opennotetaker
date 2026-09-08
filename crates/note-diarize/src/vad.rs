//! Which frames have a voice in them.
//!
//! Energy thresholding, with the threshold derived from the recording rather
//! than fixed. A fixed threshold is wrong for every recording that is not the
//! one it was tuned on: a laptop microphone across a table and a headset an
//! inch from a mouth differ by tens of decibels, and either choice of constant
//! marks one of them as entirely silent.
//!
//! So the floor is a low percentile of this recording's own frame energies --
//! whatever the quiet parts of *this* audio sound like -- and speech is
//! whatever sits a margin above it.

use crate::mfcc::Frame;

/// The percentile taken as "this recording's noise floor". A meeting is mostly
/// not-talking, so the 10th percentile is comfortably inside the silence even
/// for a monologue.
const FLOOR_PERCENTILE: f32 = 0.10;

/// How far above the floor, in log-energy units (natural log of mean square),
/// a frame must sit to count as voiced. About 6.5 dB.
const MARGIN: f32 = 0.75;

/// Frames shorter than this on either side of a boundary are smoothed away:
/// a single voiced frame inside silence is a door closing, and a single silent
/// frame inside speech is a stop consonant.
const SMOOTH_FRAMES: usize = 5;

pub fn voiced_mask(frames: &[Frame]) -> Vec<bool> {
    if frames.is_empty() {
        return Vec::new();
    }
    let mut energies: Vec<f32> = frames.iter().map(|f| f.log_energy).collect();
    energies.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let floor =
        energies[((energies.len() as f32 * FLOOR_PERCENTILE) as usize).min(energies.len() - 1)];
    let ceiling = energies[energies.len() - 1];

    // A recording with no dynamic range at all is either pure silence or a
    // constant tone. Calling all of it speech is the safer failure: the
    // clusterer can cope with a bad frame, but a transcript line with no
    // voiced frames gets no speaker at all.
    if ceiling - floor < MARGIN {
        return vec![true; frames.len()];
    }

    let threshold = floor + MARGIN;
    let raw: Vec<bool> = frames.iter().map(|f| f.log_energy > threshold).collect();
    smooth(raw)
}

/// Remove runs shorter than [`SMOOTH_FRAMES`], in both directions.
fn smooth(mut mask: Vec<bool>) -> Vec<bool> {
    for value in [true, false] {
        let mut start = 0;
        while start < mask.len() {
            if mask[start] != value {
                start += 1;
                continue;
            }
            let mut end = start;
            while end < mask.len() && mask[end] == value {
                end += 1;
            }
            // A run touching either edge is not evidence of anything -- the
            // recording may simply have started mid-word.
            if end - start < SMOOTH_FRAMES && start > 0 && end < mask.len() {
                for slot in &mut mask[start..end] {
                    *slot = !value;
                }
            }
            start = end;
        }
    }
    mask
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mfcc::Analyser;
    use crate::testing::{synth_silence, synth_voice, Voice};

    fn mask_for(samples: &[f32]) -> Vec<bool> {
        voiced_mask(&Analyser::new().analyse(samples))
    }

    #[test]
    fn speech_between_two_silences_is_found_where_it_actually_is() {
        let mut audio = synth_silence(1.0, 1);
        audio.extend(synth_voice(Voice::A, 1.0, 0));
        audio.extend(synth_silence(1.0, 2));
        let mask = mask_for(&audio);

        let voiced: Vec<usize> = mask
            .iter()
            .enumerate()
            .filter(|(_, v)| **v)
            .map(|(i, _)| i)
            .collect();
        assert!(!voiced.is_empty(), "found no speech at all");
        // Frames are 10 ms apart, so the second of speech is frames ~100-200.
        assert!(
            voiced[0] > 85 && voiced[0] < 115,
            "speech started at frame {}",
            voiced[0]
        );
        let last = *voiced.last().unwrap();
        assert!(last > 185 && last < 215, "speech ended at frame {last}");
    }

    /// The failure a fixed threshold produces: a quiet recording read as
    /// entirely silent, so nothing gets a speaker.
    #[test]
    fn a_quiet_recording_is_not_read_as_pure_silence() {
        let mut audio = synth_silence(0.5, 3);
        audio.extend(synth_voice(Voice::A, 1.0, 0).iter().map(|s| s * 0.02));
        audio.extend(synth_silence(0.5, 4));
        let mask = mask_for(&audio);
        let voiced = mask.iter().filter(|v| **v).count();
        assert!(
            voiced > 50,
            "only {voiced} voiced frames in a quiet recording"
        );
    }

    #[test]
    fn pure_silence_is_treated_as_speech_rather_than_leaving_nothing_to_cluster() {
        // No dynamic range: everything is called voiced. See `voiced_mask`.
        let mask = mask_for(&synth_silence(1.0, 5));
        assert!(mask.iter().all(|v| *v));
    }

    #[test]
    fn a_single_frame_glitch_does_not_become_a_speech_run() {
        let mut mask = vec![false; 40];
        mask[20] = true;
        assert!(!smooth(mask.clone())[20]);

        let mut speech = vec![true; 40];
        speech[20] = false;
        assert!(smooth(speech)[20]);
    }

    #[test]
    fn no_frames_produces_no_mask_rather_than_a_panic() {
        assert!(voiced_mask(&[]).is_empty());
    }
}
