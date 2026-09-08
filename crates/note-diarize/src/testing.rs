//! Synthetic voices, so the diarizer has something to be tested against.
//!
//! Recording two real people and committing the audio would make this crate's
//! tests depend on a fixture nobody can regenerate or inspect. A source-filter
//! synthesiser is the standard alternative: a glottal buzz at some pitch,
//! shaped by formant resonances that stand in for a vocal tract.
//!
//! # It has to articulate, or it tests nothing
//!
//! The first version of this held one vowel for the whole turn. That made
//! every frame of a segment identical, so a segment's variance was ~0 -- and a
//! diarizer can pass on audio like that while over-splitting badly on speech,
//! which is exactly what happened: the unit tests here were green while one
//! person talking for a minute came back as four speakers.
//!
//! So the tract moves between vowel targets at a syllable rate, and speaker
//! identity lives where it lives in a real person: in the *scale* of the
//! tract, since formant frequencies fall as the vocal tract gets longer. Two
//! voices saying different things are then genuinely harder to tell apart
//! than one voice saying the same thing twice, which is the discrimination
//! under test.

use std::f32::consts::PI;

use crate::mfcc::SAMPLE_RATE;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Voice {
    /// A low pitch with back-vowel formants.
    A,
    /// A high pitch with front-vowel formants -- as unlike A as two humans get.
    B,
    /// Between the two, for testing that the clusterer does not split a
    /// speaker who happens to sit in the middle.
    C,
}

impl Voice {
    fn f0(self) -> f32 {
        match self {
            Self::A => 110.0,
            Self::B => 210.0,
            Self::C => 155.0,
        }
    }

    /// How this speaker's vocal tract scales against the neutral one. A longer
    /// tract lowers every formant together, which is most of what makes two
    /// people sound different -- and, unlike a fixed vowel, it is a property
    /// that survives them saying different words.
    fn tract(self) -> f32 {
        match self {
            Self::A => 0.84,
            Self::B => 1.18,
            Self::C => 1.00,
        }
    }
}

/// Vowel targets for a neutral tract: (F1, F2, F3) in Hz.
const VOWELS: [[f32; 3]; 5] = [
    [270.0, 2_290.0, 3_010.0], // i
    [530.0, 1_840.0, 2_480.0], // e
    [730.0, 1_090.0, 2_440.0], // a
    [570.0, 840.0, 2_410.0],   // o
    [300.0, 870.0, 2_240.0],   // u
];

/// Vowels per second. Speech runs at roughly this rate, and it is what gives
/// a segment its within-segment spread.
const SYLLABLE_RATE: f32 = 4.0;

/// `seconds` of one voice, saying a `seed`-dependent sequence of vowels.
///
/// Two takes of the same speaker differ in *what* is said and agree in tract
/// scale, which is the relationship a diarizer has to exploit.
pub fn synth_voice(voice: Voice, seconds: f32, seed: u32) -> Vec<f32> {
    let count = (seconds * SAMPLE_RATE as f32) as usize;
    let tract = voice.tract();
    let jitter = 1.0 + ((seed % 17) as f32 - 8.0) * 0.004;
    let f0 = voice.f0() * jitter;

    let mut state = seed.wrapping_mul(2_654_435_761).wrapping_add(12_345);
    let mut next = move || {
        state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        (state >> 8) as f32 / 8_388_608.0 - 1.0
    };

    // The utterance, as a vowel index per syllable slot.
    let slots = (seconds * SYLLABLE_RATE).ceil() as usize + 2;
    let script: Vec<usize> = (0..slots)
        .map(|_| ((next() * 0.5 + 0.5) * VOWELS.len() as f32) as usize % VOWELS.len())
        .collect();

    // Aspiration, low enough to keep the harmonics dominant.
    let noise: Vec<f32> = (0..count).map(|_| next() * 0.02).collect();

    let mut phase = [0.0f32; 40];
    (0..count)
        .map(|i| {
            let t = i as f32 / SAMPLE_RATE as f32;

            // Where the tract is right now: cosine-interpolated between the
            // two vowels either side, so formants glide rather than jump.
            let position = t * SYLLABLE_RATE;
            let slot = position as usize;
            let blend = 0.5 - 0.5 * (PI * (position - slot as f32)).cos();
            let from = VOWELS[script[slot.min(script.len() - 1)]];
            let to = VOWELS[script[(slot + 1).min(script.len() - 1)]];
            let formants: [(f32, f32); 3] = [
                ((from[0] + (to[0] - from[0]) * blend) * tract, 90.0),
                ((from[1] + (to[1] - from[1]) * blend) * tract, 110.0),
                ((from[2] + (to[2] - from[2]) * blend) * tract, 140.0),
            ];

            let mut sample = 0.0;
            let mut total = 0.0;
            for (n, harmonic) in phase.iter_mut().enumerate() {
                let frequency = f0 * (n + 1) as f32;
                if frequency >= SAMPLE_RATE as f32 / 2.0 {
                    break;
                }
                let gain: f32 = formants
                    .iter()
                    .map(|(centre, bandwidth)| {
                        1.0 / (1.0 + ((frequency - centre) / bandwidth).powi(2))
                    })
                    .sum::<f32>()
                    / (n as f32 + 1.0).powf(1.2);
                *harmonic += 2.0 * PI * frequency / SAMPLE_RATE as f32;
                sample += gain * harmonic.sin();
                total += gain;
            }

            // A slow amplitude envelope, so voice activity detection sees
            // something with the dynamics of speech rather than a test tone.
            let envelope = 0.7 + 0.3 * (2.0 * PI * 3.0 * t).sin();
            (sample / total.max(1e-6) + noise[i]) * envelope * 0.6
        })
        .collect()
}

/// Digital silence with a little noise, for the gaps between turns.
pub fn synth_silence(seconds: f32, seed: u32) -> Vec<f32> {
    let count = (seconds * SAMPLE_RATE as f32) as usize;
    let mut state = seed.wrapping_mul(2_654_435_761).wrapping_add(1);
    (0..count)
        .map(|_| {
            state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
            ((state >> 8) as f32 / 8_388_608.0 - 1.0) * 0.0015
        })
        .collect()
}
