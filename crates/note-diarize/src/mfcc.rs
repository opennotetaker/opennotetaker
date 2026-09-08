//! Mel-frequency cepstral coefficients: what a voice sounds like, as numbers.
//!
//! The standard chain -- pre-emphasis, frame, window, FFT, mel filterbank,
//! log, DCT -- because it is the one that has been checked by everybody for
//! forty years, and because every constant in it has a reason a reader can
//! look up rather than a reason that lives in this file's history.
//!
//! MFCCs describe the *shape of the vocal tract*, largely independently of
//! pitch, which is exactly the property that makes two recordings of the same
//! person cluster together and two people not.

use crate::fft::fft_in_place;

/// Whisper's rate, and therefore ours: the diarizer reads the same decoded
/// PCM the transcriber does, so nothing is decoded or resampled twice.
pub const SAMPLE_RATE: usize = 16_000;

/// 25 ms analysis window, 10 ms hop -- the values essentially all speech
/// front ends use. A window shorter than a pitch period cannot see the
/// spectrum; much longer and it smears across a phoneme boundary.
pub const FRAME_LEN: usize = SAMPLE_RATE * 25 / 1000; // 400
pub const HOP_LEN: usize = SAMPLE_RATE * 10 / 1000; // 160

/// The next power of two above `FRAME_LEN`, since the transform is radix-2.
const FFT_LEN: usize = 512;
const SPECTRUM_LEN: usize = FFT_LEN / 2 + 1;

/// Filters spanning the band a telephone or a laptop microphone actually
/// carries. Below 20 Hz is rumble; above 8 kHz does not exist at this rate.
const MEL_FILTERS: usize = 26;
const MEL_LOW_HZ: f32 = 20.0;
const MEL_HIGH_HZ: f32 = 7_800.0;

/// Coefficients kept per frame. 13 is conventional: beyond it the cepstrum
/// describes the excitation rather than the vocal tract, which is the half we
/// want to be *invariant* to.
pub const N_MFCC: usize = 13;

/// Compensates the roughly -6 dB/octave tilt of voiced speech, so the higher
/// formants are not swamped by the fundamental.
const PRE_EMPHASIS: f32 = 0.97;

/// One frame's worth of features, plus the energy that voice activity
/// detection thresholds on.
#[derive(Debug, Clone, PartialEq)]
pub struct Frame {
    pub coefficients: [f32; N_MFCC],
    /// Log energy of the frame, before any normalisation.
    pub log_energy: f32,
    pub start_ms: i64,
}

/// The analyser. Built once per recording; the window, the filterbank and the
/// DCT matrix are all fixed, and rebuilding them per frame was most of the
/// runtime before they moved here.
pub struct Analyser {
    window: Vec<f32>,
    filterbank: Vec<(usize, usize, Vec<f32>)>,
    dct: Vec<[f32; MEL_FILTERS]>,
}

impl Default for Analyser {
    fn default() -> Self {
        Self::new()
    }
}

impl Analyser {
    pub fn new() -> Self {
        Self {
            window: hamming(FRAME_LEN),
            filterbank: mel_filterbank(),
            dct: dct_matrix(),
        }
    }

    /// Features for every frame of `samples`, which must be 16 kHz mono.
    pub fn analyse(&self, samples: &[f32]) -> Vec<Frame> {
        if samples.len() < FRAME_LEN {
            return Vec::new();
        }
        let mut frames = Vec::with_capacity((samples.len() - FRAME_LEN) / HOP_LEN + 1);
        let mut re = [0.0f32; FFT_LEN];
        let mut im = [0.0f32; FFT_LEN];
        let mut power = [0.0f32; SPECTRUM_LEN];
        let mut mel = [0.0f32; MEL_FILTERS];

        let mut offset = 0;
        while offset + FRAME_LEN <= samples.len() {
            let frame = &samples[offset..offset + FRAME_LEN];

            // Pre-emphasis uses the sample *before* the frame where there is
            // one, so the filter is continuous across frame boundaries rather
            // than restarting at every hop.
            let previous = if offset == 0 {
                0.0
            } else {
                samples[offset - 1]
            };
            let mut energy = 0.0f32;
            for i in 0..FRAME_LEN {
                let previous_sample = if i == 0 { previous } else { frame[i - 1] };
                let emphasised = frame[i] - PRE_EMPHASIS * previous_sample;
                energy += frame[i] * frame[i];
                re[i] = emphasised * self.window[i];
                im[i] = 0.0;
            }
            re[FRAME_LEN..].fill(0.0);
            im[FRAME_LEN..].fill(0.0);

            fft_in_place(&mut re, &mut im);
            for k in 0..SPECTRUM_LEN {
                power[k] = re[k] * re[k] + im[k] * im[k];
            }

            for (index, (first, _last, weights)) in self.filterbank.iter().enumerate() {
                let sum: f32 = weights
                    .iter()
                    .enumerate()
                    .map(|(offset, weight)| weight * power[first + offset])
                    .sum();
                // The floor keeps the log finite for a filter that saw pure
                // silence, which happens constantly in a meeting recording.
                mel[index] = (sum + 1e-10).ln();
            }

            let mut coefficients = [0.0f32; N_MFCC];
            for (index, row) in self.dct.iter().enumerate().take(N_MFCC) {
                coefficients[index] = row.iter().zip(mel.iter()).map(|(a, b)| a * b).sum();
            }

            frames.push(Frame {
                coefficients,
                log_energy: (energy / FRAME_LEN as f32 + 1e-10).ln(),
                start_ms: (offset * 1000 / SAMPLE_RATE) as i64,
            });
            offset += HOP_LEN;
        }
        frames
    }
}

/// Subtract each coefficient's mean over the whole recording.
///
/// Cepstral mean normalisation. A convolutive channel effect -- this
/// microphone, this room, this codec -- is additive in the cepstral domain,
/// so removing the mean removes it. Without this the dominant axis of
/// variation between two segments is often *which part of the meeting they
/// came from*, and the clusterer happily separates the recording into "before
/// the window was closed" and "after".
// Indexing two fixed-size arrays in step; a zipped iterator here reads
// worse than the index does.
#[allow(clippy::needless_range_loop)]
pub fn normalise(frames: &mut [Frame]) {
    if frames.is_empty() {
        return;
    }
    let mut means = [0.0f32; N_MFCC];
    for frame in frames.iter() {
        for i in 0..N_MFCC {
            means[i] += frame.coefficients[i];
        }
    }
    let count = frames.len() as f32;
    for mean in &mut means {
        *mean /= count;
    }
    for frame in frames.iter_mut() {
        for i in 0..N_MFCC {
            frame.coefficients[i] -= means[i];
        }
    }
}

fn hamming(len: usize) -> Vec<f32> {
    (0..len)
        .map(|i| 0.54 - 0.46 * (2.0 * std::f32::consts::PI * i as f32 / (len as f32 - 1.0)).cos())
        .collect()
}

fn hz_to_mel(hz: f32) -> f32 {
    2595.0 * (1.0 + hz / 700.0).log10()
}

fn mel_to_hz(mel: f32) -> f32 {
    700.0 * (10f32.powf(mel / 2595.0) - 1.0)
}

/// Triangular filters, equally spaced on the mel scale.
///
/// Stored sparsely -- first bin, last bin, weights -- because each filter
/// touches a handful of the 257 spectrum bins and a dense matrix would be
/// almost entirely zeroes multiplied every frame.
fn mel_filterbank() -> Vec<(usize, usize, Vec<f32>)> {
    let low = hz_to_mel(MEL_LOW_HZ);
    let high = hz_to_mel(MEL_HIGH_HZ);
    let points: Vec<f32> = (0..MEL_FILTERS + 2)
        .map(|i| {
            let mel = low + (high - low) * i as f32 / (MEL_FILTERS + 1) as f32;
            mel_to_hz(mel) * FFT_LEN as f32 / SAMPLE_RATE as f32
        })
        .collect();

    let mut bank = Vec::with_capacity(MEL_FILTERS);
    for filter in 0..MEL_FILTERS {
        let (left, centre, right) = (points[filter], points[filter + 1], points[filter + 2]);
        let first = (left.floor().max(0.0) as usize).min(SPECTRUM_LEN - 1);
        let last = (right.ceil() as usize).min(SPECTRUM_LEN - 1);
        let mut weights = Vec::with_capacity(last - first + 1);
        for bin in first..=last {
            let bin = bin as f32;
            let weight = if bin < centre {
                (bin - left) / (centre - left).max(1e-6)
            } else {
                (right - bin) / (right - centre).max(1e-6)
            };
            weights.push(weight.clamp(0.0, 1.0));
        }
        bank.push((first, last, weights));
    }
    bank
}

/// DCT-II, orthonormal. Decorrelates the filterbank energies, which are
/// heavily correlated between neighbouring filters, so that a plain Euclidean
/// or cosine distance over the coefficients means something.
fn dct_matrix() -> Vec<[f32; MEL_FILTERS]> {
    let scale = (2.0 / MEL_FILTERS as f32).sqrt();
    (0..N_MFCC)
        .map(|k| {
            let mut row = [0.0f32; MEL_FILTERS];
            for (n, value) in row.iter_mut().enumerate() {
                *value = scale
                    * (std::f32::consts::PI * k as f32 * (n as f32 + 0.5) / MEL_FILTERS as f32)
                        .cos();
            }
            if k == 0 {
                for value in row.iter_mut() {
                    *value *= 1.0 / 2f32.sqrt();
                }
            }
            row
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::{synth_voice, Voice};

    #[test]
    fn framing_covers_the_signal_at_the_expected_rate() {
        let samples = vec![0.0f32; SAMPLE_RATE]; // one second
        let frames = Analyser::new().analyse(&samples);
        // (16000 - 400) / 160 + 1
        assert_eq!(frames.len(), 98);
        assert_eq!(frames[0].start_ms, 0);
        assert_eq!(frames[1].start_ms, 10);
    }

    #[test]
    fn audio_shorter_than_one_window_yields_nothing_rather_than_panicking() {
        assert!(Analyser::new().analyse(&[0.0; 100]).is_empty());
        assert!(Analyser::new().analyse(&[]).is_empty());
    }

    #[test]
    fn speech_has_visibly_more_energy_than_silence() {
        let analyser = Analyser::new();
        let quiet = analyser.analyse(&vec![0.0f32; SAMPLE_RATE]);
        let loud = analyser.analyse(&synth_voice(Voice::A, 1.0, 0));
        let quiet_energy = quiet[10].log_energy;
        let loud_energy = loud[10].log_energy;
        assert!(
            loud_energy > quiet_energy + 5.0,
            "silence {quiet_energy}, speech {loud_energy}"
        );
    }

    /// The property the whole diarizer rests on: two different vocal tracts
    /// produce cepstra that are further apart than two samples of one.
    #[test]
    fn two_voices_are_further_apart_in_cepstral_space_than_one_voice_is_from_itself() {
        let analyser = Analyser::new();
        #[allow(clippy::needless_range_loop)]
        let mean = |samples: &[f32]| {
            let frames = analyser.analyse(samples);
            let mut sum = [0.0f32; N_MFCC];
            for frame in &frames {
                for i in 0..N_MFCC {
                    sum[i] += frame.coefficients[i];
                }
            }
            sum.map(|v| v / frames.len() as f32)
        };
        let distance = |a: [f32; N_MFCC], b: [f32; N_MFCC]| -> f32 {
            // Coefficient 0 is overall loudness, not timbre; including it
            // would make "spoke louder" look like "different person".
            (1..N_MFCC)
                .map(|i| (a[i] - b[i]).powi(2))
                .sum::<f32>()
                .sqrt()
        };

        let a1 = mean(&synth_voice(Voice::A, 1.0, 0));
        let a2 = mean(&synth_voice(Voice::A, 1.0, 7_000));
        let b1 = mean(&synth_voice(Voice::B, 1.0, 0));

        let within = distance(a1, a2);
        let between = distance(a1, b1);
        assert!(
            between > within * 2.0,
            "within-speaker {within}, between-speaker {between}"
        );
    }

    #[test]
    fn normalisation_removes_a_constant_channel_offset() {
        let analyser = Analyser::new();
        let mut plain = analyser.analyse(&synth_voice(Voice::A, 1.0, 0));
        // A convolutive channel effect is additive here, so simulate one.
        let mut coloured = plain.clone();
        for frame in &mut coloured {
            for i in 0..N_MFCC {
                frame.coefficients[i] += 3.5;
            }
        }
        normalise(&mut plain);
        normalise(&mut coloured);
        for (a, b) in plain.iter().zip(coloured.iter()) {
            for i in 0..N_MFCC {
                assert!(
                    (a.coefficients[i] - b.coefficients[i]).abs() < 1e-3,
                    "coefficient {i} differed after normalisation"
                );
            }
        }
    }
}
